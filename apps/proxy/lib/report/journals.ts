import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

/**
 * 重点期刊配置（板块 1「研究概述」用）。按 brandKey 分文件，
 * 内容为该品牌要重点展示的顶级期刊名单（精确匹配 journal 字段，忽略大小写）。
 */
const __dirname = dirname(fileURLToPath(import.meta.url));
const JOURNALS_DIR = process.env.JOURNALS_DIR
  ? resolve(process.cwd(), process.env.JOURNALS_DIR)
  : resolve(__dirname, '..', '..', 'config', 'journals');

export function loadFeaturedJournals(brandKey: string): string[] {
  const file = resolve(JOURNALS_DIR, `${brandKey}.json`);
  if (!existsSync(file)) return [];
  const json = JSON.parse(readFileSync(file, 'utf8')) as { featured?: string[] };
  return json.featured ?? [];
}
