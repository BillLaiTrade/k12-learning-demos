const {test}=require('node:test'),assert=require('node:assert/strict'),{spawn}=require('node:child_process'),path=require('node:path'),fs=require('node:fs/promises'),{chromium}=require('playwright');
test('2.3 carbon dioxide: materials, assembly, purging, upward air displacement and storage',{timeout:180000},async t=>{
 let server,url=process.env.CO2_URL;
 if(!url){server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..')});t.after(()=>server.kill());const port=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server timeout')),5000);server.stdout.on('data',b=>{const m=String(b).match(/port (\d+)/);if(m){clearTimeout(timer);resolve(m[1]);}});server.once('error',reject);});url=`http://127.0.0.1:${port}/units/2/parts/2.3/`;}
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',...(process.env.CO2_URL?{proxy:{server:process.env.HTTPS_PROXY||process.env.HTTP_PROXY}}:{})});t.after(()=>browser.close());
 const page=await browser.newPage({viewport:{width:1440,height:1100}});await page.clock.install();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});await page.goto(url,{waitUntil:'networkidle'});await page.waitForFunction(()=>document.querySelector('.co2-preparation').dataset.ready==='true');await page.clock.pauseAt(await page.evaluate(()=>Date.now()+100));
 const root=page.locator('.co2-preparation'),tabs=root.locator('[role=tab]'),play=root.locator('[data-play]'),next=root.locator('[data-next]'),prev=root.locator('[data-previous]');
 const active=()=>root.locator('[role=tabpanel]:visible'),info=()=>root.locator('[data-co2-info]:visible');
 const out=process.env.CO2_ARTIFACT_DIR||'/tmp/unit23-co2';await fs.mkdir(out,{recursive:true});
 // A full-section screenshot can temporarily scroll the viewport outside the
 // player and correctly trigger its leave-to-pause behavior. Restore visibility
 // and explicitly resume that same clock before continuing a timed assertion.
 const shot=async name=>{
  const wasPlaying=await root.getAttribute('data-state')==='playing';
  await page.locator('#s4').screenshot({path:path.join(out,name+'.webp'),type:'webp',quality:82});
  await root.scrollIntoViewIfNeeded();await page.clock.runFor(16);
  if(wasPlaying&&await root.getAttribute('data-state')==='paused')await play.click();
 };
 const select=async i=>{await tabs.nth(i).click();};
 await t.test('initial state shows only preparation and one persistent introduction; no autoplay or property experiments',async()=>{
  assert.equal(await root.getAttribute('data-state'),'ready');assert.equal(await root.getAttribute('data-stage'),'0');assert.equal(await active().count(),1);assert.equal(await info().count(),1);assert.match(await info().innerText(),/大理石/);await page.clock.fastForward(20000);assert.equal(await root.getAttribute('data-state'),'ready');assert.equal(await prev.isDisabled(),true);assert.equal(await tabs.count(),5);assert.equal(await page.locator('#s4 .gas-observations,#s4 [data-compare-play]').count(),0);await shot('materials-1440');
 });
 await t.test('all six actual object images and labels select their own accessible identity and role',async()=>{
  for(const key of['marble','acid','flask','jar','tube','plate']){
   const b=root.locator(`[data-co2-material=${key}]`);assert.equal(await b.getAttribute('aria-controls'),`co2-info-${key}`);assert.equal(await b.evaluate(n=>n.tagName),'BUTTON');
   await b.locator('img').click();assert.equal(await root.getAttribute('data-material'),key);assert.equal(await info().getAttribute('id'),`co2-info-${key}`);assert.deepEqual(await info().locator('dt').allTextContents(),['這是什麼','實驗中的作用']);assert.equal(await b.getAttribute('aria-pressed'),'true');assert.equal(await root.locator('[data-co2-material][aria-pressed=true]').count(),1);
   await b.locator('span').first().click();assert.equal(await root.getAttribute('data-material'),key);assert.equal(await b.locator('img').evaluate(n=>n.complete&&n.naturalWidth>0),true);
  }
  assert.equal(await root.locator('.co2-material-details').getAttribute('aria-live'),'polite');await shot('plate-1440');
 });
 await t.test('manual selection cancels the optional tour and survives leaving preparation',async()=>{
  await play.click();await page.clock.fastForward(900);await root.locator('[data-co2-material=tube]').click();await page.clock.fastForward(10000);assert.equal(await root.getAttribute('data-material'),'tube');assert.equal(await root.getAttribute('data-state'),'ready');
  await select(2);await select(0);assert.equal(await root.getAttribute('data-material'),'tube');assert.equal(await root.getAttribute('data-state'),'ready');
 });
 await t.test('assembly really adds marble then acid, reacts before sealing, and only then directs gas through the tube',async()=>{
  await select(1);assert.equal(await root.getAttribute('data-marble'),'0.0000');assert.equal(await root.getAttribute('data-acid'),'0.0000');
  await page.clock.fastForward(3200);assert.ok(Number(await root.getAttribute('data-marble'))>0);assert.equal(await root.getAttribute('data-acid'),'0.0000');assert.equal(await active().locator('[data-co2-part=falling-marble]').getAttribute('opacity'),'1');await shot('assembly-marble');
  await page.clock.fastForward(2600);assert.ok(Number(await root.getAttribute('data-acid'))>0);assert.equal(await root.getAttribute('data-seal'),'0.0000');assert.equal(await active().locator('[data-co2-part=acid-stream]').getAttribute('opacity'),'1');assert.equal(await active().locator('[data-co2-part=bubbles]').getAttribute('opacity'),'1');await shot('assembly-acid');
  await page.clock.fastForward(4200);assert.ok(Number(await root.getAttribute('data-seal'))>0);await shot('assembly-sealing');
  await page.clock.fastForward(5000);assert.equal(await root.getAttribute('data-state'),'complete');assert.equal(await root.getAttribute('data-stage'),'1');assert.equal(await root.getAttribute('data-flow'),'true');assert.equal(await root.getAttribute('data-insert'),'0.0000');assert.equal(await active().locator('[data-co2-phase][aria-current=true]').count(),1);
 });
 await t.test('purging stays outside; collection moves tube into an open upright jar and never animates a water level',async()=>{
  await next.click();await page.clock.fastForward(10000);assert.equal(await root.getAttribute('data-stage'),'2');assert.equal(await root.getAttribute('data-tip-x'),'600.0000');assert.equal(await root.getAttribute('data-collecting'),'false');assert.match(await active().innerText(),/原先充滿空氣/);await shot('purging');
  await next.click();await page.clock.fastForward(1100);assert.ok(Number(await root.getAttribute('data-insert'))>0);assert.equal(await active().locator('[data-co2-part=air-out]').getAttribute('opacity'),'0');
  await page.clock.fastForward(1700);assert.equal(await root.getAttribute('data-tip-x'),'870.0000');assert.equal(await root.getAttribute('data-tip-y'),'540.0000');assert.equal(await active().locator('[data-co2-part=air-out]').getAttribute('opacity'),'1');assert.equal(await active().locator('[data-co2-part=plate]').getAttribute('opacity'),'0');
  assert.equal(await active().locator('[data-part=jar-water],[data-co2-part=jar-water]').count(),0);assert.match(await active().innerText(),/相同溫壓下/);assert.match(await active().innerText(),/密度大/);await shot('collecting');await page.clock.fastForward(10000);assert.equal(await root.getAttribute('data-stage'),'3');assert.equal(await root.getAttribute('data-state'),'complete');
 });
 await t.test('withdrawal finishes before the glass cover moves and the sample is labeled',async()=>{
  await next.click();await page.clock.fastForward(800);assert.ok(Number(await root.getAttribute('data-insert'))>0);assert.equal(await root.getAttribute('data-cover'),'0.0000');await shot('withdrawal');
  await page.clock.fastForward(1800);assert.equal(await root.getAttribute('data-insert'),'0.0000');assert.ok(Number(await root.getAttribute('data-cover'))>0);assert.equal(await root.getAttribute('data-labeled'),'false');await shot('covering');
  await page.clock.fastForward(7000);assert.equal(await root.getAttribute('data-cover'),'1.0000');assert.equal(await active().locator('[data-co2-part=sample-label]').getAttribute('opacity'),'1');assert.equal(await root.getAttribute('data-flow'),'true');assert.match(await active().innerText(),/瓶口朝上保存/);await shot('completed');await next.click();assert.equal(await page.locator('#title-5').evaluate(n=>n===document.activeElement),true);
 });
 await t.test('one control pauses pixels, resumes time, replays; rapid step changes cancel the old frame clock',async()=>{
  await select(3);await page.clock.fastForward(2800);await play.click();assert.equal(await root.getAttribute('data-state'),'paused');const time=await root.getAttribute('data-time'),pixels=await active().locator('.co2-apparatus').screenshot();await page.clock.fastForward(2000);assert.equal(await root.getAttribute('data-time'),time);assert.ok(pixels.equals(await active().locator('.co2-apparatus').screenshot()));
  await play.click();await page.clock.fastForward(300);assert.ok(Number(await root.getAttribute('data-time'))>Number(time));await page.clock.fastForward(10000);await play.click();assert.ok(Number(await root.getAttribute('data-time'))<100);for(const i of[4,1,3,0,4,2])await select(i);await page.clock.fastForward(20000);assert.equal(await root.getAttribute('data-stage'),'2');assert.equal(await root.getAttribute('data-state'),'complete');assert.equal(await root.getAttribute('data-cover'),'0.0000');
 });
 await t.test('native keyboard controls, roving step tabs and panel focus remain accessible',async()=>{
  await select(0);const b=root.locator('[data-co2-material=jar]');await b.focus();await page.keyboard.press('Enter');assert.equal(await root.getAttribute('data-material'),'jar');await page.keyboard.press('Space');assert.equal(await b.evaluate(n=>n===document.activeElement),true);
  await tabs.nth(0).focus();await page.keyboard.press('ArrowRight');assert.equal(await root.getAttribute('data-stage'),'1');assert.equal(await tabs.nth(1).evaluate(n=>n===document.activeElement),true);await page.keyboard.press('End');assert.equal(await root.getAttribute('data-stage'),'4');await page.keyboard.press('Escape');assert.equal(await root.getAttribute('data-state'),'paused');await page.keyboard.press('Home');assert.equal(await root.getAttribute('data-stage'),'0');await next.click();assert.equal(await active().locator('h3').evaluate(n=>n===document.activeElement),true);assert.equal(await page.evaluate(()=>!!document.activeElement.closest('[hidden]')),false);assert.equal(await root.locator('[role=tab][tabindex="0"]').count(),1);
 });
 await t.test('background, leaving the block and oxygen or properties playback pause without automatic restart',async()=>{
  await select(3);await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});assert.equal(await root.getAttribute('data-state'),'paused');await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});assert.equal(await root.getAttribute('data-state'),'paused');
  await play.click();await page.locator('.oxygen-preparation [data-play]').evaluate(b=>b.click());assert.equal(await root.getAttribute('data-state'),'paused');await play.click();assert.notEqual(await page.locator('.oxygen-preparation').getAttribute('data-state'),'playing');await page.locator('[data-compare-play]').evaluate(b=>b.click());assert.equal(await root.getAttribute('data-state'),'paused');await play.click();assert.equal(await page.locator('.oxygen-comparison').getAttribute('data-state'),'paused');
  await page.locator('#s2').evaluate(n=>n.scrollIntoView({behavior:'instant'}));await page.clock.fastForward(100);await page.waitForFunction(()=>document.querySelector('.co2-preparation').dataset.state==='paused');await root.scrollIntoViewIfNeeded();assert.equal(await root.getAttribute('data-state'),'paused');
 });
 await t.test('all five steps fit seven widths; mobile closeups share the same animated scene',async()=>{
  for(const width of[1440,1280,1024,800,768,390,320]){
   await page.setViewportSize({width,height:1100});
   for(let i=0;i<5;i++){await select(i);if(i>0)await page.clock.fastForward(1800);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${width} step ${i}`);
    if(i>0){const href=await active().locator('.co2-closeup use').getAttribute('href');assert.equal(href,`#co2-scene-${i}`);assert.equal(await active().locator(href).count(),1);}
    if([1440,390,320].includes(width))await shot(`step-${i+1}-${width}`);
   }
   await select(0);for(const b of await root.locator('[data-co2-material]').all()){const r=await b.boundingBox();assert.ok(r.width>=44&&r.height>=44);}
  }
 });
 await t.test('real touch and reduced motion retain selection and manually requested essential animation',async()=>{
  const p=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
  try{await p.clock.install();await p.goto(url,{waitUntil:'networkidle'});await p.waitForFunction(()=>document.querySelector('.co2-preparation').dataset.ready==='true');await p.clock.pauseAt(await p.evaluate(()=>Date.now()+100));await p.locator('[data-co2-material=acid] img').tap();assert.equal(await p.locator('.co2-preparation').getAttribute('data-material'),'acid');await p.locator('[data-co2-step="3"]').tap();await p.clock.fastForward(3000);assert.equal(await p.locator('.co2-preparation').getAttribute('data-tip-y'),'540.0000');await p.locator('#s4 [data-play]').tap();assert.equal(await p.locator('.co2-preparation').getAttribute('data-state'),'paused');await p.locator('[data-co2-step="0"]').tap();assert.equal(await p.locator('.co2-preparation').getAttribute('data-material'),'acid');await p.locator('#s4').screenshot({path:path.join(out,'touch-acid-390.webp'),type:'webp'});}finally{await p.close();}
 });
 await t.test('no JavaScript leaves all five representative scenes and all six material introductions readable',async()=>{
  const p=await browser.newPage({javaScriptEnabled:false,viewport:{width:390,height:844}});
  try{await p.goto(url,{waitUntil:'networkidle'});assert.equal(await p.locator('#s4 .co2-step:visible').count(),5);assert.equal(await p.locator('#s4 [data-co2-info]:visible').count(),6);assert.equal(await p.locator('#s4 .co2-explanation').count(),5);assert.equal(await p.locator('#s4 [data-co2-step]:disabled').count(),5);assert.equal(await p.locator('#s4 .co2-apparatus').count(),4);assert.match(await p.locator('#s4').innerText(),/不能說它絕對不能用排水法/);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.equal(await p.locator('#s4 .properties-next').getAttribute('href'),'#s5');}finally{await p.close();}
 });
 assert.deepEqual(errors,[]);
});
