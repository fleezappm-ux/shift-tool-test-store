const { chromium } = require('playwright-core');
(async()=>{
  const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const ctx=await br.newContext();
  const ns='pharmacy-shift-template:v1:';
  let epoch='1000';
  await ctx.route('https://script.google.com/**',async r=>{let b={};try{b=JSON.parse(r.request().postData()||'{}')}catch{}
    const body=b.action==='getShiftResetEpoch'?{success:true,epoch}:{success:true};
    await r.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(body)});});
  const page=await ctx.newPage();
  await page.addInitScript(([ns])=>{ if(!sessionStorage.getItem('init')){sessionStorage.setItem('init','1');localStorage.setItem(ns+'store_master_settings','{"storeName":"古い店"}');localStorage.setItem(ns+'shift_api_key','KEY');}},[ns]);
  await page.goto('http://127.0.0.1:5199/',{waitUntil:'networkidle'}); await page.waitForTimeout(2500);
  const get=()=>page.evaluate(ns=>({store:localStorage.getItem(ns+'store_master_settings'),key:localStorage.getItem(ns+'shift_api_key'),seen:localStorage.getItem(ns+'reset_epoch_seen')}),ns);
  console.log('after epoch1000 (first sight):',JSON.stringify(await get()));
  await page.evaluate(ns=>localStorage.setItem(ns+'store_master_settings','{"storeName":"また古い"}'),ns);
  await page.reload({waitUntil:'networkidle'}); await page.waitForTimeout(1500);
  console.log('same epoch, kept:',JSON.stringify(await get()));
  epoch='2000';
  await page.reload({waitUntil:'networkidle'}); await page.waitForTimeout(2500);
  console.log('new epoch2000, cleared:',JSON.stringify(await get()));
  await br.close();
})();
