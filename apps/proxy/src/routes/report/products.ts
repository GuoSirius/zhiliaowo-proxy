import { Hono } from 'hono';
import { parseReportCtx, parseSortBy, parsePositiveInt } from '../../services/report/params.js';
import { getRangeProductCounts, buildTopProducts, enrichProductsWithMeta } from '../../services/report/products.js';
import { ok } from '../../shared/response.js';

export const reportProductsRoute = new Hono();

/**
 * 板块 5 —— 产品引用 Top15
 * GET /api/v1/:site/report/products?year=&startMonth=&endMonth=&sortBy=count|growthRate&topN=30&outN=15
 * 数据源：本地 zlw_papers.products 字段按 goodsSpu 聚合。
 * 口径（详见 services/report/products.ts buildTopProducts）：先过滤负增长 → 再按「引用篇数(count)」降序取前 outN(默认15)，
 *   合格数不足时自动翻倍候选池重试凑够 15。默认仅返回 goodsSpu + goodsLabel；
 *   启用 PROD_MYSQL 后按 site.dbPrefix 回查四站点生产库补全 cnName / category（站点差异层）。
 */
reportProductsRoute.get('/:site/report/products', async (c) => {
  const { brand, site, year, startMonth, endMonth } = parseReportCtx(c);
  const sortBy = parseSortBy(c);
  const topN = parsePositiveInt(c, 'topN', 30, 1000);
  const outN = parsePositiveInt(c, 'outN', 15, 100);

  const cur = getRangeProductCounts(brand.brand, year, startMonth, endMonth);
  const prev = getRangeProductCounts(brand.brand, year - 1, startMonth, endMonth);
  const { totalProducts, hasYoY, items, poolUsed } = buildTopProducts({ cur, prev, topN, outN, sortBy });
  const enriched = await enrichProductsWithMeta(items, site.dbPrefix);

  return ok(c, {
    range: { year, startMonth, endMonth },
    totalProducts,
    hasYoY,
    poolUsed,
    items: enriched,
  });
});
