const {test}=require('node:test'),assert=require('node:assert/strict'),{spawn}=require('node:child_process'),path=require('node:path'),fs=require('node:fs/promises'),{chromium}=require('playwright');
test('2.3 oxygen: real 3D continuous apparatus and shared splint clock',{timeout:240000},async t=>{
 let server,url=process.env.OXYGEN_URL;
 if(!url){server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..')});t.after(()=>server.kill());const port=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server timeout')),5000);server.stdout.on('data',b=>{const m=String(b).match(/port (\d+)/);if(m){clearTimeout(timer);resolve(m[1])}});});url=`http://127.0.0.1:${port}/units/2/parts/2.3/`;}
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--enable-unsafe-swiftshader'],...(process.env.OXYGEN_URL?{proxy:{server:process.env.HTTPS_PROXY}}:{})});t.after(()=>browser.close());
 const page=await browser.newPage({viewport:{width:1440,height:1100}});await page.clock.install();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.url())});await page.goto(url,{waitUntil:'networkidle'});
 const top=page.locator('.oxygen-preparation'),view=page.locator('.oxygen-3d-preparation'),bottom=page.locator('.oxygen-comparison'),pair=page.locator('.oxygen-3d-comparison');
 await page.waitForFunction(()=>document.querySelector('.oxygen-3d-comparison').dataset.ready==='true');await page.clock.pauseAt(await page.evaluate(()=>Date.now()+100));
 const artifacts=process.env.OXYGEN_THREE_ARTIFACT_DIR||'/tmp/unit23-oxygen-three-view';await fs.mkdir(artifacts,{recursive:true});
 const sample=()=>view.evaluate(el=>({...el.dataset}));
 await t.test('both displays render WebGL rather than showing fallback drawings',async()=>{
  assert.equal(await top.locator('canvas').count(),1);assert.equal(await bottom.locator('canvas').count(),1);
  assert.equal(await view.evaluate(el=>!!el.querySelector('canvas').getContext('webgl2')),true);
  assert.equal(await page.locator('.oxygen-drawing>svg').evaluate(el=>getComputedStyle(el).visibility),'hidden');
  assert.equal((await sample()).waterHeight,'0.0000');
 });
 await t.test('purge bubbles stay outside the full jar; the tube moves continuously before water drops',async()=>{
  await top.locator('[data-stage="1"]').click();await page.clock.fastForward(600);let state=await sample();assert.ok(+state.bubbles>0);assert.equal(+state.tipX,.86);assert.equal(+state.waterHeight,1.75);
  await top.screenshot({path:path.join(artifacts,'purging-1440.png')});
  await top.locator('[data-stage="2"]').click();const tips=[];for(let i=0;i<5;i++){await page.clock.fastForward(100);tips.push(+(await sample()).tipX)}
  assert.ok(tips.every((v,i)=>!i||v>tips[i-1]),JSON.stringify(tips));assert.ok(tips[0]>.86&&tips.at(-1)<=1.93);
  await page.clock.fastForward(1200);state=await sample();assert.ok(+state.waterHeight>0&&+state.waterHeight<1.75);assert.ok(+state.bubbles>0);assert.ok(Number.isFinite(+state.ripple));
  await top.screenshot({path:path.join(artifacts,'collecting-1440.png')});
 });
 await t.test('pausing freezes actual WebGL pixels and resuming changes the water surface',async()=>{
  await top.locator('[data-pause]').click();await page.clock.fastForward(100);const before=await sample(),pixels=await view.locator('canvas').screenshot();await page.clock.fastForward(800);
  assert.deepEqual(await sample(),before);assert.ok(pixels.equals(await view.locator('canvas').screenshot()));
  await top.locator('[data-play]').click();await page.clock.fastForward(300);assert.ok(+(await sample()).waterHeight<+before.waterHeight);assert.ok(!pixels.equals(await view.locator('canvas').screenshot()));
 });
 await t.test('the tube withdraws before the glass plate slides under the jar; results persist',async()=>{
  await top.locator('[data-stage="3"]').click();await page.clock.fastForward(150);let first=await sample();assert.ok(+first.tipX<1.93&&+first.tipX>.86);assert.ok(+first.coverX>2.9);
  await page.clock.fastForward(650);let second=await sample();assert.equal(+second.tipX,.86);assert.ok(+second.coverX<+first.coverX);
  await page.clock.fastForward(1500);assert.equal(await top.getAttribute('data-state'),'complete');assert.equal(+(await sample()).coverX,1.93);assert.equal(+(await sample()).waterHeight,0);
 });
 await t.test('two 3D wooden splints share the movement and ignition clock, including frozen flame',async()=>{
  await bottom.scrollIntoViewIfNeeded();await bottom.locator('[data-compare-play]').click();await page.clock.fastForward(600);const before=await pair.evaluate(el=>({...el.dataset}));assert.ok(+before.stickY>2.05);assert.equal(+before.flame,0);
  await page.clock.fastForward(1500);const after=await pair.evaluate(el=>({...el.dataset}));assert.equal(+after.stickY,2.05);assert.ok(+after.flame>0&&+after.flame<1);
  await bottom.locator('[data-compare-pause]').click();const pixels=await pair.locator('canvas').screenshot();await page.clock.fastForward(900);assert.ok(pixels.equals(await pair.locator('canvas').screenshot()));
  await bottom.locator('[data-compare-play]').click();await page.clock.fastForward(5000);assert.equal(await pair.getAttribute('data-flame'),'1.0000');await bottom.screenshot({path:path.join(artifacts,'comparison-1440.png')});
 });
 await t.test('mobile and narrow canvases resize without losing labels, controls or side-by-side samples',async()=>{
  for(const width of[1024,390,320]){await page.setViewportSize({width,height:1000});await top.scrollIntoViewIfNeeded();await page.clock.fastForward(100);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await top.screenshot({path:path.join(artifacts,`preparation-${width}.png`)});await bottom.screenshot({path:path.join(artifacts,`comparison-${width}.png`)});const jars=await bottom.locator('figure').evaluateAll(ns=>ns.map(n=>n.getBoundingClientRect().top));assert.ok(Math.abs(jars[0]-jars[1])<1);}
 });
 await t.test('WebGL absence keeps the original visible results and functional replay',async()=>{
  const p=await browser.newPage();try{await p.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(name,...args){return name.startsWith('webgl')?null:original.call(this,name,...args)}});await p.goto(url,{waitUntil:'networkidle'});await p.waitForFunction(()=>document.querySelector('#s3').dataset.renderer==='svg-fallback');assert.equal(await p.locator('.oxygen-drawing>svg').evaluate(el=>getComputedStyle(el).visibility),'visible');await p.locator('.oxygen-preparation [data-play]').click();await p.waitForFunction(()=>document.querySelector('.oxygen-preparation').dataset.state==='playing');assert.equal(await p.locator('.oxygen-comparison .oxygen-flame').last().getAttribute('opacity'),'1');}finally{await p.close()}
 });
 assert.deepEqual(errors,[]);
});
