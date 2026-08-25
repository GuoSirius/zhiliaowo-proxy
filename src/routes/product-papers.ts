import { Hono } from 'hono';
import { resolveBrand } from '../config/brands.js';
import { getClient } from '../lib/client.js';

export const productPapersRoute = new Hono();

/** 2.7 产品文献列表：/api/v1/:site/product-papers?sku=EMC004 */
productPapersRoute.get('/:site/product-papers', async (c) => {
  const brand = resolveBrand(c.req.param('site'));
  const query = c.req.query();
  const sku = query.sku;
  if (!sku) {
    return c.json({ error: 'sku is required' }, 400);
  }
  delete query.sku;
  const data = await getClient().productPapers(brand, sku, query);
  return c.json(data);
});
