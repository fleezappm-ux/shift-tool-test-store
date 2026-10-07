const fs=require('fs'),vm=require('vm'),assert=require('assert');
const props={STORE_ID:'TEST-ONLY'};
const ctx={console,Utilities:{getUuid:()=>'u'},
 PropertiesService:{getScriptProperties:()=>({getProperty:k=>props[k]??null,setProperty:(k,v)=>{props[k]=v},deleteProperty:k=>{delete props[k]}})},
 LockService:{getScriptLock:()=>({tryLock:()=>true,waitLock:()=>{},hasLock:()=>true,releaseLock:()=>{}})}};
vm.createContext(ctx);vm.runInContext(fs.readFileSync('gas/Code.gs','utf8'),ctx);
let ops=[],fail=false,existing=[];
Object.assign(ctx,{verifyShiftApiKey(){},createJsonDataResponse:x=>x,createJsonResponse:(success,message)=>({success,message}),appendShiftAudit(){},ensureShiftSchema_(){},
 shiftLockHandle_:()=>({tryLock:()=>true,releaseLock(){}}),
 getShiftManagementSettings:()=>({apiKey:'k',databaseId:'d'}),
 queryNotionDatabase:()=>existing,
 runNotionBatch_:(_k,o)=>{if(fail)throw new Error('Notion down');ops.push(...o)}});
const row=(d,c)=>({'従業員ID':'e1','社員名':'藤川','日付':d,'シフト内容':c,'休憩時間':'','実働時間':'','備考':'','全体補足種別':'','全体補足内容':''});
const base={shiftApiKey:'x',updatedBy:'管理者',periodStart:'2026-10-01',periodEnd:'2026-10-31',partial:true};
// 1. defer
let r=ctx.saveShiftMonth({...base,defer:true,shifts:[row('2026-10-05','早番')]});
assert.equal(r.success,true);assert.equal(r.queued,true);assert.equal(ops.length,0);
assert.equal(ctx.getShiftPendingStatus({}).count,1);
// overlay shows pending, replaces old Notion row
const notionRow={id:'p1','社員名':'藤川','従業員ID':'e1','日付':{start:'2026-10-05'},'シフト内容':'遅番'};
let shifts=ctx.overlayShiftPending_([notionRow]);
assert.equal(shifts.length,1);assert.equal(shifts[0]['シフト内容'],'早番');
// 2. flush fails -> kept + error recorded
fail=true;let f=ctx.flushShiftPending({shiftApiKey:'x'});
assert.equal(f.success,false);let st=ctx.getShiftPendingStatus({});assert.equal(st.count,1);assert.match(st.lastError,/Notion down/);
// 3. flush ok
fail=false;f=ctx.flushShiftPending({shiftApiKey:'x'});
assert.equal(f.success,true);assert.equal(ctx.getShiftPendingStatus({}).count,0);assert.equal(ops.length,1);
// 4. defer then sync save merges, newest wins, pending cleared
ops=[];ctx.saveShiftMonth({...base,defer:true,shifts:[row('2026-10-06','早番')]});
r=ctx.saveShiftMonth({...base,shifts:[row('2026-10-07','遅番'),row('2026-10-06','休み')]});
assert.equal(r.success,true);assert.equal(ops.length,2);assert.equal(ctx.getShiftPendingStatus({}).count,0);
assert.ok(ops.some(o=>JSON.stringify(o.body).includes('休み'))&&!ops.some(o=>JSON.stringify(o.body).includes('早番')));
// 5. invalid date rejected at queue time
r=ctx.saveShiftMonth({...base,defer:true,shifts:[row('2026-11-05','早番')]});assert.equal(r.success,false);
console.log('PASS: pending queue (defer, overlay, flush failure kept, merge on sync save)');
