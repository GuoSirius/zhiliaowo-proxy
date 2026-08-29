import { Hono } from 'hono';
import { parseReportCtx, parseSortBy, parsePositiveInt } from '../../lib/report/params.js';
import { getRangeProductCounts, buildTopProducts } from '../../lib/report/products.js';
import { ok } from '../../lib/response.js';

export const reportProductsRoute = new Hono();

/**
 * 板块 5 —— 产品引用
 * GET /api/v1/:site/report/products?year=2025&startMonth=1&endMonth=12
 *     &sortBy=count|growthRate &topN=30 &outN=15
 * 数据来自本地 report 原始文献（解析 products 字段，2.6 列表聚合口径）。
 *
 * 口径（见 lib/report/products.ts buildTopProducts）：
 *  - 当前区间按引用篇数取前 topN 货号（默认 30，可放宽 50/100）；
 *  - 取上一年同区间同批货号计数算同比增长率；
 *  - 先过滤负增长（及无基线新品），再按 sortBy（默认 count）降序取前 outN（默认 15）；
 *  - 过滤后合格数不足 outN 时自动翻倍候选池重试（≤ maxPool=300），尽量凑够 15 条。
 * 只返回货号(goodsSpu) + 英文商品名(goodsLabel)，中文名/分类由前端调网站接口获取。
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
