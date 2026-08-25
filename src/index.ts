import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { initClient } from './lib/client.js';
import { ApiError } from './types.js';
import { statisticsRoute } from './routes/statistics.js';
import { citeStatRoute } from './routes/cite-stat.js';
import { paperSumRoute } from './routes/paper-sum.js';
import { paperYearRoute } from './routes/paper-year.js';
import { goodsCiteNumRoute } from './routes/goods-cite-num.js';
import { brandPapersRoute } from './routes/brand-papers.js';
import { productPapersRoute } from './routes/product-papers.js';

const app = new Hono();

app.get('/health', (c) => c.json({ ok: true, ts: Date.now() }));

// 所有接口挂在 /api/v1 下，统一 :site 参数区分 brand
app.route('/api/v1', statisticsRoute);
app.route('/api/v1', citeStatRoute);
app.route('/api/v1', paperSumRoute);
app.route('/api/v1', paperYearRoute);
app.route('/api/v1', goodsCiteNumRoute);
app.route('/api/v1', brandPapersRoute);
app.route('/api/v1', productPapersRoute);

app.onError((err, c) => {
  if (err instanceof ApiError) {
    return c.json({ error: err.message }, err.status as 400 | 404 | 500 | 502);
  }
  console.error('[unhandled error]', err);
  return c.json({ error: 'internal error' }, 500);
});

app.notFound((c) => c.json({ error: 'not found' }, 404));

const port = Number(process.env.PORT ?? 3000);

initClient()
  .then(() => {
    serve({ fetch: app.fetch, port }, (info) => {
      console.log(`zhiliaowo-proxy listening on http://localhost:${info.port}`);
    });
  })
  .catch((e) => {
    console.error('failed to start zhiliaowo-proxy:', e);
    process.exit(1);
  });

export default app;
