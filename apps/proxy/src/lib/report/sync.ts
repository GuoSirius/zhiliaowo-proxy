import { cpus } from 'node:os';
import { ZhiliaowoClient } from '../zhiliaowo.js';
import type { ResolvedBrand } from '../../config/brands.js';
import type { PaperItem, PaperList } from '../../types.js';
import { aiEnabled, callAi } from '../ai.js';
import {
  reportDb,
  getSyncState,
  localPaperCount,
} from './db.js';
import { loadHotspots, classifyHotspot, type HotspotEntry } from './hotspots.js';
import { round } from './calc.js';
import { loadPromptFile } from '../prompts.js';

/**
 * 请求时「期望」的每页条数。注意：上游存在硬上限并对超限做静默钳制 ——
 * 实测 2.6 接口 pageSize 上限为 15，传 16/20/100/1000 均被回退为 15，且回显
 * `pageSize=15`、`totalPage=ceil(totalCount/15)`。因此这里传大值只是「尽量多要」，
 * 实际生效值一律以上游回显的 `pageSize` 为准（见 resolvePagePlan），
 * 绝不能用请求的 pageSize 自行计算总页数，否则会严重少拉（曾导致只拉到 1.5% 的数据）。
 */
const DEFAULT_PAGE_SIZE = Number(process.env.REPORT_PAGE_SIZE ?? 1000);
/**
 * 上游 pageSize 硬上限（2026-09-02 实测 Procell/Elabscience 多年度一致为 15）。
 * 仅在响应未回显 pageSize 时作为兜底推断值使用。
 */
const UPSTREAM_MAX_PAGE_SIZE = 15;
const MAX_RETRY = 3;

/**
 * 并发数自动推导的边界。
 * 本同步是**网络 I/O 密集型**：单页耗时约 300~800ms 且几乎全花在等上游响应上，
 * JSON 解析与 SQLite 落库不足 1ms。这类任务 CPU 核心数并非真实瓶颈 ——
 * Node 事件循环在等待网络时是空闲的，一个线程即可同时挂载成百上千个在途请求。
 *
 * 真正的天花板是上游（第三方开放 API、单 appId）：并发过高会触发限流/超时，
 * 失败页暴增后重试反而更慢。因此这里用 CPU 核心数只当作「机器规格」的粗略代理
 * （防止小内存小核机器开太大），并对上限做硬钳制。
 *
 * 依据 Little's Law：并发 = 目标 QPS × 平均延迟。
 * 单页 ~0.4s 时，并发 12 ≈ 30 req/s，对单个 appId 已属激进。
 */
const AUTO_CONCURRENCY_PER_CORE = 2;
const AUTO_CONCURRENCY_MIN = 4;
const AUTO_CONCURRENCY_MAX = 12;

/**
 * 解析并发数：
 * - 未配置 / 0 / auto / 非法值 → 自动推导：核心数 × 2，钳制到 [4, 12]
 * - 正整数 → 直接使用
 */
function resolveConcurrency(raw: string | undefined): number {
  const n = Number(raw);
  if (raw == null || raw === '' || !Number.isFinite(n) || n <= 0) {
    const cores = cpus()?.length || 1;
    return Math.max(AUTO_CONCURRENCY_MIN, Math.min(AUTO_CONCURRENCY_MAX, cores * AUTO_CONCURRENCY_PER_CORE));
  }
  return Math.max(1, Math.floor(n));
}

const DEFAULT_CONCURRENCY = resolveConcurrency(process.env.REPORT_SYNC_CONCURRENCY);

/** 人类可读的并发配置来源（如「12（自动：16 核 × 2，钳制 [4, 12]）」），供 CLI 日志输出 */
export const CONCURRENCY_INFO = `${DEFAULT_CONCURRENCY}（${
  process.env.REPORT_SYNC_CONCURRENCY
    ? `配置值 ${process.env.REPORT_SYNC_CONCURRENCY}`
    : `自动：${cpus()?.length || 1} 核 × ${AUTO_CONCURRENCY_PER_CORE}，钳制 [${AUTO_CONCURRENCY_MIN}, ${AUTO_CONCURRENCY_MAX}]`
}）`;

export interface SyncProgress {
  page: number;
  totalPages: number;
  pageItems: number;
  pageMs: number;
  fetched: number;
  total: number;
  pct: number;
  elapsedMs: number;
  etaMs: number;
}

export interface SyncResult {
  brand: string;
  year: number;
  skipped: boolean;
  totalCount: number;
  pages: number;
  pagesFetched: number;
  inserted: number;
  durationMs: number;
  failedPages: number;
  /** 上游实际生效的每页条数（可能小于请求值，见 UPSTREAM_MAX_PAGE_SIZE 注释） */
  effectivePageSize: number;
  /** 并发轮后串行补拉成功的页数 */
  refilledPages: number;
  /** 条数少于满页的页数（上游分页自然结果，仅用于告警） */
  shortPages: number;
  /** 相对上游 totalCount 的缺口条数（0 表示完整） */
  shortfall: number;
}

interface PaperRecord {
  id: string;
  brand: string;
  year: number;
  month: number;
  pub_time: string;
  doi: string | null;
  title: string | null;
  journal: string | null;
  factor: number | null;
  authors: string | null;
  url: string | null;
  cn_fields: string | null;
  products: string | null;
  raw: string;
  synced_at: string;
}

interface AggData {
  paper_count: number;
  total_factor: number;
  factor_ge10: number;
  max_factor: number;
  journal_counts: Record<string, number>;
  hotspot_counts: Record<string, number>;
  hotspot_max_if: Record<string, number>;
}

const upsertPaperStmt = reportDb.prepare(`
  INSERT INTO zlw_papers
    (id, brand, year, month, pub_time, doi, title, journal, factor, authors, url, cn_fields, products, raw, synced_at)
  VALUES
    (@id, @brand, @year, @month, @pub_time, @doi, @title, @journal, @factor, @authors, @url, @cn_fields, @products, @raw, @synced_at)
  ON CONFLICT(id, brand) DO UPDATE SET
    year=excluded.year, month=excluded.month, pub_time=excluded.pub_time,
    doi=excluded.doi, title=excluded.title, journal=excluded.journal, factor=excluded.factor,
    authors=excluded.authors, url=excluded.url, cn_fields=excluded.cn_fields,
    products=excluded.products, raw=excluded.raw, synced_at=excluded.synced_at
`);

const upsertAggStmt = reportDb.prepare(`
  INSERT INTO zlw_papers_agg
    (brand, year, month, paper_count, total_factor, factor_ge10, max_factor, journal_counts, hotspot_counts, hotspot_max_if, computed_at, synced_total)
  VALUES
    (@brand, @year, @month, @paper_count, @total_factor, @factor_ge10, @max_factor, @journal_counts, @hotspot_counts, @hotspot_max_if, @computed_at, @synced_total)
  ON CONFLICT(brand, year, month) DO UPDATE SET
    paper_count=excluded.paper_count, total_factor=excluded.total_factor, factor_ge10=excluded.factor_ge10,
    max_factor=excluded.max_factor, journal_counts=excluded.journal_counts,
    hotspot_counts=excluded.hotspot_counts, hotspot_max_if=excluded.hotspot_max_if,
    computed_at=excluded.computed_at, synced_total=excluded.synced_total
`);

const upsertStateStmt = reportDb.prepare(`
  INSERT INTO zlw_sync_state (brand, year, total_count, last_synced_at, status, duration_ms)
  VALUES (@brand, @year, @total_count, @last_synced_at, @status, @duration_ms)
  ON CONFLICT(brand, year) DO UPDATE SET
    total_count=excluded.total_count, last_synced_at=excluded.last_synced_at,
    status=excluded.status, duration_ms=excluded.duration_ms
`);

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function toRecord(p: PaperItem, brand: string, year: number, syncedAt: string): PaperRecord | null {
  const id = p.id != null ? String(p.id) : '';
  if (!id) return null;
  const pubTime = typeof p.pubTime === 'string' ? p.pubTime : '';
  const month = pubTime.length >= 7 ? Number(pubTime.slice(5, 7)) || 0 : 0;
  const factor = typeof p.factor === 'number' ? p.factor : p.factor == null ? null : Number(p.factor);
  const productsRaw = Array.isArray(p.products)
    ? JSON.stringify(p.products)
    : typeof p.products === 'string'
      ? p.products
      : null;
  const cnFieldsRaw =
    typeof p.cnFields === 'string'
      ? p.cnFields
      : p.cnFields
        ? JSON.stringify(p.cnFields)
        : null;
  return {
    id,
    brand,
    year,
    month,
    pub_time: pubTime,
    doi: typeof p.doi === 'string' ? p.doi : null,
    title: typeof p.title === 'string' ? p.title : null,
    journal: typeof p.journal === 'string' ? p.journal : null,
    factor,
    authors: typeof p.authors === 'string' ? p.authors : null,
    url: typeof p.url === 'string' ? p.url : null,
    cn_fields: cnFieldsRaw,
    products: productsRaw,
    raw: JSON.stringify(p),
    synced_at: syncedAt,
  };
}

async function fetchPageWithRetry(
  client: ZhiliaowoClient,
  brand: ResolvedBrand,
  year: number,
  pageNum: number,
  pageSize: number,
): Promise<PaperList> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
    try {
      const res = await client.brandPapers(brand, {
        year: String(year),
        pageNum: String(pageNum),
        pageSize: String(pageSize),
      });
      return res;
    } catch (e) {
      lastErr = e;
      await sleep(400 * attempt);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

interface PagePlan {
  /** 上游实际生效的每页条数（回显优先，其次按首页实际条数推断） */
  effectivePageSize: number;
  /** 需要遍历的总页数（上游 totalPage 优先，其次按生效 pageSize 计算） */
  totalPages: number;
  /** 计划来源，便于日志排查 */
  source: 'upstream-echo' | 'inferred-length' | 'fallback-max';
}

/**
 * 由首页响应推导分页计划。
 * 上游 totalPage = ceil(totalCount / 生效 pageSize)，实测自洽可信（末页 7 条、越界页 0 条），
 * 因此优先直接采用，避免本地重算与上游口径不一致。
 */
function resolvePagePlan(first: PaperList, requestedPageSize: number, totalCount: number): PagePlan {
  const echoSize = Number(first.pageSize);
  const len = Array.isArray(first.data) ? first.data.length : 0;

  let effectivePageSize: number;
  let source: PagePlan['source'];
  if (Number.isFinite(echoSize) && echoSize > 0) {
    effectivePageSize = echoSize;
    source = 'upstream-echo';
  } else if (len > 0) {
    // 未回显时以首页实际条数推断，但不超过上游已知硬上限
    effectivePageSize = Math.min(len, UPSTREAM_MAX_PAGE_SIZE);
    source = 'inferred-length';
  } else {
    effectivePageSize = Math.min(requestedPageSize, UPSTREAM_MAX_PAGE_SIZE);
    source = 'fallback-max';
  }

  const echoPages = Number(first.totalPage);
  let totalPages: number;
  if (Number.isFinite(echoPages) && echoPages > 0) {
    totalPages = echoPages;
  } else if (totalCount > 0 && effectivePageSize > 0) {
    totalPages = Math.ceil(totalCount / effectivePageSize);
  } else {
    totalPages = 0; // 空年份（totalCount=0）：无需翻页
  }

  return { effectivePageSize, totalPages, source };
}

/** 第 pn 页应有的条数（末页取余数，其余为满页） */
function expectedPageSize(pn: number, totalPages: number, totalCount: number, pageSize: number): number {
  if (pn < totalPages) return pageSize;
  const rest = totalCount - (totalPages - 1) * pageSize;
  return Math.max(1, rest);
}

async function mapWithConcurrency<T, U>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<U>,
): Promise<U[]> {
  const results = new Array<U>(items.length);
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const cur = idx++;
      results[cur] = await fn(items[cur]);
    }
  }
  const n = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: n }, worker));
  return results;
}

function computeMonthAgg(
  brand: string,
  year: number,
  month: number,
  hotspots: HotspotEntry[],
): AggData {
  // month=0 是 pubTime 无法解析月份的兜底桶，与常规月桶一样带 month 条件。
  // 注意：绝不能用「不带 month 条件的全年全量」填充 month=0 —— 全年级联查询会
  // `month BETWEEN 1 AND 12 OR month = 0`（见 agg.ts），那样会把全年数据重复累加一遍。
  const rows = reportDb
    .prepare('SELECT title, factor, journal FROM zlw_papers WHERE brand=? AND year=? AND month=?')
    .all(brand, year, month) as Array<{
    title: string | null;
    factor: number | null;
    journal: string | null;
  }>;
  let count = 0;
  let total = 0;
  let ge10 = 0;
  let max = 0;
  const journals: Record<string, number> = {};
  const hs: Record<string, number> = {};
  const hsMaxIf: Record<string, number> = {};
  for (const r of rows) {
    count++;
    const f = r.factor == null ? 0 : Number(r.factor);
    total += f;
    if (f >= 10) ge10++;
    if (f > max) max = f;
    if (r.journal) journals[r.journal] = (journals[r.journal] ?? 0) + 1;
    const cn = classifyHotspot(r.title, hotspots);
    if (cn) {
      hs[cn] = (hs[cn] ?? 0) + 1;
      if (f > (hsMaxIf[cn] ?? 0)) hsMaxIf[cn] = f;
    }
  }
  return {
    paper_count: count,
    total_factor: round(total),
    factor_ge10: ge10,
    max_factor: round(max),
    journal_counts: journals,
    hotspot_counts: hs,
    hotspot_max_if: hsMaxIf,
  };
}

/**
 * 板块 4 AI 兜底（env AI_HOTSPOT_FALLBACK=1 且已配置 AI 时启用；默认关）。
 * 仅对「本地零命中」的文献限量（AI_HOTSPOT_FALLBACK_CAP，默认 200）送 AI 打标，
 * 结果合并进各月 hotspot_counts 复用。任何失败都只告警、绝不中断主同步流程。
 */
const AI_HOTSPOT_FALLBACK_CAP = Number(process.env.AI_HOTSPOT_FALLBACK_CAP ?? 200);

function aiHotspotFallbackEnabled(): boolean {
  return process.env.AI_HOTSPOT_FALLBACK === '1' && aiEnabled();
}

function defaultHotspotFallbackPrompt(cnList: string[]): string {
  return (
    `你是文献分类助手。给定一批英文文献标题，请判断每篇最契合哪个研究热点（从列表中选择一个），` +
    `若无匹配则输出"其他"。\n研究热点列表：${cnList.join('、')}`
  );
}

/** 从 AI 返回文本中提取首个 JSON 数组（容错：忽略解释性文字） */
function extractJsonArray(text: string): string[] {
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start < 0 || end < 0 || end <= start) return [];
  try {
    const arr = JSON.parse(text.slice(start, end + 1));
    return Array.isArray(arr) ? arr.map((x) => String(x).trim()) : [];
  } catch {
    return [];
  }
}

function mergeHotspotCount(brandName: string, year: number, month: number, cn: string): void {
  const row = reportDb
    .prepare('SELECT hotspot_counts FROM zlw_papers_agg WHERE brand=? AND year=? AND month=?')
    .get(brandName, year, month) as { hotspot_counts: string | null } | undefined;
  const obj: Record<string, number> = row?.hotspot_counts ? JSON.parse(row.hotspot_counts) : {};
  obj[cn] = (obj[cn] ?? 0) + 1;
  reportDb
    .prepare('UPDATE zlw_papers_agg SET hotspot_counts=? WHERE brand=? AND year=? AND month=?')
    .run(JSON.stringify(obj), brandName, year, month);
}

async function applyAiHotspotFallback(brand: ResolvedBrand, year: number): Promise<void> {
  if (!aiHotspotFallbackEnabled()) return;
  const hotspots = loadHotspots(brand.key);
  if (!hotspots.length) return;
  const cnList = hotspots.map((h) => h.cn);
  const systemPrompt =
    loadPromptFile(brand.key, 'hotspot-fallback') ?? defaultHotspotFallbackPrompt(cnList);

  let remaining = AI_HOTSPOT_FALLBACK_CAP;
  for (let m = 1; m <= 12 && remaining > 0; m++) {
    const rows = reportDb
      .prepare('SELECT title FROM zlw_papers WHERE brand=? AND year=? AND month=?')
      .all(brand.brand, year, m) as Array<{ title: string | null }>;
    const unclassified = rows
      .filter((r) => r.title && !classifyHotspot(r.title, hotspots))
      .slice(0, remaining);
    if (!unclassified.length) continue;

    for (let i = 0; i < unclassified.length && remaining > 0; i += 50) {
      const batch = unclassified.slice(i, i + 50);
      const titles = batch.map((t, idx) => `[${idx}] ${t.title}`).join('\n');
      const userPrompt =
        `${titles}\n\n请严格只输出一个 JSON 数组，元素为对应的热点中文名或"其他"，顺序与上面 [index] 一一对应。`;
      try {
        const text = await callAi(systemPrompt, userPrompt, { temperature: 0, maxTokens: 2000 });
        const arr = extractJsonArray(text);
        batch.forEach((_t, idx) => {
          const cn = arr[idx];
          if (cn && cn !== '其他' && cnList.includes(cn)) {
            mergeHotspotCount(brand.brand, year, m, cn);
            remaining--;
          }
        });
      } catch (e) {
        console.warn(
          `[sync] AI 兜底 ${brand.brand} ${year} ${m}月第${i}批失败，跳过: ${(e as Error).message}`,
        );
        break;
      }
    }
  }
}

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
