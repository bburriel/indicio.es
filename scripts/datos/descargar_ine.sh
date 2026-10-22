#!/usr/bin/env bash
# Descarga las tablas completas (CSV) del INE que usa el laboratorio. Uso: ./descargar_ine.sh 67078 69991 ...
cd "$(dirname "$0")"; mkdir -p cache
for t in "$@"; do
  [ -s "cache/t$t.csv" ] && { echo "ya está $t"; continue; }
  curl -sS -m 1500 -o "cache/t$t.csv.tmp" "https://www.ine.es/jaxiT3/files/t/es/csv_bdsc/$t.csv" && mv "cache/t$t.csv.tmp" "cache/t$t.csv" && echo "ok $t $(du -h cache/t$t.csv | cut -f1)" &
done; wait
