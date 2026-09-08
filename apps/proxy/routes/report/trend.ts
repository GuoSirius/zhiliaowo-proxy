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
 * decade：倒推 9 年（year-9 ~ year-1）优先上游 2.4 年度新增 → 本地聚合补全 → 缺年补 0；
 *   decadeMode=full（默认，各年 1-12 月）/ sameRange（各年取 [startMonth,endMonth]）。
 *   指定 year（海报年）口径固定为「截止 endMonth」= 本地 1~endMonth 聚合（不再用 2.4 全年量），
 *   与海报累计文案「截止至 {year} 年 {endMonth} 月」保持一致。
 * quarters：起点 = endMonth 所在季度；只有当 endMonth 是季度末（3/6/9/12）**且**该季度已过完
 *   （按真实日期）时，才把它作为起点；否则起点退到上一季度——即往前推 4 个季度、不包含
 *   endMonth 所在的季度（避免 endMonth=11/4 等中间月份被误归入 Q4/Q2）。
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
