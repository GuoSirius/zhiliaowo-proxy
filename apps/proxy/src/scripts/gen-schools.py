#!/usr/bin/env python3
"""把 docs/学校.xlsx 预生成为 apps/proxy/config/schools.json，供后端随机取学校用。

使用标准库 zipfile 解析 xlsx（无需联网安装 openpyxl）。
运行时后端读 schools.json，避免引入 xlsx 解析依赖。
当 docs/学校.xlsx 更新后，重新跑本脚本即可：
    python scripts/gen-schools.py
"""
import zipfile
import re
import json
import os
import sys
import xml.etree.ElementTree as ET

def _find_src() -> str:
    candidates = [
        '../docs/学校.xlsx',
        'docs/学校.xlsx',
        '../../docs/学校.xlsx',
        '../../../docs/学校.xlsx',
    ]
    for c in candidates:
        if os.path.exists(c):
            return c
    return '../docs/学校.xlsx'


SRC = sys.argv[1] if len(sys.argv) > 1 else _find_src()
OUT = sys.argv[2] if len(sys.argv) > 2 else 'apps/proxy/config/schools.json'
NS = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'


def col_idx(cl: str) -> int:
    idx = 0
    for ch in cl:
        idx = idx * 26 + (ord(ch) - 64)
    return idx


def main() -> None:
    z = zipfile.ZipFile(SRC)
    ss = []
    if 'xl/sharedStrings.xml' in z.namelist():
        for si in ET.fromstring(z.read('xl/sharedStrings.xml')).findall(NS + 'si'):
            ss.append(''.join(t.text or '' for t in si.iter(NS + 't')))

    sheet = 'xl/worksheets/sheet1.xml'
    root = ET.fromstring(z.read(sheet))
    schools = []
    for row in root.iter(NS + 'row'):
        cells = {}
        for c in row.findall(NS + 'c'):
            ref = c.get('r')
            t = c.get('t')
            v = c.find(NS + 'v')
            if v is None:
                continue
            val = ss[int(v.text)] if t == 's' else v.text
            cl, _ = re.match(r'([A-Z]+)(\d+)', ref).groups()
            cells[col_idx(cl)] = val
        if not cells:
            continue
        name = (cells.get(1, '') or '').strip()
        nums_raw = cells.get(2, '')
        if not name:
            continue
        nums = None
        if nums_raw not in ('', None):
            try:
                nums = int(float(nums_raw))
            except (ValueError, TypeError):
                nums = None
        schools.append({'name': name, 'nums': nums})

    # 去掉表头行
    if schools and schools[0]['name'] == 'company':
        schools = schools[1:]

    out = {'source': SRC, 'count': len(schools), 'schools': schools}
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=0)
    print(f'wrote {len(schools)} schools -> {OUT}')


if __name__ == '__main__':
    main()
