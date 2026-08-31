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

  // 板块 2 核心数据：
  // 上方 5 个卡片按传入区间 [startMonth, endMonth]（同比为去年同区间）；
  // 底部文案累计：2.1 全历史累计扣减 year 年 endMonth 之后的本地聚合。
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
  };

  // 板块 3 趋势（2.4 优先 + 本地聚合补全 + 缺年补 0；decade 口径固定 full）
  const trend = await buildTrend(brand, year, startMonth, endMonth, 'full');

  // 板块 4 研究热点（与独立 /hotspots 路由口径一致）
  // 先按当年出现次数算同比，再过滤负增长（保留 null 新品与 >=0），最后按出现次数降序取前 10（尽可能满足 10 条）。
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
    // 1) 先过滤负增长（保留 null 新品与 >=0，用户要求不变）
    .filter((h) => h.growthRate === null || h.growthRate >= 0)
    // 2) 再按出现次数降序取前 10（尽可能满足 10 条）
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  const hotspots = {
    totalPapers: cur.paper_count,
    totalClassified: allHotspots.reduce((s, h) => s + h.count, 0),
    aiFallback: process.env.AI_HOTSPOT_FALLBACK === '1',
    topHotspots,
  };

  // 板块 5 产品引用（与独立 /products 路由共用同一口径：过滤负增长后按引用篇数降序取 Top15）
  const curP = getRangeProductCounts(brandName, year, startMonth, endMonth);
  const prevP = getRangeProductCounts(brandName, year - 1, startMonth, endMonth);
  const { totalProducts, hasYoY, items } = buildTopProducts({ cur: curP, prev: prevP });
  const products = {
    range: { year, startMonth, endMonth },
    totalProducts,
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
