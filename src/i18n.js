/* Idiomas de Indicio: castellano (base), catalán, gallego, euskera e inglés.
   Traduce la interfaz que se repite en todas las páginas (cabecera, menús, pie, temas) en el navegador.
   Los análisis y las fichas siguen en castellano: cuando una página tiene texto sin traducir, avisa con una nota.
   En castellano no hace nada (no observa la página), así que no afecta a quien no cambie de idioma.
   Para traducir un texto nuevo: añade una fila a ROWS con [castellano exacto, ca, gl, eu, en]. */
(function(){
"use strict";
var LANGS=[["es","Castellano"],["ca","Català"],["gl","Galego"],["eu","Euskara"],["en","English"]];
var CODES=LANGS.map(function(l){ return l[0]; });
var KEY="indicio.lang";

// [castellano, catalán, gallego, euskera, inglés]
var ROWS=[
 // cabecera
 ["Análisis","Anàlisi","Análises","Azterketak","Analysis"],
 ["Municipios","Municipis","Municipios","Udalerriak","Municipalities"],
 ["Laboratorio","Laboratori","Laboratorio","Laborategia","Lab"],
 ["Quién soy","Qui sóc","Quen son","Nor naiz","About me"],
 ["Preguntas ya respondidas, por tema","Preguntes ja respostes, per tema","Preguntas xa respondidas, por tema","Erantzundako galderak, gaika","Questions already answered, by topic"],
 ["Fichas, comparador y rankings de los municipios de España","Fitxes, comparador i rànquings dels municipis d'Espanya","Fichas, comparador e clasificacións dos municipios de España","Espainiako udalerrien fitxak, konparagailua eta sailkapenak","Profiles, comparison and rankings for Spain's municipalities"],
 ["Cruza datos, comprueba si una relación aguanta y mide antes y después","Creua dades, comprova si una relació aguanta i mesura abans i després","Cruza datos, comproba se unha relación aguanta e mide antes e despois","Gurutzatu datuak, egiaztatu erlazio bat sendoa den eta neurtu aurretik eta ondoren zer gertatu zen","Cross data, check whether a relationship holds up and measure before and after"],
 ["Abrir el menú de Análisis","Obre el menú d'Anàlisi","Abrir o menú de Análises","Ireki Azterketak menua","Open the Analysis menu"],
 ["Abrir el menú de Municipios","Obre el menú de Municipis","Abrir o menú de Municipios","Ireki Udalerriak menua","Open the Municipalities menu"],
 ["Abrir el menú del Laboratorio","Obre el menú del Laboratori","Abrir o menú do Laboratorio","Ireki Laborategia menua","Open the Lab menu"],
 ["Menú de Análisis","Menú d'Anàlisi","Menú de Análises","Azterketak menua","Analysis menu"],
 ["Menú de Municipios","Menú de Municipis","Menú de Municipios","Udalerriak menua","Municipalities menu"],
 ["Menú del Laboratorio","Menú del Laboratori","Menú do Laboratorio","Laborategia menua","Lab menu"],
 ["Secciones","Seccions","Seccións","Atalak","Sections"],
 ["Pie","Peu de pàgina","Pé de páxina","Orri-oina","Footer"],
 ["Ruta","Ruta","Ruta","Bidea","Breadcrumb"],
 ["Indicio, portada","Indicio, portada","Indicio, portada","Indicio, hasiera","Indicio, home"],
 ["Idioma","Idioma","Idioma","Hizkuntza","Language"],
 // temas (menú, temas y portada de cada tema)
 ["Por tema","Per tema","Por tema","Gaika","By topic"],
 ["Riqueza","Riquesa","Riqueza","Aberastasuna","Wealth"],
 ["Vivienda","Habitatge","Vivenda","Etxebizitza","Housing"],
 ["Población","Població","Poboación","Biztanleria","Population"],
 ["Renta y desigualdad","Renda i desigualtat","Renda e desigualdade","Errenta eta desberdintasuna","Income and inequality"],
 ["Empleo y estudios","Ocupació i estudis","Emprego e estudos","Enplegua eta ikasketak","Employment and education"],
 ["Desde 2015","Des del 2015","Desde 2015","2015etik","Since 2015"],
 ["Trabajo","Treball","Traballo","Lana","Work"],
 ["Dinero público","Diner públic","Diñeiro público","Diru publikoa","Public money"],
 ["Voto","Vot","Voto","Botoa","Vote"],
 ["¿Cómo se reparte la riqueza?","Com es reparteix la riquesa?","Como se reparte a riqueza?","Nola banatzen da aberastasuna?","How is wealth shared out?"],
 ["¿Por qué cuesta tanto encontrar casa?","Per què costa tant trobar casa?","Por que custa tanto atopar casa?","Zergatik da hain zaila etxea aurkitzea?","Why is it so hard to find a home?"],
 ["¿Quién llega y quién se va?","Qui arriba i qui se'n va?","Quen chega e quen se vai?","Nor dator eta nor doa?","Who arrives and who leaves?"],
 ["¿De qué vivimos?","De què vivim?","De que vivimos?","Zertatik bizi gara?","What do we live on?"],
 ["¿En qué se gasta?","En què es gasta?","En que se gasta?","Zertan gastatzen da?","What is it spent on?"],
 ["¿Cómo vota cada España?","Com vota cada Espanya?","Como vota cada España?","Nola bozkatzen du Espainia bakoitzak?","How does each Spain vote?"],
 ["Renta por persona y por hogar, pobreza y desigualdad en cada municipio, comparados con España.","Renda per persona i per llar, pobresa i desigualtat a cada municipi, comparades amb Espanya.","Renda por persoa e por fogar, pobreza e desigualdade en cada municipio, comparadas con España.","Pertsona eta etxe bakoitzeko errenta, pobrezia eta desberdintasuna udalerri bakoitzean, Espainiarekin alderatuta.","Income per person and per household, poverty and inequality in each municipality, compared with Spain."],
 ["Alquiler declarado y anunciado, pisos turísticos y viviendas vacías, municipio a municipio.","Lloguer declarat i anunciat, pisos turístics i habitatges buits, municipi a municipi.","Aluguer declarado e anunciado, pisos turísticos e vivendas baleiras, municipio a municipio.","Aitortutako eta iragarritako alokairua, turismo-etxebizitzak eta etxebizitza hutsak, udalerriz udalerri.","Declared and advertised rent, tourist flats and empty homes, municipality by municipality."],
 ["Qué municipios ganan y pierden vecinos desde 2005, quién llega del extranjero y quién se va a otra parte.","Quins municipis guanyen i perden veïns des del 2005, qui arriba de l'estranger i qui se'n va a un altre lloc.","Que municipios gañan e perden veciños desde 2005, quen chega do estranxeiro e quen se vai a outra parte.","Zein udalerrik irabazten eta galtzen dituzten bizilagunak 2005etik, nor datorren atzerritik eta nor joaten den beste nonbaitera.","Which municipalities gain and lose residents since 2005, who arrives from abroad and who moves elsewhere."],
 ["Paro registrado por municipio, estudios y salarios, del norte al sur.","Atur registrat per municipi, estudis i salaris, del nord al sud.","Paro rexistrado por municipio, estudos e salarios, do norte ao sur.","Udalerri bakoitzeko langabezia erregistratua, ikasketak eta soldatak, iparretik hegora.","Registered unemployment by municipality, education and wages, from north to south."],
 ["En qué gastan las administraciones públicas, cuánto va a pensiones y cómo ha cambiado desde 1995.","En què gasten les administracions públiques, quant va a pensions i com ha canviat des del 1995.","En que gastan as administracións públicas, canto vai a pensións e como cambiou desde 1995.","Administrazio publikoek zertan gastatzen duten, zenbat doan pentsioetara eta zer aldatu den 1995etik.","What public administrations spend on, how much goes to pensions and how it has changed since 1995."],
 ["Participación y voto a cada partido en las últimas generales, municipales y europeas, por municipio.","Participació i vot a cada partit en les últimes generals, municipals i europees, per municipi.","Participación e voto a cada partido nas últimas xerais, municipais e europeas, por municipio.","Parte-hartzea eta alderdi bakoitzaren botoa azken hauteskunde orokor, udal eta Europakoetan, udalerriz udalerri.","Turnout and votes for each party in the latest general, municipal and European elections, by municipality."],
 ["Ver todas las preguntas →","Mostra totes les preguntes →","Ver todas as preguntas →","Ikusi galdera guztiak →","See all the questions →"],
 ["Temas","Temes","Temas","Gaiak","Topics"],
 // municipios
 ["Cada municipio, con sus datos","Cada municipi, amb les seves dades","Cada municipio, cos seus datos","Udalerri bakoitza, bere datuekin","Every municipality, with its data"],
 ["Busca tu municipio","Cerca el teu municipi","Busca o teu municipio","Bilatu zure udalerria","Find your municipality"],
 ["Buscar un municipio","Cerca un municipi","Buscar un municipio","Bilatu udalerri bat","Search for a municipality"],
 ["Fichas de municipios","Fitxes de municipis","Fichas de municipios","Udalerrien fitxak","Municipality profiles"],
 ["Cómo sale cada uno, en el mapa","Com surt cadascun, al mapa","Como sae cada un, no mapa","Bakoitza nola dagoen, mapan","How each one comes out, on the map"],
 ["Comparar dos municipios","Compara dos municipis","Comparar dous municipios","Konparatu bi udalerri","Compare two municipalities"],
 ["Lado a lado, dato a dato","Costat per costat, dada a dada","Lado a lado, dato a dato","Aldez alde, datuz datu","Side by side, figure by figure"],
 ["Municipios por provincia","Municipis per província","Municipios por provincia","Udalerriak probintziaka","Municipalities by province"],
 ["Todos, con su renta y su paro","Tots, amb la seva renda i el seu atur","Todos, coa súa renda e o seu paro","Guztiak, errentarekin eta langabeziarekin","All of them, with income and unemployment"],
 ["Rankings de municipios","Rànquings de municipis","Clasificacións de municipios","Udalerrien sailkapenak","Municipality rankings"],
 ["Los más ricos, con más paro, que más crecen…","Els més rics, amb més atur, els que més creixen…","Os máis ricos, con máis paro, os que máis medran…","Aberatsenak, langabezia handienekoak, gehien hazten direnak…","The richest, with most unemployment, growing fastest…"],
 // laboratorio
 ["Explorar los datos","Explora les dades","Explorar os datos","Esploratu datuak","Explore the data"],
 ["Mapas, rankings y gráficos para cruzar datos","Mapes, rànquings i gràfics per creuar dades","Mapas, clasificacións e gráficos para cruzar datos","Mapak, sailkapenak eta grafikoak datuak gurutzatzeko","Maps, rankings and charts to cross data"],
 ["Qué significa cada dato","Què significa cada dada","Que significa cada dato","Datu bakoitzak zer esan nahi duen","What each figure means"],
 ["Qué mide, de dónde sale y qué tener en cuenta","Què mesura, d'on surt i què cal tenir en compte","Que mide, de onde sae e que hai que ter en conta","Zer neurtzen duen, nondik datorren eta zer hartu behar den kontuan","What it measures, where it comes from and what to keep in mind"],
 ["De la relación a la causa","De la relació a la causa","Da relación á causa","Erlaziotik kausara","From relationship to cause"],
 ["Cuándo «van juntos» no quiere decir «uno causa el otro»","Quan «van junts» no vol dir «un causa l'altre»","Cando «van xuntos» non quere dicir «un causa o outro»","Noiz ez duen «batera doaz»-ek esan nahi «batak bestea eragiten du»","When «they go together» does not mean «one causes the other»"],
 ["Elige tu municipio","Tria el teu municipi","Elixe o teu municipio","Aukeratu zure udalerria","Pick your municipality"],
 ["Seis preguntas sobre España","Sis preguntes sobre Espanya","Seis preguntas sobre España","Sei galdera Espainiari buruz","Six questions about Spain"],
 ["Leer →","Llegeix →","Ler →","Irakurri →","Read →"],
 ["Leer","Llegeix","Ler","Irakurri","Read"],
 // pie
 ["Preguntas reales, respuestas con datos públicos","Preguntes reals, respostes amb dades públiques","Preguntas reais, respostas con datos públicos","Benetako galderak, datu publikoekin erantzunak","Real questions, answers from public data"],
 ["datos actualizados","dades actualitzades","datos actualizados","datuak eguneratuta:","data updated"],
 ["Escríbeme","Escriu-me","Escríbeme","Idatzi iezaidazu","Write to me"]
];

var MONTHS={
 es:["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"],
 ca:["gener","febrer","març","abril","maig","juny","juliol","agost","setembre","octubre","novembre","desembre"],
 gl:["xaneiro","febreiro","marzo","abril","maio","xuño","xullo","agosto","setembro","outubro","novembro","decembro"],
 eu:["urtarrilaren","otsailaren","martxoaren","apirilaren","maiatzaren","ekainaren","uztailaren","abuztuaren","irailaren","urriaren","azaroaren","abenduaren"],
 en:["January","February","March","April","May","June","July","August","September","October","November","December"]
};
var MIDX={}; MONTHS.es.forEach(function(m,i){ MIDX[m]=i; });
var DATE_RE=/\b(\d{1,2}) de (enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre) de (\d{4})\b/g;
function fmtDate(lang,d,m,y){
  var mi=MIDX[m];
  if(lang==="ca") return d+(/^[aeiouh]/i.test(MONTHS.ca[mi])?" d'":" de ")+MONTHS.ca[mi]+" de "+y;
  if(lang==="gl") return d+" de "+MONTHS.gl[mi]+" de "+y;
  if(lang==="eu") return y+"ko "+MONTHS.eu[mi]+" "+d+"a";
  return d+" "+MONTHS.en[mi]+" "+y;
}

var NOTE={
 ca:"Els textos i les anàlisis d'aquesta pàgina encara només són en castellà.",
 gl:"Os textos e as análises desta páxina aínda só están en castelán.",
 eu:"Orri honetako testuak eta azterketak oraindik gaztelaniaz soilik daude.",
 en:"The texts and analyses on this page are only available in Spanish for now."
};

var MAP={ca:{},gl:{},eu:{},en:{}};
ROWS.forEach(function(r){ ["ca","gl","eu","en"].forEach(function(l,i){ MAP[l][norm(r[0])]=r[i+1]; }); });
function norm(s){ return s.replace(/\s+/g," ").trim(); }

var lang="es";
var origText=new WeakMap(), lastText=new WeakMap(), origAttr=new WeakMap(), lastAttr=new WeakMap();
var ATTRS=["title","aria-label","placeholder","alt"];
var observer=null, pending=new Set(), raf=0, titleObs=null;

function tr(s){
  if(lang==="es") return s;
  var m=s.match(/^(\s*)([\s\S]*?)(\s*)$/), core=m[2];
  if(!core) return s;
  var hit=MAP[lang][norm(core)];
  if(hit===undefined) hit=core.replace(DATE_RE,function(_,d,mo,y){ return fmtDate(lang,d,mo,y); });
  return hit===core?s:m[1]+hit+m[3];
}
function skip(n){
  var e=n.nodeType===1?n:n.parentElement;
  return !e||!!e.closest("script,style,svg,[translate=no],option,.langnote");
}
function doText(n){
  if(skip(n)) return;
  var cur=n.nodeValue;
  if(lastText.has(n)&&cur===lastText.get(n)) return;      // lo escribimos nosotros
  origText.set(n,cur);
  var t=tr(cur);
  if(t!==cur){ lastText.set(n,t); n.nodeValue=t; } else lastText.delete(n);
}
function doAttrs(el){
  if(skip(el)) return;
  var o=origAttr.get(el)||{}, l=lastAttr.get(el)||{};
  ATTRS.forEach(function(a){
    if(!el.hasAttribute(a)) return;
    var cur=el.getAttribute(a);
    if(l[a]!==undefined&&cur===l[a]) return;
    o[a]=cur; var t=tr(cur);
    if(t!==cur){ l[a]=t; el.setAttribute(a,t); } else delete l[a];
  });
  origAttr.set(el,o); lastAttr.set(el,l);
}
function walk(root){
  if(root.nodeType===3){ doText(root); return; }
  if(root.nodeType!==1) return;
  var w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT|NodeFilter.SHOW_ELEMENT,null), n=root;
  do{ if(n.nodeType===3) doText(n); else doAttrs(n); }while((n=w.nextNode()));
}
function restoreAll(){
  var w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT|NodeFilter.SHOW_ELEMENT,null), n;
  while((n=w.nextNode())){
    if(n.nodeType===3){ if(lastText.has(n)){ n.nodeValue=origText.get(n); lastText.delete(n); } }
    else if(lastAttr.has(n)){ var o=origAttr.get(n), l=lastAttr.get(n); Object.keys(l).forEach(function(a){ if(o&&o[a]!==undefined) n.setAttribute(a,o[a]); }); lastAttr.delete(n); }
  }
}
var titleSrc=null, titleOut=null;
function titleTr(){
  var t=document.title;
  if(titleOut!==null&&t===titleOut) return;
  titleSrc=t;
  if(lang==="es"){ titleOut=null; return; }
  var out=t.split(" · ").map(function(p){ var h=MAP[lang][norm(p)]; return h===undefined?p:h; }).join(" · ");
  if(out!==t){ titleOut=out; document.title=out; } else titleOut=null;
}
function titleBack(){ if(titleOut!==null&&document.title===titleOut&&titleSrc!==null) document.title=titleSrc; titleOut=null; }

function noteCheck(){
  var old=document.querySelector(".langnote");
  if(lang==="es"){ if(old) old.remove(); return; }
  var main=document.getElementById("view"); if(!main) return;
  var long=0, w=document.createTreeWalker(main,NodeFilter.SHOW_TEXT,null), n;
  while((n=w.nextNode())){ if(skip(n)) continue; var v=n.nodeValue; if(v.length>70&&!lastText.has(n)&&/[a-záéíóúñ]{3}/i.test(v)&&++long>=3) break; }
  if(long<3){ if(old) old.remove(); return; }
  if(!old){ old=document.createElement("p"); old.className="langnote"; old.setAttribute("role","note"); main.parentNode.insertBefore(old,main); }
  old.setAttribute("lang",lang); old.textContent=NOTE[lang];
}

function flush(){
  raf=0; var items=Array.from(pending); pending.clear();
  items.forEach(function(n){ if(n.isConnected) walk(n); });
  noteCheck();
}
function schedule(n){ pending.add(n); if(!raf) raf=requestAnimationFrame(flush); }
function start(){
  if(observer) return;
  observer=new MutationObserver(function(ms){
    ms.forEach(function(m){
      if(m.type==="childList") m.addedNodes.forEach(function(n){ schedule(n); });
      else if(m.type==="characterData") schedule(m.target);
      else if(m.type==="attributes") schedule(m.target);
    });
  });
  observer.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:ATTRS});
  var t=document.querySelector("title");
  if(t&&!titleObs){ titleObs=new MutationObserver(titleTr); titleObs.observe(t,{childList:true,characterData:true,subtree:true}); }
}
function stop(){ if(observer){ observer.disconnect(); observer=null; } if(titleObs){ titleObs.disconnect(); titleObs=null; } pending.clear(); }

function apply(l,save){
  if(CODES.indexOf(l)<0) l="es";
  var prev=lang; lang=l;
  document.documentElement.setAttribute("lang",l);
  if(save){ try{ localStorage.setItem(KEY,l); }catch(e){} }
  var sel=document.getElementById("langsel"); if(sel&&sel.value!==l) sel.value=l;
  if(prev!=="es"){ restoreAll(); titleBack(); }
  if(l==="es"){ stop(); noteCheck(); return; }
  start(); walk(document.body); titleTr(); noteCheck();
}

function detect(){
  try{ var q=new URLSearchParams(location.search).get("lang"); if(q&&CODES.indexOf(q)>=0){ try{ localStorage.setItem(KEY,q); }catch(e){} return q; } }catch(e){}
  try{ var s=localStorage.getItem(KEY); if(s&&CODES.indexOf(s)>=0) return s; }catch(e){}
  var nl=(navigator.languages&&navigator.languages.length?navigator.languages:[navigator.language||"es"]);
  for(var i=0;i<nl.length;i++){ var c=String(nl[i]).slice(0,2).toLowerCase(); if(c==="es") return "es"; if(CODES.indexOf(c)>=0) return c; }
  return "es";
}

function init(){
  var sel=document.getElementById("langsel");
  if(sel){ sel.addEventListener("change",function(){ apply(sel.value,true); }); }
  apply(detect(),false);
}
window.__I18N={apply:function(l){ apply(l,true); }, get lang(){ return lang; }, langs:LANGS};
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init); else init();
})();
