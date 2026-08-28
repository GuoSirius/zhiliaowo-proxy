import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { reportDb } from './db.js';

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

export interface TopJournal {
  journal: string;
  maxIf: number;
  count: number;
}

function round(n: number, d = 2): number {
  const f = Math.pow(10, d);
  return Math.round(n * f) / f;
}

/**
 * 按影响因子（去重取最高）返回区间内 TopN 期刊（板块 6「小结」用）。
 * 同一期刊多篇时取该期刊出现的最高 IF，按 maxIf 降序、count 降序排列。
 */
export function getTopJournalsByFactor(
  brand: string,
  year: number,
  startMonth: number,
  endMonth: number,
  n = 3,
): TopJournal[] {
  const rows = reportDb
    .prepare('SELECT journal, factor FROM zlw_papers WHERE brand=? AND year=? AND month BETWEEN ? AND ?')
    .all(brand, year, startMonth, endMonth) as Array<{
    journal: string | null;
    factor: number | null;
  }>;
  const map = new Map<string, { maxIf: number; count: number }>();
  for (const r of rows) {
    if (!r.journal) continue;
    const f = r.factor == null ? 0 : Number(r.factor);
    const cur = map.get(r.journal) ?? { maxIf: 0, count: 0 };
    cur.count++;
    if (f > cur.maxIf) cur.maxIf = f;
    map.set(r.journal, cur);
  }
  return [...map.entries()]
    .map(([journal, v]) => ({ journal, maxIf: round(v.maxIf), count: v.count }))
    .sort((a, b) => b.maxIf - a.maxIf || b.count - a.count)
    .slice(0, n);
}
