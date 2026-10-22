// Contenido editorial de Indicio: lo leen el build (para generar las páginas) y la app (en el navegador).
// Cada pregunta tiene un único título, que es el mismo en portada, en el índice y en su página.
//  id: forma parte de la URL (/preguntas/<id>/)      t: título       d: entradilla
//  m: método                                          tema: sección   pub: fecha de publicación (AAAA-MM-DD)
//  upd: última revisión del texto o de los datos      a: respuesta corta (texto fijo para buscadores; en la web se calcula con los datos)

export const SITE={
  name:"Indicio",
  url:"https://indicio.es",
  tagline:"Preguntas reales, respuestas con datos públicos",
  description:"Indicio: preguntas reales sobre cómo vivimos, respondidas con datos públicos de los 8.139 municipios de España. Y un laboratorio para que compruebes tú si es causa o casualidad.",
  dataUpdated:"2026-10-23",
  author:{name:"Borja Burriel",url:"https://indicio.es/quien-soy/",
    bio:"Me dedico a los datos. En mi trabajo intento averiguar si un cambio ha salido bien de verdad o solo lo parece. Indicio es hacer esa misma pregunta con los datos públicos de España, para que cualquiera pueda entenderlos.",
    linkedin:"", web:"", foto:""},
  oldHost:"cifrarios.netlify.app"
};

export const STUDIES=[
  {id:"cerca-ciudad",t:"¿Se vacía el campo por la distancia o por la edad?",d:"Con el teletrabajo y la vivienda cara, mucha gente se ha mudado fuera de las ciudades. ¿Hasta qué distancia llega ese efecto? ¿Y es por la distancia o por otras cosas?",m:"Gradiente y comparar entre iguales",tema:"poblacion",pub:"2026-10-22",
    upd:"2026-10-23",a:"Más por la edad. Entre pueblos de la misma provincia, tamaño, edad y renta, estar lejos de una ciudad cuenta poco. Y quien llega cerca de las ciudades viene, en buena parte, del extranjero."},
  {id:"pisos-turisticos",t:"¿Los pisos turísticos encarecen el alquiler?",d:"Donde más pisos turísticos hay, el alquiler sube algo más. Pero ¿es por los pisos turísticos o por otras cosas que van con ellos?",m:"Cambios y controles",tema:"vivienda",pub:"2026-10-22",
    upd:"2026-10-23",a:"Menos de lo que se dice. Donde más han crecido los pisos turísticos no es, en general, donde más ha subido el alquiler, empiece la cuenta en 2020, 2021 o 2022. Si hay efecto, está en barrios concretos."},
  {id:"convergencia",t:"¿Los lugares pobres alcanzan a los ricos?",d:"Entre 2015 y 2024 la renta subió en casi todas partes. ¿Subió más donde partía de abajo, y se ha estrechado la distancia?",m:"Convergencia",tema:"riqueza",pub:"2026-10-22",
    upd:"2026-10-23",a:"Sí, poco a poco. La distancia entre los municipios más ricos y los más pobres se ha estrechado desde 2015, también midiéndolo de forma que el punto de partida no engañe."},
  {id:"votar-pueblos",t:"¿Se vota más en los pueblos?",d:"Los pueblos pequeños tienen una participación mucho más alta. ¿Es por ser pequeños, o porque su población es mayor y los mayores votan más?",m:"Separar dos explicaciones",tema:"voto",pub:"2026-10-22",
    upd:"2026-10-23",a:"Sí. En los municipios de menos de 500 habitantes vota bastante más gente que en las ciudades de más de 50.000. Parte se explica porque allí la población es mayor; el resto, por el tamaño en sí."},
  {id:"crecer",t:"¿Qué hace que un pueblo gane vecinos?",d:"Desde 2020 unos pueblos crecen y otros se vacían. Ponemos a competir los sospechosos habituales —renta, edad, estudios, paro, turismo— comparando entre iguales.",m:"Varios factores a la vez",tema:"poblacion",pub:"2026-10-22",
    upd:"2026-10-23",a:"La juventud, sobre todo, y los estudios. La costa crece, pero porque sus pueblos son más jóvenes y más ricos: entre pueblos iguales, estar en la costa no añade nada."},
  {id:"tope-cataluna",t:"¿Frenó el tope de Cataluña el precio del alquiler?",d:"En marzo de 2024 Cataluña empezó a limitar el alquiler en las zonas tensionadas. Comparamos lo que pasó allí con lo que pasó en el resto de España.",m:"Diferencias en diferencias",tema:"vivienda",pub:"2026-10-22",
    upd:"2026-10-23",a:"Si hay efecto, es pequeño en estos datos: entre medio punto y un punto menos de subida en 2024 en los municipios tensionados, según con quién se comparen. Habrá que repetirlo con los datos de 2025."},
  {id:"pensiones",t:"¿Son sostenibles las pensiones?",d:"El gasto en pensiones no para de crecer y se jubilan las generaciones más numerosas. Separamos por qué crece y probamos escenarios.",m:"Descomposición y escenarios",tema:"gasto",pub:"2026-10-22",
    upd:"2026-10-23",a:"Depende de tres cosas: cuántos se jubilan, cuánto cobran y cuánto crece la economía. Sin ningún cambio el gasto se dispararía; con las reformas aprobadas, las previsiones lo dejan en torno al 16–17 % del PIB en 2050."},
  {id:"pandemia-turismo",t:"¿Golpeó más la pandemia a las zonas turísticas?",d:"En 2020 el turismo se paró de golpe. Comparamos cómo cambiaron el paro y la renta en las provincias más turísticas y en el resto, antes y después.",m:"Antes y después, con grupo de comparación",tema:"trabajo",pub:"2026-10-22",
    upd:"2026-10-23",a:"Sí: en 2020 el paro subió más y la renta bajó más en las provincias más turísticas que en el resto, también dentro de cada provincia, y después recuperaron."},
  {id:"renta-fuentes",t:"¿Quién ha subido la renta de los pueblos pobres?",d:"Los municipios pobres han crecido en renta más que los ricos. ¿Ha sido el trabajo, o las pensiones y las prestaciones que suben por ley? Descomponemos la renta por fuentes y buscamos tres medidas con fecha.",m:"Descomposición y placebos en el tiempo",tema:"riqueza",pub:"2026-10-23",
    a:"Las dos cosas. Pensiones y prestaciones ponen una parte grande del crecimiento en los municipios pobres, pero los salarios también suben más allí. La subida del salario mínimo de 2019 y las prestaciones de 2020 dejan huella; la revalorización de las pensiones de 2023, no."},
  {id:"quien-gobierna",t:"¿Importa quién gobierna tu ayuntamiento?",d:"Comparar municipios del PP y del PSOE no sirve: ya eran distintos antes de votar. Usamos las elecciones decididas por un puñado de votos como si fueran un experimento.",m:"Discontinuidad",tema:"voto",pub:"2026-10-23",
    a:"En población, paro y renta, no se distingue: donde ganó el PP por poco y donde ganó el PSOE por poco pasó lo mismo. Un ayuntamiento manda poco sobre esas cosas, o cuatro años son pocos para verlo."},
  {id:"ave",t:"¿Cambia algo cuando llega el AVE?",d:"Entre 2021 y 2023 la alta velocidad llegó a Galicia, Extremadura, Burgos, Murcia, Elche y Asturias. Comparamos los municipios cercanos a las estaciones nuevas con sus gemelos.",m:"Gemelos con tendencia previa",tema:"poblacion",pub:"2026-10-23",
    a:"Poco, por ahora. A dos o cuatro años vista, los municipios cercanos a una estación nueva no se distinguen de sus gemelos en población ni en renta; el paro bajó algo más cerca de las estaciones."},
  {id:"prohibir-pisos-turisticos",t:"¿Sirve prohibir los pisos turísticos?",d:"Madrid, València, Sevilla, Málaga, Alicante… cada vez más ayuntamientos prohíben nuevas viviendas turísticas. Antes de preguntar por el alquiler: ¿frena siquiera el número de pisos turísticos?",m:"Antes y después, con gemelo",tema:"vivienda",pub:"2026-10-23",
    a:"Quizá algo, pero poco y pronto para decirlo. Donde se prohibió, los pisos turísticos cayeron unos 5 puntos más que en sus gemelos, pero con 17 municipios y dos años el intervalo incluye el cero. El INE cuenta anuncios, no licencias."}
];

// Preguntas que se responden en el laboratorio o en un tema, no en un estudio paso a paso
export const QUICK=[
  {id:"estudiar",t:"¿Estudiar hace más rico a un lugar?",tema:"riqueza",href:"/laboratorio/cruce/?d=superiores,renta&t=g1",
    a:"Van muy juntos: donde más gente tiene estudios superiores, la renta es bastante mayor. Si una cosa causa la otra, es otra historia."},
  {id:"paro-sur",t:"¿De verdad hay más paro en el sur?",tema:"trabajo",href:"/temas/trabajo/",
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
  "/laboratorio/":{t:"Laboratorio · Indicio",d:"Tu lienzo para los datos de España: elige un gráfico, cruza dos datos en los 8.139 municipios y comprueba en tres pasos si es causa o casualidad."},
  "/laboratorio/metodo/":{t:"Cómo buscar causas con datos públicos · Indicio",d:"Una guía corta para pasar de «estas dos cosas van juntas» a «esto podría estar causando aquello», y saber cuándo no se puede."},
  "/municipio/":{t:"Municipios · Indicio",d:"Busca tu municipio y mira cómo sale en renta, población, paro, vivienda y voto, comparado con España."},
  "/quien-soy/":{t:"Quién soy · Indicio",d:"Soy Borja Burriel. Trabajo con datos en empresas como Domestika, Wallapop y Northius, y en Indicio intento explicar los datos públicos de España de forma sencilla y honesta."},
  "/quien-soy/contacto/":{t:"Escríbeme · Indicio",d:"Una pregunta sobre los datos, un error, una idea o un trabajo a medida: escríbeme."},
  "/comparar/":{t:"Comparar dos municipios · Indicio",d:"Elige dos municipios y compáralos dato a dato."}
};
