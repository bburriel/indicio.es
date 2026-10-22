// Guarda la web y los datos para abrirla sin conexión
const V="indicio-1792652297";
const CORE=["./","./index.html","./manifest.webmanifest","./favicon.svg","./icon-192.png","./data/index.json","./data/refs.json","./data/vote_refs.json","./data/indicadores.json"];
self.addEventListener("install",e=>{ e.waitUntil(caches.open(V).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())); });
self.addEventListener("activate",e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener("fetch",e=>{ const r=e.request; if(r.method!=="GET") return; const u=new URL(r.url);
  if(r.mode==="navigate"){ e.respondWith(fetch(r).then(res=>{ const c=res.clone(); caches.open(V).then(x=>x.put("./index.html",c)); return res; }).catch(()=>caches.match("./index.html"))); return; }
  e.respondWith(caches.match(r).then(hit=>{ const net=fetch(r).then(res=>{ if(res.ok&&(u.origin===location.origin||/cdnjs|jsdelivr|gstatic|googleapis/.test(u.host))){ const c=res.clone(); caches.open(V).then(x=>x.put(r,c)); } return res; }).catch(()=>hit); return hit||net; }));
});
