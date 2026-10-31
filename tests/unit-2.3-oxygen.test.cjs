const {test}=require('node:test'), assert=require('node:assert/strict');
const {spawn}=require('node:child_process'), path=require('node:path'), fs=require('node:fs/promises');
const {chromium}=require('playwright');
test('2.3 oxygen: continuous collection and simultaneous wood comparison',{timeout:150000},async t=>{
 let server,url=process.env.OXYGEN_URL;
 if(!url){server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..')});t.after(()=>server.kill());const port=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server timeout')),5000);server.stdout.on('data',b=>{const m=String(b).match(/port (\d+)/);if(m){clearTimeout(timer);resolve(m[1]);}});server.once('error',reject);});url=`http://127.0.0.1:${port}/units/2/parts/2.3/`;}
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',...(process.env.OXYGEN_URL?{proxy:{server:process.env.HTTPS_PROXY||process.env.HTTP_PROXY}}:{})});t.after(()=>browser.close());
 const page=await browser.newPage({viewport:{width:1440,height:1100}});await page.clock.install();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 await page.goto(url,{waitUntil:'networkidle'});await page.waitForFunction(()=>document.querySelector('.oxygen-3d-comparison').dataset.ready==='true');await page.clock.pauseAt(await page.evaluate(()=>Date.now()+100));
 const top=page.locator('.oxygen-preparation'),bottom=page.locator('.oxygen-comparison'),play=top.locator('[data-play]'),pause=top.locator('[data-pause]'),reset=top.locator('[data-reset]');
 const artifacts=process.env.OXYGEN_ARTIFACT_DIR||'/tmp/unit23-oxygen';await fs.mkdir(artifacts,{recursive:true});
 await t.test('default results, full width, four upper stages, two lower samples and original characters',async()=>{
  assert.deepEqual(await top.locator('.step-label').allTextContents(),['準備材料','先排空氣','排水集氣','收集完成']);
  assert.equal(await top.getAttribute('data-collected'),'1.0000');assert.equal(await bottom.getAttribute('data-ignition'),'1.0000');
  assert.equal(await bottom.locator('figure').count(),2);assert.equal(await bottom.locator('[data-stage],.sequence-grid,.step-label').count(),0);
  assert.equal(await page.locator('#s4 .dialogue--xiaokui .speaker').first().evaluate(el=>getComputedStyle(el,'::before').backgroundImage.includes('dialogue-character-avatars.png')),true);
  assert.equal(await page.locator('#s4 .grandpa .speaker').first().evaluate(el=>getComputedStyle(el,'::before').backgroundPosition),'100% 50%');
  assert.match(await bottom.innerText(),/木條復燃/);assert.match(await page.locator('#s4').innerText(),/二氧化錳不是氧氣來源/);
 });
 await t.test('four stages synchronize tube path, bubbles, continuous water displacement and cover',async()=>{
  await top.scrollIntoViewIfNeeded();await play.click();await page.clock.fastForward(500);
  assert.equal(await top.getAttribute('data-stage'),'0');assert.equal(await page.locator('#oxygen-stopper').evaluate(e=>e.style.opacity),'0');
  await page.clock.fastForward(1000);assert.equal(await top.getAttribute('data-stage'),'1');
  assert.equal(await page.locator('#oxygen-delivery-tube').getAttribute('d'),'M428 92V183');assert.equal(await top.getAttribute('data-collected'),'0.0000');
  await top.screenshot({path:path.join(artifacts,'purging-1440.png')});
  await page.clock.fastForward(2000);assert.equal(await top.getAttribute('data-stage'),'2');
  assert.match(await page.locator('#oxygen-delivery-tube').getAttribute('d'),/H580V259/);
  await page.clock.fastForward(500);const levels=[];for(let i=0;i<12;i++){await page.clock.fastForward(200);levels.push(Number(await page.locator('#oxygen-jar-water').getAttribute('y')));}
  assert.ok(levels.every((v,i)=>!i||v>levels[i-1]));assert.ok(levels.at(-1)>levels[0]+90);await top.screenshot({path:path.join(artifacts,'collecting-1440.png')});
  await page.clock.fastForward(3000);assert.equal(await top.getAttribute('data-state'),'complete');assert.equal(await top.getAttribute('data-stage'),'3');
  assert.equal(await page.locator('#oxygen-cover').evaluate(e=>e.style.opacity),'1');assert.equal(await top.locator('[aria-current=step]').innerText(),'04\n收集完成');
 });
 await t.test('pause freezes actual water and arrows, resumes and rapid replay cancels prior progress',async()=>{
  await top.locator('[data-stage="2"]').click();await page.clock.fastForward(650);await pause.click();
  const snapshot=await page.locator('#oxygen-jar-water').getAttribute('y'),flow=await page.locator('#oxygen-flow').getAttribute('style');await page.clock.fastForward(1000);
  assert.equal(await page.locator('#oxygen-jar-water').getAttribute('y'),snapshot);assert.equal(await page.locator('#oxygen-flow').getAttribute('style'),flow);
  await play.click();await page.clock.fastForward(250);assert.ok(Number(await page.locator('#oxygen-jar-water').getAttribute('y'))>Number(snapshot));
  await play.click();await page.clock.fastForward(100);assert.equal(await top.getAttribute('data-stage'),'0');
  await reset.click();assert.equal(await top.getAttribute('data-state'),'overview');assert.equal(await top.getAttribute('data-collected'),'1.0000');
 });
 await t.test('both real wooden splints enter together; only oxygen develops a flame',async()=>{
  await bottom.scrollIntoViewIfNeeded();await bottom.locator('[data-compare-play]').click();await page.clock.fastForward(600);
  let transforms=await bottom.locator('.oxygen-splint').evaluateAll(ns=>ns.map(n=>n.getAttribute('transform')));assert.equal(transforms[0],transforms[1]);assert.match(transforms[0],/-\d/);
  assert.equal(await bottom.locator('[data-sample=oxygen] .oxygen-flame').getAttribute('opacity'),'0');
  await page.clock.fastForward(1400);const flame=Number(await bottom.locator('[data-sample=oxygen] .oxygen-flame').getAttribute('opacity'));assert.ok(flame>0&&flame<1);
  assert.equal(await bottom.locator('[data-sample=air] .oxygen-flame').getAttribute('opacity'),'0');
  await bottom.locator('[data-compare-pause]').click();const before=await bottom.locator('[data-sample=oxygen] .oxygen-flame').getAttribute('opacity');await page.clock.fastForward(500);assert.equal(await bottom.locator('[data-sample=oxygen] .oxygen-flame').getAttribute('opacity'),before);
  await bottom.locator('[data-compare-play]').click();await page.clock.fastForward(3000);assert.equal(await bottom.getAttribute('data-state'),'complete');
  assert.equal(await bottom.locator('[data-sample=oxygen] .oxygen-flame').getAttribute('opacity'),'1');
 });
 await t.test('keyboard, Escape, hidden pages and leaving the scene pause without automatic restart',async()=>{
  await top.scrollIntoViewIfNeeded();await play.focus();await page.keyboard.press('Enter');await page.clock.fastForward(500);await page.keyboard.press('Escape');assert.equal(await top.getAttribute('data-state'),'paused');
  await play.click();await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))});assert.equal(await top.getAttribute('data-state'),'paused');
  await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))});assert.equal(await top.getAttribute('data-state'),'paused');
  await play.click();await page.locator('#s2').evaluate(e=>e.scrollIntoView({behavior:'instant'}));await page.clock.fastForward(100);await page.waitForFunction(()=>document.querySelector('.oxygen-preparation').dataset.state==='paused');
  await top.scrollIntoViewIfNeeded();await page.clock.fastForward(500);assert.equal(await top.getAttribute('data-state'),'paused');await reset.click();
 });
 await t.test('seven widths contain diagrams, controls and text; screenshots cover both scenes',async()=>{
  for(const width of[1440,1280,1024,800,768,390,320]){
   await page.setViewportSize({width,height:1100});await top.scrollIntoViewIfNeeded();await page.clock.fastForward(100);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${width} overflow`);
   const jars=await bottom.locator('figure').evaluateAll(ns=>ns.map(n=>{const r=n.getBoundingClientRect();return{top:r.top,left:r.left}}));assert.ok(Math.abs(jars[0].top-jars[1].top)<1&&jars[1].left>jars[0].left,`${width} simultaneous side-by-side comparison`);
   const bounds=await page.locator('#s4').evaluate(el=>{const body=el.querySelector('.lesson-body').getBoundingClientRect();return[...el.querySelectorAll('.oxygen-apparatus,.oxygen-steps,.oxygen-splint-group,.sequence-controls')].map(n=>{const r=n.getBoundingClientRect();return{left:r.left-body.left,right:body.right-r.right,w:r.width}})});
   for(const b of bounds)assert.ok(b.left>=-1&&b.right>=-1&&b.w>0,`${width} diagram stays inside body`);
   if([1440,1024,390,320].includes(width)){await top.screenshot({path:path.join(artifacts,`preparation-${width}.png`)});await bottom.screenshot({path:path.join(artifacts,`comparison-${width}.png`)});}
  }
 });
 await t.test('touch under reduced motion still continuously collects water and retains results',async()=>{
  const p=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce'});try{await p.clock.install();await p.goto(url,{waitUntil:'networkidle'});await p.waitForFunction(()=>document.querySelector('.oxygen-3d-comparison').dataset.ready==='true');await p.clock.pauseAt(await p.evaluate(()=>Date.now()+100));await p.locator('.oxygen-preparation [data-stage="2"]').tap();await p.clock.fastForward(500);const first=Number(await p.locator('#oxygen-jar-water').getAttribute('y'));await p.clock.fastForward(500);assert.ok(Number(await p.locator('#oxygen-jar-water').getAttribute('y'))>first);await p.locator('.oxygen-preparation [data-reset]').tap();await p.locator('[data-compare-play]').tap();await p.clock.fastForward(5000);assert.equal(await p.locator('.oxygen-comparison').getAttribute('data-state'),'complete');}finally{await p.close()}
 });
 await t.test('without JavaScript all essential materials, collection and flame results remain visible',async()=>{
  const p=await browser.newPage({javaScriptEnabled:false,viewport:{width:390,height:844}});try{await p.goto(url,{waitUntil:'networkidle'});assert.equal(await p.locator('.oxygen-apparatus').isVisible(),true);assert.equal(await p.locator('.oxygen-comparison [data-sample=oxygen] .oxygen-flame').getAttribute('opacity'),'1');assert.match(await p.locator('#s4').innerText(),/先排出裝置原有的空氣/);assert.equal(await p.locator('.oxygen-splint-group').count(),2);}finally{await p.close()}
 });
 assert.deepEqual(errors,[]);
});
