"""Tabla en Markdown de los indicadores añadidos al laboratorio: tema, indicador, fuente y cobertura. Uso: python3 resumen.py"""
import json, os
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "data")
ix = json.load(open(f"{D}/index.json")); ex = json.load(open(f"{D}/extra.json")); cat = json.load(open(f"{D}/indicadores.json"))
orig = set(json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "cache", "index_original.json")))["cat"])
col = {k: i for i, k in enumerate(ex["fields"])}; n = len(ex["rows"])
print("| Tema | Indicador | Fuente | Municipios con dato |\n|---|---|---|---|")
for c in sorted((c for c in cat if c["k"] not in orig), key=lambda c: (c["g"], c["l"])):
    k = c["k"]; m = sum(1 for r in ex["rows"] if r[col[k]] is not None)
    cob = f"{m:,}".replace(",", ".")
    print(f"| {c['g']} | {c['l']} | {c['src'].split(' (')[0]} | {cob} ({m / n * 100:.0f} %) |")
