import { Hono } from 'hono';
import { resolveBrand } from '../config/brands.js';
import { getClient } from '../lib/client.js';
import { ok } from '../lib/response.js';

export const brandPapersRoute = new Hono();

/** 2.6 品牌文献列表：/api/v1/:site/papers（支持 pageNum/pageSize/sort/lang 等透传） */
brandPapersRoute.get('/:site/papers', async (c) => {
  const brand = resolveBrand(c.req.param('site'));
  const data = await getClient().brandPapers(brand, c.req.query());
  return ok(c, data);
});
