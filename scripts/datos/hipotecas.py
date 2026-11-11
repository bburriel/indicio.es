#!/usr/bin/env python3
"""Hipotecas, tipos de interés, entrada y cuota (para «¿Por qué cuesta tanto pagar una casa?»).

Escribe data/hipotecas.json con una fila por año (2003–2025):
  tedr, tae   tipo y TAE de las hipotecas nuevas sobre vivienda (Banco de España, boletín estadístico, cuadros 19.3 y 19.6; media de los 12 meses)
  euribor     Euríbor a 12 meses (cuadro 19.1; media de los 12 meses)
  tipoIne, plazo, n, importe   INE, Estadística de Hipotecas, viviendas: tablas 24460 (tipo al inicio), 24461 (plazo), 3223 (número e importe)
  ltv         préstamo sobre el precio de compra de la vivienda, mediana (Banco de España); 2004–2007 se fija en 105, el centro de 103–107
  cuota       cuota mensual de una hipoteca con el importe y el plazo medios del INE y el TEDR del Banco de España (sistema francés)

Los CSV del Banco de España (be1901, be1903, be1906) se bajan a mano de
https://www.bde.es/webbe/es/estadisticas/otras-clasificaciones/publicaciones/boletin-estadistico/capitulo-19.html
y se guardan en cache/bde/. Las tablas del INE se transcribieron de los CSV de INEbase
(https://ine.es/jaxiT3/files/t/es/csv_bd/<tabla>.csv): volver a contrastarlas con el original al actualizar.
"""
import csv, json, os, collections
AQUI = os.path.dirname(os.path.abspath(__file__))
BDE = os.path.join(AQUI, "cache", "bde")
MES = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"]

# INE: año -> (tipo al inicio %, plazo en años, número de hipotecas, importe medio €)
INE = {2003: (4.31, 23, 989439, 97202), 2004: (3.61, 24, 1107664, 110275), 2005: (3.35, 25, 1257613, 124797),
       2006: (3.76, 27, 1342171, 140324), 2007: (4.64, 28, 1238890, 148865), 2008: (5.12, 27, 836419, 139655),
       2009: (4.34, 24, 650889, 117804), 2010: (3.59, 24, 607535, 116934), 2011: (3.75, 24, 408461, 111922),
       2012: (4.13, 24, 273873, 103438), 2013: (4.21, 23, 199703, 100011), 2014: (3.83, 23, 204302, 102253),
       2015: (3.31, 23, 246767, 106736), 2016: (3.21, 23, 282707, 109787), 2017: (2.89, 23, 312843, 117199),
       2018: (2.63, 24, 348326, 124265), 2019: (2.57, 23, 361291, 125615), 2020: (2.20, 24, 337752, 134738),
       2021: (1.92, 25, 418058, 137523), 2022: (1.99, 24, 464107, 144914), 2023: (3.11, 24, 380966, 141827),
       2024: (3.26, 24, 425522, 145361), 2025: (2.93, 25, 498429, 164159)}
# Banco de España: préstamo sobre precio de compra, mediana (%)
LTV = {2004: 105, 2005: 105, 2006: 105, 2007: 105, 2008: 96, 2009: 89, 2010: 88, 2011: 86}


def serie(fichero, col):
    filas = list(csv.reader(open(os.path.join(BDE, fichero), encoding="latin-1")))
    por_año = collections.defaultdict(list)
    for f in filas[6:]:
        if not f or f[0][:3] not in MES:
            continue
        try:
            por_año[int(f[0].split()[1])].append(float(f[col]))
        except (ValueError, IndexError):
            pass
    return {a: round(sum(v) / len(v), 2) for a, v in por_año.items() if len(v) == 12}


def cuota(importe, tipo, años):
    i, n = tipo / 1200, años * 12
    return importe * i / (1 - (1 + i) ** -n)


def main():
    euribor, tedr, tae = serie("be1901.csv", 5), serie("be1903.csv", 1), serie("be1906.csv", 1)
    out = {}
    for a, (tipo, plazo, n, imp) in sorted(INE.items()):
        o = {"tipoIne": tipo, "plazo": plazo, "n": n, "importe": imp, "euribor": euribor.get(a), "tedr": tedr.get(a), "tae": tae.get(a),
             "ltv": LTV.get(a, 80 if a >= 2012 else None)}
        if o["tedr"] is not None:
            o["cuota"] = round(cuota(imp, o["tedr"], plazo))
        out[str(a)] = o
    ruta = os.path.join(AQUI, "..", "..", "data", "hipotecas.json")
    json.dump({"anual": out, "fuentes": "INE (Estadística de Hipotecas) y Banco de España (boletín estadístico, cap. 19)"}, open(ruta, "w"), ensure_ascii=False, separators=(",", ":"))
    print(len(out), "años ->", os.path.normpath(ruta))


if __name__ == "__main__":
    main()
