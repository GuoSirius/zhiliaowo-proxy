import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { env } from './env.js';
import type { Locale } from '../config/brands.js';

/** 提示词目录（统一经 env 中心读取：优先 env AI_PROMPT_DIR，否则回退 config/prompts） */
export function promptsDir(): string {
  return env.ai.promptDir;
}

/**
 * 读取品牌专属提示词文件（config/prompts/<brandKey>-<name>.md）。
 * locale=en 时优先 <brandKey>.en-<name>.md，缺失回退到中文版；
 * 英文站点结论/兜底文案可据此给出英文模板，未配置则复用中文。
 */
export function loadPromptFile(brandKey: string, name: string, locale: Locale = 'cn'): string | null {
  const candidates =
    locale === 'cn'
      ? [`${brandKey}-${name}.md`]
      : [`${brandKey}.${locale}-${name}.md`, `${brandKey}-${name}.md`];
  for (const f of candidates) {
    const file = resolve(promptsDir(), f);
    if (existsSync(file)) return readFileSync(file, 'utf8');
  }
  return null;
}

/** 将 {{key}} 占位符替换为给定值（缺失的 key 置空字符串）。变量名支持连字符（如 {{brand-key}}） */
export function renderTemplate(tpl: string, vars: Record<string, string | number>): string {
  return tpl.replace(/\{\{([\w-]+)\}\}/g, (_m, k: string) => {
    const v = vars[k];
    return v === undefined ? '' : String(v);
  });
}
