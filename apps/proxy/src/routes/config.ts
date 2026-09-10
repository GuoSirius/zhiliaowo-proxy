import { Hono } from 'hono';
import { BRANDS, SITES } from '../config/brands.js';
import { ok } from '../shared/response.js';
import { env } from '../shared/env.js';

export const configRoute = new Hono();

/**
 * 站点 / 品牌配置只读快照（管理后台「品牌配置」页数据源）。
 * GET /api/v1/config/sites
 *
 * appId 是密钥：只回显「是否已配置」，绝不返回明文，避免经前端/日志泄露。
 * 配置本身仍定义在 config/brands.ts（代码即配置），本端点只做只读投影，不提供写能力。
 */
configRoute.get('/config/sites', (c) => {
  const sites = Object.values(SITES).map((s) => ({
    key: s.key,
    label: s.label,
    brand: s.brand,
    brandKey: s.brandKey,
    locale: s.locale,
    dbPrefix: s.dbPrefix,
    appIdEnv: s.appIdEnv,
    appIdConfigured: Boolean(env.zhiliaowo.appId(s.appIdEnv)),
  }));
  const brands = Object.values(BRANDS).map((b) => ({
    key: b.key,
    label: b.label,
    brand: b.brand,
    appIdEnv: b.appIdEnv,
  }));
  return ok(c, { sites, brands });
});
