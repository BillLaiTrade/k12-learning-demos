const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');
const fs=require('node:fs/promises');
const {chromium}=require('playwright');

test('2.1 static documentary photo pairs and retained particle transitions',{timeout:300000},async t=>{
 const override=process.env.PHASE_PHOTOS_URL;
 let base=override;
 if(!base){
  const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:['ignore','pipe','ignore']});t.after(()=>server.kill());
  const port=await new Promise((resolve,reject)=>{let out='';const timer=setTimeout(()=>reject(Error('server timeout')),5000);server.stdout.on('data',data=>{out+=data;const m=out.match(/port (\d+)/);if(m){clearTimeout(timer);resolve(m[1]);}});server.once('error',reject);});
  base=`http://127.0.0.1:${port}/units/2/parts/2.1/`;
 }
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox'],...(override?{proxy:{server:process.env.HTTPS_PROXY||process.env.HTTP_PROXY}}:{})});t.after(()=>browser.close());
 const captures=process.env.PHASE_LIFE_CAPTURE_DIR||'/tmp/k12-21-phase-photos';await fs.mkdir(captures,{recursive:true});
 const target={melt:'liquid',freeze:'solid',vaporization:'gas',condensation:'liquid',sublimation:'gas',deposition:'solid'};
 const errors=[],results=[];let page;
 async function open(width,height=900,reducedMotion='no-preference',suffix=''){
  if(page)await page.close();page=await browser.newPage({viewport:{width,height},reducedMotion});
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  await page.goto(base+suffix);await page.evaluate(()=>Promise.all([PhaseLife.readyPromise,document.fonts.ready]));
  assert.equal(await page.locator('#phase-life').getAttribute('data-assets'),'ready');await page.clock.install({time:new Date('2026-10-31T00:00:00Z')});await page.clock.pauseAt(new Date('2026-10-31T00:00:01Z'));
 }
 async function center(){await page.evaluate(()=>{const a=document.getElementById('freeze-demo').getBoundingClientRect(),b=document.getElementById('phase-life').getBoundingClientRect();window.scrollBy({top:(a.top+b.bottom-innerHeight)/2,behavior:'instant'});});}
 async function select(key){await page.evaluate(k=>selectPhaseProcess(k),key);await page.clock.runFor(32);await center();await page.clock.runFor(32);await page.locator('#phase-life img').evaluateAll(images=>Promise.all(images.map(im=>im.decode())));await new Promise(resolve=>setTimeout(resolve,100));await center();await page.locator('#phase-life').screenshot();await page.clock.runFor(64);}
 async function inspect(key){return page.evaluate(({key,to})=>{
  const root=document.getElementById('phase-life'),panel=document.getElementById('freeze-demo'),particles=[...panel.querySelectorAll('#freeze-demo-particles > circle')];
  const box=n=>{const r=n.getBoundingClientRect();return{top:r.top,bottom:r.bottom,left:r.left,right:r.right,height:r.height,width:r.width};};
  return{population:document.getElementById('phase-detail').classList.contains('is-solid-overview')?phaseOverviewCount:null,key:root.dataset.process,progress:Number(panel.dataset.progress),total:particles.length,changed:particles.filter(p=>p.classList.contains(`is-${to}`)).length,
   photos:[...root.querySelectorAll('img')].map(im=>({src:im.src,alt:im.alt,width:im.naturalWidth,loaded:im.complete,box:box(im)})),
   labels:[...root.querySelectorAll('figcaption')].map(n=>n.textContent),photoBox:box(root),particleBox:box(panel),stageBox:box(document.querySelector('.phase-solid-stage')),
   animations:root.getAnimations({subtree:true}).length,synthetic:root.querySelectorAll('svg,canvas,video').length,
   overflow:document.documentElement.scrollWidth>innerWidth+1,textOverflow:[...root.querySelectorAll('h4,p,a')].some(n=>n.scrollHeight>n.clientHeight+1),
   text:root.innerText,source:root.querySelector('a').href};
 },{key,to:target[key]});}
 function check(s,key,half=true){
  assert.equal(s.key,key);assert.equal(s.total,s.population??48);assert.equal(s.synthetic,0);assert.equal(s.animations,0);assert.equal(s.photos.length,2);assert.deepEqual(s.labels,['變化前','變化後']);
  assert.equal(s.overflow,false);assert.equal(s.textOverflow,false);
  assert.notEqual(s.photos[0].src,s.photos[1].src);
  for(const [i,p]of s.photos.entries()){assert.ok(p.loaded&&p.width>200);assert.match(p.src,new RegExp(`phase-photo-${key}-${i?'after':'before'}\\.webp`));assert.ok(p.alt);assert.ok(p.box.top>=s.photoBox.top&&p.box.bottom<=s.photoBox.bottom+1);assert.ok(p.box.left>=s.photoBox.left&&p.box.right<=s.photoBox.right+1);}
  assert.ok(s.photos[1].box.left>s.photos[0].box.left);
  if(half)assert.ok(Math.abs(s.photoBox.height/s.stageBox.height-.5)<.02,JSON.stringify(s));
  assert.match(s.source,new RegExp(`phase-life-credits.html#${key}$`));
 }
 for(const [width,height]of [[1920,1080],[1440,900],[1366,768],[1280,800],[1024,768]]){
  await open(width,height);
  for(const key of Object.keys(target))await t.test(`${width}×${height} ${key}: two fixed photos; particles still transform`,async()=>{
   await select(key);const start=await inspect(key);check(start,key);assert.equal(start.progress,0);
   assert.ok(start.particleBox.top>=0&&start.photoBox.bottom<=height+1,'particle and photo panels fit together');
   const fixed=await page.locator('#phase-life').screenshot();
   await page.clock.fastForward(4000);await page.clock.runFor(32);const mid=await inspect(key);check(mid,key);assert.ok(mid.progress>0&&mid.progress<1,JSON.stringify(mid));
   assert.deepEqual(await page.locator('#phase-life').screenshot(),fixed,'photo block has no time-dependent visual changes');
   await page.clock.fastForward(10000);await page.clock.runFor(32);const end=await inspect(key);check(end,key);assert.equal(end.progress,1);assert.equal(end.changed,key==='vaporization'?24:48);
   assert.deepEqual(await page.locator('#phase-life').screenshot(),fixed,'completed upper animation does not alter photographs');
   results.push({width,height,key,particleHeight:end.particleBox.height,photoHeight:end.photoBox.height});
   if(width===1366)await page.locator('#phase-detail').screenshot({path:path.join(captures,`${key}-1366.png`)});
  });
 }
 await t.test('all six replay buttons restart only the particle transition',async()=>{
  for(const key of Object.keys(target)){
   await select(key);await page.clock.fastForward(15000);await page.clock.runFor(32);assert.equal((await inspect(key)).progress,1);
   const fixed=await page.locator('#phase-life').screenshot();await page.locator('#freeze-demo-replay').click();await page.clock.runFor(32);
   const start=await inspect(key);check(start,key);assert.equal(start.progress,0);assert.deepEqual(await page.locator('#phase-life').screenshot(),fixed);
   await page.clock.fastForward(15000);await page.clock.runFor(32);assert.equal((await inspect(key)).progress,1);
  }
 });
 await t.test('rapid switching cancels the previous particle transition and selects the right pair',async()=>{
  await select('melt');await page.clock.fastForward(2200);await select('deposition');await select('vaporization');await page.clock.fastForward(15000);await page.clock.runFor(32);
  const s=await inspect('vaporization');check(s,'vaporization');assert.equal(s.progress,1);assert.equal(s.changed,24);
 });
 await t.test('leaving the lesson pauses particles; returning resumes without changing photos',async()=>{
  await select('melt');await page.clock.fastForward(4000);await page.clock.runFor(32);const before=await inspect('melt');assert.ok(before.progress>0&&before.progress<1,JSON.stringify(before));
  await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await page.clock.runFor(32);const paused=await inspect('melt');await page.clock.fastForward(3000);await page.clock.runFor(32);assert.equal((await inspect('melt')).progress,paused.progress);
  await center();await new Promise(resolve=>setTimeout(resolve,100));await page.clock.runFor(64);await page.clock.fastForward(2800);await page.clock.runFor(32);const resumed=await inspect('melt');assert.ok(resumed.progress>paused.progress);assert.deepEqual(resumed.photos.map(p=>p.src),before.photos.map(p=>p.src));
 });
 await t.test('all twelve overview routes retain their particle flow and select static pairs',async()=>{
  for(const state of ['solid','liquid','gas']){
   await page.evaluate(k=>selectPhaseState(k),state);assert.equal(await page.locator('#phase-life').isVisible(),false);
   for(const slot of ['top-left','top-right','bottom-left','bottom-right']){
    const key=await page.evaluate(slot=>{const b=document.querySelector(`.phase-solid-process[data-overview-slot="${slot}"]`);selectPhaseProcess(b.dataset.phaseProcess,true);return b.dataset.phaseProcess;},slot);
    await page.clock.runFor(32);await page.locator('#phase-life img').evaluateAll(images=>Promise.all(images.map(im=>im.decode())));
    const s=await inspect(key);check(s,key,false);
    await page.evaluate(()=>{const f=phaseOverviewFlow;changePhaseOverviewPopulation(f,f.incoming?1:-1);});
    assert.deepEqual((await inspect(key)).photos.map(p=>p.src),s.photos.map(p=>p.src));
    await page.evaluate(k=>selectPhaseState(k),state);assert.equal(await page.locator('#phase-life').isVisible(),false);
   }
  }
 });
 await t.test('reduced motion retains particle teaching animation and fixed photographs',async()=>{
  await open(1366,768,'reduce');for(const key of Object.keys(target)){await select(key);const start=await inspect(key);check(start,key);await page.clock.fastForward(15000);await page.clock.runFor(32);const end=await inspect(key);check(end,key);assert.equal(end.progress,1);assert.deepEqual(end.photos.map(p=>p.src),start.photos.map(p=>p.src));}
 });
 await t.test('share link selects photographs and runs particles without manual scrolling',async()=>{
  if(page)await page.close();page=await browser.newPage({viewport:{width:1366,height:768}});page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'?phase=vaporization#phase-detail');await page.waitForFunction(()=>Number(document.getElementById('freeze-demo').dataset.progress)>0,null,{timeout:15000});
  const s=await inspect('vaporization');check(s,'vaporization');assert.ok(s.particleBox.top>=0&&s.photoBox.bottom<=768);
 });
 await t.test('small screens keep both photos readable without overflow',async()=>{
  await open(390,844);await select('condensation');check(await inspect('condensation'),'condensation',false);
 });
 await t.test('source page and every documentary photo are available',async()=>{
  const r=await page.request.get(new URL('assets/phase-life-credits.html',base).href);assert.equal(r.status(),200);const credits=await r.text();assert.match(credits,/Maxim Bilovitskiy/);assert.match(credits,/CC BY-SA 4.0/);assert.match(credits,/NASA/);assert.match(credits,/Alberta Studios/);assert.match(credits,/Devyn Breslin/);assert.match(credits,/分別取材/);assert.doesNotMatch(credits,/Boreyko/);
 });
 await t.test('no script or asset failures',()=>assert.deepEqual(errors,[]));
 await fs.writeFile(path.join(captures,'result.json'),JSON.stringify({results,errors},null,2));
});
