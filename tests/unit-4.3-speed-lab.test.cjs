const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');
const fs=require('node:fs/promises');
const {chromium}=require('playwright');

test('4.3 fixed-media million-kilometre desk is accurate, operable and matches its artwork',{timeout:120000},async t=>{
 let base=process.env.LESSON_BASE_URL;
 if(!base){
  const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:['ignore','pipe','ignore']});t.after(()=>server.kill());
  const port=await new Promise((resolve,reject)=>{let output='';const timer=setTimeout(()=>reject(Error('server timeout')),5000);server.stdout.on('data',data=>{output+=data;const m=output.match(/port (\d+)/);if(m){clearTimeout(timer);resolve(m[1]);}});server.on('error',reject);});
  base=`http://127.0.0.1:${port}/units/4/parts/4.3/`;
 }
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox'],...(process.env.LESSON_USE_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{})});t.after(()=>browser.close());
 const page=await browser.newPage({viewport:{width:1440,height:1100},reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>errors.push(r.url()));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 await page.clock.install();await page.goto(base);
 await page.waitForFunction(()=>document.querySelector('#speed-lab')?.dataset.state==='idle');
 await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now())+100));
 const lab=page.locator('#speed-lab');
 const state=()=>lab.getAttribute('data-state');
 const elapsed=()=>lab.getAttribute('data-elapsed-ms').then(Number);
 const positions=()=>page.locator('.race-pulse').evaluateAll(es=>es.map(e=>Number(e.getAttribute('cx'))));
 const arrived=()=>page.locator('.race-lane').evaluateAll(es=>es.map(e=>e.dataset.arrived==='true'));
 await t.test('artwork loads, media are fixed, and geometry has equal routes',async()=>{
  assert.deepEqual(await page.locator('#race-background').evaluate(e=>[e.naturalWidth,e.naturalHeight]),[2022,778]);
  assert.equal(await page.locator('.race-material').allTextContents().then(a=>a.join('、')),'空氣、水、玻璃');
  assert.match(await page.locator('.race-distance').innerText(),/100 萬公里/);
  assert.equal(await page.locator('#s1 input,#s1 select,[data-medium-card]').count(),0);
  assert.equal(await page.locator('.race-actions button').count(),3);
  assert.deepEqual(await positions(),[448,448,448]);
  await page.clock.runFor(1000);assert.equal(await elapsed(),0);
  assert.equal(await page.locator('#race-pause').isDisabled(),true);
  if(process.env.SPEED_CAPTURE_DIR){await fs.mkdir(process.env.SPEED_CAPTURE_DIR,{recursive:true});await page.locator('.race-table').screenshot({path:path.join(process.env.SPEED_CAPTURE_DIR,'idle-table.png')});}
 });
 await t.test('one second of play is one second of model time with physical distance ratios',async()=>{
  await page.locator('#race-start').click();await page.clock.runFor(1000);
  const ms=await elapsed();assert.ok(ms>=970&&ms<=1030,`elapsed=${ms}`);
  const p=await positions(),distance=p.map(x=>x-448);
  assert.ok(Math.abs(distance[1]/distance[0]-.75)<1e-10);
  assert.ok(Math.abs(distance[2]/distance[0]-2/3)<1e-10);
  assert.equal(await page.locator('#race-start').isDisabled(),true);
  await page.locator('#race-pause').click();
  const paused=await elapsed(),before=await positions();await page.clock.runFor(1200);
  assert.equal(await elapsed(),paused);assert.deepEqual(await positions(),before);
  assert.equal(await state(),'paused');assert.equal(await page.locator('#race-time').innerText(),(Math.floor(paused/10+1e-8)/100).toFixed(2));
  await page.locator('#race-pause').click();await page.clock.runFor(500);
  assert.ok(Math.abs((await elapsed())-paused-500)<35);
 });
 await t.test('three arrivals follow 3.33, 4.44 and 5 seconds, with receivers and no stationary light dots',async()=>{
  await page.locator('#race-reset').click();await page.clock.runFor(3200);assert.deepEqual(await arrived(),[false,false,false]);
  await page.clock.runFor(200);assert.deepEqual(await arrived(),[true,false,false]);
  assert.equal(await page.locator('[data-arrival=air] strong').innerText(),'約 3.33 秒');
  assert.equal(await page.locator('[data-material=air] .race-pulse').getAttribute('visibility'),'hidden');
  assert.equal(await page.locator('[data-material=air] .race-receiver').getAttribute('visibility'),'visible');
  await page.clock.runFor(1000);assert.deepEqual(await arrived(),[true,false,false]);
  await page.clock.runFor(100);assert.deepEqual(await arrived(),[true,true,false]);
  assert.equal(await page.locator('[data-arrival=water] strong').innerText(),'約 4.44 秒');
  await page.clock.runFor(650);assert.deepEqual(await arrived(),[true,true,true]);
  assert.equal(await elapsed(),5000);assert.equal(await state(),'complete');assert.equal(await page.locator('#race-time').innerText(),'5.00');
  assert.equal(await page.locator('[data-arrival=glass] strong').innerText(),'約 5.00 秒');
  assert.equal(await page.locator('#race-pause').isDisabled(),true);
  await page.clock.runFor(500);assert.equal(await elapsed(),5000);
 });
 await t.test('replay clears all old arrivals, and rapid keyboard pause/resume keeps one clock',async()=>{
  await page.locator('#race-reset').click();assert.deepEqual(await arrived(),[false,false,false]);assert.equal(await elapsed(),0);
  for(let i=0;i<4;i++){await page.locator('#race-pause').focus();await page.keyboard.press('Space');assert.equal(await state(),'paused');await page.clock.runFor(100);await page.keyboard.press('Space');assert.equal(await state(),'running');}
  await page.clock.runFor(500);assert.ok((await elapsed())>=480&&(await elapsed())<=550);
  await page.locator('#race-reset').click();assert.equal(await elapsed(),0);
  await page.locator('#race-pause').click();assert.equal(await state(),'paused');
 });
 await t.test('a page-hidden event pauses the shared clock without clearing progress',async()=>{
  await page.locator('#race-reset').click();await page.clock.runFor(700);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  assert.equal(await state(),'paused');const saved=await elapsed();await page.clock.runFor(700);assert.equal(await elapsed(),saved);
  await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
  assert.equal(await state(),'paused');await page.locator('#race-pause').click();await page.clock.runFor(300);assert.ok(Math.abs((await elapsed())-saved-300)<25);
  await page.locator('#race-pause').click();
 });
 await t.test('leaving the section pauses and keeps progress for an explicit resume',async()=>{
  await page.locator('#race-reset').click();await page.clock.runFor(700);
  await page.locator('#s3').evaluate(e=>e.scrollIntoView({block:'start',behavior:'instant'}));await page.clock.runFor(100);
  await page.waitForFunction(()=>document.querySelector('#speed-lab').dataset.state==='paused',null,{polling:50});
  assert.equal(await state(),'paused');const saved=await elapsed();await page.clock.runFor(1000);assert.equal(await elapsed(),saved);
  await page.locator('#s1').scrollIntoViewIfNeeded();await page.clock.runFor(100);assert.equal(await state(),'paused');
  await page.locator('#race-pause').click();await page.clock.runFor(200);assert.ok(await elapsed()>saved);
  await page.locator('#race-pause').click();
 });
 await t.test('seven screen widths retain artwork, readable controls and unclipped times',async()=>{
  const capture=process.env.SPEED_CAPTURE_DIR;if(capture)await fs.mkdir(capture,{recursive:true});
  const measurements=[];
  for(const width of [1536,1440,1366,1024,820,390,320]){
   await page.setViewportSize({width,height:1100});await page.locator('#s1').scrollIntoViewIfNeeded();await page.clock.runFor(100);
   await page.locator('#race-reset').click();await page.clock.runFor(2650);await page.locator('#race-pause').click();
   const measure=await lab.evaluate(el=>{const img=el.querySelector('#race-background').getBoundingClientRect(),svg=el.querySelector('#race-scene').getBoundingClientRect(),bounds=el.getBoundingClientRect();return{viewport:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,artworkAligned:Math.abs(img.x-svg.x)<.01&&Math.abs(img.y-svg.y)<.01&&Math.abs(img.width-svg.width)<.01&&Math.abs(img.height-svg.height)<.01,aspect:img.width/img.height,bounds:[bounds.left,bounds.right],textClipped:[...el.querySelectorAll('.race-actions button,.race-arrivals strong,.race-clock')].some(n=>n.scrollWidth>n.clientWidth+1),pulseValues:[...el.querySelectorAll('.race-pulse')].map(e=>Number(e.getAttribute('cx')))};});
   assert.equal(measure.overflow,false);assert.equal(measure.artworkAligned,true);assert.ok(Math.abs(measure.aspect-2022/778)<.01);assert.equal(measure.textClipped,false);assert.ok(measure.bounds[0]>=0&&measure.bounds[1]<=width+1);
   assert.ok(measure.pulseValues[0]>measure.pulseValues[1]&&measure.pulseValues[1]>measure.pulseValues[2]);measurements.push(measure);
   if(capture&&[1536,1440,1024,390,320].includes(width)){
    await page.locator('#s1').screenshot({path:path.join(capture,`${width}-section.png`)});
    await page.locator('.race-table').screenshot({path:path.join(capture,`${width}-table.png`)});
    if(width===1440){const frozen=await page.locator('.race-table').screenshot();await page.clock.runFor(700);assert.deepEqual(await page.locator('.race-table').screenshot(),frozen,'paused artwork and light trails stay pixel-identical');}
   }
  }
  if(capture)await fs.writeFile(path.join(capture,'measurements.json'),JSON.stringify(measurements,null,2)+'\n');
 });
 await t.test('image failure disables the desk, leaves the rest of the lesson working, and can retry',async()=>{
  const p=await browser.newPage();try{
   await p.route('**/light-speed-bench.png*',r=>r.abort());await p.goto(base);
   await p.waitForFunction(()=>document.querySelector('#speed-lab')?.dataset.state==='error');
   assert.equal(await p.locator('#race-start').isDisabled(),true);assert.equal(await p.locator('#race-retry').isVisible(),true);
   assert.ok(await p.locator('#depth-scene circle').count()>0);
   await p.unroute('**/light-speed-bench.png*');await p.locator('#race-retry').click();await p.waitForFunction(()=>document.querySelector('#speed-lab')?.dataset.state==='idle');
   await p.locator('#race-start').click();assert.equal(await p.locator('#speed-lab').getAttribute('data-state'),'running');
  }finally{await p.close();}
 });
 await t.test('touch start, pause and continue work with horizontal desk panning',async()=>{
  const p=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce'});try{
   await p.clock.install();await p.goto(base);await p.waitForFunction(()=>document.querySelector('#speed-lab')?.dataset.state==='idle');
   await p.locator('#race-start').tap();await p.clock.runFor(1000);await p.locator('#race-pause').tap();
   assert.equal(await p.locator('#speed-lab').getAttribute('data-state'),'paused');
   await p.locator('.race-viewport').evaluate(e=>e.scrollLeft=e.scrollWidth);assert.ok(await p.locator('.race-viewport').evaluate(e=>e.scrollLeft>0));
   await p.locator('#race-pause').tap();await p.clock.runFor(300);assert.equal(await p.locator('#speed-lab').getAttribute('data-state'),'running');
  }finally{await p.close();}
 });
 await t.test('a real-time run finishes in five seconds without a browser test clock',async()=>{
  const p=await browser.newPage({viewport:{width:1440,height:1100}});try{
   await p.goto(base);await p.waitForFunction(()=>document.querySelector('#speed-lab')?.dataset.state==='idle');
   await p.locator('#race-start').scrollIntoViewIfNeeded();
   const timing=await p.evaluate(()=>new Promise(resolve=>{const root=document.querySelector('#speed-lab'),begin=performance.now(),events={};const observer=new MutationObserver(()=>{for(const lane of root.querySelectorAll('.race-lane'))if(lane.dataset.arrived==='true'&&!(lane.dataset.material in events))events[lane.dataset.material]=performance.now()-begin;if(root.dataset.state==='complete'){observer.disconnect();resolve({duration:performance.now()-begin,events});}});observer.observe(root,{subtree:true,attributes:true,attributeFilter:['data-arrived','data-state']});document.querySelector('#race-start').click();}));
   assert.ok(Math.abs(timing.duration-5000)<250,JSON.stringify(timing));
   for(const [key,expected] of [['air',10000/3],['water',40000/9],['glass',5000]])assert.ok(Math.abs(timing.events[key]-expected)<250,`${key}: ${JSON.stringify(timing)}`);
   if(process.env.SPEED_CAPTURE_DIR)await fs.writeFile(path.join(process.env.SPEED_CAPTURE_DIR,'real-time.json'),JSON.stringify(timing,null,2)+'\n');
  }finally{await p.close();}
 });
 assert.deepEqual(errors,[]);
});
