// シフトと休み希望を、スプレッドシートに保存・取得するところの確認（メモリ上の簡易シートで実行）
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const {makeFakeSpreadsheet,installSpreadsheetApp}=require('./helpers/fake-sheets.cjs');
const props={STORE_ID:'TEST-ONLY'};
const ctx={console,Utilities:{getUuid:()=>'u'+Math.random().toString(36).slice(2),formatDate:()=>'2026-10-09 00:00:00'},
 PropertiesService:{getScriptProperties:()=>({getProperty:k=>props[k]??null,setProperty:(k,v)=>{props[k]=v},deleteProperty:k=>{delete props[k]},getProperties:()=>({...props})})},
 LockService:{getScriptLock:()=>({tryLock:()=>true,waitLock:()=>{},hasLock:()=>true,releaseLock:()=>{}})}};
vm.createContext(ctx);vm.runInContext(fs.readFileSync('gas/Code.gs','utf8'),ctx);
const book=makeFakeSpreadsheet();installSpreadsheetApp(ctx,book);
Object.assign(ctx,{verifyShiftApiKey(){},createJsonDataResponse:x=>x,createJsonResponse:(success,message)=>({success,message}),appendShiftAudit(){},
 shiftLockHandle_:()=>({tryLock:()=>true,releaseLock(){}})});
const row=(d,c,id='e1',name='藤川')=>({'従業員ID':id,'社員名':name,'日付':d,'シフト内容':c,'休憩時間':'1:00','実働時間':'8:00','備考':'','全体補足種別':'','全体補足内容':''});
const base={shiftApiKey:'x',updatedBy:'管理者',periodStart:'2026-10-01',periodEnd:'2026-10-31'};
const sheet=()=>book.sheets['シフト'];
// 1. 初回保存でシートと見出しが自動で作られ、行が追加される
let r=ctx.saveShiftMonth({...base,shifts:[row('2026-10-05','早番'),row('2026-10-06','遅番'),row('2026-10-05','早番','e2','田中')]});
assert.equal(r.success,true);assert.equal(r.created,3);
assert.equal(sheet().data[0].join(','),'日付,社員名,従業員ID,シフト内容,休憩時間,実働時間,備考,全体補足種別,全体補足内容,最終更新者,更新日時');
assert.equal(sheet().data.length,4);
// 2. 取得すると画面が使う形で返る
let g=ctx.getShifts({});assert.equal(g.success,true);assert.equal(g.shifts.length,3);
const s0=g.shifts.find(s=>s['社員名']==='藤川'&&s['日付'].start==='2026-10-05');
assert.equal(s0['シフト内容'],'早番');assert.equal(s0['従業員ID'],'e1');assert.equal(s0['最終更新者氏名'],'管理者');assert.ok(s0.id);
// 3. 変更なしは書き込まない／変更は更新だけ
book.stats.writes=0;
r=ctx.saveShiftMonth({...base,shifts:[row('2026-10-05','早番')]});assert.equal(r.unchanged,1);assert.equal(r.updated,0);assert.equal(book.stats.writes,0,'変更なしでは書き込まない');
r=ctx.saveShiftMonth({...base,partial:true,shifts:[row('2026-10-05','休み')]});assert.equal(r.updated,1);assert.equal(sheet().data.length,4);
assert.equal(ctx.getShifts({}).shifts.find(s=>s['社員名']==='藤川'&&s['日付'].start==='2026-10-05')['シフト内容'],'休み');
// 4. 全項目が空の行は、既存行を削除する（他の行はずれない）
r=ctx.saveShiftMonth({...base,partial:true,shifts:[row('2026-10-06','')]});assert.equal(r.cleared,1);
g=ctx.getShifts({});assert.equal(g.shifts.length,2);assert.ok(!g.shifts.some(s=>s['日付'].start==='2026-10-06'));
assert.ok(g.shifts.some(s=>s['社員名']==='田中'));
// 5. 追加と削除を同時に行っても整合する
r=ctx.saveShiftMonth({...base,partial:true,shifts:[row('2026-10-05','','e2','田中'),row('2026-10-07','早番')]});
assert.equal(r.created,1);assert.equal(r.cleared,1);g=ctx.getShifts({});assert.equal(g.shifts.length,2);
// 6. 不正な入力は弾く
assert.equal(ctx.saveShiftMonth({...base,shifts:[row('2026-11-05','早番')]}).success,false,'期間外');
assert.equal(ctx.saveShiftMonth({...base,shifts:[row('2026-10-08','早番'),row('2026-10-08','遅番')]}).success,false,'重複');
assert.equal(ctx.saveShiftMonth({...base,updatedBy:'',shifts:[row('2026-10-08','早番')]}).success,false,'保存者名なし');
// 7. 確定済みの期間には保存できない
props.SHIFT_PERIOD_STATUSES_JSON=JSON.stringify({'2026-10-01':{locked:true,periodEnd:'2026-10-31'}});
assert.equal(ctx.saveShiftMonth({...base,shifts:[row('2026-10-09','早番')]}).success,false);
// 確定中の有休が残日数から引かれ、解除で戻る
props.SHIFT_PAID_LEAVE_BALANCES_JSON=JSON.stringify({e1:{enabled:true,remainingDays:5}});
delete props.SHIFT_PERIOD_STATUSES_JSON;
ctx.saveShiftMonth({...base,shifts:[row('2026-10-12','有休'),row('2026-10-13','有休')]});
let rec=ctx.reconcileShiftPaidLeaveForPeriod('2026-10-01','2026-10-31',true);assert.equal(JSON.parse(rec.balancesJson).e1.remainingDays,3);
// 8. 反映待ち用の旧APIは互換のため残り、常に0件
assert.equal(ctx.getShiftPendingStatus({}).count,0);assert.equal(ctx.flushShiftPending({shiftApiKey:'x'}).pending,0);
// 9. 休み希望の控えが「休み希望」シートに作られ、更新・削除に追従する
const req={id:'q1',employeeId:'e1',employeeName:'藤川',date:'2026-10-20',periodStart:'2026-10-01',periodEnd:'2026-10-31',type:'休み希望',comment:'通院',commentVisibility:'all',status:'申請中',submittedAt:'t0',updatedAt:'t0'};
ctx.syncShiftLeaveRequestToSheet_(req);let rs=book.sheets['休み希望'];assert.equal(rs.data.length,2);assert.equal(rs.data[1][0],'q1');
ctx.syncShiftLeaveRequestToSheet_({...req,status:'承認'});assert.equal(rs.data.length,2);assert.equal(rs.data[1][9],'承認');
ctx.syncShiftLeaveRequestToSheet_({...req,id:'q2'});assert.equal(rs.data.length,3);
ctx.removeShiftLeaveRequestFromSheet_('q1');assert.equal(rs.data.length,2);assert.equal(rs.data[1][0],'q2');
// 10. 大きさ：50人×62日（3,100行）の保存・取得（メモリ上）
const many=[];for(let e=0;e<50;e++)for(let d=1;d<=31;d++)many.push(row('2026-10-'+String(d).padStart(2,'0'),'早番','id'+e,'社員'+e));
const t0=Date.now();r=ctx.saveShiftMonth({...base,shifts:many});assert.equal(r.success,true,r.message);
g=ctx.getShifts({});assert.ok(g.shifts.length>=1550);
console.log('PASS: sheet storage (create, read, diff-only writes, delete, validation, lock, paid leave, request mirror, 1,550 rows in '+(Date.now()-t0)+'ms)');
