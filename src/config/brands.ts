import { ApiError } from '../types.js';

/**
 * 单 brand 配置
 * - brand：知了窝「官方校验通过的品牌名称」，需与对接人确认精确字符串
 * - appIdEnv：该 brand 的 appId 所在环境变量名（appId 绝不落前端/代码）
 */
export interface BrandConfig {
  /** 路由 site key，如 elab */
  key: string;
  /** 展示名 */
  label: string;
  /** 知了窝标准品牌名（brand 参数值） */
  brand: string;
  /** appId 所在环境变量名 */
  appIdEnv: string;
}

/**
 * 多 brand 配置 —— 扩展点
 * 新增 brand：在此加一项 + 在 .env 增加对应的 APPID 即可，零业务代码改动。
 * brand 值需与知了窝后台完全一致（区分大小写），待对接人确认 Elabscience/Procell 的标准名。
 */
export const BRANDS: Record<string, BrandConfig> = {
  elab: {
    key: 'elab',
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

/** 按 site key 解析 brand + 从环境变量取 appId（白名单校验 + 鉴权隔离） */
export function resolveBrand(site: string): ResolvedBrand {
  const cfg = BRANDS[site];
  if (!cfg) {
    throw new ApiError(404, `unknown site: ${site}`);
  }
  const appId = process.env[cfg.appIdEnv];
  if (!appId) {
    throw new ApiError(500, `missing required env: ${cfg.appIdEnv} for site ${site}`);
  }
  return { ...cfg, appId };
}
