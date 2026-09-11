# Changelog

## v3.1.0

[compare changes](https://github.com/GuoSirius/zhiliaowo-proxy/compare/v3.0.1...v3.1.0)

### 🚀 新功能 (Features)

- **products:** Normalize category 细胞资源库 to 细胞 ([d613f53](https://github.com/GuoSirius/zhiliaowo-proxy/commit/d613f53))
- **response:** 统一信封支持业务码，ok/fail 显式 code 参数 ([2047da0](https://github.com/GuoSirius/zhiliaowo-proxy/commit/2047da0))
- **proxy:** 新增只读配置端点 /api/v1/config/sites ([12cffd4](https://github.com/GuoSirius/zhiliaowo-proxy/commit/12cffd4))
- **admin:** 重建为海报数据/同步/品牌配置管理台 ([b56a11a](https://github.com/GuoSirius/zhiliaowo-proxy/commit/b56a11a))
- **admin:** Vue-router + backend layout; consolidate deps into catalog, drop puppeteer/zod ([7c491c1](https://github.com/GuoSirius/zhiliaowo-proxy/commit/7c491c1))

### 🐛 缺陷修复 (Bug Fixes)

- **prod-mysql:** Add connection keepalive and single query retry to absorb econnreset ([a0ffa2c](https://github.com/GuoSirius/zhiliaowo-proxy/commit/a0ffa2c))
- **zhiliaowo:** 缓存键排除 timestamp 并支持同步 bypassCache ([dd24c97](https://github.com/GuoSirius/zhiliaowo-proxy/commit/dd24c97))
- **security:** Admin token 缺失时同步 fail-closed + 生产 cors fail-closed ([0b42a06](https://github.com/GuoSirius/zhiliaowo-proxy/commit/0b42a06))
- **products:** 区间产品计数对齐聚合口径（含 month=0 桶） ([f98554a](https://github.com/GuoSirius/zhiliaowo-proxy/commit/f98554a))
- **prod-mysql:** 空数组 in() 守卫 + 移除不可达 throw ([b65529d](https://github.com/GuoSirius/zhiliaowo-proxy/commit/b65529d))
- **prompts:** 模板变量支持连字符（如 {{brand-key}}） ([50f5b8c](https://github.com/GuoSirius/zhiliaowo-proxy/commit/50f5b8c))
- **journals:** 板块6 top 期刊查询对齐 month=0 桶口径 ([49be504](https://github.com/GuoSirius/zhiliaowo-proxy/commit/49be504))

### ♻️ 代码重构 (Refactors)

- **report-db:** 移除模块加载期迁移副作用，脚本显式调用 ([d86c14e](https://github.com/GuoSirius/zhiliaowo-proxy/commit/d86c14e))
- **h5:** 移除 H5 生成子系统（packages/core 整包 + admin h5 模块） ([73788c9](https://github.com/GuoSirius/zhiliaowo-proxy/commit/73788c9))

### 📚 文档 (Documentation)

- **env:** 补充 node_env 说明（控制生产 cors fail-closed） ([e94ea2d](https://github.com/GuoSirius/zhiliaowo-proxy/commit/e94ea2d))
- 新增 code_review 审查报告 ([3adc515](https://github.com/GuoSirius/zhiliaowo-proxy/commit/3adc515))
- Delete codereview ([f038556](https://github.com/GuoSirius/zhiliaowo-proxy/commit/f038556))
- **comments:** Shared/ 补充统一文件目的头，规范注释一致性 ([bf9241c](https://github.com/GuoSirius/zhiliaowo-proxy/commit/bf9241c))
- **comments:** Datasources/ 补充 zhiliaowo 与 paper-fetch 文件目的头 ([5628f5e](https://github.com/GuoSirius/zhiliaowo-proxy/commit/5628f5e))
- **comments:** Services/report/ 全模块补充统一文件目的头 ([a8c7ffc](https://github.com/GuoSirius/zhiliaowo-proxy/commit/a8c7ffc))
- **comments:** Routes/ 与 config/ 补充统一文件目的头 ([6fd2544](https://github.com/GuoSirius/zhiliaowo-proxy/commit/6fd2544))
- **comments:** Scripts/ 补充统一文件目的头 ([193b6fe](https://github.com/GuoSirius/zhiliaowo-proxy/commit/193b6fe))
- **comments:** 移除冗余文件头注释（路径前缀+作用复读） ([b28e709](https://github.com/GuoSirius/zhiliaowo-proxy/commit/b28e709))

### 🔧 构建 (Build)

- **pnpm:** Migrate overrides from package.json pnpm field to pnpm-workspace.yaml ([c6742fe](https://github.com/GuoSirius/zhiliaowo-proxy/commit/c6742fe))

### ❤️ Contributors

- 郭之存 ([@siriusSupreme](https://github.com/siriusSupreme))

## v3.0.1

[compare changes](https://github.com/GuoSirius/zhiliaowo-proxy/compare/v3.0.0...v3.0.1)

### 🚀 新功能 (Features)

- **report:** Soft-delete upstream-removed papers and exclude from stats ([b9347f3](https://github.com/GuoSirius/zhiliaowo-proxy/commit/b9347f3))

### 🐛 缺陷修复 (Bug Fixes)

- **report:** Move deleted_at index out of create block so existing dbs migrate ([014870c](https://github.com/GuoSirius/zhiliaowo-proxy/commit/014870c))

### ❤️ Contributors

- 郭之存 ([@siriusSupreme](https://github.com/siriusSupreme))

## v3.0.0

[compare changes](https://github.com/GuoSirius/zhiliaowo-proxy/compare/v2.3.1...v3.0.0)

### 🚀 新功能 (Features)

- Add four-site routing with locale-aware config and prod-mysql product meta ([9415c40](https://github.com/GuoSirius/zhiliaowo-proxy/commit/9415c40))

### 🐛 缺陷修复 (Bug Fixes)

- **proxy:** 修正同步脚本路径适配 src 搬迁恢复定时任务 ([98ede03](https://github.com/GuoSirius/zhiliaowo-proxy/commit/98ede03))
- **proxy:** 修正 env 中心的 .env 与 config 目录路径 ([c639975](https://github.com/GuoSirius/zhiliaowo-proxy/commit/c639975))
- Prod-mysql 凭据按站点解析（站点级>品牌级>全局），支持两品牌不同账号密码 ([5accbf3](https://github.com/GuoSirius/zhiliaowo-proxy/commit/5accbf3))
- **products:** 返回字段改名 productName/productCategory，分类改取 sort_i（一级分类，按需求文档） ([6218b47](https://github.com/GuoSirius/zhiliaowo-proxy/commit/6218b47))
- **products:** 修正 prod-mysql 真实 schema（表 product_main / 名称 title_c / 分类 sort_i），并补 mysql2 依赖 ([d589b7f](https://github.com/GuoSirius/zhiliaowo-proxy/commit/d589b7f))
- **products:** Sort_i 转文字（join goodstype_web 取分类名），产品名+分类名均按 locale 区分中英文站 ([3c451b8](https://github.com/GuoSirius/zhiliaowo-proxy/commit/3c451b8))
- **products:** Enrichment 按 cat 列匹配（goodsspu=目录编号=cat，非数值主键 catid） ([bd82643](https://github.com/GuoSirius/zhiliaowo-proxy/commit/bd82643))

### ♻️ 代码重构 (Refactors)

- **proxy:** 源码整体迁入 src/ 落实方案a目录骨架 ([5d1de52](https://github.com/GuoSirius/zhiliaowo-proxy/commit/5d1de52))
- **proxy:** 收口环境变量到 env 中心并移除 h5 生成模块 ([81659ee](https://github.com/GuoSirius/zhiliaowo-proxy/commit/81659ee))
- **proxy:** 抽出 shared/datasources/services 轻分层并移除 lib 目录 ([4ac6161](https://github.com/GuoSirius/zhiliaowo-proxy/commit/4ac6161))
- **proxy:** 拆分 sync.ts 为 sync/ 子模块并将数据访问归位 ([a237433](https://github.com/GuoSirius/zhiliaowo-proxy/commit/a237433))
- **proxy:** 归位 models 类型契约层并同步 README 目录结构 ([4c41344](https://github.com/GuoSirius/zhiliaowo-proxy/commit/4c41344))

### ❤️ Contributors

- 郭之存 ([@siriusSupreme](https://github.com/siriusSupreme))

## v2.3.1

[compare changes](https://github.com/GuoSirius/zhiliaowo-proxy/compare/v2.3.0...v2.3.1)

### 🐛 缺陷修复 (Bug Fixes)

- _gencatalog.py 去除硬编码绝对路径，改用脚本相对目录 ([66de95c](https://github.com/GuoSirius/zhiliaowo-proxy/commit/66de95c))
- Gen-schools.py 去除硬编码绝对路径，改用相对路径候选 ([28f0994](https://github.com/GuoSirius/zhiliaowo-proxy/commit/28f0994))
- **trend:** Quarters 起点改为两道闸门——季度末(3/6/9/12)且已过完 ([a9fe108](https://github.com/GuoSirius/zhiliaowo-proxy/commit/a9fe108))
- **trend:** Decade 指定 year 改为「截止 endmonth」= 1~endmonth 本地聚合 ([6ad42d8](https://github.com/GuoSirius/zhiliaowo-proxy/commit/6ad42d8))
- **trend:** Decade 在 samerange 模式下指定 year 也按 [startmonth, endmonth] 同区间 ([3f3279b](https://github.com/GuoSirius/zhiliaowo-proxy/commit/3f3279b))

### 📚 文档 (Documentation)

- 新增 elabscience/procell 生产库结构分析与关联图 ([6739ce5](https://github.com/GuoSirius/zhiliaowo-proxy/commit/6739ce5))

### ❤️ Contributors

- 郭之存 ([@siriusSupreme](https://github.com/siriusSupreme))

## v2.3.0

[compare changes](https://github.com/GuoSirius/zhiliaowo-proxy/compare/v2.2.4...v2.3.0)

### 🚀 新功能 (Features)

- 板块6 小结补充机构信息（AI 真实优先 / Excel 兜底随机6所） ([2f2a966](https://github.com/GuoSirius/zhiliaowo-proxy/commit/2f2a966))
- 补充 admin/h5 的 unocss.config.ts（内联 preset，修复 Config file not found） ([3d733db](https://github.com/GuoSirius/zhiliaowo-proxy/commit/3d733db))

### 🐛 缺陷修复 (Bug Fixes)

- Overview 各板块响应字段对齐分接口：补齐区间与排序字段，板块2 保留双累计块，板块6 去冗余 ([61069b2](https://github.com/GuoSirius/zhiliaowo-proxy/commit/61069b2))
- 板块2 单独接口补齐 cumulative 块，与总览接口双别名共存对齐 ([b44be05](https://github.com/GuoSirius/zhiliaowo-proxy/commit/b44be05))
- Pnpm-workspace 放开 blockExoticSubdeps 并将 typescript 锁到 ^6.0.0 ([7da59d7](https://github.com/GuoSirius/zhiliaowo-proxy/commit/7da59d7))

### 📦 杂项维护 (Chores)

- 升级并锁定 pnpm 至 12.3.4 ([0fe30b8](https://github.com/GuoSirius/zhiliaowo-proxy/commit/0fe30b8))
- 定时任务日志统一归集到 logs/ 并加入 .gitignore ([497b9e2](https://github.com/GuoSirius/zhiliaowo-proxy/commit/497b9e2))
- 全量依赖升级（pnpm up -r --latest）+ pnpm.overrides 硬锁 typescript/vue-tsc ([4fcca69](https://github.com/GuoSirius/zhiliaowo-proxy/commit/4fcca69))
- Update ([9675824](https://github.com/GuoSirius/zhiliaowo-proxy/commit/9675824))

### ❤️ Contributors

- 郭之存 ([@siriusSupreme](https://github.com/siriusSupreme))

## v2.2.4

[compare changes](https://github.com/GuoSirius/zhiliaowo-proxy/compare/v2.2.3...v2.2.4)

### 🚀 新功能 (Features)

- 同步并发支持按 CPU 核心数自动推导；.workbuddy 加入 gitignore ([b847d67](https://github.com/GuoSirius/zhiliaowo-proxy/commit/b847d67))

### 🐛 缺陷修复 (Bug Fixes)

- 分页总页数改用上游回显 pageSize/totalPage，修复上游钳制 pageSize 导致的静默丢数 ([f4de531](https://github.com/GuoSirius/zhiliaowo-proxy/commit/f4de531))

### ❤️ Contributors

- 郭之存 ([@siriusSupreme](https://github.com/siriusSupreme))

## v2.2.3

[compare changes](https://github.com/GuoSirius/zhiliaowo-proxy/compare/v2.2.2...v2.2.3)

### 📚 文档 (Documentation)

- 修正 README report 章节口径（核心累计走2.1、季度按真实日期、板块6响应字段） ([df7b815](https://github.com/GuoSirius/zhiliaowo-proxy/commit/df7b815))
- 精简对齐 report 路由与 overview 注释，移除 hotspots 重复 pct ([466f130](https://github.com/GuoSirius/zhiliaowo-proxy/commit/466f130))

### ❤️ Contributors

- 郭之存 ([@siriusSupreme](https://github.com/siriusSupreme))

## v2.2.2

[compare changes](https://github.com/GuoSirius/zhiliaowo-proxy/compare/v2.2.1...v2.2.2)

### 📚 文档 (Documentation)

- 板块4标注排序键为关键词频率次数，厘清与产品的区别 ([ac97808](https://github.com/GuoSirius/zhiliaowo-proxy/commit/ac97808))

### ❤️ Contributors

- 郭之存 ([@siriusSupreme](https://github.com/siriusSupreme))

## v2.2.1

[compare changes](https://github.com/GuoSirius/zhiliaowo-proxy/compare/v2.2.0...v2.2.1)

### 🚀 新功能 (Features)

- 对齐 sync/recompute 传参，recompute 支持年份区间且截止年默认当前年 ([14b45b8](https://github.com/GuoSirius/zhiliaowo-proxy/commit/14b45b8))

### 🐛 缺陷修复 (Bug Fixes)

- 热点 Top10 按出现次数固定选出后再剔除负增长（贴合需求文档口径） ([d6c0833](https://github.com/GuoSirius/zhiliaowo-proxy/commit/d6c0833))
- 热点改为先过滤负增长再按出现次数取前10（尽可能满足10条） ([a66f546](https://github.com/GuoSirius/zhiliaowo-proxy/commit/a66f546))

### 📚 文档 (Documentation)

- Update ([07c3587](https://github.com/GuoSirius/zhiliaowo-proxy/commit/07c3587))

### 🎨 代码格式 (Style)

- 优化 release 发版类型选择交互样式（高亮/配色/对齐） ([37a24e2](https://github.com/GuoSirius/zhiliaowo-proxy/commit/37a24e2))

### ❤️ Contributors

- 郭之存 ([@siriusSupreme](https://github.com/siriusSupreme))

## v2.2.0

[compare changes](https://github.com/GuoSirius/zhiliaowo-proxy/compare/v2.1.0...v2.2.0)

### 🚀 新功能 (Features)

- 调整海报统计口径（core 2.1累计、quarters真实日期、热点过滤负增长） ([d7079b5](https://github.com/GuoSirius/zhiliaowo-proxy/commit/d7079b5))

### ❤️ Contributors

- 郭之存 ([@siriusSupreme](https://github.com/siriusSupreme))

## v2.1.0

[compare changes](https://github.com/GuoSirius/zhiliaowo-proxy/compare/v2.0.1...v2.1.0)

### 🚀 新功能 (Features)

- 板块2 core 锁定「1~endMonth」口径 ([67c357a](https://github.com/GuoSirius/zhiliaowo-proxy/commit/67c357a))
- Trend 十年趋势改走本地聚合，支持同区间口径 ([7ea5c22](https://github.com/GuoSirius/zhiliaowo-proxy/commit/7ea5c22))
- Sync 脚本支持多年份范围同步，readme 同步口径更新 ([25aafdb](https://github.com/GuoSirius/zhiliaowo-proxy/commit/25aafdb))
- 产品/热点支持 sortBy 排序且产品候选池自动扩展凑够 15 条 ([3dc6675](https://github.com/GuoSirius/zhiliaowo-proxy/commit/3dc6675))

### 🐛 缺陷修复 (Bug Fixes)

- Month=0 桶误装全年全量导致全年级联查询虚高一倍 ([eaa8e2e](https://github.com/GuoSirius/zhiliaowo-proxy/commit/eaa8e2e))
- Core 卡片恢复传入区间，新增 1~endmonth 累计块；decade 恢复 2.4 优先补全 ([395b86e](https://github.com/GuoSirius/zhiliaowo-proxy/commit/395b86e))
- Zlw_papers 主键改为 (id, brand)，修复多品牌同步互相覆盖 ([2e1e514](https://github.com/GuoSirius/zhiliaowo-proxy/commit/2e1e514))

### ♻️ 代码重构 (Refactors)

- Conclusion 响应移除冗余 stats 与 hotspots 字段 ([bff9e82](https://github.com/GuoSirius/zhiliaowo-proxy/commit/bff9e82))
- 板块5 产品 top15 改按引用篇数排序并抽共享函数 ([85525e7](https://github.com/GuoSirius/zhiliaowo-proxy/commit/85525e7))

### 📚 文档 (Documentation)

- 更新 6 板块海报接口文档 ([3e512de](https://github.com/GuoSirius/zhiliaowo-proxy/commit/3e512de))

### ❤️ Contributors

- 郭之存 ([@siriusSupreme](https://github.com/siriusSupreme))

## v2.0.1

[compare changes](https://github.com/GuoSirius/zhiliaowo-proxy/compare/v2.0.0...v2.0.1)

### ♻️ 代码重构 (Refactors)

- **proxy:** Core 指标改为 value prevvalue rate 结构，trend 增加 percent 与近四季度 year ([aae6e54](https://github.com/GuoSirius/zhiliaowo-proxy/commit/aae6e54))

### ❤️ Contributors

- 郭之存 ([@siriusSupreme](https://github.com/siriusSupreme))

## v2.0.0

[compare changes](https://github.com/GuoSirius/zhiliaowo-proxy/compare/v1.1.1...v2.0.0)

### 🐛 缺陷修复 (Bug Fixes)

- **release:** 发版选择界面不再打印 changelog，避免干扰版本类型选择 ([44caddb](https://github.com/GuoSirius/zhiliaowo-proxy/commit/44caddb))

### ❤️ Contributors

- 郭之存 ([@siriusSupreme](https://github.com/siriusSupreme))

## v1.1.1

[compare changes](https://github.com/GuoSirius/zhiliaowo-proxy/compare/v1.1.0...v1.1.1)

### 🚀 新功能 (Features)

- **core:** 让 @zhiliaowo/core 可编译为 dist 供生产环境直接引用 ([fb88726](https://github.com/GuoSirius/zhiliaowo-proxy/commit/fb88726))
- **vite:** 开启 dev server host 绑定 0.0.0.0 以支持局域网/容器访问 ([9cedc30](https://github.com/GuoSirius/zhiliaowo-proxy/commit/9cedc30))
- **proxy:** 实现 S1 骨架：修复 PaperList 类型、新增 AI client 与热点关键词生成脚本 ([c9122b0](https://github.com/GuoSirius/zhiliaowo-proxy/commit/c9122b0))
- **proxy:** 实现 S2 数据层：三张表 + syncYear 同步 + CLI 脚本 ([7c0da2f](https://github.com/GuoSirius/zhiliaowo-proxy/commit/7c0da2f))
- **proxy:** 实现 S3 板块2核心数据 + 板块3趋势接口 ([ca946e9](https://github.com/GuoSirius/zhiliaowo-proxy/commit/ca946e9))
- **proxy:** 实现 S4 板块1研究概述 + 板块5产品引用，新增本地聚合重算脚本 ([e1fd673](https://github.com/GuoSirius/zhiliaowo-proxy/commit/e1fd673))
- **proxy:** 实现 S5 板块4研究热点，本地匹配 + AI 兜底开关 ([e26d9ba](https://github.com/GuoSirius/zhiliaowo-proxy/commit/e26d9ba))
- **proxy:** 实现 S6 板块6小结（Top3期刊+Top10热点+AI结论，AI门控） ([08f7e7a](https://github.com/GuoSirius/zhiliaowo-proxy/commit/08f7e7a))
- **proxy:** 实现 S7 overview编排 + refresh/meta 接口 + 定时同步脚本 ([1c03211](https://github.com/GuoSirius/zhiliaowo-proxy/commit/1c03211))

### 🐛 缺陷修复 (Bug Fixes)

- **build:** Approve native build scripts via pnpm 11 allowBuilds ([82f244a](https://github.com/GuoSirius/zhiliaowo-proxy/commit/82f244a))
- **proxy:** 修复 TS 编译错误使 pnpm -r build 通过 ([204ff58](https://github.com/GuoSirius/zhiliaowo-proxy/commit/204ff58))
- **deps:** 将 @types/node 钉回 ^24 并修正锁文件，解除 minimumReleaseAge 策略拦截 ([a5290c7](https://github.com/GuoSirius/zhiliaowo-proxy/commit/a5290c7))
- **vite:** 补充 admin 与 h5 前端缺失的 index.html 入口（修复根路径 404） ([09b1cb0](https://github.com/GuoSirius/zhiliaowo-proxy/commit/09b1cb0))
- **admin:** Crypto.randomUUID 改非安全上下文兼容实现；Vite HMR 显式绑定局域网 host ([73e0b2b](https://github.com/GuoSirius/zhiliaowo-proxy/commit/73e0b2b))
- **proxy:** Serve 显式捕获 EADDRINUSE，端口被占用时给出明确报错而非含糊崩溃 ([bf4a05c](https://github.com/GuoSirius/zhiliaowo-proxy/commit/bf4a05c))
- **dev:** Pnpm dev 启动前自动清理 3000/5173/5174 残留占用，杜绝 proxy EADDRINUSE 崩溃 ([7b34871](https://github.com/GuoSirius/zhiliaowo-proxy/commit/7b34871))
- **proxy:** Dev 改用 node --watch --import tsx 替代 tsx watch，规避 pnpm --parallel 下 stdin EOF 静默退出 ([9d7cfa9](https://github.com/GuoSirius/zhiliaowo-proxy/commit/9d7cfa9))
- **proxy/vite:** 修复 CORS 预检缺头（改用 c.body 保留 ACAO）；移除错误 hmr.host 并放开 allowedHosts ([e303e2c](https://github.com/GuoSirius/zhiliaowo-proxy/commit/e303e2c))
- **h5:** 调整路由注册顺序，集合路由 /brands、/templates 置于 /:id 之前，避免 RegExpRouter 误吞 ([2e8d573](https://github.com/GuoSirius/zhiliaowo-proxy/commit/2e8d573))
- **admin:** 克隆品牌主题前用 toRaw 剥离响应式代理，修复 structuredClone DataCloneError ([e692f38](https://github.com/GuoSirius/zhiliaowo-proxy/commit/e692f38))
- **proxy:** Dev 改回 tsx watch，避免 node --watch 监听 node_modules 导致热更新失效 ([4718a6d](https://github.com/GuoSirius/zhiliaowo-proxy/commit/4718a6d))
- **proxy:** 用 dev.mjs 包装 tsx watch 并忽略 stdin，修复 pnpm --parallel 下 3000 起不来 ([f726ba1](https://github.com/GuoSirius/zhiliaowo-proxy/commit/f726ba1))
- 修复 pre-commit 全量 typecheck 失败（typescript 版本/缺 @types/node/vite-env） ([70792dd](https://github.com/GuoSirius/zhiliaowo-proxy/commit/70792dd))
- **proxy:** 修复 month=0 静默丢数 + refresh 加令牌鉴权与并发锁 ([a1bddf9](https://github.com/GuoSirius/zhiliaowo-proxy/commit/a1bddf9))
- **proxy:** 月份参数越界直接抛错而非静默 clamp(f9) ([b841aaf](https://github.com/GuoSirius/zhiliaowo-proxy/commit/b841aaf))
- **proxy:** Month=0 全年汇总桶正确聚合全年数据 ([11af163](https://github.com/GuoSirius/zhiliaowo-proxy/commit/11af163))

### ♻️ 代码重构 (Refactors)

- Migrate zhiliaowo-proxy to pnpm monorepo (apps/* + packages/core) ([6952f03](https://github.com/GuoSirius/zhiliaowo-proxy/commit/6952f03))
- **proxy:** 热点统计复用聚合表(F1)+统一品牌入参(F6)+列治理(F7/F13)+首页去重(F10) ([9900bb7](https://github.com/GuoSirius/zhiliaowo-proxy/commit/9900bb7))
- **proxy:** 抽取 calc/prompts 公共模块(F4/F5) ([31eb882](https://github.com/GuoSirius/zhiliaowo-proxy/commit/31eb882))
- **proxy:** Cors 白名单替代反射任意源(f8) ([c16b2d0](https://github.com/GuoSirius/zhiliaowo-proxy/commit/c16b2d0))
- **proxy:** H5 存储自注册初始化，解耦 proxy 启动(f14) ([6fdd86f](https://github.com/GuoSirius/zhiliaowo-proxy/commit/6fdd86f))
- **proxy:** 统一 sync/recompute 脚本 CLI 传参为 --brand/--year 选项式 ([cf47bc7](https://github.com/GuoSirius/zhiliaowo-proxy/commit/cf47bc7))

### 📚 文档 (Documentation)

- Document monorepo dev/ports/env/release flow ([6d5c075](https://github.com/GuoSirius/zhiliaowo-proxy/commit/6d5c075))
- **proxy:** 补充 6 板块海报数据接口文档（S8） ([ae0589d](https://github.com/GuoSirius/zhiliaowo-proxy/commit/ae0589d))
- **proxy:** 精简 readme 移除 env 与待确认章节 ([b8c5c57](https://github.com/GuoSirius/zhiliaowo-proxy/commit/b8c5c57))
- **proxy:** Readme 对齐当前 apps/proxy ([f249a48](https://github.com/GuoSirius/zhiliaowo-proxy/commit/f249a48))
- **proxy:** .env.example 补充热点/期刊/提示词目录命名约定 ([2401c3a](https://github.com/GuoSirius/zhiliaowo-proxy/commit/2401c3a))

### 🔧 构建 (Build)

- **deps:** Centralize shared deps via pnpm catalog ([63b9609](https://github.com/GuoSirius/zhiliaowo-proxy/commit/63b9609))
- **config:** Env-driven ports + consolidate .env to repo root ([6697c21](https://github.com/GuoSirius/zhiliaowo-proxy/commit/6697c21))
- **docker:** 重写为 pnpm 多阶段构建并新增 .dockerignore ([38030bc](https://github.com/GuoSirius/zhiliaowo-proxy/commit/38030bc))

### 📦 杂项维护 (Chores)

- **release:** Align all package versions to 1.1.0 ([00f0d60](https://github.com/GuoSirius/zhiliaowo-proxy/commit/00f0d60))
- **proxy:** 提交现有基线改动（elabscience 改名、env AI 配置、热点关键词数据） ([1e388e4](https://github.com/GuoSirius/zhiliaowo-proxy/commit/1e388e4))
- **data:** 提交 report.db 文献聚合库并放开 gitignore ([3362636](https://github.com/GuoSirius/zhiliaowo-proxy/commit/3362636))
- **proxy:** Report.db 移出 git，data/.gitignore 显式忽略(f11) ([d4c140c](https://github.com/GuoSirius/zhiliaowo-proxy/commit/d4c140c))
- **proxy:** Env 与 .env.example 严格一致，移除 report_db_path ([9b126be](https://github.com/GuoSirius/zhiliaowo-proxy/commit/9b126be))
- **proxy:** 注册 recompute pnpm 脚本并更新 readme ([1862450](https://github.com/GuoSirius/zhiliaowo-proxy/commit/1862450))

### 🧪 测试 (Tests)

- **proxy:** 补 calc/agg/hotspot 单测 + 测试脚本改用 tsx(f12) ([5fc4548](https://github.com/GuoSirius/zhiliaowo-proxy/commit/5fc4548))

### ⚙️ 持续集成 (CI)

- **release:** Sync all workspace package versions on release ([da5415b](https://github.com/GuoSirius/zhiliaowo-proxy/commit/da5415b))

### ❤️ Contributors

- 郭之存 ([@siriusSupreme](https://github.com/siriusSupreme))

## v1.1.0

[compare changes](https://github.com/GuoSirius/zhiliaowo-proxy/compare/v1.0.2...v1.1.0)

### 🚀 新功能 (Features)

- Add unified response envelope helper ([e1c1d80](https://github.com/GuoSirius/zhiliaowo-proxy/commit/e1c1d80))
- Apply code message data envelope to routes and handlers ([a2fb487](https://github.com/GuoSirius/zhiliaowo-proxy/commit/a2fb487))

### ❤️ Contributors

- 郭之存 ([@siriusSupreme](https://github.com/siriusSupreme))

## v1.0.2

[compare changes](https://github.com/GuoSirius/zhiliaowo-proxy/compare/v1.0.1...v1.0.2)

### 🚀 新功能 (Features)

- 服务绑定 0.0.0.0 并精简 README ([dbcff0c](https://github.com/GuoSirius/zhiliaowo-proxy/commit/dbcff0c))
- Make widget base url configurable via zliw_widget_base env ([b68aef5](https://github.com/GuoSirius/zhiliaowo-proxy/commit/b68aef5))

### 🐛 缺陷修复 (Bug Fixes)

- Load dotenv to populate process env appid ([30f9443](https://github.com/GuoSirius/zhiliaowo-proxy/commit/30f9443))

### 📚 文档 (Documentation)

- Align readme with widget 302 route, host binding and brand env var ([d6d24b6](https://github.com/GuoSirius/zhiliaowo-proxy/commit/d6d24b6))
- Add curl usage examples to readme ([25b3df6](https://github.com/GuoSirius/zhiliaowo-proxy/commit/25b3df6))

### ❤️ Contributors

- 郭之存 ([@siriusSupreme](https://github.com/siriusSupreme))

## v1.0.1

[compare changes](https://github.com/GuoSirius/zhiliaowo-proxy/compare/v1.0.0...v1.0.1)

### 🚀 新功能 (Features)

- 实现开放组件 302 分发路由 ([7a86973](https://github.com/GuoSirius/zhiliaowo-proxy/commit/7a86973))

### 🐛 缺陷修复 (Bug Fixes)

- 发布脚本提交确认默认选中 Y ([92c84a2](https://github.com/GuoSirius/zhiliaowo-proxy/commit/92c84a2))
- 发布脚本改用 changelogen 生成 changelog ([0662c88](https://github.com/GuoSirius/zhiliaowo-proxy/commit/0662c88))
- 发布脚本用 changelogen --bump 真正落地 changelog 生成 ([3c4a16e](https://github.com/GuoSirius/zhiliaowo-proxy/commit/3c4a16e))

### 📚 文档 (Documentation)

- 重建 CHANGELOG 为干净中文增量格式 ([140172e](https://github.com/GuoSirius/zhiliaowo-proxy/commit/140172e))

### 📦 杂项维护 (Chores)

- Update brand ([8614f4f](https://github.com/GuoSirius/zhiliaowo-proxy/commit/8614f4f))

### ❤️ Contributors

- 郭之存 ([@siriusSupreme](https://github.com/siriusSupreme))

## v1.0.0 (2026-08-25)

### 🚀 新功能 (Features)

- 实现核心代理层（多 brand 配置 / 缓存抽象 / 知了窝 client） ([62c63fd](https://github.com/GuoSirius/zhiliaowo-proxy/commit/62c63fd))
- 实现 7 个开放 API 路由与 Hono 入口 ([bd1bf91](https://github.com/GuoSirius/zhiliaowo-proxy/commit/bd1bf91))
- add release ([94d219f](https://github.com/GuoSirius/zhiliaowo-proxy/commit/94d219f))

### 🐛 缺陷修复 (Bug Fixes)

- 发布脚本提交确认默认选中 Y ([92c84a2](https://github.com/GuoSirius/zhiliaowo-proxy/commit/92c84a2))

### 📚 文档 (Documentation)

- 生成初始 CHANGELOG（changelogen） ([4f3ef14](https://github.com/GuoSirius/zhiliaowo-proxy/commit/4f3ef14))

### 🔧 构建 (Build)

- 对齐 changelogen 分组与 commitlint type ([451bc62](https://github.com/GuoSirius/zhiliaowo-proxy/commit/451bc62))
- 显式声明 commitlint 常规 type 规范 ([5ea9853](https://github.com/GuoSirius/zhiliaowo-proxy/commit/5ea9853))

### 📦 杂项维护 (Chores)

- 初始化项目脚手架与工程化工具链 ([2612d51](https://github.com/GuoSirius/zhiliaowo-proxy/commit/2612d51))

### ❤️ Contributors

- 郭之存 ([@siriusSupreme](https://github.com/siriusSupreme))
