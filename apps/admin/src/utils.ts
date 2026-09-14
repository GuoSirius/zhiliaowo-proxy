import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);
// 业务时区锁定北京时间：服务端存北京时间串、前端按北京解释，彻底规避运行环境时区错位
dayjs.tz.setDefault('Asia/Shanghai');

const TIME_FMT = 'YYYY-MM-DD HH:mm:ss';

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

/** 同步时间统一用 dayjs 格式化：兼容旧 UTC-ISO 串、毫秒时间戳、新北京时间串，统一转北京时间 */
export function fmtTime(ts: string | number | null | undefined): string {
  if (ts === null || ts === undefined || ts === '') return '—';
  if (typeof ts === 'number') return dayjs(ts).format(TIME_FMT);
  // 纯数字长串按毫秒时间戳处理
  if (/^\d+$/.test(ts) && ts.length > 10) return dayjs(Number(ts)).format(TIME_FMT);
  // 含 T/Z/毫秒小数 = 旧 UTC-ISO 串，先按 UTC 解析再转北京；其余按北京时间串解释
  const d =
    /[TZ]/.test(ts) || /\.\d+/.test(ts)
      ? dayjs.utc(ts).tz('Asia/Shanghai')
      : dayjs.tz(ts, 'Asia/Shanghai');
  return d.isValid() ? d.format(TIME_FMT) : String(ts);
}

export function fmtDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) return '—';
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}
