const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');
const {chromium}=require('playwright');

test('5.3共用器材：可見動畫與兩區加熱狀態同步，停止不殘留',{timeout:120000},async t=>{
 const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:['ignore','pipe','pipe']});t.after(()=>server.kill());
 const port=await new Promise((resolve,reject)=>{let out='';const timer=setTimeout(()=>reject(Error('server timeout')),5000);server.stdout.on('data',d=>{out+=d;const m=out.match(/port (\d+)/);if(m){clearTimeout(timer);resolve(m[1]);}});server.on('error',reject);});
 const remote=process.env.UNIT53_URL,browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox'],...(remote?{proxy:{server:process.env.HTTPS_PROXY||process.env.HTTP_PROXY}}:{})});t.after(()=>browser.close());
 const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(remote||`http://127.0.0.1:${port}/units/5/parts/5.3/`,{waitUntil:'networkidle'});await page.clock.install();
 const state=root=>root.evaluate(n=>({playing:n.dataset.playing,motion:n.dataset.motion,angle:n.querySelector('.heat-stir-bar').getAttribute('transform'),pointer:n.querySelector('.heat-knob-pointer').getAttribute('transform'),ripples:[...n.querySelectorAll('.heat-ripple')].map(e=>({rx:e.getAttribute('rx'),opacity:e.getAttribute('opacity')})),hint:n.querySelector('.heat-knob-hint').textContent,hintHidden:n.querySelector('.heat-knob-hint').hidden}));
 for(const [id,button,heater,duration] of [['calorie-lab','calorie-transfer','calorie-heater',7000],['heat-lab','heat-stage-play','heat-stage-heater',3000]]){
  await t.test(id+'啟動、運行、到點及背景中斷的視覺回饋',async()=>{
   const root=page.locator('#'+id),knob=page.locator('#'+heater);const ready=await state(root);assert.equal(ready.motion,'still');assert.ok(ready.ripples.every(r=>Number(r.opacity)===0));assert.match(ready.hint,/開始加熱/);
   await knob.press('Enter');await page.clock.runFor(370);const a=await state(root);await page.clock.runFor(410);const b=await state(root);
   assert.equal(a.motion,'active');assert.notEqual(a.angle,b.angle);assert.notDeepEqual(a.ripples,b.ripples);assert.notEqual(a.pointer,ready.pointer);assert.equal(a.hintHidden,true);
   await page.clock.runFor(duration);const end=await state(root);assert.equal(end.motion,'still');assert.equal(end.pointer,ready.pointer);assert.ok(end.ripples.every(r=>Number(r.opacity)===0));assert.match(end.hint,id==='calorie-lab'?/重新觀察/:/繼續加熱/);
   await page.clock.runFor(1000);assert.deepEqual(await state(root),end);
   await page.locator('#'+button).click();await page.clock.runFor(500);await page.evaluate(()=>window.dispatchEvent(new Event('blur')));const stopped=await state(root);assert.equal(stopped.motion,'still');await page.clock.runFor(1000);assert.deepEqual(await state(root),stopped);
  });
 }
 await t.test('減少動態效果時保留讀值、燈號和實驗流程，攪拌與水面不運動',async()=>{
  await page.emulateMedia({reducedMotion:'reduce'});const root=page.locator('#calorie-lab');await page.locator('#calorie-transfer').click();await page.clock.runFor(500);const a=await state(root);await page.clock.runFor(400);const b=await state(root);assert.equal(a.angle,b.angle);assert.ok(b.ripples.every(r=>Number(r.opacity)===0));assert.equal(b.playing,'true');assert.notEqual(await page.locator('#calorie-end').textContent(),'20.0');await page.clock.runFor(7000);assert.equal(await root.getAttribute('data-phase'),'complete');
 });
 assert.deepEqual(errors,[]);
});
