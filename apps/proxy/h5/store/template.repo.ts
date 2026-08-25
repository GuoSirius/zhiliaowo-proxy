import { randomUUID } from 'node:crypto';
import { db } from './db.js';
import { H5DocSchema, type H5Doc } from '@zhiliaowo/core';

export interface TemplateSummary {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

interface TplRow {
  id: string;
  name: string;
  doc: string;
  created_at: string;
  updated_at: string;
}

export function listTemplates(): TemplateSummary[] {
  const rows = db.prepare('SELECT id, name, created_at, updated_at FROM h5_templates ORDER BY updated_at DESC').all() as TplRow[];
  return rows.map((r) => ({ id: r.id, name: r.name, createdAt: r.created_at, updatedAt: r.updated_at }));
}

export function getTemplate(id: string): H5Doc | null {
  const row = db.prepare('SELECT * FROM h5_templates WHERE id = ?').get(id) as TplRow | undefined;
  return row ? H5DocSchema.parse(JSON.parse(row.doc)) : null;
}

export function createTemplate(name: string, doc: H5Doc): H5Doc {
  const id = randomUUID();
  const now = new Date().toISOString();
  const stored: H5Doc = { ...doc, id, createdAt: now, updatedAt: now };
  db.prepare('INSERT INTO h5_templates (id, name, doc, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(
    id,
    name,
    JSON.stringify(stored),
    now,
    now,
  );
  return stored;
}

export function deleteTemplate(id: string): void {
  db.prepare('DELETE FROM h5_templates WHERE id = ?').run(id);
}
