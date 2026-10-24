"""Fusiona en data/index.json y data/indicadores.json los indicadores que dejan los scripts de cada fuente
(cache/out/*.json, con la forma {"indicadores": [[clave, etiqueta, grupo, formato, fuente], …], "datos": {código INE: {clave: valor}}}).
Es idempotente: vuelve a escribir las columnas de las claves que ya existen y no toca las originales.
Uso: python3 construir.py [fuente …]   (sin argumentos, todas las de cache/out/)"""
import json, os, sys, glob
HERE = os.path.dirname(os.path.abspath(__file__)); DATA = os.path.join(HERE, "..", "..", "data")
ORIGINALES = {"code", "name", "prov", "pop"}  # además de los 44 indicadores que ya traía el laboratorio (no se sobrescriben)
FORMATOS = {"int", "pct", "pct_chg", "pts", "eur", "years", "num1", "km", "dens"}
ix = json.load(open(os.path.join(DATA, "index.json"), encoding="utf-8")); cat = json.load(open(os.path.join(DATA, "indicadores.json"), encoding="utf-8"))
# los indicadores añadidos viven en data/extra.json (columnas alineadas fila a fila con index.json) para no engordar el índice que carga toda la web;
# aquí se vuelve a unir todo en una tabla y al final se separa de nuevo
EXTRA = os.path.join(DATA, "extra.json")
os.makedirs(os.path.join(HERE, "cache"), exist_ok=True)
if not os.path.exists(os.path.join(HERE, "cache", "index_original.json")):   # las claves de origen son las de data/index.json (lo añadido vive en extra.json)
    json.dump({"fields": ix["fields"], "cat": [c["k"] for c in cat]}, open(os.path.join(HERE, "cache", "index_original.json"), "w"))
if os.path.exists(EXTRA):
    ex = json.load(open(EXTRA, encoding="utf-8")); assert len(ex["rows"]) == len(ix["rows"])
    ix["fields"] += ex["fields"]
    for r, e in zip(ix["rows"], ex["rows"]): r += e
orig = json.load(open(os.path.join(HERE, "cache", "index_original.json")))
bloqueadas = set(orig["fields"])
fuentes = sys.argv[1:] or sorted(os.path.basename(f)[:-5] for f in glob.glob(os.path.join(HERE, "cache", "out", "*.json")) if not f.endswith("_raw.json"))
codes = {r[0]: i for i, r in enumerate(ix["rows"])}
F = {f: i for i, f in enumerate(ix["fields"])}
nuevos = []
for fuente in fuentes:
    s = json.load(open(os.path.join(HERE, "cache", "out", fuente + ".json"), encoding="utf-8"))
    for k, l, g, f, src in s["indicadores"]:
        assert f in FORMATOS, (k, f)
        assert k not in bloqueadas, f"{k} ya existe en el laboratorio original"
        if k not in F:
            F[k] = len(ix["fields"]); ix["fields"].append(k)
            for r in ix["rows"]: r.append(None)
        for r in ix["rows"]: r[F[k]] = None
        n = 0
        for code, d in s["datos"].items():
            if code in codes and d.get(k) is not None: ix["rows"][codes[code]][F[k]] = d[k]; n += 1
        cat = [c for c in cat if c["k"] != k]; cat.append({"k": k, "l": l, "g": g, "f": f, "src": src})
        nuevos.append((fuente, k, n))
# temas del selector del laboratorio (pestañas): reparte los indicadores, incluidos los originales, en grupos de tamaño manejable
TEMAS = {
 "Riqueza": "rentaMediana p80p20 ingSalario ingDesempleo ingPrestaciones ingOtros renta rentaHog rentaVar rentaVar20 pobreza gini pensiones irpfBruta irpfDisp irpfCarga irpfTrabajo irpfActiv irpfCapital irpfExenta irpfDecl",
 "Trabajo": "paro paroReg paroRegVar paroReg15 paroCensal paroMujeres paroJovenes paroMayores45 paroSinEmpleo contrTemp pensionistas paroExtranjeros brechaParoExtr empleo empleoMujeres brechaEmpleo empleoVar temporales autonomos afilHab afilAutonomos afilAgrario afilHogar afilVar afilVar19 contrTemp25 contrTempVar paroVar07 afilMujeres afilVar11",
 "Sectores": "agri industria construccion comercio avanzados publico directivos elementales afilIndustria afilConstruccion afilComercio afilHosteleria afilProfesional afilPublico",
 "Población": "varPob var0525 pobVar20 edad menores18 mayores65 extr migExt migInt arraigo llegados inmigReciente",
 "Hogares": "hogarMedio solos casados divorciados solteros3554",
 "Educación": "superiores estudiantes estudiosBasicos superiores2539 brechaSuperiores",
 "Vivienda": "alquiler noPrincipal vt alqVar alqVar20 vtCambio compHab compNueva compProtegida compVar valorTasado valorTasadoVar",
 "Ayuntamiento": "deudaHab",
 "Voto": "pp psoe vox sumar part part24 salf24",
 "Territorio": "pop densidad superficie distCiudad distCosta",
}
tema = {k: g for g, ks in TEMAS.items() for k in ks.split()}
for c in cat:
    if c["k"] in tema: c["g"] = tema[c["k"]]
sin = [c["k"] for c in cat if c["k"] not in tema]
assert not sin, f"indicadores sin tema en construir.py: {sin}"
# el catálogo conserva el orden original y agrupa lo nuevo al final por grupo
orden = {k: i for i, k in enumerate(orig["cat"])}
cat.sort(key=lambda c: (orden.get(c["k"], 10**6),))
nb = len(orig["fields"])
json.dump({"fields": ix["fields"][:nb], "rows": [r[:nb] for r in ix["rows"]], **{k: v for k, v in ix.items() if k not in ("fields", "rows")}}, open(os.path.join(DATA, "index.json"), "w", encoding="utf-8"), separators=(",", ":"), ensure_ascii=False)
json.dump({"fields": ix["fields"][nb:], "rows": [r[nb:] for r in ix["rows"]]}, open(EXTRA, "w", encoding="utf-8"), separators=(",", ":"), ensure_ascii=False)
json.dump(cat, open(os.path.join(DATA, "indicadores.json"), "w", encoding="utf-8"), separators=(",", ":"), ensure_ascii=False)
total = len(ix["rows"])
for fuente, k, n in nuevos: print(f"{fuente:10s} {k:18s} {n:5d} municipios ({n/total*100:.0f} %)")
