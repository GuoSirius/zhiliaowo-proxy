import type { PaperItem } from '../../../models/types.js';
import type { PaperRecord, AggData } from './types.js';
import { reportDb } from '../../../datasources/report-db.js';
import { classifyHotspot, type HotspotEntry } from '../hotspots.js';
import { round } from '../calc.js';

/** 上游文献条目 → zlw_papers 行。id 缺失时返回 null（无法落库，直接丢弃） */
export function toRecord(
  p: PaperItem,
  brand: string,
  year: number,
  syncedAt: string,
): PaperRecord | null {
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

/**
 * 计算某品牌某年某月的聚合数据（篇数 / 总 IF / IF≥10 / 最高 IF / 期刊分布 / 热点分布）。
 *
 * month=0 是 pubTime 无法解析月份的兜底桶，与常规月桶一样带 month 条件。
 * 注意：绝不能用「不带 month 条件的全年全量」填充 month=0 —— 全年级联查询会
 * `month BETWEEN 1 AND 12 OR month = 0`（见 agg.ts），那样会把全年数据重复累加一遍。
 */
export function computeMonthAgg(
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
