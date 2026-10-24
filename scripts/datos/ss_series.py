"""Afiliados a la Seguridad Social por municipio, sector, régimen y sexo (diciembre de 2011–2025 y septiembre de 2026).

Fuente: Seguridad Social, «Afiliados por municipio y actividad económica» (MUNCNAE<MM><AA>.xlsx), que deja externos.py en
cache/externos/ss_muncnae*/. Formato largo: una fila por municipio × régimen × CNAE a dos dígitos × sexo; «<5» se toma como 2.
Ojo: la afiliación se asigna al municipio de la cuenta de cotización (dónde está el centro de trabajo), no al de residencia.
Paso 1 (un fichero por llamada, con caché en cache/externos/ss_parsed/) y paso 2 → cache/out_series_ss.json
Uso: python3 ss_series.py [segundos]"""
import glob, json, os, re, sys, time
import openpyxl
HERE = os.path.dirname(os.path.abspath(__file__)); PAR = f"{HERE}/cache/externos/ss_parsed3"; os.makedirs(PAR, exist_ok=True)
SECT = [("agri", 1, 3), ("industria", 5, 39), ("construccion", 41, 43), ("comercio", 45, 47), ("transporte", 49, 53), ("hosteleria", 55, 56),
        ("info", 58, 63), ("finanzas", 64, 68), ("profesional", 69, 82), ("publico", 84, 88), ("otros", 90, 99)]
def sector(c):
    try: c = int(c)
    except (TypeError, ValueError): return "nc"
    for k, a, b in SECT:
        if a <= c <= b: return k
    return "nc"
def num(v):
    s = str(v).strip()
    if s.startswith("<"): return 2.0
    try: return float(s.replace(".", ""))
    except ValueError: return 0.0
def rc_name(n): return n.replace("Ó", "O")
def parse(f):
    ws = openpyxl.load_workbook(f, read_only=True).worksheets[0]; out = {}; fecha = None
    for i, row in enumerate(ws.iter_rows(values_only=True)):
        if i == 0: H = {h: j for j, h in enumerate(row)}; continue
        try: code = f"{int(row[H['COD MUNICIPIO']]):05d}"
        except (TypeError, ValueError): continue
        fecha = fecha or str(row[H["FECHA"]])
        v = num(row[H["AFILIADOS"]]); d = out.setdefault(code, {})
        rn = str(row[H["REGIMEN"]]).upper(); sx = str(row[H["COD SEXO"]])
        try: rc = int(row[H["COD REGIMEN"]])
        except (TypeError, ValueError): rc = 0
        d["total"] = d.get("total", 0) + v
        if sx == "2": d["mujeres"] = d.get("mujeres", 0) + v
        if "AUTONOMO" in rc_name(rn) or rc == 825: d["autonomos"] = d.get("autonomos", 0) + v
        if "AGRARIO" in rn: d["agrario"] = d.get("agrario", 0) + v      # sistema especial agrario (cuenta ajena)
        if "HOGAR" in rn: d["hogar"] = d.get("hogar", 0) + v          # sistema especial de empleados de hogar
        s = sector(row[H["COD CNAE"]]); d[s] = d.get(s, 0) + v
    return {"fecha": fecha, "datos": out}
budget = float(sys.argv[1]) if len(sys.argv) > 1 else 1e9; t0 = time.time()
files = sorted(glob.glob(f"{HERE}/cache/externos/ss_muncnae*/MUNCNAE*.xlsx"))
for f in files:
    o = f"{PAR}/{os.path.basename(f)[:-5]}.json"
    if os.path.exists(o): continue
    if time.time() - t0 > budget: break
    json.dump(parse(f), open(o, "w")); print("leído", os.path.basename(f), round(time.time() - t0))
pend = [f for f in files if not os.path.exists(f"{PAR}/{os.path.basename(f)[:-5]}.json")]
print("pendientes:", len(pend))
if pend: sys.exit(0)
P = [json.load(open(p)) for p in sorted(glob.glob(f"{PAR}/*.json"))]
P.sort(key=lambda p: p["fecha"]); per = [p["fecha"] for p in P]
claves = ["total", "mujeres", "autonomos", "agrario", "hogar"] + [k for k, *_ in SECT]
out = {"periodos": per, "claves": claves, "series": {}}
codes = set().union(*[p["datos"] for p in P])
for c in codes:
    if c.endswith("000") or c[2:] in ("999",): continue   # «no consta municipio»
    out["series"][c] = {k: [round(p["datos"].get(c, {}).get(k, 0)) if c in p["datos"] else None for p in P] for k in claves}
out["espana"] = {per[i]: round(sum(d.get("total", 0) for d in p["datos"].values())) for i, p in enumerate(P)}
json.dump(out, open(f"{HERE}/cache/out_series_ss.json", "w"), separators=(",", ":"))
print("municipios:", len(out["series"]), out["espana"])
