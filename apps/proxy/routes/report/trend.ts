import { Hono } from 'hono';
import { parseReportCtx } from '../../lib/report/params.js';
import { getRangeAgg } from '../../lib/report/agg.js';
import { getClient } from '../../lib/client.js';
import { ok } from '../../lib/response.js';

interface QuarterDef {
  quarter: number;
  label: string;
  start: number;
  end: number;
}

const QUARTERS: QuarterDef[] = [
  { quarter: 1, label: 'Q1', start: 1, end: 3 },
  { quarter: 2, label: 'Q2', start: 4, end: 6 },
  { quarter: 3, label: 'Q3', start: 7, end: 9 },
  { quarter: 4, label: 'Q4', start: 10, end: 12 },
];

export const reportTrendRoute = new Hono();

/**
 * 板块 3 —— 近十年 SCI 文献年度数量分布 + 季度分布
 * GET /api/v1/:site/report/trend?year=2025
 * - decade：2.4 年度新增（最近 10 年），实时 API（带 1h 缓存）—— 板块 3 主视图
 * - quarters：所选年份的季度分布，来自本地聚合（2.6 列表聚合口径）
 */
reportTrendRoute.get('/:site/report/trend', async (c) => {
  const { brand, year, startMonth, endMonth } = parseReportCtx(c);

  // 2.4 年度新增：近十年（上游返回 {name, value}，且含报告年之后的不完整年份，按所选年截断）
  let decade: Array<{ year: number; count: number }> = [];
  try {
    const series = await getClient().paperYear(brand);
    decade = series
      .map((p) => {
        const o = p as Record<string, unknown>;
        const yr = Number(o.year ?? o.name);
        const cnt = Number(o.count ?? o.value);
        return { year: yr, count: cnt };
      })
      .filter((p) => Number.isFinite(p.year) && Number.isFinite(p.count) && p.year <= year)
      .sort((a, b) => a.year - b.year)
      .slice(-10);
  } catch (e) {
    console.warn(`[trend] 2.4 年度趋势获取失败，降级为空: ${(e as Error).message}`);
  }

  // 季度分布（仅展示与所选月区间相交的季度）
  const quarters = QUARTERS.filter((q) => q.start <= endMonth && q.end >= startMonth).map((q) => {
    const agg = getRangeAgg(brand.brand, year, q.start, q.end);
    return { quarter: q.quarter, label: q.label, count: agg.paper_count };
  });

  return ok(c, { year, range: { startMonth, endMonth }, decade, quarters });
});
