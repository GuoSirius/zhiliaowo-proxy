import json, os
from collections import defaultdict
with open("D:/workspace/resource/知了窝/zhiliaowo-proxy/docs/database/_schema_dump.json", encoding="utf-8") as f:
    D = json.load(f)
by_tbl = defaultdict(list)
for db in D:
    for c in D[db]["columns"]:
        by_tbl[(db,c["table_name"])].append(c)
idx_by = defaultdict(list)
for db in D:
    for i in D[db]["indexes"]:
        idx_by[(db,i["table_name"])].append(i)

PREFIX = {"elabscience":[("elabcn_","伊莱瑞特中文站"),("elabcom_","伊莱瑞特英文站")],
          "procell":[("procellcn_","普诺赛中文站"),("pricella_","普诺赛英文站")]}

def r(x): return "-" if x is None else str(x)

for db, groups in PREFIX.items():
    out = [f"# {db} 数据表目录（自动生成）\n",
           f"> 由 information_schema 生成。行数为统计估算值（TABLE_ROWS）。完整列定义见 `_schema_dump.json`。\n",
           f"> 主键(PRI)与索引列(MUL/UNI)作为\"访问路径\"列出，便于定位关联与过滤字段。\n"]
    tblmeta = {t["table_name"]: t for t in D[db]["tables"]}
    for pfx, label in groups:
        names = sorted(n for n in tblmeta if n.startswith(pfx))
        out.append(f"\n## {pfx} — {label}（{len(names)} 表）\n")
        for n in names:
            cs = by_tbl[(db,n)]
            pk = [c["column_name"] for c in cs if c["column_key"]=="PRI"]
            uni = [c["column_name"] for c in cs if c["column_key"]=="UNI"]
            mul = [c["column_name"] for c in cs if c["column_key"]=="MUL"]
            m = tblmeta[n]
            cmt = (m["table_comment"] or "").strip()
            eng = m["engine"] or ("VIEW" if str(cmt).startswith("View") else "")
            out.append(f"### `{n}`\n")
            out.append(f"- 说明：{cmt or '—'}  \n- 引擎：{eng} ｜ 估算行数：{r(m['table_rows'])} ｜ 主键：`{', '.join(pk) or '—'}`")
            acc = []
            if uni: acc.append("UNI("+",".join(uni)+")")
            if mul: acc.append("MUL("+",".join(mul)+")")
            if acc: out.append(f" ｜ 索引：`{'; '.join(acc)}`")
            out.append("")
    path = f"D:/workspace/resource/知了窝/zhiliaowo-proxy/docs/database/catalog-{db}.md"
    with open(path,"w",encoding="utf-8") as f:
        f.write("\n".join(out))
    print("wrote", path, len(out), "lines")
