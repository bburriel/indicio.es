"""Economía por país, año a año (data/paises.json), para el laboratorio («Países») y el análisis de los gobiernos.

Desde 1995: Eurostat (eurostat.py ya descargado): PIB por habitante, crecimiento, paro, deuda, déficit, inflación,
empleo, gasto e ingresos públicos. Antes de 1995 se alarga con el Banco Mundial (se descarga aquí, en
cache/worldbank/): el PIB por habitante se encadena con su crecimiento y el resto se toma tal cual.

    python3 scripts/datos/eurostat.py && python3 scripts/datos/paises.py
"""
import json
import os
import subprocess

HERE = os.path.dirname(os.path.abspath(__file__)); C = f"{HERE}/cache"; EU = f"{C}/eurostat"; WB = f"{C}/worldbank"
GEO = {"ES": ("España", "ESP"), "EU27_2020": ("Unión Europea", None), "EA20": ("Zona euro", None), "DE": ("Alemania", "DEU"), "FR": ("Francia", "FRA"),
       "IT": ("Italia", "ITA"), "PT": ("Portugal", "PRT"), "NL": ("Países Bajos", "NLD"), "IE": ("Irlanda", "IRL"), "GR": ("Grecia", "GRC"),
       "BE": ("Bélgica", "BEL"), "AT": ("Austria", "AUT"), "SE": ("Suecia", "SWE"), "DK": ("Dinamarca", "DNK"), "FI": ("Finlandia", "FIN"), "PL": ("Polonia", "POL")}


def eload(code):
    d = json.load(open(f"{EU}/{code}.json")); ids, size, dim, val = d["id"], d["size"], d["dimension"], d["value"]
    def get(**kw):
        res = {}
        for t, ti in dim["time"]["category"]["index"].items():
            idx = 0
            for j, k in enumerate(ids):
                i = ti if k == "time" else (dim[k]["category"]["index"].get(kw[k]) if k in kw else 0)
                if i is None: return {}
                idx = idx * size[j] + i
            x = val.get(str(idx))
            if x is not None: res[int(t)] = x
        return res
    return get


# --- Banco Mundial, para los años antes de 1995 ---
WBI = {"pibpcWB": "NY.GDP.PCAP.KD", "crecimiento": "NY.GDP.MKTP.KD.ZG", "inflacion": "FP.CPI.TOTL.ZG", "paro": "SL.UEM.TOTL.ZS"}
os.makedirs(WB, exist_ok=True)
wb = {}
codes = ";".join(v[1] for v in GEO.values() if v[1])
for k, ind in WBI.items():
    f = f"{WB}/{ind}.json"
    if not (os.path.exists(f) and os.path.getsize(f) > 1000):
        url = f"https://api.worldbank.org/v2/country/{codes}/indicator/{ind}?format=json&per_page=20000&date=1970:2025"
        r = subprocess.run(["curl", "-sS", "-L", "-m", "300", "-o", f, "-w", "%{http_code}", url], capture_output=True, text=True)
        print("Banco Mundial", ind, r.stdout.strip())
    try:
        rows = json.load(open(f))[1] or []
    except Exception as e:  # noqa: BLE001
        print("  no se pudo leer", ind, e); rows = []
    for r in rows:
        if r.get("value") is None: continue
        g = next((g for g, v in GEO.items() if v[1] == r["countryiso3code"]), None)
        if g: wb.setdefault(g, {}).setdefault(k, {})[int(r["date"])] = r["value"]

# --- Eurostat ---
specs = {
    "pibpc": ("nama_10_pc", dict(na_item="B1GQ", unit="CLV20_EUR_HAB")),
    "pibpcPPC": ("nama_10_pc", dict(na_item="B1GQ", unit="CP_PPS_EU27_2020_HAB")),
    "crecimiento": ("nama_10_gdp", dict(na_item="B1GQ", unit="CLV_PCH_PRE")),
    "paro": ("une_rt_a", dict(unit="PC_ACT", sex="T", age="Y15-74")),
    "paroJuvenil": ("une_rt_a", dict(unit="PC_ACT", sex="T", age="Y_LT25")),
    "deuda": ("gov_10dd_edpt1", dict(unit="PC_GDP", sector="S13", na_item="GD")),
    "deficit": ("gov_10dd_edpt1", dict(unit="PC_GDP", sector="S13", na_item="B9")),
    "inflacion": ("prc_hicp_aind", dict(unit="RCH_A_AVG", coicop="CP00")),
    "empleo": ("lfsi_emp_a", dict(indic_em="EMP_LFS", sex="T", age="Y20-64", unit="PC_POP")),
    "gasto": ("gov_10a_main", dict(unit="PC_GDP", sector="S13", na_item="TE")),
    "ingresos": ("gov_10a_main", dict(unit="PC_GDP", sector="S13", na_item="TR")),
}
out = {"fuente": "Eurostat (desde 1995) y Banco Mundial (antes)", "paises": {}, "gobiernos": {}}
for g, (name, _) in GEO.items():
    P = out["paises"].setdefault(g, {"n": name})
    for k, (code, kw) in specs.items():
        try: s = eload(code)(geo=g, **kw)
        except FileNotFoundError: print("falta", code); continue
        if s: P[k] = {y: round(v, 1) for y, v in s.items()}
    w = wb.get(g, {})
    # PIB por habitante: se encadena hacia atrás con el crecimiento por habitante del Banco Mundial
    if "pibpc" in P and "pibpcWB" in w:
        y0 = min(P["pibpc"]); base = w["pibpcWB"].get(y0)
        if base:
            for y, v in w["pibpcWB"].items():
                if y < y0: P["pibpc"][y] = round(P["pibpc"][y0] * v / base, 1)
    for k in ("crecimiento", "inflacion", "paro"):
        if k in w:
            first = min(P[k]) if P.get(k) else 9999
            for y, v in w[k].items():
                if y < first: P.setdefault(k, {})[y] = round(v, 1)
    for k in list(P):
        if isinstance(P[k], dict): P[k] = dict(sorted(P[k].items()))

# --- gobiernos de España (fechas de toma de posesión) ---
out["gobiernos"]["ES"] = [
    {"p": "Adolfo Suárez", "partido": "UCD", "desde": "1977-07-04", "hasta": "1981-02-26"},
    {"p": "Leopoldo Calvo-Sotelo", "partido": "UCD", "desde": "1981-02-26", "hasta": "1982-12-02"},
    {"p": "Felipe González", "partido": "PSOE", "desde": "1982-12-02", "hasta": "1996-05-05"},
    {"p": "José María Aznar", "partido": "PP", "desde": "1996-05-05", "hasta": "2004-04-17"},
    {"p": "José Luis Rodríguez Zapatero", "partido": "PSOE", "desde": "2004-04-17", "hasta": "2011-12-21"},
    {"p": "Mariano Rajoy", "partido": "PP", "desde": "2011-12-21", "hasta": "2018-06-02"},
    {"p": "Pedro Sánchez", "partido": "PSOE", "desde": "2018-06-02", "hasta": None},
]
json.dump(out, open(f"{HERE}/../../data/paises.json", "w"), ensure_ascii=False, separators=(",", ":"))
es = out["paises"]["ES"]
print(os.path.getsize(f"{HERE}/../../data/paises.json") // 1024, "KB;", {k: (min(v), max(v), len(v)) for k, v in es.items() if isinstance(v, dict)})
