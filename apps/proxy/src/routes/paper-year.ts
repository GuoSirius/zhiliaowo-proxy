// apps/proxy/src/routes/paper-year.ts —— 2.4 品牌年度文献统计路由
import { Hono } from 'hono';
import { resolveBrand } from '../config/brands.js';
import { getClient } from '../shared/client.js';
import { ok } from '../shared/response.js';

export const paperYearRoute = new Hono();

/** 2.4 品牌年度文献统计数据：/api/v1/:site/paper-year */
paperYearRoute.get('/:site/paper-year', async (c) => {
  const brand = resolveBrand(c.req.param('site'));
  const data = await getClient().paperYear(brand);
  return ok(c, data);
});
