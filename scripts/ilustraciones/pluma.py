"""Piezas para las ilustraciones de Indicio en estilo pluma y aguada:
trazo a mano que vibra (y a veces va doble), sombras con trama de rayas,
manchas de color con borde irregular y textura de papel.
Todo es determinista: la misma semilla da siempre el mismo dibujo."""
import math, random

INK="#2a2622"; PAPER="#f5f0e6"
C=dict(wine="#9a3b46",wine2="#b9616a",rose="#dba79c",och="#dcae5a",och2="#ead09a",sage="#8faa86",sage2="#b9ccb0",sage3="#6f8f69",
       blue="#8ea2bf",blue2="#c3cfdf",blue3="#5f7598",sand="#e3d2b2",sand2="#d6c09a",terra="#c4795a",cream="#f8f1e2",gray="#b7b0a4",glass="#59627a",sea="#8fb0c9")

class Pen:
    def __init__(s,seed=1): s.r=random.Random(seed); s.ids=0
    def uid(s): s.ids+=1; return f"u{s.ids}x{s.r.randint(0,99999)}"
    # ---------- trazo ----------
    def jit(s,pts,amp=1.0,step=14):
        out=[]
        for (x1,y1),(x2,y2) in zip(pts,pts[1:]):
            d=math.hypot(x2-x1,y2-y1); n=max(1,int(d/step))
            for i in range(n):
                t=i/n; out.append((x1+(x2-x1)*t+s.r.uniform(-amp,amp),y1+(y2-y1)*t+s.r.uniform(-amp,amp)))
        out.append((pts[-1][0]+s.r.uniform(-amp,amp),pts[-1][1]+s.r.uniform(-amp,amp))); return out
    @staticmethod
    def smooth(p):
        d=f"M{p[0][0]:.1f} {p[0][1]:.1f}"
        for i in range(1,len(p)-1):
            mx,my=(p[i][0]+p[i+1][0])/2,(p[i][1]+p[i+1][1])/2; d+=f" Q{p[i][0]:.1f} {p[i][1]:.1f} {mx:.1f} {my:.1f}"
        return d+f" L{p[-1][0]:.1f} {p[-1][1]:.1f}"
    def line(s,pts,w=1.3,o=.9,twice=True,col=INK):
        o_=f'<path d="{s.smooth(s.jit(pts))}" fill="none" stroke="{col}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round" opacity="{o}"/>'
        if twice and w>=.9: o_+=f'<path d="{s.smooth(s.jit(pts,1.5))}" fill="none" stroke="{col}" stroke-width="{w*.45:.2f}" stroke-linecap="round" opacity="{o*.5:.2f}"/>'
        return o_
    def poly(s,pts,w=1.2,close=True): return s.line(pts+([pts[0]] if close else []),w)
    def rect(s,x,y,w,h,lw=1.2): return s.poly([(x,y),(x+w,y),(x+w,y+h),(x,y+h)],lw)
    def curve(s,d,w=1.1,o=.85): return f'<path d="{d}" fill="none" stroke="{INK}" stroke-width="{w}" stroke-linecap="round" opacity="{o}"/>'
    # ---------- color ----------
    def wash(s,d,c,o=.9,dx=None,dy=None):
        dx=s.r.uniform(-1,1.6) if dx is None else dx; dy=s.r.uniform(-.5,1.6) if dy is None else dy
        return f'<path d="{d}" fill="{C.get(c,c)}" opacity="{o}" filter="url(#wash)" transform="translate({dx:.1f} {dy:.1f})"/>'
    def rwash(s,x,y,w,h,c,o=.9): return s.wash(f"M{x:.1f} {y:.1f}h{w:.1f}v{h:.1f}h{-w:.1f}z",c,o)
    def solid(s,x,y,w,h): return f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" fill="{PAPER}"/>'
    def psolid(s,pts): return '<path d="M'+" L".join(f"{a:.1f} {b:.1f}" for a,b in pts)+f'z" fill="{PAPER}"/>'
    def pwash(s,pts,c,o=.9): return s.wash("M"+" L".join(f"{x:.1f} {y:.1f}" for x,y in pts)+"z",c,o)
    def blob(s,cx,cy,r,c,o=.6): return f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r:.1f}" fill="{C.get(c,c)}" opacity="{o}" filter="url(#wash)"/>'
    def hatch(s,x,y,w,h,ang=55,gap=5,lw=.55,o=.4):
        cid=s.uid(); out=f'<clipPath id="{cid}"><rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}"/></clipPath><g clip-path="url(#{cid})">'
        L=w+h; a=math.radians(ang)
        for i in range(int(-L/gap),int(L/gap)+1):
            x0=x+i*gap; out+=s.line([(x0,y+h+2),(x0+math.cos(a)*L,y+h+2-math.sin(a)*L)],lw,o,False)
        return out+"</g>"
    def phatch(s,d,ang=55,gap=5,lw=.55,o=.4,box=(0,0,1200,400)):
        cid=s.uid(); x,y,w,h=box; out=f'<clipPath id="{cid}"><path d="{d}"/></clipPath><g clip-path="url(#{cid})">'
        L=w+h; a=math.radians(ang)
        for i in range(int(-L/gap),int(L/gap)+1):
            x0=x+i*gap; out+=s.line([(x0,y+h+2),(x0+math.cos(a)*L,y+h+2-math.sin(a)*L)],lw,o,False)
        return out+"</g>"
    # ---------- cielo y suelo ----------
    def sun(s,x,y,r=40): return s.blob(x,y,r,"och2",.9)
    def cloud(s,cx,cy,k=1.0):
        d=f"M{cx-60*k:.1f} {cy:.1f}q{10*k:.1f} {-24*k:.1f} {34*k:.1f} {-16*k:.1f}q{14*k:.1f} {-22*k:.1f} {40*k:.1f} {-8*k:.1f}q{26*k:.1f} {-8*k:.1f} {32*k:.1f} {14*k:.1f}q{20*k:.1f} {2*k:.1f} {16*k:.1f} {16*k:.1f}h{-122*k:.1f}z"
        return s.wash(d,"cream",.95,0,0)+s.curve(d,.7,.45)
    def birds(s,x,y,n=4):
        return "".join(f'<path d="M{x+i*24+s.r.uniform(-6,6):.1f} {y+s.r.uniform(-10,10):.1f}q4-4 8 0q4-4 8 0" fill="none" stroke="{INK}" stroke-width="1"/>' for i in range(n))
    def hills(s,y,c,amp=24,W=1200,seed=0,o=.9,H=420):
        pts=[(0,H),(0,y)]; 
        for x in range(0,W+60,60): pts.append((x,y-amp*math.sin(x/170+seed)-amp*.4*math.sin(x/61+seed*2)))
        pts+= [(W,H)]
        d="M"+" L".join(f"{x:.1f} {yy:.1f}" for x,yy in pts)+"z"
        top=[(x,yy) for x,yy in pts[2:-1]]
        return s.wash(d,c,o,0,0)+s.line(top,1.1)
    def skyline(s,y,c="blue2",seed=5,W=1200,hmin=50,hmax=140,o=.7):
        r=random.Random(seed); x=-10; d=""
        while x<W:
            w=r.randint(36,86); h=r.randint(hmin,hmax); d+=f"M{x} {y}V{y-h}h{w}V{y}z "
            if r.random()<.14: d+=f"M{x+w/2-16} {y-h}a16 16 0 0 1 32 0z "
            if r.random()<.1: d+=f"M{x+w/2-3} {y-h}v-36h6v36z "
            x+=w-4
        return s.wash(d,c,o,0,0)
    def ground(s,y,W=1200,H=360,c="sand",street=False):
        out=s.rwash(0,y,W,H-y,c,.95)+s.line([(0,y),(W,y)],1.3)
        if street: out+=s.rwash(0,y+16,W,H-y-16,"gray",.5)+s.line([(0,y+16),(W,y+16)],1)+"".join(s.line([(x,(y+16+H)/2),(x+38,(y+16+H)/2)],2,.6,False) for x in range(20,W,90))
        return out
    # ---------- arquitectura ----------
    def window(s,x,y,w,h,kind="rect",shutter=None,balcony=True,plant=False,laundry=False):
        if kind=="arch":
            pts=[(x,y+h),(x,y+w/2)]+[(x+w/2-math.cos(t)*w/2,y+w/2-math.sin(t)*w/2) for t in [i*math.pi/8 for i in range(9)]]+[(x+w,y+h)]
            o=s.pwash(pts,"glass",.75)+s.line(pts+[(x,y+h)],1)
        else: o=s.rwash(x,y,w,h,"glass",.75)+s.rect(x,y,w,h,1)
        o+=s.line([(x+w/2,y+(w/2 if kind=="arch" else 0)),(x+w/2,y+h)],.6,.6,False)
        if shutter: o+=s.rwash(x-1,y-1,w+2,h*.4,shutter,.95)+"".join(s.line([(x,y+k*4),(x+w,y+k*4)],.45,.55,False) for k in range(1,int(h*.4/4)+1))
        if balcony:
            by=y+h+2; o+=s.line([(x-6,by),(x+w+6,by)],1.5)+s.line([(x-6,by-12),(x+w+6,by-12)],.9)
            o+="".join(s.line([(x-6+k*5,by),(x-6+k*5,by-12)],.55,.75,False) for k in range(int((w+12)/5)+1))
            if plant:
                px=x+w+1; o+=s.pwash([(px-6,by-12),(px+6,by-12),(px+4,by-3),(px-4,by-3)],"terra",.95)+"".join(s.blob(px+s.r.uniform(-9,9),by-17-s.r.uniform(0,10),s.r.uniform(2.5,4.5),"sage",.85) for _ in range(8))
            if laundry:
                o+=s.line([(x-6,by-20),(x+w+6,by-22)],.6,.8,False)
                for k,c in enumerate(["wine","blue","och","cream"]):
                    lx=x-2+k*(w+4)/4; hh=s.r.randint(8,13); o+=s.rwash(lx,by-21,8,hh,c,.9)+s.rect(lx,by-21,8,hh,.5)
        return o
    def building(s,x,base,w,h,col,floors,cols,kind="rect",shutter="och",ground=None,seed=0,lit=(),plants=.25,laundry=.06,cornice=True,awn="wine"):
        o=s.solid(x,base-h,w,h)+s.rwash(x,base-h,w,h,col)+s.hatch(x+w-14,base-h,14,h,62,5,.5,.33)+s.rect(x,base-h,w,h,1.5)
        if cornice: o+=s.rwash(x-6,base-h-9,w+12,9,"cream",.95)+s.rect(x-6,base-h-9,w+12,9,1.1)+"".join(s.line([(x-4+k*8,base-h),(x-4+k*8,base-h+5)],.55,.7,False) for k in range(int((w+8)/8)))
        fh=(h-70)/max(1,floors); cw=w/cols; r=random.Random(seed)
        for f in range(floors):
            for c in range(cols):
                wx=x+c*cw+cw*.27; wy=base-h+22+f*fh
                o+=s.window(wx,wy,cw*.46,fh*.58,kind,C[shutter] if r.random()<.6 else None,True,r.random()<plants,r.random()<laundry)
                if (f,c) in lit: o+=s.rwash(wx+1,wy+fh*.25,cw*.44,fh*.3,"och2",.9)
        gy=base-46; o+=s.line([(x,gy),(x+w,gy)],1)
        if ground=="shop":
            o+=s.rwash(x+8,gy+8,w-16,38,"#4f5a6c",.8)+s.rect(x+8,gy+8,w-16,38,1)
            n=max(4,int((w-10)/16)); aw=(w-10)/n
            for i in range(n):
                ax=x+5+i*aw; o+=s.wash(f"M{ax:.1f} {gy-2}h{aw:.1f}v12q{-aw/2:.1f} 6 {-aw:.1f} 0z",C[awn] if i%2==0 else C["cream"],.95,0,0)
            o+=s.line([(x+5,gy-2),(x+w-5,gy-2)],1.2)
        elif ground!="none":
            dx=x+w/2-11; pts=[(dx,base),(dx,gy+14)]+[(dx+11-math.cos(t)*11,gy+14-math.sin(t)*11) for t in [i*math.pi/6 for i in range(7)]]+[(dx+22,base)]
            o+=s.pwash(pts,"wine",.9)+s.line(pts,1.1)
        return o
    def house(s,x,base,w,h,wall="cream",roof="terra",door="wine",win=True,chimney=False):
        rh=w*.42; o=s.solid(x,base-h,w,h)+s.psolid([(x-6,base-h),(x+w/2,base-h-rh),(x+w+6,base-h)])+s.rwash(x,base-h,w,h,wall,.95)+s.hatch(x+w-10,base-h,10,h,62,4.5,.5,.3)+s.rect(x,base-h,w,h,1.2)
        roof_pts=[(x-6,base-h),(x+w/2,base-h-rh),(x+w+6,base-h)]
        o+=s.pwash(roof_pts,roof,.95)+s.phatch("M"+" L".join(f"{a:.1f} {b:.1f}" for a,b in roof_pts)+"z",20,4,.5,.45,(x-8,base-h-rh,w+16,rh))+s.poly(roof_pts,1.2)
        if chimney: o+=s.rwash(x+w*.7,base-h-rh*.75,8,rh*.5,"cream")+s.rect(x+w*.7,base-h-rh*.75,8,rh*.5,.9)
        dw=max(10,w*.16); o+=s.rwash(x+w*.62,base-h*.5,dw,h*.5,door,.9)+s.rect(x+w*.62,base-h*.5,dw,h*.5,.9)
        if win: o+=s.rwash(x+w*.18,base-h*.7,w*.22,h*.28,"glass",.75)+s.rect(x+w*.18,base-h*.7,w*.22,h*.28,.9)+s.rwash(x+w*.16,base-h*.72,w*.26,4,"och",.9)
        return o
    def church(s,x,base,w=34,h=110,wall="cream",roof="terra"):
        o=s.solid(x,base-h,w,h)+s.rwash(x,base-h,w,h,wall,.95)+s.hatch(x+w-10,base-h,10,h,62,4.5,.5,.3)+s.rect(x,base-h,w,h,1.3)
        tip=[(x-4,base-h),(x+w/2,base-h-w*.9),(x+w+4,base-h)]; o+=s.pwash(tip,roof)+s.poly(tip,1.2)
        o+=s.line([(x+w/2,base-h-w*.9),(x+w/2,base-h-w*.9-16)],1.2)+s.line([(x+w/2-6,base-h-w*.9-10),(x+w/2+6,base-h-w*.9-10)],1.2)
        bx=x+w/2-7; by=base-h+14; pts=[(bx,by+20),(bx,by+7)]+[(bx+7-math.cos(t)*7,by+7-math.sin(t)*7) for t in [i*math.pi/6 for i in range(7)]]+[(bx+14,by+20)]
        o+=s.pwash(pts,INK,.85)+s.line(pts,1)
        return o
    def tree(s,x,base,k=1.0,kind="round"):
        o=s.line([(x,base),(x+2,base-40*k),(x-3,base-70*k)],3*k)+s.line([(x+1,base-45*k),(x+18*k,base-70*k)],1.5*k)+s.line([(x-1,base-55*k),(x-20*k,base-76*k)],1.5*k)
        r=random.Random(int(x*7+base))
        if kind=="cypress":
            d=f"M{x} {base-6}c{-14*k:.1f} {-30*k:.1f} {-12*k:.1f} {-80*k:.1f} 0 {-110*k:.1f}c{12*k:.1f} {30*k:.1f} {14*k:.1f} {80*k:.1f} 0 {110*k:.1f}z"
            return s.wash(d,"sage3",.9,0,0)+s.curve(d,.9,.8)+"".join(s.curve(f"M{x-6*k+r.uniform(-2,2):.1f} {base-20*k-i*14*k:.1f}q{6*k:.1f} -5 {12*k:.1f} 0",.6,.5) for i in range(6))
        for _ in range(55):
            a=r.uniform(0,2*math.pi); rr=r.uniform(0,36*k); cx=x+math.cos(a)*rr*1.2; cy=base-84*k+math.sin(a)*rr*.8
            o+=s.blob(cx,cy,r.uniform(6,12)*k,r.choice(["sage","sage2","sage3"]),.5)
        for _ in range(22):
            a=r.uniform(0,2*math.pi); rr=r.uniform(14,38*k); cx=x+math.cos(a)*rr*1.2; cy=base-84*k+math.sin(a)*rr*.8
            o+=s.curve(f"M{cx:.1f} {cy:.1f}c3-4 7-4 9 0",.7,.55)
        return o
    def lamp(s,x,base,h=110):
        return s.line([(x,base),(x,base-h)],2.1)+s.line([(x,base-h),(x+16,base-h-8)],1.3)+s.pwash([(x+10,base-h-8),(x+24,base-h-8),(x+21,base-h+2),(x+13,base-h+2)],"och",.95)+s.poly([(x+10,base-h-8),(x+24,base-h-8),(x+21,base-h+2),(x+13,base-h+2)],1)
    # ---------- objetos ----------
    def coin_stack(s,x,base,n,rx=26,c="och",step=8):
        o=""; ry=rx*.32
        for i in range(n):
            y=base-i*step
            o+=s.wash(f"M{x-rx} {y}a{rx} {ry} 0 0 0 {2*rx} 0v{-step}a{rx} {ry} 0 0 0 {-2*rx} 0z",c,.95,0,0)
            o+=s.curve(f"M{x-rx} {y}a{rx} {ry} 0 0 0 {2*rx} 0",.9,.8)
        top=base-n*step
        o+=s.wash(f"M{x-rx} {top}a{rx} {ry} 0 1 0 {2*rx} 0a{rx} {ry} 0 1 0 {-2*rx} 0z","och2",.95,0,0)+s.curve(f"M{x-rx} {top}a{rx} {ry} 0 1 0 {2*rx} 0a{rx} {ry} 0 1 0 {-2*rx} 0z",1.1,.9)
        o+=s.line([(x-rx,base),(x-rx,top)],1.1)+s.line([(x+rx,base),(x+rx,top)],1.1)
        o+=s.hatch(x+rx*.45,top,rx*.55,base-top,70,4,.45,.35)
        return o
    def suitcase(s,x,base,w,h,c):
        o=s.rwash(x,base-h,w,h,c,.95)+s.rect(x,base-h,w,h,1.1)+s.line([(x+w*.3,base-h),(x+w*.3,base-h-9),(x+w*.7,base-h-9),(x+w*.7,base-h)],1.2,.9,False)
        o+=s.line([(x+w*.25,base-h+3),(x+w*.25,base-3)],.6,.7,False)+s.line([(x+w*.75,base-h+3),(x+w*.75,base-3)],.6,.7,False)
        return o+f'<circle cx="{x+5}" cy="{base+3}" r="3.2" fill="{INK}"/><circle cx="{x+w-5}" cy="{base+3}" r="3.2" fill="{INK}"/>'
    def car(s,x,base,c="wine",k=1.0):
        body=[(x,base-8*k),(x+8*k,base-20*k),(x+22*k,base-30*k),(x+52*k,base-30*k),(x+66*k,base-20*k),(x+80*k,base-18*k),(x+80*k,base-6*k),(x,base-6*k)]
        o=s.pwash(body,c,.95)+s.poly(body,1.2)+s.pwash([(x+24*k,base-27*k),(x+38*k,base-27*k),(x+38*k,base-19*k),(x+15*k,base-19*k)],"blue2",.9)+s.pwash([(x+42*k,base-27*k),(x+52*k,base-27*k),(x+61*k,base-19*k),(x+42*k,base-19*k)],"blue2",.9)
        return o+f'<circle cx="{x+18*k:.1f}" cy="{base-5*k:.1f}" r="{7*k:.1f}" fill="{INK}"/><circle cx="{x+62*k:.1f}" cy="{base-5*k:.1f}" r="{7*k:.1f}" fill="{INK}"/>'
    def person(s,x,base,c="wine",k=1.0,hair=INK,bag=None,cane=False,sit=False,face=1,trousers="#4a4440"):
        """Figura esbelta (unas 7 cabezas), de tres cuartos. sit=True: sentada mirando hacia face (1 derecha, -1 izquierda)."""
        f=face; o=""; H=86*k; hr=5.2*k
        if sit:
            hip=base-24*k; sh=hip-30*k
            o+=s.pwash([(x-1*k,hip),(x+20*f*k,hip-2*k),(x+20*f*k,hip+5*k),(x-1*k,hip+6*k)],trousers,.95)  # muslos
            o+=s.pwash([(x+16*f*k,hip),(x+21*f*k,hip),(x+20*f*k,base),(x+15*f*k,base)],trousers,.95)  # piernas
            o+=s.line([(x+14*f*k,base),(x+24*f*k,base)],2.2*k,.9,False)
        else:
            hip=base-36*k; sh=hip-28*k
            o+=s.pwash([(x-5*k,hip),(x-.5*k,hip),(x-1.5*k,base-1),(x-5*k,base-1)],trousers,.95)+s.pwash([(x+.5*k,hip),(x+5*k,hip),(x+5.5*k,base-1),(x+1.5*k,base-1)],trousers,.95)
            o+=s.line([(x-6*k,base),(x+(-1 if f>0 else -3)*k,base)],2*k,.9,False)+s.line([(x+1*k,base),(x+(7 if f>0 else 4)*k,base)],2*k,.9,False)
        coat=[(x-7*k,hip+(4*k if not sit else 0)),(x-6.5*k,sh+3*k),(x-3*k,sh),(x+3*k,sh),(x+6.5*k,sh+3*k),(x+7.5*k,hip+(4*k if not sit else 0))]
        o+=s.pwash(coat,c,.95)+s.poly(coat,.9)
        # brazos
        if sit: o+=s.line([(x+5*f*k,sh+4*k),(x+11*f*k,hip-6*k),(x+17*f*k,hip-4*k)],1.6*k,.9,False)
        else: o+=s.line([(x-6*k,sh+4*k),(x-8*k,hip+2*k)],1.6*k,.85,False)+s.line([(x+6*k,sh+4*k),(x+8.5*k,hip+2*k)],1.6*k,.85,False)
        hy=sh-hr-2*k
        o+=s.line([(x,sh),(x,sh-2.5*k)],1.6*k,.9,False)
        o+=f'<ellipse cx="{x+.8*f*k:.1f}" cy="{hy:.1f}" rx="{hr*.92:.1f}" ry="{hr:.1f}" fill="#e3c4a8" stroke="{INK}" stroke-width=".8"/>'
        o+=f'<path d="M{x-hr+.8*f*k:.1f} {hy:.1f}q{.2*k:.1f} {-hr*1.15:.1f} {hr:.1f} {-hr*1.05:.1f}q{hr*1.1:.1f} {.2*k:.1f} {hr*.95:.1f} {hr*.6:.1f}q{-hr*.7:.1f} {-hr*.35:.1f} {-hr*1.95:.1f} {hr*.45:.1f}z" fill="{hair}"/>'
        if bag: o+=s.rwash(x+(8 if f>0 else -18)*k,hip-6*k,10*k,12*k,bag,.95)+s.rect(x+(8 if f>0 else -18)*k,hip-6*k,10*k,12*k,.8)
        if cane: o+=s.line([(x+(18 if sit else 9)*f*k,(hip-4*k) if sit else hip),(x+(22 if sit else 12)*f*k,base)],1.4,.9,False)
        return o
    def sign(s,x,y,w,h,txt,col="wine",size=12,post=True,base=None):
        o=""
        if post and base: o+=s.line([(x+w/2,y+h),(x+w/2,base)],2)
        o+=s.rwash(x,y,w,h,"cream",1)+s.rect(x,y,w,h,1.1)
        o+=f'<text x="{x+w/2:.1f}" y="{y+h/2+size*.36:.1f}" text-anchor="middle" font-family="Georgia,serif" font-style="italic" font-size="{size}" fill="{C.get(col,col)}">{txt}</text>'
        return o
    def arrow(s,pts,c="wine",w=3):
        o=s.line(pts,w,.95,col=C[c])
        (x1,y1),(x2,y2)=pts[-2],pts[-1]; a=math.atan2(y2-y1,x2-x1)
        tip=[(x2+math.cos(a)*10,y2+math.sin(a)*10),(x2+math.cos(a+2.5)*12,y2+math.sin(a+2.5)*12),(x2+math.cos(a-2.5)*12,y2+math.sin(a-2.5)*12)]
        return o+s.pwash(tip,c,1)
    def paper(s,x,y,w,h,rot=0,lines=5,check=False,col="cream"):
        o=s.solid(x,y,w,h)+s.rwash(x,y,w,h,col,1)+s.rect(x,y,w,h,1)+"".join(s.line([(x+w*.15,y+h*(.2+i*.13)),(x+w*(.85 if i%3 else .6),y+h*(.2+i*.13))],.8,.7,False) for i in range(lines))
        if check: o+=s.line([(x+w*.3,y+h*.7),(x+w*.45,y+h*.82),(x+w*.75,y+h*.55)],2.4,1,col=C["wine"])
        return f'<g transform="rotate({rot} {x+w/2:.1f} {y+h/2:.1f})">{o}</g>'

DEFS='''<defs><filter id="wash" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="3" seed="3" result="t"/><feDisplacementMap in="SourceGraphic" in2="t" scale="6" result="d"/><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="8" result="g"/><feColorMatrix in="g" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -.8 1.2" result="ga"/><feComposite in="d" in2="ga" operator="in"/></filter>
<filter id="paper"><feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="3" seed="2"/><feColorMatrix type="matrix" values="0 0 0 0 .3 0 0 0 0 .25 0 0 0 0 .2 0 0 0 .07 0"/></filter></defs>'''
def svg(body,W=1200,H=360,label=""):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-label="{label}">{DEFS}<rect width="{W}" height="{H}" fill="{PAPER}"/>{body}<rect width="{W}" height="{H}" filter="url(#paper)" opacity=".6"/></svg>'
