// Imágenes para compartir (1200×630) de municipios grandes, provincias y rankings, a partir de dist/og-extra.json
// (lo escribe el build). Solo redibuja las que han cambiado (og/_extra.json guarda una huella de cada una).
// Uso: npm run build && node og-extra.mjs && npm run build   (snapshot.mjs lo llama al final)
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {fileURLToPath} from "node:url";

const ROOT=path.dirname(fileURLToPath(import.meta.url));
const LIST=path.join(ROOT,"dist","og-extra.json"), HASHF=path.join(ROOT,"og","_extra.json");
if(!fs.existsSync(LIST)){ console.error("Falta dist/og-extra.json: ejecuta antes npm run build"); process.exit(1); }
const items=JSON.parse(fs.readFileSync(LIST,"utf8")), prev=fs.existsSync(HASHF)?JSON.parse(fs.readFileSync(HASHF,"utf8")):{};
const css=fs.readFileSync(path.join(ROOT,"src/styles.css"),"utf8");
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const VER="2";   // súbelo al cambiar el diseño para que se redibujen todas
const hash=o=>crypto.createHash("sha1").update(VER+JSON.stringify(o)+css.length).digest("hex").slice(0,12);
const todo=items.filter(o=>prev[o.file]!==hash(o)||!fs.existsSync(path.join(ROOT,"og",o.file+".jpg")));
console.log(`og-extra: ${items.length} imágenes, ${todo.length} por dibujar`);
if(!todo.length) process.exit(0);
const {chromium}=await import("playwright");
const browser=await chromium.launch(process.env.CHROMIUM?{executablePath:process.env.CHROMIUM}:{});
const page=await browser.newPage({viewport:{width:1200,height:630}});
if(process.env.OFFLINE) await page.route(/googleapis|gstatic/,r=>r.abort());
const html=o=>`<!doctype html><html lang="es"><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=Libre+Franklin:wght@400;700&family=Newsreader:opsz,wght@6..72,500&display=block"><style>${css}
html,body{margin:0;background:var(--bg);width:1200px;height:630px;overflow:hidden}
.og{position:relative;width:1200px;height:630px;padding:100px 64px 80px;box-sizing:border-box}
.brand{position:absolute;left:64px;top:40px;font-family:"Fraunces",var(--serif);font-size:38px;font-weight:600;letter-spacing:-.025em;color:var(--ink)}
.k{font-family:"Libre Franklin",Arial,sans-serif;font-size:17px;letter-spacing:.14em;text-transform:uppercase;color:var(--brand);font-weight:700;margin-bottom:12px}
h1{font-family:var(--serif);font-size:${o.t.length>40?50:o.t.length>26?58:72}px;line-height:1.04;color:var(--ink);margin:0 0 ${o.list?20:30}px;max-width:none;font-weight:500;letter-spacing:-.015em}
p{font-family:var(--serif);font-size:30px;line-height:1.35;color:var(--ink-2);margin:0;max-width:1000px}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
.st{background:var(--band);border-radius:14px;padding:22px 24px} .st span{display:block;font-family:"Libre Franklin",Arial,sans-serif;font-size:18px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em}
.st b{display:block;font-family:"Libre Franklin",Arial,sans-serif;font-size:46px;color:var(--ink);margin:6px 0 4px} .st small{font-family:"Libre Franklin",Arial,sans-serif;font-size:18px;color:var(--ink-2)}
ol{list-style:none;margin:0;padding:0;font-family:"Libre Franklin",Arial,sans-serif;font-size:25px} li{display:grid;grid-template-columns:44px 1fr auto;gap:12px;padding:5px 0;border-bottom:1px solid var(--rule)}
li i{font-style:normal;color:var(--muted)} li small{color:var(--muted);font-size:20px;margin-left:8px} li b{color:var(--brand)}
.foot{position:absolute;left:64px;bottom:34px;font-family:"Libre Franklin",Arial,sans-serif;font-size:18px;color:var(--muted)}
</style></head><body><div class="og"><div class="brand">Indicio</div><div class="k">${esc(o.k)}</div><h1>${esc(o.t)}</h1>
${o.stats?`<div class="stats">${o.stats.map(([l,v,s])=>`<div class="st"><span>${esc(l)}</span><b>${esc(v)}</b><small>${esc(s)}</small></div>`).join("")}</div>`:""}
${o.text?`<p>${esc(o.text)}</p>`:""}
${o.list?`<ol>${o.list.slice(0,4).map(([i,n,pv,v])=>`<li><i>${i}</i><span>${esc(n)}<small>${esc(pv)}</small></span><b>${esc(v)}</b></li>`).join("")}</ol>`:""}
<div class="foot">indicio.es · Datos oficiales del INE y el SEPE</div></div></body></html>`;
const out={...prev}; let n=0;
for(const o of todo){
  await page.setContent(html(o),{waitUntil:process.env.OFFLINE?"domcontentloaded":"networkidle"}); await page.evaluate(()=>document.fonts.ready);
  await page.screenshot({path:path.join(ROOT,"og",o.file+".jpg"),type:"jpeg",quality:80});
  out[o.file]=hash(o); if(++n%100===0){ console.log(n); fs.writeFileSync(HASHF,JSON.stringify(out)); }
}
fs.writeFileSync(HASHF,JSON.stringify(out));
await browser.close(); console.log("og-extra: listo");
