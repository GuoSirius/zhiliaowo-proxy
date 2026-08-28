import { reportDb } from './db.js';

/** 某品牌某年某月区间的聚合结果（多个月份相加） */
export interface RangeAgg {
  paper_count: number;
  total_factor: number;
  factor_ge10: number;
  max_factor: number;
  journal_counts: Record<string, number>;
  hotspot_counts: Record<string, number>;
  hotspot_max_if: Record<string, number>;
}

export function mergeCounts(target: Record<string, number>, src?: string | null): void {
  if (!src) return;
  let obj: Record<string, number>;
  try {
    obj = JSON.parse(src) as Record<string, number>;
  } catch {
    return;
  }
  for (const [k, v] of Object.entries(obj)) target[k] = (target[k] ?? 0) + v;
}

/** 热点最高 IF 跨月合并：取最大值（同一热点各月最高 IF 的交集） */
export function mergeMax(target: Record<string, number>, src?: string | null): void {
  if (!src) return;
  let obj: Record<string, number>;
  try {
    obj = JSON.parse(src) as Record<string, number>;
  } catch {
    return;
  }
  for (const [k, v] of Object.entries(obj)) target[k] = Math.max(target[k] ?? 0, v);
}

/** 汇总 brand+year 在 [startMonth, endMonth] 区间内的月度聚合 */
export function getRangeAgg(
  brand: string,
  year: number,
  startMonth: number,
  endMonth: number,
): RangeAgg {
  // 全年区间（默认）自动含入 month=0 哨兵桶：pubTime 异常文献也计入年总量，避免静默丢数；
  // 季度/自定义区间（非全年）不含，避免未知月份被重复计入各月视图。
  const includeUnknown = startMonth <= 1 && endMonth >= 12;
  const sql = includeUnknown
    ? `SELECT paper_count, total_factor, factor_ge10, max_factor, journal_counts, hotspot_counts, hotspot_max_if
       FROM zlw_papers_agg WHERE brand=? AND year=? AND (month BETWEEN ? AND ? OR month = 0)`
    : `SELECT paper_count, total_factor, factor_ge10, max_factor, journal_counts, hotspot_counts, hotspot_max_if
       FROM zlw_papers_agg WHERE brand=? AND year=? AND month BETWEEN ? AND ?`;
  const rows = reportDb.prepare(sql).all(brand, year, startMonth, endMonth) as Array<{
    paper_count: number;
    total_factor: number;
    factor_ge10: number;
    max_factor: number;
    journal_counts: string | null;
    hotspot_counts: string | null;
    hotspot_max_if: string | null;
  }>;

  const out: RangeAgg = {
    paper_count: 0,
    total_factor: 0,
    factor_ge10: 0,
    max_factor: 0,
    journal_counts: {},
    hotspot_counts: {},
    hotspot_max_if: {},
  };
  for (const r of rows) {
    out.paper_count += r.paper_count;
    out.total_factor += r.total_factor;
    out.factor_ge10 += r.factor_ge10;
    if (r.max_factor > out.max_factor) out.max_factor = r.max_factor;
    mergeCounts(out.journal_counts, r.journal_counts);
    mergeCounts(out.hotspot_counts, r.hotspot_counts);
    mergeMax(out.hotspot_max_if, r.hotspot_max_if);
  }
  return out;
}

/** 全年聚合 */
export function getYearAgg(brand: string, year: number): RangeAgg {
  return getRangeAgg(brand, year, 1, 12);
}

export interface JournalTop {
  journal: string;
  count: number;
}

/** 区间期刊命中计数（区分大小写精确匹配给定期刊清单） */
export function matchJournals(
  journalCounts: Record<string, number>,
  wanted: string[],
): JournalTop[] {
  const lowerMap = new Map<string, string>();
  for (const w of wanted) lowerMap.set(w.toLowerCase(), w);
  const result: JournalTop[] = [];
  for (const [journal, count] of Object.entries(journalCounts)) {
    const key = lowerMap.get(journal.toLowerCase());
    if (key) result.push({ journal: key, count });
  }
  return result.sort((a, b) => b.count - a.count);
}
