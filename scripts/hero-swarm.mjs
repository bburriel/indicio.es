// Posición de cada municipio en el dibujo de puntos de la portada (art/hero-campo*.jpg),
// para que al pasar el ratón se pueda saber qué punto es. Repite exactamente el cálculo de
// QART.swarm en src/app.js (misma simulación de d3, que es determinista).
// Uso: node scripts/hero-swarm.mjs   →  art/hero-campo.json  (c: códigos; x, y, r en décimas de unidad del dibujo)
import fs from "fs"; import path from "path"; import vm from "vm"; import {fileURLToPath} from "url";
const ROOT=path.join(path.dirname(fileURLToPath(import.meta.url)),"..");
const ctx={setTimeout,clearTimeout,setInterval,clearInterval,performance,requestAnimationFrame:f=>setTimeout(f,16),console}; ctx.globalThis=ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT,"vendor/d3.min.js"),"utf8"),ctx);
const d3=ctx.d3;
const ix=JSON.parse(fs.readFileSync(path.join(ROOT,"data/index.json"),"utf8")); const F={}; ix.fields.forEach((f,i)=>F[f]=i);
const out={}; let codes=null;
for(const [key,W,H] of [["d",1120,380],["m",720,520]]){
  const mid=H/2+6, mob=W<800;
  const X0=d3.scaleLinear().domain([-70,100]).range([16,W-(mob?60:110)]), X=v=>v<=100?X0(Math.max(-70,v)):X0(100)+Math.log(v/100)*(mob?20:38);
  const R=d3.scaleSqrt().domain([0,3.4e6]).range([mob?1.3:1.1,mob?16:20]);
  const nodes=ix.rows.filter(r=>r[F.var0525]!=null&&r[F.edad]!=null).map(r=>({c:r[F.code],v:r[F.var0525],e:r[F.edad],r:Math.max(mob?1.3:1.15,R(r[F.pop]||0))}));
  nodes.forEach((d,i)=>{ d.x=X(d.v)+((i*7919)%10)/10-.5; d.y=mid+(((i*104729)%100)/100-.5)*40; });
  const sim=d3.forceSimulation(nodes).force("x",d3.forceX(d=>X(d.v)).strength(.9)).force("y",d3.forceY(mid).strength(mob?.03:.05)).force("c",d3.forceCollide(d=>d.r+.35).iterations(1)).stop();
  for(let i=0;i<90;i++) sim.tick();
  if(!codes){ codes=nodes.map(d=>d.c); out.c=codes; }
  out[key]={W,H,x:nodes.map(d=>Math.round(d.x*10)),y:nodes.map(d=>Math.round(d.y*10)),r:nodes.map(d=>Math.round(d.r*10))};
}
fs.writeFileSync(path.join(ROOT,"art/hero-campo.json"),JSON.stringify(out));
console.log("art/hero-campo.json",fs.statSync(path.join(ROOT,"art/hero-campo.json")).size,"bytes");
