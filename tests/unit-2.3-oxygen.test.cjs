const {test}=require('node:test'),assert=require('node:assert/strict');
const {spawn}=require('node:child_process'),path=require('node:path'),fs=require('node:fs/promises');
const {chromium}=require('playwright');
test('2.3 oxygen: five learner-controlled steps and independent splint comparison',{timeout:150000},async t=>{
 let server,url=process.env.OXYGEN_URL;
 if(!url){server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..')});t.after(()=>server.kill());const port=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server timeout')),5000);server.stdout.on('data',b=>{const m=String(b).match(/port (\d+)/);if(m){clearTimeout(timer);resolve(m[1]);}});server.once('error',reject)});url=`http://127.0.0.1:${port}/units/2/parts/2.3/`;}
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',...(process.env.OXYGEN_URL?{proxy:{server:process.env.HTTPS_PROXY||process.env.HTTP_PROXY}}:{})});t.after(()=>browser.close());
 const page=await browser.newPage({viewport:{width:1440,height:1100}});await page.clock.install();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 await page.goto(url,{waitUntil:'networkidle'});await page.waitForFunction(()=>document.querySelector('.oxygen-preparation').dataset.ready==='true');await page.clock.pauseAt(await page.evaluate(()=>Date.now()+100));
 const top=page.locator('.oxygen-preparation'),bottom=page.locator('.oxygen-comparison'),tabs=top.locator('[role=tab]'),play=top.locator('[data-play]'),next=top.locator('[data-next]'),previous=top.locator('[data-previous]');
 const active=()=>top.locator('.oxygen-step-panel:visible');
 const artifacts=process.env.OXYGEN_ARTIFACT_DIR||'/tmp/unit23-oxygen-steps';await fs.mkdir(artifacts,{recursive:true});
 await t.test('initial view contains materials and preparation only; comparison results and original avatars stay available',async()=>{
  assert.deepEqual(await tabs.locator('.step-label').allTextContents(),['準備材料','組裝與產氣','先排空氣','排水集氣','收集完成']);
  assert.equal(await top.getAttribute('data-stage'),'0');assert.equal(await top.getAttribute('data-state'),'ready');assert.equal(await active().count(),1);
  assert.match(await active().locator('h3').innerText(),/認識材料/);assert.equal(await active().locator('[data-material]').count(),7);assert.match(await active().innerText(),/雙氧水提供氧氣/);assert.match(await active().innerText(),/二氧化錳不是氧氣來源/);
  assert.equal(await top.locator('.oxygen-apparatus:visible').count(),0);assert.equal(await previous.isDisabled(),true);
  assert.equal(await tabs.first().getAttribute('aria-selected'),'true');await tabs.first().hover();assert.equal(await tabs.first().evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(31, 98, 75)');await page.mouse.move(0,0);assert.equal(await bottom.getAttribute('data-ignition'),'1.0000');assert.equal(await bottom.locator('figure').count(),2);assert.equal(await bottom.locator('.sequence-grid,[data-stage]').count(),0);
  assert.equal(await page.locator('#s3 .dialogue--xiaokui .speaker').first().evaluate(e=>getComputedStyle(e,'::before').backgroundImage.includes('dialogue-character-avatars.png')),true);
  assert.equal(await page.locator('#s3 .grandpa .speaker').first().evaluate(e=>getComputedStyle(e,'::before').backgroundPosition),'100% 50%');
  await page.clock.fastForward(20000);assert.equal(await top.getAttribute('data-stage'),'0');assert.equal(await top.getAttribute('data-state'),'ready');await top.screenshot({path:path.join(artifacts,'materials-1440.png')});
 });
 await t.test('next includes assembly before purge, then collection and covering; each animation stays selected',async()=>{
  await next.click();assert.equal(await top.getAttribute('data-stage'),'1');assert.equal(await active().count(),1);assert.match(await active().locator('h3').innerText(),/組裝裝置與開始產氣/);assert.equal(await active().locator('[data-assembly-phase]').count(),4);
  await page.clock.fastForward(20000);assert.equal(await top.getAttribute('data-stage'),'1');assert.equal(await top.getAttribute('data-state'),'complete');assert.equal(await top.getAttribute('data-sealed'),'1.0000');await top.screenshot({path:path.join(artifacts,'assembly-complete-1440.png')});
  await next.click();assert.equal(await top.getAttribute('data-stage'),'2');assert.match(await active().locator('h3').innerText(),/空氣排出/);assert.match(await active().locator('dd').last().innerText(),/裝置原有空氣/);assert.equal(await top.getAttribute('data-collected'),'0.0000');
  await page.clock.fastForward(20000);assert.equal(await top.getAttribute('data-stage'),'2');assert.equal(await top.getAttribute('data-state'),'complete');assert.equal(await top.getAttribute('data-tip-x'),'800.000');await top.screenshot({path:path.join(artifacts,'purge-1440.png')});
  await next.click();await page.clock.fastForward(2600);assert.equal(await top.getAttribute('data-stage'),'3');assert.match(await active().locator('dd').last().innerText(),/不易溶於水/);
  const level=Number(await active().locator('[data-part=jar-water]').getAttribute('y'));assert.ok(level>280&&level<680);await top.screenshot({path:path.join(artifacts,'collection-1440.png')});
  await page.clock.fastForward(20000);assert.equal(await top.getAttribute('data-stage'),'3');assert.equal(await top.getAttribute('data-state'),'complete');assert.equal(await top.getAttribute('data-cover'),'0.0000');assert.equal(await top.getAttribute('data-tip-x'),'1035.000');
  await next.click();await page.clock.fastForward(10000);assert.equal(await top.getAttribute('data-stage'),'4');assert.equal(await top.getAttribute('data-state'),'complete');assert.equal(await top.getAttribute('data-cover'),'1.0000');assert.match(await active().locator('dd').last().innerText(),/外界空氣混合/);assert.match(await next.innerText(),/觀察木條/);await top.screenshot({path:path.join(artifacts,'complete-1440.png')});
 });
 await t.test('previous and direct selection restart that step; final next focuses the separate wood observation',async()=>{
  await previous.click();assert.equal(await top.getAttribute('data-stage'),'3');assert.equal(await top.getAttribute('data-collected'),'0.0000');assert.equal(await page.evaluate(()=>document.activeElement===document.querySelector('#oxygen-step-3 h3')),true);
  await tabs.nth(4).click();await next.click();assert.equal(await page.evaluate(()=>document.activeElement===document.querySelector('.oxygen-comparison h3')),true);assert.notEqual(await top.getAttribute('data-state'),'playing');assert.equal(await bottom.getAttribute('data-ignition'),'1.0000');
  await tabs.nth(0).click();assert.equal(await top.getAttribute('data-stage'),'0');assert.equal(await active().count(),1);assert.equal(await previous.isDisabled(),true);
 });
 await t.test('one replay control pauses and resumes the selected scene; rapid selection cancels old clocks',async()=>{
  await tabs.nth(3).click();await page.clock.fastForward(1700);await play.click();assert.equal(await top.getAttribute('data-state'),'paused');
  const drawing=active().locator('.oxygen-drawing'),pixels=await drawing.screenshot(),level=await active().locator('[data-part=jar-water]').getAttribute('y');await page.clock.fastForward(1000);assert.ok(pixels.equals(await drawing.screenshot()));
  await play.click();await page.clock.fastForward(300);assert.ok(Number(await active().locator('[data-part=jar-water]').getAttribute('y'))>Number(level));
  for(const i of[4,2,3,0,4,2])await tabs.nth(i).click();await page.clock.fastForward(15000);assert.equal(await top.getAttribute('data-stage'),'2');assert.equal(await top.getAttribute('data-collected'),'0.0000');assert.equal(await top.getAttribute('data-state'),'complete');
  await play.click();await page.clock.fastForward(200);assert.equal(await top.getAttribute('data-stage'),'2');assert.equal(await top.getAttribute('data-state'),'playing');
 });
 await t.test('tabs support arrows, Home, End, Enter, Escape and focus never remains in a hidden panel',async()=>{
  await tabs.nth(0).click();await tabs.nth(0).focus();await page.keyboard.press('ArrowRight');assert.equal(await top.getAttribute('data-stage'),'1');assert.equal(await tabs.nth(1).evaluate(e=>e===document.activeElement),true);
  await page.keyboard.press('End');assert.equal(await top.getAttribute('data-stage'),'4');await page.keyboard.press('Home');assert.equal(await top.getAttribute('data-stage'),'0');await page.keyboard.press('ArrowLeft');assert.equal(await top.getAttribute('data-stage'),'4');
  await page.keyboard.press('Enter');await page.clock.fastForward(100);await page.keyboard.press('Escape');assert.equal(await top.getAttribute('data-state'),'paused');assert.equal(await top.locator('[role=tab][tabindex="0"]').count(),1);
  assert.equal(await page.evaluate(()=>!!document.activeElement.closest('[hidden]')),false);
 });
 await t.test('background, leaving the block and starting the other player pause without automatic restart',async()=>{
  await tabs.nth(3).click();await page.clock.fastForward(100);await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});assert.equal(await top.getAttribute('data-state'),'paused');
  await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});assert.equal(await top.getAttribute('data-state'),'paused');
  await play.click();await page.locator('#s2').evaluate(e=>e.scrollIntoView({behavior:'instant'}));await page.clock.fastForward(100);await page.waitForFunction(()=>document.querySelector('.oxygen-preparation').dataset.state==='paused');
  await top.scrollIntoViewIfNeeded();await page.clock.fastForward(500);assert.equal(await top.getAttribute('data-state'),'paused');
  await play.click();await bottom.locator('[data-compare-play]').click();assert.notEqual(await top.getAttribute('data-state'),'playing');
 });
 await t.test('two wooden splints keep identical entry timing and only oxygen develops a frozen or replayed flame',async()=>{
  await bottom.locator('[data-compare-reset]').click();await bottom.locator('[data-compare-play]').click();await page.clock.fastForward(600);
  const transforms=await bottom.locator('.oxygen-splint').evaluateAll(ns=>ns.map(n=>n.getAttribute('transform')));assert.equal(transforms[0],transforms[1]);assert.doesNotMatch(await bottom.locator('figcaption').last().innerText(),/復燃/);
  await page.clock.fastForward(2000);assert.ok(Number(await bottom.locator('[data-sample=oxygen] .oxygen-flame').getAttribute('opacity'))>0);assert.equal(await bottom.locator('[data-sample=air] .oxygen-flame').getAttribute('opacity'),'0');
  await bottom.locator('[data-compare-pause]').click();const pixels=await bottom.locator('.oxygen-splints').screenshot();await page.clock.fastForward(500);assert.ok(pixels.equals(await bottom.locator('.oxygen-splints').screenshot()));
  await bottom.locator('[data-compare-play]').click();await page.clock.fastForward(5000);assert.equal(await bottom.getAttribute('data-state'),'complete');assert.equal(await bottom.locator('[data-sample=oxygen] .oxygen-flame').getAttribute('opacity'),'1');
 });
 await t.test('all five selected screens and controls fit seven widths, with side-by-side wood samples',async()=>{
  for(const width of[1440,1280,1024,800,768,390,320]){
   await page.setViewportSize({width,height:1100});
   for(let i=0;i<5;i++){
    await tabs.nth(i).click();if(i){await page.clock.fastForward(i===1?4100:i===3?2600:1600);if(await top.getAttribute('data-state')==='playing')await play.click();}
    assert.equal(await active().count(),1);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${width}, stage ${i} overflow`);
    const bounds=await top.evaluate(el=>{const r=el.getBoundingClientRect();return[...el.querySelectorAll('.oxygen-step-panel:not([hidden]),.oxygen-steps,.oxygen-step-controls')].map(n=>{const b=n.getBoundingClientRect();return b.left>=r.left-1&&b.right<=r.right+1;});});assert.ok(bounds.every(Boolean));
    if([1440,390,320].includes(width))await top.screenshot({path:path.join(artifacts,`step-${i}-${width}.png`)});
   }
   const jars=await bottom.locator('figure').evaluateAll(ns=>ns.map(n=>n.getBoundingClientRect().top));assert.ok(Math.abs(jars[0]-jars[1])<1);
  }
 });
 await t.test('touch and reduced motion keep manual navigation and bounded essential animation',async()=>{
  const p=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce'});try{await p.clock.install();await p.goto(url,{waitUntil:'networkidle'});await p.waitForFunction(()=>document.querySelector('.oxygen-preparation').dataset.ready==='true');await p.clock.pauseAt(await p.evaluate(()=>Date.now()+100));
   const root=p.locator('.oxygen-preparation');assert.equal(await root.getAttribute('data-stage'),'0');await root.locator('[data-next]').tap();await p.clock.fastForward(20000);assert.equal(await root.getAttribute('data-stage'),'1');assert.equal(await root.getAttribute('data-state'),'complete');
   await root.locator('[data-next]').tap();await p.clock.fastForward(4000);assert.equal(await root.getAttribute('data-stage'),'2');await root.locator('[data-next]').tap();await p.clock.fastForward(1200);const first=Number(await root.locator('#oxygen-step-3 [data-part=jar-water]').getAttribute('y'));await p.clock.fastForward(700);assert.ok(Number(await root.locator('#oxygen-step-3 [data-part=jar-water]').getAttribute('y'))>first);
   await root.locator('[data-stage="0"]').tap();assert.equal(await root.locator('.oxygen-materials-view').isVisible(),true);
  }finally{await p.close();}
 });
 await t.test('without JavaScript all five stage-specific scenes, explanations and final wood results are readable',async()=>{
  const p=await browser.newPage({javaScriptEnabled:false,viewport:{width:390,height:844}});try{await p.goto(url,{waitUntil:'networkidle'});assert.equal(await p.locator('.oxygen-step-panel:visible').count(),5);assert.equal(await p.locator('.oxygen-step-explanation dd').count(),10);assert.equal(await p.locator('.oxygen-apparatus:visible').count(),4);assert.equal(await p.locator('#oxygen-step-2 [data-part=jar-water]').getAttribute('height'),'400');assert.equal(await p.locator('#oxygen-step-4 [data-part=cover]').getAttribute('opacity'),'1');assert.equal(await p.locator('.oxygen-comparison [data-sample=oxygen] .oxygen-flame').getAttribute('opacity'),'1');assert.match(await p.locator('#s3').innerText(),/先排出裝置原有的空氣/);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}finally{await p.close();}
 });
 assert.deepEqual(errors,[]);
});
