import type { ResolvedBrand } from '../../config/brands.js';
import { getRangeAgg } from './agg.js';
import { round } from './calc.js';
import { reportDb } from './db.js';

/**
 * decade 统计口径：
 * - full：各年取全年（1-12 月），默认。年未过完时该年数值天然偏小。
 * - sameRange：各年取 [startMonth, endMonth] 同区间，消除「未完年」造成的假下滑。
 */
export type DecadeMode = 'full' | 'sameRange';

export interface DecadePoint {
  year: number;
  count: number;
  /** count 占 decade 数组中最大 count 的百分比（保留 1 位小数）；无数据年份为 0 */
  percent: number;
  /** 本地是否有该年数据；false 表示未同步，count 的 0 是「无数据」而非「真实 0 篇」 */
  hasData: boolean;
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

/**
 * 某年是否有本地数据。
 * 优先看同步状态（同步过的年份即便真实 0 篇也算有数据），
 * 兜底看聚合表是否有行（recompute 重算过的年份）。
 */
function hasYearData(brand: string, year: number): boolean {
  const st = reportDb
    .prepare(`SELECT status FROM zlw_sync_state WHERE brand=? AND year=?`)
    .get(brand, year) as { status: string | null } | undefined;
  if (st?.status === 'done') return true;
  const row = reportDb
    .prepare(`SELECT COUNT(*) c FROM zlw_papers_agg WHERE brand=? AND year=?`)
    .get(brand, year) as { c: number };
  return row.c > 0;
}

/**
 * 近十年年度分布。
 * 窗口以请求的 year 为终点往前推 10 年 —— 真正锚定 year，
 * 不依赖上游 2.4（后者是锚定「当前真实年份」的滚动窗口，回看历史年份会逐年缩水直至为空）。
 */
function buildDecade(
  brand: string,
  year: number,
  startMonth: number,
  endMonth: number,
  mode: DecadeMode,
): DecadePoint[] {
  const raw: Array<{ year: number; count: number; hasData: boolean }> = [];
  for (let y = year - 9; y <= year; y++) {
    const hasData = hasYearData(brand, y);
    const agg =
      mode === 'sameRange'
        ? getRangeAgg(brand, y, startMonth, endMonth)
        : getRangeAgg(brand, y, 1, 12);
    raw.push({ year: y, count: hasData ? agg.paper_count : 0, hasData });
  }
  // percent 只以有数据的年份为分母基准，避免未同步年份拉低整体尺度
  const maxCount = Math.max(0, ...raw.filter((p) => p.hasData).map((p) => p.count));
  return raw.map((p) => ({
    year: p.year,
    count: p.count,
    hasData: p.hasData,
    percent: p.hasData && maxCount > 0 ? round((p.count / maxCount) * 100, 1) : 0,
  }));
}

export interface TrendResult {
  year: number;
  range: { startMonth: number; endMonth: number };
  decadeMode: DecadeMode;
  decade: DecadePoint[];
  quarters: QuarterPoint[];
}

/** 构建板块 3「趋势」数据：近十年年度分布 + 最近 4 个季度分布 */
export function buildTrend(
  brand: ResolvedBrand,
  year: number,
  startMonth: number,
  endMonth: number,
  decadeMode: DecadeMode = 'full',
): TrendResult {
  const decade = buildDecade(brand.brand, year, startMonth, endMonth, decadeMode);

  const quarters = buildQuarterDefs(year, endMonth).map((q) => {
    const agg = getRangeAgg(brand.brand, q.year, q.start, q.end);
    return { quarter: q.quarter, label: q.label, year: q.year, count: agg.paper_count };
  });

  return { year, range: { startMonth, endMonth }, decadeMode, decade, quarters };
}
