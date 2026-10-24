"""Compraventas de vivienda por municipio y trimestre (Ministerio de Vivienda, tablas 2 y 2.4), 2004–2026.
Para el análisis de las zonas tensionadas: municipios de 5.000 habitantes o más y todos los de Cataluña.
→ cache/out_mivau_trim.json"""
import json, os, re, sys
import xlrd
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from geo import norm, prov_code, mun_code, BYPROV, POP
HERE = os.path.dirname(os.path.abspath(__file__)); M = f"{HERE}/cache/externos/mivau"
def numv(x):
    try: return float(x)
    except (TypeError, ValueError): return None
def trim(f):
    s = xlrd.open_workbook(f).sheet_by_index(0); yrow, qrow = s.row_values(10), s.row_values(12); cols = []; y = None
    for j, v in enumerate(yrow):
        m = re.search(r"(\d{4})", str(v))
        if m: y = int(m.group(1))
        q = re.match(r"\s*(\d)", str(qrow[j]))
        if y and q: cols.append((j, f"{y}T{q.group(1)}"))
    prov = None; res = {}
    for r in range(13, s.nrows):
        row = s.row_values(r); name = str(row[1]).strip()
        if not name: continue
        p = prov_code(name)
        if p and p != prov and p not in ("51", "52") and norm(name) not in BYPROV.get(prov, {}): prov = p; continue
        if p in ("51", "52"): prov = p
        vals = [numv(row[j]) for j, _ in cols]
        if all(v is None for v in vals) or not prov: continue
        c, ex = mun_code(prov, name, exact=True)
        if not c or (c in res and (res[c][0] or not ex)): continue
        res[c] = (ex, vals)
    return [p for _, p in cols], {c: v for c, (ex, v) in res.items()}
per, tot = trim(f"{M}/34010210.XLS"); per2, usa = trim(f"{M}/34010250.XLS"); assert per == per2
keep = {c for c in tot if (POP.get(c) or 0) >= 5000 or c[:2] in ("08", "17", "25", "43")}
out = {"periodos": per, "series": {c: {"t": tot[c], "u": usa.get(c)} for c in sorted(keep)}}
json.dump(out, open(f"{HERE}/cache/out_mivau_trim.json", "w"), separators=(",", ":"))
print(len(per), per[:2], per[-2:], len(keep), sum(v["t"][-5] or 0 for v in out["series"].values()))
