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
 * - decade：优先用上游 2.4 年度新增；2.4 缺失的年份用本地 zlw_papers_agg 聚合补全；
 *   仍缺失的年份生成骨架并以 `count=0, hasData=false` 兜底。
 *   窗口终点为请求的 year，往回推 10 年，真正锚定 year。
 *   - decadeMode=full（默认）：各年取全年 1-12 月
 *   - decadeMode=sameRange：各年取 [startMonth, endMonth] 同区间，消除未完年的假下滑
 * - quarters：以 endMonth 为锚点的最近 4 个完整季度
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
