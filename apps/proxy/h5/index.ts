import { Hono } from 'hono';
import { ZodError } from 'zod';
import { ok, fail } from '../../lib/response.js';
import type { H5Doc } from '@zhiliaowo/core';
import { renderDocToHtml } from '@zhiliaowo/core';
import {
  listH5,
  getH5,
  createH5,
  updateH5,
  deleteH5,
  duplicateH5,
  publishH5,
} from './store/h5.repo.js';
import {
  listBrands,
  getBrand,
  createBrand,
  updateBrand,
  deleteBrand,
} from './store/brand.repo.js';
import {
  listTemplates,
  getTemplate,
  createTemplate,
  deleteTemplate,
} from './store/template.repo.js';
import {
  proxyStatistics,
  proxyCiteStat,
  proxyPaperSum,
  proxyPaperYear,
  proxyGoodsCiteNum,
  proxyBrandPapers,
  proxyProductPapers,
} from './proxy/openapi.js';
import { renderToHtml } from './export/html.js';
import { renderToVuePage } from './export/vue.js';
import { renderToPng } from './export/png.js';

export const h5App = new Hono();

// ---------- H5 文档 CRUD / 列表 ----------
h5App.get('/', (c) => {
  const q = c.req.query();
  const result = listH5({
    status: q.status as 'draft' | 'published' | undefined,
    brandId: q.brandId,
    keyword: q.keyword,
    page: q.page ? Number(q.page) : undefined,
    pageSize: q.pageSize ? Number(q.pageSize) : undefined,
  });
  return ok(c, result);
});

h5App.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const doc = createH5(body);
    return ok(c, doc, 'created');
  } catch (e) {
    if (e instanceof ZodError) return fail(c, 400, '校验失败：' + e.message);
    throw e;
  }
});

h5App.get('/:id', (c) => {
  const doc = getH5(c.req.param('id'));
  if (!doc) return fail(c, 404, 'h5 not found');
  return ok(c, doc);
});

h5App.put('/:id', async (c) => {
  try {
    const body = await c.req.json();
    const doc = updateH5(c.req.param('id'), body);
    return ok(c, doc, 'updated');
  } catch (e) {
    if (e instanceof ZodError) return fail(c, 400, '校验失败：' + e.message);
    if ((e as Error).message.startsWith('h5 not found')) return fail(c, 404, (e as Error).message);
    throw e;
  }
});

h5App.delete('/:id', (c) => {
  deleteH5(c.req.param('id'));
  return ok(c, null, 'deleted');
});

h5App.post('/:id/duplicate', (c) => {
  try {
    const doc = duplicateH5(c.req.param('id'));
    return ok(c, doc, 'duplicated');
  } catch (e) {
    if ((e as Error).message.startsWith('h5 not found')) return fail(c, 404, (e as Error).message);
    throw e;
  }
});

h5App.post('/:id/publish', (c) => {
  try {
    const doc = publishH5(c.req.param('id'));
    return ok(c, doc, 'published');
  } catch (e) {
    if ((e as Error).message.startsWith('h5 not found')) return fail(c, 404, (e as Error).message);
    throw e;
  }
});

// ---------- 导出（html / png / vue） ----------
h5App.get('/:id/export', async (c) => {
  const doc = getH5(c.req.param('id'));
  if (!doc) return fail(c, 404, 'h5 not found');
  const format = (c.req.query('format') ?? 'html').toLowerCase();
  try {
    if (format === 'png') {
      const buf = await renderToPng(doc);
      c.header('Content-Type', 'image/png');
      c.header('Content-Disposition', `attachment; filename="${doc.id}.png"`);
      return c.body(buf);
    }
    if (format === 'vue') {
      const html = renderToVuePage(doc);
      c.header('Content-Type', 'text/html; charset=utf-8');
      return c.body(html);
    }
    const html = renderToHtml(doc);
    c.header('Content-Type', 'text/html; charset=utf-8');
    c.header('Content-Disposition', `attachment; filename="${doc.id}.html"`);
    return c.body(html);
  } catch (e) {
    return fail(c, 500, '导出失败：' + (e as Error).message);
  }
});

// ---------- 品牌主题 ----------
h5App.get('/brands', (c) => ok(c, listBrands()));
h5App.get('/brands/:key', (c) => {
  const b = getBrand(c.req.param('key'));
  if (!b) return fail(c, 404, 'brand not found');
  return ok(c, b);
});
h5App.post('/brands', async (c) => {
  try {
    return ok(c, createBrand(await c.req.json()), 'created');
  } catch (e) {
    if (e instanceof ZodError) return fail(c, 400, '校验失败：' + e.message);
    throw e;
  }
});
h5App.put('/brands/:key', async (c) => {
  try {
    return ok(c, updateBrand(c.req.param('key'), await c.req.json()), 'updated');
  } catch (e) {
    if ((e as Error).message.startsWith('brand not found')) return fail(c, 404, (e as Error).message);
    throw e;
  }
});
h5App.delete('/brands/:key', (c) => {
  deleteBrand(c.req.param('key'));
  return ok(c, null, 'deleted');
});

// ---------- 模板 ----------
h5App.get('/templates', (c) => ok(c, listTemplates()));
h5App.get('/templates/:id', (c) => {
  const t = getTemplate(c.req.param('id'));
  if (!t) return fail(c, 404, 'template not found');
  return ok(c, t);
});
h5App.post('/templates', async (c) => {
  try {
    const body = await c.req.json();
    if (!body.name || !body.doc) return fail(c, 400, '需要 name 与 doc');
    return ok(c, createTemplate(body.name, body.doc), 'created');
  } catch (e) {
    if (e instanceof ZodError) return fail(c, 400, '校验失败：' + e.message);
    throw e;
  }
});
h5App.delete('/templates/:id', (c) => {
  deleteTemplate(c.req.param('id'));
  return ok(c, null, 'deleted');
});

// ---------- 知了窝开放平台代理 ----------
h5App.get('/proxy/statistics', async (c) => {
  const brand = c.req.query('brand');
  if (!brand) return fail(c, 400, '缺少 brand');
  return ok(c, await proxyStatistics(brand));
});
h5App.get('/proxy/cite-stat', async (c) => {
  const brand = c.req.query('brand');
  const sku = c.req.query('sku');
  if (!brand || !sku) return fail(c, 400, '缺少 brand / sku');
  return ok(c, await proxyCiteStat(brand, sku));
});
h5App.get('/proxy/paper-sum', async (c) => {
  const brand = c.req.query('brand');
  if (!brand) return fail(c, 400, '缺少 brand');
  return ok(c, await proxyPaperSum(brand));
});
h5App.get('/proxy/paper-year', async (c) => {
  const brand = c.req.query('brand');
  if (!brand) return fail(c, 400, '缺少 brand');
  return ok(c, await proxyPaperYear(brand));
});
h5App.get('/proxy/goods-cite-num', async (c) => {
  const brand = c.req.query('brand');
  if (!brand) return fail(c, 400, '缺少 brand');
  const query = Object.fromEntries(Object.entries(c.req.query()).filter(([k]) => k !== 'brand'));
  return ok(c, await proxyGoodsCiteNum(brand, query));
});
h5App.get('/proxy/brand-papers', async (c) => {
  const brand = c.req.query('brand');
  if (!brand) return fail(c, 400, '缺少 brand');
  const query = Object.fromEntries(Object.entries(c.req.query()).filter(([k]) => k !== 'brand'));
  return ok(c, await proxyBrandPapers(brand, query));
});
h5App.get('/proxy/product-papers', async (c) => {
  const brand = c.req.query('brand');
  const sku = c.req.query('sku');
  if (!brand || !sku) return fail(c, 400, '缺少 brand / sku');
  const query = Object.fromEntries(Object.entries(c.req.query()).filter(([k]) => k !== 'brand' && k !== 'sku'));
  return ok(c, await proxyProductPapers(brand, sku, query));
});

export { renderDocToHtml };
export type { H5Doc };
