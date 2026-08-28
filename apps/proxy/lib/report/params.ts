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

  // 缺失时用默认值；显式传值则必须落在 1-12，越界直接报错（不再静默 clamp，避免口径悄悄偏移）
  const startMonthRaw = c.req.query('startMonth');
  const endMonthRaw = c.req.query('endMonth');
  const startMonth = startMonthRaw != null ? Number(startMonthRaw) : 1;
  const endMonth = endMonthRaw != null ? Number(endMonthRaw) : 12;
  if (!Number.isInteger(startMonth) || startMonth < 1 || startMonth > 12) {
    throw new ApiError(400, 'startMonth 必须是 1-12 之间的整数');
  }
  if (!Number.isInteger(endMonth) || endMonth < 1 || endMonth > 12) {
    throw new ApiError(400, 'endMonth 必须是 1-12 之间的整数');
  }
  if (endMonth < startMonth) throw new ApiError(400, 'endMonth 不能小于 startMonth');
  return { brand, year, startMonth, endMonth };
}
