/* Idiomas de Indicio: castellano (base), catalán, gallego, euskera e inglés.
   Traduce la interfaz que se repite en todas las páginas (cabecera, menús, pie, temas) en el navegador.
   Los análisis y las fichas siguen en castellano: cuando una página tiene texto sin traducir, avisa con una nota.
   En castellano no hace nada (no observa la página), así que no afecta a quien no cambie de idioma.
   Los textos están en src/i18n-textos.mjs (el build los antepone a este script como la variable ROWS).
   Para traducir un texto nuevo: añade una fila allí con [castellano exacto, ca, gl, eu, en]; {#} marca una cifra (con varias, {#1}, {#2}… dicen cuál del castellano). */
(function(){
"use strict";
var LANGS=[["es","Castellano"],["ca","Català"],["gl","Galego"],["eu","Euskara"],["en","English"]];
var CODES=LANGS.map(function(l){ return l[0]; });
var KEY="indicio.lang";


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

var AUTO={
 ca:'Aquesta web s\'ha traduït automàticament del castellà. Si hi trobes una errada de traducció, <a href="/quien-soy/contacto/">escriu-me</a>.',
 gl:'Esta web foi traducida automaticamente do castelán. Se atopas algún erro de tradución, <a href="/quien-soy/contacto/">escríbenos</a>.',
 eu:'Webgune hau automatikoki itzuli da gaztelaniatik. Itzulpen-errorerik aurkitzen baduzu, <a href="/quien-soy/contacto/">idatzi iezaguzu</a>.',
 en:'This site has been machine-translated from Spanish. If you spot a translation error, <a href="/quien-soy/contacto/">write to us</a>.'
};

var MAP={ca:{},gl:{},eu:{},en:{}};
ROWS.forEach(function(r){ ["ca","gl","eu","en"].forEach(function(l,i){ if(typeof r[i+1]==="string") MAP[l][norm(r[0]).replace(/\d[\d.,]*\d|\d/g,"{#}")]=r[i+1]; }); });
function norm(s){ return s.replace(/\s+/g," ").trim(); }

var lang="es";
var origText=new WeakMap(), lastText=new WeakMap(), origAttr=new WeakMap(), lastAttr=new WeakMap();
var ATTRS=["title","aria-label","placeholder","alt"];
var observer=null, pending=new Set(), raf=0, titleObs=null;

var NUMRE=/\d[\d.,]*\d|\d/g;
function fmtNum(l,t){
  if(l!=="en") return t;
  if(/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)){ var i=t.lastIndexOf(","); var ip=i<0?t:t.slice(0,i), dp=i<0?"":t.slice(i+1); return ip.replace(/\./g,",")+(dp?"."+dp:""); }
  if(/^\d+,\d+$/.test(t)) return t.replace(",",".");
  return t;
}
var AND={ca:"i",gl:"e",eu:"eta",en:"and"};
// «Renta por persona y Paro registrado: r = −0,45»: se traduce cada nombre de variable por separado
function rel(key){
  var m=key.match(/^(.+): r = (−?\{#\})$/); if(!m) return;
  var parts=m[1].split(" y ");
  for(var i=1;i<parts.length;i++){
    var a=MAP[lang][parts.slice(0,i).join(" y ")], b=MAP[lang][parts.slice(i).join(" y ")];
    if(a!==undefined&&b!==undefined) return a+" "+AND[lang]+" "+b+": r = "+m[2];
  }
}
function tr(s){
  if(lang==="es") return s;
  var m=s.match(/^(\s*)([\s\S]*?)(\s*)$/), core=m[2];
  if(!core) return s;
  var nums=core.match(NUMRE)||[], key=norm(core).replace(NUMRE,"{#}"), hit=MAP[lang][key];
  if(hit===undefined) hit=rel(key);
  if(hit!==undefined){ var k=0; hit=hit.replace(/\{#(\d*)\}/g,function(m,d){ var i=d?(+d)-1:k++; return i>=0&&i<nums.length?fmtNum(lang,nums[i]):m; }); }   // {#1}, {#2}…: la cifra nº n del castellano, en el orden que pida cada idioma; {#} a secas, por orden
  else hit=core.replace(DATE_RE,function(_,d,mo,y){ return fmtDate(lang,d,mo,y); });
  return hit===core?s:m[1]+hit+m[3];
}
function skip(n){
  var e=n.nodeType===1?n:n.parentElement;
  return !e||!!e.closest("script,style,[translate=no],.langnote");
}
function doText(n){
  if(skip(n)) return;
  var cur=n.nodeValue;
  if(lastText.has(n)&&cur===lastText.get(n)) return;      // lo escribimos nosotros
  origText.set(n,cur);
  var pe=n.parentElement;
  if(pe&&pe.tagName==="OPTION"&&!pe.hasAttribute("value")) pe.setAttribute("value",norm(cur));   // lo que se envía sigue en castellano
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

function autoNote(){
  var old=document.querySelector(".langauto");
  if(lang==="es"||!AUTO[lang]){ if(old) old.remove(); return; }
  var wrap=document.querySelector(".sitefoot .wrap"); if(!wrap) return;
  if(!old){ old=document.createElement("p"); old.className="langauto"; old.setAttribute("translate","no"); wrap.appendChild(old); }
  old.setAttribute("lang",lang); old.innerHTML=AUTO[lang];
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

var LOGO={
  es:'Indic<span class="lg-i">ı</span>o', gl:'Indic<span class="lg-i">ı</span>o', en:'Indic<span class="lg-i">ı</span>o',
  ca:'Indic<span class="lg-i">ı</span>', eu:'Zantzu<span class="lg-p"></span>'
};
var LOGO_NAME={es:"Indicio",gl:"Indicio",en:"Indicio",ca:"Indici",eu:"Zantzu"};
var LOGO_HOME={es:"portada",gl:"portada",ca:"portada",eu:"hasiera",en:"home"};
function setLogo(l){
  var t=document.getElementById("logotxt"); if(!t) return;
  var h=LOGO[l]||LOGO.es; if(t.getAttribute("data-l")!==l){ t.innerHTML=h; t.setAttribute("data-l",l); }
  var a=t.parentElement; if(a) a.setAttribute("aria-label",LOGO_NAME[l]+", "+LOGO_HOME[l]);
}
function apply(l,save){
  if(CODES.indexOf(l)<0) l="es";
  var prev=lang; lang=l;
  document.documentElement.setAttribute("lang",l);
  if(save){ try{ localStorage.setItem(KEY,l); }catch(e){} }
  var sel=document.getElementById("langsel"); if(sel&&sel.value!==l) sel.value=l;
  setLogo(l);
  if(prev!=="es"){ restoreAll(); titleBack(); }
  if(l==="es"){ stop(); noteCheck(); autoNote(); return; }
  start(); walk(document.body); titleTr(); noteCheck(); autoNote();
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
