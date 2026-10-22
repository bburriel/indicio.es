# Datos del laboratorio

Cada fuente tiene su script, que descarga de la web oficial y escribe `cache/out/<fuente>.json` con la forma
`{"indicadores": [[clave, etiqueta, grupo, formato, fuente], …], "datos": {código INE: {clave: valor}}}`.
`construir.py` fusiona todo en `data/index.json` y `data/indicadores.json` (idempotente; no toca los indicadores originales).
`cache/` no se versiona.

| Fuente | Script | Descarga | Indicadores |
|---|---|---|---|
| INE · Censo anual de población (municipios de 500 hab. o más) | `ine_censo.py` | `./descargar_ine.sh 67078 69991 69992 69993 66620 76306 70382 70381` | empleo, brecha de empleo, paro censal, temporalidad, autónomos, sectores, ocupaciones, estudios, estado civil, arraigo, inmigración reciente |
| Agencia Tributaria · IRPF por municipios | `aeat_irpf.py` | Excel por comunidad (ver el script) en `cache/aeat/` | renta bruta y disponible por declarante, composición de la renta, carga fiscal |
| Seguridad Social · Afiliados por municipio | `ss_afiliacion.py` | Excel mensual `https://www.seg-social.es/descarga/es/MuniMMAAAA` (lo descarga el propio script) | afiliados por habitante, autónomos, agrario, servicio doméstico, cambio desde 2019 y 2021 |

Orden: descargar → script de la fuente → `python3 construir.py` → `npm run build`.
