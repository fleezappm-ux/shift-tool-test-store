const {open,step}=require('./flow1.js');
(async()=>{
 let [br,p]=await open('emp',['2a7d','藤川']);p.setDefaultTimeout(6000);
 await step('掲示板へ',async()=>{await p.getByRole('button',{name:'掲示板'}).first().click();await p.waitForTimeout(1200);});
 const n0=await p.getByRole('button',{name:'確認した（履歴へ）'}).count();console.log('   未確認ボタン数',n0);
 await step('確認→履歴へ',async()=>{await p.getByRole('button',{name:'確認した（履歴へ）'}).first().click();await p.waitForTimeout(300);
   const n1=await p.getByRole('button',{name:'確認した（履歴へ）'}).count();if(n1!==n0-1)throw new Error('減らない '+n1);
   await p.getByText(/確認ずみの履歴（1件）/).click();await p.getByRole('button',{name:'未確認に戻す'}).waitFor();});
 await step('再読み込みしても履歴に残る',async()=>{await p.reload({waitUntil:'networkidle'});await p.getByRole('button',{name:'掲示板'}).first().click();await p.waitForTimeout(1000);await p.getByText(/確認ずみの履歴（1件）/).waitFor();});
 await step('未確認に戻す',async()=>{await p.getByText(/確認ずみの履歴（1件）/).click();await p.getByRole('button',{name:'未確認に戻す'}).click();await p.waitForTimeout(300);if(await p.getByText(/確認ずみの履歴/).count())throw new Error('履歴が残る');});
 console.log('errs',p.errs);await br.close();
})();
