import { Hono } from 'hono';
import { resolveBrand } from '../config/brands.js';
import { getClient } from '../lib/client.js';
import { ok } from '../lib/response.js';

export const paperSumRoute = new Hono();

/** 2.3 品牌历年文献累计数量：/api/v1/:site/paper-sum */
paperSumRoute.get('/:site/paper-sum', async (c) => {
  const brand = resolveBrand(c.req.param('site'));
  const data = await getClient().paperSum(brand);
  return ok(c, data);
});
