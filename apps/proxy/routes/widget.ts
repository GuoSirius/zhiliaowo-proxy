import { Hono } from 'hono';
import { resolveBrand } from '../config/brands.js';

/** 开放组件（iframe）基址：默认 v11，切换版本/域名改此处 */
const WIDGET_BASE = (process.env.ZLIW_WIDGET_BASE ?? 'https://open.zhiliaowo.cn/v_widget/v11').replace(/\/$/, '');

export const widgetRoute = new Hono();

/**
 * 开放组件（iframe）302 分发：/w/:site/*
 *
 * 前端 iframe 只写自家域名（如 /w/elab/brand/statistics），appId 不落前端源码；
 * 后端按 site 从 BRANDS 取 brand + appId，拼好知了窝组件 URL 后 302 跳转。
 * 原始 query（sku / lang 等）透传，appId / brand 由后端注入，不会被覆盖。
 *
 * 说明：302 跳转后浏览器最终仍会带 appId 请求知了窝（Network 可见），
 * 但前端源码/构建产物中不含 appId，满足「appId 不落前端」的核心诉求。
 */
widgetRoute.get('/:site/*', (c) => {
  const site = c.req.param('site');
  const brand = resolveBrand(site); // 未知 site 抛 ApiError(404)
  const rest = c.req.path.replace(/^\/w\/[^/]+/, ''); // /brand/statistics
  const target = new URL(WIDGET_BASE + rest);
  target.searchParams.set('appId', brand.appId);
  target.searchParams.set('brand', brand.brand);
  // 透传原始 query（sku / lang 等），不覆盖后端注入的 appId / brand
  for (const [k, v] of Object.entries(c.req.query())) {
    if (k !== 'appId' && k !== 'brand') target.searchParams.set(k, v);
  }
  return c.redirect(target.toString(), 302);
});
