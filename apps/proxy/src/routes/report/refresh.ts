import { Hono, type Context } from 'hono';
import { parseReportCtx } from '../../services/report/params.js';
import { getClient } from '../../shared/client.js';
import { syncYear, type SyncResult } from '../../services/report/sync/index.js';
import { ok, fail } from '../../shared/response.js';
import { env } from '../../shared/env.js';

export const reportRefreshRoute = new Hono();

// 同 brand:year 并发锁：避免重复触发昂贵的上游全量同步（限流/防 DoS）
const syncLocks = new Map<string, Promise<SyncResult>>();

/** 从请求头提取管理令牌（支持 x-admin-token 或 Authorization: Bearer） */
function extractToken(c: Context): string | undefined {
  const raw = c.req.header('x-admin-token') ?? c.req.header('authorization') ?? undefined;
  if (!raw) return undefined;
  return raw.replace(/^Bearer\s+/i, '').trim();
}

/**
 * 手动触发同步（兜底 / 定时任务补跑入口）。
 * POST /api/v1/:site/report/refresh  body: { "year"?: number, "force"?: boolean }
 * 不传 year 则用路由上下文的默认年（当前年）。force=true 强制重拉全量并重算聚合。
 *
 * 安全：必须配置 ADMIN_TOKEN 且携带 x-admin-token（或 Authorization: Bearer）方可调用；
 * 未配置 ADMIN_TOKEN 时直接拒绝（503，fail-closed），避免未授权触发昂贵的全量上游同步 / 打爆上游 / 污染本地库。
 * 重复触发同一 brand:year 会复用进行中的同步，不二次打上游。
 */
reportRefreshRoute.post('/:site/report/refresh', async (c) => {
  const { brand, year } = parseReportCtx(c);
  const body = (await c.req.json().catch(() => ({}))) as { year?: number | string; force?: boolean };
  const syncYearValue = body.year != null ? Number(body.year) : year;
  const force = !!body.force;

  // 鉴权：未配置 ADMIN_TOKEN 时拒绝对外暴露同步能力（fail-closed，防止未授权触发昂贵全量同步 / 打爆上游 / 污染本地库）
  const adminToken = env.admin.token;
  if (!adminToken) {
    return fail(c, 503, 'admin token not configured; sync disabled');
  }
  const token = extractToken(c);
  if (token !== adminToken) {
    return fail(c, 401, 'unauthorized');
  }

  if (!Number.isInteger(syncYearValue) || syncYearValue <= 0) {
    return fail(c, 400, 'invalid year');
  }

  const key = `${brand.brand}:${syncYearValue}`;
  const inFlight = syncLocks.get(key);
  if (inFlight) {
    const result = await inFlight;
    return ok(c, { brand: brand.brand, year: syncYearValue, force, deduplicated: true, result });
  }

  const run = (async () => {
    const client = getClient();
    return syncYear(client, brand, syncYearValue, {
      force,
      onProgress: () => {
        /* HTTP 场景下不逐页推送进度，可接 WebSocket/日志 */
      },
    });
  })();
  syncLocks.set(key, run);
  try {
    const result = await run;
    return ok(c, { brand: brand.brand, year: syncYearValue, force, deduplicated: false, result });
  } finally {
    syncLocks.delete(key);
  }
});
