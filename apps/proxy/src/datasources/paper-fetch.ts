// apps/proxy/src/datasources/paper-fetch.ts —— 文献分页拉取：重试 + 由首页响应推导分页计划（兼容上游 pageSize 硬上限）
import { ZhiliaowoClient } from './zhiliaowo.js';
import type { ResolvedBrand } from '../config/brands.js';
import type { PaperList } from '../models/types.js';
import { sleep } from '../shared/utils.js';
import { env } from '../shared/env.js';

/**
 * 请求时「期望」的每页条数。注意：上游存在硬上限并对超限做静默钳制 ——
 * 实测 2.6 接口 pageSize 上限为 15，传 16/20/100/1000 均被回退为 15，且回显
 * `pageSize=15`、`totalPage=ceil(totalCount/15)`。因此这里传大值只是「尽量多要」，
 * 实际生效值一律以上游回显的 `pageSize` 为准（见 resolvePagePlan），
 * 绝不能用请求的 pageSize 自行计算总页数，否则会严重少拉（曾导致只拉到 1.5% 的数据）。
 */
export const DEFAULT_PAGE_SIZE = env.report.pageSize;

/**
 * 上游 pageSize 硬上限（2026-09-02 实测 Procell/Elabscience 多年度一致为 15）。
 * 仅在响应未回显 pageSize 时作为兜底推断值使用。
 */
export const UPSTREAM_MAX_PAGE_SIZE = 15;

const MAX_RETRY = 3;

/** 拉取单页，失败线性退避重试（400ms × 次数），最终仍失败则抛出 */
export async function fetchPageWithRetry(
  client: ZhiliaowoClient,
  brand: ResolvedBrand,
  year: number,
  pageNum: number,
  pageSize: number,
  bypassCache = true,
): Promise<PaperList> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
    try {
      const res = await client.brandPapers(
        brand,
        {
          year: String(year),
          pageNum: String(pageNum),
          pageSize: String(pageSize),
        },
        { bypassCache },
      );
      return res;
    } catch (e) {
      lastErr = e;
      await sleep(400 * attempt);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

export interface PagePlan {
  /** 上游实际生效的每页条数（回显优先，其次按首页实际条数推断） */
  effectivePageSize: number;
  /** 需要遍历的总页数（上游 totalPage 优先，其次按生效 pageSize 计算） */
  totalPages: number;
  /** 计划来源，便于日志排查 */
  source: 'upstream-echo' | 'inferred-length' | 'fallback-max';
}

/**
 * 由首页响应推导分页计划。
 * 上游 totalPage = ceil(totalCount / 生效 pageSize)，实测自洽可信（末页 7 条、越界页 0 条），
 * 因此优先直接采用，避免本地重算与上游口径不一致。
 */
export function resolvePagePlan(
  first: PaperList,
  requestedPageSize: number,
  totalCount: number,
): PagePlan {
  const echoSize = Number(first.pageSize);
  const len = Array.isArray(first.data) ? first.data.length : 0;

  let effectivePageSize: number;
  let source: PagePlan['source'];
  if (Number.isFinite(echoSize) && echoSize > 0) {
    effectivePageSize = echoSize;
    source = 'upstream-echo';
  } else if (len > 0) {
    // 未回显时以首页实际条数推断，但不超过上游已知硬上限
    effectivePageSize = Math.min(len, UPSTREAM_MAX_PAGE_SIZE);
    source = 'inferred-length';
  } else {
    effectivePageSize = Math.min(requestedPageSize, UPSTREAM_MAX_PAGE_SIZE);
    source = 'fallback-max';
  }

  const echoPages = Number(first.totalPage);
  let totalPages: number;
  if (Number.isFinite(echoPages) && echoPages > 0) {
    totalPages = echoPages;
  } else if (totalCount > 0 && effectivePageSize > 0) {
    totalPages = Math.ceil(totalCount / effectivePageSize);
  } else {
    totalPages = 0; // 空年份（totalCount=0）：无需翻页
  }

  return { effectivePageSize, totalPages, source };
}

/** 第 pn 页应有的条数（末页取余数，其余为满页） */
export function expectedPageSize(
  pn: number,
  totalPages: number,
  totalCount: number,
  pageSize: number,
): number {
  if (pn < totalPages) return pageSize;
  const rest = totalCount - (totalPages - 1) * pageSize;
  return Math.max(1, rest);
}
