const { chromium } = require('playwright-core');
const OUT='/tmp/claude-0/-home-claude-pharmacy-shift-template/3c1163af-3c0a-5b08-973a-86a790700b0d/scratchpad/shots14/';
const staff=[['df38','降旗','薬剤師','pharmacist'],['2a7d','藤川','薬剤師','pharmacist']];
const master=staff.map((s,i)=>({id:s[0],name:s[1],displayName:s[1],displayOrder:i+1,active:true,aliases:[],role:s[2],roleId:s[3]}));
const pat=['9:00～18:00','10:00～19:00','9:00～13:00','休み','9:00～18:00','休み','休み'];
const shifts=[];
for(const [k,s] of staff.map((x,i)=>[i,x])){
  for(let d=new Date('2026-09-01');d<=new Date('2026-12-31');d.setDate(d.getDate()+1)){
    const iso=d.toISOString().slice(0,10);const i=Math.floor((d-new Date('2026-09-01'))/864e5);
    let c=pat[(i+k*2)%7]; if(d.getDay()===0)c='休み';
    shifts.push({id:`${s[0]}-${iso}`,'従業員ID':s[0],'社員名':s[1],'日付':{start:iso},'シフト内容':c,'休憩時間':c==='休み'?'':'1:00','実働時間':'8:00','備考':''});
  }
}
const now=new Date().toISOString();
const leaves=[
 {id:'l1',employeeId:'e2',employeeName:'佐藤',date:'2026-10-14',periodStart:'2026-10-01',periodEnd:'2026-10-31',type:'休み希望',comment:'家族の用事',commentVisibility:'all',status:'申請中',submittedAt:now,updatedAt:now},
 {id:'l2',employeeId:'e3',employeeName:'鈴木',date:'2026-10-21',periodStart:'2026-10-01',periodEnd:'2026-10-31',type:'有給希望',comment:'',commentVisibility:'all',status:'承認',submittedAt:now,updatedAt:now},
 {id:'l3',employeeId:'e4',employeeName:'高橋',date:'2026-10-09',periodStart:'2026-10-01',periodEnd:'2026-10-31',type:'午前休希望',comment:'通院',commentVisibility:'editors',status:'申請中',submittedAt:now,updatedAt:now},
 {id:'l4',employeeId:'e5',employeeName:'田中',date:'2026-10-16',periodStart:'2026-10-01',periodEnd:'2026-10-31',type:'訂正依頼',comment:'9:00～18:00を10:00～19:00に変更希望',commentVisibility:'all',status:'申請中',submittedAt:now,updatedAt:now},
];
function handle(a,b){
  const ok={success:true};
  switch(a){
    case 'getShiftResetEpoch':return {...ok,epoch:''};
    case 'getShiftStoreSettings':return {...ok,settings:{storeName:'',showStoreNameOnHome:true}};
    case 'getShiftLoginEmployees':return {...ok,employees:master};
    case 'getShiftEmployeeMaster':return {...ok,employees:master,revision:'rev1'};
    case 'saveShiftEmployeeMaster':console.log('SAVE',b.revision,JSON.stringify(b.employees.map(e=>[e.name,e.aliases])));return {...ok,employees:b.employees,revision:'rev2'};
    case 'getShiftRoleMaster':return {...ok,roles:[{id:'pharmacist',name:'薬剤師'},{id:'clerk',name:'事務員'},{id:'seller',name:'登録販売者'}]};
    case 'getShiftHomeLayout':return {...ok,layout:{visible:true,columns:[['pharmacist'],['clerk','seller']]}};
    case 'getShiftWorkTimeMaster':return {...ok,master:{revision:'r1',items:[
      {id:'w1',start:'09:00',end:'18:00',nextDay:false,abbreviation:'早番',visible:true},
      {id:'w2',start:'10:00',end:'19:00',nextDay:false,abbreviation:'遅番',visible:true},
      {id:'w3',start:'09:00',end:'13:00',nextDay:false,abbreviation:'午前勤務',visible:true}]}};
    case 'getShiftCycleMaster':return {...ok,master:null};
    case 'getShiftAutoDraftSettings':return {...ok,settings:{enabled:false,started:false,horizonMonths:3}};
    case 'getShiftSpecialDayRules':return {...ok,rules:[{id:'band-v3:closed-0',name:'定休日',color:'red',behavior:'information',enabled:true,mode:'recurring',weekday:0,weeks:[1,2,3,4,5],dates:[],monthDays:[],monthDates:[],showName:true,restMode:'all',restEmployeeIds:[]},{id:'band-v3:x1',name:'休診',color:'blue',behavior:'information',enabled:true,mode:'recurring',weekday:6,weeks:[1,3,5],dates:[],monthDays:[],monthDates:[],showName:true,restMode:'none',restEmployeeIds:[]}]};
    case 'saveShiftSpecialDayRules':console.log('SAVE-SPECIAL',JSON.stringify(b.rules));return {...ok,rules:b.rules};
    case 'getShiftCalendarPeriodSettings':return {...ok,settings:{startDay:21,endDay:20}};
    case 'getShiftStoreBoardVisibility':return {...ok,visibility:'immediate'};
    case 'getShiftCorrectionVisibility':return {...ok,visibility:'all'};
    case 'getShiftAdminNotices':return {...ok,notices:[{id:'n1',text:'10月のシフトは確定済みです。変更希望は訂正依頼から出してください。',visibility:'all',employeeIds:[],createdAt:now}]};
    case 'getShiftAdminNoticeVisibility':return {...ok,visibility:'all'};
    case 'getShifts':return {...ok,shifts};
    case 'getShiftHolidays':return {...ok,holidays:['2026-10-11','2026-10-18','2026-10-25','2026-11-03']};
    case 'getShiftPeriodStatus':return {...ok,locked:false};
    case 'getShiftLeaveRequests':return {...ok,requests:leaves.filter(l=>b.periodStart&&l.periodStart===b.periodStart)};
    case 'getShiftPaidLeaveBalance':return {...ok,balance:{employeeId:b.employeeId,enabled:true,remainingDays:12,renewalDate:'2027-04-01',grantDays:20,updatedAt:now}};
    default:return ok;
  }
}
async function run(role,vp,shots,prefix,emp){
  const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const ctx=await br.newContext({viewport:vp,deviceScaleFactor:1,locale:'ja-JP',timezoneId:'Asia/Tokyo'});
  await ctx.addInitScript(([role,emp])=>{
    const ns='shift-tool:v1:/:';
    localStorage.setItem(ns+'shift_app_session',JSON.stringify({token:'mock',role,employeeId:emp[0],employeeName:emp[1],expiresAt:new Date(Date.now()+864e5*7).toISOString()}));
    if(role==='admin')localStorage.setItem(ns+'shift_api_key','mock');
  },[role,emp]);
  const page=await ctx.newPage();page.on('dialog',d=>d.accept().catch(()=>{}));
  page.on('console',m=>{if(m.type()==='error')console.log(prefix,'console:',m.text().slice(0,150))});
  await page.route('**/version.json*',r=>r.fulfill({status:404,body:''}));
  await page.route('https://script.google.com/**',async r=>{
    let b={};try{b=JSON.parse(r.request().postData()||'{}')}catch{}
    await r.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(handle(b.action,b))});
  });
  await page.goto('http://127.0.0.1:5199/',{waitUntil:'networkidle'});
  await page.waitForTimeout(1500);
  for(const [file,fn] of shots){
    try{ await fn(page); await page.waitForTimeout(1200);
      await page.setViewportSize(vp);await page.waitForTimeout(300);
      const extra=await page.evaluate(()=>{let m=0;document.querySelectorAll('*').forEach(e=>{const o=getComputedStyle(e).overflowY;if((o==='auto'||o==='scroll')&&e.scrollHeight>e.clientHeight)m=Math.max(m,e.scrollHeight-e.clientHeight)});return m});
      if(false){await page.setViewportSize({width:vp.width,height:Math.min(vp.height+extra+20,4500)});await page.waitForTimeout(600);}
      await page.screenshot({path:OUT+file,fullPage:false}); console.log('ok',file,extra);
    }catch(e){console.log('FAIL',file,e.message.split('\n')[0]);await page.screenshot({path:OUT+'FAIL-'+file,fullPage:true}).catch(()=>{});}
  }
  await br.close();
}

const nav=async(p,t)=>{await p.getByRole('button',{name:'設定'}).first().click();await p.waitForTimeout(500);await p.getByText(t,{exact:true}).first().click();};
(async()=>{
  await run('admin',{width:390,height:844},[
    ['P1-overall.png',async p=>{await p.getByRole('button',{name:'全体'}).first().click();await p.waitForTimeout(800);await p.evaluate(()=>{const w=document.querySelector('.dashboard-table-wrap');w.scrollTop=300;});await p.waitForTimeout(700);}],
    ['P2-personal.png',async p=>{await p.getByRole('button',{name:'シフト作成'}).first().click();await p.waitForTimeout(800);const b=p.getByRole('button',{name:/降旗|藤川/}).first();await b.click().catch(()=>{});await p.waitForTimeout(800);await p.getByText('10/04',{exact:true}).first().scrollIntoViewIfNeeded();await p.waitForTimeout(500);}],
    ['P3-employee-float.png',async p=>{await nav(p,'従業員マスタ');await p.getByRole('button',{name:'従業員追加'}).click();await p.waitForTimeout(800);}],
    ['P4-special.png',async p=>{await p.goto('http://127.0.0.1:5199/');await p.waitForTimeout(1500);await nav(p,'シフトマスタ');await p.getByText('お店のお休みの日・色付け',{exact:true}).first().click();await p.waitForTimeout(500);await p.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));}],
  ],'P',['df38','降旗']);
})();
