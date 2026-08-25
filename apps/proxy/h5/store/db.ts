import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const DB_PATH = process.env.H5_DB_PATH ?? join(process.cwd(), 'data', 'h5.db');
mkdirSync(dirname(DB_PATH), { recursive: true });

/** SQLite 单例（better-sqlite3，同步 API） */
export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

/** 启动时建表（幂等） */
export function migrate(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS h5_docs (
      id           TEXT PRIMARY KEY,
      title        TEXT NOT NULL,
      brand_id     TEXT NOT NULL,
      status       TEXT NOT NULL DEFAULT 'draft',
      template_id  TEXT,
      meta         TEXT NOT NULL DEFAULT '{}',
      doc          TEXT NOT NULL,
      created_at   TEXT NOT NULL,
      updated_at   TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_h5_docs_status ON h5_docs(status);
    CREATE INDEX IF NOT EXISTS idx_h5_docs_brand ON h5_docs(brand_id);

    CREATE TABLE IF NOT EXISTS h5_brands (
      brand_key TEXT PRIMARY KEY,
      name      TEXT NOT NULL,
      theme     TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS h5_templates (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      doc         TEXT NOT NULL,
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL
    );
  `);
}
