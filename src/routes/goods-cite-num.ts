import { Hono } from 'hono';
import { resolveBrand } from '../config/brands.js';
import { getClient } from '../lib/client.js';

export const goodsCiteNumRoute = new Hono();

/** 2.5 品牌产品文献引用数量列表：/api/v1/:site/goods-cite-num */
goodsCiteNumRoute.get('/:site/goods-cite-num', async (c) => {
  const brand = resolveBrand(c.req.param('site'));
  const data = await getClient().goodsCiteNum(brand, c.req.query());
  return c.json(data);
});
