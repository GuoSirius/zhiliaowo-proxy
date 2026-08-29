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
  /** 实际使用的候选池大小（可能因凑不够 outN 而被自动扩展） */
  poolUsed: number;
}

export type ProductSortBy = 'count' | 'growthRate';

export interface BuildTopProductsOpts {
  cur: Map<string, ProductCount>;
  prev: Map<string, ProductCount>;
  /** 候选池大小：当前区间按引用篇数取前 topN 货号参与计算。默认 30（可放宽 50/100）。 */
  topN?: number;
  /** 最终输出条数。默认 15。 */
  outN?: number;
  /** 候选池自动扩展上限：过滤后合格数仍不足 outN 时翻倍 topN 重试，直到命中 outN 或触及该上限。默认 300。 */
  maxPool?: number;
  /** 最终排序键：count=按引用篇数；growthRate=按同比增长率。默认 count。 */
  sortBy?: ProductSortBy;
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
 *  1. 当前区间按引用篇数取前 topN 货号（默认 30，可放宽 50/100）；
 *  2. 查上一年同区间同批货号计数，算同比增长率；
 *  3. **先过滤**负增长（growthRate < 0）及无去年同期基线的新品（growthRate === null）；
 *  4. 再按 sortBy（默认 count）降序取前 outN（默认 15）。
 *
 * 第 3 步过滤后若合格数不足 outN（例如 topN=30 里大量负增长），自动翻倍候选池重试，
 * 直到命中 outN 或触及 maxPool（默认 300），尽量凑够 15 条合格数据；仍不足则返回实际能凑到的条数。
 *
 * 若无任何去年同期基线（单年部署），跳过增长率过滤、整体按引用篇数降序取前 outN，growthRate 标 null。
 */
export function buildTopProducts(opts: BuildTopProductsOpts): TopProductsResult {
  const topN = opts.topN ?? 30;
  const outN = opts.outN ?? 15;
  const maxPool = opts.maxPool ?? 300;
  const sortBy = opts.sortBy ?? 'count';

  let pool = topN;
  while (true) {
    // 候选池：当前区间按引用篇数取前 pool 货号
    const topCur = [...opts.cur.values()].sort((a, b) => b.count - a.count).slice(0, pool);

    const enriched: EnrichedProduct[] = topCur.map((it) => {
      const prevCount = opts.prev.get(it.spu)?.count ?? 0;
      const growthRate = prevCount > 0 ? round(((it.count - prevCount) / prevCount) * 100) : null;
      return { spu: it.spu, label: it.label, count: it.count, prevCount, growthRate };
    });

    const hasYoY = enriched.some((it) => it.growthRate !== null);

    // ③ 先过滤：负增长 / 无基线一律剔除（排序前过滤）
    const valid = hasYoY
      ? enriched.filter((it) => it.growthRate !== null && it.growthRate >= 0)
      : enriched;

    // 合格数已够 / 候选池已覆盖全部产品 / 已触顶 → ④ 按 sortBy 排序取前 outN
    if (valid.length >= outN || pool >= maxPool || pool >= opts.cur.size) {
      // 无同比基线时只能按数量排（增长率不可比）
      const key: ProductSortBy = hasYoY ? sortBy : 'count';
      const sorted = key === 'growthRate'
        ? [...valid].sort((a, b) => (b.growthRate ?? 0) - (a.growthRate ?? 0))
        : [...valid].sort((a, b) => b.count - a.count);
      return { totalProducts: opts.cur.size, hasYoY, items: sorted.slice(0, outN), poolUsed: pool };
    }

    // 合格数不足 → 翻倍候选池重试（受 maxPool 限制）
    pool = Math.min(maxPool, pool * 2);
  }
}
