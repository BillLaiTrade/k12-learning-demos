const {test}=require('node:test'),assert=require('node:assert/strict');
const {spawn}=require('node:child_process'),path=require('node:path'),fs=require('node:fs/promises');
const {chromium}=require('playwright');
const materials={source:['雙氧水',.10,.30],flask:['錐形瓶',.31,.30],tank:['水槽',.61,.32],jar:['集氣瓶',.90,.30],catalyst:['二氧化錳',.15,.73],tube:['附塞玻璃導管',.49,.69],plate:['薄玻璃片',.84,.75]};
test('2.3 materials: seven illustrated objects explain identity and experimental role',{timeout:150000},async t=>{
 let server,url=process.env.OXYGEN_MATERIALS_URL;
 if(!url){server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..')});t.after(()=>server.kill());const port=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server timeout')),5000);server.stdout.on('data',b=>{const m=String(b).match(/port (\d+)/);if(m){clearTimeout(timer);resolve(m[1])}});server.once('error',reject)});url=`http://127.0.0.1:${port}/units/2/parts/2.3/`;}
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',...(process.env.OXYGEN_MATERIALS_URL?{proxy:{server:process.env.HTTPS_PROXY||process.env.HTTP_PROXY}}:{})});t.after(()=>browser.close());
 const page=await browser.newPage({viewport:{width:1440,height:1100},reducedMotion:'reduce'});await page.clock.install();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 await page.goto(url,{waitUntil:'networkidle'});await page.waitForFunction(()=>document.querySelector('.oxygen-preparation').dataset.ready==='true');await page.clock.pauseAt(await page.evaluate(()=>Date.now()+100));
 const root=page.locator('.oxygen-preparation'),view=root.locator('[data-step-panel="0"]'),photo=view.locator('.oxygen-materials-photo'),buttons=view.locator('[data-material]'),details=view.locator('[data-material-details]'),tabs=root.locator('[role=tab]');
 const artifacts=process.env.OXYGEN_MATERIALS_ARTIFACT_DIR||'/tmp/unit23-material-exploration';await fs.mkdir(artifacts,{recursive:true});
 async function selected(key){assert.equal(await view.getAttribute('data-material-current'),key);assert.equal(await view.locator('[data-material][aria-pressed="true"]').count(),1);assert.equal(await view.locator(`[data-material="${key}"]`).getAttribute('aria-pressed'),'true');assert.equal(await details.locator('article:visible').count(),1);assert.equal(await details.locator('article:visible h4').innerText(),materials[key][0]);assert.deepEqual(await details.locator('article:visible dt').allTextContents(),['這是什麼','實驗中的作用']);}
 await t.test('native controls connect each object to a persistent two-part introduction; initial state does not autoplay',async()=>{
  assert.equal(await buttons.count(),7);for(const key of Object.keys(materials)){const b=view.locator(`[data-material="${key}"]`);assert.equal(await b.evaluate(e=>e.tagName),'BUTTON');assert.equal(await b.isEnabled(),true);assert.equal(await b.getAttribute('aria-controls'),`oxygen-material-${key}`);assert.match(await b.getAttribute('aria-label'),/介紹與實驗用途/);}
  assert.equal(await details.getAttribute('aria-live'),'polite');await selected('source');await page.clock.fastForward(20000);await selected('source');assert.equal(await root.getAttribute('data-state'),'ready');
 });
 await t.test('actual photo object bodies select all seven introductions, independently of the name labels',async()=>{
  for(const [key,[name,x,y]]of Object.entries(materials)){await photo.scrollIntoViewIfNeeded();const r=await photo.boundingBox();await page.mouse.click(r.x+r.width*x,r.y+r.height*y);await selected(key);assert.equal(await root.getAttribute('data-stage'),'0');assert.match(await root.locator('[role=status]').innerText(),new RegExp(name));}
 });
 await t.test('labels, Enter and Space operate the same native controls and retain keyboard focus',async()=>{
  await view.locator('[data-material="catalyst"] .oxygen-material-label').click();await selected('catalyst');for(const [key,press]of[['tube','Enter'],['plate','Space']]){const b=view.locator(`[data-material="${key}"]`);await b.focus();await page.keyboard.press(press);await selected(key);assert.equal(await b.evaluate(e=>e===document.activeElement),true);assert.equal(await b.evaluate(e=>!!e.closest('[hidden]')),false);}
 });
 await t.test('manual selection stops the optional tour and remains readable; explicitly replaying the tour still works',async()=>{
  await root.locator('[data-play]').click();await page.clock.fastForward(650);await view.locator('[data-material="flask"]').click();assert.equal(await root.getAttribute('data-state'),'ready');assert.match(await root.locator('[data-play]').innerText(),/看看準備/);await page.clock.fastForward(5000);await selected('flask');
  await root.locator('[data-play]').click();await selected('source');await page.clock.fastForward(700);await selected('catalyst');await page.clock.fastForward(700);await selected('jar');await page.clock.fastForward(1000);assert.equal(await root.getAttribute('data-state'),'complete');await selected('jar');
 });
 await t.test('selected knowledge survives leaving and returning to materials; assembly remains its own scene',async()=>{
  await view.locator('[data-material="tank"]').click();await root.locator('[data-next]').click();assert.equal(await root.getAttribute('data-stage'),'1');assert.equal(await view.isVisible(),false);assert.equal(await root.getAttribute('data-peroxide'),'0.0000');await tabs.first().click();await selected('tank');assert.equal(await root.getAttribute('data-state'),'ready');
 });
 await t.test('seven responsive widths keep touch targets within the photo and all introductions within the page',async()=>{
  for(const width of[1440,1280,1024,800,768,390,320]){await page.setViewportSize({width,height:1100});const bounds=await buttons.evaluateAll(ns=>ns.map(n=>{const r=n.getBoundingClientRect(),p=n.parentElement.getBoundingClientRect();return{w:r.width,h:r.height,inside:r.left>=p.left-1&&r.right<=p.right+1&&r.top>=p.top-1&&r.bottom<=p.bottom+1}}));assert.ok(bounds.every(b=>b.w>=44&&b.h>=44&&b.inside),String(width));
   for(const key of Object.keys(materials)){await view.locator(`[data-material="${key}"]`).click();await selected(key);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${width}/${key}`);if([1440,390,320].includes(width))await view.locator('.oxygen-materials-view').screenshot({path:path.join(artifacts,`${key}-${width}.png`)});}
  }
 });
 await t.test('mobile touch and reduced motion select real object bodies and retain the explanation',async()=>{
  const p=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce'});try{await p.goto(url,{waitUntil:'networkidle'});await p.waitForFunction(()=>document.querySelector('.oxygen-preparation').dataset.ready==='true');const image=p.locator('.oxygen-materials-photo');for(const[key,[,x,y]]of Object.entries(materials)){await image.scrollIntoViewIfNeeded();const r=await image.boundingBox();await p.touchscreen.tap(r.x+r.width*x,r.y+r.height*y);assert.equal(await p.locator('[data-step-panel="0"]').getAttribute('data-material-current'),key);assert.equal(await p.locator(`[data-material-info="${key}"]`).isVisible(),true);}assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}finally{await p.close();}
 });
 await t.test('explanations identify oxygen source, catalyst, purge, displacement and covering in the correct order',async()=>{
  const text=key=>view.locator(`[data-material-info="${key}"]`).textContent();assert.match(await text('source'),/過氧化氫的水溶液/);assert.match(await text('source'),/製備氧氣的來源/);assert.match(await text('flask'),/反應容器/);assert.match(await text('tank'),/排回水槽/);assert.match(await text('jar'),/先裝滿水，倒置且瓶口留在水下/);assert.match(await text('catalyst'),/不是氧氣來源/);assert.match(await text('catalyst'),/不增加同量雙氧水的理論總產氧量/);assert.match(await text('tube'),/集氣瓶外的水中.*排出起始混合氣.*再移入瓶口/);assert.match(await text('plate'),/先移開導管，再在水下蓋住瓶口/);
 });
 await t.test('without JavaScript all seven introductions remain readable alongside the original materials photo',async()=>{
  const p=await browser.newPage({javaScriptEnabled:false,viewport:{width:390,height:844}});try{await p.goto(url,{waitUntil:'networkidle'});const first=p.locator('[data-step-panel="0"]');assert.equal(await first.locator('[data-material-info]:visible').count(),7);assert.equal(await first.locator('[data-material-info] dd').count(),14);assert.equal(await first.locator('[data-material]:disabled').count(),7);assert.equal(await first.locator('.oxygen-materials-photo img').evaluate(e=>e.complete&&e.naturalWidth===1536),true);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}finally{await p.close();}
 });
 assert.deepEqual(errors,[]);
});
