/**
 * proxy 基址。默认直连本地 3000（与 DEV_PORT_PROXY 一致）；
 * 生产在仓库根 .env 配 VITE_PROXY_BASE，并在 proxy 侧把该源加进 ALLOWED_ORIGINS。
 */
const BASE = (
  (import.meta.env.VITE_PROXY_BASE as string | undefined) ?? 'http://localhost:3000'
).replace(/\/$/, '');

export class ApiError extends Error {
  constructor(
    readonly code: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOpts {
  method?: string;
  body?: unknown;
  /** 管理令牌，走 x-admin-token 头（仅同步类接口需要） */
  token?: string;
}

/** 统一信封 { code, message, data }：HTTP 非 2xx 或 body.code >= 400 一律抛 ApiError */
export async function request<T>(path: string, opts: RequestOpts = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (opts.token) headers['x-admin-token'] = opts.token;

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    });
  } catch (e) {
    throw new ApiError(0, `无法连接 proxy（${BASE}）：${(e as Error).message}`);
  }

  const body = (await res.json().catch(() => null)) as {
    code: number;
    message: string;
    data: T | null;
  } | null;

  if (!res.ok || !body || body.code >= 400) {
    throw new ApiError(body?.code ?? res.status, body?.message ?? `HTTP ${res.status}`);
  }
  return body.data as T;
}

export const proxyBase = BASE;
