"""Quién tiene y quién compra las viviendas: Censo de 2021 (INE), titulares del Catastro y compraventas por tipo de comprador (INE).
Escribe data/vivienda_censo.json, que usa el análisis «¿Por qué cuesta tanto pagar una casa?».

Uso (desde un ordenador con acceso a las webs; la nube de las sesiones las bloquea):
  python3 vivienda_censo.py descargar   baja las fuentes a cache/vivienda_censo/
  python3 vivienda_censo.py             lee esos ficheros y escribe data/vivienda_censo.json

Fuentes y ficheros de cache/vivienda_censo/:
  ine_censo2021_viviendas_municipio_t59525.csv          INE, Censo 2021, tabla 59525: viviendas por municipio, principal o no (8.131 municipios)
  ine_censo2021_viviendas_intensidad_uso_t59531.csv     INE, Censo 2021, tabla 59531: vacías y de uso esporádico según el consumo eléctrico
                                                        (3.139 municipios; el resto, en «Zonas geográficas», que son los «Resto de la provincia»)
  catastro_titulares_urbana_por_tramos_2014-2026.csv    Catastro, titulares de bienes urbanos (todos los usos) por número de bienes, 2014–2026
  catastro_residencial_titulares_total_2024-2026.csv    Catastro, uso residencial: titulares por tramo y tipo de persona, solo desde 2024
  catastro_residencial_titulares_{prov,aut}_2024-2026.csv y _mun_{año}.csv   el mismo detalle por provincia, comunidad y municipio (se bajan, no se usan aún)
  ine_etdp_compraventas_transmitente_titular_t50272_t50256.csv   INE, ETDP: % de compraventas de vivienda según quién vende y quién compra
Las tablas del INE se piden a la API de Tempus (DATOS_TABLA), y las del Catastro a su web de estadísticas (CSV y tablas Pc-Axis)."""
import csv, json, os, re, sys, time, urllib.parse, urllib.request
from html.parser import HTMLParser

HERE = os.path.dirname(os.path.abspath(__file__)); C = f"{HERE}/cache/vivienda_censo"; os.makedirs(C, exist_ok=True)
OUT = os.path.join(HERE, "..", "..", "data", "vivienda_censo.json")
UA = {"User-Agent": "indicio.es (datos abiertos; scripts/datos/vivienda_censo.py)"}
TEMPUS = "https://servicios.ine.es/wstempus/js/ES/DATOS_TABLA"
CAT = "https://www.catastro.hacienda.gob.es"


# ---------------------------------------------------------------- descarga
def get(url, data=None, enc=None):
    for i in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, data=data, headers=UA), timeout=300) as r:
                b = r.read()
            return b.decode(enc) if enc else b
        except Exception as e:
            print("  reintento", url[:90], e); time.sleep(3 * (i + 1))
    raise SystemExit(f"no se pudo bajar {url}")


def escribir(nombre, filas):
    with open(f"{C}/{nombre}", "w", encoding="utf-8", newline="") as f:
        csv.writer(f).writerows(filas)
    print("  ", nombre, len(filas) - 1, "filas")


def tempus(tabla, **q):
    return json.loads(get(f"{TEMPUS}/{tabla}?" + urllib.parse.urlencode({"tip": "AM", **q})).decode("utf-8"))


def descargar_ine():
    # 59525: territorio × tipo de vivienda (total, principal, no principal)
    m = {}
    for s in tempus(59525, nult=1):
        g, t = s["MetaData"][0], s["MetaData"][1]
        m.setdefault(g["Codigo"], {"n": g["Nombre"]})[t["Codigo"]] = s["Data"][0]["Valor"] if s["Data"] else ""
    escribir("ine_censo2021_viviendas_municipio_t59525.csv", [["codigo", "nombre", "total", "principal", "no_principal"]] +
             [[c, r["n"], r.get("total", ""), r.get("viviendaprincipal", ""), r.get("viviendanoprincipal", "")] for c, r in m.items()])
    # 59531: territorio × intensidad de uso (consumo eléctrico)
    want = {"viviendastotales": "total", "viviendasvacias": "vacias", "viviendasdeusoesporadico": "esporadico",
            "viviendasconbajoconsumo": "bajo", "medianaconsumoanual": "mediana"}
    m = {}
    for s in tempus(59531, nult=1):
        g, v = s["MetaData"][0], s["MetaData"][1]
        if v["Codigo"] in want:
            m.setdefault((g["T3_Variable"], g["Codigo"]), {"n": g["Nombre"]})[want[v["Codigo"]]] = s["Data"][0]["Valor"] if s["Data"] else ""
    escribir("ine_censo2021_viviendas_intensidad_uso_t59531.csv",
             [["tipo_territorio", "codigo", "nombre", "total", "vacias", "uso_esporadico", "bajo_consumo", "mediana_consumo_kwh"]] +
             [[t, c, r["n"], r.get("total", ""), r.get("vacias", ""), r.get("esporadico", ""), r.get("bajo", ""), r.get("mediana", "")] for (t, c), r in m.items()])
    # ETDP: porcentaje de compraventas de vivienda según transmitente y titular (50272 anual, 50256 mensual)
    filas = [["tabla", "periodo", "anio", "tipo_dato", "transmitente", "titular", "porcentaje"]]
    for t in (50272, 50256):
        for s in tempus(t, nult=400):
            nm = s["Nombre"].split(". ")
            for x in s["Data"]:
                filas.append([t, x["T3_Periodo"], x["Anyo"], x["T3_TipoDato"], nm[1], nm[2], x["Valor"]])
    escribir("ine_etdp_compraventas_transmitente_titular_t50272_t50256.csv", filas)


def descargar_catastro():
    base = f"{CAT}/documentos/estadisticas/propietarios"
    for nivel in ("prov", "aut", "total"):
        filas, cab = [], None
        for y in (2024, 2025, 2026):
            t = get(f"{base}/{y}/P_SPI_{nivel}_V.csv", enc="iso-8859-15").strip().splitlines()
            cab = cab or "ANIO;" + t[0]; filas += [f"{y};{l}" for l in t[1:]]
        open(f"{C}/catastro_residencial_titulares_{nivel}_2024-2026.csv", "w", encoding="utf-8").write("\n".join([cab] + filas))
    for y in (2024, 2025, 2026):
        open(f"{C}/catastro_residencial_titulares_mun_{y}.csv", "w", encoding="utf-8").write(get(f"{base}/{y}/P_SPI_mun_V.csv", enc="iso-8859-15"))
    # Titulares por número de bienes (tablas Pc-Axis: 01001 nacional, 03001 provincias), 2014–2026. Solo hay urbana, todos los usos.
    filas = [["anio", "nivel", "territorio", "clase_catastro", "tramo_bienes", "titulares"]]
    for y in range(2014, 2027):
        for f, nivel in (("01001", "nacional"), ("03001", "provincia")):
            filas += [[y, nivel, *r] for r in pcaxis(y, f)]
    escribir("catastro_titulares_urbana_por_tramos_2014-2026.csv", filas)


class Tabla(HTMLParser):
    """Recoge las filas (con colspan expandido) de las tablas hoja de una página de resultados del Catastro."""
    def __init__(s): super().__init__(); s.t = []; s.f = None; s.c = None; s.span = 1
    def handle_starttag(s, tag, a):
        a = dict(a)
        if tag == "table": s.t.append([])
        elif tag == "tr" and s.t: s.f = []
        elif tag in ("td", "th") and s.f is not None: s.c = ""; s.span = int(a.get("colspan") or 1)
    def handle_endtag(s, tag):
        if tag in ("td", "th") and s.c is not None: s.f += [re.sub(r"\s+", " ", s.c).strip()] * s.span; s.c = None
        elif tag == "tr" and s.f is not None and s.t: s.t[-1].append(s.f); s.f = None
    def handle_data(s, d):
        if s.c is not None: s.c += d


def pcaxis(y, f):
    """Tabla de titulares (año y, fichero f) → [(territorio, clase, tramo, titulares)]."""
    url = f"{CAT}/jaxi/tabla.do?path=/est{y}/catastro/titulares/&file={f}.px&type=pcaxis&L=0"
    html = get(url, enc="iso-8859-15")
    campos = re.findall(r'<input[^>]*type="?hidden"?[^>]*>', html, re.I)
    datos = []
    for tag in campos:
        n, v = re.search(r'name="([^"]*)"', tag), re.search(r'value="([^"]*)"', tag)
        if n and n.group(1): datos.append((n.group(1), v.group(1) if v else ""))
    for sel in re.finditer(r'<select[^>]*name="([^"]+)"[^>]*>(.*?)</select>', html, re.I | re.S):
        datos += [(sel.group(1), o) for o in re.findall(r'<option[^>]*value="([^"]*)"', sel.group(2), re.I)]
    datos = [(k, "html" if k == "accion" else v) for k, v in datos]
    res = get(f"{CAT}/jaxi/tabla.do", data=urllib.parse.urlencode(datos).encode(), enc="iso-8859-15")
    p = Tabla(); p.feed(res)
    hojas = [t for t in p.t if len(t) >= 3 and any("bien" in x for r in t for x in r)]
    t = max(hojas, key=len)
    num = lambda s: bool(re.fullmatch(r"[\d.]+", s))
    datos_f = [r for r in t if len(r) > 5 and num(r[-1]) and num(r[-2])]
    cab = [r for r in t if len(r) > 5 and r not in datos_f and any(r)]
    clase, tramo = cab[0], cab[-1]; out = []
    for r in datos_f:
        v = r[1:]
        for i, x in enumerate(v):
            out.append((r[0], clase[len(clase) - len(v) + i], tramo[len(tramo) - len(v) + i], x.replace(".", "")))
    return out


# ---------------------------------------------------------------- proceso
def leer(nombre, **k):
    with open(f"{C}/{nombre}", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f, **k))


def procesar():
    out = {"fuente": "INE (Censo de Población y Viviendas 2021, tablas 59525 y 59531; ETDP, tabla 50272) y Dirección General del Catastro (titularidad)"}
    # --- Censo 2021: viviendas de cada municipio
    tot = {r["codigo"]: r for r in leer("ine_censo2021_viviendas_municipio_t59525.csv")}
    uso = leer("ine_censo2021_viviendas_intensidad_uso_t59531.csv")
    N = tot["00"]; nac = next(r for r in uso if r["tipo_territorio"] == "Total Nacional")
    mun = {}
    for r in uso:
        if r["tipo_territorio"] != "Municipios": continue
        c = r["codigo"]; t = tot.get(c)
        if not t or t["total"] != r["total"]: print("  no cuadra", c, r["nombre"]); continue
        mun[c] = [int(r["total"]), int(t["principal"]), int(r["vacias"] or 0), int(r["uso_esporadico"] or 0)]
    out["censo"] = {"total": int(N["total"]), "principal": int(N["principal"]), "noPrincipal": int(N["no_principal"]),
                    "vacias": int(nac["vacias"]), "esporadico": int(nac["uso_esporadico"]), "bajoConsumo": int(nac["bajo_consumo"]),
                    "municipiosConDato": len(mun), "mun": mun, "cols": ["total", "principal", "vacias", "esporadico"]}
    # --- Catastro: titulares de bienes urbanos por número de bienes (nacional), 2014–2026
    CL = {"1 bien": "1", "2 bienes": "2", "3 bienes": "3", "4 bienes": "4", "5 bienes": "5", "6 a 10 bienes": "6a10",
          "11 a 25 bienes": "11a25", "26 a 50 bienes": "26a50", "Más de 50 bienes": "mas50", "Total": "total"}
    urb = {}
    for r in leer("catastro_titulares_urbana_por_tramos_2014-2026.csv"):
        if r["nivel"] == "nacional" and r["clase_catastro"] == "Titulares de urbana":
            urb.setdefault(r["anio"], {})[CL[r["tramo_bienes"]]] = int(r["titulares"])
    # --- Catastro: uso residencial, total nacional, desde 2024 (tramos de viviendas por titular: 1, 2–5, 6–10, 11–25, 26–100, más de 100)
    TR = [("HASTA_1", "1"), ("HASTA_5", "2a5"), ("HASTA_10", "6a10"), ("HASTA_25", "11a25"), ("HASTA_100", "26a100"), ("MAYOR_100", "mas100")]
    res = {}
    for r in leer("catastro_residencial_titulares_total_2024-2026.csv", delimiter=";"):
        y = r.get("ANIO") or r.get("EJERCICIO"); o = {"sujetos": int(r["NUM_SUJETOS_PASIVOS"]), "inmuebles": int(r["INMUEBLES"])}
        for tp, nom in (("PF", "fisicas"), ("PJ", "juridicas")):
            o[nom] = {k: [int(r[f"U_{tp}_{t}"]), int(r[f"I_U_{tp}_{t}"])] for t, k in TR}   # [titulares, viviendas]
        o["otros"] = {k: [sum(int(r[f"U_{tp}_{t}"]) for tp in ("PE", "PD")), sum(int(r[f"I_U_{tp}_{t}"]) for tp in ("PE", "PD"))] for t, k in TR}
        res[y] = o
    out["catastro"] = {"urbana": urb, "residencial": res, "ultimo": max(res),
                       "nota": "urbana = todos los bienes urbanos (viviendas, garajes, locales…); residencial = solo uso residencial, disponible desde 2024. Cada tramo: [titulares, viviendas]."}
    # --- Compraventas de vivienda según quién vende y quién compra (INE, ETDP, anual)
    cp = {}
    for r in leer("ine_etdp_compraventas_transmitente_titular_t50272_t50256.csv"):
        if r["tabla"] == "50272": cp.setdefault(r["anio"], {})[(r["transmitente"], r["titular"])] = float(r["porcentaje"])
    PJ, PF = "Persona jurídica", "Persona física"
    out["compras"] = {y: {"compradorPJ": round(sum(v for (t, ti), v in d.items() if ti == PJ), 1),
                          "vendedorPJ": round(sum(v for (t, ti), v in d.items() if t == PJ), 1),
                          "pfAPj": d[(PF, PJ)], "pjAPj": d[(PJ, PJ)]} for y, d in sorted(cp.items()) if len(d) == 4}
    with open(OUT, "w", encoding="utf-8") as f: json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    print("escrito", os.path.normpath(OUT), os.path.getsize(OUT) // 1024, "KB; municipios con dato de uso:", len(mun))


if __name__ == "__main__":
    if sys.argv[1:] == ["descargar"]: descargar_ine(); descargar_catastro()
    else: procesar()
