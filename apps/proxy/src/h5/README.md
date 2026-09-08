# src/h5 — H5 生成器服务端模块

挂载于 `zhiliaowo-proxy`（Hono），负责 H5 的持久化、缓存、开放平台代理与导出。

## 路由（详见《区块库 API 规范》第 5、6 节）

- `GET  /api/h5` — H5 列表（筛选/分页）
- `POST /api/h5` — 新建
- `GET/PUT/DELETE /api/h5/:id` — 读取/更新/删除
- `POST /api/h5/:id/publish` — 发布（写入缓存）
- `POST /api/h5/:id/export` — 导出 `{ format: 'png'|'html'|'mh5' }`
- `GET  /api/h5/brands` / `/templates` — 品牌主题 / 模板 CRUD
- `GET  /h5/:id` — 分享链接（移动端渲染页托管）

## 子目录

| 目录 | 职责 |
|---|---|
| `store/` | SQLite 持久层（better-sqlite3）：h5_docs / h5_brands / h5_templates |
| `cache/` | 复用 proxy 现成的内存 / Redis 抽象（CACHE_DRIVER 切换） |
| `proxy/` | 代理知了窝开放平台 API（套缓存） |
| `export/` | 服务端导出：Puppeteer 长图 / 静态 HTML（CSS inline） |
| `schemas/` | zod 校验（复用 `@zhiliaowo/core`） |

## 依赖

- `@zhiliaowo/core` — 共享类型与校验
- `better-sqlite3` — 持久化
- `ioredis` — 缓存（可选，与内存无缝切换）
- `puppeteer` — 服务端截图
