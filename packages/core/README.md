# zhiliaowo-core

H5 生成器的**共享层**，顶层独立仓库（包名 `@zhiliaowo/core`），前后端都 `install` 它。

## 职责

- `src/types.ts` — 区块协议、H5 文档模型、品牌主题、数据契约类型（单一事实源）
- `src/validate.ts` — zod 校验（H5Doc / BrandTheme / 数据契约）
- `src/blocks.ts` — 区块注册表（管理后台据此动态渲染录入表单）

## 边界

- **只放共享的「类型与契约」**，不放任何业务逻辑、UI、持久化代码。
- `zhiliaowo-proxy`（后端）与 `zhiliaowo-template`（前端）都依赖本包，但**两者互不依赖**。
- 本包被改动后需发版 / 更新 workspace 链接，前后端同步升级。

## 规范文档

`specs/` 目录存放顶层设计：

- `知了窝H5数据契约.md` — 开放平台 API 字段 schema + 与图示 H5 的映射
- `区块库API规范.md` — 区块协议、H5 Schema、多品牌主题、前后端 API、目录架构、四种导出

## 开发

```bash
npm install
npm run typecheck
```
