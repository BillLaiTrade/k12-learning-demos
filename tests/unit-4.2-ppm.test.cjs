const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');
const {chromium}=require('playwright');

test('2.2 ppm: whole-pool water and tiny solute masses show the ppm calculation',{timeout:180000},async t=>{
 const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:['ignore','pipe','ignore']});t.after(()=>server.kill());
 const port=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server timeout')),5000);server.stdout.on('data',s=>{const m=String(s).match(/port (\d+)/);if(m){clearTimeout(timer);resolve(m[1]);}});server.on('error',reject);});
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});t.after(()=>browser.close());
 const page=await browser.newPage({viewport:{width:1440,height:1000},hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 const url=`http://127.0.0.1:${port}/units/2/parts/2.2/`;await page.goto(url+'#s6',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#ppm-lab').dataset.ready==='true');
 const root=page.locator('#ppm-lab'),data=()=>root.evaluate(e=>({...e.dataset}));
 await t.test('the whole pool has a specified volume and estimated mass, with no DPD workflow',async()=>{
  assert.match(await page.locator('#s6 h2').innerText(),/一整池水/);assert.equal(await page.locator('#s6 .dialogue').count(),3);
  assert.equal((await data()).waterVolumeL,'100000');assert.equal((await data()).waterMassG,'100000000');
  assert.match(await page.locator('.pool-volume-figure figcaption').innerText(),/10 公尺.*5 公尺.*2 公尺.*100,000 公升/);
  assert.match(await page.locator('.pool-volume-note').innerText(),/密度以 1 公斤／公升估算/);
  assert.equal(await page.locator('#pool-reagent,.pool-reference,#pool-canvas').count(),0);
 });
 await t.test('pool geometry and whole salt portions retain their physical dimensions',async()=>{
  assert.equal((await data()).renderer,'webgl');
  assert.equal((await data()).geometryWaterLiters,'100000');
  const model=await page.evaluate(async()=>{const m=await import('./assets/ppm-quantity-model.js?v=scale-1');return {pool:m.POOL,liters:m.poolLiters(),salt:m.SALT,portions:[100].map(m.saltPortion)};});
  assert.equal(model.pool.lengthM*model.pool.widthM*model.pool.waterDepthM*1000,model.liters);
  let lastDiameter=0,lastHeight=0;
  for(const p of model.portions){
   assert.ok(Math.abs(p.count*p.edgeM**3*1e6*model.salt.densityGPerCm3-p.massG)<1e-10);
   assert.ok(p.radiusM<model.salt.dishDiameterM/2);assert.ok(p.radiusM>lastDiameter);assert.ok(p.heightM>lastHeight);lastDiameter=p.radiusM;lastHeight=p.heightM;
   assert.equal(p.positions.length,p.count);assert.ok(p.positions.every(v=>Object.values(v).every(Number.isFinite)));
   const d=await data();assert.equal(Number(d.saltGrainCount),p.count);assert.equal(d.sourceScale,'1');assert.equal(d.insetScale,'1');
   assert.ok(Math.abs(Number(d.saltRenderedVolumeM3)*1e6*2.17-p.massG)<1e-10);
  }
  assert.match(await page.locator('.pool-salt-scale').innerText(),/5 公分/);assert.match(await page.locator('.pool-scale-caption').innerText(),/同一尺度.*16 公分/);
  const ruler=await page.locator('.pool-salt-scale').boundingBox(),inset=await page.locator('.pool-salt-inset').boundingBox();assert.ok(Math.abs(ruler.width/inset.width-.05/.24)<.01);
 });
 await t.test('the fixed 100 g example includes solute mass in the denominator',async()=>{
  for(const mass of [100]){
   const d=await data(),total=100000000+mass,ratio=mass/total;
   assert.equal(Number(d.soluteG),mass);assert.equal(Number(d.totalG),total);assert.ok(Math.abs(Number(d.ppm)-ratio*1000000)<1e-12);assert.ok(Math.abs(Number(d.percent)-ratio*100)<1e-15);
   assert.equal(await page.locator('[data-ppm=numerator]').innerText(),`${mass} 克`);assert.equal(await page.locator('[data-ppm=denominator]').innerText(),`${total.toLocaleString('en-US')} 克`);
   assert.equal(await page.locator('[data-ppm=ppm]').innerText(),`≈ ${mass/100} ppm`);assert.match(await page.locator('.pool-total-line').innerText(),/池水.*溶質/);
  }
 });
 await t.test('percentage and ppm are two displays of the same tiny mass ratio',async()=>{
  assert.equal(await page.locator('[data-ppm=percent]').innerText(),'≈ 0.0001%');assert.equal(await page.locator('[data-pool=ppm-short]').innerText(),'≈ 1 ppm');
  assert.match(await page.locator('.pool-million-meaning').innerText(),/100 萬份.*約 1 份/);assert.match(await page.locator('.pool-ppm-closing').innerText(),/同一個濃度.*ppm.*容易閱讀/);
 });
 await t.test('the fixed example has no mass controls and stays separate from the sugar-water recipe',async()=>{
  assert.equal(await page.locator('[data-pool-dose],.pool-dose-controls').count(),0);assert.equal((await data()).soluteG,'100');
  await page.waitForFunction(()=>document.querySelector('#mix-lab').dataset.ready==='true');assert.equal(await page.locator('#mix-lab').getAttribute('data-sugar'),'5');assert.equal(await page.locator('#mix-lab').getAttribute('data-water'),'95');
 });
 await t.test('desktop and narrow views retain all masses and the formula',async()=>{
  for(const width of [1440,1280,1024,850,390,320]){await page.setViewportSize({width,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);for(const selector of ['.pool-mass-comparison','.pool-worked-formula','.pool-notation-comparison'])assert.equal(await page.locator(selector).isVisible(),true);}
 });
 await t.test('dimension labels and the portion inset remain inside the scene at desktop sizes',async()=>{
  for(const width of [1440,1280,1024]){await page.setViewportSize({width,height:1000});await page.waitForTimeout(100);const stage=await page.locator('.pool-volume-scene').boundingBox();for(const selector of ['.pool-salt-inset','.pool-salt-source-label','[data-dimension-label=length]','[data-dimension-label=width]','[data-dimension-label=depth]']){const b=await page.locator(selector).boundingBox();assert.ok(b.x>=stage.x&&b.y>=stage.y&&b.x+b.width<=stage.x+stage.width+1&&b.y+b.height<=stage.y+stage.height+1,`${width}: ${selector}`);}}
 });
 await t.test('a calibrated canvas view and calculation remain available without WebGL',async()=>{
  const failed=await browser.newPage();try{
   await failed.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:original.call(this,type,...args);};});
   await failed.goto(url+'#s6',{waitUntil:'domcontentloaded'});await failed.waitForFunction(()=>document.querySelector('#ppm-lab').dataset.ready==='true');assert.equal(await failed.locator('#ppm-lab').getAttribute('data-renderer'),'canvas');
   assert.equal(await failed.locator('[data-ppm=ppm]').innerText(),'≈ 1 ppm');assert.equal(await failed.locator('#ppm-lab').getAttribute('data-geometry-water-liters'),'100000');assert.equal(await failed.locator('#pool-geometry-canvas').isVisible(),true);
  }finally{await failed.close();}
 });
 assert.deepEqual(errors,[]);
});
