# Pendiente

Lo que se dejó para más adelante al hacer la versión rápida de la PR «análisis narrativos, ilustraciones, escala y panoramas» (octubre de 2026).

## Datos

Hecho en octubre de 2026: SEPE (paro y contratos por municipio y mes desde 2005), Seguridad Social (afiliados por municipio y sector desde 2011), Hacienda (deuda de los ayuntamientos), Ministerio de Vivienda (compraventas por municipio desde 2004, valor tasado, extranjeros, suelo, viviendas iniciadas y protegidas), Sanidad (hospitales), Eurostat (regiones de Europa) y más tablas del INE (IPV, esperanza de vida, teletrabajo). Ver `scripts/datos/README.md`.

Falta: IRPF de la AEAT por municipio (los Excel no se pudieron descargar; hay que bajarlos a mano a `scripts/datos/cache/aeat/`), criminalidad (Interior), CONPREL (presupuestos municipales), Notariado y Registradores (precios por municipio), Catastro (valor catastral, titulares), visados de obra por municipio, centros educativos.

### Lo que se apuntó antes

Desde el entorno en la nube no se puede descargar directamente de INE ni de Eurostat (el proxy lo bloquea). Las series de precios del análisis del IVA se bajaron serie a serie con la API JSON de Eurostat a través de otra vía (ver `scripts/datos/externos/README.md`). Para el resto conviene hacerlo desde un ordenador con `scripts/datos/descargar_ine.sh` o un script nuevo.

- **Provincia y comunidad (series anuales o trimestrales):**
  - EPA: tasa de paro, empleo, temporalidad y parcialidad.
  - Compraventas de vivienda (INE, ETDP) e índice de precios de vivienda (IPV).
  - Hipotecas.
  - Salarios por comunidad y sector (EES, ETCL).
  - Afiliación por sector.
  - Gasto autonómico por funciones.
- **España en el tiempo (mensual o trimestral):**
  - IPC por grupos.
  - Afiliación a la Seguridad Social y contratos (indefinidos y temporales).
  - Desahucios (CGPJ).
  - Esfuerzo de acceso a la vivienda (Banco de España).
- **Europa (Eurostat):** paro, vivienda (HPI), pobreza, salario mínimo y gasto por funciones, para comparar España con sus vecinos.
- **Tenencia de vivienda por número de viviendas del propietario:** la idea del estudio de EsadeEcPol sobre concentración de la propiedad. No hay dato público municipal; existe por comunidad y gran ciudad en la estadística experimental del INE sobre propietarios y en datos del Catastro (bloqueado desde la nube).

## Laboratorio

- **Escala:** hecha en «Relación» (municipios, provincias, comunidades y regiones de Europa), con los 50 datos oficiales de `data/regional.json` (solo se ofrecen a la escala en que existen) y los 13 de Eurostat. «Años» también usa los datos oficiales por provincia. Pendiente:
  - Llevarla a «Mapa» (mapa de provincias), «Ranking», «Grupos» y «Reparto».
  - Los datos que el INE da solo por provincia (EPA, hipotecas, natalidad…) podrían tener también versión por comunidad (las tablas existen; no se han bajado).
  - Elegir el año de los datos oficiales (ahora se usa el último con dato para casi todas las provincias o comunidades).
- **«Evolución»:** añadidas las series de afiliación, contratos, paro desde 2006, compraventas, valor tasado y deuda municipal (municipio, provincia y España). Pendiente: series de `data/regional.json` (EPA, IPV, hipotecas) para provincia y España, y Eurostat para comparar con Europa.
- **«Antes y después»:** añadir como resultado los contratos temporales mensuales por municipio desde 2019 (ya están en `cache/out_series_sepe.json`, clave `mensual`) para la reforma laboral.

## Análisis de políticas

### Propuestos con los datos de octubre de 2026 (para hacer más adelante)

1. ✅ (hecho: «¿Costó empleo la reforma laboral?») **Reforma laboral de 2022 y temporalidad.** Contratos iniciales indefinidos y temporales por municipio y mes (SEPE, 2019–2026). Diseño: diferencias en diferencias según el peso de la temporalidad (o de la hostelería y el campo) antes de la reforma. Ojo: el SEPE no separa los fijos discontinuos.
2. ✅ (hecho: «¿Hundió la subida del salario mínimo el empleo de hogar?») **Salario mínimo de 2019 y empleo de hogar.** Afiliados al régimen de empleados de hogar por municipio (Seguridad Social, 2011–2025) antes y después de la subida del 22 %; exposición por provincia según el salario medio o el % de trabajadores cerca del SMI (INE, tabla 28182, solo España). También agrario y hostelería.
3. **Compras de extranjeros y precio de la vivienda.** % de compraventas por extranjeros por provincia (Ministerio de Vivienda, 2007–2025) frente a la subida del valor tasado y del IPV; municipal con las compraventas y el valor tasado (municipios de más de 25.000 habitantes).
4. ✅ (hecho en parte: «¿Endeuda más un partido que otro a su ayuntamiento?», regresión discontinua) **Deuda de los ayuntamientos desde 2015.** Quién la redujo y quién no (regla de gasto), por tamaño, renta y provincia; casos extremos (Jaén, Los Barrios, Vallada).
5. ✅ (hecho) **El hundimiento de la vivienda protegida.** Calificaciones definitivas por provincia desde 1991 frente a la población y los precios.
6. **¿Se construye donde llega gente?** Viviendas libres iniciadas por provincia (1991–2025) frente al saldo migratorio y el crecimiento del padrón.
7. **Quién se recuperó de la crisis de 2008.** Paro registrado por municipio 2007–2025 (SEPE) y estructura sectorial de 2011 (Seguridad Social).
8. **Pandemia y turismo, con empleo.** Afiliados en hostelería por municipio, diciembre de 2019 frente a 2020 y 2021 (mejor que el paro registrado).
9. **España en Europa.** Convergencia del PIB por habitante en paridad de poder de compra, paro estructural y abandono escolar de las regiones españolas frente a las europeas (Eurostat, 2010–2024).
10. ✅ (hecho: «¿Se vendieron más pisos al llegar el tope del alquiler?») **Zonas tensionadas y compraventas.** ¿Cambió la compraventa de vivienda en los municipios con tope al alquiler? (Ministerio de Vivienda, trimestral por municipio).
11. **Teletrabajo y migración interior tras la pandemia** (por comunidad, EPA y saldo migratorio).

12. ✅ (hecho: «¿Cuánta comida compra hoy un sueldo?») **Precio de los alimentos frente a los sueldos.** Pendiente: subclases del IPC (pan, leche, aceite, huevos…) cuando se descarguen las tablas 76128, 76159 y 76132 (`ine_api.py faltan` y `alimentos.py`); el análisis ya las muestra si están.

### Apuntados antes

- **Salario mínimo de 2019 y empleo:** se probó con datos municipales usando la renta como medida de exposición, y no da para concluir nada; ni siquiera se ve bien la subida de salarios de 2019. Hace falta:
  - Una exposición mejor: % de asalariados que cobran cerca del SMI por provincia (EES o Muestra Continua de Vidas Laborales).
  - Afiliación por municipio y sector.
- **Reforma laboral de 2022 y temporalidad:** contratos indefinidos y temporales por provincia y mes (SEPE). Diseño: intensidad según el peso previo de la temporalidad.
- **Ley de vivienda de 2023:**
  - Tope del 2 y del 3 % a las actualizaciones: IPVA por antigüedad del contrato, contratos en vigor frente a nuevos.
  - Nuevas zonas tensionadas (País Vasco, Navarra, Galicia, Asturias, 2025): repetir el diseño del tope catalán cuando el INE publique el IPVA de 2025.
- **Bono Alquiler Joven, abonos gratuitos de Cercanías y Media Distancia, impuesto de patrimonio en Andalucía y Madrid:** buscar datos de resultado con fecha.
- **IVA de los alimentos:** repetir con subclases del IPC del INE (pan, leche, huevos… por separado) para no mezclar productos con y sin rebaja, y con aceites y pasta (del 10 al 5 %).

## Análisis existentes que mejorarían con datos nuevos

- **Pisos turísticos y alquiler:** añadir los precios de los anuncios (idealista) por municipio si se consiguen, y las compraventas.
- **Tope de Cataluña:** añadir 2025 en cuanto el INE publique el IPVA; comparar con el índice de los contratos nuevos de la Agència de l'Habitatge (fianzas, trimestral, por municipio).
- **Pandemia y turismo:** afiliación por municipio en lugar de paro registrado.
- **Pensiones:** proyecciones de la AIReF y del Ageing Report 2027 cuando salga.

## Imágenes

- El gráfico grande de la portada (la nube de municipios) se mantiene como gráfico de datos; si se quiere, se puede sustituir por una ilustración del mismo estilo.
- Las imágenes de redes (`og/*.png`) siguen siendo las de antes; se podrían generar con las ilustraciones.
