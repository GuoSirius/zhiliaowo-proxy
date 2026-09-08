import { ZhiliaowoClient } from '../../../datasources/zhiliaowo.js';
import type { ResolvedBrand } from '../../../config/brands.js';
import type { PaperItem } from '../../../models/types.js';
import {
  reportDb,
  getSyncState,
  localPaperCount,
  upsertPaperStmt,
  upsertAggStmt,
  upsertStateStmt,
} from '../../../datasources/report-db.js';
import {
  fetchPageWithRetry,
  resolvePagePlan,
  expectedPageSize,
  DEFAULT_PAGE_SIZE,
} from '../../../datasources/paper-fetch.js';
import { mapWithConcurrency } from '../../../shared/utils.js';
import { loadHotspots } from '../hotspots.js';
import { computeMonthAgg, toRecord } from './persist.js';
import { applyAiHotspotFallback } from './ai-fallback.js';
import { DEFAULT_CONCURRENCY } from './config.js';
import type { SyncProgress, SyncResult, PaperRecord } from './types.js';

export type { SyncProgress, SyncResult } from './types.js';
export { CONCURRENCY_INFO } from './config.js';

/**
 * 同步某品牌某年的全部文献到本地库：先取 totalCount，再分页并发拉取落库，最后重算月度聚合。
 * 非 force 且状态为 done 且总数与本地一致时直接跳过（幂等）。
 */
export async function syncYear(
  client: ZhiliaowoClient,
  brand: ResolvedBrand,
  year: number,
  opts: {
    force?: boolean;
    pageSize?: number;
    concurrency?: number;
    onProgress?: (p: SyncProgress) => void;
  } = {},
): Promise<SyncResult> {
  const pageSize = opts.pageSize ?? DEFAULT_PAGE_SIZE;
  const concurrency = opts.concurrency ?? DEFAULT_CONCURRENCY;
  const syncedAt = new Date().toISOString();
  const start = Date.now();

  const state = getSyncState(brand.brand, year);
  const localCount = localPaperCount(brand.brand, year);

  const first = await fetchPageWithRetry(client, brand, year, 1, pageSize);
  const totalCount = first.totalCount ?? 0;

  // 关键：总页数必须基于「上游实际生效的 pageSize」推导，不能用请求的 pageSize。
  // 上游对超限 pageSize 做静默钳制（上限 15），若用请求值 1000 计算会得到 9 页而实际需 597 页。
  const plan = resolvePagePlan(first, pageSize, totalCount);
  const { effectivePageSize, totalPages } = plan;
  if (effectivePageSize !== pageSize) {
    console.warn(
      `[sync] ${brand.brand} ${year} 上游将 pageSize 由 ${pageSize} 钳制为 ${effectivePageSize}` +
        `（共 ${totalCount} 篇 / ${totalPages} 页）`,
    );
  }

  if (
    !opts.force &&
    state?.status === 'done' &&
    state.total_count === totalCount &&
    localCount === totalCount
  ) {
    const durationMs = Date.now() - start;
    upsertStateStmt.run({
      brand: brand.brand,
      year,
      total_count: totalCount,
      last_synced_at: syncedAt,
      status: 'done',
      duration_ms: durationMs,
    });
    return {
      brand: brand.brand,
      year,
      skipped: true,
      totalCount,
      pages: totalPages,
      pagesFetched: 0,
      inserted: 0,
      durationMs,
      failedPages: 0,
      effectivePageSize,
      refilledPages: 0,
      shortPages: 0,
      shortfall: 0,
    };
  }

  upsertStateStmt.run({
    brand: brand.brand,
    year,
    total_count: totalCount,
    last_synced_at: syncedAt,
    status: 'syncing',
    duration_ms: null,
  });

  const fetchedRows: (PaperItem[] | undefined)[] = new Array(totalPages);
  // F10：第 1 页已在上面抓取（first），直接复用，避免重复请求上游
  fetchedRows[0] = first.data ?? [];
  let pagesFetched = 1;
  let failedPages = 0;
  const elapsedAt = () => Date.now() - start;

  const pageNums = Array.from({ length: Math.max(0, totalPages - 1) }, (_, i) => i + 2); // 2..totalPages
  await mapWithConcurrency(pageNums, concurrency, async (pn) => {
    const t0 = Date.now();
    try {
      const res = await fetchPageWithRetry(client, brand, year, pn, pageSize);
      fetchedRows[pn - 1] = res.data ?? [];
      pagesFetched++;
      const pageItems = fetchedRows[pn - 1]!.length;
      const pageMs = Date.now() - t0;
      const fetched = fetchedRows.reduce((a, r) => a + (r ? r.length : 0), 0);
      const elapsed = elapsedAt();
      const pct = totalCount ? Math.min(100, (fetched / totalCount) * 100) : 0;
      const eta = pct > 0 ? (elapsed / pct) * (100 - pct) : 0;
      opts.onProgress?.({
        page: pn,
        totalPages,
        pageItems,
        pageMs,
        fetched,
        total: totalCount,
        pct,
        elapsedMs: elapsed,
        etaMs: eta,
      });
    } catch (e) {
      failedPages++;
      opts.onProgress?.({
        page: pn,
        totalPages,
        pageItems: 0,
        pageMs: Date.now() - t0,
        fetched: 0,
        total: totalCount,
        pct: 0,
        elapsedMs: elapsedAt(),
        etaMs: 0,
      });
      console.warn(`[sync] ${brand.brand} ${year} 第 ${pn} 页拉取失败：${(e as Error).message}`);
    }
  });

  // 补拉：并发轮中请求失败或返回空页的页码，串行重试一轮（并发下上游偶发抖动会静默丢数）。
  // 只重试「空/失败」页；短页（0 < 条数 < 满页）通常是上游分页本身的结果，重试无收益，仅统计告警。
  let refilledPages = 0;
  let shortPages = 0;
  if (totalPages > 1) {
    const broken: number[] = [];
    for (let pn = 2; pn <= totalPages; pn++) {
      const rows = fetchedRows[pn - 1];
      if (!rows || rows.length === 0) {
        broken.push(pn);
        continue;
      }
      const want = expectedPageSize(pn, totalPages, totalCount, effectivePageSize);
      if (rows.length < want) shortPages++;
    }
    if (broken.length > 0) {
      console.warn(
        `[sync] ${brand.brand} ${year} 检测到 ${broken.length} 个空/失败页（共 ${totalPages} 页），串行补拉中…`,
      );
      for (const pn of broken) {
        try {
          const res = await fetchPageWithRetry(client, brand, year, pn, pageSize);
          const rows = res.data ?? [];
          if (rows.length > 0) {
            fetchedRows[pn - 1] = rows;
            refilledPages++;
          }
        } catch (e) {
          console.warn(`[sync] ${brand.brand} ${year} 第 ${pn} 页补拉失败：${(e as Error).message}`);
        }
      }
    }
  }

  const allItems: PaperItem[] = [];
  for (const r of fetchedRows) if (r) allItems.push(...r);

  // 完整性校验：与上游 totalCount 对账，缺口需显式告警而不是静默接受
  const shortfall = Math.max(0, totalCount - allItems.length);
  if (shortfall > 0) {
    console.warn(
      `[sync] ⚠️ ${brand.brand} ${year} 数据量缺口：上游 totalCount=${totalCount}，` +
        `实际拉取 ${allItems.length} 条（差 ${shortfall} 条，短页 ${shortPages} 个）`,
    );
  }

  // 上游分页在并发请求下可能返回重复 id（如排序不稳定导致页间重叠），
  // 先按 id 去重再转 record，避免 records.length 虚高、实际落库数偏少。
  const seenIds = new Set<string>();
  const uniqueItems = allItems.filter((p) => {
    const id = p.id != null ? String(p.id) : '';
    if (!id || seenIds.has(id)) return false;
    seenIds.add(id);
    return true;
  });
  const duplicateCount = allItems.length - uniqueItems.length;
  if (duplicateCount > 0) {
    console.warn(
      `[sync] ${brand.brand} ${year} 分页数据去重：原始 ${allItems.length} 条，去重后 ${uniqueItems.length} 条（重复 ${duplicateCount} 条）`,
    );
  }

  const records = uniqueItems
    .map((p) => toRecord(p, brand.brand, year, syncedAt))
    .filter((r): r is PaperRecord => r !== null);

  const insertTx = reportDb.transaction((recs: PaperRecord[]) => {
    for (const r of recs) upsertPaperStmt.run(r);
  });
  insertTx(records);

  const hotspots = loadHotspots(brand.key);
  const aggTx = reportDb.transaction(() => {
    // 含 month=0 哨兵桶：pubTime 异常无法解析月份的文献（仍计入年总量，避免静默丢数）
    for (let m = 0; m <= 12; m++) {
      const agg = computeMonthAgg(brand.brand, year, m, hotspots);
      upsertAggStmt.run({
        brand: brand.brand,
        year,
        month: m,
        paper_count: agg.paper_count,
        total_factor: agg.total_factor,
        factor_ge10: agg.factor_ge10,
        max_factor: agg.max_factor,
        journal_counts: JSON.stringify(agg.journal_counts),
        hotspot_counts: JSON.stringify(agg.hotspot_counts),
        hotspot_max_if: JSON.stringify(agg.hotspot_max_if),
        computed_at: syncedAt,
        synced_total: String(totalCount),
      });
    }
  });
  aggTx();

  // AI 兜底（默认关）：对本地零命中文献限量送 AI 打标并合并计数。失败仅告警，不影响主流程。
  try {
    await applyAiHotspotFallback(brand, year);
  } catch (e) {
    console.warn(`[sync] AI 兜底异常，已忽略: ${(e as Error).message}`);
  }

  const durationMs = Date.now() - start;
  upsertStateStmt.run({
    brand: brand.brand,
    year,
    total_count: totalCount,
    last_synced_at: syncedAt,
    status: 'done',
    duration_ms: durationMs,
  });

  return {
    brand: brand.brand,
    year,
    skipped: false,
    totalCount,
    pages: totalPages,
    pagesFetched,
    inserted: records.length,
    durationMs,
    failedPages,
    effectivePageSize,
    refilledPages,
    shortPages,
    shortfall,
  };
}

/**
 * 仅从本地 zlw_papers 重算某品牌某年的月度聚合（不请求 API）。
 * 用于口径修正后补算（如 computeMonthAgg 的 SELECT 字段调整），或导入数据后回填聚合。
 * 返回重算覆盖的月份数与本地文献总数（用于校验）。
 */
export function recomputeYearAgg(
  brand: ResolvedBrand,
  year: number,
): { months: number; localPapers: number } {
  const hotspots = loadHotspots(brand.key);
  const syncedAt = new Date().toISOString();
  const state = getSyncState(brand.brand, year);
  const aggTx = reportDb.transaction(() => {
    // 含 month=0 哨兵桶：pubTime 异常无法解析月份的文献（仍计入年总量，避免静默丢数）
    for (let m = 0; m <= 12; m++) {
      const agg = computeMonthAgg(brand.brand, year, m, hotspots);
      upsertAggStmt.run({
        brand: brand.brand,
        year,
        month: m,
        paper_count: agg.paper_count,
        total_factor: agg.total_factor,
        factor_ge10: agg.factor_ge10,
        max_factor: agg.max_factor,
        journal_counts: JSON.stringify(agg.journal_counts),
        hotspot_counts: JSON.stringify(agg.hotspot_counts),
        hotspot_max_if: JSON.stringify(agg.hotspot_max_if),
        computed_at: syncedAt,
        synced_total: String(state?.total_count ?? 0),
      });
    }
  });
  aggTx();
  return { months: 13, localPapers: localPaperCount(brand.brand, year) };
}
