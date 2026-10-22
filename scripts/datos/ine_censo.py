"""Censo anual de población del INE (municipios de 500 habitantes o más): mercado laboral, sectores, ocupaciones,
estado civil, arraigo e inmigración reciente. Lee los CSV completos de INEbase (descargar_ine.sh) y escribe cache/out/censo.json.
Tablas: 67078 relación con la actividad · 69992 actividad económica · 69991 ocupación · 69993 situación profesional ·
76306 estado civil · 70382 residencia anterior · 70381 año de llegada a España.  Uso: python3 ine_censo.py"""
import json, os, re
HERE = os.path.dirname(os.path.abspath(__file__)); os.makedirs(f"{HERE}/cache/out", exist_ok=True)
def num(v):
    v = v.strip().replace(".", "").replace(",", ".")
    try: return float(v)
    except ValueError: return None
def leer(tabla):
    """Itera (código, dimensiones…, periodo, valor) de un CSV de INEbase."""
    with open(f"{HERE}/cache/t{tabla}.csv", encoding="utf-8-sig") as f:
        next(f)
        for linea in f:
            p = linea.rstrip("\n").split(";")
            m = re.match(r"(\d{5}) ", p[0])
            if m and p[-1] != "":
                v = num(p[-1])
                if v is not None: yield (m.group(1), *p[1:-1], v)
def pct(a, b): return round(a / b * 100, 1) if a is not None and b else None
D = {}   # código → {clave: valor}
def put(code, k, v):
    if v is not None: D.setdefault(code, {})[k] = v

# 1) Relación con la actividad, 16–64 años (2021 y 2024)
EDAD1664 = {"De 16 a 19 años", "De 20 a 24 años", "De 25 a 29 años", "De 30 a 34 años", "De 35 a 39 años", "De 40 a 44 años",
            "De 45 a 49 años", "De 50 a 54 años", "De 55 a 59 años", "De 60 a 64 años"}
A = {}
for code, sexo, edad, rel, per, v in leer(67078):
    if per in ("2021", "2024") and edad in EDAD1664 | {"16 y más años"}:
        A.setdefault((code, per, sexo), {}).setdefault((edad == "16 y más años", rel), 0); A[(code, per, sexo)][(edad == "16 y más años", rel)] += v
def tasas(a):
    o, p, t = a.get((False, "Ocupado/a")), a.get((False, "Parado/a")), a.get((False, "Total"))
    return o, p, t
for (code, per, sexo), a in A.items():
    o, p, t = tasas(a)
    if sexo == "Total" and per == "2024":
        put(code, "empleo", pct(o, t))
        o16, p16 = a.get((True, "Ocupado/a")), a.get((True, "Parado/a"))
        put(code, "paroCensal", pct(p16, (o16 or 0) + (p16 or 0)) if o16 is not None and p16 is not None else None)
for code in {c for c, _, _ in A}:
    h, m = A.get((code, "2024", "Hombres")), A.get((code, "2024", "Mujeres"))
    if h and m:
        th, tm = pct(h.get((False, "Ocupado/a")), h.get((False, "Total"))), pct(m.get((False, "Ocupado/a")), m.get((False, "Total")))
        if th is not None and tm is not None: put(code, "brechaEmpleo", round(th - tm, 1)); put(code, "empleoMujeres", tm)
    a21, a24 = A.get((code, "2021", "Total")), A.get((code, "2024", "Total"))
    if a21 and a24:
        e21, e24 = pct(a21.get((False, "Ocupado/a")), a21.get((False, "Total"))), pct(a24.get((False, "Ocupado/a")), a24.get((False, "Total")))
        if e21 is not None and e24 is not None: put(code, "empleoVar", round(e24 - e21, 1))
print("actividad", len(D))

# 2) Actividad económica (CNAE, 2023): reparto de los ocupados por sector
S = {}
for code, sexo, act, per, v in leer(69992):
    if sexo == "Total" and per == "2023": S.setdefault(code, {})[act.split(" ")[0] if act != "Total CNAE" else "TOTAL"] = v
GR = {"agri": "A", "industria": "BCDE", "construccion": "F", "comercio": "GHI", "publico": "OPQ", "avanzados": "JKLMN"}
for code, s in S.items():
    t = s.get("TOTAL")
    for k, letras in GR.items():
        if t and all(l in s for l in letras if l in "ABCDEFGHIJKLMNOPQ"): put(code, k, pct(sum(s.get(l, 0) for l in letras), t))
print("sectores", len(S))

# 3) Ocupación (2023)
O = {}
for code, sexo, ocu, per, v in leer(69991):
    if sexo == "Total" and per == "2023": O.setdefault(code, {})["TOTAL" if ocu == "Total" else ocu.split(" ")[0]] = v
for code, o in O.items():
    t = o.get("TOTAL")
    if t:
        put(code, "directivos", pct((o.get("1", 0) + o.get("2", 0)), t)); put(code, "elementales", pct(o.get("9"), t))

# 4) Situación profesional (2023)
P = {}
for code, sexo, sit, per, v in leer(69993):
    if sexo == "Total" and per == "2023": P.setdefault(code, {})[sit] = v
for code, p in P.items():
    t, emp, sin = p.get("Total"), p.get("Trabajador por cuenta propia que emplea personal"), p.get("Trabajador por cuenta propia que no emplea personal")
    fijo, temp = p.get("Trabajador por cuenta ajena fijo o indefinido, y otra situación"), p.get("Trabajador por cuenta ajena temporal")
    if t and emp is not None and sin is not None: put(code, "autonomos", pct(emp + sin, t))
    if fijo is not None and temp is not None and fijo + temp: put(code, "temporales", pct(temp, fijo + temp))

# 5) Estado civil (2024)
E = {}
for code, edad, sexo, civ, per, v in leer(76306):
    if sexo == "Total" and per == "2024" and edad in ("16 y más años", "De 35 a 54 años"): E.setdefault(code, {})[(edad, civ)] = v
for code, e in E.items():
    t = e.get(("16 y más años", "Total"))
    put(code, "casados", pct(e.get(("16 y más años", "Casado/a")), t)); put(code, "divorciados", pct(e.get(("16 y más años", "Divorciado/a o separado/a")), t))
    put(code, "solteros3554", pct(e.get(("De 35 a 54 años", "Soltero/a")), e.get(("De 35 a 54 años", "Total"))))

# 6) Residencia anterior (2025) y llegada a España (2025)
R = {}
for code, res, sexo, edad, per, v in leer(70382):
    if sexo == "Total" and edad == "Todas las edades" and per == "2025": R.setdefault(code, {})[res] = v
for code, r in R.items():
    t = r.get("Total")
    put(code, "arraigo", pct(r.get("Siempre ha residido en el mismo municipio"), t)); put(code, "llegados", pct(r.get("Residía en otro municipio"), t))
L = {}
for code, ll, sexo, edad, per, v in leer(70381):
    if sexo == "Total" and edad == "Todas las edades" and per == "2025": L.setdefault(code, {})[ll] = v
for code, l in L.items():
    t = l.get("Total")
    if t and "Después de 2020" in l and "2011-2020" in l: put(code, "inmigReciente", pct(l["Después de 2020"] + l["2011-2020"], t))

# 7) Nivel de estudios (2024): 25 a 39 años y 25 a 59 años
G39 = {"De 25 a 29 años", "De 30 a 34 años", "De 35 a 39 años"}; G59 = G39 | {"De 40 a 49 años", "De 50 a 59 años"}
ES = {}
for code, sexo, edad, niv, per, v in leer(66620):
    if per == "2024" and edad in G59:
        d = ES.setdefault((code, sexo), {}); d[("59", niv)] = d.get(("59", niv), 0) + v
        if edad in G39: d[("39", niv)] = d.get(("39", niv), 0) + v
BASICOS = ("Educación primaria e inferior", "Primera etapa de Educación Secundaria y similar")
for (code, sexo), d in ES.items():
    t59, t39 = d.get(("59", "Total")), d.get(("39", "Total"))
    if sexo == "Total":
        put(code, "estudiosBasicos", pct(sum(d.get(("59", n), 0) for n in BASICOS), t59)); put(code, "superiores2539", pct(d.get(("39", "Educación superior")), t39))
for code in {c for c, _ in ES}:
    h, m = ES.get((code, "Hombres")), ES.get((code, "Mujeres"))
    if h and m and h.get(("39", "Total")) and m.get(("39", "Total")):
        put(code, "brechaSuperiores", round(pct(m.get(("39", "Educación superior")), m[("39", "Total")]) - pct(h.get(("39", "Educación superior")), h[("39", "Total")]), 1))

# 8) Relación con la actividad por nacionalidad (2024): pensionistas, estudiantes y paro de la población extranjera
N = {}
for code, sexo, nac, rel, per, v in leer(67079):
    if sexo == "Total" and per == "2024": N.setdefault(code, {})[(nac, rel)] = v
for code, n in N.items():
    t = n.get(("Total", "Total"))
    put(code, "pensionistas", pct(n.get(("Total", "Perceptor/a pensión de incapacidad, jubilación, prejubilación")), t)); put(code, "estudiantes", pct(n.get(("Total", "Estudiante")), t))
    paro = {}
    for nac in ("Española", "Extranjera"):
        o, pa = n.get((nac, "Ocupado/a")), n.get((nac, "Parado/a"))
        if o is not None and pa is not None and o + pa >= 50: paro[nac] = pct(pa, o + pa)
    if "Extranjera" in paro: put(code, "paroExtranjeros", paro["Extranjera"])
    if len(paro) == 2: put(code, "brechaParoExtr", round(paro["Extranjera"] - paro["Española"], 1))

INDICADORES = [
 ("empleo", "Tasa de empleo (16 a 64 años)", "Trabajo", "pct", "INE, Censo anual de población, 2024"),
 ("empleoMujeres", "Tasa de empleo de las mujeres (16 a 64 años)", "Trabajo", "pct", "INE, Censo anual de población, 2024"),
 ("brechaEmpleo", "Brecha de empleo entre hombres y mujeres", "Trabajo", "pts", "INE, Censo anual de población, 2024 (puntos de diferencia entre las tasas de empleo de 16 a 64 años)"),
 ("empleoVar", "Cambio de la tasa de empleo desde 2021", "Trabajo", "pts", "INE, Censo anual de población, 2021–2024"),
 ("paroCensal", "Tasa de paro (según el censo)", "Trabajo", "pct", "INE, Censo anual de población, 2024"),
 ("temporales", "Asalariados con contrato temporal", "Trabajo", "pct", "INE, Censo anual de población, 2023"),
 ("autonomos", "Trabajadores por cuenta propia", "Trabajo", "pct", "INE, Censo anual de población, 2023"),
 ("directivos", "Directivos y profesionales científicos", "Trabajo", "pct", "INE, Censo anual de población, 2023 (% de ocupados)"),
 ("elementales", "Ocupaciones elementales", "Trabajo", "pct", "INE, Censo anual de población, 2023 (% de ocupados)"),
 ("agri", "Ocupados en agricultura, ganadería y pesca", "Trabajo", "pct", "INE, Censo anual de población, 2023"),
 ("industria", "Ocupados en la industria y la energía", "Trabajo", "pct", "INE, Censo anual de población, 2023"),
 ("construccion", "Ocupados en la construcción", "Trabajo", "pct", "INE, Censo anual de población, 2023"),
 ("comercio", "Ocupados en comercio, transporte y hostelería", "Trabajo", "pct", "INE, Censo anual de población, 2023"),
 ("avanzados", "Ocupados en servicios avanzados", "Trabajo", "pct", "INE, Censo anual de población, 2023 (información, finanzas, inmobiliarias, profesionales y administrativas)"),
 ("publico", "Ocupados en administración, educación y sanidad", "Trabajo", "pct", "INE, Censo anual de población, 2023"),
 ("estudiosBasicos", "Solo estudios básicos (25 a 59 años)", "Educación", "pct", "INE, Censo anual de población, 2024 (primaria o ESO como máximo)"),
 ("superiores2539", "Titulados superiores de 25 a 39 años", "Educación", "pct", "INE, Censo anual de población, 2024"),
 ("brechaSuperiores", "Brecha de titulados superiores (mujeres menos hombres, 25 a 39)", "Educación", "pts", "INE, Censo anual de población, 2024 (puntos de diferencia)"),
 ("pensionistas", "Adultos con pensión de jubilación o incapacidad", "Trabajo", "pct", "INE, Censo anual de población, 2024 (% de 16 y más años)"),
 ("estudiantes", "Adultos que estudian", "Educación", "pct", "INE, Censo anual de población, 2024 (% de 16 y más años)"),
 ("paroExtranjeros", "Tasa de paro de la población extranjera", "Trabajo", "pct", "INE, Censo anual de población, 2024 (solo municipios con al menos 50 activos extranjeros)"),
 ("brechaParoExtr", "Brecha de paro entre extranjeros y españoles", "Trabajo", "pts", "INE, Censo anual de población, 2024 (puntos de diferencia entre las tasas de paro)"),
 ("casados", "Personas casadas", "Población", "pct", "INE, Censo anual de población, 2024 (% de 16 y más años)"),
 ("divorciados", "Personas divorciadas o separadas", "Población", "pct", "INE, Censo anual de población, 2024 (% de 16 y más años)"),
 ("solteros3554", "Solteros de 35 a 54 años", "Población", "pct", "INE, Censo anual de población, 2024"),
 ("arraigo", "Siempre han vivido en el municipio", "Población", "pct", "INE, Censo anual de población, 2025"),
 ("llegados", "Vivían antes en otro municipio", "Población", "pct", "INE, Censo anual de población, 2025"),
 ("inmigReciente", "Llegados a España desde 2011", "Población", "pct", "INE, Censo anual de población, 2025"),
]
json.dump({"indicadores": INDICADORES, "datos": D}, open(f"{HERE}/cache/out/censo.json", "w"), ensure_ascii=False)
print(len(D), "municipios;", {k: sum(1 for d in D.values() if k in d) for k, *_ in INDICADORES})
