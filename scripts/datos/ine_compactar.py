"""Compacta las tablas descargadas por ine_api.py (cache/ine/<id>.json, formato de la API) a un formato ligero:

    cache/ine_compacto/<id>.json.gz = {"id", "nombre", "unidad", "dims": [variables], "periodos": [...],
                                       "series": [{"cod", "d": [valor de cada variable], "v": [valores alineados con periodos]}]}
    cache/ine_resumen.json          = por tabla: nombre, variables con sus valores distintos, primer y último periodo, nº de series

    python3 scripts/datos/ine_compactar.py
"""
import gzip
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "cache", "ine")
DST = os.path.join(HERE, "cache", "ine_compacto")


def etiqueta(p):
    per = (p.get("T3_Periodo") or "").strip()
    anyo = p.get("Anyo")
    return str(anyo) if per in ("", "A") else f"{anyo}{per}"


def orden(lbl):
    # 2024 < 2024T1 < 2024M01 ... basta con ordenar por año y luego por la parte del periodo
    return (lbl[:4], lbl[4:])


def main():
    os.makedirs(DST, exist_ok=True)
    nombres = json.load(open(os.path.join(SRC, "_indice.json")))
    resumen = {}
    for f in sorted(os.listdir(SRC)):
        if not f.endswith(".json") or f.startswith("_"):
            continue
        tid = f[:-5]
        out = os.path.join(DST, tid + ".json.gz")
        try:
            data = json.load(open(os.path.join(SRC, f)))
        except Exception as e:  # noqa: BLE001
            print("error leyendo", f, e)
            continue
        if not isinstance(data, list) or not data:
            continue
        dims = []
        for s in data:
            for m in s.get("MetaData") or []:
                if m.get("T3_Variable") not in dims:
                    dims.append(m.get("T3_Variable"))
        periodos = sorted({etiqueta(p) for s in data for p in (s.get("Data") or [])}, key=orden)
        idx = {p: i for i, p in enumerate(periodos)}
        series = []
        valores = {k: set() for k in dims}
        for s in data:
            md = {m.get("T3_Variable"): m.get("Nombre") for m in (s.get("MetaData") or [])}
            v = [None] * len(periodos)
            for p in s.get("Data") or []:
                v[idx[etiqueta(p)]] = p.get("Valor")
            series.append({"cod": s.get("COD"), "d": [md.get(k) for k in dims], "v": v})
            for k in dims:
                if md.get(k) is not None:
                    valores[k].add(md.get(k))
        doc = {"id": int(tid), "nombre": nombres.get(tid), "unidad": data[0].get("T3_Unidad"), "dims": dims, "periodos": periodos, "series": series}
        with gzip.open(out, "wt", encoding="utf-8") as g:
            json.dump(doc, g, ensure_ascii=False, separators=(",", ":"))
        resumen[tid] = {"nombre": nombres.get(tid), "unidad": data[0].get("T3_Unidad"), "series": len(series),
                        "periodos": [periodos[0], periodos[-1], len(periodos)] if periodos else None,
                        "dims": {k: (sorted(valores[k])[:60] + (["…"] if len(valores[k]) > 60 else [])) for k in dims},
                        "n_valores": {k: len(valores[k]) for k in dims}}
        print(tid, len(series), "series", periodos[:1], periodos[-1:], f"{os.path.getsize(out)//1024} KB")
    with open(os.path.join(HERE, "cache", "ine_resumen.json"), "w") as f:
        json.dump(resumen, f, ensure_ascii=False, indent=1)
    print("Hecho:", len(resumen), "tablas")


if __name__ == "__main__":
    main()
