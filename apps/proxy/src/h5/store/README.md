# src/h5/store — SQLite 持久层

使用 `better-sqlite3`，启动时自动迁移建表：

- `h5_docs` — H5 草稿（整行存 JSON 或按字段拆分，待定）
- `h5_brands` — 品牌主题（BrandTheme）
- `h5_templates` — 模板（区块数组 + 主题）

职责文件：

- `db.ts` — 连接 + 迁移
- `h5.repo.ts` — H5 草稿 CRUD
- `brand.repo.ts` — 品牌主题 CRUD
- `template.repo.ts` — 模板 CRUD
