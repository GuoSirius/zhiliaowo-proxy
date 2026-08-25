import { randomUUID } from 'node:crypto';
import { db } from './db.js';
import { H5DocInputSchema, type H5Doc } from '@zhiliaowo/core';

export interface H5DocSummary {
  id: string;
  title: string;
  brandId: string;
  status: 'draft' | 'published';
  meta: { period?: string; author?: string };
  createdAt: string;
  updatedAt: string;
}

export interface ListQuery {
  status?: 'draft' | 'published';
  brandId?: string;
  keyword?: string;
  page?: number;
  pageSize?: number;
}

interface DocRow {
  id: string;
  title: string;
  brand_id: string;
  status: 'draft' | 'published';
  template_id: string | null;
  meta: string;
  doc: string;
  created_at: string;
  updated_at: string;
}

function rowToDoc(row: DocRow): H5Doc {
  const d = JSON.parse(row.doc) as Omit<H5Doc, 'id' | 'title' | 'brandId' | 'status' | 'templateId' | 'meta' | 'createdAt' | 'updatedAt'>;
  return {
    ...d,
    id: row.id,
    title: row.title,
    brandId: row.brand_id,
    status: row.status,
    templateId: row.template_id ?? '',
    meta: JSON.parse(row.meta),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToSummary(row: DocRow): H5DocSummary {
  return {
    id: row.id,
    title: row.title,
    brandId: row.brand_id,
    status: row.status,
    meta: JSON.parse(row.meta),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listH5(q: ListQuery = {}): { items: H5DocSummary[]; total: number; page: number; pageSize: number } {
  const page = Math.max(1, q.page ?? 1);
  const pageSize = Math.max(1, q.pageSize ?? 20);
  const where: string[] = [];
  const params: Record<string, unknown> = {};
  if (q.status) {
    where.push('status = @status');
    params.status = q.status;
  }
  if (q.brandId) {
    where.push('brand_id = @brandId');
    params.brandId = q.brandId;
  }
  if (q.keyword) {
    where.push('title LIKE @kw');
    params.kw = `%${q.keyword}%`;
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = (db.prepare(`SELECT COUNT(*) AS n FROM h5_docs ${whereSql}`).get(params) as { n: number }).n;
  const rows = db
    .prepare(`SELECT * FROM h5_docs ${whereSql} ORDER BY updated_at DESC LIMIT @limit OFFSET @offset`)
    .all({ ...params, limit: pageSize, offset: (page - 1) * pageSize }) as DocRow[];
  return { items: rows.map(rowToSummary), total, page, pageSize };
}

export function getH5(id: string): H5Doc | null {
  const row = db.prepare('SELECT * FROM h5_docs WHERE id = ?').get(id) as DocRow | undefined;
  return row ? rowToDoc(row) : null;
}

export function createH5(input: unknown): H5Doc {
  const data = H5DocInputSchema.parse(input);
  const now = new Date().toISOString();
  const id = randomUUID();
  const status = data.status ?? 'draft';
  const doc: H5Doc = {
    ...data,
    id,
    status,
    createdAt: now,
    updatedAt: now,
  };
  db.prepare(
    `INSERT INTO h5_docs (id, title, brand_id, status, template_id, meta, doc, created_at, updated_at)
     VALUES (@id, @title, @brand_id, @status, @template_id, @meta, @doc, @created_at, @updated_at)`,
  ).run({
    id,
    title: doc.title,
    brand_id: doc.brandId,
    status: doc.status,
    template_id: doc.templateId || null,
    meta: JSON.stringify(doc.meta),
    doc: JSON.stringify(doc),
    created_at: now,
    updated_at: now,
  });
  return doc;
}

export function updateH5(id: string, patch: Partial<unknown>): H5Doc {
  const existing = getH5(id);
  if (!existing) throw new Error(`h5 not found: ${id}`);
  const merged = { ...existing, ...(patch as object) } as H5Doc;
  merged.id = id;
  merged.updatedAt = new Date().toISOString();
  db.prepare(
    `UPDATE h5_docs SET title=@title, brand_id=@brand_id, status=@status, template_id=@template_id,
       meta=@meta, doc=@doc, updated_at=@updated_at WHERE id=@id`,
  ).run({
    id,
    title: merged.title,
    brand_id: merged.brandId,
    status: merged.status,
    template_id: merged.templateId || null,
    meta: JSON.stringify(merged.meta),
    doc: JSON.stringify(merged),
    updated_at: merged.updatedAt,
  });
  return merged;
}

export function deleteH5(id: string): void {
  db.prepare('DELETE FROM h5_docs WHERE id = ?').run(id);
}

export function duplicateH5(id: string): H5Doc {
  const src = getH5(id);
  if (!src) throw new Error(`h5 not found: ${id}`);
  return createH5({ ...src, title: `${src.title} (副本)`, status: 'draft' });
}

export function publishH5(id: string): H5Doc {
  return updateH5(id, { status: 'published' } as Partial<unknown>);
}
