"""Series municipales de otras fuentes para «Evolución» y las fichas: las añade a data/prov/<pp>.json y los totales de provincia y
España a data/refs.json (clave «otras»).

    afil   afiliados a la Seguridad Social en diciembre, 2011–2025 (ss_series.py)
    contr  contratos registrados al año, 2006–2025 (sepe_series.py)
    contrT % de contratos iniciales temporales, 2006–2025
    paroL  paro registrado, media anual, 2006–2026 (2026: enero a septiembre)
    comp   compraventas de vivienda al año, 2004–2025 (mivau.py)
    vtas   valor tasado de la vivienda libre, €/m², 2005–2025 (solo municipios de más de 25.000 habitantes)
    deuda  deuda viva del ayuntamiento a 31 de diciembre, 2015–2025, sin 2017 (hacienda_deuda.py)

Idempotente: vuelve a escribir estas claves."""
import glob
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__)); C = f"{HERE}/cache"; DATA = f"{HERE}/../../data"
L = lambda f: json.load(open(f"{C}/{f}"))
se, ss, mv, de = L("out_series_sepe.json"), L("out_series_ss.json"), L("out_series_mivau.json"), L("out_series_deuda.json")


def cut(years, vals, y0, y1):
    return [v for y, v in zip(years, vals) if y0 <= y <= y1]


YRS = {"afil": list(range(2011, 2026)), "contr": list(range(2006, 2026)), "contrT": list(range(2006, 2026)), "paroL": list(range(2006, 2027)),
       "comp": list(range(2004, 2026)), "vtas": list(range(2005, 2026)), "deuda": [y for y in range(2015, 2026)]}
ssY = [int(p[:4]) for p in ss["periodos"]]; dec = [i for i, p in enumerate(ss["periodos"]) if p.endswith("12")]


def mun_series(c):
    o = {}
    s = ss["series"].get(c)
    if s: o["afil"] = [s["total"][i] for i in dec]
    s = se["series"].get(c)
    if s:
        o["contr"] = cut(se["years"], s.get("contr") or [None] * len(se["years"]), 2006, 2025)
        ind = [(a or 0) + (b or 0) if a is not None or b is not None else None for a, b in zip(s.get("contrIndefH", []), s.get("contrIndefM", []))]
        tmp = [(a or 0) + (b or 0) if a is not None or b is not None else None for a, b in zip(s.get("contrTempH", []), s.get("contrTempM", []))]
        o["_ind"], o["_tmp"] = cut(se["years"], ind, 2006, 2025), cut(se["years"], tmp, 2006, 2025)
        o["contrT"] = [round(t / (i + t) * 100, 1) if t is not None and i is not None and (i + t) >= 30 else None for i, t in zip(o["_ind"], o["_tmp"])]
        o["paroL"] = cut(se["years"], s.get("paro") or [None] * len(se["years"]), 2006, 2026)
    s = mv["series"].get(c)
    if s:
        o["comp"] = cut(mv["years"], s.get("compraventas") or [None] * len(mv["years"]), 2004, 2025)
        if s.get("valorTasado"): o["vtas"] = cut(mv["years"], s["valorTasado"], 2005, 2025)
    s = de["series"].get(c)
    if s:
        m = dict(zip(de["years"], s)); o["deuda"] = [m.get(y) for y in YRS["deuda"]]
    return o


def total(lst, n):
    out = [None] * n
    for v in lst:
        for i, x in enumerate(v):
            if x is not None: out[i] = (out[i] or 0) + x
    return out


acc = {}   # provincia → clave → lista de series
for f in sorted(glob.glob(f"{DATA}/prov/*.json")):
    P = os.path.basename(f)[:2]; d = json.load(open(f, encoding="utf-8"))
    for c, rec in d.items():
        for k in YRS: rec.pop(k, None)
        o = mun_series(c)
        for k, v in o.items():
            acc.setdefault(P, {}).setdefault(k, []).append(v)
            if not k.startswith("_") and any(x is not None for x in v): rec[k] = v
    json.dump(d, open(f, "w", encoding="utf-8"), separators=(",", ":"), ensure_ascii=False)

refs = json.load(open(f"{DATA}/refs.json", encoding="utf-8"))
SUMK = ["afil", "contr", "paroL", "comp", "deuda", "_ind", "_tmp"]
prov = {}
for P, a in acc.items():
    t = {k: total(a[k], len(a[k][0])) for k in SUMK if k in a}
    if "_ind" in t: t["contrT"] = [round(tm / (i + tm) * 100, 1) if i is not None and tm is not None and i + tm else None for i, tm in zip(t["_ind"], t["_tmp"])]
    prov[P] = {k: [round(x) if x is not None and k != "contrT" else x for x in v] for k, v in t.items() if not k.startswith("_")}
es = {}
for k in SUMK:
    ls = [prov_k for P in acc for prov_k in ([total(acc[P][k], len(acc[P][k][0]))] if k in acc[P] else [])]
    if ls: es[k] = total(ls, len(ls[0]))
es["contrT"] = [round(t / (i + t) * 100, 1) if i is not None and t else None for i, t in zip(es["_ind"], es["_tmp"])]
es = {k: [round(x) if x is not None and k != "contrT" else x for x in v] for k, v in es.items() if not k.startswith("_")}
refs["otras"] = {"years": YRS, "es": es, "prov": prov, "paroLLast": "septiembre de 2026"}
json.dump(refs, open(f"{DATA}/refs.json", "w", encoding="utf-8"), separators=(",", ":"), ensure_ascii=False)
print({k: v[-3:] for k, v in es.items()})
print("Madrid ciudad:", {k: v[-3:] for k, v in mun_series("28079").items() if not k.startswith("_")})
