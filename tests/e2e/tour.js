const { chromium } = require('playwright-core');
const fs=require('fs');
const src=fs.readFileSync('/tmp/claude-0/pw/s22.js','utf8');
const start=src.indexOf('const staff'), end=src.indexOf('async function run');
eval(src.slice(start,end).replace(/const /g,'var ').replace(/function handle/,'function handle0'));
const calls={};
function handle(a,b){calls[a]=(calls[a]||0)+1;
  if(a==='getShiftAdminNotices'&&global.notices) return {success:true,notices:global.notices};
  if(a==='saveShiftAdminNotice'){global.notices=global.notices||[]; const n={id:'n'+Date.now(),text:b.text,visibility:b.visibility||'all',employeeIds:b.employeeIds||[],createdAt:new Date().toISOString()}; global.notices.unshift(n); return {success:true,notice:n};}
  if(a==='updateShiftLeaveRequestStatus'){const l=leaves.find(x=>x.id===b.id);if(l){l.status=b.status;l.updatedAt=new Date().toISOString();return {success:true,request:l};}}
  return handle0(a,b);}
(async()=>{
 const role=process.argv[2]||'admin';
 const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 const ctx=await br.newContext({viewport:{width:390,height:844},locale:'ja-JP',timezoneId:'Asia/Tokyo'});
 const emp=role==='admin'?['df38','降旗']:['2a7d','藤川'];
 await ctx.addInitScript(([role,emp])=>{const ns='shift-tool:v1:/:';localStorage.setItem(ns+'shift_app_session',JSON.stringify({token:'mock',role,employeeId:emp[0],employeeName:emp[1],expiresAt:new Date(Date.now()+864e5*7).toISOString()}));if(role==='admin')localStorage.setItem(ns+'shift_api_key','mock');},[role,emp]);
 const page=await ctx.newPage();page.on('dialog',d=>d.accept().catch(()=>{}));
 const errs=[];page.on('pageerror',e=>errs.push('PAGEERR '+e.message.slice(0,200)));page.on('console',m=>{if(m.type()==='error'&&!/404|Failed to load resource/.test(m.text()))errs.push('CONSOLE '+m.text().slice(0,200))});
 await page.route('**/version.json*',r=>r.fulfill({status:404,body:''}));
 await page.route('https://script.google.com/**',async r=>{let b={};try{b=JSON.parse(r.request().postData()||'{}')}catch{}await r.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(handle(b.action,b))});});
 await page.goto('http://127.0.0.1:5199/',{waitUntil:'networkidle'});await page.waitForTimeout(1500);
 const labels=async()=>page.evaluate(()=>[...document.querySelectorAll('button,a[role=button],[role=tab]')].filter(e=>e.offsetParent&&!e.disabled).map(e=>(e.innerText||e.getAttribute('aria-label')||'').trim().replace(/\s+/g,' ').slice(0,30)).filter(Boolean));
 const home=await labels();console.log('HOME buttons:',[...new Set(home)].join(' | '));
 const report=[];
 for(const name of [...new Set(home)]){
   if(/ログアウト|リセット|削除|全消|初期化/.test(name))continue;
   try{
     await page.goto('http://127.0.0.1:5199/',{waitUntil:'networkidle'});await page.waitForTimeout(700);
     const b=page.getByRole('button',{name,exact:false}).first();
     if(!(await b.count())){report.push([name,'SKIP(no match)']);continue;}
     await b.click({timeout:3000});await page.waitForTimeout(900);
     const info=await page.evaluate(()=>({hscroll:document.documentElement.scrollWidth>innerWidth+2,text:document.body.innerText.length,err:!!document.body.innerText.match(/エラー|失敗|読み込めません/)}));
     const sub=[...new Set(await labels())].filter(x=>!home.includes(x));
     report.push([name,JSON.stringify(info),'sub:'+sub.slice(0,25).join('|')]);
     await page.screenshot({path:`/tmp/claude-0/pw/tour-${role}-${report.length}.png`});
   }catch(e){report.push([name,'FAIL '+e.message.split('\n')[0]]);}
 }
 report.forEach(r=>console.log(r.join('  ')));
 console.log('ERRORS',errs.length);[...new Set(errs)].slice(0,15).forEach(e=>console.log(e));
 console.log('CALLS',JSON.stringify(calls));
 await br.close();
})();
