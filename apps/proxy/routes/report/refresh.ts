import { Hono } from 'hono';
import { parseReportCtx } from '../../lib/report/params.js';
import { getClient } from '../../lib/client.js';
import { syncYear } from '../../lib/report/sync.js';
import { ok } from '../../lib/response.js';

export const reportRefreshRoute = new Hono();

/**
 * 手动触发同步（兜底 / 定时任务补跑入口）。
 * POST /api/v1/:site/report/refresh  body: { "year"?: number, "force"?: boolean }
 * 不传 year 则用路由上下文的默认年（当前年）。force=true 强制重拉全量并重算聚合。
 */
reportRefreshRoute.post('/:site/report/refresh', async (c) => {
  const { brand, year } = parseReportCtx(c);
  const body = (await c.req.json().catch(() => ({}))) as { year?: number | string; force?: boolean };
  const syncYearValue = body.year != null ? Number(body.year) : year;
  const force = !!body.force;

  if (!Number.isInteger(syncYearValue) || syncYearValue <= 0) {
    return ok(c, { error: 'invalid year' }, 'invalid year');
  }

  const client = getClient();
  const result = await syncYear(client, brand, syncYearValue, {
    force,
    onProgress: () => {
      /* HTTP 场景下不逐页推送进度，可接 WebSocket/日志 */
    },
  });
  return ok(c, { brand: brand.brand, year: syncYearValue, force, result });
});
