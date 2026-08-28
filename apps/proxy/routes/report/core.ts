import { Hono } from 'hono';
import { parseReportCtx } from '../../lib/report/params.js';
import { getRangeAgg } from '../../lib/report/agg.js';
import { ok } from '../../lib/response.js';

export const reportCoreRoute = new Hono();

/** 四舍五入到 d 位小数 */
function round(n: number, d = 2): number {
  const f = Math.pow(10, d);
  return Math.round(n * f) / f;
}

/**
 * 同比率：cur 相对 prev 的变化百分比。prev<=0 时无法计算，返回 null（前端展示「N/A」）。
 */
function pct(cur: number, prev: number, d = 1): number | null {
  if (prev <= 0) return null;
  const f = Math.pow(10, d);
  return Math.round(((cur - prev) / prev) * 100 * f) / f;
}

/**
 * 板块 2 —— 引用文献核心数据
 * GET /api/v1/:site/report/core?year=2025&startMonth=1&endMonth=12
 * 数据来自本地 report 聚合（2.6 列表聚合口径）。同比为「去年同区间」对比。
 */
reportCoreRoute.get('/:site/report/core', async (c) => {
  const { brand, year, startMonth, endMonth } = parseReportCtx(c);

  const cur = getRangeAgg(brand.brand, year, startMonth, endMonth);
  const prev = getRangeAgg(brand.brand, year - 1, startMonth, endMonth);

  const avgCur = cur.paper_count ? cur.total_factor / cur.paper_count : 0;
  const avgPrev = prev.paper_count ? prev.total_factor / prev.paper_count : 0;

  const data = {
    range: { year, startMonth, endMonth },
    totalPapers: cur.paper_count,
    totalIf: round(cur.total_factor),
    ifGe10: cur.factor_ge10,
    avgIf: round(avgCur),
    maxIf: round(cur.max_factor),
    yoy: {
      totalPapers: { prev: prev.paper_count, rate: pct(cur.paper_count, prev.paper_count) },
      totalIf: { prev: round(prev.total_factor), rate: pct(cur.total_factor, prev.total_factor) },
      ifGe10: { prev: prev.factor_ge10, rate: pct(cur.factor_ge10, prev.factor_ge10) },
      avgIf: { prev: round(avgPrev), rate: pct(avgCur, avgPrev) },
      maxIf: { prev: round(prev.max_factor), rate: pct(cur.max_factor, prev.max_factor) },
    },
  };
  return ok(c, data);
});
