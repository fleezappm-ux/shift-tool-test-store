const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage();const bad=[];
p.on('response',r=>{if(r.status()>=400&&!r.url().includes('script.google.com'))bad.push(r.status()+' '+r.url())});
await p.route('**/script.google.com/**',r=>r.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({success:true,employees:[{id:'1',name:'テスト管理者',displayName:'テスト管理者'}]})}));
await p.goto('http://localhost:5201/myshop/');await p.waitForTimeout(2000);
console.log('title:',await p.title(),'| login field:',await p.locator('input').count()>0,'| bad:',bad.join(',')||'none');
const m=await p.evaluate(()=>fetch(document.querySelector('link[rel=manifest]').href).then(r=>r.status));console.log('manifest',m);
await b.close();})();
