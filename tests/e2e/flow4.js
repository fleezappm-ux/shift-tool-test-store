const {open,step,log,notices}=require('./flow1.js');
(async()=>{
 let [br,p]=await open('admin',['df38','降旗']);p.setDefaultTimeout(5000);
 await step('掲示板: 個人指定のお知らせ',async()=>{await p.getByRole('button',{name:'掲示板'}).first().click();await p.waitForTimeout(700);await p.getByRole('button',{name:'管理者からのお知らせを作成'}).click();await p.locator('textarea').fill('藤川さん、訂正の件は了解です');const sel=p.locator('select').first();console.log('   options',await sel.locator('option').allInnerTexts());await sel.selectOption({index:1});await p.waitForTimeout(400);await p.screenshot({path:'/tmp/claude-0/pw/f4-a.png'});});
 await step('掲示板: 公開',async()=>{await p.getByRole('button',{name:'お知らせを公開'}).click();await p.waitForTimeout(900);if(!log.some(l=>l.startsWith('notice')))throw new Error('保存なし');console.log('   ',log.filter(l=>l.startsWith('notice')).pop());});
 await step('設定メニュー',async()=>{await p.getByRole('button',{name:'設定'}).first().click();await p.waitForTimeout(700);try{await p.getByRole('button',{name:'使い始める'}).click({timeout:1500})}catch{};const t=await p.evaluate(()=>[...document.querySelectorAll('button,a,[role=button]')].filter(e=>e.offsetParent).map(e=>e.innerText.trim().replace(/\s+/g,' ').slice(0,26)).filter(Boolean));console.log('   ',t.join('|'));});
 console.log('errs',p.errs);
 await br.close();
})();
