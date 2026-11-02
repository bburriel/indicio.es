#!/usr/bin/env python3
"""Hogares de alquiler en los municipios con tope (zonas tensionadas de Cataluña).

Lo usa el análisis «¿Funcionó el tope del alquiler en Cataluña?» para poner en la misma
escala el ahorro de los inquilinos y las compraventas de más. Es una estimación:

    hogares de alquiler = población / personas por hogar × % de hogares de alquiler

con la población de data/index.json, el tamaño medio del hogar del Atlas de Renta de 2024
(`hogarMedio`, en data/extra.json) y el porcentaje de hogares de alquiler del censo de 2021
(`alquiler`, en data/index.json). Mezcla dos años; conviene sustituirla por un dato directo
del censo anual cuando haya uno por municipio.

Escribe `hogaresAlquiler` dentro de `tensionadas` en data/ext.json, que es un fichero de una
sola línea: se inserta o se sustituye el valor con una expresión regular para no reformatearlo.

Uso: python3 scripts/datos/hogares_tope.py
"""
import json
import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
DATA = RAIZ / "data"


def cargar(nombre):
    with open(DATA / nombre, encoding="utf8") as f:
        return json.load(f)


def main():
    idx, extra, ext = cargar("index.json"), cargar("extra.json"), cargar("ext.json")
    F = {k: i for i, k in enumerate(idx["fields"])}
    X = {k: i for i, k in enumerate(extra["fields"])}
    codigos = set(ext["tensionadas"]["codes"])

    n = hogares = alquiler = sin_dato = 0
    for fila, e in zip(idx["rows"], extra["rows"]):
        if fila[F["code"]] not in codigos:
            continue
        n += 1
        pob, pct, tam = fila[F["pop"]], fila[F["alquiler"]], e[X["hogarMedio"]]
        if pob and pct is not None and tam:
            hogares += pob / tam
            alquiler += pob / tam * pct / 100
        else:
            sin_dato += 1

    if n != len(codigos):
        sys.exit(f"Faltan municipios con tope en index.json: {n} de {len(codigos)}")
    if sin_dato:
        sys.exit(f"{sin_dato} municipios con tope sin población, % de alquiler o tamaño del hogar")

    valor = {
        "total": round(alquiler),
        "hogares": round(hogares),
        "municipios": n,
        "fuente": "Estimación de Indicio: población (padrón) entre personas por hogar (Atlas de Renta, 2024) por % de hogares de alquiler (censo de 2021); scripts/datos/hogares_tope.py",
    }
    nuevo = '"hogaresAlquiler":' + json.dumps(valor, ensure_ascii=False, separators=(",", ":")) + ","

    ruta = DATA / "ext.json"
    texto = ruta.read_text(encoding="utf8")
    if '"hogaresAlquiler":' in texto:
        texto = re.sub(r'"hogaresAlquiler":\{[^{}]*\},', lambda m: nuevo, texto, count=1)
    else:
        marca = '"vigencia":"2024-03-16",'
        if texto.count(marca) != 1:
            sys.exit("No encuentro el sitio donde insertar hogaresAlquiler en ext.json")
        texto = texto.replace(marca, marca + nuevo, 1)
    json.loads(texto)  # comprueba que sigue siendo JSON válido
    ruta.write_text(texto, encoding="utf8")
    print(f"{n} municipios con tope: {valor['hogares']:,} hogares, {valor['total']:,} de alquiler")


if __name__ == "__main__":
    main()
