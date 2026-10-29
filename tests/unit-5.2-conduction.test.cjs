const {test}=require('node:test'),assert=require('node:assert/strict'),{spawn}=require('node:child_process'),path=require('node:path'),fs=require('node:fs/promises'),{chromium}=require('playwright');

test('5.2 conduction: cookware scene, material drag and live readings',{timeout:240000},async t=>{
 const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..')});t.after(()=>server.kill());
 const port=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server timeout')),5000);server.stdout.on('data',d=>{const m=String(d).match(/port (\d+)/);if(m){clearTimeout(timer);resolve(m[1]);}});server.on('error',reject);});
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});t.after(()=>browser.close());
 const context=await browser.newContext({viewport:{width:1440,height:1300},deviceScaleFactor:1.5}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 const url=process.env.CONDUCTION_LAB_URL||`http://127.0.0.1:${port}/units/5/parts/5.2/index.html`;
 await page.clock.install({time:new Date(0)});await page.clock.pauseAt(new Date(1000));await page.goto(url);
 const root=page.locator('#conduction-lab'),state=()=>root.evaluate(n=>({...n.dataset}));
 const temperatures=async()=>{const s=await state();return ['Body','Joint','Tip'].map(k=>Number(s['temperature'+k]));};
 const pulses=()=>page.locator('.conduction-pulse').evaluateAll(ns=>ns.map(n=>n.getAttribute('transform')));
 const reset=async(heat=true)=>{await page.locator('#conduction-reset').click();if(heat)await page.locator('#conduction-play').click();};
 async function capture(name){if(!process.env.CONDUCTION_CAPTURE_DIR)return;await fs.mkdir(process.env.CONDUCTION_CAPTURE_DIR,{recursive:true});await page.locator('#card-03').screenshot({path:path.join(process.env.CONDUCTION_CAPTURE_DIR,`${name}.png`)});}
 async function drag(material,valid=true,cancel=false){
  await root.scrollIntoViewIfNeeded();const button=await page.locator(`[data-handle="${material}"]`).boundingBox(),photo=await page.locator('#conduction-apparatus').boundingBox();
  await page.mouse.move(button.x+button.width*.45,button.y+button.height*.5);await page.mouse.down();
  await page.mouse.move(photo.x+photo.width*(valid?.54:.15),photo.y+photo.height*(valid?.46:.12),{steps:8});
  if(cancel)await page.locator(`[data-handle="${material}"]`).dispatchEvent('pointercancel',{pointerId:1});
  await page.mouse.up();
 }
 await t.test('waits for explicit heating after becoming visible and uses the existing real avatars',async()=>{
  assert.equal((await state()).started,'false');await page.clock.runFor(1000);assert.deepEqual(await temperatures(),[25,25,25]);
  await root.scrollIntoViewIfNeeded();await page.clock.runFor(1000);assert.equal((await state()).started,'false');assert.deepEqual(await temperatures(),[25,25,25]);assert.equal(await page.locator('#conduction-play').textContent(),'開始加熱');
  await page.locator('#conduction-play').click();assert.equal((await state()).started,'true');assert.equal((await state()).playing,'true');
  const avatar=await page.locator('#card-03 .speaker').first().evaluate(n=>getComputedStyle(n,'::before').backgroundImage);assert.match(avatar,/dialogue-character-avatars/);
 });
 await t.test('pan, joint and distal LCDs follow the same model and correct heating order',async()=>{
  await reset();assert.deepEqual(await temperatures(),[25,25,25]);await page.clock.runFor(6500);const values=await temperatures();assert.ok(values[0]>values[1]&&values[1]>values[2]&&values[2]>25);
  for(const [i,key]of ['body','joint','tip'].entries())assert.equal(await page.locator('#conduction-temp-'+key).textContent(),values[i].toFixed(1)+'°C');
  assert.equal(await page.locator('#conduction-flow').isVisible(),true);await capture('metal-running');
 });
 await t.test('pause freezes actual readouts and flow, then resume continues',async()=>{
  await page.locator('#conduction-play').click();const held=await temperatures(),arrows=await pulses();await page.clock.runFor(1000);assert.deepEqual(await temperatures(),held);assert.deepEqual(await pulses(),arrows);
  await page.locator('#conduction-play').click();await page.clock.runFor(600);assert.ok((await temperatures())[0]>held[0]);assert.notDeepEqual(await pulses(),arrows);
 });
 await t.test('valid dragging swaps the whole photo and joint inset and restarts fair comparison',async()=>{
  await drag('wood');assert.equal((await state()).material,'wood');assert.deepEqual(await temperatures(),[25,25,25]);
  assert.match(await page.locator('#conduction-scene').getAttribute('src'),/wood.webp/);assert.match(await page.locator('.conduction-detail-image').getAttribute('href'),/wood.webp/);assert.equal(await page.locator('[data-handle="wood"]').getAttribute('aria-pressed'),'true');
  for(const id of ['conduction-temp-body','conduction-temp-joint','conduction-temp-tip','conduction-play','conduction-tip-note']){const box=await page.locator('#'+id).boundingBox();assert.ok(box.width>30&&box.height>5,id+' must have visible text layout');}
  assert.equal(await page.locator('[data-handle="wood"]').evaluate(n=>getComputedStyle(n).borderColor),'rgb(87, 127, 58)');
  assert.equal((await state()).playing,'false');await page.locator('#conduction-play').click();await page.clock.runFor(6500);const wood=await temperatures();assert.ok(wood[1]>45&&wood[2]<26);await capture('wood-running');
  await drag('metal');await page.locator('#conduction-play').click();await page.clock.runFor(6500);const metal=await temperatures();assert.ok(metal[2]>wood[2]+2);
 });
 await t.test('invalid or cancelled drag does not switch material or leave a ghost',async()=>{
  await drag('wood',false);assert.equal((await state()).material,'metal');assert.equal(await page.locator('.conduction-drag-ghost').count(),0);
  await drag('wood',true,true);assert.equal((await state()).material,'metal');assert.equal((await state()).dragging,'false');assert.equal(await page.locator('.conduction-drag-ghost').count(),0);
 });
 await t.test('click and keyboard are usable alternatives; reset keeps chosen material',async()=>{
  await page.clock.runFor(500);await page.locator('[data-handle="wood"]').focus();await page.keyboard.press('Enter');assert.equal((await state()).material,'wood');
  await page.clock.runFor(600);await reset(false);assert.equal((await state()).material,'wood');assert.deepEqual(await temperatures(),[25,25,25]);assert.equal((await state()).playing,'false');
  await page.locator('[data-handle="metal"]').click();assert.equal((await state()).material,'metal');assert.equal((await state()).playing,'false');await page.locator('#conduction-play').click();
 });
 await t.test('steady temperatures retain a gradient and continuous transfer, never labelled equilibrium',async()=>{
  await page.clock.runFor(40000);assert.equal((await state()).phase,'steady');assert.equal((await state()).playing,'true');
  assert.match(await page.locator('#conduction-status').textContent(),/熱仍沿把手傳遞/);const values=await temperatures();assert.ok(values[0]>75&&values[1]>50&&values[2]>29);const before=await pulses();await page.clock.runFor(500);assert.notDeepEqual(await pulses(),before);await capture('metal-steady');
 });
 await t.test('background pauses without resetting, and other learning blocks stay independent',async()=>{
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});const before=await temperatures();assert.equal((await state()).playing,'false');await page.clock.runFor(1000);assert.deepEqual(await temperatures(),before);
  await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});await page.locator('#conduction-play').click();await page.clock.runFor(500);assert.equal((await state()).playing,'true');
  await page.locator('#conduction-play').click();const held=await temperatures();await page.locator('#convection-play').click();await page.clock.runFor(500);assert.deepEqual(await temperatures(),held);assert.equal(await page.locator('#convection-play').textContent(),'暫停觀察');await page.locator('#convection-reset').click();
  await page.locator('#balance-reset').click();assert.equal(await page.locator('#balance-lab').getAttribute('data-temperature-a'),'60');
  await page.locator('#direction-reset').click();assert.equal(await page.locator('#direction-lab').getAttribute('data-phase'),'ready');
 });
 await t.test('desktop and laptop layout, sensor labels and assets fit the scene',async()=>{
  for(const width of [1440,1280,1024,768,390,320]) {
   await page.setViewportSize({width,height:1300});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,width+'px overflow');
   assert.equal(await page.locator('#conduction-scene').evaluate(n=>n.complete&&n.naturalWidth===1254),true);
   const photo=await page.locator('#conduction-apparatus').boundingBox();for(const id of ['body','joint','tip']){const box=await page.locator('#conduction-temp-'+id).boundingBox();assert.ok(box.x>=photo.x&&box.x+box.width<=photo.x+photo.width);}
   if(width===1280)await capture('laptop');
  }assert.deepEqual(errors,[]);
 });
 await t.test('real-time movement and real touch work under both motion preferences',async()=>{
  for(const reducedMotion of ['no-preference','reduce']) {
   const ctx=await browser.newContext({viewport:{width:1440,height:1200},hasTouch:true,reducedMotion});
   try{const p=await ctx.newPage();await p.goto(url+'#card-03');await p.locator('#conduction-lab').scrollIntoViewIfNeeded();await p.locator('#conduction-play').click();await p.waitForFunction(()=>document.getElementById('conduction-lab').dataset.started==='true');await p.waitForTimeout(500);
    const b=await p.locator('[data-handle="wood"]').boundingBox(),a=await p.locator('#conduction-apparatus').boundingBox(),x=b.x+b.width*.45,y=b.y+b.height*.5,tx=a.x+a.width*.54,ty=a.y+a.height*.46,cdp=await ctx.newCDPSession(p);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+(tx-x)*i/8,y:y+(ty-y)*i/8}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.equal(await p.locator('#conduction-lab').getAttribute('data-material'),'wood');
    await p.locator('#conduction-play').click();await p.waitForTimeout(600);const arrows=await p.locator('.conduction-pulse').evaluateAll(ns=>ns.map(n=>n.getAttribute('transform')));await p.waitForTimeout(350);assert.notDeepEqual(await p.locator('.conduction-pulse').evaluateAll(ns=>ns.map(n=>n.getAttribute('transform'))),arrows);
    await p.locator('#conduction-play').click();const held=await p.locator('#conduction-lab').screenshot();await p.waitForTimeout(300);assert.equal(held.equals(await p.locator('#conduction-lab').screenshot()),true);
   }finally{await ctx.close();}
  }
 });
});
