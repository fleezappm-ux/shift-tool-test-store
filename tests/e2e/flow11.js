// PINログイン：PIN未設定の人は「決める（2回入力）」、設定済みの人は「入れる」。スマホ幅で確認する。
const {chromium}=require('playwright-core');
const OUT=process.env.OUT||'/tmp';
(async()=>{const br=await chromium.launch({executablePath:process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const ctx=await br.newContext({viewport:{width:390,height:844},locale:'ja-JP'});
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.route('**/version.json*',r=>r.fulfill({status:404,body:''}));
const sent=[];let aHasPin=false;
await p.route('https://script.google.com/**',async r=>{let b={};try{b=JSON.parse(r.request().postData()||'{}')}catch{}
 const H={'access-control-allow-origin':'*'};
 const one=(a,b)=>{
  if(a==='getShiftLoginEmployees')return {success:true,employees:[{id:'a1',name:'新人',displayName:'新人',active:true,hasPin:aHasPin},{id:'b2',name:'ベテラン',displayName:'ベテラン',active:true,hasPin:true}]};
  if(a==='loginShift'){sent.push(b);
   if(b.employeeId==='a1'&&!b.newPin)return {success:false,message:'PIN_SETUP_REQUIRED:はじめてのログインです。4〜6桁の数字でPINを決めてください。'};
   if(b.employeeId==='b2'&&b.pin!=='4321')return {success:false,message:'PINが違います。忘れたときは管理者にPINのリセットを頼んでください。'};
   if(b.employeeId==='a1')aHasPin=true;
   return {success:true,session:{token:'t',role:'employee',employeeId:b.employeeId,employeeName:b.employeeName,expiresAt:new Date(Date.now()+864e5).toISOString()}};}
  return {success:true};};
 const out=b.action==='batchShift'?{success:true,results:b.calls.map(c=>one(c.action,c))}:one(b.action,b);
 r.fulfill({status:200,contentType:'application/json',headers:H,body:JSON.stringify(out)});});
await p.goto('http://127.0.0.1:5199/',{waitUntil:'networkidle'});await p.waitForTimeout(800);
const ok=(l,v)=>console.log(v?'OK ':'NG ',l);
ok('名前を選ぶまでPIN欄は出ない',await p.locator('#login-pin').count()===0);
await p.locator('input').first().fill('staff');await p.locator('input[type=password]').first().fill('pw');
// 設定済みの人：PIN欄は1つ
await p.locator('select').selectOption('b2');
ok('設定済み：PIN欄は1つ',await p.locator('#login-pin').count()===1&&await p.locator('#login-pin-confirm').count()===0);
await p.locator('#login-pin').fill('12ab34');
ok('数字以外は入らない',await p.locator('#login-pin').inputValue()==='1234');
await p.screenshot({path:OUT+'/pin-existing.png'});
await p.getByRole('button',{name:'ログイン'}).click();await p.waitForTimeout(700);
ok('違うPINは弾かれる（メッセージ表示）',await p.getByText('PINが違います').count()>0);
// 未設定の人：PINを決める（2回）
await p.locator('select').selectOption('a1');
ok('未設定：PINを決める欄が2つ',await p.locator('#login-pin').count()===1&&await p.locator('#login-pin-confirm').count()===1);
await p.screenshot({path:OUT+'/pin-first.png'});
await p.locator('#login-pin').fill('2468');await p.locator('#login-pin-confirm').fill('1111');
const before=sent.length;await p.getByRole('button',{name:'ログイン'}).click();await p.waitForTimeout(400);
ok('2回が違えば送信しない',sent.length===before);
await p.locator('#login-pin-confirm').fill('2468');await p.getByRole('button',{name:'ログイン'}).click();await p.waitForTimeout(1200);
const last=sent[sent.length-1];
ok('初回は newPin で送る（pinは空）',last.newPin==='2468'&&last.pin==='');
ok('ログインできた（ログイン画面が消えた）',await p.locator('#login-pin').count()===0);
console.log('errs',errs);await br.close();})();
