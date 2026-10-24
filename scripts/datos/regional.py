"""Indicadores oficiales por provincia y comunidad autónoma (data/regional.json).

Lee las tablas del INE ya compactadas (cache/ine_compacto/<id>.json.gz, de ine_api.py + ine_compactar.py),
elige de cada una la serie que interesa, la pasa a años (media o suma de meses/trimestres, solo años completos)
y la guarda con el código INE de provincia (01–52) y de comunidad (01–19).

    python3 scripts/datos/regional.py

Las tasas por habitante usan el padrón por provincia de data/refs.json (población a 1 de enero).
"""
import gzip
import json
import os
import re
import unicodedata

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
SRC = os.path.join(ROOT, "scripts", "datos", "cache", "ine_compacto")
OUT = os.path.join(ROOT, "data", "regional.json")


def norm(s):
    s = unicodedata.normalize("NFD", str(s)).encode("ascii", "ignore").decode().lower()
    s = s.split("/")[0]
    m = re.match(r"^(.*), (el|la|los|las|a|o|l'|illes)$", s.strip())
    if m:
        s = m.group(2) + " " + m.group(1)
    return re.sub(r"[^a-z]", "", s)


PROVS = json.load(open(os.path.join(ROOT, "data", "index.json")))["provs"]
PROV_BY_NAME = {norm(n): c for c, n in PROVS.items()}
PROV_BY_NAME.update({norm("Balears, Illes"): "07", norm("Coruña, A"): "15", norm("Palmas, Las"): "35", norm("Rioja, La"): "26",
                     norm("Santa Cruz de Tenerife"): "38", norm("Araba/Álava"): "01", norm("Ávila"): "05", norm("Bizkaia"): "48",
                     norm("Gipuzkoa"): "20", norm("Valencia/València"): "46", norm("Castellón/Castelló"): "12", norm("Alicante/Alacant"): "03",
                     norm("Ceuta"): "51", norm("Melilla"): "52"})
CCAA = {"01": "Andalucía", "02": "Aragón", "03": "Asturias", "04": "Illes Balears", "05": "Canarias", "06": "Cantabria",
        "07": "Castilla y León", "08": "Castilla-La Mancha", "09": "Cataluña", "10": "Comunitat Valenciana", "11": "Extremadura",
        "12": "Galicia", "13": "Madrid", "14": "Murcia", "15": "Navarra", "16": "País Vasco", "17": "La Rioja", "18": "Ceuta", "19": "Melilla"}
CCAA_KEYS = [("andaluc", "01"), ("aragon", "02"), ("asturias", "03"), ("balears", "04"), ("canarias", "05"), ("cantabria", "06"),
             ("castillayleon", "07"), ("castillalamancha", "08"), ("catalu", "09"), ("valencian", "10"), ("extremadura", "11"),
             ("galicia", "12"), ("madrid", "13"), ("murcia", "14"), ("navarra", "15"), ("vasco", "16"), ("rioja", "17"),
             ("ceuta", "18"), ("melilla", "19")]
PROV_CCAA = {"04": "01", "11": "01", "14": "01", "18": "01", "21": "01", "23": "01", "29": "01", "41": "01", "22": "02", "44": "02", "50": "02",
             "33": "03", "07": "04", "35": "05", "38": "05", "39": "06", "05": "07", "09": "07", "24": "07", "34": "07", "37": "07", "40": "07",
             "42": "07", "47": "07", "49": "07", "02": "08", "13": "08", "16": "08", "19": "08", "45": "08", "08": "09", "17": "09", "25": "09",
             "43": "09", "03": "10", "12": "10", "46": "10", "06": "11", "10": "11", "15": "12", "27": "12", "32": "12", "36": "12", "28": "13",
             "30": "14", "31": "15", "01": "16", "20": "16", "48": "16", "26": "17", "51": "18", "52": "19"}


def ccaa_code(name):
    n = norm(name)
    for k, c in CCAA_KEYS:
        if k in n:
            return c
    return None


def load(tid):
    with gzip.open(os.path.join(SRC, f"{tid}.json.gz"), "rt", encoding="utf-8") as f:
        return json.load(f)


def geo_of(dims, d):
    """('prov', '28') | ('ccaa', '13') | ('es', 'ES') según las columnas geográficas de la serie."""
    row = dict(zip(dims, d))
    for k, v in row.items():
        if v is None:
            continue
        if k.lower().startswith("provincia"):
            c = PROV_BY_NAME.get(norm(v))
            return ("prov", c) if c else (None, v)
    for k, v in row.items():
        if v is None:
            continue
        if k.lower().startswith("comunidades"):
            c = ccaa_code(v)
            return ("ccaa", c) if c else (None, v)
    return ("es", "ES")


def anual(periodos, valores, how):
    """De mensual/trimestral a anual: solo años completos. how = 'mean' | 'sum' | 'last'."""
    by = {}
    for p, v in zip(periodos, valores):
        if v is None:
            continue
        by.setdefault(p[:4], []).append((p, v))
    out = {}
    for y, xs in by.items():
        sub = xs[0][0][4:]
        need = 12 if sub.startswith("M") else 4 if sub.startswith("T") else 1
        if sub.startswith("S"):
            need = 2
        if len(xs) < need and how != "last":
            continue
        vs = [v for _, v in xs]
        out[y] = round(sum(vs) / len(vs), 3) if how == "mean" else round(sum(vs), 3) if how == "sum" else round(xs[-1][1], 3)
    return out


def pick(tid, where, how="mean", combine=None):
    """Series de la tabla tid que cumplen where ({columna: valor o lista}); combine='sum' suma varias series del mismo sitio."""
    t = load(tid)
    dims = t["dims"]
    res = {}
    for s in t["series"]:
        row = dict(zip(dims, s["d"]))
        ok = True
        for k, want in where.items():
            v = row.get(k)
            if callable(want):
                ok = want(v)
            elif isinstance(want, list):
                ok = v in want
            else:
                ok = v == want
            if not ok:
                break
        if not ok:
            continue
        lvl, code = geo_of(dims, s["d"])
        if lvl is None:
            print(f"  {tid}: territorio sin código: {code}")
            continue
        a = anual(t["periodos"], s["v"], how)
        cur = res.setdefault((lvl, code), {})
        if combine == "sum":
            for y, v in a.items():
                cur[y] = round(cur.get(y, 0) + v, 3)
        else:
            if cur:
                print(f"  {tid}: más de una serie para {lvl} {code}; uso la primera")
                continue
            cur.update(a)
    return res


VARS = {}
DATA = {"prov": {}, "ccaa": {}, "es": {}}


def put(key, label, unidad, tabla, res, nota=""):
    VARS[key] = {"l": label, "u": unidad, "tabla": tabla, "nota": nota,
                 "escalas": sorted({lvl for (lvl, _) in res})}
    for (lvl, code), serie in res.items():
        if serie:
            DATA[lvl].setdefault(code, {})[key] = serie
    n = {lvl: sum(1 for (l, _) in res if l == lvl) for lvl in ("prov", "ccaa", "es")}
    print(f"{key}: {n}")


def per_hab(res, por=1000):
    """Divide por la población de cada provincia (padrón) y año; para comunidades suma sus provincias."""
    refs = json.load(open(os.path.join(ROOT, "data", "refs.json")))
    py = refs["padYears"]
    pad_prov = {p: dict(zip(map(str, py), refs["prov"][p]["pad"])) for p in refs["prov"]}
    out = {}
    for (lvl, code), serie in res.items():
        provs = [code] if lvl == "prov" else [p for p, c in PROV_CCAA.items() if c == code] if lvl == "ccaa" else list(pad_prov)
        s2 = {}
        for y, v in serie.items():
            pob = sum((pad_prov.get(p, {}).get(y) or 0) for p in provs)
            if pob:
                s2[y] = round(v / pob * por, 3)
        out[(lvl, code)] = s2
    return out


def main():
    amb = "Ambos sexos"
    # Mercado de trabajo (EPA)
    put("paro_epa", "Tasa de paro (EPA)", "%", 65349, pick(65349, {"Tipo de dato": "Tasa de paro de la población", "Sexo": amb}))
    put("paro_epa_mujeres", "Tasa de paro de las mujeres (EPA)", "%", 65349, pick(65349, {"Tipo de dato": "Tasa de paro de la población", "Sexo": "Mujeres"}))
    put("actividad_epa", "Tasa de actividad (EPA)", "%", 65349, pick(65349, {"Tipo de dato": "Tasa de actividad", "Sexo": amb}))
    put("empleo_epa", "Tasa de empleo (EPA)", "%", 65349, pick(65349, {"Tipo de dato": "Tasa de empleo de la población", "Sexo": amb}))
    put("paro_jovenes", "Tasa de paro de menores de 25 años (EPA)", "%", 65334, pick(65334, {"Semiintervalos de edad": "Menores de 25 años", "Sexo": amb}))
    put("temporalidad", "Asalariados con contrato temporal (EPA)", "% de asalariados", 65328,
        pick(65328, {"Tipo de contrato o relación laboral": "Temporal: Total", "Tipo de dato": "Porcentaje", "Sexo": amb}))
    # Economía
    put("pib_pc", "PIB por habitante", "€", 82285, pick(82285, {"Tipo de dato": "Dato base"}, "last"))
    put("empresas", "Empresas por cada 1.000 habitantes", "por 1.000 hab.", 73021,
        per_hab(pick(73021, {"Condición jurídica": lambda v: v and not v.lower().startswith("total")}, "last", combine="sum")))
    # Vivienda e hipotecas
    put("hipotecas_viv", "Hipotecas sobre viviendas por cada 1.000 habitantes", "por 1.000 hab. y año", 76317,
        per_hab(pick(76317, {"Naturaleza de la finca": "Viviendas", "Concepto financiero": "Número de hipotecas"}, "sum")))
    num = pick(76317, {"Naturaleza de la finca": "Viviendas", "Concepto financiero": "Número de hipotecas"}, "sum")
    imp = pick(76317, {"Naturaleza de la finca": "Viviendas", "Concepto financiero": "Importe de hipotecas"}, "sum")
    put("hipoteca_media", "Importe medio de la hipoteca sobre vivienda", "miles de €", 76317,
        {k: {y: round(imp[k][y] / num[k][y], 1) for y in imp.get(k, {}) if num[k].get(y)} for k in num})
    put("vt_viviendas", "Viviendas turísticas (INE, plataformas)", "viviendas", 39364, pick(39364, {"Concepto turístico": "Viviendas turísticas"}, "last"))
    # Turismo
    put("pernoct_hotel", "Pernoctaciones hoteleras por habitante", "noches por hab. y año", 2074,
        per_hab(pick(2074, {"Concepto turístico": "Pernoctaciones", "RESIDENCIA/ORIGEN": "Total"}, "sum"), 1))
    put("pernoct_extranj", "Pernoctaciones hoteleras de residentes en el extranjero (% del total)", "%", 2074,
        (lambda tot, ext: {k: {y: round(ext[k][y] / tot[k][y] * 100, 1) for y in ext.get(k, {}) if tot.get(k, {}).get(y)} for k in tot})(
            pick(2074, {"Concepto turístico": "Pernoctaciones", "RESIDENCIA/ORIGEN": "Total"}, "sum"),
            pick(2074, {"Concepto turístico": "Pernoctaciones", "RESIDENCIA/ORIGEN": "Residentes en el Extranjero"}, "sum")))
    # Precios
    put("ipc", "IPC, índice general", "índice", 24081, pick(24081, {"Índices y Tasas": "Índice"}))
    # Migraciones
    for k, lab, tipo in [("saldo_exterior", "Saldo migratorio con el extranjero", "Saldo exterior"),
                         ("saldo_interior", "Saldo migratorio con el resto de España", "Saldo interior")]:
        put(k, lab + " por cada 1.000 habitantes", "por 1.000 hab.", 69764,
            per_hab(pick(69764, {"Saldo migratorio": tipo, "Sexo": amb, "Nacionalidad": "Total", "Totales de edad": "Total", "Grupos de edad": None})))
    # Demografía
    for tid, k, lab, u in [(1470, "natalidad", "Tasa bruta de natalidad", "por 1.000 hab."),
                           (1482, "mortalidad", "Tasa bruta de mortalidad", "por 1.000 hab.")]:
        put(k, lab, u, tid, pick(tid, {}))
    put("fecundidad", "Hijos por mujer (indicador coyuntural de fecundidad)", "hijos por mujer", 1478, pick(1478, {"Orden de nacimiento": "Todos"}))
    # Condiciones de vida (comunidades)
    put("pobreza_ecv", "Tasa de riesgo de pobreza (ECV)", "%", 49148,
        pick(49148, {"Conceptos demógraficos": "Tasa de riesgo de pobreza (renta del año anterior a la entrevista)"}))
    put("arope", "Riesgo de pobreza o exclusión social (AROPE)", "%", 55266,
        pick(55266, {"Conceptos demógraficos": "Tasa de riesgo de pobreza o exclusión social (indicador AROPE)"}))
    put("fin_de_mes", "Hogares que llegan a fin de mes con dificultad o mucha dificultad", "% de hogares", 9993,
        pick(9993, {"Dificultad para llegar a fin de mes": ["Con dificultad", "Con mucha dificultad"]}, combine="sum"))
    put("vacantes", "Vacantes de empleo", "puestos", 6064, pick(6064, {}))

    # Comunidades de una sola provincia: el dato de la comunidad vale para la provincia y al revés
    uni = {"03": "33", "04": "07", "06": "39", "13": "28", "14": "30", "15": "31", "17": "26", "18": "51", "19": "52"}
    for cc, pp in uni.items():
        a, b = DATA["ccaa"].setdefault(cc, {}), DATA["prov"].setdefault(pp, {})
        for k in set(a) | set(b):
            if k not in b and k in a:
                b[k] = a[k]
            if k not in a and k in b:
                a[k] = b[k]
    out = {"fuente": "INE (API JSON). Ver scripts/datos/ine_api.py y regional.py", "provs": PROVS, "ccaa": CCAA, "provCcaa": PROV_CCAA,
           "vars": VARS, "data": DATA}
    with open(OUT, "w") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    print("→", OUT, os.path.getsize(OUT) // 1024, "KB")


if __name__ == "__main__":
    main()
