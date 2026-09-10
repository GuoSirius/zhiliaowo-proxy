/** 增长率文案：null（无同比基线）显示 — */
export function fmtRate(rate: number | null | undefined): string {
  if (rate === null || rate === undefined || !Number.isFinite(rate)) return '—';
  return `${rate > 0 ? '+' : ''}${rate}%`;
}

/** 国内习惯：涨红跌绿；无基线/持平用中性灰 */
export function rateClass(rate: number | null | undefined): string {
  if (rate === null || rate === undefined || !Number.isFinite(rate) || rate === 0) return 'text-gray-500';
  return rate > 0 ? 'text-red-600' : 'text-green-600';
}

export function fmtNum(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  return n.toLocaleString('zh-CN');
}

/** 同步时间可能是 ISO 串或毫秒时间戳，两种都兜住 */
export function fmtTime(ts: string | number | null | undefined): string {
  if (ts === null || ts === undefined || ts === '') return '—';
  const asNum = typeof ts === 'number' ? ts : Number(ts);
  const d = /^\d+$/.test(String(ts)) && String(ts).length > 10 ? new Date(asNum) : new Date(String(ts));
  return Number.isNaN(d.getTime()) ? String(ts) : d.toLocaleString('zh-CN');
}

export function fmtDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) return '—';
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}
