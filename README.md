# 知了窝开放平台代理服务（pnpm monorepo）

统一的知了窝数据服务仓库：**后端代理服务 + 管理后台 + 共享类型层** 全部在一个 pnpm workspace 内。

> **2026-09 精简**：原「H5 生成器」子系统已整体移除（`apps/h5/`、`apps/proxy/src/h5/`、`apps/proxy/data/h5.db`）。
> 仓库现在只保留**一个后端服务（proxy）**与**一个管理后台（admin）**，聚焦「知了窝接口代理 + 海报数据接口 + 管理台」。

## 目录结构

```
zhiliaowo-proxy/                 # 单体仓库根（同时是 pnpm workspace 根）
├── pnpm-workspace.yaml          # packages: ['apps/*','packages/*']
├── package.json                 # 根：仅编排脚本（dev:proxy / dev:admin / build）
├── .npmrc                       # 走 npmmirror 镜像，适配国内网络
├── apps/
│   ├── proxy/                   # 后端：Hono BFF（代理 + 海报 6 板块数据接口）
│   │   ├── src/config/          # 品牌 / 热点关键词 / 期刊 / 提示词 / 学校清单
│   │   ├── src/datasources/     # 数据访问层：知了窝 API / AI / SQLite 读写 / 分页拉取
│   │   ├── src/models/          # 类型契约层：知了窝响应结构 + 领域模型
│   │   ├── src/services/        # 业务逻辑层：report 6 板块聚合、同步编排（sync/）
│   │   ├── src/shared/          # 基础设施层：env 中心 / 缓存 / HTTP 客户端 / 响应封装 / 通用工具
│   │   ├── src/routes/          # 代理接口 + widget 302 分发 + report 6 板块接口
│   │   ├── src/scripts/         # sync / sync:current / recompute（含定时任务入口）
│   │   └── src/test/            # 单元测试
│   ├── admin/                   # 管理后台（Vue3 + Vite + UnoCSS + Pinia）
└── packages/
    └── core/                    # 共享层 @zhiliaowo/core
        ├── src/                 # types.ts / validate.ts(zod) / blocks.ts / render.ts
        └── specs/               # 历史设计文档（H5 时期产物，仅作追溯，不指导现状）
```

## 依赖关系

`apps/proxy`、`apps/admin` 均通过 `workspace:*` 依赖 `@zhiliaowo/core`。
共享层以 **TypeScript 源码** 形式被消费（Vite alias + tsconfig paths + pnpm 软链），改 core 即全端热更，无需预编译。

## 常用命令

```bash
pnpm install                 # 安装全部 workspace 依赖并软链 core（首次必跑，会触发原生构建脚本）

pnpm dev                     # 一条命令并行启动全部开发环境（proxy + admin）
# 也可单独启动：
pnpm dev:proxy              # 启动后端（tsx watch，默认 :3000）
pnpm dev:admin              # 启动管理后台（:5173，/api 代理到 :3000）

pnpm -r build               # 全部构建
pnpm -r typecheck           # 全部类型检查
pnpm upgrade                # 把所有依赖（含 catalog）升级到最新版本
pnpm release                # 交互式发版（见下方「提交 / 发布 / 版本同步」）
```

## 端口与配置（统一管理）

| 服务 | 变量 | 默认 | 说明 |
| --- | --- | --- | --- |
| 后端 proxy (Hono) | `PORT` | `3000` | 根 `.env` 中配置，admin 的 `/api` 代理指向它 |
| 管理后台 admin (Vite) | `DEV_PORT_ADMIN` | `5173` | 根 `.env` 中配置 |
| admin 反向代理目标 | `DEV_PORT_PROXY` | `3000` | 与 `PORT` 保持一致 |

> 两个服务端口**互不冲突**（proxy 3000 / admin 5173），无需修改代码即可换端口——改根 `.env` 对应变量后重启即可。

## 依赖管理（pnpm catalog）

共享依赖（vue / pinia / vite / typescript / unocss / zod / commitlint / changelogen / husky 等）的版本在 **`pnpm-workspace.yaml` 的 `catalog:`** 中集中声明，各包以 `"catalog:"` 引用。升级只需改 `catalog:` 一处再 `pnpm install`；或跑 `pnpm upgrade` 全量升最新。仅 proxy 专属的运行时依赖（hono / better-sqlite3 / ioredis / puppeteer / dotenv / tsx）保留在 `apps/proxy/package.json`。

## 环境变量（单一来源）

所有 app 共用仓库根目录的 **`.env`**（示例见 `.env.example`，已被 `.gitignore` 忽略）。
proxy 通过 `dotenv` 显式加载根 `.env`；admin 的 Vite 经 `envDir` 指向根 `.env`，因此 `VITE_API_BASE` 等前端变量也统一在此配置。

proxy 侧另设 **`apps/proxy/src/shared/env.ts`** 作为环境变量中心：业务代码一律读 `env.server.port`、`env.ai.apiKey` 这类字段，不再散落 `process.env`。配置改名、换默认值、加新项都只改这一处（详见 `apps/proxy/README.md`）。

## 提交 / 发布 / 版本同步

- **提交**：约定式提交（commitlint 门禁），husky 在 `prepare` 时安装。
- **发布**：`pnpm release` 交互式选择 patch / minor / major → 门禁跑 `typecheck` + `test` → changelogen 写中文 CHANGELOG 并 bump **根包**版本 → **自动把 `apps/proxy`、`apps/admin`、`packages/core` 的 version 同步为同一新版本**（保证发布一致）→ 提交 + 打 `vX.Y.Z` tag + 推送。
- **版本一致性**：三个包的版本号在每次发布时强制对齐，避免各包版本漂移。

## 说明 / 后续

- 后端 `proxy` 当前以 `tsx` 直接跑 TS（含 core 源码）。生产 `node dist/index.js` 需先把 `packages/core` 编译为 JS，或改用 `tsx` 启动。
- **admin 待改造**：它原本是 H5 文档管理台（依赖已移除的 `/api/h5`），目前相关页面会 404；下一步改造为管理 proxy 的海报数据 / 同步 / 品牌配置（详见 `apps/admin/README.md`）。
- 目录演进：proxy / template / core 三仓 → 合并为单 pnpm 仓库（保留 `zhiliaowo-proxy` 仓名与远程）→ 2026-09 移除 H5 生成子系统，收敛为「代理服务 + 管理后台」。
