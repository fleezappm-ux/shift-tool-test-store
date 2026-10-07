const { chromium } = require('playwright-core');
const fs=require('fs');
const src=fs.readFileSync('/tmp/claude-0/pw/s22.js','utf8');
eval(src.slice(src.indexOf('const staff'),src.indexOf('async function run')).replace(/const /g,'var ').replace(/function handle/,'function handle0'));
leaves.forEach(l=>{l.periodStart='2026-09-21';l.periodEnd='2026-10-20';});
leaves[0].date='2026-10-14';leaves[1].date='2026-10-12';leaves[2].date='2026-10-09';leaves[3].date='2026-10-16';leaves[3].employeeId='df38';leaves[3].employeeName='降旗';
var notices=[];var log=[];
function handle(a,b){ if(a==='batchShift') return {success:true,results:b.calls.map(c=>handle(c.action,c))};
  if(a==='getShiftAdminNotices')return {success:true,notices};
  if(a==='saveShiftAdminNotice'){const n={id:'n'+Date.now(),text:b.text,visibility:b.visibility||'all',employeeIds:b.employeeIds||[],createdAt:new Date().toISOString()};notices.unshift(n);log.push('notice '+JSON.stringify(b).slice(0,150));return {success:true,notice:n};}
  if(a==='updateShiftLeaveRequestStatus'){const l=leaves.find(x=>x.id===b.id);log.push('status '+b.id+' '+b.status);if(l){l.status=b.status;return {success:true,request:l};}}
  if(a==='saveShiftLeaveRequest'){b=Object.assign({},b,b.request);const l={id:'x'+Date.now(),employeeId:b.employeeId,employeeName:b.employeeName,date:b.date,periodStart:'2026-09-21',periodEnd:'2026-10-20',type:b.type,comment:b.comment||'',commentVisibility:b.commentVisibility||'all',status:'申請中',submittedAt:now,updatedAt:now,desiredWorkStart:b.desiredWorkStart,desiredWorkEnd:b.desiredWorkEnd};leaves.push(l);log.push('leave '+JSON.stringify(b).slice(0,200));return {success:true,request:l};}
  return handle0(a,b);}
async function open(role,emp){
 const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 const ctx=await br.newContext({viewport:{width:390,height:844},locale:'ja-JP',timezoneId:'Asia/Tokyo'});
 await ctx.addInitScript(([role,emp])=>{const ns='shift-tool:v1:/:';localStorage.setItem(ns+'shift_app_session',JSON.stringify({token:'mock',role,employeeId:emp[0],employeeName:emp[1],expiresAt:new Date(Date.now()+864e5*7).toISOString()}));if(role==='admin')localStorage.setItem(ns+'shift_api_key','mock');},[role,emp]);
 const page=await ctx.newPage();page.on('dialog',d=>d.accept().catch(()=>{}));
 page.errs=[];page.on('pageerror',e=>page.errs.push('PAGEERR '+e.message.slice(0,200)));
 await page.route('**/version.json*',r=>r.fulfill({status:404,body:''}));
 await page.route('https://script.google.com/**',async r=>{let b={};try{b=JSON.parse(r.request().postData()||'{}')}catch{}await r.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(handle(b.action,b))});});
 await page.goto('http://127.0.0.1:5199/',{waitUntil:'networkidle'});await page.waitForTimeout(1500);
 return [br,page];
}
const step=async(name,fn)=>{try{await fn();console.log('OK  ',name)}catch(e){console.log('FAIL',name,e.message.split('\n')[0].slice(0,160))}};
module.exports={open,step,leaves,notices:()=>notices,log};
if(require.main===module)(async()=>{
 // admin: correction popup
 let [br,p]=await open('admin',['df38','降旗']);
 await step('admin: シフト作成を開く',async()=>{await p.getByRole('button',{name:'シフト作成'}).first().click();await p.waitForTimeout(1200);});
 await step('admin: 訂正チップが出る',async()=>{await p.locator('.correction-chip').first().waitFor({timeout:4000});});
 await step('admin: 訂正チップ→ポップアップ',async()=>{await p.locator('.correction-chip').first().click();await p.getByText('現在の勤務').waitFor({timeout:3000});await p.screenshot({path:'/tmp/claude-0/pw/f1-popup.png'});});
 await step('admin: 確認した',async()=>{await p.getByRole('button',{name:'確認した'}).click();await p.waitForTimeout(800);if(await p.locator('.correction-chip').count())throw new Error('チップが残った');});
 await step('admin: 申請バー(申請中の希望)',async()=>{const t=await p.locator('.creation-leave-strip').innerText();console.log('   strip:',t);await p.locator('.creation-leave-strip').click();await p.waitForTimeout(600);await p.screenshot({path:'/tmp/claude-0/pw/f1-manager.png'});});
 await step('admin: 承認にする',async()=>{await p.getByRole('button',{name:/^承認/}).first().click();await p.waitForTimeout(500);await p.screenshot({path:'/tmp/claude-0/pw/f1-approve.png'});await p.getByRole('button',{name:/承認する|はい|確定|OK/}).last().click();await p.waitForTimeout(800);});
 await step('admin: 掲示板でお知らせ作成',async()=>{await p.getByRole('button',{name:'掲示板'}).first().click();await p.waitForTimeout(800);await p.getByRole('button',{name:'管理者からのお知らせを作成'}).click();await p.waitForTimeout(500);await p.screenshot({path:'/tmp/claude-0/pw/f1-notice.png'});});
 console.log('errs',p.errs,'log',log);
 await br.close();
})();
