// Avisa a IndexNow (Bing, Yandex, Seznam…; Bing alimenta también las búsquedas de ChatGPT y Copilot) de las páginas
// que han cambiado. Lo lanza .github/workflows/indexnow.yml después de cada publicación en main.
//   node scripts/indexnow.mjs            → páginas editoriales (análisis, temas, rankings, provincias…)
//   node scripts/indexnow.mjs todo       → también las 8.000 fichas de municipios (cuando cambian los datos)
const SITE="https://indicio.es", KEY="0b32a63914d9a143d8bf765fc1576ef8";
const get=async u=>{ const r=await fetch(u); if(!r.ok) throw new Error(u+" "+r.status); return r.text(); };
const locs=x=>[...x.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
const index=locs(await get(SITE+"/sitemap.xml"));
const maps=index.filter(u=>process.argv[2]==="todo"||!/municipios/.test(u));
let urls=[]; for(const m of maps) urls.push(...locs(await get(m)));
console.log(`IndexNow: ${urls.length} URLs`);
for(let i=0;i<urls.length;i+=9000){
  const r=await fetch("https://api.indexnow.org/indexnow",{method:"POST",headers:{"Content-Type":"application/json; charset=utf-8"},
    body:JSON.stringify({host:"indicio.es",key:KEY,keyLocation:`${SITE}/${KEY}.txt`,urlList:urls.slice(i,i+9000)})});
  console.log("respuesta",r.status,await r.text());
}
