// 管理后台 —— H5 生成器 API 客户端
import type { H5Doc, BrandTheme, BlockType, PaperItem } from '@zhiliaowo/core';

export const API_BASE = (import.meta.env.VITE_API_BASE as string) || 'http://localhost:3000';

/**
 * 生成 UUID v4。
 * 注意：crypto.randomUUID() 仅在「安全上下文」可用（https 或 localhost）。
 * 通过局域网 IP + http 访问时页面非安全上下文，randomUUID 为 undefined 会抛错，
 * 故此处降级到 getRandomValues / Math.random，保证任意访问方式都能生成 id。
 */
export function uuid(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  if (c && typeof c.getRandomValues === 'function') {
    const b = new Uint8Array(16);
    c.getRandomValues(b);
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const h = Array.from(b, (x) => x.toString(16).padStart(2, '0'));
    return `${h.slice(0, 4).join('')}-${h.slice(4, 6).join('')}-${h.slice(6, 8).join('')}-${h.slice(8, 10).join('')}-${h.slice(10, 16).join('')}`;
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

interface Envelope<T> {
  code: number;
  message: string;
  data: T | null;
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  const j = (await r.json()) as Envelope<T>;
  if (j.code !== 200) throw new Error(j.message || `HTTP ${r.status}`);
  return j.data as T;
}

export interface H5Summary {
  id: string;
  title: string;
  brandId: string;
  status: 'draft' | 'published';
  meta: { period?: string; author?: string };
  createdAt: string;
  updatedAt: string;
}

export function listH5(q: Record<string, string> = {}) {
  const qs = new URLSearchParams(q).toString();
  return req<{ items: H5Summary[]; total: number; page: number; pageSize: number }>(
    `/api/h5${qs ? '?' + qs : ''}`,
  );
}
export const getH5 = (id: string) => req<H5Doc>(`/api/h5/${id}`);
export const createH5 = (input: unknown) =>
  req<H5Doc>(`/api/h5`, { method: 'POST', body: JSON.stringify(input) });
export const updateH5 = (id: string, patch: unknown) =>
  req<H5Doc>(`/api/h5/${id}`, { method: 'PUT', body: JSON.stringify(patch) });
export const deleteH5 = (id: string) => req<null>(`/api/h5/${id}`, { method: 'DELETE' });
export const duplicateH5 = (id: string) =>
  req<H5Doc>(`/api/h5/${id}/duplicate`, { method: 'POST' });
export const publishH5 = (id: string) =>
  req<H5Doc>(`/api/h5/${id}/publish`, { method: 'POST' });

export const listBrands = () => req<BrandTheme[]>('/api/h5/brands');

/** 导出下载链接（直接新开标签 / 触发下载） */
export function exportH5Url(id: string, format: 'html' | 'png' | 'vue'): string {
  return `${API_BASE}/api/h5/${id}/export?format=${format}`;
}

export function proxyOpenApi(action: string, params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  return req(`/api/h5/proxy/${action}${qs ? '?' + qs : ''}`);
}

function emptyPaper(): PaperItem {
  return {
    id: uuid(),
    title: '文献标题',
    journal: '期刊名',
    pubTime: new Date().toISOString().slice(0, 10),
    factor: 0,
    authors: '',
    cnFields: [],
    products: [],
  };
}

/** 新建区块的默认 props（编排面板用） */
export function createBlock(type: BlockType): { type: BlockType; id: string; props: any; visible?: boolean } {
  const id = uuid();
  let props: any = {};
  switch (type) {
    case 'BrandHeader':
      props = { logoUrl: '', slogan: '' };
      break;
    case 'TitleBar':
      props = { title: '标题', subtitle: '' };
      break;
    case 'StatCardGroup':
      props = { cards: [{ label: '指标', value: 0, unit: '', trend: 0 }] };
      break;
    case 'BarChart':
      props = { title: '柱状图', points: [{ name: '2023', value: 10 }, { name: '2024', value: 20 }] };
      break;
    case 'QuarterGrid':
      props = {
        items: [
          { label: '项 1', value: 0 },
          { label: '项 2', value: 0 },
          { label: '项 3', value: 0 },
          { label: '项 4', value: 0 },
        ],
      };
      break;
    case 'SummaryList':
      props = { items: [{ icon: '•', text: '要点一' }] };
      break;
    case 'PaperListBlock':
      props = { papers: [], max: 5 };
      break;
    case 'ArticleBlock':
      props = { paper: emptyPaper(), abstract: '' };
      break;
    case 'KeywordTags':
      props = { tags: ['关键词1', '关键词2'] };
      break;
    case 'ProductCard':
      props = { products: [{ goodsLabel: '产品名' }] };
      break;
    case 'BrandFooter':
      props = { contact: {}, qrUrl: '' };
      break;
  }
  return { type, id, props, visible: true };
}

export const BLOCK_TYPES: BlockType[] = [
  'BrandHeader',
  'TitleBar',
  'StatCardGroup',
  'BarChart',
  'QuarterGrid',
  'SummaryList',
  'PaperListBlock',
  'ArticleBlock',
  'KeywordTags',
  'ProductCard',
  'BrandFooter',
];
