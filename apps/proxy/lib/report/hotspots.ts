import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

/**
 * 研究热点本地匹配。策略：词边界正则（\b...\b，忽略大小写）逐关键词匹配 title，
 * 取命中词数最多的热点为主热点。纯本地、可复现、零 API 成本，优于 AI 自由分类。
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const HOTSPOT_DIR = process.env.HOTSPOT_DIR
  ? resolve(process.cwd(), process.env.HOTSPOT_DIR)
  : resolve(__dirname, '..', '..', 'config', 'hotspots');

export interface HotspotDef {
  cn: string;
  keywords: string[];
}

export interface HotspotEntry extends HotspotDef {
  regexes: RegExp[];
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 按 brandKey 加载热点定义并预编译正则 */
export function loadHotspots(brandKey: string): HotspotEntry[] {
  const file = resolve(HOTSPOT_DIR, `${brandKey}.json`);
  if (!existsSync(file)) return [];
  const json = JSON.parse(readFileSync(file, 'utf8')) as { items?: HotspotDef[] };
  const items = json.items ?? [];
  return items.map((it) => ({
    cn: it.cn,
    keywords: it.keywords,
    regexes: it.keywords.map((k) => new RegExp(`\\b${escapeRegex(k)}\\b`, 'i')),
  }));
}

/**
 * 判定单篇文献的主热点：返回命中词数最多的热点中文名；无命中返回 null。
 * 命中数相同时取定义顺序靠前者。
 */
export function classifyHotspot(title: string | null | undefined, hotspots: HotspotEntry[]): string | null {
  if (!title) return null;
  const t = title.toLowerCase();
  let best: { cn: string; score: number } | null = null;
  for (const h of hotspots) {
    let score = 0;
    for (const re of h.regexes) {
      if (re.test(t)) score++;
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { cn: h.cn, score };
    }
  }
  return best ? best.cn : null;
}
