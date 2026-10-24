#!/bin/bash
# Descarga y prepara TODOS los datos de una vez. Se puede relanzar: no repite lo ya descargado.
#   bash scripts/datos/todo.sh            (descarga y limpieza)
#   bash scripts/datos/todo.sh limpiar    (solo limpieza e integración, sin descargar)
# El registro queda en scripts/datos/cache/todo.log. Mientras corre, el Mac no se duerme (caffeinate).
cd "$(dirname "$0")/../.." || exit 1
mkdir -p scripts/datos/cache
LOG=scripts/datos/cache/todo.log
D=scripts/datos
paso () { echo; echo "=== $(date '+%H:%M:%S') · $1"; }
{
  if [ "$1" != "limpiar" ]; then
    paso "INE: catálogo de tablas"
    [ -s $D/cache/ine_tablas.json ] && echo "ya está" || python3 $D/ine_api.py catalogo
    paso "INE: tablas que falten"
    python3 $D/ine_api.py faltan
    paso "INE: compactar"
    python3 $D/ine_compactar.py | tail -2
    paso "Otras fuentes: páginas índice"
    python3 $D/externos.py explorar
    paso "Otras fuentes: ficheros (Hacienda, Seguridad Social, Ministerio de Vivienda, SEPE, Sanidad)"
    python3 $D/externos.py descargar
    paso "Eurostat: regiones de Europa"
    python3 $D/eurostat.py
  fi
  python3 -c "import openpyxl, xlrd" 2>/dev/null || pip3 install --user openpyxl xlrd
  paso "Limpieza: SEPE (paro y contratos por municipio y mes, 2005–hoy)"
  python3 $D/sepe_series.py
  paso "Limpieza: Seguridad Social (afiliados por municipio y sector)"
  python3 $D/ss_series.py
  paso "Limpieza: Hacienda (deuda de los ayuntamientos)"
  python3 $D/hacienda_deuda.py
  paso "Limpieza: nombres alternativos de municipios y Ministerio de Vivienda"
  python3 $D/nombres_alias.py && python3 $D/mivau.py
  paso "Provincias, comunidades y Europa (data/regional.json, data/europa.json)"
  python3 $D/regional.py | tail -8
  paso "Laboratorio: indicadores municipales (data/extra.json) y series (data/prov, data/refs.json)"
  python3 $D/indicadores_otras.py && python3 $D/construir.py otras && python3 $D/series_otras.py | tail -1
  python3 $D/mivau_trim.py && python3 $D/causales.py
  paso "Hecho"
  du -sh $D/cache/* 2>/dev/null
} 2>&1 | caffeinate -i tee -a "$LOG"
