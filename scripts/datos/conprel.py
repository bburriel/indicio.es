"""Ministerio de Hacienda: CONPREL, liquidaciones de los presupuestos de las entidades locales. Gasto e ingreso de cada ayuntamiento.

Ficheros: un Access por ejercicio, que se descarga a mano desde el navegador (función DescargarFicheroAccess(ejercicio, tipoDato) de la web
de CONPREL, tipo «liquidaciones») y se guarda como cache/conprel/Liquidaciones<año>.zip (50 MB; dentro va el .accdb, de unos 400 MB).
Usados aquí: 2023 y 2024 (definitivos) y 2025 (avance de la liquidación, «LiquidacionesOctubre2025.accdb»).
La metodología («Metodología ACCESS») no se pudo consultar: lo que sigue está deducido de las propias tablas y comprobado (ver más abajo).

Cómo se lee: el script descomprime el zip y exporta con mdbtools (`apt install mdbtools` o `brew install mdbtools`) solo tres tablas a
cache/conprel/csv/<año>/ (si ya están ahí los CSV, no hace falta ni el zip ni mdbtools). Tarda unos 5 minutos por año (la exportación de
mdb-export es lenta; lo demás es cuestión de segundos).

Tablas (iguales los tres años):
- tb_inventario: una fila por entidad. `id` = grupo (el ayuntamiento y sus organismos autónomos/empresas/consorcios que lo acompañan comparten `id`),
  `idente` = la entidad concreta, `codbdgel` = código de Hacienda de 10 caracteres: 2 de provincia + 3 de municipio (= el código INE sin dígito de
  control: 28079 Madrid) + 2 de tipo + 3 de orden. Tipo AA = ayuntamiento (AA000 el ayuntamiento propiamente dicho), AE = entidad local menor (EATIM),
  MM = mancomunidad, DD = diputación o cabildo o consejo insular, RR = comarca, GG = agrupación o comunidad de villa y tierra, TT = área metropolitana
  y entidad de tratamiento, ZZ = ciudades autónomas. `poblacion` = habitantes que usa Hacienda ese año; `estado` C = cuentas rendidas.
- tb_economica_cons / tb_funcional_cons: lo consolidado de cada grupo (`id`). Es lo que se usa: el ayuntamiento más sus organismos autónomos, empresas y
  entes dependientes, sin las transferencias entre ellos (en Madrid, 5.767 M€ de gasto frente a 5.771 M€ del ayuntamiento solo y 6.200 M€ de la suma de
  las seis entidades del grupo: sumar entidades cuenta dos veces lo que el ayuntamiento transfiere a sus organismos). tb_economica y tb_funcional
  traen la misma información entidad por entidad y no se usan.
- tb_economica_cons: por grupo, tipo de presupuesto (`tipreig` G = gastos, I = ingresos) y cuenta económica (`cdcta`, de 1 a 6 caracteres: «1» capítulo,
  «10» artículo, «100» concepto, «100.00» subconcepto; los niveles son aditivos, se usa el capítulo). Importes: `imported` = créditos o previsiones
  definitivos; `importer` = obligaciones reconocidas netas (gastos) o derechos reconocidos netos (ingresos), el dato de la liquidación;
  `importel` e `importec` = la parte pagada o cobrada y la pendiente (no suman siempre `importer`: no se usan).
  Comprobado: en gastos `importer` no supera nunca a `imported`; en ingresos sí lo supera en el 37 % de las filas (se recauda más de lo previsto), como
  corresponde a derechos reconocidos.
- tb_funcional_cons: gastos por grupo, capítulo (`cdcta`) y clasificación por programas (`cdfgr`: 1 dígito = área de gasto, 2 = política de gasto,
  3 = grupo de programas, 4 = programa). Los niveles de 1 a 3 dígitos suman lo mismo; el programa (4) solo aparece en parte. Comprobado en 2024: la suma
  por área coincide con el total de gastos de la económica en los 6.853 ayuntamientos y, capítulo a capítulo, con la económica (diferencia menor de 1 €).

Qué sale (todo por ayuntamiento = grupo de tipo AA000, código INE de 5 dígitos; los demás tipos —diputaciones, mancomunidades, EATIM, consorcios— no se mezclan):
- Gasto = obligaciones reconocidas netas de los capítulos 1 a 7 («gasto no financiero»). Se dejan fuera el 8 (activos financieros: préstamos y compra de
  acciones) y el 9 (amortización de deuda), que son movimientos del balance y no gasto en servicios (2024: 0,2 y 2.212 M€ de 62.600 M€). Los intereses
  (capítulo 3) sí entran: están en la función «deuda pública» (área 0), que cuenta en el total.
- Ingresos = derechos reconocidos netos. Corrientes = capítulos 1 a 5; propios = 1, 2 y 3 (impuestos directos, impuestos indirectos, tasas y otros ingresos).
- Por habitante: media de las liquidaciones de 2023 y 2024 (si solo hay una de las dos, esa; si hay dos, la media de los importes) entre la población del
  padrón de 1 de enero de 2025 de Indicio (la misma que usa deudaHab). El padrón es más reciente que el gasto, y los municipios que crecen salen algo más
  bajos de lo real (la población que usa Hacienda es la del año de cada cuenta; ver el resumen).
- 2025 (avance) no entra en los indicadores: solo rinden cuentas 6.132 municipios y la diferencia con los definitivos mezcla cambio real y cobertura. Sí
  se guarda en cache/out_conprel_anual.json para comparar.
- Población mínima: 100 habitantes del padrón; por debajo, un solo gasto (un camión, una obra) mueve miles de euros por habitante.
- Valores extremos: no se recortan; en el resumen se listan los diez mayores de cada indicador para revisarlos.

→ cache/conprel/csv/<año>/*.csv, cache/out_conprel_anual.json (todo, por año y municipio) y cache/out/conprel.json (después: python3 construir.py conprel)"""
import csv, glob, json, os, shutil, subprocess, sys, zipfile
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = f"{HERE}/cache/conprel"
OUT = f"{HERE}/cache/out/conprel.json"
ANUAL = f"{HERE}/cache/out_conprel_anual.json"
AÑOS = (2023, 2024, 2025)
BASE = (2023, 2024)          # definitivos: de aquí sale el nivel
TABLAS = ("tb_inventario", "tb_economica_cons", "tb_funcional_cons")
MIN_POB = 100                # habitantes del padrón; por debajo, un solo gasto (un camión, una obra) mueve miles de euros por habitante
# políticas de gasto (2 dígitos de la clasificación por programas) que suma cada indicador
POLITICAS = {
    "gastoSocialHab": ["23"],          # servicios sociales y promoción social
    "gastoSeguridadHab": ["13"],       # seguridad y movilidad ciudadana: policía local, tráfico, protección civil, bomberos
    "gastoEducacionHab": ["32"],       # educación
    "gastoCulturaDeporteHab": ["33", "34"],  # cultura y deporte
    "gastoViviendaHab": ["15"],        # vivienda y urbanismo
    "gastoServiciosHab": ["16", "17"], # bienestar comunitario (agua, alcantarillado, basuras, limpieza, cementerios, alumbrado) y medio ambiente (parques)
}


def exportar(y):
    d = f"{CACHE}/csv/{y}"; os.makedirs(d, exist_ok=True)
    if all(os.path.exists(f"{d}/{t}.csv") for t in TABLAS): return d
    accdb = glob.glob(f"{CACHE}/{y}/*.accdb")
    if not accdb:
        zp = f"{CACHE}/Liquidaciones{y}.zip"
        if not os.path.exists(zp): sys.exit(f"Falta {zp}: descarga el fichero de CONPREL (ver la cabecera de este script).")
        os.makedirs(f"{CACHE}/{y}", exist_ok=True); zipfile.ZipFile(zp).extractall(f"{CACHE}/{y}")
        accdb = glob.glob(f"{CACHE}/{y}/*.accdb")
    if not shutil.which("mdb-export"): sys.exit("Falta mdbtools (mdb-export): apt install mdbtools / brew install mdbtools")
    for t in TABLAS:
        with open(f"{d}/{t}.csv", "w") as f: subprocess.run(["mdb-export", accdb[0], t], stdout=f, check=True)
    return d


def leer(y):
    """→ {id de grupo: dict}, con la población de Hacienda, gastos por capítulo, ingresos por capítulo y gasto por política (caps. 1–7)."""
    d = exportar(y)
    ayto = {}   # id de grupo → código INE (solo los AA000, el ayuntamiento propiamente dicho)
    for r in csv.DictReader(open(f"{d}/tb_inventario.csv", encoding="utf-8")):
        cod = r["codbdgel"].strip()
        if cod.endswith("AA000") and r["id"] not in ayto:
            ayto[r["id"]] = {"ine": cod[:5], "pobH": float(r["poblacion"] or 0), "estado": r["estado"].strip()}
    for a in ayto.values(): a.update(G={}, I={}, pol={})
    for r in csv.DictReader(open(f"{d}/tb_economica_cons.csv", encoding="utf-8")):
        a = ayto.get(r["id"]); c = r["cdcta"].strip()
        if a is None or len(c) != 1: continue
        a[r["tipreig"]][c] = a[r["tipreig"]].get(c, 0) + float(r["importer"])
    for r in csv.DictReader(open(f"{d}/tb_funcional_cons.csv", encoding="utf-8")):
        a = ayto.get(r["id"]); p = r["cdfgr"].strip()
        if a is None or len(p) not in (2, 3) or r["cdcta"].strip() not in "1234567": continue
        a["pol"][p] = a["pol"].get(p, 0) + float(r["importe"])
    return {a["ine"]: a for a in ayto.values() if a["G"]}


def indicadores(a):
    """Importes absolutos (euros) de un ayuntamiento y un año."""
    G, I = a["G"], a["I"]; g = lambda c: G.get(c, 0.0); i = lambda c: I.get(c, 0.0)
    gasto = sum(g(c) for c in "1234567")
    d = {"gasto": gasto, "personal": g("1"), "inversion": g("6") + g("7"),
         "ingCorr": sum(i(c) for c in "12345"), "ingProp": i("1") + i("2") + i("3"), "ingTransf": i("4"),
         "gastoCorr": sum(g(c) for c in "12345"), "ingNoFin": sum(i(c) for c in "1234567")}
    for k, ps in POLITICAS.items(): d[k] = sum(a["pol"].get(p, 0.0) for p in ps)
    d["pobH"] = a["pobH"]
    return d


def main():
    ix = json.load(open(f"{HERE}/../../data/index.json", encoding="utf-8")); F = {k: i for i, k in enumerate(ix["fields"])}
    ROW = {r[0]: r for r in ix["rows"]}; POP = {c: r[F["pop"]] or 0 for c, r in ROW.items()}; pop_total = sum(POP.values())
    anual = {}
    for y in AÑOS:
        datos = leer(y); anual[y] = {c: indicadores(a) | {"rinde": a["estado"] == "C"} for c, a in datos.items() if c in ROW}
        fuera = [c for c in datos if c not in ROW]
        tot = sum(d["gasto"] for d in anual[y].values())
        print(f"{y}: {len(anual[y])} ayuntamientos con cuentas ({sum(POP[c] for c in anual[y]) / pop_total * 100:.1f} % del padrón) · sin fila en Indicio: {fuera} · gasto no financiero {tot / 1e6:,.0f} M€ · ingresos corrientes {sum(d['ingCorr'] for d in anual[y].values()) / 1e6:,.0f} M€")
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump({str(y): v for y, v in anual.items()}, open(ANUAL, "w"), separators=(",", ":"))
    res = {}
    for c in ROW:
        ys = [y for y in BASE if c in anual[y]]
        if not ys or POP[c] < MIN_POB: continue
        m = {k: sum(anual[y][c][k] for y in ys) / len(ys) for k in anual[ys[0]][c] if k != "rinde"}
        if m["gasto"] <= 0: continue
        h = lambda v: round(v / POP[c])
        r = {"gastoHab": h(m["gasto"])}
        for k in POLITICAS: r[k] = h(m[k])
        r["personalPct"] = round(m["personal"] / m["gasto"] * 100, 1)
        r["inversionHab"] = h(m["inversion"])
        if m["ingCorr"] > 0:
            r["ingPropiosHab"] = h(m["ingProp"])
            r["transferenciasPct"] = round(m["ingTransf"] / m["ingCorr"] * 100, 1)
            r["ahorroPct"] = round((m["ingCorr"] - m["gastoCorr"]) / m["ingCorr"] * 100, 1)
        r["_n"] = len(ys); res[c] = r
    SRC = ("Ministerio de Hacienda, CONPREL, liquidaciones de los presupuestos de los ayuntamientos de 2023 y 2024 (media de los dos años; si un ayuntamiento solo tiene uno, ese); "
           "cuentas consolidadas del ayuntamiento con sus organismos autónomos y empresas; entre los habitantes del padrón de 2025; municipios de 100 habitantes o más")
    GASTO = "obligaciones reconocidas netas de los capítulos 1 a 7 (sin préstamos concedidos ni amortización de deuda)"
    ind = [
        ["gastoHab", "Gasto del ayuntamiento por habitante", "Ayuntamiento", "eur", f"Total de {GASTO}. " + SRC],
        ["gastoSocialHab", "Gasto en servicios sociales por habitante", "Ayuntamiento", "eur",
         f"Política de gasto 23 (servicios sociales y promoción social: asistencia a mayores, infancia, dependencia, inclusión, emergencia social), {GASTO}. " + SRC],
        ["gastoSeguridadHab", "Gasto en policía, tráfico y protección civil por habitante", "Ayuntamiento", "eur",
         f"Política de gasto 13 (seguridad y movilidad ciudadana: policía local, ordenación del tráfico, protección civil, extinción de incendios), {GASTO}. " + SRC],
        ["gastoEducacionHab", "Gasto en educación por habitante", "Ayuntamiento", "eur",
         f"Política de gasto 32 (educación: mantenimiento de colegios públicos, escuelas infantiles, servicios complementarios), {GASTO}. " + SRC],
        ["gastoCulturaDeporteHab", "Gasto en cultura y deporte por habitante", "Ayuntamiento", "eur",
         f"Políticas de gasto 33 y 34 (cultura, bibliotecas, fiestas populares, instalaciones y fomento del deporte), {GASTO}. " + SRC],
        ["gastoViviendaHab", "Gasto en vivienda y urbanismo por habitante", "Ayuntamiento", "eur",
         f"Política de gasto 15 (urbanismo, vivienda, vías públicas y pavimentación), {GASTO}. " + SRC],
        ["gastoServiciosHab", "Gasto en agua, basuras, alumbrado y medio ambiente por habitante", "Ayuntamiento", "eur",
         f"Políticas de gasto 16 y 17 (alcantarillado, abastecimiento de agua, recogida y tratamiento de residuos, limpieza viaria, cementerios, alumbrado, parques y jardines, medio ambiente), {GASTO}. " + SRC],
        ["personalPct", "Parte del gasto del ayuntamiento que va a personal", "Ayuntamiento", "pct",
         "Capítulo 1 (gastos de personal) entre el total de " + GASTO + ". " + SRC.split("; entre los")[0] + "; municipios de 100 habitantes o más"],
        ["inversionHab", "Inversión del ayuntamiento por habitante", "Ayuntamiento", "eur",
         "Capítulos 6 y 7 (inversiones reales y transferencias de capital), obligaciones reconocidas netas. " + SRC],
        ["ingPropiosHab", "Ingresos propios del ayuntamiento por habitante (impuestos y tasas)", "Ayuntamiento", "eur",
         "Capítulos 1, 2 y 3 de ingresos (impuestos directos como el IBI, indirectos como el ICIO, tasas y otros ingresos), derechos reconocidos netos. " + SRC],
        ["transferenciasPct", "Parte de los ingresos corrientes que son transferencias", "Ayuntamiento", "pct",
         "Capítulo 4 de ingresos (transferencias corrientes, sobre todo la participación en los tributos del Estado y de la comunidad) entre los ingresos corrientes (capítulos 1 a 5), derechos reconocidos netos. "
         + SRC.split("; entre los")[0] + "; municipios de 100 habitantes o más"],
        ["ahorroPct", "Ahorro del ayuntamiento (% de los ingresos corrientes)", "Ayuntamiento", "pct",
         "Ingresos corrientes (capítulos 1 a 5, derechos reconocidos netos) menos gastos corrientes (capítulos 1 a 5, obligaciones reconocidas netas), entre los ingresos corrientes: lo que queda antes de invertir y de pagar deuda. "
         + SRC.split("; entre los")[0] + "; municipios de 100 habitantes o más"]]
    datos = {c: {k: v for k, v in r.items() if not k.startswith("_")} for c, r in res.items()}
    json.dump({"indicadores": ind, "datos": datos}, open(OUT, "w", encoding="utf-8"), separators=(",", ":"), ensure_ascii=False)
    print(f"\nindicadores sobre 2023-2024 · municipios con dato (con dos años / con uno) · % del padrón")
    for k, *_ in ind:
        cs = [c for c, d in datos.items() if k in d]
        print(f"{k:24s} {len(cs):5d} ({sum(1 for c in cs if res[c]['_n'] == 2)}/{sum(1 for c in cs if res[c]['_n'] == 1)}) · {sum(POP[c] for c in cs) / pop_total * 100:.1f} %")
    for c in ("28079", "08019", "44260", "50260"): print(c, ROW[c][1], datos.get(c))
    for k, *_ in ind:
        v = sorted(((d[k], c) for c, d in datos.items() if k in d))
        print(f"{k}: menores {[(a, ROW[c][1]) for a, c in v[:3]]} · mayores {[(a, ROW[c][1], POP[c]) for a, c in v[-5:]]}")


if __name__ == "__main__": main()
