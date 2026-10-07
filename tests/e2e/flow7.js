const {open,step}=require('./flow1.js');
(async()=>{
 let [br,p]=await open('admin',['df38','降旗']);p.setDefaultTimeout(8000);
 let flushes=0;const acts=[];
 await p.route('https://script.google.com/**',async r=>{let b={};try{b=JSON.parse(r.request().postData()||'{}')}catch{}
  const H={'access-control-allow-origin':'*'};
  if(b.action==='saveShiftMonth'){acts.push('save defer='+b.defer);return r.fulfill({status:200,contentType:'application/json',headers:H,body:JSON.stringify({success:true,queued:true,pending:1})});}
  if(b.action==='flushShiftPending'){flushes++;acts.push('flush#'+flushes);return r.fulfill({status:200,contentType:'application/json',headers:H,body:JSON.stringify(flushes<=1?{success:false,message:'Notion一時エラー'}:{success:true,pending:0,written:1})});}
  if(b.action==='getShiftPendingStatus')return r.fulfill({status:200,contentType:'application/json',headers:H,body:JSON.stringify({success:true,count:0,lastError:'',oldestAt:''})});
  return r.fallback();});
 await p.getByRole('button',{name:'シフト作成'}).first().click();await p.waitForTimeout(1500);
 await step('セル編集',async()=>{
   await p.locator('button[aria-label^="降旗 10月11日"]').first().click();await p.waitForTimeout(500);
   const sel=p.locator('dialog select, [role=dialog] select').first();const opts=await sel.locator('option').allInnerTexts();
   await sel.selectOption({label:opts.find(o=>o.includes('早番'))});
   await p.getByRole('button',{name:'変更する'}).click();await p.waitForTimeout(3500);});
 await step('失敗の警告が出る',async()=>{await p.getByText('Notionへの反映が終わっていません').waitFor({timeout:4000});console.log('   acts',acts);});
 await step('自動再試行で警告が消える',async()=>{await p.getByText('Notionへの反映が終わっていません').waitFor({state:'detached',timeout:12000});console.log('   acts',acts);});
 console.log('errs',p.errs);await br.close();
})();
