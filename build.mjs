// Build de Indicio: genera en dist/ una página HTML real por cada ruta (portada, preguntas, temas,
// laboratorio, quién soy y una ficha por municipio), con título, descripción, canonical, Open Graph,
// JSON-LD, sitemap, RSS y robots. Sin dependencias: `node build.mjs`.
//
// Si existe snapshots/<ruta>.html (lo genera `npm run snapshot` con Playwright), esa página se
// sirve ya pintada, con sus gráficos; si no, lleva un texto estático con lo esencial.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {fileURLToPath} from "node:url";
import {SITE,QUICK,TOPICS,PAGES,EVIDENCE} from "./src/content.mjs";
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
const css=rd("src/styles.css"), js=rd("src/app.js"), tpl=rd("src/template.html"), body=rd("src/body.html");
const h8=s=>crypto.createHash("sha256").update(s).digest("hex").slice(0,8);
const CSS="/assets/styles."+h8(css)+".css", JS="/assets/app."+h8(js)+".js";
fs.mkdirSync(path.join(OUT,"assets"),{recursive:true});
fs.writeFileSync(path.join(OUT,CSS),css); fs.writeFileSync(path.join(OUT,JS),js);
const ARTS=exists("art")?fs.readdirSync(path.join(ROOT,"art")).filter(f=>f.endsWith(".jpg")).map(f=>f.replace(/\.jpg$/,"")):[];
const CONTENT_JSON=JSON.stringify({site:SITE,studies:STUDIES,hidden:HIDDEN,md:MDBODY,quick:QUICK,topics:TOPICS,arts:ARTS,evidence:EVIDENCE,illus:ILLUS,till:TILL,focus:FOCUS});
const CONTENTJS="/assets/content."+h8(CONTENT_JSON)+".js"; fs.writeFileSync(path.join(OUT,CONTENTJS),"window.__INDICIO="+CONTENT_JSON+";");
const CONTENT=CONTENTJS;

// estáticos
for(const f of ["favicon.svg","apple-touch-icon.png","icon-192.png","icon-512.png","og-image.png","manifest.webmanifest"]) if(exists(f)) fs.copyFileSync(path.join(ROOT,f),path.join(OUT,f));
copyDir(path.join(ROOT,"vendor"),path.join(OUT,"vendor"));
if(exists("og")) copyDir(path.join(ROOT,"og"),path.join(OUT,"og"));
if(exists("art")) copyDir(path.join(ROOT,"art"),path.join(OUT,"art"));
if(exists("illus")){ fs.mkdirSync(path.join(OUT,"illus"),{recursive:true}); for(const f of fs.readdirSync(path.join(ROOT,"illus")).filter(f=>f.endsWith(".svg"))) fs.copyFileSync(path.join(ROOT,"illus",f),path.join(OUT,"illus",f)); }
copyDir(path.join(ROOT,"data"),path.join(OUT,"data"));
// el service worker lleva la versión del build
fs.writeFileSync(path.join(OUT,"sw.js"),rd("src/sw.js").replace("__BUILD__",h8(css+js+CONTENT)).replace("__JS__",JS).replace("__CSS__",CSS));
fs.writeFileSync(path.join(OUT,"manifest.webmanifest"),rd("manifest.webmanifest").replace(/"\.\/#?(\w*)"/g,(m,k)=>`"/${({inicio:"",preguntas:"preguntas/",municipio:"municipio/",explorar:"laboratorio/"})[k]??""}"`).replace('"scope": "./"','"scope": "/"'));

// ---------- datos para las fichas ----------
const ix=JSON.parse(rd("data/index.json")), CAT=JSON.parse(rd("data/indicadores.json"));
const F={}; ix.fields.forEach((f,i)=>F[f]=i);
const rows=ix.rows; rows.forEach(r=>r[F.name]=disp(r[F.name]));
const PROVS=ix.provs;
const esMean={}; for(const c of CAT){ const k=c.k; if(F[k]==null) continue; let s=0,w=0; for(const r of rows){ const v=r[F[k]], p=r[F.pop]; if(v!=null&&p){ s+=v*p; w+=p; } } esMean[k]=w?s/w:null; }
const FMT={int:v=>nf0.format(v),pct:v=>nf1.format(v)+" %",pct_chg:v=>(v>0?"+":v<0?"−":"")+nf1.format(Math.abs(v))+" %",pts:v=>(v>0?"+":v<0?"−":"")+nf1.format(Math.abs(v))+" %",eur:v=>nf0.format(v)+" €",years:v=>nf1.format(v)+" años",num1:v=>nf1.format(v),km:v=>nf0.format(v)+" km",dens:v=>(v<10?nf1:nf0).format(v)+" hab./km²"};
const fmt=(c,v)=>v==null?"—":(FMT[c.f]||(x=>nf1.format(x)))(v);
const munPath=r=>`/municipio/${r[F.code]}-${slug(r[F.name])}/`;

// ---------- plantilla ----------
const snapshot=route=>{ const p="snapshots/"+(route==="/"?"index":route.replace(/^\/|\/$/g,"").replace(/\//g,"__"))+".html"; return exists(p)?rd(p):null; };
function page({route,title,desc,ogTitle,main,jsonld,ogImage,type="website",robots="",after=""}){
  const canon=SITE.url+route;
  const html=tpl.replace("{{TITLE}}",esc(title)).replace(/\{\{DESC\}\}/g,esc(stripTags(desc))).replace(/\{\{CANON\}\}/g,canon)
    .replace(/\{\{OGTITLE\}\}/g,esc(stripTags(ogTitle||title))).replace("{{OGTYPE}}",type).replace(/\{\{OGIMG\}\}/g,SITE.url+(ogImage||"/og-image.png"))
    .replace("{{ROBOTS}}",robots?`<meta name="robots" content="${robots}">`:"").replace("{{CSS}}",CSS).replace("{{JS}}",JS).replace("{{CONTENT}}",CONTENT)
    .replace("{{JSONLD}}",jsonld?`<script type="application/ld+json">${JSON.stringify(jsonld)}</script>`:"")
    .replace("{{PRELOAD}}",(route==="/"||route==="/preguntas/")?'<link rel="preload" href="/data/municipios.topo.json" as="fetch" crossorigin>':"").replace("{{BODY}}",body.replace("{{MAIN}}",main).replace("{{AFTER}}",typeof after==="string"?after:"").replace("{{DATAUPD}}",fechaES(SITE.dataUpdated)));
  const dir=path.join(OUT,route); fs.mkdirSync(dir,{recursive:true}); fs.writeFileSync(path.join(dir,"index.html"),html);
}
const breadcrumb=items=>({"@context":"https://schema.org","@type":"BreadcrumbList",itemListElement:items.map(([n,u],i)=>({"@type":"ListItem",position:i+1,name:n,item:SITE.url+u}))});
const sources=`<footer class="method"><p><b>De dónde salen los datos.</b> INE: Atlas de Distribución de Renta de los Hogares, padrón municipal, Censo de Población y Viviendas 2021, Estadística de Migraciones, Índice de Precios de Vivienda en Alquiler, viviendas turísticas, Encuesta de Estructura Salarial e IPC. SEPE: paro registrado por municipio. Ministerio del Interior: resultados electorales. Eurostat: gasto público.</p></footer>`;
const urls=[]; const addUrl=(loc,pri,mod)=>urls.push({loc:SITE.url+loc,pri,mod:mod||SITE.dataUpdated});

// ---------- portada ----------
{
  const lead=STUDIES[0];
  const cards=STUDIES.map(S=>`<a href="/preguntas/${S.id}/"><div class="k">${esc(topicName(S.tema))} · ${esc(S.m)}${S.ev?` <span class="ev ev-${S.ev}">${esc(EVIDENCE[S.ev].l)}</span>`:""}</div><div class="q">${esc(S.t)}</div><div class="a">${esc(S.a)}</div><div class="go">Ver la respuesta →</div></a>`).join("");
  const main=snapshot("/")||`<section class="qh"><div class="kk2">Preguntas reales. Respuestas con datos públicos.</div><h1 class="qh-q">${esc(lead.t)}</h1><p class="qh-a"><b>${esc(lead.a.split(". ")[0])}.</b> ${esc(lead.a.split(". ").slice(1).join(". "))} <a href="/preguntas/${lead.id}/">Ver la respuesta →</a></p></section>
  <section class="ed-sec"><div class="ed-k">Preguntas respondidas</div><h2 class="ed-h2">Lo que de verdad dicen los datos</h2><div class="qg">${cards}</div><p style="margin-top:20px"><a class="ed-go" href="/preguntas/">Todas las preguntas →</a></p></section>
  <section class="ed-sec"><div class="ed-k">Laboratorio</div><h2 class="ed-h2">¿Tienes otra pregunta? Pruébala tú.</h2><p class="ed-lead">Elige dos cosas (el paro y la edad, la renta y el voto…) y mira si van juntas en los ${nf0.format(rows.length)} municipios, si la relación aguanta entre municipios parecidos y qué pasó antes y después de una ley.</p><p><a class="ed-go" href="/laboratorio/">Abrir el laboratorio →</a></p></section>
  <section class="ed-sec"><div class="ed-k">Preguntas por tema</div><div class="ed-temas">${TOPICS.map(T=>`<a href="/temas/${T.id}/">${T.l}</a>`).join("")}</div></section>${sources}`;
  page({route:"/",title:PAGES["/"].t,desc:PAGES["/"].d,ogTitle:SITE.name+" · "+SITE.tagline,main,
    jsonld:{"@context":"https://schema.org","@type":"WebSite",name:SITE.name,url:SITE.url,description:SITE.description,inLanguage:"es",author:{"@type":"Person",name:SITE.author.name,url:SITE.author.url},potentialAction:{"@type":"SearchAction",target:SITE.url+"/municipio/?q={search_term_string}","query-input":"required name=search_term_string"}}});
  addUrl("/",1.0);
}
function topicName(id){ return (TOPICS.find(T=>T.id===id)||{}).l||""; }

// ---------- preguntas ----------
{
  const cards=[...STUDIES.map(S=>`<a href="/preguntas/${S.id}/"><div class="k">${esc(topicName(S.tema))} · <span class="k-m">${esc(S.m)}</span>${S.ev?` <span class="ev ev-${S.ev}">${esc(EVIDENCE[S.ev].l)}</span>`:""}</div><div class="q">${esc(S.t)}</div><div class="a">${esc(S.a)}</div><div class="go">Ver la respuesta → <time datetime="${S.pub}">${fechaES(S.pub)}</time></div></a>`),
    ...QUICK.map(Q=>`<a href="${Q.href}"><div class="k">${esc(topicName(Q.tema))}</div><div class="q">${esc(Q.t)}</div><div class="a">${esc(Q.a)}</div><div class="go">Ver la respuesta →</div></a>`)].join("");
  const main=snapshot("/preguntas/")||`<header class="phead"><h1>Análisis</h1><p class="dek">${esc(PAGES["/preguntas/"].d)}</p></header><div class="qg">${cards}</div>${sources}`;
  page({route:"/preguntas/",title:PAGES["/preguntas/"].t,desc:PAGES["/preguntas/"].d,main,jsonld:{"@context":"https://schema.org","@type":"CollectionPage",name:"Análisis",url:SITE.url+"/preguntas/",hasPart:STUDIES.map(S=>({"@type":"Article",headline:S.t,url:SITE.url+"/preguntas/"+S.id+"/"}))}});
  addUrl("/preguntas/",0.9);
  for(const S of ALL){
    const route="/preguntas/"+S.id+"/";
    const main=snapshot(route)||`<nav class="crumbs"><a href="/preguntas/">Análisis</a> › ${esc(topicName(S.tema))} › ${esc(S.m)}</nav><header class="phead"><h1>${esc(S.t)}</h1><p class="dek">${esc(S.d)}</p><p class="byline">Por <a href="/quien-soy/">${esc(SITE.author.name)}</a> · <time datetime="${S.pub}">${fechaES(S.pub)}</time> · ${esc(S.m)}</p>${ILLUS[S.id]||""}</header>
      <section class="finding"><h2>La respuesta corta</h2><div class="txt"><p>${esc(S.a)}</p><p>La respuesta completa, con los gráficos y el método paso a paso, se calcula con los datos al abrir la página. <a href="/laboratorio/">Ponla a prueba en el laboratorio →</a></p></div></section>${sources}`;
    const og=exists("og/"+S.id+".png")?"/og/"+S.id+".png":null;
    page({route,title:S.t+" · Indicio",desc:S.a,ogTitle:S.t,main,type:"article",ogImage:og,robots:S.oculto?"noindex":"",
      jsonld:[{"@context":"https://schema.org","@type":"Article",headline:S.t,description:S.d,datePublished:S.pub,dateModified:S.upd||S.pub,inLanguage:"es",author:{"@type":"Person",name:SITE.author.name,url:SITE.author.url},publisher:{"@type":"Organization",name:SITE.name,url:SITE.url},mainEntityOfPage:SITE.url+route,image:SITE.url+(og||"/og-image.png"),articleSection:topicName(S.tema)},
        breadcrumb([["Análisis","/preguntas/"],[S.t,route]])]});
    if(!S.oculto) addUrl(route,0.8,S.upd||S.pub);
  }
}

// ---------- temas ----------
{
  const main=snapshot("/temas/")||`<header class="phead"><h1>Temas</h1><p class="dek">${esc(PAGES["/temas/"].d)}</p></header><div class="studies">${TOPICS.map(T=>`<a class="study" href="/temas/${T.id}/"><span>${esc(T.l)}</span><b>${esc(T.q)}</b><p>${esc(T.d)}</p></a>`).join("")}</div>${sources}`;
  page({route:"/temas/",title:PAGES["/temas/"].t,desc:PAGES["/temas/"].d,main});
  addUrl("/temas/",0.7);
  for(const T of TOPICS){
    const route="/temas/"+T.id+"/", qs=STUDIES.filter(S=>S.tema===T.id);
    const main=snapshot(route)||`<nav class="crumbs"><a href="/preguntas/">Análisis</a> › ${esc(T.l)}</nav><header class="phead"><h1>${esc(T.q)}</h1><p class="dek">${esc(T.d)}</p></header>
      ${qs.length?`<section class="finding"><h2>Preguntas sobre ${esc(T.l.toLowerCase())}</h2><div class="studies">${qs.map(S=>`<a class="study" href="/preguntas/${S.id}/"><span>${esc(S.m)}</span><b>${esc(S.t)}</b><p>${esc(S.a)}</p></a>`).join("")}</div></section>`:""}
      <section class="finding"><h2>Míralo en el laboratorio</h2><div class="txt"><p>Los datos de este tema, municipio a municipio, en mapas, rankings y cruces: <a href="/laboratorio/">abrir el laboratorio →</a></p></div></section>${sources}`;
    page({route,title:T.q+" · "+T.l+" · Indicio",desc:T.d,ogTitle:T.q,main,jsonld:breadcrumb([["Análisis","/preguntas/"],[T.l,route]])});
    addUrl(route,0.7);
  }
}

// ---------- laboratorio, municipios, quién soy, comparar ----------
for(const route of ["/laboratorio/","/laboratorio/metodo/","/municipio/","/quien-soy/","/quien-soy/contacto/","/comparar/"]){
  const P=PAGES[route];
  const main=snapshot(route)||`<header class="phead"><h1>${esc(P.t.replace(" · Indicio",""))}</h1><p class="dek">${esc(P.d)}</p></header><p class="loading">Cargando datos…</p>`;
  page({route,title:P.t,desc:P.d,main,robots:route==="/comparar/"?"noindex,follow":""});
  if(route!=="/comparar/") addUrl(route,route==="/laboratorio/"?0.9:0.6);
}
for(const v of ["mapa","ranking","cruce","evolucion","grupos","reparto","tabla","antes","distribucion","burbujas"]){
  const P=PAGES["/laboratorio/"], route="/laboratorio/"+v+"/";
  page({route,title:"Laboratorio · "+v[0].toUpperCase()+v.slice(1)+" · Indicio",desc:P.d,main:`<header class="phead"><h1>Laboratorio</h1><p class="dek">${esc(P.d)}</p></header><p class="loading">Cargando datos…</p>`,robots:"noindex,follow"});
}
// 404
{
  const main=`<header class="phead"><h1>No encontramos esa página</h1><p class="dek">Puede que el enlace sea antiguo. Prueba desde la portada o busca tu municipio arriba.</p></header><p><a class="ed-go" href="/">Ir a la portada →</a></p>`;
  const html=tpl.replace("{{PRELOAD}}","").replace("{{TITLE}}","Página no encontrada · Indicio").replace(/\{\{DESC\}\}/g,"").replace(/\{\{CANON\}\}/g,SITE.url+"/").replace(/\{\{OGTITLE\}\}/g,"Indicio").replace("{{OGTYPE}}","website").replace(/\{\{OGIMG\}\}/g,SITE.url+"/og-image.png").replace("{{ROBOTS}}",'<meta name="robots" content="noindex">').replace("{{CSS}}",CSS).replace("{{JS}}",JS).replace("{{CONTENT}}",CONTENT).replace("{{JSONLD}}","").replace("{{BODY}}",body.replace("{{MAIN}}",main).replace("{{AFTER}}",typeof after==="string"?after:"").replace("{{DATAUPD}}",fechaES(SITE.dataUpdated)));
  fs.writeFileSync(path.join(OUT,"404.html"),html);
}

// ---------- provincias y rankings (para las fichas y las páginas de provincia) ----------
const provSlug=p=>slug(provShort(PROVS[p]));
const byProv={}; for(const r of rows) (byProv[r[F.prov]]=byProv[r[F.prov]]||[]).push(r);
const rankIn=(list,k,desc=true)=>{ const m=new Map(); list.filter(r=>r[F[k]]!=null).sort((a,b)=>desc?b[F[k]]-a[F[k]]:a[F[k]]-b[F[k]]).forEach((r,i)=>m.set(r[F.code],i+1)); return m; };
const RK={}; for(const [p,list] of Object.entries(byProv)) RK[p]={pop:rankIn(list,"pop"),renta:rankIn(list,"renta")};
const ord=n=>n+".º"; const rk=(n,what)=>n===1?`el municipio ${what}`:`el ${ord(n)} municipio ${what}`;
const catOf=k=>CAT.find(c=>c.k===k)||{};
const srcOf=k=>(catOf(k).src||"").replace(/\.$/,"");
const pctS=v=>nf1.format(v)+" %";
const vsES=(v,m,unit)=>{ if(m==null) return ""; const d=v/m-1; return Math.abs(d)<0.03?"prácticamente igual que la media de España":`un ${nf0.format(Math.abs(d)*100)} % ${d>0?"más":"menos"} que la media de España (${unit(m)})`; };
const ptsES=(v,m)=>{ if(m==null) return ""; const d=v-m; return Math.abs(d)<0.3?"casi igual que la media de España":`${nf1.format(Math.abs(d))} puntos ${d>0?"más":"menos"} que la media de España (${pctS(m)})`; };
const PARTY={PP:"el PP",PSOE:"el PSOE",VOX:"Vox",Vox:"Vox",SUMAR:"Sumar",Sumar:"Sumar"};
// preguntas y respuestas de cada ficha: frases autocontenidas (con fuente y año) para buscadores y asistentes
function munFAQ(r){
  const name=r[F.name], P=r[F.prov], prov=provShort(PROVS[P]), code=r[F.code], n=byProv[P].length, v=k=>r[F[k]], out=[];
  if(v("pop")!=null) out.push([`¿Cuántos habitantes tiene ${name}?`,`${name} tiene ${nf0.format(v("pop"))} habitantes según el padrón de 2025 (INE). Es ${rk(RK[P].pop.get(code),"más poblado")} de los ${nf0.format(n)} de la provincia de ${prov}${v("varPob")!=null?`, y desde 2015 su población ha ${v("varPob")>=0?"crecido":"bajado"} un ${nf1.format(Math.abs(v("varPob")))} %`:""}.`]);
  if(v("renta")!=null) out.push([`¿Cuál es la renta media en ${name}?`,`La renta neta media por persona en ${name} es de ${nf0.format(v("renta"))} € al año, ${vsES(v("renta"),esMean.renta,x=>nf0.format(x)+" €")}${v("rentaHog")!=null?`; por hogar, ${nf0.format(v("rentaHog"))} €`:""}. Es ${rk(RK[P].renta.get(code),"con más renta por persona")} de la provincia de ${prov}. Fuente: ${srcOf("renta")}.`]);
  if(v("paroReg")!=null) out.push([`¿Cuánto paro hay en ${name}?`,`En ${name} el paro registrado es del ${pctS(v("paroReg"))} de la población de 16 a 64 años (media de 2025, SEPE), ${ptsES(v("paroReg"),esMean.paroReg)}.${v("paro")!=null?` En el Censo de 2021, la tasa de paro era del ${pctS(v("paro"))}.`:""}`]);
  if(v("edad")!=null) out.push([`¿Qué edad media tiene la población de ${name}?`,`La edad media en ${name} es de ${nf1.format(v("edad"))} años${esMean.edad!=null?` (España: ${nf1.format(esMean.edad)})`:""}${v("mayores65")!=null?`, y el ${pctS(v("mayores65"))} de sus vecinos tiene más de 65 años`:""}${v("extr")!=null?`. El ${pctS(v("extr"))} tiene nacionalidad extranjera`:""}. Fuente: ${srcOf("edad")}.`]);
  if(v("alquiler")!=null) out.push([`¿Cuántos hogares viven de alquiler en ${name}?`,`En ${name} el ${pctS(v("alquiler"))} de los hogares vive de alquiler, ${ptsES(v("alquiler"),esMean.alquiler)}, según el Censo de 2021.${v("alqVar")!=null?` El alquiler declarado ha subido un ${nf1.format(v("alqVar"))} % entre 2015 y 2024 (Índice de Precios de Vivienda en Alquiler del INE).`:""}`]);
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
    <section class="finding"><h2>Otros municipios de la provincia de ${esc(prov)}</h2><p class="near">${near.map(x=>`<a href="${munPath(x)}">${esc(x[F.name])}</a>`).join(" · ")}</p><p><a href="/provincia/${provSlug(r[F.prov])}/">Los ${nf0.format(plist.length)} municipios de la provincia de ${esc(prov)}, con su renta, población y paro →</a></p></section></div>`;
  const jsonld=[{"@context":"https://schema.org","@type":"City",name,url:SITE.url+route,identifier:code,containedInPlace:{"@type":"AdministrativeArea",name:"Provincia de "+prov,url:SITE.url+"/provincia/"+provSlug(r[F.prov])+"/"},...(pop!=null?{population:pop}:{})},
    breadcrumb([["Municipios","/municipio/"],["Provincia de "+prov,"/provincia/"+provSlug(r[F.prov])+"/"],[name,route]]),
    ...(faq.length?[{"@context":"https://schema.org","@type":"FAQPage",mainEntity:faq.map(([q,a])=>({"@type":"Question",name:q,acceptedAnswer:{"@type":"Answer",text:a}}))}]:[])];
  page({route,title:`${name}: renta, población, paro y vivienda · Indicio`,desc,ogTitle:`${name} en datos`,main,jsonld,after});
  munUrls.push({loc:SITE.url+route,pri:pop>=20000?0.6:0.4}); nMun++;
}

// ---------- páginas de provincia: todos sus municipios con los datos clave ----------
{
  const plist=Object.keys(byProv).sort((a,b)=>provShort(PROVS[a]).localeCompare(provShort(PROVS[b]),"es"));
  const idx=`<header class="phead"><h1>Municipios por provincia</h1><p class="dek">Renta, población, paro y edad de todos los municipios de España, provincia a provincia.</p></header>
    <div class="provlist">${plist.map(p=>`<a href="/provincia/${provSlug(p)}/">${esc(provShort(PROVS[p]))} <small>${nf0.format(byProv[p].length)}</small></a>`).join("")}</div>${sources}`;
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
      <section class="finding"><h2>Los ${nf0.format(list.length)} municipios, de más a menos habitantes</h2><div class="extable"><table class="glance"><thead><tr><th>Municipio</th><th class="r">Habitantes</th><th class="r">Renta por persona</th><th class="r">Paro registrado</th><th class="r">Edad media</th></tr></thead><tbody>
      ${list.map(r=>`<tr><td>${L(r)}</td><td class="r num">${cell(r,"pop",nf0.format)}</td><td class="r num">${cell(r,"renta",x=>nf0.format(x)+" €")}</td><td class="r num">${cell(r,"paroReg",pctS)}</td><td class="r num">${cell(r,"edad",x=>nf1.format(x))}</td></tr>`).join("")}
      </tbody></table></div><p class="muted" style="font-size:13px">Renta: ${esc(srcOf("renta"))}. Paro registrado: SEPE, media de 2025, sobre la población de 16 a 64 años. Edad: ${esc(srcOf("edad"))}. En los municipios muy pequeños el INE no publica todos los datos.</p></section>
      <section class="finding"><div class="txt"><p><a href="/laboratorio/mapa/?d=renta&p=${p}">Ver la provincia en el mapa del laboratorio →</a> · <a href="/provincia/">Otras provincias →</a></p></div></section>${sources}`;
    page({route,title:`Municipios de ${prov}: renta, población y paro · Indicio`,desc:facts.slice(0,2).join(" ").slice(0,300),ogTitle:`Municipios de la provincia de ${prov}`,main,
      jsonld:[breadcrumb([["Municipios","/municipio/"],["Provincias","/provincia/"],["Provincia de "+prov,route]]),{"@context":"https://schema.org","@type":"Dataset",name:`Municipios de la provincia de ${prov}: renta, población, paro y edad`,description:facts.join(" "),url:SITE.url+route,license:"https://creativecommons.org/licenses/by/4.0/",creator:{"@type":"Person",name:SITE.author.name,url:SITE.author.url},isBasedOn:["https://www.ine.es","https://www.sepe.es"],spatialCoverage:{"@type":"Place",name:"Provincia de "+prov+", España"},variableMeasured:["Habitantes","Renta neta media por persona","Paro registrado","Edad media"]}]});
    addUrl(route,0.7);
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

## Análisis
${STUDIES.map(S=>`- [${S.t}](${SITE.url}/preguntas/${S.id}/): ${S.a}`).join("\n")}

## Municipios y provincias
- [Fichas de municipios](${SITE.url}/municipio/): una página por municipio con renta, población, paro, vivienda, edad y voto, comparados con España. URL: ${SITE.url}/municipio/<código INE>-<nombre>/
- [Municipios por provincia](${SITE.url}/provincia/): tabla de todos los municipios de cada provincia.
- [Laboratorio](${SITE.url}/laboratorio/): mapas, rankings y cruces de cualquier par de datos, con pruebas para distinguir correlación de causa.

## Temas
${TOPICS.map(T=>`- [${T.q}](${SITE.url}/temas/${T.id}/): ${T.d}`).join("\n")}

## Datos en bruto
- ${SITE.url}/data/index.json: todos los municipios con sus indicadores principales (campos en «fields»).
- ${SITE.url}/data/indicadores.json: descripción, unidad y fuente de cada indicador.
`);
const rfc=d=>new Date(d+"T08:00:00+02:00").toUTCString();
fs.writeFileSync(path.join(OUT,"feed.xml"),`<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>Indicio · Preguntas</title><link>${SITE.url}/</link><description>${esc(SITE.tagline)}</description><language>es</language><atom:link href="${SITE.url}/feed.xml" rel="self" type="application/rss+xml"/>\n${[...STUDIES].sort((a,b)=>(b.upd||b.pub).localeCompare(a.upd||a.pub)).map(S=>`<item><title>${esc(S.t)}</title><link>${SITE.url}/preguntas/${S.id}/</link><guid>${SITE.url}/preguntas/${S.id}/</guid><pubDate>${rfc(S.pub)}</pubDate><category>${esc(topicName(S.tema))}</category><description>${esc(S.a)}</description></item>`).join("\n")}\n</channel></rss>\n`);
// Netlify: el dominio antiguo redirige al nuevo; las rutas dinámicas que no tienen HTML propio caen en la app
// Cloudflare Pages: las reglas de _redirects se aplican aunque exista el fichero, así que solo se reescriben rutas que no existen
// (apartados de la ficha y comparaciones). La redirección de www y del dominio antiguo se hace en Cloudflare (reglas de redirección).
fs.writeFileSync(path.join(OUT,"_redirects"),["/municipio/:m/:s/ /municipio/:m/ 200","/municipio/:m/:s /municipio/:m/ 200","/comparar/:p/ /comparar/ 200","/comparar/:p /comparar/ 200"].join("\n")+"\n");
fs.writeFileSync(path.join(OUT,"_headers"),`/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n/vendor/*\n  Cache-Control: public, max-age=31536000, immutable\n/data/*\n  Cache-Control: public, max-age=86400\n/art/*\n  Cache-Control: public, max-age=604800\n/og/*\n  Cache-Control: public, max-age=604800\n/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n`);

console.log(`dist/ listo: ${urls.length} páginas + ${nMun} fichas municipales, ${parts.length+1} sitemaps.`);
