"""Atlas de distribución de renta de los hogares (INE), nivel municipal, último año (2024): mediana de la renta, 
fuentes de ingreso, desigualdad P80/P20 y tamaño del hogar. INEbase publica una tabla por provincia; se leen en streaming sin guardarlas.
Uso: python3 ine_atlas.py → cache/out/atlas.json"""
import json, os, re, subprocess, concurrent.futures as cf, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__)); os.makedirs(f"{HERE}/cache/out", exist_ok=True)
ANYO = "2024"
def ids_de(nombre):
    ts = json.load(urllib.request.urlopen("https://servicios.ine.es/wstempus/js/ES/TABLAS_OPERACION/353", timeout=60))
    return [t["Id"] for t in ts if t["Nombre"] == nombre]   # == y no startswith: hay tablas con el mismo comienzo y otras dimensiones
def num(v):
    try: return float(v.replace(".", "").replace(",", "."))
    except ValueError: return None
def leer(tabla, quiero):
    """quiero: {(columna de categoría, texto): clave} → {código: {clave: valor}} con sexo Total, solo nivel municipal y año ANYO"""
    out = {}
    p = subprocess.Popen(["curl", "-sS", "-m", "900", f"https://www.ine.es/jaxiT3/files/t/es/csv_bdsc/{tabla}.csv"], stdout=subprocess.PIPE)
    cab = None
    for raw in p.stdout:
        f = raw.decode("utf-8-sig").rstrip("\n").split(";")
        if cab is None: cab = f; continue
        if f[1] or f[2] or f[-2] != ANYO: continue
        m = re.match(r"(\d{5}) ", f[0])
        if not m or ("Sexo" in cab and f[cab.index("Sexo")] != "Total"): continue
        cat = [x for x in f[3:-2] if x in quiero]
        if cat:
            v = num(f[-1])
            if v is not None: out.setdefault(m.group(1), {})[quiero[cat[0]]] = v
    p.wait(); return out
TABLAS = [
 ("Indicadores de renta media y mediana", {"Mediana de la renta por unidad de consumo": "rentaMediana"}),
 ("Distribución por fuente de ingresos", {"Fuente de ingreso: salario": "ingSalario", "Fuente de ingreso: prestaciones por desempleo": "ingDesempleo",
                                         "Fuente de ingreso: otras prestaciones": "ingPrestaciones", "Fuente de ingreso: otros ingresos": "ingOtros"}),
 ("Índice de Gini y Distribución de la renta P80/P20", {"Distribución de la renta P80/P20": "p80p20"}),
 ("Indicadores demográficos", {"Tamaño medio del hogar": "hogarMedio"}),
]
datos = {}
for nombre, quiero in TABLAS:
    ids = ids_de(nombre)
    with cf.ThreadPoolExecutor(4) as ex:
        for r in ex.map(lambda t: leer(t, quiero), ids):
            for code, d in r.items(): datos.setdefault(code, {}).update(d)
    print(nombre[:60], len(ids), "tablas;", sum(1 for d in datos.values() if any(k in d for k in quiero.values())), "municipios", flush=True)
for d in datos.values():
    for k in ("rentaMediana",):
        if k in d: d[k] = round(d[k])
SRC = f"INE, Atlas de distribución de renta de los hogares, {ANYO}"
INDICADORES = [
 ("rentaMediana", "Mediana de la renta por unidad de consumo", "Riqueza", "eur", SRC + " (la renta del hogar «típico», menos sensible a unos pocos ricos que la media)"),
 ("p80p20", "Desigualdad de renta (P80/P20)", "Riqueza", "num1", SRC + " (cuántas veces más gana el 20 % más rico que el 20 % más pobre)"),
 ("ingSalario", "Ingresos que vienen de salarios", "Riqueza", "pct", SRC + " (% de la renta de los hogares)"),
 ("ingDesempleo", "Ingresos que vienen de prestaciones por desempleo", "Riqueza", "pct", SRC + " (% de la renta de los hogares)"),
 ("ingPrestaciones", "Ingresos que vienen de otras prestaciones", "Riqueza", "pct", SRC + " (% de la renta de los hogares; ayudas, incapacidad, familia)"),
 ("ingOtros", "Ingresos que vienen de otras fuentes", "Riqueza", "pct", SRC + " (% de la renta de los hogares; capital, alquileres, negocios)"),
 ("hogarMedio", "Personas por hogar", "Hogares", "num1", SRC + " (tamaño medio del hogar)"),
]
json.dump({"indicadores": INDICADORES, "datos": datos}, open(f"{HERE}/cache/out/atlas.json", "w"), ensure_ascii=False)
print(len(datos), "municipios")
# Pendiente: % de población con ingresos por encima del 200 % y por debajo del 40 % de la mediana (tabla «…umbrales relativos por sexo»).
# Las tablas de las provincias grandes pesan más de 1 GB (tienen una fila por sección censal y año): hay que descargarlas con curl -m 3000 o más,
# y comparar el nombre de la tabla con == (con startswith también entran las de edad y nacionalidad, y se mezclan subgrupos).
