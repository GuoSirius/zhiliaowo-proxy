import type { ResolvedBrand } from '../../config/brands.js';
import { getRangeAgg } from './agg.js';
import { getHotspotRangeStats } from './hotspots.js';
import { getRangeProductCounts, buildTopProducts } from './products.js';
import { getTopJournalsByFactor, loadFeaturedJournals } from './journals.js';
import { getCumulativeStats } from './cumulative.js';
import { round, pct } from './calc.js';
import { aiEnabled } from '../ai.js';
import { buildTrend } from './trend.js';

/**
 * 编排全部 6 个板块（一次性返回，供前端整页渲染）。
 * 所有计算复用 lib/report 各原语，口径与分板块接口完全一致，此处不再重复定义。
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

  // —— 板块 1 研究概述（区间总篇数 + 重点期刊命中）
  const lowerCounts = new Map<string, number>();
  for (const [j, c] of Object.entries(cur.journal_counts)) {
    const k = j.toLowerCase();
    lowerCounts.set(k, (lowerCounts.get(k) ?? 0) + c);
  }
  const featuredJournals = loadFeaturedJournals(brandKey).map((name) => ({
    journal: name,
    count: lowerCounts.get(name.toLowerCase()) ?? 0,
  }));
  const summary = { range: { year, startMonth, endMonth }, totalPapers: cur.paper_count, featuredJournals };

  // —— 板块 2 核心数据（5 卡片按区间同比 + 2.1 累计扣减，口径见 routes/report/core.ts）
  const avgCur = cur.paper_count ? cur.total_factor / cur.paper_count : 0;
  const avgPrev = prev.paper_count ? prev.total_factor / prev.paper_count : 0;
  const cum = await getCumulativeStats(brand, year, endMonth);
  const cumPrev = getRangeAgg(brandName, year - 1, 1, endMonth);
  const core = {
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
    cumulative: {
      range: { year, startMonth: 1, endMonth },
      totalPapers: cum.totalPapers,
      prevTotalPapers: cumPrev.paper_count,
      totalIf: cum.totalIf,
      prevTotalIf: round(cumPrev.total_factor),
      maxIf: cum.maxIf,
      avgIf: cum.avgIf,
    },
    summary: {
      range: { year, startMonth: 1, endMonth },
      totalPapers: cum.totalPapers,
      prevTotalPapers: cumPrev.paper_count,
      totalIf: cum.totalIf,
      prevTotalIf: round(cumPrev.total_factor),
      maxIf: cum.maxIf,
      avgIf: cum.avgIf,
    },
  };

  // —— 板块 3 趋势（近十年 + 季度，口径见 lib/report/trend.ts；overview 固定 full）
  const trend = await buildTrend(brand, year, startMonth, endMonth, 'full');

  // —— 板块 4 研究热点 Top10（口径见 lib/report/hotspots.ts & routes/report/hotspots.ts）
  const allHotspots = getHotspotRangeStats(brand, year, startMonth, endMonth); // 已按 count 降序
  const prevHotspots = getHotspotRangeStats(brand, year - 1, startMonth, endMonth); // 去年同样方式
  const prevHotspotCounts: Record<string, number> = {};
  for (const h of prevHotspots) prevHotspotCounts[h.cn] = h.count;
  const topHotspots = allHotspots
    .map((h) => {
      const pc = prevHotspotCounts[h.cn] ?? 0;
      return {
        cn: h.cn,
        count: h.count,
        prevCount: pc,
        growthRate: pct(h.count, pc),
        maxIf: h.maxIf,
      };
    })
    .filter((h) => h.growthRate === null || h.growthRate >= 0) // 先过滤负增长
    .sort((a, b) => b.count - a.count) // 再按关键词次数降序
    .slice(0, 10);
  const hotspots = {
    range: { year, startMonth, endMonth },
    totalPapers: cur.paper_count,
    totalClassified: allHotspots.reduce((s, h) => s + h.count, 0),
    aiFallback: process.env.AI_HOTSPOT_FALLBACK === '1',
    sortBy: 'count',
    topHotspots,
  };

  // —— 板块 5 产品引用 Top15（口径见 lib/report/products.ts）
  const curP = getRangeProductCounts(brandName, year, startMonth, endMonth);
  const prevP = getRangeProductCounts(brandName, year - 1, startMonth, endMonth);
  const { totalProducts, hasYoY, items, poolUsed } = buildTopProducts({ cur: curP, prev: prevP });
  const products = {
    range: { year, startMonth, endMonth },
    totalProducts,
    hasYoY,
    poolUsed,
    items,
  };

  // —— 板块 6 小结（响应口径与 conclusion 单独接口一致：仅 range/aiEnabled/topJournals/conclusion）
  const topJournals = getTopJournalsByFactor(brandName, year, startMonth, endMonth, 3);
  const conclusion = {
    range: { year, startMonth, endMonth },
    aiEnabled: aiEnabled(),
    topJournals,
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
