const {test}=require('node:test'),assert=require('node:assert/strict'),{spawn}=require('node:child_process'),path=require('node:path'),fs=require('node:fs/promises');
const {chromium}=require('playwright');
const model=import('../units/3/parts/3.3/assets/fork-model.mjs');
test('fork sound preserves frequency and decay while strength changes amplitude',async()=>{
 const m=await model,soft=m.forkSamples(.3,48000),strong=m.forkSamples(.7,48000);
 assert.equal(soft.length,48000*m.FORK_SECONDS);assert.equal(soft[0],0);assert.ok(Math.abs(soft.at(-1))<1e-4);
 for(let i=0;i<soft.length;i+=37){assert.ok(Math.abs(strong[i]-soft[i]*7/3)<1e-7);assert.ok(Math.abs(strong[i])<.1);}
 const energy=(a,start,end)=>Math.sqrt(a.slice(start*48000,end*48000).reduce((s,x)=>s+x*x,0)/((end-start)*48000));
 assert.ok(energy(soft,.1,.3)>energy(soft,2,2.2)*2);
 for(const t of [.03,.11,.25,.37,.46]){
  const a=m.forkFrame(t,.3),b=m.forkFrame(t,.7);assert.ok(Math.abs(a.displacement/.3-b.displacement/.7)<1e-12);assert.ok(a.extent>=Math.abs(a.displacement));
 }
});
test('fork experiment: actual sound, synchronized motion, recording and layout',{timeout:90000},async t=>{
 const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:['ignore','pipe','ignore']});t.after(()=>server.kill());
 const port=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server timeout')),5000);server.stdout.on('data',d=>{const m=String(d).match(/port (\d+)/);if(m){clearTimeout(timer);resolve(m[1]);}});server.once('error',reject);});
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',...(process.env.SOUND33_BASE_URL?{proxy:{server:process.env.HTTPS_PROXY}}:{})});t.after(()=>browser.close());
 const page=await browser.newPage({viewport:{width:1440,height:1100},reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
 await page.addInitScript(()=>{
  window.forkSounds=[];
  const make=AudioContext.prototype.createBufferSource;
  AudioContext.prototype.createBufferSource=function(){const s=make.call(this),start=s.start.bind(s),stop=s.stop.bind(s);let run;
   s.start=function(...args){const a=s.buffer.getChannelData(0),rate=s.buffer.sampleRate;let sum=0,cross=0;for(let i=Math.floor(.1*rate);i<.3*rate;i++){sum+=a[i]**2;if(a[i-1]<0&&a[i]>=0)cross++;}run={frequency:cross/.2,rms:Math.sqrt(sum/(.2*rate)),peak:a.reduce((peak,v)=>Math.max(peak,Math.abs(v)),0),stopped:false};window.forkSounds.push(run);return start(...args);};s.stop=function(...args){if(run)run.stopped=true;return stop(...args);};return s;
  };
 });
 const base=process.env.SOUND33_BASE_URL||`http://127.0.0.1:${port}/units/3/parts/3.3/`;
 await page.goto(base,{waitUntil:'domcontentloaded'});await page.locator('#fork-apparatus [data-prong]').first().waitFor({state:'attached'});
 const root=page.locator('#card-01'),strike=async key=>{await page.locator(`[data-fork-strike="${key}"]`).click();await page.waitForFunction(()=>document.querySelector('#card-01').dataset.forkState==='vibrating');};
 const reset=async()=>root.locator('.reset').click();
 const sample=()=>page.evaluate(async()=>{
  const rows=[];for(let i=0;i<22;i++){await new Promise(requestAnimationFrame);const photo=document.querySelector('[data-prong="right"]');rows.push({x:photo.querySelector("[data-tip-cap]").getBoundingClientRect().x,left:Number(document.querySelector('[data-prong="left"]').dataset.displacement),right:Number(photo.dataset.displacement),displacement:Number(document.querySelector('#fork-detail').dataset.displacement),main:Number(document.querySelector('#fork-apparatus').dataset.displacement),extent:Number(document.querySelector('#fork-detail').dataset.extent),arrow:document.querySelector('#fork-amplitude-arrow').getAttribute('d')});}return rows;
 });
 await t.test('idle state shows the approved apparatus, accessible actions and unfilled records',async()=>{
  assert.equal(await root.getAttribute('data-playing'),'false');assert.equal(await root.locator('.stop').isDisabled(),true);assert.equal(await root.locator('.fork-conclusion').isHidden(),true);assert.equal(await page.evaluate(()=>window.forkSounds.length),0);
  assert.equal(await root.locator('[data-fork-strike]').count(),2);assert.equal(await root.locator('#amplitude').count(),0);assert.match(await root.locator('.fork-scene').evaluate(n=>getComputedStyle(n).backgroundImage),/fork-tabletop-background/);
  assert.equal(await root.locator('#fork-photo [data-prong]').count(),2);assert.equal(await root.locator('#fork-photo image').count(),0);assert.match(await root.locator('#fork-detail').getAttribute('aria-label'),/平衡位置.*單側最大位移/);
 });
 await t.test('both strikes have the same real frequency; heavy has larger audio and visible displacement',async()=>{
  await strike('soft');const soft=await sample();await strike('strong');const strong=await sample();
  const runs=await page.evaluate(()=>window.forkSounds.slice(-2));assert.ok(runs.every(r=>Math.abs(r.frequency-440)<10));assert.ok(Math.abs(runs[1].rms/runs[0].rms-7/3)<.01);assert.equal(runs[0].stopped,true);assert.ok(runs[0].rms>.12&&runs[1].rms>.28,'final playback buffer is audible at the intended boosted signal level');assert.ok(runs[0].peak>.2&&runs[1].peak>.5&&runs.every(r=>r.peak<.6),'boosted strikes retain headroom without clipping');
  const span=rows=>Math.max(...rows.map(r=>r.x))-Math.min(...rows.map(r=>r.x));assert.ok(span(soft)>.6,'light fork moves visibly');assert.ok(span(strong)>span(soft)*1.6,'stronger stroke visibly increases motion, including reduced-motion preference');
  for(const row of [...soft,...strong]){assert.ok(Math.abs(row.left+row.right)<1e-8,'prongs move in opposite directions');assert.equal(row.main,row.displacement);assert.ok(row.extent>=Math.abs(row.displacement));assert.ok(Number(row.arrow.split('H')[1])>=80,'amplitude is one side of equilibrium');}
  assert.equal(await root.locator('.fork-conclusion').isVisible(),true);assert.equal(await root.locator('.fork-same-pitch').isVisible(),true);
  assert.equal(await page.locator('#amplitude-reference').getAttribute('data-frequency'),await page.locator('#amplitude-live').getAttribute('data-frequency'));
 });
 await t.test('wave traces grow rightward after contact, freeze on stop and restart from the left',async()=>{
  await reset();
  const trace=page.locator('#amplitude-reference');
  assert.equal(await trace.getAttribute('data-progress'),'0');
  await strike('soft');await page.waitForTimeout(250);
  const early=Number(await trace.getAttribute('data-progress'));
  const earlyPath=await trace.locator('.signal').getAttribute('d');
  assert.ok(early>0&&early<.6);
  await page.waitForTimeout(400);
  const later=Number(await trace.getAttribute('data-progress'));
  assert.ok(later>early&&later<1);
  assert.ok((await trace.locator('.signal').getAttribute('d')).startsWith(earlyPath));
  await root.locator('.stop').click();
  const frozen=await trace.locator('.signal').getAttribute('d');
  await page.waitForTimeout(120);assert.equal(await trace.locator('.signal').getAttribute('d'),frozen);
  await strike('soft');assert.ok(Number(await trace.getAttribute('data-progress'))<early);
  await page.waitForFunction(()=>document.querySelector('#card-01').dataset.playing==='false');
  assert.equal(await trace.getAttribute('data-progress'),'1');
  await strike('strong');assert.equal(await trace.getAttribute('data-progress'),'1');
  await reset();assert.equal(await trace.locator('.signal').getAttribute('d'),'');
  assert.equal(await page.locator('#amplitude-live').getAttribute('data-progress'),'0');
  await strike('soft');await strike('strong');
 });
 await t.test('stop retains observations; reset clears them; natural completion and keyboard work',async()=>{
  await root.locator('.stop').click();assert.equal(await root.getAttribute('data-fork-state'),'idle');assert.equal(await page.locator('#fork-apparatus').getAttribute('data-displacement'),'0');assert.equal(await root.locator('.fork-conclusion').isVisible(),true);
  const still=await page.locator('#fork-prong-tip').getAttribute('transform');await page.waitForTimeout(100);assert.equal(await page.locator('#fork-prong-tip').getAttribute('transform'),still);
  await reset();assert.equal(await root.locator('.fork-conclusion').isHidden(),true);assert.equal(await root.locator('[data-observed="true"]').count(),0);assert.equal(await page.locator('#fork-amplitude-marker').getAttribute('visibility'),'hidden');
  await page.locator('[data-fork-strike="soft"]').focus();await page.keyboard.press(' ');await page.waitForFunction(()=>document.querySelector('#card-01').dataset.forkState==='vibrating');
  await page.waitForFunction(()=>document.querySelector('#card-01').dataset.playing==='false');assert.equal(await root.locator('.stop').isDisabled(),true);assert.equal(await root.locator('[data-fork-record="soft"]').getAttribute('data-observed'),'true');
 });
 await t.test('rapid repeat, navigation, offscreen, hidden tab and pagehide stop sound and motion',async()=>{
  await strike('soft');await strike('strong');assert.equal(await page.evaluate(()=>window.forkSounds.filter(r=>!r.stopped).length),1);
  await page.locator('.route a[href="#card-02"]').click();assert.equal(await root.getAttribute('data-playing'),'false');await page.locator('.route a[href="#card-01"]').click();assert.equal(await root.getAttribute('data-playing'),'false');
  await strike('strong');await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));delete document.hidden;});assert.equal(await root.getAttribute('data-playing'),'false');
  await strike('soft');await page.locator('#card-07').evaluate(n=>n.scrollIntoView({block:'start'}));await page.waitForFunction(()=>document.querySelector('#card-01').dataset.playing==='false');
  await strike('strong');await page.evaluate(()=>dispatchEvent(new Event('pagehide')));assert.equal(await root.getAttribute('data-playing'),'false');assert.equal(await page.locator('#fork-apparatus').getAttribute('data-displacement'),'0');
 });
 await t.test('cancelled async audio preparation never starts later; playback failure can retry',async()=>{
  const before=await page.evaluate(()=>window.forkSounds.length);
  await page.evaluate(()=>{window.nativeResume=AudioContext.prototype.resume;AudioContext.prototype.resume=function(){return new Promise(resolve=>setTimeout(resolve,350));};});
  await page.locator('[data-fork-strike="soft"]').click();await page.locator('.route a[href="#card-02"]').click();await page.waitForTimeout(450);assert.equal(await page.evaluate(()=>window.forkSounds.length),before);assert.equal(await root.getAttribute('data-playing'),'false');
  await page.evaluate(()=>{AudioContext.prototype.resume=function(){AudioContext.prototype.resume=window.nativeResume;return Promise.reject(new Error('test audio rejection'));};});
  await page.locator('[data-fork-strike="soft"]').click();await page.waitForFunction(()=>document.querySelector('#card-01 .play-state').textContent.includes('無法播放'));assert.equal(await root.locator('.stop').isDisabled(),true);
  await strike('soft');await root.locator('.stop').click();
 });
 await t.test('desktop/laptop visual hierarchy matches the approved mockup and mobile stays usable',async()=>{
  await strike('soft');await strike('strong');await root.locator('.stop').click();await fs.mkdir('/tmp/unit33-fork-review',{recursive:true});
  for(const width of [1024,1280,1440,1920,820,390,320]){
   await page.setViewportSize({width,height:1100});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   const metrics=await root.evaluate(n=>{const r=s=>n.querySelector(s).getBoundingClientRect(),a=r('.fork-scene'),b=r('.fork-closeup'),c=r('.fork-actions'),records=r('.fork-records'),buttons=[...n.querySelectorAll('.fork-actions button')].map(x=>x.getBoundingClientRect());return {stageBottom:a.bottom,insetRight:b.right,stageRight:a.right,controlsTop:c.top,recordsTop:records.top,controlsBottom:c.bottom,buttonTops:buttons.map(r=>r.top),bounds:n.getBoundingClientRect().toJSON()};});
   assert.ok(metrics.insetRight<=metrics.stageRight);assert.ok(metrics.controlsTop>=metrics.stageBottom);assert.ok(metrics.recordsTop>=metrics.controlsBottom);
   if(width>=1024)assert.ok(Math.max(...metrics.buttonTops)-Math.min(...metrics.buttonTops)<1,'four controls stay in one row like mockup');
   assert.equal(await root.locator('.fork-record').count(),2);await root.screenshot({path:`/tmp/unit33-fork-review/section-${width}.png`});
  }
 });
 assert.deepEqual(errors,[]);
});
