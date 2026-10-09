// 店舗マスタで営業時間と「ずっといてほしい役職」を決めて保存 → 全体シフトに時間帯の警告が出る。疑似GAS。
const {chromium}=require('playwright-core');
const OUT=process.env.OUT||'/tmp';
const staff=[['df38','降旗','薬剤師','pharmacist'],['2a7d','藤川','事務','clerk']];
const master=staff.map((s,i)=>({id:s[0],name:s[1],displayName:s[1],displayOrder:i+1,active:true,aliases:[],role:s[2],roleId:s[3]}));
const shifts=[];
for(const s of staff)for(let d=new Date('2026-09-01');d<=new Date('2026-12-31');d.setDate(d.getDate()+1)){
  const iso=d.toISOString().slice(0,10);let c=s[0]==='df38'?'9:00～13:00':'9:00～18:00';
  if(d.getDay()===0||d.getDay()===6)c='休み';
  shifts.push({id:`${s[0]}-${iso}`,'従業員ID':s[0],'社員名':s[1],'日付':{start:iso},'シフト内容':c,'休憩時間':c==='休み'?'':'1:00','実働時間':'4:00','備考':''});}
let rules={minTotal:[0,0,0,0,0,0,0],roleMins:[],maxConsecutive:0,people:{},hours:[null,null,null,null,null,null,null],alwaysRoles:[]};let saved=0;
const handle=(a,b)=>{const ok={success:true};switch(a){
 case 'getShiftResetEpoch':return {...ok,epoch:''};
 case 'getShiftLoginEmployees':return {...ok,employees:master};
 case 'getShiftEmployeeMaster':return {...ok,employees:master,revision:'r1'};
 case 'getShiftRoleMaster':return {...ok,roles:[{id:'pharmacist',name:'薬剤師'},{id:'clerk',name:'事務'}]};
 case 'getShiftHomeLayout':return {...ok,layout:{visible:true,columns:[['pharmacist'],['clerk']]}};
 case 'getShiftWorkTimeMaster':return {...ok,master:{revision:'r',items:[{id:'w1',start:'09:00',end:'18:00',nextDay:false,abbreviation:'早番',visible:true}]}};
 case 'getShiftCalendarPeriodSettings':return {...ok,settings:{startDay:1,endDay:0}};
 case 'getShiftStoreSettings':return {...ok,settings:{storeName:'',showStoreNameOnHome:true}};
 case 'getShiftSpecialDayRules':return {...ok,rules:[]};
 case 'getShiftStaffingRules':return {...ok,rules};
 case 'saveShiftStaffingRules':saved++;rules=b.rules;return {...ok,rules};
 case 'getShifts':return {...ok,shifts};
 case 'getShiftHolidays':return {...ok,holidays:[]};
 case 'getShiftPeriodStatus':return {...ok,locked:false};
 case 'getShiftLeaveRequests':return {...ok,requests:[]};
 default:return ok;}};
(async()=>{const br=await chromium.launch({executablePath:process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const ctx=await br.newContext({viewport:{width:390,height:844},locale:'ja-JP',timezoneId:'Asia/Tokyo'});
await ctx.addInitScript(()=>{const ns='shift-tool:v1:/:';localStorage.setItem(ns+'shift_app_session',JSON.stringify({token:'mock',role:'admin',employeeId:'df38',employeeName:'降旗',expiresAt:new Date(Date.now()+864e5*7).toISOString()}));localStorage.setItem(ns+'shift_api_key','mock');});
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept().catch(()=>{}));
await p.route('**/version.json*',r=>r.fulfill({status:404,body:''}));
await p.route('https://script.google.com/**',async r=>{let b={};try{b=JSON.parse(r.request().postData()||'{}')}catch{}
 const out=b.action==='batchShift'?{success:true,results:b.calls.map(c=>handle(c.action,c))}:handle(b.action,b);
 r.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(out)});});
const ok=(l,v)=>console.log(v?'OK ':'NG ',l);
await p.goto('http://127.0.0.1:5199/',{waitUntil:'networkidle'});await p.waitForTimeout(1200);
await p.getByRole('button',{name:'設定'}).first().click();await p.waitForTimeout(500);
await p.getByText('店舗マスタ',{exact:true}).first().click();await p.waitForTimeout(600);
ok('営業時間の欄が店舗マスタにある',await p.locator('[data-business-hours]').count()===1);
for(const d of ['月','火','水','木','金']) await p.getByLabel(`${d}曜は営業する`).check();
await p.getByLabel('薬剤師はいつもいてほしい').check();
await p.screenshot({path:OUT+'/business-hours.png',fullPage:true});
await p.getByRole('button',{name:'営業時間を保存'}).click();await p.waitForTimeout(800);
ok('保存された（月〜金 9:00〜18:00・薬剤師）',saved===1&&rules.hours[1].open==='09:00'&&rules.hours[5].close==='18:00'&&rules.hours[0]===null&&rules.alwaysRoles[0]==='pharmacist');
await p.goto('http://127.0.0.1:5199/',{waitUntil:'networkidle'});await p.waitForTimeout(1200);
await p.getByRole('button',{name:'全体'}).first().click();await p.waitForTimeout(1000);
await p.locator('[data-staffing-warnings] summary').click();
const text=await p.locator('[data-staffing-warnings]').innerText();
ok('午後に薬剤師がいない警告が出る',/薬剤師が 13:00〜18:00 にいません/.test(text));
await p.screenshot({path:OUT+'/business-hours-warning.png'});
console.log('errs',errs);await br.close();})();
