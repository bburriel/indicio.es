"""Descargas de fuentes que no son del INE (Seguridad Social, Hacienda, Ministerio de Vivienda, SEPE, Notariado...).

Dos modos:
    python3 scripts/datos/externos.py explorar    # guarda las páginas índice en cache/externos/paginas/ para localizar los ficheros
    python3 scripts/datos/externos.py descargar   # baja los ficheros de FICHEROS a cache/externos/<grupo>/

Usa curl (como el resto de scripts) con un User-Agent de navegador. Hay que ejecutarlo desde un ordenador con acceso a esas webs.
"""
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "cache", "externos")
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0 Safari/537.36"

# Páginas índice: se guardan para sacar de ellas los enlaces exactos a los ficheros
PAGINAS = {
    "sepe_municipios": "https://www.sepe.es/HomeSepe/que-es-el-sepe/estadisticas/datos-estadisticos/municipios.html",
    "sepe_municipios_2025": "https://www.sepe.es/HomeSepe/que-es-el-sepe/estadisticas/datos-estadisticos/municipios/2025.html",
    "ss_muncnae": "https://www.seg-social.es/wps/portal/wss/internet/EstadisticasPresupuestosEstudios/Estadisticas/est8/est10/est305/c43ad8ea-fe79-4329-ac8e-e5758f3c4d7a/f83fe4aa-2dee-49c5-8317-98d105813796/muncnae2023",
    "ss_diciembres": "https://www.seg-social.es/wps/portal/wss/internet/EstadisticasPresupuestosEstudios/Estadisticas/EST8/EST167/5b11b695-cf1c-4abe-8a12-ecd2d0d15271/963fe7f0-2d82-4a1b-bbe9-e20436ccf9a7",
    "mivau_boletin": "https://apps.fomento.gob.es/BoletinOnline2/?nivel=2&orden=09000000",
    "mivau_boletin_vivienda": "https://apps.fomento.gob.es/BoletinOnline2/?nivel=2&orden=34000000",
    "mivau_boletin_suelo": "https://apps.fomento.gob.es/BoletinOnline2/?nivel=2&orden=36000000",
    "mivau_estadisticas": "https://www.mivau.gob.es/vivienda/estadisticas-y-estudios",
    "hacienda_pmp": "https://www.hacienda.gob.es/es-ES/CDI/Paginas/PeriodoMedioPago/InformacionAAPPs/Informes-EELL.aspx",
    "hacienda_conprel": "https://serviciostelematicosext.hacienda.gob.es/SGFAL/CONPREL",
    "notariado_portal": "https://www.notariado.org/portal/estad%C3%ADsticas",
    "penotariado": "https://www.penotariado.com/inmobiliario",
    "registradores": "https://www.registradores.org/actualidad/portal-estadistico-registral/estadisticas-de-propiedad",
    "catastro_estadisticas": "https://www.catastro.hacienda.gob.es/estadisticas/estadisticas.htm",
    "aeat_irpf": "https://sede.agenciatributaria.gob.es/Sede/estadisticas/estadisticas-territoriales/estadistica-declarantes-irpf-mayores-municipios.html",
    "datainvex": "https://comercio.gob.es/inversiones_exteriores/estadisticas/paginas/presentacion.aspx",
    "educacion_centros": "https://www.educacionfpydeportes.gob.es/servicios-al-ciudadano/catalogo/general/educacion/987654/ficha.html",
    "sanidad_centros": "https://www.sanidad.gob.es/ciudadanos/centrosCA.do",
    "interior_criminalidad": "https://estadisticasdecriminalidad.ses.mir.es/publico/portalestadistico/balances.html",
    "dgt_parque": "https://www.dgt.es/menusecundario/dgt-en-cifras/dgt-en-cifras-resultados/",
    # Boletín del Ministerio: otras secciones (visados, licencias, vivienda protegida, valor tasado...)
    **{f"mivau_orden_{o}": f"https://apps.fomento.gob.es/BoletinOnline2/?nivel=2&orden={o}000000" for o in ("30", "31", "32", "33", "34", "35", "36", "38", "40", "41", "42")},
    "mivau_inicio": "https://apps.fomento.gob.es/BoletinOnline2/",
    # SEPE: una página mensual de ejemplo para ver cómo se llaman sus ficheros (paro y contratos por municipio)
    "sepe_2026_septiembre": "https://www.sepe.es/HomeSepe/que-es-el-sepe/estadisticas/datos-estadisticos/municipios/2026/septiembre.html",
    "sepe_2025_diciembre": "https://www.sepe.es/HomeSepe/que-es-el-sepe/estadisticas/datos-estadisticos/municipios/2025/diciembre.html",
    "sepe_2019_diciembre": "https://www.sepe.es/HomeSepe/que-es-el-sepe/estadisticas/datos-estadisticos/municipios/2019/diciembre.html",
}

H = "https://www.hacienda.gob.es/cdi/sist%20financiacion%20y%20deuda/informacioneells/"
FICHEROS = {
    # Deuda viva de cada ayuntamiento a 31 de diciembre (Hacienda)
    "hacienda_deuda": [
        H + "2025/deuda-viva-ayuntamientos-202512.xlsx",
        H + "2024/deuda-viva-ayuntamientos-202412.xlsx",
        H + "2023/deuda-viva-ayuntamientos-202312.xlsx",
        H + "2022/deuda-viva-ayuntamientos-202212.xlsx",
        H + "2021/deuda-viva-ayuntamientos-20211231.xlsx",
        H + "2020/deuda-viva-ayuntamientos-20201231.xls",
        H + "2019/deuda_viva_ayuntamientos_20191231.xls",
        H + "2018/deuda_viva_ayuntamientos_20181231.xls",
        H + "2017/deuda%20viva%20ayuntamientos%201712.xls",
        H + "2016/deuda_viva_ayuntamientos_2016__ovel_20170630.xlsx",
        "https://www.hacienda.gob.es/sgfal/dgcfel/deudaviva/deuda%20viva%20ayuntamientos%202015__ovel_20160506.xls",
    ],
    # Afiliados por municipio, sector (CNAE a 2 dígitos), régimen y sexo (Seguridad Social): cada diciembre y el último mes
    "ss_muncnae": ["https://www.seg-social.es/descargas/STAT/MUNCNAE0926.xlsx"]
        + [f"https://www.seg-social.es/descargas/STAT/MUNCNAE12{y:02d}.xlsx" for y in range(15, 26)],
    # Afiliados por municipio y régimen (el mismo Excel que usa ss_afiliacion.py): septiembre de cada año
    "ss_muni": [f"https://www.seg-social.es/descarga/es/Muni09{y}" for y in range(2015, 2027)],
    # Afiliados por municipio y sector: diciembres desde 2011
    "ss_muncnae_hist": [f"https://www.seg-social.es/descargas/STAT/MUNCNAE12{y:02d}.xlsx" for y in range(11, 15)],
    # Ministerio de Vivienda (boletín estadístico): compraventas de vivienda por municipio, por residencia y nacionalidad del comprador,
    # valor de las transacciones; transacciones y precio del suelo urbano por provincia
    "mivau": ["https://apps.fomento.gob.es/BoletinOnline2/" + u for u in ['sedal/34010110.XLS', 'sedal/34010120.XLS', 'sedal/34010130.XLS', 'sedal/34010140.XLS', 'sedal/34010150.XLS', 'sedal/34010160.XLS', 'sedal/34010170.XLS', 'sedal/34010180.XLS', 'sedal/34010190.XLS', 'sedal/340101a0.XLS', 'sedal/340101b0.XLS', 'sedal/340101c0.XLS', 'sedal/340101d0.XLS', 'sedal/340101e0.XLS', 'sedal/340101f0.XLS', 'sedal/340101g0.XLS', 'sedal/340101h0.XLS', 'sedal/340101i0.XLS', 'sedal/340101j0.XLS', 'sedal/340101k0.XLS', 'sedal/340101l0.XLS', 'sedal/34010210.XLS', 'sedal/34010220.XLS', 'sedal/34010230.XLS', 'sedal/34010240.XLS', 'sedal/34010250.XLS', 'sedal/34020110.XLS', 'sedal/34020120.XLS', 'sedal/34020130.XLS', 'sedal/34020140.XLS', 'sedal/34020150.XLS', 'sedal/34020160.XLS', 'sedal/34020170.XLS', 'sedal/34020180.XLS', 'sedal/36100500.XLS', 'sedal/36101000.XLS', 'sedal/36101500.XLS', 'sedal/36102000.XLS', 'sedal/36102500.XLS', 'sedal/36103000.XLS', 'sedal/36103500.XLS', 'sedal/36104000.XLS', 'sedal/36200500.XLS', 'sedal/36201000.XLS', 'sedal/36201500.XLS', 'sedal/36300500.XLS', 'sedal/36301000.XLS', 'sedal/36301500.XLS', 'sedal/36400500.XLS', 'sedal/36401000.XLS', 'sedal/36401500.XLS', 'sedal/36402000.XLS', 'sedal/36402500.XLS', 'sedal/36403000.XLS']],
}


def curl(url, dest):
    r = subprocess.run(["curl", "-sS", "-L", "-m", "300", "-A", UA, "-o", dest, "-w", "%{http_code}", url], capture_output=True, text=True)
    code = r.stdout.strip()
    ok = r.returncode == 0 and code.startswith("2") and os.path.exists(dest) and os.path.getsize(dest) > 500
    if not ok and os.path.exists(dest):
        os.remove(dest)
    return ok, code or r.stderr.strip()[:120]


def explorar():
    d = os.path.join(OUT, "paginas")
    os.makedirs(d, exist_ok=True)
    for k, url in PAGINAS.items():
        ok, code = curl(url, os.path.join(d, k + ".html"))
        print(("ok   " if ok else "FALLO"), code, k)


def enlaces(pagina, patron):
    """Enlaces de una página índice guardada por «explorar» que cumplen el patrón."""
    import re
    f = os.path.join(OUT, "paginas", pagina + ".html")
    if not os.path.exists(f):
        return []
    return re.findall(r'href=["\']([^"\']*' + patron + r'[^"\']*)["\']', open(f, errors="ignore").read(), re.I)


def dinamicos():
    """Ficheros que se localizan leyendo páginas: secciones del boletín del Ministerio y un Excel por mes del SEPE."""
    out = {}
    mivau = []
    import glob
    for f in sorted(glob.glob(os.path.join(OUT, "paginas", "mivau_orden_*.html"))):
        o = os.path.basename(f)[12:14]
        if o in ("37", "39"):  # transporte de mercancías: no interesa
            continue
        mivau += ["https://apps.fomento.gob.es/BoletinOnline2/" + u for u in enlaces(f"mivau_orden_{o}", r"sedal/")]
    out["mivau_extra"] = sorted(set(mivau))
    # SEPE: la página general enlaza una página por mes; cada una enlaza ESTADISTICA_MUNICIPIOS.xls (paro y contratos por municipio)
    meses = sorted(set(enlaces("sepe_municipios", r"/datos-estadisticos/municipios/20\d\d/")))
    d = os.path.join(OUT, "paginas", "sepe_meses")
    os.makedirs(d, exist_ok=True)
    sepe = []
    for m in meses:
        url = m if m.startswith("http") else "https://www.sepe.es" + m
        anyo_mes = "_".join(url.rstrip("/").split("/")[-2:]).replace(".html", "")
        dest = os.path.join(d, anyo_mes + ".html")
        if not os.path.exists(dest):
            curl(url, dest)
        if os.path.exists(dest):
            import re
            x = re.findall(r'href=["\']([^"\']*ESTADISTICA_MUNICIPIOS[^"\']*\.xls)["\']', open(dest, errors="ignore").read(), re.I)
            if x:
                sepe.append((anyo_mes, "https://www.sepe.es" + x[0] if x[0].startswith("/") else x[0]))
    out["sepe_municipios"] = sepe
    # Sanidad: catálogos de centros de atención primaria, dispositivos y hospitales en CSV (enlaces «Formato CSV»)
    import html as _h
    out["sanidad"] = ["https://www.sanidad.gob.es/ciudadanos/" + _h.unescape(u) for u in enlaces("sanidad_centros", r"6578706f7274=1")]
    return out


def descargar():
    fallos = []
    din = dinamicos()
    FICHEROS["mivau_extra"] = din["mivau_extra"]
    d = os.path.join(OUT, "sanidad")
    os.makedirs(d, exist_ok=True)
    for i, url in enumerate(din["sanidad"]):
        nombre = ["centros_atencion_primaria", "dispositivos", "hospitales"][i] if i < 3 else f"sanidad_{i}"
        dest = os.path.join(d, nombre + ".csv")
        if not os.path.exists(dest):
            ok, code = curl(url, dest)
            print(("ok   " if ok else "FALLO"), code, "sanidad", nombre)
    d = os.path.join(OUT, "sepe_municipios")
    os.makedirs(d, exist_ok=True)
    print(f"SEPE: {len(din['sepe_municipios'])} meses localizados")
    for anyo_mes, url in din["sepe_municipios"]:
        dest = os.path.join(d, f"ESTADISTICA_MUNICIPIOS_{anyo_mes}.xls")
        if os.path.exists(dest):
            continue
        ok, code = curl(url, dest)
        print(("ok   " if ok else "FALLO"), code, "sepe", anyo_mes)
        if not ok:
            fallos.append(url)
    for grupo, urls in FICHEROS.items():
        d = os.path.join(OUT, grupo)
        os.makedirs(d, exist_ok=True)
        for url in urls:
            name = url.rsplit("/", 1)[-1].replace("%20", "_")
            if "." not in name[-6:]:
                name += ".xlsx"
            dest = os.path.join(d, name)
            if os.path.exists(dest):
                print("ya  ", grupo, name)
                continue
            ok, code = curl(url, dest)
            print(("ok   " if ok else "FALLO"), code, grupo, name)
            if not ok:
                fallos.append(url)
    print(f"Hecho. Fallos: {len(fallos)}")
    for u in fallos:
        print("  ", u)


if __name__ == "__main__":
    {"explorar": explorar, "descargar": descargar}.get(sys.argv[1] if len(sys.argv) > 1 else "", lambda: print(__doc__))()
