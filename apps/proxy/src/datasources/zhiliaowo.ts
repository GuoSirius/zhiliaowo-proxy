import { resolveBrand, type ResolvedBrand } from '../config/brands.js';
import { ApiError } from '../models/types.js';
import { env } from '../shared/env.js';
import type { Cache } from '../shared/cache.js';
import type {
  BrandStatistics,
  CiteStat,
  CountSeries,
  GoodsCiteNum,
  PaperList,
} from '../models/types.js';

const API_BASE = env.zhiliaowo.apiBase;

/** 默认缓存时长（秒）：文献数据变化慢，缓存 1 小时足够 */
const DEFAULT_TTL = 3600;

/**
 * 知了窝开放 API 客户端
 * 职责：拼 URL（brand/appId/timestamp）+ fetch + 缓存 + 统一错误处理。
 * 知了窝鉴权为「appId + 当前时间戳」，无签名，故 timestamp 由本服务实时生成。
 */
export class ZhiliaowoClient {
  constructor(
    private readonly cache: Cache,
    private readonly defaultTtl = DEFAULT_TTL,
  ) {}

  /**
   * 通用请求：缓存命中直接返回，否则请求上游并回填缓存。
   * @param bypassCache 为 true 时强制打上游、不读不写缓存（同步全量拉取用，确保拿到最新数据而非陈旧缓存）
   */
  private async request<T>(
    path: string,
    brand: ResolvedBrand,
    query: Record<string, string> = {},
    ttl = this.defaultTtl,
    bypassCache = false,
  ): Promise<T> {
    const url = new URL(`${API_BASE}${path}`);
    url.searchParams.set('brand', brand.brand);
    url.searchParams.set('appId', brand.appId);

    // 缓存键只由业务参数构成：不含实时 timestamp，否则每请求都 miss、缓存层形同虚设（§1 修复）
    const cacheKey = `zlw:${brand.key}:${path}?${new URLSearchParams(query).toString()}`;
    if (!bypassCache) {
      const cached = await this.cache.get<T>(cacheKey);
      if (cached !== undefined) return cached;
    }

    // timestamp 仅用于知了窝鉴权，放进 fetch URL，绝不进 cacheKey
    url.searchParams.set('timestamp', String(Date.now()));
    for (const [k, v] of Object.entries(query)) {
      if (v !== '') url.searchParams.set(k, v);
    }

    let resp: Response;
    try {
      resp = await fetch(url.toString(), {
        headers: { 'User-Agent': 'zhiliaowo-proxy/0.1' },
      });
    } catch (e) {
      throw new ApiError(502, `zhiliaowo upstream unreachable: ${(e as Error).message}`);
    }

    if (!resp.ok) {
      throw new ApiError(502, `zhiliaowo upstream http ${resp.status}`);
    }

    const json = (await resp.json()) as { code: number; msg: string; result: T };
    if (json.code !== 200) {
      throw new ApiError(502, `zhiliaowo code=${json.code} msg=${json.msg}`);
    }

    if (!bypassCache) {
      await this.cache.set(cacheKey, json.result, ttl);
    }
    return json.result;
  }

  /** 2.1 获取品牌的文献统计数据 */
  statistics(brand: ResolvedBrand) {
    return this.request<BrandStatistics>('/brand/statistics', brand);
  }

  /** 2.2 根据品牌和 SPU 获取文献引用概况 */
  citeStat(brand: ResolvedBrand, sku: string, ttl?: number) {
    return this.request<CiteStat>('/brand/goods/cite_stat', brand, { sku }, ttl);
  }

  /** 2.3 获取品牌历年文献累计数量 */
  paperSum(brand: ResolvedBrand) {
    return this.request<CountSeries>('/brand/chart/paper_sum', brand);
  }

  /** 2.4 获取品牌年度文献统计数据 */
  paperYear(brand: ResolvedBrand) {
    return this.request<CountSeries>('/brand/chart/paper_year', brand);
  }

  /** 2.5 获取品牌产品的文献引用数量列表 */
  goodsCiteNum(brand: ResolvedBrand, query: Record<string, string> = {}) {
    return this.request<GoodsCiteNum>('/brand/goods/cite_num', brand, query);
  }

  /** 2.6 获取符合条件的品牌文献列表；bypassCache=true 时强制拉取上游最新（同步全量用） */
  brandPapers(
    brand: ResolvedBrand,
    query: Record<string, string> = {},
    opts: { bypassCache?: boolean } = {},
  ) {
    return this.request<PaperList>(
      '/list/brand/paper',
      brand,
      query,
      this.defaultTtl,
      opts.bypassCache,
    );
  }

  /** 2.7 获取符合条件的产品文献列表；bypassCache=true 时强制拉取上游最新 */
  productPapers(
    brand: ResolvedBrand,
    sku: string,
    query: Record<string, string> = {},
    opts: { bypassCache?: boolean } = {},
  ) {
    return this.request<PaperList>(
      '/list/product/paper',
      brand,
      { sku, ...query },
      this.defaultTtl,
      opts.bypassCache,
    );
  }
}

export { resolveBrand };
