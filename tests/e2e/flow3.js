const {open,step,log}=require('./flow1.js');
(async()=>{
 let [br,p]=await open('employee',['2a7d','藤川']);p.setDefaultTimeout(5000);
 await p.getByText('休み希望日を提出する').first().click();await p.waitForTimeout(1000);await p.getByRole('button',{name:'使い始める'}).click();await p.waitForTimeout(600);
 await p.getByRole('button',{name:/個人シフトに切り替え/}).click();await p.waitForTimeout(500);
 await p.locator('button[aria-label$="の自分の希望を選ぶ"]').nth(18).click();await p.waitForTimeout(500);
 console.log(await p.evaluate(()=>[...document.querySelectorAll('select')].map(s=>[s.getAttribute('aria-label'),s.disabled,s.offsetParent!==null,[...s.options].map(o=>o.value).join(',')])));
 await br.close();
})();
