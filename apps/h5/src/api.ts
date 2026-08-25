// H5 展示前端 —— 数据获取
import type { H5Doc } from '@zhiliaowo/core';

export const API_BASE = (import.meta.env.VITE_API_BASE as string) || 'http://localhost:3000';

export async function fetchH5(id: string): Promise<H5Doc | null> {
  const r = await fetch(`${API_BASE}/api/h5/${encodeURIComponent(id)}`);
  if (!r.ok) return null;
  const j = (await r.json()) as { code: number; data: H5Doc | null };
  return j.data;
}
