import { ApiError } from '../types.js';

/**
 * OpenAI 兼容的 AI 客户端（用于板块 4 兜底 / 板块 6 小结生成 / 机构名中译）。
 * 配置来自 .env：AI_API_KEY / AI_BASE_URL / AI_MODEL / AI_TIMEOUT_MS。
 * 不引入额外依赖，直接使用全局 fetch（Node >= 18）。
 */

const AI_API_KEY = process.env.AI_API_KEY;
const AI_BASE_URL = (process.env.AI_BASE_URL ?? 'https://apihub.agnes-ai.com/v1').replace(/\/$/, '');
const AI_MODEL = process.env.AI_MODEL ?? 'agnes-2.5-flash';
const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS ?? 60000);

export interface AiOptions {
  temperature?: number;
  maxTokens?: number;
}

/** 是否已配置可用的 AI（未配置时上层应禁用 AI 相关功能，避免运行时报错） */
export function aiEnabled(): boolean {
  return !!AI_API_KEY;
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
  if (!AI_API_KEY) {
    throw new ApiError(500, 'AI_API_KEY 未配置，无法调用 AI');
  }

  const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: prompt });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  try {
    const resp = await fetch(`${AI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: AI_MODEL,
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
      throw new ApiError(504, `AI 调用超时（>${AI_TIMEOUT_MS}ms）`);
    }
    throw new ApiError(502, `AI 调用失败：${(e as Error).message}`);
  } finally {
    clearTimeout(timer);
  }
}
