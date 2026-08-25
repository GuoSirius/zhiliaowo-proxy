import { Hono } from 'hono';
import { resolveBrand } from '../config/brands.js';
import { getClient } from '../lib/client.js';

export const paperYearRoute = new Hono();

/** 2.4 品牌年度文献统计数据：/api/v1/:site/paper-year */
paperYearRoute.get('/:site/paper-year', async (c) => {
  const brand = resolveBrand(c.req.param('site'));
  const data = await getClient().paperYear(brand);
  return c.json(data);
});
