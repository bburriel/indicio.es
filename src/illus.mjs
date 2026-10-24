// Ilustraciones de cabecera de cada análisis (SVG en línea, 1200×360).
// Usan clases de color (.k*) que apuntan a las variables del tema, así que cambian solas en modo oscuro.
// Las genera el build y viajan en window.__INDICIO.illus; la app las pinta bajo el titular.

const f=n=>Math.round(n*10)/10;
const R=(x,y,w,h,c,a="")=>`<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" class="${c}"${a}/>`;
const C=(x,y,r,c,a="")=>`<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" class="${c}"${a}/>`;
const E=(x,y,rx,ry,c,a="")=>`<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}" class="${c}"${a}/>`;
const P=(d,c,a="")=>`<path d="${d}" class="${c}"${a}/>`;
const L=(x1,y1,x2,y2,c,a="")=>`<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" class="${c}"${a}/>`;
const G=(t,inner)=>`<g transform="${t}">${inner}</g>`;
const svg=(id,label,inner)=>`<svg class="il il-${id}" viewBox="0 0 1200 360" preserveAspectRatio="xMidYMax slice" role="img" aria-label="${label}">${R(0,0,1200,360,"k0")}${inner}</svg>`;

// piezas
const hills=(y,c,amp=30,seed=0)=>{ let d=`M0 360 L0 ${y}`; for(let x=0;x<=1200;x+=100) d+=` Q${x+50} ${y-amp*Math.sin((x/100+seed)*1.3)} ${x+100} ${y}`; return P(d+" L1200 360 Z",c); };
const windows=(x,y,cols,rows,w,h,gx,gy,c,lit=[],litC="k3")=>{ let s=""; for(let r=0;r<rows;r++) for(let k=0;k<cols;k++){ const i=r*cols+k; s+=R(x+k*(w+gx),y+r*(h+gy),w,h,lit.includes(i)?litC:c); } return s; };
const bldg=(x,base,w,h,c,winC="k7",cols=3,lit=[],litC="k3")=>{ const rows=Math.max(1,Math.floor((h-30)/34)); const ww=(w-24-(cols-1)*12)/cols; return R(x,base-h,w,h,c)+windows(x+12,base-h+18,cols,rows,ww,18,12,16,winC,lit,litC); };
const house=(x,base,w,h,wall,roof,door="k1")=>R(x,base-h,w,h,wall)+P(`M${x-6} ${base-h} L${x+w/2} ${base-h-w*0.45} L${x+w+6} ${base-h} Z`,roof)+R(x+w/2-6,base-18,12,18,door);
const tree=(x,base,s=1,c="k5")=>R(x-2*s,base-22*s,4*s,22*s,"ki")+C(x,base-30*s,16*s,c);
const person=(x,base,c="k1",s=1)=>C(x,base-46*s,7*s,"ki")+P(`M${x-9*s} ${base-12*s} Q${x-9*s} ${base-36*s} ${x} ${base-36*s} Q${x+9*s} ${base-36*s} ${x+9*s} ${base-12*s} Z`,c)+R(x-7*s,base-12*s,5*s,12*s,"ki")+R(x+2*s,base-12*s,5*s,12*s,"ki");
const suitcase=(x,base,w,h,c)=>R(x,base-h,w,h,c,` rx="5"`)+P(`M${x+w*0.3} ${base-h} L${x+w*0.3} ${base-h-10} L${x+w*0.7} ${base-h-10} L${x+w*0.7} ${base-h}`,"sk",` fill="none" stroke-width="3"`)+C(x+6,base+3,3.5,"ki")+C(x+w-6,base+3,3.5,"ki")+L(x+w*0.33,base-h+6,x+w*0.33,base-6,"sl",` stroke-width="2"`)+L(x+w*0.67,base-h+6,x+w*0.67,base-6,"sl",` stroke-width="2"`);
const keybox=(x,y)=>R(x,y,22,30,"ki",` rx="3"`)+windows(x+4,y+5,3,3,3.5,3.5,2.5,2.5,"k7");
const coin=(x,y,rx,c="k3",e="k8")=>E(x,y+4,rx,rx*0.32,e)+E(x,y,rx,rx*0.32,c);
const stack=(x,base,n,rx,c,e)=>{ let s=""; for(let i=0;i<n;i++) s+=coin(x,base-i*9,rx,c,e); return s; };

export const ILLUS={
  "cerca-ciudad":svg("cerca-ciudad","Un pueblo y una ciudad unidos por una carretera, con anillos de distancia",
    [1,2,3,4].map(i=>C(1000,300,i*160,"sr",` fill="none" stroke-dasharray="6 9" stroke-width="2"`)).join("")+
    hills(282,"k8",22,0.6)+
    [[860,170,"k2"],[920,240,"k1"],[990,200,"k4"],[1050,265,"k1"],[1110,150,"k2"],[1160,215,"k4"]].map(([x,h,c],i)=>bldg(x-30,300,62,h,c,"k7",2,[i*3%5])).join("")+
    P("M120 318 C 330 318, 380 250, 560 262 S 800 300, 900 300","sk",` fill="none" stroke-width="16" stroke-linecap="round"`)+
    P("M120 318 C 330 318, 380 250, 560 262 S 800 300, 900 300","sc",` fill="none" stroke-width="2" stroke-dasharray="12 12"`)+
    R(0,300,1200,60,"k9")+
    house(70,300,52,40,"kc","k2")+house(140,300,44,34,"k7","k1")+house(200,300,56,44,"kc","k2")+
    R(270,214,26,86,"k7")+P("M266 214 L283 180 L300 214 Z","k3")+R(278,230,10,14,"ki")+
    house(312,300,40,30,"k7","k1")+tree(40,300,1)+tree(380,300,1.1)+tree(440,300,0.8)+
    C(160,70,26,"k3")),

  "pisos-turisticos":svg("pisos-turisticos","Una calle de edificios con maletas en la acera y cajetines de llaves",
    C(1080,74,30,"k3")+
    [[40,230,"k8"],[250,270,"k2"],[470,210,"k9"],[680,290,"k1"],[900,240,"k8"]].map(([x,h,c],i)=>bldg(x,312,200,h,c,"k7",4,[1,6,9,14,17,22].map(v=>(v+i*3)%(4*Math.floor((h-30)/34))),"k3")).join("")+
    R(0,312,1200,48,"k9")+R(0,312,1200,6,"kr")+
    keybox(120,270)+keybox(560,270)+keybox(980,270)+
    suitcase(330,332,46,58,"k4")+suitcase(384,332,36,44,"k3")+suitcase(760,332,50,62,"k2")+suitcase(818,332,34,40,"k5")+suitcase(1110,332,42,52,"k4")),

  "convergencia":svg("convergencia","Pilas de monedas que crecen más donde eran más bajas",
    hills(300,"k8",14,1.2)+R(0,300,1200,60,"k9")+
    Array.from({length:9},(_,i)=>{ const x=150+i*112, n0=3+i*2, g=Math.max(1,9-i); return stack(x,292,n0+g,40,"k3","k8")+L(x-50,292-(n0-1)*9,x+50,292-(n0-1)*9,"sk",` stroke-width="3" stroke-dasharray="5 5" opacity=".55"`)+P(`M${x} ${292-(n0+g)*9-24} l-9 12 h6 v14 h6 v-14 h6 Z`,"k1",` opacity="${(0.35+0.65*(1-i/8)).toFixed(2)}"`); }).join("")+
    L(100,292-25*9,1100,292-25*9,"sr",` stroke-dasharray="6 8" stroke-width="2"`)),

  "votar-pueblos":svg("votar-pueblos","Un pueblo con su campanario y una urna con un sobre",
    hills(250,"k8",34,0.3)+hills(292,"k5",18,2.1)+R(0,300,1200,60,"k9")+
    house(110,300,60,46,"kc","k2")+house(190,300,50,38,"k7","k1")+R(262,170,40,130,"k7")+P("M256 170 L282 120 L308 170 Z","k3")+C(282,200,10,"ki")+house(320,300,58,44,"kc","k2")+house(400,300,46,34,"k7","k1")+tree(470,300,1.2)+tree(60,300,0.9)+
    G("translate(700 0)",R(0,170,300,150,"kc",` rx="10"`)+R(0,170,300,150,"sk",` rx="10" fill="none" stroke-width="5"`)+R(100,162,100,10,"ki",` rx="4"`)+
      R(30,250,90,58,"k7",` rx="3" transform="rotate(-8 75 280)"`)+R(140,262,90,50,"k7",` rx="3" transform="rotate(6 185 287)"`)+
      G("translate(110 60) rotate(-6)",R(0,0,90,64,"k7",` rx="3"`)+P("M0 0 L45 34 L90 0","k1")+P("M0 0 L45 34 L90 0","sk",` fill="none" stroke-width="2"`)))+
    C(1060,80,28,"k3")),

  "crecer":svg("crecer","Gente que llega a un pueblo donde se construyen casas nuevas",
    hills(240,"k8",30,0.9)+R(0,300,1200,60,"k9")+
    house(560,300,60,48,"kc","k2")+house(640,300,52,40,"k7","k1")+house(712,300,64,52,"kc","k2")+house(796,300,50,40,"k7","k1")+house(866,300,58,46,"kc","k2")+
    G("translate(960 0)",R(0,252,70,48,"k7")+R(0,252,70,48,"sk",` fill="none" stroke-width="2" stroke-dasharray="5 5"`)+L(-10,250,80,250,"sk",` stroke-width="3"`)+L(-10,276,80,276,"sk",` stroke-width="3"`)+L(-6,300,-6,240,"sk",` stroke-width="3"`)+L(76,300,76,240,"sk",` stroke-width="3"`))+
    G("translate(1110 0)",R(-4,90,8,210,"k3")+R(-90,90,200,8,"k3")+L(-80,98,-80,180,"sk",` stroke-width="2"`)+R(-94,180,28,20,"k1")+R(60,98,40,22,"ki"))+
    tree(520,300,1.1)+tree(1180,300,0.9)+
    person(120,326,"k4",1.05)+suitcase(136,326,26,30,"k3")+person(220,326,"k2",0.95)+person(255,326,"k5",0.7)+person(350,326,"k1",1)+suitcase(366,326,24,28,"k4")+
    P("M420 312 l40 0 l-10 -9 M460 312 l-10 9","sk",` fill="none" stroke-width="3" stroke-linecap="round"`)+
    C(140,74,26,"k3")),

  "tope-cataluna":svg("tope-cataluna","Una flecha de precios que sube y choca contra un techo",
    [[60,170,"k8"],[180,230,"k9"],[310,190,"k8"],[880,250,"k9"],[1000,180,"k8"],[1110,220,"k9"]].map(([x,h,c])=>bldg(x,320,100,h,c,"k7",2)).join("")+
    R(0,320,1200,40,"k9")+
    R(470,96,560,16,"k4",` rx="4"`)+R(470,96,8,224,"k4")+R(1022,96,8,224,"k4")+
    P("M120 300 L300 250 L420 196 L540 128 L700 128 L860 128","k1",` fill="none" stroke-width="14" stroke-linejoin="round" stroke-linecap="round"`).replace('class="k1"','class="sb"')+
    P("M858 110 L898 128 L858 146 Z","k1")+
    P("M540 128 L690 52","sr",` fill="none" stroke-width="5" stroke-dasharray="8 10" stroke-linecap="round"`)+P("M690 52 l-20 2 M690 52 l-4 19","sr",` fill="none" stroke-width="5" stroke-linecap="round"`)),

  "pensiones":svg("pensiones","Una pirámide de población ensanchada por arriba y dos personas mayores en un banco",
    Array.from({length:14},(_,i)=>{ const y=300-i*18, a=i/13, w=60+150*Math.exp(-((a-0.62)**2)/0.06)+40*(1-a); return R(320-w,y-14,w-3,14,"k4")+R(323,y-14,w*0.98,14,"k2"); }).join("")+
    L(321,60,321,306,"sk",` stroke-width="2"`)+
    P("M560 230 C 600 170, 600 130, 560 90","sk",` fill="none" stroke-width="4" stroke-dasharray="8 8" stroke-linecap="round"`)+P("M560 90 l18 2 M560 90 l2 18","sk",` fill="none" stroke-width="4" stroke-linecap="round"`)+
    R(0,306,1200,54,"k9")+
    G("translate(760 0)",R(0,252,240,12,"k1",` rx="3"`)+R(10,264,10,42,"k1")+R(220,264,10,42,"k1")+R(0,212,240,10,"k1",` rx="3"`)+
      C(70,186,14,"k7")+P("M48 252 Q48 206 70 206 Q92 206 92 252 Z","k5")+C(170,186,14,"k7")+P("M148 252 Q148 206 170 206 Q192 206 192 252 Z","k3")+L(210,214,226,306,"sk",` stroke-width="5" stroke-linecap="round"`))+
    stack(1080,300,8,34,"k3","k8")+stack(1150,300,5,30,"k3","k8")+tree(700,306,1.3)),

  "pandemia-turismo":svg("pandemia-turismo","Una playa vacía con sombrillas cerradas y un hotel a oscuras",
    C(980,92,40,"k3")+R(0,210,1200,70,"k4")+P("M0 228 q30 -8 60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0","sc",` fill="none" stroke-width="3" opacity=".5"`)+
    R(0,270,1200,90,"k8")+
    G("translate(60 0)",R(0,60,180,210,"k9")+windows(16,78,4,6,28,20,14,12,"ki"))+
    [380,520,660,800].map((x,i)=>R(x-3,186,6,104,"ki")+P(`M${x-12} 196 L${x} 140 L${x+12} 196 Z`,i%2?"k2":"k1")).join("")+
    [430,710].map(x=>P(`M${x} 300 L${x+80} 300 L${x+100} 280`,"sk",` fill="none" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"`)+L(x+8,300,x+8,318,"sk",` stroke-width="5"`)+L(x+72,300,x+72,318,"sk",` stroke-width="5"`)).join("")+
    G("translate(1040 150) rotate(-8)",P("M0 0 L90 0 Q104 0 104 8 Q104 16 90 16 L0 16 Z","kr")+P("M40 2 L22 -26 L36 -26 L62 2 Z","kr")+P("M40 14 L22 40 L36 40 L62 14 Z","kr")+P("M2 2 L-6 -16 L4 -16 L14 2 Z","kr"))),

  "renta-fuentes":svg("renta-fuentes","Corrientes de distintos colores que confluyen en una casa",
    [["k4",60,16],["k3",130,12],["k5",200,8],["k2",270,7]].map(([c,y,w],i)=>P(`M0 ${y} C 380 ${y}, 520 ${236+i*10-15}, 840 ${236+i*10-15}`,c.replace("k","s"),` fill="none" stroke-width="${w*3}" stroke-linecap="round" opacity=".92"`)).join("")+
    R(0,306,1200,54,"k9")+
    house(860,306,220,150,"kc","k1","k2")+windows(884,186,3,1,46,34,22,0,"k7")+
    stack(1140,300,6,26,"k3","k8")),

  "quien-gobierna":svg("quien-gobierna","Un ayuntamiento con dos banderas y una moneda en el aire",
    R(0,310,1200,50,"k9")+R(370,300,460,10,"kr")+
    R(400,130,400,170,"kc")+P("M380 130 L600 64 L820 130 Z","k1")+C(600,108,20,"k7")+L(600,108,600,96,"sk",` stroke-width="3"`)+L(600,108,610,112,"sk",` stroke-width="3"`)+
    windows(424,150,5,2,52,50,20,24,"k8")+R(560,238,80,62,"k2")+R(470,206,260,8,"ki")+
    L(500,130,500,40,"sk",` stroke-width="4"`)+P("M500 42 L560 52 L500 64 Z","k4")+L(700,130,700,40,"sk",` stroke-width="4"`)+P("M700 42 L760 52 L700 64 Z","k2")+
    G("translate(980 120)",E(0,0,46,46,"k3")+E(0,0,34,34,"sm",` fill="none" stroke-width="3"`)+P("M-70 60 C -70 -10, -30 -60, 0 -60","sk",` fill="none" stroke-width="3" stroke-dasharray="4 8"`)+P("M70 60 C 70 -10, 30 -60, 0 -60","sk",` fill="none" stroke-width="3" stroke-dasharray="4 8"`))+
    tree(250,310,1.3)+tree(320,310,0.9)+tree(900,310,1.1)),

  "ave":svg("ave","Un tren de alta velocidad cruzando un viaducto",
    hills(230,"k8",40,0.4)+hills(300,"k5",18,1.7)+
    R(0,206,1200,14,"k9")+
    Array.from({length:9},(_,i)=>{ const x=20+i*140; return P(`M${x} 220 L${x+140} 220 L${x+140} 340 L${x+118} 340 Q${x+118} 260 ${x+70} 260 Q${x+22} 260 ${x+22} 340 L${x} 340 Z`,"k9"); }).join("")+
    R(0,340,1200,20,"k8")+
    R(180,140,640,60,"kc")+P("M180 200 L820 200 L820 140 L860 140 Q960 140 1010 200 Z","kc")+P("M180 200 L820 200 L820 140 L860 140 Q960 140 1010 200 L180 200 L180 140 L820 140","sk",` fill="none" stroke-width="3" stroke-linejoin="round"`)+R(180,170,640,8,"k1")+windows(220,150,12,1,34,14,16,0,"k4")+P("M880 152 Q940 152 975 182 L880 182 Z","k4")+C(240,204,8,"ki")+C(300,204,8,"ki")+C(700,204,8,"ki")+C(760,204,8,"ki")+
    [100,130,160].map((y,i)=>L(30+i*30,y+50,150,y+50,"sr",` stroke-width="4" stroke-linecap="round"`)).join("")+
    C(1080,70,26,"k3")),

  "prohibir-pisos-turisticos":svg("prohibir-pisos-turisticos","Un edificio con una maleta y una señal de prohibido",
    C(160,74,28,"k3")+
    bldg(60,312,220,250,"k8","k7",4,[2,7,9,13],"k3")+bldg(300,312,200,280,"k2","k7",4,[1,4,10,15,18],"k3")+bldg(880,312,240,230,"k9","k7",4,[3,6,11],"k3")+
    R(0,312,1200,48,"k9")+keybox(420,264)+keybox(950,264)+
    G("translate(600 0)",suitcase(40,300,150,180,"k4")+C(115,190,110,"sb",` fill="none" stroke-width="22"`)+L(38,113,192,267,"sb",` stroke-width="22"`)))
};

// Más escenas de cabecera para preguntas rápidas
const more={
  "estudiar":svg("estudiar","Un birrete sobre una pila de libros y monedas",
    hills(300,"k8",16,0.8)+R(0,300,1200,60,"k9")+
    G("translate(420 0)",R(0,262,300,38,"k4",` rx="4"`)+R(20,226,270,36,"k2",` rx="4"`)+R(-10,190,290,36,"k5",` rx="4"`)+R(30,156,250,34,"k3",` rx="4"`)+
      [0,1,2,3].map(i=>R([300,290,280,280][i]-26+[0,20,-10,30][i],[266,230,194,160][i],10,[30,28,28,26][i],"k7")).join("")+
      P("M60 128 L155 92 L250 128 L155 160 Z","ki")+R(110,128,90,26,"ki")+L(250,128,250,170,"sk",` stroke-width="3"`)+C(250,174,7,"k3"))+
    stack(860,296,9,40,"k3","k8")+stack(950,296,6,36,"k3","k8")+tree(220,300,1.4)+tree(1100,300,1)+C(150,80,28,"k3")),
  "paro-sur":svg("paro-sur","Paisaje del norte verde al sur seco, con una cola ante una oficina",
    P("M0 360 L0 230 Q150 170 300 220 Q450 260 600 230 L600 360 Z","k5")+P("M600 360 L600 230 Q760 200 900 236 Q1050 266 1200 240 L1200 360 Z","k8")+
    tree(80,240,1.2)+tree(160,220,1)+tree(250,232,1.3)+C(1060,80,34,"k3")+C(140,70,22,"kr")+
    [700,800,900,1000].map(x=>C(x,262,12,"k5")+R(x-1.5,262,3,14,"ki")).join("")+
    G("translate(380 0)",R(0,170,220,140,"kc")+R(0,152,220,18,"k1")+windows(18,190,4,2,36,26,14,14,"k8")+R(90,262,40,48,"k4"))+
    [640,680,720,760,800,840].map((x,i)=>person(x,322,["k4","k2","k5","k1","k3","k4"][i],0.95)).join("")+R(0,322,1200,38,"k9"))
};
Object.assign(ILLUS,more);

// Escenas de cada tema (tarjetas de temas, laboratorio y municipio): 640×400
const svgT=(id,label,inner)=>`<svg class="il il-t il-${id}" viewBox="0 0 640 400" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${label}">${R(0,0,640,400,"k0")}${inner}</svg>`;
const hillsT=(y,c,amp=24,seed=0)=>{ let d=`M0 400 L0 ${y}`; for(let x=0;x<=640;x+=80) d+=` Q${x+40} ${y-amp*Math.sin((x/80+seed)*1.3)} ${x+80} ${y}`; return P(d+" L640 400 Z",c); };
export const TILL={
  riqueza:svgT("riqueza","Pilas de monedas de distinta altura con una planta que crece",
    hillsT(320,"k8",14,0.4)+R(0,330,640,70,"k9")+[[150,6],[250,10],[350,15],[450,21]].map(([x,n])=>stack(x,322,n,38,"k3","k8")).join("")+
    R(448,122,4,26,"k5")+E(436,126,14,7,"k5")+E(464,118,14,7,"k5")+C(560,80,26,"k3")),
  vivienda:svgT("vivienda","Un edificio de pisos, casas y una llave",
    hillsT(300,"k8",18,1.1)+R(0,320,640,80,"k9")+bldg(200,320,170,240,"k1","k7",3,[1,5,8,10],"k3")+house(60,320,90,70,"kc","k2")+house(420,320,80,64,"k7","k1")+house(520,320,70,54,"kc","k2")+keybox(330,280)+
    G("translate(470 120) rotate(-30)",C(0,0,22,"k3")+C(0,0,9,"k0")+R(18,-5,70,10,"k3")+R(66,5,8,14,"k3")+R(80,5,8,10,"k3"))),
  poblacion:svgT("poblacion","Gente con maletas camino de un pueblo, con la ciudad al fondo",
    [[440,180,"k8"],[490,230,"k9"],[540,200,"k8"],[590,160,"k9"]].map(([x,h,c])=>bldg(x,300,46,h,c,"k7",1)).join("")+
    hillsT(290,"k5",16,0.2)+R(0,320,640,80,"k9")+house(70,300,70,54,"kc","k2")+house(160,300,60,46,"k7","k1")+house(240,300,64,50,"kc","k2")+tree(330,300,1.2)+
    person(300,360,"k4",1.1)+suitcase(318,360,28,32,"k3")+person(390,360,"k2",1)+person(430,360,"k5",0.75)+person(500,360,"k1",1.05)+suitcase(518,360,26,30,"k4")+C(90,70,24,"k3")),
  trabajo:svgT("trabajo","Una fábrica, una oficina y gente que va a trabajar",
    hillsT(300,"k8",14,0.9)+R(0,320,640,80,"k9")+
    P("M40 320 L40 210 L100 180 L100 210 L160 180 L160 210 L220 180 L220 320 Z","k4")+R(180,120,24,70,"k2")+C(196,104,14,"kr")+C(214,84,18,"kr")+windows(56,236,3,2,36,24,18,14,"k7")+
    bldg(420,320,150,230,"k1","k7",3,[2,4,9],"k3")+
    person(280,360,"k3",1.05)+person(330,360,"k5",1)+person(380,360,"k2",1.05)+C(560,60,22,"k3")),
  gasto:svgT("gasto","Un edificio público con columnas del que salen monedas hacia un hospital y una escuela",
    R(0,320,640,80,"k9")+
    G("translate(40 0)",P("M0 140 L120 90 L240 140 Z","k1")+R(10,140,220,14,"kc")+[0,1,2,3,4].map(i=>R(26+i*44,160,18,140,"kc")).join("")+R(0,300,240,20,"kr"))+
    house(470,320,120,110,"kc","k2","k4")+R(520,226,20,56,"k2")+R(502,244,56,20,"k2")+
    P("M300 200 C 360 150, 420 160, 460 220","sk",` fill="none" stroke-width="3" stroke-dasharray="6 8"`)+coin(340,168,14)+coin(390,158,14)+coin(436,182,14)+C(560,70,24,"k3")),
  voto:svgT("voto","Una urna con sobres y un campanario al fondo",
    hillsT(280,"k8",20,0.5)+R(0,320,640,80,"k9")+R(60,170,40,150,"k7")+P("M54 170 L80 120 L106 170 Z","k3")+C(80,200,10,"ki")+house(120,320,60,46,"kc","k2")+
    G("translate(240 0)",R(0,190,280,140,"kc",` rx="10"`)+R(0,190,280,140,"sk",` rx="10" fill="none" stroke-width="5"`)+R(90,182,100,10,"ki",` rx="4"`)+R(30,270,80,50,"k7",` rx="3" transform="rotate(-8 70 295)"`)+
      G("translate(96 80) rotate(-6)",R(0,0,90,64,"k7",` rx="3"`)+P("M0 0 L45 34 L90 0","k1")+P("M0 0 L45 34 L90 0","sk",` fill="none" stroke-width="2"`)))+C(570,70,24,"k3")),
  laboratorio:svgT("laboratorio","Una lupa sobre una nube de puntos con su línea de tendencia",
    R(0,330,640,70,"k9")+R(80,60,440,270,"kc",` rx="8"`)+L(120,300,490,300,"sk",` stroke-width="3"`)+L(120,300,120,90,"sk",` stroke-width="3"`)+
    Array.from({length:46},(_,i)=>{ const x=140+((i*53)%330), y=280-(x-140)*0.5+((i*37)%70-35); return C(x,y,6,i%3?"k2":"k4",` opacity=".85"`); }).join("")+
    L(130,286,490,104,"sb",` stroke-width="5" stroke-linecap="round"`)+
    G("translate(400 220)",C(0,0,62,"k7",` opacity=".55"`)+C(0,0,62,"sk",` fill="none" stroke-width="10"`)+L(44,44,110,110,"sk",` stroke-width="18" stroke-linecap="round"`))),
  municipio:svgT("municipio","Un pueblo en una colina con un marcador de mapa encima",
    hillsT(250,"k8",30,0.7)+hillsT(300,"k5",16,1.9)+R(0,330,640,70,"k9")+house(200,300,60,46,"kc","k2")+house(270,300,50,38,"k7","k1")+R(330,190,34,110,"k7")+P("M324 190 L347 150 L370 190 Z","k3")+house(380,300,60,46,"kc","k2")+tree(160,300,1.1)+tree(470,300,1.2)+
    G("translate(320 40)",P("M0 110 C -20 80, -50 60, -50 30 A50 50 0 1 1 50 30 C 50 60, 20 80, 0 110 Z","k1")+C(0,28,18,"k7")))
};

// Encuadre de cada escena en las tarjetas (ventana de 720 px de ancho sobre 1200)
export const FOCUS={"cerca-ciudad":330,"pisos-turisticos":240,"convergencia":240,"votar-pueblos":360,"crecer":380,"tope-cataluna":300,"pensiones":340,"pandemia-turismo":330,"renta-fuentes":480,"quien-gobierna":350,"ave":360,"prohibir-pisos-turisticos":240,"estudiar":300,"paro-sur":300};

ILLUS["iva-alimentos"]=svg("iva-alimentos","Una cesta de la compra con pan, leche y fruta junto a un ticket",
  R(0,300,1200,60,"k9")+R(0,292,1200,10,"kr")+
  G("translate(420 0)",
    R(40,150,30,110,"kc",` rx="6"`)+R(40,150,30,110,"sk",` rx="6" fill="none" stroke-width="2"`)+R(40,182,30,30,"k4")+
    E(150,170,70,26,"k3")+P("M88 168 q20 -14 40 0 q20 -14 40 0 q20 -14 40 0","sk",` fill="none" stroke-width="2" opacity=".5"`)+
    C(240,190,22,"k2")+C(270,180,20,"k5")+C(290,200,18,"k3")+R(268,152,4,14,"k5")+
    P("M0 196 L340 196 L310 300 L30 300 Z","k1")+[60,120,180,240,290].map(x=>L(x,206,x-6+(x>170?10:0),290,"sl",` stroke-width="3" opacity=".5"`)).join("")+
    P("M40 196 Q170 90 300 196","sk",` fill="none" stroke-width="6"`))+
  G("translate(860 70) rotate(4)",R(0,0,150,220,"kc")+P("M0 220 l12 10 l13 -10 l12 10 l13 -10 l12 10 l13 -10 l12 10 l13 -10 l12 10 l13 -10 l12 10 l13 -10 L150 220 Z","kc")+
    [30,52,74,96,118].map((y,i)=>R(16,y,[80,64,90,56,72][i],7,"kr")+R(112,y,22,7,"kr")).join("")+L(16,148,134,148,"sk",` stroke-width="2" stroke-dasharray="4 4"`)+R(16,162,50,10,"ki")+R(96,162,38,10,"ki")+
    G("translate(60 186)",C(0,0,26,"sb",` fill="none" stroke-width="5"`)+P("M-10 10 L10 -10","sb",` fill="none" stroke-width="5" stroke-linecap="round"`)+C(-8,-8,4,"k1")+C(8,8,4,"k1")))+
  C(140,80,28,"k3")+tree(220,300,1.3)+tree(1120,300,1));
FOCUS["iva-alimentos"]=330;

ILLUS["vivienda-protegida"]=svg("vivienda-protegida","Un bloque de vivienda protegida con un escudo, una grúa parada y edificios altos al fondo",
  hills(250,"k8",24,1.3)+R(0,300,1200,60,"k9")+
  [[760,230,"k4"],[840,280,"k2"],[930,210,"k1"],[1010,260,"k4"],[1090,190,"k2"]].map(([x,h,c],i)=>bldg(x,300,70,h,c,"k7",2,[i*2%5])).join("")+
  G("translate(560 0)",R(0,70,10,230,"k2")+R(-120,70,250,10,"k2")+R(110,80,8,14,"ki")+L(-90,80,-90,170,"sk",` stroke-width="2"`)+R(-102,170,24,16,"k3")+
    P("M-120 70 L5 40 L130 70","sk",` fill="none" stroke-width="2"`)+R(-10,290,30,10,"ki"))+
  bldg(190,300,190,150,"kc","k7",4,[2,5],"k3")+R(190,140,190,10,"k1")+
  G("translate(285 182)",P("M0 -26 L22 -18 L22 2 C22 16 10 24 0 28 C-10 24 -22 16 -22 2 L-22 -18 Z","kr")+P("M-9 1 L-2 9 L11 -8","sc",` fill="none" stroke-width="4" stroke-linecap="round"`))+
  tree(110,300,1.2)+tree(430,300,0.9)+person(470,300,"k5",1)+C(140,70,26,"k3"));
FOCUS["vivienda-protegida"]=240;
