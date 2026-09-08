# @zhiliaowo/admin — 管理后台

管理后台前端（Vue 3 + Vite + UnoCSS + Pinia），位于 monorepo 的 `apps/admin`。

## 当前状态（重要）

> ⚠️ 2026-09 起，**H5 生成器子系统已整体移除**（`apps/h5/`、`apps/proxy/src/h5/`、`apps/proxy/data/h5.db`）。
>
> 本后台原本是 **H5 文档的管理台**（调用 proxy 的 `/api/h5` 做 CRUD + 渲染海报文档）。
> 现在后端 `/api/h5` 已不存在，**列表 / 编辑器等页面会 404**。
>
> 按约定该目录**暂时保留**，下一步改造为管理 **proxy 海报数据服务**的后台。

## 现状职责（改造前）

- `src/api/h5.ts` — 调 `zhiliaowo-proxy` 的 `/api/h5`（该接口已随 h5 模块移除）
- `src/stores/h5.ts` — Pinia：H5 草稿状态
- `src/views/` — 列表（ListView）/ 编辑器（EditorView）
- `src/components/` — 区块编辑器（BlockEditor）、JSON 字段（JsonField）

## 依赖

- `@zhiliaowo/core` — 共享类型（`H5Doc` / `BrandTheme` / `BlockType`）与区块注册表
- 后端 API 通过 vite `proxy` 转发到 `zhiliaowo-proxy`（默认 `:3000`）

## 开发

```bash
npm run dev:admin   # 或 npm -w @zhiliaowo/admin dev
```

## 后续改造方向

改为管理 proxy 的海报数据服务，候选页面：

| 页面 | 依赖接口 | 说明 |
|---|---|---|
| 同步状态总览 | `GET /api/v1/:site/report/meta` | 各品牌 / 各年份同步进度与数据量 |
| 手动触发同步 | `POST /api/v1/:site/report/refresh` | 需 `x-admin-token`（`ADMIN_TOKEN`） |
| 关键词 / 期刊配置 | `src/config/hotspots/*.json`、`journals/*.json` | 热点与重点期刊名单维护 |
| 品牌配置 | `src/config/brands.ts` | 多品牌 appId 映射 |

改造时 `src/api/h5.ts`、`src/stores/h5.ts` 可直接替换；若届时不再需要 `H5Doc` / `BrandTheme` 等类型，
可同步清理 `@zhiliaowo/core` 中的对应定义（当前 core 消费者只剩本后台）。
