import { Hono } from 'hono';
import { parseReportCtx } from '../../lib/report/params.js';
import { getRangeProductCounts } from '../../lib/report/products.js';
import { ok } from '../../lib/response.js';

export const reportProductsRoute = new Hono();

/** 四舍五入到 d 位小数 */
function round(n: number, d = 1): number {
  const f = Math.pow(10, d);
  return Math.round(n * f) / f;
}

/**
 * 板块 5 —— 产品引用
 * GET /api/v1/:site/report/products?year=2025&startMonth=1&endMonth=12
 * 数据来自本地 report 原始文献（解析 products 字段，2.6 列表聚合口径）。
 *
 * 口径：当年区间 Top30 货号 → 取上一年同区间同批货号计数 → 算同比增长率 →
 * 过滤掉负增长（及无去年同期基线的新品）→ 按增长率降序取 Top15。
 * 只返回货号(goodsSpu) + 英文商品名(goodsLabel)，中文名/分类由前端调网站接口获取。
 */
reportProductsRoute.get('/:site/report/products', async (c) => {
  const { brand, year, startMonth, endMonth } = parseReportCtx(c);

  const cur = getRangeProductCounts(brand.brand, year, startMonth, endMonth);
  const prev = getRangeProductCounts(brand.brand, year - 1, startMonth, endMonth);

  // 当年区间前 30 货号（按引用篇数）
  const topCur = [...cur.values()].sort((a, b) => b.count - a.count).slice(0, 30);

  const enriched = topCur.map((it) => {
    const prevCount = prev.get(it.spu)?.count ?? 0;
    const growthRate = prevCount > 0 ? round(((it.count - prevCount) / prevCount) * 100) : null;
    return { spu: it.spu, label: it.label, count: it.count, prevCount, growthRate };
  });

  // 是否存在去年同期基线：存在则按「正增长降序」取 Top15（过滤负增长及无基线新品）；
  // 完全无基线（单年部署）则退化为按引用量降序取 Top15，growthRate 标 null。
  const hasYoY = enriched.some((it) => it.growthRate !== null);
  const items = hasYoY
    ? enriched
        .filter((it) => it.growthRate !== null && it.growthRate >= 0)
        .sort((a, b) => (b.growthRate ?? 0) - (a.growthRate ?? 0))
        .slice(0, 15)
    : enriched.sort((a, b) => b.count - a.count).slice(0, 15);

  return ok(c, {
    range: { year, startMonth, endMonth },
    totalProducts: cur.size,
    hasYoY,
    items,
  });
});
