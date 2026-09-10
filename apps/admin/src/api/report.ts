import { request } from './client';

// —— 只读配置 ——
export interface SiteConf {
  key: string;
  label: string;
  brand: string;
  brandKey: string;
  locale: 'cn' | 'en';
  dbPrefix: string;
  appIdEnv: string;
  appIdConfigured: boolean;
}

export interface BrandConf {
  key: string;
  label: string;
  brand: string;
  appIdEnv: string;
}

export interface SitesConfig {
  sites: SiteConf[];
  brands: BrandConf[];
}

// —— 海报 6 板块 ——
export interface Metric {
  value: number;
  prevValue: number;
  rate: number | null;
}

export interface Range {
  year: number;
  startMonth: number;
  endMonth: number;
}

export interface FeaturedJournal {
  journal: string;
  count: number;
}

export interface DecadePoint {
  year: number;
  count: number;
  percent: number;
  /** false 表示该年无数据源，count=0 是「没数据」而非「真实 0 篇」 */
  hasData: boolean;
}

export interface QuarterPoint {
  quarter: number;
  label: string;
  year: number;
  count: number;
}

export interface HotspotItem {
  cn: string;
  count: number;
  prevCount: number;
  growthRate: number | null;
  maxIf: number;
}

export interface ProductItem {
  spu: string;
  label: string;
  count: number;
  prevCount: number;
  growthRate: number | null;
  productName?: string;
  productCategory?: string;
}

export interface TopJournal {
  journal: string;
  maxIf: number;
  count: number;
}

export interface Institution {
  name: string;
  source: string;
}

export interface Overview {
  range: Range;
  summary: {
    range: Range;
    totalPapers: number;
    featuredJournals: FeaturedJournal[];
  };
  core: {
    range: Range;
    totalPapers: Metric;
    totalIf: Metric;
    ifGe10: Metric;
    avgIf: Metric;
    maxIf: Metric;
    cumulative: {
      range: Range;
      totalPapers: number;
      prevTotalPapers: number;
      totalIf: number;
      prevTotalIf: number;
      maxIf: number;
      avgIf: number;
    };
  };
  trend: {
    year: number;
    range: { startMonth: number; endMonth: number };
    decadeMode: string;
    decade: DecadePoint[];
    quarters: QuarterPoint[];
  };
  hotspots: {
    range: Range;
    totalPapers: number;
    totalClassified: number;
    aiFallback: boolean;
    sortBy: string;
    topHotspots: HotspotItem[];
  };
  products: {
    range: Range;
    totalProducts: number;
    hasYoY: boolean;
    poolUsed: number;
    items: ProductItem[];
  };
  conclusion: {
    range: Range;
    aiEnabled: boolean;
    topJournals: TopJournal[];
    institutions: Institution[];
    conclusion: string | null;
  };
}

// —— 同步 ——
export interface SyncState {
  brand: string;
  year: number;
  total_count: number | null;
  last_synced_at: string | null;
  status: string | null;
  duration_ms: number | null;
  localPapers: number;
}

export interface MetaResp {
  brand: string;
  syncStates: SyncState[];
}

export interface RefreshResp {
  brand: string;
  year: number;
  force: boolean;
  /** true 表示复用了正在进行的同步，未二次打上游 */
  deduplicated: boolean;
  result: unknown;
}

const enc = (v: string | number) => encodeURIComponent(String(v));

export const getSitesConfig = () => request<SitesConfig>('/api/v1/config/sites');

export const getOverview = (site: string, year: number, endMonth: number) =>
  request<Overview>(
    `/api/v1/${enc(site)}/report/overview?year=${enc(year)}&startMonth=1&endMonth=${enc(endMonth)}`,
  );

export const getMeta = (site: string) => request<MetaResp>(`/api/v1/${enc(site)}/report/meta`);

export const refresh = (site: string, year: number, force: boolean, token: string) =>
  request<RefreshResp>(`/api/v1/${enc(site)}/report/refresh`, {
    method: 'POST',
    body: { year, force },
    token,
  });
