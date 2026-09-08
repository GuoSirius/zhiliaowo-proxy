import { Hono } from 'hono';
import { parseReportCtx } from '../../services/report/params.js';
import { getRangeAgg } from '../../services/report/agg.js';
import { getHotspotRangeStats } from '../../services/report/hotspots.js';
import { getTopJournalsByFactor } from '../../services/report/journals.js';
import { selectInstitutions } from '../../services/report/schools.js';
import { round } from '../../services/report/calc.js';
import { loadPromptFile, renderTemplate } from '../../shared/prompts.js';
import type { Locale } from '../../config/brands.js';
import { aiEnabled, callAi } from '../../datasources/ai.js';
import { ok } from '../../shared/response.js';

export const reportConclusionRoute = new Hono();

/** 将结构化数据渲染进结论提示词模板的占位符（locale 决定中文/英文提示词模板） */
function renderConclusionPrompt(
  brandKey: string,
  brandLabel: string,
  year: number,
  stats: { totalPapers: number; avgIf: number; maxIf: number; ifGe10: number },
  topJournals: Array<{ journal: string; maxIf: number; count: number }>,
  topHotspots: Array<{ cn: string; count: number }>,
  locale: Locale = 'cn',
): string {
  const tpl =
    loadPromptFile(brandKey, 'conclusion', locale) ??
    '你是一位生物医学科研文献分析助手。请基于以下结构化数据撰写一段小结文案。';
  return renderTemplate(tpl, {
    brand: brandLabel,
    year,
    total: stats.totalPapers,
    avgFactor: stats.avgIf,
    maxFactor: stats.maxIf,
    factorGe10: stats.ifGe10,
    topJournals: topJournals.map((j) => `${j.journal}(IF ${j.maxIf}, ${j.count}篇)`).join('、') || '无',
    topHotspots: topHotspots.map((h) => `${h.cn}(${h.count}篇)`).join('、') || '无',
  });
}

/**
 * 板块 6 —— 小结
 * GET /api/v1/:site/report/conclusion?year=&startMonth=&endMonth=
 * 响应：topJournals（Top3 期刊 by IF，板块 6 独有）+ institutions（机构展示，见下）
 *       + conclusion（AI 小结文案，未配 AI 时 null）。
 * 注：区间统计与 Top10 热点不在此响应返回（已在板块 2/4 提供），仅在路由内计算并作为 AI 提示词输入。
 *
 * 机构（原规划「Top6 通讯作者单位」）：
 * 因知了窝 API 不返回 corOrg/org 等机构字段，无法取得真实通讯作者单位，
 * 改为「AI 真实优先、Excel 兜底」：当前真实路径恒空，实际由 config/schools.json
 * （由 docs/学校.xlsx 预生成）每次随机抽取 6 所展示。source=excel-fallback 即兜底。
 */
reportConclusionRoute.get('/:site/report/conclusion', async (c) => {
  const { brand, site, year, startMonth, endMonth } = parseReportCtx(c);

  const agg = getRangeAgg(brand.brand, year, startMonth, endMonth);
  const avgIf = agg.paper_count ? agg.total_factor / agg.paper_count : 0;
  const topJournals = getTopJournalsByFactor(brand.brand, year, startMonth, endMonth, 3);
  const topHotspots = getHotspotRangeStats(brand, year, startMonth, endMonth)
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
      const system = renderConclusionPrompt(brand.key, brand.label, year, stats, topJournals, topHotspots, site.locale);
      conclusion = await callAi(system, '请直接输出小结文案，不要任何额外解释。', {
        temperature: 0.4,
        maxTokens: 600,
      });
    } catch (e) {
      conclusionError = (e as Error).message;
      console.warn(`[conclusion] AI 小结生成失败: ${conclusionError}`);
    }
  }

  // 板块6机构：AI 真实优先、Excel 随机兜底（当前数据源无机构字段，实际走兜底）
  const institutions = (await selectInstitutions(6)).map((i) => ({
    name: i.name,
    source: i.source,
  }));

  // 注意：stats / topHotspots 仅作为 AI 提示词输入（见 renderConclusionPrompt），
  // 不再随响应返回——统计见板块 2(core)、热点见板块 4(hotspots)，此处重复且无增量。
  return ok(c, {
    range: { year, startMonth, endMonth },
    aiEnabled: aiEnabled(),
    topJournals,
    institutions,
    conclusion,
  });
});
