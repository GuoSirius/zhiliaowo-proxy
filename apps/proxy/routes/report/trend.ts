import { Hono } from 'hono';
import { parseReportCtx } from '../../lib/report/params.js';
import { buildTrend, type DecadeMode } from '../../lib/report/trend.js';
import { ok } from '../../lib/response.js';
import { ApiError } from '../../types.js';

export const reportTrendRoute = new Hono();

/**
 * 板块 3 —— 近十年 SCI 文献年度数量分布 + 季度分布
 * GET /api/v1/:site/report/trend?year=2025&decadeMode=full
 *
 * - decade：本地聚合（2.6 列表聚合口径），窗口以请求的 year 为终点往前推 10 年。
 *   不再走 2.4 —— 后者是锚定「当前真实年份」的滚动窗口，回看历史年份会逐年缩水直至为空。
 *   - decadeMode=full（默认）：各年取全年 1-12 月
 *   - decadeMode=sameRange：各年取 [startMonth, endMonth] 同区间，消除未完年的假下滑
 *   未同步年份返回 count=0 且 hasData=false，避免被误读为「真实 0 篇」。
 * - quarters：以 endMonth 为锚点的最近 4 个完整季度
 */
reportTrendRoute.get('/:site/report/trend', async (c) => {
  const { brand, year, startMonth, endMonth } = parseReportCtx(c);

  const modeRaw = c.req.query('decadeMode') ?? 'full';
  if (modeRaw !== 'full' && modeRaw !== 'sameRange') {
    throw new ApiError(400, 'decadeMode 只能是 full 或 sameRange');
  }
  const decadeMode = modeRaw as DecadeMode;

  const trend = buildTrend(brand, year, startMonth, endMonth, decadeMode);
  return ok(c, trend);
});
