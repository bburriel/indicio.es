// Build de Indicio: genera en dist/ una página HTML real por cada ruta (portada, preguntas,
// laboratorio, quién soy y una ficha por municipio), con título, descripción, canonical, Open Graph,
// JSON-LD, sitemap, RSS y robots. Sin dependencias: `node build.mjs`.
//
// Si existe snapshots/<ruta>.html (lo genera `npm run snapshot` con Playwright), esa página se
// sirve ya pintada, con sus gráficos; si no, lleva un texto estático con lo esencial.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {fileURLToPath} from "node:url";
import {SITE,QUICK,PAGES,EVIDENCE} from "./src/content.mjs";
import {ROWS as I18N_ROWS} from "./src/i18n-textos.mjs";
import {faltan as i18nFaltan, validar as i18nValidar} from "./scripts/i18n-faltan.mjs";
import {STUDIES,ALL,HIDDEN,MDBODY} from "./src/analisis.mjs";
import {ILLUS,TILL,FOCUS} from "./src/illus.mjs";

const ROOT=path.dirname(fileURLToPath(import.meta.url));
const OUT=path.join(ROOT,"dist");
const rd=p=>fs.readFileSync(path.join(ROOT,p),"utf8");
const exists=p=>fs.existsSync(path.join(ROOT,p));
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const stripTags=s=>String(s).replace(/<[^>]+>/g,"");
const nf0=new Intl.NumberFormat("es-ES",{maximumFractionDigits:0});
const nf1=new Intl.NumberFormat("es-ES",{minimumFractionDigits:1,maximumFractionDigits:1});
const MES=["","enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const fechaES=d=>{ if(!d) return ""; const [y,m,dd]=d.split("-"); return `${+dd} de ${MES[+m]} de ${y}`; };
const norm=s=>s.normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9 ]/g," ").replace(/\s+/g," ").trim();
const dispName=n=>n.split("/")[0];
const disp=n=>n.split("/").map(x=>x.replace(/^(.*), (El|La|Los|Las|Els|Les|Lo|A|O|Os|As|Es|Sa|Ses|L')$/,(m,a,b)=>b.endsWith("'")?b+a:b+" "+a)).join("/");
const slug=s=>norm(dispName(s)).replace(/ /g,"-");
const provShort=n=>n?n.split("/")[0].replace(/^(.*), (A|Las|La|Les|Illes|Os)$/,"$2 $1"):"";

// ---------- ficheros fuente ----------
try{ fs.rmSync(OUT,{recursive:true,force:true}); }catch(e){ /* sin permiso de borrado: se sobrescribe encima */ }
fs.mkdirSync(OUT,{recursive:true});
const copyDir=(from,to)=>{ fs.mkdirSync(to,{recursive:true}); for(const e of fs.readdirSync(from,{withFileTypes:true})){ const a=path.join(from,e.name), b=path.join(to,e.name); if(e.isDirectory()) copyDir(a,b); else fs.writeFileSync(b,fs.readFileSync(a)); } };
const css=rd("src/styles.css"), js=rd("src/app.js"), tpl=rd("src/template.html");
const MENUAN=STUDIES.map(S=>`      <a href="/preguntas/${S.id}/">${esc(S.t)}</a>`).join("\n");
const body=rd("src/body.html").replace("{{MENUAN}}",MENUAN);
const h8=s=>crypto.createHash("sha256").update(s).digest("hex").slice(0,8);
const i18n="var ROWS="+JSON.stringify(I18N_ROWS)+";\n"+rd("src/i18n.js"), CSS="/assets/styles."+h8(css)+".css", JS="/assets/app."+h8(js)+".js", I18N="/assets/i18n."+h8(i18n)+".js";
fs.mkdirSync(path.join(OUT,"assets"),{recursive:true});
fs.writeFileSync(path.join(OUT,CSS),css); fs.writeFileSync(path.join(OUT,JS),js); fs.writeFileSync(path.join(OUT,I18N),i18n);
const ARTS=exists("art")?fs.readdirSync(path.join(ROOT,"art")).filter(f=>f.endsWith(".jpg")).map(f=>f.replace(/\.jpg$/,"")):[];
// Los análisis con «oculto» no se publican: ni página, ni datos en content.js. Para revisarlos en local: MOSTRAR_OCULTOS=1 npm run build
const SHOW_HIDDEN=!!process.env.MOSTRAR_OCULTOS;
const CONTENT_JSON=JSON.stringify({site:SITE,studies:STUDIES,hidden:SHOW_HIDDEN?HIDDEN:[],md:SHOW_HIDDEN?MDBODY:Object.fromEntries(Object.entries(MDBODY).filter(([id])=>STUDIES.some(S=>S.id===id))),quick:QUICK,arts:ARTS,evidence:EVIDENCE,illus:ILLUS,till:TILL,focus:FOCUS});
const CONTENTJS="/assets/content."+h8(CONTENT_JSON)+".js"; fs.writeFileSync(path.join(OUT,CONTENTJS),"window.__INDICIO="+CONTENT_JSON+";");
const CONTENT=CONTENTJS;

// estáticos
for(const f of ["favicon.svg","apple-touch-icon.png","icon-192.png","icon-512.png","og-image.png","manifest.webmanifest"]) if(exists(f)) fs.copyFileSync(path.join(ROOT,f),path.join(OUT,f));
copyDir(path.join(ROOT,"vendor"),path.join(OUT,"vendor"));
if(exists("og")) copyDir(path.join(ROOT,"og"),path.join(OUT,"og"));
if(exists("art")) copyDir(path.join(ROOT,"art"),path.join(OUT,"art"));
if(exists("illus")){ fs.mkdirSync(path.join(OUT,"illus"),{recursive:true}); for(const f of fs.readdirSync(path.join(ROOT,"illus")).filter(f=>f.endsWith(".svg"))) fs.copyFileSync(path.join(ROOT,"illus",f),path.join(OUT,"illus",f)); }
copyDir(path.join(ROOT,"data"),path.join(OUT,"data"));
// portada: las cifras y series de los gráficos de la cabecera, en un JSON de un par de KB, para no bajar
// alimentos.json, causales.json y vivienda.json (más de 2 MB) solo para dibujarlos. Se recalcula en cada build,
// con las mismas cuentas que los análisis (studyAlimentos, studyVivienda y studyReforma en src/app.js).
{ const A=JSON.parse(rd("data/alimentos.json")), SU=JSON.parse(rd("data/sueldos.json")), VI=JSON.parse(rd("data/vivienda.json")).es, RF=JSON.parse(rd("data/causales.json")).reforma;
  const r1=v=>Math.round(v*10)/10, r2=v=>Math.round(v*100)/100, mean=a=>a.reduce((s,x)=>s+x,0)/a.length;   // r2 donde la cifra se redondea luego en un texto
  const yav=(vals,keys,y,n)=>{ const v=vals.filter((x,i)=>x!=null&&String(keys[i]).startsWith(String(y))); return v.length&&(!n||v.length===n)?mean(v):null; };
  // la cesta: alimentos (IPC, media de cada año completo y de los últimos 12 meses) y sueldo mediano (Estructura Salarial), 2019 = 100
  const P=A.meses, al=A.ipc.es.alimentos, f19=yav(al,P,2019,12), LY=+P[P.length-1].slice(0,4)-(P[P.length-1].endsWith("M12")?0:1);
  const EY=SU.ees.años.map(Number), med=SU.ees.es.Mediana, eY=EY[EY.length-1], m19=med[EY.indexOf(2019)];
  const fy=[]; for(let y=2019;y<=LY;y++) fy.push([y,r1(yav(al,P,y,12)/f19*100)]);
  const l12=mean(al.slice(-12).filter(x=>x!=null)), [ly,lm]=P[P.length-1].split("M").map(Number);
  const cesta={comida:fy,ult12:{x:r2(ly+(lm-6)/12),v:r2(l12/f19*100),hasta:P[P.length-1]},
    sueldo:EY.filter(y=>y>=2019).map(y=>[y,r2(med[EY.indexOf(y)]/m19*100)]),añoSueldo:eY,
    poder:r2((med[EY.indexOf(eY)]/m19/(yav(al,P,eY,12)/f19)-1)*100)};
  // la casa: cuánto ha subido cada cosa desde 2015, cada una hasta su último año
  const lastK=o=>Object.keys(o).sort().pop(), g=(o,a,b)=>(o[b]/o[a]-1)*100, ees=Object.fromEntries(EY.map((y,i)=>[String(y),med[i]]));
  const aY=lastK(VI.alqMes), vY=lastK(VI.ipv), sY=String(Math.min(+aY,eY)), ipcG=y=>yav(A.ipc.es.general,P,y,12);
  const casa={compra:[r2(g(VI.ipv,"2015",vY)),+vY],alquiler:[r2(g(VI.alqMes,"2015",aY)),+aY],sueldo:[r2(g(ees,"2015",sY)),+sY],precios:[r2((ipcG(+aY)/ipcG(2015)-1)*100),+aY]};
  // los contratos: parte de los contratos iniciales que son temporales, media móvil de tres meses
  const tm=RF.periodos.map((p,i)=>{ let ind=0,tem=0; for(const gr of RF.grupos){ const m=gr.mes[i]; if(m){ ind+=m[0]; tem+=m[1]; } } return ind+tem?100*tem/(ind+tem):null; });
  const tm3=tm.map((v,i)=>{ const w=tm.slice(Math.max(0,i-2),i+1).filter(x=>x!=null); return w.length?r1(mean(w)):null; });
  const antes=tm.filter((v,i)=>/^20(19|20|21)-/.test(RF.periodos[i])&&v!=null);
  // infraestructuras: inversión anual en carreteras y ferrocarril (FIT-OCDE), en miles de millones de euros de 2015
  const IF=JSON.parse(rd("data/infra.json")).itf, infra={years:IF.years,road:IF.road_q.map(v=>Math.round(v)/1000),rail:IF.rail_q.map(v=>Math.round(v)/1000)};
  fs.writeFileSync(path.join(OUT,"data","portada.json"),JSON.stringify({cesta,casa,contratos:{meses:RF.periodos,temporales:tm3,antes:r1(mean(antes))},infra}));
}
// el service worker lleva la versión del build
fs.writeFileSync(path.join(OUT,"sw.js"),rd("src/sw.js").replace("__BUILD__",h8(css+js+i18n+CONTENT)).replace("__JS__",JS).replace("__I18N__",I18N).replace("__CSS__",CSS));
fs.writeFileSync(path.join(OUT,"manifest.webmanifest"),rd("manifest.webmanifest").replace(/"\.\/#?(\w*)"/g,(m,k)=>`"/${({inicio:"",preguntas:"preguntas/",municipio:"municipio/",explorar:"laboratorio/"})[k]??""}"`).replace('"scope": "./"','"scope": "/"'));

// ---------- datos para las fichas ----------
const ix=JSON.parse(rd("data/index.json")), CAT=JSON.parse(rd("data/indicadores.json"));
const F={}; ix.fields.forEach((f,i)=>F[f]=i);
const rows=ix.rows; rows.forEach(r=>r[F.name]=disp(r[F.name]));
const PROVS=ix.provs;
const esMean={}; for(const c of CAT){ const k=c.k; if(F[k]==null) continue; let s=0,w=0; for(const r of rows){ const v=r[F[k]], p=r[F.pop]; if(v!=null&&p){ s+=v*p; w+=p; } } esMean[k]=w?s/w:null; }
// la cifra oficial de España cuando existe, la misma que enseña la ficha en la web (esOff en src/app.js)
{ const R=JSON.parse(rd("data/refs.json")), V=JSON.parse(rd("data/vote_refs.json")), pe=R.paro&&R.paro.es, ce=R.census&&R.census.es;
  const i25=(R.paroYears||[]).indexOf(2025); if(pe&&i25>=0) esMean.paroReg=pe.paro[i25]/pe.pob1664*100;
  if(ce&&ce.rented!=null) esMean.alquiler=ce.rented; if(ce&&ce.unemp!=null) esMean.paro=ce.unemp; if(ce&&ce.higherEd!=null) esMean.superiores=ce.higherEd;
  const g=Object.keys(V.es||{}).filter(k=>k.startsWith("02")).sort().pop(); if(g&&V.es[g].turnout!=null){ esMean.part=V.es[g].turnout; esMean.turn23=V.es[g].turnout; } }
const FMT={int:v=>nf0.format(v),pct:v=>nf1.format(v)+" %",pct_chg:v=>(v>0?"+":v<0?"−":"")+nf1.format(Math.abs(v))+" %",pts:v=>(v>0?"+":v<0?"−":"")+nf1.format(Math.abs(v))+" %",eur:v=>nf0.format(v)+" €",eurm2:v=>nf1.format(v)+" €/m²",years:v=>nf1.format(v)+" años",num1:v=>nf1.format(v),km:v=>nf0.format(v)+" km",dens:v=>(v<10?nf1:nf0).format(v)+" hab./km²"};
const fmt=(c,v)=>v==null?"—":(FMT[c.f]||(x=>nf1.format(x)))(v);
const munPath=r=>`/municipio/${r[F.code]}-${slug(r[F.name])}/`;

// ---------- plantilla ----------
const snapshot=route=>{ const p="snapshots/"+(route==="/"?"index":route.replace(/^\/|\/$/g,"").replace(/\//g,"__"))+".html"; return exists(p)?rd(p):null; };
function page({route,title,desc,ogTitle,main,jsonld,ogImage,type="website",robots="",after=""}){
  const canon=SITE.url+route;
  const html=tpl.replace("{{TITLE}}",esc(title)).replace(/\{\{DESC\}\}/g,esc(stripTags(desc))).replace(/\{\{CANON\}\}/g,canon)
    .replace(/\{\{OGTITLE\}\}/g,esc(stripTags(ogTitle||title))).replace("{{OGTYPE}}",type).replace(/\{\{OGIMG\}\}/g,SITE.url+(ogImage||"/og-image.png"))
    .replace("{{ROBOTS}}",robots?`<meta name="robots" content="${robots}">`:"").replace("{{CSS}}",CSS).replace("{{JS}}",JS).replace("{{I18N}}",I18N).replace("{{CONTENT}}",CONTENT)
    .replace("{{JSONLD}}",jsonld?`<script type="application/ld+json">${JSON.stringify(jsonld)}</script>`:"")
    .replace("{{PRELOAD}}",route==="/"?'<link rel="preload" href="/data/portada.json" as="fetch" crossorigin>':route==="/preguntas/"?'<link rel="preload" href="/data/municipios.topo.json" as="fetch" crossorigin>':"").replace("{{BODY}}",body.replace("{{MAIN}}",main).replace("{{AFTER}}",typeof after==="string"?after:"").replace("{{DATAUPD}}",fechaES(SITE.dataUpdated)));
  const dir=path.join(OUT,route); fs.mkdirSync(dir,{recursive:true}); fs.writeFileSync(path.join(dir,"index.html"),html);
}
const breadcrumb=items=>({"@context":"https://schema.org","@type":"BreadcrumbList",itemListElement:items.map(([n,u],i)=>({"@type":"ListItem",position:i+1,name:n,item:SITE.url+u}))});
const sources=`<footer class="method"><details class="srcs"><summary>De dónde salen los datos</summary><p>INE: Atlas de Distribución de Renta de los Hogares, padrón municipal, Censo de Población y Viviendas 2021, censos anuales de población, Estadística de Migraciones, Índice de Precios de Vivienda en Alquiler, viviendas turísticas, Encuesta de Estructura Salarial e IPC. SEPE: paro registrado por municipio. Ministerio del Interior: resultados electorales. Eurostat: gasto público.</p></details></footer>`;
// imágenes para compartir de rankings, provincias y municipios: el build deja la lista en dist/og-extra.json y
// `npm run snapshot` las dibuja en og/<fichero>.jpg (solo las que cambian); el build siguiente ya las enlaza
const OGX=[]; const ogFor=(file,spec)=>{ OGX.push({file,...spec}); return exists("og/"+file+".jpg")?"/og/"+file+".jpg":null; };
// IndexNow (Bing, Yandex…): la clave se publica en /<clave>.txt; .github/workflows/indexnow.yml avisa al publicar
const INDEXNOW_KEY="0b32a63914d9a143d8bf765fc1576ef8";
const urls=[]; const addUrl=(loc,pri,mod)=>urls.push({loc:SITE.url+loc,pri,mod:mod||SITE.dataUpdated});

// ---------- portada ----------
{
  const lead=STUDIES[0];
  const cards=STUDIES.map(S=>`<a href="/preguntas/${S.id}/"><div class="k">${esc(S.m)}${S.ev?` <span class="ev ev-${S.ev}">${esc(EVIDENCE[S.ev].l)}</span>`:""}</div><div class="q">${esc(S.t)}</div><div class="a">${esc(S.a)}</div><div class="go">Ver la respuesta →</div></a>`).join("");
  const main=snapshot("/")||`<section class="qh"><div class="kk2">Preguntas reales. Respuestas con datos públicos.</div><h1 class="qh-q">${esc(lead.t)}</h1><p class="qh-a"><b>${esc(lead.a.split(". ")[0])}.</b> ${esc(lead.a.split(". ").slice(1).join(". "))} <a href="/preguntas/${lead.id}/">Ver la respuesta →</a></p></section>
  <section class="ed-sec"><div class="ed-k">Preguntas respondidas</div><h2 class="ed-h2">Lo que dicen los datos</h2><div class="qg">${cards}</div><p style="margin-top:20px"><a class="ed-go" href="/preguntas/">Todas las preguntas →</a></p></section>
  <section class="ed-sec"><div class="ed-k">Laboratorio</div><h2 class="ed-h2">¿Tienes otra pregunta? Pruébala tú.</h2><p class="ed-lead">Elige dos cosas (el paro y la edad, la renta y el voto…) y mira si van juntas en los ${nf0.format(rows.length)} municipios, si la relación aguanta entre municipios parecidos y qué pasó antes y después de una ley.</p><p><a class="ed-go" href="/laboratorio/">Abrir el laboratorio →</a></p></section>${sources}`;
  page({route:"/",title:PAGES["/"].t,desc:PAGES["/"].d,ogTitle:SITE.name+" · "+SITE.tagline,main,
    jsonld:{"@context":"https://schema.org","@type":"WebSite",name:SITE.name,url:SITE.url,description:SITE.description,inLanguage:"es",author:{"@type":"Person",name:SITE.author.name,url:SITE.author.url},potentialAction:{"@type":"SearchAction",target:SITE.url+"/municipio/?q={search_term_string}","query-input":"required name=search_term_string"}}});
  addUrl("/",1.0);
}

// ---------- preguntas ----------
{
  const cards=[...STUDIES.map(S=>`<a href="/preguntas/${S.id}/"><div class="k"><span class="k-m">${esc(S.m)}</span>${S.ev?` <span class="ev ev-${S.ev}">${esc(EVIDENCE[S.ev].l)}</span>`:""}</div><div class="q">${esc(S.t)}</div><div class="a">${esc(S.a)}</div><div class="go">Ver la respuesta → <time datetime="${S.pub}">${fechaES(S.pub)}</time></div></a>`),
    ...QUICK.map(Q=>`<a href="${Q.href}"><div class="k">${Q.ev?`<span class="ev ev-${Q.ev}">${esc(EVIDENCE[Q.ev].l)}</span>`:""}</div><div class="q">${esc(Q.t)}</div><div class="a">${esc(Q.a)}</div><div class="go">Ver la respuesta →</div></a>`)].join("");
  const main=snapshot("/preguntas/")||`<header class="phead"><h1>Análisis</h1><p class="dek">${esc(PAGES["/preguntas/"].d)}</p></header><div class="qg">${cards}</div>${sources}`;
  page({route:"/preguntas/",title:PAGES["/preguntas/"].t,desc:PAGES["/preguntas/"].d,main,jsonld:{"@context":"https://schema.org","@type":"CollectionPage",name:"Análisis",url:SITE.url+"/preguntas/",hasPart:STUDIES.map(S=>({"@type":"Article",headline:S.t,url:SITE.url+"/preguntas/"+S.id+"/"}))}});
  addUrl("/preguntas/",0.9);
  for(const S of (SHOW_HIDDEN?ALL:STUDIES)){
    const route="/preguntas/"+S.id+"/";
    const main=snapshot(route)||`<nav class="crumbs"><a href="/preguntas/">Análisis</a> › ${esc(S.m)}</nav><header class="phead"><h1>${esc(S.t)}</h1><p class="dek">${esc(S.d)}</p><p class="byline">Por <a href="/quien-soy/">${esc(SITE.author.name)}</a> · <time datetime="${S.pub}">${fechaES(S.pub)}</time> · ${esc(S.m)}</p>${ILLUS[S.id]||""}</header>
      <section class="finding"><h2>La respuesta corta</h2><div class="txt"><p>${esc(S.a)}</p><p>La respuesta completa, con los gráficos y el método paso a paso, se calcula con los datos al abrir la página. <a href="/laboratorio/">Ponla a prueba en el laboratorio →</a></p></div></section>${sources}`;
    const og=exists("og/"+S.id+".png")?"/og/"+S.id+".png":null;
    page({route,title:S.t+" · Indicio",desc:S.a,ogTitle:S.t,main,type:"article",ogImage:og,robots:S.oculto?"noindex":"",
      jsonld:[{"@context":"https://schema.org","@type":"Article",headline:S.t,description:S.d,datePublished:S.pub,dateModified:S.upd||S.pub,inLanguage:"es",author:{"@type":"Person",name:SITE.author.name,url:SITE.author.url},publisher:{"@type":"Organization",name:SITE.name,url:SITE.url},mainEntityOfPage:SITE.url+route,image:SITE.url+(og||"/og-image.png")},
        breadcrumb([["Análisis","/preguntas/"],[S.t,route]]),
        {"@context":"https://schema.org","@type":"FAQPage",mainEntity:[{"@type":"Question",name:S.t,acceptedAnswer:{"@type":"Answer",text:S.a}}]}]});
    if(!S.oculto) addUrl(route,0.8,S.upd||S.pub);
  }
}

// ---------- laboratorio, municipios, quién soy, comparar ----------
for(const route of ["/laboratorio/","/laboratorio/metodo/","/laboratorio/datos/","/municipio/","/quien-soy/","/quien-soy/contacto/","/comparar/"]){
  const P=PAGES[route];
  const main=snapshot(route)||`<header class="phead"><h1>${esc(P.t.replace(" · Indicio",""))}</h1><p class="dek">${esc(P.d)}</p></header><p class="loading">Cargando datos…</p>`;
  page({route,title:P.t,desc:P.d,main,robots:route==="/comparar/"?"noindex,follow":""});
  if(route!=="/comparar/") addUrl(route,route==="/laboratorio/"?0.9:0.6);
}
for(const v of ["mapa","ranking","cruce","grupos","tabla","distribucion","burbujas","paises","matriz","pendientes","piramide","composicion"]){
  const P=PAGES["/laboratorio/"], route="/laboratorio/"+v+"/";
  page({route,title:"Laboratorio · "+v[0].toUpperCase()+v.slice(1)+" · Indicio",desc:P.d,main:`<header class="phead"><h1>Laboratorio</h1><p class="dek">${esc(P.d)}</p></header><p class="loading">Cargando datos…</p>`,robots:"noindex,follow"});
}
// 404
{
  const main=`<header class="phead"><h1>No encontramos esa página</h1><p class="dek">Puede que el enlace sea antiguo. Prueba desde la portada o busca tu municipio arriba.</p></header><p><a class="ed-go" href="/">Ir a la portada →</a></p>`;
  const html=tpl.replace("{{PRELOAD}}","").replace("{{TITLE}}","Página no encontrada · Indicio").replace(/\{\{DESC\}\}/g,"").replace(/\{\{CANON\}\}/g,SITE.url+"/").replace(/\{\{OGTITLE\}\}/g,"Indicio").replace("{{OGTYPE}}","website").replace(/\{\{OGIMG\}\}/g,SITE.url+"/og-image.png").replace("{{ROBOTS}}",'<meta name="robots" content="noindex">').replace("{{CSS}}",CSS).replace("{{JS}}",JS).replace("{{I18N}}",I18N).replace("{{CONTENT}}",CONTENT).replace("{{JSONLD}}","").replace("{{BODY}}",body.replace("{{MAIN}}",main).replace("{{AFTER}}",typeof after==="string"?after:"").replace("{{DATAUPD}}",fechaES(SITE.dataUpdated)));
  fs.writeFileSync(path.join(OUT,"404.html"),html);
}

// ---------- provincias y rankings (para las fichas y las páginas de provincia) ----------
const provSlug=p=>slug(provShort(PROVS[p]));
const byProv={}; for(const r of rows) (byProv[r[F.prov]]=byProv[r[F.prov]]||[]).push(r);
const rankIn=(list,k,desc=true)=>{ const m=new Map(); list.filter(r=>r[F[k]]!=null).sort((a,b)=>desc?b[F[k]]-a[F[k]]:a[F[k]]-b[F[k]]).forEach((r,i)=>m.set(r[F.code],i+1)); return m; };
const RK={}; for(const [p,list] of Object.entries(byProv)) RK[p]={pop:rankIn(list,"pop"),renta:rankIn(list,"renta")};
const ord=n=>n+".º"; const cap1=s=>s?s[0].toUpperCase()+s.slice(1):s; const rk=(n,what)=>n===1?`el municipio ${what}`:`el ${ord(n)} municipio ${what}`;
const catOf=k=>CAT.find(c=>c.k===k)||{};
const srcOf=k=>(catOf(k).src||"").replace(/\.$/,"");
const pctS=v=>nf1.format(v)+" %";
const vsES=(v,m,unit)=>{ if(m==null) return ""; const d=v/m-1; return Math.abs(d)<0.03?"prácticamente igual que la media de España":`un ${nf0.format(Math.abs(d)*100)} % ${d>0?"más":"menos"} que la media de España (${unit(m)})`; };
const ptsES=(v,m)=>{ if(m==null) return ""; const d=v-m; return Math.abs(d)<0.3?"casi igual que la media de España":`${nf1.format(Math.abs(d))} puntos ${d>0?"más":"menos"} que la media de España (${pctS(m)})`; };
const PARTY={PP:"el PP",PSOE:"el PSOE",VOX:"Vox",Vox:"Vox",SUMAR:"Sumar",Sumar:"Sumar"};
// comparación con los municipios de su tamaño en la provincia (da a cada ficha, también a las de pueblos pequeños, un texto propio)
const BANDS=[[0,1000,"de menos de 1.000 habitantes"],[1000,5000,"de 1.000 a 5.000 habitantes"],[5000,20000,"de 5.000 a 20.000 habitantes"],[20000,100000,"de 20.000 a 100.000 habitantes"],[100000,1e9,"de más de 100.000 habitantes"]];
const bandOf=pop=>BANDS.findIndex(b=>pop>=b[0]&&pop<b[1]);
const PEER={}; for(const r of rows){ if(r[F.pop]==null) continue; const k=r[F.prov]+"|"+bandOf(r[F.pop]); (PEER[k]=PEER[k]||[]).push(r); }
const PEERRK={}; for(const [k,list] of Object.entries(PEER)) PEERRK[k]={renta:rankIn(list,"renta"),edad:rankIn(list,"edad",false),paroReg:rankIn(list,"paroReg",false),varPob:rankIn(list,"varPob")};
function peerTxt(r){
  if(r[F.pop]==null) return ""; const b=bandOf(r[F.pop]), k=r[F.prov]+"|"+b, list=PEER[k]||[], n=list.length; if(n<5) return "";
  const code=r[F.code], name=r[F.name], prov=provShort(PROVS[r[F.prov]]), RKp=PEERRK[k];
  const pos=(m,[h1,hN],[l1,lN],mid)=>{ const i=m.get(code), t=m.size; if(!i||t<5) return null; if(i===1) return h1; if(i===t) return l1; if(i<=Math.ceil(t*0.2)) return `${hN} (${ord(i)} de ${t})`; if(i>t-Math.ceil(t*0.2)) return `${lN} (${ord(i)} de ${t})`; return `de la zona media ${mid} (${ord(i)} de ${t})`; };
  const bits=[pos(RKp.renta,["el de más renta por persona","de los de más renta por persona"],["el de menos renta por persona","de los de menos renta por persona"],"en renta"),
    pos(RKp.edad,["el de población más joven","de los de población más joven"],["el de población más envejecida","de los de población más envejecida"],"en edad"),
    pos(RKp.paroReg,["el de menos paro registrado","de los de menos paro registrado"],["el de más paro registrado","de los de más paro registrado"],"en paro"),
    pos(RKp.varPob,["el que más ha crecido desde 2015","de los que más han crecido desde 2015"],["el que más población ha perdido desde 2015","de los que más población han perdido desde 2015"],"en crecimiento de la población")].filter(Boolean);
  if(!bits.length) return "";
  return `Entre los ${nf0.format(n)} municipios ${BANDS[b][2]} de la provincia de ${prov}, ${name} es ${bits.length>1?bits.slice(0,-1).join(", ")+" y "+bits[bits.length-1]:bits[0]}.`;
}
// preguntas y respuestas de cada ficha: frases autocontenidas (con fuente y año) para buscadores y asistentes
function munFAQ(r){
  const name=r[F.name], P=r[F.prov], prov=provShort(PROVS[P]), code=r[F.code], n=byProv[P].length, v=k=>r[F[k]], out=[];
  if(v("pop")!=null) out.push([`¿Cuántos habitantes tiene ${name}?`,`${name} tiene ${nf0.format(v("pop"))} habitantes según el padrón de 2025 (INE). Es ${rk(RK[P].pop.get(code),"más poblado")} de los ${nf0.format(n)} de la provincia de ${prov}${v("varPob")!=null?`, y desde 2015 su población ha ${v("varPob")>=0?"crecido":"bajado"} un ${nf1.format(Math.abs(v("varPob")))} %`:""}.`]);
  if(v("renta")!=null) out.push([`¿Cuál es la renta media en ${name}?`,`La renta neta media por persona en ${name} es de ${nf0.format(v("renta"))} € al año, ${vsES(v("renta"),esMean.renta,x=>nf0.format(x)+" €")}${v("rentaHog")!=null?`; por hogar, ${nf0.format(v("rentaHog"))} €`:""}. Es ${rk(RK[P].renta.get(code),"con más renta por persona")} de la provincia de ${prov}. Fuente: ${srcOf("renta")}.`]);
  if(v("paroReg")!=null) out.push([`¿Cuánto paro hay en ${name}?`,`En ${name} el paro registrado es del ${pctS(v("paroReg"))} de la población de 16 a 64 años (media de 2025, SEPE), ${ptsES(v("paroReg"),esMean.paroReg)}.${v("paroCensal")!=null?` La tasa de paro, que cuenta los parados por cada 100 personas que trabajan o buscan trabajo, era del ${pctS(v("paroCensal"))} en el censo anual de 2024 (INE).`:""}`]);
  if(v("edad")!=null) out.push([`¿Qué edad media tiene la población de ${name}?`,`La edad media en ${name} es de ${nf1.format(v("edad"))} años${esMean.edad!=null?` (España: ${nf1.format(esMean.edad)})`:""}${v("mayores65")!=null?`, y el ${pctS(v("mayores65"))} de sus vecinos tiene más de 65 años`:""}${v("extr")!=null?`. El ${pctS(v("extr"))} tiene nacionalidad extranjera`:""}. Fuente: ${srcOf("edad")}.`]);
  if(v("alquiler")!=null) out.push([`¿Cuántos hogares viven de alquiler en ${name}?`,`En ${name} el ${pctS(v("alquiler"))} de los hogares vive de alquiler, ${ptsES(v("alquiler"),esMean.alquiler)}, según el Censo de 2021.${v("alqVar")!=null?` El alquiler declarado ha subido un ${nf1.format(v("alqVar"))} % entre 2015 y 2024 (Índice de Precios de Vivienda en Alquiler del INE).`:""}`]);
  const peers=peerTxt(r); if(peers) out.push([`¿Cómo es ${name} comparado con municipios parecidos?`,peers]);
  if(v("win23")) out.push([`¿Quién ganó las elecciones generales de 2023 en ${name}?`,`En las elecciones generales de julio de 2023 ganó ${PARTY[v("win23")]||v("win23")} en ${name}.${["pp","psoe","vox","sumar"].some(k=>v(k)!=null)?` Resultados: ${[["PP","pp"],["PSOE","psoe"],["Vox","vox"],["Sumar","sumar"]].filter(([,k])=>v(k)!=null).map(([l,k])=>`${l} ${pctS(v(k))}`).join(", ")}.`:""}${v("part")!=null?` Participación: ${pctS(v("part"))}.`:""}`]);
  return out;
}

// ---------- fichas municipales (una por municipio) ----------
const munUrls=[]; let nMun=0;
const KEY=["pop","renta","rentaHog","varPob","var0525","edad","paroReg","alquiler","part","superiores","pobreza","gini"];
const groups=[...new Set(CAT.map(c=>c.g))];
for(const r of rows){
  const code=r[F.code], name=r[F.name], prov=provShort(PROVS[r[F.prov]]), route=munPath(r), pop=r[F.pop], renta=r[F.renta];
  const vs=(k)=>r[F[k]];
  const lead=`<b>${pop!=null?nf0.format(pop)+" habitantes":"Municipio de la provincia de "+esc(prov)}</b>${vs("varPob")!=null?`, un ${nf0.format(Math.abs(vs("varPob")))} % ${vs("varPob")>=0?"más":"menos"} que en 2015`:""}.${renta!=null?` Cada vecino ingresa de media ${nf0.format(renta)} € netos al año${esMean.renta?` (${Math.abs(renta/esMean.renta-1)<0.03?"como la media de España":`un ${nf0.format(Math.abs(renta/esMean.renta-1)*100)} % ${renta>esMean.renta?"por encima":"por debajo"} de la media de España`})`:""}.`:""}`;
  const table=groups.map(g=>{ const cs=CAT.filter(c=>c.g===g&&F[c.k]!=null&&r[F[c.k]]!=null); if(!cs.length) return ""; return `<tr class="grp"><th colspan="3">${esc(g)}</th></tr>`+cs.map(c=>`<tr><td>${esc(c.l)}</td><td class="r num">${fmt(c,r[F[c.k]])}</td><td class="r num muted">${esMean[c.k]!=null?fmt(c,esMean[c.k]):"—"}</td></tr>`).join(""); }).join("");
  const desc=`${name} (${prov}): ${pop!=null?nf0.format(pop)+" habitantes":""}${renta!=null?", renta media de "+nf0.format(renta)+" € por persona":""}${vs("paroReg")!=null?", paro registrado del "+nf1.format(vs("paroReg"))+" %":""}. Renta, población, paro, vivienda y voto comparados con España.`;
  const main=`<nav class="crumbs"><a href="/municipio/">Municipios</a> › <a href="/provincia/${provSlug(r[F.prov])}/">Provincia de ${esc(prov)}</a></nav><header class="phead"><h1>${esc(name)}</h1><p class="dek">${lead}</p><p class="muted">Código INE ${code}.</p></header>
    <section class="finding"><h2>Todos los datos de ${esc(name)}</h2><table class="glance"><thead><tr><th>Dato</th><th class="r">${esc(name)}</th><th class="r">España</th></tr></thead><tbody>${table}</tbody></table><p class="muted" style="font-size:13px">La media de España es la de sus municipios, ponderada por población. Al abrir la página se cargan los gráficos, la evolución desde 2015 y los municipios parecidos.</p></section>
    <section class="finding"><h2>Compáralo</h2><div class="txt"><p><a href="/laboratorio/cruce/?d=renta,paroReg&t=g1&m=${code}">Verlo en el laboratorio →</a> · <a href="/comparar/${code}/">Comparar con otro municipio →</a></p></div></section>${sources}`;
  const faq=munFAQ(r), plist=byProv[r[F.prov]].slice().sort((a,b)=>(b[F.pop]||0)-(a[F.pop]||0)), pi=plist.indexOf(r);
  const near=plist.slice(Math.max(0,pi-5),pi).concat(plist.slice(pi+1,pi+6)).slice(0,10);
  const after=`<div class="wrap seo-extra" data-key="m${code}"><section class="finding faq"><h2>Preguntas frecuentes sobre ${esc(name)}</h2>${faq.map(([q,a])=>`<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join("")}</section>
    <section class="finding"><h2>Otros municipios de la provincia de ${esc(prov)}</h2><p class="near">${near.map(x=>`<a href="${munPath(x)}">${esc(x[F.name])}</a>`).join(" · ")}</p><p><a href="/provincia/${provSlug(r[F.prov])}/">Los ${nf0.format(plist.length)} municipios de la provincia de ${esc(prov)}, con su renta, población y paro →</a> · <a href="/rankings/">Rankings de municipios de España →</a></p><p class="muted" style="font-size:13px">Datos actualizados el ${fechaES(SITE.dataUpdated)}. Cada cifra indica su fuente y su año.</p></section></div>`;
  const jsonld=[{"@context":"https://schema.org","@type":"City",name,url:SITE.url+route,identifier:code,containedInPlace:{"@type":"AdministrativeArea",name:"Provincia de "+prov,url:SITE.url+"/provincia/"+provSlug(r[F.prov])+"/"},...(pop!=null?{population:pop}:{})},
    breadcrumb([["Municipios","/municipio/"],["Provincia de "+prov,"/provincia/"+provSlug(r[F.prov])+"/"],[name,route]]),
    {"@context":"https://schema.org","@type":"WebPage",name:`${name}: renta, población, paro y vivienda`,url:SITE.url+route,inLanguage:"es",dateModified:SITE.dataUpdated,about:{"@type":"City",name},author:{"@type":"Person",name:SITE.author.name,url:SITE.author.url},publisher:{"@type":"Organization",name:SITE.name,url:SITE.url}},
    ...(faq.length?[{"@context":"https://schema.org","@type":"FAQPage",mainEntity:faq.map(([q,a])=>({"@type":"Question",name:q,acceptedAnswer:{"@type":"Answer",text:a}}))}]:[])];
  const ogImage=pop>=20000?ogFor("m-"+code,{k:"Provincia de "+prov,t:name,stats:[["Habitantes",nf0.format(pop),vs("varPob")!=null?`${vs("varPob")>=0?"+":"−"}${nf1.format(Math.abs(vs("varPob")))} % desde 2015`:""],["Renta por persona",renta!=null?nf0.format(renta)+" €":"—",renta!=null?`España: ${nf0.format(esMean.renta)} €`:""],["Paro registrado",vs("paroReg")!=null?pctS(vs("paroReg")):"—",`España: ${pctS(esMean.paroReg)}`]]}):null;
  page({route,title:`${name}: renta, población, paro y vivienda · Indicio`,desc,ogTitle:`${name} en datos`,main,jsonld,after,ogImage});
  munUrls.push({loc:SITE.url+route,pri:pop>=20000?0.6:0.4}); nMun++;
}

// ---------- páginas de provincia: todos sus municipios con los datos clave ----------
// Orden por columnas: pulsar el título ordena de mayor a menor (el nombre, de la A a la Z); pulsarlo otra vez invierte.
// Los municipios sin dato quedan siempre al final. Sin JavaScript, la tabla sigue ordenada por habitantes.
const PROVSORT=`<script>(function(){var s=document.getElementById("provtab");if(!s)return;var tb=s.querySelector("tbody"),h=document.getElementById("provtab-h"),n=tb.rows.length,
btn=s.querySelectorAll(".sortb"),k="pop",desc=true,T={pop:"habitantes",renta:"renta por persona",paro:"paro registrado",edad:"edad media",name:"orden alfabético"},cols={name:0,pop:1,renta:2,paro:3,edad:4},
rows=[].slice.call(tb.rows),col=function(r,c){return r.cells[c].getAttribute("data-v")};
function draw(){var c=cols[k];rows.sort(function(a,b){var x=col(a,c),y=col(b,c);if(k!=="name"){var ex=x==="",ey=y==="";if(ex||ey)return ex&&ey?0:ex?1:-1;x=+x;y=+y;}
var d=k==="name"?x.localeCompare(y,"es"):x-y;return desc?-d:d;});rows.forEach(function(r){tb.appendChild(r)});
btn.forEach(function(b){var on=b.getAttribute("data-k")===k,lab=b.getAttribute("data-l")||b.textContent.replace(/ [↑↓]$/,"");b.setAttribute("data-l",lab);b.className="sortb"+(on?" on":"");b.textContent=lab+(on?(desc?" ↓":" ↑"):"");b.parentNode.setAttribute("aria-sort",on?(desc?"descending":"ascending"):"none")});
h.textContent="Los "+n.toLocaleString("es-ES")+" municipios, "+(k==="pop"?(desc?"de más a menos habitantes":"de menos a más habitantes"):k==="name"?(desc?"de la Z a la A":"por orden alfabético"):"ordenados por "+T[k]+(desc?", de mayor a menor":", de menor a mayor"));}
btn.forEach(function(b){b.addEventListener("click",function(){var nk=b.getAttribute("data-k");if(nk===k)desc=!desc;else{k=nk;desc=nk!=="name"}draw()})});})();</script>`;
{
  const plist=Object.keys(byProv).sort((a,b)=>provShort(PROVS[a]).localeCompare(provShort(PROVS[b]),"es"));
  // Índice: mapa de España por provincias (contornos ya proyectados en data/mapa-provincias.json; los genera
  // scripts/datos/mapa-provincias.mjs). Cada provincia es un enlace real, así que funciona sin JavaScript. El script
  // solo añade el panel que cambia al pasar el ratón y el conmutador provincias/comunidades.
  const MAPA=JSON.parse(rd("data/mapa-provincias.json"));
  const nfG=new Intl.NumberFormat("es-ES",{useGrouping:"always",maximumFractionDigits:0});
  const total=plist.reduce((s,p)=>s+byProv[p].length,0);
  const binOf=n=>n<=60?0:n<=120?1:n<=200?2:n<=260?3:4;
  const BINS=["Hasta 60","61–120","121–200","201–260","Más de 260"];
  const ccOf={}; MAPA.ccaa.forEach(c=>c.provs.forEach(id=>{ccOf[id]=c.id;}));
  const pAttrs=p=>{ const n=byProv[p].length, name=provShort(PROVS[p]); return `class="pm b${binOf(n)}" href="/provincia/${provSlug(p)}/" data-id="${p}" data-cc="${ccOf[p]}" data-name="${esc(name)}" data-n="${n}" aria-label="${esc(name)}: ${n} ${n===1?"municipio":"municipios"}"`; };
  const provSvg=plist.filter(p=>MAPA.provs[p]).map(p=>`<a ${pAttrs(p)}><path d="${MAPA.provs[p]}"/></a>`).join("");
  const ptsSvg=plist.filter(p=>MAPA.pts[p]).map(p=>`<a ${pAttrs(p)}><circle cx="${MAPA.pts[p][0]}" cy="${MAPA.pts[p][1]}" r="7"/></a>`).join("");
  const pmScript=`<script>(function(){var root=document.getElementById("pmap");if(!root)return;
var CC=${JSON.stringify(MAPA.ccaa)},by={},ccById={},ccOf={},mode="prov",cur=null,nf=function(n){return n.toLocaleString("es-ES",{useGrouping:"always"})},w=function(n){return nf(n)+(n===1?" municipio":" municipios")};
[].forEach.call(root.querySelectorAll("a.pm"),function(a){by[a.getAttribute("data-id")]={id:a.getAttribute("data-id"),name:a.getAttribute("data-name"),n:+a.getAttribute("data-n"),a:a}});
CC.forEach(function(c){ccById[c.id]=c;c.provs.forEach(function(id){ccOf[id]=c.id})});
var K=root.querySelector(".pmap-k"),T=root.querySelector(".pmap-t"),S=root.querySelector(".pmap-s"),G=root.querySelector(".pmap-go"),R=root.querySelector(".pmap-rows"),H=root.querySelector(".pmap-rh"),seg=root.querySelector(".pmap-seg"),btn=seg.querySelectorAll("button");
var d0={k:K.textContent,t:T.textContent,s:S.textContent};
function sum(c){return c.provs.reduce(function(s,id){return s+by[id].n},0)}
var last="";function rows(head,items){var sig=head+"|"+items.map(function(i){return i.name}).join();if(sig===last)return;last=sig;R.textContent="";if(!items.length){R.hidden=true;H.hidden=true;last="";return}H.textContent=head;H.hidden=false;R.hidden=false;
items.forEach(function(it){var a=document.createElement("a");a.href=it.href||"#";var x=document.createElement("span");x.textContent=it.name;var y=document.createElement("span");y.textContent=it.n;a.appendChild(x);a.appendChild(y);
if(it.p){a.addEventListener("mouseenter",function(){set(it.p,null)});a.addEventListener("focus",function(){set(it.p,null)})}else if(it.c){a.addEventListener("mouseenter",function(){set(null,it.c)});a.addEventListener("focus",function(){set(null,it.c)});if(!it.href)a.addEventListener("click",function(e){e.preventDefault()})}
R.appendChild(a)})}
function draw(){var p=cur&&cur.p,c=cur&&cur.c,cc=c?ccById[c]:null;
Object.keys(by).forEach(function(id){var a=by[id].a,cl=a.getAttribute("class").replace(/ (on|dim)(?= |$)/g,"");if(mode==="prov"&&p===id)cl+=" on";if(mode==="ccaa"&&cc&&ccOf[id]!==c)cl+=" dim";a.setAttribute("class",cl)});
G.hidden=true;
if(mode==="prov"&&p){var x=by[p];K.textContent=cc.name;T.textContent=x.name;S.textContent=w(x.n);G.href=x.a.getAttribute("href");G.hidden=false;
rows("Provincias de "+cc.name,cc.provs.length>1?cc.provs.map(function(id){return by[id]}).sort(function(a,b){return a.name.localeCompare(b.name,"es")}).map(function(q){return{name:q.name,n:q.n,p:q.id,href:q.a.getAttribute("href")}}):[])}
else if(mode==="ccaa"&&cc){var t=sum(cc),np=cc.provs.length;K.textContent=(cc.id==="ceu"||cc.id==="mel")?"Ciudad autónoma":"Comunidad autónoma";T.textContent=cc.name;S.textContent=w(t)+(np>1?" en "+np+" provincias":"");
rows("Provincias",np>1?cc.provs.map(function(id){return by[id]}).sort(function(a,b){return a.name.localeCompare(b.name,"es")}).map(function(q){return{name:q.name,n:q.n,c:cc.id,href:q.a.getAttribute("href")}}):[])}
else{K.textContent=d0.k;T.textContent=d0.t;S.textContent=d0.s;
rows("Comunidades y ciudades autónomas",mode==="ccaa"?CC.slice().sort(function(a,b){return a.name.localeCompare(b.name,"es")}).map(function(c2){return{name:c2.name,n:nf(sum(c2)),c:c2.id}}):[])}}
function set(p,c){cur=(p||c)?{p:p,c:p?ccOf[p]:c}:null;draw()}
Object.keys(by).forEach(function(id){var a=by[id].a;["mouseenter","focus"].forEach(function(ev){a.addEventListener(ev,function(){set(id,null)})});});
root.addEventListener("mouseleave",function(){set(null,null)});root.addEventListener("focusout",function(e){if(!e.relatedTarget||!root.contains(e.relatedTarget))set(null,null)});
btn.forEach(function(b){b.addEventListener("click",function(){mode=b.getAttribute("data-m");root.setAttribute("data-mode",mode);[].forEach.call(btn,function(o){o.setAttribute("aria-pressed",o===b?"true":"false")});set(null,null)})});
seg.hidden=false;})();</script>`;
  const idx=`<header class="phead"><h1>Municipios por provincia</h1><p class="dek">Renta, población, paro y edad de todos los municipios de España, provincia a provincia.</p></header>
    <div class="pmap" id="pmap" data-mode="prov">
      <div class="pmap-map">
        <p class="pmap-cta"><b>Pulsa tu provincia</b> para ver todos sus municipios, con su renta, población, paro y edad.</p>
        <svg class="pmap-svg" viewBox="${MAPA.viewBox}" role="group" aria-label="Mapa de España por provincias">
          <path class="pmap-box" d="${MAPA.border}"/>
          <text class="pmap-lab" x="-18" y="542">Canarias</text><text class="pmap-lab" x="446" y="536">Ceuta</text><text class="pmap-lab" x="573" y="573">Melilla</text>
          ${provSvg}${ptsSvg}
          <path class="pmap-reg" d="${MAPA.regions}"/>
        </svg>
      </div>
      <aside class="pmap-side">
        <div class="pmap-seg" role="group" aria-label="Qué quieres explorar" hidden><button type="button" data-m="prov" aria-pressed="true">Provincias</button><button type="button" data-m="ccaa" aria-pressed="false">Comunidades</button></div>
        <div class="pmap-read" aria-live="polite">
          <div class="pmap-k">España</div>
          <div class="pmap-t">${nfG.format(total)} municipios</div>
          <div class="pmap-s">repartidos en ${plist.length} provincias, dentro de 17 comunidades autónomas y 2 ciudades autónomas.</div>
          <div class="pmap-go-w"><a class="pmap-go" href="#" hidden>Ver sus municipios →</a></div>
        </div>
        <div><div class="pmap-rh" hidden></div><div class="pmap-rows" hidden></div></div>
        <div class="pmap-key">
          <div class="pmap-kh">Municipios de cada provincia</div>
          ${BINS.map((l,i)=>`<span><i class="pm b${i}"></i>${l}</span>`).join("")}
          <div class="pmap-lines"><span><svg width="22" height="14" viewBox="0 0 22 14" aria-hidden="true"><line x1="0" y1="7" x2="22" y2="7" stroke="currentColor" stroke-width="2.4"/></svg>Límite de comunidad autónoma</span><span><svg width="22" height="14" viewBox="0 0 22 14" aria-hidden="true"><rect width="22" height="14" fill="#cf9aa2"/><line x1="0" y1="7" x2="22" y2="7" stroke="var(--bg)" stroke-width="1.4"/></svg>Límite de provincia</span></div>
        </div>
      </aside>
    </div>
    <details class="pmap-list"><summary>Ver la lista de provincias</summary><ul>${plist.map(p=>`<li><a href="/provincia/${provSlug(p)}/">${esc(provShort(PROVS[p]))}</a> <small>${nf0.format(byProv[p].length)}</small></li>`).join("")}</ul></details>${pmScript}${sources}`;
  page({route:"/provincia/",title:"Municipios por provincia: renta, población y paro · Indicio",desc:"Todos los municipios de cada provincia de España con su renta por persona, población, paro registrado y edad media.",main:idx,jsonld:breadcrumb([["Municipios","/municipio/"],["Provincias","/provincia/"]])});
  addUrl("/provincia/",0.7);
  for(const p of plist){
    const list=byProv[p].slice().sort((a,b)=>(b[F.pop]||0)-(a[F.pop]||0)), prov=provShort(PROVS[p]), route="/provincia/"+provSlug(p)+"/";
    const tot=list.reduce((s,r)=>s+(r[F.pop]||0),0), wm=k=>{ let a=0,w=0; for(const r of list){ if(r[F[k]]!=null&&r[F.pop]){ a+=r[F[k]]*r[F.pop]; w+=r[F.pop]; } } return w?a/w:null; };
    const top=(k,desc=true,min=1000)=>list.filter(r=>r[F[k]]!=null&&(r[F.pop]||0)>=min).sort((a,b)=>desc?b[F[k]]-a[F[k]]:a[F[k]]-b[F[k]])[0];
    const rich=top("renta"), poor=top("renta",false), paroHi=top("paroReg"), young=top("edad",false), cap=list[0];
    const L=r=>`<a href="${munPath(r)}">${esc(r[F.name])}</a>`;
    const facts=[
      `La provincia de ${prov} tiene ${nf0.format(list.length)} municipios y ${nf0.format(tot)} habitantes (padrón de 2025). El más poblado es ${cap[F.name]}, con ${nf0.format(cap[F.pop])}.`,
      rich&&poor&&rich!==poor?`Entre los municipios de más de 1.000 habitantes, el de más renta por persona es ${rich[F.name]} (${nf0.format(rich[F.renta])} €) y el de menos, ${poor[F.name]} (${nf0.format(poor[F.renta])} €). La media de la provincia es de ${nf0.format(wm("renta"))} € (España: ${nf0.format(esMean.renta)} €), según el ${srcOf("renta")}.`:"",
      paroHi?`El paro registrado más alto entre los de más de 1.000 habitantes está en ${paroHi[F.name]} (${pctS(paroHi[F.paroReg])} de la población de 16 a 64 años); la media de la provincia es del ${pctS(wm("paroReg"))} (SEPE, media de 2025).`:"",
      young?`El municipio más joven de más de 1.000 habitantes es ${young[F.name]}, con una edad media de ${nf1.format(young[F.edad])} años.`:""].filter(Boolean);
    const cell=(r,k,f)=>r[F[k]]==null?"—":f(r[F[k]]);
    const main=`<nav class="crumbs"><a href="/municipio/">Municipios</a> › <a href="/provincia/">Provincias</a></nav><header class="phead"><h1>Municipios de la provincia de ${esc(prov)}</h1><p class="dek">${esc(facts[0])}</p></header>
      <section class="finding"><div class="txt">${facts.slice(1).map(f=>`<p>${esc(f)}</p>`).join("")}</div></section>
      <section class="finding" id="provtab"><h2 id="provtab-h">Los ${nf0.format(list.length)} municipios, de más a menos habitantes</h2><div class="extable"><table class="glance"><thead><tr><th aria-sort="none"><button type="button" class="sortb" data-k="name" style="text-align:left">Municipio</button></th><th class="r" aria-sort="descending"><button type="button" class="sortb on" data-k="pop">Habitantes ↓</button></th><th class="r" aria-sort="none"><button type="button" class="sortb" data-k="renta">Renta por persona</button></th><th class="r" aria-sort="none"><button type="button" class="sortb" data-k="paro">Paro registrado</button></th><th class="r" aria-sort="none"><button type="button" class="sortb" data-k="edad">Edad media</button></th></tr></thead><tbody>
      ${list.map(r=>{ const v=k=>r[F[k]]==null?"":r[F[k]]; return `<tr><td data-v="${esc(r[F.name])}">${L(r)}</td><td class="r num" data-v="${v("pop")}">${cell(r,"pop",nf0.format)}</td><td class="r num" data-v="${v("renta")}">${cell(r,"renta",x=>nf0.format(x)+" €")}</td><td class="r num" data-v="${v("paroReg")}">${cell(r,"paroReg",pctS)}</td><td class="r num" data-v="${v("edad")}">${cell(r,"edad",x=>nf1.format(x))}</td></tr>`; }).join("")}
      </tbody></table></div><p class="muted" style="font-size:13px">Renta: ${esc(srcOf("renta"))}. Paro registrado: SEPE, media de 2025, sobre la población de 16 a 64 años. Edad: ${esc(srcOf("edad"))}. En los municipios muy pequeños el INE no publica todos los datos.</p></section>
      <section class="finding"><div class="txt"><p><a href="/laboratorio/mapa/?d=renta&p=${p}">Ver la provincia en el mapa del laboratorio →</a> · <a href="/provincia/">Otras provincias →</a></p></div></section>${sources}`;
    const after=PROVSORT;
    const ogImage=ogFor("p-"+provSlug(p),{k:"Provincia de "+prov,t:`Los ${nf0.format(list.length)} municipios de ${prov}`,text:rich&&poor&&rich!==poor?`El de más renta: ${rich[F.name]} (${nf0.format(rich[F.renta])} €). El de menos: ${poor[F.name]} (${nf0.format(poor[F.renta])} €).`:facts[0]});
    page({route,title:`Municipios de ${prov}: renta, población y paro · Indicio`,desc:facts.slice(0,2).join(" ").slice(0,300),ogTitle:`Municipios de la provincia de ${prov}`,main,after,ogImage,
      jsonld:[breadcrumb([["Municipios","/municipio/"],["Provincias","/provincia/"],["Provincia de "+prov,route]]),{"@context":"https://schema.org","@type":"Dataset",name:`Municipios de la provincia de ${prov}: renta, población, paro y edad`,description:facts.join(" "),url:SITE.url+route,license:"https://creativecommons.org/licenses/by/4.0/",creator:{"@type":"Person",name:SITE.author.name,url:SITE.author.url},isBasedOn:["https://www.ine.es","https://www.sepe.es"],spatialCoverage:{"@type":"Place",name:"Provincia de "+prov+", España"},variableMeasured:["Habitantes","Renta neta media por persona","Paro registrado","Edad media"]}]});
    addUrl(route,0.7);
  }
}

// ---------- rankings nacionales de municipios ----------
{
  const RANKS=[
    {id:"municipios-mas-ricos",k:"renta",desc:true,t:"Los municipios más ricos de España",q:"¿Cuáles son los municipios con más renta de España?",what:"renta neta media por persona",f:x=>nf0.format(x)+" €"},
    {id:"municipios-mas-pobres",k:"renta",desc:false,t:"Los municipios con menos renta de España",q:"¿Cuáles son los municipios con menos renta de España?",what:"renta neta media por persona",f:x=>nf0.format(x)+" €"},
    {id:"municipios-con-mas-paro",k:"paroReg",desc:true,t:"Los municipios con más paro de España",q:"¿Dónde hay más paro en España?",what:"paro registrado sobre la población de 16 a 64 años (media de 2025, SEPE)",f:pctS},
    {id:"municipios-con-menos-paro",k:"paroReg",desc:false,t:"Los municipios con menos paro de España",q:"¿Dónde hay menos paro en España?",what:"paro registrado sobre la población de 16 a 64 años (media de 2025, SEPE)",f:pctS},
    {id:"municipios-que-mas-crecen",k:"varPob",desc:true,t:"Los municipios que más crecen de España",q:"¿Qué municipios ganan más población?",what:"crecimiento de la población entre 2015 y 2025 (padrón)",f:x=>(x>0?"+":x<0?"−":"")+pctS(Math.abs(x))},
    {id:"municipios-que-mas-poblacion-pierden",k:"varPob",desc:false,t:"Los municipios que más población pierden",q:"¿Qué municipios se están vaciando?",what:"cambio de la población entre 2015 y 2025 (padrón)",f:x=>(x>0?"+":x<0?"−":"")+pctS(Math.abs(x))},
    {id:"municipios-mas-envejecidos",k:"edad",desc:true,t:"Los municipios más envejecidos de España",q:"¿Cuáles son los pueblos más envejecidos de España?",what:"edad media de la población",f:x=>nf1.format(x)+" años"},
    {id:"municipios-mas-jovenes",k:"edad",desc:false,t:"Los municipios más jóvenes de España",q:"¿Cuáles son los municipios más jóvenes de España?",what:"edad media de la población",f:x=>nf1.format(x)+" años"},
    {id:"donde-mas-sube-el-alquiler",k:"alqVar",desc:true,t:"Dónde más ha subido el alquiler",q:"¿Dónde ha subido más el alquiler desde 2015?",what:"subida del alquiler declarado entre 2015 y 2024 (Índice de Precios de Vivienda en Alquiler del INE)",f:x=>"+"+pctS(x)},
    {id:"municipios-con-mas-pisos-turisticos",k:"vt",desc:true,t:"Los municipios con más pisos turísticos",q:"¿Dónde hay más pisos turísticos?",what:"viviendas turísticas sobre el total de viviendas",f:pctS},
    {id:"municipios-con-mas-extranjeros",k:"extr",desc:true,t:"Los municipios con más población extranjera",q:"¿Qué municipios tienen más población extranjera?",what:"población con nacionalidad extranjera",f:pctS},
    {id:"municipios-mas-desiguales",k:"gini",desc:true,t:"Los municipios más desiguales de España",q:"¿Dónde hay más desigualdad de renta?",what:"índice de Gini de la renta (0 = todos igual, 100 = uno lo tiene todo)",f:x=>nf1.format(x)},
    {id:"municipios-con-mas-universitarios",k:"superiores",desc:true,t:"Los municipios con más universitarios",q:"¿Dónde vive la población con más estudios?",what:"adultos con estudios superiores (Censo de 2021)",f:pctS}];
  const L=r=>`<a href="${munPath(r)}">${esc(r[F.name])}</a>`, PL=r=>`<a href="/provincia/${provSlug(r[F.prov])}/">${esc(provShort(PROVS[r[F.prov]]))}</a>`;
  const pick=(R,min,max=1e9)=>rows.filter(r=>r[F[R.k]]!=null&&!(R.k==="paroReg"&&r[F[R.k]]<=0)&&(r[F.pop]||0)>=min&&(r[F.pop]||0)<max).sort((a,b)=>R.desc?b[F[R.k]]-a[F[R.k]]:a[F[R.k]]-b[F[R.k]]);
  const tbl=(list,R,n)=>`<div class="extable"><table class="glance"><thead><tr><th>#</th><th>Municipio</th><th>Provincia</th><th class="r">${esc(cap1(catOf(R.k).l||R.what))}</th><th class="r">Habitantes</th></tr></thead><tbody>${list.slice(0,n).map((r,i)=>`<tr><td class="muted">${i+1}</td><td>${L(r)}</td><td>${PL(r)}</td><td class="r num">${R.f(r[F[R.k]])}</td><td class="r num">${nf0.format(r[F.pop])}</td></tr>`).join("")}</tbody></table></div>`;
  const RK_ARROW=`<svg class="rk-ar" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`;
  const RK_GROUPS=[
    ["Renta y desigualdad",["municipios-mas-ricos","municipios-mas-pobres","municipios-mas-desiguales"],false],
    ["Empleo y estudios",["municipios-con-mas-paro","municipios-con-menos-paro","municipios-con-mas-universitarios"],false],
    ["Población",["municipios-que-mas-crecen","municipios-que-mas-poblacion-pierden","municipios-mas-envejecidos","municipios-mas-jovenes","municipios-con-mas-extranjeros"],true],
    ["Vivienda",["donde-mas-sube-el-alquiler","municipios-con-mas-pisos-turisticos"],true]];
  const RK_PER={"municipios-mas-ricos":"Renta neta por persona","municipios-mas-pobres":"Renta neta por persona","municipios-mas-desiguales":"Índice de Gini de la renta","municipios-con-mas-paro":"Paro registrado, media de 2025","municipios-con-menos-paro":"Paro registrado, media de 2025","municipios-con-mas-universitarios":"Estudios superiores, censo de 2021","municipios-que-mas-crecen":"Desde 2015","municipios-que-mas-poblacion-pierden":"Desde 2015","municipios-mas-envejecidos":"Edad media","municipios-mas-jovenes":"Edad media","municipios-con-mas-extranjeros":"Con nacionalidad extranjera","donde-mas-sube-el-alquiler":"Desde 2015","municipios-con-mas-pisos-turisticos":"Sobre el total de viviendas"};
  const rkCard=id=>{const R=RANKS.find(x=>x.id===id), top=pick(R,1000)[0]; if(!top) return "";
    return `<a class="rk-card" href="/rankings/${R.id}/"><span class="rk-t">${esc(R.t)}</span><span class="rk-fig"><span class="rk-v">${esc(R.f(top[F[R.k]]))}</span><span class="rk-n"><span>${esc(top[F.name])} · ${esc(provShort(PROVS[top[F.prov]]))}</span>${RK_ARROW}</span><small>${esc(RK_PER[id]||"")}</small></span></a>`};
  const rkGrid=`<div class="rk-grid">${RK_GROUPS.map(([h,ids])=>`<section class="rk-box"><h2>${h}</h2><div class="rk-rows">${ids.map(rkCard).join("")}</div></section>`).join("")}</div>`;
  const idx=`<nav class="crumbs"><a href="/municipio/">Municipios</a></nav><header class="phead"><h1>Rankings de municipios de España</h1><p class="dek">Los municipios con más y menos renta, paro, población, edad, alquiler o pisos turísticos, con los datos oficiales más recientes.</p></header>
    ${rkGrid}${sources}`;
  page({route:"/rankings/",title:"Rankings de municipios de España · Indicio",desc:"Los municipios más ricos, con más paro, más envejecidos, que más crecen, con más pisos turísticos… con datos oficiales del INE y el SEPE.",main:idx,jsonld:breadcrumb([["Municipios","/municipio/"],["Rankings","/rankings/"]])});
  addUrl("/rankings/",0.8);
  for(const R of RANKS){
    const route="/rankings/"+R.id+"/", big=pick(R,1000), cities=pick(R,50000), all=pick(R,0);
    if(!big.length) continue;
    const src=srcOf(R.k), top3=big.slice(0,3), c1=cities[0];
    const lead=`Entre los municipios de más de 1.000 habitantes, encabeza la lista ${top3[0][F.name]} (${provShort(PROVS[top3[0][F.prov]])}), con ${R.f(top3[0][F[R.k]])}, seguido de ${top3[1][F.name]} (${R.f(top3[1][F[R.k]])}) y ${top3[2][F.name]} (${R.f(top3[2][F[R.k]])}).${c1?(c1===top3[0]?` ${c1[F.name]} es también la primera entre las ciudades de más de 50.000 habitantes.`:` Entre las ciudades de más de 50.000 habitantes, la primera es ${c1[F.name]} (${R.f(c1[F[R.k]])}).`):""} La media de España es ${R.f(esMean[R.k])}.`;
    const main=`<nav class="crumbs"><a href="/municipio/">Municipios</a> › <a href="/rankings/">Rankings</a></nav><header class="phead"><h1>${esc(R.t)}</h1><p class="dek">${esc(lead)}</p></header>
      <section class="finding"><h2>Los 50 primeros, entre los municipios de más de 1.000 habitantes</h2>${tbl(big,R,50)}<p class="muted" style="font-size:13px">Dato: ${esc(R.what)}. Fuente: ${esc(src)}. Se dejan fuera los municipios de menos de 1.000 habitantes porque en ellos unas pocas personas cambian mucho el resultado.</p></section>
      ${cities.length>=10?`<section class="finding"><h2>Las ciudades de más de 50.000 habitantes</h2>${tbl(cities,R,20)}</section>`:""}
      ${all.length>big.length&&all[0]!==big[0]?`<section class="finding"><h2>Contando también los pueblos más pequeños</h2><div class="txt"><p>Si se incluyen todos los municipios, el primero es ${L(all[0])} (${PL(all[0])}, ${nf0.format(all[0][F.pop])} habitantes), con ${R.f(all[0][F[R.k]])}.</p></div></section>`:""}
      <section class="finding"><div class="txt"><p>${RANKS.filter(x=>x!==R).slice(0,6).map(x=>`<a href="/rankings/${x.id}/">${esc(x.t)}</a>`).join(" · ")}</p><p><a href="/laboratorio/tabla/?d=${R.k}&t=g1">Ordena y filtra este dato tú mismo en el laboratorio →</a></p><p class="muted" style="font-size:13px">Datos actualizados el ${fechaES(SITE.dataUpdated)}.</p></div></section>${sources}`;
    const ogImage=ogFor("r-"+R.id,{k:"Ranking de municipios",t:R.t,list:big.slice(0,5).map((r,i)=>[i+1,r[F.name],provShort(PROVS[r[F.prov]]),R.f(r[F[R.k]])])});
    page({route,title:`${R.t} · Indicio`,desc:lead.slice(0,300),ogTitle:R.t,main,ogImage,
      jsonld:[breadcrumb([["Municipios","/municipio/"],["Rankings","/rankings/"],[R.t,route]]),
        {"@context":"https://schema.org","@type":"ItemList",name:R.t,itemListOrder:R.desc?"https://schema.org/ItemListOrderDescending":"https://schema.org/ItemListOrderAscending",numberOfItems:Math.min(50,big.length),itemListElement:big.slice(0,50).map((r,i)=>({"@type":"ListItem",position:i+1,name:r[F.name],url:SITE.url+munPath(r)}))},
        {"@context":"https://schema.org","@type":"FAQPage",mainEntity:[{"@type":"Question",name:R.q,acceptedAnswer:{"@type":"Answer",text:lead+" Fuente: "+src+"."}}]}]});
    addUrl(route,0.8);
  }
}

// ---------- sitemap, robots, feed, redirects ----------
const xmlUrl=u=>`<url><loc>${u.loc}</loc><lastmod>${u.mod||SITE.dataUpdated}</lastmod><priority>${u.pri.toFixed(1)}</priority></url>`;
fs.writeFileSync(path.join(OUT,"sitemap-pages.xml"),`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(xmlUrl).join("\n")}\n</urlset>\n`);
const CH=5000, parts=[];
for(let i=0;i<munUrls.length;i+=CH){ const n=parts.length+1; parts.push(`sitemap-municipios-${n}.xml`); fs.writeFileSync(path.join(OUT,`sitemap-municipios-${n}.xml`),`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${munUrls.slice(i,i+CH).map(xmlUrl).join("\n")}\n</urlset>\n`); }
fs.writeFileSync(path.join(OUT,"sitemap.xml"),`<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${["sitemap-pages.xml",...parts].map(p=>`<sitemap><loc>${SITE.url}/${p}</loc><lastmod>${SITE.dataUpdated}</lastmod></sitemap>`).join("\n")}\n</sitemapindex>\n`);
// buscadores y asistentes de IA, invitados explícitamente (los datos son públicos y queremos que se citen)
const AIBOTS=["Googlebot","Bingbot","GPTBot","OAI-SearchBot","ChatGPT-User","ClaudeBot","Claude-SearchBot","Claude-User","PerplexityBot","Perplexity-User","Google-Extended","Applebot","Applebot-Extended","DuckAssistBot","CCBot"];
fs.writeFileSync(path.join(OUT,"robots.txt"),AIBOTS.map(b=>`User-agent: ${b}\nAllow: /\nDisallow: /comparar/\n`).join("\n")+`\nUser-agent: *\nAllow: /\nDisallow: /comparar/\n\nSitemap: ${SITE.url}/sitemap.xml\n`);
// llms.txt: índice para asistentes de IA (https://llmstxt.org)
fs.writeFileSync(path.join(OUT,"llms.txt"),`# ${SITE.name}

> ${SITE.description}

Fuentes: INE, SEPE, Seguridad Social, Hacienda, Ministerio de Vivienda y Eurostat. Autor: ${SITE.author.name}. Se puede citar indicando «Indicio (indicio.es)» y la fuente original de cada dato.

## Preguntas
${STUDIES.map(S=>`- [${S.t}](${SITE.url}/preguntas/${S.id}/): ${S.a}`).join("\n")}

## Municipios y provincias
- [Fichas de municipios](${SITE.url}/municipio/): una página por municipio con renta, población, paro, vivienda, edad y voto, comparados con España. URL: ${SITE.url}/municipio/<código INE>-<nombre>/
- [Municipios por provincia](${SITE.url}/provincia/): tabla de todos los municipios de cada provincia.
- [Rankings de municipios](${SITE.url}/rankings/): los municipios con más y menos renta, paro, población, edad, alquiler, pisos turísticos, extranjeros, desigualdad y estudios.
- [Laboratorio](${SITE.url}/laboratorio/): mapas, rankings y cruces de cualquier par de datos, con pruebas para distinguir correlación de causa.

## Datos en bruto
- ${SITE.url}/data/index.json: todos los municipios con sus indicadores principales (campos en «fields»).
- ${SITE.url}/data/indicadores.json: descripción, unidad y fuente de cada indicador.
`);
const rfc=d=>new Date(d+"T08:00:00+02:00").toUTCString();
fs.writeFileSync(path.join(OUT,"feed.xml"),`<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>Indicio · Preguntas</title><link>${SITE.url}/</link><description>${esc(SITE.tagline)}</description><language>es</language><atom:link href="${SITE.url}/feed.xml" rel="self" type="application/rss+xml"/>\n${[...STUDIES].sort((a,b)=>(b.upd||b.pub).localeCompare(a.upd||a.pub)).map(S=>`<item><title>${esc(S.t)}</title><link>${SITE.url}/preguntas/${S.id}/</link><guid>${SITE.url}/preguntas/${S.id}/</guid><pubDate>${rfc(S.pub)}</pubDate><category>${esc((EVIDENCE[S.ev]||{}).l||"Análisis")}</category><description>${esc(S.a)}</description></item>`).join("\n")}\n</channel></rss>\n`);
// Netlify: el dominio antiguo redirige al nuevo; las rutas dinámicas que no tienen HTML propio caen en la app
// Cloudflare Pages: las reglas de _redirects se aplican aunque exista el fichero, así que solo se reescriben rutas que no existen
// (apartados de la ficha y comparaciones). La redirección de www y del dominio antiguo se hace en Cloudflare (reglas de redirección).
fs.writeFileSync(path.join(OUT,"_redirects"),["/municipio/:m/:s/ /municipio/:m/ 200","/municipio/:m/:s /municipio/:m/ 200","/comparar/:p/ /comparar/ 200","/comparar/:p /comparar/ 200","/preguntas/tope-compraventas/ /preguntas/tope-cataluna/ 301","/preguntas/iva-alimentos/ /preguntas/precio-alimentos/ 301","/preguntas/deuda-quien-gobierna/ /preguntas/quien-gobierna/ 301","/preguntas/cerca-ciudad/ /preguntas/ 301","/preguntas/renta-fuentes/ /preguntas/ 301","/preguntas/tope-compraventas /preguntas/tope-cataluna/ 301","/temas/vivienda/ /preguntas/vivienda/ 301","/temas/vivienda /preguntas/vivienda/ 301","/temas/ /preguntas/ 301","/temas /preguntas/ 301","/temas/* /preguntas/ 301"].join("\n")+"\n");
fs.writeFileSync(path.join(OUT,"_headers"),`/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n/vendor/*\n  Cache-Control: public, max-age=31536000, immutable\n/data/*\n  Cache-Control: public, max-age=86400\n/art/*\n  Cache-Control: public, max-age=604800\n/og/*\n  Cache-Control: public, max-age=604800\n/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n`);

fs.writeFileSync(path.join(OUT,"og-extra.json"),JSON.stringify(OGX));
fs.writeFileSync(path.join(OUT,INDEXNOW_KEY+".txt"),INDEXNOW_KEY);
{ const pv=i18nValidar(); if(pv.length) console.log(`i18n: ${pv.length} traducciones con las cifras mal (npm run i18n:faltan para verlas)`); const {cerradas}=i18nFaltan(); if(cerradas) console.log(`i18n: ${cerradas} frases de las páginas ya cerradas siguen sin traducir (npm run i18n:faltan para verlas)`); }
console.log(`dist/ listo: ${urls.length} páginas + ${nMun} fichas municipales, ${parts.length+1} sitemaps.`);
