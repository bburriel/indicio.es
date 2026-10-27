// Ilustraciones de datos: cada análisis y cada tema tiene su propio gráfico, dibujado con sus datos reales,
// y todos comparten acabado: papel claro, línea fina en tinta y el granate como único acento.
// Uso: node scripts/ilustraciones/graficos.mjs  →  art/il/<id>.svg, art/il/t-<id>.svg y src/illus-olas.mjs
import fs from "fs"; import path from "path"; import vm from "vm"; import {fileURLToPath} from "url";
const ROOT=path.join(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ctx={console,setTimeout,clearTimeout}; ctx.globalThis=ctx; ctx.window=ctx; vm.createContext(ctx);
for(const f of ["d3.min.js","topojson-client.min.js"]) vm.runInContext(fs.readFileSync(path.join(ROOT,"vendor",f),"utf8"),ctx);
const {d3,topojson}=ctx;
const J=f=>JSON.parse(fs.readFileSync(path.join(ROOT,"data",f),"utf8"));
const IX=J("index.json"), F={}; IX.fields.forEach((f,i)=>F[f]=i); const ROWS=IX.rows;
const REFS=J("refs.json"), REG=J("regional.json"), PIR=J("piramide.json"), ALI=J("alimentos.json"), SUE=J("sueldos.json"),
      GOV=J("gov.json"), EXT=J("ext.json"), CAU=J("causales.json"), TOPO=J("municipios.topo.json");
const PROVS=Object.keys(REFS.prov).filter(p=>!["51","52"].includes(p));
const CAT=new Set(["08","17","25","43"]);

// ---------- dibujo ----------
const PAPER="#fafaf8", INK="#2a2826", WINE="#8a2232", WASH="#f6e9e9", GREY="#a3a19b";
const n1=v=>Math.round(v*10)/10;
// rows: [{v:[números], hi:bool}] de atrás (arriba) hacia delante (abajo). v se reparte entre x0 y x1; fuera, línea plana.
function olas(W,H,rows,o={}){
  if(rows.length>(o.maxRows??(W>800?32:26))) rows=rows.filter((r,i)=>i%2===0||r.hi);
  const top=o.top??H*0.2, bot=o.bot??H*0.93, n=rows.length, step=(bot-top)/Math.max(1,n-1);
  const amp=o.amp??step*(o.k??4.5)*(o.global?1:1.3), x0=o.x0??W*0.015, x1=o.x1??W*0.985, sw=o.sw??(W>800?1.1:1.05), NP=o.np??170, pw=o.pow??(o.global?1:1.7);
  // cada ola se escala a sí misma (lo que importa es su forma), se remuestrea y se apaga suavemente en los bordes
  const glob=o.global?d3.max(rows,r=>d3.max(r.v)-(o.keepZero?0:d3.min(r.v))):null;
  let s=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="${PAPER}"/>`;
  rows.forEach((r,i)=>{
    const y0=top+i*step, v=r.v.map(x=>x??0), lo=o.keepZero?0:d3.min(v), hi=glob??(d3.max(v)-lo||1);
    const m=v.length, at=t=>{ const q=t*(m-1), a=Math.floor(q), b=Math.min(m-1,a+1), f=q-a; return v[a]*(1-f)+v[b]*f; };
    const ed=o.edge??0.1, tap=t=>{ const e=Math.min(t,1-t)/ed; return e>=1?1:e<=0?0:e*e*(3-2*e); };
    const raw=d3.range(NP).map(j=>Math.max(0,(at(j/(NP-1))-lo)/hi));
    const sm=o.soft===0?raw:smooth(raw,o.soft??1.5);
    const pts=sm.map((u,j)=>[x0+(x1-x0)*j/(NP-1),y0-Math.pow(u,pw)*tap(j/(NP-1))*amp*(r.a??1)]);
    const d="M0,"+n1(y0)+"L"+pts.map(([x,y])=>n1(x)+","+n1(y)).join("L")+"L"+W+","+n1(y0);
    s+=`<path d="${d}L${W},${n1(y0+2)}L0,${n1(y0+2)}Z" fill="${r.hi?WASH:PAPER}"/>`;
    s+=`<path d="${d}" fill="none" stroke="${r.hi?WINE:INK}" stroke-width="${r.hi?sw*1.45:sw}" stroke-linejoin="round"/>`;
    if(r.marks) r.marks.forEach(k=>{ const j=Math.round(k*(NP-1)); const p=pts[j]; if(p) s+=`<circle cx="${n1(p[0])}" cy="${n1(p[1])}" r="${W>800?3.4:3}" fill="${WINE}" stroke="${PAPER}" stroke-width="1.3"/>`; });
  });
  return s+"</svg>";
}
// densidad suavizada de unos valores sobre una malla de nb puntos
function kde(vals,lo,hi,nb=90,bw){ const v=vals.filter(x=>x!=null&&isFinite(x)); const h=bw??(hi-lo)/18; const g=d3.range(nb).map(i=>lo+(hi-lo)*i/(nb-1));
  return g.map(x=>d3.sum(v,y=>Math.exp(-(((x-y)/h)**2)/2))/(v.length||1)); }
const smooth=(a,k=2)=>a.map((_,i)=>{ let s=0,w=0; const K=Math.ceil(k*2); for(let j=-K;j<=K;j++){ const q=a[i+j]; if(q==null) continue; const wt=Math.exp(-j*j/(2*k*k)); s+=q*wt; w+=wt; } return s/w; });
const norm=a=>{ const lo=d3.min(a), hi=d3.max(a); return a.map(v=>(v-lo)/((hi-lo)||1)); };
const col=k=>ROWS.map(r=>r[F[k]]);
const yrs=o=>Object.keys(o).sort();

// ---------- mapas en franjas (como la portada) ----------
const FE=topojson.feature(TOPO,TOPO.objects.municipalities).features;
const CEN=new Map(FE.map(f=>[f.id,d3.geoCentroid(f)]));
const BY=new Map(ROWS.map(r=>[r[F.code],r]));
function geoRows(nRows,nb,weight,hiFn){
  const latS=d3.scaleLinear().domain([43.9,36.0]).range([0,nRows-1]), lonS=d3.scaleLinear().domain([-9.4,3.4]).range([0,nb-1]);
  const grid=d3.range(nRows).map(()=>new Array(nb).fill(0)), marks=d3.range(nRows).map(()=>[]);
  for(const [c,[lon,lat]] of CEN){ if(lat<35.9||lon<-9.6||lon>3.4) continue; const r=Math.round(latS(lat)), k=Math.round(lonS(lon)); if(r<0||r>=nRows||k<0||k>=nb) continue;
    const row=BY.get(c); const w=row?weight(row):0; if(w>0) grid[r][k]+=w; if(hiFn&&hiFn(c)) marks[r].push(k); }
  return grid.map((row,r)=>({v:smooth(row,1.6).map(v=>Math.pow(v,.55)),marks:[...new Set(marks[r])].map(k=>k/(nb-1))}));
}

// ---------- las ilustraciones ----------
const B=[1200,360], T=[640,400];
const out={}, lab={};
const add=(id,label,svg)=>{ out[id]=svg; lab[id]=label; };

// ---------- piezas comunes ----------
const yoy=a=>a.slice(1).map((v,i)=>a[i]!=null&&v!=null&&a[i]?v/a[i]-1:null);
const last=a=>{ for(let i=a.length-1;i>=0;i--) if(a[i]!=null) return i; return -1; };
const GEO={global:true,keepZero:true,edge:0.004,soft:0,np:300,k:5.5};
const LINE="#bdbab2", LIGHT="#e3e1db", ROSE="#d6a3a8", WINE2="#b0566a", DARK="#6b6862";
const SEQ=["#e8e3dc","#dcc3c3","#cc9ea2","#b77580","#9f4b5c","#7e2338"];   // de papel a granate
const PARTY={"PP":"#7189ab","PSOE":"#8a2232","Lista local":"#d9d6ce","EH Bildu":"#8faa86","ERC":"#d6aa52","PNV":"#5f8a68","Junts":"#c79b4b","Sumar":"#b0566a","Vox":"#6b8f5a","UPN":"#9db0c8","PRC":"#b9b6ae","Cs":"#e0a37a","Otros":"#b9b6ae"};
const svgOpen=(W,H)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="${PAPER}"/>`;
const r1=v=>Math.round(v*10)/10;
const circ=(x,y,r,f,extra="")=>`<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(r)}" fill="${f}"${extra}/>`;
const rect=(x,y,w,h,f,extra="")=>`<rect x="${r1(x)}" y="${r1(y)}" width="${r1(Math.max(0,w))}" height="${r1(Math.max(0,h))}" fill="${f}"${extra}/>`;
const line=(x1,y1,x2,y2,s,w=1,extra="")=>`<line x1="${r1(x1)}" y1="${r1(y1)}" x2="${r1(x2)}" y2="${r1(y2)}" stroke="${s}" stroke-width="${w}"${extra}/>`;
const pathD=pts=>"M"+pts.map(([x,y])=>r1(x)+","+r1(y)).join("L");
const hash=(s,k=1)=>{ let h=2166136261^k; for(const ch of String(s)) h=Math.imul(h^ch.charCodeAt(0),16777619); return ((h>>>0)%100000)/100000; };
// proyección de España (con Canarias en recuadro)
vm.runInContext(fs.readFileSync(path.join(ROOT,"vendor/d3-composite-projections.min.js"),"utf8"),ctx);
const REGIONS=topojson.feature(TOPO,TOPO.objects.autonomous_regions);
const proj=(W,H,pad)=>ctx.d3.geoConicConformalSpain().fitExtent([[pad[0],pad[1]],[W-pad[0],H-pad[1]]],REGIONS);
const outline=(P,stroke=LIGHT)=>{ const g=d3.geoPath(P); return `<path d="${g(topojson.mesh(TOPO,TOPO.objects.autonomous_regions,(a,b)=>a===b)).replace(/\d+\.\d+/g,m=>r1(+m))}" fill="none" stroke="${stroke}" stroke-width="1"/>`; };
const mrows=f=>ROWS.filter(f);

// 1. Cerca de la ciudad: una cúpula de puntos; el radio es la distancia a la ciudad y el color, si el pueblo gana o pierde vecinos
{ const [W,H]=B, cx=W/2, cy=H+30, R=d3.scaleLinear().domain([0,180]).range([40,700]).clamp(true);
  let s=svgOpen(W,H); [25,50,75,100,125,150].forEach(k=>{ s+=`<circle cx="${cx}" cy="${cy}" r="${r1(R(k))}" fill="none" stroke="${LIGHT}" stroke-width="1" stroke-dasharray="3 5"/>`; });
  const col=v=>v>15?WINE:v>0?ROSE:v>-25?LINE:DARK;
  mrows(r=>r[F.distCiudad]!=null&&r[F.var0525]!=null).sort((a,b)=>Math.abs(a[F.var0525])-Math.abs(b[F.var0525])).forEach(r=>{ const a=Math.PI*(1.04+0.92*hash(r[F.code])), d=R(r[F.distCiudad]+hash(r[F.code],7)*4);
    const x=cx+Math.cos(a)*d, y=cy+Math.sin(a)*d; if(y>-4&&x>-4&&x<W+4) s+=circ(x,y,1.5,col(r[F.var0525])); });
  add("cerca-ciudad","Cada punto es un municipio; cuanto más lejos del centro, más lejos de una ciudad. En granate, los que ganan vecinos; en gris, los que los pierden",s+"</svg>"); }

// 2. Pisos turísticos: un horizonte de barras, una por municipio de cada provincia en orden; la altura es el porcentaje de viviendas que no son residencia habitual
{ const [W,H]=B, rs=d3.groups(mrows(r=>r[F.noPrincipal]!=null&&r[F.pop]>=500),r=>r[F.code].slice(0,2)).sort((a,b)=>a[0]<b[0]?-1:1).flatMap(([p,g])=>{ g.sort((a,b)=>a[F.noPrincipal]-b[F.noPrincipal]); const L=[],R=[]; g.forEach((r,i)=>(i%2?L:R).push(r)); return [...L,...R.reverse()]; }), n=rs.length, w=(W-40)/n, Y=d3.scaleLinear().domain([0,95]).range([0,H-70]);
  let s=svgOpen(W,H); rs.forEach((r,i)=>{ const v=r[F.noPrincipal], h=Y(v); s+=rect(20+i*w,H-24-h,w+.25,h,v>65?WINE:v>45?ROSE:LINE); });
  s+=line(20,H-24,W-20,H-24,INK,1);
  add("pisos-turisticos","Un horizonte con una barra por municipio: la altura es la parte de sus viviendas que no es la residencia habitual de nadie; en granate, donde pasan de dos de cada tres",s+"</svg>"); }

// 3. Convergencia: renta de cada provincia frente a la media, en 2015 y en el último año
{ const [W,H]=B, i1=last(REFS.es.net_income_pc), x0=W*.3, x1=W*.7, Y=d3.scaleLinear().domain([62,138]).range([H-24,24]);
  const P=PROVS.filter(p=>REFS.prov[p].net_income_pc?.[0]&&REFS.prov[p].net_income_pc[i1]).map(p=>({a:REFS.prov[p].net_income_pc[0]/REFS.es.net_income_pc[0]*100,b:REFS.prov[p].net_income_pc[i1]/REFS.es.net_income_pc[i1]*100})).sort((p,q)=>q.a-p.a);
  const poor=new Set(P.slice(-3)), rich=new Set(P.slice(0,3));
  let s=svgOpen(W,H)+line(0,Y(100),W,Y(100),LIGHT,1)+line(x0,16,x0,H-16,LIGHT,1)+line(x1,16,x1,H-16,LIGHT,1);
  P.forEach(p=>{ const c=poor.has(p)||rich.has(p)?WINE:LINE, w=c===WINE?1.8:1; s+=`<path d="M${x0},${r1(Y(p.a))}C${(x0+x1)/2},${r1(Y(p.a))} ${(x0+x1)/2},${r1(Y(p.b))} ${x1},${r1(Y(p.b))}" fill="none" stroke="${c}" stroke-width="${w}"/>`+circ(x0,Y(p.a),3,c)+circ(x1,Y(p.b),3,c); });
  [0,1].forEach(()=>{}); s+=line(0,Y(100),x0-8,Y(100),INK,1)+line(x1+8,Y(100),W,Y(100),INK,1);
  add("convergencia","La renta de cada provincia frente a la media de España en 2015 (izquierda) y ahora (derecha): las líneas se acercan; en granate, las tres más ricas y las tres más pobres",s+"</svg>"); }

// 4. Votar en los pueblos: tamaño del municipio (de izquierda a derecha) y participación (arriba, más)
{ const [W,H]=B, X=d3.scaleLinear().domain([1,6.6]).range([24,W-24]), Y=d3.scaleLinear().domain([48,100]).range([H-20,18]).clamp(true);
  let s=svgOpen(W,H); [60,70,80,90].forEach(v=>s+=line(0,Y(v),W,Y(v),LIGHT,1,` stroke-dasharray="2 4"`));
  mrows(r=>r[F.part]!=null&&r[F.pop]>0).forEach(r=>{ const p=r[F.pop]; s+=circ(X(Math.log10(p))+(hash(r[F.code])-.5)*3,Y(r[F.part])+(hash(r[F.code],3)-.5)*2,1.5,d3.interpolateRgb(WINE,"#c4c1b9")(Math.min(1,Math.max(0,(Math.log10(p)-1.6)/2.4))),` fill-opacity=".75"`); });
  add("votar-pueblos","Cada punto es un municipio, del más pequeño (izquierda) al más grande; cuanto más arriba, más se vota. En granate, los más pequeños",s+"</svg>"); }

// 5. Crecer: España en franjas; los picos son los vecinos que ha ganado cada lugar desde 2005
{ const R=geoRows(30,150,r=>Math.max(0,(r[F.pop]||0)*(r[F.var0525]||0)/(100+(r[F.var0525]||0)))); R.forEach(r=>r.marks=undefined); const mx=R.map(r=>d3.max(r.v)); [...mx].sort((a,b)=>b-a).slice(0,2).forEach(m=>R[mx.indexOf(m)].hi=true);
  add("crecer","España en franjas de norte a sur; cada pico son los vecinos que ha ganado ese lugar desde 2005",olas(...B,R,GEO)); }

// 6. Tope en Cataluña: el alquiler de cada provincia desde 2011; en granate, las catalanas
{ const [W,H]=B, Yr=REFS.ipvaYears, X=d3.scaleLinear().domain([Yr[0],Yr[Yr.length-1]]).range([30,W-30]);
  const S=PROVS.filter(p=>REFS.prov[p].ipva&&REFS.prov[p].ipva.every(v=>v!=null)).map(p=>({p,v:REFS.prov[p].ipva.map(v=>v/REFS.prov[p].ipva[0]*100)}));
  const Y=d3.scaleLinear().domain([d3.min(S,s=>d3.min(s.v))-2,d3.max(S,s=>d3.max(s.v))+2]).range([H-22,22]);
  let s=svgOpen(W,H)+rect(X(2023.5),0,W-X(2023.5),H,WASH)+line(X(2023.5),0,X(2023.5),H,WINE,1,` stroke-dasharray="3 4"`);
  const ln=v=>d3.line().x((_,i)=>X(Yr[i])).y(d=>Y(d)).curve(d3.curveMonotoneX)(v).replace(/\d+\.\d+/g,m=>r1(+m));
  S.filter(o=>!CAT.has(o.p)).forEach(o=>s+=`<path d="${ln(o.v)}" fill="none" stroke="${LINE}" stroke-width="1"/>`);
  S.filter(o=>CAT.has(o.p)).forEach(o=>s+=`<path d="${ln(o.v)}" fill="none" stroke="${WINE}" stroke-width="2.4"/>`);
  add("tope-cataluna","El precio del alquiler de cada provincia desde 2011, una línea por provincia; en granate, las catalanas, y sombreado, el año del tope",s+"</svg>"); }

// 7. Pensiones: la pirámide de edades de 26 provincias, de la más joven a la más envejecida
{ const [W,H]=B, sh=a=>{ const t=d3.sum(a); return a.map(v=>v/t); };
  const P=PROVS.filter(p=>PIR.prov[p]).map(p=>({h:sh(PIR.prov[p].H),m:sh(PIR.prov[p].M),o:0})); P.forEach(p=>p.o=d3.sum(p.h.slice(13))+d3.sum(p.m.slice(13))); P.sort((a,b)=>a.o-b.o);
  const sel=P.filter((_,i)=>i%2===1), cols=13, cw=W/cols, ch=H/2, mx=d3.max(sel,p=>d3.max([...p.h,...p.m]));
  let s=svgOpen(W,H); sel.forEach((p,k)=>{ const cx=(k%cols+.5)*cw, by=(Math.floor(k/cols)+1)*ch-16, bh=(ch-34)/21, X=v=>v/mx*(cw*.44);
    p.h.forEach((v,i)=>{ const y=by-(i+1)*bh, c=i>=13?WINE:LINE; s+=rect(cx-X(v),y,X(v),bh-.6,c)+rect(cx,y,X(p.m[i]),bh-.6,c); }); s+=line(cx-cw*.42,by,cx+cw*.42,by,INK,.8); });
  add("pensiones","Veintiséis pirámides de población, de la provincia más joven a la más envejecida; en granate, los mayores de 65",s+"</svg>"); }

// 8. Pandemia y turismo: cuánto cayeron las noches de hotel en 2020 en cada provincia
{ const [W,H]=B, P=PROVS.filter(p=>REG.data.prov[p]?.pernoct_hotel?.["2019"]).map(p=>{ const o=REG.data.prov[p].pernoct_hotel; return {d:(o["2020"]/o["2019"]-1)*100,t:o["2019"]}; }).sort((a,b)=>a.d-b.d);
  const top=new Set([...P].sort((a,b)=>b.t-a.t).slice(0,10)), w=(W-60)/P.length, Y=d3.scaleLinear().domain([0,-90]).range([0,H-70]);
  let s=svgOpen(W,H); P.forEach((p,i)=>s+=rect(30+i*w+w*.15,40,w*.7,Y(Math.max(-90,p.d)),top.has(p)?WINE:LINE)); s+=line(20,40,W-20,40,INK,1.2);
  add("pandemia-turismo","Cuánto se hundieron las noches de hotel en 2020, una barra por provincia; en granate, las diez más turísticas",s+"</svg>"); }

// 9. De dónde sale la renta: la mezcla de ingresos de cada provincia, ordenadas por el peso de las pensiones
{ const [W,H]=B, K=[["wage",LIGHT],["other_income","#cfccc4"],["other_benefits",ROSE],["unemp_benefit",WINE2],["pension",WINE]];
  const P=PROVS.filter(p=>REFS.prov[p].wage&&REFS.prov[p].pension&&REFS.prov[p].pension[last(REFS.prov[p].wage)]!=null).map(p=>{ const i=last(REFS.prov[p].wage); return K.map(([k])=>REFS.prov[p][k][i]||0); }).sort((a,b)=>a[4]/d3.sum(a)-b[4]/d3.sum(b));
  const w=(W-40)/P.length; let s=svgOpen(W,H);
  P.forEach((v,i)=>{ const t=d3.sum(v); let y=H-20; v.forEach((x,j)=>{ const h=x/t*(H-40); s+=rect(20+i*w+.8,y-h,w-1.6,h,K[j][1]); y-=h; }); });
  add("renta-fuentes","La renta de cada provincia partida por su origen: en gris, el trabajo; en granate, las pensiones; en rosa, las demás prestaciones. De izquierda a derecha, pesan más las pensiones",s+"</svg>"); }

// 10. Quién gobierna: un cuadradito por municipio, agrupados por el partido del alcalde
{ const [W,H]=B, order=["PSOE","Sumar","ERC","EH Bildu","Lista local","PNV","Junts","PRC","Cs","UPN","PP","Vox"], rank=p=>{ const i=order.indexOf(p); return i<0?order.length-1.5:i; };
  const rs=mrows(r=>r[F.mun23]).sort((a,b)=>rank(a[F.mun23])-rank(b[F.mun23])||b[F.pop]-a[F.pop]);
  const rowsN=34, c=Math.min((H-20)/rowsN,(W-20)/Math.ceil(rs.length/rowsN)), cols=Math.ceil(rs.length/rowsN), x0=(W-cols*c)/2, y0=(H-rowsN*c)/2;
  let s=svgOpen(W,H); rs.forEach((r,i)=>{ const col=Math.floor(i/rowsN), row=i%rowsN; s+=rect(x0+col*c,y0+row*c,c-1.2,c-1.2,PARTY[r[F.mun23]]||PARTY.Otros); });
  add("quien-gobierna","Un cuadradito por municipio, agrupados por el partido de su alcalde: granate, PSOE; azul, PP; gris claro, listas locales",s+"</svg>"); }

// 11. AVE: mapa de puntos; en granate, las estaciones de alta velocidad
{ const [W,H]=B, P=proj(W,H,[0,10]), S=new Set(EXT.ave.estaciones.map(e=>e.code)), Rp=d3.scaleSqrt().domain([0,3e6]).range([.7,9]);
  let s=svgOpen(W,H); const st=[];
  for(const [c,ll] of CEN){ const r=BY.get(c); if(!r) continue; const p=P(ll); if(!p) continue; s+=circ(p[0],p[1],Rp(r[F.pop]||0),"#aeaaa1",` fill-opacity=".85"`); if(S.has(c)) st.push(p); }
  st.forEach(p=>s+=circ(p[0],p[1],6.5,"none",` stroke="${WINE}" stroke-width="2"`)+circ(p[0],p[1],2.4,WINE));
  add("ave","Mapa con un punto por municipio, más grande cuanta más gente; los anillos granates son estaciones de alta velocidad",s+"</svg>"); }

// 12. Prohibir pisos turísticos: mapa de agujas; la altura son las viviendas que no son residencia habitual
{ const [W,H]=B, P=proj(W,H-26,[0,4]), S=new Set(EXT.vut.municipios.map(e=>e.code)), Hs=d3.scaleSqrt().domain([0,4e5]).range([0,90]);
  const pts=[]; for(const [c,ll] of CEN){ const r=BY.get(c); if(!r||r[F.noPrincipal]==null) continue; const p=P(ll); if(!p) continue; pts.push({x:p[0],y:p[1]+26,h:Hs((r[F.pop]||0)*r[F.noPrincipal]/100),hi:S.has(c)}); }
  pts.sort((a,b)=>a.y-b.y); let s=svgOpen(W,H)+`<g transform="translate(0,26)">${outline(P)}</g>`;
  pts.forEach(p=>{ if(p.h<4&&!p.hi) return; const w=p.hi?3.4:2.2; s+=`<path d="M${r1(p.x-w)},${r1(p.y)}L${r1(p.x)},${r1(p.y-Math.max(p.h,p.hi?14:0))}L${r1(p.x+w)},${r1(p.y)}" fill="${p.hi?WINE:LINE}" fill-opacity="${p.hi?1:.55}" stroke="${p.hi?WINE:DARK}" stroke-width=".5"/>`; });
  add("prohibir-pisos-turisticos","Mapa de agujas: la altura son las viviendas que no son residencia habitual de nadie; en granate, los municipios que limitan los pisos turísticos",s+"</svg>"); }

// 13. Estudiar: titulados superiores (de izquierda a derecha) y renta (arriba, más)
{ const [W,H]=B, X=d3.scaleLinear().domain([3,62]).range([24,W-24]), Y=d3.scaleLog().domain([8500,32000]).range([H-18,18]).clamp(true), q=d3.scaleQuantize().domain([5,50]).range(SEQ.slice(1));
  let s=svgOpen(W,H); mrows(r=>r[F.superiores]!=null&&r[F.renta]).forEach(r=>s+=circ(X(r[F.superiores]),Y(r[F.renta]),1.6,q(r[F.superiores]),` fill-opacity=".85"`));
  add("estudiar","Cada punto es un municipio: cuantos más titulados universitarios (a la derecha), más renta (arriba)",s+"</svg>"); }

// 14. Paro en el sur: España en franjas; los picos son gente en paro
{ const R=geoRows(30,150,r=>(r[F.pop]||0)*(r[F.paroReg]||0)/100); R.forEach((r,i)=>{ r.marks=undefined; r.hi=i===24||i===27; });
  add("paro-sur","España en franjas de norte a sur; cada pico es gente en paro: el sur sobresale",olas(...B,R,GEO)); }

// 15. IVA de los alimentos: cuánto ha subido cada alimento desde 2019; en granate, los que tuvieron rebaja del IVA
{ const [W,H]=B, Pd=ALI.subclases.periodos, i0=Pd.indexOf("2019M01"), IVA=/^(Pan y|Harina|Leche entera|Leche desnatada|Queso|Huevos|Frutas|Cítricos|Hortalizas|Legumbres|Patatas|Aceites vegetales|Macarrones)/;
  const P=Object.entries(ALI.subclases.s).filter(([k,a])=>a[i0]&&a[last(a)]).map(([k,a])=>({d:a[last(a)]/a[i0]-1,hi:IVA.test(k)})).sort((a,b)=>a.d-b.d);
  const w=(W-60)/P.length, Y=d3.scaleLinear().domain([0,d3.max(P,p=>p.d)]).range([0,H-70]);
  let s=svgOpen(W,H); P.forEach((p,i)=>{ const x=30+(i+.5)*w, y=H-24-Y(Math.max(0,p.d)); s+=line(x,H-24,x,y,p.hi?WINE:LINE,p.hi?2:1.4)+circ(x,y,p.hi?5:4,p.hi?WINE:PAPER,p.hi?"":` stroke="${DARK}" stroke-width="1.3"`); });
  s+=line(20,H-24,W-20,H-24,INK,1);
  add("iva-alimentos","Cuánto ha subido cada alimento desde 2019, un alfiler por alimento; en granate, los que tuvieron rebaja del IVA",s+"</svg>"); }

// 16. Vivienda protegida: viviendas que se empiezan cada año y, en granate, cuántas son protegidas
{ const [W,H]=B, V=J("vivienda.json").es, Y0=Object.keys(V.iniciadas).filter(y=>V.protegidas[y]!=null), w=(W-60)/Y0.length, Y=d3.scaleLinear().domain([0,d3.max(Y0,y=>V.iniciadas[y])]).range([0,H-60]);
  let s=svgOpen(W,H); Y0.forEach((y,i)=>{ const x=30+i*w; s+=rect(x+w*.1,H-24-Y(V.iniciadas[y]),w*.8,Y(V.iniciadas[y]),LIGHT)+rect(x+w*.1,H-24-Y(V.protegidas[y]),w*.8,Y(V.protegidas[y]),WINE); });
  s+=line(20,H-24,W-20,H-24,INK,1);
  add("vivienda-protegida","Viviendas que se empiezan a construir cada año desde 1991 y, en granate, las protegidas: tras 2008 casi desaparecen",s+"</svg>"); }

// 17. Reforma laboral: franjas de color, una por comunidad y un cuadro por año; cuanto más oscuro, más temporalidad
{ const [W,H]=B, C=Object.keys(REG.data.ccaa).filter(c=>REG.data.ccaa[c].temporalidad), Yr=yrs(REG.data.ccaa[C[0]].temporalidad);
  const all=C.flatMap(c=>Object.values(REG.data.ccaa[c].temporalidad)), q=d3.scaleQuantile().domain(all).range(SEQ);
  const order=C.sort((a,b)=>d3.mean(Object.values(REG.data.ccaa[b].temporalidad))-d3.mean(Object.values(REG.data.ccaa[a].temporalidad)));
  const cw=(W-40)/Yr.length, ch=(H-40)/order.length; let s=svgOpen(W,H);
  order.forEach((c,j)=>Yr.forEach((y,i)=>{ const v=REG.data.ccaa[c].temporalidad[y]; if(v!=null) s+=rect(20+i*cw,20+j*ch,cw-1.5,ch-1.5,q(v)); }));
  const xr=20+Yr.indexOf("2022")*cw-1; s+=line(xr,10,xr,H-10,INK,1.2,` stroke-dasharray="3 3"`);
  add("reforma-laboral","Una franja por comunidad y un cuadro por año desde 2002: cuanto más granate, más contratos temporales. La línea marca 2022, el año de la reforma",s+"</svg>"); }

// 18. Salario mínimo: la escalera del SMI desde 2008; en granate, el salto de 2019
{ const [W,H]=B, S=SUE.smiLegal, Yr=Object.keys(S).map(Number), X=d3.scaleLinear().domain([Yr[0],Yr[Yr.length-1]+1]).range([40,W-40]), Y=d3.scaleLinear().domain([500,1250]).range([H-24,24]);
  const pts=[]; Yr.forEach(y=>{ pts.push([X(y),Y(S[y])]); pts.push([X(y+1),Y(S[y])]); });
  let s=svgOpen(W,H)+[600,800,1000,1200].map(v=>line(40,Y(v),W-40,Y(v),LIGHT,1,` stroke-dasharray="2 4"`)).join("");
  s+=`<path d="${pathD(pts)}L${r1(X(Yr[Yr.length-1]+1))},${H-24}L${r1(X(Yr[0]))},${H-24}Z" fill="${WASH}"/>`+`<path d="${pathD(pts)}" fill="none" stroke="${INK}" stroke-width="1.6"/>`;
  s+=line(X(2019),Y(S[2018]),X(2019),Y(S[2019]),WINE,3.2)+circ(X(2019),Y(S[2019]),5,WINE)+circ(X(2019),Y(S[2018]),3.5,PAPER,` stroke="${WINE}" stroke-width="1.6"`);
  s+=line(40,H-24,W-40,H-24,INK,1);
  add("smi-empleo-hogar","La escalera del salario mínimo desde 2008; en granate, el salto de 2019, cuando subió un 22 %",s+"</svg>"); }

// 19. Tope a las compraventas: un pequeño gráfico por provincia; en granate, las catalanas
{ const [W,H]=B, P=PROVS.filter(p=>REFS.prov[p].vtp&&REFS.prov[p].vtp.every(v=>v!=null)).sort((a,b)=>(CAT.has(b)-CAT.has(a))||(d3.mean(REFS.prov[b].vtp)-d3.mean(REFS.prov[a].vtp)));
  const cols=13, rowsN=Math.ceil(P.length/cols), cw=(W-30)/cols, ch=(H-20)/rowsN; let s=svgOpen(W,H);
  P.forEach((p,k)=>{ const v=REFS.prov[p].vtp, x0=15+(k%cols)*cw+8, y0=10+Math.floor(k/cols)*ch+6, w=cw-16, h=ch-14, lo=d3.min(v), hi=d3.max(v)||1, c=CAT.has(p);
    const pts=v.map((d,i)=>[x0+w*i/(v.length-1),y0+h-(d-lo)/((hi-lo)||1)*h]); s+=`<path d="${pathD(pts)}L${r1(x0+w)},${r1(y0+h)}L${r1(x0)},${r1(y0+h)}Z" fill="${c?WASH:"#f0eee9"}"/><path d="${pathD(pts)}" fill="none" stroke="${c?WINE:DARK}" stroke-width="${c?1.8:1.1}"/>`+line(x0,y0+h,x0+w,y0+h,LINE,.8); });
  add("tope-compraventas","Un gráfico por provincia con sus compraventas de vivienda desde 2020; en granate, las catalanas",s+"</svg>"); }

// 20. Deuda municipal: deuda por habitante de los ayuntamientos de cada provincia en 2015 (círculo vacío) y ahora (granate)
{ const [W,H]=B, D=CAU.deuda, n=D.years.length; const P=PROVS.map(p=>{ const S=Object.entries(D.s).filter(([c])=>c.slice(0,2)===p); const pop=d3.sum(S,([c])=>BY.get(c)?.[F.pop]||0)||1; return {a:d3.sum(S,([c,v])=>v[0]||0)/pop,b:d3.sum(S,([c,v])=>v[n-1]||0)/pop}; }).filter(p=>p.a>0).sort((x,y)=>y.a-x.a);
  const w=(W-60)/P.length, Y=d3.scaleSqrt().domain([0,d3.max(P,p=>Math.max(p.a,p.b))]).range([H-24,24]);
  let s=svgOpen(W,H); P.forEach((p,i)=>{ const x=30+(i+.5)*w; s+=line(x,Y(p.a),x,Y(p.b),LINE,2)+circ(x,Y(p.b),4,WINE)+circ(x,Y(p.a),4,PAPER,` stroke="${DARK}" stroke-width="1.3"`); });
  s+=line(20,H-24,W-20,H-24,INK,1);
  add("deuda-quien-gobierna","La deuda por habitante de los ayuntamientos de cada provincia en 2015 (círculo vacío) y ahora (granate): casi todas bajan",s+"</svg>"); }

// 21. Precio de los alimentos: alimentos y sueldos desde 2008; en granate, lo que los alimentos se adelantan
{ const [W,H]=B, M=ALI.meses, Sp=ALI.salario.periodos, sal=ALI.salario.es;
  const s4=sal.map((v,i)=>i<3?null:d3.mean(sal.slice(i-3,i+1))), q0=3, base=s4[q0];
  const food=Sp.map((p,i)=>{ if(i<q0) return null; const y=p.slice(0,4), qn=+p.slice(5), mi=M.indexOf(`${y}M${String(qn*3).padStart(2,"0")}`); return mi<0?null:ALI.ipc.es.alimentos[mi]; });
  const idx=Sp.map((p,i)=>i<q0||food[i]==null||s4[i]==null?null:{t:i,f:food[i]/food[q0]*100,w:s4[i]/base*100}).filter(Boolean);
  const X=d3.scaleLinear().domain([idx[0].t,idx[idx.length-1].t]).range([30,W-30]), Y=d3.scaleLinear().domain([95,d3.max(idx,d=>Math.max(d.f,d.w))+3]).range([H-22,22]);
  const area=d3.area().x(d=>X(d.t)).y0(d=>Y(d.w)).y1(d=>Y(Math.max(d.f,d.w))).curve(d3.curveMonotoneX)(idx).replace(/\d+\.\d+/g,m=>r1(+m));
  const lf=d3.line().x(d=>X(d.t)).y(d=>Y(d.f)).curve(d3.curveMonotoneX)(idx).replace(/\d+\.\d+/g,m=>r1(+m)), lw=d3.line().x(d=>X(d.t)).y(d=>Y(d.w)).curve(d3.curveMonotoneX)(idx).replace(/\d+\.\d+/g,m=>r1(+m));
  let s=svgOpen(W,H)+[100,120,140,160].filter(v=>v<Y.domain()[1]).map(v=>line(30,Y(v),W-30,Y(v),LIGHT,1,` stroke-dasharray="2 4"`)).join("");
  s+=`<path d="${area}" fill="${WASH}"/><path d="${lw}" fill="none" stroke="${DARK}" stroke-width="1.8"/><path d="${lf}" fill="none" stroke="${WINE}" stroke-width="2.4"/>`;
  add("precio-alimentos","El precio de los alimentos (granate) y los sueldos (gris) desde 2008; sombreado, lo que la comida se ha adelantado",s+"</svg>"); }

// ---------- temas (640×400) ----------
const TL={};
const addT=(id,label,svg)=>{ out["t-"+id]=svg; TL[id]=label; };
// riqueza: histograma de puntos apilados con la renta de los municipios
{ const [W,H]=T, rs=mrows(r=>r[F.renta]).map(r=>r[F.renta]).sort((a,b)=>a-b), X=d3.scaleLinear().domain([8000,28000]).range([20,W-20]).clamp(true), d=5.2, q=d3.scaleQuantize().domain([9000,24000]).range(SEQ.slice(1));
  const bins=d3.bin().domain([8000,28000]).thresholds(d3.range(8000,28000,(20000)/((W-40)/d)))(rs); const mx=d3.max(bins,b=>b.length), per=Math.max(1,Math.ceil(mx/((H-40)/d)));
  let s=svgOpen(W,H); bins.forEach(b=>{ const n=Math.ceil(b.length/per); for(let k=0;k<n;k++) s+=circ(X((b.x0+b.x1)/2),H-22-k*d,d*.42,q((b.x0+b.x1)/2)); });
  addT("riqueza","Cada punto son varios municipios, colocados según su renta: la mayoría se amontona en la parte baja",s+"</svg>"); }
// vivienda: subida del alquiler de cada provincia desde 2015, ordenadas
{ const [W,H]=T, Yr=REFS.ipvaYears, i0=Yr.indexOf(2015), P=PROVS.filter(p=>REFS.prov[p].ipva?.[i0]&&REFS.prov[p].ipva[Yr.length-1]).map(p=>({p,v:REFS.prov[p].ipva[Yr.length-1]/REFS.prov[p].ipva[i0]*100-100})).sort((a,b)=>a.v-b.v);
  const w=(W-40)/P.length, Y=d3.scaleLinear().domain([0,d3.max(P,p=>p.v)]).range([0,H-70]); let s=svgOpen(W,H);
  P.forEach((p,i)=>{ const h=Y(Math.max(0,p.v)), x=20+i*w, c=i>=P.length-5?WINE:LINE; s+=rect(x+w*.12,H-24-h,w*.76,h,c)+`<path d="M${r1(x+w*.02)},${r1(H-24-h)}L${r1(x+w/2)},${r1(H-24-h-w*.45)}L${r1(x+w*.98)},${r1(H-24-h)}Z" fill="${c}"/>`; });
  s+=line(10,H-24,W-10,H-24,INK,1); addT("vivienda","Cuánto ha subido el alquiler en cada provincia desde 2015, una casa por provincia; en granate, las que más",s+"</svg>"); }
// población: la pirámide de España, con la de 2005 en línea
{ const [W,H]=T, sh=a=>{ const t=d3.sum(a); return a.map(v=>v/t); }, h=sh(PIR.es.H), m=sh(PIR.es.M), ph=sh(PIR.pasado.es.H), pm=sh(PIR.pasado.es.M), mx=d3.max([...h,...m,...ph,...pm]);
  const cx=W/2, bh=(H-40)/21, X=v=>v/mx*(W*.4); let s=svgOpen(W,H);
  h.forEach((v,i)=>{ const y=H-20-(i+1)*bh, c=i>=13?WINE:"#cfccc4"; s+=rect(cx-X(v),y,X(v),bh-1.2,c)+rect(cx+1,y,X(m[i]),bh-1.2,c); });
  const st=(a,sg)=>{ const pts=[]; a.forEach((v,i)=>{ const y=H-20-(i+1)*bh; pts.push([cx+sg*X(v),y+bh],[cx+sg*X(v),y]); }); return `<path d="${pathD(pts)}" fill="none" stroke="${INK}" stroke-width="1.2"/>`; };
  s+=st(ph,-1)+st(pm,1)+line(cx,16,cx,H-20,PAPER,1.5);
  addT("poblacion","La pirámide de población de España hoy (relleno) y en 2005 (línea); en granate, los mayores de 65",s+"</svg>"); }
// trabajo: el paro en España cada año desde 2002
{ const [W,H]=T, o=REG.data.es.ES.paro_epa, Y0=yrs(o), w=(W-40)/Y0.length, Y=d3.scaleLinear().domain([0,d3.max(Y0,y=>o[y])]).range([0,H-60]); let s=svgOpen(W,H);
  const mxY=Y0.reduce((a,b)=>o[b]>o[a]?b:a); Y0.forEach((y,i)=>s+=rect(20+i*w+w*.12,H-24-Y(o[y]),w*.76,Y(o[y]),y===mxY?WINE:o[y]>20?ROSE:LINE));
  s+=line(10,H-24,W-10,H-24,INK,1); addT("trabajo","La tasa de paro de España cada año desde 2002; en granate, el máximo de la crisis",s+"</svg>"); }
// gasto: el gasto público por funciones, apilado, desde 1995
{ const [W,H]=T, K=["GF10","GF07","GF09","GF01","GF04","GF02","GF03","GF06","GF05","GF08"].filter(k=>GOV.fun[k]), Yr=GOV.years;
  const data=Yr.map((y,i)=>{ const d={i}; K.forEach(k=>d[k]=GOV.fun[k].pib[i]||0); return d; });
  const st=d3.stack().keys(K)(data), X=d3.scaleLinear().domain([0,Yr.length-1]).range([20,W-20]), Y=d3.scaleLinear().domain([0,d3.max(st[st.length-1],d=>d[1])]).range([H-20,24]);
  const cols={"GF10":WINE,"GF07":WINE2,"GF09":ROSE}; let s=svgOpen(W,H);
  st.forEach(l=>{ const a=d3.area().x(d=>X(d.data.i)).y0(d=>Y(d[0])).y1(d=>Y(d[1])).curve(d3.curveMonotoneX)(l).replace(/\d+\.\d+/g,m=>r1(+m)); s+=`<path d="${a}" fill="${cols[l.key]||(l.index%2?"#d9d6ce":"#e6e3dc")}" stroke="${PAPER}" stroke-width="1"/>`; });
  addT("gasto","El gasto público por funciones desde 1995, apilado: protección social (granate), sanidad y educación abajo",s+"</svg>"); }
// voto: un hemiciclo con un punto por municipio, del color del partido que ganó en 2023
{ const [W,H]=T, rs=mrows(r=>r[F.win23]); const order=["Sumar","EH Bildu","ERC","PSOE","PNV","Junts","Otros","UPN","PP","Vox"], rk=p=>{ const i=order.indexOf(p); return i<0?6:i; };
  const n=rs.length, cx=W/2, cy=H-30, rows=34, r0=70, r1_=W/2-20, pts=[];
  const tot=d3.sum(d3.range(rows),k=>r0+(r1_-r0)*k/(rows-1)); d3.range(rows).forEach(k=>{ const rad=r0+(r1_-r0)*k/(rows-1), m=Math.round(n*rad/tot); for(let j=0;j<m;j++){ const a=Math.PI*(1-(j+.5)/m); pts.push({a,x:cx+Math.cos(a)*rad,y:cy-Math.sin(a)*rad*.95}); } });
  pts.sort((p,q)=>q.a-p.a); rs.sort((a,b)=>rk(a[F.win23])-rk(b[F.win23]));
  let s=svgOpen(W,H); pts.slice(0,n).forEach((p,i)=>s+=circ(p.x,p.y,2,PARTY[rs[i]?.[F.win23]]||PARTY.Otros));
  addT("voto","Un hemiciclo con un punto por municipio, del color del partido que ganó en las generales de 2023",s+"</svg>"); }
// laboratorio: dos variables cruzadas, edad media y renta
{ const [W,H]=T, X=d3.scaleLinear().domain([34,76]).range([20,W-20]).clamp(true), Y=d3.scaleLog().domain([8000,33000]).range([H-20,20]).clamp(true);
  let s=svgOpen(W,H)+line(X(49.4),10,X(49.4),H-10,LIGHT,1)+line(10,Y(15300),W-10,Y(15300),LIGHT,1);
  mrows(r=>r[F.edad]!=null&&r[F.renta]).forEach(r=>{ const hi=r[F.renta]>22000; s+=circ(X(r[F.edad]),Y(r[F.renta]),hi?1.8:1.3,hi?WINE:DARK,` fill-opacity="${hi?.9:.35}"`); });
  addT("laboratorio","Cada punto es un municipio, colocado según su edad media y su renta",s+"</svg>"); }
// municipio: mapa de puntos de todos los municipios
{ const [W,H]=T, P=proj(W,H,[14,14]), Rp=d3.scaleSqrt().domain([0,3e6]).range([.75,11]); let s=svgOpen(W,H);
  const pts=[]; for(const [c,ll] of CEN){ const r=BY.get(c); if(!r) continue; const p=P(ll); if(p) pts.push([p,r[F.pop]||0,r[F.var0525]]); }
  pts.sort((a,b)=>b[1]-a[1]).forEach(([p,pop,v])=>s+=circ(p[0],p[1],Rp(pop),v>10?WINE:v>0?ROSE:LINE,` fill-opacity=".85"`));
  addT("municipio","Un punto por municipio, más grande cuanta más gente; en granate, los que crecen",s+"</svg>"); }

// ---------- escribir ----------
const DIR=path.join(ROOT,"art/il"); fs.mkdirSync(DIR,{recursive:true});
let tot=0; for(const [id,s] of Object.entries(out)){ fs.writeFileSync(path.join(DIR,id+".svg"),s); tot+=s.length; }
fs.writeFileSync(path.join(ROOT,"src/illus-olas.mjs"),"// Lo genera scripts/ilustraciones/graficos.mjs: no editar a mano.\nexport const OLAS="+JSON.stringify(lab)+";\nexport const OLAS_T="+JSON.stringify(TL)+";\n");
console.log(Object.keys(out).length,"ilustraciones,",Math.round(tot/1024),"KB");
