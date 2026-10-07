const { chromium } = require('playwright-core');
const fs=require('fs');
const src=fs.readFileSync('/tmp/claude-0/pw/s22.js','utf8');
eval(src.slice(src.indexOf('const staff'),src.indexOf('async function run')).replace(/const /g,'var ').replace(/function handle/,'function handle0'));
function handle(a,b){ if(a==='batchShift') return {success:true,results:b.calls.map(c=>handle(c.action,c))}; return handle0(a,b);}
(async()=>{
 const role=process.argv[2]||'admin'; const emp=role==='admin'?['df38','降旗']:['2a7d','藤川'];
 const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 const ctx=await br.newContext({viewport:{width:390,height:844},locale:'ja-JP',timezoneId:'Asia/Tokyo'});
 await ctx.addInitScript(([role,emp])=>{const ns='shift-tool:v1:/:';localStorage.setItem(ns+'shift_app_session',JSON.stringify({token:'mock',role,employeeId:emp[0],employeeName:emp[1],expiresAt:new Date(Date.now()+864e5*7).toISOString()}));if(role==='admin')localStorage.setItem(ns+'shift_api_key','mock');},[role,emp]);
 const page=await ctx.newPage();const t0=Date.now();
 await page.route('**/version.json*',r=>r.fulfill({status:404,body:''}));
 await page.route('https://script.google.com/**',async r=>{let b={};try{b=JSON.parse(r.request().postData()||'{}')}catch{}
  const st=Date.now()-t0; const names=b.action==='batchShift'?'batch['+b.calls.map(c=>c.action+(c.periodStart?':'+c.periodStart:'')).join(',')+']':b.action+(b.periodStart?':'+b.periodStart:'');
  await new Promise(x=>setTimeout(x,1200)); console.log(String(st).padStart(5),'->',String(Date.now()-t0).padStart(5),names);
  await r.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(handle(b.action,b))});});
 await page.goto('http://127.0.0.1:5199/',{waitUntil:'commit'});await page.waitForTimeout(9000);
 await br.close();
})();
