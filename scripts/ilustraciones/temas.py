"""Ilustraciones de los temas, el laboratorio y la ficha de municipio (640×400)."""
from pluma import Pen, C, INK
import escenas as E
TEM={}; LABEL={}
def tem(id,label):
    def deco(fn): TEM[id]=fn; LABEL[id]=label; return fn
    return deco

@tem("riqueza","Pilas de monedas de distinta altura con una planta que crece")
def _(p):
    o=p.sun(540,70,32)+p.cloud(140,70,.8)+p.hills(290,"sage2",14,W=640,seed=1,H=400)+p.ground(330,640,400,"sand")
    for x,n in [(140,6),(250,11),(360,17),(470,24)]: o+=p.coin_stack(x,336,n,40)
    top=336-24*8; o+=p.line([(470,top),(472,top-50)],2.4,col=C["sage3"])+p.blob(452,top-40,14,"sage",.95)+p.blob(492,top-56,13,"sage",.95)+p.curve(f"M440 {top-40} q12 -12 26 0",1)+p.curve(f"M480 {top-56} q12 -12 26 0",1)
    return o

@tem("vivienda","Una calle de bloques con balcones y un cartel de se alquila")
def _(p):
    o=p.cloud(520,50,.7)
    for i,(x,w,h,c) in enumerate([(0,170,300,"rose"),(170,150,340,"wine"),(320,170,280,"och2"),(490,150,320,"blue")]):
        o+=p.building(x,350,w,h,c,max(3,h//62),3 if w>150 else 2,"arch" if i%2 else "rect","cream" if c in ("wine","blue") else "och","shop" if i==2 else None,i+5,plants=.3,laundry=.1)
    o+=p.ground(350,640,400,"sand")+p.sign(196,150,96,30,"Se alquila","wine",15,False)
    return o

@tem("poblacion","Un camino que va de un pueblo a la ciudad, con una maleta en medio")
def _(p):
    o=p.sun(90,64,28)+p.skyline(250,"blue2",3,640,60,140,.7)+p.hills(270,"sage2",14,640,2,H=400)+p.hills(320,"sage",10,640,4,H=400)
    o+=p.wash("M40 400 C160 360 300 330 420 300 C480 286 520 280 560 280 L566 288 C520 290 470 300 430 312 C320 344 200 380 120 400z","sand",.95,0,0)
    for x,w,h in [(40,60,46),(108,52,40)]: o+=p.house(x,330,w,h)
    o+=p.church(170,330,30,104)+p.suitcase(330,350,46,60,"wine")+p.person(400,354,"blue",1.5,face=1)
    return o

@tem("trabajo","Una mesa de trabajo con un ordenador, un casco y una taza")
def _(p):
    o=p.cloud(500,60,.7)+p.ground(330,640,400,"sand")
    o+=p.solid(80,250,480,16)+p.rwash(80,250,480,16,"och",.95)+p.rect(80,250,480,16,1.2)+p.line([(110,266),(110,350)],3)+p.line([(530,266),(530,350)],3)
    o+=p.solid(250,130,170,110)+p.rwash(250,130,170,110,INK,.9)+p.rwash(260,140,150,90,"cream",1)+p.arrow([(270,210),(310,180),(340,196),(390,156)],"wine",3)
    o+=p.pwash([(230,240),(440,240),(452,250),(218,250)],"gray",.95)+p.poly([(230,240),(440,240),(452,250),(218,250)],1)
    o+=p.wash("M120 248 q0 -50 46 -50 q46 0 46 50z","och",.95,0,0)+p.curve("M120 248 q0 -50 46 -50 q46 0 46 50z",1.2)+p.line([(110,248),(222,248)],2)
    o+=p.rwash(470,206,36,44,"wine",.95)+p.rect(470,206,36,44,1.1)+p.curve("M506 216 q14 0 14 12 t-14 12",1.4)+p.curve("M480 196 q6 -10 0 -18 M492 196 q6 -10 0 -18",1,.6)
    return o

@tem("gasto","Un edificio público con columnas y el dinero que va a pensiones, sanidad y educación")
def _(p):
    o=p.cloud(120,60,.7)+p.ground(330,640,400,"sand")
    x,w,h=60,260,170; o+=p.solid(x,330-h,w,h)+p.rwash(x,330-h,w,h,"cream",.95)+p.rect(x,330-h,w,h,1.4)
    tri=[(x-12,330-h),(x+w/2,330-h-56),(x+w+12,330-h)]; o+=p.psolid(tri)+p.pwash(tri,"wine",.95)+p.poly(tri,1.3)
    for i in range(5): cx=x+26+i*52; o+=p.rwash(cx,330-h+14,16,h-30,"sand",.9)+p.rect(cx,330-h+14,16,h-30,1)+p.hatch(cx+10,330-h+14,6,h-30,62,3,.5,.4)
    o+=p.rwash(x-12,320,w+24,10,"sand2",.95)+p.rect(x-12,320,w+24,10,1)
    for j,(y,c,lab) in enumerate([(120,"blue3","Pensiones"),(190,"sage","Sanidad"),(260,"och","Educación")]):
        o+=E.dash(p.curve(f"M330 {200+j*20} C400 {200+j*20} 420 {y} 470 {y}",1.2,.6),"5 5")+p.blob(500,y,28,c,.95)+f'<circle cx="500" cy="{y}" r="28" fill="none" stroke="{INK}" stroke-width="1"/>'+f'<text x="540" y="{y+5}" font-family="Georgia,serif" font-style="italic" font-size="14" fill="{INK}">{lab}</text>'
    return o

@tem("voto","Una urna con un sobre entrando y papeletas a los lados")
def _(p):
    o=p.cloud(520,60,.7)+p.ground(330,640,400,"sand")
    bx,by,bw,bh=200,340,240,160
    o+=p.solid(bx,by-bh,bw,bh)+p.rwash(bx,by-bh,bw,bh,"sand2",.7)+p.hatch(bx,by-bh,bw,bh,62,7,.45,.25)+p.rect(bx,by-bh,bw,bh,1.6)+p.rwash(bx,by-bh,bw,24,"wine",.95)+p.rect(bx,by-bh,bw,24,1.3)+p.rwash(bx+80,by-bh+8,80,8,INK,.95)
    o+=p.paper(bx+90,by-bh-80,60,76,-8,5,True)+p.paper(80,220,70,90,-12,5,False)+p.paper(500,210,70,90,10,5,False,"och2")
    return o

@tem("laboratorio","Una lupa sobre una nube de puntos y un matraz")
def _(p):
    o=p.cloud(120,60,.7)+p.ground(340,640,400,"sand")
    import random
    r=random.Random(3); pts=[(80+t*440+r.gauss(0,18),300-t*200+r.gauss(0,22)) for t in [i/50 for i in range(50)]]
    o+="".join(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="4" fill="{C["blue3"]}" opacity=".75"/>' for x,y in pts)
    o+=E.dash(p.curve("M70 310 L540 90",1.2,.7),"6 6")
    o+=f'<circle cx="300" cy="190" r="70" fill="{C["cream"]}" opacity=".6"/>'+"".join(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="6" fill="{C["wine"]}" opacity=".9"/>' for x,y in pts if (x-300)**2+(y-190)**2<60**2)
    o+=f'<circle cx="300" cy="190" r="70" fill="none" stroke="{INK}" stroke-width="7"/>'+p.line([(350,240),(410,300)],12,1,False)
    fl=[(500,230),(530,230),(530,270),(570,330),(460,330),(500,270)]
    o+=p.psolid(fl)+p.pwash([(468,300),(562,300),(570,330),(460,330)],"sage",.95)+p.poly(fl,1.3)
    return o

@tem("municipio","Un pueblo con su iglesia y un marcador de mapa encima")
def _(p):
    o=p.sun(90,60,28)+p.hills(280,"sage2",14,640,5,H=400)+p.ground(330,640,400,"sand")
    for x,w,h in [(90,64,48),(160,56,44),(330,70,52),(410,58,44),(476,66,50)]: o+=p.house(x,330,w,h)
    o+=p.church(240,330,40,140)+p.tree(560,332,.8,"cypress")+p.tree(40,332,.7)
    pin="M300 60 a46 46 0 0 1 46 46 c0 34 -46 80 -46 80 c0 0 -46 -46 -46 -80 a46 46 0 0 1 46 -46z"
    o+=p.wash(pin,"wine",.95,0,0)+p.curve(pin,1.4)+f'<circle cx="300" cy="106" r="16" fill="{C["cream"]}" stroke="{INK}" stroke-width="1.1"/>'
    return o
