import { Hono } from 'hono';
import { parseReportCtx } from '../../lib/report/params.js';
import { buildTrend, type DecadeMode } from '../../lib/report/trend.js';
import { ok } from '../../lib/response.js';
import { ApiError } from '../../types.js';

export const reportTrendRoute = new Hono();

/**
 * 板块 3 —— 近十年年度分布 + 最近 4 个季度分布
 * GET /api/v1/:site/report/trend?year=&decadeMode=full|sameRange
 *
 * decade：① 优先上游 2.4 年度新增；② 缺失年份用本地聚合补全；
 *   ③ 仍缺失则 count=0 且 hasData=false 兜底。窗口终点为请求的 year，往回推 10 年。
 *   decadeMode=full（默认，各年 1-12 月）/ sameRange（各年取 [startMonth,endMonth]，消除未完年假下滑）。
 * quarters：以 endMonth 所在季度为锚点，按真实日期判断该季度是否已过完；
 *   未过完则从上一已过完季度往前推 4 个完整季度。
 */
reportTrendRoute.get('/:site/report/trend', async (c) => {
  const { brand, year, startMonth, endMonth } = parseReportCtx(c);

  const modeRaw = c.req.query('decadeMode') ?? 'full';
  if (modeRaw !== 'full' && modeRaw !== 'sameRange') {
    throw new ApiError(400, 'decadeMode 只能是 full 或 sameRange');
  }
  const decadeMode = modeRaw as DecadeMode;

  const trend = await buildTrend(brand, year, startMonth, endMonth, decadeMode);
  return ok(c, trend);
});
