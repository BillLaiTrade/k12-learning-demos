const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');
const fs=require('node:fs/promises');
const {chromium}=require('playwright');
const {expect}=require('playwright/test');

test('5.2 insulation workspace: same activity, one desktop viewport and return to reading',{timeout:180000},async t=>{
 const root=path.resolve(__dirname,'..'),capture=process.env.INSULATION_WORKSPACE_CAPTURE;
 const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:root});t.after(()=>server.kill());
 const port=await new Promise((resolve,reject)=>{let log='';const timer=setTimeout(()=>reject(Error('server timeout')),5000);server.stdout.on('data',d=>{log+=d;const m=log.match(/port (\d+)/);if(m){clearTimeout(timer);resolve(m[1]);}});server.on('error',reject)});
 const remote=process.env.INSULATION_LAB_URL,url=remote||`http://127.0.0.1:${port}/units/5/parts/5.2/`;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',...(remote?{proxy:{server:process.env.HTTPS_PROXY||process.env.HTTP_PROXY}}:{})});t.after(()=>browser.close());
 const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[],measurements=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>document.addEventListener('DOMContentLoaded',()=>{const style=document.createElement('style');style.textContent='html{scroll-behavior:auto!important}';document.head.append(style)}));
 await page.clock.install({time:new Date(0)});await page.clock.pauseAt(new Date(1000));await page.goto(url);
 const lab=page.locator('#insulation-lab'),dialog=page.locator('#insulation-dialog'),expand=page.locator('#insulation-expand');
 const ready=()=>expect(lab).toHaveAttribute('data-assets','ready',{timeout:15000});await ready();
 const state=()=>lab.evaluate(n=>({...n.dataset}));
 if(capture)await fs.mkdir(capture,{recursive:true});
 t.after(async()=>{if(capture)await fs.writeFile(path.join(capture,'measurements.json'),JSON.stringify({url,measurements,errors},null,2)+'\n')});
 const shot=async name=>{if(capture)await page.screenshot({path:path.join(capture,name+'.png')})};

 await t.test('entry, native modal, Escape and return retain reading position and one activity instance',async()=>{
  await expand.scrollIntoViewIfNeeded();const position=await page.evaluate(()=>scrollY),before=await state();
  await expand.focus();await page.keyboard.press('Enter');await expect(dialog).toBeVisible();await expect(dialog).toHaveJSProperty('open',true);
  assert.equal(await dialog.locator('#insulation-workspace').count(),1);assert.equal(await page.locator('#insulation-lab').count(),1);assert.equal((await state()).elapsed,before.elapsed);
  const focus=await page.evaluate(()=>document.querySelector('#insulation-dialog').contains(document.activeElement));assert.ok(focus);
  await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();await expect(expand).toBeFocused();assert.equal(await page.locator('#card-06 #insulation-workspace').count(),1);assert.ok(Math.abs(await page.evaluate(()=>scrollY)-position)<=1);
  await expand.click();await page.locator('#insulation-return').click();await expect(expand).toBeFocused();assert.equal((await state()).elapsed,before.elapsed);
 });
 await t.test('both comparisons keep bottle, curves, findings and controls inside desktop viewports without scrolling',async()=>{
  for(const [width,height]of [[1440,900],[1366,768],[1280,720],[1024,768]]){
   await page.setViewportSize({width,height});await expand.click();
   for(const mode of ['gap','lining']){
    await page.locator(`[data-insulation-comparison=${mode}]`).click();await ready();
    const metrics=await page.evaluate(()=>{
     const d=document.querySelector('#insulation-dialog'),r=d.getBoundingClientRect();
     const selectors=['.insulation-focus-heading','.insulation-toolbar','#insulation-bottle-a','#insulation-bottle-b','.insulation-route-key','.insulation-chart-heading','.insulation-plot','.insulation-finding','.insulation-takeaway','#insulation-play','#insulation-reset','#insulation-progress','#insulation-return','.insulation-footer'];
     return{viewport:{width:innerWidth,height:innerHeight},scrollHeight:d.scrollHeight,clientHeight:d.clientHeight,scrollWidth:d.scrollWidth,clientWidth:d.clientWidth,boxes:selectors.map(selector=>{const n=d.querySelector(selector),b=n.getBoundingClientRect();return{selector,left:b.left,top:b.top,right:b.right,bottom:b.bottom,width:b.width,height:b.height,font:parseFloat(getComputedStyle(n).fontSize),inside:b.left>=r.left-.5&&b.top>=r.top-.5&&b.right<=r.right+.5&&b.bottom<=r.bottom+.5}})};
    });
    measurements.push({mode,...metrics});assert.ok(metrics.scrollHeight<=metrics.clientHeight+1,JSON.stringify(metrics));assert.ok(metrics.scrollWidth<=metrics.clientWidth+1,JSON.stringify(metrics));
    for(const box of metrics.boxes)assert.ok(box.inside&&box.width>0&&box.height>0,JSON.stringify({width,height,mode,box}));
    const scene=await page.locator('.insulation-scene-column').boundingBox(),chart=await page.locator('.insulation-analysis').boundingBox();assert.ok(scene.x+scene.width<=chart.x+1);
    const parts=await page.locator('.insulation-bottle-view').evaluateAll(ns=>ns.map(n=>{const canvas=n.querySelector('.insulation-bottle-canvas').getBoundingClientRect(),caption=n.querySelector('figcaption').getBoundingClientRect();return{canvas:{x:canvas.x,y:canvas.y,width:canvas.width,height:canvas.height},caption:{x:caption.x,width:caption.width},labels:[...n.querySelectorAll('.insulation-neck-label,.insulation-gap-label,.insulation-rad-label')].map(e=>{const b=e.getBoundingClientRect();return{left:b.left,right:b.right,text:e.textContent}})}}));
    for(const part of parts){assert.ok(part.canvas.x>=scene.x-.5&&part.canvas.x+part.canvas.width<=scene.x+scene.width+.5,JSON.stringify({width,part}));assert.ok(Math.abs(part.canvas.width/part.canvas.height-440/570)<.01);for(const label of part.labels)assert.ok(label.left>=scene.x-.5&&label.right<=scene.x+scene.width+.5,JSON.stringify({width,label}));}
    assert.ok(parts[0].canvas.x+parts[0].canvas.width<=parts[1].canvas.x+.5,'兩瓶不可互相重疊或被分欄裁切');
    await page.locator('#insulation-source-a').click();await page.clock.runFor(2600);await page.locator('#insulation-play').click();await shot(`focus-${width}-${height}-${mode}`);
    assert.ok(Number((await state()).elapsed)>0);assert.ok(await page.locator('#insulation-progress').evaluate(n=>n.value>0));
   }
   await page.locator('#insulation-return').click();
  }
 });
 await t.test('reopening preserves selected comparison, frozen curve and elapsed time',async()=>{
  await page.setViewportSize({width:1366,height:768});await expand.click();const before=await state(),curve=await page.locator('#insulation-curve-b').getAttribute('d');
  await page.locator('#insulation-return').click();await page.clock.runFor(500);await expand.click();assert.equal((await state()).comparison,before.comparison);assert.equal((await state()).elapsed,before.elapsed);assert.equal(await page.locator('#insulation-curve-b').getAttribute('d'),curve);
  await page.locator('#insulation-reset').click();assert.equal((await state()).elapsed,'0.000');assert.equal(await page.locator('#insulation-progress').evaluate(n=>n.value),0);assert.equal((await state()).comparison,before.comparison);
 });
 await t.test('completed curve and remaining heat paths share one view in both comparisons',async()=>{
  for(const mode of ['gap','lining']){
   await page.locator(`[data-insulation-comparison=${mode}]`).click();await ready();await page.locator('#insulation-reset').click();await page.locator('#insulation-play').click();await page.clock.runFor(14500);
   assert.equal((await state()).stage,'observed');assert.equal(await page.locator('#insulation-progress').evaluate(n=>n.value),1);assert.equal((await state()).playing,'true');
   for(const k of ['a','b'])assert.ok(Number(await page.locator(`#insulation-radiation-${k}`).getAttribute('opacity'))>0);
   await page.locator('#insulation-play').click();await shot(`focus-complete-${mode}`);
  }
 });
 await t.test('details do not enlarge the observation viewport and the background page cannot receive focus',async()=>{
  await page.locator('.insulation-explanation summary').click();await expect(page.locator('.insulation-explanation-body')).toBeVisible();
  assert.ok(await dialog.evaluate(n=>n.scrollHeight<=n.clientHeight+1));await shot('focus-details');await page.locator('.insulation-explanation summary').click();
  const sequence=[];
  for(let n=0;n<14;n++){
   await page.keyboard.press('Tab');const focus=await dialog.evaluate(d=>({allowed:d.contains(document.activeElement)||document.activeElement===document.body,tag:document.activeElement.tagName,id:document.activeElement.id}));
   sequence.push(focus);assert.ok(focus.allowed,JSON.stringify(focus));
  }
  // Native dialogs may let Tab reach browser chrome (document.body); the
  // underlying lesson's focusable controls must remain inert.
  await expand.evaluate(n=>n.focus());assert.equal(await expand.evaluate(n=>document.activeElement===n),false);measurements.push({case:'native modal focus sequence',sequence});
  await page.keyboard.press('Escape');await expect(expand).toBeFocused();
 });
 await t.test('mobile native touch can open, operate, reset and return without horizontal overflow',async()=>{
  for(const width of [390,320]){
   const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true}),p=await context.newPage();
   try{
    await p.goto(url);await expect(p.locator('#insulation-lab')).toHaveAttribute('data-assets','ready');await p.locator('#insulation-expand').tap();await expect(p.locator('#insulation-dialog')).toBeVisible();
    await p.locator('[data-insulation-comparison=lining]').tap();await expect(p.locator('#insulation-lab')).toHaveAttribute('data-assets','ready');await p.locator('#insulation-play').tap();await p.waitForTimeout(200);await expect(p.locator('#insulation-lab')).toHaveAttribute('data-playing','true');
    assert.ok(await p.locator('#insulation-dialog').evaluate(n=>n.scrollWidth<=n.clientWidth+1));await p.locator('#insulation-reset').tap();await expect(p.locator('#insulation-lab')).toHaveAttribute('data-elapsed','0.000');
    if(capture)await p.screenshot({path:path.join(capture,`mobile-${width}.png`)});await p.locator('#insulation-return').tap();await expect(p.locator('#insulation-dialog')).not.toBeVisible();assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   }finally{await context.close()}
  }
 });
 await t.test('no browser script errors',()=>assert.deepEqual(errors,[]));
});
