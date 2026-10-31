const {test}=require('node:test'),assert=require('node:assert/strict'),{spawn}=require('node:child_process'),path=require('node:path'),fs=require('node:fs/promises'),crypto=require('node:crypto');
const {chromium}=require('playwright');
const keys=['study','nature','whisper','residence','conversation','classroom','train','boiler','construction','club','equipment','jet'];
const root=path.resolve(__dirname,'..'),assets=path.join(root,'units/3/parts/3.3/assets/decibel-audio');
async function fixture(t,mobile=false){
 const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:root,stdio:['ignore','pipe','ignore']});t.after(()=>server.kill());
 const port=await new Promise((resolve,reject)=>{server.on('error',reject);server.stdout.on('data',d=>{const m=String(d).match(/port (\d+)/);if(m)resolve(m[1]);});});
 const remote=process.env.SOUND33_BASE_URL;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',...(remote?{proxy:{server:process.env.HTTPS_PROXY,bypass:'127.0.0.1,localhost'}}:{})});t.after(()=>browser.close());
 const page=await browser.newPage(mobile?{viewport:{width:390,height:844},hasTouch:true,isMobile:true}:{viewport:{width:1440,height:1200}});
 await page.addInitScript(()=>{
  window.sceneRuns=[];
  const create=AudioContext.prototype.createBufferSource;
  AudioContext.prototype.createBufferSource=function(){
   window.sceneContext=this;const source=create.call(this),start=source.start.bind(source),stop=source.stop.bind(source);let row;
   source.start=function(...args){row={buffer:source.buffer,stopped:false,scene:document.querySelector('#card-07').dataset.audioScene};window.sceneRuns.push(row);return start(...args);};
   source.stop=function(...args){if(row)row.stopped=true;return stop(...args);};return source;
  };
 });
 const url=remote||`http://127.0.0.1:${port}/units/3/parts/3.3/`;
 return {page,url};
}
async function select(page,index){const band=page.locator('[data-decibel-band]');await band.focus();await page.keyboard.press('Home');for(let i=0;i<index;i++)await page.keyboard.press('ArrowRight');}
async function playing(page,key){await page.waitForFunction(k=>{const r=document.querySelector('#card-07');return r.dataset.audioState==='playing'&&r.dataset.audioScene===k;},key);}
const count=page=>page.evaluate(()=>window.sceneRuns.length);

test('twelve licensed recordings have verified hashes, ordered measured LUFS and peak headroom',async()=>{
 const rows=JSON.parse(await fs.readFile(path.join(assets,'recordings.json')));assert.deepEqual(rows.map(r=>r.key),keys);
 let previous=-Infinity;
 for(const row of rows){
  assert.ok(row.author&&row.source_url&&row.license_url&&row.modifications&&row.source_sha256);
  assert.equal(row.derived_license,row.license);assert.ok(/^(CC0|CC BY|Public domain)/.test(row.license));
  const file=path.join(assets,row.key+'.wav'),bytes=await fs.readFile(file);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),row.sha256);
  const measured=require('node:child_process').spawnSync('ffmpeg',['-hide_banner','-i',file,'-af','loudnorm=I=-23:TP=-3:LRA=11:print_format=json','-f','null','-'],{encoding:'utf8'});
  assert.equal(measured.status,0);const m=JSON.parse(measured.stderr.match(/\{[^{}]+"input_i"[^{}]+\}/)[0]);
  assert.ok(Number(m.input_i)>previous+1.7&&Number(m.input_i)<(previous===-Infinity?Infinity:previous+2.3));previous=Number(m.input_i);
  assert.ok(Number(m.input_tp)<=-2.95);assert.ok(Math.abs(Number(m.input_i)-row.target_lufs)<.25);
  assert.ok(Math.abs(row.baseline_measurement.lufs+23)<.15);
 }
});

test('all twelve scenes play their actual PCM, picture/button replay and live selection stay synchronized',{timeout:120000},async t=>{
 const {page,url}=await fixture(t);const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(url,{waitUntil:'networkidle'});
 assert.equal(await count(page),0);
 for(let i=0;i<12;i++){
  await select(page,i);assert.equal(await page.locator('#card-07').getAttribute('data-audio-state'),'stopped');
  await page.locator(i%2?'[data-decibel-picture]':'[data-decibel-play]').click();await playing(page,keys[i]);
  const same=await page.evaluate(async key=>{
   const actual=window.sceneRuns.at(-1).buffer,context=window.sceneContext;
   const response=await fetch(new URL(`assets/decibel-audio/${key}.wav?v=1`,location.href));const expected=await context.decodeAudioData(await response.arrayBuffer());
   if(actual.length!==expected.length||actual.sampleRate!==expected.sampleRate)return false;
   for(let c=0;c<actual.numberOfChannels;c++){const a=actual.getChannelData(c),b=expected.getChannelData(c);for(let j=0;j<a.length;j++)if(a[j]!==b[j])return false;}return true;
  },keys[i]);assert.equal(same,true,keys[i]+' must play the selected recording');
  await page.locator('#card-07 .stop').click();assert.equal(await page.locator('#card-07').getAttribute('data-playing'),'false');
 }
 await select(page,4);await page.locator('[data-decibel-play]').click();await playing(page,'conversation');const before=await count(page);
 await page.locator('[data-decibel-picture]').click();await playing(page,'conversation');assert.equal(await count(page),before+1);assert.equal(await page.evaluate(()=>window.sceneRuns.at(-2).stopped),true);
 const band=page.locator('[data-decibel-band]');await band.focus();await page.keyboard.press('ArrowRight');await playing(page,'classroom');
 assert.equal(await page.evaluate(()=>window.sceneRuns.at(-2).stopped),true);
 await page.locator('#card-07 .stop').click();const stopped=await count(page);await page.keyboard.press('Home');await page.waitForTimeout(200);assert.equal(await count(page),stopped);
 await select(page,2);await page.locator('[data-decibel-play]').click();await playing(page,'whisper');await page.waitForFunction(()=>document.querySelector('#card-07').dataset.audioState==='stopped');
 await page.locator('.decibel-audio-sources summary').click();assert.equal(await page.locator('[data-decibel-credits] li').count(),12);assert.match(await page.locator('.decibel-listening-note').innerText(),/不代表.*實際 dBA/);
 assert.deepEqual(errors,[]);
});

test('slow cancellation, rapid switching, failed retry, hidden/leave/other sources never start stale audio',{timeout:120000},async t=>{
 const {page,url}=await fixture(t);let held=[];
 await page.route('**/decibel-audio/*.wav*',route=>{held.push(route);});await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.locator('[data-decibel-play]').click();await page.waitForFunction(()=>document.querySelector('#card-07').dataset.audioState==='preparing');
 await page.locator('#card-07 .stop').click();while(!held.length)await page.waitForTimeout(20);await held.shift().continue();await page.waitForTimeout(400);assert.equal(await count(page),0);
 await select(page,0);await page.locator('[data-decibel-picture]').click();await page.locator('[data-decibel-band]').focus();await page.keyboard.press('End');
 await page.waitForTimeout(200);assert.equal(await page.locator('#card-07').getAttribute('data-audio-state'),'preparing');
 // Release latest first, then obsolete study; old completion cannot replace jet.
 for(const route of held.filter(r=>r.request().url().includes('/jet.wav')))await route.continue();
 await playing(page,'jet');for(const route of held.filter(r=>!r.request().url().includes('/jet.wav')))await route.continue();held=[];await page.waitForTimeout(300);
 assert.equal(await count(page),1);assert.equal(await page.locator('#card-07').getAttribute('data-audio-scene'),'jet');await page.locator('#card-07 .stop').click();
 await page.unroute('**/decibel-audio/*.wav*');
 await page.route('**/decibel-audio/nature.wav*',route=>route.fulfill({status:503,body:'temporary failure'}));await select(page,1);await page.locator('[data-decibel-play]').click();await page.waitForFunction(()=>document.querySelector('#card-07').dataset.audioState==='error');
 const failed=await count(page);await page.unroute('**/decibel-audio/nature.wav*');await page.locator('[data-decibel-play]').click();await playing(page,'nature');assert.equal(await count(page),failed+1);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});assert.equal(await page.locator('#card-07').getAttribute('data-audio-state'),'stopped');
 await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});assert.equal(await count(page),failed+1);
 await page.locator('[data-decibel-play]').click();await playing(page,'nature');await page.locator('#card-01').scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('#card-07').dataset.audioState==='stopped');
 await page.locator('[data-decibel-play]').click();await playing(page,'nature');await page.locator('[data-play="tone-string"]').click();assert.equal(await page.locator('#card-07').getAttribute('data-playing'),'false');
 await page.waitForFunction(()=>document.querySelector('#card-05').dataset.playing==='true');
 await page.locator('[data-decibel-play]').click();await playing(page,'nature');assert.equal(await page.locator('#card-05').getAttribute('data-playing'),'false');
 // Cancelling an unresolved decode by another source also prevents delayed playback.
 await page.locator('#card-07 .stop').click();await page.route('**/decibel-audio/boiler.wav*',r=>held.push(r));await select(page,7);await page.locator('[data-decibel-play]').click();while(!held.length)await page.waitForTimeout(20);
 await page.locator('[data-play="quiz-base"]').click();const n=await count(page);await held.shift().continue();await page.waitForTimeout(400);assert.equal(await count(page),n);
});

test('mobile touch, keyboard, desktop/mobile layout and original large artwork remain usable',{timeout:90000},async t=>{
 const {page,url}=await fixture(t,true);await page.goto(url,{waitUntil:'networkidle'});await page.locator('[data-decibel-picture]').tap();await playing(page,'conversation');
 await page.locator('#card-07 .stop').tap();const n=await count(page);const band=page.locator('[data-decibel-band]');await band.scrollIntoViewIfNeeded();let box=await band.boundingBox();await page.touchscreen.tap(box.x+box.width*.73,box.y+50);assert.equal(await page.locator('.decibel-feature').getAttribute('data-scene'),'construction');assert.equal(await count(page),n);
 await page.locator('[data-decibel-play]').tap();await playing(page,'construction');await band.scrollIntoViewIfNeeded();box=await band.boundingBox();const cdp=await page.context().newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+2,y:box.y+50}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:box.x+box.width-2,y:box.y+50}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await playing(page,'jet');await page.locator('#card-07 .stop').tap();
 await page.locator('[data-decibel-picture]').focus();await page.keyboard.press('Enter');await playing(page,'jet');await page.locator('#card-07 .stop').click();
 const dir=process.env.DECIBEL_AUDIO_CAPTURE_DIR||'/tmp/unit33-decibel-audio';await fs.mkdir(dir,{recursive:true});
 for(const width of [1440,1280,1024,768,390,320]){
  await page.setViewportSize({width,height:1100});await page.locator('#card-07').scrollIntoViewIfNeeded();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.locator('.decibel-audio-sources summary').click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.locator('.decibel-audio-sources summary').click();
  const art=await page.locator('.decibel-photo').boundingBox();const feature=await page.locator('.decibel-feature').boundingBox();assert.ok(art.width>feature.width*(width<=760?.95:.5),`${width}px artwork retains the original share of the feature`);assert.ok(art.height>100);
  if([1440,390].includes(width))await page.locator('#card-07').screenshot({path:`${dir}/audio-${width}.png`});
 }
});
