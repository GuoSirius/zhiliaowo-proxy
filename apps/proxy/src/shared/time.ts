import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);
// 业务时区统一锁定北京时间：服务端无论部署在哪个时区，生成/解析都按 Asia/Shanghai，
// 从根本上消除「UTC 落库 + 环境时区解析」导致的 8 小时时差。
dayjs.tz.setDefault('Asia/Shanghai');

export const TIME_FMT = 'YYYY-MM-DD HH:mm:ss';

/** 落库时间：北京时间字符串（无 Z 标记），与用户电脑时间一致、DB 直读即所见 */
export function nowBeijing(): string {
  return dayjs().tz('Asia/Shanghai').format(TIME_FMT);
}

/** 当前年份（等价 new Date().getFullYear()），统一出口避免散落 new Date() */
export function currentYear(): number {
  return dayjs().year();
}
