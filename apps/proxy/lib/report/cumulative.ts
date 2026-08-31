import type { ResolvedBrand } from '../../config/brands.js';
import { getClient } from '../client.js';
import { reportDb } from './db.js';
import { round } from './calc.js';
import type { RangeAgg } from './agg.js';
import { mergeCounts, mergeMax } from './agg.js';

export interface CumulativeStats {
  totalPapers: number;
  totalIf: number;
  maxIf: number;
  avgIf: number;
}

/**
 * 汇总 brand 在 (year, endMonth] 之后（不含）到最新时间的本地聚合：
 * - 同年中 month > endMonth 的月份
 * - 以及所有 year > 指定 year 的已同步年份
 * 用于从 2.1 全历史累计中扣减，得到「截止至 year 年 endMonth 月」累计。
 */
function getAfterRangeAgg(brand: string, year: number, endMonth: number): RangeAgg {
  const rows = reportDb
    .prepare(
      `SELECT paper_count, total_factor, factor_ge10, max_factor, journal_counts, hotspot_counts, hotspot_max_if
       FROM zlw_papers_agg
       WHERE brand=? AND ((year=? AND month > ?) OR (year > ?))`,
    )
    .all(brand, year, endMonth, year) as Array<{
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

/**
 * 通过 2.1 接口获取品牌全历史累计，扣减本地聚合中 year 年 endMonth 之后的数据，
 * 得到「截止至 year 年 endMonth 月」的累计统计。
 */
export async function getCumulativeStats(
  brand: ResolvedBrand,
  year: number,
  endMonth: number,
): Promise<CumulativeStats> {
  const upstream = await getClient().statistics(brand);
  const after = getAfterRangeAgg(brand.brand, year, endMonth);

  return {
    totalPapers: Math.max(0, upstream.totalCount - after.paper_count),
    totalIf: round(Math.max(0, upstream.totalFactor - after.total_factor)),
    maxIf: round(upstream.maxFactor),
    avgIf: round(upstream.avgFactor),
  };
}
