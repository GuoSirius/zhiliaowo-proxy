import { Hono } from 'hono';
import { parseReportCtx } from '../../lib/report/params.js';
import { getRangeAgg } from '../../lib/report/agg.js';
import { round, pct } from '../../lib/report/calc.js';
import { ok } from '../../lib/response.js';

export const reportCoreRoute = new Hono();

/**
 * 板块 2 —— 引用文献核心数据
 * GET /api/v1/:site/report/core?year=2025&endMonth=6
 *
 * 口径固定为「截止至 {year} 年 {endMonth} 月」= 1 月累计到 endMonth 月，
 * 对应海报文案「截止至 2025 年（全年 / 6 月）」。startMonth 恒为 1，传入也忽略。
 * 同比为「去年同区间」（year-1 的 1~endMonth）。
 * 数据来自本地 report 聚合（2.6 列表聚合口径）。
 */
reportCoreRoute.get('/:site/report/core', async (c) => {
  const { brand, year, startMonth, endMonth } = parseReportCtx(c, { forceStartFrom1: true });

  const cur = getRangeAgg(brand.brand, year, startMonth, endMonth);
  const prev = getRangeAgg(brand.brand, year - 1, startMonth, endMonth);

  const avgCur = cur.paper_count ? cur.total_factor / cur.paper_count : 0;
  const avgPrev = prev.paper_count ? prev.total_factor / prev.paper_count : 0;

  const data = {
    range: { year, startMonth, endMonth },
    totalPapers: {
      value: cur.paper_count,
      prevValue: prev.paper_count,
      rate: pct(cur.paper_count, prev.paper_count),
    },
    totalIf: {
      value: round(cur.total_factor),
      prevValue: round(prev.total_factor),
      rate: pct(cur.total_factor, prev.total_factor),
    },
    ifGe10: {
      value: cur.factor_ge10,
      prevValue: prev.factor_ge10,
      rate: pct(cur.factor_ge10, prev.factor_ge10),
    },
    avgIf: {
      value: round(avgCur),
      prevValue: round(avgPrev),
      rate: pct(avgCur, avgPrev),
    },
    maxIf: {
      value: round(cur.max_factor),
      prevValue: round(prev.max_factor),
      rate: pct(cur.max_factor, prev.max_factor),
    },
  };
  return ok(c, data);
});
