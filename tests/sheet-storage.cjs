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
ctx.writeShiftLeaveRequestStore('2026-10-01',[req]);let rs=book.sheets['休み希望'];assert.equal(rs.data.length,2);assert.equal(rs.data[1][0],'q1');
ctx.writeShiftLeaveRequestStore('2026-10-01',[{...req,status:'承認'}]);assert.equal(rs.data.length,2);assert.equal(rs.data[1][9],'承認');
ctx.writeShiftLeaveRequestStore('2026-10-01',[{...req,status:'承認'},{...req,id:'q2'}]);assert.equal(rs.data.length,3);
ctx.writeShiftLeaveRequestStore('2026-10-01',[{...req,id:'q2'}]);assert.equal(rs.data.length,2);assert.equal(rs.data[1][0],'q2');
ctx.writeShiftLeaveRequestStore('2026-10-01',[]);assert.equal(rs.data.length,1);
// 10. 大きさ：50人×62日（3,100行）の保存・取得（メモリ上）
const many=[];for(let e=0;e<50;e++)for(let d=1;d<=31;d++)many.push(row('2026-10-'+String(d).padStart(2,'0'),'早番','id'+e,'社員'+e));
const t0=Date.now();r=ctx.saveShiftMonth({...base,shifts:many});assert.equal(r.success,true,r.message);
g=ctx.getShifts({});assert.ok(g.shifts.length>=1550);
console.log('PASS: sheet storage (create, read, diff-only writes, delete, validation, lock, paid leave, request mirror, 1,550 rows in '+(Date.now()-t0)+'ms)');
// 11. 設定は「設定」シートに保存され、秘密の値はシートに出ない。人数の上限もない
{
  const sp=ctx.shiftProps_();
  sp.setProperty('SHIFT_API_KEY','Secret123456');sp.setProperty('SHIFT_PIN_x','hash');sp.setProperty('SHIFT_SESSION_t','{}');
  const staff=Array.from({length:300},(_,i)=>({id:'id'+i,name:'従業員'+i,displayName:'従業員'+i,displayOrder:i+1,active:true,aliases:[],role:''}));
  sp.setProperty('SHIFT_EMPLOYEE_MASTER_JSON',JSON.stringify(staff));
  const cfg=book.sheets['設定'];assert.ok(cfg,'設定シートが作られる');
  const flat=JSON.stringify(cfg.data);
  assert.ok(!flat.includes('Secret123456')&&!flat.includes('SHIFT_PIN_')&&!flat.includes('SHIFT_SESSION_'),'秘密の値はシートに書かない');
  assert.equal(ctx.normalizeShiftEmployeeMaster(JSON.parse(sp.getProperty('SHIFT_EMPLOYEE_MASTER_JSON'))).length,300,'300人でも切り捨てない');
  // 実行をまたいでも読める（メモリを捨てて読み直す）
  ctx.SETTINGS_MEMORY_=null;assert.equal(JSON.parse(ctx.shiftProps_().getProperty('SHIFT_EMPLOYEE_MASTER_JSON')).length,300);
  // 更新は同じ行を上書き、削除は行ごと消える
  const rowsBefore=cfg.data.length;sp.setProperty('SHIFT_EMPLOYEE_MASTER_JSON','[]');assert.equal(book.sheets['設定'].data.length,rowsBefore);
  ctx.SETTINGS_MEMORY_=null;assert.equal(ctx.shiftProps_().getProperty('SHIFT_EMPLOYEE_MASTER_JSON'),'[]');
  sp.deleteProperty('SHIFT_EMPLOYEE_MASTER_JSON');ctx.SETTINGS_MEMORY_=null;assert.equal(ctx.shiftProps_().getProperty('SHIFT_EMPLOYEE_MASTER_JSON'),null);
  // 以前のスクリプト設定にあるデータは自動で読め、保存するとシートへ移る
  props.SHIFT_CYCLE_MASTER_JSON='{"old":1}';assert.equal(ctx.shiftProps_().getProperty('SHIFT_CYCLE_MASTER_JSON'),'{"old":1}');
  ctx.shiftProps_().setProperty('SHIFT_CYCLE_MASTER_JSON','{"new":1}');assert.equal(props.SHIFT_CYCLE_MASTER_JSON,undefined);
  ctx.SETTINGS_MEMORY_=null;assert.equal(ctx.shiftProps_().getProperty('SHIFT_CYCLE_MASTER_JSON'),'{"new":1}');
  // 休み希望は1期間に500件以上でも保存できる
  const many=Array.from({length:500},(_,i)=>({id:'q'+i,employeeId:'e1',employeeName:'藤川',date:'2026-10-20',periodStart:'2026-10-01',periodEnd:'2026-10-31',type:'休み希望',comment:'',status:'申請中',submittedAt:'t',updatedAt:'t'}));
  ctx.writeShiftLeaveRequestStore('2026-10-01',many);assert.equal(ctx.readShiftLeaveRequestStore('2026-10-01').length,500);
}
{
  // 休み希望は「休み希望」シートが本体（更新・削除・古い保存場所からの自動移行）
  const lv=ctx.readShiftLeaveRequestStore('2026-10-01');
  const sh=book.sheets['休み希望'];assert.equal(sh.data.length-1,500,'シートに500行');
  const first=lv[0];first.status='承認';first.desiredWorkStart='09:00';
  ctx.writeShiftLeaveRequestStore('2026-10-01',lv);
  const again=ctx.readShiftLeaveRequestStore('2026-10-01');assert.equal(again[0].status,'承認');assert.equal(again[0].desiredWorkStart,'09:00');
  const f=ctx.findShiftLeaveRequestStore('q7');assert.equal(f.request.id,'q7');assert.equal(f.key,'SHIFT_LEAVE_REQUESTS_2026-10-01');
  ctx.writeShiftLeaveRequestStoreByKey_(f.key,f.items.filter(x=>x.id!=='q7'));
  assert.equal(ctx.readShiftLeaveRequestStore('2026-10-01').length,499);assert.throws(()=>ctx.findShiftLeaveRequestStore('q7'));
  // 別の期間は影響を受けない
  ctx.writeShiftLeaveRequestStore('2026-11-01',[{id:'n1',employeeId:'e1',employeeName:'藤川',date:'2026-11-05',periodStart:'2026-11-01',periodEnd:'2026-11-30',type:'休み希望',status:'申請中',submittedAt:'t',updatedAt:'t'}]);
  assert.equal(ctx.readShiftLeaveRequestStore('2026-10-01').length,499);assert.equal(ctx.readShiftLeaveRequestStore('2026-11-01').length,1);
  // 以前の保存場所にある希望は読み込み時にシートへ移る
  props['SHIFT_LEAVE_REQUESTS_2026-12-01']=JSON.stringify([{id:'old1',employeeId:'e1',employeeName:'藤川',date:'2026-12-03',periodStart:'2026-12-01',periodEnd:'2026-12-31',type:'有給希望',status:'申請中',submittedAt:'t',updatedAt:'t'}]);
  assert.equal(ctx.readShiftLeaveRequestStore('2026-12-01')[0].id,'old1');assert.equal(props['SHIFT_LEAVE_REQUESTS_2026-12-01'],undefined);
  assert.equal(ctx.findShiftLeaveRequestStore('old1').request.type,'有給希望');
}
// 3b. 名前が同じでも、IDが違えば別人（他人の行を上書きしない）
{
  const b2={...base,periodStart:'2026-12-01',periodEnd:'2026-12-31'};
  ctx.saveShiftMonth({...b2,shifts:[row('2026-12-03','早番','idA','藤川')]});
  r=ctx.saveShiftMonth({...b2,shifts:[row('2026-12-03','遅番','idB','藤川')]});
  assert.equal(r.created,1,'IDが違う同名の人の行を上書きしてはいけない');
  const list=ctx.getShifts({}).shifts.filter(x=>x['日付'].start==='2026-12-03');
  assert.equal(list.length,2);assert.equal(list.find(x=>x['従業員ID']==='idA')['シフト内容'],'早番');
  // IDの無い古い行は、名前で同じ人として引き継ぐ
  sheet().data.push(['2026-12-04','古田','','早番','1:00','8:00','','','','管理者','2026-10-09 00:00:00']);
  r=ctx.saveShiftMonth({...b2,shifts:[row('2026-12-04','遅番','idC','古田')]});assert.equal(r.updated,1);assert.equal(r.created,0);
}
console.log('PASS: settings sheet (secrets stay private, 300 staff, 500 requests, migration from old storage)');
