"""Indicadores municipales para el laboratorio a partir de las series limpias de otras fuentes.

Lee cache/out_series_{sepe,ss,mivau,deuda}.json (de sepe_series.py, ss_series.py, mivau.py y hacienda_deuda.py) y escribe
cache/out/otras.json con la forma que espera construir.py. Después: python3 construir.py otras

Umbrales mínimos para no dar porcentajes con muy pocos casos (se indican en la fuente de cada indicador)."""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__)); C = f"{HERE}/cache"
ix = json.load(open(f"{HERE}/../../data/index.json", encoding="utf-8")); F = {k: i for i, k in enumerate(ix["fields"])}
POP = {r[F["code"]]: r[F["pop"]] for r in ix["rows"]}
L = lambda f: json.load(open(f"{C}/{f}"))
datos = {}; IND = []


def put(code, k, v):
    if v is not None: datos.setdefault(code, {})[k] = v


def pc(a, b, nd=1): return round(a / b * 100, nd) if a is not None and b else None


def chg(a, b): return round((b / a - 1) * 100, 1) if a and b is not None else None


# --- SEPE: contratos y paro registrado ---
se = L("out_series_sepe.json"); Y = se["years"]; iy = {y: i for i, y in enumerate(Y)}
for c, s in se["series"].items():
    g = lambda k, y: (s.get(k) or [None] * len(Y))[iy[y]]
    def temp(y):
        i, t = (g("contrIndefH", y) or 0) + (g("contrIndefM", y) or 0), (g("contrTempH", y) or 0) + (g("contrTempM", y) or 0)
        return (pc(t, i + t), i + t) if g("contr", y) is not None else (None, 0)
    t25, n25 = temp(2025); t21, n21 = temp(2021)
    if n25 >= 100: put(c, "contrTemp25", t25)
    if n25 >= 100 and n21 >= 100: put(c, "contrTempVar", round(t25 - t21, 1))
    p07, p25 = g("paro", 2007), g("paro", 2025)
    if p07 and p07 >= 20 and p25 is not None: put(c, "paroVar07", chg(p07, p25))
SRC_SEPE = "SEPE, contratos registrados por municipio del centro de trabajo"
IND += [("contrTemp25", "Contratos iniciales que son temporales (2025)", "Trabajo", "pct", SRC_SEPE + ", suma de 2025 (municipios con al menos 100 contratos)"),
        ("contrTempVar", "Cambio en los contratos temporales desde 2021 (reforma laboral)", "Trabajo", "pts",
         SRC_SEPE + ", % de contratos iniciales temporales en 2025 menos el de 2021, en puntos"),
        ("paroVar07", "Cambio del paro registrado desde 2007", "Trabajo", "pct_chg", "SEPE, paro registrado, media de 2025 frente a la de 2007 (municipios con al menos 20 parados en 2007)")]

# --- Seguridad Social: afiliados por sector (diciembre) ---
ss = L("out_series_ss.json"); P = ss["periodos"]; i25, i11 = P.index("202512"), P.index("201112")
for c, s in ss["series"].items():
    t = s["total"][i25]
    if not t or t < 100: continue
    for k, ks in [("afilIndustria", ["industria"]), ("afilHosteleria", ["hosteleria"]), ("afilComercio", ["comercio"]), ("afilPublico", ["publico"]),
                  ("afilProfesional", ["info", "finanzas", "profesional"]), ("afilConstruccion", ["construccion"]), ("afilMujeres", ["mujeres"])]:
        put(c, k, pc(sum(s[x][i25] or 0 for x in ks), t))
    t11 = s["total"][i11]
    if t11 and t11 >= 100: put(c, "afilVar11", chg(t11, t))
SRC_SS = "Seguridad Social, afiliados por municipio y actividad, diciembre de 2025 (donde está el centro de trabajo; municipios con al menos 100 afiliados)"
IND += [("afilIndustria", "Afiliados que trabajan en la industria", "Sectores", "pct", SRC_SS),
        ("afilConstruccion", "Afiliados que trabajan en la construcción", "Sectores", "pct", SRC_SS),
        ("afilComercio", "Afiliados que trabajan en el comercio", "Sectores", "pct", SRC_SS),
        ("afilHosteleria", "Afiliados que trabajan en la hostelería", "Sectores", "pct", SRC_SS),
        ("afilProfesional", "Afiliados en servicios profesionales, financieros y de información", "Sectores", "pct", SRC_SS),
        ("afilPublico", "Afiliados en administración, educación y sanidad", "Sectores", "pct", SRC_SS),
        ("afilMujeres", "Mujeres entre los afiliados", "Trabajo", "pct", SRC_SS),
        ("afilVar11", "Cambio en el número de afiliados desde 2011", "Trabajo", "pct_chg", "Seguridad Social, afiliados en diciembre de 2025 frente a diciembre de 2011 (municipios con al menos 100)")]

# --- Ministerio de Vivienda: compraventas y valor tasado ---
mv = L("out_series_mivau.json"); Y = mv["years"]; iy = {y: i for i, y in enumerate(Y)}
for c, s in mv["series"].items():
    g = lambda k, ys: [s[k][iy[y]] for y in ys] if k in s and all(s[k][iy[y]] is not None for y in ys) else None
    pop = POP.get(c)
    a = g("compraventas", [2023, 2024, 2025])
    if a and pop and pop >= 500: put(c, "compHab", round(sum(a) / 3 / pop * 1000, 1))
    t, n, p = g("compraventas", range(2021, 2026)), g("compNueva", range(2021, 2026)), g("compProtegida", range(2021, 2026))
    if t and sum(t) >= 50:
        if n: put(c, "compNueva", pc(sum(n), sum(t)))
        if p: put(c, "compProtegida", pc(sum(p), sum(t)))
    b = g("compraventas", [2017, 2018, 2019])
    if a and b and sum(b) / 3 >= 20: put(c, "compVar", chg(sum(b), sum(a)))
    v = s.get("valorTasado")
    if v:
        put(c, "valorTasado", v[iy[2025]])
        if v[iy[2015]] and v[iy[2025]]: put(c, "valorTasadoVar", chg(v[iy[2015]], v[iy[2025]]))
SRC_MV = "Ministerio de Vivienda, transacciones inmobiliarias de vivienda por municipio (datos de los notarios)"
IND += [("compHab", "Compraventas de vivienda por cada 1.000 habitantes", "Vivienda", "num1", SRC_MV + ", media anual de 2023 a 2025"),
        ("compNueva", "Compraventas de vivienda nueva", "Vivienda", "pct", SRC_MV + ", % de las compraventas de 2021 a 2025 (al menos 50)"),
        ("compProtegida", "Compraventas de vivienda protegida", "Vivienda", "pct", SRC_MV + ", % de las compraventas de 2021 a 2025 (al menos 50)"),
        ("compVar", "Cambio en las compraventas de vivienda", "Vivienda", "pct_chg", SRC_MV + ", media de 2023–2025 frente a la de 2017–2019"),
        ("valorTasado", "Valor tasado de la vivienda libre (€/m²)", "Vivienda", "eur", "Ministerio de Vivienda, valor tasado medio de 2025, municipios de más de 25.000 habitantes"),
        ("valorTasadoVar", "Subida del valor tasado de la vivienda desde 2015", "Vivienda", "pct_chg", "Ministerio de Vivienda, valor tasado medio, 2015–2025, municipios de más de 25.000 habitantes")]

# --- Hacienda: deuda viva del ayuntamiento ---
de = L("out_series_deuda.json"); Y = de["years"]; i25 = Y.index(2025)
for c, v in de["series"].items():
    pop = POP.get(c)
    if pop and v[i25] is not None: put(c, "deudaHab", round(v[i25] / pop))
IND += [("deudaHab", "Deuda del ayuntamiento por habitante", "Ayuntamiento", "eur", "Ministerio de Hacienda, deuda viva a 31 de diciembre de 2025, entre los habitantes del padrón")]

os.makedirs(f"{C}/out", exist_ok=True)
json.dump({"indicadores": IND, "datos": datos}, open(f"{C}/out/otras.json", "w"), ensure_ascii=False)
print(len(datos), "municipios;", {k: sum(1 for d in datos.values() if k in d) for k, *_ in IND})
