const {test}=require('node:test'),assert=require('node:assert/strict'),{spawn}=require('node:child_process'),path=require('node:path'),fs=require('node:fs/promises'),{chromium}=require('playwright');
test('2.3 argon: approved photo comparison, shared flow replay and existing title',{timeout:180000},async t=>{
 let server,url=process.env.ARGON_URL;
 if(!url){server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..')});t.after(()=>server.kill());const port=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server timeout')),5000);server.stdout.on('data',b=>{const m=String(b).match(/port (\d+)/);if(m){clearTimeout(timer);resolve(m[1])}})});url=`http://127.0.0.1:${port}/units/2/parts/2.3/`;}
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--enable-unsafe-swiftshader'],...(process.env.ARGON_URL?{proxy:{server:process.env.HTTPS_PROXY||process.env.HTTP_PROXY}}:{})});t.after(()=>browser.close());
 const page=await browser.newPage({viewport:{width:1440,height:1100}});await page.clock.install();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.url())});await page.goto(url,{waitUntil:'networkidle'});
 await page.waitForFunction(()=>!document.querySelector('.argon-replay').disabled);await page.clock.pauseAt(await page.evaluate(()=>Date.now()+100));
 const section=page.locator('#s5'),panel=section.locator('.argon-comparison'),button=section.locator('.argon-replay');
 const artifacts=process.env.ARGON_ARTIFACT_DIR||'/tmp/unit23-argon';await fs.mkdir(artifacts,{recursive:true});
 await t.test('retains existing title and avatars, one replay, one data strip and two default results',async()=>{
  await section.scrollIntoViewIfNeeded();await page.waitForFunction(()=>[...document.querySelectorAll('#s5 img')].every(n=>n.complete&&n.naturalWidth>0));
  assert.equal(await section.locator('h2').innerText(),'焊接金屬時，為什麼需要氬氣保護？');assert.equal(await section.locator('.lesson-role').innerText(),'氬氣：由性質認識保護用途');
  assert.equal(await section.locator('button').count(),1);assert.equal(await panel.getAttribute('data-state'),'complete');assert.equal(await section.locator('.argon-example').count(),2);
  assert.equal((await section.locator('.argon-facts').innerText()).match(/0\.93%/g).length,1);assert.match(await section.innerText(),/相對不易反應/);
  assert.equal(await section.locator('.dialogue--xiaokui .speaker').evaluate(el=>getComputedStyle(el,'::before').backgroundImage.includes('dialogue-character-avatars.png')),true);
  assert.equal(await section.locator('.grandpa .speaker').evaluate(el=>getComputedStyle(el,'::before').backgroundPosition),'100% 50%');
  for(const img of await section.locator('img').all())assert.equal(await img.evaluate(el=>el.complete&&el.naturalWidth===1536),true);
  assert.deepEqual(await section.locator('.argon-photo img').evaluateAll(ns=>ns.map(n=>n.src)).then(xs=>[...new Set(xs)].length),1);
  assert.equal(await section.locator('.argon-example figcaption:visible').count(),2);assert.equal(await section.locator('.argon-example--air .argon-oxidation-layer').evaluate(n=>getComputedStyle(n).opacity),'1');assert.equal(await section.locator('.argon-example--shield .argon-oxidation-layer').count(),0);
 });
 await t.test('the metal itself visibly differs in the two rendered panels, not only labels or arrows',async()=>{
  await page.evaluate(async()=>{const image=new Image();image.src=new URL(document.querySelector('.argon-oxidation-layer image').getAttribute('href'),document.baseURI);await image.decode();});
  await page.clock.fastForward(30);
  const shots=[];for(const sample of ['air','shield'])shots.push((await section.locator(`[data-argon-sample=${sample}] .argon-photo`).screenshot()).toString('base64'));
  const difference=await page.evaluate(async shots=>{const samples=[];for(const data of shots){const image=new Image();image.src='data:image/png;base64,'+data;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);samples.push(ctx.getImageData(Math.floor(canvas.width*.61),Math.floor(canvas.height*.79),Math.floor(canvas.width*.10),Math.floor(canvas.height*.08)).data);}let sum=0,count=0;for(let i=0;i<samples[0].length;i++){if(i%4===3)continue;sum+=Math.abs(samples[0][i]-samples[1][i]);count++;}return sum/count;},shots);
  assert.ok(difference>12,`mean visible metal pixel difference: ${difference}`);
  console.log('Visible metal-region pixel difference:',difference);
  await section.screenshot({path:path.join(artifacts,'surface-difference-1440.png')});
 });
 await t.test('both air arrows and shield arrows replay from one clock and moving heads follow actual paths',async()=>{
  await panel.scrollIntoViewIfNeeded();await button.click();await page.clock.fastForward(500);assert.equal(await panel.getAttribute('data-phase'),'air');
  const first=await section.locator('.argon-air-path').first().getAttribute('style');assert.match(first,/stroke-dashoffset/);assert.equal(await panel.getAttribute('data-shield'),'0.0000');assert.equal(await panel.getAttribute('data-oxidation'),'0.0000');
  await page.clock.fastForward(1000);const paths=section.locator('.argon-shield-path'),heads=section.locator('.argon-example--shield .argon-moving-head');const before=await heads.first().getAttribute('transform');let previous=Number(await panel.getAttribute('data-shield'));
  assert.ok(previous>0&&previous<1);
  for(let i=0;i<8;i++){await page.clock.fastForward(200);const next=Number(await panel.getAttribute('data-shield'));assert.ok(next>previous);previous=next;}
  assert.notEqual(await heads.first().getAttribute('transform'),before);assert.ok(Number(await panel.getAttribute('data-oxidation'))>0);assert.ok(Number(await section.locator('.argon-oxidation-layer').evaluate(n=>n.style.opacity))>0);
  const offsets=await paths.evaluateAll(ns=>ns.map(n=>({offset:Number(n.style.strokeDashoffset),length:n.getTotalLength()})));for(const p of offsets)assert.ok(p.offset>0&&p.offset<p.length);
  await panel.screenshot({path:path.join(artifacts,'replay-middle-1440.png')});
  await page.clock.fastForward(4000);assert.equal(await panel.getAttribute('data-state'),'complete');for(const p of await paths.all())assert.equal(Number(await p.evaluate(n=>n.style.strokeDashoffset)),0);
  assert.match(await button.innerText(),/重播保護過程/);
 });
 await t.test('rapid replay cancels old timing, Escape freezes pixels and one button resumes',async()=>{
  await button.click();await page.clock.fastForward(2000);await button.click();await page.clock.fastForward(150);assert.equal(await panel.getAttribute('data-phase'),'air');assert.equal(await section.locator('.argon-oxidation-layer').evaluate(n=>n.style.opacity),'0');
  await page.clock.fastForward(1700);await button.focus();await page.keyboard.press('Escape');assert.equal(await panel.getAttribute('data-state'),'paused');
  const state=await panel.getAttribute('data-shield'),pixels=await panel.screenshot();await page.clock.fastForward(1500);assert.equal(await panel.getAttribute('data-shield'),state);assert.ok(pixels.equals(await panel.screenshot()));
  assert.match(await button.innerText(),/繼續觀看/);await button.click();await page.clock.fastForward(300);assert.ok(Number(await panel.getAttribute('data-shield'))>Number(state));await page.keyboard.press('Escape');
 });
 await t.test('background and leaving the section pause without automatic resume',async()=>{
  await button.click();await page.clock.fastForward(300);await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))});assert.equal(await panel.getAttribute('data-state'),'paused');
  await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))});assert.equal(await panel.getAttribute('data-state'),'paused');
  await button.click();await page.locator('#s2').evaluate(n=>n.scrollIntoView({behavior:'instant'}));await page.clock.fastForward(100);await page.waitForFunction(()=>document.querySelector('.argon-comparison').dataset.state==='paused');await panel.scrollIntoViewIfNeeded();assert.equal(await panel.getAttribute('data-state'),'paused');
 });
 await t.test('seven widths keep facts, photo labels, results and replay within the lesson',async()=>{
  await button.click();await page.clock.fastForward(7000);
  for(const width of[1440,1280,1024,800,768,390,320]){
   await page.setViewportSize({width,height:1100});await section.scrollIntoViewIfNeeded();await page.clock.fastForward(100);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${width} document overflow`);
   const boxes=await section.evaluate(el=>{const body=el.querySelector('.lesson-body').getBoundingClientRect();return[...el.querySelectorAll('.argon-facts,.argon-example,.argon-scene-title,.argon-replay')].map(n=>{const r=n.getBoundingClientRect();return{left:r.left-body.left,right:body.right-r.right,width:r.width}})});for(const b of boxes)assert.ok(b.left>=-1&&b.right>=-1&&b.width>0,`${width} content bounds`);
   const photos=await section.locator('.argon-photo').evaluateAll(ns=>ns.map(n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height}}));assert.ok(Math.abs(photos[0].width-photos[1].width)<1);
   if(width===1440)assert.ok(Math.abs(photos[0].y-photos[1].y)<1);if(width<=390)assert.ok(photos[1].y>photos[0].y+photos[0].height);
   await page.evaluate(()=>document.activeElement?.blur());if([1440,1024,390,320].includes(width))await section.screenshot({path:path.join(artifacts,`section-${width}.png`)});
  }
 });
 await t.test('real mobile touch and reduced motion retain continuous essential flow',async()=>{
  const p=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce'});try{await p.clock.install();await p.goto(url,{waitUntil:'networkidle'});await p.waitForFunction(()=>!document.querySelector('.argon-replay').disabled);await p.clock.pauseAt(await p.evaluate(()=>Date.now()+100));await p.locator('.argon-replay').tap();await p.clock.fastForward(1500);const before=Number(await p.locator('.argon-comparison').getAttribute('data-shield'));await p.clock.fastForward(500);assert.ok(Number(await p.locator('.argon-comparison').getAttribute('data-shield'))>before);await p.clock.fastForward(5000);assert.equal(await p.locator('.argon-comparison').getAttribute('data-state'),'complete');}finally{await p.close()}
 });
 await t.test('no JavaScript keeps both photographic explanations and conclusions visible',async()=>{
  const p=await browser.newPage({javaScriptEnabled:false,viewport:{width:390,height:844}});try{await p.goto(url,{waitUntil:'networkidle'});assert.equal(await p.locator('#s5 .argon-example:visible').count(),2);assert.equal(await p.locator('#s5 .argon-example figcaption:visible').count(),2);assert.match(await p.locator('#s5').innerText(),/減少氧化/);assert.equal(await p.locator('.argon-oxidation-layer').evaluate(n=>getComputedStyle(n).opacity),'1');assert.equal(await p.locator('#s5 .argon-replay').isDisabled(),true);}finally{await p.close()}
 });
 assert.deepEqual(errors,[]);
});
