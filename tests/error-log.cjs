const fs=require('fs'),vm=require('vm'),assert=require('assert');
const props={STORE_ID:'TEST-ONLY'};
const ctx={console,Logger:{log(){}},Utilities:{getUuid:()=>'u'},
 PropertiesService:{getScriptProperties:()=>({getProperty:k=>props[k]??null,setProperty:(k,v)=>{props[k]=v},deleteProperty:k=>{delete props[k]}})},
 LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})}};
vm.createContext(ctx);vm.runInContext(fs.readFileSync('gas/Code.gs','utf8'),ctx);
let session={employeeName:'藤川',role:'employee'};
Object.assign(ctx,{createJsonDataResponse:x=>x,createJsonResponse:(success,message)=>({success,message}),verifyShiftApiKey(){},
 requireShiftSession:()=>{if(!session)throw new Error('expired');return session}});
// 1. 記録される
assert.equal(ctx.logShiftClientError({sessionToken:'t',message:'TypeError: x',where:'window'}).success,true);
let l=ctx.getShiftErrorLog({}).errors;assert.equal(l.length,1);assert.equal(l[0].n,1);assert.equal(l[0].who,'藤川');
// 2. 同じ内容は回数が増える
ctx.logShiftClientError({sessionToken:'t',message:'TypeError: x',where:'window'});
l=ctx.getShiftErrorLog({}).errors;assert.equal(l.length,1);assert.equal(l[0].n,2);
// 3. 直近15件・容量上限
for(let i=0;i<40;i++)ctx.logShiftClientError({sessionToken:'t',message:'E'+i+'x'.repeat(250),where:'w'});
l=ctx.getShiftErrorLog({}).errors;assert.ok(l.length<=15);assert.ok(props.SHIFT_ERROR_LOG_JSON.length<=7000);
// 4. ログインしていない人は記録できない
session=null;assert.equal(ctx.logShiftClientError({sessionToken:'',message:'bad'}).success,false);
// 5. 消去
session={role:'admin'};assert.equal(ctx.clearShiftErrorLog({shiftApiKey:'k'}).success,true);assert.equal(ctx.getShiftErrorLog({}).errors.length,0);
console.log('PASS: error log (record, dedupe, cap, auth, clear)');
// 6. 導入の自己診断：値を出さずに、抜けを一覧する
props.NOTION_API_KEY='SECRET-VALUE';ctx.requestNotion=()=>{throw new Error('x')};
const out=ctx.checkShiftSetup();assert.match(out,/要確認/);assert.ok(!out.includes('SECRET-VALUE'));assert.match(out,/NG\s+SHIFT_API_KEY/);
console.log('PASS: setup self-check');
