"""Series del INE por provincia y comunidad, desde la API JSON (servicios.ine.es/wstempus).

Dos pasos:
    python3 scripts/datos/ine_api.py catalogo    # baja la lista de tablas de cada operación a scripts/datos/cache/ine_tablas.json
    python3 scripts/datos/ine_api.py descargar   # baja las tablas elegidas (TABLAS) a scripts/datos/cache/ine/<id>.json

Solo usa la biblioteca estándar. Hay que ejecutarlo desde un ordenador con acceso a ine.es.
"""
import json
import os
import sys
import time
import urllib.request

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
CACHE = os.path.join(ROOT, "scripts", "datos", "cache")
API = "https://servicios.ine.es/wstempus/js/ES/"

# Operaciones del INE que interesan: se buscan por nombre en la lista completa (OPERACIONES_DISPONIBLES)
BUSCAR = [
    "Población Activa", "Precios de Vivienda", "Transmisiones de Derechos", "Hipotecas", "Ocupación Hotelera",
    "Ocupación en Apartamentos", "Padrón", "Cifras de Población", "Continua de Población", "Variaciones Residenciales",
    "Migraciones", "Distribución de Renta", "Condiciones de Vida", "Estructura Salarial", "Coste Laboral",
    "Movimiento Natural", "Nacimientos", "Defunciones", "Censos de Población", "Indicadores Urbanos", "Viviendas turísticas",
    "Precios de Vivienda en Alquiler", "Contabilidad Regional", "Directorio Central de Empresas", "Índice de Precios de Consumo",
]

# Tablas que se descargan en el paso 2 (elegidas a partir de cache/ine_tablas.json)
TABLAS = {
    # renta por deciles (ECV)
    9957: "ECV: límites inferiores de cada decil de renta", 9951: "ECV: personas por decil de renta, edad y sexo", 9953: "ECV: decil de renta y relación con la actividad", 9954: "ECV: decil de renta y nacionalidad", 9955: "ECV: decil de renta y tipo de hogar", 59953: "ECV: decil de renta y tenencia de la vivienda", 9964: "ECV: umbral de riesgo de pobreza",
    # salarios: percentiles (EES) y deciles (EPA)
    28191: "EES anual: medias y percentiles por sexo y CCAA", 66252: "EPA: salarios por deciles", 66237: "EPA: salarios por deciles", 66238: "EPA: salarios por deciles", 66239: "EPA: salarios por deciles", 66240: "EPA: salarios por deciles", 66241: "EPA: salarios por deciles", 66242: "EPA: salarios por deciles", 66243: "EPA: salarios por deciles", 66244: "EPA: salarios por deciles", 66245: "EPA: salarios por deciles", 66246: "EPA: salarios por deciles", 66247: "EPA: salarios por deciles", 66248: "EPA: salarios por deciles", 66249: "EPA: salarios por deciles", 66250: "EPA: salarios por deciles", 66251: "EPA: salarios por deciles", 66199: "EPA: salarios por deciles", 66200: "EPA: salarios por deciles", 66201: "EPA: salarios por deciles", 66202: "EPA: salarios por deciles", 66203: "EPA: salarios por deciles", 66204: "EPA: salarios por deciles", 66205: "EPA: salarios por deciles", 66206: "EPA: salarios por deciles", 66207: "EPA: salarios por deciles", 66208: "EPA: salarios por deciles", 66217: "EPA: salarios por deciles", 66218: "EPA: salarios por deciles", 66229: "EPA: salarios por deciles", 66230: "EPA: salarios por deciles", 66231: "EPA: salarios por deciles", 66232: "EPA: salarios por deciles", 66233: "EPA: salarios por deciles", 66234: "EPA: salarios por deciles", 70687: "EES cuatrienal: medias y percentiles", 70688: "EES cuatrienal: medias y percentiles", 70689: "EES cuatrienal: medias y percentiles", 70690: "EES cuatrienal: medias y percentiles", 70691: "EES cuatrienal: medias y percentiles", 70692: "EES cuatrienal: medias y percentiles", 70693: "EES cuatrienal: medias y percentiles", 70694: "EES cuatrienal: medias y percentiles", 36845: "EES cuatrienal: medias y percentiles", 36846: "EES cuatrienal: medias y percentiles", 36847: "EES cuatrienal: medias y percentiles", 36848: "EES cuatrienal: medias y percentiles", 36849: "EES cuatrienal: medias y percentiles", 36850: "EES cuatrienal: medias y percentiles", 36851: "EES cuatrienal: medias y percentiles", 36852: "EES cuatrienal: medias y percentiles",
    # IPC con detalle de alimentos (análisis del precio de los alimentos)
    24077: "IPC: índice general nacional desde 1961", 24080: "IPC: grupos ECOICOP nacionales desde 1993",
    76128: "IPC: índices nacionales de subclases", 76129: "IPC: índices nacionales de rúbricas", 76159: "IPC: ponderaciones de subclases",
    76132: "IPC: índices nacionales a impuestos constantes de subclases", 76137: "IPC: subgrupos por comunidad", 76138: "IPC: rúbricas por comunidad",
    76126: "IPC: subgrupos nacionales", 76127: "IPC: clases nacionales",
    # Mercado de trabajo (EPA, trimestral)
    65349: "EPA: tasas de actividad, paro y empleo por provincia y sexo",
    65351: "EPA: activos por grupo de edad y provincia",
    65354: "EPA: ocupados por sector económico y provincia",
    65334: "EPA: tasas de paro por grupo de edad, sexo y comunidad",
    # Hipotecas (mensual)
    3232: "Hipotecas por naturaleza de la finca, mes y provincia: número e importe",
    76317: "Hipotecas sobre el total de fincas, por provincia",
    # Migraciones (anual)
    69764: "Saldos migratorios por provincia, sexo, edad y nacionalidad",
    69762: "Saldos migratorios por comunidad, sexo, edad y nacionalidad",
    69693: "Inmigraciones del extranjero por provincia y nacionalidad",
    69708: "Emigraciones al extranjero por provincia y nacionalidad",
    # Población por edad, sexo y nacionalidad (trimestral)
    77019: "Población residente por sexo, grupo de edad y nacionalidad",
    # Nacimientos (anual)
    6506: "Nacimientos por provincia de residencia de la madre y sexo",
    6510: "Nacimientos por provincia y grupo de edad de la madre",
    # Economía regional (anual)
    82284: "PIB por comunidad y provincia, precios corrientes",
    82285: "PIB per cápita por comunidad y provincia",
    82000: "Empleo total por comunidad y provincia",
    # Empresas (anual)
    73021: "Empresas por provincia y condición jurídica",
    73022: "Empresas por provincia y estrato de asalariados",
    # Turismo (mensual)
    2074: "Viajeros y pernoctaciones hoteleras por comunidad y provincia",
    75197: "Viajeros y pernoctaciones hoteleras por punto turístico",
    # Condiciones de vida (anual, por comunidad)
    49145: "Renta por persona y unidad de consumo por comunidad",
    49148: "Tasa de riesgo de pobreza por comunidad",
    55266: "Riesgo de pobreza o exclusión social (AROPE) por comunidad",
    76845: "Hogares por régimen de tenencia de la vivienda y comunidad",
    # Alquiler (anual)
    59058: "IPVA: índices provinciales por tipo de edificación",
    59005: "IPVA: índices provinciales por antigüedad del contrato",
    # Salarios y coste laboral
    80180: "Salarios: medias y percentiles por sexo y comunidad",
    28182: "Trabajadores según su ganancia respecto al salario mínimo",
    6061: "Coste laboral por trabajador, comunidad y sector",
    6064: "Vacantes por comunidad",
    # Mortalidad
    6545: "Defunciones por provincia de residencia y sexo",
    6547: "Defunciones por provincia, sexo y edad",
    73035: "Defunciones por causa, sexo y provincia",
    # Turismo extrahotelero y viviendas turísticas
    2063: "Apartamentos turísticos: viajeros y pernoctaciones por provincia",
    75191: "Apartamentos turísticos: viajeros y pernoctaciones por punto turístico",
    39364: "Viviendas turísticas y plazas por comunidad y provincia",
    # Españoles en el extranjero
    71117: "Españoles residentes en el extranjero por país, provincia de inscripción, sexo y edad",
    # Censo de 2021: viviendas
    3456: "Viviendas por municipio (más de 2.000 habitantes) y tipo: principal, secundaria, vacía",
    3457: "Viviendas por tamaño del municipio y tipo, por comunidad y provincia",
    # Condiciones de vida (más)
    9993: "Hogares según dificultades para llegar a fin de mes, por comunidad",
    10001: "Hogares con problemas en la vivienda y su entorno, por comunidad",
    9956: "Personas por decil de renta, por comunidad",
    # Indicadores urbanos (ciudades): la edición más reciente de cada bloque
    69336: "Indicadores urbanos: demografía",
    69337: "Indicadores urbanos: aspectos sociales",
    69338: "Indicadores urbanos: aspectos económicos",
    69339: "Indicadores urbanos: formación y educación",
    69340: "Indicadores urbanos: superficie y uso del suelo",
    69341: "Indicadores urbanos: desplazamientos al trabajo",
    69342: "Indicadores urbanos: turismo",
    # Temporalidad y teletrabajo (EPA)
    65328: "EPA: asalariados por tipo de contrato, sexo y comunidad (trimestral)",
    65329: "EPA: asalariados del sector privado por tipo de contrato y comunidad",
    65789: "EPA: asalariados que trabajan desde casa, por sexo y comunidad",
    66091: "EPA: asalariados por sector, sexo y comunidad",
    # Precios por provincia (para pasar euros a euros constantes de cada sitio)
    24081: "IPC: índice general por provincias desde 1993",
    76141: "IPC: índices provinciales generales y por grupos",
    76136: "IPC: índices por comunidad, generales y por grupos",
}

# Operaciones sin catálogo descargado: se eligen sus tablas por nombre al ejecutar
REGLAS = {
    15: ("IPV: precio de la vivienda", r"."),
    7: ("ETDP: compraventas de vivienda", r"."),
    259: ("Ejecuciones hipotecarias", r"provincia|comunidad"),
    481: ("Índice de referencia de alquiler", r"."),
    486: ("Producción de la construcción", r"."),
    33: ("Indicadores demográficos básicos (esperanza de vida, fecundidad, edad media)", r"provincia|comunidad"),
    326: ("Proyecciones de población", r"comunidad|provincia|CCAA|autónom"),
    70: ("Proyección de hogares", r"."),
    125: ("Sociedades mercantiles creadas y disueltas", r"provincia|comunidad"),
    314: ("Encuesta de presupuestos familiares: gasto de los hogares", r"comunidad"),
    234: ("Movilidad laboral y geográfica", r"comunidad|provincia"),
    305: ("Matrimonios", r"provincia"),
}

def get(path, intentos=4):
    url = API + path
    for i in range(intentos):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "indicio.es (datos públicos)"})
            with urllib.request.urlopen(req, timeout=120) as r:
                return json.loads(r.read().decode("utf-8"))
        except Exception as e:  # noqa: BLE001
            print(f"  fallo {url}: {e}; reintento {i + 1}")
            time.sleep(3 * (i + 1))
    raise SystemExit(f"No se pudo descargar {url}")


def catalogo():
    os.makedirs(CACHE, exist_ok=True)
    ops = get("OPERACIONES_DISPONIBLES")
    with open(os.path.join(CACHE, "ine_operaciones.json"), "w") as f:
        json.dump(ops, f, ensure_ascii=False, indent=1)
    print(f"{len(ops)} operaciones en total")
    elegidas = [o for o in ops if any(k.lower() in (o.get("Nombre") or "").lower() for k in BUSCAR)]
    out = {}
    path = os.path.join(CACHE, "ine_tablas.json")
    for o in elegidas:
        print("catálogo", o.get("Id"), o.get("Codigo"), o.get("Nombre"))
        try:
            tablas = get(f"TABLAS_OPERACION/{o['Id']}", intentos=2)
        except SystemExit as e:
            print("  ", e)
            continue
        out[str(o["Id"])] = {"codigo": o.get("Codigo"), "nombre": o.get("Nombre"),
                             "tablas": [{"id": t.get("Id"), "nombre": t.get("Nombre"), "periodicidad": t.get("FK_Periodicidad"), "ultima": t.get("Ultima_Modificacion")} for t in tablas]}
        print(f"  {len(tablas)} tablas")
        with open(path, "w") as f:  # se guarda tras cada operación, por si algo falla después
            json.dump(out, f, ensure_ascii=False, indent=1)
    print("→", path)


def descargar(solo_faltan=False):
    import re
    d = os.path.join(CACHE, "ine")
    os.makedirs(d, exist_ok=True)
    elegidas = dict(TABLAS)
    for op, (desc, patron) in REGLAS.items():
        try:
            tablas = get(f"TABLAS_OPERACION/{op}", intentos=2)
        except SystemExit as e:
            print("  ", e)
            continue
        for t in tablas:
            if re.search(patron, t.get("Nombre") or "", re.I):
                elegidas[t["Id"]] = f"{desc}: {t.get('Nombre')}"
    fallos = []
    for tid, desc in elegidas.items():
        dest = os.path.join(d, f"{tid}.json")
        if solo_faltan and os.path.exists(dest) and os.path.getsize(dest) > 100:
            continue
        print("tabla", tid, desc[:90])
        try:
            data = get(f"DATOS_TABLA/{tid}?tip=AM", intentos=3)
        except SystemExit as e:
            print("  ", e)
            fallos.append(tid)
            continue
        with open(dest, "w") as f:
            json.dump(data, f, ensure_ascii=False)
        print(f"  {len(data)} series")
    prev = {}
    if solo_faltan and os.path.exists(os.path.join(d, "_indice.json")):
        prev = json.load(open(os.path.join(d, "_indice.json")))
    prev.update({str(k): v for k, v in elegidas.items()})
    with open(os.path.join(d, "_indice.json"), "w") as f:
        json.dump(prev, f, ensure_ascii=False, indent=1)
    print(f"Hecho: {len(elegidas) - len(fallos)} tablas; fallos: {fallos}")


if __name__ == "__main__":
    {"catalogo": catalogo, "descargar": descargar, "faltan": lambda: descargar(True)}.get(sys.argv[1] if len(sys.argv) > 1 else "", lambda: print(__doc__))()
