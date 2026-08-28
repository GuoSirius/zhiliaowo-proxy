import { Hono } from 'hono';
import { parseReportCtx } from '../../lib/report/params.js';
import { getRangeAgg } from '../../lib/report/agg.js';
import { loadFeaturedJournals } from '../../lib/report/journals.js';
import { ok } from '../../lib/response.js';

export const reportSummaryRoute = new Hono();

/**
 * 板块 1 —— 研究概述
 * GET /api/v1/:site/report/summary?year=2025&startMonth=1&endMonth=12
 * 数据来自本地 report 聚合（2.6 列表聚合口径）。返回区间内总篇数 + 配置的重点期刊命中篇数。
 */
reportSummaryRoute.get('/:site/report/summary', async (c) => {
  const { brand, year, startMonth, endMonth } = parseReportCtx(c);

  const agg = getRangeAgg(brand.brand, year, startMonth, endMonth);

  // 重点期刊（忽略大小写精确匹配 journal 字段），未命中显示 0，保证海报布局稳定
  const lowerCounts = new Map<string, number>();
  for (const [journal, count] of Object.entries(agg.journal_counts)) {
    const key = journal.toLowerCase();
    lowerCounts.set(key, (lowerCounts.get(key) ?? 0) + count);
  }
  const featured = loadFeaturedJournals(brand.key);
  const featuredJournals = featured.map((name) => ({
    journal: name,
    count: lowerCounts.get(name.toLowerCase()) ?? 0,
  }));

  return ok(c, {
    range: { year, startMonth, endMonth },
    totalPapers: agg.paper_count,
    featuredJournals,
  });
});
