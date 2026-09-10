import { Hono } from 'hono';
import { parseReportCtx } from '../../services/report/params.js';
import { buildOverview } from '../../services/report/overview.js';
import { ok } from '../../shared/response.js';

export const reportOverviewRoute = new Hono();

/**
 * 板块总编排 —— 一次返回 6 个板块（数据复用各 lib/report 原语，与分板块接口口径一致）。
 * GET /api/v1/:site/report/overview?year=2025&startMonth=1&endMonth=12
 */
reportOverviewRoute.get('/:site/report/overview', async (c) => {
  const { brand, site, year, startMonth, endMonth } = parseReportCtx(c);
  const data = await buildOverview(brand, year, startMonth, endMonth, site);
  return ok(c, data);
});
