"""Paro registrado y contratos por municipio (SEPE, «Paro registrado y contratos por municipios», septiembre de 2026).
Excel único con una hoja de paro y otra de contratos por provincia. Se calculan composiciones (mujeres, jóvenes, mayores de 45,
sin empleo anterior y contratos temporales) en municipios con al menos 50 parados o 50 contratos ese mes.
Uso: python3 sepe.py (descarga a cache/sepe/) → cache/out/sepe.json"""
import json, os, re, subprocess
import xlrd
HERE = os.path.dirname(os.path.abspath(__file__)); os.makedirs(f"{HERE}/cache/sepe", exist_ok=True); os.makedirs(f"{HERE}/cache/out", exist_ok=True)
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0 Safari/537.36"
URL = "https://www.sepe.es/HomeSepe/dam/jcr:d5ca602b-2a99-4200-85d1-b5d6e5512c4a/ESTADISTICA_MUNICIPIOS.xls"
f = f"{HERE}/cache/sepe/mun0926.xls"
if not os.path.exists(f) or os.path.getsize(f) < 1e6: subprocess.run(["curl", "-sS", "-m", "180", "-A", UA, "-L", "-o", f, URL], check=True)
def num(v):
    if isinstance(v, (int, float)): return float(v)
    v = str(v).strip()
    return 2.0 if v.startswith("<") else (float(v) if re.fullmatch(r"[\d.]+", v) else None)   # «<5» = valor oculto por secreto estadístico
def pc(a, b): return round(a / b * 100, 1) if a is not None and b else None
wb = xlrd.open_workbook(f); datos = {}
for ws in wb.sheets():
    paro = ws.name.startswith("PARO"); contr = ws.name.startswith("CONTR")
    if not (paro or contr): continue
    for r in range(8, ws.nrows):
        row = ws.row_values(r)
        try: code = f"{int(float(row[0])):05d}"
        except (ValueError, TypeError): continue
        v = [num(x) for x in row[2:]]
        d = datos.setdefault(code, {})
        if paro and v[0] and v[0] >= 50 and None not in v[1:7] + v[11:12]:
            t = v[0]; d.update({"paroMujeres": pc(sum(v[4:7]), t), "paroJovenes": pc(v[1] + v[4], t), "paroMayores45": pc(v[3] + v[6], t), "paroSinEmpleo": pc(v[11], t)})
        if contr and v[0] and v[0] >= 50 and None not in (v[2], v[5]): d["contrTemp"] = pc(v[2] + v[5], v[0])
datos = {c: {k: x for k, x in d.items() if x is not None} for c, d in datos.items() if d}
SRC = "SEPE, paro registrado y contratos por municipios, septiembre de 2026"
INDICADORES = [
 ("paroMujeres", "Mujeres entre los parados registrados", "Trabajo", "pct", SRC + " (% del paro registrado)"),
 ("paroJovenes", "Menores de 25 entre los parados registrados", "Trabajo", "pct", SRC + " (% del paro registrado)"),
 ("paroMayores45", "Mayores de 45 entre los parados registrados", "Trabajo", "pct", SRC + " (% del paro registrado)"),
 ("paroSinEmpleo", "Parados que buscan su primer empleo o llevan mucho sin trabajar", "Trabajo", "pct", SRC + " (% del paro registrado «sin empleo anterior»)"),
 ("contrTemp", "Contratos nuevos que son temporales", "Trabajo", "pct", SRC + " (% de los contratos iniciales del mes; municipios con al menos 50)"),
]
json.dump({"indicadores": INDICADORES, "datos": datos}, open(f"{HERE}/cache/out/sepe.json", "w"), ensure_ascii=False)
print(len(datos), "municipios;", {k: sum(1 for d in datos.values() if k in d) for k, *_ in INDICADORES})
