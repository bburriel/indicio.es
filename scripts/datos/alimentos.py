"""Precio de los alimentos frente a los salarios y al resto de precios (data/alimentos.json).

Lee las tablas del INE ya compactadas (cache/ine_compacto, de ine_api.py + ine_compactar.py):
  76136  IPC por comunidad: general y grupos ECOICOP, mensual desde 2002 (base 2025)
  6061   ETCL: coste salarial total por trabajador y mes, por comunidad, trimestral desde 2008
  76128  IPC nacional por subclases (si está: pan, leche, aceite, huevos…), con 76159 (ponderaciones) y 76132 (a impuestos constantes)
    python3 scripts/datos/alimentos.py
"""
import gzip, json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__)); SRC = f"{HERE}/cache/ine_compacto"
sys.path.insert(0, HERE)
from regional import ccaa_code
def load(t):
    p = f"{SRC}/{t}.json.gz"
    return json.load(gzip.open(p, "rt", encoding="utf-8")) if os.path.exists(p) else None
def row(t, s): return dict(zip(t["dims"], s["d"]))
out = {"fuente": "INE: IPC (tablas 76136 y, si están, 76128, 76159 y 76132) y Encuesta Trimestral de Coste Laboral (6061)"}
# IPC general y grupos, España y comunidades
t = load(76136); P = t["periodos"]; out["meses"] = P
G = {"Índice general": "general", "Alimentos y bebidas no alcohólicas": "alimentos", "Vivienda, agua, electricidad, gas y otros combustibles": "vivienda",
     "Transporte": "transporte", "Restaurantes y servicios de alojamiento": "restaurantes", "Vestido y calzado": "vestido"}
ipc = {"es": {}, "ccaa": {}}
for s in t["series"]:
    r = row(t, s)
    if r.get("Índices y Tasas") != "Índice" or r.get("Grupos ECOICOP") not in G: continue
    k = G[r["Grupos ECOICOP"]]; v = [None if x is None else round(x, 3) for x in s["v"]]
    if r.get("Totales Territoriales") == "Nacional" and not r.get("Comunidades y Ciudades Autónomas"): ipc["es"][k] = v
    else:
        c = ccaa_code(r.get("Comunidades y Ciudades Autónomas") or "")
        if c: ipc["ccaa"].setdefault(c, {})[k] = v
out["ipc"] = ipc
# coste salarial total por trabajador (euros al mes), trimestral
t = load(6061); sal = {"periodos": t["periodos"], "es": None, "ccaa": {}}
for s in t["series"]:
    r = row(t, s)
    if r.get("Componentes del coste") != "Coste salarial total" or not r.get("AGRUPACIONES CNAE"): continue
    if r.get("Total Nacional") == "Total Nacional" and not r.get("Comunidades y Ciudades Autónomas"): sal["es"] = s["v"]
    else:
        c = ccaa_code(r.get("Comunidades y Ciudades Autónomas") or "")
        if c: sal["ccaa"][c] = s["v"]
out["salario"] = sal
# subclases de alimentos (si se han descargado)
t = load(76128)
if t:
    sub = {"periodos": t["periodos"], "s": {}}
    for s in t["series"]:
        r = row(t, s)
        if r.get("Tipo de dato", r.get("Índices y Tasas")) not in ("Índice", None) and "Índice" not in json.dumps(r, ensure_ascii=False): continue
        name = next((v for k, v in r.items() if v and re.match(r"^01\d{2,}", str(v))), None)
        if not name: continue
        if "Índice" not in [v for v in r.values()]: continue
        sub["s"][name] = [None if x is None else round(x, 3) for x in s["v"]]
    w = load(76159)
    if w:
        sub["pesos"] = {}
        for s in w["series"]:
            r = row(w, s); name = next((v for k, v in r.items() if v and re.match(r"^01\d{2,}", str(v))), None)
            if name: sub["pesos"][name] = {p: x for p, x in zip(w["periodos"], s["v"]) if x is not None}
    tc = load(76132)
    if tc:
        sub["impConst"] = {}
        for s in tc["series"]:
            r = row(tc, s); name = next((v for k, v in r.items() if v and re.match(r"^01\d{2,}", str(v))), None)
            if name and "Índice" in r.values(): sub["impConst"][name] = {"periodos": tc["periodos"], "v": [None if x is None else round(x, 3) for x in s["v"]]}
    out["subclases"] = sub
    print("subclases:", len(sub["s"]), list(sub["s"])[:8])
json.dump(out, open(f"{HERE}/../../data/alimentos.json", "w"), ensure_ascii=False, separators=(",", ":"))
print(P[0], P[-1], list(ipc["es"]), len(ipc["ccaa"]), sal["periodos"][-1], len(sal["ccaa"]), os.path.getsize(f"{HERE}/../../data/alimentos.json") // 1024, "KB")
print("alimentos ES:", ipc["es"]["alimentos"][P.index("2021M01")], ipc["es"]["alimentos"][-1], "general", ipc["es"]["general"][P.index("2021M01")], ipc["es"]["general"][-1])
print("salario ES:", sal["es"][sal["periodos"].index("2021T1")], sal["es"][-1])
