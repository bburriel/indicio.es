// Contenido editorial de Indicio: lo leen el build (para generar las páginas) y la app (en el navegador).
// Cada pregunta tiene un único título, que es el mismo en portada, en el índice y en su página.
//  id: forma parte de la URL (/preguntas/<id>/)      t: título       d: entradilla
//  m: método                                          tema: sección   pub: fecha de publicación (AAAA-MM-DD)
//  upd: última revisión del texto o de los datos      a: respuesta corta (texto fijo para buscadores; en la web se calcula con los datos)
//  ev: nivel de evidencia — "desc" (descriptivo), "igual" (comparación entre iguales), "natural" (experimento natural: antes y después, discontinuidad)

export const SITE={
  name:"Indicio",
  url:"https://indicio.es",
  tagline:"Preguntas reales, respuestas con datos públicos",
  description:"Indicio: preguntas reales sobre cómo vivimos, respondidas con datos públicos de los 8.139 municipios de España. Y un laboratorio para que compruebes tú si una relación aguanta y qué pasó antes y después de una ley.",
  dataUpdated:"2026-10-24",
  author:{name:"Borja Burriel",url:"https://indicio.es/quien-soy/",
    bio:"Me dedico a los datos. En mi trabajo intento averiguar si un cambio ha salido bien de verdad o solo lo parece. Indicio es hacer esa misma pregunta con los datos públicos de España, para que cualquiera pueda entenderlos.",
    linkedin:"", web:"", foto:""},
  oldHost:"cifrarios.netlify.app"
};

export const STUDIES=[
  {id:"cerca-ciudad",ev:"igual",t:"¿Se vacía el campo por la distancia o por la edad?",d:"Con el teletrabajo y la vivienda cara, mucha gente se ha mudado fuera de las ciudades. ¿Hasta qué distancia llega ese efecto? ¿Y es por la distancia o por otras cosas?",m:"Gradiente, controles y antes de 2020",tema:"poblacion",pub:"2026-10-22",
    upd:"2026-10-24",a:"Más por la edad. Entre pueblos de la misma provincia, tamaño, edad y renta, estar lejos de una ciudad cuenta poco. Y quien llega cerca de las ciudades viene, en buena parte, del extranjero."},
  {id:"pisos-turisticos",ev:"igual",t:"¿Los pisos turísticos encarecen el alquiler?",d:"Donde más pisos turísticos hay, el alquiler sube algo más. Pero ¿es por los pisos turísticos o por otras cosas que van con ellos?",m:"Cambios, controles y panel anual",tema:"vivienda",pub:"2026-10-22",
    upd:"2026-10-24",a:"Menos de lo que se dice. Donde más han crecido los pisos turísticos no es, en general, donde más ha subido el alquiler, empiece la cuenta en 2020, 2021 o 2022. Si hay efecto, está en barrios concretos."},
  {id:"convergencia",ev:"desc",t:"¿Los lugares pobres alcanzan a los ricos?",d:"Entre 2015 y 2024 la renta subió en casi todas partes. ¿Subió más donde partía de abajo, y se ha estrechado la distancia?",m:"Convergencia β y σ",tema:"riqueza",pub:"2026-10-22",
    upd:"2026-10-24",a:"Sí, poco a poco. La distancia entre los municipios más ricos y los más pobres se ha estrechado desde 2015, también midiéndolo de forma que el punto de partida no engañe."},
  {id:"votar-pueblos",ev:"igual",t:"¿Se vota más en los pueblos?",d:"Los pueblos pequeños tienen una participación mucho más alta. ¿Es por ser pequeños, o porque su población es mayor y los mayores votan más?",m:"Separar dos explicaciones",tema:"voto",pub:"2026-10-22",
    upd:"2026-10-24",a:"Sí. En los municipios de menos de 500 habitantes vota bastante más gente que en las ciudades de más de 50.000. Parte se explica porque allí la población es mayor; el resto, por el tamaño en sí."},
  {id:"crecer",ev:"igual",t:"¿Qué hace que un pueblo gane vecinos?",d:"Desde 2020 unos pueblos crecen y otros se vacían. Ponemos a competir las explicaciones de siempre (renta, edad, estudios, paro, turismo) comparando entre iguales.",m:"Regresión con efectos fijos",tema:"poblacion",pub:"2026-10-22",
    upd:"2026-10-24",a:"La juventud, sobre todo, y los estudios. La costa crece, pero porque sus pueblos son más jóvenes y más ricos: entre pueblos iguales, estar en la costa no añade nada."},
  {id:"tope-cataluna",ev:"natural",t:"¿Frenó el tope de Cataluña el precio del alquiler?",d:"En marzo de 2024 Cataluña empezó a limitar el alquiler en las zonas tensionadas. Comparamos lo que pasó allí con lo que pasó en el resto de España.",m:"Diferencias en diferencias, gemelos y control sintético",tema:"vivienda",pub:"2026-10-22",
    upd:"2026-10-24",a:"Si hay efecto, es pequeño en estos datos: entre medio punto y un punto menos de subida en 2024 en los municipios tensionados, según con quién se comparen. Habrá que repetirlo con los datos de 2025."},
  {id:"pensiones",ev:"desc",t:"¿Son sostenibles las pensiones?",d:"El gasto en pensiones no para de crecer y se jubilan las generaciones más numerosas. Separamos por qué crece y probamos escenarios.",m:"Descomposición y escenarios",tema:"gasto",pub:"2026-10-22",
    upd:"2026-10-24",a:"Depende de tres cosas: cuántos se jubilan, cuánto cobran y cuánto crece la economía. Sin ningún cambio el gasto se dispararía; con las reformas aprobadas, las previsiones lo dejan en torno al 16–17 % del PIB en 2050."},
  {id:"pandemia-turismo",ev:"natural",t:"¿Golpeó más la pandemia a las zonas turísticas?",d:"En 2020 el turismo se paró de golpe. Comparamos cómo cambiaron el paro y la renta en las provincias más turísticas y en el resto, antes y después.",m:"Diferencias en diferencias y estudio de eventos",tema:"trabajo",pub:"2026-10-22",
    upd:"2026-10-24",a:"Sí: en 2020 el paro subió más y la renta bajó más en las provincias más turísticas que en el resto, también dentro de cada provincia, y después recuperaron."},
  {id:"renta-fuentes",ev:"natural",upd:"2026-10-24",t:"¿Quién ha subido la renta de los pueblos pobres?",d:"Los municipios pobres han crecido en renta más que los ricos. ¿Ha sido el trabajo, o las pensiones y las prestaciones que suben por ley? Descomponemos la renta por fuentes y buscamos tres medidas con fecha.",m:"Descomposición y placebos en el tiempo",tema:"riqueza",pub:"2026-10-23",
    a:"Sobre todo el trabajo. Los salarios explican la mayor parte de la convergencia; pensiones y prestaciones ayudan, pero menos. La subida del salario mínimo de 2019 deja una huella clara en los municipios más pobres."},
  {id:"quien-gobierna",ev:"natural",upd:"2026-10-24",t:"¿Importa quién gobierna tu ayuntamiento?",d:"Comparar municipios del PP y del PSOE no sirve: ya eran distintos antes de votar. Usamos las elecciones decididas por un puñado de votos como si fueran un experimento.",m:"Regresión discontinua",tema:"voto",pub:"2026-10-23",
    a:"En población, paro y renta, no se distingue: donde ganó el PP por poco y donde ganó el PSOE por poco pasó lo mismo. Un ayuntamiento manda poco sobre esas cosas, o cuatro años son pocos para verlo."},
  {id:"ave",ev:"natural",upd:"2026-10-24",t:"¿Cambia algo cuando llega el AVE?",d:"Entre 2021 y 2023 la alta velocidad llegó a Galicia, Extremadura, Burgos, Murcia, Elche y Asturias. Comparamos los municipios cercanos a las estaciones nuevas con sus gemelos.",m:"Gemelos y estudio de eventos",tema:"poblacion",pub:"2026-10-23",
    a:"Poco, por ahora. A dos o cuatro años vista, los municipios cercanos a una estación nueva apenas se distinguen de sus gemelos en población o renta, y los métodos no coinciden en el signo; varía mucho de una estación a otra."},
  {id:"prohibir-pisos-turisticos",ev:"natural",upd:"2026-10-24",t:"¿Sirve prohibir los pisos turísticos?",d:"Madrid, València, Sevilla, Málaga, Alicante… cada vez más ayuntamientos prohíben nuevas viviendas turísticas. Antes de preguntar por el alquiler: ¿frena siquiera el número de pisos turísticos?",m:"Diferencias en diferencias y estudio de eventos",tema:"vivienda",pub:"2026-10-23",
    a:"Hay una pista de que frenan los pisos turísticos, pero no es sólida: frente a gemelos parecidos crecen menos, pero el estudio año a año no lo confirma. Pocos municipios, poco tiempo, y el INE cuenta anuncios, no licencias."},
  {id:"iva-alimentos",ev:"natural",upd:"2026-10-25",t:"¿Llegó al ticket la rebaja del IVA de los alimentos?",d:"En enero de 2023 el pan, la leche, la fruta o las verduras dejaron de pagar IVA. Comparamos sus precios con los de la carne y el pescado, y con los de cuatro países vecinos, para medir qué parte de la rebaja llegó al consumidor.",m:"Triple diferencia y placebos en el tiempo",tema:"riqueza",pub:"2026-10-25",
    a:"Sí, en buena parte. Donde todo el grupo bajó de IVA, como la fruta, el precio cayó en enero de 2023 más del 80 % de lo que permitía la rebaja; y cuando el IVA volvió, en enero de 2025, los precios subieron en la misma medida."},
  {id:"vivienda-protegida",ev:"desc",upd:"2026-10-24",t:"¿Qué pasó con la vivienda protegida?",d:"En plena burbuja se terminaban unas 65.000 viviendas protegidas al año. Hoy, con el acceso a la vivienda como primera preocupación, contamos cuántas se hacen y dónde.",m:"Series del Ministerio de Vivienda, 1996–2025",tema:"vivienda",pub:"2026-10-24",
    a:"Se ha reducido a una sexta parte: unas 11.000 al año frente a 65.000 antes de la crisis, y la caída llegó de golpe en 2013, con el fin de las ayudas a la promoción. Solo Madrid, el País Vasco y Navarra mantienen un ritmo apreciable."},
  {id:"reforma-laboral",ev:"natural",upd:"2026-10-25",t:"¿Costó empleo la reforma laboral?",d:"En 2022 la reforma laboral limitó los contratos temporales. Comparamos los municipios que más dependían de ellos con los que menos: cómo cambiaron sus contratos y si perdieron empleo.",m:"Exposición, tendencias y placebo",tema:"trabajo",pub:"2026-10-25",
    a:"No se ve. La temporalidad de los contratos nuevos bajó unos 30 puntos en todas partes, y los municipios que más dependían del contrato temporal no perdieron más empleo que los demás, descontada la tendencia que ya traían."},
  {id:"smi-empleo-hogar",ev:"natural",upd:"2026-10-25",t:"¿Hundió la subida del salario mínimo el empleo de hogar?",d:"En 2019 el salario mínimo subió un 22 %. El servicio doméstico era uno de los empleos más expuestos. Miramos si las altas en la Seguridad Social cayeron más de lo normal, y si cayeron más donde las familias tienen menos renta.",m:"Tendencias y grupos de renta",tema:"trabajo",pub:"2026-10-25",
    a:"No se ve que lo hundiera. El empleo de hogar registrado ya caía desde 2016 y en 2019 siguió cayendo a un ritmo parecido, sin caer más donde la renta es menor. Lo que no se ve es la economía sumergida."},
  {id:"deuda-quien-gobierna",ev:"natural",upd:"2026-10-25",t:"¿Endeuda más un partido que otro a su ayuntamiento?",d:"La deuda es de lo poco que controla de verdad un alcalde. Comparamos la deuda de los ayuntamientos según quién ganó por poco las municipales de 2019 y 2023, PP o PSOE.",m:"Regresión discontinua",tema:"gasto",pub:"2026-10-25",
    a:"No. Donde la elección fue ajustada, que ganara el PP o el PSOE no cambió la deuda del ayuntamiento: la diferencia, 18 euros por habitante, está dentro del ruido. Que los ayuntamientos del PSOE deban más por vecino se explica por qué ciudades gobierna, no por cómo."},
  {id:"precio-alimentos",ev:"desc",upd:"2026-10-25",t:"¿Cuánta comida compra hoy un sueldo?",d:"Entre 2021 y 2023 la comida se disparó. Los sueldos también han subido, pero ¿lo mismo? Comparamos el precio de los alimentos con el resto de precios y con el sueldo medio desde 2002, en España y por comunidades.",m:"IPC y coste salarial, 2002–2026",tema:"riqueza",pub:"2026-10-25",
    a:"Menos que antes de la pandemia. Desde 2019 la comida ha subido un 38 % y el sueldo medio un 22 %: con el mismo sueldo se compra en torno a un 12 % menos de comida. Para el resto de precios, los sueldos sí han seguido el ritmo. Lo que más ha subido: huevos, zumos y bayas; lo que más ha encarecido la cesta, la carne y el pan."},
  {id:"tope-compraventas",ev:"natural",upd:"2026-10-25",t:"¿Se vendieron más pisos al llegar el tope del alquiler?",d:"Se temía que el tope al alquiler de Cataluña empujara a los propietarios a vender. Comparamos las compraventas de vivienda en los municipios con tope con las del resto de España, antes y después.",m:"Diferencias en diferencias, gemelos y placebos",tema:"vivienda",pub:"2026-10-25",
    a:"Algo más que en el resto de España: un 7 % más en los dos años siguientes, una diferencia que no aparece en fechas sin tope. Con gemelos la diferencia es menor y no del todo segura, y los datos no dicen si los pisos vendidos salieron del alquiler."}
];

// Preguntas que se responden en el laboratorio o en un tema, no en un estudio paso a paso
export const QUICK=[
  {id:"estudiar",ev:"desc",t:"¿Estudiar hace más rico a un lugar?",tema:"riqueza",href:"/laboratorio/cruce/?d=superiores,renta&t=g1",
    a:"Van muy juntos: donde más gente tiene estudios superiores, la renta es bastante mayor. Si una cosa causa la otra, es otra historia."},
  {id:"paro-sur",ev:"desc",t:"¿De verdad hay más paro en el sur?",tema:"trabajo",href:"/temas/trabajo/",
    a:"Sí. En Andalucía y Extremadura el paro registrado es bastante más alto que en el norte peninsular."}
];

export const TOPICS=[
  {id:"riqueza",l:"Riqueza",q:"¿Cómo se reparte la riqueza?",d:"Renta por persona y por hogar, pobreza y desigualdad en cada municipio, comparados con España."},
  {id:"vivienda",l:"Vivienda",q:"¿Por qué cuesta tanto encontrar casa?",d:"Alquiler declarado y anunciado, pisos turísticos y viviendas vacías, municipio a municipio."},
  {id:"poblacion",l:"Población",q:"¿Quién llega y quién se va?",d:"Qué municipios ganan y pierden vecinos desde 2005, quién llega del extranjero y quién se va a otra parte."},
  {id:"trabajo",l:"Trabajo",q:"¿De qué vivimos?",d:"Paro registrado por municipio, estudios y salarios, del norte al sur."},
  {id:"gasto",l:"Dinero público",q:"¿En qué se gasta?",d:"En qué gastan las administraciones públicas, cuánto va a pensiones y cómo ha cambiado desde 1995."},
  {id:"voto",l:"Voto",q:"¿Cómo vota cada España?",d:"Participación y voto a cada partido en las últimas generales, municipales y europeas, por municipio."}
];

export const PAGES={
  "/":{t:"Indicio · Preguntas reales, respuestas con datos públicos",d:SITE.description},
  "/preguntas/":{t:"Análisis · Indicio",d:"Preguntas reales sobre cómo vivimos, ya respondidas con datos públicos: por tema y para tu municipio. Cada una lleva su respuesta corta y, dentro, cómo se ha calculado y qué se puede concluir."},
  "/temas/":{t:"Temas · Indicio",d:"Riqueza, vivienda, población, trabajo, dinero público y voto: los datos públicos de España, tema a tema."},
  "/laboratorio/":{t:"Laboratorio · Indicio",d:"Tu lienzo para los datos de España: elige un gráfico, cruza dos datos en los 8.139 municipios, comprueba si la relación aguanta entre iguales y mide qué pasó antes y después de una ley o un suceso."},
  "/laboratorio/metodo/":{t:"De la relación a la causa · Indicio",d:"Una guía corta para pasar de «estas dos cosas van juntas» a «esto podría estar causando aquello», y saber cuándo no se puede."},
  "/municipio/":{t:"Municipios · Indicio",d:"Busca tu municipio y mira cómo sale en renta, población, paro, vivienda y voto, comparado con España."},
  "/quien-soy/":{t:"Quién soy · Indicio",d:"Soy Borja Burriel. Trabajo con datos en empresas como Domestika, Wallapop y Northius, y en Indicio intento explicar los datos públicos de España de forma sencilla."},
  "/quien-soy/contacto/":{t:"Escríbeme · Indicio",d:"Una pregunta sobre los datos, un error, una idea o un trabajo a medida: escríbeme."},
  "/comparar/":{t:"Comparar dos municipios · Indicio",d:"Elige dos municipios y compáralos dato a dato."}
};

// Niveles de evidencia: qué tipo de conclusión permite el diseño de cada análisis
export const EVIDENCE={
  desc:{l:"Descriptivo",d:"Cuenta qué pasa y dónde. No dice por qué."},
  igual:{l:"Comparación entre iguales",d:"Descarta las explicaciones que se han medido (tamaño, edad, renta…), no las demás, ni que la causa vaya al revés."},
  natural:{l:"Experimento natural",d:"Compara antes y después de una ley o un suceso con lugares que no lo vivieron, o elecciones decididas por poco. Es lo más cerca de una causa que permiten estos datos, si se cumple su supuesto."}
};
