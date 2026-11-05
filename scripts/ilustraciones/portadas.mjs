// Gráficos de cabecera de cada análisis: con rótulos, cifras y una idea por gráfico, como los de la portada.
// Salen en SVG con las clases pt-g-* de styles.css (así valen en modo oscuro) y se guardan en data/covers.json.
// Los tres que ya existen en la portada (cesta, contratos, tope, vivienda e infraestructuras) los dibuja app.js con portada.json y no pasan por aquí.
// Uso: node scripts/ilustraciones/portadas.mjs
import fs from "fs"; import path from "path"; import vm from "vm"; import {fileURLToPath} from "url";
const ROOT=path.join(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ctx={console,setTimeout,clearTimeout}; ctx.globalThis=ctx; ctx.window=ctx; vm.createContext(ctx);
for(const f of ["d3.min.js","topojson-client.min.js","d3-composite-projections.min.js"]) vm.runInContext(fs.readFileSync(path.join(ROOT,"vendor",f),"utf8"),ctx);
const {d3,topojson}=ctx;
const J=f=>JSON.parse(fs.readFileSync(path.join(ROOT,"data",f),"utf8"));
const IX=J("index.json"), F={}; IX.fields.forEach((f,i)=>F[f]=i); const ROWS=IX.rows;
const REFS=J("refs.json"), REG=J("regional.json"), PIR=J("piramide.json"), SUE=J("sueldos.json"), EXT=J("ext.json"), EST=J("estudios.json"), VIV=J("vivienda.json"), TOPO=J("municipios.topo.json");
const PN=Object.fromEntries(Object.entries(IX.provs).map(([k,v])=>[k,v==="Balears, Illes"?"Illes Balears":v])), PROVS=Object.keys(REFS.prov).filter(p=>!["51","52"].includes(p));
const NB=" "; // espacio fino irrompible
const W=440, H=280;

// ---------- piezas ----------
const r1=v=>Math.round(v*10)/10, esc=s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;");
const nf=(v,d=0)=>{ const s=Math.abs(v).toFixed(d), [a,b]=s.split("."); const g=a.replace(/\B(?=(\d{3})+(?!\d))/g,a.length>4?".":""); return (v<0?"−":"")+g+(b?","+b:""); };
const pc=(v,d=0)=>nf(v,d)+NB+"%";
const T=(x,y,t,c="pt-g-t",a="start",halo=false)=>`<text x="${r1(x)}" y="${r1(y)}" class="${c}"${a!=="start"?` text-anchor="${a}"`:""}${halo?` style="paint-order:stroke;stroke:var(--bg);stroke-width:5px;stroke-linejoin:round"`:""}>${esc(t)}</text>`;
const L=(x1,y1,x2,y2,c="pt-g-gr")=>`<line x1="${r1(x1)}" y1="${r1(y1)}" x2="${r1(x2)}" y2="${r1(y2)}" class="${c}"/>`;
const R=(x,y,w,h,c,rx=2)=>`<rect x="${r1(x)}" y="${r1(y)}" width="${r1(Math.max(0,w))}" height="${r1(Math.max(0,h))}" rx="${rx}" class="${c}"/>`;
const C=(x,y,r,c)=>`<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(r)}" class="${c}"/>`;
const PL=(pts,c)=>`<polyline points="${pts.map(([x,y])=>r1(x)+","+r1(y)).join(" ")}" class="pt-g-ln ${c}"/>`;
const svg=inner=>`<svg viewBox="0 0 ${W} ${H}" class="pt-g" role="img" aria-label="__ALT__">${inner}</svg>`;
const last=a=>{ for(let i=a.length-1;i>=0;i--) if(a[i]!=null) return i; return -1; };
const wmean=(rs,v,w=r=>r[F.pop])=>{ let s=0,t=0; rs.forEach(r=>{ const x=v(r); if(x!=null&&isFinite(x)){ const q=w(r)||0; s+=x*q; t+=q; } }); return t?s/t:null; };
const OUT={}; const add=(id,cap,alt,inner)=>{ OUT[id]={cap,svg:svg(inner).replace("__ALT__",esc(alt))}; };
// etiquetas sin pisarse: prueba derecha, izquierda, arriba y abajo
function placer(){ const boxes=[]; return (x,y,t,{size=12.5,pad=4}={})=>{ const w=t.length*size*.56, h=size+2;
  const cand=[[x+9,y+4,"start"],[x-9,y+4,"end"],[x,y-9,"middle"],[x,y+19,"middle"]];
  for(const [tx,ty,a] of cand){ const x0=a==="start"?tx:a==="end"?tx-w:tx-w/2, b={x0:x0-pad,x1:x0+w+pad,y0:ty-h,y1:ty+3}; if(x0<0||x0+w>W) continue;
    if(boxes.some(o=>b.x0<o.x1&&b.x1>o.x0&&b.y0<o.y1&&b.y1>o.y0)) continue; boxes.push(b); return {x:tx,y:ty,a}; } return null; }; }

// ---------- 1. pisos turísticos: por provincia, cuánto han crecido los pisos turísticos y cuánto ha subido el alquiler ----------
{ const P=PROVS.map(p=>{ const rs=ROWS.filter(r=>r[F.code].slice(0,2)===p);
    return {p,x:wmean(rs,r=>r[F.vtCambio]),y:wmean(rs,r=>r[F.alqVar20])}; }).filter(o=>o.x!=null&&o.y!=null);
  const x0=56,x1=W-16,y0=H-40,y1=44, X=d3.scaleLinear().domain([d3.min(P,d=>d.x)-.1,d3.max(P,d=>d.x)+.15]).range([x0,x1]), Y=d3.scaleLinear().domain([d3.min(P,d=>d.y)-2,d3.max(P,d=>d.y)+3]).range([y0,y1]);
  const k=(()=>{ const mx=d3.mean(P,d=>d.x), my=d3.mean(P,d=>d.y); let sxy=0,sxx=0,syy=0; P.forEach(d=>{ sxy+=(d.x-mx)*(d.y-my); sxx+=(d.x-mx)**2; syy+=(d.y-my)**2; }); const b=sxy/sxx; return {a:my-b*mx,b,r:sxy/Math.sqrt(sxx*syy)}; })();
  const lab=new Set([...[...P].sort((a,b)=>b.x-a.x).slice(0,3),...[...P].sort((a,b)=>b.y-a.y).slice(0,3)].map(d=>d.p)), place=placer();
  let s=[10,15,20,25].filter(g=>g>Y.domain()[0]&&g<Y.domain()[1]).map(g=>L(x0,Y(g),x1,Y(g))+T(x0-8,Y(g)+4,"+"+g+NB+"%","pt-g-t","end")).join("");
  s+=T(x0,14,"Subida del alquiler de 2020 a 2024","pt-g-t")+T(x1,H-10,"Cuánto han ganado peso los pisos turísticos →","pt-g-t","end");
  s+=`<line x1="${x0}" y1="${r1(Y(k.a+k.b*X.domain()[0]))}" x2="${x1}" y2="${r1(Y(k.a+k.b*X.domain()[1]))}" class="pt-g-base"/>`;
  P.forEach(d=>{ s+=C(X(d.x),Y(d.y),lab.has(d.p)?5:3.6,lab.has(d.p)?"pt-f-br":"pt-f-mu"); });
  P.filter(d=>lab.has(d.p)).sort((a,b)=>b.x-a.x).forEach(d=>{ const q=place(X(d.x),Y(d.y),PN[d.p]); if(q) s+=T(q.x,q.y,PN[d.p],"pt-g-l br",q.a); });
  add("pisos-turisticos","Cada punto es una provincia (media ponderada de sus municipios). Cambio del peso de los pisos turísticos en las viviendas y subida del alquiler entre 2020 y 2024. Fuente: INE.",
    "Cada punto es una provincia: donde más han crecido los pisos turísticos no es, en general, donde más ha subido el alquiler.",s); }

// ---------- 2. convergencia: renta de cada provincia frente a la media, 2015 y ahora ----------
{ const i1=last(REFS.es.net_income_pc), x0=150, x1=300, y0=H-40, y1=30;
  const P=PROVS.filter(p=>REFS.prov[p].net_income_pc?.[0]&&REFS.prov[p].net_income_pc[i1]).map(p=>({p,a:REFS.prov[p].net_income_pc[0]/REFS.es.net_income_pc[0]*100,b:REFS.prov[p].net_income_pc[i1]/REFS.es.net_income_pc[i1]*100}));
  const Y=d3.scaleLinear().domain([62,140]).range([y0,y1]), sa=[...P].sort((a,b)=>b.a-a.a), top=new Set(sa.slice(0,3).map(d=>d.p)), bot=new Set(sa.slice(-3).map(d=>d.p));
  const gap=(k)=>d3.mean(sa.slice(0,3),d=>d[k])/d3.mean(sa.slice(-3),d=>d[k]);
  let s=L(40,Y(100),W-20,Y(100),"pt-g-base")+T(W-20,Y(100)-6,"Media de España","pt-g-t","end");
  s+=T(x0,16,"2015","pt-g-l","middle")+T(x1,16,"Hoy","pt-g-l","middle");
  P.forEach(d=>{ const hi=top.has(d.p)||bot.has(d.p); s+=`<path d="M${x0},${r1(Y(d.a))}C${(x0+x1)/2},${r1(Y(d.a))} ${(x0+x1)/2},${r1(Y(d.b))} ${x1},${r1(Y(d.b))}" fill="none" class="${hi?"pt-g-ln br":"pt-g-ln"}" style="${hi?"":"stroke:var(--rule-2);stroke-width:1.3"}"/>`+C(x0,Y(d.a),hi?4:2.6,hi?"pt-f-br":"pt-f-mu")+C(x1,Y(d.b),hi?4:2.6,hi?"pt-f-br":"pt-f-mu"); });
  const spread=a=>{ const o=a.map(d=>({d,y:Y(d.a)+4})).sort((p,q)=>p.y-q.y); for(let i=1;i<o.length;i++) if(o[i].y-o[i-1].y<15) o[i].y=o[i-1].y+15; return o; };
  spread(sa.slice(0,3)).forEach(({d,y})=>{ s+=T(x0-10,y,PN[d.p],"pt-g-l br","end"); }); spread(sa.slice(-3)).forEach(({d,y})=>{ s+=T(x0-10,y,PN[d.p],"pt-g-l br","end"); });
  s+=T(x1+14,Y(d3.mean(sa.slice(0,3),d=>d.b))-6,"Las 3 más ricas","pt-g-t")+T(x1+14,Y(d3.mean(sa.slice(-3),d=>d.b))+16,"Las 3 más pobres","pt-g-t");
  s+=T(40,H-8,`Las ricas ganaban ${nf(gap("a"),1)} veces lo que las pobres; hoy, ${nf(gap("b"),1)}`,"pt-g-g");
  add("convergencia","Renta neta por persona de cada provincia respecto a la media de España. Fuente: INE, Atlas de distribución de la renta (2015–2024).",
    `Las líneas de la renta de cada provincia se acercan a la media entre 2015 y hoy: la brecha entre las tres más ricas y las tres más pobres pasa de ${nf(gap("a"),1)} a ${nf(gap("b"),1)} veces.`,s); }

// ---------- 3. votar en los pueblos: participación según el tamaño del municipio ----------
{ const bins=[["Menos de 500",0,500],["500 a 2.000",500,2000],["2.000 a 10.000",2000,10000],["10.000 a 50.000",10000,50000],["Más de 50.000",50000,1e9]];
  const V=bins.map(([l,a,b])=>{ const rs=ROWS.filter(r=>r[F.part]!=null&&r[F.pop]>=a&&r[F.pop]<b); return {l,v:d3.mean(rs,r=>r[F.part]),n:rs.length}; });
  const x0=122,x1=W-52, sc=v=>(x1-x0)*v/100; let s=T(x0,18,"Participación en las generales de 2023","pt-g-t");
  V.forEach((d,i)=>{ const y=40+i*44, hi=i===0; s+=T(x0-10,y+20,d.l,"pt-g-l"+(hi?" br":""),"end")+R(x0,y+4,sc(d.v),28,hi?"pt-f-br":"pt-f-mu",3)+T(x0+sc(d.v)+8,y+25,pc(d.v),"pt-g-n"+(hi?" br":""))+T(x0+4,y+48,"","pt-g-t"); });
  s+=T(x0,H-8,"Habitantes de cada municipio","pt-g-t");
  add("votar-pueblos","Participación media en las elecciones generales de julio de 2023, por tamaño del municipio. Fuente: Ministerio del Interior.",
    `En los municipios de menos de 500 habitantes vota un ${nf(V[0].v)} % de los inscritos; en los de más de 50.000, un ${nf(V[4].v)} %.`,s); }

// ---------- 4. crecer: pueblos que ganan vecinos según la distancia a una ciudad y según la edad ----------
{ const rs=ROWS.filter(r=>r[F.var0525]!=null&&r[F.distCiudad]!=null&&r[F.edad]!=null&&r[F.pop]>=50), share=a=>a.filter(r=>r[F.var0525]>0).length/a.length*100;
  const grp=(k,lo,hi,names)=>{ const q=d3.quantile(rs.map(r=>r[F[k]]).sort(d3.ascending),0.33), p=d3.quantile(rs.map(r=>r[F[k]]).sort(d3.ascending),0.67);
    const g=[rs.filter(r=>r[F[k]]<=q),rs.filter(r=>r[F[k]]>q&&r[F[k]]<=p),rs.filter(r=>r[F[k]]>p)]; return names.map((n,i)=>({n,v:share(g[i])})); };
  const D=grp("distCiudad",0,0,["Cerca","Media","Lejos"]), E=grp("edad",0,0,["Jóvenes","Medios","Mayores"]); const y0=H-58, y1=74, sc=v=>(y0-y1)*v/Math.max(...D.concat(E).map(d=>d.v),60);
  let s=T(8,18,"Pueblos que han ganado vecinos desde 2005","pt-g-l");
  const panel=(x,tt,A,hi)=>{ let o=T(x+66,y1-26,tt,"pt-g-t","middle"); A.forEach((d,i)=>{ const bx=x+i*46, h=sc(d.v), on=(hi&&i===0)||(!hi&&i===2)?false:false; o+=R(bx,y0-h,34,h,i===(hi?0:0)&&false?"pt-f-br":"pt-f-mu",3)+T(bx+17,y0-h-7,pc(d.v),"pt-g-l","middle")+T(bx+17,y0+18,d.n,"pt-g-t","middle"); }); return o; };
  // las barras que cuentan, en granate
  const bar=(x,A,hiIdx)=>A.map((d,i)=>{ const bx=x+i*66, h=sc(d.v); return R(bx,y0-h,34,h,hiIdx.includes(i)?"pt-f-br":"pt-f-mu",3)+T(bx+17,y0-h-7,pc(d.v),"pt-g-l"+(hiIdx.includes(i)?" br":""),"middle")+T(bx+17,y0+18,d.n,"pt-g-t","middle"); }).join("");
  s+=T(14+84,y1-22,"Según la distancia a una ciudad","pt-g-t","middle")+bar(14,D,[0])+L(14,y0,14+3*66-30,y0,"pt-g-tick");
  s+=T(232+84,y1-22,"Según la edad media del pueblo","pt-g-t","middle")+bar(232,E,[0])+L(232,y0,232+3*66-30,y0,"pt-g-tick");
  s+=T(8,H-8,"La edad pesa más que la distancia","pt-g-g");
  add("crecer","Pueblos de 50 habitantes o más que han ganado vecinos entre 2005 y hoy, por tercios de distancia a la ciudad más cercana y de edad media. Fuente: INE, padrón y censo.",
    `Han ganado vecinos un ${nf(D[0].v)} % de los pueblos cercanos a una ciudad y un ${nf(D[2].v)} % de los lejanos; y un ${nf(E[0].v)} % de los jóvenes frente a un ${nf(E[2].v)} % de los mayores.`,s); }

// ---------- 5. pensiones: la pirámide de España hoy, como una silueta; en granate, los mayores de 65 ----------
{ const sh2=(A,B)=>{ const t=d3.sum(A)+d3.sum(B); return [A.map(v=>v/t),B.map(v=>v/t)]; }, [h,m]=sh2(PIR.es.H,PIR.es.M), [ph,pm]=sh2(PIR.pasado.es.H,PIR.pasado.es.M), mx=d3.max([...h,...m]);
  const cx=136, y0=H-14, hh=(H-28)/21, X=v=>v/mx*118, o65=d3.sum(h.slice(13))+d3.sum(m.slice(13)), p65=d3.sum(ph.slice(13))+d3.sum(pm.slice(13));
  const pts=d3.range(21).map(i=>({y:y0-(i+.5)*hh,l:cx-X(h[i]),r:cx+X(m[i])})); pts.unshift({y:y0,l:pts[0].l,r:pts[0].r}); pts.push({y:y0-21*hh,l:cx,r:cx});
  const d=d3.area().y(p=>p.y).x0(p=>p.l).x1(p=>p.r).curve(d3.curveMonotoneY)(pts).replace(/\d+\.\d+/g,v=>r1(+v)), yc=y0-13*hh;
  let s=`<clipPath id="pen-c"><rect x="0" y="0" width="${W}" height="${r1(yc)}"/></clipPath><path d="${d}" class="pt-f-mu"/><path d="${d}" class="pt-f-br" clip-path="url(#pen-c)"/>`;
  s+=T(290,112,pc(o65*100),"pt-g-big")+T(290,138,"mayores","pt-g-l br")+T(290,156,"de 65 años","pt-g-l br")+T(290,196,`En 2005, el ${pc(p65*100)}`,"pt-g-t");
  add("pensiones","Pirámide de población de España hoy; en granate, los mayores de 65. Fuente: INE.",
    `Los mayores de 65 pasan del ${nf(p65*100)} % de la población en 2005 al ${nf(o65*100)} % hoy.`,s); }

// ---------- 6. pandemia y turismo: noches de hotel de 2017 a hoy, las diez provincias más turísticas frente al resto (2019 = 100) ----------
{ const yrs=d3.range(2017,2026), P=PROVS.filter(p=>{ const o=REG.data.prov[p]?.pernoct_hotel; return o&&yrs.every(y=>o[String(y)]>0); });
  const tur=new Set([...P].sort((a,b)=>REG.data.prov[b].pernoct_hotel["2019"]-REG.data.prov[a].pernoct_hotel["2019"]).slice(0,10));
  const serie=g=>yrs.map(y=>[y,d3.sum(g,p=>REG.data.prov[p].pernoct_hotel[String(y)])/d3.sum(g,p=>REG.data.prov[p].pernoct_hotel["2019"])*100]);
  const A=serie(P.filter(p=>tur.has(p))), B=serie(P.filter(p=>!tur.has(p))), a20=A.find(d=>d[0]===2020)[1]-100, b20=B.find(d=>d[0]===2020)[1]-100;
  const x0=40,x1=W-92,y0=H-34,y1=30, X=d3.scaleLinear().domain([yrs[0],yrs[yrs.length-1]]).range([x0,x1]), Y=d3.scaleLinear().domain([0,120]).range([y0,y1]);
  let s=T(x0,14,"Noches de hotel (2019 = 100)","pt-g-t");
  s+=[0,50,100].map(g=>L(x0,Y(g),x1,Y(g),g===100?"pt-g-base":"pt-g-gr")+T(x0-8,Y(g)+4,String(g),"pt-g-t","end")).join("");
  s+=yrs.filter(y=>y%2).map(y=>T(X(y),y0+22,String(y),"pt-g-t","middle")).join("");
  s+=PL(B.map(([y,v])=>[X(y),Y(v)]),"ink")+PL(A.map(([y,v])=>[X(y),Y(v)]),"br");
  const la=A[A.length-1], lb=B[B.length-1]; let ya=Y(la[1]), yb=Y(lb[1]); if(Math.abs(ya-yb)<34){ const m=(ya+yb)/2, up=la[1]>=lb[1]; ya=m+(up?-17:17); yb=m+(up?17:-17); }
  s+=C(X(la[0]),Y(la[1]),4.5,"pt-f-br")+C(X(lb[0]),Y(lb[1]),4,"pt-f-ink");
  s+=T(X(la[0])+10,ya-2,"Las 10 más","pt-g-l br")+T(X(la[0])+10,ya+13,"turísticas","pt-g-l br")+T(X(lb[0])+10,yb+4,"El resto","pt-g-l");
  const xa=X(2020); s+=C(xa,Y(a20+100),4.5,"pt-f-br")+C(xa,Y(b20+100),4,"pt-f-ink");
  s+=T(xa+10,Y(a20+100)+5,pc(a20)+" en 2020","pt-g-g")+T(xa-10,Y(b20+100)+4,pc(b20),"pt-g-t","end");
  add("pandemia-turismo","Pernoctaciones en hoteles cada año respecto a 2019. En granate, las diez provincias con más noches en 2019; en negro, el resto. Fuente: INE, Coyuntura Turística Hotelera.",
    `En 2020 las noches de hotel cayeron un ${nf(-a20)} % en las diez provincias más turísticas y un ${nf(-b20)} % en el resto; en ${la[0]} ya estaban de nuevo en torno a su nivel de 2019.`,s); }

// ---------- 7. quién gobierna: cuánto creció la población donde el PP o el PSOE ganó por poco ----------
{ const sf={}; EST.fields.forEach((f,i)=>sf[f]=i); const pi=EST.padYears.indexOf(2019), pj=EST.padYears.indexOf(2025), pts=[];
  EST.rows.forEach(r=>{ const m=r[sf.mun]&&r[sf.mun][0], pad=r[sf.pad]; if(!m||!pad||!pad[pi]||!pad[pj]) return; const pp=m.find(l=>l[0]==="PP"), ps=m.find(l=>l[0]==="PSOE"); if(!pp||!ps) return; pts.push({m:ps[1]-pp[1],y:(pad[pj]/pad[pi]-1)*100,pop:pad[pj]}); });
  const MG=5, sel=pts.filter(d=>d.pop>=250&&Math.abs(d.m)<=MG&&d.m!==0&&isFinite(d.y)&&d.y>-40&&d.y<60);
  const G=[["Ganó el PP por poco",sel.filter(d=>d.m<0),"pt-f-ink",""],["Ganó el PSOE por poco",sel.filter(d=>d.m>0),"pt-f-br"," br"]].map(([l,g,c,cl])=>({l,n:g.length,v:d3.mean(g,d=>d.y),c,cl}));
  const mar=(()=>{ const se=Math.sqrt(d3.variance(sel.filter(d=>d.m>0),d=>d.y)/G[1].n+d3.variance(sel.filter(d=>d.m<0),d=>d.y)/G[0].n); return 1.96*se; })(), dif=G[1].v-G[0].v;
  const x0=34,x1=W-24, X=d3.scaleLinear().domain([-12,24]).range([x0,x1]), yb=[96,176], rnd=(a,k)=>{ let h=2166136261^k; h=Math.imul(h^Math.round(a*1000),16777619); return ((h>>>0)%1000)/1000; };
  let s=T(24,18,"Cuánto creció cada pueblo de 2019 a 2025","pt-g-t")+L(x0,H-30,x1,H-30);
  [-10,0,10,20].forEach(v=>{ s+=T(X(v),H-10,(v>0?"+":v<0?"−":"")+Math.abs(v)+NB+"%","pt-g-t","middle"); });
  [[sel.filter(d=>d.m<0),"pt-f-ink",0],[sel.filter(d=>d.m>0),"pt-f-br",1]].forEach(([g,c,k])=>{ g.filter(d=>d.y>-12&&d.y<24).forEach((d,i)=>{ s+=`<circle cx="${r1(X(d.y))}" cy="${r1(yb[k]+(rnd(d.y,i+k*999)-.5)*52)}" r="3.4" class="${c}" style="fill-opacity:.5"/>`; }); });
  G.forEach((g,k)=>{ s+=L(X(g.v),yb[k]-32,X(g.v),yb[k]+32,k?"pt-g-tick":"pt-g-tick").replace('class="pt-g-tick"','class="pt-g-tick" style="stroke:var(--ink);stroke-width:2"'); });
  s+=T(x0,yb[0]-36,"Ganó el PP por poco","pt-g-l")+T(x1,yb[0]-36,"media "+(G[0].v>=0?"+":"−")+nf(Math.abs(G[0].v),1)+NB+"%","pt-g-l","end")+T(x0,yb[1]+50,"Ganó el PSOE por poco","pt-g-l br")+T(x1,yb[1]+50,"media "+(G[1].v>=0?"+":"−")+nf(Math.abs(G[1].v),1)+NB+"%","pt-g-l br","end");
  add("quien-gobierna",`Media de los municipios de 250 habitantes o más donde PP y PSOE fueron las dos listas más votadas en 2019 y quedaron a menos de ${MG} puntos (${G[0].n} donde ganó el PP y ${G[1].n} donde ganó el PSOE). Diferencia de ${nf(Math.abs(dif),1)} puntos. Fuente: Ministerio del Interior e INE (padrón).`,
    `Donde el PP ganó por poco la población creció un ${nf(G[0].v,1)} % de 2019 a 2025, y donde ganó el PSOE por poco, un ${nf(G[1].v,1)} %.`,s); }

// ---------- mapas ----------
const FE=topojson.feature(TOPO,TOPO.objects.municipalities).features, CEN=new Map(FE.map(f=>[f.id,d3.geoCentroid(f)])), BY=new Map(ROWS.map(r=>[r[F.code],r]));
const REGIONS=topojson.feature(TOPO,TOPO.objects.autonomous_regions);
const spain=(pad)=>{ const P=ctx.d3.geoConicConformalSpain().fitExtent([[pad[0],pad[1]],[W-pad[2],H-pad[3]]],REGIONS); return P; };
const outline=P=>{ const g=d3.geoPath(P); return `<path d="${g(topojson.mesh(TOPO,TOPO.objects.autonomous_regions,(a,b)=>a===b)).replace(/\d+\.\d+/g,m=>Math.round(+m))}" fill="none" class="pt-g-gr" style="stroke:var(--rule-2)"/>`; };
const short=n=>String(n).replace(/\s*(Alta Velocidad|AV|Guiomar|Miguel Hernández|Puerta de.*|-.*)$/i,"").replace(/^(.+), (el|la|los|las|l')$/i,(m,a,b)=>b+(b.endsWith("'")?"":" ")+a);

// ---------- 8. AVE ----------
{ const P=spain([6,40,6,4]); let s=outline(P);
  const dots=[]; for(const [c,ll] of CEN){ const r=BY.get(c); if(!r||(r[F.pop]||0)<25000) continue; const p=P(ll); if(p) dots.push([p,r[F.pop]]); } dots.forEach(([p,pop])=>s+=C(p[0],p[1],d3.scaleSqrt().domain([0,3e6]).range([1.4,7])(pop),"pt-f-mu"));
  const E=EXT.ave.estaciones, seen=new Set(), st=E.filter(e=>{ const k=e.code; if(seen.has(k)) return false; seen.add(k); return CEN.get(k); }); const place=placer();
  const pts=st.map(e=>({e,p:P(CEN.get(e.code))})).filter(o=>o.p); pts.forEach(({e,p})=>{ s+=C(p[0],p[1],7.5,"pt-g-ghost").replace('class="pt-g-ghost"','fill="none" class="pt-g-ghost" style="stroke:var(--brand);stroke-width:2;stroke-dasharray:none"')+C(p[0],p[1],2.6,"pt-f-br"); });
  pts.filter(o=>o.e.nueva).forEach(({e,p})=>{ const q=place(p[0],p[1],short(e.estacion),{size:12}); if(q) s+=T(q.x,q.y,short(e.estacion),"pt-g-t",q.a,true); });
  s+=T(10,22,`${pts.length} estaciones de alta velocidad abiertas entre 2021 y 2023`,"pt-g-l br");
  add("ave","Cada punto es un municipio de 25.000 habitantes o más, más grande cuanta más gente; los anillos granates son las estaciones nuevas. Fuente: Adif, Renfe y prensa.",
    `Mapa de España con las ${pts.length} estaciones de alta velocidad abiertas entre 2021 y 2023.`,s); }

// ---------- 9. prohibir pisos turísticos ----------
{ const P=spain([6,40,6,4]); let s=outline(P); const M=EXT.vut.municipios.filter(m=>CEN.get(m.code)&&BY.get(m.code)), pop=m=>BY.get(m.code)[F.pop]||0;
  const dots=[]; for(const [c,ll] of CEN){ const r=BY.get(c); if(!r||(r[F.pop]||0)<25000) continue; const p=P(ll); if(p) dots.push([p,r[F.pop]]); } dots.forEach(([p,pp])=>s+=C(p[0],p[1],d3.scaleSqrt().domain([0,3e6]).range([.8,7])(pp),"pt-f-mu"));
  const place=placer(), seenN=new Set(), big=[...M].sort((a,b)=>pop(b)-pop(a)).filter(m=>{ const n=BY.get(m.code)[F.name]; if(seenN.has(n)) return false; seenN.add(n); return true; }); M.forEach(m=>{ const p=P(CEN.get(m.code)); if(p) s+=C(p[0],p[1],5.2,"pt-f-br"); });
  big.slice(0,9).forEach(m=>{ const p=P(CEN.get(m.code)); if(!p) return; const nm=short(BY.get(m.code)[F.name]), q=place(p[0],p[1],nm,{size:12}); if(q) s+=T(q.x,q.y,nm,"pt-g-t",q.a,true); });
  s+=T(10,22,`${M.length} ayuntamientos limitan ya los pisos turísticos`,"pt-g-l br");
  add("prohibir-pisos-turisticos","Municipios con restricciones a los pisos turísticos (granate); en gris, el resto de municipios de 25.000 habitantes o más. Fuente: boletines oficiales y prensa.",
    `Mapa de España con los ${M.length} municipios que limitan los pisos turísticos.`,s); }

// ---------- 10. vivienda protegida ----------
{ const V=VIV.es, Y0=Object.keys(V.iniciadas).filter(y=>V.protegidas[y]!=null).map(Number), x0=44,x1=W-12,y0=H-36,y1=40, w=(x1-x0)/Y0.length, Y=d3.scaleLinear().domain([0,d3.max(Y0,y=>V.iniciadas[y])]).range([y0,y1]);
  const pk=Y0.filter(y=>y>=2000&&y<=2012).reduce((a,b)=>V.protegidas[b]>V.protegidas[a]?b:a), ly=Y0[Y0.length-1];
  let s=[0,250000,500000].map(g=>L(x0,Y(g),x1,Y(g))+T(x0-6,Y(g)+4,g?nf(g/1000)+" mil":"0","pt-g-t","end")).join("");
  Y0.forEach((y,i)=>{ const x=x0+i*w; s+=R(x+w*.1,Y(V.iniciadas[y]),w*.8,y0-Y(V.iniciadas[y]),"pt-f-mu",0)+R(x+w*.1,Y(V.protegidas[y]),w*.8,y0-Y(V.protegidas[y]),"pt-f-br",0); });
  [1995,2005,2015,2025].filter(y=>Y0.includes(y)).forEach(y=>s+=T(x0+Y0.indexOf(y)*w+w/2,y0+18,String(y),"pt-g-t","middle"));
  const px=x0+Y0.indexOf(pk)*w+w/2;
  s+=T(8,18,"Viviendas que se empiezan cada año","pt-g-l")+T(8,34,"en gris, todas; en granate, las protegidas","pt-g-t");
  s+=T(px,Y(V.iniciadas[pk])-10,`${pk}: ${nf(Math.round(V.protegidas[pk]/1000)*1000)} protegidas`,"pt-g-l br","middle",true)+T(x1,Y(V.iniciadas[ly])-34,`${ly}: ${nf(Math.round(V.protegidas[ly]/1000)*1000)}`,"pt-g-l br","end",true);
  add("vivienda-protegida","Viviendas iniciadas cada año (gris) y, de ellas, protegidas (granate). Fuente: Ministerio de Vivienda y Agenda Urbana.",
    `Las viviendas protegidas iniciadas pasan de unas ${nf(Math.round(V.protegidas[pk]/1000)*1000)} en ${pk} a unas ${nf(Math.round(V.protegidas[ly]/1000)*1000)} en ${ly}.`,s); }

// ---------- 11. salario mínimo ----------
{ const S=SUE.smiLegal, Yr=Object.keys(S).map(Number), x0=44,x1=W-14,y0=H-34,y1=30, X=d3.scaleLinear().domain([Yr[0],Yr[Yr.length-1]+1]).range([x0,x1]), Y=d3.scaleLinear().domain([500,Math.ceil(S[Yr[Yr.length-1]]/100)*100+80]).range([y0,y1]);
  const pts=[]; Yr.forEach(y=>{ pts.push([X(y),Y(S[y])],[X(y+1),Y(S[y])]); });
  let s=[600,800,1000,1200].filter(g=>g<Y.domain()[1]).map(g=>L(x0,Y(g),x1,Y(g))+T(x0-6,Y(g)+4,nf(g)+NB+"€","pt-g-t","end")).join("");
  s+=`<path d="M${pts.map(([x,y])=>r1(x)+","+r1(y)).join("L")}L${r1(X(Yr[Yr.length-1]+1))},${y0}L${r1(X(Yr[0]))},${y0}Z" class="pt-g-area"/>`+PL(pts,"ink");
  s+=L(X(2019),Y(S[2018]),X(2019),Y(S[2019]),"pt-g-ln br").replace("pt-g-tick","")+C(X(2019),Y(S[2019]),5,"pt-f-br");
  s+=T(X(2019)-10,Y(S[2019])-6,`2019: ${nf(S[2019])}${NB}€ (+${nf((S[2019]/S[2018]-1)*100)}${NB}%)`,"pt-g-l br","end",true)+T(X(2018)-4,Y(S[2018])+22,`2018: ${nf(S[2018])}${NB}€`,"pt-g-t","end",true);
  [2010,2015,2020,2025].filter(y=>Yr.includes(y)).forEach(y=>s+=T(X(y),y0+18,String(y),"pt-g-t","middle"));
  s+=T(8,16,"Salario mínimo mensual, en 14 pagas","pt-g-t");
  add("smi-empleo-hogar","Salario mínimo interprofesional mensual en 14 pagas. Fuente: BOE (reales decretos del SMI).",
    `El salario mínimo sube un ${nf((S[2019]/S[2018]-1)*100)} % en 2019, de ${nf(S[2018])} a ${nf(S[2019])} euros al mes.`,s); }

// ---------- 12. estudiar: renta según titulados ----------
{ const rs=ROWS.filter(r=>r[F.superiores]!=null&&r[F.renta]&&r[F.pop]>=100), qs=d3.range(0,1.001,.2).map(q=>d3.quantile(rs.map(r=>r[F.superiores]).sort(d3.ascending),q));
  const B=d3.range(5).map(i=>{ const g=rs.filter(r=>r[F.superiores]>=qs[i]&&(i===4?r[F.superiores]<=qs[5]:r[F.superiores]<qs[i+1])); return {a:qs[i],b:qs[i+1],v:d3.median(g,r=>r[F.renta])}; });
  const x0=44,x1=W-44,y0=H-46,y1=70, X=i=>x0+(x1-x0)*i/4, Y=d3.scaleLinear().domain([0,d3.max(B,b=>b.v)]).range([y0,y1]); let s=T(24,18,"Renta por persona, según los titulados de cada municipio","pt-g-t")+L(x0-20,y0,x1+20,y0);
  s+=PL(B.map((b,i)=>[X(i),Y(b.v)]),"br")+B.map((b,i)=>C(X(i),Y(b.v),i===0||i===4?6:4,"pt-f-br")).join("");
  s+=T(X(0),Y(B[0].v)-16,nf(Math.round(B[0].v/100)*100)+NB+"€","pt-g-l","middle")+T(X(4),Y(B[4].v)-16,nf(Math.round(B[4].v/100)*100)+NB+"€","pt-g-l br","middle");
  s+=T(x0-20,y0+22,"Menos titulados","pt-g-t")+T(x1+20,y0+22,"Más titulados","pt-g-t","end");
  add("estudiar","Mediana de la renta neta por persona en cada quinto de municipios (100 habitantes o más) según su parte de titulados superiores. Fuente: INE, Atlas de renta y censo.",
    `Los municipios con más titulados superiores tienen una renta mediana de ${nf(Math.round(B[4].v/100)*100)} euros por persona, frente a ${nf(Math.round(B[0].v/100)*100)} en los que menos.`,s); }

// ---------- 13. paro en el sur: las tres provincias con más paro y las dos con menos ----------
{ const P=PROVS.map(p=>({p,v:wmean(ROWS.filter(r=>r[F.code].slice(0,2)===p),r=>r[F.paroReg])})).filter(d=>d.v!=null).sort((a,b)=>b.v-a.v);
  const x0=30,x1=W-30, X=d3.scaleLinear().domain([2,15]).range([x0,x1]), y0=210, r=6.2, placed=[];
  [...P].sort((a,b)=>a.v-b.v).forEach(d=>{ d.x=X(d.v); let k=0; while(placed.some(o=>Math.abs(o.x-d.x)<2*r+1&&Math.abs(o.k-k)<1)) k++; d.k=k; placed.push(d); });
  let s=T(24,18,"Paro registrado por provincia, % de 16 a 64 años","pt-g-t")+L(x0-10,y0+r+6,x1+10,y0+r+6);
  P.forEach((d,i)=>{ s+=C(d.x,y0-d.k*(2*r+1.5),r,i<6?"pt-f-br":"pt-f-mu"); });
  const hi=P[0], lo=P[P.length-1];
  s+=T(hi.x+14,y0-hi.k*(2*r+1.5)-22,PN[hi.p]+" "+pc(hi.v,1),"pt-g-l br","end")+T(lo.x,y0+r+30,PN[lo.p]+" "+pc(lo.v,1),"pt-g-l","start");
  add("paro-sur","Paro registrado medio de 2025 (SEPE) en cada provincia, ponderado por la población de sus municipios: las tres más altas y las dos más bajas.",
    `El paro registrado va del ${nf(P[P.length-1].v,1)} % en ${PN[P[P.length-1].p]} al ${nf(P[0].v,1)} % en ${PN[P[0].p]}.`,s); }

// ---------- 14. sueldos: la distribución de los sueldos, estimada a partir de los percentiles publicados ----------
{ const E=SUE.ees.es, i=SUE.ees["años"].length-1, yr=SUE.ees["años"][i], md=E.Mediana[i], lo=E["Percentil 10"][i], hi=E["Percentil 90"][i];
  // el logaritmo del sueldo como función suave de la posición en la fila (z de una normal), por los cinco percentiles; cola recta fuera
  const Zs=[-1.2816,-.6745,0,.6745,1.2816], Ls=[lo,E["Cuartil inferior"][i],md,E["Cuartil superior"][i],hi].map(Math.log);
  const dl=Zs.slice(1).map((z,j)=>(Ls[j+1]-Ls[j])/(z-Zs[j])), sl=Zs.map((z,j)=>j===0?dl[0]:j===4?dl[3]:dl[j-1]*dl[j]<=0?0:2*dl[j-1]*dl[j]/(dl[j-1]+dl[j]));
  const lw=z=>{ if(z<=Zs[0]) return Ls[0]+sl[0]*(z-Zs[0]); if(z>=Zs[4]) return Ls[4]+sl[4]*(z-Zs[4]); const j=Zs.findIndex((q,k)=>z>=q&&z<Zs[k+1]), h=Zs[j+1]-Zs[j], t=(z-Zs[j])/h, t2=t*t, t3=t2*t;
    return (2*t3-3*t2+1)*Ls[j]+(t3-2*t2+t)*h*sl[j]+(-2*t3+3*t2)*Ls[j+1]+(t3-t2)*h*sl[j+1]; };
  const dz=1e-3, phi=z=>Math.exp(-z*z/2)/Math.sqrt(2*Math.PI), G=d3.range(-2.6,3.2,.02).map(z=>{ const w=Math.exp(lw(z)), d=(lw(z+dz)-lw(z-dz))/(2*dz); return {w,f:phi(z)/(w*d)}; }).filter(p=>p.w<=80000);
  const x0=24,x1=W-24,y0=214,ytop=96, X=v=>x0+(x1-x0)*v/80000, fm=d3.max(G,p=>p.f), Y=f=>y0-(y0-ytop)*f/fm, k=v=>nf(Math.round(v/100)*100)+NB+"€";
  const path=a=>"M"+a.map(p=>r1(X(p.w))+","+r1(Y(p.f))).join("L"), left=G.filter(p=>p.w<=md), area=a=>path(a)+`L${r1(X(a[a.length-1].w))},${y0}L${r1(X(a[0].w))},${y0}Z`;
  let s=T(24,18,`Sueldo bruto anual de los asalariados, ${yr}`,"pt-g-t")+`<path d="${area(G)}" class="pt-f-mu"/><path d="${area(left)}" class="pt-f-lt"/><path d="${path(G)}" class="pt-g-ln ink" style="stroke-width:1.6"/>`+L(x0,y0,x1,y0,"pt-g-base");
  s+=L(X(md),y0,X(md),Y(G.reduce((q,p)=>Math.abs(p.w-md)<Math.abs(q.w-md)?p:q).f),"pt-g-tick")+C(X(md),y0,6,"pt-f-br");
  s+=T(x1,70,k(md),"pt-g-big","end")+T(x1,92,"La mitad cobra menos","pt-g-g","end");
  s+=C(X(lo),y0,4,"pt-f-ink")+C(X(hi),y0,4,"pt-f-ink")+T(X(lo),y0+24,k(lo),"pt-g-t","middle")+T(X(hi),y0+24,k(hi),"pt-g-t","middle");
  add("sueldos",`Cuántos asalariados cobran cada sueldo bruto anual, en ${yr}. La forma de la curva es una estimación a partir de los percentiles publicados (10, 25, 50, 75 y 90); en granate, la mitad que cobra menos que la mediana, y los puntos marcan el 10 % que menos y el que más cobra. Fuente: INE, Encuesta de Estructura Salarial.`,
    `La mitad de los asalariados cobra menos de ${nf(Math.round(md/100)*100)} euros brutos al año; el 10 % que menos cobra, menos de ${nf(Math.round(lo/100)*100)}.`,s); }

// ---------- 15. gobiernos: paro de España y de la UE ----------
{ const PA=J("paises.json"), ES=PA.paises.ES.paro, EU=PA.paises.EU27_2020.paro, Yr=Object.keys(ES).map(Number).filter(y=>EU[y]!=null).sort((a,b)=>a-b);
  const x0=40,x1=W-16,y0=H-34,y1=40, X=d3.scaleLinear().domain([Yr[0],Yr[Yr.length-1]]).range([x0,x1]), Y=d3.scaleLinear().domain([0,Math.ceil(d3.max(Yr,y=>ES[y])/5)*5]).range([y0,y1]);
  let s=L(x0,Y(0),x1,Y(0));
  s+=[Yr[0],Yr[Yr.length-1]].filter((y,i,a)=>a.indexOf(y)===i).map(y=>T(X(y),y0+22,String(y),"pt-g-t","middle")).join("");
  s+=PL(Yr.map(y=>[X(y),Y(EU[y])]),"ink")+PL(Yr.map(y=>[X(y),Y(ES[y])]),"br");
  const my=Yr.reduce((a,b)=>ES[b]>ES[a]?b:a), ly=Yr[Yr.length-1];
  s+=C(X(my),Y(ES[my]),4.5,"pt-f-br")+T(X(my),Y(ES[my])-12,`${my}: ${pc(ES[my])}`,"pt-g-l br","middle",true)+T(x1,Y(ES[ly])-12,"España","pt-g-l br","end",true)+T(x1,Y(EU[ly])+22,"Unión Europea","pt-g-l","end",true);
  add("gobiernos","Tasa de paro de España (granate) y de la Unión Europea (negro). Fuente: Eurostat y Banco Mundial.",
    `El paro de España sube y baja más que el de la Unión Europea, con cualquier presidente: llega al ${nf(ES[my])} % en ${my}.`,s); }

fs.writeFileSync(path.join(ROOT,"data/covers.json"),JSON.stringify({w:W,h:H,covers:OUT}));
console.log(Object.keys(OUT).length,"gráficos,",Math.round(JSON.stringify(OUT).length/1024),"KB");
