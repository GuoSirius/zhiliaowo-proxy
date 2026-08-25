import { Hono } from 'hono';
import { resolveBrand } from '../config/brands.js';
import { getClient } from '../lib/client.js';

export const citeStatRoute = new Hono();

/** 2.2 品牌 + SPU 文献引用概况：/api/v1/:site/cite-stat?sku=EMC004 */
citeStatRoute.get('/:site/cite-stat', async (c) => {
  const brand = resolveBrand(c.req.param('site'));
  const sku = c.req.query('sku');
  if (!sku) {
    return c.json({ error: 'sku is required' }, 400);
  }
  const data = await getClient().citeStat(brand, sku);
  return c.json(data);
});
