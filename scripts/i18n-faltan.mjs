// Lista las frases de la interfaz que siguen sin traducir al catalán, gallego, euskera e inglés.
//   npm run i18n:faltan            resumen y las frases de las páginas «cerradas»
//   npm run i18n:faltan -- --todas  incluye también los análisis y los temas (que aún no se traducen)
// Lee el HTML estático (src/body.html y snapshots/) y src/content.mjs; no abre el navegador, así que no ve
// los textos que pinta app.js con datos. Para esos, mira src/i18n-textos.mjs y la nota de «solo en castellano».
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {ROWS} from "../src/i18n-textos.mjs";
import {TOPICS,PAGES} from "../src/content.mjs";

const ROOT=path.join(path.dirname(fileURLToPath(import.meta.url)),"..");
// Páginas que ya se dan por cerradas: lo que falte aquí hay que traducirlo. El resto (análisis, temas…) cambia
// todavía y se traducirá cuando esté más cerrado. Para cerrar una más, añade su nombre de snapshots/ (sin .html).
export const CERRADAS=["quien-soy","laboratorio","laboratorio__metodo","municipio"];

const NUMRE=/\d[\d.,]*\d|\d/g;
const norm=s=>s.replace(/\s+/g," ").trim().replace(NUMRE,"{#}");
const HAVE=new Set(ROWS.map(r=>norm(r[0])));
const ENT={"&amp;":"&","&lt;":"<","&gt;":">","&quot;":'"',"&#39;":"'","&apos;":"'","&nbsp;":" ","&shy;":""};
const unent=s=>s.replace(/&(amp|lt|gt|quot|apos|nbsp|shy|#39);/g,m=>ENT[m]).replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(+n)).replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCharCode(parseInt(n,16)));
// nombres propios, siglas, nombres de idioma y marcas de la plantilla: no se traducen
const IGNORAR=new Set(["Indic","Indicio","RSS","Castellano","Català","Galego","Euskara","English"]);
const hasLetters=s=>/[A-Za-zÁÉÍÓÚÑáéíóúñ]{2}/.test(s)&&!IGNORAR.has(s)&&!/^\{\{.*\}\}$/.test(s);

function textosDeHtml(html){
  html=html.replace(/<(script|style)[\s\S]*?<\/\1>/gi,"").replace(/<svg[\s\S]*?<\/svg>/gi,m=>m.replace(/<(?!\/?(text|tspan|title)\b)[^>]*>/gi,"\n"));
  const out=[];
  for(const m of html.matchAll(/<[^>]*\b(?:title|aria-label|placeholder|alt)="([^"]*)"[^>]*>/gi)) out.push(unent(m[1]));
  for(const t of html.replace(/<[^>]*>/g,"\n").split("\n")) out.push(unent(t));
  return out.map(norm).filter(t=>t&&hasLetters(t));
}
const fuentes=()=>{
  const f=[["src/body.html",textosDeHtml(fs.readFileSync(path.join(ROOT,"src/body.html"),"utf8")),true]];
  const sn=path.join(ROOT,"snapshots");
  if(fs.existsSync(sn)) for(const n of fs.readdirSync(sn).filter(n=>n.endsWith(".html")).sort()){
    const nombre=n.replace(/\.html$/,"");
    f.push(["snapshots/"+n,textosDeHtml(fs.readFileSync(path.join(sn,n),"utf8")),CERRADAS.includes(nombre)]);
  }
  const c=[];
  for(const t of TOPICS) c.push(t.l,t.q,t.d);
  for(const k of Object.keys(PAGES)) c.push(PAGES[k].t.replace(/ · Indicio$/,""),PAGES[k].d);
  f.push(["src/content.mjs (temas y páginas)",c.map(norm).filter(hasLetters),false]);
  return f;
};

export function faltan({todas=false}={}){
  const res=[]; let cerradas=0;
  for(const [nombre,textos,cerrada] of fuentes()){
    const unicos=[...new Set(textos)], sin=unicos.filter(t=>!HAVE.has(t));
    if(cerrada) cerradas+=sin.length;
    res.push({nombre,cerrada,total:unicos.length,sin});
  }
  return {res,cerradas};
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
  const todas=process.argv.includes("--todas");
  const {res,cerradas}=faltan({todas});
  for(const r of res){
    if(!todas&&!r.cerrada) continue;
    console.log(`${r.cerrada?"●":"○"} ${r.nombre}: ${r.total-r.sin.length}/${r.total} traducidas`+(r.cerrada?"":"  (aún no se traduce)"));
    for(const t of r.sin.slice(0,todas?15:60)) console.log("    "+t.slice(0,150));
    if(r.sin.length>(todas?15:60)) console.log(`    … y ${r.sin.length-(todas?15:60)} más`);
  }
  console.log(`\nSin traducir en las páginas cerradas: ${cerradas}`);
}
