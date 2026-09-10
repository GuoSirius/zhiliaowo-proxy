// apps/proxy/src/services/report/hotspots.ts —— 研究热点本地匹配：词边界正则 + 跨月累加重聚合，按命中词数取主热点
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ResolvedBrand, Locale } from '../../config/brands.js';
import { env } from '../../shared/env.js';
import { getRangeAgg } from './agg.js';
import { round } from './calc.js';

/**
 * 研究热点本地匹配。策略：词边界正则（\b...\b，忽略大小写）逐关键词匹配 title，
 * 取命中词数最多的热点为主热点。纯本地、可复现、零 API 成本，优于 AI 自由分类。
 *
 * 关键词匹配与 locale 无关（论文标题多为英文），故同步期分类固定用品牌级 cn 定义；
 * 仅「展示名」随站点语言切换——en 配置通过 zh 字段与 DB 聚合键（中文标签）关联。
 */

const HOTSPOT_DIR = env.config.hotspotDir;

export interface HotspotDef {
  /** 展示名（cn 配置为中文标签，en 配置为英文标签） */
  cn: string;
  keywords: string[];
  /** 仅 en 配置携带：对应中文标签，须与 DB 聚合键（分类期写入的中文 cn）完全一致，供英文站展示映射 */
  zh?: string;
}

export interface HotspotEntry extends HotspotDef {
  regexes: RegExp[];
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 按 brandKey + locale 加载热点定义并预编译正则。
 * locale=en 优先 <brandKey>.en.json，缺失回退 <brandKey>.json（复用中文关键词/展示名）；
 * locale=cn 仅读 <brandKey>.json。
 */
export function loadHotspots(brandKey: string, locale: Locale = 'cn'): HotspotEntry[] {
  const candidates =
    locale === 'cn'
      ? [`${brandKey}.json`]
      : [`${brandKey}.${locale}.json`, `${brandKey}.json`];
  for (const f of candidates) {
    const file = resolve(HOTSPOT_DIR, f);
    if (!existsSync(file)) continue;
    const json = JSON.parse(readFileSync(file, 'utf8')) as { items?: HotspotDef[] };
    const items = json.items ?? [];
    return items.map((it) => ({
      cn: it.cn,
      keywords: it.keywords,
      zh: it.zh,
      regexes: it.keywords.map((k) => new RegExp(`\\b${escapeRegex(k)}\\b`, 'i')),
    }));
  }
  return [];
}

/** 构建 中文标签→英文标签 映射（英文站展示用）；无 en 配置时返回空对象（调用方保留原 cn）。 */
export function buildHotspotZhToEn(brandKey: string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const h of loadHotspots(brandKey, 'en')) {
    if (h.zh) map[h.zh] = h.cn;
  }
  return map;
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

export interface HotspotStat {
  cn: string;
  count: number;
  maxIf: number;
}

/**
 * 区间研究热点统计。直接读取预聚合表 `zlw_papers_agg.hotspot_counts` / `hotspot_max_if`
 * （与同比口径完全一致，不再每请求重扫全量 title 做正则），按 count 降序返回。
 */
export function getHotspotRangeStats(
  brand: ResolvedBrand,
  year: number,
  startMonth: number,
  endMonth: number,
): HotspotStat[] {
  const agg = getRangeAgg(brand.brand, year, startMonth, endMonth);
  return Object.entries(agg.hotspot_counts)
    .map(([cn, count]) => ({ cn, count, maxIf: round(agg.hotspot_max_if[cn] ?? 0) }))
    .sort((a, b) => b.count - a.count);
}
