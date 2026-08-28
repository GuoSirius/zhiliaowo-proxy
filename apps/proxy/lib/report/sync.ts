import { ZhiliaowoClient } from '../zhiliaowo.js';
import type { ResolvedBrand } from '../../config/brands.js';
import type { PaperItem, PaperList } from '../../types.js';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { aiEnabled, callAi } from '../ai.js';
import {
  reportDb,
  getSyncState,
  localPaperCount,
} from './db.js';
import { loadHotspots, classifyHotspot, type HotspotEntry } from './hotspots.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DEFAULT_PAGE_SIZE = Number(process.env.REPORT_PAGE_SIZE ?? 1000);
const DEFAULT_CONCURRENCY = Number(process.env.REPORT_SYNC_CONCURRENCY ?? 3);
const MAX_RETRY = 3;

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
  avg_factor: number;
  journal_counts: Record<string, number>;
  hotspot_counts: Record<string, number>;
}

const upsertPaperStmt = reportDb.prepare(`
  INSERT INTO zlw_papers
    (id, brand, year, month, pub_time, doi, title, journal, factor, authors, url, cn_fields, products, raw, synced_at)
  VALUES
    (@id, @brand, @year, @month, @pub_time, @doi, @title, @journal, @factor, @authors, @url, @cn_fields, @products, @raw, @synced_at)
  ON CONFLICT(id) DO UPDATE SET
    brand=excluded.brand, year=excluded.year, month=excluded.month, pub_time=excluded.pub_time,
    doi=excluded.doi, title=excluded.title, journal=excluded.journal, factor=excluded.factor,
    authors=excluded.authors, url=excluded.url, cn_fields=excluded.cn_fields,
    products=excluded.products, raw=excluded.raw, synced_at=excluded.synced_at
`);

const upsertAggStmt = reportDb.prepare(`
  INSERT INTO zlw_papers_agg
    (brand, year, month, paper_count, total_factor, factor_ge10, max_factor, avg_factor, journal_counts, hotspot_counts, computed_at, source_version)
  VALUES
    (@brand, @year, @month, @paper_count, @total_factor, @factor_ge10, @max_factor, @avg_factor, @journal_counts, @hotspot_counts, @computed_at, @source_version)
  ON CONFLICT(brand, year, month) DO UPDATE SET
    paper_count=excluded.paper_count, total_factor=excluded.total_factor, factor_ge10=excluded.factor_ge10,
    max_factor=excluded.max_factor, avg_factor=excluded.avg_factor, journal_counts=excluded.journal_counts,
    hotspot_counts=excluded.hotspot_counts, computed_at=excluded.computed_at, source_version=excluded.source_version
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

function round(n: number, d = 3): number {
  const f = Math.pow(10, d);
  return Math.round(n * f) / f;
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
  for (const r of rows) {
    count++;
    const f = r.factor == null ? 0 : Number(r.factor);
    total += f;
    if (f >= 10) ge10++;
    if (f > max) max = f;
    if (r.journal) journals[r.journal] = (journals[r.journal] ?? 0) + 1;
    const cn = classifyHotspot(r.title, hotspots);
    if (cn) hs[cn] = (hs[cn] ?? 0) + 1;
  }
  const avg = count ? total / count : 0;
  return {
    paper_count: count,
    total_factor: round(total),
    factor_ge10: ge10,
    max_factor: round(max),
    avg_factor: round(avg),
    journal_counts: journals,
    hotspot_counts: hs,
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

function loadPromptFile(brandKey: string, name: string): string | null {
  const dir = process.env.AI_PROMPT_DIR
    ? resolve(process.cwd(), process.env.AI_PROMPT_DIR)
    : resolve(__dirname, '..', '..', 'config', 'prompts');
  const file = resolve(dir, `${brandKey}-${name}.md`);
  return existsSync(file) ? readFileSync(file, 'utf8') : null;
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
  const totalCount = first.totalCount;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

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

  const pageNums = Array.from({ length: totalPages }, (_, i) => i + 1);
  const fetchedRows: (PaperItem[] | undefined)[] = new Array(totalPages);
  let pagesFetched = 0;
  let failedPages = 0;
  const elapsedAt = () => Date.now() - start;

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

  const allItems: PaperItem[] = [];
  for (const r of fetchedRows) if (r) allItems.push(...r);
  const records = allItems
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
        avg_factor: agg.avg_factor,
        journal_counts: JSON.stringify(agg.journal_counts),
        hotspot_counts: JSON.stringify(agg.hotspot_counts),
        computed_at: syncedAt,
        source_version: String(totalCount),
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
        avg_factor: agg.avg_factor,
        journal_counts: JSON.stringify(agg.journal_counts),
        hotspot_counts: JSON.stringify(agg.hotspot_counts),
        computed_at: syncedAt,
        source_version: String(state?.total_count ?? 0),
      });
    }
  });
  aggTx();
  return { months: 12, localPapers: localPaperCount(brand.brand, year) };
}
