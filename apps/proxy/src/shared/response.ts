// apps/proxy/src/shared/response.ts —— 统一 API 响应信封：ok（成功）/ fail（失败，支持业务码）
import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

/**
 * 统一 API 响应信封
 * 约定（符合用户要求）：无论成功失败，body 结构始终为 { code, message, data }；
 * 真实业务数据永远放在 data 中（成功时为业务对象，失败时为 null 或附加上下文）。
 *
 * code 语义：
 * - 默认 = HTTP 语义状态码（成功 200，失败 4xx/5xx），HTTP 层可直接感知；
 * - 也可承载「业务码」（如 10001/20001），用于在同一种 HTTP 状态下列举不同异常。
 *   业务码通过 ok/fail 的 code 参数显式传入，缺省回退到 HTTP 状态。
 */
export interface ApiEnvelope<T = unknown> {
  code: number;
  message: string;
  data: T | null;
}

/** 成功响应：HTTP 200；code 缺省 200，可传自定义业务码 */
export function ok<T>(c: Context, data: T, message = 'success', code?: number): Response {
  return c.json<ApiEnvelope<T>>({ code: code ?? 200, message, data });
}

/**
 * 失败响应：HTTP 状态由 status 决定，body.code 缺省回退到 status，也可传独立业务码。
 * data 默认 null；如需透出校验细节等可传入。
 */
export function fail(
  c: Context,
  status: number,
  message: string,
  data: unknown = null,
  code?: number,
): Response {
  // status 为运行时真实 HTTP 状态码（可能含 401/403/503 等），断言到 Hono 的 ContentfulStatusCode，
  // 避免把可合法使用的状态码（如 503）排斥在联合类型外造成「运行正确、类型错误」
  return c.json<ApiEnvelope>({ code: code ?? status, message, data }, status as ContentfulStatusCode);
}
