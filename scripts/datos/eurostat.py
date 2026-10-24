"""Datos regionales de Eurostat (NUTS 2 = comunidades, NUTS 3 = provincias) para comparar España con Europa.

    python3 scripts/datos/eurostat.py   → scripts/datos/cache/eurostat/<código>.json (JSON-stat tal cual, para procesar después)
"""
import os
import subprocess

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cache", "eurostat")
API = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/"
DATASETS = {
    "lfst_r_lfu3rt": "Tasa de paro por región NUTS 2, sexo y edad",
    "lfst_r_lfe2emprt": "Tasa de empleo por región NUTS 2",
    "lfst_r_lfu2ltu": "Paro de larga duración por región NUTS 2",
    "edat_lfse_04": "Población con estudios superiores por región NUTS 2",
    "edat_lfse_16": "Abandono escolar temprano por región NUTS 2",
    "nama_10r_3gdp": "PIB por región NUTS 3",
    "nama_10r_2gdp": "PIB por región NUTS 2",
    "nama_10r_2hhinc": "Renta de los hogares por región NUTS 2",
    "ilc_peps11n": "Riesgo de pobreza o exclusión social por región NUTS 2",
    "ilc_li41": "Riesgo de pobreza por región NUTS 2",
    "demo_r_pjanaggr3": "Población por grandes grupos de edad, NUTS 3",
    "demo_r_mlifexp": "Esperanza de vida por región NUTS 2",
    "demo_r_frate2": "Fecundidad por región NUTS 2",
    "tour_occ_nin2": "Pernoctaciones turísticas por región NUTS 2",
    "tgs00010": "Tasa de paro NUTS 2 (indicador resumido)",
    "prc_hpi_a": "Índice de precios de la vivienda por país (anual)",
    "ilc_lvho07a": "Sobrecarga del coste de la vivienda por país",
    "ilc_lvho02": "Régimen de tenencia de la vivienda por país",
}


def main():
    os.makedirs(OUT, exist_ok=True)
    for code, desc in DATASETS.items():
        dest = os.path.join(OUT, code + ".json")
        if os.path.exists(dest) and os.path.getsize(dest) > 1000:
            print("ya  ", code)
            continue
        r = subprocess.run(["curl", "-sS", "-L", "-m", "600", "-o", dest, "-w", "%{http_code}", API + code + "?format=JSON&lang=EN"],
                           capture_output=True, text=True)
        ok = r.stdout.strip().startswith("2") and os.path.exists(dest) and os.path.getsize(dest) > 1000
        print(("ok   " if ok else "FALLO"), r.stdout.strip(), code, desc)
        if not ok and os.path.exists(dest):
            os.remove(dest)


if __name__ == "__main__":
    main()
