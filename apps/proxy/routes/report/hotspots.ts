import { Hono } from 'hono';
import { parseReportCtx, parseSortBy } from '../../lib/report/params.js';
import { getRangeAgg } from '../../lib/report/agg.js';
import { getHotspotRangeStats } from '../../lib/report/hotspots.js';
import { pct } from '../../lib/report/calc.js';
import { ok } from '../../lib/response.js';

export const reportHotspotsRoute = new Hono();

/**
 * 板块 4 —— 研究热点 Top10
 * GET /api/v1/:site/report/hotspots?year=&startMonth=&endMonth=&sortBy=count|growthRate
 * 数据源：本地聚合 zlw_papers_agg（title 关键词匹配，确定性可复现）。
 * 口径：① 去年同区间算同比；② 先过滤负增长（保留无基线新品与 ≥0）；
 *      ③ 再按「关键词命中次数(count)」降序取前 10（尽可能满足 10 条）。
 * sortBy 仅对最终结果二次排序（默认 count）。AI 兜底见 env AI_HOTSPOT_FALLBACK。
 */
reportHotspotsRoute.get('/:site/report/hotspots', async (c) => {
  const { brand, year, startMonth, endMonth } = parseReportCtx(c);
  const sortBy = parseSortBy(c);

  const cur = getHotspotRangeStats(brand, year, startMonth, endMonth); // 已按 count 降序
  const prevList = getHotspotRangeStats(brand, year - 1, startMonth, endMonth); // 去年同区间，用于算同比
  const prevCounts: Record<string, number> = {};
  for (const h of prevList) prevCounts[h.cn] = h.count;
  const curAgg = getRangeAgg(brand.brand, year, startMonth, endMonth);

  // 算同比 → 过滤负增长（保留无基线新品与 ≥0）→ 按关键词次数降序取前 10
  const topHotspots = cur
    .map((h) => {
      const prevCount = prevCounts[h.cn] ?? 0;
      return { cn: h.cn, count: h.count, prevCount, growthRate: pct(h.count, prevCount), maxIf: h.maxIf };
    })
    .filter((h) => h.growthRate === null || h.growthRate >= 0)
    .sort((a, b) =>
      sortBy === 'growthRate'
        ? (b.growthRate ?? -Infinity) - (a.growthRate ?? -Infinity)
        : b.count - a.count,
    )
    .slice(0, 10);
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
