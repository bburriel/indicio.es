# Ilustraciones de Indicio: escenas sencillas sobre una mancha orgánica, formas planas sin contorno,
# bordes algo irregulares y grano fino de papel. Paleta suave sacada de la propia web.
#   python3 illus/gen.py illus
import sys, os
OUT=sys.argv[1] if len(sys.argv)>1 else os.path.dirname(os.path.abspath(__file__))
P=dict(paper="#f2eee6", sage="#c5d6bf", sage2="#9fbb98", sage3="#7e9f78", sand="#ecdcc3", sand2="#dcc39d",
       rose="#e8c4c0", rose2="#cf9a98", wine="#9b4a55", wine2="#7d3843", blue="#c9d3e3", blue2="#9fb0cb", blue3="#7489aa",
       ochre="#e3c27f", ochre2="#cfa456", cream="#fbf7f0", ink="#56504a")
DEFS=f'''<defs>
<filter id="soft" x="-3%" y="-3%" width="106%" height="106%" color-interpolation-filters="sRGB">
<feTurbulence type="fractalNoise" baseFrequency=".04" numOctaves="2" seed="7" result="w"/>
<feDisplacementMap in="SourceGraphic" in2="w" scale="2" xChannelSelector="R" yChannelSelector="G" result="d"/>
<feTurbulence type="fractalNoise" baseFrequency="1.7" numOctaves="2" seed="3" stitchTiles="stitch" result="n"/>
<feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -3.4 1.8" result="dots"/>
<feComposite in="dots" in2="d" operator="in" result="dk"/>
<feFlood flood-color="#4a3a30" flood-opacity=".17"/><feComposite in2="dk" operator="in" result="grain"/>
<feMerge><feMergeNode in="d"/><feMergeNode in="grain"/></feMerge>
</filter>
<linearGradient id="gs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{P['sage']}"/><stop offset="1" stop-color="{P['sage2']}"/></linearGradient>
<linearGradient id="gb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{P['blue']}"/><stop offset="1" stop-color="{P['blue2']}"/></linearGradient>
<linearGradient id="gn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{P['sand']}"/><stop offset="1" stop-color="{P['sand2']}"/></linearGradient>
<linearGradient id="gr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{P['rose']}"/><stop offset="1" stop-color="{P['rose2']}"/></linearGradient>
<linearGradient id="gw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{P['wine']}"/><stop offset="1" stop-color="{P['wine2']}"/></linearGradient>
<linearGradient id="go" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{P['ochre']}"/><stop offset="1" stop-color="{P['ochre2']}"/></linearGradient>
</defs>'''
BLOB={"a":"M44 150c-22-30 -6-78 40-96 38-15 70 2 106-6 44-10 92 4 102 46 9 40-16 74-62 82-40 7-74-2-108 4-36 6-62-2-78-30z",
      "b":"M36 120c-6-44 34-78 84-80 34-1 56 14 92 8 40-6 76 16 76 52 0 42-38 62-84 64-36 2-60-8-96-4-40 4-68-8-72-40z",
      "c":"M60 160c-34-14 -40-60-10-90 26-26 60-24 92-34 40-12 92-8 112 26 22 38 6 82-38 98-34 12-64 6-96 8-26 2-44 0-60-8z"}
def blob(k,fill): return f'<path d="{BLOB[k]}" fill="{fill}"/>'
def shadow(cx,cy,rx,ry=5): return f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="{P["ink"]}" opacity=".12"/>'
def house(x,y,w,h,wall,roof,win=None):
    win=win or P['sand2']
    return (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="1.5" fill="{wall}"/><path d="M{x-3} {y+1}L{x+w/2} {y-w*0.55:.1f}L{x+w+3} {y+1}z" fill="{roof}"/>'
            f'<rect x="{x+w*0.22:.1f}" y="{y+h*0.35:.1f}" width="{w*0.2:.1f}" height="{h*0.3:.1f}" rx=".8" fill="{win}"/><rect x="{x+w*0.56:.1f}" y="{y+h*0.5:.1f}" width="{w*0.22:.1f}" height="{h*0.5:.1f}" rx=".8" fill="{roof}"/>')
def coin(x,y,r=6): return f'<circle cx="{x}" cy="{y}" r="{r}" fill="url(#go)"/><circle cx="{x-r*0.25:.1f}" cy="{y-r*0.25:.1f}" r="{r*0.35:.1f}" fill="{P["cream"]}" opacity=".5"/>'
def leaf(x,y,rot,s=1,c=None): return f'<path transform="translate({x} {y}) rotate({rot}) scale({s})" d="M0 0c6-8 16-8 20 0-6 8-16 8-20 0z" fill="{c or P["sage3"]}"/>'
def svg(name,label,body):
    open(os.path.join(OUT,name+".svg"),"w").write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" role="img" aria-label="{label}">{DEFS}<g filter="url(#soft)"><rect x="-10" y="-10" width="340" height="220" fill="{P["paper"]}"/>{body}</g></svg>\n')
C,W=P['cream'],P['wine']

# Riqueza: tres montones de monedas que crecen; del más alto brota una planta
svg("riqueza","Tres montones de monedas de distinta altura; del más alto brota una planta",
 blob("a","url(#gn)")+shadow(160,150,92)
 +''.join(f'<rect x="{x-17}" y="{150-n*9}" width="34" height="{n*9}" rx="3" fill="url(#go)"/>'+''.join(f'<rect x="{x-17}" y="{150-i*9-1.4:.1f}" width="34" height="1.4" fill="{P["ochre2"]}" opacity=".7"/>' for i in range(1,n))+f'<ellipse cx="{x}" cy="{150-n*9}" rx="17" ry="4" fill="{P["ochre"]}"/>' for x,n in [(112,2),(160,5),(208,9)])
 +f'<path d="M208 69c0-10 2-18 0-26" stroke="{P["sage3"]}" stroke-width="2.4" fill="none" stroke-linecap="round"/>'+leaf(208,56,-150,1)+leaf(208,48,-30,.9)+leaf(208,40,-160,.7)
 +coin(70,70,7)+coin(250,98,5)+coin(92,96,4))

# Vivienda: un bloque de pisos con cartel de «se alquila», una casita y una llave apoyada
svg("vivienda","Un bloque de pisos con cartel de se alquila, una casa pequeña y una llave",
 blob("b","url(#gs)")+shadow(160,156,96)
 +f'<rect x="120" y="44" width="62" height="112" rx="3" fill="url(#gw)"/>'+''.join(f'<rect x="{x}" y="{y}" width="11" height="12" rx="1.2" fill="{P["ochre"] if (x,y) in [(146,82),(130,118)] else C}"/>' for x in (130,146,162) for y in (56,82,100,118) if not (x==146 and y==118))
 +f'<rect x="144" y="132" width="15" height="24" rx="1.5" fill="{C}"/><path d="M130 100v-6M170 100v-6" stroke="{P["ink"]}" stroke-width="1.2" opacity=".6"/>'
 +f'<rect x="120" y="97" width="0" height="0"/><g transform="translate(186 92) rotate(4)"><path d="M10 0v8M30 0v8" stroke="{P["ink"]}" stroke-width="1.2" opacity=".6"/><rect y="8" width="40" height="18" rx="2" fill="{C}"/><path d="M6 14h28M6 20h17" stroke="{W}" stroke-width="2.2" stroke-linecap="round"/></g>'
 +house(64,118,34,38,P['rose'],P['rose2'],C)+house(212,128,30,28,C,P['blue2'])
 +f'<g transform="translate(244 108) rotate(58)"><circle r="10" fill="url(#go)"/><circle r="4" fill="{P["sage2"]}"/><path d="M9 -3h30v6H9zM28 3h5v7h-5zM35 3h3v5h-3z" fill="url(#go)"/></g>')

# Población: un camino que sale de una casa con maleta y llega a unos edificios
svg("poblacion","Un camino que va de una casa de pueblo a unos edificios, con una maleta en medio",
 blob("c","url(#gs)")+shadow(160,158,96)
 +f'<path d="M86 150c30-4 40-20 76-22 30-2 44-12 74-24" stroke="{P["sand"]}" stroke-width="14" fill="none" stroke-linecap="round"/><path d="M98 148l6-1M140 132l7-1M182 124l7-2M214 112l6-3" stroke="{C}" stroke-width="2" stroke-linecap="round"/>'
 +house(56,124,30,28,C,P['rose2'])+leaf(48,150,-80,.9)+leaf(94,152,-100,.8)
 +f'<g fill="url(#gb)"><rect x="222" y="62" width="18" height="48" rx="2"/><rect x="242" y="46" width="20" height="64" rx="2"/><rect x="264" y="72" width="16" height="38" rx="2"/></g>'+''.join(f'<rect x="{x}" y="{y}" width="4" height="5" fill="{C}" opacity=".85"/>' for x,y in [(227,72),(233,72),(227,84),(247,56),(254,56),(247,68),(254,80),(247,92),(268,82),(273,94)])
 +f'<g transform="translate(150 106)"><rect y="6" width="30" height="22" rx="3" fill="url(#gw)"/><path d="M10 6V1h10v5" stroke="{P["wine2"]}" stroke-width="2.4" fill="none"/><rect x="0" y="15" width="30" height="2" fill="{P["wine2"]}"/><rect x="12" y="12" width="6" height="8" rx="1" fill="{P["ochre"]}"/></g>')

# Trabajo: una mesa con un portátil, una taza humeante, un casco y una planta
svg("trabajo","Una mesa con un portátil, una taza, un casco de obra y una planta",
 blob("a","url(#gb)")+f'<rect x="54" y="140" width="212" height="9" rx="3" fill="url(#gn)"/><rect x="72" y="149" width="6" height="22" fill="{P["sand2"]}"/><rect x="242" y="149" width="6" height="22" fill="{P["sand2"]}"/>'
 +f'<rect x="128" y="84" width="74" height="50" rx="3" fill="{C}"/><rect x="134" y="90" width="62" height="38" rx="2" fill="url(#gs)"/><path d="M140 120l12-10 10 5 14-14 14 6" stroke="{W}" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M118 134h94l-6 6h-82z" fill="{C}"/>'
 +f'<path d="M66 140c0-24 12-36 28-36s28 12 28 36z" fill="url(#go)"/><rect x="60" y="136" width="68" height="5" rx="2" fill="{P["ochre2"]}"/><rect x="92" y="104" width="4" height="14" rx="2" fill="{P["ochre2"]}"/>'
 +f'<rect x="214" y="114" width="22" height="26" rx="3" fill="url(#gw)"/><path d="M236 120h4a6 6 0 0 1 0 12h-4" stroke="{P["wine2"]}" stroke-width="3" fill="none"/><path d="M220 106c-3-5 3-7 0-12M230 106c-3-5 3-7 0-12" stroke="{C}" stroke-width="2" fill="none" stroke-linecap="round" opacity=".9"/>'
 +f'<path d="M246 140h16l-2-14h-12z" fill="{P["rose2"]}"/><path d="M254 126v-12" stroke="{P["sage3"]}" stroke-width="2" stroke-linecap="round"/>'+leaf(254,118,-150,.8)+leaf(254,112,-30,.8))

# Dinero público: un edificio con columnas del que salen monedas hacia sanidad, educación y pensiones
svg("gasto","Un edificio público con columnas del que salen monedas hacia sanidad, educación y pensiones",
 blob("b","url(#gr)")+shadow(110,156,66)
 +f'<path d="M54 70L110 40l56 30z" fill="{C}"/><rect x="54" y="70" width="112" height="7" fill="{P["sand2"]}"/>'+''.join(f'<rect x="{x}" y="77" width="11" height="66" rx="1" fill="{C}"/>' for x in (62,84,125,147))+f'<rect x="102" y="96" width="16" height="47" rx="1.5" fill="url(#gw)"/><rect x="48" y="143" width="124" height="11" rx="2" fill="{P["sand2"]}"/><circle cx="110" cy="58" r="5" fill="url(#go)"/>'
 +f'<path d="M176 92c22-14 40-18 62-18M176 112h62M176 132c22 12 40 18 62 18" stroke="{P["wine"]}" stroke-width="1.8" fill="none" stroke-dasharray="3 6" stroke-linecap="round" opacity=".55"/>'
 +coin(196,84,5)+coin(210,112,5)+coin(200,140,5)
 +f'<circle cx="258" cy="72" r="17" fill="{C}"/><path d="M258 63v18M249 72h18" stroke="{W}" stroke-width="5" stroke-linecap="round"/>'
 +f'<circle cx="258" cy="112" r="17" fill="{C}"/><path d="M247 105l11 4 11-4v13l-11 4-11-4z" fill="{P["sage2"]}"/><path d="M258 109v13" stroke="{C}" stroke-width="1.4"/>'
 +f'<circle cx="258" cy="152" r="17" fill="{C}"/><circle cx="255" cy="142" r="3.4" fill="{P["blue3"]}"/><path d="M255 147v10l-4 7M255 157l4 7M255 150l6 3M263 151v13" stroke="{P["blue3"]}" stroke-width="2.4" fill="none" stroke-linecap="round"/>')

# Voto: una urna con una papeleta entrando y otras dos esperando
svg("voto","Una urna con una papeleta entrando y otras dos al lado",
 blob("c","url(#gn)")+shadow(160,160,80)
 +f'<rect x="112" y="92" width="96" height="66" rx="4" fill="{C}"/><rect x="112" y="92" width="96" height="16" rx="4" fill="url(#gw)"/><rect x="138" y="98" width="44" height="4" rx="2" fill="{P["wine2"]}"/><path d="M130 132h60" stroke="{P["sand"]}" stroke-width="9" stroke-linecap="round"/>'
 +f'<g transform="translate(146 46) rotate(-6)"><rect width="30" height="44" rx="2" fill="#fff"/><path d="M6 10h18M6 17h12" stroke="{P["rose2"]}" stroke-width="2.4" stroke-linecap="round"/><path d="M8 30l5 5 9-10" stroke="{W}" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>'
 +f'<g transform="translate(70 118) rotate(-14)"><rect width="26" height="36" rx="2" fill="{C}"/><path d="M5 9h16M5 15h10" stroke="{P["blue2"]}" stroke-width="2.2" stroke-linecap="round"/></g>'
 +f'<g transform="translate(224 112) rotate(12)"><rect width="26" height="36" rx="2" fill="{C}"/><path d="M5 9h16M5 15h10" stroke="{P["sage3"]}" stroke-width="2.2" stroke-linecap="round"/></g>')

# Laboratorio: una lupa sobre una nube de puntos con su tendencia, y un matraz
svg("laboratorio","Una lupa que mira una nube de puntos que sigue una línea, junto a un matraz",
 blob("a","url(#gb)")
 +''.join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{P["wine"] if i%3==0 else C}" opacity="{.8 if i%3==0 else .95}"/>' for i,(x,y,r) in enumerate([(70,146,3),(84,138,4),(96,142,2.6),(106,126,4.4),(120,130,3),(130,116,2.6),(142,112,4),(152,120,3),(166,100,4.4),(176,106,2.6),(190,90,3.4),(200,96,4),(214,80,2.6),(226,84,4),(238,70,3),(92,122,2.4),(150,134,2.4),(206,108,2.6)]))
 +f'<path d="M60 154L248 62" stroke="{P["ink"]}" stroke-width="1.6" stroke-dasharray="5 5" stroke-linecap="round" opacity=".45"/>'
 +f'<circle cx="160" cy="104" r="30" fill="{C}" opacity=".35"/><circle cx="160" cy="104" r="30" fill="none" stroke="url(#gw)" stroke-width="7"/><path d="M182 126l30 30" stroke="url(#gw)" stroke-width="11" stroke-linecap="round"/>'
 +f'<path d="M254 112v22l-12 28c-2 5 1 9 6 9h30c5 0 8-4 6-9l-12-28v-22z" fill="{C}" opacity=".9"/><path d="M247 148h32l5 12c1 4-1 8-5 8h-32c-4 0-6-4-5-8z" fill="url(#gs)"/><rect x="250" y="108" width="26" height="5" rx="2" fill="{C}"/><circle cx="258" cy="156" r="3" fill="{C}"/><circle cx="268" cy="162" r="2" fill="{C}"/>')

# Municipio: una chincheta clavada sobre un pueblo
svg("municipio","Una chincheta clavada sobre un pueblo con su campanario",
 blob("b","url(#gs)")+shadow(150,154,90)
 +house(82,122,26,32,C,P['rose2'])+house(112,116,30,38,P['sand'],P['wine'],C)
 +f'<rect x="146" y="84" width="16" height="70" rx="1.5" fill="{C}"/><path d="M143 86L154 62l11 24z" fill="url(#gw)"/><circle cx="154" cy="100" r="4" fill="url(#go)"/>'
 +house(166,124,28,30,P['rose'],P['blue2'],C)+house(198,132,22,22,C,P['rose2'])+leaf(70,150,-80,.9)+leaf(228,152,-100,.9)
 +f'<g transform="translate(196 22)">{shadow(28,116,9,2.5)}<path d="M28 0c16 0 28 12 28 28 0 22-28 50-28 50S0 50 0 28C0 12 12 0 28 0z" fill="url(#gw)"/><circle cx="28" cy="27" r="10" fill="{C}"/><path d="M28 78v36" stroke="{P["ink"]}" stroke-width="2" opacity=".5"/></g>')
