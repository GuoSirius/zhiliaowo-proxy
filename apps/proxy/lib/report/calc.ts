/**
 * 通用数值工具（report 子系统统一口径，消除各路由/汇总里重复定义的 round/pct）。
 */

/** 四舍五入到 d 位小数（默认 2；非有限值按 0 处理，避免 NaN 透传到响应） */
export function round(n: number, d = 2): number {
  if (!Number.isFinite(n)) return 0;
  const f = Math.pow(10, d);
  return Math.round(n * f) / f;
}

/**
 * 同比增长率（百分比，默认 1 位小数）。
 * prev<=0 或不是有限数时无法计算，返回 null（前端展示「N/A」）。
 */
export function pct(cur: number, prev: number, d = 1): number | null {
  if (!Number.isFinite(cur) || !Number.isFinite(prev) || prev <= 0) return null;
  const f = Math.pow(10, d);
  return Math.round(((cur - prev) / prev) * 100 * f) / f;
}
