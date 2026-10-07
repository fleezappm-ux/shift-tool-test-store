const {open,step,log}=require('./flow1.js');
(async()=>{
 let [br,p]=await open('admin',['df38','降旗']);p.setDefaultTimeout(5000);
 await step('個人指定お知らせ公開',async()=>{await p.getByRole('button',{name:'掲示板'}).first().click();await p.waitForTimeout(700);await p.getByRole('button',{name:'管理者からのお知らせを作成'}).click();await p.locator('textarea').fill('藤川さん、訂正の件は了解です');await p.locator('select').first().selectOption({index:1});await p.getByLabel('藤川').check();await p.getByRole('button',{name:'お知らせを公開'}).click();await p.waitForTimeout(900);console.log('   ',log.filter(l=>l.startsWith('notice')).pop());});
 for(const [menu,sub] of [['店舗マスタ',null],['お知らせ掲示板設定',null],['従業員マスタ',null],['シフトマスタ',null],['その他設定',null]]){
  await step('設定: '+menu,async()=>{await p.goto('http://127.0.0.1:5199/',{waitUntil:'networkidle'});await p.waitForTimeout(500);await p.getByRole('button',{name:'設定'}).first().click();await p.waitForTimeout(500);try{await p.getByRole('button',{name:'閉じる'}).first().click({timeout:1200})}catch{};await p.getByText(menu,{exact:false}).first().click();await p.waitForTimeout(900);const t=await p.evaluate(()=>({h:document.documentElement.scrollWidth>innerWidth+2,len:document.body.innerText.length}));console.log('   ',JSON.stringify(t));await p.screenshot({path:`/tmp/claude-0/pw/f5-${menu}.png`});});
 }
 console.log('errs',p.errs);
 await br.close();
})();
