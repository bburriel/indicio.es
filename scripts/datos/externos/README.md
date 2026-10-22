# Datos externos de los estudios

Recogidos a mano (octubre de 2026) con su fuente; `data/ext.json` es el resumen que usa la app.

- `tensionadas.json`: municipios de Cataluña declarados zona de mercado residencial tensionado. Resolución de 14 de marzo de 2024 (BOE-A-2024-5214, 140 municipios, vigencia 16/03/2024) y ampliación de 8 de octubre de 2024 (BOE-A-2024-20576, 131 municipios). Incluye la revisión anunciada en 2026 (no publicada en el BOE a fecha de la recogida).
- `erte.json`: trabajadores en ERTE por provincia a 30 de abril de 2020 (dato provisional de la nota de afiliación de la Seguridad Social de abril de 2020). Es el único mes con tabla provincial legible sin descargar el Excel de PxWeb; la serie completa (marzo 2020–octubre 2021, fin de mes y medias) está en la base «Afiliados en ERTE» de la Seguridad Social.
- `ave.json`: estaciones con servicio comercial de alta velocidad (o altas prestaciones) abierto entre 2021 y 2023, con fecha del primer servicio y código INE del municipio. Se indica si la estación es nueva o ya existía.
- `vut_restricciones.json`: municipios con moratoria o prohibición de nuevas viviendas de uso turístico, fecha de entrada en vigor (o de aprobación cuando no consta), alcance (total/parcial), fuente y grado de confianza (alta: boletín oficial; media: medida confirmada con día dudoso; baja: solo prensa o sin fecha).

## hicp_alimentos.json

Eurostat, `prc_hicp_midx` (IPCA mensual, índice 2015 = 100), enero de 2021 a septiembre de 2025, para España, Portugal, Francia, Italia y Alemania: pan y cereales (CP0111), carne (CP0112), pescado (CP0113), leche, queso y huevos (CP0114), frutas (CP0116) y legumbres y hortalizas (CP0117); para España, además, aceites y grasas (CP0115) y el índice general (CP00). Descargado serie a serie de la API JSON de Eurostat (el proxy del entorno en la nube no deja descargarla directamente) y comprobado volviendo a pedir ocho series. Se copia dentro de `data/ext.json` (clave `hicp`) para el análisis del IVA de los alimentos.
