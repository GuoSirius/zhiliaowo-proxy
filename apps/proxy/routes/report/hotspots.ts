import { Hono } from 'hono';
import { parseReportCtx, parseSortBy } from '../../lib/report/params.js';
import { getRangeAgg } from '../../lib/report/agg.js';
import { getHotspotRangeStats } from '../../lib/report/hotspots.js';
import { ok } from '../../lib/response.js';

export const reportHotspotsRoute = new Hono();

/** 同比率：cur 相对 prev 的变化百分比；prev<=0 无法计算返回 null */
function pct(cur: number, prev: number, d = 1): number | null {
  if (prev <= 0) return null;
  const f = Math.pow(10, d);
  return Math.round(((cur - prev) / prev) * 100 * f) / f;
}

/**
 * 板块 4 —— 研究热点
 * GET /api/v1/:site/report/hotspots?year=2025&startMonth=1&endMonth=12&sortBy=count|growthRate
 * 数据来自本地 report 原始文献（title 本地关键词匹配，确定性可复现），2.6 列表聚合口径。
 *
 * 返回区间内 Top10 热点：每个热点含 引用篇数(count)、同比(growthRate)、该热点最高 IF(maxIf)。
 * sortBy=count（默认，按引用篇数降序）；sortBy=growthRate 按同比增长率降序（无基线热点排末尾）。
 * AI 兜底开关见 env AI_HOTSPOT_FALLBACK（默认关）；开启时同步阶段会对本地零命中文献限量送 AI 打标。
 */
reportHotspotsRoute.get('/:site/report/hotspots', async (c) => {
  const { brand, year, startMonth, endMonth } = parseReportCtx(c);
  const sortBy = parseSortBy(c);

  const cur = getHotspotRangeStats(brand, year, startMonth, endMonth);
  const prev = getRangeAgg(brand.brand, year - 1, startMonth, endMonth);
  const curAgg = getRangeAgg(brand.brand, year, startMonth, endMonth);

  const prevCounts: Record<string, number> = {};
  for (const [k, v] of Object.entries(prev.hotspot_counts)) prevCounts[k] = v;

  // 先算同比，再按 sortBy 排序，最后取 Top10
  const ranked = cur
    .map((h) => {
      const prevCount = prevCounts[h.cn] ?? 0;
      return {
        cn: h.cn,
        count: h.count,
        prevCount,
        growthRate: pct(h.count, prevCount),
        maxIf: h.maxIf,
      };
    })
    .sort((a, b) =>
      sortBy === 'growthRate'
        ? (b.growthRate ?? -Infinity) - (a.growthRate ?? -Infinity)
        : b.count - a.count,
    );

  const topHotspots = ranked.slice(0, 10);
  const totalClassified = cur.reduce((s, h) => s + h.count, 0);

  return ok(c, {
    range: { year, startMonth, endMonth },
    totalPapers: curAgg.paper_count,
    totalClassified,
    aiFallback: process.env.AI_HOTSPOT_FALLBACK === '1',
    sortBy,
    topHotspots,
  });
});
