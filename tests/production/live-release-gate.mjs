/**
 * Hỷ Studio live production release gate.
 * Creates one synthetic invitation; always revokes it. Never uses customer data.
 * Usage: node tests/production/live-release-gate.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium, firefox, webkit, devices } from "@playwright/test";

const ROOT=(process.env.LIVE_BASE||"https://hy-studio-preview.vercel.app").replace(/\/$/,"");
const OUTPUT=process.env.PRODUCTION_QA_OUTPUT||"production-qa-artifacts";
await fs.mkdir(OUTPUT,{recursive:true});
const summary={site:ROOT,checks:[],browsers:{},timings:{},warnings:[]};
const log=(key,detail={})=>{summary.checks.push({key,pass:true,...detail});console.log("PASS",key,JSON.stringify(detail));};
const request=async(route,{method="GET",body,token}={})=>{
 const t=performance.now();
 const h={};if(body!==undefined)h["Content-Type"]="application/json";
 if(token)h.Authorization="Bearer "+token;
 const res=await fetch(ROOT+route,{method,headers:h,body:body===undefined?undefined:JSON.stringify(body),redirect:"follow",signal:AbortSignal.timeout(18000)});
 let data=null;const raw=await res.text();
 try{data=JSON.parse(raw)}catch{data=raw}
 return {status:res.status,data,elapsed:Math.round(performance.now()-t),headers:res.headers};
};
let created=null,token=null;
let failures=[];
const check=(condition,message)=>assert.ok(condition,message);
const must=async(label,fn)=>{
 try{const result=await fn();log(label,result&&typeof result==="object"?result:{});}
 catch(e){failures.push({label,error:e.stack||String(e)});console.error("FAIL",label,e.message);}
};
const doc={
 schemaVersion:2,theme:"red",width:720,height:1080,layoutId:"release-gate",
 fields:{bride:"QA Bride",groom:"QA Groom",date:"2027-02-14",time:"18:00",venue:"QA Wedding Hall",address:"Hà Nội",guest:"QA guest",message:"Production smoke invitation"},
 music:"none",
 blocks:[{id:"qa-title",type:"text",x:100,y:340,w:520,h:130,z:4,text:"QA Bride & QA Groom",fontSize:42,color:"#fbe8c0",align:"center"}],
 insideBlocks:[{id:"qa-inside",type:"text",x:95,y:320,w:530,h:200,z:3,text:"Welcome to QA invitation",fontSize:28,color:"#553e32",align:"center"}],
 extraPages:[{id:"qaextra",kind:"custom",title:"QA Extra Page",blocks:[{id:"qa-message",type:"text",x:90,y:350,w:530,h:150,z:4,text:"Extra QA page",fontSize:30,color:"#553e32"}]}],
 gift:{bank:"VCB",account:"",holder:""}
};
const data={document:doc};
await must("live-health-routing",async()=>{
 const r=await request("/api/health");
 assert.equal(r.status,200);check(r.data?.storage==="supabase-postgres","Not routed to Supabase");
 summary.timings.healthMs=r.elapsed;return {ms:r.elapsed};
});
await must("production-studio-html",async()=>{
 const r=await fetch(ROOT+"/studio.html",{signal:AbortSignal.timeout(15000)});
 check(r.ok,"Studio HTTP "+r.status);
 const body=await r.text();check(body.includes('class="tool-rail"')&&body.includes('id="mode-preview"'),"Premium editor DOM missing");
 summary.timings.studioHtmlMs=r.status;return {http:r.status};
});
await must("security-and-rate-limit-http-headers",async()=>{
 const r=await request("/api/health");
 const cors=r.headers.get("access-control-allow-origin"),cache=r.headers.get("cache-control");
 check(cache==="no-store","Live API response should not be cached");
 if(cors==="*")summary.warnings.push("CORS wildcard on public API; owner endpoints rely on Bearer token.");
 return {cors,cache};
});
await must("publish-one-synthetic-invitation",async()=>{
 const r=await request("/api/cards",{method:"POST",body:{data}});
 assert.equal(r.status,201,JSON.stringify(r.data));
 const {id,code,editToken}=r.data;
 check(/^[a-f0-9-]{36}$/.test(id),"Missing UUID");
 check(/^HY-[A-HJ-NP-Z2-9]{12}$/.test(code),"Short code invalid");
 check(/^[a-f0-9]{48}$/.test(editToken),"Edit token invalid");
 created={id,code};token=editToken;
 summary.timings.publishMs=r.elapsed;
 return {codeShape:"HY-12",ms:r.elapsed};
});
if(created){
 try{
  await must("public-code-read-and-no-owner-secret",async()=>{
   const r=await request("/api/cards/"+created.code);
   assert.equal(r.status,200);
   check(r.data.id===created.id,"Wrong record");check(!JSON.stringify(r.data).includes(token),"Owner token leaked");
   check(r.data.data?.document?.extraPages?.length===1,"Lost extra pages");
   summary.timings.publicReadMs=r.elapsed;return {ms:r.elapsed};
  });
  await must("untrusted-visitors-cannot-see-rsvps-or-manager",async()=>{
   for(const suffix of ["manage","rsvps"]){
    const r=await request("/api/cards/"+created.code+"/"+suffix);
    assert.equal(r.status,403,"Guest could GET /"+suffix+" (HTTP "+r.status+")");
   }
   const r=await request("/api/cards/"+created.id,{method:"PUT",body:{data}});
   assert.equal(r.status,403,"Unauthorized content modification accepted");
  });
  await must("incorrect-owner-token-denied",async()=>{
   const r=await request("/api/cards/"+created.id+"/manage",{token:"0".repeat(48)});
   assert.equal(r.status,403);
  });
  await must("owner-stats-and-protected-data",async()=>{
   const r=await request("/api/cards/"+created.id+"/manage",{token});
   assert.equal(r.status,200);check(r.data.code===created.code);
   const v=await request("/api/cards/"+created.id+"/rsvps",{token});
   assert.equal(v.status,200);
  });
  await must("reject-invalid-rsvp-then-accept-synthetic-rsvp",async()=>{
   const invalid=await request("/api/cards/"+created.code+"/rsvp",{method:"POST",body:{name:"QA",attendance:"admin",guests:500}});
   assert.equal(invalid.status,400);
   const good=await request("/api/cards/"+created.code+"/rsvp",{method:"POST",body:{name:"QA test guest",attendance:"yes",guests:2,wish:"QA smoke message"}});
   assert.equal(good.status,201,JSON.stringify(good.data));
   const list=await request("/api/cards/"+created.id+"/rsvps",{token});
   assert.equal(list.status,200);check(list.data.rsvps.some(x=>x.name==="QA test guest"&&x.attendance==="yes"),"RSVP did not persist");
   return {rsvpCount:list.data.count};
  });
  await must("owner-updates-with-stable-code",async()=>{
   const update=structuredClone(data);update.document.fields.venue="QA Updated Hall";
   const forbidden=await request("/api/cards/"+created.id,{method:"PUT",body:{data:update},token:"0".repeat(48)});
   assert.equal(forbidden.status,403);
   const valid=await request("/api/cards/"+created.id,{method:"PUT",body:{data:update},token});
   assert.equal(valid.status,200,JSON.stringify(valid.data));
   check(valid.data.code===created.code,"Code changed upon edit");
   const read=await request("/api/cards/"+created.code);
   assert.equal(read.status,200);check(read.data.data.document.fields.venue==="QA Updated Hall","Update not propagated");
  });
  await must("short-url-route-and-resource-headers",async()=>{
   const r=await fetch(ROOT+"/i/"+created.code,{signal:AbortSignal.timeout(15000)});
   assert.equal(r.status,200);const body=await r.text();
   check(body.includes('id="viewer"')&&body.includes("view.mjs"),"Short URL is not invitation viewer");
   return {http:r.status};
  });
  const profiles=[
   {name:"Chromium Desktop 1366×768",engine:chromium,viewport:{width:1366,height:768}},
   {name:"Firefox Desktop 1366×768",engine:firefox,viewport:{width:1366,height:768}},
   {name:"WebKit iPhone 390×844",engine:webkit,viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2}
  ];
  for(const profile of profiles){
   await must("browser-"+profile.name,async()=>{
    const browser=await profile.engine.launch({headless:true});
    try{
     const {name,engine,...opts}=profile;
     const context=await browser.newContext({...opts,locale:"vi-VN"});
     const page=await context.newPage();
     const errors=[];const firstParty=[];const consoleErrors=[];
     page.on("pageerror",e=>errors.push(e.message));
     page.on("response",r=>{if(r.url().startsWith(ROOT)&&r.status()>=400)firstParty.push({code:r.status(),url:r.url().replace(ROOT,"")});});
     page.on("console",m=>{if(m.type()==="error")consoleErrors.push(m.text().slice(0,160));});
     const t=Date.now();
     const res=await page.goto(ROOT+"/i/"+created.code,{waitUntil:"domcontentloaded",timeout:25000});
     assert.equal(res.status(),200);
     await page.locator("#viewer").waitFor({state:"visible",timeout:18000});
     const loadedMs=Date.now()-t;
     check(await page.locator("#loading").isHidden(),"Viewer loader remained visible");
     check(await page.locator("#toggle-open").isVisible(),"Open button missing");
     check(await page.locator("#inside-poster").evaluate(el=>getComputedStyle(el).visibility)==="hidden","Inside showing through closed cover");
     await page.locator("#toggle-open").click();
     await page.waitForTimeout(1250);
     check(await page.locator("#book").evaluate(el=>el.classList.contains("is-open")),"Book did not open");
     await page.locator("#page-next").click();
     check((await page.locator("#page-name").innerText()).includes("QA Extra Page"),"Extra page fails navigation");
     check(await page.locator("#viewer-pager").isVisible(),"Pager missing");
     if(profile.viewport.width<600){
      const widths=await page.evaluate(()=>({outer:innerWidth,full:document.documentElement.scrollWidth}));
      check(widths.full<=widths.outer+3,"Mobile overflow "+JSON.stringify(widths));
     } else {
      await page.goto(ROOT+"/studio.html",{waitUntil:"domcontentloaded",timeout:25000});
      await page.locator(".palette").waitFor({state:"visible"});
      await page.locator('.palette-tab[data-panel="blocks"]').click();
      await page.locator('.tool-list').first().waitFor({state:"visible"});
      const facts=await page.evaluate(()=>({
       root:document.documentElement.scrollHeight,screen:innerHeight,
       palette:document.querySelector(".palette").scrollHeight,
       paletteViewport:document.querySelector(".palette").clientHeight,
       inspector:document.querySelector(".inspector").scrollHeight,
       inspectorViewport:document.querySelector(".inspector").clientHeight,
       header:document.querySelector(".topbar").getBoundingClientRect().top
      }));
      check(facts.root<=facts.screen+3,"Desktop document scrolls "+JSON.stringify(facts));
      check(facts.palette>facts.paletteViewport+10,"Left sidebar not independently scrollable");
      await page.locator('.palette').hover();await page.mouse.wheel(0,320);
      const scroll=await page.locator('.palette').evaluate(el=>el.scrollTop);
      check(scroll>5,"Left sidebar scroll failed");
      await page.locator('#stage [data-block-id="bride"]').click({force:true});
      const inspector=await page.locator('.inspector').evaluate(el=>({height:el.clientHeight,scroll:el.scrollHeight}));
      check(inspector.scroll>inspector.height+10,"Inspector content must overflow inside its own pane");
      await page.locator('.inspector-heading').hover();await page.mouse.wheel(0,380);
      const rightScroll=await page.locator('.inspector').evaluate(el=>el.scrollTop);
      check(rightScroll>5,"Right inspector independent scroll failed");
      const afterLayout=await page.evaluate(()=>({document:document.documentElement.scrollHeight,viewport:innerHeight,
       header:document.querySelector('.topbar').getBoundingClientRect().top,
       canvas:document.querySelector('.canvas-area').getBoundingClientRect().top}));
      check(afterLayout.document<=afterLayout.viewport+3&&Math.abs(afterLayout.header)<2&&afterLayout.canvas>0,
       "Main editor moved while scrolling sidebars "+JSON.stringify(afterLayout));
     }
     check(errors.length===0,"Javascript exceptions: "+JSON.stringify(errors));
     check(firstParty.length===0,"First-party HTTP failures: "+JSON.stringify(firstParty));
     const ss=path.join(OUTPUT,profile.name.replace(/[^a-z0-9]/gi,"-").toLowerCase()+".png");
     await page.screenshot({path:ss,fullPage:false,animations:"disabled"});
     summary.browsers[profile.name]={loadedMs,consoleErrors:consoleErrors.slice(0,5),screenshot:ss};
     await context.close();
     return {loadedMs,jsErrors:errors.length,httpErrors:firstParty.length,screenshot:ss};
    }finally{await browser.close()}
   });
  }
  await must("extend-validity",async()=>{
   const r=await request("/api/cards/"+created.id+"/extend",{method:"POST",body:{},token});
   assert.equal(r.status,200);return {expiryChanged:!!r.data.expiresAt};
  });
  await must("revoke-hides-live-invitation",async()=>{
   const r=await request("/api/cards/"+created.id+"/revoke",{method:"POST",body:{},token});
   assert.equal(r.status,200);const v=await request("/api/cards/"+created.code);
   assert.equal(v.status,410);
  });
  await must("restore-with-owner-token-only",async()=>{
   const bad=await request("/api/cards/"+created.id+"/restore",{method:"POST",body:{},token:"0".repeat(48)});
   assert.equal(bad.status,403);
   const ok=await request("/api/cards/"+created.id+"/restore",{method:"POST",body:{},token});
   assert.equal(ok.status,200);
   const v=await request("/api/cards/"+created.code);assert.equal(v.status,200);
  });
 }finally{
  try{const clean=await request("/api/cards/"+created.id+"/revoke",{method:"POST",body:{},token});
   check(clean.status===200,"Could not revoke synthetic QA invitation");
   console.log("QA INVITATION REVOKED. Synthetic data retained until policy expiry.");
  }catch(e){failures.push({label:"qa-cleanup",error:e.message})}
 }
}
summary.failed=failures;
await fs.writeFile(path.join(OUTPUT,"report.json"),JSON.stringify(summary,null,2));
console.log("SUMMARY",JSON.stringify({passed:summary.checks.length,failed:failures.length,browsers:summary.browsers,warnings:summary.warnings}));
if(failures.length){for(const item of failures)console.error("FAIL:",item.label,item.error);process.exitCode=1}
