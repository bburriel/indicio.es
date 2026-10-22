"""Superficie de los términos municipales desde Wikidata (P2046 área, enlazada por el código INE, P772).
La altitud (P2044) NO se usa: mezcla la del casco urbano con la del punto más alto del término (Trevélez sale a 1.776 m y son 1.476 m).
La superficie se ha contrastado con la densidad que ya tenía el laboratorio (correlación 0,996 en logaritmos).
Uso: python3 wikidata_territorio.py → cache/out/territorio.json"""
import json, os, urllib.parse, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__)); os.makedirs(f"{HERE}/cache/out", exist_ok=True)
Q = """SELECT ?cod (SAMPLE(?sup) AS ?sup) WHERE {
  ?m wdt:P772 ?cod . OPTIONAL { ?m wdt:P2046 ?sup }
  FILTER(REGEX(?cod, "^[0-9]{5}$")) } GROUP BY ?cod"""
req = urllib.request.Request("https://query.wikidata.org/sparql?" + urllib.parse.urlencode({"query": Q, "format": "json"}),
                             headers={"User-Agent": "indicio.es-datos/1.0 (https://indicio.es)", "Accept": "application/sparql-results+json"})
import time
for intento in range(5):
    try: rows = json.load(urllib.request.urlopen(req, timeout=240))["results"]["bindings"]; break
    except urllib.error.HTTPError as e:   # el servicio limita a una consulta por minuto
        if e.code != 429 or intento == 4: raise
        time.sleep(70)
ix = json.load(open(f"{HERE}/../../data/index.json")); F = {f: i for i, f in enumerate(ix["fields"])}; POP = {r[0]: r[F["pop"]] for r in ix["rows"]}
datos = {}
for r in rows:
    c = r["cod"]["value"]
    if c not in POP: continue
    o = {}
    if "sup" in r:
        s = float(r["sup"]["value"])
        if 0.1 <= s <= 3000: o["superficie"] = round(s, 1)
    if o: datos[c] = o
INDICADORES = [
 ("superficie", "Superficie del término municipal (km²)", "Territorio", "num1", "Wikidata (área del término, en kilómetros cuadrados)"),
]
json.dump({"indicadores": INDICADORES, "datos": datos}, open(f"{HERE}/cache/out/territorio.json", "w"), ensure_ascii=False)
print(len(rows), "filas;", len(datos), "municipios con superficie")
