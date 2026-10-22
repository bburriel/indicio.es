import {chromium} from "playwright";
const ids=process.argv.slice(2);
const browser=await chromium.launch({executablePath:process.env.CHROMIUM}); const ctx=await browser.newContext({viewport:{width:1280,height:900}});
for(const id of ids){
  const page=await ctx.newPage(); const errs=[];
  page.on("pageerror",e=>errs.push("PAGEERROR "+e.message)); page.on("console",m=>{ if(m.type()==="error") errs.push("CONSOLE "+m.text()); });
  const url="http://localhost:8787/"+(id==="metodo"?"laboratorio/metodo/":"preguntas/"+id+"/")+"?live=1";
  await page.goto(url,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>!document.querySelector("#view .loading"),{timeout:60000}).catch(()=>errs.push("TIMEOUT loading"));
  await page.waitForTimeout(1500);
  const txt=await page.evaluate(()=>{ const v=document.getElementById("view"); return v?v.innerText:"(no view)"; });
  console.log("=====",id,"=====\n"+txt.replace(/\n{2,}/g,"\n").slice(0,12000)); if(errs.length) console.log("ERRORS:",errs.join("\n"));
  await page.screenshot({path:"/tmp/claude-0/-home-claude/95cf0d4f-7a3c-5f7b-bac6-a6b9217f2b22/scratchpad/shot-"+id+".png",fullPage:true});
  await page.close();
}
await browser.close();
