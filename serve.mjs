// Servidor local de dist/ que imita a Netlify (index.html por carpeta, _redirects, 404.html).
// Uso: npm run build && npm run serve  →  http://localhost:8787
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
const DIST=path.join(path.dirname(fileURLToPath(import.meta.url)),"dist");
const PORT=+(process.env.PORT||8787);
const MIME={".html":"text/html; charset=utf-8",".js":"text/javascript",".css":"text/css",".json":"application/json",".svg":"image/svg+xml",".png":"image/png",".xml":"application/xml",".txt":"text/plain",".webmanifest":"application/manifest+json"};
const rules=fs.existsSync(path.join(DIST,"_redirects"))?fs.readFileSync(path.join(DIST,"_redirects"),"utf8").split("\n").map(l=>l.trim().split(/\s+/)).filter(r=>r.length>=2&&r[0].startsWith("/")):[];
const send=(res,file,code=200)=>{ res.writeHead(code,{"content-type":MIME[path.extname(file)]||"application/octet-stream"}); fs.createReadStream(file).pipe(res); };
http.createServer((req,res)=>{
  let p=decodeURIComponent(new URL(req.url,"http://x").pathname);
  const tryFile=f=>{ if(fs.existsSync(f)&&fs.statSync(f).isFile()){ send(res,f); return true; } return false; };
  const full=path.join(DIST,p);
  if(tryFile(full)) return;
  if(fs.existsSync(full)&&fs.statSync(full).isDirectory()){ if(!p.endsWith("/")){ res.writeHead(301,{location:p+"/"}); res.end(); return; } if(tryFile(path.join(full,"index.html"))) return; }
  for(const [from,to,code] of rules){ const re=new RegExp("^"+from.replace(/\*/g,"(.*)")+"$"); if(re.test(p)){ if(tryFile(path.join(DIST,to))) return; } }
  send(res,path.join(DIST,"404.html"),404);
}).listen(PORT,()=>console.log("Indicio en http://localhost:"+PORT));
