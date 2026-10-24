"""Ayudas para casar nombres de municipios y provincias con los códigos INE (data/index.json)."""
import difflib, json, os, re, unicodedata
HERE = os.path.dirname(os.path.abspath(__file__))
ART = r"(EL|LA|LOS|LAS|L|O|A|OS|AS|ES|SA|SES|ELS|LES|LO)"
def norm(s):
    s = unicodedata.normalize("NFD", str(s).upper()); s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = s.replace("'", " ").replace("’", " ")
    m = re.match(r"^(.*)\(\s*" + ART + r"\s*\)\s*$", s.strip())
    if m: s = m.group(2) + " " + m.group(1)
    s = re.sub(r"\(.*?\)", " ", s); s = s.split("/")[0]; s = re.sub(r",\s*MUN$", "", s.strip())
    s = re.sub(r"[^A-Z0-9 ,]", " ", s)
    m = re.match(r"^(.*),\s*" + ART + r"$", s.strip())
    if m: s = m.group(2) + " " + m.group(1)
    s = re.sub(r"^" + ART + r"\s+", "", s.strip())
    return re.sub(r"[ ,]+", " ", s).strip()
IX = json.load(open(f"{HERE}/../../data/index.json", encoding="utf-8")); _F = {k: i for i, k in enumerate(IX["fields"])}
POP = {r[0]: r[_F["pop"]] for r in IX["rows"]}
BYPROV = {}
for r in IX["rows"]:
    for nm in {r[_F["name"]], *str(r[_F["name"]]).split("/")}:
        BYPROV.setdefault(r[0][:2], {})[norm(nm)] = r[0]
_AL = f"{HERE}/cache/nombres_alias.json"
if os.path.exists(_AL):   # variantes de nombre de Hacienda, Seguridad Social y SEPE (nombres_alias.py)
    for c, ns in json.load(open(_AL, encoding="utf-8")).items():
        if c in POP:
            for n in ns: BYPROV.setdefault(c[:2], {}).setdefault(n, c)
GLOBAL = {}
for p, d in BYPROV.items():
    for n, c in d.items(): GLOBAL.setdefault(n, set()).add(c)
PROV = {norm(n): c for c, n in IX["provs"].items()}
for c, n in IX["provs"].items():
    for part in re.split(r"[/,]", n): PROV.setdefault(norm(part), c)
PROV.update({"ALAVA": "01", "ARABA": "01", "BALEARES": "07", "ILLES BALEARS": "07", "BALEARS": "07", "CORUNA": "15", "GUIPUZCOA": "20", "GIPUZCOA": "20",
             "VIZCAYA": "48", "BIZKAIA": "48", "PALMAS": "35", "SANTA CRUZ DE TENERIFE": "38", "S C TENERIFE": "38", "STA CRUZ TENER": "38", "RIOJA": "26",
             "ORENSE": "32", "LERIDA": "25", "GERONA": "17", "CASTELLON": "12", "ALICANTE": "03", "VALENCIA": "46", "NAVARRA": "31", "ASTURIAS": "33",
             "CANTABRIA": "39", "MADRID": "28", "MURCIA": "30", "CEUTA": "51", "MELILLA": "52"})
def prov_code(name): return PROV.get(norm(name))
def mun_code(prov, name, alias=None, cutoff=0.88, exact=False):
    """Código INE del municipio: nombre exacto (normalizado) en la provincia, luego nombre único en España, luego parecido (difflib)."""
    n = norm(name); d = BYPROV.get(prov, {})
    if alias and n in alias: n = norm(alias[n])
    if n in d: return (d[n], True) if exact else d[n]
    g = GLOBAL.get(n)
    if g and len(g) == 1: return (next(iter(g)), True) if exact else next(iter(g))
    c = difflib.get_close_matches(n, list(d), n=1, cutoff=cutoff)
    r = d[c[0]] if c else None
    return (r, False) if exact else r
