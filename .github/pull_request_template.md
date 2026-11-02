<!--
Plantilla de las PR de Indicio. Bórrala y escribe sobre ella.
Una PR = un cambio. Si hay dos cosas que se puedan deshacer por separado, van en dos PR.
-->

## Qué cambia para el lector

Una o dos frases, como el titular de un cambio: qué verá distinto quien entre en la web.

## Por qué

El problema o la petición que lo origina.

## Qué se ha tocado

- `ruta/del/fichero`: qué se ha cambiado y por qué ahí.

## Cómo se ha comprobado

- `npm run build` sin errores.
- Páginas abiertas en local (ruta y qué se miró).
- Capturas o texto leído como lo verá el lector, en ordenador y en móvil.
- Si cambian datos: la cifra nueva frente a la vieja, y cuántos municipios tienen dato.

## Qué puede salir mal

Lo que habría que vigilar si esto molesta: cobertura de datos, rendimiento, páginas que dependen del mismo código.

## Cómo volver atrás

`git revert <sha de la fusión>` y subir a `main`: Cloudflare vuelve a desplegar solo. Si el cambio tocó `data/`, el revert también devuelve los JSON.
