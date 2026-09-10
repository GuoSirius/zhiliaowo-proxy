import { Hono } from 'hono';
import { resolveBrand } from '../config/brands.js';
import { getClient } from '../shared/client.js';
import { ok } from '../shared/response.js';

export const statisticsRoute = new Hono();

/** 2.1 品牌文献统计数据：/api/v1/:site/statistics */
statisticsRoute.get('/:site/statistics', async (c) => {
  const brand = resolveBrand(c.req.param('site'));
  const data = await getClient().statistics(brand);
  return ok(c, data);
});
