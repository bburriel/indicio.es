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
}).catch(e=>{ console.error(e); view.innerHTML='<p class="loading">No se pudieron cargar los datos. Recarga la página.</p>'; });

const rowsAll=()=>IDX.map(o=>o.row);
const FMT={int:v=>nf0.format(v),pct:pc,pct_chg:sgn,pts:sgn,eur:eur,years:v=>nf1.format(v)+NB+"años",num1:v=>nf1.format(Math.abs(v)<0.05?0:v),km:v=>nf0.format(v)+NB+"km",dens:v=>(v<10?nf1:nf0).format(v)+NB+"hab./km²"};
const fmtK=k=>FMT[(CATK[k]||{}).f]||(v=>nf1.format(v));
const labK=k=>(CATK[k]||{}).l||k;

// media de España ponderada por población, y posición (percentil de población) de cada valor
const ESMEAN={}, PCTL={};
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
  if((m=p.match(/^\/laboratorio\/([a-z]+)$/))) return "explorar/"+m[1]+q;
  if(p==="/municipio") return "municipio";
  if((m=p.match(/^\/municipio\/(\d{5})(?:-[^/]*)?(?:\/([a-z]+))?$/))) return "m"+m[1]+(m[2]?"-"+m[2]:"");
  if(p==="/quien-soy") return "sobre";
  if(p==="/quien-soy/contacto") return "sobre-contacto";
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
    if(/^\/(data|og)\//.test(href)||/\.(json|png|jpg|csv|svg|pdf|xml|txt|webmanifest)(\?|$)/.test(href)) return;
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
  const m=h.match(/^m(\d{5})(?:-([a-z]+))?$/), rt=h.match(/^(?:renta|riqueza)(?:-(\d{5}))?$/), cr=h.match(/^(?:cruces|relaciones)(?:-([a-zA-Z0-9]+)-([a-zA-Z0-9]+))?$/);
  document.querySelectorAll(".nav a,.nav .ddb").forEach(a=>a.removeAttribute("aria-current")); ddClose();
  // dos pilares: todo lo ya analizado (preguntas, temas, municipios) cuelga de «Análisis»; lo demás es el laboratorio
  const cur=id=>{ id=({temas:"preguntas",municipio:"preguntas"})[id]||id; const e=document.getElementById("nav-"+id); if(e) e.setAttribute("aria-current","page"); };
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
  else if(/^estudios?/.test(h)){ cur(h==="estudios-metodo"?"lab":"preguntas"); renderEstudios((h.match(/^estudios?-([\w-]+)$/)||[])[1]); }
  else if(/^evolucion/.test(h)){ navTo(exHash({v:"evolucion"}),{replace:true}); return; }
  else if(/^comparar/.test(h)){ cur("municipio"); const c=h.match(/^comparar(?:-(\d{5}))?(?:-(\d{5}))?$/)||[]; renderComparar(c[1],c[2]); }
  else if(h==="__404") render404();
  else renderInicio();
}
let INIT_T=null;
const saveMun=()=>{ try{ localStorage.setItem("cifrario.mun",lastMun); }catch(e){} };
// menú desplegable de temas
const DDB=document.getElementById("nav-temas"), DDM=document.getElementById("ddm-temas");
function ddClose(){ if(DDM&&!DDM.hidden){ DDM.hidden=true; DDB.setAttribute("aria-expanded","false"); } }
if(DDB){ DDB.addEventListener("click",e=>{ e.stopPropagation(); if(!DDM.hidden){ ddClose(); return; } const b=DDB.getBoundingClientRect(); DDM.hidden=false; DDM.style.top=(b.bottom+8)+"px"; DDM.style.left=Math.max(12,Math.min(window.innerWidth-DDM.offsetWidth-12,b.left))+"px"; DDB.setAttribute("aria-expanded","true"); });
  document.addEventListener("click",e=>{ if(!DDM.contains(e.target)) ddClose(); }); document.addEventListener("keydown",e=>{ if(e.key==="Escape") ddClose(); }); window.addEventListener("scroll",ddClose,{passive:true}); window.addEventListener("resize",ddClose);
  DDM.addEventListener("click",e=>{ if(e.target.closest("a")) ddClose(); }); }
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
if(document.getElementById("q")) attachSearch(document.getElementById("q"),document.getElementById("results"),document.querySelector(".top .search"));

// ---------- geometría ----------
const fixPoly=pl=>pl.forEach((ring,i)=>{ const big=d3.geoArea({type:"Polygon",coordinates:[ring]})>2*Math.PI; if((i===0&&big)||(i>0&&!big)) ring.reverse(); });
const rewind=f=>{ const g=f.geometry; if(g&&d3.geoArea(f)>2*Math.PI){ if(g.type==="Polygon") fixPoly(g.coordinates); else if(g.type==="MultiPolygon") g.coordinates.forEach(fixPoly); } return f; };
function prepGeo(){ FEATS=topojson.feature(TOPO,TOPO.objects.municipalities).features.map(rewind); }

// ---------- piezas de página ----------
const LABNAV=cur=>`<nav class="labnav" aria-label="Laboratorio"><a class="lt" href="/laboratorio/" style="border:0;color:var(--ink)">Laboratorio<small>Elige un gráfico, pon datos y comprueba si es causa o casualidad</small></a>${[["explorar","Lienzo"],["metodo","Guía: cómo buscar causas"]].map(([k,l])=>`<a href="#${k==="metodo"?"estudios-metodo":k}" ${k===cur?'aria-current="page"':""}>${l}</a>`).join("")}${cur==="explorar"&&nbGet().length?`<button type="button" class="lbsaved" id="lbsaved">Mis análisis guardados · ${nbGet().length}</button>`:""}</nav>`;
function pageHead(title,dek,extra,after){ return `<header class="phead">${extra||""}<h1>${title}</h1>${dek?`<p class="dek">${dek}</p>`:""}${after||""}</header>`; }
const TOPICL=id=>({riqueza:"Riqueza",vivienda:"Vivienda",poblacion:"Población",trabajo:"Trabajo",gasto:"Dinero público",voto:"Voto"})[id]||"";
const fechaES=d=>{ if(!d) return ""; const [y,m,dd]=d.split("-"); return `${+dd} de ${MES[+m]} de ${y}`; };
const byline=S=>`<span class="by-who">Por <a href="/quien-soy/">${esc((window.__INDICIO&&window.__INDICIO.site&&window.__INDICIO.site.author.name)||"Indicio")}</a></span> · <time datetime="${S.pub||""}">${fechaES(S.pub)}</time>${S.upd&&S.upd!==S.pub?` · <span class="by-upd">Revisado el ${fechaES(S.upd)}</span>`:""} · <span class="by-m">${esc(S.m)}</span>`;
function finding(parent,title,text){ const s=add(parent,"section","finding"); if(title) add(s,"h2",null,title); if(text) add(s,"div","txt",text); return s; }
function fig(parent,{title,sub,source}={}){ const f=add(parent,"figure"); if(title) add(f,"div","ct",title); if(sub) add(f,"div","cs",sub); const body=add(f,"div"); if(source){ const c=add(f,"figcaption",null,source); f._cap=c; } f.body=body; return f; }
function methodNote(){
  return `<footer class="method">
    <p><b>De dónde salen los datos.</b> INE: Atlas de Distribución de Renta de los Hogares 2015–2024 (los años 2015–2023 a través del proyecto abierto <a href="https://github.com/pablogguz/ineAtlas.data" target="_blank" rel="noopener">ineAtlas.data</a>), padrón municipal 1996–2025, Censo de Población y Viviendas 2021, Estadística de Migraciones y Cambios de Residencia 2021–2024, Índice de Precios de Vivienda en Alquiler, viviendas turísticas, Encuesta de Estructura Salarial e IPC. SEPE: paro registrado por municipio, 2015–septiembre de 2026. Ministerio del Interior: generales de 2019 y 2023, municipales de 2019 y 2023 y europeas de 2024. idealista: precio medio de los anuncios de alquiler.</p>
    <p><b>Cómo leerlos.</b> La renta sale de las declaraciones de la renta y no incluye la economía sumergida. Salvo que se indique «descontando la inflación», los euros son de cada año. Las cifras de provincia y de España son medias de sus municipios ponderadas por población. En los municipios muy pequeños el INE no publica todos los datos.</p>
  </footer>`;
}

// ---------- gráfico de líneas con etiquetas al final de cada línea ----------
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
  const x=d3.scalePoint().domain(YRS).range([m.l,W-m.r]), y=d3.scaleLinear().domain([lo,hi]).nice(4).range([H-m.b,m.t]);
  const tf=tickFmt||(v=>nf0.format(v));
  svg.append("g").attr("class","grid").selectAll("line").data(y.ticks(4)).join("line").attr("x1",m.l).attr("x2",W-m.r).attr("y1",y).attr("y2",y);
  svg.append("g").attr("class","axis").selectAll("text").data(y.ticks(4)).join("text").attr("x",m.l-6).attr("y",v=>y(v)+4).attr("text-anchor","end").text(tf);
  svg.append("g").attr("class","axis").selectAll("text").data(xticks||[YRS[0],YRS[Math.floor((YRS.length-1)/2)],YRS[YRS.length-1]]).join("text").attr("x",x).attr("y",H-5).attr("text-anchor","middle").text(String);
  const line=d3.line().defined(v=>v!=null).x((v,i)=>x(YRS[i])).y(v=>y(v)).curve(d3.curveMonotoneX);
  for(const s of [...ser].reverse()) svg.append("path").attr("d",line(s.v)).attr("fill","none").attr("stroke",css(s.c)).attr("stroke-width",s.main?2.8:1.8).attr("stroke-linecap","round").attr("stroke-dasharray",s.dash?"4 3":null);
  // etiquetas directas al final de cada línea, separadas para que no se pisen
  const ends=ser.map(s=>{ const li=s.v.map((v,i)=>v!=null?i:-1).filter(i=>i>=0).pop(); return {s,li,y:y(s.v[li]),x:x(YRS[li])}; }).sort((a,b)=>a.y-b.y);
  for(let i=1;i<ends.length;i++){ if(ends[i].y-ends[i-1].y<14) ends[i].y=ends[i-1].y+14; }
  ends.forEach(e=>{ svg.append("circle").attr("cx",e.x).attr("cy",y(e.s.v[e.li])).attr("r",e.s.main?3.6:2.6).attr("fill",css(e.s.c));
    const t=svg.append("text").attr("class","dl").attr("x",e.x+7).attr("y",e.y+4).attr("fill",css(e.s.c));
    const mc=W<480?12:19, nm=e.s.n.length>mc?e.s.n.slice(0,mc-1)+"…":e.s.n; t.text(nm); if(nm!==e.s.n) t.append("title").text(e.s.n); });
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
function hbars(parent,rows,{fmt,ref,refLabel,color,scroll,max,min}={}){
  const f=fmt||(v=>nf1.format(v)); const vals=rows.map(r=>r.v).filter(v=>v!=null);
  const lo=min!=null?min:Math.min(0,d3.min(vals)), hi=max!=null?max:d3.max(vals.concat(ref!=null?[ref]:[]));
  const w=add(parent,"div","hbars"+(scroll?" scroll":""));
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
  view.querySelectorAll(".homeq a").forEach(x=>x.addEventListener("click",ev=>{ ev.preventDefault(); const [l,v,o]=EXQ[+x.dataset.q]; EX={...EX,v,d:o.d||EX.d,t:o.t||"",p:"",c:o.c||[],gb:o.gb||EX.gb,o:o.o||null}; if(o.e){ ES_.sel=o.e.slice(); ES_.base=null; } navTo(exHash()); }));
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
  svg.append("g").attr("class","grid").selectAll("line").data(y.ticks(4)).join("line").attr("x1",m.l).attr("x2",W-m.r).attr("y1",y).attr("y2",y);
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
        <nav class="tp-crumb" aria-label="Ruta"><a href="/preguntas/">Análisis</a> › <a href="/municipio/">Tu municipio</a> › Provincia de ${esc(provShort(PROVS[P]))}</nav>
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
  const es=REFS.es, PY=REFS.padYears, i15=PY.indexOf(2015), ce=REFS.census.es, pe=REFS.paro.es, k=VG();
  const gE=(lastV(es.pad)/es.pad[i15]-1)*100;
  const rel=(v,e,unit)=>{ if(v==null||e==null) return ""; const q=(v/e-1)*100; return Math.abs(q)<3?"como la media de España":`un ${nf0.format(Math.abs(q))}${NB}% ${q>0?"por encima":"por debajo"} de España`; };
  const pts_=(v,e,u)=>{ if(v==null||e==null) return ""; const dd=v-e; return Math.abs(dd)<0.5?"como España":`${nf1.format(Math.abs(dd))} ${u} ${dd>0?"más":"menos"} que España`; };
  const K=[["renta",`Renta por persona · 2024`,r[F.renta],esMean("renta"),v=>rel(v,esMean("renta")),["menos","más"]],
    ["varPob","Crecimiento desde 2015",r[F.varPob],gE,v=>`España ${sgn(gE)}`,["pierde","gana"]],
    ["edad","Edad media · 2023",r[F.edad],lastV(es.mean_age),v=>pts_(v,lastV(es.mean_age),"años"),["más joven","mayor"]],
    ["paroReg","Paro registrado · 2025",r[F.paroReg],pe.paro[10]/pe.pob1664*100,v=>pts_(v,pe.paro[10]/pe.pob1664*100,"puntos"),["menos","más"]],
    ["alquiler","Hogares de alquiler · 2021",r[F.alquiler],ce.rented,v=>`España ${pc0(ce.rented)}`,["menos","más"]],
    ["part",`Participación · ${k.slice(2,6)}`,r[F.part],VREFS.es[k].turnout,v=>`España ${pc0(VREFS.es[k].turnout)}`,["menos","más"]]];
  // «dónde queda entre todos»: cada fila pinta los 8.000 municipios como puntos y marca el tuyo
  box.className="strips"; const n=rowsAll().length;
  box.innerHTML=`<div class="st-h">Dónde queda entre los ${nf0.format(n)} municipios</div>`+K.map(([kk,l,v,e,mid,lr],i)=>`<div class="st-r"><div class="st-l">${l}<small>${v==null?"":mid(v)}</small></div><div class="st-c"><canvas data-i="${i}" aria-hidden="true"></canvas><div class="st-x"><span>${lr[0]}</span><span>${lr[1]}</span></div></div><div class="st-v">${v==null?'<span class="muted">sin dato</span>':fmtK(kk)(v)}</div></div>`).join("");
  const draw=()=>box.querySelectorAll("canvas").forEach(cv=>{ const [kk,,v,e]=K[+cv.dataset.i];
    const W=cv.clientWidth||600, H=38; cv.width=W*2; cv.height=H*2; const x=cv.getContext("2d"); x.scale(2,2);
    const vals=rowsAll().map(q=>q[F[kk]]).filter(z=>z!=null).sort(d3.ascending); if(!vals.length) return;
    const lo=d3.quantile(vals,.01), hi=d3.quantile(vals,.99), X=z=>4+(W-8)*Math.max(0,Math.min(1,(z-lo)/((hi-lo)||1)));
    let seed=7; const rnd=()=>{ seed=(seed*16807)%2147483647; return seed/2147483647; };
    x.fillStyle=css("--ink"); x.globalAlpha=.16; for(const z of vals){ x.fillRect(X(z),4+rnd()*(H-8),1.3,1.3); } x.globalAlpha=1;
    x.fillStyle=css("--rule-2"); x.fillRect(3,2,1,H-4); x.fillRect(W-4,2,1,H-4);
    if(e!=null){ x.fillStyle=css("--ink"); x.fillRect(X(e)-.75,0,1.5,H); }
    if(v!=null){ x.fillStyle=css("--rust"); x.fillRect(X(v)-1.5,0,3,H); } });
  requestAnimationFrame(draw);
  box.insertAdjacentHTML("beforeend",`<div class="st-k"><span><i class="me"></i>${esc(dispName(r[F.name]))}</span><span><i></i>Media de España</span><span>Cada punto gris es un municipio</span></div>`);
}
// ---------- minigráficos de cambio ----------
function smalls(box,r,d){
  const es=REFS.es, PY=REFS.padYears, i15=PY.indexOf(2015), iy=REFS.ipvaYears, j15=iy.indexOf(2015), pe=REFS.paro.es;
  const ch=a=>{ const f=a&&a.find(v=>v!=null), l=lastV(a); return f&&l!=null?(l/f-1)*100:null; };
  const out=[];
  if(d.pad){ const a=d.pad.slice(i15), b=es.pad.slice(i15); out.push(["Habitantes",`${sgn(ch(a))} · España ${sgn(ch(b))}`,a,b]); }
  const ri=d.s.net_income_pc; if(ri&&ri.some(v=>v!=null)){ const g=ch(ri), real=g==null?null:((1+g/100)/(REFS.ipc[2024]/REFS.ipc[2015])-1)*100; out.push(["Renta por persona",`${sgn(g)} · sin inflación ${sgn(real)}`,ri,es.net_income_pc]); }
  if(d.paro&&d.paro.y&&d.paro.y.some(v=>v)) out.push(["Paro registrado",`${sgn(ch(d.paro.y))} · España ${sgn(ch(pe.paro))}`,d.paro.y,pe.paro]);
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

// ---------- de un vistazo ----------
const GLANCE=[
  ["Población",[["pop","Habitantes","Padrón, 2025",false],["varPob","Crecimiento desde 2015","Padrón"],["edad","Edad media","2023"],["extr","Nacionalidad extranjera","2023"],["migExt","Llegadas netas del extranjero","por 1.000 hab. y año, 2021–2024"],["migInt","Saldo con el resto de España","por 1.000 hab. y año, 2021–2024"],["solos","Hogares de una persona","2023"]]],
  ["Dinero",[["renta","Renta neta por persona","2024"],["pobreza","Riesgo de pobreza","2023"],["gini","Desigualdad (Gini)","2023"],["pensiones","Peso de las pensiones","en los ingresos, 2023"]]],
  ["Trabajo y estudios",[["paroReg","Paro registrado","media de 2025, % de 16 a 64 años"],["paro","Tasa de paro","Censo de 2021"],["superiores","Estudios superiores","adultos, censo de 2021"]]],
  ["Vivienda",[["alquiler","Hogares de alquiler","Censo de 2021"],["noPrincipal","Viviendas vacías o secundarias","Censo de 2021"],["vt","Viviendas turísticas","mayo de 2026"]]],
  ["Voto",[["part","Participación","generales de 2023"]]]];
function glance(box,r,d){
  let h=`<table class="glance"><thead><tr><th>Dato</th><th class="r">Aquí</th><th class="r">España</th><th class="pos">Posición entre toda la población</th></tr></thead><tbody>`;
  for(const [g,rows] of GLANCE){
    h+=`<tr class="grp"><td colspan="4">${g}</td></tr>`;
    for(const [k,l,yr,showE] of rows){
      let v=r[F[k]]; if(k==="pop"&&d.pad) v=d.pad[d.pad.length-1];
      const f=fmtK(k), e=k==="pop"?null:esMean(k), p=pctl(k,v);
      h+=`<tr><td class="lab">${l}<small>${yr}</small></td><td class="v r">${v==null?'<span class="muted" style="font-weight:400">sin dato</span>':f(v)}</td><td class="e r">${e==null?"":f(e)}</td><td class="pos">${p==null||k==="pop"?"":`<div class="strip" title="Por encima del ${nf0.format(p)} % de la población de España"><span class="mid"></span><span class="dot" style="left:${Math.max(2,Math.min(98,p))}%"></span></div>`}</td></tr>`;
    }
  }
  h+=`</tbody></table><p class="muted" style="font-size:13px;margin-top:8px">La media de España pondera cada municipio por su población. Los datos tienen años distintos porque cada estadística se publica a su ritmo. En los municipios pequeños el INE no publica algunos datos.</p>`;
  box.innerHTML=h;
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
  const br=padBreak(d.pad,1996); if(br) t+=` Ojo: en ${br.y} el padrón perdió ${nf0.format(br.lost)} habitantes de golpe. Suele deberse a que una parte del término se separó como municipio propio o a una depuración del padrón, no a que la gente se fuera.`;
  if(f1!=null) t+=` El ${pc(f1)} tiene nacionalidad extranjera (España: ${pc(fE)})${f0!=null&&Math.abs(f1-f0)>=1?`, ${nf1.format(Math.abs(f1-f0))} puntos ${f1>f0?"más":"menos"} que en 2015`:""}.`;
  if(c.foreignBorn!=null) t+=` Contando a quienes nacieron fuera y ya tienen nacionalidad española, en 2021 era el ${pc(c.foreignBorn)}.`;
  lead(s,t);
  const g1=add(s,"div","cols2");
  if(d.pad) lineChart(g1,{title:"Habitantes, 1996 = 100",source:"Fuente: INE, padrón municipal. 1997 es una estimación: ese año no hubo padrón.",series:[{n:r[F.name],v:d.pad,c:"--s-mun",main:true},{n:"Provincia",v:pr.pad,c:"--s-prov"},{n:"España",v:es.pad,c:"--s-es"}],years:PY,xticks:[1996,2010,2025],index:true});
  else lineChart(g1,{title:"Habitantes, 2015 = 100",series:S3(r,d,"population"),index:true});
  lineChart(g1,{title:"Población con nacionalidad extranjera",source:"% de la población. Fuente: INE, Atlas de Renta.",series:S3(r,d,"pct_foreign"),fmt:pc,tickFmt:v=>nf0.format(v)+"%"});
  if(d.mig){ const MY=REFS.migYears, M=d.mig, b=block(s,"Quién llega y quién se va");
    const te=d3.sum(M,m=>m[1]||0), ti=d3.sum(M,m=>m[2]||0);
    add(b,"p",null,`Entre ${MY[0]} y ${MY[MY.length-1]}, ${esc(r[F.name])} ganó en neto ${nf0.format(Math.abs(te))} vecinos llegados del extranjero${te<0?" (en realidad, perdió)":""} y ${ti>=0?"ganó":"perdió"} ${nf0.format(Math.abs(ti))} en sus intercambios con el resto de España: gente que se muda desde o hacia otros municipios.`).style.cssText="max-width:680px;color:var(--ink-2);margin-bottom:12px";
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
  if(c.unemp!=null) t+=` En 2021 el paro era del ${pc(c.unemp)} (España: ${pc(ce.unemp)}) y el ${pc(c.higherEd)} de los adultos tenía estudios superiores (${pc(ce.higherEd)}).`;
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
    add(bp,"p",null,`En ${REFS.paroLast} había <b>${nf0.format(now)} personas</b> apuntadas al paro.${r[F.paroReg]!=null?` De media en 2025, el paro registrado equivalía al ${pc(r[F.paroReg])} de la población de 16 a 64 años (España: ${pc(pe.paro[10]/pe.pob1664*100)}).`:""}${prev?` Hace un año eran ${nf0.format(prev)}: ${now<prev?`${nf0.format(prev-now)} menos`:now>prev?`${nf0.format(now-prev)} más`:"las mismas"}.`:""}${PR.y[0]?` En 2015 la media fue de ${nf0.format(PR.y[0])}.`:""}`).style.cssText="max-width:680px;color:var(--ink-2);margin-bottom:12px";
    const g2=add(bp,"div","cols2");
    lineChart(g2,{title:"Paro registrado, 2015 = 100",source:"Media de cada año; 2026, de enero a septiembre. Fuente: SEPE.",series:[{n:r[F.name],v:PR.y,c:"--s-mun",main:true},{n:"Provincia",v:pp.paro,c:"--s-prov"},{n:"España",v:pe.paro,c:"--s-es"}],years:PY,xticks:[2015,2020,2026],index:true});
    const L=PR.last, c2=add(g2,"div");
    const sh=a=>{ const t=a[5]+a[6]+a[7]+a[8]+a[9]||1; return {agr:a[5]/t*100,ind:a[6]/t*100,con:a[7]/t*100,ser:a[8]/t*100,sin:a[9]/t*100}; };
    stackBars(c2,{rows:[{l:r[F.name],v:sh(L),me:true},{l:"España",v:sh(pe.last)}],
      cats:[{k:"ser",l:"Servicios",c:"--slate"},{k:"ind",l:"Industria",c:"--plum"},{k:"con",l:"Construcción",c:"--mustard"},{k:"agr",l:"Agricultura",c:"--olive"},{k:"sin",l:"Sin empleo anterior",c:"--stone"}],note:`% de las personas en paro según el sector de su último empleo (${REFS.paroLast}). En los municipios pequeños el SEPE no da cifras de menos de 5.`});
  }
  const b3=block(s,"Paro y estudios");
  cmpRows(b3,r[F.name],[["unemp","Tasa de paro","% de quien trabaja o busca empleo"],["activity","Tasa de actividad","% de adultos que trabaja o busca empleo"],["higherEd","Estudios superiores","% de adultos"]],cenSrc(r,d));
  add(b3,"figcaption",null,"Censo de 2021. El censo da tasas de paro más altas que la Encuesta de Población Activa: sirve para comparar lugares.");
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
    add(b2,"p",null,`Entre 2015 y 2024 el alquiler medio subió aquí un <b>${nf0.format(ga)}${NB}%</b> y la renta por persona un <b>${nf0.format(gi)}${NB}%</b>${ga>gi?": el alquiler ha subido más que la renta, algo que solo pasa en un puñado de municipios.":"."} El alquiler medio incluye contratos antiguos; los nuevos suben bastante más (ver <a href="/temas/vivienda/">Vivienda</a>).`).style.cssText="max-width:680px;color:var(--ink-2);margin-bottom:14px";
    const g=add(b2,"div","cols2");
    lineChart(g,{title:"Cuánto han subido desde 2015",sub:"2015 = 100",source:"Fuente: INE, Índice de Precios de Vivienda en Alquiler y Atlas de Renta.",series:[{n:"Alquiler aquí",v:alq,c:"--rust",main:true},{n:"Renta aquí",v:incI,c:"--slate"},{n:"Alquiler España",v:es.ipva.slice(i15),c:"--mustard",dash:true}],fmt:v=>nf1.format(v)}); }
  else add(b2,"p","muted","El INE solo publica el índice de alquiler de municipios de más de 10.000 habitantes.");
  if(d.vt&&d3.max(d.vt)>0){ const per=REFS.vtPeriods.map(p=>p.replace(/^(\d{4})M(\d\d)$/,(m,y,mm)=>MES[+mm].slice(0,3)+". "+y.slice(2)));
    const b3=block(s,"Viviendas turísticas"); const g=add(b3,"div","cols2");
    lineChart(g,{title:"Viviendas turísticas, % del total",source:"Fuente: INE, estadística experimental de viviendas turísticas.",series:[{n:r[F.name],v:d.vtp,c:"--s-mun",main:true},{n:"Provincia",v:pr.vtp,c:"--s-prov"},{n:"España",v:es.vtp,c:"--s-es"}],years:per,xticks:[per[0],per[Math.floor(per.length/2)],per[per.length-1]],fmt:pc,tickFmt:v=>nf1.format(v)+"%"});
    lineChart(g,{title:"Número de viviendas turísticas",source:"Fuente: INE.",series:[{n:r[F.name],v:d.vt,c:"--s-mun",main:true}],years:per,xticks:[per[0],per[Math.floor(per.length/2)],per[per.length-1]],fmt:v=>nf0.format(v)}); }
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
const DGROUPS=[["edad","mayores65","menores18","pensiones"],["renta","rentaHog","pobreza"],["superiores"],["varPob","var0525"],["migInt"],["migExt","extr"],["paroReg","paro"],["alquiler"],["noPrincipal"],["vt"],["solos"],["gini"],["part"],["alqVar"],["paroRegVar"]];
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
      return `<div><span class="pct${hi?"":" lo"}">Top ${pct}${NB}%</span>de los municipios con ${DPHRASE[it.k][hi?0:1]}<div class="dstrip"><i style="left:${Math.max(2,Math.min(98,it.p*100))}%;background:var(${hi?"--rust":"--slate"})"></i></div><small>${esc(labK(it.k))}: ${f(it.v)} · España: ${f(esMean(it.k))}${pos&&pos<=3&&pv.length>=5?` · ${pos}.º de su provincia`:""}</small></div>`; }).join("")+simCard;
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
  add(box,"p","muted",`Los cinco municipios que más se parecen a ${esc(r[F.name])} en tamaño, renta, edad, población extranjera, estudios, alquiler, crecimiento y paro. Compararse con iguales dice más que compararse con la media.`).style.cssText="font-size:15px;margin-bottom:10px;max-width:680px";
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
function scatter(parent,{x,y,minPop=0,prov=null,mark=null,logX=false,logY=false,diag=false,height,weighted=true,compact=false,title,source,hideSay=false}){
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
  const X=(logX?d3.scaleLog():d3.scaleLinear()).domain(xd).nice().range([m.l,W-m.r]).clamp(true), Y=(logY?d3.scaleLog():d3.scaleLinear()).domain(yd).nice().range([H-m.b,m.t]).clamp(true);
  const mxP=d3.max(pts,p=>p.r[F.pop]||1), Rr=d3.scaleSqrt().domain([0,mxP]).range([1.5,Math.max(4,Math.min(compact?12:16,(compact?12:16)*Math.sqrt(mxP/2e6)))]);
  const cv=f.body.querySelector("canvas"), ctx=cv.getContext("2d"); ctx.scale(2,2);
  const svg=d3.select(f.body).select("svg");
  const tks=(sc,n,lg)=>lg?sc.ticks(5).filter(t=>[1,2,5].includes(+String(t).replace(/^0\.0*/,"")[0])):sc.ticks(n);
  const short=(fm,v)=>fm(v).replace(/ (%|€)$/,"$1").replace(/(\d)\.000 ?€$/,"$1 mil €");
  svg.append("g").attr("class","grid").selectAll("line").data(tks(Y,5,logY)).join("line").attr("x1",m.l).attr("x2",W-m.r).attr("y1",Y).attr("y2",Y);
  svg.append("g").attr("class","axis").selectAll("text").data(tks(Y,5,logY)).join("text").attr("x",m.l-6).attr("y",v=>Y(v)+4).attr("text-anchor","end").text(v=>short(fy,v));
  svg.append("g").attr("class","axis").selectAll("text").data(tks(X,W<500?4:6,logX)).join("text").attr("x",X).attr("y",H-m.b+16).attr("text-anchor","middle").text(v=>short(fx,v));
  svg.append("text").attr("class","lab strong").attr("x",W-m.r).attr("y",H-4).attr("text-anchor","end").text(xl+" →");
  svg.append("text").attr("class","lab strong").attr("x",m.l-50).attr("y",m.t-10).attr("text-anchor","start").text("↑ "+yl);
  if(diag){ const [a,b]=X.domain(); svg.append("line").attr("x1",X(a)).attr("y1",Y(a)).attr("x2",X(b)).attr("y2",Y(b)).attr("stroke",css("--ink")).attr("stroke-dasharray","4 3"); svg.append("text").attr("class","lab").attr("x",X(b)-4).attr("y",Y(b)+14).attr("text-anchor","end").text("misma subida"); }
  else if(c&&Math.abs(c.r)>=0.1){ const [a,b]=X.domain(), tx=v=>logX?Math.log10(v):v, ty=v=>logY?Math.pow(10,v):v; const N=24, line=d3.range(N+1).map(i=>{ const xv=logX?a*Math.pow(b/a,i/N):a+(b-a)*i/N; return [X(xv),Y(ty(c.a+c.b*tx(xv)))]; });
    svg.append("path").attr("d",d3.line()(line)).attr("fill","none").attr("stroke",css("--ink")).attr("stroke-width",1.3).attr("stroke-dasharray","5 4"); }
  const base=css("--rust"), hl=css("--slate"), ink=css("--ink");
  const sorted=pts.slice().sort((a,b)=>(b.r[F.pop]||0)-(a.r[F.pop]||0));
  function paint(focus){
    ctx.clearRect(0,0,W,H);
    for(const p of sorted){ const isP=prov&&p.r[F.prov]===prov; ctx.beginPath(); ctx.arc(X(p.x0),Y(p.y0),Rr(p.r[F.pop]||1),0,7); ctx.fillStyle=isP?hl:base; ctx.globalAlpha=prov?(isP?.8:.10):.30; ctx.fill(); }
    ctx.globalAlpha=1;
    for(const code of [mark,(typeof MUN2!=="undefined"?MUN2:null),focus].filter(Boolean)){ const p=pts.find(q=>q.r[F.code]===code); if(!p) continue; const px=X(p.x0), py=Y(p.y0);
      ctx.beginPath(); ctx.arc(px,py,Math.max(5,Rr(p.r[F.pop]||1)),0,7); ctx.lineWidth=2; ctx.strokeStyle=ink; ctx.stroke();
      ctx.font="600 12.5px 'Libre Franklin', Arial, sans-serif"; ctx.fillStyle=ink; const nm=dispName(p.r[F.name]), tw=ctx.measureText(nm).width; ctx.fillText(nm,px+tw+12>W?px-tw-9:px+9,py-8); }
  }
  paint();
  const qt=d3.quadtree().x(p=>X(p.x0)).y(p=>Y(p.y0)).addAll(pts);
  const tip=f.body.querySelector(".maptip"), wrap=f.body.querySelector(".scat-wrap");
  const at=ev=>{ const bb=cv.getBoundingClientRect(); return [bb,qt.find((ev.clientX-bb.left)*W/bb.width,(ev.clientY-bb.top)*H/bb.height,16)]; };
  wrap.addEventListener("pointermove",ev=>{ const [bb,p]=at(ev);
    if(!p){ tip.hidden=true; paint(); wrap.style.cursor=""; return; } wrap.style.cursor="pointer";
    tip.innerHTML=`<b>${esc(p.r[F.name])}</b><br>${esc(xl)}: ${fx(p.x0)}<br>${esc(yl)}: ${fy(p.y0)}`; tip.hidden=false;
    tip.style.left=Math.max(tip.offsetWidth/2+4,Math.min(bb.width-tip.offsetWidth/2-4,(X(p.x0)/W)*bb.width))+"px"; tip.style.top=(Y(p.y0)/H*bb.height-6)+"px"; paint(p.r[F.code]); });
  wrap.addEventListener("pointerleave",()=>{ tip.hidden=true; paint(); });
  wrap.addEventListener("click",ev=>{ const [,p]=at(ev); if(p){ go(p.r[F.code]); window.scrollTo(0,0); } });
  if(!source){ const n=add(f,"figcaption",null,""); n.textContent=`${nf0.format(pts.length)} municipios${minPop?` de ${nf0.format(minPop)} habitantes o más`:""}.`; }
  else f._cap.textContent+=` Cada círculo es un municipio, más grande cuanta más población. Pulsa uno para abrir su ficha.`;
  return c;
}

// ---------- página ----------
const MATRIX=["renta","pobreza","gini","pensiones","paroReg","superiores","alquiler","noPrincipal","vt","varPob","migExt","migInt","edad","extr","solos","part","pp","psoe","vox","sumar"];
const TRIVIAL=new Set(["migExt|extr","migExt|varPob","migInt|varPob","renta|rentaHog","edad|mayores65","edad|menores18","mayores65|menores18","varPob|var0525","edad|pensiones","mayores65|pensiones","pp|psoe","pp|vox","pp|sumar","psoe|vox","psoe|sumar","sumar|vox"]);
const isTrivial=(a,b)=>TRIVIAL.has([a,b].sort().join("|"));
const SUGG=[["superiores","renta","¿Más estudios, más renta?"],["vt","alquiler","¿Pisos turísticos y alquiler?"],["edad","pensiones","¿Edad y pensiones?"],["extr","varPob","¿Crecen los que atraen extranjeros?"],["renta","part","¿Votan más los ricos?"],["edad","vox","¿Edad y voto a Vox?"],["paro","pobreza","¿Paro y pobreza?"],["rentaVar","alqVar","¿Renta y alquiler desde 2015?"],["solos","edad","¿Quién vive solo?"],["paroReg","renta","¿Más paro, menos renta?"],["renta","migInt","¿Adónde se muda la gente?"]];
let XS={x:"superiores",y:"renta",minPop:1000,prov:"",weighted:true,logX:false};
let MATC=null;

function renderRelaciones(x,y){
  document.title="Relaciones · Indicio";
  if(x&&CATK[x]) XS.x=x; if(y&&CATK[y]) XS.y=y;
  const opt=sel=>{ let h="",g=null; CAT.forEach(c=>{ if(c.g!==g){ if(g) h+="</optgroup>"; h+=`<optgroup label="${c.g}">`; g=c.g; } h+=`<option value="${c.k}" ${c.k===sel?"selected":""}>${esc(c.l)}</option>`; }); return h+"</optgroup>"; };
  view.innerHTML=pageHead("¿Qué va con qué?",`Elige dos datos y mira si se mueven juntos en los municipios de España. Por ejemplo: ¿los municipios con más estudios tienen más renta? ¿Donde hay más pisos turísticos hay más alquiler? Debajo verás cuánto se parecen, qué municipios se salen de la norma y qué relaciones son las más fuertes de todas.`)+
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
  if(f==="eur") return sd>4000?5000:1000; if(f==="years") return 5; if(f==="int") return 10000; if(f==="num1") return 5;
  return sd>15?10:sd>4?5:1;
}
const unitTxt=(k,v)=>{ const f=(CATK[k]||{}).f; const a=Math.abs(v);
  return f==="eur"?eur(a):f==="years"?nf1.format(a)+" años":f==="int"?nf0.format(a)+" habitantes":f==="num1"?nf1.format(a)+" puntos":(Number.isInteger(a)?nf0.format(a):a<1?nf2.format(a):nf1.format(a))+(a===1?" punto":" puntos"); };

function drawRel(){
  const S=XS, x=S.x, y=S.y, xl=labK(x), yl=labK(y), fx=fmtK(x), fy=fmtK(y);
  const box=document.getElementById("cplot"); box.innerHTML="";
  const c=scatter(box,{x,y,minPop:S.minPop,prov:S.prov||null,logX:S.logX,weighted:S.weighted,mark:lastMun,hideSay:true,diag:x==="rentaVar"&&y==="alqVar",
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

function drawMatrix(){
  const s=document.getElementById("cmat"); s.innerHTML="";
  const ks=MATRIX.filter(k=>F[k]!=null&&CATK[k]);
  const fk=JSON.stringify(EXF); if(MATC&&MATC._k!==fk) MATC=null;
  if(!MATC){ MATC={_k:fk}; for(let i=0;i<ks.length;i++) for(let j=i+1;j<ks.length;j++){ const c=wcorr(pairPts(ks[i],ks[j],{minPop:1000})); MATC[ks[i]+"|"+ks[j]]=MATC[ks[j]+"|"+ks[i]]=c?c.r:null; } }
  add(s,"h2",null,"Todas las relaciones de un vistazo");
  add(s,"div","txt",`<p>Cada casilla es la correlación entre dos datos en los municipios de 1.000 habitantes o más. Ocre: van en el mismo sentido. Azul: en sentido contrario. Cuanto más intenso el color, más fuerte la relación. Pulsa una casilla para verla en el gráfico.</p>`);
  const col=v=>{ if(v==null) return css("--nodata"); const t=Math.min(1,Math.abs(v)); return d3.interpolateRgb(css("--div-mid"),v>0?css("--rust"):css("--slate"))(Math.pow(t,0.8)); };
  const ink=v=>v!=null&&Math.abs(v)>0.55?css("--on-dark"):css("--ink");
  const sh=k=>({renta:"Renta",pobreza:"Pobreza",gini:"Desigualdad",pensiones:"Pensiones",paro:"Paro",paroReg:"Paro registrado",migExt:"Llegadas del extranjero",migInt:"Saldo con España",superiores:"Estudios superiores",alquiler:"Alquiler",noPrincipal:"Viviendas vacías o 2.ª",vt:"Pisos turísticos",varPob:"Crecimiento",edad:"Edad media",extr:"Extranjeros",solos:"Viven solos",part:"Participación",pp:"Voto PP",psoe:"Voto PSOE",vox:"Voto Vox",sumar:"Voto Sumar"}[k]||labK(k));
  const g=s;
  const m=add(g,"div","matrix");
  m.innerHTML=`<table><thead><tr><th></th>${ks.map(k=>`<th><span>${esc(sh(k))}</span></th>`).join("")}</tr></thead><tbody>${ks.map(a=>`<tr><th>${esc(sh(a))}</th>${ks.map(b=>{ if(a===b) return `<td class="self" style="background:var(--band)"></td>`; const v=MATC[a+"|"+b]; return `<td data-a="${a}" data-b="${b}" style="background:${col(v)};color:${ink(v)}" title="${esc(labK(a))} y ${esc(labK(b))}: r = ${v==null?"—":rFmt(v)}">${v==null?"":String(Math.round(v*10)).replace("-","−")}</td>`; }).join("")}</tr>`).join("")}</tbody></table>`;
  add(m,"figcaption",null,"Las cifras son la correlación multiplicada por 10 y redondeada: 9 es una relación casi perfecta y 0, ninguna. Pasa por encima de una casilla para ver el valor exacto.");
  m.querySelectorAll("td[data-a]").forEach(td=>td.addEventListener("click",()=>{ navTo("relaciones-"+td.dataset.a+"-"+td.dataset.b); window.scrollTo({top:0}); }));
  const pairs=[]; for(let i=0;i<ks.length;i++) for(let j=i+1;j<ks.length;j++){ const v=MATC[ks[i]+"|"+ks[j]]; if(v!=null&&!isTrivial(ks[i],ks[j])) pairs.push([ks[i],ks[j],v]); }
  pairs.sort((p,q)=>Math.abs(q[2])-Math.abs(p[2]));
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
const CMPROWS=[["Población",["pop","varPob","edad","extr","migExt","migInt","solos"]],["Dinero",["renta","rentaHog","pobreza","gini","pensiones"]],["Trabajo",["paroReg","paro","superiores"]],["Vivienda",["alquiler","noPrincipal","vt","alqVar"]],["Voto",["part","pp","psoe","vox","sumar"]]];
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
  let h=`<table class="glance cmptab"><thead><tr><th>Dato</th><th class="r">${esc(dispName(A[F.name]))}</th><th class="r">${esc(dispName(Bm[F.name]))}</th><th class="r">España</th></tr></thead><tbody>`;
  for(const [g,ks] of CMPROWS){ h+=`<tr class="grp"><td colspan="4">${g}</td></tr>`;
    for(const k of ks){ if(F[k]==null||!CATK[k]) continue; const f=fmtK(k), va=A[F[k]], vb=Bm[F[k]], e=k==="pop"?null:esMean(k);
      const big=va!=null&&vb!=null&&Math.abs(va-vb)>Math.max(Math.abs(e||0)*0.15,0.0001);
      h+=`<tr><td class="lab">${esc(labK(k))}<small>${esc((CATK[k].src||"").replace(/^Atlas de Renta del INE, /,""))}</small></td><td class="a r ${big&&va>vb?"win":big?"dim":""}">${va==null?"—":f(va)}</td><td class="b r ${big&&vb>va?"win":big?"dim":""}">${vb==null?"—":f(vb)}</td><td class="e r">${e==null?"":f(e)}</td></tr>`; } }
  h+=`</tbody></table><p class="muted" style="font-size:13px;margin-top:8px">En negrita oscura, el valor más alto cuando la diferencia es clara. Los datos tienen años distintos; la fuente aparece bajo cada nombre.</p>`;
  const t=finding(B,"Dato a dato",""); add(t,"div",null,h);
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
  {k:"paro",l:"Paro registrado",g:"Población y trabajo",u:"n",src:"SEPE (2026: enero a septiembre)",get:(A,lev,P,code)=>({years:REFS.paroYears,v:lev==="es"?REFS.paro.es.paro:lev==="prov"?(REFS.paro.prov[P]||{}).paro:(A.paro||{}).y})}];
const EVOK={}; EVO.forEach(e=>EVOK[e.k]=e);
const EVOSH={pib:"PIB",govTot:"Gasto público",govJub:"Jubilación",govSan:"Sanidad",govEdu:"Educación",govInt:"Intereses deuda",govIng:"Ingresos públicos",renta:"Renta/persona",rentaHog:"Renta/hogar",rentaMed:"Renta mediana",salMedia:"Salario medio",salMed:"Salario mediano",alq:"Alquiler declarado",alqNuevo:"Alquiler nuevos",vt:"Pisos turísticos",ipc:"Precios (IPC)",pob:"Habitantes",paro:"Paro registrado"};
const EVOPRESET=[["Gasto público y PIB",["govTot","govJub","govSan","govEdu","pib"]],["Sueldos y alquiler",["salMed","alq","alqNuevo","ipc"]],["Renta y precios",["renta","rentaHog","salMedia","ipc"]],["Población y paro",["pob","paro"]],["Turismo y alquiler",["vt","alq","pob"]]];
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

function evoScope(){ const lev=ES_.lev, code=ES_.mun, P=code?code.slice(0,2):null; return {lev,code,P}; }
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
    <p class="muted" style="font-size:13.5px">Ojo: compara el crecimiento, no el nivel. Que el alquiler y los salarios suban lo mismo no dice cuánto del sueldo se va en alquiler. ${REAL?"":"Pulsa «Descontando la inflación» para ver cuánto han crecido de verdad las series en euros."}</p>`;
}
// =====================================================================
// EXPLORADOR: un solo estado (datos, lugar, tamaño) y varias vistas
// =====================================================================
const CCAA_OF={"01":"País Vasco","20":"País Vasco","48":"País Vasco","02":"Castilla-La Mancha","13":"Castilla-La Mancha","16":"Castilla-La Mancha","19":"Castilla-La Mancha","45":"Castilla-La Mancha","03":"C. Valenciana","12":"C. Valenciana","46":"C. Valenciana",
  "04":"Andalucía","11":"Andalucía","14":"Andalucía","18":"Andalucía","21":"Andalucía","23":"Andalucía","29":"Andalucía","41":"Andalucía","05":"Castilla y León","09":"Castilla y León","24":"Castilla y León","34":"Castilla y León","37":"Castilla y León","40":"Castilla y León","42":"Castilla y León","47":"Castilla y León","49":"Castilla y León",
  "06":"Extremadura","10":"Extremadura","07":"Illes Balears","08":"Cataluña","17":"Cataluña","25":"Cataluña","43":"Cataluña","15":"Galicia","27":"Galicia","32":"Galicia","36":"Galicia","22":"Aragón","44":"Aragón","50":"Aragón",
  "26":"La Rioja","28":"Madrid","30":"Murcia","31":"Navarra","33":"Asturias","35":"Canarias","38":"Canarias","39":"Cantabria","51":"Ceuta","52":"Melilla"};
const EXVIEWS=[["mapa","Mapa","Cómo cambia un dato de un municipio a otro"],["tabla","Ranking","Ordena y filtra los municipios por varios datos"],["cruce","Relación","Si dos datos van juntos, y si podría ser causa"],["evolucion","Evolución","Cuánto ha crecido cada dato desde un año"],["grupos","Grupos","Medias por comunidad, provincia, tamaño o nivel de otro dato"],["distribucion","Reparto","Cómo se reparte un dato entre la población"]];
const EXSIZES=[["","Todos los tamaños",0,Infinity],["s1","Menos de 1.000 hab.",0,1000],["s2","1.000 a 10.000 hab.",1000,10000],["s3","10.000 a 50.000 hab.",10000,50000],["s4","Más de 50.000 hab.",50000,Infinity],["g1","1.000 hab. o más",1000,Infinity],["g10","10.000 hab. o más",10000,Infinity]];
const EXQ=[["¿Dónde ha subido más el alquiler?","mapa",{d:["alqVar","rentaVar"]}],["¿Qué pueblos pequeños crecen?","tabla",{d:["varPob","migInt","edad"],t:"s2",o:"varPob"}],["¿Votan más los municipios ricos?","cruce",{d:["renta","part"],t:"g1"}],["¿Suben los sueldos como los precios?","evolucion",{e:["salMed","alq","ipc"]}],["¿Más paro, menos renta? ¿Y a igual edad?","cruce",{d:["paroReg","renta"],t:"g1",c:["edad"]}],["¿Cómo se reparte la renta?","distribucion",{d:["renta"]}],["¿Dónde pesan más las pensiones?","grupos",{d:["pensiones","edad"],gb:"ccaa"}],["¿Pisos turísticos y alquiler, a igual tamaño?","cruce",{d:["vt","alquiler"],t:"g10",c:["lpop","renta"]}],["¿Dónde pesa más la brecha de empleo entre hombres y mujeres?","mapa",{d:["brechaEmpleo","empleoMujeres"]}],["¿Más estudios, menos contratos temporales?","cruce",{d:["superiores2539","temporales"],t:"g1"}],["¿Quién vive de qué? Renta de trabajo frente a renta del capital","cruce",{d:["irpfTrabajo","irpfBruta"],t:"g1"}]];
let EX={v:"mapa",d:["renta","paroReg"],p:"",t:"",m:null,c:[],gb:"ccaa",w:1,o:null,lx:0};

function exParse(h){ // explorar/vista?d=a,b&p=46&t=g1&m=46166&c=edad&gb=ccaa&e=...&b=2015&r=1
  const m=h.match(/^explorar(?:\/([a-z]+))?(?:\?(.*))?$/); if(!m) return;
  if(m[1]&&EXVIEWS.some(v=>v[0]===m[1])) EX.v=m[1];
  const q=new URLSearchParams(m[2]||"");
  if(q.has("d")) EX.d=q.get("d").split(",").filter(k=>CATK[k]).slice(0,6);
  if(q.has("p")) EX.p=q.get("p"); if(q.has("t")) EX.t=q.get("t"); if(q.has("m")&&BYCODE.has(q.get("m"))) EX.m=q.get("m");
  if(q.has("c")) EX.c=q.get("c").split(",").filter(Boolean); if(q.has("gb")) EX.gb=q.get("gb"); if(q.has("o")) EX.o=q.get("o"); if(q.has("w")) EX.w=+q.get("w"); if(q.has("lx")) EX.lx=+q.get("lx");
  if(q.has("e")) ES_.sel=q.get("e").split(",").filter(k=>EVOK[k]).slice(0,6); if(q.has("b")) ES_.base=+q.get("b"); if(q.has("r")) REAL=q.get("r")==="1";
  if(q.has("lv")) ES_.lev=q.get("lv");
}
function exHash(over){ const S={...EX,...(over||{})}; const q=new URLSearchParams();
  if(S.d&&S.d.length) q.set("d",S.d.join(",")); if(S.p) q.set("p",S.p); if(S.t) q.set("t",S.t); if(S.m) q.set("m",S.m); if(S.c&&S.c.length) q.set("c",S.c.join(","));
  if(S.v==="grupos") q.set("gb",S.gb); if(S.o) q.set("o",S.o); if(!S.w) q.set("w","0"); if(S.lx) q.set("lx","1");
  if(S.v==="evolucion"){ q.set("e",(S.e||ES_.sel).join(",")); if(ES_.base) q.set("b",ES_.base); if(REAL) q.set("r","1"); if(ES_.lev!=="es") q.set("lv",ES_.lev); }
  return "/laboratorio/"+S.v+"/"+(q.toString()?"?"+q.toString().replace(/%2C/g,","):""); }
// enlace desde los informes
const exLink=(view,o,txt)=>{ const save={...EX}; const h=exHash({v:view,d:o.d||EX.d,p:o.p||"",t:o.t||"",c:o.c||[],gb:o.gb||EX.gb,o:o.o||null,e:o.e,lx:o.lx||0}); return `<a class="exlink" href="${h}">${txt||"Ábrelo en el explorador"} →</a>`; };
function exSync(){ const sz=EXSIZES.find(s=>s[0]===EX.t)||EXSIZES[0]; EXF={prov:EX.p||"",min:sz[2],max:sz[3]}; }
function exRows(k){ return rowsAll().filter(r=>exOK(r)&&(k?r[F[k]]!=null:true)); }
function exSetHash(){ try{ history.replaceState(null,"",keyToPath(exHash())); }catch(e){} }

// ---------- mapa ----------
async function exMapa(out){
  const k=EX.d[0], f=fmtK(k);
  const g=add(out,"div","exmap");
  const left=add(g,"div"), right=add(g,"div");
  add(left,"div","cs",esc(CATK[k].src||""));
  const mb=add(left,"div","mapbox",'<div class="maploading">Dibujando el mapa…</div>'), lg=add(left,"div","legend");
  // listas
  const rows=exRows(k), minL=EX.t?0:(EX.p?0:5000), pool=rows.filter(r=>(r[F.pop]||0)>=minL).sort((a,b)=>b[F[k]]-a[F[k]]);
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
  const gg=svg.append("g").attr("transform","translate(5,5)");
  const tip=el("div","maptip"); tip.hidden=true; mb.appendChild(tip);
  const vals=rows.map(r=>r[F[k]]), ramp=[0,1,2,3,4,5,6].map(i=>css("--ramp-"+i));
  const neg=d3.quantile(vals.slice().sort((a,b)=>a-b),.15)<0&&d3.quantile(vals.slice().sort((a,b)=>a-b),.85)>0;
  let scale,stops,labels;
  if(neg){ const m=Math.max(Math.abs(d3.quantile(vals.slice().sort((a,b)=>a-b),.05)),Math.abs(d3.quantile(vals.slice().sort((a,b)=>a-b),.95))); const th=[-m*.6,-m*.25,-m*.05,m*.05,m*.25,m*.6];
    stops=[css("--div-neg"),css("--div-neg2"),"#c9d6e6",css("--div-mid"),ramp[2],ramp[4],ramp[6]]; scale=d3.scaleThreshold().domain(th).range(stops); labels=[f(-m*.6)+" o menos",f(m*.6)+" o más"]; }
  else { const qs=d3.scaleQuantile().domain(vals).range(ramp); scale=qs; stops=ramp; const th=qs.quantiles(); labels=[f(th[0]),f(th[th.length-1])]; }
  const ok=new Set(rows.map(r=>r[F.code]));
  gg.selectAll("path").data(feats).join("path").attr("d",path).attr("class","mun").attr("stroke",css("--geo-line")).attr("stroke-width",EX.p?.4:.15)
    .attr("fill",ft=>{ const r=BYCODE.get(ft.id); return r&&ok.has(ft.id)&&r[F[k]]!=null?scale(r[F[k]]):css("--nodata"); })
    .on("pointermove",(ev,ft)=>{ const r=BYCODE.get(ft.id); tip.innerHTML=`<b>${esc(r?r[F.name]:ft.properties.name)}</b>: ${r&&r[F[k]]!=null?f(r[F[k]]):"sin dato"}${r&&!ok.has(ft.id)?" (fuera del filtro)":""}`; tip.hidden=false; const bb=mb.getBoundingClientRect(); tip.style.left=Math.max(tip.offsetWidth/2+4,Math.min(bb.width-tip.offsetWidth/2-4,ev.clientX-bb.left))+"px"; tip.style.top=(ev.clientY-bb.top)+"px"; })
    .on("pointerleave",()=>tip.hidden=true).on("click",(ev,ft)=>{ if(BYCODE.has(ft.id)) go(ft.id); });
  if(!EX.p){ gg.append("path").datum(topojson.mesh(TOPO,TOPO.objects.provinces,(a,b)=>a!==b)).attr("fill","none").attr("stroke",css("--geo-line")).attr("stroke-width",.6).attr("d",path); gg.append("path").attr("d",proj.getCompositionBorders()).attr("fill","none").attr("stroke",css("--muted")).attr("stroke-width",.8); }
  [EX.m,MUN2].filter(Boolean).forEach((c,i)=>{ const ft=feats.find(x=>x.id===c); if(ft) gg.append("path").datum(ft).attr("d",path).attr("fill","none").attr("stroke",css(i?"--slate":"--ink")).attr("stroke-width",2.2); });
  lg.innerHTML=`<span class="num">${labels[0]}</span><span class="bar">${stops.map(c=>`<i style="background:${c}"></i>`).join("")}</span><span class="num">${labels[1]}</span><span class="help">${neg?"En azul, valores negativos; en granate, positivos.":"Siete grupos con el mismo número de municipios."} En gris, sin dato o fuera del filtro. Pulsa un municipio para abrir su ficha.</span>`;
}

// ---------- tabla ----------
let EXTN=100;
function exTabla(out){
  const ks=EX.d, sortK=EX.o&&(EX.o==="pop"||ks.includes(EX.o))?EX.o:ks[0];
  const rows=exRows().filter(r=>ks.some(k=>r[F[k]]!=null));
  const desc=!(EX.o&&EX.o.startsWith("-"));
  rows.sort((a,b)=>{ const va=a[F[sortK]], vb=b[F[sortK]]; if(va==null) return 1; if(vb==null) return -1; return vb-va; });
  const box=add(out,"div");
  box.innerHTML=`<div class="exrow" style="margin-bottom:8px"><input class="sel" id="extf" type="search" placeholder="Filtrar por nombre" style="max-width:240px"><span class="muted exhint">${nf0.format(rows.length)} municipios. Pulsa una columna para ordenar.</span><button type="button" class="sel" id="excsv" style="margin-left:auto">Descargar CSV</button></div><div class="extable"></div>`;
  const tb=box.querySelector(".extable");
  const draw=(filter)=>{ const rs=filter?rows.filter(r=>norm(r[F.name]).includes(norm(filter))):rows;
    const cols=[["pop","Habitantes"],...ks.map(k=>[k,labK(k)])];
    tb.innerHTML=`<table class="glance"><thead><tr><th>#</th><th>Municipio</th>${cols.map(([k,l])=>`<th class="r"><button type="button" class="sortb${k===sortK?" on":""}" data-k="${k}">${esc(l)}${k===sortK?" ↓":""}</button></th>`).join("")}</tr></thead><tbody>${rs.slice(0,EXTN).map((r,i)=>`<tr${r[F.code]===EX.m||r[F.code]===MUN2?' class="me"':""}><td class="muted">${i+1}</td><td><a href="#m${r[F.code]}">${esc(r[F.name])}</a><small class="muted" style="display:block;font-size:12.5px">${esc(provShort(PROVS[r[F.prov]]))}</small></td>${cols.map(([k])=>`<td class="r num">${r[F[k]]==null?"—":fmtK(k)(r[F[k]])}</td>`).join("")}</tr>`).join("")}</tbody></table>${rs.length>EXTN?`<button type="button" class="sel" id="exmore" style="margin-top:10px">Mostrar ${Math.min(100,rs.length-EXTN)} más</button>`:""}`;
    tb.querySelectorAll(".sortb").forEach(b=>b.addEventListener("click",()=>{ EX.o=b.dataset.k; EXTN=100; exSetHash(); exDraw(); }));
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
function adjData(x,y,ctrls,weighted){
  const cs=ctrls.filter(c=>c!==x&&c!==y);
  const rs=rowsAll().filter(r=>exOK(r)&&r[F[x]]!=null&&r[F[y]]!=null&&(r[F.pop]||0)>0&&cs.every(c=>c==="lpop"||c==="prov"?true:r[F[c]]!=null));
  if(rs.length<20) return null;
  const w=rs.map(r=>weighted?(r[F.pop]||1):1), W=d3.sum(w);
  const X0=rs.map(r=>r[F[x]]), Y0=rs.map(r=>r[F[y]]); let X=X0.slice(), Y=Y0.slice();
  if(cs.includes("prov")){ const g=rs.map(r=>r[F.prov]); X=demeanBy(X,g,w); Y=demeanBy(Y,g,w); }
  const num=cs.filter(c=>c!=="prov");
  if(num.length){ const Z=rs.map(r=>num.map(c=>c==="lpop"?Math.log10(r[F.pop]):r[F[c]])); X=wresid(X,Z,w); Y=wresid(Y,Z,w); }
  if(cs.length){ const mx=d3.sum(X0,(v,i)=>v*w[i])/W, my=d3.sum(Y0,(v,i)=>v*w[i])/W, ax=d3.sum(X,(v,i)=>v*w[i])/W, ay=d3.sum(Y,(v,i)=>v*w[i])/W; X=X.map(v=>v-ax+mx); Y=Y.map(v=>v-ay+my); }
  const c=wcorr(X.map((v,i)=>({x:v,y:Y[i],w:w[i]})));
  return {rs,w,X0,Y0,X,Y,c,cs};
}
function partialR(x,y,ctrls,weighted){ const d=adjData(x,y,ctrls,weighted); return d&&d.c?{r:d.c.r,n:d.rs.length}:null; }

// ---------- evolución ----------
function exEvo(out){
  out.innerHTML=`<div class="xsug" id="epre"></div><div class="evo"><div class="evo-ctl" id="ectl"></div><div class="evo-out"><div id="echart"></div><div id="esum"></div></div></div>`;
  document.getElementById("epre").innerHTML='<span class="muted" style="align-self:center">Prueba:</span>'+EVOPRESET.map(([l],i)=>`<a href="#" data-i="${i}">${l}</a>`).join("");
  document.querySelectorAll("#epre a").forEach(a=>a.addEventListener("click",ev=>{ ev.preventDefault(); ES_.sel=EVOPRESET[+a.dataset.i][1].slice(); ES_.base=null; drawEvoCtl(); drawEvo(); exSetHash(); }));
  if(EX.m){ ES_.mun=EX.m; } else if(lastMun) ES_.mun=lastMun;
  drawEvoCtl(); drawEvo();
  const ectl=document.getElementById("ectl"); ectl.addEventListener("change",()=>setTimeout(exSetHash,0)); ectl.addEventListener("click",()=>setTimeout(exSetHash,0));
}

// ---------- grupos ----------
function exGrupos(out){
  const ks=EX.d.slice(0,4);
  const ctl=add(out,"div","exrow");
  const qk=EX.d.find(k=>k!==ks[0])||"renta";
  ctl.innerHTML=`<span class="exlab">Agrupar por</span><div class="seg" role="group">${[["ccaa","Comunidad"],["prov","Provincia"],["size","Tamaño"],["q","Nivel de "+low(labK(ks[0]))]].map(([k,l])=>`<button type="button" data-g="${k}" aria-pressed="${EX.gb===k}">${esc(l)}</button>`).join("")}</div>`;
  ctl.querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{ EX.gb=b.dataset.g; exUpdate(); }));
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
    const f=fig(grid,{title:labK(k),sub:EX.gb==="q"?`según el nivel de ${low(labK(ks[0]))} (grupos con la misma población)`:"media ponderada por población",source:`La raya es la media de España. Fuente: ${CATK[k].src}.`});
    const vals=data.map(d=>d.v); hbars(f.body,data,{fmt:fmtK(k),ref:esMean(k),refLabel:"España",scroll:data.length>20,color:["--rust","--slate","--mustard","--plum"][i%4],min:Math.min(0,d3.min(vals))}); });
}

// ---------- distribución ----------
function exDist(out){
  const k=EX.d[0], f=fmtK(k), rows=exRows(k).filter(r=>r[F.pop]);
  const ctl=add(out,"div","exrow");
  ctl.innerHTML=`<span class="exlab">Contar</span><div class="seg" role="group"><button type="button" data-w="1" aria-pressed="${!!EX.w}">Personas</button><button type="button" data-w="0" aria-pressed="${!EX.w}">Municipios</button></div>`;
  ctl.querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{ EX.w=+b.dataset.w; exUpdate(); }));
  const vals=rows.map(r=>r[F[k]]).sort((a,b)=>a-b), lo=d3.quantile(vals,.01), hi=d3.quantile(vals,.99);
  const x=d3.scaleLinear().domain([lo,hi]).nice(30), bins=d3.bin().domain(x.domain()).thresholds(x.ticks(30)).value(r=>Math.max(lo,Math.min(hi,r[F[k]])))(rows);
  const wq=(p)=>{ const s=rows.slice().sort((a,b)=>a[F[k]]-b[F[k]]), tot=d3.sum(s,r=>EX.w?r[F.pop]:1); let acc=0; for(const r of s){ acc+=EX.w?r[F.pop]:1; if(acc>=p*tot) return r[F[k]]; } return null; };
  const p10=wq(.1), p50=wq(.5), p90=wq(.9);
  const fg=fig(out,{title:`${labK(k)}: cómo se reparte entre ${EX.w?"la población":"los municipios"}`,source:`Cada barra suma ${EX.w?"los habitantes":"el número"} de los municipios con un valor parecido. Los valores extremos (1 % por cada lado) se agrupan en las barras de los bordes. Fuente: ${CATK[k].src}.`});
  const W=Math.max(320,out.clientWidth||900), H=300, m={t:40,r:14,b:26,l:50};
  const X=d3.scaleLinear().domain(x.domain()).range([m.l,W-m.r]), cnt=bins.map(b=>d3.sum(b,r=>EX.w?r[F.pop]:1)), Y=d3.scaleLinear().domain([0,d3.max(cnt)]).nice(4).range([H-m.b,m.t]);
  const svg=d3.select(fg.body).append("svg").attr("viewBox",`0 0 ${W} ${H}`).attr("role","img").attr("aria-label","Histograma de "+labK(k));
  svg.append("g").attr("class","grid").selectAll("line").data(Y.ticks(4)).join("line").attr("x1",m.l).attr("x2",W-m.r).attr("y1",Y).attr("y2",Y);
  svg.append("g").attr("class","axis").selectAll("text").data(Y.ticks(4)).join("text").attr("x",m.l-6).attr("y",v=>Y(v)+4).attr("text-anchor","end").text(v=>EX.w?(v>=1e6?nf1.format(v/1e6)+" M":nf0.format(v/1e3)+" mil"):nf0.format(v));
  svg.append("g").selectAll("rect").data(bins).join("rect").attr("x",b=>X(b.x0)+.5).attr("width",b=>Math.max(.5,X(b.x1)-X(b.x0)-1)).attr("y",(b,i)=>Y(cnt[i])).attr("height",(b,i)=>Y(0)-Y(cnt[i])).attr("fill",css("--rust")).attr("opacity",.85)
    .append("title").text((b,i)=>`${f(b.x0)} a ${f(b.x1)}: ${nf0.format(cnt[i])} ${EX.w?"personas":"municipios"}`);
  svg.append("g").attr("class","axis").selectAll("text").data(X.ticks(W<600?4:7)).join("text").attr("x",X).attr("y",H-7).attr("text-anchor","middle").text(v=>f(v).replace(/ (%|€)$/,"$1"));
  const mk=[[p50,"Mediana: "+f(p50),0]]; [EX.m,MUN2].filter(c=>c&&BYCODE.has(c)&&BYCODE.get(c)[F[k]]!=null).forEach((c,i)=>mk.push([BYCODE.get(c)[F[k]],dispName(BYCODE.get(c)[F.name])+": "+f(BYCODE.get(c)[F[k]]),1+i]));
  mk.forEach(([v,t,j])=>{ const xx=X(Math.max(lo,Math.min(hi,v))); svg.append("line").attr("x1",xx).attr("x2",xx).attr("y1",m.t-[26,10,-6][j]).attr("y2",H-m.b).attr("stroke",css(["--ink","--slate","--rust"][j])).attr("stroke-width",1.4).attr("stroke-dasharray",j?"4 3":null);
    svg.append("text").attr("class","lab strong").attr("x",xx+(xx>W*0.7?-5:5)).attr("y",m.t-[28,12,-4][j]).attr("text-anchor",xx>W*0.7?"end":"start").style("fill",css(["--ink","--slate","--rust"][j])).text(t); });
  add(out,"p",null,`<b>${EX.w?"La mitad de la población":"La mitad de los municipios"}</b> ${EX.w?"vive en municipios":"tiene"} con menos de ${f(p50)}. El 10${NB}% ${EX.w?"de la población":"de los municipios"} está por debajo de ${f(p10)} y otro 10${NB}% por encima de ${f(p90)}: el de arriba tiene ${p10>0?nf1.format(p90/p10)+" veces":"bastante más que"} el de abajo.`).style.cssText="max-width:680px;margin-top:12px;color:var(--ink-2)";
}
// =====================================================================
// ESTUDIOS: preguntas causales, contadas paso a paso
// =====================================================================
const STUDIES=(window.__INDICIO&&window.__INDICIO.studies||[]).map(x=>({...x}));
const QUICKQ=(window.__INDICIO&&window.__INDICIO.quick||[]);
const CATP=["08","17","25","43"];
const METODO=`<section class="finding"><h2>1. Compararse con quien se parece</h2><div class="txt"><p>Si comparas municipios grandes con pueblos, cualquier diferencia puede deberse al tamaño. Por eso se «descuentan» factores como el tamaño, la edad o la renta: es comparar entre iguales. En el <a href="/laboratorio/cruce/">gráfico de relación del laboratorio</a>, pulsa las etiquetas «A igual edad», «A igual renta»… y mira cómo se mueven los puntos y cuánto queda de la relación.</p></div></section>
<section class="finding"><h2>1b. Buscar gemelos</h2><div class="txt"><p>Una forma aún más intuitiva de comparar entre iguales: buscar parejas de pueblos de la misma provincia casi idénticos en tamaño, edad y renta, que solo se diferencian en lo que te interesa. Si en la mayoría de parejas el que tiene más de una cosa tiene también más de la otra, la pista gana fuerza. El laboratorio lo hace solo en cada relación, y te enseña algunas parejas.</p></div></section>
<section class="finding"><h2>2. Comparar dentro de cada zona</h2><div class="txt"><p>Muchas cosas son comunes a una provincia o una comunidad: el clima, las leyes autonómicas, la historia. Comparar solo municipios de la misma provincia las quita de en medio. Es la etiqueta «Dentro de cada provincia».</p></div></section>
<section class="finding"><h2>3. Mirar los cambios, no solo los niveles</h2><div class="txt"><p>Lo que es fijo en cada lugar desaparece al comparar cuánto ha cambiado cada uno. Si donde más subió una cosa más subió la otra, la relación es más creíble que si solo coinciden los niveles. La etiqueta «Mirar los cambios» te lleva a ese gráfico cuando hay datos.</p></div></section>
<section class="finding"><h2>4. Buscar un antes y un después</h2><div class="txt"><p>Cuando una ley o un suceso afecta a unos lugares y a otros no, se compara cómo cambian los afectados con cómo cambian los demás. Si antes iban parejos y después se separan, esa separación es la mejor pista de un efecto. Se llama <b>diferencias en diferencias</b>; el estudio del <a href="/preguntas/tope-cataluna/">tope del alquiler en Cataluña</a> es un ejemplo.</p></div></section>
<section class="finding"><h2>5. Pensar en la causa al revés</h2><div class="txt"><p>¿Los pisos turísticos suben el alquiler, o los pisos turísticos van a donde el alquiler ya era caro? Con datos de un solo momento no se puede saber. Ayuda preguntarse qué pasó antes.</p></div></section>
<section class="finding"><h2>6. Desconfiar de uno mismo</h2><div class="txt"><p>Siempre puede quedar un factor que no hemos medido. Un buen análisis dice lo que no puede descartar. Y son datos de municipios: no dicen nada de cómo se comporta cada persona.</p>
<p>Para aprender más: <i>The Effect</i>, de Nick Huntington-Klein, y <i>Causal Inference: The Mixtape</i>, de Scott Cunningham. Los dos se pueden leer gratis en internet.</p></div></section>`;
function renderEstudios(id){
  const S=STUDIES.find(s=>s.id===id);
  if(id==="metodo"){ document.title="Cómo buscar causas · Indicio"; view.innerHTML=LABNAV("metodo")+pageHead("Cómo buscar causas con datos públicos","Una guía corta para pasar de «estas dos cosas van juntas» a «esto podría estar causando aquello», y saber cuándo no se puede.")+METODO+methodNote(); return; }
  if(!S){ renderPreguntas(); return; }
  document.title=S.t+" · Indicio";
  view.innerHTML=`<nav class="crumbs"><a href="/preguntas/">Análisis</a> › ${esc(TOPICL(S.tema))} › ${S.m}</nav>`+pageHead(S.t,S.d,"",`<p class="byline">${byline(S)}</p>`)+`<div id="sbody"></div><p class="q-next"><a class="ed-go" href="/laboratorio/">Ponlo a prueba en el laboratorio →</a> <a class="ed-go" href="/preguntas/">Más preguntas →</a></p>${methodNote()}`;
  ({"tope-cataluna":studyTope,"pisos-turisticos":studyVT,"pensiones":studyPens,"convergencia":studyConv,"pandemia-turismo":studyCovid,"crecer":studyGrow,"cerca-ciudad":studyCerca,"votar-pueblos":studyVotar})[S.id](document.getElementById("sbody"));
}

function studyTope(B){
  const ia=REFS.ipvaAntig, padW=p=>{ const a=REFS.prov[p]&&REFS.prov[p].pad; return a?a[a.length-1]:0; };
  const rest=Object.keys(ia.prov).filter(p=>!CATP.includes(p)&&ia.prov[p].n);
  const wavg=(ps,k,i)=>d3.sum(ps,p=>ia.prov[p][k][i]*padW(p))/d3.sum(ps,p=>padW(p));
  const yrs=[2021,2022,2023,2024], idx=[6,7,8,9];
  const cat=idx.map(i=>wavg(CATP,"n",i)), oth=idx.map(i=>wavg(rest,"n",i));
  const g=(a,i,j)=>(a[j]/a[i]-1)*100;
  const preC=g(cat,0,2)/2, preO=g(oth,0,2)/2, postC=g(cat,2,3), postO=g(oth,2,3), did=(postC-preC)-(postO-preO);
  // municipios: todos los contratos
  const mun=rowsAll().filter(r=>r[F.alq2223]!=null&&r[F.alq2324]!=null&&r[F.pop]);
  const wm=(rs,k)=>d3.sum(rs,r=>r[F[k]]*r[F.pop])/d3.sum(rs,r=>r[F.pop]);
  const mc=mun.filter(r=>CATP.includes(r[F.prov])), mo=mun.filter(r=>!CATP.includes(r[F.prov]));
  const mPreC=wm(mc,"alq2223"), mPostC=wm(mc,"alq2324"), mPreO=wm(mo,"alq2223"), mPostO=wm(mo,"alq2324"), mDid=(mPostC-mPreC)-(mPostO-mPreO);
  const s1=finding(B,"La pregunta",`<p>En marzo de 2024 entró en vigor en Cataluña el tope a los alquileres de la ley de vivienda: en los municipios declarados zona tensionada, el precio de un contrato nuevo no puede superar el anterior ni el índice de referencia. ¿Hizo que el alquiler subiera menos?</p>
    <p>No basta con mirar si el alquiler en Cataluña subió poco en 2024: quizá habría subido poco de todas formas. Hace falta un <b>grupo de comparación</b>, lugares parecidos donde no hubo tope, y comprobar que antes del tope los dos grupos iban parejos.</p>`);
  const s2=finding(B,"El método: diferencias en diferencias",`<p>Se calcula cuánto cambió la subida del alquiler en Cataluña después del tope, y se le resta cuánto cambió en el resto de España en el mismo tiempo. Lo que queda es la parte que se puede atribuir al tope, si se cumple una condición: que sin el tope los dos grupos habrían seguido evolucionando igual. Eso no se puede comprobar del todo, pero ayuda ver que antes iban a la par.</p>`);
  const s3=finding(B,"Contratos nuevos: Cataluña y el resto de España",`<p>Índice de alquiler de los contratos firmados cada año, que es lo que el tope limita. Entre 2021 y 2023 subía un ${nf1.format(preC)}${NB}% al año en Cataluña y un ${nf1.format(preO)}${NB}% en el resto. En 2024, un ${nf1.format(postC)}${NB}% y un ${nf1.format(postO)}${NB}%.</p>`);
  lineChart(s3,{title:"Alquiler de contratos nuevos, 2021 = 100",source:"Cataluña: media de sus cuatro provincias; resto: media de las demás. Ponderadas por población. Fuente: INE, Índice de Precios de Vivienda en Alquiler por antigüedad del contrato.",series:[{n:"Cataluña",v:cat,c:"--rust",main:true},{n:"Resto de España",v:oth,c:"--slate"}],years:yrs,xticks:yrs,index:true,height:260});
  const s4=finding(B,"El resultado",`<p class="big" style="font-size:20px;font-weight:600;max-width:760px">El alquiler de los contratos nuevos se aceleró en 2024 en toda España, pero en Cataluña ${did<0?"algo menos":"algo más"}: unos <mark>${nf1.format(Math.abs(did))} puntos</mark> ${did<0?"menos":"más"} que en el resto.</p>
    <p>Con todos los contratos y municipio a municipio (${nf0.format(mc.length)} catalanes frente a ${nf0.format(mo.length)} del resto, todos de más de 10.000 habitantes), el resultado es parecido: antes del tope subían casi igual (${nf1.format(mPreC)}${NB}% y ${nf1.format(mPreO)}${NB}% en 2023) y en 2024 Cataluña subió ${nf1.format(Math.abs(mDid))} puntos ${mDid<0?"menos":"más"} (${nf1.format(mPostC)}${NB}% frente a ${nf1.format(mPostO)}${NB}%).</p>`);
  const f=fig(s4,{title:"Subida anual del alquiler, todos los contratos",source:"Municipios de más de 10.000 habitantes, media ponderada por población. Fuente: INE, Índice de Precios de Vivienda en Alquiler."});
  const mx=Math.max(mPreC,mPostC,mPreO,mPostO);
  const w=add(f.body,"div","cmp"); w.innerHTML=`<div class="keys"><span><i style="background:var(--rust)"></i>Cataluña</span><span><i style="background:var(--slate)"></i>Resto de España</span></div>`+[["2023, antes del tope",mPreC,mPreO],["2024, con el tope desde marzo",mPostC,mPostO]].map(([l,a,b])=>`<div class="cmp-row"><div class="n">${l}</div><div class="bars">${[[a,"--rust"],[b,"--slate"]].map(([v,c])=>`<div class="b"><span style="width:${v/mx*100}%;background:var(${c})"></span><em>${sgn(v)}</em></div>`).join("")}</div></div>`).join("");
  finding(B,"Qué se puede concluir y qué no",`<ul class="defs">
    <li><b>El efecto, si existe, es pequeño en estos datos:</b> alrededor de un punto menos de subida en un año. El tope solo empezó en marzo y solo en las zonas tensionadas, así que 2024 recoge una parte del efecto. Habrá que repetirlo con los datos de 2025.</li>
    <li><b>Solo vemos alquileres declarados a Hacienda.</b> Si parte de los contratos dejaron de declararse o se pasaron a alquiler de temporada, este índice no lo recoge.</li>
    <li><b>No vemos cuántos pisos se alquilan.</b> Un tope puede bajar el precio y, a la vez, reducir la oferta. Con estos datos no se puede medir.</li>
    <li><b>El grupo de comparación no es perfecto:</b> el resto de España incluye zonas con mercados muy distintos. Un estudio más fino compararía con municipios parecidos en tamaño, renta y presión turística.</li></ul>
    <p style="margin-top:10px">${exLink("evolucion",{e:["alqNuevo","alq","salMed","ipc"]},"Mira la evolución por provincia en el explorador")}</p>`);
}

function studyVT(B){
  const x="vtCambio", y="alqVar20";
  const pts=pairPts(x,y,{weighted:true});
  const base=partialR(x,y,[],true), c1=partialR(x,y,["lpop"],true), c2=partialR(x,y,["lpop","rentaVar20","pobVar20"],true), c3=partialR(x,y,["lpop","rentaVar20","pobVar20","prov"],true);
  const lv=wcorr(pairPts("vt","alqVar",{weighted:true}));
  finding(B,"La pregunta",`<p>Se suele decir que los pisos turísticos encarecen el alquiler: cada piso que pasa a alquilarse por días es un piso menos para vivir. Pero los pisos turísticos se concentran donde hay turismo, empleo, gente que llega y renta que sube, y todo eso también empuja el alquiler. ¿Cuánto queda de la relación cuando se tienen en cuenta esas otras cosas?</p>`);
  finding(B,"El método: cambios, y comparar entre iguales",`<p>En vez de comparar municipios con muchos y pocos pisos turísticos, que son muy distintos entre sí, se compara <b>cuánto cambió</b> en cada municipio el peso de los pisos turísticos entre 2020 y 2024 con <b>cuánto subió</b> el alquiler en esos años. Así desaparece lo que es fijo en cada lugar. Después se descuentan, paso a paso, el tamaño, la subida de la renta, el crecimiento de la población y la provincia.</p>`);
  const s3=finding(B,"Lo que dicen los datos",`<p>Cada punto es un municipio de más de 10.000 habitantes. En horizontal, cuántos puntos ganó o perdió el peso de los pisos turísticos sobre el total de viviendas; en vertical, cuánto subió el alquiler declarado.</p>`);
  scatter(s3,{x,y,title:"Cambio en los pisos turísticos y subida del alquiler, 2020–2024",source:"Fuente: INE, viviendas turísticas (agosto de 2020 y de 2024) e Índice de Precios de Vivienda en Alquiler.",hideSay:true});
  const rows=[["Sin descontar nada",base],["Descontando el tamaño",c1],["… y la subida de la renta y de la población",c2],["… y comparando solo dentro de cada provincia",c3]].filter(r=>r[1]);
  const s4=finding(B,"El resultado",`<p class="big" style="font-size:20px;font-weight:600;max-width:760px">La relación es débil desde el principio (r = ${rFmt(base.r)}) y ${Math.abs(c3?c3.r:base.r)<Math.abs(base.r)*0.6?"se debilita":"se mantiene"} al comparar municipios parecidos (r = ${rFmt((c3||base).r)}).</p>`);
  const t=add(s4,"div"); t.innerHTML=`<table class="glance" style="max-width:640px"><thead><tr><th>Comparación</th><th class="r">Relación (r)</th><th class="r">Explica</th></tr></thead><tbody>${rows.map(([l,c])=>`<tr><td>${l}</td><td class="r num"><b>${rFmt(c.r)}</b></td><td class="r num">${nf0.format(c.r*c.r*100)}${NB}%</td></tr>`).join("")}</tbody></table><p class="muted" style="font-size:13.5px;margin-top:6px">${nf0.format(base.n)} municipios, ponderados por población. «Explica» es la parte de las diferencias en la subida del alquiler que va asociada a los pisos turísticos.</p>`;
  finding(B,"Qué se puede concluir y qué no",`<ul class="defs">
    <li><b>A escala de municipio, la huella es pequeña:</b> los municipios donde más crecieron los pisos turísticos no son, en general, donde más subió el alquiler declarado. ${lv?`Comparando niveles en vez de cambios pasa lo mismo (r = ${rFmt(lv.r)}).`:""}</li>
    <li><b>Eso no quiere decir que no tengan efecto.</b> El efecto puede estar en barrios concretos, que aquí se diluyen en la media del municipio. Estudios a escala de barrio en Barcelona sí han encontrado subidas del alquiler asociadas a la llegada de pisos turísticos.</li>
    <li><b>El alquiler declarado reacciona despacio,</b> porque incluye contratos antiguos. El precio de los anuncios podría mostrar una relación más fuerte, pero no hay datos públicos por municipio.</li>
    <li><b>En muchas zonas turísticas hay poco alquiler de larga duración,</b> así que el índice se basa en pocos contratos.</li></ul>
    <p style="margin-top:10px">${exLink("cruce",{d:["vtCambio","alqVar20"],t:"g10",c:["lpop","rentaVar20"]},"Repite el análisis en el explorador")}</p>`);
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
}
function govNote(){ return `<footer class="method"><p><b>De dónde salen los datos.</b> Eurostat: gasto de las administraciones públicas por funciones (clasificación COFOG, 1995–${GOV.years[GOV.years.length-1]}), cuentas públicas, deuda pública, PIB, gasto y beneficiarios de pensiones, población y proyecciones de población (EUROPOP2023). Las administraciones públicas incluyen Estado, comunidades autónomas, ayuntamientos y Seguridad Social, sin contar dos veces lo que se transfieren entre ellas.</p><p><b>Cómo leerlos.</b> «Jubilación» es la función de vejez de COFOG: sobre todo pensiones de jubilación, también servicios para mayores. El gasto total en pensiones (con viudedad, incapacidad y otras) es mayor: en el estudio de pensiones se usa esa cifra.</p></footer>`; }

// ---------- estudio: pensiones ----------
let PSC={emp:0,ben:0,cov:0};
async function studyPens(B){
  await loadGov();
  const P=GOV.pen, yrs=Object.keys(P.exp).map(Number).sort(), Y=yrs[yrs.length-1];
  const ex=y=>P.exp[y], dep=y=>P.olddep[y]??P.proj[y], ben=y=>P.ben[y], emp=y=>P.emp[y]*1000;
  const gdpY=y=>GOV.gdp[gy(y)];
  // descomposición: gasto/PIB = (pensionistas/ocupados) × (pensión media / PIB por ocupado)
  const y0=Math.max(2009,yrs.find(y=>ben(y)&&emp(y))), D=y=>({r:ben(y)/emp(y), g:(ex(y)/100*gdpY(y)*1e6/ben(y))/(gdpY(y)*1e6/emp(y))});
  const a=D(y0), b=D(Y);
  finding(B,"La pregunta",`<p>El gasto en pensiones ha pasado del ${pc(ex(yrs[0]))} del PIB en ${yrs[0]} al ${pc(ex(Y))} en ${Y}. En los próximos años se jubilan las generaciones del baby boom, nacidas entre finales de los cincuenta y los setenta. ¿Por qué ha crecido el gasto, y cuánto puede crecer?</p>`);
  finding(B,"El método: separar el gasto en sus piezas",`<p>El gasto en pensiones sobre el PIB se puede escribir como la multiplicación de dos cosas:</p>
    <ul class="defs"><li><b>Pensionistas por cada persona ocupada.</b> Cuántas pensiones sostiene cada trabajador. Depende de la demografía y de cuánta gente trabaja.</li>
    <li><b>Pensión media frente a lo que produce cada ocupado</b> (PIB por ocupado). Mide cuánto «pesa» cada pensión. Depende de las carreras de cotización y de las reglas.</li></ul>
    <p>Separarlas permite ver qué parte del aumento viene de que hay más pensionistas y qué parte de que cada pensión es relativamente más alta.</p>`);
  const s3=finding(B,"Lo que dicen los datos",`<p>Entre ${y0} y ${Y}, los pensionistas por cada ocupado pasaron de ${nf2.format(a.r)} a ${nf2.format(b.r)} (${b.r>a.r?"más":"menos"} pensionistas por trabajador), y el peso de cada pensión frente al PIB por ocupado pasó de ${pc(a.g*100)} a ${pc(b.g*100)}. ${Math.abs(b.g/a.g-1)>Math.abs(b.r/a.r-1)?"El peso de cada pensión ha empujado más que el número de pensionistas: quienes se jubilan ahora tienen carreras más largas y salarios más altos que quienes fallecen.":"El número de pensionistas por trabajador ha empujado más que el peso de cada pensión."}</p>`);
  const ys=yrs.filter(y=>y>=y0&&ben(y)&&emp(y)), g2=add(s3,"div","cols2");
  lineChart(g2,{title:"Pensionistas por cada ocupado",source:"Pensionistas: personas que cobran alguna pensión. Ocupados de 20 a 64 años (EPA). Fuente: Eurostat.",series:[{n:"España",v:ys.map(y=>D(y).r),c:"--rust",main:true}],years:ys,xticks:[ys[0],ys[Math.floor(ys.length/2)],ys[ys.length-1]],fmt:v=>nf2.format(v),tickFmt:v=>nf2.format(v)});
  lineChart(g2,{title:"Pensión media frente al PIB por ocupado",source:"Gasto en pensiones por pensionista, dividido entre el PIB por ocupado. Fuente: Eurostat.",series:[{n:"España",v:ys.map(y=>D(y).g*100),c:"--slate",main:true}],years:ys,xticks:[ys[0],ys[Math.floor(ys.length/2)],ys[ys.length-1]],fmt:pc,tickFmt:v=>nf0.format(v)+"%"});
  // demografía
  const dy=[...new Set([...Object.keys(P.olddep),...Object.keys(P.proj)])].map(Number).sort().filter(y=>y>=1995&&y<=2070);
  const s4=finding(B,`Por cada 100 personas en edad de trabajar habrá ${nf0.format(P.proj[2050])} mayores de 65 en 2050, frente a ${nf0.format(P.olddep[2025]??P.olddep[2024])} hoy`,
    `<p>Es la tasa de dependencia: mayores de 65 por cada 100 personas de 15 a 64 años. Según las proyecciones de Eurostat, en España subirá más deprisa que en la media de la UE y la superará hacia 2040. Las proyecciones suponen una llegada de inmigrantes y una natalidad concretas: si cambian, cambia la cifra.</p>`);
  lineChart(s4,{title:"Mayores de 65 por cada 100 personas de 15 a 64",source:"Hasta 2025, datos; después, proyección base de Eurostat (EUROPOP2023).",series:[{n:"España",v:dy.map(y=>dep(y)),c:"--rust",main:true},{n:"UE-27",v:dy.map(y=>P.olddepEU[y]??P.projEU[y]),c:"--slate"}],years:dy,xticks:[1995,2025,2050,2070],fmt:v=>nf1.format(v),height:280});
  // calculadora
  const s5=finding(B,"Calcula tú: ¿cuánto gastaríamos en 2050?",`<p>Una cuenta sencilla: si todo lo demás se quedara igual, el gasto crecería en la misma proporción que la tasa de dependencia, del ${nf0.format(P.olddep[2025]??P.olddep[2024])} al ${nf0.format(P.proj[2050])}. Mueve los mandos para ver qué compensaría ese aumento. No es una previsión: sirve para ver qué palancas importan y cuánto.</p>`);
  const calc=add(s5,"div","calc");
  const d0=P.olddep[2025]??P.olddep[2024], d1=P.proj[2050];
  const draw=()=>{ const base=ex(Y)*d1/d0, e=1+PSC.emp/100, bb=1+PSC.ben/100, c=1-PSC.cov/100, g=ex(Y)*(d1/d0)*c*bb/e;
    calc.querySelector("#cres").innerHTML=`<div class="big">${pc(g)} <span class="muted" style="font-size:16px;font-weight:400">del PIB en 2050</span></div><p>Hoy: ${pc(ex(Y))}. Sin cambios en nada más que la demografía: ${pc(base)}.</p><p class="muted" style="font-size:13.5px">${g>ex(Y)+1?`Haría falta encontrar ${nf1.format(g-ex(Y))} puntos de PIB más que hoy: con más ingresos, menos gasto en otras cosas o más deuda.`:"El gasto quedaría parecido al de hoy."}</p>`;
    calc.querySelectorAll("output").forEach(o=>o.textContent=(PSC[o.dataset.k]>0?"+":"")+PSC[o.dataset.k]+NB+"%"); };
  calc.innerHTML=`<div class="ctl">
    <label>Más gente trabajando (ocupados por cada persona en edad de trabajar) <output data-k="emp"></output><input type="range" min="0" max="30" step="1" value="${PSC.emp}" data-k="emp"><small>España tiene una tasa de empleo de las más bajas de la UE: acercarse a la media supondría más de un +10 %.</small></label>
    <label>Pensión media frente a lo que produce cada ocupado <output data-k="ben"></output><input type="range" min="-30" max="10" step="1" value="${PSC.ben}" data-k="ben"><small>Negativo: las pensiones crecen menos que la productividad (por ejemplo, si se revalorizan solo con el IPC y los salarios crecen más).</small></label>
    <label>Menos pensionistas por cada mayor (jubilación más tardía) <output data-k="cov"></output><input type="range" min="0" max="20" step="1" value="${PSC.cov}" data-k="cov"><small>Retrasar la jubilación efectiva unos dos años reduce aproximadamente un 10 % los pensionistas.</small></label>
  </div><div id="cres" class="res"></div>`;
  calc.querySelectorAll("input").forEach(i=>i.addEventListener("input",()=>{ PSC[i.dataset.k]=+i.value; draw(); })); draw();
  // cotizaciones
  const cot=GOV.main.D61REC.pib[gy(Y)];
  finding(B,"Qué se puede concluir y qué no",`<ul class="defs">
    <li><b>El gasto ha crecido sobre todo porque cada pensión pesa más,</b> no solo porque haya más pensionistas: las nuevas pensiones son más altas que las que desaparecen.</li>
    <li><b>Lo más difícil está por venir:</b> la proporción de mayores casi se duplicará hasta 2050. Sin cambios, el gasto subiría a niveles nunca vistos en España.</li>
    <li><b>Hay palancas que compensan:</b> más empleo, jubilación más tardía, inmigración y la forma de actualizar las pensiones. Cada una tiene costes y la calculadora solo muestra su tamaño.</li>
    <li><b>Las cotizaciones sociales no son solo para pensiones:</b> en ${Y} supusieron el ${pc(cot)} del PIB, pero también financian paro, bajas y otras prestaciones. La parte que no cubren sale de los impuestos o de la deuda.</li>
    <li><b>Es una cuenta simplificada.</b> Las previsiones oficiales (Comisión Europea, AIReF) usan modelos mucho más completos y llegan a cifras distintas según sus supuestos.</li></ul>
    <p style="margin-top:10px"><a class="exlink" href="/temas/gasto/">Ver en qué se gasta todo el dinero público →</a></p>`);
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
  const mx=max||d3.max(rows,r=>Math.abs(r[0]))||1, bh=(h-(rows.length-1)*3)/rows.length;
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">${rows.map(([v,c],i)=>`<rect x="0" y="${(i*(bh+3)).toFixed(1)}" width="${Math.max(2,Math.abs(v)/mx*w).toFixed(1)}" height="${bh.toFixed(1)}" style="fill:var(${c})"/>`).join("")}</svg>`;
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
    <a class="ci-path lab" href="/laboratorio/"><div class="img">${pathImg("lab")}</div><div class="tx"><span class="kk">Investigar</span><h3>Laboratorio</h3><p>Un lienzo en blanco para hacer tus propios gráficos, cruzar datos y comprobar si algo es causa o casualidad.</p><span class="gol">Abrir el laboratorio →</span></div></a>
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
  document.title="Tu municipio · Indicio";
  view.innerHTML=`<section class="ci-hero" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr)">
    <div><span class="kk">Tu municipio</span><h1>Busca tu municipio y míralo de un vistazo</h1>
      <p class="dek">Sus cifras clave frente a España, cómo ha cambiado desde 2015, en qué destaca y a qué municipios se parece. Con todo el detalle plegado por si quieres más.</p>
      ${bigSearchHTML("q2","Escribe tu municipio…")}${exampleChips()}
      <p style="margin-top:18px;font-size:15px"><a href="#comparar">O compara dos municipios lado a lado</a></p></div>
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
const tIll=id=>`<img src="/illus/${id}.svg" alt="" width="320" height="200" loading="lazy" decoding="async">`;
const TOPIC_IDS=["riqueza","vivienda","poblacion","trabajo","gasto","voto"];
const TMIN={riqueza:[6,6],vivienda:[7,7],poblacion:[5,5],trabajo:[6,6],gasto:[5,6],voto:[5,4]};

async function renderTemas(){
  document.title="Temas · Indicio";
  view.innerHTML=pageHead("Seis preguntas sobre España","Cada tema responde a una pregunta con unas pocas ideas clave, cada una con su gráfico. Léelo en cinco minutos o profundiza en el detalle.")+
    `<div class="g3" style="margin-top:6px">${TOPIC_IDS.map(id=>{ const T=TOPICS[id]; return `<a class="tcard" href="/temas/${id}/"><div class="img">${tIll(id)}</div><div class="tp"><span class="kk">${T.l}</span><h3>${T.q}</h3><div class="n" data-k="${id}">…</div><div class="s" data-s="${id}"></div></div><div class="ft"><span>${TMIN[id][0]} ideas · ${TMIN[id][1]} min</span><span class="gol">Leer →</span></div></a>`; }).join("")}</div>
    <section class="ci-band"><h2>¿Prefieres buscar tu propia respuesta?</h2><p style="color:var(--ink-2);max-width:680px">En el laboratorio puedes elegir cualquier dato de los temas, verlo en un mapa, ordenarlo, cruzarlo con otro y comprobar si una relación podría ser causa.</p><p style="margin-top:10px"><a class="gol" href="/laboratorio/">Abrir el laboratorio →</a></p></section>${methodNote()}`;
  for(const id of TOPIC_IDS){ TOPICS[id].key().then(([n,s])=>{ const a=view.querySelector(`[data-k="${id}"]`), b=view.querySelector(`[data-s="${id}"]`); if(a) a.innerHTML=n; if(b) b.innerHTML=s; }).catch(()=>{}); }
}

// lo esencial de cada tema: [cifra, título, minigráfico, frase]
async function essentials(id){
  const es=REFS.es, ce=REFS.census.es, G=subidas(), ipcG=REFS.ipc[2024]/REFS.ipc[2015];
  if(id==="riqueza"){ const R=await loadRenta(); const cc=R.ccaa.filter(c=>!/Ceuta|Melilla/.test(c.n)), t=cc[0], b=cc[cc.length-1], ri=es.net_income_pc, gr=(lastV(ri)/ri[0]-1)*100, real=((1+gr/100)/ipcG-1)*100, pov=lastV(es.poverty);
    return [[`×${nf1.format(t.renta/b.renta)}`,`${t.n} frente a ${b.n}`,miniBars(cc.map((c,i)=>[c.renta,i===0||i===cc.length-1?"--rust":"--rule-2"]),{h:44}),"renta neta por persona entre la comunidad más rica y la más pobre"],
      [eur(R.median),"La renta de la mitad","","la mitad de la población vive en barrios con menos renta que esto, por persona y año"],
      [pc(pov),"En riesgo de pobreza",miniTen(Math.round(pov/10)),"ingresos por debajo del 60 % de la mediana"],
      [sgn(real),"Renta desde 2015, sin inflación",miniLines(deflate(ri),ri,{h:40}),`en euros de cada año, ${sgn(gr)}; la línea gruesa descuenta la subida de precios`]]; }
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
  let tip=null; const hide=()=>{ if(tip){ tip.remove(); tip=null; } };
  root.querySelectorAll(".gloss").forEach(g=>{ const show=()=>{ hide(); tip=el("div","gtip",`<b>${esc(cap(g.dataset.g))}:</b> ${esc(GLOSS[g.dataset.g])}`); document.body.appendChild(tip); const r=g.getBoundingClientRect(); tip.style.left=Math.max(8,Math.min(window.innerWidth-tip.offsetWidth-8,r.left+window.scrollX))+"px"; tip.style.top=(r.bottom+window.scrollY+6)+"px"; };
    g.addEventListener("mouseenter",show); g.addEventListener("focus",show); g.addEventListener("mouseleave",hide); g.addEventListener("blur",hide); g.addEventListener("click",e=>{ e.stopPropagation(); tip?hide():show(); }); });
  document.addEventListener("click",hide,{once:true});
}
async function topicDecorate(id){
  const T=TOPICS[id]; if(!T) return; const ph=view.querySelector(".phead"); if(!ph) return;
  document.title=T.l+" · Indicio";
  const body=view.querySelector("#body")||view;
  const hs=[...body.querySelectorAll(":scope > .finding > h2, :scope > section.finding > h2")];
  const words=[...view.querySelectorAll(".txt, .phead .dek")].map(e=>e.textContent).join(" ").split(/\s+/).length+hs.length*40, mins=Math.max(2,Math.round(words/230));
  ph.insertAdjacentHTML("afterbegin",`<div class="tp-crumb"><a href="/preguntas/">Análisis</a> › <a href="/preguntas/?tema=${id}">${T.l}</a> · ${hs.length} ideas · ${mins} minutos de lectura</div>`);
  const ess=el("section","tp-ess",`<h2>Lo esencial</h2><div class="g4" id="essg"></div><div id="mestrip"></div><nav class="toc" aria-label="Ideas de este tema">${hs.map((h,i)=>{ h.id="idea-"+(i+1); let t=h.textContent; if(t.length>46) t=t.slice(0,44).replace(/\s+\S*$/,"")+"…"; return `<a href="#" data-i="${i+1}">${i+1} · ${esc(t)}</a>`; }).join("")}</nav>`);
  ph.after(ess);
  hs.forEach((h,i)=>{ h.insertAdjacentHTML("afterbegin",`<span class="muted" style="font-weight:600">${i+1} · </span>`); });
  ess.querySelectorAll(".toc a").forEach(a=>a.addEventListener("click",e=>{ e.preventDefault(); const h=document.getElementById("idea-"+a.dataset.i); if(h) window.scrollTo({top:h.getBoundingClientRect().top+window.scrollY-(document.getElementById("top").offsetHeight+16),behavior:"smooth"}); }));
  meStrip(id);
  // siguiente paso y cómo se mide
  const m=view.querySelector("footer.method");
  const ns=el("div","nextstep",`<span class="t"><b>Siguiente paso:</b> ${T.next[0]}</span><a class="gol" href="${T.next[1]()}">${T.next[1]().startsWith("/preguntasstudios")?"Leer el estudio":"Abrir en el laboratorio"} →</a>`);
  if(m){ m.before(ns); const d=el("details","howm"); d.innerHTML="<summary>Cómo se mide: fuentes y notas</summary>"; m.before(d); d.appendChild(m); } else view.appendChild(ns);
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
    ${r2?`<a class="gol" style="font-size:13.5px" href="#comparar-${r[F.code]}-${r2[F.code]}">⇄ Ver los dos lado a lado →</a>`:""}</div>`;
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
}
// =====================================================================
// LABORATORIO: un lienzo con pasos (gráfico, datos, municipios, comprobar)
// =====================================================================
const LBTYPES=[["mapa","Mapa",`<path d="M6 4h12l4 6 10 1 3 10H8z"/>`],["tabla","Ranking",`<rect x="4" y="3" width="30" height="5"/><rect x="4" y="10" width="22" height="5"/><rect x="4" y="17" width="14" height="5"/>`],
  ["cruce","Relación",`<circle cx="8" cy="20" r="2.2"/><circle cx="14" cy="16" r="2.2"/><circle cx="20" cy="14" r="2.2"/><circle cx="26" cy="9" r="2.2"/><circle cx="32" cy="6" r="2.2"/>`],["evolucion","Evolución",`<polyline points="3,22 12,17 20,18 28,9 37,4" style="fill:none;stroke-width:2.5"/>`],
  ["grupos","Grupos",`<rect x="5" y="10" width="6" height="13"/><rect x="14" y="5" width="6" height="18"/><rect x="23" y="13" width="6" height="10"/><rect x="32" y="8" width="6" height="15"/>`],["distribucion","Reparto",`<rect x="3" y="18" width="5" height="5"/><rect x="9" y="11" width="5" height="12"/><rect x="15" y="5" width="5" height="18"/><rect x="21" y="9" width="5" height="14"/><rect x="27" y="15" width="5" height="8"/><rect x="33" y="19" width="5" height="4"/>`]];
const LBDESC={mapa:"¿Dónde es más alto o más bajo? Un dato, municipio a municipio",tabla:"¿Quiénes encabezan la lista? Ordena y filtra por varios datos",cruce:"¿Van juntos dos datos? ¿Podría ser causa? Aquí se comprueba",evolucion:"¿Cómo ha cambiado? Cuánto ha crecido cada dato desde un año",grupos:"¿Qué zona destaca? Medias por comunidad, provincia, tamaño o nivel",distribucion:"¿Cómo se reparte? Un dato entre toda la población"};
const typeIcon=(svg,on)=>`<svg width="40" height="26" viewBox="0 0 40 26" aria-hidden="true" style="fill:var(--rule-2);stroke:var(--rule-2)">${svg}</svg>`;
const QUICK=["renta","paroReg","edad","alquiler","part","superiores","varPob","vt"];
const NBKEY="cifrario.cuaderno";
const nbGet=()=>{ try{ return JSON.parse(localStorage.getItem(NBKEY)||"[]"); }catch(e){ return []; } };
const nbSet=a=>{ try{ localStorage.setItem(NBKEY,JSON.stringify(a.slice(0,30))); return true; }catch(e){ return false; } };

function renderExplorar(h){
  const blank=/^explorar\/?$/.test(h);
  // /laboratorio/ abre directamente el lienzo con una relación de ejemplo; la guía de arriba propone por dónde empezar
  if(blank) EX={...EX,v:"cruce",d:["paroReg","renta"],t:"g1",p:"",c:[],o:null};
  exParse(h); if(myOk(lastMun)) EX.m=lastMun; exSync();
  document.title="Laboratorio · Indicio";
  view.innerHTML=LABNAV("explorar")+`<section class="lbguide" aria-label="Por dónde empezar"><div class="lbg-h"><b>¿Qué quieres averiguar?</b> Pulsa una pregunta para empezar, o monta tu propio gráfico en el panel: <span class="lbg-s"><i>1</i>gráfico <i>2</i>datos <i>3</i>municipios <i>4</i>comprobar</span></div><div class="chipsq lbg-q">${EXQ.map(([l],i)=>`<button type="button" data-gq="${i}">${l}</button>`).join("")}</div></section><div class="lb">
    <aside class="lb-side" id="exbar" aria-label="Elige qué dibujar"></aside>
    <div class="lb-canvas">
      <div class="lb-bar"><div style="min-width:0"><h2 id="lbtitle"></h2><div class="sub" id="lbsub"></div></div>
        <div class="acts ico"><button type="button" class="lbedit" id="lbedit" title="Cambiar gráfico" aria-label="Cambiar gráfico"><svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg></button><button type="button" id="lbsave" title="Guardar en mis análisis" aria-label="Guardar en mis análisis" aria-pressed="false"><svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg></button><button type="button" id="excopy" title="Copiar enlace para compartir" aria-label="Compartir"><svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true"><circle cx="6" cy="12" r="2.4"/><circle cx="18" cy="6" r="2.4"/><circle cx="18" cy="18" r="2.4"/><path d="M8.2 11l7.6-4M8.2 13l7.6 4"/></svg></button><button type="button" id="lbimg" title="Descargar imagen" aria-label="Descargar imagen"><svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg></button><button type="button" id="lbcsv" title="Descargar datos (CSV)" aria-label="Descargar datos en CSV"><svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="1.5"/><path d="M4 10h16M4 14.5h16M10 5v14"/></svg></button></div></div>
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
  view.querySelectorAll("[data-gq]").forEach(b=>b.addEventListener("click",()=>{ const [l,v,o]=EXQ[+b.dataset.gq]; EX={...EX,v,d:o.d||EX.d,t:o.t||"",p:"",c:o.c||[],gb:o.gb||EX.gb,o:o.o||null}; if(o.e){ ES_.sel=o.e.slice(); ES_.base=null; } navTo(exHash()); }));
  exBar(); exDraw(); nbDraw();
}

function nbDraw(){
  const box=document.getElementById("lbnb"); if(!box) return; const a=nbGet();
  box.innerHTML=`<b>Mis análisis guardados</b> · ${a.length?`${a.length} análisis`:"aún ninguno: pulsa la estrella de arriba para volver luego a este gráfico"} <span class="muted">(se guarda en este navegador)</span>${a.length?`<div class="list">${a.map((x,i)=>`<a href="${esc(x.h)}" title="${esc(x.t)}">${typeIcon((LBTYPES.find(t=>t[0]===x.v)||LBTYPES[0])[2])}<span>${esc(x.t)}</span><button type="button" data-i="${i}" aria-label="Quitar del cuaderno">×</button></a>`).join("")}</div>`:""}`;
  box.querySelectorAll("button[data-i]").forEach(b=>b.addEventListener("click",e=>{ e.preventDefault(); e.stopPropagation(); const a2=nbGet(); a2.splice(+b.dataset.i,1); nbSet(a2); nbDraw(); }));
}

// ---------- panel lateral ----------
const SLOTS={mapa:{n:1,l:["Color del mapa"]},cruce:{n:2,l:["Horizontal ↔","Vertical ↕"]},tabla:{n:6,l:i=>"Columna "+(i+1),add:"Añadir columna"},grupos:{n:4,l:i=>(EX.gb==="q"&&i===0?"Ordenar por":"Dato "+(i+1)),add:"Añadir dato"},distribucion:{n:1,l:["Dato"]}};
function exBar(){
  const bar=document.getElementById("exbar"); if(!bar) return;
  const opts=(sel,excl)=>{ let h="",g=null; CAT.forEach(c=>{ if(excl.includes(c.k)&&c.k!==sel) return; if(c.g!==g){ if(g) h+="</optgroup>"; h+=`<optgroup label="${c.g}">`; g=c.g; } h+=`<option value="${c.k}" ${c.k===sel?"selected":""}>${esc(c.l)}</option>`; }); return h+"</optgroup>"; };
  const S=SLOTS[EX.v], isEvo=EX.v==="evolucion";
  let slots="";
  if(S){ const used=Math.min(S.n,EX.d.length), lab=i=>typeof S.l==="function"?S.l(i):S.l[i];
    for(let i=0;i<used;i++) slots+=`<div class="slot full"><span class="nm" style="flex:1"><small>${lab(i)}</small><select data-i="${i}" aria-label="${lab(i)}">${opts(EX.d[i],EX.d)}</select></span>${(S.add&&used>1)||(EX.v==="cruce"&&false)?`<button type="button" data-x="${i}" aria-label="Quitar">×</button>`:""}</div>`;
    if(used<S.n&&(S.add||EX.v==="cruce")) slots+=`<div class="slot"><span class="nm" style="flex:1"><small>${S.add?S.add+" (opcional)":lab(used)}</small><select data-add="1" aria-label="${S.add||lab(used)}"><option value="">+ elige un dato</option>${opts("",EX.d)}</select></span></div>`; }
  const mname=EX.m&&BYCODE.has(EX.m)?BYCODE.get(EX.m)[F.name]:null;
  bar.innerHTML=`
    <div class="lb-step"><h4><i>1</i>Qué quieres saber</h4><div class="types">${LBTYPES.map(([k,l,svg])=>`<button type="button" data-v="${k}" aria-pressed="${k===EX.v}" title="${LBDESC[k]}">${typeIcon(svg)}${l}</button>`).join("")}</div><p class="hint">${LBDESC[EX.v]}.</p></div>
    <div class="lb-step"><h4><i>2</i>Qué datos</h4>${isEvo?`<p class="hint" style="margin:0 0 8px">Marca hasta seis series. Puedes verlas para España, una provincia o un municipio.</p><div id="lbevo"></div>`:slots+`<div class="chipsq" style="margin-top:4px">${QUICK.filter(k=>!EX.d.includes(k)).slice(0,6).map(k=>`<button type="button" data-q="${k}">${esc(labK(k))}</button>`).join("")}</div>`}</div>
    ${isEvo?"":`<div class="lb-step"><h4><i>3</i>Qué municipios</h4>
      <select class="sel" id="exprov" aria-label="Provincia">${`<option value="">Toda España</option>`+Object.keys(PROVS).sort((a,b)=>provShort(PROVS[a]).localeCompare(provShort(PROVS[b]),"es")).map(p=>`<option value="${p}" ${p===EX.p?"selected":""}>${esc(provShort(PROVS[p]))}</option>`).join("")}</select>
      <select class="sel" id="exsize" aria-label="Tamaño">${EXSIZES.map(([k,l])=>`<option value="${k}" ${k===EX.t?"selected":""}>${l}</option>`).join("")}</select>
      <div class="slot lbmy" id="lbmy" role="button" tabindex="0"><span class="nm" style="flex:1"><small>Destacados</small>${myOk(lastMun)?`📍 ${esc(myName(lastMun))}${myOk(MUN2)?` <span class="muted">y</span> ${esc(myName(MUN2))}`:""}`:`<span class="muted">Elige tu municipio</span>`}</span><span class="muted" style="font-size:12.5px">Cambiar</span></div>
      <p class="hint" id="excount"></p></div>`}
    <div class="lb-step"><h4><i>${isEvo?3:4}</i>Comprobar</h4>${EX.v==="cruce"?`
      <label class="chk"><input type="checkbox" id="exw" ${EX.w?"checked":""}> Contar según la población</label>
      <label class="chk"><input type="checkbox" id="exlx" ${EX.lx?"checked":""}> Escala logarítmica en horizontal</label>
      <button type="button" class="sel" id="exswap" style="margin-top:6px">⇄ Intercambiar ejes</button>
      <p class="hint">Debajo del gráfico: <b>¿causa o casualidad?</b> Marca qué igualar y mira cuánto queda de la relación.</p>`
      :`<p class="hint" style="margin:0">Para comprobar si un dato podría causar otro, pásalo a una relación.</p>${EX.d.length>=1&&!isEvo?`<button type="button" class="sel" id="exgo" style="margin-top:8px">Ver ${esc(labK(EX.d[0]))} en una relación</button>`:""}`}</div>`;
  bar.querySelectorAll(".types button").forEach(b=>b.addEventListener("click",()=>{ EX.v=b.dataset.v; if(EX.v==="cruce"&&EX.d.length<2) EX.d.push(EX.d[0]==="renta"?"paroReg":"renta"); navTo(exHash()); }));
  bar.querySelectorAll("select[data-i]").forEach(s=>s.addEventListener("change",()=>{ const i=+s.dataset.i, v=s.value, j=EX.d.indexOf(v); if(j>=0&&j!==i){ EX.d[j]=EX.d[i]; } EX.d[i]=v; exUpdate(); }));
  bar.querySelectorAll("select[data-add]").forEach(s=>s.addEventListener("change",()=>{ if(s.value){ EX.d=EX.d.filter(k=>k!==s.value); const n=Math.min(EX.d.length,(SLOTS[EX.v]||{n:6}).n); EX.d.splice(n,0,s.value); EX.d=EX.d.slice(0,6); exUpdate(); } }));
  bar.querySelectorAll("button[data-x]").forEach(b=>b.addEventListener("click",()=>{ if(EX.d.length<=1) return; EX.d.splice(+b.dataset.x,1); exUpdate(); }));
  bar.querySelectorAll("button[data-q]").forEach(b=>b.addEventListener("click",()=>{ const k=b.dataset.q; if(EX.v==="cruce"||EX.v==="tabla"||EX.v==="grupos"){ const S=SLOTS[EX.v]; if(EX.d.length<S.n&&EX.v!=="cruce") EX.d.push(k); else { const pos=EX.v==="cruce"?1:Math.min(EX.d.length,S.n)-1; EX.d=EX.d.filter(x=>x!==k); EX.d.splice(pos,1,k); } } else { EX.d=[k,...EX.d.filter(x=>x!==k)]; } EX.d=EX.d.slice(0,6); exUpdate(); }));
  const pv=document.getElementById("exprov"); if(pv) pv.addEventListener("change",e=>{ EX.p=e.target.value; exUpdate(); });
  const sz=document.getElementById("exsize"); if(sz) sz.addEventListener("change",e=>{ EX.t=e.target.value; exUpdate(); });
  const lm=document.getElementById("lbmy"); if(lm){ const op=e=>{ e.stopPropagation(); const b=document.getElementById("mymun"); myPop(); }; lm.addEventListener("click",op); lm.addEventListener("keydown",e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); op(e); } }); }
  if(document.getElementById("exm-q")) attachSearch(document.getElementById("exm-q"),document.getElementById("exm-r"),document.getElementById("exm-s"),r=>{ EX.m=r[F.code]; lastMun=EX.m; saveMun(); exUpdate(); });
  const w=document.getElementById("exw"); if(w) w.addEventListener("change",e=>{ EX.w=e.target.checked?1:0; exUpdate(); });
  const lx=document.getElementById("exlx"); if(lx) lx.addEventListener("change",e=>{ EX.lx=e.target.checked?1:0; exUpdate(); });
  const sw=document.getElementById("exswap"); if(sw) sw.addEventListener("click",()=>{ EX.d=[EX.d[1],EX.d[0],...EX.d.slice(2)]; exUpdate(); });
  const gg=document.getElementById("exgo"); if(gg) gg.addEventListener("click",()=>{ EX.v="cruce"; if(EX.d.length<2) EX.d.push(EX.d[0]==="renta"?"paroReg":"renta"); navTo(exHash()); });
  const ct=document.getElementById("excount"); if(ct&&EX.d[0]){ const n=exRows(EX.d[0]).length; ct.textContent=`${nf0.format(n)} municipios con datos de ${low(labK(EX.d[0]))}.`; }
}
function exUpdate(){ exSync(); exSetHash(); exBar(); exDraw(); }

// ---------- título, lectura y exportación ----------
function lbWhere(){ const sz=EXSIZES.find(s=>s[0]===EX.t); return [EX.p?provShort(PROVS[EX.p]):"Toda España",EX.t?sz[1]:""].filter(Boolean).join(" · "); }
function lbTitle(){
  const L=k=>labK(k), d=EX.d;
  if(EX.v==="mapa") return `${L(d[0])} · ${EX.p?provShort(PROVS[EX.p]):"España"}`;
  if(EX.v==="tabla") return `Municipios ordenados por ${low(L(EX.o&&EX.o!=="pop"&&d.includes(EX.o)?EX.o:d[0]))}`;
  if(EX.v==="cruce") return d.length>1?(relHeadline(d[0],d[1])||`${L(d[0])} y ${low(L(d[1]))}`):L(d[0]);
  if(EX.v==="evolucion") return "Cómo han cambiado: "+ES_.sel.map(k=>EVOSH[k]||k).join(", ");
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
  const k=EX.d[0], f=k?fmtK(k):null, rows=k?exRows(k):[], wm=rs=>{ const w=d3.sum(rs,r=>r[F.pop]||0); return w?d3.sum(rs,r=>r[F[k]]*(r[F.pop]||0))/w:null; };
  const mk=EX.m&&BYCODE.has(EX.m)?BYCODE.get(EX.m):null;
  const mtxt=mk&&k&&mk[F[k]]!=null?` <b>${esc(dispName(mk[F.name]))}</b> tiene ${f(mk[F[k]])}: más que el ${nf0.format(pctl(k,mk[F[k]]))}${NB}% de la población de España.`:"";
  if(EX.v==="mapa"){ const pool=rows.filter(r=>(r[F.pop]||0)>=(EX.t||EX.p?0:5000)).sort((a,b)=>b[F[k]]-a[F[k]]); if(!pool.length) return "No hay datos para esta selección.";
    const nm=a=>a.map(r=>esc(dispName(r[F.name]))).join(", ").replace(/, ([^,]*)$/," y $1");
    return `<b>Qué estás viendo:</b> ${low(labK(k))} en ${nf0.format(rows.length)} municipios. ${DARKER()} Los valores más altos${EX.t||EX.p?"":" entre los de más de 5.000 habitantes"} están en ${nm(pool.slice(0,3))}; los más bajos, en ${nm(pool.slice(-3).reverse())}. La media de la selección es ${f(wm(rows))} (España: ${f(esMean(k))}).${mtxt}`; }
  if(EX.v==="tabla"){ const o=EX.o&&EX.o!=="pop"&&EX.d.includes(EX.o)?EX.o:k, rs=exRows(o).sort((a,b)=>b[F[o]]-a[F[o]]); if(!rs.length) return ""; const fo=fmtK(o);
    return `<b>Qué estás viendo:</b> ${nf0.format(rs.length)} municipios ordenados por ${low(labK(o))}. Encabeza ${esc(dispName(rs[0][F.name]))} con ${fo(rs[0][F[o]])}; la media de la selección es ${fo(d3.sum(rs,r=>r[F[o]]*(r[F.pop]||0))/d3.sum(rs,r=>r[F.pop]||0))}. Pulsa una columna para ordenar por otro dato.`; }
  if(EX.v==="cruce"){ if(EX.d.length<2) return "Pon un segundo dato en el hueco vertical."; const [x,y]=EX.d, c=wcorr(pairPts(x,y,{weighted:!!EX.w,logX:!!EX.lx})); if(!c) return "No hay datos suficientes para medir la relación.";
    return `<b>Qué estás viendo:</b> cada círculo es un municipio, más grande cuanta más gente. La relación es <b>${strength(Math.abs(c.r))}</b> (r = ${rFmt(c.r)}). ${Math.abs(c.r)>=0.1?`Las diferencias de ${low(labK(x))} explican el ${nf0.format(c.r*c.r*100)}${NB}% de las de ${low(labK(y))}; el resto depende de otras cosas.`:""}`; }
  if(EX.v==="evolucion") return `<b>Qué estás viendo:</b> cada línea empieza en 100 en el año de referencia. Si llega a 130, ha crecido un 30${NB}%. Así se pueden comparar euros, personas y precios en la misma escala. Compara crecimientos, no niveles.`;
  if(EX.v==="grupos"){ const by={ccaa:r=>CCAA_OF[r[F.prov]],prov:r=>provShort(PROVS[r[F.prov]])}[EX.gb]; if(!by) return `<b>Qué estás viendo:</b> la media de cada dato en cada grupo, ponderada por población. La raya es la media de España.`;
    const g=d3.rollups(rows.filter(r=>r[F.pop]&&by(r)),wm,by).filter(x=>x[1]!=null).sort((a,b)=>b[1]-a[1]); if(!g.length) return "";
    return `<b>Qué estás viendo:</b> ${low(labK(k))} de media en cada ${EX.gb==="ccaa"?"comunidad":"provincia"}. La más alta es ${esc(g[0][0])} (${f(g[0][1])}) y la más baja, ${esc(g[g.length-1][0])} (${f(g[g.length-1][1])}). La raya es la media de España.`; }
  return `<b>Qué estás viendo:</b> cuánta ${EX.w?"población":"cantidad de municipios"} hay en cada nivel de ${low(labK(k))}. Una montaña estrecha quiere decir que casi todos se parecen; una ancha o con dos jorobas, que hay mucha diferencia.${mtxt}`;
}
function exDraw(){
  const out=document.getElementById("exout"); if(!out) return; out.innerHTML="";
  ["lbtest","lbcausal","lbmore"].forEach(i=>{ const e=document.getElementById(i); if(e) e.innerHTML=""; });
  const t=document.getElementById("lbtitle"); if(t) t.textContent=lbTitle();
  const sb=document.getElementById("lbsub"); if(sb) sb.textContent=EX.v==="evolucion"?"Series en el tiempo":(EX.v==="cruce"&&EX.d.length>1?labK(EX.d[0])+" ↔ "+low(labK(EX.d[1]))+" · ":"")+lbWhere()+([EX.m,MUN2].filter(c=>c&&BYCODE.has(c)).length?" · Destacado"+(myOk(MUN2)?"s":"")+": "+[EX.m,MUN2].filter(c=>c&&BYCODE.has(c)).map(c=>dispName(BYCODE.get(c)[F.name])).join(" y "):"");
  const sv=document.getElementById("lbsave"); if(sv){ const on=nbGet().some(x=>x.h===exHash()); sv.setAttribute("aria-pressed",String(on)); sv.title=on?"Guardado en mis análisis (pulsa para quitarlo)":"Guardar en mis análisis"; }
  const img=document.getElementById("lbimg"); if(img) img.hidden=!["mapa","cruce","evolucion","distribucion"].includes(EX.v);
  const csv=document.getElementById("lbcsv"); if(csv) csv.hidden=EX.v==="evolucion";
  try{ ({mapa:exMapa,tabla:exTabla,cruce:exCruce,evolucion:exEvo,grupos:exGrupos,distribucion:exDist})[EX.v](out); }catch(e){ console.error(e); out.innerHTML='<p class="loading">No se pudo dibujar este gráfico.</p>'; }
  const ec=document.getElementById("ectl"), slot=document.getElementById("lbevo"); if(ec&&slot){ slot.innerHTML=""; slot.appendChild(ec); }
  const say=document.getElementById("lbsay"); if(say){ try{ say.innerHTML=lbSay(); }catch(e){ say.innerHTML=""; } say.parentElement.hidden=!say.innerHTML; }
}
function exCSV(){
  const ks=EX.d, rows=exRows().filter(r=>ks.some(k=>r[F[k]]!=null));
  const lines=[["codigo_ine","municipio","provincia","habitantes",...ks.map(labK)].join(";")].concat(rows.map(r=>[r[F.code],'"'+r[F.name]+'"','"'+provShort(PROVS[r[F.prov]])+'"',r[F.pop],...ks.map(k=>r[F[k]]==null?"":String(r[F[k]]).replace(".",","))].join(";")));
  const blob=new Blob(["﻿"+lines.join("\n")],{type:"text/csv;charset=utf-8"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="cifrario.csv"; document.body.appendChild(a); a.click(); a.remove();
}
// imagen: el svg (y el canvas si lo hay) del gráfico, con el título encima
async function exPNG(){
  const out=document.getElementById("exout"); const svg=out.querySelector(".scat-wrap svg, .mapbox svg, #echart svg, figure svg"); if(!svg) return;
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
const CTAGS=[["lpop","🏘️","Entre pueblos de tamaño parecido"],["edad","👵","A igual edad"],["renta","💶","A igual renta"],["superiores","🎓","A igual nivel de estudios"],["prov","🗺️","Dentro de cada provincia"]];
const CNAME={lpop:"el tamaño",edad:"la edad",renta:"la renta",superiores:"los estudios",prov:"la provincia"};
let LBPOS=null, CZ=null;

function exCruce(out){
  if(EX.d.length<2){ out.innerHTML='<p class="loading">Pon un segundo dato en el hueco «Vertical» para cruzarlo con el primero.</p>'; return; }
  const [x,y]=EX.d; XS={...XS,x,y,minPop:0,prov:"",weighted:!!EX.w,logX:!!EX.lx};
  LBPOS=null;
  out.innerHTML=`<div id="ctlnote"></div><div id="cplot"></div>`;
  const tst=document.getElementById("lbtest"); if(tst) tst.innerHTML=`<section class="czc" aria-label="¿Causa o casualidad?"><div class="czc-l" id="czl"></div><div class="czc-r"><p class="czc-q" id="cztags"></p><div class="czbar" id="czbar"></div><p class="czc-s" id="czsum"></p><p class="czc-m"><button type="button" class="lnk" id="czmore" aria-expanded="false" aria-controls="lbcausal">Entender esta relación a fondo ↓</button> <span class="muted">las pruebas una a una, municipios gemelos y provincia a provincia</span></p></div></section>`;
  const cb=document.getElementById("lbcausal"); if(cb) cb.hidden=true;
  document.getElementById("czmore").addEventListener("click",e=>{ const c=document.getElementById("lbcausal"), o=c.hidden; c.hidden=!o; e.currentTarget.setAttribute("aria-expanded",String(o)); e.currentTarget.textContent=o?"Ocultar el detalle ↑":"Entender esta relación a fondo ↓"; if(o) c.scrollIntoView({behavior:"smooth",block:"start"}); });
  const more=document.getElementById("lbmore");
  more.innerHTML=`<details class="howm"><summary>Más números de esta relación: por grupos, los que se salen de la norma y todas las relaciones</summary><div class="xsay" id="csay"></div><section class="finding" id="cquint"></section><section class="finding" id="cout"></section><section class="finding" id="cmat"></section><section class="finding" id="ccav"></section></details>`;
  drawRel(); drawMatrix(); drawCaveats();
  const cm=document.getElementById("cmat");
  cm.querySelectorAll("td[data-a]").forEach(td=>{ const n=td.cloneNode(true); td.replaceWith(n); n.addEventListener("click",()=>{ EX.d=[n.dataset.a,n.dataset.b,...EX.d.filter(k=>k!==n.dataset.a&&k!==n.dataset.b)].slice(0,6); EX.c=[]; exUpdate(); window.scrollTo({top:0}); }); });
  cm.querySelectorAll(".pairs a").forEach(a=>{ const m=a.getAttribute("href").match(/^#relaciones-(\w+)-(\w+)$/); if(m) a.setAttribute("href",exHash({v:"cruce",d:[m[1],m[2]],c:[]})); });
  exCausal(x,y);
  czRefresh(false);
}

// ---------- etiquetas, gráfico «lo que queda» y barra ----------
function czRefresh(animate){
  if(!CZ) return; const {x,y,w,base}=CZ, cs=EX.c.filter(c=>c!==x&&c!==y&&CNAME[c]);
  const tg=document.getElementById("cztags"); if(!tg) return;
  // las etiquetas son casillas dentro de una frase
  tg.innerHTML=`Comparar solo municipios con igual ${CTAGS.filter(([k])=>k!==x&&k!==y).map(([k])=>`<label class="czk${k===CZ.suspect?" sus":""}"><input type="checkbox" data-k="${k}" ${cs.includes(k)?"checked":""}> ${({lpop:"tamaño",edad:"edad",renta:"renta",superiores:"estudios",prov:"provincia"})[k]}${k===CZ.suspect?' <small>· sospechoso</small>':""}</label>`).join(" ")}`;
  tg.querySelectorAll("input[data-k]").forEach(b=>b.addEventListener("change",()=>{ const k=b.dataset.k; EX.c=b.checked?[...EX.c.filter(c=>c!==k),k]:EX.c.filter(c=>c!==k); exSetHash(); czRefresh(true); }));
  // gráfico
  const note=document.getElementById("ctlnote"), plot=document.getElementById("cplot");
  const list=cs.map(c=>CNAME[c]).join(", ").replace(/, ([^,]*)$/," y $1");
  if(cs.length){ note.innerHTML=`<div class="ctlnote"><span>Ahora ves <b>lo que queda</b> al comparar entre municipios parecidos en ${list}: cada punto se ha movido para descontarlo.</span><button type="button" id="ctlreset">Volver al original</button></div>`;
    document.getElementById("ctlreset").addEventListener("click",()=>{ EX.c=[]; exSetHash(); czRefresh(true); });
    adjScatter(plot,x,y,cs,w,animate); }
  else { note.innerHTML=""; if(LBPOS){ LBPOS=null; drawRel(); } }
  // barra «queda» y frase
  const bar=document.getElementById("czbar"), sum=document.getElementById("czsum"), a0=Math.abs(base.r);
  if(!cs.length){ bar.innerHTML=`<span class="q">Queda</span><span class="trk"><span class="kp" style="width:100%"></span></span><span class="pc"><b>100${NB}%</b> de la relación · r = ${rFmt(base.r)}</span>`;
    sum.innerHTML=CZ.suspect?`Marca una casilla para descontar esa diferencia. Empieza por <b>${CZ.suspect==="prov"?"la provincia":CNAME[CZ.suspect]}</b>: es la que más cambia la relación.`:"Marca una casilla para descontar esa diferencia y ver cuánto queda de la relación."; return; }
  const pfin=partialR(x,y,cs,w), left=pfin&&Math.sign(pfin.r)===Math.sign(base.r)?Math.min(a0,Math.abs(pfin.r)):0, share=a0?left/a0:0;
  let prev=a0, top=null; cs.forEach((c,i)=>{ const p=partialR(x,y,cs.slice(0,i+1),w); const now=p?(Math.sign(p.r)===Math.sign(base.r)?Math.abs(p.r):0):prev; const lost=Math.max(0,prev-now); if(!top||lost>top.lost) top={c,lost}; prev=Math.min(prev,now); });
  bar.innerHTML=`<span class="q">Queda</span><span class="trk"><span class="kp" style="width:${Math.max(0,Math.min(100,share*100)).toFixed(1)}%"></span></span><span class="pc"><b>${nf0.format(share*100)}${NB}%</b> de la relación · r de ${rFmt(base.r)} a ${pfin?rFmt(pfin.r):"—"}</span>`;
  const verb=share<0.25?"casi desaparece":share<0.6?"se debilita mucho":share<0.85?"se debilita algo":"apenas cambia";
  sum.innerHTML=`Al comparar municipios con igual ${cs.map(c=>CNAME[c].replace(/^(el|la|los) /,"")).join(", ").replace(/, ([^,]*)$/," y $1")}, la relación <b>${verb}</b>${top&&top.lost/a0>=0.15?`: ${top.c==="prov"?"la provincia":CNAME[top.c]} es el <b>principal sospechoso</b>`:""}.`;
}
function adjScatter(box,x,y,cs,w,animate){
  const D=adjData(x,y,cs,w), D0=adjData(x,y,[],w); if(!D){ box.innerHTML='<p class="loading">No hay datos suficientes.</p>'; return; }
  const start=LBPOS||new Map(D0.rs.map((r,i)=>[r[F.code],[D0.X0[i],D0.Y0[i]]]));
  const pts=D.rs.map((r,i)=>({r,x1:D.X[i],y1:D.Y[i],x0:(start.get(r[F.code])||[D.X[i],D.Y[i]])[0],y0:(start.get(r[F.code])||[D.X[i],D.Y[i]])[1]}));
  const q=(a,p)=>d3.quantile(a.slice().sort(d3.ascending),p);
  const xs=pts.flatMap(p=>[p.x0,p.x1]), ys=pts.flatMap(p=>[p.y0,p.y1]);
  const W=Math.max(300,Math.round(box.clientWidth||800)), H=Math.round(Math.min(440,Math.max(260,W*0.54))), m={t:22,r:16,b:40,l:58};
  const X=d3.scaleLinear().domain([q(xs,.004),q(xs,.993)]).nice().range([m.l,W-m.r]).clamp(true), Y=d3.scaleLinear().domain([q(ys,.004),q(ys,.993)]).nice().range([H-m.b,m.t]).clamp(true);
  const fx=fmtK(x), fy=fmtK(y), short=(fm,v)=>fm(v).replace(/ (%|€)$/,"$1");
  box.innerHTML=`<figure><div class="scat-wrap"><canvas width="${W*2}" height="${H*2}" role="img" aria-label="${esc(labK(x))} frente a ${esc(labK(y))}, descontando ${esc(cs.map(c=>CNAME[c]).join(", "))}"></canvas><svg viewBox="0 0 ${W} ${H}"></svg></div><figcaption>Cada punto es un municipio, colocado según su valor «a igualdad de ${esc(cs.map(c=>CNAME[c]).join(", ").replace(/, ([^,]*)$/," y $1"))}»: lo que tendría si en eso fuera como la media. ${nf0.format(pts.length)} municipios.</figcaption></figure>`;
  const svg=d3.select(box).select("svg"), cv=box.querySelector("canvas"), ctx=cv.getContext("2d"); ctx.scale(2,2);
  svg.append("g").attr("class","grid").selectAll("line").data(Y.ticks(5)).join("line").attr("x1",m.l).attr("x2",W-m.r).attr("y1",Y).attr("y2",Y);
  svg.append("g").attr("class","axis").selectAll("text").data(Y.ticks(5)).join("text").attr("x",m.l-6).attr("y",v=>Y(v)+4).attr("text-anchor","end").text(v=>short(fy,v));
  svg.append("g").attr("class","axis").selectAll("text").data(X.ticks(W<500?4:6)).join("text").attr("x",X).attr("y",H-m.b+16).attr("text-anchor","middle").text(v=>short(fx,v));
  svg.append("text").attr("class","lab strong").attr("x",W-m.r).attr("y",H-4).attr("text-anchor","end").text(labK(x)+", a igualdad →");
  svg.append("text").attr("class","lab strong").attr("x",m.l-50).attr("y",m.t-10).attr("text-anchor","start").text("↑ "+labK(y)+", a igualdad");
  const c=D.c; const line=svg.append("line").attr("stroke",css("--ink")).attr("stroke-width",1.3).attr("stroke-dasharray","5 4").attr("opacity",0);
  if(c&&Math.abs(c.r)>=0.05){ const [a,b]=X.domain(); line.attr("x1",X(a)).attr("y1",Y(c.a+c.b*a)).attr("x2",X(b)).attr("y2",Y(c.a+c.b*b)); }
  const mxP=d3.max(pts,p=>p.r[F.pop]||1), Rr=d3.scaleSqrt().domain([0,mxP]).range([1.5,Math.max(4,Math.min(16,16*Math.sqrt(mxP/2e6)))]), base=css("--rust"), ink=css("--ink");
  const sorted=pts.slice().sort((a,b)=>(b.r[F.pop]||0)-(a.r[F.pop]||0));
  const paint=t=>{ ctx.clearRect(0,0,W,H); ctx.fillStyle=base; ctx.globalAlpha=.3;
    for(const p of sorted){ const px=p.x0+(p.x1-p.x0)*t, py=p.y0+(p.y1-p.y0)*t; ctx.beginPath(); ctx.arc(X(px),Y(py),Rr(p.r[F.pop]||1),0,7); ctx.fill(); }
    ctx.globalAlpha=1; for(const mc of [lastMun,MUN2].filter(Boolean)){ const mk=pts.find(p=>p.r[F.code]===mc); if(!mk) continue; const px=X(mk.x0+(mk.x1-mk.x0)*t), py=Y(mk.y0+(mk.y1-mk.y0)*t); ctx.beginPath(); ctx.arc(px,py,Math.max(5,Rr(mk.r[F.pop]||1)),0,7); ctx.lineWidth=2; ctx.strokeStyle=ink; ctx.stroke(); ctx.font="600 12.5px 'Libre Franklin', Arial, sans-serif"; ctx.fillStyle=ink; ctx.fillText(dispName(mk.r[F.name]),px+9,py-8); } };
  const reduce=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;
  if(animate&&!reduce){ const tm=d3.timer(el=>{ const t=Math.min(1,el/750); paint(d3.easeCubicInOut(t)); if(t>=1){ tm.stop(); line.transition().duration(300).attr("opacity",1); } }); }
  else { paint(1); line.attr("opacity",1); }
  LBPOS=new Map(pts.map(p=>[p.r[F.code],[p.x1,p.y1]]));
}

// ---------- gemelos: parejas casi iguales que solo se diferencian en x ----------
function twins(x,y,w,sign){
  const cs=["lpop","edad","renta"].filter(c=>c!==x&&c!==y);
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

const CZLEV=[["Probablemente hay otra explicación","La relación no supera las pruebas: lo más probable es que dependa de otra cosa."],["Pista débil","Supera alguna prueba, pero no las importantes. Conviene desconfiar."],["Pista interesante","Aguanta casi todas las pruebas. Merece la pena investigarla más."],["Pista sólida, pero no es una prueba","Aguanta todas las pruebas que podemos hacer con estos datos. Aun así, con datos de municipios no se puede demostrar una causa."]];
function exCausal(x,y){
  const box=document.getElementById("lbcausal"); if(!box) return;
  const w=!!EX.w, base=partialR(x,y,[],w); CZ=null; if(!base){ box.innerHTML=""; return; }
  const xl=low(labK(x)), yl=low(labK(y)), a0=Math.abs(base.r), sign=Math.sign(base.r);
  const holds=p=>p&&Math.abs(p.r)>=a0*0.5&&Math.sign(p.r)===sign;
  const how=p=>{ const a=Math.abs(p.r); if(Math.sign(p.r)!==sign&&a>=0.1) return "cambia de sentido"; if(a<0.1) return "casi desaparece"; if(a<a0*0.5) return "se debilita mucho"; if(a<a0*0.85) return "se debilita algo, pero sigue ahí"; if(a>a0*1.15) return "incluso se refuerza"; return "sigue igual"; };
  // principal sospechoso
  const cand=["lpop","edad","renta","superiores","prov"].filter(c=>c!==x&&c!==y).map(c=>({c,p:partialR(x,y,[c],w)})).filter(o=>o.p).map(o=>({...o,drop:a0-Math.abs(o.p.r)*(Math.sign(o.p.r)===sign?1:-1)})).sort((a,b)=>b.drop-a.drop);
  const top=cand[0];
  CZ={x,y,w,base,suspect:top&&top.drop>=a0*0.15?top.c:null};
  const czl=document.getElementById("czl");
  if(a0<0.1){ if(czl) czl.innerHTML=`<h3>¿Causa o casualidad?</h3><div class="dots" aria-hidden="true">${"<i></i>".repeat(5)}</div><em>Casi no hay relación</em><small>r = ${rFmt(base.r)}</small>`; box.innerHTML=`<div class="cz"><h3>A fondo</h3><p class="intro">Aquí no hay mucho que comprobar: entre ${xl} y ${yl} la relación es casi nula (r = ${rFmt(base.r)}). Saber uno no ayuda a adivinar el otro.</p><p style="margin-top:10px;font-size:14px"><a href="/laboratorio/metodo/">Cómo se buscan causas con datos públicos →</a></p></div>`; return; }
  const others=["lpop","edad","renta"].filter(c=>c!==x&&c!==y), pc=partialR(x,y,others,w), pp=partialR(x,y,["prov"],w);
  const cx=CHG[x], cy=CHG[y], cc=cx&&cy&&cx!==cy?wcorr(pairPts(cx,cy,{weighted:w})):null;
  const TW=twins(x,y,w,sign), BP=byProvince(x,y,w,sign), ST=steps(x,y,w);
  const T=[];
  T.push({k:"par",ok:holds(pc),na:!pc,t:"Entre municipios parecidos",d:pc?`Comparando municipios de ${others.map(c=>CNAME[c].replace(/^(el|la|los) /,"")).join(", ").replace(/, ([^,]*)$/," y $1")} parecidos, la relación ${how(pc)} (de ${rFmt(base.r)} a ${rFmt(pc.r)}).`:"No hay datos suficientes.",why:"Si dos cosas solo van juntas porque las dos dependen de una tercera, al comparar entre iguales la relación se esfuma."});
  const bpOk=BP?BP.filter(b=>b.ok).length:0;
  T.push({k:"prov",ok:holds(pp)&&(!BP||bpOk/BP.length>=0.5),na:!pp,t:"Dentro de cada provincia",d:(BP?`Se cumple en <b>${bpOk} de ${BP.length}</b> provincias. `:"")+(pp?`Comparando solo dentro de la misma provincia, la relación ${how(pp)} (${rFmt(pp.r)}).`:""),why:"Así se quita lo que es común a cada zona: el clima, las leyes autonómicas, la historia o la economía de la región.",extra:BP?`<div class="czmini" id="czprov"></div>`:""});
  if(cc) T.push({k:"chg",ok:Math.sign(cc.r)===sign&&Math.abs(cc.r)>=0.1,t:"También en los cambios",d:`Comparando cambios en vez de niveles (${low(labK(cx))} frente a ${low(labK(cy))}), la relación ${Math.sign(cc.r)===sign&&Math.abs(cc.r)>=0.1?"se mantiene":"desaparece"} (r = ${rFmt(cc.r)}).`,why:"Comparar cambios en vez de niveles quita todo lo que es fijo en cada lugar."});
  else T.push({k:"chg",na:true,t:"También en los cambios",d:"No tenemos series de cambio para estos dos datos, así que esta prueba no se puede hacer.",why:"Comparar cambios en vez de niveles quita todo lo que es fijo en cada lugar."});
  if(TW&&TW.pairs.length>=15) T.push({k:"tw",ok:TW.share>=0.6,t:"Municipios gemelos",d:`En <b>${nf0.format(TW.share*10)} de cada 10</b> parejas de gemelos (${nf0.format(TW.pairs.length)} parejas), el que tiene más ${xl} tiene ${sign>0?"más":"menos"} ${yl}.`,why:"Es la comparación más limpia: dos pueblos de la misma provincia casi iguales en todo menos en una cosa."});
  else T.push({k:"tw",na:true,t:"Municipios gemelos",d:"No hay suficientes parejas de gemelos para esta selección.",why:"Es la comparación más limpia: dos pueblos casi iguales en todo menos en una cosa."});
  if(ST&&ST.length===5){ const up=d3.range(4).filter(i=>(ST[i+1]-ST[i])*sign>0).length; T.push({k:"st",ok:up>=3,t:"Sube de forma ordenada",d:`De un grupo al siguiente, ${yl} va en la dirección esperada en <b>${up} de 4</b> escalones.`,why:"Si «cuanto más, más» se cumple de forma ordenada, y no solo en los extremos, la pista es más creíble.",extra:miniBars(ST.map((v,i)=>[v,i===0||i===4?"--rust":"--stone"]),{h:34})}); }
  const done=T.filter(t=>!t.na), passed=done.filter(t=>t.ok).length, frac=done.length?passed/done.length:0;
  const lev=frac<0.3?0:frac<0.55?1:frac<0.85?2:3;
  const sus=!CZ.suspect?`Ninguno de los sospechosos habituales (tamaño, edad, renta, estudios o provincia) cambia mucho la relación por sí solo.`
    :top.c==="prov"?`<b>La provincia.</b> Comparando solo municipios de la misma provincia, la relación pasa de ${rFmt(base.r)} a ${rFmt(top.p.r)}. Buena parte es la diferencia entre unas zonas de España y otras.`
    :`<b>${cap(CNAME[top.c])}.</b> Comparando municipios con ${CNAME[top.c].replace(/^(el|la|los) /,"")} parecid${/^la /.test(CNAME[top.c])?"a":/^los /.test(CNAME[top.c])?"os":"o"}, la relación pasa de ${rFmt(base.r)} a ${rFmt(top.p.r)}. Puede que ${CNAME[top.c]} influya a la vez en ${xl} y en ${yl}.`;
  const em=t=>t.na?"⚪":t.ok?"✅":"❌";
  const ex=!TW||!TW.pairs.length?[]:(()=>{ const nOk=Math.round(TW.share*4), a=TW.pairs.filter(p=>p.agree).slice(0,nOk), b=TW.pairs.filter(p=>!p.agree).slice(0,4-nOk); return [...a,...b].slice(0,4); })();
  const fx=fmtK(x), fy=fmtK(y);
  // veredicto arriba; una línea por prueba; el porqué, los gemelos y el mapa, plegados
  const twinsH=ex.length?`<div class="twins"><h4>Algunas parejas de gemelos</h4><p class="muted">Misma provincia y parecidos en ${TW.cs.map(c=>CNAME[c].replace(/^(el|la|los) /,"")).join(", ").replace(/, ([^,]*)$/," y $1")}, pero que se diferencian en ${xl}.</p><ul>${ex.map(p=>`<li><span class="${p.agree?"ok":"ko"}" aria-hidden="true">${p.agree?"✓":"✗"}</span><span><a href="#m${p.hi[F.code]}">${esc(dispName(p.hi[F.name]))}</a> <small>${fx(p.hi[F[x]])} · ${fy(p.hi[F[y]])}</small></span><span class="vs">frente a</span><span><a href="#m${p.lo[F.code]}">${esc(dispName(p.lo[F.name]))}</a> <small>${fx(p.lo[F[x]])} · ${fy(p.lo[F[y]])}</small></span><a class="gol" href="#comparar-${p.hi[F.code]}-${p.lo[F.code]}">Comparar →</a></li>`).join("")}</ul></div>`:"";
  if(czl) czl.innerHTML=`<h3>¿Causa o casualidad?</h3><div class="dots l${lev}" role="img" aria-label="${passed} de ${done.length} pruebas superadas">${done.map((t,i)=>`<i class="${i<passed?"on":""}"></i>`).join("")}</div><em>${CZLEV[lev][0]}</em><small>Supera ${passed} de ${done.length} pruebas</small>`;
  const cx2=CHG[x], cy2=CHG[y];
  box.innerHTML=`<div class="cz"><h3>A fondo: las pruebas una a una</h3>
    <div class="meter" role="img" aria-label="Nivel: ${CZLEV[lev][0]}"><div class="track">${[0,1,2,3].map(i=>`<span class="${i<=lev?"on l"+lev:""}"></span>`).join("")}</div><div class="labs">${CZLEV.map((l,i)=>i===lev?`<b>${l[0]}</b>`:`<span>${l[0]}</span>`).join("")}</div></div>
    <div class="verdict">${CZLEV[lev][0]}<small>${CZLEV[lev][1]}</small></div>
    <p class="czn">Supera <b>${passed} de ${done.length}</b> pruebas${done.length<T.length?` <span class="muted">(${T.length-done.length} no se pueden hacer con estos datos)</span>`:""}:</p>
    <ul class="tests">${T.map(t=>`<li class="${t.na?"na":t.ok?"ok":"ko"}"><span class="em" aria-hidden="true">${em(t)}</span><span><b>${t.t}.</b> ${t.d}</span></li>`).join("")}</ul>
    <div class="suspect"><span class="tag">Principal sospechoso</span>${sus}</div>
    <p class="czact">Más pruebas: ${cx2&&cy2&&cx2!==cy2?`<button type="button" class="ctag" data-a="chg">📈 Mirar los cambios, no los niveles</button> `:""}<button type="button" class="ctag" data-a="big" aria-pressed="${EX.t==="g10"}">Solo municipios de más de 10.000 hab.</button></p>
    <p class="reverse">↺ <b>¿Y si fuera al revés?</b> Quizá no es ${xl} lo que mueve ${yl}, sino ${yl} lo que atrae ${xl}. Con datos de un solo momento no se puede saber; ayuda pensar qué ocurrió antes.</p>
    <details class="czmore"><summary>Por qué importa cada prueba${ex.length?", parejas de gemelos":""}${BP?" y mapa por provincias":""}</summary>
      <dl class="czwhy">${T.map(t=>`<dt>${em(t)} ${t.t}</dt><dd>${t.why}${t.extra&&!t.na?t.extra:""}</dd>`).join("")}</dl>${twinsH}</details>
    <p style="margin-top:14px;font-size:14px"><a href="/laboratorio/metodo/">Guía: cómo buscar causas →</a> · <a href="/preguntas/">Mira cómo se hace en un análisis de verdad →</a></p></div>`;
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
  const rows=rowsAll().filter(r=>r[F.renta15]!=null&&r[F.renta]!=null&&(r[F.pop]||0)>=1000);
  const q=(k,p)=>wq(rows,r=>r[F[k]],p);
  const r90a=q("renta15",.9)/q("renta15",.1), r90b=q("renta",.9)/q("renta",.1);
  const c=withEXF({prov:"",min:1000,max:Infinity},()=>wcorr(pairPts("renta15","rentaVar",{weighted:true})));
  const cp=withEXF({prov:"",min:1000,max:Infinity},()=>partialR("renta15","rentaVar",["prov"],true));
  // grupos por renta de partida
  const s=rows.slice().sort((a,b)=>a[F.renta15]-b[F.renta15]), tot=d3.sum(s,r=>r[F.pop]); let acc=0; const G=[[],[],[],[],[]];
  s.forEach(r=>{ G[Math.min(4,Math.floor((acc+r[F.pop]/2)/tot*5))].push(r); acc+=r[F.pop]; });
  const gv=G.map(g=>d3.sum(g,r=>r[F.rentaVar]*r[F.pop])/d3.sum(g,r=>r[F.pop]));
  // provincias: dispersión por año
  const PR=Object.keys(REFS.prov).filter(p=>REFS.prov[p].net_income_pc&&REFS.prov[p].pad);
  const cv=YEARS.map((y,i)=>{ const v=PR.map(p=>[REFS.prov[p].net_income_pc[i],REFS.prov[p].pad[REFS.prov[p].pad.length-1]]).filter(a=>a[0]); const W=d3.sum(v,a=>a[1]), m=d3.sum(v,a=>a[0]*a[1])/W; return Math.sqrt(d3.sum(v,a=>a[1]*(a[0]-m)**2)/W)/m*100; });
  finding(B,"La pregunta",`<p>Entre 2015 y 2024 la renta por persona subió en casi toda España. Pero no es lo mismo que suba un 30${NB}% donde se ingresaban 9.000${NB}€ que donde se ingresaban 18.000${NB}€. ¿Han crecido más los municipios que partían de abajo? Si es así, la distancia entre ricos y pobres se estrecha: los economistas lo llaman <b>convergencia</b>.</p>`);
  finding(B,"El método: dos preguntas distintas",`<ul class="defs"><li><b>¿Crecen más los de abajo?</b> Se compara la renta de cada municipio en 2015 con cuánto ha subido hasta 2024. Si la nube de puntos baja hacia la derecha, los pobres crecen más deprisa.</li>
    <li><b>¿Se estrecha la distancia?</b> Se mide cuántas veces más ingresa el municipio del 10${NB}% más rico que el del 10${NB}% más pobre, en 2015 y en 2024. Lo primero no garantiza lo segundo: algunos de abajo pueden adelantar a otros sin que el reparto cambie.</li></ul>`);
  const s3=finding(B,"Renta de partida y subida",`<p>Cada punto es un municipio de 1.000 habitantes o más. ${c?corrSentence(c.r,"renta en 2015","subida de la renta"):""} ${c?`(r = ${rFmt(c.r)}).`:""}</p>`);
  scatter(s3,{x:"renta15",y:"rentaVar",minPop:1000,title:"Renta por persona en 2015 y subida hasta 2024",source:"Fuente: INE, Atlas de Distribución de Renta de los Hogares.",hideSay:true});
  const f=fig(s3,{title:"Subida de la renta 2015–2024, según la renta de partida",source:"Municipios repartidos en cinco grupos con la misma población, de menos a más renta en 2015. Medias ponderadas por población."});
  f.body.dataset.w="1"; hbars(f.body,["20 % más pobre en 2015","Segundo 20 %","20 % central","Cuarto 20 %","20 % más rico en 2015"].map((l,i)=>({l,v:gv[i]})),{fmt:sgn,color:"--rust",min:0}); f.body.querySelectorAll(".hb").forEach(h=>h.style.gridTemplateColumns="minmax(150px,210px) minmax(0,1fr) 70px");
  const s4=finding(B,"¿Se estrecha la distancia?",`<p>En 2015, el municipio que marca el 10${NB}% más rico ingresaba <b>${nf1.format(r90a)} veces</b> lo que el que marca el 10${NB}% más pobre. En 2024, <b>${nf1.format(r90b)} veces</b>. ${r90b<r90a-0.03?"La distancia se ha estrechado un poco.":r90b>r90a+0.03?"La distancia se ha agrandado.":"La distancia apenas ha cambiado."} Entre provincias pasa lo mismo: la dispersión de la renta ${cv[cv.length-1]<cv[0]-0.5?"ha bajado":cv[cv.length-1]>cv[0]+0.5?"ha subido":"casi no ha cambiado"} desde 2015.</p>`);
  lineChart(s4,{title:"Diferencias de renta entre provincias",sub:"Coeficiente de variación: cuánto se alejan de la media, en % de la media",source:"Media ponderada por población. Fuente: INE, Atlas de Renta.",series:[{n:"Dispersión",v:cv,c:"--slate",main:true}],fmt:v=>nf1.format(v)+NB+"%",tickFmt:v=>nf0.format(v)+"%",height:220});
  finding(B,"Qué se puede concluir y qué no",`<p class="big" style="font-size:19px;font-weight:600;max-width:760px">${gv[0]>gv[4]+2?`Sí hay convergencia: los municipios que partían de abajo subieron un ${nf0.format(gv[0])}${NB}% y los de arriba un ${nf0.format(gv[4])}${NB}%.`:gv[0]<gv[4]-2?`No: los municipios que partían de arriba subieron más (${nf0.format(gv[4])}${NB}% frente a ${nf0.format(gv[0])}${NB}%).`:`Los de abajo y los de arriba subieron parecido (${nf0.format(gv[0])}${NB}% y ${nf0.format(gv[4])}${NB}%).`}${cp?` Dentro de cada provincia la relación es ${Math.abs(cp.r)<0.1?"casi nula":`de r = ${rFmt(cp.r)}`}.`:""}</p>
    <ul class="defs"><li><b>Ojo con la regresión a la media.</b> Un municipio que tuvo un año 2015 anormalmente malo «sube» después aunque nada cambie. En los pueblos pequeños pasa mucho; por eso aquí solo se usan los de 1.000 habitantes o más.</li>
    <li><b>La renta de un municipio cambia también porque cambia quién vive en él.</b> Si se van los jóvenes y quedan los pensionistas, la renta por persona puede subir sin que nadie gane más.</li>
    <li><b>El salario mínimo y las pensiones</b> subieron mucho en estos años y pesan más en los municipios de renta baja: son buenos candidatos a explicar la convergencia, pero aquí no se pueden separar.</li></ul>
    <p style="margin-top:10px">${exLink("cruce",{d:["renta15","rentaVar"],t:"g1",c:[]},"Ponlo a prueba en el laboratorio")}</p>`);
}

// ---------- pandemia y turismo ----------
function studyCovid(B){
  const P=Object.keys(REFS.paro.prov).filter(p=>REFS.prov[p]&&REFS.prov[p].vtp&&REFS.paro.prov[p].paro&&!["51","52"].includes(p));
  const vt=p=>REFS.prov[p].vtp[REFS.prov[p].vtp.length-1], PY=REFS.paroYears, i19=PY.indexOf(2019), i20=PY.indexOf(2020), i23=PY.indexOf(2023);
  const ranked=P.slice().sort((a,b)=>vt(b)-vt(a)), TUR=ranked.slice(0,10), REST=ranked.slice(10);
  const sumP=(g,i)=>d3.sum(g,p=>REFS.paro.prov[p].paro[i]);
  const idx=g=>PY.map((y,i)=>sumP(g,i)/sumP(g,i19)*100);
  const jT=(sumP(TUR,i20)/sumP(TUR,i19)-1)*100, jR=(sumP(REST,i20)/sumP(REST,i19)-1)*100;
  const rT=(sumP(TUR,i23)/sumP(TUR,i19)-1)*100, rR=(sumP(REST,i23)/sumP(REST,i19)-1)*100;
  const pw=p=>{ const a=REFS.prov[p].pad; return a[a.length-1]; }, y19=YEARS.indexOf(2019), y20=YEARS.indexOf(2020);
  const rch=g=>d3.sum(g,p=>(REFS.prov[p].net_income_pc[y20]/REFS.prov[p].net_income_pc[y19]-1)*100*pw(p))/d3.sum(g,pw);
  const iT=rch(TUR), iR=rch(REST);
  const jump=p=>(REFS.paro.prov[p].paro[i20]/REFS.paro.prov[p].paro[i19]-1)*100;
  const c=wcorr(P.map(p=>({x:vt(p),y:jump(p),w:pw(p)})));
  const nm=p=>provShort(PROVS[p]);
  finding(B,"La pregunta",`<p>En marzo de 2020 se cerraron fronteras, hoteles y restaurantes. Las zonas que viven del turismo deberían haberlo notado más. ¿Fue así? ¿Y se han recuperado?</p><p>Para saberlo no basta con mirar el paro de las zonas turísticas en 2020: el paro subió en toda España. Hay que compararlas con el resto y comprobar que antes de la pandemia iban parejas.</p>`);
  finding(B,"El método: antes y después, con grupo de comparación",`<p>Separamos las <b>10 provincias más turísticas</b> —las que tienen más viviendas turísticas sobre el total: ${TUR.map(nm).join(", ")}— del resto. Comparamos cómo cambió el paro registrado y la renta en cada grupo entre 2019 y 2020, y cómo se recuperaron después. Es la misma lógica de <b>diferencias en diferencias</b> que el estudio del tope del alquiler.</p>`);
  const s3=finding(B,`En 2020 el paro subió un ${nf0.format(jT)}${NB}% en las provincias turísticas y un ${nf0.format(jR)}${NB}% en el resto`,`<p>Paro registrado de cada grupo, con 2019 = 100. ${(()=>{ const a=idx(TUR)[0], b=idx(REST)[0]; return `Antes de la pandemia el paro bajaba en los dos grupos, aunque algo más deprisa en el resto (de ${nf0.format(b)} a 100, frente a ${nf0.format(a)} a 100 en las turísticas): la comparación no es perfecta, pero el salto de 2020 es mucho más brusco que esa diferencia.`; })()} En 2020 se separan. En 2023 las turísticas estaban un ${nf0.format(Math.abs(rT))}${NB}% ${rT<0?"por debajo":"por encima"} de 2019 y el resto, un ${nf0.format(Math.abs(rR))}${NB}% ${rR<0?"por debajo":"por encima"}.</p>`);
  lineChart(s3,{title:"Paro registrado, 2019 = 100",source:"Media anual; 2026, de enero a septiembre. Fuente: SEPE; viviendas turísticas del INE para elegir las provincias.",series:[{n:"10 más turísticas",v:idx(TUR),c:"--rust",main:true},{n:"Resto de España",v:idx(REST),c:"--slate"}],years:PY,xticks:[2015,2019,2020,2023,2026],fmt:v=>nf1.format(v),height:280});
  const s4=finding(B,"Provincia a provincia",`<p>Cuánto subió el paro registrado entre 2019 y 2020 en cada provincia. En granate, las diez más turísticas. ${c?`Entre provincias, la relación entre el peso del turismo y la subida del paro es ${strength(Math.abs(c.r))} (r = ${rFmt(c.r)}).`:""}</p>`);
  const f=fig(s4,{title:"Subida del paro registrado, 2019–2020",source:"Fuente: SEPE."});
  hbars(f.body,P.slice().sort((a,b)=>jump(b)-jump(a)).map(p=>({l:nm(p),v:jump(p),c:TUR.includes(p)?"--rust":"--stone"})),{fmt:sgn,scroll:true,min:0});
  finding(B,"El resultado",`<p class="big" style="font-size:19px;font-weight:600;max-width:760px">Sí: el paro subió en las provincias turísticas <mark>${nf0.format(jT-jR)} puntos más</mark> que en el resto, y la renta por persona ${iT<iR?`cayó más (${sgn(iT)} frente a ${sgn(iR)})`:`se movió parecido (${sgn(iT)} frente a ${sgn(iR)})`}. ${rT<=rR+3?"Pero la recuperación fue completa: en 2023 ya estaban como el resto o mejor.":"Y la recuperación tardó más."}</p>
    <ul class="defs"><li><b>El paro registrado se quedó corto.</b> Los trabajadores en ERTE no contaban como parados. En las zonas turísticas hubo muchos: el golpe real al empleo fue mayor de lo que muestra este dato.</li>
    <li><b>Las provincias turísticas no son iguales al resto en otras cosas</b> (empleo temporal, tamaño de las empresas, clima). Por eso importa que antes de 2020 los dos grupos se movieran parecido: es lo que hace creíble la comparación.</li>
    <li><b>Es un análisis por provincias.</b> Dentro de cada una, los municipios de costa y los de interior vivieron la pandemia de forma muy distinta.</li></ul>
    <p style="margin-top:10px">${exLink("evolucion",{e:["paro","pob"]},"Mira el paro de tu provincia en el laboratorio")}</p>`);
}

// ---------- qué hace crecer a un pueblo ----------
function studyGrow(B){
  const Y="pobVar20", FAC=[["renta","Renta por persona"],["edad","Edad media"],["superiores","Estudios superiores"],["paroReg","Paro registrado"],["alquiler","Hogares de alquiler"],["vt","Pisos turísticos"],["distCiudad","Distancia a una ciudad grande"],["distCosta","Distancia a la costa"],["lpop","Tamaño del pueblo"]];
  const EF={prov:"",min:1000,max:20000};
  const res=withEXF(EF,()=>FAC.map(([k,l])=>{ const others=FAC.map(f=>f[0]).filter(x=>x!==k);
    const simple=k==="lpop"?wcorr(rowsAll().filter(r=>exOK(r)&&r[F[Y]]!=null&&r[F.pop]).map(r=>({x:Math.log10(r[F.pop]),y:r[F[Y]],w:1}))):wcorr(pairPts(k,Y,{weighted:false}));
    const pr=k==="lpop"?lpopPartial(Y,others):partialR(k,Y,[...others,"prov"],false);
    return {k,l,s:simple?simple.r:null,p:pr?pr.r:null,n:pr?pr.n:0}; }));
  const n=withEXF(EF,()=>rowsAll().filter(r=>exOK(r)&&r[F[Y]]!=null).length);
  const ok=res.filter(r=>r.p!=null).sort((a,b)=>Math.abs(b.p)-Math.abs(a.p));
  const top=ok[0], sec=ok[1];
  finding(B,"La pregunta",`<p>Entre 2020 y 2025, ${nf0.format(n)} municipios de entre 1.000 y 20.000 habitantes han vivido destinos muy distintos: unos ganan vecinos y otros se vacían. ¿Qué tienen en común los que crecen? ¿Renta, juventud, estudios, poco paro, turismo?</p>`);
  finding(B,"El método: todos los sospechosos a la vez",`<p>Si miramos cada factor por separado nos engañamos, porque van juntos: los pueblos ricos suelen ser también más jóvenes y con más estudios. Por eso, para cada factor medimos su relación con el crecimiento <b>comparando pueblos iguales en todos los demás</b> y de la misma provincia. Así cada factor compite con los otros.</p>`);
  const s3=finding(B,"Por separado y entre iguales",`<p>La primera columna es la relación de cada factor con el crecimiento por sí solo; la segunda, la que queda al comparar entre pueblos iguales en todo lo demás. Cuanto más lejos de cero, más fuerte.</p>`);
  const t=add(s3,"div","extable"); t.innerHTML=`<table class="glance" style="max-width:700px"><thead><tr><th>Factor</th><th class="r">Por sí solo</th><th class="r">Entre iguales</th><th>Qué queda</th></tr></thead><tbody>${res.map(r=>`<tr><td class="lab"><b>${r.l}</b></td><td class="r num">${r.s==null?"—":rFmt(r.s)}</td><td class="r num"><b>${r.p==null?"—":rFmt(r.p)}</b></td><td>${r.p==null?"":`<span style="display:inline-block;height:9px;border-radius:2px;width:${Math.round(Math.abs(r.p)*160)}px;background:var(${r.p>0?"--rust":"--slate"})"></span>`}</td></tr>`).join("")}</tbody></table>`;
  add(s3,"p","muted","Granate: los pueblos con más de ese factor crecen más. Azul: crecen menos. Municipios de 1.000 a 20.000 habitantes, cada uno cuenta igual.").style.cssText="font-size:13.5px;margin-top:8px";
  finding(B,"Qué se puede concluir y qué no",`<p class="big" style="font-size:19px;font-weight:600;max-width:760px">Entre pueblos parecidos, lo que más pesa es ${top?`<mark>${low(top.l)}</mark>: cuanto ${top.p>0?"mayor":"menor"}, más crece (r = ${rFmt(top.p)})`:"—"}${sec?`. Le sigue ${low(sec.l)}: cuanto ${sec.p>0?"mayor":"menor"}, más crece (r = ${rFmt(sec.p)})`:""}.</p>
    <ul class="defs"><li><b>La causa puede ir al revés.</b> Un pueblo que crece porque llegan familias jóvenes se vuelve más joven: la edad media baja <i>porque</i> crece, no al revés. Con la edad hay que ser especialmente prudente.</li>
    <li><b>Faltan sospechosos importantes:</b> el tren o la autovía, los servicios del pueblo o el precio de la vivienda en la ciudad cercana. No están en estos datos. La distancia se mide en línea recta, no en tiempo de viaje.</li>
    <li><b>Son relaciones entre lugares, no entre personas.</b> No dicen por qué se muda cada familia.</li></ul>
    <p style="margin-top:10px">${exLink("cruce",{d:[top?top.k==="lpop"?"pop":top.k:"renta",Y],t:"s2",c:[]},"Ponlo a prueba en el laboratorio")}</p>`);
}
// relación entre el tamaño (log) y el crecimiento, descontando el resto
function lpopPartial(Y,others){
  const cs=others.filter(c=>c!=="lpop"&&c!=="prov");
  const rs=rowsAll().filter(r=>exOK(r)&&r[F[Y]]!=null&&(r[F.pop]||0)>0&&cs.every(c=>r[F[c]]!=null)); if(rs.length<30) return null;
  const w=rs.map(()=>1), g=rs.map(r=>r[F.prov]); const cols=cs.map(c=>demeanBy(rs.map(r=>r[F[c]]),g,w)), Z=rs.map((r,i)=>cols.map(col=>col[i]));
  let X=demeanBy(rs.map(r=>Math.log10(r[F.pop])),g,w), YY=demeanBy(rs.map(r=>r[F[Y]]),g,w); if(cs.length){ X=wresid(X,Z,w); YY=wresid(YY,Z,w); }
  const c=wcorr(X.map((v,i)=>({x:v,y:YY[i],w:1}))); return c?{r:c.r,n:rs.length}:null;
}

// ---------- cerca de la ciudad ----------
function studyCerca(B){
  const rows=rowsAll().filter(r=>r[F.pobVar20]!=null&&r[F.distCiudad]!=null&&(r[F.pop]||0)>=200&&(r[F.pop]||0)<20000&&r[F.distCiudad]>0);
  const bands=[[0,15,"Menos de 15 km"],[15,30,"15 a 30 km"],[30,50,"30 a 50 km"],[50,80,"50 a 80 km"],[80,1e9,"Más de 80 km"]];
  const wm=(rs,k)=>{ const s=rs.filter(r=>r[F[k]]!=null&&r[F.pop]); const w=d3.sum(s,r=>r[F.pop]); return w?d3.sum(s,r=>r[F[k]]*r[F.pop])/w:null; };
  const share=rs=>rs.filter(r=>r[F.pobVar20]>0).length/rs.length*100;
  const B5=bands.map(([a,b,l])=>{ const s=rows.filter(r=>r[F.distCiudad]>=a&&r[F.distCiudad]<b); return {l,n:s.length,g:wm(s,"pobVar20"),sh:share(s),edad:wm(s,"edad")}; });
  const EF={prov:"",min:200,max:20000};
  const base=withEXF(EF,()=>partialR("distCiudad","pobVar20",[],false)), c1=withEXF(EF,()=>partialR("distCiudad","pobVar20",["lpop","edad"],false)), c2=withEXF(EF,()=>partialR("distCiudad","pobVar20",["lpop","edad","renta","prov"],false));
  const coast=rows.filter(r=>r[F.distCosta]===0), inland=rows.filter(r=>r[F.distCosta]>0);
  finding(B,"La pregunta",`<p>Desde 2020 se habla de la vuelta al pueblo: teletrabajo, alquileres imposibles en la ciudad, ganas de espacio. Pero ¿a qué pueblos? Si la gente se va a vivir fuera sin dejar de trabajar en la ciudad, deberían crecer sobre todo los que quedan cerca. Medimos la distancia en línea recta de cada municipio a la ciudad de más de 100.000 habitantes más próxima.</p>`);
  const s2=finding(B,`Cerca de una ciudad crecen ${nf0.format(B5[0].sh)} de cada 100 pueblos; a más de 80 km, ${nf0.format(B5[4].sh)}`,`<p>Municipios de menos de 20.000 habitantes, agrupados por su distancia a una ciudad grande. Cuanto más lejos, menos crecen.</p>`);
  const g=add(s2,"div","cols2");
  const fa=fig(g,{title:"Pueblos que han ganado población desde 2020",source:"% de municipios de cada grupo. Fuente: INE, padrón 2020–2025; distancia calculada en Indicio."});
  hbars(fa.body,B5.map(b=>({l:b.l,v:b.sh})),{fmt:pc0,color:"--olive",min:0,max:100});
  const fb=fig(g,{title:"Crecimiento medio de la población, 2020–2025",source:"Media ponderada por población."});
  hbars(fb.body,B5.map(b=>({l:b.l,v:b.g})),{fmt:sgn,color:"--rust"});
  const s3=finding(B,"¿Es la distancia, o es que los pueblos lejanos son más viejos?",`<p>Los pueblos alejados tienen también más edad media (${nf1.format(B5[4].edad)} años, frente a ${nf1.format(B5[0].edad)} cerca de las ciudades), y la edad por sí sola hace que un pueblo pierda gente. Así que comparamos entre pueblos iguales:</p>`);
  const rws=[["Sin descontar nada",base],["A igual tamaño y edad",c1],["… y a igual renta, dentro de cada provincia",c2]].filter(x=>x[1]);
  add(s3,"div",null,`<table class="glance" style="max-width:600px"><thead><tr><th>Comparación</th><th class="r">Relación (r)</th></tr></thead><tbody>${rws.map(([l,c])=>`<tr><td>${l}</td><td class="r num"><b>${rFmt(c.r)}</b></td></tr>`).join("")}</tbody></table>`);
  add(s3,"p",null,c2&&Math.abs(c2.r)>=Math.abs(base.r)*0.5?`La relación aguanta: incluso entre pueblos de la misma edad, tamaño y renta, los que están más lejos de una ciudad crecen menos.`:`La relación se debilita mucho: buena parte de lo que parecía efecto de la distancia era la edad de los pueblos alejados.`).style.cssText="max-width:680px;margin-top:10px;font-weight:600";
  finding(B,"¿Y la costa?",`<p>Los municipios con costa han crecido de media un ${sgn(wm(coast,"pobVar20"))} desde 2020; los de interior, un ${sgn(wm(inland,"pobVar20"))}. Han ganado población ${nf0.format(share(coast))} de cada 100 pueblos costeros y ${nf0.format(share(inland))} de cada 100 de interior.</p>`);
  finding(B,"Qué se puede concluir y qué no",`<ul class="defs"><li><b>La distancia es en línea recta,</b> no en tiempo de viaje. Un pueblo a 40 km con tren de cercanías está «más cerca» que uno a 25 km por una carretera de montaña.</li>
    <li><b>No sabemos quién llega.</b> El crecimiento puede venir de familias que salen de la ciudad o de inmigración extranjera, que también se concentra en el área de influencia de las ciudades.</li>
    <li><b>Es un periodo corto</b> y con la pandemia en medio. Habrá que ver si se mantiene.</li></ul>
    <p style="margin-top:10px">${exLink("cruce",{d:["distCiudad","pobVar20"],t:"s2",c:["edad"]},"Ponlo a prueba en el laboratorio")}</p>`);
}
function studyVotar(B){
  const k=VG(), rows=rowsAll().filter(r=>r[F.part]!=null&&r[F.pop]);
  const bands=[[0,500,"Menos de 500"],[500,2000,"500 a 2.000"],[2000,10000,"2.000 a 10.000"],[10000,50000,"10.000 a 50.000"],[50000,1e9,"Más de 50.000"]];
  const wm=(rs,kk)=>{ const s=rs.filter(r=>r[F[kk]]!=null&&r[F.pop]); const w=d3.sum(s,r=>r[F.pop]); return w?d3.sum(s,r=>r[F[kk]]*r[F.pop])/w:null; };
  const B5=bands.map(([a,b,l])=>{ const s=rows.filter(r=>r[F.pop]>=a&&r[F.pop]<b); return {l:l+" hab.",p:wm(s,"part"),e:wm(s,"edad")}; });
  const EF={prov:"",min:0,max:Infinity};
  const sz0=withEXF(EF,()=>lpopPartial("part",[])), sz1=withEXF(EF,()=>lpopPartial("part",["edad"])), sz2=withEXF(EF,()=>lpopPartial("part",["edad","renta"]));
  const ed0=withEXF(EF,()=>partialR("edad","part",["prov"],false)), ed1=withEXF(EF,()=>partialR("edad","part",["lpop","prov"],false));
  finding(B,"La pregunta",`<p>En las ${ELNAME(k)}, en los pueblos de menos de 500 habitantes votó el ${pc(B5[0].p)} del censo; en las ciudades de más de 50.000, el ${pc(B5[4].p)}. Hay dos explicaciones posibles: en un pueblo todo el mundo se conoce y votar es casi un acto social, o simplemente en los pueblos hay más gente mayor, y los mayores votan más en todas partes.</p>`);
  const s2=finding(B,"Participación y edad, según el tamaño",`<p>Cuanto más pequeño el municipio, más se vota y más mayor es su población. Las dos cosas van juntas, así que hay que separarlas.</p>`);
  const g=add(s2,"div","cols2");
  const fa=fig(g,{title:`Participación, ${ELSHORT(k)}`,source:"% del censo. Fuente: Ministerio del Interior."}); hbars(fa.body,B5.map(b=>({l:b.l,v:b.p})),{fmt:pc,color:"--slate",min:0,max:100});
  const fb=fig(g,{title:"Edad media",source:"Fuente: INE, Atlas de Renta."}); hbars(fb.body,B5.map(b=>({l:b.l,v:b.e})),{fmt:v=>nf1.format(v)+NB+"años",color:"--mustard",min:0});
  const s3=finding(B,"El método: comparar pueblos de la misma edad",`<p>Medimos la relación entre el tamaño del municipio y la participación tres veces: sin más, entre municipios con la misma edad media, y además con la misma renta. Y al revés: la relación entre edad y participación entre municipios del mismo tamaño. Todo dentro de cada provincia.</p>`);
  add(s3,"div",null,`<table class="glance" style="max-width:640px"><thead><tr><th>Relación con la participación</th><th class="r">r</th></tr></thead><tbody>
    ${[["Tamaño (cuanto más grande…)",sz0],["Tamaño, a igual edad",sz1],["Tamaño, a igual edad y renta",sz2],["Edad media",ed0],["Edad media, a igual tamaño",ed1]].filter(x=>x[1]).map(([l,c])=>`<tr><td>${l}</td><td class="r num"><b>${rFmt(c.r)}</b></td></tr>`).join("")}</tbody></table>`);
  const keep=sz0&&sz2?Math.abs(sz2.r)/Math.abs(sz0.r):null;
  finding(B,"El resultado",`<p class="big" style="font-size:19px;font-weight:600;max-width:760px">${keep==null?"":keep>=0.6?`Las dos cosas cuentan, pero el tamaño pesa por sí solo: incluso entre municipios de la misma edad y renta, cuanto más pequeño, más se vota.`:keep>=0.3?`Una parte es la edad, pero no toda: entre municipios de la misma edad y renta, los pequeños siguen votando algo más.`:`Casi todo es la edad: entre municipios de la misma edad y renta, el tamaño apenas importa.`}</p>
    <ul class="defs"><li><b>El censo de los pueblos pequeños puede estar «inflado»</b> con gente empadronada que vive fuera y no vota, lo que bajaría su participación. Aun así votan más.</li>
    <li><b>Son datos de municipios, no de personas.</b> No dicen que cada persona mayor vote más, sino que los municipios con más edad media tienen más participación.</li>
    <li><b>Sin voto exterior:</b> los residentes en el extranjero no están en estos datos.</li></ul>
    <p style="margin-top:10px">${exLink("cruce",{d:["densidad","part"],t:"",c:["edad"],lx:1},"Ponlo a prueba en el laboratorio")}</p>`);
}
// =====================================================================
// QUIÉN SOY, SERVICIOS Y CONTACTO
// =====================================================================
// Rellena estos datos y se colocan solos en la página
// Quién hay detrás: se rellena desde src/content.mjs (SITE.author)
const ABOUT=Object.assign({nombre:"", frase:"", foto:"", linkedin:"", web:""},(window.__INDICIO&&window.__INDICIO.site&&window.__INDICIO.site.author)||{});
if(ABOUT.name&&!ABOUT.nombre) ABOUT.nombre=ABOUT.name; if(ABOUT.bio&&!ABOUT.frase) ABOUT.frase=ABOUT.bio;
const SERVICIOS=[
  ["🏘️","Informes de tu municipio o comarca","Para ayuntamientos, diputaciones y asociaciones: cómo está vuestro territorio frente a los que se le parecen, en un informe claro y con sus fuentes."],
  ["📰","Datos y gráficos para medios","Análisis rápidos y gráficos listos para publicar sobre vivienda, empleo, población o voto, con el método explicado."],
  ["🔎","¿Ha funcionado esta medida?","Evaluación de políticas públicas con datos abiertos: antes y después, grupos de comparación y qué se puede concluir y qué no."],
  ["🎓","Formación: leer datos sin engañarse","Talleres para equipos, periodistas o docentes: correlación y causa, comparar entre iguales, gráficos honestos."]];
function renderSobre(sec){
  document.title="Quién soy · Indicio";
  const A=ABOUT, nm=A.nombre?esc(A.nombre):"";
  view.innerHTML=`<section class="ab-hero">
      ${A.foto?`<img class="ab-foto" src="${esc(A.foto)}" alt="${nm}">`:`<div class="ab-foto ab-ph" aria-hidden="true">${nm?esc(nm.split(" ").map(w=>w[0]).slice(0,2).join("")):"?"}</div>`}
      <div><span class="kk">Quién hay detrás</span><h1>${nm?`Hola, soy ${nm}`:"Hola, soy quien hace Indicio"}</h1>
      <p class="dek">${A.frase?esc(A.frase):"Indicio es un proyecto personal e independiente: sin publicidad, sin partido y sin otra agenda que entender mejor cómo vivimos. Lo hago porque los datos públicos son de todos, pero casi nadie tiene tiempo de leerlos."}</p>
      <div class="chipsq">${A.linkedin?`<a href="${esc(A.linkedin)}" target="_blank" rel="noopener">LinkedIn</a>`:""}${A.web?`<a href="${esc(A.web)}" target="_blank" rel="noopener">Web</a>`:""}<a href="/quien-soy/contacto/" id="abgo">✉ Escríbeme</a></div></div>
    </section>
    <section class="ci-band"><h2>Cómo trabaja Indicio</h2><div class="ci-steps" style="padding:0">
      <div><i>1</i><span><b>Solo datos oficiales</b>INE, SEPE, Ministerio del Interior y Eurostat. Cada gráfico dice de dónde sale.</span></div>
      <div><i>2</i><span><b>Sin opinión</b>Los textos describen lo que dicen los datos y lo que no pueden decir. Las conclusiones son tuyas.</span></div>
      <div><i>3</i><span><b>Método a la vista</b>Si algo parece una causa, se pone a prueba delante de ti, en el laboratorio y en los estudios.</span></div></div></section>
    <section class="ab-sec"><h2>En qué te puedo ayudar</h2><p class="lead" style="max-width:680px">Además de la web, hago trabajos a medida con datos públicos. Si tienes una pregunta sobre tu territorio o tu sector, cuéntamela.</p>
      <div class="g4">${SERVICIOS.map(([e,t,d])=>`<a class="cardx qcard ab-srv" href="/quien-soy/contacto/" data-t="${esc(t)}"><div class="ab-e">${e}</div><div class="t">${t}</div><p>${d}</p><div class="s">Pedir información →</div></a>`).join("")}</div></section>
    <section class="ab-sec" id="contacto"><h2>Escríbeme</h2>
      <div class="ab-form"><form id="abform" name="contacto" method="POST" data-netlify="true" netlify-honeypot="bot-field">
        <input type="hidden" name="form-name" value="contacto"><p hidden><label>No rellenar <input name="bot-field"></label></p>
        <label class="fld">Nombre<input class="inp" name="nombre" required autocomplete="name"></label>
        <label class="fld">Correo electrónico<input class="inp" type="email" name="email" required autocomplete="email"></label>
        <label class="fld">Sobre qué<select class="sel" name="motivo" id="abmot"><option>Una pregunta sobre los datos</option><option>He visto un error</option><option>Una idea para la web</option>${SERVICIOS.map(s=>`<option>${s[1]}</option>`).join("")}<option>Otra cosa</option></select></label>
        <label class="fld">Mensaje<textarea class="inp" name="mensaje" rows="5" required></textarea></label>
        <button type="submit" class="sel ab-send">Enviar</button><p class="muted" id="abres" style="font-size:14px" role="status"></p>
      </form>
      <div class="ab-side"><h3>Antes de escribir</h3><ul class="defs"><li><b>¿Un error en los datos?</b> Dime en qué página y qué dato. Los arreglo y lo cuento en la web.</li><li><b>¿Falta tu pregunta?</b> Las mejores ideas para nuevos estudios vienen de quien lee.</li><li>Uso tu correo solo para responderte.</li></ul></div></div>
    </section>`;
  view.querySelectorAll(".ab-srv").forEach(a=>a.addEventListener("click",e=>{ e.preventDefault(); const m=document.getElementById("abmot"); if(m) m.value=a.dataset.t; scrollToId("contacto"); }));
  document.getElementById("abgo").addEventListener("click",e=>{ e.preventDefault(); scrollToId("contacto"); });
  const f=document.getElementById("abform"), res=document.getElementById("abres");
  f.addEventListener("submit",async e=>{ e.preventDefault(); res.textContent="Enviando…";
    try{ const r=await fetch("/",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams(new FormData(f)).toString()}); if(!r.ok) throw 0;
      f.reset(); res.innerHTML="<b>¡Gracias!</b> Te contesto lo antes posible."; }
    catch(x){ res.textContent="No se pudo enviar desde aquí. Prueba desde la web publicada, cifrarios.netlify.app."; } });
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
    ${myOk(lastMun)&&myOk(MUN2)?`<a class="mp-cmp" href="#comparar-${lastMun}-${MUN2}">⇄ Ver los dos lado a lado →</a>`:""}`;
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
const SWARM_CACHE=new Map();
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
    const X0=d3.scaleLinear().domain([-70,100]).range([16,W-(mob?60:110)]), X=v=>v<=100?X0(Math.max(-70,v)):X0(100)+Math.log(v/100)*(mob?20:38);
    const R=d3.scaleSqrt().domain([0,3.4e6]).range([mob?1.3:1.1,mob?16:20]);
    // la simulación de fuerzas es lo más caro de toda la web: se calcula una vez por tamaño y se guarda
    const ck=W+"x"+H; let nodes=SWARM_CACHE.get(ck);
    if(!nodes){ nodes=qRows(r=>r[F.var0525]!=null&&r[F.edad]!=null).map(r=>({c:r[F.code],v:r[F.var0525],e:r[F.edad],r:Math.max(mob?1.3:1.15,R(r[F.pop]||0))}));
      nodes.forEach((d,i)=>{ d.x=X(d.v)+((i*7919)%10)/10-.5; d.y=mid+(((i*104729)%100)/100-.5)*40; });
      const sim=d3.forceSimulation(nodes).force("x",d3.forceX(d=>X(d.v)).strength(.9)).force("y",d3.forceY(mid).strength(mob?.03:.05)).force("c",d3.forceCollide(d=>d.r+.35).iterations(1)).stop();
      for(let i=0;i<90;i++) sim.tick();
      SWARM_CACHE.set(ck,nodes); }
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
    a:`<b>Más por la edad.</b> Los pueblos más jóvenes han ${qSigned(ed.lo)} de vecinos desde 2005; los más envejecidos, ${qSigned(ed.hi)}. Entre pueblos de la misma edad, estar lejos de una ciudad apenas cuenta.`,
    href:"/preguntas/cerca-ciudad/", art:"swarm", hero:true, spot:r=>`${r[F.var0525]>=0?"ha ganado":"ha perdido"} un ${nf0.format(Math.abs(r[F.var0525]))}${NB}% de vecinos desde 2005 · edad media ${nf1.format(r[F.edad])} años`,
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
  const pa=qMed(qRows(r=>r[F.part]!=null&&(r[F.pop]||0)<1000),"part"), pb=qMed(qRows(r=>r[F.part]!=null&&(r[F.pop]||0)>100000),"part");
  L.push({id:"votar",k:"Voto",q:"¿Se vota más en los pueblos?",
    a:`<b>Sí.</b> En los de menos de 1.000 habitantes votó el ${nf0.format(pa)}${NB}%; en las ciudades de más de 100.000, el ${nf0.format(pb)}${NB}%. Parte se explica porque allí la población es mayor.`,
    href:"/preguntas/votar-pueblos/", art:"turnout", cap:"Un punto por municipio: más oscuro, más participación en las últimas generales."});
  const mc=qMed(qRows(r=>r[F.var0525]!=null&&r[F.distCosta]!=null&&r[F.distCosta]<5),"var0525"), mi=qMed(qRows(r=>r[F.var0525]!=null&&r[F.distCosta]!=null&&r[F.distCosta]>100),"var0525");
  L.push({id:"mar",k:"Población",q:"¿Qué hace que un pueblo gane vecinos?",
    a:`<b>${mc>mi?"La juventud y la costa, sobre todo":"La juventud, sobre todo"}.</b> Los municipios de costa han ${qSigned(mc)} de vecinos desde 2005; los que están a más de 100 km del mar, ${qSigned(mi)}.`,
    href:"/preguntas/crecer/", art:"ridge", hero:true, cap:"España en franjas de norte a sur: cada pico es gente. Las grandes ciudades y la costa sobresalen; el interior queda casi plano."});
  return L;
}
let QL=null; const qGet=()=>QL||(QL=qList());
const ARTS=new Set(/[?&]live=1/.test(location.search)?[]:(window.__INDICIO_ARTS||(window.__INDICIO&&window.__INDICIO.arts)||[]));
// tarjeta: imagen estática generada en el build si existe (aparece al instante); si no, el dibujo en vivo
const qCard=(Q,W,H)=>{ if(ARTS.has(Q.id)){ const im=el("img"); im.src="/art/"+Q.id+".jpg"; im.width=W; im.height=H; im.alt=""; im.decoding="async"; im.className="qimg"; return im; } return FEATS?qArt(Q,W,H):null; };
const qArt=(Q,W,H)=>{ try{ const n=QART[Q.art](W,H); if(n) n.classList.add("rv","rv-"+Q.art); if(n&&Q.art==="swarm"&&W<500) n.querySelectorAll("text,line,circle[r=\"0\"]").forEach(t=>{ if(t.tagName!=="circle"||t.getAttribute("fill")==="none") t.remove(); }); return n; }catch(e){ console.error(e); return null; } };

let QH_T=null;
async function renderInicio(){
  document.title="Indicio · Preguntas reales, respuestas con datos públicos";
  // cabecera: qué hacemos, en una frase, y un solo gráfico de análisis (la nube de municipios del campo)
  view.innerHTML=`<section class="qh qh-claim"><div class="kk2">Datos públicos de los ${nf0.format(rowsAll().length)} municipios de España</div>
    <h1 class="qh-q">Preguntas sobre cómo vivimos, <em>respondidas con datos</em></h1>
    <p class="qh-a">Cogemos preguntas reales —¿se vacía el campo?, ¿encarecen el alquiler los pisos turísticos?— y las respondemos con datos públicos, municipio a municipio y con el método a la vista. Y si tienes otra, en el laboratorio compruebas tú si algo es causa o casualidad.</p>
    <p class="qh-cta"><a class="btn" href="/preguntas/">Ver los análisis →</a><a class="btn alt" href="/laboratorio/">Abrir el laboratorio</a></p>
    <a class="qh-art" id="qhart" href="/preguntas/cerca-ciudad/" aria-label="¿Se vacía el campo por la distancia o por la edad?"></a><p class="qh-cap" id="qhc"></p></section>
  <section class="ed-sec"><div class="ed-k">Preguntas respondidas</div><h2 class="ed-h2">Lo que de verdad dicen los datos</h2><div class="qg" id="qg"><p class="loading">Cargando…</p></div>
    <p style="margin-top:20px"><a class="ed-go" href="/preguntas/">Todas las preguntas →</a></p></section>
  <section class="ed-sec ed-two"><a class="ed-ill" href="/laboratorio/" aria-hidden="true" tabindex="-1">${tIll("laboratorio")}</a>
    <div><div class="ed-k">Laboratorio</div><h2 class="ed-h2">¿Tienes otra pregunta? Pruébala tú.</h2><p class="ed-lead">Elige dos cosas (el paro y la edad, la renta y el voto…) y mira si van juntas en los ${nf0.format(rowsAll().length)} municipios. Te ayudamos a saber si es causa o casualidad.</p><p style="margin-top:14px"><a class="ed-go" href="/laboratorio/">Abrir el laboratorio →</a></p></div></section>
  <section class="ed-sec ed-two"><div><div class="ed-k">O mira un lugar concreto</div><h2 class="ed-h2" style="font-size:clamp(24px,2.8vw,30px)">¿Cómo sale tu municipio en estas preguntas?</h2><div class="ed-ill sm" aria-hidden="true">${tIll("municipio")}</div></div>
    <div>${bigSearchHTML("q2","Escribe un municipio…")}${exampleChips()}</div></section>
  <section class="ed-sec"><div class="ed-k">Preguntas por tema</div><div class="ed-temas">${TOPIC_IDS.map(id=>`<a href="/temas/${id}/">${TOPICS[id].l}</a>`).join("")}</div></section>
  ${methodNote()}`;
  bindBig("q2");
  const L=qGet(), wide=view.clientWidth;
  // tarjetas: con imágenes estáticas no hace falta esperar al mapa
  const g=document.getElementById("qg"); g.innerHTML="";
  const byId=Object.fromEntries(STUDIES.map(S=>[S.id,S])), sid=href=>(String(href).match(/^\/preguntas\/([\w-]+)\/?$/)||[])[1];
  const needTopo=L.some(Q=>Q.id!=="campo"&&!ARTS.has(Q.id));
  if(needTopo){ try{ await loadTopo(); }catch(e){ return; } if(!document.getElementById("qg")) return; }
  L.filter(Q=>Q.id!=="campo").forEach(Q=>{ const S=byId[sid(Q.href)]; const a=add(g,"a"); a.href=Q.href; a.dataset.qid=Q.id; const art=qCard(Q,320,190); if(art) a.appendChild(art);
    a.insertAdjacentHTML("beforeend",`<div class="k">${Q.k}${S?` · <span class="k-m">${esc(S.m)}</span>`:""}</div><div class="q">${Q.q.replace(/<\/?em>/g,"")}</div><div class="a">${Q.a}</div><div class="go">Ver la respuesta →${S&&S.pub?`<time datetime="${S.pub}">${fechaES(S.pub)}</time>`:""}</div>`); });
  // laboratorio: cuatro parejas
  const lab=document.getElementById("qlab"); if(lab)
  [["superiores","renta","Estudios y renta"],["edad","var0525","Edad y población"],["renta","paroReg","Renta y paro"],["pop","part","Tamaño y participación"]].forEach(([x,y,t])=>{
    try{ const d=add(lab,"a"); d.href=exHash({v:"cruce",d:[x,y],t:"g1",p:"",c:[]}); d.style.textDecoration="none"; d.style.color="inherit";
    const s=x==="pop"?(()=>{ const C=QC(), W=250,H=120, sv=qSvg(W,H,t), rs=qRows(r=>r[F.part]!=null&&r[F.pop]>0), X=d3.scaleLinear().domain([1.5,6.5]).range([4,W-4]).clamp(true), ys=rs.map(r=>r[F.part]).sort(d3.ascending), Y=d3.scaleLinear().domain([d3.quantile(ys,.01),d3.quantile(ys,.99)]).range([H-12,8]).clamp(true);
      sv.append("g").selectAll("circle").data(rs).join("circle").attr("cx",r=>X(Math.log10(r[F.pop]))).attr("cy",r=>Y(r[F.part])).attr("r",.9).attr("fill",C.ink).attr("fill-opacity",.2);
      const xs=rs.map(r=>Math.log10(r[F.pop])), mx=d3.mean(xs), my=d3.mean(rs,r=>r[F.part]), b=d3.sum(rs,(r,i)=>(xs[i]-mx)*(r[F.part]-my))/d3.sum(xs,v=>(v-mx)**2);
      sv.append("line").attr("x1",X(2)).attr("x2",X(6)).attr("y1",Y(my+b*(2-mx))).attr("y2",Y(my+b*(6-mx))).attr("stroke",C.br).attr("stroke-width",1.8);
      sv.append("line").attr("x1",0).attr("x2",W).attr("y1",H-6).attr("y2",H-6).attr("stroke",C.ink).attr("stroke-width",.7); return sv.node(); })()
      : (()=>{ const n=QART.scatter(250,120,x,y); n.querySelectorAll("circle").forEach(c=>c.setAttribute("r",.9)); return n; })();
    d.appendChild(s); d.insertAdjacentHTML("beforeend",`<div style="font-size:12.5px;color:var(--ink-2);margin-top:4px">${t}</div>`); }catch(e){ console.error(e); } });
  const Q=L.find(x=>x.id==="campo"); window.__INDICIO_HERO=["campo"];
  const ar=document.getElementById("qhart"), cp=document.getElementById("qhc"); if(!ar||!Q) return;
  cp.innerHTML=`${esc(Q.cap)} <a href="${Q.href}">¿Se vacía el campo por la distancia o por la edad? →</a>`;
  if(ARTS.has("hero-campo")){ const mob=wide<700, im=el("img"); im.src="/art/hero-campo"+(mob?"-m":"")+".jpg"; im.width=mob?720:1120; im.height=mob?520:380; im.alt=""; im.decoding="async"; im.className="qimg"; ar.appendChild(im); }
  else { try{ await loadTopo(); }catch(e){ return; } const n=qArt(Q,wide<700?720:1120,wide<700?520:380); if(n&&document.body.contains(ar)) ar.appendChild(n); }
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

// índice de todas las preguntas
// ANÁLISIS: todo lo ya respondido en un sitio (preguntas, panoramas de tema y tu municipio), filtrable por tema
async function renderPreguntas(){
  document.title="Análisis · Indicio";
  const tq=new URLSearchParams(location.search).get("tema"), tema=TOPIC_IDS.includes(tq)?tq:"";
  view.innerHTML=pageHead("Análisis","Preguntas sobre cómo vivimos, ya respondidas con datos públicos. Filtra por tema o busca tu municipio para verlo en todas. Si tu pregunta no está, pruébala tú en el laboratorio.")+
    `<div class="an-bar"><nav class="an-tabs" aria-label="Filtrar por tema">${[["","Todas"],...TOPIC_IDS.map(id=>[id,TOPICS[id].l])].map(([id,l])=>`<a href="/preguntas/${id?"?tema="+id:""}" data-t="${id}" ${id===tema?'aria-current="true"':""}>${l}</a>`).join("")}</nav>
      <div class="an-mun"><span class="kk">Tu municipio</span>${bigSearchHTML("q3","Busca tu municipio…")}</div></div>
    <div id="antema"></div><div class="qg" id="qg"><p class="loading">Cargando…</p></div>
    <section class="ed-sec" id="anpan"><div class="ed-k">Panoramas por tema</div><h2 class="ed-h2">Lo esencial de cada tema, en cinco minutos</h2><div class="g3" style="margin-top:14px">${TOPIC_IDS.map(id=>{ const T=TOPICS[id]; return `<a class="tcard" href="/temas/${id}/"><div class="img">${tIll(id)}</div><div class="tp"><span class="kk">${T.l}</span><h3>${T.q}</h3><div class="n" data-k="${id}">…</div><div class="s" data-s="${id}"></div></div><div class="ft"><span>${TMIN[id][0]} ideas · ${TMIN[id][1]} min</span><span class="gol">Leer →</span></div></a>`; }).join("")}</div></section>
    <section class="ed-sec ed-two"><div><div class="ed-k">¿Y la tuya?</div><h2 class="ed-h2">Si tu pregunta no está, pruébala en el laboratorio</h2><p class="ed-lead">Elige dos datos y mira si van juntos en los ${nf0.format(rowsAll().length)} municipios. Te decimos cuánto aguanta la relación cuando se compara entre iguales.</p><p style="margin-top:14px"><a class="ed-go" href="/laboratorio/">Abrir el laboratorio →</a> · <a class="ed-go" href="/laboratorio/metodo/">Cómo buscar causas →</a></p></div><div></div></section>`;
  bindBig("q3");
  for(const id of TOPIC_IDS){ TOPICS[id].key().then(([n,s])=>{ view.querySelectorAll(`[data-k="${id}"]`).forEach(a=>a.innerHTML=n); view.querySelectorAll(`[data-s="${id}"]`).forEach(b=>b.innerHTML=s); }).catch(()=>{}); }
  const L0=qGet(); if(L0.some(Q=>!ARTS.has(Q.id))){ try{ await loadTopo(); }catch(e){} }
  const L=qGet(), g=document.getElementById("qg"); if(!g) return; g.innerHTML="";
  const byId=Object.fromEntries(STUDIES.map(S=>[S.id,S]));
  const sid=href=>(String(href).match(/^\/preguntas\/([\w-]+)\/?$/)||[])[1];
  L.forEach(Q=>{ const S=byId[sid(Q.href)]; const a=add(g,"a"); a.href=Q.href; a.dataset.qid=Q.id; a.dataset.tema=S?S.tema:((QUICKQ.find(x=>x.id===Q.id)||{}).tema||""); const art=qCard(Q,320,Q.art==="swarm"?220:190); if(art) a.appendChild(art);
    a.insertAdjacentHTML("beforeend",`<div class="k">${Q.k}${S?` · <span class="k-m">${esc(S.m)}</span>`:""}</div><div class="q">${Q.q.replace(/<\/?em>/g,"")}</div><div class="a">${Q.a}</div><div class="go">Ver la respuesta →${S&&S.pub?`<time datetime="${S.pub}">${fechaES(S.pub)}</time>`:""}</div>`); });
  const used=new Set(L.map(Q=>sid(Q.href)).filter(Boolean));
  const SART={"tope-cataluna":"tope",pensiones:"pens","pandemia-turismo":"covid"};
  STUDIES.filter(S=>!used.has(S.id)).forEach(S=>{ const a=add(g,"a"); a.href="/preguntas/"+S.id+"/"; a.dataset.tema=S.tema;
    if(SART[S.id]){ try{ const n=QART[SART[S.id]](320,190); n.classList.add("qart-"+SART[S.id]); a.appendChild(n); }catch(e){ console.error(e); } }
    a.insertAdjacentHTML("beforeend",`<div class="k">${esc(TOPICL(S.tema))} · <span class="k-m">${esc(S.m)}</span></div><div class="q">${esc(S.t)}</div><div class="a">${esc(S.d)}</div><div class="go">Ver la respuesta →${S.pub?`<time datetime="${S.pub}">${fechaES(S.pub)}</time>`:""}</div>`); });
  // filtro por tema sin recargar: cambia la URL, oculta tarjetas y muestra el panorama del tema
  const apply=t=>{ g.querySelectorAll("a[data-tema]").forEach(a=>a.hidden=!!t&&a.dataset.tema!==t);
    view.querySelectorAll(".an-tabs a").forEach(a=>a.toggleAttribute("aria-current",a.dataset.t===t));
    const T=TOPICS[t], box=document.getElementById("antema"), n=g.querySelectorAll("a[data-tema]:not([hidden])").length;
    box.innerHTML=T?`<a class="an-pan" href="/temas/${t}/"><div class="img">${tIll(t)}</div><div><span class="kk">Panorama · ${T.l}</span><h3>${T.q}</h3><p><span class="n" data-k="${t}">…</span> <span data-s="${t}"></span></p></div><span class="gol">Leer el panorama · ${TMIN[t][1]} min →</span></a><p class="muted an-n">${n?`${n} pregunta${n>1?"s":""} sobre ${low(T.l)}:`:`Aún no hay preguntas sobre ${low(T.l)}: lee el panorama o pruébalo en el laboratorio.`}</p>`:"";
    if(T) T.key().then(([a,b])=>{ const x=box.querySelector("[data-k]"), y=box.querySelector("[data-s]"); if(x) x.innerHTML=a; if(y) y.innerHTML=b; }).catch(()=>{});
    document.getElementById("anpan").hidden=!!t; };
  view.querySelectorAll(".an-tabs a").forEach(a=>a.addEventListener("click",e=>{ e.preventDefault(); e.stopPropagation(); const t=a.dataset.t; try{ history.replaceState(null,"","/preguntas/"+(t?"?tema="+t:"")); }catch(x){} apply(t); }));
  apply(tema);
}
})();
