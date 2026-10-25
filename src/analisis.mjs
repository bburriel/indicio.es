// Análisis: junta la lista de src/content.mjs (STUDIES) con los textos editables de contenido/analisis/<id>.md.
//
// Cada .md tiene una cabecera (entre dos líneas «---») y el texto del análisis en Markdown. Los campos de la
// cabecera sustituyen a los de content.mjs; un .md con un id nuevo crea un análisis nuevo. Con «oculto: sí» el
// análisis desaparece de las listas, del sitemap y del RSS, pero su página se sigue generando (con noindex) para
// que los enlaces antiguos no se rompan. La sintaxis completa está en contenido/analisis/LEEME.md.
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {STUDIES as BASE} from "./content.mjs";

const ROOT=path.join(path.dirname(fileURLToPath(import.meta.url)),"..");
const DIR=path.join(ROOT,"contenido","analisis");
// nombre en la cabecera → campo interno
const KEYS={titulo:"t",entradilla:"d",respuesta:"a",tema:"tema",metodo:"m",evidencia:"ev",actualizado:"upd",publicado:"pub",oculto:"oculto",orden:"orden",motivo:"motivo"};
const YES=/^(s[ií]|true|1|yes)$/i;

export function parseMD(raw){
  raw=raw.replace(/\r\n/g,"\n");
  const m=raw.match(/^---\n([\s\S]*?)\n---\n?/), meta={};
  if(m) for(const l of m[1].split("\n")){ const k=l.match(/^([\wáéíóúñ]+):\s*(.*)$/i); if(!k) continue; let v=k[2].trim().replace(/^"(.*)"$/,"$1"); meta[k[1].toLowerCase()]=v; }
  return {meta,body:m?raw.slice(m[0].length):raw};
}

export const MD={};
if(fs.existsSync(DIR)) for(const f of fs.readdirSync(DIR).filter(f=>f.endsWith(".md")&&!/^(LEEME|README|_)/i.test(f)).sort()){
  const id=f.replace(/\.md$/,""), {meta,body}=parseMD(fs.readFileSync(path.join(DIR,f),"utf8"));
  const o={}; for(const [k,v] of Object.entries(meta)) if(KEYS[k]) o[KEYS[k]]=v;
  if("oculto" in o) o.oculto=YES.test(o.oculto); if("orden" in o) o.orden=+o.orden;
  MD[id]={meta:o,body};
}

const merged=BASE.map(S=>MD[S.id]?{...S,...MD[S.id].meta,md:true}:{...S});
for(const [id,{meta}] of Object.entries(MD)) if(!BASE.some(S=>S.id===id)){
  if(!meta.t||!meta.a){ console.warn(`contenido/analisis/${id}.md: falta «titulo» o «respuesta»; no se publica.`); continue; }
  merged.push({id,ev:"desc",m:"Análisis descriptivo",d:"",tema:"riqueza",...meta,md:true});
}
// orden: el campo «orden» si lo hay (más bajo, antes); si no, el de content.mjs
merged.forEach((S,i)=>{ S._i=S.orden!=null&&!isNaN(S.orden)?S.orden:i; });
merged.sort((a,b)=>a._i-b._i).forEach(S=>delete S._i);

export const ALL=merged;                            // todos, también los ocultos (para generar sus páginas)
export const STUDIES=merged.filter(S=>!S.oculto);   // los que se listan
export const HIDDEN=merged.filter(S=>S.oculto);
export const MDBODY=Object.fromEntries(Object.entries(MD).map(([id,o])=>[id,o.body]));
