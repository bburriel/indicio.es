"""Ministerio de Vivienda (MIVAU): compraventas de vivienda por municipio y valor tasado por municipio.

- Tablas 2, 2.1–2.4 del boletín de transacciones (34010210–50.XLS): número de compraventas de vivienda (total, libre, protegida,
  nueva, segunda mano) por municipio y trimestre desde 2004, con datos de los notarios. Sin código INE: se casa por nombre dentro
  de cada provincia.
- Tabla 5 de valor tasado (35103500.XLS): valor tasado medio de la vivienda libre (€/m²) en municipios de más de 25.000 habitantes,
  una hoja por trimestre desde 2005.
→ cache/out_series_mivau.json"""
import glob, json, os, re, sys
import xlrd
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from geo import norm, prov_code, mun_code, BYPROV
HERE = os.path.dirname(os.path.abspath(__file__)); M = f"{HERE}/cache/externos/mivau"
def numv(x):
    try: return float(x)
    except (TypeError, ValueError): return None
sinmatch = {}
def transacciones(f):
    s = xlrd.open_workbook(f).sheet_by_index(0)
    yrow = s.row_values(10); qrow = s.row_values(12)
    cols = []; y = None
    for j, v in enumerate(yrow):
        m = re.search(r"(\d{4})", str(v))
        if m: y = int(m.group(1))
        if y and str(qrow[j]).strip(): cols.append((j, y))
    prov = None; res = {}
    for r in range(13, s.nrows):
        row = s.row_values(r); name = str(row[1]).strip()
        if not name: continue
        vals = [(y, numv(row[j])) for j, y in cols]
        p = prov_code(name)
        if p and p != prov and p not in ("51", "52") and norm(name) not in BYPROV.get(prov, {}):   # cabecera de provincia
            prov = p; continue
        if p in ("51", "52"): prov = p
        if all(v is None for _, v in vals) or not prov: continue
        c, ex = mun_code(prov, name, exact=True)
        if not c:
            p = prov_code(name)
            if p == prov: continue      # fila de total de la provincia
            sinmatch[(prov, name)] = 1; continue
        if c in res and (res[c][0] or not ex):   # dos filas para el mismo código: gana la coincidencia exacta
            sinmatch[(prov, name)] = 1; continue
        d = {}
        for y, v in vals:
            if v is not None: d.setdefault(y, []).append(v)
        res[c] = (ex, d)
    return {c: {y: sum(v) for y, v in d.items() if len(v) == 4} for c, (ex, d) in res.items()}
T = {"compraventas": "34010210", "compLibre": "34010220", "compProtegida": "34010230", "compNueva": "34010240", "compUsada": "34010250"}
out = {"series": {}}
years = set()
for k, f in T.items():
    d = transacciones(f"{M}/{f}.XLS")
    for c, yv in d.items():
        out["series"].setdefault(c, {})[k] = yv; years |= set(yv)
print("compraventas: municipios", len(out["series"]), "sin casar", len(sinmatch), list(sinmatch)[:20])
# valor tasado
VT_ALIAS = {"VITORIA": "Vitoria-Gasteiz", "SAN CRISTOBAL LAGUNA": "San Cristóbal de La Laguna", "SANTA CRUZ DETENERIFE": "Santa Cruz de Tenerife"}
w = xlrd.open_workbook(f"{HERE}/cache/externos/mivau_extra/35103500.XLS"); vt = {}; vsin = set()
for s in w.sheets():
    m = re.match(r"T(\d)A(\d{4})", s.name.strip())
    if not m: continue
    y = int(m.group(2)); hdr = None; prov = None
    for r in range(s.nrows):
        row = [str(x).strip() for x in s.row_values(r)]
        if "Municipio" in row: hdr = r; continue
        if hdr is None or r < hdr + 2: continue
        if row[1]: prov = prov_code(row[1]) or prov
        if not row[2] or not prov: continue
        # «Total» del valor tasado: la tercera columna de valores (hasta 5 años, más de 5, total) o la única si solo hay una
        vals = [numv(x) for x in row[3:]]
        tot = vals[2] if len(vals) >= 3 and vals[2] is not None and len(row) >= 9 else vals[0]
        c = mun_code(prov, row[2], alias=VT_ALIAS) or mun_code(None, row[2], alias=VT_ALIAS)
        if not c: vsin.add((prov, row[2])); continue
        if tot: vt.setdefault(c, {}).setdefault(y, []).append(tot)
for c, d in vt.items():
    out["series"].setdefault(c, {})["valorTasado"] = {y: round(sum(v) / len(v)) for y, v in d.items() if len(v) == 4}
print("valor tasado: municipios", len(vt), "sin casar", len(vsin), sorted(vsin)[:30])
years = sorted(years | {y for d in vt.values() for y in d})
out["years"] = years
for c, d in out["series"].items():
    for k in list(d): d[k] = [d[k].get(y) for y in years]
esp = {k: [sum((d.get(k) or [None] * len(years))[i] or 0 for d in out["series"].values()) for i in range(len(years))] for k in T}
out["espana"] = esp
json.dump(out, open(f"{HERE}/cache/out_series_mivau.json", "w"), separators=(",", ":"))
print(years); print({k: v[-4:] for k, v in esp.items()})
for c in ["28079", "08019", "46250", "29067"]: print(c, {k: v[-3:] for k, v in out["series"].get(c, {}).items()})
