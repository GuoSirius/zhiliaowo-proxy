import type { ResolvedBrand } from '../../config/brands.js';
import { getClient } from '../client.js';
import { getRangeAgg } from './agg.js';
import { round } from './calc.js';

export interface DecadePoint {
  year: number;
  count: number;
  /** count 占 decade 数组中最大 count 的百分比（保留 1 位小数） */
  percent: number;
}

export interface QuarterPoint {
  quarter: number;
  label: string;
  year: number;
  count: number;
}

interface QuarterDef extends QuarterPoint {
  start: number;
  end: number;
}

/** 根据 endMonth 确定「最近 4 个季度」：
 *  - 若 endMonth 是当前季度末月（3/6/9/12），则该季度计入；
 *  - 否则该季度不计入，从上一季度开始往前倒推 4 个季度。
 * 返回按时间正序（由早到晚）排列。 */
function buildQuarterDefs(year: number, endMonth: number): QuarterDef[] {
  const currentQuarter = Math.ceil(endMonth / 3);
  const lastIncluded = endMonth === currentQuarter * 3 ? currentQuarter : currentQuarter - 1;

  const defs: QuarterDef[] = [];
  let q = lastIncluded;
  let y = year;
  for (let i = 0; i < 4; i++) {
    if (q < 1) {
      q = 4;
      y--;
    }
    defs.push({ quarter: q, label: `Q${q}`, year: y, start: (q - 1) * 3 + 1, end: q * 3, count: 0 });
    q--;
  }
  // 上面是由近到远 push 的，reverse 成时间正序
  return defs.reverse();
}

/** 构建板块 3「趋势」数据：近十年年度分布 + 最近 4 个季度分布 */
export async function buildTrend(
  brand: ResolvedBrand,
  year: number,
  startMonth: number,
  endMonth: number,
): Promise<{ year: number; range: { startMonth: number; endMonth: number }; decade: DecadePoint[]; quarters: QuarterPoint[] }> {
  let decade: DecadePoint[] = [];
  try {
    const series = await getClient().paperYear(brand);
    const raw = series
      .map((p) => {
        const o = p as Record<string, unknown>;
        return { year: Number(o.year ?? o.name), count: Number(o.count ?? o.value) };
      })
      .filter((p) => Number.isFinite(p.year) && Number.isFinite(p.count) && p.year <= year)
      .sort((a, b) => a.year - b.year)
      .slice(-10);
    const maxCount = Math.max(...raw.map((p) => p.count), 0);
    decade = raw.map((p) => ({
      year: p.year,
      count: p.count,
      percent: maxCount > 0 ? round((p.count / maxCount) * 100, 1) : 0,
    }));
  } catch (e) {
    console.warn(`[trend] 2.4 年度趋势获取失败，降级为空: ${(e as Error).message}`);
  }

  const brandName = brand.brand;
  const quarters = buildQuarterDefs(year, endMonth).map((q) => {
    const agg = getRangeAgg(brandName, q.year, q.start, q.end);
    return { quarter: q.quarter, label: q.label, year: q.year, count: agg.paper_count };
  });

  return { year, range: { startMonth, endMonth }, decade, quarters };
}
