import {chromium} from "playwright";
const browser=await chromium.launch({executablePath:process.env.CHROMIUM}); const page=await browser.newPage({viewport:{width:1280,height:900}});
for(const id of process.argv.slice(2)){ const t0=Date.now(); await page.goto("http://localhost:8787/preguntas/"+id+"/?live=1",{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>!document.querySelector("#view .loading")&&document.querySelector("details.ficha"),{timeout:180000}).catch(()=>console.log("timeout",id));
  console.log(id, ((Date.now()-t0)/1000).toFixed(1)+"s"); }
await browser.close();
