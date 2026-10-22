"""Series municipales compactas para los estudios (data/estudios.json).

Los estudios necesitan series por municipio (renta por fuentes, paro anual, padrón, alquiler,
pisos turísticos, voto) que viven en data/prov/<pp>.json, 26 MB en total. Este script las
resume en un único fichero de ~2 MB que la app carga solo al abrir un estudio.

    python3 scripts/datos/series_estudios.py

Idempotente: lee data/prov/*.json y data/refs.json y escribe data/estudios.json.
"""
import glob
import json
import os

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
DATA = os.path.join(ROOT, "data")

refs = json.load(open(os.path.join(DATA, "refs.json")))
YEARS = refs["years"]            # 2015..2024 (Atlas)
PADY = refs["padYears"]           # 1996..2025
PAROY = refs["paroYears"]         # 2015..2026
IPVAY = refs["ipvaYears"]         # 2011..2024
VTP = refs["vtPeriods"]           # 2020M08..2026M05
MIGY = refs["migYears"]           # 2021..2024

PAD_FROM = PADY.index(2015)
IPVA_FROM = IPVAY.index(2015)
SHARES = ["wage", "pension", "unemp_benefit", "other_benefits", "other_income"]
GEN = ["02201911", "02202307"]
MUN = ["04201905", "04202305"]
PARTIES = ["PP", "PSOE", "Vox", "Sumar"]


def r1(v, nd=1):
    return None if v is None else round(v, nd)


def top2(lists):
    """Dos listas más votadas de unas municipales: [[familia, %], [familia, %]]."""
    if not lists:
        return None
    s = sorted(lists, key=lambda l: -l[1])[:2]
    return [[l[2], l[1]] for l in s]


fields = [
    "code", "prov",
    "renta",        # renta neta por persona, 2015..2024
    "fuentes",      # % de la renta: salarios, pensiones, paro, otras prestaciones, otros; 2015..2023 (5 listas)
    "edad",         # edad media 2015..2023
    "mayores65",    # % mayores de 65, 2015..2023
    "pad",          # padrón 2015..2025
    "paro",         # paro registrado, media anual 2015..2026 (2026 hasta septiembre)
    "ipva",         # índice de alquiler (INE), 2015..2024
    "vtp",          # pisos turísticos, % de viviendas, por periodo (refs.vtPeriods)
    "mig",          # [total, extranjero, interior] por año 2021..2024
    "gen",          # generales 2019-11 y 2023-07: [participación, PP, PSOE, Vox, Sumar] × 2
    "mun",          # municipales 2019 y 2023: dos listas más votadas [[familia, %],[familia, %]] × 2
]
rows = []
for fn in sorted(glob.glob(os.path.join(DATA, "prov", "*.json"))):
    prov = os.path.basename(fn)[:2]
    d = json.load(open(fn))
    for code, m in d.items():
        s = m.get("s") or {}
        renta = s.get("net_income_pc")
        fu = [[r1(v) for v in (s.get(k) or [None] * len(YEARS))[: len(YEARS) - 1]] for k in SHARES] if s.get("wage") else None
        pad = (m.get("pad") or [])[PAD_FROM:]
        paro = (m.get("paro") or {}).get("y")
        ipva = (m.get("ipva") or [])[IPVA_FROM:] if m.get("ipva") else None
        vote = m.get("vote") or {}
        gen = []
        for k in GEN:
            v = vote.get(k)
            gen.append([v["turnout"]] + [r1(v["share"].get(p)) for p in PARTIES] if v else None)
        mun = [top2((vote.get(k) or {}).get("lists")) for k in MUN]
        rows.append([
            code, prov,
            [r1(v, 0) for v in renta] if renta else None,
            fu,
            [r1(v) for v in (s.get("mean_age") or [])[: len(YEARS) - 1]] or None,
            [r1(v) for v in (s.get("pct_over65") or [])[: len(YEARS) - 1]] or None,
            pad or None,
            [r1(v, 0) for v in paro] if paro else None,
            [r1(v, 2) for v in ipva] if ipva else None,
            m.get("vtp"),
            m.get("mig"),
            gen,
            mun,
        ])

out = {
    "fields": fields,
    "years": YEARS, "padYears": PADY[PAD_FROM:], "paroYears": PAROY, "ipvaYears": IPVAY[IPVA_FROM:],
    "vtPeriods": VTP, "migYears": MIGY, "fuentes": SHARES, "gen": GEN, "mun": MUN, "partidos": PARTIES,
    "rows": rows,
}
with open(os.path.join(DATA, "estudios.json"), "w") as f:
    json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
print(f"{len(rows)} municipios → data/estudios.json ({os.path.getsize(os.path.join(DATA,'estudios.json'))//1024} KB)")
