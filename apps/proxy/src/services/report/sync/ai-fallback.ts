import type { ResolvedBrand } from '../../../config/brands.js';
import { aiEnabled, callAi } from '../../../datasources/ai.js';
import { reportDb } from '../../../datasources/report-db.js';
import { loadHotspots, classifyHotspot } from '../hotspots.js';
import { loadPromptFile } from '../../../shared/prompts.js';
import { env } from '../../../shared/env.js';

/**
 * 板块 4 AI 兜底（env AI_HOTSPOT_FALLBACK=1 且已配置 AI 时启用；默认关）。
 * 仅对「本地零命中」的文献限量（AI_HOTSPOT_FALLBACK_CAP，默认 200）送 AI 打标，
 * 结果合并进各月 hotspot_counts 复用。任何失败都只告警、绝不中断主同步流程。
 */
const AI_HOTSPOT_FALLBACK_CAP = env.ai.hotspotFallbackCap;

function aiHotspotFallbackEnabled(): boolean {
  return env.ai.hotspotFallback && aiEnabled();
}

function defaultHotspotFallbackPrompt(cnList: string[]): string {
  return (
    `你是文献分类助手。给定一批英文文献标题，请判断每篇最契合哪个研究热点（从列表中选择一个），` +
    `若无匹配则输出"其他"。\n研究热点列表：${cnList.join('、')}`
  );
}

/** 从 AI 返回文本中提取首个 JSON 数组（容错：忽略解释性文字） */
function extractJsonArray(text: string): string[] {
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start < 0 || end < 0 || end <= start) return [];
  try {
    const arr = JSON.parse(text.slice(start, end + 1));
    return Array.isArray(arr) ? arr.map((x) => String(x).trim()) : [];
  } catch {
    return [];
  }
}

function mergeHotspotCount(brandName: string, year: number, month: number, cn: string): void {
  const row = reportDb
    .prepare('SELECT hotspot_counts FROM zlw_papers_agg WHERE brand=? AND year=? AND month=?')
    .get(brandName, year, month) as { hotspot_counts: string | null } | undefined;
  const obj: Record<string, number> = row?.hotspot_counts ? JSON.parse(row.hotspot_counts) : {};
  obj[cn] = (obj[cn] ?? 0) + 1;
  reportDb
    .prepare('UPDATE zlw_papers_agg SET hotspot_counts=? WHERE brand=? AND year=? AND month=?')
    .run(JSON.stringify(obj), brandName, year, month);
}

/** 对本地关键词零命中的文献限量送 AI 打标，结果合并回月度热点计数 */
export async function applyAiHotspotFallback(brand: ResolvedBrand, year: number): Promise<void> {
  if (!aiHotspotFallbackEnabled()) return;
  const hotspots = loadHotspots(brand.key);
  if (!hotspots.length) return;
  const cnList = hotspots.map((h) => h.cn);
  const systemPrompt =
    loadPromptFile(brand.key, 'hotspot-fallback') ?? defaultHotspotFallbackPrompt(cnList);

  let remaining = AI_HOTSPOT_FALLBACK_CAP;
  for (let m = 1; m <= 12 && remaining > 0; m++) {
    const rows = reportDb
      .prepare('SELECT title FROM zlw_papers WHERE brand=? AND year=? AND month=?')
      .all(brand.brand, year, m) as Array<{ title: string | null }>;
    const unclassified = rows
      .filter((r) => r.title && !classifyHotspot(r.title, hotspots))
      .slice(0, remaining);
    if (!unclassified.length) continue;

    for (let i = 0; i < unclassified.length && remaining > 0; i += 50) {
      const batch = unclassified.slice(i, i + 50);
      const titles = batch.map((t, idx) => `[${idx}] ${t.title}`).join('\n');
      const userPrompt =
        `${titles}\n\n请严格只输出一个 JSON 数组，元素为对应的热点中文名或"其他"，顺序与上面 [index] 一一对应。`;
      try {
        const text = await callAi(systemPrompt, userPrompt, { temperature: 0, maxTokens: 2000 });
        const arr = extractJsonArray(text);
        batch.forEach((_t, idx) => {
          const cn = arr[idx];
          if (cn && cn !== '其他' && cnList.includes(cn)) {
            mergeHotspotCount(brand.brand, year, m, cn);
            remaining--;
          }
        });
      } catch (e) {
        console.warn(
          `[sync] AI 兜底 ${brand.brand} ${year} ${m}月第${i}批失败，跳过: ${(e as Error).message}`,
        );
        break;
      }
    }
  }
}
