import { readFileSync, existsSync } from 'node:fs';
import { env } from '../../shared/env.js';

export interface Institution {
  name: string;
  nums?: number;
  source: 'ai-real' | 'excel-fallback';
}

interface SchoolsFile {
  source: string;
  count: number;
  schools: Array<{ name: string; nums?: number | null }>;
}

// docs/学校.xlsx 经 scripts/gen-schools.py 预生成为 config/schools.json（零运行时依赖）。
// 若需指向其它文件，可用 SCHOOLS_FILE 环境变量覆盖（统一经 env 中心读取）。
const SCHOOLS_FILE = env.config.schoolsFile;

let cache: Institution[] | null = null;

/** 读取学校清单（懒加载 + 缓存）。清单由 Excel 预生成，字段：name / nums。 */
export function loadSchools(): Institution[] {
  if (cache) return cache;
  if (!existsSync(SCHOOLS_FILE)) {
    console.warn(`[schools] 未找到 ${SCHOOLS_FILE}，板块6机构将返回空`);
    cache = [];
    return cache;
  }
  const raw = JSON.parse(readFileSync(SCHOOLS_FILE, 'utf8')) as SchoolsFile;
  cache = (raw.schools ?? [])
    .filter((s) => s && s.name)
    .map((s) => ({
      name: s.name,
      nums: s.nums ?? undefined,
      source: 'excel-fallback' as const,
    }));
  return cache;
}

/** 从学校清单中随机抽取 n 所（不放回） */
export function getRandomSchools(n = 6): Institution[] {
  const pool = loadSchools();
  if (pool.length === 0) return [];
  const arr = [...pool];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, Math.min(n, arr.length)).map((s) => ({ ...s, source: 'excel-fallback' }));
}

/**
 * 真实机构来源（AI 优先路径）。
 * 当前知了窝 API 的 zlw_papers 不返回 corOrg / org / country / authorName 等字段
 * （实测表结构里压根没有这些列，authors 也只有作者姓名、不含单位），
 * 故此处恒为空数组 —— 即"AI 查真实机构"在当前数据源下必然空转，自动走 Excel 兜底。
 * 若未来上游开放机构字段，在此接入 AI 提取 TopN 通讯作者单位（按文献量 / IF 排序）。
 */
export async function getRealInstitutions(): Promise<Institution[]> {
  return [];
}

/**
 * 板块6机构选择：优先 AI 真实机构，空则 Excel 随机兜底。
 * 返回长度 = min(n, 可用学校数)。
 */
export async function selectInstitutions(n = 6): Promise<Institution[]> {
  const real = await getRealInstitutions();
  if (real.length >= n) return real.slice(0, n);
  return getRandomSchools(n);
}
