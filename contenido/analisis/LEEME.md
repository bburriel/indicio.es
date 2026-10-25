# Textos de los análisis

Cada análisis que tiene aquí un fichero `<id>.md` toma de él su texto. El código (en `src/app.js`) solo calcula
las cifras y dibuja los gráficos; todo lo que se lee se puede cambiar aquí sin tocar código.

Después de editar: `npm run build` (y `npm run snapshot` si quieres que la versión prerenderizada también cambie).
Para ver el resultado al momento: `node serve.mjs` y abre `http://localhost:8787/preguntas/<id>/`.

## Cabecera

Va al principio, entre dos líneas `---`. Sustituye a lo que haya en `src/content.mjs` para ese análisis.

```
---
titulo: ¿Cobras mucho o poco?
entradilla: Una o dos frases debajo del título.
respuesta: La respuesta corta. Sale en las tarjetas de la portada y como resumen.
tema: trabajo            (riqueza, vivienda, poblacion, trabajo, gasto, voto)
metodo: Encuesta de Estructura Salarial, 2008–2024     (la etiqueta pequeña de la tarjeta)
evidencia: desc          (desc, igual, natural…: ver EVIDENCE en src/content.mjs)
publicado: 2026-10-25
actualizado: 2026-10-25
orden: 0                 (opcional: los más bajos salen antes en las listas)
oculto: sí               (opcional: lo quita de las listas, del sitemap y del RSS; la página sigue existiendo)
motivo: por qué se oculta (opcional, solo para ti)
---
```

En la cabecera no funcionan las variables `{{…}}`: son textos fijos, porque se usan al generar las páginas.

## Texto

Markdown sencillo:

- `## Título` abre una sección; `### Título`, una subsección.
- Párrafos separados por una línea en blanco.
- `**negrita**`, `*cursiva*`, `==resaltado==`, `[enlace](/preguntas/otro-analisis/)`.
- Listas con `- ` o `1. `.
- `> texto` crea un recuadro de lectura («Qué nos dice»). `> [Ojo] texto` cambia la etiqueta.
- `---` dibuja una raya.
- `<!-- comentario -->` no se ve en la web.
- Se puede escribir HTML directamente si hace falta.

## Cifras: `{{variable}}`

Las cifras salen de los datos y se actualizan solas cuando cambian. Se escriben entre dobles llaves:

```
El sueldo mediano es de {{med|r100|eur}} al año.
```

Detrás de `|` van formatos, que se aplican en orden:

| formato | qué hace | ejemplo |
|---|---|---|
| `n0`, `n1`, `n2` | número con 0, 1 o 2 decimales | 24.497 · 4,4 |
| `pct0`, `pct1` | porcentaje | 21 % · 20,6 % |
| `pcts0`, `pcts1` | porcentaje con signo | +13 % · −2,8 % |
| `eur`, `eur2` | euros | 24.497 € |
| `pts0`, `pts1` | puntos | 3,2 puntos |
| `veces` | veces | 4,4 veces |
| `abs` | quita el signo (para «cayó un X %») | |
| `r100`, `r1000` | redondea a la centena o al millar | 24.500 |

Sin formato, un número entero sale sin decimales y uno con decimales, con uno.

Si una variable no existe, en la página aparece tachada en rojo con su nombre, y en la consola del navegador sale
un aviso con el nombre. La lista de variables de cada análisis está al principio de su función en `src/app.js`
(por ejemplo, `studySueldos`).

## Gráficos: `[[grafico:id]]`

En una línea sola. Dibuja ahí el gráfico `id` que prepara el código. Se pueden mover, quitar o repetir. Si el id
no existe, aparece un aviso con su nombre y en la consola, la lista de los que sí existen.
