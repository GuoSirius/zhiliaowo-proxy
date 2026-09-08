import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { env } from './env.js';

/** 提示词目录（统一经 env 中心读取：优先 env AI_PROMPT_DIR，否则回退 config/prompts） */
export function promptsDir(): string {
  return env.ai.promptDir;
}

/** 读取品牌专属提示词文件（config/prompts/<brandKey>-<name>.md），缺失返回 null */
export function loadPromptFile(brandKey: string, name: string): string | null {
  const file = resolve(promptsDir(), `${brandKey}-${name}.md`);
  return existsSync(file) ? readFileSync(file, 'utf8') : null;
}

/** 将 {{key}} 占位符替换为给定值（缺失的 key 置空字符串） */
export function renderTemplate(tpl: string, vars: Record<string, string | number>): string {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_m, k: string) => {
    const v = vars[k];
    return v === undefined ? '' : String(v);
  });
}
