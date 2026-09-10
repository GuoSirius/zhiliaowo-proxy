import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { Hono } from 'hono';

// 统一从仓库根 .env 读取（单一事实源），不再依赖各 app 自己的 .env
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../.env') });
import { serve } from '@hono/node-server';
import { networkInterfaces } from 'node:os';
import { initClient } from './shared/client.js';
import { ok, fail } from './shared/response.js';
import { ApiError } from './models/types.js';
import { statisticsRoute } from './routes/statistics.js';
import { citeStatRoute } from './routes/cite-stat.js';
import { paperSumRoute } from './routes/paper-sum.js';
import { paperYearRoute } from './routes/paper-year.js';
import { goodsCiteNumRoute } from './routes/goods-cite-num.js';
import { brandPapersRoute } from './routes/brand-papers.js';
import { productPapersRoute } from './routes/product-papers.js';
import { reportCoreRoute } from './routes/report/core.js';
import { reportTrendRoute } from './routes/report/trend.js';
import { reportSummaryRoute } from './routes/report/summary.js';
import { reportProductsRoute } from './routes/report/products.js';
import { reportHotspotsRoute } from './routes/report/hotspots.js';
import { reportConclusionRoute } from './routes/report/conclusion.js';
import { reportOverviewRoute } from './routes/report/overview.js';
import { reportRefreshRoute } from './routes/report/refresh.js';
import { reportMetaRoute } from './routes/report/meta.js';
import { widgetRoute } from './routes/widget.js';
import { migrateReportDb } from './datasources/report-db.js';
import { env } from './shared/env.js';

const app = new Hono();

// CORS：仅对白名单内的 Origin 回显，避免任意站点跨域读取报告数据。
// 通过 ALLOWED_ORIGINS（逗号分隔）配置允许的前端域名。
// 安全收敛（§3）：production 且未配置白名单时 fail-closed（不反射任意 Origin）；
// 非 production（本地多 dev 端口联调）若未配置则回显请求 Origin，保持便利。
const ALLOWED_ORIGINS = env.server.allowedOrigins;
const isProd = env.server.nodeEnv === 'production';
if (ALLOWED_ORIGINS.length === 0) {
  if (isProd) {
    console.warn(
      '[cors] ⚠️ ALLOWED_ORIGINS 未配置，生产环境将拒绝跨域请求（fail-closed）。' +
        '如需前端跨域访问，请在环境变量中配置允许的源。',
    );
  } else {
    console.warn('[cors] ALLOWED_ORIGINS 未配置，开发环境将回显请求 Origin 以便本地联调。');
  }
}

app.use('*', async (c, next) => {
  const origin = c.req.header('Origin');
  const allow =
    (ALLOWED_ORIGINS.length > 0 && origin != null && ALLOWED_ORIGINS.includes(origin)) ||
    (ALLOWED_ORIGINS.length === 0 && !isProd);
  if (origin && allow) {
    c.header('Access-Control-Allow-Origin', origin);
    c.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-token');
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

// 6 板块海报报告接口（数据来自本地 report 聚合层）
app.route('/api/v1', reportCoreRoute);
app.route('/api/v1', reportTrendRoute);
app.route('/api/v1', reportSummaryRoute);
app.route('/api/v1', reportProductsRoute);
app.route('/api/v1', reportHotspotsRoute);
app.route('/api/v1', reportConclusionRoute);
app.route('/api/v1', reportOverviewRoute);
app.route('/api/v1', reportRefreshRoute);
app.route('/api/v1', reportMetaRoute);

// 开放组件（iframe）302 分发：/w/:site/* → 知了窝 v_widget，appId 不落前端
app.route('/w', widgetRoute);

// 统一错误处理：ApiError 按状态码返回，其余按 500 兜底
app.onError((err, c) => {
  if (err instanceof ApiError) {
    return fail(c, err.status, err.message);
  }
  console.error('[unhandled error]', err);
  return fail(c, 500, 'internal error');
});

app.notFound((c) => fail(c, 404, 'not found'));

const port = env.server.port;
// 默认绑定 0.0.0.0：同时覆盖 127.0.0.1 / localhost / 本机 LAN IP；可用 HOST 环境变量覆盖
const hostname = env.server.host;

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
    // 报告数据层：建表（6 板块海报原始文献 / 聚合 / 同步状态）
    migrateReportDb();
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
