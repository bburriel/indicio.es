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
# IPC anual (media de los doce meses) e nombres de comunidad, para que el análisis no tenga que descargar
# data/alimentos.json (435 KB) ni data/regional.json (850 KB) solo por esto. Hay que haber ejecutado antes alimentos.py y regional.py.
DATA = f"{HERE}/../../data"
_A = json.load(open(f"{DATA}/alimentos.json")); _R = json.load(open(f"{DATA}/regional.json"))
def _anual(v):
    r = {}
    for m, x in zip(_A["meses"], v):
        if x is not None: r.setdefault(m[:4], []).append(x)
    return {y: sum(a) / len(a) for y, a in r.items() if len(a) == 12}
_g, _al = _anual(_A["ipc"]["es"]["general"]), _anual(_A["ipc"]["es"]["alimentos"])
_ys = sorted(set(_g) & set(_al))
out["ipc"] = {"años": [int(y) for y in _ys], "general": [round(_g[y], 4) for y in _ys], "alimentos": [round(_al[y], 4) for y in _ys],
              "fuente": "INE, IPC: media anual de los índices mensuales (data/alimentos.json)"}
out["ccaaNombres"] = {c: _R["ccaa"][c] for c in ees["ccaa"] if c in _R["ccaa"]}
# Pesos de los sueldos por edad y hogares según ocupados: no están en cache/ine_compacto, se bajaron serie a serie de la API JSON del INE
# (servicios.ine.es/wstempus/js/ES/DATOS_SERIE/<COD>?nult=...). Se guardan aquí tal cual. Comprobaciones hechas al incorporarlos:
#   - asalariados por edad: los cinco grupos suman el total de la tabla en todos los años (±0,2 mil) y, ponderando los sueldos medios por edad
#     (tabla 66239) con estos pesos, sale la media total de esa tabla en los 19 años, con la misma cifra al decimal.
#   - hogares: la suma de las seis categorías (0, 1, 2, 3, 4, 5 o más ocupados) coincide con el total de hogares de cada trimestre (±0,35 mil).
# Series de asalariados (EPA, miles): total EPA691092; 16-24 EPA691114; 25-34 EPA691136; 35-44 EPA691158; 45-54 EPA690783; 55 y más EPA690805.
# Series de hogares (EPA 65270, miles): total EPA430572; con 0, 1, 2, 3, 4, 5 o más ocupados EPA430573 … EPA430578.
ASALARIADOS = {"De 16 a 24 años": [1866.8, 1861.3, 1686.0, 1306.4, 1121.3, 973.8, 782.9, 693.9, 680.4, 729.0, 753.6, 882.6, 915.9, 976.4, 820.6, 927.5, 1065.6, 1154.1, 1238.5], "De 25 a 34 años": [5282.4, 5434.7, 5263.5, 4806.3, 4552.1, 4323.6, 3889.2, 3593.4, 3466.9, 3354.3, 3390.4, 3365.4, 3399.8, 3437.2, 3204.4, 3352.2, 3518.5, 3719.0, 3763.8], "De 35 a 44 años": [4559.3, 4705.5, 4780.3, 4634.2, 4681.7, 4710.1, 4645.5, 4584.0, 4627.6, 4784.2, 4942.7, 4939.3, 4986.6, 4946.4, 4679.1, 4703.6, 4607.0, 4648.4, 4597.4], "De 45 a 54 años": [3204.5, 3389.3, 3476.5, 3497.8, 3575.9, 3661.6, 3589.2, 3552.3, 3651.7, 3862.2, 4025.3, 4168.8, 4399.6, 4592.8, 4586.7, 4687.7, 4870.5, 5095.6, 5270.9], "De 55 y más años": [1465.0, 1566.8, 1621.2, 1632.7, 1635.6, 1720.3, 1716.5, 1719.0, 1806.1, 2027.1, 2170.5, 2326.2, 2514.0, 2712.1, 2813.1, 2962.6, 3212.5, 3383.1, 3588.5]}
HOGARES = {"años": [2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025], "h0": [4892.1, 5498.3, 5812.5, 6063.8, 6518.5, 6782.7, 6790.2, 6627.0, 6526.8, 6416.8, 6331.9, 6278.7, 6502.7, 6335.6, 6292.1, 6304.8, 6270.7, 6273.6], "h1": [5666.4, 5996.4, 6142.4, 6268.4, 6356.6, 6456.8, 6466.6, 6444.1, 6369.5, 6326.4, 6227.8, 6197.0, 6414.8, 6334.9, 6476.2, 6493.7, 6530.0, 6570.1], "h2": [5098.9, 4815.9, 4725.5, 4715.3, 4505.0, 4343.4, 4445.6, 4615.7, 4809.1, 4952.0, 5125.7, 5261.5, 5008.2, 4998.4, 5136.8, 5305.9, 5413.4, 5454.6], "h3": [1086.8, 851.9, 768.6, 698.7, 591.6, 531.9, 529.3, 581.5, 616.7, 688.8, 745.6, 793.1, 716.2, 847.5, 929.2, 1017.2, 1035.4, 1153.8], "h4": [282.2, 193.8, 167.0, 131.7, 106.4, 89.6, 88.3, 96.6, 111.9, 116.0, 137.2, 152.8, 138.5, 193.1, 211.9, 215.5, 248.6, 260.5], "h5": [41.3, 28.2, 29.3, 19.4, 12.8, 8.1, 8.8, 11.0, 10.3, 12.4, 12.4, 13.4, 13.3, 36.6, 32.0, 31.9, 38.9, 46.9]}   # media anual de los cuatro trimestres, 2008–2025
out["asalariados"] = {"fuente": "INE, EPA: asalariados por grupo de edad (miles), tabla 66203, total nacional y jornada total; son los pesos de los sueldos medios por edad de la tabla 66239", "años": list(range(2006, 2025)), "grupos": ASALARIADOS}
out["hogares"] = {"fuente": "INE, EPA: hogares (miles) según el número de ocupados que viven en ellos, tabla 65270, media de los cuatro trimestres de cada año", **HOGARES}
# Más pesos para la paradoja de la composición (mismo procedimiento y mismas comprobaciones que ASALARIADOS):
#   sexo (tabla 66201): total EPA690655, hombres EPA690479, mujeres EPA690501.
#   nacionalidad (tabla 66205): total EPA691402, española EPA691424, española y doble nacionalidad EPA691445, extranjera EPA691467.
#   estudios (asalariados, tabla 66209): total EPA693705; analfabetos 693727, primarios incompletos 693749, primaria 693771, 1.ª etapa de secundaria 693793,
#     bachillerato 693815, FP 693837, superior 693859. Sueldo medio por nivel (tabla 66242): 707543, 707554, 707565, 707576, 707587, 707598, 707609. Solo desde 2014.
# Comprobado: las categorías suman el total y la media ponderada con el sueldo de cada categoría reproduce la media total a menos de 0,1 € (0,05 € en estudios).
ASAL_SEXO = {"Hombres": [9359.9, 9595.6, 9289.7, 8563.4, 8332.6, 8105.7, 7630.4, 7284.8, 7378.1, 7704.2, 8001.0, 8186.5, 8450.4, 8700.9, 8386.7, 8633.0, 8969.6, 9332.7, 9550.5], "Mujeres": [7018.2, 7362.0, 7537.8, 7314.0, 7234.0, 7283.6, 6992.8, 6857.8, 6854.7, 7052.5, 7281.4, 7495.9, 7765.5, 7963.9, 7717.1, 8000.6, 8304.5, 8667.5, 8908.6]}
ASAL_NAC = {"Española": [14140.1, 14363.4, 14152.6, 13425.8, 13260.0, 13035.8, 12570.2, 12181.3, 12374.4, 12785.4, 13195.7, 13354.3, 13861.4, 14043.9, 13609.2, 13898.4, 14294.3, 14559.3, 14762.4], "Española y doble nacionalidad": [102.5, 185.8, 211.5, 192.2, 226.0, 279.2, 268.9, 312.6, 309.2, 387.4, 434.9, 548.2, 494.6, 607.7, 616.1, 713.1, 810.7, 865.7, 961.8], "Extranjera": [2135.5, 2408.4, 2463.4, 2259.4, 2080.6, 2074.3, 1784.0, 1648.6, 1549.3, 1583.9, 1651.8, 1779.9, 1859.9, 2013.3, 1878.5, 2022.0, 2169.1, 2575.1, 2734.9]}
ESTUDIOS = {"años": [2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024], "asalariados": {"Analfabetos": [29.8, 32.6, 46.7, 38.7, 28.0, 29.3, 24.9, 45.7, 58.2, 45.7, 21.0], "Primarios incompletos": [144.7, 139.4, 156.0, 125.0, 127.1, 143.7, 97.6, 109.5, 141.0, 114.7, 120.9], "Primaria": [729.5, 650.3, 640.6, 642.3, 632.6, 618.3, 481.8, 564.7, 491.5, 560.7, 577.6], "Secundaria 1ª etapa": [3667.6, 3853.1, 3976.1, 4076.1, 4197.0, 4260.1, 3966.9, 3994.2, 4359.5, 4372.6, 4507.5], "Bachillerato": [1929.1, 2063.0, 2093.0, 2233.9, 2214.7, 2318.1, 2169.1, 2226.2, 2239.3, 2298.8, 2399.5], "FP": [1416.2, 1470.7, 1615.6, 1626.5, 1715.3, 1856.4, 1680.8, 1785.9, 1905.9, 1915.9, 2078.5], "Superior": [6315.9, 6547.7, 6754.3, 6939.9, 7301.2, 7439.0, 7682.8, 7907.3, 8078.5, 8691.8, 8754.0]}, "sueldo": {"Analfabetos": [988.6, 1099.3, 1149.2, 1193.7, 1056.3, 1259.1, 1282.2, 1157.7, 1347.8, 1390.6, 1610.2], "Primarios incompletos": [1105.5, 1133.6, 1144.8, 1162.9, 1188.3, 1274.1, 1306.2, 1341.0, 1448.8, 1536.6, 1535.9], "Primaria": [1276.3, 1273.0, 1273.9, 1260.5, 1307.0, 1350.1, 1349.8, 1362.9, 1452.8, 1522.5, 1591.4], "Secundaria 1ª etapa": [1402.1, 1391.6, 1413.5, 1404.0, 1462.8, 1509.2, 1485.9, 1542.5, 1594.7, 1704.3, 1763.2], "Bachillerato": [1654.6, 1739.9, 1679.5, 1653.3, 1697.7, 1730.7, 1753.2, 1756.6, 1786.2, 1944.3, 2031.7], "FP": [1512.6, 1498.3, 1510.0, 1531.0, 1572.5, 1610.9, 1610.0, 1655.8, 1705.9, 1848.5, 1907.2], "Superior": [2403.4, 2408.2, 2380.5, 2408.7, 2455.3, 2493.5, 2553.2, 2597.7, 2649.0, 2802.4, 2982.6]}}
out["asalariadosSexo"] = {"fuente": "INE, EPA: asalariados por sexo (miles), tabla 66201, total nacional y jornada total", "años": list(range(2006, 2025)), "grupos": ASAL_SEXO}
out["asalariadosNac"] = {"fuente": "INE, EPA: asalariados por nacionalidad (miles), tabla 66205, total nacional y jornada total", "años": list(range(2006, 2025)), "grupos": ASAL_NAC}
out["estudios"] = {"fuente": "INE, EPA: asalariados (miles, tabla 66209) y sueldo mensual medio (tabla 66242) por nivel de formación, total nacional y jornada total; desde 2014", **ESTUDIOS}
json.dump(out, open(f"{HERE}/../../data/sueldos.json", "w"), ensure_ascii=False, separators=(",", ":"))
print(epa["años"][0], epa["años"][-1], list(epa["edad"]), list(epa["contrato"]), len(cc), ees["años"][-1], list(ees["es"]), list(smi), ecv["años"][-1], list(ecv["limite"]), list(edadD))
print(os.path.getsize(f"{HERE}/../../data/sueldos.json") // 1024, "KB")
