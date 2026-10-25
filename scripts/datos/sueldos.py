"""Sueldos y renta por tramos (data/sueldos.json), para el análisis «¿Dónde estás tú?».

Tablas del INE ya compactadas (ine_api.py + ine_compactar.py):
  66252  EPA: salario bruto mensual del empleo principal, media y límite inferior de cada decil (2006–2024)
  66238, 66239, 66240, 66241, 66246  EPA: media de cada decil por sexo, edad, nacionalidad, comunidad y tipo de contrato
  28191  Encuesta Anual de Estructura Salarial: media, percentiles 10, 25, 50, 75 y 90 de la ganancia anual, por sexo y comunidad (2008–2024)
  28182  EES: trabajadores según su ganancia en múltiplos del salario mínimo (2008–2024)
  9957   Encuesta de Condiciones de Vida: límite inferior de cada decil de renta por unidad de consumo (2008–2025)
  9951   ECV: personas por decil de renta, edad y sexo
    python3 scripts/datos/sueldos.py
"""
import gzip, json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); SRC = f"{HERE}/cache/ine_compacto"
sys.path.insert(0, HERE)
from regional import ccaa_code
def load(t): return json.load(gzip.open(f"{SRC}/{t}.json.gz", "rt", encoding="utf-8"))
def dk(x): return 0 if x == "Total" else int(x)   # 0 = todos los asalariados
def rows(t):
    d = load(t)
    for s in d["series"]: yield dict(zip(d["dims"], s["d"])), [None if x is None else round(x, 1) for x in s["v"]], d["periodos"]
out = {"fuente": "INE: EPA (salarios por deciles), Encuesta Anual de Estructura Salarial, Encuesta de Condiciones de Vida"}
# EPA deciles
epa = {"años": None, "media": {}, "limite": {}}
for r, v, P in rows(66252):
    epa["años"] = P; d = dk(r["Decil de salarios"])
    (epa["media"] if r["Medidas estadísticas"] == "Media" else epa["limite"])[d] = v
def by(t, dim, keep=lambda r: True):
    res = {}
    for r, v, P in rows(t):
        if r.get("Tipo de jornada") != "Total" or not keep(r): continue
        k = r.get(dim)
        if k is None: continue
        res.setdefault(k, {})[dk(r["Decil de salarios"])] = v
    return res
epa["sexo"] = by(66238, "Sexo")
edad = {}
for r, v, P in rows(66239):
    if r.get("Tipo de jornada") != "Total": continue
    k = r.get("Grupos de edad") or r.get("Semiintervalos de edad") or ("Total" if r.get("Totales de edad") else None)
    if k: edad.setdefault(k, {})[dk(r["Decil de salarios"])] = v
epa["edad"] = edad
epa["nacionalidad"] = by(66240, "Nacionalidad")
cc = {}
for r, v, P in rows(66241):
    if r.get("Tipo de jornada") != "Total": continue
    c = "ES" if r.get("Total Nacional") else ccaa_code(r.get("Comunidades y Ciudades Autónomas") or "")
    if c: cc.setdefault(c, {})[dk(r["Decil de salarios"])] = v
epa["ccaa"] = cc
epa["contrato"] = by(66246, "Tipo de contrato o relación laboral")
out["epa"] = epa
# EES percentiles
ees = {"años": None, "es": {}, "mujeres": {}, "hombres": {}, "ccaa": {}}
for r, v, P in rows(28191):
    if r.get("Tipo de dato") != "Dato base": continue
    ees["años"] = P; k = r.get("Percentiles simples") or r.get("Medidas estadísticas")
    sx = r.get("Sexo"); c = r.get("Comunidades y Ciudades Autónomas")
    if c:
        if sx == "Ambos sexos": ees["ccaa"].setdefault(ccaa_code(c), {})[k] = v
    else: ees[{"Ambos sexos": "es", "Mujeres": "mujeres", "Hombres": "hombres"}[sx]][k] = v
out["ees"] = ees
# múltiplos del SMI
smi = {}
for r, v, P in rows(28182):
    if r.get("Sexo") == "Ambos sexos" and r.get("Tipo de jornada") == "Total": smi[r["Múltiplos del Salario Mínimo Interprofesional"]] = v; smi_años = P
out["smiMult"] = {"años": smi_años, "tramos": smi}
# ECV
ecv = {"años": None, "limite": {}}
for r, v, P in rows(9957):
    ecv["años"] = P; ecv["limite"][r["Porcentajes de renta por unidad de consumo"]] = v
edadD = {}
for r, v, P in rows(9951):
    if r.get("Sexo") != "Ambos sexos": continue
    k = r.get("Grupos de edad") or r.get("Semiintervalos de edad") or ("Total" if r.get("Totales de edad") else None)
    if k: edadD.setdefault(k, {})[r["Porcentajes de renta por unidad de consumo"]] = v
ecv["edad"] = edadD
out["ecv"] = ecv
# salario mínimo (euros al mes, 14 pagas; BOE) y revalorización general de las pensiones (%), para comparar
out["smiLegal"] = {"2008": 600, "2009": 624, "2010": 633.3, "2011": 641.4, "2012": 641.4, "2013": 645.3, "2014": 645.3, "2015": 648.6, "2016": 655.2, "2017": 707.7,
                   "2018": 735.9, "2019": 900, "2020": 950, "2021": 950, "2022": 1000, "2023": 1080, "2024": 1134, "2025": 1184}
json.dump(out, open(f"{HERE}/../../data/sueldos.json", "w"), ensure_ascii=False, separators=(",", ":"))
print(epa["años"][0], epa["años"][-1], list(epa["edad"]), list(epa["contrato"]), len(cc), ees["años"][-1], list(ees["es"]), list(smi), ecv["años"][-1], list(ecv["limite"]), list(edadD))
print(os.path.getsize(f"{HERE}/../../data/sueldos.json") // 1024, "KB")
