import { Hono } from 'hono';
import { parseReportCtx } from '../../lib/report/params.js';
import { buildTrend } from '../../lib/report/trend.js';
import { ok } from '../../lib/response.js';

export const reportTrendRoute = new Hono();

/**
 * 板块 3 —— 近十年 SCI 文献年度数量分布 + 季度分布
 * GET /api/v1/:site/report/trend?year=2025
 * - decade：2.4 年度新增（最近 10 年），实时 API（带 1h 缓存）—— 板块 3 主视图
 * - quarters：以 endMonth 为锚点的最近 4 个完整季度，来自本地聚合（2.6 列表聚合口径）
 */
reportTrendRoute.get('/:site/report/trend', async (c) => {
  const { brand, year, startMonth, endMonth } = parseReportCtx(c);
  const trend = await buildTrend(brand, year, startMonth, endMonth);
  return ok(c, trend);
});
