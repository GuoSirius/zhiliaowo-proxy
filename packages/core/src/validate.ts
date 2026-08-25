// zhiliaowo-core — zod 校验（前后端共用，单一事实源）
import { z } from 'zod';
import { BLOCK_TYPE_VALUES } from './types.js';

export const BrandContactSchema = z.object({
  phone: z.string().optional(),
  email: z.string().optional(),
  wechat: z.string().optional(),
  address: z.string().optional(),
});

export const BrandThemeSchema = z.object({
  brandKey: z.string(),
  name: z.string(),
  logoUrl: z.string(),
  primary: z.string(),
  primaryDark: z.string(),
  gradient: z.string(),
  slogan: z.string(),
  contact: BrandContactSchema,
  qrUrl: z.string(),
  fontFamily: z.string().optional(),
});

// 区块 props 内容各异，统一以 any 校验存在性，具体字段由各区块组件自行约束
export const BlockNodeSchema = z.object({
  type: z.enum(BLOCK_TYPE_VALUES),
  id: z.string(),
  props: z.any(),
  visible: z.boolean().optional(),
});

export const H5DocSchema = z.object({
  id: z.string(),
  title: z.string(),
  templateId: z.string(),
  brandId: z.string(),
  status: z.enum(['draft', 'published']),
  blocks: z.array(BlockNodeSchema),
  theme: BrandThemeSchema,
  meta: z.object({
    period: z.string().optional(),
    author: z.string().optional(),
  }),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/** 新建入参：H5Doc 去掉服务端生成的 id / 时间戳 */
export const H5DocInputSchema = H5DocSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// 数据契约校验
export const StatSummarySchema = z.object({
  totalCount: z.number(),
  totalFactor: z.number(),
  maxFactor: z.number(),
  avgFactor: z.number(),
});

export const SeriesPointSchema = z.object({
  name: z.string(),
  value: z.number(),
});

export const PaperItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  doi: z.string().optional(),
  journal: z.string(),
  pubTime: z.string(),
  factor: z.number(),
  authors: z.string(),
  cnFields: z.array(z.string()).optional(),
  products: z.array(z.any()).optional(),
});
