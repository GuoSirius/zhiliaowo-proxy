# src/h5/schemas — 校验

服务端请求/数据校验，复用 `@zhiliaowo/core` 导出的 zod schema（H5DocSchema / BrandThemeSchema 等）。

- 新建/更新 H5 时校验 body
- 品牌主题、模板同理

保持与前端、与 `@zhiliaowo/core` 单一事实源一致，不在此重复定义类型。
