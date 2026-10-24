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


def descargar():
    fallos = []
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
