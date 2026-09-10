// apps/proxy/src/routes/product-papers.ts —— 2.7 产品文献列表路由
import { Hono } from 'hono';
import { resolveBrand } from '../config/brands.js';
import { getClient } from '../shared/client.js';
import { ok, fail } from '../shared/response.js';

export const productPapersRoute = new Hono();

/** 2.7 产品文献列表：/api/v1/:site/product-papers?sku=EMC004 */
productPapersRoute.get('/:site/product-papers', async (c) => {
  const brand = resolveBrand(c.req.param('site'));
  const query = c.req.query();
  const sku = query.sku;
  if (!sku) {
    return fail(c, 400, 'sku is required');
  }
  delete query.sku;
  const data = await getClient().productPapers(brand, sku, query);
  return ok(c, data);
});
