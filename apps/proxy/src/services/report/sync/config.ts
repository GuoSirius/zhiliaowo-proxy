import { cpus } from 'node:os';
import { env } from '../../../shared/env.js';

/**
 * 并发数自动推导的边界。
 * 本同步是**网络 I/O 密集型**：单页耗时约 300~800ms 且几乎全花在等上游响应上，
 * JSON 解析与 SQLite 落库不足 1ms。这类任务 CPU 核心数并非真实瓶颈 ——
 * Node 事件循环在等待网络时是空闲的，一个线程即可同时挂载成百上千个在途请求。
 *
 * 真正的天花板是上游（第三方开放 API、单 appId）：并发过高会触发限流/超时，
 * 失败页暴增后重试反而更慢。因此这里用 CPU 核心数只当作「机器规格」的粗略代理
 * （防止小内存小核机器开太大），并对上限做硬钳制。
 *
 * 依据 Little's Law：并发 = 目标 QPS × 平均延迟。
 * 单页 ~0.4s 时，并发 12 ≈ 30 req/s，对单个 appId 已属激进。
 */
const AUTO_CONCURRENCY_PER_CORE = 2;
const AUTO_CONCURRENCY_MIN = 4;
const AUTO_CONCURRENCY_MAX = 12;

/**
 * 解析并发数：
 * - 未配置 / 0 / auto / 非法值 → 自动推导：核心数 × 2，钳制到 [4, 12]
 * - 正整数 → 直接使用
 */
function resolveConcurrency(raw: string | undefined): number {
  const n = Number(raw);
  if (raw == null || raw === '' || !Number.isFinite(n) || n <= 0) {
    const cores = cpus()?.length || 1;
    return Math.max(
      AUTO_CONCURRENCY_MIN,
      Math.min(AUTO_CONCURRENCY_MAX, cores * AUTO_CONCURRENCY_PER_CORE),
    );
  }
  return Math.max(1, Math.floor(n));
}

export const DEFAULT_CONCURRENCY = resolveConcurrency(env.report.syncConcurrencyRaw);

/** 人类可读的并发配置来源（如「12（自动：16 核 × 2，钳制 [4, 12]）」），供 CLI 日志输出 */
export const CONCURRENCY_INFO = `${DEFAULT_CONCURRENCY}（${
  env.report.syncConcurrencyRaw
    ? `配置值 ${env.report.syncConcurrencyRaw}`
    : `自动：${cpus()?.length || 1} 核 × ${AUTO_CONCURRENCY_PER_CORE}，钳制 [${AUTO_CONCURRENCY_MIN}, ${AUTO_CONCURRENCY_MAX}]`
}）`;
