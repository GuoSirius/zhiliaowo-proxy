# zhiliaowo-core

本仓库的**共享类型层**（包名 `@zhiliaowo/core`），以 workspace 依赖形式被 `apps/proxy` 与 `apps/admin` 引用。

## 职责

- `src/types.ts` — 区块协议、文档模型、品牌主题、数据契约类型（单一事实源）
- `src/validate.ts` — zod 校验
- `src/blocks.ts` — 区块注册表（管理后台据此动态渲染录入表单）
- `src/render.ts` — 渲染相关工具

## 边界

- **只放共享的「类型与契约」**，不放任何业务逻辑、UI、持久化代码。
- `apps/proxy`（后端）与 `apps/admin`（前端）都依赖本包，但**两者互不依赖**。
- 本包被改动后需发版 / 更新 workspace 链接，前后端同步升级。

## 当前状态（2026-09 起）

H5 生成器子系统移除后，**本包的实际消费者只剩 `apps/admin`**（引用 `H5Doc` / `BrandTheme` / `BlockType` 等类型）；
proxy 虽在 `package.json` 声明依赖，但源码当前并未 import。

因此 `types.ts` 中的 H5 文档模型部分属于**待清理的遗留定义**——等 admin 改造为「proxy 海报数据管理台」
（见 `apps/admin/README.md`）后，可连同这些类型一并收敛或删除。

## 规范文档

`specs/` 目录为 **H5 生成器时期的历史设计文档，仅作背景追溯，不代表当前实现**：

- `知了窝H5数据契约.md` — 开放平台 API 字段 schema + 与图示 H5 的映射
- `区块库API规范.md` — 区块协议、H5 Schema、多品牌主题、前后端 API、目录架构、四种导出

> 其中描述的 `src/h5/` 服务端模块、`/api/h5` 接口、H5 展示页与四种导出均已删除，勿据此开发。

## 开发

```bash
npm install
npm run typecheck
```
