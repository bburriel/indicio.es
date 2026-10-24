"""Deuda viva de cada ayuntamiento a 31 de diciembre (Ministerio de Hacienda), 2015–2025 (falta 2017, que no se publicó en el mismo formato).
Lee los Excel que deja externos.py en cache/externos/hacienda_deuda/ (miles de euros) → cache/out_series_deuda.json (euros)."""
import glob, json, os, re
import openpyxl, xlrd
HERE = os.path.dirname(os.path.abspath(__file__))
def rows(f):
    if f.endswith(".xls"):
        s = xlrd.open_workbook(f).sheet_by_index(0); return [s.row_values(r) for r in range(s.nrows)]
    return [list(r) for r in openpyxl.load_workbook(f, read_only=True, data_only=True).worksheets[0].iter_rows(values_only=True)]
res = {}
for f in sorted(glob.glob(f"{HERE}/cache/externos/hacienda_deuda/*.xls*")):
    for r in rows(f):
        try: y = int(float(r[0])); p = f"{int(float(r[3])):02d}"; m = f"{int(float(r[5])):03d}"; v = float(r[7])
        except (TypeError, ValueError, IndexError): continue
        res.setdefault(y, {})[p + m] = round(v * 1000)
years = sorted(res)
out = {"years": years, "series": {c: [res[y].get(c) for y in years] for c in set().union(*res.values())},
       "espana": {y: sum(res[y].values()) for y in years}}
json.dump(out, open(f"{HERE}/cache/out_series_deuda.json", "w"), separators=(",", ":"))
print(years, len(out["series"]), {y: round(v / 1e9, 2) for y, v in out["espana"].items()}, out["series"].get("28079"))
