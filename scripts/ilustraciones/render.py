"""Genera las ilustraciones: escribe los SVG y los convierte a JPG con un navegador sin cabeza.
   python3 scripts/ilustraciones/render.py [ids…]   →  art/il/<id>.jpg  (los SVG intermedios quedan en scripts/ilustraciones/svg/, sin versionar)
Necesita Playwright para Python (pip install playwright; usa CHROMIUM=<ruta> si el navegador no está en la ruta por defecto)."""
import os, sys, asyncio
sys.path.insert(0,os.path.dirname(__file__))
from pluma import Pen, svg
import escenas, temas
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),"..",".."))
OUT=os.path.join(ROOT,"art","il"); SVG=os.path.join(os.path.dirname(os.path.abspath(__file__)),"svg"); os.makedirs(OUT,exist_ok=True); os.makedirs(SVG,exist_ok=True)
def build(ids=None):
    jobs=[]
    for id,fn in escenas.ESC.items():
        if ids and id not in ids: continue
        p=Pen(sum(map(ord,id))); open(f"{SVG}/{id}.svg","w").write(svg(fn(p),1200,360,escenas.LABEL[id])); jobs.append((id,1200,360))
    for id,fn in temas.TEM.items():
        if ids and "t-"+id not in ids and id not in ids: continue
        p=Pen(sum(map(ord,id))+7); open(f"{SVG}/t-{id}.svg","w").write(svg(fn(p),640,400,temas.LABEL[id])); jobs.append(("t-"+id,640,400))
    return jobs
async def shoot(jobs):
    from playwright.async_api import async_playwright
    async with async_playwright() as pw:
        b=await pw.chromium.launch(**({"executable_path":os.environ["CHROMIUM"]} if os.environ.get("CHROMIUM") else {}))
        for id,W,H in jobs:
            pg=await b.new_page(viewport={"width":W,"height":H},device_scale_factor=1.5)
            await pg.goto("file://"+f"{SVG}/{id}.svg"); await pg.wait_for_timeout(300)
            await pg.screenshot(path=f"{OUT}/{id}.jpg",type="jpeg",quality=80); await pg.close()
            print(id, os.path.getsize(f"{OUT}/{id}.jpg")//1024,"KB")
        await b.close()
def module():
    """src/illus-pluma.mjs: etiquetas y punto de recorte de cada ilustración, para que el build las use."""
    import json
    banners={id:{"l":escenas.LABEL[id],"f":round(max(0,min(100,(escenas.FOCUS[id]-320)/(1200-640)*100)))} for id in escenas.ESC}
    tem={id:{"l":temas.LABEL[id]} for id in temas.TEM}
    open(os.path.join(ROOT,"src","illus-pluma.mjs"),"w").write("// Lo genera scripts/ilustraciones/render.py: no editar a mano.\nexport const PLUMA="+json.dumps(banners,ensure_ascii=False)+";\nexport const PLUMA_T="+json.dumps(tem,ensure_ascii=False)+";\n")
if __name__=="__main__":
    asyncio.run(shoot(build(set(sys.argv[1:]) or None))); module()
