# @zhiliaowo/admin — H5 管理后台

管理后台前端（Vue 3 + Vite + UnoCSS + Pinia），运行于 `zhiliaowo-template` monorepo 的 `apps/admin`。

## 职责

- `src/blocks/` — 区块组件库（.vue）
- `src/stores/` — Pinia：草稿 / 主题 / 模板
- `src/views/` — 列表 / 编辑器 / 预览 / 导出
- `src/api/` — 调 `zhiliaowo-proxy` 的 `/api/h5`

## 依赖

- `@zhiliaowo/core` — 共享类型与区块注册表
- 后端 API 通过 vite `proxy` 转发到 `zhiliaowo-proxy`（默认 `:3000`）

## 开发

```bash
npm run dev:admin   # 或 npm -w @zhiliaowo/admin dev
```
