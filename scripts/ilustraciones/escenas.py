"""Escenas de las ilustraciones de Indicio (pluma y aguada). Cada cabecera de análisis mide 1200×360;
FOCUS dice dónde está el centro de lo importante para recortar la tarjeta (en px del dibujo)."""
from pluma import Pen, C, INK
import math, random

ESC={}; FOCUS={}; LABEL={}
def esc(id,label,focus=600):
    def deco(fn): ESC[id]=fn; FOCUS[id]=focus; LABEL[id]=label; return fn
    return deco
def dash(svgpath,d="6 6"): return svgpath.replace('stroke-linecap','stroke-dasharray="'+d+'" stroke-linecap')

@esc("cerca-ciudad","Un pueblo y una ciudad unidos por una carretera, con anillos de distancia",600)
def _(p):
    o=p.sun(120,64,34)+p.cloud(420,74,1.1)+p.cloud(760,50,.8)+p.birds(560,80)
    o+=p.skyline(240,"blue2",7,hmin=70,hmax=150,o=.6)+p.hills(250,"sage2",16,seed=1)
    o+="".join(dash(p.curve(f"M{980-r} 360a{r} {r*.55} 0 0 1 {2*r} 0",.9,.45),"5 8") for r in (180,300,420,540))
    for i,(x,h,c) in enumerate([(820,190,"wine"),(905,260,"blue"),(985,210,"och2"),(1065,280,"rose"),(1150,180,"terra")]):
        o+=p.building(x,320,84,h,c,max(2,h//52),2,"rect","cream" if c!="och2" else "sage","none",i+3,plants=.15,laundry=0)
    o+=p.hills(300,"sage",12,seed=3)
    o+=p.wash("M0 350 C240 334 430 306 610 296 C760 288 840 300 860 312 L860 322 C840 312 760 300 610 308 C430 318 240 352 0 362z","#5a554e",.85,0,0)
    o+="".join(p.line([(70+i*95,346-i*7),(104+i*95,343-i*7)],1.8,.85,False,col=C["cream"]) for i in range(8))
    for x,w,h in [(30,70,52),(108,58,44),(172,76,56),(256,62,46)]: o+=p.house(x,322,w,h,"cream","terra")
    o+=p.church(330,322,40,130)+p.tree(400,322,.8,"cypress")+p.tree(14,326,.7)
    o+=p.car(560,306,"wine",1.1)
    return o

@esc("pisos-turisticos","Bloques de pisos con maletas en los portales y cajetines de llaves",620)
def _(p):
    o=p.cloud(1080,46,.8)
    specs=[(0,200,300,"rose",4,3),(200,180,340,"wine",5,3),(380,210,280,"och2",3,4),(590,180,340,"blue",5,3),(770,220,300,"cream",4,4),(990,220,320,"terra",5,3)]
    for i,(x,w,h,c,f,cols) in enumerate(specs): o+=p.building(x,330,w,h,c,f,cols,"arch" if i%2 else "rect","cream" if c in("wine","blue","terra") else "och","shop" if i in(2,4) else None,i+20,plants=.25)
    o+=p.ground(330,c="sand")
    for x,c,w,h in [(236,"blue",30,42),(272,"och",26,34),(630,"wine",30,44),(666,"sage",26,34),(1030,"blue3",30,42)]: o+=p.suitcase(x,350,w,h,c)
    for x in (318,712,1110): o+=p.rwash(x,268,22,30,INK,.88)+"".join(f'<rect x="{x+4+(k%3)*5}" y="{273+(k//3)*7}" width="3.4" height="3.4" fill="{C["cream"]}"/>' for k in range(9))
    o+=p.person(500,352,"sage",1.6,bag="och")+p.lamp(565,330,130)
    return o

@esc("convergencia","Pilas de monedas que crecen más deprisa cuanto más bajas empiezan",600)
def _(p):
    o=p.sun(1100,60,30)+p.cloud(200,60,.9)+p.hills(240,"sage2",18,seed=4,o=.7)+p.ground(320,c="sand")
    o+=dash(p.curve("M40 74 H1160",1,.55),"7 7")
    for i in range(8):
        x=110+i*140; n0=5+i*3; n=n0+max(2,int((8-i)*2.2))
        o+=p.coin_stack(x,326,n,44,"och",8)
        y=326-n*8-26; o+=p.arrow([(x,y),(x,y-26)],"wine",3)
        o+=dash(p.curve(f"M{x-52} {326-n0*8} h104",1,.75),"5 5")
    return o

@esc("votar-pueblos","Un pueblo con su iglesia y una urna grande en primer plano",640)
def _(p):
    o=p.sun(1100,60,32)+p.cloud(280,60,1)+p.hills(230,"sage2",20,seed=2)+p.hills(290,"sage",14,seed=5)
    for x,w,h in [(30,70,54),(110,62,48),(182,76,58),(270,64,50)]: o+=p.house(x,320,w,h,"cream","terra")
    o+=p.church(350,320,44,150)+p.tree(420,320,1,"cypress")+p.tree(1110,322,1)
    o+=p.ground(320,c="sand")
    bx,by,bw,bh=560,340,250,170
    o+=p.solid(bx,by-bh,bw,bh)+p.rwash(bx,by-bh,bw,bh,"sand2",.75)+p.hatch(bx,by-bh,bw,bh,62,7,.45,.25)+p.rect(bx,by-bh,bw,bh,1.7)+p.rwash(bx,by-bh,bw,26,"wine",.95)+p.rect(bx,by-bh,bw,26,1.3)
    o+=p.rwash(bx+85,by-bh+8,80,9,INK,.95)+p.hatch(bx+bw-32,by-bh+26,32,bh-26,62,5,.5,.4)
    o+=p.rwash(bx+60,by-80,130,40,"cream",.95)+p.rect(bx+60,by-80,130,40,1)
    o+=p.paper(bx+92,by-bh-86,66,80,-8,5,True)
    o+=p.person(890,344,"blue",1.7)+p.person(960,344,"och",1.6,bag="wine")
    return o

@esc("crecer","Un pueblo que crece: casas nuevas, una grúa y gente que llega",600)
def _(p):
    o=p.sun(110,60,30)+p.cloud(620,56,.9)+p.hills(230,"sage2",16,seed=6)+p.ground(320,c="sand")
    for x,w,h in [(330,74,56),(412,64,50),(484,80,60),(572,68,52),(648,76,58)]: o+=p.house(x,320,w,h,"cream","terra")
    o+=p.rwash(740,236,110,84,"sand2",.6)+p.rect(740,236,110,84,1.1)+"".join(p.line([(740+i*22,236),(740+i*22,320)],.8,.6,False) for i in range(6))+"".join(p.line([(740,236+i*21),(850,236+i*21)],.8,.6,False) for i in range(5))
    o+=p.line([(900,320),(900,60)],3)+p.line([(870,74),(1100,74)],2.6)+p.line([(900,60),(1090,74)],1.1)+"".join(p.line([(904+i*14,74),(912+i*14,64)],.8,.7,False) for i in range(13))
    o+=p.line([(1040,74),(1040,170)],1.1)+p.rwash(1026,170,28,22,"wine",.95)+p.rect(1026,170,28,22,1)+p.rwash(860,68,26,16,INK,.9)
    o+=p.line([(892,320),(892,300),(908,300),(908,320)],1)
    for x,c,b in [(60,"wine","blue"),(130,"sage","och"),(196,"blue",None)]:
        o+=p.person(x,330,c,1.6)+(p.suitcase(x+22,330,22,30,b) if b else "")
    o+=p.arrow([(240,300),(300,300)],"wine",3)+p.tree(1150,322,.9)+p.tree(296,322,.7,"cypress")
    return o

@esc("tope-cataluna","Bloques de pisos y una flecha de precios que choca con un techo",600)
def _(p):
    o=p.skyline(250,"blue2",13,hmin=50,hmax=120,o=.55)+p.cloud(600,46,.8)
    for i,(x,w,h,c) in enumerate([(0,170,270,"cream"),(170,150,210,"rose"),(870,150,290,"och2"),(1020,180,230,"cream")]): o+=p.building(x,330,w,h,c,max(2,h//58),3,"rect","och" if c=="cream" else "cream","none",i+40,plants=.2)
    o+=p.ground(330,c="sand")
    o+=p.line([(380,120),(380,330)],4,col=C["blue3"])+p.line([(820,120),(820,330)],4,col=C["blue3"])+p.rwash(366,104,468,18,"blue3",.95)+p.rect(366,104,468,18,1.3)
    o+=p.arrow([(340,310),(430,268),(520,214),(590,164),(650,140),(800,140)],"wine",6)
    o+=dash(p.curve("M590 164 Q650 80 760 52",1.4,.65),"7 6")
    return o

@esc("pensiones","Una pareja mayor en un banco, junto a una pirámide de edades",600)
def _(p):
    o=p.sun(1100,56,30)+p.cloud(820,60,.8)+p.hills(250,"sage2",14,seed=8,o=.7)+p.ground(320,c="sand")+p.tree(1040,322,1.3)
    for i in range(24):
        y=40+i*11; w=(i/23)**.7*170+18-(max(0,i-19)*16)
        o+=p.rwash(250-w,y,w,9,"blue",.9)+p.rwash(252,y,w*1.05,9,"wine2",.9)
    o+=p.line([(251,32),(251,310)],1.3)
    o+=p.curve("M440 240 q40 -80 -12 -150",1.4,.85)+p.pwash([(422,86),(442,94),(430,104)],INK,.9)
    bx=540; o+=p.rwash(bx,276,300,12,"och",.95)+p.rect(bx,276,300,12,1.1)+p.rwash(bx,236,300,10,"och",.95)+p.rect(bx,236,300,10,1.1)+p.line([(bx+30,246),(bx+30,276)],1.4)+p.line([(bx+270,246),(bx+270,276)],1.4)+p.line([(bx+20,290),(bx+16,322)],2.6)+p.line([(bx+280,290),(bx+284,322)],2.6)
    o+=p.person(bx+96,322,"sage",1.6,hair="#bdb6ad",cane=True,sit=True)+p.person(bx+176,322,"wine",1.5,hair="#d7d1c8",sit=True,face=-1)
    o+=p.coin_stack(900,326,8,30)+p.coin_stack(966,326,5,30)
    return o

@esc("pandemia-turismo","Una playa vacía con sombrillas, un hotel y un avión que pasa",600)
def _(p):
    o=p.sun(1060,64,40)+p.cloud(700,60,.9)
    o+=p.wash("M0 190 H1200 V300 H0z","sea",.95,0,0)+"".join(p.line([(x,210+k*20),(x+46,210+k*20)],1.1,.65,False,col=C["cream"]) for k in range(4) for x in range(30+k*30,1200,150))
    o+=p.line([(0,190),(1200,190)],1.3)+p.wash("M0 286 Q300 272 600 284 T1200 278 V360 H0z","sand",.98,0,0)+p.curve("M0 286 Q300 272 600 284 T1200 278",1.3)
    o+=p.building(30,300,250,270,"cream",5,5,"rect","blue","none",50,plants=.1,laundry=0)
    for i,x in enumerate((420,620,820,1020)):
        o+=p.line([(x,342),(x+5,214)],2.2)+p.wash(f"M{x-78} 226 Q{x+5} 160 {x+88} 226z","wine" if i%2==0 else "och",.95,0,0)+p.curve(f"M{x-78} 226 Q{x+5} 160 {x+88} 226z",1.3)
        o+=p.phatch(f"M{x-78} 226 Q{x+5} 160 {x+88} 226z",80,6,.5,.35,(x-80,160,170,70))
        o+=p.line([(x-60,344),(x+24,322),(x+66,322)],2)+p.line([(x-54,344),(x-54,354)],1.4)+p.line([(x+56,322),(x+60,346)],1.4)
    o+=f'<g transform="translate(850 92) rotate(-8) scale(1.3)">'+p.pwash([(0,0),(110,0),(126,6),(110,12),(0,12)],"cream",1)+p.poly([(0,0),(110,0),(126,6),(110,12),(0,12)],1.1)+p.pwash([(40,6),(70,6),(30,34),(20,34)],"blue2",1)+p.poly([(40,6),(70,6),(30,34),(20,34)],1)+p.pwash([(4,0),(16,0),(4,-18)],"blue2",1)+'</g>'
    return o

# ---------- piezas propias de algunas escenas ----------
def townhall(p,x,base,w=300,h=170,flags=("wine","blue3")):
    o=p.solid(x,base-h,w,h)+p.rwash(x,base-h,w,h,"cream",.95)+p.hatch(x+w-16,base-h,16,h,62,5,.5,.3)+p.rect(x,base-h,w,h,1.5)
    tri=[(x-10,base-h),(x+w/2,base-h-60),(x+w+10,base-h)]; o+=p.psolid(tri)+p.pwash(tri,"wine",.95)+p.poly(tri,1.3)
    o+=f'<circle cx="{x+w/2}" cy="{base-h-24}" r="15" fill="{C["cream"]}" stroke="{INK}" stroke-width="1.2"/>'+p.line([(x+w/2,base-h-24),(x+w/2,base-h-34)],1.2,1,False)+p.line([(x+w/2,base-h-24),(x+w/2+7,base-h-20)],1.2,1,False)
    for i in range(5):
        cx=x+30+i*(w-60)/4
        o+=p.line([(cx-14,base-h+8),(cx-14,base-28)],1)+p.line([(cx+14,base-h+8),(cx+14,base-28)],1)
        o+=p.window(cx-12,base-h+30,24,40,"arch",C["och"] if i%2 else None,True,i in(1,3),False)
        o+=p.window(cx-12,base-h+96,24,36,"rect",None,False)
    o+=p.rwash(x+w/2-22,base-50,44,50,"wine",.95)+p.rect(x+w/2-22,base-50,44,50,1.2)+p.rwash(x-14,base-10,w+28,10,"sand2",.9)+p.rect(x-14,base-10,w+28,10,1)
    for j,fc in enumerate(flags):
        fx=x+w/2-50+j*100; o+=p.line([(fx,base-h-4),(fx,base-h-74)],1.8)+p.wash(f"M{fx} {base-h-74}q20 -8 40 2v24q-20 -10 -40 -2z",fc,.95,0,0)+p.curve(f"M{fx} {base-h-74}q20 -8 40 2v24q-20 -10 -40 -2z",1)
    return o
def basket(p,x,base,w=220,h=90):
    o=""
    o+=p.blob(x+60,base-h-10,26,"och",.95)+p.curve(f"M{x+34} {base-h-10}q26 -26 52 0",1,.8)  # pan
    o+=p.rwash(x+100,base-h-60,34,62,"cream",1)+p.rect(x+100,base-h-60,34,62,1)+p.rwash(x+100,base-h-40,34,16,"blue2",.95)+p.pwash([(x+104,base-h-60),(x+130,base-h-60),(x+124,base-h-74),(x+110,base-h-74)],"cream",1)+p.poly([(x+104,base-h-60),(x+130,base-h-60),(x+124,base-h-74),(x+110,base-h-74)],.9)
    for cx,cy,r,c in [(x+160,base-h-6,18,"wine"),(x+186,base-h-2,15,"och"),(x+146,base-h-24,14,"sage")]: o+=p.blob(cx,cy,r,c,.95)+f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="{INK}" stroke-width=".9"/>'
    body=[(x,base-h),(x+w,base-h),(x+w-20,base),(x+20,base)]
    o+=p.psolid(body)+p.pwash(body,"terra",.95)+p.poly(body,1.4)
    o+="".join(p.line([(x+20+i*(w-40)/7+ (0), base-h+2),(x+26+i*(w-40)/7,base-2)],.8,.7,False) for i in range(8))+"".join(p.line([(x+8+j*2,base-h+18+j*20),(x+w-8-j*2,base-h+18+j*20)],.8,.6,False) for j in range(4))
    o+=p.curve(f"M{x+30} {base-h}C{x+40} {base-h-110} {x+w-40} {base-h-110} {x+w-30} {base-h}",3,.9)
    return o
def receipt(p,x,y,w=110,h=170,rot=6):
    zig="".join(f"l{w/10:.1f} {(-8 if i%2 else 8)}" for i in range(10))
    d=f"M{x} {y}h{w}v{h}{zig.replace('l','l-',0)}"
    pts=[(x,y),(x+w,y),(x+w,y+h)]+[(x+w-(i+1)*w/10,y+h+(8 if i%2==0 else 0)) for i in range(10)]
    o=p.psolid(pts)+p.pwash(pts,"cream",1)+p.poly(pts,1.1)
    o+="".join(p.line([(x+12,y+16+i*15),(x+w-(30 if i%3 else 14),y+16+i*15)],.8,.7,False) for i in range(8))
    o+=p.line([(x+12,y+h-28),(x+w-12,y+h-28)],1.4)+f'<circle cx="{x+w-30}" cy="{y+h-50}" r="12" fill="none" stroke="{C["wine"]}" stroke-width="2.4"/>'+p.line([(x+w-38,y+h-42),(x+w-22,y+h-58)],2,1,False,col=C["wine"])
    return f'<g transform="rotate({rot} {x+w/2} {y+h/2})">{o}</g>'
def cart(p,x,base,k=1.0):
    o=p.line([(x-40*k,base-120*k),(x-14*k,base-120*k),(x,base-30*k),(x+150*k,base-30*k),(x+170*k,base-100*k),(x-6*k,base-100*k)],2.4)
    o+="".join(p.line([(x+(i*24)*k,base-100*k),(x+(6+i*22)*k,base-30*k)],.9,.7,False) for i in range(8))+p.line([(x-2*k,base-70*k),(x+160*k,base-66*k)],.9,.7,False)
    return o+f'<circle cx="{x+20*k}" cy="{base-10*k}" r="{10*k}" fill="{INK}"/><circle cx="{x+136*k}" cy="{base-10*k}" r="{10*k}" fill="{INK}"/>'
def balance(p,x,base,h=200,tilt=-8):
    o=p.line([(x,base),(x,base-h)],3)+p.rwash(x-40,base-8,80,8,"sand2",.95)+p.rect(x-40,base-8,80,8,1)
    a=math.radians(tilt); L=130
    x1,y1=x-L*math.cos(a),base-h-L*math.sin(a); x2,y2=x+L*math.cos(a),base-h+L*math.sin(a)
    o+=p.line([(x1,y1),(x2,y2)],2.6)
    for (px,py),fill in [((x1,y1),"och"),((x2,y2),"wine")]:
        o+=p.line([(px,py),(px-30,py+50)],.9)+p.line([(px,py),(px+30,py+50)],.9)+p.wash(f"M{px-38} {py+50}h76q-8 18 -38 18t-38 -18z",fill,.95,0,0)+p.curve(f"M{px-38} {py+50}h76q-8 18 -38 18t-38 -18z",1.1)
    return o
def books(p,x,base):
    o=""; y=base
    for w,h,c,dx in [(200,26,"blue3",0),(180,24,"wine",12),(190,22,"sage",4),(170,24,"och",16)]:
        y-=h; o+=p.solid(x+dx,y,w,h)+p.rwash(x+dx,y,w,h,c,.95)+p.rect(x+dx,y,w,h,1.2)+p.rwash(x+dx+w-12,y+3,8,h-6,"cream",.9)
    cap=[(x+40,y-10),(x+110,y-36),(x+180,y-10),(x+110,y+14)]
    o+=p.rwash(x+80,y-14,60,20,INK,.9)+p.psolid(cap)+p.pwash(cap,INK,.92)+p.poly(cap,1)+p.line([(x+170,y-12),(x+176,y+22)],1.4)+p.blob(x+176,y+26,5,"och",1)
    return o
def noentry(p,cx,cy,r=70):
    return f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="{C["wine"]}" stroke-width="{r*.16:.1f}" filter="url(#wash)"/>'+p.line([(cx-r*.7,cy-r*.7),(cx+r*.7,cy+r*.7)],r*.16,.95,False,col=C["wine"])+f'<circle cx="{cx}" cy="{cy}" r="{r*1.08:.1f}" fill="none" stroke="{INK}" stroke-width="1"/>'
def train(p,x,y,cars=5):
    o=""
    nose=[(x+cars*130,y),(x+cars*130+60,y+6),(x+cars*130+110,y+40),(x+cars*130,y+44)]
    for i in range(cars):
        cx=x+i*130; o+=p.solid(cx,y,126,44)+p.rwash(cx,y,126,44,"cream",.98)+p.rect(cx,y,126,44,1.2)+p.rwash(cx,y+28,126,6,"wine",.95)
        o+="".join(p.rwash(cx+10+j*22,y+8,14,12,"glass",.85) for j in range(5))
    o+=p.psolid(nose)+p.pwash(nose,"cream",.98)+p.poly(nose,1.3)+p.pwash([(x+cars*130+40,y+8),(x+cars*130+66,y+10),(x+cars*130+86,y+26),(x+cars*130+40,y+24)],"blue3",.9)
    o+="".join(p.line([(x-40-i*30,y+10+i*10),(x-10-i*40,y+10+i*10)],1.2,.6,False) for i in range(3))
    return o

@esc("renta-fuentes","Una casa a la que llegan corrientes de distintos colores: salarios, pensiones y ayudas",620)
def _(p):
    o=p.sun(130,60,30)+p.cloud(420,56,.9)+p.ground(320,c="sand")
    for i,(c,y0,wd) in enumerate([("blue3",80,46),("och",130,34),("sage",172,24),("wine2",206,18)]):
        y1=262+i*10
        top=f"M-20 {y0} C300 {y0} 500 {y1-20} 760 {y1}"; bot=f"L760 {y1+wd*.45} C500 {y1+wd*.45-20} 300 {y0+wd} -20 {y0+wd}z"
        o+=p.wash(top+bot,c,.85,0,0)+p.curve(top,1,.8)+p.curve(f"M-20 {y0+wd} C300 {y0+wd} 500 {y1+wd*.45-20} 760 {y1+wd*.45}",.8,.6)
    o+=p.house(760,320,250,190,"cream","wine")
    o+=p.coin_stack(1070,326,6,26)+p.coin_stack(1126,326,9,26)
    o+=p.tree(40,322,.7,"cypress")
    return o

@esc("quien-gobierna","El ayuntamiento con dos banderas y una moneda que gira en el aire",560)
def _(p):
    o=p.cloud(160,60,1)+p.cloud(1040,74,.8)+p.hills(260,"sage2",12,seed=9,o=.6)+p.ground(320,c="sand")
    o+=townhall(p,380,320,320,180)
    o+=p.tree(300,322,1.1)+p.tree(780,322,1.1)+p.tree(1130,322,.8,"cypress")
    cx,cy=900,120; o+=f'<ellipse cx="{cx}" cy="{cy}" rx="34" ry="40" fill="{C["och"]}" opacity=".95" filter="url(#wash)"/><ellipse cx="{cx}" cy="{cy}" rx="34" ry="40" fill="none" stroke="{INK}" stroke-width="1.3"/><ellipse cx="{cx}" cy="{cy}" rx="24" ry="29" fill="none" stroke="{INK}" stroke-width=".8" opacity=".6"/>'
    o+=dash(p.curve(f"M{cx-80} {cy+90} Q{cx-70} {cy-40} {cx-40} {cy-30}",1.2,.6),"5 6")+dash(p.curve(f"M{cx+60} {cy-40} Q{cx+90} {cy+20} {cx+70} {cy+80}",1.2,.6),"5 6")
    o+=p.person(1000,330,"blue",1.5)+p.person(200,330,"wine",1.55,bag="och")
    return o

@esc("ave","Un tren de alta velocidad que cruza un viaducto sobre el campo",600)
def _(p):
    o=p.sun(1080,60,32)+p.cloud(300,54,.9)+p.hills(250,"sage2",16,seed=10,o=.7)+p.hills(300,"sage",12,seed=11)
    o+=p.solid(0,190,1200,14)+p.rwash(0,190,1200,14,"sand2",.95)+p.rect(-2,190,1204,14,1.2)
    for i in range(9):
        x=20+i*140; d=f"M{x} 204 h120 v120 h-14 a46 46 0 0 0 -92 0 h-14z"
        o+=f'<path d="{d}" fill="{C["paper"] if "paper" in C else "#f5f0e6"}"/>'+p.wash(d,"sand",.95,0,0)+p.curve(d,1.2)+p.phatch(d,60,6,.5,.3,(x,204,120,120))
    o+=train(p,140,146,6)
    o+=p.tree(1120,326,.9)+p.tree(70,330,.7,"cypress")
    return o

@esc("prohibir-pisos-turisticos","Bloques de pisos y una señal de prohibido sobre una maleta",600)
def _(p):
    o=p.cloud(1080,50,.8)
    for i,(x,w,h,c) in enumerate([(0,190,290,"cream"),(190,170,320,"wine"),(800,180,300,"och2"),(980,220,280,"rose")]): o+=p.building(x,330,w,h,c,max(3,h//62),3,"rect","cream" if c=="wine" else "och","none",i+60,plants=.25)
    o+=p.ground(330,c="sand")
    o+=p.suitcase(540,300,120,170,"blue")+noentry(p,600,210,120)
    for x in (300,880): o+=p.rwash(x,262,22,30,INK,.88)
    return o

@esc("estudiar","Una pila de libros con un birrete y unas monedas al lado",560)
def _(p):
    o=p.sun(130,60,30)+p.cloud(900,56,.9)+p.hills(260,"sage2",12,seed=12,o=.6)+p.ground(320,c="sand")
    o+=books(p,420,320)+p.coin_stack(720,326,9,32)+p.coin_stack(790,326,12,32)+p.coin_stack(860,326,6,32)
    o+=p.tree(260,322,1.1)+p.tree(1060,322,1)+p.person(1000,330,"sage",1.5,bag="wine")
    return o

@esc("paro-sur","Un paisaje de norte a sur con una oficina de empleo y gente esperando",620)
def _(p):
    o=p.sun(1080,60,40)+p.cloud(220,50,.9)
    o+=p.hills(230,"sage",22,seed=13)+p.hills(280,"och2",14,seed=14,o=.85)
    o+=p.ground(320,c="sand")
    for x in (80,140,200): o+=p.tree(x,250,.7)
    o+=p.building(460,320,280,170,"cream",2,4,"rect","och","none",70,plants=.1,laundry=0)
    o+=p.rwash(450,140,300,22,"wine",.95)+p.rect(450,140,300,22,1.2)+f'<text x="600" y="156" text-anchor="middle" font-family="Georgia,serif" font-style="italic" font-size="14" fill="{C["cream"]}">Oficina de empleo</text>'
    o+=p.rwash(578,276,44,44,"blue3",.95)+p.rect(578,276,44,44,1.2)
    for i,(c,k) in enumerate([("wine",1.5),("blue",1.45),("sage",1.55),("och",1.4),("terra",1.5),("blue3",1.45)]): o+=p.person(800+i*52,332,c,k,face=-1)
    o+=p.arrow([(60,330),(200,330)],"wine",2)+f'<text x="60" y="352" font-family="Georgia,serif" font-style="italic" font-size="13" fill="{INK}">norte</text><text x="1140" y="352" text-anchor="end" font-family="Georgia,serif" font-style="italic" font-size="13" fill="{INK}">sur</text>'
    return o

@esc("iva-alimentos","Una cesta de la compra con pan, leche y fruta junto a un ticket",600)
def _(p):
    o=p.cloud(200,60,.9)+p.sun(1080,60,30)+p.ground(320,c="sand")
    o+=p.rwash(0,300,1200,20,"sand2",.6)+basket(p,430,320,240,100)+receipt(p,730,110,120,180,7)
    o+=p.tree(200,322,1)+p.tree(1050,322,.9)
    return o

@esc("vivienda-protegida","Una grúa levanta un bloque de viviendas protegidas junto a la ciudad",600)
def _(p):
    o=p.cloud(240,56,.9)+p.skyline(250,"blue2",17,hmin=60,hmax=140,o=.5)
    for i,(x,w,h,c) in enumerate([(820,130,250,"blue"),(950,120,300,"wine"),(1070,130,220,"rose")]): o+=p.building(x,330,w,h,c,max(3,h//60),2,"rect","cream","none",i+80,plants=.2)
    o+=p.building(330,330,230,200,"cream",3,4,"rect","sage","none",90,plants=.15,laundry=0)
    o+=p.solid(330,90,230,50)+"".join(p.line([(330+i*46,90),(330+i*46,140)],1,.8,False) for i in range(6))+"".join(p.line([(330,90+j*25),(560,90+j*25)],1,.8,False) for j in range(3))
    o+=p.line([(640,330),(640,40)],3)+p.line([(300,54),(760,54)],2.6)+"".join(p.line([(304+i*16,54),(312+i*16,44)],.8,.7,False) for i in range(28))+p.line([(640,40),(320,54)],1)+p.line([(640,40),(750,54)],1)
    o+=p.line([(470,54),(470,90)],1.1)+p.rwash(440,90,60,14,"och",.95)
    o+=f'<g>{p.solid(568,236,60,60)}{p.rwash(568,236,60,60,"sage",.95)}{p.rect(568,236,60,60,1.2)}{p.line([(578,268),(594,282),(618,250)],3,1,False,col=C["cream"])}</g>'
    o+=p.ground(330,c="sand")+p.person(150,340,"och",1.5,bag="wine")+p.person(200,340,"blue",1.6)
    return o

@esc("reforma-laboral","Un tablón de ofertas de empleo con contratos y gente que lo mira",600)
def _(p):
    o=p.cloud(1000,60,.9)+p.sun(150,60,30)+p.hills(260,"sage2",12,seed=15,o=.6)+p.ground(320,c="sand")
    bx,by,bw,bh=430,120,340,170
    o+=p.solid(bx,by,bw,bh)+p.rwash(bx,by,bw,bh,"terra",.75)+p.rect(bx,by,bw,bh,1.6)+p.line([(bx+40,by+bh),(bx+40,330)],3)+p.line([(bx+bw-40,by+bh),(bx+bw-40,330)],3)
    for i in range(6):
        px=bx+18+(i%3)*108; py=by+14+(i//3)*78
        o+=p.paper(px,py,96,66,(-3,2,-1,3,-2,1)[i],4,i in(1,4),"cream" if i%2 else "och2")
    o+=p.person(320,330,"wine",1.6)+p.person(370,330,"sage",1.5,bag="och")+p.person(840,330,"blue",1.6,face=-1)
    o+=p.building(960,330,200,230,"blue2",4,3,"rect","cream","shop",95,plants=.2)
    return o

@esc("smi-empleo-hogar","Una casa, una escoba y una nómina con el salario mínimo",600)
def _(p):
    o=p.cloud(220,60,.9)+p.sun(1080,60,30)+p.hills(260,"sage2",12,seed=16,o=.6)+p.ground(320,c="sand")
    o+=p.house(420,320,260,180,"cream","wine")
    o+=p.line([(720,330),(760,150)],3,col="#8a6a44")+p.wash("M700 330 l20 -60 l40 6 l-10 60z","och",.95,0,0)+p.curve("M700 330 l20 -60 l40 6 l-10 60z",1.1)+"".join(p.line([(704+i*8,330),(720+i*7,272)],.7,.7,False) for i in range(6))
    o+=p.paper(820,120,150,190,6,8,False)+p.rwash(842,262,90,18,"wine",.9)
    o+=p.person(360,330,"blue",1.6,bag="sage")+p.tree(150,322,1)
    return o

@esc("tope-compraventas","Bloques de pisos con un cartel de se vende y una flecha de compraventas",600)
def _(p):
    o=p.cloud(560,50,.8)
    for i,(x,w,h,c) in enumerate([(0,190,280,"wine"),(190,150,220,"blue"),(340,190,300,"cream")]): o+=p.building(x,330,w,h,c,max(3,h//60),3,"rect","cream" if c!="cream" else "och","none",i+100,plants=.25)
    o+=p.ground(330,c="sand")+p.sign(600,190,130,40,"Se vende","wine",18,True,330)
    o+=p.arrow([(780,300),(860,250),(920,272),(1000,190),(1080,150)],"wine",5)+p.line([(780,320),(1120,320)],1)+p.line([(780,320),(780,130)],1)
    return o

@esc("deuda-quien-gobierna","El ayuntamiento entre dos montones de monedas",600)
def _(p):
    o=p.cloud(200,60,.9)+p.cloud(1000,54,.8)+p.hills(260,"sage2",12,seed=17,o=.6)+p.ground(320,c="sand")
    o+=townhall(p,440,320,320,180)
    o+=p.coin_stack(320,326,6,34)+p.coin_stack(250,326,9,34)+p.coin_stack(880,326,8,34)+p.coin_stack(950,326,5,34)
    o+=p.tree(110,322,1)+p.tree(1110,322,1,"cypress")
    return o

@esc("precio-alimentos","Un carro de la compra y una balanza entre comida y sueldo",600)
def _(p):
    o=p.cloud(300,56,.9)+p.sun(1090,60,30)+p.ground(320,c="sand")
    o+=cart(p,340,330,1.3)
    for cx,cy,r,c in [(420,170,24,"wine"),(470,160,22,"och"),(520,176,20,"sage")]: o+=p.blob(cx,cy,r,c,.95)+f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="{INK}" stroke-width=".9"/>'
    o+=p.rwash(380,150,26,46,"cream",1)+p.rect(380,150,26,46,1)
    o+=balance(p,860,320,200,-8)
    o+=p.blob(716,176,13,"wine",.95)+p.blob(740,172,12,"och",.95)+p.blob(728,160,10,"sage",.95)
    o+=p.paper(966,118,46,30,-8,2,False,"och2")
    o+=p.tree(140,322,1)
    return o
