"""Qué pesa más donde más ha subido el alquiler (data/vivienda_pesos.json), para el análisis de vivienda.

Reparte entre cinco grupos de factores la parte de las diferencias de subida del alquiler (2020–2024) que explican,
con el método de Shapley sobre el R² de una regresión ponderada por población, y da un intervalo del 90 % con 300
remuestreos (bootstrap). Es una comparación entre lugares, no un experimento: dice qué separa a los municipios
donde más ha subido de los demás, no qué pasaría si se cambiara cada cosa.

municipios   Municipios de 5.000 habitantes o más con todos los datos. Controles: renta y tamaño (logaritmos).
             Dos versiones: entre todos los municipios y comparando solo dentro de cada provincia (efectos fijos).
provincias   Provincias con índice de alquiler (IPVA) 2019 y 2024: población, viviendas terminadas por habitante
             (libres y protegidas, 2019–2024), viviendas no principales y turísticas.

    python3 scripts/datos/vivienda_pesos.py      (solo lee data/)
"""
import itertools, json, math, os
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__)); DATA = f"{HERE}/../../data"
ix = json.load(open(f"{DATA}/index.json", encoding="utf-8")); ex = json.load(open(f"{DATA}/extra.json", encoding="utf-8"))
F = {k: i for i, k in enumerate(ix["fields"])}; FX = {k: i for i, k in enumerate(ex["fields"])}
ROWS = []
for r, e in zip(ix["rows"], ex["rows"]):
    d = {k: r[i] for k, i in F.items()}; d.update({k: e[i] for k, i in FX.items()}); ROWS.append(d)
B = 300

def shapley(fit, names):
    c = {}
    def v(S):
        S = tuple(sorted(S))
        if S not in c: c[S] = fit(S)
        return c[S]
    n = len(names); out = {}
    for g in names:
        o = [h for h in names if h != g]
        out[g] = sum(math.factorial(m) * math.factorial(n - m - 1) / math.factorial(n) * (v(S + (g,)) - v(S))
                     for m in range(n) for S in itertools.combinations(o, m))
    return out

def wls_r2(A, y, w):
    sw = np.sqrt(w); b, *_ = np.linalg.lstsq(A * sw[:, None], y * sw, rcond=None); res = y - A @ b
    return 1 - np.sum(w * res ** 2) / np.sum(w * (y - np.average(y, weights=w)) ** 2), b

def decompose(y, w, X, groups, base, seed):
    """X: dict de columnas estandarizadas; base: matriz fija (constante o provincias + controles)."""
    names = list(groups)
    def r2(S, idx):
        cols = [X[k] for g in S for k in groups[g]]
        A = np.column_stack(cols + [base]) if cols else base
        return wls_r2(A[idx], y[idx], w[idx])[0]
    allidx = np.arange(len(y)); r0 = r2((), allidx)
    sh = shapley(lambda S: r2(S, allidx), names); tot = sum(sh.values())
    rng = np.random.default_rng(seed); boot = []
    for _ in range(B):
        idx = rng.integers(0, len(y), len(y)); s = shapley(lambda S: r2(S, idx), names); t = sum(s.values())
        boot.append({g: s[g] / t * 100 for g in names})
    full, b = wls_r2(np.column_stack([X[k] for g in names for k in groups[g]] + [base]), y, w)
    keys = [k for g in names for k in groups[g]]
    return {"r2base": r0, "r2": full, "añaden": tot,
            "pesos": [{"g": g, "v": sh[g] / tot * 100, "lo": float(np.percentile([x[g] for x in boot], 5)),
                       "hi": float(np.percentile([x[g] for x in boot], 95))} for g in names],
            "coef": {k: float(b[i]) for i, k in enumerate(keys)}, "sd": float(y.std())}

std = lambda x: (x - x.mean()) / x.std()
out = {"desde": 2020, "hasta": 2024}

# ---------- municipios ----------
G = {"Demanda": ["pobVar20", "afilVar19"], "Construcción nueva": ["compNueva"], "Vacías o secundarias": ["noPrincipal"],
     "Pisos turísticos": ["vt", "vtCambio"], "Compraventas": ["compHab"]}
need = ["alqVar20", "renta", "pop", "prov"] + [k for g in G.values() for k in g]
D = [r for r in ROWS if r["pop"] and r["pop"] >= 5000 and all(r.get(k) is not None for k in need)]
y = np.array([r["alqVar20"] for r in D], float); w = np.array([r["pop"] for r in D], float)
X = {k: std(np.array([r[k] for r in D], float)) for g in G.values() for k in g}
ctrl = np.column_stack([std(np.log([r["renta"] for r in D])), std(np.log([r["pop"] for r in D]))])
provs = sorted(set(r["prov"] for r in D)); P = np.array([[1.0 if r["prov"] == p else 0.0 for p in provs] for r in D])
out["municipios"] = {"n": len(D), "pob": int(w.sum()), "pobTotal": int(sum(r["pop"] or 0 for r in ROWS)),
                     "todos": decompose(y, w, X, G, np.column_stack([ctrl, np.ones(len(y))]), 7),
                     "provincia": decompose(y, w, X, G, np.column_stack([ctrl, P]), 11)}

# ---------- provincias ----------
V = json.load(open(f"{DATA}/vivienda.json", encoding="utf-8")); agg = {}
for r in ROWS:
    a = agg.setdefault(r["prov"], {k: 0.0 for k in ("pop", "np", "npw", "vt", "vtw", "pv", "pvw")}); pop = r["pop"] or 0; a["pop"] += pop
    for k, f in (("np", "noPrincipal"), ("vt", "vt"), ("pv", "pobVar20")):
        if r[f] is not None: a[k] += r[f] * pop; a[k + "w"] += pop
DP = []
for p, a in agg.items():
    i = (V["prov"].get(p) or {}).get("ipva") or {}
    if "2019" not in i or "2024" not in i or not a["npw"] or not a["vtw"]: continue
    t = V["prov"][p].get("terminadas", {}); pr = V["prov"][p].get("protegidas", {})
    term = sum((t.get(str(yy)) or 0) + (pr.get(str(yy)) or 0) for yy in range(2019, 2025))
    DP.append({"y": (i["2024"] / i["2019"] - 1) * 100, "pob": a["pop"], "pv": a["pv"] / a["pvw"], "term": term / a["pop"] * 1000,
               "np": a["np"] / a["npw"], "vt": a["vt"] / a["vtw"]})
GP = {"Demanda": ["pv"], "Construcción nueva": ["term"], "Vacías o secundarias": ["np"], "Pisos turísticos": ["vt"]}
yp = np.array([d["y"] for d in DP]); wp = np.array([d["pob"] for d in DP], float)
XP = {k: std(np.array([d[k] for d in DP], float)) for g in GP.values() for k in g}
out["provincias"] = {"n": len(DP), "desde": 2019, **decompose(yp, wp, XP, GP, np.ones((len(yp), 1)), 3)}

json.dump(out, open(f"{DATA}/vivienda_pesos.json", "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
for k in ("todos", "provincia"):
    m = out["municipios"][k]; print(k, round(m["añaden"], 3), [(p["g"], round(p["v"]), round(p["lo"]), round(p["hi"])) for p in m["pesos"]])
p = out["provincias"]; print("provincias", p["n"], round(p["r2"], 3), [(q["g"], round(q["v"]), round(q["lo"]), round(q["hi"])) for q in p["pesos"]])
