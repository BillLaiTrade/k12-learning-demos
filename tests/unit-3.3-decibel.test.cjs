const {test}=require('node:test'),assert=require('node:assert/strict'),{spawn}=require('node:child_process'),path=require('node:path'),fs=require('node:fs/promises');
const {chromium}=require('playwright');
test('decibel reference mapping preserves source values and distances',async()=>{
 const {DECIBEL_SCENES:scenes,nearestScene,decibelAt}=await import('../units/3/parts/3.3/assets/decibel-model.mjs');
 const source=JSON.parse(await fs.readFile(path.join(__dirname,'../docs/reviews/unit-3.3-decibel-explorer/source-evidence.json')));
 assert.deepEqual(scenes.map(s=>[s.key,s.db,s.sourceLabel]),source.examples.map(s=>[s.key,s.value_dba,s.source_label]));
 assert.deepEqual(scenes.map(s=>s.db),Array.from({length:12},(_,i)=>20+10*i));
 for(const scene of scenes)assert.equal(nearestScene(scene.db),scene);
 assert.equal(nearestScene(73).db,70);assert.equal(nearestScene(75).db,80);assert.equal(nearestScene(-20).db,20);assert.equal(decibelAt(2),130);
 for(const [key,distance]of [['whisper','1.5'],['conversation','0.9'],['train','30'],['jet','60']])assert.ok(scenes.find(s=>s.key===key).condition.includes(distance));
});
test('decibel ribbon selects all scenes, handles pointer/touch/keys and never plays audio',{timeout:90000},async t=>{
 const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:['ignore','pipe','ignore']});t.after(()=>server.kill());
 const port=await new Promise(resolve=>server.stdout.on('data',d=>{const m=String(d).match(/port (\d+)/);if(m)resolve(m[1]);}));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',...(process.env.SOUND33_BASE_URL?{proxy:{server:process.env.HTTPS_PROXY,bypass:'127.0.0.1,localhost'}}:{})});t.after(()=>browser.close());
 const base=process.env.SOUND33_BASE_URL||`http://127.0.0.1:${port}/units/3/parts/3.3/`,page=await browser.newPage({viewport:{width:1440,height:1200}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.decibelAudioStarts=0;for(const type of [AudioBufferSourceNode,OscillatorNode]){const start=type.prototype.start;type.prototype.start=function(...args){window.decibelAudioStarts++;return start.apply(this,args);};}});
 await page.goto(base,{waitUntil:'networkidle'});const band=page.locator('[data-decibel-band]');await band.scrollIntoViewIfNeeded();
 assert.equal(await band.getAttribute('aria-valuenow'),'60');const dir=process.env.DECIBEL_CAPTURE_DIR||'/tmp/unit33-decibel-explorer';await fs.mkdir(dir,{recursive:true});
 await band.focus();await page.keyboard.press('Home');
 const expected=['study','nature','whisper','residence','conversation','classroom','train','boiler','construction','club','equipment','jet'];
 for(let i=0;i<12;i++){
  if(i)await page.keyboard.press('ArrowRight');
  assert.equal(await band.getAttribute('aria-valuenow'),String(20+i*10));assert.equal(await page.locator('.decibel-feature').getAttribute('data-scene'),expected[i]);
  await page.waitForFunction(()=>document.querySelector('.decibel-photo').dataset.loading==='false');
  assert.equal(await page.locator('[data-decibel-reference]').textContent(),String(20+i*10));
  assert.equal(await page.locator('.decibel-photo svg').getAttribute('viewBox'),`0 ${i%3*512} 1024 512`);
  assert.equal(await page.locator('.decibel-photo rect').getAttribute('y'),String(i%3*512));
  await page.locator('.decibel-feature').screenshot({path:`${dir}/scene-${20+i*10}.png`});
 }
 const box=await band.boundingBox(),x=v=>box.x+(v-20)/110*box.width,y=box.y+box.height-20;
 await page.mouse.click(x(73),y);assert.equal(await band.getAttribute('aria-valuenow'),'73');assert.equal(await page.locator('[data-decibel-reference]').textContent(),'70');assert.match(await band.getAttribute('aria-valuetext'),/73 dBA.*70 dBA/);
 await page.mouse.move(x(20),y);await page.mouse.down();await page.mouse.move(x(130),y,{steps:25});await page.mouse.up();assert.equal(await band.getAttribute('aria-valuenow'),'130');
 await band.focus();await page.keyboard.press('Home');await page.keyboard.press('PageUp');assert.equal(await band.getAttribute('aria-valuenow'),'40');await page.keyboard.press('Shift+ArrowRight');assert.equal(await band.getAttribute('aria-valuenow'),'41');
 for(const width of [1920,1440,1280,1024,820,760,390,320]){
  await page.setViewportSize({width,height:1500});await band.focus();await page.keyboard.press('Home');for(let i=0;i<4;i++)await page.keyboard.press('ArrowRight');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.equal(await page.locator('.decibel-info').evaluate(n=>n.scrollWidth>n.clientWidth+1),false);
  if([1440,1024,390,320].includes(width))await page.locator('#card-07').screenshot({path:`${dir}/decibel-${width}.png`});
 }
 assert.equal(await page.evaluate(()=>window.decibelAudioStarts),0);
 const mobile=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});await mobile.goto(base,{waitUntil:'networkidle'});const touch=mobile.locator('[data-decibel-band]');await touch.scrollIntoViewIfNeeded();const tb=await touch.boundingBox();await mobile.touchscreen.tap(tb.x+tb.width*.73,tb.y+tb.height-20);assert.equal(await mobile.locator('.decibel-feature').getAttribute('data-scene'),'construction');
 // Actual touch drag across the ribbon, followed by another tap.
 const cdp=await mobile.context().newCDPSession(mobile);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:tb.x+2,y:tb.y+50}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:tb.x+tb.width-2,y:tb.y+50}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.equal(await mobile.locator('.decibel-feature').getAttribute('data-scene'),'jet');await mobile.touchscreen.tap(tb.x+tb.width*.36,tb.y+50);assert.equal(await mobile.locator('.decibel-feature').getAttribute('data-scene'),'conversation');await mobile.close();
 const fallback=await browser.newPage({javaScriptEnabled:false});await fallback.goto(base);assert.equal(await fallback.locator('[data-decibel-title]').textContent(),'一般交談');assert.equal(await fallback.locator('.decibel-photo image').getAttribute('href'),'assets/decibel-daily.png?v=1');await fallback.close();
 assert.deepEqual(errors,[]);
});
test('delayed or failed image loads cannot display an old scene under new metadata',{timeout:60000},async t=>{
 const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:['ignore','pipe','ignore']});t.after(()=>server.kill());const port=await new Promise(resolve=>server.stdout.on('data',d=>{const m=String(d).match(/port (\d+)/);if(m)resolve(m[1]);}));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium'});t.after(()=>browser.close());const page=await browser.newPage();let held;
 await page.route('**/decibel-quiet.png*',route=>{held=route;});await page.goto(`http://127.0.0.1:${port}/units/3/parts/3.3/`,{waitUntil:'domcontentloaded'});
 const band=page.locator('[data-decibel-band]');await band.focus();await page.keyboard.press('Home');assert.equal(await page.locator('.decibel-photo').getAttribute('data-loading'),'true');assert.equal(await page.locator('.decibel-photo svg').isVisible(),false);
 await page.keyboard.press('End');await page.waitForFunction(()=>document.querySelector('.decibel-photo').dataset.loading==='false');await held.continue();await page.waitForTimeout(200);assert.equal(await page.locator('.decibel-feature').getAttribute('data-scene'),'jet');assert.match(await page.locator('.decibel-photo image').getAttribute('href'),/decibel-loud/);
 await page.unroute('**/decibel-quiet.png*');await page.route('**/decibel-quiet.png*',route=>route.abort());await page.reload({waitUntil:'domcontentloaded'});await band.focus();await page.keyboard.press('Home');await page.waitForFunction(()=>document.querySelector('.decibel-photo').dataset.loading==='error');await page.unroute('**/decibel-quiet.png*');await page.keyboard.press('Home');await page.waitForFunction(()=>document.querySelector('.decibel-photo').dataset.loading==='false');assert.match(await page.locator('.decibel-photo image').getAttribute('href'),/decibel-quiet/);
});
