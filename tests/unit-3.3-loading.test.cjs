const {test}=require('node:test'),assert=require('node:assert/strict'),{spawn}=require('node:child_process'),path=require('node:path'),fs=require('node:fs/promises');
const {chromium}=require('playwright');
const ids=Array.from({length:7},(_,i)=>`card-0${i+1}`).concat('unit-quiz');
test('3.3 activity loading failures stay local on desktop and laptop',{timeout:180000},async t=>{
 const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:['ignore','pipe','ignore']});t.after(()=>server.kill());
 const port=await new Promise((resolve,reject)=>{server.once('error',reject);server.stdout.on('data',d=>{const m=String(d).match(/port (\d+)/);if(m)resolve(m[1]);});});
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',...(process.env.SOUND33_BASE_URL?{proxy:{server:process.env.HTTPS_PROXY,bypass:'127.0.0.1,localhost'}}:{})});t.after(()=>browser.close());
 const base=process.env.SOUND33_BASE_URL||`http://127.0.0.1:${port}/units/3/parts/3.3/`,dir=process.env.LOADING_CAPTURE_DIR||'/tmp/unit33-loading';await fs.mkdir(dir,{recursive:true});
 async function fixture(width=1440){
  const context=await browser.newContext({viewport:{width,height:width===1366?768:900}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.starts=[];for(const C of [AudioBufferSourceNode,OscillatorNode]){const start=C.prototype.start;C.prototype.start=function(...args){window.starts.push(document.querySelector('[data-playing=true]')?.id);return start.apply(this,args);};}});
  return {page,context,errors};
 }
 async function settled(page){await page.waitForFunction(()=>document.querySelectorAll('[data-activity-state]').length===8&&![...document.querySelectorAll('[data-activity-state]')].some(n=>n.dataset.activityState==='loading'));}
 async function status(page,failed){
  for(const id of ids){
   const root=page.locator('#'+id),error=failed.includes(id);
   assert.equal(await root.getAttribute('data-activity-state'),error?'error':'ready',id);
   assert.equal(await root.getAttribute('aria-busy'),'false');
   if(error){
    assert.equal(await root.locator('.activity-load').innerText(),'活動載入失敗，請重新整理頁面。');
    assert.equal(await root.locator('.activity-load').getAttribute('role'),'alert');
    assert.equal(await root.locator('button,input,select').evaluateAll(ns=>ns.every(n=>n.disabled)),true);
    assert.equal(await root.locator('[role=slider]').evaluateAll(ns=>ns.every(n=>n.getAttribute('aria-disabled')==='true'&&n.tabIndex===-1)),true);
    assert.equal(await root.locator('.timbre-load,[data-match-load]').evaluateAll(ns=>ns.every(n=>n.hidden)),true);
    await root.locator('button').first().evaluate(n=>n.click());
   }else assert.equal(await root.locator('.activity-load').isHidden(),true);
  }
 }
 async function healthy(page,failed){
  const good=id=>!failed.includes(id);
  if(good('card-02')){
   await page.locator('[data-pitch-step="100"]').click();assert.equal(await page.locator('#pitch-reading').innerText(),'500 Hz');
   await page.locator('.pitch-play[data-play=pitch-live]').click();await page.waitForFunction(()=>document.querySelector('#card-02').dataset.playing==='true');
  }else if(good('card-04')){await page.locator('[data-play=pan-0]').click();await page.waitForFunction(()=>document.querySelector('#card-04').dataset.playing==='true');}
  if(good('card-03')){await page.locator('[data-guitar-mode=tension]').click();await page.locator('[data-guitar-tension=".25"]').click();assert.equal(await page.locator('#guitar-tension-reading').innerText(),'1.25 倍');}
  if(good('card-04')){await page.locator('[data-pan-view=inside]').click();assert.equal(await page.locator('#card-04').getAttribute('data-pan-view'),'inside');}
  if(good('card-05')){await page.locator('.timbre-play[data-play=tone-pure]').click();await page.waitForFunction(()=>document.querySelector('#card-05').dataset.playing==='true');}
  if(good('card-06')){await page.locator('[data-hearing-band]').focus();await page.keyboard.press('End');assert.equal(await page.locator('[data-hearing-band]').getAttribute('aria-valuenow'),'20000');}
  if(good('card-07')){await page.locator('[data-decibel-band]').focus();await page.keyboard.press('End');assert.equal(await page.locator('.decibel-feature').getAttribute('data-scene'),'jet');}
  if(good('unit-quiz')){await page.locator('[data-match-step=frequency][data-direction="1"]').click();assert.equal(await page.locator('#answer-frequency').innerText(),'550 Hz');}
  if(good('card-01')){await page.locator('[data-fork-strike=soft]').click();await page.waitForFunction(()=>document.querySelector('#card-01').dataset.playing==='true');await page.locator('#card-01 .stop').click();}
  await page.locator('.route a[href="#card-01"]').click();assert.equal(await page.locator('.route a[href="#card-01"]').getAttribute('aria-current'),'step');
 }
 const cases=[
  ['fork-experiment.mjs',['card-01']],['pitch-experiment.mjs',['card-02']],['guitar-experiment.mjs',['card-03']],
  ['pan-experiment.mjs',['card-04']],['timbre-experiment.mjs',['card-05']],['hearing-experiment.mjs',['card-06']],
  ['decibel-experiment.mjs',['card-07']],['sound-match.mjs',['unit-quiz']],
  ['guitar-view.mjs',['card-03']],['timbre-model.mjs',['card-05','unit-quiz']],['model.mjs',['card-01','card-02']]
 ];
 for(const [file,failed]of cases)await t.test(file+' failure disables only dependent activities',async()=>{
  const {page,context,errors}=await fixture(file==='sound-match.mjs'?1366:1440);
  try{
   await page.route('**/assets/'+file+'*',route=>route.fulfill({status:503,contentType:'text/javascript',body:'unavailable'}));
   await page.goto(base,{waitUntil:'networkidle'});await settled(page);assert.equal(await page.evaluate(()=>window.starts.length),0);
   await status(page,failed);await healthy(page,failed);assert.deepEqual(errors,[]);
   if(file==='sound-match.mjs'){
    await page.locator('#unit-quiz .activity-load').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(dir,'quiz-failed-laptop.png')});
    await page.unroute('**/assets/'+file+'*');await page.reload({waitUntil:'networkidle'});await settled(page);await status(page,[]);
    assert.equal(await page.evaluate(()=>window.starts.length),0);await page.locator('[data-match-step=frequency][data-direction="1"]').click();assert.equal(await page.locator('#answer-frequency').innerText(),'550 Hz');
   }
   if(file==='pan-experiment.mjs'){await page.locator('#card-04 .activity-load').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(dir,'pan-failed-desktop.png')});}
  }finally{await context.close();}
 });
 await t.test('a partially initialized activity exception stays local',async()=>{
  const {page,context,errors}=await fixture();
  try{
   await page.route('**/assets/guitar-experiment.mjs*',async route=>{
    const response=await route.fetch(),body=await response.text();
    assert.ok(body.includes('render();stop();'));
    await route.fulfill({response,body:body.replace('render();stop();',"render();stop();throw Error('injected initialization failure');")});
   });
   await page.goto(base,{waitUntil:'networkidle'});await settled(page);await status(page,['card-03']);await healthy(page,['card-03']);
   await page.locator('.guitar-fret-control').evaluate(n=>n.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true})));
   assert.deepEqual(errors,[]);
  }finally{await context.close();}
 });
 await t.test('slow quiz import leaves other activities usable and does not stop their sound on completion',async()=>{
  const {page,context,errors}=await fixture();let held;
  try{
   await page.route('**/assets/sound-match.mjs*',route=>{held=route;});await page.goto(base,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.querySelectorAll('[data-activity-state=ready]').length===7);
   assert.equal(await page.locator('#unit-quiz .activity-load').innerText(),'活動載入中…');
   await page.locator('[data-match-new]').evaluate(n=>n.click());assert.equal(await page.locator('#unit-quiz').getAttribute('data-activity-state'),'loading');
   await page.locator('[data-pitch-step="100"]').click();assert.equal(await page.locator('#pitch-reading').innerText(),'500 Hz');
   await page.locator('.pitch-play[data-play=pitch-live]').click();await page.waitForFunction(()=>document.querySelector('#card-02').dataset.playing==='true');
   await page.locator('[data-match-new]').evaluate(n=>{n.click();n.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));});
   assert.equal(await page.locator('#card-02').getAttribute('data-playing'),'true','pending quiz controls do not interrupt another sound');
   const response=page.waitForResponse(r=>/sound-match\.mjs/.test(r.url()));await held.continue();await response;await settled(page);
   assert.equal(await page.locator('#card-02').getAttribute('data-playing'),'true');assert.equal(await page.evaluate(()=>window.starts.length),1);assert.deepEqual(errors,[]);
  }finally{await context.close();}
 });
 await t.test('shared playback import failure gives visible feedback in each affected activity',async()=>{
  const {page,context,errors}=await fixture();
  try{
   await page.route('**/lesson-playback.mjs*',route=>route.abort());await page.goto(base,{waitUntil:'networkidle'});await settled(page);await status(page,ids);
   assert.equal(await page.evaluate(()=>window.starts.length),0);await page.locator('.route a[href="#card-04"]').click();assert.match(page.url(),/#card-04$/);assert.deepEqual(errors,[]);
  }finally{await context.close();}
 });
});
