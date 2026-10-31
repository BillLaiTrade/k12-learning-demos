const {test}=require('node:test'),assert=require('node:assert/strict'),{spawn}=require('node:child_process'),path=require('node:path'),fs=require('node:fs/promises'),{chromium}=require('playwright');
test('2.3 oxygen: refined material scenes and synchronized close-ups',{timeout:240000},async t=>{
 let server,url=process.env.OXYGEN_URL;
 if(!url){server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..')});t.after(()=>server.kill());const port=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server timeout')),5000);server.stdout.on('data',b=>{const m=String(b).match(/port (\d+)/);if(m){clearTimeout(timer);resolve(m[1])}});});url=`http://127.0.0.1:${port}/units/2/parts/2.3/`;}
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--enable-unsafe-swiftshader'],...(process.env.OXYGEN_URL?{proxy:{server:process.env.HTTPS_PROXY}}:{})});t.after(()=>browser.close());
 const page=await browser.newPage({viewport:{width:1440,height:1100}});await page.clock.install();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.url())});await page.goto(url,{waitUntil:'networkidle'});
 const top=page.locator('.oxygen-preparation'),view=page.locator('.oxygen-drawing'),bottom=page.locator('.oxygen-comparison');
 await page.waitForFunction(()=>document.querySelector('.oxygen-drawing').dataset.ready==='true');await page.clock.pauseAt(await page.evaluate(()=>Date.now()+100));
 const artifacts=process.env.OXYGEN_THREE_ARTIFACT_DIR||'/tmp/unit23-oxygen-material';await fs.mkdir(artifacts,{recursive:true});
 await t.test('glass and charred wood use loaded material plates with live SVG layers',async()=>{
  assert.equal(await page.locator('#s3').getAttribute('data-renderer'),'material-svg');assert.equal(await top.locator('canvas').count(),0);
  assert.equal(await bottom.locator('image[href="assets/oxygen-jar-closeup.webp"]').count(),2);
  const images=await page.locator('#s3 img').evaluateAll(ns=>ns.every(n=>n.complete&&n.naturalWidth>0));assert.ok(images);
  assert.equal(await view.locator('use').getAttribute('href'),'#oxygen-scene-art');
 });
 await t.test('purge stays outside a full jar; tube moves continuously before water drops',async()=>{
  await top.locator('[data-stage="1"]').click();await page.clock.fastForward(400);assert.equal(await top.getAttribute('data-tip-x'),'800.000');assert.equal(await top.getAttribute('data-collected'),'0.0000');assert.equal(await page.locator('#oxygen-purge-bubbles').getAttribute('opacity'),'1');
  await top.screenshot({path:path.join(artifacts,'purging-1440.png')});
  await top.locator('[data-stage="2"]').click();const tips=[];for(let i=0;i<6;i++){await page.clock.fastForward(100);tips.push(Number(await top.getAttribute('data-tip-x')));assert.equal(await top.getAttribute('data-collected'),'0.0000');}assert.ok(tips.every((v,i)=>!i||v>tips[i-1]));
  await page.clock.fastForward(1800);const y=Number(await page.locator('#oxygen-jar-water').getAttribute('y'));assert.ok(y>280&&y<680);
  const bubbles=await page.locator('#oxygen-collection-bubbles circle').evaluateAll(ns=>ns.map(n=>({y:+n.getAttribute('cy'),r:+n.getAttribute('r')})));assert.ok(bubbles.every(b=>b.y-b.r>=y&&b.y+b.r<680));
  await top.screenshot({path:path.join(artifacts,'collecting-1440.png')});
 });
 await t.test('pause freezes visible pixels, liquid and gas flow; resume changes the scene',async()=>{
  await top.locator('[data-pause]').click();const pixels=await view.screenshot(),level=await page.locator('#oxygen-jar-water').getAttribute('y');await page.clock.fastForward(800);assert.ok(pixels.equals(await view.screenshot()));
  await top.locator('[data-play]').click();await page.clock.fastForward(400);assert.ok(Number(await page.locator('#oxygen-jar-water').getAttribute('y'))>Number(level));assert.ok(!pixels.equals(await view.screenshot()));
 });
 await t.test('withdrawal completes before glass cover moves, with final results retained',async()=>{
  await top.locator('[data-stage="3"]').click();await page.clock.fastForward(400);assert.ok(Number(await top.getAttribute('data-tip-x'))>800);assert.equal(await top.getAttribute('data-cover'),'0.0000');
  await top.screenshot({path:path.join(artifacts,'withdrawal-1440.png')});await page.clock.fastForward(800);assert.equal(await top.getAttribute('data-tip-x'),'800.000');assert.ok(Number(await top.getAttribute('data-cover'))>0);
  await top.screenshot({path:path.join(artifacts,'covering-1440.png')});await page.clock.fastForward(1500);assert.equal(await top.getAttribute('data-state'),'complete');assert.equal(await top.getAttribute('data-cover'),'1.0000');assert.equal(await page.locator('#oxygen-collection-bubbles').getAttribute('opacity'),'0');
 });
 await t.test('captions follow insertion, first observation, ignition and completed comparison',async()=>{
  await bottom.scrollIntoViewIfNeeded();await bottom.locator('[data-compare-play]').click();await page.clock.fastForward(600);assert.doesNotMatch(await bottom.locator('figcaption').last().innerText(),/復燃/);await bottom.screenshot({path:path.join(artifacts,'splints-start.png')});
  await page.clock.fastForward(1100);assert.match(await bottom.locator('figcaption').last().innerText(),/觀察餘燼/);assert.equal(await bottom.locator('[data-sample=oxygen] .oxygen-flame').getAttribute('opacity'),'0');
  await page.clock.fastForward(900);assert.match(await bottom.locator('figcaption').last().innerText(),/開始復燃/);await bottom.screenshot({path:path.join(artifacts,'splints-igniting.png')});
  await bottom.locator('[data-compare-pause]').click();const pixels=await bottom.locator('.oxygen-splints').screenshot();await page.clock.fastForward(900);assert.ok(pixels.equals(await bottom.locator('.oxygen-splints').screenshot()));
  await bottom.locator('[data-compare-play]').click();await page.clock.fastForward(5000);await bottom.screenshot({path:path.join(artifacts,'splints-complete.png')});assert.match(await bottom.locator('figcaption').first().innerText(),/未同樣復燃/);
 });
 await t.test('mobile synchronized magnifier is visible and both wood tips remain side by side',async()=>{
  for(const width of[1440,1024,390,320]){await page.setViewportSize({width,height:1100});await top.scrollIntoViewIfNeeded();await page.clock.fastForward(100);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.equal(await page.locator('.oxygen-mobile-zoom').isVisible(),width<700);assert.equal(await page.locator('.oxygen-mobile-zoom use').getAttribute('href'),'#oxygen-scene-art');await top.screenshot({path:path.join(artifacts,`preparation-${width}.png`)});await bottom.screenshot({path:path.join(artifacts,`comparison-${width}.png`)});const jars=await bottom.locator('figure').evaluateAll(ns=>ns.map(n=>n.getBoundingClientRect().top));assert.ok(Math.abs(jars[0]-jars[1])<1);}
 });
 assert.deepEqual(errors,[]);
});
