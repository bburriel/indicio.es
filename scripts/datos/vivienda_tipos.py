"""Subida del alquiler por tipo de municipio y qué se asocia a ella dentro de cada tipo.

Lee solo data/index.json y data/extra.json y escribe data/vivienda_tipos.json.

Subida: alqEurM2Var (SERPAVI, mediana del alquiler por m2, 2024 frente a 2015, misma tipologia).
Tipos (reglas simples, en este orden):
  gran    municipio de 100.000 habitantes o mas
  costa   con costa y (extranjeros >= 15 %, o pisos turisticos >= 1,5 %, o viviendas no habituales >= 50 %)
  corona  a 30 km o menos de una ciudad de 100.000 habitantes o mas
  mediana de 20.000 a 100.000 habitantes
  pueblo  el resto
Motores: correlacion de Spearman entre la subida y cada variable, dentro de cada tipo,
con intervalo del 90 % de 500 remuestreos. Es asociacion, no causa.
"""
import json
from pathlib import Path

import numpy as np
import pandas as pd

D = Path(__file__).resolve().parents[2] / "data"
i = json.load(open(D / "index.json"))
e = json.load(open(D / "extra.json"))
d = pd.concat([pd.DataFrame(i["rows"], columns=i["fields"]), pd.DataFrame(e["rows"], columns=e["fields"])], axis=1)
d = d[d["alqEurM2Var"].notna() & d["varPob"].notna() & (d["pop"] > 0)].copy()


def tipo(r):
    if r["pop"] >= 100000:
        return "gran"
    if r["distCosta"] == 0 and ((r["extr"] or 0) >= 15 or (r["vt"] or 0) >= 1.5 or (r["noPrincipal"] or 0) >= 50):
        return "costa"
    if r["distCiudad"] is not None and 0 < r["distCiudad"] <= 30:
        return "corona"
    if r["pop"] >= 20000:
        return "mediana"
    return "pueblo"


d["tipo"] = d.apply(tipo, axis=1)

LAB = {"gran": "Grandes ciudades", "costa": "Costa con turismo o extranjeros", "corona": "Coronas de las grandes ciudades",
       "mediana": "Ciudades medianas", "pueblo": "Pueblos y villas"}
DEF = {"gran": "100.000 habitantes o más", "costa": "con costa y muchos extranjeros, pisos turísticos o segundas residencias",
       "corona": "a 30 km o menos de una ciudad de 100.000", "mediana": "de 20.000 a 100.000 habitantes, sin costa turística ni gran ciudad cerca",
       "pueblo": "menos de 20.000 habitantes, lejos de una gran ciudad"}
PERFIL = ["varPob", "extr", "inmigReciente", "noPrincipal", "vt", "compHab", "superiores", "alquiler"]
MOT = [("varPob", "Población que ha llegado desde 2015"), ("afilVar19", "Empleo (afiliados) que ha crecido desde 2019"),
       ("inmigReciente", "Peso de los llegados del extranjero desde 2011"), ("noPrincipal", "Viviendas vacías o secundarias"),
       ("vt", "Pisos turísticos"), ("compHab", "Compraventas por habitante"), ("alquiler", "Peso del alquiler en el pueblo")]


def wmean(s, c):
    m = s[c].notna()
    return float(np.average(s.loc[m, c], weights=s.loc[m, "pop"])) if m.any() else None


def wq(x, w, q):
    o = np.argsort(x)
    x, w = np.asarray(x)[o], np.asarray(w)[o]
    c = np.cumsum(w) / w.sum()
    return float(x[np.searchsorted(c, q)])


def spear(a, b):
    return float(pd.Series(a).rank().corr(pd.Series(b).rank()))


rng = np.random.default_rng(7)
out = {"fuente": "SERPAVI (Ministerio de Vivienda), INE, Seguridad Social; scripts/datos/vivienda_tipos.py", "tipos": []}
for k in ["gran", "corona", "costa", "mediana", "pueblo"]:
    s = d[d.tipo == k]
    t = {"k": k, "l": LAB[k], "def": DEF[k], "n": int(len(s)), "pob": int(s["pop"].sum()),
         "subida": {"med": wq(s["alqEurM2Var"], s["pop"], .5), "p25": wq(s["alqEurM2Var"], s["pop"], .25), "p75": wq(s["alqEurM2Var"], s["pop"], .75)},
         "perfil": {c: wmean(s, c) for c in PERFIL}, "motores": [],
         "ej": s.sort_values("pop", ascending=False)["name"].head(5).tolist()}
    for c, l in MOT:
        z = s[[c, "alqEurM2Var"]].dropna()
        if len(z) < 25:
            continue
        r = spear(z[c], z["alqEurM2Var"])
        bs = [spear(z[c].values[ix], z["alqEurM2Var"].values[ix]) for ix in (rng.integers(0, len(z), len(z)) for _ in range(500))]
        t["motores"].append({"c": c, "l": l, "r": r, "lo": float(np.percentile(bs, 5)), "hi": float(np.percentile(bs, 95)), "n": int(len(z))})
    out["tipos"].append(t)
tot = d
out["total"] = {"n": int(len(tot)), "pob": int(tot["pop"].sum()), "subida": wq(tot["alqEurM2Var"], tot["pop"], .5)}
json.dump(out, open(D / "vivienda_tipos.json", "w"), ensure_ascii=False, indent=1)
for t in out["tipos"]:
    print(t["l"], t["n"], round(t["pob"] / 1e6, 1), {k: round(v) for k, v in t["subida"].items()}, t["ej"])
    print("   ", [(m["c"], round(m["r"], 2), round(m["lo"], 2), round(m["hi"], 2)) for m in t["motores"]])
