// Pre-render con navegador real (opcional): abre cada página editorial de dist/ con Playwright y guarda
// el HTML ya pintado (con sus gráficos) en snapshots/, y una imagen Open Graph por pregunta en og/.
// Después, `npm run build` incrusta esos snapshots. Necesita: npm i -D playwright && npx playwright install chromium
// Uso: npm run build && npm run snapshot && npm run build   (o `npm run release`)
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {spawn} from "node:child_process";
import {STUDIES,TOPICS,SITE} from "./src/content.mjs";

const ROOT=path.dirname(fileURLToPath(import.meta.url));
const PORT=8791, BASE="http://localhost:"+PORT;
const {chromium}=await import("playwright").catch(()=>{ console.error("Falta playwright: npm i -D playwright && npx playwright install chromium"); process.exit(1); });

const server=spawn(process.execPath,[path.join(ROOT,"serve.mjs")],{env:{...process.env,PORT:String(PORT)},stdio:"ignore"});
await new Promise(r=>setTimeout(r,800));
fs.mkdirSync(path.join(ROOT,"snapshots"),{recursive:true}); fs.mkdirSync(path.join(ROOT,"og"),{recursive:true});

const routes=["/","/preguntas/","/temas/",...TOPICS.map(T=>"/temas/"+T.id+"/"),...STUDIES.map(S=>"/preguntas/"+S.id+"/"),"/laboratorio/","/laboratorio/metodo/","/municipio/","/quien-soy/"];
const fname=r=>(r==="/"?"index":r.replace(/^\/|\/$/g,"").replace(/\//g,"__"))+".html";
const browser=await chromium.launch(process.env.CHROMIUM?{executablePath:process.env.CHROMIUM}:{});
const ctx=await browser.newContext({viewport:{width:1280,height:900},deviceScaleFactor:2,reducedMotion:"reduce"});
// dibujos de las tarjetas como imagen estática (art/<id>.jpg): aparecen al instante, sin esperar datos ni cálculos
fs.mkdirSync(path.join(ROOT,"art"),{recursive:true});
const artPage=await ctx.newPage(); if(process.env.OFFLINE) await artPage.route(/googleapis|gstatic/,r=>r.abort());
await artPage.setViewportSize({width:1280,height:900});
await artPage.goto(BASE+"/preguntas/?live=1",{waitUntil:"domcontentloaded"});
await artPage.waitForFunction(()=>!document.querySelector("#view .loading")&&document.querySelectorAll(".qg a svg").length>=5,{timeout:30000}).catch(()=>{});
await artPage.waitForTimeout(3500);
await artPage.evaluate(()=>document.querySelectorAll(".qg a svg").forEach(s=>{ s.classList.add("in"); s.querySelectorAll("*").forEach(e=>{ e.style.transition="none"; }); }));
await artPage.waitForTimeout(800);
const cards=await artPage.$$(".qg a");
for(const c of cards){ const id=await c.getAttribute("data-qid"); const sv=await c.$("svg"); if(!sv||!id) continue;
  await sv.screenshot({path:path.join(ROOT,"art",id+".jpg"),type:"jpeg",quality:82,scale:"device"}); console.log("art",id); }
// y el dibujo grande de la portada, en versión ancha y móvil, para cada pregunta destacada
for(const [w,h,suf] of [[1280,900,""],[600,900,"-m"]]){
  await artPage.setViewportSize({width:w,height:h});
  await artPage.goto(BASE+"/?live=1",{waitUntil:"domcontentloaded"});
  await artPage.waitForFunction(()=>document.querySelector("#qhart svg"),{timeout:40000}).catch(()=>{});
  await artPage.waitForTimeout(2500);
  const n=Math.max(1,await artPage.evaluate(()=>document.querySelectorAll("#qhd button[data-i]").length));
  for(let j=0;j<n;j++){
    await artPage.evaluate(j=>{ const b=document.querySelector(`#qhd button[data-i="${j}"]`); if(b) b.click(); },j);
    await artPage.waitForTimeout(1200);
    await artPage.evaluate(()=>{ document.querySelectorAll("#qhart .spot,#qhart .spot-ring").forEach(e=>e.remove()); const s=document.querySelector("#qhart svg"); if(s){ s.classList.add("in"); s.querySelectorAll("*").forEach(e=>{ e.style.transition="none"; }); } });
    const id=await artPage.evaluate(()=>document.querySelector("#qha a")?.getAttribute("href")||"");
    const qid=await artPage.evaluate(j=>{ const L=(window.__INDICIO_HERO||[]); return L[j]; },j);
    const sv=await artPage.$("#qhart svg"); if(!sv) continue;
    const key=qid||("hero"+j);
    await sv.screenshot({path:path.join(ROOT,"art","hero-"+key+suf+".jpg"),type:"jpeg",quality:84,scale:"device"}); console.log("art hero",key+suf);
  }
}
await artPage.close();

const page=await ctx.newPage();
if(process.env.OFFLINE) await page.route(/googleapis|gstatic/,r=>r.abort());
// las páginas se capturan ya con las imágenes estáticas recién generadas
const ARTS=fs.readdirSync(path.join(ROOT,"art")).filter(f=>f.endsWith(".jpg")).map(f=>f.replace(/\.jpg$/,""));
await page.addInitScript(arts=>{ Object.defineProperty(window,"__INDICIO_ARTS",{value:arts}); document.addEventListener("DOMContentLoaded",()=>{ if(window.__INDICIO) window.__INDICIO.arts=arts; }); },ARTS);
await page.route(/\/art\/[\w-]+\.jpg$/,r=>{ const f=path.join(ROOT,"art",r.request().url().split("/").pop()); fs.existsSync(f)?r.fulfill({path:f,contentType:"image/jpeg"}):r.continue(); });
try{ localStorage; }catch(e){}
for(const r of routes){
  await page.goto(BASE+r,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>!document.querySelector("#view .loading"),{timeout:20000}).catch(()=>{});
  await page.waitForTimeout(r==="/"?4000:2500);
  const html=await page.evaluate(()=>{
    const v=document.getElementById("view").cloneNode(true);
    v.querySelectorAll("script,.toast,.spot,.spot-ring,#mypop").forEach(e=>e.remove());
    v.querySelectorAll(".rv").forEach(e=>e.classList.add("in"));
    v.querySelectorAll(".qh-fade").forEach(e=>e.classList.remove("out"));
    // sin municipio elegido en el HTML estático
    v.querySelectorAll(".ismine").forEach(e=>e.classList.remove("ismine"));
    // los dibujos muy pesados (mapas con 8.000 municipios) no van en el HTML estático: se dejan como hueco del mismo tamaño y la app los pinta
    v.querySelectorAll("svg").forEach(sv=>{ if(sv.outerHTML.length>60000){ const ph=sv.cloneNode(false); ph.classList.add("svg-ph"); ph.setAttribute("aria-hidden","true"); sv.replaceWith(ph); } });
    return v.innerHTML;
  });
  fs.writeFileSync(path.join(ROOT,"snapshots",fname(r)),html);
  console.log("snapshot",r,Math.round(html.length/1024)+" KB");
}

// imágenes Open Graph: título + respuesta corta + el dibujo de la tarjeta de cada pregunta
await page.goto(BASE+"/preguntas/?live=1",{waitUntil:"domcontentloaded"});
await page.waitForFunction(()=>!document.querySelector("#view .loading"),{timeout:20000}).catch(()=>{});
await page.waitForTimeout(3000);
const arts=await page.evaluate(()=>Object.fromEntries([...document.querySelectorAll(".qg a")].map(a=>{ const m=(a.getAttribute("href")||"").match(/^\/preguntas\/([\w-]+)\//); const s=a.querySelector("svg"); if(s){ s.classList.add("in"); s.querySelectorAll("*").forEach(e=>{ e.style.transition="none"; e.style.opacity=""; e.style.transform=""; }); } return m?[m[1],s?s.outerHTML:""]:null; }).filter(Boolean)));
const css=fs.readFileSync(path.join(ROOT,"src/styles.css"),"utf8");
const ogPage=await ctx.newPage(); await ogPage.setViewportSize({width:1200,height:630});
for(const S of STUDIES){
  const art=arts[S.id]||"";
  const html=`<!doctype html><html lang="es"><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=Libre+Franklin:wght@400;700&family=Newsreader:ital,opsz,wght@0,6..72,500;1,6..72,500&display=block"><style>${css}
  html,body{margin:0;background:var(--bg);width:1200px;height:630px;overflow:hidden}
  .og{position:relative;width:1200px;height:630px;padding:56px 64px;box-sizing:border-box;display:grid;grid-template-columns:minmax(0,1fr) 400px;gap:48px;align-items:center}
  .og .brand{position:absolute;left:64px;top:40px;font-family:"Fraunces",var(--serif);font-size:38px;font-weight:600;font-variation-settings:"opsz" 144;letter-spacing:-.025em;color:var(--ink)}
  .og .brand .lg-i{position:relative} .og .brand .lg-i:after{content:"";position:absolute;left:50%;top:.3em;width:.165em;height:.165em;border-radius:50%;background:var(--brand-2);transform:translateX(-50%)}
  .og .k{font-family:"Libre Franklin",Arial,sans-serif;font-size:15px;letter-spacing:.14em;text-transform:uppercase;color:var(--brand);font-weight:700;margin-bottom:14px}
  .og h1{font-family:var(--serif);font-size:${S.t.length>42?52:60}px;line-height:1.05;letter-spacing:-.015em;color:var(--ink);margin:0 0 20px;font-weight:500}
  .og p{font-family:var(--serif);font-size:25px;line-height:1.35;color:var(--ink-2);margin:0;max-width:640px}
  .og p b{color:var(--ink)}
  .og .art{display:flex;align-items:center;justify-content:center}
  .og .art svg{width:400px;height:auto;max-height:420px;opacity:1}
  .og .art svg *{transition:none!important;opacity:revert-layer}
  .og .foot{position:absolute;left:64px;bottom:40px;font-family:"Libre Franklin",Arial,sans-serif;font-size:17px;color:var(--muted)}
  .rv-bars rect,.rv-spikes g path,.rv-tiles rect,.rv-turnout circle{opacity:1!important;transform:none!important}.rv-ridge path[fill="none"],.rv-scatter line{stroke-dashoffset:0!important}
  </style></head><body><div class="og">
  <div class="brand">Indic<span class="lg-i">ı</span>o</div>
  <div style="padding-top:40px"><div class="k">${(TOPICS.find(T=>T.id===S.tema)||{}).l||""} · ${S.m}</div><h1>${S.t}</h1><p><b>${S.a.split(". ")[0]}.</b> ${S.a.split(". ").slice(1).join(". ")}</p></div>
  <div class="art">${art}</div>
  <div class="foot">indicio.es · Preguntas reales, respuestas con datos públicos</div></div></body></html>`;
  await ogPage.setContent(html,{waitUntil:"networkidle"}); await ogPage.evaluate(()=>document.fonts.ready); await ogPage.waitForTimeout(600);
  await ogPage.screenshot({path:path.join(ROOT,"og",S.id+".png"),type:"png"});
  console.log("og",S.id);
}
await browser.close(); server.kill();
console.log("Listo. Ahora: npm run build");
