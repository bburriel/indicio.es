"""Ministerio de Vivienda y Agenda Urbana (MIVAU): Sistema Estatal de Referencia del Precio del Alquiler de Vivienda (SERPAVI).

Fichero: «2026-03_09_bd_SERPAVI_2011-2024 - DEFINITIVO WEB_v2.xlsx» (se guarda como cache/serpavi/serpavi_2011-2024.xlsx; 71 MB, se
descarga a mano de la página del SERPAVI del Ministerio). Hojas: Metadatos, CCAA, Provincias, Municipios, Distritos y Secciones censales.
Aquí solo se usa «Municipios» (una fila por municipio, código INE de 5 dígitos en CUMUN, 284 columnas = 4 de identificación + 12 años × 22 medidas).

Qué es el dato (según la hoja Metadatos, que es lo único documentado en el propio fichero): explotación estadística de fuentes tributarias.
Son los rendimientos de arrendamiento de vivienda habitual que declara el arrendador en el IRPF (Modelo 100) de cada año, cruzados con
el Catastro (solo entran los inmuebles que aparecen en las dos fuentes); se excluyen los alquileres a parientes. Es decir, son alquileres
declarados de todos los contratos vivos ese año, no precios de anuncios ni de contratos nuevos.
Medidas (el sufijo _AA es el año): recuento de inmuebles en alquiler (BI_ALVHEPCO_TV*), alquiler mensual por m² (ALQM2_LV_*), alquiler mensual
del inmueble entero (ALQTBID12_*) y superficie (SLVM2_*), cada uno con mediana (M) y percentiles 25 y 75, separados por tipología:
VC (vivienda colectiva: piso) y VU (vivienda unifamiliar o rural). La tipología es la de más superficie del inmueble.
Secreto estadístico: las medidas de precio y superficie quedan en blanco si hay menos de 10 inmuebles (se comprueba en los datos: el menor
recuento con precio es 10). El recuento sí aparece siempre. El fichero no documenta si «mensual» es el alquiler anual entre 12 o entre los
meses alquilados, y la metodología (PDF) no se pudo consultar.

Qué sale:
- tipología del municipio = la que tiene más inmuebles en 2024 (VC si empatan); hace falta al menos 10 inmuebles de esa tipología. Así un
  pueblo de casas se mide con casas y una ciudad con pisos; no se mezclan medianas de tipologías distintas.
- alqEurM2: mediana del alquiler mensual por m² en 2024.
- alqEurMes: mediana del alquiler mensual del inmueble entero en 2024 (viene directo del fichero, no se multiplica por superficies).
- alqInmuebles: número de inmuebles en alquiler en 2024 de esa tipología (el tamaño de la muestra).
- alqEurM2Var: cambio del alquiler por m² entre 2015 y 2024 en la misma tipología; hace falta al menos 20 inmuebles en 2015 y en 2024.
- esfuerzoAlq: 12 × alqEurMes ÷ rentaHog × 100 (renta neta media por hogar, Atlas del INE, ya en data/index.json); al menos 20 inmuebles.
→ cache/out/serpavi.json (después: python3 construir.py serpavi)"""
import json, os, re, sys, zipfile
import xml.etree.ElementTree as ET

HERE = os.path.dirname(os.path.abspath(__file__))
XLSX = f"{HERE}/cache/serpavi/serpavi_2011-2024.xlsx"
OUT = f"{HERE}/cache/out/serpavi.json"
NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
MIN_PRECIO = 10     # secreto estadístico del propio fichero
MIN_VARIACION = 20  # muestra mínima para comparar dos años y para el cociente con la renta (la mediana de 10 casos baila mucho)
ANYO, BASE = "24", "15"


def hoja(z, nombre):
    wb = ET.fromstring(z.read("xl/workbook.xml")); rel = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
    rid = [s.get("{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id") for s in wb.iter(NS + "sheet") if s.get("name") == nombre][0]
    dest = [r.get("Target") for r in rel if r.get("Id") == rid][0]
    return "xl/" + dest.lstrip("/").removeprefix("xl/")


def filas(path=XLSX, nombre="Municipios"):
    """Lee la hoja en streaming (sin cargarla entera): rinde un dict {nombre de columna: valor} por fila. Las celdas vacías no salen."""
    z = zipfile.ZipFile(path)
    ss = [("".join(t.text or "" for t in si.iter(NS + "t"))) for si in ET.fromstring(z.read("xl/sharedStrings.xml")).iter(NS + "si")]
    cab = None
    with z.open(hoja(z, nombre)) as f:
        for _, row in ET.iterparse(f):
            if row.tag != NS + "row": continue
            d = {}
            for c in row:
                v = c.find(NS + "v")
                if v is None or v.text is None: continue
                x = ss[int(v.text)] if c.get("t") == "s" else v.text if c.get("t") in ("str", "inlineStr") else float(v.text)
                d[re.match(r"[A-Z]+", c.get("r")).group(0)] = x
            row.clear()
            if cab is None: cab = d; continue
            yield {cab[k]: v for k, v in d.items() if k in cab}


def num(v): return v if isinstance(v, float) else None   # las celdas en blanco por secreto estadístico salen como texto vacío o no salen


def main():
    if not os.path.exists(XLSX): sys.exit(f"Falta {XLSX}: descarga el fichero del SERPAVI (ver la cabecera de este script).")
    ix = json.load(open(f"{HERE}/../../data/index.json", encoding="utf-8")); F = {k: i for i, k in enumerate(ix["fields"])}
    ROW = {r[0]: r for r in ix["rows"]}
    mun = {}
    for r in filas():
        if "CUMUN" not in r: continue
        mun[str(int(float(r["CUMUN"]))).zfill(5)] = r   # unos códigos vienen como texto («01001») y otros como número
    print("municipios en el fichero:", len(mun), "· sin fila en Indicio:", len(set(mun) - set(ROW)), "· sin fila en el SERPAVI:", len(set(ROW) - set(mun)))
    datos = {}
    for c, r in mun.items():
        if c not in ROW: continue
        n = {t: num(r.get(f"BI_ALVHEPCO_T{t}_{ANYO}")) or 0 for t in ("VC", "VU")}
        t = "VC" if n["VC"] >= n["VU"] else "VU"
        m2, mes = num(r.get(f"ALQM2_LV_M_{t}_{ANYO}")), num(r.get(f"ALQTBID12_M_{t}_{ANYO}"))
        if n[t] < MIN_PRECIO or not m2 or not mes: continue
        d = datos[c] = {"alqEurM2": round(m2, 2), "alqEurMes": round(mes), "alqInmuebles": int(n[t])}
        m15, n15 = num(r.get(f"ALQM2_LV_M_{t}_{BASE}")), num(r.get(f"BI_ALVHEPCO_T{t}_{BASE}")) or 0
        if m15 and n[t] >= MIN_VARIACION and n15 >= MIN_VARIACION: d["alqEurM2Var"] = round((m2 / m15 - 1) * 100, 1)
        rh = ROW[c][F["rentaHog"]]
        if rh and n[t] >= MIN_VARIACION: d["esfuerzoAlq"] = round(mes * 12 / rh * 100, 1)
    SRC = ("Ministerio de Vivienda, SERPAVI, 2024: alquiler declarado en el IRPF por los propietarios (todos los contratos vivos, no los anuncios); "
           "pisos o casas, según lo que predomine en el municipio; municipios con al menos 10 inmuebles en alquiler")
    ind = [
        ["alqEurM2", "Alquiler por metro cuadrado (€/m² al mes)", "Vivienda", "eurm2", "Mediana del alquiler mensual por m². " + SRC],
        ["alqEurMes", "Alquiler mensual de una vivienda mediana", "Vivienda", "eur", "Mediana del alquiler mensual de la vivienda entera. " + SRC],
        ["alqInmuebles", "Viviendas en alquiler que recoge el SERPAVI", "Vivienda", "int",
         "Ministerio de Vivienda, SERPAVI, 2024: viviendas habituales con alquiler declarado en el IRPF (pisos o casas, según lo que predomine); municipios con al menos 10"],
        ["alqEurM2Var", "Subida del alquiler por m² desde 2015 (SERPAVI)", "Vivienda", "pct_chg",
         "Ministerio de Vivienda, SERPAVI: mediana del alquiler mensual por m² en 2024 frente a 2015, en la misma tipología; municipios con al menos 20 viviendas en alquiler en los dos años"],
        ["esfuerzoAlq", "Esfuerzo de alquiler (% de la renta del hogar)", "Vivienda", "pct",
         "Cálculo propio: el alquiler mensual de una vivienda mediana por 12 (SERPAVI, Ministerio de Vivienda, 2024) entre la renta neta media por hogar (Atlas de Renta del INE, 2024); "
         "municipios con al menos 20 viviendas en alquiler. La renta es la de todos los hogares, no solo la de los inquilinos"]]
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump({"indicadores": ind, "datos": datos}, open(OUT, "w", encoding="utf-8"), separators=(",", ":"), ensure_ascii=False)
    pop = sum(r[F["pop"]] or 0 for r in ROW.values())
    for k, *_ in ind:
        cs = [c for c, d in datos.items() if k in d]
        print(f"{k:13s} {len(cs):5d} municipios · {sum(ROW[c][F['pop']] or 0 for c in cs) / pop * 100:.1f} % de la población")
    # contraste con las ciudades grandes
    for c in ("28079", "08019", "46250"): print(c, mun[c]["NMUN"], datos.get(c))


if __name__ == "__main__": main()
