(function(){
"use strict";
const YEARS=[2015,2016,2017,2018,2019,2020,2021,2022,2023,2024];
const F={};
let IDX=[], BYCODE=new Map(), PROVS={}, REFS=null, VREFS=null, TOPO=null, FEATS=null, CAT=null; const CATK={};
const provCache=new Map();
const PARTY={ "PP":"#1d84ce","PSOE":"#d7322c","Vox":"#5aa62a","Sumar":"#d93a7c","Cs":"#ef7b22","ERC":"#e8b21b","Junts":"#1fb3a8","PNV":"#2f7d3f","EH Bildu":"#4fb6a0","BNG":"#7fb4dc","CUP":"#f0d200","CC":"#f5c400","NC":"#8db63c","UPN":"#2a4f8f","NA+":"#2a4f8f","Teruel Existe":"#3c8f6a","PRC":"#b9c935","UPL":"#a8326e","PACMA":"#8fae3a","SALF":"#6d5a8c","Lista local":"#8c7b70","Otros":"#a69b8b" };
const pColor=p=>PARTY[p]||PARTY.Otros;
const MES=["","enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const ELTYPE={"02":"generales","04":"municipales","07":"europeas"};
const ELNAME=k=>ELTYPE[k.slice(0,2)]+" de "+MES[+k.slice(6,8)]+" de "+k.slice(2,6);
const ELSHORT=k=>(k.slice(0,2)==="02"?"":ELTYPE[k.slice(0,2)].slice(0,3)+". ")+MES[+k.slice(6,8)].slice(0,3)+". "+k.slice(2,6);

const nf0=new Intl.NumberFormat("es-ES",{maximumFractionDigits:0});
const nf1=new Intl.NumberFormat("es-ES",{minimumFractionDigits:1,maximumFractionDigits:1});
const nf2=new Intl.NumberFormat("es-ES",{minimumFractionDigits:2,maximumFractionDigits:2});
const NB=" ";
const eur=v=>v==null?"—":nf0.format(v)+NB+"€";
const pc=v=>v==null?"—":nf1.format(v)+NB+"%";
const pc0=v=>v==null?"—":nf0.format(v)+NB+"%";
const sgn=v=>v==null?"—":(v>0?"+":v<0?"−":"")+nf1.format(Math.abs(v))+NB+"%";
const pts=v=>v==null?"—":(v>0?"+":v<0?"−":"")+nf1.format(Math.abs(v));
const norm=s=>s.normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9 ]/g," ").replace(/\s+/g," ").trim();
const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const provShort=n=>n?n.split("/")[0].replace(/^(.*), (A|Las|La|Les|Illes|Os)$/,"$2 $1"):"";
const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
const last=a=>{ if(!a) return [null,null]; for(let i=a.length-1;i>=0;i--) if(a[i]!=null) return [a[i],YEARS[i]]; return [null,null]; };
const first=a=>{ if(!a) return [null,null]; for(let i=0;i<a.length;i++) if(a[i]!=null) return [a[i],YEARS[i]]; return [null,null]; };
const growth=a=>{ const [v0,y0]=first(a),[v1,y1]=last(a); return (v0&&v1&&y1>y0)?(v1/v0-1)*100:null; };
const view=document.getElementById("view");
const el=(tag,cls,html)=>{ const e=document.createElement(tag); if(cls) e.className=cls; if(html!=null) e.innerHTML=html; return e; };
const add=(parent,tag,cls,html)=>{ const e=el(tag,cls,html); parent.appendChild(e); return e; };
// cifra en palabras para frases ("seis de cada diez")
const WORDS=["cero","uno","dos","tres","cuatro","cinco","seis","siete","ocho","nueve","diez"];
const deCadaDiez=p=>{ const n=Math.round(p/10); return (n>=1&&n<=9)?`${WORDS[n]} de cada diez`:`el ${nf0.format(p)}${NB}%`; };

async function getJSON(u){const r=await fetch(u); if(!r.ok) throw new Error(u+" "+r.status); return r.json();}
const loadProv=p=>{ if(!provCache.has(p)) provCache.set(p, getJSON("/data/prov/"+p+".json")); return provCache.get(p); };
let topoP=null;
const loadTopo=()=>{ if(!topoP) topoP=getJSON("/data/municipios.topo.json").then(t=>{ TOPO=t; prepGeo(); return t; }); return topoP; };

loadTopo().catch(()=>{}); // el mapa se descarga en paralelo con el índice, no después
Promise.all([getJSON("/data/index.json"),getJSON("/data/refs.json"),getJSON("/data/vote_refs.json"),getJSON("/data/indicadores.json")]).then(([ix,refs,vrefs,cat])=>{
  REFS=refs; VREFS=vrefs; PROVS=ix.provs; CAT=cat; cat.forEach(c=>CATK[c.k]=c);
  ix.fields.forEach((f,i)=>F[f]=i);
  const disp=n=>n.split("/").map(x=>x.replace(/^(.*), (El|La|Los|Las|Els|Les|Lo|A|O|Os|As|Es|Sa|Ses|L')$/,(m,a,b)=>b.endsWith("'")?b+a:b+" "+a)).join("/");
  IDX=ix.rows.map(r=>{ const o=r[F.name]; r[F.name]=disp(o); return {row:r,key:norm(r[F.name])+" "+norm(o)}; });
  IDX.forEach(o=>BYCODE.set(o.row[F.code],o.row));
  try{ derive(); }catch(e){ console.error(e); }
  try{ myHeader(); }catch(e){ console.error(e); }
  window.addEventListener("popstate",route); urlInit(); route();
  // Los márgenes de los gráficos se calculan midiendo el texto. Si las tipografías aún no han
  // llegado, la medida sale de la de reserva: en cuanto cargan, se vuelve a dibujar una sola vez.
  if(document.fonts&&document.fonts.status!=="loaded") document.fonts.ready.then(()=>{ try{ route(); }catch(e){ console.error(e); } });
}).catch(e=>{ console.error(e); view.innerHTML='<p class="loading">No se pudieron cargar los datos. Recarga la página.</p>'; });

const rowsAll=()=>IDX.map(o=>o.row);
const FMT={int:v=>nf0.format(v),pct:pc,pct_chg:sgn,pts:sgn,eur:eur,eurm2:v=>nf1.format(v)+NB+"€/m²",years:v=>nf1.format(v)+NB+"años",num1:v=>nf1.format(Math.abs(v)<0.05?0:v),km:v=>nf0.format(v)+NB+"km",veces:v=>Math.abs(v-1)<0.05?"1"+NB+"vez":nf1.format(v)+NB+"veces",pp:v=>nf1.format(v)+NB+"puntos",num:v=>(Math.abs(v)>=1000?nf0:Math.abs(v)>=1?nf1:nf2).format(v),dens:v=>(v<10?nf1:nf0).format(v)+NB+"hab./km²"};
const fmtK=k=>FMT[(CATK[k]||{}).f]||(v=>nf1.format(v));
const labK=k=>(CATK[k]||{}).l||k;

// media de España ponderada por población, y posición (percentil de población) de cada valor
const ESMEAN={}, PCTL={};
// la cifra de España que se enseña junto a un municipio: la oficial cuando existe (padrón, censo,
// Interior, SEPE), y si no, la media de los municipios ponderada por población. Así las cifras clave,
// «lo que destaca» y los textos de la ficha dan el mismo número para España.
function esOff(k){ try{ const es=REFS.es, ce=REFS.census&&REFS.census.es, pe=REFS.paro&&REFS.paro.es;
    if((k==="part"||k==="turn23")&&VREFS) return VREFS.es[VG()].turnout;
    if(k==="paroReg"&&pe){ const i=REFS.paroYears.indexOf(2025); return pe.paro[i]/pe.pob1664*100; }
    if(k==="alquiler"&&ce&&ce.rented!=null) return ce.rented;
    if(k==="paro"&&ce&&ce.unemp!=null) return ce.unemp;
    if(k==="superiores"&&ce&&ce.higherEd!=null) return ce.higherEd;
    if(k==="edad"&&es.mean_age) return lastV(es.mean_age);
    if(k==="varPob"&&es.pad){ const PY=REFS.padYears; return (lastV(es.pad)/es.pad[PY.indexOf(2015)]-1)*100; }
  }catch(e){} return esMean(k); }
function esMean(k){ if(k in ESMEAN) return ESMEAN[k]; const s=rowsAll().filter(r=>r[F[k]]!=null&&r[F.pop]); const w=d3.sum(s,r=>r[F.pop]); return ESMEAN[k]=w?d3.sum(s,r=>r[F[k]]*r[F.pop])/w:null; }
function pctl(k,v){ if(v==null) return null; if(!PCTL[k]){ const s=rowsAll().filter(r=>r[F[k]]!=null&&r[F.pop]).map(r=>[r[F[k]],r[F.pop]]).sort((a,b)=>a[0]-b[0]); const tot=d3.sum(s,x=>x[1]); let acc=0; PCTL[k]={v:s.map(x=>x[0]),c:s.map(x=>{ const m=acc+x[1]/2; acc+=x[1]; return m/tot*100; })}; }
  const P=PCTL[k]; const i=d3.bisectLeft(P.v,v); return P.c[Math.min(i,P.c.length-1)]; }

// ---------- URLs: rutas reales (y compatibilidad con los antiguos #hash) ----------
const SLUG=s=>norm(dispName(String(s))).replace(/ /g,"-");
const munPath=(code,sec)=>{ const r=BYCODE.get(code); return "/municipio/"+code+(r?"-"+SLUG(r[F.name]):"")+"/"+(sec?sec+"/":""); };
function keyToPath(h){
  h=String(h||"").replace(/^#/,""); let m;
  if(h===""||h==="inicio") return "/";
  if(h.startsWith("/")) return h;
  if((m=h.match(/^m(\d{5})(?:-([a-z]+))?$/))) return munPath(m[1],m[2]);
  if((m=h.match(/^explorar(?:\/([a-z]+))?(\?.*)?$/))) return "/laboratorio/"+(m[1]?m[1]+"/":"")+(m[2]||"");
  if(h==="estudios"||h==="preguntas") return "/preguntas/";
  if(h==="estudios-metodo"||h==="metodo") return "/laboratorio/metodo/";
  if(h==="laboratorio-datos") return "/laboratorio/datos/";
  if((m=h.match(/^estudios?-([\w-]+)$/))) return "/preguntas/"+m[1]+"/";
  if(h==="temas") return "/temas/";
  if((m=h.match(/^(?:riqueza|renta)(?:-(\d{5}))?$/))) return "/temas/riqueza/"+(m[1]?"?m="+m[1]:"");
  if(/^(vivienda|poblacion|trabajo|gasto|voto)$/.test(h)) return "/temas/"+h+"/";
  if(h==="municipio") return "/municipio/";
  if(h==="sobre") return "/quien-soy/";
  if(h==="sobre-contacto") return "/quien-soy/contacto/";
  if((m=h.match(/^comparar(?:-(\d{5}))?(?:-(\d{5}))?$/))) return "/comparar/"+(m[1]||m[2]?((m[1]||"")+(m[2]?"-"+m[2]:"")+"/"):"");
  if((m=h.match(/^(?:cruces|relaciones)(?:-([a-zA-Z0-9]+)-([a-zA-Z0-9]+))?$/))) return "/laboratorio/cruce/"+(m[1]?"?d="+m[1]+","+m[2]:"");
  if(/^evolucion/.test(h)) return "/laboratorio/evolucion/";
  return "/"+h+"/";
}
function pathToKey(){
  const p=location.pathname.replace(/\/index\.html$/,"").replace(/\/+$/,""), q=location.search; let m;
  if(p==="") return "";
  if(p==="/preguntas") return "preguntas";
  if((m=p.match(/^\/preguntas\/([\w-]+)$/))) return "estudios-"+m[1];
  if(p==="/temas") return "temas";
  if((m=p.match(/^\/temas\/([a-z]+)$/))){ if(m[1]==="riqueza"){ const c=new URLSearchParams(q).get("m"); return "riqueza"+(c&&/^\d{5}$/.test(c)?"-"+c:""); } return m[1]; }
  if(p==="/laboratorio") return "explorar";
  if(p==="/laboratorio/metodo") return "estudios-metodo";
  if(p==="/laboratorio/datos") return "laboratorio-datos";
  if((m=p.match(/^\/laboratorio\/([a-z]+)$/))) return "explorar/"+m[1]+q;
  if(p==="/municipio") return "municipio";
  if((m=p.match(/^\/municipio\/(\d{5})(?:-[^/]*)?(?:\/([a-z]+))?$/))) return "m"+m[1]+(m[2]?"-"+m[2]:"");
  if(p==="/quien-soy") return "sobre";
  if(p==="/quien-soy/contacto") return "sobre-contacto";
  if(/^\/(provincia|rankings)(\/[\w-]+)?$/.test(p)) return "__static";
  if((m=p.match(/^\/comparar(?:\/(\d{5})?(?:-(\d{5}))?)?$/))) return "comparar"+(m[1]?"-"+m[1]:"")+(m[2]?"-"+m[2]:"");
  return "__404";
}
function navTo(key,{replace=false}={}){
  const path=keyToPath(key), cur=location.pathname+location.search;
  try{ if(path!==cur) history[replace?"replaceState":"pushState"](null,"",path); }catch(e){}
  route();
}
const ROUTE_KEY=/^(m\d{5}|estudios|explorar|temas|preguntas|municipio|sobre|comparar|relaciones|cruces|evolucion|riqueza|renta|vivienda|poblacion|trabajo|gasto|voto|inicio)/;
function urlInit(){
  // enlaces antiguos (#estudios-x, #m46166…) siguen funcionando: pasan a la ruta nueva
  const h=(location.hash||"").slice(1);
  if(h&&(h===""||ROUTE_KEY.test(h))&&(location.pathname==="/"||/\/index\.html$/.test(location.pathname))){ try{ history.replaceState(null,"",keyToPath(h)); }catch(e){} }
  document.addEventListener("click",e=>{
    const a=e.target.closest("a[href]"); if(!a||e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey) return;
    if(a.target==="_blank"||a.hasAttribute("download")||a.origin!==location.origin) return;
    const href=a.getAttribute("href")||"";
    if(href.startsWith("#")){ const k=href.slice(1); if(k===""){ e.preventDefault(); return; } if(!ROUTE_KEY.test(k)) return; e.preventDefault(); navTo(k); return; }
    if(/^\/(data|og|provincia|rankings)(\/|$)/.test(href)||/\.(json|png|jpg|csv|svg|pdf|xml|txt|webmanifest)(\?|$)/.test(href)) return;
    if(href.startsWith("/")){ e.preventDefault(); navTo(href); }
  });
  // los enlaces #antiguos que generan las plantillas pasan a ruta real (también para el HTML pre-renderizado)
  const fix=root=>root.querySelectorAll('a[href^="#"]').forEach(a=>{ const k=a.getAttribute("href").slice(1); if(k==="inicio"||ROUTE_KEY.test(k)) a.setAttribute("href",keyToPath(k)); });
  new MutationObserver(()=>fix(view)).observe(view,{childList:true,subtree:true});
  fix(document);
}
function render404(){ document.title="Página no encontrada · Indicio"; view.innerHTML=pageHead("No encontramos esa página","Puede que el enlace sea antiguo. Prueba desde la portada o busca tu municipio arriba.")+`<p><a class="ed-go" href="/">Ir a la portada →</a></p>`; }

// ---------- rutas ----------
let lastMun=null; try{ const lm=localStorage.getItem("cifrario.mun"); if(lm&&/^\d{5}$/.test(lm)) lastMun=lm; }catch(e){}
function route(){
  const h=pathToKey();
  // bloques estáticos de las fichas (preguntas frecuentes, municipios cercanos): solo en la página para la que se generaron
  document.querySelectorAll(".seo-extra").forEach(e=>{ e.hidden=!(h===e.dataset.key||h.startsWith(e.dataset.key+"-")); });
  if(h==="__static"){ const e=document.getElementById("nav-municipio"); if(e) e.setAttribute("aria-current","page"); return; }   // páginas solo estáticas (provincias, rankings): el HTML ya trae todo
  const m=h.match(/^m(\d{5})(?:-([a-z]+))?$/), rt=h.match(/^(?:renta|riqueza)(?:-(\d{5}))?$/), cr=h.match(/^(?:cruces|relaciones)(?:-([a-zA-Z0-9]+)-([a-zA-Z0-9]+))?$/);
  document.querySelectorAll(".nav a,.nav .ddb").forEach(a=>a.removeAttribute("aria-current")); ddClose();
  // cuatro entradas: «Análisis» (preguntas y temas), «Municipios» (fichas, comparar, provincias, rankings), el laboratorio y quién soy
  const cur=id=>{ id=({temas:"preguntas"})[id]||id; const e=document.getElementById("nav-"+id); if(e) e.setAttribute("aria-current","page"); };
  if(INIT_T){ clearInterval(INIT_T); INIT_T=null; } if(typeof QH_T!=="undefined"&&QH_T){ clearInterval(QH_T); QH_T=null; } if(typeof QSPOT_T!=="undefined"&&QSPOT_T){ clearInterval(QSPOT_T); QSPOT_T=null; }
  if(m && BYCODE.has(m[1])){ cur("municipio"); EXF={prov:"",min:0,max:Infinity}; if(!myOk(lastMun)){ setMyMun(m[1],{silent:true}); setTimeout(()=>{ const t=toast(`📍 Hemos guardado <b>${esc(myName(m[1]))}</b> como tu municipio: lo verás destacado en temas y gráficos. <button type="button" id="tchg">Cambiar</button>`,4500); const c=document.getElementById("tchg"); if(c) c.addEventListener("click",()=>{ t.remove(); myPop(); }); },600); } renderMun(m[1], m[2]); return; }
  if(/^explorar/.test(h)){ cur("lab"); const same=document.querySelector(".lb"); renderExplorar(h); if(!same) window.scrollTo(0,0); return; }
  EXF={prov:"",min:0,max:Infinity};
  curMun=null; window.scrollTo(0,0); esMap=null;
  const topic=(id,fn)=>{ cur("temas"); Promise.resolve(fn()).then(()=>{ try{ topicDecorate(id); }catch(e){ console.error(e); } }); };
  if(rt) topic("riqueza",()=>renderRiqueza(rt[1]));
  else if(h==="vivienda") topic("vivienda",renderVivienda);
  else if(h==="poblacion") topic("poblacion",renderPoblacion);
  else if(h==="trabajo") topic("trabajo",renderTrabajo);
  else if(h==="gasto") topic("gasto",renderGasto);
  else if(h==="voto") topic("voto",renderVoto);
  else if(h==="temas"){ cur("temas"); renderTemas(); }
  else if(h==="preguntas"){ cur("preguntas"); renderPreguntas(); }
  else if(h==="municipio"){ cur("municipio"); renderMunLanding(); }
  else if(/^sobre/.test(h)){ cur("sobre"); renderSobre(h==="sobre-contacto"?"contacto":null); }
  else if(cr){ navTo(exHash({v:"cruce",d:cr[1]&&cr[2]?[cr[1],cr[2]]:EX.d}),{replace:true}); return; }
  else if(h==="laboratorio-datos"){ cur("lab"); renderGlosario(); }
  else if(/^estudios?/.test(h)){ cur(h==="estudios-metodo"?"lab":"preguntas"); renderEstudios((h.match(/^estudios?-([\w-]+)$/)||[])[1]); }
  else if(/^evolucion/.test(h)){ navTo(exHash({v:"evolucion"}),{replace:true}); return; }
  else if(/^comparar/.test(h)){ cur("municipio"); const c=h.match(/^comparar(?:-(\d{5}))?(?:-(\d{5}))?$/)||[]; renderComparar(c[1],c[2]); }
  else if(h==="__404") render404();
  else renderInicio();
}
let INIT_T=null;
const saveMun=()=>{ try{ localStorage.setItem("cifrario.mun",lastMun); }catch(e){} };
// menús desplegables (Análisis y Municipios): al pasar por encima (o con la flecha, en táctil) se abre su panel
const TOP=document.getElementById("top");
const DDS=[...document.querySelectorAll(".navdd")].map(dd=>({dd, btn:dd.querySelector(".ddb"), mega:document.getElementById(dd.dataset.mega)})).filter(x=>x.btn&&x.mega);
let MEGA_T=null;
function megaOpen(x){ clearTimeout(MEGA_T); if(!TOP) return; DDS.forEach(y=>{ const on=y===x; y.mega.classList.toggle("on",on); y.btn.setAttribute("aria-expanded",on?"true":"false"); }); TOP.classList.add("mega-open"); }
function ddClose(){ clearTimeout(MEGA_T); if(!TOP) return; TOP.classList.remove("mega-open"); DDS.forEach(y=>{ y.mega.classList.remove("on"); y.btn.setAttribute("aria-expanded","false"); }); const r=document.getElementById("mq-r"); if(r) r.hidden=true; }
const megaSoon=()=>{ clearTimeout(MEGA_T); MEGA_T=setTimeout(ddClose,180); };
if(DDS.length){
  const HOVER=!!(window.matchMedia&&matchMedia("(hover:hover)").matches);
  DDS.forEach(x=>{
    // con ratón, el panel ya se abre al pasar por encima: el clic en la flecha lo deja abierto; en táctil alterna
    x.btn.addEventListener("click",e=>{ e.stopPropagation(); (HOVER||!x.mega.classList.contains("on"))?megaOpen(x):ddClose(); });
    if(HOVER){ [x.dd,x.mega].forEach(el=>{ el.addEventListener("mouseenter",()=>megaOpen(x)); el.addEventListener("mouseleave",megaSoon); }); }
    x.mega.addEventListener("click",e=>{ if(e.target.closest("a")) ddClose(); });
  });
  document.addEventListener("click",e=>{ if(TOP.classList.contains("mega-open")&&!DDS.some(x=>x.mega.contains(e.target)||x.dd.contains(e.target))) ddClose(); });
  document.addEventListener("keydown",e=>{ if(e.key==="Escape") ddClose(); });
}
const go=(code,sec)=>{ navTo("m"+code+(sec?"-"+sec:"")); };

// ---------- buscador (cabecera y portada) ----------
function attachSearch(input,list,combo,onPick){
  let hits=[], hi=-1;
  const close=()=>{ list.hidden=true; combo.setAttribute("aria-expanded","false"); };
  const pick=r=>{ input.value=""; close(); input.blur(); if(onPick){ onPick(r); return; } go(r[F.code]); window.scrollTo(0,0); };
  const render=()=>{
    list.innerHTML=hits.length?hits.map((r,i)=>`<li role="option" id="${input.id}-o${i}" aria-selected="${i===hi}" data-i="${i}"><span>${esc(r[F.name])}</span><small>${esc(provShort(PROVS[r[F.prov]]))}${r[F.pop]!=null?", "+nf0.format(r[F.pop])+" hab.":""}</small></li>`).join(""):`<li aria-disabled="true"><span>No hay ningún municipio con ese nombre</span></li>`;
    list.hidden=false; combo.setAttribute("aria-expanded","true"); input.setAttribute("aria-activedescendant",hi>=0?`${input.id}-o${hi}`:"");
    list.querySelectorAll("li[data-i]").forEach(li=>li.addEventListener("mousedown",ev=>{ev.preventDefault(); pick(hits[+li.dataset.i]);}));
  };
  input.addEventListener("input",()=>{ const s=norm(input.value); if(s.length<2){close();return;}
    const out=[]; for(const o of IDX){ const i=o.key.indexOf(s); if(i<0) continue; out.push([(i===0?0:(o.key[i-1]===" "?1:2))*1e9-(o.row[F.pop]||0),o.row]); }
    out.sort((a,b)=>a[0]-b[0]); hits=out.slice(0,12).map(x=>x[1]); hi=hits.length?0:-1; render(); });
  input.addEventListener("keydown",e=>{ if(list.hidden) return;
    if(e.key==="ArrowDown"){hi=Math.min(hits.length-1,hi+1);render();e.preventDefault();}
    else if(e.key==="ArrowUp"){hi=Math.max(0,hi-1);render();e.preventDefault();}
    else if(e.key==="Enter"&&hi>=0){pick(hits[hi]);e.preventDefault();}
    else if(e.key==="Escape"){close();} });
  document.addEventListener("click",e=>{ if(!combo.contains(e.target)) close(); });
}
if(document.getElementById("mq")) attachSearch(document.getElementById("mq"),document.getElementById("mq-r"),document.getElementById("mq-s"));

// ---------- geometría ----------
const fixPoly=pl=>pl.forEach((ring,i)=>{ const big=d3.geoArea({type:"Polygon",coordinates:[ring]})>2*Math.PI; if((i===0&&big)||(i>0&&!big)) ring.reverse(); });
const rewind=f=>{ const g=f.geometry; if(g&&d3.geoArea(f)>2*Math.PI){ if(g.type==="Polygon") fixPoly(g.coordinates); else if(g.type==="MultiPolygon") g.coordinates.forEach(fixPoly); } return f; };
function prepGeo(){ FEATS=topojson.feature(TOPO,TOPO.objects.municipalities).features.map(rewind); }

// ---------- piezas de página ----------
const LABNAV=cur=>cur==="datos"?`<nav class="crumbs" aria-label="Ruta"><a href="/laboratorio/">Laboratorio</a> › Qué significa cada dato</nav>`:cur==="metodo"?`<nav class="crumbs" aria-label="Ruta"><a href="/laboratorio/">Laboratorio</a> › Guía: de la relación a la causa</nav>`:"";
function pageHead(title,dek,extra,after){ return `<header class="phead">${extra||""}<h1>${title}</h1>${dek?`<p class="dek">${dek}</p>`:""}${after||""}</header>`; }
const TOPICL=id=>({riqueza:"Riqueza",vivienda:"Vivienda",poblacion:"Población",trabajo:"Trabajo",gasto:"Dinero público",voto:"Voto"})[id]||"";
const fechaES=d=>{ if(!d) return ""; const [y,m,dd]=d.split("-"); return `${+dd} de ${MES[+m]} de ${y}`; };
const byline=S=>`<span class="by-who">Por <a href="/quien-soy/">${esc((window.__INDICIO&&window.__INDICIO.site&&window.__INDICIO.site.author.name)||"Indicio")}</a></span> · <time datetime="${S.pub||""}">${fechaES(S.pub)}</time>${S.upd&&S.upd!==S.pub?` · <span class="by-upd">Revisado el ${fechaES(S.upd)}</span>`:""} · <span class="by-m">${esc(S.m)}</span>${S.ev&&window.__INDICIO&&window.__INDICIO.evidence?` · <a class="ev ev-${S.ev}" href="/laboratorio/metodo/#evidencia" title="${esc(window.__INDICIO.evidence[S.ev].d)}">${esc(window.__INDICIO.evidence[S.ev].l)}</a>`:""}`;
function finding(parent,title,text){ const s=add(parent,"section","finding"); if(title) add(s,"h2",null,title); if(text) add(s,"div","txt",text); return s; }
function fig(parent,{title,sub,source}={}){ const f=add(parent,"figure"); if(title) add(f,"div","ct",title); if(sub) add(f,"div","cs",sub); const body=add(f,"div"); if(source){ const c=add(f,"figcaption",null,source); f._cap=c; } f.body=body; return f; }
// burbuja de ayuda: la comparten el glosario de los textos y los iconos «i» de las tablas de datos.
// Se abre al pasar el ratón, al tabular y al pulsar (en el móvil no hay ratón), y se cierra al pulsar fuera.
let TIP=null;
const tipHide=()=>{ if(TIP){ TIP.remove(); TIP=null; } };
function tipShow(anchor,html){ tipHide(); TIP=el("div","gtip",html); document.body.appendChild(TIP);
  const r=anchor.getBoundingClientRect();
  TIP.style.left=Math.max(8,Math.min(window.innerWidth-TIP.offsetWidth-8,r.left+window.scrollX))+"px";
  TIP.style.top=(r.bottom+window.scrollY+6)+"px"; }
// el clic siempre abre (si cerrara, al pulsar en el ordenador cerraría la que acaba de abrir el ratón);
// se cierra al pulsar fuera, al salir con el ratón o con Escape
function tipBind(nodes,html){ nodes.forEach(g=>{ const show=()=>tipShow(g,html(g));
  g.addEventListener("mouseenter",show); g.addEventListener("focus",show);
  g.addEventListener("mouseleave",tipHide); g.addEventListener("blur",tipHide);
  g.addEventListener("click",e=>{ e.preventDefault(); e.stopPropagation(); show(); }); }); }
document.addEventListener("click",tipHide);
document.addEventListener("keydown",e=>{ if(e.key==="Escape") tipHide(); });

// Fuentes: cada estudio lista solo las que usa (methodNote(["atlas","padron"])); sin argumento, todas
const SRC={
  atlas:`INE: Atlas de Distribución de Renta de los Hogares 2015–2024 (los años 2015–2023 a través del proyecto abierto <a href="https://github.com/pablogguz/ineAtlas.data" target="_blank" rel="noopener">ineAtlas.data</a>)`,
  padron:"INE: padrón municipal 1996–2025", censo:"INE: Censo de Población y Viviendas 2021 y censos anuales de población 2021–2025", mig:"INE: Estadística de Migraciones y Cambios de Residencia 2021–2024",
  ipva:"INE: Índice de Precios de Vivienda en Alquiler (alquileres declarados a Hacienda), por municipio y, por antigüedad del contrato, por provincia", vt:"INE: medición de viviendas turísticas (agosto de 2020 a mayo de 2026)",
  salarios:"INE: Encuesta de Estructura Salarial", ipc:"INE: IPC", sepe:"SEPE: paro registrado por municipio, 2015–septiembre de 2026", interior:"Ministerio del Interior: generales de 2019 y 2023, municipales de 2019 y 2023 y europeas de 2024",
  idealista:"idealista: precio medio de los anuncios de alquiler", eurostat:"Eurostat: cuentas públicas, pensiones y proyecciones de población", hicp:"Eurostat: índice de precios de consumo armonizado mensual por grupos de alimentos (prc_hicp_midx), 2021–2025, España, Portugal, Francia, Italia y Alemania",
  tensionadas:"BOE: resoluciones de 14 de marzo y 8 de octubre de 2024 con los municipios catalanes declarados zona de mercado residencial tensionado", erte:"Seguridad Social: trabajadores en ERTE por provincia a 30 de abril de 2020 (nota de afiliación de abril de 2020)",
  ave:"Adif, Renfe y prensa: estaciones con servicio de alta velocidad abierto entre 2021 y 2023 (lista en el repositorio)", vut:"Boletines oficiales y prensa: municipios con moratoria o prohibición de nuevas viviendas turísticas, con fecha (lista en el repositorio)",
  geo:"Distancias a la ciudad más próxima y a la costa calculadas en Indicio en línea recta sobre la cartografía del IGN",
  ipcAlim:"INE: Índice de Precios de Consumo por comunidades (general y grupos, desde 2002) y por subclases", eurostatPaises:"Eurostat (cuentas nacionales, EPA europea, cuentas públicas e IPCA, desde 1995) y Banco Mundial (indicadores de desarrollo, antes de 1995)", ipv:"INE: Índice de Precios de Vivienda, por comunidad", mivauViv:"Ministerio de Vivienda: valor tasado de la vivienda libre, viviendas libres iniciadas y terminadas, viviendas protegidas", ecvTen:"INE: Encuesta de Condiciones de Vida, hogares por régimen de tenencia y renta", eurostatViv:"Eurostat: precios de la vivienda, sobrecarga del gasto en vivienda, emancipación, inversión en vivienda y hogares", ees:"INE: Encuesta Anual de Estructura Salarial (percentiles de la ganancia anual y tramos de salario mínimo)", epaSal:"INE: EPA, salarios del empleo principal por deciles (con datos fiscales)", ecvRenta:"INE: Encuesta de Condiciones de Vida, deciles de renta por unidad de consumo", etcl:"INE: Encuesta Trimestral de Coste Laboral, coste salarial por trabajador y mes, por comunidades",
  deuda:"Ministerio de Hacienda: deuda viva de cada ayuntamiento a 31 de diciembre, 2015–2025 (sin 2017)", contratos:"SEPE: contratos iniciales indefinidos y temporales por municipio y mes (2005–2026) y paro registrado por municipio", afil:"Seguridad Social: afiliados por municipio, régimen y actividad, diciembre de 2011 a 2025", compr:"Ministerio de Vivienda: compraventas de vivienda por municipio y trimestre (notarios), 2004–2026",
  mivau:"Ministerio de Vivienda: viviendas protegidas con calificación definitiva (planes estatales y autonómicos, 1991–2025), viviendas libres iniciadas (1991–2025) y transacciones de vivienda de los notarios (2004–2025)"
};
function methodNote(keys){
  const ks=keys||Object.keys(SRC).filter(k=>!["tensionadas","erte","ave","vut","eurostat"].includes(k));
  return `<footer class="method">
    <details class="srcs"><summary>De dónde salen los datos</summary><p>${ks.map(k=>SRC[k]).join(". ")}.</p></details>
    <p><b>Cómo leerlos.</b> La renta sale de las declaraciones de la renta y no incluye la economía sumergida. Salvo que se indique «descontando la inflación», los euros son de cada año. Las cifras de provincia y de España son medias de sus municipios ponderadas por población. En los municipios muy pequeños el INE no publica todos los datos. El cálculo exacto detrás de cada etiqueta («a igual edad», «entre iguales», «explica») está en <a href="/laboratorio/metodo/">la guía del método</a>, y el código en <a href="https://github.com/bburriel/indicio.es" target="_blank" rel="noopener">GitHub</a>.</p>
  </footer>`;
}

// ---------- gráfico de líneas con etiquetas al final de cada línea ----------
// Mide de verdad lo que ocupa el texto más largo de un eje o de un rótulo, para reservarle
// exactamente ese margen. Si el navegador aún no puede medir (fuentes sin cargar), estima por letras.
function txtW(svg,fmt,vals,cls,size){
  const g=svg.append("g").attr("visibility","hidden"); let mx=0;
  for(const v of vals){ const t=g.append("text").attr("class",cls).text(fmt(v)); if(size) t.style("font-size",size); let w=0;
    try{ w=t.node().getComputedTextLength(); }catch(e){ w=0; }
    if(!w) w=String(fmt(v)).length*(cls==="dl"?6.6:6.2);
    if(w>mx) mx=w; }
  g.remove(); return mx;
}
function lineChart(parent,{title,sub,source,series,fmt,tickFmt,index,years,xticks,height}){
  const YRS=years||YEARS;
  const f=fig(parent,{title,sub,source});
  const base=a=>{ let v0=null; for(const v of a){ if(v!=null){ v0=v; break; } } return a.map(v=>v==null||!v0?null:v/v0*100); };
  const ser=series.filter(s=>s.v&&s.v.some(x=>x!=null)).map(s=>({...s,raw:s.v,v:index?base(s.v):s.v}));
  const W=Math.max(280,Math.round(f.clientWidth||parent.clientWidth||520)), labW=Math.min(130,Math.max(70,W*0.2)), H=height||Math.round(Math.min(260,Math.max(170,W*0.42))), m={t:10,r:labW,b:22,l:40};
  const svg=d3.select(f.body).append("svg").attr("viewBox",`0 0 ${W} ${H}`).attr("role","img").attr("aria-label",title||"Gráfico de líneas");
  const all=ser.flatMap(s=>s.v).filter(v=>v!=null);
  if(!all.length){ svg.attr("viewBox",`0 0 ${W} 40`).append("text").attr("class","lab").attr("x",0).attr("y",24).text("Sin datos publicados"); return f; }
  let [lo,hi]=d3.extent(all); const pad=(hi-lo)*0.12||Math.abs(hi)*0.05||1; const nonneg=lo>=0; lo-=pad; hi+=pad; if(nonneg&&!index) lo=Math.max(0,lo); if(index){lo=Math.min(lo,98);hi=Math.max(hi,102);}
  // márgenes a la medida del texto: así el dibujo empieza y acaba justo en los bordes,
  // sin huecos de sobra a la derecha ni rótulos que se salgan por la izquierda
  m.l=Math.max(24,Math.ceil(txtW(svg,(tickFmt||(v=>nf0.format(v))),d3.scaleLinear().domain([lo,hi]).nice(4).ticks(4),"axis"))+6);
  const mcw=W<480?12:19, nms=ser.map(s=>s.n.length>mcw?s.n.slice(0,mcw-1)+"…":s.n);
  m.r=Math.max(26,Math.min(labW*1.6,Math.ceil(txtW(svg,String,nms,"dl"))+7));
  const x=d3.scalePoint().domain(YRS).range([m.l,W-m.r]), y=d3.scaleLinear().domain([lo,hi]).nice(4).range([H-m.b,m.t]);
  const tf=tickFmt||(v=>nf0.format(v));
  svg.append("g").attr("class","grid").selectAll("line").data(y.ticks(4)).join("line").attr("x1",m.l).attr("x2",W).attr("y1",y).attr("y2",y);
  svg.append("g").attr("class","axis").selectAll("text").data(y.ticks(4)).join("text").attr("x",m.l-6).attr("y",v=>y(v)+4).attr("text-anchor","end").text(tf);
  svg.append("g").attr("class","axis").selectAll("text").data(xticks||[YRS[0],YRS[Math.floor((YRS.length-1)/2)],YRS[YRS.length-1]]).join("text").attr("x",x).attr("y",H-5).attr("text-anchor","middle").text(String);
  const line=d3.line().defined(v=>v!=null).x((v,i)=>x(YRS[i])).y(v=>y(v)).curve(d3.curveMonotoneX);
  for(const s of [...ser].reverse()) svg.append("path").attr("d",line(s.v)).attr("fill","none").attr("stroke",css(s.c)).attr("stroke-width",s.main?2.8:1.8).attr("stroke-linecap","round").attr("stroke-dasharray",s.dash?"4 3":null);
  // etiquetas directas al final de cada línea, separadas para que no se pisen
  const ends=ser.map(s=>{ const li=s.v.map((v,i)=>v!=null?i:-1).filter(i=>i>=0).pop(); return {s,li,y:y(s.v[li]),x:x(YRS[li])}; }).sort((a,b)=>a.y-b.y);
  for(let i=1;i<ends.length;i++){ if(ends[i].y-ends[i-1].y<14) ends[i].y=ends[i-1].y+14; }
  ends.forEach(e=>{ svg.append("circle").attr("cx",e.x).attr("cy",y(e.s.v[e.li])).attr("r",e.s.main?3.6:2.6).attr("fill",css(e.s.c));
    const t=svg.append("text").attr("class","dl").attr("x",e.x+7).attr("y",e.y+4).attr("fill",css(e.s.c));
    const nm=nms[ser.indexOf(e.s)]; t.text(nm); if(nm!==e.s.n) t.append("title").text(e.s.n); });
  const cross=svg.append("line").attr("y1",m.t).attr("y2",H-m.b).attr("stroke",css("--muted")).attr("stroke-dasharray","2 3").attr("opacity",0), dots=svg.append("g");
  const tip=el("div","ctip"); tip.hidden=true; f.appendChild(tip);
  const fv=(s,i)=> index ? (s.v[i]==null?"—":(s.raw[i]!=null&&s.showRaw?nf0.format(s.raw[i])+" · ":"")+sgn(s.v[i]-100)) : (s.v[i]==null?"—":(fmt?fmt(s.v[i]):nf1.format(s.v[i]))+(s.rawTxt&&s.rawTxt[i]?` <span class="muted">(${s.rawTxt[i]})</span>`:""));
  function show(i){ const X=x(YRS[i]); cross.attr("x1",X).attr("x2",X).attr("opacity",1);
    dots.selectAll("circle").data(ser.filter(s=>s.v[i]!=null)).join("circle").attr("cx",X).attr("cy",s=>y(s.v[i])).attr("r",4).attr("fill",s=>css(s.c)).attr("stroke",css("--bg")).attr("stroke-width",2);
    tip.innerHTML=`<div class="y">${YRS[i]}</div>`+ser.map(s=>`<div class="r"><span><i style="background:${css(s.c)}"></i>${esc(s.n)}</span><b>${fv(s,i)}</b></div>`).join("")+(index?`<div class="r"><span>Cambio desde ${YRS[0]}</span></div>`:"");
    tip.hidden=false; const bb=f.getBoundingClientRect(), sv=svg.node().getBoundingClientRect(); const px=(X/W)*sv.width+(sv.left-bb.left);
    tip.style.top=(sv.top-bb.top+4)+"px"; tip.style.left=(px>bb.width/2?Math.max(4,px-tip.offsetWidth-12):Math.min(bb.width-tip.offsetWidth-4,px+12))+"px"; }
  svg.append("rect").attr("x",m.l).attr("y",0).attr("width",W-m.l-m.r).attr("height",H).attr("fill","transparent")
    .on("pointermove",ev=>{ const [mx]=d3.pointer(ev); let bi=0,bd=1e9; YRS.forEach((yy,i)=>{const dd=Math.abs(x(yy)-mx); if(dd<bd){bd=dd;bi=i;}}); show(bi); })
    .on("pointerleave",()=>{ cross.attr("opacity",0); dots.selectAll("circle").remove(); tip.hidden=true; });
  return f;
}
// ---------- euros de cada año o descontando la inflación (euros de 2024) ----------
const IPC=y=>REFS.ipc&&REFS.ipc[String(y)];
const deflate=(arr,years)=>{ const yy=years||YEARS, b=IPC(2024); return arr?arr.map((v,i)=>v==null||!IPC(yy[i])?null:v*b/IPC(yy[i])):arr; };
let REAL=false;
function realChart(parent,opts){
  // opts.series con euros (o índices de euros) y opts.years; añade un selector y redibuja
  const box=add(parent,"div","realbox");
  const ctl=add(box,"div","seg sm"); ctl.setAttribute("role","group"); ctl.setAttribute("aria-label","Euros");
  ctl.innerHTML=`<button type="button" data-r="0">Euros de cada año</button><button type="button" data-r="1">Descontando la inflación</button>`;
  const inner=add(box,"div");
  const draw=()=>{ inner.innerHTML=""; ctl.querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",(b.dataset.r==="1")===REAL));
    const ser=opts.series.map(s=>({...s,v:REAL&&!s.noDeflate?deflate(s.v,opts.years):s.v}));
    lineChart(inner,{...opts,series:ser,sub:(opts.sub?opts.sub+". ":"")+(REAL?"En euros de 2024: se descuenta la subida de precios (IPC)":"En euros de cada año, sin descontar la inflación")}); };
  ctl.querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{ REAL=b.dataset.r==="1"; document.querySelectorAll(".realbox").forEach(x=>x._draw&&x._draw()); }));
  box._draw=draw; draw(); return box;
}
const S3=(r,d,key)=>[{n:r[F.name],v:d.s[key],c:"--s-mun",main:true},{n:"Provincia",v:REFS.prov[r[F.prov]][key],c:"--s-prov"},{n:"España",v:REFS.es[key],c:"--s-es"}];

// barras horizontales: [{l, v, me}] con línea de referencia opcional
function hbars(parent,rows,{fmt,ref,refLabel,color,scroll,max,min,wide}={}){
  const f=fmt||(v=>nf1.format(v)); const vals=rows.map(r=>r.v).filter(v=>v!=null);
  const lo=min!=null?min:Math.min(0,d3.min(vals)), hi=max!=null?max:Math.max(0,d3.max(vals.concat(ref!=null?[ref]:[])));
  const w=add(parent,"div","hbars"+(scroll?" scroll":"")+(wide?" wide":""));
  w.innerHTML=rows.map(r=>{ const z=(0-lo)/(hi-lo)*100, p=(r.v-lo)/(hi-lo)*100;
    const left=Math.min(z,p), width=Math.max(0.6,Math.abs(p-z));
    return `<div class="hb${r.me?" me":""}"><span title="${esc(r.l)}">${esc(r.l)}</span><span class="t"><i style="left:${left}%;width:${width}%;background:${r.c?`var(${r.c})`:(color?`var(${color})`:(r.v<0?"var(--neg)":"var(--stone)"))}"></i>${ref!=null?`<b class="ref" style="left:${(ref-lo)/(hi-lo)*100}%" title="${esc(refLabel||"")}"></b>`:""}</span><em>${f(r.v)}</em></div>`; }).join("");
  return w;
}
function provRows(k){
  const fi=F[k];
  return [...d3.group(rowsAll(),r=>r[F.prov])].map(([p,rs])=>{ const s=rs.filter(r=>r[fi]!=null&&r[F.pop]); const w=d3.sum(s,r=>r[F.pop]); return {p,l:provShort(PROVS[p]),v:w?d3.sum(s,r=>r[fi]*r[F.pop])/w:null}; }).filter(x=>x.v!=null);
}

function stackBars(parent,{rows,cats,note}){
  const wrap=add(parent,"div","stack");
  const light=new Set(["--ramp-0","--ramp-1","--ramp-2","--stone","--mustard"]);
  wrap.innerHTML=`<div class="keys">${cats.map(c=>`<span><i class="sq" style="background:var(${c.c})"></i>${c.l}</span>`).join("")}</div>`+
    rows.map(rw=>{ const tot=d3.sum(cats,c=>rw.v[c.k]||0)||1; if(!cats.some(c=>rw.v[c.k]!=null)) return `<div class="row${rw.me?" me":""}"><span>${esc(rw.l)}</span><span class="muted">Sin dato</span></div>`;
      return `<div class="row${rw.me?" me":""}"><span title="${esc(rw.l)}">${esc(rw.l)}</span><div class="bar" role="img" aria-label="${esc(rw.l)}: ${cats.map(c=>c.l+" "+pc(rw.v[c.k])).join(", ")}">${cats.map(c=>{ const v=rw.v[c.k]||0, w=v/tot*100; return w>0?`<i class="${light.has(c.c)?"lt":""}" style="flex:${w};background:var(${c.c})" title="${c.l}: ${pc(v)}">${w>=9?nf0.format(v):""}</i>`:""; }).join("")}</div></div>`; }).join("")+
    (note?`<figcaption>${note}</figcaption>`:"");
  return wrap;
}
function cmpRows(parent,name,rows,src,fmt){
  const f=fmt||pc; const c=src.m, cp=src.p, ce=src.e;
  const max=Math.max(...rows.flatMap(([k])=>[c[k],cp[k],ce[k]]).filter(v=>v!=null),1);
  const w=add(parent,"div","cmp");
  w.innerHTML=`<div class="keys"><span><i style="background:var(--s-mun)"></i>${esc(name)}</span><span><i style="background:var(--s-prov)"></i>Provincia</span><span><i style="background:var(--s-es)"></i>España</span></div>`+
   rows.map(([k,lab,sub])=>`<div class="cmp-row"><div class="n">${lab}${sub?`<small>${sub}</small>`:""}</div><div class="bars">${[[c[k],"--s-mun",name],[cp[k],"--s-prov","Provincia"],[ce[k],"--s-es","España"]].map(([v,col,who])=>`<div class="b" title="${esc(who)}: ${f(v)}"><span style="width:${v==null?0:Math.max(1,v/max*100)}%;background:var(${col})"></span><em>${f(v)}</em></div>`).join("")}</div></div>`).join("");
  return w;
}
function cenSrc(r,d){ return {m:d.census||{}, p:REFS.census.prov[r[F.prov]]||{}, e:REFS.census.es}; }
function lastSrc(r,d,keys){ const o={m:{},p:{},e:{}}; const P=r[F.prov]; keys.forEach(k=>{ o.m[k]=last(d.s[k])[0]; o.p[k]=last(REFS.prov[P][k])[0]; o.e[k]=last(REFS.es[k])[0]; }); return o; }
function topList(parent,k,{title,minPop=5000,n=8,asc=false,link}){
  const fi=F[k], f=fmtK(k);
  const pool=rowsAll().filter(r=>r[fi]!=null&&(r[F.pop]||0)>=minPop).sort((a,b)=>asc?a[fi]-b[fi]:b[fi]-a[fi]).slice(0,n);
  const d=add(parent,"div","lista");
  d.innerHTML=`<h3>${title}</h3><ol>${pool.map(r=>`<li><span><a href="#m${r[F.code]}${link?"-"+link:""}">${esc(r[F.name])}</a><small>${esc(provShort(PROVS[r[F.prov]]))}</small></span><span class="v">${f(r[fi])}</span></li>`).join("")}</ol>`;
  return d;
}
const munName=(code,fallback)=>BYCODE.has(code)?BYCODE.get(code)[F.name]:fallback;
const dispName=n=>n.split("/")[0];

// =====================================================================
// PORTADA
// =====================================================================
const MAPLAYERS=[
  ["varPob","div","Crecimiento de la población 2015–2025"],["renta","seq","Renta por persona, 2024"],["edad","seq","Edad media"],["extr","seq","Población extranjera"],
  ["pobreza","seq","Riesgo de pobreza"],["paro","seq","Paro (censo de 2021)"],["superiores","seq","Adultos con estudios superiores"],["alquiler","seq","Hogares de alquiler"],
  ["vt","seq","Viviendas turísticas"],["win23","cat","Partido más votado, julio de 2023"]];
let esMetric="varPob", esMap=null;
const EXPLAIN_RENTA=`<p><b>Qué es la renta neta por persona.</b> Lo que entra en un hogar en un año, después de pagar impuestos y cotizaciones, dividido entre todas las personas que viven en él, niños y jubilados incluidos. No es un sueldo: un hogar de cuatro personas con 60.000${NB}€ netos al año cuenta como 15.000${NB}€ por persona.</p>`;

async function renderSpain(){
  document.title="Indicio";
  const R=await loadRenta().catch(()=>null);
  const es=REFS.es, PY=REFS.padYears, pad=es.pad, i05=PY.indexOf(2005);
  const rows=rowsAll();
  view.innerHTML=pageHead("Cómo está España, contado con datos públicos",
    `Renta, vivienda, población, trabajo y voto de los ${nf0.format(rows.length)} municipios, con las estadísticas del INE, el SEPE y el Ministerio del Interior.`,"")+
    `<div class="doors">
      <div class="door"><span class="k">Consultar</span><h2>Mira tu municipio</h2><p>Cómo es, cómo ha cambiado y en qué destaca, comparado con España y con los municipios que más se le parecen.</p>
        <div class="search" id="bigsearch" role="combobox" aria-expanded="false" aria-haspopup="listbox" style="max-width:none;margin:4px 0 0;flex:none">
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.6"/><path d="M11 11l3.5 3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
        <input id="q2" type="search" placeholder="Escribe tu municipio: Meliana, Vigo, Teruel…" autocomplete="off" aria-label="Buscar un municipio" aria-autocomplete="list" aria-controls="results2" style="padding:11px 14px 11px 36px;font-size:17px">
        <ul id="results2" class="results" role="listbox" hidden></ul></div>
        <p style="font-size:14px">O lee los informes: <a href="/temas/riqueza/">Riqueza</a> · <a href="/temas/vivienda/">Vivienda</a> · <a href="/temas/poblacion/">Población</a> · <a href="/temas/trabajo/">Trabajo</a> · <a href="/temas/gasto/">Dinero público</a></p></div>
      <div class="door lab"><span class="k">Laboratorio</span><h2>Cruza datos y busca causas</h2><p>Elige tus propios datos, filtra municipios y míralos en mapa, tabla, cruce o evolución. Comprueba si una relación aguanta al comparar entre iguales, y lee estudios que explican el método paso a paso.</p>
        <a class="go" href="/laboratorio/">Entrar en el laboratorio</a>
        <div class="tools"><a href="/laboratorio/mapa/">Mapa</a><a href="/laboratorio/tabla/">Tabla</a><a href="/laboratorio/cruce/">Cruce</a><a href="/laboratorio/evolucion/">Evolución</a><a href="/preguntas/">Estudios</a></div></div>
    </div>
    <section class="finding" style="padding-top:22px"><h2>Algunas preguntas para empezar en el laboratorio</h2>
      <div class="homeq">${EXQ.map(([l,v,o],i)=>`<a href="#" data-q="${i}"><span>${EXVIEWS.find(x=>x[0]===v)[1]}</span><b>${l}</b></a>`).join("")}</div></section>
    <section class="finding" style="padding-bottom:0;border-bottom:0"><h2 style="font-size:clamp(26px,3vw,32px)">Lo que dicen los datos</h2></section>
    <div id="hall"></div>
    <section class="finding" id="mapa"></section>
    ${methodNote()}`;
  attachSearch(document.getElementById("q2"),document.getElementById("results2"),document.getElementById("bigsearch"));
  view.querySelectorAll(".homeq a").forEach(x=>x.addEventListener("click",ev=>{ ev.preventDefault(); const [l,v,o]=EXQ[+x.dataset.q]; EX={...EX,v,d:o.d||EX.d,t:o.t||"",p:"",c:o.c||[],gb:o.gb||EX.gb,o:o.o||null,sz:"",col:"",q:0,bv:0}; if(o.ser){ Object.assign(PS,{s:o.ser.slice(),idx:o.idx===0?0:1,b:o.b||null,desde:null,hasta:null,real:0}); } navTo(exHash()); }));
  const H=document.getElementById("hall");

  // 1. Riqueza por comunidades
  if(R){
    const cc=R.ccaa.filter(c=>!/Ceuta|Melilla/.test(c.n)), top=cc[0], bot=cc[cc.length-1];
    const s=add(H,"section","finding split");
    const t=add(s,"div","txt",`<h2>En ${top.n} se ingresa por persona un ${nf0.format((top.renta/bot.renta-1)*100)}${NB}% más que en ${bot.n}</h2>
      <p>La renta neta media va de <mark>${eur(bot.renta)}</mark> por persona y año en ${bot.n} a <mark>${eur(top.renta)}</mark> en ${top.n}. El mapa de la riqueza en España tiene una frontera clara entre el norte y Madrid, por un lado, y el sur y el Mediterráneo, por otro.</p>
      <p>Dentro de cada ciudad, la distancia entre barrios es todavía mayor.</p><p class="more"><a href="/temas/riqueza/">Cómo se reparte la riqueza</a></p>`);
    const g=add(s,"div");
    const f=fig(g,{title:"Renta neta media por persona, 2024",source:"La línea vertical marca la media de España. Fuente: INE, Atlas de Distribución de Renta de los Hogares."});
    hbars(f.body,cc.map(c=>({l:c.n,v:c.renta})),{fmt:eur,ref:es.net_income_pc[es.net_income_pc.length-1],refLabel:"España",color:"--brand",min:0});
  }
  // 2. Vivienda
  { const G=subidas();
    const s=add(H,"section","finding split");
    add(s,"div","txt",`<h2>Alquilar cuesta casi el doble que en 2015; los sueldos solo han seguido a los precios</h2>
      <p>El precio de los pisos que se anuncian para alquilar ha subido un <mark>${nf0.format(G.anuncios)}${NB}%</mark> entre 2015 y 2024. El salario mediano, un ${nf0.format(G.salMed)}${NB}%, prácticamente lo mismo que los precios (${nf0.format(G.ipc)}${NB}%): en poder de compra, el sueldo típico está casi igual que hace diez años.</p>
      <p>Quien lleva años en el mismo piso lo nota menos: el alquiler que se declara a Hacienda, con todos los contratos, ha subido un ${nf0.format(G.declarado)}${NB}%.</p>
      <p class="more"><a href="/temas/vivienda/">Qué pasa con la vivienda</a></p>`);
    const g=add(s,"div"); drawSubidas(g);
  }
  // 3. Población
  { const rws=rows.filter(r=>r[F.var0525]!=null), lose=rws.filter(r=>r[F.var0525]<0), share=lose.length/rws.length*100, gain=pad[pad.length-1]-pad[i05];
    const bands=[[0,500,"Menos de 500"],[500,2000,"500 a 2.000"],[2000,10000,"2.000 a 10.000"],[10000,50000,"10.000 a 50.000"],[50000,1e9,"Más de 50.000"]];
    const br=bands.map(([a,b,l])=>{ const s=rws.filter(r=>(r[F.pop]||0)>=a&&(r[F.pop]||0)<b); return {l:l+" hab.",v:s.filter(r=>r[F.var0525]<0).length/s.length*100,n:s.length}; });
    const s=add(H,"section","finding split");
    add(s,"div","txt",`<h2>${cap(deCadaDiez(share))} municipios tienen hoy menos vecinos que en 2005</h2>
      <p>España ha ganado <mark>${nf1.format(gain/1e6)} millones</mark> de habitantes en veinte años, pero el crecimiento se ha concentrado en las áreas urbanas, la costa y las islas. Entre los pueblos de menos de 500 habitantes, han perdido población <mark>${nf0.format(br[0].v)} de cada 100</mark>.</p>
      <p class="more"><a href="/temas/poblacion/">Quién llega y quién se va</a></p>`);
    const g=add(s,"div");
    const f=fig(g,{title:"Municipios que han perdido población desde 2005, según su tamaño",source:"Tamaño según la población de 2025. Fuente: INE, padrón municipal."});
    hbars(f.body,br,{fmt:pc0,color:"--slate",min:0,max:100});
  }
  // 4. Estudios y renta
  { const s=add(H,"section","finding split");
    const t=add(s,"div","txt",`<h2>Donde hay más titulados, hay más renta</h2>
      <p>De todos los datos que reúne Indicio, la relación más estrecha es la que une los estudios superiores con la renta: los municipios con más adultos con carrera o formación superior son, casi siempre, los de más ingresos.</p>
      <p>Que dos cosas vayan juntas no quiere decir que una cause la otra. En <a href="#relaciones">Relaciones</a> puedes cruzar cualquier par de datos y ver cuánto se parecen.</p>`);
    const g=add(s,"div");
    scatter(g,{x:"superiores",y:"renta",minPop:1000,height:300,compact:true,title:"Estudios superiores y renta por persona",source:"Municipios de 1.000 habitantes o más. Fuente: INE, Censo de 2021 y Atlas de Renta 2024."});
  }
  if(R){ const a=add(H,"div","aside"); a.innerHTML=EXPLAIN_RENTA; a.style.marginTop="8px"; }

  // mapa
  const M=document.getElementById("mapa");
  M.innerHTML=`<h2>Cómo cambia de un municipio a otro</h2>
    <div style="display:flex;gap:10px 16px;flex-wrap:wrap;align-items:center"><label class="fld" for="maplayer">Qué mostrar<select id="maplayer" class="sel">${MAPLAYERS.map(([k,,l])=>`<option value="${k}" ${k===esMetric?"selected":""}>${l}</option>`).join("")}</select></label></div>
    <div class="cols2" style="grid-template-columns:minmax(0,7fr) minmax(0,4fr)"><div><div class="mapbox" id="mapbox"><div class="maploading">Dibujando el mapa…</div></div><div class="legend" id="legend"></div></div><div id="maplists"></div></div>`;
  document.getElementById("maplayer").addEventListener("change",e=>{ esMetric=e.target.value; colorSpainMap(); mapLists(); });
  mapLists();
  loadTopo().then(()=>{ if(document.getElementById("mapbox")) drawSpainMap(); }).catch(()=>{ const mb=document.getElementById("mapbox"); if(mb) mb.innerHTML='<div class="maploading">No se pudo cargar el mapa.</div>'; });
}

function mapLists(){
  const box=document.getElementById("maplists"); if(!box) return; box.innerHTML="";
  const [k,kind]=MAPLAYERS.find(m=>m[0]===esMetric);
  if(kind==="cat"){
    const L=VREFS.elections.filter(e=>e.startsWith("02")).pop();
    const rows=Object.keys(PROVS).map(p=>{ const v=VREFS.prov[p]&&VREFS.prov[p][L]; if(!v) return null; const w=Object.entries(v.share).filter(([q])=>q!=="Otros").sort((a,b)=>b[1]-a[1])[0]; return {l:provShort(PROVS[p]),v:w[1],c:null,party:w[0]}; }).filter(Boolean).sort((a,b)=>b.v-a.v);
    add(box,"h3","sub","Partido más votado por provincia");
    const w=hbars(box,rows,{fmt:v=>nf1.format(v)+NB+"%",scroll:true,min:0});
    w.querySelectorAll(".hb").forEach((h,i)=>{ h.querySelector("i").style.background=pColor(rows[i].party); h.querySelector("em").textContent=rows[i].party+" "+nf0.format(rows[i].v); });
    return;
  }
  const g=add(box,"div"); g.style.display="flex"; g.style.flexDirection="column"; g.style.gap="20px";
  topList(g,k,{title:"Valores más altos",n:6}); topList(g,k,{title:"Valores más bajos",n:6,asc:true});
  add(box,"figcaption",null,"Solo municipios de 5.000 habitantes o más, para que los muy pequeños no copen las listas.");
}

function drawSpainMap(){
  const box=document.getElementById("mapbox"); box.innerHTML="";
  const W=640,H=520;
  const regions=topojson.feature(TOPO,TOPO.objects.autonomous_regions); regions.features.forEach(rewind);
  const proj=d3.geoConicConformalSpain().fitSize([W-10,H-10],regions);
  const path=d3.geoPath(proj);
  const svg=d3.select(box).append("svg").attr("viewBox",`0 0 ${W} ${H}`).attr("role","img").attr("aria-label","Mapa de municipios de España");
  const g=svg.append("g").attr("transform","translate(5,5)");
  const tip=el("div","maptip"); tip.hidden=true; box.appendChild(tip);
  const sel=g.append("g").selectAll("path").data(FEATS).join("path").attr("class","mun").attr("d",path)
    .on("pointermove",(ev,f)=>{ const r=BYCODE.get(f.id); const k=esMetric; const v=r?r[F[k]]:null;
      tip.innerHTML=`<b>${esc(r?r[F.name]:f.properties.name)}</b>: ${v==null?"sin dato":(k==="win23"?v:fmtK(k)(v))}`; tip.hidden=false;
      const bb=box.getBoundingClientRect(); tip.style.left=Math.max(tip.offsetWidth/2+4,Math.min(bb.width-tip.offsetWidth/2-4,ev.clientX-bb.left))+"px"; tip.style.top=(ev.clientY-bb.top)+"px"; })
    .on("pointerleave",()=>tip.hidden=true)
    .on("click",(ev,f)=>{ if(BYCODE.has(f.id)){ go(f.id); window.scrollTo(0,0);} });
  g.append("path").datum(topojson.mesh(TOPO,TOPO.objects.provinces,(a,b)=>a!==b)).attr("fill","none").attr("class","provline").attr("stroke-width",.6).attr("d",path);
  g.append("path").attr("d",proj.getCompositionBorders()).attr("fill","none").attr("class","provline2").attr("stroke-width",.8);
  esMap={svg,sel}; colorSpainMap();
}
function colorSpainMap(){
  if(!esMap||!document.body.contains(esMap.svg.node())) return;
  const [k,kind,label]=MAPLAYERS.find(m=>m[0]===esMetric), fi=F[k], lg=document.getElementById("legend");
  esMap.svg.selectAll(".provline").attr("stroke",css("--geo-line"));
  esMap.svg.selectAll(".provline2").attr("stroke",css("--muted"));
  const vals=rowsAll().map(r=>r[fi]).filter(v=>v!=null);
  if(kind==="cat"){
    const cnt=d3.rollups(vals,v=>v.length,d=>d).sort((a,b)=>b[1]-a[1]);
    esMap.sel.attr("fill",f=>{ const r=BYCODE.get(f.id); const v=r?r[fi]:null; return v==null?css("--nodata"):pColor(v); });
    lg.innerHTML=cnt.slice(0,9).map(([p,n])=>`<span class="sw"><i style="background:${pColor(p)}"></i>${esc(p)} <span class="muted">${nf0.format(n)}</span></span>`).join("")+`<span class="help">Partido más votado en cada municipio y número de municipios en los que ganó. Pulsa un municipio para abrir su ficha.</span>`;
    return;
  }
  const ramp=[0,1,2,3,4,5,6].map(i=>css("--ramp-"+i)), f=fmtK(k);
  let scale,stops,labels,help;
  if(kind==="seq"){ const qs=d3.scaleQuantile().domain(vals).range(ramp); scale=qs; stops=ramp; const th=qs.quantiles(); labels=[f(th[0]),f(th[th.length-1])]; help=`${label}. Siete grupos con el mismo número de municipios; en gris, sin dato. Pulsa un municipio para abrir su ficha.`; }
  else { const cols=[css("--div-neg"),css("--div-neg2"),css("--div-mid"),ramp[2],ramp[4],ramp[5]]; scale=d3.scaleThreshold().domain([-10,-3,3,10,20]).range(cols); stops=cols; labels=["Pierde más del 10 %","Gana más del 20 %"]; help="En azul, los municipios que pierden población; en ocre, los que ganan. Pulsa un municipio para abrir su ficha."; }
  esMap.sel.attr("fill",ft=>{ const r=BYCODE.get(ft.id); const v=r?r[fi]:null; return v==null?css("--nodata"):scale(v); });
  lg.innerHTML=`<span class="num">${labels[0]}</span><span class="bar">${stops.map(c=>`<i style="background:${c}"></i>`).join("")}</span><span class="num">${labels[1]}</span><span class="help">${help}</span>`;
}
new MutationObserver(()=>{ if(esMap) colorSpainMap(); }).observe(document.documentElement,{attributes:true,attributeFilter:["data-theme"]});
window.matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change",()=>{ if(esMap) colorSpainMap(); });

// =====================================================================
// RIQUEZA
// =====================================================================
let RENTA=null; const seccCache=new Map();
const loadRenta=()=>RENTA?Promise.resolve(RENTA):getJSON("/data/renta/resumen.json").then(r=>(RENTA=r));
const loadSecc=p=>{ if(!seccCache.has(p)) seccCache.set(p,getJSON("/data/secc/"+p+".json").then(t=>topojson.feature(t,t.objects[p]).features.map(rewind))); return seccCache.get(p); };
const ramp10=()=>d3.quantize(d3.interpolateRgbBasis([0,1,2,3,4,5,6].map(i=>css("--ramp-"+i))),10);
const decInk=i=>i<=4?css("--on-light"):css("--on-dark");
const decOf=(v,cuts)=>{ let i=0; while(i<cuts.length&&v>=cuts[i]) i++; return i; };
function decLegend(parent){
  const cols=ramp10(), d=add(parent,"div","declegend");
  d.innerHTML=`<span>Menos renta</span><span class="bar">${cols.map((c,i)=>`<i style="background:${c};color:${decInk(i)}">${i+1}</i>`).join("")}</span><span>Más renta</span>`;
  return d;
}

async function renderRiqueza(cityCode){
  document.title="Riqueza · Indicio";
  view.innerHTML='<p class="loading">Cargando…</p>';
  let R; try{ R=await loadRenta(); }catch(e){ view.innerHTML='<p class="loading">No se pudieron cargar los datos de renta.</p>'; return; }
  view.innerHTML=pageHead("¿Cómo se reparte la riqueza?",`La mitad de los españoles vive en un barrio donde la renta neta no llega a <mark>${eur(R.median)}</mark> por persona al año, unos ${eur(Math.round(R.medianHh/100)*100)} por hogar. Aquí están los ${nf0.format(R.n)} barrios de España, ordenados por lo que ingresan sus vecinos.`)+`<div id="body"></div>${methodNote()}`;
  const B=document.getElementById("body");
  const ex=add(B,"div","aside"); ex.style.marginTop="24px"; ex.innerHTML=EXPLAIN_RENTA+`<p>Los datos salen de las declaraciones de la renta de ${R.year} y se publican por <b>sección censal</b>, la unidad más pequeña del INE: zonas de entre 1.000 y 2.500 habitantes. Aquí las llamamos barrios.</p>`;

  // 1. histograma
  const s1=finding(B,`La mitad de la población vive en barrios con menos de ${eur(R.median)} por persona`,
    `<p>Cada barra reúne a la gente que vive en barrios con una renta parecida. La mayoría se concentra entre ${eur(R.cuts[0])} y ${eur(R.cuts[8])}; a partir de ahí la cola se alarga hacia unos pocos barrios muy ricos. Puedes verlo por persona o por hogar.</p>`);
  const ctl=add(s1,"div"); ctl.innerHTML=`<div class="seg" role="group" aria-label="Unidad"><button type="button" id="hp" aria-pressed="true">Por persona</button><button type="button" id="hh" aria-pressed="false">Por hogar</button></div>`;
  const hbox=add(s1,"div");
  const drawH=mode=>{ hbox.innerHTML=""; drawHist(hbox,R,mode); document.getElementById("hp").setAttribute("aria-pressed",mode==="p"); document.getElementById("hh").setAttribute("aria-pressed",mode==="h"); };
  document.getElementById("hp").onclick=()=>drawH("p"); document.getElementById("hh").onclick=()=>drawH("h"); drawH("p");

  // 2. comunidades
  const cc=R.ccaa;
  const s2=finding(B,"El norte y Madrid concentran los barrios ricos; el sur, los pobres",
    `<p>Cada fila reparte la población de una comunidad según el grupo de renta de su barrio. Los colores son los diez grupos de España, cada uno con el 10${NB}% de la población: en ${cc[0].n}, el ${pc0(cc[0].dec[9])} de la gente vive en barrios del grupo más rico; en Andalucía, el ${pc0(cc.find(c=>c.n==="Andalucía").dec[0])} vive en barrios del grupo más pobre.</p>`);
  decLegend(s2);
  const cols=ramp10(), w=add(s2,"div","ccaa");
  w.innerHTML=cc.map(c=>`<div class="row"><span>${esc(c.n)}</span><span class="bar" role="img" aria-label="${esc(c.n)}: ${pc(c.dec[0])} en el grupo más pobre y ${pc(c.dec[9])} en el más rico">${c.dec.map((v,i)=>v>0?`<i style="flex:${v};background:${cols[i]}" title="Grupo ${i+1}: ${pc(v)} de la población"></i>`:"").join("")}</span><em>${eur(c.renta)}</em></div>`).join("");
  add(s2,"figcaption",null,`A la derecha, la renta media por persona de cada comunidad. Ordenadas de más a menos renta. Fuente: INE, Atlas de Distribución de Renta, ${R.year}.`);

  // 3. ciudades
  const s3=finding(B,"Dentro de las grandes ciudades, unos barrios ingresan más del doble que otros",
    `<p>Cada raya es un barrio. La franja gris va del barrio del 10${NB}% más pobre de la ciudad al del 10${NB}% más rico, y la cifra de la derecha dice cuántas veces más ingresa uno que otro. De las 24 más pobladas, ${(c=>dispName(munName(c.code,c.name)))(R.cities.slice(0,24).reduce((m,c)=>c.ratio>m.ratio?c:m))} es la más desigual por dentro.</p>`);
  drawCities(s3,R);

  // 4. fronteras
  const s4=finding(B,"A veces basta con cruzar una calle",
    `<p>Estos son los barrios vecinos, que comparten límite, con más diferencia de renta entre sí.</p>`);
  drawFronteras(s4,R);
  add(s2,"p",null,exLink("grupos",{d:["renta","pobreza","gini"],gb:"ccaa"},"Compara comunidades con otros datos en el explorador"));

  // 5. explorador
  const s5=finding(B,"Tu ciudad, barrio a barrio",`<p>Elige una ciudad. Cada barrio toma el color de su grupo de renta en España. Pasa por encima para ver sus datos y acércate con la rueda o pellizcando.</p>`);
  s5.id="explorador";
  const def=cityCode&&BYCODE.has(cityCode)?cityCode:(lastMun&&BYCODE.has(lastMun)?lastMun:R.cities[0].code);
  seccExplorer(s5,def,{picker:true});
  if(cityCode) setTimeout(()=>s5.scrollIntoView(),50);

  // 6. relaciones
  const s6=finding(B,"Qué va con la renta",
    `<p>La renta de un municipio se parece mucho a su nivel de estudios y, en sentido contrario, a su riesgo de pobreza. En <a href="#relaciones-superiores-renta">Relaciones</a> puedes comprobarlo y cruzar la renta con cualquier otro dato: <a href="#relaciones-renta-pobreza">pobreza</a>, <a href="#relaciones-renta-part">participación electoral</a>, <a href="#relaciones-renta-pensiones">peso de las pensiones</a>.</p>`);
  panoExtra("riqueza",B);
}

function drawHist(parent,R,mode){
  const H0=mode==="h"?R.histHh:R.hist, cuts=mode==="h"?R.cutsHh:R.cuts, med=mode==="h"?R.medianHh:R.median, capV=mode==="h"?R.capHh:R.cap;
  const f=fig(parent,{title:mode==="h"?"Población según la renta neta media por hogar de su barrio":"Población según la renta neta media por persona de su barrio",
    source:`Tramos de ${mode==="h"?"2.500":"500"}${NB}€. El INE no publica cifras por encima de ${eur(capV)}${mode==="h"?" por hogar":" por persona"} ${mode==="h"?"":"ni por debajo de "+eur(R.floor)}: los barrios que pasan de ahí se acumulan en la última barra. Fuente: INE, Atlas de Distribución de Renta, ${R.year}.`});
  const W=Math.max(320,parent.clientWidth||900), H=Math.round(Math.min(340,Math.max(230,W*0.33))), m={t:44,r:14,b:26,l:46};
  const e=H0.edges, cnt=H0.pop, cols=ramp10();
  const x=d3.scaleLinear().domain([e[0],e[e.length-1]]).range([m.l,W-m.r]), y=d3.scaleLinear().domain([0,d3.max(cnt)]).nice(4).range([H-m.b,m.t]);
  const svg=d3.select(f.body).append("svg").attr("viewBox",`0 0 ${W} ${H}`).attr("role","img").attr("aria-label","Histograma de población por renta del barrio");
  const yf=v=>v>=1e6?nf1.format(v/1e6)+" M":nf0.format(v/1e3)+" mil";
  // margen izquierdo a la medida de las cifras del eje, y cuadrícula hasta el borde
  m.l=Math.max(m.l,Math.ceil(txtW(svg,v=>v?yf(v):"0",y.ticks(4),"axis"))+6); x.range([m.l,W-m.r]);
  svg.append("g").attr("class","grid").selectAll("line").data(y.ticks(4)).join("line").attr("x1",m.l).attr("x2",W).attr("y1",y).attr("y2",y);
  svg.append("g").attr("class","axis").selectAll("text").data(y.ticks(4)).join("text").attr("x",m.l-6).attr("y",v=>y(v)+4).attr("text-anchor","end").text(v=>v?yf(v):"0");
  svg.append("text").attr("class","lab").attr("x",m.l-6).attr("y",m.t-30).attr("text-anchor","end").text("Personas");
  svg.append("g").selectAll("rect").data(cnt).join("rect").attr("x",(c,i)=>x(e[i])+0.5).attr("width",(c,i)=>Math.max(0.5,x(e[i+1])-x(e[i])-1)).attr("y",c=>y(c)).attr("height",c=>y(0)-y(c)).attr("fill",(c,i)=>cols[decOf((e[i]+e[i+1])/2,cuts)])
    .append("title").text((c,i)=>`${eur(e[i])} a ${eur(e[i+1])}: ${nf0.format(c)} personas en ${nf0.format(H0.counts[i])} barrios`);
  const nar=W<600, step=(mode==="h"?20000:5000)*(nar?2:1), xt=d3.range(Math.ceil(e[0]/step)*step,e[e.length-1]+1,step);
  svg.append("g").attr("class","axis").selectAll("text").data(xt).join("text").attr("x",x).attr("y",H-7).attr("text-anchor","middle").text(v=>nf0.format(v/1000)+" mil €");
  const ann=[[cuts[0],nar?"10 %":"El 10 % con menos",-1],[med,(nar?"Mitad por debajo de ":"La mitad de la gente vive por debajo de ")+eur(med),0],[cuts[8],nar?"10 %":"El 10 % con más",1]];
  ann.forEach(([v,t,side])=>{ const X=x(v);
    svg.append("line").attr("x1",X).attr("x2",X).attr("y1",side===0?m.t-26:m.t-8).attr("y2",H-m.b).attr("stroke",css("--ink")).attr("stroke-width",side===0?1.4:1).attr("stroke-dasharray",side===0?null:"3 3");
    svg.append("text").attr("class","lab"+(side===0?" strong":"")).attr("x",side<0?X-5:X+5).attr("y",side===0?m.t-30:m.t-12).attr("text-anchor",side<0?"end":"start").text(side===0?t:nar?(side<0?"10 % más pobre":"10 % más rico"):`${t}: ${side<0?"menos de":"más de"} ${eur(v)}`); });
  return f;
}

function drawCities(parent,R){
  const cities=R.cities.slice(0,24), cols=ramp10(), cuts=R.cuts;
  const f=fig(parent,{source:`La línea vertical es la mediana de España. Escala logarítmica: cada salto del eje duplica la renta. Pulsa una ciudad para ver su mapa. Fuente: INE, Atlas de Distribución de Renta, ${R.year}.`});
  const W=Math.max(320,parent.clientWidth||900), narrow=W<600, rowH=26, m={t:22,r:narrow?44:64,b:6,l:narrow?96:150}, H=m.t+rowH*cities.length+m.b;
  const x=d3.scaleLog().domain([5000,60000]).range([m.l,W-m.r]).clamp(true);
  const svg=d3.select(f.body).append("svg").attr("viewBox",`0 0 ${W} ${H}`).attr("role","img").attr("aria-label","Renta de cada barrio en las grandes ciudades");
  // el margen izquierdo lo marca el nombre de ciudad más largo, para que ninguno se salga
  m.l=Math.max(m.l,Math.ceil(txtW(svg,c=>dispName(munName(c.code,c.name)),cities,"lab city","12.5px"))+10); x.range([m.l,W-m.r]);
  svg.append("g").attr("class","axis").selectAll("text").data([5000,10000,20000,40000]).join("text").attr("x",x).attr("y",12).attr("text-anchor","middle").text(v=>nf0.format(v/1000)+" mil €");
  svg.append("g").attr("class","grid").selectAll("line").data([5000,10000,20000,40000]).join("line").attr("x1",x).attr("x2",x).attr("y1",m.t-4).attr("y2",H-m.b);
  svg.append("line").attr("x1",x(R.median)).attr("x2",x(R.median)).attr("y1",m.t-4).attr("y2",H-m.b).attr("stroke",css("--ink")).attr("stroke-width",1);
  const g=svg.append("g").selectAll("g").data(cities).join("g").attr("class","citytip").attr("transform",(c,i)=>`translate(0,${m.t+i*rowH})`).on("click",(ev,c)=>{ navTo("riqueza-"+c.code); });
  g.append("rect").attr("x",0).attr("y",0).attr("width",W).attr("height",rowH).attr("fill","transparent");
  g.append("text").attr("class","lab city").attr("x",m.l-10).attr("y",rowH/2+4).attr("text-anchor","end").style("fill",css("--ink")).style("font-size","12.5px").text(c=>dispName(munName(c.code,c.name)));
  g.append("line").attr("x1",c=>x(c.p10)).attr("x2",c=>x(c.p90)).attr("y1",rowH/2).attr("y2",rowH/2).attr("stroke",css("--rule")).attr("stroke-width",10);
  g.each(function(c){ d3.select(this).selectAll("line.t").data(c.vals).join("line").attr("class","t").attr("x1",v=>x(v)).attr("x2",v=>x(v)).attr("y1",6).attr("y2",rowH-6).attr("stroke",v=>cols[decOf(v,cuts)]).attr("stroke-width",1.2).attr("opacity",.9); });
  g.append("text").attr("class","lab").attr("x",W-m.r+8).attr("y",rowH/2+4).style("fill",css("--ink")).text(c=>"×"+nf1.format(c.ratio));
  g.append("title").text(c=>`${munName(c.code,c.name)}: ${c.n} barrios, de ${eur(c.min)} a ${eur(c.max)} por persona. Pulsa para ver el mapa.`);
}

function drawFronteras(parent,R){
  const cols=ramp10(), cuts=R.cuts;
  const ul=add(parent,"ol","fronteras");
  ul.innerHTML=R.fronteras.map(f=>{ const same=f.rica.mun===f.pobre.mun;
    return `<li><span><a href="#riqueza-${f.pobre.mun}">${esc(munName(f.rica.mun,f.rica.name))}${same?"":" y "+esc(munName(f.pobre.mun,f.pobre.name))}</a></span><span class="pair"><i style="background:${cols[decOf(f.rica.renta,cuts)]}"></i>${eur(f.rica.renta)} <span class="muted">frente a</span> <i style="background:${cols[decOf(f.pobre.renta,cuts)]}"></i>${eur(f.pobre.renta)}</span><b class="x">×${nf1.format(f.ratio)}</b></li>`; }).join("");
  add(parent,"figcaption",null,`Renta neta por persona de cada barrio. El INE no publica cifras por debajo de ${eur(R.floor)}, así que algunos barrios pobres pueden ingresar aún menos. Hay además ${R.islas.rica} barrios ricos rodeados solo de barrios pobres, y ${R.islas.pobre} al revés: se pueden ver en el mapa de cada ciudad.`);
}

// ---------- explorador de barrios ----------
async function seccExplorer(parent,code,{picker}={}){
  const wrap=add(parent,"div");
  let R; try{ R=await loadRenta(); }catch(e){ return; }
  const tools=add(wrap,"div","secc-tools");
  const mode={hl:"none"}, uid=Math.random().toString(36).slice(2,7);
  if(picker){ const opts=[...new Set([code,...R.cities.map(c=>c.code)])].filter(c=>BYCODE.has(c)).sort((a,b)=>BYCODE.get(a)[F.name].localeCompare(BYCODE.get(b)[F.name],"es"));
    tools.innerHTML=`<label class="fld" for="secc-${uid}">Ciudad<select class="sel" id="secc-${uid}">${opts.map(c=>`<option value="${c}" ${c===code?"selected":""}>${esc(BYCODE.get(c)[F.name])}</option>`).join("")}</select></label>`; }
  tools.insertAdjacentHTML("beforeend",`<div class="seg" role="group" aria-label="Qué resaltar"><button type="button" data-h="none" aria-pressed="true">Grupos de renta</button><button type="button" data-h="ext" aria-pressed="false">Los extremos</button><button type="button" data-h="isla" aria-pressed="false">Islas</button><button type="button" data-h="chg" aria-pressed="false">Cambio desde 2015</button></div>`);
  const grid=add(wrap,"div","secc-grid");
  const mb=add(grid,"div","mapbox",'<div class="maploading">Dibujando los barrios…</div>');
  const side=add(grid,"div","secc-side");
  const legend=add(wrap,"div");
  async function draw(mc){
    const P=mc.slice(0,2);
    let all; try{ await loadTopo(); all=await loadSecc(P); }catch(e){ mb.innerHTML='<div class="maploading">No se pudo cargar el mapa de barrios.</div>'; return; }
    const feats=all.filter(f=>f.properties.m===mc), r=BYCODE.get(mc);
    if(feats.length<2){ mb.innerHTML=`<div class="maploading">${esc(r[F.name])} es una sola sección censal, así que no hay barrios que comparar.</div>`; side.innerHTML=""; legend.innerHTML=""; draw.paint=null; return; }
    const vals=feats.map(f=>f.properties.r).sort((a,b)=>a-b);
    const W=600, H=Math.round(W*0.8);
    mb.innerHTML=""; const tip=el("div","maptip"); tip.hidden=true; mb.appendChild(tip);
    const proj=d3.geoMercator().fitSize([W-10,H-10],{type:"FeatureCollection",features:feats}); const path=d3.geoPath(proj);
    const svg=d3.select(mb).append("svg").attr("viewBox",`0 0 ${W} ${H}`).attr("role","img").attr("aria-label",`Mapa de la renta por barrios de ${r[F.name]}`);
    const zg=svg.append("g"), gg=zg.append("g").attr("transform","translate(5,5)");
    svg.call(d3.zoom().scaleExtent([1,16]).translateExtent([[0,0],[W,H]]).on("zoom",ev=>{ zg.attr("transform",ev.transform); gg.selectAll("path").attr("stroke-width",.5/ev.transform.k); }));
    const n=vals.length, p10=d3.quantile(vals,.1), p90=d3.quantile(vals,.9);
    const sumHTML=`<div><div class="big">${n} barrios</div><span class="muted">de ${eur(vals[0])} a ${eur(vals[n-1])} por persona</span></div><p>El barrio del 10${NB}% más rico de ${esc(r[F.name])} ingresa <b>${nf1.format(p90/p10)} veces</b> lo que el del 10${NB}% más pobre. ${feats.filter(f=>f.properties.d===10).length} de sus barrios están en el grupo más rico de España y ${feats.filter(f=>f.properties.d===1).length} en el más pobre.</p><p class="muted" style="font-size:14px">Pasa por encima de un barrio para ver sus datos.</p>`;
    side.innerHTML=sumHTML;
    const sel=gg.selectAll("path").data(feats).join("path").attr("d",path).attr("stroke",css("--bg")).attr("stroke-width",.5)
      .on("pointermove",(ev,f)=>{ const p=f.properties; tip.innerHTML=`<b>${eur(p.r)}</b> por persona, grupo ${p.d} de 10`; tip.hidden=false; const bb=mb.getBoundingClientRect(); tip.style.left=Math.max(tip.offsetWidth/2+4,Math.min(bb.width-tip.offsetWidth/2-4,ev.clientX-bb.left))+"px"; tip.style.top=(ev.clientY-bb.top)+"px";
        side.innerHTML=`<div><div class="big">${eur(p.r)}</div><span class="muted">renta neta por persona en este barrio; grupo ${p.d} de 10 en España</span></div><dl><dt>Habitantes</dt><dd>${p.p!=null?nf0.format(p.p):"—"}</dd><dt>Edad media</dt><dd>${p.e!=null?nf1.format(p.e)+" años":"—"}</dd><dt>Riesgo de pobreza</dt><dd>${pc(p.v)}</dd><dt>Desigualdad (Gini)</dt><dd>${p.g!=null?nf1.format(p.g):"—"}</dd><dt>Cambio de la renta desde 2015</dt><dd>${p.x!=null?sgn(p.x):"no comparable"}</dd>${p.i?`<dt>Isla</dt><dd>${p.i==="rica"?"barrio rico rodeado de barrios pobres":"barrio pobre rodeado de barrios ricos"}</dd>`:""}<dt>Sección censal</dt><dd>${p.c}</dd></dl>`; })
      .on("pointerleave",()=>{ tip.hidden=true; });
    mb.onpointerleave=()=>{ side.innerHTML=sumHTML; };
    function paint(){
      const cols=ramp10(), muted=css("--nodata");
      if(mode.hl==="none") sel.attr("fill",f=>cols[f.properties.d-1]);
      else if(mode.hl==="ext") sel.attr("fill",f=>f.properties.r>=R.p99?cols[9]:f.properties.r<=R.p01?css("--slate"):muted);
      else if(mode.hl==="isla") sel.attr("fill",f=>f.properties.i==="rica"?cols[9]:f.properties.i==="pobre"?css("--slate"):muted);
      else { const sc=d3.scaleThreshold().domain([20,35,50,65,80]).range([css("--div-neg"),css("--div-neg2"),css("--div-mid"),css("--ramp-2"),css("--ramp-4"),css("--ramp-6")]); sel.attr("fill",f=>f.properties.x==null?muted:sc(f.properties.x)); }
      legend.className="legend"; legend.innerHTML="";
      if(mode.hl==="none"){ legend.className=""; decLegend(legend); add(legend,"figcaption",null,"Cada grupo reúne al 10 % de la población de España, de menos a más renta por persona."); }
      else if(mode.hl==="ext") legend.innerHTML=`<span class="sw"><i style="background:${cols[9]}"></i>Entre el 1 % de barrios más ricos de España (más de ${eur(R.p99)})</span><span class="sw"><i style="background:${css("--slate")}"></i>Entre el 1 % más pobre (menos de ${eur(R.p01)})</span>`;
      else if(mode.hl==="isla") legend.innerHTML=`<span class="sw"><i style="background:${cols[9]}"></i>Barrio rico rodeado solo de barrios pobres</span><span class="sw"><i style="background:${css("--slate")}"></i>Barrio pobre rodeado solo de barrios ricos</span><span class="help">Son pocos: en la mayoría de ciudades no hay ninguno.</span>`;
      else legend.innerHTML=`<span>Menos de +20 %</span><span class="bar">${[css("--div-neg"),css("--div-neg2"),css("--div-mid"),css("--ramp-2"),css("--ramp-4"),css("--ramp-6")].map(c=>`<i style="background:${c}"></i>`).join("")}</span><span>Más de +80 %</span><span class="help">Cuánto ha subido la renta por persona entre 2015 y ${R.year}, en euros de cada año: una parte es solo inflación, que en ese periodo superó el 20 %. En gris, barrios que cambiaron de límites y no se pueden comparar.</span>`;
    }
    paint(); draw.paint=paint;
  }
  tools.querySelectorAll(".seg button").forEach(b=>b.addEventListener("click",()=>{ mode.hl=b.dataset.h; tools.querySelectorAll(".seg button").forEach(x=>x.setAttribute("aria-pressed",x===b)); draw.paint&&draw.paint(); }));
  const selEl=tools.querySelector("select"); if(selEl) selEl.addEventListener("change",()=>{ draw(selEl.value); });
  draw(code);
}

// =====================================================================
// VIVIENDA
// =====================================================================

// cuánto han subido alquileres, ingresos y precios entre 2015 y 2024
function subidas(){
  const es=REFS.es, S=REFS.salarios, g=(a,b)=>(b/a-1)*100, ipc=g(REFS.ipc[2015],REFS.ipc[2024]);
  return {anuncios:g(S.idealista_m2[2015],S.idealista_m2[2024]), declarado:g(es.ipva[REFS.ipvaYears.indexOf(2015)],es.ipva[REFS.ipvaYears.indexOf(2024)]),
    renta:g(es.net_income_pc[0],es.net_income_pc[9]), salMedia:g(S.media[2015],S.media[2024]), salMed:g(S.mediana[2015],S.mediana[2024]), ipc};
}
function drawSubidas(parent,{compact}={}){
  const G=subidas(), box=add(parent,"div","realbox");
  const ctl=add(box,"div","seg sm"); ctl.innerHTML=`<button type="button" data-r="0">Euros de cada año</button><button type="button" data-r="1">Descontando la inflación</button>`;
  const f=fig(box,{title:"Cuánto han subido entre 2015 y 2024",source:"Fuentes: idealista (precio medio de los anuncios, diciembre de 2015 y de 2024); INE: Índice de Precios de Vivienda en Alquiler, Encuesta de Estructura Salarial, Atlas de Distribución de Renta e IPC."});
  const draw=()=>{ f.body.innerHTML=""; ctl.querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",(b.dataset.r==="1")===REAL));
    const R=v=>REAL?((1+v/100)/(1+G.ipc/100)-1)*100:v;
    const rows=[{l:"Anuncios de alquiler",v:R(G.anuncios),c:"--rust"},{l:"Renta por persona",v:R(G.renta),c:"--slate"},{l:"Salario medio",v:R(G.salMedia),c:"--slate"},{l:"Salario mediano",v:R(G.salMed),c:"--slate"},{l:"Alquiler declarado",v:R(G.declarado),c:"--rust"}];
    if(!REAL) rows.push({l:"Precios (IPC)",v:G.ipc,c:"--stone"});
    hbars(f.body,rows,{fmt:sgn,min:Math.min(0,d3.min(rows,r=>r.v)),max:Math.max(100,d3.max(rows,r=>r.v))});
    if(REAL) add(f.body,"p","muted",`Descontada la subida de los precios (${nf0.format(G.ipc)}${NB}%), el salario mediano apenas ha cambiado y los anuncios de alquiler cuestan un ${nf0.format(R(G.anuncios))}${NB}% más.`).style.cssText="font-size:14px;margin-top:8px"; };
  ctl.querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{ REAL=b.dataset.r==="1"; document.querySelectorAll(".realbox").forEach(x=>x._draw&&x._draw()); }));
  box._draw=draw; draw(); return box;
}

async function renderVivienda(){
  document.title="Vivienda · Indicio";
  const es=REFS.es, ce=REFS.census.es, ia=REFS.ipvaAntig||{es:{},prov:{}};
  const vt=es.vt, vtp=es.vtp, P=REFS.vtPeriods, iMax=vt.indexOf(d3.max(vt));
  const per=P.map(p=>p.replace(/^(\d{4})M(\d\d)$/,(m,y,mm)=>MES[+mm].slice(0,3)+". "+y.slice(2)));
  const G=subidas();
  view.innerHTML=pageHead("¿Por qué cuesta tanto encontrar casa?",`Los pisos que se anuncian para alquilar cuestan casi el doble que en 2015: un <mark>${nf0.format(G.anuncios)}${NB}%</mark> más. Los sueldos han subido un ${nf0.format(G.salMed)}${NB}%, casi lo mismo que los precios. Quien ya tiene contrato lo nota menos; quien busca piso, mucho más.`)+`<div id="body"></div>${methodNote()}`;
  const B=document.getElementById("body");

  const s1=finding(B,"El precio de los anuncios ha subido tres veces más que los sueldos",
    `<p>Cuánto han subido entre 2015 y 2024 los alquileres y los ingresos, según de dónde salga la cifra. Cada medida cuenta una parte:</p>
     <ul class="defs"><li><b>Anuncios de alquiler:</b> lo que piden los pisos que salen al mercado (idealista, euros por metro cuadrado). Es lo que paga quien busca casa hoy.</li>
     <li><b>Alquiler declarado:</b> lo que pagan todos los inquilinos según las declaraciones a Hacienda (INE). Incluye contratos de hace años, con subidas limitadas, y deja fuera los alquileres no declarados.</li>
     <li><b>Salario:</b> lo que cobra un trabajador al año (INE). El mediano es el del trabajador del medio: la mitad cobra menos.</li>
     <li><b>Renta por persona:</b> todo lo que entra en los hogares dividido entre sus miembros. Sube más que los sueldos porque hoy trabaja más gente por hogar y suben las pensiones.</li></ul>`);
  drawSubidas(s1);

  const n=ia.es.n||[], i21=YEARS.indexOf(2021), inc=es.net_income_pc, sal=REFS.salarios.media, salM=REFS.salarios.mediana;
  const ix21=a=>a.slice(i21);
  const s2=finding(B,"Desde 2021, los contratos nuevos suben más deprisa que los sueldos",
    `<p>El INE solo separa los contratos nuevos de los antiguos desde 2021. Desde entonces, el alquiler de los contratos nuevos ha subido un ${nf0.format(n[9]/n[6]*100-100)}${NB}% y el salario mediano un ${nf0.format(salM[2024]/salM[2021]*100-100)}${NB}%.</p>`);
  realChart(s2,{title:"Alquiler de contratos nuevos, salario y renta, 2021 = 100",source:"Fuente: INE, Índice de Precios de Vivienda en Alquiler, Encuesta de Estructura Salarial y Atlas de Renta.",
    series:[{n:"Alquiler nuevos",v:ix21(n),c:"--rust",main:true},{n:"Renta",v:ix21(inc),c:"--slate"},{n:"Salario mediano",v:ix21(YEARS.map(y=>salM[y])),c:"--mustard"}],
    xticks:[2021,2022,2023,2024],height:260,years:YEARS.slice(i21),index:true});

  const rowsP=Object.entries(ia.prov||{}).map(([p,v])=>{ const r=REFS.prov[p]; if(!r||!v.n) return null; return {p,n:(v.n[9]/v.n[6]-1)*100,e:(v.e[9]/v.e[6]-1)*100,g:(r.net_income_pc[9]/r.net_income_pc[6]-1)*100}; }).filter(Boolean).sort((a,b)=>(b.n-b.g)-(a.n-a.g));
  const over=rowsP.filter(r=>r.n>r.g);
  const s2b=finding(B,`Entre 2021 y 2024, los contratos nuevos subieron más que la renta en ${over.length} provincias`,
    `<p>Subida entre 2021 y 2024 del alquiler en los contratos nuevos, en los que ya estaban firmados y de la renta por persona. Arriba, las provincias donde el alquiler nuevo más se ha despegado de la renta.</p>`);
  const mx=d3.max(rowsP,r=>Math.max(r.n,r.g,r.e));
  const w2=add(s2b,"div","cmp");
  w2.innerHTML=`<div class="keys"><span><i style="background:var(--rust)"></i>Alquiler, contratos nuevos</span><span><i style="background:var(--mustard)"></i>Alquiler, contratos en vigor</span><span><i style="background:var(--slate)"></i>Renta por persona</span></div>`+
    rowsP.slice(0,12).map(r=>`<div class="cmp-row"><div class="n">${esc(provShort(PROVS[r.p]))}<small>${r.n>r.g?`el alquiler nuevo sube ${nf1.format(r.n-r.g)} puntos más que la renta`:`la renta sube ${nf1.format(r.g-r.n)} puntos más`}</small></div><div class="bars">${[[r.n,"--rust"],[r.e,"--mustard"],[r.g,"--slate"]].map(([v,c])=>`<div class="b"><span style="width:${Math.max(0,v)/mx*100}%;background:var(${c})"></span><em>${sgn(v)}</em></div>`).join("")}</div></div>`).join("");
  add(s2b,"figcaption",null,"Euros de cada año. Fuente: INE, Índice de Precios de Vivienda en Alquiler (por antigüedad del contrato) y Atlas de Renta.");

  const rws=rowsAll().filter(r=>r[F.alqVar]!=null&&r[F.rentaVar]!=null), up=rws.filter(r=>r[F.alqVar]>r[F.rentaVar]);
  const s3=finding(B,"Municipio a municipio: dónde sube más el alquiler declarado",
    `<p>Cada punto es un municipio de más de 10.000 habitantes. Por encima de la diagonal, el alquiler declarado ha subido más que la renta por persona: pasa en ${up.length} de ${rws.length}. Recuerda que es el alquiler de todos los contratos, no el de los anuncios: sirve para ver <b>dónde</b> sube más, no cuánto le cuesta a quien busca piso.</p>`);
  scatter(s3,{x:"rentaVar",y:"alqVar",minPop:10000,diag:true,title:"Subida de la renta y del alquiler declarado entre 2015 y 2024",source:"Fuente: INE, Índice de Precios de Vivienda en Alquiler (municipios de más de 10.000 habitantes) y Atlas de Renta."});
  const g3=add(s3,"div","cols2"); topList(g3,"alqVar",{title:"Donde más ha subido el alquiler",minPop:10000,link:"vivienda"});
  const gp=rws.filter(r=>(r[F.pop]||0)>=10000).map(r=>[r,r[F.alqVar]-r[F.rentaVar]]).sort((a,b)=>b[1]-a[1]).slice(0,8);
  add(g3,"div","lista",`<h3>Donde el alquiler más se acerca a la renta</h3><ol>${gp.map(([r,d])=>`<li><span><a href="#m${r[F.code]}-vivienda">${esc(r[F.name])}</a><small>alquiler ${sgn(r[F.alqVar])}, renta ${sgn(r[F.rentaVar])}</small></span><span class="v">${d>0?"+":"−"}${nf1.format(Math.abs(d))} puntos</span></li>`).join("")}</ol>`);

  const s4=finding(B,"Los pisos turísticos se concentran en la costa y en las islas",
    `<p>En mayo de 2026 había <mark>${nf0.format(vt[vt.length-1])}</mark> viviendas turísticas en España, el ${pc(vtp[vtp.length-1])} de todas. Es poco en el conjunto, pero en algunos municipios de Canarias, Baleares y la Costa del Sol superan una de cada diez viviendas. El máximo se alcanzó en ${MES[8]} de 2024, con ${nf0.format(vt[iMax])}.</p>`);
  const g4=add(s4,"div","cols2");
  const fa=fig(g4,{title:"Viviendas turísticas por provincia",sub:"% del total de viviendas, mayo de 2026",source:"Fuente: INE, estadística experimental de viviendas turísticas."});
  hbars(fa.body,provRows("vt").sort((a,b)=>b.v-a.v).slice(0,15),{fmt:pc,color:"--rust",min:0});
  topList(g4,"vt",{title:"Municipios con más peso de pisos turísticos",minPop:5000,link:"vivienda"});
  add(s4,"p",null,exLink("mapa",{d:["vt","alquiler"]},"Ver los pisos turísticos en el mapa del explorador"));

  const s5=finding(B,"Donde hay más pisos turísticos, más gente vive de alquiler",`<p>La relación existe pero es débil: hay muchos municipios turísticos con poco alquiler y al revés. Escala logarítmica en el eje horizontal, para que se vean los municipios con muy pocos pisos turísticos.</p>`);
  scatter(s5,{x:"vt",y:"alquiler",minPop:10000,logX:true,title:"Viviendas turísticas y hogares de alquiler",source:"Municipios de más de 10.000 habitantes. Fuente: INE, viviendas turísticas (2026) y Censo de 2021."});

  const s6=finding(B,`${cap(deCadaDiez(ce.secondary))} viviendas no son residencia habitual de nadie`,
    `<p>Según el censo de 2021, el ${pc(ce.secondary)} de las viviendas son segundas residencias o están vacías, y el ${pc(ce.rented)} de los hogares vive de alquiler. Las viviendas sin uso habitual abundan sobre todo en los pueblos que pierden población, lejos de donde más falta hace vivienda.</p>`);
  scatter(s6,{x:"var0525",y:"noPrincipal",minPop:1000,weighted:false,title:"Crecimiento de la población desde 2005 y viviendas vacías o secundarias",source:"Municipios de 1.000 habitantes o más; cada municipio cuenta igual. Fuente: INE, padrón y Censo de 2021."});
  panoExtra("vivienda",B);
}

// =====================================================================
// POBLACIÓN
// =====================================================================
async function renderPoblacion(){
  document.title="Población · Indicio";
  const es=REFS.es, PY=REFS.padYears, pad=es.pad, i05=PY.indexOf(2005);
  const rws=rowsAll().filter(r=>r[F.var0525]!=null), lose=rws.filter(r=>r[F.var0525]<0), popLose=d3.sum(lose,r=>r[F.pop]||0), popAll=d3.sum(rws,r=>r[F.pop]||0);
  const [ext]=last(es.pct_foreign), [ext0]=first(es.pct_foreign), [age]=last(es.mean_age), [age0]=first(es.mean_age);
  view.innerHTML=pageHead("¿Quién llega y quién se va?",`España tiene <mark>${nf1.format(pad[pad.length-1]/1e6)} millones</mark> de habitantes, ${nf1.format((pad[pad.length-1]-pad[0])/1e6)} millones más que en 1996. Pero el crecimiento se reparte muy mal: ${deCadaDiez(lose.length/rws.length*100)} municipios tienen menos vecinos que en 2005, aunque en ellos vive solo el ${pc0(popLose/popAll*100)} de la población.`)+`<div id="body"></div>${methodNote()}`;
  const B=document.getElementById("body");

  const s1=finding(B,`España ha ganado ${nf1.format((pad[pad.length-1]-pad[0])/1e6)} millones de habitantes desde 1996`,
    `<p>El crecimiento fue muy rápido hasta 2008, se frenó con la crisis y ha vuelto con fuerza desde 2016, impulsado por la llegada de población extranjera.</p>`);
  const g1=add(s1,"div","cols2");
  lineChart(g1,{title:"Habitantes de España",source:"A 1 de enero de cada año. Fuente: INE, padrón municipal.",series:[{n:"España",v:pad,c:"--slate",main:true}],years:PY,xticks:[1996,2008,2025],fmt:v=>nf0.format(v),tickFmt:v=>nf0.format(v/1e6)+" M"});
  const fb=fig(g1,{title:"Crecimiento desde 2005, por provincia",source:"Fuente: INE, padrón municipal."});
  hbars(fb.body,provRows("var0525").sort((a,b)=>b.v-a.v),{fmt:sgn,scroll:true,color:"--mustard"});

  const bands=[[0,500,"Menos de 500"],[500,2000,"500 a 2.000"],[2000,10000,"2.000 a 10.000"],[10000,50000,"10.000 a 50.000"],[50000,1e9,"Más de 50.000"]];
  const br=bands.map(([a,b,l])=>{ const s=rws.filter(r=>(r[F.pop]||0)>=a&&(r[F.pop]||0)<b); return {l:l+" hab.",v:s.filter(r=>r[F.var0525]<0).length/s.length*100}; });
  const s2=finding(B,"Cuanto más pequeño es el pueblo, más probable es que se vacíe",`<p>Porcentaje de municipios de cada tamaño que tienen hoy menos habitantes que en 2005.</p>`);
  const f2=fig(s2,{source:"Tamaño según la población de 2025. Fuente: INE, padrón municipal."}); hbars(f2.body,br,{fmt:pc0,color:"--slate",min:0,max:100});
  const g2=add(s2,"div","cols2"); topList(g2,"var0525",{title:"Los que más crecen desde 2005",link:"crece"}); topList(g2,"var0525",{title:"Los que más pierden desde 2005",asc:true,link:"crece"});
  add(s2,"figcaption",null,"Municipios de 5.000 habitantes o más.");

  // migraciones
  { const MR=rowsAll().filter(r=>r[F.migInt]!=null&&r[F.pop]), bands=[[0,1000,"Menos de 1.000"],[1000,5000,"1.000 a 5.000"],[5000,20000,"5.000 a 20.000"],[20000,100000,"20.000 a 100.000"],[100000,1e9,"Más de 100.000"]];
    const wm=(s,k)=>d3.sum(s,r=>r[F[k]]*r[F.pop])/d3.sum(s,r=>r[F.pop]);
    const rowsB=bands.map(([a,b,l])=>{ const s=MR.filter(r=>r[F.pop]>=a&&r[F.pop]<b); return {l:l+" hab.",i:wm(s,"migInt"),e:wm(s,"migExt")}; });
    const MY=REFS.migYears, me=REFS.paro.es.mig;
    const sm=finding(B,"Las ciudades grandes crecen por quien llega del extranjero; los pueblos ganan vecinos de otras partes de España",
      `<p>Entre ${MY[0]} y ${MY[MY.length-1]} llegaron a España, en neto, unas ${nf0.format(d3.mean(me,m=>m[1])/1000)} mil personas al año desde el extranjero. Dentro de España, el movimiento va de las ciudades grandes a los municipios de alrededor y a los pueblos: Madrid y Barcelona pierden cada año más gente hacia otros municipios de la que reciben.</p>`);
    const fm=fig(sm,{title:"Saldo migratorio por cada 1.000 habitantes y año, según el tamaño del municipio",source:`Llegadas menos salidas, media de ${MY[0]}–${MY[MY.length-1]}. Fuente: INE, Estadística de Migraciones y Cambios de Residencia.`});
    const mx=d3.max(rowsB,r=>Math.max(Math.abs(r.i),Math.abs(r.e)));
    const w=add(fm.body,"div","cmp");
    w.innerHTML=`<div class="keys"><span><i style="background:var(--slate)"></i>Con el extranjero</span><span><i style="background:var(--rust)"></i>Con el resto de España</span></div>`+rowsB.map(r=>`<div class="cmp-row"><div class="n">${r.l}</div><div class="bars">${[[r.e,"--slate"],[r.i,"--rust"]].map(([v,c])=>`<div class="b"><span style="width:${Math.abs(v)/mx*100}%;background:var(${c});${v<0?"opacity:.55":""}"></span><em>${v>0?"+":"−"}${nf1.format(Math.abs(v))}</em></div>`).join("")}</div></div>`).join("");
    const g=add(sm,"div","cols2"); topList(g,"migInt",{title:"Los que más vecinos ganan del resto de España",minPop:5000,link:"crece"}); topList(g,"migInt",{title:"Los que más vecinos pierden hacia el resto de España",minPop:5000,asc:true,link:"crece"});
    add(sm,"figcaption",null,"Saldo con el resto de España por cada 1.000 habitantes y año. Municipios de 5.000 habitantes o más.");
    add(sm,"p",null,exLink("mapa",{d:["migInt","migExt","renta"]},"Ver en el mapa del explorador adónde se muda la gente"));
  }

  const s3=finding(B,"Los municipios que crecen son, sobre todo, los que atraen población de fuera",
    `<p>La población con nacionalidad extranjera ha pasado del ${pc(ext0)} al ${pc(ext)} entre 2015 y 2023. Donde más ha crecido la población en la última década es, en general, donde más extranjeros viven.</p>`);
  scatter(s3,{x:"extr",y:"varPob",minPop:1000,title:"Población extranjera y crecimiento desde 2015",source:"Municipios de 1.000 habitantes o más. Fuente: INE, Atlas de Renta (2023) y padrón."});

  const s4=finding(B,"Y los que se vacían son también los más envejecidos",
    `<p>La edad media de España ha pasado de ${nf1.format(age0)} a ${nf1.format(age)} años entre 2015 y 2023. En los pueblos que pierden habitantes supera con frecuencia los 50.</p>`);
  scatter(s4,{x:"edad",y:"varPob",minPop:1000,title:"Edad media y crecimiento desde 2015",source:"Municipios de 1.000 habitantes o más. Fuente: INE, Atlas de Renta (2023) y padrón."});
  panoExtra("poblacion",B);
}

// =====================================================================
// TRABAJO
// =====================================================================
async function renderTrabajo(){
  document.title="Trabajo · Indicio";
  const es=REFS.es, [wage]=last(es.wage), [pen]=last(es.pension), S=REFS.salarios, PR=REFS.paro.es, PY=REFS.paroYears;
  const G=subidas();
  const tasa=PR.paro[10]/PR.pob1664*100, caida=(PR.paro[10]/PR.paro[0]-1)*100;
  view.innerHTML=pageHead("¿De qué vivimos?",`Hay <mark>${nf1.format(PR.last[0]/1e6)} millones</mark> de personas apuntadas al paro, frente a ${nf1.format(PR.paro[0]/1e6)} millones de media en 2015. Pero los sueldos apenas ganan a los precios: el salario mediano ha subido un ${nf0.format(G.salMed)}${NB}% en nueve años y los precios, un ${nf0.format(G.ipc)}${NB}%.`)+`<div id="body"></div>${methodNote()}`;
  const B=document.getElementById("body");

  const s0=finding(B,"Más gente trabajando, pero con sueldos que apenas ganan a los precios",
    `<p>El salario medio ha pasado de ${eur(S.media[2015])} a ${eur(S.media[2024])} brutos al año, y el mediano de ${eur(S.mediana[2015])} a ${eur(S.mediana[2024])}. Descontada la inflación, el trabajador típico gana hoy casi lo mismo que en 2015.</p>
     <p>La renta por persona sí ha subido más, porque hay más gente trabajando en cada hogar y porque las pensiones suben con el IPC. Pulsa «Descontando la inflación» para verlo en euros de 2024.</p>`);
  realChart(s0,{title:"Salario y renta por persona",source:"Salario bruto anual por trabajador. Renta neta por persona. Fuente: INE, Encuesta de Estructura Salarial, Atlas de Renta e IPC.",
    series:[{n:"Salario medio",v:YEARS.map(y=>S.media[y]),c:"--slate",main:true},{n:"Salario mediano",v:YEARS.map(y=>S.mediana[y]),c:"--mustard"},{n:"Renta por persona",v:es.net_income_pc,c:"--rust"}],fmt:eur,tickFmt:v=>nf0.format(v/1000)+" mil",height:280});
  const fs=fig(s0,{title:"Salario mediano por comunidad, 2024",source:"Fuente: INE, Encuesta de Estructura Salarial."});
  const MC=S.mediana_ccaa; hbars(fs.body,Object.entries(MC).filter(([k])=>k!=="España").map(([k,v])=>({l:k,v:v[2024],me:false})).sort((a,b)=>b.v-a.v),{fmt:eur,ref:MC["España"][2024],refLabel:"España",color:"--slate",min:0});

  const s1=finding(B,`El paro registrado ha caído un ${nf0.format(-caida)}${NB}% desde 2015`,
    `<p>Personas inscritas como demandantes de empleo en las oficinas públicas (SEPE). Es el dato más reciente que existe por municipio: llega a ${REFS.paroLast}. Para comparar lugares usamos la media de 2025, porque en verano y otoño las zonas turísticas tienen mucho menos paro que el resto del año. En España, el paro registrado equivale al ${pc(tasa)} de la población de 16 a 64 años.</p>`);
  const g1=add(s1,"div","cols2");
  lineChart(g1,{title:"Paro registrado en España",source:"Media de cada año; 2026, de enero a septiembre. Fuente: SEPE.",series:[{n:"España",v:PR.paro,c:"--rust",main:true}],years:PY,xticks:[2015,2020,2026],fmt:v=>nf0.format(v),tickFmt:v=>nf1.format(v/1e6)+" M"});
  const f1=fig(g1,{title:"Paro registrado por provincia, media de 2025",source:"% de la población de 16 a 64 años. Fuente: SEPE y padrón."}); hbars(f1.body,provRows("paroReg").sort((a,b)=>b.v-a.v),{fmt:pc,scroll:true,color:"--rust",min:0});
  const g1b=add(s1,"div","cols2"); topList(g1b,"paroReg",{title:"Más paro registrado",minPop:10000,link:"vive"}); topList(g1b,"paroReg",{title:"Menos paro registrado",minPop:10000,asc:true,link:"vive"});
  add(s1,"figcaption",null,"Municipios de 10.000 habitantes o más. El paro registrado no es la tasa de paro de la EPA: cuenta a quien se apunta en la oficina de empleo, en relación con toda la población en edad de trabajar.");
  add(s1,"p",null,exLink("mapa",{d:["paroReg","renta"]},"Ver el paro registrado en el mapa del explorador"));

  const s2=finding(B,"Donde hay más estudios superiores, hay más renta",`<p>Es la relación más fuerte de todos los datos de Indicio. No dice que estudiar haga rico a un municipio: también puede ser que la gente con estudios se concentre donde hay empleos mejor pagados. Pero muestra hasta qué punto van juntas las dos cosas.</p>`);
  scatter(s2,{x:"superiores",y:"renta",minPop:1000,title:"Adultos con estudios superiores y renta por persona",source:"Municipios de 1.000 habitantes o más. Fuente: INE, Censo de 2021 y Atlas de Renta 2024."});
  const s2b=finding(B,"Y donde hay más paro, menos renta",`<p>El paro registrado de hoy frente a la renta por persona de 2024.</p>`);
  scatter(s2b,{x:"paroReg",y:"renta",minPop:1000,height:360,title:"Paro registrado y renta por persona",source:"Municipios de 1.000 habitantes o más. Fuente: SEPE (media de 2025) y Atlas de Renta (2024)."});
  const s3=finding(B,"En muchos pueblos se vive, sobre todo, de las pensiones",`<p>De cada 100 euros que declaran los hogares, ${nf0.format(wage)} son salarios y ${nf0.format(pen)} pensiones. En los municipios más envejecidos, las pensiones se acercan a la mitad de todo lo que entra.</p>`);
  const g3=add(s3,"div","cols2");
  const sc3=add(g3,"div"); scatter(sc3,{x:"edad",y:"pensiones",minPop:1000,height:340,title:"Edad media y peso de las pensiones",source:"Municipios de 1.000 habitantes o más. Fuente: INE, Atlas de Renta 2023."});
  topList(g3,"pensiones",{title:"Donde más pesan las pensiones",minPop:5000,link:"vive"});
  panoExtra("trabajo",B);
}
// =====================================================================
// FICHA DE MUNICIPIO: una sola página con saltos a cada apartado
// =====================================================================
let curMun=null;
const SECS=[["crece","Población"],["gente","Quién vive"],["vive","Renta y trabajo"],["todos","Desigualdad"],["vivienda","Vivienda"],["voto","Voto"]];
const SECALIAS={renta:"vive",trabajo:"vive",barrios:"todos"};
const ART={"PP":"el ","PSOE":"el ","PNV":"el ","BNG":"el ","CUP":"la ","PRC":"el "};

// nombre local de cada familia de partidos en una provincia y elección (Compromís, En Comú, etc.)
function partyLabel(P,k,fam){ const L=VREFS.labels&&VREFS.labels[P]&&VREFS.labels[P][k]&&VREFS.labels[P][k][fam]; return L&&L.length?L.join(" y "):({Cs:"Ciudadanos",SALF:"Se Acabó La Fiesta"}[fam]||fam); }
const partyArt=(P,k,fam)=>{ const l=partyLabel(P,k,fam); return l===fam?(ART[fam]??"")+l:l; };

async function renderMun(code,sec){
  const r=BYCODE.get(code), P=r[F.prov];
  esMap=null; sec=SECALIAS[sec]||sec;
  if(curMun===code&&document.getElementById("macc")){ openSec(sec,true); return; }
  view.innerHTML='<p class="loading">Cargando la ficha…</p>'; window.scrollTo(0,0);
  let pd; try{ pd=await loadProv(P); }catch(e){ view.innerHTML='<p class="loading">No se pudo cargar la ficha. Recarga la página.</p>'; return; }
  const d=pd[code]; if(!d){ view.innerHTML=`<p class="loading">No hay datos publicados para ${esc(r[F.name])}.</p>`; return; }
  curMun=code; document.title=r[F.name]+" · Indicio"; MUNCTX={r,d};
  const bandLab=d.band!=null?REFS.bandLabels[d.band]:"";
  view.innerHTML=`
    <header class="mf-hero">
      <div>
        <nav class="tp-crumb" aria-label="Ruta"><a href="/municipio/">Municipios</a> › Provincia de ${esc(provShort(PROVS[P]))}</nav>
        <h1>${esc(r[F.name])}</h1>
        <p class="dek">${summary(r,d)}</p>
        <div class="chipsq"><span id="mychips" style="display:contents">${myChip(code)}</span><a href="#comparar-${code}">⇄ Comparar con otro</a><a href="${exHash({v:"mapa",d:["renta","paroReg"],p:code.slice(0,2),t:"",m:code,c:[]})}">Verlo en el laboratorio</a><button type="button" id="mshare">Compartir</button><span class="muted" style="font-size:12.5px">Municipio de ${esc(bandLab)} Código INE ${esc(code)}.</span></div>
      </div>
      <figure class="locator" id="locator"><svg viewBox="0 0 260 200" aria-hidden="true"></svg><figcaption>El término municipal y sus vecinos. Pulsa otro para ir a su ficha.</figcaption></figure>
    </header>
    <h2 class="mf-h2">Las cifras clave</h2>
    <div class="kpis" id="kpis"></div>
    <h2 class="mf-h2">Cómo ha cambiado desde 2015</h2>
    <div class="smalls" id="smalls"></div><div class="smkey"><span><i></i>${esc(dispName(r[F.name]))}</span><span><i class="es"></i>España</span><span>Cada línea parte de su valor de 2015</span></div>
    <h2 class="mf-h2">Lo que destaca <small>comparado con ${(r[F.pop]||0)>=1000?"los municipios de más de 1.000 habitantes":"todos los municipios"}</small></h2>
    <div class="dest" id="destaca"></div>
    <h2 class="mf-h2">Todo el detalle <small>Pulsa un apartado para abrirlo</small></h2>
    <div class="acc" id="macc"></div>
    ${methodNote()}`;
  document.documentElement.style.setProperty("--toph",document.getElementById("top").offsetHeight+"px");
  myChipBind(code);
  document.getElementById("mshare").addEventListener("click",e=>{ const url=location.href.split("#")[0]+"#m"+code; try{ navigator.clipboard.writeText(url).then(()=>{ e.target.textContent="Enlace copiado"; },()=>prompt("Copia este enlace:",url)); }catch(x){ prompt("Copia este enlace:",url); } });
  loadTopo().then(()=>drawLocator(code,P)).catch(()=>{});
  try{ kpis(document.getElementById("kpis"),r,d); }catch(e){ console.error(e); }
  try{ smalls(document.getElementById("smalls"),r,d); }catch(e){ console.error(e); }
  try{ destaca(document.getElementById("destaca"),r); }catch(e){ console.error(e); }
  const box=document.getElementById("macc");
  ACC.forEach(([k,l,fn,sumF,miniF,ch])=>{ const row=add(box,"div","accrow"); row.id="s-"+k; let sm="",mi="";
    try{ sm=sumF(r,d)||""; }catch(e){} try{ mi=miniF(r,d)||""; }catch(e){}
    row.innerHTML=`<button type="button" aria-expanded="false"><span class="ic" aria-hidden="true">+</span><span><b>${l}</b><span class="sum">${sm}</span></span><span class="mini">${mi}</span><span class="ch">${ch}</span></button><div class="accb" hidden></div>`;
    row.querySelector("button").addEventListener("click",()=>{ toggleSec(k); try{ history.replaceState(null,"",keyToPath("m"+code+(row.hasAttribute("open")?"-"+k:""))); }catch(e){} }); });
  if(sec) setTimeout(()=>openSec(sec,true),60);
}
let MUNCTX=null;
const ACC=[
  ["crece","Población",(s,r,d)=>secCrece(s,r,d),(r,d)=>{ const PY=REFS.padYears,i15=PY.indexOf(2015),g=d.pad&&d.pad[i15]?(lastV(d.pad)/d.pad[i15]-1)*100:null; let t=g==null?"Habitantes y llegadas.":g>=3?`Crece un ${nf0.format(g)}${NB}% desde 2015`:g<=-3?`Pierde un ${nf0.format(-g)}${NB}% de vecinos desde 2015`:"Casi los mismos vecinos que en 2015"; if(d.mig){ const te=d3.sum(d.mig,m=>m[1]||0), ti=d3.sum(d.mig,m=>m[2]||0); t+=te>0&&ti<0?"; llegan vecinos del extranjero y se van algunos a otros municipios.":te>0&&ti>0?"; gana vecinos de fuera y del resto de España.":te<=0&&ti<0?"; se van más de los que llegan.":"."; } else t+="."; return t; },(r,d)=>miniLines(d.pad||d.s.population,null,{w:150,h:26,pad:2}),"3 gráficos"],
  ["gente","Quién vive",(s,r,d)=>secGente(s,r,d),(r,d)=>{ const [a]=last(d.s.mean_age),[e]=last(REFS.es.mean_age),[so]=last(d.s.pct_single_hh); return a==null?"Edades y hogares.":`Edad media de ${nf1.format(a)} años, ${Math.abs(a-e)<1?"como España":a>e?nf1.format(a-e)+" más que España":nf1.format(e-a)+" menos que España"}${so!=null?`; en ${deCadaDiez(so)} hogares vive una sola persona`:""}.`; },(r,d)=>{ const c=d.census||{}; return c.u16==null?"":miniStack([[c.u16,"--ramp-1"],[c.a1664,"--ramp-3"],[c.o64,"--ramp-5"]],{w:150}); },"4 gráficos"],
  ["vive","Renta y trabajo",(s,r,d)=>secVive(s,r,d),(r,d)=>{ const v=r[F.renta], e=esMean("renta"), [w]=last(d.s.wage); if(v==null) return "Ingresos, paro y a qué se dedica la gente."; const q=v/e*100; return `Renta ${q>=105?`un ${nf0.format(q-100)}${NB}% por encima de`:q<=95?`un ${nf0.format(100-q)}${NB}% por debajo de`:"cerca de"} la media${w!=null?`; ${nf0.format(w)} de cada 100 euros son salarios`:""}.`; },(r,d)=>{ const S=lastSrc(r,d,["wage","pension","unemp_benefit","other_benefits","other_income"]).m; return S.wage==null?"":miniStack([[S.wage,"--slate"],[S.pension,"--mustard"],[(S.unemp_benefit||0)+(S.other_benefits||0)+(S.other_income||0),"--stone"]],{w:150}); },"6 gráficos"],
  ["todos","Desigualdad y barrios",(s,r,d)=>secTodos(s,r,d),(r,d)=>{ const [p]=last(d.s.poverty),[e]=last(REFS.es.poverty); return p==null?"Barrio a barrio, con la renta de cada sección censal.":`El ${pc(p)} en riesgo de pobreza (España: ${pc(e)}). Y la renta de cada barrio en un mapa.`; },(r,d)=>miniLines(d.s.poverty,REFS.es.poverty,{w:150,h:26,pad:2,index:false}),"mapa y 2 gráficos"],
  ["vivienda","Vivienda",(s,r,d)=>secVivienda(s,r,d),(r,d)=>{ const c=d.census||{}, ce=REFS.census.es; let t=c.rented!=null?`${c.rented<ce.rented-4?"Pocos":c.rented>ce.rented+4?"Muchos":"Bastantes"} hogares de alquiler (${pc0(c.rented)}; España ${pc0(ce.rented)})`:"Alquiler, viviendas vacías y pisos turísticos"; if(r[F.alqVar]!=null) t+=`; el alquiler sube ${r[F.alqVar]>esMean("alqVar")+3?"más":r[F.alqVar]<esMean("alqVar")-3?"menos":"lo mismo"} que en España`; return t+"."; },(r,d)=>{ const c=d.census||{}; return c.owned==null?"":miniStack([[c.owned,"--mustard"],[c.rented,"--rust"],[c.otherTenure,"--stone"]],{w:150}); },"4 gráficos"],
  ["voto","Voto",(s,r,d)=>secVoto(s,r,d),(r,d)=>{ const v=d.vote||{}, k=VG(); if(!v[k]) return "Resultados electorales."; const o=Object.entries(v[k].share).filter(([p])=>p!=="Otros").sort((a,b)=>b[1]-a[1])[0]; const t=v[k].turnout, te=VREFS.es[k].turnout; return `Ganó ${partyArt(r[F.prov],k,o[0])} en ${k.slice(2,6)} (${pc(o[1])}); participación ${t>te+5?"muy alta":t>te+1?"alta":t<te-5?"muy baja":t<te-1?"baja":"como la media"}.`; },(r,d)=>{ const v=d.vote||{}, k=VG(); return v[k]?miniStack(Object.entries(v[k].share).sort((a,b)=>(a[0]==="Otros")-(b[0]==="Otros")||b[1]-a[1]).map(([p,x])=>[x,pColor(p)]),{w:150}):""; },"4 gráficos"],
  ["mas","Empleo, compraventas y deuda",(s,r,d)=>secMas(s,r,d),(r,d)=>{ const O=REFS.otras, Y=O&&O.years; if(!O||!(d.afil||d.contrT||d.comp)) return "Afiliados, contratos, compraventas de vivienda y deuda del ayuntamiento."; const t=[]; const lo=(a,ys)=>{ if(!a) return null; for(let i=a.length-1;i>=0;i--) if(a[i]!=null) return a[i]; return null; };
      if(d.afil&&d.afil[0]&&lo(d.afil)!=null) t.push(`Afiliados: ${sgn((lo(d.afil)/d.afil[0]-1)*100)} desde 2011`); if(lo(d.contrT)!=null) t.push(`${pc0(lo(d.contrT))} de contratos temporales`); const dd=lo(d.deuda), p=lastV(d.pad); if(dd!=null&&p) t.push(dd>0?`deuda municipal de ${eur(dd/p)} por habitante`:"ayuntamiento sin deuda"); return cap(t.join("; "))+"."; },
    (r,d)=>d.afil&&d.afil.some(v=>v)?miniLines(d.afil,null,{w:150,h:26,pad:3}):"","4 gráficos"],
  ["datos","Todos los datos en una tabla",(s,r,d)=>glance(add(s,"div"),r,d),(r,d)=>`Los ${d3.sum(GLANCE,g=>g[1].length)} datos del municipio, con la media de España y su posición.`,()=>`<svg viewBox="0 0 150 26" aria-hidden="true">${[0,1,2].map(i=>`<rect x="0" y="${3+i*8}" width="150" height="3" rx="1.5" style="fill:var(--band)"/><circle cx="${[40,110,75][i]}" cy="${4.5+i*8}" r="3" style="fill:var(--rust)"/>`).join("")}</svg>`,"tabla"],
  ["parecidos","Municipios parecidos",(s,r,d)=>parecidos(s,r),(r,d)=>{ const n=nearest(r,3); return n.length?`Se parece a ${n.map(([x])=>esc(dispName(x[F.name]))).join(", ").replace(/, ([^,]*)$/," y $1")}.`:"Los que más se le parecen."; },()=>`<svg viewBox="0 0 150 26" aria-hidden="true">${[20,48,76,104,132].map((x,i)=>`<circle cx="${x}" cy="13" r="${i===0?8:6}" style="fill:var(${i===0?"--rust":"--rule-2"})"/>`).join("")}</svg>`,"tabla"]];
function toggleSec(k,force){
  const row=document.getElementById("s-"+k); if(!row||!MUNCTX) return; const b=row.querySelector(".accb"), btn=row.querySelector("button");
  const open=force!=null?force:!row.hasAttribute("open");
  if(open){ row.setAttribute("open",""); b.hidden=false; btn.setAttribute("aria-expanded","true");
    if(!b.dataset.done){ b.dataset.done="1"; const s=add(b,"section","msec"); const A=ACC.find(x=>x[0]===k); try{ A[2](s,MUNCTX.r,MUNCTX.d); }catch(e){ console.error(e); add(s,"p","muted","No se pudo dibujar este apartado."); } } }
  else { row.removeAttribute("open"); b.hidden=true; btn.setAttribute("aria-expanded","false"); }
}
function openSec(k,scroll){ if(!k) return; if(k==="destaca"||k==="glance"){ k=k==="glance"?"datos":null; if(!k) return; } toggleSec(k,true); if(scroll) scrollSec(k); }

// ---------- cifras clave con barra ----------
function kpis(box,r,d){
  const es=REFS.es, PY=REFS.padYears, i15=PY.indexOf(2015), ce=REFS.census.es, k=VG();
  const gE=(lastV(es.pad)/es.pad[i15]-1)*100;
  // [clave, título, valor, valor de España, cómo se mide la diferencia, nota bajo el título, extremos]
  const K=[["renta","Renta por persona · 2024",r[F.renta],esMean("renta"),"rel","",["menos","más"]],
    ["varPob","Crecimiento desde 2015",r[F.varPob],gE,"pp","",["pierde","gana"]],
    ["edad","Edad media · 2023",r[F.edad],lastV(es.mean_age),"años","",["más joven","mayor"]],
    ["paroReg","Paro registrado · 2025",r[F.paroReg],esOff("paroReg"),"pp","% de 16 a 64 años",["menos","más"]],
    ["alquiler","Hogares de alquiler · 2021",r[F.alquiler],ce.rented,"pp","",["menos","más"]],
    ["part",`Participación · ${k.slice(2,6)}`,r[F.part],VREFS.es[k].turnout,"pp","",["menos","más"]]];
  // la misma comparación en todas las filas: «España X · ▲/▼ diferencia». Flechas neutras: más no es ni bueno ni malo
  const cmp=(v,e,mode)=>{ if(v==null||e==null) return null; let a,t;
    if(mode==="rel"){ a=(v/e-1)*100; t=nf0.format(Math.abs(a))+NB+"%"; if(Math.abs(a)<.5) a=0; }
    else{ a=v-e; t=nf1.format(Math.abs(a))+NB+(mode==="años"?"años":"puntos"); if(Math.abs(a)<.05) a=0; }
    return a===0?{a:0,t:"igual",ar:"=",sr:"igual que España"}:{a,t,ar:a>0?"▲":"▼",sr:`${t} ${a>0?(mode==="rel"?"por encima":"más"):(mode==="rel"?"por debajo":"menos")} que España`}; };
  // «dónde queda entre todos»: cada fila pinta los 8.000 municipios como puntos y marca el tuyo y España
  box.className="strips"; const n=rowsAll().length, nm=esc(dispName(r[F.name]));
  box.innerHTML=`<div class="st-h">Dónde queda entre los ${nf0.format(n)} municipios</div>`+K.map(([kk,l,v,e,mode,nota,lr],i)=>{ const c=cmp(v,e,mode), fe=e==null?"":fmtK(kk)(e);
    const cl=e==null?"":`<small class="st-cmp"${c?` aria-label="España ${fe}; ${c.sr}"`:""}>España ${fe}${c?` · <span class="st-ar" aria-hidden="true">${c.ar==="="?"":c.ar}</span>${c.ar==="="?"":" "}${c.t}`:""}</small>`;
    return `<div class="st-r"><div class="st-l">${l}${nota?`<small>${nota}</small>`:""}</div>
    <div class="st-c"><div class="st-a"><span class="st-ln">${nm}</span></div>
      <div class="st-s"><canvas data-i="${i}" aria-hidden="true"></canvas><i class="st-band" hidden></i><i class="st-m es"></i><i class="st-m me"></i>${c&&c.a?`<b class="st-d" hidden aria-hidden="true">${c.ar} ${c.t}</b>`:""}</div>
      <div class="st-x"><span class="st-e0">${lr[0]}</span><span class="st-le">España</span><span class="st-e1">${lr[1]}</span></div></div>
    <div class="st-v"><span class="st-n">${v==null?'<span class="muted">sin dato</span>':fmtK(kk)(v)}</span>${cl}</div></div>`; }).join("");
  const draw=()=>{ if(!box.isConnected) return; box.querySelectorAll(".st-r").forEach(row=>{ const cv=row.querySelector("canvas"), [kk,,v,e]=K[+cv.dataset.i];
    const W=cv.clientWidth||600, H=38; cv.width=W*2; cv.height=H*2; const x=cv.getContext("2d"); x.scale(2,2);
    const vals=rowsAll().map(q=>q[F[kk]]).filter(z=>z!=null).sort(d3.ascending); if(!vals.length) return;
    const lo=d3.quantile(vals,.01), hi=d3.quantile(vals,.99), X=z=>4+(W-8)*Math.max(0,Math.min(1,(z-lo)/((hi-lo)||1)));
    let seed=7; const rnd=()=>{ seed=(seed*16807)%2147483647; return seed/2147483647; };
    x.fillStyle=css("--ink"); x.globalAlpha=.16; for(const z of vals){ x.fillRect(X(z),4+rnd()*(H-8),1.3,1.3); } x.globalAlpha=1;
    x.fillStyle=css("--rule-2"); x.fillRect(3,2,1,H-4); x.fillRect(W-4,2,1,H-4);
    // marcas y etiquetas: HTML encima del canvas
    const $=s=>row.querySelector(s), put=(el,px)=>{ const w=el.offsetWidth; el.style.left=Math.max(0,Math.min(W-w,px-w/2))+"px"; };
    const xv=v==null?null:X(v), xe=e==null?null:X(e), mv=$(".st-m.me"), me_=$(".st-m.es"), band=$(".st-band"), pill=$(".st-d"), ln=$(".st-ln"), le=$(".st-le");
    mv.hidden=ln.hidden=xv==null; me_.hidden=le.hidden=xe==null; band.hidden=true; if(pill) pill.hidden=true; mv.classList.remove("mix");
    if(xv!=null) mv.style.left=(xv-1.5)+"px";
    if(xe!=null) me_.style.left=(xe-.75)+"px";
    if(xv!=null&&xe!=null){ if(Math.abs(xv-xe)<4){ mv.classList.add("mix"); me_.hidden=true; }
      else{ const a=Math.min(xv,xe), bw=Math.abs(xv-xe); band.hidden=false; band.style.left=a+"px"; band.style.width=bw+"px";
        if(pill){ pill.hidden=false; const pw=pill.offsetWidth; if(bw>=pw+10) pill.style.left=(a+bw/2-pw/2)+"px"; else pill.hidden=true; } } }
    if(xv!=null) put(ln,xv); if(xe!=null) put(le,xe);
    row.querySelectorAll(".st-e0,.st-e1").forEach(el=>{ el.style.visibility="visible"; if(le.hidden) return; const A=le.getBoundingClientRect(), B=el.getBoundingClientRect(); if(B.left<A.right+6&&B.right>A.left-6) el.style.visibility="hidden"; }); }); };
  requestAnimationFrame(draw);
  try{ new ResizeObserver(draw).observe(box); }catch(e){}
  try{ document.fonts.ready.then(draw); }catch(e){}
  box.insertAdjacentHTML("beforeend",`<div class="st-k"><span>Cada punto gris es un municipio</span><span>La franja entre las dos marcas es la diferencia con España</span></div>`);
}
// ---------- minigráficos de cambio ----------
function smalls(box,r,d){
  const es=REFS.es, PY=REFS.padYears, i15=PY.indexOf(2015), iy=REFS.ipvaYears, j15=iy.indexOf(2015), pe=REFS.paro.es;
  const ch=a=>{ const f=a&&a.find(v=>v!=null), l=lastV(a); return f&&l!=null?(l/f-1)*100:null; };
  const out=[];
  if(d.pad){ const a=d.pad.slice(i15), b=es.pad.slice(i15); out.push(["Habitantes",`${sgn(ch(a))} · España ${sgn(ch(b))}`,a,b]); }
  const ri=d.s.net_income_pc; if(ri&&ri.some(v=>v!=null)){ const g=ch(ri), real=g==null?null:((1+g/100)/(REFS.ipc[2024]/REFS.ipc[2015])-1)*100; out.push(["Renta por persona",`${sgn(g)} · sin inflación ${sgn(real)}`,ri,es.net_income_pc]); }
  if(d.paro&&d.paro.y&&d.paro.y.some(v=>v)){ const k25=REFS.paroYears.indexOf(2025)+1||undefined, py=d.paro.y.slice(0,k25), pes=pe.paro.slice(0,k25); out.push(["Paro registrado, 2015–2025",`${sgn(ch(py))} · España ${sgn(ch(pes))}`,py,pes]); }
  if(d.ipva) out.push(["Alquiler declarado",`${sgn(ch(d.ipva.slice(j15)))} · España ${sgn(ch(es.ipva.slice(j15)))}`,d.ipva.slice(j15),es.ipva.slice(j15)]);
  else if(d.s.mean_age&&d.s.mean_age.some(v=>v!=null)){ const a=d.s.mean_age, f=a.find(v=>v!=null); out.push(["Edad media",`${(lastV(a)-f>=0?"+":"−")+nf1.format(Math.abs(lastV(a)-f))} años · España +${nf1.format(lastV(es.mean_age)-es.mean_age[0])}`,a,es.mean_age]); }
  box.innerHTML=out.map(([t,dd,a,b])=>`<div class="sm"><div class="t">${t}</div><div class="d">${dd}</div>${miniLines(a,b,{w:200,h:54})}</div>`).join("")||'<p class="muted">No hay series publicadas para este municipio.</p>';
}
function scrollSec(k){ const s=document.getElementById("s-"+k); if(!s) return; const off=(document.getElementById("top").offsetHeight||58)+50; window.scrollTo({top:s.getBoundingClientRect().top+window.scrollY-off}); }

function drawLocator(code,P){
  const box=document.querySelector("#locator svg"); if(!box) return;
  const me=FEATS.find(f=>f.id===code); if(!me) return;
  // el término y sus vecinos: encuadre alrededor del municipio, solo contornos, el tuyo rayado y con su nombre
  const [[x0,y0],[x1,y1]]=d3.geoBounds(me), cx=(x0+x1)/2, cy=(y0+y1)/2, hw=Math.max(.05,(x1-x0)*1.05), hh=Math.max(.04,(y1-y0)*1.05);
  const near=FEATS.filter(f=>{ const [[a,b],[c,d]]=d3.geoBounds(f); return c>cx-hw*1.6&&a<cx+hw*1.6&&d>cy-hh*1.6&&b<cy+hh*1.6; });
  const frame={type:"MultiPoint",coordinates:[[cx-hw,cy-hh],[cx+hw,cy+hh]]};
  const proj=d3.geoMercator().fitExtent([[4,4],[256,196]],frame), path=d3.geoPath(proj), svg=d3.select(box);
  svg.append("defs").html(`<pattern id="lochatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="${css("--card")}"/><line x1="0" y1="0" x2="0" y2="6" stroke="${css("--rust")}" stroke-width="1.6" opacity=".55"/></pattern><clipPath id="locclip"><rect width="260" height="200"/></clipPath>`);
  const g=svg.append("g").attr("clip-path","url(#locclip)");
  g.selectAll("path").data(near).join("path").attr("d",path).attr("fill",f=>f.id===code?"url(#lochatch)":"transparent").attr("stroke",f=>f.id===code?css("--rust"):css("--rule-2")).attr("stroke-width",f=>f.id===code?1.8:.8)
    .style("cursor","pointer").on("click",(e,f)=>{ if(BYCODE.has(f.id)) go(f.id); }).append("title").text(f=>{const x=BYCODE.get(f.id); return x?x[F.name]:f.properties.name;});
  g.selectAll("path").filter(f=>f.id===code).raise();
  const [lx,ly]=path.centroid(me), nm=dispName(BYCODE.get(code)[F.name]);
  svg.append("text").attr("x",lx).attr("y",ly+5).attr("text-anchor","middle").attr("font-weight",700).attr("font-size",14).attr("paint-order","stroke").attr("stroke",css("--card")).attr("stroke-width",4).attr("fill",css("--ink")).attr("pointer-events","none").text(nm.length>22?nm.slice(0,20)+"…":nm);
}

// caídas bruscas de un año para otro: segregaciones de municipios o depuraciones del padrón
function padBreak(a,from){ const PY=REFS.padYears; if(!a) return null; for(let i=Math.max(1,PY.indexOf(from)+1);i<a.length;i++) if(a[i-1]>1000&&a[i]&&a[i]/a[i-1]<0.85) return {y:PY[i],lost:a[i-1]-a[i]}; return null; }
function summary(r,d){
  const s=d.s, es=REFS.es, PY=REFS.padYears, i15=PY.indexOf(2015);
  const pop=d.pad?d.pad[d.pad.length-1]:last(s.population)[0], g=d.pad&&d.pad[i15]?(pop/d.pad[i15]-1)*100:growth(s.population);
  const inc=r[F.renta], esInc=esMean("renta"), [age]=last(s.mean_age), [esAge]=last(es.mean_age);
  let t=pop!=null?`<b>${nf0.format(pop)} habitantes</b>`:"";
  if(g!=null&&!padBreak(d.pad,2015)) t+=g>=3?`, un ${nf0.format(g)}${NB}% más que en 2015`:g<=-3?`, un ${nf0.format(-g)}${NB}% menos que en 2015`:`, casi los mismos que en 2015`;
  t+=". ";
  if(inc!=null){ const ratio=inc/esInc*100; t+=`Cada vecino ingresa de media ${eur(inc)} netos al año, ${ratio>=110?`un ${nf0.format(ratio-100)}${NB}% más que la media de España`:ratio<=90?`un ${nf0.format(100-ratio)}${NB}% menos que la media de España`:"cerca de la media de España"}`; }
  if(age!=null&&esAge!=null) t+= age-esAge>=4?", y su población está bastante envejecida.": age-esAge<=-3?", y su población es más joven que la media.":".";
  else if(inc!=null) t+=".";
  return t;
}

// ---------- qué mide cada dato: el texto del icono «i» de las tablas (ficha y comparación) ----------
const QUEMIDE={
  pop:"Las personas empadronadas en el municipio. No cuenta a quien vive allí sin empadronarse, ni a los turistas, así que en los pueblos de veraneo se queda corto en verano.",
  varPob:"Cuántos vecinos ha ganado o perdido el municipio en diez años, en porcentaje sobre los que tenía en 2015. Un +10 % son diez vecinos más por cada cien.",
  edad:"El promedio de edad de todos los vecinos, recién nacidos incluidos. Sube tanto porque hay muchos mayores como porque nacen pocos niños o se van los jóvenes.",
  extr:"Vecinos con nacionalidad de otro país, por cada 100 habitantes. Quien se nacionaliza español deja de contar aquí, aunque haya nacido fuera.",
  migExt:"Cuánta gente llega del extranjero menos cuánta se va, por cada 1.000 habitantes y año. Si es positivo, el municipio gana vecinos por esta vía.",
  migInt:"Lo mismo con las mudanzas dentro de España: llegadas desde otros municipios menos salidas hacia ellos, por cada 1.000 habitantes y año.",
  solos:"Hogares en los que vive una sola persona, por cada 100 hogares. Son muchos tanto donde hay viudas mayores como donde hay jóvenes que acaban de independizarse.",
  renta:"Lo que entra en un hogar en un año después de pagar impuestos y cotizaciones, repartido entre todas las personas que viven en él, niños y jubilados incluidos. No es un sueldo: un hogar de cuatro personas con 60.000 € netos cuenta como 15.000 € por persona.",
  rentaHog:"Lo mismo, pero sin repartir entre los miembros del hogar. Sale más alta donde los hogares son grandes o donde trabajan varias personas en cada uno.",
  pobreza:"Vecinos que viven con menos del 60 % de la renta mediana de España, ajustada por el tamaño del hogar. Es pobreza relativa: depende de cómo esté el resto del país, no de una cesta de la compra.",
  gini:"Cuánto se reparte la renta dentro del municipio, de 0 a 100: sería 0 si todos ingresaran lo mismo y 100 si una sola persona lo ingresara todo. En España ronda 30.",
  pensiones:"Qué parte de lo que ingresan los hogares del municipio son pensiones. Sube donde hay muchos jubilados y, sobre todo, donde hay pocos sueldos con los que compararlas.",
  paroReg:"Los apuntados como demandantes de empleo en las oficinas del SEPE por cada 100 vecinos de 16 a 64 años, busquen trabajo o no. Sale más bajo que la tasa de paro porque se reparte entre toda la población en edad de trabajar.",
  paroCensal:"Los parados por cada 100 personas que trabajan o buscan trabajo. Es la tasa de paro de toda la vida, aunque el censo la da más alta que la Encuesta de Población Activa: sirve sobre todo para comparar unos lugares con otros.",
  superiores:"Adultos que han terminado una carrera universitaria o una formación profesional de grado superior, por cada 100 adultos.",
  alquiler:"Hogares que viven de alquiler, por cada 100 hogares. El resto son propietarios o tienen la vivienda cedida.",
  noPrincipal:"Viviendas que no son la casa habitual de nadie: segundas residencias y pisos vacíos. En la costa y en la montaña llegan a ser la mitad del parque.",
  vt:"Pisos anunciados para alquiler turístico, por cada 100 viviendas del municipio. El INE los cuenta a partir de los anuncios de las plataformas.",
  alqVar:"Cuánto ha subido el alquiler que se declara a Hacienda entre 2015 y 2024. Incluye los contratos antiguos, así que sube menos que los precios de los anuncios, que son los que ve quien busca piso hoy.",
  part:"Votantes por cada 100 personas con derecho a voto en las generales de julio de 2023.",
  pp:"Votos al PP por cada 100 votos válidos en las generales de julio de 2023 (los válidos son los votos a candidaturas más los votos en blanco).",
  psoe:"Votos al PSOE por cada 100 votos válidos en las generales de julio de 2023 (los válidos son los votos a candidaturas más los votos en blanco).",
  vox:"Votos a Vox por cada 100 votos válidos en las generales de julio de 2023 (los válidos son los votos a candidaturas más los votos en blanco).",
  sumar:"Votos a Sumar y sus aliados por cada 100 votos válidos en las generales de julio de 2023 (los válidos son los votos a candidaturas más los votos en blanco)."};
// el icono que abre la explicación; sin texto para esa clave, no se pinta nada
const IQ_SVG='<svg class="iqs" viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" focusable="false"><circle class="iqc" cx="10" cy="10" r="9.5"/><path d="M7.3 8.9 10.4 7.7H11.7V14.5H13.3V15.6H6.7V14.5H8.4V8.9ZM10 3.65a1.35 1.35 0 1 0 0 2.7 1.35 1.35 0 1 0 0-2.7Z"/></svg>';
const iQue=(k,lab)=>QUEMIDE[k]?`<button type="button" class="iq" data-q="${k}" data-ql="${esc(lab||labK(k))}" aria-label="Qué mide ${esc(lab||labK(k))}">${IQ_SVG}</button>`:"";
const bindQue=root=>tipBind(root.querySelectorAll(".iq"),b=>`<b>${esc(b.dataset.ql)}:</b> ${esc(QUEMIDE[b.dataset.q])}`);

// ---------- de un vistazo ----------
const GLANCE=[
  ["Población",[["pop","Habitantes","Padrón, 2025",false],["varPob","Crecimiento desde 2015","Padrón"],["edad","Edad media","2023"],["extr","Nacionalidad extranjera","2023"],["migExt","Llegadas netas del extranjero","por 1.000 hab. y año, 2021–2024"],["migInt","Saldo con el resto de España","por 1.000 hab. y año, 2021–2024"],["solos","Hogares de una persona","2023"]]],
  ["Dinero",[["renta","Renta neta por persona","2024"],["pobreza","Riesgo de pobreza","2023"],["gini","Desigualdad (Gini)","2023"],["pensiones","Peso de las pensiones","en los ingresos, 2023"]]],
  ["Trabajo y estudios",[["paroReg","Paro registrado","apuntados al SEPE por cada 100 personas de 16 a 64 años, 2025"],["paroCensal","Tasa de paro","por cada 100 que trabajan o buscan trabajo, censo de 2024"],["superiores","Estudios superiores","adultos, censo de 2021"]]],
  ["Vivienda",[["alquiler","Hogares de alquiler","Censo de 2021"],["noPrincipal","Viviendas vacías o secundarias","Censo de 2021"],["vt","Viviendas turísticas","mayo de 2026"]]],
  ["Voto",[["part","Participación","generales de 2023"]]]];
function glance(box,r,d){
  let h=`<table class="glance"><thead><tr><th>Dato</th><th class="r">Aquí</th><th class="r">España</th><th class="pos">Posición entre toda la población</th></tr></thead><tbody>`;
  for(const [g,rows] of GLANCE){
    h+=`<tr class="grp"><td colspan="4">${g}</td></tr>`;
    for(const [k,l,yr,showE] of rows){
      let v=r[F[k]]; if(k==="pop"&&d.pad) v=d.pad[d.pad.length-1];
      const f=fmtK(k), e=k==="pop"?null:esMean(k), p=pctl(k,v);
      h+=`<tr><td class="lab">${l}${iQue(k,l)}<small>${yr}</small></td><td class="v r">${v==null?'<span class="muted" style="font-weight:400">sin dato</span>':f(v)}</td><td class="e r">${e==null?"":f(e)}</td><td class="pos">${p==null||k==="pop"?"":`<div class="strip" title="Por encima del ${nf0.format(p)} % de la población de España"><span class="mid"></span><span class="dot" style="left:${Math.max(2,Math.min(98,p))}%"></span></div>`}</td></tr>`;
    }
  }
  h+=`</tbody></table><p class="muted" style="font-size:13px;margin-top:8px">Pulsa la <i>i</i> de cada fila para ver qué mide exactamente ese dato. La media de España pondera cada municipio por su población. Los datos tienen años distintos porque cada estadística se publica a su ritmo. En los municipios pequeños el INE no publica algunos datos.</p>`;
  box.innerHTML=h;
  bindQue(box);
}

const lead=(s,html)=>add(s,"p","lead",html);
const block=(s,title)=>{ const b=add(s,"div","block"); if(title) add(b,"h3",null,title); return b; };
const vs=(a,b,th,more,less,same)=>a==null||b==null?"":Math.abs(a-b)<(th||1)?(same||"parecido a"):a>b?(more||"más que"):(less||"menos que");

// ---------- población ----------
function secCrece(s,r,d){
  const st=d.s, es=REFS.es, pr=REFS.prov[r[F.prov]], PY=REFS.padYears, i15=PY.indexOf(2015);
  const pg=a=>a&&a[i15]&&a[a.length-1]?(a[a.length-1]/a[i15]-1)*100:null;
  const g=d.pad?pg(d.pad):growth(st.population), gE=pg(es.pad);
  const [f1]=last(st.pct_foreign), [f0]=first(st.pct_foreign), [fE]=last(es.pct_foreign), c=d.census||{};
  let t=g==null?"No hay serie de población publicada.":g>=3?`Crece. Entre 2015 y 2025 ha ganado un <mark>${nf1.format(g)}${NB}%</mark> de habitantes; España, un ${nf1.format(gE)}${NB}%.`:g<=-3?`Se vacía. Entre 2015 y 2025 ha perdido un <mark>${nf1.format(-g)}${NB}%</mark> de sus habitantes, mientras España crecía un ${nf1.format(gE)}${NB}%.`:`Se mantiene: ${sgn(g)} entre 2015 y 2025, frente al ${sgn(gE)} de España.`;
  if(d.pad&&d.pad[0]) t+=` En 1996 tenía ${nf0.format(d.pad[0])} vecinos.`;
  const br=padBreak(d.pad,1996); if(br) t+=` Atención: en ${br.y} el padrón perdió ${nf0.format(br.lost)} habitantes de golpe. Suele deberse a que una parte del término se separó como municipio propio o a una depuración del padrón, no a que la gente se fuera.`;
  if(f1!=null) t+=` El ${pc(f1)} tiene nacionalidad extranjera (España: ${pc(fE)})${f0!=null&&Math.abs(f1-f0)>=1?`, ${nf1.format(Math.abs(f1-f0))} puntos ${f1>f0?"más":"menos"} que en 2015`:""}.`;
  if(c.foreignBorn!=null) t+=` Contando a quienes nacieron fuera y ya tienen nacionalidad española, en 2021 era el ${pc(c.foreignBorn)}.`;
  lead(s,t);
  const g1=add(s,"div","cols2");
  if(d.pad) lineChart(g1,{title:"Habitantes, 1996 = 100",source:"Fuente: INE, padrón municipal. 1997 es una estimación: ese año no hubo padrón.",series:[{n:r[F.name],v:d.pad,c:"--s-mun",main:true},{n:"Provincia",v:pr.pad,c:"--s-prov"},{n:"España",v:es.pad,c:"--s-es"}],years:PY,xticks:[1996,2010,2025],index:true});
  else lineChart(g1,{title:"Habitantes, 2015 = 100",series:S3(r,d,"population"),index:true});
  lineChart(g1,{title:"Población con nacionalidad extranjera",source:"% de la población. Fuente: INE, Atlas de Renta.",series:S3(r,d,"pct_foreign"),fmt:pc,tickFmt:v=>nf0.format(v)+"%"});
  if(d.mig){ const MY=REFS.migYears, M=d.mig, b=block(s,"Quién llega y quién se va");
    const te=d3.sum(M,m=>m[1]||0), ti=d3.sum(M,m=>m[2]||0);
    add(b,"p",null,`Entre ${MY[0]} y ${MY[MY.length-1]}, ${esc(r[F.name])} ganó en neto ${nf0.format(Math.abs(te))} vecinos llegados del extranjero${te<0?" (en realidad, perdió)":""} y ${ti>=0?"ganó":"perdió"} ${nf0.format(Math.abs(ti))} en sus intercambios con el resto de España: gente que se muda desde o hacia otros municipios.`).style.cssText="max-width:var(--medida);color:var(--ink-2);margin-bottom:12px";
    const f=fig(b,{title:"Saldo migratorio por año",source:"Llegadas menos salidas. Fuente: INE, Estadística de Migraciones y Cambios de Residencia."});
    const mx=d3.max(M.flatMap(m=>[Math.abs(m[1]||0),Math.abs(m[2]||0)]))||1;
    const w=add(f.body,"div","cmp");
    w.innerHTML=`<div class="keys"><span><i style="background:var(--slate)"></i>Con el extranjero</span><span><i style="background:var(--rust)"></i>Con el resto de España</span></div>`+M.map((m,i)=>`<div class="cmp-row"><div class="n">${MY[i]}</div><div class="bars">${[[m[1],"--slate"],[m[2],"--rust"]].map(([v,c])=>`<div class="b"><span style="width:${Math.abs(v||0)/mx*100}%;background:var(${c});${(v||0)<0?"opacity:.5":""}"></span><em>${v==null?"—":(v>0?"+":v<0?"−":"")+nf0.format(Math.abs(v))}</em></div>`).join("")}</div></div>`).join("");
    add(f.body,"figcaption",null,"Las barras claras son saldos negativos: se fue más gente de la que llegó.");
  }
}

// ---------- quién vive ----------
function secGente(s,r,d){
  const st=d.s, es=REFS.es, c=d.census||{}, ce=REFS.census.es, cp=REFS.census.prov[r[F.prov]]||{};
  const [age]=last(st.mean_age), [age0]=first(st.mean_age), [eAge]=last(es.mean_age), [u18]=last(st.pct_under18), [o65]=last(st.pct_over65), [solo]=last(st.pct_single_hh), [eSolo]=last(es.pct_single_hh);
  let t="";
  if(age!=null) t+=`La edad media es de <mark>${nf1.format(age)} años</mark>, ${vs(age,eAge,1,`${nf1.format(age-eAge)} más que`,`${nf1.format(eAge-age)} menos que`,"parecida a")} la de España${age0!=null&&age-age0>=0.5?`, y ha subido ${nf1.format(age-age0)} años desde 2015`:""}.`;
  if(u18!=null&&o65!=null&&u18>0) t+=` Por cada 10 menores de 18 años hay ${nf0.format(o65/u18*10)} mayores de 65.`;
  if(solo!=null) t+=` En ${deCadaDiez(solo)} hogares vive una sola persona (España: ${pc(eSolo)}).`;
  lead(s,t||"No hay datos de edad publicados para este municipio.");
  const g=add(s,"div","cols2");
  const b1=block(g,"Edades"); stackBars(b1,{rows:[{l:r[F.name],v:c,me:true},{l:"Provincia",v:cp},{l:"España",v:ce}],cats:[{k:"u16",l:"Menores de 16",c:"--ramp-1"},{k:"a1664",l:"De 16 a 64",c:"--ramp-3"},{k:"o64",l:"65 y más",c:"--ramp-5"}],note:"% de la población. Censo de 2021."});
  const b2=block(g,"Tamaño de los hogares"); stackBars(b2,{rows:[{l:r[F.name],v:c,me:true},{l:"Provincia",v:cp},{l:"España",v:ce}],cats:[{k:"hh1",l:"1 persona",c:"--ramp-1"},{k:"hh2",l:"2",c:"--ramp-2"},{k:"hh3",l:"3",c:"--ramp-3"},{k:"hh4",l:"4",c:"--ramp-4"},{k:"hh5",l:"5 o más",c:"--ramp-6"}],note:"% de los hogares. Censo de 2021."});
  const g2=add(s,"div","cols2"); g2.style.marginTop="26px";
  lineChart(g2,{title:"Edad media",source:"Fuente: INE, Atlas de Renta.",series:S3(r,d,"mean_age"),fmt:v=>nf1.format(v)+" años"});
  lineChart(g2,{title:"Mayores de 65 años",source:"% de la población. Fuente: INE, Atlas de Renta.",series:S3(r,d,"pct_over65"),fmt:pc,tickFmt:v=>nf0.format(v)+"%"});
}

// ---------- renta y trabajo ----------
function secVive(s,r,d){
  const st=d.s, es=REFS.es, c=d.census||{}, ce=REFS.census.es, cp=REFS.census.prov[r[F.prov]]||{};
  const inc=r[F.renta], eInc=esMean("renta"), gI=r[F.rentaVar], gE=esMean("rentaVar"), hh=r[F.rentaHog], [wage]=last(st.wage), [pen]=last(st.pension), [ePen]=last(es.pension);
  let t="";
  if(inc!=null) t+=`Cada vecino ingresa de media <mark>${eur(inc)} netos al año</mark>${hh!=null?`, unos ${eur(Math.round(hh/100)*100)} por hogar`:""}. Es el ${nf0.format(inc/eInc*100)}${NB}% de la media de España${gI!=null?`, y ha subido un ${nf0.format(gI)}${NB}% desde 2015 (España: ${nf0.format(gE)}${NB}%); descontando la inflación, un ${nf0.format(((1+gI/100)/(REFS.ipc[2024]/REFS.ipc[2015])-1)*100)}${NB}%`:""}.`;
  if(wage!=null&&pen!=null) t+=` De cada 100 euros que entran en los hogares, ${nf0.format(wage)} son salarios y ${nf0.format(pen)} pensiones${pen>=ePen+8?", bastante más que en el conjunto de España":""}.`;
  if(c.unemp!=null) t+=` Según el censo de 2021, la tasa de paro (parados entre quienes trabajan o buscan empleo) era del ${pc(c.unemp)} (España: ${pc(ce.unemp)}), una medida distinta del paro registrado y el ${pc(c.higherEd)} de los adultos tenía estudios superiores (${pc(ce.higherEd)}).`;
  lead(s,t||"No hay datos de renta publicados para este municipio.");
  add(s,"div","aside",EXPLAIN_RENTA);
  const g=add(s,"div","cols2"); g.style.marginTop="22px";
  realChart(g,{title:"Renta neta por persona",source:"Fuente: INE, Atlas de Renta e IPC.",series:S3(r,d,"net_income_pc"),fmt:eur,tickFmt:v=>nf0.format(v/1000)+" mil"});
  lineChart(g,{title:"Peso de las pensiones en los ingresos",source:"% de los ingresos. Fuente: INE, Atlas de Renta.",series:S3(r,d,"pension"),fmt:pc,tickFmt:v=>nf0.format(v)+"%"});
  const IC=[{k:"wage",l:"Salarios",c:"--slate"},{k:"pension",l:"Pensiones",c:"--mustard"},{k:"unemp_benefit",l:"Paro",c:"--rust"},{k:"other_benefits",l:"Otras ayudas",c:"--plum"},{k:"other_income",l:"Otros",c:"--stone"}];
  const src=lastSrc(r,d,IC.map(x=>x.k));
  const b1=block(s,"De dónde salen los ingresos");
  stackBars(b1,{rows:[{l:r[F.name],v:src.m,me:true},{l:"Provincia",v:src.p},{l:"España",v:src.e}],cats:IC,note:"% de los ingresos, 2023. Otros: rentas del capital, alquileres y trabajo por cuenta propia, entre otros."});
  const b2=block(s,"A qué se dedican los adultos");
  stackBars(b2,{rows:[{l:r[F.name],v:c,me:true},{l:"Provincia",v:cp},{l:"España",v:ce}],cats:[{k:"employ",l:"Trabaja",c:"--slate"},{k:"unemployed",l:"En paro",c:"--rust"},{k:"retired",l:"Jubilada",c:"--mustard"},{k:"student",l:"Estudia",c:"--olive"},{k:"disab",l:"Incapacidad",c:"--plum"},{k:"otherInact",l:"Otra",c:"--stone"}],note:"% de las personas de 16 años o más. Otra: tareas del hogar y otras situaciones. Censo de 2021."});
  if(d.paro&&d.paro.last&&d.paro.last[0]!=null){ const PR=d.paro, PY=REFS.paroYears, pe=REFS.paro.es, pp=REFS.paro.prov[r[F.prov]]||{};
    const bp=block(s,`Paro registrado, ${REFS.paroLast}`);
    const now=PR.last[0], prev=PR.prev;
    add(bp,"p",null,`En ${REFS.paroLast} había <b>${nf0.format(now)} personas</b> apuntadas al paro.${r[F.paroReg]!=null?` De media en 2025, el paro registrado equivalía al ${pc(r[F.paroReg])} de la población de 16 a 64 años (España: ${pc(pe.paro[10]/pe.pob1664*100)}).`:""}${prev?` Hace un año eran ${nf0.format(prev)}: ${now<prev?`${nf0.format(prev-now)} menos`:now>prev?`${nf0.format(now-prev)} más`:"las mismas"}.`:""}${PR.y[0]?` En 2015 la media fue de ${nf0.format(PR.y[0])}.`:""}`).style.cssText="max-width:var(--medida);color:var(--ink-2);margin-bottom:12px";
    const g2=add(bp,"div","cols2");
    lineChart(g2,{title:"Paro registrado, 2015 = 100",source:"Media de cada año; 2026, de enero a septiembre. Fuente: SEPE.",series:[{n:r[F.name],v:PR.y,c:"--s-mun",main:true},{n:"Provincia",v:pp.paro,c:"--s-prov"},{n:"España",v:pe.paro,c:"--s-es"}],years:PY,xticks:[2015,2020,2026],index:true});
    const L=PR.last, c2=add(g2,"div");
    const sh=a=>{ const t=a[5]+a[6]+a[7]+a[8]+a[9]||1; return {agr:a[5]/t*100,ind:a[6]/t*100,con:a[7]/t*100,ser:a[8]/t*100,sin:a[9]/t*100}; };
    stackBars(c2,{rows:[{l:r[F.name],v:sh(L),me:true},{l:"España",v:sh(pe.last)}],
      cats:[{k:"ser",l:"Servicios",c:"--slate"},{k:"ind",l:"Industria",c:"--plum"},{k:"con",l:"Construcción",c:"--mustard"},{k:"agr",l:"Agricultura",c:"--olive"},{k:"sin",l:"Sin empleo anterior",c:"--stone"}],note:`% de las personas en paro según el sector de su último empleo (${REFS.paroLast}). En los municipios pequeños el SEPE no da cifras de menos de 5.`});
  }
  const b3=block(s,"Paro y estudios");
  cmpRows(b3,r[F.name],[["unemp","Tasa de paro en 2021","% de quien trabaja o busca empleo"],["activity","Tasa de actividad","% de adultos que trabaja o busca empleo"],["higherEd","Estudios superiores","% de adultos"]],cenSrc(r,d));
  add(b3,"figcaption",null,"Censo de 2021, el que permite comparar con la provincia y con España; la tasa de paro de 2024 está en «Todos los datos en una tabla». El censo da tasas de paro más altas que la Encuesta de Población Activa: sirve para comparar lugares.");
}

// ---------- desigualdad ----------
function secTodos(s,r,d){
  const st=d.s, es=REFS.es;
  const [g]=last(st.gini), [eg]=last(es.gini), [pov]=last(st.poverty), [ePov]=last(es.poverty), [pu]=last(st.pov_u18), [po]=last(st.pov_o65), [pes]=last(st.pov_es), [pex]=last(st.pov_ext);
  let t="";
  if(pov!=null) t+=`El <mark>${pc(pov)}</mark> de los vecinos está en riesgo de pobreza (España: ${pc(ePov)}).`;
  if(pu!=null&&po!=null) t+=` Afecta al ${pc(pu)} de los menores y al ${pc(po)} de los mayores de 65.`;
  if(pes!=null&&pex!=null) t+=` Entre la población extranjera llega al ${pc(pex)}, frente al ${pc(pes)} de la española.`;
  if(g!=null) t+=` Su índice de Gini es ${nf1.format(g)} (España: ${nf1.format(eg)}): ${g>eg+2?"más desigual que la media":g<eg-2?"más igualitario que la media":"una desigualdad parecida a la media"}.`;
  lead(s,t||"El INE no publica indicadores de desigualdad para municipios tan pequeños.");
  add(s,"div","aside",`<p><b>Riesgo de pobreza</b> quiere decir ingresos por debajo del 60${NB}% de la mediana de España, ajustados por el tamaño del hogar. Mide falta de ingresos, no carencias materiales. <b>El índice de Gini</b> va de 0, si todos ingresaran lo mismo, a 100, si una sola persona lo ingresara todo.</p>`);
  const g1=add(s,"div","cols2"); g1.style.marginTop="22px";
  lineChart(g1,{title:"Población en riesgo de pobreza",source:"% de la población. Fuente: INE, Atlas de Renta.",series:S3(r,d,"poverty"),fmt:pc,tickFmt:v=>nf0.format(v)+"%"});
  if(pu!=null||pes!=null){ const b=add(g1,"div"); add(b,"div","ct","Quién está en riesgo de pobreza").style.cssText="font-size:15px;font-weight:700;margin-bottom:8px";
    cmpRows(b,r[F.name],[["pov_u18","Menores de 18",""],["pov_1864","De 18 a 64",""],["pov_o65","65 y más",""],["pov_es","Nacionalidad española",""],["pov_ext","Nacionalidad extranjera",""]],lastSrc(r,d,["pov_u18","pov_1864","pov_o65","pov_es","pov_ext"])); }
  else lineChart(g1,{title:"Desigualdad (índice de Gini)",source:"Fuente: INE, Atlas de Renta.",series:S3(r,d,"gini"),fmt:v=>nf1.format(v)});
  const b=block(s,"Barrio a barrio");
  add(b,"p",null,`<span class="muted">Renta por persona en cada sección censal, la zona más pequeña que publica el INE. Los colores son los diez grupos de renta de toda España. Más contexto en <a href="/temas/riqueza/">Riqueza</a>.</span>`).style.marginBottom="10px";
  seccExplorer(b,r[F.code],{});
}

// ---------- vivienda ----------
function secVivienda(s,r,d){
  const c=d.census||{}, ce=REFS.census.es, cp=REFS.census.prov[r[F.prov]]||{}, es=REFS.es, pr=REFS.prov[r[F.prov]];
  let t="";
  if(c.rented!=null) t+=`El <mark>${pc(c.rented)}</mark> de los hogares vive de alquiler (España: ${pc(ce.rented)}).`;
  if(c.secondary!=null) t+=` De cada 100 viviendas, ${nf0.format(c.secondary)} no son la residencia habitual de nadie: segundas residencias o vacías (España: ${nf0.format(ce.secondary)}).`;
  if(d.vt){ const lv=d.vt[d.vt.length-1], lp=d.vtp[d.vtp.length-1]; t+=lv?` Hay ${nf0.format(lv)} viviendas turísticas, el ${pc(lp)} del total (España: ${pc(es.vtp[es.vtp.length-1])}).`:" No consta ninguna vivienda turística."; }
  lead(s,t||"No hay datos del censo de vivienda para este municipio.");
  const b1=block(s,"Cómo se ocupa la vivienda");
  stackBars(b1,{rows:[{l:r[F.name],v:c,me:true},{l:"Provincia",v:cp},{l:"España",v:ce}],cats:[{k:"owned",l:"En propiedad",c:"--mustard"},{k:"rented",l:"De alquiler",c:"--rust"},{k:"otherTenure",l:"Otras formas",c:"--stone"}],note:"% de los hogares. Otras formas: cedida gratis o a bajo precio, por ejemplo por la familia o la empresa. Censo de 2021."});
  const iy=REFS.ipvaYears, i15=iy.indexOf(2015);
  const b2=block(s,"Alquiler y renta");
  if(d.ipva){ const alq=d.ipva.slice(i15), inc=d.s.net_income_pc, incI=inc.map(v=>v==null||!inc[0]?null:v/inc[0]*100), ga=alq[alq.length-1]-100, gi=incI[incI.length-1]-100;
    add(b2,"p",null,`Entre 2015 y 2024 el alquiler medio subió aquí un <b>${nf0.format(ga)}${NB}%</b> y la renta por persona un <b>${nf0.format(gi)}${NB}%</b>${ga>gi?": el alquiler ha subido más que la renta, algo que solo pasa en un puñado de municipios.":"."} El alquiler medio incluye contratos antiguos; los nuevos suben bastante más (ver <a href="/temas/vivienda/">Vivienda</a>).`).style.cssText="max-width:var(--medida);color:var(--ink-2);margin-bottom:14px";
    const g=add(b2,"div","cols2");
    lineChart(g,{title:"Cuánto han subido desde 2015",sub:"2015 = 100",source:"Fuente: INE, Índice de Precios de Vivienda en Alquiler y Atlas de Renta.",series:[{n:"Alquiler aquí",v:alq,c:"--rust",main:true},{n:"Renta aquí",v:incI,c:"--slate"},{n:"Alquiler España",v:es.ipva.slice(i15),c:"--mustard",dash:true}],fmt:v=>nf1.format(v)}); }
  else add(b2,"p","muted","El INE solo publica el índice de alquiler de municipios de más de 10.000 habitantes.");
  if(d.vt&&d3.max(d.vt)>0){ const per=REFS.vtPeriods.map(p=>p.replace(/^(\d{4})M(\d\d)$/,(m,y,mm)=>MES[+mm].slice(0,3)+". "+y.slice(2)));
    const b3=block(s,"Viviendas turísticas"); const g=add(b3,"div","cols2");
    lineChart(g,{title:"Viviendas turísticas, % del total",source:"Fuente: INE, estadística experimental de viviendas turísticas.",series:[{n:r[F.name],v:d.vtp,c:"--s-mun",main:true},{n:"Provincia",v:pr.vtp,c:"--s-prov"},{n:"España",v:es.vtp,c:"--s-es"}],years:per,xticks:[per[0],per[Math.floor(per.length/2)],per[per.length-1]],fmt:pc,tickFmt:v=>nf1.format(v)+"%"});
    lineChart(g,{title:"Número de viviendas turísticas",source:"Fuente: INE.",series:[{n:r[F.name],v:d.vt,c:"--s-mun",main:true}],years:per,xticks:[per[0],per[Math.floor(per.length/2)],per[per.length-1]],fmt:v=>nf0.format(v)}); }
}

// ---------- empleo, compraventas y deuda (SEPE, Seguridad Social, Ministerio de Vivienda, Hacienda) ----------
function perHab(v,ys,pad,por){ if(!v||!pad) return null; const PY=REFS.padYears; return v.map((x,i)=>{ const j=PY.indexOf(ys[i]), p=j>=0?pad[j]:null; return x==null||!p?null:x/p*por; }); }
function secMas(s,r,d){
  const O=REFS.otras; if(!O){ lead(s,"No hay datos de estas fuentes."); return; }
  const P=r[F.prov], op=O.prov[P]||{}, oe=O.es, pr=REFS.prov[P], es=REFS.es, Y=O.years, nm=dispName(r[F.name]);
  const lo=(a,ys)=>{ if(!a) return [null,null]; for(let i=a.length-1;i>=0;i--) if(a[i]!=null) return [a[i],ys[i]]; return [null,null]; };
  const t=[];
  const [a25]=lo(d.afil,Y.afil), a11=d.afil?d.afil[0]:null;
  if(a25!=null&&a11) t.push(`En diciembre de 2025 trabajaban aquí <mark>${nf0.format(a25)}</mark> afiliados a la Seguridad Social, ${(g=>`un ${nf0.format(Math.abs(g))}${NB}% ${g>=0?"más":"menos"}`)((a25/a11-1)*100)} que en 2011 (España: ${sgn((lo(oe.afil,Y.afil)[0]/oe.afil[0]-1)*100)}).`);
  const [ct,cy]=lo(d.contrT,Y.contrT), i21=Y.contrT.indexOf(2021);
  if(ct!=null) t.push(`El ${pc(ct)} de los contratos firmados en ${cy} fueron temporales${d.contrT[i21]!=null?`, frente al ${pc(d.contrT[i21])} de 2021, antes de la reforma laboral`:""} (España: ${pc(lo(oe.contrT,Y.contrT)[0])}).`);
  const [dd,dy]=lo(d.deuda,Y.deuda), pad=lastV(d.pad);
  if(dd!=null&&pad) t.push(dd>0?`El ayuntamiento debía ${eur(dd/pad)} por habitante a final de ${dy} (media de los ayuntamientos de España: ${eur(lo(oe.deuda,Y.deuda)[0]/lastV(es.pad))}).`:`El ayuntamiento no tenía deuda a final de ${dy}.`);
  lead(s,t.join(" ")||"No hay datos de estas fuentes para este municipio.");
  if(d.afil||d.contrT){ const b=block(s,"Empleo y contratos"), g=add(b,"div","cols2");
    if(d.afil) lineChart(g,{title:"Afiliados a la Seguridad Social",sub:"2011 = 100, en diciembre de cada año",source:"Fuente: Seguridad Social (afiliados según el municipio del centro de trabajo).",series:[{n:nm,v:d.afil,c:"--s-mun",main:true},{n:"Provincia",v:op.afil,c:"--s-prov"},{n:"España",v:oe.afil,c:"--s-es"}],years:Y.afil,index:true,fmt:v=>nf1.format(v),xticks:[2011,2018,2025]});
    if(d.contrT) lineChart(g,{title:"Contratos iniciales temporales",sub:"% de los contratos firmados cada año",source:"Fuente: SEPE. La reforma laboral se aplica desde 2022.",series:[{n:nm,v:d.contrT,c:"--s-mun",main:true},{n:"Provincia",v:op.contrT,c:"--s-prov"},{n:"España",v:oe.contrT,c:"--s-es"}],years:Y.contrT,fmt:pc,tickFmt:v=>nf0.format(v)+"%",xticks:[2006,2015,2025]}); }
  if(d.comp||d.vtas){ const b=block(s,"Compraventas de vivienda"), g=add(b,"div","cols2");
    if(d.comp) lineChart(g,{title:"Compraventas de vivienda por cada 1.000 habitantes",source:"Fuente: Ministerio de Vivienda (datos de los notarios) y padrón.",series:[{n:nm,v:perHab(d.comp,Y.comp,d.pad,1000),c:"--s-mun",main:true},{n:"Provincia",v:perHab(op.comp,Y.comp,pr.pad,1000),c:"--s-prov"},{n:"España",v:perHab(oe.comp,Y.comp,es.pad,1000),c:"--s-es"}],years:Y.comp,fmt:v=>nf1.format(v),xticks:[2004,2014,2025]});
    if(d.vtas) lineChart(g,{title:"Valor tasado de la vivienda libre",sub:"€ por m², media del año",source:"Fuente: Ministerio de Vivienda.",series:[{n:nm,v:d.vtas,c:"--s-mun",main:true}],years:Y.vtas,fmt:v=>nf0.format(v)+NB+"€",xticks:[2005,2015,2025]}); }
  if(d.deuda&&d.deuda.some(v=>v)){ const b=block(s,"Deuda del ayuntamiento"), g=add(b,"div","cols2");
    lineChart(g,{title:"Deuda viva por habitante",sub:"€ a 31 de diciembre; provincia y España, todos sus ayuntamientos (2017 no se publicó)",source:"Fuente: Ministerio de Hacienda y padrón.",series:[{n:nm,v:perHab(d.deuda,Y.deuda,d.pad,1),c:"--s-mun",main:true},{n:"Provincia",v:perHab(op.deuda,Y.deuda,pr.pad,1),c:"--s-prov"},{n:"España",v:perHab(oe.deuda,Y.deuda,es.pad,1),c:"--s-es"}],years:Y.deuda,fmt:v=>nf0.format(v)+NB+"€",xticks:[2015,2020,2025]}); }
}

// ---------- voto ----------
function secVoto(s,r,d){
  const v=d.vote||{}, keys=VREFS.elections.filter(k=>v[k]&&/^0[27]/.test(k)), mkeys=VREFS.elections.filter(k=>v[k]&&k.startsWith("04")), gen=keys.filter(k=>k.startsWith("02")), P=r[F.prov];
  if(!gen.length){ lead(s,"No hay resultados publicados para este municipio."); return; }
  const L=gen[gen.length-1], Pv=gen.length>1?gen[gen.length-2]:null, ve=VREFS.es, vp=VREFS.prov[P]||{};
  const s1=v[L].share, s0=Pv?v[Pv].share:{};
  const order=Object.entries(s1).filter(([p])=>p!=="Otros").sort((a,b)=>b[1]-a[1]);
  const [w,ws]=order[0];
  let t=`En las ${ELNAME(L)} ganó <mark>${partyArt(P,L,w)}</mark> con el ${pc(ws)} de los votos válidos (en España, ${pc(ve[L].share[w])}).`;
  if(Pv){ const ch=Object.keys({...s1,...s0}).filter(p=>p!=="Otros").map(p=>[p,(s1[p]||0)-(s0[p]||0)]).sort((a,b)=>b[1]-a[1]); const up=ch[0], dn=ch[ch.length-1];
    if(up[1]>=1) t+=` Respecto a ${ELSHORT(Pv)}, quien más sube es ${partyArt(P,L,up[0])} (${pts(up[1])} puntos)${dn[1]<=-1?` y quien más cae, ${partyArt(P,Pv,dn[0])} (${pts(dn[1])})`:""}.`; }
  t+=` Votó el ${pc(v[L].turnout)} del censo (España: ${pc(ve[L].turnout)}).`;
  lead(s,t);
  // tabla
  const b1=block(s,`Resultado de ${ELSHORT(L)}${Pv?` y cambio desde ${ELSHORT(Pv)}`:""}`);
  const parties=order.filter(([p,x])=>x>=1).map(([p])=>p).slice(0,8);
  const max=Math.max(...parties.map(p=>Math.max(s1[p]||0,s0[p]||0)),10);
  const tb=add(b1,"div","vtab"); tb.setAttribute("role","table");
  tb.innerHTML=`<div class="vhead" role="row"><span role="columnheader">Candidatura</span><span role="columnheader">${Pv?`Barra: ${ELSHORT(L)}. Raya: ${ELSHORT(Pv)}`:""}</span><span role="columnheader" class="r">%</span><span role="columnheader" class="r">Cambio</span><span role="columnheader" class="r hide-s">Prov. / España</span></div>`+
    parties.map(p=>{ const a=s1[p]||0, b=Pv?s0[p]:undefined, dl=b==null?null:a-b, lab=partyLabel(P,L,p), lab0=Pv?partyLabel(P,Pv,p):lab;
      return `<div class="vrow" role="row"><span class="pn" role="cell"><i style="background:${pColor(p)}"></i><span>${esc(lab)}${Pv&&b!=null&&lab0!==lab?`<small>en ${ELSHORT(Pv).slice(-4)}: ${esc(lab0)}</small>`:""}</span></span><span class="vbar" role="cell"><span style="width:${a/max*100}%;background:${pColor(p)}"></span>${b!=null?`<b class="m19" style="left:${b/max*100}%"></b>`:""}</span><span class="num r" role="cell">${nf1.format(a)}</span><span class="num r ${dl==null?"":dl>=0?"up":"dn"}" role="cell">${dl==null?(Pv?"nuevo":"—"):pts(dl)}</span><span class="num r hide-s muted" role="cell">${vp[L]&&vp[L].share[p]!=null?nf1.format(vp[L].share[p]):"—"} / ${ve[L].share[p]!=null?nf1.format(ve[L].share[p]):"—"}</span></div>`; }).join("");
  add(b1,"figcaption",null,"% sobre voto válido. Para poder comparar elecciones, cada candidatura se agrupa con su equivalente anterior: Sumar con Unidas Podemos, Más País y sus aliados territoriales (como Compromís o En Comú); Junts con CDC y JxCat.");
  // evolución
  if(keys.length>1){ const b2=block(s,"Cómo ha cambiado");
    const fam=[...new Set(keys.flatMap(k=>Object.entries(v[k].share).filter(([p,x])=>p!=="Otros"&&x>=2).map(([p])=>p)))].sort((a,b)=>(s1[b]||0)-(s1[a]||0));
    const wrap=add(b2,"div","stack");
    wrap.innerHTML=`<div class="keys">${fam.map(p=>`<span><i class="sq" style="background:${pColor(p)}"></i>${esc(partyLabel(P,L,p))}</span>`).join("")}<span><i class="sq" style="background:${PARTY.Otros}"></i>Resto</span></div>`+
      keys.slice().reverse().map(k=>{ const sh=v[k].share; const rest=100-d3.sum(fam,p=>sh[p]||0);
        return `<div class="row${k===L?" me":""}"><span>${ELSHORT(k)}</span><div class="bar">${fam.map(p=>{const x=sh[p]||0; return x>0?`<i style="flex:${x};background:${pColor(p)}" title="${esc(partyLabel(P,k,p))}: ${pc(x)}">${x>=7?nf0.format(x):""}</i>`:"";}).join("")}<i class="lt" style="flex:${Math.max(0,rest)};background:${PARTY.Otros}" title="Resto: ${pc(rest)}">${rest>=7?nf0.format(rest):""}</i></div></div>`; }).join("");
  }
  const b3=block(s,"Participación");
  const tw=add(b3,"div","cmp");
  tw.innerHTML=`<div class="keys"><span><i style="background:var(--s-mun)"></i>${esc(r[F.name])}</span><span><i style="background:var(--s-prov)"></i>Provincia</span><span><i style="background:var(--s-es)"></i>España</span></div>`+keys.slice().reverse().map(k=>`<div class="cmp-row"><div class="n">${cap(ELNAME(k))}</div><div class="bars">${[[v[k].turnout,"--s-mun"],[vp[k]&&vp[k].turnout,"--s-prov"],[ve[k]&&ve[k].turnout,"--s-es"]].map(([x,col])=>`<div class="b"><span style="width:${x==null?0:x}%;background:var(${col})"></span><em>${pc(x)}</em></div>`).join("")}</div></div>`).join("");
  add(b3,"figcaption",null,"% del censo que votó. Sin el voto de residentes en el extranjero. Que un municipio vote de una forma no dice cómo vota cada vecino.");
  if(mkeys.length){ const b4=block(s,"Elecciones municipales");
    const g=add(b4,"div","cols2");
    mkeys.slice().reverse().forEach(k=>{ const m=v[k]; const box=add(g,"div");
      add(box,"div","ct",`${cap(ELNAME(k))} · participación ${pc(m.turnout)}`).style.cssText="font-size:15px;font-weight:700;margin-bottom:8px";
      const L=m.lists||[]; const mx=Math.max(10,...L.map(x=>x[1]));
      const t=add(box,"div","vtab mun");
      t.innerHTML=L.map(([n,sh,fam])=>`<div class="vrow" role="row"><span class="pn"><i style="background:${fam==="Otros"?PARTY["Lista local"]:pColor(fam)}"></i><span>${esc(n)}${fam==="Otros"?'<small>candidatura local u otra</small>':""}</span></span><span class="vbar"><span style="width:${sh/mx*100}%;background:${fam==="Otros"?PARTY["Lista local"]:pColor(fam)}"></span></span><span class="num r">${nf1.format(sh)}</span></div>`).join("")||'<p class="muted">Sin datos de candidaturas.</p>'; });
    add(b4,"figcaption",null,"% sobre voto válido de las seis candidaturas más votadas, con sus siglas oficiales. En los municipios más pequeños, con listas abiertas, el Ministerio no publica el reparto por candidatura.");
  }
}

// ---------- lo que destaca: los datos en los que el municipio está más en los extremos ----------
const DGROUPS=[["edad","mayores65","menores18","pensiones"],["renta","rentaHog","pobreza"],["superiores"],["varPob","var0525"],["migInt"],["migExt","extr"],["paroReg"],["alquiler"],["noPrincipal"],["vt"],["solos"],["gini"],["part"],["alqVar"],["paroRegVar"]];
const DPHRASE={renta:["más renta por persona","menos renta por persona"],rentaHog:["más renta por hogar","menos renta por hogar"],pobreza:["más riesgo de pobreza","menos riesgo de pobreza"],gini:["más desigualdad","menos desigualdad"],
  pensiones:["más peso de las pensiones","menos peso de las pensiones"],paro:["más paro","menos paro"],paroReg:["más paro registrado","menos paro registrado"],superiores:["más estudios superiores","menos estudios superiores"],
  alquiler:["más hogares de alquiler","menos hogares de alquiler"],noPrincipal:["más viviendas vacías o secundarias","menos viviendas vacías o secundarias"],vt:["más pisos turísticos","menos pisos turísticos"],
  alqVar:["más subida del alquiler","menos subida del alquiler"],varPob:["más crecimiento desde 2015","más pérdida de población desde 2015"],var0525:["más crecimiento desde 2005","más pérdida de población desde 2005"],
  edad:["más edad media","menos edad media"],mayores65:["más mayores de 65 años","menos mayores de 65 años"],menores18:["más menores de edad","menos menores de edad"],extr:["más población extranjera","menos población extranjera"],
  solos:["más hogares de una persona","menos hogares de una persona"],migExt:["más llegadas del extranjero","menos llegadas del extranjero"],migInt:["más llegadas desde otros municipios","más salidas hacia otros municipios"],
  part:["más participación electoral","menos participación electoral"],paroRegVar:["más subida del paro en el último año","más bajada del paro en el último año"]};
// frases de los indicadores añadidos desde otras fuentes (censo anual del INE, IRPF de la Agencia Tributaria…)
Object.assign(DPHRASE,{
  empleo:["más gente con empleo","menos gente con empleo"],empleoMujeres:["más mujeres con empleo","menos mujeres con empleo"],brechaEmpleo:["más brecha de empleo entre hombres y mujeres","menos brecha de empleo entre hombres y mujeres"],
  empleoVar:["más subida del empleo desde 2021","menos subida del empleo desde 2021"],paroCensal:["más paro (según el censo)","menos paro (según el censo)"],temporales:["más contratos temporales","menos contratos temporales"],
  autonomos:["más autónomos","menos autónomos"],directivos:["más directivos y profesionales","menos directivos y profesionales"],elementales:["más ocupaciones elementales","menos ocupaciones elementales"],
  agri:["más gente trabajando en el campo","menos gente trabajando en el campo"],industria:["más empleo industrial","menos empleo industrial"],construccion:["más empleo en la construcción","menos empleo en la construcción"],
  comercio:["más empleo en comercio, transporte y hostelería","menos empleo en comercio, transporte y hostelería"],avanzados:["más empleo en servicios avanzados","menos empleo en servicios avanzados"],publico:["más empleo en administración, educación y sanidad","menos empleo en administración, educación y sanidad"],
  estudiosBasicos:["más gente con solo estudios básicos","menos gente con solo estudios básicos"],superiores2539:["más jóvenes titulados","menos jóvenes titulados"],brechaSuperiores:["más ventaja de las mujeres en titulación superior","menos ventaja de las mujeres en titulación superior"],
  casados:["más personas casadas","menos personas casadas"],divorciados:["más divorcios y separaciones","menos divorcios y separaciones"],solteros3554:["más solteros de 35 a 54 años","menos solteros de 35 a 54 años"],
  arraigo:["más gente que siempre ha vivido allí","menos gente que siempre ha vivido allí"],llegados:["más gente llegada de otros municipios","menos gente llegada de otros municipios"],inmigReciente:["más inmigración reciente","menos inmigración reciente"],
  afilHab:["más empleo por habitante en el municipio","menos empleo por habitante en el municipio"],afilAutonomos:["más autónomos entre los afiliados","menos autónomos entre los afiliados"],afilAgrario:["más afiliados al régimen agrario","menos afiliados al régimen agrario"],
  afilHogar:["más empleadas del hogar","menos empleadas del hogar"],afilVar:["más subida de los afiliados desde 2021","menos subida de los afiliados desde 2021"],afilVar19:["más subida de los afiliados desde 2019","menos subida de los afiliados desde 2019"],
  superficie:["más superficie","menos superficie"],
  paroMujeres:["más mujeres entre los parados","menos mujeres entre los parados"],paroJovenes:["más jóvenes entre los parados","menos jóvenes entre los parados"],paroMayores45:["más mayores de 45 entre los parados","menos mayores de 45 entre los parados"],paroSinEmpleo:["más parados sin empleo anterior","menos parados sin empleo anterior"],contrTemp:["más contratos nuevos temporales","menos contratos nuevos temporales"],
  rentaMediana:["más renta mediana","menos renta mediana"],p80p20:["más desigualdad entre ricos y pobres","menos desigualdad entre ricos y pobres"],
  ingSalario:["más ingresos por salarios","menos ingresos por salarios"],ingDesempleo:["más ingresos por prestaciones de desempleo","menos ingresos por prestaciones de desempleo"],ingPrestaciones:["más ingresos por otras prestaciones","menos ingresos por otras prestaciones"],ingOtros:["más ingresos de otras fuentes","menos ingresos de otras fuentes"],hogarMedio:["hogares más grandes","hogares más pequeños"],
  pensionistas:["más adultos con pensión","menos adultos con pensión"],estudiantes:["más adultos que estudian","menos adultos que estudian"],paroExtranjeros:["más paro entre los extranjeros","menos paro entre los extranjeros"],brechaParoExtr:["más brecha de paro entre extranjeros y españoles","menos brecha de paro entre extranjeros y españoles"],
  irpfBruta:["más renta bruta por declarante","menos renta bruta por declarante"],irpfDisp:["más renta disponible por declarante","menos renta disponible por declarante"],irpfCarga:["más impuestos y cotizaciones sobre la renta","menos impuestos y cotizaciones sobre la renta"],
  irpfTrabajo:["más renta de trabajo y pensiones","menos renta de trabajo y pensiones"],irpfActiv:["más renta de actividades económicas","menos renta de actividades económicas"],irpfCapital:["más renta del capital","menos renta del capital"],
  irpfExenta:["más renta exenta","menos renta exenta"],irpfDecl:["más declarantes por habitante","menos declarantes por habitante"]});
const SORTED={};
function rankOf(k,v,pool){ const key=k+"|"+pool; if(!SORTED[key]){ const mp=pool==="big"?1000:0; SORTED[key]=rowsAll().filter(r=>r[F[k]]!=null&&(r[F.pop]||0)>=mp).map(r=>r[F[k]]).sort((a,b)=>a-b); } const a=SORTED[key]; return a.length?d3.bisectLeft(a,v)/a.length:null; }
function destaca(box,r){
  const pool=(r[F.pop]||0)>=1000?"big":"all", P=r[F.prov], items=[];
  for(const grp of DGROUPS){ let best=null;
    for(const k of grp){ if(F[k]==null||r[F[k]]==null||!DPHRASE[k]) continue; const p=rankOf(k,r[F[k]],pool); if(p==null) continue; const ex=Math.abs(p-.5); if(!best||ex>best.ex) best={k,p,ex,v:r[F[k]]}; }
    if(best&&best.ex>=0.25) items.push(best); }
  items.sort((a,b)=>b.ex-a.ex);
  const top=items.slice(0,6).filter((it,i)=>i<3||it.ex>=0.4);
  const prov=rowsAll().filter(x=>x[F.prov]===P&&(x[F.pop]||0)>=(pool==="big"?1000:0));
  const nm=pool==="big"?"municipios de más de 1.000 habitantes":"municipios";
  const near=nearest(r,3);
  const simCard=near.length?`<div><span class="pct" style="color:var(--acc-ink)">Se parece a</span>${near.map(([x])=>`<a href="#m${x[F.code]}">${esc(dispName(x[F.name]))}</a>`).join(" · ")}<small>en tamaño, renta, edad, estudios, alquiler y paro.</small><a class="gol" style="font-size:13.5px" href="#comparar-${r[F.code]}-${near[0][0][F.code]}">Comparar →</a></div>`:"";
  if(!top.length){ box.innerHTML=`<div style="grid-column:span 2"><span class="pct" style="color:var(--ink-2)">Sin extremos</span>En casi todo se parece a la mayoría de ${nm} de España.</div>`+simCard; return; }
  box.innerHTML=top.slice(0,simCard?5:6).map(it=>{ const hi=it.p>.5, pct=Math.max(1,Math.round((hi?1-it.p:it.p)*100)), f=fmtK(it.k);
      const pv=prov.filter(x=>x[F[it.k]]!=null).sort((a,b)=>hi?b[F[it.k]]-a[F[it.k]]:a[F[it.k]]-b[F[it.k]]), pos=pv.findIndex(x=>x[F.code]===r[F.code])+1;
      return `<div><span class="pct">Top ${pct}${NB}%</span>de los municipios con ${DPHRASE[it.k][hi?0:1]}<div class="dstrip"><i style="left:${Math.max(2,Math.min(98,it.p*100))}%"></i></div><div class="dstrip-x"><span>menos</span><span>más</span></div><small>${esc(labK(it.k))}: ${f(it.v)} · España: ${f(esOff(it.k))}${pos&&pos<=3&&pv.length>=5?` · ${pos}.º de su provincia`:""}</small></div>`; }).join("")+simCard;
}

// ---------- municipios parecidos ----------
const SIMK=["renta","edad","extr","superiores","alquiler","varPob","paroReg"];
let SIMSTAT=null;
function nearest(r,n){
  const base=rowsAll().filter(x=>(x[F.pop]||0)>=500&&SIMK.every(k=>x[F[k]]!=null));
  if(!SIMSTAT){ SIMSTAT={}; [...SIMK,"lpop"].forEach(k=>{ const vals=base.map(x=>k==="lpop"?Math.log10(x[F.pop]):x[F[k]]); SIMSTAT[k]=[d3.mean(vals),d3.deviation(vals)||1]; }); }
  const z=(x,k)=>((k==="lpop"?Math.log10(x[F.pop]||1):x[F[k]])-SIMSTAT[k][0])/SIMSTAT[k][1];
  const ks=[...SIMK,"lpop"].filter(k=>k==="lpop"||r[F[k]]!=null); if(ks.length<5) return [];
  const W={lpop:1.5};
  return base.filter(x=>x[F.code]!==r[F.code]).map(x=>[x,Math.sqrt(d3.sum(ks,k=>(W[k]||1)*(z(x,k)-z(r,k))**2))]).sort((a,b)=>a[1]-b[1]).slice(0,n);
}
function parecidos(box,r){
  const base=rowsAll().filter(x=>(x[F.pop]||0)>=500&&SIMK.every(k=>x[F[k]]!=null));
  if(!SIMSTAT){ SIMSTAT={}; [...SIMK,"lpop"].forEach(k=>{ const vals=base.map(x=>k==="lpop"?Math.log10(x[F.pop]):x[F[k]]); SIMSTAT[k]=[d3.mean(vals),d3.deviation(vals)||1]; }); }
  const z=(x,k)=>((k==="lpop"?Math.log10(x[F.pop]||1):x[F[k]])-SIMSTAT[k][0])/SIMSTAT[k][1];
  const ks=[...SIMK,"lpop"].filter(k=>k==="lpop"||r[F[k]]!=null);
  if(ks.length<5){ add(box,"p","muted","No hay datos suficientes para buscar municipios parecidos."); return; }
  const W={lpop:1.5};
  const near=base.filter(x=>x[F.code]!==r[F.code]).map(x=>[x,Math.sqrt(d3.sum(ks,k=>(W[k]||1)*(z(x,k)-z(r,k))**2))]).sort((a,b)=>a[1]-b[1]).slice(0,5);
  add(box,"p","muted",`Los cinco municipios que más se parecen a ${esc(r[F.name])} en tamaño, renta, edad, población extranjera, estudios, alquiler, crecimiento y paro. Compararse con iguales dice más que compararse con la media.`).style.cssText="font-size:15px;margin-bottom:10px;max-width:var(--medida)";
  const cols=[["pop","Hab."],["renta","Renta"],["edad","Edad"],["paroReg","Paro reg."],["alquiler","Alquiler"]];
  const t=add(box,"div","simtab");
  t.innerHTML=`<table class="glance"><thead><tr><th>Municipio</th>${cols.map(([k,l])=>`<th class="r">${l}</th>`).join("")}<th></th></tr></thead><tbody>
    <tr class="me"><td><b>${esc(r[F.name])}</b></td>${cols.map(([k])=>`<td class="r num">${r[F[k]]==null?"—":fmtK(k)(r[F[k]])}</td>`).join("")}<td></td></tr>
    ${near.map(([x])=>`<tr><td><a href="#m${x[F.code]}">${esc(x[F.name])}</a><small class="muted" style="display:block;font-size:12.5px">${esc(provShort(PROVS[x[F.prov]]))}</small></td>${cols.map(([k])=>`<td class="r num">${x[F[k]]==null?"—":fmtK(k)(x[F[k]])}</td>`).join("")}<td class="r"><a class="cmpl" href="#comparar-${r[F.code]}-${x[F.code]}">Comparar</a></td></tr>`).join("")}</tbody></table>`;
}
// =====================================================================
// RELACIONES ENTRE DATOS
// =====================================================================
function wcorr(pts){
  const W=d3.sum(pts,p=>p.w); if(!W||pts.length<5) return null;
  const mx=d3.sum(pts,p=>p.w*p.x)/W, my=d3.sum(pts,p=>p.w*p.y)/W;
  let sxy=0,sxx=0,syy=0; pts.forEach(p=>{ const dx=p.x-mx, dy=p.y-my; sxy+=p.w*dx*dy; sxx+=p.w*dx*dx; syy+=p.w*dy*dy; });
  if(!sxx||!syy) return null; const r=sxy/Math.sqrt(sxx*syy), b=sxy/sxx; return {r,b,a:my-b*mx,mx,my,n:pts.length};
}
const rankArr=a=>{ const idx=a.map((v,i)=>[v,i]).sort((p,q)=>p[0]-q[0]), rk=new Array(a.length); let i=0; while(i<idx.length){ let j=i; while(j+1<idx.length&&idx[j+1][0]===idx[i][0]) j++; for(let k=i;k<=j;k++) rk[idx[k][1]]=(i+j)/2; i=j+1; } return rk; };
function spearman(pts){ if(pts.length<5) return null; const rx=rankArr(pts.map(p=>p.x)), ry=rankArr(pts.map(p=>p.y)); const c=wcorr(pts.map((p,i)=>({x:rx[i],y:ry[i],w:1}))); return c&&c.r; }
const rFmt=r=>(r<0?"−":"")+nf2.format(Math.abs(r));
const strength=a=>a<0.1?"prácticamente ninguna":a<0.3?"débil":a<0.5?"moderada":a<0.7?"fuerte":"muy fuerte";
const low=s=>s.charAt(0).toLowerCase()+s.slice(1);
function corrSentence(r,xl,yl){
  if(r==null) return "No hay datos suficientes para medir la relación.";
  const a=Math.abs(r);
  if(a<0.1) return `Prácticamente no hay relación: saber ${low(xl)} de un municipio no ayuda a adivinar ${low(yl)}.`;
  return `Relación ${strength(a)}: donde hay más ${low(xl)}, suele haber ${r>0?"más":"menos"} ${low(yl)}.`;
}
// valores de un indicador listos para cruzar
// filtro global del explorador (provincia y tamaño); fuera del explorador no filtra nada
let EXF={prov:"",min:0,max:Infinity};
const exOK=r=>(!EXF.prov||r[F.prov]===EXF.prov)&&(r[F.pop]||0)>=EXF.min&&(r[F.pop]||0)<EXF.max;
function pairPts(x,y,{minPop=0,prov=null,logX=false,logY=false,weighted=true}={}){
  return rowsAll().filter(r=>r[F[x]]!=null&&r[F[y]]!=null&&(r[F.pop]||0)>=minPop&&(!prov||r[F.prov]===prov)&&exOK(r)&&(!logX||r[F[x]]>0)&&(!logY||r[F[y]]>0))
    .map(r=>({r,x0:r[F[x]],y0:r[F[y]],x:logX?Math.log10(r[F[x]]):r[F[x]],y:logY?Math.log10(r[F[y]]):r[F[y]],w:weighted?(r[F.pop]||1):1}));
}

// gráfico de dispersión: canvas para los puntos, svg para ejes y anotaciones
// tercera variable: tamaño y color de los puntos
const ENC_SZ=[["","Habitantes"],["1","Todos iguales"]], ENC_COL=[["","Ninguno"],["tam","Tamaño del municipio"],["costa","Costa o interior"]];
const ENC_PAL=()=>[css("--slate"),css("--rust"),css("--olive"),css("--mustard"),css("--plum")];
function encOK(k,kind){ return kind==="sz"?(k===""||k==="1"||!!CATK[k]):(k===""||k==="tam"||k==="costa"||!!CATK[k]); }
const encLab=(k,kind)=>(kind==="sz"?ENC_SZ:ENC_COL).find(o=>o[0]===k)?.[1]||labK(k);
function makeEnc(rows,{sz="",col=""}){
  const out={};
  if(sz&&sz!=="1"&&CATK[sz]&&F[sz]!=null){ const v=rows.map(r=>r[F[sz]]).filter(a=>a!=null).sort(d3.ascending), n=v.length;
    out.r=r=>{ const a=r[F[sz]]; if(a==null) return 1.5; return 1.5+9.5*Math.sqrt(d3.bisectLeft(v,a)/Math.max(1,n-1)); }; out.rl=`Tamaño: ${labK(sz)}`; }
  else if(sz==="1"){ out.r=()=>3.2; out.rl="Todos del mismo tamaño"; }
  if(col){ const P=ENC_PAL();
    if(col==="tam"){ const B=[[0,500,"menos de 500"],[500,5000,"500 a 5.000"],[5000,50000,"5.000 a 50.000"],[50000,1e9,"más de 50.000"]]; const cs=[P[0],P[2],P[3],P[1]];
      out.c=r=>{ const a=r[F.pop]||0, i=B.findIndex(b=>a>=b[0]&&a<b[1]); return cs[Math.max(0,i)]; }; out.cl=B.map((b,i)=>[cs[i],b[2]+" hab."]); }
    else if(col==="costa"){ out.c=r=>r[F.distCosta]==null?P[4]:r[F.distCosta]<=10?P[0]:P[3]; out.cl=[[P[0],"Costa (a menos de 10 km)"],[P[3],"Interior"]]; }
    else if(CATK[col]&&F[col]!=null){ const v=rows.map(r=>r[F[col]]).filter(a=>a!=null).sort(d3.ascending), t1=d3.quantile(v,1/3), t2=d3.quantile(v,2/3), cs=[P[0],css("--stone"),P[1]], fm=fmtK(col);
      out.c=r=>{ const a=r[F[col]]; return a==null?css("--rule-2"):a<=t1?cs[0]:a<=t2?cs[1]:cs[2]; };
      out.cl=[[cs[0],`${labK(col)}: bajo (hasta ${fm(t1)})`],[cs[1],"medio"],[cs[2],`alto (desde ${fm(t2)})`]]; } }
  out.legend=()=>{ const parts=[]; if(out.cl) parts.push(...out.cl.map(([c,l])=>`<span><i style="background:${c}"></i>${esc(l)}</span>`)); if(out.rl&&sz!=="1") parts.push(`<span class="sz"><i class="s1"></i><i class="s2"></i><i class="s3"></i>${esc(out.rl.replace("Tamaño: ","Tamaño: más grande = más "))}</span>`); return parts.length?`<div class="enclg">${parts.join("")}</div>`:""; };
  return out;
}
// ---------- zoom y desplazamiento ----------
// Arrastrar para moverse; botones +, − y ⟲; Ctrl (o ⌘) + rueda y pellizco para acercar. La rueda sola sigue desplazando la página.
let SCID=0;
function zoomBtns(host,onAct){ const zb=document.createElement("div"); zb.className="zbtns";
  zb.innerHTML='<button type="button" data-z="in" aria-label="Acercar" title="Acercar (o Ctrl + rueda)">+</button><button type="button" data-z="out" aria-label="Alejar" title="Alejar">−</button><button type="button" data-z="reset" aria-label="Ver todo" title="Ver todo" hidden>⟲</button>';
  zb.addEventListener("click",e=>{ const b=e.target.closest("button"); if(!b) return; e.stopPropagation(); onAct(b.dataset.z); });
  zb.addEventListener("pointerdown",e=>e.stopPropagation()); zb.addEventListener("dblclick",e=>e.stopPropagation());
  host.appendChild(zb); return zb; }
const zoomFilter=ev=>ev.type==="wheel"?(ev.ctrlKey||ev.metaKey):!ev.button;
function addZoom(wrap,{m,W,H,X0,Y0,max=40,onZoom}){
  const sel=d3.select(wrap), ex=[[m.l,m.t],[W-m.r,H-m.b]];
  const z=d3.zoom().scaleExtent([1,max]).extent(ex).translateExtent(ex).filter(zoomFilter).on("zoom",ev=>{ const t=ev.transform, id=t.k===1&&t.x===0&&t.y===0; rb.hidden=id;
    onZoom(id?X0:t.rescaleX(X0.copy().clamp(false)),id?Y0:t.rescaleY(Y0.copy().clamp(false)),!id); });
  sel.call(z).on("dblclick.zoom",null); wrap.style.touchAction="pan-y"; wrap.title="Arrastra para moverte · Ctrl + rueda para acercar";
  const zb=zoomBtns(wrap,a=>{ if(a==="reset") sel.transition().duration(250).call(z.transform,d3.zoomIdentity); else sel.transition().duration(250).call(z.scaleBy,a==="in"?1.8:1/1.8); }), rb=zb.querySelector("[data-z=reset]");
  return z; }
function zoomStrokes(gg,k){ gg.selectAll("path").each(function(){ if(!this.dataset.w) this.dataset.w=this.getAttribute("stroke-width")||"1"; this.setAttribute("stroke-width",(+this.dataset.w)/k); }); }
function addMapZoom(svg,zg,gg,W,H,mb){
  const z=d3.zoom().scaleExtent([1,14]).translateExtent([[0,0],[W,H]]).filter(zoomFilter).on("zoom",ev=>{ zg.attr("transform",ev.transform); zoomStrokes(gg,ev.transform.k); rb.hidden=ev.transform.k===1&&ev.transform.x===0&&ev.transform.y===0; });
  svg.call(z).on("dblclick.zoom",null); svg.style("touch-action","pan-y"); mb.title="Arrastra para moverte · Ctrl + rueda para acercar";
  const zb=zoomBtns(mb,a=>{ if(a==="reset") svg.transition().duration(250).call(z.transform,d3.zoomIdentity); else svg.transition().duration(250).call(z.scaleBy,a==="in"?1.8:1/1.8); }), rb=zb.querySelector("[data-z=reset]"); }

function scatter(parent,{x,y,minPop=0,prov=null,mark=null,logX=false,logY=false,diag=false,height,weighted=true,compact=false,title,source,hideSay=false,enc=null,quad=false,zoom=false}){
  const fx=fmtK(x), fy=fmtK(y), xl=labK(x), yl=labK(y);
  const pts=pairPts(x,y,{minPop,logX,logY,weighted});
  const c=wcorr(pts);
  const f=fig(parent,{title,source});
  if(!hideSay&&c){ const p=el("p","scsay",`${corrSentence(c.r,xl,yl)} <span class="muted">r = ${rFmt(c.r)}</span>${compact||title?` · <a href="${exHash({v:"cruce",d:[x,y],t:minPop>=10000?"g10":minPop>=1000?"g1":"",p:"",c:[]})}">Ábrelo en el explorador</a>`:""}`); f.insertBefore(p,f.body); }
  const W=Math.max(300,Math.round(parent.clientWidth||800)), H=height||Math.round(Math.min(460,Math.max(260,W*0.56))), m={t:22,r:16,b:40,l:58};
  f.body.innerHTML=`<div class="scat-wrap"><canvas width="${W*2}" height="${H*2}" role="img" aria-label="Gráfico de dispersión: ${esc(xl)} frente a ${esc(yl)}"></canvas><svg viewBox="0 0 ${W} ${H}"></svg><div class="maptip" hidden></div></div>`;
  if(!pts.length) return c;
  const sx=pts.map(p=>p.x0).sort(d3.ascending), sy=pts.map(p=>p.y0).sort(d3.ascending);
  const xd=[d3.quantile(sx,.003),d3.quantile(sx,.99)], yd=[d3.quantile(sy,.003),d3.quantile(sy,.99)];
  if(diag){ const lo=Math.min(xd[0],yd[0]), hi=Math.max(xd[1],yd[1]); xd[0]=yd[0]=lo; xd[1]=yd[1]=hi; }
  const X0=(logX?d3.scaleLog():d3.scaleLinear()).domain(xd).nice().range([m.l,W-m.r]).clamp(true), Y0=(logY?d3.scaleLog():d3.scaleLinear()).domain(yd).nice().range([H-m.b,m.t]).clamp(true);
  let X=X0, Y=Y0, ZM=false; const cid="scc"+(++SCID);
  const mxP=d3.max(pts,p=>p.r[F.pop]||1), Rr=d3.scaleSqrt().domain([0,mxP]).range([1.5,Math.max(4,Math.min(compact?12:16,(compact?12:16)*Math.sqrt(mxP/2e6)))]);
  const cv=f.body.querySelector("canvas"), ctx=cv.getContext("2d"); ctx.scale(2,2);
  const svg=d3.select(f.body).select("svg");
  const tks=(sc,n,lg)=>lg?sc.ticks(5).filter(t=>[1,2,5].includes(+String(t).replace(/^0\.0*/,"")[0])):sc.ticks(n);
  const short=(fm,v)=>fm(v).replace(/ (%|€)$/,"$1").replace(/(\d)\.000 ?€$/,"$1 mil €");
  const base=css("--rust"), hl=css("--slate"), ink=css("--ink");
  const E=enc&&(enc.sz||enc.col)?makeEnc(pts.map(p=>p.r),enc):null, rad=r=>E&&E.r?E.r(r):Rr(r[F.pop]||1);
  const sorted=pts.slice().sort((a,b)=>rad(b.r)-rad(a.r));
  function drawSvg(){ svg.selectAll("*").remove();
    svg.append("defs").append("clipPath").attr("id",cid).append("rect").attr("x",m.l).attr("y",m.t).attr("width",W-m.l-m.r).attr("height",H-m.t-m.b);
    const cg=svg.append("g").attr("clip-path",`url(#${cid})`);
  svg.append("g").attr("class","grid").selectAll("line").data(tks(Y,5,logY)).join("line").attr("x1",m.l).attr("x2",W).attr("y1",Y).attr("y2",Y);
  svg.append("g").attr("class","axis").selectAll("text").data(tks(Y,5,logY)).join("text").attr("x",m.l-6).attr("y",v=>Y(v)+4).attr("text-anchor","end").text(v=>short(fy,v));
  svg.append("g").attr("class","axis").selectAll("text").data(tks(X,W<500?4:6,logX)).join("text").attr("x",X).attr("y",H-m.b+16).attr("text-anchor","middle").text(v=>short(fx,v));
  svg.append("text").attr("class","lab strong").attr("x",W).attr("y",H-4).attr("text-anchor","end").text(xl+" →");
  svg.append("text").attr("class","lab strong").attr("x",0).attr("y",m.t-10).attr("text-anchor","start").text("↑ "+yl);
  if(diag){ const [a,b]=X.domain(); cg.append("line").attr("x1",X(a)).attr("y1",Y(a)).attr("x2",X(b)).attr("y2",Y(b)).attr("stroke",css("--ink")).attr("stroke-dasharray","4 3"); svg.append("text").attr("class","lab").attr("x",X(b)-4).attr("y",Y(b)+14).attr("text-anchor","end").text("misma subida"); }
  else if(c&&Math.abs(c.r)>=0.1){ const [a,b]=X.domain(), tx=v=>logX?Math.log10(v):v, ty=v=>logY?Math.pow(10,v):v; const N=24, line=d3.range(N+1).map(i=>{ const xv=logX?a*Math.pow(b/a,i/N):a+(b-a)*i/N; return [X(xv),Y(ty(c.a+c.b*tx(xv)))]; });
    cg.append("path").attr("d",d3.line()(line)).attr("fill","none").attr("stroke",css("--ink")).attr("stroke-width",1.3).attr("stroke-dasharray","5 4"); }
  if(quad&&c){ const mx_=d3.mean(pts,p=>p.x0), my_=d3.mean(pts,p=>p.y0); const [x0_]=X.range(), qx=logX?X(Math.pow(10,d3.mean(pts,p=>Math.log10(p.x0)))):X(mx_), qy=Y(my_);
    cg.append("rect").attr("class","quadbg").attr("x",m.l).attr("y",m.t).attr("width",Math.max(0,qx-m.l)).attr("height",Math.max(0,qy-m.t)); cg.append("rect").attr("class","quadbg").attr("x",qx).attr("y",qy).attr("width",Math.max(0,W-m.r-qx)).attr("height",Math.max(0,H-m.b-qy));
    cg.append("line").attr("class","quad").attr("x1",qx).attr("x2",qx).attr("y1",m.t).attr("y2",H-m.b); cg.append("line").attr("class","quad").attr("x1",m.l).attr("x2",W-m.r).attr("y1",qy).attr("y2",qy);
    const T=(tx,ty,an,t)=>svg.append("text").attr("class","lab quadt").attr("x",tx).attr("y",ty).attr("text-anchor",an).text(t);
    const nar=W<600, sh=k=>{ const t=labK(k).toLowerCase(), n=nar?9:17; return t.length>n?t.slice(0,n-1).trimEnd()+"…":t; }, qt_=(a,b)=>nar?`${a} horiz. · ${b} vert.`:`${a==="−"?"menos":"más"} ${sh(x)} · ${b==="−"?"menos":"más"} ${sh(y)}`;
    T(m.l+6,m.t+12,"start",qt_("−","+")); T(W-m.r-4,m.t+12,"end",qt_("+","+")); T(m.l+6,H-m.b-6,"start",qt_("−","−")); T(W-m.r-4,H-m.b-6,"end",qt_("+","−")); }
  }
  drawSvg();
  function paint(focus){
    ctx.clearRect(0,0,W,H); if(ZM){ ctx.save(); ctx.beginPath(); ctx.rect(m.l,m.t-4,W-m.l-m.r+4,H-m.t-m.b+8); ctx.clip(); }
    for(const p of sorted){ const isP=prov&&p.r[F.prov]===prov; ctx.beginPath(); ctx.arc(X(p.x0),Y(p.y0),rad(p.r),0,7); ctx.fillStyle=E&&E.c&&!prov?E.c(p.r):isP?hl:base; ctx.globalAlpha=prov?(isP?.8:.10):E&&E.c?.5:.30; ctx.fill(); }
    ctx.globalAlpha=1;
    for(const code of [mark,(typeof MUN2!=="undefined"?MUN2:null),focus].filter(Boolean)){ const p=pts.find(q=>q.r[F.code]===code); if(!p) continue; const px=X(p.x0), py=Y(p.y0);
      ctx.beginPath(); ctx.arc(px,py,Math.max(5,rad(p.r)),0,7); ctx.lineWidth=2; ctx.strokeStyle=ink; ctx.stroke();
      ctx.font="600 12.5px 'Libre Franklin', Arial, sans-serif"; ctx.fillStyle=ink; const nm=dispName(p.r[F.name]), tw=ctx.measureText(nm).width; ctx.fillText(nm,px+tw+12>W?px-tw-9:px+9,py-8); }
    if(ZM) ctx.restore();
  }
  paint();
  let qt; const rebuild=()=>{ qt=d3.quadtree().x(p=>X(p.x0)).y(p=>Y(p.y0)).addAll(pts); }; rebuild();
  const tip=f.body.querySelector(".maptip"), wrap=f.body.querySelector(".scat-wrap");
  const at=ev=>{ const bb=cv.getBoundingClientRect(); return [bb,qt.find((ev.clientX-bb.left)*W/bb.width,(ev.clientY-bb.top)*H/bb.height,16)]; };
  wrap.addEventListener("pointermove",ev=>{ const [bb,p]=at(ev);
    if(!p){ tip.hidden=true; paint(); wrap.style.cursor=""; return; } wrap.style.cursor="pointer";
    tip.innerHTML=`<b>${esc(p.r[F.name])}</b><br>${esc(xl)}: ${fx(p.x0)}<br>${esc(yl)}: ${fy(p.y0)}${enc&&enc.sz&&enc.sz!=="1"&&CATK[enc.sz]&&p.r[F[enc.sz]]!=null?`<br>${esc(labK(enc.sz))}: ${fmtK(enc.sz)(p.r[F[enc.sz]])}`:""}${enc&&CATK[enc.col]&&p.r[F[enc.col]]!=null?`<br>${esc(labK(enc.col))}: ${fmtK(enc.col)(p.r[F[enc.col]])}`:""}`; tip.hidden=false;
    tip.style.left=Math.max(tip.offsetWidth/2+4,Math.min(bb.width-tip.offsetWidth/2-4,(X(p.x0)/W)*bb.width))+"px"; tip.style.top=(Y(p.y0)/H*bb.height-6)+"px"; paint(p.r[F.code]); });
  wrap.addEventListener("pointerleave",()=>{ tip.hidden=true; paint(); });
  wrap.addEventListener("click",ev=>{ const [,p]=at(ev); if(p){ go(p.r[F.code]); window.scrollTo(0,0); } });
  if(zoom&&!compact) addZoom(wrap,{m,W,H,X0,Y0,onZoom:(xz,yz,z)=>{ X=xz; Y=yz; ZM=z; drawSvg(); rebuild(); paint(); }});
  if(!source){ const n=add(f,"figcaption",null,""); n.textContent=`${nf0.format(pts.length)} municipios${minPop?` de ${nf0.format(minPop)} habitantes o más`:""}.`; }
  else f._cap.textContent+=` Cada círculo es un municipio${E&&E.r?"":", más grande cuanta más población"}. Pulsa uno para abrir su ficha.`;
  if(E&&E.legend().length){ const lg=el("div",null,E.legend()); f.body.after(lg.firstChild); }
  return c;
}

// ---------- página ----------
const MATRIX=["renta","pobreza","gini","pensiones","paroReg","superiores","alquiler","noPrincipal","vt","varPob","migExt","migInt","edad","extr","solos","part","pp","psoe","vox","sumar"];
const TRIVIAL=new Set(["migExt|extr","migExt|varPob","migInt|varPob","renta|rentaHog","edad|mayores65","edad|menores18","mayores65|menores18","varPob|var0525","edad|pensiones","mayores65|pensiones","pp|psoe","pp|vox","pp|sumar","psoe|vox","psoe|sumar","sumar|vox"]);
const isTrivial=(a,b)=>TRIVIAL.has([a,b].sort().join("|"));
const SUGG=[["superiores","renta","¿Más estudios, más renta?"],["vt","alquiler","¿Pisos turísticos y alquiler?"],["edad","pensiones","¿Edad y pensiones?"],["extr","varPob","¿Crecen los que atraen extranjeros?"],["renta","part","¿Votan más los ricos?"],["edad","vox","¿Edad y voto a Vox?"],["paro","pobreza","¿Paro y pobreza?"],["rentaVar","alqVar","¿Renta y alquiler desde 2015?"],["solos","edad","¿Quién vive solo?"],["paroReg","renta","¿Más paro, menos renta?"],["renta","migInt","¿Adónde se muda la gente?"]];
let XS={x:"superiores",y:"renta",minPop:1000,prov:"",weighted:true,logX:false,sz:"",col:"",quad:0};
let MATC=null;

function renderRelaciones(x,y){
  document.title="Relaciones · Indicio";
  if(x&&CATK[x]) XS.x=x; if(y&&CATK[y]) XS.y=y;
  const opt=sel=>{ let h="",g=null; CAT.filter(c=>!c.custom).forEach(c=>{ if(c.g!==g){ if(g) h+="</optgroup>"; h+=`<optgroup label="${c.g}">`; g=c.g; } h+=`<option value="${c.k}" ${c.k===sel?"selected":""}>${esc(c.l)}</option>`; }); return h+"</optgroup>"; };
  view.innerHTML=pageHead("¿Van juntos?",`Elige dos datos y mira si se mueven juntos en los municipios de España. Por ejemplo: ¿los municipios con más estudios tienen más renta? ¿Donde hay más pisos turísticos hay más alquiler? Debajo verás cuánto se parecen, qué municipios se salen de la norma y qué relaciones son las más fuertes de todas.`)+
  `<div class="xsug" aria-label="Ejemplos">${SUGG.map(([a,b,l])=>`<a href="#relaciones-${a}-${b}">${l}</a>`).join("")}</div>
  <div class="xform">
    <label class="fld" for="cx">Dato horizontal<select class="sel" id="cx">${opt(XS.x)}</select></label>
    <button type="button" class="swap" id="swap" title="Intercambiar" aria-label="Intercambiar los dos datos">⇄</button>
    <label class="fld" for="cy">Dato vertical<select class="sel" id="cy">${opt(XS.y)}</select></label>
    <label class="fld" for="cmin">Municipios<select class="sel" id="cmin"><option value="0">Todos</option><option value="1000">De 1.000 hab. o más</option><option value="10000">De 10.000 hab. o más</option><option value="50000">De 50.000 hab. o más</option></select></label>
    <label class="fld" for="cprov">Resaltar provincia<select class="sel" id="cprov"><option value="">Ninguna</option>${Object.keys(PROVS).sort((a,b)=>provShort(PROVS[a]).localeCompare(provShort(PROVS[b]),"es")).map(p=>`<option value="${p}">${esc(provShort(PROVS[p]))}</option>`).join("")}</select></label>
    <label class="fld" for="cw">Cómo contar<select class="sel" id="cw"><option value="1">Cada municipio según su población</option><option value="0">Cada municipio igual</option></select></label>
    <label class="chk"><input type="checkbox" id="clx"> Escala logarítmica en horizontal</label>
  </div>
  <div class="xres"><div id="cplot"></div><div class="xsay" id="csay"></div></div>
  <section class="finding" id="cquint"></section>
  <section class="finding" id="cout"></section>
  <section class="finding" id="cmat"></section>
  <section class="finding" id="ccav"></section>
  ${methodNote()}`;
  const $=id=>document.getElementById(id);
  $("cmin").value=String(XS.minPop); $("cprov").value=XS.prov; $("clx").checked=XS.logX; $("cw").value=XS.weighted?"1":"0";
  const upd=()=>{ XS.x=$("cx").value; XS.y=$("cy").value; XS.minPop=+$("cmin").value; XS.prov=$("cprov").value; XS.logX=$("clx").checked; XS.weighted=$("cw").value==="1"; try{ history.replaceState(null,"",keyToPath("relaciones-"+XS.x+"-"+XS.y)); }catch(e){} drawRel(); };
  ["cx","cy","cmin","cprov","clx","cw"].forEach(i=>$(i).addEventListener("change",upd));
  $("swap").addEventListener("click",()=>{ const t=$("cx").value; $("cx").value=$("cy").value; $("cy").value=t; upd(); });
  drawRel(); drawMatrix(); drawCaveats();
}

function niceStep(k,pts){
  const f=(CATK[k]||{}).f, sd=d3.deviation(pts,p=>p.x)||1;
  if(f==="veces"||f==="num"||f==="pp"||(CATK[k]||{}).un){ const m=Math.pow(10,Math.floor(Math.log10(sd))); return sd/m>=5?5*m:m; }
  if(f==="eur") return sd>4000?5000:1000; if(f==="years") return 5; if(f==="int") return 10000; if(f==="num1") return 5;
  return sd>15?10:sd>4?5:1;
}
const unitTxt=(k,v)=>{ const f=(CATK[k]||{}).f; const a=Math.abs(v);
  if((CATK[k]||{}).un) return (a<1?nf2:a<100?nf1:nf0).format(a)+" "+CATK[k].un;
  if(f==="veces") return (a<1?nf2:nf1).format(a)+(a===1?" vez":" veces"); if(f==="pp") return (a<1?nf2:nf1).format(a)+(a===1?" punto":" puntos"); if(f==="num") return (a<1?nf2:a<100?nf1:nf0).format(a);
  return f==="eur"?eur(a):f==="eurm2"?nf1.format(a)+NB+"€/m²":f==="years"?nf1.format(a)+" años":f==="int"?nf0.format(a)+" habitantes":f==="num1"?nf1.format(a)+" puntos":(Number.isInteger(a)?nf0.format(a):a<1?nf2.format(a):nf1.format(a))+(a===1?" punto":" puntos"); };

function drawRel(){
  const S=XS, x=S.x, y=S.y, xl=labK(x), yl=labK(y), fx=fmtK(x), fy=fmtK(y);
  const box=document.getElementById("cplot"); box.innerHTML="";
  const c=scatter(box,{x,y,minPop:S.minPop,prov:S.prov||null,logX:S.logX,weighted:S.weighted,mark:lastMun,hideSay:true,diag:x==="rentaVar"&&y==="alqVar",enc:{sz:S.sz,col:S.col},quad:!!S.quad,zoom:true,
    source:`Fuentes: ${CATK[x].src} (horizontal) y ${CATK[y].src} (vertical).`});
  const pts=pairPts(x,y,{minPop:S.minPop,logX:S.logX,weighted:S.weighted});
  const say=document.getElementById("csay");
  if(!c||x===y){ say.innerHTML=`<p class="big">${x===y?"Elige dos datos distintos.":"No hay datos suficientes para medir la relación."}</p>`; ["cquint","cout"].forEach(i=>document.getElementById(i).innerHTML=""); return; }
  const a=Math.abs(c.r), rho=spearman(pts);
  const step=niceStep(x,pts), dy=c.b*step;
  const slope=S.logX?`Cada vez que ${low(xl)} se duplica, ${low(yl)} ${c.b>0?"sube":"baja"} de media ${unitTxt(y,c.b*Math.log10(2))}.`:`Por cada ${unitTxt(x,step).replace(/^1 punto$/,"punto")} más de ${low(xl)}, ${low(yl)} es de media ${unitTxt(y,dy)} ${dy>0?"mayor":"menor"}.`;
  const mk=lastMun&&BYCODE.get(lastMun), mv=mk&&mk[F[x]]!=null&&mk[F[y]]!=null?mk:null;
  let mtxt="";
  if(mv&&(!S.minPop||(mv[F.pop]||0)>=S.minPop)&&!S.logX){ const pred=c.a+c.b*mv[F[x]], res=mv[F[y]]-pred;
    mtxt=`<div class="stat"><span class="k">${esc(mv[F.name])}, el último municipio que has visto</span><span class="v">Con su ${low(xl)} (${fx(mv[F[x]])}) le tocaría ${fy(pred)} de ${low(yl)}; tiene ${fy(mv[F[y]])}. <a href="#m${mv[F.code]}">Ver ficha</a></span></div>`; }
  const compact=!!say.closest(".howm");   // dentro del panel del laboratorio, el veredicto, la escala y las cifras ya están arriba
  if(compact){ say.innerHTML=`<div class="stat"><span class="k">Cuánto explica</span><span class="v">Las diferencias de ${low(xl)} explican el <b>${nf0.format(c.r*c.r*100)}${NB}%</b> de las diferencias de ${low(yl)} entre municipios. El resto depende de otras cosas.</span><div class="r2bar" aria-hidden="true"><span style="width:${(c.r*c.r*100).toFixed(1)}%"></span></div></div>
    <div class="stat"><span class="k">¿Dependen de unos pocos casos extremos?</span><span class="v">${rho==null?"—":`Ordenando los municipios en vez de medir las cifras (ρ de Spearman) sale <b>${rFmt(rho)}</b>`} · ${rho!=null&&Math.abs(rho-c.r)>0.2?"bastante distinto de r: la relación depende mucho de unos pocos municipios grandes o extremos, o no es una línea recta.":"parecido a r: la relación no depende de unos pocos casos extremos."}</span></div>
    ${mtxt}
    <p class="muted" style="font-size:13.5px">${nf0.format(c.n)} municipios. ${S.weighted?"Cada municipio pesa según su población, así Madrid cuenta más que una aldea.":"Cada municipio cuenta igual, sea grande o pequeño."}</p>`; drawQuint(pts,x,y,xl,yl,fx,fy); drawOut(pts,c,x,y,xl,yl,fx,fy); return; }
  say.innerHTML=`<p class="big">${corrSentence(c.r,xl,yl)}</p>
    <div class="stat"><span class="k">Coeficiente de correlación (r)</span><span class="v"><b>${rFmt(c.r)}</b> · relación ${strength(a)}${c.r>=0.1?", en el mismo sentido":c.r<=-0.1?", en sentido contrario":""}</span>
      <div class="rscale" aria-hidden="true"><span class="ln"></span><span class="mk" style="left:${(c.r+1)/2*100}%"></span></div><div class="rscale-ends"><span>−1: opuestos</span><span>0: nada</span><span>+1: iguales</span></div></div>
    <div class="stat"><span class="k">Cuánto explica</span><span class="v">Las diferencias de ${low(xl)} explican el <b>${nf0.format(c.r*c.r*100)}${NB}%</b> de las diferencias de ${low(yl)} entre municipios. El resto depende de otras cosas.</span></div>
    <div class="stat"><span class="k">Cuánto cambia</span><span class="v">${slope}</span></div>
    <div class="stat"><span class="k">Comprobación con el orden (ρ de Spearman)</span><span class="v"><b>${rho==null?"—":rFmt(rho)}</b> · ${rho!=null&&Math.abs(rho-c.r)>0.2?"bastante distinto de r: la relación depende mucho de unos pocos municipios grandes o extremos, o no es una línea recta.":"parecido a r: la relación no depende de unos pocos casos extremos."}</span></div>
    ${mtxt}
    <p class="muted" style="font-size:13.5px">${nf0.format(c.n)} municipios. ${S.weighted?"Cada municipio pesa según su población, así Madrid cuenta más que una aldea.":"Cada municipio cuenta igual, sea grande o pequeño."}</p>`;
  drawQuint(pts,x,y,xl,yl,fx,fy);
  drawOut(pts,c,x,y,xl,yl,fx,fy);
}

function drawQuint(pts,x,y,xl,yl,fx,fy){
  const s=document.getElementById("cquint"); s.innerHTML="";
  const srt=pts.slice().sort((a,b)=>a.x0-b.x0), tot=d3.sum(srt,p=>p.w); let acc=0;
  const G=[[],[],[],[],[]]; srt.forEach(p=>{ const q=Math.min(4,Math.floor((acc+p.w/2)/tot*5)); acc+=p.w; G[q].push(p); });
  const rows=G.filter(g=>g.length).map((g,i)=>({l:`${["El 20 % con menos","Segundo 20 %","El 20 % central","Cuarto 20 %","El 20 % con más"][i]}`,sub:`de ${short2(fx,g[0].x0)} a ${short2(fx,g[g.length-1].x0)}`,v:d3.sum(g,p=>p.w*p.y0)/d3.sum(g,p=>p.w),n:g.length}));
  add(s,"h2",null,`Si se ordenan los municipios por ${low(xl)}`);
  add(s,"div","txt",`<p>Repartimos los municipios en cinco grupos ${XS.weighted?"con la misma población":"con el mismo número de municipios"}, de menos a más ${low(xl)}, y calculamos ${low(yl)} en cada grupo. Si las barras suben o bajan de forma ordenada, la relación es clara; si se quedan parecidas, no la hay.</p>`);
  const f=fig(s,{title:`${yl} en cada grupo`,source:`Entre paréntesis, el rango de ${low(xl)} de cada grupo. ${XS.weighted?"Medias ponderadas por población.":"Medias simples."}`});
  const ev=d3.extent(rows,r=>r.v), lo=ev[0]>=0&&(CATK[y].f!=="pct_chg")?0:Math.min(0,ev[0]);
  hbars(f.body,rows.map(r=>({l:`${r.l} (${r.sub})`,v:r.v})),{fmt:fy,color:"--rust",min:lo});
  f.body.querySelectorAll(".hb").forEach(h=>h.style.gridTemplateColumns="minmax(150px,300px) minmax(0,1fr) 78px");
  if(rows.length===5){ const d=rows[4].v-rows[0].v; add(s,"p","muted",`Del primer grupo al último, ${low(yl)} pasa de ${fy(rows[0].v)} a ${fy(rows[4].v)}.`).style.fontSize="15px"; }
}
const short2=(fm,v)=>fm(v).replace(/ (%|€)$/,"$1");

function drawOut(pts,c,x,y,xl,yl,fx,fy){
  const s=document.getElementById("cout"); s.innerHTML="";
  if(Math.abs(c.r)<0.2||XS.logX){ return; }
  const big=pts.filter(p=>(p.r[F.pop]||0)>=5000).map(p=>({p,pred:c.a+c.b*p.x0,res:p.y0-(c.a+c.b*p.x0)}));
  if(big.length<10) return;
  const hi=big.slice().sort((a,b)=>b.res-a.res).slice(0,8), lo2=big.slice().sort((a,b)=>a.res-b.res).slice(0,8);
  add(s,"h2",null,"Los que se salen de la norma");
  add(s,"div","txt",`<p>La línea discontinua del gráfico marca cuánto ${low(yl)} cabría esperar según ${low(xl)}. Estos municipios de más de 5.000 habitantes son los que más se alejan de ella. Suelen ser los casos más interesantes: algo que no está en estos dos datos los hace distintos.</p>`);
  const g=add(s,"div","cols2");
  const li=(arr,t)=>{ const d=add(g,"div","lista"); d.innerHTML=`<h3>${t}</h3><ol>${arr.map(o=>`<li><span><a href="#m${o.p.r[F.code]}">${esc(o.p.r[F.name])}</a><small>${esc(provShort(PROVS[o.p.r[F.prov]]))}</small><small style="display:block;margin-left:0">tiene ${fy(o.p.y0)}; le tocaría ${fy(o.pred)}</small></span><span class="v">${o.res>0?"+":"−"}${short2(fy,Math.abs(o.res)).replace(/^\+/,"")}</span></li>`).join("")}</ol>`; };
  li(hi,`Más ${low(yl)} de lo esperado`); li(lo2,`Menos ${low(yl)} de lo esperado`);
}

function drawMatrix(compact){
  const s=document.getElementById("cmat"); s.innerHTML="";
  const ks=MATRIX.filter(k=>F[k]!=null&&CATK[k]);
  const fk=JSON.stringify(EXF); if(MATC&&MATC._k!==fk) MATC=null;
  if(!MATC){ MATC={_k:fk}; for(let i=0;i<ks.length;i++) for(let j=i+1;j<ks.length;j++){ const c=wcorr(pairPts(ks[i],ks[j],{minPop:EXF.min>0||EXF.max<=1000?0:1000})); MATC[ks[i]+"|"+ks[j]]=MATC[ks[j]+"|"+ks[i]]=c?c.r:null; } }
  let host=s;
  if(compact){ const {x,y}=XS, cor=(k,o)=>{ const key=k+"|"+o; if(!(key in MATC)){ const c=F[k]!=null?wcorr(pairPts(k,o,{minPop:EXF.min>0||EXF.max<=1000?0:1000})):null; MATC[key]=MATC[o+"|"+k]=c?c.r:null; } return MATC[key]; },
    near=k=>ks.filter(o=>o!==k&&o!==x&&o!==y&&!isTrivial(k,o)&&cor(k,o)!=null).map(o=>[o,MATC[k+"|"+o]]).sort((p,q)=>Math.abs(q[1])-Math.abs(p[1])).slice(0,5);
    const col2=k=>`<div><h3>${esc(cap(low(labK(k))))}</h3><ul class="near">${near(k).map(([o,v])=>`<li><button type="button" data-a="${k}" data-b="${o}"><span class="nm">${esc(cap(low(labK(o))))}</span><span class="bar"><i class="${v>0?"pos":"neg"}" style="width:${(Math.abs(v)*100).toFixed(0)}%"></i></span><span class="v">${rFmt(v)}</span></button></li>`).join("")}</ul></div>`;
    add(s,"h2",null,"Con qué más se relacionan estos dos datos");
    add(s,"div","txt",`<p>Los cinco datos que más van con cada uno, en los municipios de 1.000 habitantes o más. Pulsa uno para ver ese cruce. Si alguno se parece mucho a lo que estás comparando, puede estar detrás de la relación.</p>`);
    add(s,"div","nearg",col2(x)+col2(y));
    const dd=add(s,"details","howm2"); dd.innerHTML="<summary>Tabla de todas las relaciones</summary>"; host=dd; }
  else add(s,"h2",null,"Todas las relaciones de un vistazo");
  add(host,"div","txt",`<p>Cada casilla es la correlación entre dos datos en ${EXF.min>0||EXF.max<=1000?"los municipios de la selección":"los municipios de 1.000 habitantes o más"}. Ocre: van en el mismo sentido. Azul: en sentido contrario. Cuanto más intenso el color, más fuerte la relación. Pulsa una casilla para verla en el gráfico.</p>`);
  const col=v=>{ if(v==null) return css("--nodata"); const t=Math.min(1,Math.abs(v)); return d3.interpolateRgb(css("--div-mid"),v>0?css("--rust"):css("--slate"))(Math.pow(t,0.8)); };
  const ink=v=>v!=null&&Math.abs(v)>0.55?css("--on-dark"):css("--ink");
  const sh=k=>({renta:"Renta",pobreza:"Pobreza",gini:"Desigualdad",pensiones:"Pensiones",paro:"Paro",paroReg:"Paro registrado",migExt:"Llegadas del extranjero",migInt:"Saldo con España",superiores:"Estudios superiores",alquiler:"Alquiler",noPrincipal:"Viviendas vacías o 2.ª",vt:"Pisos turísticos",varPob:"Crecimiento",edad:"Edad media",extr:"Extranjeros",solos:"Viven solos",part:"Participación",pp:"Voto PP",psoe:"Voto PSOE",vox:"Voto Vox",sumar:"Voto Sumar"}[k]||labK(k));
  const g=s;
  const m=add(host,"div","matrix");
  m.innerHTML=`<table><thead><tr><th></th>${ks.map(k=>`<th><span>${esc(sh(k))}</span></th>`).join("")}</tr></thead><tbody>${ks.map(a=>`<tr><th>${esc(sh(a))}</th>${ks.map(b=>{ if(a===b) return `<td class="self" style="background:var(--band)"></td>`; const v=MATC[a+"|"+b]; return `<td data-a="${a}" data-b="${b}" style="background:${col(v)};color:${ink(v)}" title="${esc(labK(a))} y ${esc(labK(b))}: r = ${v==null?"—":rFmt(v)}">${v==null?"":String(Math.round(v*10)).replace("-","−")}</td>`; }).join("")}</tr>`).join("")}</tbody></table>`;
  add(m,"figcaption",null,"Las cifras son la correlación multiplicada por 10 y redondeada: 9 es una relación casi perfecta y 0, ninguna. Pasa por encima de una casilla para ver el valor exacto.");
  m.querySelectorAll("td[data-a]").forEach(td=>td.addEventListener("click",()=>{ navTo("relaciones-"+td.dataset.a+"-"+td.dataset.b); window.scrollTo({top:0}); }));
  const pairs=[]; for(let i=0;i<ks.length;i++) for(let j=i+1;j<ks.length;j++){ const v=MATC[ks[i]+"|"+ks[j]]; if(v!=null&&!isTrivial(ks[i],ks[j])) pairs.push([ks[i],ks[j],v]); }
  pairs.sort((p,q)=>Math.abs(q[2])-Math.abs(p[2]));
  if(compact) return;
  const L=add(g,"div","lista"); L.style.maxWidth="720px"; L.style.marginTop="18px"; L.innerHTML=`<h3>Las relaciones más fuertes</h3><ol class="pairs">${pairs.slice(0,10).map(([a,b,v])=>`<li><a href="#relaciones-${a}-${b}">${esc(labK(a))} ${v>0?"y":"frente a"} ${low(esc(labK(b)))}<small class="muted" style="display:block;font-size:13px">${v>0?"más de uno, más del otro":"más de uno, menos del otro"}</small></a><span class="v">${rFmt(v)}</span></li>`).join("")}</ol>`;
  add(L,"figcaption",null,"Se omiten pares que miden casi lo mismo, como la edad media y el porcentaje de mayores, o el voto a dos partidos, que se reparten el mismo total.");
}

function drawCaveats(){
  const s=document.getElementById("ccav");
  s.innerHTML=`<h2>Antes de sacar conclusiones</h2><div class="caveat"><ul>
    <li><b>Que dos cosas vayan juntas no significa que una cause la otra.</b> Los municipios con más estudios tienen más renta, pero puede ser por otras razones: grandes ciudades, tipo de empleo, edad.</li>
    <li><b>Son datos de municipios, no de personas.</b> Que donde hay más mayores se vote más a un partido no dice que los mayores voten a ese partido. Es lo que se llama falacia ecológica.</li>
    <li><b>Los pueblos muy pequeños bailan mucho.</b> Con 200 vecinos, cinco familias cambian cualquier porcentaje. Por eso, por defecto, se excluyen los de menos de 1.000 habitantes.</li>
    <li><b>Los años no siempre coinciden.</b> El censo es de 2021, la renta de 2024, el padrón de 2025 y el voto de 2023. Las fuentes de cada dato aparecen debajo del gráfico.</li>
    <li><b>r solo mide relaciones en línea recta.</b> Si el gráfico dibuja una curva, r puede quedarse corto. La escala logarítmica ayuda cuando un dato tiene unos pocos valores muy altos.</li></ul></div>`;
}

// =====================================================================
// COMPARAR DOS MUNICIPIOS
// =====================================================================
const CMPROWS=[["Población",["pop","varPob","edad","extr","migExt","migInt","solos"]],["Dinero",["renta","rentaHog","pobreza","gini","pensiones"]],["Trabajo",["paroReg","paroCensal","superiores"]],["Vivienda",["alquiler","noPrincipal","vt","alqVar"]],["Voto",["part","pp","psoe","vox","sumar"]]];
async function renderComparar(a,b){
  document.title="Comparar · Indicio";
  if(!a||!BYCODE.has(a)) a=lastMun&&BYCODE.has(lastMun)?lastMun:"28079";
  if(!b||!BYCODE.has(b)||b===a) b=a==="08019"?"28079":"08019";
  const A=BYCODE.get(a), Bm=BYCODE.get(b);
  view.innerHTML=pageHead("Comparar dos municipios",`Elige dos municipios y míralos lado a lado. Desde la ficha de cada municipio puedes comparar directamente con los que más se le parecen.`)+
   `<div class="cmpbar">${[["a",A,"--rust"],["b",Bm,"--slate"]].map(([k,r,c])=>`<div><div class="who"><i style="background:var(${c})"></i>${k==="a"?"Primer":"Segundo"} municipio</div><div class="nm"><a href="#m${r[F.code]}">${esc(r[F.name])}</a></div><div class="search" id="cs-${k}" role="combobox" aria-expanded="false" aria-haspopup="listbox" style="margin:8px 0 0;max-width:340px;flex:none"><svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.6"/><path d="M11 11l3.5 3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg><input id="cq-${k}" type="search" placeholder="Cambiar por otro municipio" autocomplete="off" aria-label="Cambiar el ${k==="a"?"primer":"segundo"} municipio"><ul id="cr-${k}" class="results" role="listbox" hidden></ul></div></div>`).join("")}</div>
   <div id="cbody"></div>${methodNote()}`;
  attachSearch(document.getElementById("cq-a"),document.getElementById("cr-a"),document.getElementById("cs-a"),x=>{ navTo("comparar-"+x[F.code]+"-"+b); });
  attachSearch(document.getElementById("cq-b"),document.getElementById("cr-b"),document.getElementById("cs-b"),x=>{ navTo("comparar-"+a+"-"+x[F.code]); });
  const B=document.getElementById("cbody");
  // tabla
  // una fila por dato, con una escala común: dónde queda cada municipio entre todos los de España (del 1 % al 99 %; el padrón, en logaritmos)
  const eA=esc(dispName(A[F.name])), eB=esc(dispName(Bm[F.name])), QS={};
  const scaleOf=k=>{ if(QS[k]) return QS[k]; const vals=rowsAll().map(q=>q[F[k]]).filter(z=>z!=null&&(k!=="pop"||z>0)).sort(d3.ascending), T=k==="pop"?Math.log:(z=>z);
    const lo=T(d3.quantile(vals,.01)), hi=T(d3.quantile(vals,.99)), X=z=>Math.max(0,Math.min(1,(T(z)-lo)/((hi-lo)||1)));
    return QS[k]={X,b0:X(d3.quantile(vals,.1)),b1:X(d3.quantile(vals,.9))}; };
  let h=`<div class="cv-h"><span><i class="a"></i>${eA}</span><span><i class="b"></i>${eB}</span><span><i class="e"></i>España</span><span><i class="bd"></i>Donde está el 80 % de los municipios</span><span class="cv-n">Cada fila va de menos a más entre los municipios de España</span></div><div class="cv">`;
  for(const [g,ks] of CMPROWS){ h+=`<div class="cv-g">${g}</div>`;
    for(const k of ks){ if(F[k]==null||!CATK[k]) continue; const f=fmtK(k), va=A[F[k]], vb=Bm[F[k]], e=k==="pop"?null:esMean(k), S=scaleOf(k);
      const big=va!=null&&vb!=null&&Math.abs(va-vb)>Math.max(Math.abs(e||0)*0.15,0.0001), ca=big&&va>vb?"win":big?"dim":"", cb=big&&vb>va?"win":big?"dim":"";
      const xa=va==null?null:S.X(va), xb=vb==null?null:S.X(vb), pt=(c,x)=>x==null?"":`<i class="cv-d ${c}" style="--x:${x}"></i>`;
      h+=`<div class="cv-r"><div class="cv-l">${esc(labK(k))}${iQue(k)}<small>${esc((CATK[k].src||"").replace(/^Atlas de Renta del INE, /,""))}</small></div>
      <div class="cv-t" aria-hidden="true"><i class="cv-b" style="--x0:${S.b0};--w:${S.b1-S.b0}"></i>${e==null?"":`<i class="cv-e" style="--x:${S.X(e)}"></i>`}${xa!=null&&xb!=null?`<i class="cv-c" style="--x0:${Math.min(xa,xb)};--w:${Math.abs(xa-xb)}"></i>`:""}${pt("b",xb)}${pt("a",xa)}</div>
      <div class="cv-v"><span class="a ${ca}"><i></i>${va==null?"—":f(va)}</span><span class="b ${cb}"><i></i>${vb==null?"—":f(vb)}</span>${e==null?"":`<small>España ${f(e)}</small>`}</div></div>`; } }
  h+=`</div><p class="muted" style="font-size:13px;margin-top:8px">Pulsa la <i>i</i> de cada fila para ver qué mide exactamente ese dato. En negrita, el valor más alto cuando la diferencia es clara. El número de habitantes va en escala logarítmica. Los datos tienen años distintos; la fuente aparece bajo cada nombre.</p>`;
  const t=finding(B,"Dato a dato",""); bindQue(add(t,"div",null,h));
  // gráficos
  let da,db; try{ [da,db]=await Promise.all([loadProv(a.slice(0,2)),loadProv(b.slice(0,2))]).then(([x,y])=>[x[a],y[b]]); }catch(e){ return; }
  if(!da||!db) return;
  const s2=finding(B,"Cómo han cambiado","");
  const g=add(s2,"div","cols2"), nA=dispName(A[F.name]), nB=dispName(Bm[F.name]);
  const two=(ka)=>[{n:nA,v:da.s[ka],c:"--rust",main:true},{n:nB,v:db.s[ka],c:"--slate"},{n:"España",v:REFS.es[ka],c:"--stone",dash:true}];
  realChart(g,{title:"Renta neta por persona",source:"Fuente: INE, Atlas de Renta e IPC.",series:two("net_income_pc"),fmt:eur,tickFmt:v=>nf0.format(v/1000)+" mil"});
  if(da.pad&&db.pad) lineChart(g,{title:"Habitantes, 1996 = 100",source:"Fuente: INE, padrón.",series:[{n:nA,v:da.pad,c:"--rust",main:true},{n:nB,v:db.pad,c:"--slate"},{n:"España",v:REFS.es.pad,c:"--stone",dash:true}],years:REFS.padYears,xticks:[1996,2010,2025],index:true});
  if(da.paro&&db.paro) lineChart(g,{title:"Paro registrado, 2015 = 100",source:"Fuente: SEPE.",series:[{n:nA,v:da.paro.y,c:"--rust",main:true},{n:nB,v:db.paro.y,c:"--slate"},{n:"España",v:REFS.paro.es.paro,c:"--stone",dash:true}],years:REFS.paroYears,xticks:[2015,2020,2026],index:true});
  lineChart(g,{title:"Edad media",source:"Fuente: INE, Atlas de Renta.",series:two("mean_age"),fmt:v=>nf1.format(v)+" años"});
}
// =====================================================================
// EVOLUCIÓN: varias series en base 100 para comparar cuánto ha crecido cada una
// =====================================================================
const vtAnnual=(arr)=>{ if(!arr) return null; const P=REFS.vtPeriods, g={}; P.forEach((p,i)=>{ const y=+p.slice(0,4); if(arr[i]!=null) (g[y]=g[y]||[]).push(arr[i]); }); const ys=Object.keys(g).map(Number).sort(); return {years:ys,v:ys.map(y=>d3.mean(g[y]))}; };
// cada serie: etiqueta, grupo, unidad (eur se puede deflactar), y función que devuelve {years,v,scope} para el ámbito
// series de otras fuentes (SEPE, Seguridad Social, Ministerio de Vivienda, Hacienda): municipio en data/prov, provincia y España en REFS.otras
const OT=k=>(A,lev,P)=>{ const o=REFS.otras; if(!o) return {years:[],v:null}; return {years:o.years[k],v:lev==="es"?o.es[k]:lev==="prov"?(o.prov[P]||{})[k]:A[k]}; };
const EVO=[
  {k:"renta",l:"Renta neta por persona",g:"Ingresos",u:"eur",src:"INE, Atlas de Renta",get:(A)=>({years:YEARS,v:A.s?A.s.net_income_pc:null})},
  {k:"rentaHog",l:"Renta neta por hogar",g:"Ingresos",u:"eur",src:"INE, Atlas de Renta",get:(A)=>({years:YEARS,v:A.s?A.s.net_income_hh:null})},
  {k:"rentaMed",l:"Renta mediana (por unidad de consumo)",g:"Ingresos",u:"eur",src:"INE, Atlas de Renta",get:(A)=>({years:YEARS,v:A.s?A.s.median_income_equiv:null})},
  {k:"salMedia",l:"Salario medio",g:"Ingresos",u:"eur",nat:true,src:"INE, Encuesta de Estructura Salarial",get:()=>({years:YEARS,v:YEARS.map(y=>REFS.salarios.media[y]??null)})},
  {k:"salMed",l:"Salario mediano",g:"Ingresos",u:"eur",nat:true,src:"INE, Encuesta de Estructura Salarial",get:()=>({years:YEARS,v:YEARS.map(y=>REFS.salarios.mediana[y]??null)})},
  {k:"alq",l:"Alquiler declarado (todos los contratos)",g:"Vivienda",u:"eur",src:"INE, Índice de Precios de Vivienda en Alquiler",get:(A)=>({years:REFS.ipvaYears,v:A.ipva})},
  {k:"alqNuevo",l:"Alquiler de contratos nuevos",g:"Vivienda",u:"eur",provOnly:true,src:"INE, IPVA por antigüedad del contrato (desde 2021)",get:(A,lev,P)=>{ const ia=REFS.ipvaAntig||{}; const s=lev==="es"?ia.es:(ia.prov||{})[P]; return {years:YEARS,v:s&&s.n?s.n.map((x,i)=>i<6?null:x):null}; }},
  {k:"vt",l:"Viviendas turísticas",g:"Vivienda",u:"n",src:"INE, viviendas turísticas (media de los datos de cada año)",get:(A)=>vtAnnual(A.vt)||{years:[],v:null}},
  {k:"ipc",l:"Precios (IPC)",g:"Precios",u:"ipc",nat:true,src:"INE, IPC, media anual",get:()=>{ const ys=Object.keys(REFS.ipc).map(Number).sort(); return {years:ys,v:ys.map(y=>REFS.ipc[y])}; }},
  {k:"pib",l:"PIB",g:"Dinero público",u:"eur",nat:true,src:"Eurostat",get:()=>GOV?{years:GOV.years.map(Number),v:GOV.gdp}:{years:[],v:null}},
  {k:"govTot",l:"Gasto público total",g:"Dinero público",u:"eur",nat:true,src:"Eurostat, COFOG",get:()=>GOV?{years:GOV.years.map(Number),v:GOV.fun.TOTAL.meur}:{years:[],v:null}},
  {k:"govJub",l:"Gasto en pensiones de jubilación",g:"Dinero público",u:"eur",nat:true,src:"Eurostat, COFOG",get:()=>GOV?{years:GOV.years.map(Number),v:GOV.fun.GF1002.meur}:{years:[],v:null}},
  {k:"govSan",l:"Gasto en sanidad",g:"Dinero público",u:"eur",nat:true,src:"Eurostat, COFOG",get:()=>GOV?{years:GOV.years.map(Number),v:GOV.fun.GF07.meur}:{years:[],v:null}},
  {k:"govEdu",l:"Gasto en educación",g:"Dinero público",u:"eur",nat:true,src:"Eurostat, COFOG",get:()=>GOV?{years:GOV.years.map(Number),v:GOV.fun.GF09.meur}:{years:[],v:null}},
  {k:"govInt",l:"Intereses de la deuda",g:"Dinero público",u:"eur",nat:true,src:"Eurostat, COFOG",get:()=>GOV?{years:GOV.years.map(Number),v:GOV.fun.GF0107.meur}:{years:[],v:null}},
  {k:"govIng",l:"Ingresos públicos",g:"Dinero público",u:"eur",nat:true,src:"Eurostat",get:()=>GOV?{years:GOV.years.map(Number),v:GOV.main.TR.meur}:{years:[],v:null}},
  {k:"pob",l:"Habitantes",g:"Población y trabajo",u:"n",src:"INE, padrón municipal",get:(A)=>({years:REFS.padYears,v:A.pad})},
  {k:"paro",l:"Paro registrado",g:"Población y trabajo",u:"n",src:"SEPE (2026: enero a septiembre)",get:(A,lev,P,code)=>({years:REFS.paroYears,v:lev==="es"?REFS.paro.es.paro:lev==="prov"?(REFS.paro.prov[P]||{}).paro:(A.paro||{}).y})},
  {k:"paroL",l:"Paro registrado desde 2006",g:"Población y trabajo",u:"n",src:"SEPE, paro registrado por municipio (2026: enero a septiembre)",get:OT("paroL")},
  {k:"afil",l:"Afiliados a la Seguridad Social (diciembre)",g:"Población y trabajo",u:"n",src:"Seguridad Social, afiliados por municipio del centro de trabajo",get:OT("afil")},
  {k:"contr",l:"Contratos registrados en el año",g:"Población y trabajo",u:"n",src:"SEPE, contratos por municipio del centro de trabajo",get:OT("contr")},
  {k:"contrT",l:"Contratos temporales (% de los nuevos)",g:"Población y trabajo",u:"pct",src:"SEPE, contratos iniciales por municipio",get:OT("contrT")},
  {k:"comp",l:"Compraventas de vivienda",g:"Vivienda",u:"n",src:"Ministerio de Vivienda, transacciones de vivienda (notarios)",get:OT("comp")},
  {k:"vtas",l:"Valor tasado de la vivienda (€/m²)",g:"Vivienda",u:"eur",src:"Ministerio de Vivienda, valor tasado (municipios de más de 25.000 hab.)",get:(A,lev)=>lev==="mun"&&REFS.otras?{years:REFS.otras.years.vtas,v:A.vtas}:{years:[],v:null}},
  {k:"deuda",l:"Deuda del ayuntamiento",g:"Dinero público",u:"eur",src:"Ministerio de Hacienda, deuda viva de los ayuntamientos a 31 de diciembre",get:OT("deuda")}];
const EVOK={}; EVO.forEach(e=>EVOK[e.k]=e);
const EVOSH={pib:"PIB",govTot:"Gasto público",govJub:"Jubilación",govSan:"Sanidad",govEdu:"Educación",govInt:"Intereses deuda",govIng:"Ingresos públicos",renta:"Renta/persona",rentaHog:"Renta/hogar",rentaMed:"Renta mediana",salMedia:"Salario medio",salMed:"Salario mediano",alq:"Alquiler declarado",alqNuevo:"Alquiler nuevos",vt:"Pisos turísticos",ipc:"Precios (IPC)",pob:"Habitantes",paro:"Paro registrado",paroL:"Paro registrado",afil:"Afiliados",contr:"Contratos",contrT:"Contratos temporales",comp:"Compraventas",vtas:"Valor tasado",deuda:"Deuda municipal"};
const EVOPRESET=[["Gasto público y PIB",["govTot","govJub","govSan","govEdu","pib"]],["Sueldos y alquiler",["salMed","alq","alqNuevo","ipc"]],["Renta y precios",["renta","rentaHog","salMedia","ipc"]],["Población y paro",["pob","paro"]],["Turismo y alquiler",["vt","alq","pob"]],["Empleo y contratos",["afil","contr","contrT","paroL"]],["Compraventas y precios",["comp","vtas","alq","ipc"]]];
const EVOCOL=["--rust","--slate","--mustard","--plum","--olive","--stone"];
let ES_={sel:["salMed","alq","alqNuevo","ipc"],mun:null,lev:"es",base:null};

async function renderEvolucion(arg){
  document.title="Evolución · Indicio";
  if(arg&&/^\d{5}$/.test(arg)&&BYCODE.has(arg)){ ES_.mun=arg; ES_.lev="mun"; }
  if(!ES_.mun&&lastMun) ES_.mun=lastMun;
  view.innerHTML=pageHead("¿Qué ha crecido más?",`Elige hasta seis datos y compáralos desde un mismo año, que vale 100. Una línea que llega a 130 ha crecido un 30${NB}%. Así se pueden comparar euros, precios y personas: lo que se compara es cuánto ha crecido cada cosa, no su tamaño.`)+
   `<div class="xsug" id="epre"></div>
    <div class="evo"><div class="evo-ctl" id="ectl"></div><div class="evo-out"><div id="echart"></div><div id="esum"></div></div></div>${methodNote()}`;
  document.getElementById("epre").innerHTML='<span class="muted" style="align-self:center">Prueba:</span>'+EVOPRESET.map(([l,ks],i)=>`<a href="#" data-i="${i}">${l}</a>`).join("");
  document.querySelectorAll("#epre a").forEach(a=>a.addEventListener("click",ev=>{ ev.preventDefault(); ES_.sel=EVOPRESET[+a.dataset.i][1].slice(); ES_.base=null; drawEvoCtl(); drawEvo(); }));
  drawEvoCtl(); drawEvo();
}

function evoScope(){ const code=ES_.mun&&BYCODE.has(ES_.mun)?ES_.mun:null, lev=code?ES_.lev:"es", P=code?code.slice(0,2):null; return {lev,code,P}; }
async function evoData(){
  const {lev,code,P}=evoScope();
  let A;
  if(lev==="es") A={s:REFS.es,ipva:REFS.es.ipva,pad:REFS.es.pad,vt:REFS.es.vt};
  else if(lev==="prov") A={s:REFS.prov[P],ipva:REFS.prov[P].ipva,pad:REFS.prov[P].pad,vt:REFS.prov[P].vt};
  else { const pd=await loadProv(P); A=pd[code]||{}; }
  return {A,lev,P,code};
}

function drawEvoCtl(){
  const box=document.getElementById("ectl"); if(!box) return;
  const {lev,code,P}=evoScope(), mname=code&&BYCODE.has(code)?BYCODE.get(code)[F.name]:null;
  const groups=[...new Set(EVO.map(e=>e.g))];
  box.innerHTML=`<div class="fld"><span>Dónde</span><div class="seg" role="group" aria-label="Ámbito">
      <button type="button" data-l="es" aria-pressed="${lev==="es"}">España</button>
      ${code?`<button type="button" data-l="prov" aria-pressed="${lev==="prov"}">${esc(provShort(PROVS[P]))}</button><button type="button" data-l="mun" aria-pressed="${lev==="mun"}">${esc(dispName(mname))}</button>`:""}</div>
      <div class="search" id="es-s" role="combobox" aria-expanded="false" aria-haspopup="listbox" style="margin:8px 0 0;max-width:260px;flex:none;min-width:0"><svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.6"/><path d="M11 11l3.5 3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg><input id="es-q" type="search" placeholder="${code?"Otro municipio":"Elige un municipio"}" autocomplete="off" aria-label="Elegir municipio"><ul id="es-r" class="results" role="listbox" hidden></ul></div></div>
    ${groups.map(g=>`<fieldset class="evo-g"><legend>${g}</legend>${EVO.filter(e=>e.g===g).map(e=>`<label class="chk"><input type="checkbox" value="${e.k}" ${ES_.sel.includes(e.k)?"checked":""}> ${e.l}${e.nat&&lev!=="es"?' <small class="muted">(España)</small>':""}${e.provOnly&&lev==="mun"?' <small class="muted">(provincia)</small>':""}</label>`).join("")}</fieldset>`).join("")}
    <p class="muted" id="emax" style="font-size:13px">Hasta 6 a la vez.</p>
    <div class="fld" style="margin-top:6px"><span>Año de referencia (= 100)</span><select class="sel" id="ebase"></select></div>
    <div class="seg sm" id="ereal" style="margin-top:12px"><button type="button" data-r="0">Euros de cada año</button><button type="button" data-r="1">Descontando la inflación</button></div>`;
  box.querySelectorAll(".seg[aria-label='Ámbito'] button").forEach(b=>b.addEventListener("click",()=>{ ES_.lev=b.dataset.l; ES_.base=null; drawEvoCtl(); drawEvo(); }));
  attachSearch(document.getElementById("es-q"),document.getElementById("es-r"),document.getElementById("es-s"),r=>{ ES_.mun=r[F.code]; ES_.lev="mun"; ES_.base=null; drawEvoCtl(); drawEvo(); });
  box.querySelectorAll("input[type=checkbox]").forEach(c=>c.addEventListener("change",()=>{
    if(c.checked){ if(ES_.sel.length>=6){ c.checked=false; document.getElementById("emax").textContent="Ya hay 6 elegidas: quita una para añadir otra."; return; } ES_.sel.push(c.value); } else ES_.sel=ES_.sel.filter(k=>k!==c.value);
    ES_.base=null; drawEvo(); }));
  box.querySelectorAll("#ereal button").forEach(b=>{ b.setAttribute("aria-pressed",(b.dataset.r==="1")===REAL); b.addEventListener("click",()=>{ REAL=b.dataset.r==="1"; box.querySelectorAll("#ereal button").forEach(x=>x.setAttribute("aria-pressed",(x.dataset.r==="1")===REAL)); drawEvo(); }); });
  document.getElementById("ebase").addEventListener("change",e=>{ ES_.base=+e.target.value; drawEvo(); });
}

async function drawEvo(){
  const out=document.getElementById("echart"), sum=document.getElementById("esum"); if(!out) return;
  try{ await loadGov(); }catch(e){}
  const {A,lev,P,code}=await evoData();
  const mname=code&&BYCODE.has(code)?dispName(BYCODE.get(code)[F.name]):"";
  // series en un mapa año -> valor
  const ser=ES_.sel.map((k,i)=>{ const e=EVOK[k]; const useLev=e.nat?"es":(e.provOnly&&lev==="mun"?"prov":lev);
    const src=useLev===lev?A:(useLev==="es"?{s:REFS.es,ipva:REFS.es.ipva,pad:REFS.es.pad,vt:REFS.es.vt}:{s:REFS.prov[P],ipva:REFS.prov[P].ipva,pad:REFS.prov[P].pad,vt:REFS.prov[P].vt});
    const d=e.get(src,useLev,P,code); const m=new Map(); if(d&&d.v) d.years.forEach((y,j)=>{ let v=d.v[j]; if(v==null) return; if(REAL&&(e.u==="eur")&&IPC(y)) v=v*IPC(2024)/IPC(y); m.set(y,v); });
    if(REAL&&e.u==="ipc") m.forEach((v,y)=>m.set(y,100));
    const where=useLev==="es"?"España":useLev==="prov"?provShort(PROVS[P]):mname;
    return {e,m,c:EVOCOL[i%6],where}; });
  const ok=ser.filter(s=>s.m.size>1), miss=ser.filter(s=>s.m.size<=1);
  if(!ok.length){ out.innerHTML='<p class="loading">Elige al menos un dato con serie disponible para este lugar.</p>'; sum.innerHTML=""; return; }
  const allY=[...new Set(ok.flatMap(s=>[...s.m.keys()]))].sort((a,b)=>a-b);
  const common=allY.filter(y=>ok.every(s=>s.m.has(y)));
  const firstAll=Math.max(...ok.map(s=>Math.min(...s.m.keys())));
  const sel=document.getElementById("ebase");
  const cands=allY.filter(y=>y>=Math.min(...ok.map(s=>Math.min(...s.m.keys())))&&ok.some(s=>s.m.has(y)));
  let base=ES_.base&&cands.includes(ES_.base)?ES_.base:(common.length?common[0]:firstAll);
  if(sel){ sel.innerHTML=cands.map(y=>`<option value="${y}" ${y===base?"selected":""}>${y}</option>`).join(""); }
  const last=Math.max(...allY);
  const YR=allY.filter(y=>y>=base);
  // si una serie no tiene el año base, se toma su primer año disponible a partir de la base
  const lines=ok.map(s=>{ const b0=s.m.has(base)?base:[...s.m.keys()].filter(y=>y>=base).sort((a,b)=>a-b)[0]; if(b0==null) return null; const bv=s.m.get(b0);
    return {...s,b0,v:YR.map(y=>y<b0||!s.m.has(y)?null:s.m.get(y)/bv*100),raw:YR.map(y=>s.m.has(y)&&y>=b0?s.m.get(y):null)}; }).filter(Boolean);
  out.innerHTML="";
  const whereTxt=lev==="es"?"España":lev==="prov"?"provincia de "+provShort(PROVS[P]):mname;
  lineChart(out,{title:`Cuánto ha crecido cada dato desde ${base} (${base} = 100) · ${whereTxt}`,sub:REAL?"Las series en euros, descontando la inflación (euros de 2024).":"Euros de cada año, sin descontar la inflación.",
    source:"Fuentes: "+[...new Set(lines.map(l=>l.e.src))].join("; ")+".",
    series:lines.map((l,i)=>({n:EVOSH[l.e.k],v:l.v,c:l.c,main:i===0,rawTxt:l.raw.map(x=>x==null?null:l.e.u==="eur"&&l.e.k.match(/renta|sal/)?eur(x):l.e.u==="n"?nf0.format(x)+(l.e.k==="pob"?" hab.":""):null)})),
    years:YR,xticks:YR.length>6?[YR[0],YR[Math.floor(YR.length/2)],YR[YR.length-1]]:YR,fmt:v=>nf1.format(v),height:340});
  // resumen
  const rows=lines.map(l=>{ const ys=[...l.m.keys()].filter(y=>y>=l.b0).sort((a,b)=>a-b), y1=ys[ys.length-1]; return {l,y1,g:(l.m.get(y1)/l.m.get(l.b0)-1)*100}; }).sort((a,b)=>b.g-a.g);
  sum.innerHTML=`<ul class="evo-sum">${rows.map(r=>`<li><i style="background:var(${r.l.c})"></i><span>${esc(r.l.e.l)}${r.l.where!==whereTxt&&r.l.where!==mname?` <small class="muted">${esc(r.l.where)}</small>`:""}<small class="muted" style="display:block">${r.l.b0}–${r.y1}${r.l.b0!==base?" (no hay datos de "+base+")":""}</small></span><b>${sgn(r.g)}</b></li>`).join("")}</ul>
    ${miss.length?`<p class="muted" style="font-size:13.5px">Sin datos para este lugar: ${miss.map(s=>esc(s.e.l)).join(", ")}.</p>`:""}
    <p class="muted" style="font-size:13.5px">Compara el crecimiento, no el nivel. Que el alquiler y los salarios suban lo mismo no dice cuánto del sueldo se va en alquiler. ${REAL?"":"Pulsa «Descontando la inflación» para ver cuánto han crecido de verdad las series en euros."}</p>`;
  const lt=document.getElementById("lbtitle"); if(lt&&EX.v==="evolucion"&&/^explorar/.test(pathToKey())){ lt.textContent=lbTitle(); exSetHash(); }
}
// =====================================================================
// EXPLORADOR: un solo estado (datos, lugar, tamaño) y varias vistas
// =====================================================================
const CCAA_OF={"01":"País Vasco","20":"País Vasco","48":"País Vasco","02":"Castilla-La Mancha","13":"Castilla-La Mancha","16":"Castilla-La Mancha","19":"Castilla-La Mancha","45":"Castilla-La Mancha","03":"C. Valenciana","12":"C. Valenciana","46":"C. Valenciana",
  "04":"Andalucía","11":"Andalucía","14":"Andalucía","18":"Andalucía","21":"Andalucía","23":"Andalucía","29":"Andalucía","41":"Andalucía","05":"Castilla y León","09":"Castilla y León","24":"Castilla y León","34":"Castilla y León","37":"Castilla y León","40":"Castilla y León","42":"Castilla y León","47":"Castilla y León","49":"Castilla y León",
  "06":"Extremadura","10":"Extremadura","07":"Illes Balears","08":"Cataluña","17":"Cataluña","25":"Cataluña","43":"Cataluña","15":"Galicia","27":"Galicia","32":"Galicia","36":"Galicia","22":"Aragón","44":"Aragón","50":"Aragón",
  "26":"La Rioja","28":"Madrid","30":"Murcia","31":"Navarra","33":"Asturias","35":"Canarias","38":"Canarias","39":"Cantabria","51":"Ceuta","52":"Melilla"};
const EXVIEWS=[["mapa","Mapa","Cómo cambia un dato de un municipio a otro"],["tabla","Ranking","Ordena y filtra los municipios por varios datos"],["cruce","Relación","Si dos datos van juntos, y si la relación aguanta entre iguales"],["grupos","Grupos","Medias por comunidad, provincia, tamaño o nivel de otro dato"],["distribucion","Distribución","Cómo se reparte un dato entre la población"],["burbujas","Trayectorias","Provincias en movimiento: dos datos año a año"],["matriz","Matriz","Qué datos van juntos, todos a la vez"],["pendientes","Antes y ahora","Cómo ha cambiado cada provincia o comunidad entre dos años"],["piramide","Pirámide","Población por edad y sexo"],["composicion","Composición","De qué partes se compone un total en cada grupo"],["paises","Series","Series año a año: precios, sueldos, vivienda, empleo o población de España, una provincia o un municipio, y España frente a otros países"]];
const EXSIZES=[["","Todos los tamaños",0,Infinity],["s1","Menos de 1.000 hab.",0,1000],["s2","1.000 a 10.000 hab.",1000,10000],["s3","10.000 a 50.000 hab.",10000,50000],["s4","Más de 50.000 hab.",50000,Infinity],["g1","1.000 hab. o más",1000,Infinity],["g10","10.000 hab. o más",10000,Infinity]];
const EXQ=[["¿Dónde ha subido más el alquiler?","mapa",{d:["alqVar","rentaVar"]}],["¿Qué pueblos pequeños crecen?","tabla",{d:["varPob","migInt","edad"],t:"s2",o:"varPob"}],["¿Votan más los municipios ricos?","cruce",{d:["renta","part"],t:"g1"}],["¿Cuánto del sueldo se va en alquiler?","paises",{ser:["viv_esfuerzo"],idx:0}],["¿Suben los sueldos como los precios?","paises",{ser:["sal_mediana","viv_alq","ipc_general"],b:2015}],["¿Más paro, menos renta? ¿Y a igual edad?","cruce",{d:["paroReg","renta"],t:"g1",c:["edad"]}],["¿Cómo se reparte la renta?","distribucion",{d:["renta"]}],["¿Dónde pesan más las pensiones?","grupos",{d:["pensiones","edad"],gb:"ccaa"}],["¿Pisos turísticos y alquiler, a igual tamaño?","cruce",{d:["vt","alquiler"],t:"g10",c:["lpop","renta"]}],["¿Dónde pesa más la brecha de empleo entre hombres y mujeres?","mapa",{d:["brechaEmpleo","empleoMujeres"]}],["¿Más estudios, menos contratos temporales?","cruce",{d:["superiores2539","temporales"],t:"g1"}],["¿Quién vive de qué? Renta de trabajo frente a renta del capital","cruce",{d:["irpfTrabajo","irpfBruta"],t:"g1"}]];
let EX={v:"mapa",d:["renta","paroReg"],p:"",t:"",m:null,c:[],gb:"ccaa",w:1,o:null,lx:0,sz:"",col:"",q:0,bv:0,u:"",dg:"",ya:null,yb:null,pz:"es",pc:"es",pp:1,cf:"sector",co:0};

function exParse(h){ // explorar/vista?d=a,b&p=46&t=g1&m=46166&c=edad&gb=ccaa&e=...&b=2015&r=1
  const m=h.match(/^explorar(?:\/([a-z]+))?(?:\?(.*))?$/); if(!m) return;
  if(m[1]&&EXVIEWS.some(v=>v[0]===m[1])) EX.v=m[1];
  const q=new URLSearchParams(m[2]||"");
  q.getAll("dv").forEach(vFromUrl);   // datos propios que trae el enlace: se crean antes de leer «d», «c», etc.
  // «Evolución» ahora es parte de «Series»; «Antes y después» ya no está en el laboratorio
  if(m[1]==="evolucion"){ EX.v="paises"; const E2S={salMed:"sal_mediana",salMedia:"sal_media",ipc:"ipc_general"}, e=q.has("e")?q.get("e").split(","):["salMed","alq","alqNuevo","ipc"];
    const nq=new URLSearchParams(); nq.set("ser",e.filter(k=>EVOK[k]).map(k=>E2S[k]||"ev_"+k).join(",")); if(q.has("b")) nq.set("b",q.get("b")); if(q.has("r")) nq.set("r",q.get("r")); if(q.has("m")){ nq.set("m",q.get("m")); if(q.has("lv")) nq.set("lv",q.get("lv")); }
    exParse("explorar/paises?"+nq.toString()); return; }
  if(m[1]==="antes"){ EX.v="mapa"; }
  // la URL manda: lo que no trae vuelve a su valor por defecto (si no, al ir atrás se quedan filtros de antes)
  if(m[2]!=null){ Object.assign(EX,{p:"",t:"",m:null,c:[],o:null,w:1,lx:0,sz:"",col:"",q:0,bv:0,u:""}); if(EX.v==="evolucion"){ ES_.base=null; REAL=false; } }
  if(q.has("d")){ const raw=q.get("d").split(","); EX.d=raw.filter(k=>CATK[k]).slice(0,10); if(raw.some(k=>/^u_/.test(k)&&!CATK[k])) setTimeout(()=>toast("Este enlace usa un dato propio que no se puede recuperar: hemos puesto otro en su lugar.",5500),600); }
  if(q.has("p")) EX.p=PROVS[q.get("p")]?q.get("p"):""; if(q.has("t")) EX.t=EXSIZES.some(s=>s[0]===q.get("t"))?q.get("t"):""; if(q.has("m")&&BYCODE.has(q.get("m"))) EX.m=q.get("m");
  if(q.has("c")) EX.c=q.get("c").split(",").filter(Boolean); if(q.has("gb")) EX.gb=["ccaa","prov","size","q"].includes(q.get("gb"))?q.get("gb"):"ccaa"; if(q.has("o")) EX.o=q.get("o"); if(q.has("w")) EX.w=+q.get("w"); if(q.has("lx")) EX.lx=+q.get("lx"); EX.u=["prov","ccaa","eu"].includes(q.get("u"))?q.get("u"):"";
  if(q.has("sz")&&encOK(q.get("sz"),"sz")) EX.sz=q.get("sz"); if(q.has("col")&&encOK(q.get("col"),"col")) EX.col=q.get("col"); if(q.has("q")) EX.q=+q.get("q")?1:0; if(q.has("bv")) EX.bv=+q.get("bv")?1:0; EX.dg=["ccaa","prov","size","renta"].includes(q.get("dg"))?q.get("dg"):"";
  EX.ya=+q.get("ya")||null; EX.yb=+q.get("yb")||null; EX.pz=/^(es|c\d\d|p\d\d)$/.test(q.get("pz")||"")?q.get("pz"):"es"; EX.pc=["es","past","other","none"].includes(q.get("pc"))?q.get("pc"):"es"; EX.pq=/^(es|c\d\d|p\d\d)$/.test(q.get("pq")||"")?q.get("pq"):""; EX.py=q.get("py")==="past"?"past":""; EX.pp=q.get("pp")==="0"?0:1; EX.cf=COMPF[q.get("cf")]?q.get("cf"):"sector"; EX.co=+q.get("co")||0;
  if(EX.v==="burbujas"&&q.has("sz")) EX.sz=q.get("sz");
  if(q.has("e")) ES_.sel=q.get("e").split(",").filter(k=>EVOK[k]).slice(0,6); if(q.has("b")) ES_.base=+q.get("b"); if(q.has("r")) REAL=q.get("r")==="1";
  if(q.has("lv")) ES_.lev=["es","prov","mun"].includes(q.get("lv"))?q.get("lv"):"es"; if(EX.v==="evolucion"&&q.has("m")&&BYCODE.has(q.get("m"))) ES_.mun=q.get("m");
  if(EX.v==="paises"){ if(q.has("ind")&&PSIND[q.get("ind")]) PS.k=q.get("ind"); if(q.has("pa")) PS.c=["ES",...q.get("pa").split(",").filter(g=>/^[A-Z0-9_]{2,10}$/.test(g)&&g!=="ES")].slice(0,7); PS.gob=q.get("gob")==="0"?0:1; PS.rel=q.get("rel")==="1"?1:0; PS.ref=q.has("ref")&&/^[A-Z0-9_]{2,10}$/.test(q.get("ref"))?q.get("ref"):"EU27_2020";
    PS.s=q.has("ser")?q.get("ser").split(",").filter(k=>/^[\w]{2,60}$/.test(k)).slice(0,7):[]; PS.idx=q.get("idx")==="0"?0:q.get("idx")==="1"?1:(PS.s.length===1&&PS.s[0]==="viv_esfuerzo"?0:1); PS.desde=+q.get("desde")||null; PS.hasta=+q.get("hasta")||null;
    PS.b=+q.get("b")||null; PS.real=q.get("r")==="1"?1:0; PS.m=q.has("m")&&BYCODE.has(q.get("m"))?q.get("m"):(PS.m||lastMun||null); PS.lev=q.has("m")?(["es","prov","mun"].includes(q.get("lv"))?q.get("lv"):"mun"):(PS.lev||"es"); }
  if(EX.v==="antes"){ adSet(q.has("ev")&&ADEV[q.get("ev")]?q.get("ev"):AD.ev); if(q.has("oy")&&ADY[q.get("oy")]) AD.y=q.get("oy"); if(q.has("yr")) AD.yr=+q.get("yr")||AD.yr; if(q.has("cc")) AD.cc=q.get("cc"); if(q.has("pv")) AD.pv=q.get("pv");
    if(q.has("ms")) AD.ms=q.get("ms").split(",").filter(c=>BYCODE.has(c)).slice(0,200); if(q.has("mc")) AD.mc=+q.get("mc"); if(q.has("mp")) AD.mp=+q.get("mp"); if(q.has("mt")) AD.mt=q.get("mt")==="sint"?"sint":"gem"; }
}
function exHash(over){ const S={...EX,...(over||{})}; const q=new URLSearchParams();
  if(S.d&&S.d.length) q.set("d",S.d.join(",")); if(S.p) q.set("p",S.p); if(S.t) q.set("t",S.t); if(S.m) q.set("m",S.m); if(S.c&&S.c.length) q.set("c",S.c.join(","));
  if(S.v==="grupos") q.set("gb",S.gb); if(S.o) q.set("o",S.o); if(!S.w) q.set("w","0"); if(S.lx) q.set("lx","1");
  if(S.v==="mapa"&&S.bv) q.set("bv","1"); if((S.v==="mapa"||S.v==="pendientes")&&S.u) q.set("u",S.u); if(S.v==="burbujas"&&S.sz) q.set("sz",S.sz);
  if(S.v==="pendientes"){ ["d","p","t","c","o","w","lx"].forEach(k=>q.delete(k)); q.set("d",S.d[0]); if(S.ya) q.set("ya",S.ya); if(S.yb) q.set("yb",S.yb); if(S.p) q.set("p",S.p); }
  if(S.v==="piramide"){ ["d","p","t","c","o","w","lx","m"].forEach(k=>q.delete(k)); if(S.pz&&S.pz!=="es") q.set("pz",S.pz); if(S.pc&&S.pc!=="es") q.set("pc",S.pc); if(S.pc==="other"){ if(S.pq) q.set("pq",S.pq); if(S.py) q.set("py",S.py); } if(S.pc==="none"&&!S.pp) q.set("pp","0"); }
  if(S.v==="composicion"){ ["d","o","w","lx","c"].forEach(k=>q.delete(k)); q.set("cf",S.cf||"sector"); q.set("gb",S.gb); if(S.co) q.set("co",S.co); } if(S.v==="distribucion"&&S.dg) q.set("dg",S.dg);
  if(S.v==="cruce"){ if(S.u) q.set("u",S.u); if(S.sz) q.set("sz",S.sz); if(S.col) q.set("col",S.col); if(S.q) q.set("q","1"); }
  if(S.v==="evolucion"){ ["d","p","t","c","o","m"].forEach(k=>q.delete(k)); q.set("e",(S.e||ES_.sel).join(",")); if(ES_.base) q.set("b",ES_.base); if(REAL) q.set("r","1"); if(ES_.lev!=="es"){ q.set("lv",ES_.lev); if(ES_.mun) q.set("m",ES_.mun); } }
  if(S.v==="paises"){ ["d","p","t","c","m","o","w","lx"].forEach(k=>q.delete(k)); if(PS.s.length){ q.set("ser",PS.s.join(",")); if(!PS.idx) q.set("idx","0"); else if(PS.b) q.set("b",PS.b); if(PS.real) q.set("r","1"); if(PS.m&&PS.s.some(k=>/^ev_/.test(k))){ q.set("m",PS.m); if(PS.lev!=="mun") q.set("lv",PS.lev); } } else { q.set("ind",PS.k); q.set("pa",PS.c.join(",")); if(PS.rel) q.set("rel","1"); if(PS.ref!=="EU27_2020") q.set("ref",PS.ref); }
    if(!PS.gob) q.set("gob","0"); if(PS.desde) q.set("desde",PS.desde); if(PS.hasta) q.set("hasta",PS.hasta); }
  if(S.v==="antes"){ ["d","p","t","c","m","o"].forEach(k=>q.delete(k)); const A={...AD,...(S.ad||{})}; q.set("ev",A.ev); q.set("oy",A.y); if(ADEV[A.ev].free) q.set("yr",A.yr); if(A.ev==="ccaa"&&A.cc) q.set("cc",A.cc); if(A.ev==="prov"&&A.pv) q.set("pv",A.pv); if(A.ev==="lista"&&A.ms.length) q.set("ms",A.ms.join(",")); { const dmc=ADEV[A.ev].mc||0; if(A.mc!==dmc) q.set("mc",A.mc?"1":"0"); } if(A.mp!==ADEV[A.ev].mp) q.set("mp",A.mp); if(A.mt==="sint") q.set("mt","sint"); }
  vCustomIn([...(q.get("d")||"").split(","),...(q.get("c")||"").split(","),q.get("sz"),q.get("col"),(q.get("o")||"").replace(/^-/,"")]).forEach(k=>q.append("dv",vEnc(VBYK[k])));   // los datos propios viajan con el enlace
  return "/laboratorio/"+S.v+"/"+(q.toString()?"?"+q.toString().replace(/%2C/g,",").replace(/%7E/g,"~"):""); }
// enlace desde los informes
const exLink=(view,o,txt)=>{ const save={...EX}; const h=exHash({v:view,d:o.d||EX.d,p:o.p||"",t:o.t||"",c:o.c||[],gb:o.gb||EX.gb,o:o.o||null,e:o.e,lx:o.lx||0}); return `<a class="exlink" href="${h}">${txt||"Ábrelo en el explorador"} →</a>`; };
function exSync(){ const sz=EXSIZES.find(s=>s[0]===EX.t)||EXSIZES[0]; EXF={prov:EX.p||"",min:sz[2],max:sz[3]}; }
function exRows(k){ return rowsAll().filter(r=>exOK(r)&&(k?r[F[k]]!=null:true)); }
function exSetHash(){ try{ history.replaceState(null,"",keyToPath(exHash())); }catch(e){} }

// ---------- mapa ----------
async function exMapa(out){
  if(EX.u==="prov"||EX.u==="ccaa"){ await loadRegional(); return exMapaAgg(out,EX.d[0]); }
  const k=EX.d[0], f=fmtK(k);
  const g=add(out,"div","exmap");
  const left=add(g,"div","exmap-m"), right=add(g,"div","exlists");
  add(left,"div","cs",esc(CATK[k].src||""));
  const mb=add(left,"div","mapbox",'<div class="maploading">Dibujando el mapa…</div>'), lg=add(left,"div","legend");
  // listas
  const rows=exRows(k);
  if(!rows.length){ out.innerHTML=`<p class="loading">Ningún municipio de esta selección tiene dato de ${esc(low(labK(k)))}. Prueba con otro tamaño o provincia.</p>`; return; }
  const minL=EX.t?0:(EX.p?0:5000), pool=rows.filter(r=>(r[F.pop]||0)>=minL).sort((a,b)=>b[F[k]]-a[F[k]]);
  const li=(arr,t)=>`<div class="lista"><h3>${t}</h3><ol>${arr.map(r=>`<li><span><a href="#m${r[F.code]}">${esc(r[F.name])}</a><small>${esc(provShort(PROVS[r[F.prov]]))}</small></span><span class="v">${f(r[F[k]])}</span></li>`).join("")}</ol></div>`;
  right.innerHTML=li(pool.slice(0,8),"Valores más altos")+li(pool.slice(-8).reverse(),"Valores más bajos")+`<figcaption>${minL?"Municipios de 5.000 habitantes o más, para que los muy pequeños no copen las listas. ":""}Media de la selección: <b>${f(d3.sum(rows,r=>r[F[k]]*(r[F.pop]||0))/d3.sum(rows,r=>r[F.pop]||0))}</b>, ponderada por población. España: ${f(esMean(k))}.</figcaption><p style="margin-top:10px">${exLink("tabla",{d:EX.d,p:EX.p,t:EX.t,o:k},"Ver todos en la tabla")}</p>`;
  try{ await loadTopo(); }catch(e){ mb.innerHTML='<div class="maploading">No se pudo cargar el mapa.</div>'; return; }
  if(!document.body.contains(mb)) return;
  mb.innerHTML="";
  const W=640,H=EX.p?560:520;
  const feats=EX.p?FEATS.filter(ft=>ft.id.slice(0,2)===EX.p):FEATS;
  let proj;
  if(EX.p) proj=d3.geoMercator().fitSize([W-10,H-10],{type:"FeatureCollection",features:feats});
  else { const regions=topojson.feature(TOPO,TOPO.objects.autonomous_regions); regions.features.forEach(rewind); proj=d3.geoConicConformalSpain().fitSize([W-10,H-10],regions); }
  const path=d3.geoPath(proj);
  const svg=d3.select(mb).append("svg").attr("viewBox",`0 0 ${W} ${H}`).attr("role","img").attr("aria-label","Mapa de "+labK(k));
  const zg=svg.append("g"), gg=zg.append("g").attr("transform","translate(5,5)");
  const tip=el("div","maptip"); tip.hidden=true; mb.appendChild(tip);
  const vals=rows.map(r=>r[F[k]]), ramp=[0,1,2,3,4,5,6].map(i=>css("--ramp-"+i));
  const neg=d3.quantile(vals.slice().sort((a,b)=>a-b),.15)<0&&d3.quantile(vals.slice().sort((a,b)=>a-b),.85)>0;
  let scale,stops,labels;
  if(neg){ const m=Math.max(Math.abs(d3.quantile(vals.slice().sort((a,b)=>a-b),.05)),Math.abs(d3.quantile(vals.slice().sort((a,b)=>a-b),.95))); const th=[-m*.6,-m*.25,-m*.05,m*.05,m*.25,m*.6];
    stops=[css("--div-neg"),css("--div-neg2"),"#c9d6e6",css("--div-mid"),ramp[2],ramp[4],ramp[6]]; scale=d3.scaleThreshold().domain(th).range(stops); labels=[f(-m*.6)+" o menos",f(m*.6)+" o más"]; }
  else { const qs=d3.scaleQuantile().domain(vals).range(ramp); scale=qs; stops=ramp; const th=qs.quantiles(); labels=[f(th[0]),f(th[th.length-1])]; }
  const ok=new Set(rows.map(r=>r[F.code]));
  const k2=EX.bv&&EX.d[1]&&EX.d[1]!==k?EX.d[1]:null; let bivC=null;
  if(k2){ const f2=fmtK(k2), r2=rows.filter(r=>r[F[k2]]!=null), a1=r2.map(r=>r[F[k]]).sort(d3.ascending), a2=r2.map(r=>r[F[k2]]).sort(d3.ascending);
    const t=(a,v)=>v<=d3.quantile(a,1/3)?0:v<=d3.quantile(a,2/3)?1:2, BI=["#e8e8e8","#ace4e4","#5ac8c8","#dfb0d6","#a5add3","#5698b9","#be64ac","#8c62aa","#3b4994"];
    bivC=r=>r[F[k]]==null||r[F[k2]]==null?null:BI[t(a2,r[F[k2]])*3+t(a1,r[F[k]])];
    const big=(a,b)=>r2.filter(r=>t(a1,r[F[k]])===a&&t(a2,r[F[k2]])===b).sort((x,y)=>(y[F.pop]||0)-(x[F.pop]||0)).slice(0,8);
    const li2=(arr,tt)=>`<div class="lista"><h3>${tt}</h3><ol>${arr.map(r=>`<li><span><a href="#m${r[F.code]}">${esc(r[F.name])}</a><small>${esc(provShort(PROVS[r[F.prov]]))}</small></span><span class="v">${f(r[F[k]])} · ${f2(r[F[k2]])}</span></li>`).join("")}</ol></div>`;
    right.innerHTML=li2(big(2,2),`Más ${low(labK(k))} y más ${low(labK(k2))}`)+li2(big(0,2),`Menos ${low(labK(k))} y más ${low(labK(k2))}`)+`<figcaption>Los municipios más grandes de cada combinación. Cada dato se divide en tres tramos con el mismo número de municipios.</figcaption>`;
    lg.innerHTML=`<div class="bvleg"><div class="bvg">${[2,1,0].map(y=>[0,1,2].map(x=>`<i style="background:${BI[y*3+x]}"></i>`).join("")).join("")}</div><div class="bvt"><span>↑ ${esc(labK(k2))}: más</span><span>${esc(labK(k))}: más →</span></div><p class="help">Rosa o morado: alto en ${esc(low(labK(k2)))}. Azul: alto en ${esc(low(labK(k)))}. Morado oscuro: alto en los dos. Gris: bajo en los dos.</p></div>`; }
  gg.selectAll("path").data(feats).join("path").attr("d",path).attr("class","mun").attr("stroke",css("--geo-line")).attr("stroke-width",EX.p?.4:.15)
    .attr("fill",ft=>{ const r=BYCODE.get(ft.id); if(k2) return (r&&ok.has(ft.id)&&bivC(r))||css("--nodata"); return r&&ok.has(ft.id)&&r[F[k]]!=null?scale(r[F[k]]):css("--nodata"); })
    .on("pointermove",(ev,ft)=>{ const r=BYCODE.get(ft.id); tip.innerHTML=`<b>${esc(r?r[F.name]:ft.properties.name)}</b>: ${r&&r[F[k]]!=null?f(r[F[k]]):"sin dato"}${k2?`<br>${esc(labK(k2))}: ${r&&r[F[k2]]!=null?fmtK(k2)(r[F[k2]]):"sin dato"}`:""}${r&&!ok.has(ft.id)?" (fuera del filtro)":""}`; tip.hidden=false; const bb=mb.getBoundingClientRect(); tip.style.left=Math.max(tip.offsetWidth/2+4,Math.min(bb.width-tip.offsetWidth/2-4,ev.clientX-bb.left))+"px"; tip.style.top=(ev.clientY-bb.top)+"px"; })
    .on("pointerleave",()=>tip.hidden=true).on("click",(ev,ft)=>{ if(BYCODE.has(ft.id)) go(ft.id); });
  if(!EX.p){ gg.append("path").datum(topojson.mesh(TOPO,TOPO.objects.provinces,(a,b)=>a!==b)).attr("fill","none").attr("stroke",css("--geo-line")).attr("stroke-width",.6).attr("d",path); gg.append("path").attr("d",proj.getCompositionBorders()).attr("fill","none").attr("stroke",css("--muted")).attr("stroke-width",.8); }
  [EX.m,MUN2].filter(Boolean).forEach((c,i)=>{ const ft=feats.find(x=>x.id===c); if(ft) gg.append("path").datum(ft).attr("d",path).attr("fill","none").attr("stroke",css(i?"--slate":"--ink")).attr("stroke-width",2.2); });
  addMapZoom(svg,zg,gg,W,H,mb);
  if(!k2) lg.innerHTML=`<span class="num">${labels[0]}</span><span class="bar">${stops.map(c=>`<i style="background:${c}"></i>`).join("")}</span><span class="num">${labels[1]}</span><span class="help">${neg?"En azul, valores negativos; en granate, positivos.":"Siete grupos con el mismo número de municipios."} En gris, sin dato o fuera del filtro. Pulsa un municipio para abrir su ficha.</span>`;
}

// ---------- tabla ----------
let EXTN=100;
function exTabla(out){
  const ks=EX.d, o0=(EX.o||"").replace(/^-/,""), sortK=o0&&(o0==="pop"||ks.includes(o0))?o0:ks[0];
  const rows=exRows().filter(r=>ks.some(k=>r[F[k]]!=null));
  const desc=!(EX.o&&EX.o.startsWith("-")&&sortK===o0);
  rows.sort((a,b)=>{ const va=a[F[sortK]], vb=b[F[sortK]]; if(va==null) return 1; if(vb==null) return -1; return desc?vb-va:va-vb; });
  const box=add(out,"div");
  box.innerHTML=`<div class="exrow" style="margin-bottom:8px"><input class="sel" id="extf" type="search" placeholder="Filtrar por nombre" style="max-width:240px"><span class="muted exhint">${nf0.format(rows.length)} municipios. Pulsa una columna para ordenar.</span><button type="button" class="sel" id="excsv" style="margin-left:auto">Descargar CSV</button></div><div class="extable"></div>`;
  const tb=box.querySelector(".extable");
  const draw=(filter)=>{ const rs=filter?rows.filter(r=>norm(r[F.name]).includes(norm(filter))):rows;
    const cols=[["pop","Habitantes"],...ks.map(k=>[k,labK(k)])];
    tb.innerHTML=`<table class="glance"><thead><tr><th>#</th><th>Municipio</th>${cols.map(([k,l])=>`<th class="r"${k===sortK?` aria-sort="${desc?"descending":"ascending"}"`:""}><button type="button" class="sortb${k===sortK?" on":""}" data-k="${k}">${esc(l)}${k===sortK?(desc?" ↓":" ↑"):""}</button></th>`).join("")}</tr></thead><tbody>${rs.slice(0,EXTN).map((r,i)=>`<tr${r[F.code]===EX.m||r[F.code]===MUN2?' class="me"':""}><td class="muted">${i+1}</td><td><a href="#m${r[F.code]}">${esc(r[F.name])}</a><small class="muted" style="display:block;font-size:12.5px">${esc(provShort(PROVS[r[F.prov]]))}</small></td>${cols.map(([k])=>`<td class="r num">${r[F[k]]==null?"—":fmtK(k)(r[F[k]])}</td>`).join("")}</tr>`).join("")}</tbody></table>${rs.length>EXTN?`<button type="button" class="sel" id="exmore" style="margin-top:10px">Mostrar ${Math.min(100,rs.length-EXTN)} más</button>`:""}`;
    tb.querySelectorAll(".sortb").forEach(b=>b.addEventListener("click",()=>{ EX.o=b.dataset.k===sortK&&desc?"-"+b.dataset.k:b.dataset.k; EXTN=100; exSetHash(); exDraw(); }));
    const mo=tb.querySelector("#exmore"); if(mo) mo.addEventListener("click",()=>{ EXTN+=100; draw(filter); }); };
  draw("");
  box.querySelector("#extf").addEventListener("input",e=>draw(e.target.value));
  box.querySelector("#excsv").addEventListener("click",()=>{ const cols=["code","name","prov","pop",...ks]; const lines=[["codigo_ine","municipio","provincia","habitantes",...ks.map(labK)].join(";")].concat(rows.map(r=>[r[F.code],'"'+r[F.name]+'"','"'+provShort(PROVS[r[F.prov]])+'"',r[F.pop],...ks.map(k=>r[F[k]]==null?"":String(r[F[k]]).replace(".",","))].join(";")));
    const blob=new Blob(["﻿"+lines.join("\n")],{type:"text/csv;charset=utf-8"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="cifrario.csv"; document.body.appendChild(a); a.click(); a.remove(); });
  add(out,"figcaption",null,"Fuentes y años de cada dato: "+ks.map(k=>`${labK(k)}, ${CATK[k].src}`).join(" · ")+".");
}

// ---------- cruce (con controles para acercarse a la causa) ----------
const EXCTRL=[["lpop","Tamaño","el tamaño del municipio"],["edad","Edad media","la edad media"],["renta","Renta","la renta"],["superiores","Estudios","los estudios"],["prov","Provincia","la provincia"]];
const CHG={renta:"rentaVar",rentaHog:"rentaVar",pop:"varPob",paroReg:"paroReg15",vt:"vtCambio",alqVar:"alqVar20"};
// residuos de una regresión ponderada (con constante) sobre las columnas Z
function wresid(y,Z,w){ const n=y.length, k=Z[0]?Z[0].length:0, p=k+1; const X=y.map((_,i)=>[1,...(k?Z[i]:[])]);
  const A=Array.from({length:p},()=>new Array(p).fill(0)), b=new Array(p).fill(0);
  for(let i=0;i<n;i++){ for(let a=0;a<p;a++){ b[a]+=w[i]*X[i][a]*y[i]; for(let c=0;c<p;c++) A[a][c]+=w[i]*X[i][a]*X[i][c]; } }
  for(let a=0;a<p;a++) A[a][a]+=1e-9;
  for(let c=0;c<p;c++){ let piv=c; for(let r=c+1;r<p;r++) if(Math.abs(A[r][c])>Math.abs(A[piv][c])) piv=r; [A[c],A[piv]]=[A[piv],A[c]]; [b[c],b[piv]]=[b[piv],b[c]]; const d=A[c][c]||1e-12; for(let r=0;r<p;r++){ if(r===c) continue; const f=A[r][c]/d; for(let q=c;q<p;q++) A[r][q]-=f*A[c][q]; b[r]-=f*b[c]; } }
  const beta=b.map((v,i)=>v/(A[i][i]||1e-12)); return y.map((v,i)=>v-X[i].reduce((s,x,j)=>s+x*beta[j],0)); }
function demeanBy(v,g,w){ const S={},W={}; v.forEach((x,i)=>{ S[g[i]]=(S[g[i]]||0)+w[i]*x; W[g[i]]=(W[g[i]]||0)+w[i]; }); return v.map((x,i)=>x-S[g[i]]/W[g[i]]); }
// datos ajustados: cada municipio, quitando lo que explican los controles (se suma la media para no perder las unidades)
function adjData(x,y,ctrls,weighted,rowsIn){
  const cs=ctrls.filter(c=>c!==x&&c!==y), lx=EX.v==="cruce"&&!!EX.lx;   // con escala logarítmica en horizontal, las pruebas usan también log10(x)
  const rs=(rowsIn||rowsAll().filter(r=>exOK(r)&&r[F[x]]!=null&&r[F[y]]!=null&&(r[F.pop]||0)>0&&cs.every(c=>c==="lpop"||c==="prov"?true:c==="lpop20"?r[F.pop20]>0:r[F[c]]!=null))).filter(r=>!lx||r[F[x]]>0);
  if(rs.length<20) return null;
  const w=rs.map(r=>weighted?(r[F.pop]||1):1), W=d3.sum(w);
  const X0=rs.map(r=>lx?Math.log10(r[F[x]]):r[F[x]]), Y0=rs.map(r=>r[F[y]]); let X=X0.slice(), Y=Y0.slice();
  const fe=cs.includes("prov"), g=fe?rs.map(r=>r[F.prov]):null;
  if(fe){ X=demeanBy(X,g,w); Y=demeanBy(Y,g,w); }
  const num=cs.filter(c=>c!=="prov");
  // con efectos fijos de provincia, los controles también se centran por provincia (Frisch–Waugh–Lovell exacto)
  if(num.length){ let cols=num.map(c=>rs.map(r=>c==="lpop"?Math.log10(r[F.pop]):c==="lpop20"?Math.log10(r[F.pop20]):r[F[c]])); if(fe) cols=cols.map(col=>demeanBy(col,g,w)); const Z=rs.map((r,i)=>cols.map(col=>col[i])); X=wresid(X,Z,w); Y=wresid(Y,Z,w); }
  if(cs.length){ const mx=d3.sum(X0,(v,i)=>v*w[i])/W, my=d3.sum(Y0,(v,i)=>v*w[i])/W, ax=d3.sum(X,(v,i)=>v*w[i])/W, ay=d3.sum(Y,(v,i)=>v*w[i])/W; X=X.map(v=>v-ax+mx); Y=Y.map(v=>v-ay+my); }
  const c=wcorr(X.map((v,i)=>({x:v,y:Y[i],w:w[i]})));
  return {rs,w,X0,Y0,X,Y,c,cs};
}
function partialR(x,y,ctrls,weighted){ const d=adjData(x,y,ctrls,weighted); return d&&d.c?{r:d.c.r,n:d.rs.length}:null; }
// =====================================================================
// INCERTIDUMBRE: intervalos por remuestreo (bootstrap) y fichas técnicas
// =====================================================================
// Generador determinista (misma semilla → mismos intervalos en cada carga)
function rng(seed){ let s=seed>>>0||1; return ()=>{ s^=s<<13; s>>>=0; s^=s>>>17; s^=s<<5; s>>>=0; return s/4294967296; }; }
// Remuestrea municipios con reemplazo y recalcula la estadística `stat(rows)`; devuelve [p2.5, p97.5]
function bootCI(rows,stat,{B=200,seed=7}={}){
  const R=rng(seed), n=rows.length, out=[];
  for(let b=0;b<B;b++){ const s=new Array(n); for(let i=0;i<n;i++) s[i]=rows[(R()*n)|0]; const v=stat(s); if(v!=null&&isFinite(v)) out.push(v); }
  if(out.length<20) return null; out.sort((a,b)=>a-b); return [out[Math.floor(out.length*0.025)],out[Math.ceil(out.length*0.975)-1]];
}
// Correlación parcial con intervalo: {r,n,ci}
// (el remuestreo se hace sobre los pares de residuos ya calculados: con miles de municipios, la incertidumbre de estimar los controles es despreciable frente a la de la correlación)
function partialRCI(x,y,ctrls,weighted,{B=200}={}){
  const d=adjData(x,y,ctrls,weighted); if(!d||!d.c) return null;
  const pts=d.X.map((v,i)=>({x:v,y:d.Y[i],w:d.w[i]}));
  const ci=bootCI(pts,s=>{ const c=wcorr(s); return c?c.r:null; },{B});
  return {r:d.c.r,n:d.rs.length,ci};
}
const ciFmt=ci=>ci?` <span class="ci" title="Intervalo del 95 % por remuestreo de municipios">[${rFmt(ci[0])}; ${rFmt(ci[1])}]</span>`:"";
const rCI=c=>c?`r = ${rFmt(c.r)}${ciFmt(c.ci)}`:"—";
const ciZero=c=>!c||!c.ci||(c.ci[0]<=0&&c.ci[1]>=0);
// Ficha técnica plegable al final de cada estudio
function ficha(parent,items){
  const d=add(parent,"details","ficha"); d.innerHTML=`<summary>Ficha técnica</summary><dl>${items.filter(x=>x&&x[1]).map(([k,v])=>`<dt>${k}</dt><dd>${v}</dd>`).join("")}</dl>`; return d;
}
const FICHA_R=`Correlación de Pearson; «entre iguales» o «a igual X» es la correlación parcial: se regresan las dos variables sobre los controles (mínimos cuadrados, con constante) y se correlacionan los residuos. «Dentro de cada provincia» resta a cada variable la media de su provincia antes. «Explica» es r². Los intervalos son del 95 % por remuestreo de municipios (200 réplicas).`;
const FICHA_DID=`Diferencias en diferencias: (cambio en el grupo afectado) − (cambio en el grupo de comparación). Sin error estándar formal: la incertidumbre se mide con placebos, repitiendo el cálculo como si el tratamiento hubiera caído en cada uno de los otros grupos.`;
// Distribución de placebos: dónde cae el efecto real entre los efectos "falsos"
function placeboRank(real,others){ const a=others.filter(v=>v!=null); if(a.length<5) return null; const below=a.filter(v=>v<=real).length; return {n:a.length,below,share:below/a.length,min:d3.min(a),max:d3.max(a),sd:d3.deviation(a)}; }
// =====================================================================
// ARTÍCULO DE INVESTIGACIÓN: resumen, secciones numeradas y apéndice de métodos
// =====================================================================
const SECN={ctx:["1","El contexto"],int:["2","Qué cambió"],ana:["3","Cómo lo hemos medido"],res:["4","Lo que dicen los datos"],con:["5","Qué significa"]};
function sec(B,key,html,{title}={}){ const [n,t]=SECN[key]; const s=add(B,"section","finding psec psec-"+key); add(s,"h2",null,title||t); if(html) add(s,"div","txt",html); return s; }
// «Qué nos dice»: lectura de un resultado para el lector, debajo del gráfico o la tabla
function lect(parent,html,label="Qué nos dice"){ const d=add(parent,"div","lect"); d.innerHTML=`<span class="lect-k">${label}</span>${html}`; return d; }
function res(B,title,html){ if(!B.querySelector(".psec-res")) sec(B,"res"); const s=add(B,"section","finding pres"); if(title) add(s,"h3",null,title); if(html) add(s,"div","txt",html); return s; }
// =====================================================================
// ANÁLISIS EN MARKDOWN: el texto vive en contenido/analisis/<id>.md (lo edita una persona) y el código solo
// calcula las cifras ({{variable}}) y dibuja los gráficos ([[grafico:id]]). Sintaxis en contenido/analisis/LEEME.md.
// =====================================================================
const MDB=(window.__INDICIO&&window.__INDICIO.md)||{};
const MDFMT={n0:v=>nf0.format(v),n1:v=>nf1.format(v),n2:v=>nf2.format(v),pct0:v=>nf0.format(v)+NB+"%",pct1:v=>nf1.format(v)+NB+"%",
  pcts0:v=>(v>0?"+":v<0?"−":"")+nf0.format(Math.abs(v))+NB+"%",pcts1:v=>sgn(v),eur:v=>nf0.format(v)+NB+"€",eur2:v=>nf2.format(v)+NB+"€",
  mil:v=>nf0.format(Math.round(v/1000)*1000),pts0:v=>nf0.format(v)+" puntos",pts1:v=>nf1.format(v)+" puntos",veces:v=>nf1.format(v)+" veces",
  abs:v=>Math.abs(v),r100:v=>Math.round(v/100)*100,r1000:v=>Math.round(v/1000)*1000};
function mdVars(src,V,id){
  return src.replace(/\{\{\s*([\p{L}\p{N}_.]+)\s*((?:\|\s*\w+\s*)*)\}\}/gu,(m,k,pipes)=>{
    let v=k.split(".").reduce((o,p)=>o==null?o:o[p],V);
    if(v==null||(typeof v==="number"&&!isFinite(v))){ console.warn(`[${id}.md] falta la variable {{${k}}}`); return `<span class="md-falta" title="Variable sin valor: ${esc(k)}">${esc(m)}</span>`; }
    const fs=pipes.split("|").map(x=>x.trim()).filter(Boolean);
    for(const f of fs){ if(!MDFMT[f]){ console.warn(`[${id}.md] formato desconocido «${f}»`); continue; } v=MDFMT[f](v); }
    if(typeof v==="number") v=(Number.isInteger(v)?MDFMT.n0:MDFMT.n1)(v);
    return String(v); });
}
function mdInline(t){
  return t.replace(/\*\*([^*]+)\*\*/g,"<b>$1</b>").replace(/(^|[^*])\*([^*\s][^*]*?)\*/g,"$1<i>$2</i>").replace(/==([^=]+)==/g,"<mark>$1</mark>")
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g,(m,a,u)=>`<a href="${u.replace(/"/g,"&quot;")}"${/^https?:/.test(u)?' rel="noopener"':""}>${a}</a>`).replace(/ (%|€)/g,NB+"$1");
}
// pinta el análisis <id> dentro de B. V: variables; G: {id: el=>dibuja}. Devuelve {sections} por si el código quiere añadir algo.
function mdRender(B,id,V={},G={}){
  const raw=MDB[id]; if(raw==null){ B.insertAdjacentHTML("beforeend",`<p class="loading">Falta el texto de este análisis (contenido/analisis/${esc(id)}.md).</p>`); return {}; }
  const lines=mdVars(raw.replace(/<!--[\s\S]*?-->/g,""),V,id).split("\n");
  let cur=add(B,"div","md-intro txt"), box=cur, para=[], list=null, quote=null; const secs={};
  const flushP=()=>{ if(para.length){ add(box,"p",null,mdInline(para.join(" "))); para=[]; } };
  const flushL=()=>{ if(list){ add(box,list.t,null,list.items.map(i=>`<li>${mdInline(i)}</li>`).join("")); list=null; } };
  const flushQ=()=>{ if(quote){ const lab=(quote[0].match(/^\[([^\]]+)\]\s*/)||[])[1]; if(lab) quote[0]=quote[0].replace(/^\[[^\]]+\]\s*/,"");
      lect(cur,quote.join("\n").split(/\n\s*\n/).map(p=>`<p>${mdInline(p.replace(/\n/g," "))}</p>`).join(""),lab||"Qué nos dice"); quote=null;  box=add(cur,"div","txt"); } };
  const flush=()=>{ flushP(); flushL(); flushQ(); };
  for(const ln of lines){
    let m;
    if((m=ln.match(/^(#{2,3})\s+(.*)$/))){ flush(); const h=m[1].length;
      cur=add(B,"section",(h===2?"finding psec md-sec":"finding pres md-sub")+(/^(como esta hecho|metodo|de donde salen)/.test(norm(m[2]))?" md-method":"")); add(cur,h===2?"h2":"h3",null,mdInline(m[2])); box=add(cur,"div","txt"); secs[norm(m[2]).replace(/ /g,"-")]=cur; continue; }
    if((m=ln.match(/^\s*\[\[\s*(grafico|gráfico|bloque)\s*:\s*([\w-]+)\s*\]\]\s*$/i))){ flush(); const d=add(cur,"div","md-chart"); d.dataset.g=m[2];
      if(G[m[2]]){ try{ G[m[2]](d); }catch(e){ console.error(e); d.innerHTML='<p class="loading">No se pudo dibujar este gráfico.</p>'; } }
      else { console.warn(`[${id}.md] no existe el gráfico «${m[2]}». Disponibles: ${Object.keys(G).join(", ")}`); d.innerHTML=`<p class="md-falta">Gráfico «${esc(m[2])}» no encontrado</p>`; }
      box=add(cur,"div","txt"); continue; }
    if((m=ln.match(/^>\s?(.*)$/))){ flushP(); flushL(); (quote=quote||[]).push(m[1]); continue; }
    if(quote&&!ln.trim()){ flushQ(); continue; }
    if((m=ln.match(/^\s*[-*]\s+(.*)$/))){ flushP(); flushQ(); if(!list||list.t!=="ul"){ flushL(); list={t:"ul",items:[]}; } list.items.push(m[1]); continue; }
    if((m=ln.match(/^\s*\d+[.)]\s+(.*)$/))){ flushP(); flushQ(); if(!list||list.t!=="ol"){ flushL(); list={t:"ol",items:[]}; } list.items.push(m[1]); continue; }
    if(/^\s*---+\s*$/.test(ln)){ flush(); add(box,"hr"); continue; }
    if(!ln.trim()){ flushP(); flushL(); continue; }
    if(list&&/^\s{2,}\S/.test(ln)){ list.items[list.items.length-1]+=" "+ln.trim(); continue; }
    flushL(); para.push(ln.trim());
  }
  flush();
  B.querySelectorAll(".txt").forEach(t=>{ if(!t.innerHTML.trim()) t.remove(); });
  return {sections:secs};
}
// resumen al principio: se crea vacío y se rellena cuando el estudio ya tiene sus números
function abstract(B){ const a=el("aside","abstract"); a.setAttribute("aria-label","Resumen"); B.prepend(a); a.innerHTML='<p class="muted">Calculando…</p>';
  const S=[...STUDIES,...STUDIES_HIDDEN].find(x=>location.pathname.includes("/"+x.id+"/"));
  return {fill:o=>{ const lede=o.lede||(S&&S.a)||""; a.innerHTML=`<div class="abs-h">La respuesta</div>${lede?`<p class="abs-lede">${lede}</p>`:""}<dl>${[["ctx","El contexto"],["int",o.intT||"Qué cambió"],["ana","Cómo lo medimos"],["res","Lo que sale"],["con","Qué significa"]].filter(([k])=>o[k]).map(([k,l])=>`<dt>${l}</dt><dd>${o[k]}</dd>`).join("")}</dl><p class="abs-m"><a href="#metodos">El método completo, al final ↓</a></p>`; }}; }
// apéndice de métodos (visible, al final del estudio)
function methods(B,items){
  const S=[...STUDIES,...STUDIES_HIDDEN].find(x=>location.pathname.includes("/"+x.id+"/")), ev=S&&S.ev&&EVID[S.ev];
  const all=items.concat([ev?["Nivel de evidencia",`<span class="ev ev-${S.ev}">${esc(ev.l)}</span> ${esc(ev.d)} <a href="/laboratorio/metodo/#evidencia">Qué significa →</a>`]:null,["Reproducibilidad",`Todos los cálculos se hacen en el navegador con los datos publicados en la web; el código está en <a href="https://github.com/bburriel/indicio.es" target="_blank" rel="noopener">GitHub</a> (<code>src/app.js</code>). Los intervalos usan una semilla fija: salen iguales en cada carga.`]]);
  const s=add(B,"section","finding methods"); s.id="metodos"; s.innerHTML=`<h2>Métodos</h2><dl>${all.filter(x=>x&&x[1]).map(([k,v])=>`<dt>${k}</dt><dd>${v}</dd>`).join("")}</dl>`; return s; }

// =====================================================================
// REGRESIÓN SOBRE FUNCIONES: pendiente parcial (efecto en unidades) con efectos fijos e intervalo
// =====================================================================
// rows: municipios; x, y: funciones; z: controles (funciones); fe: efectos fijos de provincia; w: peso (función) o null
function regFn(rows,{x,y,z=[],fe=true,w=null,B=200}){
  const rs=rows.filter(r=>{ const a=x(r), b=y(r); return a!=null&&b!=null&&isFinite(a)&&isFinite(b)&&z.every(f=>{ const v=f(r); return v!=null&&isFinite(v); }); }); if(rs.length<20) return null;
  const W=rs.map(r=>w?w(r):1), g=rs.map(r=>r[F.prov]);
  let X=rs.map(x), Y=rs.map(y), cols=z.map(f=>rs.map(f));
  if(fe){ X=demeanBy(X,g,W); Y=demeanBy(Y,g,W); cols=cols.map(c=>demeanBy(c,g,W)); }
  if(cols.length){ const Z=rs.map((r,i)=>cols.map(c=>c[i])); X=wresid(X,Z,W); Y=wresid(Y,Z,W); }
  const pts=X.map((v,i)=>({x:v,y:Y[i],w:W[i]})), c=wcorr(pts); if(!c) return null;
  const ci=bootCI(pts,s=>{ const k=wcorr(s); return k?k.b:null; },{B}), rci=bootCI(pts,s=>{ const k=wcorr(s); return k?k.r:null; },{B});
  return {b:c.b,r:c.r,ci,rci,n:rs.length,sdx:Math.sqrt(d3.sum(pts,p=>p.w*p.x*p.x)/d3.sum(pts,p=>p.w))};
}
const ciPts=(ci,f=pts)=>ci?` <span class="ci">[${f(ci[0])}; ${f(ci[1])}]</span>`:"";
const sigCI=ci=>ci&&(ci[0]>0||ci[1]<0);
const sg2=v=>v==null?"—":(v<0?"−":v>0?"+":"")+nf2.format(Math.abs(v));

// =====================================================================
// ESTUDIO DE EVENTOS CON GEMELOS (lo usan los estudios y «Antes y después»)
// =====================================================================
function esCompute(pairs,{B=200}={}){
  const ks=d3.range(-6,5).filter(k=>pairs.filter(p=>adGap(p,k)!=null).length>=Math.max(3,pairs.length*0.3));
  const G=ks.map(k=>({k,g:adMean(pairs,p=>adGap(p,k)),ci:k===-1?[0,0]:bootCI(pairs,s=>adMean(s,p=>adGap(p,k)),{B})}));
  const post=adMean(pairs,adPost), postCI=bootCI(pairs,s=>adMean(s,adPost),{B:300}), pre=adMean(pairs,adPre), preCI=bootCI(pairs,s=>adMean(s,adPre),{B:300});
  const mT=ks.map(k=>adMean(pairs,p=>p.t.a.idx[k])), mC=ks.map(k=>adMean(pairs,p=>p.c.a.idx[k]));
  const preOk=pre==null||!preCI||(preCI[0]<=0&&preCI[1]>=0)||Math.abs(pre)<Math.abs(post||0)*0.3;
  return {ks,G,post,postCI,pre,preCI,mT,mC,preOk,postSig:sigCI(postCI),n:new Set(pairs.map(p=>p.t.code)).size};
}
const kLab=k=>k===0?"0":k>0?"+"+k:"−"+Math.abs(k);
// placebo en el espacio: grupos al azar del mismo tamaño, con los mismos años de referencia
function esPlacebo(pairs,pool,yk,mc,post,{R=40,seed=23}={}){
  const rnd=rng(seed), N=Math.min(new Set(pairs.map(p=>p.t.code)).size,120), cand=pool.filter(c=>adSeries(c,pairs[0].t0,yk)), vals=[];
  for(let b=0;b<R;b++){ const sh=cand.slice(); for(let i=sh.length-1;i>0&&i>=sh.length-N;i--){ const j=(rnd()*(i+1))|0; [sh[i],sh[j]]=[sh[j],sh[i]]; }
    const fake=sh.slice(-N).map(code=>({code,t0:pairs[(rnd()*pairs.length)|0].t0})), fs=new Set(fake.map(f=>f.code));
    const ps=adMatch(fake,cand.filter(c=>!fs.has(c)),yk,mc); const v=adMean(ps,adPost); if(v!=null) vals.push(v); }
  return vals.length>=10?{n:vals.length,min:d3.min(vals),max:d3.max(vals),p:vals.filter(v=>Math.abs(v)>=Math.abs(post)).length/vals.length}:null;
}
// dos gráficos: trayectorias medias (índice) y diferencia año a año con intervalo
function esCharts(parent,E,{yl,src,n}){
  const g2=add(parent,"div","cols2");
  lineChart(g2,{title:`${cap(yl)}: afectados y gemelos`,sub:"Año anterior a la medida = 100",source:`Media de ${nf0.format(n||E.n)} municipios afectados y de sus gemelos. 0 = primer año con la medida. ${src||""}`,series:[{n:"Afectados",v:E.mT,c:"--rust",main:true},{n:"Gemelos",v:E.mC,c:"--slate"}],years:E.ks.map(kLab),xticks:E.ks.map(kLab),fmt:v=>nf1.format(v),tickFmt:v=>nf0.format(v),height:250});
  const fg=fig(g2,{title:"Diferencia afectados − gemelos, año a año",sub:"Puntos del índice; sombra: intervalo del 95 %",source:"A la izquierda de la raya debería estar cerca de cero (tendencias paralelas); a la derecha, la separación es el efecto estimado."});
  gapChart(fg.body,E.G,kLab); return g2;
}

// =====================================================================
// CONTROL SINTÉTICO (Abadie): una media ponderada de donantes que reproduce la trayectoria previa
// =====================================================================
// y1: serie del tratado (índice); donors: [{code,y:[…]}] alineados con y1; pre: índices del periodo previo
function synthFit(y1,donors,pre,{it=400}={}){
  const J=donors.length; if(J<2) return null; const w=new Array(J).fill(0); w[0]=1;
  // arranque: el donante más parecido antes
  let b0=0,d0=Infinity; donors.forEach((d,j)=>{ const e=d3.sum(pre,t=>(y1[t]-d.y[t])**2); if(e<d0){ d0=e; b0=j; } }); w.fill(0); w[b0]=1;
  const T=y1.length, pred=()=>{ const p=new Array(T).fill(0); donors.forEach((d,j)=>{ if(w[j]) for(let t=0;t<T;t++) p[t]+=w[j]*d.y[t]; }); return p; };
  let p=pred();
  for(let k=0;k<it;k++){ // Frank–Wolfe con búsqueda exacta en el símplex
    let best=-1,bg=Infinity; for(let j=0;j<J;j++){ let g=0; for(const t of pre) g-=2*(y1[t]-p[t])*donors[j].y[t]; if(g<bg){ bg=g; best=j; } }
    let num=0,den=0; for(const t of pre){ const dd=donors[best].y[t]-p[t]; num+=(y1[t]-p[t])*dd; den+=dd*dd; }
    const gam=den>0?Math.max(0,Math.min(1,num/den)):0; if(gam<1e-7) break;
    for(let j=0;j<J;j++) w[j]*=(1-gam); w[best]+=gam; for(let t=0;t<T;t++) p[t]+=gam*(donors[best].y[t]-p[t]); }
  const gap=y1.map((v,t)=>v-p[t]), post=d3.range(T).filter(t=>!pre.includes(t));
  const rm=ts=>Math.sqrt(d3.mean(ts,t=>gap[t]**2));
  return {w,synth:p,gap,preRMSPE:rm(pre),postRMSPE:rm(post),postGap:d3.mean(post,t=>gap[t]),top:donors.map((d,j)=>({code:d.code,w:w[j]})).filter(o=>o.w>0.005).sort((a,b)=>b.w-a.w)};
}
// donantes más parecidos antes + placebos en el espacio (cada donante como si fuera el tratado)
function synthControl(y1,pool,pre,{D=60,P=30}={}){
  const dist=d=>d3.sum(pre,t=>(y1[t]-d.y[t])**2), cand=pool.filter(d=>d.y.every(v=>v!=null&&isFinite(v))).map(d=>({...d,e:dist(d)})).sort((a,b)=>a.e-b.e).slice(0,D);
  const fit=synthFit(y1,cand,pre); if(!fit) return null;
  const ratio=f=>f.preRMSPE>0?f.postRMSPE/f.preRMSPE:null, real=ratio(fit);
  const pl=cand.slice(0,P).map((d,i)=>{ const f=synthFit(d.y,cand.filter((_,j)=>j!==i),pre); return f?{code:d.code,ratio:ratio(f),postGap:f.postGap,gap:f.gap,pre:f.preRMSPE}:null; }).filter(Boolean);
  const ok=pl.filter(p=>p.pre<=Math.max(fit.preRMSPE*5,1)); // como en Abadie et al., fuera los placebos que no se ajustan antes (con un mínimo de 1 punto)
  const rank=ok.filter(p=>p.ratio>=real).length;
  return {...fit,cand,placebos:ok,p:(rank+1)/(ok.length+1),ratio:real};
}
// gráfico: tratado frente a sintético, y la nube de placebos de la diferencia
function synthCharts(parent,S,years,{yl,lab0}){
  const g2=add(parent,"div","cols2");
  lineChart(g2,{title:`${cap(yl)}: ${lab0} y su sintético`,sub:"Índice, año base = 100",source:`Sintético: media ponderada de ${S.top.length} municipios donantes elegidos para reproducir la trayectoria previa (error previo medio: ${nf2.format(S.preRMSPE)} puntos).`,series:[{n:cap(lab0),v:S.synth.map((v,t)=>S.gap[t]+v),c:"--rust",main:true},{n:"Sintético",v:S.synth,c:"--slate",dash:true}],years,xticks:years.filter((y,i)=>i%2===0||i===years.length-1),fmt:v=>nf1.format(v),tickFmt:v=>nf0.format(v),height:250});
  const fg=fig(g2,{title:"Diferencia con el sintético, y la de cada placebo",sub:"Gris: cada donante tratado «como si»; granate: el caso real",source:`Placebos en el espacio con ${S.placebos.length} donantes; p = ${nf2.format(S.p)} (proporción de placebos con una ruptura relativa igual o mayor).`});
  const W=Math.max(300,fg.body.clientWidth||460), H=240, m={t:12,r:12,b:26,l:40};
  const all=[S.gap,...S.placebos.map(p=>p.gap)].flat().filter(v=>v!=null&&isFinite(v)); const lim=d3.quantile(all.map(Math.abs).sort(d3.ascending),.98)||1;
  const X=d3.scalePoint().domain(years).range([m.l,W-m.r]), Y=d3.scaleLinear().domain([-lim,lim]).nice(4).range([H-m.b,m.t]);
  const svg=d3.select(fg.body).append("svg").attr("viewBox",`0 0 ${W} ${H}`).attr("role","img").attr("aria-label","Diferencia con el control sintético y placebos");
  svg.append("g").attr("class","grid").selectAll("line").data(Y.ticks(4)).join("line").attr("x1",m.l).attr("x2",W).attr("y1",Y).attr("y2",Y);
  svg.append("g").attr("class","axis").selectAll("text").data(Y.ticks(4)).join("text").attr("x",m.l-6).attr("y",v=>Y(v)+4).attr("text-anchor","end").text(v=>(v>0?"+":"")+nf1.format(v));
  svg.append("g").attr("class","axis").selectAll("text").data(years.filter((y,i)=>i%2===0||i===years.length-1)).join("text").attr("x",X).attr("y",H-7).attr("text-anchor","middle").text(String);
  const ln=d3.line().defined(v=>v!=null&&isFinite(v)).x((v,i)=>X(years[i])).y(v=>Y(Math.max(-lim,Math.min(lim,v))));
  S.placebos.forEach(p=>svg.append("path").attr("d",ln(p.gap)).attr("fill","none").attr("stroke",css("--stone")).attr("stroke-width",1).attr("opacity",.45));
  svg.append("path").attr("d",ln(S.gap)).attr("fill","none").attr("stroke",css("--rust")).attr("stroke-width",2.6);
  svg.append("line").attr("x1",m.l).attr("x2",W).attr("y1",Y(0)).attr("y2",Y(0)).attr("stroke",css("--ink"));
  return g2;
}
// Datos por municipio para los estudios (series): se cargan solo al abrir un estudio
let SER=null, SF={}, SBY=new Map(), EXT=null;
async function loadSeries(){ if(SER) return SER; const [s,e]=await Promise.all([getJSON("/data/estudios.json"),getJSON("/data/ext.json")]); SER=s; EXT=e; s.fields.forEach((f,i)=>SF[f]=i); s.rows.forEach(r=>SBY.set(r[0],r)); deriveSeries(); return s; }
const ser=(code,k)=>{ const r=SBY.get(code); return r?r[SF[k]]:null; };
window.__indicioDebug=()=>({F,rows:rowsAll(),SER,SF,SBY,EXT});
// columna derivada en el índice (para poder usarla en partialR, scatter, etc.)
function addCol(k,fn,meta){ if(F[k]!=null) return; const i=Object.keys(F).length; F[k]=i; rowsAll().forEach(r=>{ const v=fn(r,SBY.get(r[F.code])); r[i]=v==null||!isFinite(v)?null:v; }); if(meta){ const c={k,...meta,der:1}; CAT.push(c); CATK[k]=c; } }
const pctg=(a,b)=>a&&b?(b/a-1)*100:null;
function deriveSeries(){
  const Y=SER.years, P=SER.vtPeriods, PY=SER.paroYears, PD=SER.padYears, IY=SER.ipvaYears;
  const yi=(arr,y)=>arr.indexOf(y);
  addCol("vtp24",(r,s)=>s&&s[SF.vtp]?s[SF.vtp][yi(P,"2024M08")]:null,{l:"Pisos turísticos en agosto de 2024",g:"Vivienda",f:"pct",src:"INE, viviendas turísticas, agosto de 2024 (% de las viviendas)"});
  addCol("vtCambio21",(r,s)=>{ const v=s&&s[SF.vtp]; return v&&v[yi(P,"2021M08")]!=null&&v[yi(P,"2024M08")]!=null?v[yi(P,"2024M08")]-v[yi(P,"2021M08")]:null; },{l:"Cambio de los pisos turísticos 2021–2024",g:"Vivienda",f:"pts",src:"INE, viviendas turísticas, agosto de 2021 a agosto de 2024 (puntos de % de las viviendas)"});
  addCol("vtCambio22",(r,s)=>{ const v=s&&s[SF.vtp]; return v&&v[yi(P,"2022M08")]!=null&&v[yi(P,"2024M08")]!=null?v[yi(P,"2024M08")]-v[yi(P,"2022M08")]:null; },{l:"Cambio de los pisos turísticos 2022–2024",g:"Vivienda",f:"pts",src:"INE, viviendas turísticas, agosto de 2022 a agosto de 2024"});
  addCol("alqVar21",(r,s)=>{ const v=s&&s[SF.ipva]; return v?pctg(v[yi(IY,2021)],v[yi(IY,2024)]):null; },{l:"Subida del alquiler 2021–2024",g:"Vivienda",f:"pct_chg",src:"INE, Índice de Precios de Vivienda en Alquiler, 2021–2024"});
  addCol("alqVar22",(r,s)=>{ const v=s&&s[SF.ipva]; return v?pctg(v[yi(IY,2022)],v[yi(IY,2024)]):null; },{l:"Subida del alquiler 2022–2024",g:"Vivienda",f:"pct_chg",src:"INE, Índice de Precios de Vivienda en Alquiler, 2022–2024"});
  addCol("renta19",(r,s)=>s&&s[SF.renta]?s[SF.renta][yi(Y,2019)]:null,{l:"Renta por persona en 2019",g:"Riqueza",f:"eur",src:"INE, Atlas de Renta, 2019"});
  addCol("edad19",(r,s)=>s&&s[SF.edad]?s[SF.edad][yi(Y,2019)]:null,{l:"Edad media en 2019",g:"Población",f:"years",src:"INE, Atlas de Renta, 2019"});
  addCol("mayores6519",(r,s)=>s&&s[SF.mayores65]?s[SF.mayores65][yi(Y,2019)]:null,{l:"Mayores de 65 años en 2019",g:"Población",f:"pct",src:"INE, Atlas de Renta, 2019"});
  addCol("paroReg19",(r,s)=>{ const v=s&&s[SF.paro]; return v&&r[F.paroReg]!=null&&v[yi(PY,2025)]?r[F.paroReg]*v[yi(PY,2019)]/v[yi(PY,2025)]:null; },{l:"Paro registrado en 2019",g:"Trabajo",f:"pct",src:"SEPE, media de 2019, sobre la población de 16 a 64 años"});
  addCol("vtp20",(r,s)=>s&&s[SF.vtp]?s[SF.vtp][0]:null,{l:"Pisos turísticos en agosto de 2020",g:"Vivienda",f:"pct",src:"INE, viviendas turísticas, agosto de 2020 (% de las viviendas)"});
  addCol("pop20",(r,s)=>s&&s[SF.pad]?s[SF.pad][yi(PD,2020)]:null,{l:"Población en 2020",g:"Población",f:"int",src:"INE, padrón 2020"});
  addCol("renta16",(r,s)=>s&&s[SF.renta]?s[SF.renta][yi(Y,2016)]:null,{l:"Renta por persona en 2016",g:"Riqueza",f:"eur",src:"INE, Atlas de Renta, 2016"});
  addCol("rentaVar1724",(r,s)=>{ const v=s&&s[SF.renta]; return v?pctg(v[yi(Y,2017)],v[yi(Y,2024)]):null; },{l:"Subida de la renta 2017–2024",g:"Riqueza",f:"pct_chg",src:"INE, Atlas de Renta, 2017–2024"});
  addCol("rentaVar1923",(r,s)=>{ const v=s&&s[SF.renta]; return v?pctg(v[yi(Y,2019)],v[yi(Y,2023)]):null; },{l:"Subida de la renta 2019–2023",g:"Riqueza",f:"pct_chg",src:"INE, Atlas de Renta, 2019–2023"});
  addCol("paroVar1923",(r,s)=>{ const v=s&&s[SF.paro]; return v?pctg(v[yi(PY,2019)],v[yi(PY,2023)]):null; },{l:"Cambio del paro registrado 2019–2023",g:"Trabajo",f:"pct_chg",src:"SEPE, media anual de 2019 y de 2023"});
  addCol("paroVar1920",(r,s)=>{ const v=s&&s[SF.paro]; return v?pctg(v[yi(PY,2019)],v[yi(PY,2020)]):null; },{l:"Subida del paro registrado en 2020",g:"Trabajo",f:"pct_chg",src:"SEPE, media anual de 2019 y de 2020"});
  addCol("pobVar1925",(r,s)=>{ const v=s&&s[SF.pad]; return v?pctg(v[yi(PD,2019)],v[yi(PD,2025)]):null; },{l:"Cambio de la población 2019–2025",g:"Población",f:"pct_chg",src:"INE, padrón 2019 y 2025"});
  addCol("migExtT",(r,s)=>{ const m=s&&s[SF.mig], p=r[F.pop]; return m&&p?d3.sum(m,a=>a[1])/p*1000/m.length:null; },null);
  addCol("migIntT",(r,s)=>{ const m=s&&s[SF.mig], p=r[F.pop]; return m&&p?d3.sum(m,a=>a[2])/p*1000/m.length:null; },null);
  // voto en generales: participación y cambio 2019→2023
  const G=SER.gen, gi=k=>G.indexOf(k), P4=SER.partidos;
  addCol("part19",(r,s)=>{ const g=s&&s[SF.gen]; return g&&g[0]?g[0][0]:null; },{l:"Participación en las generales de noviembre de 2019",g:"Voto",f:"pct",src:"Ministerio del Interior, generales de noviembre de 2019"});
  addCol("partCambio",(r,s)=>{ const g=s&&s[SF.gen]; return g&&g[0]&&g[1]?g[1][0]-g[0][0]:null; },{l:"Cambio de la participación 2019–2023",g:"Voto",f:"pts",src:"Ministerio del Interior, generales de noviembre de 2019 y julio de 2023 (puntos)"});
  const dchaIdx=g=>g?(g[1]||0)+(g[3]||0):null; // PP + Vox
  addCol("dchaCambio",(r,s)=>{ const g=s&&s[SF.gen]; return g&&g[0]&&g[1]?dchaIdx(g[1])-dchaIdx(g[0]):null; },{l:"Cambio del voto a PP y Vox 2019–2023",g:"Voto",f:"pts",src:"Ministerio del Interior, generales de 2019 y 2023 (puntos de % de votos)"});
  addCol("edadCambio",(r,s)=>{ const e=s&&s[SF.edad]; return e&&e[yi(Y,2019)]&&e[yi(Y,2023)]?e[yi(Y,2023)]-e[yi(Y,2019)]:null; },null);
}

// ---------- evolución ----------
function exEvo(out){
  out.innerHTML=`<div class="xsug" id="epre"></div><div class="evo"><div class="evo-ctl" id="ectl"></div><div class="evo-out"><div id="echart"></div><div id="esum"></div></div></div>`;
  document.getElementById("epre").innerHTML='<span class="muted" style="align-self:center">Prueba:</span>'+EVOPRESET.map(([l],i)=>`<a href="#" data-i="${i}">${l}</a>`).join("");
  document.querySelectorAll("#epre a").forEach(a=>a.addEventListener("click",ev=>{ ev.preventDefault(); ES_.sel=EVOPRESET[+a.dataset.i][1].slice(); ES_.base=null; drawEvoCtl(); drawEvo(); exSetHash(); }));
  if(!ES_.mun) ES_.mun=EX.m||lastMun||null;
  drawEvoCtl(); drawEvo();
  const ectl=document.getElementById("ectl"); ectl.addEventListener("change",()=>setTimeout(exSetHash,0)); ectl.addEventListener("click",()=>setTimeout(exSetHash,0));
}

// ---------- grupos ----------
function exGrupos(out){
  const ks=EX.d.slice(0,4);
  const qk=EX.d.find(k=>k!==ks[0])||"renta";
  const rows=exRows();
  const sizeB=[[0,1000,"Menos de 1.000"],[1000,5000,"1.000–5.000"],[5000,20000,"5.000–20.000"],[20000,100000,"20.000–100.000"],[100000,1e12,"Más de 100.000"]];
  let key, order=null;
  if(EX.gb==="ccaa") key=r=>CCAA_OF[r[F.prov]];
  else if(EX.gb==="prov") key=r=>provShort(PROVS[r[F.prov]]);
  else if(EX.gb==="size"){ key=r=>{ const p=r[F.pop]||0; const b=sizeB.find(s=>p>=s[0]&&p<s[1]); return b?b[2]+" hab.":null; }; order=sizeB.map(s=>s[2]+" hab."); }
  else { const k0=ks[0], s=rows.filter(r=>r[F[k0]]!=null&&r[F.pop]).sort((a,b)=>a[F[k0]]-b[F[k0]]), tot=d3.sum(s,r=>r[F.pop]); let acc=0; const qmap=new Map(); s.forEach(r=>{ const q=Math.min(4,Math.floor((acc+r[F.pop]/2)/tot*5)); acc+=r[F.pop]; qmap.set(r[F.code],q); });
    const names=["20 % con menos","Segundo 20 %","20 % central","Cuarto 20 %","20 % con más"]; key=r=>qmap.has(r[F.code])?names[qmap.get(r[F.code])]:null; order=names; }
  const grid=add(out,"div","exgrid");
  const charts=EX.gb==="q"?EX.d.slice(1,5):ks;
  if(!charts.length){ grid.innerHTML='<p class="loading">Añade otro dato para ver cómo cambia según el nivel del primero.</p>'; return; }
  charts.forEach((k,i)=>{ const gm=d3.rollups(rows.filter(r=>r[F[k]]!=null&&r[F.pop]&&key(r)),v=>d3.sum(v,r=>r[F[k]]*r[F.pop])/d3.sum(v,r=>r[F.pop]),key);
    let data=gm.map(([l,v])=>({l,v})); if(order) data.sort((a,b)=>order.indexOf(a.l)-order.indexOf(b.l)); else data.sort((a,b)=>b.v-a.v);
    const f=fig(grid,{title:labK(k),sub:EX.gb==="q"?`según el nivel de ${low(labK(ks[0]))} (grupos con la misma población)`:"media ponderada por población",source:`La raya es la media de España; en rojo, por encima; en azul, por debajo. Fuente: ${CATK[k].src}.`});
    const vals=data.map(d=>d.v); const ref=esMean(k), fk=fmtK(k); data.forEach(d=>{ d.c=ref!=null&&d.v>ref?"--rust":"--slate"; });
    hbars(f.body,data,{fmt:v=>ref==null?fk(v):`${fk(v)}  (${v>=ref?"+":"−"}${/^(pct|pct_chg|pts)$/.test((CATK[k]||{}).f||"")?nf1.format(Math.abs(v-ref))+" pts":fk(Math.abs(v-ref)).replace(/^[+−-]/,"").replace(/[ \u00a0](%|€)$/,"")})`,ref,refLabel:"España",scroll:data.length>20,wide:true,min:Math.min(0,d3.min(vals))}); });
}

// ---------- países: un indicador año a año, España frente a otros, con quién gobernaba ----------
let PAIS=null, PAIS_P=null;
const loadPaises=()=>PAIS_P||(PAIS_P=getJSON("/data/paises.json").then(d=>PAIS=d));
const PSIND={pibpc:{l:"PIB por habitante",u:"€ de 2020",t:"nivel",f:v=>nf0.format(v)+NB+"€",d:"Euros constantes de 2020 por habitante: descuenta la inflación."},
  pibpcPPC:{l:"PIB por habitante en poder de compra",u:"PPC",t:"nivel",f:v=>nf0.format(v),d:"En paridad de poder de compra: corrige las diferencias de precios entre países."},
  crecimiento:{l:"Crecimiento del PIB",u:"%",t:"flujo",f:v=>sgn(v),d:"Variación del PIB real respecto al año anterior."},
  paro:{l:"Tasa de paro",u:"%",t:"tasa",f:pc,d:"Parados entre la población activa de 15 a 74 años."},
  paroJuvenil:{l:"Paro de los menores de 25 años",u:"%",t:"tasa",f:pc,d:"Parados entre la población activa menor de 25 años."},
  empleo:{l:"Tasa de empleo (20 a 64 años)",u:"%",t:"tasa",f:pc,d:"Ocupados entre la población de 20 a 64 años."},
  deuda:{l:"Deuda pública",u:"% del PIB",t:"tasa",f:pc,d:"Deuda de las administraciones públicas, en % del PIB."},
  deficit:{l:"Déficit o superávit público",u:"% del PIB",t:"flujo",f:v=>sgn(v),d:"Ingresos menos gastos de las administraciones públicas, en % del PIB. Negativo es déficit."},
  inflacion:{l:"Inflación",u:"%",t:"flujo",f:v=>sgn(v),d:"Subida media de los precios de consumo en el año."},
  gasto:{l:"Gasto público",u:"% del PIB",t:"tasa",f:pc,d:"Gasto total de las administraciones públicas, en % del PIB."},
  ingresos:{l:"Ingresos públicos",u:"% del PIB",t:"tasa",f:pc,d:"Ingresos totales de las administraciones públicas, en % del PIB."}};
const PS={k:"pibpc",c:["ES","EU27_2020"],gob:1,rel:0,ref:"EU27_2020",s:[],idx:1,desde:null,hasta:null,b:null,real:0,lev:"es",m:null};
const PSCOL=["--rust","--ink","--slate","--mustard","--plum","--olive","--stone"];
const PARTYC={PSOE:"#d6342c",PP:"#1f6fb5",UCD:"#2f8f4e"};
// años de cada mandato: los que el presidente pasó más de la mitad en el cargo
function psMandatos(){ const G=(PAIS&&PAIS.gobiernos.ES)||[], now=new Date();
  return G.map(g=>{ const a=new Date(g.desde), b=g.hasta?new Date(g.hasta):now, ys=[];
    for(let y=a.getFullYear();y<=b.getFullYear();y++){ const s=new Date(Math.max(a,new Date(y,0,1))), e=new Date(Math.min(b,new Date(y,11,31))); if((e-s)/864e5>=183) ys.push(y); }
    return {...g,a,b,ys,ape:g.p.split(" ").slice(-1)[0].replace("Zapatero","Zapatero")}; }).map(g=>({...g,ape:{"José Luis Rodríguez Zapatero":"Zapatero","Leopoldo Calvo-Sotelo":"Calvo-Sotelo"}[g.p]||g.p.split(" ").slice(-1)[0]})); }
// ---------- gráfico de líneas por años con los gobiernos de España de fondo (laboratorio «Países» y análisis) ----------
function govChart(parent,{title,sub,source,years,series,fmt,tick,zero=false,gob=true,height}){
  const f=fig(parent,{title,sub,source}); const W=Math.max(320,parent.clientWidth||900), H=height||Math.min(380,Math.max(260,W*0.42)), m={t:gob?34:14,r:138,b:26,l:52};
  const X=d3.scaleLinear().domain(d3.extent(years)).range([m.l,W-m.r]);
  const vals=series.flatMap(s=>years.map(y=>s.v[y])).filter(v=>v!=null); let [lo,hi]=d3.extent(vals.concat(zero?[0]:[])); const pad=(hi-lo)*0.08||1;
  const Y=d3.scaleLinear().domain([lo-pad,hi+pad]).nice(5).range([H-m.b,m.t]);
  const svg=d3.select(f.body).append("svg").attr("viewBox",`0 0 ${W} ${H}`).attr("role","img").attr("aria-label",title||"");
  if(gob) psMandatos().forEach((g,i)=>{ const a=Math.max(years[0],g.ys[0])-0.5, b=Math.min(years[years.length-1],g.ys[g.ys.length-1])+0.5, x0=Math.max(m.l,X(a)), x1=Math.min(W-m.r,X(b)); if(!g.ys.length||x1<=x0) return;
    svg.append("rect").attr("x",x0).attr("y",m.t).attr("width",x1-x0).attr("height",H-m.b-m.t).attr("fill",PARTYC[g.partido]||"#999").attr("opacity",i%2?0.07:0.12);
    if(x1-x0>34) svg.append("text").attr("x",(x0+x1)/2).attr("y",m.t-8).attr("text-anchor","middle").attr("font-size",11.5).attr("font-weight",700).attr("fill",PARTYC[g.partido]||"#666").text(x1-x0>70?`${g.ape} (${g.partido})`:g.ape); });
  svg.append("g").attr("class","grid").selectAll("line").data(Y.ticks(5)).join("line").attr("x1",m.l).attr("x2",W).attr("y1",Y).attr("y2",Y);
  svg.append("g").attr("class","axis").selectAll("text").data(Y.ticks(5)).join("text").attr("x",m.l-6).attr("y",v=>Y(v)+4).attr("text-anchor","end").text(tick||(v=>nf0.format(v)));
  svg.append("g").attr("class","axis").selectAll("text").data(X.ticks(Math.min(10,Math.floor(W/90))).filter(Number.isInteger)).join("text").attr("x",X).attr("y",H-6).attr("text-anchor","middle").text(String);
  if(Y.domain()[0]<0&&Y.domain()[1]>0) svg.append("line").attr("x1",m.l).attr("x2",W).attr("y1",Y(0)).attr("y2",Y(0)).attr("stroke",css("--ink")).attr("stroke-width",1);
  const line=d3.line().defined(d=>d[1]!=null).x(d=>X(d[0])).y(d=>Y(d[1])), ends=[];
  series.slice().reverse().forEach(s=>{ const c=css(s.c), pts=years.map(y=>[y,s.v[y]??null]);
    svg.append("path").attr("d",line(pts)).attr("fill","none").attr("stroke",c).attr("stroke-width",s.main?3:1.8).attr("stroke-dasharray",s.dash?"5 4":null);
    svg.append("g").selectAll("circle").data(pts.filter(d=>d[1]!=null)).join("circle").attr("cx",d=>X(d[0])).attr("cy",d=>Y(d[1])).attr("r",s.main?2.6:1.8).attr("fill",c).append("title").text(d=>`${s.n}, ${d[0]}: ${fmt(d[1])}`);
    const l=pts.filter(d=>d[1]!=null).pop(); if(l) ends.push({y:Y(l[1]),x:X(l[0]),t:`${s.n} ${fmt(l[1])}`,tip:s.tip,c,main:s.main}); });
  ends.sort((a,b)=>a.y-b.y); for(let i=1;i<ends.length;i++) if(ends[i].y-ends[i-1].y<14) ends[i].y=ends[i-1].y+14;
  ends.forEach(e=>{ const t=svg.append("text").attr("x",e.x+6).attr("y",e.y+4).attr("font-size",12).attr("font-weight",e.main?700:400).attr("fill",e.c), mc=W<520?14:18, nm=e.t.length>mc+6?e.t.replace(/ \([^)]*\)/,"").replace(/^(.*?)([−+-]?[\d.,]+(?:\u00a0\S+)?)$/,(m,a,b)=>(a.length>mc?a.slice(0,mc-1)+"… ":a)+b):e.t; t.text(nm); if(e.tip) t.append("title").text(e.t+"\n"+e.tip); else if(nm!==e.t) t.append("title").text(e.t); });
  return f;
}
// cambio de un indicador en los años de un mandato: crecimiento medio anual (nivel), media (flujo) o cambio en puntos (tasa).
// La ventana la marca España (año anterior al primero del mandato → último con dato) y se aplica igual a la UE.
function psWindow(o,ys){ const yy=ys.filter(y=>o&&o[y]!=null); if(!yy.length) return null; return {a:o[yy[0]-1]!=null?yy[0]-1:yy[0],b:yy[yy.length-1],yy}; }
function psChange(o,w,t){ if(!o||!w) return null;
  if(t==="flujo"){ const v=w.yy.map(y=>o[y]); return v.some(x=>x==null)?null:d3.mean(v); }
  if(o[w.a]==null||o[w.b]==null||w.a===w.b) return null; return t==="nivel"?(Math.pow(o[w.b]/o[w.a],1/(w.b-w.a))-1)*100:o[w.b]-o[w.a]; }
// series de España (solo España): precios de la compra, IPC por grupos, vivienda y sueldos, año a año
let SERES=null, SERES_P=null;
const loadSeriesES=()=>SERES_P||(SERES_P=Promise.all([getJSON("/data/alimentos.json"),getJSON("/data/sueldos.json"),getJSON("/data/vivienda.json"),loadGov().catch(()=>null)]).then((([A,S,Vv])=>{
  const out={}, yavg=(v,per)=>{ const g={}; per.forEach((p,i)=>{ if(v[i]==null) return; (g[p.slice(0,4)]=g[p.slice(0,4)]||[]).push(v[i]); }); return Object.fromEntries(Object.entries(g).filter(([,x])=>x.length===12).map(([y,x])=>[y,d3.mean(x)])); };
  const add=(k,o)=>{ if(o.v&&Object.keys(o.v).length>=3) out[k]=o; };
  const IPCG={general:"Todos los precios (IPC general)",alimentos:"Alimentos y bebidas no alcohólicas",vestido:"Ropa y calzado",vivienda:"Vivienda, agua, electricidad y gas",transporte:"Transporte",restaurantes:"Restaurantes y hoteles"};
  Object.entries(IPCG).forEach(([k,l])=>A.ipc.es[k]&&add("ipc_"+k,{l,g:"Precios (IPC por grupos)",u:"índice",t:"nivel",idx:true,v:yavg(A.ipc.es[k],A.meses),src:"INE, IPC"}));
  const SH={"Aceites vegetales":"Aceite","Huevos":"Huevos","Leche entera":"Leche entera","Leche desnatada y semidesnatada":"Leche desnatada","Pan y productos de panadería":"Pan y bollería","Carne, fresca, refrigerada o congelada":"Carne fresca","Pescado,  fresco, refrigerado o congelado":"Pescado fresco","Frutas de hueso y frutas de pepita, frescas":"Fruta fresca (hueso y pepita)","Cítricos frescos":"Cítricos","Patatas y otros tubérculos":"Patatas","Café y sucedáneos de café":"Café","Chocolate, cacao y productos alimenticios a base de cacao":"Chocolate","Azúcar de caña y azúcar de remolacha":"Azúcar","Queso":"Queso","Yogur y productos similares":"Yogures","Macarrones, tallarines, cuscús y pastas alimenticias similares":"Pasta","Cereales":"Arroz y cereales","Agua":"Agua embotellada","Refrescos":"Refrescos","Zumos de frutas y hortalizas":"Zumos","Carne, seca, salada, en salmuera o ahumada":"Embutidos","Legumbres secas":"Legumbres","Bayas frescas":"Fresas y otras bayas","Mantequilla y otros aceites y grasas derivados de la leche":"Mantequilla","Alimentos para bebé":"Alimentos para bebé"};
  const SUB=A.subclases; if(SUB) Object.entries(SUB.s).forEach(([n,v])=>add("sub_"+norm(n).replace(/ /g,"_").slice(0,40),{l:SH[n]||n,g:"Lista de la compra (IPC)",u:"índice",t:"nivel",idx:true,v:yavg(v,SUB.periodos),src:"INE, IPC por subclases"}));
  const E=Vv.es, num=o=>o?Object.fromEntries(Object.entries(o).map(([y,v])=>[y,+v])):null;
  add("viv_ipv",{l:"Precio de compra de la vivienda (IPV)",g:"Vivienda",u:"índice",t:"nivel",idx:true,v:num(E.ipv),src:"INE, IPV"});
  add("viv_alq",{l:"Alquiler medio (€ al mes)",g:"Vivienda",u:"€",t:"nivel",v:num(E.alqMes),src:"INE, alquiler declarado"});
  add("viv_vt",{l:"Valor tasado de la vivienda (€/m²)",g:"Vivienda",u:"€",t:"nivel",v:num(E.valorTasado),src:"Ministerio de Vivienda"});
  add("viv_term",{l:"Viviendas libres terminadas",g:"Vivienda",u:"viviendas",t:"nivel",v:num(E.terminadas),src:"Ministerio de Vivienda"});
  add("viv_ini",{l:"Viviendas libres iniciadas",g:"Vivienda",u:"viviendas",t:"nivel",v:num(E.iniciadas),src:"Ministerio de Vivienda"});
  add("viv_prot",{l:"Viviendas protegidas terminadas",g:"Vivienda",u:"viviendas",t:"nivel",v:num(E.protegidas),src:"Ministerio de Vivienda"});
  const EY=S.ees.años, es=k=>Object.fromEntries(EY.map((y,i)=>[y,S.ees.es[k][i]]).filter(([,v])=>v!=null));
  [["Mediana","Sueldo mediano"],["Media","Sueldo medio"],["Percentil 10","Sueldo del 10 % que menos cobra (P10)"],["Percentil 90","Sueldo del 10 % que más cobra (P90)"]].forEach(([k,l])=>add("sal_"+norm(k).replace(/ /g,""),{l:l+" (€ al año)",g:"Sueldos",u:"€",t:"nivel",v:es(k),src:"INE, Encuesta de Estructura Salarial"}));
  { const alq=num(E.alqMes), med=es("Mediana"); if(alq&&med) add("viv_esfuerzo",{l:"Esfuerzo de pagar el alquiler",sl:"Esfuerzo",g:"Vivienda",u:"%",t:"tasa",v:Object.fromEntries(Object.entries(alq).filter(([y])=>med[y]!=null).map(([y,v])=>[y,+(v*12/med[y]*100).toFixed(2)])),src:"INE (alquiler declarado y Encuesta de Estructura Salarial); cálculo de Indicio",d:"Qué parte de un sueldo mediano se llevaría el alquiler medio: alquiler mensual × 12 entre el sueldo anual. Si sale un 34 %, de cada 100 € de sueldo, 34 € van al alquiler. Es una aproximación: usa el alquiler medio de todos los inquilinos (con contratos antiguos, más baratos) y el sueldo de una sola persona. Quien firma hoy un contrato nuevo paga más."}); }
  add("sal_smi",{l:"Salario mínimo (€ al mes)",g:"Sueldos",u:"€",t:"nivel",v:num(S.smiLegal),src:"BOE"});
  // las series de la antigua «Evolución»: España, una provincia o un municipio (psFill las calcula para el lugar elegido)
  EVO.filter(e=>!EVSKIP.has(e.k)).forEach(e=>{ const o={l:e.l,g:e.k==="pob"?"Población":EVTOP[e.g]||e.g,u:EVU[e.u]??"",t:"nivel",src:e.src,ev:e,v:{}}; o.v=evVals(e,"es"); if(Object.keys(o.v).length>=2) out["ev_"+e.k]=o; });
  SERES=out; return out; })));
const EVTOP={Ingresos:"Riqueza",Vivienda:"Vivienda",Precios:"Precios","Dinero público":"Dinero público","Población y trabajo":"Trabajo"}, EVSKIP=new Set(["salMedia","salMed","ipc"]), EVU={eur:"€",n:"",pct:"%",ipc:"índice"};
const evA=(lev,P)=>lev==="es"?{s:REFS.es,ipva:REFS.es.ipva,pad:REFS.es.pad,vt:REFS.es.vt}:{s:REFS.prov[P],ipva:REFS.prov[P].ipva,pad:REFS.prov[P].pad,vt:REFS.prov[P].vt};
function evVals(e,lev,P,code,AM){ const d=e.get(lev==="mun"?AM||{}:evA(lev,P),lev,P,code)||{}, v={}; if(d.v) d.years.forEach((y,j)=>{ if(d.v[j]!=null) v[y]=d.v[j]; }); return v; }
// dónde: España, la provincia o el municipio elegido; las series que solo existen para España se quedan en España
function psScope(){ const code=PS.m&&BYCODE.has(PS.m)?PS.m:null; return {code,lev:code?PS.lev:"es",P:code?code.slice(0,2):null}; }
async function psFill(){ const ks=PS.s.filter(k=>SERES[k]&&SERES[k].ev); if(!ks.length) return; const {code,lev,P}=psScope();
  const AM=lev==="mun"?((await loadProv(P))[code]||{}):null;
  ks.forEach(k=>{ const o=SERES[k], e=o.ev, ul=e.nat?"es":(e.provOnly&&lev==="mun"?"prov":lev); o.v=evVals(e,ul,P,code,AM); o.where=ul==="es"?"España":ul==="prov"?provShort(PROVS[P]):dispName(BYCODE.get(code)[F.name]); }); }
// estado de la vista «Series»: modo país (un dato, varios países) o modo España (varias series de España)
function psRange(ys){ const a=PS.desde&&PS.desde>=ys[0]?PS.desde:ys[0], b=PS.hasta&&PS.hasta<=ys[ys.length-1]?PS.hasta:ys[ys.length-1]; return ys.filter(y=>y>=a&&y<=b); }
function psBar(bar){
  const Pz=PAIS?PAIS.paises:{}, all=Object.entries(Pz).filter(([g,o])=>o[PS.k]), esMode=PS.s.length>0, SE=SERES||{};
  const cur=esMode?SE[PS.s[0]]:null, scoped=esMode&&PS.s.some(k=>SE[k]&&SE[k].ev&&!SE[k].ev.nat), sc=psScope(), hasE=esMode&&PS.s.some(k=>SE[k]&&SE[k].u==="€");
  const yrs=psYears(), yOpt=(sel)=>yrs.map(y=>`<option ${y===sel?"selected":""}>${y}</option>`).join("");
  bar.innerHTML=`
    <div class="lb-step"><h4><i>1</i>Qué quieres saber</h4>${typesHTML(EX.v)}${hintHTML("paises")}</div>
    ${esMode?`<div class="lb-step"><h4><i>2</i>Qué series</h4>`:`<div class="lb-step"><h4><i>2</i>Qué dato</h4><div class="slot full"><span class="nm" style="flex:1"><small>Dato</small><button type="button" class="pick" id="pspick" aria-haspopup="dialog"><span class="pv">${esc(PSIND[PS.k].l)}</span><span class="pg">Países</span></button></span></div><p class="hint">${esc(PSIND[PS.k].d)}</p></div>
    <div class="lb-step"><h4><i>3</i>Qué países</h4>`}
      ${esMode?`${PS.s.map((k,i)=>`<div class="slot full"><span class="nm" style="flex:1"><small>Serie ${i+1}</small><button type="button" class="pick" data-ser="${k}" ${i===0?'id="pspick"':`data-sw="${k}"`} aria-haspopup="dialog"><span class="pv">${esc((SE[k]||{}).l||k)}</span><span class="pg">${esc(((SE[k]||{}).g||"").replace(/ \(.*\)$/,""))}</span></button></span>${PS.s.length>1?`<button type="button" data-rs="${k}" aria-label="Quitar">×</button>`:""}</div>`).join("")}
        ${PS.s.length<7?`<div class="slot"><span class="nm" style="flex:1"><small>Añadir una serie</small><button type="button" class="pick add" id="psadd" aria-haspopup="dialog"><span class="pv">+ elige una serie</span></button></span></div>`:""}
        ${cur&&!cur.g.startsWith("Precios")&&!PS.s.includes("ipc_general")?`<button type="button" class="ed-go psq" id="psipc">+ Añadir el IPC general, para comparar</button>`:""}
        ${scoped?`<div style="margin-top:12px"><label class="blk">Dónde</label><div class="seg sm" role="group" aria-label="Ámbito"><button type="button" data-l="es" aria-pressed="${sc.lev==="es"}">España</button>${sc.code?`<button type="button" data-l="prov" aria-pressed="${sc.lev==="prov"}">${esc(provShort(PROVS[sc.P]))}</button><button type="button" data-l="mun" aria-pressed="${sc.lev==="mun"}">${esc(dispName(BYCODE.get(sc.code)[F.name]))}</button>`:""}</div>
          <div class="search" id="ps-s" role="combobox" aria-expanded="false" aria-haspopup="listbox" style="margin:8px 0 0;flex:none;min-width:0"><svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.6"/><path d="M11 11l3.5 3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg><input id="ps-q" type="search" placeholder="${sc.code?"Otro municipio":"Elige un municipio"}" autocomplete="off" aria-label="Elegir municipio"><ul id="ps-r" class="results" role="listbox" hidden></ul></div>
          <p class="hint">Los precios, los sueldos y el gasto público son de toda España.</p></div>`:""}`
        :`<div class="pschips">${all.map(([g,o])=>`<label class="chk"><input type="checkbox" data-g="${g}" ${PS.c.includes(g)?"checked":""} ${g==="ES"?"disabled":""}> ${esc(o.n)}</label>`).join("")}</div>`}</div>
    <div class="lb-step"><h4><i>${esMode?3:4}</i>Ajustes</h4>
      <div class="psrange"><label>Desde <select class="sel" id="psd">${yOpt(psRange(yrs)[0])}</select></label><label>Hasta <select class="sel" id="psh">${yOpt(psRange(yrs).slice(-1)[0])}</select></label></div>
      <label class="chk"><input type="checkbox" id="psgob" ${PS.gob?"checked":""}> Mostrar quién gobernaba en España</label>
      ${esMode?`<label class="chk"><input type="checkbox" id="psidx" ${PS.idx?"checked":""}> Como índice, con un año de referencia = 100</label>
        ${PS.idx?`<label class="psb">Año de referencia <select class="sel" id="psb">${psRange(yrs).map(y=>`<option ${y===(PS.b&&psRange(yrs).includes(PS.b)?PS.b:psRange(yrs)[0])?"selected":""}>${y}</option>`).join("")}</select></label>`:""}
        ${hasE?`<label class="chk"><input type="checkbox" id="psreal" ${PS.real?"checked":""}> Descontar la inflación</label>`:""}`
        :`<label class="blk" for="psref">Comparar con</label><select class="sel" id="psref">${Object.entries(Pz).filter(([g,o])=>g!=="ES"&&o[PS.k]).map(([g,o])=>`<option value="${g}" ${g===PS.ref?"selected":""}>${esc(o.n)}</option>`).join("")}</select>
      <label class="chk"><input type="checkbox" id="psrel" ${PS.rel?"checked":""}> Ver cada país como diferencia con ${esc((Pz[PS.ref]||{}).n||"la referencia")}</label>`}
      <p class="hint">${esMode?"Con el índice, todas las series valen 100 en el año de referencia: una línea en 130 ha crecido un 30 % desde entonces. Así se comparan euros, precios y personas.":"La economía depende mucho del ciclo europeo. Comparar con otros países separa lo que pasó en todas partes de lo que fue propio de España."}</p></div>`;
  typesTips(bar);
  bar.querySelectorAll(".types button").forEach(b=>b.addEventListener("click",()=>{ EX.v=b.dataset.v; navTo(exHash()); }));
  const on=(id,fn)=>{ const e=document.getElementById(id); if(e) e.addEventListener("change",fn); };
  const pk=document.getElementById("pspick"); if(pk) pk.addEventListener("click",async()=>{ await loadAllCat(); openPicker(pk,{all:true,here:k=>/^(es|pais):/.test(k),current:esMode?"es:"+PS.s[0]:"pais:"+PS.k,onPick:v=>{
    if(v.startsWith("es:")){ const k=v.slice(3); PS.s=[k,...PS.s.slice(1).filter(x=>x!==k)]; if(PS.s.length===1) PS.idx=SE[k]&&SE[k].idx?1:0; } else { PS.k=v.slice(5); PS.s=[]; } PS.desde=PS.hasta=null; exUpdate(); }}); });
  const ad=document.getElementById("psadd"); if(ad) ad.addEventListener("click",async()=>{ await loadAllCat(); openPicker(ad,{all:true,jump:false,here:k=>k.startsWith("es:"),current:null,excl:PS.s.map(k=>"es:"+k),onPick:v=>{ PS.s=[...PS.s,v.slice(3)].slice(0,7); exUpdate(); }}); });
  bar.querySelectorAll("button[data-sw]").forEach(b=>b.addEventListener("click",async()=>{ await loadAllCat(); openPicker(b,{all:true,jump:false,here:k=>k.startsWith("es:"),current:"es:"+b.dataset.sw,excl:PS.s.map(k=>"es:"+k),onPick:v=>{ PS.s=PS.s.map(x=>x===b.dataset.sw?v.slice(3):x); exUpdate(); }}); }));
  bar.querySelectorAll("button[data-rs]").forEach(b=>b.addEventListener("click",()=>{ PS.s=PS.s.filter(x=>x!==b.dataset.rs); exUpdate(); }));
  on("psgob",e=>{ PS.gob=e.target.checked?1:0; exUpdate(); });
  on("psrel",e=>{ PS.rel=e.target.checked?1:0; exUpdate(); });
  on("psref",e=>{ PS.ref=e.target.value; exUpdate(); });
  on("psidx",e=>{ PS.idx=e.target.checked?1:0; exUpdate(); });
  on("psb",e=>{ PS.b=+e.target.value; exUpdate(); }); on("psreal",e=>{ PS.real=e.target.checked?1:0; exUpdate(); });
  bar.querySelectorAll(".seg[aria-label='Ámbito'] button").forEach(b=>b.addEventListener("click",()=>{ PS.lev=b.dataset.l; exUpdate(); }));
  if(document.getElementById("ps-q")) attachSearch(document.getElementById("ps-q"),document.getElementById("ps-r"),document.getElementById("ps-s"),r=>{ PS.m=r[F.code]; PS.lev="mun"; lastMun=PS.m; saveMun(); exUpdate(); });
  const ip=document.getElementById("psipc"); if(ip) ip.addEventListener("click",()=>{ PS.s=[...PS.s,"ipc_general"]; exUpdate(); });
  on("psd",e=>{ PS.desde=+e.target.value; if(PS.hasta&&PS.hasta<PS.desde) PS.hasta=null; exUpdate(); });
  on("psh",e=>{ PS.hasta=+e.target.value; if(PS.desde&&PS.desde>PS.hasta) PS.desde=null; exUpdate(); });
  bar.querySelectorAll(".pschips input[data-g]").forEach(i=>i.addEventListener("change",()=>{ const g=i.dataset.g; PS.c=i.checked?[...new Set([...PS.c,g])].slice(0,7):PS.c.filter(x=>x!==g); if(!PS.c.includes("ES")) PS.c.unshift("ES"); exUpdate(); }));
}
// años disponibles para el dato elegido
function psYears(){ if(PS.s.length&&SERES) return [...new Set(PS.s.flatMap(k=>Object.keys((SERES[k]||{}).v||{}).map(Number)))].sort((a,b)=>a-b);
  if(!PAIS) return []; const P=PAIS.paises; return [...new Set(PS.c.flatMap(g=>Object.keys((P[g]||{})[PS.k]||{}).map(Number)))].sort((a,b)=>a-b); }
async function exPaises(out){
  out.innerHTML='<p class="loading">Cargando los datos…</p>';
  try{ await Promise.all([loadPaises(),loadSeriesES()]); }catch(e){ out.innerHTML='<p class="loading">No se pudieron cargar los datos.</p>'; return; }
  if(EX.v!=="paises") return; PS.s=PS.s.filter(k=>SERES[k]); await psFill(); if(EX.v!=="paises") return; out.innerHTML=""; exBar(); { const t=document.getElementById("lbtitle"); if(t) t.textContent=lbTitle(); }
  return PS.s.length?psDrawES(out):psDrawPais(out);
}
// tabla por mandato: para cada serie, el cambio en los años de cada Gobierno
function psMandTable(out,cols,t,title,sub,note){
  const M=psMandatos(), base=cols[0].v, fm=t==="tasa"?(v=>v==null?"—":(v>0?"+":v<0?"−":"")+nf1.format(Math.abs(v))+" pts"):(v=>v==null?"—":sgn(v));
  const rows=M.filter(g=>g.ys.some(y=>base[y]!=null&&(!PS.desde||y>=PS.desde)&&(!PS.hasta||y<=PS.hasta))).map(g=>{ const ys=g.ys.filter(y=>(!PS.desde||y>=PS.desde)&&(!PS.hasta||y<=PS.hasta)), w0=psWindow(base,ys), w=w0&&PS.desde&&w0.a<PS.desde?{...w0,a:w0.yy[0]}:w0, full=w&&w.yy[0]===g.ys[0]&&w.yy[w.yy.length-1]===g.ys[g.ys.length-1];
    return [`<b style="color:${PARTYC[g.partido]}">${esc(g.p)}</b> <small class="muted">${g.partido}, ${g.ys[0]}–${g.hasta?g.ys[g.ys.length-1]:"hoy"}${w&&!full?` (${w.yy[0]}–${w.yy[w.yy.length-1]})`:""}</small>`,...cols.map(c=>fm(psChange(c.v,w,t)))]; });
  if(!rows.length) return; const f=fig(out,{title,sub,source:note}); table(f.body,["Presidente",...cols.map(c=>esc(c.n))],rows);
}
function psDrawES(out){
  const SE=SERES, ks0=PS.s, ks=ks0.filter(k=>Object.keys(SE[k].v).length>=2), miss=ks0.filter(k=>!ks.includes(k));
  if(!ks.length){ out.innerHTML='<p class="loading">No hay datos de estas series para este lugar. Prueba con España o con la provincia.</p>'; return; }
  const all=[...new Set(ks.flatMap(k=>Object.keys(SE[k].v).map(Number)))].sort((a,b)=>a-b), years=psRange(all);
  if(years.length<2){ out.innerHTML='<p class="loading">Elige una ventana de al menos dos años.</p>'; return; }
  const units=[...new Set(ks.map(k=>SE[k].u))], idx=PS.idx||units.length>1, y0=PS.b&&years.includes(PS.b)?PS.b:years[0];
  // descontar la inflación: euros del último año con IPC
  const yI=Math.max(...Object.keys(REFS.ipc||{}).map(Number)), real=PS.real&&ks.some(k=>SE[k].u==="€");
  const val=(o,y)=>{ const v=o.v[y]; if(v==null) return null; return real&&o.u==="€"&&IPC(y)?v*IPC(yI)/IPC(y):v; };
  const nm=o=>(o.sl||o.l)+(o.where&&o.where!=="España"?" · "+o.where:"");
  const ser=ks.map((k,i)=>{ const o=SE[k], b0=o.v[y0]!=null?y0:years.find(y=>y>=y0&&o.v[y]!=null)??years.find(y=>o.v[y]!=null), b=val(o,b0);
    return {n:nm(o),tip:o.d,b0,pts:o.u==="%"&&!idx,c:k==="ipc_general"?"--ink":["--rust","--slate","--mustard","--plum","--olive","--stone","--ink-2"][i%7],main:i===0,dash:k==="ipc_general",v:Object.fromEntries(years.filter(y=>o.v[y]!=null).map(y=>[y,idx?val(o,y)/b*100:val(o,y)]))}; });
  const u=units[0], fmt=idx?(v=>nf1.format(v)):u==="€"?(v=>nf0.format(v)+NB+"€"):u==="%"?(v=>nf1.format(v)+NB+"%"):(v=>nf0.format(v));
  const wh=[...new Set(ks.map(k=>SE[k].where).filter(w=>w&&w!=="España"))];
  govChart(out,{title:listY(ks.map(k=>SE[k].l.replace(/ \(.*\)$/,""))).replace(/^./,c=>c.toUpperCase())+(wh.length?" · "+wh.join(", "):""),
    sub:(idx?`Índice: ${y0} = 100${units.length>1&&!PS.idx?" (las series tienen unidades distintas)":""}`:`${u==="€"?(real?`Euros de ${yI}, descontando la inflación`:"Euros de cada año"):u||"Número"}`)+(idx&&real?`. En euros de ${yI}`:"")+". Medias anuales",
    source:`Fuente: ${[...new Set(ks.map(k=>SE[k].src))].join("; ")}.${PS.gob?" Fondo: presidente del Gobierno; cada año se asigna a quien gobernó más de la mitad.":""}`,years,series:ser,fmt,tick:v=>idx?nf0.format(v):u==="€"&&v>=10000?nf0.format(v/1000)+" mil":nf0.format(v),gob:!!PS.gob,ref:idx?y0:null});
  const ch=ser.map(s=>{ const ys=Object.keys(s.v).map(Number), a=s.v[ys[0]], b=s.v[ys[ys.length-1]]; return a&&b?{n:s.n,g:s.pts?b-a:(b/a-1)*100,pts:s.pts,a:ys[0],z:ys[ys.length-1]}:null; }).filter(Boolean);
  if(ch.length) add(out,"p",null,`${ch.map(c=>`<b>${esc(c.n.replace(/ \(.*\)$/,""))}</b> ${c.pts?(c.g>0?"+":c.g<0?"−":"")+nf1.format(Math.abs(c.g))+NB+"puntos":sgn(c.g)} <small class="muted">(${c.a}–${c.z})</small>`).join(" · ")}.`).style.cssText="max-width:var(--medida);font-size:15px;margin-top:4px";
  if(ks.includes("viv_esfuerzo")) add(out,"p","muted",`<b>Esfuerzo de pagar el alquiler:</b> alquiler medio de cada año (× 12) entre el sueldo mediano anual, en %. Es una cuenta aproximada: usa el alquiler medio de todos los inquilinos, con contratos antiguos incluidos, y el sueldo de una sola persona. Quien firma hoy un contrato nuevo paga más que esa media.`).style.cssText="max-width:var(--medida);font-size:14px";
  if(miss.length) add(out,"p","muted",`Sin datos para este lugar: ${miss.map(k=>esc(SE[k].l)).join(", ")}.`).style.cssText="font-size:13.5px";
  if(PS.gob) psMandTable(out,ks.map(k=>({n:nm(SE[k]).replace(/ \((€|índice).*\)$/,""),v:Object.fromEntries(Object.keys(SE[k].v).map(y=>[y,val(SE[k],y)]))})),units.length===1&&u==="%"&&!idx?"tasa":"nivel","Con cada Gobierno",units.length===1&&u==="%"&&!idx?"Cambio en puntos en los años de cada mandato":"Subida media anual en los años de cada mandato",(units.length===1&&u==="%"&&!idx?"Cambio en puntos porcentuales entre el año anterior al primero del mandato y el último, dentro de la ventana elegida.":"Subida media anual entre el año anterior al primero del mandato y el último, dentro de la ventana elegida. En precios, es la inflación de ese producto."));
}
function psDrawPais(out){
  const I=PSIND[PS.k], P=PAIS.paises; if(!P[PS.ref]||!P[PS.ref][PS.k]) PS.ref="EU27_2020"; const EU=P[PS.ref]&&P[PS.ref][PS.k], refN=P[PS.ref].n;
  const sel=PS.c.filter(g=>P[g]&&P[g][PS.k]&&(!PS.rel||g!==PS.ref));
  const val=(g,y)=>{ const v=P[g][PS.k][y]; if(v==null) return null; if(!PS.rel) return v; const e=EU&&EU[y]; if(e==null) return null; return I.t==="nivel"?(v/e-1)*100:v-e; };
  const years=psRange([...new Set(sel.flatMap(g=>Object.keys(P[g][PS.k]).map(Number)))].sort((a,b)=>a-b).filter(y=>sel.some(g=>val(g,y)!=null)));
  if(years.length<2){ out.innerHTML='<p class="loading">No hay datos para esta combinación o la ventana es demasiado corta.</p>'; return; }
  const fmt=PS.rel?(I.t==="nivel"?v=>sgn(v):v=>(v>0?"+":v<0?"−":"")+nf1.format(Math.abs(v))+" pts"):I.f;
  govChart(out,{title:PS.rel?`${I.l}: diferencia con ${refN}`:I.l,sub:PS.rel?(I.t==="nivel"?`% por encima (o por debajo) de ${refN}`:`Puntos por encima (o por debajo) de ${refN}`):I.u,
    source:`Fuente: Eurostat${years[0]<1995?" (desde 1995) y Banco Mundial (antes)":""}.${PS.gob?" Fondo: presidente del Gobierno de España; cada año se asigna a quien gobernó más de la mitad.":""}`,
    years,series:sel.map((g,i)=>({n:P[g].n,c:PSCOL[i%PSCOL.length],main:g==="ES",v:Object.fromEntries(years.map(y=>[y,val(g,y)]).filter(([,v])=>v!=null))})),fmt,
    tick:v=>PS.rel||I.u!=="€ de 2020"?nf0.format(v):nf0.format(v/1000)+" mil",zero:PS.rel||I.t==="flujo",gob:!!PS.gob});
  if(PS.gob){ const OT=[...new Set([PS.ref,...PS.c.filter(g=>g!=="ES")])].filter(g=>P[g]&&P[g][PS.k]);
    const lab=I.t==="flujo"?"Media anual":I.t==="nivel"?"Crecimiento medio anual":"Cambio en puntos";
    psMandTable(out,[{n:"España",v:P.ES[PS.k]},...OT.map(c=>({n:P[c].n.replace("Unión Europea","UE"),v:P[c][PS.k]}))],I.t,`${I.l} con cada Gobierno`,`${lab} en los años de cada mandato, en España y en los países elegidos`,
      (I.t==="tasa"?"Cambio entre el año anterior al primer año del mandato y el último":I.t==="nivel"?"Crecimiento medio anual entre el año anterior al primer año del mandato y el último":"Media de los años de cada mandato")+", dentro de la ventana elegida. Los primeros meses de cada mandato dependen todavía de lo que hizo el Gobierno anterior.");
    add(out,"p","muted",`Un dato que mejora con un Gobierno no prueba que fuera mérito suyo, ni lo contrario: la economía española se mueve sobre todo con el ciclo europeo y mundial, y las políticas tardan años en notarse. Comparar con otros países en los mismos años ayuda a separar lo que fue común.`).style.cssText="max-width:var(--medida);font-size:14px;margin-top:8px"; }
}
// ---------- burbujas por años (provincias) ----------
const BSER=[["renta","net_income_pc"],["pobreza","poverty"],["gini","gini"],["edad","mean_age"],["extr","pct_foreign"],["mayores65","pct_over65"],["menores18","pct_under18"],["solos","pct_single_hh"],["rentaHog","net_income_hh"]];
let BUB_T=null;
async function exBurbujas(out){
  await loadRegional();
  // series anuales por provincia: las del Atlas de Renta (media de los municipios) y las oficiales de data/regional.json
  const keysA=BSER.map(b=>b[0]).filter(k=>CATK[k]), keysR=CAT.filter(c=>c.reg&&c.np>=40).map(c=>c.k), keys=[...keysA,...keysR];
  let bx=keys.includes(EX.d[0])?EX.d[0]:"renta", by=keys.includes(EX.d[1])?EX.d[1]:"pobreza"; if(bx===by) by=keys.find(k=>k!==bx);
  EX.d=[bx,by];
  out.innerHTML=`<div class="bubctl"><button type="button" class="sel" id="bplay" aria-label="Reproducir">▶ Reproducir</button><input type="range" id="byr" min="0" max="${YEARS.length-1}" step="0.01" value="${YEARS.length-1}" aria-label="Año"><b id="byl"></b></div><div id="bubbox"><p class="loading">Cargando las provincias…</p></div>`;
  const regS=(k,p)=>{ const s=((REG.data.prov[p]||{})[k.slice(2)])||{}; return YEARS.map(y=>s[y]??null); };
  const szK=EX.sz&&keys.includes(EX.sz)?EX.sz:null;
  let data; try{ data=await Promise.all(Object.keys(PROVS).map(async p=>{ const t=await loadProv(p), m=Object.values(t); const avg=k=>YEARS.map((_,i)=>{ let a=0,b=0; for(const z of m){ const v=z.s[k]&&z.s[k][i], w=z.s.population[i]; if(v!=null&&w){ a+=v*w; b+=w; } } return b?a/b:null; });
      const ser=k=>isReg(k)?regS(k,p):avg(BSER.find(b=>b[0]===k)[1]);
      const pop=YEARS.map((_,i)=>d3.sum(m,z=>z.s.population[i]||0));
      return {p,n:provShort(PROVS[p]),pop,x:ser(bx),y:ser(by),s:szK?ser(szK):pop}; })); }catch(e){ document.getElementById("bubbox").innerHTML='<p class="loading">No se pudieron cargar las provincias.</p>'; return; }
  if(!document.getElementById("bubbox")) return;
  data=data.filter(d=>d.x.some(v=>v!=null)&&d.y.some(v=>v!=null)); const last=YEARS.length-1;
  const fill=a=>{ let l=null; return a.map(v=>{ if(v!=null) l=v; return l; }).reduceRight((r,v,i)=>{ r[i]=v==null?r[i+1]:v; return r; },new Array(a.length)); };
  data.forEach(d=>{ d.x=fill(d.x); d.y=fill(d.y); d.pop=fill(d.pop.map(v=>v||null)); d.s=szK?fill(d.s).map(v=>v==null?0:Math.max(0,v)):d.pop; });
  const W=Math.max(320,out.clientWidth||900), H=Math.round(Math.min(480,Math.max(300,W*0.55))), m={t:22,r:16,b:40,l:58};
  const xs=data.flatMap(d=>d.x), ys=data.flatMap(d=>d.y), q=(a,p)=>d3.quantile(a.slice().sort(d3.ascending),p);
  const X=d3.scaleLinear().domain([q(xs,.0),q(xs,1)]).nice().range([m.l,W-m.r]), Y=d3.scaleLinear().domain([q(ys,0),q(ys,1)]).nice().range([H-m.b,m.t]), R=d3.scaleSqrt().domain([0,d3.max(data,d=>d3.max(d.s))||1]).range([2,Math.min(30,W/22)]);
  const fx=fmtK(bx), fy=fmtK(by), short=(fm,v)=>fm(v).replace(/ (%|€)$/,"$1").replace(/(\d)\.000 ?€$/,"$1 mil €");
  const box=document.getElementById("bubbox"); box.innerHTML=`<div class="bubwrap"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Provincias: ${esc(labK(bx))} frente a ${esc(labK(by))} por años"></svg><div class="maptip" hidden></div></div><p class="figcap">Cada burbuja es una provincia. <b>El tamaño es ${szK?esc(low(labK(szK))):"su número de habitantes"}</b> en cada año${szK?"":" (padrón del INE)"}. Fuente: ${esc(CATK[bx].src)}${CATK[by].src!==CATK[bx].src?` y ${esc(CATK[by].src)}`:""}.</p>`;
  const svg=d3.select(box).select("svg"), tip=box.querySelector(".maptip");
  svg.append("g").attr("class","grid").selectAll("line").data(Y.ticks(5)).join("line").attr("x1",m.l).attr("x2",W).attr("y1",Y).attr("y2",Y);
  svg.append("g").attr("class","axis").selectAll("text").data(Y.ticks(5)).join("text").attr("x",m.l-6).attr("y",v=>Y(v)+4).attr("text-anchor","end").text(v=>short(fy,v));
  svg.append("g").attr("class","axis").selectAll("text").data(X.ticks(W<500?4:6)).join("text").attr("x",X).attr("y",H-m.b+16).attr("text-anchor","middle").text(v=>short(fx,v));
  svg.append("text").attr("class","lab strong").attr("x",W).attr("y",H-4).attr("text-anchor","end").text(labK(bx)+" →"); svg.append("text").attr("class","lab strong").attr("x",0).attr("y",m.t-10).text("↑ "+labK(by));
  const big=new Set(data.slice().sort((a,b)=>b.pop[last]-a.pop[last]).slice(0,5).map(d=>d.p)); if(EX.p) big.add(EX.p);
  const g=svg.append("g").selectAll("g").data(data).join("g").attr("class","bub");
  g.append("circle").attr("fill",css("--rust")).attr("fill-opacity",.4).attr("stroke",css("--rust")).style("cursor","default");
  g.append("text").attr("text-anchor","middle").attr("class","lab strong").attr("dy",-3).text(d=>big.has(d.p)?d.n:"");
  const yl=document.getElementById("byl"), rg=document.getElementById("byr");
  // leyenda del tamaño
  { const lg=svg.append("g").attr("class","axis").attr("transform",`translate(${W-m.r-8},${m.t+4})`), mx=d3.max(data,d=>d3.max(d.s))||1, fs=szK?fmtK(szK):null;
    const ps=szK?[d3.nice(0,mx/4,1)[1]||mx/4,d3.nice(0,mx,1)[1]>mx*1.3?mx:d3.nice(0,mx,1)[1]].filter((v,i,a)=>v>0&&a.indexOf(v)===i):[1e6,5e6].filter(v=>R(v)<40); let yy=0;
    lg.append("text").attr("x",0).attr("y",8).attr("text-anchor","end").text(szK?labK(szK):"Habitantes"); yy=18;
    ps.forEach(v=>{ const r=R(v); lg.append("circle").attr("cx",-r).attr("cy",yy+r).attr("r",r).attr("fill","none").attr("stroke",css("--muted")); lg.append("text").attr("x",-2*r-6).attr("y",yy+r+4).attr("text-anchor","end").text(szK?fs(v):v>=1e6?nf0.format(v/1e6)+" millón"+(v>1e6?"es":""):nf0.format(v)); yy+=2*r+6; }); }
  // entre un año y el siguiente se interpola, para que el movimiento sea continuo
  const at=(a,t)=>{ const i=Math.floor(t), f=t-i; if(i>=last) return a[last]; const u=a[i], w=a[i+1]; return u==null?w:w==null?u:u+(w-u)*f; };
  const draw=t=>{ yl.textContent=YEARS[Math.round(t)]; g.attr("transform",d=>`translate(${X(at(d.x,t))},${Y(at(d.y,t))})`).select("circle").attr("r",d=>R(at(d.s,t)||0.5)); }; draw(last);
  g.on("pointermove",(ev,d)=>{ const i=Math.round(+rg.value), bb=box.querySelector(".bubwrap").getBoundingClientRect(); tip.innerHTML=`<b>${esc(d.n)}</b> · ${YEARS[i]}<br>${esc(labK(bx))}: ${fx(d.x[i])}<br>${esc(labK(by))}: ${fy(d.y[i])}<br>${szK?esc(labK(szK))+": "+fmtK(szK)(d.s[i]):"Habitantes: "+nf0.format(d.pop[i]||0)}`; tip.hidden=false; tip.style.left=Math.max(70,Math.min(bb.width-70,X(d.x[i])/W*bb.width))+"px"; tip.style.top=(Y(d.y[i])/H*bb.height-12)+"px"; }).on("pointerleave",()=>tip.hidden=true);
  rg.addEventListener("input",()=>{ if(BUB_T){ BUB_T.stop(); BUB_T=null; pl.textContent="▶ Reproducir"; } draw(+rg.value); });
  rg.addEventListener("change",()=>{ if(!BUB_T){ rg.value=Math.round(+rg.value); draw(+rg.value); } });
  const pl=document.getElementById("bplay"); pl.addEventListener("click",()=>{ if(BUB_T){ BUB_T.stop(); BUB_T=null; pl.textContent="▶ Reproducir"; return; } const t0=+rg.value>=last?0:+rg.value; pl.textContent="❚❚ Pausa";
    const MS=1100; BUB_T=d3.timer(el=>{ const t=Math.min(last,t0+el/MS); rg.value=t; draw(t); if(t>=last){ BUB_T.stop(); BUB_T=null; pl.textContent="▶ Reproducir"; } }); });
}
// ---------- distribución ----------
function exDist(out){
  const k=EX.d[0], f=fmtK(k), rows=exRows(k).filter(r=>r[F.pop]);
  if(!rows.length){ add(out,"p","loading",`Ningún municipio de esta selección tiene dato de ${esc(low(labK(k)))}. Prueba con otro tamaño o provincia.`); return; }
  if(false){ const ctl=add(out,"div","exrow");
  ctl.innerHTML=`<span class="exlab">Contar</span><div class="seg" role="group"><button type="button" data-w="1" aria-pressed="${!!EX.w}">Personas</button><button type="button" data-w="0" aria-pressed="${!EX.w}">Municipios</button></div>`;
  ctl.querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{ EX.w=+b.dataset.w; exUpdate(); }));
  const DG=[["","Todos juntos"],["ccaa","Por comunidad"],["prov","Por provincia"],["size","Por tamaño"],...(k!=="renta"?[["renta","Por nivel de renta"]]:[])];
  if(!DG.some(d=>d[0]===EX.dg)) EX.dg="";
  }
  if(false){ const ctl2=add(out,"div","exrow"); ctl2.innerHTML=`<span class="exlab">Comparar</span><div class="seg" role="group" aria-label="Comparar grupos">${DG.map(([v,l])=>`<button type="button" data-dg="${v}" aria-pressed="${EX.dg===v}">${l}</button>`).join("")}</div>`;
  ctl2.querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{ EX.dg=b.dataset.dg; exUpdate(); })); }
  if(EX.dg){ exViolin(out,k,rows); return; }
  const vals=rows.map(r=>r[F[k]]).sort((a,b)=>a-b), lo=d3.quantile(vals,.01), hi=d3.quantile(vals,.99);
  const x=d3.scaleLinear().domain([lo,hi]).nice(30), bins=d3.bin().domain(x.domain()).thresholds(x.ticks(30)).value(r=>Math.max(lo,Math.min(hi,r[F[k]])))(rows);
  const wq=(p)=>{ const s=rows.slice().sort((a,b)=>a[F[k]]-b[F[k]]), tot=d3.sum(s,r=>EX.w?r[F.pop]:1); let acc=0; for(const r of s){ acc+=EX.w?r[F.pop]:1; if(acc>=p*tot) return r[F[k]]; } return null; };
  const p10=wq(.1), p50=wq(.5), p90=wq(.9);
  const fg=fig(out,{title:`${labK(k)}: cómo se reparte entre ${EX.w?"la población":"los municipios"}`,source:`Cada barra suma ${EX.w?"los habitantes":"el número"} de los municipios con un valor parecido. Los valores extremos (1 % por cada lado) se agrupan en las barras de los bordes. Fuente: ${CATK[k].src}.`});
  const W=Math.max(320,out.clientWidth||900), H=300, m={t:40,r:14,b:26,l:50};
  const X=d3.scaleLinear().domain(x.domain()).range([m.l,W-m.r]), cnt=bins.map(b=>d3.sum(b,r=>EX.w?r[F.pop]:1)), Y=d3.scaleLinear().domain([0,d3.max(cnt)]).nice(4).range([H-m.b,m.t]);
  const svg=d3.select(fg.body).append("svg").attr("viewBox",`0 0 ${W} ${H}`).attr("role","img").attr("aria-label","Histograma de "+labK(k));
  svg.append("g").attr("class","grid").selectAll("line").data(Y.ticks(4)).join("line").attr("x1",m.l).attr("x2",W).attr("y1",Y).attr("y2",Y);
  svg.append("g").attr("class","axis").selectAll("text").data(Y.ticks(4)).join("text").attr("x",m.l-6).attr("y",v=>Y(v)+4).attr("text-anchor","end").text(v=>EX.w?(v>=1e6?nf1.format(v/1e6)+" M":nf0.format(v/1e3)+" mil"):nf0.format(v));
  svg.append("g").selectAll("rect").data(bins).join("rect").attr("x",b=>X(b.x0)+.5).attr("width",b=>Math.max(.5,X(b.x1)-X(b.x0)-1)).attr("y",(b,i)=>Y(cnt[i])).attr("height",(b,i)=>Y(0)-Y(cnt[i])).attr("fill",css("--rust")).attr("opacity",.85)
    .append("title").text((b,i)=>`${f(b.x0)} a ${f(b.x1)}: ${nf0.format(cnt[i])} ${EX.w?"personas":"municipios"}`);
  svg.append("g").attr("class","axis").selectAll("text").data(X.ticks(W<600?4:7)).join("text").attr("x",X).attr("y",H-7).attr("text-anchor","middle").text(v=>f(v).replace(/ (%|€)$/,"$1"));
  const mk=[[p50,"Mediana: "+f(p50),0]]; [EX.m,MUN2].filter(c=>c&&BYCODE.has(c)&&BYCODE.get(c)[F[k]]!=null).forEach((c,i)=>mk.push([BYCODE.get(c)[F[k]],dispName(BYCODE.get(c)[F.name])+": "+f(BYCODE.get(c)[F[k]]),1+i]));
  mk.forEach(([v,t,j])=>{ const xx=X(Math.max(lo,Math.min(hi,v))); svg.append("line").attr("x1",xx).attr("x2",xx).attr("y1",m.t-[26,10,-6][j]).attr("y2",H-m.b).attr("stroke",css(["--ink","--slate","--rust"][j])).attr("stroke-width",1.4).attr("stroke-dasharray",j?"4 3":null);
    svg.append("text").attr("class","lab strong").attr("x",xx+(xx>W*0.7?-5:5)).attr("y",m.t-[28,12,-4][j]).attr("text-anchor",xx>W*0.7?"end":"start").style("fill",css(["--ink","--slate","--rust"][j])).text(t); });
  add(out,"p",null,`<b>${EX.w?"La mitad de la población":"La mitad de los municipios"}</b> ${EX.w?"vive en municipios con":"tiene"} menos de ${f(p50)}. El 10${NB}% ${EX.w?"de la población":"de los municipios"} está por debajo de ${f(p10)} y otro 10${NB}% por encima de ${f(p90)}: ${p10>0&&!/pct_chg|pts/.test(CATK[k].f||"")?`el de arriba tiene ${nf1.format(p90/p10)} veces lo del de abajo.`:`hay ${f(p90-p10).replace(/^\+/,"")} de distancia entre uno y otro.`}`).style.cssText="max-width:var(--medida);margin-top:12px;color:var(--ink-2)";
}
// violines: la distribución de un dato en cada grupo (comunidad, provincia, tamaño o nivel de renta)
function exViolin(out,k,rows){
  const f=fmtK(k), wt=r=>EX.w?r[F.pop]:1, val=r=>r[F[k]];
  const sizeB=[[0,1000,"Menos de 1.000 hab."],[1000,5000,"1.000–5.000 hab."],[5000,20000,"5.000–20.000 hab."],[20000,100000,"20.000–100.000 hab."],[100000,1e12,"Más de 100.000 hab."]];
  let key, order=null;
  if(EX.dg==="ccaa") key=r=>CCAA_OF[r[F.prov]];
  else if(EX.dg==="prov") key=r=>provShort(PROVS[r[F.prov]]);
  else if(EX.dg==="size"){ key=r=>{ const b=sizeB.find(s=>r[F.pop]>=s[0]&&r[F.pop]<s[1]); return b?b[2]:null; }; order=sizeB.map(s=>s[2]); }
  else { const s=rowsAll().filter(r=>r[F.renta]!=null&&r[F.pop]).sort((a,b)=>a[F.renta]-b[F.renta]), tot=d3.sum(s,r=>r[F.pop]); let acc=0; const qm=new Map(); s.forEach(r=>{ qm.set(r[F.code],Math.min(4,Math.floor((acc+r[F.pop]/2)/tot*5))); acc+=r[F.pop]; });
    order=["20 % con menos renta","Segundo 20 %","20 % central","Cuarto 20 %","20 % con más renta"]; key=r=>qm.has(r[F.code])?order[qm.get(r[F.code])]:null; }
  const all=rows.map(val).sort((a,b)=>a-b), lo=d3.quantile(all,.01), hi=d3.quantile(all,.99);
  const wq=(rs,p)=>{ const s=rs.slice().sort((a,b)=>val(a)-val(b)), tot=d3.sum(s,wt); let acc=0; for(const r of s){ acc+=wt(r); if(acc>=p*tot) return val(r); } return null; };
  // densidad (kernel gaussiano), ponderada por población si se cuentan personas; el mismo ancho de banda para todos los grupos
  const sd=d3.deviation(all.filter(v=>v>=lo&&v<=hi))||1, h=Math.max(1e-9,1.06*sd*Math.pow(all.length,-0.2)*1.2), G=d3.range(61).map(i=>lo+(hi-lo)*i/60);
  let groups=d3.groups(rows.filter(r=>key(r)!=null),key).filter(([,rs])=>rs.length>=5).map(([g,rs])=>{ const tw=d3.sum(rs,wt);
    const dens=G.map(x=>d3.sum(rs,r=>{ const z=(Math.max(lo,Math.min(hi,val(r)))-x)/h; return wt(r)*Math.exp(-.5*z*z); })/tw);
    return {g,n:rs.length,dens,p10:wq(rs,.1),p25:wq(rs,.25),p50:wq(rs,.5),p75:wq(rs,.75),p90:wq(rs,.9)}; });
  if(order) groups.sort((a,b)=>order.indexOf(a.g)-order.indexOf(b.g)); else groups.sort((a,b)=>b.p50-a.p50);
  if(!groups.length){ add(out,"p","loading","No hay grupos con municipios suficientes en esta selección."); return; }
  const med=wq(rows,.5), dmax=d3.max(groups,g=>d3.max(g.dens));
  const W=Math.max(320,out.clientWidth||900), rh=groups.length>25?26:groups.length>8?36:52, lw=Math.min(190,W*0.3), m={t:30,r:70,b:28,l:lw};
  const H=m.t+m.b+groups.length*rh;
  const fg=fig(out,{title:`${labK(k)}: cómo se reparte ${EX.dg==="ccaa"?"en cada comunidad":EX.dg==="prov"?"en cada provincia":EX.dg==="size"?"según el tamaño del municipio":"según el nivel de renta del municipio"}`,
    sub:`Cada forma es más ancha donde se concentran ${EX.w?"más personas":"más municipios"}. La barra oscura va del 25 % al 75 %; el punto blanco es la mediana`,
    source:`${EX.dg==="renta"?"Grupos con la misma población, de menos a más renta por persona. ":""}Los valores extremos (1 % por cada lado) se agrupan en los bordes. La raya discontinua es la mediana de toda la selección. Fuente: ${CATK[k].src}.`});
  const X=d3.scaleLinear().domain([lo,hi]).range([m.l,W-m.r]), Hh=d3.scaleLinear().domain([0,dmax]).range([0,rh*0.46]);
  const svg=d3.select(fg.body).append("svg").attr("viewBox",`0 0 ${W} ${H}`).attr("role","img").attr("aria-label",`Distribución de ${labK(k)} por grupos`);
  svg.append("g").attr("class","grid").selectAll("line").data(X.ticks(W<600?4:7)).join("line").attr("x1",X).attr("x2",X).attr("y1",m.t-6).attr("y2",H-m.b);
  svg.append("g").attr("class","axis").selectAll("text").data(X.ticks(W<600?4:7)).join("text").attr("x",X).attr("y",H-8).attr("text-anchor","middle").text(v=>f(v).replace(/ (%|€)$/,"$1"));
  svg.append("line").attr("x1",X(med)).attr("x2",X(med)).attr("y1",m.t-14).attr("y2",H-m.b).attr("stroke",css("--ink")).attr("stroke-dasharray","4 3");
  svg.append("text").attr("class","lab strong").attr("x",X(med)+5).attr("y",m.t-16).text("Mediana: "+f(med));
  const area=d3.area().x((d,i)=>X(G[i])).y0(d=>-Hh(d)).y1(d=>Hh(d)).curve(d3.curveBasis);
  const gg=svg.append("g").selectAll("g").data(groups).join("g").attr("transform",(d,i)=>`translate(0,${m.t+i*rh+rh/2})`);
  gg.append("path").attr("d",d=>area(d.dens)).attr("fill",css("--rust")).attr("fill-opacity",.35).attr("stroke",css("--rust")).attr("stroke-width",1);
  gg.append("line").attr("x1",d=>X(d.p25)).attr("x2",d=>X(d.p75)).attr("stroke",css("--ink")).attr("stroke-width",Math.max(3,rh*0.12)).attr("stroke-linecap","round");
  gg.append("circle").attr("cx",d=>X(d.p50)).attr("r",Math.max(2.5,rh*0.08)).attr("fill","#fff").attr("stroke",css("--ink"));
  gg.append("text").attr("class","lab").attr("x",m.l-8).attr("y",4).attr("text-anchor","end").text(d=>d.g.length>28?d.g.slice(0,27)+"…":d.g);
  gg.append("text").attr("class","lab strong").attr("x",W-m.r+6).attr("y",4).text(d=>f(d.p50).replace(/ (%|€)$/,"$1"));
  gg.append("title").text(d=>`${d.g}: mediana ${f(d.p50)}; la mitad central, de ${f(d.p25)} a ${f(d.p75)}; el 10 % más bajo, por debajo de ${f(d.p10)} y el 10 % más alto, por encima de ${f(d.p90)} (${nf0.format(d.n)} municipios)`);
  const hiG=groups.reduce((a,b)=>b.p50>a.p50?b:a), loG=groups.reduce((a,b)=>b.p50<a.p50?b:a), spread=groups.reduce((a,b)=>(b.p75-b.p25)>(a.p75-a.p25)?b:a);
  add(out,"p",null,`La mediana más alta está en <b>${esc(hiG.g)}</b> (${f(hiG.p50)}) y la más baja en <b>${esc(loG.g)}</b> (${f(loG.p50)}). Donde más diferencias hay por dentro es en <b>${esc(spread.g)}</b>: la mitad central va de ${f(spread.p25)} a ${f(spread.p75)}.`).style.cssText="max-width:var(--medida);margin-top:6px";
}
// =====================================================================
// LABORATORIO: vistas nuevas (matriz, antes y ahora, pirámide, composición) y mapa por provincias o comunidades
// =====================================================================
const pgK=k=>{ const c=CATK[k]||{}; return c.reg?(c.np>=40?"Por provincia":"Por comunidad"):c.eu?"Europa":c.g||""; };
const ccName=c=>{ for(const [n,cc] of Object.entries(REGCCN)) if(cc===c) return n; return c; };
const grpName=(u,c)=>u==="prov"?provShort(PROVS[c]):ccName(c);
// valor de un dato en cada provincia o comunidad: los oficiales, tal cual (último año con casi todas); los municipales, media ponderada por población
function aggVals(k,u){ const V=new Map(); let year=null;
  if(isReg(k)){ year=regYear([k],u); const D=REG.data[u]||{}; Object.entries(D).forEach(([c,o])=>{ const s=o[k.slice(2)]; if(s&&s[year]!=null) V.set(c,s[year]); }); }
  else { const key=u==="prov"?r=>r[F.prov]:r=>REGCCN[CCAA_OF[r[F.prov]]]; const rs=rowsAll().filter(r=>r[F[k]]!=null&&r[F.pop]&&r[F.pop]>=EXF.min&&r[F.pop]<EXF.max&&key(r));
    d3.groups(rs,key).forEach(([c,v])=>{ const w=d3.sum(v,r=>r[F.pop]); V.set(c,d3.sum(v,r=>r[F[k]]*r[F.pop])/w); }); }
  return {V,year}; }
const SCALEM=[["","Municipios"],["prov","Provincias"],["ccaa","Comunidades"]];
const scaleSeg=(id,cur,opts=SCALEM)=>`<div class="seg sm lbseg" role="group" id="${id}">${opts.map(([u,l])=>`<button type="button" data-u="${u}" aria-pressed="${(cur||"")===u}">${l}</button>`).join("")}</div>`;

async function exMapaAgg(out,k){
  const u=EX.u, f=fmtK(k), {V,year}=aggVals(k,u);
  const g=add(out,"div","exmap"), left=add(g,"div","exmap-m"), right=add(g,"div","exlists");
  add(left,"div","cs",esc((CATK[k].src||"")+(year?` · ${year}`:"")));
  const mb=add(left,"div","mapbox",'<div class="maploading">Dibujando el mapa…</div>'), lg=add(left,"div","legend");
  if(V.size<3){ out.innerHTML=`<p class="loading">No hay datos de ${esc(low(labK(k)))} por ${u==="prov"?"provincias":"comunidades"}.</p>`; return; }
  const L=[...V].map(([c,v])=>({c,v,n:grpName(u,c)})).sort((a,b)=>b.v-a.v);
  const li=(arr,t)=>`<div class="lista"><h3>${t}</h3><ol>${arr.map(o=>`<li><span>${esc(o.n)}</span><span class="v">${f(o.v)}</span></li>`).join("")}</ol></div>`;
  const n=Math.min(8,Math.floor(L.length/2));
  right.innerHTML=li(L.slice(0,n),"Valores más altos")+li(L.slice(-n).reverse(),"Valores más bajos")+`<figcaption>${isReg(k)?`Dato oficial de cada ${u==="prov"?"provincia":"comunidad"}${year?`, ${year}`:""}.`:`Media de los municipios de cada ${u==="prov"?"provincia":"comunidad"}, ponderada por población${EX.t?" (solo los del tamaño elegido)":""}.`}${u==="prov"?" Pulsa una provincia para ver sus municipios.":""}</figcaption>`;
  try{ await loadTopo(); }catch(e){ mb.innerHTML='<div class="maploading">No se pudo cargar el mapa.</div>'; return; }
  if(!document.body.contains(mb)) return; mb.innerHTML="";
  const W=640,H=520, regions=topojson.feature(TOPO,TOPO.objects.autonomous_regions); regions.features.forEach(rewind);
  const fc=u==="prov"?topojson.feature(TOPO,TOPO.objects.provinces):regions; if(u==="prov") fc.features.forEach(rewind);
  const proj=d3.geoConicConformalSpain().fitSize([W-10,H-10],regions), path=d3.geoPath(proj);
  const svg=d3.select(mb).append("svg").attr("viewBox",`0 0 ${W} ${H}`).attr("role","img").attr("aria-label",`Mapa de ${labK(k)} por ${u==="prov"?"provincias":"comunidades"}`);
  const zg=svg.append("g"), gg=zg.append("g").attr("transform","translate(5,5)"), tip=el("div","maptip"); tip.hidden=true; mb.appendChild(tip);
  const vals=[...V.values()], ramp=[0,1,2,3,4,5,6].map(i=>css("--ramp-"+i)), lo=d3.min(vals), hi=d3.max(vals);
  const neg=lo<0&&hi>0; let scale,stops;
  if(neg){ const m=Math.max(-lo,hi); stops=[css("--div-neg"),css("--div-neg2"),"#c9d6e6",css("--div-mid"),ramp[2],ramp[4],ramp[6]]; scale=d3.scaleThreshold().domain([-m*.6,-m*.25,-m*.05,m*.05,m*.25,m*.6]).range(stops); }
  else { scale=d3.scaleQuantize().domain([lo,hi]).range(ramp); stops=ramp; }
  gg.selectAll("path").data(fc.features).join("path").attr("d",path).attr("stroke","#fff").attr("stroke-width",.8).style("cursor",u==="prov"?"pointer":"default")
    .attr("fill",ft=>V.has(ft.id)?scale(V.get(ft.id)):css("--nodata"))
    .on("pointermove",(ev,ft)=>{ tip.innerHTML=`<b>${esc(grpName(u,ft.id))}</b>: ${V.has(ft.id)?f(V.get(ft.id)):"sin dato"}`; tip.hidden=false; const bb=mb.getBoundingClientRect(); tip.style.left=Math.max(tip.offsetWidth/2+4,Math.min(bb.width-tip.offsetWidth/2-4,ev.clientX-bb.left))+"px"; tip.style.top=(ev.clientY-bb.top)+"px"; })
    .on("pointerleave",()=>tip.hidden=true)
    .on("click",(ev,ft)=>{ if(u!=="prov"||isReg(k)||!PROVS[ft.id]) return; EX.u=""; EX.p=ft.id; navTo(exHash()); });
  gg.append("path").attr("d",proj.getCompositionBorders()).attr("fill","none").attr("stroke",css("--muted")).attr("stroke-width",.8);
  addMapZoom(svg,zg,gg,W,H,mb);
  lg.innerHTML=`<span class="num">${f(lo)}</span><span class="bar">${stops.map(c=>`<i style="background:${c}"></i>`).join("")}</span><span class="num">${f(hi)}</span><span class="help">${neg?"En azul, valores negativos; en granate, positivos.":"Siete tramos de igual anchura entre el valor más bajo y el más alto."}</span>`;
}

// ---------- matriz de relaciones ----------
const MATDEF=["renta","edad","paroReg","extr","superiores","part","alquiler","varPob"];
function exMatriz(out){
  const ks=EX.d.filter(k=>CATK[k]&&!isReg(k)&&!isEU(k)).slice(0,10), rows=exRows(), wt=!!EX.w;
  if(ks.length<2){ out.innerHTML='<p class="loading">Elige al menos dos datos.</p>'; return; }
  const C={}; ks.forEach(a=>ks.forEach(b=>{ if(a>=b&&a!==b) return; const c=a===b?{r:1}:wcorr(rows.filter(r=>r[F[a]]!=null&&r[F[b]]!=null).map(r=>({x:r[F[a]],y:r[F[b]],w:wt?(r[F.pop]||0):1}))); C[a+"|"+b]=C[b+"|"+a]=c?c.r:null; }));
  const n=ks.length, W=Math.max(320,out.clientWidth||760), Lw=Math.min(210,W*0.32), cs=Math.max(26,Math.min(58,(W-Lw-70)/n)), T=6, H=T+n*cs+Math.min(150,10+d3.max(ks,k=>labK(k).length)*5.4);
  const col=r=>{ if(r==null) return css("--nodata"); const t=Math.min(1,Math.abs(r)), a=r>0?[176,48,63]:[46,111,176], m=[235,232,225]; return `rgb(${a.map((x,i)=>Math.round(m[i]+(x-m[i])*t)).join(",")})`; };
  const fg=fig(out,{title:"Cuánto van juntos cada par de datos",sub:`Correlación entre ${n} datos en ${nf0.format(rows.length)} municipios${wt?", contando según la población":""}. Rojo: suben juntos. Azul: cuando uno sube, el otro baja. Pulsa una casilla para verla en «Relación»`,source:"Correlación de Pearson: de −1 (van en direcciones opuestas) a 1 (van exactamente juntos); 0, nada que ver. Que dos datos vayan juntos no quiere decir que uno cause el otro."});
  const svg=d3.select(fg.body).append("svg").attr("viewBox",`0 0 ${W} ${H}`).attr("role","img").attr("aria-label","Matriz de correlaciones");
  const sh=s=>s.length>34?s.slice(0,33)+"…":s;
  for(let i=0;i<n;i++){ svg.append("text").attr("class","lab").attr("x",Lw-8).attr("y",T+i*cs+cs/2+4).attr("text-anchor","end").text(sh(labK(ks[i]))).append("title").text(labK(ks[i]));
    for(let j=0;j<=i;j++){ const r=i===j?null:C[ks[i]+"|"+ks[j]], gx=svg.append("g").attr("transform",`translate(${Lw+j*cs},${T+i*cs})`).style("cursor",i===j?"default":"pointer");
      gx.append("rect").attr("width",cs-2).attr("height",cs-2).attr("rx",3).attr("fill",i===j?css("--band"):col(r));
      if(i!==j&&r!=null){ gx.append("text").attr("x",(cs-2)/2).attr("y",(cs-2)/2+4).attr("text-anchor","middle").attr("font-size",Math.min(12,cs*0.3)).attr("font-weight",600).attr("fill",Math.abs(r)>.45?"#fff":css("--ink")).text(rFmt(r));
        gx.append("title").text(`${labK(ks[i])} y ${low(labK(ks[j]))}: r = ${rFmt(r)} (${strength(Math.abs(r))})`);
        gx.on("click",()=>{ EX.v="cruce"; EX.u=""; EX.d=[ks[j],ks[i]]; navTo(exHash()); }); } } }
  for(let j=0;j<n;j++) svg.append("text").attr("class","lab").attr("transform",`translate(${Lw+j*cs+cs/2},${T+n*cs+8}) rotate(40)`).text(sh(labK(ks[j])));
  const pairs=[]; for(let i=0;i<n;i++) for(let j=0;j<i;j++){ const r=C[ks[i]+"|"+ks[j]]; if(r!=null) pairs.push({a:ks[j],b:ks[i],r}); }
  pairs.sort((x,y)=>Math.abs(y.r)-Math.abs(x.r));
  const p=add(out,"div","matpairs"); p.innerHTML=`<h3>Las parejas que más van juntas</h3><ol>${pairs.slice(0,5).map(o=>`<li><a href="${exHash({v:"cruce",d:[o.a,o.b],u:""})}">${esc(labK(o.a))} y ${esc(low(labK(o.b)))}</a> <span class="muted">r = ${rFmt(o.r)}, ${o.r>0?"suben juntos":"uno sube, el otro baja"}</span></li>`).join("")}</ol>`;
}

// ---------- antes y ahora (pendientes) ----------
const SLOPE={};   // caché de series por provincia y comunidad
async function slopeData(k,u){
  const id=k+"|"+u; if(SLOPE[id]) return SLOPE[id];
  let G=[], years=[];
  if(isReg(k)){ await loadRegional(); const D=REG.data[u]||{}, f=k.slice(2);
    G=Object.entries(D).filter(([,o])=>o[f]).map(([c,o])=>({c,n:grpName(u,c),v:Object.fromEntries(Object.entries(o[f]).map(([y,v])=>[+y,v]))})); }
  else { const fld=(BSER.find(b=>b[0]===k)||[])[1]; if(!fld) return null;
    const acc=new Map();
    await Promise.all(Object.keys(PROVS).map(async p=>{ const t=await loadProv(p); for(const z of Object.values(t)){ const c=u==="prov"?p:REGCCN[CCAA_OF[p]]; if(!c) continue; if(!acc.has(c)) acc.set(c,YEARS.map(()=>[0,0]));
      const a=acc.get(c); YEARS.forEach((y,i)=>{ const v=z.s[fld]&&z.s[fld][i], w=z.s.population&&z.s.population[i]; if(v!=null&&w){ a[i][0]+=v*w; a[i][1]+=w; } }); } }));
    G=[...acc].map(([c,a])=>({c,n:grpName(u,c),v:Object.fromEntries(YEARS.map((y,i)=>[+y,a[i][1]?a[i][0]/a[i][1]:null]).filter(([,v])=>v!=null))})); }
  G=G.filter(g=>Object.keys(g.v).length>=2);
  const cnt={}; G.forEach(g=>Object.keys(g.v).forEach(y=>cnt[y]=(cnt[y]||0)+1)); const need=Math.max(3,Math.floor(G.length*0.8));
  years=Object.keys(cnt).filter(y=>cnt[y]>=need).map(Number).sort((a,b)=>a-b);
  return SLOPE[id]={G,years};
}
async function exPendientes(out){
  const k=EX.d[0], u=EX.u==="ccaa"?"ccaa":"prov", f=fmtK(k);
  out.innerHTML='<p class="loading">Calculando…</p>';
  const S=await slopeData(k,u); if(EX.v!=="pendientes") return;
  if(!S||S.years.length<2){ out.innerHTML=`<p class="loading">No hay una serie de años de ${esc(low(labK(k)))} por ${u==="prov"?"provincias":"comunidades"}.</p>`; return; }
  const ya=S.years.includes(EX.ya)?EX.ya:S.years[0], yb=S.years.includes(EX.yb)&&EX.yb!==ya?EX.yb:S.years[S.years.length-1];
  if(EX.ya!==ya||EX.yb!==yb){ EX.ya=ya; EX.yb=yb; exSetHash(); exBar(); } { const t=document.getElementById("lbtitle"); if(t) t.textContent=lbTitle(); }
  const P=S.G.filter(g=>g.v[ya]!=null&&g.v[yb]!=null).map(g=>({...g,a:g.v[ya],b:g.v[yb],d:g.v[yb]-g.v[ya]}));
  out.innerHTML="";
  const fg=fig(out,{title:`${labK(k)}: ${ya} frente a ${yb}`,sub:`Cada línea es ${u==="prov"?"una provincia":"una comunidad"}: de dónde partía y dónde está. En color, las que más han subido y las que más han bajado`,source:`${isReg(k)?"Dato oficial":"Media de los municipios, ponderada por población"}. Fuente: ${esc(CATK[k].src)}.`});
  const W=Math.max(320,out.clientWidth||760), H=Math.max(360,Math.min(620,P.length*12+80)), side=Math.min(170,W*0.27), m={t:30,b:16,l:side,r:side};
  const ext=d3.extent(P.flatMap(p=>[p.a,p.b])), Y=d3.scaleLinear().domain(ext).nice().range([H-m.b,m.t]), xa=m.l, xb=W-m.r;
  const byD=P.slice().sort((x,y)=>y.d-x.d), up=new Set(byD.slice(0,3).filter(p=>p.d>0).map(p=>p.c)), dn=new Set(byD.slice(-3).filter(p=>p.d<0).map(p=>p.c));
  const myP=EX.p&&u==="prov"?EX.p:null, colr=p=>p.c===myP?css("--ink"):up.has(p.c)?css("--rust"):dn.has(p.c)?css("--slate"):null;
  const svg=d3.select(fg.body).append("svg").attr("viewBox",`0 0 ${W} ${H}`).attr("role","img").attr("aria-label",`${labK(k)} por ${u==="prov"?"provincias":"comunidades"}, ${ya} y ${yb}`);
  [[xa,ya],[xb,yb]].forEach(([x,y])=>{ svg.append("line").attr("x1",x).attr("x2",x).attr("y1",m.t-6).attr("y2",H-m.b).attr("stroke",css("--rule-2")); svg.append("text").attr("class","lab strong").attr("x",x).attr("y",14).attr("text-anchor","middle").text(y); });
  const all=u==="ccaa"||P.length<=20, hl=p=>!!colr(p)||all;
  P.slice().sort((a,b)=>hl(a)-hl(b)).forEach(p=>{ const c=colr(p)||(all?css("--muted"):"#cfcac0"), g=svg.append("g");
    g.append("line").attr("x1",xa).attr("y1",Y(p.a)).attr("x2",xb).attr("y2",Y(p.b)).attr("stroke",c).attr("stroke-width",colr(p)?2.2:1.1);
    if(colr(p)) [[xa,p.a],[xb,p.b]].forEach(([x,v])=>g.append("circle").attr("cx",x).attr("cy",Y(v)).attr("r",3).attr("fill",c));
    g.append("title").text(`${p.n}: ${f(p.a)} en ${ya}, ${f(p.b)} en ${yb}`); });
  const place=(arr,key)=>{ const s=arr.slice().sort((p,q)=>Y(p[key])-Y(q[key])); let last=-1e9; return s.map(p=>{ const y=Math.max(Y(p[key])+4,last+12); last=y; return [p,y]; }); };
  const lab=P.filter(hl);
  place(lab,"a").forEach(([p,y])=>svg.append("text").attr("class","lab").attr("x",xa-7).attr("y",y).attr("text-anchor","end").style("fill",colr(p)||css("--ink-2")).text(`${p.n} ${f(p.a).replace(/ (%|€)$/,"$1")}`));
  place(lab,"b").forEach(([p,y])=>svg.append("text").attr("class","lab").attr("x",xb+7).attr("y",y).style("fill",colr(p)||css("--ink-2")).text(`${f(p.b).replace(/ (%|€)$/,"$1")} ${p.n}`));
  const top=byD[0], bot=byD[byD.length-1], rk=(arr,key)=>arr.slice().sort((x,y)=>y[key]-x[key]).map(p=>p.c), ra=rk(P,"a"), rb=rk(P,"b");
  const mv=P.map(p=>({...p,m:ra.indexOf(p.c)-rb.indexOf(p.c)})).sort((x,y)=>y.m-x.m)[0];
  add(out,"p",null,`Entre ${ya} y ${yb}, donde más ${top.d>=0?"sube":"baja menos"} es <b>${esc(top.n)}</b> (${f(top.a)} → ${f(top.b)}) y donde más ${bot.d<0?"baja":"sube menos"}, <b>${esc(bot.n)}</b> (${f(bot.a)} → ${f(bot.b)}).${mv&&mv.m>=3?` La que más puestos escala es <b>${esc(mv.n)}</b>: pasa del ${ra.indexOf(mv.c)+1}.º al ${rb.indexOf(mv.c)+1}.º.`:""}`).style.cssText="max-width:var(--medida);margin-top:6px";
}

// ---------- pirámide de población ----------
let PIR=null, PIR_P=null; const loadPir=()=>PIR_P||(PIR_P=getJSON("/data/piramide.json").then(d=>PIR=d).catch(e=>{ PIR_P=null; throw e; }));
const pirGet=z=>!PIR?null:z==="es"?PIR.es:z.startsWith("c")?(PIR.ccaa||{})[z.slice(1)]:z.startsWith("p")?(PIR.prov||{})[z.slice(1)]:null;
const pirGetPast=z=>!PIR||!PIR.pasado?null:z==="es"?PIR.pasado.es:z.startsWith("c")?(PIR.pasado.ccaa||{})[z.slice(1)]:z.startsWith("p")?(PIR.pasado.prov||{})[z.slice(1)]:null;
const pirYear=f=>f?String(f).slice(0,4):"";
// con qué se compara: España, el mismo lugar hace años, otro lugar (hoy o hace años) o nada
function pirCmp(z){
  if(EX.pc==="none") return null;
  if(EX.pc==="past"){ const d=pirGetPast(z); return d?{d,l:`${pirName(z)} en ${pirYear(PIR.pasado.fecha)}`,past:true}:null; }
  if(EX.pc==="other"){ const first=Object.keys(PIR.ccaa||{}).sort((a,b)=>ccName(a).localeCompare(ccName(b),"es"))[0], q=pirGet(EX.pq)&&EX.pq!==z?EX.pq:(z!=="es"?"es":first?"c"+first:"es"); const past=EX.py==="past"&&PIR.pasado; const d=past?pirGetPast(q):pirGet(q); return d?{d,l:`${pirName(q)}${past?" en "+pirYear(PIR.pasado.fecha):""}`,past:!!past}:null; }
  return z!=="es"?{d:PIR.es,l:"España"}:null; }
const pirName=z=>z==="es"?"España":z.startsWith("c")?ccName(z.slice(1)):provShort(PROVS[z.slice(1)]);
async function exPiramide(out){
  out.innerHTML='<p class="loading">Cargando…</p>';
  try{ await Promise.all([loadPir(),loadRegional()]); }catch(e){ out.innerHTML='<p class="loading">Todavía no están los datos de población por edad y sexo. Hay que descargarlos con <code>python3 scripts/datos/piramide.py</code>.</p>'; return; }
  if(EX.v!=="piramide") return; exBar();
  const z=pirGet(EX.pz)?EX.pz:"es", A=pirGet(z), cmp=pirCmp(z);
  const G=PIR.grupos, tot=a=>d3.sum(a.H)+d3.sum(a.M), pct=!!(cmp&&cmp.d)||EX.pp!==0, val=(a,s,i)=>pct?a[s][i]/tot(a)*100:a[s][i];
  out.innerHTML="";
  const fg=fig(out,{title:`Población de ${pirName(z)} por edad y sexo`,sub:`${pct?"% de la población total en cada grupo de edad":"Personas en cada grupo de edad"}${cmp&&cmp.d?`. La línea: ${cmp.l}`:""}`,source:`INE, Estadística Continua de Población, ${PIR.fecha}${cmp&&cmp.d&&cmp.past&&PIR.pasado?` y ${PIR.pasado.fecha}`:""}.`});
  const W=Math.max(320,out.clientWidth||760), rh=Math.max(14,Math.min(22,440/G.length)), H=G.length*rh+40, cx=W/2, lw=46, half=cx-lw/2-8;
  const mx=d3.max([A,cmp&&cmp.d].filter(Boolean).flatMap(a=>G.flatMap((_,i)=>[val(a,"H",i),val(a,"M",i)]))), X=d3.scaleLinear().domain([0,mx]).nice().range([0,half]);
  const svg=d3.select(fg.body).append("svg").attr("viewBox",`0 0 ${W} ${H}`).attr("role","img").attr("aria-label",`Pirámide de población de ${pirName(z)}`);
  svg.append("text").attr("class","lab strong").attr("x",cx-lw/2-4).attr("y",12).attr("text-anchor","end").style("fill",css("--slate")).text("Hombres");
  svg.append("text").attr("class","lab strong").attr("x",cx+lw/2+4).attr("y",12).style("fill",css("--rust")).text("Mujeres");
  const y=i=>24+(G.length-1-i)*rh, fv=v=>pct?nf1.format(v)+NB+"%":nf0.format(v);
  G.forEach((g,i)=>{ const h=val(A,"H",i), m=val(A,"M",i);
    svg.append("rect").attr("x",cx-lw/2-X(h)).attr("y",y(i)).attr("width",X(h)).attr("height",rh-2).attr("fill",css("--slate")).attr("opacity",.8).append("title").text(`Hombres de ${g}: ${fv(h)}`);
    svg.append("rect").attr("x",cx+lw/2).attr("y",y(i)).attr("width",X(m)).attr("height",rh-2).attr("fill",css("--rust")).attr("opacity",.8).append("title").text(`Mujeres de ${g}: ${fv(m)}`);
    svg.append("text").attr("class","lab").attr("x",cx).attr("y",y(i)+rh/2+3).attr("text-anchor","middle").attr("font-size",Math.min(11,rh*0.62)).text(g); });
  if(cmp&&cmp.d){ const B=cmp.d, stp=(s,dir)=>{ let d=""; G.forEach((_,i)=>{ const x=dir<0?cx-lw/2-X(val(B,s,i)):cx+lw/2+X(val(B,s,i)), y0=y(i)+rh-1, y1=y(i)-1; d+=(i?"L":"M")+x+","+y0+"L"+x+","+y1; }); return d; };
    ["H","M"].forEach((s,j)=>svg.append("path").attr("d",stp(s,j?1:-1)).attr("fill","none").attr("stroke",css("--ink")).attr("stroke-width",1.4)); }
  // resumen: menores de 20 y mayores de 65
  const share=(a,from,to)=>{ let s=0; G.forEach((g,i)=>{ const lo=+g.match(/\d+/)[0]; if(lo>=from&&lo<to) s+=a.H[i]+a.M[i]; }); return s/tot(a)*100; };
  const txt=a=>`un ${nf1.format(share(a,0,20))}${NB}% tiene menos de 20 años y un ${nf1.format(share(a,65,999))}${NB}%, 65 o más`;
  add(out,"p",null,`En ${esc(pirName(z))}, ${txt(A)}${cmp&&cmp.d?`; en ${esc(cmp.l)}, ${txt(cmp.d)}`:""}. Hay ${nf0.format(d3.sum(A.M)/d3.sum(A.H)*100)} mujeres por cada 100 hombres.`).style.cssText="max-width:var(--medida);margin-top:6px";
}

// ---------- composición ----------
const COMPF={
  sector:{l:"Ocupados por sector",src:"INE, Censo anual de población, 2023",parts:[["agri","Agricultura"],["industria","Industria"],["construccion","Construcción"],["comercio","Comercio, transporte y hostelería"],["avanzados","Servicios avanzados"],["publico","Administración, educación y sanidad"]],rest:"Otros"},
  afil:{l:"Afiliados por sector",src:"Seguridad Social, afiliados por municipio y actividad",parts:[["afilIndustria","Industria"],["afilConstruccion","Construcción"],["afilComercio","Comercio"],["afilHosteleria","Hostelería"],["afilProfesional","Servicios profesionales"],["afilPublico","Administración, educación y sanidad"]],rest:"Otros"},
  voto:{l:"Voto en las generales de 2023",src:"Ministerio del Interior, generales de julio de 2023 (% de votos)",parts:[["pp","PP"],["psoe","PSOE"],["vox","Vox"],["sumar","Sumar y aliados"]],rest:"Otros"},
  edad:{l:"Población por edad",src:"INE, Atlas de Renta, 2023",parts:[["menores18","Menores de 18"],["_mid","De 18 a 64"],["mayores65","65 y más"]],rest:null}};
const COMPC=["--olive","--slate","--mustard","--rust","--plum","--stone","--ink-2"];
const PARTYCOL={pp:"#1d64b0",psoe:"#d22630",vox:"#5ab031",sumar:"#d4317a"};
function exComposicion(out){
  const F0=COMPF[EX.cf]||COMPF.sector, P=F0.parts.filter(([k])=>k==="_mid"||F[k]!=null), gb=["ccaa","prov","size","q"].includes(EX.gb)?EX.gb:"ccaa";
  const sizeB=[[0,1000,"Menos de 1.000 hab."],[1000,5000,"1.000–5.000 hab."],[5000,20000,"5.000–20.000 hab."],[20000,100000,"20.000–100.000 hab."],[100000,1e12,"Más de 100.000 hab."]];
  let key, order=null;
  if(gb==="ccaa") key=r=>CCAA_OF[r[F.prov]]; else if(gb==="prov") key=r=>provShort(PROVS[r[F.prov]]);
  else if(gb==="size"){ key=r=>{ const b=sizeB.find(s=>r[F.pop]>=s[0]&&r[F.pop]<s[1]); return b?b[2]:null; }; order=sizeB.map(s=>s[2]); }
  else { const s=rowsAll().filter(r=>r[F.renta]!=null&&r[F.pop]).sort((a,b)=>a[F.renta]-b[F.renta]), tot=d3.sum(s,r=>r[F.pop]); let acc=0; const qm=new Map(); s.forEach(r=>{ qm.set(r[F.code],Math.min(4,Math.floor((acc+r[F.pop]/2)/tot*5))); acc+=r[F.pop]; });
    order=["20 % con menos renta","Segundo 20 %","20 % central","Cuarto 20 %","20 % con más renta"]; key=r=>qm.has(r[F.code])?order[qm.get(r[F.code])]:null; }
  const real=P.filter(([k])=>k!=="_mid").map(([k])=>k), rows=exRows().filter(r=>r[F.pop]&&real.every(k=>r[F[k]]!=null));
  const mean=rs=>{ const w=d3.sum(rs,r=>r[F.pop]); const v=real.map(k=>d3.sum(rs,r=>r[F[k]]*r[F.pop])/w); return v; };
  const mk=(n,rs,ref)=>{ const v=mean(rs), parts=P.map(([k])=>k==="_mid"?Math.max(0,100-d3.sum(v)):v[real.indexOf(k)]); return {n,ref,parts,rest:F0.rest?Math.max(0,100-d3.sum(parts)):0}; };
  if(!rows.length){ out.innerHTML='<p class="loading">No hay municipios con estos datos en la selección.</p>'; return; }
  let R=d3.groups(rows.filter(key),key).filter(([,v])=>v.length>=1).map(([n,v])=>mk(n,v,false));
  const si=Math.max(0,Math.min(P.length-1,EX.co||0));
  if(order) R.sort((a,b)=>order.indexOf(a.n)-order.indexOf(b.n)); else R.sort((a,b)=>b.parts[si]-a.parts[si]);
  R=[mk(EX.p?provShort(PROVS[EX.p]):"España",rows,true),...R];
  const colors=P.map(([k],i)=>PARTYCOL[k]||css(COMPC[i%COMPC.length])), names=[...P.map(p=>p[1]),...(F0.rest?[F0.rest]:[])], cols=[...colors,...(F0.rest?["#e4e0d6"]:[])];
  const fg=fig(out,{title:`${F0.l}${gb==="ccaa"?", por comunidades":gb==="prov"?", por provincias":gb==="size"?", según el tamaño del municipio":", según el nivel de renta del municipio"}`,sub:"% del total en cada grupo. Media de sus municipios, ponderada por población",source:`Fuente: ${F0.src}.${gb==="q"?" Grupos con la misma población, de menos a más renta por persona.":""}`});
  const W=Math.max(320,out.clientWidth||760), rh=R.length>25?20:26, Lw=Math.min(170,W*0.3), m={t:8,r:10,l:Lw}, H=m.t+R.length*rh+6, X=d3.scaleLinear().domain([0,100]).range([m.l,W-m.r]);
  const lg=add(fg.body,"div","compleg"); lg.innerHTML=names.map((n,i)=>`<span><i style="background:${cols[i]}"></i>${esc(n)}</span>`).join("");
  const svg=d3.select(fg.body).append("svg").attr("viewBox",`0 0 ${W} ${H}`).attr("role","img").attr("aria-label",F0.l);
  R.forEach((r,i)=>{ const yy=m.t+i*rh; let acc=0; svg.append("text").attr("class","lab"+(r.ref?" strong":"")).attr("x",m.l-8).attr("y",yy+rh/2+2).attr("text-anchor","end").text(r.n);
    [...r.parts,...(F0.rest?[r.rest]:[])].forEach((v,j)=>{ const x0=X(acc), x1=X(acc+v); acc+=v; svg.append("rect").attr("x",x0).attr("y",yy+(r.ref?1:2)).attr("width",Math.max(0,x1-x0-1)).attr("height",rh-(r.ref?2:5)).attr("fill",cols[j]).append("title").text(`${r.n} · ${names[j]}: ${nf1.format(v)}${NB}%`);
      if(x1-x0>24&&j<P.length) svg.append("text").attr("x",x0+4).attr("y",yy+rh/2+2).attr("font-size",11).attr("font-weight",600).attr("fill","#fff").text(nf0.format(v)); }); });
  const hi=R.slice(1).reduce((a,b)=>b.parts[si]>a.parts[si]?b:a), lo=R.slice(1).reduce((a,b)=>b.parts[si]<a.parts[si]?b:a);
  add(out,"p",null,`${esc(P[si][1])}: ${nf1.format(R[0].parts[si])}${NB}% en ${esc(R[0].n)}. Donde más pesa es en <b>${esc(hi.n)}</b> (${nf1.format(hi.parts[si])}${NB}%) y donde menos, en <b>${esc(lo.n)}</b> (${nf1.format(lo.parts[si])}${NB}%).`).style.cssText="max-width:var(--medida);margin-top:6px";
}

// ---------- barras laterales de las vistas nuevas ----------
const typesStep=()=>`<div class="lb-step"><h4><i>1</i>Qué quieres saber</h4>${typesHTML(EX.v)}${hintHTML(EX.v)}</div>`;
function wireTypes(bar){ typesTips(bar); bar.querySelectorAll(".types button").forEach(b=>b.addEventListener("click",()=>{ EX.v=b.dataset.v; viewDefaults(); navTo(exHash()); })); }
function viewDefaults(){
  if(EX.v==="cruce"&&EX.d.length<2) EX.d.push(EX.d[0]==="renta"?"paroReg":"renta");
  if(EX.v==="matriz"){ EX.d=EX.d.filter(k=>CATK[k]&&!isReg(k)&&!isEU(k)); MATDEF.forEach(k=>{ if(EX.d.length<6&&!EX.d.includes(k)&&CATK[k]) EX.d.push(k); }); }
  if(EX.v==="pendientes"&&!(EX.u==="prov"||EX.u==="ccaa")) EX.u="prov";
  if(EX.v==="composicion"&&!["ccaa","prov","size","q"].includes(EX.gb)) EX.gb="ccaa";
}
const muniStep=(n,size=true)=>`<div class="lb-step"><h4><i>${n}</i>Qué municipios</h4>
  <select class="sel" id="exprov" aria-label="Provincia"><option value="">Toda España</option>${Object.keys(PROVS).sort((a,b)=>provShort(PROVS[a]).localeCompare(provShort(PROVS[b]),"es")).map(p=>`<option value="${p}" ${p===EX.p?"selected":""}>${esc(provShort(PROVS[p]))}</option>`).join("")}</select>
  ${size?`<select class="sel" id="exsize" aria-label="Tamaño">${EXSIZES.map(([k,l])=>`<option value="${k}" ${k===EX.t?"selected":""}>${l}</option>`).join("")}</select>`:""}</div>`;
function wireMuni(bar){ const pv=bar.querySelector("#exprov"); if(pv) pv.addEventListener("change",e=>{ EX.p=e.target.value; exUpdate(); }); const sz=bar.querySelector("#exsize"); if(sz) sz.addEventListener("change",e=>{ EX.t=e.target.value; exUpdate(); }); }
const segH=(id,cur,opts)=>`<div class="seg sm lbseg" role="group" id="${id}">${opts.map(([v,l])=>`<button type="button" data-v="${v}" aria-pressed="${String(cur)===String(v)}">${esc(l)}</button>`).join("")}</div>`;
const wireSeg=(bar,id,fn)=>{ const s=bar.querySelector("#"+id); if(s) s.querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>fn(b.dataset.v))); };
const pickSlot=(lab,k,attr)=>`<div class="slot full"><span class="nm" style="flex:1"><small>${lab}</small><button type="button" class="pick" ${attr} aria-haspopup="dialog"><span class="pv">${esc(labK(k))}</span><span class="pg">${esc(pgK(k))}</span></button></span></div>`;
const CBAR={
  pendientes(bar){ const k=EX.d[0], S=SLOPE[k+"|"+(EX.u==="ccaa"?"ccaa":"prov")], ys=S?S.years:[];
    const yo=sel=>ys.map(y=>`<option ${y===sel?"selected":""}>${y}</option>`).join("");
    bar.innerHTML=typesStep()+`<div class="lb-step"><h4><i>2</i>Qué dato</h4>${pickSlot("Dato",k,'id="slk"')}<p class="hint">Datos con serie de años: los del Atlas de Renta (media de los municipios) y los oficiales por provincia o comunidad.</p></div>
      <div class="lb-step"><h4><i>3</i>Cómo verlo</h4><label class="lbl">Comparar</label>${segH("slu",EX.u,[["prov","Provincias"],["ccaa","Comunidades"]])}
      ${ys.length?`<div class="psrange" style="margin-top:10px"><label>Antes <select class="sel" id="sla">${yo(EX.ya)}</select></label><label>Ahora <select class="sel" id="slb">${yo(EX.yb)}</select></label></div>`:""}
      <p class="hint">Elige una provincia arriba («Qué municipios» en otras vistas) para resaltarla; aquí se resaltan las que más suben y las que más bajan.</p></div>`;
    wireTypes(bar);
    const b=bar.querySelector("#slk"); b.addEventListener("click",async()=>{ await loadAllCat(); openPicker(b,{current:k,all:true,jump:false,reg:true,here:x=>BSER.some(s=>s[0]===x)||(isReg(x)&&!isEU(x)),onPick:v=>{ EX.d=[v,...EX.d.filter(x=>x!==v)]; EX.ya=EX.yb=null; if(isReg(v)&&!scaleOK(EX.u,[v])) EX.u=scaleOK("prov",[v])?"prov":"ccaa"; exUpdate(); }}); });
    wireSeg(bar,"slu",v=>{ if(isReg(k)&&!scaleOK(v,[k])){ toast("Ese dato no existe a esa escala.",2600); return; } EX.u=v; exUpdate(); });
    const a=bar.querySelector("#sla"), z=bar.querySelector("#slb"); if(a) a.addEventListener("change",e=>{ EX.ya=+e.target.value; exUpdate(); }); if(z) z.addEventListener("change",e=>{ EX.yb=+e.target.value; exUpdate(); }); },
  piramide(bar){ const opt=(v,l)=>`<option value="${v}" ${v===(EX.pz||"es")?"selected":""}>${esc(l)}</option>`;
    const pyOpts=sel=>{ const o=(v,l)=>`<option value="${v}" ${v===sel?"selected":""}>${esc(l)}</option>`; return o("es","España")+(cc.length?`<optgroup label="Comunidades">${cc.map(c=>o("c"+c,ccName(c))).join("")}</optgroup>`:"")+(pv.length?`<optgroup label="Provincias">${pv.map(p=>o("p"+p,provShort(PROVS[p]))).join("")}</optgroup>`:""); };
    const pyDef=()=>(EX.pz&&EX.pz!=="es")?"es":(cc[0]?"c"+cc[0]:"es");
    const cc=PIR&&PIR.ccaa?Object.keys(PIR.ccaa).sort((a,b)=>ccName(a).localeCompare(ccName(b),"es")):[], pv=PIR&&PIR.prov?Object.keys(PIR.prov).filter(p=>PROVS[p]).sort((a,b)=>provShort(PROVS[a]).localeCompare(provShort(PROVS[b]),"es")):[];
    bar.innerHTML=typesStep()+`<div class="lb-step"><h4><i>2</i>Dónde</h4><select class="sel" id="pyz" aria-label="Dónde">${opt("es","España")}${cc.length?`<optgroup label="Comunidades">${cc.map(c=>opt("c"+c,ccName(c))).join("")}</optgroup>`:""}${pv.length?`<optgroup label="Provincias">${pv.map(p=>opt("p"+p,provShort(PROVS[p]))).join("")}</optgroup>`:""}</select>
      <p class="hint">Por ahora, para España, comunidades y provincias: el INE no publica por API la población por edad de cada municipio.</p></div>
      <div class="lb-step"><h4><i>3</i>Cómo verlo</h4><label class="lbl">Comparar con</label>${segH("pyc",EX.pc||"es",[["es",EX.pz&&EX.pz!=="es"?"España":"Nada"],...(PIR&&PIR.pasado?[["past",`Hace ${+(PIR.fecha||"").slice(0,4)-+(PIR.pasado.fecha||"").slice(0,4)} años`]]:[]),["other","Otro lugar"],["none","Sin comparar"]])}
      ${EX.pc==="other"?`<label class="lbl" style="margin-top:10px" for="pyq">Otro lugar</label><select class="sel" id="pyq" aria-label="Otro lugar">${pyOpts(EX.pq||pyDef())}</select>${PIR&&PIR.pasado?`<label class="lbl" style="margin-top:10px">De cuándo</label>${segH("pyy",EX.py||"",[["","Hoy"],["past",`Hace ${+(PIR.fecha||"").slice(0,4)-+(PIR.pasado.fecha||"").slice(0,4)} años`]])}`:""}`:""}
      ${EX.pc==="none"?`<label class="chk" style="margin-top:8px"><input type="checkbox" id="pyp" ${EX.pp!==0?"checked":""}> En porcentaje del total</label>`:""}</div>`;
    wireTypes(bar);
    const s=bar.querySelector("#pyz"); if(s) s.addEventListener("change",e=>{ EX.pz=e.target.value; exUpdate(); });
    wireSeg(bar,"pyc",v=>{ EX.pc=v; if(v==="other"&&(!EX.pq||EX.pq===EX.pz)) EX.pq=pyDef(); exUpdate(); }); const pq=bar.querySelector("#pyq"); if(pq) pq.addEventListener("change",e=>{ EX.pq=e.target.value; exUpdate(); }); wireSeg(bar,"pyy",v=>{ EX.py=v; exUpdate(); }); const pp=bar.querySelector("#pyp"); if(pp) pp.addEventListener("change",e=>{ EX.pp=e.target.checked?1:0; exUpdate(); }); },
  composicion(bar){ const F0=COMPF[EX.cf]||COMPF.sector;
    bar.innerHTML=typesStep()+`<div class="lb-step"><h4><i>2</i>Qué reparto</h4><select class="sel" id="cof" aria-label="Qué reparto">${Object.entries(COMPF).map(([k,o])=>`<option value="${k}" ${o===F0?"selected":""}>${esc(o.l)}</option>`).join("")}</select>
      <label class="lbl" style="margin-top:10px">Agrupar por</label>${segH("cog",EX.gb,[["ccaa","Comunidad"],["prov","Provincia"],["size","Tamaño"],["q","Nivel de renta"]])}
      ${EX.gb==="size"||EX.gb==="q"?"":`<label class="lbl" style="margin-top:10px" for="coo">Ordenar por</label><select class="sel" id="coo">${F0.parts.map(([k,l],i)=>`<option value="${i}" ${i===(EX.co||0)?"selected":""}>${esc(l)}</option>`).join("")}</select>`}</div>`+muniStep(3);
    wireTypes(bar); wireMuni(bar);
    bar.querySelector("#cof").addEventListener("change",e=>{ EX.cf=e.target.value; EX.co=0; exUpdate(); });
    wireSeg(bar,"cog",v=>{ EX.gb=v; exUpdate(); }); const o=bar.querySelector("#coo"); if(o) o.addEventListener("change",e=>{ EX.co=+e.target.value; exUpdate(); }); }
};
// opciones de las vistas con la barra común (paso «Cómo verlo»)
const VOPT={
  distribucion:{html:()=>{ const k=EX.d[0]; return `<label class="lbl">Contar</label>${segH("vow",EX.w?1:0,[[1,"Personas"],[0,"Municipios"]])}<label class="lbl" style="margin-top:10px">Comparar</label>${segH("vodg",EX.dg||"",[["","Todos juntos"],["ccaa","Por comunidad"],["prov","Por provincia"],["size","Por tamaño"],...(k!=="renta"?[["renta","Por nivel de renta"]]:[])])}`; },
    wire:bar=>{ wireSeg(bar,"vow",v=>{ EX.w=+v; exUpdate(); }); wireSeg(bar,"vodg",v=>{ EX.dg=v; exUpdate(); }); }},
  grupos:{html:()=>`<label class="lbl">Agrupar por</label>${segH("vogb",EX.gb,[["ccaa","Comunidad"],["prov","Provincia"],["size","Tamaño"],["q","Nivel de "+low(labK(EX.d[0]))]])}`, wire:bar=>wireSeg(bar,"vogb",v=>{ EX.gb=v; exUpdate(); })},
  matriz:{html:()=>`<label class="chk"><input type="checkbox" id="vomw" ${EX.w?"checked":""}> Contar según la población</label><p class="hint">Pulsa una casilla para abrir esa pareja en «Relación» y comprobar si aguanta entre iguales.</p>`, wire:bar=>{ const c=bar.querySelector("#vomw"); if(c) c.addEventListener("change",e=>{ EX.w=e.target.checked?1:0; exUpdate(); }); }},
  burbujas:{html:()=>`<p class="hint" style="margin:0">Pulsa «Reproducir» o mueve el año. Pasa el ratón por una burbuja para ver su provincia.</p>`}
};

// =====================================================================
// GLOSARIO: qué mide cada dato, de dónde sale y qué matices tiene
// =====================================================================
// matices escritos a mano para los datos que más se usan (el resto muestra su descripción y su fuente)
const MATICES={
  renta:"Es renta neta, después de impuestos y cotizaciones, y sale de datos tributarios: no recoge la economía sumergida. Es una media, así que unos pocos vecinos muy ricos suben la cifra de un municipio pequeño por encima de lo que cobra el vecino típico (para eso, mira la mediana).",
  rentaHog:"Depende del tamaño del hogar: uno de cuatro personas ingresa más que uno de una, aunque cada persona viva igual. Para comparar lugares, la renta por persona es más justa.",
  rentaMediana:"Es la renta del hogar «típico»: la mitad de los hogares ingresa más y la mitad menos. Resiste mejor que la media a unos pocos ricos.",
  pobreza:"Es pobreza relativa: se mide contra la renta mediana de España, no contra un mínimo fijo. Si un lugar entero es pobre, el dato no lo refleja bien, porque ahí «pobre» es quien está por debajo de la mediana de todo el país.",
  gini:"Mide el reparto dentro del municipio, no su riqueza: un pueblo pobre pero igualitario sale bajo, y uno rico con grandes diferencias sale alto.",
  paro:"Tasa de paro del censo de 2021: parados entre quienes trabajan o buscan trabajo. No es comparable con el paro registrado, que usa otro denominador y otra fecha.",
  paroCensal:"Tasa de paro del censo anual: parados entre quienes trabajan o buscan trabajo. No es lo mismo que el paro registrado.",
  paroReg:"No es una tasa de paro: divide a los apuntados en el SEPE entre toda la población de 16 a 64 años, trabaje o no. Y solo cuenta a quien se ha apuntado.",
  afilHab:"Cuenta los empleos situados en el municipio, no a sus vecinos: un polígono industrial o una ciudad que recibe a trabajadores de fuera puede pasar de 100.",
  alquiler:"Es el porcentaje de hogares que vive de alquiler, según el censo de 2021. No dice cuánto pagan.",
  noPrincipal:"Suma segundas residencias y viviendas vacías: no distingue cuáles son cuáles.",
  vt:"Es estadística experimental del INE: sus cifras pueden revisarse y no deben leerse como un recuento exacto.",
  alqVar:"Sale de un índice de precios de alquiler: mide cómo cambia el conjunto de alquileres, no el precio de un piso concreto ni lo que paga quien firma hoy.",
  distCiudad:"Se mide en línea recta entre centros de términos municipales, no en tiempo de viaje: una montaña o una mala carretera no cuentan.",
  distCosta:"Se mide en línea recta desde el centro del término municipal; vale 0 si el municipio tiene costa.",
  densidad:"Divide entre todo el término municipal, también el monte y el campo: un municipio con un núcleo pequeño y mucho terreno sale con densidad baja aunque se viva muy junto.",
  valorTasado:"Es el valor que estima una tasadora, normalmente para una hipoteca, no el precio al que se vende un piso. Solo existe para municipios de más de 25.000 habitantes.",
  compHab:"Cuenta operaciones registradas ante notario, no precios: un año de muchas ventas no significa que suban los precios.",
  deudaHab:"Es solo la deuda del ayuntamiento: no incluye la de la comunidad autónoma ni la del Estado.",
  irpfBruta:"Solo cuenta a quien presenta declaración, y no incluye el País Vasco ni Navarra, que tienen su propia hacienda.",
  irpfCarga:"Suma la cuota del impuesto y las cotizaciones, en % de la renta bruta. No incluye otros impuestos, como el IVA.",
  contrTemp:"Se cuenta en el municipio del centro de trabajo, no donde vive el trabajador. Con pocos contratos, un solo empleador mueve mucho el porcentaje.",
  contrTemp25:"Se cuenta en el municipio del centro de trabajo. Con pocos contratos, un solo empleador mueve mucho el porcentaje.",
  temporales:"Es el porcentaje sobre asalariados, no sobre todos los ocupados.",
  empleo:"Se mide sobre la población de 16 a 64 años, no sobre toda la población: un municipio con muchos jubilados no sale penalizado por ellos.",
  superiores:"Mide quién tiene la titulación, no si trabaja en algo que la requiere ni dónde la consiguió.",
  salf24:"Partido nuevo que solo concurrió a las europeas de 2024: no hay dato comparable de las generales de 2023.",
  varPob:"Compara dos fotos del padrón: no dice si la gente llegó o se fue, ni cuándo."
};
// cómo se escribe la unidad de cada dato
const GLUNIT={eur:"euros",pct:"%",pct_chg:"% de cambio",pts:"puntos",num1:"número",int:"cifra",years:"años",km:"km",dens:"hab./km²"};
const GLORD=["Riqueza","Trabajo","Vivienda","Población","Hogares","Educación","Sectores","Voto","Territorio","Ayuntamiento","Provincias y comunidades"];
const GLSTART=["renta","paroReg","alquiler","pop","gini","pobreza","valorTasado","afilHab"];
const GLTEMA={Riqueza:"Dinero y desigualdad",Trabajo:"Empleo y paro",Vivienda:"Vivienda",Población:"Población",Hogares:"Hogares",Educación:"Estudios",Sectores:"A qué se dedica la gente",Voto:"Voto",Territorio:"Territorio",Ayuntamiento:"Ayuntamiento","Provincias y comunidades":"Solo por provincia o comunidad"};
// una frase corta para la lista: la descripción escrita, o lo que va entre paréntesis en la fuente, o la propia fuente
const glPrev=i=>{ const t=i.desc||((i.src.match(/\(([^)]{12,})\)/)||[])[1])||i.src; const f=t.split(/(?<=[.!?])\s/)[0]; return f.length>150?f.slice(0,147).replace(/\s\S*$/,"")+"…":f; };
async function renderGlosario(){
  document.title="Qué significa cada dato · Indicio";
  view.innerHTML=LABNAV("datos")+pageHead("Qué significa cada dato","Aquí tienes cada dato del laboratorio explicado en sencillo: qué mide, de dónde sale y qué conviene tener en cuenta antes de sacar conclusiones.")
    +`<div class="gl"><div class="gl-bar"><input type="search" id="glq" class="sel" placeholder="¿Qué dato buscas? Por ejemplo: renta, paro, alquiler…" aria-label="Buscar un dato" autocomplete="off"><div class="chipsq" id="glg" role="group" aria-label="Filtrar por tema"></div></div><p class="muted gl-c" id="glc" aria-live="polite"></p><div id="gll"><p class="loading">Cargando…</p></div></div>`;
  try{ await loadRegional(); }catch(e){}
  const box=document.getElementById("gll"); if(!box) return;
  const items=CAT.filter(c=>c&&c.l&&!c.eu&&!c.custom&&c.g&&!/^E_/.test(c.k)).map(c=>{
    const reg=!!c.reg, g=reg?"Provincias y comunidades":c.g, unit=reg?"":(GLUNIT[c.f]||"");
    const scales=reg?[c.np>=40?"provincias":"",c.nc>=10?"comunidades":""].filter(Boolean):[];
    const link=reg?exHash({v:"mapa",d:[c.k],u:c.np>=40?"prov":"ccaa",c:[],p:"",t:""}):exHash({v:"mapa",d:[c.k],u:"",c:[],p:"",t:""});
    const o={k:c.k,l:c.l,g,unit,desc:QUEMIDE[c.k]||"",matiz:MATICES[c.k]||"",src:c.src||"",scales,link,rel:reg?"":exHash({v:"cruce",d:[c.k,c.k==="renta"?"paroReg":"renta"],c:[],p:"",t:""})};
    o.text=norm([c.l,g,GLTEMA[g]||"",c.src,o.desc].join(" ")); o.prev=glPrev(o); return o; });
  const seen=new Set(); const all=items.filter(i=>!seen.has(i.k)&&seen.add(i.k)).sort((a,b)=>{ const ga=GLORD.indexOf(a.g), gb=GLORD.indexOf(b.g); return (ga<0?99:ga)-(gb<0?99:gb)||a.l.localeCompare(b.l,"es"); });
  const gs=[...new Set(all.map(i=>i.g))].sort((a,b)=>{ const ga=GLORD.indexOf(a), gb=GLORD.indexOf(b); return (ga<0?99:ga)-(gb<0?99:gb); });
  let G="";
  const card=i=>`<details class="gl-i" id="d-${esc(i.k)}"><summary><span class="gl-n">${esc(i.l)}</span><span class="gl-p">${esc(i.prev)}</span></summary><div class="gl-b">`
    +(i.desc?`<p><b>Qué mide</b><br>${esc(i.desc)}</p>`:"")
    +(i.matiz?`<p class="gl-o"><b>Ojo con esto</b><br>${esc(i.matiz)}</p>`:"")
    +(i.src?`<p><b>De dónde sale</b><br>${esc(i.src)}</p>`:"")
    +`<p class="muted"><b>${i.scales.length?"Dónde hay datos":"Dónde hay datos"}</b><br>${i.scales.length?"Solo por "+i.scales.join(" y ")+" (dato oficial de cada una, no de cada municipio).":"Para cada municipio."}${i.unit&&i.unit!=="cifra"?` Se mide en ${esc(i.unit)}.`:""}</p>`
    +`<p class="gl-a"><a class="gl-btn" href="${i.link}">Verlo en el mapa</a>${i.rel?`<a class="gl-btn" href="${i.rel}">Cruzarlo con otro dato</a>`:""}</p></div></details>`;
  const draw=()=>{ const q=norm(document.getElementById("glq").value.trim()), g=G;
    const rows=all.filter(i=>(!g||i.g===g)&&(!q||q.split(/\s+/).every(w=>i.text.includes(w))));
    document.getElementById("glc").textContent=q||g?`${nf0.format(rows.length)} dato${rows.length===1?"":"s"} que coinciden`:`${nf0.format(rows.length)} datos, agrupados por tema. Pulsa en cualquiera para ver el detalle.`;
    let h="";
    if(!q&&!g){ const st=GLSTART.map(k=>all.find(i=>i.k===k)).filter(Boolean); if(st.length) h+=`<section class="gl-g gl-s"><h2>Para empezar</h2><p class="muted gl-sd">Los que más se usan, por si no sabes por dónde entrar.</p>${st.map(card).join("")}</section>`; }
    h+=rows.length?gs.filter(x=>rows.some(i=>i.g===x)).map(x=>`<section class="gl-g"><h2>${esc(GLTEMA[x]||x)}</h2>${rows.filter(i=>i.g===x).map(card).join("")}</section>`).join(""):'<p class="loading">Ningún dato coincide. Prueba con otra palabra, por ejemplo «renta» o «paro».</p>';
    box.innerHTML=h;
    if(location.hash.startsWith("#d-")){ const t=document.getElementById(decodeURIComponent(location.hash.slice(1))); if(t&&t.tagName==="DETAILS"){ t.open=true; if(!draw._s){ draw._s=1; setTimeout(()=>t.scrollIntoView({block:"start"}),60); } } } };
  const chips=document.getElementById("glg");
  chips.innerHTML=`<button type="button" data-g="" aria-pressed="true">Todos</button>`+gs.map(x=>`<button type="button" data-g="${esc(x)}" aria-pressed="false">${esc(GLTEMA[x]||x)}</button>`).join("");
  chips.querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{ G=b.dataset.g; chips.querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",String(x===b))); draw(); }));
  document.getElementById("glq").addEventListener("input",draw);
  draw();
}
// =====================================================================
// ESTUDIOS: preguntas causales, contadas paso a paso
// =====================================================================
const STUDIES=(window.__INDICIO&&window.__INDICIO.studies||[]).map(x=>({...x}));
const STUDIES_HIDDEN=(window.__INDICIO&&window.__INDICIO.hidden||[]).map(x=>({...x}));
const QUICKQ=(window.__INDICIO&&window.__INDICIO.quick||[]);
const EVID=(window.__INDICIO&&window.__INDICIO.evidence)||{};
// etiqueta de nivel de evidencia (enlaza a la explicación del método)
const evTag=ev=>ev&&EVID[ev]?` <a class="ev ev-${ev}" href="/laboratorio/metodo/#evidencia" title="${esc(EVID[ev].d)}">${esc(EVID[ev].l)}</a>`:"";
const evSpan=ev=>ev&&EVID[ev]?` <span class="ev ev-${ev}" title="${esc(EVID[ev].d)}">${esc(EVID[ev].l)}</span>`:"";
const CATP=["08","17","25","43"];
// fuentes que usa cada estudio (para el pie de página)
const STUDY_SRC={"tope-cataluna":["ipva","compr","padron","atlas","tensionadas"],"pisos-turisticos":["vt","ipva","atlas","padron"],"pensiones":["eurostat"],"convergencia":["atlas","padron"],"pandemia-turismo":["sepe","vt","atlas","padron","erte"],"crecer":["padron","atlas","censo","sepe","vt","geo","mig"],"votar-pueblos":["interior","atlas","padron"],
  "quien-gobierna":["interior","padron","sepe","atlas","deuda"],"ave":["ave","padron","atlas","sepe","geo"],"prohibir-pisos-turisticos":["vut","vt","padron"],"vivienda-protegida":["mivau","padron"],"reforma-laboral":["contratos","afil"],"smi-empleo-hogar":["afil","atlas"],"precio-alimentos":["ipcAlim","ees","hicp"],"sueldos":["ees","epaSal","ecvRenta","ipcAlim"],"gobiernos":["eurostatPaises"],"vivienda":["ipv","ipva","mivauViv","ecvTen","eurostatViv","ees"]};
const METODO=`<section class="finding"><h2>1. Compararse con quien se parece</h2><div class="txt"><p>Si comparas municipios grandes con pueblos, cualquier diferencia puede deberse al tamaño. Por eso se «descuentan» factores como el tamaño, la edad o la renta: es comparar entre iguales. En el <a href="/laboratorio/cruce/">gráfico de relación del laboratorio</a>, pulsa las etiquetas «A igual edad», «A igual renta»… y mira cómo se mueven los puntos y cuánto queda de la relación.</p></div></section>
<section class="finding"><h2>1b. Buscar gemelos</h2><div class="txt"><p>Una forma aún más intuitiva de comparar entre iguales: buscar parejas de pueblos de la misma provincia casi idénticos en tamaño, edad y renta, que solo se diferencian en lo que te interesa. Si en la mayoría de parejas el que tiene más de una cosa tiene también más de la otra, la pista gana fuerza. El laboratorio lo hace solo en cada relación, y te enseña algunas parejas.</p></div></section>
<section class="finding"><h2>2. Comparar dentro de cada zona</h2><div class="txt"><p>Muchas cosas son comunes a una provincia o una comunidad: el clima, las leyes autonómicas, la historia. Comparar solo municipios de la misma provincia las quita de en medio. Es la etiqueta «Dentro de cada provincia».</p></div></section>
<section class="finding"><h2>3. Mirar los cambios, no solo los niveles</h2><div class="txt"><p>Lo que es fijo en cada lugar desaparece al comparar cuánto ha cambiado cada uno. Si donde más subió una cosa más subió la otra, la relación es más creíble que si solo coinciden los niveles. La etiqueta «Mirar los cambios» te lleva a ese gráfico cuando hay datos.</p></div></section>
<section class="finding"><h2>4. Buscar un antes y un después</h2><div class="txt"><p>Cuando una ley o un suceso afecta a unos lugares y a otros no, se compara cómo cambian los afectados con cómo cambian los demás. Si antes iban parejos y después se separan, esa separación es la mejor pista de un efecto. Se llama <b>diferencias en diferencias</b>; el estudio del <a href="/preguntas/tope-cataluna/">tope del alquiler en Cataluña</a> es un ejemplo. Los estudios de la <a href="/preguntas/ave/">alta velocidad</a>, los <a href="/preguntas/prohibir-pisos-turisticos/">pisos turísticos</a> y la <a href="/preguntas/pandemia-turismo/">pandemia</a> siguen el mismo método: buscan gemelos, miden la diferencia año a año y la comparan con grupos elegidos al azar.</p></div></section>
<section class="finding"><h2>5. Pensar en la causa al revés</h2><div class="txt"><p>¿Los pisos turísticos suben el alquiler, o los pisos turísticos van a donde el alquiler ya era caro? Con datos de un solo momento no se puede saber. Ayuda preguntarse qué pasó antes.</p></div></section>
<section class="finding"><h2>6. Desconfiar de uno mismo</h2><div class="txt"><p>Siempre puede quedar un factor que no hemos medido. Un buen análisis dice lo que no puede descartar. Y son datos de municipios: no dicen nada de cómo se comporta cada persona.</p>
<p>Para aprender más: <i>The Effect</i>, de Nick Huntington-Klein, y <i>Causal Inference: The Mixtape</i>, de Scott Cunningham. Los dos se pueden leer gratis en internet.</p></div></section>
<section class="finding" id="calculo"><h2>7. Qué cálculo hay detrás de cada etiqueta</h2><div class="txt">
<p>Para que cualquiera pueda rehacer las cuentas, esto es exactamente lo que hace cada etiqueta de los estudios y del laboratorio:</p>
<ul class="defs">
<li><b>«Relación (r)».</b> Coeficiente de correlación de Pearson entre los municipios. Cuando se dice «ponderado por población», cada municipio pesa lo que sus habitantes; si no, cada municipio cuenta igual. Las dos cosas se indican en la ficha técnica de cada estudio, y pueden dar resultados distintos: la ponderada responde a «qué pasa a la gente», la otra a «qué pasa a los pueblos».</li>
<li><b>«A igual edad», «a igual renta», «entre iguales».</b> Correlación parcial: se ajusta una regresión lineal (mínimos cuadrados, con constante) de cada una de las dos variables sobre los controles, y se correlacionan los residuos. Es lo mismo que el coeficiente de un modelo lineal con todos los controles a la vez, expresado en escala de correlación. El tamaño del municipio entra siempre en logaritmo.</li>
<li><b>«Dentro de cada provincia».</b> Antes de todo lo anterior, a cada variable (y a cada control) se le resta la media de su provincia (efectos fijos de provincia). Así solo se comparan municipios entre sí dentro de la misma provincia.</li>
<li><b>«Explica».</b> Es r², la parte de la varianza de una variable que va asociada a la otra. No es una parte «causada».</li>
<li><b>«Municipios gemelos».</b> Para cada municipio de 1.000 habitantes o más se busca, en su misma provincia, el más parecido en tamaño (logaritmo), edad media y renta (distancia euclídea sobre variables estandarizadas, umbral 0,6 desviaciones) que a la vez se diferencie en la variable de interés en al menos media desviación típica. Cada municipio entra como mucho en una pareja.</li>
<li><b>Intervalos [a; b].</b> Intervalo del 95 % por remuestreo (bootstrap) de municipios: se recalcula la estadística 200 veces con muestras al azar con reemplazo y se toman los percentiles 2,5 y 97,5. En las correlaciones parciales se remuestrean los pares de residuos ya ajustados (con miles de municipios, la incertidumbre de estimar los controles es despreciable); en los diseños con parejas o gemelos se remuestrean las parejas. Si el intervalo incluye el cero, los datos no distinguen la relación de ninguna relación.</li>
<li><b>Diferencias en diferencias.</b> (Cambio del grupo afectado después − antes) − (cambio del grupo de comparación después − antes). Como hay pocos grupos y un solo periodo «después», en vez de un error estándar se usan <b>placebos</b>: se repite el cálculo como si la medida hubiera caído en cada uno de los otros grupos (otras comunidades, otras provincias) y se mira dónde queda el efecto real en esa distribución.</li>
<li><b>Discontinuidad.</b> En las elecciones ajustadas se comparan municipios donde una lista ganó por poco con municipios donde perdió por poco, con rectas distintas a cada lado del empate ajustadas dentro de una ventana de ±10 puntos.</li>
<li><b>Estudio de eventos.</b> Una diferencia en diferencias año a año: para cada afectado se busca un gemelo no afectado (mismo tamaño, nivel y tendencia en los años previos) y se sigue la diferencia entre los dos, en índice con el año anterior a la medida = 100. Los años previos sirven de prueba de tendencias paralelas: deberían estar cerca de cero.</li>
<li><b>Control sintético.</b> Cuando el afectado es uno (una ciudad, una comunidad), se construye un «gemelo a medida»: una media ponderada de lugares no afectados, con pesos elegidos para reproducir su trayectoria antes de la medida. La inferencia se hace repitiendo el método con cada donante como si fuera el tratado y viendo si la ruptura real es excepcional entre esos placebos.</li>
<li><b>Efecto en unidades.</b> Además de la correlación, los estudios y el laboratorio dan la pendiente: cuánto cambia una variable por cada unidad (o cada desviación típica) de la otra, a igualdad de controles. La correlación dice si dos cosas van juntas; la pendiente, cuánto.</li>
</ul>
<p>Todo el código está en <a href="https://github.com/bburriel/indicio.es" target="_blank" rel="noopener">github.com/bburriel/indicio.es</a>; los cálculos se hacen en el navegador, con los mismos datos que descargas desde el laboratorio.</p></div></section>
<section class="finding" id="evidencia"><h2>8. Tres niveles de evidencia</h2><div class="txt">
<p>No todos los análisis permiten la misma conclusión. Cada pregunta lleva una etiqueta con el tipo de diseño que usa:</p>
<ul class="defs">
<li><span class="ev ev-desc">Descriptivo</span> Cuenta qué pasa y dónde: cuánto ha subido algo, quién está arriba y quién abajo, cómo se reparte. No dice por qué.</li>
<li><span class="ev ev-igual">Comparación entre iguales</span> Compara municipios parecidos en lo que se ha medido (tamaño, edad, renta, provincia). Sirve para <b>descartar</b> explicaciones: si al comparar entre iguales la relación desaparece, era otra cosa. No sirve para <b>confirmar</b> una causa, porque siempre puede quedar algo sin medir, y no dice si la causa va al revés. Es lo que hace la etiqueta «¿Aguanta la relación?» del laboratorio.</li>
<li><span class="ev ev-natural">Experimento natural</span> Aprovecha algo que cambió en unos sitios y no en otros, en una fecha concreta (una ley, una estación de tren, una pandemia), o una elección decidida por un puñado de votos. No necesita haber medido todo: necesita un supuesto concreto (que sin el cambio los dos grupos habrían seguido igual, o que ganar por poco es cuestión de suerte), que se puede comprobar en parte mirando el «antes». Es lo más cerca de una causa que permiten los datos públicos, y aun así cada estudio dice qué puede fallar.</li>
</ul>
<p>Tres preguntas distintas, que conviene no mezclar: <b>¿es ruido?</b> (lo contestan los intervalos y los placebos), <b>¿es otra cosa que va junta?</b> (lo contestan los controles y los gemelos) y <b>¿va al revés?</b> (lo contesta el orden en el tiempo). Solo un experimento natural ataca las tres a la vez.</p></div></section>
<section class="finding" id="controles"><h2>9. Controles que estropean la comparación</h2><div class="txt">
<p>Descontar más cosas no siempre es mejor. Hay dos tipos de control que confunden en vez de aclarar, y el laboratorio avisa cuando marcas uno:</p>
<ul class="defs">
<li><b>Lo que está en medio del camino</b> (un mediador). Si los estudios suben la renta en parte porque reducen el paro, comparar «a igual paro» quita justo esa parte del efecto, y la relación encoge aunque sea real.</li>
<li><b>Lo que es consecuencia</b> de lo que quieres explicar. Un pueblo que gana vecinos jóvenes se vuelve más joven y más grande; descontar la edad o el tamaño de hoy para explicar el crecimiento borra parte de lo que buscas. Por eso en los estudios los controles se miden antes del periodo.</li>
<li><b>Lo que es casi lo mismo</b> que una de las dos variables. Descontar la renta para explicar la pobreza deja muy poco que explicar.</li>
</ul>
<p>La regla práctica: controla por lo que pudo influir en las dos cosas y ocurrió antes; no por lo que vino después.</p></div></section>`;
function renderEstudios(id){
  if(id==="tope-compraventas"){ id="tope-cataluna"; history.replaceState(null,"","/preguntas/tope-cataluna/"); } // se fusionó con el análisis del tope
  if(id==="renta-fuentes"){ id="convergencia"; history.replaceState(null,"","/preguntas/convergencia/"); } // se fusionó con el de convergencia
  if(id==="cerca-ciudad"){ id="crecer"; history.replaceState(null,"","/preguntas/crecer/"); } // se fusionó con el de qué hace crecer a un pueblo
  if(id==="deuda-quien-gobierna"){ id="quien-gobierna"; history.replaceState(null,"","/preguntas/quien-gobierna/"); } // se fusionó con el de quién gobierna
  if(id==="iva-alimentos"){ id="precio-alimentos"; history.replaceState(null,"","/preguntas/precio-alimentos/"); } // se fusionó con el de la cesta de la compra
  const S=STUDIES.find(s=>s.id===id)||STUDIES_HIDDEN.find(s=>s.id===id);
  if(id==="metodo"){ document.title="De la relación a la causa · Indicio"; view.innerHTML=LABNAV("metodo")+pageHead("De la relación a la causa","Una guía corta para pasar de «estas dos cosas van juntas» a «esto podría estar causando aquello», y saber cuándo no se puede.")+METODO+methodNote(); if(/^#[\w-]+$/.test(location.hash)){ const t=document.querySelector(location.hash); if(t) setTimeout(()=>t.scrollIntoView({block:"start"}),60); } return; }
  if(!S){ renderPreguntas(); return; }
  document.title=S.t+" · Indicio";
  view.innerHTML=studyHead(S)+`<div class="sx"><div id="shtoc"></div><div id="sbody"></div></div><p class="q-next"><a class="ed-go" href="/laboratorio/">Ponlo a prueba en el laboratorio →</a> <a class="ed-go" href="/preguntas/">Más preguntas →</a></p>${methodNote(STUDY_SRC[S.id])}`;
  studyCover(S);
  const fn=({"tope-cataluna":studyTope,"pisos-turisticos":studyVT,"pensiones":studyPens,"convergencia":studyConv,"pandemia-turismo":studyCovid,"crecer":studyGrow,"votar-pueblos":studyVotar,
    "quien-gobierna":studyGobierna,"ave":studyAve,"prohibir-pisos-turisticos":studyVutBan,"vivienda-protegida":studyVPO,"reforma-laboral":studyReforma,"smi-empleo-hogar":studyHogar,"precio-alimentos":studyAlimentos,"sueldos":studySueldos,"vivienda":studyVivienda,"gobiernos":studyGobiernos})[S.id]||(MDB[S.id]!=null?(B=>mdRender(B,S.id,{},{})):null);
  const B=document.getElementById("sbody");
  // los estudios que usan series por municipio (data/estudios.json) las cargan antes de pintar
  const needSeries=["tope-cataluna","pisos-turisticos","crecer","convergencia","pandemia-turismo","votar-pueblos","quien-gobierna","ave","prohibir-pisos-turisticos","precio-alimentos"].includes(S.id);
  const run=()=>Promise.resolve(fn(B)).catch(e=>{ console.error(e); B.insertAdjacentHTML("beforeend",'<p class="loading">No se pudo calcular una parte de este estudio.</p>'); }).then(studyToc);
  if(needSeries){ B.innerHTML='<p class="loading">Cargando los datos del estudio…</p>'; loadSeries().then(()=>{ B.innerHTML=""; return run(); }).catch(e=>{ console.error(e); B.innerHTML='<p class="loading">No se pudieron cargar los datos del estudio.</p>'; }); }
  else run();
}

// ---------- gráficos de cabecera de cada análisis (noviembre de 2026) ----------
// Los de la cesta, los contratos, el tope y la vivienda son los de la portada (ptCharts, con portada.json); el resto salen de
// data/covers.json, que genera scripts/ilustraciones/portadas.mjs con las mismas clases pt-g-* (valen en modo oscuro).
let COV_P=null; const loadCovers=()=>COV_P||(COV_P=Promise.all([getJSON("/data/covers.json").catch(()=>null),loadPortada()]).then(([c,D])=>({C:(c&&c.covers)||{},D})));
const splitA=t=>{ const f=String(t||"").trim().split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ¿¡0-9])/); return {v:f[0]||"",r:f.slice(1).join(" ")}; };
function coverOf(id,{C,D}){
  const hq=HEROQ.find(h=>h.id===id);
  if(hq&&(hq.chart==="tope"||(D&&D[hq.chart]))){ try{ return {svg:ptCharts[hq.chart](D),cap:hq.cap(ptNums(D))}; }catch(e){ console.error(e); } }
  const c=C[id]; return c?{svg:c.svg,cap:c.cap}:null; }
function studyHead(S){ const {v}=splitA(S.a);
  return `<nav class="crumbs"><a href="/preguntas/">Análisis</a> › <a href="/preguntas/?tema=${S.tema}">${esc(TOPICL(S.tema))}</a></nav>`
    +`<header class="sh"><div class="sh-t"><div class="kk2">${esc(TOPICL(S.tema))}</div><h1 class="sh-q">${esc(S.t)}</h1>${v?`<p class="sh-v">${esc(v)}</p>`:""}<p class="sh-d">${esc(S.d)}</p><p class="byline">${byline(S)}</p></div>`
    +`<figure class="sh-f" id="shf"><div class="sh-ph"></div></figure></header>`; }
function studyCover(S){ loadCovers().then(cv=>{ const f=document.getElementById("shf"); if(!f||!document.body.contains(f)) return; const c=coverOf(S.id,cv);
  if(c) f.innerHTML=c.svg+`<figcaption class="pt-cap">${esc(c.cap)}</figcaption>`; else { f.parentNode.classList.add("nofig"); f.remove(); } }); }
// «En este análisis»: las secciones y, bajo los resultados, la conclusión de cada uno; así se ve el hilo antes de leerlo
function studyToc(){ const B=document.getElementById("sbody"), T=document.getElementById("shtoc"); if(!B||!T||T.firstChild) return;
  const items=[]; let n=0;
  [...B.children].forEach(c=>{ if(c.tagName!=="SECTION") return;
    if(c.classList.contains("psec")){ const h=c.querySelector("h2"); if(!h) return; c.id="s"+(++n); items.push({id:c.id,t:h.textContent,sub:[]}); }
    else if(c.classList.contains("pres")&&items.length){ const h=c.querySelector("h3"); if(!h) return; c.id="s"+(++n); items[items.length-1].sub.push({id:c.id,t:h.textContent}); } });
  if(items.length<3) return;
  T.innerHTML=`<nav class="sh-toc" aria-label="En este análisis"><b>En este análisis</b><ol>${items.map(i=>`<li><a href="#${i.id}">${esc(i.t)}</a>${i.sub.length?`<ul>${i.sub.map(x=>`<li><a href="#${x.id}">${esc(x.t)}</a></li>`).join("")}</ul>`:""}</li>`).join("")}</ol></nav>`;
  T.querySelectorAll("a").forEach(a=>a.addEventListener("click",e=>{ e.preventDefault(); const t=document.getElementById(a.getAttribute("href").slice(1)); if(t) t.scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start"}); }));
  // índice lateral: marca dónde estás y se actualiza al hacer scroll
  const secs=[...T.querySelectorAll("a")].map(a=>({a,li:a.closest("li"),el:document.getElementById(a.getAttribute("href").slice(1))})).filter(o=>o.el);
  let tick=false;
  const upd=()=>{ tick=false; if(!document.body.contains(T)){ removeEventListener("scroll",onS); removeEventListener("resize",onS); return; }
    const y=innerHeight*0.28; let cur=null; secs.forEach(o=>{ if(o.el.getBoundingClientRect().top<=y) cur=o; }); if(!cur) cur=null;
    const top=cur&&(cur.li.parentElement.tagName==="UL"?cur.li.parentElement.closest("li"):cur.li);
    T.querySelectorAll("li.on,a.on").forEach(x=>x.classList.remove("on"));
    if(cur){ cur.a.classList.add("on"); if(top) top.classList.add("on"); } };
  const onS=()=>{ if(!tick){ tick=true; requestAnimationFrame(upd); } };
  addEventListener("scroll",onS,{passive:true}); addEventListener("resize",onS); upd(); }

// helpers de series para los estudios
const SY=k=>SER[k]; // años de cada serie
// crecimiento anual medio ponderado por población de una serie índice, por año: devuelve {years:[...], g:[...]} (g en %)
function groupGrowth(codes,key,years,{from=null}={}){
  const rows=codes.map(c=>SBY.get(c)).filter(r=>r&&r[SF[key]]);
  const g=years.map((y,i)=>{ if(i===0||(from&&y<=from)) return null; let s=0,w=0; rows.forEach(r=>{ const a=r[SF[key]][i-1], b=r[SF[key]][i], p=BYCODE.get(r[0])&&BYCODE.get(r[0])[F.pop]; if(a&&b&&p){ s+=p*(b/a-1)*100; w+=p; } }); return w?s/w:null; });
  return {years,g,n:rows.length};
}
const chain=(g,base)=>{ const out=[]; let v=100; g.forEach((x,i)=>{ if(i>0&&x!=null) v*=1+x/100; out.push(x==null&&i>0?null:v); }); if(base!=null){ const b=out[base]; return out.map(v=>v==null?null:v/b*100); } return out; };
const mean=a=>{ const b=a.filter(v=>v!=null); return b.length?d3.sum(b)/b.length:null; };
// gráfico de placebos: barras ordenadas, la real en granate
function placeboBars(parent,vals,real,{label="",fmt=v=>pts(v)}={}){
  const all=vals.map(v=>({v:v.v,n:v.n,me:false})).concat([{v:real,n:label,me:true}]).sort((a,b)=>a.v-b.v);
  const lo=Math.min(0,d3.min(all,a=>a.v)), hi=Math.max(0,d3.max(all,a=>a.v)), H=70;
  const box=add(parent,"div","placebo"); box.setAttribute("role","img"); box.setAttribute("aria-label","Distribución de placebos");
  all.forEach(a=>{ const i=add(box,"i",a.me?"me":null); i.style.height=Math.max(3,(a.v-lo)/(hi-lo||1)*H+3)+"px"; i.title=`${a.n}: ${fmt(a.v)}`; i.setAttribute("aria-label",`${a.n}: ${fmt(a.v)}`); });
  add(parent,"p","muted",`De ${fmt(lo)} (izquierda) a ${fmt(hi)} (derecha); pasa el ratón para ver cada grupo.`).style.cssText="font-size:12.5px;margin-top:4px";
}

async function studyTope(B){
  const AB=abstract(B);
  const VIVD=await getJSON("/data/vivienda.json").catch(()=>null);
  const TENS=new Set(EXT.tensionadas.codes), AMPL=new Set(EXT.tensionadas.ampliacion.codes);
  const Y=SY("ipvaYears"), i21=Y.indexOf(2021), i23=Y.indexOf(2023), i24=Y.indexOf(2024);
  const ok=r=>r[SF.ipva]&&r[SF.ipva][i21]&&r[SF.ipva][i23]&&r[SF.ipva][i24]&&BYCODE.get(r[0])&&BYCODE.get(r[0])[F.pop]>=10000;
  const all=SER.rows.filter(ok), isCat=r=>CATP.includes(r[1]);
  const tens=all.filter(r=>TENS.has(r[0])), rcat=all.filter(r=>isCat(r)&&!TENS.has(r[0])), rest=all.filter(r=>!isCat(r));
  const popOf=r=>BYCODE.get(r[0])[F.pop], catPop=d3.sum(rowsAll().filter(r=>CATP.includes(r[F.prov])),r=>r[F.pop]), tensPop=d3.sum([...TENS],c=>BYCODE.get(c)?BYCODE.get(c)[F.pop]:0);
  // (1) DiD de grupos: subida anual ponderada; antes = media de 2022 y 2023; después = 2024
  const gr=(rows,i)=>{ let s=0,w=0; rows.forEach(r=>{ const p=popOf(r); s+=p*(r[SF.ipva][i]/r[SF.ipva][i-1]-1)*100; w+=p; }); return w?s/w:null; };
  const pre=rows=>(gr(rows,i23-1)+gr(rows,i23))/2, post=rows=>gr(rows,i24);
  const did=(a,b)=>(post(a)-pre(a))-(post(b)-pre(b));
  const d1=did(tens,rcat), d2=did(tens,rest), ci1=bootCI(tens.map(t=>({t})),s=>did(s.map(o=>o.t),rcat),{B:300});
  // (2) estudio de eventos con gemelos fuera de Cataluña (tamaño, nivel y tendencia previa del alquiler)
  const pool=rest.map(r=>r[0]);
  const pairs=adMatch(tens.map(r=>({code:r[0],t0:2024})),pool,"ipva",false), ES=esCompute(pairs);
  // (3) control sintético del conjunto de municipios tensionados (índice ponderado, 2023 = 100)
  const full=r=>Y.every((y,i)=>r[SF.ipva][i]>0), base=r=>r[SF.ipva][i23];
  const tFull=tens.filter(full), W=d3.sum(tFull,popOf);
  const y1=Y.map((y,i)=>d3.sum(tFull,r=>popOf(r)*r[SF.ipva][i]/base(r)*100)/W);
  const donors=rest.filter(full).map(r=>({code:r[0],y:Y.map((y,i)=>r[SF.ipva][i]/base(r)*100)}));
  const preI=d3.range(0,i24), SC=synthControl(y1,donors,preI,{D:60,P:40});
  // (4) contratos nuevos por provincia, Cataluña frente al resto, con placebos por comunidad
  const ia=REFS.ipvaAntig, padW=p=>{ const a=REFS.prov[p]&&REFS.prov[p].pad; return a?a[a.length-1]:0; };
  const PV=Object.keys(ia.prov).filter(p=>ia.prov[p].n&&!["51","52"].includes(p));
  const wavg=(ps,k,i)=>d3.sum(ps,p=>ia.prov[p][k][i]*padW(p))/d3.sum(ps,p=>padW(p));
  const yrs=[2021,2022,2023,2024], idx=yrs.map(y=>ia.years.indexOf(y)), serie=ps=>idx.map(i=>wavg(ps,"n",i)), g=(a,i,j)=>(a[j]/a[i]-1)*100;
  const didProv=ps=>{ const o=PV.filter(p=>!ps.includes(p)), c=serie(ps), r=serie(o); return (g(c,2,3)-g(c,0,2)/2)-(g(r,2,3)-g(r,0,2)/2); };
  const cat=serie(CATP), oth=serie(PV.filter(p=>!CATP.includes(p)));
  const preC=g(cat,0,2)/2, preO=g(oth,0,2)/2, postC=g(cat,2,3), postO=g(oth,2,3), didN=didProv(CATP);
  const CC=d3.groups(PV,p=>CCAA_OF[p]).filter(([c])=>c!=="Cataluña"), plac=CC.map(([c,ps])=>({n:c,v:didProv(ps)})), pr=placeboRank(didN,plac.map(p=>p.v));
  const ests=[["Diferencias en diferencias frente al resto de Cataluña",d1,ci1],["Estudio de eventos con gemelos del resto de España (efecto en 2024, puntos de índice)",ES.post,ES.postCI],["Control sintético (diferencia en 2024, puntos de índice)",SC?SC.postGap:null,null],["Contratos nuevos, Cataluña frente al resto (provincias)",didN,null]];
  const ev=ests.filter(e=>e[1]!=null), lo=d3.min(ev,e=>e[1]), hi=d3.max(ev,e=>e[1]), allNeg=ev.every(e=>e[1]<0), plRare=(pr&&pr.share<=0.1)||(SC&&SC.p<=0.1);
  const verdict=allNeg?`<b>el tope se asocia a una subida del alquiler declarado algo menor</b>: entre ${nf1.format(Math.abs(hi))} y ${nf1.format(Math.abs(lo))} puntos, según el método`:`<b>las estimaciones no coinciden en el signo</b> (de ${pts(lo)} a ${pts(hi)} puntos): con estos datos no se puede afirmar que el tope cambiara la subida del alquiler declarado`;

  // cuánto es en euros: alquiler medio en la ciudad de Barcelona (último año disponible)
  const BA=(VIVD&&VIVD.ciudades&&VIVD.ciudades.Barcelona&&VIVD.ciudades.Barcelona.alqMes)||{}, bY=Object.keys(BA).sort().pop(), bR=bY?BA[bY]:null;
  const eur=p=>bR?Math.round(bR*Math.abs(p)/100):null, cf=post(tens)-ES.post;
  const evNew=Math.abs(didN), evAll=Math.abs(ES.post);

  const say=(parent,html)=>{ const d=add(parent,"div","txt"); d.innerHTML=html; return d; };
  const DET=document.createElement("details"); DET.className="finding chk"; DET.innerHTML='<summary>Cómo lo hemos comprobado</summary>';
  // piezas que dibuja el texto (contenido/analisis/tope-cataluna.md)
  const G={};
  const rowsT=[["Municipios con tope",tens],["Municipios parecidos de fuera de Cataluña",pairs.map(p=>SBY.get(p.c.code)).filter(r=>r&&ok(r))],["Resto de España",rest],["Resto de Cataluña",rcat]];
  G.eventos=d=>{ esCharts(d,ES,{yl:"alquiler",src:"Fuente: INE, Índice de Precios de Vivienda en Alquiler por municipio."}); };
  G.contratos=d=>{
  const g4=add(d,"div","cols2");
  lineChart(g4,{title:"Alquiler de los contratos nuevos, 2021 = 100",source:"Cataluña: media de sus cuatro provincias; resto: media de las demás, ponderadas por población. Fuente: INE, IPVA por antigüedad del contrato.",series:[{n:"Cataluña",v:cat,c:"--rust",main:true},{n:"Resto de España",v:oth,c:"--slate"}],years:yrs,xticks:yrs,index:true,height:240});
  const fp=fig(g4,{title:"¿Le habría pasado a cualquier comunidad?",source:"El mismo cálculo, fingiendo que el tope lo hubiera puesto cada comunidad; en granate, Cataluña."}); placeboBars(fp.body,plac,didN,{label:"Cataluña"});
  };
  // desplegable «Cómo lo hemos comprobado»
  const s0=add(DET,"section","pres"); add(s0,"h3",null,"Subida del alquiler por grupos de municipios"); say(s0,`<p>Subida anual del alquiler declarado, en municipios de más de 10.000 habitantes (media ponderada por población).</p>`);
  table(s0,["","Municipios","2022","2023","2024"],rowsT.map(([l,rs])=>[l,nf0.format(rs.length),sgn(gr(rs,i23-1)),sgn(gr(rs,i23)),`<b>${sgn(post(rs))}</b>`]));
  // 4.4 comprobaciones
  const s5=add(DET,"section","pres"); add(s5,"h3",null,allNeg?"La conclusión aguanta cuando se mira de otras formas":"Las comprobaciones no coinciden"); say(s5,`<p>Cada fila compara los municipios con tope con una referencia distinta de lo que habría pasado sin él.</p>`);
  const why={0:"El vecino más cercano, pero pocos municipios y muchos a punto de entrar en el tope",1:"Municipios de fuera de Cataluña que subían igual hasta 2023",2:"Una mezcla de municipios que calca la evolución del alquiler desde 2015",3:"Los contratos nuevos, por provincias"};
  table(s5,["Con quién se compara","Diferencia en 2024","Por qué sirve"],ests.map(([l,v],i)=>[["Resto de Cataluña","Municipios parecidos (gemelos)","Una «Cataluña sintética»","Resto de provincias"][i],`<b>${v==null?"—":pts(v)}</b>`,why[i]]));
  if(SC){ synthCharts(s5,SC,Y,{yl:"alquiler",lab0:"con tope"}); }
  say(s5,`<p>${allNeg?`Las cuatro comparaciones dan lo mismo: el alquiler subió algo menos con el tope, entre ${nf1.format(Math.abs(hi))} y ${nf1.format(Math.abs(lo))} puntos. Cada una tiene su punto débil (unas usan pocos municipios, otras solo provincias), pero no el mismo, y por eso es difícil que todas se equivoquen hacia el mismo lado a la vez.`:`Las comparaciones no coinciden en el signo, así que no se puede afirmar que el tope cambiara la subida.`}</p>${SC?`<p>El gráfico de arriba lo enseña con la «Cataluña sintética», una mezcla de municipios de fuera, sobre todo ${(n=>n.slice(0,-1).join(", ")+" y "+n[n.length-1])(SC.top.slice(0,3).map(o=>esc(dispName(BYCODE.get(o.code)[F.name]).replace(/^(.+), (l'|la|el|els|les|los|las|o|a|os|as)$/i,(m,a,b)=>b.toLowerCase()==="l'"?"L'"+a:b[0].toUpperCase()+b.slice(1)+" "+a))))}, que reproduce casi al milímetro el alquiler de los municipios con tope durante nueve años. En 2024 se separan ${nf1.format(Math.abs(SC.postGap))} puntos. Si se hace lo mismo con otros municipios que no tuvieron tope, solo un ${nf0.format(SC.p*100)}${NB}% se separa tanto.</p>`:""}`);

  // compraventas: ¿se vendieron más pisos donde hay tope? (era un análisis aparte)
  const TC=await topeCompRes(B,{ahorroMes:bR?eur(ES.post):null});
  G.ventas=TC.drawVentas;
  const s6=add(DET,"section","pres"); add(s6,"h3",null,"Compraventas: tabla, pruebas y placebos"); TC.drawVentasTabla(s6); say(s6,TC.txtVentas); const s7=add(DET,"section","pres"); add(s7,"h3",null,"Compraventas: "+TC.tituloPruebas.replace(/^./,c=>c.toLowerCase())); TC.drawPruebas(s7); say(s7,TC.txtPruebas);
  const ventas=TC.D>0;
  const V={tens:TENS.size,pobTens:tensPop/catPop*100,post24:post(tens),cf,bR,bY,ahorroMes:bR?eur(ES.post):null,ahorroAnio:bR?eur(ES.post)*12:null,
    esPost:ES.post,esPre:ES.pre,nTw:ES.n,restPre:pre(rest),restPost:post(rest),tensPre:pre(tens),
    preC,preO,postC,postO,evNew,ahorroNuevo:bR?eur(didN):null,plN:pr?pr.n:0,plTxt:pr?(pr.below===0?"ninguna":`solo ${pr.below}`):"—",
    ventasD:TC.D,ventasDu:TC.Du,extraV:Math.round(TC.extra/100)*100,ampl:AMPL.size,
    hog:TC.escala?TC.escala.hog:0,ahorroM:TC.escala?TC.escala.ahorroM:0,share:TC.escala?TC.escala.share:0,
    cfAhorro:bR?eur(ES.post):null,lo:Math.abs(hi),hi:Math.abs(lo)};
  // los grises: tres mandos y tres lecturas del mismo dato
  G.grises=d=>{ const w=add(d,"div","calc pn-sim"), ctl=add(w,"div","ctl"), out=add(w,"div","res");
    const hog=V.hog, mes=Math.abs(V.ahorroNuevo||0), ex=V.extraV;
    const ST2={n:20,s:50,a:70}, PRE=[["Lo que defiende quien apoya el tope",{n:25,s:10,a:100}],["Entre medias",{n:20,s:50,a:70}],["Lo que teme quien lo critica",{n:10,s:100,a:50}]];
    const defs=[["n","Hogares de alquiler que firman contrato nuevo en un año","%",5,40,1,"El tope solo toca esos contratos. No es un dato de esta web: es el supuesto que más mueve el resultado."],
      ["a","Parte del freno que se debe al tope","%",25,100,5,"El resto sería otra cosa de Cataluña en 2024. Con 100 se da por bueno todo el freno medido."],
      ["s","Compraventas de más que salieron del alquiler","%",0,100,5,"Estos datos no lo dicen. Un piso vendido puede seguir alquilado o comprarlo quien vive en él."]];
    ctl.innerHTML=defs.map(([k,l,u,a,b,st,n])=>`<label>${l} <output data-k="${k}"></output><input type="range" min="${a}" max="${b}" step="${st}" value="${ST2[k]}" data-k="${k}"><small>${n}</small></label>`).join("")
      +`<p class="muted" style="font-size:13.5px">Probar una lectura: ${PRE.map(([l],i)=>`<button type="button" class="lnk" data-p="${i}">${esc(l)}</button>`).join(" · ")}</p>`;
    out.innerHTML='<div id="grres"></div>';
    const upd=()=>{ ctl.querySelectorAll("output").forEach(o=>o.textContent=ST2[o.dataset.k]+NB+"%");
      const ahorran=Math.round(hog*ST2.n/100), eurAnio=mes*12*ST2.a/100, millones=ahorran*eurAnio/1e6, salen=Math.round(ex*ST2.s/100), ratio=salen?ahorran/salen:null;
      out.querySelector("#grres").innerHTML=`<div class="big">${nf0.format(ahorran)} <span class="muted" style="font-size:16px;font-weight:400">hogares ahorran unos ${nf0.format(eurAnio)}${NB}€ al año</span></div>
        <p>Son unos <b>${nf1.format(millones)} millones de euros al año</b> para los inquilinos que firman contrato.</p>
        <div class="big" style="margin-top:14px">${nf0.format(salen)} <span class="muted" style="font-size:16px;font-weight:400">pisos menos en alquiler al año</span></div>
        <p>${salen?`Por cada piso que sale del alquiler, <b>${ratio>=1?nf0.format(ratio):nf1.format(ratio)} ${ratio===1?"hogar ahorra":"hogares ahorran"}</b>. Para un inquilino que busca piso, esos pisos son menos opciones; para quien ya tiene contrato, no cambian nada.`:"Sin ventas que salgan del alquiler, el tope no resta oferta y el balance es solo el ahorro."}</p>`; };
    ctl.querySelectorAll("input").forEach(i=>i.addEventListener("input",()=>{ ST2[i.dataset.k]=+i.value; upd(); }));
    ctl.querySelectorAll("button[data-p]").forEach(b=>b.addEventListener("click",()=>{ Object.assign(ST2,PRE[+b.dataset.p][1]); ctl.querySelectorAll("input").forEach(i=>i.value=ST2[i.dataset.k]); upd(); }));
    upd(); };
  mdRender(B,"tope-cataluna",V,G);
  B.appendChild(DET);
  AB.fill({lede:allNeg?`Frenó la subida, pero no bajó el alquiler. En 2024 el alquiler subió un ${nf1.format(post(tens))}${NB}% donde hay tope y, sin él, habría subido en torno a un ${nf1.format(cf)}${NB}%${bR?`: unos ${nf0.format(eur(ES.post))}${NB}€ menos al mes en un piso como los de Barcelona`:""}. En los contratos nuevos, que son los que limita la norma, el freno es mayor: ${nf1.format(evNew)} puntos${bR?`, unos ${nf0.format(eur(didN))}${NB}€ al mes`:""}.${ventas?` En esos mismos municipios se vendieron unas ${nf0.format(Math.round(TC.extra/100)*100)} viviendas más al año de lo esperable, y los datos no dicen si salieron del alquiler.`:""}`:null});
  methods(B,[["Qué se hace","Se compara lo que pasó con el alquiler en los municipios con tope con cuatro versiones distintas de lo que habría pasado sin él: el resto de Cataluña, un municipio gemelo para cada uno, una mezcla de municipios que calca su historia y, para los contratos nuevos, el resto de provincias. Las cuatro tienen supuestos distintos; si coinciden, la conclusión es más sólida."],["Datos","INE, Índice de Precios de Vivienda en Alquiler (IPVA) por municipio, todos los contratos, 2015–2024, y por provincia según antigüedad del contrato, 2021–2024. Zonas tensionadas: resoluciones del BOE de 14 de marzo y 8 de octubre de 2024. Padrón de 2025 para ponderar."],["Muestra",`${nf0.format(all.length)} municipios de más de 10.000 habitantes con índice en 2021, 2023 y 2024: ${nf0.format(tens.length)} tensionados, ${nf0.format(rcat.length)} del resto de Cataluña y ${nf0.format(rest.length)} del resto de España.`],["Diferencias en diferencias",`(subida de 2024 − media de 2022 y 2023) en tensionados − lo mismo en el grupo de comparación, ponderado por población. Intervalo por remuestreo de los municipios tensionados (300 réplicas).`],["Estudio de eventos",`Gemelos del resto de España por vecino más cercano (con reemplazo) en log del padrón, cambio anual medio del índice en 2021–2023 y log del nivel de 2023. Diferencia del índice (2023 = 100) entre cada tensionado y su gemelo en cada año; media y bootstrap de parejas (200 réplicas; 300 para el efecto agregado).`],["Control sintético",`Tratado: media ponderada por población del índice (2023 = 100) de ${nf0.format(tFull.length)} municipios tensionados con serie completa 2015–2024. Donantes: los 60 municipios de fuera de Cataluña más parecidos en 2015–2023; pesos no negativos que suman 1, elegidos por mínimos cuadrados sobre 2015–2023 (algoritmo de Frank–Wolfe). Inferencia: ${SC?SC.placebos.length:0} placebos en el espacio (cada donante como tratado), cociente entre el error posterior y el previo; se descartan los placebos con un ajuste previo más de cinco veces peor (y peor de 1 punto). Con nueve años previos y muchos donantes el ajuste previo puede ser casi perfecto; por eso la prueba que cuenta son los placebos, no el ajuste.`],["Contratos nuevos","Diferencias en diferencias entre Cataluña (cuatro provincias) y el resto, con el índice de contratos nuevos; placebos tratando «como si» a cada una de las otras comunidades."],["Supuesto clave","Sin el tope, los municipios tensionados habrían seguido la misma evolución que sus comparaciones. Se apoya en las diferencias previas (cercanas a cero) y en el ajuste previo del sintético."],["Compraventas: datos","Ministerio de Vivienda: transacciones inmobiliarias de vivienda por municipio y trimestre (total y segunda mano), datos de los notarios, 2017–2026. Municipios con tope: los de las resoluciones del BOE de 14 de marzo y 8 de octubre de 2024. Comparación: municipios de 20.000 habitantes o más del resto de España."],["Compraventas: diferencia en diferencias","(compraventas medias por trimestre después / antes en los municipios con tope) / (lo mismo en el grupo de comparación) − 1. Antes: 2022T2–2024T1; después: 2024T2–2026T2."],["Compraventas: gemelos","Para cada municipio con tope de 10.000 habitantes o más, el municipio de 20.000 o más de fuera de Cataluña más parecido en tamaño (logaritmo), renta por persona de 2018 y evolución de las compraventas de 2019 a 2023 (distancia sobre variables estandarizadas, umbral 1). Efecto: media de las diferencias de cambio logarítmico; intervalo por remuestreo de parejas."],["Compraventas: placebos","El mismo cálculo con topes falsos en el primer trimestre de 2019 y en el segundo de 2022."],["Escala: hogares de alquiler","Estimación de Indicio, no un dato oficial: población entre personas por hogar (Atlas de Renta, 2024) por porcentaje de hogares de alquiler (censo de 2021) en los municipios con tope; mezcla dos años. El ahorro usa el alquiler medio de Barcelona para todos, así que es un máximo. Cálculo en scripts/datos/hogares_tope.py."]]);
}

function studyVT(B){
  const AB=abstract(B);
  const x="vtCambio", y="alqVar20";
  const EF={prov:"",min:10000,max:Infinity};
  const run=(xx,yy,cs)=>withEXF(EF,()=>partialRCI(xx,yy,cs,true));
  const base=run(x,y,[]), c1=run(x,y,["lpop"]), c2=run(x,y,["lpop","rentaVar20","pobVar20"]), c3=run(x,y,["lpop","rentaVar20","pobVar20","prov"]);
  const lv=withEXF(EF,()=>wcorr(pairPts("vt","alqVar",{weighted:true})));
  const b21=run("vtCambio21","alqVar21",["lpop","rentaVar20","pobVar20","prov"]), b22=run("vtCambio22","alqVar22",["lpop","rentaVar20","pobVar20","prov"]);
  const rows=withEXF(EF,()=>rowsAll().filter(r=>exOK(r)&&r[F.vtp24]!=null&&r[F[x]]!=null&&r[F[y]]!=null));
  const cut=wq(rows,r=>r[F.vtp24],.9), hiRows=rows.filter(r=>r[F.vtp24]>=cut), loRows=rows.filter(r=>r[F.vtp24]<cut);
  const cHi=adjData(x,y,["lpop","rentaVar20","pobVar20"],true,hiRows), cLo=adjData(x,y,["lpop","rentaVar20","pobVar20"],true,loRows);
  const ciHi=cHi?bootCI(hiRows,s=>{ const a=adjData(x,y,["lpop","rentaVar20","pobVar20"],true,s); return a&&a.c?a.c.r:null; }):null;
  const byP=d3.rollups(rows,v=>({vt:d3.sum(v,r=>r[F[x]]*r[F.pop])/d3.sum(v,r=>r[F.pop]),alq:d3.sum(v,r=>r[F[y]]*r[F.pop])/d3.sum(v,r=>r[F.pop])}),r=>r[F.prov]).sort((a,b)=>b[1].vt-a[1].vt).slice(0,4);
  // efecto en unidades: +1 punto de pisos turísticos (sobre el total de viviendas) → puntos de subida del alquiler
  const Z=[r=>Math.log10(r[F.pop]),r=>r[F.rentaVar20],r=>r[F.pobVar20]];
  const u0=regFn(rows,{x:r=>r[F[x]],y:r=>r[F[y]],fe:false,w:r=>r[F.pop]}), u3=regFn(rows,{x:r=>r[F[x]],y:r=>r[F[y]],z:Z,fe:true,w:r=>r[F.pop]});
  const mChg=d3.sum(rows,r=>r[F[x]]*r[F.pop])/d3.sum(rows,r=>r[F.pop]), p90=wq(rows,r=>r[F[x]],.9);
  // panel anual 2021–2024: subida del alquiler en t frente al cambio de pisos turísticos en t+1 (al revés), t y t−1 (después), con efectos fijos de provincia × año
  const VY=ADY.vtp.yrs(), IY=SER.ipvaYears, Pn=[];
  rows.forEach(r=>{ const s=SBY.get(r[F.code]); if(!s) return; const v=vtpAnnual(s), q=s[SF.ipva]; if(!v||!q) return; const vv=t=>{ const i=VY.indexOf(t); return i>=0?v[i]:null; }, qq=t=>{ const i=IY.indexOf(t); return i>=0?q[i]:null; };
    [2021,2022,2023,2024].forEach(t=>{ const a=qq(t), a1=qq(t-1), v0=vv(t), v1=vv(t-1); if(!(a>0&&a1>0)||v0==null||v1==null) return; const o={}; o[F.prov]=r[F.prov]+"-"+t;
      o.y=(a/a1-1)*100; o.x=v0-v1; o.xl=vv(t-2)!=null?v1-vv(t-2):null; o.xf=vv(t+1)!=null&&t<=2023?vv(t+1)-v0:null; o.w=r[F.pop]; Pn.push(o); }); });
  const pC=regFn(Pn,{x:o=>o.x,y:o=>o.y,fe:true,w:o=>o.w}), pL=regFn(Pn,{x:o=>o.xl,y:o=>o.y,z:[o=>o.x],fe:true,w:o=>o.w}), pF=regFn(Pn,{x:o=>o.xf,y:o=>o.y,z:[o=>o.x],fe:true,w:o=>o.w});
  const effTxt=u=>u?`${Math.abs(u.b)<0.05?"prácticamente nada":pts(u.b)+" puntos"}${ciPts(u.ci)}`:"—";

  sec(B,"ctx",`<p>Si hay un culpable señalado de la subida del alquiler en las ciudades españolas, es el piso turístico. El argumento es intuitivo: cada vivienda que pasa a alquilarse por noches a visitantes es una vivienda menos para vivir, y con menos oferta el precio sube. Se ha convertido en el centro de campañas vecinales, de ordenanzas municipales y de leyes autonómicas.</p>
    <p>El problema para comprobarlo es que los pisos turísticos no aparecen al azar. Se concentran donde hay turismo, pero también donde hay empleo, donde llega gente, donde la renta sube. Y todo eso, por sí solo, ya empuja el alquiler. Si en Málaga han subido a la vez los pisos turísticos y el alquiler, ¿es por los pisos turísticos o por todo lo demás que le está pasando a Málaga?</p>
    <p>Este análisis intenta separar una cosa de otra y medir el tamaño del problema: cuánto de la subida del alquiler se puede atribuir de verdad a los pisos turísticos cuando se compara entre lugares parecidos.</p>`);
  sec(B,"int",`<p>No hay una ley única que evaluar: lo que cambia de un sitio a otro es <b>cuánto pesan los pisos turísticos</b>, su parte sobre el total de viviendas de cada municipio, y cuánto ha crecido entre 2020 y 2024. El dato es del INE, que desde 2020 cuenta los anuncios activos en las grandes plataformas dos veces al año.</p>
    <p>Lo que se quiere explicar es la subida del alquiler declarado a Hacienda (Índice de Precios de Vivienda en Alquiler del INE) en el mismo periodo, en los ${nf0.format(base.n)} municipios de más de 10.000 habitantes, que es donde ese índice es fiable. Las prohibiciones municipales de nuevos pisos turísticos, que sí son una intervención concreta, se estudian en <a href="/preguntas/prohibir-pisos-turisticos/">otro análisis</a>.</p>`,{title:"Qué se compara"});
  sec(B,"ana",`<p>El análisis avanza en tres pasos, cada uno más exigente que el anterior. Es la forma de ir quitando capas de explicaciones alternativas hasta ver qué queda.</p><ol class="defs"><li><b>Cambios, no niveles.</b> Comparar municipios con muchos y pocos pisos turísticos mezcla todo lo que los hace distintos: la costa, el clima, el tipo de vivienda, la historia. Comparar cuánto <i>cambió</i> cada uno elimina todo eso, porque lo que es fijo en un lugar no cambia.</li><li><b>Comparar entre iguales.</b> Aun así, los municipios donde más crecieron los pisos turísticos pueden ser los que más crecían en renta o en población. Se descuentan esas diferencias y se compara solo dentro de cada provincia. El resultado se da en correlación (si van juntas) y en unidades (cuántos puntos de subida del alquiler acompañan a cada punto más de pisos turísticos).</li><li><b>Qué va primero.</b> Si los pisos turísticos causan la subida, el alquiler debería subir <i>después</i> de que lleguen. Si van a donde el alquiler ya subía, la relación aparecerá al revés. Con datos año a año se puede mirar el orden.</li></ol>`);
  const s1=res(B,"La relación entre el crecimiento de los pisos turísticos y la subida del alquiler es débil",`<p>Cada punto es un municipio de más de 10.000 habitantes. En horizontal, cuántos puntos ganó o perdió el peso de los pisos turísticos sobre el total de viviendas entre 2020 y 2024; en vertical, cuánto subió el alquiler declarado.</p>`);
  withEXF(EF,()=>scatter(s1,{x,y,title:"Cambio en los pisos turísticos y subida del alquiler, 2020–2024",source:"Fuente: INE, viviendas turísticas (agosto de 2020 y de 2024) e Índice de Precios de Vivienda en Alquiler.",hideSay:true}));
  lect(s1,`<p>La nube de puntos es casi plana: hay municipios donde los pisos turísticos crecieron mucho y el alquiler subió poco, y al revés. La correlación sin descontar nada es de ${rFmt(base.r)}, que en términos estadísticos es débil: el crecimiento de los pisos turísticos «explica» un ${nf0.format(base.r*base.r*100)}${NB}% de las diferencias en la subida del alquiler entre municipios. El resto depende de otras cosas.</p>`);
  const rowsT=[["Sin descontar nada",base,u0],["Descontando el tamaño",c1],["… y la subida de la renta y del padrón",c2],["… y comparando solo dentro de cada provincia",c3,u3]].filter(r=>r[1]);
  const s2=res(B,c3&&Math.abs(c3.r)<Math.abs(base.r)*0.6?"Al comparar municipios parecidos, la relación desaparece":"Al comparar municipios parecidos, la relación se mantiene",`<p>La relación pasa de ${rCI(base)} a ${rCI(c3||base)}. En unidades: sin descontar nada, cada punto más de pisos turísticos se asocia a ${effTxt(u0)} más de subida del alquiler; entre municipios parecidos de la misma provincia, a ${effTxt(u3)}. Para situarlo: el peso de los pisos turísticos creció de media ${pts(mChg)} puntos, y en el 10${NB}% de municipios donde más creció, más de ${pts(p90)}.</p>`);
  table(s2,["Comparación","Relación (r)","Explica (r²)","Efecto de +1 punto"],rowsT.map(([l,c,u])=>[l,`<b>${rFmt(c.r)}</b>${ciFmt(c.ci)}`,`${nf0.format(c.r*c.r*100)}${NB}%`,u?effTxt(u):"—"]));
  add(s2,"p","muted",`${nf0.format(base.n)} municipios, ponderados por población. Entre corchetes, intervalos del 95 % por remuestreo.`).style.cssText="font-size:13.5px;margin-top:6px";
  lect(s2,`<p>La tabla se lee de arriba abajo, como un embudo. Primero, la relación tal cual (${rFmt(base.r)}). Al descontar el tamaño apenas cambia. Al descontar cuánto subió la renta y la población, baja. Y al comparar solo municipios de la misma provincia, ${c3&&Math.abs(c3.r)<0.1?"desaparece":"se queda en "+rFmt(c3?c3.r:0)}. Lo que diferenciaba a los municipios turísticos era, sobre todo, estar en provincias donde todo el mercado subía.</p><p>En unidades: entre municipios parecidos de la misma provincia, un punto más de pisos turísticos (por ejemplo, pasar del 2${NB}% al 3${NB}% de las viviendas) se asocia a ${effTxt(u3)} de subida del alquiler. Para comparar: el peso medio de los pisos turísticos creció ${pts(mChg)} puntos en estos cuatro años.</p>`);
  const s3=res(B,pF&&pL&&sigCI(pF.ci)&&!sigCI(pL.ci)?"El alquiler sube antes de que lleguen los pisos turísticos, no después":"Año a año: qué va primero",`<p>Con datos anuales de 2021 a 2024 se compara la subida del alquiler de cada año con el cambio de los pisos turísticos ese mismo año, el año anterior y el siguiente, siempre dentro de cada provincia y año. Si los pisos turísticos causaran la subida, debería verse sobre todo en el año siguiente a su llegada; si van a donde el alquiler ya sube, la relación aparecerá con los pisos turísticos <i>del año siguiente</i>.</p>`);
  table(s3,["Pisos turísticos de…","Efecto de +1 punto en la subida del alquiler","Lectura"],[["el año anterior (t − 1)",effTxt(pL),pL&&sigCI(pL.ci)?"Distinto de cero":"No se distingue de cero"],["el mismo año (t)",effTxt(pC),pC&&sigCI(pC.ci)?"Distinto de cero":"No se distingue de cero"],["el año siguiente (t + 1)",effTxt(pF),pF&&sigCI(pF.ci)?"Distinto de cero: la subida va por delante":"No se distingue de cero"]]);
  add(s3,"p","muted",`${nf0.format(Pn.length)} observaciones municipio-año; efectos fijos de provincia × año; ponderado por población.`).style.cssText="font-size:13.5px;margin-top:6px";
  lect(s3,`<p>Esta es quizá la prueba más reveladora. Si los pisos turísticos encarecieran el alquiler, la fila de arriba (pisos turísticos del año anterior) debería mostrar el efecto más claro. ${pL&&sigCI(pL.ci)?"Y lo muestra.":"No lo muestra: no se distingue de cero."} ${pF&&sigCI(pF.ci)?"En cambio, la fila de abajo sí: los municipios donde el alquiler sube un año son los que ganan pisos turísticos al año siguiente. Es lo que cabría esperar si los inversores llevan sus pisos al mercado turístico allí donde el mercado ya se está calentando.":"Tampoco la de abajo: no hay un orden claro entre las dos cosas."}</p>`);
  res(B,"Comprobaciones de robustez",`<ul class="defs">
    <li><b>Con otro año de partida.</b> Desde agosto de 2021: ${rCI(b21)}. Desde 2022: ${rCI(b22)}. ${b21&&b22&&ciZero(b21)&&ciZero(b22)?"El resultado no depende de haber empezado en el suelo de la pandemia.":"Cambiar el punto de partida cambia la lectura: conviene mirar las dos."}</li>
    <li><b>Donde los pisos turísticos pesan de verdad.</b> En el 10${NB}% de municipios con más pisos turísticos (más del ${pc(cut)} de las viviendas, ${nf0.format(hiRows.length)} municipios): ${cHi&&cHi.c?`r = ${rFmt(cHi.c.r)}${ciFmt(ciHi)}`:"—"}; en el resto, ${cLo&&cLo.c?`r = ${rFmt(cLo.c.r)}`:"—"}. ${cHi&&cHi.c&&ciHi&&ciHi[0]>0?"Ahí sí aparece algo: el efecto, si existe, es de saturación.":"Tampoco ahí aparece una relación clara a escala municipal."}</li>
    <li><b>Quién sostiene la relación bruta.</b> Unas pocas provincias donde crecieron a la vez los pisos turísticos y el alquiler: ${byP.map(([p,v])=>`${provShort(PROVS[p])} (${pts(v.vt)} puntos, ${sgn(v.alq)})`).join(", ")}. Por eso se diluye dentro de cada provincia.</li>
    <li><b>Niveles en vez de cambios.</b> r = ${lv?rFmt(lv.r):"—"}: misma conclusión.</li></ul>`);
  if(u3&&u3.ci){ const b=u3.b, lo=u3.ci[0], hi=u3.ci[1], ey=d3.sum(rows,r=>r[F[y]]*r[F.pop])/d3.sum(rows,r=>r[F.pop]), rb=r1=>Math.round(r1*10)/10, xmax=Math.max(4,Math.ceil(p90*2)), emax=Math.max(1,Math.ceil(Math.max(Math.abs(lo),Math.abs(hi))*2));
    const sg=res(B,"Entre el blanco y el negro: ¿cuánto alquiler pueden explicar los pisos turísticos?",`<p>El efecto medio entre municipios es pequeño, pero el intervalo deja sitio a lecturas distintas, y en algunos barrios puede ser mayor. Elige cuántos puntos ganan los pisos turísticos y qué efecto les atribuyes por cada punto, y mira cuánto de la subida del alquiler explicarían.</p>`);
    playBox(sg,{defs:[["x","Pisos turísticos que se suman, en puntos de % de las viviendas",0,xmax,0.1,"En el 10 % de municipios con más pisos turísticos, el cambio fue de al menos "+nf1.format(p90)+" puntos; la media, "+nf1.format(mChg)+".",v=>"+"+nf1.format(v)+" puntos"],["e","Subida del alquiler por cada punto más de pisos turísticos",-emax,emax,0.1,"En puntos de alquiler. El intervalo del 95 % va de "+nf1.format(lo)+" a "+nf1.format(hi)+"; el valor central es "+nf1.format(b)+".",v=>(v>0?"+":v<0?"−":"")+nf1.format(Math.abs(v))+" puntos"]],
      pre:[["Efecto central",{x:rb(p90),e:rb(b)}],["Extremo alto del intervalo",{x:rb(p90),e:rb(hi)}],["Un barrio, no el municipio",{x:Math.min(xmax,rb(p90*2)),e:rb(hi*2)}]],
      render:st=>{ const dl=st.x*st.e, share=ey?dl/ey*100:null, eur=Math.round(700*dl/100);
        return `<div class="big">${dl>=0?"+":"−"}${nf1.format(Math.abs(dl))} <span class="muted" style="font-size:16px;font-weight:400">puntos de subida del alquiler atribuibles a los pisos turísticos</span></div>
          <p>Es ${eur>=0?"+":"−"}${nf0.format(Math.abs(eur))}${NB}€ al mes en un alquiler de 700 € (un ejemplo).${share!=null?` Frente a una subida media del alquiler de ${nf1.format(ey)} puntos en 2020–2024, son un <b>${nf0.format(Math.abs(share))}${NB}%</b> de la subida.`:""}</p>
          <p class="muted" style="font-size:14px">${sigCI(u3.ci)?"El efecto medio es distinto de cero, pero pequeño.":"El análisis no encuentra un efecto distinto de cero a escala de municipio: esto es lo que sería si lo hubiera, no lo que ha pasado."}</p>`; }});
    lect(sg,`<p>Aun con el extremo alto del intervalo, los pisos turísticos explican una parte pequeña de la subida media. En un barrio concreto, donde un municipio no se puede promediar, puede ser mucho más. Esa es la parte gris que estos datos no alcanzan.</p>`); }
  sec(B,"con",`<p><b>A escala de municipio, el crecimiento de los pisos turísticos explica muy poco de la subida del alquiler declarado</b>: la relación es débil, desaparece al comparar municipios parecidos de la misma provincia y ${pF&&sigCI(pF.ci)&&!(pL&&sigCI(pL.ci))?"el orden temporal apunta más a que los pisos turísticos van a donde el alquiler ya sube que a lo contrario":"el orden temporal no muestra que la subida venga después de su llegada"}.</p>
    <p>Esto no exculpa a los pisos turísticos, pero sí cambia el foco del debate. A escala de municipio, la subida del alquiler se explica sobre todo por lo que le pasa al conjunto del mercado de cada provincia: renta, empleo, gente que llega. Los pisos turísticos parecen más un síntoma de mercados calientes que su motor principal.</p>
    <p>Donde sí pueden importar es a escala de barrio. En el centro de Barcelona, de Palma o de Sevilla, unos pocos cientos de pisos turísticos concentrados en unas calles pueden cambiar el mercado de ese barrio sin mover la media del municipio. Los estudios hechos a esa escala encuentran efectos. Este análisis no los contradice: dice que, fuera de esos puntos calientes, no es ahí donde está la explicación general.</p>
    <ul class="defs"><li><b>Eso no quiere decir que no tengan efecto.</b> El efecto puede estar en barrios concretos, que aquí se diluyen en la media del municipio. Estudios a escala de barrio en Barcelona sí han encontrado subidas asociadas a la llegada de pisos turísticos.</li>
    <li><b>El alquiler declarado reacciona despacio,</b> porque incluye contratos antiguos, y en muchas zonas turísticas hay pocos contratos de larga duración. No hay una serie pública de precios de anuncios por municipio y año para repetirlo.</li>
    <li>Qué pasa cuando un ayuntamiento <b>prohíbe nuevos pisos turísticos</b>: <a href="/preguntas/prohibir-pisos-turisticos/">lo medimos en otro estudio</a>.</li></ul>
    <p style="margin-top:10px">${exLink("cruce",{d:["vtCambio","alqVar20"],t:"g10",c:["lpop","rentaVar20"]},"Repite el análisis en el laboratorio")}</p>`);
  AB.fill({ctx:"Los pisos turísticos están en el centro del debate sobre el precio del alquiler, pero se concentran donde otras cosas también lo empujan.",intT:"Qué se compara",int:"Cambio del peso de las viviendas turísticas entre 2020 y 2024 en los municipios de más de 10.000 habitantes.",ana:"Cambios en vez de niveles, controles por tamaño, renta y población, efectos fijos de provincia, efecto en unidades y un panel anual para ver qué va primero.",res:`Entre municipios parecidos, cada punto más de pisos turísticos se asocia a ${effTxt(u3)} de subida del alquiler (r = ${c3?rFmt(c3.r):"—"}).`,con:"A escala municipal la huella es pequeña; si existe un efecto, está en barrios concretos que estos datos no ven."});
  methods(B,[["Qué se hace","Se compara cuánto crecieron los pisos turísticos y cuánto subió el alquiler en cada municipio, primero tal cual y después entre municipios parecidos de la misma provincia, y se mira con datos anuales qué va primero."],["Datos","INE: medición de viviendas turísticas (agosto de 2020 a 2024; anual para el panel), Índice de Precios de Vivienda en Alquiler por municipio (2015–2024), Atlas de Renta (subida de la renta 2020–2024) y padrón (2020–2025)."],["Muestra",`${nf0.format(base.n)} municipios de más de 10.000 habitantes con índice de alquiler.`],["Variables","X: puntos de cambio del % de viviendas turísticas sobre el total. Y: subida del índice de alquiler (%). Controles: log del padrón, subida de la renta 2020–2024, cambio del padrón 2020–2025, provincia."],["Especificación",`Correlación y pendiente parciales por residuos (Frisch–Waugh–Lovell), ponderadas por población, con efectos fijos de provincia. ${FICHA_R}`],["Panel anual","Subida del índice en t frente al cambio de pisos turísticos en t − 1, t y t + 1 (cada uno controlando por el de t), con efectos fijos de provincia × año, 2021–2024. Intervalos por remuestreo de observaciones."],["Robustez","Bases de 2021 y 2022; submuestra del 10 % más turístico; niveles en vez de cambios."]]);
}
// =====================================================================
// DINERO PÚBLICO y estudio de las pensiones
// =====================================================================
let GOV=null;
const loadGov=()=>GOV?Promise.resolve(GOV):getJSON("/data/gov.json").then(g=>(GOV=g));
const gy=y=>GOV.years.indexOf(String(y));
const gv=(code,u,y)=>GOV.fun[code][u][gy(y)];

async function renderGasto(){
  document.title="Dinero público · Indicio";
  view.innerHTML='<p class="loading">Cargando…</p>';
  try{ await loadGov(); }catch(e){ view.innerHTML='<p class="loading">No se pudieron cargar los datos.</p>'; return; }
  const Y=+GOV.years[GOV.years.length-1], tot=gv("TOTAL","meur",Y), per=v=>v/tot*100;
  const pop=REFS.es.pad[REFS.es.pad.length-1];
  view.innerHTML=pageHead("¿En qué se gasta el dinero público?",`Las administraciones públicas (Estado, comunidades, ayuntamientos y Seguridad Social) gastaron en ${Y} <mark>${nf0.format(tot/1000)} mil millones de euros</mark>, el ${pc(gv("TOTAL","pib",Y))} de todo lo que produce la economía: unos ${eur(Math.round(tot*1e6/pop/100)*100)} por habitante. De cada 100 euros, ${nf0.format(per(gv("GF1002","meur",Y)))} van a pensiones de jubilación.`)+`<div id="body"></div>${govNote()}`;
  const B=document.getElementById("body");

  // 1. cada 100 euros
  const s1=finding(B,`De cada 100 euros de gasto público, ${nf0.format(per(gv("GF10","meur",Y)))} son protección social`,
    `<p>La protección social incluye pensiones, paro, bajas por enfermedad e incapacidad, ayudas a familias y contra la exclusión. Le siguen la sanidad, los servicios generales (donde están los intereses de la deuda) y la educación.</p>`);
  const rows=[["GF1002","GF10"],["GF1001","GF10"],["GF1003","GF10"],["GF1005","GF10"],["GF1004","GF10"],["GF1007","GF10"],["GF07"],["GF09"],["GF0107","GF01"],["GF01x"],["GF04"],["GF03"],["GF02"],["GF06"],["GF08"],["GF05"]];
  const val=c=>c==="GF01x"?gv("GF01","meur",Y)-gv("GF0107","meur",Y):gv(c,"meur",Y);
  const nm=c=>c==="GF01x"?"Resto de servicios generales":GOV.fun[c].n;
  const col=r=>r[1]==="GF10"?"--rust":r[0]==="GF07"?"--slate":r[0]==="GF09"?"--mustard":r[0]==="GF0107"?"--plum":"--stone";
  const f1=fig(s1,{title:`Cada 100 euros de gasto público, ${Y}`,source:`Los tonos granate son partes de la protección social. Fuente: Eurostat, gasto de las administraciones públicas por funciones (COFOG).`});
  hbars(f1.body,rows.map(r=>({l:nm(r[0]),v:per(val(r[0])),c:col(r)})).filter(r=>r.v>0.05),{fmt:v=>nf1.format(v)+NB+"€",min:0});
  f1.body.querySelectorAll(".hb").forEach(h=>h.style.gridTemplateColumns="minmax(150px,240px) minmax(0,1fr) 64px");

  // 2. evolución % PIB
  const yrs=GOV.years.map(Number), L=[["GF1002","Jubilación","--rust"],["GF07","Sanidad","--slate"],["GF09","Educación","--mustard"],["GF0107","Intereses de la deuda","--plum"],["GF1005","Desempleo","--olive"]];
  const p0=gv("GF1002","pib",1995), p1=gv("GF1002","pib",Y);
  const s2=finding(B,`Las pensiones de jubilación han pasado del ${pc(p0)} al ${pc(p1)} del PIB desde 1995`,
    `<p>Es la partida que más ha crecido, sobre todo entre 2008 y 2014: la crisis hundió el PIB y, a la vez, las nuevas pensiones eran más altas que las que dejaban de pagarse. La sanidad pesa algo más que en 1995 (del ${pc(gv("GF07","pib",1995))} al ${pc(gv("GF07","pib",Y))}) y la educación algo menos (del ${pc(gv("GF09","pib",1995))} al ${pc(gv("GF09","pib",Y))}). Los intereses de la deuda bajaron con la llegada del euro, repuntaron con la crisis y hoy están en el ${pc(gv("GF0107","pib",Y))}. El desempleo sube y baja con las crisis.</p>`);
  lineChart(s2,{title:"Gasto público en cada función, % del PIB",source:"Fuente: Eurostat, COFOG.",series:L.map(([c,n,k],i)=>({n,v:GOV.fun[c].pib,c:k,main:i===0})),years:yrs,xticks:[1995,2008,Y],fmt:pc,tickFmt:v=>nf0.format(v)+"%",height:300});

  // 3. ingresos, gastos, deuda
  const TR=GOV.main.TR.pib, TE=GOV.main.TE.pib, B9=GOV.main.B9.pib;
  const s3=finding(B,`Se gasta más de lo que se ingresa casi todos los años: el déficit de ${Y} fue del ${pc(-B9[gy(Y)])} del PIB`,
    `<p>Solo entre 2005 y 2007 los ingresos superaron a los gastos. La diferencia se cubre con deuda, que pasó del ${pc(GOV.debt[gy(2007)])} del PIB en 2007 al ${pc(GOV.debt[gy(Y)])} en ${Y}. Los ingresos salen sobre todo de impuestos sobre la renta y el patrimonio (${pc(GOV.main.D5REC.pib[gy(Y)])} del PIB), cotizaciones sociales (${pc(GOV.main.D61REC.pib[gy(Y)])}) e impuestos sobre el consumo como el IVA (${pc(GOV.main.D2REC.pib[gy(Y)])}).</p>`);
  const g3=add(s3,"div","cols2");
  lineChart(g3,{title:"Ingresos y gastos públicos, % del PIB",source:"Fuente: Eurostat, cuentas de las administraciones públicas.",series:[{n:"Gastos",v:TE,c:"--rust",main:true},{n:"Ingresos",v:TR,c:"--slate"}],years:yrs,xticks:[1995,2008,Y],fmt:pc,tickFmt:v=>nf0.format(v)+"%"});
  lineChart(g3,{title:"Deuda pública, % del PIB",source:"Fuente: Eurostat (protocolo de déficit excesivo).",series:[{n:"Deuda",v:GOV.debt,c:"--plum",main:true}],years:yrs,xticks:[1995,2008,Y],fmt:pc,tickFmt:v=>nf0.format(v)+"%"});

  // 4. comparación europea
  const EU=GOV.eu, cy=[...new Set(Object.values(EU).flatMap(o=>Object.keys(o.TOTAL||{})))].sort().filter(y=>Object.values(EU).every(o=>o.TOTAL&&o.TOTAL[y]!=null)).pop();
  const ctry=[["ES","España"],["EU27_2020","UE-27"],["FR","Francia"],["DE","Alemania"],["IT","Italia"],["PT","Portugal"],["NL","Países Bajos"],["SE","Suecia"]];
  const es=c=>gv(c,"pib",+cy)??null;
  const s4=finding(B,`En el conjunto, España gasta menos que la media europea; en pensiones, lo mismo`,
    `<p>Gasto público en ${cy} en % del PIB. España gasta en total ${nf1.format(EU.EU27_2020.TOTAL[cy]-es("TOTAL"))} puntos menos que la media de la UE, sobre todo en sanidad y educación, y algo más en intereses de la deuda. En pensiones de jubilación está en la media.</p>`);
  const items=[["TOTAL","Total"],["GF1002","Jubilación"],["GF07","Sanidad"],["GF09","Educación"],["GF0107","Intereses"],["GF02","Defensa"]];
  const t=add(s4,"div","extable"); t.innerHTML=`<table class="glance"><thead><tr><th>País</th>${items.map(([c,l])=>`<th class="r">${l}</th>`).join("")}</tr></thead><tbody>${ctry.map(([g,n])=>`<tr${g==="ES"?' class="me"':""}><td>${g==="ES"?"<b>"+n+"</b>":n}</td>${items.map(([c])=>{ const v=g==="ES"?es(c):(EU[g]&&EU[g][c]?EU[g][c][cy]:null); return `<td class="r num">${v==null?"—":pc(v)}</td>`; }).join("")}</tr>`).join("")}</tbody></table>`;
  add(s4,"figcaption",null,`% del PIB, ${cy}. Fuente: Eurostat, COFOG. Los países gastan distinto también porque se organizan distinto: en algunos, parte de la sanidad o de las pensiones es privada y no aparece aquí.`);
  const s5=finding(B,"¿Son sostenibles las pensiones?",`<p>En el laboratorio hay un estudio que separa por qué ha crecido el gasto en pensiones y qué pasará cuando se jubilen las generaciones más numerosas, con una calculadora para probar escenarios.</p><p>${exLink("evolucion",{e:["govTot","govJub","govSan","govEdu","govInt","pib"]},"Compara la evolución del gasto con el PIB en el explorador")} · <a class="exlink" href="/preguntas/pensiones/">Leer el estudio →</a></p>`);
  panoExtra("gasto",B);
}
function govNote(){ return `<footer class="method"><details class="srcs"><summary>De dónde salen los datos</summary><p>Eurostat: gasto de las administraciones públicas por funciones (clasificación COFOG, 1995–${GOV.years[GOV.years.length-1]}), cuentas públicas, deuda pública, PIB, gasto y beneficiarios de pensiones, población y proyecciones de población (EUROPOP2023). Las administraciones públicas incluyen Estado, comunidades autónomas, ayuntamientos y Seguridad Social, sin contar dos veces lo que se transfieren entre ellas.</p></details><p><b>Cómo leerlos.</b> «Jubilación» es la función de vejez de COFOG: sobre todo pensiones de jubilación, también servicios para mayores. El gasto total en pensiones (con viudedad, incapacidad y otras) es mayor: en el estudio de pensiones se usa esa cifra.</p></footer>`; }

// ---------- estudio: pensiones ----------
let PSC={emp:0,ben:0,cov:0};
async function studyPens(B){
  const AB=abstract(B);
  const [,PI]=await Promise.all([loadGov(),getJSON("/data/piramide.json").catch(()=>null)]);
  const P=GOV.pen, yrs=Object.keys(P.exp).map(Number).sort(), Y=yrs[yrs.length-1];
  const ex=y=>P.exp[y], ben=y=>P.ben[y], emp=y=>P.emp[y]*1000, gdpY=y=>GOV.gdp[gy(y)];
  const Dn=y=>({r:ben(y)/emp(y), g:(ex(y)/100*gdpY(y)*1e6/ben(y))/(gdpY(y)*1e6/emp(y))});
  const S0=ex(Y), DEP=y=>P.proj[Math.min(2100,y)], H=26, LIM_PTS=3, LIM=S0+LIM_PTS, GDPM=gdpY(Y); // GDPM: millones de euros
  // ---------- el modelo: gasto/PIB = pensionistas por ocupado × peso de cada pensión frente a lo que produce un ocupado ----------
  // dependencia (Eurostat) × (1 − 5 % por cada año de jubilación más tardía) ÷ empleo ÷ población activa extra, y el peso de cada pensión cambia un G % al año.
  // Los mandos (empleo, población activa, jubilación) actúan de forma lineal hasta 2050 (H años) y se quedan ahí.
  const model=(q,y)=>{ const t=y-Y, f=Math.min(1,t/H);
    return S0*(DEP(y)/DEP(Y))*(1-0.05*q.D*f)/((1+q.E/100*f)*(1+q.M/100*f))*Math.pow(1+q.G/100,t); };
  const years=d3.range(Y,2071), path=q=>years.map(y=>model(q,y));
  const real0=ex(Y)/100*GDPM*1e6/ben(Y)/14;   // pensión media mensual, 14 pagas, euros de ese año
  const realAt=(q,y)=>real0*Math.pow((1+q.p/100)*(1+q.G/100),y-Y);
  // ---------- lo que ha pasado: 2013–último año ----------
  const y13=2013, a13=Dn(y13), bY=Dn(Y);
  const Ghist=(Math.pow(bY.g/a13.g,1/(Y-y13))-1)*100;
  const sPast=ex(y13), sAfterR=sPast*bY.r/a13.r, dR=sAfterR-sPast, dG=ex(Y)-sAfterR;   // puntos de PIB (secuencial)
  const cfG=ex(Y)*a13.g/bY.g, ahorroG=ex(Y)-cfG;                                       // «si cada pensión pesara como en 2013»
  const eurMM=pts=>pts/100*GDPM/1000;                                                  // puntos de PIB → miles de millones de euros
  // ---------- escenarios ----------
  const SC=[
    {k:"nada",n:"Nada cambia",q:{E:0,M:0,D:0,G:0,p:1},d:"Solo demografía"},
    {k:"deriva",n:"La deriva de estos años sigue",q:{E:0,M:0,D:0,G:Ghist,p:1},d:"Cada pensión sigue ganando peso"},
    {k:"ipc",n:"Las pensiones suben con el IPC",q:{E:0,M:0,D:0,G:-1,p:1},d:"Cada pensión pierde peso"},
    {k:"reformas",n:"Lo previsto tras las reformas",q:{E:5,M:5,D:1,G:-1,p:1},d:"IPC, un año más de trabajo, más empleo y más población activa"},
    {k:"trabajo",n:"Más empleo e inmigración, sin tocar las pensiones",q:{E:10,M:10,D:0,G:0,p:1},d:"Trabaja más gente, pero cada pensión pesa igual"},
    {k:"tarde",n:"Jubilarse tres años más tarde",q:{E:0,M:0,D:3,G:0,p:1},d:"Solo la edad efectiva de jubilación"},
    {k:"equilibrio",n:"Un futuro que cabe",q:{E:10,M:10,D:2,G:-0.7,p:1},d:"Un poco de todo"}];
  SC.forEach(s=>{ s.s50=model(s.q,2050); s.s70=model(s.q,2070); s.ok=s.s50<=LIM; s.real50=realAt(s.q,2050); s.peso50=(Math.pow(1+s.q.G/100,2050-Y)-1)*100; });
  const sc=Object.fromEntries(SC.map(s=>[s.k,s]));
  const SHOW=["nada","reformas","equilibrio"], SCS=SC.filter(s=>SHOW.includes(s.k));   // los que se cuentan en el texto y se ofrecen en el simulador
  // palancas sueltas (cada una con un valor ambicioso, el resto sin cambios)
  const solo={E:model({E:10,M:0,D:0,G:0,p:1},2050),M:model({E:0,M:10,D:0,G:0,p:1},2050),D:model({E:0,M:0,D:3,G:0,p:1},2050)};
  // ---------- gráficos ----------
  const G={}, SUB=[]; const ST={E:5,M:5,D:1,G:-1,p:1,tau:LIM_PTS};
  const lim=()=>S0+ST.tau;
  G.demografia=d=>{ const dy=[...new Set([...Object.keys(P.olddep),...Object.keys(P.proj)])].map(Number).sort().filter(y=>y>=1995&&y<=2070);
    lineChart(d,{title:"Mayores de 65 por cada 100 personas de 15 a 64",source:"Hasta 2025, datos; después, proyección base de Eurostat (EUROPOP2023).",series:[{n:"España",v:dy.map(y=>P.olddep[y]??P.proj[y]),c:"--rust",main:true},{n:"UE-27",v:dy.map(y=>P.olddepEU[y]??P.projEU[y]),c:"--slate"}],years:dy,xticks:[1995,2025,2050,2070],fmt:v=>nf1.format(v),height:280}); };
  G.piramide=d=>{ if(!PI||!PI.es) return; const T=PI.es.H.map((h,i)=>h+PI.es.M[i]), gr=PI.grupos;
    const rows=gr.map((g,i)=>({l:g,v:T[i]/1e6,c:i>=13?"--rust":(i>=10?"--mustard":"--stone")})); const f=fig(d,{title:"Población de España por edad, 1 de enero de 2025 (millones de personas, tramos de cinco años)",source:"En granate, 65 años o más; en ocre, 50 a 64, los que se jubilarán en los próximos quince años. Fuente: INE, Estadística Continua de Población."});
    hbars(f.body,rows,{fmt:v=>nf1.format(v)+" M",max:Math.max(...rows.map(r=>r.v))}); };
  G.pasado=d=>{ const f=fig(d,{title:`Qué ha movido el gasto en pensiones entre ${y13} y ${Y} (puntos de PIB)`,source:`Del ${pc(sPast)} al ${pc(ex(Y))} del PIB. Se aplican los cambios uno tras otro: primero los pensionistas por ocupado, luego el peso de cada pensión. Fuente: Eurostat; cálculo de Indicio.`});
    hbars(f.body,[{l:"Pensionistas por cada ocupado",v:dR,c:"--olive"},{l:"Peso de cada pensión frente a lo que produce un ocupado",v:dG,c:"--rust"},{l:"Total",v:ex(Y)-sPast,c:"--ink"}],{fmt:v=>(v<0?"−":"+")+nf1.format(Math.abs(v))+" pts",min:-2,max:2.5});
    const g2=add(d,"div","cols2"), ys=yrs.filter(y=>y>=y13&&ben(y)&&emp(y)), xt=[ys[0],ys[Math.floor(ys.length/2)],ys[ys.length-1]];
    lineChart(g2,{title:"Pensionistas por cada ocupado",source:"Ocupados de 20 a 64 años. Fuente: Eurostat.",series:[{n:"España",v:ys.map(y=>Dn(y).r),c:"--olive",main:true}],years:ys,xticks:xt,fmt:v=>nf2.format(v),tickFmt:v=>nf2.format(v)});
    lineChart(g2,{title:"Peso de cada pensión frente al PIB por ocupado",source:"Gasto por pensionista dividido entre el PIB por ocupado. Fuente: Eurostat.",series:[{n:"España",v:ys.map(y=>Dn(y).g*100),c:"--rust",main:true}],years:ys,xticks:xt,fmt:pc,tickFmt:v=>nf0.format(v)+"%"}); };
  const pathChart=(d,s,opt={})=>lineChart(d,{title:opt.title,source:opt.source,series:[{n:"Gasto en pensiones",v:path(s.q),c:s.ok?"--ok":"--rust",main:true},{n:"Límite",v:years.map(()=>LIM),c:"--stone",dash:true}],years,xticks:[Y,2050,2070],fmt:pc,tickFmt:v=>nf0.format(v)+"%",height:opt.h||200});
  const card=(d,s)=>{ const c=add(d,"div","pn-card"+(s.ok?" ok":" ko")); c.innerHTML=`<div class="pn-h"><b>${esc(s.d)}</b><span class="pn-v">${pc(s.s50)}<small> del PIB en 2050</small></span></div><div class="pn-c ${s.ok?"ok":"ko"}">${s.ok?`Cabe: ${nf1.format(LIM-s.s50)} puntos por debajo del límite`:`No cabe: se pasa ${nf1.format(s.s50-LIM)} puntos (unos ${nf0.format(eurMM(s.s50-LIM))} mil millones de euros al año de hoy)`}</div>`;
    const ch=add(c,"div","pn-ch"); pathChart(ch,s,{h:190,title:"Gasto en pensiones, % del PIB"});
    const m=add(c,"p","pn-m"); m.innerHTML=`Pensión media en 2050, en euros de hoy: <b>${nf0.format(s.real50)}${NB}€ al mes</b> (hoy, ${nf0.format(real0)}${NB}€). ${Math.abs(s.peso50)<0.5?"Cada pensión pesaría lo mismo que hoy frente a lo que produce un ocupado.":`Frente a lo que produce un ocupado, cada pensión pesaría un ${nf0.format(Math.abs(s.peso50))}${NB}% ${s.peso50<0?"menos":"más"}.`}`; };
  SC.forEach(s=>{ G["esc_"+s.k]=d=>card(d,s); });
  G.todos=d=>{ const cols=["--rust","--slate","--ok"];
    lineChart(d,{title:"Los tres futuros: gasto en pensiones, % del PIB",sub:`Línea discontinua: límite de hoy más ${LIM_PTS} puntos`,source:"Simulación de Indicio con la proyección demográfica de Eurostat; no es una previsión.",series:[...SCS.map((s,i)=>({n:{reformas:"Lo previsto"}[s.k]||s.n,v:path(s.q),c:cols[i]})),{n:"Límite",v:years.map(()=>LIM),c:"--ink",dash:true}],years,xticks:[Y,2050,2070],fmt:pc,tickFmt:v=>nf0.format(v)+"%",height:340}); };
  G.gasto=d=>{ const ys=yrs.filter(y=>y>=2000);
    lineChart(d,{title:"Gasto en pensiones, % del PIB",source:"Gasto total en pensiones de las administraciones públicas y la Seguridad Social. Fuente: Eurostat.",series:[{n:"España",v:ys.map(y=>ex(y)),c:"--rust",main:true}],years:ys,xticks:[2000,2008,2013,Y],fmt:pc,tickFmt:v=>nf0.format(v)+"%"}); };
  const vej=c=>c==="ES"?GOV.fun.GF1002.pib[GOV.fun.GF1002.pib.length-1]:GOV.eu[c].GF1002[GOV.years[GOV.years.length-1]];
  G.ue=d=>{ const rows=[["ES","España"],["EU27_2020","Media de la UE"],["DE","Alemania"],["FR","Francia"],["IT","Italia"],["NL","Países Bajos"],["PT","Portugal"],["SE","Suecia"]].map(([c,l])=>({l,v:vej(c),c:c==="ES"?"--rust":"--stone"})).sort((a,b)=>b.v-a.v);
    const f=fig(d,{title:`Gasto en jubilación en ${GOV.years[GOV.years.length-1]}, % del PIB`,source:"Función «vejez» de las cuentas de las administraciones públicas (COFOG), que cubre sobre todo las pensiones de jubilación. Es más estrecha que el total de pensiones. Fuente: Eurostat."});
    hbars(f.body,rows,{fmt:pc,min:0}); };
  G.palancas=d=>{ const rows=[{l:"Nada cambia",v:sc.nada.s50,c:"--stone"},{l:"Pensiones con el IPC",v:sc.ipc.s50,c:"--slate"},{l:"Jubilarse 3 años más",v:solo.D,c:"--slate"},{l:"Empleo +10 %",v:solo.E,c:"--slate"},{l:"Inmigración +10 %",v:solo.M,c:"--slate"},{l:"Empleo + inmigración",v:sc.trabajo.s50,c:"--slate"},{l:"Las cuatro a la vez",v:sc.equilibrio.s50,c:"--ok"}];
    const f=fig(d,{title:"Gasto en pensiones en 2050 con cada palanca por separado, % del PIB",source:`Cada fila cambia solo lo indicado y deja el resto como hoy. «Inmigración +10 %» es un 10 % más de población en edad de trabajar; «Empleo + inmigración», las dos a la vez. La línea marca el límite (${pc(LIM)}). «Las cuatro a la vez»: un 10 % más de empleo y de población en edad de trabajar, dos años más de jubilación y pensiones que pesan un 0,7 % menos cada año. Simulación de Indicio.`});
    hbars(f.body,rows,{fmt:pc,min:0,ref:LIM,refLabel:"Límite"}); };
  // mapa: con los otros mandos del simulador, qué combinaciones de empleo (columnas) y peso de cada pensión (filas) caben
  const EX=d3.range(0,21,2), GY=d3.range(1.5,-2.01,-0.25);
  G.mapa=d=>{ const f=fig(d,{title:"¿Cabe? Combinaciones de empleo y peso de cada pensión, gasto en 2050",source:"Verde: cabe dentro del límite; rojo: se pasa. El resto de mandos, los del simulador de abajo. Pasa el ratón para ver el gasto de cada casilla."});
    const box=add(f.body,"div","pn-map"); const note=add(f,"p","pn-note");
    const draw=()=>{ const cw=44, ch=22, ml=84, mt=8, W=ml+EX.length*cw+8, Hh=mt+GY.length*ch+40, L=lim(); let ok=0;
      const cells=[]; GY.forEach((g,j)=>EX.forEach((e,i)=>{ const v=model({...ST,E:e,G:g},2050), good=v<=L; if(good) ok++; cells.push({x:ml+i*cw,y:mt+j*ch,v,good,e,g}); }));
      const mx=Math.max(...cells.map(c=>c.v)), op=c=>c.good?0.25+0.6*Math.min(1,(L-c.v)/6):0.2+0.65*Math.min(1,(c.v-L)/(mx-L||1));
      box.innerHTML=`<svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Mapa de combinaciones que caben">`+cells.map(c=>`<rect x="${c.x}" y="${c.y}" width="${cw-1}" height="${ch-1}" rx="2" style="fill:${c.good?"var(--ok,#3f7a4a)":"var(--ko,#b0303f)"};fill-opacity:${op(c).toFixed(2)}"><title>Empleo +${c.e}${NB}%, peso de cada pensión ${c.g>0?"+":""}${nf2.format(c.g)}${NB}% al año: ${nf1.format(c.v)}${NB}% del PIB</title></rect>`).join("")
        +GY.map((g,j)=>(Math.abs(g*2-Math.round(g*2))<1e-9)?`<text x="${ml-8}" y="${mt+j*ch+ch/2+4}" text-anchor="end" class="lab">${g>0?"+":g<0?"−":""}${nf1.format(Math.abs(g))}${NB}%</text>`:"").join("")
        +EX.map((e,i)=>i%2===0?`<text x="${ml+i*cw+cw/2}" y="${mt+GY.length*ch+14}" text-anchor="middle" class="lab">+${e}${NB}%</text>`:"").join("")
        +`<text x="${ml+EX.length*cw/2}" y="${Hh-4}" text-anchor="middle" class="lab">Más gente con empleo, en 2050</text><text x="10" y="${mt+GY.length*ch/2}" class="lab" transform="rotate(-90 10 ${mt+GY.length*ch/2})" text-anchor="middle">Peso de cada pensión, % al año</text>`
        +`<rect x="${ml+Math.min(EX.length-1,Math.round(ST.E/2))*cw}" y="${mt+Math.max(0,Math.min(GY.length-1,Math.round((1.5-ST.G)/0.25)))*ch}" width="${cw-1}" height="${ch-1}" rx="2" fill="none" stroke="var(--ink)" stroke-width="2"/></svg>`;
      note.innerHTML=`Con los demás mandos como están (población activa +${ST.M}${NB}%, jubilación +${nf1.format(ST.D)} años, límite ${pc(L)}), caben <b>${ok} de ${cells.length}</b> combinaciones. El recuadro marca tu combinación actual.`; };
    SUB.push(draw); draw(); };
  G.simulador=d=>{ const w=add(d,"div","calc pn-sim"), ctl=add(w,"div","ctl"), out=add(w,"div","res");
    const defs=[["E","Más gente con empleo","+%",0,20,1,"Hoy tienen empleo 72 de cada 100 personas de 20 a 64 años; en los Países Bajos, 83 (Eurostat, 2025). Un +10 % llevaría a España a unos 80."],
      ["M","Más población en edad de trabajar (inmigración)","+%",0,15,1,"Cada 100.000 personas netas extra al año entre 2025 y 2050 son unos 2,5 millones: un +7,7 % sobre los 32,6 millones de 15 a 64 años de hoy. Se supone que trabajan como el resto."],
      ["D","Jubilación efectiva más tardía","años",0,3,0.5,"Cada año de retraso reduce en torno a un 5 % los pensionistas. Es una aproximación."],
      ["G","Peso de cada pensión frente a lo que produce un ocupado","% al año",-2,1.5,0.1,`Desde ${y13} ha subido un ${nf1.format(Ghist)}${NB}% al año. Con 0, la pensión media crece como la productividad; por debajo, menos.`],
      ["tau","Lo que aceptamos pagar de más","puntos de PIB",0,6,0.5,`Hoy, ${pc(S0)} del PIB. Cada punto son unos ${nf0.format(eurMM(1))} mil millones de euros al año.`],
      ["p","Productividad (crecimiento real del PIB por ocupado)","% al año",0,2,0.1,"Un supuesto, no un dato. Solo afecta a la pensión en euros de hoy."]];
    ctl.innerHTML=defs.map(([k,l,u,a,b,st,n])=>`<label>${l} <output data-k="${k}"></output><input type="range" min="${a}" max="${b}" step="${st}" value="${ST[k]}" data-k="${k}"><small>${n}</small></label>`).join("")
      +`<p class="muted" style="font-size:13.5px">Probar un escenario: ${SCS.map(s=>`<button type="button" class="lnk" data-sc="${s.k}">${esc(s.n)}</button>`).join(" · ")}</p>`;
    out.innerHTML='<div id="pnres"></div><div id="pnch"></div><p id="pneu" class="muted" style="font-size:14px"></p>';
    const fmtO=(k,v)=>k==="D"?`+${nf1.format(v)} años`:k==="tau"?`${nf1.format(v)} puntos`:k==="G"||k==="p"?`${v>0&&k==="G"?"+":""}${nf1.format(v)}${NB}%`:`+${v}${NB}%`;
    const upd=()=>{ const q={...ST}, L=lim(), s50=model(q,2050), s70=model(q,2070), ok=s50<=L;
      ctl.querySelectorAll("output").forEach(o=>o.textContent=fmtO(o.dataset.k,ST[o.dataset.k]));
      out.querySelector("#pnres").innerHTML=`<div class="big">${pc(s50)} <span class="muted" style="font-size:16px;font-weight:400">del PIB en 2050</span></div><p><b style="color:var(--${ok?"ok":"ko"})">${ok?`Cabe: ${nf1.format(L-s50)} puntos por debajo del límite (${pc(L)}).`:`No cabe: se pasa ${nf1.format(s50-L)} puntos del límite (${pc(L)}), unos ${nf0.format(eurMM(s50-L))} mil millones de euros al año de hoy.`}</b> En 2070, ${pc(s70)}.</p>`;
      const ch=out.querySelector("#pnch"); ch.innerHTML=""; lineChart(ch,{title:"Gasto en pensiones, % del PIB",series:[{n:"Gasto",v:path(q),c:ok?"--ok":"--rust",main:true},{n:"Límite",v:years.map(()=>L),c:"--stone",dash:true}],years,xticks:[Y,2050,2070],fmt:pc,tickFmt:v=>nf0.format(v)+"%",height:200});
      const r50=realAt(q,2050); out.querySelector("#pneu").innerHTML=`Pensión media en 2050, en euros de hoy: <b>${nf0.format(r50)}${NB}€ al mes</b> (hoy, ${nf0.format(real0)}${NB}€). De cada 100${NB}€ que produce un ocupado, ${nf0.format(s50)} irían a pensiones.`;
      SUB.forEach(f=>f()); };
    ctl.querySelectorAll("input").forEach(i=>i.addEventListener("input",()=>{ ST[i.dataset.k]=+i.value; upd(); }));
    ctl.querySelectorAll("button[data-sc]").forEach(b=>b.addEventListener("click",()=>{ const s=sc[b.dataset.sc]; Object.assign(ST,{E:s.q.E,M:s.q.M,D:s.q.D,G:Math.round(s.q.G*10)/10,p:s.q.p}); ctl.querySelectorAll("input").forEach(i=>i.value=ST[i.dataset.k]); upd(); }));
    upd(); };
  // ---------- variables del texto ----------
  const popM=(a,b)=>PI&&PI.es?[...PI.es.H.slice(a,b),...PI.es.M.slice(a,b)].reduce((x,y)=>x+y,0):0;
  const pens=ben(Y), cot=GOV.main.D61REC.pib[gy(Y)];
  const V={gasto0:S0,gastoMM:ex(Y)/100*GDPM/1000,gastoAnt:ex(2000),yAnt:2000,Y,m5064:popM(10,13)/1e6,p65:popM(13,21)/1e6,m1564:popM(3,13)/1e6,
    dep0:P.olddep[2025],dep50:P.proj[2050],dep70:P.proj[2070],depEU50:P.projEU[2050],sPast,sAfterR,cfG,pensX:pens/1e6,
    r13:a13.r,rY:bY.r,g13:a13.g*100,gY:bY.g*100,dR,dG,tot:ex(Y)-sPast,ahorroG,ahorroGMM:eurMM(ahorroG),Ghist,y13,
    real0,lim:LIM,limP:LIM_PTS,limMM:eurMM(LIM_PTS),cot,sNada:sc.nada.s50,sDeriva:sc.deriva.s50,sIpc:sc.ipc.s50,sRef:sc.reformas.s50,sTrabajo:sc.trabajo.s50,sTarde:sc.tarde.s50,sEq:sc.equilibrio.s50,
    sNada70:sc.nada.s70,sIpcPeso:Math.abs(sc.ipc.peso50),sIpcReal:sc.ipc.real50,sEqReal:sc.equilibrio.real50,sEqPeso:Math.abs(sc.equilibrio.peso50),sTrabajoReal:sc.trabajo.real50,
    sIpc70:sc.ipc.s70,sRefEx:Math.abs(sc.reformas.s50-LIM),mm1:eurMM(1),soloE:solo.E,soloM:solo.M,soloD:solo.D,nOk:SC.filter(s=>s.ok).length,
    sNadaEx:sc.nada.s50-LIM,sNadaMM:eurMM(sc.nada.s50-LIM),sDerivaEx:sc.deriva.s50-LIM,
    aireF:16.1,fedea:17.1,empEs:72.4,empNl:83.4,empUe:76.1};
  const MAPOK=(()=>{ let n=0,t=0; GY.forEach(g=>EX.forEach(e=>{ t++; if(model({E:e,M:0,D:0,G:g,p:1},2050)<=LIM) n++; })); return {n,t}; })();
  V.mapaN=MAPOK.n; V.mapaT=MAPOK.t;
  { const eur=y=>ex(y)/100*gdpY(y);
    Object.assign(V,{subidaTot:S0-ex(2000),subida0813:ex(2013)-ex(2008),subida13Y:S0-ex(2013),shareCrisis:(ex(2013)-ex(2008))/(S0-ex(2000))*100,
      gastoCrece:(eur(2013)/eur(2008)-1)*100,pibCaida:-(gdpY(2013)/gdpY(2008)-1)*100,pibCovid:-(gdpY(2020)/gdpY(2019)-1)*100,gastoCovid:(eur(2020)/eur(2019)-1)*100,
      vejES:vej("ES"),vejEU:vej("EU27_2020"),vejFR:vej("FR"),vejIT:vej("IT"),depEU0:P.olddepEU[2025]}); }
  // frontera: peso de cada pensión más alto con el que aún cabe, con y sin ayudas del resto de mandos
  const gMax=(E,M,D)=>{ let lo=-5,hi=5; for(let i=0;i<40;i++){ const m=(lo+hi)/2; if(model({E,M,D,G:m,p:1},2050)<=LIM) lo=m; else hi=m; } return lo; };
  V.gFrontNada=gMax(0,0,0); V.gFrontTodo=gMax(10,10,2); V.gFrontRef=gMax(5,5,1);
  mdRender(B,"pensiones",V,G);
  AB.fill({lede:null});
  methods(B,[["Qué se hace","Se cuenta primero qué ha movido el gasto en pensiones desde 2013 y después se prueba cada palanca por separado y se simulan tres futuros hasta 2070 con un modelo de una línea alimentado por la proyección demográfica de Eurostat. Es un ejercicio de escenarios, no una previsión."],["Modelo",`Gasto/PIB = pensionistas por ocupado × peso de cada pensión (pensión media / PIB por ocupado). Hasta 2024 son datos de Eurostat. Después, los pensionistas por ocupado siguen la dependencia proyectada (mayores de 65 por cada 100 de 15 a 64, EUROPOP2023, escenario base), ajustada por tres mandos que actúan de forma lineal hasta 2050: el empleo, la población en edad de trabajar y la edad efectiva de jubilación (un 5 % menos de pensionistas por cada año de retraso); y el peso de cada pensión cambia un G % al año. Base: ${Y}.`],["Qué deja fuera","Carreras de cotización por cohortes, la estructura de edades de los inmigrantes, la inflación y la productividad como variables propias (la productividad solo entra en el cálculo de la pensión en euros de hoy), los efectos de segunda vuelta (más empleo cambia la productividad) y los ingresos del sistema."],["Límite","«Sostenible» aquí significa que el gasto no pasa de la cifra de hoy más 3 puntos de PIB (16,2 %, cerca de la proyección de la AIReF, 16,1 %). Es una elección, no un dato: el simulador la deja mover."],["Peso de cada pensión",`Gasto por pensionista dividido entre el PIB por ocupado (ocupados de 20 a 64 años, EPA). Entre ${y13} y ${Y} ha subido un ${nf1.format(Ghist)}${NB}% al año; incluye la revalorización, que las nuevas pensiones son más altas que las que se extinguen y cambios en la composición.`],["Referencias","AIReF: 16,1 % del PIB en 2050; Fedea: 17,1 % (BBVA Mi jubilación). Tasas de empleo de 20 a 64 años de 2025: España 72,4 %, UE 76,1 %, Países Bajos 83,4 % (Eurostat, vía Destatis)."]]);
  const ft=document.querySelector("footer.method"); if(ft) ft.outerHTML=govNote();
}
// =====================================================================
// PIEZAS COMUNES DEL REDISEÑO: minigráficos, mapa vivo, buscador grande
// =====================================================================
const EXAMPLES=[["28079","Madrid"],["46166","Meliana"],["44216","Teruel"],["36057","Vigo"],["41091","Sevilla"],["49275","Zamora"]];
const isDark=()=>document.documentElement.dataset.theme==="dark";
const DARKER=()=>isDark()?"Cuanto más claro, más alto.":"Cuanto más oscuro, más alto.";
const st=c=>`style="fill:var(${c})"`;
// líneas pequeñas: a (principal) y b (referencia, discontinua); ambas en base 100 si index
function miniLines(a,b,{w=200,h=50,index=true,pad=4}={}){
  const firstOk=arr=>arr?arr.find(v=>v!=null):null;
  const nz=arr=>!arr?null:index?arr.map(v=>v==null||!firstOk(arr)?null:v/firstOk(arr)*100):arr;
  const A=nz(a), B=nz(b), all=[...(A||[]),...(B||[])].filter(v=>v!=null); if(!all.length) return "";
  let lo=d3.min(all), hi=d3.max(all); if(hi-lo<1e-9){ lo-=1; hi+=1; }
  const n=Math.max(A?A.length:0,B?B.length:0), X=i=>pad+i/(n-1||1)*(w-2*pad), Y=v=>h-pad-(v-lo)/(hi-lo)*(h-2*pad);
  const pl=arr=>arr.map((v,i)=>v==null?null:`${X(i).toFixed(1)},${Y(v).toFixed(1)}`).filter(Boolean).join(" ");
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">${B?`<polyline points="${pl(B)}" style="fill:none;stroke:var(--muted);stroke-width:1.5;stroke-dasharray:3 3" vector-effect="non-scaling-stroke"/>`:""}${A?`<polyline points="${pl(A)}" style="fill:none;stroke:var(--rust);stroke-width:2.5;stroke-linejoin:round" vector-effect="non-scaling-stroke"/>`:""}</svg>`;
}
// barra apilada pequeña: parts=[[valor,color]]
function miniStack(parts,{w=160,h=26}={}){
  const t=d3.sum(parts,p=>p[0]||0)||1; let x=0;
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">${parts.map(([v,c])=>{ const ww=(v||0)/t*w; const r=`<rect x="${x.toFixed(1)}" y="${h*.25}" width="${Math.max(0,ww-1).toFixed(1)}" height="${h*.5}" style="fill:${c.startsWith("#")?c:`var(${c})`}"/>`; x+=ww; return r; }).join("")}</svg>`;
}
// barras horizontales pequeñas: rows=[[valor,color]]
function miniBars(rows,{w=200,h=40,max}={}){
  const mx=max||d3.max(rows,r=>Math.abs(r[0]))||1, gap=Math.min(3,h/rows.length/3), bh=Math.max(.5,(h-(rows.length-1)*gap)/rows.length);
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">${rows.map(([v,c],i)=>`<rect x="0" y="${(i*(bh+gap)).toFixed(1)}" width="${Math.max(2,Math.abs(v)/mx*w).toFixed(1)}" height="${bh.toFixed(1)}" style="fill:var(${c})"/>`).join("")}</svg>`;
}
// n de cada diez, en cuadraditos
function miniTen(n,{w=200,h=34}={}){ const s=w/10; return `<svg viewBox="0 0 ${w} ${h}" aria-hidden="true">${d3.range(10).map(i=>`<rect x="${(i*s+1).toFixed(1)}" y="${(h-s+2)/2}" width="${(s-3).toFixed(1)}" height="${(s-3).toFixed(1)}" rx="2" style="fill:var(${i<n?"--rust":"--rule-2"})"/>`).join("")}</svg>`; }
// nube de puntos pequeña
function miniScatter(x,y,{w=200,h=60,n=260}={}){
  const pts=rowsAll().filter(r=>r[F[x]]!=null&&r[F[y]]!=null&&(r[F.pop]||0)>=5000); if(!pts.length) return "";
  const step=Math.max(1,Math.floor(pts.length/n)), s=pts.filter((_,i)=>i%step===0);
  const xs=s.map(r=>r[F[x]]).sort(d3.ascending), ys=s.map(r=>r[F[y]]).sort(d3.ascending);
  const X=d3.scaleLinear().domain([d3.quantile(xs,.02),d3.quantile(xs,.98)]).range([4,w-4]).clamp(true), Y=d3.scaleLinear().domain([d3.quantile(ys,.02),d3.quantile(ys,.98)]).range([h-4,4]).clamp(true);
  return `<svg viewBox="0 0 ${w} ${h}" aria-hidden="true">${s.map(r=>`<circle cx="${X(r[F[x]]).toFixed(1)}" cy="${Y(r[F[y]]).toFixed(1)}" r="1.8" style="fill:var(--rust);opacity:.55"/>`).join("")}</svg>`;
}
const bigSearchHTML=(id,ph)=>`<div class="search bigsearch" id="${id}-s" role="combobox" aria-expanded="false" aria-haspopup="listbox">
  <svg width="17" height="17" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.6"/><path d="M11 11l3.5 3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
  <input id="${id}" type="search" placeholder="${ph||"Escribe tu municipio…"}" autocomplete="off" aria-label="Buscar un municipio" aria-autocomplete="list" aria-controls="${id}-r"><ul id="${id}-r" class="results" role="listbox" hidden></ul></div>`;
const bindBig=(id,onPick)=>attachSearch(document.getElementById(id),document.getElementById(id+"-r"),document.getElementById(id+"-s"),onPick);
const exampleChips=()=>{ const ex=EXAMPLES.filter(([c])=>BYCODE.has(c)).slice(0,4); const lm=lastMun&&BYCODE.has(lastMun)?lastMun:null;
  return `<div class="chipsq">${lm?`<a href="#m${lm}"><b>Seguir con ${esc(dispName(BYCODE.get(lm)[F.name]))}</b></a>`:""}<span>${lm?"o prueba:":"O prueba:"}</span>${ex.filter(([c])=>c!==lm).map(([c,n])=>`<a href="#m${c}">${n}</a>`).join("")}</div>`; };

// mapa de España por municipios con capas que se pueden cambiar
function spainMap(box,{onClick,width=560,height=440}={}){
  const regions=topojson.feature(TOPO,TOPO.objects.autonomous_regions); regions.features.forEach(rewind);
  const proj=d3.geoConicConformalSpain().fitSize([width,height],regions), path=d3.geoPath(proj);
  const svg=d3.select(box).append("svg").attr("viewBox",`0 0 ${width} ${height}`).attr("role","img").style("display","block").style("width","100%").style("max-width",width+"px").style("height","auto").style("margin","0 auto");
  const g=svg.append("g");
  const ps=g.selectAll("path").data(FEATS).join("path").attr("d",path).attr("stroke",css("--geo-line")).attr("stroke-width",.12).attr("fill",css("--nodata"));
  if(onClick) ps.style("cursor","pointer").on("click",(e,f)=>{ if(BYCODE.has(f.id)) onClick(f.id); });
  g.append("path").datum(topojson.mesh(TOPO,TOPO.objects.provinces,(a,b)=>a!==b)).attr("fill","none").attr("stroke",css("--geo-line")).attr("stroke-width",.5).attr("d",path);
  g.append("path").attr("d",proj.getCompositionBorders()).attr("fill","none").attr("stroke",css("--muted")).attr("stroke-width",.6);
  const api={svg,paths:ps,proj,path,
    set(k,{dur=900}={}){ const fi=F[k]; const ramp=[0,1,2,3,4,5,6].map(i=>css("--ramp-"+i));
      const vals=rowsAll().map(r=>r[fi]).filter(v=>v!=null), sc=d3.scaleQuantile().domain(vals).range(ramp);
      ps.transition().duration(dur).attr("fill",f=>{ const r=BYCODE.get(f.id); return r&&r[fi]!=null?sc(r[fi]):css("--nodata"); }); return sc; },
    setCat(k,colorOf){ const fi=F[k]; ps.attr("fill",f=>{ const r=BYCODE.get(f.id); return r&&r[fi]?colorOf(r[fi]):css("--nodata"); }); },
    mark(code){ g.selectAll(".mk").remove(); const ft=FEATS.find(x=>x.id===code); if(!ft) return; const [cx,cy]=path.centroid(ft); g.append("circle").attr("class","mk").attr("cx",cx).attr("cy",cy).attr("r",7).attr("fill","none").attr("stroke",css("--ink")).attr("stroke-width",1.6); }};
  return api;
}

// cifras que se repiten en portada, temas y tarjetas
const loseShare=()=>{ const rws=rowsAll().filter(r=>r[F.var0525]!=null); return rws.filter(r=>r[F.var0525]<0).length/rws.length*100; };
const paroNow=()=>REFS.paro.es.last[0], paro15=()=>REFS.paro.es.paro[0];
const mill=v=>nf1.format(v/1e6)+NB+"M";
const jubShare=()=>{ const Y=+GOV.years[GOV.years.length-1]; return gv("GF1002","meur",Y)/gv("TOTAL","meur",Y)*100; };
const lastV=a=>last(a)[0];
const VG=()=>VREFS.elections.filter(k=>k.startsWith("02")).pop();

// =====================================================================
// INICIO
// =====================================================================
// =====================================================================
// PANORAMAS: bloques comunes al final de cada tema (más contexto y los análisis del tema)
// =====================================================================
const BANDS=()=>Object.keys(REFS.band).sort((a,b)=>+a-+b).map((k,i)=>({k,l:REFS.bandLabels[i].replace(" hab.","").replace("menos de ","< ").replace("más de ","> "),s:REFS.band[k]}));
function themeStudies(B,tema){
  const L=STUDIES.filter(S=>S.tema===tema&&!S.href); if(!L.length) return;
  const s=finding(B,"Para ir más allá: los análisis de este tema",`<p>Cada uno responde a una pregunta concreta con datos y con el método a la vista: qué se compara, con quién, y cuánto aguanta el resultado.</p>`);
  const g=add(s,"div","tstud");
  L.forEach(S=>{ const a=add(g,"a"); a.href=`/preguntas/${S.id}/`; const ic=illCard(S.id); if(ic) a.appendChild(ic); a.insertAdjacentHTML("beforeend",`<b>${esc(S.t)}</b><span>${esc(S.a)}</span><em>Leer el análisis →</em>`); });
}
function panoExtra(id,B){
  try{
    const es=REFS.es, BS=BANDS(), lastY=a=>{ const [v,y]=last(a); return {v,y}; }, firstY=a=>{ const [v,y]=first(a); return {v,y}; };
    if(id==="riqueza"){
      const u=lastY(es.pov_u18), u0=firstY(es.pov_u18), o=lastY(es.pov_o65), o0=firstY(es.pov_o65), a=lastY(es.pov_1864);
      const s=finding(B,`La pobreza tiene cara de niño: ${deCadaDiez(u.v)} menores viven en hogares pobres`,`<p>El riesgo de pobreza (vivir en un hogar con menos del 60${NB}% de la renta mediana) no se reparte igual por edades. En ${u.y} afectaba al ${pc(u.v)} de los menores de 18 años, al ${pc(a.v)} de los adultos de 18 a 64 y al ${pc(o.v)} de los mayores de 65. La pobreza infantil ha bajado desde ${u0.y} (${pc(u0.v)}), pero la de los mayores ha subido (${pc(o0.v)} entonces): el umbral de pobreza sube con la renta mediana, y muchas pensiones bajas se han quedado por debajo de él.</p><p>Por eso las políticas que más pueden mover la pobreza son las que llegan a los hogares con niños: prestaciones por hijo, el Ingreso Mínimo Vital y, sobre todo, el empleo de los padres.</p>`);
      lineChart(s,{title:"Riesgo de pobreza por edad",sub:"% de personas en hogares con menos del 60 % de la renta mediana",source:"Fuente: INE, Atlas de Distribución de Renta de los Hogares.",series:[{n:"Menores de 18",v:es.pov_u18,c:"--rust",main:true},{n:"18 a 64",v:es.pov_1864,c:"--slate"},{n:"65 y más",v:es.pov_o65,c:"--mustard"}],years:YEARS,xticks:[2015,2019,2023],fmt:pc,tickFmt:v=>nf0.format(v)+" %",height:260});
      const s2=finding(B,"En los municipios grandes hay más renta, y también más desigualdad",`<p>Renta por persona e índice de Gini (0 = todos igual; 100 = uno lo tiene todo) según el tamaño del municipio. Las ciudades concentran a la vez a los hogares más ricos y a muchos de los más pobres; en los pueblos la renta es más baja, pero más pareja.</p>`);
      const g=add(s2,"div","cols2"), fa=fig(g,{title:"Renta neta por persona",source:"Último año. Fuente: INE, Atlas de Renta."}), fb=fig(g,{title:"Desigualdad (Gini)",source:"Último año. Fuente: INE, Atlas de Renta."});
      hbars(fa.body,BS.map(b=>({l:b.l,v:last(b.s.net_income_pc)[0]})),{fmt:eur,color:"--slate",min:0}); hbars(fb.body,BS.map(b=>({l:b.l,v:last(b.s.gini)[0]})),{fmt:v=>nf1.format(v),color:"--rust",min:20});
    }
    if(id==="vivienda"){
      const vt=es.vt, P=REFS.vtPeriods, per=P.map(p=>p.replace(/^(\d{4})M(\d\d)$/,(m,y,mm)=>MES[+mm].slice(0,3)+". "+y.slice(2))), iMax=vt.indexOf(d3.max(vt)), lst=vt[vt.length-1];
      const s=finding(B,`Los pisos turísticos tocaron techo en ${MES[+P[iMax].slice(5)]} de ${P[iMax].slice(0,4)} y desde entonces bajan`,`<p>El INE cuenta dos veces al año los anuncios de viviendas turísticas en las grandes plataformas. Tras el parón de la pandemia crecieron sin pausa hasta ${per[iMax]} (${nf0.format(vt[iMax])}); desde entonces han bajado un ${pc0((1-lst/vt[iMax])*100)}. Coinciden varias cosas: las prohibiciones municipales, el registro único estatal obligatorio desde julio de 2025, que obliga a cada anuncio a tener un número de registro, y la retirada de anuncios ilegales por parte de las plataformas.</p>`);
      lineChart(s,{title:"Viviendas turísticas anunciadas en España",source:"Agosto y febrero (o noviembre y mayo) de cada año. Fuente: INE, medición experimental de viviendas turísticas.",series:[{n:"Viviendas turísticas",v:vt,c:"--rust",main:true}],years:per,xticks:[per[0],per[iMax],per[per.length-1]],fmt:v=>nf0.format(v),tickFmt:v=>nf0.format(v/1000)+" mil",height:240});
      const s2=finding(B,`${cap(deCadaDiez(REFS.census.es.rented))} hogares viven de alquiler, muchos más en las islas y en la costa`,`<p>Según el censo de 2021. El alquiler pesa mucho más en Cataluña, las islas y Ceuta y Melilla, y muy poco en el interior rural, donde casi todo el mundo es propietario. Es una de las razones por las que la subida del alquiler se nota tan distinto según dónde se viva.</p>`);
      const fa=fig(s2,{title:"Hogares que viven de alquiler, por provincia",source:"% de hogares, 2021. Fuente: INE, Censo de Población y Viviendas."}); hbars(fa.body,provRows("alquiler").sort((a,b)=>b.v-a.v),{fmt:pc,scroll:true,color:"--rust",min:0,ref:REFS.census.es.rented,refLabel:"España"});
    }
    if(id==="poblacion"){
      const o=lastY(es.pct_over65), o0=firstY(es.pct_over65), u=lastY(es.pct_under18), u0=firstY(es.pct_under18);
      const s=finding(B,`Uno de cada ${nf0.format(100/o.v)} vecinos tiene más de 65 años, y en los pueblos pequeños, uno de cada ${nf0.format(100/last(BS[0].s.pct_over65)[0])}`,`<p>Los mayores de 65 han pasado del ${pc(o0.v)} al ${pc(o.v)} de la población entre ${o0.y} y ${o.y}, y los menores de 18, del ${pc(u0.v)} al ${pc(u.v)}. El envejecimiento es mucho más intenso en los municipios pequeños: en los de menos de 1.000 habitantes, los mayores son el ${pc(last(BS[0].s.pct_over65)[0])}; en las ciudades de más de 100.000, el ${pc(last(BS[BS.length-1].s.pct_over65)[0])}. Es la otra cara de la despoblación: los pueblos no solo pierden gente, pierden a los que tendrían hijos.</p>`);
      const g=add(s,"div","cols2");
      lineChart(g,{title:"Mayores de 65 y menores de 18",sub:"% de la población",source:"Fuente: INE, Atlas de Renta (indicadores demográficos).",series:[{n:"Mayores de 65",v:es.pct_over65,c:"--mustard",main:true},{n:"Menores de 18",v:es.pct_under18,c:"--slate"}],years:YEARS,xticks:[2015,2019,2023],fmt:pc,tickFmt:v=>nf0.format(v)+" %",height:240});
      const fb=fig(g,{title:"Mayores de 65 según el tamaño del municipio",source:"% de la población, último año. Fuente: INE, Atlas de Renta."}); hbars(fb.body,BS.map(b=>({l:b.l,v:last(b.s.pct_over65)[0]})),{fmt:pc,color:"--mustard",min:0});
    }
    if(id==="trabajo"){
      const cats=[{k:"wage",l:"Salarios",c:"--slate"},{k:"pension",l:"Pensiones",c:"--mustard"},{k:"unemp_benefit",l:"Paro",c:"--rust"},{k:"other_benefits",l:"Otras prestaciones",c:"--plum"},{k:"other_income",l:"Otros ingresos",c:"--stone"}];
      const rows=BS.map(b=>({l:b.l,v:Object.fromEntries(cats.map(c=>[c.k,last(b.s[c.k])[0]]))})).concat([{l:"España",me:true,v:Object.fromEntries(cats.map(c=>[c.k,last(es[c.k])[0]]))}]);
      const b0=rows[0].v, bN=rows[BS.length-1].v;
      const s=finding(B,`En los pueblos más pequeños, ${nf0.format(b0.pension)} de cada 100 euros son pensiones`,`<p>De dónde sale la renta de los hogares según el tamaño del municipio. En las ciudades de más de 100.000 habitantes, ${nf0.format(bN.wage)} de cada 100 euros son salarios y ${nf0.format(bN.pension)}, pensiones; en los municipios de menos de 1.000, los salarios bajan a ${nf0.format(b0.wage)} y las pensiones suben a ${nf0.format(b0.pension)}. Eso hace a los pueblos más estables cuando llega una crisis (las pensiones no caen) pero también más dependientes de cómo se revaloricen cada año.</p>`);
      stackBars(s,{rows,cats,note:"% de la renta bruta declarada, último año disponible. Fuente: INE, Atlas de Renta."});
      const PR=REFS.paro.prov, PY=REFS.paroYears, i19=PY.indexOf(2019), i25=PY.indexOf(2025);
      if(PR&&i19>=0&&i25>=0){ const rw=Object.entries(PR).map(([p,v])=>v.paro&&v.paro[i19]?{l:provShort(PROVS[p]),v:(v.paro[i25]/v.paro[i19]-1)*100}:null).filter(Boolean).sort((a,b)=>a.v-b.v), esv=(REFS.paro.es.paro[i25]/REFS.paro.es.paro[i19]-1)*100;
        const s2=finding(B,`Desde 2019 el paro registrado ha bajado un ${pc0(-esv)}, pero mucho más en unas provincias que en otras`,`<p>Cambio del paro registrado entre la media de 2019, antes de la pandemia, y la de 2025. Bajó en todas partes, pero el ritmo varía mucho: han caído más las provincias que partían de más paro (en Extremadura, Castilla-La Mancha o Andalucía) y Baleares; mucho menos las del País Vasco, Navarra y Barcelona, que ya tenían poco.</p>`);
        const f=fig(s2,{source:"Media anual del paro registrado. Fuente: SEPE."}); hbars(f.body,rw,{fmt:sgn,scroll:true,color:"--slate",ref:esv,refLabel:"España",max:0}); }
    }
    themeStudies(B,id);
  }catch(e){ console.error(e); }
}
async function renderInicioV1(){
  document.title="Indicio · Cómo vive España, municipio a municipio";
  const G=subidas(), lose=loseShare(), n=rowsAll().length;
  const c=wcorr(pairPts("superiores","renta",{minPop:1000}));
  view.innerHTML=`
  <section class="ci-hero">
    <div><span class="kk">Datos públicos, sin opinión</span>
      <h1>Cómo vive España, municipio a municipio</h1>
      <p class="dek">Renta, vivienda, trabajo, población, voto y dinero público de ${nf0.format(n)} municipios. Para consultar el tuyo, entender un tema o investigar por tu cuenta.</p>
      ${bigSearchHTML("q2","Escribe tu municipio: Meliana, Vigo, Teruel…")}
      ${exampleChips()}</div>
    <div class="ci-viz">
      <div class="ci-map" id="cimap"><div class="mlab"><span id="cimapl"><b>Renta por persona</b></span><span class="dots" id="cidots"></span></div><div id="cimapb" style="min-height:240px"></div></div>
      <div class="ci-stat" style="left:-16px;top:44%"><b>+${nf0.format(G.anuncios)}${NB}%</b>sube alquilar desde 2015; el sueldo mediano, +${nf0.format(G.salMed)}${NB}%</div>
      <div class="ci-stat" style="right:-12px;top:47%"><b>${Math.round(lose/10)} de 10</b>municipios tienen menos vecinos que en 2005</div>
      <div class="ci-stat" id="cijub" style="right:-12px;bottom:-14px" hidden></div>
    </div>
  </section>
  <div class="ci-paths">
    <a class="ci-path" href="/municipio/"><div class="img">${pathImg("mun")}</div><div class="tx"><span class="kk">Consultar</span><h3>Tu municipio</h3><p>Cómo es, en qué destaca y cómo ha cambiado, comparado con España y con los que se le parecen. En dos minutos.</p><span class="gol">Buscar mi municipio →</span></div></a>
    <a class="ci-path" href="/temas/"><div class="img">${pathImg("temas")}</div><div class="tx"><span class="kk">Entender</span><h3>Temas</h3><p>Seis preguntas sobre España, respondidas con datos y explicadas paso a paso.</p><span class="gol">Ver los temas →</span></div></a>
    <a class="ci-path lab" href="/laboratorio/"><div class="img">${pathImg("lab")}</div><div class="tx"><span class="kk">Investigar</span><h3>Laboratorio</h3><p>Un lienzo en blanco para hacer tus propios gráficos, cruzar datos, ver si una relación aguanta y medir qué pasó antes y después de una ley o un suceso.</p><span class="gol">Abrir el laboratorio →</span></div></a>
  </div>
  <section class="ci-band"><h2>Preguntas que puedes responder aquí</h2><div class="g4" id="ciq">
    <a class="cardx qcard" href="/temas/vivienda/"><div class="n">+${nf0.format(G.anuncios)}${NB}%</div><div class="t">¿Cuánto ha subido alquilar?</div><div class="s">El precio de los anuncios desde 2015 · Vivienda →</div></a>
    <a class="cardx qcard" href="/temas/trabajo/"><div class="n">${mill(paroNow())}</div><div class="t">¿Cuánta gente está en el paro?</div><div class="s">Paro registrado en ${REFS.paroLast}, frente a ${mill(paro15())} en 2015 · Trabajo →</div></a>
    <a class="cardx qcard" href="/temas/riqueza/" id="ciqr"><div class="n">…</div><div class="t">¿Cuánto cambia la renta de una comunidad a otra?</div><div class="s">Riqueza →</div></a>
    <a class="cardx qcard" href="${exHash({v:"cruce",d:["superiores","renta"],t:"g1",p:"",c:[]})}"><div class="n">r = ${c?rFmt(c.r):"—"}</div><div class="t">¿Más estudios, más renta? ¿Y es causa?</div><div class="s">Compruébalo en el laboratorio →</div></a>
  </div></section>
  <div class="ci-steps"><div><i>1</i><span><b>Datos oficiales</b>INE, SEPE, Ministerio del Interior y Eurostat, con la fuente bajo cada gráfico.</span></div><div><i>2</i><span><b>Explicados en castellano</b>Cada cifra con su contexto: comparada con España y con los municipios que se le parecen.</span></div><div><i>3</i><span><b>Para que saques tus conclusiones</b>El laboratorio te deja cruzar cualquier dato y comprobar si una relación aguanta.</span></div></div>
  ${methodNote()}`;
  bindBig("q2");
  loadRenta().then(R=>{ const cc=R.ccaa.filter(c=>!/Ceuta|Melilla/.test(c.n)), t=cc[0], b=cc[cc.length-1]; const q=document.getElementById("ciqr"); if(q) q.innerHTML=`<div class="n">×${nf1.format(t.renta/b.renta)}</div><div class="t">¿Cuánto cambia la renta de una comunidad a otra?</div><div class="s">${esc(t.n)} frente a ${esc(b.n)}, por persona · Riqueza →</div>`; }).catch(()=>{});
  loadGov().then(()=>{ const j=document.getElementById("cijub"); if(j){ j.innerHTML=`<b>${nf0.format(jubShare())}${NB}€</b>de cada 100 de gasto público van a pensiones de jubilación`; j.hidden=false; } }).catch(()=>{});
  // mapa vivo
  try{ await loadTopo(); }catch(e){ return; }
  const mb=document.getElementById("cimapb"); if(!mb) return; mb.style.minHeight="";
  const LAY=[["renta","Renta por persona","más renta"],["paroReg","Paro registrado","más paro"],["alquiler","Hogares de alquiler","más alquiler"],["edad","Edad media","más edad"]];
  const M=spainMap(mb,{onClick:code=>go(code)}); M.svg.attr("aria-label","Mapa de España por municipios");
  let i=0; const dots=document.getElementById("cidots");
  dots.innerHTML=LAY.map((l,j)=>`<button type="button" aria-label="${l[1]}" data-i="${j}"></button>`).join("");
  const show=(j,dur)=>{ i=j; M.set(LAY[j][0],{dur}); const lb=document.getElementById("cimapl"); if(lb) lb.innerHTML=`<b>${LAY[j][1]}</b> · cuanto ${isDark()?"más claro":"más oscuro"}, ${LAY[j][2]}`; dots.querySelectorAll("button").forEach((b,k)=>b.setAttribute("aria-pressed",k===j)); };
  show(0,0);
  dots.querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{ clearInterval(INIT_T); INIT_T=null; show(+b.dataset.i,500); }));
  const reduce=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;
  if(!reduce) INIT_T=setInterval(()=>{ if(!document.body.contains(mb)){ clearInterval(INIT_T); INIT_T=null; return; } show((i+1)%LAY.length,1200); },4500);
}
// miniaturas de los tres caminos
function pathImg(k){
  if(k==="mun") return `<svg viewBox="0 0 300 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect x="22" y="18" width="120" height="12" rx="3" ${st("--ink")}/><rect x="22" y="36" width="80" height="7" rx="3" ${st("--rule-2")}/>
    ${[0,1,2].map(i=>`<rect x="${22+i*88}" y="56" width="80" height="48" rx="7" ${st("--card")}/><rect x="${30+i*88}" y="64" width="${[44,36,50][i]}" height="10" rx="2" ${st("--ink-2")}/><rect x="${30+i*88}" y="86" width="64" height="5" rx="2.5" ${st("--mark")}/><rect x="${30+[30,46,22][i]+i*88}" y="82" width="4" height="13" rx="1" ${st("--rust")}/>`).join("")}</svg>`;
  if(k==="temas") return `<svg viewBox="0 0 300 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${[0,1,2].map(i=>`<rect x="${22+i*88}" y="16" width="80" height="90" rx="8" ${st("--card")}/><rect x="${22+i*88}" y="16" width="80" height="30" rx="8" ${st(["--mark","--ramp-1","--band"][i])}/><rect x="${30+i*88}" y="54" width="50" height="7" rx="2" ${st("--ink-2")}/><rect x="${30+i*88}" y="68" width="34" height="13" rx="2" ${st("--rust")}/><rect x="${30+i*88}" y="88" width="60" height="5" rx="2" ${st("--rule-2")}/>`).join("")}</svg>`;
  return `<svg viewBox="0 0 300 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect x="20" y="14" width="64" height="92" rx="7" style="fill:rgba(255,255,255,.1)"/>${[0,1,2,3].map(i=>`<rect x="28" y="${24+i*20}" width="48" height="12" rx="3" style="fill:rgba(255,255,255,${i===0?.5:.2})"/>`).join("")}
    <rect x="96" y="14" width="184" height="92" rx="7" style="fill:none;stroke:rgba(255,255,255,.35);stroke-dasharray:4 4"/>${d3.range(26).map(j=>{ const x=108+j*6.4, y=92-j*2.4-Math.sin(j*1.7)*9; return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.6" style="fill:var(--acc)"/>`; }).join("")}<line x1="106" y1="96" x2="270" y2="30" style="stroke:#fff;stroke-width:1.2;stroke-dasharray:4 3"/></svg>`;
}

// =====================================================================
// TU MUNICIPIO (portada de la sección)
// =====================================================================
async function renderMunLanding(){
  document.title="Municipios · Indicio";
  view.innerHTML=`<section class="ci-hero" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr)">
    <div><span class="kk">Municipios</span><h1>Busca tu municipio y míralo de un vistazo</h1>
      <p class="dek">Sus cifras clave frente a España, cómo ha cambiado desde 2015, en qué destaca y a qué municipios se parece. Con todo el detalle plegado por si quieres más.</p>
      ${bigSearchHTML("q2","Escribe tu municipio…")}${exampleChips()}
      <p style="margin-top:18px;font-size:15px"><a href="#comparar">Comparar dos municipios</a> · <a href="/provincia/">Municipios por provincia</a> · <a href="/rankings/">Rankings</a></p></div>
    <div class="ci-map"><div class="mlab"><span><b>O pulsa en el mapa</b> · color según la renta por persona</span></div><div id="mlmap" style="min-height:240px"></div></div>
  </section>
  <section class="ci-band" style="margin-top:6px"><h2>Qué vas a encontrar en la ficha</h2><div class="g3">
    <div class="cardx"><span class="kk">1 · Las cifras clave</span><p style="margin-top:6px;font-size:15px;color:var(--ink-2)">Seis datos con una barra que dice dónde queda tu municipio frente a todos los de España. La raya negra es la media.</p>${kpiDemo()}</div>
    <div class="cardx"><span class="kk">2 · Cómo ha cambiado</span><p style="margin-top:6px;font-size:15px;color:var(--ink-2)">Habitantes, renta, paro y alquiler desde 2015, con España de fondo para comparar.</p><div style="height:46px;margin-top:10px">${miniLines([100,101,103,104,107,109,112],[100,100.5,101,102,103,104,105],{h:46})}</div></div>
    <div class="cardx"><span class="kk">3 · Lo que destaca</span><p style="margin-top:6px;font-size:15px;color:var(--ink-2)">Los datos en los que más se aleja de lo habitual, y los cinco municipios que más se le parecen.</p><div class="dstrip" style="margin-top:18px"><i style="left:88%"></i></div></div>
  </div></section>${methodNote()}`;
  bindBig("q2");
  try{ await loadTopo(); }catch(e){ return; }
  const mb=document.getElementById("mlmap"); if(!mb) return; mb.style.minHeight="";
  const M=spainMap(mb,{onClick:code=>go(code)}); M.set("renta",{dur:0}); if(lastMun&&BYCODE.has(lastMun)) M.mark(lastMun);
  M.paths.append("title").text(f=>{ const r=BYCODE.get(f.id); return r?r[F.name]:""; });
}
const kpiDemo=()=>`<div class="bul" style="margin-top:20px"><span class="es" style="left:52%"></span><span class="me" style="left:38%"></span></div><div class="bul-l"><span>menos</span><span>más</span></div>`;

// =====================================================================
// TEMAS: índice y plantilla común
// =====================================================================
const TOPICS={
  riqueza:{l:"Riqueza",q:"¿Cómo se reparte la riqueza?",img:()=>miniBars([[1,"--ramp-6"],[.85,"--ramp-5"],[.7,"--ramp-4"],[.6,"--ramp-3"],[.5,"--ramp-2"]],{w:300,h:70}),
    key:async()=>{ const R=await loadRenta(); const cc=R.ccaa.filter(c=>!/Ceuta|Melilla/.test(c.n)), t=cc[0], b=cc[cc.length-1]; return [`×${nf1.format(t.renta/b.renta)}`,`ingresa por persona ${esc(t.n)} frente a ${esc(b.n)}`]; },
    me:["renta","pobreza","gini"], next:["¿Dónde se concentra la renta? Míralo en un mapa y fíltralo por provincia.",()=>exHash({v:"mapa",d:["renta","pobreza"],p:"",t:"",c:[]})]},
  vivienda:{l:"Vivienda",q:"¿Por qué cuesta tanto encontrar casa?",img:()=>miniBars([[90,"--rust"],[26,"--slate"],[23,"--stone"]],{w:300,h:70}),
    key:async()=>[`+${nf0.format(subidas().anuncios)}${NB}%`,"el precio de los anuncios de alquiler desde 2015"],
    me:["alquiler","alqVar","vt"], next:["¿Dónde sube más el alquiler? Míralo en un mapa con tus filtros.",()=>exHash({v:"mapa",d:["alqVar","rentaVar"],p:"",t:"",c:[]})]},
  poblacion:{l:"Población",q:"¿Quién llega y quién se va?",img:()=>miniLines(REFS.es.pad,null,{w:300,h:70,pad:8}),
    key:async()=>[`${Math.round(loseShare()/10)} de 10`,"municipios tienen menos vecinos que en 2005"],
    me:["varPob","edad","extr"], next:["¿Qué pueblos pequeños crecen? Ordénalos en una tabla.",()=>exHash({v:"tabla",d:["varPob","migInt","edad"],t:"s2",p:"",o:"varPob",c:[]})]},
  trabajo:{l:"Trabajo",q:"¿De qué vivimos?",img:()=>miniLines(REFS.paro.es.paro,null,{w:300,h:70,pad:8}),
    key:async()=>[mill(paroNow()),`personas en el paro registrado, frente a ${mill(paro15())} en 2015`],
    me:["paroReg","superiores","pensiones"], next:["¿Más paro, menos renta? ¿Y a igual edad? Compruébalo tú.",()=>exHash({v:"cruce",d:["paroReg","renta"],t:"g1",p:"",c:["edad"]})]},
  gasto:{l:"Dinero público",q:"¿En qué se gasta?",img:()=>miniStack([[23,"--rust"],[14,"--slate"],[9,"--mustard"],[54,"--rule-2"]],{w:300,h:70}),
    key:async()=>{ await loadGov(); return [`${nf0.format(jubShare())}${NB}€`,"de cada 100 de gasto público van a pensiones de jubilación"]; },
    me:["edad","mayores65","pensiones"], next:["Lee paso a paso el estudio de las pensiones: por qué crece el gasto y qué lo mueve.",()=>"/preguntas/pensiones/"]},
  voto:{l:"Voto",q:"¿Cómo vota cada España?",img:()=>miniStack([[33,"#1d84ce"],[32,"#d7322c"],[12,"#5aa62a"],[12,"#d93a7c"],[11,"#a69b8b"]],{w:300,h:70}),
    key:async()=>{ const k=VG(); return [pc0(VREFS.es[k].turnout),`del censo votó en las ${ELNAME(k)}`]; },
    me:["part","pp","psoe"], next:["¿Votan más los municipios ricos? Compruébalo en el laboratorio.",()=>exHash({v:"cruce",d:["renta","part"],t:"g1",p:"",c:[]})]}
};
// ilustraciones de cada tema (illus/*.svg): escenas, no gráficos, para que sea más fácil entrar
const tIll=id=>((window.__INDICIO&&window.__INDICIO.till)||{})[id]||`<img src="/illus/${id}.svg" alt="" width="320" height="200" loading="lazy" decoding="async">`;
const TOPIC_IDS=["riqueza","vivienda","poblacion","trabajo","gasto","voto"];
const TMIN={riqueza:[6,6],vivienda:[7,7],poblacion:[5,5],trabajo:[6,6],gasto:[5,6],voto:[5,4]};

async function renderTemas(){
  document.title="Temas · Indicio";
  view.innerHTML=pageHead("Seis preguntas sobre España","Cada tema responde a una pregunta con unas pocas ideas clave, cada una con su gráfico. Léelo en cinco minutos o profundiza en el detalle.")+
    `<div class="g3" style="margin-top:6px">${TOPIC_IDS.map(id=>{ const T=TOPICS[id]; return `<a class="tcard" href="/temas/${id}/"><div class="img">${tIll(id)}</div><div class="tp"><span class="kk">${T.l}</span><h3>${T.q}</h3><div class="n" data-k="${id}">…</div><div class="s" data-s="${id}"></div></div><div class="ft"><span>${TMIN[id][0]} ideas · ${TMIN[id][1]} min</span><span class="gol">Leer →</span></div></a>`; }).join("")}</div>
    <section class="ci-band"><h2>¿Prefieres buscar tu propia respuesta?</h2><p style="color:var(--ink-2);max-width:var(--medida)">En el laboratorio puedes elegir cualquier dato de los temas, verlo en un mapa, ordenarlo, cruzarlo con otro y comprobar si una relación podría ser causa.</p><p style="margin-top:10px"><a class="gol" href="/laboratorio/">Abrir el laboratorio →</a></p></section>${methodNote()}`;
  for(const id of TOPIC_IDS){ TOPICS[id].key().then(([n,s])=>{ const a=view.querySelector(`[data-k="${id}"]`), b=view.querySelector(`[data-s="${id}"]`); if(a) a.innerHTML=n; if(b) b.innerHTML=s; }).catch(()=>{}); }
}

// lo esencial de cada tema: [cifra, título, minigráfico, frase]
async function essentials(id){
  const es=REFS.es, ce=REFS.census.es, G=subidas(), ipcG=REFS.ipc[2024]/REFS.ipc[2015];
  if(id==="riqueza"){ const R=await loadRenta(); const cc=R.ccaa.filter(c=>!/Ceuta|Melilla/.test(c.n)), t=cc[0], b=cc[cc.length-1], ri=es.net_income_pc, gr=(lastV(ri)/ri[0]-1)*100, real=((1+gr/100)/ipcG-1)*100, pov=lastV(es.poverty);
    return [[`×${nf1.format(t.renta/b.renta)}`,`${t.n} frente a ${b.n}`,miniBars(cc.map((c,i)=>[c.renta,i===0||i===cc.length-1?"--rust":"--rule-2"]),{h:44}),"renta neta por persona entre la comunidad más rica y la más pobre"],
      [eur(R.median),"La renta de la mitad","","la mitad de la población vive en barrios con menos renta que esto, por persona y año"],
      [pc(pov),"En riesgo de pobreza",miniTen(Math.round(pov/10)),"ingresos por debajo del 60 % de la mediana"],
      [sgn(real),"Renta desde 2015, en euros de 2024",miniLines(deflate(ri),ri,{h:40}),`la línea granate ya descuenta la subida de precios; la gris de puntos es la renta en euros de cada año: ${sgn(gr)}`]]; }
  if(id==="vivienda"){ const iy=REFS.ipvaYears, i15=iy.indexOf(2015);
    return [[`+${nf0.format(G.anuncios)}${NB}%`,"Anuncios de alquiler, 2015–2024",miniBars([[G.anuncios,"--rust"],[G.salMed,"--slate"],[G.ipc,"--stone"]],{h:40}),`frente a sueldo mediano ${sgn(G.salMed)} y precios ${sgn(G.ipc)}`],
      [`+${nf0.format(G.declarado)}${NB}%`,"Alquiler declarado, todos los contratos",miniLines(es.ipva.slice(i15),null,{h:40}),"quien ya tiene contrato lo nota menos que quien busca"],
      [nf0.format(lastV(es.vt)),"Pisos turísticos",miniLines(es.vt,null,{h:40,index:false}),`el ${pc(lastV(es.vtp))} de las viviendas; mucho más en algunas costas`],
      [`${Math.round(ce.secondary/10)} de 10`,"Viviendas vacías o secundarias",miniTen(Math.round(ce.secondary/10)),"sobre todo en pueblos que pierden gente"]]; }
  if(id==="poblacion"){ const pad=es.pad, lose=loseShare(), ag=es.mean_age;
    return [[`+${nf1.format((lastV(pad)-pad[0])/1e6)}${NB}M`,"Habitantes desde 1996",miniLines(pad,null,{h:40}),`hoy somos ${nf1.format(lastV(pad)/1e6)} millones`],
      [`${Math.round(lose/10)} de 10`,"Municipios con menos vecinos que en 2005",miniTen(Math.round(lose/10)),"el crecimiento se concentra en ciudades, costa e islas"],
      [pc(lastV(es.pct_foreign)),"Nacionalidad extranjera",miniLines(es.pct_foreign,null,{h:40,index:false}),`${sgn(lastV(es.pct_foreign)-es.pct_foreign[0]).replace(" %"," puntos")} desde 2015`],
      [nf1.format(lastV(ag))+NB+"años","Edad media",miniLines(ag,null,{h:40,index:false}),`${nf1.format(lastV(ag)-ag[0])} años más que en 2015`]]; }
  if(id==="trabajo"){ const pe=REFS.paro.es, L=pe.last, sh=[[L[8],"--slate"],[L[6],"--plum"],[L[7],"--mustard"],[L[5],"--olive"],[L[9],"--stone"]];
    return [[mill(paroNow()),"En el paro registrado",miniLines(pe.paro,null,{h:40}),`frente a ${mill(paro15())} de media en 2015`],
      [sgn(G.salMed),"Salario mediano, 2015–2024",miniBars([[G.salMed,"--slate"],[G.ipc,"--stone"]],{h:30}),`casi lo mismo que los precios (${sgn(G.ipc)})`],
      [pc(pe.paro[10]/pe.pob1664*100),"Paro registrado sobre 16–64 años",miniStack(sh,{w:200,h:30}),"la mayoría venía de los servicios (azul)"],
      [pc(lastV(es.pension)),"De los ingresos son pensiones",miniLines(es.pension,null,{h:40,index:false}),"el peso de las pensiones en lo que entra en los hogares"]]; }
  if(id==="gasto"){ await loadGov(); const Y=+GOV.years[GOV.years.length-1], P=GOV.pen, d0=P.olddep[2025]??P.olddep[2024];
    return [[pc(gv("TOTAL","pib",Y)),"Gasto público sobre el PIB",miniLines(GOV.fun.TOTAL.pib,null,{h:40,index:false}),`${nf0.format(gv("TOTAL","meur",Y)/1000)} mil millones de euros en ${Y}`],
      [`${nf0.format(jubShare())}${NB}€`,"De cada 100, a jubilación",miniStack([[jubShare(),"--rust"],[100-jubShare(),"--rule-2"]],{w:200,h:30}),"la partida más grande del gasto"],
      [pc(lastV(GOV.debt)),"Deuda sobre el PIB",miniLines(GOV.debt,null,{h:40,index:false}),`era el ${pc(GOV.debt[GOV.years.indexOf("2007")])} en 2007`],
      [`${nf0.format(d0)} → ${nf0.format(P.proj[2050])}`,"Mayores por cada 100 en edad de trabajar",miniBars([[d0,"--slate"],[P.proj[2050],"--rust"]],{h:30}),"hoy y en 2050, según Eurostat"]]; }
  if(id==="voto"){ const k=VG(), e=VREFS.es[k], ke=VREFS.elections.filter(x=>x.startsWith("07")).pop(), sh=Object.entries(e.share).filter(([p])=>p!=="Otros").sort((a,b)=>b[1]-a[1]);
    const c=wcorr(pairPts("renta","part",{minPop:1000}));
    return [[pc0(e.turnout),`Participación, ${ELSHORT(k)}`,miniBars([[e.turnout,"--slate"],[ke?VREFS.es[ke].turnout:0,"--stone"]],{h:30,max:100}),ke?`frente al ${pc0(VREFS.es[ke].turnout)} en las europeas de 2024`:""],
      [pc(sh[0][1]),`${sh[0][0]}, el más votado`,miniStack(sh.slice(0,6).map(([p,v])=>[v,pColor(p)]),{w:200,h:30}),`seguido de ${sh[1][0]} (${pc(sh[1][1])})`],
      [`r = ${c?rFmt(c.r):"—"}`,"Renta y participación",miniScatter("renta","part"),"donde hay más renta, se vota más"],
      [ke?pc(VREFS.es[ke].share.SALF||0):"—","Se Acabó La Fiesta, europeas 2024","","la candidatura nueva de 2024"]]; }
  return [];
}
const GLOSS={"renta neta":"Lo que entra en un hogar en un año después de impuestos y cotizaciones, dividido entre todas las personas del hogar.",
  "alquiler declarado":"Lo que pagan todos los inquilinos según las declaraciones a Hacienda, incluidos los contratos antiguos.",
  "paro registrado":"Personas apuntadas como demandantes de empleo en las oficinas del SEPE. No es lo mismo que la tasa de paro de la EPA.",
  "riesgo de pobreza":"Ingresos por debajo del 60 % de la mediana de España, ajustados por el tamaño del hogar.",
  "Gini":"Índice de desigualdad: 0 si todos ingresaran lo mismo, 100 si una sola persona lo ingresara todo.",
  "mediana":"El valor del medio: la mitad está por debajo y la otra mitad por encima. Los extremos le afectan menos que a la media.",
  "IPC":"Índice de Precios de Consumo: cuánto suben de media los precios de lo que compran los hogares.",
  "viviendas turísticas":"Pisos que se alquilan a turistas por días, según la estadística experimental del INE.",
  "saldo migratorio":"Personas que llegan menos personas que se van.",
  "PIB":"Producto interior bruto: el valor de todo lo que produce la economía en un año.",
  "sección censal":"La zona más pequeña para la que el INE publica datos: unas 1.000 a 2.500 personas.",
  "voto válido":"Votos a candidaturas más votos en blanco; no incluye los nulos.",
  "COFOG":"Clasificación internacional del gasto público según su finalidad: sanidad, educación, protección social…"};
function glossify(root){
  const done=new Set(), terms=Object.keys(GLOSS);
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.parentElement.closest(".txt p, .txt li, .phead .dek")&&!n.parentElement.closest("a,.gloss,figure,b,mark")?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT});
  const nodes=[]; while(walker.nextNode()) nodes.push(walker.currentNode);
  for(const n of nodes){ for(const t of terms){ if(done.has(t)) continue; const i=n.nodeValue.toLowerCase().indexOf(t.toLowerCase()); if(i<0) continue;
      const b=(i===0||/[\s(«"]/.test(n.nodeValue[i-1])), e=!/[a-záéíóúñ]/i.test(n.nodeValue[i+t.length]||" "); if(!b||!e) continue;
      const after=n.splitText(i); after.splitText(t.length); const sp=el("span","gloss"); sp.tabIndex=0; sp.dataset.g=t; sp.textContent=after.nodeValue; after.replaceWith(sp); done.add(t); break; } }
  tipBind(root.querySelectorAll(".gloss"),g=>`<b>${esc(cap(g.dataset.g))}:</b> ${esc(GLOSS[g.dataset.g])}`);
}
async function topicDecorate(id){
  const T=TOPICS[id]; if(!T) return; const ph=view.querySelector(".phead"); if(!ph) return;
  document.title=T.l+" · Indicio";
  const body=view.querySelector("#body")||view;
  const hs=[...body.querySelectorAll(":scope > .finding > h2, :scope > section.finding > h2")];
  const words=[...view.querySelectorAll(".txt, .phead .dek")].map(e=>e.textContent).join(" ").split(/\s+/).length+hs.length*40, mins=Math.max(2,Math.round(words/230));
  ph.insertAdjacentHTML("afterbegin",`<div class="tp-crumb"><a href="/preguntas/">Análisis</a> › <a href="/preguntas/?tema=${id}">${T.l}</a> · ${hs.length} ideas · ${mins} minutos de lectura</div>`);
  const ess=el("section","tp-ess",`<h2>Lo esencial</h2><div class="g4" id="essg"></div><div id="mestrip"></div>`);
  ph.after(ess);
  hs.forEach((h,i)=>{ h.id="idea-"+(i+1); });
  meStrip(id);
  // siguiente paso y cómo se mide
  const m=view.querySelector("footer.method");
  const ns=el("div","nextstep",`<span class="t"><b>Siguiente paso:</b> ${T.next[0]}</span><a class="gol" href="${T.next[1]()}">${T.next[1]().startsWith("/preguntasstudios")?"Leer el estudio":"Abrir en el laboratorio"} →</a>`);
  if(m){ m.before(ns); const d=el("details","howm"); d.innerHTML="<summary>Cómo se mide: fuentes y notas</summary>"; m.before(d); d.appendChild(m); m.querySelectorAll("details.srcs").forEach(s=>{ s.open=true; }); } else view.appendChild(ns);
  try{ glossify(view); }catch(e){ console.error(e); }
  try{ const E=await essentials(id); const g=document.getElementById("essg"); if(g) g.innerHTML=E.map(([n,t,svg,s])=>`<div class="cardx qcard"><div class="n">${n}</div><div class="t">${esc(t)}</div>${svg||""}<div class="s">${s}</div></div>`).join(""); }catch(e){ console.error(e); }
}
const esRef=k=>{ const e=VREFS.es[VG()]; if(k==="part") return e.turnout; const P={pp:"PP",psoe:"PSOE",vox:"Vox",sumar:"Sumar"}[k]; return P&&e.share[P]!=null?e.share[P]:esMean(k); };
function meStrip(id){
  const box=document.getElementById("mestrip"); if(!box) return; const T=TOPICS[id];
  const r=myOk(lastMun)?BYCODE.get(lastMun):null, r2=r&&myOk(MUN2)?BYCODE.get(MUN2):null;
  if(!r){ box.innerHTML=`<div class="mestrip"><span class="kk">📍 Tu municipio</span><span style="font-size:14.5px;color:var(--ink-2)">Elige tu municipio y verás aquí sus cifras de este tema, junto a las de España.</span><div class="search" id="msq-s" role="combobox" aria-expanded="false" aria-haspopup="listbox"><svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.6"/><path d="M11 11l3.5 3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg><input id="msq" type="search" placeholder="Busca un municipio" autocomplete="off" aria-label="Elegir municipio"><ul id="msq-r" class="results" role="listbox" hidden></ul></div></div>`;
    attachSearch(document.getElementById("msq"),document.getElementById("msq-r"),document.getElementById("msq-s"),x=>{ setMyMun(x[F.code],{silent:true}); meStrip(id); }); return; }
  const val=(x,k)=>x[F[k]]==null?"—":fmtK(k)(x[F[k]]);
  box.innerHTML=`<div class="mestrip ms2"><div class="ms-h"><span class="kk">📍 Tu municipio en este tema</span><button type="button" class="sel" id="mschg">${r2?"Cambiar":"Cambiar o comparar con otro"}</button></div>
    <div class="extable"><table class="glance mst"><thead><tr><th></th>${T.me.map(k=>`<th class="r">${esc(labK(k))}</th>`).join("")}</tr></thead><tbody>
    <tr class="me"><td><a href="#m${r[F.code]}"><b>${esc(dispName(r[F.name]))}</b></a></td>${T.me.map(k=>`<td class="r num"><b>${val(r,k)}</b></td>`).join("")}</tr>
    ${r2?`<tr class="m2"><td><a href="#m${r2[F.code]}">${esc(dispName(r2[F.name]))}</a></td>${T.me.map(k=>`<td class="r num">${val(r2,k)}</td>`).join("")}</tr>`:""}
    <tr class="es"><td class="muted">España</td>${T.me.map(k=>`<td class="r num muted">${fmtK(k)(esRef(k))}</td>`).join("")}</tr></tbody></table></div>
    ${r2?`<a class="gol" style="font-size:13.5px" href="#comparar-${r[F.code]}-${r2[F.code]}">Comparar ${esc(dispName(r[F.name]))} y ${esc(dispName(r2[F.name]))} →</a>`:""}</div>`;
  document.getElementById("mschg").addEventListener("click",e=>{ e.stopPropagation(); myPop(); });
}

// =====================================================================
// VOTO
// =====================================================================
async function renderVoto(){
  document.title="Voto · Indicio";
  const k=VG(), ks=VREFS.elections, e=VREFS.es[k], gens=ks.filter(x=>x.startsWith("02")), prev=gens.length>1?gens[gens.length-2]:null, eu=ks.filter(x=>x.startsWith("07")).pop();
  const sh=Object.entries(e.share).filter(([p])=>p!=="Otros").sort((a,b)=>b[1]-a[1]);
  view.innerHTML=pageHead("¿Cómo vota cada España?",`En las ${ELNAME(k)} votó el <mark>${pc(e.turnout)}</mark> del censo y ganó el ${sh[0][0]} con el ${pc(sh[0][1])} de los votos válidos. Pero cada municipio vota a su manera: la renta, la edad y el tamaño del pueblo dicen mucho de cómo y cuánto se vota.`)+`<div id="body"></div>${methodNote()}`;
  const B=document.getElementById("body"), rows=rowsAll();
  // 1. resultado
  const s1=finding(B,`${sh[0][0]} y ${sh[1][0]} sumaron ${nf0.format(sh[0][1]+sh[1][1])} de cada 100 votos en ${k.slice(2,6)}`,`<p>Resultado de las ${ELNAME(k)} en toda España${prev?`, con la raya en el de las ${ELNAME(prev)}`:""}. Cada candidatura se agrupa con su equivalente anterior para poder comparar.</p>`);
  const f1=fig(s1,{title:`Voto válido, ${ELSHORT(k)}`,source:"% sobre voto válido. Sin el voto de residentes en el extranjero. Fuente: Ministerio del Interior."});
  const parts=sh.filter(([p,v])=>v>=0.8).slice(0,10), mx=Math.max(...parts.map(([p,v])=>Math.max(v,prev?VREFS.es[prev].share[p]||0:0)));
  const tb=add(f1.body,"div","vtab"); tb.innerHTML=parts.map(([p,v])=>{ const b=prev?VREFS.es[prev].share[p]:null; return `<div class="vrow"><span class="pn"><i style="background:${pColor(p)}"></i><span>${esc(p)}</span></span><span class="vbar"><span style="width:${v/mx*100}%;background:${pColor(p)}"></span>${b!=null?`<b class="m19" style="left:${b/mx*100}%"></b>`:""}</span><span class="num r">${nf1.format(v)}</span><span class="num r ${b==null?"":v-b>=0?"up":"dn"}">${b==null?"nuevo":pts(v-b)}</span></div>`; }).join("");
  // 2. mapa
  const s2=finding(B,"El mapa del partido más votado",`<p>Cada municipio, con el color de la candidatura más votada en ${k.slice(2,6)}. Mucha superficie no quiere decir muchos votos: los municipios pequeños ocupan casi todo el mapa, pero las ciudades reúnen la mayoría de los votantes.</p>`);
  const mf=fig(s2,{source:"Pulsa un municipio para abrir su ficha. Fuente: Ministerio del Interior."}); mf.body.innerHTML='<div class="maploading">Dibujando el mapa…</div>';
  const cnt=d3.rollups(rows.filter(r=>r[F.win23]),v=>v.length,r=>r[F.win23]).sort((a,b)=>b[1]-a[1]);
  loadTopo().then(()=>{ if(!document.body.contains(mf)) return; mf.body.innerHTML=""; const M=spainMap(mf.body,{onClick:c=>go(c),width:640,height:500}); M.setCat("win23",p=>pColor(p)); M.paths.append("title").text(f=>{ const r=BYCODE.get(f.id); return r?`${r[F.name]}: ${r[F.win23]||"sin dato"}`:""; });
    add(mf.body,"div","stack",`<div class="keys">${cnt.slice(0,7).map(([p,n])=>`<span><i class="sq" style="background:${pColor(p)}"></i>${esc(p)} · ${nf0.format(n)} municipios</span>`).join("")}</div>`); }).catch(()=>{ mf.body.innerHTML=""; });
  // 3. tamaño y participación
  const bands=[[0,500,"Menos de 500"],[500,2000,"500 a 2.000"],[2000,10000,"2.000 a 10.000"],[10000,50000,"10.000 a 50.000"],[50000,250000,"50.000 a 250.000"],[250000,1e9,"Más de 250.000"]];
  const wm=(rs,kk)=>{ const s=rs.filter(r=>r[F[kk]]!=null&&r[F.pop]); const w=d3.sum(s,r=>r[F.pop]); return w?d3.sum(s,r=>r[F[kk]]*r[F.pop])/w:null; };
  const br=bands.map(([a,b,l])=>{ const s=rows.filter(r=>(r[F.pop]||0)>=a&&(r[F.pop]||0)<b); return {l:l+" hab.",v:wm(s,"part"),e:wm(s,"part24")}; });
  const s3=finding(B,`En los pueblos pequeños se vota más: hasta un ${pc0(d3.max(br,b=>b.v))}`,`<p>Participación según el tamaño del municipio. En las europeas de 2024 la participación cae en todas partes, pero la distancia entre pueblos y ciudades se mantiene.</p>`);
  const g3=add(s3,"div","cols2");
  const fa=fig(g3,{title:`Participación, ${ELSHORT(k)}`,source:"% del censo, media ponderada por población. Fuente: Ministerio del Interior."}); hbars(fa.body,br.map(b=>({l:b.l,v:b.v})),{fmt:pc,color:"--slate",min:0,max:100,ref:e.turnout,refLabel:"España"});
  if(eu){ const fb=fig(g3,{title:"Participación, europeas de 2024",source:"% del censo. Fuente: Ministerio del Interior."}); hbars(fb.body,br.map(b=>({l:b.l,v:b.e})),{fmt:pc,color:"--stone",min:0,max:100,ref:VREFS.es[eu].turnout,refLabel:"España"}); }
  // 4. renta y voto
  const s=rows.filter(r=>r[F.renta]!=null&&r[F.pop]).sort((a,b)=>a[F.renta]-b[F.renta]), tot=d3.sum(s,r=>r[F.pop]); let acc=0; const qs=[[],[],[],[],[]];
  s.forEach(r=>{ const q=Math.min(4,Math.floor((acc+r[F.pop]/2)/tot*5)); acc+=r[F.pop]; qs[q].push(r); });
  const PK=[["pp","PP"],["psoe","PSOE"],["vox","Vox"],["sumar","Sumar"],["part","Participación"]];
  const QN=["20 % con menos renta","Segundo 20 %","20 % central","Cuarto 20 %","20 % con más renta"];
  const vals=PK.map(([kk])=>qs.map(q=>wm(q,kk)));
  const s4=finding(B,"Cuanto más renta tiene un municipio, más se vota, y más al PP",`<p>Los municipios ordenados por renta por persona y repartidos en cinco grupos con la misma población. En cada grupo, el voto medio de cada partido en ${k.slice(2,6)}.</p><p>Es una relación entre lugares, no entre personas: que un municipio rico vote más a un partido no dice cómo vota cada vecino rico.</p>`);
  const f4=fig(s4,{title:"Voto según la renta del municipio",source:"% sobre voto válido (participación: % del censo). Grupos de municipios con la misma población. Fuentes: Ministerio del Interior e INE, Atlas de Renta 2024."});
  const t4=add(f4.body,"div","extable"); t4.innerHTML=`<table class="glance"><thead><tr><th></th>${QN.map(q=>`<th class="r" style="font-size:12.5px">${q}</th>`).join("")}</tr></thead><tbody>${PK.map(([kk,l],i)=>{ const mxv=d3.max(vals[i]); const col=kk==="part"?"var(--slate)":pColor(l); return `<tr><td class="lab"><b>${l}</b></td>${vals[i].map(v=>`<td class="r num"><span style="display:inline-block;width:${Math.round((v||0)/mxv*36)}px;height:8px;border-radius:2px;background:${col};margin-right:6px;vertical-align:middle"></span>${v==null?"—":nf1.format(v)}</td>`).join("")}</tr>`; }).join("")}</tbody></table>`;
  add(s4,"p",null,exLink("cruce",{d:["renta","pp"],t:"g1",c:["edad"]},"¿Aguanta a igual edad? Compruébalo en el laboratorio"));
  // 5. europeas y SALF
  if(eu&&F.salf24!=null){ const ccaa=d3.rollups(rows.filter(r=>r[F.salf24]!=null&&r[F.pop]),v=>d3.sum(v,r=>r[F.salf24]*r[F.pop])/d3.sum(v,r=>r[F.pop]),r=>CCAA_OF[r[F.prov]]).filter(([c])=>c&&!/Ceuta|Melilla/.test(c)).sort((a,b)=>b[1]-a[1]);
    const s5=finding(B,`Se Acabó La Fiesta, la sorpresa de las europeas: un ${pc(VREFS.es[eu].share.SALF||0)} de los votos`,`<p>La candidatura nueva de las europeas de 2024 por comunidades. Fue más fuerte en ${esc(ccaa[0][0])} y ${esc(ccaa[1][0])}.</p>`);
    const f5=fig(s5,{title:"Voto a Se Acabó La Fiesta, europeas de 2024",source:"% sobre voto válido, media ponderada por población. Fuente: Ministerio del Interior."}); hbars(f5.body,ccaa.map(([l,v])=>({l,v})),{fmt:pc,color:"--plum",min:0,ref:VREFS.es[eu].share.SALF,refLabel:"España"}); }
  panoExtra("voto",B);
}
// =====================================================================
// LABORATORIO: un lienzo con pasos (gráfico, datos, municipios, comprobar)
// =====================================================================
const LBTYPES=[["mapa","Mapa",`<path d="M6 4h12l4 6 10 1 3 10H8z"/>`],["tabla","Ranking",`<rect x="4" y="3" width="30" height="5"/><rect x="4" y="10" width="22" height="5"/><rect x="4" y="17" width="14" height="5"/>`],
  ["cruce","Relación",`<circle cx="8" cy="20" r="2.2"/><circle cx="14" cy="16" r="2.2"/><circle cx="20" cy="14" r="2.2"/><circle cx="26" cy="9" r="2.2"/><circle cx="32" cy="6" r="2.2"/>`],
  ["grupos","Grupos",`<rect x="5" y="10" width="6" height="13"/><rect x="14" y="5" width="6" height="18"/><rect x="23" y="13" width="6" height="10"/><rect x="32" y="8" width="6" height="15"/>`],["distribucion","Distribución",`<rect x="3" y="18" width="5" height="5"/><rect x="9" y="11" width="5" height="12"/><rect x="15" y="5" width="5" height="18"/><rect x="21" y="9" width="5" height="14"/><rect x="27" y="15" width="5" height="8"/><rect x="33" y="19" width="5" height="4"/>`],["burbujas","Trayectorias",`<circle cx="9" cy="17" r="4"/><circle cx="21" cy="11" r="6"/><circle cx="33" cy="15" r="3"/>`],
  ["paises","Series",`<rect x="5" y="4" width="2.5" height="20"/><path d="M7.5 5h22l-4 5 4 5h-22z"/>`],
  ["matriz","Matriz",`<rect x="8" y="1" width="7" height="7"/><rect x="8" y="9.5" width="7" height="7"/><rect x="16.5" y="9.5" width="7" height="7"/><rect x="8" y="18" width="7" height="7"/><rect x="16.5" y="18" width="7" height="7"/><rect x="25" y="18" width="7" height="7"/>`],
  ["pendientes","Antes y ahora",`<line x1="8" y1="5" x2="32" y2="19" style="stroke-width:2.5"/><line x1="8" y1="21" x2="32" y2="8" style="stroke-width:2.5"/><circle cx="8" cy="5" r="2.4"/><circle cx="32" cy="19" r="2.4"/><circle cx="8" cy="21" r="2.4"/><circle cx="32" cy="8" r="2.4"/>`],
  ["piramide","Pirámide",`<rect x="15" y="1" width="10" height="5"/><rect x="11" y="7" width="18" height="5"/><rect x="7" y="13" width="26" height="5"/><rect x="5" y="19" width="30" height="5"/>`],
  ["composicion","Composición",`<rect x="4" y="2" width="13" height="6"/><rect x="18" y="2" width="9" height="6"/><rect x="28" y="2" width="8" height="6" style="opacity:.5"/><rect x="4" y="10" width="7" height="6"/><rect x="12" y="10" width="16" height="6"/><rect x="29" y="10" width="7" height="6" style="opacity:.5"/><rect x="4" y="18" width="18" height="6"/><rect x="23" y="18" width="7" height="6"/><rect x="31" y="18" width="5" height="6" style="opacity:.5"/>`]];
const LBDESC={matriz:"¿Qué datos van juntos? Todas las parejas de datos a la vez, municipio a municipio",pendientes:"¿Quién ha mejorado y quién se ha quedado atrás? Cada provincia o comunidad, entre dos años",piramide:"¿Cómo es la población? Hombres y mujeres por edad, en España, una comunidad o una provincia",composicion:"¿De qué se compone? Sectores, voto o edades en cada comunidad, provincia, tamaño o nivel de renta",paises:"¿Cómo ha cambiado? Las series que quieras, año a año, con un año de referencia si quieres: precios, sueldos, vivienda, empleo… de España, tu provincia o tu municipio, o España frente a otros países",mapa:"¿Dónde es más alto o más bajo? Un dato, municipio a municipio",tabla:"¿Quiénes encabezan la lista? Ordena y filtra por varios datos",cruce:"¿Van juntos dos datos? Mira si la relación aguanta al comparar entre iguales",antes:"¿Cambió algo tras una ley o un suceso? Afectados frente a gemelos, año a año",evolucion:"¿Cómo ha cambiado? Cuánto ha crecido cada dato desde un año",grupos:"¿Qué zona destaca? Medias por comunidad, provincia, tamaño o nivel",distribucion:"¿Cómo se reparte? Un dato entre toda la población",burbujas:"¿Cómo se mueven las provincias? Dos datos y el tamaño, año a año"};
// Paso 1 del laboratorio: cada gráfico se nombra por la pregunta que responde, con el nombre del gráfico debajo
const LBQ={mapa:"Dónde",tabla:"Quién va primero",cruce:"Si van juntos",grupos:"Qué zona destaca",distribucion:"Cómo se reparte",matriz:"Todo con todo",paises:"Cómo ha cambiado",pendientes:"Quién mejoró",burbujas:"Cómo se mueven",piramide:"Por edades",composicion:"De qué se compone"};
const LBEJ={mapa:"dónde hay más paro registrado",tabla:"los municipios con la renta más alta",cruce:"si donde se estudia más se gana más",grupos:"la renta media por comunidad",distribucion:"cuántos municipios tienen mucho paro y cuántos poco",matriz:"qué datos se mueven juntos en los municipios",paises:"cómo han subido los alquileres en tu provincia",pendientes:"qué provincias han mejorado su renta desde 2015",burbujas:"cómo se mueven las provincias en renta y paro",piramide:"cómo de envejecida está una provincia",composicion:"qué sectores dan trabajo en cada comunidad"};
const typesHTML=cur=>`<div class="types">${LBTYPES.map(([k,l,svg])=>`<button type="button" data-v="${k}" aria-pressed="${k===cur}">${typeIcon(svg)}<b>${LBQ[k]}</b><small>${l}</small></button>`).join("")}</div>`;
const typesTips=root=>tipBind(root.querySelectorAll(".types button"),b=>{ const k=b.dataset.v; return `<b>${LBQ[k]}</b> <span style="opacity:.7">· ${LBTYPES.find(t=>t[0]===k)[1]}</span><br>${LBDESC[k]}.${LBEJ[k]?`<br><i>Ejemplo: ${LBEJ[k]}.</i>`:""}`; });
const lbh=(t,l)=>`<button type="button" class="iq lbh" data-h="${esc(t)}" aria-label="${esc(l||"Más información")}">${IQ_SVG}</button>`;
const lbBind=root=>{ const ns=root.querySelectorAll(".lbh"); tipBind(ns,b=>esc(b.dataset.h)); ns.forEach(b=>b.addEventListener("click",e=>{ e.preventDefault(); e.stopPropagation(); }));};

// Ayudas del menú del laboratorio: cada botón, casilla y selector explica qué hace al pasar el ratón o al tabular
const LBTIPS=[
  [".slot:not(.enc) button.pick[data-i]","Cambiar el dato","Pulsa para elegir otro dato. Puedes buscar por nombre o por tema (trabajo, vivienda, renta…)."],
  ["button.pick[data-add]","Añadir otro dato","Suma un dato más al gráfico."],
  ["button.pick[data-enc=sz]","Tamaño del punto","Los municipios con más valor en este dato se dibujan con un punto más grande. Si no eliges nada, el tamaño es la población."],
  ["button.pick[data-enc=col]","Color del punto","Colorea los puntos según un tercer dato, para ver si hay algún patrón."],
  ["button.pick[data-bsz]","Tamaño de la burbuja","Cuanto mayor es el valor de este dato en una provincia, más grande su burbuja. Por defecto, los habitantes."],
  ["button[data-x]","Quitar este dato","Lo quita del gráfico."],
  ["button[data-xenc],button[data-xbsz]","Quitar","Vuelve a la opción por defecto."],
  ["#exmu button[data-u='']","Municipios","Cada punto o zona es un municipio. Es el detalle máximo: 8.139 en toda España."],
  ["#exmu button[data-u=prov]","Provincias","Agrupa por provincia: se lee mejor, pero solo con datos que existan a esa escala."],
  ["#exmu button[data-u=ccaa]","Comunidades","Agrupa por comunidad autónoma: la vista más general."],
  ["#exprov","Provincia","Limita el gráfico a una provincia, o déjalo en Toda España."],
  ["#exsize","Tamaño de los municipios","Quita los municipios pequeños, cuyas cifras suelen ser poco fiables porque salen de pocos vecinos."],
  ["#lbmy","Resaltar en el gráfico","Los municipios que elijas aparecen resaltados en el gráfico para encontrarlos enseguida. Por defecto, el tuyo."],
  ["label.chk:has(#exbv)","Mapa de dos colores","Colorea cada municipio según dos datos a la vez, para ver dónde coinciden: por ejemplo, poca renta y mucho paro."],
  ["label.chk:has(#exw)","Peso de los municipios grandes","Por defecto cada municipio cuenta igual, sea una aldea o Madrid. Si lo marcas, cuentan según sus habitantes."],
  ["label.chk:has(#exq)","Cuatro zonas","Traza dos líneas, una en la media de cada dato, y separa los municipios por encima y por debajo de las dos: por ejemplo, mucho paro y poca renta."],
  ["label.chk:has(#exlx)","Ampliar los valores bajos","Escala logarítmica. Útil cuando unos pocos municipios tienen valores enormes y aplastan al resto: separa mejor los pequeños."],
  ["label.chk:has(#vomw)","Peso de los municipios grandes","Por defecto cada municipio cuenta igual. Si lo marcas, cuentan según sus habitantes."],
  ["#exswap","Intercambiar ejes","Cambia qué dato va en horizontal y cuál en vertical. La relación es la misma, vista desde el otro lado."],
  ["#exgo","Ver como relación","Cruza este dato con otro para ver si van juntos."],
  ["#vow button[data-v='1']","Personas","Cada persona cuenta una vez: pesan más los municipios grandes."],
  ["#vow button[data-v='0']","Municipios","Cada municipio cuenta una vez, sea grande o pequeño."],
  ["#vodg button[data-v='']","Todos juntos","Un único reparto con todos los municipios."],
  ["#vodg button[data-v=ccaa]","Por comunidad","Un reparto por cada comunidad autónoma, para compararlas."],
  ["#vodg button[data-v=prov]","Por provincia","Un reparto por cada provincia, para compararlas."],
  ["#vodg button[data-v=size]","Por tamaño","Separa los pueblos pequeños de las ciudades grandes."],
  ["#vodg button[data-v=renta]","Por nivel de renta","Separa los municipios ricos de los pobres."],
  ["#vogb button[data-v=ccaa]","Por comunidad","Una barra por comunidad autónoma."],
  ["#vogb button[data-v=prov]","Por provincia","Una barra por provincia."],
  ["#vogb button[data-v=size]","Por tamaño","Una barra por tamaño de municipio, de pueblos a grandes ciudades."],
  ["#vogb button[data-v=q]","Por nivel del dato","Divide los municipios en tramos, de los que tienen menos a los que tienen más de este dato."],
  ["#slu button[data-v=prov]","Provincias","Compara provincias."],
  ["#slu button[data-v=ccaa]","Comunidades","Compara comunidades autónomas."],
  // series
  ["#pspick","Cambiar el dato","Pulsa para elegir otro dato. Puedes buscar por nombre o por tema."],
  ["#psadd","Añadir una serie","Suma otra serie al gráfico (hasta siete) para compararlas. Si miden cosas distintas, usa el índice."],
  ["button[data-sw]","Cambiar la serie","Pulsa para sustituir esta serie por otra."],
  ["button[data-rs]","Quitar la serie","La quita del gráfico."],
  ["#psipc","Añadir el IPC general","Suma la subida media de precios, para ver si este dato sube más o menos que la vida en general."],
  [".seg[aria-label='Ámbito'] button","Dónde mirar","Cambia entre toda España, tu provincia o tu municipio, si el dato existe a esa escala."],
  ["#ps-q","Buscar un municipio","Escribe un municipio para ver sus datos en lugar de los de España."],
  ["#psd","Desde","Primer año que se dibuja."],
  ["#psh","Hasta","Último año que se dibuja."],
  ["label.chk:has(#psgob)","Quién gobernaba","Sombrea el fondo según el partido que gobernaba en España en cada año."],
  ["label.chk:has(#psidx)","Como índice","Pone todas las series en 100 en el año de referencia: una línea en 130 ha crecido un 30 % desde entonces. Permite comparar euros, precios y personas."],
  [".psb",'Año de referencia',"El año en que todas las series valen 100."],
  ["label.chk:has(#psreal)","Descontar la inflación","Convierte los euros de cada año a euros de hoy, para ver cuánto compra de verdad el dato."],
  ["#psref","País de referencia","Se compara España con este país."],
  ["label.chk:has(#psrel)","Ver como diferencia","Dibuja cada país como la distancia a la referencia: por encima o por debajo."],
  [".pschips label.chk","Países","Marca o desmarca este país en el gráfico. España siempre aparece."],
  // pirámide y composición
  ["#pyz","Dónde","Elige España, una comunidad o una provincia."],
  ["#pyc button[data-v=es]","Comparar con España","Superpone la pirámide de España, para ver en qué se diferencia."],
  ["#pyc button[data-v=past]","Comparar con el pasado","Superpone la pirámide de hace unos años, para ver cómo ha envejecido."],
  ["#pyc button[data-v=none]","Sin comparar","Solo la pirámide del lugar elegido."],
  ["#pyc button[data-v=other]","Comparar con otro lugar","Superpone la pirámide de otra comunidad, provincia o España, para ver en qué se diferencian."],
  ["#pyq","Otro lugar","El lugar con el que se compara. La línea negra es su pirámide."],
  ["#pyy button[data-v='']","Hoy","Compara con la pirámide actual de ese lugar."],
  ["#pyy button[data-v=past]","Hace años","Compara con cómo era la población de ese lugar hace unos años. Así puedes comparar un lugar de hoy con otro del pasado."],
  ["label.chk:has(#pyp)","En porcentaje","Cada barra es el porcentaje del total, no el número de personas: permite comparar lugares de distinto tamaño."],
  ["#cof","Qué reparto","Elige qué quieres ver repartido: sectores, voto, edades…"],
  ["#cog button[data-v=ccaa]","Por comunidad","Una barra por comunidad autónoma."],
  ["#cog button[data-v=prov]","Por provincia","Una barra por provincia."],
  ["#cog button[data-v=size]","Por tamaño","Una barra por tamaño de municipio, de pueblos a grandes ciudades."],
  ["#cog button[data-v=q]","Por nivel de renta","Una barra por tramo de renta, de los municipios más pobres a los más ricos."],
  ["#coo","Ordenar por","Ordena las barras según el tamaño de esta parte."]
];
function lbTips(root){ if(!root) return;
  LBTIPS.forEach(([sel,t,d])=>{ let ns; try{ ns=root.querySelectorAll(sel); }catch(e){ return; }
    ns.forEach(n=>{ if(n._lbt) return; n._lbt=1; const show=()=>{ const sd=n.dataset.ser&&SERES&&SERES[n.dataset.ser]; tipShow(n,sd&&sd.d?`<b>${esc(sd.l)}</b><br>${esc(sd.d)}<br><span style="opacity:.7">Pulsa para cambiar</span>`:`<b>${t}</b><br>${d}`); };
      n.addEventListener("mouseenter",show); n.addEventListener("focusin",show); n.addEventListener("mouseleave",tipHide); n.addEventListener("focusout",tipHide); }); }); }
function lbTipsWatch(){ const bar=document.getElementById("exbar"); if(!bar||bar._lbw) return; bar._lbw=1; let pend=false;
  new MutationObserver(()=>{ if(pend) return; pend=true; requestAnimationFrame(()=>{ pend=false; lbTips(bar); }); }).observe(bar,{childList:true,subtree:true}); lbTips(bar); }
const nfG=new Intl.NumberFormat("es-ES",{useGrouping:"always",maximumFractionDigits:0});
const hintHTML=v=>`<p class="hint">${LBDESC[v]}.${LBEJ[v]?` <span class="ex">Ejemplo: ${LBEJ[v]}.</span>`:""}</p>`;
const typeIcon=(svg,on)=>`<svg width="40" height="26" viewBox="0 0 40 26" aria-hidden="true" style="fill:var(--rule-2);stroke:var(--rule-2)">${svg}</svg>`;
const QUICK=["renta","paroReg","edad","alquiler","part","superiores","varPob","vt"];
const NBKEY="cifrario.cuaderno";
const nbGet=()=>{ try{ return JSON.parse(localStorage.getItem(NBKEY)||"[]"); }catch(e){ return []; } };
const nbSet=a=>{ try{ localStorage.setItem(NBKEY,JSON.stringify(a.slice(0,30))); return true; }catch(e){ return false; } };

// los indicadores añadidos desde otras fuentes viven en data/extra.json (columnas alineadas con index.json); solo el laboratorio los necesita
let EXTRA_P=null;
function loadExtra(){ return EXTRA_P||(EXTRA_P=getJSON("/data/extra.json").then(ex=>{ const n=IDX[0].row.length; ex.fields.forEach((f,i)=>{ F[f]=n+i; }); IDX.forEach((o,i)=>{ const e=ex.rows[i]; for(let j=0;j<e.length;j++) o.row.push(e[j]); }); for(const k in ESMEAN) delete ESMEAN[k]; for(const k in PCTL) delete PCTL[k]; vInit(); }).catch(e=>{ console.error(e); EXTRA_P=null; })); }
async function renderExplorar(h){
  if(!EXTRA_P&&!document.querySelector(".lb")) view.innerHTML='<p class="loading">Cargando los datos del laboratorio…</p>';
  // los datos de provincias, comunidades y Europa solo se esperan si el enlace los pide; si no, se cargan por detrás
  const needR=/[?&,=]R_|[?&]u=(prov|ccaa)/.test(h)||/[?&,=]R_/.test(h), needE=/[?&,=]E_|[?&]u=eu/.test(h);
  await Promise.all([loadExtra(),needR?loadRegional():null,needE?loadEuropa():null]);
  if(!needR) loadRegional(); if(!needE) setTimeout(()=>loadEuropa(),3000);
  if(!/^explorar/.test(pathToKey())) return;   // el lector ya se ha ido a otra página mientras cargaban los datos
  const blank=/^explorar\/?$/.test(h);
  // /laboratorio/ abre directamente el lienzo con una relación de ejemplo; la guía de arriba propone por dónde empezar
  if(blank) EX={...EX,v:"cruce",d:["paroReg","renta"],t:"g1",p:"",c:[],o:null};
  exParse(h); if(!/[?&]m=/.test(h)&&myOk(lastMun)) EX.m=lastMun; exSync();
  document.title="Laboratorio · Indicio";
  view.innerHTML=LABNAV("explorar")+`<div class="lbq" role="group" aria-label="Ideas para empezar"><span class="lbq-l">Prueba con</span><div class="lbq-c">${EXQ.map(([l],i)=>`<button type="button" data-gq="${i}">${l}</button>`).join("")}</div></div><div class="lb">
    <aside class="lb-side" id="exbar" aria-label="Elige qué dibujar"></aside>
    <div class="lb-canvas">
      <div class="lb-bar"><div style="min-width:0"><h2 id="lbtitle"></h2><div class="sub" id="lbsub"></div></div>
        <div class="acts ico"><button type="button" class="lbedit" id="lbedit" title="Cambiar gráfico" aria-label="Cambiar gráfico"><svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg></button><button type="button" id="lbsave" title="Guardar en mis análisis" aria-label="Guardar en mis análisis" aria-pressed="false"><svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg></button><button type="button" id="excopy" title="Copiar enlace para compartir" aria-label="Compartir"><svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true"><circle cx="6" cy="12" r="2.4"/><circle cx="18" cy="6" r="2.4"/><circle cx="18" cy="18" r="2.4"/><path d="M8.2 11l7.6-4M8.2 13l7.6 4"/></svg></button><button type="button" id="lbimg" title="Descargar imagen" aria-label="Descargar imagen"><svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg></button><button type="button" id="lbcsv" title="Descargar datos (CSV)" aria-label="Descargar datos en CSV"><svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="1.5"/><path d="M4 10h16M4 14.5h16M10 5v14"/></svg></button></div></div>
      <div id="vnote"></div>
      <div id="exout" class="lb-out"></div>
      <div class="reading"><div class="say" id="lbsay"></div></div>
      <div id="lbtest"></div>
      <div id="lbcausal"></div>
      <div id="lbmore"></div>
      <div class="nb" id="lbnb"></div>
    </div></div>${methodNote()}`;
  document.getElementById("excopy").addEventListener("click",e=>{ const url=location.origin+keyToPath(exHash()); try{ navigator.clipboard.writeText(url).then(()=>toast("✓ Enlace copiado: pégalo donde quieras compartir este análisis.",2500),()=>prompt("Copia este enlace:",url)); }catch(x){ prompt("Copia este enlace:",url); } });
  document.getElementById("lbsave").addEventListener("click",e=>{ const a=nbGet(), hh=exHash(); if(!a.some(x=>x.h===hh)){ a.unshift({h:hh,t:lbTitle(),v:EX.v}); if(!nbSet(a)){ toast("No se pudo guardar en este navegador.",2500); return; } toast("★ Guardado en <b>Mis análisis</b>: lo tienes al final del lienzo.",2500); } else { nbSet(a.filter(x=>x.h!==hh)); } exDraw(); nbDraw(); });
  document.getElementById("lbcsv").addEventListener("click",exCSV);
  document.getElementById("lbedit").addEventListener("click",()=>{ const b=document.getElementById("exbar"); window.scrollTo({top:b.getBoundingClientRect().top+window.scrollY-(document.getElementById("top").offsetHeight+10),behavior:"smooth"}); });
  document.getElementById("lbimg").addEventListener("click",exPNG);
  const lsv=document.getElementById("lbsaved"); if(lsv) lsv.addEventListener("click",()=>document.getElementById("lbnb").scrollIntoView({behavior:"smooth"}));
  view.querySelectorAll("[data-gq]").forEach(b=>b.addEventListener("click",()=>{ const [l,v,o]=EXQ[+b.dataset.gq]; EX={...EX,v,d:o.d||EX.d,t:o.t||"",p:"",c:o.c||[],gb:o.gb||EX.gb,o:o.o||null}; if(o.ser){ Object.assign(PS,{s:o.ser.slice(),idx:o.idx===0?0:1,b:o.b||null,desde:null,hasta:null,real:0}); } navTo(exHash()); }));
  lbTipsWatch(); exBar(); exDraw(); nbDraw();
}

function nbDraw(){
  const box=document.getElementById("lbnb"); if(!box) return; const a=nbGet();
  box.innerHTML=`<b>Mis análisis guardados</b> · ${a.length?`${a.length} análisis`:"aún ninguno: pulsa la estrella de arriba para volver luego a este gráfico"} <span class="muted">(se guarda en este navegador)</span>${a.length?`<div class="list">${a.map((x,i)=>`<a href="${esc(x.h)}" title="${esc(x.t)}">${typeIcon((LBTYPES.find(t=>t[0]===x.v)||LBTYPES[0])[2])}<span>${esc(x.t)}</span><button type="button" data-i="${i}" aria-label="Quitar del cuaderno">×</button></a>`).join("")}</div>`:""}`;
  box.querySelectorAll("button[data-i]").forEach(b=>b.addEventListener("click",e=>{ e.preventDefault(); e.stopPropagation(); const a2=nbGet(); a2.splice(+b.dataset.i,1); nbSet(a2); nbDraw(); }));
}

// ---------- panel lateral ----------
const SLOTS={matriz:{n:10,l:i=>"Dato "+(i+1),add:"Añadir dato"},burbujas:{n:2,l:["Horizontal ↔","Vertical ↕"]},mapa:{get n(){return EX.bv?2:1},get l(){ return EX.bv?["Primer dato (azul)","Segundo dato (rosa)"]:["Color del mapa"]; }},cruce:{n:2,l:["Horizontal ↔","Vertical ↕"]},tabla:{n:6,l:i=>"Columna "+(i+1),add:"Añadir columna"},grupos:{n:4,l:i=>(EX.gb==="q"&&i===0?"Ordenar por":"Dato "+(i+1)),add:"Añadir dato"},distribucion:{n:1,l:["Dato"]}};
// =====================================================================
// DATOS PROPIOS: el lector calcula un dato nuevo con dos que ya existen (sin fórmulas libres)
// Cada dato propio se define con una operación y una o dos claves del catálogo. Su clave sale de esa definición
// («u_<operación>_<dato>_<dato>»), así que una misma clave significa siempre lo mismo: las cachés no se quedan viejas
// y un enlace puede llevar la definición dentro («dv=op~a~b~formato~unidad~nombre») para quien no tenga nada guardado.
// Se guardan en el navegador (localStorage «indicio.vars»); los que llegan por enlace viven solo en la página (tmp) hasta que se guardan.
// =====================================================================
const VKEY="indicio.vars", VMAX=10, VGROUP="Mis datos";
let VARS=[], VBYK={}, VINIT=false;
const vLow=s=>/^[A-ZÁÉÍÓÚÑ]{2,}/.test(s)?s:low(s);
const vShort=k=>((CATK[k]||{}).l||k).replace(/\s*\([^)]*\)/g,"").trim();
// Unidad de cada dato (para saber qué datos se pueden combinar). Sale del formato del catálogo, con retoques para los datos
// cuyo formato dice menos de lo que son (el valor tasado va en €/m², el alquiler mensual en €/mes, los saldos migratorios son tasas...).
// Un dato nuevo cuyo formato no conocemos cuenta como su propia unidad: no se mezcla con nada hasta que se le ponga nombre aquí.
// [cómo se dice «está en…», abreviatura para el resultado, singular para «por…», plural para «por cada 100…»]
const VU={eur:["euros","€","euro","euros"],eurm2:["euros por m²","€/m²","euro por m²","euros por m²"],eurmes:["euros al mes","€/mes","euro al mes","euros al mes"],
  pct:["%","%","1 %","%"],chg:["cambio en %","%","1 % de cambio","% de cambio"],pts:["puntos de porcentaje","puntos","punto","puntos"],
  pers:["habitantes","hab.","habitante","habitantes"],viv:["viviendas","viviendas","vivienda","viviendas"],dens:["habitantes por km²","hab./km²","hab./km²","hab./km²"],
  km:["km","km","km","km"],km2:["km²","km²","km²","km²"],years:["años","años","año","años"],mil:["compraventas por 1.000 habitantes","por 1.000 hab.","por 1.000 hab.","por 1.000 hab."],
  migmil:["saldo por 1.000 habitantes y año","por 1.000 hab. y año","por 1.000 hab. y año","por 1.000 hab. y año"],gini:["índice de Gini","puntos de Gini","punto de Gini","puntos de Gini"],
  ratio:["veces (P80/P20)","veces","vez","veces"],hog:["personas por hogar","pers./hogar","persona por hogar","personas por hogar"]};
const VUF={eur:"eur",eurm2:"eurm2",pct:"pct",pct_chg:"chg",pts:"pts",int:"pers",dens:"dens",km:"km",years:"years"};
const VUK={valorTasado:"eurm2",alqEurMes:"eurmes",alqInmuebles:"viv",migExt:"migmil",migInt:"migmil",superficie:"km2",hogarMedio:"hog",compHab:"mil",gini:"gini",p80p20:"ratio"};
const vUC=k=>VUK[k]||VUF[(CATK[k]||{}).f]||"u:"+k;
const vUN=c=>(VU[c]||["una unidad propia"])[0];
// operaciones que solo tienen sentido con datos en la misma unidad
const VSAME=/^(res|sum|pct)$/;
// unidad del resultado de dividir un dato entre otro (A entre B) cuando las unidades no son las mismas
const VDIV={"eur|eurm2":"m²","eurmes|eurm2":"m²","eur|eurmes":"meses","pers|km2":"hab./km²"};
function vRU(op,a,b){ const ca=vUC(a), cb=vUC(b); if(ca===cb||!/^(x|p100)$/.test(op)) return null; const A=VU[ca]||["una unidad propia","","",""], B=VU[cb]||["una unidad propia","","",""];
  if(op==="x"){ const sp=VDIV[ca+"|"+cb]; if(sp) return {u:sp,t:sp}; return {u:`${A[1]||"unidades"} por ${B[2]||"unidad"}`,t:`${A[0]} por ${B[2]||"unidad"}`}; }
  return {u:`${A[1]||"unidades"} por cada 100 ${B[3]||"unidades"}`,t:`${A[0]} por cada 100 ${B[3]||"unidades"}`}; }
const VUMAX=32, VFORMS=[["pct","%"],["veces","veces"],["eur","€"],["pp","puntos"],["years","años"],["num","número"]];
const VOPS={
  pct:{t:"Qué parte de un dato es otro (en %)",r:["Qué parte de…","…es este otro dato"],div:1,calc:(t,p)=>t?p/t*100:null,
    say:(A,B)=>`En cada municipio: ${B}, como porcentaje de ${A}.`,name:(A,B)=>`${cap(B)} sobre ${vLow(A)}`,how:(A,B)=>`${vLow(B)} como porcentaje de ${vLow(A)}`},
  p100:{t:"Cuántos por cada 100 de otro",r:["Cuántos hay de…","…por cada 100 de"],div:1,calc:(a,b)=>b?a/b*100:null,
    say:(A,B)=>`En cada municipio: ${A} por cada 100 ${B}.`,name:(A,B)=>`${cap(A)} por cada 100 ${vLow(B)}`,how:(A,B)=>`${vLow(A)} por cada 100 ${vLow(B)}`},
  x:{t:"Cuántas veces es un dato respecto a otro",r:["Cuántas veces es…","…respecto a"],div:1,calc:(a,b)=>b?a/b:null,
    say:(A,B,u)=>`En cada municipio: ${A} dividido entre ${B}${u?`, en ${u}`:""}.`,name:(A,B,u)=>`${cap(A)} entre ${vLow(B)}${u?` (${u})`:""}`,how:(A,B)=>`${vLow(A)} dividido entre ${vLow(B)}`},
  res:{t:"La diferencia entre dos datos (uno menos otro)",r:["Empieza con…","…y réstale"],calc:(a,b)=>a-b,
    say:(A,B)=>`En cada municipio: ${A} menos ${B}.`,name:(A,B)=>`${cap(A)} menos ${vLow(B)}`,how:(A,B)=>`${vLow(A)} menos ${vLow(B)}`},
  sum:{t:"La suma de dos datos",r:["Suma…","…más"],calc:(a,b)=>a+b,
    say:(A,B)=>`En cada municipio: ${A} más ${B}.`,name:(A,B)=>`${cap(A)} más ${vLow(B)}`,how:(A,B)=>`${vLow(A)} más ${vLow(B)}`},
  prov:{t:"Cada municipio frente a la media de su provincia",r:["Qué dato quieres comparar"],un:1,
    say:A=>`En cada municipio: ${A}, comparado con la media de su provincia (ponderada por población).`,name:A=>`${cap(A)} frente a la media de su provincia`,how:A=>`${vLow(A)} frente a la media de su provincia`},
  es:{t:"Cada municipio frente a la media de España",r:["Qué dato quieres comparar"],un:1,
    say:A=>`En cada municipio: ${A}, comparado con la media de España (ponderada por población).`,name:A=>`${cap(A)} frente a la media de España`,how:A=>`${vLow(A)} frente a la media de España`}};
const VREC=[
  {t:"¿Cuánto pesa la deuda sobre la renta?",d:"La deuda del ayuntamiento por habitante, como porcentaje de la renta de cada persona.",op:"pct",a:"renta",b:"deudaHab",n:"Deuda del ayuntamiento sobre la renta por persona"},
  {t:"¿Cuántos mayores hay por cada 100 menores?",d:"Personas de 65 años o más por cada 100 menores de 18: el índice de envejecimiento.",op:"p100",a:"mayores65",b:"menores18",n:"Mayores de 65 por cada 100 menores de 18"},
  {t:"¿Quién gana más que el resto de su provincia?",d:"La renta de cada municipio frente a la media de su provincia. 100 % es igual que la media.",op:"prov",a:"renta",n:"Renta por persona frente a la media de su provincia"},
  {t:"¿Cuántos metros cuadrados compra un año de renta?",d:"La renta anual de una persona dividida entre lo que cuesta un metro cuadrado.",op:"x",a:"renta",b:"valorTasado",un:"m²",n:"Metros cuadrados que compra la renta de un año"},
  {t:"¿Cuánto de lo que se ingresa son prestaciones?",d:"Las prestaciones por desempleo y las demás prestaciones, sumadas.",op:"sum",a:"ingDesempleo",b:"ingPrestaciones",n:"Ingresos que vienen de prestaciones (desempleo y otras)"},
  {t:"¿Crece el pueblo más que su provincia?",d:"El cambio de población de cada municipio frente al de su provincia.",op:"prov",a:"varPob",n:"Crecimiento de la población frente a su provincia"},
  {t:"¿Qué parte del gasto va a servicios sociales?",d:"De cada 100 euros que gasta el ayuntamiento, cuántos van a servicios sociales.",op:"pct",a:"gastoHab",b:"gastoSocialHab",n:"Parte del gasto del ayuntamiento que va a servicios sociales"},
  {t:"¿Cuánta deuda hay frente a lo que se ingresa?",d:"La deuda por habitante, como porcentaje de lo que el ayuntamiento recauda cada año con impuestos y tasas.",op:"pct",a:"ingPropiosHab",b:"deudaHab",n:"Deuda del ayuntamiento sobre sus ingresos propios de un año"}];
const vBase=k=>{ const c=CATK[k]; return !!c&&!c.custom&&!c.reg&&!c.eu&&!c.der&&!c.nat&&F[k]!=null; };
const vKey=d=>"u_"+d.op+"_"+d.a+(d.b?"_"+d.b:"");
const vYear=k=>{ const m=((CATK[k]||{}).src||"").match(/\b(?:19|20)\d\d\b/g); return m?+m[m.length-1]:null; };
// ¿el dato es una cantidad que tiene sentido dividir por su media? (los porcentajes y los cambios, no: se restan)
function vRatio(a){ const f=(CATK[a]||{}).f; if(/^(eur|int|dens|km|years)$/.test(f)) return true; if(f!=="num1") return false; return !rowsAll().some(r=>r[F[a]]!=null&&r[F[a]]<0); }
function vDefF(d){ const fa=vUC(d.a), fb=d.b?vUC(d.b):"", pc=/^(pct|chg|pts)$/;
  if(d.op==="pct") return "pct"; if(d.op==="p100") return "num"; if(d.op==="x") return "veces";
  if(d.op==="prov"||d.op==="es") return vRatio(d.a)?"pct":pc.test(fa)?"pp":"num";
  if(d.op==="res") return fa===fb&&pc.test(fa)?"pp":fa===fb&&/^(eur|years)$/.test(fa)?fa:"num";
  return fa!==fb?"num":fa==="pts"?"pp":pc.test(fa)?"pct":/^(eur|years)$/.test(fa)?fa:"num"; }
// formato y unidad por defecto: si se divide entre una unidad distinta, la cifra lleva la unidad que sale («€ por habitante»), no «veces» ni «%»
function vDefFU(d){ const ru=d.b?vRU(d.op,d.a,d.b):null, un=ru&&ru.u.length<=VUMAX?ru.u:""; return un?{f:"num",un}:{f:vDefF(d),un:""}; }
function vSanit(d){ d.op=String(d.op||""); d.a=String(d.a||""); d.b=VOPS[d.op]&&VOPS[d.op].un?"":String(d.b||""); const clean=t=>String(t||"").replace(/'/g,"’").replace(/"/g,"”").replace(/&/g," y ").replace(/[~<>`\\\u0000-\u001f]/g," ").replace(/\s+/g," ").trim();   // los nombres viajan en enlaces: nada que se pueda colar en el HTML
  d.n=clean(d.n).slice(0,80); d.un=clean(d.un).slice(0,VUMAX); if(d.un) d.f="num"; else if(!VFORMS.some(x=>x[0]===d.f)&&vValid(d)){ const fu=vDefFU(d); d.f=fu.f; d.un=fu.un; } d.f=VFORMS.some(x=>x[0]===d.f)?d.f:"num"; return d; }
function vValid(d){ return !!d&&!!VOPS[d.op]&&vBase(d.a)&&(VOPS[d.op].un?!d.b:(vBase(d.b)&&d.b!==d.a)); }
// una columna con el valor de cada municipio (null si no hay dato o no se puede calcular)
function vValues(d){
  const rows=rowsAll(), out=new Array(rows.length).fill(null), A=F[d.a], o=VOPS[d.op];
  if(o.un){ const g=d.op==="prov"?r=>r[F.prov]:()=>"es", sw=new Map(), sx=new Map(), ratio=vRatio(d.a);
    rows.forEach(r=>{ const v=r[A], w=r[F.pop]; if(v==null||!w) return; const k=g(r); sw.set(k,(sw.get(k)||0)+w); sx.set(k,(sx.get(k)||0)+v*w); });
    rows.forEach((r,i)=>{ const v=r[A], k=g(r); if(v==null||!sw.get(k)) return; const m=sx.get(k)/sw.get(k), y=ratio?(m?v/m*100:null):v-m; out[i]=y!=null&&isFinite(y)?y:null; }); }
  else { const B=F[d.b]; rows.forEach((r,i)=>{ const a=r[A], b=r[B]; if(a==null||b==null) return; const y=o.calc(a,b); out[i]=y!=null&&isFinite(y)?y:null; }); }
  return out;
}
const vFmt=(f,un)=>un?v=>FMT.num(v)+NB+un:(FMT[f]||FMT.num);
// registra la columna en las filas y el dato en el catálogo
function vDefine(d){
  const k=vKey(d), rows=rowsAll(), vals=vValues(d), la=vShort(d.a), lb=d.b?vShort(d.b):"", o=VOPS[d.op]; d.key=k;
  let i=F[k]; if(i==null){ i=IDX[0].row.length; F[k]=i; } rows.forEach((r,j)=>{ r[i]=vals[j]; });
  const A=CATK[d.a], B=d.b?CATK[d.b]:null, how=o.how(la,lb);
  const c={k,l:d.n||o.name(la,lb),g:VGROUP,f:d.f,src:`Cálculo propio (${how}) con datos de ${[...new Set([A.src,B&&B.src].filter(Boolean))].join(" y ")}`,how,custom:1,def:d};
  if(d.un){ c.un=d.un; c.f="un:"+k; FMT[c.f]=vFmt("num",d.un); }
  const j=CAT.findIndex(x=>x.k===k); if(j>=0) CAT[j]=c; else CAT.push(c); CATK[k]=c; VBYK[k]=d;
  delete COVER[k]; delete ESMEAN[k]; delete PCTL[k];
  return c;
}
function vStore(){ try{ localStorage.setItem(VKEY,JSON.stringify(VARS.filter(d=>!d.tmp).map(({op,a,b,n,f,un})=>({op,a,b,n,f,un})))); return true; }catch(e){ return false; } }
function vInit(){ if(VINIT) return; VINIT=true; let raw=[]; try{ const a=JSON.parse(localStorage.getItem(VKEY)||"[]"); if(Array.isArray(a)) raw=a.slice(0,VMAX); }catch(e){}
  const bad=[]; raw.forEach(d=>{ if(!d||typeof d!=="object"){ return; } vSanit(d); if(vValid(d)){ if(!VBYK[vKey(d)]){ VARS.push(d); vDefine(d); } } else bad.push(d.n||"un dato sin nombre"); });
  if(bad.length){ vStore(); toast(`${bad.length===1?"Un dato propio":"Algunos datos propios"} (${esc(bad.join(", "))}) ya no se puede calcular porque el dato en el que se basaba ha cambiado: lo hemos quitado.`,7000); } }
function vRemove(k){ VARS=VARS.filter(d=>vKey(d)!==k); delete VBYK[k]; delete CATK[k]; const j=CAT.findIndex(x=>x.k===k); if(j>=0) CAT.splice(j,1); vStore(); }
function vDelete(k){ if(typeof EX!=="undefined"){ EX.c=(EX.c||[]).filter(x=>x!==k); if(EX.sz===k) EX.sz=""; if(EX.col===k) EX.col=""; if(EX.o&&EX.o.replace(/^-/,"")===k) EX.o=null; } vRemove(k); }
function vSwapUse(a,b){ if(typeof EX==="undefined") return; const sw=k=>k===a?b:k; EX.d=EX.d.map(sw); EX.c=(EX.c||[]).map(sw); EX.sz=sw(EX.sz); EX.col=sw(EX.col); if(EX.o){ const m=EX.o.match(/^(-?)(.*)$/); EX.o=m[1]+sw(m[2]); } }
// enlaces: «dv=op~a~b~formato~unidad~nombre»; lo que no cuadra con los datos de hoy se descarta
const vEnc=d=>[d.op,d.a,d.b||"",d.f||"",d.un||"",(d.n||"").replace(/~/g,"-")].join("~");
function vFromUrl(s){ const [op,a,b,f,un,...nm]=String(s).split("~"), d=vSanit({op,a,b,f,un,n:nm.join(" ")});
  if(!vValid(d)) return null; const k=vKey(d); if(VBYK[k]) return k; if(VARS.length>=2*VMAX) return null; d.tmp=true; VARS.push(d); vDefine(d); return k; }
const vCustomIn=ks=>[...new Set(ks.filter(k=>k&&VBYK[k]))];
// los datos propios que lleva el gráfico actual (para el enlace y para los avisos)
function vUsed(S){ const S2=S||EX, n=EX.v&&SLOTS[EX.v]?SLOTS[EX.v].n:1; return vCustomIn([...(S2.d||[]).slice(0,Math.max(1,n)),...(S2.c||[]),S2.sz,S2.col,(S2.o||"").replace(/^-/,"")]); }
// qué datos «lleva dentro» un dato: él mismo y los dos con que se calcula
const vSet=k=>{ const d=VBYK[k], s=new Set([k]); if(d){ s.add(d.a); if(d.b) s.add(d.b); if(d.op==="prov") s.add("prov"); if(/^(pct|p100|x|res|sum)$/.test(d.op)&&(d.a==="pop"||d.b==="pop")) s.add("lpop"); } return s; };
// controles que no se deben ofrecer para la pareja x, y: ya están dentro de la fórmula de alguno de los dos
function vForbid(x,y){ const s=new Set(); [x,y].forEach(k=>{ if(VBYK[k]) vSet(k).forEach(c=>{ if(c!==k) s.add(c); }); }); s.delete(x); s.delete(y); return s; }
// pares que comparten dato (y por eso van juntos por construcción)
function vForbidNote(x,y){ const vf=vForbid(x,y), hid=CTAGS.map(t=>t[0]).filter(k=>k!==x&&k!==y&&vf.has(k)); if(!hid.length) return "";
  const own=[x,y].filter(k=>VBYK[k]).map(k=>`«${esc(vLow(labK(k)))}»`); return `<div class="czn2">No te ofrecemos igualar por ${listY(hid.map(k=>CKNOWN[k]))}: ${hid.length>1?"están":"está"} dentro del cálculo de ${listY(own)} y la relación saldría deformada.</div>`; }
function vShared(ks){ const out=[]; for(let i=0;i<ks.length;i++) for(let j=i+1;j<ks.length;j++){ const a=ks[i], b=ks[j]; if(!VBYK[a]&&!VBYK[b]) continue; const sa=vSet(a), sb=vSet(b), com=[...sa].filter(k=>sb.has(k)&&k!=="prov"&&k!=="lpop");
    if(!com.length) continue; const nm=k=>`«${esc(vLow(vShort(k)))}»`;
    out.push(com.includes(a)||com.includes(b)?`${nm(com.includes(a)?b:a)} se calcula con ${nm(com.includes(a)?a:b)}`:`${nm(a)} y ${nm(b)} se calculan con ${listY(com.map(k=>vLow(vShort(k))).map(t=>"«"+esc(t)+"»"))}`); }
  return out; }
// estadísticas de un dato propio: cobertura, rango, histograma, ejemplos y lo que conviene avisar
const VEXM=["28079","08019","46250","41091","50297","29067","48020","07040"];
function vStats(d){
  const vals=vValues(d), rows=rowsAll(), o=VOPS[d.op], A=F[d.a], B=d.b?F[d.b]:-1, arr=[];
  let nA=0, nB=0, pop=0, zero=0; const popAll=d3.sum(rows,r=>r[F.pop]||0);
  rows.forEach((r,i)=>{ const a=r[A], b=B>=0?r[B]:null; if(a!=null) nA++; if(b!=null) nB++; if(o.div&&a!=null&&b!=null&&(d.op==="pct"?a:b)===0) zero++; const v=vals[i]; if(v!=null){ arr.push({v,i}); pop+=r[F.pop]||0; } });
  const n=arr.length; if(!n) return {n:0,nA,nB,zero,popShare:0};
  arr.sort((p,q)=>p.v-q.v); const q=p=>d3.quantileSorted(arr.map(a=>a.v),p), who=a=>{ const r=rows[a.i]; return {v:a.v,name:dispName(r[F.name]),pop:r[F.pop]||0}; };
  const lim=5*Math.max(Math.abs(q(.99)),Math.abs(q(.01))), oHi=o.div&&lim>0?arr.filter(a=>a.v>lim):[], oLo=o.div&&lim>0?arr.filter(a=>a.v<-lim):[];
  const lo=q(.01), hi=q(.99), nb=24, hist=new Array(nb).fill(0), span=(hi-lo)||1; arr.forEach(a=>{ if(a.v<lo||a.v>hi) return; hist[Math.min(nb-1,Math.floor((a.v-lo)/span*nb))]++; });
  const ex=[], tryEx=c=>{ const i=IDX.findIndex(x=>x.row[F.code]===c); if(i<0||vals[i]==null||ex.some(e=>e.i===i)) return; const r=rows[i]; ex.push({i,name:dispName(r[F.name]),v:vals[i],a:r[A],b:B>=0?r[B]:null,mine:c===lastMun}); };
  if(myOk(lastMun)) tryEx(lastMun); VEXM.forEach(c=>{ if(ex.length<3) tryEx(c); });
  return {n,nA,nB,zero,popShare:popAll?pop/popAll:0,min:who(arr[0]),max:who(arr[n-1]),med:q(.5),hist,lo,hi,ex,out:oHi.length+oLo.length,outTop:oHi.length?who(oHi[oHi.length-1]):oLo.length?who(oLo[0]):null,total:rows.length};
}
// avisos de método, en palabras llanas; no bloquean nada
function vWarns(d,st,me){
  const w=[], o=VOPS[d.op], f=vFmt(d.un?"num":d.f,d.un), la=esc(vLow(vShort(d.a))), lb=d.b?esc(vLow(vShort(d.b))):"";
  if(d.b){ const ya=vYear(d.a), yb=vYear(d.b); if(ya&&yb&&Math.abs(ya-yb)>=2) w.push(`«${la}» es de ${ya} y «${lb}» de ${yb}. Si el municipio ha cambiado mucho en esos años, la cifra mezcla dos momentos distintos.`);
    const ca=vUC(d.a), cb=vUC(d.b);
    if(ca!==cb){ const ua=vUN(ca), ub=vUN(cb), ru=vRU(d.op,d.a,d.b);
      if(/^(res|sum)$/.test(d.op)) w.push(`«${la}» está en ${ua} y «${lb}» en ${ub}: ${d.op==="res"?"restar":"sumar"} datos en unidades distintas no tiene sentido.`);
      else if(d.op==="pct") w.push(`«${la}» está en ${ua} y «${lb}» en ${ub}: no se puede decir qué parte de uno es el otro, y la cifra no es un porcentaje de verdad.`);
      else if(ru){ w.push(`${d.op==="x"?(me?`Estás dividiendo ${ua} entre ${ub}`:`Se dividen ${ua} entre ${ub}`):(me?`Estás mezclando ${ua} y ${ub}`:`Se mezclan ${ua} y ${ub}`)}: el resultado ${me?"serán":"son"} ${ru.t}.`);
        if(!d.un&&/^(veces|pct)$/.test(d.f)) w.push(`La cifra se muestra en «${d.f==="pct"?"%":"veces"}», pero la unidad real es otra. Puedes corregirla con «Editar», en «${VGROUP}».`); } } }
  if(st&&st.n){ if(st.zero) w.push(`En ${nfG.format(st.zero)} municipio${st.zero===1?"":"s"}, «${d.op==="pct"?la:lb}» vale 0 y no se puede dividir: se quedan sin cifra.`);
    if(d.b&&st.n<0.8*Math.min(st.nA,st.nB)) w.push(`Se pierden municipios: «${la}» tiene dato en ${nfG.format(st.nA)} y «${lb}» en ${nfG.format(st.nB)}, y solo cuentan los que tienen los dos.`);
    if(st.out) w.push(`${nfG.format(st.out)} municipio${st.out===1?"":"s"} tiene${st.out===1?"":"n"} cifras desorbitadas (por ejemplo, ${esc(st.outTop.name)}, ${nfG.format(st.outTop.pop)} habitantes, con ${f(st.outTop.v)}). Suele pasar cuando el dato por el que se divide es casi cero, sobre todo en pueblos pequeños. En el gráfico puedes dejarlos fuera con «Qué municipios».`); }
  return w; }

// ---------- selector de datos: primero el tema, luego el dato (con buscador) ----------
const PICK_ORDER=["Riqueza","Trabajo","Sectores","Población","Hogares","Educación","Vivienda","Precios","Ayuntamiento","Voto","Territorio","Provincias y comunidades","Europa",VGROUP], COVER={};
const cover=k=>k in COVER?COVER[k]:(COVER[k]=rowsAll().reduce((n,r)=>n+(r[F[k]]!=null?1:0),0));
let PICK_BTN=null;
// datos que no son de municipios: series anuales de España (IPC, vivienda, sueldos) y comparación entre países
const NATG={"Lista de la compra (IPC)":"Precios","Precios (IPC por grupos)":"Precios","Vivienda":"Vivienda","Sueldos":"Trabajo"};
function natItems(){ const out=[], SE=SERES||{}, yr=o=>{ const y=Object.keys(o.v||{}).sort(); return y.length?`${y[0]}–${y[y.length-1]}`:""; };
  Object.entries(SE).forEach(([k,o])=>out.push({k:"es:"+k,l:o.l,g:NATG[o.g]||o.g,src:o.src,nat:"es",sc:!!(o.ev&&!o.ev.nat),yrs:yr(o)}));
  if(PAIS) Object.entries(PSIND).filter(([k])=>(PAIS.paises.ES||{})[k]).forEach(([k,v])=>out.push({k:"pais:"+k,l:v.l+" (por países)",g:"Europa",src:"Eurostat",nat:"pais"}));
  return out; }
const loadAllCat=()=>Promise.allSettled([loadRegional(),loadPaises(),loadSeriesES(),loadEuropa()]);
// nivel de cada dato, para marcarlo en el buscador
const LVL=c=>c.nat==="es"?["es",c.sc?"España, provincia o municipio":"España"]:c.nat==="pais"?["pa","Países"]:c.eu?["eu","Regiones de Europa"]:c.reg?["rg",c.np>=40?"Provincias":"Comunidades"]:["mu","Municipios"];
const LVLF=[["","Todos"],["mu","Municipios"],["rg","Provincias"],["es","España"],["eu","Europa"]];
// un dato que no sirve en la vista actual se abre en la vista que le sirve
function jumpTo(k){ const c=CATK[k]||{};
  if(k.startsWith("es:")){ EX.v="paises"; PS.s=[k.slice(3)]; PS.idx=(SERES[k.slice(3)]||{}).idx?1:0; PS.desde=PS.hasta=null; toast("Es una serie de toda España: se abre en «Series».",3200); }
  else if(k.startsWith("pais:")){ EX.v="paises"; PS.k=k.slice(5); PS.s=[]; PS.desde=PS.hasta=null; toast("Es un dato por países: se abre en «Series».",3200); }
  else if(c.eu){ EX.v="cruce"; EX.u="eu"; EX.d=[k]; toast("Es un dato de regiones europeas: se abre en «Relación», a escala de Europa.",3600); }
  else if(c.reg&&EX.v==="mapa"){ EX.u=scaleOK("prov",[k])?"prov":"ccaa"; EX.d=[k]; EX.bv=0; toast(`Es un dato por ${EX.u==="prov"?"provincia":"comunidad"}: el mapa pasa a ${EX.u==="prov"?"provincias":"comunidades"}.`,3200); }
  else if(c.reg){ const o=EX.d.find(x=>x!==k&&!isEU(x))||"renta"; EX.v="cruce"; EX.d=[k,o]; toast("Es un dato por provincia o comunidad: se abre en «Relación».",3600); }
  else { if(EX.v==="paises"){ EX.v="mapa"; EX.d=[k]; toast("Es un dato por municipio: se abre en el mapa.",3000); } else { EX.u=""; EX.d=[k,...EX.d.filter(x=>x!==k&&!isEU(x))]; } }
  fixScale(); navTo(exHash()); }
function closePicker(){ const p=document.getElementById("dpick"); if(p){ p.remove(); document.removeEventListener("keydown",pickKey); if(PICK_BTN&&document.body.contains(PICK_BTN)) PICK_BTN.focus(); PICK_BTN=null; } }
function pickKey(e){ if(e.key==="Escape"){ closePicker(); return; }
  if(e.key==="Tab"){ const p=document.getElementById("dpick"); if(!p) return; const f=[...p.querySelectorAll("input,button")].filter(x=>!x.disabled); if(!f.length) return;
    if(e.shiftKey&&document.activeElement===f[0]){ e.preventDefault(); f[f.length-1].focus(); } else if(!e.shiftKey&&document.activeElement===f[f.length-1]){ e.preventDefault(); f[0].focus(); } else if(!p.contains(document.activeElement)){ e.preventDefault(); f[0].focus(); } } }
function openPicker(btn,opts){
  const {current,excl=[],onPick,extras=null,reg=false,eu=false,all=false,here=null,jump=true,mk=false,noCustom=false}=opts;
  closePicker();
  // los datos de provincias y comunidades solo en «Relación»; en la escala de Europa, solo los de Europa
  const okC0=here?(c=>here(c.k)):(c=>eu?!!c.eu:(!c.eu&&(reg||!c.reg)&&!c.nat)), okC=c=>okC0(c)&&!(c.custom&&noCustom);
  // con «all», el buscador enseña todos los datos, marcados por nivel; los que no sirven aquí abren la vista que les sirve
  const POOL=all?[...CAT,...natItems()].filter(c=>jump||okC(c)):CAT.filter(okC); let lv="";
  const groups=[...new Set([...PICK_ORDER,...POOL.map(c=>c.g)])].filter(g=>POOL.some(c=>c.g===g)||(mk&&g===VGROUP));   // «Mis datos» se ve siempre, aunque esté vacío: así se descubre que se pueden crear
  let tab=extras&&!(CATK[current]||{}).g?"Opciones":(CATK[current]||{}).g||groups[0], q="";
  const EXG="Opciones", tabs=extras?[EXG,...groups]:groups;
  const p=el("div","dpick"); p.id="dpick"; p.setAttribute("role","dialog"); p.setAttribute("aria-modal","true"); p.setAttribute("aria-label","Elige un dato"); document.body.appendChild(p); PICK_BTN=btn;
  const avail=c=>(!excl.includes(c.k)||c.k===current)&&(!lv||LVL(c)[0]===lv||(lv==="eu"&&LVL(c)[0]==="pa"));
  const covTxt=c=>c.nat==="es"?"año a año"+(c.yrs?", "+c.yrs:""):c.nat==="pais"?"España y otros países, año a año":c.eu?"regiones de Europa":c.reg?(c.np>=40?"provincias y comunidades":"solo comunidades"):nf0.format(cover(c.k))+" municipios";
  const VIEWN={es:"Series",pa:"Series",eu:"Relación",rg:"Relación",mu:"el mapa"};
  p.innerHTML=`<div class="dp-h"><input type="search" id="dpq" placeholder="Busca un dato: paro, alquiler, edad…" autocomplete="off" aria-label="Buscar un dato"><button type="button" class="dp-x" aria-label="Cerrar">×</button></div>${all&&jump?`<div class="dp-lv" id="dplv" role="group" aria-label="Nivel">${LVLF.map(([v,l])=>`<button type="button" data-lv="${v}" aria-pressed="${v===lv}">${l}</button>`).join("")}</div>`:""}<div class="dp-tabs" role="tablist" id="dpt"></div><ul class="dp-list" id="dpl"></ul>${mk?`<div class="dp-mk"><button type="button" id="dpmk">+ Crear un dato nuevo</button><small>Combina dos datos para responder una pregunta tuya. Por ejemplo: cuánto pesa la deuda sobre la renta.</small></div>`:""}`;
  const openMk=()=>openMaker(btn,{back:()=>openPicker(btn,opts),onDone:k=>onPick(k)});
  const draw=()=>{
    const nq=norm(q.trim()), hit=c=>norm(c.l+" "+c.src+" "+c.g+" "+c.k+" "+LVL(c)[1]).includes(nq);
    const vis=tabs.filter(g=>g===EXG||!lv||POOL.some(c=>c.g===g&&avail(c))); if(!vis.includes(tab)) tab=vis[0];
    document.getElementById("dpt").innerHTML=vis.map(g=>`<button type="button" role="tab" data-g="${esc(g)}" aria-selected="${!nq&&g===tab}">${esc(g)}<small>${g===EXG?extras.length:POOL.filter(c=>c.g===g&&avail(c)).length}</small></button>`).join("");
    const ex=extras&&!nq&&tab===EXG?extras.map(([k,l])=>`<li><button type="button" data-k="${k}" class="${k===current?"on":""}"><b>${esc(l)}</b></button></li>`).join(""):"";
    const items=tab===EXG&&!nq?[]:POOL.filter(c=>avail(c)&&(nq?hit(c):c.g===tab)).sort((a,b)=>okC(b)-okC(a));
    document.getElementById("dpl").innerHTML=ex||(items.length?items.map(c=>{ const [lc,ll]=LVL(c), ok=okC(c), mine=!!c.custom;
      const btnH=`<button type="button" data-k="${c.k}" class="${c.k===current?"on":""}${ok?"":" far"}"><b>${esc(c.l)}</b><small>${all?`<span class="lv lv-${lc}">${ll}</span>`:""}${nq?`<i>${esc(c.g)}</i> · `:""}${mine?esc(c.how)+(VBYK[c.k]&&VBYK[c.k].tmp?" · viene de un enlace":""):esc(c.src)} · ${covTxt(c)}${ok?"":` · <u>${mine?"se pasa a la escala de municipios":`se abre en ${VIEWN[lc]==="el mapa"?"el mapa":"«"+VIEWN[lc]+"»"}`}</u>`}</small></button>`;
      return mine?`<li class="dp-mine">${btnH}<span class="dp-act">${VBYK[c.k]&&VBYK[c.k].tmp?`<button type="button" data-sv="${c.k}" aria-label="Guardar «${esc(c.l)}» en mis datos">Guardar</button>`:""}<button type="button" data-ed="${c.k}" aria-label="Editar «${esc(c.l)}»">Editar</button><button type="button" data-rm="${c.k}" aria-label="Borrar «${esc(c.l)}»">Borrar</button></span></li>`:`<li>${btnH}</li>`; }).join(""):`${!nq&&mk&&tab===VGROUP?(VARS.length?`<li class="dp-none">No queda ningún dato tuyo por elegir aquí: los que has creado ya están en el gráfico.</li>`:`<li class="dp-none">Aquí irán los datos que crees tú, calculados a partir de otros dos (por ejemplo, la deuda sobre la renta). Se quedan guardados en este navegador. Pulsa «+ Crear un dato nuevo» para hacer el primero.</li>`):`<li class="dp-none">Ningún dato se llama así. Prueba con otra palabra${mk?`, o <button type="button" class="dp-lnk" id="dpmk2">crea un dato nuevo</button> a partir de otros dos`:""}.</li>`}`);
    p.querySelectorAll("#dpt button").forEach(b=>b.addEventListener("click",()=>{ tab=b.dataset.g; q=""; document.getElementById("dpq").value=""; draw(); document.getElementById("dpl").scrollTop=0; }));
    p.querySelectorAll("#dpl button[data-k]").forEach(b=>b.addEventListener("click",()=>{ const k=b.dataset.k, c=POOL.find(x=>x.k===k); closePicker(); if(all&&c&&!okC(c)) jumpTo(k); else onPick(k); }));
    p.querySelectorAll("#dpl button[data-ed]").forEach(b=>b.addEventListener("click",()=>{ const k=b.dataset.ed; openMaker(btn,{edit:k,back:()=>openPicker(btn,opts),onDone:()=>{ if(document.getElementById("exbar")) exUpdate(); }}); }));
    p.querySelectorAll("#dpl button[data-sv]").forEach(b=>b.addEventListener("click",()=>{ const d=VBYK[b.dataset.sv]; if(!d) return; if(VARS.filter(x=>!x.tmp).length>=VMAX){ toast(`Ya tienes ${VMAX} datos propios: borra alguno para guardar este.`,3500); return; } d.tmp=false; vStore(); draw(); }));
    p.querySelectorAll("#dpl button[data-rm]").forEach(b=>b.addEventListener("click",()=>{ const k=b.dataset.rm;
      if(b.dataset.c!=="1"){ b.dataset.c="1"; b.textContent="¿Seguro?"; b.classList.add("ask"); setTimeout(()=>{ if(b.isConnected){ b.dataset.c=""; b.textContent="Borrar"; b.classList.remove("ask"); } },3500); return; }
      const nm=(CATK[k]||{}).l, used=vUsed().includes(k)||EX.d.includes(k); vDelete(k); toast(`Has borrado «${esc(nm)}».`,2800);
      if(used&&document.getElementById("exbar")){ closePicker(); fixScale(); exUpdate(); } else draw(); }));
    const m2=document.getElementById("dpmk2"); if(m2) m2.addEventListener("click",openMk);
  };
  draw(); { const fb=document.getElementById("dpmk"); if(fb) fb.addEventListener("click",openMk); }
  p.querySelectorAll("#dplv button").forEach(b=>b.addEventListener("click",()=>{ lv=b.dataset.lv; p.querySelectorAll("#dplv button").forEach(x=>x.setAttribute("aria-pressed",x===b)); draw(); }));
  document.getElementById("dpq").addEventListener("input",e=>{ q=e.target.value; draw(); });
  p.querySelector(".dp-x").addEventListener("click",closePicker);
  document.addEventListener("keydown",pickKey);
  // en pantallas anchas se coloca junto al botón; en móvil es una hoja que sube desde abajo (ver CSS)
  if(window.innerWidth>900){ const r=btn.getBoundingClientRect(), h=Math.min(p.offsetHeight,window.innerHeight-16); p.style.left=Math.min(window.innerWidth-p.offsetWidth-12,r.right+10)+"px"; p.style.top=Math.max(8,Math.min(window.innerHeight-h-8,r.top-10))+"px"; }
  setTimeout(()=>{ const i=document.getElementById("dpq"); if(i&&window.innerWidth>900) i.focus(); else { const x=p.querySelector(".dp-x"); if(x) x.focus({preventScroll:true}); } },20);
}
document.addEventListener("pointerdown",e=>{ const p=document.getElementById("dpick"); if(p&&!p.contains(e.target)&&!e.target.closest(".pick")) closePicker(); });

// ---------- «Crear un dato»: recetas listas y modo libre, con vista previa en vivo ----------
let MK_BTN=null;
function closeMaker(refocus){ const p=document.getElementById("dmake"); if(p){ p.remove(); document.removeEventListener("keydown",mkKey); } const bd=document.getElementById("dmake-bd"); if(bd) bd.remove(); const b=MK_BTN; MK_BTN=null; if(refocus&&b&&document.body.contains(b)) b.focus(); }
function mkKey(e){ if(e.key==="Escape"){ e.preventDefault(); closeMaker(true); return; }
  if(e.key==="Tab"){ const p=document.getElementById("dmake"); if(!p) return; const f=[...p.querySelectorAll("input:not([hidden]),select:not([disabled]),button:not([disabled]),summary")].filter(x=>x.offsetParent!==null); if(!f.length) return;
    if(e.shiftKey&&document.activeElement===f[0]){ e.preventDefault(); f[f.length-1].focus(); } else if(!e.shiftKey&&document.activeElement===f[f.length-1]){ e.preventDefault(); f[0].focus(); } else if(!p.contains(document.activeElement)){ e.preventDefault(); f[0].focus(); } } }
const vOptions=(sel,ok)=>{ const gs=[...new Set([...PICK_ORDER,...CAT.map(c=>c.g)])]; return `<option value="">Elige un dato</option>`+gs.map(g=>{ const it=CAT.filter(c=>c.g===g&&vBase(c.k)&&(!ok||ok(c.k))); return it.length?`<optgroup label="${esc(g)}">${it.map(c=>`<option value="${c.k}"${c.k===sel?" selected":""}>${esc(c.l)}</option>`).join("")}</optgroup>`:""; }).join(""); };
// un ejemplo real de lo que da cada receta (con el municipio del lector, o con uno grande), para enseñarlo en la tarjeta; no guarda nada
function vRecEx(r){ try{ const d=vSanit({op:r.op,a:r.a,b:r.b||"",f:"",un:r.un||"",n:""}); if(!vValid(d)) return null; const vals=vValues(d), f=vFmt(d.un?"num":d.f,d.un), rows=rowsAll();
    for(const c of [...(myOk(lastMun)?[lastMun]:[]),...VEXM]){ const i=IDX.findIndex(x=>x.row[F.code]===c); if(i>=0&&vals[i]!=null) return {name:dispName(rows[i][F.name]),v:f(vals[i])}; } }catch(e){} return null; }
const VUNL={pct:"% (porcentaje)",veces:"veces",eur:"€ (euros)",pp:"puntos de porcentaje",years:"años",num:"número"};
function openMaker(btn,o){
  o=o||{}; closeMaker(false); closePicker(); MK_BTN=btn||null;
  const edit=o.edit&&VBYK[o.edit]?VBYK[o.edit]:null, atMax=!edit&&VARS.filter(d=>!d.tmp).length>=VMAX;
  const M={msg:"",op:edit?edit.op:"",a:edit?edit.a:"",b:edit?edit.b:"",n:edit?edit.n:"",f:edit?(edit.un?"otra":edit.f):"",un:edit?edit.un:"",nT:!!edit&&!!edit.n,fT:!!edit,rec:-1};
  const recs=edit||atMax?[]:VREC.filter(r=>vBase(r.a)&&(!r.b||vBase(r.b))).map(r=>({...r,ex:vRecEx(r)}));
  const bd=el("div","dmake-bd"); bd.id="dmake-bd"; document.body.appendChild(bd);
  const p=el("div","dmake"); p.id="dmake"; p.setAttribute("role","dialog"); p.setAttribute("aria-modal","true"); p.setAttribute("aria-labelledby","mk-t"); document.body.appendChild(p);
  p.innerHTML=`<div class="mk-h"><div><h2 id="mk-t">${edit?"Cambia este dato":"Crea un dato nuevo a partir de otros"}</h2></div><button type="button" class="dp-x" id="mk-x" aria-label="Cerrar">×</button></div>
  <div class="mk-b" id="mk-b"><p class="mk-lead">${edit?"Cambia cómo se calcula o cómo se llama.":"Cruza dos datos que ya tenemos y calculamos el resultado en cada municipio. Por ejemplo: cuánto pesa la deuda del ayuntamiento sobre la renta. Se guarda en este navegador."}</p>${atMax?`<p class="mk-lim">Ya tienes ${VMAX} datos propios, que es el máximo. Borra alguno desde «${VGROUP}» para poder crear otro.</p>`:`
    ${recs.length?`<details class="mk-rec" id="mk-rec" open><summary id="mk-rs">Empieza por una pregunta</summary><div class="mk-recs">${recs.map((r,i)=>`<button type="button" data-r="${i}" aria-pressed="false"><b>${esc(r.t)}</b><small>${esc(r.d)}</small>${r.ex?`<span class="mk-rx">En ${esc(r.ex.name)}: <strong>${esc(r.ex.v)}</strong></span>`:""}</button>`).join("")}</div></details>`:""}
    <details class="mk-rec mk-free" id="mk-free"${edit||!recs.length?" open":""}><summary id="mk-fs">${edit?"Cómo se calcula":recs.length?"O monta tu propio cálculo":"Monta tu cálculo"}</summary>
      <div class="mk-form" role="group" aria-label="Tu cálculo">
        <label class="mk-f"><span class="mk-nb" aria-hidden="true">1</span>Elige el cálculo<select id="mk-op"><option value="">Elige un cálculo</option>${Object.entries(VOPS).map(([k,v])=>`<option value="${k}"${k===M.op?" selected":""}>${esc(v.t)}</option>`).join("")}</select></label>
        <div id="mk-ds" hidden><p class="mk-st"><span class="mk-nb" aria-hidden="true">2</span>Elige los datos</p>
          <label class="mk-f" id="mk-la"><span id="mk-ra">Primer dato</span><select id="mk-a">${vOptions(M.a)}</select></label>
          <label class="mk-f" id="mk-lb"><span id="mk-rb">Segundo dato</span><select id="mk-b2" aria-describedby="mk-sn">${vOptions(M.b)}</select></label>
          <p class="mk-sn" id="mk-sn" role="status" hidden></p></div>
        <p class="mk-say" id="mk-say"></p>
      </div></details>
    <section class="mk-prev" id="mk-prev" aria-live="polite" aria-label="Así sale"></section>
    <div class="mk-w" id="mk-w"></div>
    <div id="mk-nmw" hidden><p class="mk-nl">Se guardará como <b id="mk-nl"></b>.</p>
      <details class="mk-adv" id="mk-adv"${edit?" open":""}><summary>Cambiar nombre y unidad</summary><div class="mk-nm"><label class="mk-f">Nombre<input type="text" id="mk-n" maxlength="80" autocomplete="off" value="${esc(M.n)}"></label>
        <label class="mk-f mk-u">Unidad de la cifra<select id="mk-f">${VFORMS.map(([k])=>`<option value="${k}">${VUNL[k]}</option>`).join("")}<option value="otra">otra (la escribes tú)…</option></select></label>
        <label class="mk-f mk-u2" id="mk-lu" hidden>Escribe la unidad<input type="text" id="mk-u" maxlength="${VUMAX}" autocomplete="off" placeholder="m², años, €/mes…" value="${esc(M.un)}"></label></div></details></div>`}</div>
  <div class="mk-ft"><button type="button" class="mk-sec" id="mk-back">${o.back?"Volver a la lista":"Cancelar"}</button>${atMax?"":`<button type="button" class="mk-ok" id="mk-ok" disabled>${edit?"Guardar cambios":"Usar este dato"}</button>`}</div>`;
  const $=id=>document.getElementById(id), close=()=>closeMaker(!o.back);
  $("mk-x").addEventListener("click",()=>closeMaker(true)); $("mk-back").addEventListener("click",()=>{ closeMaker(false); if(o.back) o.back(); else if(btn&&document.body.contains(btn)) btn.focus(); });
  document.addEventListener("keydown",mkKey);
  const first=edit?$("mk-op"):$("mk-rs")||$("mk-fs")||$("mk-back"); setTimeout(()=>{ try{ (window.innerWidth>900?first:$("mk-x")).focus({preventScroll:true}); }catch(e){} },20);
  if(atMax) return;
  const cur=()=>{ const d={op:M.op,a:M.a,b:VOPS[M.op]&&VOPS[M.op].un?"":M.b,n:M.n,f:M.f==="otra"?"num":M.f,un:M.f==="otra"?M.un:""}; return vValid(d)&&!(VSAME.test(d.op)&&vUC(d.a)!==vUC(d.b))?vSanit(d):null; };
  const fmtOf=d=>vFmt(d.f,d.un);
  let wasOpen=false;
  // con «res», «sum» y «pct» el segundo dato tiene que estar en la misma unidad que el primero: solo se ofrecen esos
  let bKey=null;
  const syncB=()=>{ const op=VOPS[M.op], same=!!op&&VSAME.test(M.op), sb=$("mk-b2"), sn=$("mk-sn"), ua=M.a?vUN(vUC(M.a)):"", la=M.a?esc(vLow(vShort(M.a))):""; let note="", msg="";
    const okB=same&&M.a?(k=>k!==M.a&&vUC(k)===vUC(M.a)):null, n=okB?CAT.filter(c=>vBase(c.k)&&okB(c.k)).length:0;
    if(same&&M.b&&(!M.a||!okB||!okB(M.b))&&M.a){ msg=`Hemos quitado «${esc(vLow(vShort(M.b)))}»: está en ${vUN(vUC(M.b))} y «${la}», en ${ua}.`; M.b=""; M.msg=msg; if(!M.fT) M.f=""; }
    const key=(same?"s":"f")+"|"+(same?M.a:"");
    if(key!==bKey){ bKey=key; sb.innerHTML=vOptions(M.b,okB); }
    sb.value=M.b||""; sb.disabled=same&&(!M.a||!n);
    if(same&&!M.a) note="Elige primero el primer dato: el segundo saldrá en su misma unidad.";
    else if(same&&!n) note=`No hay ningún otro dato en ${esc(ua)} para combinar con «${la}». Con este cálculo los dos tienen que estar en la misma unidad. Elige otro primer dato, o el cálculo «${esc(VOPS.x.t)}», que sí mezcla unidades.`;
    else if(same) note=`${n===1?"Solo sale 1 dato":`Solo salen los ${nfG.format(n)} datos`} que ${n===1?"está":"están"} en ${esc(ua)}, como «${la}». Con este cálculo los dos tienen que estar en la misma unidad. Para mezclar unidades, usa «${esc(VOPS.x.t)}».`;
    sn.innerHTML=[M.msg,note].filter(Boolean).join(" "); sn.hidden=!sn.innerHTML; };
  const render=()=>{ syncB(); const op=VOPS[M.op], d=cur(), free=$("mk-free").open;
    $("mk-ds").hidden=!op; $("mk-lb").hidden=!op||!!op.un; if(op){ $("mk-ra").textContent=op.r[0]; if(op.r[1]) $("mk-rb").textContent=op.r[1]; }
    $("mk-fs").textContent=edit?"Cómo se calcula":M.rec>=0?"Cambiar los datos o el cálculo":recs.length?"O monta tu propio cálculo":"Monta tu cálculo";
    if($("mk-rs")){ $("mk-rs").textContent=M.rec>=0?"Tu pregunta: "+recs[M.rec].t:"Empieza por una pregunta"; p.querySelectorAll("[data-r]").forEach(b=>b.setAttribute("aria-pressed",String(+b.dataset.r===M.rec))); }
    const la=M.a?vShort(M.a):"", lb=M.b?vShort(M.b):"", say=op&&M.a&&(op.un||M.b)&&(op.un||M.a!==M.b)?op.say(vLow(la),vLow(lb),M.op==="x"&&M.b?(vRU("x",M.a,M.b)||{}).u:""):""; $("mk-say").textContent=say||(op&&!op.un&&M.a&&M.a===M.b?"Elige dos datos distintos.":"");
    if(d){ if(!M.fT){ const fu=vDefFU(d); M.f=fu.un?"otra":fu.f; M.un=fu.un; $("mk-u").value=M.un; } const ru=vRU(d.op,d.a,d.b), auto=op.name(la,lb,ru&&ru.u); if(!M.nT){ M.n=(auto.length>80?auto.slice(0,79)+"…":auto); $("mk-n").value=M.n; } }
    $("mk-f").value=M.f||"num"; $("mk-lu").hidden=M.f!=="otra";
    const d2=cur(), ok=$("mk-ok"), pv=$("mk-prev"), wb=$("mk-w"), prevOpen=pv.querySelector(".mk-more"); if(prevOpen) wasOpen=prevOpen.open;
    $("mk-nmw").hidden=!d2; $("mk-nl").textContent=d2?"«"+(M.n||"").trim()+"»":"";
    const stepH=`<h3 class="mk-ph"><span class="mk-nb mk-pn" aria-hidden="true">3</span>Así sale</h3>`;
    if(!d2){ pv.hidden=!free; pv.innerHTML=free?`${stepH}<p class="mk-empty">Cuando elijas el cálculo y los dos datos, aquí verás cómo sale: en cuántos municipios hay cifra y algunos ejemplos.</p>`:""; wb.innerHTML=""; ok.disabled=true; ok.textContent=edit?"Guardar cambios":"Usar este dato"; return; }
    const st=vStats(d2), f=fmtOf(d2), dup=VBYK[vKey(d2)], same=dup&&(!edit||vKey(edit)!==vKey(d2)); pv.hidden=false;
    if(!st.n){ pv.innerHTML=`${stepH}<p class="mk-empty">Ningún municipio tiene cifra para los dos datos a la vez, así que no se puede crear.</p>`; wb.innerHTML=""; ok.disabled=true; return; }
    const hm=Math.sqrt(Math.max(...st.hist,1)), bw=240/st.hist.length;
    pv.innerHTML=`${stepH}<p class="mk-q">${esc(say)}</p>
      <p class="mk-cov">Saldrá cifra en <b>${nfG.format(st.n)}</b> de los ${nfG.format(st.total)} municipios, donde vive el <b>${nf0.format(st.popShare*100)}${NB}%</b> de la población. El valor típico es <b>${esc(f(st.med))}</b> y el más alto, <b>${esc(f(st.max.v))}</b> (${esc(st.max.name)}).</p>
      ${st.ex.length?`<p class="mk-exh">Por ejemplo</p><ul class="mk-ex">${st.ex.map(e=>`<li><span>${e.mine?"📍 ":""}<b>${esc(e.name)}</b></span><span class="mk-v">${esc(f(e.v))}</span><small>${esc(vLow(vShort(d2.a)))} ${esc(fmtK(d2.a)(e.a))}${d2.b?` · ${esc(vLow(vShort(d2.b)))} ${esc(fmtK(d2.b)(e.b))}`:""}</small></li>`).join("")}</ul>`:""}
      <details class="mk-more"${wasOpen?" open":""}><summary>Ver más detalle</summary>
        <dl class="mk-rg"><div><dt>El más bajo</dt><dd>${esc(f(st.min.v))}</dd><small>${esc(st.min.name)}</small></div><div><dt>El típico</dt><dd>${esc(f(st.med))}</dd><small>la mitad está por debajo</small></div><div><dt>El más alto</dt><dd>${esc(f(st.max.v))}</dd><small>${esc(st.max.name)}</small></div></dl>
        <svg class="mk-h2" viewBox="0 0 240 44" preserveAspectRatio="none" role="img" aria-label="Cómo se reparten los valores entre municipios, sin contar el 1 % más alto y el 1 % más bajo">${st.hist.map((c,i)=>`<rect x="${(i*bw+.6).toFixed(1)}" y="${(44-Math.sqrt(c)/hm*42).toFixed(1)}" width="${(bw-1.2).toFixed(1)}" height="${(Math.sqrt(c)/hm*42).toFixed(1)}"/>`).join("")}</svg>
        <p class="mk-hs"><span>${esc(f(st.lo))}</span><span>cómo se reparten los municipios</span><span>${esc(f(st.hi))}</span></p>
        ${d2.b?`<p class="mk-cs">«${esc(vLow(vShort(d2.a)))}» tiene dato en ${nfG.format(st.nA)} municipios y «${esc(vLow(vShort(d2.b)))}» en ${nfG.format(st.nB)}. Solo sale cifra donde existen los dos.</p>`:""}</details>`;
    const W=vWarns(d2,st,true); if(d2.b) W.push(`Si luego lo comparas con «${esc(vLow(vShort(d2.a)))}» o con «${esc(vLow(vShort(d2.b)))}», irán juntos casi por fuerza, porque este dato se calcula con ellos. Te lo avisaremos en el gráfico.`);
    if(same) W.unshift(`Ya tienes este cálculo, con el nombre «${esc(dup.n||CATK[vKey(dup)].l)}». Si lo creas, se usa ese.`);
    wb.innerHTML=W.map(t=>`<p>${t}</p>`).join(""); ok.disabled=false; ok.textContent=same?"Usar el que ya tienes":edit?"Guardar cambios":"Usar este dato"; };
  const unrec=()=>{ M.rec=-1; M.msg=""; };
  $("mk-op").addEventListener("change",e=>{ unrec(); M.op=e.target.value; if(VOPS[M.op]&&VOPS[M.op].un) M.b=""; if(!M.fT) M.f=""; render(); });
  $("mk-a").addEventListener("change",e=>{ unrec(); M.a=e.target.value; if(!M.fT) M.f=""; render(); });
  $("mk-b2").addEventListener("change",e=>{ unrec(); M.b=e.target.value; if(!M.fT) M.f=""; render(); });
  $("mk-n").addEventListener("input",e=>{ M.n=e.target.value; M.nT=true; $("mk-nl").textContent="«"+M.n.trim()+"»"; });
  $("mk-f").addEventListener("change",e=>{ M.f=e.target.value; M.fT=true; M.un=M.f==="otra"?M.un:""; render(); if(M.f==="otra") $("mk-u").focus(); });
  $("mk-u").addEventListener("input",e=>{ M.un=e.target.value; M.fT=true; render(); });
  $("mk-free").addEventListener("toggle",()=>{ if($("mk-free").open&&$("mk-rec")) $("mk-rec").open=false; render(); });   // una sola cosa abierta a la vez: así no hay que bajar
  if($("mk-rec")) $("mk-rec").addEventListener("toggle",()=>{ if($("mk-rec").open&&!edit) $("mk-free").open=false; });
  p.querySelectorAll("[data-r]").forEach(b=>b.addEventListener("click",()=>{ const r=recs[+b.dataset.r]; Object.assign(M,{msg:"",op:r.op,a:r.a,b:r.b||"",n:r.n,nT:true,f:r.un?"otra":"",un:r.un||"",fT:!!r.un,rec:+b.dataset.r}); $("mk-op").value=M.op; $("mk-a").value=M.a; $("mk-b2").value=M.b; $("mk-n").value=M.n; $("mk-rec").open=false; render(); $("mk-rs").focus({preventScroll:true}); $("mk-prev").scrollIntoView({block:"nearest",behavior:"smooth"}); }));
  $("mk-ok").addEventListener("click",()=>{ const d=cur(); if(!d) return; d.n=(M.n||"").trim()||VOPS[d.op].name(vShort(d.a),d.b?vShort(d.b):"",d.b&&d.op==="x"?(vRU("x",d.a,d.b)||{}).u:""); const k=vKey(d); let msg, ms=3800;
    if(edit){ const old=vKey(edit);
      if(k===old){ Object.assign(edit,{n:d.n,f:d.f,un:d.un,tmp:false}); vDefine(edit); vStore(); }
      else { if(!VBYK[k]){ d.tmp=false; VARS.push(d); vDefine(d); } vSwapUse(old,k); vRemove(old); }
      msg=`Cambios guardados en «${esc(CATK[k].l)}».`; }
    else if(VBYK[k]) msg=`Ya lo tenías: «${esc(CATK[k].l)}». Lo estás usando.`;
    else { VARS.push(d); vDefine(d); ms=8000; msg=vStore()?`Listo: «${esc(CATK[k].l)}». Ya lo estás usando y se queda guardado en este navegador, en «${VGROUP}» (al elegir un dato). Si compartes el enlace del gráfico, el dato va dentro.`:"Creado y en uso, pero no se ha podido guardar en este navegador: dura hasta que cierres la página."; }
    closeMaker(false); toast(msg,ms); if(o.onDone) o.onDone(k,edit?"edit":"new"); });
  render();
}

// ---------- avisos bajo el título del gráfico: qué datos son propios, de dónde vienen y qué cuidado pedirles ----------
const VST={};
function vNote(){
  const box=document.getElementById("vnote"); if(!box) return; box.innerHTML="";
  if(!["mapa","tabla","cruce","grupos","distribucion","matriz"].includes(EX.v)) return;
  const ks=vUsed(); if(ks.length) exSetHash();   // la barra de direcciones también lleva la definición, para poder copiarla
  const nn=EX.v==="cruce"||(EX.v==="mapa"&&EX.bv)?2:EX.v==="matriz"?EX.d.length:0;
  const sh=nn?vShared(EX.d.slice(0,nn)):[]; if(!ks.length&&!sh.length) return;
  let h=""; ks.forEach(k=>{ const d=VBYK[k], c=CATK[k]; const st=VST[k]||(VST[k]=vStats(d)), W=vWarns(d,st);
    h+=`<div class="vn"><p><b>«${esc(c.l)}»</b> lo has calculado tú (${esc(c.how)}) y tiene cifra en ${nfG.format(st.n)} municipios.${d.tmp?` <button type="button" class="vn-b" data-vs="${k}">Guardar en mis datos</button>`:""}</p>${W.map(t=>`<p class="vw">${t}</p>`).join("")}</div>`; });
  if(sh.length) h+=`<div class="vn"><p class="vw">${sh.map(t=>cap(t)).join(". ")}, así que es normal que vayan juntos. Esa relación sale de la fórmula, no de lo que pasa en los municipios.</p></div>`;
  box.innerHTML=`<div class="vnote" role="note">${h}</div>`;
  box.querySelectorAll("[data-vs]").forEach(b=>b.addEventListener("click",()=>{ const d=VBYK[b.dataset.vs]; if(!d) return; if(VARS.filter(x=>!x.tmp).length>=VMAX){ toast(`Ya tienes ${VMAX} datos propios: borra alguno para guardar este.`,3500); return; } d.tmp=false; toast(vStore()?"Guardado en «Mis datos».":"No se ha podido guardar en este navegador.",2500); vNote(); }));
}
function exBar(){
  const bar=document.getElementById("exbar"); if(!bar) return;
  if(EX.v==="antes"){ adBar(bar); return; }
  if(EX.v==="paises"){ psBar(bar); return; }
  if(CBAR[EX.v]){ CBAR[EX.v](bar); return; }
  const S=SLOTS[EX.v], isEvo=EX.v==="evolucion", isB=EX.v==="burbujas";
  let slots="";
  if(S){ const used=Math.min(S.n,EX.d.length), lab=i=>typeof S.l==="function"?S.l(i):S.l[i];
    for(let i=0;i<used;i++) slots+=`<div class="slot full"><span class="nm" style="flex:1"><small>${lab(i)}</small><button type="button" class="pick" data-i="${i}" aria-haspopup="dialog" aria-label="${lab(i)}: ${esc(labK(EX.d[i]))}. Cambiar"><span class="pv">${esc(labK(EX.d[i]))}</span><span class="pg">${esc(pgK(EX.d[i]))}</span></button></span>${(S.add&&used>1)||(EX.v==="cruce"&&false)?`<button type="button" data-x="${i}" aria-label="Quitar">×</button>`:""}</div>`;
    if(EX.v==="cruce"&&used>=2&&!EX.u) slots+=["sz","col"].map(kd=>{ const k=EX[kd], on=!!k&&!(kd==="sz"&&k==="1"&&false); return `<div class="slot enc"><span class="nm" style="flex:1"><small>${kd==="sz"?"Tamaño del punto":"Color del punto"} (opcional)</small><button type="button" class="pick${k?"":" add"}" data-enc="${kd}" aria-haspopup="dialog"><span class="pv">${k?esc(encLab(k,kd)):kd==="sz"?"Habitantes":"+ elige un dato"}</span>${k&&CATK[k]?`<span class="pg">${esc(pgK(k))}</span>`:""}</button></span>${k&&kd==="col"||k&&kd==="sz"?`<button type="button" data-xenc="${kd}" aria-label="Quitar">×</button>`:""}</div>`; }).join("");
    if(used<S.n&&(S.add||EX.v==="cruce")&&!(EX.v==="cruce"&&used>=2)) slots+=`<div class="slot"><span class="nm" style="flex:1"><small>${S.add?S.add+" (opcional)":lab(used)}</small><button type="button" class="pick add" data-add="1" aria-haspopup="dialog" aria-label="${S.add||lab(used)}"><span class="pv">+ elige un dato</span></button></span></div>`; }
  if(isB) slots+=`<div class="slot full"><span class="nm" style="flex:1"><small>Tamaño ● (también cambia con los años)</small><button type="button" class="pick" data-bsz="1" aria-haspopup="dialog"><span class="pv">${EX.sz&&CATK[EX.sz]?esc(labK(EX.sz)):"Habitantes"}</span>${EX.sz&&CATK[EX.sz]?`<span class="pg">${esc(pgK(EX.sz))}</span>`:""}</button></span>${EX.sz?`<button type="button" data-xbsz="1" aria-label="Volver a habitantes">×</button>`:""}</div>`;
  const isMapAgg=EX.v==="mapa"&&(EX.u==="prov"||EX.u==="ccaa");
  if(EX.v==="mapa") slots=`<label class="lbl">Ver por</label>${scaleSeg("exmu",EX.u)}<div style="height:10px"></div>`+slots;
  const mname=EX.m&&BYCODE.has(EX.m)?BYCODE.get(EX.m)[F.name]:null;
  bar.innerHTML=`
    <div class="lb-step"><h4><i>1</i>Qué quieres saber</h4>${typesHTML(EX.v)}${hintHTML(EX.v)}</div>
    <div class="lb-step"><h4><i>2</i>Qué datos${lbh("Son indicadores oficiales (paro, renta, población, alquiler…). Pulsa en cada uno para cambiarlo por otro.","Qué son los datos")}</h4>${EX.v==="cruce"?"":""}${isB?slots:isEvo?`<p class="hint" style="margin:0 0 8px">Marca hasta seis series. Puedes verlas para España, una provincia o un municipio.</p><div id="lbevo"></div>`:slots}</div>
    ${isEvo||isB||isMapAgg?"":`<div class="lb-step"><h4><i>3</i>Qué municipios${lbh("Puedes limitar el gráfico a una provincia o quitar los municipios más pequeños, cuyas cifras suelen ser poco fiables porque salen de pocos vecinos.","Para qué sirve esto")}</h4>
      <select class="sel" id="exprov" aria-label="Provincia">${`<option value="">Toda España</option>`+Object.keys(PROVS).sort((a,b)=>provShort(PROVS[a]).localeCompare(provShort(PROVS[b]),"es")).map(p=>`<option value="${p}" ${p===EX.p?"selected":""}>${esc(provShort(PROVS[p]))}</option>`).join("")}</select>
      <select class="sel" id="exsize" aria-label="Tamaño">${EXSIZES.map(([k,l])=>`<option value="${k}" ${k===EX.t?"selected":""}>${l}</option>`).join("")}</select>
      <div class="slot lbmy" id="lbmy" role="button" tabindex="0"><span class="nm" style="flex:1"><small>Resaltar en el gráfico</small>${myOk(lastMun)?`📍 ${esc(myName(lastMun))}${myOk(MUN2)?` <span class="muted">y</span> ${esc(myName(MUN2))}`:""}`:`<span class="muted">Elige tu municipio</span>`}</span><span class="muted" style="font-size:12.5px">Cambiar</span></div>
      <p class="hint" id="excount"></p></div>`}
    <div class="lb-step"><h4><i>${isEvo||isB||isMapAgg?3:4}</i>${VOPT[EX.v]||isMapAgg?"Cómo verlo":"Ajustes"}${VOPT[EX.v]||isMapAgg?"":lbh("Cambios opcionales. Puedes dejarlo todo como está.","Qué son los ajustes")}</h4>${VOPT[EX.v]?VOPT[EX.v].html():isMapAgg?`<p class="hint" style="margin:0">${isReg(EX.d[0])?"Dato oficial de cada "+(EX.u==="prov"?"provincia":"comunidad")+".":"Cada "+(EX.u==="prov"?"provincia":"comunidad")+" muestra la media de sus municipios, ponderada por población."} Al elegir dato, salen los que existen a esta escala.</p>`:EX.v==="mapa"?`<label class="chk"><input type="checkbox" id="exbv" ${EX.bv?"checked":""}> Añadir un segundo dato (mapa de dos colores)</label>${EX.bv?"":`<p class="hint">Así ves a la vez dónde coinciden, por ejemplo, poca renta y mucho paro.</p>`}`:EX.v==="cruce"?`
      <label class="chk"><input type="checkbox" id="exw" ${EX.w?"checked":""}> Dar más peso a los municipios grandes</label>
      ${EX.u?"":`<label class="chk"><input type="checkbox" id="exq" ${EX.q?"checked":""}> Dividir en cuatro zonas</label>
      <label class="chk"><input type="checkbox" id="exlx" ${EX.lx?"checked":""}> Ampliar los valores bajos (horizontal)</label>`}
      <button type="button" class="sel" id="exswap" style="margin-top:6px">⇄ Intercambiar ejes</button>
      <p class="hint">Debajo del gráfico podrás comprobar si la relación es real o se explica por otra cosa.</p>`
      :`<p class="hint" style="margin:0">Para comprobar si dos datos van juntos, pásalo a «Si van juntos».</p>${EX.d.length>=1&&!isEvo&&!isB?`<button type="button" class="sel" id="exgo" style="margin-top:8px">Ver ${esc(labK(EX.d[0]))} en una relación</button>`:""}`}</div>`;
  wireTypes(bar); lbBind(bar); if(VOPT[EX.v]&&VOPT[EX.v].wire) VOPT[EX.v].wire(bar);
  bar.querySelectorAll("#exmu button").forEach(b=>b.addEventListener("click",async()=>{ const u=b.dataset.u; if(u) await loadRegional(); if(isReg(EX.d[0])&&!(u&&scaleOK(u,[EX.d[0]]))){ toast("Ese dato no existe a esa escala: elige otro.",2800); if(!u) EX.d=["renta"]; else return; } EX.u=u; if(u) EX.bv=0; exUpdate(); }));
  { const bz=bar.querySelector("button[data-bsz]"); if(bz) bz.addEventListener("click",async()=>{ await loadAllCat(); openPicker(bz,{current:EX.sz||null,extras:[["","Habitantes"]],all:true,jump:false,here:k=>BSER.some(x=>x[0]===k)||(isReg(k)&&CATK[k].np>=40),onPick:v=>{ EX.sz=v; exUpdate(); }}); });
    const xb=bar.querySelector("button[data-xbsz]"); if(xb) xb.addEventListener("click",()=>{ EX.sz=""; exUpdate(); }); }
  const regOK=EX.v==="cruce"||isMapAgg, euOK=EX.v==="cruce"&&EX.u==="eu";
  bar.querySelectorAll("button.pick[data-i]").forEach(b=>b.addEventListener("click",async()=>{ const i=+b.dataset.i; if(regOK) await loadRegional(); await loadAllCat(); openPicker(b,{current:EX.d[i],excl:EX.d,reg:regOK,eu:euOK,all:true,mk:!EX.u&&!isB,noCustom:!!EX.u||isB,...(isB?{here:k=>BSER.some(x=>x[0]===k)||(isReg(k)&&CATK[k].np>=40),jump:false}:isMapAgg?{here:k=>!!CATK[k]&&!isEU(k)&&(!isReg(k)||scaleOK(EX.u,[k])),jump:false}:EX.v==="matriz"?{here:k=>!!CATK[k]&&!isReg(k)&&!isEU(k),jump:false}:{}),onPick:v=>{ const j=EX.d.indexOf(v); if(j>=0&&j!==i) EX.d[j]=EX.d[i]; EX.d[i]=v; if(isReg(v)&&!scaleOK(EX.u)) toast("Ese dato solo existe por provincia o comunidad: la relación pasa a compararlas.",3200); fixScale(); exUpdate(); }}); }));
  bar.querySelectorAll("button.pick[data-add]").forEach(b=>b.addEventListener("click",async()=>{ await loadAllCat(); openPicker(b,{current:null,excl:EX.d,all:true,mk:!EX.u,noCustom:!!EX.u,...(EX.v==="matriz"?{here:k=>!!CATK[k]&&!isReg(k)&&!isEU(k),jump:false}:{}),onPick:v=>{ EX.d=EX.d.filter(k=>k!==v); const n=Math.min(EX.d.length,(SLOTS[EX.v]||{n:6}).n); EX.d.splice(n,0,v); EX.d=EX.d.slice(0,Math.max(6,(SLOTS[EX.v]||{}).n||6)); exUpdate(); }}); }));
  bar.querySelectorAll("button[data-x]").forEach(b=>b.addEventListener("click",()=>{ if(EX.d.length<=1) return; EX.d.splice(+b.dataset.x,1); exUpdate(); }));
  bar.querySelectorAll("button[data-q]").forEach(b=>b.addEventListener("click",()=>{ const k=b.dataset.q; if(EX.v==="cruce"||EX.v==="tabla"||EX.v==="grupos"){ const S=SLOTS[EX.v]; if(EX.d.length<S.n&&EX.v!=="cruce") EX.d.push(k); else { const pos=EX.v==="cruce"?1:Math.min(EX.d.length,S.n)-1; EX.d=EX.d.filter(x=>x!==k); EX.d.splice(pos,1,k); } } else { EX.d=[k,...EX.d.filter(x=>x!==k)]; } EX.d=EX.d.slice(0,6); exUpdate(); }));
  const pv=document.getElementById("exprov"); if(pv) pv.addEventListener("change",e=>{ EX.p=e.target.value; exUpdate(); });
  const sz=document.getElementById("exsize"); if(sz) sz.addEventListener("change",e=>{ EX.t=e.target.value; exUpdate(); });
  const lm=document.getElementById("lbmy"); if(lm){ const op=e=>{ e.stopPropagation(); const b=document.getElementById("mymun"); myPop(); }; lm.addEventListener("click",op); lm.addEventListener("keydown",e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); op(e); } }); }
  if(document.getElementById("exm-q")) attachSearch(document.getElementById("exm-q"),document.getElementById("exm-r"),document.getElementById("exm-s"),r=>{ EX.m=r[F.code]; lastMun=EX.m; saveMun(); exUpdate(); });
  bar.querySelectorAll("button.pick[data-enc]").forEach(b=>b.addEventListener("click",()=>{ const kd=b.dataset.enc; openPicker(b,{current:EX[kd]||null,excl:EX.d,extras:kd==="sz"?ENC_SZ.slice(1):ENC_COL.slice(1),onPick:v=>{ EX[kd]=v; exUpdate(); }}); }));
  bar.querySelectorAll("button[data-xenc]").forEach(b=>b.addEventListener("click",()=>{ EX[b.dataset.xenc]=""; exUpdate(); }));
  const bvc=document.getElementById("exbv"); if(bvc) bvc.addEventListener("change",e=>{ EX.bv=e.target.checked?1:0; if(EX.bv&&EX.d.length<2) EX.d.push(EX.d[0]==="renta"?"paroReg":"renta"); exUpdate(); });
  const eq=document.getElementById("exq"); if(eq) eq.addEventListener("change",e=>{ EX.q=e.target.checked?1:0; exUpdate(); });
  const w=document.getElementById("exw"); if(w) w.addEventListener("change",e=>{ EX.w=e.target.checked?1:0; exUpdate(); });
  const lx=document.getElementById("exlx"); if(lx) lx.addEventListener("change",e=>{ EX.lx=e.target.checked?1:0; exUpdate(); });
  const sw=document.getElementById("exswap"); if(sw) sw.addEventListener("click",()=>{ EX.d=[EX.d[1],EX.d[0],...EX.d.slice(2)]; exUpdate(); });
  const gg=document.getElementById("exgo"); if(gg) gg.addEventListener("click",()=>{ EX.v="cruce"; if(EX.d.length<2) EX.d.push(EX.d[0]==="renta"?"paroReg":"renta"); navTo(exHash()); });
  const ct=document.getElementById("excount"); if(ct&&EX.d[0]){ if(EX.v==="cruce"&&EX.u==="eu") ct.textContent="En la escala de Europa no se filtran municipios."; else if(EX.v==="cruce"&&EX.d.slice(0,2).some(isReg)) ct.textContent="El filtro solo afecta a los datos municipales; los oficiales son de toda la provincia o comunidad."; else { const n=exRows(EX.d[0]).length; ct.textContent=`${nfG.format(n)} municipios con este dato.`; } }
}
function exUpdate(){ exSync(); exSetHash(); exBar(); exDraw(); }

// ---------- título, lectura y exportación ----------
function lbWhere(){ if(EX.v==="piramide") return pirName(EX.pz||"es"); if(EX.v==="pendientes") return EX.u==="ccaa"?"Comunidades autónomas":"Provincias de España"; if(EX.v==="composicion") return EX.p?provShort(PROVS[EX.p]):"Toda España"; if(EX.u==="eu") return "Regiones de Europa"; if(EX.v==="burbujas") return "Provincias de España"; if(EX.u==="prov") return "Provincias de España"; if(EX.u==="ccaa") return "Comunidades autónomas"; const sz=EXSIZES.find(s=>s[0]===EX.t); return [EX.p?provShort(PROVS[EX.p]):"Toda España",EX.t?sz[1]:""].filter(Boolean).join(" · "); }
function lbTitle(){
  const L=k=>labK(k), d=EX.d;
  if(EX.v==="mapa"&&EX.bv&&d[1]) return `${L(d[0])} y ${low(L(d[1]))} · ${EX.p?provShort(PROVS[EX.p]):"España"}`;
  if(EX.v==="burbujas") return `Provincias año a año: ${low(L(d[0]))} y ${low(L(d[1]))}`;
  if(EX.v==="matriz") return `Qué datos van juntos: ${d.length} datos, todas las parejas`;
  if(EX.v==="pendientes") return `${L(d[0])}: ${EX.ya||"antes"} frente a ${EX.yb||"ahora"}, por ${EX.u==="ccaa"?"comunidades":"provincias"}`;
  if(EX.v==="piramide") return `Pirámide de población · ${pirName(EX.pz||"es")}${EX.pc==="other"&&EX.pq?` frente a ${pirName(EX.pq)}`:""}`;
  if(EX.v==="composicion"){ const F0=COMPF[EX.cf]||COMPF.sector; return `${F0.l} por ${({ccaa:"comunidad",prov:"provincia",size:"tamaño de municipio",q:"nivel de renta"})[EX.gb]||"comunidad"}`; }
  if(EX.v==="mapa"&&EX.u) return `${L(d[0])} · por ${EX.u==="prov"?"provincias":"comunidades"}`;
  if(EX.v==="paises"&&PS.s.length){ const L=k=>SERES[k].l.replace(/ \(.*\)$/,""); return SERES&&SERES[PS.s[0]]?(PS.s.length===1?L(PS.s[0]):`${L(PS.s[0])} frente a ${listY(PS.s.slice(1).filter(k=>SERES[k]).map(k=>low(L(k))))}`):"Series"; }
  if(EX.v==="paises") return `${PSIND[PS.k].l}: España${PS.c.length>1&&PAIS?" frente a "+listY(PS.c.filter(g=>g!=="ES"&&PAIS.paises[g]).map(g=>PAIS.paises[g].n)):""}`;
  if(EX.v==="mapa") return `${L(d[0])} · ${EX.p?provShort(PROVS[EX.p]):"España"}`;
  if(EX.v==="tabla"){ const o=(EX.o||"").replace(/^-/,""), asc=(EX.o||"").startsWith("-"); return `Municipios ordenados por ${o==="pop"?"habitantes":low(L(o&&d.includes(o)?o:d[0]))}${asc?", de menos a más":""}`; }
  if(EX.v==="cruce") return d.length>1?(relHeadline(d[0],d[1])||`${L(d[0])} y ${low(L(d[1]))}`):L(d[0]);
  if(EX.v==="evolucion") return "Cómo han cambiado: "+ES_.sel.map(k=>EVOSH[k]||k).join(", ");
  if(EX.v==="antes") return `Antes y después: ${ADEV[AD.ev].t(AD)}`;
  if(EX.v==="grupos") return `${d.slice(0,4).map(L).join(", ")} por ${({ccaa:"comunidad",prov:"provincia",size:"tamaño",q:"nivel de "+low(L(d[0]))})[EX.gb]}`;
  return `Cómo se reparte ${low(L(d[0]))}`;
}
// el titular lo escribe el propio análisis: «Donde hay más paro registrado, suele haber menos renta por persona»
function relHeadline(x,y){
  const c=wcorr(pairPts(x,y,{weighted:!!EX.w,logX:!!EX.lx})); if(!c) return null; const a=Math.abs(c.r);
  if(a<0.1) return `${labK(x)} y ${low(labK(y))} apenas van juntos`;
  const px=DPHRASE[x], py=DPHRASE[y]; if(!px||!py) return `A más ${low(labK(x))}, ${a<0.3?"tiende a haber ":""}${c.r>0?"más":"menos"} ${low(labK(y))}`;
  const yp=py[c.r>0?0:1];
  return `Donde hay ${px[0]}, ${a<0.3?"tiende a haber "+yp:a<0.5?"suele haber "+yp:"casi siempre hay "+yp}`;
}
function lbSay(){
  if(EX.v==="mapa"&&EX.u&&EX.d[0]) return `<b>Qué estás viendo:</b> ${low(labK(EX.d[0]))} en cada ${EX.u==="prov"?"provincia":"comunidad"}. ${isReg(EX.d[0])?"Es el dato oficial, que solo existe a esta escala.":"Es la media de sus municipios, ponderada por población: así cuentan más los municipios donde vive más gente."}`;
  const k=EX.d[0], f=k?fmtK(k):null, rows=k?exRows(k):[], wm=rs=>{ const w=d3.sum(rs,r=>r[F.pop]||0); return w?d3.sum(rs,r=>r[F[k]]*(r[F.pop]||0))/w:null; };
  const mk=EX.m&&BYCODE.has(EX.m)?BYCODE.get(EX.m):null;
  const mtxt=mk&&k&&mk[F[k]]!=null?` <b>${esc(dispName(mk[F.name]))}</b> tiene ${f(mk[F[k]])}: más que el ${nf0.format(pctl(k,mk[F[k]]))}${NB}% de la población de España.`:"";
  if(EX.v==="mapa"){ const pool=rows.filter(r=>(r[F.pop]||0)>=(EX.t||EX.p?0:5000)).sort((a,b)=>b[F[k]]-a[F[k]]); if(!pool.length) return "No hay datos para esta selección.";
    const nm=a=>a.map(r=>esc(dispName(r[F.name]))).join(", ").replace(/, ([^,]*)$/," y $1");
    return `<b>Qué estás viendo:</b> ${low(labK(k))} en ${nf0.format(rows.length)} municipios. ${(()=>{ if(EX.bv&&EX.d[1]&&EX.d[1]!==k) return `El color combina dos datos, ${low(labK(k))} y ${low(labK(EX.d[1]))}: la cuadrícula de la leyenda dice qué color corresponde a cada combinación.`; const v=rows.map(r=>r[F[k]]).sort((a,b)=>a-b); return d3.quantile(v,.15)<0&&d3.quantile(v,.85)>0?"Los tonos azules son valores negativos y los cálidos, positivos; cuanto más intenso, más lejos de cero.":DARKER(); })()} Los valores más altos${EX.t||EX.p?"":" entre los de más de 5.000 habitantes"} están en ${nm(pool.slice(0,3))}; los más bajos, en ${nm(pool.slice(-3).reverse())}. La media de la selección es ${f(wm(rows))} (España: ${f(esMean(k))}).${mtxt}`; }
  if(EX.v==="matriz"||EX.v==="composicion") return "";
  if(EX.v==="mapa"&&EX.u) return `<b>Qué estás viendo:</b> ${low(labK(k))} en cada ${EX.u==="prov"?"provincia":"comunidad"}. ${isReg(k)?"Es el dato oficial, que solo existe a esta escala.":"Es la media de sus municipios, ponderada por población: así cuentan más los municipios donde vive más gente."}`;
  if(EX.v==="burbujas") return `<b>Qué estás viendo:</b> cada provincia año a año, con ${low(labK(EX.d[0]))} en horizontal y ${low(labK(EX.d[1]))} en vertical; el tamaño es ${EX.sz&&CATK[EX.sz]?low(labK(EX.sz)):"el número de habitantes"}. Si las burbujas suben o se desplazan juntas, los dos datos cambian a la vez; si unas se quedan atrás, hay provincias que no siguen la tendencia.`;
  if(EX.v==="tabla"){ const o1=(EX.o||"").replace(/^-/,""), asc=(EX.o||"").startsWith("-"), o=o1==="pop"?"pop":o1&&EX.d.includes(o1)?o1:k, rs=(o==="pop"?exRows().filter(r=>r[F.pop]):exRows(o)).sort((a,b)=>asc?a[F[o]]-b[F[o]]:b[F[o]]-a[F[o]]); if(!rs.length) return ""; const fo=o==="pop"?(v=>nf0.format(v)+" habitantes"):fmtK(o);
    return `<b>Qué estás viendo:</b> ${nf0.format(rs.length)} municipios ordenados por ${o==="pop"?"habitantes":low(labK(o))}, de ${asc?"menos a más":"más a menos"}. Encabeza ${esc(dispName(rs[0][F.name]))} con ${fo(rs[0][F[o]])}; ${o==="pop"?`la selección suma ${nf0.format(d3.sum(rs,r=>r[F.pop]))} habitantes`:`la media de la selección es ${fo(d3.sum(rs,r=>r[F[o]]*(r[F.pop]||0))/d3.sum(rs,r=>r[F.pop]||0))}`}. Pulsa una columna para ordenar por otro dato; púlsala otra vez para invertir el orden.`; }
  if(EX.v==="cruce"&&EX.u) return "";
  if(EX.v==="cruce"){ if(EX.d.length<2) return "Pon un segundo dato en el hueco vertical."; const [x,y]=EX.d, c=wcorr(pairPts(x,y,{weighted:!!EX.w,logX:!!EX.lx})); if(!c) return "No hay datos suficientes para medir la relación.";
    return `<b>Qué estás viendo:</b> cada círculo es un municipio, más grande cuanto ${EX.sz&&CATK[EX.sz]?`más alto es su dato de ${low(labK(EX.sz))}`:"más gente tiene"}${EX.col&&CATK[EX.col]?`; el color indica ${low(labK(EX.col))}`:""}. La relación es <b>${strength(Math.abs(c.r))}</b> (r = ${rFmt(c.r)}). ${Math.abs(c.r)>=0.1?`Las diferencias de ${low(labK(x))} explican el ${nf0.format(c.r*c.r*100)}${NB}% de las de ${low(labK(y))}; el resto depende de otras cosas.`:""}`; }
  if(EX.v==="antes") return `<b>Qué estás viendo:</b> ${low(ADY[AD.y].l)} de los municipios afectados y de sus gemelos (los más parecidos que no lo vivieron), con el año anterior a la medida = 100. Si antes iban juntos y después se separan, esa separación es la mejor pista de un efecto.`;
  if(EX.v==="evolucion") return `<b>Qué estás viendo:</b> cada línea empieza en 100 en el año de referencia. Si llega a 130, ha crecido un 30${NB}%. Así se pueden comparar euros, personas y precios en la misma escala. Compara crecimientos, no niveles.`;
  if(EX.v==="grupos"){ const by={ccaa:r=>CCAA_OF[r[F.prov]],prov:r=>provShort(PROVS[r[F.prov]])}[EX.gb]; if(!by) return `<b>Qué estás viendo:</b> la media de cada dato en cada grupo, ponderada por población. La raya es la media de España.`;
    const g=d3.rollups(rows.filter(r=>r[F.pop]&&by(r)),wm,by).filter(x=>x[1]!=null).sort((a,b)=>b[1]-a[1]); if(!g.length) return "";
    return `<b>Qué estás viendo:</b> ${low(labK(k))} de media en cada ${EX.gb==="ccaa"?"comunidad":"provincia"}. La más alta es ${esc(g[0][0])} (${f(g[0][1])}) y la más baja, ${esc(g[g.length-1][0])} (${f(g[g.length-1][1])}). La raya es la media de España.`; }
  if(EX.dg) return `<b>Qué estás viendo:</b> una forma por grupo, más ancha donde se concentran ${EX.w?"más personas":"más municipios"}. Así se ve no solo qué grupo está más alto, sino si dentro de cada uno todos se parecen (forma estrecha) o hay mucha diferencia (forma ancha o con dos jorobas).${mtxt}`;
  return `<b>Qué estás viendo:</b> cuánta ${EX.w?"población":"cantidad de municipios"} hay en cada nivel de ${low(labK(k))}. Una montaña estrecha quiere decir que casi todos se parecen; una ancha o con dos jorobas, que hay mucha diferencia.${mtxt}`;
}
function exDraw(){
  if(BUB_T){ BUB_T.stop(); BUB_T=null; }
  const out=document.getElementById("exout"); if(!out) return; out.innerHTML="";
  { const h0=exHash(); fixScale(); if(exHash()!==h0){ exSetHash(); exBar(); } }
  try{ vNote(); }catch(e){ console.error(e); }
  ["lbtest","lbcausal","lbmore"].forEach(i=>{ const e=document.getElementById(i); if(e) e.innerHTML=""; });
  const t=document.getElementById("lbtitle"); if(t) t.textContent=lbTitle();
  const sb=document.getElementById("lbsub"); if(sb) sb.textContent=EX.v==="antes"?`${ADY[AD.y].l} · afectados frente a gemelos`:EX.v==="paises"?"Año a año"+(PS.gob?" · con quién gobernaba en España":""):EX.v==="evolucion"?"Series en el tiempo":(EX.v==="cruce"&&EX.d.length>1?labK(EX.d[0])+" ↔ "+low(labK(EX.d[1]))+" · ":"")+lbWhere()+([EX.m,MUN2].filter(c=>c&&BYCODE.has(c)).length?" · Destacado"+(myOk(MUN2)?"s":"")+": "+[EX.m,MUN2].filter(c=>c&&BYCODE.has(c)).map(c=>dispName(BYCODE.get(c)[F.name])).join(" y "):"");
  const sv=document.getElementById("lbsave"); if(sv){ const on=nbGet().some(x=>x.h===exHash()); sv.setAttribute("aria-pressed",String(on)); sv.title=on?"Guardado en mis análisis (pulsa para quitarlo)":"Guardar en mis análisis"; }
  const img=document.getElementById("lbimg"); if(img) img.hidden=!["mapa","cruce","evolucion","distribucion","burbujas","matriz","pendientes","piramide","composicion"].includes(EX.v);
  const csv=document.getElementById("lbcsv"); if(csv) csv.hidden=["evolucion","antes","burbujas","matriz","pendientes","piramide","composicion"].includes(EX.v)||(EX.v==="mapa"&&!!EX.u);
  if(EX.v==="paises"){ if(csv) csv.hidden=true; if(img) img.hidden=false; const sy=document.getElementById("lbsay"); if(sy){ sy.innerHTML=""; sy.parentElement.hidden=true; } exPaises(out).catch(e=>{ console.error(e); out.innerHTML='<p class="loading">No se pudo dibujar este gráfico.</p>'; }); return; }
  if(EX.v==="antes"){ if(img) img.hidden=true; const sy=document.getElementById("lbsay"); if(sy){ sy.innerHTML=""; sy.parentElement.hidden=true; } exAntes(out).catch(e=>{ console.error(e); out.innerHTML='<p class="loading">No se pudo calcular el antes y después.</p>'; }); return; }
  if(["pendientes","piramide"].includes(EX.v)){ const sy=document.getElementById("lbsay"); if(sy){ sy.innerHTML=""; sy.parentElement.hidden=true; } (EX.v==="pendientes"?exPendientes:exPiramide)(out).then(()=>exBar()).catch(e=>{ console.error(e); out.innerHTML='<p class="loading">No se pudo dibujar este gráfico.</p>'; }); return; }
  try{ const fn=({mapa:exMapa,tabla:exTabla,cruce:exCruce,evolucion:exEvo,grupos:exGrupos,distribucion:exDist,burbujas:exBurbujas,matriz:exMatriz,composicion:exComposicion})[EX.v]; const r=fn(out); if(r&&r.catch) r.catch(e=>{ console.error(e); }); }catch(e){ console.error(e); out.innerHTML='<p class="loading">No se pudo dibujar este gráfico.</p>'; }
  const ec=document.getElementById("ectl"), slot=document.getElementById("lbevo"); if(ec&&slot){ slot.innerHTML=""; slot.appendChild(ec); }
  const say=document.getElementById("lbsay"); if(say){ try{ say.innerHTML=lbSay(); }catch(e){ say.innerHTML=""; } say.parentElement.hidden=!say.innerHTML; }
}
function exCSV(){
  if(EX.v==="cruce"&&EX.u&&AGGLAST&&AGGLAST.u===EX.u){ const A=AGGLAST, f=v=>v==null?"":String(+v.toFixed(4)).replace(".",",");
    const lines=[[A.u==="eu"?"region":A.u==="prov"?"provincia":"comunidad",labK(A.x),labK(A.y),A.year?"año":""].join(";")].concat(A.P.map(p=>['"'+p.l+'"',f(p.x),f(p.y),A.year||""].join(";")));
    const blob=new Blob(["\ufeff"+lines.join("\n")],{type:"text/csv;charset=utf-8"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="indicio-"+A.u+".csv"; document.body.appendChild(a); a.click(); a.remove(); return; }
  const ks=EX.d, rows=exRows().filter(r=>ks.some(k=>r[F[k]]!=null));
  const lines=[["codigo_ine","municipio","provincia","habitantes",...ks.map(labK)].join(";")].concat(rows.map(r=>[r[F.code],'"'+r[F.name]+'"','"'+provShort(PROVS[r[F.prov]])+'"',r[F.pop],...ks.map(k=>r[F[k]]==null?"":String(r[F[k]]).replace(".",","))].join(";")));
  const blob=new Blob(["﻿"+lines.join("\n")],{type:"text/csv;charset=utf-8"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="cifrario.csv"; document.body.appendChild(a); a.click(); a.remove();
}
// imagen: el svg (y el canvas si lo hay) del gráfico, con el título encima
async function exPNG(){
  const out=document.getElementById("exout"); const svg=out.querySelector(".scat-wrap svg, .mapbox svg, #echart svg, #aggplot svg, figure svg"); if(!svg) return;
  const cv=svg.parentElement.querySelector("canvas"), vb=svg.viewBox.baseVal, W=vb.width||svg.clientWidth, H=vb.height||svg.clientHeight, S=2, top=56;
  const cl=svg.cloneNode(true); const src=svg.querySelectorAll("*"), dst=cl.querySelectorAll("*");
  src.forEach((n,i)=>{ const cs=getComputedStyle(n); ["fill","stroke","stroke-width","stroke-dasharray","opacity","font-size","font-weight","font-family"].forEach(p=>{ const v=cs.getPropertyValue(p); if(v) dst[i].style.setProperty(p,v); }); });
  cl.setAttribute("xmlns","http://www.w3.org/2000/svg"); cl.setAttribute("width",W); cl.setAttribute("height",H);
  const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(cl)],{type:"image/svg+xml"}));
  const im=new Image(); await new Promise((ok,ko)=>{ im.onload=ok; im.onerror=ko; im.src=url; }).catch(()=>{});
  const c=document.createElement("canvas"); c.width=W*S; c.height=(H+top+28)*S; const x=c.getContext("2d"); x.scale(S,S);
  x.fillStyle=css("--bg"); x.fillRect(0,0,W,H+top+28);
  x.fillStyle=css("--ink"); x.font="700 18px 'Libre Franklin', Arial, sans-serif"; x.fillText(lbTitle().slice(0,80),12,28);
  x.fillStyle=css("--muted"); x.font="13px 'Libre Franklin', Arial, sans-serif"; x.fillText(lbWhere(),12,47);
  if(cv) x.drawImage(cv,0,top,W,H); x.drawImage(im,0,top,W,H);
  x.fillStyle=css("--muted"); x.font="12px 'Libre Franklin', Arial, sans-serif"; x.fillText("Indicio · datos del INE, SEPE e Interior",12,H+top+18);
  URL.revokeObjectURL(url);
  c.toBlob(b=>{ const a=document.createElement("a"); a.href=URL.createObjectURL(b); a.download="indicio-"+EX.v+".png"; document.body.appendChild(a); a.click(); a.remove(); });
}

// =====================================================================
// RELACIÓN + ¿CAUSA O CASUALIDAD? (etiquetas, barra que encoge, gemelos)
// =====================================================================
const CTAGS=[["lpop","🏘️","Entre pueblos de tamaño parecido"],["edad","👵","A igual edad"],["renta","💶","A igual renta"],["superiores","🎓","A igual nivel de estudios"],["distCosta","🌊","A igual distancia al mar"],["distCiudad","🏙️","A igual distancia a una gran ciudad"],["prov","🗺️","Dentro de cada provincia"]];
const CKNOWN={lpop:"el tamaño",edad:"la edad",renta:"la renta",superiores:"los estudios",prov:"la provincia",distCosta:"la distancia al mar",distCiudad:"la distancia a una gran ciudad"};
const CSHORT={lpop:"tamaño",edad:"edad",renta:"renta",superiores:"estudios",prov:"provincia",distCosta:"distancia al mar",distCiudad:"distancia a una ciudad"};
const CNAME=new Proxy(CKNOWN,{get:(o,k)=>typeof k!=="string"?undefined:o[k]||(CATK[k]?`el dato «${low(labK(k))}»`:undefined)});
let LBPOS=null, CZ=null;
// ---------- controles que estropean la comparación: mediadores, consecuencias y casi duplicados ----------
const LEVG={Territorio:0,"Población":1,Hogares:1,"Educación":2,Trabajo:3,Sectores:3,Riqueza:4,Vivienda:5,Voto:6};
const isChangeK=k=>k!=="lpop"&&k!=="prov"&&/cambio|crecimiento|subida|saldo|llegad|desde 20|reciente|var\b/i.test((CATK[k]||{}).l||"");
const levK=k=>k==="prov"?0:k==="lpop"?1:k==="edad"?1:k==="superiores"?2:k==="renta"?4:(LEVG[(CATK[k]||{}).g]??3);
const valK=(r,k)=>k==="lpop"?((r[F.pop]||0)>0?Math.log10(r[F.pop]):null):r[F[k]];
const RISK={};
function ctrlRisk(x,y,c){
  if(c==="prov") return null; const key=x+"|"+y+"|"+c+"|"+JSON.stringify(typeof EXF!=="undefined"?EXF:null)+"|"+EX.p+"|"+EX.t; if(key in RISK) return RISK[key];
  const nm=k=>k==="lpop"?"el tamaño":`«${low(labK(k))}»`, cn=CNAME[c]||nm(c);
  const cor=(a,b)=>{ const pts=rowsAll().filter(r=>exOK(r)&&valK(r,a)!=null&&valK(r,b)!=null).map(r=>({x:valK(r,a),y:valK(r,b),w:1})); const w=wcorr(pts); return w?Math.abs(w.r):0; };
  let out=null;
  const popChange=k=>isChangeK(k)&&(CATK[k]||{}).g==="Población";
  if(cor(c,y)>=0.8||cor(c,x)>=0.8) out={t:"casi",m:`${cap(cn)} y ${cor(c,y)>=0.8?nm(y):nm(x)} miden casi lo mismo: al igualar uno, el otro apenas varía y la relación desaparece aunque sea real.`};
  else if((c==="edad"||c==="lpop")&&(popChange(x)||popChange(y))) out={t:"cons",m:`${cap(cn)} de hoy puede ser <b>consecuencia</b> del crecimiento: un pueblo que gana vecinos jóvenes se vuelve más joven y más grande. Igualarlo borra parte de lo que buscas.`};
  else { const lx=levK(x), ly=levK(y), lc=levK(c);
    if((lx<lc&&lc<ly)||(ly<lc&&lc<lx)) out={t:"med",m:`${cap(cn)} puede estar <b>en medio del camino</b>: si ${nm(lx<ly?x:y)} influye en ${nm(lx<ly?y:x)}, parte del efecto podría pasar por ${cn}. Igualarlo quita esa parte y la relación se encoge aunque sea real.`};
    else if(lc>Math.max(lx,ly)&&!isChangeK(x)&&!isChangeK(y)) out={t:"cons",m:`${cap(cn)} puede ser <b>consecuencia</b> de ${nm(x)} y de ${nm(y)} a la vez. Igualar algo que es consecuencia de los dos puede deformar la relación o inventar una que no existe.`}; }
  return RISK[key]=out;
}

// ---------- escala: comparar municipios, provincias, comunidades o regiones de Europa ----------
// datos oficiales que solo existen por provincia o comunidad (data/regional.json) y regiones de Europa (data/europa.json):
// se cargan aparte y se añaden al catálogo con claves R_… y E_…; solo se pueden usar en «Relación» (escalas de provincia, comunidad o Europa) y en «Años»
let REG=null, REG_P=null, EUR=null, EUR_P=null, AGGY=null; const REGCC={}, REGCCN={};
const regF=u=>/^%/.test(u)?"pct":/^€/.test(u)?"eur":/^años$/.test(u)?"years":/PPC|puestos|viviendas$/.test(u)?"int":"num1";
const regSrc=v=>`${typeof v.tabla==="number"?"INE (tabla "+v.tabla+")":v.tabla}${v.nota?" · "+v.nota:""} · ${v.u}`;
function loadRegional(){ return REG_P||(REG_P=getJSON("/data/regional.json").then(g=>{ REG=g;
  Object.entries(g.provCcaa).forEach(([p,c])=>{ REGCC[c]=CCAA_OF[p]; REGCCN[CCAA_OF[p]]=c; });
  Object.entries(g.vars).forEach(([k,v])=>{ const np=Object.keys(g.data.prov).filter(p=>g.data.prov[p][k]).length, nc=Object.keys(g.data.ccaa).filter(c=>g.data.ccaa[c][k]).length;
    if(CATK["R_"+k]) return; const c={k:"R_"+k,l:v.l,g:"Provincias y comunidades",f:regF(v.u),src:regSrc(v),reg:true,np,nc}; CAT.push(c); CATK[c.k]=c; }); }).catch(e=>{ console.error(e); REG_P=null; })); }
function loadEuropa(){ return EUR_P||(EUR_P=getJSON("/data/europa.json").then(g=>{ EUR=g;
  Object.entries(g.vars).forEach(([k,v])=>{ if(CATK["E_"+k]) return; const c={k:"E_"+k,l:v.l,g:"Europa",f:regF(v.u),src:v.fuente+" · "+v.u,eu:true}; CAT.push(c); CATK[c.k]=c; }); }).catch(e=>{ console.error(e); EUR_P=null; })); }
const isReg=k=>!!(CATK[k]||{}).reg, isEU=k=>!!(CATK[k]||{}).eu;
// en qué escalas se puede dibujar el par elegido
function scaleOK(u,ks){ ks=ks||EX.d.slice(0,2); const R=ks.map(k=>CATK[k]||{});
  if(u==="eu") return true; if(R.some(c=>c.eu)) return false;
  if(u==="") return !R.some(c=>c.reg); if(u==="prov") return !R.some(c=>c.reg&&c.np<40); if(u==="ccaa") return !R.some(c=>c.reg&&c.nc<15); return true; }
// ajusta la escala y los datos para que sean compatibles (al cargar un enlace, al cambiar de vista o al elegir un dato)
function fixScale(){
  if(EX.v==="piramide"||EX.v==="composicion") return;
  if(EX.v==="matriz"){ EX.d=EX.d.filter(k=>CATK[k]&&!isReg(k)&&!isEU(k)); MATDEF.forEach(k=>{ if(EX.d.length<3&&!EX.d.includes(k)&&CATK[k]) EX.d.push(k); }); return; }
  if(EX.v==="pendientes"){ const ok=k=>BSER.some(b=>b[0]===k)||(isReg(k)&&!isEU(k)); if(!ok(EX.d[0])) EX.d=["renta",...EX.d.filter(k=>k!=="renta")]; if(EX.u!=="prov"&&EX.u!=="ccaa") EX.u="prov"; if(isReg(EX.d[0])&&REG&&!scaleOK(EX.u,[EX.d[0]])) EX.u=scaleOK("prov",[EX.d[0]])?"prov":"ccaa"; return; }
  if(EX.v==="mapa"){ if(EX.u==="eu") EX.u=""; EX.d=EX.d.filter(k=>CATK[k]&&!isEU(k)); if(!EX.d.length) EX.d=["renta"]; if(isReg(EX.d[0])&&!EX.u) EX.u=scaleOK("prov",[EX.d[0]])?"prov":"ccaa"; if(EX.u&&isReg(EX.d[0])&&!scaleOK(EX.u,[EX.d[0]])) EX.u=scaleOK("prov",[EX.d[0]])?"prov":"ccaa"; if(EX.u){ EX.bv=0; EX.d=[EX.d[0],...EX.d.slice(1).filter(k=>!isReg(k))]; } else EX.d=EX.d.filter(k=>!isReg(k)).concat([]).length?EX.d.filter(k=>!isReg(k)):["renta"]; return; }
  if(EX.v!=="cruce"&&EX.v!=="burbujas"){ const d=EX.d.filter(k=>CATK[k]&&!isReg(k)&&!isEU(k)); if(d.length!==EX.d.length){ EX.d=d.length?d:["renta","paroReg"]; } return; }
  if(EX.v==="burbujas"){ const ok=k=>BSER.some(b=>b[0]===k)||(isReg(k)&&CATK[k].np>=40); let [a,b]=EX.d; if(!ok(a)) a="renta"; if(!ok(b)||b===a) b=a==="pobreza"?"renta":"pobreza"; EX.d=[a,b]; return; }
  if(EX.u==="eu"){ if(!EUR) return; const d=EX.d.slice(0,2).filter(isEU); const def=["E_pib_pps","E_paro"].filter(k=>!d.includes(k)); while(d.length<2) d.push(def.shift()); EX.d=[...d,...EX.d.slice(2).filter(isEU)]; EX.c=[]; return; }
  EX.d=EX.d.filter(k=>CATK[k]&&!isEU(k)); { const def=["renta","paroReg","edad"].filter(k=>!EX.d.includes(k)); while(EX.d.length<2) EX.d.push(def.shift()); }
  if(EX.d.slice(0,2).some(isReg)){ if(!scaleOK(EX.u)) EX.u=scaleOK("prov")?"prov":"ccaa"; EX.c=[]; }
}
const SCALES=[["","Municipios"],["prov","Provincias"],["ccaa","Comunidades"],["eu","Europa"]];
// etiquetas de un gráfico de puntos sin que se pisen: prueba a la derecha, a la izquierda, arriba y abajo; si no cabe, no la pone
function placeLabels(sel,pts,{x,y,r,t,fs=11,W=1e9,fill="var(--ink-2)"}){
  const cw=fs*0.56, boxes=[], ov=(a,b)=>a.x0<b.x1&&b.x0<a.x1&&a.y0<b.y1&&b.y0<a.y1;
  pts.forEach(p=>boxes.push({x0:x(p)-r(p),x1:x(p)+r(p),y0:y(p)-r(p),y1:y(p)+r(p),dot:true}));
  const out=[];
  for(const p of pts){ const s=t(p), w=s.length*cw, h=fs+1, px=x(p), py=y(p), rr=r(p)+3;
    const cand=[[px+rr,py-h/2,"start"],[px-rr-w,py-h/2,"end"],[px-w/2,py-rr-h,"middle"],[px-w/2,py+rr,"middle"]];
    for(const [bx,by,anc] of cand){ const b={x0:bx,x1:bx+w,y0:by,y1:by+h}; if(b.x0<0||b.x1>W) continue;
      if(boxes.some(o=>ov(b,o)&&!(o.dot&&Math.abs((o.x0+o.x1)/2-px)<0.5&&Math.abs((o.y0+o.y1)/2-py)<0.5))) continue;
      boxes.push(b); out.push({p,s,x:anc==="start"?bx:anc==="end"?bx+w:bx+w/2,y:by+h-2,anc}); break; } }
  sel.selectAll("text").data(out).join("text").attr("x",o=>o.x).attr("y",o=>o.y).attr("text-anchor",o=>o.anc).attr("font-size",fs).attr("fill",fill).text(o=>o.s);
  return out.length;
}
function scaleBar(){ const anyR=EX.d.slice(0,2).some(isReg);
  const h=EX.u==="eu"?"Cada punto es una región europea (NUTS 2); en granate, las españolas. Datos de Eurostat.":EX.u?(anyR?`Datos oficiales de cada ${EX.u==="prov"?"provincia":"comunidad"}${EX.d.slice(0,2).every(isReg)?"":"; los datos municipales, media de sus municipios ponderada por población"}.`:"Cada punto es la media de sus municipios, ponderada por población."):"Cada punto es un municipio.";
  return `<div class="lbscale" role="group" aria-label="Escala de la comparación"><span class="lbscale-l">Comparar</span><div class="seg">${SCALES.map(([u,l])=>{ const ok=scaleOK(u)||u==="eu"||EX.u==="eu"; return `<button type="button" data-u="${u}" aria-pressed="${(EX.u||"")===u}"${ok?"":` disabled title="Uno de los datos elegidos no existe a esta escala"`}>${l}</button>`; }).join("")}</div><span class="lbscale-h">${h}</span></div>`; }
function scaleWire(out){ out.querySelectorAll(".lbscale button[data-u]").forEach(b=>b.addEventListener("click",async()=>{ const u=b.dataset.u; if(u==="eu") await loadEuropa(); if(u&&u!=="eu") await loadRegional();
  if(EX.u==="eu"&&u!=="eu") EX.d=EX.d.filter(k=>!isEU(k)); EX.u=u; fixScale(); navTo(exHash()); })); }
// último año con dato para (casi) todas las provincias o comunidades en todos los datos oficiales elegidos
function regYear(ks,u){ if(!ks.length||!REG) return null; const D=REG.data[u]||{}, cnt={};
  Object.values(D).forEach(o=>{ const ys=ks.map(k=>Object.keys(o[k.slice(2)]||{})); ys.reduce((a,b)=>a.filter(y=>b.includes(y))).forEach(y=>cnt[y]=(cnt[y]||0)+1); });
  const need=u==="prov"?40:14, ok=Object.keys(cnt).filter(y=>cnt[y]>=need).sort(); return ok.length?ok[ok.length-1]:(Object.keys(cnt).sort().pop()||null); }
// agrega los municipios (con el filtro de provincia y tamaño del laboratorio) en provincias o comunidades; los datos oficiales se toman tal cual
function aggPts(x,y,u){
  const key=u==="prov"?r=>r[F.prov]:r=>CCAA_OF[r[F.prov]], name=u==="prov"?k=>provShort(PROVS[k]):k=>k, rx=isReg(x), ry=isReg(y);
  if(!rx&&!ry){ AGGY=null; const rs=rowsAll().filter(r=>r[F[x]]!=null&&r[F[y]]!=null&&r[F.pop]&&exOK(r)&&key(r));
    return d3.groups(rs,key).map(([k,v])=>{ const w=d3.sum(v,r=>r[F.pop]); return {k,l:name(k),n:v.length,pop:w,x:d3.sum(v,r=>r[F[x]]*r[F.pop])/w,y:d3.sum(v,r=>r[F[y]]*r[F.pop])/w}; }).filter(p=>isFinite(p.x)&&isFinite(p.y)); }
  AGGY=regYear([rx&&x,ry&&y].filter(Boolean),u);
  const all=rowsAll().filter(r=>key(r)), pop=d3.rollup(all,v=>d3.sum(v,r=>r[F.pop]||0),key), nm=d3.rollup(all,v=>v.length,key), M={};
  [[x,rx],[y,ry]].forEach(([k,isR])=>{ if(!isR){ const rs=all.filter(r=>r[F[k]]!=null&&r[F.pop]&&exOK(r)); M[k]=new Map(d3.groups(rs,key).map(([g,v])=>{ const w=d3.sum(v,r=>r[F.pop]); return [g,d3.sum(v,r=>r[F[k]]*r[F.pop])/w]; })); } });
  const val=(k,isR,g)=>{ if(!isR) return M[k].get(g); const c=u==="prov"?g:REGCCN[g], s=(((REG.data[u]||{})[c])||{})[k.slice(2)]; return s?s[AGGY]:null; };
  return [...pop.keys()].map(g=>({k:g,l:name(g),n:nm.get(g),pop:pop.get(g),x:val(x,rx,g),y:val(y,ry,g)})).filter(p=>p.x!=null&&p.y!=null&&isFinite(p.x)&&isFinite(p.y));
}
let AGGLAST=null;   // puntos del último gráfico agregado (para el CSV)
function exCruceAgg(out,x,y){
  const u=EX.u, wt=!!EX.w, anyR=isReg(x)||isReg(y);
  const cAt=uu=>{ if(!scaleOK(uu,[x,y])) return null; if(!uu){ const c=wcorr(pairPts(x,y,{weighted:wt})); return c?{r:c.r,n:pairPts(x,y,{weighted:wt}).length}:null; } const A=aggPts(x,y,uu), c=wcorr(A.map(p=>({x:p.x,y:p.y,w:wt?p.pop:1}))); return c?{r:c.r,n:A.length,y:AGGY}:null; };
  const C={"":cAt(""),prov:cAt("prov"),ccaa:cAt("ccaa")};
  const P=aggPts(x,y,u); AGGLAST={u,x,y,P,year:AGGY};
  out.insertAdjacentHTML("beforeend",`<div id="aggplot"></div>`);
  if(P.length<4){ document.getElementById("aggplot").innerHTML='<p class="loading">Hay muy pocos grupos con estos filtros. Quita el filtro de provincia para comparar comunidades o provincias.</p>'; return; }
  const box=document.getElementById("aggplot"), W=Math.max(320,box.clientWidth||720), H=Math.min(520,Math.max(340,W*0.62)), m={t:16,r:96,b:46,l:58};
  const fx=fmtK(x), fy=fmtK(y);
  const X=d3.scaleLinear().domain(d3.extent(P,p=>p.x)).nice().range([m.l,W-m.r]), Y=d3.scaleLinear().domain(d3.extent(P,p=>p.y)).nice().range([H-m.b,m.t]), Rr=d3.scaleSqrt().domain([0,d3.max(P,p=>p.pop)]).range([3,u==="ccaa"?26:18]);
  const sv=d3.select(box).append("svg").attr("viewBox",`0 0 ${W} ${H}`).attr("role","img").attr("aria-label",`${labK(x)} y ${low(labK(y))} por ${u==="prov"?"provincias":"comunidades"}`);
  sv.append("g").attr("transform",`translate(0,${H-m.b})`).call(d3.axisBottom(X).ticks(6).tickFormat(fx)).call(g=>g.select(".domain").attr("stroke","var(--rule-2)")).selectAll("text").attr("fill","var(--muted)");
  sv.append("g").attr("transform",`translate(${m.l},0)`).call(d3.axisLeft(Y).ticks(6).tickFormat(fy)).call(g=>g.select(".domain").attr("stroke","var(--rule-2)")).selectAll("text").attr("fill","var(--muted)");
  sv.append("text").attr("x",W-m.r).attr("y",H-8).attr("text-anchor","end").attr("font-size",12).attr("fill","var(--ink-2)").text(labK(x)+" →");
  sv.append("text").attr("x",m.l).attr("y",m.t-4).attr("font-size",12).attr("fill","var(--ink-2)").text("↑ "+labK(y));
  const c=wcorr(P.map(p=>({x:p.x,y:p.y,w:wt?p.pop:1})));
  const cid="agclip"+Math.random().toString(36).slice(2,7); sv.append("clipPath").attr("id",cid).append("rect").attr("x",m.l).attr("y",m.t).attr("width",W-m.r-m.l).attr("height",H-m.b-m.t);
  if(c){ const [a,b]=X.domain(); const mx=c.mx??d3.mean(P,p=>p.x), my=c.my??d3.mean(P,p=>p.y); sv.append("line").attr("clip-path",`url(#${cid})`).attr("x1",X(a)).attr("x2",X(b)).attr("y1",Y(my+c.b*(a-mx))).attr("y2",Y(my+c.b*(b-mx))).attr("stroke","var(--brand)").attr("stroke-width",2).attr("stroke-dasharray","6 5"); }
  const g=sv.append("g").selectAll("g").data(P.slice().sort((a,b)=>b.pop-a.pop)).join("g");
  g.append("circle").attr("cx",p=>X(p.x)).attr("cy",p=>Y(p.y)).attr("r",p=>Rr(p.pop)).attr("fill","var(--rust)").attr("fill-opacity",.55).attr("stroke","var(--rust)").append("title").text(p=>`${p.l}: ${fx(p.x)} · ${fy(p.y)} (${nf0.format(p.n)} municipios)`);
  const lab=u==="ccaa"?P:P.filter(p=>{ const zx=Math.abs(p.x-d3.mean(P,q=>q.x))/(d3.deviation(P,q=>q.x)||1), zy=Math.abs(p.y-d3.mean(P,q=>q.y))/(d3.deviation(P,q=>q.y)||1); return zx+zy>1.6||p.pop>3e6; });
  placeLabels(sv.append("g"),lab.slice().sort((a,b)=>b.pop-a.pop),{x:p=>X(p.x),y:p=>Y(p.y),r:p=>Rr(p.pop),t:p=>p.l,fs:11,W});
  add(box,"figcaption",null,`${nf0.format(P.length)} ${u==="prov"?"provincias":"comunidades y ciudades autónomas"}; el tamaño del punto es la población. ${anyR?`Datos oficiales de ${AGGY}${isReg(x)&&isReg(y)?"":"; el otro dato, media de los municipios con dato ponderada por población"}. Fuente: ${[x,y].filter(isReg).map(k=>CATK[k].src).join("; ")}.`:`Medias de los municipios con dato, ponderadas por población${EX.p||EX.t?", con el filtro de arriba":""}.`}`);
  // la escala cambia la respuesta
  const rF=o=>o?`r = ${rFmt(o.r)}`:"—", bar=o=>o?`<span class="scb"><i style="width:${Math.abs(o.r)*100}%;background:var(${o.r<0?"--slate":"--rust"})"></i></span>`:"";
  const tst=document.getElementById("lbtest");
  if(tst) tst.innerHTML=`<section class="scale-cmp" aria-label="La escala cambia la respuesta"><div><h3>La escala cambia la respuesta</h3>
    <table class="tbl scale-t"><thead><tr><th>Comparando…</th><th>Puntos</th><th>Fuerza de la relación</th><th></th></tr></thead><tbody>${SCALES.filter(([uu])=>uu!=="eu").map(([uu,l])=>`<tr${uu===(u||"")?' class="me"':""}><td>${l}</td><td class="r num">${C[uu]?nf0.format(C[uu].n):"—"}</td><td class="r num"><b>${rF(C[uu])}</b></td><td>${bar(C[uu])}</td></tr>`).join("")}</tbody></table>${anyR?`<p class="muted">${isReg(x)&&isReg(y)?"Estos datos":"Uno de los datos"} solo existe${isReg(x)&&isReg(y)?"n":""} por provincia o comunidad: no se puede comparar entre municipios.</p>`:""}
    <p>${C[""]&&C[u]?(Math.abs(C[u].r)>Math.abs(C[""].r)+0.15?`Entre ${u==="prov"?"provincias":"comunidades"} la relación parece <b>mucho más fuerte</b> (${rFmt(C[u].r)}) que entre municipios (${rFmt(C[""].r)}). Es lo habitual: al promediar se borran las diferencias dentro de cada territorio y queda solo lo que separa a unos territorios de otros, que suele ir todo junto (renta, estudios, edad, paro).`:Math.abs(C[u].r)<Math.abs(C[""].r)-0.15?`Entre ${u==="prov"?"provincias":"comunidades"} la relación es <b>más débil</b> (${rFmt(C[u].r)}) que entre municipios (${rFmt(C[""].r)}): lo que se ve entre municipios pasa sobre todo dentro de cada territorio.`:`La relación se parece a todas las escalas (${rFmt(C[""].r)} entre municipios, ${rFmt(C[u].r)} entre ${u==="prov"?"provincias":"comunidades"}): es un patrón que no depende de cómo se agrupe.`):""}</p>
    <p class="muted">Cuidado con la <b>falacia ecológica</b>: que dos cosas vayan juntas entre comunidades no dice que vayan juntas entre municipios, ni mucho menos entre personas. Con ${C[u]?nf0.format(C[u].n):"pocos"} puntos, además, una sola comunidad puede mover mucho el resultado. Las pruebas de «¿aguanta la relación?» (comparar entre parecidos, gemelos, dentro de cada provincia) solo tienen sentido con municipios${anyR?".":`: <button type="button" class="lnk" data-u="">vuelve a municipios</button> para usarlas.`}</p></div></section>`;
  tst&&tst.querySelectorAll("button[data-u]").forEach(b=>b.addEventListener("click",()=>{ EX.u=""; navTo(exHash()); }));
}
// regiones de Europa (NUTS 2) con datos de Eurostat; España resaltada
function exCruceEU(out,x,y){
  const D=EUR&&EUR.data; if(!D){ out.insertAdjacentHTML("beforeend",'<p class="loading">Cargando los datos de Europa…</p>'); loadEuropa().then(()=>exDraw()); return; }
  const kx=x.slice(2), ky=y.slice(2), regs=Object.keys(D).filter(g=>g.length===4&&!g.startsWith("EU")&&!/ZZ$/.test(g));
  const cnt={}; regs.forEach(g=>{ const a=(D[g][kx])||{}, b=(D[g][ky])||{}; Object.keys(a).filter(y=>b[y]!=null).forEach(y=>cnt[y]=(cnt[y]||0)+1); });
  const yrs=Object.keys(cnt).sort(), mx=d3.max(Object.values(cnt))||0, yr=yrs.filter(y=>cnt[y]>=mx*0.85).pop();
  const P=regs.map(g=>({k:g,l:EUR.nombres[g]||g,es:g.startsWith("ES"),x:((D[g][kx])||{})[yr],y:((D[g][ky])||{})[yr]})).filter(p=>p.x!=null&&p.y!=null);
  AGGLAST={u:"eu",x,y,P,year:yr};
  out.insertAdjacentHTML("beforeend",`<div id="aggplot"></div>`);
  const box=document.getElementById("aggplot"); if(P.length<10){ box.innerHTML='<p class="loading">No hay datos suficientes de estos dos indicadores para el mismo año.</p>'; return; }
  const W=Math.max(320,box.clientWidth||720), H=Math.min(520,Math.max(340,W*0.62)), m={t:16,r:110,b:46,l:58}, fx=fmtK(x), fy=fmtK(y);
  const q=(a,p)=>d3.quantile(a.slice().sort(d3.ascending),p), xs=P.map(p=>p.x), ys=P.map(p=>p.y);
  const X=d3.scaleLinear().domain([q(xs,0),q(xs,1)]).nice().range([m.l,W-m.r]), Y=d3.scaleLinear().domain([q(ys,0),q(ys,1)]).nice().range([H-m.b,m.t]);
  const sv=d3.select(box).append("svg").attr("viewBox",`0 0 ${W} ${H}`).attr("role","img").attr("aria-label",`${labK(x)} y ${low(labK(y))} en las regiones de Europa`);
  sv.append("g").attr("transform",`translate(0,${H-m.b})`).call(d3.axisBottom(X).ticks(6).tickFormat(fx)).call(g=>g.select(".domain").attr("stroke","var(--rule-2)")).selectAll("text").attr("fill","var(--muted)");
  sv.append("g").attr("transform",`translate(${m.l},0)`).call(d3.axisLeft(Y).ticks(6).tickFormat(fy)).call(g=>g.select(".domain").attr("stroke","var(--rule-2)")).selectAll("text").attr("fill","var(--muted)");
  sv.append("text").attr("x",W-m.r).attr("y",H-8).attr("text-anchor","end").attr("font-size",12).attr("fill","var(--ink-2)").text(labK(x)+" →");
  sv.append("text").attr("x",m.l).attr("y",m.t-4).attr("font-size",12).attr("fill","var(--ink-2)").text("↑ "+labK(y));
  const c=wcorr(P.map(p=>({x:p.x,y:p.y,w:1}))), ce=wcorr(P.filter(p=>p.es).map(p=>({x:p.x,y:p.y,w:1})));
  const cid="euclip"+Math.random().toString(36).slice(2,7); sv.append("clipPath").attr("id",cid).append("rect").attr("x",m.l).attr("y",m.t).attr("width",W-m.r-m.l).attr("height",H-m.b-m.t);
  if(c){ const [a,b]=X.domain(); sv.append("line").attr("clip-path",`url(#${cid})`).attr("x1",X(a)).attr("x2",X(b)).attr("y1",Y(c.my+c.b*(a-c.mx))).attr("y2",Y(c.my+c.b*(b-c.mx))).attr("stroke","var(--brand)").attr("stroke-width",2).attr("stroke-dasharray","6 5"); }
  const dots=P.slice().sort((a,b)=>a.es-b.es);
  sv.append("g").selectAll("circle").data(dots).join("circle").attr("cx",p=>X(p.x)).attr("cy",p=>Y(p.y)).attr("r",p=>p.es?5.5:3.5).attr("fill",p=>p.es?"var(--rust)":"var(--slate)").attr("fill-opacity",p=>p.es?.85:.35).attr("stroke",p=>p.es?"var(--rust)":"none").append("title").text(p=>`${p.l}: ${fx(p.x)} · ${fy(p.y)}`);
  placeLabels(sv.append("g"),P.filter(p=>p.es),{x:p=>X(p.x),y:p=>Y(p.y),r:()=>5.5,t:p=>p.l.replace(/^Comunidad (de |Foral de )?|^Región de |^Principado de |^Comunitat |^Illes /,"").replace(/^Ciudad (Autónoma )?de /,""),fs:10.5,W});
  const ES=D.ES||{}, EU=D.EU27_2020||{}, v=(o,k)=>((o[k]||{})[yr]);
  add(box,"figcaption",null,`${nf0.format(P.length)} regiones europeas (NUTS 2) en ${yr}; en granate, las ${nf0.format(P.filter(p=>p.es).length)} españolas. Fuente: ${CATK[x].src.split(" · ")[0]}${CATK[y].src.split(" · ")[0]!==CATK[x].src.split(" · ")[0]?" y "+CATK[y].src.split(" · ")[0]:""}.`);
  const tst=document.getElementById("lbtest");
  if(tst) tst.innerHTML=`<section class="scale-cmp" aria-label="España en Europa"><div><h3>España en Europa</h3>
    <table class="tbl scale-t"><thead><tr><th></th><th class="r">${esc(labK(x))}</th><th class="r">${esc(labK(y))}</th></tr></thead><tbody>
    <tr class="me"><td>España</td><td class="r num">${v(ES,kx)!=null?fx(v(ES,kx)):"—"}</td><td class="r num">${v(ES,ky)!=null?fy(v(ES,ky)):"—"}</td></tr>
    <tr><td>Unión Europea</td><td class="r num">${v(EU,kx)!=null?fx(v(EU,kx)):"—"}</td><td class="r num">${v(EU,ky)!=null?fy(v(EU,ky)):"—"}</td></tr></tbody></table>
    <p>${c?`Entre todas las regiones europeas la relación es de r = <b>${rFmt(c.r)}</b>${ce?`; solo entre las españolas, r = <b>${rFmt(ce.r)}</b>`:""}. ${ce&&Math.abs(ce.r-c.r)>0.3?"El patrón de España no es el de Europa: dentro de España las regiones se ordenan de otra manera.":"España sigue un patrón parecido al del resto de Europa."}`:""}</p>
    <p class="muted">Cada país mide igual estos indicadores (encuestas armonizadas de Eurostat), así que sí se pueden comparar. Pero entre países pesan cosas que aquí no se ven: leyes, instituciones, historia. Cuidado con leerlo como causa.</p></div></section>`;
}
function exCruce(out){
  if(EX.d.length<2){ out.innerHTML='<p class="loading">Pon un segundo dato en el hueco «Vertical» para cruzarlo con el primero.</p>'; return; }
  const [x,y]=EX.d; XS={...XS,x,y,minPop:0,prov:"",weighted:!!EX.w,logX:!!EX.lx,sz:EX.sz,col:EX.col,quad:EX.q};
  if(EX.u==="eu"){ out.innerHTML=scaleBar(); scaleWire(out); exCruceEU(out,x,y); return; }
  if(EX.u){ out.innerHTML=scaleBar(); scaleWire(out); exCruceAgg(out,x,y); return; }
  LBPOS=null;
  out.innerHTML=scaleBar()+`<div id="ctlnote"></div><div id="cplot"></div>`; scaleWire(out);
  const tst=document.getElementById("lbtest"); if(tst) tst.innerHTML=`<section class="czc" aria-label="Cuánto van juntos y si aguanta">
    <div class="czg">
      <div class="czb czb-c czv" id="czl"></div>
      <div class="czb czb-e"><div class="czeh-row"><h3><span id="czeh">En números</span>${czIt("Cuánto cambia un dato cuando cambia el otro, en sus propias unidades, con el rango en el que probablemente se mueve de verdad.","Qué son los números")}</h3><span id="czevd"></span></div><div id="czeur"></div></div>
    </div>
    <div class="czpar"><h3>¿Y entre municipios parecidos?${czIt("Muchas relaciones se explican por una tercera cosa. Por ejemplo, los municipios grandes tienen más renta y también más estudios. Al igualar esas cosas, comparamos municipios que se parecen en ellas y vemos si la relación sigue ahí.","Por qué igualar municipios")}</h3><p class="czlead">Marca en qué deben parecerse y mira cuánta relación queda.</p><div class="czchips" id="cztags"></div><div class="czbar" id="czbar"></div><p class="czc-s" id="czsum"></p><div id="cznotes" aria-live="polite"></div><button type="button" class="czlink" id="czmore" aria-expanded="false" aria-controls="lbcausal"><span class="t">¿Podría ser una causa? Ver qué se puede comprobar ▾</span></button></div>
    <p class="czc-m"><a href="/laboratorio/metodo/">Guía: de la relación a la causa →</a></p></section>`;
  if(tst) czTipBind(tst);
  const cb=document.getElementById("lbcausal"); if(cb) cb.hidden=true;
  document.getElementById("czmore").addEventListener("click",e=>{ const c=document.getElementById("lbcausal"), o=c.hidden; c.hidden=!o; e.currentTarget.setAttribute("aria-expanded",String(o)); e.currentTarget.querySelector(".t").textContent=o?"Ocultar ▴":"¿Podría ser una causa? Ver qué se puede comprobar ▾"; if(o) c.scrollIntoView({behavior:"smooth",block:"start"}); });
  const more=document.getElementById("lbmore");
  more.innerHTML=`<details class="howm"><summary>Más números de esta relación: por grupos, los que se salen de la norma y todas las relaciones</summary><div class="xsay" id="csay"></div><section class="finding" id="cquint"></section><section class="finding" id="cout"></section><section class="finding" id="cmat"></section><section class="finding" id="ccav"></section></details>`;
  drawRel(); drawMatrix(true); drawCaveats();
  const cm=document.getElementById("cmat");
  cm.querySelectorAll("[data-a]").forEach(td=>{ const n=td.cloneNode(true); td.replaceWith(n); n.addEventListener("click",()=>{ EX.d=[n.dataset.a,n.dataset.b,...EX.d.filter(k=>k!==n.dataset.a&&k!==n.dataset.b)].slice(0,6); EX.c=[]; exUpdate(); window.scrollTo({top:0}); }); });
  cm.querySelectorAll(".pairs a").forEach(a=>{ const m=a.getAttribute("href").match(/^#relaciones-(\w+)-(\w+)$/); if(m) a.setAttribute("href",exHash({v:"cruce",d:[m[1],m[2]],c:[]})); });
  exCausal(x,y);
  czRefresh(false);
}

// ---------- veredicto, etiquetas, gráfico «lo que queda», barra y efecto en unidades ----------
const CZTIPQ="Cuánto de la relación original sigue ahí después de igualar lo que has marcado. 100 % es que nada cambia; 0 %, que desaparece.";
let CZMORE=false;
const CZI=new Set();   // avisos abiertos con la «i» (clave: «control|risk» o «control|sus»)
// escala del veredicto: cuatro tramos de |r|; devuelve la posición del marcador (0-100)
const czPos=a=>a<.1?a/.1*25:a<.3?25+(a-.1)/.2*25:a<.5?50+(a-.3)/.2*25:Math.min(100,75+(a-.5)/.5*25);
const czIt=(t,l)=>`<button type="button" class="iq czit" data-t="${esc(t)}" aria-label="${esc(l||"Más información")}">${IQ_SVG}</button>`;
const czTipBind=root=>tipBind(root.querySelectorAll(".czit"),b=>b.dataset.t);
function czVerdict(r,adj){
  const box=document.getElementById("czl"); if(!box||!CZ) return; const a=Math.abs(r), i=a<.1?0:a<.3?1:a<.5?2:3, xl=low(labK(CZ.x)), yl=low(labK(CZ.y));
  const T=["Casi no hay relación","Relación débil","Relación moderada","Relación fuerte"], L=["Ninguna","Débil","Moderada","Fuerte"];
  const plain=a<.1?`Saber ${xl} apenas ayuda a adivinar ${yl}.`:`Donde hay más ${xl}, suele haber ${r>0?"más":"menos"} ${yl}.`;
  const tipR="La r mide cuánto van juntos dos datos, de −1 a +1. Cerca de 0, no van juntos. Cerca de +1, cuando uno sube el otro también. Cerca de −1, cuando uno sube el otro baja.";
  const tipP="Repetimos la comparación de otras formas para ver si la relación resiste: entre municipios parecidos, dentro de cada provincia, mirando los cambios y con municipios gemelos. El detalle está en «Entender esta relación a fondo».";
  const op=box.querySelector("details")?.open, nd=Math.round(Math.min(1,a/0.7)*5);
  const tipG="Mide si los dos datos suben y bajan a la vez en los municipios. No dice que uno cause el otro.";
  box.innerHTML=`<h3>Cuánto van juntos${czIt(tipG,"Qué mide esto")}</h3>
    <div class="czdots" role="img" aria-label="${T[i]}">${[1,2,3,4,5].map(n=>`<i class="${n<=nd?"on":""}"></i>`).join("")}</div>
    <div class="czvh"><em>${T[i]}</em>${adj?'<span class="czadj">tras igualar</span>':""}</div>
    <p class="czplain">${plain}</p>
    <details class="czdet"${op?" open":""}><summary>Más detalle</summary><p class="czr">r = ${rFmt(r)}${czIt(tipR,"Qué es la r")}</p>${CZ.lev!=null?`<p class="czpr">Comprobaciones extra: <b>supera ${CZ.passed} de ${CZ.total}</b> <span class="muted">· ${low(CZLEV[CZ.lev][0])}</span>${czIt(tipP,"Qué son las comprobaciones extra")}</p>`:""}</details>`;
  czTipBind(box);
}
function czSusNote(k){
  const cn=CNAME[k], p=CZ.solo&&CZ.solo[k], a0=Math.abs(CZ.base.r), xl=low(labK(CZ.x)), yl=low(labK(CZ.y));
  const after=p==null?null:(Math.sign(p)===Math.sign(CZ.base.r)?Math.abs(p):0), lost=after==null||!a0?null:Math.round((1-Math.min(1,after/a0))*100);
  const move=lost!=null?` Al igualar solo ${cn}, la relación pierde un ${lost}${NB}%.`:"";
  const why=k==="prov"?`Igualar por provincia quita las diferencias entre zonas de España (clima, economía, leyes). Si la relación cae mucho, buena parte venía de ahí.`
    :`Puede que ${cn} afecte a la vez a ${xl} y a ${yl}.`;
  return `<b>Es la que más pesa.</b>${move} ${why} Es una pista, no una prueba: la relación puede ser falsa, o igualar esto puede llevarse parte de lo real.`;
}
// texto del aviso según la «i» (clave «control|risk» o «control|sus»)
function czTip(id){ const [k,t]=id.split("|"), rk=t==="risk"?ctrlRisk(CZ.x,CZ.y,k):null; return t==="risk"?(rk?`<b>Cuidado con igualar ${CNAME[k]}.</b> ${rk.m}`:""):czSusNote(k); }
// avisos bajo los controles: salen solos al marcar la casilla o al pulsar la «i»
function czNotes(){
  const box=document.getElementById("cznotes"), tg=document.getElementById("cztags"); if(!box||!tg||!CZ) return; const {x,y}=CZ, vf=vForbid(x,y), cs=EX.c.filter(c=>c!==x&&c!==y&&CNAME[c]&&!vf.has(c));
  const ks=[...CTAGS.map(t=>t[0]).filter(k=>k!==x&&k!==y&&!vf.has(k)),...cs.filter(k=>!CKNOWN[k])]; let h=vForbidNote(x,y);
  ks.forEach(k=>{ const on=cs.includes(k), rk=ctrlRisk(x,y,k);
    if(rk&&(on||CZI.has(k+"|risk"))) h+=`<div class="czn2 risk"><b>Cuidado con igualar ${CNAME[k]}.</b> ${rk.m}</div>`;
    if(k===CZ.suspect&&(on||CZI.has(k+"|sus"))) h+=`<div class="czn2 sus">${czSusNote(k)}</div>`; });
  box.innerHTML=h;
  tg.querySelectorAll(".czi").forEach(b=>{ const k=b.dataset.i.split("|")[0]; b.setAttribute("aria-expanded",String(cs.includes(k)||CZI.has(b.dataset.i))); });
}
function czRefresh(animate){
  if(!CZ) return; const {x,y,w,base}=CZ, vf=vForbid(x,y), cs=EX.c.filter(c=>c!==x&&c!==y&&CNAME[c]&&!vf.has(c));
  const tg=document.getElementById("cztags"); if(!tg) return;
  const a0=Math.abs(base.r), sgn=Math.sign(base.r), solo=CZ.solo||{}, foc=document.activeElement&&tg.contains(document.activeElement)?document.activeElement.dataset.k:null;
  // cuánto cambia la relación si se descuenta solo esa variable
  const wt=k=>{ const p=solo[k]; if(p==null||a0<0.1) return ""; if(Math.sign(p)!==sgn&&Math.abs(p)>=0.1) return "invierte";
    const d=((Math.sign(p)===sgn?Math.abs(p):0)-a0)/a0*100; return Math.abs(d)<5?"":(d<0?"−":"+")+nf0.format(Math.min(100,Math.abs(d)))+NB+"%"; };
  const chip=(k,lab,on)=>{ const rk=ctrlRisk(x,y,k), sus=k===CZ.suspect, t=wt(k);
    const tag=(cls,txt,type)=>`<span class="czt ${cls}">${txt}</span><button type="button" class="iq czi" data-i="${k}|${type}" aria-expanded="false" aria-label="Qué significa «${txt}» en ${esc(lab)}">${IQ_SVG}</button>`;
    return `<span class="czchip${on?" on":""}${sus?" sus":""}${rk?" risk":""}"><button type="button" class="czpick" data-k="${k}" aria-pressed="${on}"${t?` title="${esc(`Si igualas solo esto, la relación cambia un ${t.replace(/^[+−]/,"").replace(NB," ")}${t[0]==="+"?" más":" menos"} (r pasa de ${rFmt(base.r)} a ${rFmt(solo[k])})`)}"`:""}>${esc(cap(lab))}</button>${rk?`<button type="button" class="czwarn2 czi" data-i="${k}|risk" aria-expanded="false" aria-label="Cuidado con igualar ${esc(lab)}">!</button>`:""}${sus?tag("su","la que más pesa","sus"):""}</span>`; };
  const allK=CTAGS.map(t=>t[0]).filter(k=>k!==x&&k!==y&&!vf.has(k)), lossOf=k=>{ const p=solo[k]; return p==null?0:a0-(Math.sign(p)===sgn?Math.abs(p):0); },
    ranked=[...allK].sort((a,b)=>(b===CZ.suspect)-(a===CZ.suspect)||lossOf(b)-lossOf(a)), topK=new Set(ranked.slice(0,3)),
    shown=ranked.filter(k=>CZMORE||cs.includes(k)||topK.has(k)), nHid=allK.length-shown.length;
  tg.innerHTML=shown.map(k=>chip(k,CSHORT[k],cs.includes(k))).join("")
    +cs.filter(k=>!CKNOWN[k]).map(k=>chip(k,low(labK(k)),true)).join("")
    +(nHid>0||CZMORE?` <button type="button" class="czadd czmorebtn" id="czmorebtn" aria-expanded="${CZMORE}">${CZMORE?"Ver menos ▴":`Ver ${nHid} más ▾`}</button>`:"")
    +` <button type="button" class="czadd" id="czadd">+ otra variable</button>`;
  const mb=document.getElementById("czmorebtn"); if(mb) mb.addEventListener("click",()=>{ CZMORE=!CZMORE; czRefresh(false); });
  document.getElementById("czadd").addEventListener("click",e=>openPicker(e.currentTarget,{current:null,excl:[x,y,...EX.c,...vForbid(x,y)],onPick:v=>{ EX.c=[...EX.c.filter(c=>c!==v),v]; exSetHash(); czRefresh(true); }}));
  tg.querySelectorAll("button.czpick").forEach(b=>b.addEventListener("click",()=>{ const k=b.dataset.k, on=b.getAttribute("aria-pressed")==="true"; EX.c=on?EX.c.filter(c=>c!==k):[...EX.c.filter(c=>c!==k),k]; exSetHash(); czRefresh(true); }));
  tg.querySelectorAll("button.czi").forEach(b=>{ const show=()=>tipShow(b,czTip(b.dataset.i));
    b.addEventListener("mouseenter",show); b.addEventListener("focus",show); b.addEventListener("mouseleave",tipHide); b.addEventListener("blur",tipHide);
    b.addEventListener("click",e=>{ e.stopPropagation(); tipHide(); const id=b.dataset.i; CZI.has(id)?CZI.delete(id):CZI.add(id); czNotes(); }); });
  if(foc){ const f=tg.querySelector(`[data-k="${foc}"]`); if(f) f.focus(); }
  // gráfico
  const note=document.getElementById("ctlnote"), plot=document.getElementById("cplot");
  const list=cs.map(c=>CNAME[c]).join(", ").replace(/, ([^,]*)$/," y $1");
  if(cs.length){ note.innerHTML=`<div class="ctlnote"><span>Ahora ves <b>lo que queda</b> al comparar entre municipios parecidos en ${list}: cada punto se ha movido para descontarlo.</span><button type="button" id="ctlreset">Volver al original</button></div>`;
    document.getElementById("ctlreset").addEventListener("click",()=>{ EX.c=[]; exSetHash(); czRefresh(true); });
    adjScatter(plot,x,y,cs,w,animate); }
  else { note.innerHTML=""; if(LBPOS){ LBPOS=null; drawRel(); } }
  // barra «queda» y frase
  const bar=document.getElementById("czbar"), sum=document.getElementById("czsum");
  if(!cs.length){ bar.innerHTML=`<span class="trk"><span class="kp" style="width:100%"></span></span><span class="pc">Queda el <b>100${NB}%</b> de la relación${czIt(CZTIPQ,"Qué mide la relación que queda")}</span>`; czTipBind(bar);
    sum.innerHTML="";
    czVerdict(base.r,false); czEuros(x,y,cs,w); czNotes(); return; }
  const pfin=partialR(x,y,cs,w), left=pfin&&Math.sign(pfin.r)===Math.sign(base.r)?Math.min(a0,Math.abs(pfin.r)):0, share=a0?left/a0:0;
  let prev=a0, top=null; cs.forEach((c,i)=>{ const p=partialR(x,y,cs.slice(0,i+1),w); const now=p?(Math.sign(p.r)===Math.sign(base.r)?Math.abs(p.r):0):prev; const lost=Math.max(0,prev-now); if(!top||lost>top.lost) top={c,lost}; prev=Math.min(prev,now); });
  bar.innerHTML=`<span class="trk"><span class="kp" style="width:${Math.max(0,Math.min(100,share*100)).toFixed(1)}%"></span></span><span class="pc">Queda el <b>${nf0.format(share*100)}${NB}%</b> de la relación${czIt(CZTIPQ,"Qué mide la relación que queda")}</span>`; czTipBind(bar);
  const flip=pfin&&Math.sign(pfin.r)!==Math.sign(base.r)&&Math.abs(pfin.r)>=0.1, verb=flip?"cambia de sentido":share<0.25?"casi desaparece":share<0.6?"se debilita mucho":share<0.85?"se debilita algo":"apenas cambia";
  sum.innerHTML=`Si los municipios fueran iguales en ${cs.map(c=>CNAME[c].replace(/^(el|la|los) /,"")).join(", ").replace(/, ([^,]*)$/," y $1")}, la relación <b>${verb}</b>${top&&top.lost/a0>=0.15?`: ${top.c==="prov"?"la provincia":CNAME[top.c]} es lo que más pesa`:""}.`;
  czVerdict(pfin?pfin.r:base.r,true); czEuros(x,y,cs,w); czNotes();
}
// efecto en unidades: «por cada X más de A, B es Y mayor», con intervalo, antes y después de descontar
const CZE={};
function czEst(x,y,cs,w,st){
  const key=[x,y,w?1:0,st,cs.join(","),JSON.stringify(typeof EXF!=="undefined"?EXF:null),EX.p,EX.t].join("|"); if(key in CZE) return CZE[key];
  const D=adjData(x,y,cs,w); if(!D||!D.c) return CZE[key]=null;
  const pts=D.X.map((v,i)=>({x:v,y:D.Y[i],w:D.w[i]})), b=D.c.b*st, ci=bootCI(pts,s=>{ const k=wcorr(s); return k?k.b*st:null; },{B:120});
  return CZE[key]={b,ci,n:D.rs.length};
}
function czEuros(x,y,cs,w){
  const box=document.getElementById("czeur"), hd=document.getElementById("czeh"); if(!box) return;
  const D0=adjData(x,y,[],w); if(!D0||!D0.c){ box.innerHTML=""; return; }
  const st=niceStep(x,D0.X.map((v,i)=>({x:v,y:D0.Y[i],w:D0.w[i]}))), e0=czEst(x,y,[],w,st), e1=cs.length?czEst(x,y,cs,w,st):null, e=e1||e0; if(!e){ box.innerHTML=""; return; }
  const f=(CATK[y]||{}).f; if(hd) hd.textContent=f==="eur"?"En euros":f==="years"?"En años":"En números";
  const sv=v=>(v<0?"−":"+")+unitTxt(y,v), shn=v=>{ const ab=Math.abs(v), d=ab>=100?0:ab>=1?1:2, nf=new Intl.NumberFormat("es-ES",{minimumFractionDigits:d,maximumFractionDigits:d}); return (v<0?"−":"+")+nf.format(ab)+(f==="eur"?NB+"€":""); }, rng=o=>o.ci?` · entre ${shn(o.ci[0])} y ${shn(o.ci[1])}`:"";
  const sig=o=>o.ci&&(o.ci[0]>0||o.ci[1]<0), stTxt=unitTxt(x,st).replace(/^1 punto$/,"punto");
  const rows=e1?[["Sin igualar",e0,"g"],["Tras igualar",e1,"b"]]:[["Estimación",e0,"b"]];
  const lo=Math.min(0,...rows.map(r=>r[1].ci?r[1].ci[0]:r[1].b)), hi=Math.max(0,...rows.map(r=>r[1].ci?r[1].ci[1]:r[1].b)), pad=(hi-lo||1)*0.06;
  const W=Math.max(260,Math.round(box.clientWidth||340)), m=10, X=v=>m+(v-lo+pad)/(hi-lo+2*pad)*(W-2*m), P=rows.length>1?44:34, H=rows.length*P+22;
  const step=d3.tickStep(lo,hi,3), dg=step>=1?0:step>=0.1?1:2, tf=new Intl.NumberFormat("es-ES",{minimumFractionDigits:dg,maximumFractionDigits:dg});
  const tk=v=>(v>0?"+":v<0?"−":"")+tf.format(Math.abs(v));
  let s=`<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Efecto estimado con su intervalo del 95 %, respecto a cero">`;
  d3.ticks(lo,hi,3).forEach(v=>{ s+=`<line class="cze-t" x1="${X(v)}" x2="${X(v)}" y1="4" y2="${rows.length*P}"/><text class="cze-x" x="${X(v)}" y="${rows.length*P+16}" text-anchor="middle">${v===0?"0":tk(v)}</text>`; });
  s+=`<line class="cze-0" x1="${X(0)}" x2="${X(0)}" y1="2" y2="${rows.length*P}"/>`;
  rows.forEach(([lab,o,c],i)=>{ const y0=i*P, cy=y0+(e1?28:16), a=o.ci?X(o.ci[0]):X(o.b), b=o.ci?X(o.ci[1]):X(o.b);
    s+=(e1?`<text class="cze-l ${c}" x="${m}" y="${y0+12}">${lab}</text>`:"")+`<rect class="cze-b ${c}" x="${a}" y="${cy-5}" width="${Math.max(2,b-a)}" height="10" rx="5"/><circle class="cze-d ${c}" cx="${X(o.b)}" cy="${cy}" r="7"/>`; });
  s+=`</svg>`;
  const un=(CATK[y]||{}).un||(f==="eur"?"euros":f==="years"?"años":f==="int"?"habitantes":f==="veces"?"veces":f==="num"?"unidades":"puntos");
  const nd=e1?e0.n-e1.n:0, nTxt=nd>0?` Faltan datos de ${nf0.format(nd)} municipio${nd===1?"":"s"} en lo que descuentas.`:"";
  const op=box.querySelector("details")?.open;
  const ok=sig(e), vd=document.getElementById("czevd");
  if(vd){ vd.innerHTML=`<span class="czvd ${ok?"ok":"nz"}">${ok?"✓ Efecto claro":"Sin efecto claro"}${czIt(ok?"El rango probable no toca el cero, así que es poco probable que sea casualidad.":"El rango probable incluye el cero: con estos datos no se puede asegurar que haya efecto, podría ser casualidad.","Qué significa")}</span>`; czTipBind(vd); }
  box.innerHTML=`<p class="czsent">Por cada ${stTxt} más de ${low(labK(x))}, ${low(labK(y))} ${e.b>=0?"sube":"baja"}${cs.length?" entre municipios parecidos":""}:</p><div class="czbig">${sv(e.b)}</div>${s}
    <details class="czdet"${op?" open":""}><summary>Ver rango y detalle</summary><p class="czm">Rango probable: ${rows.map(([lab,o])=>`${e1?lab.toLowerCase()+" ":""}<b>${sv(o.b)}</b>${esc(rng(o))}`).join("; ")}.</p><p class="czcap">Escala en ${un}. El 0 es «sin efecto»; la barra marca el rango probable.${czIt("Es el intervalo del 95 %: si repitiéramos el cálculo con otros municipios parecidos, el resultado caería dentro de este rango 95 de cada 100 veces.","Qué es el rango probable")}</p>
    <p class="czm">Calculado con <b>${nf0.format(e.n)}</b> municipios.${nTxt}${e.n<1000?" Son pocos: el rango sale muy amplio.":""}</p></details>`; czTipBind(box);
}
function adjScatter(box,x,y,cs,w,animate){
  const D=adjData(x,y,cs,w), D0=adjData(x,y,[],w); if(!D){ box.innerHTML='<p class="loading">No hay datos suficientes.</p>'; return; }
  const start=LBPOS||new Map(D0.rs.map((r,i)=>[r[F.code],[D0.X0[i],D0.Y0[i]]]));
  const pts=D.rs.map((r,i)=>({r,x1:D.X[i],y1:D.Y[i],x0:(start.get(r[F.code])||[D.X[i],D.Y[i]])[0],y0:(start.get(r[F.code])||[D.X[i],D.Y[i]])[1]}));
  const q=(a,p)=>d3.quantile(a.slice().sort(d3.ascending),p);
  const xs=pts.flatMap(p=>[p.x0,p.x1]), ys=pts.flatMap(p=>[p.y0,p.y1]);
  const W=Math.max(300,Math.round(box.clientWidth||800)), H=Math.round(Math.min(440,Math.max(260,W*0.54))), m={t:22,r:16,b:40,l:58};
  const X0=d3.scaleLinear().domain([q(xs,.004),q(xs,.993)]).nice().range([m.l,W-m.r]).clamp(true), Y0=d3.scaleLinear().domain([q(ys,.004),q(ys,.993)]).nice().range([H-m.b,m.t]).clamp(true);
  let X=X0, Y=Y0, ZM=false;
  const fx=fmtK(x), fy=fmtK(y), short=(fm,v)=>fm(v).replace(/ (%|€)$/,"$1");
  box.innerHTML=`<figure><div class="scat-wrap"><canvas width="${W*2}" height="${H*2}" role="img" aria-label="${esc(labK(x))} frente a ${esc(labK(y))}, descontando ${esc(cs.map(c=>CNAME[c]).join(", "))}"></canvas><svg viewBox="0 0 ${W} ${H}"></svg></div><figcaption>Cada punto es un municipio, colocado según su valor «a igualdad de ${esc(cs.map(c=>CNAME[c]).join(", ").replace(/, ([^,]*)$/," y $1"))}»: lo que tendría si en eso fuera como la media. ${nf0.format(pts.length)} municipios.</figcaption></figure>`;
  const svg=d3.select(box).select("svg"), cv=box.querySelector("canvas"), ctx=cv.getContext("2d"); ctx.scale(2,2);
  const drawAxes=()=>{ svg.selectAll(".grid,.axis,.lab").remove();
  svg.append("g").attr("class","grid").selectAll("line").data(Y.ticks(5)).join("line").attr("x1",m.l).attr("x2",W).attr("y1",Y).attr("y2",Y);
  svg.append("g").attr("class","axis").selectAll("text").data(Y.ticks(5)).join("text").attr("x",m.l-6).attr("y",v=>Y(v)+4).attr("text-anchor","end").text(v=>short(fy,v));
  svg.append("g").attr("class","axis").selectAll("text").data(X.ticks(W<500?4:6)).join("text").attr("x",X).attr("y",H-m.b+16).attr("text-anchor","middle").text(v=>short(fx,v));
  svg.append("text").attr("class","lab strong").attr("x",W).attr("y",H-4).attr("text-anchor","end").text(labK(x)+", a igualdad →");
  svg.append("text").attr("class","lab strong").attr("x",0).attr("y",m.t-10).attr("text-anchor","start").text("↑ "+labK(y)+", a igualdad");
  };
  drawAxes();
  const c=D.c; const line=svg.append("line").attr("stroke",css("--ink")).attr("stroke-width",1.3).attr("stroke-dasharray","5 4").attr("opacity",0);
  const setLine=()=>{ if(c&&Math.abs(c.r)>=0.05){ const [a,b]=X.domain(); line.attr("x1",X(a)).attr("y1",Y(c.a+c.b*a)).attr("x2",X(b)).attr("y2",Y(c.a+c.b*b)); } };
  const lcid="scc"+(++SCID); svg.append("defs").append("clipPath").attr("id",lcid).append("rect").attr("x",m.l).attr("y",m.t).attr("width",W-m.l-m.r).attr("height",H-m.t-m.b); line.attr("clip-path",`url(#${lcid})`);
  setLine();
  const mxP=d3.max(pts,p=>p.r[F.pop]||1), Rr=d3.scaleSqrt().domain([0,mxP]).range([1.5,Math.max(4,Math.min(16,16*Math.sqrt(mxP/2e6)))]), base=css("--rust"), ink=css("--ink");
  const sorted=pts.slice().sort((a,b)=>(b.r[F.pop]||0)-(a.r[F.pop]||0));
  const E=(EX.sz||EX.col)?makeEnc(pts.map(p=>p.r),{sz:EX.sz,col:EX.col}):null, rad=r=>E&&E.r?E.r(r):Rr(r[F.pop]||1);
  sorted.sort((a,b)=>rad(b.r)-rad(a.r)); if(E&&E.legend().length) box.querySelector("figure").insertAdjacentHTML("beforeend",E.legend());
  const paint=t=>{ ctx.clearRect(0,0,W,H); if(ZM){ ctx.save(); ctx.beginPath(); ctx.rect(m.l,m.t-4,W-m.l-m.r+4,H-m.t-m.b+8); ctx.clip(); } ctx.fillStyle=base; ctx.globalAlpha=E&&E.c?.5:.3;
    for(const p of sorted){ const px=p.x0+(p.x1-p.x0)*t, py=p.y0+(p.y1-p.y0)*t; ctx.beginPath(); ctx.arc(X(px),Y(py),rad(p.r),0,7); if(E&&E.c) ctx.fillStyle=E.c(p.r); ctx.fill(); }
    ctx.globalAlpha=1; for(const mc of [lastMun,MUN2].filter(Boolean)){ const mk=pts.find(p=>p.r[F.code]===mc); if(!mk) continue; const px=X(mk.x0+(mk.x1-mk.x0)*t), py=Y(mk.y0+(mk.y1-mk.y0)*t); ctx.beginPath(); ctx.arc(px,py,Math.max(5,rad(mk.r)),0,7); ctx.lineWidth=2; ctx.strokeStyle=ink; ctx.stroke(); ctx.font="600 12.5px 'Libre Franklin', Arial, sans-serif"; ctx.fillStyle=ink; ctx.fillText(dispName(mk.r[F.name]),px+9,py-8); } if(ZM) ctx.restore(); };
  const reduce=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;
  if(animate&&!reduce){ const tm=d3.timer(el=>{ const t=Math.min(1,el/750); paint(d3.easeCubicInOut(t)); if(t>=1){ tm.stop(); line.transition().duration(300).attr("opacity",1); } }); }
  else { paint(1); line.attr("opacity",1); }
  addZoom(box.querySelector(".scat-wrap"),{m,W,H,X0,Y0,onZoom:(xz,yz,z)=>{ X=xz; Y=yz; ZM=z; drawAxes(); setLine(); paint(1); }});
  LBPOS=new Map(pts.map(p=>[p.r[F.code],[p.x1,p.y1]]));
}

// =====================================================================
// LABORATORIO · ANTES Y DESPUÉS: diferencias en diferencias con gemelos, año a año, y placebos
// =====================================================================
// año del primer dato anual que ya recoge la medida: si entra en vigor en el primer semestre, ese año; si no, el siguiente
const firstYear=f=>{ const y=+f.slice(0,4), m=+f.slice(5,7)||1; return m<=6?y:y+1; };
const CCAAS=()=>[...new Set(Object.values(CCAA_OF))].filter(c=>!/Ceuta|Melilla/.test(c)).sort((a,b)=>a.localeCompare(b,"es"));
// resultados: series anuales por municipio (data/estudios.json)
const ADY={
  pad:{src:"INE, padrón municipal",l:"Población (padrón)",u:"habitantes",yrs:()=>SER.padYears,get:s=>s[SF.pad],note:"El padrón es a 1 de enero: una medida de un año se ve sobre todo en el padrón del año siguiente."},
  paro:{src:"SEPE, paro registrado por municipio",l:"Paro registrado",u:"parados",yrs:()=>SER.paroYears,get:s=>s[SF.paro],note:"Media anual del SEPE; el último año, hasta septiembre."},
  renta:{src:"INE, Atlas de Distribución de Renta de los Hogares",l:"Renta por persona",u:"euros",yrs:()=>SER.years,get:s=>s[SF.renta],note:"Atlas de Renta del INE, renta neta media por persona."},
  ipva:{src:"INE, Índice de Precios de Vivienda en Alquiler",l:"Alquiler (índice del INE)",u:"índice",yrs:()=>SER.ipvaYears,get:s=>s[SF.ipva],note:"Índice de Precios de Vivienda en Alquiler, todos los contratos declarados; solo municipios con suficientes contratos (en la práctica, de más de 10.000 habitantes)."},
  vtp:{src:"INE, medición de viviendas turísticas",l:"Pisos turísticos (% de viviendas)",u:"% de viviendas",yrs:()=>[2020,2021,2022,2023,2024,2025,2026],get:s=>vtpAnnual(s),note:"INE, viviendas turísticas: dato de agosto de cada año (2025, media de mayo y noviembre; 2026, mayo)."}
};
function vtpAnnual(s){ const v=s[SF.vtp]; if(!v) return null; const P=SER.vtPeriods, at=k=>{ const i=P.indexOf(k); return i>=0?v[i]:null; };
  const a=[at("2020M08"),at("2021M08"),at("2022M08"),at("2023M08"),at("2024M08")], m25=[at("2025M05"),at("2025M11")].filter(x=>x!=null);
  a.push(m25.length?d3.mean(m25):null); a.push(at("2026M05")); return a; }
// tratamientos: cada uno devuelve [{code,t0}] y el conjunto de municipios que no pueden ser gemelos
const ADEV={
  tensionadas:{l:"Tope del alquiler en Cataluña (zonas tensionadas, 2024)",y:"ipva",mp:10000,t:()=>"el tope del alquiler en Cataluña",
    get:()=>({T:EXT.tensionadas.codes.map(code=>({code,t0:2024})),X:new Set([...EXT.tensionadas.codes,...EXT.tensionadas.ampliacion.codes])}),
    d:"Los 140 municipios catalanes declarados zona tensionada en marzo de 2024 (BOE). Los 131 que entraron en octubre de 2024 no se usan como gemelos."},
  ave:{l:"Llegada de la alta velocidad (2021–2023)",y:"pad",mp:500,t:()=>"la llegada de la alta velocidad",
    get:async()=>{ await loadTopo(); const CEN=qCen(), ST=EXT.ave.estaciones.filter(e=>CEN.has(e.code)); const T=[], X=new Set();
      rowsAll().forEach(r=>{ const c=CEN.get(r[F.code]); if(!c) return; let best=null; ST.forEach(e=>{ const d=km(c,CEN.get(e.code)); if(!best||d<best.d) best={d,e}; }); if(!best) return; if(best.d<=25) T.push({code:r[F.code],t0:firstYear(best.e.fecha)}); if(best.d<=60) X.add(r[F.code]); });
      return {T,X}; },
    d:"Municipios a menos de 25 km de una estación con alta velocidad abierta entre 2021 y 2023. Los que están a menos de 60 km no se usan como gemelos, porque también pueden notarla."},
  vut:{l:"Prohibir nuevos pisos turísticos (2018–2025)",y:"vtp",mp:5000,mc:1,t:()=>"las prohibiciones de nuevos pisos turísticos",
    get:()=>{ const by=new Map(); EXT.vut.municipios.filter(m=>m.fecha&&m.confianza!=="baja").forEach(m=>{ const t0=firstYear(m.fecha); if(!by.has(m.code)||by.get(m.code)>t0) by.set(m.code,t0); });
      return {T:[...by].map(([code,t0])=>({code,t0})),X:new Set(EXT.vut.municipios.map(m=>m.code))}; },
    d:"Municipios con moratoria o prohibición de nuevas viviendas turísticas con fecha confirmada (confianza alta o media)."},
  covid:{l:"Pandemia en los municipios más turísticos (2020)",y:"paro",mp:1000,t:()=>"la pandemia en los municipios más turísticos",
    get:()=>{ const rs=rowsAll().filter(r=>r[F.vtp20]!=null&&(r[F.pop]||0)>=1000), cut=d3.quantile(rs.map(r=>r[F.vtp20]).sort(d3.ascending),.9); const T=rs.filter(r=>r[F.vtp20]>=cut).map(r=>({code:r[F.code],t0:2020}));
      return {T,X:new Set(rs.filter(r=>r[F.vtp20]>=d3.quantile(rs.map(r=>r[F.vtp20]).sort(d3.ascending),.75)).map(r=>r[F.code]))}; },
    d:"El 10 % de municipios de 1.000 habitantes o más con más pisos turísticos en agosto de 2020. Los del siguiente 15 % no se usan como gemelos."},
  ccaa:{l:"Una comunidad autónoma entera…",free:true,y:"paro",mp:1000,t:A=>`${A.cc||"una comunidad"} desde ${A.yr}`,
    get:A=>({T:rowsAll().filter(r=>CCAA_OF[r[F.prov]]===A.cc).map(r=>({code:r[F.code],t0:A.yr})),X:new Set()}),
    d:"Todos los municipios de la comunidad, desde el año que elijas: una ley autonómica, un cambio de impuestos, una ayuda. Los gemelos salen del resto de España."},
  prov:{l:"Una provincia entera…",free:true,y:"paro",mp:1000,t:A=>`${A.pv?provShort(PROVS[A.pv]):"una provincia"} desde ${A.yr}`,
    get:A=>({T:rowsAll().filter(r=>r[F.prov]===A.pv).map(r=>({code:r[F.code],t0:A.yr})),X:new Set()}),
    d:"Todos los municipios de la provincia, desde el año que elijas."},
  lista:{l:"Tu propia lista de municipios…",free:true,y:"pad",mp:0,t:A=>`${A.ms.length} municipio${A.ms.length===1?"":"s"} desde ${A.yr}`,
    get:A=>({T:A.ms.map(code=>({code,t0:A.yr})),X:new Set()}),
    d:"Añade los municipios que vivieron algo en el mismo año (una fábrica que cerró, una ordenanza, una obra) y elige el año."}
};
let AD={ev:"tensionadas",y:"ipva",yr:2022,cc:"Andalucía",pv:"46",ms:[],mc:0,mp:10000,mt:"gem"};
function adSet(ev){ const E=ADEV[ev]; if(!E) return; AD={...AD,ev,y:E.y,mc:E.mc||0,mp:E.mp,mt:"gem"}; }
function adBar(bar){
  const E=ADEV[AD.ev], yrs=d3.range(2017,2026);
  bar.innerHTML=`
    <div class="lb-step"><h4><i>1</i>Qué quieres saber</h4>${typesHTML(EX.v)}${hintHTML("antes")}</div>
    <div class="lb-step ad-ctl"><h4><i>2</i>Qué pasó y dónde</h4>
      <select class="sel" id="adev" aria-label="Qué pasó">${Object.entries(ADEV).map(([k,v])=>`<option value="${k}" ${k===AD.ev?"selected":""}>${esc(v.l)}</option>`).join("")}</select>
      ${AD.ev==="ccaa"?`<label class="blk" for="adcc">Comunidad</label><select class="sel" id="adcc">${CCAAS().map(c=>`<option ${c===AD.cc?"selected":""}>${esc(c)}</option>`).join("")}</select>`:""}
      ${AD.ev==="prov"?`<label class="blk" for="adpv">Provincia</label><select class="sel" id="adpv">${Object.keys(PROVS).sort((a,b)=>provShort(PROVS[a]).localeCompare(provShort(PROVS[b]),"es")).map(p=>`<option value="${p}" ${p===AD.pv?"selected":""}>${esc(provShort(PROVS[p]))}</option>`).join("")}</select>`:""}
      ${AD.ev==="lista"?`<label class="blk" for="adq">Añadir municipio</label><div class="search" id="ads" role="combobox" aria-expanded="false" aria-haspopup="listbox" style="margin:0;max-width:none;flex:none"><input id="adq" type="search" placeholder="Escribe un municipio…" autocomplete="off" aria-autocomplete="list" aria-controls="adr"><ul id="adr" role="listbox" hidden></ul></div><div class="ad-list">${AD.ms.map(c=>`<button type="button" data-rm="${c}" aria-label="Quitar ${esc(dispName(BYCODE.get(c)[F.name]))}">${esc(dispName(BYCODE.get(c)[F.name]))} ×</button>`).join("")||'<span class="muted" style="font-size:13px">Aún ninguno.</span>'}</div>`:""}
      ${E.free?`<label class="blk" for="adyr">Primer año con la medida</label><select class="sel" id="adyr">${yrs.map(y=>`<option ${y===AD.yr?"selected":""}>${y}</option>`).join("")}</select>`:""}
      <p class="hint">${E.d}</p></div>
    <div class="lb-step ad-ctl"><h4><i>3</i>Qué medir</h4>
      <select class="sel" id="ady" aria-label="Qué medir">${Object.entries(ADY).map(([k,v])=>`<option value="${k}" ${k===AD.y?"selected":""}>${esc(v.l)}</option>`).join("")}</select>
      <label class="blk" for="admp">Municipios</label><select class="sel" id="admp">${[[0,"Todos los tamaños"],[500,"500 hab. o más"],[1000,"1.000 hab. o más"],[5000,"5.000 hab. o más"],[10000,"10.000 hab. o más"]].map(([v,l])=>`<option value="${v}" ${v===AD.mp?"selected":""}>${l}</option>`).join("")}</select>
      <label class="blk" for="admt">Método</label><select class="sel" id="admt"><option value="gem" ${AD.mt!=="sint"?"selected":""}>Gemelos (muchos municipios afectados)</option><option value="sint" ${AD.mt==="sint"?"selected":""}>Control sintético (un municipio o una zona)</option></select>
      ${AD.mt==="sint"?"":`<label class="chk"><input type="checkbox" id="admc" ${AD.mc?"checked":""} ${["ccaa"].includes(AD.ev)?"disabled":""}> Gemelos de la misma comunidad</label>`}
      <p class="hint">${ADY[AD.y].note}</p></div>
    <div class="lb-step"><h4><i>4</i>Comprobar</h4><p class="hint" style="margin:0">Debajo del gráfico: si <b>antes iban parejos</b>, si <b>después se separan</b> y si una separación así es <b>rara entre grupos elegidos al azar</b>.</p></div>`;
  typesTips(bar);
  bar.querySelectorAll(".types button").forEach(b=>b.addEventListener("click",()=>{ EX.v=b.dataset.v; if(EX.v==="cruce"&&EX.d.length<2) EX.d.push(EX.d[0]==="renta"?"paroReg":"renta"); navTo(exHash()); }));
  const on=(id,ev,fn)=>{ const e=document.getElementById(id); if(e) e.addEventListener(ev,fn); };
  on("adev","change",e=>{ adSet(e.target.value); exUpdate(); });
  on("adcc","change",e=>{ AD.cc=e.target.value; exUpdate(); });
  on("adpv","change",e=>{ AD.pv=e.target.value; exUpdate(); });
  on("adyr","change",e=>{ AD.yr=+e.target.value; exUpdate(); });
  on("ady","change",e=>{ AD.y=e.target.value; exUpdate(); });
  on("admp","change",e=>{ AD.mp=+e.target.value; exUpdate(); });
  on("admc","change",e=>{ AD.mc=e.target.checked?1:0; exUpdate(); });
  on("admt","change",e=>{ AD.mt=e.target.value; exUpdate(); });
  bar.querySelectorAll("button[data-rm]").forEach(b=>b.addEventListener("click",()=>{ AD.ms=AD.ms.filter(c=>c!==b.dataset.rm); exUpdate(); }));
  if(document.getElementById("adq")) attachSearch(document.getElementById("adq"),document.getElementById("adr"),document.getElementById("ads"),r=>{ if(!AD.ms.includes(r[F.code])) AD.ms=[...AD.ms,r[F.code]].slice(0,200); exUpdate(); });
}
// --- cálculo ---
// serie de un municipio en índice (año base = t0−1 → 100), por tiempo relativo k
function adSeries(code,t0,yk){ const s=SBY.get(code); if(!s) return null; const Y=ADY[yk].yrs(), v=ADY[yk].get(s); if(!v) return null;
  const ib=Y.indexOf(t0-1); if(ib<0||v[ib]==null||!(v[ib]>0)) return null; const out={}; Y.forEach((y,i)=>{ if(v[i]!=null) out[y-t0]=v[i]/v[ib]*100; }); return {idx:out,base:v[ib],lv:v[ib],pre:(()=>{ for(const g of [2,1]){ const j=Y.indexOf(t0-1-g); if(j>=0&&v[j]>0) return (v[ib]/v[j]-1)*100/g; } return null; })()}; }
// empareja cada tratado con su gemelo (con reemplazo) dentro de los candidatos con el mismo año de referencia
function adMatch(T,poolCodes,yk,mc){
  const byT0=d3.group(T,t=>t.t0), pairs=[];
  for(const [t0,ts] of byT0){
    const feat=code=>{ const r=BYCODE.get(code), a=adSeries(code,t0,yk); if(!r||!a||a.pre==null||!(0 in a.idx||1 in a.idx)) return null; return {code,r,a,f:[Math.log10(r[F.pop]||1),a.pre,Math.log(a.lv+0.1)]}; };
    const P=poolCodes.map(feat).filter(Boolean), TT=ts.map(t=>feat(t.code)).filter(Boolean); if(P.length<20||!TT.length) continue;
    const all=P.concat(TT), sd=[0,1,2].map(k=>d3.deviation(all,o=>o.f[k])||1);
    for(const t of TT){ let best=null; const cc=CCAA_OF[t.r[F.prov]];
      for(const c of P){ if(mc&&CCAA_OF[c.r[F.prov]]!==cc) continue; const d=Math.hypot((t.f[0]-c.f[0])/sd[0],(t.f[1]-c.f[1])/sd[1],(t.f[2]-c.f[2])/sd[2]); if(!best||d<best.d) best={d,c}; }
      if(best) pairs.push({t,c:best.c,d:best.d,t0}); } }
  return pairs;
}
const adGap=(p,k)=>p.t.a.idx[k]!=null&&p.c.a.idx[k]!=null?p.t.a.idx[k]-p.c.a.idx[k]:null;
const adPost=p=>{ const g=[0,1,2,3].map(k=>adGap(p,k)).filter(v=>v!=null); return g.length?d3.mean(g):null; };
// adPreOut: años previos que NO se usan para elegir el gemelo (el emparejamiento mira el crecimiento de t0-3 a t0-1), para que la prueba no sea circular
const adPreOut=p=>{ const g=[-6,-5,-4].map(k=>adGap(p,k)).filter(v=>v!=null); return g.length?d3.mean(g):null; };
const adPre=p=>{ const g=[-4,-3,-2].map(k=>adGap(p,k)).filter(v=>v!=null); return g.length?d3.mean(g):null; };
const adMean=(ps,fn)=>{ const v=ps.map(fn).filter(x=>x!=null); return v.length?d3.mean(v):null; };
async function exAntes(out){
  out.innerHTML='<p class="loading">Cargando las series de los municipios…</p>';
  await loadSeries(); if(EX.v!=="antes") return;
  const E=ADEV[AD.ev], Yk=AD.y, okPop=code=>(BYCODE.get(code)||[])[F.pop]>=AD.mp;
  if(AD.ev==="lista"&&!AD.ms.length){ out.innerHTML='<p class="loading">Añade en el panel los municipios que vivieron la medida y elige el año.</p>'; return; }
  const {T:T0,X}=await E.get(AD); const T=T0.filter(t=>BYCODE.has(t.code)&&okPop(t.code)), TS=new Set(T.map(t=>t.code));
  const pool=rowsAll().map(r=>r[F.code]).filter(c=>!TS.has(c)&&!X.has(c)&&okPop(c)&&!(AD.ev==="ccaa"&&CCAA_OF[BYCODE.get(c)[F.prov]]===AD.cc)&&!(AD.ev==="prov"&&BYCODE.get(c)[F.prov]===AD.pv));
  if(AD.mt==="sint"){ adSynth(out,T,pool,Yk,E); return; }
  out.innerHTML='<p class="loading">Buscando gemelos…</p>'; await new Promise(r=>setTimeout(r,20)); if(EX.v!=="antes") return;
  const pairs=adMatch(T,pool,Yk,AD.mc&&AD.ev!=="ccaa");
  if(pairs.length<3){ out.innerHTML=`<p class="loading">Hay ${pairs.length} municipio${pairs.length===1?"":"s"} afectado${pairs.length===1?"":"s"} con datos de ${low(ADY[Yk].l)} antes y después. Hacen falta al menos 3: prueba otro dato, otro año o más municipios.</p>`; return; }
  const ks=d3.range(-4,4).filter(k=>pairs.filter(p=>adGap(p,k)!=null).length>=Math.max(3,pairs.length*0.3));
  const gap=k=>adMean(pairs,p=>adGap(p,k)), gci=k=>k===-1?[0,0]:bootCI(pairs,s=>adMean(s,p=>adGap(p,k)),{B:200});
  const G=ks.map(k=>({k,g:gap(k),ci:gci(k)}));
  const post=adMean(pairs,adPost), postCI=bootCI(pairs,s=>adMean(s,adPost),{B:300}), pre=adMean(pairs,adPreOut), preCI=bootCI(pairs,s=>adMean(s,adPreOut),{B:300});
  const lab=k=>k===0?"0":k>0?"+"+k:"−"+Math.abs(k);
  const mT=ks.map(k=>adMean(pairs,p=>p.t.a.idx[k])), mC=ks.map(k=>adMean(pairs,p=>p.c.a.idx[k]));
  const t0s=[...new Set(pairs.map(p=>p.t0))].sort(), nT=new Set(pairs.map(p=>p.t.code)).size, reuse=pairs.length-new Set(pairs.map(p=>p.c.code)).size;
  const preOk=pre==null?null:!preCI||(preCI[0]<=0&&preCI[1]>=0)||Math.abs(pre)<Math.abs(post||0)*0.3, postSig=postCI&&(postCI[0]>0||postCI[1]<0);
  const yl=low(ADY[Yk].l), dir=post>0?"más":"menos";
  out.innerHTML="";
  const top=add(out,"div");
  top.innerHTML=`<p class="ad-verdict" id="adv"></p>`;
  const g2=add(out,"div","cols2");
  lineChart(g2,{title:`${ADY[Yk].l}: afectados y gemelos`,sub:"Año anterior a la medida = 100",source:`Media de ${nf0.format(nT)} municipios afectados y de sus gemelos. 0 = primer año con la medida${t0s.length===1?` (${t0s[0]})`:` (${t0s[0]}–${t0s[t0s.length-1]}, según el municipio)`}. Fuente: ${ADY[Yk].src}.`,series:[{n:"Afectados",v:mT,c:"--rust",main:true},{n:"Gemelos",v:mC,c:"--slate"}],years:ks.map(lab),xticks:ks.map(lab),fmt:v=>nf1.format(v),tickFmt:v=>nf0.format(v),height:260});
  const fg=fig(g2,{title:"Diferencia entre afectados y gemelos, año a año",sub:"Puntos del índice; la sombra es el intervalo del 95 %",source:"Antes de la medida (a la izquierda de la raya) debería estar cerca de cero; después, la separación es el efecto estimado."});
  gapChart(fg.body,G,lab);
  const tests=add(out,"div");
  const plBox=add(out,"div"); plBox.innerHTML='<p class="muted" style="font-size:14px;margin-top:8px">Calculando placebos: el mismo cálculo con grupos elegidos al azar…</p>';
  const renderTests=pl=>{
    const plOk=pl?pl.p<=0.1:null;
    const em=v=>v==null?"⏳":v?"✅":"❌";
    const verdict=preOk===false?`Antes de la medida ya se separaban: este antes y después no es fiable.<small>Los gemelos no seguían el mismo camino antes (diferencia previa media de ${pts(pre)} puntos${preCI?`, [${pts(preCI[0])}; ${pts(preCI[1])}]`:""}). Prueba con gemelos de la misma comunidad, otro dato u otro tamaño de municipio.</small>`
      :!postSig?`No se ve una diferencia después de la medida.<small>Afectados y gemelos siguen juntos: la diferencia media después es de ${pts(post)} puntos [${pts(postCI[0])}; ${pts(postCI[1])}], que incluye el cero.</small>`
      :plOk===false?`Después se separan ${nf1.format(Math.abs(post))} puntos, pero grupos elegidos al azar también se separan así a menudo.<small>No basta para atribuirlo a la medida: ${nf0.format(pl.p*100)}${NB}% de los grupos al azar dan una diferencia igual o mayor.</small>`
      :`Después de la medida, ${yl} queda ${nf1.format(Math.abs(post))} puntos ${post<0?"por debajo":"por encima"} de sus gemelos${preOk?", y antes iban parejos":" (no hay datos de años anteriores para comprobar si antes iban parejos)"}.<small>${plOk?`${pl.p===0?`Ninguno de los ${pl.n} grupos elegidos al azar da`:`Solo un ${nf0.format(pl.p*100)}${NB}% de los grupos elegidos al azar dan`} una diferencia así. Es lo más cerca de un efecto que permiten estos datos, si se cumple lo de abajo.`:"Falta el contraste con grupos al azar."}</small>`;
    document.getElementById("adv").innerHTML=verdict;
    tests.innerHTML=`<ul class="ad-tests">
      <li><span>${preOk==null?"⚪":em(preOk)}</span><span><b>Antes iban parejos.</b> Diferencia media de 4 a 6 años antes (años que no se usan para elegir a los gemelos): ${pre==null?"no hay datos tan atrás, así que no se puede comprobar":`${pts(pre)} puntos${preCI?` [${pts(preCI[0])}; ${pts(preCI[1])}]`:""}`}. Los gemelos se eligen para que vinieran del mismo camino; si aun así se separaban, la comparación falla.</span></li>
      <li><span>${em(postSig)}</span><span><b>Después se separan.</b> Diferencia media desde el año de la medida: <b>${pts(post)} puntos</b>${postCI?` [${pts(postCI[0])}; ${pts(postCI[1])}]`:""}.</span></li>
      <li><span>${em(plOk)}</span><span><b>Es raro entre grupos al azar.</b> ${pl?`Repetido con ${pl.n} grupos del mismo tamaño elegidos al azar entre los municipios no afectados, la diferencia va de ${pts(pl.min)} a ${pts(pl.max)} puntos; ${pl.p===0?"ninguno iguala la real":`un ${nf0.format(pl.p*100)}${NB}% iguala o supera la real`}.`:"Calculando…"}</span></li>
      <li><span>ℹ️</span><span><b>Gemelos.</b> ${nf0.format(nT)} municipios afectados con datos, emparejados con ${nf0.format(pairs.length-reuse)} gemelos distintos${reuse?` (algunos sirven a más de uno)`:""}, parecidos en tamaño, nivel de ${yl} y cómo cambiaba en los dos años previos${AD.mc&&AD.ev!=="ccaa"?", de la misma comunidad":""}.</span></li></ul>
      <div class="mustbe"><h4>Qué tendría que ser cierto para que fuera un efecto ${("de "+esc(E.t(AD))).replace(/^de el /,"del ")}</h4><ol>
        <li><b>Sin la medida, los afectados habrían seguido como sus gemelos.</b> Es el supuesto clave, y solo se puede comprobar en parte: mirando que antes iban parejos.</li>
        <li><b>Nada más cambió a la vez solo en los afectados.</b> Si la misma comunidad aprobó otra ley ese año, o llegó otro suceso, se mezclan.</li>
        <li><b>La medida no se anticipó.</b> Si la gente reaccionó antes de que entrara en vigor (firmando contratos, mudándose), parte del efecto cae en el «antes».</li>
        <li><b>Los gemelos no la notaron.</b> Si el efecto se contagia a los vecinos, la diferencia se queda corta. Por eso en algunos casos se excluyen los municipios cercanos.</li></ol>
        <p>Si el diseño se te queda corto, mira cómo se hace a fondo en <a href="/preguntas/tope-cataluna/">el estudio del tope</a> o <a href="/preguntas/ave/">el del AVE</a>, o lee <a href="/laboratorio/metodo/#evidencia">los niveles de evidencia</a>.</p></div>`;
    ficha(tests,[["Afectados",`${E.d} ${nf0.format(nT)} con datos de ${yl} el año anterior y después${AD.mp?`, de ${nf0.format(AD.mp)} habitantes o más`:""}`],["Gemelos","Para cada afectado, el municipio no afectado más parecido (distancia euclídea sobre variables estandarizadas) en log del padrón, cambio anual medio del resultado en los dos años previos y nivel (log) el año anterior; con reemplazo"],["Resultado",`${ADY[Yk].l}, en índice con el año anterior a la medida = 100. ${ADY[Yk].note}`],["Modelo",`Diferencias en diferencias por parejas: diferencia del índice afectado − gemelo en cada año relativo (el año −1 es 0 por construcción). «Antes» = media de los años −4 a −2; «después» = media de los años 0 a +3 disponibles. Intervalos del 95 % por remuestreo de parejas. Placebo: ${pl?pl.n:40} grupos del mismo tamaño elegidos al azar entre los no afectados, con los mismos años de referencia, emparejados igual`]]);
  };
  renderTests(null);
  // placebos en el espacio, en segundo plano
  setTimeout(()=>{ if(EX.v!=="antes"||!document.body.contains(plBox)) return;
    const R=rng(23), N=Math.min(new Set(pairs.map(p=>p.t.code)).size,120), cand=pool.filter(c=>adSeries(c,pairs[0].t0,Yk)), vals=[];
    for(let b=0;b<40;b++){ const sh=cand.slice(); for(let i=sh.length-1;i>0&&i>=sh.length-N;i--){ const j=(R()*(i+1))|0; [sh[i],sh[j]]=[sh[j],sh[i]]; }
      const fake=sh.slice(-N).map(code=>({code,t0:pairs[(R()*pairs.length)|0].t0})), fs=new Set(fake.map(f=>f.code));
      const ps=adMatch(fake,cand.filter(c=>!fs.has(c)),Yk,AD.mc&&AD.ev!=="ccaa"); const v=adMean(ps,adPost); if(v!=null) vals.push(v); }
    const pl=vals.length>=10?{n:vals.length,min:d3.min(vals),max:d3.max(vals),p:vals.filter(v=>Math.abs(v)>=Math.abs(post)).length/vals.length}:null;
    plBox.innerHTML=pl?"":'<p class="muted" style="font-size:14px">No hay suficientes municipios para el contraste con grupos al azar.</p>';
    renderTests(pl); },60);
}
// control sintético en «Antes y después»: el conjunto de afectados (media ponderada) frente a una mezcla de donantes
function adSynth(out,T,pool,Yk,E){
  const t0s=d3.rollups(T,v=>v.length,t=>t.t0).sort((a,b)=>b[1]-a[1]); if(!t0s.length){ out.innerHTML='<p class="loading">No hay municipios afectados con datos.</p>'; return; }
  const t0=t0s[0][0], TT=T.filter(t=>t.t0===t0), Y=ADY[Yk].yrs(), ib=Y.indexOf(t0-1), pre=d3.range(0,ib+1);
  if(ib<2||Y.indexOf(t0)<0){ out.innerHTML=`<p class="loading">Para el control sintético hacen falta al menos tres años de ${low(ADY[Yk].l)} antes de ${t0} y alguno después.</p>`; return; }
  const ser_=code=>{ const sr=SBY.get(code); if(!sr) return null; const v=ADY[Yk].get(sr); if(!v||!(v[ib]>0)||v.some(x=>x==null)) return null; return v.map(x=>x/v[ib]*100); };
  const tr=TT.map(t=>({code:t.code,y:ser_(t.code),w:(BYCODE.get(t.code)||[])[F.pop]||0})).filter(o=>o.y&&o.w), W=d3.sum(tr,o=>o.w);
  if(!tr.length){ out.innerHTML='<p class="loading">Ningún municipio afectado tiene la serie completa de este dato.</p>'; return; }
  const y1=Y.map((_,i)=>d3.sum(tr,o=>o.w*o.y[i])/W), donors=pool.map(code=>({code,y:ser_(code)})).filter(d=>d.y);
  out.innerHTML='<p class="loading">Construyendo el sintético…</p>';
  setTimeout(()=>{ if(EX.v!=="antes") return; const S=synthControl(y1,donors,pre,{D:60,P:40}); if(!S){ out.innerHTML='<p class="loading">No hay donantes suficientes.</p>'; return; }
    const yl=low(ADY[Yk].l), lab0=tr.length===1?dispName(BYCODE.get(tr[0].code)[F.name]):"afectados";
    out.innerHTML=`<p class="ad-verdict">${S.p<=0.1?`Tras la medida, ${yl} queda ${nf1.format(Math.abs(S.postGap))} puntos ${S.postGap<0?"por debajo":"por encima"} de su sintético, una ruptura que casi ningún placebo iguala.`:`Tras la medida, ${yl} se separa ${nf1.format(Math.abs(S.postGap))} puntos de su sintético, pero muchos placebos se separan igual o más.`}<small>p = ${nf2.format(S.p)}: proporción de donantes que, tratados «como si», muestran una ruptura relativa igual o mayor. Error previo medio: ${nf2.format(S.preRMSPE)} puntos.${tr.length<TT.length?` ${TT.length-tr.length} afectados sin serie completa no entran.`:""}${t0s.length>1?` Solo se usan los afectados con año de referencia ${t0}.`:""}</small></p>`;
    synthCharts(out,S,Y,{yl,lab0});
    const box=add(out,"div"); box.innerHTML=`<div class="mustbe"><h4>Cómo leerlo</h4><ol><li><b>El sintético</b> es una media ponderada de ${S.top.length} municipios que no vivieron la medida, elegida para que reproduzca la trayectoria de ${esc(lab0)} antes de ${t0}. Los que más pesan: ${S.top.slice(0,5).map(o=>`${esc(dispName(BYCODE.get(o.code)[F.name]))} (${nf0.format(o.w*100)}${NB}%)`).join(", ")}.</li><li><b>Lo que cuenta es la comparación con los placebos</b> (líneas grises): si muchos municipios sin medida se separan tanto de su propio sintético, la separación de ${esc(lab0)} no es especial.</li><li><b>Si el ajuste previo es malo</b> (la línea granate se aleja de cero antes de la medida), el sintético no es una buena comparación.</li></ol></div>`;
    ficha(box,[["Tratado",`${esc(E.d)} ${tr.length} municipio${tr.length===1?"":"s"} con serie completa; media ponderada por población del índice (${t0-1} = 100)`],["Donantes","Los 60 municipios no afectados más parecidos antes de la medida; pesos no negativos que suman 1, por mínimos cuadrados sobre el periodo previo (Frank–Wolfe)"],["Inferencia",`Placebos en el espacio: ${S.placebos.length} donantes tratados como si fueran el afectado; p = proporción con un cociente error posterior / error previo igual o mayor`]]); },30);
}
// gráfico de la diferencia año a año con su intervalo
function gapChart(parent,G,lab){
  parent.classList.add("gapc"); const W=Math.max(300,parent.clientWidth||460), H=240, m={t:14,r:14,b:28,l:44};
  const vals=G.flatMap(g=>[g.g,...(g.ci||[])]).filter(v=>v!=null).concat([0]); let [lo,hi]=d3.extent(vals); const pad=(hi-lo)*0.12||1; lo-=pad; hi+=pad;
  const X=d3.scalePoint().domain(G.map(g=>g.k)).range([m.l+10,W-m.r-10]), Y=d3.scaleLinear().domain([lo,hi]).nice(4).range([H-m.b,m.t]);
  const svg=d3.select(parent).append("svg").attr("viewBox",`0 0 ${W} ${H}`).attr("role","img").attr("aria-label","Diferencia entre afectados y gemelos por año");
  svg.append("g").attr("class","grid").selectAll("line").data(Y.ticks(4)).join("line").attr("x1",m.l).attr("x2",W).attr("y1",Y).attr("y2",Y);
  svg.append("g").attr("class","axis").selectAll("text").data(Y.ticks(4)).join("text").attr("x",m.l-6).attr("y",v=>Y(v)+4).attr("text-anchor","end").text(v=>(v>0?"+":"")+nf1.format(v));
  svg.append("g").attr("class","axis").selectAll("text").data(G).join("text").attr("x",g=>X(g.k)).attr("y",H-8).attr("text-anchor","middle").text(g=>lab(g.k));
  svg.append("line").attr("x1",m.l).attr("x2",W).attr("y1",Y(0)).attr("y2",Y(0)).attr("stroke",css("--ink")).attr("stroke-width",1);
  const i0=G.findIndex(g=>g.k>=0); if(i0>0){ const xm=(X(G[i0-1].k)+X(G[i0].k))/2; svg.append("line").attr("x1",xm).attr("x2",xm).attr("y1",m.t).attr("y2",H-m.b).attr("stroke",css("--muted")).attr("stroke-dasharray","4 3"); svg.append("text").attr("class","lab").attr("x",xm+4).attr("y",m.t+10).style("fill",css("--muted")).text("medida →"); }
  const ok=G.filter(g=>g.ci&&g.g!=null);
  svg.append("path").attr("class","band").attr("d",d3.area().x(g=>X(g.k)).y0(g=>Y(g.ci[0])).y1(g=>Y(g.ci[1])).curve(d3.curveMonotoneX)(ok));
  svg.append("path").attr("d",d3.line().x(g=>X(g.k)).y(g=>Y(g.g)).curve(d3.curveMonotoneX)(ok)).attr("fill","none").attr("stroke",css("--rust")).attr("stroke-width",2.4);
  svg.append("g").selectAll("circle").data(ok).join("circle").attr("cx",g=>X(g.k)).attr("cy",g=>Y(g.g)).attr("r",3.6).attr("fill",css("--rust")).append("title").text(g=>`${lab(g.k)}: ${pts(g.g)} puntos [${pts(g.ci[0])}; ${pts(g.ci[1])}]`);
}

// ---------- gemelos: parejas casi iguales que solo se diferencian en x ----------
function twins(x,y,w,sign){
  const vf=vForbid(x,y), cs=["lpop","edad","renta"].filter(c=>c!==x&&c!==y&&!vf.has(c)); if(!cs.length) return null;
  const rs=rowsAll().filter(r=>exOK(r)&&(r[F.pop]||0)>=1000&&r[F[x]]!=null&&r[F[y]]!=null&&cs.every(c=>c==="lpop"||r[F[c]]!=null));
  if(rs.length<40) return null;
  const val=(r,c)=>c==="lpop"?Math.log10(r[F.pop]):r[F[c]];
  const sd={}; cs.forEach(c=>sd[c]=d3.deviation(rs,r=>val(r,c))||1); const sdx=d3.deviation(rs,r=>r[F[x]])||1;
  const cand=[];
  for(const [p,g] of d3.group(rs,r=>r[F.prov])){ for(let i=0;i<g.length;i++){ let best=null;
      for(let j=0;j<g.length;j++){ if(i===j) continue; const a=g[i], b=g[j]; if(Math.abs(a[F[x]]-b[F[x]])<0.5*sdx) continue;
        const d=Math.sqrt(d3.sum(cs,c=>((val(a,c)-val(b,c))/sd[c])**2)); if(!best||d<best.d) best={d,a,b}; }
      if(best&&best.d<=0.6) cand.push(best); } }
  cand.sort((p,q)=>p.d-q.d); const used=new Set(), pairs=[];
  for(const c of cand){ const ka=c.a[F.code], kb=c.b[F.code]; if(used.has(ka)||used.has(kb)) continue; used.add(ka); used.add(kb); const [hi,lo]=c.a[F[x]]>c.b[F[x]]?[c.a,c.b]:[c.b,c.a]; pairs.push({hi,lo,d:c.d,agree:(hi[F[y]]-lo[F[y]])*sign>0}); }
  if(!pairs.length) return {pairs,share:null,cs};
  return {pairs,share:pairs.filter(p=>p.agree).length/pairs.length,cs};
}
// provincia a provincia
function byProvince(x,y,w,sign){
  if(EX.p) return null;
  const out=[]; for(const [p,g] of d3.group(rowsAll().filter(r=>exOK(r)&&r[F[x]]!=null&&r[F[y]]!=null),r=>r[F.prov])){ if(g.length<12) continue; const c=wcorr(g.map(r=>({x:r[F[x]],y:r[F[y]],w:w?(r[F.pop]||1):1}))); if(c) out.push({p,r:c.r,ok:Math.sign(c.r)===sign&&Math.abs(c.r)>=0.1}); }
  return out.length>=8?out:null;
}
// ¿sube a escalones?
function steps(x,y,w){
  const pts=pairPts(x,y,{weighted:w}).sort((a,b)=>a.x0-b.x0), tot=d3.sum(pts,p=>p.w); if(pts.length<25) return null; let acc=0; const G=[[],[],[],[],[]];
  pts.forEach(p=>{ G[Math.min(4,Math.floor((acc+p.w/2)/tot*5))].push(p); acc+=p.w; });
  return G.filter(g=>g.length).map(g=>d3.sum(g,p=>p.w*p.y0)/d3.sum(g,p=>p.w));
}

const CZLEV=[["Se explica por otra cosa","La relación no aguanta al comparar entre iguales: lo más probable es que dependa de algo que va junto."],["Aguanta poco","Supera alguna prueba, pero no las importantes. Conviene desconfiar."],["Aguanta casi todo","Sobrevive a casi todas las explicaciones que podemos medir. Merece la pena investigarla con un antes y un después."],["Aguanta todas las pruebas","Descarta las explicaciones que hemos medido (tamaño, edad, renta, estudios, provincia), no las demás. Que aguante no la convierte en causa."]];
// ---------- pestaña «Probar causa»: qué diseños sirven para este par ----------
const czAdKey=k=>/^(renta)/.test(k)?"renta":/^(pop|lpop|varPob)/.test(k)?"pad":/^paro/.test(k)?"paro":/^(alq|ipva)/.test(k)?"ipva":/^(vt|vtp)/.test(k)?"vtp":null;
const CZSTUDY={tensionadas:"tope-cataluna",ave:"ave",vut:"prohibir-pisos-turisticos",covid:"pandemia-turismo"};
function exCausal(x,y){
  const box=document.getElementById("lbcausal"); if(!box) return;
  const w=!!EX.w, base=partialR(x,y,[],w); CZ=null; if(!base){ box.innerHTML=""; return; }
  const xl=low(labK(x)), yl=low(labK(y)), a0=Math.abs(base.r), sign=Math.sign(base.r);
  const holds=p=>p&&Math.abs(p.r)>=a0*0.5&&Math.sign(p.r)===sign;
  const how=p=>{ const a=Math.abs(p.r); if(Math.sign(p.r)!==sign&&a>=0.1) return "cambia de sentido"; if(a<0.1) return "casi desaparece"; if(a<a0*0.5) return "se debilita mucho"; if(a<a0*0.85) return "se debilita algo, pero sigue ahí"; if(a>a0*1.15) return "incluso se refuerza"; return "sigue igual"; };
  // principal sospechoso
  const vf=vForbid(x,y), cand=["lpop","edad","renta","superiores","distCosta","distCiudad","prov"].filter(c=>c!==x&&c!==y&&!vf.has(c)).map(c=>({c,p:partialR(x,y,[c],w)})).filter(o=>o.p).map(o=>({...o,drop:a0-Math.abs(o.p.r)*(Math.sign(o.p.r)===sign?1:-1)})).sort((a,b)=>b.drop-a.drop);
  const top=cand[0];
  CZ={x,y,w,base,suspect:top&&top.drop>=a0*0.15?top.c:null,solo:Object.fromEntries(cand.map(o=>[o.c,o.p.r])),lev:null};
  if(a0<0.1){ box.innerHTML=`<div class="cz"><h3>A fondo</h3><p class="intro">Aquí no hay mucho que comprobar: entre ${xl} y ${yl} la relación es casi nula (r = ${rFmt(base.r)}). Saber uno no ayuda a adivinar el otro.</p><p style="margin-top:10px;font-size:14px"><a href="/laboratorio/metodo/">Cómo se buscan causas con datos públicos →</a></p></div>`; return; }
  const others=["lpop","edad","renta"].filter(c=>c!==x&&c!==y&&!vf.has(c)), pc=others.length?partialR(x,y,others,w):null, pp=EX.p||vf.has("prov")?null:partialR(x,y,["prov"],w);
  const cx=CHG[x], cy=CHG[y], cc=cx&&cy&&cx!==cy?wcorr(pairPts(cx,cy,{weighted:w})):null;
  const TW=twins(x,y,w,sign), BP=vf.has("prov")?null:byProvince(x,y,w,sign), ST=steps(x,y,w);
  const T=[];
  T.push({k:"par",ok:holds(pc),na:!pc,t:"Entre municipios parecidos",d:pc?`Comparando municipios de ${others.map(c=>CNAME[c].replace(/^(el|la|los) /,"")).join(", ").replace(/, ([^,]*)$/," y $1")} parecidos, la relación ${how(pc)} (de ${rFmt(base.r)} a ${rFmt(pc.r)}).`:"No hay datos suficientes.",why:"Si dos cosas solo van juntas porque las dos dependen de una tercera, al comparar entre iguales la relación se esfuma."});
  const bpOk=BP?BP.filter(b=>b.ok).length:0;
  T.push({k:"prov",ok:holds(pp)&&(!BP||bpOk/BP.length>=0.5),na:!pp,t:"Dentro de cada provincia",d:EX.p?"No aplica: estás mirando una sola provincia.":vf.has("prov")?"No se puede hacer: uno de los datos ya está medido frente a la media de su provincia.":(BP?`Se cumple en <b>${bpOk} de ${BP.length}</b> provincias. `:"")+(pp?`Comparando solo dentro de la misma provincia, la relación ${how(pp)} (${rFmt(pp.r)}).`:""),why:"Así se quita lo que es común a cada zona: el clima, las leyes autonómicas, la historia o la economía de la región.",extra:BP?`<div class="czmini" id="czprov"></div>`:""});
  if(cc) T.push({k:"chg",ok:Math.sign(cc.r)===sign&&Math.abs(cc.r)>=0.1,t:"También en los cambios",d:`Comparando cambios en vez de niveles (${low(labK(cx))} frente a ${low(labK(cy))}), la relación ${Math.sign(cc.r)===sign&&Math.abs(cc.r)>=0.1?"se mantiene":"desaparece"} (r = ${rFmt(cc.r)}).`,why:"Comparar cambios en vez de niveles quita todo lo que es fijo en cada lugar."});
  else T.push({k:"chg",na:true,t:"También en los cambios",d:"No tenemos series de cambio para estos dos datos, así que esta prueba no se puede hacer.",why:"Comparar cambios en vez de niveles quita todo lo que es fijo en cada lugar."});
  if(TW&&TW.pairs.length>=15) T.push({k:"tw",ok:TW.share>=0.6,t:"Municipios gemelos",d:`En <b>${nf0.format(TW.share*10)} de cada 10</b> parejas de gemelos (${nf0.format(TW.pairs.length)} parejas), el que tiene más ${xl} tiene ${sign>0?"más":"menos"} ${yl}.`,why:"Es la comparación más limpia: dos pueblos de la misma provincia casi iguales en todo menos en una cosa."});
  else T.push({k:"tw",na:true,t:"Municipios gemelos",d:"No hay suficientes parejas de gemelos para esta selección.",why:"Es la comparación más limpia: dos pueblos casi iguales en todo menos en una cosa."});
  if(ST&&ST.length===5){ const up=d3.range(4).filter(i=>(ST[i+1]-ST[i])*sign>0).length; T.push({k:"st",ok:up>=3,t:"Sube de forma ordenada",d:`De un grupo al siguiente, ${yl} va en la dirección esperada en <b>${up} de 4</b> escalones.`,why:"Si «cuanto más, más» se cumple de forma ordenada, y no solo en los extremos, la pista es más creíble.",extra:miniBars(ST.map((v,i)=>[v,i===0||i===4?"--rust":"--stone"]),{h:34})}); }
  const done=T.filter(t=>!t.na), passed=done.filter(t=>t.ok).length, frac=done.length?passed/done.length:0;
  const lev=frac<0.3?0:frac<0.55?1:frac<0.85?2:3;
  const sus=!CZ.suspect?`Ninguno de las explicaciones de siempre (tamaño, edad, renta, estudios, distancia al mar o a una ciudad, o provincia) cambia mucho la relación por sí solo.`
    :top.c==="prov"?`<b>La provincia.</b> Comparando solo municipios de la misma provincia, la relación pasa de ${rFmt(base.r)} a ${rFmt(top.p.r)}. Buena parte es la diferencia entre unas zonas de España y otras.`
    :`<b>${cap(CNAME[top.c])}.</b> Comparando municipios con ${CNAME[top.c].replace(/^(el|la|los) /,"")} parecid${/^la /.test(CNAME[top.c])?"a":/^los /.test(CNAME[top.c])?"os":"o"}, la relación pasa de ${rFmt(base.r)} a ${rFmt(top.p.r)}. Puede que ${CNAME[top.c]} influya a la vez en ${xl} y en ${yl}.`;
  const em=t=>t.na?"⚪":t.ok?"✅":"❌";
  const ex=!TW||!TW.pairs.length?[]:(()=>{ const nOk=Math.round(TW.share*4), a=TW.pairs.filter(p=>p.agree).slice(0,nOk), b=TW.pairs.filter(p=>!p.agree).slice(0,4-nOk); return [...a,...b].slice(0,4); })();
  const fx=fmtK(x), fy=fmtK(y), evs=Object.keys(ADEV).filter(k=>!ADEV[k].free&&[czAdKey(x),czAdKey(y)].includes(ADEV[k].y));
  // veredicto arriba; una línea por prueba; el porqué, los gemelos y el mapa, plegados
  const twinsH=ex.length?`<div class="twins"><h4>Algunas parejas de gemelos</h4><p class="muted">Misma provincia y parecidos en ${TW.cs.map(c=>CNAME[c].replace(/^(el|la|los) /,"")).join(", ").replace(/, ([^,]*)$/," y $1")}, pero que se diferencian en ${xl}.</p><ul>${ex.map(p=>`<li><span class="${p.agree?"ok":"ko"}" aria-hidden="true">${p.agree?"✓":"✗"}</span><span><a href="#m${p.hi[F.code]}">${esc(dispName(p.hi[F.name]))}</a> <small>${fx(p.hi[F[x]])} · ${fy(p.hi[F[y]])}</small></span><span class="vs">frente a</span><span><a href="#m${p.lo[F.code]}">${esc(dispName(p.lo[F.name]))}</a> <small>${fx(p.lo[F[x]])} · ${fy(p.lo[F[y]])}</small></span><a class="gol" href="#comparar-${p.hi[F.code]}-${p.lo[F.code]}">Comparar →</a></li>`).join("")}</ul></div>`:"";
  CZ.lev=lev; CZ.passed=passed; CZ.total=done.length;
  const cx2=CHG[x], cy2=CHG[y];
  box.innerHTML=`<div class="cz"><h3>¿Podría ser una causa?</h3>
    <p class="czlead">Que dos datos vayan juntos no prueba que uno cause el otro. Esto es lo que se puede comprobar con ${xl} y ${yl}, de menos a más exigente.</p>
    <div class="meter" role="img" aria-label="Nivel: ${CZLEV[lev][0]}"><div class="track">${[0,1,2,3].map(i=>`<span class="${i<=lev?"on l"+lev:""}"></span>`).join("")}</div><div class="labs">${CZLEV.map((l,i)=>i===lev?`<b>${l[0]}</b>`:`<span>${l[0]}</span>`).join("")}</div></div>
    <div class="verdict">${CZLEV[lev][0]}<small>${CZLEV[lev][1]}</small></div>
    <details class="czd"><summary><span class="czdt">Comparar entre municipios</span><span class="czp ${passed>=done.length-1&&done.length?"ok":"no"}">Supera ${passed} de ${done.length}</span></summary><div class="czdb">
    <p class="czn">Supera <b>${passed} de ${done.length}</b> pruebas${done.length<T.length?` <span class="muted">(${T.length-done.length} no se pueden hacer con estos datos)</span>`:""}:</p>
    <ul class="tests">${T.map(t=>`<li class="${t.na?"na":t.ok?"ok":"ko"}"><span class="em" aria-hidden="true">${em(t)}</span><span><b>${t.t}.</b> ${t.d}</span></li>`).join("")}</ul>
    <div class="suspect"><span class="tag">Principal sospechoso</span>${sus}</div>
    <p class="czact">Más pruebas: ${cx2&&cy2&&cx2!==cy2?`<button type="button" class="ctag" data-a="chg">📈 Mirar los cambios, no los niveles</button> `:""}<button type="button" class="ctag" data-a="big" aria-pressed="${EX.t==="g10"}">Solo municipios de más de 10.000 hab.</button></p>
    <details class="czmore"><summary>Por qué importa cada prueba${ex.length?", parejas de gemelos":""}${BP?" y mapa por provincias":""}</summary>
      <dl class="czwhy">${T.map(t=>`<dt>${em(t)} ${t.t}</dt><dd>${t.why}${t.extra&&!t.na?t.extra:""}</dd>`).join("")}</dl>${twinsH}</details>
    </div></details>
    <div class="czd"><h4><span class="czdt">Antes y después</span><span class="czp ${evs.length?"ok":"no"}">${evs.length?"Hay un estudio":"Sin estudio"}</span></h4>${evs.length?`<p>Un estudio de Indicio lo mide con un suceso real: ${evs.map(k=>`<a href="/preguntas/${CZSTUDY[k]}/">${ADEV[k].l}</a>`).join("; ")}.</p>`:`<p>Ningún estudio de Indicio mide estos dos datos con un suceso real. Los que hay: ${Object.keys(CZSTUDY).map(k=>`<a href="/preguntas/${CZSTUDY[k]}/">${ADEV[k].l.replace(/ \(.*$/,"")}</a>`).join(", ")}.</p>`}</div>
    <p class="czmut">Otros diseños, como un umbral o corte, todavía no están disponibles.</p>
    <details class="czd"><summary><span class="czdt">Qué tendría que ser cierto para que fuera causa</span></summary><div class="czdb"><ol>
      <li><b>Que nada que no hemos medido mueva a la vez</b> ${xl} y ${yl}. Aquí solo se pueden descontar el tamaño, la edad, la renta, los estudios y la provincia; todo lo demás (historia, clima, carreteras, decisiones políticas) sigue dentro.</li>
      <li><b>Que no vaya al revés.</b> ↺ Quizá no es ${xl} lo que mueve ${yl}, sino ${yl} lo que atrae ${xl}. Con datos de un solo momento no se puede saber: hace falta ver qué cambió antes.</li>
      <li><b>Que lo que vale para municipios valga para personas,</b> si la pregunta es sobre personas. Que los municipios con más de algo tengan más de otra cosa no dice que cada vecino sea así.</li>
      <li><b>Que los controles no estropeen la comparación.</b> Descontar algo que está en medio del camino o que es consecuencia puede borrar o inventar una relación. <a href="/laboratorio/metodo/#controles">Cómo elegirlos →</a></li></ol></div></details>
    <p style="margin-top:14px;font-size:14px"><a href="/laboratorio/metodo/">Guía: de la relación a la causa →</a> · <a href="/preguntas/">Mira cómo se hace en un análisis de verdad →</a></p></div>`;
  const chb=box.querySelector('[data-a="chg"]'); if(chb) chb.addEventListener("click",()=>{ EX.d=[cx2,cy2,...EX.d.slice(2).filter(k=>k!==cx2&&k!==cy2)]; EX.c=[]; exUpdate(); });
  box.querySelector('[data-a="big"]').addEventListener("click",()=>{ EX.t=EX.t==="g10"?"":"g10"; exUpdate(); });
  if(BP) loadTopo().then(()=>{ const bx=document.getElementById("czprov"); if(!bx) return; const ok=new Map(BP.map(b=>[b.p,b.ok]));
    const pv=topojson.feature(TOPO,TOPO.objects.provinces); pv.features.forEach(rewind);
    const proj=d3.geoConicConformalSpain().fitSize([220,170],pv), path=d3.geoPath(proj);
    const s=d3.select(bx).append("svg").attr("viewBox","0 0 220 170").attr("aria-hidden","true");
    s.selectAll("path").data(pv.features).join("path").attr("d",path).attr("stroke",css("--card")).attr("stroke-width",.6).attr("fill",f=>{ const k=String(f.id).padStart(2,"0").slice(0,2); return ok.has(k)?(ok.get(k)?css("--ok"):css("--rule-2")):css("--band"); });
    bx.insertAdjacentHTML("beforeend",`<div class="muted" style="font-size:12px">En verde, provincias donde se cumple; en gris, donde no.</div>`); }).catch(()=>{});
}
// =====================================================================
// MÁS ESTUDIOS: convergencia de la renta, pandemia y turismo, qué hace crecer a un pueblo
// =====================================================================

// datos derivados que necesitan los estudios y el laboratorio
function derive(){
  if(F.renta15==null&&F.renta!=null&&F.rentaVar!=null){ const i=Object.keys(F).length; F.renta15=i;
    rowsAll().forEach(r=>{ r[i]=r[F.renta]!=null&&r[F.rentaVar]!=null?Math.round(r[F.renta]/(1+r[F.rentaVar]/100)):null; });
    const c={k:"renta15",l:"Renta por persona en 2015",g:"Riqueza",f:"eur",src:"INE, Atlas de Distribución de Renta, 2015"}; const j=CAT.findIndex(x=>x.k==="rentaVar"); CAT.splice(j<0?CAT.length:j,0,c); CATK.renta15=c; }
}
const wq=(rows,v,p)=>{ const s=rows.filter(r=>v(r)!=null&&r[F.pop]).sort((a,b)=>v(a)-v(b)), t=d3.sum(s,r=>r[F.pop]); let a=0; for(const r of s){ a+=r[F.pop]; if(a>=p*t) return v(r); } return null; };
const withEXF=(f,fn)=>{ const old=EXF; EXF=f; try{ return fn(); } finally{ EXF=old; } };

// ---------- convergencia ----------
function studyConv(B){
  const AB=abstract(B);
  const rows=rowsAll().filter(r=>r[F.renta15]!=null&&r[F.renta]!=null&&(r[F.pop]||0)>=1000);
  const q=(k,p)=>wq(rows,r=>r[F[k]],p);
  const r90a=q("renta15",.9)/q("renta15",.1), r90b=q("renta",.9)/q("renta",.1);
  const EF={prov:"",min:1000,max:Infinity};
  const c=withEXF(EF,()=>partialRCI("renta15","rentaVar",[],true)), cp=withEXF(EF,()=>partialRCI("renta15","rentaVar",["prov"],true));
  const cl=withEXF(EF,()=>partialRCI("renta15","rentaVar1724",[],true)), clp=withEXF(EF,()=>partialRCI("renta15","rentaVar1724",["prov"],true));
  const s=rows.slice().sort((a,b)=>a[F.renta15]-b[F.renta15]), tot=d3.sum(s,r=>r[F.pop]); let acc=0; const G=[[],[],[],[],[]];
  s.forEach(r=>{ G[Math.min(4,Math.floor((acc+r[F.pop]/2)/tot*5))].push(r); acc+=r[F.pop]; });
  const gv=G.map(g=>d3.sum(g,r=>r[F.rentaVar]*r[F.pop])/d3.sum(g,r=>r[F.pop]));
  // β-convergencia: crecimiento anual (log) frente al log de la renta inicial; velocidad y vida media
  const Yr=SER.years, iy=y=>Yr.indexOf(y), ser_=r=>{ const sr=SBY.get(r[F.code]); return sr&&sr[SF.renta]; };
  const full=rows.filter(r=>{ const v=ser_(r); return v&&Yr.every((y,i)=>v[i]>0); });
  const beta=(y0,y1,fe,base2=false)=>regFn(full,{x:r=>{ const v=ser_(r); return Math.log(base2?(v[iy(y0)]+v[iy(y0+1)])/2:v[iy(y0)]); },y:r=>{ const v=ser_(r); return Math.log(v[iy(y1)]/v[iy(y0+(base2?2:0))])/(y1-y0-(base2?2:0))*100; },fe,w:r=>r[F.pop]});
  const b0=beta(2015,2024,false), b1=beta(2015,2024,true), b2=beta(2015,2024,false,true), b3=beta(2015,2024,true,true);
  const speed=b=>b&&b.b<0?-Math.log(1+b.b/100*9)/9:null, half=b=>{ const l=speed(b); return l?Math.log(2)/l:null; };
  // σ-convergencia municipal y descomposición de Theil (entre provincias / dentro de provincias)
  const sig=Yr.map((y,i)=>{ const pts=full.map(r=>({y:ser_(r)[i],w:r[F.pop],p:r[F.prov]})); const W=d3.sum(pts,o=>o.w), mu=d3.sum(pts,o=>o.w*o.y)/W;
    const cv=Math.sqrt(d3.sum(pts,o=>o.w*(o.y-mu)**2)/W)/mu*100, Y_=d3.sum(pts,o=>o.w*o.y);
    const T=d3.sum(pts,o=>o.w*o.y/Y_*Math.log(o.y/mu)); let between=0; for(const [p,g] of d3.group(pts,o=>o.p)){ const Wg=d3.sum(g,o=>o.w), Yg=d3.sum(g,o=>o.w*o.y), mg=Yg/Wg; between+=Yg/Y_*Math.log(mg/mu); }
    return {cv,T:T*100,between:between*100,within:(T-between)*100}; });
  const sh=v=>v.between/v.T*100;

  sec(B,"ctx",`<p>España es un país de rentas muy distintas. En 2015, el municipio que marcaba el 10${NB}% más rico ingresaba por persona ${nf1.format(r90a)} veces lo que el que marcaba el 10${NB}% más pobre. Esa distancia separa vidas muy diferentes: qué se puede pagar, qué servicios se sostienen, quién se queda y quién se va.</p>
    <p>Desde entonces la renta ha subido en casi todas partes. La pregunta es si ha subido igual o si los lugares que partían de abajo han ido más deprisa. Los economistas lo llaman <b>convergencia</b>, y es una de las cuestiones clásicas de la economía regional: si existe, el tiempo tiende a cerrar las brechas; si no, las desigualdades se perpetúan.</p>
    <p>Buena parte de la política pública, el salario mínimo, las pensiones, las prestaciones, redistribuye renta entre territorios aunque no se diseñe para eso. Saber si los municipios pobres se acercan a los ricos es una forma de medir si ese conjunto de políticas, junto con el mercado, está cerrando o abriendo la brecha. Y saber de dónde sale el dinero, si del trabajo o de las transferencias, es lo que más interesa al debate político: cada bando tiene su respuesta favorita.</p>`);
  sec(B,"int",`<p>No hay una intervención: es una pregunta descriptiva sobre ${nf0.format(rows.length)} municipios de 1.000 habitantes o más, con la renta neta media por persona del Atlas de Renta del INE de 2015 a 2024. Para saber de dónde ha salido el aumento, se reparte la renta entre cinco fuentes (salarios, pensiones, prestaciones por desempleo, otras prestaciones y otros ingresos) y se buscan tres medidas con fecha: la subida del salario mínimo de 2019, las prestaciones de 2020 (ERTE, paro e Ingreso Mínimo Vital) y la revalorización de las pensiones con el IPC en 2023 (8,5${NB}%).</p>`,{title:"Con qué datos"});
  sec(B,"ana",`<p>Las dos medidas estándar de convergencia, que no son lo mismo:</p><ul class="defs"><li><b>Convergencia β (¿crecen más los de abajo?).</b> Regresión del crecimiento anual de la renta sobre su nivel inicial, en logaritmos. Un coeficiente negativo indica que los pobres crecen más deprisa; de él sale la <b>velocidad de convergencia</b> y la <b>vida media</b>, los años que tardaría en cerrarse la mitad de la distancia. Como el nivel inicial aparece en los dos lados, se corrige la regresión a la media usando como nivel inicial la media de 2015 y 2016 y midiendo el crecimiento desde 2017.</li>
    <li><b>Convergencia σ (¿se estrecha la distancia?).</b> La dispersión de la renta entre municipios año a año (coeficiente de variación y P90/P10) y el índice de Theil, que se puede repartir en desigualdad <i>entre</i> provincias y <i>dentro</i> de cada provincia.</li></ul>
    <p>Después, <b>de dónde sale el dinero</b>: la convergencia β se reparte exactamente entre las cinco fuentes de renta del Atlas, y para cada medida con fecha se mira si el salto de <i>esa</i> fuente en <i>ese</i> año fue mayor donde más expuestos estaban que en los otros años (que sirven de placebo).</p>`);
  const s1=res(B,`Los municipios que partían de abajo crecieron más: ${sgn(gv[0])} frente a ${sgn(gv[4])}`,`<p>Cada punto es un municipio. ${c?corrSentence(c.r,"renta en 2015","subida de la renta"):""} (${rCI(c)}).</p>`);
  scatter(s1,{x:"renta15",y:"rentaVar",minPop:1000,title:"Renta por persona en 2015 y subida hasta 2024",source:"Fuente: INE, Atlas de Distribución de Renta de los Hogares.",hideSay:true});
  const f=fig(s1,{title:"Subida de la renta 2015–2024, según la renta de partida",source:"Cinco grupos con la misma población, de menos a más renta en 2015. Medias ponderadas por población."});
  hbars(f.body,["20 % más pobre en 2015","Segundo 20 %","20 % central","Cuarto 20 %","20 % más rico en 2015"].map((l,i)=>({l,v:gv[i]})),{fmt:sgn,color:"--rust",min:0}); f.body.querySelectorAll(".hb").forEach(h=>h.style.gridTemplateColumns="minmax(150px,210px) minmax(0,1fr) 70px");
  lect(s1,`<p>Las barras cuentan la historia mejor que cualquier coeficiente. El 20${NB}% de la población que vivía en los municipios más pobres en 2015 vio subir su renta media un ${nf0.format(gv[0])}${NB}% hasta 2024; el 20${NB}% que vivía en los más ricos, un ${nf0.format(gv[4])}${NB}%. Y entre medias, una escalera casi perfecta: cuanto más abajo se partía, más se ha crecido.</p><p>Pero hay que desconfiar de esta imagen tan limpia, porque parte de ella puede ser un espejismo estadístico. Lo explica la sección siguiente.</p>`);
  const s2=res(B,half(b2)?`A este ritmo, la mitad de la distancia se cerraría en unos ${nf0.format(half(b2))} años`:"Convergencia β",`<p>Coeficiente β: puntos de crecimiento anual de la renta por cada 1 % más de renta inicial (en logaritmos, ×100). La corrección de la regresión a la media reduce el coeficiente, como era de esperar, pero no lo elimina.</p>`);
  table(s2,["Especificación","β (×100)","Velocidad anual","Vida media"],[["Simple, 2015–2024",b0],["Dentro de cada provincia, 2015–2024",b1],["Corrigiendo la regresión a la media (base 2015–16, crecimiento 2017–2024)",b2],["… y dentro de cada provincia",b3]].map(([l,b])=>[l,b?`<b>${sg2(b.b)}</b>${ciPts(b.ci,sg2)}`:"—",speed(b)?pc(speed(b)*100):"—",half(b)?`${nf0.format(half(b))} años`:"—"]));
  add(s2,"p","muted",`${nf0.format(full.length)} municipios con serie completa, ponderados por población. Como referencia, la literatura sobre regiones europeas encuentra velocidades en torno al 2${NB}% anual (vida media de unos 35 años).`).style.cssText="font-size:13.5px;margin-top:6px";
  lect(s2,`<p>El espejismo se llama <b>regresión a la media</b>. Si un municipio tuvo un 2015 anormalmente malo (un cierre, un error en los datos), parecerá «pobre» ese año y «crecerá» después aunque no cambie nada. Eso crea una convergencia falsa. Para quitarla, se usa como punto de partida la media de 2015 y 2016 y se mide el crecimiento solo desde 2017: así un año raro no aparece en los dos lados de la cuenta.</p><p>Con esa corrección, el coeficiente apenas cambia (${b2?sg2(b2.b):"—"} frente a ${b0?sg2(b0.b):"—"}): la convergencia es real. A su ritmo, la mitad de la distancia entre dos municipios se cerraría en unos ${half(b2)?nf0.format(half(b2)):"—"} años${half(b3)?`, o ${nf0.format(half(b3))} si se compara solo dentro de cada provincia`:""}. Es una velocidad parecida a la que la literatura encuentra entre regiones europeas: lenta, pero constante.</p>`);
  const s3=res(B,`La dispersión ha bajado: el P90/P10 pasa de ${nf1.format(r90a)} a ${nf1.format(r90b)} veces`,`<p>Convergencia σ entre municipios, año a año, y el reparto de la desigualdad (índice de Theil) entre la que hay entre provincias y la que hay dentro de cada una. En 2015 la parte entre provincias era el ${pc0(sh(sig[0]))} del total; en 2024, el ${pc0(sh(sig[sig.length-1]))}.</p>`);
  const g3=add(s3,"div","cols2");
  lineChart(g3,{title:"Dispersión de la renta entre municipios",sub:"Coeficiente de variación, % de la media",source:"Ponderado por población. Fuente: INE, Atlas de Renta.",series:[{n:"Municipios",v:sig.map(v=>v.cv),c:"--slate",main:true}],years:Yr,xticks:[2015,2019,2024],fmt:v=>nf1.format(v)+NB+"%",tickFmt:v=>nf0.format(v)+"%",height:220});
  lineChart(g3,{title:"Desigualdad entre municipios (Theil × 100)",sub:"Total, entre provincias y dentro de cada provincia",source:"La suma de las dos partes es el total.",series:[{n:"Total",v:sig.map(v=>v.T),c:"--ink",main:true},{n:"Entre provincias",v:sig.map(v=>v.between),c:"--rust"},{n:"Dentro de provincias",v:sig.map(v=>v.within),c:"--mustard"}],years:Yr,xticks:[2015,2019,2024],fmt:v=>nf2.format(v),tickFmt:v=>nf1.format(v),height:220});
  lect(s3,`<p>Que los pobres crezcan más no garantiza que la distancia total se reduzca: algunos pueden adelantar a otros sin que el reparto cambie. Por eso se mide también la dispersión, y ha bajado: el coeficiente de variación pasa del ${nf1.format(sig[0].cv)}${NB}% al ${nf1.format(sig[sig.length-1].cv)}${NB}%.</p><p>El índice de Theil permite algo más: separar cuánta desigualdad hay <i>entre</i> provincias (Madrid frente a Badajoz) y cuánta <i>dentro</i> de cada una (el centro de una provincia frente a sus pueblos). La parte entre provincias era el ${pc0(sh(sig[0]))} en 2015 y es el ${pc0(sh(sig[sig.length-1]))} en 2024: la brecha territorial grande sigue siendo la principal, ${sig[sig.length-1].between<sig[0].between?"pero es la que más se ha reducido":"y no es la que más se ha reducido"}.</p>`);
  { const spd=v=>Math.round((v||0.01)*1000)/10, v1=spd(speed(b2)), v0=Math.min(6,spd(speed(b0))), v2=2;
    const sg=res(B,"Entre el blanco y el negro: ¿cuándo se acercarían los municipios pobres a los ricos?",`<p>La distancia se está cerrando, pero el ritmo es lo que decide si hablamos de una generación o de dos siglos. Elige la velocidad a la que se cierra la brecha y mira dónde estaría el municipio rico frente al pobre.</p>`);
    playBox(sg,{defs:[["v","Velocidad a la que se cierra la brecha",0,6,0.1,"% de la brecha que se cierra cada año. Con 0 no hay convergencia.",x=>nf1.format(x)+NB+"%"],["t","Dentro de cuántos años",5,100,5,"Desde 2024.",x=>x+" años"]],
      pre:[["Ritmo medido, corrigiendo la regresión a la media",{v:v1,t:25}],["Ritmo medido sin corregir",{v:v0,t:25}],["Como las regiones europeas (2 %)",{v:v2,t:50}]],
      render:st=>{ const lam=st.v/100, f=Math.exp(-lam*st.t), ratio=Math.exp(Math.log(r90b)*f), cerrada=(1-f)*100, mitad=lam>0?Math.log(2)/lam:null;
        return `<div class="big">${nf1.format(ratio)} <span class="muted" style="font-size:16px;font-weight:400">veces: lo que ingresa el 10 % más rico por cada euro del 10 % más pobre (hoy, ${nf1.format(r90b)})</span></div>
          <p>Dentro de ${st.t} años se habría cerrado el <b>${nf0.format(cerrada)}${NB}%</b> de la brecha.${mitad?` A este ritmo la mitad tarda <b>${nf0.format(mitad)} años</b>.`:" Con velocidad cero, la brecha no se cierra."}</p>
          <p class="muted" style="font-size:14px">Una proyección de ritmo constante, no una previsión: la velocidad cambia con la economía y con quién vive en cada sitio.</p>`; }});
    lect(sg,`<p>Según el ritmo que se tome, la mitad de la brecha se cierra en unas pocas décadas o en bastantes más. Converge; cuánto tarda depende de que el ritmo se mantenga, y eso no lo garantizan los datos.</p>`); }
  const FR=fuentesRes(B), {BK,BT,shr,hit,miss}=FR;
  const nl=h=>h.n.toLowerCase().replace(/\bipc\b/,"IPC");
  sec(B,"con",`<p><b>${gv[0]>gv[4]+2?"Hay convergencia, no es un espejismo estadístico, y la ha empujado sobre todo el trabajo":"La convergencia es débil"}:</b> los municipios que partían de abajo crecieron más, la relación sobrevive a la corrección de la regresión a la media (β = ${b2?sg2(b2.b):"—"}${b3?`; ${sg2(b3.b)} dentro de cada provincia`:""}) y la dispersión ha bajado. ${sig[sig.length-1].between<sig[0].between?"La desigualdad entre provincias se ha reducido más que la de dentro de cada provincia.":"La desigualdad dentro de las provincias ha bajado más que la que hay entre ellas."}</p>
    <p>${BT&&BK[0]&&BK[0].b/BT.b>0.5?`Los salarios explican el ${pc0(shr(0))} de esa convergencia; las pensiones y otras prestaciones, el ${pc0(shr(1)+shr(2)+shr(3))}, y los otros ingresos restan un ${pc0(Math.abs(shr(4)))} (las partes suman 100${NB}% con su signo). Las pensiones y las prestaciones son una parte muy grande de la renta de los municipios pobres, pero han crecido en proporción parecida en todas partes; lo que ha crecido más deprisa donde la renta era baja son los salarios.`:"La convergencia viene sobre todo de transferencias."} ${hit.length?`Dejan huella en su año: ${hit.map(nl).join("; ")}.`:"Ninguna de las tres medidas con fecha deja una huella clara."} ${miss.length?`${cap(miss.map(nl).join("; "))}: ${miss.length>1?"no destacan":"no destaca"} frente a los otros años, porque la medida afectó a casi todos por igual o se mezcló con otras cosas.`:""}</p>
    <p>El salario mínimo ocupa un lugar especial: es una política, pero actúa a través de los salarios. Parte de lo que aquí aparece como «trabajo» es, por tanto, también política. Es una buena noticia con letra pequeña: la brecha entre los lugares ricos y pobres se está cerrando, y no por un artefacto estadístico, pero al ritmo actual harían falta décadas para cerrarla, y convergencia no quiere decir que los pobres vivan bien, sino algo menos mal en relación con los ricos.</p>
    <ul class="defs"><li><b>La renta de un municipio cambia también porque cambia quién vive en él.</b> Si se van los jóvenes y quedan pensionistas, la renta por persona puede subir sin que nadie gane más.</li>
    <li><b>Es renta declarada,</b> sin economía sumergida ni rentas exentas, en euros corrientes (la inflación no cambia las comparaciones relativas). «Otros ingresos» mezcla capital y actividades por cuenta propia.</li>
    <li><b>El Atlas de 2024 todavía no trae el reparto por fuentes,</b> así que esa parte llega hasta 2023.</li>
    <li><b>Las huellas de las medidas son saltos de un año concreto en una fuente concreta,</b> lo más parecido a una prueba que permiten estos datos; no prueban la causa.</li></ul>
    <p style="margin-top:10px">${exLink("cruce",{d:["renta15","rentaVar"],t:"g1",c:[]},"Ponlo a prueba en el laboratorio")}</p>`);
  AB.fill({ctx:"Si los lugares pobres crecen más deprisa que los ricos, la distancia se estrecha: es la convergencia, y importa mucho para la política territorial.",intT:"Con qué datos",int:`Renta neta por persona de ${nf0.format(rows.length)} municipios de 1.000 habitantes o más, 2015–2024 (Atlas de Renta del INE).`,ana:"Convergencia β (regresión del crecimiento sobre el nivel inicial, corrigiendo la regresión a la media) y σ (dispersión y descomposición de Theil entre y dentro de provincias).",res:`El 20 % más pobre creció un ${nf0.format(gv[0])} % y el más rico un ${nf0.format(gv[4])} %; β corregido = ${b2?sg2(b2.b):"—"}${half(b2)?`, vida media de unos ${nf0.format(half(b2))} años`:""}; el P90/P10 baja de ${nf1.format(r90a)} a ${nf1.format(r90b)}.`,con:`Hay convergencia real y lenta, y viene sobre todo de los salarios (${pc0(shr(0))}); las pensiones y prestaciones, el ${pc0(shr(1)+shr(2)+shr(3))}; los otros ingresos restan un ${pc0(Math.abs(shr(4)))}.`});
  methods(B,[["Qué se hace","Se mira si los municipios que partían con menos renta en 2015 han crecido más hasta 2024, corrigiendo el espejismo de la regresión a la media, y si la distancia entre ricos y pobres se ha estrechado, separando la que hay entre provincias de la que hay dentro de cada una."],["Datos","INE, Atlas de Distribución de Renta de los Hogares, renta neta media por persona, 2015–2024 (2015–2023 vía ineAtlas.data)."],["Muestra",`${nf0.format(rows.length)} municipios de 1.000 habitantes o más; ${nf0.format(full.length)} con serie completa para β y σ.`],["Convergencia β","MCO ponderado por población de g = 100 × ln(y₁/y₀)/T sobre ln(y₀); con y sin efectos fijos de provincia. Velocidad λ = −ln(1 + β·T/100)/T; vida media = ln 2 / λ. Corrección de la regresión a la media: y₀ = media de 2015 y 2016 y crecimiento medido desde 2017 (así el error de medida de y₀ no entra en g)."],["Convergencia σ","Coeficiente de variación ponderado por población; P90/P10 de población; índice de Theil (T) y su descomposición exacta en entre provincias Σ s_g ln(μ_g/μ) y dentro Σ s_g T_g."],["Renta por fuentes","Renta neta media por persona del Atlas multiplicada por el % de cada fuente (salarios, pensiones, prestaciones por desempleo, otras prestaciones, otros ingresos) = euros por persona y fuente, 2015–2023. Descomposición de β: g_k = (euros de k en 2023 − en 2015) / renta de 2015 × 100; MCO ponderado de g_k sobre ln(renta de 2015) con efectos fijos de provincia; las pendientes suman la del crecimiento total."],["Medidas con fecha","Salario mínimo 2019: exposición = renta de 2018 (negativa); prestaciones 2020: renta de 2019 (negativa); pensiones 2023: peso de las pensiones en 2022. Resultado: salto de la fuente en el año, en % de la renta del año anterior; relación dentro de cada provincia, ponderada por población. Placebo: los demás años 2016–2023."],["Inferencia","Intervalos del 95 % por remuestreo de municipios (200 réplicas). "+FICHA_R]]);
}

// ---------- pandemia y turismo ----------
function studyCovid(B){
  const AB=abstract(B);
  const P=Object.keys(REFS.paro.prov).filter(p=>REFS.prov[p]&&REFS.prov[p].vtp&&REFS.paro.prov[p].paro&&!["51","52"].includes(p));
  const vt=p=>REFS.prov[p].vtp[0], PY=REFS.paroYears, i17=PY.indexOf(2017), i19=PY.indexOf(2019), i20=PY.indexOf(2020), i23=PY.indexOf(2023);
  const ranked=P.slice().sort((a,b)=>vt(b)-vt(a)), TUR=ranked.slice(0,10), REST=ranked.slice(10);
  const sumP=(g,i)=>d3.sum(g,p=>REFS.paro.prov[p].paro[i]);
  const idx=g=>PY.map((y,i)=>sumP(g,i)/sumP(g,i19)*100);
  const jT=(sumP(TUR,i20)/sumP(TUR,i19)-1)*100, jR=(sumP(REST,i20)/sumP(REST,i19)-1)*100;
  const rT=(sumP(TUR,i23)/sumP(TUR,i19)-1)*100, rR=(sumP(REST,i23)/sumP(REST,i19)-1)*100;
  // tendencia previa 2017–2019 (cambio anual medio) y DiD descontándola
  const trend=g=>((sumP(g,i19)/sumP(g,i17))**(1/2)-1)*100;
  const tT=trend(TUR), tR=trend(REST), didRaw=jT-jR, didTrend=(jT-tT)-(jR-tR);
  const pw=p=>{ const a=REFS.prov[p].pad; return a[a.length-1]; }, y19=YEARS.indexOf(2019), y20=YEARS.indexOf(2020);
  const rch=g=>d3.sum(g,p=>(REFS.prov[p].net_income_pc[y20]/REFS.prov[p].net_income_pc[y19]-1)*100*pw(p))/d3.sum(g,pw);
  const iT=rch(TUR), iR=rch(REST);
  const jump=p=>(REFS.paro.prov[p].paro[i20]/REFS.paro.prov[p].paro[i19]-1)*100;
  const c=wcorr(P.map(p=>({x:vt(p),y:jump(p),w:pw(p)})));
  // placebo: 10 provincias al azar en vez de las 10 más turísticas (distribución de la diferencia)
  const R=rng(11), plac=[]; for(let b=0;b<300;b++){ const sh=P.slice(); for(let i=sh.length-1;i>0;i--){ const j=(R()*(i+1))|0; [sh[i],sh[j]]=[sh[j],sh[i]]; } const A=sh.slice(0,10), Bq=sh.slice(10); plac.push({n:"azar",v:(sumP(A,i20)/sumP(A,i19)-sumP(Bq,i20)/sumP(Bq,i19))*100}); }
  const pr=placeboRank(didRaw,plac.map(x=>x.v));
  // ERTE: trabajadores en ERTE a 30 de abril de 2020 por cada 100 afiliados (afiliados: suma municipal de afiliados por habitante × población)
  const afil=p=>{ const a=REFS.prov[p]&&REFS.prov[p].pad; return a?a[REFS.padYears.indexOf(2020)]:0; }; // habitantes en 2020
  const erte=EXT.erte&&EXT.erte.prov, ertePct=p=>erte&&erte[p]&&afil(p)?erte[p]/afil(p)*100:null;
  const eT=d3.sum(TUR,p=>erte[p]||0)/d3.sum(TUR,afil)*100, eR=d3.sum(REST,p=>erte[p]||0)/d3.sum(REST,afil)*100;
  const ce=wcorr(P.map(p=>({x:vt(p),y:ertePct(p),w:pw(p)})).filter(o=>o.y!=null));
  // municipios: dosis-respuesta con los 8.139
  const EF={prov:"",min:1000,max:Infinity};
  const m0=withEXF(EF,()=>partialRCI("vtp20","paroVar1920",[],true)), m1=withEXF(EF,()=>partialRCI("vtp20","paroVar1920",["lpop20","renta19","paroReg19","prov"],true));
  const mrows=withEXF(EF,()=>rowsAll().filter(r=>exOK(r)&&r[F.vtp20]!=null&&r[F.paroVar1920]!=null&&r[F.pop]));
  const qs=[0,.5,.8,.9,.97,1], cuts=qs.map(q=>wq(mrows,r=>r[F.vtp20],q));
  const bins=[["Mitad con menos pisos turísticos",0,1],["Del 50 al 80 %",1,2],["Del 80 al 90 %",2,3],["Del 90 al 97 %",3,4],["3 % más turístico",4,5]].map(([l,a,b])=>{ const s=mrows.filter(r=>r[F.vtp20]>=cuts[a]&&(b===5?true:r[F.vtp20]<cuts[b])); return {l,n:s.length,v:d3.sum(s,r=>r[F.paroVar1920]*r[F.pop])/d3.sum(s,r=>r[F.pop]),vt:d3.sum(s,r=>r[F.vtp20]*r[F.pop])/d3.sum(s,r=>r[F.pop])}; });
  const nm=p=>provShort(PROVS[p]);
  // estudio de eventos municipal: pendiente del índice de paro (2019 = 100) sobre el peso turístico, año a año
  const PYs=SER.paroYears.filter(y=>y<=2025), mrw=rowsAll().filter(r=>(r[F.pop]||0)>=1000&&r[F.vtp20]!=null&&r[F.renta19]&&SBY.get(r[F.code])&&SBY.get(r[F.code])[SF.paro]);
  const pIdx=(r,y)=>{ const p=SBY.get(r[F.code])[SF.paro], a=p[SER.paroYears.indexOf(2019)], b=p[SER.paroYears.indexOf(y)]; return a>0&&b!=null?b/a*100:null; };
  const ESm=PYs.map(y=>y===2019?{y,b:0,ci:[0,0]}:{y,...(regFn(mrw,{x:r=>r[F.vtp20],y:r=>pIdx(r,y),z:[r=>Math.log10(r[F.pop20]||r[F.pop]),r=>r[F.renta19]],fe:true,w:r=>r[F.pop],B:150})||{})});
  const preMax=d3.max(ESm.filter(e=>e.y<2019&&e.b!=null),e=>Math.abs(e.b)), e20=ESm.find(e=>e.y===2020), e23=ESm.find(e=>e.y===2023);
  sec(B,"ctx",`<p>En marzo de 2020 España cerró fronteras, hoteles, bares y restaurantes. El turismo internacional, que había batido récords en 2019, prácticamente desapareció durante más de un año. Para un país donde el turismo pesa en torno a una de cada ocho unidades de lo que se produce, fue el mayor golpe económico en décadas.</p>
    <p>El golpe no fue igual en todas partes. Las zonas que viven del turismo, las islas, la Costa del Sol, la Costa Brava, deberían haberlo notado mucho más. Y la pregunta que importa hoy, años después, es doble: <b>cuánto más sufrieron</b> y, sobre todo, <b>si se recuperaron</b> o si la crisis dejó cicatrices duraderas en su mercado de trabajo.</p>`);
  sec(B,"int",`<p>El choque es la pandemia de 2020 y las restricciones a la movilidad. La <b>dosis</b> es lo turística que era cada zona antes: el peso de las viviendas turísticas sobre el total en agosto de 2020 (INE). El resultado principal es el paro registrado (SEPE), anual de 2015 a 2025; también la renta por persona y los trabajadores en ERTE de abril de 2020.</p>`,{title:"El choque"});  sec(B,"ana",`<p>Primero por provincias: separamos las <b>10 provincias más turísticas</b> —las que tenían más viviendas turísticas sobre el total en agosto de 2020: ${TUR.map(nm).join(", ")}— del resto, y comparamos cómo cambió el paro registrado y la renta en cada grupo entre 2019 y 2020 (<b>diferencias en diferencias</b>). Como los dos grupos no iban exactamente en paralelo antes, se descuenta también la tendencia de 2017–2019 de cada uno. Después a escala de <b>municipio</b>, con los 8.139: cuanto más pesan los pisos turísticos, ¿más subió el paro? Eso es una <b>dosis-respuesta</b>, y permite descontar tamaño, renta y paro previo, y comparar dentro de cada provincia. Y como el paro registrado no cuenta los ERTE, miramos también los ERTE.</p>`);
  const s3=res(B,`En 2020 el paro subió un ${nf0.format(jT)}${NB}% en las provincias turísticas y un ${nf0.format(jR)}${NB}% en el resto`,`<p>Paro registrado de cada grupo, con 2019 = 100. Antes de la pandemia el paro bajaba en los dos grupos, un ${nf1.format(Math.abs(tR))}${NB}% al año en el resto y un ${nf1.format(Math.abs(tT))}${NB}% en las turísticas: la comparación no es perfecta. Descontando esa tendencia, la diferencia de 2020 pasa de ${nf1.format(didRaw)} a <b>${nf1.format(didTrend)} puntos</b>. En 2023 las turísticas estaban un ${nf0.format(Math.abs(rT))}${NB}% ${rT<0?"por debajo":"por encima"} de 2019 y el resto, un ${nf0.format(Math.abs(rR))}${NB}% ${rR<0?"por debajo":"por encima"}.</p>`);
  lineChart(s3,{title:"Paro registrado, 2019 = 100",source:"Media anual; 2026, de enero a septiembre. Fuente: SEPE; viviendas turísticas del INE para elegir las provincias.",series:[{n:"10 más turísticas",v:idx(TUR),c:"--rust",main:true},{n:"Resto de España",v:idx(REST),c:"--slate"}],years:PY,xticks:[2015,2019,2020,2023,2026],fmt:v=>nf1.format(v),height:280});
  add(s3,"p",null,`¿Podría salir una diferencia así por casualidad? Eligiendo 300 veces 10 provincias al azar en vez de las 10 más turísticas, la diferencia va de ${pts(pr.min)} a ${pts(pr.max)} puntos; ${pr.n-pr.below} de 300 superan la real. ${pr.share>=0.97?"Es un resultado muy raro sin un efecto del turismo.":"No es un resultado raro: con 10 provincias, la casualidad pesa."}`).style.cssText="max-width:var(--medida);margin-top:8px";
  lect(s3,`<p>Hasta 2019 las dos líneas bajan, porque el paro caía en toda España, aunque algo más deprisa fuera de las zonas turísticas. En 2020 saltan las dos, y la turística salta más. Descontando esa diferencia de ritmo previa, la diferencia atribuible al golpe es de unos ${nf1.format(didTrend)} puntos. Y la prueba de los grupos al azar dice que no es casualidad: muy pocas combinaciones de provincias elegidas a ciegas producen un salto así.</p><p>Lo más llamativo está a la derecha del gráfico: a partir de 2021 las dos líneas vuelven a juntarse, y en 2023 las provincias turísticas estaban ${Math.abs(rT-rR)<1?"igual que el resto":rT<rR?"mejor que el resto":"todavía algo peor que el resto"} respecto a 2019.</p>`);
  const s4=res(B,"Provincia a provincia, y los ERTE",`<p>Cuánto subió el paro registrado entre 2019 y 2020 en cada provincia. En granate, las diez más turísticas. ${c?`Entre provincias, la relación entre el peso del turismo y la subida del paro es ${strength(Math.abs(c.r))} (r = ${rFmt(c.r)}).`:""} ${erte?`Los <b>ERTE</b> cuentan lo que el paro registrado no ve: a 30 de abril de 2020 había ${nf1.format(eT)} trabajadores en ERTE por cada 100 habitantes en las provincias turísticas y ${nf1.format(eR)} en el resto${ce?`, y la relación con el peso del turismo es ${strength(Math.abs(ce.r))} (r = ${rFmt(ce.r)})`:""}. El golpe real al empleo fue mucho mayor que lo que muestra el paro.`:""}</p>`);
  const g4=add(s4,"div","cols2");
  const f=fig(g4,{title:"Subida del paro registrado, 2019–2020",source:"Fuente: SEPE."});
  hbars(f.body,P.slice().sort((a,b)=>jump(b)-jump(a)).map(p=>({l:nm(p),v:jump(p),c:TUR.includes(p)?"--rust":"--stone"})),{fmt:sgn,scroll:true,min:0});
  if(erte){ const fe=fig(g4,{title:"Trabajadores en ERTE por cada 100 habitantes, 30 de abril de 2020",source:"Fuente: Seguridad Social, nota de afiliación de abril de 2020 (dato provisional); padrón de 2020."});
    hbars(fe.body,P.filter(p=>ertePct(p)!=null).sort((a,b)=>ertePct(b)-ertePct(a)).map(p=>({l:nm(p),v:ertePct(p),c:TUR.includes(p)?"--rust":"--stone"})),{fmt:v=>nf1.format(v),scroll:true,min:0}); }
  lect(s4,`<p>Baleares encabeza la lista con mucha distancia: su paro registrado subió casi a la mitad en un año. Pero el paro registrado se queda corto para medir el golpe, porque los trabajadores en ERTE, con el contrato suspendido y cobrando una prestación, no contaban como parados. En abril de 2020, el peor mes, había ${erte?nf1.format(eT):"—"} trabajadores en ERTE por cada 100 habitantes en las provincias turísticas. El ERTE fue el gran amortiguador: sin él, la diferencia en el paro habría sido mucho mayor.</p>`);
  const s5=res(B,"Municipio a municipio: cuanto más turístico, más subió el paro",`<p>Con los municipios de 1.000 habitantes o más, agrupados por el peso de los pisos turísticos en agosto de 2020. La relación es ${m0?strength(Math.abs(m0.r)):"—"} sin descontar nada (${rCI(m0)}) y ${m1?strength(Math.abs(m1.r)):"—"} entre municipios de la misma provincia, tamaño, renta y paro previo (${rCI(m1)}). ${m1&&!ciZero(m1)&&m1.r>0?"Aguanta: no es solo que las provincias turísticas sean distintas, es que dentro de cada provincia los municipios turísticos sufrieron más.":"Dentro de cada provincia la relación se diluye: la diferencia es sobre todo entre provincias."}</p>`);
  const fb=fig(s5,{title:"Subida del paro registrado en 2020, según el peso de los pisos turísticos",source:"Grupos con la misma población, media ponderada. Fuente: SEPE e INE (viviendas turísticas)."});
  hbars(fb.body,bins.map(b=>({l:`${b.l} (${nf1.format(b.vt)}${NB}% de las viviendas)`,v:b.v})),{fmt:sgn,color:"--rust",min:0});
  fb.body.querySelectorAll(".hb").forEach(h=>h.style.gridTemplateColumns="minmax(150px,300px) minmax(0,1fr) 64px");
  lect(s5,`<p>Bajar al nivel de municipio permite una prueba más fina: comparar pueblos y ciudades de la misma provincia, del mismo tamaño y con la misma renta, que solo se diferencian en lo turísticos que eran. Y la relación aguanta: dentro de cada provincia, cuanto más turístico el municipio, más subió su paro. No es que Baleares o Canarias tengan algo especial; es el turismo.</p>`);
  const s6=res(B,`Año a año: el golpe aparece en 2020${e23&&e23.ci?(!sigCI(e23.ci)?" y desaparece en 2023":e23.b<0?" y en 2023 se ha invertido":" y sigue en 2023"):""}${preMax!=null&&e20&&preMax<Math.abs(e20.b)*0.6?", con diferencias previas pequeñas":", aunque antes ya había diferencias"}`,`<p>Estudio de eventos con los municipios: cada punto es cuánto más subió (o bajó) el paro de un municipio, respecto a 2019, por cada punto más de viviendas turísticas que tuviera en 2020, comparando municipios de la misma provincia con igual tamaño y renta. Antes de 2019 la pendiente debería ser cero; si no lo es, los municipios turísticos ya iban por otro camino.</p>`);
  { const fg=fig(s6,{title:"Paro (2019 = 100): diferencia por cada punto más de viviendas turísticas",sub:"Puntos del índice; sombra: intervalo del 95 %",source:"Efectos fijos de provincia; controles: tamaño y renta de 2019; ponderado por población. Fuente: SEPE e INE."}); gapChart(fg.body,ESm.filter(e=>e.b!=null).map(e=>({k:e.y,g:e.b,ci:e.ci})),k=>String(k)); }
  add(s6,"p",null,`En 2020: ${e20?`${sg2(e20.b)} puntos${ciPts(e20.ci,sg2)}`:"—"} por cada punto de viviendas turísticas; en 2023: ${e23?`${sg2(e23.b)}${ciPts(e23.ci,sg2)}`:"—"}. Antes de 2019 la pendiente máxima es de ${preMax!=null?nf1.format(preMax):"—"} puntos.`).style.cssText="max-width:var(--medida);margin-top:8px";
  lect(s6,`<p>Este gráfico resume la historia completa. Antes de 2019 la línea se mueve poco (como mucho ${preMax!=null?nf1.format(preMax):"—"} puntos, y en años sueltos): no es cero perfecto, pero es pequeño al lado de lo que viene después. En 2020 sube de golpe: por cada punto más de viviendas turísticas, el paro de un municipio subió ${e20?nf1.format(e20.b):"—"} puntos más respecto a 2019. Y después baja, ${e23&&e23.b<0?"hasta quedar por debajo de cero en 2023: los municipios turísticos no solo se recuperaron, sino que su paro ha bajado más que el del resto":"hasta volver a la zona de cero"}.</p>`);
  { const yrs=ESm.filter(e=>e.y>=2020&&e.b!=null), q90=cuts[3], q97=cuts[4], vmax=Math.max(10,Math.ceil(q97)||10);
    const sg=res(B,"Entre el blanco y el negro: ¿cuánto sufre un pueblo según lo turístico que sea?",`<p>La respuesta no es «sí» o «no»: crece con lo turístico que sea el municipio y se va desdibujando con los años. Elige cuántas viviendas turísticas tiene por cada 100 y el año, y lee el paro frente a un pueblo parecido sin turismo.</p>`);
    playBox(sg,{defs:[["v","Viviendas turísticas, por cada 100 viviendas",0,vmax,0.5,"En agosto de 2020. La mitad de los municipios está por debajo de "+nf1.format(cuts[1])+".",x=>nf1.format(x)],
        ["y","Año",2020,yrs[yrs.length-1].y,1,"Cada año frente a 2019.",x=>String(x)]],
      pre:[["Sin turismo",{v:0,y:2020}],["Turístico (90 % de los municipios por debajo)",{v:Math.round(q90*2)/2,y:2020}],["Muy turístico, tres años después",{v:Math.round(q97*2)/2,y:2023}]],
      render:st=>{ const e=yrs.find(x=>x.y===st.y)||yrs[0], d=e.b*st.v, ci=e.ci?[e.ci[0]*st.v,e.ci[1]*st.v]:null;
        if(!st.v) return `<div class="big">0 <span class="muted" style="font-size:16px;font-weight:400">puntos de diferencia</span></div><p>Sin viviendas turísticas, el municipio es la referencia con la que se compara: sube el control para ver cuánto se separa.</p>`;
        return `<div class="big">${d>=0?"+":"−"}${nf1.format(Math.abs(d))} <span class="muted" style="font-size:16px;font-weight:400">puntos del índice de paro (2019 = 100) frente a un pueblo sin turismo</span></div>
          <p>Respecto a un municipio del mismo tamaño y renta sin turismo, el paro de un municipio con ${nf1.format(st.v)} viviendas turísticas por cada 100 estaba en ${st.y} ${Math.abs(d)<0.05?"igual":(d>0?"más alto":"más bajo")}${ci?`, con un intervalo del 95 % de ${pts(ci[0])} a ${pts(ci[1])}`:""}.</p>
          <p class="muted" style="font-size:14px">${ci&&!sigCI(ci)?"El intervalo incluye el cero: no se distingue de un municipio sin turismo.":"El efecto es distinto de cero con estos datos."}</p>`; }});
    lect(sg,`<p>Mueve el año y verás la historia: el golpe de 2020, y cómo se va cerrando después. No hay una cifra única porque depende de cuánto turismo tenga el pueblo y de cuándo se mire.</p>`); }
  sec(B,"con",`<p>Sí: el paro subió en las provincias turísticas <mark>${nf0.format(didTrend)} puntos más</mark> que en el resto (descontando la tendencia previa), y la renta por persona ${iT<iR?`cayó más (${sgn(iT)} frente a ${sgn(iR)})`:`se movió parecido (${sgn(iT)} frente a ${sgn(iR)})`}. ${rT<=rR+3?"La recuperación fue completa: en 2023 ya estaban como el resto o mejor.":"Y la recuperación tardó más."}</p>
    <p>La historia de la pandemia en las zonas turísticas es la de un golpe enorme y una recuperación completa. Que no quedaran cicatrices visibles en el paro tiene mucho que ver con los ERTE, que mantuvieron el vínculo entre trabajadores y empresas mientras el turismo estaba cerrado, y con la rapidez con la que volvió el turismo en 2022 y 2023.</p>
    <p>La otra lectura es la de la vulnerabilidad: los municipios que más dependen de una sola actividad son los primeros en caer cuando esa actividad se para. La pandemia fue excepcional, pero cualquier caída fuerte del turismo, por una crisis económica en los países de origen o por un cambio en los hábitos de viaje, golpearía primero en los mismos sitios.</p>
    <ul class="defs"><li><b>El paro registrado se quedó corto.</b> Los trabajadores en ERTE no contaban como parados${erte?`, y en abril de 2020 eran ${nf1.format(eT)} por cada 100 habitantes en las provincias turísticas, frente a ${nf1.format(eR)} en el resto`:""}: el golpe real al empleo fue mayor de lo que muestra este dato. Solo hay datos públicos de ERTE por provincia para algunos meses.</li>
    <li><b>Las provincias turísticas no son iguales al resto en otras cosas</b> (empleo temporal, tamaño de las empresas, clima). Por eso se descuenta la tendencia previa y se repite el análisis dentro de cada provincia.</li>
    <li><b>La renta de 2020 incluye las prestaciones</b> (paro, ERTE), que amortiguaron la caída: el golpe a los salarios fue mayor.</li></ul>
    <p style="margin-top:10px">${exLink("evolucion",{e:["paro","pob"]},"Mira el paro de tu provincia en el laboratorio")}</p>`);
  AB.fill({ctx:"La pandemia cerró el turismo en 2020: ¿sufrieron más las zonas turísticas, y se recuperaron?",intT:"El choque",int:"Pandemia de 2020; dosis: peso de las viviendas turísticas antes del choque. Resultado: paro registrado 2015–2025, renta y ERTE.",ana:"Diferencias en diferencias por provincias con tendencia previa y placebo, dosis-respuesta municipal y estudio de eventos año a año.",res:`El paro subió en las provincias turísticas ${nf0.format(didTrend)} puntos más (descontando tendencia); en los municipios, ${e20?sg2(e20.b):"—"} puntos por cada punto de viviendas turísticas en 2020${e23?`, ${sg2(e23.b)} en 2023`:""}.`,con:rT<=rR+3?"Golpe mayor y recuperación completa: sin cicatriz visible en el paro.":"Golpe mayor y recuperación más lenta."});
  methods(B,[["Qué se hace","Se compara cómo cambió el paro antes y después de 2020 en las zonas más turísticas y en el resto, a escala de provincia y de municipio, descontando lo que ya pasaba antes y comprobando con grupos al azar que la diferencia no es casualidad."],["Estudio de eventos municipal","Para cada año t, pendiente del índice de paro (2019 = 100) sobre el % de viviendas turísticas de 2020, con log del padrón y renta de 2019 como controles, efectos fijos de provincia y ponderación por población; intervalos por remuestreo (150 réplicas)."],["Unidad","50 provincias (sin Ceuta y Melilla); municipios de 1.000 habitantes o más para la dosis-respuesta"],["Tratamiento","10 provincias con más viviendas turísticas sobre el total en agosto de 2020; a escala municipal, el % de viviendas turísticas en agosto de 2020 como dosis"],["Periodos","Antes: 2019 (tendencia 2017–2019). Después: 2020; recuperación hasta 2023. Paro registrado como media anual"],["Ponderación","Provincias: suma de parados (equivale a ponderar por paro). Municipios: por población"],["Modelo",FICHA_DID+" Placebo: 300 elecciones al azar de 10 provincias. "+FICHA_R]]);
}

// ---------- qué hace crecer a un pueblo ----------
function studyGrow(B){
  const AB=abstract(B);
  const tmp=document.createElement("div"), CR=cercaRes(tmp), {B5,uPost,uDiff,pp}=CR;
  const Y="pobVar20", FAC=[["renta19","Renta por persona (2019)"],["edad19","Edad media (2019)"],["superiores","Estudios superiores (2021)"],["paroReg19","Paro registrado (2019)"],["alquiler","Hogares de alquiler (2021)"],["vtp20","Pisos turísticos (2020)"],["distCiudad","Distancia a una ciudad grande"],["distCosta","Distancia a la costa"],["lpop20","Tamaño del pueblo (2020, log)"]];
  const val=k=>k==="lpop20"?(r=>r[F.pop20]>0?Math.log10(r[F.pop20]):null):(r=>r[F[k]]);
  const rows=rowsAll().filter(r=>(r[F.pop]||0)>=1000&&(r[F.pop]||0)<20000&&r[F[Y]]!=null&&FAC.every(([k])=>val(k)(r)!=null));
  const sdRaw=k=>d3.deviation(rows,val(k));
  const est=FAC.map(([k,l])=>{ const z=FAC.filter(f=>f[0]!==k).map(f=>val(f[0])); const simple=wcorr(rows.map(r=>({x:val(k)(r),y:r[F[Y]],w:1})));
    const u=regFn(rows,{x:val(k),y:r=>r[F[Y]],z,fe:true}); const sd=sdRaw(k);
    return {k,l,s:simple?simple.r:null,p:u?u.r:null,ci:u?u.rci:null,eff:u?u.b*sd:null,eci:u&&u.ci?[u.ci[0]*sd,u.ci[1]*sd]:null,sd}; });
  // R² dentro de provincia del modelo completo
  const g=rows.map(r=>r[F.prov]), w1=rows.map(()=>1); const Yd=demeanBy(rows.map(r=>r[F[Y]]),g,w1); const Zd=FAC.map(([k])=>demeanBy(rows.map(val(k)),g,w1));
  const rsd=wresid(Yd,rows.map((r,i)=>Zd.map(c=>c[i])),w1), R2=1-d3.variance(rsd)/d3.variance(Yd);
  // robustez: edad de 2015 en lugar de 2019 (más lejos del crecimiento que se explica)
  const ed15=r=>{ const s=SBY.get(r[F.code]); return s&&s[SF.edad]?s[SF.edad][0]:null; };
  const zNoEd=FAC.filter(f=>f[0]!=="edad19").map(f=>val(f[0]));
  const uEd15=regFn(rows.filter(r=>ed15(r)!=null),{x:ed15,y:r=>r[F[Y]],z:zNoEd,fe:true}), sd15=d3.deviation(rows.filter(r=>ed15(r)!=null),ed15);
  const ok=est.filter(r=>r.p!=null).sort((a,b)=>Math.abs(b.eff)-Math.abs(a.eff)), top=ok[0], snd=ok[1], gone=est.filter(r=>r.s!=null&&r.p!=null&&Math.abs(r.s)>=0.1&&ciZero({ci:r.ci}));
  const nm=l=>low(l.replace(/ \(.*\)$/,""));
  sec(B,"ctx",`<p>Hablar de «la España vaciada» como un bloque esconde una realidad más variada. Entre 2020 y 2025, en la misma provincia, con la misma carretera y el mismo clima, unos pueblos ganan vecinos y el de al lado los pierde. Desde la pandemia se cuenta además una historia concreta: el teletrabajo y los alquileres imposibles de las ciudades estarían devolviendo gente a los pueblos. Si fuera así, deberían crecer sobre todo los que quedan cerca de una ciudad. <b>Cerca de una ciudad crecen ${nf0.format(B5[0].sh)} de cada 100 pueblos; a más de 80 km, ${nf0.format(B5[4].sh)}.</b></p>
    <p>El contraste es real, pero no dice por qué. Los pueblos lejanos son también los más envejecidos, y un pueblo viejo pierde población por pura demografía, esté donde esté. Las explicaciones habituales (renta, juventud, estudios, empleo, turismo, costa) van además todas juntas: los pueblos ricos suelen ser más jóvenes, tener más estudios y estar mejor comunicados. Este análisis empieza por la distancia y acaba poniendo todas a competir a la vez.</p>`);
  sec(B,"int",`<p>No hay una intervención: se comparan pueblos. Primero, ${nf0.format(CR.B5.reduce((t,b)=>t+b.n,0))} municipios de 200 a 20.000 habitantes según su distancia en línea recta a la ciudad de más de 100.000 habitantes más próxima. Después, ${nf0.format(rows.length)} municipios de 1.000 a 20.000 habitantes con nueve factores a la vez. El resultado es el cambio del padrón entre 2020 y 2025; los factores se miden <b>antes</b> de ese periodo (2019–2020, o el Censo de 2021), para que no sean consecuencia del crecimiento que se quiere explicar. Como contraste, se repite el cálculo de la distancia en 2015–2019, antes de la pandemia.</p>`,{title:"Qué se compara"});
  sec(B,"ana",`<p>Cuatro pasos, de lo que se ve a simple vista a lo que queda cuando se descuentan las otras explicaciones:</p><ol class="defs"><li><b>El gradiente:</b> cuánto crecen los pueblos según su banda de distancia a una ciudad.</li><li><b>Entre iguales:</b> la misma relación entre pueblos con el mismo tamaño, edad media y renta, y solo dentro de cada provincia (no se compara un pueblo de Soria con uno de Madrid).</li><li><b>Antes y después de 2020</b> y <b>quién llega</b>: si el castigo de la distancia es nuevo, y si los que llegan vienen de la ciudad o de fuera.</li><li><b>Todos los factores a la vez:</b> una regresión con efectos fijos de provincia. Para cada factor se dan tres cifras: su correlación por sí solo, la correlación parcial (la que queda al descontar los demás) y el <b>efecto de una desviación típica</b>: cuántos puntos de crecimiento separan a dos pueblos iguales en todo salvo en ese factor, que difieren en él lo que difiere un pueblo típico de otro.</li></ol>`);
  while(tmp.firstChild) B.appendChild(tmp.firstChild);
  const s1=res(B,top?`Entre pueblos parecidos, lo que más pesa es ${nm(top.l)}${snd?`, seguido de ${nm(snd.l)}`:""}`:"Por separado y entre iguales",`<p>Cuanto más lejos de cero, más fuerte. Granate: los pueblos con más de ese factor crecen más; azul: menos.</p>`);
  const t=add(s1,"div","extable"); t.innerHTML=`<table class="glance reg" style="max-width:var(--medida)"><thead><tr><th>Factor</th><th class="r">Por sí solo (r)</th><th class="r">Entre iguales (r parcial)</th><th class="r">Efecto de +1 desv. típica</th><th></th></tr></thead><tbody>${est.map(r=>`<tr><td class="lab"><b>${r.l}</b></td><td class="r num">${r.s==null?"—":rFmt(r.s)}</td><td class="r num"><b>${r.p==null?"—":rFmt(r.p)}</b>${ciFmt(r.ci)}</td><td class="r num">${r.eff==null?"—":`${sg2(r.eff)} pp`}${ciPts(r.eci,sg2)}</td><td>${r.eff==null?"":`<span style="display:inline-block;height:9px;border-radius:2px;width:${Math.round(Math.min(1,Math.abs(r.eff)/6)*140)}px;background:var(${r.eff>0?"--rust":"--slate"})"></span>`}</td></tr>`).join("")}</tbody></table>`;
  add(s1,"p","muted",`pp = puntos porcentuales de crecimiento del padrón en 2020–2025. ${nf0.format(rows.length)} municipios, cada uno cuenta igual; efectos fijos de provincia. El modelo completo explica el ${pc0(R2*100)} de las diferencias de crecimiento dentro de cada provincia. Intervalos del 95 % por remuestreo.`).style.cssText="font-size:13.5px;margin-top:8px";
  lect(s1,`<p>La tabla tiene tres columnas que conviene leer en orden. La primera es lo que se ve a simple vista: con qué se relaciona el crecimiento si se mira cada factor por separado. La segunda, lo que queda cuando ese factor compite con todos los demás. La tercera lo traduce a algo tangible: la diferencia de crecimiento, en puntos, entre dos pueblos iguales en todo salvo en ese factor, cuando difieren en él lo que difieren dos pueblos típicos.</p><p>${top?`El ganador es ${nm(top.l)}: dos pueblos que solo se diferencian en eso crecen ${nf1.format(Math.abs(top.eff))} puntos de distinto en cinco años.`:""} ${gone.length?`Y hay factores que se desinflan: ${gone.map(g=>nm(g.l)).join(", ")} parecían importar por sí solos y dejan de hacerlo entre iguales.`:`La renta, que por sí sola parece ayudar (${rFmt(est.find(e=>e.k==="renta19").s)}), cambia de signo entre iguales: los pueblos ricos crecen porque son jóvenes y tienen estudios, no por ser ricos.`}</p>`);
  res(B,"Robustez: la edad medida cinco años antes",`<p>La edad es el factor más expuesto a la causalidad inversa: un pueblo que ya crecía porque llegaban familias jóvenes era más joven en 2019. Medida en 2015, cinco años antes del periodo, su efecto de una desviación típica es de ${uEd15?`${sg2(uEd15.b*sd15)} pp${ciPts(uEd15.ci&&[uEd15.ci[0]*sd15,uEd15.ci[1]*sd15],sg2)}`:"—"}, frente a ${est.find(e=>e.k==="edad19").eff!=null?sg2(est.find(e=>e.k==="edad19").eff)+" pp":"—"} con la de 2019. ${uEd15&&sigCI(uEd15.ci)?"El signo y el orden de magnitud se mantienen.":"Con la edad de 2015 el efecto ya no se distingue de cero: conviene leer el de 2019 con mucha prudencia."}</p>`);
  { const TOPF=ok.filter(o=>o.eff!=null).slice(0,4), mu=k=>d3.mean(rows,val(k)), fz=z=>z===0?"como la media":(z>0?"+":"−")+nf1.format(Math.abs(z))+" desviaciones";
    if(TOPF.length){ const sg=res(B,"Entre el blanco y el negro: construye un pueblo y mira cuánto crecería",`<p>No hay una sola razón por la que un pueblo crece: son varias a la vez. Mueve los factores que más pesan (en desviaciones típicas respecto al pueblo medio de su provincia) y mira cuánto suma cada uno. Es un promedio entre pueblos, no una predicción de ninguno en particular.</p>`);
      playBox(sg,{defs:TOPF.map(o=>[o.k,nm(o.l).replace(/^./,c=>c.toUpperCase()),-2,2,0.5,`Una desviación son ${nf1.format(o.sd)} ${o.k==="renta19"?"€":o.k==="edad19"?"años":o.k==="lpop20"?"en escala log. de habitantes":o.k==="paroReg19"?"puntos de paro":"unidades"}.`,fz]),
        pre:[["Pueblo medio",Object.fromEntries(TOPF.map(o=>[o.k,0]))],["Todo a favor",Object.fromEntries(TOPF.map(o=>[o.k,o.eff>0?1.5:-1.5]))],["Todo en contra",Object.fromEntries(TOPF.map(o=>[o.k,o.eff>0?-1.5:1.5]))]],
        render:st=>{ const parts=TOPF.map(o=>({l:nm(o.l),v:o.eff*st[o.k]})), tot=d3.sum(parts,x=>x.v);
          return `<div class="big">${tot>=0?"+":"−"}${nf1.format(Math.abs(tot))} <span class="muted" style="font-size:16px;font-weight:400">puntos de crecimiento 2020–2025 frente al pueblo medio</span></div>
            <p>${parts.filter(x=>Math.abs(x.v)>=0.05).map(x=>`${x.l}: <b>${x.v>=0?"+":"−"}${nf1.format(Math.abs(x.v))}</b>`).join(" · ")||"Todos los factores en la media."}</p>
            <p class="muted" style="font-size:14px">El modelo completo explica el ${pc0(R2*100)} de las diferencias entre pueblos de una misma provincia: el resto es otra cosa, o simplemente azar.</p>`; }});
      lect(sg,`<p>Ningún factor decide por sí solo: pesan los que van juntos. Y hay mucho más que no está en el modelo, como el tren, la vivienda o un empleo concreto.</p>`); } }
  sec(B,"con",`<p><b>Cerca de una ciudad crecen muchos más pueblos, pero la distancia explica poco: pesa más la edad.</b> Entre pueblos iguales de la misma provincia queda un gradiente de ${pp(uPost&&uPost.b)} de crecimiento anual por cada 10 km${uDiff&&sigCI(uDiff.ci)?`, ${uDiff.b>0?"menos acusado":"más acusado"} que antes de 2020 (${pp(uDiff.b)})`:", parecido al de antes de 2020: la pandemia no lo ha cambiado de forma visible"}. ${top?`Entre los nueve factores, ${nm(top.l)} es el que más separa a los pueblos que crecen de los que se vacían${snd?`, seguido de ${nm(snd.l)}`:""}.`:""}${gone.length?` ${cap(gone.map(g=>nm(g.l)).join(", ").replace(/, ([^,]*)$/," y $1"))} ${gone.length>1?"parecían importar y dejan de hacerlo":"parecía importar y deja de hacerlo"} al comparar entre iguales.`:""} Todos juntos explican solo una parte de las diferencias: mucho de lo que hace crecer a un pueblo no está en estos datos.</p>
    <p>La vuelta al pueblo desde la ciudad existe, pero se queda cerca: a menos de 15 km llegan de otras partes de España ${nf1.format(B5[0].int)} personas por cada 1.000 habitantes y año, y a más de 80 km, ${nf1.format(B5[4].int)}. Lo que mantiene vivos a los pueblos lejanos es sobre todo la inmigración extranjera, que llega con parecida intensidad a todas las distancias. La conclusión demográfica es que los pueblos jóvenes crecen y los envejecidos se vacían, y eso pesa más que la renta, que estar en la costa o que estar cerca de una ciudad. Que la vivienda en alquiler aparezca entre los factores más fuertes tiene lógica: para que llegue gente nueva tiene que haber dónde vivir, y en muchos pueblos casi no hay pisos que alquilar.</p>
    <p>Para las políticas contra la despoblación, la lectura es que atraer población joven y facilitar vivienda puede valer más que inversiones que solo mejoran la renta de quien ya vive allí. Mejorar las comunicaciones con la ciudad ayuda a los pueblos cercanos; en los lejanos, la palanca demográfica más potente es atraer y retener a quien llega de fuera.</p>
    <ul class="defs"><li><b>La causa puede ir al revés,</b> sobre todo con la edad, aunque se mida antes del periodo.</li>
    <li><b>La distancia es en línea recta,</b> no en tiempo de viaje. Un pueblo a 40 km con tren de cercanías está «más cerca» que uno a 25 km por una carretera de montaña.</li>
    <li><b>La costa crece por lo que tiene, no por ser costa:</b> los pueblos de costa son más jóvenes, más ricos y más turísticos; entre iguales, estar en la costa no añade nada.</li>
    <li><b>Faltan sospechosos importantes:</b> tren y autovía, servicios del pueblo, precio de la vivienda en la ciudad cercana.</li>
    <li><b>Es un periodo corto,</b> con la pandemia en medio, y son relaciones entre lugares, no entre personas.</li></ul>
    <p style="margin-top:10px">${exLink("cruce",{d:[top?top.k==="lpop20"?"pop":top.k:"renta",Y],t:"s2",c:[]},"Ponlo a prueba en el laboratorio")}</p>`);
  AB.fill({ctx:`Cerca de una ciudad crecen ${nf0.format(B5[0].sh)} de cada 100 pueblos y a más de 80 km, ${nf0.format(B5[4].sh)}; pero los lejanos son también los más envejecidos.`,intT:"Qué se compara",int:`${nf0.format(rows.length)} municipios de 1.000 a 20.000 habitantes; cambio del padrón 2020–2025 y nueve factores medidos antes.`,ana:"Gradiente por distancia, comparación entre iguales y con 2015–2019, saldo migratorio por origen y regresión con los nueve factores a la vez y efectos fijos de provincia, con intervalos.",res:top?`Entre iguales, cada 10 km más de distancia cambian el crecimiento anual en ${pp(uPost&&uPost.b)}. Lo que más pesa es ${nm(top.l)} (${sg2(top.eff)} pp por desviación típica)${snd?`, seguido de ${nm(snd.l)} (${sg2(snd.eff)} pp)`:""}; el modelo explica el ${pc0(R2*100)} de las diferencias dentro de cada provincia.`:"",con:`${top?cap(nm(top.l)):"—"}${snd?` y ${nm(snd.l)}`:""} pesan más que la distancia, la renta o la costa; con prudencia por la causalidad inversa y por todo lo que no está en los datos.`});
  methods(B,[["Qué se hace","Se ponen a competir nueve posibles explicaciones del crecimiento de los pueblos, todas medidas antes del periodo, comparando siempre pueblos de la misma provincia, y se traduce cada una a puntos de crecimiento."],["Datos","INE: padrón (2019–2025), Atlas de Renta (renta y edad media de 2015 y 2019), Censo de 2021 (estudios superiores, hogares de alquiler), viviendas turísticas (agosto de 2020); SEPE: paro registrado (2019); distancias calculadas en Indicio."],["Muestra",`${nf0.format(rows.length)} municipios de 1.000 a 20.000 habitantes con todos los factores.`],["Especificación","MCO sin ponderar del cambio del padrón 2020–2025 (%) sobre los nueve factores y efectos fijos de provincia. Para cada factor: correlación parcial y pendiente por residuos (Frisch–Waugh–Lovell); efecto de una desviación típica = pendiente × desviación típica del factor en la muestra."],["Inferencia","Intervalos del 95 % por remuestreo de municipios (200 réplicas)."],["Robustez","Edad media de 2015 en lugar de 2019."],["Distancia","Distancia en línea recta a la ciudad de más de 100.000 habitantes más cercana; pendiente por cada 10 km con los mismos controles y efectos fijos; comparación con el crecimiento anual compuesto de 2015–2019 y saldo migratorio 2021–2024 (INE, Estadística de Migraciones)."]]);
}
// relación entre el tamaño (log) y el crecimiento, descontando el resto
function lpopPartial(Y,others,popKey="pop",rowsIn){
  const cs=others.filter(c=>c!=="lpop"&&c!=="lpop20"&&c!=="prov");
  const rs=rowsIn||rowsAll().filter(r=>exOK(r)&&r[F[Y]]!=null&&(r[F[popKey]]||0)>0&&cs.every(c=>r[F[c]]!=null)); if(rs.length<30) return null;
  const w=rs.map(()=>1), g=rs.map(r=>r[F.prov]); const cols=cs.map(c=>demeanBy(rs.map(r=>r[F[c]]),g,w)), Z=rs.map((r,i)=>cols.map(col=>col[i]));
  let X=demeanBy(rs.map(r=>Math.log10(r[F[popKey]])),g,w), YY=demeanBy(rs.map(r=>r[F[Y]]),g,w); if(cs.length){ X=wresid(X,Z,w); YY=wresid(YY,Z,w); }
  const pts=X.map((v,i)=>({x:v,y:YY[i],w:1})), c=wcorr(pts); if(!c) return null;
  const ci=rowsIn?null:bootCI(pts,s=>{ const a=wcorr(s); return a?a.r:null; });
  return {r:c.r,n:rs.length,ci};
}

// ---------- cerca de la ciudad ----------
// Distancia a la ciudad y crecimiento del pueblo. Se pinta dentro de «crecer».
function cercaRes(B){
  const rows=rowsAll().filter(r=>r[F.pobVar20]!=null&&r[F.distCiudad]!=null&&(r[F.pop]||0)>=200&&(r[F.pop]||0)<20000&&r[F.distCiudad]>0);
  const bands=[[0,15,"Menos de 15 km"],[15,30,"15 a 30 km"],[30,50,"30 a 50 km"],[50,80,"50 a 80 km"],[80,1e9,"Más de 80 km"]];
  const wm=(rs,k)=>{ const s=rs.filter(r=>r[F[k]]!=null&&r[F.pop]); const w=d3.sum(s,r=>r[F.pop]); return w?d3.sum(s,r=>r[F[k]]*r[F.pop])/w:null; };
  const um=(rs,k)=>{ const s=rs.filter(r=>r[F[k]]!=null); return s.length?d3.mean(s,r=>r[F[k]]):null; };
  const share=rs=>rs.filter(r=>r[F.pobVar20]>0).length/rs.length*100;
  const B5=bands.map(([a,b,l])=>{ const s=rows.filter(r=>r[F.distCiudad]>=a&&r[F.distCiudad]<b); return {l,n:s.length,g:wm(s,"pobVar20"),gu:um(s,"pobVar20"),sh:share(s),edad:wm(s,"edad"),ext:um(s,"migExtT"),int:um(s,"migIntT")}; });
  const EF={prov:"",min:200,max:20000};
  const run=cs=>withEXF(EF,()=>partialRCI("distCiudad","pobVar20",cs,false));
  const base=run([]), c1=run(["lpop","edad19"]), c2=run(["lpop","edad19","renta19","prov"]), c2p=run(["lpop","edad19","renta19"]), cprov=run(["prov"]);
  const coast=rows.filter(r=>r[F.distCosta]===0), inland=rows.filter(r=>r[F.distCosta]>0);
  const cc0=withEXF(EF,()=>partialRCI("distCosta","pobVar20",[],false)), cc1=withEXF(EF,()=>partialRCI("distCosta","pobVar20",["lpop","edad19","renta19","prov"],false));
  // efecto en unidades (por cada 10 km) y comparación con el periodo anterior a 2020: ¿es nuevo el gradiente?
  const PD=SER.padYears, pdi=y=>PD.indexOf(y), padOf=r=>{ const sr=SBY.get(r[F.code]); return sr&&sr[SF.pad]; };
  const gPre=r=>{ const p=padOf(r); return p&&p[pdi(2015)]>0&&p[pdi(2019)]>0?(Math.pow(p[pdi(2019)]/p[pdi(2015)],1/4)-1)*100:null; };
  const gPost=r=>{ const p=padOf(r); return p&&p[pdi(2020)]>0&&p[pdi(2025)]>0?(Math.pow(p[pdi(2025)]/p[pdi(2020)],1/5)-1)*100:null; };
  const ZC=[r=>r[F.pop20]>0?Math.log10(r[F.pop20]):null,r=>r[F.edad19],r=>r[F.renta19]];
  const uPost=regFn(rows,{x:r=>r[F.distCiudad]/10,y:gPost,z:ZC,fe:true}), uPre=regFn(rows,{x:r=>r[F.distCiudad]/10,y:gPre,z:ZC,fe:true});
  const uDiff=regFn(rows,{x:r=>r[F.distCiudad]/10,y:r=>{ const a=gPost(r), b=gPre(r); return a!=null&&b!=null?a-b:null; },z:ZC,fe:true});
  const uRaw=regFn(rows,{x:r=>r[F.distCiudad]/10,y:gPost,fe:false});
  const pp=v=>v==null?"—":`${sg2(v)} pp`;
  const s2=res(B,`Cerca de una ciudad crecen ${nf0.format(B5[0].sh)} de cada 100 pueblos; a más de 80 km, ${nf0.format(B5[4].sh)}`,`<p>Municipios de 200 a 20.000 habitantes, agrupados por su distancia a una ciudad grande. Cuanto más lejos, menos pueblos crecen. El crecimiento medio también cae con la distancia, con una excepción: ${B5[1].g>B5[0].g?`los pueblos de 15 a 30 km crecen de media algo más que los de menos de 15 km (${sgn(B5[1].g)} frente a ${sgn(B5[0].g)}), porque entre los más cercanos pesan mucho algunos municipios grandes del cinturón de las ciudades que ya no crecen`:"ninguna"}.</p>`);
  const g=add(s2,"div","cols2");
  const fa=fig(g,{title:"Pueblos que han ganado población desde 2020",source:"% de municipios de cada grupo (cada pueblo cuenta igual). Fuente: INE, padrón 2020–2025; distancia calculada en Indicio."});
  hbars(fa.body,B5.map(b=>({l:b.l,v:b.sh})),{fmt:pc0,color:"--olive",min:0,max:100});
  const fb=fig(g,{title:"Crecimiento medio de la población, 2020–2025",source:"Media ponderada por población (cada persona cuenta igual). Sin ponderar: "+B5.map(b=>`${b.l.toLowerCase()} ${sgn(b.gu)}`).join(", ")+"."});
  hbars(fb.body,B5.map(b=>({l:b.l,v:b.g})),{fmt:sgn,color:"--rust"});
  lect(s2,`<p>A simple vista, la historia de la vuelta al pueblo cercano se confirma: a menos de 15 km de una ciudad, ${nf0.format(B5[0].sh)} de cada 100 pueblos han ganado vecinos desde 2020; a más de 80 km, solo ${nf0.format(B5[4].sh)}. Pero el gráfico no dice por qué. La sección siguiente pone a prueba la explicación alternativa.</p>`);
  const s3=res(B,"¿Es la distancia, o es que los pueblos lejanos son más viejos?",`<p>Los pueblos alejados tienen también más edad media (${nf1.format(B5[4].edad)} años, frente a ${nf1.format(B5[0].edad)} cerca de las ciudades), y la edad por sí sola hace que un pueblo pierda gente. Así que comparamos entre pueblos iguales. La comparación que importa es <b>dentro de cada provincia</b>: la «ciudad grande» de un pueblo de Soria no es la de uno de Madrid, y comparar distancias entre provincias mezcla cosas muy distintas.</p>`);
  const rws=[["Sin descontar nada",base],["Dentro de cada provincia",cprov],["A igual tamaño y edad",c1],["A igual tamaño, edad y renta",c2p],["… y dentro de cada provincia",c2]].filter(x=>x[1]);
  add(s3,"div",null,`<table class="glance" style="max-width:var(--medida)"><thead><tr><th>Comparación</th><th class="r">Relación (r)</th></tr></thead><tbody>${rws.map(([l,c])=>`<tr><td>${l}</td><td class="r num"><b>${rFmt(c.r)}</b>${ciFmt(c.ci)}</td></tr>`).join("")}</tbody></table>`);
  add(s3,"p",null,c2&&Math.abs(c2.r)>=Math.abs(base.r)*0.5?`La relación aguanta: incluso entre pueblos de la misma edad, tamaño y renta, los que están más lejos de una ciudad crecen menos.`:`La relación se debilita mucho: buena parte de lo que parecía efecto de la distancia era la edad de los pueblos alejados. Queda una relación pequeña (${rCI(c2)}) que ${ciZero(c2)?"los datos no distinguen de cero":"sigue siendo distinguible de cero"}.`).style.cssText="max-width:var(--medida);margin-top:10px;font-weight:600";
  add(s3,"p",null,`Al añadir la renta y la provincia la relación ${c2&&c1&&Math.abs(c2.r)>Math.abs(c1.r)?"sube un poco respecto a descontar solo tamaño y edad":"baja"}: ${c2&&c1&&Math.abs(c2.r)>Math.abs(c1.r)?"comparar solo dentro de cada provincia quita el ruido de comparar Soria con Madrid. Por eso la cifra de referencia es la última fila, no la anterior.":"la edad es lo que más explica."}`).style.cssText="max-width:var(--medida);margin-top:6px";
  lect(s3,`<p>Al comparar pueblos de la misma edad, la relación con la distancia pasa de ${rFmt(base.r)} a ${c1?rFmt(c1.r):"—"}: la mayor parte de lo que parecía un efecto de la lejanía era, en realidad, la edad de los pueblos lejanos. Queda algo, pero poco. En cifras: entre pueblos iguales de la misma provincia, cada 10 km más de distancia restan ${pp(uPost&&uPost.b)} de crecimiento anual. Un pueblo a 80 km crece al año unas ${uPost?nf1.format(Math.abs(uPost.b)*7):"—"} décimas menos que uno igual a 10 km.</p>`);
  const s3b=res(B,uDiff&&sigCI(uDiff.ci)?(uDiff.b>0?"El castigo de la distancia se ha suavizado desde 2020":"El castigo de la distancia se ha agravado desde 2020"):"El gradiente ya existía antes de 2020",`<p>Crecimiento anual de la población por cada 10 km más de distancia, entre pueblos de la misma provincia, tamaño, edad y renta. Si la pandemia hubiera desatado una vuelta al pueblo cercano, la pendiente se habría hecho más negativa después de 2020.</p>`);
  table(s3b,["Periodo","Por cada 10 km más lejos","Sin controles"],[["2015–2019",`${pp(uPre&&uPre.b)}${ciPts(uPre&&uPre.ci,sg2)}`,"—"],["2020–2025",`<b>${pp(uPost&&uPost.b)}</b>${ciPts(uPost&&uPost.ci,sg2)}`,`${pp(uRaw&&uRaw.b)}${ciPts(uRaw&&uRaw.ci,sg2)}`],["Cambio entre periodos",`<b>${pp(uDiff&&uDiff.b)}</b>${ciPts(uDiff&&uDiff.ci,sg2)}`,""]]);
  add(s3b,"p","muted","pp = puntos porcentuales de crecimiento anual de la población. Efectos fijos de provincia; controles: log del padrón de 2020, edad media y renta de 2019. Intervalos del 95 % por remuestreo.").style.cssText="font-size:13.5px;margin-top:6px";
  lect(s3b,`<p>Esta comparación desmonta la parte «nueva» de la historia. Si la pandemia hubiera desatado una mudanza a los pueblos cercanos, la desventaja de los lejanos se habría agrandado después de 2020. ${uDiff&&sigCI(uDiff.ci)?`Ha cambiado algo (${pp(uDiff.b)} de diferencia entre periodos), pero poco.`:`No se aprecia: la pendiente de 2020–2025 (${pp(uPost&&uPost.b)}) es muy parecida a la de 2015–2019 (${pp(uPre&&uPre.b)}).`} La distancia ya pesaba antes de la pandemia, y sigue pesando más o menos lo mismo.</p>`);
  // quién llega
  const s4=res(B,`¿Quién llega? ${B5[0].int>B5[4].int*2?"De otras partes de España, solo cerca de las ciudades; del extranjero, en todas partes":"Del extranjero y de otras partes de España"}`,`<p>La Estadística de Migraciones permite separar el saldo con el extranjero del saldo con el resto de España (2021–2024, por cada 1.000 habitantes y año, media simple de los pueblos de cada grupo). El saldo con el resto de España cae con la distancia: ${nf1.format(B5[0].int)} por mil al año a menos de 15 km, ${nf1.format(B5[4].int)} a más de 80. Ese es el rastro de la «vuelta al pueblo» desde la ciudad, y se queda cerca. El saldo con el extranjero es positivo en todas las distancias${B5[4].ext>B5[0].ext?` y, de hecho, mayor lejos de las ciudades (${nf1.format(B5[4].ext)} frente a ${nf1.format(B5[0].ext)})`:""}: es lo que sostiene a muchos pueblos alejados.</p>`);
  const fm=fig(s4,{title:"Saldo migratorio anual por cada 1.000 habitantes, 2021–2024",source:"Media simple de los municipios de cada grupo. Fuente: INE, Estadística de Migraciones y Cambios de Residencia."});
  const w=add(fm.body,"div","cmp"); const mx=d3.max(B5,b=>Math.max(Math.abs(b.ext),Math.abs(b.int)))||1;
  w.innerHTML=`<div class="keys"><span><i style="background:var(--rust)"></i>Con el resto de España</span><span><i style="background:var(--slate)"></i>Con el extranjero</span></div>`+B5.map(b=>`<div class="cmp-row"><div class="n">${b.l}</div><div class="bars">${[[b.int,"--rust"],[b.ext,"--slate"]].map(([v,c])=>`<div class="b"><span style="width:${Math.abs(v)/mx*100}%;background:var(${c})"></span><em>${(v>0?"+":"")+nf1.format(v)}</em></div>`).join("")}</div></div>`).join("");
  lect(s4,`<p>La gente que llega a los pueblos desde otras partes de España, que incluye a quienes salen de las ciudades, se concentra cerca de ellas: ${nf1.format(B5[0].int)} por cada 1.000 habitantes y año a menos de 15 km, ${nf1.format(B5[4].int)} a más de 80. Esa es la «vuelta al pueblo», y existe. Pero lo que mantiene vivos a los pueblos lejanos es otra cosa: la inmigración extranjera, que llega con parecida intensidad a todas las distancias (${nf1.format(B5[4].ext)} por mil lejos de las ciudades).</p>`);
  res(B,"¿Y la costa? Crece, pero por otras razones",`<p>Los municipios con costa han crecido de media un ${sgn(wm(coast,"pobVar20"))} desde 2020; los de interior, un ${sgn(wm(inland,"pobVar20"))}. Han ganado población ${nf0.format(share(coast))} de cada 100 pueblos costeros y ${nf0.format(share(inland))} de cada 100 de interior. Pero la costa también es más joven y más rica: entre pueblos de la misma provincia, tamaño, edad y renta, la relación entre distancia a la costa y crecimiento pasa de ${cc0?rFmt(cc0.r):"—"} a ${cc1?rFmt(cc1.r)+ciFmt(cc1.ci):"—"}${cc1&&ciZero(cc1)?": se queda en nada":""}.</p>`);
  return {B5,uPost,uPre,uDiff,base,c1,c2,pp,coast,inland,cc1};
}
function studyVotar(B){
  const AB=abstract(B);
  const k=VG(), rows=rowsAll().filter(r=>r[F.part]!=null&&r[F.pop]);
  const bands=[[0,500,"Menos de 500"],[500,2000,"500 a 2.000"],[2000,10000,"2.000 a 10.000"],[10000,50000,"10.000 a 50.000"],[50000,1e9,"Más de 50.000"]];
  const wm=(rs,kk)=>{ const s=rs.filter(r=>r[F[kk]]!=null&&r[F.pop]); const w=d3.sum(s,r=>r[F.pop]); return w?d3.sum(s,r=>r[F[kk]]*r[F.pop])/w:null; };
  const B5=bands.map(([a,b,l])=>{ const s=rows.filter(r=>r[F.pop]>=a&&r[F.pop]<b); return {l:l+" hab.",p:wm(s,"part"),e:wm(s,"edad")}; });
  const EF={prov:"",min:0,max:Infinity};
  const sz0=withEXF(EF,()=>lpopPartial("part",[])), sz1=withEXF(EF,()=>lpopPartial("part",["edad"])), sz2=withEXF(EF,()=>lpopPartial("part",["edad","renta"])), sz3=withEXF(EF,()=>lpopPartial("part",["mayores65","renta"]));
  const ed0=withEXF(EF,()=>partialRCI("edad","part",["prov"],false)), ed1=withEXF(EF,()=>partialRCI("edad","part",["lpop","prov"],false));
  const m0=withEXF(EF,()=>partialRCI("mayores65","part",["prov"],false)), m1=withEXF(EF,()=>partialRCI("mayores65","part",["lpop","prov"],false));
  // cambios dentro de cada municipio, 2019 → 2023: lo fijo del lugar desaparece
  const ch0=withEXF(EF,()=>lpopPartial("partCambio",[])), ch1=withEXF(EF,()=>lpopPartial("partCambio",["edadCambio"]));
  const rowsCh=withEXF(EF,()=>rowsAll().filter(r=>exOK(r)&&r[F.partCambio]!=null&&r[F.pop]));
  // efecto en unidades: participación por cada vez que se multiplica por 10 el tamaño, a igual edad y renta, dentro de provincia
  const lp=r=>r[F.pop]>0?Math.log10(r[F.pop]):null, u0=regFn(rows,{x:lp,y:r=>r[F.part],fe:true}), u2=regFn(rows,{x:lp,y:r=>r[F.part],z:[r=>r[F.edad],r=>r[F.renta]],fe:true}), u3=regFn(rows,{x:lp,y:r=>r[F.part],z:[r=>r[F.mayores65],r=>r[F.renta]],fe:true});
  const uE=regFn(rows,{x:r=>r[F.mayores65],y:r=>r[F.part],z:[lp,r=>r[F.renta]],fe:true});
  const uCh=regFn(rowsAll().filter(r=>r[F.partCambio]!=null&&r[F.pop]),{x:lp,y:r=>r[F.partCambio],z:[r=>r[F.edadCambio]],fe:true});
  const chB=bands.map(([a,b,l])=>{ const s=rowsCh.filter(r=>r[F.pop]>=a&&r[F.pop]<b); return {l:l+" hab.",v:wm(s,"partCambio")}; });
  sec(B,"ctx",`<p>La participación electoral es más alta en los pueblos que en las ciudades. En las ${ELNAME(k)}, en los municipios de menos de 500 habitantes votó el ${pc(B5[0].p)} del censo; en los de más de 50.000, el ${pc(B5[4].p)}. Casi ${nf0.format(B5[0].p-B5[4].p)} puntos de diferencia, un margen que en unas elecciones reñidas decide escaños.</p>
    <p>Hay dos explicaciones posibles, y dicen cosas muy distintas sobre la democracia. La primera es la <b>comunidad</b>: en un pueblo todo el mundo se conoce, votar es casi un acto social y quien no va se nota. La segunda es la <b>demografía</b>: en los pueblos hay más gente mayor, y los mayores votan más en todas partes. Si es lo primero, el tamaño de la comunidad importa por sí mismo; si es lo segundo, los pueblos no tienen nada especial, solo más jubilados.</p>`);
  sec(B,"int",`<p>Participación sobre el censo en las ${ELNAME(k)} en ${nf0.format(rows.length)} municipios; tamaño (padrón), edad media y porcentaje de mayores de 65, y renta por persona. Como segunda fuente de variación, el cambio de participación entre las generales de noviembre de 2019 y julio de 2023 en cada municipio.</p>`,{title:"Con qué datos"});
  sec(B,"ana",`<ol class="defs"><li><b>Separar tamaño y edad:</b> correlación y pendiente parciales del tamaño (en log) descontando la edad y la renta, y de la edad descontando el tamaño, siempre dentro de cada provincia.</li><li><b>Efecto en puntos:</b> cuántos puntos de participación separan a un municipio de otro diez veces más grande, a igual edad y renta.</li><li><b>Cambios en el mismo municipio:</b> comparar cómo cambió la participación entre 2019 y 2023 elimina todo lo que es fijo en cada lugar (su cultura de voto, un censo inflado).</li></ol>`);
  const s2=res(B,"Cuanto más pequeño el municipio, más se vota y más mayor es su población",`<p>Cuanto más pequeño el municipio, más se vota y más mayor es su población. Las dos cosas van juntas, así que hay que separarlas.</p>`);
  const g=add(s2,"div","cols2");
  const fa=fig(g,{title:`Participación, ${ELSHORT(k)}`,source:"% del censo. Fuente: Ministerio del Interior."}); hbars(fa.body,B5.map(b=>({l:b.l,v:b.p})),{fmt:pc,color:"--slate",min:0,max:100});
  const fb=fig(g,{title:"Edad media",source:"Fuente: INE, Atlas de Renta."}); hbars(fb.body,B5.map(b=>({l:b.l,v:b.e})),{fmt:v=>nf1.format(v)+NB+"años",color:"--mustard",min:0});
  lect(s2,`<p>Las dos barras cuentan la misma historia por partida doble: cuanto más pequeño el municipio, más se vota y más mayor es su gente. Las dos cosas van tan juntas que mirándolas por separado es imposible saber cuál explica la participación. Hay que compararlas a igualdad de la otra.</p>`);
  const s3=res(B,u2&&sigCI(u2.ci)?"Entre municipios de la misma edad y renta, los pequeños siguen votando más":"Entre municipios de la misma edad y renta, el tamaño apenas cuenta",`<p>En puntos: un municipio diez veces más grande vota ${u0?`${sg2(u0.b)} puntos${ciPts(u0.ci,sg2)}`:"—"} dentro de su provincia; a igual edad media y renta, ${u2?`${sg2(u2.b)}${ciPts(u2.ci,sg2)}`:"—"}; a igual porcentaje de mayores y renta, ${u3?`${sg2(u3.b)}${ciPts(u3.ci,sg2)}`:"—"}. Cada 10 puntos más de mayores de 65, a igual tamaño y renta: ${uE?`${sg2(uE.b*10)} puntos${ciPts(uE.ci&&[uE.ci[0]*10,uE.ci[1]*10],sg2)}`:"—"}.</p><p>Medimos la relación entre el tamaño del municipio y la participación tres veces: sin más, entre municipios con la misma edad media, y además con la misma renta. Y al revés: la relación entre edad y participación entre municipios del mismo tamaño. Todo dentro de cada provincia.</p>`);
  add(s3,"div",null,`<table class="glance" style="max-width:var(--medida)"><thead><tr><th>Relación con la participación</th><th class="r">r</th></tr></thead><tbody>
    ${[["Tamaño (cuanto más grande…)",sz0],["Tamaño, a igual edad media",sz1],["Tamaño, a igual edad media y renta",sz2],["Tamaño, a igual % de mayores de 65 y renta",sz3],["Edad media",ed0],["Edad media, a igual tamaño",ed1],["% de mayores de 65",m0],["% de mayores de 65, a igual tamaño",m1]].filter(x=>x[1]).map(([l,c])=>`<tr><td>${l}</td><td class="r num"><b>${rFmt(c.r)}</b>${ciFmt(c.ci)}</td></tr>`).join("")}</tbody></table>`);
  add(s3,"p",null,`La edad media mezcla dos cosas (pocos niños y muchos mayores); el porcentaje de mayores de 65 es la medida más directa de «población mayor», y da ${m1&&ed1&&Math.abs(m1.r)>Math.abs(ed1.r)?"una relación algo más fuerte":"una relación parecida"}.`).style.cssText="max-width:var(--medida);margin-top:8px;font-size:14.5px;color:var(--ink-2)";
  lect(s3,`<p>El resultado es claro: <b>el tamaño pesa por sí solo</b>. Entre municipios con la misma edad media y la misma renta de la misma provincia, uno diez veces más pequeño sigue votando ${u2?nf1.format(Math.abs(u2.b)):"—"} puntos más. La edad, en cambio, ${uE&&!sigCI(uE.ci)?"añade muy poco una vez descontados el tamaño y la renta":"también cuenta, aunque menos"}. Lo de los pueblos no es solo que haya más jubilados.</p>`);
  const keep=sz0&&sz2?Math.abs(sz2.r)/Math.abs(sz0.r):null;
  // cambios 2019 → 2023
  const s3b=res(B,"Dentro de cada municipio: cómo cambió la participación de 2019 a 2023",`<p>Entre las generales de noviembre de 2019 y las de julio de 2023 la participación ${REFS&&VREFS.es["02202307"].turnout>VREFS.es["02201911"].turnout?"subió":"bajó"} en España. Mirando el <b>cambio</b> dentro de cada municipio desaparece todo lo que es fijo del lugar (su cultura de voto, su censo inflado). Si los pueblos pequeños votan más por ser pequeños, cabe esperar que su participación aguante mejor en una elección en pleno julio.</p>`);
  const fc=fig(s3b,{title:"Cambio de la participación, 2019 → 2023, según el tamaño",source:"Puntos de participación sobre el censo, media ponderada. Fuente: Ministerio del Interior."});
  hbars(fc.body,chB.map(b=>({l:b.l,v:b.v})),{fmt:v=>pts(v)+" pts",color:"--plum"});
  add(s3b,"p",null,`Un municipio diez veces más grande cambió ${uCh?`${sg2(uCh.b)} puntos${ciPts(uCh.ci,sg2)}`:"—"} de participación respecto a otro de su provincia con el mismo cambio de edad. Relación entre el tamaño y el cambio, dentro de cada provincia: ${ch0?rCI(ch0):"—"}${ch1?`; descontando cómo cambió la edad media, ${rCI(ch1)}`:""}. ${ch0&&!ciZero(ch0)&&ch0.r<0?"Los pequeños aguantaron mejor: refuerza que el tamaño importa por sí mismo.":ch0&&!ciZero(ch0)?"Los grandes recuperaron más participación en 2023: lo que vimos arriba puede ser en parte un rasgo fijo de cada lugar, no del tamaño.":"Los datos no distinguen el cambio de participación por tamaño."}`).style.cssText="max-width:var(--medida);margin-top:8px";
  lect(s3b,`<p>Esta segunda prueba es más exigente, porque compara cada municipio consigo mismo: entre 2019 y 2023 su cultura de voto, su censo o su historia no cambiaron. En unas generales en pleno julio, cuando muchos estaban de vacaciones, la participación ${VREFS.es["02202307"].turnout>VREFS.es["02201911"].turnout?"subió":"bajó"} en el conjunto del país, pero los pueblos pequeños aguantaron mejor que las ciudades. Es lo esperable si votar en un pueblo tiene algo de compromiso social que no depende del calendario.</p>`);
  if(u3&&uE){ const mp=d3.mean(rows,r=>r[F.part]), ml=d3.mean(rows.filter(r=>lp(r)!=null),lp), mm=d3.mean(rows.filter(r=>r[F.mayores65]!=null),r=>r[F.mayores65]);
    const sg=res(B,"Entre el blanco y el negro: ¿cuánto es tamaño y cuánto es edad?",`<p>Construye un municipio y mira cuánto se vota en él según los datos reales: cuántos habitantes tiene y qué parte de su población pasa de 65 años. Verás cuánto del voto extra viene del tamaño y cuánto de la edad.</p>`);
    const lg=v=>Math.round(Math.pow(10,v));
    playBox(sg,{defs:[["l","Habitantes",1.7,5,0.1,"Escala logarítmica: de unos 50 a 100.000.",v=>nf0.format(lg(v))],["m","Habitantes de 65 años o más",5,45,1,"% de la población. La media está en "+nf0.format(mm)+" %.",v=>v+NB+"%"]],
      pre:[["Pueblo pequeño y mayor",{l:2.4,m:35}],["Pueblo joven de tamaño medio",{l:3.4,m:18}],["Ciudad",{l:5,m:19}]],
      render:st=>{ const dS=u3.b*(st.l-ml), dE=uE.b*(st.m-mm), pr=Math.max(0,Math.min(100,mp+dS+dE));
        return `<div class="big">${nf1.format(pr)}${NB}% <span class="muted" style="font-size:16px;font-weight:400">de participación esperada</span></div>
          <p>La media de los municipios es el ${nf1.format(mp)}${NB}%. De la diferencia, <b>${pts(dS)} puntos son por el tamaño</b> y <b>${pts(dE)} por la edad</b>.</p>
          <p class="muted" style="font-size:14px">Es un promedio dentro de cada provincia: un municipio concreto puede alejarse mucho, por su historia o por quién se presente.</p>`; }});
    lect(sg,`<p>Prueba un pueblo pequeño y viejo y uno pequeño y joven: en estos datos casi todo el voto extra viene del tamaño y muy poco de la edad. Aun así, ninguna de las dos explica todo.</p>`); }
  sec(B,"con",`<p>${keep==null?"":keep>=0.6?`Las dos cosas cuentan, pero el tamaño pesa por sí solo: incluso entre municipios de la misma edad y renta, cuanto más pequeño, más se vota.`:keep>=0.3?`Una parte es la edad, pero no toda: entre municipios de la misma edad y renta, los pequeños siguen votando algo más.`:`Casi todo es la edad: entre municipios de la misma edad y renta, el tamaño apenas importa.`}</p>
    <p>En los pueblos se vota más no solo porque sean más viejos. Algo en el tamaño de la comunidad, que todos se conozcan, que el colegio electoral esté a dos calles y que votar sea un acto visible, empuja a participar. Para quien se preocupa por la abstención en las ciudades, el dato sugiere que la cercanía importa: no solo quién vive en un sitio, sino cómo de próximos se sienten entre ellos.</p>
    <ul class="defs"><li><b>El censo de los pueblos pequeños puede estar «inflado»</b> con gente empadronada que vive fuera y no vota, lo que bajaría su participación. Aun así votan más.</li>
    <li><b>Son datos de municipios, no de personas.</b> No dicen que cada persona mayor vote más, sino que los municipios con más edad media tienen más participación.</li>
    <li><b>Sin voto exterior:</b> los residentes en el extranjero no están en estos datos.</li></ul>
    <p style="margin-top:10px">${exLink("cruce",{d:["densidad","part"],t:"",c:["edad"],lx:1},"Ponlo a prueba en el laboratorio")}</p>`);
  AB.fill({ctx:"En los pueblos se vota más que en las ciudades: ¿por ser pequeños o por tener una población mayor?",intT:"Con qué datos",int:`Participación en las ${ELNAME(k)} y su cambio desde 2019 en ${nf0.format(rows.length)} municipios.`,ana:"Correlaciones y pendientes parciales con efectos fijos de provincia, separando tamaño y edad; cambios dentro del mismo municipio entre 2019 y 2023.",res:`A igual edad y renta, un municipio diez veces más grande vota ${u2?sg2(u2.b):"—"} puntos; entre 2019 y 2023, los pequeños aguantaron mejor (${uCh?sg2(uCh.b):"—"} puntos por cada ×10 de tamaño).`,con:(keep!=null&&keep>=0.6?"El tamaño pesa por sí solo: no es solo demografía.":"Una parte es demografía y otra, tamaño.")+(uE&&!sigCI(uE.ci)?" La edad añade poco una vez descontados el tamaño y la renta.":" La edad también cuenta.")});
  methods(B,[["Qué se hace","Se separa el efecto del tamaño del municipio y el de la edad de su población comparando municipios que solo se diferencian en una de las dos cosas, y se mira cómo cambió la participación en cada municipio entre 2019 y 2023."],["Unidad",`${nf0.format(rows.length)} municipios con datos de participación`],["Variables",`Participación sobre el censo en las ${ELNAME(k)}; tamaño en log del padrón; edad media y % de mayores de 65 (Atlas de Renta, 2023); renta por persona (2024). Cambio 2019–2023: puntos de participación entre las generales de noviembre de 2019 y julio de 2023`],["Especificación","Correlación y pendiente parciales por residuos con efectos fijos de provincia; tamaño en log10 del padrón (un punto = diez veces más grande)."],["Ponderación","Las correlaciones y pendientes no van ponderadas (cada municipio cuenta igual); las medias por tamaño sí"],["Modelo",FICHA_R]]);
}
// =====================================================================
// ESTUDIOS NUEVOS (auditoría 2026): renta por fuentes, quién gobierna (discontinuidad), AVE, prohibir pisos turísticos
// =====================================================================
const km=(a,b)=>{ const R=6371, dLat=(b[1]-a[1])*Math.PI/180, dLon=(b[0]-a[0])*Math.PI/180, x=Math.sin(dLat/2)**2+Math.cos(a[1]*Math.PI/180)*Math.cos(b[1]*Math.PI/180)*Math.sin(dLon/2)**2; return 2*R*Math.asin(Math.sqrt(x)); };
// quintiles de población según una variable
function quintiles(rows,val,w=r=>r[F.pop]){ const s=rows.slice().sort((a,b)=>val(a)-val(b)), tot=d3.sum(s,w); let acc=0; const G=[[],[],[],[],[]]; s.forEach(r=>{ G[Math.min(4,Math.floor((acc+w(r)/2)/tot*5))].push(r); acc+=w(r); }); return G; }
// gemelos: para cada tratado, el candidato más cercano en las variables dadas (estandarizadas), sin repetir
function matchTwins(treated,pool,feat,{maxD=1.2}={}){
  const all=treated.concat(pool), K=feat(all[0]).length, sd=Array.from({length:K},(_,k)=>d3.deviation(all,r=>feat(r)[k])||1);
  const used=new Set(), out=[];
  treated.forEach(t=>{ const ft=feat(t); let best=null; pool.forEach(c=>{ if(used.has(c)) return; const fc=feat(c); const d=Math.sqrt(d3.sum(ft,(v,k)=>((v-fc[k])/sd[k])**2)); if(!best||d<best.d) best={d,c}; }); if(best&&best.d<=maxD){ used.add(best.c); out.push({t,c:best.c,d:best.d}); } });
  return out;
}
// tabla sencilla
function table(parent,head,rows,{max=0}={}){ const t=add(parent,"div","extable"); t.innerHTML=`<table class="glance" style="max-width:${max?max+"px":"var(--medida)"}"><thead><tr>${head.map((h,i)=>`<th${i?' class="r"':""}>${h}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map((c,i)=>`<td${i?' class="r num"':""}>${c}</td>`).join("")}</tr>`).join("")}</tbody></table>`; return t; }

// ---------- renta por fuentes: ¿quién ha subido la renta de los pueblos pobres? ----------
// Renta por fuentes: de dónde sale el crecimiento de los municipios pobres. Se pinta dentro de «convergencia».
function fuentesRes(B){
  const Y=SER.years, NS=SER.fuentes.length, iy=y=>Y.indexOf(y), LAB=["Salarios","Pensiones","Prestaciones por desempleo","Otras prestaciones (IMV, ayudas…)","Otros ingresos (capital, autónomos…)"], COL=["--rust","--slate","--mustard","--plum","--stone"];
  // euros por persona de cada fuente y año (renta × %)
  const M=[]; SER.rows.forEach(r=>{ const re=r[SF.renta], fu=r[SF.fuentes], x=BYCODE.get(r[0]); if(!re||!fu||!x||(x[F.pop]||0)<1000) return; const ok=[2015,2019,2023].every(y=>re[iy(y)]&&fu.every(f=>f[iy(y)]!=null)); if(!ok) return;
    M.push({code:r[0],prov:r[1],pop:x[F.pop],re,eur:fu.map(f=>re.map((v,i)=>v&&f[i]!=null?v*f[i]/100:null))}); });
  const G=quintiles(M,m=>m.re[iy(2015)],m=>m.pop), gl=["20 % más pobre en 2015","Segundo 20 %","20 % central","Cuarto 20 %","20 % más rico en 2015"];
  const wmean=(g,fn)=>d3.sum(g,m=>fn(m)*m.pop)/d3.sum(g,m=>m.pop);
  // contribución de cada fuente al crecimiento 2015–2023, en puntos de la renta de 2015
  const contrib=(g,y0,y1)=>{ const base=wmean(g,m=>m.re[iy(y0)]); return {tot:(wmean(g,m=>m.re[iy(y1)])/base-1)*100, parts:Array.from({length:NS},(_,k)=>(wmean(g,m=>m.eur[k][iy(y1)])-wmean(g,m=>m.eur[k][iy(y0)]))/base*100)}; };
  const C=G.map(g=>contrib(g,2015,2023));
  // tres golpes: SMI 2019, prestaciones 2020, pensiones 2023. Para cada uno, relación entre la exposición y el salto de esa fuente, en el año del golpe y en los demás (placebo)
  const yrsG=Y.slice(1,9); // 2016..2023
  const jumpR=(k,expo,y)=>{ const pts=M.map(m=>{ const a=m.eur[k][iy(y)-1], b=m.eur[k][iy(y)]; return a&&b!=null?{r:m,x:expo(m),y:(b-a)/m.re[iy(y)-1]*100,w:m.pop}:null; }).filter(Boolean); const g=pts.map(p=>p.r.prov), w=pts.map(p=>p.w); const X=demeanBy(pts.map(p=>p.x),g,w), YY=demeanBy(pts.map(p=>p.y),g,w); const c=wcorr(X.map((v,i)=>({x:v,y:YY[i],w:w[i]}))); return c?c.r:null; };
  const SH=[{n:"Subida del salario mínimo (+22 % en 2019)",k:0,y:2019,expo:m=>-m.re[iy(2018)],el:"menor renta en 2018"},{n:"Prestaciones de la pandemia e Ingreso Mínimo Vital (2020)",k:2,y:2020,expo:m=>-m.re[iy(2019)],el:"menor renta en 2019"},{n:"Revalorización de las pensiones con el IPC (+8,5 % en 2023)",k:1,y:2023,expo:m=>m.eur[1][iy(2022)]/m.re[iy(2022)],el:"mayor peso de las pensiones en 2022"}];
  // descomposición de la convergencia β por fuentes: la pendiente del crecimiento total sobre ln(renta inicial) es la suma de las pendientes de cada fuente
  const fake=M.map(m=>{ const o={}; o[F.prov]=m.prov; o.m=m; return o; });
  const gK=(o,k)=>(o.m.eur[k][iy(2023)]-o.m.eur[k][iy(2015)])/o.m.re[iy(2015)]*100, lx=o=>Math.log(o.m.re[iy(2015)]);
  const BK=d3.range(NS).map(k=>regFn(fake,{x:lx,y:o=>gK(o,k),fe:true,w:o=>o.m.pop})), BT=regFn(fake,{x:lx,y:o=>d3.sum(d3.range(NS),k=>gK(o,k)),fe:true,w:o=>o.m.pop});
  SH.forEach(h=>{ h.rows=yrsG.map(y=>({y,r:jumpR(h.k,h.expo,y)})); h.real=h.rows.find(x=>x.y===h.y).r; h.pl=placeboRank(h.real,h.rows.filter(x=>x.y!==h.y).map(x=>x.r)); });
  const s3=res(B,"Quién puso el dinero en cada grupo",`<p>Crecimiento de la renta por persona entre 2015 y 2023, en % de la renta de 2015, repartido entre las cinco fuentes. ${C[0].parts[1]+C[0].parts[3]>C[4].parts[1]+C[4].parts[3]?`En el quinto más pobre, pensiones y otras prestaciones aportan ${nf0.format(C[0].parts[1]+C[0].parts[3])} puntos de los ${nf0.format(C[0].tot)} de crecimiento; en el más rico, ${nf0.format(C[4].parts[1]+C[4].parts[3])} de ${nf0.format(C[4].tot)}.`:""} ${C[0].parts[0]>C[4].parts[0]?`Pero los salarios también aportan más en los pobres (${nf0.format(C[0].parts[0])} puntos frente a ${nf0.format(C[4].parts[0])}): no es solo transferencia.`:`Los salarios aportan parecido o menos en los pobres (${nf0.format(C[0].parts[0])} puntos frente a ${nf0.format(C[4].parts[0])}): la convergencia es sobre todo transferencia.`}</p>`);
  const f=fig(s3,{title:"De dónde viene el crecimiento de la renta, 2015–2023",source:"Municipios de 1.000 habitantes o más, en cinco grupos con la misma población según la renta de 2015. Puntos de la renta de 2015. Fuente: INE, Atlas de Distribución de Renta de los Hogares (renta por fuentes)."});
  const mx=d3.max(C,c=>d3.sum(c.parts,v=>Math.max(0,v)))||1;
  const w=add(f.body,"div","cmp"); w.innerHTML=`<div class="keys">${LAB.map((l,k)=>`<span><i style="background:var(${COL[k]})"></i>${l}</span>`).join("")}</div>`+C.map((c,i)=>`<div class="cmp-row"><div class="n">${gl[i]}<small>${sgn(c.tot)} en total</small></div><div class="bars"><div class="b" style="display:flex;gap:1px;height:16px;align-items:stretch">${c.parts.map((v,k)=>v>0?`<span style="width:${v/mx*100}%;background:var(${COL[k]});display:block" title="${LAB[k]}: ${pts(v)} puntos"></span>`:"").join("")}</div></div></div>`).join("");
  table(s3,["Fuente","20 % más pobre","20 % más rico"],LAB.map((l,k)=>[l,pts(C[0].parts[k])+" pts",pts(C[4].parts[k])+" pts"]).concat([["<b>Total</b>","<b>"+sgn(C[0].tot)+"</b>","<b>"+sgn(C[4].tot)+"</b>"]]));
  lect(s3,`<p>En los municipios más pobres, la renta por persona creció un ${nf0.format(C[0].tot)}${NB}% entre 2015 y 2023. De esos puntos, ${nf0.format(C[0].parts[0])} vinieron de los salarios y ${nf0.format(C[0].parts[1]+C[0].parts[3])} de pensiones y otras prestaciones. En los más ricos creció un ${nf0.format(C[C.length-1].tot)}${NB}%: ${nf0.format(C[C.length-1].parts[0])} puntos de salarios y ${nf0.format(C[C.length-1].parts[1]+C[C.length-1].parts[3])} de pensiones y prestaciones. ${C[0].parts[0]>=C[0].parts[1]+C[0].parts[3]?"La primera sorpresa: incluso en los municipios pobres, donde las pensiones pesan tanto, los salarios son la fuente que más ha empujado.":"En los municipios pobres, las transferencias empujan más que los salarios."}</p>`);
  const sB=res(B,"Qué fuentes explican la convergencia",`<p>La convergencia β (cuánto más crecen los municipios de renta baja) se puede repartir exactamente entre las fuentes: la pendiente del crecimiento total sobre el logaritmo de la renta inicial es la suma de las pendientes de cada fuente. Una pendiente negativa en una fuente quiere decir que esa fuente creció más, en proporción, donde la renta era baja.</p>`);
  table(sB,["Fuente","Pendiente (pp por log de renta inicial)","Parte de la convergencia"],LAB.map((l,k)=>[l,BK[k]?`${sg2(BK[k].b)}${ciPts(BK[k].ci,sg2)}`:"—",BK[k]&&BT?(BK[k].b/BT.b<0?"−":"")+pc0(Math.abs(BK[k].b/BT.b*100)):"—"]).concat([["<b>Total</b>",BT?`<b>${sg2(BT.b)}</b>${ciPts(BT.ci,sg2)}`:"—","100 %"]]));
  const shr=k=>BK[k]&&BT?BK[k].b/BT.b*100:null, shO=shr(4);
  lect(sB,`<p>Esta tabla responde a la pregunta con un número. La convergencia, que los pobres crezcan más que los ricos, se reparte entre las fuentes como se reparte una suma: <b>los salarios explican el ${pc0(shr(0))}</b>, las pensiones el ${pc0(shr(1))}, las prestaciones por desempleo el ${pc0(shr(2))} y otras prestaciones el ${pc0(shr(3))}. Los «otros ingresos» (rentas del capital, actividades por cuenta propia) ${shO<0?`van en sentido contrario y restan un ${pc0(Math.abs(shO))}: crecieron más donde ya había más renta`:`aportan un ${pc0(shO)}`}.</p><p>Las partes suman 100${NB}% con su signo. Por eso salarios y transferencias, sumados, superan el 100${NB}%: compensan lo que restan los otros ingresos.</p>`);
  add(sB,"p","muted","Crecimiento 2015–2023 de cada fuente, en puntos de la renta de 2015, sobre ln(renta de 2015); efectos fijos de provincia; ponderado por población. Las partes pueden ser negativas (una fuente que creció más donde la renta era alta) o superar el 100 %.").style.cssText="font-size:13.5px;margin-top:6px";
  const s4=res(B,"Tres medidas con fecha: su huella en el año en que entraron",`<p>Para cada medida: relación (dentro de cada provincia, ponderada por población) entre lo expuesto que estaba cada municipio y cuánto saltó esa fuente de renta en el año de la medida, en puntos de la renta del año anterior. Y lo mismo en los demás años, como placebo.</p>`);
  SH.forEach(h=>{ const mxr=d3.max(h.rows,x=>Math.abs(x.r||0))||1; const ff=fig(s4,{title:h.n,source:`Relación entre ${h.el} y el salto de «${low(LAB[h.k])}» en cada año. En granate, el año de la medida.`});
    hbars(ff.body,h.rows.map(x=>({l:String(x.y),v:x.r,c:x.y===h.y?"--rust":"--stone"})),{fmt:v=>rFmt(v)});
    add(s4,"p",null,`${h.y}: r = ${rFmt(h.real)}. ${h.pl?(h.pl.below===h.pl.n?"Es el año con la relación más fuerte de toda la serie: la medida llegó donde más falta hacía.":h.pl.share>=0.75?"Está entre los años con relación más fuerte, pero no es único.":"No destaca frente a los otros años: la medida no se ve en estos datos, o se diluye entre otras cosas que pasaron ese año."):""}`).style.cssText="max-width:var(--medida);margin:-6px 0 14px;font-size:14.5px"; });
  lect(s4,`<p>La forma de leer estos tres gráficos es buscar si la barra granate, la del año de la medida, destaca sobre las demás. Si el salario mínimo subió los sueldos en los municipios pobres, el salto de los salarios en 2019 debería estar más ligado a ser pobre que el de cualquier otro año. ${(()=>{ const nm=x=>"«"+x.n.split(" (")[0].toLowerCase()+"»", ok=SH.filter(x=>x.pl&&x.pl.share>=0.75), no=SH.filter(x=>!(x.pl&&x.pl.share>=0.75)); return (ok.length?`Destacan: ${ok.map(nm).join(" y ")}. Ahí la medida deja huella justo en su año.`:"Ninguna destaca con claridad.")+(no.length?` ${no.map(nm).join(" y ")} no destaca: la medida se repartió de forma parecida en todas partes, o se diluye entre otras cosas que pasaron ese año.`:""); })()}</p>`);
  return {BK,BT,SH,C,shr,LAB,M,hit:SH.filter(h=>h.pl&&h.pl.share>=0.75),miss:SH.filter(h=>!(h.pl&&h.pl.share>=0.75))};
}

// ---------- ¿importa quién gobierna? discontinuidad en las municipales de 2019 ----------
async function studyGobierna(B){
  const AB=abstract(B); await loadCausales();
  const OUT=[["pobVar1925","Población, 2019 → 2025"],["paroVar1923","Paro registrado, 2019 → 2023"],["rentaVar1923","Renta por persona, 2019 → 2023"],["dchaCambio","Voto a PP y Vox en las generales, 2019 → 2023 (puntos)"]];
  const M=[]; SER.rows.forEach(r=>{ const m=r[SF.mun]&&r[SF.mun][0], x=BYCODE.get(r[0]); if(!m||!x||(x[F.pop]||0)<250) return; const fam=m.map(l=>l[0]); if(!(fam.includes("PP")&&fam.includes("PSOE"))) return; const pp=m.find(l=>l[0]==="PP")[1], ps=m.find(l=>l[0]==="PSOE")[1]; M.push({code:r[0],row:x,s:r,m:ps-pp,win:ps>pp?"PSOE":"PP"}); });
  const H=10;
  // regresión local lineal con núcleo triangular a cada lado del corte c, ancho h
  const fitW=pts=>{ const W=d3.sum(pts,p=>p.w); if(!W) return null; const mx=d3.sum(pts,p=>p.w*p.x)/W, my=d3.sum(pts,p=>p.w*p.y)/W; let sxy=0,sxx=0; pts.forEach(p=>{ sxy+=p.w*(p.x-mx)*(p.y-my); sxx+=p.w*(p.x-mx)**2; }); const b=sxx?sxy/sxx:0; return {a:my-b*mx,b,n:pts.length}; };
  const jumpAt=(pts,c,h=H)=>{ const k=p=>({...p,w:Math.max(0,1-Math.abs(p.x-c)/h)}); const L=pts.filter(p=>p.x<c&&p.x>=c-h).map(k), R=pts.filter(p=>p.x>=c&&p.x<=c+h).map(k); if(L.length<25||R.length<25) return null; const l=fitW(L), r=fitW(R); return {j:(r.a+r.b*c)-(l.a+l.b*c),l,r,nL:L.length,nR:R.length}; };
  const rd=(pts,c=0,h=H,B_=200)=>{ const j=jumpAt(pts,c,h); if(!j) return null; const ci=bootCI(pts.filter(p=>Math.abs(p.x-c)<=h),s=>{ const q=jumpAt(s,c,h); return q?q.j:null; },{B:B_}); return {...j,ci}; };
  const ptsOf=f=>M.map(d=>({x:d.m,y:f(d)})).filter(p=>p.y!=null&&isFinite(p.y));
  const est=OUT.map(([k,l])=>{ const pts=ptsOf(d=>d.row[F[k]]); const j=rd(pts);
    const naive=(()=>{ const A=M.filter(d=>d.win==="PSOE"&&d.row[F[k]]!=null), Bq=M.filter(d=>d.win==="PP"&&d.row[F[k]]!=null); return d3.mean(A,d=>d.row[F[k]])-d3.mean(Bq,d=>d.row[F[k]]); })();
    const bw=[5,7.5,10,15,20].map(h=>({h,r:rd(pts,0,h,120)})), plc=[-6,-4,4,6].map(c=>({c,r:rd(pts,c,H,100)}));
    return {k,l,pts,j,ci:j&&j.ci,naive,bw,plc}; });
  // equilibrio: variables anteriores a la elección no deberían saltar en el corte
  const PD=SER.padYears, PY=SER.paroYears, YR=SER.years;
  const pre=[["Población 2015 → 2019 (%)",d=>{ const p=d.s[SF.pad]; return p&&p[PD.indexOf(2015)]>0?(p[PD.indexOf(2019)]/p[PD.indexOf(2015)]-1)*100:null; }],["Paro registrado 2015 → 2019 (%)",d=>{ const p=d.s[SF.paro]; return p&&p[PY.indexOf(2015)]>0?(p[PY.indexOf(2019)]/p[PY.indexOf(2015)]-1)*100:null; }],["Renta por persona 2015 → 2019 (%)",d=>{ const p=d.s[SF.renta]; return p&&p[YR.indexOf(2015)]>0?(p[YR.indexOf(2019)]/p[YR.indexOf(2015)]-1)*100:null; }],["Tamaño (log10 del padrón)",d=>d.row[F.pop]>0?Math.log10(d.row[F.pop]):null],["Edad media (2019)",d=>d.row[F.edad19]],["Voto a PP y Vox en noviembre de 2019 (%)",d=>{ const g=d.s[SF.gen]&&d.s[SF.gen][0]; return g?(g[1]||0)+(g[3]||0):null; }]];
  const bal=pre.map(([l,f])=>({l,r:rd(ptsOf(f),0,H,150)}));
  // densidad: ¿hay más municipios justo a un lado del corte? (manipulación)
  const nL=M.filter(d=>d.m<0&&d.m>=-2).length, nR=M.filter(d=>d.m>=0&&d.m<=2).length, zD=(nR-nL)/Math.sqrt(nL+nR||1);
  const W_=M.filter(d=>Math.abs(d.m)<=H);
  const sig=est.filter(o=>sigCI(o.ci)), balBad=bal.filter(b=>b.r&&sigCI(b.r.ci));
  const nBw=d3.sum(est,o=>o.bw.filter(b=>b.h!==H&&b.r&&b.r.ci&&sigCI(b.r.ci)).length), nPl=d3.sum(est,o=>o.plc.filter(p=>p.r&&p.r.ci&&sigCI(p.r.ci)).length);
  sec(B,"ctx",`<p>Cada cuatro años, en mayo, millones de personas eligen a su alcalde con la sensación de que algo se juega. Los partidos prometen empleo, vivienda, que el pueblo crezca. ¿Se nota después? ¿Les va distinto a los municipios según quién los gobierne?</p>
    <p>La pregunta es fácil de hacer y muy difícil de contestar bien. La comparación obvia, municipios del PP frente a municipios del PSOE, engaña: el PP gana más donde ya había más renta y el PSOE donde había más paro, y esas diferencias estaban ahí antes de votar. Si después a unos les va mejor, no sabemos si es por el alcalde o por cómo eran ya.</p>
    <p>Hay una forma de evitarlo: fijarse solo en las elecciones que se decidieron por un puñado de votos. Ahí, que ganara uno u otro fue casi cuestión de suerte, y los municipios de un lado y del otro se parecen en todo lo demás. Es lo más parecido a un experimento que permite la política.</p>`);
  sec(B,"int",`<p>Quedar como <b>lista más votada</b> en las municipales de mayo de 2019, PP frente a PSOE, en los ${nf0.format(M.length)} municipios de 250 habitantes o más donde esas fueron las dos listas más votadas. Lo que se mide después: población (2019–2025), paro registrado y renta por persona (2019–2023) y voto a PP y Vox en las generales (2019–2023).</p>`,{title:"Qué se compara"});
  sec(B,"ana",`<p>Una <b>regresión discontinua</b>: en las elecciones ajustadas, que ganara uno u otro es casi cuestión de suerte, así que los municipios a un lado y otro del empate son comparables en todo lo demás. Se ajusta una recta a cada lado del empate, dando más peso a los más ajustados (núcleo triangular, ventana de ±${H} puntos), y el efecto es el salto en el cero. Para que el diseño sea creíble se comprueban tres cosas: que el resultado no dependa de la ventana elegida; que las variables <i>anteriores</i> a la elección no salten en el corte (equilibrio); y que no haya más municipios justo a un lado del empate de lo esperable (manipulación). Además, se buscan saltos en cortes falsos (±4 y ±6 puntos).</p>`);
  const s1=res(B,sig.length?`Donde ganó el PSOE por poco, ${sig.map(o=>`${low(o.l.split(",")[0])} ${o.j.j>0?"subió":"bajó"} más`).join(" y ")}`:"Ganar por poco no cambia, en estos datos, cómo evolucionan los municipios",`<p>${nf0.format(W_.length)} municipios decididos por menos de ${H} puntos. En horizontal, la ventaja del PSOE sobre el PP en 2019 (negativa si ganó el PP); en vertical, lo que pasó después, en medias por tramos de 2 puntos, con la recta de cada lado.</p>`);
  const grid=add(s1,"div","cols2");
  est.forEach(o=>{ const fg=fig(grid,{title:o.l,source:`Salto en el empate: <b>${o.j?pts(o.j.j):"—"} pts</b>${o.ci?` [${pts(o.ci[0])}; ${pts(o.ci[1])}]`:""}. Comparación ingenua PSOE − PP, todos los municipios: ${pts(o.naive)} pts.`}); rdPlot(fg.body,o,H); });
  lect(s1,`<p>Cada punto es un grupo de municipios, ordenados por el margen con el que ganó el PSOE (a la derecha) o el PP (a la izquierda). Lo que hay que mirar es el centro: si quién gana importara, las dos rectas no se encontrarían en el cero, habría un escalón. ${sig.length?`En ${sig.map(o=>low(o.l.split(",")[0])).join(" y ")} hay escalón; en lo demás, las rectas casi se tocan.`:"En los cuatro gráficos las rectas casi se tocan: no hay escalón distinguible."}</p><p>La línea de «comparación ingenua» de cada gráfico enseña por qué hacía falta este diseño: comparando todos los municipios del PSOE con todos los del PP sí salen diferencias, pero son diferencias de partida, no de gobierno.</p>`);
  const s2=res(B,nBw?`Con otras ventanas aparece algún salto aislado (${nBw} de ${est.length*4})`:"El resultado no depende de la ventana elegida",`<p>Salto en el empate con ventanas de 5 a 20 puntos. Ventanas estrechas: menos sesgo y más ruido; anchas: lo contrario.</p>`);
  table(s2,["Resultado","±5","±7,5","±10","±15","±20"],est.map(o=>[o.l,...o.bw.map(b=>b.r?`${pts(b.r.j)}${b.r.ci&&sigCI(b.r.ci)?"*":""}`:"—")]));
  add(s2,"p","muted","Puntos. * El intervalo del 95 % excluye el cero.").style.cssText="font-size:13.5px;margin-top:6px";
  lect(s2,`<p>La ventana es cuántos puntos de margen se aceptan como «elección ajustada». Una ventana estrecha compara municipios casi idénticos, pero hay pocos y la estimación baila; una ancha tiene más municipios, pero menos parecidos. Si un efecto es real, debería aparecer con ventanas distintas. ${nBw?"Aquí los saltos que aparecen lo hacen sueltos, en una ventana y no en las demás: es la firma del ruido, no de un efecto.":"Aquí el resultado se mantiene con todas."}</p>`);
  const s3=res(B,balBad.length?"Cuidado: alguna variable anterior a la elección salta en el corte":"Antes de la elección, los dos lados del empate eran iguales",`<p>Si el diseño funciona, nada de lo que pasó <i>antes</i> de mayo de 2019 debería saltar en el empate. ${balBad.length?`Saltan: ${balBad.map(b=>low(b.l)).join(", ")}. Hay que leer los resultados con más cautela.`:"Ninguna lo hace de forma distinguible de cero."} Tampoco hay indicios de manipulación: a menos de 2 puntos del empate hay ${nL} municipios del lado del PP y ${nR} del lado del PSOE (z = ${sg2(zD).replace(/(\d),(\d)\d$/,"$1,$2")}${Math.abs(zD)>1.96?", una diferencia que llama la atención":", dentro de lo esperable por azar"}).</p>`);
  table(s3,["Variable anterior a la elección","Salto en el empate","Intervalo del 95 %"],bal.map(b=>[b.l,b.r?pts(b.r.j):"—",b.r&&b.r.ci?`[${pts(b.r.ci[0])}; ${pts(b.r.ci[1])}]`:"—"]));
  lect(s3,`<p>Esta es la prueba de fuego del diseño. La renta de 2018 o el voto de 2015 no pueden depender de quién ganó en 2019. Si saltaran en el empate, querría decir que los municipios de un lado y otro no eran comparables y todo lo demás quedaría en duda. ${balBad.length?"Alguna variable salta, así que el resultado hay que tomarlo con más cautela.":"No salta ninguna: los dos lados eran iguales antes de votar."}</p>`);
  const s4=res(B,nPl?`En los cortes falsos también aparecen saltos (${nPl} de ${est.length*4}): hay mucho ruido`:"En cortes falsos no aparecen saltos",`<p>El mismo cálculo como si el corte estuviera en −6, −4, +4 o +6 puntos, donde no cambia nada. Si ahí aparecen saltos parecidos a los del empate, un salto aislado no significa nada: es el ruido de comparar pocos municipios.</p>`);
  table(s4,["Resultado","−6","−4","+4","+6"],est.map(o=>[o.l,...o.plc.map(p=>p.r?`${pts(p.r.j)}${p.r.ci&&sigCI(p.r.ci)?"*":""}`:"—")]));
  lect(s4,`<p>Si en un corte inventado, por ejemplo donde el PSOE ganó por 4 puntos, también aparecieran saltos, sabríamos que el método «encuentra» efectos donde no los hay. Es una forma de calibrar cuánto ruido producen estos datos.</p>`);
  // la deuda de los ayuntamientos, con el mismo diseño
  res(B,"Y la deuda: ¿endeuda más un partido que otro?",`<p>La deuda es de las pocas cosas que un alcalde controla de primera mano: decide cuánto pide prestado y cuánto devuelve. Entre 2015 y 2025 la deuda municipal bajó de unos 29.000 millones de euros a unos 16.000, y la ley de estabilidad obligó a casi todos a recortarla. Se repite el mismo diseño con la deuda viva por habitante que publica Hacienda, en las municipales de 2019 y de 2023. Los cambios se recortan a ±1.500${NB}€ por habitante para que unos pocos municipios muy endeudados no dominen el resultado.</p>`);
  const DG=await deudaRes(B);
  const iv=o=>o.ci?`entre ${pts(o.ci[0])} y ${pts(o.ci[1])} puntos`:"sin intervalo", ivE=o=>o.ci?`entre ${DG.E(o.ci[0])} y ${DG.E(o.ci[1])} por habitante`:"sin intervalo";
  const sigAll=sig.concat(DG.sig);
  // los grises: qué efecto tendría que tener quedar primero para que los datos lo vieran
  const hwOf=o=>o&&o.ci?Math.abs(o.ci[1]-o.ci[0])/2:null, hwP=hwOf(est[0]), hwU=hwOf(est[1]);
  if(hwP!=null&&hwU!=null){ const sg=res(B,"Entre el blanco y el negro: ¿cuánto tendría que importar un alcalde para que lo viéramos?",`<p>«No se ve» tiene un tamaño. Prueba un efecto y mira si estos datos lo habrían detectado, y qué supondría en un pueblo de verdad.</p>`);
    playBox(sg,{defs:[["pop","Efecto de quedar primero sobre la población en seis años",-6,6,0.5,"En puntos de crecimiento. Positivo: el pueblo gana más vecinos de lo que habría ganado.",v=>(v>0?"+":v<0?"−":"")+nf1.format(Math.abs(v))+" puntos"],
        ["paro","Efecto sobre el paro registrado en cuatro años",-10,10,1,"En puntos de variación del paro. Negativo: baja más.",v=>(v>0?"+":v<0?"−":"")+nf0.format(Math.abs(v))+" puntos"]],
      pre:[["Nada",{pop:0,paro:0}],["Algo pequeño",{pop:1,paro:3}],["Algo grande",{pop:4,paro:8}]],
      render:st=>{ const dP=Math.abs(st.pop)>hwP, dU=Math.abs(st.paro)>hwU, vec=Math.round(2000*st.pop/100), par=Math.round(100*st.paro/100);
        const say=(d,hw)=>d?`<b>Los datos lo habrían visto</b> (el ruido es de ±${nf1.format(hw)} puntos).`:`<b>Los datos no lo verían</b> (el ruido es de ±${nf1.format(hw)} puntos).`;
        return `<div class="big">${vec>0?"+":vec<0?"−":""}${nf0.format(Math.abs(vec))} <span class="muted" style="font-size:16px;font-weight:400">vecinos en un pueblo de 2.000 habitantes</span></div><p>${st.pop===0?"Es la lectura de «no importa». ":say(dP,hwP)}</p>
        <div class="big" style="margin-top:14px">${par>0?"+":par<0?"−":""}${nf0.format(Math.abs(par))} <span class="muted" style="font-size:16px;font-weight:400">parados en un pueblo con 100</span></div><p>${st.paro===0?"Es la lectura de «no importa». ":say(dU,hwU)}</p>`; }});
    lect(sg,`<p>Un alcalde puede importar y no verse: lo que se descarta es un efecto grande en población o paro. Las cosas pequeñas, como un parque o unas fiestas mejor organizadas, no cambian los grandes números de un pueblo.</p>`); }
  sec(B,"con",`<p>${sigAll.length?`<b>Hay una diferencia en ${sigAll.map(o=>low(o.l.split(",")[0].split(" (")[0])).join(" y ")}</b>; en lo demás, los datos no distinguen ningún efecto de quién quedó primero.`:"<b>Que ganara el PP o el PSOE por poco no cambió, en estos datos, la población, el paro, la renta, el voto ni la deuda del ayuntamiento.</b>"} El diseño supera las comprobaciones de equilibrio${balBad.length||DG.balBad.length?" solo en parte":""} y de manipulación. ${nBw||nPl||DG.nBw||DG.nPl?`Con algunas ventanas y en algún corte falso aparecen saltos sueltos: con este número de municipios hay mucho ruido, y un salto aislado no debe leerse como efecto.`:"El resultado no depende de la ventana."}</p>
    <p><b>«No se ve» no es «no importa».</b> Los intervalos dicen hasta dónde llegan los datos. Con un 95${NB}% de confianza, el salto que produce quedar primero está, en ${est.slice(0,3).map(o=>`${low(o.l.split(",")[0])}, ${iv(o)}`).join("; en ")}; y en la deuda por habitante, ${ivE(DG.e0)}. Un efecto mayor que esos se habría notado; uno menor, no. Un ayuntamiento decide sobre urbanismo, servicios, fiestas, limpieza o impuestos locales, y poco sobre los grandes motores del empleo y la renta, que dependen de la economía de la comarca y de lo que decidan las comunidades y el Estado: que en cuatro años no se vea diferencia es coherente con eso, pero no la descarta.</p>
    <p>También dice algo sobre el debate político. Cuando un partido presume de que «donde gobernamos, baja el paro», o acusa a otro de endeudar los ayuntamientos, la comparación casi siempre está contaminada por dónde gobierna cada uno: los ayuntamientos del PSOE deben más por vecino porque gobiernan ciudades más grandes, no por cómo gobiernan. Las elecciones ajustadas son la forma más limpia de comparar.</p>
    <ul class="defs"><li><b>«Lista más votada» no siempre es «alcalde».</b> Lo que se mide es el efecto de quedar primero, que en los pueblos suele coincidir con la alcaldía pero no siempre: los pactos pueden dar la alcaldía al segundo.</li>
    <li><b>Un ayuntamiento manda poco sobre la renta o el paro.</b> Y puede importar en servicios, urbanismo o impuestos locales, que no están en estos datos.</li>
    <li><b>Es un efecto local:</b> vale para municipios con elecciones ajustadas entre PP y PSOE, y en ellas casi no hay ciudades grandes, que son las que acumulan más deuda. No dice nada de Madrid, Barcelona o Jaén.</li>
    <li><b>Deuda no es todo.</b> Un ayuntamiento puede tener poca deuda y facturas sin pagar, o mucha por inversiones útiles. Aquí solo se mide la deuda viva con bancos y otras administraciones.</li>
    <li><b>Cuatro años con una pandemia en medio.</b> Habrá que repetirlo con los mandatos que vengan.</li></ul>`);
  AB.fill({ctx:"Saber si importa qué partido gobierna un ayuntamiento es difícil: cada partido gana donde las cosas ya eran distintas.",intT:"Qué se compara",int:`Quedar primero en las municipales de 2019, PP frente a PSOE, en ${nf0.format(M.length)} municipios.`,ana:"Regresión discontinua en elecciones ajustadas (núcleo triangular, ±10 puntos), con pruebas de ventana, equilibrio previo, densidad y cortes falsos.",res:sigAll.length?`Diferencia en ${sigAll.map(o=>low(o.l.split(",")[0].split(" (")[0])).join(" y ")}; nada en lo demás.`:`Ningún salto distinguible de cero en población, paro, renta, voto ni deuda por habitante (${W_.length} municipios a menos de 10 puntos); en la deuda, ${DG.e0.j?DG.E(DG.e0.j.j):"—"} ${ivE(DG.e0)}.`,con:`En lo que miden estos datos, quién gana por poco no cambia la evolución del municipio ni su deuda, aunque un efecto menor que los intervalos no se vería (deuda: ${ivE(DG.e0)}).`});
  methods(B,[["Qué se hace","Se comparan los municipios donde el PP ganó por muy poco con los municipios donde el PSOE ganó por muy poco, como si la elección se hubiera decidido a cara o cruz, y se mira cómo evolucionaron después."],["Datos","Ministerio del Interior: municipales de mayo de 2019 (dos listas más votadas) y generales de noviembre de 2019 y julio de 2023; INE: padrón y Atlas de Renta; SEPE: paro registrado."],["Muestra",`${nf0.format(M.length)} municipios de 250 habitantes o más donde PP y PSOE fueron las dos listas más votadas en 2019; ${nf0.format(W_.length)} a menos de ${H} puntos.`],["Especificación","Regresión discontinua nítida: variable de corte = % PSOE − % PP; regresión local lineal a cada lado del corte con núcleo triangular y ventana h; efecto = diferencia de las dos rectas en 0. Sin ponderar por población."],["Inferencia","Intervalos del 95 % por remuestreo de los municipios dentro de la ventana (200 réplicas en la estimación principal)."],["Deuda","Ministerio de Hacienda: deuda viva de cada ayuntamiento a 31 de diciembre (2015–2025, sin 2017), por habitante con el padrón de cada año; mismo diseño, con las municipales de 2019 y 2023. Cambios recortados a ±1.500 €; niveles, a 0–3.000 €."],["Comprobaciones",`Ventanas de 5 a 20 puntos; equilibrio de ${pre.length} variables anteriores a la elección; densidad a ±2 puntos (prueba binomial aproximada); cortes falsos en ±4 y ±6.`]]);
}
// gráfico de discontinuidad: medias por tramos y rectas
function rdPlot(parent,o,H){
  const W=Math.max(320,parent.clientWidth||440), Hh=220, m={t:14,r:12,b:28,l:46};
  const pts=o.pts.filter(p=>Math.abs(p.x)<=H), bins=d3.range(-H,H,2).map(a=>{ const s=pts.filter(p=>p.x>=a&&p.x<a+2); return s.length>=5?{x:a+1,y:d3.mean(s,p=>p.y),n:s.length}:null; }).filter(Boolean);
  if(!bins.length){ parent.textContent="Sin datos suficientes."; return; }
  const X=d3.scaleLinear().domain([-H,H]).range([m.l,W-m.r]), ys=bins.map(b=>b.y).concat(o.j?[o.j.l.a-o.j.l.b*H,o.j.r.a+o.j.r.b*H]:[]), Yy=d3.scaleLinear().domain([d3.min(ys),d3.max(ys)]).nice(4).range([Hh-m.b,m.t]);
  const svg=d3.select(parent).append("svg").attr("viewBox",`0 0 ${W} ${Hh}`).attr("role","img").attr("aria-label",o.l);
  svg.append("g").attr("class","grid").selectAll("line").data(Yy.ticks(4)).join("line").attr("x1",m.l).attr("x2",W).attr("y1",Yy).attr("y2",Yy);
  svg.append("g").attr("class","axis").selectAll("text").data(Yy.ticks(4)).join("text").attr("x",m.l-6).attr("y",v=>Yy(v)+4).attr("text-anchor","end").text(v=>(v>0?"+":"")+nf0.format(v));
  svg.append("g").attr("class","axis").selectAll("text").data([-H,-5,0,5,H]).join("text").attr("x",X).attr("y",Hh-8).attr("text-anchor","middle").text(v=>(v>0?"+":"")+v);
  svg.append("line").attr("x1",X(0)).attr("x2",X(0)).attr("y1",m.t).attr("y2",Hh-m.b).attr("stroke",css("--ink")).attr("stroke-dasharray","3 3");
  svg.append("text").attr("class","lab").attr("x",X(-H)+2).attr("y",Hh-m.b-4).style("fill",css("--muted")).text("← ganó el PP"); svg.append("text").attr("class","lab").attr("x",X(H)-2).attr("y",Hh-m.b-4).attr("text-anchor","end").style("fill",css("--muted")).text("ganó el PSOE →");
  svg.append("g").selectAll("circle").data(bins).join("circle").attr("cx",b=>X(b.x)).attr("cy",b=>Yy(b.y)).attr("r",b=>Math.min(7,3+Math.sqrt(b.n)/3)).attr("fill",b=>css(b.x<0?"--slate":"--rust")).attr("opacity",.85).append("title").text(b=>`${b.x-1} a ${b.x+1}: ${nf1.format(b.y)} (${b.n} municipios)`);
  if(o.j){ const l=o.j.l, r=o.j.r; svg.append("line").attr("x1",X(-H)).attr("x2",X(0)).attr("y1",Yy(l.a-l.b*H)).attr("y2",Yy(l.a)).attr("stroke",css("--slate")).attr("stroke-width",2); svg.append("line").attr("x1",X(0)).attr("x2",X(H)).attr("y1",Yy(r.a)).attr("y2",Yy(r.a+r.b*H)).attr("stroke",css("--rust")).attr("stroke-width",2); }
}

// ---------- AVE: ¿cambia algo cuando llega la alta velocidad? ----------
// =====================================================================
// IVA DE LOS ALIMENTOS: triple diferencia (alimentos con rebaja − sin rebaja; España − otros países; mes de la medida − mismo mes de otros años)
// =====================================================================
// Rebaja del IVA de los alimentos (2023–2025). Se pinta dentro de «precio-alimentos»: el texto está en contenido/analisis/precio-alimentos.md.
function ivaCalc(){
  const H=EXT.hicp, P=H.periods, S=H.series, O=["PT","FR","IT","DE"], ON={PT:"Portugal",FR:"Francia",IT:"Italia",DE:"Alemania"};
  const TR=[["CP0111","Pan y cereales"],["CP0114","Leche, queso y huevos"],["CP0116","Frutas"],["CP0117","Legumbres y hortalizas"]], CT=[["CP0112","Carne"],["CP0113","Pescado"]];
  const ix=(y,m)=>P.indexOf(`${y}-${String(m).padStart(2,"0")}`);
  // variación mensual en puntos logarítmicos (≈ %)
  const dm=(g,k,y,m)=>{ const b=ix(y,m), a=m===1?ix(y-1,12):ix(y,m-1); if(a<0||b<0) return null; const s=S[g][k]; return 100*Math.log(s[b]/s[a]); };
  const YRS=[2021,2022,2023,2024,2025];
  // efecto de un mes: (España − media de otros años en ese mes) − lo mismo en los otros países
  const sea=(g,k,y,m)=>{ const v=YRS.filter(yy=>yy!==y).map(yy=>dm(g,k,yy,m)).filter(x=>x!=null), d=dm(g,k,y,m); return d==null||!v.length?null:d-d3.mean(v); };
  const eff=(k,y,m)=>{ const e=sea("ES",k,y,m), o=O.map(g=>sea(g,k,y,m)).filter(x=>x!=null); return e==null||!o.length?null:e-d3.mean(o); };
  const effT=(y,m)=>{ const v=TR.map(([k])=>eff(k,y,m)); return v.some(x=>x==null)?null:d3.mean(v); };
  const effC=(y,m)=>{ const v=CT.map(([k])=>eff(k,y,m)); return v.some(x=>x==null)?null:d3.mean(v); };
  const EV=[{y:2023,m:1,l:"Enero de 2023",t:"del 4 al 0 %",mech:100*Math.log(1/1.04)},{y:2024,m:10,l:"Octubre de 2024",t:"del 0 al 2 %",mech:100*Math.log(1.02)},{y:2025,m:1,l:"Enero de 2025",t:"del 2 al 4 %",mech:100*Math.log(1.04/1.02)}];
  EV.forEach(e=>{ e.items=TR.map(([k,l])=>({k,l,v:eff(k,e.y,e.m)})); e.ctrl=CT.map(([k,l])=>({k,l,v:eff(k,e.y,e.m)})); e.avg=effT(e.y,e.m); e.cavg=effC(e.y,e.m); e.pt=e.avg/e.mech*100; });
  const isEv=(y,m)=>EV.some(e=>e.y===y&&e.m===m);
  // calendario: el mismo cálculo para cada mes de 2022 a 2025 (los meses sin medida son placebos)
  const CAL=[]; for(let y=2022;y<=2025;y++) for(let m=1;m<=12;m++){ if(ix(y,m)<0) continue; const v=effT(y,m); if(v!=null) CAL.push({y,m,v,ev:isEv(y,m)}); }
  const PL=CAL.filter(c=>!c.ev).map(c=>c.v), e0=EV[0], e2=EV[2];
  const fr=e0.items[2], frPt=fr.v/e0.mech*100, fr2=e2.items[2], below=PL.filter(v=>v<=e0.avg).length, above=PL.filter(v=>v>=e2.avg).length;
  const f1=v=>v==null?"—":(v<0?"−":v>0?"+":"")+nf1.format(Math.abs(v)), MESC=["","ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];

  const V={ivaE0:e0.avg,ivaFruta:fr.v,ivaFrutaPt:frPt,ivaMenos:below,ivaMas:above,ivaMeses:PL.length,ivaE2:e2.avg,ivaE2Pt:e2.pt,ivaMin:d3.min(PL),ivaMax:d3.max(PL),ivaCarne0:e0.cavg,ivaCarne2:e2.cavg,ivaRegla:Math.abs(e0.mech)};
  const G={
    ivaMes:el=>{
    { const fg=fig(el,{title:"Efecto estimado, mes a mes",sub:"Puntos porcentuales; media de los cuatro grupos con rebaja",source:"Fuente: Eurostat, IPCA mensual (prc_hicp_midx). Cálculo de Indicio."});
        const W=Math.max(320,fg.body.clientWidth||680), Hh=260, m={t:16,r:10,b:30,l:40};
        const X=d3.scaleBand().domain(CAL.map((c,i)=>i)).range([m.l,W-m.r]).padding(0.18), ext=d3.extent(CAL,c=>c.v), Y=d3.scaleLinear().domain([Math.min(-2.5,ext[0]),Math.max(2.5,ext[1])]).nice().range([Hh-m.b,m.t]);
        const sv=d3.select(fg.body).append("svg").attr("viewBox",`0 0 ${W} ${Hh}`).attr("role","img").attr("aria-label","Efecto estimado mes a mes");
        sv.append("g").selectAll("line").data(Y.ticks(5)).join("line").attr("x1",m.l).attr("x2",W).attr("y1",d=>Y(d)).attr("y2",d=>Y(d)).attr("stroke","var(--rule)");
        sv.append("g").selectAll("text").data(Y.ticks(5)).join("text").attr("x",m.l-6).attr("y",d=>Y(d)+4).attr("text-anchor","end").attr("font-size",11).attr("fill","var(--muted)").text(d=>f1(d));
        sv.append("g").selectAll("rect").data(CAL).join("rect").attr("x",(c,i)=>X(i)).attr("width",X.bandwidth()).attr("y",c=>Y(Math.max(0,c.v))).attr("height",c=>Math.abs(Y(c.v)-Y(0))).attr("fill",c=>c.ev?"var(--brand)":"var(--rule-2)").append("title").text(c=>`${MESC[c.m]} ${c.y}: ${f1(c.v)} puntos`);
        sv.append("g").selectAll("text").data(CAL.map((c,i)=>({c,i})).filter(o=>o.c.m===1)).join("text").attr("x",o=>X(o.i)).attr("y",Hh-10).attr("font-size",11).attr("fill","var(--muted)").text(o=>o.c.y);
        EV.forEach(e=>{ const i=CAL.findIndex(c=>c.y===e.y&&c.m===e.m); if(i<0) return; sv.append("text").attr("x",X(i)+X.bandwidth()/2).attr("y",e.avg<0?Y(e.avg)+14:Y(e.avg)-6).attr("text-anchor","middle").attr("font-size",11).attr("font-weight",700).attr("fill","var(--brand)").text(`${MESC[e.m]} ${String(e.y).slice(2)}`); });
      }
    },
    ivaTabla:el=>{ const f=fig(el,{title:"Efecto estimado en cada grupo, el mes de cada cambio de IVA",sub:"Puntos porcentuales; la carne y el pescado no cambiaron de IVA y deberían salir cerca de cero",source:"Fuente: Eurostat, IPCA mensual (prc_hicp_midx). Cálculo de Indicio."});
  table(f.body,["Grupo",...EV.map(e=>`${e.l}<br><small>IVA ${e.t}</small>`)],[
    ...TR.map(([k,l],j)=>[l,...EV.map(e=>`${f1(e.items[j].v)}`)]),
    ["<b>Media con rebaja</b>",...EV.map(e=>`<b>${f1(e.avg)}</b>`)],
    ["<i>Si se trasladara entero</i>",...EV.map(e=>`<i>${f1(e.mech)}</i>`)],
    ["<b>Parte trasladada</b>",...EV.map(e=>`<b>${e.pt<0?"ninguna":nf0.format(e.pt)+NB+"%"}</b>`)],
    ...CT.map(([k,l],j)=>[`${l} <small>(sin cambio de IVA)</small>`,...EV.map(e=>f1(e.ctrl[j].v))])]);
    }
  };
  V.ivaRanking=below===0?`mayor que la de cualquiera de los ${PL.length} meses sin medida`:`mayor que la de ${PL.length-below} de los ${PL.length} meses sin medida`;
  V.ivaCarne=Math.abs(e0.cavg)<0.8&&Math.abs(e2.cavg)<1?"apenas se mueven en esos meses, como debe ser":"se mueven algo, lo que pide cautela";
  return {V,G};
}

// ---------- tres análisis causales con los datos de SEPE, Seguridad Social y Ministerio de Vivienda (data/causales.json) ----------
let CAUS_P=null; const loadCausales=()=>CAUS_P||(CAUS_P=getJSON("/data/causales.json"));
const mesLab=p=>{ const [y,m]=p.split("-"); return MES[+m].slice(0,3)+". "+y; };
const listY=a=>a.length<2?a.join(""):a.slice(0,-1).join(", ")+" y "+a[a.length-1];

// Reforma laboral de 2022: ¿cayó la temporalidad, y perdieron empleo los municipios que más dependían del contrato temporal?
// Caja para jugar: mandos + lecturas predefinidas + resultado. defs:[[k,etiqueta,min,max,paso,nota,fmt]], pre:[[nombre,{k:v}]], render(st)->html
function playBox(d,{defs,pre,render}){ const w=add(d,"div","calc pn-sim"), ctl=add(w,"div","ctl"), out=add(w,"div","res"), st=Object.assign({},pre[0][1]);
  ctl.innerHTML=defs.map(([k,l,a,b,step,n])=>`<label>${l} <output data-k="${k}"></output><input type="range" min="${a}" max="${b}" step="${step}" value="${st[k]}" data-k="${k}"><small>${n||""}</small></label>`).join("")
    +`<p class="muted" style="font-size:13.5px">Probar una lectura: ${pre.map(([l],i)=>`<button type="button" class="lnk" data-p="${i}">${esc(l)}</button>`).join(" · ")}</p>`;
  const upd=()=>{ ctl.querySelectorAll("output").forEach(o=>{ const df=defs.find(x=>x[0]===o.dataset.k); o.textContent=df[6]?df[6](st[df[0]]):nf1.format(st[df[0]]); }); out.innerHTML=render(st); };
  ctl.querySelectorAll("input").forEach(i=>i.addEventListener("input",()=>{ st[i.dataset.k]=+i.value; upd(); }));
  ctl.querySelectorAll("button[data-p]").forEach(b=>b.addEventListener("click",()=>{ Object.assign(st,pre[+b.dataset.p][1]); ctl.querySelectorAll("input").forEach(i=>i.value=st[i.dataset.k]); upd(); }));
  upd(); return w; }
// «¿Lo habrían visto los datos?»: cada mando es un efecto hipotético; se compara con el ruido (hw) y se traduce a algo concreto.
// items:[{k,label,min,max,step,note,hw,unit,big:(v)=>[cifra,texto],pre:[v0,vAlgo,vGrande]}]
function detectBox(B,{title,intro,items,lect:lt}){ const sg=res(B,title,`<p>${intro}</p>`); const sgn_=v=>(v>0?"+":v<0?"−":"")+nf1.format(Math.abs(v));
  playBox(sg,{defs:items.map(it=>[it.k,it.label,it.min,it.max,it.step,it.note,v=>sgn_(v)+" "+it.unit]),
    pre:[["Nada",Object.fromEntries(items.map(it=>[it.k,0]))],["Algo pequeño",Object.fromEntries(items.map(it=>[it.k,it.pre[1]]))],["Algo grande",Object.fromEntries(items.map(it=>[it.k,it.pre[2]]))]],
    render:st=>items.map((it,i)=>{ const v=st[it.k], [c,t]=it.big(v), seen=Math.abs(v)>it.hw;
      return `<div class="big"${i?' style="margin-top:14px"':""}>${c} <span class="muted" style="font-size:16px;font-weight:400">${t}</span></div><p>${v===0?"Es la lectura de «no pasó nada».":seen?`<b>Los datos lo habrían visto</b> (el ruido es de ±${nf1.format(it.hw)} ${it.unit}).`:`<b>Los datos no lo verían</b> (el ruido es de ±${nf1.format(it.hw)} ${it.unit}).`}</p>`; }).join("")});
  if(lt) lect(sg,lt); return sg; }
async function studyReforma(B){
  const AB=abstract(B), R=(await loadCausales()).reforma, per=R.periodos, G=R.grupos, n=G.length;
  const GN=["Menos temporalidad","Algo menos","Algo más","Más temporalidad"], GC=["--slate","--s-prov","--mustard","--rust"];
  const sh=(g,ps)=>{ let i=0,t=0; per.forEach((p,k)=>{ if(ps(p)){ i+=g.mes[k][0]; t+=g.mes[k][1]; } }); return i+t?t/(i+t)*100:null; };
  const shY=(g,y)=>sh(g,p=>p.startsWith(String(y))), YS=[2019,2020,2021,2022,2023,2024,2025,2026];
  const SH=G.map(g=>YS.map(y=>shY(g,y))), drop=G.map((g,j)=>d3.mean([2023,2024,2025].map(y=>shY(g,y)))-shY(g,2019));
  const tot=(g,y)=>d3.sum(per.map((p,k)=>p.startsWith(String(y))?g.mes[k][0]+g.mes[k][1]:0)), ind=(g,y)=>d3.sum(per.map((p,k)=>p.startsWith(String(y))?g.mes[k][0]:0));
  const all={mes:per.map((p,k)=>[d3.sum(G,g=>g.mes[k][0]),d3.sum(G,g=>g.mes[k][1])])}, shAll19=shY(all,2019), shAll25=shY(all,2025);
  // monthly share (12-month rolling to quitar estacionalidad)
  const roll=g=>per.map((p,k)=>{ if(k<11) return null; let i=0,t=0; for(let j=k-11;j<=k;j++){ i+=g.mes[j][0]; t+=g.mes[j][1]; } return t/(i+t)*100; });
  // empleo: afiliados en diciembre, frente a la tendencia de 2016–2019
  const AY=d3.range(2016,2026), af=g=>AY.map(y=>g.afil[y]), pr=g=>AY.map(y=>g.paro[y]);
  const trendDev=(g,k,yr)=>{ const a=g[k]; const pre=Math.log(a[2019]/a[2016])/3, act=Math.log(a[yr]/a[2019]); return (act-pre*(yr-2019))*100; };
  const EMP=G.map(g=>({pre:(Math.pow(g.afil[2019]/g.afil[2016],1/3)-1)*100,act:(g.afil[2025]/g.afil[2019]-1)*100,dev:trendDev(g,"afil",2025),dev21:trendDev(g,"afil",2021),paroDev:trendDev(g,"paro",2025)}));
  const gap=EMP[n-1].dev-EMP[0].dev, gapP=EMP[n-1].paroDev-EMP[0].paroDev;
  // placebo: el mismo cálculo con una «reforma» falsa en 2018 (tendencia 2016–2017, efecto a 2019)
  const fake=g=>{ const a=g.afil; return (Math.log(a[2019]/a[2017])-Math.log(a[2017]/a[2016])*2)*100; }, fakeGap=fake(G[n-1])-fake(G[0]);
  // margen: la mayor diferencia que aparece entre grupos, real o con la reforma falsa, y lo que supondría en empleos del grupo más temporal
  const marg=Math.max(Math.abs(fakeGap),Math.abs(gap)), margJobs=marg/100*G[n-1].afil[2019], roundJ=v=>Math.round(v/100)*100;
  const f1=v=>nf1.format(v), f0=v=>nf0.format(v), pts=v=>(v<0?"−":"+")+nf1.format(Math.abs(v))+" puntos";

  sec(B,"ctx",`<p>España fue durante décadas el país de la Unión Europea con más contratos temporales. En 2019, <b>${f0(shAll19)} de cada 100 contratos</b> que se firmaban eran temporales: por obra, por días, por semanas. La reforma laboral pactada en diciembre de 2021 entre el Gobierno, los sindicatos y la patronal quiso acabar con eso.</p>
    <p>Dos preguntas se discutieron desde el primer día: si de verdad bajaría la temporalidad, o si se disfrazaría con otros contratos; y si al encarecer o complicar la contratación temporal se perdería empleo, sobre todo en los lugares y sectores que más dependían de ella (el campo, la hostelería, el turismo).</p>`);
  sec(B,"int",`<p>Desde el 31 de marzo de 2022 desaparece el contrato «por obra o servicio» y los temporales quedan limitados a causas concretas (picos de producción, sustituciones). Se potencia el <b>fijo discontinuo</b>, un contrato indefinido para trabajos de temporada, que cuenta como indefinido.</p>`,{title:"La medida"});
  sec(B,"ana",`<p>La reforma afectó a todo el país a la vez, así que no hay un grupo sin reforma con el que comparar. Lo que sí hay es <b>distinta exposición</b>: en unos municipios casi todos los contratos eran temporales y en otros bastante menos. Si la reforma destruyó empleo, debería notarse más donde más dependían del contrato temporal.</p>
    <p>Se toman los ${f0(R.nmun)} municipios con al menos 100 contratos iniciales en 2019, se reparten en cuatro grupos iguales según el % de contratos temporales de 2019 (de ${f1(G[0].lo)} a ${f1(G[n-1].hi)}${NB}%), y se sigue en cada grupo, mes a mes, el tipo de contrato (SEPE), y año a año el empleo (afiliados a la Seguridad Social en diciembre) y el paro registrado. El empleo se compara con la tendencia que traía cada grupo en 2016–2019.</p>`);

  const s1=res(B,`Los contratos temporales bajaron unos ${f0(Math.abs(d3.mean(drop)))} puntos en todas partes`,`<p>Porcentaje de los contratos iniciales que son temporales, en los últimos doce meses, para cada grupo de municipios.</p>`);
  const PL=per.map(mesLab);
  lineChart(s1,{title:"Contratos iniciales temporales, % (media de 12 meses)",sub:"Grupos de municipios según la temporalidad de 2019",source:"Fuente: SEPE, contratos por municipio y mes. Cálculo de Indicio.",series:G.map((g,j)=>({n:GN[j],v:roll(g),c:GC[j],main:j===n-1})),years:PL,xticks:[PL[11],PL[per.indexOf("2022-03")],PL[PL.length-1]],fmt:v=>pc(v),tickFmt:v=>f0(v)+"%"});
  table(s1,["Grupo (temporales en 2019)","2019","2021","2023–2025","Cambio"],G.map((g,j)=>[`${GN[j]} <small>(${f1(g.lo)}–${f1(g.hi)}${NB}%)</small>`,pc(SH[j][0]),pc(SH[j][2]),pc(SH[j][0]+drop[j]),pts(drop[j])]));
  lect(s1,`<p>La caída es enorme y casi simultánea en los cuatro grupos: en 2022 la temporalidad baja de golpe y en 2023 ya está en su nuevo nivel. En el conjunto de estos municipios pasa del ${pc(shAll19)} en 2019 al ${pc(shAll25)} en 2025. Todos bajan unos 30–35 puntos: los municipios más temporales siguen teniendo más contratos temporales que el resto, pero la distancia apenas cambia. La temporalidad bajó en todas partes, no solo donde era más alta.</p><p>Una parte de lo que antes eran temporales son ahora <b>fijos discontinuos</b>, que el SEPE cuenta como indefinidos aunque trabajen solo una parte del año. Por eso los contratos indefinidos se multiplican por ${f0(ind(G[n-1],2025)/ind(G[n-1],2019))} en el grupo más temporal, y el número total de contratos cae (un ${f0((1-tot(G[n-1],2025)/tot(G[n-1],2019))*100)}${NB}% allí, un ${f0((1-tot(G[0],2025)/tot(G[0],2019))*100)}${NB}% en el menos temporal): se firman menos contratos porque ya no se encadenan tantos cortos.</p>`);

  const s2=res(B,Math.abs(gap)<2?"Donde más dependían del contrato temporal no se perdió más empleo":gap<0?`Donde más dependían del contrato temporal el empleo creció ${f1(Math.abs(gap))} puntos menos de lo esperable`:`Donde más dependían del contrato temporal el empleo creció algo más`,`<p>Afiliados a la Seguridad Social en diciembre, 2019 = 100. Cada grupo crecía a un ritmo distinto antes de la reforma, así que lo que importa es cuánto se separa cada uno de su propia tendencia.</p>`);
  lineChart(s2,{title:"Afiliados a la Seguridad Social, 2019 = 100",sub:"Diciembre de cada año",source:"Fuente: Seguridad Social (afiliados por municipio del centro de trabajo). Cálculo de Indicio.",series:G.map((g,j)=>({n:GN[j],v:af(g).map(v=>v/g.afil[2019]*100),c:GC[j],main:j===n-1})),years:AY,fmt:v=>f1(v),xticks:[2016,2019,2022,2025]});
  table(s2,["Grupo","Crecimiento anual 2016–2019","Afiliados 2019 → 2025","Frente a su tendencia, 2025","Paro registrado frente a su tendencia, 2025"],G.map((g,j)=>[GN[j],sgn(EMP[j].pre),sgn(EMP[j].act),pts(EMP[j].dev),pts(EMP[j].paroDev)]));
  lect(s2,`<p>Los municipios más temporales (sobre todo agrícolas y turísticos: el campo y la hostelería eran el ${f0(G[n-1].hostAgri[2019])}${NB}% de sus afiliados en 2019, frente al ${f0(G[0].hostAgri[2019])}${NB}% en el grupo menos temporal) ya crecían menos antes de la reforma. Descontando esa tendencia, en 2025 el empleo del grupo más temporal queda ${pts(gap)} respecto al menos temporal${Math.abs(gap)<2?": una diferencia pequeña, del tamaño del ruido":""}. El paro registrado cuenta lo mismo: frente a su tendencia, el grupo más temporal queda ${pts(gapP)} respecto al menos temporal${gapP<0?" (menos paro, no más)":""}.</p><p>Todos los grupos quedan por debajo de su tendencia de 2016–2019, pero eso es sobre todo la pandemia: en 2021 ya estaban por debajo (entre ${pts(d3.min(EMP,e=>e.dev21))} y ${pts(d3.max(EMP,e=>e.dev21))}), antes de que la reforma entrara en vigor.</p>`);

  const s3=res(B,"La prueba con una reforma falsa",`<p>Si el método se inventara diferencias, también las encontraría donde no hubo reforma. Se repite el cálculo como si hubiera habido una reforma en 2018: tendencia de 2016–2017 y efecto en 2019.</p>`);
  add(s3,"p",null,`Diferencia entre el grupo más temporal y el menos temporal con la reforma falsa de 2018: <b>${pts(fakeGap)}</b> en solo dos años. Con la reforma real, en seis años: <b>${pts(gap)}</b>.`);
  lect(s3,`<p>${Math.abs(fakeGap)>=Math.abs(gap)?"La reforma falsa da una diferencia tan grande como la real: lo que se ve tras 2022 no se distingue de las oscilaciones normales entre estos grupos.":"La diferencia real es mayor que la de la reforma falsa, pero no mucho: hay que leerla con cautela."} Con cuatro grupos y un solo país, la conclusión segura es la negativa: <b>no hay rastro de una destrucción de empleo concentrada donde más se usaba el contrato temporal</b>.</p>`);
  const s4=res(B,`El margen: los datos no distinguirían una pérdida de menos de unos ${nf0.format(roundJ(margJobs))} empleos`,`<p>Con solo cuatro grupos no se puede calcular un intervalo de confianza como en otros análisis: haría falta el empleo de cada municipio. Lo que sí se puede medir es el ruido: una diferencia de hasta <b>${f1(marg)} puntos</b> entre el grupo más y el menos temporal aparece también con una reforma que no existió.</p>`);
  add(s4,"p",null,`En el grupo más temporal había ${nf0.format(roundJ(G[n-1].afil[2019]))} afiliados en 2019. ${f1(marg)} puntos de ese total son unos <b>${nf0.format(roundJ(margJobs))} empleos</b>. Una pérdida mucho mayor que esa difícilmente habría pasado inadvertida; una menor, los datos no permiten ni afirmarla ni descartarla. Es una cota orientativa, porque sale de una sola reforma falsa.`);

  // los grises: cuánto empleo podría haber costado sin que se viera, y cuánta temporalidad bajó de verdad
  const s5=res(B,"Entre el blanco y el negro: ¿y si costó algo que no vemos?",`<p>Los datos no dicen «cero». Dicen que no ven pérdidas por encima de cierto ruido, y que no se pueden separar los fijos discontinuos de los indefinidos de siempre. Mueve los dos mandos y mira cómo cambia la lectura.</p>`);
  playBox(s5,{defs:[["p","Empleo perdido en los municipios más expuestos",0,3,0.1,"En los demás grupos, la pérdida es proporcional a su exposición. En porcentaje de sus afiliados.",v=>nf1.format(v)+NB+"%"],
      ["e","De la caída de la temporalidad, parte que es cambio de etiqueta",0,60,5,"Trabajos de temporada que pasan de temporales a fijos discontinuos. Con estos datos no se puede medir; es un supuesto.",v=>v+NB+"%"]],
    pre:[["No costó empleo",{p:0,e:30}],["Costó algo donde más se usaba",{p:1,e:30}],["Costó mucho y la etiqueta lo esconde",{p:2.5,e:50}]],
    render:st=>{ const jobs=d3.sum(G,(g,j)=>g.afil[2019]*st.p/100*(j/(n-1))), vis=st.p>=marg, caida=shAll19-shAll25, real=caida*(1-st.e/100);
      return `<div class="big">${nf0.format(roundJ(jobs))} <span class="muted" style="font-size:16px;font-weight:400">empleos menos en estos municipios</span></div>
        <p>${st.p===0?"Es la lectura de «no pasó nada».":vis?`Es más de lo que los datos distinguen (${f1(marg)}${NB}% en el grupo más expuesto): <b>se vería</b> en las comparaciones, y los datos no lo muestran.`:`Es menos del ruido que muestran los datos (${f1(marg)}${NB}%): <b>no se vería</b>, aunque hubiera pasado.`}</p>
        <div class="big" style="margin-top:14px">${f0(real)} <span class="muted" style="font-size:16px;font-weight:400">puntos de bajada real de la temporalidad</span></div>
        <p>De los ${f0(caida)} puntos que bajó la temporalidad (del ${pc(shAll19)} al ${pc(shAll25)}), ${f0(caida*st.e/100)} serían solo etiqueta: el trabajo es el mismo y cambia el nombre del contrato.</p>`; }});
  lect(s5,`<p>Con los datos disponibles, la lectura de que no costó empleo donde más se usaba y la de que costó algo pequeño conviven sin contradicción. Lo que sí se descarta es una pérdida grande. Y la temporalidad bajó de verdad en la parte que no es etiqueta, cuya proporción no sabemos.</p>`);
  sec(B,"con",`<p><b>La reforma laboral cambió el tipo de contrato en toda España y no se ve que costara empleo donde más se usaba el temporal.</b> La temporalidad de los contratos nuevos bajó unos 30 puntos casi de un mes para otro, en todos los grupos de municipios; y los que más dependían del contrato temporal no perdieron más empleo que los demás, una vez descontada la tendencia que ya traían. «No se ve» no es «no pasó»: los datos no distinguen una pérdida de hasta unos ${nf0.format(roundJ(margJobs))} empleos en el grupo más temporal (${f1(marg)} puntos); una mucho mayor sí se habría notado.</p>
    <ul class="defs"><li><b>No mide el efecto total.</b> Como la reforma llegó a la vez a todo el país, este diseño solo ve diferencias entre municipios más y menos expuestos. Si la reforma hubiera subido o bajado el empleo en todas partes por igual, no se vería aquí.</li>
    <li><b>Fijos discontinuos.</b> Parte de la caída de la temporalidad es un cambio de etiqueta: trabajos de temporada que antes eran temporales ahora son fijos discontinuos. Con los datos del SEPE por municipio no se pueden separar.</li>
    <li><b>La pandemia en medio.</b> 2020 y 2021 movieron el empleo mucho más que cualquier reforma, y más en los municipios turísticos. Por eso se mide frente a la tendencia de antes de 2020 y se mira también 2021.</li>
    <li><b>Lugar de trabajo.</b> Los contratos y los afiliados se cuentan donde está el centro de trabajo, no donde vive la persona.</li></ul>`);
  methods(B,[["Qué se hace","Se comparan los municipios según cuánto dependían del contrato temporal en 2019: cómo cambió su temporalidad y si su empleo se separó de la tendencia que traía."],["Datos","SEPE: contratos iniciales indefinidos y temporales por municipio y mes (enero de 2019 a septiembre de 2026) y paro registrado medio anual; Seguridad Social: afiliados por municipio y actividad en diciembre (2016–2025)."],["Grupos","Municipios con al menos 100 contratos iniciales en 2019, en cuartiles del % de temporales de 2019 (cada grupo, el mismo número de municipios). Se suman los municipios de cada grupo."],["Frente a la tendencia",`Diferencia entre el crecimiento logarítmico 2019–2025 y el que habría dado la tasa media anual de 2016–2019, en puntos. Lo mismo para el paro.`],["Placebo","Mismo cálculo con una reforma falsa en 2018: tendencia de 2016–2017 y crecimiento hasta 2019."]]);
  AB.fill({ctx:`En 2019, ${f0(shAll19)} de cada 100 contratos firmados eran temporales.`,intT:"La medida",int:"La reforma laboral de 2022 limitó los contratos temporales y potenció los fijos discontinuos.",ana:"Municipios en cuatro grupos según su temporalidad de 2019; tipo de contrato mes a mes y empleo frente a su tendencia previa.",res:`Temporalidad −${f0(Math.abs(d3.mean(drop)))} puntos en todos los grupos; empleo del grupo más temporal frente al menos temporal, ${pts(gap)} descontando la tendencia (placebo: ${pts(fakeGap)}); el ruido llega a ${f1(marg)} puntos.`,con:`La temporalidad bajó en todas partes y no se ve pérdida de empleo concentrada donde más se usaba el contrato temporal, con un margen de unos ${nf0.format(roundJ(margJobs))} empleos.`});
}

// Salario mínimo de 2019 y empleo de hogar
async function studyHogar(B){
  const AB=abstract(B), H=(await loadCausales()).hogar, G=H.grupos, n=G.length, Y=d3.range(2013,2021);
  const GN=["Renta más baja","Baja","Media","Alta","Renta más alta"], GC=["--slate","--s-prov","--stone","--mustard","--rust"];
  const sum=k=>Object.fromEntries(Y.map(y=>[y,d3.sum(G,g=>g[k][y])]));
  const hog=sum("hogar"), tot=sum("total");
  const ch=(o,y)=>(o[y]/o[y-1]-1)*100;
  // aceleración: cambio del año menos la media de los tres anteriores
  const acc=(o,y)=>ch(o,y)-d3.mean([y-3,y-2,y-1].map(x=>ch(o,x)));
  const AC=d3.range(2017,2021).map(y=>({y,v:acc(hog,y),t:acc(tot,y)}));
  const a19=AC.find(a=>a.y===2019), others=AC.filter(a=>a.y!==2019&&a.y!==2020);
  const gChg=(g,y0,y1)=>(g.hogar[y1]/g.hogar[y0]-1)*100, gPre=g=>(Math.pow(g.hogar[2018]/g.hogar[2015],1/3)-1)*100;
  const GT=G.map(g=>({pre:gPre(g),c19:gChg(g,2018,2019),dev:gChg(g,2018,2019)-gPre(g)}));
  const grad=GT[0].dev-GT[n-1].dev;
  const f1=v=>nf1.format(v), f0=v=>nf0.format(v), pts=v=>(v<0?"−":"+")+nf1.format(Math.abs(v))+" puntos";

  sec(B,"ctx",`<p>En enero de 2019 el salario mínimo subió un 22${NB}%, de 736 a 900 euros al mes en catorce pagas: la mayor subida en cuarenta años. Uno de los empleos más expuestos era el <b>servicio doméstico</b>: limpiar o cuidar en casas particulares, un trabajo casi siempre femenino, a menudo por horas y con salarios muy cerca del mínimo. Para las empleadas de hogar por horas, el mínimo pasó de 5,76 a 7,04 euros la hora.</p>
    <p>Se dijo que muchas familias darían de baja a sus empleadas o las pasarían a la economía sumergida. ¿Se ve en los datos?</p>`);
  sec(B,"int",`<p>Subida del salario mínimo interprofesional del 22,3${NB}% desde el 1 de enero de 2019 (Real Decreto 1462/2018), que también fija el mínimo por hora de las empleadas de hogar. En 2020 subió otro 5,6${NB}%.</p>`,{title:"La medida"});
  sec(B,"ana",`<p>Se sigue el número de afiliadas al <b>sistema especial de empleados de hogar</b> de la Seguridad Social en diciembre de cada año, de 2013 a 2020, de dos formas. Primero, en toda España: si la subida tuvo efecto, la caída de 2019 debería ser más fuerte que la de los años anteriores. Segundo, por grupos de municipios según su renta de 2018 (cinco grupos con la misma población): donde las familias tienen menos renta, pagar el nuevo mínimo cuesta más, y la caída debería ser mayor.</p>
    <p>El análisis se para en 2020: en diciembre de 2021 la Seguridad Social cambió la forma de asignar a estas afiliadas a un municipio, y la serie municipal da un salto que no es real.</p>`);

  const s1=res(B,Math.abs(a19.v)<1.5||others.some(a=>a.v<=a19.v)?"En 2019 el empleo de hogar siguió cayendo, pero al mismo ritmo que ya traía":`En 2019 el empleo de hogar cayó ${f1(Math.abs(a19.v))} puntos más de lo que venía cayendo`,`<p>Afiliadas al sistema especial de empleados de hogar en diciembre, 2018 = 100, frente al total de afiliados.</p>`);
  lineChart(s1,{title:"Afiliados en diciembre, 2018 = 100",sub:"Municipios con dato de renta (casi toda España)",source:"Fuente: Seguridad Social. Cálculo de Indicio.",series:[{n:"Empleo de hogar",v:Y.map(y=>hog[y]/hog[2018]*100),c:"--rust",main:true},{n:"Todos los afiliados",v:Y.map(y=>tot[y]/tot[2018]*100),c:"--slate"}],years:Y,fmt:v=>f1(v),xticks:[2013,2016,2018,2020]});
  table(s1,["Año","Cambio del empleo de hogar","Cambio de los años anteriores (media)","Aceleración"],AC.map(a=>[`${a.y}${a.y===2019?" <b>(subida del SMI)</b>":a.y===2020?" <small>(pandemia)</small>":""}`,sgn(ch(hog,a.y)),sgn(d3.mean([a.y-3,a.y-2,a.y-1].map(x=>ch(hog,x)))),pts(a.v)]));
  lect(s1,`<p>El empleo de hogar ya caía antes de la subida: desde 2016 perdía afiliadas cada año, mientras el empleo total crecía. En 2019 cayó un ${f1(Math.abs(ch(hog,2019)))}${NB}%, algo más que en 2018 (${f1(Math.abs(ch(hog,2018)))}${NB}%). Pero la «aceleración» de 2019 (${pts(a19.v)}) ${others.some(a=>a.v<=a19.v)?`no es mayor que la de años sin subida del salario mínimo, como ${others.filter(a=>a.v<=a19.v).map(a=>a.y).join(" o ")}`:"es la mayor de la serie, aunque la diferencia con otros años es pequeña"}. En 2020 la caída siguió, ya con la pandemia.</p>`);

  const s2=res(B,Math.abs(grad)<1.5?"Y no cayó más donde las familias tienen menos renta":grad<0?`Cayó ${f1(Math.abs(grad))} puntos más en los municipios de renta más baja`:"Cayó más, si acaso, en los municipios de renta alta",`<p>Cambio del empleo de hogar en 2019 en cada grupo de municipios según su renta de 2018, frente a su propia tendencia de 2015–2018.</p>`);
  lineChart(s2,{title:"Empleo de hogar por renta del municipio, 2018 = 100",source:"Fuente: Seguridad Social e INE (Atlas de Renta). Cálculo de Indicio.",series:G.map((g,j)=>({n:GN[j],v:Y.map(y=>g.hogar[y]/g.hogar[2018]*100),c:GC[j],main:j===0})),years:Y,fmt:v=>f1(v),xticks:[2013,2016,2018,2020]});
  table(s2,["Grupo","Renta por persona, 2018","Afiliadas de hogar, 2018","Tendencia 2015–2018","Cambio 2019","Frente a la tendencia"],G.map((g,j)=>[GN[j],`${eur(g.lo)}–${eur(g.hi)}`,nf0.format(g.hogar[2018]),sgn(GT[j].pre),sgn(GT[j].c19),pts(GT[j].dev)]));
  lect(s2,`<p>Si la subida hubiera echado a empleadas de hogar porque las familias no podían pagarla, debería notarse más donde las familias ganan menos. No se ve un patrón así: la diferencia entre el grupo de renta más baja y el de renta más alta es de ${pts(grad)} respecto a sus tendencias. Llama la atención otra cosa: casi la mitad del empleo de hogar registrado está en los municipios de más renta (${f0(G[n-1].hogar[2018]/d3.sum(G,g=>g.hogar[2018])*100)}${NB}% en el grupo más rico, frente a ${f0(G[0].hogar[2018]/d3.sum(G,g=>g.hogar[2018])*100)}${NB}% en el más pobre, con la misma población).</p>`);

  { const hwS=Math.max(1,...others.map(a=>Math.abs(a.v)));
    detectBox(B,{title:"Entre el blanco y el negro: ¿cuánto empleo de hogar pudo costar la subida sin que se notara?",intro:"El ruido es lo que cae o sube el empleo de hogar en años normales respecto a su tendencia. Un efecto por debajo de ese ruido no se distingue de un año cualquiera. Prueba uno y mira qué supone en afiliadas.",
      items:[{k:"e",label:"Caída extra del empleo de hogar en 2019 por la subida",min:0,max:8,step:0.5,unit:"puntos",note:"Puntos de afiliación por encima de lo que ya venía cayendo.",hw:hwS,pre:[0,2,6],big:v=>[v?"−"+nf0.format(Math.round(hog[2018]*v/100/100)*100):"0","afiliadas menos (de unas "+nf0.format(Math.round(hog[2018]/1000)*1000)+" en 2018)"]}],
      lect:`<p>Una pérdida pequeña de empleo declarado se confunde con un año cualquiera. Y no se mide el empleo no declarado: parte de lo que cae de un lado puede aparecer, o no, del otro. Descartamos un hundimiento, no cualquier efecto.</p>`}); }
  sec(B,"con",`<p><b>No se ve que la subida del salario mínimo de 2019 hundiera el empleo de hogar registrado.</b> Siguió cayendo, como venía haciendo desde 2016, y no cayó más donde las familias tenían menos renta para pagar el nuevo mínimo.</p>
    <ul class="defs"><li><b>Lo que no se ve.</b> Si algunas familias pasaron a sus empleadas a la economía sumergida, o les redujeron horas manteniendo el alta, no aparece en estos datos. Es justo lo que más preocupaba.</li>
    <li><b>Caída de fondo.</b> El empleo de hogar registrado baja desde 2016 por razones que no tienen que ver con el salario mínimo (envejecimiento de las empleadas, cambios en los cuidados). Separar un efecto pequeño de esa tendencia con datos anuales es difícil.</li>
    <li><b>Hasta 2020.</b> El cambio de 2021 en la asignación de municipios impide seguir la serie municipal más allá.</li>
    <li>Otros trabajos han encontrado efectos negativos pequeños de la subida de 2019 en el empleo de los trabajadores con salarios más bajos (Banco de España) y ninguno claro en el agregado (AIReF, Ministerio de Trabajo). Este análisis, con datos más gruesos, encaja con un efecto pequeño o nulo en este colectivo.</li></ul>`);
  methods(B,[["Qué se hace","Se mira si el empleo de hogar cayó más de lo normal en 2019, el año de la subida del 22 % del salario mínimo, y si cayó más donde las familias tienen menos renta."],["Datos","Seguridad Social: afiliados por municipio y régimen en diciembre (sistema especial de empleados de hogar y total), 2013–2020; INE, Atlas de Distribución de Renta de los Hogares, renta neta por persona de 2018."],["Aceleración","Cambio porcentual del año menos la media de los cambios de los tres años anteriores."],["Grupos de renta","Municipios ordenados por renta por persona de 2018 y repartidos en cinco grupos con la misma población."],["Frente a la tendencia","Cambio de 2018 a 2019 menos la tasa media anual de 2015 a 2018."]]);
  AB.fill({ctx:"En 2019 el salario mínimo subió un 22 %; el servicio doméstico era uno de los empleos más expuestos.",intT:"La medida",int:"Salario mínimo de 736 a 900 euros al mes (de 5,76 a 7,04 euros la hora en el empleo de hogar) desde enero de 2019.",ana:"Afiliadas al régimen de hogar en diciembre, 2013–2020: España frente a su tendencia, y municipios por renta.",res:`Caída del ${f1(Math.abs(ch(hog,2019)))} % en 2019 (aceleración ${pts(a19.v)}), parecida a otros años; sin más caída donde la renta es menor (${pts(grad)}).`,con:"No se ve que la subida hundiera el empleo de hogar registrado; los datos no dicen nada de la economía sumergida."});
}

// Zonas tensionadas de Cataluña: ¿se vendieron más pisos al llegar el tope al alquiler?
// compraventas de vivienda en los municipios con tope: resultados que se cuentan dentro de «¿Funcionó el tope del alquiler en Cataluña?» (X.ahorroMes: euros al mes que sale del alquiler)
async function topeCompRes(B,X){
  const T=(await loadCausales()).tension, per=T.periodos, S=T.series, ix=p=>per.indexOf(p);
  const cat=c=>["08","17","25","43"].includes(c.slice(0,2));
  const ent=Object.entries(S);
  const TR=ent.filter(([c,v])=>v.g===1), AM=ent.filter(([c,v])=>v.g===2), CO=ent.filter(([c,v])=>!cat(c));
  const rng_=(a,b)=>per.filter(p=>p>=a&&p<=b);
  const PRE=rng_("2022T2","2024T1"), POST=rng_("2024T2","2026T2");
  const avg=(L,ps,k="t")=>d3.mean(ps,p=>d3.sum(L,([c,v])=>v[k][ix(p)]||0));
  const did=(L,C,pre,post,k="t")=>((avg(L,post,k)/avg(L,pre,k))/(avg(C,post,k)/avg(C,pre,k))-1)*100;
  const D=did(TR,CO,PRE,POST), Du=did(TR,CO,PRE,POST,"u");
  const DA=did(AM,CO,rng_("2023T1","2024T3"),rng_("2025T1","2026T2"));
  // placebo en el tiempo: «tope» en 2022T2 (antes: 2020T3–2022T1; después: 2022T2–2023T4) y en 2019T1
  const PL=[["2019T1",rng_("2017T1","2018T4"),rng_("2019T1","2019T4")],["2022T2",rng_("2020T3","2022T1"),rng_("2022T2","2023T4")]].map(([l,a,b])=>({l,v:did(TR,CO,a,b)}));
  // sin Barcelona ciudad
  const DnoB=did(TR.filter(([c])=>c!=="08019"),CO,PRE,POST);
  // gemelos: cada municipio con tope frente al más parecido fuera de Cataluña (tamaño, renta, evolución 2019–2023)
  const lg=(v,ps)=>Math.log(1+d3.sum(ps,p=>v.t[ix(p)]||0));
  const gro=v=>lg(v,rng_("2023T1","2023T4"))-lg(v,rng_("2019T1","2019T4"));
  const feat=([c,v])=>[Math.log10(v.p),v.r||12000,gro(v)];
  const okT=TR.filter(([c,v])=>v.p>=10000&&v.r), okC=CO.filter(([c,v])=>v.r);
  const pairs=matchTwins(okT,okC,feat,{maxD:1.0});
  const pd=pr=>(lg(pr.t[1],POST)-lg(pr.t[1],PRE))-(lg(pr.c[1],POST)-lg(pr.c[1],PRE));
  const pdStat=ps=>ps.length?(Math.exp(d3.mean(ps,pd))-1)*100:null, Dtw=pdStat(pairs), ciTw=bootCI(pairs,pdStat);
  const idx=L=>{ const b=avg(L,PRE); return per.map(p=>d3.sum(L,([c,v])=>v.t[ix(p)]||0)/b*100); };
  const QS=rng_("2019T1",per[per.length-1]), qi=QS.map(ix), QL=QS.map(p=>p.replace(/(\d{4})T(\d)/,"T$2 $1"));
  const f1=v=>nf1.format(v), f0=v=>nf0.format(v), pts=v=>(v<0?"−":"+")+nf1.format(Math.abs(v))+NB+"%";



  const iT=idx(TR), iC=idx(CO);
  const drawVentas=d=>lineChart(d,{title:"Compraventas de vivienda (antes del tope = 100)",sub:"Municipios con tope desde marzo de 2024 y municipios de 20.000 hab. o más del resto de España",source:"Fuente: Ministerio de Vivienda (notarios). Cálculo de Indicio.",series:[{n:"Con tope (Cataluña)",v:qi.map(i=>iT[i]),c:"--rust",main:true},{n:"Resto de España",v:qi.map(i=>iC[i]),c:"--slate"}],years:QL,xticks:[QL[0],QL[QS.indexOf("2024T1")],QL[QL.length-1]],fmt:v=>f1(v)});
  const drawVentasTabla=d=>table(d,["",`Antes (${PRE[0].replace("T"," T")}–${PRE[PRE.length-1].replace("T"," T")})`,`Después (${POST[0].replace("T"," T")}–${POST[POST.length-1].replace("T"," T")})`,"Cambio"],[["Con tope",f0(avg(TR,PRE)),f0(avg(TR,POST)),sgn((avg(TR,POST)/avg(TR,PRE)-1)*100)],["Resto de España (20.000 hab. o más)",f0(avg(CO,PRE)),f0(avg(CO,POST)),sgn((avg(CO,POST)/avg(CO,PRE)-1)*100)],["<b>Diferencia en diferencias</b>","","",`<b>${pts(D)}</b>`]]);
  const txtVentas=`<p>Las compraventas subieron en toda España en 2024 y 2025, con la bajada de los tipos de interés. En los municipios con tope subieron más: ${pts(D)} respecto al resto. ${Du>D?"En la vivienda de segunda mano, que es la que se alquilaba, la diferencia es algo mayor":"En la vivienda de segunda mano, que es la que se alquilaba, la diferencia es parecida"} (${pts(Du)}). Las dos líneas iban muy juntas antes del tope y se separan a partir de 2024.</p>`;

  const tituloPruebas=D>0&&Dtw!=null&&Dtw>0?(Dtw<D?"Las pruebas apuntan en la misma dirección, con menos fuerza":"Las pruebas apuntan en la misma dirección"):"Las pruebas no coinciden";
  const drawPruebas=d=>table(d,["Prueba","Resultado"],[
    ["Diferencia en diferencias (principal)",`<b>${pts(D)}</b>`],
    ["Solo vivienda de segunda mano",pts(Du)],
    ["Sin Barcelona ciudad",pts(DnoB)],
    [`Gemelos: ${f0(pairs.length)} municipios con tope de 10.000 hab. o más, cada uno con el más parecido de fuera de Cataluña`,Dtw==null?"—":`${pts(Dtw)}${ciTw?` <small>[${sgn(ciTw[0])}; ${sgn(ciTw[1])}]</small>`:""}`],
    [`Ampliación de octubre de 2024 (${f0(AM.length)} municipios más)`,pts(DA)],
    ...PL.map(p=>[`Placebo: tope falso en ${p.l.replace("T"," T")}`,pts(p.v)])]);
  const plMax=d3.max(PL,p=>Math.abs(p.v));
  const txtPruebas=`<p>${plMax<Math.abs(D)/2?"Los placebos, con fechas en las que no hubo tope, dan diferencias mucho menores: la separación de 2024 no es algo que pase cualquier año.":"Algún placebo da una diferencia del mismo tamaño, así que la separación de 2024 podría ser ruido."} ${Dtw!=null&&ciTw?(ciTw[0]>0?"Con gemelos el resultado se mantiene y el intervalo no incluye el cero.":ciTw[1]<0?"Con gemelos el signo se invierte: el resultado depende de con quién se compare.":"Con gemelos el resultado apunta en la misma dirección, pero el intervalo incluye el cero: la estimación es imprecisa."):""} ${Math.abs(DnoB-D)<3?"Quitar Barcelona apenas lo cambia.":"Quitar Barcelona lo cambia bastante: pesa mucho en el resultado."} ${DA>0?"La ampliación de octubre, con otros municipios y otra fecha, va en la misma dirección.":"La ampliación de octubre, en cambio, no muestra lo mismo."}</p>`;

  const Dp=pts(D), extra=D>0?(avg(TR,POST)-avg(TR,POST)/(1+D/100))*4:null;
  const ver=D>3&&(!ciTw||ciTw[0]>0)?"Tras el tope, en los municipios con tope se vendieron más viviendas que en el resto de España: es compatible con que algunos propietarios vendieran en vez de alquilar.":D>0?"Hay una pista de que tras el tope se vendieron más viviendas en los municipios con tope, pero no es concluyente.":"No se ve que el tope empujara a vender más viviendas.";
  // las dos cifras en la misma escala: ahorro de los inquilinos y compraventas de más, sobre los hogares de alquiler (estimación)
  let escala=null; const HA=EXT.tensionadas.hogaresAlquiler;
  if(HA&&X&&X.ahorroMes&&extra){
    const hog=Math.round(HA.total/1e4)*1e4, ahorro=HA.total*X.ahorroMes*12, ahorroM=Math.max(5,Math.round(ahorro/5e6)*5), share=extra/HA.total*100;
    escala={t:`En la misma escala: unos ${f0(ahorroM)} millones de euros de ahorro al año y un ${f1(share)}${NB}% de los hogares de alquiler en juego`,h:`<p>En los ${f0(TR.length)} municipios con tope viven unos <b>${f0(hog)} hogares de alquiler</b>, según una estimación a partir del censo y del Atlas de Renta. Si todos ahorraran los ${f0(X.ahorroMes*12)}${NB}€ al año que salen con el alquiler medio de Barcelona, serían <b>unos ${f0(ahorroM)} millones de euros al año</b> para los inquilinos, como máximo: fuera de Barcelona los alquileres son más bajos y el ahorro también.</p>
      <p>Las <b>${f0(Math.round(extra/100)*100)} compraventas de más al año</b> equivalen a un ${f1(share)}${NB}% de esos hogares, incluso si todas hubieran salido del alquiler, algo que estos datos no permiten afirmar.</p>`,hog,ahorroM,share};
  }
  return {D,Du,Dtw,ciTw,DA,DnoB,PL,pairs,TR,AM,CO,Dp,extra,ver,drawVentas,drawVentasTabla,drawPruebas,txtVentas,txtPruebas,tituloPruebas,escala};
}

// ---------- deuda de los ayuntamientos según quién gobierna (regresión discontinua con las municipales de 2019 y 2023) ----------
// Deuda de los ayuntamientos según quién ganó por poco. Se pinta dentro de «quien-gobierna».
async function deudaRes(B){
  const DE=(await loadCausales()).deuda, DY=DE.years, PD=SER.padYears;
  const dHab=(code,y,s)=>{ const v=DE.s[code], i=DY.indexOf(y), p=s[SF.pad]&&s[SF.pad][PD.indexOf(y)]; return v&&i>=0&&v[i]!=null&&p?v[i]*1000/p:null; };
  const FAM=l=>l&&l.length?l[0][0]:null;
  const rows=SER.rows.map(r=>({code:r[0],s:r,x:BYCODE.get(r[0])})).filter(o=>o.x&&(o.x[F.pop]||0)>=250);
  // descriptivo: deuda por habitante según la lista más votada en 2019
  const fams=["PP","PSOE"], famOf=o=>{ const f=FAM(o.s[SF.mun]&&o.s[SF.mun][0]); return !f?null:fams.includes(f)?f:"Otras listas"; };
  const DESC=["PP","PSOE","Otras listas"].map(f=>{ const g=rows.filter(o=>famOf(o)===f), a=g.map(o=>({v19:dHab(o.code,2019,o.s),v23:dHab(o.code,2023,o.s),p:o.x[F.pop]})).filter(o=>o.v19!=null&&o.v23!=null);
    const w=k=>d3.sum(a,o=>o[k]*o.p)/d3.sum(a,o=>o.p); return {f,n:a.length,med19:d3.median(a,o=>o.v19),med23:d3.median(a,o=>o.v23),w19:w("v19"),w23:w("v23"),zero:a.filter(o=>o.v23===0).length/a.length*100}; });
  // regresión discontinua (como en «¿Importa quién gobierna?»)
  const H=10;
  const fitW=pts=>{ const W=d3.sum(pts,p=>p.w); if(!W) return null; const mx=d3.sum(pts,p=>p.w*p.x)/W, my=d3.sum(pts,p=>p.w*p.y)/W; let sxy=0,sxx=0; pts.forEach(p=>{ sxy+=p.w*(p.x-mx)*(p.y-my); sxx+=p.w*(p.x-mx)**2; }); const b=sxx?sxy/sxx:0; return {a:my-b*mx,b,n:pts.length}; };
  const jumpAt=(pts,c,h=H)=>{ const k=p=>({...p,w:Math.max(0,1-Math.abs(p.x-c)/h)}); const L=pts.filter(p=>p.x<c&&p.x>=c-h).map(k), R=pts.filter(p=>p.x>=c&&p.x<=c+h).map(k); if(L.length<25||R.length<25) return null; const l=fitW(L), r=fitW(R); return {j:(r.a+r.b*c)-(l.a+l.b*c),l,r,nL:L.length,nR:R.length}; };
  const rd=(pts,c=0,h=H,B_=200)=>{ const j=jumpAt(pts,c,h); if(!j) return null; const ci=bootCI(pts.filter(p=>Math.abs(p.x-c)<=h),s=>{ const q=jumpAt(s,c,h); return q?q.j:null; },{B:B_}); return {...j,ci}; };
  const elec=e=>rows.map(o=>{ const m=o.s[SF.mun]&&o.s[SF.mun][e]; if(!m) return null; const fam=m.map(l=>l[0]); if(!(fam.includes("PP")&&fam.includes("PSOE"))) return null; return {...o,m:m.find(l=>l[0]==="PSOE")[1]-m.find(l=>l[0]==="PP")[1]}; }).filter(Boolean);
  const M19=elec(0), M23=elec(1);
  const clip=(a,lo,hi)=>a.map(p=>({...p,y:Math.max(lo,Math.min(hi,p.y))}));
  const ptsOf=(M,f)=>M.map(d=>({x:d.m,y:f(d)})).filter(p=>p.y!=null&&isFinite(p.y));
  const ch=(y0,y1)=>d=>{ const a=dHab(d.code,y0,d.s), b=dHab(d.code,y1,d.s); return a!=null&&b!=null?b-a:null; };
  const OUT=[["Deuda por habitante, cambio 2019 → 2023 (€)",M19,ch(2019,2023),[-1500,1500]],["Deuda por habitante en 2023 (€)",M19,d=>dHab(d.code,2023,d.s),[0,3000]],["Ayuntamientos con deuda en 2023 (%)",M19,d=>{ const v=dHab(d.code,2023,d.s); return v==null?null:v>0?100:0; },[0,100]],["Mandato 2023: cambio 2023 → 2025 (€)",M23,ch(2023,2025),[-1500,1500]]];
  const est=OUT.map(([l,M,f,[lo,hi]])=>{ const pts=clip(ptsOf(M,f),lo,hi), j=rd(pts); const A=M.filter(d=>d.m>0).map(f).filter(v=>v!=null), Bq=M.filter(d=>d.m<0).map(f).filter(v=>v!=null);
    return {l,pts,j,ci:j&&j.ci,naive:d3.mean(A.map(v=>Math.max(lo,Math.min(hi,v))))-d3.mean(Bq.map(v=>Math.max(lo,Math.min(hi,v)))),bw:[5,7.5,15,20].map(h=>({h,r:rd(pts,0,h,120)})),plc:[-6,-4,4,6].map(c=>({c,r:rd(pts,c,H,100)}))}; });
  const bal=[["Deuda por habitante en 2019 (€)",d=>dHab(d.code,2019,d.s),[0,3000]],["Cambio 2015 → 2019 (€)",ch(2015,2019),[-1500,1500]]].map(([l,f,[lo,hi]])=>({l,r:rd(clip(ptsOf(M19,f),lo,hi),0,H,150)}));
  const sig=est.filter(o=>sigCI(o.ci)), balBad=bal.filter(b=>b.r&&sigCI(b.r.ci));
  const nBw=d3.sum(est,o=>o.bw.filter(b=>b.r&&b.r.ci&&sigCI(b.r.ci)).length), nPl=d3.sum(est,o=>o.plc.filter(p=>p.r&&p.r.ci&&sigCI(p.r.ci)).length);
  const e0=est[0], W_=M19.filter(d=>Math.abs(d.m)<=H).length;
  const f0=v=>nf0.format(v), E=v=>v==null?"—":(v<0?"−":v>0?"+":"")+nf0.format(Math.abs(v))+NB+"€", Ep=v=>v==null?"—":(v<0?"−":v>0?"+":"")+nf1.format(Math.abs(v));

  const dP=DESC[0], dS=DESC[1];
  const s1=res(B,Math.abs(dS.w23-dP.w23)<40?"Los ayuntamientos del PP y del PSOE deben parecido":`Por vecino, los ayuntamientos del ${dS.w23>dP.w23?"PSOE":"PP"} deben más; el típico, casi nada`,`<p>Deuda viva por habitante según la lista más votada en las municipales de 2019. La mediana es el ayuntamiento del medio; la media ponderada, lo que debe en promedio cada vecino.</p>`);
  table(s1,["Lista más votada en 2019","Municipios","Mediana 2019","Mediana 2023","Media por vecino 2019","Media por vecino 2023","Sin deuda en 2023"],DESC.map(d=>[d.f,f0(d.n),eur(d.med19),eur(d.med23),eur(d.w19),eur(d.w23),pc0(d.zero)]));
  lect(s1,`<p>La mayoría de los ayuntamientos pequeños no deben nada, gobierne quien gobierne: por eso la mediana es tan baja. La deuda se concentra en ciudades grandes y en algunos municipios con problemas antiguos (Jaén, Los Barrios, Parla…). La media por vecino depende sobre todo de qué ciudades grandes gobernó cada partido, no de cómo gobiernan: por eso esta comparación no sirve para saber si un partido endeuda más.</p>`);

  const s2=res(B,sig.length?`En las elecciones ajustadas, ${sig.map(o=>low(o.l.split(" (")[0])).join(" y ")}: hay diferencia según quién ganó`:"En las elecciones ajustadas, quién gana no cambia la deuda",`<p>${f0(W_)} municipios decididos por menos de ${H} puntos en 2019. En horizontal, la ventaja del PSOE sobre el PP; en vertical, la deuda. Medias por tramos de 2 puntos y una recta a cada lado del empate.</p>`);
  const grid=add(s2,"div","cols2");
  est.forEach(o=>{ const fg=fig(grid,{title:o.l,source:`Salto en el empate: <b>${o.j?Ep(o.j.j):"—"}</b>${o.ci?` [${Ep(o.ci[0])}; ${Ep(o.ci[1])}]`:""}. Comparación directa PSOE − PP: ${Ep(o.naive)}.`}); rdPlot(fg.body,o,H); });
  lect(s2,`<p>Lo que hay que mirar es el centro de cada gráfico: si el partido del alcalde importara para la deuda, las dos rectas no se encontrarían en el cero. ${sig.length?`Hay escalón en ${sig.map(o=>low(o.l)).join(" y ")}.`:"En los cuatro gráficos el salto es pequeño y su intervalo incluye el cero."} El primero es el principal: cuánto cambió la deuda por habitante durante el mandato 2019–2023 (${e0.j?`salto de ${E(e0.j.j)} por habitante`:"sin datos suficientes"}). El último repite la prueba con las elecciones de 2023 y los dos primeros años de mandato.</p>`);

  const s3=res(B,"Las comprobaciones",`<p>Si el diseño funciona, la deuda de antes de la elección no debería saltar en el empate, y el resultado no debería depender de la ventana ni aparecer en cortes falsos.</p>`);
  table(s3,["Prueba","Resultado"],[...bal.map(b=>[`Antes de la elección: ${low(b.l)}`,b.r?`${Ep(b.r.j)}${b.r.ci?` [${Ep(b.r.ci[0])}; ${Ep(b.r.ci[1])}]`:""}`:"—"]),
    ...est.slice(0,1).flatMap(o=>[...o.bw.map(b=>[`Ventana ±${nf1.format(b.h)} puntos`,b.r?`${Ep(b.r.j)}${b.r.ci&&sigCI(b.r.ci)?"*":""}`:"—"]),...o.plc.map(p=>[`Corte falso en ${p.c>0?"+":"−"}${Math.abs(p.c)} puntos`,p.r?`${Ep(p.r.j)}${p.r.ci&&sigCI(p.r.ci)?"*":""}`:"—"])])]);
  add(s3,"p","muted","Cambio de la deuda por habitante 2019 → 2023, en euros. * El intervalo del 95 % excluye el cero.").style.cssText="font-size:13.5px;margin-top:6px";
  lect(s3,`<p>${balBad.length?"Cuidado: la deuda de antes de la elección ya salta en el empate, así que los dos lados no eran del todo comparables.":"Antes de votar, la deuda de los dos lados del empate era parecida: el diseño compara municipios comparables."} ${nBw||nPl?`Con alguna ventana o algún corte falso aparece un salto aislado (${nBw+nPl} en total, contando los cuatro resultados): es la medida del ruido de estos datos.`:"Ni otras ventanas ni los cortes falsos producen saltos: el resultado es estable."}</p>`);

  return {e0,est,sig,balBad,nBw,nPl,E,Ep,W_,DESC,bal};
}

// ---------- precio de los alimentos frente a sueldos y resto de precios (data/alimentos.json) ----------
async function studyAlimentos(B){
  // El texto está en contenido/analisis/precio-alimentos.md; aquí solo las cifras (V) y los gráficos (G).
  await loadRegional();
  const [A,D]=await Promise.all([getJSON("/data/alimentos.json"),getJSON("/data/sueldos.json")]);
  const P=A.meses, I=A.ipc, mi=p=>+p.slice(5), my=p=>+p.slice(0,4);
  const yav=(v,per,y)=>{ const x=v?per.map((p,i)=>p.startsWith(String(y))?v[i]:null).filter(z=>z!=null):[]; return x.length?d3.mean(x):null; };
  const last12=(v,per)=>d3.mean(v.slice(-12).filter(x=>x!=null));
  const lastY=my(P[P.length-1]), LY=mi(P[P.length-1])===12?lastY:lastY-1;      // último año completo
  const mes=p=>`${MES[mi(p)]} de ${my(p)}`;
  const yoy=v=>v.map((x,i)=>i>=12&&x!=null&&v[i-12]?(x/v[i-12]-1)*100:null);
  const yF=yoy(I.es.alimentos), yG=yoy(I.es.general), iF=d3.maxIndex(yF.map(x=>x==null?-1e9:x)), iG=d3.maxIndex(yG.map(x=>x==null?-1e9:x));
  const E=D.ees, EY=E.años.map(Number), eY=EY[EY.length-1], at=(a,y)=>a[EY.indexOf(y)];
  const fA=y=>yav(I.es.alimentos,P,y), fG=y=>yav(I.es.general,P,y);
  const pw=(a,y,b,pr)=>(at(a,y)/at(a,b)/(pr(y)/pr(b))-1)*100;
  const SMI=D.smiLegal, smiYs=Object.keys(SMI).map(Number), smiLast=smiYs[smiYs.length-1];
  // precio relativo: alimentos / general, 2002 = 100
  const rel=P.map((p,i)=>I.es.alimentos[i]&&I.es.general[i]?I.es.alimentos[i]/I.es.general[i]:null), r0=d3.mean(rel.slice(0,12)), relY=d3.range(2002,LY+1), relA=relY.map(y=>yav(rel.map(v=>v==null?null:v/r0*100),P,y));
  // subclases
  const SUB=A.subclases, sp=SUB.periodos, W=SUB.pesos||{};
  const SHORT={"Carne, fresca, refrigerada o congelada":"la carne fresca","Carne, seca, salada, en salmuera o ahumada":"los embutidos","Pan y productos de panadería":"el pan y la bollería","Pescado,  fresco, refrigerado o congelado":"el pescado fresco","Chocolate, cacao y productos alimenticios a base de cacao":"el chocolate","Zumos de frutas y hortalizas":"los zumos","Aceites vegetales":"el aceite","Café y sucedáneos de café":"el café","Huevos":"los huevos","Leche entera":"la leche entera","Queso":"el queso","Bayas frescas":"las bayas","Azúcar de caña y azúcar de remolacha":"el azúcar","Agua":"el agua embotellada","Refrescos":"los refrescos","Frutos secos naturales, con o sin cáscara":"los frutos secos","Alimentos preparados":"los platos preparados","Yogur y productos similares":"los yogures","Frutas y frutos secos procesados (en conserva, tostados, molidos, etc.)":"la fruta en conserva y los frutos secos tostados","Bebida vegetal":"las bebidas vegetales","Despojos comestibles":"la casquería","Mantequilla y otros aceites y grasas derivados de la leche":"la mantequilla","Otras frutas frescas":"otras frutas frescas","Cítricos frescos":"los cítricos","Patatas y otros tubérculos":"las patatas","Legumbres secas":"las legumbres secas","Harina de cereales":"la harina","Macarrones, tallarines, cuscús y pastas alimenticias similares":"la pasta"};
  const sh=n=>SHORT[n]||low(n.split(",")[0].split(" (")[0]);
  const rows=Object.entries(SUB.s).map(([n,v])=>{ const a=yav(v,sp,2019), b=yav(v,sp,LY); return a&&b?{n,v,a,g:(b/a-1)*100,w:W[n]||0}:null; }).filter(Boolean).sort((a,b)=>b.g-a.g);
  const tw=d3.sum(rows,r=>r.w), con=rows.map(r=>({...r,c:r.w*r.g})).sort((a,b)=>b.c-a.c), tc=d3.sum(con,r=>r.c);
  const ac=rows.find(r=>r.n==="Aceites vegetales"); let acP=null;
  if(ac){ const k=d3.maxIndex(ac.v.map(x=>x==null?-1:x)); acP={g:(ac.v[k]/ac.a-1)*100,p:sp[k],u:(last12(ac.v,sp)/ac.a-1)*100}; }
  // comunidades: comida frente al sueldo mediano, 2019 → último año de sueldos
  const CC=Object.entries(E.ccaa).filter(([c])=>I.ccaa[c]).map(([c,o])=>{ const f=yav(I.ccaa[c].alimentos,P,eY)/yav(I.ccaa[c].alimentos,P,2019); return {c,n:(REG&&REG.ccaa[c])||c,f:(f-1)*100,w:(at(o.Mediana,eY)/at(o.Mediana,2019)-1)*100,b:(at(o.Mediana,eY)/at(o.Mediana,2019)/f-1)*100}; }).sort((a,b)=>b.b-a.b);
  const V={picoAli:yF[iF],picoAliMes:mes(P[iF]),picoGen:yG[iG],picoGenMes:mes(P[iG]),yoyAliUlt:yF[yF.length-1],yoyGenUlt:yG[yG.length-1],ultMes:mes(P[P.length-1]),
    aliUlt19:(last12(I.es.alimentos,P)/fA(2019)-1)*100,gen19:(last12(I.es.general,P)/fG(2019)-1)*100,añoSueldo:eY,med19:(at(E.es.Mediana,eY)/at(E.es.Mediana,2019)-1)*100,
    poderMed:pw(E.es.Mediana,eY,2019,fA),poderMedIPC:pw(E.es.Mediana,eY,2019,fG),poderP10:pw(E.es["Percentil 10"],eY,2019,fA),poderP90:pw(E.es["Percentil 90"],eY,2019,fA),
    smi19:SMI["2019"],smiUlt:SMI[String(smiLast)],smiUltAño:smiLast,smiSubida:(SMI[String(smiLast)]/SMI["2019"]-1)*100,
    rel02:relA[relA.length-1]-100,ali2123:(fA(2023)/fA(2021)-1)*100,ali0821:(fA(2021)/fA(2008)-1)*100,
    sub1N:sh(rows[0].n),sub1:rows[0].g,sub2N:sh(rows[1].n),sub2:rows[1].g,sub3N:sh(rows[2].n),sub3:rows[2].g,low1N:sh(rows[rows.length-1].n),low1:rows[rows.length-1].g,low2N:sh(rows[rows.length-2].n),low2:rows[rows.length-2].g,
    aceitePico:acP&&acP.g,aceitePicoMes:acP&&mes(acP.p),aceiteUlt:acP&&acP.u,
    con1N:sh(con[0].n),con2N:sh(con[1].n),con3N:sh(con[2].n),con3:d3.sum(con.slice(0,3),r=>r.c)/tc*100,
    ccaaMejorN:CC[0].n,ccaaMejor:CC[0].b,ccaaPeorN:CC[CC.length-1].n,ccaaPeor:CC[CC.length-1].b};
  const SRC="Fuente: INE, IPC.", sg=v=>sgn(v);
  const G={
    olas:el=>{ const i0=P.indexOf("2019M01"), per=P.slice(i0).map(p=>MES[mi(p)].slice(0,3)+". "+my(p)); lineChart(el,{title:"Cuánto suben los precios respecto al mismo mes del año anterior",sub:"España, % mensual",source:SRC,years:per,xticks:per.filter(p=>p.startsWith("ene")),tickFmt:v=>nf0.format(v)+NB+"%",fmt:v=>pc(v),
      series:[{n:"Alimentos",v:yF.slice(i0),c:"--rust",main:true},{n:"Todos los precios",v:yG.slice(i0),c:"--slate"}]}); },
    carrera:el=>{ const Y=d3.range(2015,lastY+1); lineChart(el,{title:"Alimentos, todos los precios y sueldo mediano (2019 = 100)",sub:`España, medias anuales${lastY>LY?`; ${lastY}, hasta ${MES[mi(P[P.length-1])]}`:""}. Sueldos hasta ${eY}`,source:"Fuente: INE, IPC y Encuesta Anual de Estructura Salarial.",years:Y,xticks:[2015,2019,2022,lastY],
      series:[{n:"Alimentos",v:Y.map(y=>fA(y)/fA(2019)*100),c:"--rust",main:true},{n:"Todos los precios",v:Y.map(y=>fG(y)/fG(2019)*100),c:"--slate"},{n:"Sueldo mediano",v:Y.map(y=>EY.includes(y)?at(E.es.Mediana,y)/at(E.es.Mediana,2019)*100:null),c:"--ink"}]}); },
    compra:el=>{ const f=fig(el,{title:`Cuánta más (o menos) comida compra el sueldo de ${eY} que el de 2019`,sub:"Subida del sueldo comparada con la de los alimentos",source:"Fuente: INE, Encuesta Anual de Estructura Salarial e IPC."});
      table(f.body,["Sueldo","Subida del sueldo","Subida de la comida","Comida que compra"],[["El 10 % que menos cobra",E.es["Percentil 10"]],["El cuarto de abajo",E.es["Cuartil inferior"]],["Mediano",E.es.Mediana],["El cuarto de arriba",E.es["Cuartil superior"]],["El 10 % que más cobra",E.es["Percentil 90"]]].map(([l,a])=>[l,sg((at(a,eY)/at(a,2019)-1)*100),sg((fA(eY)/fA(2019)-1)*100),`<b>${sg(pw(a,eY,2019,fA))}</b>`])); },
    relativo:el=>lineChart(el,{title:"Precio de la comida en relación con el resto de precios (2002 = 100)",sub:"Alimentos y bebidas no alcohólicas entre el IPC general, medias anuales",source:SRC+" Cálculo de Indicio.",years:relY,xticks:[2002,2008,2014,2019,LY],series:[{n:"Precio relativo",v:relA,c:"--rust",main:true}]}),
    subidas:el=>{ const f=fig(el,{title:`Subida de cada tipo de alimento, 2019–${LY}`,sub:`IPC por subclases, ${rows.length} tipos; la raya es la media de los alimentos`,source:SRC});
      hbars(f.body,rows.map(r=>({l:r.n,v:r.g})),{fmt:sg,ref:(fA(LY)/fA(2019)-1)*100,refLabel:"Alimentos",scroll:true}); },
    cesta:el=>{ const f=fig(el,{title:`Lo que más ha aportado a la subida de la cesta, 2019–${LY}`,sub:"Peso de cada tipo de alimento en la cesta × su subida",source:SRC+" Cálculo de Indicio."});
      table(f.body,["Tipo de alimento","Peso en la cesta","Subida","Parte de la subida total"],con.slice(0,10).map(r=>[r.n,pc(r.w/tw*100),sg(r.g),pc(r.c/tc*100)])); },
    ccaa:el=>{ const f=fig(el,{title:`Comida que compra el sueldo mediano de ${eY} frente al de 2019, por comunidad`,sub:"La raya es España",source:"Fuente: INE, IPC por comunidades y Encuesta Anual de Estructura Salarial."});
      hbars(f.body,CC.map(x=>({l:x.n,v:x.b})),{fmt:sg,ref:V.poderMed,refLabel:"España",wide:true});
      table(f.body,["Comunidad","Comida","Sueldo mediano","Comida que compra"],CC.map(x=>[x.n,sg(x.f),sg(x.w),sg(x.b)])); }
  };
  const IV=ivaCalc(); Object.assign(V,IV.V); Object.assign(G,IV.G);
  G.tuCesta=d=>{ const ali=((1+V.med19/100)/(1+V.poderMed/100)-1)*100, gen=((1+V.med19/100)/(1+V.poderMedIPC/100)-1)*100, w0=20;
    playBox(d,{defs:[["s","Cuánto ha subido tu sueldo desde 2019",0,60,1,"El sueldo mediano subió un "+nf0.format(V.med19)+" % hasta "+V.añoSueldo+".",x=>"+"+x+NB+"%"],["w","Parte de tu gasto que es comida",10,45,1,"En el IPC, la comida pesa en torno a un "+w0+" %; los hogares con menos ingresos gastan más.",x=>x+NB+"%"]],
      pre:[["Sueldo mediano",{s:Math.round(V.med19),w:20}],["Sueldo mínimo",{s:Math.round(V.smiSubida),w:35}],["Sueldo que ha seguido al IPC",{s:Math.round(gen),w:20}]],
      render:st=>{ const propia=gen+(st.w-w0)/100*(ali-gen), pc_=((1+st.s/100)/(1+ali/100)-1)*100, pg=((1+st.s/100)/(1+propia/100)-1)*100;
        return `<div class="big">${pc_>=0?"+":"−"}${nf0.format(Math.abs(pc_))}${NB}% <span class="muted" style="font-size:16px;font-weight:400">de comida que compras con tu sueldo</span></div>
          <p>Hasta ${V.añoSueldo}, la comida ha subido un ${nf0.format(ali)}${NB}% y el conjunto de precios, un ${nf0.format(gen)}${NB}%. Con tu mezcla de gasto, tus precios han subido en torno a un ${nf0.format(propia)}${NB}%, así que para toda tu cesta tu poder de compra ha cambiado un <b>${pg>=0?"+":"−"}${nf0.format(Math.abs(pg))}${NB}%</b>.</p>
          <p class="muted" style="font-size:14px">Cálculo aproximado: el resto de tu gasto sube como el resto de precios. Tu cesta real puede ser distinta.</p>`; }}); };
  mdRender(B,"precio-alimentos",V,G);
}

// ---------- sueldos: dónde estás en la fila y cómo se ha movido cada escalón ----------
// El texto está en contenido/analisis/sueldos.md. Variables que ofrece (V) y gráficos (G): ver abajo.
async function studySueldos(B){
  await loadRegional();
  const [D,A]=await Promise.all([getJSON("/data/sueldos.json"),getJSON("/data/alimentos.json")]);
  const P=A.meses, yav=(v,y)=>{ const x=P.map((p,i)=>p.startsWith(String(y))?v[i]:null).filter(z=>z!=null); return x.length?d3.mean(x):null; };
  const ipc=y=>yav(A.ipc.es.general,y), ali=y=>yav(A.ipc.es.alimentos,y);
  const E=D.ees, EY=E.años.map(Number), eY=EY[EY.length-1], at=(arr,y)=>arr[EY.indexOf(y)];
  const K={p10:"Percentil 10",q1:"Cuartil inferior",med:"Mediana",q3:"Cuartil superior",p90:"Percentil 90",media:"Media"};
  const es=Object.fromEntries(Object.entries(K).map(([k,n])=>[k,E.es[n]]));
  const real=(arr,y,b)=>at(arr,y)/at(arr,b)/(ipc(y)/ipc(b))*100-100, nom=(arr,y,b)=>(at(arr,y)/at(arr,b)-1)*100;
  const SMI=D.smiLegal, smiY=y=>SMI[String(y)], smiYs=Object.keys(SMI).map(Number), smiLast=smiYs[smiYs.length-1];
  const T=D.smiMult, TY=T.años.map(Number), tr=(n,y)=>T.tramos[n][TY.indexOf(y)];
  const EP=D.epa, PY=EP.años.map(Number), pv=(arr,y)=>arr[PY.indexOf(y)], preal=(arr,y,b)=>pv(arr,y)/pv(arr,b)/(ipc(y)/ipc(b))*100-100;
  const C=D.ecv, CY=C.años.map(Number), cv=(arr,y)=>arr[CY.indexOf(y)], cLast=CY[CY.length-1];
  const creal=(arr,y,b)=>cv(arr,y)/cv(arr,b)/(ipc(y-1)/ipc(b-1))*100-100;   // la ECV de cada año recoge ingresos del anterior
  const ratio=EY.map((y,i)=>es.p90[i]/es.p10[i]), iMax=d3.maxIndex(ratio);
  const CC=Object.entries(E.ccaa).map(([c,o])=>({c,n:(REG&&REG.ccaa[c])||c,v:at(o.Mediana,eY),g:real(o.Mediana,eY,2019)})).filter(x=>x.v).sort((a,b)=>b.v-a.v);
  const AG=Object.entries(EP.edad).filter(([g])=>g!=="Total").map(([g,o])=>({l:g.replace(/^De /,"").replace(" y más años"," o más").replace(" años",""),v:preal(o["0"],eY,2008)}));
  const ageTot=preal(EP.edad.Total["0"],eY,2008);
  const V={
    año:eY, añoIni:EY[0], ...Object.fromEntries(Object.keys(K).map(k=>[k,at(es[k],eY)])),
    medMes:at(es.med,eY)/14, saltoAbajo:at(es.med,eY)-at(es.p10,eY), saltoArriba:at(es.p90,eY)-at(es.med,eY), mediaSobreMed:(at(es.media,eY)/at(es.med,eY)-1)*100,
    smiAño:smiY(eY)*14, smiAño2:smiY(eY)*28, tramo01:tr("De 0 a 1 SMI",eY), tramo12:tr("De 1 a 2 SMI",eY), tramo12_15:tr("De 1 a 2 SMI",2015),
    tramo3:d3.sum(Object.keys(T.tramos).filter(n=>/^De [3-7] a|^Más de/.test(n)),n=>tr(n,eY)),
    smi18:smiY(2018), smi19:smiY(2019), smiSubida19:(smiY(2019)/smiY(2018)-1)*100, smiUlt:smiY(smiLast), smiUltAño:smiLast,
    nomMed08:nom(es.med,eY,2008), ipc08:(ipc(eY)/ipc(2008)-1)*100, rMed08:real(es.med,eY,2008),
    rP10crisis:real(es.p10,2014,2008), rP90crisis:real(es.p90,2014,2008), rP10_19:real(es.p10,eY,2019), rMed19:real(es.med,eY,2019), rP90_19:real(es.p90,eY,2019),
    ratioMax:ratio[iMax], ratioMaxAño:EY[iMax], ratioUlt:ratio[ratio.length-1],
    d1:preal(EP.media["1"],eY,2019), d2:preal(EP.media["2"],eY,2019), d10:preal(EP.media["10"],eY,2019),
    edadJov:AG[0].v, edadMay:AG[AG.length-1].v, edadTot:ageTot,
    rentaMed:creal(C.limite["Sexto decil"],cLast,2019), rentaP10:creal(C.limite["Segundo decil"],cLast,2019), rentaP90:creal(C.limite["Décimo decil"],cLast,2019),
    nomMed19:nom(es.med,eY,2019), ipc19:(ipc(eY)/ipc(2019)-1)*100, ali19:(ali(eY)/ali(2019)-1)*100,
    medAli19:(at(es.med,eY)/at(es.med,2019)/(ali(eY)/ali(2019))-1)*100, p10Ali19:(at(es.p10,eY)/at(es.p10,2019)/(ali(eY)/ali(2019))-1)*100,
    ccaaMax:CC[0].v, ccaaMaxN:CC[0].n, ccaaMin:CC[CC.length-1].v, ccaaMinN:CC[CC.length-1].n,
    mujMed:at(E.mujeres.Mediana,eY), homMed:at(E.hombres.Mediana,eY),
    ratioMuj08:at(E.mujeres.Mediana,2008)/at(E.hombres.Mediana,2008)*100, ratioMujUlt:at(E.mujeres.Mediana,eY)/at(E.hombres.Mediana,eY)*100 };
  const eur=v=>nf0.format(v)+NB+"€", SRC="Fuente: INE, Encuesta Anual de Estructura Salarial.";
  // percentil aproximado de un sueldo bruto anual (interpolación en logaritmos entre los percentiles publicados)
  const pts=[[10,V.p10],[25,V.q1],[50,V.med],[75,V.q3],[90,V.p90]];
  const pctOf=x=>{ if(!(x>0)) return null; if(x<=pts[0][1]) return Math.max(1,10*x/pts[0][1]);
    for(let i=1;i<pts.length;i++) if(x<=pts[i][1]){ const [p0,x0]=pts[i-1],[p1,x1]=pts[i]; return p0+(p1-p0)*Math.log(x/x0)/Math.log(x1/x0); }
    const a=Math.log(25/10)/Math.log(V.p90/V.q3); return Math.min(99.9,100-10*Math.pow(x/V.p90,-a)); };
  const G={
    calculadora:el=>{ const c=add(el,"div","calc");
      c.innerHTML=`<div class="ctl"><label>Tu sueldo bruto<input class="sel" type="number" id="sq" min="0" step="100" inputmode="numeric" value="${Math.round(V.med/100)*100}"></label>
        <div class="seg sm" role="group" aria-label="Periodo"><button type="button" data-p="1" aria-pressed="true">Al año</button><button type="button" data-p="14" aria-pressed="false">Al mes, 14 pagas</button><button type="button" data-p="12" aria-pressed="false">Al mes, 12 pagas</button></div>
        <small>Antes de impuestos y cotizaciones. Es lo que pone tu contrato o tu nómina como «total devengado».</small></div><div class="res" aria-live="polite"></div>`;
      let per=1; const inp=c.querySelector("#sq"), res=c.querySelector(".res");
      const draw=()=>{ const x=+inp.value*per, p=pctOf(x);
        if(p==null){ res.innerHTML='<p>Escribe una cantidad.</p>'; return; }
        const pr=Math.round(p), pos=Math.max(0,Math.min(100,p));
        res.innerHTML=`<div class="big">${p>=99.5?"más del 99":nf0.format(pr)}${NB}%</div><p>Cobras más que ${p>=99.5?"casi todos los":`el ${nf0.format(pr)}${NB}% de los`} asalariados de España${per!==1?` (${eur(x)} al año)`:""}. ${p<50?`Para llegar al sueldo mediano te faltan unos ${eur(Math.max(100,Math.round((V.med-x)/100)*100))} al año.`:p<90?`Para entrar en el 10${NB}% de arriba harían falta unos ${eur(Math.round((V.p90-x)/100)*100)} más al año.`:`Estás en el 10${NB}% que más cobra.`}</p>
          <div class="ruler" aria-hidden="true"><i style="left:${pos}%"></i>${[10,25,50,75,90].map(q=>`<b style="left:${q}%"></b>`).join("")}</div><div class="ruler-l" aria-hidden="true"><span>0</span><span>mitad</span><span>100</span></div>`; };
      inp.addEventListener("input",draw);
      c.querySelectorAll("button[data-p]").forEach(b=>b.addEventListener("click",()=>{ const np=+b.dataset.p; inp.value=Math.round(+inp.value*per/np/(np===1?100:10))*(np===1?100:10); per=np; c.querySelectorAll("button[data-p]").forEach(z=>z.setAttribute("aria-pressed",String(z===b))); draw(); }));
      draw(); },
    escalones:el=>{ const f=fig(el,{title:`Cuánto hay que cobrar para estar en cada punto de la fila (${eY})`,sub:"Sueldo bruto anual por asalariado",source:SRC});
      hbars(f.body,[["Más que el 10 %",V.p10],["Más que el 25 %",V.q1],["La mitad (mediano)",V.med,"--rust"],["Sueldo medio",V.media,"--slate"],["Más que el 75 %",V.q3],["Más que el 90 %",V.p90]].map(([l,v,c])=>({l,v,c})),{fmt:eur,wide:true}); },
    tramos:el=>{ const f=fig(el,{title:`Asalariados según cuántas veces cobran el salario mínimo (${eY})`,sub:`Salario mínimo de ${eY}: ${eur(V.smiAño)} al año`,source:"Fuente: INE, Encuesta Anual de Estructura Salarial."});
      const L=[["De 0 a 1 SMI","Menos de 1 vez"],["De 1 a 2 SMI","De 1 a 2 veces"],["De 2 a 3 SMI","De 2 a 3 veces"],["De 3 a 4 SMI","De 3 a 4 veces"],["De 4 a 5 SMI","De 4 a 5 veces"]];
      const rows=L.map(([k,l])=>({l,v:tr(k,eY),c:k==="De 1 a 2 SMI"?"--rust":null})); rows.push({l:"5 veces o más",v:d3.sum(Object.keys(T.tramos).filter(n=>/^De [5-7] a|^Más de/.test(n)),n=>tr(n,eY))});
      hbars(f.body,rows,{fmt:pc,wide:true}); },
    evolucion:el=>{ const yy=EY; lineChart(el,{title:"Cada escalón, descontada la inflación (2008 = 100)",sub:"Sueldo bruto anual en euros constantes",source:SRC+" IPC del INE.",years:yy,index:true,xticks:[2008,2014,2019,eY],
      series:[["El 10 % de abajo",es.p10,"--rust",true],["Cuarto de abajo",es.q1,"--mustard"],["Mediano",es.med,"--ink"],["Cuarto de arriba",es.q3,"--slate"],["El 10 % de arriba",es.p90,"--plum"]].map(([n,a,c,main])=>({n,c,main,v:yy.map(y=>at(a,y)/ipc(y)*ipc(2008))}))}); },
    brecha:el=>lineChart(el,{title:"Cuántas veces cobra el 10 % de arriba lo del 10 % de abajo",sub:"Percentil 90 entre percentil 10 del sueldo bruto anual",source:SRC,years:EY,xticks:[2008,2014,2019,eY],tickFmt:v=>nf1.format(v),fmt:v=>nf1.format(v)+" veces",
      series:[{n:"Veces",v:ratio,c:"--rust",main:true}]}),
    deciles:el=>{ const f=fig(el,{title:`Cuánto ha cambiado el sueldo de cada décimo de asalariados, ${2019}–${eY}`,sub:"Sueldo mensual bruto medio de cada decil, descontada la inflación",source:"Fuente: INE, EPA (salarios por deciles) e IPC."});
      hbars(f.body,d3.range(1,11).map(k=>({l:k===1?"1.º (el que menos cobra)":k===10?"10.º (el que más)":k+".º",v:preal(EP.media[String(k)],eY,2019),c:k<=2?"--rust":null})),{fmt:v=>sgn(v),wide:true}); },
    edad:el=>{ const f=fig(el,{title:`Sueldo medio por edad, ${2008}–${eY}`,sub:"Cambio descontada la inflación",source:"Fuente: INE, EPA (salarios por deciles) e IPC."});
      hbars(f.body,[...AG.map(a=>({l:a.l,v:a.v})),{l:"Todos",v:ageTot,c:"--rust"}],{fmt:v=>sgn(v),wide:true}); },
    renta:el=>{ const f=fig(el,{title:`Renta de los hogares: cambio de cada escalón, ingresos de 2018 a ${cLast-1}`,sub:"Límite de cada decil de renta por unidad de consumo, descontada la inflación",source:"Fuente: INE, Encuesta de Condiciones de Vida e IPC."});
      const N=["Segundo decil","Tercer decil","Cuarto decil","Quinto decil","Sexto decil","Septimo decil","Octavo decil","Noveno decil","Décimo decil"];
      hbars(f.body,N.map((n,i)=>({l:i===0?"El 10 % de abajo":i===4?"La mitad":i===8?"El 10 % de arriba":`${(i+1)*10} %`,v:creal(C.limite[n],cLast,2019),c:i===4?"--rust":null})),{fmt:v=>sgn(v),wide:true}); },
    compra:el=>{ const f=fig(el,{title:`Cuánto más (o menos) compra el sueldo de ${eY} que el de 2019`,sub:"Subida del sueldo comparada con la de los precios",source:"Fuente: INE, Encuesta Anual de Estructura Salarial e IPC."});
      const g=(a,pr)=>(at(a,eY)/at(a,2019)/pr-1)*100, pI=ipc(eY)/ipc(2019), pA=ali(eY)/ali(2019);
      table(f.body,["Sueldo","Subida","De todo (IPC)","De comida"],[["El 10 % de abajo",es.p10],["Mediano",es.med],["El 10 % de arriba",es.p90]].map(([l,a])=>[l,sgn(nom(a,eY,2019)),sgn(g(a,pI)),sgn(g(a,pA))])); },
    ccaa:el=>{ const f=fig(el,{title:`Sueldo mediano por comunidad (${eY})`,sub:"Sueldo bruto anual",source:SRC});
      hbars(f.body,CC.map(x=>({l:x.n,v:x.v})),{fmt:eur,ref:V.med,refLabel:"España",wide:true}); }
  };
  mdRender(B,"sueldos",V,G);
}

// ---------- vivienda: por qué cuesta tanto pagar una casa ----------
// El texto está en contenido/analisis/vivienda.md; aquí las cifras (V) y los gráficos (G).
async function studyVivienda(B){
  const [D,S,A,PW,VC,VCI]=await Promise.all([getJSON("/data/vivienda.json"),getJSON("/data/sueldos.json"),getJSON("/data/alimentos.json"),getJSON("/data/vivienda_pesos.json").catch(()=>null),getJSON("/data/vivienda_censo.json"),getJSON("/data/vivienda_ciudades.json")]);
  const E=D.es, EU=D.eu, P=A.meses, ipcY=y=>{ const x=P.map((p,i)=>p.startsWith(String(y))?A.ipc.es.general[i]:null).filter(v=>v!=null); return x.length===12?d3.mean(x):null; };
  const ees=Object.fromEntries(S.ees.años.map((y,i)=>[y,S.ees.es.Mediana[i]])), eY=+S.ees.años[S.ees.años.length-1];
  const lastK=o=>Object.keys(o).sort().pop(), g=(o,a,b)=>o&&o[a]&&o[b]?(o[b]/o[a]-1)*100:null;
  const aY=+lastK(E.alqMes), tY=+lastK(E.valorTasado), vY=+lastK(E.ipv);
  const city=n=>(D.ciudades[n]||{}).alqMes||{}, CN={"Alacant/Alicante":"Alicante","Hospitalet de Llobregat, L'":"L'Hospitalet","Palmas de Gran Canaria, Las":"Las Palmas","Palma de Mallorca":"Palma"}, cn=n=>CN[n]||n;
  const CIT=Object.keys(D.ciudades).map(n=>({n:cn(n),v:g(city(n),"2015",String(aY))})).filter(x=>x.v!=null).sort((a,b)=>b.v-a.v);
  const vt=E.valorTasado, yrs80=y=>vt[y]&&ees[y]?vt[y]*80/ees[y]:null, tYs=Math.min(tY,eY);
  const ten=E.tenencia, tenY=lastK(ten.prop);
  const euL=(geo,k)=>{ const o=(EU[geo]||{})[k]||{}; const y=lastK(o); return y?{y,v:o[y]}:{}; };
  const hog=EU.ES.hogares, hY=lastK(hog), avg=(o,a,b)=>d3.mean(d3.range(a,b+1).map(y=>o[y]).filter(v=>v!=null));
  const termTot=y=>E.terminadas[y]!=null?E.terminadas[y]+(E.protegidas[y]||0):null;
  const pob=EU.ES.poblacion, pY=lastK(pob);
  const proy=E.hogaresProy, pyK=Object.keys(proy).sort(), proyAño=(proy[pyK[4]]-proy[pyK[0]])/4;
  // viviendas que no son residencia habitual, por tamaño del municipio (Censo 2021)
  const band=(lo,hi)=>{ const rs=rowsAll().filter(r=>r[F.pop]>=lo&&r[F.pop]<hi&&r[F.noPrincipal]!=null), w=d3.sum(rs,r=>r[F.pop]); return {np:d3.sum(rs,r=>r[F.noPrincipal]*r[F.pop])/w, vp:d3.sum(rs.filter(r=>r[F.varPob]!=null),r=>r[F.varPob]*r[F.pop])/d3.sum(rs.filter(r=>r[F.varPob]!=null),r=>r[F.pop])}; };
  const BANDS=[[0,1000,"Menos de 1.000"],[1000,5000,"1.000 a 5.000"],[5000,20000,"5.000 a 20.000"],[20000,100000,"20.000 a 100.000"],[100000,1e9,"Más de 100.000"]].map(([a,b,l])=>({l,...band(a,b)}));
  const vtRows=rowsAll().filter(r=>r[F.vt]!=null&&r[F.pop]), vtES=d3.sum(vtRows,r=>r[F.vt]*r[F.pop])/d3.sum(vtRows,r=>r[F.pop]);
  const hpi=geo=>{ const o=(EU[geo]||{}).hpi||{}, y=lastK(o); return o["2015"]&&y?(o[y]/o["2015"]-1)*100:null; };
  // Dos ideas: construir más o que cada casa sea para vivir.
  // Zonas con demanda: municipios de 20.000 habitantes o más que han ganado población desde 2015.
  // Sus viviendas salen del Censo de 2021 (INE, tablas 59525 y 59531; scripts/datos/vivienda_censo.py): total, principales,
  // vacías y de uso esporádico según el consumo de electricidad, municipio a municipio. Todos los de 20.000 habitantes o más tienen dato.
  const CM=VC.censo.mun, cm=r=>CM[r[F.code]];
  const zon=rowsAll().filter(r=>r[F.pop]>=20000&&r[F.varPob]>0&&cm(r));
  const vivZtot=d3.sum(zon,r=>cm(r)[0]), npZ=d3.sum(zon,r=>cm(r)[0]-cm(r)[1]), vacZ=d3.sum(zon,r=>cm(r)[2]), espZ=d3.sum(zon,r=>cm(r)[3]);
  const vtZ=d3.sum(zon.filter(r=>r[F.vt]!=null),r=>cm(r)[0]*r[F.vt]/100);
  const pobZ=d3.sum(zon,r=>r[F.pop])/d3.sum(rowsAll(),r=>r[F.pop])*100;
  // Hogares nuevos y viviendas terminadas desde 2021 (Banco de España: déficit de unas 750.000 en 2021–2025, Informe Anual 2025)
  const hog21=(hog[hY]-hog["2020"])*1000, term21=d3.sum(d3.range(2021,+hY+1),y=>termTot(y)||0), termAño5=term21/(+hY-2020);
  const proy10=(proy["2036"]-proy["2026"])/10;
  const V={
    alq15:g(E.alqMes,"2015",String(aY)), sal15:g(ees,"2015",String(Math.min(aY,eY))), ipv15:g(E.ipv,"2015",String(vY)), ipc15:(ipcY(aY)/ipcY(2015)-1)*100, añoAlq:aY,
    vlc15:city("València")["2015"], vlc24:city("València")[aY], mlg15:city("Málaga")["2015"], mlg24:city("Málaga")[aY],
    ciudad1:CIT[0].n, ciudad1v:CIT[0].v, ciudad2:CIT[1].n, ciudad2v:CIT[1].v, ciudad3:CIT[2].n, ciudad3v:CIT[2].v,
    añoT:tYs, precio80:vt[tYs]*80, años80:yrs80(tYs), años80_08:yrs80("2008"), años80_19:yrs80("2019"), ipv19:g(E.ipv,"2019",String(vY)), sal19:g(ees,"2019",String(eY)),
    vt25:g(vt,String(tYs),lastK(vt)), añoVt:lastK(vt), entrada:vt[tYs]*80*0.3, entradaAños:vt[tYs]*80*0.3/ees[tYs],
    prop08:ten.prop["2008"], propUlt:ten.prop[tenY], alq08:ten.alqMercado["2008"], alqUlt:ten.alqMercado[tenY], añoTen:tenY,
    sobreES:euL("ES","sobrecargaInquilinos").v, sobreEU:euL("EU27_2020","sobrecargaInquilinos").v, añoEU:euL("ES","sobrecargaInquilinos").y, sobreES14:(EU.ES.sobrecargaInquilinos||{})["2014"],
    padresES:euL("ES","conPadres2534").v, padresEU:euL("EU27_2020","conPadres2534").v, edadES:euL("ES","edadEmancipacion").v, edadEU:euL("EU27_2020","edadEmancipacion").v,
    hog19:(hog[hY]-hog["2019"])*1000, hogAño:(hog[hY]-hog["2019"])*1000/(+hY-2019), añoHog:hY,
    termAño:avg(Object.fromEntries(d3.range(2019,+hY+1).map(y=>[y,termTot(y)])),2019,+hY),
    pob19:pob[pY]-pob["2019"], proyAño, term06:termTot(2006), termMax:d3.max(d3.range(2013,2026),y=>termTot(y)),
    prot0009:avg(E.protegidas,2000,2009), prot1925:avg(E.protegidas,2019,2025),
    npPeq:BANDS[0].np, npGr:BANDS[4].np, vpPeq:BANDS[0].vp, vpGr:BANDS[4].vp, vtES,
    nZ:zon.length, pobZ, npZ, vacZ, espZ, vtZ, vac13:vacZ*.13, hog21, term21, def21:hog21-term21, termAño5, proy10, añoHog21:hY,
    // quién acumula y quién compra (Catastro, INE y Registradores; scripts/datos/vivienda_censo.py)
    ...(()=>{ const U=VC.catastro.urbana, yU=lastK(U), a=U["2015"], z=U[yU], R=VC.catastro.residencial[VC.catastro.ultimo], yR=VC.catastro.ultimo, CP=VC.compras, yC=lastK(CP);
      const sum2=o=>Object.values(o).reduce((s,v)=>[s[0]+v[0],s[1]+v[1]],[0,0]), pf=R.fisicas, pfM=sum2(Object.fromEntries(Object.entries(pf).filter(([k])=>k!=="1"))), pfT=sum2(pf), pj=sum2(R.juridicas);
      return {añoCat:yU, t1d:z["1"]-a["1"], t2d:z["2"]-a["2"], t3p:(z["3"]/a["3"]-1)*100, t6p:(z["6a10"]/a["6a10"]-1)*100,
        añoRes:yR, resInm:R.inmuebles, pfMulti:pfM[0], pfMultiP:pfM[0]/pfT[0]*100, pfMultiInm:pfM[1], pfMultiInmP:pfM[1]/R.inmuebles*100, pjInm:pj[1], pjInmP:pj[1]/R.inmuebles*100,
        añoCp:yC, cpPJ:CP[yC].compradorPJ, cpPJ15:CP["2015"].compradorPJ,
        vacES:VC.censo.vacias, espES:VC.censo.esporadico, vacZP:vacZ/vivZtot*100, espZP:espZ/vivZtot*100}; })(),
    // qué ha separado a los municipios donde más subió el alquiler (scripts/datos/vivienda_pesos.py)
    ...(PW?(()=>{ const m=PW.municipios, T=m.todos, pe=(o,g)=>o.pesos.find(x=>x.g===g)||{}, dem=pe(T,"Demanda"), P=PW.provincias;
      return {mN:m.n, mPob:m.pob/m.pobTotal*100, r2m:T.añaden*100, pDem:dem.v, pDemLo:dem.lo, pDemHi:dem.hi, pTur:pe(T,"Pisos turísticos").v, pVac:pe(T,"Vacías o secundarias").v,
        pCom:pe(T,"Compraventas").v, pCon:pe(T,"Construcción nueva").v, pConHi:pe(T,"Construcción nueva").hi, pDemP:pe(m.provincia,"Demanda").v, pDemPr:pe(P,"Demanda").v, pConPr:pe(P,"Construcción nueva").v, nPr:P.n}; })():{}),
    ...(()=>{ const d0=Math.round((hog21-term21)/50000)*50000, need=d0+Math.max(0,proy10-termAño5)*10, bu=60000*8, mv=vacZ*.13+vtZ*.25; return {cenNeed:need,cenB:bu,cenM:mv,cenCov:(bu+mv)/need*100,cenRat:bu/mv}; })(),
    hpiES:hpi("ES"), hpiEU:hpi("EU27_2020"), hpiNL:hpi("NL"), hpiPT:hpi("PT"),
    inv06:(EU.ES.inversionVivienda||{})["2006"], invES:euL("ES","inversionVivienda").v, invEU:euL("EU27_2020","inversionVivienda").v,
    socialES:ten.alqSocial[tenY], socialAT:euL("AT","alquilerReducido").v, socialNL:euL("NL","alquilerReducido").v };
  const eur=v=>nf0.format(v)+NB+"€", SRC="Fuente: INE y Ministerio de Vivienda.";
  const G={
    carrera:el=>{ const Y=d3.range(2015,Math.max(aY,vY)+1), ix=(o,y)=>o&&o[y]&&o["2015"]?o[y]/o["2015"]*100:null;
      lineChart(el,{title:"Compra, alquiler, sueldos y precios (2015 = 100)",sub:"España, medias anuales",source:"Fuente: INE (IPV, alquiler medio de los contratos declarados, Encuesta de Estructura Salarial, IPC).",years:Y,xticks:[2015,2019,2022,Y[Y.length-1]],
        series:[{n:"Precio de compra",v:Y.map(y=>ix(E.ipv,y)),c:"--rust",main:true},{n:"Alquiler medio",v:Y.map(y=>ix(E.alqMes,y)),c:"--plum",main:true},{n:"Sueldo mediano",v:Y.map(y=>ix(ees,y)),c:"--ink"},{n:"IPC",v:Y.map(y=>ipcY(y)&&ipcY(2015)?ipcY(y)/ipcY(2015)*100:null),c:"--slate",dash:true}]}); },
    ciudades:el=>{ const f=fig(el,{title:`Subida del alquiler medio, 2015–${aY}`,sub:"Grandes ciudades con datos; la raya es España",source:"Fuente: INE, indicadores urbanos (alquiler mensual medio de los contratos declarados)."});
      hbars(f.body,CIT.map(x=>({l:x.n,v:x.v})),{fmt:v=>sgn(v),ref:V.alq15,refLabel:"España",wide:true}); },
    compra:el=>{ const Y=d3.range(2004,tYs+1).map(String); lineChart(el,{title:"Años de sueldo mediano bruto para pagar 80 m²",sub:"Valor tasado medio de la vivienda libre × 80 m², entre el sueldo mediano anual",source:"Fuente: Ministerio de Vivienda (valor tasado) e INE (Encuesta de Estructura Salarial).",years:Y.map(Number),xticks:[2008,2013,2019,tYs],tickFmt:v=>nf0.format(v),fmt:v=>nf1.format(v)+" años",
      series:[{n:"Años de sueldo",v:Y.map(y=>yrs80(y)),c:"--rust",main:true}]}); },
    tenencia:el=>{ const Y=Object.keys(ten.prop).sort(); lineChart(el,{title:"Hogares según el régimen de su vivienda",sub:"% de los hogares",source:"Fuente: INE, Encuesta de Condiciones de Vida.",years:Y.map(Number),xticks:[+Y[0],2008,2014,2019,+Y[Y.length-1]],tickFmt:v=>nf0.format(v)+NB+"%",fmt:pc,
      series:[{n:"En propiedad",v:Y.map(y=>ten.prop[y]),c:"--slate"},{n:"Alquiler de mercado",v:Y.map(y=>ten.alqMercado[y]),c:"--rust",main:true},{n:"Alquiler reducido",v:Y.map(y=>ten.alqSocial[y]),c:"--mustard"}]}); },
    padres:el=>{ const C=[["ES","España"],["IT","Italia"],["PT","Portugal"],["IE","Irlanda"],["EU27_2020","Unión Europea"],["AT","Austria"],["FR","Francia"],["DE","Alemania"],["NL","Países Bajos"],["DK","Dinamarca"]];
      const f=fig(el,{title:"Jóvenes de 25 a 34 años que viven con sus padres",sub:`${V.añoEU}`,source:"Fuente: Eurostat (ilc_lvps08)."});
      hbars(f.body,C.map(([k,l])=>({l,v:euL(k,"conPadres2534").v,c:k==="ES"?"--rust":k==="EU27_2020"?"--slate":null})).filter(x=>x.v!=null).sort((a,b)=>b.v-a.v),{fmt:pc,wide:true}); },
    oferta:el=>{ const Y=d3.range(2010,+hY+1); lineChart(el,{title:"Hogares nuevos y viviendas terminadas cada año",sub:"España, miles",source:"Fuente: Eurostat (hogares, EPA) y Ministerio de Vivienda (viviendas libres terminadas y protegidas con calificación definitiva).",years:Y,xticks:[2010,2013,2019,+hY],tickFmt:v=>nf0.format(v),fmt:v=>nf0.format(v)+" mil",
      series:[{n:"Hogares nuevos",v:Y.map(y=>hog[y]!=null&&hog[y-3]!=null?(hog[y]-hog[y-3])/3:null),c:"--ink",main:true},{n:"Viviendas terminadas",v:Y.map(y=>termTot(y)!=null?termTot(y)/1000:null),c:"--rust",main:true}]});
      add(el,"p","muted","Hogares nuevos: media de los tres últimos años, porque el número de hogares salta de un año a otro por cambios de la encuesta (por ejemplo, en 2021).").style.cssText="font-size:13px;margin-top:-6px"; },
    vacias:el=>{ const f=fig(el,{title:"Viviendas que no son residencia habitual, según el tamaño del municipio",sub:"% de las viviendas (vacías o segundas residencias), Censo de 2021",source:"Fuente: INE, Censo de 2021 y padrón."});
      hbars(f.body,BANDS.map(b=>({l:b.l+" hab.",v:b.np})),{fmt:pc,wide:true}); },
    europa:el=>{ const Y=d3.range(2015,+lastK(EU.ES.hpi)+1), C=[["ES","España","--rust",true],["EU27_2020","Unión Europea","--ink"],["PT","Portugal","--plum"],["NL","Países Bajos","--mustard"],["DE","Alemania","--slate"],["FR","Francia","--stone"],["IT","Italia","--olive"]];
      lineChart(el,{title:"Precio de la vivienda en Europa (2015 = 100)",sub:"Índice de precios de la vivienda, medias anuales",source:"Fuente: Eurostat (prc_hpi_a).",years:Y,xticks:[2015,2019,2022,Y[Y.length-1]],
        series:C.map(([k,n,c,main])=>({n,c,main,v:Y.map(y=>{ const o=(EU[k]||{}).hpi||{}; return o[y]&&o["2015"]?o[y]/o["2015"]*100:null; })}))}); }
  };
  // qué ha separado a los municipios donde más subió el alquiler: reparto con intervalo
  G.pesos=el=>{ if(!PW){ el.remove(); return; } const T=PW.municipios.todos, f=fig(el,{title:"Qué ha separado a los municipios donde más subió el alquiler, 2020–2024",
      sub:`Parte de lo que explican cinco grupos de factores; la raya, el margen del 90 %. ${nf0.format(PW.municipios.n)} municipios de 5.000 habitantes o más.`,
      source:"Fuente: elaboración propia con INE (alquiler, padrón, viviendas turísticas, Censo 2021), Seguridad Social y Ministerio de Vivienda (compraventas)."});
    const L={"Demanda":"Demanda: más gente y más empleo","Pisos turísticos":"Pisos turísticos","Vacías o secundarias":"Viviendas vacías o secundarias","Compraventas":"Compraventas por habitante","Construcción nueva":"Construcción nueva"};
    const R=[...T.pesos].sort((a,b)=>b.v-a.v), W=360, x0=0, X=v=>x0+W*v/100;
    f.body.innerHTML=`<div style="display:grid;gap:12px;margin-top:10px">${R.map(p=>`<div><div style="display:flex;justify-content:space-between;gap:10px;font-size:14.5px"><span${p.g==="Demanda"?' style="color:var(--brand);font-weight:600"':""}>${L[p.g]||p.g}</span><b>${nf0.format(p.v)}${NB}%</b></div>`
      +`<svg viewBox="0 0 ${W} 16" preserveAspectRatio="none" style="display:block;width:100%;max-width:none;height:16px;margin:3px 0 0" aria-hidden="true"><rect x="0" y="4" width="${W}" height="8" rx="2" fill="var(--rule)"/><rect x="0" y="4" width="${X(p.v).toFixed(1)}" height="8" rx="2" fill="${p.g==="Demanda"?"var(--brand)":"var(--ink-2)"}"/>`
      +`<line x1="${X(p.lo).toFixed(1)}" x2="${X(p.hi).toFixed(1)}" y1="8" y2="8" stroke="var(--ink)" stroke-width="1.5"/><line x1="${X(p.lo).toFixed(1)}" x2="${X(p.lo).toFixed(1)}" y1="3" y2="13" stroke="var(--ink)"/><line x1="${X(p.hi).toFixed(1)}" x2="${X(p.hi).toFixed(1)}" y1="3" y2="13" stroke="var(--ink)"/></svg>`
      +`<small class="muted">entre ${nf0.format(p.lo)} y ${nf0.format(p.hi)}${NB}%</small></div>`).join("")}</div>`; };
  // los grises: cuánto puede aportar cada idea en los próximos años
  G.grises=d=>{ const k0=Math.round(V.def21/50000)*50, mil=v=>nf0.format(Math.round(v/1000)*1000);
    playBox(d,{defs:[
      ["d","Viviendas que faltan hoy (miles)",300,900,25,"Nuestra cuenta desde 2021 da unas "+mil(V.def21)+"; el Banco de España, unas 750.000. Depende de desde cuándo se cuente y de qué hogares.",v=>nf0.format(v)+" mil"],
      ["n","Años por delante",5,15,1,"Los hogares que se formarán salen de la proyección del INE: unos "+mil(V.proy10)+" al año.",v=>v+" años"],
      ["b","Viviendas terminadas de más cada año (miles)",0,120,10,"Sobre las "+mil(V.termAño5)+" de ahora. Empiezan a contar a los dos años: es lo que tarda una obra.",v=>"+"+nf0.format(v)+" mil"],
      ["v","Vacías que vuelven a habitarse",0,30,1,"De unas "+mil(V.vacZ)+" en los municipios con demanda. En Francia, gravarlas redujo su número un 13"+NB+"%. Una parte siempre está en venta, en obras o en una herencia.",v=>v+NB+"%"],
      ["t","Turísticas que vuelven a ser vivienda",0,60,5,"De unas "+mil(V.vtZ)+" en los mismos municipios.",v=>v+NB+"%"]],
      pre:[["Las dos a la vez",{d:k0,n:10,b:60,v:13,t:25}],["Lo que pasa hoy",{d:k0,n:10,b:0,v:0,t:0}],["Apostar por construir",{d:k0,n:10,b:100,v:3,t:10}],["Apostar por que cada casa sea para vivir",{d:k0,n:10,b:10,v:30,t:60}]],
      render:st=>{ const need=st.d*1000+Math.max(0,V.proy10-V.termAño5)*st.n, bu=st.b*1000*Math.max(0,st.n-2), mv=V.vacZ*st.v/100, mt=V.vtZ*st.t/100, tot=bu+mv+mt, mx=Math.max(need,tot,1);
        const bar=(l,v,c,note)=>`<div style="margin:10px 0 0"><div style="display:flex;justify-content:space-between;gap:10px;font-size:14.5px"><span>${l}</span><b>${mil(v)}</b></div><div style="height:12px;background:var(--rule);border-radius:3px;overflow:hidden;margin-top:4px"><div style="height:100%;width:${(v/mx*100).toFixed(1)}%;background:${c}"></div></div>${note?`<small class="muted">${note}</small>`:""}</div>`;
        const cov=Math.min(100,tot/need*100), shB=tot?bu/tot*100:0;
        return `<div class="big">${nf0.format(cov)}${NB}% <span class="muted" style="font-size:16px;font-weight:400">de las viviendas que faltarían en ${st.n} años</span></div>`
          +bar("Lo que faltaría",need,"var(--ink-2)","Lo que falta hoy más los hogares nuevos que no cubre el ritmo actual de obra.")
          +bar("Construir más",bu,"var(--brand)","")
          +bar("Vacías que vuelven a habitarse",mv,"color-mix(in srgb,var(--brand) 55%,var(--bg))","")
          +bar("Turísticas que vuelven a ser vivienda",mt,"color-mix(in srgb,var(--brand) 30%,var(--bg))","")
          +(tot?`<p style="margin-top:14px">De lo que aportan las dos ideas, <b>construir pone el ${nf0.format(shB)}${NB}%</b> y que las casas sean para vivir, el ${nf0.format(100-shB)}${NB}%. ${mv+mt>bu?"Movilizar lo que hay llega antes, pero se agota: es una vez. ":"Construir tarda en empezar, pero sigue sumando cada año. "}Lo que no se cubre se reparte como hasta ahora: precios más altos, más jóvenes en casa de sus padres y más pisos compartidos.</p>`
            :`<p style="margin-top:14px">Sin cambiar nada, el hueco crece y se reparte como hasta ahora: precios más altos, más jóvenes en casa de sus padres y más pisos compartidos.</p>`); }}); };
  // ciudad por ciudad (scripts/datos/vivienda_esfuerzo.py): tres tipos de ciudad de 50.000 habitantes o más y, de contraste, los pueblos pequeños y lejanos
  const CN2={"Elx/Elche":"Elche","Alacant/Alicante":"Alicante","Palma de Mallorca":"Palma"}, cName=n=>{ if(CN2[n]) return CN2[n]; const m=n.match(/^(.*), (L'|Las|Los|La|El|A|O|Os|As)$/); return m?(m[2].endsWith("'")?m[2]+m[1]:m[2]+" "+m[1]):dispName(n); };
  const CI=VCI.ciudades, TIPOS=[["costa","Costa y compradores extranjeros"],["atrae","Ciudades que atraen población"],["estable","Crecen poco"]];
  const rowBy=new Map(rowsAll().map(r=>[r[F.code],r])), md=(a,k)=>d3.median(a.map(x=>x[k]).filter(v=>v!=null));
  const grp=Object.fromEntries(TIPOS.map(([t])=>{ const a=CI.filter(x=>x.tipo===t), rs=a.map(x=>rowBy.get(x.c)).filter(Boolean);
    return [t,{n:a.length,a08:md(a,"a08"),a19:md(a,"a19"),a24:md(a,"a24"),vtVar:md(a,"vtVar"),alqVar:md(a,"alqVar"),hog:md(a,"hogNue1000"),ini:md(a,"ini"),comp:md(a,"compHab"),extr:md(a,"extr"),tur:md(a,"tur"),dpob:md(a,"dpob"),
      np:d3.median(rs.map(r=>r[F.noPrincipal]).filter(v=>v!=null)),alq:d3.median(rs.map(r=>r[F.alquiler]).filter(v=>v!=null)),ej:a.slice(0,4).map(x=>cName(x.n))}]; }));
  const rural=rowsAll().filter(r=>r[F.pop]&&r[F.pop]<2000&&r[F.distCiudad]!=null&&r[F.distCiudad]>=45), rm=k=>d3.median(rural.map(r=>r[F[k]]).filter(v=>v!=null));
  Object.assign(V,{cN:CI.length, ...Object.fromEntries(TIPOS.flatMap(([t])=>Object.entries(grp[t]).filter(([k])=>k!=="ej").map(([k,v])=>[t+"_"+k,v]))),
    rurN:rural.length, rurPob:rm("varPob"), rurNp:rm("noPrincipal"), rurAlq:rm("alquiler"), rurExtr:rm("extr")});
  [["mad","Madrid"],["bcn","Barcelona"],["vlc","València"],["mlg","Málaga"],["pmi","Palma"],["zgz","Zaragoza"],["mur","Murcia"]].forEach(([k,n])=>{ const x=CI.find(c=>c.n===n); if(x) Object.assign(V,{["c_"+k+"08"]:x.a08,["c_"+k+"19"]:x.a19,["c_"+k+"24"]:x.a24}); });
  const rd=v=>v>=1000?Math.round(v/100)*100:Math.round(v/10)*10;
  G.tipos=el=>{ const f=fig(el,{title:"Tres tipos de ciudad, tres problemas distintos",sub:`Mediana de las ${CI.length} ciudades de 50.000 habitantes o más con datos, y los pueblos pequeños de contraste`,
      source:"Fuente: elaboración propia con Ministerio de Vivienda, INE (Censo 2021, padrón, Encuesta de Estructura Salarial, alquiler) y Registradores. Hogares nuevos: cambio del padrón 2019–2025 entre las personas por hogar de 2021."});
    const e1=v=>v==null?"—":nf1.format(v), p0=v=>v==null?"—":nf0.format(v)+NB+"%";
    table(f.body,["","Años de sueldo (80 m²) 2008 → 2024","Precio de tasación 2015–2024","Hogares nuevos al año*","Viviendas iniciadas al año*","Viviendas no habituales","Hogares en alquiler"],
      [...TIPOS.map(([t,l])=>{ const g=grp[t]; return [`<b>${l}</b><br><small class="muted">${g.n} ciudades: ${g.ej.join(", ")}…</small>`,`${e1(g.a08)} → <b>${e1(g.a24)}</b>`,sgn(g.vtVar),e1(g.hog),e1(g.ini),p0(g.np),p0(g.alq)]; }),
       [`<b>Pueblos de menos de 2.000 habitantes a 45 km o más de una gran ciudad</b><br><small class="muted">${nf0.format(rural.length)} municipios</small>`,"—","—",`Pierden población (${sgn(rm("varPob"))} desde 2015)`,"—",p0(rm("noPrincipal")),p0(rm("alquiler"))]]);
    add(f.body,"p","muted","* Por cada 1.000 habitantes. Las viviendas iniciadas son las de la provincia (no hay dato municipal). Los pueblos: cambio de población desde 2015, según el padrón.").style.cssText="font-size:13px;margin-top:6px"; };
  // tabla de ciudades con enlace a la ficha de cada una
  G.fichaCiudades=el=>{ const f=fig(el,{title:"Tu ciudad, con todos los datos",sub:"Años de sueldo, hogares nuevos, viviendas no habituales, alquiler y compraventas",source:"Fuente: ver arriba. Cada nombre lleva a la ficha del municipio."});
    const box=add(f.body,"div"), inp=document.createElement("input"); inp.type="search"; inp.placeholder="Busca una ciudad…"; inp.setAttribute("aria-label","Buscar una ciudad"); inp.style.cssText="width:100%;max-width:320px;padding:8px 10px;margin:6px 0 10px;border:1px solid var(--line,#ccc);border-radius:6px;font:inherit;background:var(--bg);color:var(--ink)"; box.appendChild(inp);
    const out=add(box,"div"), more=add(box,"p"); let all=false;
    const draw=()=>{ const q=norm(inp.value.trim()), a=CI.filter(x=>!q||norm(cName(x.n)).includes(q)), v=(all||q)?a:a.slice(0,20); out.innerHTML="";
      const lab={costa:"costa y extranjeros",atrae:"atrae población",estable:"crece poco"};
      table(out,["Ciudad","Años de sueldo 2008 → 2024","Hogares nuevos al año","Viviendas no habituales","En alquiler","Compraventas al año"],
        v.map(x=>{ const r=rowBy.get(x.c); return [`<a href="${munPath(x.c)}">${esc(cName(x.n))}</a><br><small class="muted">${lab[x.tipo]}</small>`,`${nf1.format(x.a08)} → <b>${nf1.format(x.a24)}</b>`,x.hogNue>=0?nf0.format(rd(x.hogNue)):"pierde población",r&&r[F.noPrincipal]!=null?nf0.format(r[F.noPrincipal])+NB+"%":"—",x.alq!=null?nf0.format(x.alq)+NB+"%":"—",x.comp!=null?nf0.format(rd(x.comp)):"—"]; }));
      more.innerHTML=(q||all)?"":`<button type="button" class="btn">Ver las ${CI.length} ciudades</button>`; const b=more.querySelector("button"); if(b) b.onclick=()=>{ all=true; draw(); }; };
    inp.addEventListener("input",draw); draw();
    add(f.body,"p","pt-cta").innerHTML=`<a class="btn" href="/municipio/">Busca tu municipio →</a>`; };
  mdRender(B,"vivienda",V,G);
}

// ---------- análisis: ¿cómo le fue a España con cada Gobierno? (texto en contenido/analisis/gobiernos.md) ----------
async function studyGobiernos(B){
  await loadPaises(); const P=PAIS.paises, ES=P.ES, EU=P.EU27_2020, M=psMandatos();
  const SL={"Adolfo Suárez":"suarez","Leopoldo Calvo-Sotelo":"calvo","Felipe González":"gonzalez","José María Aznar":"aznar","José Luis Rodríguez Zapatero":"zapatero","Mariano Rajoy":"rajoy","Pedro Sánchez":"sanchez"};
  const IND=[["crec","crecimiento","flujo"],["pibpc","pibpc","nivel"],["paro","paro","tasa"],["deuda","deuda","tasa"],["deficit","deficit","flujo"],["gasto","gasto","tasa"],["ingresos","ingresos","tasa"],["inflacion","inflacion","flujo"],["empleo","empleo","tasa"]];
  const V={};
  M.forEach(g=>{ const s=SL[g.p]; if(!s) return; V[s+"_desde"]=g.ys[0]; V[s+"_hasta"]=g.ys[g.ys.length-1];
    IND.forEach(([k,key,t])=>{ const w=psWindow(ES[key],g.ys); const e=psChange(ES[key],w,t), u=psChange(EU[key],w,t);
      if(e!=null) V[`${s}_${k}`]=e; if(u!=null) V[`${s}_${k}_ue`]=u; if(e!=null&&u!=null) V[`${s}_${k}_dif`]=e-u;
      if(w&&t==="tasa"){ V[`${s}_${k}_ini`]=ES[key][w.a]; V[`${s}_${k}_fin`]=ES[key][w.b]; V[`${s}_${k}_a`]=w.a; V[`${s}_${k}_b`]=w.b; } }); });
  const ppc=Object.fromEntries(Object.keys(ES.pibpcPPC).filter(y=>EU.pibpcPPC[y]).map(y=>[y,ES.pibpcPPC[y]/EU.pibpcPPC[y]*100]));
  const py=Object.keys(ppc).sort(), pMax=py.reduce((a,b)=>ppc[b]>ppc[a]?b:a), pMin=py.filter(y=>y>=2009).reduce((a,b)=>ppc[b]<ppc[a]?b:a);
  Object.assign(V,{ppc95:ppc[py[0]],ppcIni:+py[0],ppcMax:ppc[pMax],ppcMaxAño:+pMax,ppc13:ppc["2013"],ppcMin:ppc[pMin],ppcMinAño:+pMin,ppcUlt:ppc[py[py.length-1]],ppcUltAño:+py[py.length-1]});
  const pr=ES.paro, prY=Object.keys(pr).sort(), prMax=prY.reduce((a,b)=>pr[b]>pr[a]?b:a);
  Object.assign(V,{paroMax:pr[prMax],paroMaxAño:+prMax,paroMaxUE:EU.paro[prMax],paroUlt:pr[prY[prY.length-1]],paroUltUE:EU.paro[prY[prY.length-1]],paroUltAño:+prY[prY.length-1],paroMin:Math.min(...prY.filter(y=>y>=2000).map(y=>pr[y])),
    crec20:ES.crecimiento["2020"],crec20UE:EU.crecimiento["2020"],deudaUlt:ES.deuda[Object.keys(ES.deuda).sort().pop()],deudaUltUE:EU.deuda[Object.keys(EU.deuda).sort().pop()],deuda07:ES.deuda["2007"],deudaMax:Math.max(...Object.values(ES.deuda)),deudaMaxAño:+Object.keys(ES.deuda).reduce((a,b)=>ES.deuda[b]>ES.deuda[a]?b:a)});
  const SEL={c:["EU27_2020"],desde:null,hasta:null}, RD=[];
  const yrs=(o,from)=>Object.keys(o).map(Number).filter(y=>y>=Math.max(from,SEL.desde||0)&&y<=(SEL.hasta||9999)).sort((a,b)=>a-b);
  const pcf=v=>pc(v), SRC="Fuente: Eurostat (desde 1995) y Banco Mundial (antes). Fondo: presidente del Gobierno; cada año se asigna a quien gobernó más de la mitad.";
  // países con los que comparar y ventana de años: los elige el lector; todos los gráficos y la tabla se redibujan
  const _u=0, COLS=["--ink","--slate","--mustard","--plum","--olive","--stone"];
  const live=fn=>el=>{ const draw=()=>{ el.innerHTML=""; fn(el); }; RD.push(draw); draw(); };
  const refs=()=>SEL.c.filter(g=>P[g]).map((g,i)=>({g,n:P[g].n,c:COLS[i%COLS.length]}));
  const lines=(key,es,from)=>[{n:"España",v:es||ES[key],c:"--rust",main:true},...refs().map(r=>({n:r.n,v:key==="ppc"?Object.fromEntries(Object.keys(P[r.g].pibpcPPC||{}).filter(y=>EU.pibpcPPC[y]).map(y=>[y,P[r.g].pibpcPPC[y]/EU.pibpcPPC[y]*100])):P[r.g][key]||{},c:r.c,dash:r.g==="EU27_2020"}))];
  const mand=(g,key,t)=>{ const w=psWindow(ES[key],g.ys); return {w,es:psChange(ES[key],w,t),o:refs().map(r=>({...r,v:psChange(P[r.g][key],w,t)}))}; };
  const G={
    paises:el=>{ const all=Object.entries(P).filter(([g])=>g!=="ES");
      const YS=d3.range(1980,+Object.keys(ES.crecimiento).sort().pop()+1), yo=(sel,def)=>YS.map(y=>`<option ${y===(sel||def)?"selected":""}>${y}</option>`).join("");
      el.innerHTML=`<div class="psbar"><span class="psbar-l">Comparar España con</span>${all.map(([g,o])=>`<button type="button" class="pschip" data-g="${g}" aria-pressed="${SEL.c.includes(g)}">${esc(o.n)}</button>`).join("")}
        <span class="psbar-y"><label>Gráficos desde <select id="gbd">${yo(SEL.desde,YS[0])}</select></label><label>hasta <select id="gbh">${yo(SEL.hasta,YS[YS.length-1])}</select></label></span></div>`;
      el.querySelector("#gbd").addEventListener("change",e=>{ SEL.desde=+e.target.value; if(SEL.hasta&&SEL.hasta<=SEL.desde) SEL.hasta=null; RD.forEach(f=>f()); });
      el.querySelector("#gbh").addEventListener("change",e=>{ SEL.hasta=+e.target.value; if(SEL.desde&&SEL.desde>=SEL.hasta) SEL.desde=null; RD.forEach(f=>f()); });
      el.querySelectorAll(".pschip").forEach(b=>b.addEventListener("click",()=>{ const g=b.dataset.g; SEL.c=SEL.c.includes(g)?SEL.c.filter(x=>x!==g):[...SEL.c,g].slice(-6); if(!SEL.c.length) SEL.c=["EU27_2020"];
        el.querySelectorAll(".pschip").forEach(x=>x.setAttribute("aria-pressed",String(SEL.c.includes(x.dataset.g)))); RD.forEach(f=>f()); })); },
    ppc:live(el=>govChart(el,{title:"PIB por habitante, en % de la media de la UE",sub:"En poder de compra (corrige las diferencias de precios). 100 = media de la Unión Europea",source:SRC,years:yrs(ppc,1995),series:lines("ppc",ppc).map(s=>s.n==="Unión Europea"?{...s,v:Object.fromEntries(Object.keys(ppc).map(y=>[y,100]))}:s),fmt:v=>nf1.format(v)})),
    paro:live(el=>govChart(el,{title:"Tasa de paro",sub:"% de la población activa",source:SRC,years:yrs(ES.paro,1991),series:lines("paro"),fmt:pcf,tick:v=>nf0.format(v)+NB+"%"})),
    crecimiento:live(el=>govChart(el,{title:"Crecimiento del PIB",sub:"% sobre el año anterior",source:SRC,years:yrs(ES.crecimiento,1980),series:lines("crecimiento"),fmt:v=>sgn(v),zero:true})),
    deuda:live(el=>govChart(el,{title:"Deuda pública",sub:"% del PIB",source:SRC,years:yrs(ES.deuda,1995),series:lines("deuda"),fmt:pcf,tick:v=>nf0.format(v)+NB+"%"})),
    tabla:live(el=>{ const R0=refs(), f=fig(el,{title:"Cada Gobierno, en cifras",sub:`España y, debajo, ${R0.length>1?"los países elegidos":low(R0[0].n)==="unión europea"?"la media de la UE":R0[0].n} en los mismos años`,source:"Crecimiento y déficit: media anual del mandato. Paro y deuda: cambio en puntos entre el año anterior al primero del mandato y el último. «—»: sin dato comparable. Elige con qué países comparar en los botones de arriba."});
      const pts=v=>(v>0?"+":v<0?"−":"")+nf1.format(Math.abs(v)), dfm=v=>sgn(v);
      const cell=(g,key,t,fm)=>{ const m=mand(g,key,t); if(m.es==null) return "—"; return `<b>${fm(m.es)}</b>${m.o.map(r=>`<small class="psref"><i style="background:var(${r.c})"></i>${esc(r.n.replace("Unión Europea","UE"))} ${r.v==null?"—":fm(r.v)}</small>`).join("")}`; };
      table(f.body,["Presidente","Crecimiento medio","Paro (puntos)","Deuda (puntos)","Déficit medio"],M.filter(g=>SL[g.p]&&V[SL[g.p]+"_crec"]!=null).map(g=>[`<b style="color:${PARTYC[g.partido]}">${esc(g.p)}</b> <small class="muted">${g.partido}, ${g.ys[0]}–${g.hasta?g.ys[g.ys.length-1]:"hoy"}</small>`,cell(g,"crecimiento","flujo",sgn),cell(g,"paro","tasa",pts),cell(g,"deuda","tasa",pts),cell(g,"deficit","flujo",dfm)])); })
  };
  mdRender(B,"gobiernos",V,G);
}

// ---------- vivienda protegida: de 1 de cada 10 viviendas nuevas a casi ninguna ----------
async function studyVPO(B){
  const AB=abstract(B); await loadRegional();
  const D=REG.data, es=D.es.ES, Y=d3.range(1996,2026), ys=Y.map(String);
  const prot=ys.map(y=>es.viv_protegidas[y]??null), lib=ys.map(y=>es.viv_iniciadas[y]!=null?es.viv_iniciadas[y]*10:null);
  const share=ys.map((y,i)=>prot[i]!=null&&lib[i]!=null?prot[i]/(prot[i]+lib[i])*100:null);
  const avg=(o,y0,y1)=>{ const v=d3.range(y0,y1+1).map(y=>o&&o[y]).filter(x=>x!=null); return v.length?d3.mean(v):null; };
  const pBoom=avg(es.viv_protegidas,2005,2008), pNow=avg(es.viv_protegidas,2021,2025), lBoom=avg(es.viv_iniciadas,2005,2008)*10, lNow=avg(es.viv_iniciadas,2021,2025)*10;
  const pad=REFS.es.pad, PY=REFS.padYears, pop=y=>pad[PY.indexOf(y)];
  const nBoom=pBoom*pop(2007)/1e4, nNow=pNow*pop(2024)/1e4;
  const i12=Y.indexOf(2012), i13=Y.indexOf(2013), iMx=d3.maxIndex(share), sh10=share[iMx], yMx=Y[iMx], sh25=d3.mean(d3.range(2021,2026).map(y=>share[Y.indexOf(y)]));
  const CC=Object.entries(REG.ccaa).filter(([c])=>!["18","19"].includes(c)).map(([c,n])=>{ const o=(D.ccaa[c]||{}).viv_protegidas; return {c,n,a:avg(o,2005,2008),b:avg(o,2021,2025)}; }).filter(x=>x.a!=null&&x.b!=null).sort((a,b)=>b.b-a.b);
  const top=CC.slice(0,3), low=CC.filter(x=>x.b<0.5);
  const cp=(D.es.ES.comp_protegida)||{}, cY=d3.range(2004,2026);
  const f1=v=>nf1.format(v), f0=v=>nf0.format(v);

  sec(B,"ctx",`<p>Durante décadas, la vivienda protegida fue una de las vías principales para comprar casa en España: pisos con precio máximo, para hogares por debajo de un límite de renta, construidos por promotores públicos o privados con ayudas. En plena burbuja, entre 2005 y 2008, se terminaban unas <b>${f0(Math.round(nBoom/1000)*1000)}</b> al año.</p>
    <p>Hoy, cuando el acceso a la vivienda es la primera preocupación en muchas encuestas, la vivienda protegida vuelve a estar en todos los programas. Antes de discutir cuánta hace falta conviene saber cuánta se hace: <b>¿qué pasó con la vivienda protegida?</b></p>`);
  sec(B,"int",`<p>La crisis de 2008 hundió la construcción. La libre cayó primero; la protegida aguantó unos años, porque se terminaban promociones ya empezadas y los planes de vivienda seguían en marcha. A partir de 2012 llegaron los recortes: el Plan Estatal 2013–2016 eliminó las ayudas a la promoción de vivienda protegida en propiedad y se centró en el alquiler y la rehabilitación. Desde entonces, cada comunidad ha seguido su camino.</p>`,{title:"Qué cambió"});
  sec(B,"ana",`<p>Se cuentan las viviendas protegidas que reciben cada año la <b>calificación definitiva</b> (el sello que se da al terminarlas), de planes estatales y autonómicos, según el Ministerio de Vivienda, y se comparan con las <b>viviendas libres que se empiezan</b> cada año (visados de dirección de obra). Para comparar territorios de distinto tamaño, todo va por habitante con el padrón. Es un análisis descriptivo: cuenta qué ha pasado, no por qué.</p>`);

  const s1=res(B,`La vivienda protegida pasó de ${f1(pBoom)} a ${f1(pNow)} por cada 10.000 habitantes al año`,`<p>Viviendas por cada 10.000 habitantes y año en España. La libre, por las que se empiezan; la protegida, por las que se terminan.</p>`);
  lineChart(s1,{title:"Viviendas nuevas por cada 10.000 habitantes",sub:"España, 1996–2025",source:"Fuente: Ministerio de Vivienda y padrón. Cálculo de Indicio.",series:[{n:"Libre",v:lib,c:"--slate"},{n:"Protegida",v:prot,c:"--rust",main:true}],years:Y,fmt:v=>f1(v),xticks:[1996,2008,2013,2025]});
  lect(s1,`<p>Las dos líneas cuentan dos crisis distintas. La vivienda libre se desplomó entre 2007 y 2009, de casi 150 a menos de 20 viviendas por cada 10.000 habitantes, y desde 2014 se recupera despacio: hoy se empiezan unas ${f0(lNow)}, menos de una quinta parte que en la burbuja. La protegida aguantó hasta 2012 por encima de 11 y luego cayó de golpe en un solo año, de ${f1(prot[i12])} a ${f1(prot[i13])}. No se ha recuperado: en 2021–2025 se terminan unas ${f0(Math.round(nNow/100)*100)} al año en toda España, frente a unas ${f0(Math.round(nBoom/1000)*1000)} en 2005–2008.</p>`);

  const s2=res(B,`De cada 100 viviendas nuevas, la protegida llegó a ser ${f0(sh10)} en ${yMx}; hoy son ${f0(sh25)}`,`<p>Peso de la protegida en la vivienda nueva: protegidas terminadas sobre la suma de protegidas terminadas y libres iniciadas de cada año. Es una aproximación (una cifra cuenta al terminar y la otra al empezar), pero muestra bien el cambio de escala.</p>`);
  lineChart(s2,{title:"Protegida, % de la vivienda nueva (aproximado)",sub:"España",source:"Fuente: Ministerio de Vivienda. Cálculo de Indicio.",series:[{n:"Protegida",v:share,c:"--rust",main:true}],years:Y,fmt:v=>pc(v),tickFmt:v=>f0(v)+"%",xticks:[1996,2010,2025]});
  lect(s2,`<p>El pico de 2009–2012 no es un auge de la protegida, sino el hundimiento de la libre: mientras nadie empezaba pisos libres, se seguían terminando protegidos. Desde 2013 el peso vuelve a la escala de antes de la crisis, en torno a uno de cada diez, pero sobre un total mucho más pequeño. Y también se vende menos: las compraventas de vivienda protegida, que incluyen las de segunda mano, han bajado del ${pc(cp["2011"])} de todas las compraventas en 2011 al ${pc(cp["2025"])} en 2025.</p>`);

  const s3=res(B,`Solo ${top.map(x=>x.n).join(", ").replace(/, ([^,]*)$/," y $1")} mantienen algo de vivienda protegida`,`<p>Viviendas protegidas terminadas por cada 10.000 habitantes y año, media de 2021 a 2025, con la media de 2005–2008 al lado.</p>`);
  hbars(s3,CC.map(x=>({l:x.n,v:x.b})),{fmt:v=>f1(v),ref:pNow,refLabel:"España"});
  table(s3,["Comunidad","2005–2008","2021–2025","Cambio"],CC.map(x=>[x.n,f1(x.a),f1(x.b),x.a?`−${f0((1-x.b/x.a)*100)}${NB}%`:"—"]));
  lect(s3,`<p>Todas las comunidades hacen hoy mucha menos vivienda protegida que en la burbuja, pero las diferencias son enormes. ${top.map(x=>`${x.n} (${f1(x.b)})`).join(", ").replace(/, ([^,]*)$/," y $1")} siguen terminando varias viviendas protegidas por cada 10.000 habitantes al año; ${low.length} comunidades no llegan a media vivienda: ${low.map(x=>x.n).join(", ").replace(/, ([^,]*)$/," y $1")}. La vivienda protegida depende hoy sobre todo de la política de cada comunidad y de sus ayuntamientos.</p>`);

  { const pop24=pop(2024), r1=Math.round(pNow*10)/10, r2=Math.round(pBoom*10)/10, r3=top[0]?Math.round(top[0].b*10)/10:Math.round(pNow*10)/10, rmax=Math.max(10,Math.ceil(r2));
    const sg=res(B,"Entre el blanco y el negro: ¿cuánta vivienda protegida habría con cada ritmo?",`<p>No hay un único ritmo «correcto». Elige cuántas se terminan al año y cuánto dura la protección, y mira cuántos pisos de precio limitado quedarían dentro de unos años.</p>`);
    playBox(sg,{defs:[["r","Viviendas protegidas terminadas, por cada 10.000 habitantes y año",0,rmax,0.1,"Hoy, "+f1(pNow)+"; en la burbuja (2005–2008), "+f1(pBoom)+".",x=>f1(x)],["d","Años que dura la protección",10,50,5,"Muchas comunidades la dejan caer a los 10–30 años; en otras es permanente (50 = casi para siempre).",x=>x>=50?"permanente":x+" años"],["h","Dentro de cuántos años",5,30,5,"Desde 2025.",x=>x+" años"]],
      pre:[["Ritmo de hoy",{r:r1,d:20,h:20}],[top[0]?"Ritmo de "+top[0].n+", con protección permanente":"Ritmo alto",{r:r3,d:50,h:20}],["Ritmo de la burbuja",{r:r2,d:20,h:20}]],
      render:st=>{ const anual=Math.round(st.r*pop24/1e4/100)*100, nuevas=anual*st.h, vivas=anual*Math.min(st.h,st.d>=50?st.h:st.d);
        return `<div class="big">${f0(anual)} <span class="muted" style="font-size:16px;font-weight:400">viviendas protegidas al año en España</span></div>
          <p>En ${st.h} años serían <b>${f0(Math.round(nuevas/1000)*1000)}</b> nuevas, de las que seguirían protegidas <b>${f0(Math.round(vivas/1000)*1000)}</b>${st.d<st.h?` (las más antiguas habrían perdido la protección)`:""}.</p>
          <p class="muted" style="font-size:14px">Con la población de 2024. No cuenta el parque que ya existe ni el alquiler social que no pasa por la calificación.</p>`; }});
    lect(sg,`<p>La pregunta importante no es cuántas se construyen, sino cuántas siguen siendo protegidas. Con protección temporal y poco ritmo, el parque no crece; con protección permanente, cada vivienda cuenta para siempre.</p>`); }
  sec(B,"con",`<p><b>La vivienda protegida se ha reducido a una sexta parte de lo que era.</b> Se terminan unas ${f0(Math.round(nNow/100)*100)} al año, cuando antes de la crisis eran unas ${f0(Math.round(nBoom/1000)*1000)}, y fuera de un puñado de comunidades apenas se hace. El hundimiento no fue gradual: llegó en 2013, cuando se cortaron las ayudas a la promoción.</p>
    <p>Para el debate actual, el dato importante es que el parque protegido no se está renovando. En muchas comunidades las viviendas protegidas pierden la protección pasados unos años (en algunas, como el País Vasco, es permanente), así que con tan pocas nuevas el número de pisos con precio limitado va menguando aunque nadie lo decida.</p>
    <ul class="defs"><li><b>No cuenta todo el alquiler social.</b> Las viviendas públicas de alquiler que no pasan por la calificación de los planes, o la compra de viviendas por los ayuntamientos, pueden no aparecer aquí.</li>
    <li><b>Dos momentos distintos.</b> La protegida se cuenta al terminar y la libre al empezar; el peso de la protegida es aproximado.</li>
    <li><b>Es descriptivo.</b> Que la protegida cayera con los recortes de 2012–2013 encaja con el calendario, pero aquí no se separa del resto de la crisis de la construcción.</li></ul>`);
  methods(B,[["Qué se hace","Se cuentan las viviendas protegidas terminadas y las libres iniciadas cada año, por habitante, en España y en cada comunidad, de 1996 a 2025."],["Datos","Ministerio de Vivienda y Agenda Urbana: calificaciones definitivas de vivienda protegida, planes estatales y autonómicos (Tabla 1.6), viviendas libres iniciadas (Tabla 3.1) y transacciones inmobiliarias de vivienda (notarios); INE, padrón municipal a 1 de enero."],["Por habitante","Viviendas del año entre la población a 1 de enero del mismo año, por 10.000 habitantes. Las comunidades suman sus provincias."],["Peso en la vivienda nueva","Protegidas terminadas / (protegidas terminadas + libres iniciadas), cada año."],["Comunidades","Media de los años 2005–2008 y 2021–2025; sin Ceuta ni Melilla."]]);
  AB.fill({ctx:"La vivienda protegida, con precio máximo y para hogares con rentas limitadas, fue durante décadas una vía principal para comprar casa.",intT:"Qué cambió",int:"La crisis de 2008 hundió la construcción y en 2013 se cortaron las ayudas estatales a la promoción de vivienda protegida en propiedad.",ana:"Viviendas protegidas terminadas y libres iniciadas por habitante, España y comunidades, 1996–2025 (Ministerio de Vivienda).",res:`De ${f1(pBoom)} a ${f1(pNow)} protegidas por cada 10.000 habitantes al año (2005–2008 frente a 2021–2025); caída en seco en 2013; solo ${top.map(x=>x.n).join(", ").replace(/, ([^,]*)$/," y $1")} mantienen algo.`,con:"El parque protegido no se renueva: con tan pocas viviendas nuevas, el número de pisos con precio limitado mengua solo."});
}

async function studyAve(B){
  const AB=abstract(B);
  await loadTopo(); const CEN=qCen();
  const ST=EXT.ave.estaciones.filter(e=>e.fecha>="2021-01-01"&&e.fecha<="2023-12-31"&&CEN.has(e.code));
  const near=(code,d)=>{ const c=CEN.get(code); if(!c) return Infinity; return d3.min(ST,e=>km(c,CEN.get(e.code))); };
  const PD=SER.padYears, ip=y=>PD.indexOf(y);
  const base=rowsAll().filter(r=>(r[F.pop]||0)>=500&&CEN.has(r[F.code])&&r[F.pobVar1925]!=null&&r[F.renta19]&&r[F.edad19]&&SBY.get(r[F.code])&&SBY.get(r[F.code])[SF.pad]);
  const pre=r=>{ const p=SBY.get(r[F.code])[SF.pad]; return pctg(p[ip(2015)],p[ip(2019)]); };
  base.forEach(r=>{ r._d=near(r[F.code]); r._pre=pre(r); });
  const T=base.filter(r=>r._d<=25&&r._pre!=null), POOL=base.filter(r=>r._d>=60&&r._pre!=null&&!["51","52"].includes(r[F.prov]));
  const feat=r=>[Math.log10(r[F.pop]),r[F.renta19],r[F.edad19],r._pre,Math.log10(1+r[F.distCiudad]),CCAA_OF[r[F.prov]]==="Galicia"?1:0];
  const pairs=matchTwins(T,POOL,feat,{maxD:1.0});
  const Tm=pairs.map(p=>p.t), Cm=pairs.map(p=>p.c);
  const OUT=[["pobVar1925","Población, 2019 → 2025",sgn],["paroVar1923","Paro registrado, 2019 → 2023",sgn],["rentaVar1923","Renta por persona, 2019 → 2023",sgn]];
  const mean_=(rs,k)=>d3.mean(rs.filter(r=>r[F[k]]!=null),r=>r[F[k]]);
  const did=(ps,k)=>{ const a=ps.filter(p=>p.t[F[k]]!=null&&p.c[F[k]]!=null); return a.length?d3.mean(a,p=>p.t[F[k]]-p.c[F[k]]):null; };
  const didTrend=ps=>d3.mean(ps,p=>(p.t[F.pobVar1925]-p.t._pre)-(p.c[F.pobVar1925]-p.c._pre));
  const est=OUT.map(([k,l,f])=>({k,l,f,t:mean_(Tm,k),c:mean_(Cm,k),d:did(pairs,k),ci:bootCI(pairs,s=>did(s,k))}));
  // estudio de eventos: cada municipio cercano con el año de llegada de su estación, gemelos con la misma referencia temporal
  const nearSt=r=>{ const c=CEN.get(r[F.code]); let best=null; ST.forEach(e=>{ const d=km(c,CEN.get(e.code)); if(!best||d<best.d) best={d,e}; }); return best.e; };
  const firstY=f=>{ const y=+f.slice(0,4), mo=+f.slice(5,7); return mo<=6?y:y+1; };
  const TE=T.map(r=>({code:r[F.code],t0:firstY(nearSt(r).fecha)})), poolE=POOL.map(r=>r[F.code]);
  const pE=adMatch(TE,poolE,"pad",false), ESp=esCompute(pE), pR=adMatch(TE,poolE,"paro",false), ESr=esCompute(pR);
  const dT=didTrend(pairs), ciT=bootCI(pairs,didTrend);
  // por estación: población 2019–2025 de los municipios a menos de 25 km frente a sus gemelos
  const byS=ST.map(e=>{ const ps=pairs.filter(p=>km(CEN.get(p.t[F.code]),CEN.get(e.code))<=25); return {e,n:ps.length,d:ps.length?d3.mean(ps,p=>p.t[F.pobVar1925]-p.c[F.pobVar1925]):null}; }).filter(x=>x.n>=3);
  sec(B,"ctx",`<p>Pocas cosas se celebran tanto en una ciudad española como la llegada del AVE. Se inaugura con ministros, se anuncia como el fin del aislamiento y se presenta, una y otra vez, como un antídoto contra la despoblación. España tiene la red de alta velocidad más larga de Europa, y es la gran inversión pública en infraestructuras de las últimas décadas.</p>
    <p>Pero la experiencia de otros países es menos triunfal. La alta velocidad acerca las ciudades pequeñas a las grandes, y eso funciona en los dos sentidos: también facilita que la actividad se concentre en la gran ciudad y que el entorno de la estación pierda peso. Entre 2021 y 2023 el AVE llegó a varias zonas a la vez, Galicia, Extremadura, Burgos, Murcia, Elche, Asturias. Es una ocasión poco habitual para medir qué pasa.</p>`);
  sec(B,"int",`<p>Apertura de servicio comercial de alta velocidad (o altas prestaciones) en ${nf0.format(ST.length)} estaciones entre 2021 y 2023: ${ST.map(e=>e.estacion.replace(/ Alta Velocidad| AV$/,"")).join(", ")}. Tratados: los municipios de 500 habitantes o más a menos de 25 km de una de ellas (${nf0.format(T.length)}).</p>`);  sec(B,"ana",`<p>Se toman los municipios de 500 habitantes o más a <b>menos de 25 km</b> de una de esas estaciones (${nf0.format(T.length)}). Para cada uno se busca un <b>gemelo</b> a más de 60 km de cualquier estación nueva: parecido en tamaño, renta y edad de 2019, distancia a una ciudad grande y, sobre todo, en cómo evolucionaba su población <i>antes</i> (2015–2019). Se comparan los cambios de 2019 en adelante. Y como el AVE se anuncia con años de antelación, se mira también si los cercanos ya crecían distinto antes.</p>`);
  const s3=res(B,"Frente a sus gemelos, los municipios cercanos no cambian en población ni renta",`<p>${nf0.format(pairs.length)} parejas. Antes de la llegada (2015–2019) la población cambiaba un ${sgn(d3.mean(Tm,r=>r._pre))} en los cercanos y un ${sgn(d3.mean(Cm,r=>r._pre))} en sus gemelos (se emparejan por esto, así que van casi a la par). Después:</p>`);
  table(s3,["Qué pasó después","Cerca de una estación nueva","Gemelos","Diferencia"],est.map(o=>[o.l,o.f(o.t),o.f(o.c),`<b>${pts(o.d)} pts</b>${o.ci?` <span class="ci">[${pts(o.ci[0])}; ${pts(o.ci[1])}]</span>`:""}`]));
  add(s3,"p",null,`Descontando además la tendencia previa de cada pareja, la diferencia en población es de ${pts(dT)} puntos${ciT?` [${pts(ciT[0])}; ${pts(ciT[1])}]`:""}.`).style.cssText="max-width:var(--medida);margin-top:8px";
  if(byS.length){ const fs=fig(s3,{title:"Diferencia de población 2019–2025 frente a los gemelos, estación a estación",source:"Media de las parejas con el municipio a menos de 25 km de cada estación (solo estaciones con 3 o más parejas). Puntos de %."});
    hbars(fs.body,byS.sort((a,b)=>b.d-a.d).map(x=>({l:`${x.e.estacion.replace(/ Alta Velocidad| AV$/,"")} (${x.n})`,v:x.d})),{fmt:v=>pts(v)+" pts",color:"--rust"}); }
  const sig=est.filter(o=>o.ci&&(o.ci[0]>0||o.ci[1]<0));
  lect(s3,`<p>La comparación es entre cada municipio cercano a una estación nueva y su «gemelo»: un municipio lejos de cualquier estación que se le parecía en todo antes de 2019, incluido cómo estaba cambiando su población. Si el AVE hubiera atraído vecinos, la columna de los cercanos debería despegarse de la de los gemelos. Las diferencias son pequeñas, de décimas o pocos puntos. ${est.filter(o=>o.ci&&sigCI(o.ci)).length?`La excepción es ${est.filter(o=>o.ci&&sigCI(o.ci)).map(o=>low(o.l.split(",")[0])).join(" y ")}, que ${est.filter(o=>o.ci&&sigCI(o.ci)).length>1?"se distinguen":"se distingue"} de cero, aunque por poco: el intervalo roza el cero y es una sola cifra entre varias, así que conviene leerla con cautela.`:"Todos los intervalos de confianza incluyen el cero."}</p><p>El desglose por estaciones es más interesante que la media: hay entornos que ganan algo frente a sus gemelos y otros que pierden. La media esconde historias distintas, que encajan con la idea de que el AVE beneficia a unos sitios a costa de otros.</p>`);
  const s4=res(B,ESp.postSig?`Año a año, la población de los cercanos ${ESp.post>0?"se separa al alza":"se separa a la baja"} tras la llegada`:"Año a año, ni antes ni después de la llegada se separan de sus gemelos",`<p>Estudio de eventos: cada municipio cercano y su gemelo, con el año de llegada de su estación como año 0. Diferencia previa media: ${ESp.pre==null?"—":`${pts(ESp.pre)} puntos${ciPts(ESp.preCI)}`}; posterior: <b>${pts(ESp.post)} puntos</b>${ciPts(ESp.postCI)} de índice de población. En paro registrado: previa ${ESr.pre==null?"—":`${pts(ESr.pre)}${ciPts(ESr.preCI)}`}, posterior <b>${pts(ESr.post)}</b>${ciPts(ESr.postCI)}.</p>`);
  esCharts(s4,ESp,{yl:"población",src:"Fuente: INE, padrón."});
  lect(s4,`<p>Este gráfico ordena el tiempo respecto a la llegada de cada estación: el 0 es el año de apertura, los negativos son los años anteriores. Antes del 0 la línea debería estar en cero, porque los gemelos se eligieron para que se parecieran. Después, si el AVE tuviera efecto, se separaría. Lo que se ve es una línea que se mueve poco y con intervalos anchos: con tan pocos años después de la llegada, todavía no hay una señal clara.</p>`);
  { const hwp=est[0].ci?Math.abs(est[0].ci[1]-est[0].ci[0])/2:null, hwr=est[2].ci?Math.abs(est[2].ci[1]-est[2].ci[0])/2:null;
    if(hwp!=null&&hwr!=null) detectBox(B,{title:"Entre el blanco y el negro: ¿cuánto tendría que cambiar el AVE un pueblo para que lo viéramos?",intro:"No se ve efecto, pero «no se ve» tiene un tamaño. Prueba un efecto hipotético y mira si estos datos lo habrían detectado, y qué supondría para un pueblo de verdad.",
      items:[{k:"pop",label:"Efecto del AVE sobre la población en seis años",min:-6,max:6,step:0.5,unit:"puntos",note:"Positivo: gana más vecinos de los que habría ganado.",hw:hwp,pre:[0,1.5,4],big:v=>[(v>0?"+":v<0?"−":"")+nf0.format(Math.abs(Math.round(5000*v/100))),"vecinos en un pueblo de 5.000 habitantes"]},
             {k:"ren",label:"Efecto sobre la renta por persona en cuatro años",min:-6,max:6,step:0.5,unit:"puntos",note:"Positivo: la renta crece más que en los gemelos.",hw:hwr,pre:[0,1.5,4],big:v=>[(v>0?"+":v<0?"−":"")+nf0.format(Math.abs(Math.round(15000*v/100)))+NB+"€","al año por persona, con 15.000 € de renta"]}],
      lect:`<p>Los datos descartan un efecto grande, no uno pequeño. Y el promedio puede esconder lo que pasa en cada estación: en unas el entorno gana vecinos y en otras los pierde, como se ve en el gráfico de estación a estación.</p>`}); }
  sec(B,"con",`<p>${sig.length?`Los municipios cercanos a una estación nueva ${sig.map(o=>o.k.startsWith("paro")?`${o.d<0?"vieron bajar":"vieron subir"} el paro registrado ${nf1.format(Math.abs(o.d))} puntos más que sus gemelos`:`${o.d>0?"ganaron":"perdieron"} ${nf1.format(Math.abs(o.d))} puntos de ${low(o.l.split(",")[0])} ${o.d>0?"más":"menos"} que sus gemelos`).join(" y ")}, una diferencia que no basta para hablar de efecto del AVE. En lo demás, no se distingue nada.`:"A estos pocos años vista, los municipios cercanos a una estación nueva no se distinguen de sus gemelos ni en población, ni en paro, ni en renta: los intervalos incluyen el cero."}</p>
    <p>La conclusión prudente es que el AVE no ha sido, al menos en sus primeros años, ni la salvación ni la condena de los municipios de su entorno. Quien espere que una estación frene la despoblación por sí sola debería mirar estos datos con atención; quien tema que vacíe las comarcas, también. Lo que la alta velocidad hace bien, acortar viajes, no se traduce de forma automática en vecinos ni en renta, y menos en dos o tres años.</p>
    <ul class="defs"><li><b>Los dos métodos no coinciden del todo.</b> Comparando 2019 con 2025, la población de los cercanos ${est[0].d>0?"sube":"baja"} ${nf1.format(Math.abs(est[0].d))} puntos frente a sus gemelos; en el estudio de eventos, que alinea cada municipio con el año de llegada de su estación, ${ESp.post>0?"sube":"baja"} ${nf1.format(Math.abs(ESp.post))}. Las dos cifras son pequeñas y ${sigCI(est[0].ci)&&sigCI(ESp.postCI)&&Math.sign(est[0].d)!==Math.sign(ESp.post)?"de signo contrario":"cercanas a cero"}: lo prudente es no concluir un efecto sobre la población.</li><li><b>Es pronto.</b> Las estaciones abrieron entre 2021 y 2023 y los datos llegan a 2023–2025. Los efectos del AVE que encuentra la literatura (sobre todo en turismo y en concentrar actividad en las ciudades con estación) tardan más.</li>
    <li><b>Los gemelos corrigen mucho, no todo:</b> se emparejan por tamaño, renta, edad, lejanía y tendencia previa, pero una estación no cae al azar.</li>
    <li><b>Se mide el entorno de 25 km, no solo la ciudad con estación.</b> El efecto puede ser positivo en la ciudad y negativo en su entorno (el AVE «aspira» actividad): mirando estación a estación se ve parte de eso.</li>
    <li>La lista de estaciones y fechas está en el repositorio; Extremadura tiene desde julio de 2022 trenes de altas prestaciones, no AVE puro.</li></ul>`);
  AB.fill({ctx:"La alta velocidad se presenta como herramienta contra la despoblación; la evidencia internacional es mixta.",int:`Llegada de la alta velocidad a ${ST.length} estaciones entre 2021 y 2023; ${T.length} municipios a menos de 25 km.`,ana:"Gemelos emparejados por tamaño, renta, edad, lejanía y tendencia previa; diferencias en diferencias y estudio de eventos año a año.",res:`Población ${pts(est[0].d)} puntos frente a gemelos${ciPts(est[0].ci)}; paro ${pts(est[1].d)}${ciPts(est[1].ci)}; en el estudio de eventos, población ${pts(ESp.post)}${ciPts(ESp.postCI)}.`,con:"A pocos años de la llegada, el efecto sobre la población del entorno es pequeño o nulo, y los métodos no coinciden en el signo; varía mucho de una estación a otra."});
  methods(B,[["Qué se hace","Cada municipio cercano a una estación nueva de alta velocidad se compara con un gemelo lejano que evolucionaba igual antes, y se mira si después se separan, en conjunto y año a año."],["Estudio de eventos","Gemelos por vecino más cercano (con reemplazo) entre los municipios a más de 60 km de cualquier estación nueva, en log del padrón, cambio anual medio en los dos años previos y log del nivel previo; año 0 = primer año con servicio (si abre en el segundo semestre, el siguiente). Bootstrap de parejas."],["Unidad",`${nf0.format(T.length)} municipios de 500 habitantes o más a menos de 25 km (centro a centro) de una estación con alta velocidad abierta entre 2021 y 2023; ${nf0.format(pairs.length)} con gemelo`],["Gemelos","El municipio más cercano (distancia estandarizada ≤ 1) entre los que están a más de 60 km de cualquier estación nueva, en log del padrón, renta y edad de 2019, cambio del padrón 2015–2019, log de la distancia a una ciudad grande y Galicia sí/no; cada gemelo se usa una vez"],["Resultados","Cambio del padrón 2019–2025; del paro registrado 2019–2023; de la renta por persona 2019–2023"],["Modelo","Diferencia de medias entre parejas; intervalo del 95 % por remuestreo de parejas (200 réplicas). Versión con tendencia: (cambio 2019–2025 − cambio 2015–2019) del cercano menos lo mismo del gemelo"]]);
}

// ---------- prohibir pisos turísticos: ¿baja el número de pisos turísticos? ----------
function studyVutBan(B){
  const AB=abstract(B);
  const P=SER.vtPeriods, per=d=>{ // periodo del INE justo anterior a la fecha
    const key=d.slice(0,4)+"M"+d.slice(5,7); let i=-1; P.forEach((p,k)=>{ if(p<key) i=k; }); return i; };
  const R=EXT.vut.municipios.filter(m=>m.fecha>="2023-06-01"&&m.fecha<="2025-06-30"&&m.confianza!=="baja");
  const byCode=new Map(); R.forEach(m=>{ const i=per(m.fecha); if(i>=2&&i<=P.length-3&&(!byCode.has(m.code)||byCode.get(m.code).i>i)) byCode.set(m.code,{...m,i}); });
  const T=[...byCode.values()].map(m=>{ const r=BYCODE.get(m.code), s=SBY.get(m.code); if(!r||!s||!s[SF.vtp]||(r[F.pop]||0)<5000) return null; const v=s[SF.vtp]; if(v[m.i]==null||v[m.i-2]==null||v[P.length-1]==null) return null; return {...m,row:r,v,pre:v[m.i]-v[m.i-2],post:v[P.length-1]-v[m.i],lvl:v[m.i],after:P.length-1-m.i}; }).filter(Boolean);
  const TS=new Set(T.map(t=>t.code));
  const pool=rowsAll().filter(r=>(r[F.pop]||0)>=5000&&!TS.has(r[F.code])&&SBY.get(r[F.code])&&SBY.get(r[F.code])[SF.vtp]&&SBY.get(r[F.code])[SF.vtp].every(v=>v!=null));
  // gemelo: misma CCAA, parecido en tamaño, nivel de pisos turísticos y tendencia previa, con las mismas fechas que el tratado
  const pairs=T.map(t=>{ const c=pool.filter(r=>CCAA_OF[r[F.prov]]===CCAA_OF[t.row[F.prov]]).map(r=>{ const v=SBY.get(r[F.code])[SF.vtp]; return {r,v,lvl:v[t.i],pre:v[t.i]-v[t.i-2],post:v[P.length-1]-v[t.i]}; });
    const sdL=d3.deviation(c,x=>Math.log10(1+x.lvl))||1, sdP=d3.deviation(c,x=>x.pre)||1, sdN=d3.deviation(c,x=>Math.log10(x.r[F.pop]))||1;
    let best=null; c.forEach(x=>{ const d=Math.hypot((Math.log10(1+x.lvl)-Math.log10(1+t.lvl))/sdL,(x.pre-t.pre)/sdP,(Math.log10(x.r[F.pop])-Math.log10(t.row[F.pop]))/sdN); if(!best||d<best.d) best={d,...x}; });
    return best?{t,c:best}:null; }).filter(Boolean);
  const rel=(x,k)=>x.lvl?x[k]/x.lvl*100:null; // cambio en % del stock
  const did=ps=>d3.mean(ps,p=>(rel(p.t,"post")-rel(p.t,"pre"))-(rel(p.c,"post")-rel(p.c,"pre")));
  const didPts=ps=>d3.mean(ps,p=>(p.t.post-p.t.pre)-(p.c.post-p.c.pre));
  const d=did(pairs), ci=bootCI(pairs,did), dp=didPts(pairs);
  // estudio de eventos anual (agosto de cada año), con gemelos de la misma comunidad y placebos con grupos al azar
  const pl0=p=>p.p===0?"ninguno":`un ${nf0.format(p.p*100)}${NB}%`;
  const fy=f=>{ const y=+f.slice(0,4), mo=+f.slice(5,7); return mo<=6?y:y+1; };
  const TE=T.filter(t=>fy(t.fecha)>=2022&&fy(t.fecha)<=2025).map(t=>({code:t.code,t0:fy(t.fecha)})), TSv=new Set(EXT.vut.municipios.map(m=>m.code));
  const poolE=pool.map(r=>r[F.code]).filter(c=>!TSv.has(c));
  const pE=adMatch(TE,poolE,"vtp",true), ESv=pE.length>=5?esCompute(pE):null, plv=ESv?esPlacebo(pE,poolE,"vtp",true,ESv.post,{R:30}):null;
  const mT=d3.mean(pairs,p=>rel(p.t,"post")), mC=d3.mean(pairs,p=>rel(p.c,"post")), pT=d3.mean(pairs,p=>rel(p.t,"pre")), pC=d3.mean(pairs,p=>rel(p.c,"pre"));
  sec(B,"ctx",`<p>Los pisos turísticos se han convertido en el gran sospechoso de la crisis de la vivienda en las ciudades. En los barrios céntricos de Madrid, Barcelona, València o Málaga, los vecinos ven cómo los portales se llenan de cajetines de llaves y maletas con ruedas, y la respuesta política ha sido cada vez más dura: moratorias de licencias, prohibiciones por barrios y, en algunos casos, en todo el municipio.</p>
    <p>El objetivo último es que esas viviendas vuelvan al alquiler habitual y que su precio se contenga. Pero antes hay una pregunta que casi nadie se hace: <b>¿consiguen estas medidas frenar siquiera el número de pisos turísticos?</b> Si no lo hacen, no pueden bajar el alquiler. <a href="/preguntas/pisos-turisticos/">En otro análisis</a> medimos la relación entre pisos turísticos y alquiler; aquí miramos el primer eslabón.</p>`);
  sec(B,"int",`<p>Moratorias o prohibiciones de nuevas viviendas turísticas aprobadas entre 2021 y 2025, con fecha confirmada en boletín oficial o prensa (lista en el repositorio, con su grado de confianza): Madrid, València, Sevilla, Málaga, Alicante, Badalona, L'Hospitalet, Córdoba, Granada y otros. El resultado es el número de viviendas turísticas que cuenta el INE con datos de las plataformas, dos veces al año desde 2020.</p>`);  sec(B,"ana",`<p>Se toman los municipios con una moratoria o prohibición aprobada entre mediados de 2023 y mediados de 2025 (con fecha confirmada), para tener al menos dos cuentas del INE después. Para cada uno se busca un <b>gemelo</b> de la misma comunidad, parecido en tamaño, en peso de los pisos turísticos y en cómo venían creciendo justo antes, que no haya prohibido nada. Se compara cómo cambió el número de pisos turísticos (en % de los que había) en el año anterior a la medida y desde la medida hasta mayo de 2026, en unos y en otros.</p>`);
  const s3=res(B,"Municipio a municipio, antes y después de la medida",`<p>${nf0.format(pairs.length)} municipios con medida y gemelo. Antes de la medida los pisos turísticos crecían un ${sgn(pT)} en ellos y un ${sgn(pC)} en sus gemelos; después, ${sgn(mT)} frente a ${sgn(mC)}.</p>`);
  table(s3,["Municipio","Medida (fecha)","Antes","Después","Gemelo: antes","Gemelo: después"],pairs.sort((a,b)=>a.t.fecha.localeCompare(b.t.fecha)).map(p=>[`<b>${esc(dispName(p.t.row[F.name]))}</b>`,`${p.t.alcance==="total"?"Total":"Parcial"} (${fechaES(p.t.fecha).replace(/^\d+ de /,"")})`,sgn(rel(p.t,"pre")),`<b>${sgn(rel(p.t,"post"))}</b>`,sgn(rel(p.c,"pre"))+` <small class="muted">${esc(dispName(p.c.r[F.name]))}</small>`,sgn(rel(p.c,"post"))]));
  lect(s3,`<p>La tabla enseña cada caso por separado: cuánto crecían los pisos turísticos antes y después de la medida, en el municipio que prohibió y en su gemelo, un municipio de la misma comunidad que venía igual pero no hizo nada. Si la medida funcionara, la columna «Después» debería quedar claramente por debajo de la del gemelo. Hay casos en los que pasa y casos en los que no; con tan pocos municipios, cada uno pesa mucho en la media.</p>`);
  if(ESv){ const s4=res(B,`Estudio de eventos: ${ESv.postSig?(ESv.post<0?"tras la medida, los pisos turísticos caen más que en los gemelos":"tras la medida, crecen más que en los gemelos"):"tras la medida, no se separan de sus gemelos de forma clara"}`,`<p>Dato de agosto de cada año, índice con el año anterior a la medida = 100, ${ESv.n} municipios con gemelo de su misma comunidad. Diferencia previa: ${ESv.pre==null?"—":`${pts(ESv.pre)}${ciPts(ESv.preCI)}`}; posterior: <b>${pts(ESv.post)} puntos</b>${ciPts(ESv.postCI)}. ${plv?`Con ${plv.n} grupos elegidos al azar, ${pl0(plv)} igualan o superan esa diferencia.`:""}</p>`); esCharts(s4,ESv,{yl:"pisos turísticos",src:"Fuente: INE, medición de viviendas turísticas."}); }
  { const lv=d3.mean(T,t=>t.lvl), ef=Math.round(d), emax=Math.max(30,Math.abs(ef)+5);
    const sg=res(B,"Entre el blanco y el negro: ¿cuántas viviendas volverían al alquiler?",`<p>Frenar los pisos turísticos no es lo mismo que devolver viviendas al alquiler: entre una cosa y otra hay supuestos. Elige cuánto frena la medida (la medida real está en el análisis) y qué parte de lo evitado acaba siendo alquiler de residentes, y mira qué supone por cada 1.000 viviendas.</p>`);
    playBox(sg,{defs:[["e","Efecto de la medida sobre el stock de pisos turísticos",-40,10,1,"En % del stock inicial, frente a municipios parecidos. Negativo: crece menos.",x=>(x>0?"+":x<0?"−":"")+Math.abs(x)+NB+"%"],["f","De lo evitado, parte que pasa a alquiler de residentes",0,100,5,"Supuesto: otros usos son la venta, la vivienda vacía o el piso para uso propio. No lo miden estos datos.",x=>x+NB+"%"]],
      pre:[["Lo medido, con poca vuelta",{e:ef,f:20}],["Lo medido, con mucha vuelta",{e:ef,f:70}],["Una prohibición que funciona de verdad",{e:-30,f:60}]],
      render:st=>{ const stock=lv*10, ev=-st.e/100*stock, vuelven=ev*st.f/100;
        return `<div class="big">${nf1.format(Math.abs(ev))} <span class="muted" style="font-size:16px;font-weight:400">pisos turísticos ${ev>=0?"menos":"más"}, por cada 1.000 viviendas del municipio</span></div>
          <p>Con un ${nf1.format(lv)}${NB}% de viviendas turísticas de partida, son ${nf1.format(stock)} por cada 1.000 viviendas.</p>
          <div class="big" style="margin-top:14px">${nf1.format(Math.abs(vuelven))} <span class="muted" style="font-size:16px;font-weight:400">viviendas ${vuelven>=0?"más":"menos"} para alquilar</span></div>
          <p>${Math.abs(vuelven)<0.5?"Una cifra tan pequeña no mueve el precio del alquiler de un municipio.":"Hay que comparar esto con las viviendas que se alquilan en el municipio para saber si cambia el precio."}</p>`; }});
    lect(sg,`<p>Entre el efecto de la medida y el alquiler hay dos escalones: que frene los pisos turísticos, y que lo evitado se convierta en alquiler. Con los datos de ahora solo se mide el primero. Lo que falta, los precios de los anuncios, es la pieza que habría que añadir para cerrar la cadena.</p>`); }
  sec(B,"con",`<p>Donde se prohibió, los pisos turísticos ${d<0?"crecieron":"crecieron"} <mark>${nf0.format(Math.abs(d))} puntos ${d<0?"menos":"más"}</mark> que en sus gemelos (en % del stock inicial; intervalo del 95 %: ${ci?`${pts(ci[0])} a ${pts(ci[1])}`:"—"}). ${ci&&ci[1]<0?(ESv&&!ESv.postSig?`Pero el estudio de eventos, que alinea cada municipio con su año y mira la trayectoria completa, no lo confirma (${pts(ESv.post)} puntos${ciPts(ESv.postCI)}${plv?`; ${pl0(plv)} de los grupos al azar dan una diferencia igual o mayor`:""}). <b>Hay una pista de que las prohibiciones frenan los pisos turísticos, pero no es sólida.</b>`:"Las prohibiciones se notan en el número de pisos turísticos."):ci&&ci[0]>0?"Donde se prohibió, los pisos turísticos siguieron creciendo más que en los gemelos: las medidas llegan donde ya se disparaban, y por ahora no lo han frenado.":"Con tan pocos municipios y tan poco tiempo, los datos no distinguen un efecto de ninguno."}</p>
    <p>Una prohibición de licencias nuevas no hace desaparecer las que ya existen, y su efecto, si lo hay, se ve en que el número deja de crecer, no en que caiga de golpe. Además, buena parte de la oferta turística funcionaba sin licencia, y contra eso una moratoria sirve de poco si no va acompañada de inspección. Por eso no es raro que el efecto sea pequeño o tarde en verse.</p>
    <p>Para quien tiene que decidir, la lección es doble: estas medidas no son un botón que se pulsa y el problema desaparece, y su efecto hay que medirlo con datos de licencias y de alquiler, no solo con la sensación de que «algo se ha hecho». El registro único estatal, en vigor desde 2025, permitirá medirlo mucho mejor.</p>
    <ul class="defs"><li><b>El INE cuenta anuncios activos en plataformas,</b> no licencias. Una prohibición de licencias nuevas tarda en verse si los anuncios sin licencia siguen activos; y el registro único obligatorio desde julio de 2025 ha retirado anuncios en toda España, también en los gemelos.</li>
    <li><b>Las medidas no caen al azar:</b> se aprueban donde los pisos turísticos se disparan. El gemelo con la misma tendencia previa corrige parte de eso, no todo.</li>
    <li><b>Muchas medidas son parciales</b> (unos barrios, un tipo de edificio) y el dato es de todo el municipio.</li>
    <li>La lista de medidas y fechas, con su fuente y grado de confianza, está en el repositorio. Faltan las que no tienen fecha confirmada.</li></ul>`);
  AB.fill({ctx:"Los ayuntamientos limitan los pisos turísticos para devolver viviendas al alquiler; antes hay que ver si los frenan.",int:`Moratorias y prohibiciones municipales con fecha (${T.length} municipios de 5.000 habitantes o más).`,ana:"Diferencias en diferencias con un gemelo de la misma comunidad (misma tendencia previa) y estudio de eventos anual con placebos.",res:`Frente a sus gemelos, ${nf0.format(Math.abs(d))} puntos ${d<0?"menos":"más"} de crecimiento de los pisos turísticos${ci?` [${pts(ci[0])}; ${pts(ci[1])}]`:""}${ESv?`; estudio de eventos: ${pts(ESv.post)}${ciPts(ESv.postCI)}`:""}.`,con:ci&&ci[1]<0&&ESv&&ESv.postSig?"Las prohibiciones frenan el número de pisos turísticos; el efecto sobre el alquiler queda por medir.":ci&&ci[1]<0?"Pista de que frenan los pisos turísticos, no confirmada por el estudio de eventos; pocos municipios y poco tiempo.":"Con pocos municipios y poco tiempo, el efecto no se distingue con claridad; el INE cuenta anuncios, no licencias."});
  methods(B,[["Qué se hace","Cada municipio que prohibió nuevos pisos turísticos se compara con un gemelo de su comunidad que venía igual y no prohibió nada, y se mira si después el número de pisos turísticos creció menos."],["Estudio de eventos","Valor de agosto de cada año (2025: media de mayo y noviembre); gemelos de la misma comunidad sin medida, por vecino más cercano en log del padrón, cambio previo y nivel previo; año 0 = primer año con la medida (segundo semestre → año siguiente). Placebo: 30 grupos al azar del mismo tamaño."],["Unidad",`${nf0.format(T.length)} municipios con moratoria o prohibición de nuevas viviendas turísticas fechada entre junio de 2023 y junio de 2025 (confianza alta o media), ${nf0.format(pairs.length)} con gemelo`],["Gemelos","Municipio de 5.000 habitantes o más de la misma comunidad sin medida, más cercano en log del tamaño, log del % de pisos turísticos en el periodo anterior a la medida y cambio de ese % en el año previo; un mismo gemelo puede servir a varios municipios"],["Resultado","Cambio del % de viviendas turísticas (INE), en % del nivel del periodo anterior a la medida: «antes» = año previo a la medida; «después» = desde la medida hasta mayo de 2026"],["Modelo",FICHA_DID+" Intervalo por remuestreo de parejas (200 réplicas). En puntos de % de viviendas la diferencia es de "+pts(dp)+"."]]);
}

// =====================================================================
// QUIÉN SOY, SERVICIOS Y CONTACTO
// =====================================================================
// Rellena estos datos y se colocan solos en la página
// Quién hay detrás: se rellena desde src/content.mjs (SITE.author)
const ABOUT=Object.assign({nombre:"", name:"", frase:"", foto:"", linkedin:"", web:""},(window.__INDICIO&&window.__INDICIO.site&&window.__INDICIO.site.author)||{});
if(ABOUT.name&&!ABOUT.nombre) ABOUT.nombre=ABOUT.name; if(ABOUT.bio&&!ABOUT.frase) ABOUT.frase=ABOUT.bio;
function renderSobre(sec){
  document.title="Quién soy · Indicio";
  const A=ABOUT, nm=A.nombre?esc(A.nombre):"";
  const first=(A.nombre||"Borja").split(" ")[0];
  view.innerHTML=`<section class="ab-hero">
      <div><span class="kk">Quién soy</span><h1>${esc(A.name||"Borja Burriel")}</h1>
      <p class="ab-role">Data scientist · Experimentación e inferencia causal</p>
      <p class="ab-meta">Máster en Estadística</p>
      <div class="chipsq">${A.linkedin?`<a href="${esc(A.linkedin)}" target="_blank" rel="noopener">LinkedIn</a>`:""}${A.web?`<a href="${esc(A.web)}" target="_blank" rel="noopener">Web</a>`:""}<a href="/quien-soy/contacto/" id="abgo">✉ Escríbeme</a></div></div>
    </section>
    <p class="ab-lead">Me dedico a comprobar <mark>si un cambio ha producido de verdad el efecto que se le atribuye</mark>. En Indicio lo hago con los datos públicos.</p>
    <ol class="ab-path" aria-label="Recorrido profesional">
      <li><h3>Investigación y deporte</h3><p>FC Barcelona</p></li>
      <li><h3>Siete años de producto digital</h3><p>Equipos de datos en Domestika, Wallapop y Northius</p></li>
      <li><h3>Indicio</h3><p>Experimentación e inferencia causal aplicadas a los datos públicos</p></li>
    </ol>
    <section class="ab-row"><h2>Por qué Indicio</h2>
      <div class="ab-body">
        <p>España publica más datos de los que nadie puede leer, y casi siempre se discuten del mismo modo. Dos cosas aparecen juntas y se da por hecho que una causa la otra.</p>
        <figure class="ab-fig">
          <svg viewBox="0 0 480 214" role="img" aria-label="Cuatro posibles causas que coinciden con la subida del alquiler: pisos turísticos, más turistas, más trabajo y más demanda de vivienda">
            <line class="hot" x1="200" y1="28" x2="334" y2="107"/><line x1="200" y1="80" x2="334" y2="107"/><line x1="200" y1="132" x2="334" y2="107"/><line x1="200" y1="184" x2="334" y2="107"/>
            <text class="hot" x="188" y="33" text-anchor="end">Pisos turísticos</text><text x="188" y="85" text-anchor="end">Más turistas</text><text x="188" y="137" text-anchor="end">Más trabajo</text><text x="188" y="189" text-anchor="end">Más demanda de vivienda</text>
            <circle cx="338" cy="107" r="5"/><text class="node" x="352" y="112">El alquiler sube</text>
          </svg>
          <figcaption>¿Cuál de estas cosas mueve el precio?</figcaption>
        </figure>
        <p>Los alquileres suben donde hay pisos turísticos, sí, pero también donde hay más turistas, más trabajo y más gente buscando casa.</p>
        <p>Separar unas cosas de otras es lo que enseña la experimentación, y lo que suele faltar cuando se habla de políticas públicas. <b>Indicio nace para llevar ese método a los datos públicos.</b></p>
      </div>
    </section>
    <section class="ab-row"><h2>Qué busca</h2>
      <div class="ab-body">
        <p>Responder con datos públicos las preguntas que importan, y hacerlo a la vista de todos para que cualquiera pueda comprobar cómo se ha llegado a la respuesta.</p>
        <div class="ab-cols">
          <div><h3>Preguntas que importan</h3><p>Vivienda, empleo, población, voto y gasto público.</p></div>
          <div><h3>Fuentes y método a la vista</h3><p>Cada análisis dice qué muestran los datos y dónde dejan de servir.</p></div>
          <div><h3>Tus propias preguntas</h3><p>El <a href="/laboratorio/">laboratorio</a> permite repetir los cálculos sin saber estadística.</p></div>
        </div>
        <p class="ab-note">Indicio es un proyecto independiente, sin publicidad ni financiación de partidos.</p>
      </div>
    </section>

    <section class="ab-sec" id="contacto"><h2>Escríbeme</h2>
      <div class="ab-form"><form id="abform" name="contacto" method="POST" data-netlify="true" netlify-honeypot="bot-field">
        <input type="hidden" name="form-name" value="contacto"><p hidden><label>No rellenar <input name="bot-field"></label></p>
        <label class="fld">Nombre<input class="inp" name="nombre" required autocomplete="name"></label>
        <label class="fld">Correo electrónico<input class="inp" type="email" name="email" required autocomplete="email"></label>
        <label class="fld">Sobre qué<select class="sel" name="motivo" id="abmot"><option>Una pregunta sobre los datos</option><option>He visto un error</option><option>Una idea para la web</option><option>Otra cosa</option></select></label>
        <label class="fld">Mensaje<textarea class="inp" name="mensaje" rows="5" required></textarea></label>
        <button type="submit" class="sel ab-send">Enviar</button><p class="muted" id="abres" style="font-size:14px" role="status"></p>
      </form>
      <div class="ab-side"><h3>Antes de escribir</h3><ul class="defs"><li><b>¿Un error en los datos?</b> Dime en qué página y qué dato. Los arreglo y lo cuento en la web.</li><li><b>¿Falta tu pregunta?</b> Muchos análisis nacen de preguntas que me mandan los lectores.</li><li>Uso tu correo solo para responderte.</li></ul></div></div>
    </section>`;
  document.getElementById("abgo").addEventListener("click",e=>{ e.preventDefault(); scrollToId("contacto"); });
  const f=document.getElementById("abform"), res=document.getElementById("abres");
  f.addEventListener("submit",async e=>{ e.preventDefault(); res.textContent="Enviando…";
    // El mensaje va directo al correo a través de FormSubmit.
    const MAIL="bburriel@gmail.com", fd=new FormData(f);
    if(fd.get("bot-field")){ res.textContent=""; return; }
    try{ const r=await fetch("https://formsubmit.co/ajax/"+MAIL,{method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json"},
        body:JSON.stringify({nombre:fd.get("nombre"),email:fd.get("email"),motivo:fd.get("motivo"),mensaje:fd.get("mensaje"),_subject:"Indicio · "+(fd.get("motivo")||"Mensaje"),_replyto:fd.get("email"),_template:"table",_captcha:"false"})});
      if(!r.ok) throw 0;
      f.reset(); res.innerHTML="<b>¡Gracias!</b> Te contesto lo antes posible."; }
    catch(x){ res.textContent="No se ha podido enviar. Revisa tu conexión e inténtalo de nuevo en un momento."; } });
  if(sec==="contacto") setTimeout(()=>scrollToId("contacto"),50);
}
function scrollToId(id){ const s=document.getElementById(id); if(s) window.scrollTo({top:s.getBoundingClientRect().top+window.scrollY-(document.getElementById("top").offsetHeight+12),behavior:"smooth"}); }
// =====================================================================
// MI MUNICIPIO: uno elegido (y otro opcional para comparar), visible en la cabecera
// =====================================================================
let MUN2=null; try{ const m2=localStorage.getItem("cifrario.mun2"); if(m2&&/^\d{5}$/.test(m2)) MUN2=m2; }catch(e){}
const myOk=c=>c&&BYCODE.has(c);
const myName=c=>myOk(c)?dispName(BYCODE.get(c)[F.name]):"";
function setMyMun(code,{which=1,silent=false}={}){
  if(which===2){ MUN2=code||null; if(MUN2===lastMun) MUN2=null; try{ MUN2?localStorage.setItem("cifrario.mun2",MUN2):localStorage.removeItem("cifrario.mun2"); }catch(e){} }
  else { lastMun=code||null; if(lastMun&&lastMun===MUN2){ MUN2=null; try{ localStorage.removeItem("cifrario.mun2"); }catch(e){} } try{ lastMun?localStorage.setItem("cifrario.mun",lastMun):localStorage.removeItem("cifrario.mun"); }catch(e){} }
  myHeader(); if(!silent) rerender();
}
function rerender(){ const y=window.scrollY; const h=pathToKey(); if(/^explorar/.test(h)&&document.getElementById("exout")){ EX.m=myOk(lastMun)?lastMun:null; exSync(); exSetHash(); exBar(); exDraw(); } else { curMun=null; route(); window.scrollTo(0,y); } }
// botón de la cabecera
function myHeader(){
  let b=document.getElementById("mymun");
  // la cabecera solo tiene este botón: fija tu municipio (y desde su ventana se abre su ficha)
  if(!b){ const s=document.querySelector(".top-in"); if(!s) return; b=el("button","mymun"); b.id="mymun"; b.type="button"; b.setAttribute("aria-haspopup","dialog"); s.appendChild(b); b.addEventListener("click",e=>{ e.stopPropagation(); myPop(); }); }
  b.innerHTML=myOk(lastMun)?`<span aria-hidden="true">📍</span><span class="t">${esc(myName(lastMun))}${myOk(MUN2)?` <small>y ${esc(myName(MUN2))}</small>`:""}</span><span class="c" aria-hidden="true">▾</span>`:`<span aria-hidden="true">📍</span><span class="t t-long">Elige tu municipio</span><span class="t t-short" aria-hidden="true">Tu municipio</span>`;
  b.title=myOk(lastMun)?"Tu municipio: se destaca en temas, mapas y gráficos. Pulsa para cambiarlo.":"Elige tu municipio y lo verás destacado en toda la web";
}
function myPop(){
  let p=document.getElementById("mypop"); if(p){ p.remove(); return; }
  p=el("div","mypop"); p.id="mypop"; p.setAttribute("role","dialog"); p.setAttribute("aria-label","Tu municipio"); document.body.appendChild(p);
  const sbox=(id,ph)=>`<div class="search" id="${id}-s" role="combobox" aria-expanded="false" aria-haspopup="listbox"><svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.6"/><path d="M11 11l3.5 3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg><input id="${id}" type="search" placeholder="${ph}" autocomplete="off" aria-label="${ph}"><ul id="${id}-r" class="results" role="listbox" hidden></ul></div>`;
  const draw=()=>{ p.innerHTML=`<div class="mp-h"><b>Tu municipio</b><button type="button" class="mp-x" aria-label="Cerrar">×</button></div>
    <p class="mp-d">Se destaca en los temas, los mapas y los gráficos del laboratorio. Se guarda en este navegador.</p>
    ${myOk(lastMun)?`<div class="mp-cur"><span class="dot1"></span><b>${esc(myName(lastMun))}</b><small>${esc(provShort(PROVS[BYCODE.get(lastMun)[F.prov]]))}</small><a class="gol" href="#m${lastMun}">Ficha</a><button type="button" data-rm="1">Quitar</button></div>`:""}
    ${sbox("mpq1",myOk(lastMun)?"Cambiar por otro…":"Escribe tu municipio…")}
    <div class="mp-sep"><b>Compararlo con</b> <span class="muted">(opcional)</span></div>
    ${myOk(MUN2)?`<div class="mp-cur"><span class="dot2"></span><b>${esc(myName(MUN2))}</b><small>${esc(provShort(PROVS[BYCODE.get(MUN2)[F.prov]]))}</small><a class="gol" href="#m${MUN2}">Ficha</a><button type="button" data-rm="2">Quitar</button></div>`:""}
    ${myOk(lastMun)?sbox("mpq2",myOk(MUN2)?"Cambiar por otro…":"Otro municipio para comparar…"):`<p class="muted" style="font-size:13px;margin:4px 0 0">Elige primero el tuyo.</p>`}
    ${myOk(lastMun)&&myOk(MUN2)?`<a class="mp-cmp" href="#comparar-${lastMun}-${MUN2}">Comparar ${esc(myName(lastMun))} y ${esc(myName(MUN2))} →</a>`:""}`;
    p.querySelector(".mp-x").addEventListener("click",()=>p.remove());
    p.querySelectorAll("[data-rm]").forEach(b=>b.addEventListener("click",()=>{ setMyMun(null,{which:+b.dataset.rm}); draw(); }));
    p.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>p.remove()));
    attachSearch(document.getElementById("mpq1"),document.getElementById("mpq1-r"),document.getElementById("mpq1-s"),r=>{ setMyMun(r[F.code]); draw(); });
    if(document.getElementById("mpq2")) attachSearch(document.getElementById("mpq2"),document.getElementById("mpq2-r"),document.getElementById("mpq2-s"),r=>{ setMyMun(r[F.code],{which:2}); draw(); });
    const b=document.getElementById("mymun").getBoundingClientRect(); p.style.top=(b.bottom+8)+"px"; p.style.left=Math.max(10,Math.min(window.innerWidth-p.offsetWidth-10,b.right-p.offsetWidth))+"px"; };
  draw(); setTimeout(()=>{ const i=document.getElementById("mpq1"); if(i&&!myOk(lastMun)) i.focus(); },30);
}
document.addEventListener("click",e=>{ const p=document.getElementById("mypop"); if(p&&!p.contains(e.target)&&!e.target.closest("#mymun")&&!e.target.closest(".results")) p.remove(); });
document.addEventListener("keydown",e=>{ if(e.key==="Escape"){ const p=document.getElementById("mypop"); if(p) p.remove(); } });
// aviso pequeño abajo
function toast(html,ms){ let t=document.getElementById("toast"); if(t) t.remove(); t=el("div","toast",html); t.id="toast"; t.setAttribute("role","status"); document.body.appendChild(t); setTimeout(()=>{ if(t.isConnected) t.remove(); },ms||6000); return t; }
// botón «elige / es mi municipio» para una ficha
function myChip(code){
  if(code===lastMun) return `<button type="button" class="ismine" id="mychip" aria-pressed="true">📍 Es tu municipio</button>`;
  return `<button type="button" id="mychip" aria-pressed="false">📍 Hacerlo mi municipio</button>${myOk(lastMun)&&code!==MUN2?`<button type="button" id="mychip2">⇄ Compararlo con ${esc(myName(lastMun))}</button>`:""}`;
}
function myChipBind(code){
  const a=document.getElementById("mychip"); if(a) a.addEventListener("click",()=>{ if(code===lastMun){ myPop(); return; } const prev=lastMun; setMyMun(code,{silent:true}); refreshChips(code); toast(`📍 <b>${esc(myName(code))}</b> es ahora tu municipio.${prev&&BYCODE.has(prev)?` <button type="button" id="tundo">Deshacer</button>`:""}`); const u=document.getElementById("tundo"); if(u) u.addEventListener("click",()=>{ setMyMun(prev,{silent:true}); refreshChips(code); document.getElementById("toast").remove(); }); });
  const b=document.getElementById("mychip2"); if(b) b.addEventListener("click",()=>{ navTo("comparar-"+lastMun+"-"+code); });
}
function refreshChips(code){ const box=document.getElementById("mychips"); if(box){ box.innerHTML=myChip(code); myChipBind(code); } }
// =====================================================================
// PREGUNTAS: la portada y el índice giran alrededor de preguntas reales.
// Cada pregunta trae su respuesta corta, calculada con los datos, y un dibujo hecho de datos.
// =====================================================================
const QC=()=>({ink:css("--ink"),br:css("--brand"),bg:css("--bg"),rule:css("--rule"),rule2:css("--rule-2"),mute:css("--muted")});
const QRAMP=["#f0e3e3","#e3c3c1","#d3a19e","#bd7a77","#a2525b","#7e2f40","#561c28"];
const qRows=(f)=>rowsAll().filter(f);
const qMed=(rs,k)=>d3.median(rs,r=>r[F[k]]);
const qQuint=(k,y)=>{ const rs=qRows(r=>r[F[k]]!=null&&r[F[y]]!=null); const xs=rs.map(r=>r[F[k]]).sort(d3.ascending), lo=d3.quantile(xs,.2), hi=d3.quantile(xs,.8);
  return {lo:qMed(rs.filter(r=>r[F[k]]<=lo),y), hi:qMed(rs.filter(r=>r[F[k]]>=hi),y)}; };
const qSigned=v=>(v>=0?"ganado":"perdido")+" un "+nf0.format(Math.abs(v))+NB+"%";
const qSvg=(W,H,label)=>d3.create("svg").attr("viewBox",`0 0 ${W} ${H}`).attr("role","img").attr("aria-label",label||"");
const qTxt=(g,x,y,t,o={})=>g.append("text").attr("x",x).attr("y",y).attr("font-family",o.sans?"var(--font)":"var(--serif)").attr("font-style",o.sans?"normal":"italic").attr("font-size",o.s||14).attr("fill",o.c||css("--ink")).attr("text-anchor",o.a||"start").text(t);
let QREG=null; const qRegions=()=>{ if(!QREG){ QREG=topojson.feature(TOPO,TOPO.objects.autonomous_regions); QREG.features.forEach(rewind); } return QREG; };
let QCEN=null; const qCen=()=>{ if(!QCEN) QCEN=new Map(FEATS.map(f=>[f.id,d3.geoCentroid(f)])); return QCEN; };
const qProj=(W,H,pad=4)=>d3.geoConicConformalSpain().fitExtent([[pad,pad],[W-pad,H-pad]],qRegions());

// ---------- dibujos ----------
const SWARM_CACHE=new Map(), SWARM_FIT=new Map();
const QART={
  // pandemia: cuánto subió el paro de 2019 a 2020 en cada provincia; en granate, las diez más turísticas
  covid(W,H){ const C=QC(), sv=qSvg(W,H,"Subida del paro de 2019 a 2020 en cada provincia; en granate, las más turísticas"), PY=REFS.paroYears, i19=PY.indexOf(2019), i20=PY.indexOf(2020);
    const P=Object.keys(REFS.paro.prov).filter(p=>REFS.prov[p]&&REFS.prov[p].vtp&&REFS.paro.prov[p].paro&&!["51","52"].includes(p)), vt=p=>REFS.prov[p].vtp[REFS.prov[p].vtp.length-1];
    const TUR=new Set(P.slice().sort((a,b)=>vt(b)-vt(a)).slice(0,10));
    const g=P.map(p=>({p,v:(REFS.paro.prov[p].paro[i20]/REFS.paro.prov[p].paro[i19]-1)*100,t:TUR.has(p)})).sort((a,b)=>b.v-a.v);
    const w=W/g.length, hb=d3.scaleLinear().domain([0,d3.max(g,d=>d.v)]).range([0,H-34]);
    sv.append("g").selectAll("rect").data(g).join("rect").attr("x",(d,i)=>i*w+w*.14).attr("y",d=>H-20-hb(Math.max(0,d.v))).attr("width",w*.72).attr("height",d=>hb(Math.max(0,d.v))).attr("rx",Math.min(2,w*.3)).attr("fill",d=>d.t?C.br:C.rule2);
    sv.append("line").attr("x1",0).attr("x2",W).attr("y1",H-20).attr("y2",H-20).attr("stroke",C.ink).attr("stroke-width",.8);
    qTxt(sv,0,H-4,"Más subida del paro en 2020",{sans:true,s:11,c:C.mute}); qTxt(sv,W,H-4,"menos",{sans:true,s:11,c:C.mute,a:"end"});
    return sv.node(); },
  // tope del alquiler: Cataluña frente a España desde 2015, con la marca del tope
  tope(W,H){ const C=QC(), sv=qSvg(W,H,"Precio del alquiler declarado en Cataluña y en España desde 2015, con la marca de 2024"), Y=REFS.ipvaYears, i0=Y.indexOf(2015);
    const cat=Y.map((y,i)=>d3.mean(CATP,p=>REFS.prov[p]&&REFS.prov[p].ipva?REFS.prov[p].ipva[i]:null)), es=REFS.es.ipva;
    const s1=Y.slice(i0).map((y,j)=>({y,c:cat[i0+j]/cat[i0]*100,e:es[i0+j]/es[i0]*100}));
    const X=d3.scaleLinear().domain([2015,Y[Y.length-1]]).range([10,W-70]), V=d3.scaleLinear().domain([97,d3.max(s1,d=>Math.max(d.c,d.e))+2]).range([H-22,10]);
    [104,112,120].forEach(v=>{ if(v<V.domain()[1]) sv.append("line").attr("x1",10).attr("x2",W-70).attr("y1",V(v)).attr("y2",V(v)).attr("stroke",C.rule).attr("stroke-width",1); });
    const xt=X(2024); sv.append("rect").attr("x",xt).attr("y",6).attr("width",W-70-xt).attr("height",H-28).attr("fill",C.br).attr("fill-opacity",.07);
    sv.append("line").attr("x1",xt).attr("x2",xt).attr("y1",6).attr("y2",H-22).attr("stroke",C.br).attr("stroke-dasharray","3 3");
    qTxt(sv,xt-4,18,"tope",{s:12,c:C.br,a:"end"});
    const ln=k=>d3.line().x(d=>X(d.y)).y(d=>V(d[k])).curve(d3.curveMonotoneX)(s1);
    sv.append("path").attr("d",ln("e")).attr("fill","none").attr("stroke",C.mute).attr("stroke-width",2);
    sv.append("path").attr("d",ln("c")).attr("fill","none").attr("stroke",C.br).attr("stroke-width",3);
    const L=s1[s1.length-1]; qTxt(sv,X(L.y)+6,V(L.c)+(L.c>=L.e?-2:10),"Cataluña",{sans:true,s:11.5,c:C.br}); qTxt(sv,X(L.y)+6,V(L.e)+(L.c>=L.e?10:-2),"España",{sans:true,s:11.5,c:C.mute});
    sv.append("line").attr("x1",10).attr("x2",W-70).attr("y1",H-22).attr("y2",H-22).attr("stroke",C.ink).attr("stroke-width",.8);
    qTxt(sv,10,H-6,"2015",{sans:true,s:11,c:C.mute}); qTxt(sv,W-70,H-6,String(L.y),{sans:true,s:11,c:C.mute,a:"end"});
    return sv.node(); },
  // pensiones: cómo se reparte el peso de los mayores de 65 entre los municipios
  pens(W,H){ const C=QC(), sv=qSvg(W,H,"Cuántos municipios hay según el porcentaje de mayores de 65 años"), vals=qRows(r=>r[F.mayores65]!=null).map(r=>r[F.mayores65]);
    const X=d3.scaleLinear().domain([5,55]).range([4,W-4]).clamp(true), bins=d3.bin().domain(X.domain()).thresholds(40)(vals.filter(v=>v>=5&&v<=55));
    const Yc=d3.scaleLinear().domain([0,d3.max(bins,b=>b.length)]).range([H-22,10]);
    const id="pg"+Math.round(Math.random()*1e6), df=sv.append("defs").append("linearGradient").attr("id",id).attr("x1",0).attr("x2",1);
    [[0,"#e8cfd1"],[.5,"#b45e6c"],[1,"#5a1a26"]].forEach(([o,c])=>df.append("stop").attr("offset",o).attr("stop-color",c));
    const ar=d3.area().x(b=>X((b.x0+b.x1)/2)).y0(H-22).y1(b=>Yc(b.length)).curve(d3.curveBasis);
    sv.append("path").attr("d",ar(bins)).attr("fill",`url(#${id})`);
    const m=esMean("mayores65"); if(m!=null){ sv.append("line").attr("x1",X(m)).attr("x2",X(m)).attr("y1",8).attr("y2",H-22).attr("stroke",C.ink).attr("stroke-dasharray","3 3"); qTxt(sv,X(m)+5,18,"España",{sans:true,s:11,c:C.ink}); }
    sv.append("line").attr("x1",0).attr("x2",W).attr("y1",H-22).attr("y2",H-22).attr("stroke",C.ink).attr("stroke-width",.8);
    qTxt(sv,0,H-6,"menos mayores de 65",{sans:true,s:11,c:C.mute}); qTxt(sv,W,H-6,"más",{sans:true,s:11,c:C.mute,a:"end"});
    return sv.node(); },
  // horizonte de pueblos: cuánto han ganado o perdido desde 2005, coloreado por edad
  swarm(W,H){ const C=QC(), sv=qSvg(W,H,"Cada municipio como un punto según cuánta población ha ganado o perdido desde 2005, coloreado por su edad media"), mid=H/2+6, mob=W<800;
    const X0=d3.scaleLinear().domain([-70,100]).range([16,W-(mob?60:110)]), Xr=v=>v<=100?X0(Math.max(-70,v)):X0(100)+Math.log(v/100)*(mob?20:38);
    const R=d3.scaleSqrt().domain([0,3.4e6]).range([mob?1.3:1.1,mob?16:20]);
    // la simulación de fuerzas es lo más caro de toda la web: se calcula una vez por tamaño y se guarda
    const ck=W+"x"+H; let nodes=SWARM_CACHE.get(ck), fit=SWARM_FIT.get(ck);
    if(!nodes){ nodes=qRows(r=>r[F.var0525]!=null&&r[F.edad]!=null).map(r=>({c:r[F.code],v:r[F.var0525],e:r[F.edad],r:Math.max(mob?1.3:1.15,R(r[F.pop]||0))}));
      nodes.forEach((d,i)=>{ d.x=Xr(d.v)+((i*7919)%10)/10-.5; d.y=mid+(((i*104729)%100)/100-.5)*40; });
      const sim=d3.forceSimulation(nodes).force("x",d3.forceX(d=>Xr(d.v)).strength(.9)).force("y",d3.forceY(mid).strength(mob?.03:.05)).force("c",d3.forceCollide(d=>d.r+.35).iterations(1)).stop();
      for(let i=0;i<90;i++) sim.tick();
      // cuadrar la tinta: el primer y el último punto tocan exactamente los márgenes del texto
      const x0=d3.min(nodes,d=>d.x-d.r), x1=d3.max(nodes,d=>d.x+d.r), k=W/(x1-x0);
      fit={x0,k}; nodes.forEach(d=>{ d.x=(d.x-x0)*k; });
      SWARM_CACHE.set(ck,nodes); SWARM_FIT.set(ck,fit); }
    const X=v=>(Xr(v)-fit.x0)*fit.k;
    const cols=["#7e2f40","#a2525b","#c98c8a","#d2d2cf","#9d9d99","#666662"], ag=d3.scaleQuantile().domain(nodes.map(d=>d.e)).range(cols);
    sv.append("line").attr("x1",X(0)).attr("x2",X(0)).attr("y1",24).attr("y2",H-18).attr("stroke",C.ink).attr("stroke-width",.8).attr("stroke-dasharray","2 3");
    const cs=sv.append("g").attr("class","sw-dots").selectAll("circle").data(nodes.sort((a,b)=>b.r-a.r)).join("circle").attr("cx",d=>d.x.toFixed(1)).attr("cy",d=>d.y.toFixed(1)).attr("r",d=>d.r.toFixed(2)).attr("fill",d=>ag(d.e)).attr("stroke",d=>d.r>6?C.bg:"none").attr("stroke-width",.8);
    const node=sv.node(); node.__pts=nodes.filter(d=>d.r<5).map(d=>({c:d.c,x:d.x,y:d.y,r:d.r})); node.__W=W;
    node.__intro=()=>{ cs.attr("cx",X(0)).attr("cy",mid).attr("opacity",0).transition().duration(1400).delay(d=>Math.min(900,Math.abs(d.v)*9)+Math.random()*200).ease(d3.easeCubicOut).attr("cx",d=>d.x.toFixed(1)).attr("cy",d=>d.y.toFixed(1)).attr("opacity",1); };
    qTxt(sv,X(0)-10,mob?22:16,"← pierden vecinos",{a:"end",s:mob?22:16,c:C.ink}); qTxt(sv,X(0)+10,mob?22:16,"ganan vecinos →",{s:mob?22:16,c:C.ink});
    const lab=(code,t,lx,ly)=>{ const n=nodes.find(d=>d.c===code); if(!n) return; sv.append("line").attr("x1",n.x).attr("y1",n.y).attr("x2",lx).attr("y2",ly+(ly<n.y?4:-12)).attr("stroke",C.ink).attr("stroke-width",.7); qTxt(sv,lx,ly,t,{a:"middle",s:mob?22:14}).attr("paint-order","stroke").attr("stroke",C.bg).attr("stroke-width",4); };
    const md=nodes.find(d=>d.c==="28079"), bc=nodes.find(d=>d.c==="08019");
    if(md) lab("28079","Madrid",md.x+(mob?90:150),40); if(bc) lab("08019","Barcelona",bc.x-(mob?90:150),H-40);
    const lg=sv.append("g").attr("transform",`translate(${W-(mob?215:250)},${H-(mob?60:70)})`); cols.forEach((c,i)=>lg.append("circle").attr("cx",i*16).attr("cy",0).attr("r",6).attr("fill",c));
    qTxt(lg,-12,5,"más jóvenes",{a:"end",s:mob?19:12.5,sans:true,c:C.mute}); qTxt(lg,92,5,"más mayores",{s:mob?19:12.5,sans:true,c:C.mute});
    [-60,-40,-20,0,20,40,60,80,100].filter(v=>!mob||v%40===0).forEach(v=>qTxt(sv,X(v),H-2,(v>0?"+":"")+v+NB+"%",{sans:true,s:mob?18:11,c:C.mute,a:"middle"}));
    return node; },
  // mapa de agujas
  spikes(W,H,k="vt",thr){ const C=QC(), sv=qSvg(W,H,"Mapa de agujas por municipio"), P=qProj(W,H+10,6), path=d3.geoPath(P), cen=qCen();
    sv.append("path").attr("d",path(qRegions())).attr("fill",C.rule).attr("fill-opacity",.45);
    const pts=FEATS.map(f=>({p:P(cen.get(f.id)),v:BYCODE.has(f.id)?BYCODE.get(f.id)[F[k]]:null,pop:BYCODE.has(f.id)?BYCODE.get(f.id)[F.pop]||0:0})).filter(d=>d.p&&d.v!=null&&d.pop>20000).sort((a,b)=>a.p[1]-b.p[1]);
    const vs=pts.map(d=>d.v).sort(d3.ascending), top=thr!=null?thr:d3.quantile(vs,.85), hs=d3.scaleLinear().domain([0,d3.quantile(vs,.98)]).range([0,H*.24]).clamp(true);
    sv.append("g").selectAll("path").data(pts).join("path").attr("d",d=>{ const h=hs(d.v),x=d.p[0],y=d.p[1],w=2.4; return `M${x-w},${y}L${x},${y-h}L${x+w},${y}`; })
      .attr("fill",d=>d.v>=top?C.br:C.bg).attr("fill-opacity",d=>d.v>=top?.4:.9).attr("stroke",d=>d.v>=top?C.br:C.ink).attr("stroke-width",.6).attr("stroke-opacity",d=>d.v>=top?1:.7);
    return sv.node(); },
  // nube de puntos con su recta
  scatter(W,H,kx="superiores",ky="renta",lab){ const C=QC(), sv=qSvg(W,H,"Nube de puntos"), m={l:6,r:6,t:14,b:22};
    const d=qRows(r=>r[F[kx]]!=null&&r[F[ky]]!=null&&(r[F.pop]||0)>500).map(r=>({c:r[F.code],x:r[F[kx]],y:/^renta/.test(ky)?Math.log(r[F[ky]]):r[F[ky]]}));
    const qx=v=>d3.quantile(d.map(e=>e.x).sort(d3.ascending),v), qy=v=>d3.quantile(d.map(e=>e.y).sort(d3.ascending),v);
    const X=d3.scaleLinear().domain([qx(.01),qx(.99)]).range([m.l,W-m.r]).clamp(true), Y=d3.scaleLinear().domain([qy(.01),qy(.99)]).range([H-m.b,m.t]).clamp(true);
    sv.append("g").selectAll("circle").data(d).join("circle").attr("cx",e=>X(e.x).toFixed(1)).attr("cy",e=>Y(e.y).toFixed(1)).attr("r",W>500?1.6:1.2).attr("fill",C.ink).attr("fill-opacity",.2);
    const mx=d3.mean(d,e=>e.x), my=d3.mean(d,e=>e.y), b=d3.sum(d,e=>(e.x-mx)*(e.y-my))/d3.sum(d,e=>(e.x-mx)**2), x0=qx(.03), x1=qx(.97);
    sv.append("line").attr("x1",X(x0)).attr("x2",X(x1)).attr("y1",Y(my+b*(x0-mx))).attr("y2",Y(my+b*(x1-mx))).attr("stroke",C.br).attr("stroke-width",2);
    sv.append("line").attr("x1",0).attr("x2",W).attr("y1",H-m.b+6).attr("y2",H-m.b+6).attr("stroke",C.ink).attr("stroke-width",.7);
    if(lab){ qTxt(sv,W,H-4,lab[0]+" →",{sans:true,s:11,c:C.mute,a:"end"}); qTxt(sv,0,10,lab[1]+" ↑",{sans:true,s:11,c:C.mute}); }
    const node=sv.node(); node.__pts=d.map(e=>({c:e.c,x:X(e.x),y:Y(e.y),r:1.6})); node.__W=W; return node; },
  // teselas de renta
  tiles(W,H){ const sv=qSvg(W,H,"Mapa de España en teselas según la renta por persona"), P=qProj(W,H,4), cell=Math.max(5,Math.round(W/53)), cen=qCen(), acc=new Map();
    FEATS.forEach(f=>{ const r=BYCODE.get(f.id); if(!r||r[F.renta]==null) return; const p=P(cen.get(f.id)); if(!p) return; const k=Math.floor(p[0]/cell)+","+Math.floor(p[1]/cell); const a=acc.get(k)||{s:0,n:0}; const w=Math.sqrt(r[F.pop]||1); a.s+=r[F.renta]*w; a.n+=w; acc.set(k,a); });
    const q=d3.scaleQuantile().domain([...acc.values()].map(a=>a.s/a.n)).range(QRAMP);
    sv.append("g").selectAll("rect").data([...acc]).join("rect").attr("x",([k])=>k.split(",")[0]*cell+.6).attr("y",([k])=>k.split(",")[1]*cell+.6).attr("width",cell-1.2).attr("height",cell-1.2).attr("fill",([,a])=>q(a.s/a.n));
    return sv.node(); },
  // barras de paro por provincia, de norte a sur
  bars(W,H){ const C=QC(), sv=qSvg(W,H,"Paro registrado por provincia, ordenadas de norte a sur"), cen=qCen();
    const g=d3.rollups(qRows(r=>r[F.paroReg]!=null&&r[F.pop]),v=>({p:d3.sum(v,r=>r[F.paroReg]*r[F.pop])/d3.sum(v,r=>r[F.pop]),lat:d3.mean(v,r=>{ const c=cen.get(r[F.code]); return c?c[1]:null; })}),r=>r[F.prov]).map(([k,v])=>({k,...v})).filter(d=>d.lat&&d.lat>35.5).sort((a,b)=>b.lat-a.lat);
    const col=d3.scaleSequential(d3.interpolateRgb("#ece3e3","#4a1520")).domain(d3.extent(g,d=>d.p)), w=W/g.length, hb=d3.scaleLinear().domain([0,d3.max(g,d=>d.p)]).range([0,H-30]);
    sv.append("g").selectAll("rect").data(g).join("rect").attr("x",(d,i)=>i*w+w*.12).attr("y",d=>H-20-hb(d.p)).attr("width",w*.76).attr("height",d=>hb(d.p)).attr("fill",d=>col(d.p));
    sv.append("line").attr("x1",0).attr("x2",W).attr("y1",H-20).attr("y2",H-20).attr("stroke",C.ink).attr("stroke-width",.8);
    qTxt(sv,0,H-4,"Norte",{sans:true,s:11,c:C.mute}); qTxt(sv,W,H-4,"Sur",{sans:true,s:11,c:C.mute,a:"end"});
    return sv.node(); },
  // participación: un punto por municipio, más oscuro donde más se vota
  turnout(W,H){ const sv=qSvg(W,H,"Participación electoral por municipio"), P=qProj(W,H,4), cen=qCen();
    const pts=FEATS.map(f=>{ const r=BYCODE.get(f.id); return r&&r[F.part]!=null?{p:P(cen.get(f.id)),v:r[F.part]}:null; }).filter(d=>d&&d.p);
    const q=d3.scaleQuantile().domain(pts.map(d=>d.v)).range(QRAMP);
    sv.append("g").selectAll("circle").data(pts).join("circle").attr("cx",d=>d.p[0].toFixed(1)).attr("cy",d=>d.p[1].toFixed(1)).attr("r",W>500?1.6:1.15).attr("fill",d=>q(d.v));
    return sv.node(); },
  // perfil de España en franjas de latitud
  ridge(W,H){ const C=QC(), sv=qSvg(W,H,"España en franjas de norte a sur; la altura es la gente que vive en cada punto"), rows=W>500?34:24, cen=qCen();
    const pts=[...cen].map(([c,ll])=>({lon:ll[0],lat:ll[1],w:BYCODE.has(c)?BYCODE.get(c)[F.pop]||0:0})).filter(d=>d.lat>35.9&&d.lon>-9.6&&d.lon<3.4);
    const latS=d3.scaleLinear().domain([43.9,36.0]).range([0,rows-1]), nb=W>500?130:90, lonS=d3.scaleLinear().domain([-9.4,3.4]).range([0,nb-1]);
    const grid=d3.range(rows).map(()=>new Array(nb).fill(0)); pts.forEach(d=>{ const r=Math.round(latS(d.lat)), c=Math.round(lonS(d.lon)); if(r>=0&&r<rows&&c>=0&&c<nb) grid[r][c]+=d.w; });
    const sm=grid.map(row=>row.map((v,i)=>{ let s=0,w=0; for(let k=-3;k<=3;k++){ const j=i+k; if(j<0||j>=nb) continue; const wt=Math.exp(-k*k/4); s+=row[j]*wt; w+=wt; } return s/w; }));
    const mx=d3.max(sm.flat()), step=(H-24)/rows, X=d3.scaleLinear().domain([0,nb-1]).range([4,W-4]), hY=v=>Math.pow(v/mx,.55)*step*5.5;
    sm.forEach((row,r)=>{ const y0=22+r*step; const d="M"+row.map((v,i)=>X(i).toFixed(1)+","+(y0-hY(v)).toFixed(1)).join("L");
      sv.append("path").attr("d",d+`L${X(nb-1)},${y0+2}L${X(0)},${y0+2}Z`).attr("fill",C.bg);
      sv.append("path").attr("d",d).attr("fill","none").attr("stroke",C.ink).attr("stroke-width",.8); });
    return sv.node(); }
};

// ---------- las preguntas ----------
function qList(){
  const wmean=(rs,k)=>{ const s=rs.filter(r=>r[F[k]]!=null&&r[F.pop]); return d3.sum(s,r=>r[F[k]]*r[F.pop])/d3.sum(s,r=>r[F.pop]); };
  const S=["04","11","14","18","21","23","29","41","06","10"], N=["39","01","20","48","31","26","22","44","50","33","15","27","32","36","24","34","09","42","47"];
  const L=[];
  const ed=qQuint("edad","var0525");
  L.push({id:"campo",k:"Población",q:"¿Se vacía el campo por la distancia <em>o por la edad?</em>",
    a:`<b>Más por la edad.</b> Los pueblos más jóvenes han ${qSigned(ed.lo)} de vecinos desde 2005; los más envejecidos, ${qSigned(ed.hi)}. Entre pueblos de la misma provincia, tamaño, edad y renta, estar lejos de una ciudad cuenta poco.`,
    href:"/preguntas/crecer/", art:"swarm", hero:true, spot:r=>`${r[F.var0525]>=0?"ha ganado":"ha perdido"} un ${nf0.format(Math.abs(r[F.var0525]))}${NB}% de vecinos desde 2005 · edad media ${nf1.format(r[F.edad])} años`,
    cap:"Cada punto es un municipio, colocado según cuánta gente ha ganado o perdido desde 2005; su tamaño es la población. En granate, los más jóvenes; en gris, los más envejecidos. Casi todos los grises están a la izquierda."});
  const vt=partialR("vtCambio","alqVar20",[],true);
  L.push({id:"turismo",k:"Vivienda",q:"¿Los pisos turísticos encarecen el alquiler?",
    a:`<b>Menos de lo que se dice.</b> Donde más han crecido los pisos turísticos no es, en general, donde más ha subido el alquiler${vt?` (la relación es ${Math.abs(vt.r)<.2?"muy débil":Math.abs(vt.r)<.4?"débil":"moderada"})`:""}. Si hay efecto, está en barrios concretos.`,
    href:"/preguntas/pisos-turisticos/", art:"spikes", cap:"Cada aguja, un municipio de más de 20.000 habitantes; su altura, el peso de los pisos turísticos. En granate, donde más hay."});
  const su=qQuint("superiores","renta");
  L.push({id:"estudiar",k:"Educación y renta",q:"¿Estudiar hace más rico a un lugar?",
    a:`<b>Van muy juntos:</b> donde más gente tiene estudios superiores, la renta es un ${nf0.format((su.hi/su.lo-1)*100)}${NB}% mayor. Si una cosa causa la otra, es otra historia.`,
    href:exHash({v:"cruce",d:["superiores","renta"],t:"g1",p:"",c:[]}), art:"scatter", hero:true, spot:r=>`${r[F.superiores]!=null?nf0.format(r[F.superiores])+NB+"% con estudios superiores":""} · ${eur(r[F.renta])} por persona`, cap:"Cada punto es un municipio: a la derecha, más gente con estudios superiores; arriba, más renta por persona. La línea granate es la tendencia."});
  const cr=qRows(r=>r[F.renta15]!=null&&r[F.renta]!=null&&(r[F.pop]||0)>=1000), r90a=wq(cr,r=>r[F.renta15],.9)/wq(cr,r=>r[F.renta15],.1), r90b=wq(cr,r=>r[F.renta],.9)/wq(cr,r=>r[F.renta],.1);
  L.push({id:"convergencia",k:"Riqueza",q:"¿Los lugares pobres alcanzan a los ricos?",
    a:r90b<r90a-.03?`<b>Sí, poco a poco.</b> La distancia entre los municipios más ricos y los más pobres ha bajado de ${nf1.format(r90a)} a ${nf1.format(r90b)} veces desde 2015.`:`<b>No mucho.</b> La distancia entre los municipios más ricos y los más pobres apenas ha cambiado desde 2015: ${nf1.format(r90a)} y ${nf1.format(r90b)} veces.`,
    href:"/preguntas/convergencia/", art:"tiles", cap:"España en teselas: más oscura, más renta por persona."});
  const ps=wmean(qRows(r=>S.includes(r[F.prov])),"paroReg"), pn=wmean(qRows(r=>N.includes(r[F.prov])),"paroReg");
  L.push({id:"paro-sur",k:"Trabajo",q:"¿De verdad hay más paro en el sur?",
    a:`<b>Sí.</b> En Andalucía y Extremadura el paro registrado es ${ps/pn>1.4&&ps/pn<1.6?"la mitad más alto":`un ${nf0.format((ps/pn-1)*100)}${NB}% más alto`} que en el norte peninsular.`,
    href:"/temas/trabajo/", art:"bars", hero:true, cap:"Una barra por provincia, ordenadas de norte a sur; más alta y oscura, más paro registrado."});
  const pa=qMed(qRows(r=>r[F.part]!=null&&(r[F.pop]||0)<500),"part"), pb=qMed(qRows(r=>r[F.part]!=null&&(r[F.pop]||0)>50000),"part");
  L.push({id:"votar",k:"Voto",q:"¿Se vota más en los pueblos?",
    a:`<b>Sí.</b> En los de menos de 500 habitantes votó el ${nf0.format(pa)}${NB}%; en las ciudades de más de 50.000, el ${nf0.format(pb)}${NB}%. Parte se explica porque allí la población es mayor; el resto, por el tamaño en sí.`,
    href:"/preguntas/votar-pueblos/", art:"turnout", cap:"Un punto por municipio: más oscuro, más participación en las últimas generales."});
  const mc=qMed(qRows(r=>r[F.var0525]!=null&&r[F.distCosta]!=null&&r[F.distCosta]<5),"var0525"), mi=qMed(qRows(r=>r[F.var0525]!=null&&r[F.distCosta]!=null&&r[F.distCosta]>100),"var0525");
  L.push({id:"mar",k:"Población",q:"¿Qué hace que un pueblo gane vecinos?",
    a:`<b>La juventud, sobre todo, y los estudios.</b> Los municipios de costa han ${qSigned(mc)} de vecinos desde 2005 y los que están a más de 100 km del mar, ${qSigned(mi)}; pero entre pueblos iguales en edad y renta, la costa no añade nada.`,
    href:"/preguntas/crecer/", art:"ridge", hero:true, cap:"España en franjas de norte a sur: cada pico es gente. Las grandes ciudades y la costa sobresalen; el interior queda casi plano."});
  return L;
}
let QL=null; const qGet=()=>QL||(QL=qList());
const ARTS=new Set(/[?&]live=1/.test(location.search)?[]:(window.__INDICIO_ARTS||(window.__INDICIO&&window.__INDICIO.arts)||[]));
// tarjeta: imagen estática generada en el build si existe (aparece al instante); si no, el dibujo en vivo
// ilustración de la pregunta (la misma escena de la cabecera, encuadrada para la tarjeta)
const illCard=id=>{ const I=window.__INDICIO||{}, sv=(I.illus||{})[id]; if(!sv) return null; const d=el("div"); d.className="qill"; d.innerHTML=sv.replace('viewBox="0 0 1200 360"',`viewBox="${(I.focus||{})[id]??240} 0 720 360"`).replace('xMidYMax slice','xMidYMid slice').replace('class="il ','class="il il-c '); return d; };
const qCard=(Q,W,H)=>{ const ic=illCard(Q.id)||illCard((Q.href||"").replace(/^\/preguntas\/|\/$/g,"")); if(ic) return ic; if(ARTS.has(Q.id)){ const im=el("img"); im.src="/art/"+Q.id+".jpg"; im.width=W; im.height=H; im.alt=""; im.decoding="async"; im.className="qimg"; return im; } return FEATS?qArt(Q,W,H):null; };
const qArt=(Q,W,H)=>{ try{ const n=QART[Q.art](W,H); if(n) n.classList.add("rv","rv-"+Q.art); if(n&&Q.art==="swarm"&&W<500) n.querySelectorAll("text,line,circle[r=\"0\"]").forEach(t=>{ if(t.tagName!=="circle"||t.getAttribute("fill")==="none") t.remove(); }); return n; }catch(e){ console.error(e); return null; } };

let QH_T=null;
// ---------- portada: un carrusel de cuatro preguntas, cada una con su respuesta y su gráfico ----------
// El título de cada diapositiva es el del análisis (STUDIES), igual que en el índice; `em` es el trozo final en granate.
// Las cifras de la cesta, la vivienda y los contratos salen de /data/portada.json, que calcula build.mjs en cada build
// con las mismas cuentas que sus análisis. Las del tope (3,1 % y 3,7 %, unos 7 € al mes en Barcelona) son resultados
// de studyTope, y los 4.100 empleos de la reforma laboral, de studyReforma: si cambian allí, hay que cambiarlas aquí.
const HEROQ=[
  {id:"vivienda",tab:"Vivienda",kk:"Vivienda",em:"pagar una casa?",chart:"casa",cta:"Ver cuánto pesa cada idea →",
    v:()=>`Faltan casas, y no todas las que hay se usan para vivir.`,
    a:N=>`Desde 2015 comprar una vivienda cuesta un ${N.compra}${NB}% más y alquilarla, un ${N.alquiler}${NB}% más, mientras el sueldo mediano ha subido un ${N.sueldo}${NB}%. Se forman muchos más hogares de los que se construyen viviendas, y parte de las que hay están vacías o son turísticas. Las dos cosas pesan, pero no igual: movilizar lo que hay da un empujón de una vez; construir es lo único que sigue sumando cada año.`,
    cap:N=>`Subida desde 2015: precio de compra hasta ${N.compraY}; alquiler medio de los contratos declarados, sueldo mediano y resto de precios hasta ${N.alquilerY}. Fuente: INE.`},
  {id:"precio-alimentos",tab:"Cesta",kk:"Precios y sueldos",em:"la cesta de la compra?",chart:"cesta",cta:"Ver qué ha subido más →",
    v:N=>N.doble?`La comida ha subido el doble que el sueldo.`:`La comida ha subido más que el sueldo.`,
    a:N=>`Desde 2019 la comida ha subido un ${N.fo}${NB}% y el sueldo mediano, un ${N.sa}${NB}%. Con lo que cobras se compra un ${N.poder}${NB}% menos de comida: una de cada ${N.cada} compras se queda en la tienda. La rebaja del IVA sí llegó al ticket, pero no ha compensado la subida.`,
    cap:N=>`Precio de los alimentos (media de cada año y de los últimos doce meses) y sueldo mediano hasta ${N.añoSueldo}, el último publicado, frente a 2019. Fuente: INE (IPC y Encuesta de Estructura Salarial).`},
  {id:"reforma-laboral",tab:"Contratos",kk:"Trabajo",em:"la reforma laboral?",chart:"contratos",cta:"Ver dónde cambió más →",
    v:N=>`Cambió los contratos. En el empleo, no se ve.`,
    a:N=>`Antes de la reforma, ${N.antes>=90?"más de nueve":"unos "+N.antesD} de cada diez contratos nuevos eran temporales; hoy son ${N.hoyD}, como enseña el gráfico. Se temía que un cambio así costara empleo, pero los sitios que más tiraban del contrato temporal no han perdido más que los demás. Si hubo una pérdida pequeña, de hasta unos 4.100 empleos, los datos no la distinguirían.`,
    cap:()=>`Parte de los contratos nuevos que son temporales, media de tres meses. Fuente: SEPE, contratos iniciales por municipio.`},
  {id:"tope-cataluna",tab:"Tope al alquiler",kk:"Alquiler",em:"en Cataluña?",chart:"tope",cta:"Ver qué pasó con las ventas de pisos →",
    v:()=>`Frenó la subida, pero no bajó el alquiler.`,
    a:()=>`En 2024 el alquiler siguió subiendo donde hay tope: un 3,1${NB}%. Sin él habría subido en torno a un 3,7${NB}%, así que en un piso de Barcelona la diferencia son unos 7${NB}€ al mes. A la vez se vendieron más pisos de lo esperable, y los datos no dicen si salieron del alquiler.`,
    cap:()=>`Subida del alquiler en 2024 en los municipios con tope, frente a la estimada sin él a partir de municipios parecidos. Fuente: INE, Índice de Precios de Vivienda en Alquiler.`},
];
// «Puesto a prueba»: preguntas que no están en el carrusel, con el veredicto y un párrafo corto que lo explica (en el móvil, solo el veredicto)
const PTIRA=[
  ["pisos-turisticos","Menos de lo que se dice.","Es la explicación que más se oye cada vez que sube el alquiler. Pero donde más han crecido los pisos turísticos no es, en general, donde más ha subido; si hay efecto, está en barrios concretos."],
  ["pensiones","No, a menos que cambien cuatro cosas a la vez.",`Ahora se jubilan las generaciones más numerosas. Si solo cambia la demografía, el gasto pasa del 13,2${NB}% al 24,9${NB}% del PIB en 2050. Para que quepa en el 16,2${NB}% al que apunta la AIReF hacen falta más empleo, más inmigración, jubilación más tardía y pensiones que pesen menos frente a los sueldos.`],
  ["quien-gobierna","Menos de lo que crees.","Miramos solo las elecciones que se decidieron por un puñado de votos, donde ganar fue casi cuestión de suerte. Donde ganó el PP por poco y donde ganó el PSOE por poco, la población, el paro, la renta y la deuda siguieron el mismo camino."],
  ["pandemia-turismo","Sí, y se recuperaron.","En la primavera de 2020 cerraron los hoteles y los aviones se quedaron en tierra. Ese año el paro subió más y la renta bajó más en las provincias más turísticas que en el resto, y después se recuperaron."],
  ["ave","Poco, por ahora.","Entre 2021 y 2023 la alta velocidad llegó a Galicia, Extremadura, Burgos, Murcia, Elche y Asturias. Dos o cuatro años después, los pueblos con estación nueva apenas se distinguen de otros casi idénticos que se quedaron sin ella."],
  ["convergencia","Sí, poco a poco, y sobre todo por el trabajo.","Entre 2015 y 2024 la renta subió en casi toda España, pero no igual para todos. Los sitios que partían de abajo han recortado distancia, y lo que más lo explica son los salarios; las pensiones y prestaciones ayudan, pero menos."],
];
let PORTADA_P=null; const loadPortada=()=>PORTADA_P||(PORTADA_P=getJSON("/data/portada.json").catch(()=>{ PORTADA_P=null; return null; }));

// los cuatro gráficos de la cabecera: SVG en un lienzo de 440×300, con los colores por clase (valen en modo oscuro)
const PTW=440, PTH=300;
const ptSvg=(inner,label)=>`<svg viewBox="0 0 ${PTW} ${PTH}" class="pt-g" role="img" aria-label="${esc(label)}">${inner}</svg>`;
const ptCharts={
  // la cesta: medias anuales en su año (y+0,5) y el último punto, los últimos doce meses, en su centro
  cesta(D){ const C=D.cesta, fo=[...C.comida.map(([y,v])=>[y+.5,v]),[C.ult12.x,C.ult12.v]], sa=C.sueldo.map(([y,v])=>[y+.5,v]);
    const t0=2019.5, t1=fo[fo.length-1][0], x0=40,x1=330,y0=262,y1=26, lo=95, hi=Math.max(142,Math.ceil(C.ult12.v/10)*10+2);
    const X=t=>x0+(x1-x0)*(t-t0)/(t1-t0), Yv=v=>y0-(y0-y1)*(v-lo)/(hi-lo), pt=([t,v])=>`${X(t).toFixed(1)},${Yv(v).toFixed(1)}`;
    const ov=fo.filter(([t])=>t<=sa[sa.length-1][0]), area="M"+ov.map(pt).join(" L")+" L"+[...sa].reverse().map(pt).join(" L")+" Z";
    const F=fo[fo.length-1], Sl=sa[sa.length-1]; let yF=Yv(F[1]), yS=Yv(Sl[1]); if(yS-yF<52){ const m=(yF+yS)/2; yF=m-26; yS=m+26; }
    const dots=(a,c)=>a.map((p,i)=>`<circle cx="${X(p[0]).toFixed(1)}" cy="${Yv(p[1]).toFixed(1)}" r="${i===a.length-1?4.5:3}" class="${c}"/>`).join("");
    const lab=(p,y,name,cl)=>`<text x="${(X(p[0])+12).toFixed(1)}" y="${(y-4).toFixed(1)}" class="pt-g-l${cl}">${name}</text><text x="${(X(p[0])+12).toFixed(1)}" y="${(y+21).toFixed(1)}" class="pt-g-n${cl}">+${nf0.format(p[1]-100)}${NB}%</text>`;
    return ptSvg([120,140].filter(g=>g<hi).map(g=>`<line x1="${x0}" x2="${x1}" y1="${Yv(g).toFixed(1)}" y2="${Yv(g).toFixed(1)}" class="pt-g-gr"/><text x="${x0-8}" y="${(Yv(g)+4).toFixed(1)}" text-anchor="end" class="pt-g-t">+${g-100}${NB}%</text>`).join("")
      +`<line x1="${x0}" x2="${x1}" y1="${Yv(100).toFixed(1)}" y2="${Yv(100).toFixed(1)}" class="pt-g-base"/><text x="${x0-8}" y="${(Yv(100)+4).toFixed(1)}" text-anchor="end" class="pt-g-t">2019</text>`
      +C.comida.filter(([y])=>y%2).map(([y])=>`<text x="${X(y+.5).toFixed(1)}" y="${y0+24}" text-anchor="middle" class="pt-g-t">${y}</text>`).join("")
      +`<path d="${area}" class="pt-g-area"/><path d="M${sa.map(pt).join(" L")}" pathLength="1" class="pt-g-ln ink"/><path d="M${fo.map(pt).join(" L")}" pathLength="1" class="pt-g-ln br"/>${dots(sa,"pt-f-ink")}${dots(fo,"pt-f-br")}`
      +lab(F,yF,"La comida"," br")+lab(Sl,yS,"El sueldo",""),
      `Desde 2019 el precio de la comida ha subido un ${nf0.format(F[1]-100)} % y el sueldo mediano un ${nf0.format(Sl[1]-100)} %.`); },
  // la casa: cuatro barras desde 2015
  casa(D){ const C=D.casa, R=[["Comprar una vivienda",C.compra[0],"br"],["Alquilarla",C.alquiler[0],"br"],["El sueldo mediano",C.sueldo[0],"ink"],["El resto de precios",C.precios[0],"mu"]];
    const x0=40, x1=345, mx=Math.max(...R.map(r=>r[1])), sc=v=>(x1-x0)*v/mx;   // deja sitio a la cifra a la derecha
    return ptSvg(`<text x="${x0}" y="22" class="pt-g-t">Cuánto ha subido desde 2015</text>`+R.map(([l,v,c],i)=>{ const y=44+i*62;
      return `<text x="${x0}" y="${y+14}" class="pt-g-l${c==="br"?" br":""}">${l}</text><rect x="${x0}" y="${y+22}" width="${Math.max(2,sc(v)).toFixed(1)}" height="26" rx="3" class="${c==="br"?"pt-f-br":c==="ink"?"pt-f-ink":"pt-f-mu"}"/>`
        +`<text x="${(x0+sc(v)+8).toFixed(1)}" y="${y+43}" class="pt-g-n${c==="br"?" br":""}">+${nf0.format(v)}${NB}%</text>`; }).join(""),
      `Desde 2015 comprar una vivienda cuesta un ${nf0.format(C.compra[0])} % más, alquilarla un ${nf0.format(C.alquiler[0])} % más, y el sueldo mediano ha subido un ${nf0.format(C.sueldo[0])} %.`); },
  tope(){ const x0=40,x1=400, sc=v=>x0+(x1-x0)*v/4.2, a=sc(3.7), b=sc(3.1);
    return ptSvg(`<text x="${x0}" y="62" class="pt-g-l">Sin el tope (estimado)</text><rect x="${x0}" y="74" width="${(a-x0).toFixed(1)}" height="44" rx="3" class="pt-g-ghost"/>`
      +`<text x="${(a-12).toFixed(1)}" y="105" text-anchor="end" class="pt-g-n">+3,7${NB}%</text>`
      +`<text x="${x0}" y="162" class="pt-g-l br">Con el tope (lo que pasó)</text><rect x="${x0}" y="174" width="${(b-x0).toFixed(1)}" height="44" rx="3" class="pt-f-br"/>`
      +`<text x="${(b-12).toFixed(1)}" y="205" text-anchor="end" class="pt-g-n on">+3,1${NB}%</text>`
      +`<line x1="${b.toFixed(1)}" x2="${b.toFixed(1)}" y1="226" y2="248" class="pt-g-tick"/><line x1="${a.toFixed(1)}" x2="${a.toFixed(1)}" y1="122" y2="248" class="pt-g-tick dash"/><line x1="${b.toFixed(1)}" x2="${a.toFixed(1)}" y1="244" y2="244" class="pt-g-tick"/>`
      +`<text x="${((a+b)/2).toFixed(1)}" y="272" text-anchor="middle" class="pt-g-g">unos 7${NB}€ al mes</text>`,
      "Sin el tope el alquiler habría subido un 3,7 %; subió un 3,1 %."); },
  contratos(D){ const {meses:M,temporales:T,antes}=D.contratos, idx=T.map((v,i)=>i).filter(i=>T[i]!=null), n=M.length, last=idx[idx.length-1];
    const X=i=>40+(330-40)*i/(n-1), Yv=v=>262-(262-26)*(v-40)/(100-40), ir=M.indexOf("2022-04");
    return ptSvg([50,75,100].map(g=>`<line x1="40" x2="330" y1="${Yv(g).toFixed(1)}" y2="${Yv(g).toFixed(1)}" class="pt-g-gr"/><text x="32" y="${(Yv(g)+4).toFixed(1)}" text-anchor="end" class="pt-g-t">${g}${NB}%</text>`).join("")
      +M.map((m,i)=>/-01$/.test(m)&&+m.slice(0,4)%2?`<text x="${X(i).toFixed(1)}" y="286" text-anchor="middle" class="pt-g-t">${m.slice(0,4)}</text>`:"").join("")
      +(ir>=0?`<line x1="${X(ir).toFixed(1)}" x2="${X(ir).toFixed(1)}" y1="30" y2="262" class="pt-g-tick dash"/><text x="${(X(ir)+8).toFixed(1)}" y="44" class="pt-g-g">Abril de 2022:</text><text x="${(X(ir)+8).toFixed(1)}" y="62" class="pt-g-g">entra la reforma</text>`:"")
      +`<path d="M${idx.map(i=>`${X(i).toFixed(1)},${Yv(T[i]).toFixed(1)}`).join(" L")}" pathLength="1" class="pt-g-ln br"/>`
      +`<text x="${X(0).toFixed(1)}" y="${(Yv(antes)-12).toFixed(1)}" class="pt-g-n">${nf0.format(antes)}${NB}%</text>`
      +`<circle cx="${X(last).toFixed(1)}" cy="${Yv(T[last]).toFixed(1)}" r="4.5" class="pt-f-br"/><text x="${(X(last)+12).toFixed(1)}" y="${(Yv(T[last])-4).toFixed(1)}" class="pt-g-l br">Hoy</text><text x="${(X(last)+12).toFixed(1)}" y="${(Yv(T[last])+21).toFixed(1)}" class="pt-g-n br">${nf0.format(T[last])}${NB}%</text>`,
      `Antes de 2022, el ${nf0.format(antes)} % de los contratos nuevos eran temporales; hoy, el ${nf0.format(T[last])} %.`); },
};
// cifras de los textos, calculadas con las mismas series que los gráficos
const ptNums=D=>{ const o={};
  if(D&&D.cesta){ const C=D.cesta, fo=C.ult12.v-100, sa=C.sueldo[C.sueldo.length-1][1]-100, loss=-C.poder/100, k=Math.round(1/loss);
    Object.assign(o,{fo:nf0.format(fo),sa:nf0.format(sa),doble:Math.abs(fo/sa-2)<.15,poder:nf0.format(-C.poder),añoSueldo:C.añoSueldo,
      cada:["","una","dos","tres","cuatro","cinco","seis","siete","ocho","nueve","diez","once","doce"][k]||nf0.format(k)}); }
  if(D&&D.casa){ const C=D.casa; Object.assign(o,{compra:nf0.format(C.compra[0]),alquiler:nf0.format(C.alquiler[0]),sueldo:nf0.format(C.sueldo[0]),compraY:C.compra[1],alquilerY:C.alquiler[1]}); }
  if(D&&D.contratos){ const T=D.contratos.temporales.filter(v=>v!=null), hoy=T[T.length-1], dz=["cero","una","dos","tres","cuatro","cinco","seis","siete","ocho","nueve","diez"];
    Object.assign(o,{antes:D.contratos.antes,antesD:dz[Math.round(D.contratos.antes/10)],hoyD:dz[Math.round(hoy/10)]}); }
  return o; };

function heroCarHTML(D){
  const byId=Object.fromEntries(STUDIES.map(S=>[S.id,S])), N=ptNums(D);
  const L=HEROQ.filter(h=>byId[h.id]&&(h.chart==="tope"||(D&&D[h.chart])));
  const tit=(t,em)=>t.endsWith(em)?esc(t.slice(0,-em.length))+`<em>${esc(em)}</em>`:esc(t);
  const slides=L.map((h,i)=>{ const S=byId[h.id], H=i?"h2":"h1";
    return `<div class="pt-s${i?"":" on"}" id="pts${i}" role="tabpanel" aria-roledescription="diapositiva" aria-label="${i+1} de ${L.length}"${i?` aria-hidden="true"`:""}>`
      +`<div class="pt-st"><div class="kk2">${esc(h.kk)}</div><${H} class="pt-q">${tit(S.t,h.em)}</${H}><p class="pt-v">${h.v(N)}</p><p class="pt-a">${h.a(N)}</p>`
      +`<p class="pt-cta"><a class="btn" href="/preguntas/${S.id}/"${i?` tabindex="-1"`:""}>${esc(h.cta)}</a></p></div>`
      +`<figure class="pt-sc">${ptCharts[h.chart](D)}<figcaption class="pt-cap">${h.cap(N)}</figcaption></figure></div>`; }).join("");
  const tabs=L.map((h,i)=>`<button type="button" role="tab" class="${i?"":"on"}" aria-selected="${i?"false":"true"}" aria-controls="pts${i}"><span class="pt-bar"><span></span></span><b>${esc(h.tab)}</b><small>${esc(byId[h.id].t)}</small></button>`).join("");
  return `<section class="pt-car" aria-roledescription="carrusel" aria-label="Preguntas destacadas"><div class="pt-stack">${slides}</div><div class="pt-tabs" role="tablist" aria-label="Elige una pregunta">${tabs}</div></section>`;
}
// Pasa sola cada 7 s; la barrita de la pestaña marca el tiempo. Se pausa con el ratón encima, con el foco de teclado dentro,
// fuera de pantalla o con la pestaña del navegador oculta. Elegir una pestaña o deslizar solo reinicia la cuenta.
// Con «reducir movimiento» también pasa, pero sin animaciones (las quita la regla general de styles.css).
const PT_MS=7000;
function heroCarBind(C){
  if(!C) return; const S=[...C.querySelectorAll(".pt-s")], T=[...C.querySelectorAll(".pt-tabs button")]; if(S.length<2) return;
  const bar=k=>T[k].querySelector(".pt-bar span");
  let i=0, el=0, last=performance.now(), hov=false, vis=true;
  const go=(n,dir)=>{ const prev=i; i=(n+S.length)%S.length; el=0; bar(prev).style.transform=""; if(i===prev) return;
    C.dataset.dir=dir<0?"back":"fwd";
    S[prev].classList.remove("on"); S[prev].classList.add("out"); S[prev].setAttribute("aria-hidden","true"); S[prev].querySelectorAll("a").forEach(a=>a.tabIndex=-1);
    T[prev].classList.remove("on"); T[prev].setAttribute("aria-selected","false");
    setTimeout(()=>S[prev].classList.remove("out"),700);
    S[i].classList.remove("out"); S[i].classList.add("on"); S[i].removeAttribute("aria-hidden"); S[i].querySelectorAll("a").forEach(a=>a.removeAttribute("tabindex"));
    T[i].classList.add("on"); T[i].setAttribute("aria-selected","true"); };
  const tick=now=>{ if(!document.body.contains(C)){ io&&io.disconnect(); return; }
    const dt=Math.min(now-last,100); last=now;
    if(!hov&&vis&&!C.querySelector(":focus-visible")){ el+=dt; if(el>=PT_MS) go(i+1,1); }
    bar(i).style.transform=`scaleX(${Math.min(1,el/PT_MS).toFixed(4)})`;
    requestAnimationFrame(tick); };
  const io="IntersectionObserver" in window?new IntersectionObserver(es=>{ vis=es[0].isIntersecting; },{threshold:.35}):null; if(io) io.observe(C);
  C.addEventListener("pointerenter",e=>{ if(e.pointerType==="mouse") hov=true; }); C.addEventListener("pointerleave",()=>{ hov=false; });
  T.forEach((b,k)=>{ b.addEventListener("click",()=>go(k,k<i?-1:1));
    b.addEventListener("keydown",e=>{ if(e.key==="ArrowRight"||e.key==="ArrowLeft"){ e.preventDefault(); const d=e.key==="ArrowRight"?1:-1; go(i+d,d); T[i].focus(); } }); });
  const st=C.querySelector(".pt-stack"); let sx=null;
  st.addEventListener("touchstart",e=>{ sx=e.touches[0].clientX; },{passive:true});
  st.addEventListener("touchend",e=>{ if(sx==null) return; const dx=e.changedTouches[0].clientX-sx; sx=null; if(Math.abs(dx)>50){ const d=dx<0?1:-1; go(i+d,d); } });
  requestAnimationFrame(tick);
}

async function renderInicio(){
  document.title="Indicio · Preguntas reales, respuestas con datos públicos";
  // mientras llega portada.json (unos cientos de bytes) sigue a la vista la portada pre-renderizada
  const D=await loadPortada(); if(location.pathname!=="/") return;
  const byId=Object.fromEntries(STUDIES.map(S=>[S.id,S]));
  // «Puesto a prueba»: una pieza por fila, gráfico y texto, alternando el lado del gráfico; en el móvil, el gráfico debajo del texto
  const tira=PTIRA.filter(([id])=>byId[id]).map(([id,b,t])=>{ const S=byId[id];
    return `<a class="pt-n" href="/preguntas/${id}/"><figure class="pt-fig" data-cv="${id}"></figure><div class="pt-tx"><div class="pt-k">${esc(TOPICL(S.tema))}</div><h3>${esc(S.t)}</h3><p class="pt-vd">${esc(b)}</p><p class="pt-sm">${esc(t)}</p><span class="pt-go">Ver la respuesta →</span></div></a>`; }).join("");
  const nMun=String(rowsAll().length).replace(/\B(?=(\d{3})+(?!\d))/g,".");
  view.innerHTML=`<div class="pt-lema"><b>Indicio</b> · Preguntas reales. Respuestas con datos públicos.</div>
  ${heroCarHTML(D)}
  <section class="ed-sec pt-pap"><div class="ed-k">Puesto a prueba</div><h2 class="ed-h2">Lo que se da por hecho, con los datos delante</h2>
    <p class="pt-lead">Algunas confirman lo que pensabas. Otras, no.</p>
    <div class="pt-grid">${tira}</div>
    <p class="pt-more"><a class="ed-go" href="/preguntas/">Ver las ${STUDIES.length} preguntas →</a></p></section>
  <section class="pt-land pt-lab"><a class="pt-land-im" href="/laboratorio/" aria-hidden="true" tabindex="-1">${tIll("laboratorio")}</a>
    <div class="pt-land-tx"><div class="ed-k">Laboratorio</div><h2>¿Tienes tu propia teoría? <em>Ponla a prueba.</em></h2>
      <p class="pt-land-lead">Elige dos datos y mira si de verdad van juntos o solo lo parecen.</p>
      <p class="pt-land-go"><a class="btn" href="/laboratorio/">Abrir el laboratorio →</a></p></div></section>
  <section class="pt-land pt-mun"><div class="pt-land-tx"><div class="ed-k">Municipios</div><h2>¿Y dónde vives tú? <em>Míralo de un vistazo.</em></h2>
      <p class="pt-land-lead">Los ${nMun} municipios de España tienen su ficha: quién vive, cuánto se gana y cómo vota.</p></div>
    <div class="pt-mun-q">${bigSearchHTML("q2","Escribe tu municipio…")}${exampleChips()}<p class="pt-tools"><a href="/municipio/#comparar">Comparar dos municipios</a><a href="/provincia/">Por provincia</a><a href="/rankings/">Rankings</a></p></div>
    <figure class="pt-mun-art"><div class="qh-art" id="qhart" role="img" aria-label="Cada municipio como un punto, según cuántos vecinos ha ganado o perdido desde 2005 y su edad media."></div>
      <figcaption class="pt-cap">Cada punto es un municipio, colocado según cuántos vecinos ha ganado o perdido desde 2005 y su edad media. <span class="pt-hint">Pasa por encima de un punto para ver cuál es y pulsa para abrir su ficha.</span></figcaption></figure></section>
  <section class="pt-why"><h2>Por qué fiarte de estas respuestas</h2>
    <div class="ci-steps" style="padding:0">
      <div><i>1</i><span><b>Datos que puedes comprobar</b>INE, SEPE, Seguridad Social y Eurostat. Cada gráfico dice de dónde sale.</span></div>
      <div><i>2</i><span><b>Cada respuesta dice cuánto aguanta</b>Una etiqueta te avisa si los datos solo describen, si comparan casos parecidos o si una ley hizo de experimento.</span></div>
      <div><i>3</i><span><b>Sin bando</b>Si los datos no dan para una conclusión, lo decimos, aunque el titular quede peor.</span></div></div></section>
  <section class="ed-sec"><div class="ed-k">Por tema</div><div class="ed-temas">${TOPIC_IDS.map(id=>`<a href="/temas/${id}/">${TOPICS[id].l}</a>`).join("")}</div></section>
  ${methodNote()}`;
  heroCarBind(view.querySelector(".pt-car"));
  // el gráfico de cabecera de cada análisis (data/covers.json), con su pie; si falta, su ilustración
  loadCovers().then(cv=>view.querySelectorAll(".pt-fig[data-cv]").forEach(f=>{ const c=coverOf(f.dataset.cv,cv);
    f.innerHTML=c?c.svg+`<figcaption class="pt-cap">${esc(c.cap)}</figcaption>`:`<div class="pt-im">${ptIll(byId[f.dataset.cv])}</div>`; }));
  bindBig("q2");
  // la nube de municipios: imagen fija y, encima, qué municipio es cada punto
  const ar=document.getElementById("qhart");
  if(ar&&ARTS.has("hero-campo")){ const mob=view.clientWidth<700, im=el("img"); im.src="/art/hero-campo"+(mob?"-m":"")+".jpg"; im.width=mob?720:1120; im.height=mob?520:380; im.alt=""; im.decoding="async"; im.loading="lazy"; im.className="qimg"; ar.appendChild(im); heroHover(ar,mob?"m":"d"); }
  else if(ar) ar.closest("figure").remove();
}
// ilustración de una pieza de la portada: la del análisis, recortada a 16:9 por su punto de interés, o la de su tema
const ptIll=S=>{ const I=window.__INDICIO||{}, sv=(I.illus||{})[S.id];
  if(!sv) return tIll(S.tema);
  const f=(I.focus||{})[S.id]??240, x=Math.max(0,Math.min(100,f/(1200-640)*100)).toFixed(0);
  return sv.startsWith("<img")?sv.replace("<img ",`<img style="object-position:${x}% 50%" `):sv.replace('viewBox="0 0 1200 360"',`viewBox="${f} 0 640 360"`).replace('xMidYMax slice','xMidYMid slice'); };

// la nube de la portada responde al ratón: qué municipio es cada punto y, al pulsar, su ficha.
// Las posiciones salen de art/hero-campo.json (scripts/hero-swarm.mjs), las mismas del dibujo.
let HERO_PTS=null;
function heroHover(ar,key){
  let P=null, cur=null; const tip=add(ar,"a","spot hv"), ring=add(ar,"div","hv-ring"); tip.hidden=true; ring.hidden=true;
  const load=()=>{ if(!HERO_PTS) HERO_PTS=getJSON("/art/hero-campo.json").catch(()=>null); return HERO_PTS.then(J=>{ if(!J||P) return; const L=J[key]; P={W:L.W,c:J.c,x:L.x.map(v=>v/10),y:L.y.map(v=>v/10),r:L.r.map(v=>v/10)}; P.q=d3.quadtree().x(i=>P.x[i]).y(i=>P.y[i]).addAll(d3.range(P.c.length)); }); };
  const media=()=>ar.querySelector("svg,img");
  const hide=()=>{ cur=null; tip.hidden=true; ring.hidden=true; ar.style.cursor=""; };
  const hit=e=>{ const m=media(); if(!P||!m) return null; const b=m.getBoundingClientRect(), k=b.width/P.W, vx=(e.clientX-b.left)/k, vy=(e.clientY-b.top)/k;
    const i=P.q.find(vx,vy,Math.max(22,8/k)); if(i==null) return null; const d=Math.hypot(P.x[i]-vx,P.y[i]-vy); return d<=P.r[i]+Math.max(2,5/k)?{i,k,b}:null; };
  const show=h=>{ const i=h.i, r=BYCODE.get(P.c[i]); if(!r){ hide(); return; } cur=P.c[i];
    const ab=ar.getBoundingClientRect(), px=h.b.left-ab.left+P.x[i]*h.k, py=h.b.top-ab.top+P.y[i]*h.k, rr=Math.max(5,P.r[i]*h.k+4);
    ring.hidden=false; Object.assign(ring.style,{left:(px-rr)+"px",top:(py-rr)+"px",width:rr*2+"px",height:rr*2+"px"});
    const v=r[F.var0525], ed=r[F.edad];
    tip.href=munPath(cur); tip.innerHTML=`<b>${esc(dispName(r[F.name]))}</b> <span>${esc(provShort(PROVS[r[F.prov]]))} · ${nf0.format(r[F.pop]||0)} hab.</span><br>${v!=null?`${v>=0?"Ha ganado":"Ha perdido"} un ${nf0.format(Math.abs(v))}${NB}% de vecinos desde 2005`:""}${ed!=null?` · edad media ${nf1.format(ed)} años`:""}<br><small>Ver su ficha →</small>`;
    tip.hidden=false; const tw=tip.offsetWidth, th=tip.offsetHeight; tip.style.left=Math.max(0,Math.min(ab.width-tw,px+14+tw<ab.width?px+14:px-14-tw))+"px"; tip.style.top=Math.max(0,py-th-12)+"px"; ar.style.cursor="pointer"; };
  ar.addEventListener("pointerenter",load,{once:true}); ar.addEventListener("touchstart",load,{once:true,passive:true});
  ar.addEventListener("pointermove",e=>{ if(e.pointerType!=="mouse"||e.target===tip||tip.contains(e.target)) return; const h=hit(e); h?show(h):hide(); });
  ar.addEventListener("pointerleave",e=>{ if(e.pointerType==="mouse") hide(); });
  ar.addEventListener("click",e=>{ if(e.target===tip||tip.contains(e.target)) return; load().then(()=>{ const h=hit(e);
    if(!h){ hide(); return; }
    if(e.pointerType==="mouse"||matchMedia("(hover:hover)").matches){ navTo("m"+P.c[h.i]); window.scrollTo(0,0); } else show(h); }); });
  tip.addEventListener("click",e=>{ if(cur){ e.preventDefault(); navTo("m"+cur); window.scrollTo(0,0); } });
  heroMine(ar,key,load,()=>P);
}
// tu municipio, señalado sobre la nube igual que Madrid y Barcelona (solo si lo has guardado)
function heroMine(ar,key,load,getP){
  if(!myOk(lastMun)) return;
  load().then(()=>{ const P=getP(), m=ar.querySelector("svg:not(.hv-mine),img"); if(!P||!m||!document.body.contains(ar)) return;
    const i=P.c.indexOf(lastMun); if(i<0) return;
    const mob=key==="m", W=P.W, H=mob?520:380, x=P.x[i], y=P.y[i], r=P.r[i], fs=mob?22:14, off=mob?90:150;
    const at=c=>{ const j=P.c.indexOf(c); return j<0?null:[P.x[j],P.y[j]]; }, md=at("28079"), bc=at("08019");
    const taken=[md?[md[0]+off,mob?66:40]:null,bc?[bc[0]-off,H-40]:null].filter(Boolean);
    const name=myName(lastMun), tw=name.length*fs*.5;
    const T0=mob?66:40, cand=[[x+off*.8,T0],[x-off*.8,T0],[x+off*.8,H-40],[x-off*.8,H-40]].map(([lx,ly])=>[Math.max(tw/2+6,Math.min(W-tw/2-6,lx)),ly]);
    const score=([lx,ly])=>Math.min(...taken.map(([tx,ty])=>Math.abs(tx-lx)/(tw+60)+(ty===ly?0:3)),9)-Math.abs(lx-x)/W;
    const [lx,ly]=cand.sort((a,b)=>score(b)-score(a))[0], up=ly<y;
    const C=QC(), ns="http://www.w3.org/2000/svg", sv=document.createElementNS(ns,"svg"); sv.setAttribute("viewBox",`0 0 ${W} ${H}`); sv.setAttribute("class","hv-mine"); sv.setAttribute("aria-hidden","true");
    const brd=css("--brand")||"#8a2232";
    sv.innerHTML=`<circle cx="${x}" cy="${y}" r="${r+(mob?6:4)}" fill="none" stroke="${brd}" stroke-width="${mob?3:2}"/>`+
      `<line x1="${x}" y1="${y+(up?-(r+4):r+4)}" x2="${lx}" y2="${ly+(up?4:-fs)}" stroke="${brd}" stroke-width="${mob?1.4:.9}"/>`+
      `<text x="${lx}" y="${ly}" text-anchor="middle" font-family="var(--serif)" font-style="italic" font-size="${fs}" fill="${brd}" paint-order="stroke" stroke="${C.bg}" stroke-width="4">${esc(name)}</text>`;
    const place=()=>{ const b=m.getBoundingClientRect(), a=ar.getBoundingClientRect(); Object.assign(sv.style,{left:(b.left-a.left)+"px",top:(b.top-a.top)+"px",width:b.width+"px",height:b.height+"px"}); };
    ar.querySelectorAll(".hv-mine").forEach(e=>e.remove()); ar.appendChild(sv); place();
    if(window.ResizeObserver) new ResizeObserver(place).observe(m); else addEventListener("resize",place);
  });
}

// un pueblo al azar, señalado sobre el dibujo
let QSPOT_T=null;
function spotStart(Q,n){
  if(QSPOT_T){ clearInterval(QSPOT_T); QSPOT_T=null; }
  const ar=document.getElementById("qhart"); if(!ar) return; ar.querySelectorAll(".spot").forEach(e=>e.remove());
  if(!n||!n.__pts||!Q.spot) return;
  const pool=n.__pts.filter(p=>{ const r=BYCODE.get(p.c); return r&&(r[F.pop]||0)>=150; });
  d3.select(n).selectAll(".spot-ring").remove(); const ring=d3.select(n).append("circle").attr("class","spot-ring").attr("r",0).attr("fill","none").attr("stroke",css("--ink")).attr("stroke-width",n.__W>800?2:3);
  const tip=add(ar,"a","spot"); tip.style.opacity=0;
  const one=()=>{ if(!document.body.contains(n)){ clearInterval(QSPOT_T); QSPOT_T=null; return; }
    const p=pool[Math.floor(Math.random()*pool.length)], r=BYCODE.get(p.c); if(!r) return;
    ring.interrupt().attr("cx",p.x).attr("cy",p.y).attr("r",p.r+16).attr("opacity",0).transition().duration(500).attr("r",p.r+5).attr("opacity",1);
    const k=n.getBoundingClientRect().width/n.__W, br=ar.getBoundingClientRect(), nr=n.getBoundingClientRect();
    const px=nr.left-br.left+p.x*k, py=nr.top-br.top+p.y*k;
    tip.href="#m"+p.c; tip.innerHTML=`<b>${esc(dispName(r[F.name]))}</b> <span>${esc(provShort(PROVS[r[F.prov]]))} · ${nf0.format(r[F.pop])} hab.</span><br>${Q.spot(r)}`;
    tip.style.opacity=0; tip.style.left="0px"; tip.style.top="0px";
    requestAnimationFrame(()=>{ const tw=tip.offsetWidth, th=tip.offsetHeight, right=px+14+tw<br.width; tip.style.left=Math.max(0,right?px+14:px-14-tw)+"px"; tip.style.top=Math.max(0,py-th-10)+"px"; tip.style.opacity=1; }); };
  setTimeout(one,1700); QSPOT_T=setInterval(one,3600);
}

// aparición al hacer scroll
let QIO=null;
function revealObserve(root){
  (root||document).querySelectorAll(".rv:not(.in)").forEach(el=>el.classList.add("in")); return;
  if(window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if(!("IntersectionObserver" in window)) return;
  if(!QIO) QIO=new IntersectionObserver(es=>es.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add("in"); QIO.unobserve(e.target); } }),{rootMargin:"0px 0px -12% 0px",threshold:.15});
  (root||document).querySelectorAll(".rv:not(.in)").forEach(el=>QIO.observe(el));
}
new MutationObserver(()=>{ clearTimeout(revealObserve._t); revealObserve._t=setTimeout(()=>revealObserve(view),60); }).observe(view,{childList:true,subtree:true});

// ANÁLISIS: una portada de periódico. La noticia principal con su gráfico, las tres más recientes y, por temas, el resto;
// cada una con su gráfico, su titular en forma de pregunta y su veredicto en una frase. Con ?tema=… muestra solo ese tema.
async function renderPreguntas(){
  const tq=new URLSearchParams(location.search).get("tema"), tema=TOPIC_IDS.includes(tq)?tq:"", T=TOPICS[tema];
  document.title=(T?T.l+" · Análisis":"Análisis")+" · Indicio";
  const all=[...STUDIES.map(S=>({id:S.id,href:"/preguntas/"+S.id+"/",t:S.t,d:S.d,tema:S.tema,ev:S.ev,a:S.a||S.d,pub:S.pub||"",upd:S.upd||S.pub||""})),
    ...QUICKQ.map(Q=>({id:Q.id,href:Q.href,t:Q.t,d:"",tema:Q.tema,ev:Q.ev,a:Q.a,pub:"",upd:""}))]
    .sort((x,y)=>(y.pub||"").localeCompare(x.pub||"")||(y.upd||"").localeCompare(x.upd||""));
  const L=all.filter(e=>!T||e.tema===tema), lead=L[0], recent=L.slice(1,4), rest=L.slice(4);
  const card=e=>{ const {v,r}=splitA(e.a); return `<a class="np-c" href="${e.href}"><figure class="np-fig" data-cv="${e.id}"></figure><div class="np-k">${esc(TOPICL(e.tema))}${evSpan(e.ev)}</div><h3 class="np-q">${esc(e.t)}</h3><p class="np-v">${esc(v)}</p>${r?`<p class="np-r">${esc(r)}</p>`:""}<span class="np-go">Leer el análisis →${e.pub?`<time datetime="${e.pub}">${fechaES(e.pub)}</time>`:""}</span></a>`; };
  const cnt=id=>all.filter(e=>e.tema===id).length;
  const chips=`<nav class="np-chips" aria-label="Temas"><a href="/preguntas/"${T?"":' class="on"'}>Todos<small>${all.length}</small></a>${TOPIC_IDS.map(id=>`<a href="/preguntas/?tema=${id}"${id===tema?' class="on"':""}>${TOPICS[id].l}<small>${cnt(id)}</small></a>`).join("")}</nav>`;
  const leadHTML=lead?(()=>{ const {v}=splitA(lead.a); return `<a class="np-lead" href="${lead.href}"><div class="np-lt"><div class="np-k">${lead.pub?"Lo último · ":""}${esc(TOPICL(lead.tema))}${evSpan(lead.ev)}</div><h2 class="np-lq">${esc(lead.t)}</h2><p class="np-lv">${esc(v)}</p>${lead.d?`<p class="np-ld">${esc(lead.d)}</p>`:""}<span class="np-lgo btn">Leer el análisis →</span></div><figure class="np-fig np-lf" data-cv="${lead.id}" data-cap="1"></figure></a>`; })():"";
  const byTema=T?[]:TOPIC_IDS.map(id=>[id,rest.filter(e=>e.tema===id)]).filter(([,a])=>a.length);
const labBlock=`<section class="np-lab"><div class="np-lab-t"><div class="kk2">Laboratorio</div><h2>${T?`Ya has visto lo de ${low(T.l)}. Ahora haz tu propio análisis.`:"Si tu pregunta no está, pruébala tú"}</h2><p>Elige dos datos, como el paro y la edad o la renta y el voto, y mira si van juntos de verdad en los ${nf0.format(rowsAll().length)} municipios y cuánto aguanta la relación cuando se compara entre iguales. También puedes ver qué pasó antes y después de una ley.</p><p class="np-lab-b"><a class="btn" href="/laboratorio/">Abrir el laboratorio →</a> <a class="ed-go" href="/laboratorio/metodo/">Cómo buscar causas →</a></p></div><a class="np-lab-i" href="/laboratorio/" aria-hidden="true" tabindex="-1">${tIll("laboratorio")}</a></section>`;
  const otros=T?`<section class="np-sec"><div class="np-sh"><h2>Otros temas</h2></div><div class="np-tg">${TOPIC_IDS.filter(id=>id!==tema).map(id=>`<a class="np-t" href="/preguntas/?tema=${id}"><div class="np-ti">${tIll(id)}</div><h3>${TOPICS[id].l}</h3><p>${esc(TOPICS[id].q)}</p><span>${cnt(id)} análisis →</span></a>`).join("")}</div></section>`:"";
  view.innerHTML=`<div class="np"><header class="np-mast"><div class="kk2">${T?"Análisis · "+esc(T.l):"Análisis"}</div><h1>${T?esc(T.l):"Lo que dicen los datos"}</h1><p>${T?esc(T.q)+" Estas son las preguntas que ya hemos contestado."+` <a href="/temas/${tema}/">Leer el panorama del tema →</a>`:`${all.length} preguntas respondidas con datos públicos, de lo más reciente a lo más antiguo. Cada respuesta dice hasta dónde llega.`}</p>${chips}</header>
    ${T?(L.length?`<section class="np-sec np-all"><div class="np-grid">${L.map(card).join("")}</div></section>`:`<p class="an-vacio">Todavía no hay análisis sobre ${low(T.l)}. Prueba tus propias preguntas en <a href="/laboratorio/">el laboratorio</a>.</p>`):leadHTML?`<section class="np-top">${leadHTML}</section>`:`<p class="an-vacio">Todavía no hay análisis sobre ${low(T?T.l:"este tema")}. Prueba tus propias preguntas en <a href="/laboratorio/">el laboratorio</a>.</p>`}
    ${!T&&recent.length?`<section class="np-sec"><div class="np-sh"><h2>Más recientes</h2></div><div class="np-grid">${recent.map(card).join("")}</div></section>`:""}
    ${byTema.map(([id,a])=>`<section class="np-sec"><div class="np-sh"><h2>${TOPICS[id].l}</h2><span>${esc(TOPICS[id].q)}</span>${T?"":`<a href="/temas/${id}/">Panorama del tema →</a>`}</div><div class="np-grid">${a.map(card).join("")}</div></section>`).join("")}
    ${T?"":`<section class="ed-sec an-sec ed-two"><div><div class="ed-k">Por municipio</div><h2 class="ed-h2">Mira cómo sale el tuyo</h2><p class="ed-lead">Su ficha, con las cifras clave frente a España y los municipios que más se le parecen.</p></div><div>${bigSearchHTML("q3","Busca tu municipio…")}<p class="an-links"><a class="ed-go" href="/comparar/">Comparar dos municipios →</a> <a class="ed-go" href="/municipio/">Ver el mapa de municipios →</a></p></div></section>`}
    ${labBlock}
    ${otros}</div>`;
  if(!T) bindBig("q3");
  loadCovers().then(cv=>{ view.querySelectorAll("[data-cv]").forEach(f=>{ const c=coverOf(f.dataset.cv,cv); if(c) f.innerHTML=c.svg+(f.dataset.cap?`<figcaption class="pt-cap">${esc(c.cap)}</figcaption>`:""); else f.remove(); }); });
}
})();
