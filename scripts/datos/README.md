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
| INE · Atlas de distribución de renta de los hogares (por municipio, 2024) | `ine_atlas.py` | las lee en streaming desde INEbase (una tabla por provincia) | mediana de la renta, P80/P20, fuentes de ingreso (salarios, desempleo, otras prestaciones) y tamaño del hogar |
| SEPE · Paro registrado y contratos por municipios | `sepe.py` | Excel único `ESTADISTICA_MUNICIPIOS.xls` (lo descarga el propio script) | composición del paro (mujeres, jóvenes, mayores de 45, sin empleo anterior) y contratos temporales |
| Wikidata · superficie de los términos municipales | `wikidata_territorio.py` | consulta SPARQL (límite de una por minuto) | superficie (la altitud se descartó: mezcla criterios) |

Orden: descargar → script de la fuente → `python3 construir.py` → `npm run build`.

## Fuentes que se probaron y no se pudieron usar

- **Banda ancha** (Ministerio para la Transformación Digital): solo informes en PDF, sin archivo por municipio.
- **Presupuestos municipales** (Ministerio de Hacienda): solo consulta interactiva, sin descarga masiva.
- **Catastro**: bloquea el acceso desde la IP del entorno de ejecución en la nube; se podría intentar desde un ordenador (estadísticas urbanas anuales, IBI).
- **Interior (criminalidad)**: solo municipios de más de 20.000 habitantes y detrás de un formulario.
- **DGT (parque de vehículos)**: solo municipios de más de 10.000 habitantes y agregado.
- **INE · empresas y turismo con móviles por municipio**: tasas trimestrales muy ruidosas o tablas sin descarga completa.
- **Centros educativos y sanitarios**: no hay archivo municipal público claro.
- **Atlas de renta · ingresos muy altos y muy bajos** (% con más del 200 % o menos del 40 % de la mediana): las tablas de las provincias grandes pesan más de 1 GB (una fila por sección censal y año); queda pendiente bajarlas con un tiempo de espera mayor (ver el final de `ine_atlas.py`).

## Series del INE por provincia y comunidad (`data/regional.json`)

Tres pasos, todos con la API JSON del INE (`servicios.ine.es/wstempus`):

1. `python3 scripts/datos/ine_api.py catalogo`: lista de operaciones y de sus tablas (`cache/ine_operaciones.json`, `cache/ine_tablas.json`).
2. `python3 scripts/datos/ine_api.py descargar`: unas 60 tablas elegidas a mano (EPA, hipotecas, migraciones, PIB, empresas, turismo, IPC, condiciones de vida, salarios, censo, indicadores urbanos…) y todas las tablas de varias operaciones elegidas por nombre (precio de vivienda, compraventas, ejecuciones hipotecarias, índice de referencia del alquiler, construcción, indicadores demográficos, proyecciones, sociedades, presupuestos familiares, movilidad, matrimonios). Unos 2,3 GB en `cache/ine/`. `faltan` baja solo lo que no esté ya.
3. `python3 scripts/datos/ine_compactar.py`: lo reduce a ~30 MB (`cache/ine_compacto/<id>.json.gz`) y escribe `cache/ine_resumen.json` con las variables y periodos de cada tabla.

Después, `python3 scripts/datos/regional.py` construye `data/regional.json`: indicadores anuales (años completos) con el código INE de provincia y de comunidad. Las tasas por habitante usan el padrón de `data/refs.json`. En las comunidades de una sola provincia, el dato de una vale para la otra.

La tarea de GitHub `.github/workflows/datos-ine.yml` repite los cuatro pasos el día 3 de cada mes y hace commit de `data/regional.json` si cambia.

## Otras fuentes (`scripts/datos/externos.py`)

`descargar` baja la deuda viva de cada ayuntamiento (Hacienda, 2015–2025) y la afiliación a la Seguridad Social por municipio, sector y régimen (cada diciembre y el último mes). `explorar` guarda las páginas índice de SEPE, Ministerio de Vivienda, Hacienda, Notariado, Registradores, Catastro, AEAT, DataInvex, Educación, Sanidad, Interior y DGT para localizar los ficheros exactos de la siguiente tanda.

## Limpieza de las otras fuentes (octubre de 2026)

Todo se puede repetir con `bash scripts/datos/todo.sh limpiar` (sin volver a descargar). Los ficheros en bruto (≈1,5 GB) viven en `cache/externos/` y no se suben al repositorio; lo que llega a la web es lo compacto.

| Script | Lee | Escribe | Contraste |
|---|---|---|---|
| `sepe_series.py` | 257 Excel mensuales del SEPE (paro y contratos por municipio, 2005–2026) | `cache/out_series_sepe.json`: medias anuales de paro, sumas anuales de contratos (indefinidos, temporales, conversiones) y contratos mensuales desde 2019 | Paro de enero de 2013: 4.980.778 (oficial: 4.980.778). Hasta 2012 los ficheros no traen código INE: se casa por nombre (`geo.py`); quedan sin casar unos 15 municipios pequeños |
| `ss_series.py` | 16 Excel de afiliación por municipio y actividad (diciembre de 2011 a 2025 y septiembre de 2026) | `cache/out_series_ss.json`: afiliados por municipio, sector (CNAE agrupada), régimen y sexo | Diciembre de 2025: 21,7 millones; los valores «<5» cuentan como 2 |
| `hacienda_deuda.py` | deuda viva de los ayuntamientos, 2015–2025 (falta 2017) | `cache/out_series_deuda.json` (euros) | Suma de 2025: 16.200 millones |
| `nombres_alias.py` + `mivau.py` | compraventas de vivienda por municipio (notarios, trimestral desde 2004) y valor tasado (municipios de más de 25.000 habitantes) | `cache/out_series_mivau.json` | 2023: 638.351 compraventas (el boletín del Ministerio da 638.522); libre + protegida y nueva + usada suman el total |
| `regional.py` + `regional_otras.py` | lo anterior agregado por provincia y comunidad, tablas provinciales del Ministerio de Vivienda (extranjeros, suelo, viviendas iniciadas y protegidas), camas de hospital, IPV, esperanza de vida, teletrabajo y Eurostat | `data/regional.json` (50 indicadores) y `data/europa.json` (13 indicadores para países y regiones NUTS 2 de la UE) | |
| `indicadores_otras.py` + `construir.py otras` | las series limpias | 18 indicadores municipales nuevos en `data/extra.json` | |
| `series_otras.py` | las series limpias | series por municipio en `data/prov/*.json` (afil, contr, contrT, paroL, comp, vtas, deuda) y totales de provincia y España en `data/refs.json` (`otras`) | |

`regional.py` conserva las variables de la versión anterior de `data/regional.json` que no puede recalcular (por ejemplo, en la tarea mensual de GitHub, que solo tiene el INE).

`causales.py` prepara `data/causales.json` para los análisis de la reforma laboral, del salario mínimo y el empleo de hogar y de las compraventas con el tope del alquiler (necesita además `mivau_trim.py`, compraventas por municipio y trimestre).

`alimentos.py` prepara `data/alimentos.json` (IPC general y de alimentos por comunidad desde 2002, coste salarial por trabajador y, si se han descargado las tablas 76128, 76159 y 76132 del INE, el IPC por subclases) para el análisis del precio de los alimentos.
