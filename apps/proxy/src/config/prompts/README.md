# 提示词模板目录（按品牌）

板块 6「小结」与板块 4「AI 兜底」使用 AI 时，提示词从本目录读取，**改文案不用改代码**。

## 命名约定

```
<brandKey>-<name>.md
```

- `brandKey`：与 `config/brands.ts` 的 `key` 一致（如 `procell` / `elabscience`）。
- `name`：用途标识，目前使用：
  - `conclusion`：板块 6 小结文案生成
  - `org-translate`：板块 6 机构名中译（⛔ 依赖 corOrg 字段，当前数据缺失，待确认后启用）

## 模板占位符

模板中可用 `{{key}}` 占位符，由代码在调用前替换为实际结构化数据，例如：

- `{{brand}}` 品牌名
- `{{year}}` 年份
- `{{total}}` 文献总数
- `{{avgFactor}}` / `{{maxFactor}}` / `{{factorGe10}}` 影响因子指标
- `{{topJournals}}` Top3 期刊（逗号分隔）
- `{{topHotspots}}` Top5 热点（逗号分隔）

## 新增品牌

1. 在 `data/hotspot-keywords/` 放入 `<brandKey>.xlsx`（Sheet1：A 列中文热点 / B 列英文关键词）；
2. 运行 `node scripts/gen-hotspot-keywords.mjs` 生成 `config/hotspots/<brandKey>.json`；
3. 在此目录复制 `procell-*.md` 为 `<brandKey>-*.md` 并按品牌改写文案。
