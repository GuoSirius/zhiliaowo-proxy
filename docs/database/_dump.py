"""
只读 dump 两个生产库的结构到 _schema_dump.json。
凭证从环境变量或同目录 .env（已被 .gitignore 忽略，切勿提交）读取，仓库内不含任何明文密码。
用法：
  1) 在同目录创建 .env（参考 _db_config.example.env 填入真实密码），或导出环境变量
  2) python _dump.py
"""
import pymysql, json, os
from pathlib import Path

def load_env(path: Path):
    if path.exists():
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())

load_env(Path(__file__).with_name(".env"))

def db_cfg(prefix: str) -> dict:
    return dict(
        host=os.environ[f"{prefix}_HOST"],
        port=int(os.environ[f"{prefix}_PORT"]),
        user=os.environ[f"{prefix}_USER"],
        password=os.environ[f"{prefix}_PASSWORD"],
        database=os.environ[f"{prefix}_DB"],
    )

DBS = {
    "elabscience": db_cfg("ELABSCIENCE"),
    "procell": db_cfg("PROCELL"),
}

def conn(cfg):
    return pymysql.connect(host=cfg["host"], port=cfg["port"], user=cfg["user"], password=cfg["password"],
                           database=cfg["database"], charset="utf8mb4",
                           cursorclass=pymysql.cursors.DictCursor, connect_timeout=15)

out = {}
for name, cfg in DBS.items():
    c = conn(cfg)
    cur = c.cursor()
    sch = cfg["database"]
    cur.execute("""SELECT table_name, engine, table_comment, table_rows
                   FROM information_schema.tables WHERE table_schema=%s ORDER BY table_name""", (sch,))
    tables = cur.fetchall()
    cur.execute("""SELECT table_name, column_name, column_type, is_nullable, column_key, column_default, extra, column_comment
                   FROM information_schema.columns WHERE table_schema=%s ORDER BY table_name, ordinal_position""", (sch,))
    cols = cur.fetchall()
    cur.execute("""SELECT table_name, index_name, non_unique, column_name, seq_in_index, index_comment
                   FROM information_schema.statistics WHERE table_schema=%s ORDER BY table_name, index_name, seq_in_index""", (sch,))
    idx = cur.fetchall()
    cur.execute("""SELECT kcu.table_name, kcu.column_name, kcu.constraint_name,
                          kcu.referenced_table_name, kcu.referenced_column_name, rc.update_rule, rc.delete_rule
                   FROM information_schema.key_column_usage kcu
                   JOIN information_schema.referential_constraints rc
                     ON kcu.constraint_schema=rc.constraint_schema AND kcu.constraint_name=rc.constraint_name
                   WHERE kcu.table_schema=%s AND kcu.referenced_table_name IS NOT NULL
                   ORDER BY kcu.table_name, kcu.constraint_name""", (sch,))
    fks = cur.fetchall()
    c.close()
    out[name] = {"tables": tables, "columns": cols, "indexes": idx, "foreign_keys": fks}
    print(f"[{name}] tables={len(tables)} cols={len(cols)} idx={len(idx)} fks={len(fks)}")

here = Path(__file__).parent
with open(here / "_schema_dump.json", "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=1)
print("DUMPED -> _schema_dump.json")
