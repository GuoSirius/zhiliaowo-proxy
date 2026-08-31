import type { ResolvedBrand } from '../../config/brands.js';
import { getClient } from '../client.js';
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
  /** 是否有数据源（2.4 有值或本地已同步）；false 表示缺失，count 的 0 是「无数据」而非「真实 0 篇」 */
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

/** 判断 (year, quarter) 是否已经完整过完（基于当前真实日期）。 */
function isQuarterPassed(year: number, quarter: number): boolean {
  const endMonthOfQuarter = quarter * 3;
  const lastDay = new Date(year, endMonthOfQuarter, 0);
  return new Date() > lastDay;
}

/** 根据 endMonth 确定「最近 4 个已过完季度」：
 *  - 目标季度为 endMonth 所在季度；
 *  - 若该季度已过完（按真实日期），则从该季度开始往前倒推 4 个；
 *  - 否则该季度不计入，从上一季度开始往前倒推 4 个。
 * 返回按时间正序（由早到晚）排列。 */
function buildQuarterDefs(year: number, endMonth: number): QuarterDef[] {
  const currentQuarter = Math.ceil(endMonth / 3);
  const lastIncluded = isQuarterPassed(year, currentQuarter) ? currentQuarter : currentQuarter - 1;

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
 * 某年是否有本地聚合数据。
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
 * 读取上游 2.4 年度新增数据，返回 { year -> count }。
 * 失败时降级为空数组，不抛错。
 */
async function loadUpstreamDecade(
  brand: ResolvedBrand,
  maxYear: number,
): Promise<Map<number, number>> {
  try {
    const series = await getClient().paperYear(brand);
    const map = new Map<number, number>();
    for (const p of series) {
      const o = p as Record<string, unknown>;
      const y = Number(o.year ?? o.name);
      const v = Number(o.count ?? o.value);
      if (Number.isFinite(y) && Number.isFinite(v) && y <= maxYear) {
        map.set(y, v);
      }
    }
    return map;
  } catch (e) {
    console.warn(`[trend] 2.4 年度趋势获取失败，完全降级为本地聚合: ${(e as Error).message}`);
    return new Map();
  }
}

/**
 * 近十年年度分布：
 * 1. 优先用上游 2.4 年度新增数据；
 * 2. 2.4 缺失的年份用本地 zlw_papers_agg 聚合补全；
 * 3. 仍缺失的年份生成骨架并以 count=0、hasData=false 兜底。
 * 窗口终点为请求的 year，往回推 10 年。
 */
async function buildDecade(
  brand: ResolvedBrand,
  year: number,
  startMonth: number,
  endMonth: number,
  mode: DecadeMode,
): Promise<DecadePoint[]> {
  const upstream = await loadUpstreamDecade(brand, year);

  const raw: Array<{ year: number; count: number; hasData: boolean }> = [];
  for (let y = year - 9; y <= year; y++) {
    if (upstream.has(y)) {
      // 优先 2.4
      raw.push({ year: y, count: upstream.get(y)!, hasData: true });
      continue;
    }
    // 本地聚合补全
    const hasData = hasYearData(brand.brand, y);
    const agg =
      mode === 'sameRange'
        ? getRangeAgg(brand.brand, y, startMonth, endMonth)
        : getRangeAgg(brand.brand, y, 1, 12);
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
export async function buildTrend(
  brand: ResolvedBrand,
  year: number,
  startMonth: number,
  endMonth: number,
  decadeMode: DecadeMode = 'full',
): Promise<TrendResult> {
  const decade = await buildDecade(brand, year, startMonth, endMonth, decadeMode);

  const quarters = buildQuarterDefs(year, endMonth).map((q) => {
    const agg = getRangeAgg(brand.brand, q.year, q.start, q.end);
    return { quarter: q.quarter, label: q.label, year: q.year, count: agg.paper_count };
  });

  return { year, range: { startMonth, endMonth }, decadeMode, decade, quarters };
}
