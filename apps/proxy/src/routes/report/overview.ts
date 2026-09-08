import { Hono } from 'hono';
import { parseReportCtx } from '../../lib/report/params.js';
import { buildOverview } from '../../lib/report/overview.js';
import { ok } from '../../lib/response.js';

export const reportOverviewRoute = new Hono();

/**
 * 板块总编排 —— 一次返回 6 个板块（数据复用各 lib/report 原语，与分板块接口口径一致）。
 * GET /api/v1/:site/report/overview?year=2025&startMonth=1&endMonth=12
 */
reportOverviewRoute.get('/:site/report/overview', async (c) => {
  const { brand, year, startMonth, endMonth } = parseReportCtx(c);
  const data = await buildOverview(brand, year, startMonth, endMonth);
  return ok(c, data);
});
