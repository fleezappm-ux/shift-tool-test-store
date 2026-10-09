const fs = require('fs'), vm = require('vm'), assert = require('assert');
const {makeFakeSpreadsheet,installSpreadsheetApp}=require('./helpers/fake-sheets.cjs');
const keys = {
  STORE_ID: 'TEST-ONLY', SHIFT_WORK_TIME_MASTER_TEST: 'worktime', SHIFT_WORK_TIME_MASTER_TEST_ONLY: 'saved-worktime',
  SHIFT_EMPLOYEE_MASTER_JSON: 'one-operator', SHIFT_LEAVE_REQUESTS_2026_10_01: '[]'
};
let held = false;
const props = {getProperty:k=>keys[k] || null,setProperty:(k,v)=>{keys[k]=v},deleteProperty:k=>{delete keys[k]},getProperties:()=>({...keys})};
const sandbox = { console, Date, PropertiesService:{getScriptProperties:()=>props}, Utilities:{getUuid:()=>`token-${Date.now()}`,sleep:()=>{},formatDate:()=> '2026-10-09 00:00:00'}, LockService:{getScriptLock:()=>({tryLock:()=>{held=true;return true},waitLock:()=>{held=true},hasLock:()=>held,releaseLock:()=>{held=false}})} };
vm.createContext(sandbox);vm.runInContext(fs.readFileSync('gas/Code.gs','utf8'),sandbox);
const book=makeFakeSpreadsheet('BOOK-1');installSpreadsheetApp(sandbox,book);
sandbox.requireShiftSession=()=>({employeeId:'operator',role:'admin'});sandbox.verifyShiftApiKey=()=>{};sandbox.getStoreId=()=> 'TEST_ONLY';
sandbox.readShiftEmployeeMaster=()=>[{id:'operator',active:true,displayName:'テスト'}];sandbox.normalizeShiftEmployeeMaster=x=>x;
sandbox.createJsonDataResponse=x=>x;sandbox.createJsonResponse=(success,message)=>({success,message});
// シートに22件のシフトと1件の希望を入れておく
const sh=sandbox.shiftSheet_();for(let i=0;i<22;i++)sh.getRange(2+i,1,1,3).setValues([['2026-10-'+String(i+1).padStart(2,'0'),'社員'+i,'e'+i]]);
const rq=sandbox.requestSheet_();rq.getRange(2,1,1,1).setValues([['q1']]);
// 許可していないシートでは初期化できない
let denied=sandbox.previewTemplateReset({});assert.equal(denied.success,false);assert.match(denied.message,/許可されていません/);
keys.SHIFT_RESET_ALLOWED_SHEET_ID='BOOK-1';
const preview=sandbox.previewTemplateReset({});assert.equal(preview.success,true);assert.equal(preview.counts[0].count,22);assert.equal(preview.counts[1].count,1);
assert.equal(sandbox.getTemplateResetStatus({token:preview.token}).archived,0);
// 確認の言葉が違えば実行されない
assert.equal(sandbox.runTemplateReset({token:preview.token,confirmation:'いいえ'}).success,false);assert.equal(sandbox.shiftSheet_().getLastRow(),23);
let done=sandbox.runTemplateReset({token:preview.token,confirmation:'初期化'});assert.equal(done.done,true);assert.equal(done.archived,23);
assert.equal(sandbox.shiftSheet_().getLastRow(),1,'見出しだけ残る');assert.equal(sandbox.requestSheet_().getLastRow(),1);
assert.equal(sandbox.shiftSheet_().data[0][0],'日付');
assert.equal(keys.SHIFT_WORK_TIME_MASTER_TEST_ONLY,undefined);assert.equal(keys.SHIFT_LEAVE_REQUESTS_2026_10_01,undefined);assert.ok(keys.SHIFT_RESET_EPOCH);
// 入口の管理者認証が個別の保存APIより先に適用される。
let requestedRole = null;
sandbox.requireShiftSession=(_token,role)=>{requestedRole=role;if(role==='admin')throw new Error('admin required');return {employeeId:'operator',role:'employee'}};
sandbox.doPost({postData:{contents:JSON.stringify({action:'saveShiftWorkTimeMaster',sessionToken:'employee'})}});
assert.equal(requestedRole,'admin');
// ログイン時に使用されなくなった期限切れセッションを削除する。
keys.SHIFT_SESSION_EXPIRED=JSON.stringify({expiresAtMs:1});
keys.SHIFT_SESSION_CURRENT=JSON.stringify({expiresAtMs:Date.now()+100000});
sandbox.shiftSessionPropertyKey=()=> 'SHIFT_SESSION_NEW';
sandbox.createShiftSession('admin','テスト','operator');
assert.equal(keys.SHIFT_SESSION_EXPIRED,undefined);
assert.ok(keys.SHIFT_SESSION_CURRENT);
// 大きな監査対象も1値の保存上限内に収める。
sandbox.requireShiftSession=()=>({employeeId:'operator',employeeName:'テスト',role:'admin'});
sandbox.Utilities.newBlob=value=>({getBytes:()=>Buffer.from(value,'utf8')});
sandbox.appendShiftAudit({sessionToken:'admin'},'テスト','test','x'.repeat(12000),'y'.repeat(12000));
assert.ok(Buffer.byteLength(sandbox.shiftProps_().getProperty('SHIFT_AUDIT_LOG_JSON'),'utf8')<=200000);
assert.equal(held,false);console.log('PASS: reset allow-list, preview, confirmation, sheet clearing, settings removal');
