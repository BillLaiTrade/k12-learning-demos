const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');
const {chromium}=require('playwright');

test('2.2 ppm: whole-pool water and tiny solute masses show the ppm calculation',{timeout:180000},async t=>{
 const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:['ignore','pipe','ignore']});t.after(()=>server.kill());
 const port=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server timeout')),5000);server.stdout.on('data',s=>{const m=String(s).match(/port (\d+)/);if(m){clearTimeout(timer);resolve(m[1]);}});server.on('error',reject);});
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});t.after(()=>browser.close());
 const page=await browser.newPage({viewport:{width:1440,height:1000},hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 const url=`http://127.0.0.1:${port}/units/2/parts/2.2/`;await page.goto(url+'#s6',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#ppm-lab').dataset.ready==='true');
 const root=page.locator('#ppm-lab'),data=()=>root.evaluate(e=>({...e.dataset}));
 await t.test('the whole pool has a specified volume and estimated mass, with no DPD workflow',async()=>{
  assert.match(await page.locator('#s6 h2').innerText(),/一整池水/);assert.equal(await page.locator('#s6 .dialogue').count(),2);
  assert.equal((await data()).waterVolumeL,'100000');assert.equal((await data()).waterMassG,'100000000');
  assert.match(await page.locator('.pool-volume-figure figcaption').innerText(),/10 公尺.*5 公尺.*2 公尺.*100,000 公升/);
  assert.match(await page.locator('.pool-volume-note').innerText(),/密度以 1 公斤／公升估算/);
  assert.equal(await page.locator('#pool-reagent,.pool-reference,#pool-canvas').count(),0);
 });
 await t.test('each solute mass is included in the denominator before multiplying by one million',async()=>{
  for(const mass of [50,100,200]){
   await page.locator(`[data-pool-dose="${mass}"]`).click();const d=await data(),total=100000000+mass,ratio=mass/total;
   assert.equal(Number(d.soluteG),mass);assert.equal(Number(d.totalG),total);assert.ok(Math.abs(Number(d.ppm)-ratio*1000000)<1e-12);assert.ok(Math.abs(Number(d.percent)-ratio*100)<1e-15);
   assert.equal(await page.locator('[data-ppm=numerator]').innerText(),`${mass} 克`);assert.equal(await page.locator('[data-ppm=denominator]').innerText(),`${total.toLocaleString('en-US')} 克`);
   assert.equal(await page.locator('[data-ppm=ppm]').innerText(),`≈ ${mass/100} ppm`);assert.match(await page.locator('.pool-total-line').innerText(),/池水.*溶質/);
  }
 });
 await t.test('percentage and ppm are two displays of the same tiny mass ratio',async()=>{
  await page.locator('[data-pool-dose="100"]').click();assert.equal(await page.locator('[data-ppm=percent]').innerText(),'≈ 0.0001%');assert.equal(await page.locator('[data-pool=ppm-short]').innerText(),'≈ 1 ppm');
  assert.match(await page.locator('.pool-million-meaning').innerText(),/100 萬份.*約 1 份/);assert.match(await page.locator('.pool-ppm-takeaway').innerText(),/同一個質量比.*四捨五入/);
 });
 await t.test('keyboard and touch choices stay separate from the sugar-water recipe',async()=>{
  await page.locator('[data-pool-dose="200"]').focus();await page.keyboard.press('Enter');assert.equal((await data()).soluteG,'200');await page.locator('[data-pool-dose="50"]').tap();assert.equal((await data()).soluteG,'50');
  await page.waitForFunction(()=>document.querySelector('#mix-lab').dataset.ready==='true');assert.equal(await page.locator('#mix-lab').getAttribute('data-sugar'),'5');assert.equal(await page.locator('#mix-lab').getAttribute('data-water'),'95');
 });
 await t.test('desktop and narrow views retain all masses and the formula',async()=>{
  for(const width of [1440,1280,1024,850,390,320]){await page.setViewportSize({width,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);for(const selector of ['.pool-mass-comparison','.pool-worked-formula','.pool-notation-comparison'])assert.equal(await page.locator(selector).isVisible(),true);}
 });
 await t.test('calculation remains usable if the illustration fails and the image can be retried',async()=>{
  const failed=await browser.newPage();try{await failed.route('**/ppm-whole-pool.webp',r=>r.abort());await failed.goto(url+'#s6',{waitUntil:'domcontentloaded'});await failed.waitForFunction(()=>document.querySelector('#ppm-lab').dataset.image==='error');await failed.locator('[data-pool-dose="200"]').click();assert.equal(await failed.locator('[data-ppm=ppm]').innerText(),'≈ 2 ppm');await failed.unroute('**/ppm-whole-pool.webp');await failed.locator('#pool-image-retry').click();await failed.waitForFunction(()=>document.querySelector('#ppm-lab').dataset.image==='ready');}finally{await failed.close();}
 });
 assert.deepEqual(errors,[]);
});
