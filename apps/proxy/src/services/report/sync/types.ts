// apps/proxy/src/services/report/sync/types.ts —— 同步流程对外契约：进度 SyncProgress / 结果 SyncResult / 表行结构
/** 同步流程对外暴露的进度与结果契约 */

export interface SyncProgress {
  page: number;
  totalPages: number;
  pageItems: number;
  pageMs: number;
  fetched: number;
  total: number;
  pct: number;
  elapsedMs: number;
  etaMs: number;
}

export interface SyncResult {
  brand: string;
  year: number;
  skipped: boolean;
  totalCount: number;
  pages: number;
  pagesFetched: number;
  inserted: number;
  durationMs: number;
  failedPages: number;
  /** 上游实际生效的每页条数（可能小于请求值，见 paper-fetch 的 UPSTREAM_MAX_PAGE_SIZE 注释） */
  effectivePageSize: number;
  /** 并发轮后串行补拉成功的页数 */
  refilledPages: number;
  /** 条数少于满页的页数（上游分页自然结果，仅用于告警） */
  shortPages: number;
  /** 相对上游 totalCount 的缺口条数（0 表示完整） */
  shortfall: number;
}

/** zlw_papers 表的一行（写入形态） */
export interface PaperRecord {
  id: string;
  brand: string;
  year: number;
  month: number;
  pub_time: string;
  doi: string | null;
  title: string | null;
  journal: string | null;
  factor: number | null;
  authors: string | null;
  url: string | null;
  cn_fields: string | null;
  products: string | null;
  raw: string;
  synced_at: string;
}

/** zlw_papers_agg 表的一行（计算形态） */
export interface AggData {
  paper_count: number;
  total_factor: number;
  factor_ge10: number;
  max_factor: number;
  journal_counts: Record<string, number>;
  hotspot_counts: Record<string, number>;
  hotspot_max_if: Record<string, number>;
}
