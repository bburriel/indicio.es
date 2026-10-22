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
  dataUpdated:"2026-10-22",
  author:{name:"Borja Burriel",url:"https://indicio.es/quien-soy/",
    bio:"Soy analista de datos. Llevo años en empresas de producto intentando responder una pregunta sencilla: este cambio, ¿ha funcionado de verdad? Indicio es esa misma pregunta, pero hecha a los datos públicos de España.",
    linkedin:"", web:"", foto:""},
  oldHost:"cifrarios.netlify.app"
};

export const STUDIES=[
  {id:"cerca-ciudad",t:"¿Se vacía el campo por la distancia o por la edad?",d:"Con el teletrabajo y la vivienda cara, mucha gente se ha mudado fuera de las ciudades. ¿Hasta qué distancia llega ese efecto? ¿Y es por la distancia o por otras cosas?",m:"Gradiente y comparar entre iguales",tema:"poblacion",pub:"2026-10-22",
    a:"Más por la edad. Los pueblos más jóvenes han ganado vecinos desde 2005 y los más envejecidos los han perdido. Entre pueblos de la misma edad, estar lejos de una ciudad apenas cuenta."},
  {id:"pisos-turisticos",t:"¿Los pisos turísticos encarecen el alquiler?",d:"Donde más pisos turísticos hay, el alquiler sube algo más. Pero ¿es por los pisos turísticos o por otras cosas que van con ellos?",m:"Cambios y controles",tema:"vivienda",pub:"2026-10-22",
    a:"Menos de lo que se dice. Donde más han crecido los pisos turísticos no es, en general, donde más ha subido el alquiler. Si hay efecto, está en barrios concretos."},
  {id:"convergencia",t:"¿Los lugares pobres alcanzan a los ricos?",d:"Entre 2015 y 2024 la renta subió en casi todas partes. ¿Subió más donde partía de abajo, y se ha estrechado la distancia?",m:"Convergencia",tema:"riqueza",pub:"2026-10-22",
    a:"Sí, poco a poco. La distancia entre los municipios más ricos y los más pobres se ha estrechado desde 2015."},
  {id:"votar-pueblos",t:"¿Se vota más en los pueblos?",d:"Los pueblos pequeños tienen una participación mucho más alta. ¿Es por ser pequeños, o porque su población es mayor y los mayores votan más?",m:"Separar dos explicaciones",tema:"voto",pub:"2026-10-22",
    a:"Sí. En los municipios de menos de 1.000 habitantes vota bastante más gente que en las ciudades grandes. Parte se explica porque allí la población es mayor."},
  {id:"crecer",t:"¿Qué hace que un pueblo gane vecinos?",d:"Desde 2020 unos pueblos crecen y otros se vacían. Ponemos a competir los sospechosos habituales —renta, edad, estudios, paro, turismo— comparando entre iguales.",m:"Varios factores a la vez",tema:"poblacion",pub:"2026-10-22",
    a:"La juventud y la costa, sobre todo. Los municipios de costa han ganado vecinos desde 2005; los que están a más de 100 km del mar, los han perdido."},
  {id:"tope-cataluna",t:"¿Frenó el tope de Cataluña el precio del alquiler?",d:"En marzo de 2024 Cataluña empezó a limitar el alquiler en las zonas tensionadas. Comparamos lo que pasó allí con lo que pasó en el resto de España.",m:"Diferencias en diferencias",tema:"vivienda",pub:"2026-10-22",
    a:"Si hay efecto, es pequeño en estos datos: alrededor de un punto menos de subida en un año. Habrá que repetirlo con los datos de 2025."},
  {id:"pensiones",t:"¿Son sostenibles las pensiones?",d:"El gasto en pensiones no para de crecer y se jubilan las generaciones más numerosas. Separamos por qué crece y probamos escenarios.",m:"Descomposición y escenarios",tema:"gasto",pub:"2026-10-22",
    a:"Depende de tres cosas: cuántos se jubilan, cuánto cobran y cuánto crece la economía. Separamos el gasto en sus partes y probamos escenarios."},
  {id:"pandemia-turismo",t:"¿Golpeó más la pandemia a las zonas turísticas?",d:"En 2020 el turismo se paró de golpe. Comparamos cómo cambiaron el paro y la renta en las provincias más turísticas y en el resto, antes y después.",m:"Antes y después, con grupo de comparación",tema:"trabajo",pub:"2026-10-22",
    a:"Sí: en 2020 el paro subió más y la renta bajó más en las provincias más turísticas que en el resto, y después recuperaron."}
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
  "/quien-soy/":{t:"Quién soy · Indicio",d:"Soy Borja Burriel, analista de datos en empresas de producto y máster en Estadística. Indicio lleva la experimentación y el rigor con la incertidumbre a los datos públicos."},
  "/quien-soy/contacto/":{t:"Escríbeme · Indicio",d:"Una pregunta sobre los datos, un error, una idea o un trabajo a medida: escríbeme."},
  "/comparar/":{t:"Comparar dos municipios · Indicio",d:"Elige dos municipios y compáralos dato a dato."}
};
