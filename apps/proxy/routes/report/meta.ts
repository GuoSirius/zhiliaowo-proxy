import { Hono } from 'hono';
import { parseReportCtx } from '../../lib/report/params.js';
import { reportDb, localPaperCount } from '../../lib/report/db.js';
import { ok } from '../../lib/response.js';

export const reportMetaRoute = new Hono();

/**
 * 同步状态总览（供前端轮询进度 / 运维查看）。
 * GET /api/v1/:site/report/meta
 */
reportMetaRoute.get('/:site/report/meta', async (c) => {
  const { brand } = parseReportCtx(c);
  const states = reportDb
    .prepare(
      `SELECT brand, year, total_count, last_synced_at, status, duration_ms
       FROM zlw_sync_state WHERE brand=? ORDER BY year DESC`,
    )
    .all(brand.brand) as Array<{
    brand: string;
    year: number;
    total_count: number | null;
    last_synced_at: string | null;
    status: string | null;
    duration_ms: number | null;
  }>;
  const withCounts = states.map((s) => ({
    ...s,
    localPapers: localPaperCount(brand.brand, s.year),
  }));
  return ok(c, { brand: brand.brand, syncStates: withCounts });
});
