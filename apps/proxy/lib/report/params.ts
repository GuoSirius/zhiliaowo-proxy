import type { Context } from 'hono';
import { resolveBrand, type ResolvedBrand } from '../../config/brands.js';
import { ApiError } from '../../types.js';
import { reportDb } from './db.js';

export interface ReportCtx {
  brand: ResolvedBrand;
  year: number;
  startMonth: number;
  endMonth: number;
}

/** 取某品牌最近一次同步成功的年份，作为未传 year 时的默认值 */
function latestSyncedYear(brand: string): number | null {
  const row = reportDb
    .prepare(`SELECT MAX(year) AS y FROM zlw_sync_state WHERE brand=? AND status='done'`)
    .get(brand) as { y: number | null };
  return row.y;
}

/** 解析 :site + year + startMonth + endMonth 公共参数 */
export function parseReportCtx(c: Context): ReportCtx {
  const site = c.req.param('site');
  if (!site) throw new ApiError(400, 'missing site param');
  const brand = resolveBrand(site);
  const yearParam = c.req.query('year');
  const year =
    yearParam != null ? Number(yearParam) : (latestSyncedYear(brand.brand) ?? new Date().getFullYear());
  if (!Number.isInteger(year)) throw new ApiError(400, 'year 参数无效');

  const startMonth = Math.min(12, Math.max(1, Number(c.req.query('startMonth') ?? 1)));
  const endMonth = Math.min(12, Math.max(1, Number(c.req.query('endMonth') ?? 12)));
  if (!Number.isInteger(startMonth) || !Number.isInteger(endMonth)) {
    throw new ApiError(400, 'startMonth/endMonth 参数无效');
  }
  if (endMonth < startMonth) throw new ApiError(400, 'endMonth 不能小于 startMonth');
  return { brand, year, startMonth, endMonth };
}
