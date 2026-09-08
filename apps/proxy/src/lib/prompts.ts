import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** 提示词目录：优先 env AI_PROMPT_DIR，否则回退到 config/prompts */
export function promptsDir(): string {
  return process.env.AI_PROMPT_DIR
    ? resolve(process.cwd(), process.env.AI_PROMPT_DIR)
    : resolve(__dirname, '..', '..', 'config', 'prompts');
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
