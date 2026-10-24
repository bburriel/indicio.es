"""Series anuales por municipio del SEPE (paro registrado y contratos), 2005–2026.

Lee los Excel mensuales «Paro registrado y contratos por municipios» que deja externos.py en
cache/externos/sepe_municipios/ (uno por mes, una hoja de paro y otra de contratos por provincia).

Paso 1 (por fichero, con caché en cache/externos/sepe_parsed/): extrae por municipio
  paro: total, <25, 25-44, >=45, mujeres, agri, ind, constr, serv, sin empleo anterior
  contratos: total, iniciales indefinidos, iniciales temporales, conversiones, agri, ind, constr, serv
Hasta 2012 los ficheros no traen el código INE: se casa por nombre dentro de la provincia con los
nombres de los ficheros que sí lo traen (y con data/index.json).
Paso 2: medias anuales de paro y sumas anuales de contratos → cache/out/sepe_series.json
Uso: python3 sepe_series.py [segundos]   (se puede relanzar: sigue donde lo dejó)"""
import difflib, glob, json, os, re, sys, time, unicodedata
import xlrd
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = f"{HERE}/cache/externos/sepe_municipios"; PAR = f"{HERE}/cache/externos/sepe_parsed6"
os.makedirs(PAR, exist_ok=True); os.makedirs(f"{HERE}/cache/out", exist_ok=True)
MESES = {m: i + 1 for i, m in enumerate("enero febrero marzo abril mayo junio julio agosto septiembre octubre noviembre diciembre".split())}
def norm(s):
    s = unicodedata.normalize("NFD", str(s).upper()); s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = re.sub(r"\(.*?\)", " ", s); s = s.split("/")[0]; s = re.sub(r",\s*MUN$", "", s.strip())
    s = re.sub(r"[^A-Z0-9 ,]", " ", s)
    m = re.match(r"^(.*),\s*(EL|LA|LOS|LAS|L|O|A|OS|AS|ES|SA|SES|ELS|LES|LO)$", s.strip())
    if m: s = m.group(2) + " " + m.group(1)
    s = re.sub(r"^(EL|LA|LOS|LAS|L|O|A|OS|AS|ES|SA|SES|ELS|LES|LO)\s+", "", s.strip())
    return re.sub(r"[ ,]+", " ", s).strip()
def num(v):
    if isinstance(v, (int, float)): return float(v)
    v = str(v).strip()
    if v.startswith("<"): return 2.0
    if v == "": return 0.0
    try: return float(v)
    except ValueError: return None
def mes_de(f):
    m = re.search(r"_(\d{4})_([A-Za-z]+)", os.path.basename(f)); return int(m.group(1)), MESES[m.group(2).lower()]
def prov_de(name):   # nombre de la hoja → provincia normalizada
    return norm(re.sub(r"^(PARO|CONTRATOS)\s+", "", name))
def parse(f):
    wb = xlrd.open_workbook(f); out = {"paro": {}, "contr": {}, "sinCod": {}, "_sin": {}}
    for ws in wb.sheets():
        kind = "paro" if ws.name.upper().startswith("PARO") else "contr" if ws.name.upper().startswith("CONTR") else None
        if not kind or ws.nrows < 9: continue
        rows = [ws.row_values(r) for r in range(8, ws.nrows)]
        rows = [r for r in rows if str(r[1]).strip() and not re.match(r"^(TOTAL\b|FUENTE\s*:|NOTA|\(\*)", str(r[1]).strip().upper())
                and not (str(r[0]).strip() == "" and str(r[1]).strip().endswith("."))]   # la última fila (nombre de la provincia con punto) es el total
        if not rows: continue
        ncol = max(len(r) for r in rows)
        sin = []
        keep = [c for c in range(2, ncol) if any(c < len(r) and str(r[c]) != "" for r in rows)]
        for r in rows:
            v = [num(r[c]) if c < len(r) else 0.0 for c in keep]
            want = 13 if kind == "paro" else 11   # total + 6 sexo/edad + 4 sectores (+ sin empleo) | total + 6 tipo + 4 sectores
            if len(v) < want - (1 if kind == "paro" else 0): continue
            v = v[:want]
            try: code = f"{int(float(r[0])):05d}"
            except (ValueError, TypeError): code = None
            if code: out[kind][code] = v
            else: sin.append([norm(r[1]), v])
            if code: out.setdefault("names", {})[code] = [prov_de(ws.name), norm(r[1])]
        if sin: out["_sin"].setdefault(kind, {}).setdefault(prov_de(ws.name), []).extend(sin)
    for kind, pvs in out.pop("_sin").items():
        for pv, sin in pvs.items(): out["sinCod"].setdefault(kind, {})[pv] = sin
    return out
budget = float(sys.argv[1]) if len(sys.argv) > 1 else 1e9; t0 = time.time()
files = sorted(f for f in glob.glob(f"{SRC}/*.xls") if os.path.getsize(f) > 100000)
pend = [f for f in files if not os.path.exists(f"{PAR}/{'%d-%02d' % mes_de(f)}.json")]
for f in pend:
    if time.time() - t0 > budget: break
    y, m = mes_de(f)
    try: json.dump(parse(f), open(f"{PAR}/{y}-{m:02d}.json", "w"))
    except Exception as e: print("FALLO", f, e)
pend = [f for f in files if not os.path.exists(f"{PAR}/{'%d-%02d' % mes_de(f)}.json")]
print("ficheros:", len(files), "pendientes:", len(pend))
if pend: sys.exit(0)
# --- paso 2 ---
parsed = {os.path.basename(p)[:-5]: json.load(open(p)) for p in sorted(glob.glob(f"{PAR}/*.json"))}
names = {}
for d in parsed.values():
    for code, (pv, nm) in d.get("names", {}).items(): names.setdefault(pv, {})[nm] = code
ix = json.load(open(f"{HERE}/../../data/index.json")); F = {k: i for i, k in enumerate(ix["fields"])}
validos = {r[F["code"]] for r in ix["rows"]}
byprov = {}
for r in ix["rows"]: byprov.setdefault(r[F["code"]][:2], {})[norm(r[F["name"]])] = r[F["code"]]
provcode = {}   # provincia normalizada (nombre de hoja) → código de 2 cifras, por los códigos de los ficheros nuevos
for pv, d in names.items():
    cs = [c[:2] for c in d.values()]; provcode[pv] = max(set(cs), key=cs.count)
sinmatch = {}
ALIAS = {"VILLARREAL": "VILA REAL", "SAN NICOLAS DE TOLENTINO": "ALDEA DE SAN NICOLAS", "SAN ILDEFONSO": "REAL SITIO DE SAN ILDEFONSO",
         "LEGUTIANO": "LEGUTIO", "LLODIO": "LAUDIO LLODIO", "COLLADO": "COLLADO DE LA VERA", "AJAMIL": "AJAMIL DE CAMEROS", "OLZA": "OLTZA ZENDEA",
         "ORCOYEN": "ORKOIEN", "YERRI": "DEIERRI YERRI", "PASSANANT": "PASSANANT I BELLTALL", "VIMBODI": "VIMBODI I POBLET", "RETAMOSO": "RETAMOSO DE LA JARA",
         "VILLADECANES": "VILLADECANES", "PUEBLA DE DON FRANCISCO": "PUEBLA DE DON FRANCISCO", "VERACRUZ": "BEANUI", "ALFARA DE ALGIMIA": "ALFARA DE LA BARONIA",
         "SAN JUAN DE ENOVA": "SANT JOAN DE L ENOVA"}
PROV_ALIAS = {"VIZCAYA": "48", "BIZKAIA": "48", "GUIPUZCOA": "20", "GIPUZKOA": "20", "GIPUZCOA": "20", "ALAVA": "01", "ARABA": "01", "ORENSE": "32", "OURENSE": "32",
              "LERIDA": "25", "LLEIDA": "25", "GERONA": "17", "GIRONA": "17", "BALEARES": "07", "BALEARS": "07", "ILLES BALEARS": "07", "CORUNA": "15",
              "RIOJA": "26", "PALMAS": "35", "STA CRUZ TENER": "38", "SANTA CRUZ DE TENERIFE": "38", "CASTELLON": "12", "VALENCIA": "46", "ALICANTE": "03"}
provcode.update(PROV_ALIAS)
mensual = {"paro": {}, "contr": {}}
for ym, d in parsed.items():
    for kind in ("paro", "contr"):
        M = mensual[kind].setdefault(ym, {})
        for c, v in d[kind].items():
            if c in validos: M[c] = v
        for pv, rows in d.get("sinCod", {}).get(kind, {}).items():
            pc = provcode.get(pv)
            coded = sum(1 for c in d[kind] if c[:2] == pc)
            for nm, v in rows:
                if coded: continue   # en los ficheros con código, las filas sin código son totales
                c = names.get(pv, {}).get(nm) or (byprov.get(pc, {}).get(nm) if pc else None) or (byprov.get(pc, {}).get(norm(ALIAS[nm])) if pc and nm in ALIAS else None)
                if not c and pc:
                    cand = difflib.get_close_matches(nm, list(byprov.get(pc, {})), n=1, cutoff=0.88)
                    if cand: c = byprov[pc][cand[0]]
                if c and c in validos: M[c] = v
                else: sinmatch[(pv, nm)] = sinmatch.get((pv, nm), 0) + 1
print("sin casar (nombre, meses):", len(sinmatch), sorted(sinmatch.items(), key=lambda x: -x[1])[:25])
years = list(range(2006, 2027))
def anual(kind, idx, how):
    res = {}
    for y in years:
        ms = [k for k in mensual[kind] if k.startswith(str(y))]
        if not ms: continue
        codes = set().union(*[mensual[kind][k] for k in ms])
        for c in codes:
            vals = [mensual[kind][k][c][idx] for k in ms if c in mensual[kind][k] and mensual[kind][k][c][idx] is not None and idx < len(mensual[kind][k][c])]
            if len(vals) < len(ms): continue
            s = sum(vals); res.setdefault(c, {})[y] = round(s / len(vals), 1) if how == "mean" else round(s)
    return res
mesesY = {y: len([k for k in mensual["contr"] if k.startswith(str(y))]) for y in years}
PARO = {"paro": 0, "paroH25": 1, "paroM25": 4, "paroAgri": 7, "paroInd": 8, "paroConstr": 9, "paroServ": 10}
CONTR = {"contr": 0, "contrIndefH": 1, "contrTempH": 2, "convH": 3, "contrIndefM": 4, "contrTempM": 5, "convM": 6}
ser = {}
for k, i in PARO.items(): ser[k] = anual("paro", i, "mean")
for k, i in CONTR.items(): ser[k] = anual("contr", i, "sum")
out = {"years": years, "meses": mesesY, "series": {}}
for k, d in ser.items():
    for c, yv in d.items():
        out["series"].setdefault(c, {})[k] = [yv.get(y) for y in years]
# totales de España por mes (para validar y para el análisis de la reforma laboral)
tot = {}
for ym in sorted(mensual["contr"]):
    C = mensual["contr"][ym]; P = mensual["paro"].get(ym, {})
    tot[ym] = {"contr": round(sum(v[0] for v in C.values() if v[0])), "indef": round(sum((v[1] or 0) + (v[4] or 0) for v in C.values())),
               "temp": round(sum((v[2] or 0) + (v[5] or 0) for v in C.values())), "conv": round(sum((v[3] or 0) + (v[6] or 0) for v in C.values())),
               "paro": round(sum(v[0] for v in P.values() if v[0])), "nmun": len(C)}
out["espana"] = tot
# mensual por municipio de los contratos (iniciales indefinidos y temporales) desde 2019, para el análisis de la reforma
mens = {}
for ym in sorted(k for k in mensual["contr"] if k >= "2019-01"):
    for c, v in mensual["contr"][ym].items():
        mens.setdefault(c, {})[ym] = [round((v[1] or 0) + (v[4] or 0)), round((v[2] or 0) + (v[5] or 0))]
out["mensual"] = {"periodos": sorted(k for k in mensual["contr"] if k >= "2019-01"), "datos": {c: [d.get(p, [None, None]) for p in sorted(k for k in mensual["contr"] if k >= "2019-01")] for c, d in mens.items()}}
json.dump(out, open(f"{HERE}/cache/out_series_sepe.json", "w"), separators=(",", ":"))
print("municipios:", len(out["series"]), "meses por año:", mesesY)
for ym in ["2007-06", "2013-01", "2019-06", "2021-06", "2022-06", "2023-06", "2026-09"]:
    print(ym, tot.get(ym))
