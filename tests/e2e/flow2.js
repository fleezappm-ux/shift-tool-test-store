const {open,step,leaves,notices,log}=require('./flow1.js');
(async()=>{
 let [br,p]=await open('employee',['2a7d','藤川']);p.setDefaultTimeout(5000);
 await p.getByText('休み希望日を提出する').first().click();await p.waitForTimeout(1000);await p.getByRole('button',{name:'使い始める'}).click();await p.waitForTimeout(600);
 await p.getByRole('button',{name:/個人シフトに切り替え/}).click();await p.waitForTimeout(500);
 await step('出勤希望を選ぶ',async()=>{await p.locator('button[aria-label$="の自分の希望を選ぶ"]').nth(18).click();await p.waitForTimeout(400);const s=p.locator('select[aria-label$="の希望"]:visible').first();await s.selectOption('出勤希望');await p.waitForTimeout(500);await p.screenshot({path:'/tmp/claude-0/pw/f2-b.png'});});
 await step('時間を入れる',async()=>{const ins=p.locator('input[type=time]');console.log('   time inputs',await ins.count());await ins.nth(0).fill('09:00');await ins.nth(1).fill('13:00');});
 await step('不正な時間で警告',async()=>{const ins=p.locator('input[type=time]');await ins.nth(1).fill('08:00');await p.waitForTimeout(300);const t=await p.locator('.note-card, .leave-note-card').innerText();console.log('   warn:',/終了|早い|より後/.test(t));await ins.nth(1).fill('13:00');});
 await step('提出',async()=>{await p.getByRole('button',{name:/このノートを提出/}).click();await p.waitForTimeout(1500);await p.screenshot({path:'/tmp/claude-0/pw/f2-c.png'});});
 await step('提出が保存された',async()=>{if(!log.some(l=>l.startsWith('leave')))throw new Error('保存呼び出しなし');console.log('   ',log.find(l=>l.startsWith('leave')));});
 console.log('errs',p.errs);
 await br.close();
})();
