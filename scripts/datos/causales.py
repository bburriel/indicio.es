"""Datos para tres análisis causales (data/causales.json), a partir de las series limpias de otras fuentes.

reforma   Reforma laboral de 2022. Municipios con al menos 100 contratos iniciales en 2019, repartidos en cuatro grupos
          según el % de contratos temporales de 2019 (exposición). Por grupo: contratos iniciales indefinidos y temporales
          por mes (2019-01 a 2026-09), afiliados en diciembre (2016–2025) y paro registrado medio anual (2016–2025).
hogar     Salario mínimo de 2019. Municipios con renta por persona de 2018 (Atlas), en cinco grupos de igual población según
          esa renta. Por grupo: afiliados al sistema especial de empleados de hogar, al agrario y total, en diciembre (2013–2025).
tension   Zonas tensionadas de Cataluña. Compraventas de vivienda por municipio y trimestre (total y segunda mano) de los
          municipios de Cataluña y de los de 20.000 habitantes o más del resto de España, con población y renta.

    python3 scripts/datos/causales.py      (necesita cache/out_series_*.json y cache/out_mivau_trim.json)
"""
import glob
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__)); C = f"{HERE}/cache"; DATA = f"{HERE}/../../data"
L = lambda f: json.load(open(f"{C}/{f}"))
ix = json.load(open(f"{DATA}/index.json", encoding="utf-8")); F = {k: i for i, k in enumerate(ix["fields"])}
POP = {r[F["code"]]: r[F["pop"]] for r in ix["rows"]}
refs = json.load(open(f"{DATA}/refs.json"))
YRS = refs["years"]
RENTA18 = {}
for f in glob.glob(f"{DATA}/prov/*.json"):
    for c, d in json.load(open(f, encoding="utf-8")).items():
        v = (d.get("s") or {}).get("net_income_pc")
        if v and v[YRS.index(2018)]: RENTA18[c] = v[YRS.index(2018)]
out = {}


def groups_by(vals, k, weights=None):
    """Reparte los códigos en k grupos por el valor (de menos a más); con pesos, grupos de igual peso total."""
    cs = sorted(vals, key=lambda c: vals[c]); w = weights or {c: 1 for c in cs}; tot = sum(w[c] for c in cs); acc = 0; g = {}
    for c in cs:
        g[c] = min(k - 1, int(acc / tot * k)); acc += w[c]
    return g


# --- reforma laboral ---
se = L("out_series_sepe.json"); M = se["mensual"]; per = M["periodos"]; ss = L("out_series_ss.json")
i19 = [i for i, p in enumerate(per) if p.startswith("2019")]
expo = {}
for c, rows in M["datos"].items():
    ind = sum(rows[i][0] or 0 for i in i19); tmp = sum(rows[i][1] or 0 for i in i19)
    if ind + tmp >= 100: expo[c] = tmp / (ind + tmp) * 100
G = groups_by(expo, 4)
Y = se["years"]; afY = [int(p[:4]) for p in ss["periodos"]]; dec = [i for i, p in enumerate(ss["periodos"]) if p.endswith("12")]
grp = []
for g in range(4):
    cs = [c for c in G if G[c] == g]
    mon = [[sum(M["datos"][c][i][0] or 0 for c in cs), sum(M["datos"][c][i][1] or 0 for c in cs)] for i in range(len(per))]
    afil = {afY[i]: sum((ss["series"].get(c, {}).get("total") or [0] * len(afY))[i] or 0 for c in cs) for i in dec}
    paro = {y: sum((se["series"].get(c, {}).get("paro") or [None] * len(Y))[Y.index(y)] or 0 for c in cs) for y in range(2016, 2026)}
    hos = {afY[i]: sum((ss["series"].get(c, {}).get("hosteleria") or [0] * len(afY))[i] or 0 for c in cs) for i in dec}
    agr = {afY[i]: sum((ss["series"].get(c, {}).get("agri") or [0] * len(afY))[i] or 0 for c in cs) for i in dec}
    grp.append({"n": len(cs), "pop": sum(POP.get(c) or 0 for c in cs), "expo": round(sum(expo[c] for c in cs) / len(cs), 1),
                "lo": round(min(expo[c] for c in cs), 1), "hi": round(max(expo[c] for c in cs), 1),
                "mes": mon, "afil": {y: round(v) for y, v in afil.items() if 2016 <= y <= 2025}, "paro": {y: round(v) for y, v in paro.items()},
                "hostAgri": {y: round((hos[y] + agr[y]) / afil[y] * 100, 1) for y in afil if y == 2019 and afil[y]}})
out["reforma"] = {"periodos": per, "grupos": grp, "nmun": len(G)}
print("reforma:", [(g["n"], g["expo"], g["lo"], g["hi"]) for g in grp])

# --- salario mínimo y empleo de hogar ---
P = ss["periodos"]; D = [i for i, p in enumerate(P) if p.endswith("12") and int(p[:4]) >= 2013]
base = {c: RENTA18[c] for c in RENTA18 if c in ss["series"] and POP.get(c)}
GH = groups_by(base, 5, {c: POP[c] for c in base})
hg = []
for g in range(5):
    cs = [c for c in GH if GH[c] == g]
    s = lambda k: {int(P[i][:4]): sum(ss["series"][c][k][i] or 0 for c in cs) for i in D}
    hg.append({"n": len(cs), "pop": sum(POP[c] for c in cs), "renta": round(sum(base[c] * POP[c] for c in cs) / sum(POP[c] for c in cs)),
               "lo": round(min(base[c] for c in cs)), "hi": round(max(base[c] for c in cs)), "hogar": s("hogar"), "agrario": s("agrario"), "total": s("total")})
out["hogar"] = {"grupos": hg}
print("hogar:", [(g["n"], g["renta"], g["hogar"][2018], g["hogar"][2019]) for g in hg])

# --- zonas tensionadas y compraventas ---
mt = L("out_mivau_trim.json"); ext = json.load(open(f"{DATA}/ext.json"))
T = set(ext["tensionadas"]["codes"]); A = set(ext["tensionadas"]["ampliacion"]["codes"])
ser = {}
for c, v in mt["series"].items():
    cat = c[:2] in ("08", "17", "25", "43")
    if not cat and (POP.get(c) or 0) < 20000: continue
    if not POP.get(c): continue
    ser[c] = {"t": v["t"], "u": v["u"], "p": POP[c], "r": RENTA18.get(c), "g": 1 if c in T else 2 if c in A else 0}
out["tension"] = {"periodos": mt["periodos"], "series": ser}
print("tension:", len(ser), sum(1 for v in ser.values() if v["g"] == 1), sum(1 for v in ser.values() if v["g"] == 2))
# --- deuda de los ayuntamientos (para el análisis de quién gobierna), en miles de euros ---
de = L("out_series_deuda.json")
out["deuda"] = {"years": de["years"], "s": {c: [None if x is None else round(x / 1000) for x in v] for c, v in de["series"].items() if c in POP}}
json.dump(out, open(f"{DATA}/causales.json", "w"), separators=(",", ":"))
print(os.path.getsize(f"{DATA}/causales.json") // 1024, "KB")
