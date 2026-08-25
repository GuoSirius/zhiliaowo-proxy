# src/h5/cache — 缓存抽象

复用 `zhiliaowo-proxy` 现有的「内存 / Redis 无缝切换」抽象（由 `CACHE_DRIVER=mem|redis` 控制）。

- 命中优先返回，TTL 可配。
- H5 发布后写入缓存，分享链接与导出读取缓存。
- 不新增缓存实现，直接复用 proxy 基础设施。
