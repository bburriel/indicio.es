"""Pirámides de población (data/piramide.json): población por sexo y edad en España, cada comunidad y cada provincia.

Fuente: INE, Estadística Continua de Población (población residente por fecha, sexo y edad, año a año). Se agrupa en
grupos de cinco años (0-4 … 95-99, 100 y más). Se baja el último dato y el de hace 20 años, para comparar.

    python3 scripts/datos/piramide.py

Solo usa la biblioteca estándar y necesita acceso a ine.es. Las tablas se buscan por nombre en la operación 450
(Estadística Continua de Población): «Población residente por fecha, sexo y edad»; hay una para España, otra por
comunidades y otra por provincias. Si el INE cambia los identificadores, basta con ajustar TABLAS.
"""
import json
import os
import re
import sys
import time
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from regional import ccaa_code  # noqa: E402
from regional_otras import geo_row  # noqa: E402

API = "https://servicios.ine.es/wstempus/js/ES/"
CACHE = os.path.join(HERE, "cache", "piramide")
TABLAS = [56934, 56940, 56945, 69792]   # «Población residente por fecha, sexo y edad (desde 1971)»: España, CCAA, provincias…
ATRAS = 20                               # años para la comparación con el pasado
GR = [f"{a}-{a + 4}" for a in range(0, 100, 5)] + ["100+"]


def get(path, intentos=4):
    url = API + path
    for i in range(intentos):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "indicio.es (datos públicos)"})
            with urllib.request.urlopen(req, timeout=300) as r:
                return json.loads(r.read().decode("utf-8"))
        except Exception as e:  # noqa: BLE001
            print(f"  fallo {url}: {e}; reintento {i + 1}")
            time.sleep(3 * (i + 1))
    return None


def tabla(tid):
    """Todas las series de la tabla, con sus metadatos y sus datos (se guarda en caché)."""
    os.makedirs(CACHE, exist_ok=True)
    f = os.path.join(CACHE, f"{tid}.json")
    if os.path.exists(f) and os.path.getsize(f) > 1000:
        return json.load(open(f))
    print("descargando tabla", tid, "(puede tardar unos minutos)")
    d = get(f"DATOS_TABLA/{tid}?tip=AM")
    if d:
        json.dump(d, open(f, "w"), ensure_ascii=False)
    return d


def edad(txt):
    t = txt.lower()
    if "todas" in t or "total" in t:
        return None
    m = re.search(r"(\d+)", t)
    return int(m.group(1)) if m else None


def grupo(a):
    return min(a // 5, 20)


out = {"fuente": "INE, Estadística Continua de Población", "grupos": GR, "es": None, "ccaa": {}, "prov": {}}
past = {"es": None, "ccaa": {}, "prov": {}}
fechas = set()
for tid in TABLAS:
    d = tabla(tid)
    if not d:
        print("  sin datos en", tid)
        continue
    n = 0
    for s in d:
        meta = s.get("MetaData") or []
        sexo = ed = geo = None
        for m in meta:
            var = ((m.get("Variable") or {}).get("Nombre") or "").lower()
            nom = m.get("Nombre") or ""
            if var.startswith("sexo"):
                sexo = {"hombres": "H", "mujeres": "M"}.get(nom.lower())
            elif "edad" in var:
                ed = edad(nom)
            elif var.startswith("total nacional") or var.startswith("nacional"):
                geo = ("es", None)
            elif "comunidad" in var or "provincia" in var:
                g = geo_row(nom, ccaa_code)
                if g:
                    geo = (g[0], g[1])
        if not sexo or ed is None or not geo:
            continue
        datos = [x for x in (s.get("Data") or []) if x.get("Valor") is not None]
        if not datos:
            continue
        datos.sort(key=lambda x: x.get("Fecha") or 0)
        ult = datos[-1]
        anyo = int(ult.get("Anyo"))
        ant = [x for x in datos if int(x.get("Anyo")) == anyo - ATRAS]
        for dst, x in [(out, ult)] + ([(past, ant[0])] if ant else []):
            lvl, code = geo
            tgt = dst if lvl == "es" else dst[lvl]
            key = "es" if lvl == "es" else str(code)
            if lvl == "es":
                if dst["es"] is None:
                    dst["es"] = {"H": [0] * 21, "M": [0] * 21}
                box = dst["es"]
            else:
                box = tgt.setdefault(key, {"H": [0] * 21, "M": [0] * 21})
            box[sexo][grupo(ed)] += float(x["Valor"])
            if dst is out:
                fechas.add(str(x.get("Fecha") or anyo))
        n += 1
    print(f"tabla {tid}: {n} series útiles")

def limpia(o):
    o = {k: {s: [round(v) for v in a] for s, a in b.items()} for k, b in o.items() if sum(b["H"]) + sum(b["M"]) > 0}
    return o


out["ccaa"] = limpia(out["ccaa"])
out["prov"] = limpia(out["prov"])
if past["es"] or past["ccaa"]:
    out["pasado"] = {"es": {s: [round(v) for v in a] for s, a in past["es"].items()} if past["es"] else None,
                     "ccaa": limpia(past["ccaa"]), "prov": limpia(past["prov"])}
if out["es"]:
    out["es"] = {s: [round(v) for v in a] for s, a in out["es"].items()}
# fecha del dato: «1 de enero de 2026», etc.; el INE la da como milisegundos
def fecha_txt(f):
    try:
        import datetime
        return datetime.datetime.utcfromtimestamp(int(f) / 1000).strftime("%Y-%m-%d")
    except Exception:  # noqa: BLE001
        return str(f)


if fechas:
    out["fecha"] = fecha_txt(max(fechas, key=lambda x: str(x)))
    if "pasado" in out:
        out["pasado"]["fecha"] = str(int(out["fecha"][:4]) - ATRAS) + out["fecha"][4:]
if not out["es"]:
    raise SystemExit("No se encontró el dato de España: revisa TABLAS (ine.es → Estadística Continua de Población).")
dst = os.path.join(HERE, "..", "..", "data", "piramide.json")
json.dump(out, open(dst, "w"), ensure_ascii=False, separators=(",", ":"))
print(os.path.getsize(dst) // 1024, "KB →", dst, "| fecha", out.get("fecha"), "| comunidades", len(out["ccaa"]), "| provincias", len(out["prov"]),
      "| España", sum(out["es"]["H"]) + sum(out["es"]["M"]))
