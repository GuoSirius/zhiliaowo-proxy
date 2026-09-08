import { ApiError } from '../models/types.js';
import { env } from '../shared/env.js';

/**
 * OpenAI 兼容的 AI 客户端（用于板块 4 兜底 / 板块 6 小结生成 / 机构名中译）。
 * 配置来自 .env：AI_API_KEY / AI_BASE_URL / AI_MODEL / AI_TIMEOUT_MS（统一经 env 中心读取）。
 * 不引入额外依赖，直接使用全局 fetch（Node >= 18）。
 */

export interface AiOptions {
  temperature?: number;
  maxTokens?: number;
}

/** 是否已配置可用的 AI（未配置时上层应禁用 AI 相关功能，避免运行时报错） */
export function aiEnabled(): boolean {
  return !!env.ai.apiKey;
}

/**
 * 调用 AI 聊天补全，返回纯文本。
 * 失败（网络/鉴权/超时）统一抛出 ApiError(502)。
 */
export async function callAi(
  system: string | undefined,
  prompt: string,
  opts: AiOptions = {},
): Promise<string> {
  const apiKey = env.ai.apiKey;
  const baseUrl = env.ai.baseUrl;
  const model = env.ai.model;
  const timeoutMs = env.ai.timeoutMs;

  if (!apiKey) {
    throw new ApiError(500, 'AI_API_KEY 未配置，无法调用 AI');
  }

  const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: prompt });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: opts.temperature ?? 0.3,
        max_tokens: opts.maxTokens ?? 2000,
      }),
      signal: controller.signal,
    });

    if (!resp.ok) {
      const txt = await resp.text().catch(() => '');
      throw new ApiError(502, `AI upstream ${resp.status}: ${txt.slice(0, 300)}`);
    }

    const json = (await resp.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = json.choices?.[0]?.message?.content ?? '';
    return text.trim();
  } catch (e) {
    if (e instanceof ApiError) throw e;
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new ApiError(504, `AI 调用超时（>${timeoutMs}ms）`);
    }
    throw new ApiError(502, `AI 调用失败：${(e as Error).message}`);
  } finally {
    clearTimeout(timer);
  }
}
