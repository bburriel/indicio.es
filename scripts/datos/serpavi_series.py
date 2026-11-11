#!/usr/bin/env python3
"""Mediana anual del alquiler (€ al mes por vivienda) de España y de las grandes ciudades, 2015–2024, desde el SERPAVI.

Añade `alqMed` a `es` y a cada ciudad de `data/vivienda.json` (junto a `alqMes`, la media del INE, que no se toca).
Hay que lanzarlo después de `vivienda.py`, que reescribe el fichero entero.

Fichero: el mismo Excel que `serpavi.py` (cache/serpavi/serpavi_2011-2024.xlsx).

Por qué hace falta calcular: el fichero da, para cada comunidad, provincia o municipio y tipología (VC piso, VU casa), el número de
inmuebles y los percentiles 25, 50 y 75 del alquiler mensual, pero no el total de España. Cada componente se aproxima con una
lognormal (mediana = p50, dispersión = ln(p75/p25) / 1,349) y la mediana del conjunto es la de la mezcla ponderada por inmuebles.
- España: las 17 comunidades de territorio fiscal común, más Ceuta y Melilla, es decir, sin Navarra (desde 2021) y País Vasco (solo 2024),
  para que la serie compare siempre lo mismo. Contraste: la misma cuenta con los 8.000 municipios da 436,9 y 439,8 € en 2015 y 598,1 y 600,7 € en 2024.
- Ciudades: mezcla de pisos y casas del propio municipio; secreto estadístico por debajo de 10 inmuebles por tipología.
Comprobación del método: con los municipios de cada provincia se reproduce la mediana publicada de la provincia (pisos) con un error medio del 1,2 %
(máximo 5,5 %), y las comunidades dan casi lo mismo que los municipios. Los alquileres se agrupan en cifras redondas (350, 400, 500 €), por eso
la mediana publicada da saltos que la mezcla suaviza.
"""
import json, math, os, sys
from statistics import NormalDist
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import serpavi as s

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = f"{HERE}/../../data/vivienda.json"
N = NormalDist()
YEARS = range(2015, 2025)
# nombre en data/vivienda.json → código INE del municipio
CIUDADES = {"Alacant/Alicante": "03014", "Barcelona": "08019", "Córdoba": "14021", "Gijón": "33024", "Hospitalet de Llobregat, L'": "08101",
            "Madrid": "28079", "Murcia": "30030", "Málaga": "29067", "Palma de Mallorca": "07040", "Palmas de Gran Canaria, Las": "35016",
            "Sevilla": "41091", "Valladolid": "47186", "València": "46250", "Vigo": "36057", "Zaragoza": "50297"}


def comp(r, y, t):
    n = s.num(r.get(f"BI_ALVHEPCO_T{t}_{y}")) or 0
    p50, p25, p75 = (s.num(r.get(f"ALQTBID12_{q}_{t}_{y}")) for q in ("M", "25", "75"))
    if n < s.MIN_PRECIO or not p50 or not p25 or not p75 or p75 <= p25: return None
    return n, math.log(p50), math.log(p75 / p25) / 1.349


def mediana(rows, y):
    cs = [c for c in (comp(r, f"{y % 100:02d}", t) for r in rows for t in ("VC", "VU")) if c]
    if not cs: return None
    W = sum(c[0] for c in cs)
    lo, hi = 0.0, 10.0
    for _ in range(60):
        m = (lo + hi) / 2
        if sum(c[0] * N.cdf((m - c[1]) / c[2]) for c in cs) / W < .5: lo = m
        else: hi = m
    return round(math.exp(m))


def main():
    com = [r for r in s.filas(s.XLSX, "CCAA") if "LITCCAA" in r and str(r["CCAA"])[:2] not in ("15", "16")]
    assert len(com) == 17, len(com)
    mun = {str(int(float(r["CUMUN"]))).zfill(5): r for r in s.filas(s.XLSX, "Municipios") if "CUMUN" in r}
    d = json.load(open(OUT, encoding="utf-8"))
    d["es"]["alqMed"] = {str(y): mediana(com, y) for y in YEARS}
    for n, c in CIUDADES.items():
        serie = {str(y): mediana([mun[c]], y) for y in YEARS}
        assert all(serie.values()), (n, serie)
        d["ciudades"][n]["alqMed"] = serie
    json.dump(d, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    e = d["es"]["alqMed"]
    print("España", e, f"{(e['2024'] / e['2015'] - 1) * 100:.1f} %")
    for n in CIUDADES:
        a = d["ciudades"][n]["alqMed"]; print(f"{n:30s} {a['2015']:5d} → {a['2024']:5d}  {(a['2024'] / a['2015'] - 1) * 100:+.0f} %   (media INE: {d['ciudades'][n]['alqMes'].get('2015')} → {d['ciudades'][n]['alqMes'].get('2024')})")


if __name__ == "__main__": main()
