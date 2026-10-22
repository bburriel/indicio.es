// Abre rutas en un navegador sin cabeza y vuelca su texto y errores:
//   CHROMIUM=<ruta> node tools/lab.mjs "/laboratorio/antes/?ev=ave&oy=pad" …
import {chromium} from "playwright";
const browser=await chromium.launch({executablePath:process.env.CHROMIUM}); const ctx=await browser.newContext({viewport:{width:1280,height:900}});
for(const u of process.argv.slice(2)){
  const page=await ctx.newPage(), errs=[]; page.on("pageerror",e=>errs.push("PAGEERROR "+e.message));
  const t0=Date.now(); await page.goto("http://localhost:8787"+u,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>!document.querySelector("#view .loading")&&!/Calculando/.test(document.querySelector("#view").innerText),{timeout:120000}).catch(()=>errs.push("TIMEOUT"));
  await page.waitForTimeout(800);
  const txt=await page.evaluate(()=>document.getElementById("view").innerText);
  console.log("=====",u,((Date.now()-t0)/1000).toFixed(1)+"s =====\n"+txt.replace(/\n{2,}/g,"\n").slice(0,+process.env.N||6000)); if(errs.length) console.log("ERRORS:",errs.join("\n"));
  await page.screenshot({path:(process.env.SHOTS||"/tmp")+"/lab-"+u.replace(/[^\w]+/g,"_").slice(0,60)+".png",fullPage:true}); await page.close(); }
await browser.close();
