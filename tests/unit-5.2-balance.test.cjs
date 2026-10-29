const {test}=require('node:test'),assert=require('node:assert/strict'),{spawn}=require('node:child_process'),path=require('node:path'),fs=require('node:fs/promises'),{chromium}=require('playwright');

test('5.2 second block: dragging, contact and retained temperatures',{timeout:150000},async t=>{
 const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..')});t.after(()=>server.kill());
 const port=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server timeout')),5000);server.stdout.on('data',d=>{const m=String(d).match(/port (\d+)/);if(m){clearTimeout(timer);resolve(m[1]);}});server.on('error',reject);});
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});t.after(()=>browser.close());
 const context=await browser.newContext({viewport:{width:1440,height:1300},deviceScaleFactor:1.5}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 const url=process.env.BALANCE_LAB_URL||`http://127.0.0.1:${port}/units/5/parts/5.2/index.html`;
 await page.clock.install({time:new Date(0)});await page.clock.pauseAt(new Date(1000));await page.goto(url);
 const root=page.locator('#balance-lab'),state=()=>root.evaluate(n=>({...n.dataset}));
 const readings=()=>page.evaluate(()=>({a:Number(document.getElementById('balance-temp-a').textContent.replace('°C','')),b:Number(document.getElementById('balance-temp-b').textContent.replace('°C',''))}));
 const pulses=()=>page.locator('.balance-pulse').evaluateAll(ns=>ns.map(n=>n.getAttribute('transform')));
 const reset=()=>page.locator('#balance-reset').click(),mode=v=>page.locator(`[data-balance="${v}"]`).click();
 async function drag(side,delta,anchor={}){
  await root.scrollIntoViewIfNeeded();const s=await state(),box=await page.locator('#balance-apparatus').boundingBox();
  const x=box.x+((anchor.x??(side==='a'?340:555))+Number(s[side==='a'?'offsetA':'offsetB']))/1000*box.width,y=box.y+(anchor.y??298)/440*box.height;
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+delta/1000*box.width,y,{steps:8});await page.mouse.up();
 }
 async function contact(side='a'){const s=await state();await drag(side,Number(s.gap)*(side==='a'?1:-1));}
 async function capture(name){if(!process.env.BALANCE_CAPTURE_DIR)return;await fs.mkdir(process.env.BALANCE_CAPTURE_DIR,{recursive:true});await page.mouse.move(0,0);await page.locator('#card-02').screenshot({path:path.join(process.env.BALANCE_CAPTURE_DIR,name+'.png')});}

 await t.test('primary action is dragging, with genuine portraits and no contact button',async()=>{
  assert.equal(await page.locator('#balance-play').count(),0);assert.equal(await page.locator('#balance-pause').isVisible(),false);assert.match(await page.locator('#balance-drag-hint').textContent(),/左右拖曳/);
  assert.equal(await root.locator('[role=slider]').count(),2);assert.match(await page.locator('#card-02 .speaker').first().evaluate(n=>getComputedStyle(n,'::before').backgroundImage),/dialogue-character-avatars/);
  assert.deepEqual(await readings(),{a:60,b:20});assert.equal((await state()).gap,'56');assert.equal(await page.locator('#balance-flow').isVisible(),false);await capture('drag-ready');
 });
 await t.test('dragging A starts heat only when the faces touch',async()=>{
  await drag('a',20);await page.clock.runFor(500);assert.deepEqual(await readings(),{a:60,b:20});assert.ok(Number((await state()).gap)>0);
  await contact('a');assert.equal((await state()).touching,'true');assert.equal((await state()).phase,'running');assert.equal(await page.locator('#balance-block-a').getAttribute('transform'),'translate(28,0)');assert.equal(await page.locator('#balance-flow').getAttribute('transform'),'translate(28,0)');
  await page.clock.runFor(1600);const r=await readings();assert.ok(r.a<60&&r.a>40&&r.b>20&&r.b<40);assert.equal(await page.locator('#balance-flow').isVisible(),true);await capture('drag-contact');
 });
 await t.test('separating B retains readings and stops flow; recontact resumes without resetting',async()=>{
  await drag('b',65);assert.equal((await state()).phase,'separated');assert.equal((await state()).playing,'false');const held=await readings(),elapsed=(await state()).elapsed;assert.ok(held.a<60&&held.b>20);assert.equal(await page.locator('#balance-flow').isVisible(),false);
  await page.clock.runFor(2500);assert.deepEqual(await readings(),held);assert.equal((await state()).elapsed,elapsed);await capture('drag-separated');
  await contact('b');assert.deepEqual(await readings(),held);await page.clock.runFor(700);const r=await readings();assert.ok(r.a<held.a&&r.b>held.b);assert.ok(Number((await state()).elapsed)>Number(elapsed));
 });
 await t.test('B can initiate contact and A can separate; collision prevents overlap',async()=>{
  await reset();await contact('b');assert.equal((await state()).offsetA,'-28');assert.equal((await state()).offsetB,'-28');await page.clock.runFor(600);await drag('a',-35);assert.equal((await state()).touching,'false');
  const held=await readings();await page.clock.runFor(800);assert.deepEqual(await readings(),held);await drag('a',500);const s=await state();assert.equal(s.offsetA,s.offsetB);assert.equal(s.gap,'0');
  const box=await page.locator('#balance-apparatus').boundingBox(),x=box.x+(340+Number(s.offsetA))/1000*box.width,y=box.y+298/440*box.height;
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+100/1000*box.width,y,{steps:4});await page.mouse.move(x+75/1000*box.width,y,{steps:4});await page.mouse.up();
  assert.equal((await state()).touching,'false','reversing after an overdrag should separate immediately');
 });
 await t.test('independently moved instruments, sensor labels, digits and flow stay aligned',async()=>{
  await reset();await drag('b',60);await contact('a');await page.clock.runFor(900);const s=await state(),r=await readings();
  assert.equal(await page.locator('#balance-probe-dot').getAttribute('cx'),String(352+Number(s.offsetA)));assert.equal(await page.locator('#balance-flow').getAttribute('transform'),`translate(${s.offsetA},0)`);
  for(const side of ['a','b'])assert.equal(await page.locator('#balance-digits-'+side).getAttribute('data-value'),r[side].toFixed(1));
  const before=await pulses();await page.clock.runFor(350);assert.notDeepEqual(await pulses(),before);
  await drag('a',-20,{x:440,y:303});assert.equal((await state()).touching,'false','flow overlay must not block dragging');await contact('a');
  await drag('a',-20,{x:352,y:221});assert.equal((await state()).touching,'false','probe label must not block dragging');await contact('a');
 });
 await t.test('secondary pause freezes; dragging can resume; equilibrium survives recontact',async()=>{
  await page.locator('#balance-pause').click();const held=await readings(),positions=await pulses();await page.clock.runFor(800);assert.deepEqual(await readings(),held);assert.deepEqual(await pulses(),positions);
  await drag('a',-25);await contact('a');await page.clock.runFor(500);assert.equal((await state()).phase,'running');assert.ok((await readings()).a<held.a);
  await page.clock.runFor(30000);assert.deepEqual(await readings(),{a:40,b:40});assert.equal((await state()).phase,'complete');assert.equal(await page.locator('#balance-flow').isVisible(),false);
  await drag('a',-25);await contact('a');await page.clock.runFor(1200);assert.deepEqual(await readings(),{a:40,b:40});assert.equal(await page.locator('#balance-flow').isVisible(),false);await capture('drag-balanced');
  await reset();assert.deepEqual(await readings(),{a:60,b:20});assert.equal((await state()).gap,'56');
 });
 await t.test('same temperatures, resetting and switching modes while dragging remain safe',async()=>{
  await mode('same');await contact('b');await page.clock.runFor(1500);assert.deepEqual(await readings(),{a:40,b:40});assert.equal((await state()).phase,'complete');assert.equal(await page.locator('#balance-flow').isVisible(),false);await capture('drag-same');
  await reset();await root.scrollIntoViewIfNeeded();const box=await page.locator('#balance-apparatus').boundingBox();await page.mouse.move(box.x+312/1000*box.width,box.y+298/440*box.height);await page.mouse.down();assert.equal((await state()).dragging,'a');
  // Programmatic mode activation while a pointer is held verifies capture cleanup.
  await page.locator('[data-balance="different"]').evaluate(n=>n.click());await page.mouse.up();assert.equal((await state()).dragging,'');assert.deepEqual(await readings(),{a:60,b:20});assert.equal((await state()).gap,'56');
 });
 await t.test('keyboard, chamber bounds and reduced motion preserve direct manipulation',async()=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#balance-block-a').focus();await page.keyboard.press('End');assert.equal((await state()).touching,'true');await page.clock.runFor(700);
  const before=await pulses();await page.clock.runFor(400);assert.notDeepEqual(await pulses(),before);await page.keyboard.press('Home');assert.equal((await state()).offsetA,'-90');assert.equal((await state()).playing,'false');
  await page.locator('#balance-block-b').focus();await page.keyboard.press('Home');assert.equal((await state()).offsetB,'110');await page.keyboard.press('End');assert.equal((await state()).offsetA,(await state()).offsetB);await page.keyboard.press('ArrowRight');assert.equal((await state()).touching,'false');await page.emulateMedia({reducedMotion:'no-preference'});await reset();
 });
 await t.test('pointer cancellation and backgrounding release capture without losing temperatures',async()=>{
  await root.evaluate(n=>n.addEventListener('pointerdown',e=>n.dataset.testPointerId=String(e.pointerId),{once:true}));const box=await page.locator('#balance-apparatus').boundingBox();await page.mouse.move(box.x+312/1000*box.width,box.y+298/440*box.height);await page.mouse.down();
  await page.locator('#balance-block-a').dispatchEvent('pointercancel',{pointerId:Number((await state()).testPointerId)});await page.mouse.up();assert.equal((await state()).dragging,'');
  await contact('a');await page.clock.runFor(600);await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});assert.equal((await state()).phase,'paused');const held=await readings();await page.clock.runFor(1000);assert.deepEqual(await readings(),held);
  await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});await drag('b',20);await contact('b');await page.clock.runFor(500);assert.ok((await readings()).a<held.a);await reset();
 });
 await t.test('drag coordinates fit multiple widths and other activities remain independent',async()=>{
  for(const width of [1440,1280,1024,768,390,320]){await page.setViewportSize({width,height:1300});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,width+'px overflow');await contact('a');assert.equal((await state()).touching,'true',width+'px drag');await reset();if(width===1280)await capture('drag-laptop');}
  await page.setViewportSize({width:1440,height:1300});await page.locator('#direction-play').click();await page.clock.runFor(500);assert.deepEqual(await readings(),{a:60,b:20});await contact('a');await page.clock.runFor(500);const held=await readings();await page.locator('#direction-reset').click();await page.clock.runFor(500);assert.ok((await readings()).a<held.a);await reset();assert.deepEqual(errors,[]);
 });
 await t.test('real touch drag and real-time movement work under both motion preferences',async()=>{
  for(const reducedMotion of ['no-preference','reduce']){
   const ctx=await browser.newContext({viewport:{width:1440,height:1100},hasTouch:true,reducedMotion});
   try{
    const p=await ctx.newPage();await p.goto(url);await p.locator('#balance-lab').scrollIntoViewIfNeeded();const box=await p.locator('#balance-apparatus').boundingBox(),y=box.y+298/440*box.height,x=box.x+312/1000*box.width,delta=56/1000*box.width;
    const cdp=await ctx.newCDPSession(p);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+delta*i/8,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.equal(await p.locator('#balance-lab').getAttribute('data-touching'),'true');
    await p.waitForTimeout(350);const clip={x:box.x+415/1000*box.width,y:box.y+280/440*box.height,width:132/1000*box.width,height:48/440*box.height};const before=await p.screenshot({clip});await p.waitForTimeout(350);assert.equal(before.equals(await p.screenshot({clip})),false);
    await p.locator('#balance-pause').click();const frozen=await p.locator('#balance-apparatus').screenshot();await p.waitForTimeout(300);assert.equal(frozen.equals(await p.locator('#balance-apparatus').screenshot()),true);
   }finally{await ctx.close();}
  }
 });
});
