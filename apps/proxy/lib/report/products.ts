import { reportDb } from './db.js';

export interface ProductCount {
  spu: string;
  label: string;
  count: number;
}

/**
 * 统计某 brand+year+区间内的产品引用：逐行解析 zlw_papers.products(JSON 数组)，
 * 按 goodsSpu 聚合篇数，保留 goodsLabel（英文商品名）。
 */
export function getRangeProductCounts(
  brand: string,
  year: number,
  startMonth: number,
  endMonth: number,
): Map<string, ProductCount> {
  const rows = reportDb
    .prepare('SELECT products FROM zlw_papers WHERE brand=? AND year=? AND month BETWEEN ? AND ?')
    .all(brand, year, startMonth, endMonth) as Array<{ products: string | null }>;

  const map = new Map<string, ProductCount>();
  for (const r of rows) {
    if (!r.products) continue;
    let arr: Array<Record<string, unknown>>;
    try {
      arr = JSON.parse(r.products) as Array<Record<string, unknown>>;
    } catch {
      continue;
    }
    for (const p of arr) {
      const spu = typeof p.goodsSpu === 'string' ? p.goodsSpu : '';
      if (!spu) continue;
      const label = typeof p.goodsLabel === 'string' ? p.goodsLabel : '';
      const cur = map.get(spu);
      if (cur) cur.count++;
      else map.set(spu, { spu, label, count: 1 });
    }
  }
  return map;
}
