import { db } from './db.js';
import { BrandThemeSchema, type BrandTheme } from '@zhiliaowo/core';

export interface BrandRow {
  brand_key: string;
  name: string;
  theme: string;
}

const SEED: BrandTheme[] = [
  {
    brandKey: 'Procell',
    name: '普诺赛',
    logoUrl: '',
    primary: '#0EA5A4',
    primaryDark: '#0B7C7B',
    gradient: 'linear-gradient(135deg, #0EA5A4 0%, #14B8A6 100%)',
    slogan: '专注细胞培养，为科研提供可靠保障',
    contact: { phone: '', email: '', wechat: '', address: '' },
    qrUrl: '',
  },
  {
    brandKey: 'Elabscience',
    name: 'Elabscience',
    logoUrl: '',
    primary: '#2563EB',
    primaryDark: '#1D4ED8',
    gradient: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
    slogan: 'Your Partner in Life Science',
    contact: { phone: '', email: '', wechat: '', address: '' },
    qrUrl: '',
  },
];

export function listBrands(): BrandTheme[] {
  const rows = db.prepare('SELECT * FROM h5_brands ORDER BY brand_key').all() as BrandRow[];
  return rows.map((r) => BrandThemeSchema.parse(JSON.parse(r.theme)));
}

export function getBrand(key: string): BrandTheme | null {
  const row = db.prepare('SELECT * FROM h5_brands WHERE brand_key = ?').get(key) as BrandRow | undefined;
  return row ? BrandThemeSchema.parse(JSON.parse(row.theme)) : null;
}

export function createBrand(theme: unknown): BrandTheme {
  const t = BrandThemeSchema.parse(theme);
  db.prepare('INSERT OR REPLACE INTO h5_brands (brand_key, name, theme) VALUES (?, ?, ?)').run(
    t.brandKey,
    t.name,
    JSON.stringify(t),
  );
  return t;
}

export function updateBrand(key: string, patch: Partial<BrandTheme>): BrandTheme {
  const cur = getBrand(key);
  if (!cur) throw new Error(`brand not found: ${key}`);
  const next = { ...cur, ...patch, brandKey: key } as BrandTheme;
  return createBrand(next);
}

export function deleteBrand(key: string): void {
  db.prepare('DELETE FROM h5_brands WHERE brand_key = ?').run(key);
}

/** 首次启动：表为空时写入内置品牌（procell / elabscience） */
export function seedBrands(): void {
  const count = (db.prepare('SELECT COUNT(*) AS n FROM h5_brands').get() as { n: number }).n;
  if (count === 0) {
    for (const t of SEED) createBrand(t);
  }
}
