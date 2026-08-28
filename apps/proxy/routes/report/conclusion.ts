import { Hono } from 'hono';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { parseReportCtx } from '../../lib/report/params.js';
import { getRangeAgg } from '../../lib/report/agg.js';
import { getHotspotRangeStats } from '../../lib/report/hotspots.js';
import { getTopJournalsByFactor } from '../../lib/report/journals.js';
import { aiEnabled, callAi } from '../../lib/ai.js';
import { ok } from '../../lib/response.js';

export const reportConclusionRoute = new Hono();

const __dirname = dirname(fileURLToPath(import.meta.url));

function round(n: number, d = 2): number {
  const f = Math.pow(10, d);
  return Math.round(n * f) / f;
}

/** 读取品牌专属提示词文件（config/prompts/<brandKey>-<name>.md），缺失返回 null */
function loadPromptFile(brandKey: string, name: string): string | null {
  const dir = process.env.AI_PROMPT_DIR
    ? resolve(process.cwd(), process.env.AI_PROMPT_DIR)
    : resolve(__dirname, '..', '..', 'config', 'prompts');
  const file = resolve(dir, `${brandKey}-${name}.md`);
  return existsSync(file) ? readFileSync(file, 'utf8') : null;
}

/** 将结构化数据渲染进结论提示词模板的占位符 */
function renderConclusionPrompt(
  brandKey: string,
  brandLabel: string,
  year: number,
  stats: { totalPapers: number; avgIf: number; maxIf: number; ifGe10: number },
  topJournals: Array<{ journal: string; maxIf: number; count: number }>,
  topHotspots: Array<{ cn: string; count: number }>,
): string {
  const tpl =
    loadPromptFile(brandKey, 'conclusion') ??
    '你是一位生物医学科研文献分析助手。请基于以下结构化数据撰写一段小结文案。';
  return tpl
    .replace(/\{\{brand\}\}/g, brandLabel)
    .replace(/\{\{year\}\}/g, String(year))
    .replace(/\{\{total\}\}/g, String(stats.totalPapers))
    .replace(/\{\{avgFactor\}\}/g, String(stats.avgIf))
    .replace(/\{\{maxFactor\}\}/g, String(stats.maxIf))
    .replace(/\{\{factorGe10\}\}/g, String(stats.ifGe10))
    .replace(
      /\{\{topJournals\}\}/g,
      topJournals.map((j) => `${j.journal}(IF ${j.maxIf}, ${j.count}篇)`).join('、') || '无',
    )
    .replace(
      /\{\{topHotspots\}\}/g,
      topHotspots.map((h) => `${h.cn}(${h.count}篇)`).join('、') || '无',
    );
}

/**
 * 板块 6 —— 小结
 * GET /api/v1/:site/report/conclusion?year=2025&startMonth=1&endMonth=12
 * 数据来自本地 report 聚合（2.6 列表聚合口径）：
 *  - 结构化部分（本地、确定性）：总篇数/均值IF/最高IF/IF≥10 + Top3 期刊(by factor) + Top10 热点
 *  - AI 小结文案：若已配置 AI（aiEnabled），基于上述结构化数据套提示词生成；失败仅告警并返回 null。
 *
 * 注：板块 6 原规划的「Top6 通讯作者单位 + AI 译中文校名」因 corOrg 等字段 100% 为空（见讨论稿 §六-1），
 * 暂无法实现，待用户向知了窝确认字段权限后再补。
 */
reportConclusionRoute.get('/:site/report/conclusion', async (c) => {
  const { brand, year, startMonth, endMonth } = parseReportCtx(c);

  const agg = getRangeAgg(brand.brand, year, startMonth, endMonth);
  const avgIf = agg.paper_count ? agg.total_factor / agg.paper_count : 0;
  const topJournals = getTopJournalsByFactor(brand.brand, year, startMonth, endMonth, 3);
  const topHotspots = getHotspotRangeStats(brand.key, year, startMonth, endMonth)
    .slice(0, 10)
    .map((h) => ({ cn: h.cn, count: h.count, maxIf: h.maxIf }));

  const stats = {
    totalPapers: agg.paper_count,
    totalIf: round(agg.total_factor),
    avgIf: round(avgIf),
    maxIf: round(agg.max_factor),
    ifGe10: agg.factor_ge10,
  };

  let conclusion: string | null = null;
  let conclusionError: string | null = null;
  if (aiEnabled()) {
    try {
      const system = renderConclusionPrompt(brand.key, brand.label, year, stats, topJournals, topHotspots);
      conclusion = await callAi(system, '请直接输出小结文案，不要任何额外解释。', {
        temperature: 0.4,
        maxTokens: 600,
      });
    } catch (e) {
      conclusionError = (e as Error).message;
      console.warn(`[conclusion] AI 小结生成失败: ${conclusionError}`);
    }
  }

  return ok(c, {
    range: { year, startMonth, endMonth },
    aiEnabled: aiEnabled(),
    stats,
    topJournals,
    topHotspots,
    conclusion,
  });
});
