const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');
const {chromium}=require('playwright');

test('2.2 ppm: pool-water DPD readings connect to the same mass ratio',{timeout:180000},async t=>{
 const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:['ignore','pipe','ignore']});t.after(()=>server.kill());
 const port=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server timeout')),5000);server.stdout.on('data',s=>{const m=String(s).match(/port (\d+)/);if(m){clearTimeout(timer);resolve(m[1]);}});server.on('error',reject);});
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});t.after(()=>browser.close());
 const page=await browser.newPage({viewport:{width:1440,height:1000},hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 const url=`http://127.0.0.1:${port}/units/2/parts/2.2/`;await page.goto(url+'#s6',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#ppm-lab').dataset.ready==='true');
 const root=page.locator('#ppm-lab'),data=()=>root.evaluate(e=>({...e.dataset}));
 const choose=key=>page.locator(`[data-pool-sample="${key}"]`).click();
 const react=async()=>{await page.locator('#pool-reagent').click();await page.waitForFunction(()=>document.querySelector('#ppm-lab').dataset.phase==='read');};
 const pixel=()=>page.locator('#pool-canvas').evaluate(c=>{const d=c.getContext('2d').getImageData(Math.round(c.width*616/1536),Math.round(c.height*600/1024),1,1).data;return[...d];});
 await t.test('the fifth section uses the official dialogues and distinguishes mg/L from mass ppm',async()=>{
  assert.match(await page.locator('#s6 h2').innerText(),/泳池水.*餘氯/);assert.equal(await page.locator('#s6 .dialogue').count(),2);
  assert.match(await page.locator('#s6 .pool-unit-note').innerText(),/稀水溶液.*密度約.*1 公斤／公升.*近似/);
  assert.match(await root.innerText(),/同一個濃度概念/);assert.match(await page.locator('.ppm-definition').innerText(),/1 公斤溶液.*1 毫克溶質/);
  assert.equal(await page.locator('#ppm-milligram,#ppm-lens,#ppm-scale-canvas').count(),0);assert.equal(await page.locator('#s5 #mix-lab').count(),1);
 });
 await t.test('clear samples develop progressively; all three readings and mass examples agree',async()=>{
  for(const [key,value] of [['A',1],['B',2],['C',3]]){
   await choose(key);assert.equal((await data()).phase,'fresh');assert.equal((await data()).measured,'');const before=await pixel();
   await page.locator('#pool-reagent').click();assert.equal((await data()).phase,'reacting');assert.equal(await page.locator('#pool-reagent').isDisabled(),true);
   await page.waitForFunction(()=>document.querySelector('#ppm-lab').dataset.phase==='read');const after=await pixel();assert.ok(after[0]-after[1]>before[0]-before[1]+20);
   assert.equal((await data()).measured,String(value));assert.equal((await data()).ppm,String(value));assert.equal((await data()).totalMg,'1000000');
   assert.equal(await page.locator('#pool-reading').innerText(),`${value} mg/L ≈ ${value} ppm`);
   assert.equal(await page.locator('[data-pool-level].is-match').getAttribute('data-pool-level'),String(value));
   assert.equal(await page.locator('[data-ppm=percent]').innerText(),`${value/10000}%`);assert.equal(await page.locator('[data-ppm=ppm]').innerText(),`${value} ppm`);
  }
 });
 await t.test('switching or retaking a sample cancels the previous reaction and preserves the sugar recipe',async()=>{
  await choose('A');await page.locator('#pool-reagent').click();await choose('B');await page.waitForTimeout(1800);assert.equal((await data()).phase,'fresh');assert.equal((await data()).measured,'');
  await react();await page.locator('#pool-reset').click();assert.equal((await data()).phase,'fresh');assert.equal(await page.locator('[data-pool-level].is-match').count(),0);
  await page.waitForFunction(()=>document.querySelector('#mix-lab').dataset.ready==='true');assert.equal(await page.locator('#mix-lab').getAttribute('data-sugar'),'5');assert.equal(await page.locator('#mix-lab').getAttribute('data-water'),'95');
 });
 await t.test('keyboard, touch and responsive layouts retain the full measurement and formula',async()=>{
  await page.locator('[data-pool-sample=C]').focus();await page.keyboard.press('Enter');await page.locator('#pool-reagent').tap();await page.waitForFunction(()=>document.querySelector('#ppm-lab').dataset.phase==='read');
  for(const width of [1440,1280,1024,850,390,320]){await page.setViewportSize({width,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);assert.equal(await page.locator('#pool-reading').isVisible(),true);assert.equal(await page.locator('[data-pool-level]').count(),5);}
 });
 await t.test('a failed scene can be retried without hiding the concentration explanation',async()=>{
  const failed=await browser.newPage();try{await failed.route('**/ppm-pool-water.webp',r=>r.abort());await failed.goto(url+'#s6',{waitUntil:'domcontentloaded'});await failed.waitForFunction(()=>document.querySelector('#ppm-lab').dataset.ready==='error');assert.match(await failed.locator('#ppm-status').innerText(),/無法載入/);assert.equal(await failed.locator('#pool-reagent').isDisabled(),true);assert.equal(await failed.locator('.ppm-definition').isVisible(),true);await failed.unroute('**/ppm-pool-water.webp');await failed.locator('#pool-retry').click();await failed.waitForFunction(()=>document.querySelector('#ppm-lab').dataset.ready==='true');}finally{await failed.close();}
 });
 assert.deepEqual(errors,[]);
});
