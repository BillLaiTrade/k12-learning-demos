const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const {chromium}=require('playwright');
const {expect}=require('playwright/test');
const root=path.resolve(__dirname,'..');
const capture=process.env.UNIT41_READY_CAPTURE;
const sceneFiles=['aperture-3d.js','shadow-3d.js','shadow-size-3d.js','shadow-theatre.js'];

test('4.1 靜態分享資料對應正式主標題、摘要與開場圖片',async()=>{
 const html=await fs.readFile(path.join(root,'units/4/parts/4.1/index.html'),'utf8');
 const meta=key=>html.match(new RegExp(`<meta (?:name|property)="${key}" content="([^"]+)"`))?.[1];
 const title=html.match(/<title>([^<]+)<\/title>/)[1];
 assert.equal(title,'書頁不發光，我們為什麼看得見它？｜4.1 光與看見');
 for(const key of ['og:title','twitter:title'])assert.equal(meta(key),title);
 for(const key of ['og:description','twitter:description'])assert.equal(meta(key),meta('description'));
 const url='https://billlaitrade.github.io/k12-learning-demos/units/4/parts/4.1/';
 assert.equal(meta('og:url'),url);assert.ok(html.includes(`<link rel="canonical" href="${url}">`));
 const image=meta('og:image');assert.equal(meta('twitter:image'),image);assert.ok(image.endsWith('/assets/unit-1-light-title.png'));
 const png=await fs.readFile(path.join(root,'units/4/parts/4.1/assets/unit-1-light-title.png'));
 assert.equal(Number(meta('og:image:width')),png.readUInt32BE(16));assert.equal(Number(meta('og:image:height')),png.readUInt32BE(20));
 assert.equal(meta('og:image:alt'),meta('twitter:image:alt'));assert.ok(meta('og:image:alt').includes('小葵和阿公'));
 assert.equal(meta('twitter:card'),'summary_large_image');
});

test('4.1 圖片載入、失敗重試、舊請求及3D未就緒控制',{timeout:180000},async t=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});t.after(()=>browser.close());
 const records=[];if(capture)await fs.mkdir(capture,{recursive:true});
 t.after(async()=>{if(capture)await fs.writeFile(path.join(capture,'results.json'),JSON.stringify(records,null,2)+'\n')});
 async function open({moduleGate,imageHandler,actualAperture=false,width=1366}={}){
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage();
  await page.addInitScript(()=>document.addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');s.textContent='html{scroll-behavior:auto!important}';document.head.append(s)}));
  await page.route('**/*',async route=>{
   const url=new URL(route.request().url()),name=decodeURIComponent(url.pathname),base=path.basename(name);
   if(imageHandler&&base.startsWith('night-scene-')&&await imageHandler(route,url))return;
   const file=path.join(root,name.endsWith('/')?name+'index.html':name);
   if(sceneFiles.includes(base)){
    if(moduleGate)await moduleGate;
    if(!actualAperture||base!=='aperture-3d.js')return route.fulfill({contentType:'text/javascript',body:''});
   }
   const contentType=base.endsWith('.mjs')||base.endsWith('.js')?'text/javascript':base.endsWith('.html')?'text/html':undefined;
   await route.fulfill({path:file,...(contentType?{contentType}:{})});
  });
  await page.goto('https://unit41.test/units/4/parts/4.1/',{waitUntil:'domcontentloaded'});return{context,page};
 }
 const ready=page=>expect(page.locator('.night-experiment')).toHaveAttribute('data-night-state','ready');
 async function shot(page,name){if(capture)await page.screenshot({path:path.join(capture,name+'.png')})}

 await t.test('夜間四種正常狀態，圖片與觀察文字一致',async()=>{
  const{context,page}=await open();try{
   await ready(page);await page.locator('#card-02').scrollIntoViewIfNeeded();
   for(const [moon,lamp,file,text]of [[true,true,'both-on','月光和檯燈'],[true,false,'sun-on-lamp-off','關掉檯燈後'],[false,false,'both-off','也就看不到書本'],[false,true,'sun-off-lamp-on','檯燈還亮著']]){
    for(const [sel,value]of [['#moonlight-toggle',moon],['#lamp-toggle',lamp]])if(await page.locator(sel).getAttribute('aria-pressed')!==String(value))await page.locator(sel).click();
    await ready(page);await expect(page.locator('#night-scene-image')).toHaveAttribute('src',new RegExp(`night-scene-${file}.webp`));await expect(page.locator('#night-feedback')).toContainText(text);
    assert.ok(await page.locator('#night-scene-image').evaluate(e=>e.complete&&e.naturalWidth>0));
   }
   records.push({case:'four normal night states',passed:true});
  }finally{await context.close()}
 });
 await t.test('必要圖片失敗，顯示中性狀態；鍵盤重試可恢復',async()=>{
  let fail=true;
  const{context,page}=await open({width:320,imageHandler:async(route,url)=>{if(fail&&url.pathname.endsWith('night-scene-sun-on-lamp-off.webp')){await route.abort();return true}return false}});
  try{
   await ready(page);await page.locator('#lamp-toggle').click();await expect(page.locator('.night-experiment')).toHaveAttribute('data-night-state','failed');
   await expect(page.locator('#night-scene-message')).toContainText('未能載入');await expect(page.locator('#night-feedback')).toContainText('目前無法觀察');await expect(page.locator('#path-legend')).toBeEmpty();
   assert.equal(await page.locator('#night-scene-image').evaluate(e=>getComputedStyle(e).visibility),'hidden');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await shot(page,'night-failed-320');
   fail=false;await page.locator('#night-scene-retry').focus();await page.keyboard.press('Enter');await ready(page);await expect(page.locator('#night-feedback')).toContainText('關掉檯燈後');await expect(page.locator('#night-scene-message')).toBeHidden();await expect(page.locator('#night-scene-image')).toHaveAttribute('src',/retry=1/);
   records.push({case:'failed image and keyboard retry at 320px',passed:true});
  }finally{await context.close()}
 });
 for(const staleFailure of [false,true])await t.test(`快速切換不被先前${staleFailure?'失敗':'成功'}請求覆寫`,async()=>{
  let release;const gate=new Promise(r=>release=r);let held=false;
  const{context,page}=await open({imageHandler:async(route,url)=>{
   if(url.pathname.endsWith('night-scene-sun-on-lamp-off.webp')){held=true;await gate;if(staleFailure){await route.abort();return true}}return false;
  }});
  try{
   await ready(page);await page.locator('#lamp-toggle').click();await expect.poll(()=>held).toBe(true);await expect(page.locator('.night-experiment')).toHaveAttribute('data-night-state','loading');await expect(page.locator('#path-legend')).toBeEmpty();
   await page.locator('#moonlight-toggle').click();await ready(page);await expect(page.locator('#night-scene-image')).toHaveAttribute('src',/night-scene-both-off.webp/);
   release();await page.waitForTimeout(200);await ready(page);await expect(page.locator('#night-scene-image')).toHaveAttribute('src',/night-scene-both-off.webp/);await expect(page.locator('#night-feedback')).toContainText('也就看不到書本');
   records.push({case:staleFailure?'late failure ignored':'late success ignored',passed:true});
  }finally{release();await context.close()}
 });
 await t.test('3D延遲時四區停用控制，孔板初始化後同步恢復',async()=>{
  let release;const gate=new Promise(r=>release=r);const{context,page}=await open({moduleGate:gate,actualAperture:true});
  try{
   const roots=page.locator('[data-scene-state]');assert.equal(await roots.count(),4);
   for(const el of await roots.all()){
    await expect(el).toHaveAttribute('data-scene-state','loading');await expect(el).toHaveAttribute('aria-busy','true');assert.ok(await el.locator('button,input').evaluateAll(es=>es.every(e=>e.disabled)));await expect(el.locator('[data-scene-loading]')).toBeVisible();
   }
   await expect(page.locator('#aperture-result')).toContainText('尚未顯示通光結果');await expect(page.locator('#aperture-offset-output')).toHaveText('載入中');await expect(page.locator('#aperture-3d-scene')).toHaveAttribute('tabindex','-1');
   await page.locator('#card-03').scrollIntoViewIfNeeded();await shot(page,'aperture-pending');release();
   await expect(page.locator('.aperture-lab')).toHaveAttribute('data-scene-state','ready',{timeout:45000});await expect(page.locator('#aperture-offset')).toBeEnabled();await expect(page.locator('#aperture-offset')).toHaveValue('50');await expect(page.locator('#aperture-result')).toContainText('亮點消失');await expect(page.locator('#aperture-3d-scene')).toHaveAttribute('tabindex','0');
   await page.locator('#aperture-offset').fill('0');await page.locator('#aperture-offset').dispatchEvent('input');await expect(page.locator('#aperture-result')).toContainText('完整通過');
   await expect(page.locator('#shadow-theatre-finish')).toBeDisabled();await shot(page,'aperture-ready');records.push({case:'four pending roots and real aperture initialization',passed:true});
  }finally{release();await context.close()}
 });
});
