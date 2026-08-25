import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { Hono } from 'hono';

// 统一从仓库根 .env 读取（单一事实源），不再依赖各 app 自己的 .env
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../.env') });
import { serve } from '@hono/node-server';
import { networkInterfaces } from 'node:os';
import { initClient } from './lib/client.js';
import { ok, fail } from './lib/response.js';
import { ApiError } from './types.js';
import { statisticsRoute } from './routes/statistics.js';
import { citeStatRoute } from './routes/cite-stat.js';
import { paperSumRoute } from './routes/paper-sum.js';
import { paperYearRoute } from './routes/paper-year.js';
import { goodsCiteNumRoute } from './routes/goods-cite-num.js';
import { brandPapersRoute } from './routes/brand-papers.js';
import { productPapersRoute } from './routes/product-papers.js';
import { widgetRoute } from './routes/widget.js';
import { migrate } from './h5/store/db.js';
import { seedBrands } from './h5/store/brand.repo.js';
import { h5App, renderDocToHtml } from './h5/index.js';
import { getH5 } from './h5/store/h5.repo.js';

const app = new Hono();

// CORS：回显前端 Origin，支持多前端（admin/h5 独立 dev 端口）跨域调用
app.use('*', async (c, next) => {
  const origin = c.req.header('Origin');
  if (origin) {
    c.header('Access-Control-Allow-Origin', origin);
    c.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    c.header('Access-Control-Max-Age', '86400');
  }
  if (c.req.method === 'OPTIONS') return c.body(null, 204);
  await next();
});

app.get('/health', (c) => ok(c, { ok: true, ts: Date.now() }, 'ok'));

// 所有接口挂在 /api/v1 下，统一 :site 参数区分 brand
app.route('/api/v1', statisticsRoute);
app.route('/api/v1', citeStatRoute);
app.route('/api/v1', paperSumRoute);
app.route('/api/v1', paperYearRoute);
app.route('/api/v1', goodsCiteNumRoute);
app.route('/api/v1', brandPapersRoute);
app.route('/api/v1', productPapersRoute);

// 开放组件（iframe）302 分发：/w/:site/* → 知了窝 v_widget，appId 不落前端
app.route('/w', widgetRoute);

// H5 生成器（文档 CRUD / 导出 / 品牌 / 模板 / 开放平台代理）
app.route('/api/h5', h5App);

// H5 分享页：GET /h5/:id → 自包含 HTML（静态渲染，可直链 / 嵌入）
app.get('/h5/:id', (c) => {
  const doc = getH5(c.req.param('id'));
  if (!doc) return c.notFound();
  const html = renderDocToHtml(doc);
  c.header('Content-Type', 'text/html; charset=utf-8');
  return c.body(html);
});

app.onError((err, c) => {
  if (err instanceof ApiError) {
    return fail(c, err.status, err.message);
  }
  console.error('[unhandled error]', err);
  return fail(c, 500, 'internal error');
});

app.notFound((c) => fail(c, 404, 'not found'));

const port = Number(process.env.PORT ?? 3000);
// 默认绑定 0.0.0.0：同时覆盖 127.0.0.1 / localhost / 本机 LAN IP；可用 HOST 环境变量覆盖
const hostname = process.env.HOST ?? '0.0.0.0';

function lanIp(): string | undefined {
  for (const nets of Object.values(networkInterfaces())) {
    for (const net of nets ?? []) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return undefined;
}

initClient()
  .then(() => {
    // H5 模块：建表 + 内置品牌 seed（幂等）
    migrate();
    seedBrands();
    const server = serve({ fetch: app.fetch, port, hostname }, (info) => {
      const ip = lanIp();
      console.log('zhiliaowo-proxy listening on:');
      console.log(`  - http://localhost:${info.port}`);
      console.log(`  - http://127.0.0.1:${info.port}`);
      if (ip) console.log(`  - http://${ip}:${info.port}  (本机 IP)`);
    });
    // 端口被占用（最常见：上一次 proxy 没退干净 / 同时跑了多个 dev）必须显式捕获，
    // 否则 'error' 事件无监听会带含糊堆栈崩溃，看不出根因。
    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        console.error(
          `[zhiliaowo-proxy] 端口 ${port} 已被占用。最常见原因：上一次 proxy 进程没退干净，` +
            `或同时跑了多个 dev。请先结束占用该端口的进程，或设置 PORT 环境变量换端口后重试。`,
        );
      } else {
        console.error('[zhiliaowo-proxy] server error:', err);
      }
      process.exit(1);
    });
  })
  .catch((e) => {
    console.error('failed to start zhiliaowo-proxy:', e);
    process.exit(1);
  });

export default app;
