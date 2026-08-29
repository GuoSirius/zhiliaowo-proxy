import { reportDb } from './db.js';
import { round } from './calc.js';

export interface ProductCount {
  spu: string;
  label: string;
  count: number;
}

export interface EnrichedProduct {
  spu: string;
  label: string;
  count: number;
  prevCount: number;
  growthRate: number | null;
}

export interface TopProductsResult {
  totalProducts: number;
  hasYoY: boolean;
  items: EnrichedProduct[];
}

/**
 * 统计某 brand+year+区间内的产品引用：逐行解析 zlw_papers.products(JSON 数组)，
 * 按 goodsSpu 聚合篇数，保留 goodsLabel（英文商品名）。
 */
export function getRangeProductCounts(
  brand: string,
  year: number,
  startMonth: number,
  endMonth: number,
): Map<string, ProductCount> {
  const rows = reportDb
    .prepare('SELECT products FROM zlw_papers WHERE brand=? AND year=? AND month BETWEEN ? AND ?')
    .all(brand, year, startMonth, endMonth) as Array<{ products: string | null }>;

  const map = new Map<string, ProductCount>();
  for (const r of rows) {
    if (!r.products) continue;
    let arr: Array<Record<string, unknown>>;
    try {
      arr = JSON.parse(r.products) as Array<Record<string, unknown>>;
    } catch {
      continue;
    }
    for (const p of arr) {
      const spu = typeof p.goodsSpu === 'string' ? p.goodsSpu : '';
      if (!spu) continue;
      const label = typeof p.goodsLabel === 'string' ? p.goodsLabel : '';
      const cur = map.get(spu);
      if (cur) cur.count++;
      else map.set(spu, { spu, label, count: 1 });
    }
  }
  return map;
}

/**
 * 板块 5 产品引用 Top 计算（路由 / overview 共用）：
 *  - 当前区间按引用篇数取前 topN 货号（默认 30）；
 *  - 查上一年同区间同批货号计数，算同比增长率；
 *  - 过滤掉负增长（growthRate < 0）及无去年同期基线的新品（growthRate === null）；
 *  - 最终按**引用篇数**（不是增长率）降序取前 outN（默认 15）。
 *
 * 若无任何去年同期基线（单年部署），退化为直接按引用篇数降序取前 outN，growthRate 标 null。
 */
export function buildTopProducts(
  cur: Map<string, ProductCount>,
  prev: Map<string, ProductCount>,
  topN = 30,
  outN = 15,
): TopProductsResult {
  const topCur = [...cur.values()].sort((a, b) => b.count - a.count).slice(0, topN);

  const enriched: EnrichedProduct[] = topCur.map((it) => {
    const prevCount = prev.get(it.spu)?.count ?? 0;
    const growthRate = prevCount > 0 ? round(((it.count - prevCount) / prevCount) * 100) : null;
    return { spu: it.spu, label: it.label, count: it.count, prevCount, growthRate };
  });

  const hasYoY = enriched.some((it) => it.growthRate !== null);
  // 过滤负增长 / 无基线后，按引用篇数（count）降序取前 outN；无基线整体退化为纯按 count 排序。
  const ranked = hasYoY ? enriched.filter((it) => it.growthRate !== null && it.growthRate >= 0) : enriched;
  const items = [...ranked].sort((a, b) => b.count - a.count).slice(0, outN);

  return { totalProducts: cur.size, hasYoY, items };
}
