// Contenido editorial de Indicio: lo leen el build (para generar las páginas) y la app (en el navegador).
// Cada pregunta tiene un único título, que es el mismo en portada, en el índice y en su página.
//  id: forma parte de la URL (/preguntas/<id>/)      t: título       d: entradilla
//  m: método                                          pub: fecha de publicación (AAAA-MM-DD)
//  upd: última revisión del texto o de los datos      a: respuesta corta (texto fijo para buscadores; en la web se calcula con los datos)
//  ev: nivel de evidencia — "desc" (descriptivo), "igual" (comparación entre iguales), "natural" (experimento natural: antes y después, discontinuidad)

export const SITE={
  name:"Indicio",
  url:"https://indicio.es",
  tagline:"Preguntas reales, respuestas con datos públicos",
  description:"Indicio: preguntas reales sobre cómo vivimos, respondidas con datos públicos de los 8.139 municipios de España. Y un laboratorio para que compruebes tú si una relación aguanta y qué pasó antes y después de una ley.",
  dataUpdated:"2026-11-03",
  author:{name:"Borja Burriel",url:"https://indicio.es/quien-soy/",
    bio:"Data scientist con un máster en Estadística y siete años en equipos de datos, especializado en experimentación e inferencia causal. En Indicio aplica ese método a los datos públicos de España.",
    linkedin:"", web:"", foto:""},
  oldHost:"cifrarios.netlify.app"
};

export const STUDIES=[
  {id:"pisos-turisticos",oculto:true,ev:"igual",t:"¿Los pisos turísticos encarecen el alquiler?",d:"Es la explicación que más se oye cada vez que sube el alquiler. Y es cierto que donde hay más pisos turísticos el alquiler sube algo más. Pero esos lugares también tienen más empleo, más turismo y más gente llegando. ¿Qué queda cuando se descuenta todo eso?",m:"Cambios, controles y panel anual",pub:"2026-10-22",
    upd:"2026-10-24",a:"Menos de lo que se dice. Donde más han crecido los pisos turísticos no es, en general, donde más ha subido el alquiler, empiece la cuenta en 2020, 2021 o 2022. Si hay efecto, está en barrios concretos."},
  {id:"convergencia",oculto:true,ev:"natural",t:"¿Los lugares pobres alcanzan a los ricos, y de dónde sale el dinero?",d:"Entre 2015 y 2024 la renta subió en casi toda España. La duda es si subió igual para todos, y si los pueblos que partían de abajo han recortado distancia, gracias al trabajo o a las pensiones y prestaciones que suben por ley.",m:"Convergencia β y σ, descomposición por fuentes y placebos en el tiempo",pub:"2026-10-22",
    upd:"2026-11-02",a:"Sí, poco a poco, y sobre todo por el trabajo. La distancia entre los municipios más ricos y los más pobres se ha estrechado desde 2015, también midiéndolo de forma que el punto de partida no engañe. Los salarios explican la mayor parte; las pensiones y prestaciones ayudan, pero menos, y los otros ingresos restan. La subida del salario mínimo de 2019 deja una huella clara en los municipios más pobres."},
  {id:"votar-pueblos",oculto:true,ev:"igual",t:"¿Se vota más en los pueblos?",d:"En un pueblo pequeño vota mucha más gente que en una ciudad. ¿Es porque allí la política se vive de cerca, o simplemente porque su población es mayor y los mayores votan más?",m:"Separar dos explicaciones",pub:"2026-10-22",
    upd:"2026-10-24",a:"Sí. En los municipios de menos de 500 habitantes vota bastante más gente que en las ciudades de más de 50.000. Parte se explica porque allí la población es mayor; el resto, por el tamaño en sí."},
  {id:"crecer",oculto:true,ev:"igual",t:"¿Por qué unos pueblos ganan vecinos y otros se vacían?",d:"Cerca de una ciudad crece la mayoría de los pueblos; lejos, casi ninguno. Pero lejos también están los más envejecidos. Ponemos a competir la distancia, la edad, la renta y los estudios entre pueblos parecidos, a ver cuál aguanta.",m:"Gradiente, regresión con efectos fijos y comparación con 2015–2019",pub:"2026-10-22",
    upd:"2026-11-02",a:"Más por la edad que por la distancia. Cerca de una ciudad crece la mayoría de los pueblos y lejos casi ninguno, pero entre pueblos iguales de la misma provincia la distancia cuenta poco; pesan la juventud y los estudios. La costa crece porque sus pueblos son más jóvenes y más ricos, no por ser costa."},
  {id:"tope-cataluna",ev:"natural",t:"¿Funcionó el tope del alquiler en Cataluña?",d:"Desde marzo de 2024, 140 municipios catalanes ponen techo a los contratos nuevos de alquiler. El alquiler subió menos de lo que habría subido, y a la vez se vendieron más pisos. Medimos las dos cosas.",m:"Alquiler declarado a Hacienda, INE, 2015–2024",pub:"2026-10-22",
    upd:"2026-11-02",a:"Frenó la subida, pero no bajó el alquiler. En 2024 subió un 3,1 % donde hay tope y, sin él, habría subido en torno a un 3,7 %, y el freno es mayor en los contratos nuevos. En esos municipios se vendieron además más pisos de lo esperable, y los datos no dicen si salieron del alquiler."},
  {id:"pensiones",ev:"desc",t:"¿Son sostenibles las pensiones?",d:"Cada año se gasta más en pensiones y ahora se jubilan las generaciones más numerosas. Repasamos de dónde viene el gasto, qué trae la demografía y cuánto habría que cambiar para que quepa.",m:"Eurostat, INE y escenarios hasta 2070",pub:"2026-10-22",
    upd:"2026-11-03",a:"Depende de cuánto se quiera gastar. Si solo cambia la demografía, el gasto pasa del 13,2 % al 24,9 % del PIB en 2050 (un ejercicio, no una previsión): no cabe. Con lo previsto tras las reformas (pensiones con el IPC, un año más de trabajo efectivo y un 5 % más de empleo y de población en edad de trabajar) queda en el 16,5 %, a 0,3 puntos del límite del 16,2 % (el gasto de hoy más tres puntos, cerca de lo que proyectan la AIReF y Fedea): cabe por poco o se pasa por poco. Para asegurarlo, cada pensión tendría que pesar algo menos frente a lo que produce un trabajador."},
  {id:"pandemia-turismo",oculto:true,ev:"natural",t:"¿Golpeó más la pandemia a las zonas turísticas?",d:"En la primavera de 2020 los hoteles cerraron y los aviones se quedaron en tierra. Comparamos el paro y la renta de las provincias más turísticas con las del resto, antes y después, para ver si el golpe fue mayor.",m:"Diferencias en diferencias y estudio de eventos",pub:"2026-10-22",
    upd:"2026-10-24",a:"Sí: en 2020 el paro subió más y la renta bajó más en las provincias más turísticas que en el resto, también dentro de cada provincia, y después recuperaron."},
  {id:"quien-gobierna",ev:"natural",upd:"2026-11-02",t:"¿Importa quién gobierna tu ayuntamiento?",d:"Comparar pueblos del PP con pueblos del PSOE no sirve: ya eran distintos antes de votar. Por eso miramos solo las elecciones que se decidieron por un puñado de votos, donde ganar o perder fue casi cuestión de suerte. Medimos qué pasó con la población, el paro, la renta, el voto y la deuda del ayuntamiento.",m:"Regresión discontinua",pub:"2026-10-23",
    a:"Donde el PP o el PSOE ganaron por poco, no se ve que el alcalde cambiara nada: población, paro, renta y deuda siguieron caminos parecidos. Pero con tan pocos pueblos solo se descartan diferencias grandes (unos 4 puntos de población, 8 parados por cada 100 o 80 € de deuda por vecino), y se mide quedar primero, no ser alcalde."},
  {id:"ave",oculto:true,ev:"natural",upd:"2026-10-24",t:"¿Cambia algo cuando llega el AVE?",d:"Entre 2021 y 2023 la alta velocidad llegó a Galicia, Extremadura, Burgos, Murcia, Elche y Asturias. ¿Ha cambiado algo en los pueblos de alrededor? Los comparamos con otros casi idénticos que se quedaron sin estación.",m:"Gemelos y estudio de eventos",pub:"2026-10-23",
    a:"Poco, por ahora. A dos o cuatro años vista, los municipios cercanos a una estación nueva apenas se distinguen de sus gemelos en población o renta, y los métodos no coinciden en el signo; varía mucho de una estación a otra."},
  {id:"prohibir-pisos-turisticos",oculto:true,ev:"natural",upd:"2026-10-24",t:"¿Sirve prohibir los pisos turísticos?",d:"Madrid, València, Sevilla, Málaga, Alicante… cada vez más ayuntamientos prohíben abrir nuevos pisos turísticos. Antes de preguntar si baja el alquiler hay una pregunta previa: ¿frena siquiera el número de pisos turísticos?",m:"Diferencias en diferencias y estudio de eventos",pub:"2026-10-23",
    a:"Hay una pista de que frenan los pisos turísticos, pero no es sólida: frente a gemelos parecidos crecen menos, pero el estudio año a año no lo confirma. Pocos municipios, poco tiempo, y el INE cuenta anuncios, no licencias."},
  {id:"vivienda-protegida",oculto:true,ev:"desc",upd:"2026-10-24",t:"¿Qué pasó con la vivienda protegida?",d:"En plena burbuja se terminaban unas 65.000 viviendas protegidas al año. Hoy, con el acceso a la vivienda como primera preocupación, contamos cuántas se hacen y dónde.",m:"Series del Ministerio de Vivienda, 1996–2025",pub:"2026-10-24",
    a:"Se ha reducido a una sexta parte: unas 11.000 al año frente a 65.000 antes de la crisis, y la caída llegó de golpe en 2013, con el fin de las ayudas a la promoción. Solo Madrid, el País Vasco y Navarra mantienen un ritmo apreciable."},
  {id:"reforma-laboral",oculto:true,ev:"natural",upd:"2026-11-02",t:"¿Costó empleo la reforma laboral?",d:"En 2022 la reforma laboral recortó los contratos temporales, y hubo quien temió que costara empleo. Comparamos los municipios que más dependían de ellos con los que menos: cómo cambiaron sus contratos y si perdieron puestos de trabajo.",m:"Exposición, tendencias y placebo",pub:"2026-10-25",
    a:"No se ve. La temporalidad de los contratos nuevos bajó unos 30 puntos en todas partes, y los municipios que más dependían del contrato temporal no perdieron más empleo que los demás, descontada la tendencia que ya traían. Los datos no distinguirían una pérdida de hasta unos 4.100 empleos en el grupo más temporal."},
  {id:"smi-empleo-hogar",oculto:true,ev:"natural",upd:"2026-10-25",t:"¿Hundió la subida del salario mínimo el empleo de hogar?",d:"En 2019 el salario mínimo subió un 22 % de golpe, y el servicio doméstico era de los empleos más expuestos. Miramos si las altas en la Seguridad Social cayeron más de lo normal, y si cayeron más donde las familias tienen menos renta.",m:"Tendencias y grupos de renta",pub:"2026-10-25",
    a:"No se ve que lo hundiera. El empleo de hogar registrado ya caía desde 2016 y en 2019 siguió cayendo a un ritmo parecido, sin caer más donde la renta es menor. Lo que no se ve es la economía sumergida."},
  {id:"precio-alimentos",ev:"natural",upd:"2026-11-03",t:"¿Cuánto cuesta llenar el carro y qué parte del sueldo se lleva?",d:"Desde 2019 la comida ha subido bastante más que el sueldo. Calculamos cuánto cuesta hoy llenar el carro, cómo ha cambiado el esfuerzo de pagarlo y a quién le pesa más.",m:"Presupuestos Familiares, IPC, Estructura Salarial y triple diferencia del IVA, 2002–2026"},
];

// Preguntas que se responden en el laboratorio, no en un análisis paso a paso
export const QUICK=[
  {id:"estudiar",ev:"desc",t:"¿Estudiar hace más rico a un lugar?",href:"/laboratorio/cruce/?d=superiores,renta&t=g1",
    a:"Van muy juntos: donde más gente tiene estudios superiores, la renta es bastante mayor. Si una cosa causa la otra, es otra historia."},
  {id:"paro-sur",ev:"desc",t:"¿De verdad hay más paro en el sur?",href:"/laboratorio/mapa/?d=paroReg",
    a:"Sí. En Andalucía y Extremadura el paro registrado es bastante más alto que en el norte peninsular."}
];

export const PAGES={
  "/":{t:"Indicio · Preguntas reales, respuestas con datos públicos",d:SITE.description},
  "/preguntas/":{t:"Análisis · Indicio",d:"Preguntas reales sobre cómo vivimos, ya respondidas con datos públicos. Cada una lleva su respuesta corta y, dentro, cómo se ha calculado y qué se puede concluir."},
  "/laboratorio/":{t:"Laboratorio · Indicio",d:"Tu lienzo para los datos de España: elige un gráfico, cruza dos datos en los 8.139 municipios, comprueba si la relación aguanta entre iguales y mide qué pasó antes y después de una ley o un suceso."},
  "/laboratorio/metodo/":{t:"De la relación a la causa · Indicio",d:"Una guía corta para pasar de «estas dos cosas van juntas» a «esto podría estar causando aquello», y saber cuándo no se puede."},
  "/laboratorio/datos/":{t:"Qué significa cada dato · Indicio",d:"Qué mide cada dato del laboratorio, de dónde sale, de qué año es y qué matices conviene tener en cuenta antes de sacar conclusiones."},
  "/municipio/":{t:"Municipios · Indicio",d:"Busca tu municipio y mira cómo sale en renta, población, paro, vivienda y voto, comparado con España."},
  "/quien-soy/":{t:"Quién soy · Indicio",d:"Borja Burriel, data scientist especializado en experimentación e inferencia causal. Análisis independientes con datos públicos de España."},
  "/quien-soy/contacto/":{t:"Escríbeme · Indicio",d:"Una pregunta sobre los datos, un error, una idea o un trabajo a medida: escríbeme."},
  "/comparar/":{t:"Comparar dos municipios · Indicio",d:"Elige dos municipios y compáralos dato a dato."}
};

// Niveles de evidencia: qué tipo de conclusión permite el diseño de cada análisis
export const EVIDENCE={
  desc:{l:"Descriptivo",d:"Cuenta qué pasa y dónde. No dice por qué."},
  igual:{l:"Comparación entre iguales",d:"Descarta las explicaciones que se han medido (tamaño, edad, renta…), no las demás, ni que la causa vaya al revés."},
  natural:{l:"Experimento natural",d:"Compara antes y después de una ley o un suceso con lugares que no lo vivieron, o elecciones decididas por poco. Es lo más cerca de una causa que permiten estos datos, si se cumple su supuesto."}
};
