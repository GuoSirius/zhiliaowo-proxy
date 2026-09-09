import { reportDb } from '../../datasources/report-db.js';
import { prodMysqlEnabledForSite, getProdMysql } from '../../datasources/prod-mysql.js';
import type { ResolvedSite } from '../../config/brands.js';
import { round } from './calc.js';

export interface ProductCount {
  spu: string;
  label: string;
  count: number;
}

export interface EnrichedProduct {
  spu: string;
  label: string;
  count: number;
  prevCount: number;
  growthRate: number | null;
  /** 站点生产库回查的产品名称（PROD_MYSQL 启用且命中时填充，否则缺省） */
  productName?: string;
  /** 站点生产库回查的产品分类（PROD_MYSQL 启用且命中时填充，否则缺省）；值为一级分类名（JOIN goodstype_web 取 name_cn/name_en） */
  productCategory?: string;
}

export interface TopProductsResult {
  totalProducts: number;
  hasYoY: boolean;
  items: EnrichedProduct[];
  /** 实际使用的候选池大小（可能因凑不够 outN 而被自动扩展） */
  poolUsed: number;
}

export type ProductSortBy = 'count' | 'growthRate';

export interface BuildTopProductsOpts {
  cur: Map<string, ProductCount>;
  prev: Map<string, ProductCount>;
  /** 候选池大小：当前区间按引用篇数取前 topN 货号参与计算。默认 30（可放宽 50/100）。 */
  topN?: number;
  /** 最终输出条数。默认 15。 */
  outN?: number;
  /** 候选池自动扩展上限：过滤后合格数仍不足 outN 时翻倍 topN 重试，直到命中 outN 或触及该上限。默认 300。 */
  maxPool?: number;
  /** 最终排序键：count=按引用篇数；growthRate=按同比增长率。默认 count。 */
  sortBy?: ProductSortBy;
}

/**
 * 统计某 brand+year+区间内的产品引用：逐行解析 zlw_papers.products(JSON 数组)，
 * 按 goodsSpu 聚合篇数，保留 goodsLabel（英文商品名）。
 */
export function getRangeProductCounts(
  brand: string,
  year: number,
  startMonth: number,
  endMonth: number,
): Map<string, ProductCount> {
  const rows = reportDb
    .prepare('SELECT products FROM zlw_papers WHERE brand=? AND year=? AND month BETWEEN ? AND ? AND deleted_at IS NULL')
    .all(brand, year, startMonth, endMonth) as Array<{ products: string | null }>;

  const map = new Map<string, ProductCount>();
  for (const r of rows) {
    if (!r.products) continue;
    let arr: Array<Record<string, unknown>>;
    try {
      arr = JSON.parse(r.products) as Array<Record<string, unknown>>;
    } catch {
      continue;
    }
    for (const p of arr) {
      const spu = typeof p.goodsSpu === 'string' ? p.goodsSpu : '';
      if (!spu) continue;
      const label = typeof p.goodsLabel === 'string' ? p.goodsLabel : '';
      const cur = map.get(spu);
      if (cur) cur.count++;
      else map.set(spu, { spu, label, count: 1 });
    }
  }
  return map;
}

/**
 * 板块 5 产品引用 Top 计算（路由 / overview 共用）：
 *  1. 当前区间按引用篇数取前 topN 货号（默认 30，可放宽 50/100）；
 *  2. 查上一年同区间同批货号计数，算同比增长率；
 *  3. **先过滤**负增长（growthRate < 0）及无去年同期基线的新品（growthRate === null）；
 *  4. 再按 sortBy（默认 count）降序取前 outN（默认 15）。
 *
 * 第 3 步过滤后若合格数不足 outN（例如 topN=30 里大量负增长），自动翻倍候选池重试，
 * 直到命中 outN 或触及 maxPool（默认 300），尽量凑够 15 条合格数据；仍不足则返回实际能凑到的条数。
 *
 * 若无任何去年同期基线（单年部署），跳过增长率过滤、整体按引用篇数降序取前 outN，growthRate 标 null。
 */
export function buildTopProducts(opts: BuildTopProductsOpts): TopProductsResult {
  const topN = opts.topN ?? 30;
  const outN = opts.outN ?? 15;
  const maxPool = opts.maxPool ?? 300;
  const sortBy = opts.sortBy ?? 'count';

  let pool = topN;
  while (true) {
    // 候选池：当前区间按引用篇数取前 pool 货号
    const topCur = [...opts.cur.values()].sort((a, b) => b.count - a.count).slice(0, pool);

    const enriched: EnrichedProduct[] = topCur.map((it) => {
      const prevCount = opts.prev.get(it.spu)?.count ?? 0;
      const growthRate = prevCount > 0 ? round(((it.count - prevCount) / prevCount) * 100) : null;
      return { spu: it.spu, label: it.label, count: it.count, prevCount, growthRate };
    });

    const hasYoY = enriched.some((it) => it.growthRate !== null);

    // ③ 先过滤：负增长 / 无基线一律剔除（排序前过滤）
    const valid = hasYoY
      ? enriched.filter((it) => it.growthRate !== null && it.growthRate >= 0)
      : enriched;

    // 合格数已够 / 候选池已覆盖全部产品 / 已触顶 → ④ 按 sortBy 排序取前 outN
    if (valid.length >= outN || pool >= maxPool || pool >= opts.cur.size) {
      // 无同比基线时只能按数量排（增长率不可比）
      const key: ProductSortBy = hasYoY ? sortBy : 'count';
      const sorted = key === 'growthRate'
        ? [...valid].sort((a, b) => (b.growthRate ?? 0) - (a.growthRate ?? 0))
        : [...valid].sort((a, b) => b.count - a.count);
      return { totalProducts: opts.cur.size, hasYoY, items: sorted.slice(0, outN), poolUsed: pool };
    }

    // 合格数不足 → 翻倍候选池重试（受 maxPool 限制）
    pool = Math.min(maxPool, pool * 2);
  }
}

/**
 * 板块 5 站点差异：按 site 解析连接、回查该站点生产库，补全产品「名称 / 分类」。
 *
 * 文献/统计按 brand 共享，但产品名称/分类是站点级数据（知了窝 API 不返回），故在此只读回查。
 * 字段来源（需求文档「产品引用版块」+ 生产库 information_schema 实测）：
 *   - 主表 = <dbPrefix>product_main（主键 catid，与 spu 对应）
 *   - 产品名称 = 主表 title_c（中文站）/ title（英文站），按 locale 取
 *   - 产品分类 = 主表 sort_i（一级分类 ID）→ LEFT JOIN <dbPrefix>goodstype_web ON goodstypeid = sort_i，
 *     按站点 locale 取 name_cn（中文站）/ name_en（英文站），即分类文字（需求文档写「直接用 sort_i」，此处转文字展示）
 * - 未启用 PROD_MYSQL / 缺凭据 / 出错 → 原样返回 items（仅 goodsLabel），绝不阻断响应。
 * - 连接参数按站点解析（env.prodMysqlForSite）：两品牌站点账号密码各异也能正确对接。
 */
// 生产库表名/列名已由 information_schema 实测确认（2026-09-08）。
const productMetaTable = (dbPrefix: string): string => `${dbPrefix}product_main`;
const productCatTable = (dbPrefix: string): string => `${dbPrefix}goodstype_web`;
// 产品名按 locale 取：中文站 title_c，英文站 title（cn/en 主表列名不同；实测 procellcn/elabcn 用 title_c，pricella/elabcom 用 title）
const productNameCol = (locale: 'cn' | 'en'): string => (locale === 'en' ? 'title' : 'title_c');
// 分类名按 locale 取：中文站 name_cn，英文站 name_en（goodstype_web 两列均在）
const productCatNameCol = (locale: 'cn' | 'en'): string => (locale === 'en' ? 'name_en' : 'name_cn');

export async function enrichProductsWithMeta(
  items: EnrichedProduct[],
  site: ResolvedSite,
): Promise<EnrichedProduct[]> {
  if (!prodMysqlEnabledForSite(site) || items.length === 0) return items;
  const db = await getProdMysql(site);
  if (!db) return items;
  try {
    // 表名/列名来自本项目 SITES 配置（可信、非用户输入）；spu 列表参数化绑定防注入
    const table = productMetaTable(site.dbPrefix);
    // items.spu 来自知了窝 goodsSpu（产品目录编号，如 "CL-0233"），对应 product_main.`cat` 列（varchar），
    // **不**对应 `catid`（数值主键，如 70858）。故 WHERE 与 SELECT 都按 `cat` 列匹配/返回，
    // 使 Map 主键与 items[i].spu 字符串对齐（之前用 catid 导致 "CL-0233" 等目录编号全不匹配，enrichment 静默全空）。
    // 产品名：product_main.title_c(cn)/title(en) 按 locale 取。
    // 分类：product_main.sort_i（一级分类 ID）LEFT JOIN goodstype_web.goodstypeid 取分类文字（name_cn/name_en）。
    const nameCol = productNameCol(site.locale);
    const catNameCol = productCatNameCol(site.locale);
    const catTable = productCatTable(site.dbPrefix);
    const rows = await db.query<{ spu: string; productName: string | null; productCategory: string | null }>(
      `SELECT p.cat AS spu, p.${nameCol} AS productName, g.${catNameCol} AS productCategory ` +
        `FROM ${table} p LEFT JOIN ${catTable} g ON g.goodstypeid = p.sort_i ` +
        `WHERE p.cat IN (?)`,
      [items.map((i) => i.spu)],
    );
    const meta = new Map(rows.map((r) => [r.spu, r]));
    return items.map((i) => {
      const m = meta.get(i.spu);
      return m ? { ...i, productName: m.productName ?? undefined, productCategory: m.productCategory ?? undefined } : i;
    });
  } catch (e) {
    console.warn(
      `[products] prod-mysql 产品元数据 enrichment 失败，降级为仅 goodsLabel：${(e as Error).message}`,
    );
    return items;
  }
}
