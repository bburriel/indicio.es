"""Datos para la serie de vivienda (data/vivienda.json): precios, alquiler, esfuerzo, oferta y demanda, y comparación con Europa.

Fuentes ya descargadas (ine_api.py + ine_compactar.py, eurostat.py, externos.py):
  INE 80271   IPV: índice de precios de vivienda por comunidad, medias anuales (2007–)
  INE 59058   IPVA: índice de precios de vivienda en alquiler, nacional y por provincia (2011–)
  INE 69337   Indicadores urbanos: alquiler mensual medio por ciudad, hogares y viviendas (Catastro)
  INE 76845   ECV: hogares por régimen de tenencia, por comunidad (2004–)
  INE 49145   ECV: renta media por persona y por unidad de consumo, por comunidad (2008–)
  INE 54562   Proyección de hogares (2026–)
  MIVAU       valor tasado medio de la vivienda libre (€/m², trimestral, por comunidad y provincia, 1995–);
              viviendas libres iniciadas y terminadas (1991–); viviendas protegidas terminadas (1991–)
  Eurostat    prc_hpi_a, ilc_lvho07c, ilc_lvps08, yth_demo_030, nama_10_an6, lfst_hhnhtych, demo_gind, ilc_lvho02, ilc_mded01
    python3 scripts/datos/vivienda.py
"""
import gzip
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__)); C = f"{HERE}/cache"; SRC = f"{C}/ine_compacto"
sys.path.insert(0, HERE)
from regional import ccaa_code  # noqa: E402
from regional_otras import geo_row, tabla_anual  # noqa: E402


def load(t): return json.load(gzip.open(f"{SRC}/{t}.json.gz", "rt", encoding="utf-8"))


def rows(t):
    d = load(t)
    for s in d["series"]: yield dict(zip(d["dims"], s["d"])), s["v"], d["periodos"]


def ser(v, P, nd=1): return {p: round(x, nd) for p, x in zip(P, v) if x is not None}


out = {"fuente": "INE (IPV, IPVA, ECV, indicadores urbanos, proyección de hogares), Ministerio de Vivienda (valor tasado, viviendas iniciadas y terminadas) y Eurostat",
       "es": {}, "ccaa": {}, "prov": {}, "ciudades": {}, "eu": {}}
ES, CC, PR = out["es"], out["ccaa"], out["prov"]

# --- IPV (compra) por comunidad ---
for r, v, P in rows(80271):
    if r["Índices y Tasas"] != "Media anual" or r["General, vivienda nueva y de segunda mano"] != "General": continue
    c = r.get("Comunidades y Ciudades Autónomas")
    (CC.setdefault(ccaa_code(c), {}) if c else ES)["ipv"] = ser(v, P)

# --- IPVA (alquiler) nacional y provincial ---
for r, v, P in rows(59058):
    if r["Tipo de dato"] != "Índice" or r.get("Tamaño de la vivienda") != "Total": continue
    p = r.get("Provincias")
    if p:
        g = geo_row(p, ccaa_code)
        if g and g[0] == "prov": PR.setdefault(g[1], {})["ipva"] = ser(v, P)
    else: ES["ipva"] = ser(v, P)

# --- Indicadores urbanos: alquiler mensual medio por ciudad; hogares y viviendas (Catastro) en España ---
for r, v, P in rows(69337):
    ind = r["Indicadores"]; m = r.get("Municipios"); sub = r.get("Subciudad")
    if sub or r.get("Sexo") not in (None, "Total"): continue
    if ind.startswith("Alquiler mensual medio"):
        (out["ciudades"].setdefault(m, {}) if m else ES)["alqMes"] = ser(v, P, 0)
    elif not m and ind.startswith("Número total de hogares"): ES["hogaresUrb"] = ser(v, P, 0)
    elif not m and ind.startswith("Número de viviendas convencionales según Catastro"): ES["viviendasCat"] = ser(v, P, 0)
out["ciudades"] = {k: v for k, v in out["ciudades"].items() if len(v.get("alqMes", {})) >= 5}

# --- tenencia (ECV) ---
TEN = {"Propiedad": "prop", "Propiedad con hipoteca": "hipoteca", "Propiedad sin hipoteca": "sinHipoteca", "Alquiler a precio de mercado": "alqMercado",
       "Alquiler inferior al precio de mercado": "alqSocial", "Cesión": "cesion"}
for r, v, P in rows(76845):
    k = TEN.get(r["Régimen de tenenecia de la vivienda principal"])
    if not k or r.get("Tipo de dato") != "Hogar": continue
    c = r.get("Comunidades y Ciudades Autónomas")
    (CC.setdefault(ccaa_code(c), {}) if c else ES).setdefault("tenencia", {})[k] = ser(v, P)

# --- renta (ECV): por persona y por unidad de consumo ---
for r, v, P in rows(49145):
    k = {"Renta neta media por persona": "rentaPersona", "Renta media por unidad de consumo": "rentaUC"}.get(r["SALDOS CONTABLES"])
    if not k: continue
    c = r.get("Comunidades y Ciudades Autónomas")
    (CC.setdefault(ccaa_code(c), {}) if c else ES)[k] = ser(v, P, 0)

# --- proyección de hogares ---
for r, v, P in rows(54562):
    if r.get("Composición del hogar") == "Total" and not r.get("Comunidades y Ciudades Autónomas") and not r.get("Provincias"):
        ES["hogaresProy"] = ser(v, P, 0)
    if r.get("Hogares y personas") == "Tamaño medio del hogar" and not r.get("Comunidades y Ciudades Autónomas") and not r.get("Provincias"):
        ES["tamHogarProy"] = ser(v, P, 2)

# --- MIVAU: valor tasado medio de vivienda libre (€/m²), media de los cuatro trimestres; todas las hojas ---
import datetime  # noqa: E402
import xlrd  # noqa: E402
ULT = datetime.date.today().year   # el año en curso no tiene los cuatro trimestres
w = xlrd.open_workbook(f"{C}/externos/mivau_extra/35101000.XLS"); vt = {}
for s in w.sheets():
    hdr = None
    for i in range(min(20, s.nrows)):
        if any(re.search(r"Año\s+\d{4}", str(x)) for x in s.row_values(i)): hdr = i; break
    if hdr is None: continue
    cols = []; y = None
    for j, x in enumerate(s.row_values(hdr)):
        m = re.search(r"(\d{4})", str(x))
        if m: y = m.group(1)
        if y and j > 1 and str(s.row_values(hdr + 2)[j]).strip(): cols.append((j, y))
    for i in range(hdr + 3, s.nrows):
        row = s.row_values(i); g = geo_row(row[1], ccaa_code)
        if not g: continue
        for j, y in cols:
            try: vt.setdefault(g, {}).setdefault(y, []).append(float(row[j]))
            except (TypeError, ValueError): pass
for g, d in vt.items():
    v = {y: round(sum(x) / len(x), 1) for y, x in d.items() if len(x) == 4 and int(y) < ULT}
    (ES if g[0] == "es" else (CC if g[0] == "ccaa" else PR).setdefault(g[1], {}))["valorTasado"] = v

# --- MIVAU: viviendas libres iniciadas y terminadas; protegidas terminadas (anual, 1991–) ---
for f, k in [("32200500", "iniciadas"), ("32201000", "terminadas"), ("31306000", "protegidas")]:
    for g, d in tabla_anual(f"{C}/externos/mivau_extra/{f}.XLS", ccaa_code).items():
        tgt = ES if g[0] == "es" else (CC if g[0] == "ccaa" else PR).setdefault(g[1], {})
        tgt[k] = {str(int(float(y))): round(x) for y, x in d.items()}

# --- Eurostat: España frente a Europa ---
sys.path.insert(0, f"{C}/eurostat")


def eload(code):
    d = json.load(open(f"{C}/eurostat/{code}.json")); ids, size, dim, val = d["id"], d["size"], d["dimension"], d["value"]
    def get(**kw):
        tpos = ids.index("time"); res = {}
        for t, ti in dim["time"]["category"]["index"].items():
            idx = 0
            for j, k in enumerate(ids):
                i = ti if k == "time" else (dim[k]["category"]["index"].get(kw[k]) if k in kw else 0)
                if i is None: return {}
                idx = idx * size[j] + i
            x = val.get(str(idx))
            if x is not None: res[t] = x
        return res
    return get


GEO = ["ES", "EU27_2020", "DE", "FR", "IT", "PT", "NL", "IE", "AT", "BE", "DK", "SE", "FI", "PL", "CZ", "GR", "HU"]
specs = {
    "hpi": ("prc_hpi_a", dict(purchase="TOTAL", unit="I15_A_AVG")),
    "sobrecargaInquilinos": ("ilc_lvho07c", dict(tenure="RENT_MKT")),
    "sobrecarga": ("ilc_lvho07c", dict(tenure="TOTAL")),
    "conPadres2534": ("ilc_lvps08", dict(age="Y25-34", sex="T")),
    "edadEmancipacion": ("yth_demo_030", dict(sex="T")),
    "inversionVivienda": ("nama_10_an6", dict(unit="PC_GDP", asset10="N111G")),
    "hogares": ("lfst_hhnhtych", dict(agechild="TOTAL", n_child="TOTAL", phhcomp="TOTAL")),
    "poblacion": ("demo_gind", dict(indic_de="JAN")),
    "alquiler": ("ilc_lvho02", dict(tenure="RENT", hhcomp="TOTAL", rskpovth="TOTAL")),
    "alquilerReducido": ("ilc_lvho02", dict(tenure="RENT_FR", hhcomp="TOTAL", rskpovth="TOTAL")),
    "pesoVivienda": ("ilc_mded01", dict(hhcomp="TOTAL", rskpovth="TOTAL")),
    "pesoViviendaPobres": ("ilc_mded01", dict(hhcomp="TOTAL", rskpovth="B_60")),
}
for k, (code, kw) in specs.items():
    g = eload(code)
    for geo in GEO:
        s = g(geo=geo, **kw)
        if s: out["eu"].setdefault(geo, {})[k] = {t: (round(x, 1) if isinstance(x, float) else x) for t, x in s.items() if int(t) >= 1995}

json.dump(out, open(f"{HERE}/../../data/vivienda.json", "w"), ensure_ascii=False, separators=(",", ":"))
print(os.path.getsize(f"{HERE}/../../data/vivienda.json") // 1024, "KB")
print("España:", {k: (list(v.items())[-3:] if isinstance(v, dict) else v) for k, v in ES.items() if k != "tenencia"})
print("ciudades:", sorted(out["ciudades"]), "\nprovincias:", sorted(PR, key=str), "\ncomunidades:", sorted(CC, key=str))
