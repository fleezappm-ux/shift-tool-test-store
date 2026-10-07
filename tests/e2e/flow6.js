const {open,step,log}=require('./flow1.js');
(async()=>{
 let [br,p]=await open('admin',['df38','降旗']);p.setDefaultTimeout(8000);
 const saves=[];p.on('request',r=>{const b=r.postData();if(b&&b.includes('"saveShiftMonth"'))saves.push(JSON.parse(b));});
 await p.getByRole('button',{name:'シフト作成'}).first().click();await p.waitForTimeout(1500);
 for(const [n,label] of [[1,'早番'],[2,'遅番']]){
  await step('セル編集'+n,async()=>{
   await p.locator('button[aria-label^="降旗 10月'+(10+n)+'日"]').first().click();await p.waitForTimeout(500);
   const sel=p.locator('dialog select, [role=dialog] select').first();
   const opts=await sel.locator('option').allInnerTexts();
   const target=opts.find(o=>o.includes(label));await sel.selectOption({label:target});
   await p.getByRole('button',{name:'変更する'}).click();await p.waitForTimeout(2500);
  });
 }
 await step('保存の中身',async()=>{
  console.log('   saves:',saves.length,saves.map(s=>({rows:s.shifts.length,partial:s.partial})));
  if(!saves.length)throw new Error('保存なし');
  if(saves.some(s=>s.shifts.length>3))throw new Error('変更分以外も送っている');
 });
 console.log('errs',p.errs);await br.close();
})();
