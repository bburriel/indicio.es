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
    # vivienda: oferta, demanda y esfuerzo, para comparar España con Europa
    "ilc_lvho07c": "Sobrecarga del coste de la vivienda por régimen de tenencia (propietario, inquilino a precio de mercado…)",
    "ilc_mded01": "Peso del gasto en vivienda en la renta disponible, por tipo de hogar y nivel de renta",
    "ilc_lvho05a": "Hacinamiento por edad, sexo y nivel de renta",
    "ilc_lvps08": "Jóvenes de 25 a 34 años que viven con sus padres",
    "yth_demo_030": "Edad media a la que los jóvenes se van de casa de sus padres",
    "nama_10_an6": "Formación bruta de capital fijo por tipo de activo (viviendas)",
    "sts_cobp_a": "Licencias de construcción por país (anual)",
    "lfst_hhnhtych": "Número de hogares por tipo de hogar y país",
    "demo_gind": "Población y su cambio por país",
    "prc_hpi_q": "Índice de precios de la vivienda por país (trimestral)",
    # economía por país (para comparar gobiernos); con filtros en la URL para no bajar tablas enormes
    "nama_10_pc?na_item=B1GQ&unit=CLV20_EUR_HAB&unit=CP_PPS_EU27_2020_HAB&unit=CP_EUR_HAB": "PIB por habitante (euros constantes, PPC y euros corrientes)",
    "nama_10_gdp?na_item=B1GQ&unit=CLV_PCH_PRE": "Crecimiento del PIB real",
    "une_rt_a?unit=PC_ACT&sex=T&age=Y15-74&age=Y15-24": "Tasa de paro (total y menores de 25)",
    "gov_10dd_edpt1?unit=PC_GDP&sector=S13&na_item=GD&na_item=B9": "Deuda y déficit públicos (% del PIB)",
    "prc_hicp_aind?unit=RCH_A_AVG&coicop=CP00": "Inflación (IPCA, media anual)",
    "lfsi_emp_a?indic_em=EMP_LFS&sex=T&age=Y20-64&unit=PC_POP": "Tasa de empleo de 20 a 64 años",
    "gov_10a_main?unit=PC_GDP&sector=S13&na_item=TE&na_item=TR": "Gasto e ingresos públicos (% del PIB)",
}


def main():
    os.makedirs(OUT, exist_ok=True)
    for code, desc in DATASETS.items():
        dest = os.path.join(OUT, code.split("?")[0] + ".json")
        if os.path.exists(dest) and os.path.getsize(dest) > 1000:
            print("ya  ", code)
            continue
        r = subprocess.run(["curl", "-sS", "-L", "-m", "600", "-o", dest, "-w", "%{http_code}", API + code + ("&" if "?" in code else "?") + "format=JSON&lang=EN"],
                           capture_output=True, text=True)
        ok = r.stdout.strip().startswith("2") and os.path.exists(dest) and os.path.getsize(dest) > 1000
        print(("ok   " if ok else "FALLO"), r.stdout.strip(), code.split("?")[0], desc)
        if not ok and os.path.exists(dest):
            os.remove(dest)


if __name__ == "__main__":
    main()
