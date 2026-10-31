const {test}=require('node:test'),assert=require('node:assert/strict'),{spawn}=require('node:child_process'),path=require('node:path'),fs=require('node:fs/promises'),{chromium}=require('playwright');
test('hearing exploration: continuous sine, frequency ribbon and manual records',{timeout:180000},async t=>{
 const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:['ignore','pipe','ignore']});t.after(()=>server.kill());
 const port=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server timeout')),5000);server.stdout.on('data',d=>{const m=String(d).match(/port (\d+)/);if(m){clearTimeout(timer);resolve(m[1]);}});server.once('error',reject);});
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',...(process.env.SOUND33_BASE_URL?{proxy:{server:process.env.HTTPS_PROXY}}:{})});t.after(()=>browser.close());
 const context=await browser.newContext({viewport:{width:1440,height:1200},reducedMotion:'reduce'});t.after(()=>context.close());
 await context.addInitScript(()=>{
  window.hearingRuns=[];const create=AudioContext.prototype.createOscillator;
  AudioContext.prototype.createOscillator=function(){const node=create.call(this),start=node.start.bind(node),stop=node.stop.bind(node),context=this;let run;
   node.start=(...args)=>{run={node,context,stopped:false};window.hearingRuns.push(run);return start(...args);};node.stop=(...args)=>{if(run)run.stopped=true;return stop(...args);};return node;};
 });
 const page=await context.newPage(),errors=[],capture=process.env.HEARING_CAPTURE_DIR||'/tmp/unit33-hearing-review';await fs.mkdir(capture,{recursive:true});
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
 const url=process.env.SOUND33_BASE_URL||`http://127.0.0.1:${port}/units/3/parts/3.3/`;
 await page.goto(url+'#card-06',{waitUntil:'networkidle'});
 const root=page.locator('#card-06'),band=root.locator('[data-hearing-band]'),toggle=root.locator('[data-hearing-toggle]'),reset=async()=>root.locator('[data-hearing-reset]').click();
 const select=async frequency=>{const b=await band.boundingBox(),fraction=Math.log(frequency/20)/Math.log(1000);await page.mouse.click(b.x+b.width*fraction,b.y+b.height*.75);return Number(await band.getAttribute('aria-valuenow'));};
 const play=async()=>{await toggle.click();await page.waitForFunction(()=>document.querySelector('#card-06').dataset.playing==='true');};
 await t.test('approved composition has no autoplay, a logarithmic ribbon and empty manual endpoints',async()=>{
  assert.equal(await root.locator('h2').innerText(),'你聽得到哪些頻率的聲音？');assert.equal(await root.locator('#hearing-frequency').innerText(),'1,000 Hz');
  assert.equal(await page.evaluate(()=>window.hearingRuns.length),0);assert.equal(await root.locator('[data-hearing-record]').count(),2);assert.equal(await root.getAttribute('data-low'),'');assert.equal(await root.getAttribute('data-high'),'');
  assert.ok(await band.evaluate(n=>getComputedStyle(n.querySelector('.hearing-ribbon')).backgroundImage.includes('gradient')));
  assert.ok(Math.abs(await band.evaluate(n=>parseFloat(n.style.getPropertyValue('--frequency-position')))-56.633)<.01);
  assert.equal(await root.locator('.hearing-animals').getAttribute('open'),null);assert.equal(await root.locator('form').count(),0);
 });
 await t.test('actual rendered tones have the chosen frequency, fixed low gain and smooth start/stop',async()=>{
  const results=await page.evaluate(async()=>{
   const {createHearingVoice}=await import(new URL('assets/hearing-audio.mjs?v=1',location.href));const results=[];
   for(const hz of [20,80,1000,8000,16000,20000]){
    const c=new OfflineAudioContext(1,24000,48000),voice=createHearingVoice(c,hz);voice.start();voice.stop(.4);const buffer=await c.startRendering(),a=buffer.getChannelData(0);let crossings=0,sum=0,peak=0;
    for(let i=4800;i<14400;i++){sum+=a[i]**2;if(a[i-1]<=0&&a[i]>0)crossings++;}for(const v of a)peak=Math.max(peak,Math.abs(v));
    results.push({hz,measured:crossings/.2,rms:Math.sqrt(sum/9600),peak,first:a[0],afterStop:Math.max(...a.slice(21000).map(Math.abs))});
   }
   const c=new OfflineAudioContext(1,24000,48000),v=createHearingVoice(c,1000);v.start();v.setFrequency(2000,.15);v.stop(.4);const a=(await c.startRendering()).getChannelData(0);let count=0;for(let i=12000;i<16800;i++)if(a[i-1]<=0&&a[i]>0)count++;
   results.push({retuned:count/.1});return results;
  });
  for(const r of results.slice(0,-1)){assert.ok(Math.abs(r.measured-r.hz)<=5,`${r.hz}Hz rendered ${r.measured}`);assert.ok(r.rms>.03&&r.rms<.044,`${r.hz}Hz RMS ${r.rms}`);if(r.hz<=16000)assert.ok(Math.abs(r.rms-.06/Math.sqrt(2))<.0001);assert.ok(r.peak<=.060001);assert.equal(r.first,0);assert.equal(r.afterStop,0);}
  assert.ok(Math.abs(results.at(-1).retuned-2000)<=10);
  const early=await page.evaluate(async()=>{const {createHearingVoice}=await import(new URL('assets/hearing-audio.mjs?v=1',location.href)),c=new OfflineAudioContext(1,4800,48000),v=createHearingVoice(c,1000);v.start();v.stop(.01);const a=(await c.startRendering()).getChannelData(0);return{peak:Math.max(...a.map(Math.abs)),after:Math.max(...a.slice(2400).map(Math.abs))};});assert.ok(early.peak>0&&early.peak<.016);assert.equal(early.after,0);
 });
 await t.test('play is continuous and retunes the existing real oscillator without restarting or boosting volume',async()=>{
  await reset();await play();await page.waitForTimeout(1300);assert.equal(await root.getAttribute('data-playing'),'true');
  const n=await page.evaluate(()=>window.hearingRuns.length),chosen=await select(8000);await page.waitForTimeout(80);
  const actual=await page.evaluate(()=>{const r=window.hearingRuns.at(-1);return{hz:r.node.frequency.value,type:r.node.type,stopped:r.stopped};});
  assert.equal(await page.evaluate(()=>window.hearingRuns.length),n);assert.equal(actual.type,'sine');assert.ok(Math.abs(actual.hz-chosen)<.1);assert.equal(actual.stopped,false);
  await toggle.click();assert.equal(await root.getAttribute('data-playing'),'false');assert.equal(await page.evaluate(()=>window.hearingRuns.at(-1).stopped),true);
  await play();await page.waitForTimeout(60);assert.ok(Math.abs(await page.evaluate(()=>window.hearingRuns.at(-1).node.frequency.value)-chosen)<.1);await toggle.click();
 });
 await t.test('real dragging clamps both ends and keyboard works while paused without starting audio',async()=>{
  await reset();const n=await page.evaluate(()=>window.hearingRuns.length),b=await band.boundingBox();await page.mouse.move(b.x+b.width*.3,b.y+b.height*.7);await page.mouse.down();await page.mouse.move(b.x+b.width*1.15,b.y+b.height*.7,{steps:12});await page.mouse.up();assert.equal(await band.getAttribute('aria-valuenow'),'20000');
  await page.mouse.move(b.x+b.width*.7,b.y+b.height*.7);await page.mouse.down();await page.mouse.move(b.x-30,b.y+b.height*.7,{steps:12});await page.mouse.up();assert.equal(await band.getAttribute('aria-valuenow'),'20');
  await band.focus();await page.keyboard.press('ArrowRight');assert.ok(Number(await band.getAttribute('aria-valuenow'))>20);await page.keyboard.press('End');assert.equal(await band.getAttribute('aria-valuenow'),'20000');await page.keyboard.press('Home');assert.equal(await band.getAttribute('aria-valuenow'),'20');
  assert.equal(await page.evaluate(()=>window.hearingRuns.length),n);await reset();
 });
 await t.test('manual endpoints can be recorded and overwritten, reject reversed bounds and survive pause/navigation',async()=>{
  const low=await select(80);await root.locator('[data-hearing-record=low]').click();const high=await select(8000);await root.locator('[data-hearing-record=high]').click();assert.equal(await root.getAttribute('data-low'),String(low));assert.equal(await root.getAttribute('data-high'),String(high));
  await play();await root.locator('[data-hearing-record=high]').click();assert.equal(await root.getAttribute('data-playing'),'true');await toggle.click();
  await select(16000);await root.locator('[data-hearing-record=low]').click();assert.equal(await root.getAttribute('data-low'),String(low));assert.match(await root.locator('.hearing-feedback').innerText(),/不能高於/);
  await select(20);await root.locator('[data-hearing-record=high]').click();assert.equal(await root.getAttribute('data-high'),String(high));assert.match(await root.locator('.hearing-feedback').innerText(),/不能低於/);
  const replaced=await select(100);await root.locator('[data-hearing-record=low]').click();assert.equal(await root.getAttribute('data-low'),String(replaced));
  await page.locator('.route a[href="#card-07"]').click();await page.locator('.route a[href="#card-06"]').click();assert.equal(await root.getAttribute('data-low'),String(replaced));assert.equal(await root.getAttribute('data-playing'),'false');
  await reset();assert.equal(await root.getAttribute('data-low'),'');assert.equal(await root.getAttribute('data-high'),'');assert.equal(await band.getAttribute('aria-valuenow'),'1000');
 });
 await t.test('speaker click toggles, other blocks replace sound and hiding/leaving/reset stop without autoplay',async()=>{
  await root.locator('.hearing-speaker-button').click();await page.waitForFunction(()=>document.querySelector('#card-06').dataset.playing==='true');await root.locator('.hearing-speaker-button').click();assert.equal(await root.getAttribute('data-playing'),'false');
  for(const action of [async()=>page.locator('[data-play=tone-pure]').click(),async()=>page.locator('.route a[href="#card-07"]').click(),async()=>page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));delete document.hidden;}),async()=>page.locator('#unit-quiz').evaluate(n=>n.scrollIntoView()),reset]){
   await play();await action();await page.waitForFunction(()=>document.querySelector('#card-06').dataset.playing==='false');assert.equal(await page.evaluate(()=>window.hearingRuns.at(-1).stopped),true);
  }
  await page.locator('[data-play=tone-string]').click();await page.waitForFunction(()=>document.querySelector('#card-05').dataset.playing==='true');await play();assert.equal(await page.locator('#card-05').getAttribute('data-playing'),'false');await toggle.click();
 });
 await t.test('pending resume can be cancelled and playback errors can retry',async()=>{
  await page.evaluate(()=>{window.savedHearingResume=AudioContext.prototype.resume;AudioContext.prototype.resume=function(){return new Promise(r=>window.releaseHearing=r);};});await toggle.click();assert.equal(await root.getAttribute('data-preparing'),'true');const n=await page.evaluate(()=>window.hearingRuns.length);await toggle.click();await page.evaluate(()=>window.releaseHearing());await page.waitForTimeout(70);assert.equal(await page.evaluate(()=>window.hearingRuns.length),n);
  await toggle.click();await reset();await page.evaluate(()=>window.releaseHearing());await page.waitForTimeout(60);assert.equal(await page.evaluate(()=>window.hearingRuns.length),n);
  await page.evaluate(()=>AudioContext.prototype.resume=()=>Promise.reject(Error('test')));await toggle.click();await page.waitForFunction(()=>!document.querySelector('.hearing-feedback').hidden);assert.match(await root.locator('.hearing-feedback').innerText(),/無法播放/);await page.evaluate(()=>AudioContext.prototype.resume=window.savedHearingResume);await play();await toggle.click();
 });
 await t.test('knowledge retains hearing range, animal upper bounds and device/colour limitations',async()=>{
  await root.locator('.hearing-animals summary').click();const text=await root.locator('.hearing-animals').innerText();assert.match(text,/次聲波[\s\S]*超聲波/);assert.match(text,/沒有聲波/);assert.match(text,/30,000[\s\S]*100,000/);assert.match(text,/顏色/);await root.locator('.hearing-animals summary').click();
 });
 await t.test('approved desktop hierarchy and mobile controls remain inside their panels at eight widths',async()=>{
  await select(80);await root.locator('[data-hearing-record=low]').click();await select(8000);await root.locator('[data-hearing-record=high]').click();
  for(const width of [1920,1440,1280,1024,820,760,390,320]){
   await page.setViewportSize({width,height:1200});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   const issues=await root.evaluate(n=>{const box=n.getBoundingClientRect();return[...n.querySelectorAll('button,[role=slider],output,.dialogue')].flatMap(el=>{const b=el.getBoundingClientRect();return b.width&&(b.left<box.left||b.right>box.right+1||el.scrollWidth>el.clientWidth+2)?[el.className||el.id]:[];});});assert.deepEqual(issues,[],`${width}px layout`);
   const geometry=await root.evaluate(n=>{const b=s=>n.querySelector(s).getBoundingClientRect();const image=b('.hearing-speaker-stage'),readout=b('.hearing-readout'),ribbon=b('.hearing-ribbon'),records=b('.hearing-records');return {image:{left:image.left,right:image.right,top:image.top,bottom:image.bottom},readout:{left:readout.left,bottom:readout.bottom},ribbon:{left:ribbon.left,top:ribbon.top},records:{top:records.top}};});
   assert.ok(geometry.image.right<=geometry.readout.left+1);assert.ok(geometry.readout.bottom<=geometry.ribbon.top);assert.ok(geometry.records.top>geometry.ribbon.top);
   if([1440,1024,390].includes(width)){if(width===390)await page.setViewportSize({width,height:1700});await root.screenshot({path:path.join(capture,`hearing-${width}.png`)});}
  }
  await page.setViewportSize({width:1440,height:1200});await play();await root.screenshot({path:path.join(capture,'hearing-playing.png')});await toggle.click();
 });
 await t.test('real mobile touch drags while the same tone plays and taps toggle once',async()=>{
  const c=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),p=await c.newPage();await p.addInitScript(()=>{window.starts=0;const create=AudioContext.prototype.createOscillator;AudioContext.prototype.createOscillator=function(){const o=create.call(this),start=o.start.bind(o);o.start=(...args)=>{window.starts++;return start(...args);};return o;};});await p.goto(url+'#card-06',{waitUntil:'networkidle'});
  const button=p.locator('[data-hearing-toggle]');await button.tap();await p.waitForFunction(()=>document.querySelector('#card-06').dataset.playing==='true');const ribbon=p.locator('[data-hearing-band]');await ribbon.scrollIntoViewIfNeeded();const b=await ribbon.boundingBox(),cdp=await c.newCDPSession(p);
  const x=b.x+b.width*.3,y=b.y+b.height*.7;await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:b.x+b.width*.8,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.ok(Number(await ribbon.getAttribute('aria-valuenow'))>4500);assert.equal(await p.evaluate(()=>window.starts),1);assert.equal(await p.locator('#card-06').getAttribute('data-playing'),'true');await button.tap();await p.waitForTimeout(70);assert.equal(await p.locator('#card-06').getAttribute('data-playing'),'false');assert.equal(await p.evaluate(()=>window.starts),1);
  await button.tap();await p.waitForFunction(()=>window.starts===2);const selected=await ribbon.getAttribute('aria-valuenow');await p.locator('[data-hearing-record=low]').tap();assert.equal(await p.locator('#card-06').getAttribute('data-low'),selected);assert.equal(await p.locator('#card-06').getAttribute('data-playing'),'true');await p.locator('[data-hearing-reset]').tap();assert.equal(await p.locator('#card-06').getAttribute('data-low'),'');assert.equal(await p.locator('#card-06').getAttribute('data-playing'),'false');
  await p.locator('.hearing-speaker-button').tap();await p.waitForFunction(()=>window.starts===3);await p.locator('.hearing-speaker-button').tap();await p.waitForTimeout(70);assert.equal(await p.evaluate(()=>window.starts),3);assert.equal(await p.locator('#card-06').getAttribute('data-playing'),'false');await c.close();
 });
 assert.deepEqual(errors,[]);
});
