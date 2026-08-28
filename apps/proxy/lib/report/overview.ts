import type { ResolvedBrand } from '../../config/brands.js';
import { getRangeAgg } from './agg.js';
import { getHotspotRangeStats } from './hotspots.js';
import { getRangeProductCounts } from './products.js';
import { getTopJournalsByFactor, loadFeaturedJournals } from './journals.js';
import { round, pct } from './calc.js';
import { aiEnabled } from '../ai.js';
import { buildTrend } from './trend.js';

/**
 * 编排 6 个板块的数据（一次性返回，供前端整页渲染）。
 * 所有计算复用各 lib/report 原语（与分板块接口口径一致），仅在此组合。
 */
export async function buildOverview(
  brand: ResolvedBrand,
  year: number,
  startMonth: number,
  endMonth: number,
): Promise<Record<string, unknown>> {
  const brandName = brand.brand;
  const brandKey = brand.key;

  const cur = getRangeAgg(brandName, year, startMonth, endMonth);
  const prev = getRangeAgg(brandName, year - 1, startMonth, endMonth);

  // 板块 1 研究概述
  const lowerCounts = new Map<string, number>();
  for (const [j, c] of Object.entries(cur.journal_counts)) {
    const k = j.toLowerCase();
    lowerCounts.set(k, (lowerCounts.get(k) ?? 0) + c);
  }
  const featuredJournals = loadFeaturedJournals(brandKey).map((name) => ({
    journal: name,
    count: lowerCounts.get(name.toLowerCase()) ?? 0,
  }));
  const summary = { totalPapers: cur.paper_count, featuredJournals };

  // 板块 2 核心数据
  const avgCur = cur.paper_count ? cur.total_factor / cur.paper_count : 0;
  const avgPrev = prev.paper_count ? prev.total_factor / prev.paper_count : 0;
  const core = {
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

  // 板块 3 趋势（2.4 年度新增；上游偶发限流时降级为空，不影响其余板块）
  const trend = await buildTrend(brand, year, startMonth, endMonth);

  // 板块 4 研究热点
  const allHotspots = getHotspotRangeStats(brand, year, startMonth, endMonth);
  const prevHotspotCounts = prev.hotspot_counts;
  const topHotspots = allHotspots.slice(0, 10).map((h) => {
    const pc = prevHotspotCounts[h.cn] ?? 0;
    return {
      cn: h.cn,
      count: h.count,
      prevCount: pc,
      growthRate: pct(h.count, pc),
      maxIf: h.maxIf,
    };
  });
  const hotspots = {
    totalPapers: cur.paper_count,
    totalClassified: allHotspots.reduce((s, h) => s + h.count, 0),
    aiFallback: process.env.AI_HOTSPOT_FALLBACK === '1',
    topHotspots,
  };

  // 板块 5 产品引用
  const curP = getRangeProductCounts(brandName, year, startMonth, endMonth);
  const prevP = getRangeProductCounts(brandName, year - 1, startMonth, endMonth);
  const topCur = [...curP.values()].sort((a, b) => b.count - a.count).slice(0, 30);
  const enriched = topCur.map((it) => {
    const pc = prevP.get(it.spu)?.count ?? 0;
    const growthRate = pc > 0 ? round(((it.count - pc) / pc) * 100) : null;
    return { spu: it.spu, label: it.label, count: it.count, prevCount: pc, growthRate };
  });
  const hasYoY = enriched.some((it) => it.growthRate !== null);
  const items = hasYoY
    ? enriched
        .filter((it) => it.growthRate !== null && it.growthRate >= 0)
        .sort((a, b) => (b.growthRate ?? 0) - (a.growthRate ?? 0))
        .slice(0, 15)
    : enriched.sort((a, b) => b.count - a.count).slice(0, 15);
  const products = {
    range: { year, startMonth, endMonth },
    totalProducts: curP.size,
    hasYoY,
    items,
  };

  // 板块 6 小结
  const stats = {
    totalPapers: cur.paper_count,
    totalIf: round(cur.total_factor),
    avgIf: round(avgCur),
    maxIf: round(cur.max_factor),
    ifGe10: cur.factor_ge10,
  };
  const topJournals = getTopJournalsByFactor(brandName, year, startMonth, endMonth, 3);
  const conclusion = {
    aiEnabled: aiEnabled(),
    stats,
    topJournals,
    topHotspots: allHotspots
      .slice(0, 10)
      .map((h) => ({ cn: h.cn, count: h.count, maxIf: h.maxIf })),
    conclusion: null,
  };

  return {
    range: { year, startMonth, endMonth },
    summary,
    core,
    trend,
    hotspots,
    products,
    conclusion,
  };
}
