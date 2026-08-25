import { Hono } from 'hono';
import { resolveBrand } from '../config/brands.js';
import { getClient } from '../lib/client.js';
import { ok, fail } from '../lib/response.js';

export const citeStatRoute = new Hono();

/** 2.2 品牌 + SPU 文献引用概况：/api/v1/:site/cite-stat?sku=EMC004 */
citeStatRoute.get('/:site/cite-stat', async (c) => {
  const brand = resolveBrand(c.req.param('site'));
  const sku = c.req.query('sku');
  if (!sku) {
    return fail(c, 400, 'sku is required');
  }
  const data = await getClient().citeStat(brand, sku);
  return ok(c, data);
});
