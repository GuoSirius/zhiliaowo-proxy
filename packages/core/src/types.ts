// zhiliaowo-core — 共享类型契约（前后端共用，单一事实源）
// 区块协议 / H5 文档模型 / 品牌主题 / 数据契约类型

// ---------- 区块协议 ----------

export type BlockType =
  | 'BrandHeader' // 品牌头（Logo + slogan）
  | 'TitleBar' // 大标题
  | 'StatCardGroup' // 核心数据卡（带趋势箭头）
  | 'BarChart' // 柱状图
  | 'QuarterGrid' // 季度/分类数据 2x2
  | 'SummaryList' // 小结列表（图标+文字）
  | 'PaperListBlock' // 文献列表（多篇）
  | 'ArticleBlock' // 文献解析（单篇深度）
  | 'KeywordTags' // 关键词标签
  | 'ProductCard' // 产品推荐
  | 'BrandFooter'; // 联系方式 + 二维码

export interface BlockNode<T = unknown> {
  type: BlockType;
  id: string;
  props: T;
  visible?: boolean;
}

export interface BrandHeaderProps {
  logoUrl: string;
  slogan: string;
}
export interface TitleBarProps {
  title: string;
  subtitle?: string;
}
export interface StatCardGroupProps {
  cards: { label: string; value: number; unit?: string; trend?: number }[];
}
export interface BarChartProps {
  title: string;
  points: SeriesPoint[];
  cumulative?: boolean;
}
export interface QuarterGridProps {
  items: { label: string; value: number }[]; // 2x2 / 1x4
}
export interface SummaryListProps {
  items: { icon: string; text: string }[];
}
export interface PaperListBlockProps {
  papers: PaperItem[];
  max?: number;
}
export interface ArticleBlockProps {
  paper: PaperItem;
  abstract?: string; // 允许手动补充
}
export interface KeywordTagsProps {
  tags: string[]; // 取 PaperItem.cnFields
}
export interface ProductCardProps {
  products: PaperProduct[];
}
export interface BrandFooterProps {
  contact: BrandContact;
  qrUrl: string;
}

// ---------- H5 文档模型 ----------

export interface BrandContact {
  phone?: string;
  email?: string;
  wechat?: string;
  address?: string;
}

export interface BrandTheme {
  brandKey: string; // 必须 = 开放平台 brand 标准名
  name: string; // 展示名，如 "普诺赛"
  logoUrl: string;
  primary: string; // 主色（CSS 变量 --brand-primary）
  primaryDark: string;
  gradient: string; // 头图渐变
  slogan: string;
  contact: BrandContact;
  qrUrl: string; // 底部二维码
  fontFamily?: string;
}

export interface H5Doc {
  id: string; // uuid
  title: string; // H5 标题（内部管理用）
  templateId: string; // 引用模板（可空，空=自由编排）
  brandId: string; // 关联 BrandTheme
  status: 'draft' | 'published';
  blocks: BlockNode[]; // 区块有序数组（渲染顺序）
  theme: BrandTheme;
  meta: { period?: string; author?: string }; // 如 "2026-05 月度"
  createdAt: string;
  updatedAt: string;
}

// ---------- 数据契约类型（来自《知了窝 H5 数据契约》） ----------

export interface StatSummary {
  totalCount: number; // 总文献数量
  totalFactor: number; // 总影响因子
  maxFactor: number; // 最高影响因子
  avgFactor: number; // 平均影响因子
}

export interface SeriesPoint {
  name: string; // 年份
  value: number; // 数量
}

export interface CiteCount {
  name: string; // 货号
  value: number; // 引用数量
}

export interface PaperProduct {
  goodsLabel: string;
  goodsSpu?: string;
  goodsCas?: string;
  goodsUrl?: string;
  target?: string;
  application?: string | null;
  specie?: string;
  cnSpecie?: string | null;
  dilution?: string | null;
  sample?: string;
  cnSample?: string | null;
  paperProductPictureList?: { id: string; picUrl: string; description: string; rawUrl: string }[];
}

export interface PaperItem {
  id: string;
  title: string;
  doi?: string;
  summary?: string | null;
  pmid?: string | null;
  journal: string;
  volume?: string;
  issue?: string;
  page?: string;
  feature?: string; // 期刊封面图 URL
  pubTime: string; // YYYY-MM-DD
  factor: number; // 影响因子
  authors: string;
  authorName?: string; // 一作
  country?: string;
  province?: string;
  city?: string;
  org?: string;
  CorAuthorName?: string; // 通讯作者
  CorCountry?: string;
  CorProvince?: string;
  CorCity?: string;
  CorOrg?: string;
  jcr?: string; // 中科院分区
  level?: string; // L1~L4
  url?: string; // 原文链接
  cnFields?: string[]; // 中图分类
  products?: PaperProduct[];
}
