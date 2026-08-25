# 知了窝 H5 生成器（pnpm monorepo）

统一的 H5 生成器仓库：**后端代理 + 管理后台 + 展示页 + 共享层** 全部在一个 pnpm workspace 内。

## 目录结构

```
zhiliaowo-proxy/                 # 单体仓库根（同时是 pnpm workspace 根）
├── pnpm-workspace.yaml          # packages: ['apps/*','packages/*']
├── package.json                 # 根：仅编排脚本（dev:proxy / dev:admin / dev:h5 / build）
├── .npmrc                       # 走 npmmirror 镜像，适配国内网络
├── apps/
│   ├── proxy/                   # 后端：Hono BFF（原 zhiliaowo-proxy）+ h5 管理模块
│   │   ├── index.ts             # 服务入口
│   │   ├── lib/ routes/ config/ # 原代理能力（多 brand、缓存抽象）
│   │   └── h5/                  # H5 文档 CRUD / 发布 / 导出 / 对接知了窝开放 API
│   ├── admin/                   # 管理后台（Vue3 + Vite + UnoCSS + Pinia）
│   └── h5/                      # 展示页（Vue3 + Vite + UnoCSS）
└── packages/
    └── core/                    # 共享层 @zhiliaowo/core
        ├── src/                 # types.ts / validate.ts(zod) / blocks.ts
        └── specs/               # 《知了窝 H5 数据契约》《区块库 API 规范》
```

## 依赖关系

`apps/proxy`、`apps/admin`、`apps/h5` 均通过 `workspace:*` 依赖 `@zhiliaowo/core`。
共享层以 **TypeScript 源码** 形式被消费（Vite alias + tsconfig paths + pnpm 软链），改 core 即全端热更，无需预编译。

## 常用命令

```bash
pnpm install                 # 安装全部 workspace 依赖并软链 core（首次必跑，会触发原生构建脚本）

pnpm dev                     # 一条命令并行启动全部开发环境（proxy + admin + h5）
# 也可单独启动：
pnpm dev:proxy              # 启动后端（tsx watch，默认 :3000）
pnpm dev:admin              # 启动管理后台（:5173，/api 代理到 :3000）
pnpm dev:h5                 # 启动展示页（:5174）

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
| 展示页 h5 (Vite) | `DEV_PORT_H5` | `5174` | 根 `.env` 中配置 |
| admin 反向代理目标 | `DEV_PORT_PROXY` | `3000` | 与 `PORT` 保持一致 |

> 三个服务端口**互不冲突**（proxy 3000 / admin 5173 / h5 5174），无需修改代码即可换端口——改根 `.env` 对应变量后重启即可。

## 依赖管理（pnpm catalog）

共享依赖（vue / pinia / vite / typescript / unocss / zod / commitlint / changelogen / husky 等）的版本在 **`pnpm-workspace.yaml` 的 `catalog:`** 中集中声明，各包以 `"catalog:"` 引用。升级只需改 `catalog:` 一处再 `pnpm install`；或跑 `pnpm upgrade` 全量升最新。仅 proxy 专属的运行时依赖（hono / better-sqlite3 / ioredis / puppeteer / dotenv / tsx）保留在 `apps/proxy/package.json`。

## 环境变量（单一来源）

所有 app 共用仓库根目录的 **`.env`**（示例见 `.env.example`，已被 `.gitignore` 忽略）。proxy 通过 `dotenv` 显式加载根 `.env`；admin / h5 的 Vite 经 `envDir` 指向根 `.env`，因此 `VITE_API_BASE` 等前端变量也统一在此配置。

## 提交 / 发布 / 版本同步

- **提交**：约定式提交（commitlint 门禁），husky 在 `prepare` 时安装。
- **发布**：`pnpm release` 交互式选择 patch / minor / major → 门禁跑 `typecheck` + `test` → changelogen 写中文 CHANGELOG 并 bump **根包**版本 → **自动把 `apps/proxy`、`apps/admin`、`apps/h5`、`packages/core` 的 version 同步为同一新版本**（保证发布一致）→ 提交 + 打 `vX.Y.Z` tag + 推送。
- **版本一致性**：五个包的版本号在每次发布时强制对齐，避免各包版本漂移。

## 说明 / 后续

- 后端 `proxy` 当前以 `tsx` 直接跑 TS（含 core 源码）。生产 `node dist/index.js` 需先把 `packages/core` 编译为 JS，或改用 `tsx` 启动——待接入真实导出（PNG / 静态 HTML）时一并定。
- 目录演进：proxy / template / core 三仓 → 合并为单 pnpm 仓库（姿势 B），保留 `zhiliaowo-proxy` 仓名与远程。
