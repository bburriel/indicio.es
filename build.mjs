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
import {SITE,STUDIES,QUICK,TOPICS,PAGES} from "./src/content.mjs";

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
const CONTENT_JSON=JSON.stringify({site:SITE,studies:STUDIES,quick:QUICK,topics:TOPICS,arts:ARTS});
const CONTENTJS="/assets/content."+h8(CONTENT_JSON)+".js"; fs.writeFileSync(path.join(OUT,CONTENTJS),"window.__INDICIO="+CONTENT_JSON+";");
const CONTENT=CONTENTJS;

// estáticos
for(const f of ["favicon.svg","apple-touch-icon.png","icon-192.png","icon-512.png","og-image.png","manifest.webmanifest"]) if(exists(f)) fs.copyFileSync(path.join(ROOT,f),path.join(OUT,f));
copyDir(path.join(ROOT,"vendor"),path.join(OUT,"vendor"));
if(exists("og")) copyDir(path.join(ROOT,"og"),path.join(OUT,"og"));
if(exists("art")) copyDir(path.join(ROOT,"art"),path.join(OUT,"art"));
if(exists("illus")) copyDir(path.join(ROOT,"illus"),path.join(OUT,"illus"));
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
function page({route,title,desc,ogTitle,main,jsonld,ogImage,type="website",robots=""}){
  const canon=SITE.url+route;
  const html=tpl.replace("{{TITLE}}",esc(title)).replace(/\{\{DESC\}\}/g,esc(stripTags(desc))).replace(/\{\{CANON\}\}/g,canon)
    .replace(/\{\{OGTITLE\}\}/g,esc(stripTags(ogTitle||title))).replace("{{OGTYPE}}",type).replace(/\{\{OGIMG\}\}/g,SITE.url+(ogImage||"/og-image.png"))
    .replace("{{ROBOTS}}",robots?`<meta name="robots" content="${robots}">`:"").replace("{{CSS}}",CSS).replace("{{JS}}",JS).replace("{{CONTENT}}",CONTENT)
    .replace("{{JSONLD}}",jsonld?`<script type="application/ld+json">${JSON.stringify(jsonld)}</script>`:"")
    .replace("{{PRELOAD}}",(route==="/"||route==="/preguntas/")?'<link rel="preload" href="/data/municipios.topo.json" as="fetch" crossorigin>':"").replace("{{BODY}}",body.replace("{{MAIN}}",main).replace("{{DATAUPD}}",fechaES(SITE.dataUpdated)));
  const dir=path.join(OUT,route); fs.mkdirSync(dir,{recursive:true}); fs.writeFileSync(path.join(dir,"index.html"),html);
}
const breadcrumb=items=>({"@context":"https://schema.org","@type":"BreadcrumbList",itemListElement:items.map(([n,u],i)=>({"@type":"ListItem",position:i+1,name:n,item:SITE.url+u}))});
const sources=`<footer class="method"><p><b>De dónde salen los datos.</b> INE: Atlas de Distribución de Renta de los Hogares, padrón municipal, Censo de Población y Viviendas 2021, Estadística de Migraciones, Índice de Precios de Vivienda en Alquiler, viviendas turísticas, Encuesta de Estructura Salarial e IPC. SEPE: paro registrado por municipio. Ministerio del Interior: resultados electorales. Eurostat: gasto público.</p></footer>`;
const urls=[]; const addUrl=(loc,pri,mod)=>urls.push({loc:SITE.url+loc,pri,mod:mod||SITE.dataUpdated});

// ---------- portada ----------
{
  const lead=STUDIES[0];
  const cards=STUDIES.map(S=>`<a href="/preguntas/${S.id}/"><div class="k">${esc(topicName(S.tema))} · ${esc(S.m)}</div><div class="q">${esc(S.t)}</div><div class="a">${esc(S.a)}</div><div class="go">Ver la respuesta →</div></a>`).join("");
  const main=snapshot("/")||`<section class="qh"><div class="kk2">Preguntas reales. Respuestas con datos públicos.</div><h1 class="qh-q">${esc(lead.t)}</h1><p class="qh-a"><b>${esc(lead.a.split(". ")[0])}.</b> ${esc(lead.a.split(". ").slice(1).join(". "))} <a href="/preguntas/${lead.id}/">Ver la respuesta →</a></p></section>
  <section class="ed-sec"><div class="ed-k">Preguntas respondidas</div><h2 class="ed-h2">Lo que de verdad dicen los datos</h2><div class="qg">${cards}</div><p style="margin-top:20px"><a class="ed-go" href="/preguntas/">Todas las preguntas →</a></p></section>
  <section class="ed-sec"><div class="ed-k">Laboratorio</div><h2 class="ed-h2">¿Tienes otra pregunta? Pruébala tú.</h2><p class="ed-lead">Elige dos cosas (el paro y la edad, la renta y el voto…) y mira si van juntas en los ${nf0.format(rows.length)} municipios. Te ayudamos a saber si es causa o casualidad.</p><p><a class="ed-go" href="/laboratorio/">Abrir el laboratorio →</a></p></section>
  <section class="ed-sec"><div class="ed-k">Preguntas por tema</div><div class="ed-temas">${TOPICS.map(T=>`<a href="/temas/${T.id}/">${T.l}</a>`).join("")}</div></section>${sources}`;
  page({route:"/",title:PAGES["/"].t,desc:PAGES["/"].d,ogTitle:SITE.name+" · "+SITE.tagline,main,
    jsonld:{"@context":"https://schema.org","@type":"WebSite",name:SITE.name,url:SITE.url,description:SITE.description,inLanguage:"es",author:{"@type":"Person",name:SITE.author.name,url:SITE.author.url},potentialAction:{"@type":"SearchAction",target:SITE.url+"/municipio/?q={search_term_string}","query-input":"required name=search_term_string"}}});
  addUrl("/",1.0);
}
function topicName(id){ return (TOPICS.find(T=>T.id===id)||{}).l||""; }

// ---------- preguntas ----------
{
  const cards=[...STUDIES.map(S=>`<a href="/preguntas/${S.id}/"><div class="k">${esc(topicName(S.tema))} · <span class="k-m">${esc(S.m)}</span></div><div class="q">${esc(S.t)}</div><div class="a">${esc(S.a)}</div><div class="go">Ver la respuesta → <time datetime="${S.pub}">${fechaES(S.pub)}</time></div></a>`),
    ...QUICK.map(Q=>`<a href="${Q.href}"><div class="k">${esc(topicName(Q.tema))}</div><div class="q">${esc(Q.t)}</div><div class="a">${esc(Q.a)}</div><div class="go">Ver la respuesta →</div></a>`)].join("");
  const main=snapshot("/preguntas/")||`<header class="phead"><h1>Análisis</h1><p class="dek">${esc(PAGES["/preguntas/"].d)}</p></header><div class="qg">${cards}</div>${sources}`;
  page({route:"/preguntas/",title:PAGES["/preguntas/"].t,desc:PAGES["/preguntas/"].d,main,jsonld:{"@context":"https://schema.org","@type":"CollectionPage",name:"Análisis",url:SITE.url+"/preguntas/",hasPart:STUDIES.map(S=>({"@type":"Article",headline:S.t,url:SITE.url+"/preguntas/"+S.id+"/"}))}});
  addUrl("/preguntas/",0.9);
  for(const S of STUDIES){
    const route="/preguntas/"+S.id+"/";
    const main=snapshot(route)||`<nav class="crumbs"><a href="/preguntas/">Análisis</a> › ${esc(topicName(S.tema))} › ${esc(S.m)}</nav><header class="phead"><h1>${esc(S.t)}</h1><p class="dek">${esc(S.d)}</p><p class="byline">Por <a href="/quien-soy/">${esc(SITE.author.name)}</a> · <time datetime="${S.pub}">${fechaES(S.pub)}</time> · ${esc(S.m)}</p></header>
      <section class="finding"><h2>La respuesta corta</h2><div class="txt"><p>${esc(S.a)}</p><p>La respuesta completa, con los gráficos y el método paso a paso, se calcula con los datos al abrir la página. <a href="/laboratorio/">Ponla a prueba en el laboratorio →</a></p></div></section>${sources}`;
    const og=exists("og/"+S.id+".png")?"/og/"+S.id+".png":null;
    page({route,title:S.t+" · Indicio",desc:S.a,ogTitle:S.t,main,type:"article",ogImage:og,
      jsonld:[{"@context":"https://schema.org","@type":"Article",headline:S.t,description:S.d,datePublished:S.pub,dateModified:S.upd||S.pub,inLanguage:"es",author:{"@type":"Person",name:SITE.author.name,url:SITE.author.url},publisher:{"@type":"Organization",name:SITE.name,url:SITE.url},mainEntityOfPage:SITE.url+route,image:SITE.url+(og||"/og-image.png"),articleSection:topicName(S.tema)},
        breadcrumb([["Análisis","/preguntas/"],[S.t,route]])]});
    addUrl(route,0.8,S.upd||S.pub);
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
for(const v of ["mapa","ranking","cruce","evolucion","grupos","reparto","tabla"]){
  const P=PAGES["/laboratorio/"], route="/laboratorio/"+v+"/";
  page({route,title:"Laboratorio · "+v[0].toUpperCase()+v.slice(1)+" · Indicio",desc:P.d,main:`<header class="phead"><h1>Laboratorio</h1><p class="dek">${esc(P.d)}</p></header><p class="loading">Cargando datos…</p>`,robots:"noindex,follow"});
}
// 404
{
  const main=`<header class="phead"><h1>No encontramos esa página</h1><p class="dek">Puede que el enlace sea antiguo. Prueba desde la portada o busca tu municipio arriba.</p></header><p><a class="ed-go" href="/">Ir a la portada →</a></p>`;
  const html=tpl.replace("{{PRELOAD}}","").replace("{{TITLE}}","Página no encontrada · Indicio").replace(/\{\{DESC\}\}/g,"").replace(/\{\{CANON\}\}/g,SITE.url+"/").replace(/\{\{OGTITLE\}\}/g,"Indicio").replace("{{OGTYPE}}","website").replace(/\{\{OGIMG\}\}/g,SITE.url+"/og-image.png").replace("{{ROBOTS}}",'<meta name="robots" content="noindex">').replace("{{CSS}}",CSS).replace("{{JS}}",JS).replace("{{CONTENT}}",CONTENT).replace("{{JSONLD}}","").replace("{{BODY}}",body.replace("{{MAIN}}",main).replace("{{DATAUPD}}",fechaES(SITE.dataUpdated)));
  fs.writeFileSync(path.join(OUT,"404.html"),html);
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
  const main=`<nav class="crumbs"><a href="/municipio/">Municipios</a> › Provincia de ${esc(prov)}</nav><header class="phead"><h1>${esc(name)}</h1><p class="dek">${lead}</p><p class="muted">Código INE ${code}.</p></header>
    <section class="finding"><h2>Todos los datos de ${esc(name)}</h2><table class="glance"><thead><tr><th>Dato</th><th class="r">${esc(name)}</th><th class="r">España</th></tr></thead><tbody>${table}</tbody></table><p class="muted" style="font-size:13px">La media de España es la de sus municipios, ponderada por población. Al abrir la página se cargan los gráficos, la evolución desde 2015 y los municipios parecidos.</p></section>
    <section class="finding"><h2>Compáralo</h2><div class="txt"><p><a href="/laboratorio/cruce/?d=renta,paroReg&t=g1&m=${code}">Verlo en el laboratorio →</a> · <a href="/comparar/${code}/">Comparar con otro municipio →</a></p></div></section>${sources}`;
  const jsonld=[{"@context":"https://schema.org","@type":"City",name,url:SITE.url+route,identifier:code,containedInPlace:{"@type":"AdministrativeArea",name:"Provincia de "+prov},...(pop!=null?{population:pop}:{})},breadcrumb([["Municipios","/municipio/"],[name,route]])];
  page({route,title:`${name}: renta, población, paro y vivienda · Indicio`,desc,ogTitle:`${name} en datos`,main,jsonld});
  munUrls.push({loc:SITE.url+route,pri:pop>=20000?0.6:0.4}); nMun++;
}

// ---------- sitemap, robots, feed, redirects ----------
const xmlUrl=u=>`<url><loc>${u.loc}</loc><lastmod>${u.mod||SITE.dataUpdated}</lastmod><priority>${u.pri.toFixed(1)}</priority></url>`;
fs.writeFileSync(path.join(OUT,"sitemap-pages.xml"),`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(xmlUrl).join("\n")}\n</urlset>\n`);
const CH=5000, parts=[];
for(let i=0;i<munUrls.length;i+=CH){ const n=parts.length+1; parts.push(`sitemap-municipios-${n}.xml`); fs.writeFileSync(path.join(OUT,`sitemap-municipios-${n}.xml`),`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${munUrls.slice(i,i+CH).map(xmlUrl).join("\n")}\n</urlset>\n`); }
fs.writeFileSync(path.join(OUT,"sitemap.xml"),`<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${["sitemap-pages.xml",...parts].map(p=>`<sitemap><loc>${SITE.url}/${p}</loc><lastmod>${SITE.dataUpdated}</lastmod></sitemap>`).join("\n")}\n</sitemapindex>\n`);
fs.writeFileSync(path.join(OUT,"robots.txt"),`User-agent: *\nAllow: /\nDisallow: /comparar/\nSitemap: ${SITE.url}/sitemap.xml\n`);
const rfc=d=>new Date(d+"T08:00:00+02:00").toUTCString();
fs.writeFileSync(path.join(OUT,"feed.xml"),`<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>Indicio · Preguntas</title><link>${SITE.url}/</link><description>${esc(SITE.tagline)}</description><language>es</language><atom:link href="${SITE.url}/feed.xml" rel="self" type="application/rss+xml"/>\n${[...STUDIES].sort((a,b)=>(b.upd||b.pub).localeCompare(a.upd||a.pub)).map(S=>`<item><title>${esc(S.t)}</title><link>${SITE.url}/preguntas/${S.id}/</link><guid>${SITE.url}/preguntas/${S.id}/</guid><pubDate>${rfc(S.pub)}</pubDate><category>${esc(topicName(S.tema))}</category><description>${esc(S.a)}</description></item>`).join("\n")}\n</channel></rss>\n`);
// Netlify: el dominio antiguo redirige al nuevo; las rutas dinámicas que no tienen HTML propio caen en la app
fs.writeFileSync(path.join(OUT,"_redirects"),`https://${SITE.oldHost}/* ${SITE.url}/:splat 301!\nhttp://${SITE.oldHost}/* ${SITE.url}/:splat 301!\nhttps://www.indicio.es/* ${SITE.url}/:splat 301!\n/municipio/*  /municipio/index.html  200\n/comparar/*  /comparar/index.html  200\n/laboratorio/*  /laboratorio/index.html  200\n/temas/riqueza/*  /temas/riqueza/index.html  200\n`);
fs.writeFileSync(path.join(OUT,"_headers"),`/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n/vendor/*\n  Cache-Control: public, max-age=31536000, immutable\n/data/*\n  Cache-Control: public, max-age=86400\n/art/*\n  Cache-Control: public, max-age=604800\n/og/*\n  Cache-Control: public, max-age=604800\n/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n`);

console.log(`dist/ listo: ${urls.length} páginas + ${nMun} fichas municipales, ${parts.length+1} sitemaps.`);
