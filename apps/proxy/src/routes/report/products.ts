import { Hono } from 'hono';
import { parseReportCtx, parseSortBy, parsePositiveInt } from '../../lib/report/params.js';
import { getRangeProductCounts, buildTopProducts } from '../../lib/report/products.js';
import { ok } from '../../lib/response.js';

export const reportProductsRoute = new Hono();

/**
 * 板块 5 —— 产品引用 Top15
 * GET /api/v1/:site/report/products?year=&startMonth=&endMonth=&sortBy=count|growthRate&topN=30&outN=15
 * 数据源：本地 zlw_papers.products 字段按 goodsSpu 聚合。
 * 口径（详见 lib/report/products.ts buildTopProducts）：先过滤负增长 → 再按「引用篇数(count)」降序取前 outN(默认15)，
 *   合格数不足时自动翻倍候选池重试凑够 15。仅返回 goodsSpu + goodsLabel，中文名/分类由前端补。
 */
reportProductsRoute.get('/:site/report/products', async (c) => {
  const { brand, year, startMonth, endMonth } = parseReportCtx(c);
  const sortBy = parseSortBy(c);
  const topN = parsePositiveInt(c, 'topN', 30, 1000);
  const outN = parsePositiveInt(c, 'outN', 15, 100);

  const cur = getRangeProductCounts(brand.brand, year, startMonth, endMonth);
  const prev = getRangeProductCounts(brand.brand, year - 1, startMonth, endMonth);
  const { totalProducts, hasYoY, items, poolUsed } = buildTopProducts({ cur, prev, topN, outN, sortBy });

  return ok(c, {
    range: { year, startMonth, endMonth },
    totalProducts,
    hasYoY,
    poolUsed,
    items,
  });
});
