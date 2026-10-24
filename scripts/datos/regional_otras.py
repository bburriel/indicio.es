"""Indicadores por provincia y comunidad que no vienen del INE, para regional.py.

Fuentes (ya limpias por otros scripts o leídas aquí):
- Ministerio de Vivienda: compraventas por municipio (mivau.py), compras por extranjeros (Tabla 1.6), precio del suelo urbano
  (Tabla 4), viviendas libres iniciadas (Tabla 3.1) y viviendas protegidas con calificación definitiva (Tabla 1.6 de vivienda protegida).
- SEPE: contratos iniciales indefinidos y temporales por municipio (sepe_series.py).
- Seguridad Social: afiliados por municipio en diciembre (ss_series.py).
- Hacienda: deuda viva de los ayuntamientos (hacienda_deuda.py).
- Ministerio de Sanidad: camas instaladas en hospitales (Catálogo Nacional de Hospitales).
- Eurostat: abandono escolar temprano, población con estudios superiores, renta disponible de los hogares y PIB por habitante en
  paridad de poder de compra, paro de larga duración.
Cada función devuelve {(nivel, código): {año: valor}} con nivel 'prov' | 'ccaa' | 'es', como pick() de regional.py."""
import csv, glob, json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__)); C = f"{HERE}/cache"
sys.path.insert(0, HERE)
from geo import prov_code


def agg_mun(series, years, key, ccaa_of, ys=None):
    """Suma por provincia, comunidad y España una serie municipal {código: {clave: [valores por año]}}."""
    res = {}
    for c, d in series.items():
        v = d.get(key)
        if not v: continue
        p = c[:2]
        for y, x in zip(years, v):
            if x is None or (ys and y not in ys): continue
            for k in (("prov", p), ("ccaa", ccaa_of.get(p)), ("es", "ES")):
                if k[1]: res.setdefault(k, {})[str(y)] = res.get(k, {}).get(str(y), 0) + x
    return res


def ratio(a, b, f=100, nd=1):
    return {k: {y: round(a[k][y] / b[k][y] * f, nd) for y in a[k] if b.get(k, {}).get(y)} for k in a if k in b}


def geo_row(name, ccaa_code):
    n = str(name).strip()
    if not n: return None
    if n.upper().startswith("TOTAL"): return ("es", "ES")
    c = ccaa_code(n)
    if c: return ("ccaa", c)
    p = prov_code(n)
    return ("prov", p) if p else None


def tabla_anual(f, ccaa_code, hdr_row=10, first=11):
    """Tablas provinciales del MIVAU con un año por columna (o trimestres: se promedian si es un precio)."""
    import xlrd
    s = xlrd.open_workbook(f).sheet_by_index(0); res = {}
    yrs = {}
    for j, v in enumerate(s.row_values(hdr_row)):
        m = re.search(r"(\d{4})", str(v))
        if m: yrs[j] = m.group(1)
    for r in range(first, s.nrows):
        row = s.row_values(r); g = geo_row(row[1], ccaa_code)
        if not g: continue
        for j, y in yrs.items():
            try: res.setdefault(g, {})[y] = float(row[j])
            except (TypeError, ValueError): pass
    return res


def suelo(ccaa_code):
    """Precio medio del m² de suelo urbano (Tabla 4): media de los trimestres de cada año con 4 trimestres."""
    import xlrd
    s = xlrd.open_workbook(f"{C}/externos/mivau/36400500.XLS").sheet_by_index(0)
    cols = []; y = None
    for j, v in enumerate(s.row_values(10)):
        m = re.search(r"(\d{4})", str(v))
        if m: y = m.group(1)
        if y and str(s.row_values(12)[j]).strip(): cols.append((j, y))
    res = {}
    for r in range(13, s.nrows):
        row = s.row_values(r); g = geo_row(row[1], ccaa_code)
        if not g: continue
        by = {}
        for j, y in cols:
            try: by.setdefault(y, []).append(float(row[j]))
            except (TypeError, ValueError): pass
        res[g] = {y: round(sum(v) / len(v), 1) for y, v in by.items() if len(v) == 4}
    return res


def extranjeros(ccaa_code):
    """% de compraventas de vivienda hechas por extranjeros (residentes extranjeros + no residentes), Tabla 1.6, suma de trimestres."""
    import xlrd
    w = xlrd.open_workbook(f"{C}/externos/mivau/340101d0.XLS"); tot = {}; ext = {}; nq = {}
    for s in w.sheets():
        m = re.match(r"\s*(\d)t\s*(\d{4})", s.name)
        if not m: continue
        y = m.group(2); h12 = [str(x).strip() for x in s.row_values(12)]; h13 = [str(x).strip() for x in s.row_values(13)]
        try:
            jt = h12.index("TOTAL"); jnr = next(j for j, x in enumerate(h12) if x.lower().startswith("no resid")); jre = h13.index("Extranjeros")
        except (ValueError, StopIteration): print("  extranjeros: cabecera rara en", s.name); continue
        for r in range(14, s.nrows):
            row = s.row_values(r); g = geo_row(row[1], ccaa_code)
            if not g: continue
            try: t, e = float(row[jt]), float(row[jre]) + float(row[jnr])
            except (TypeError, ValueError): continue
            tot.setdefault(g, {})[y] = tot.get(g, {}).get(y, 0) + t; ext.setdefault(g, {})[y] = ext.get(g, {}).get(y, 0) + e
            nq.setdefault(g, {})[y] = nq.get(g, {}).get(y, 0) + 1
    tot = {g: {y: v for y, v in d.items() if nq[g][y] == 4} for g, d in tot.items()}
    return ratio(ext, tot)


def camas(ccaa_code):
    res = {}
    with open(f"{C}/externos/sanidad/hospitales.csv", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            p = prov_code(r["Provincia"])
            try: n = float(r["Número de camas instaladas"])
            except ValueError: continue
            if p: res[("prov", p)] = res.get(("prov", p), 0) + n
    return res


EU = f"{C}/eurostat"
NUTS3 = {"ES111": "15", "ES112": "27", "ES113": "32", "ES114": "36", "ES120": "33", "ES130": "39", "ES211": "01", "ES212": "20", "ES213": "48",
         "ES220": "31", "ES230": "26", "ES241": "22", "ES242": "44", "ES243": "50", "ES300": "28", "ES411": "05", "ES412": "09", "ES413": "24",
         "ES414": "34", "ES415": "37", "ES416": "40", "ES417": "42", "ES418": "47", "ES419": "49", "ES421": "02", "ES422": "13", "ES423": "16",
         "ES424": "19", "ES425": "45", "ES431": "06", "ES432": "10", "ES511": "08", "ES512": "17", "ES513": "25", "ES514": "43", "ES521": "03",
         "ES522": "12", "ES523": "46", "ES531": "07", "ES532": "07", "ES533": "07", "ES611": "04", "ES612": "11", "ES613": "14", "ES614": "18",
         "ES615": "21", "ES616": "23", "ES617": "29", "ES618": "41", "ES620": "30", "ES630": "51", "ES640": "52", "ES703": "38", "ES704": "35",
         "ES705": "35", "ES706": "38", "ES707": "38", "ES708": "35", "ES709": "38"}
NUTS2 = {"ES11": "12", "ES12": "03", "ES13": "06", "ES21": "16", "ES22": "15", "ES23": "17", "ES24": "02", "ES30": "13", "ES41": "07", "ES42": "08",
         "ES43": "11", "ES51": "09", "ES52": "10", "ES53": "04", "ES61": "01", "ES62": "14", "ES63": "18", "ES64": "19", "ES70": "05"}


def jsonstat(name, fix):
    """Serie de un JSON-stat de Eurostat fijando todas las dimensiones salvo geo y time → {geo: {año: valor}}."""
    d = json.load(open(f"{EU}/{name}.json")); ids = d["id"]; size = d["size"]
    idx = {k: d["dimension"][k]["category"]["index"] for k in ids}
    idx = {k: (v if isinstance(v, dict) else {c: i for i, c in enumerate(v)}) for k, v in idx.items()}
    mult = [1] * len(ids)
    for i in range(len(ids) - 2, -1, -1): mult[i] = mult[i + 1] * size[i + 1]
    base = 0
    for i, k in enumerate(ids):
        if k in ("geo", "time"): continue
        want = fix.get(k)
        if want is None:
            if size[i] == 1: continue
            raise ValueError(f"{name}: falta fijar {k} ({list(idx[k])[:6]})")
        base += idx[k][want] * mult[i]
    gi, ti = ids.index("geo"), ids.index("time"); out = {}
    vals = d["value"]
    for g, gp in idx["geo"].items():
        for t, tp in idx["time"].items():
            pos = str(base + gp * mult[gi] + tp * mult[ti])
            v = vals.get(pos) if isinstance(vals, dict) else (vals[int(pos)] if int(pos) < len(vals) else None)
            if v is not None: out.setdefault(g, {})[t] = v
    return out


def eu_ccaa(name, fix, nd=1):
    s = jsonstat(name, fix); res = {}
    for g, c in NUTS2.items():
        if g in s: res[("ccaa", c)] = {y: round(v, nd) for y, v in s[g].items()}
    if "ES" in s: res[("es", "ES")] = {y: round(v, nd) for y, v in s["ES"].items()}
    return res


def eu_prov_pib():
    """PIB por habitante en PPC (UE-27 = 100) por provincia: suma PIB en PPC y población de las islas de Baleares y Canarias."""
    pib = jsonstat("nama_10r_3gdp", {"unit": "MIO_PPS_EU27_2020"}); pc = jsonstat("nama_10r_3gdp", {"unit": "PPS_EU27_2020_HAB"})
    eu = pc.get("EU27_2020", {}); res = {}
    by = {}
    for g, p in NUTS3.items():
        for y, v in pib.get(g, {}).items():
            if pc.get(g, {}).get(y):
                a = by.setdefault(p, {}).setdefault(y, [0, 0]); a[0] += v; a[1] += v * 1e6 / pc[g][y]
    for p, d in by.items():
        res[("prov", p)] = {y: round(a[0] * 1e6 / a[1] / eu[y] * 100, 1) for y, a in d.items() if eu.get(y)}
    for g, c in NUTS2.items():
        if g in pc: res[("ccaa", c)] = {y: round(v / eu[y] * 100, 1) for y, v in pc[g].items() if eu.get(y)}
    res[("es", "ES")] = {y: round(v / eu[y] * 100, 1) for y, v in pc.get("ES", {}).items() if eu.get(y)}
    return res


def europa():
    """Comparación con Europa: países de la UE y regiones NUTS 2 de toda la UE (data/europa.json)."""
    ind = {
        "paro": ("Tasa de paro", "%", "lfst_r_lfu3rt", {"isced11": "TOTAL", "sex": "T", "age": "Y15-74", "unit": "PC"}),
        "paro_jovenes": ("Tasa de paro de 15 a 24 años", "%", "lfst_r_lfu3rt", {"isced11": "TOTAL", "sex": "T", "age": "Y15-24", "unit": "PC"}),
        "empleo": ("Tasa de empleo de 20 a 64 años", "%", "lfst_r_lfe2emprt", {"sex": "T", "age": "Y20-64", "unit": "PC"}),
        "paro_larga": ("Parados de larga duración (% de la población activa)", "%", "lfst_r_lfu2ltu",
                       {"isced11": "TOTAL", "sex": "T", "age": "Y15-74", "unit": "PC_ACT"}),
        "abandono": ("Abandono temprano de la educación (18–24 años)", "%", "edat_lfse_16", {"sex": "T", "unit": "PC", "age": "Y18-24"}),
        "superiores": ("Población de 25 a 64 años con estudios superiores", "%", "edat_lfse_04", {"sex": "T", "isced11": "ED5-8", "age": "Y25-64", "unit": "PC"}),
        "pib_pps": ("PIB por habitante (paridad de poder de compra, UE = 100)", "UE = 100", "nama_10r_2gdp", {"unit": "PPS_EU27_2020_HAB"}),
        "renta_pps": ("Renta disponible de los hogares por habitante (PPC)", "PPC", "nama_10r_2hhinc", {"unit": "PPS_EU27_2020_HAB", "direct": "BAL", "na_item": "B6N"}),
        "pobreza": ("Tasa de riesgo de pobreza", "%", "ilc_li41", {"unit": "PC"}),
        "arope": ("Riesgo de pobreza o exclusión social (AROPE)", "%", "ilc_peps11n", {"unit": "PC"}),
        "esperanza": ("Esperanza de vida al nacer", "años", "demo_r_mlifexp", {"unit": "YR", "sex": "T", "age": "Y_LT1"}),
        "fecundidad": ("Hijos por mujer", "hijos", "demo_r_frate2", {"unit": "NR", "age": "TOTAL"}),
        "pernoct": ("Pernoctaciones turísticas por 1.000 habitantes", "por 1.000 hab.", "tour_occ_nin2", {"c_resid": "TOTAL", "unit": "P_THAB", "nace_r2": "I551-I553"}),
    }
    out = {"vars": {}, "data": {}}
    for k, (l, u, ds, fix) in ind.items():
        try: s = jsonstat(ds, fix)
        except Exception as e: print("  europa:", k, e); continue
        if k == "pib_pps":
            eu = s.get("EU27_2020", {}); s = {g: {y: round(v / eu[y] * 100, 1) for y, v in d.items() if eu.get(y)} for g, d in s.items()}
        out["vars"][k] = {"l": l, "u": u, "fuente": f"Eurostat ({ds})"}
        for g, d in s.items():
            if len(g) <= 4 or g.startswith("EU"):   # países (2 letras), regiones NUTS 2 (4) y agregados UE
                out["data"].setdefault(g, {})[k] = {y: round(v, 2) for y, v in d.items() if int(y) >= 2010}
    # nombres de las regiones
    lab = json.load(open(f"{EU}/lfst_r_lfu3rt.json"))["dimension"]["geo"]["category"]["label"]
    out["nombres"] = {g: n for g, n in lab.items() if g in out["data"]}
    return out
