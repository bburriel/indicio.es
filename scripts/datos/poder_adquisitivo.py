"""Poder adquisitivo y fin de mes desde 2019, y España frente a sus vecinos (data/poder-adquisitivo.json).

No descarga nada: junta series que Indicio ya tiene en data/ (IPC y coste salarial de alimentos.json, deciles de la EPA y
salario mínimo de sueldos.json, Encuesta de Condiciones de Vida de regional.json, vivienda de vivienda.json y las cuentas
por país de paises.json y europa.json) y calcula lo que necesitan los dos análisis «poder-adquisitivo» y «gestion-vecinos».

    python3 scripts/datos/poder_adquisitivo.py
"""
import json
import os
import statistics as st

HERE = os.path.dirname(os.path.abspath(__file__)); D = os.path.join(HERE, "..", "..", "data")
BASE = 2019
VECINOS = ["DE", "FR", "IT", "PT", "NL", "IE", "GR", "BE", "AT", "SE", "DK", "FI", "PL"]


def load(n): return json.load(open(f"{D}/{n}.json"))


def media(xs):
    xs = [x for x in xs if x is not None]
    return sum(xs) / len(xs) if xs else None


a = load("alimentos"); s = load("sueldos"); reg = load("regional"); viv = load("vivienda"); pa = load("paises"); eu = load("europa")
meses = a["meses"]; ipc = a["ipc"]["es"]
out = {"base": BASE}

# ---------- IPC: medias anuales y últimos 12 meses ----------
def anual(serie, y):
    return media([v for m, v in zip(meses, serie) if m.startswith(str(y))])

ultimo = meses[-1]; ultimo_anyo = int(ultimo[:4])
anyo_completo = ultimo_anyo if ultimo.endswith("M12") else ultimo_anyo - 1
out["ipcUltimoMes"] = ultimo; out["anyoCompleto"] = anyo_completo
def yoy(serie, i): return 100 * (serie[i] / serie[i - 12] - 1)
g = ipc["general"]
out["interanual"] = {"ultimo": yoy(g, len(g) - 1), "hace12": yoy(g, len(g) - 13)}
# pico de inflación interanual
yy = [yoy(g, i) if i >= 12 else -1e9 for i in range(len(g))]
ip = max(range(len(g)), key=lambda i: yy[i]); out["interanual"]["pico"] = yy[ip]; out["interanual"]["picoMes"] = meses[ip]

# ---------- coste salarial por trimestre ----------
per = a["salario"]["periodos"]; sal = dict(zip(per, a["salario"]["es"]))
def ipcq(y, q):
    return media([ipc["general"][meses.index(f"{y}M{m:02d}")] for m in range(3 * q - 2, 3 * q + 1) if f"{y}M{m:02d}" in meses])
trimestres = [p for p in per if int(p[:4]) >= BASE + 1]
real = []
for p in trimestres:
    y, q = int(p[:4]), int(p[5])
    if ipcq(y, q) is None: continue
    nom = sal[p] / sal[f"{BASE}T{q}"]; r = nom / (ipcq(y, q) / ipcq(BASE, q))
    real.append({"p": p, "nominal": 100 * (nom - 1), "real": 100 * (r - 1)})
out["salarioReal"] = real
out["salarioRealUltimo"] = real[-1]
fin = {}
for y in (2022, 2023, 2024):
    r = [x for x in real if x["p"] == f"{y}T4"]
    if r: fin[str(y)] = r[0]["real"]
out["salarioRealT4"] = fin
out["salarioRealMin"] = min(real, key=lambda x: x["real"])
# primer año en que el año completo no pierde frente a 2019
def sal_anyo(y): return media([sal[f"{y}T{q}"] for q in range(1, 5) if f"{y}T{q}" in sal])
def sal_u12(): return media([sal[p] for p in per[-4:]])

# ---------- acumulado desde la media de 2019 ----------
rub = {"alimentos": "Alimentos", "restaurantes": "Restaurantes", "general": "Precios en general", "vivienda": "Vivienda, luz, gas y agua", "transporte": "Transporte", "vestido": "Vestido"}
tabla = []
for k, lab in rub.items():
    b = anual(ipc[k], BASE); ya = anual(ipc[k], anyo_completo); u12 = media(ipc[k][-12:])
    tabla.append({"k": k, "lab": lab, "anyo": 100 * (ya / b - 1), "u12": 100 * (u12 / b - 1)})
b = sal_anyo(BASE)
tabla.append({"k": "salario", "lab": "Coste salarial por trabajador", "anyo": 100 * (sal_anyo(anyo_completo) / b - 1), "u12": 100 * (sal_u12() / b - 1)})
out["acumulado"] = tabla
out["u12desde"] = meses[-12]; out["u12hasta"] = meses[-1]
out["salarioPer"] = {"desde": per[-4], "hasta": per[-1]}

# ---------- deciles de la EPA ----------
anos = [int(x) for x in s["epa"]["años"]]; i0 = anos.index(BASE); i1 = len(anos) - 1; y1 = anos[i1]
defl = anual(g, y1) / anual(g, BASE)
dec = []
for d in range(1, 11):
    ser = s["epa"]["media"][str(d)]; n = ser[i1] / ser[i0]
    dec.append({"d": d, "ini": ser[i0], "fin": ser[i1], "nominal": 100 * (n - 1), "real": 100 * (n / defl - 1)})
out["deciles"] = dec; out["decilesAnyo"] = y1
sm = s["smiLegal"]; out["smi"] = {"ini": sm[str(BASE)], "fin": sm[str(max(int(k) for k in sm))], "finAnyo": max(int(k) for k in sm), "base": sm[str(BASE - 1)]}

# ---------- fin de mes, pobreza, AROPE ----------
def serie(d, desde=2013):
    return {int(k): v for k, v in d.items() if int(k) >= desde}
E = reg["data"]["es"]["ES"]
out["ecv"] = {k: serie(E[k]) for k in ("fin_de_mes", "pobreza_ecv", "arope")}
out["ecvPico"] = max(out["ecv"]["fin_de_mes"].items(), key=lambda kv: kv[1] if kv[0] >= BASE else -1)

# ---------- vivienda ----------
v = viv["es"]
ipv = {int(k): x for k, x in v["ipv"].items()}; ya = max(ipv)
sal_ratio = sal_anyo(ya) / sal_anyo(BASE) if sal_anyo(ya) else None
out["vivienda"] = {"ipvIni": ipv[BASE], "ipvFin": ipv[ya], "ipvAnyo": ya,
                   "masSueldo": 100 * ((ipv[ya] / ipv[BASE]) / sal_ratio - 1) if sal_ratio else None,
                   "alqIni": v["alqMes"][str(BASE)], "alqFin": v["alqMes"][str(max(int(k) for k in v["alqMes"]))],
                   "alqAnyo": max(int(k) for k in v["alqMes"])}
aq = out["vivienda"]; aq["alqCambio"] = 100 * (aq["alqFin"] / aq["alqIni"] - 1)
aq["salAlqCambio"] = 100 * (sal_anyo(aq["alqAnyo"]) / sal_anyo(BASE) - 1)
ve = viv["eu"]
def pais_serie(k, c): return {int(y): x for y, x in ve.get(c, {}).get(k, {}).items()}
out["vivienda"]["sobrecargaInq"] = {c: pais_serie("sobrecargaInquilinos", c) for c in ("ES", "EU27_2020")}
out["vivienda"]["emancipacion"] = pais_serie("edadEmancipacion", "ES")

# ---------- España frente a los 13 vecinos ----------
P = pa["paises"]; EUR = eu["data"]
def val(c, k, y): return P.get(c, {}).get(k, {}).get(str(y))
def val_eu(c, k, y): return EUR.get(c, {}).get(k, {}).get(str(y))
def fila(k, f=val):
    r = {}
    for y in range(2015, 2026):
        xs = [f(c, k, y) for c in VECINOS]; xs = [x for x in xs if x is not None]; es = f("ES", k, y)
        if es is None or not xs: continue
        r[y] = {"es": es, "med": st.median(xs), "rango": [min(xs), max(xs)], "puesto": sorted(xs + [es]).index(es) + 1, "de": len(xs) + 1}
    return r
out["vecinos"] = {"gasto": fila("gasto"), "deficit": fila("deficit"), "deuda": fila("deuda"), "paro": fila("paro"),
                  "pobreza": fila("pobreza", val_eu), "arope": fila("arope", val_eu)}
def acum(c, y0, y1):
    p = 1.0
    for y in range(y0 + 1, y1 + 1):
        x = val(c, "inflacion", y)
        if x is None: return None
        p *= 1 + x / 100
    return 100 * (p - 1)
pr = {}
for (y0, y1) in ((2015, 2019), (2019, 2025)):
    es = acum("ES", y0, y1); xs = [acum(c, y0, y1) for c in VECINOS]; xs = [x for x in xs if x is not None]
    pr[f"{y0}_{y1}"] = {"es": es, "med": st.median(xs), "puesto": sorted(xs + [es]).index(es) + 1, "de": len(xs) + 1}
out["precios"] = pr
out["vecinosLista"] = VECINOS
json.dump(out, open(f"{D}/poder-adquisitivo.json", "w"), ensure_ascii=False, separators=(",", ":"))
print("ok", os.path.getsize(f"{D}/poder-adquisitivo.json"), "bytes")
