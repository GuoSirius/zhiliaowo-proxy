import { Hono } from 'hono';
import { parseReportCtx } from '../../lib/report/params.js';
import { getRangeProductCounts, buildTopProducts } from '../../lib/report/products.js';
import { ok } from '../../lib/response.js';

export const reportProductsRoute = new Hono();

/**
 * 板块 5 —— 产品引用
 * GET /api/v1/:site/report/products?year=2025&startMonth=1&endMonth=12
 * 数据来自本地 report 原始文献（解析 products 字段，2.6 列表聚合口径）。
 *
 * 口径（见 lib/report/products.ts buildTopProducts）：当年区间 Top30 货号 →
 * 取上一年同区间同批货号计数算同比增长率 → 过滤掉负增长（及无基线新品）→
 * 按**引用篇数**（不是增长率）降序取 Top15。
 * 只返回货号(goodsSpu) + 英文商品名(goodsLabel)，中文名/分类由前端调网站接口获取。
 */
reportProductsRoute.get('/:site/report/products', async (c) => {
  const { brand, year, startMonth, endMonth } = parseReportCtx(c);

  const cur = getRangeProductCounts(brand.brand, year, startMonth, endMonth);
  const prev = getRangeProductCounts(brand.brand, year - 1, startMonth, endMonth);
  const { totalProducts, hasYoY, items } = buildTopProducts(cur, prev);

  return ok(c, {
    range: { year, startMonth, endMonth },
    totalProducts,
    hasYoY,
    items,
  });
});
