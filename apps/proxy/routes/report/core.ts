import { Hono } from 'hono';
import { parseReportCtx } from '../../lib/report/params.js';
import { getRangeAgg } from '../../lib/report/agg.js';
import { round, pct } from '../../lib/report/calc.js';
import { ok } from '../../lib/response.js';

export const reportCoreRoute = new Hono();

/**
 * 板块 2 —— 引用文献核心数据
 * GET /api/v1/:site/report/core?year=2025&startMonth=1&endMonth=12
 *
 * 返回两块数据：
 * 1. 上方 5 个同比指标卡片：按传入区间 [startMonth, endMonth] 统计，
 *    同比为「去年同区间」（year-1 的 [startMonth, endMonth]）。
 * 2. 底部文案「截止至 {year} 年 {endMonth} 月」累计数据：按 [1, endMonth] 统计，
 *    对应海报文案「全网共计收录引用...的 SCI 文献达 X 篇，总 IF 值达 Y」。
 * 数据来自本地 report 聚合（2.6 列表聚合口径）。
 */
reportCoreRoute.get('/:site/report/core', async (c) => {
  const { brand, year, startMonth, endMonth } = parseReportCtx(c);

  // 5 个同比指标卡片：按传入区间
  const cur = getRangeAgg(brand.brand, year, startMonth, endMonth);
  const prev = getRangeAgg(brand.brand, year - 1, startMonth, endMonth);
  const avgCur = cur.paper_count ? cur.total_factor / cur.paper_count : 0;
  const avgPrev = prev.paper_count ? prev.total_factor / prev.paper_count : 0;

  // 底部文案累计：1 ~ endMonth
  const cum = getRangeAgg(brand.brand, year, 1, endMonth);
  const cumPrev = getRangeAgg(brand.brand, year - 1, 1, endMonth);

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
    summary: {
      range: { year, startMonth: 1, endMonth },
      totalPapers: cum.paper_count,
      prevTotalPapers: cumPrev.paper_count,
      totalIf: round(cum.total_factor),
      prevTotalIf: round(cumPrev.total_factor),
    },
  };
  return ok(c, data);
});
