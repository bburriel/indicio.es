"""Años de sueldo para pagar 80 m² por municipio y ficha de vivienda de las ciudades.

Lee data/prov/*.json (valor tasado «vtas», compraventas «comp», padrón «pad», alquiler «ipva»), data/sueldos.json (sueldo mediano por
comunidad, EES), data/regional.json, data/index.json y data/vivienda_censo.json (Censo 2021). Escribe:
  cache/out/esfuerzo.json   los indicadores «anosSueldo» y «anosSueldo08» para construir.py (python3 construir.py esfuerzo)
  data/vivienda_ciudades.json   las ciudades de 50.000 habitantes o más, para el análisis «¿Por qué cuesta tanto pagar una casa?»
Sin red: usa solo lo que hay en el repositorio."""
import glob, json, os
HERE = os.path.dirname(os.path.abspath(__file__)); D = f"{HERE}/../../data"
ix = json.load(open(f"{D}/index.json", encoding="utf-8")); F = {k: i for i, k in enumerate(ix["fields"])}
ex = json.load(open(f"{D}/extra.json", encoding="utf-8")); FE = {k: i for i, k in enumerate(ex["fields"])}
ROW = {r[0]: r for r in ix["rows"]}; EXR = {r[0]: e for r, e in zip(ix["rows"], ex["rows"])}
ees = json.load(open(f"{D}/sueldos.json"))["ees"]; EY = ees["años"]
reg = json.load(open(f"{D}/regional.json")); pcc = reg["provCcaa"]
cen = json.load(open(f"{D}/vivienda_censo.json"))["censo"]["mun"]
med = {c: dict(zip(map(int, EY), v["Mediana"])) for c, v in ees["ccaa"].items()}


def yrs(vt, c, y):
    """años de sueldo mediano de la comunidad para 80 m²: valor tasado del año × 80 / sueldo del mismo año"""
    w = med.get(c, {}).get(y)
    return vt[y - 2005] * 80 / w if vt and vt[y - 2005] and w else None


r1 = lambda v, n=1: None if v is None else round(v, n)
datos, ciud = {}, []
for f in sorted(glob.glob(f"{D}/prov/*.json")):
    P = os.path.basename(f)[:2]; cc = pcc[P]
    for c, m in json.load(open(f, encoding="utf-8")).items():
        vt = m.get("vtas")
        a24, a08, a19 = yrs(vt, cc, 2024), yrs(vt, cc, 2008), yrs(vt, cc, 2019)
        if a24 is not None: datos.setdefault(c, {})["anosSueldo"] = r1(a24)
        if a08 is not None: datos.setdefault(c, {})["anosSueldo08"] = r1(a08)
        r = ROW[c]
        if not r[F["pop"]] or r[F["pop"]] < 50000 or a24 is None or c not in cen: continue
        pad, comp, ip = m["pad"], m.get("comp") or [], m.get("ipva") or []
        pop21 = pad[25]; hh21 = m["census"]["households"]; tam = pop21 / hh21      # personas por hogar en 2021
        dpob = pad[29] - pad[23]                                                    # 2019 a 2025
        t = cen[c]; ini = reg["data"]["prov"].get(P, {}).get("viv_iniciadas", {})
        ciud.append(dict(c=c, n=r[F["name"]], p=P, pop=r[F["pop"]], a08=r1(a08), a19=r1(a19), a24=r1(a24),
            vt25=r1(vt[20] / vt[19] * 100 - 100 if vt[19] else None), vtVar=r1(vt[19] / vt[10] * 100 - 100 if vt[10] else None),
            alq=r1(m["census"]["rented"]), vac=r1(t[2] / t[0] * 100), esp=r1(t[3] / t[0] * 100), tur=r1(r[F["vt"]], 2), extr=r1(r[F["extr"]]),
            joven=r1(r[F["menores18"]]), dpob=r1((pad[29] / pad[23] - 1) * 100), hogNue=round(dpob / tam / 6), hogNue1000=r1(dpob / tam / 6 / pop21 * 1000),
            comp=round(sum(comp[-3:]) / 3) if len(comp) >= 3 and None not in comp[-3:] else None,
            compHab=r1(sum(comp[-3:]) / 3 / r[F["pop"]] * 1000) if len(comp) >= 3 and None not in comp[-3:] else None,
            alqVar=r1(ip[-1] - 100) if ip and ip[-1] and ip[4] else None,
            extP=r1(sum(v for v in (reg["data"]["prov"].get(P, {}).get("comp_extranjeros", {}).get(str(y)) for y in (2023, 2024, 2025)) if v is not None) / 3),
            ini=r1(sum(ini.get(str(y), 0) for y in range(2019, 2025)) / 6), dist=r[F["distCiudad"]]))
# tipo de ciudad (regla simple, no un modelo): compras de extranjeros en la provincia (media 2023–2025) de un 25 % o más → costa y extranjeros;
# si no, ciudades que ganan un 3 % o más de población en seis años → atraen población; el resto → crecen poco
for x in ciud:
    x["tipo"] = "costa" if (x["extP"] or 0) >= 25 else "atrae" if x["dpob"] >= 3 else "estable"
os.makedirs(f"{HERE}/cache/out", exist_ok=True)
SRC = "Ministerio de Vivienda (valor tasado de la vivienda libre) × 80 m², entre el sueldo mediano bruto de la comunidad (INE, Encuesta Anual de Estructura Salarial)"
json.dump({"indicadores": [["anosSueldo", "Años de sueldo mediano para pagar 80 m² (2024)", "Vivienda", "num1", SRC + ", 2024; municipios de más de 25.000 habitantes"],
                           ["anosSueldo08", "Años de sueldo mediano para pagar 80 m² (2008)", "Vivienda", "num1", SRC + ", 2008; municipios de más de 25.000 habitantes"]], "datos": datos},
          open(f"{HERE}/cache/out/esfuerzo.json", "w", encoding="utf-8"), ensure_ascii=False)
json.dump({"fuente": "Ministerio de Vivienda, INE (Censo 2021, padrón, EES, IPVA, viviendas turísticas) y Ministerio de Vivienda (iniciadas); scripts/datos/vivienda_esfuerzo.py",
           "ciudades": sorted(ciud, key=lambda x: -x["pop"])}, open(f"{D}/vivienda_ciudades.json", "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print(len(datos), "municipios con años de sueldo;", len(ciud), "ciudades")
