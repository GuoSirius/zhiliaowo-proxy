# 数据库文档中心（Database Docs）

本目录集中存放 **elabscience（伊莱瑞特）** 与 **procell（普诺赛）** 两个 MySQL 库的结构分析与关联图，供后续跨任务引用。

> ⚠️ **只读原则**：下方所有分析均为只读 `information_schema` 探查产物，**未对任何库表执行 DDL/DML**。即便发现元数据/结构异常，也只能报告，不得自行改动。

---

## 目录结构

```
docs/database/
├── README.md                      # 本文件：索引 + 连接信息 + 约定 + 扩展方式
├── relationships.md               # ★ 关联图（ER 图 + 关系明细表），核心交付物
├── catalog-elabscience.md         # elabscience 逐表目录（PK/索引/行数/说明，自动生成）
├── catalog-procell.md             # procell 逐表目录（同上）
├── _schema_dump.json              # 完整列定义（机器可读，information_schema 原始 dump）
├── _dump.py                       # 只读重跑脚本：刷新 _schema_dump.json（凭证读 .env/环境变量）
├── _gencatalog.py                 # 由 _schema_dump.json 重新生成上方两个 catalog-*.md
└── _db_config.example.env         # 凭证变量示例（复制为 .env 填密码；.env 已 gitignore）
```

> 🔒 **安全**：仓库内**不含任何明文密码**。`_dump.py` 的凭证从同目录 `.env`（已被根 `.gitignore` 忽略）或环境变量读取；切勿把 `.env` 提交。本地重跑步骤：复制 `_db_config.example.env` 为 `.env` 填入真实密码 → `python _dump.py` → `python _gencatalog.py`。

新增内容建议：关联图增量追加到 `relationships.md`；新增库/表后重跑 `_dump.py` + `_gencatalog.py` 刷新目录。

---

## 连接信息（请勿外泄）

| 数据库 | host | port | database | user | password |
|---|---|---|---|---|---|
| elabscience | 10.30.30.130 | 3307 | elabscience | elabscience | `eXZwR54pdN76Zyed` |
| procell | 10.30.30.130 | 3307 | procell | procell | `T2tiNGjhdnP2NerK` |

站点前缀约定：
- `elabcn_` = 伊莱瑞特中文站；`elabcom_` = 伊莱瑞特英文站
- `procellcn_` = 普诺赛中文站；`pricella_` = 普诺赛英文站

---

## 关键约定（理解结构前必读）

1. **无外键约束**：两库均 0 条 FK，关系靠命名约定 + 共享键列推断（ThinkPHP/webman 风格）。
2. **产品主键是 `catid`**（目录货号 ID），不是 `id`；产品间通过**货号 `cat`/`catid`** 关联。
3. **四站结构镜像**：`elabcn_*≈elabcom_*`、`procellcn_*≈pricella_*`，同一领域模型只是中英字段差异 + 少量站点专属表。
4. **知了窝数据源**（当前 proxy 核心）在普诺赛中文站：`procellcn_literature_zhi_liao_wo`、`procellcn_literature_product`、`procellcn_literature_hotspot_keyword` —— 仅 `procellcn_` 有，`pricella_` 无。
5. **大量 VIEW**：以 `_view`/`_base_view` 结尾的均为只读视图，禁止写操作。

---

## 快速导航

- 想看「表之间怎么连」→ `relationships.md`
- 想查「某张表有哪些字段/主键/索引」→ `catalog-*.md`（按前缀分组）
- 想要完整列定义（含类型/注释）→ `_schema_dump.json`
