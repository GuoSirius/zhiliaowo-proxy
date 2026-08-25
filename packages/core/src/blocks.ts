// zhiliaowo-core — 区块注册表（管理后台据此动态渲染录入表单）
import type { BlockType } from './types';

export interface BlockMeta {
  type: BlockType;
  label: string; // 管理后台显示名
  defaultProps: unknown; // 新建区块时的默认数据
  useTheme: boolean; // 是否套用品牌主题色
  dataSource?: string; // 对应《知了窝 H5 数据契约》的数据源（可空=手动录入）
}

export const BLOCK_REGISTRY: BlockMeta[] = [
  { type: 'BrandHeader', label: '品牌头', defaultProps: { logoUrl: '', slogan: '' }, useTheme: false },
  { type: 'TitleBar', label: '大标题', defaultProps: { title: '', subtitle: '' }, useTheme: false },
  { type: 'StatCardGroup', label: '核心数据卡', defaultProps: { cards: [] }, useTheme: true, dataSource: 'brand/statistics' },
  { type: 'BarChart', label: '柱状图', defaultProps: { title: '', points: [] }, useTheme: true, dataSource: 'brand/chart/paper_year' },
  { type: 'QuarterGrid', label: '季度/分类数据', defaultProps: { items: [] }, useTheme: true },
  { type: 'SummaryList', label: '小结列表', defaultProps: { items: [] }, useTheme: false },
  { type: 'PaperListBlock', label: '文献列表', defaultProps: { papers: [] }, useTheme: false, dataSource: 'list/brand/paper' },
  { type: 'ArticleBlock', label: '文献解析', defaultProps: { paper: null }, useTheme: false, dataSource: 'list/brand/paper' },
  { type: 'KeywordTags', label: '关键词标签', defaultProps: { tags: [] }, useTheme: false },
  { type: 'ProductCard', label: '产品推荐', defaultProps: { products: [] }, useTheme: false },
  { type: 'BrandFooter', label: '页脚', defaultProps: { contact: {}, qrUrl: '' }, useTheme: false },
];

export function getBlockMeta(type: BlockType): BlockMeta | undefined {
  return BLOCK_REGISTRY.find((b) => b.type === type);
}
