/**
 * 知了窝开放平台 —— 类型定义
 * 说明：部分字段以「宽松类型 + 索引签名」兜底，待接入真实 appId 联调后按需收紧。
 */

/** 知了窝统一响应包装（所有开放 API 均为此结构） */
export interface ZlwResponse<T> {
  code: number;
  msg: string;
  result: T;
}

/** 2.1 品牌文献统计数据 */
export interface BrandStatistics {
  totalCount: number;
  totalFactor: number;
  maxFactor: number;
  avgFactor: number;
}

/** 2.2 品牌 + SPU 文献引用概况（字段待联调确认，先宽松） */
export type CiteStat = Record<string, unknown>;

/** 2.3 品牌历年累计数量 / 2.4 年度数量 */
export interface CountPoint {
  year: string | number;
  count: number;
  [key: string]: unknown;
}
export type CountSeries = CountPoint[];

/** 2.5 品牌产品文献引用数量列表 */
export interface GoodsCiteNumItem {
  sku: string;
  count: number;
  [key: string]: unknown;
}
export type GoodsCiteNum = GoodsCiteNumItem[];

/** 2.6 / 2.7 文献列表项（字段待联调确认，先宽松） */
export interface PaperItem {
  title?: string;
  authors?: string;
  journal?: string;
  publishYear?: number;
  factor?: number;
  doi?: string;
  url?: string;
  [key: string]: unknown;
}
export interface PaperList {
  list: PaperItem[];
  total: number;
  pageNum: number;
  pageSize: number;
  [key: string]: unknown;
}

/** 业务异常：直接映射到 HTTP 状态码 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
