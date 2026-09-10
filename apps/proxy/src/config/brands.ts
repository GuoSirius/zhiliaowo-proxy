import { ApiError } from '../models/types.js';
import { env } from '../shared/env.js';

export type Locale = 'cn' | 'en';

/**
 * 单 brand 配置（知了窝官方品牌名，与 API 对接）。
 * brand 级数据（文献/统计/聚合）按品牌共享，与语言无关；仅站点展示层（locale/dbPrefix）区分中英文站。
 */
export interface BrandConfig {
  /** 品牌 key（= BRANDS key，如 elabscience） */
  key: string;
  /** 展示名 */
  label: string;
  /** 知了窝标准品牌名（brand 参数值） */
  brand: string;
  /** appId 所在环境变量名（appId 绝不落前端/代码） */
  appIdEnv: string;
}

/** 品牌级目录（供 sync 脚本遍历全部品牌；文献/统计同步按品牌级进行，与站点无关） */
export const BRANDS: Record<string, BrandConfig> = {
  elabscience: {
    key: 'elabscience',
    label: 'Elabscience',
    brand: 'Elabscience',
    appIdEnv: 'ZLIW_ELAB_APPID',
  },
  procell: {
    key: 'procell',
    label: 'Procell',
    brand: 'Procell',
    appIdEnv: 'ZLIW_PROCELL_APPID',
  },
};

export interface ResolvedBrand extends BrandConfig {
  appId: string;
}

/**
 * 站点级配置：在 brand 之上叠加 locale（中/英文站）与 dbPrefix（四站点生产库表前缀）。
 * 路由 /:site 直接吃这四个 key；旧 brand key 作为别名默认指向中文站（见 SITE_ALIASES）。
 */
export interface SiteConfig {
  /** 路由 site：elabcn / elabcom / procellcn / pricella */
  key: string;
  /** 展示名 */
  label: string;
  /** 知了窝标准品牌名（API brand 参数值） */
  brand: string;
  /** 对应 BRANDS key（elabscience / procell） */
  brandKey: string;
  /** 语言：cn / en */
  locale: Locale;
  /** 生产库表前缀：elabcn_ / elabcom_ / procellcn_ / pricella_ */
  dbPrefix: string;
  /** appId 所在环境变量名 */
  appIdEnv: string;
}

export interface ResolvedSite extends SiteConfig {
  appId: string;
}

/**
 * 四站点映射。新增站点只加一项，零业务代码改动：
 * - 文献/统计等 brand 级数据自动共享（resolveBrand 投影到 brandKey）
 * - 展示层差异（locale 热点/结论文案、prod-mysql 产品中文名/分类）经 site.locale / site.dbPrefix 取
 */
export const SITES: Record<string, SiteConfig> = {
  elabcn: {
    key: 'elabcn',
    label: 'Elabscience 中文站',
    brand: 'Elabscience',
    brandKey: 'elabscience',
    locale: 'cn',
    dbPrefix: 'elabcn_',
    appIdEnv: 'ZLIW_ELAB_APPID',
  },
  elabcom: {
    key: 'elabcom',
    label: 'Elabscience Global',
    brand: 'Elabscience',
    brandKey: 'elabscience',
    locale: 'en',
    dbPrefix: 'elabcom_',
    appIdEnv: 'ZLIW_ELAB_APPID',
  },
  procellcn: {
    key: 'procellcn',
    label: '普诺赛 中文站',
    brand: 'Procell',
    brandKey: 'procell',
    locale: 'cn',
    dbPrefix: 'procellcn_',
    appIdEnv: 'ZLIW_PROCELL_APPID',
  },
  pricella: {
    key: 'pricella',
    label: 'Procell Global',
    brand: 'Procell',
    brandKey: 'procell',
    locale: 'en',
    dbPrefix: 'pricella_',
    appIdEnv: 'ZLIW_PROCELL_APPID',
  },
};

/** 兼容别名：旧 brand key → 默认中文站点（历史调用方零改动） */
const SITE_ALIASES: Record<string, string> = {
  elabscience: 'elabcn',
  procell: 'procellcn',
};

/**
 * 站点级解析：返回 locale + dbPrefix + appId。
 * 所有路由的 :site 都经此解析；未知 site 抛 404，缺 appId 抛 500（白名单校验 + 鉴权隔离）。
 */
export function resolveSite(site: string): ResolvedSite {
  const raw = (site ?? '').trim().toLowerCase();
  const key = SITE_ALIASES[raw] ?? raw;
  const cfg = SITES[key];
  if (!cfg) {
    throw new ApiError(404, `unknown site: ${site}`);
  }
  const appId = env.zhiliaowo.appId(cfg.appIdEnv);
  if (!appId) {
    throw new ApiError(500, `missing required env: ${cfg.appIdEnv} for site ${site}`);
  }
  return { ...cfg, appId };
}

/** 品牌级解析（知了窝 API 用：brand 参数 + appId，不含 locale/dbPrefix） */
export function resolveBrand(site: string): ResolvedBrand {
  const s = resolveSite(site);
  return {
    key: s.brandKey,
    label: s.label,
    brand: s.brand,
    appIdEnv: s.appIdEnv,
    appId: s.appId,
  };
}

/** 按知了窝标准品牌名（brand 参数值）反查并解析，默认取该品牌的中文站点 */
export function resolveBrandByName(brand: string): ResolvedBrand {
  const target =
    Object.values(SITES).find((s) => s.brand.toLowerCase() === brand.toLowerCase() && s.locale === 'cn') ??
    Object.values(SITES).find((s) => s.brand.toLowerCase() === brand.toLowerCase());
  if (!target) {
    throw new ApiError(404, `unknown brand: ${brand}`);
  }
  return resolveBrand(target.key);
}

/** 品牌标识解析（CLI 通用）：先当 site key（含四站点/旧别名），再当标准品牌名 */
export function resolveBrandFlexible(input: string): ResolvedBrand {
  const key = (input ?? '').trim().toLowerCase();
  if (SITES[key] || SITE_ALIASES[key]) return resolveBrand(key);
  return resolveBrandByName(input);
}
