// 「まっさらな店舗に、導入手順書どおりに設定した」状態を疑似的に作り、ログインまで通しで確かめる。
const fs=require('fs'),vm=require('vm'),assert=require('assert'),crypto=require('crypto');
const props={};const cacheStore={};
const ctx={console,Logger:{log(){}},
 Utilities:{getUuid:()=>crypto.randomUUID(),DigestAlgorithm:{SHA_256:'sha256'},Charset:{UTF_8:'utf8'},
  computeDigest:(a,s)=>[...crypto.createHash('sha256').update(s,'utf8').digest()].map(b=>b>127?b-256:b)},
 PropertiesService:{getScriptProperties:()=>({getProperty:k=>props[k]??null,setProperty:(k,v)=>{props[k]=String(v)},setProperties:o=>Object.assign(props,o),deleteProperty:k=>{delete props[k]},getProperties:()=>({...props})})},
 CacheService:{getScriptCache:()=>({get:k=>cacheStore[k]??null,put:(k,v)=>{cacheStore[k]=v},remove:k=>{delete cacheStore[k]}})},
 LockService:{getScriptLock:()=>({tryLock:()=>true,waitLock(){},releaseLock(){}})},
 ContentService:{MimeType:{JSON:'json'},createTextOutput:t=>({t,setMimeType(){return this},getContent(){return t}})}};
vm.createContext(ctx);vm.runInContext(fs.readFileSync('gas/Code.gs','utf8'),ctx);
const J=r=>JSON.parse(r.getContent());
// 手順書 2-3 の表どおりに入れる（値はテスト用）
Object.assign(props,{NOTION_API_KEY:'secret_test',NOTION_SHIFT_DATABASE_ID:'a'.repeat(32),NOTION_SHIFT_REQUEST_DATABASE_ID:'b'.repeat(32),NOTION_STORE_DATABASE_ID:'c'.repeat(32),
 STORE_ID:'STORE-TEST-01',SHIFT_API_KEY:'Zx9kQ2mTw7Lp4',SHIFT_ADMIN_LOGIN_ID:'admin-id',SHIFT_ADMIN_SETUP_PASSWORD:'AdminPass#1',
 SHIFT_EMPLOYEE_LOGIN_ID:'staff-id',SHIFT_EMPLOYEE_SETUP_PASSWORD:'StaffPass#1',SHIFT_INITIAL_OPERATOR_NAME:'テスト管理者'});
ctx.requestNotion=()=>({properties:{}});
// 実行前の診断: 抜けが分かる
let out=ctx.checkShiftSetup();assert.match(out,/要確認/);assert.match(out,/NG\s+管理者ログイン/);assert.match(out,/NG\s+最初の操作員/);
// 手順書 2-4 の3つを順に実行
ctx.configureShiftAdmin();ctx.configureShiftEmployeeLogin();ctx.initializeShiftOperator();
assert.ok(!props.SHIFT_ADMIN_SETUP_PASSWORD&&!props.SHIFT_EMPLOYEE_SETUP_PASSWORD&&!props.SHIFT_INITIAL_OPERATOR_NAME,'元の入力欄が消える');
// 手順書 2-5: すべてOK
out=ctx.checkShiftSetup();assert.match(out,/すべてOK/);assert.ok(!out.includes('Zx9kQ2mTw7Lp4')&&!out.includes('AdminPass'),'値は出さない');
// ログイン前の操作員一覧に、最初の操作員が出る
const emps=J(ctx.getShiftLoginEmployees()).employees;assert.equal(emps.length,1);assert.equal(emps[0].name,'テスト管理者');
const me=emps[0];
// 最初のログインは、PINを決めるまで入れない（PINが未設定のことも一覧で分かる）
assert.equal(emps[0].hasPin,false);
let r0=J(ctx.loginShift({loginId:'admin-id',password:'AdminPass#1',employeeId:me.id,employeeName:me.name}));assert.equal(r0.success,false);assert.match(r0.message,/^PIN_SETUP_REQUIRED:/);
r0=J(ctx.loginShift({loginId:'admin-id',password:'AdminPass#1',employeeId:me.id,employeeName:me.name,newPin:'12'}));assert.equal(r0.success,false);assert.match(r0.message,/^PIN_SETUP_REQUIRED:/,'短いPINは受け付けない');
r0=J(ctx.loginShift({loginId:'admin-id',password:'wrong',employeeId:me.id,employeeName:me.name,newPin:'1234'}));assert.equal(r0.success,false);assert.ok(!props[ctx.shiftPinPropertyKey_(me.id)],'パスワードが違えばPINは作られない');
r0=J(ctx.loginShift({loginId:'admin-id',password:'AdminPass#1',employeeId:me.id,employeeName:me.name,newPin:'1234'}));assert.equal(r0.success,true);
assert.equal(J(ctx.getShiftLoginEmployees()).employees[0].hasPin,true);
assert.ok(!JSON.stringify(props).includes('"1234"')&&!Object.values(props).some(v=>String(v)==='1234'),'PINそのものは保存しない');
// 違うPINは弾く。PINなしも弾く
r0=J(ctx.loginShift({loginId:'staff-id',password:'StaffPass#1',employeeId:me.id,employeeName:me.name,pin:'9999'}));assert.equal(r0.success,false);assert.match(r0.message,/PINが違います/);
r0=J(ctx.loginShift({loginId:'staff-id',password:'StaffPass#1',employeeId:me.id,employeeName:me.name}));assert.equal(r0.success,false);
// 管理者・従業員でログインできる／間違いは弾く
let r=J(ctx.loginShift({loginId:'admin-id',password:'AdminPass#1',employeeId:me.id,employeeName:me.name,pin:'1234'}));assert.equal(r.success,true);assert.equal(r.session.role,'admin');
r=J(ctx.loginShift({loginId:'staff-id',password:'StaffPass#1',employeeId:me.id,employeeName:me.name,pin:'1234'}));assert.equal(r.success,true);assert.equal(r.session.role,'employee');
r=J(ctx.loginShift({loginId:'admin-id',password:'wrong',employeeId:me.id,employeeName:me.name,pin:'1234'}));assert.equal(r.success,false);
// 接続キーの確認（画面の「保存して接続を確認」）
assert.equal(J(ctx.dispatchShiftAction_({action:'loginShift',loginId:'admin-id',password:'AdminPass#1',employeeId:me.id,employeeName:me.name,pin:'1234'})).success,true);
const tok=J(ctx.loginShift({loginId:'admin-id',password:'AdminPass#1',employeeId:me.id,employeeName:me.name,pin:'1234'})).session.token;
assert.equal(J(ctx.dispatchShiftAction_({action:'checkShiftApiKey',sessionToken:tok,shiftApiKey:'Zx9kQ2mTw7Lp4'})).success,true);
assert.throws(()=>ctx.dispatchShiftAction_({action:'checkShiftApiKey',sessionToken:tok,shiftApiKey:'wrong-key'}));
// 8回間違えると、一時的にロック
for(let i=0;i<8;i++)ctx.loginShift({loginId:'staff-id',password:'x',employeeId:me.id,employeeName:me.name,pin:'1234'});
r=J(ctx.loginShift({loginId:'staff-id',password:'StaffPass#1',employeeId:me.id,employeeName:me.name,pin:'1234'}));assert.equal(r.success,false);assert.match(r.message,/多すぎ/);
// PINを5回間違えると、正しいPINでも一時的にロック。管理者のリセットでPINを消せる
for(let i=0;i<5;i++)ctx.loginShift({loginId:'admin-id',password:'AdminPass#1',employeeId:me.id,employeeName:me.name,pin:'0000'});
r=J(ctx.loginShift({loginId:'admin-id',password:'AdminPass#1',employeeId:me.id,employeeName:me.name,pin:'1234'}));assert.equal(r.success,false);assert.match(r.message,/多すぎ/);
Object.keys(cacheStore).forEach(k=>delete cacheStore[k]);
const tok2=J(ctx.loginShift({loginId:'admin-id',password:'AdminPass#1',employeeId:me.id,employeeName:me.name,pin:'1234'})).session.token;
assert.throws(()=>ctx.dispatchShiftAction_({action:'resetShiftEmployeePin',sessionToken:J(ctx.loginShift({loginId:'staff-id',password:'StaffPass#1',employeeId:me.id,employeeName:me.name,pin:'1234'})).session.token,shiftApiKey:'Zx9kQ2mTw7Lp4',employeeId:me.id}),'従業員ログインではリセットできない');
assert.equal(J(ctx.dispatchShiftAction_({action:'resetShiftEmployeePin',sessionToken:tok2,shiftApiKey:'wrong-key',employeeId:me.id})).success,false,'接続キーが違えばリセットできない');
assert.equal(J(ctx.getShiftLoginEmployees()).employees[0].hasPin,true,'失敗したリセットでPINは消えない');
r=J(ctx.dispatchShiftAction_({action:'resetShiftEmployeePin',sessionToken:tok2,shiftApiKey:'Zx9kQ2mTw7Lp4',employeeId:me.id}));assert.equal(r.success,true);
assert.equal(J(ctx.getShiftLoginEmployees()).employees[0].hasPin,false);
r=J(ctx.loginShift({loginId:'admin-id',password:'AdminPass#1',employeeId:me.id,employeeName:me.name,newPin:'5678'}));assert.equal(r.success,true,'リセット後は新しいPINを決め直せる');
r=J(ctx.loginShift({loginId:'admin-id',password:'AdminPass#1',employeeId:me.id,employeeName:me.name,pin:'1234'}));assert.equal(r.success,false,'古いPINは使えない');
// 弱い接続キーは、自己診断で指摘される
props.SHIFT_API_KEY='1234';out=ctx.checkShiftSetup();assert.match(out,/NG\s+SHIFT_API_KEY（強さ）/);
console.log('PASS: fresh install walkthrough (setup → check → PIN setup/login → api key → lockouts → PIN reset → weak key warning)');
