const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');
const fs=require('node:fs/promises');
const {chromium}=require('playwright');

test('4.3 normal incidence desk and folding explanation work as approved',{timeout:120000},async t=>{
 const {comparisonMs,durationMs}=await import('../units/4/parts/4.3/assets/normal-incidence-model.mjs');
 let base=process.env.LESSON_BASE_URL;
 if(!base){
  const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:['ignore','pipe','ignore']});t.after(()=>server.kill());
  const port=await new Promise((resolve,reject)=>{let out='';const timer=setTimeout(()=>reject(Error('server timeout')),5000);server.stdout.on('data',data=>{out+=data;const m=out.match(/port (\d+)/);if(m){clearTimeout(timer);resolve(m[1]);}});server.on('error',reject);});
  base=`http://127.0.0.1:${port}/units/4/parts/4.3/`;
 }
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox'],...(process.env.LESSON_USE_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{})});t.after(()=>browser.close());
 const page=await browser.newPage({viewport:{width:1440,height:1100},reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>errors.push(r.url()));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 await page.clock.install();await page.goto(base);
 await page.waitForFunction(()=>document.querySelector('#normal-lab')?.dataset.state==='idle');
 await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now())+100));
 const lab=page.locator('#normal-lab'),details=page.locator('#normal-explanation'),summary=details.locator('summary');
 const fronts=()=>page.locator('.normal-lane').evaluateAll(es=>es.map(e=>Number(e.dataset.frontY)));
 const run=async()=>{await page.locator('#normal-start').click();await page.clock.runFor(100);};
 const finish=async()=>{for(let i=0;i<2&&await lab.getAttribute('data-state')!=='complete';i++){if(await lab.getAttribute('data-state')==='paused')await page.locator('#normal-pause').click();await page.clock.runFor(durationMs+200);}assert.equal(await lab.getAttribute('data-state'),'complete');};
 const captures=process.env.NORMAL_CAPTURE_DIR;if(captures)await fs.mkdir(captures,{recursive:true});
 await t.test('idle scene has no emitted light, dotted particles, autoplay or open explanation',async()=>{
  assert.equal(await details.getAttribute('open'),null);assert.equal(await page.locator('.normal-beam[visibility="hidden"]').count(),3);
  assert.equal(await page.locator('#normal-scene circle').count(),0);assert.equal(await page.locator('#normal-scene .pulse').count(),0);
  assert.equal(await page.locator('.normal-actions button').count(),2);
  assert.equal(await page.locator('#normal-pause').isDisabled(),true);
  assert.equal(await page.locator('#normal-cart').getAttribute('transform'),'translate(0 82)');
  await page.clock.runFor(600);assert.deepEqual(await fronts(),[240,240,240]);
  await page.locator('#normal-background').evaluate(el=>el.decode());
  assert.equal(await page.locator('#normal-background').evaluate(el=>el.naturalWidth),1536);
  assert.match(await lab.innerText(),/未放慢播放/);assert.equal(await page.locator('#normal-time').innerText(),'0.00');assert.equal(await page.locator('#normal-distance').innerText(),'150 萬公里');assert.match(await page.locator('#normal-route-split').innerText(),/75.*75/);assert.doesNotMatch(await lab.innerText(),/間距/);
  assert.equal(await page.locator('#s2 .normal-next').count(),0);assert.equal(await page.locator('.normal-name').count(),3);assert.equal(await page.locator('[data-medium=air] .normal-interface').count(),0);assert.equal(await page.locator('[data-medium=air] .normal-reference').count(),0);
  assert.ok(await page.locator('.normal-steps').evaluate(el=>el.getBoundingClientRect().bottom<=document.querySelector('#normal-viewport').getBoundingClientRect().top));
  if(captures)await page.locator('#s2').screenshot({path:path.join(captures,'1440-idle-collapsed.png')});
 });
 await t.test('continuous beams launch together and stay on the same axis across the interface',async()=>{
  await run();await page.clock.runFor(300);const air=await fronts();assert.ok(air[0]>240&&air[0]<484);assert.equal(air[0],air[1]);assert.equal(air[1],air[2]);
  await page.clock.runFor(2600);const below=await fronts();assert.ok(below[0]>below[1]&&below[1]>below[2]&&below[2]>484);
  const geometry=await page.locator('.normal-beam line').evaluateAll(es=>es.map(e=>[e.getAttribute('x1'),e.getAttribute('x2'),e.getAttribute('y1'),e.getAttribute('y2')]));
  geometry.forEach(g=>{assert.equal(g[0],g[1]);assert.equal(g[2],'240');assert.ok(Number(g[3])>484);});
  assert.equal(await page.locator('[data-normal-stage="2"]').getAttribute('aria-current'),'step');
 });
 await t.test('pause freezes both fronts and resume continues the saved progress',async()=>{
  await page.locator('#normal-pause').click();const stopped=await fronts(),stoppedClock=await page.locator('#normal-time').innerText();assert.equal(await lab.getAttribute('data-state'),'paused');
  await page.clock.runFor(1500);assert.deepEqual(await fronts(),stopped);assert.equal(await page.locator('#normal-time').innerText(),stoppedClock);
  assert.match(await page.locator('#normal-pause').innerText(),/繼續/);
  if(captures)await page.locator('#s2').screenshot({path:path.join(captures,'1440-paused-collapsed.png')});
  await page.locator('#normal-pause').click();await page.clock.runFor(200);assert.ok((await fronts())[0]>stopped[0]);
 });
 await t.test('air arrival pauses exactly once at one common instant, even across many frames',async()=>{
  await page.clock.runFor(6000);
  assert.equal(await lab.getAttribute('data-state'),'paused');assert.equal(await lab.getAttribute('data-pause-reason'),'comparison');
  assert.ok(Math.abs(Number(await lab.getAttribute('data-elapsed-ms'))-comparisonMs)<1e-8);
  const frozen=await fronts();assert.equal(frozen[0],728);assert.ok(Math.abs(frozen[1]-667)<1e-8);assert.ok(Math.abs(frozen[2]-(646+2/3))<1e-8);
  assert.equal(await page.locator('[data-normal-stage="3"]').getAttribute('aria-current'),'step');
  assert.equal(await page.locator('#normal-state').innerText(),'同一瞬間・已暫停');assert.equal(await page.locator('#normal-time').innerText(),'5.00');assert.deepEqual(await page.locator('.normal-arrival-time').allTextContents(),['約 5.00 秒','—','—']);
  assert.deepEqual(await page.locator('.normal-arrival-status').allTextContents(),['先到達','尚未到達','尚未到達']);
  assert.equal(await page.locator('#normal-start').isDisabled(),true);
  await page.clock.runFor(2500);assert.deepEqual(await fronts(),frozen);
  if(captures)await page.locator('#s2').screenshot({path:path.join(captures,'1440-comparison-collapsed.png')});
 });
 await t.test('continuing the comparison finishes all three rays without a second automatic stop',async()=>{
  const frozen=await fronts();await page.locator('#normal-pause').click();await page.clock.runFor(200);
  const next=await fronts();assert.equal(next[0],728);assert.ok(next[1]>frozen[1]&&next[2]>frozen[2]);
  await page.clock.runFor(700);assert.deepEqual(await page.locator('.normal-arrival-time').allTextContents(),['約 5.00 秒','約 5.83 秒','—']);
  await finish();assert.deepEqual(await fronts(),[728,728,728]);assert.equal(await page.locator('#normal-time').innerText(),'6.25');assert.deepEqual(await page.locator('.normal-arrival-time').allTextContents(),['約 5.00 秒','約 5.83 秒','約 6.25 秒']);
  assert.equal(await page.locator('#normal-pause').isDisabled(),true);assert.equal(await page.locator('#normal-start').isEnabled(),true);
  assert.equal(await page.locator('.normal-direction[visibility="hidden"]').count(),3);
 });
 await t.test('same launch button starts a fresh run and offscreen or hidden pages preserve progress',async()=>{
  await run();assert.ok((await fronts())[0]<280);assert.ok(Number(await page.locator('#normal-time').innerText())<.3);assert.deepEqual(await page.locator('.normal-arrival-time').allTextContents(),['—','—','—']);assert.equal(await lab.getAttribute('data-comparison-passed'),'false');
  await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.clock.runFor(100);
  await page.waitForFunction(()=>document.querySelector('#normal-lab').dataset.state==='paused');
  const stopped=await fronts();await page.clock.runFor(1000);assert.deepEqual(await fronts(),stopped);
  await page.locator('#normal-pause').click();await page.clock.runFor(100);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  assert.equal(await lab.getAttribute('data-state'),'paused');const hidden=await fronts();await page.clock.runFor(1000);assert.deepEqual(await fronts(),hidden);
  await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});await finish();
 });
 await t.test('native folding control works by keyboard and the cart moves straight, slows and stops when folded',async()=>{
  await summary.focus();await page.keyboard.press('Enter');await page.clock.runFor(50);assert.equal(await details.evaluate(e=>e.open),true);
  assert.equal(await page.locator('#normal-cart').getAttribute('transform'),'translate(0 82)');
  await page.locator('#normal-cart-play').click();await page.clock.runFor(600);const first=Number(await page.locator('#normal-cart').getAttribute('data-y'));assert.ok(first>82&&first<160);
  await page.clock.runFor(1300);const second=Number(await page.locator('#normal-cart').getAttribute('data-y'));assert.ok(second>160);
  assert.match(await page.locator('#normal-cart').getAttribute('transform'),/^translate\(0 /);
  await summary.click();await page.clock.runFor(50);assert.equal(await details.evaluate(e=>e.open),false);
  const frozen=await page.locator('#normal-cart').getAttribute('transform');await page.clock.runFor(1000);assert.equal(await page.locator('#normal-cart').getAttribute('transform'),frozen);
  await summary.click();await page.clock.runFor(50);await page.locator('#normal-cart-play').click();await page.clock.runFor(3000);assert.match(await page.locator('#normal-cart-status').innerText(),/仍直直前進/);
  assert.match(await details.innerText(),/不代表光受到摩擦/);if(captures)await page.locator('#s2').screenshot({path:path.join(captures,'1440-explanation-expanded.png')});
  await summary.click();await page.clock.runFor(50);
 });
 await t.test('seven widths keep controls readable, with only the apparatus scrolling on phones',async()=>{
  await run();await page.clock.runFor(6000);assert.equal(await lab.getAttribute('data-pause-reason'),'comparison');
  const measurements=[];
  for(const width of [1440,1366,1024,820,760,390,320]){
   await page.setViewportSize({width,height:width<760?844:1100});
   await page.locator('#s2').scrollIntoViewIfNeeded();await page.clock.runFor(50);
   const size=await page.locator('#s2').evaluate(el=>({pageOverflow:document.documentElement.scrollWidth>innerWidth,card:el.getBoundingClientRect().width,clipped:[...el.querySelectorAll('button,summary,.normal-time-note')].some(n=>n.scrollWidth>n.clientWidth+1),sceneWidth:el.querySelector('.normal-table').getBoundingClientRect().width,viewportWidth:el.querySelector('.normal-viewport').clientWidth}));
   assert.equal(size.pageOverflow,false,`${width}: page overflow`);assert.equal(size.clipped,false,`${width}: clipped text`);
   if(width<700){assert.ok(size.sceneWidth>size.viewportWidth);await page.locator('#normal-viewport').evaluate(el=>el.scrollLeft=el.scrollWidth);assert.ok(await page.locator('#normal-viewport').evaluate(el=>el.scrollLeft>0));}
   measurements.push({width,...size});
   if(captures&&[1440,1024,390,320].includes(width))await page.locator('#s2').screenshot({path:path.join(captures,`${width}-complete-collapsed.png`)});
   await summary.click();await page.clock.runFor(50);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   if(captures&&[390,320].includes(width))await page.locator('#s2').screenshot({path:path.join(captures,`${width}-expanded.png`)});
   await summary.click();await page.clock.runFor(50);
  }
  if(captures)await fs.writeFile(path.join(captures,'widths.json'),JSON.stringify(measurements,null,2));
 });
 await t.test('failed artwork disables firing, retry recovers, and other sections remain usable',async()=>{
  const failed=await browser.newPage({viewport:{width:1440,height:1000}});
  let block=true;await failed.route('**/normal-incidence-half-air-bench.png*',route=>block?route.abort():route.continue());
  await failed.goto(base);await failed.waitForFunction(()=>document.querySelector('#normal-lab').dataset.state==='error');
  assert.equal(await failed.locator('#normal-start').isDisabled(),true);assert.equal(await failed.locator('#normal-retry').isVisible(),true);
  await failed.locator('[data-ray-lab="enter"] .angle-input').fill('45');await failed.locator('[data-ray-lab="enter"] .angle-input').dispatchEvent('input');assert.match(await failed.locator('[data-ray-lab="enter"] .angle-output').innerText(),/45/);
  block=false;await failed.locator('#normal-retry').click();await failed.waitForFunction(()=>document.querySelector('#normal-lab').dataset.state==='idle');assert.equal(await failed.locator('#normal-start').isEnabled(),true);await failed.close();
 });
 await t.test('opening the explanation starts the analogy with normal motion preferences',async()=>{
  const animated=await browser.newPage({viewport:{width:1440,height:1100},reducedMotion:'no-preference'});
  await animated.clock.install();await animated.goto(base);await animated.waitForFunction(()=>document.querySelector('#normal-lab').dataset.state==='idle');await animated.clock.pauseAt(new Date(await animated.evaluate(()=>Date.now())+100));
  await animated.locator('#normal-explanation summary').click();await animated.clock.runFor(650);
  assert.ok(Number(await animated.locator('#normal-cart').getAttribute('data-y'))>82);
  await animated.locator('#normal-explanation summary').click();await animated.clock.runFor(30);const y=await animated.locator('#normal-cart').getAttribute('data-y');await animated.clock.runFor(1000);assert.equal(await animated.locator('#normal-cart').getAttribute('data-y'),y);await animated.close();
 });
 await t.test('phone touch can fire, pause and expand the explanation',async()=>{
  const touch=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  await touch.clock.install();await touch.goto(base);await touch.waitForFunction(()=>document.querySelector('#normal-lab').dataset.state==='idle');await touch.clock.pauseAt(new Date(await touch.evaluate(()=>Date.now())+100));
  await touch.locator('#normal-start').tap();await touch.clock.runFor(800);await touch.locator('#normal-pause').tap();assert.equal(await touch.locator('#normal-lab').getAttribute('data-state'),'paused');
  await touch.locator('#normal-explanation summary').tap();assert.equal(await touch.locator('#normal-explanation').evaluate(e=>e.open),true);await touch.locator('#normal-explanation summary').tap();assert.equal(await touch.locator('#normal-explanation').evaluate(e=>e.open),false);await touch.close();
 });
 assert.deepEqual(errors,[]);
});
