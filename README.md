# Indicio · indicio.es

Preguntas reales, respuestas con datos públicos. Web estática (HTML + CSS + JS sin framework, d3 para los gráficos) desplegada en Netlify.

## Cómo está organizado

```
src/
  app.js          la aplicación (rutas, páginas, laboratorio, gráficos)
  styles.css      estilos
  template.html   esqueleto de cada página (head, metadatos, scripts)
  body.html       cabecera, <main>, pie
  content.mjs     contenido editorial: preguntas (título, entradilla, método, fecha, respuesta corta), temas, textos de las páginas y datos del autor
  sw.js           service worker (offline)
data/             los JSON de datos (index.json, refs, provincias, secciones, topojson)
                  estudios.json: series por municipio para los estudios (lo genera scripts/datos/series_estudios.py)
                  ext.json: datos externos de los estudios (zonas tensionadas, ERTE, estaciones AV, restricciones a pisos turísticos)
vendor/           d3, topojson-client y d3-composite-projections (servidos desde el propio dominio)
build.mjs         genera dist/: una página HTML por ruta + 8.139 fichas municipales + sitemap + RSS + robots
tools/check.mjs   abre estudios en un navegador sin cabeza y vuelca su texto y errores (CHROMIUM=<ruta> node tools/check.mjs <id> …)
snapshot.mjs      (opcional) pre-renderiza con un navegador las páginas editoriales en snapshots/ y crea las imágenes Open Graph en og/
serve.mjs         servidor local que imita a Netlify
snapshots/, og/   resultado de snapshot.mjs; se versionan para que el build no necesite navegador
dist/             lo que se despliega (no se versiona)
```

## Flujo de trabajo

```
npm run build      # genera dist/ (segundos, sin dependencias)
npm run serve      # prueba en http://localhost:8787
```

Para desplegar: arrastra la carpeta `dist/` a Netlify (o `netlify deploy --prod` si usas el CLI; `netlify.toml` ya apunta a `dist/`).

Cuando cambies textos, datos o gráficos de las páginas editoriales, regenera los snapshots y las imágenes para compartir (necesita Playwright una vez: `npm i -D playwright && npx playwright install chromium`):

```
npm run release    # build + snapshot + build
```

Si no regeneras los snapshots no pasa nada grave: las páginas se sirven con el texto estático de `content.mjs` y la app pinta el resto al cargar.

## Método y datos de los estudios

Cada estudio termina en una **ficha técnica** (unidad, variables, ponderación, modelo) y la página `/laboratorio/metodo/` explica el cálculo exacto detrás de cada etiqueta (correlación parcial por residuos, efectos fijos de provincia, gemelos, intervalos por bootstrap, placebos, discontinuidad). Las correlaciones de los estudios llevan intervalo del 95 % por remuestreo de municipios (`partialRCI`, `bootCI` en `src/app.js`).

Los estudios que necesitan series por municipio cargan `data/estudios.json` al abrirse. Para regenerarlo tras actualizar `data/prov/*.json`:

```
python3 scripts/datos/series_estudios.py
```

`data/ext.json` se monta a mano a partir de `scripts/datos/externos/` (listas con fuente y fecha: municipios tensionados del BOE, ERTE por provincia de abril de 2020, estaciones de alta velocidad abiertas 2021–2023 y restricciones municipales a las viviendas turísticas, con grado de confianza). Si añades o corriges una entrada, vuelve a montar `ext.json`.

## Estructura de los estudios

Cada estudio se presenta como un artículo de investigación: un **resumen** arriba (contexto, intervención, análisis, resultados, conclusiones), secciones numeradas (`sec(B,"ctx"|"int"|"ana"|"con",…)`), resultados numerados como 4.1, 4.2… (`res(B,título,html)`) y un apéndice de **métodos** al final (`methods(B,[[clave,valor],…])`). El resumen se crea vacío al empezar (`const AB=abstract(B)`) y se rellena al final con los números (`AB.fill({…})`).

Herramientas estadísticas disponibles en `src/app.js`: `regFn` (pendiente y correlación parcial con efectos fijos de provincia, ponderación e intervalos), `adMatch` + `esCompute` + `esCharts` (estudio de eventos con gemelos), `esPlacebo` (placebos en el espacio), `synthControl` + `synthCharts` (control sintético con placebos), `bootCI` y `placeboRank`.

## Publicar una pregunta nueva

1. Añade la entrada en `STUDIES` de `src/content.mjs` (id = URL, título, entradilla, método, tema, fecha `pub`, respuesta corta `a`). El título es único: el mismo en portada, índice y página.
2. Escribe su función `studyX(B)` en `src/app.js` y regístrala en el mapa de `renderEstudios`.
3. `npm run release` y despliega.

La fecha `upd` (revisión) se muestra junto a la de publicación si es distinta; también actualiza `SITE.dataUpdated` cuando refresques los datos.

## URLs

- `/` portada · `/preguntas/` · `/preguntas/<id>/`
- `/temas/` · `/temas/<riqueza|vivienda|poblacion|trabajo|gasto|voto>/`
- `/laboratorio/` · `/laboratorio/<cruce|mapa|ranking|evolucion|grupos|reparto|tabla>/?d=…` · `/laboratorio/metodo/`
- `/municipio/` · `/municipio/<código INE>-<nombre>/` (8.139 páginas) · `/comparar/<a>-<b>/`
- `/quien-soy/` · `/quien-soy/contacto/`

Los enlaces antiguos con `#` (`/#estudios-x`, `/#m46166`, `/#explorar/cruce?…`) siguen funcionando: la app los convierte a la ruta nueva. `cifrarios.netlify.app` redirige con 301 a `indicio.es` (regla en `_redirects`).
