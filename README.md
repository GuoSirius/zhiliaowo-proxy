# 知了窝开放平台代理服务（pnpm monorepo）

统一的知了窝数据服务仓库：**后端代理服务 + 管理后台 + 共享类型层** 全部在一个 pnpm workspace 内。

> **2026-09 精简**：原「H5 生成器」子系统已整体移除（`apps/h5/`、`apps/proxy/src/h5/`、`apps/proxy/data/h5.db`）。
> 仓库现在只保留**一个后端服务（proxy）**与**一个管理后台（admin）**，聚焦「知了窝接口代理 + 海报数据接口 + 管理台」。

## 依赖关系

`apps/proxy`、`apps/admin` 为 monorepo 内两个独立 workspace 包；原共享层 `@zhiliaowo/core` 已随 H5 子系统一并移除，当前无共享包。

## 常用命令

```bash
pnpm install                 # 安装全部 workspace 依赖（首次必跑，会触发 better-sqlite3 等原生构建脚本）

pnpm dev                     # 一条命令并行启动全部开发环境（proxy + admin）
# 也可单独启动：
pnpm dev:proxy              # 启动后端（tsx watch，默认 :3000）
pnpm dev:admin              # 启动管理后台（Vite，默认 :5173）

pnpm -r build               # 全部构建
pnpm -r typecheck           # 全部类型检查
pnpm upgrade                # 把所有依赖（含 catalog）升级到最新版本
pnpm release                # 交互式发版（见下方「提交 / 发布 / 版本同步」）
```

## 端口与配置（统一管理）

| 服务 | 变量 | 默认 | 说明 |
| --- | --- | --- | --- |
| 后端 proxy (Hono) | `PORT` | `3000` | 根 `.env` 中配置 |
| 管理后台 admin (Vite) | `DEV_PORT_ADMIN` | `5173` | 根 `.env` 中配置 |
| admin 反向代理目标 | `DEV_PORT_PROXY` | `3000` | 与 `PORT` 保持一致 |

> 两个服务端口**互不冲突**（proxy 3000 / admin 5173），无需改代码即可换端口——改根 `.env` 对应变量后重启即可。
> admin 通过 `VITE_PROXY_BASE`（默认 `http://localhost:3000`）**直连** proxy，不走 Vite 代理；dev 态 proxy 未配 `ALLOWED_ORIGINS` 时回显请求 Origin，跨域天然可用，**生产必须把 admin 源加进 proxy 的 `ALLOWED_ORIGINS`**。

## 依赖管理（pnpm catalog）

共享依赖（vue / pinia / vue-router / vite / typescript / unocss / hono / @hono/node-server / better-sqlite3 / ioredis / dotenv / mysql2 / tsx / @types/better-sqlite3 / node-xlsx / commitlint / changelogen / husky 等）的版本在 **`pnpm-workspace.yaml` 的 `catalog:`** 中集中声明，各包以 `"catalog:"` 引用。升级只需改 `catalog:` 一处再 `pnpm install`；或跑 `pnpm upgrade` 全量升最新。

## 环境变量（单一来源）

所有 app 共用仓库根目录的 **`.env`**（示例见 `.env.example`，已被 `.gitignore` 忽略）。
proxy 通过 `dotenv` 显式加载根 `.env`；admin 的 Vite 经 `envDir` 指向根 `.env`，因此 `VITE_PROXY_BASE` 等前端变量也统一在此配置。

proxy 侧另设 **`apps/proxy/src/shared/env.ts`** 作为环境变量中心：业务代码一律读 `env.server.port`、`env.ai.apiKey` 这类字段，不再散落 `process.env`。配置改名、换默认值、加新项都只改这一处（详见 `apps/proxy/README.md`）。

## 提交 / 发布 / 版本同步

- **提交**：约定式提交（commitlint 门禁），husky 在 `prepare` 时安装。
- **发布**：`pnpm release` 交互式选择 patch / minor / major → 门禁跑 `typecheck` + `test` → changelogen 写中文 CHANGELOG 并 bump **根包**版本 → **自动把 `apps/proxy`、`apps/admin` 的 version 同步为同一新版本**（保证发布一致）→ 提交 + 打 `vX.Y.Z` tag + 推送。
- **版本一致性**：两个包的版本号在每次发布时强制对齐，避免各包版本漂移。

## 管理后台（admin）

Vue 3 + Vite + UnoCSS + Pinia + **vue-router** 的后台，管理 proxy 的海报数据服务。

- **布局**：顶部通栏（标题 + 站点 / 年份 / 截止月筛选）→ 左侧菜单（海报数据 / 同步 / 品牌配置）→ 右侧 `<RouterView>` 内容区。
- **状态**：`stores/app.ts`（Pinia）持有全局筛选（站点 / 年份 / 截止月）与只读站点-品牌配置；顶部通栏与各页面统一读取，避免逐层透传。
- **直连 proxy**：`api/client.ts` 以 `VITE_PROXY_BASE`（默认 `http://localhost:3000`）直连，统一信封解包 + `ApiError`；同步类接口走 `x-admin-token` 头。
- **三个页面**：
  - 海报数据 — 调 `/api/v1/:site/report/overview`（或分板块）展示 6 板块数据；
  - 同步 — `GET /api/v1/:site/report/meta` 看进度，`POST /report/refresh` 手动触发（需 `ADMIN_TOKEN`）；
  - 品牌配置 — `GET /api/v1/config/sites` 只读展示 SITES/BRANDS 快照（appId 只回显 `appIdConfigured`，不返回明文）。
- 详见 `apps/admin/README.md`。

## 演进

proxy / template / core 三仓 → 合并为单 pnpm 仓库（保留 `zhiliaowo-proxy` 仓名与远程）→ 2026-09 移除 H5 生成子系统（含 `@zhiliaowo/core` 整包），收敛为「代理服务 + 管理后台」。
