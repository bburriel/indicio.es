# Pendiente

Lo que se dejó para más adelante al hacer la versión rápida de la PR «análisis narrativos, ilustraciones, escala y panoramas» (octubre de 2026).

## Datos que no van por municipio

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

- **Escala:** ya hecha en «Relación» (municipios, provincias, comunidades). Pendiente:
  - Llevarla a «Ranking», «Grupos» y «Reparto».
  - Añadir datos que solo existen por provincia o comunidad. Necesita marcar en el catálogo a qué escala existe cada dato y ocultar en el selector los que no están a la escala elegida.
  - Nombre: se ha usado «Comparar: municipios / provincias / comunidades». Alternativas: «Escala», «Nivel», «¿Qué comparas?».
- **«Evolución» con series nacionales y europeas** (IPC, EPA, Eurostat) además de las municipales.

## Análisis de políticas

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
