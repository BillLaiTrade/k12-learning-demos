const {test}=require('node:test'),assert=require('node:assert/strict'),{spawn}=require('node:child_process'),path=require('node:path'),fs=require('node:fs/promises'),{chromium}=require('playwright');

test('5.2 equilibrium: ambient exchange, faster contact and dragging',{timeout:240000},async t=>{
 const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..')});t.after(()=>server.kill());
 const port=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server timeout')),5000);server.stdout.on('data',d=>{const m=String(d).match(/port (\d+)/);if(m){clearTimeout(timer);resolve(m[1]);}});server.on('error',reject);});
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});t.after(()=>browser.close());
 const context=await browser.newContext({viewport:{width:1440,height:1300},deviceScaleFactor:1.5}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 const url=process.env.BALANCE_LAB_URL||`http://127.0.0.1:${port}/units/5/parts/5.2/index.html`;
 await page.clock.install({time:new Date(0)});await page.clock.pauseAt(new Date(1000));await page.goto(url);
 const root=page.locator('#balance-lab'),state=()=>root.evaluate(n=>({...n.dataset}));
 const readings=()=>page.evaluate(()=>({a:Number(document.getElementById('balance-temp-a').textContent.replace('°C','')),b:Number(document.getElementById('balance-temp-b').textContent.replace('°C',''))}));
 const raw=async()=>{const s=await state();return{a:Number(s.temperatureA),b:Number(s.temperatureB)};};
 const pulses=()=>page.locator('.balance-pulse').evaluateAll(ns=>ns.map(n=>n.getAttribute('transform')));
 const reset=()=>page.locator('#balance-reset').click();
 async function drag(side,delta,anchor={}){
  await root.scrollIntoViewIfNeeded();const s=await state(),box=await page.locator('#balance-apparatus').boundingBox();
  const x=box.x+((anchor.x??(side==='a'?340:555))+Number(s[side==='a'?'offsetA':'offsetB']))/1000*box.width,y=box.y+(anchor.y??298)/440*box.height;
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+delta/1000*box.width,y,{steps:8});await page.mouse.up();
 }
 async function contact(side='a'){const s=await state();await drag(side,Number(s.gap)*(side==='a'?1:-1));}
 async function capture(name){if(!process.env.BALANCE_CAPTURE_DIR)return;await fs.mkdir(process.env.BALANCE_CAPTURE_DIR,{recursive:true});await page.mouse.move(0,0);await page.locator('#balance-reset').focus();await page.locator('#card-02').screenshot({path:path.join(process.env.BALANCE_CAPTURE_DIR,name+'.png')});}

 await t.test('observation waits until the block is seen, with a visible room temperature',async()=>{
  assert.equal((await state()).started,'false');await page.clock.runFor(3000);assert.deepEqual(await readings(),{a:60,b:20});
  assert.equal(await page.locator('#balance-play').count(),0);assert.equal(await root.locator('[role=slider]').count(),2);assert.match(await page.locator('.balance-room').textContent(),/25°C/);
  assert.equal(await root.locator('[data-balance],.balance-modes').count(),0,'no scenario switcher');
  await root.scrollIntoViewIfNeeded();
  // IntersectionObserver delivery is a browser rendering task, outside the mocked clock.
  for(let i=0;i<20&&(await state()).started!=='true';i++){await page.clock.runFor(32);await new Promise(resolve=>setTimeout(resolve,15));}
  assert.equal((await state()).started,'true');assert.equal((await state()).playing,'true');
  assert.match(await page.locator('#card-02 .speaker').first().evaluate(n=>getComputedStyle(n,'::before').backgroundImage),/dialogue-character-avatars/);
 });
 await t.test('separated blocks drift towards the room and can be paused',async()=>{
  await reset();await page.clock.runFor(4000);const s=await readings();assert.ok(s.a<60&&s.a>25&&s.b>20&&s.b<25);assert.equal((await state()).phase,'separated');assert.equal((await state()).playing,'true');assert.equal(await page.locator('#balance-flow').isVisible(),false);
  await capture('ambient-separated');await page.locator('#balance-pause').click();const held=await readings();await page.clock.runFor(1000);assert.deepEqual(await readings(),held);await page.locator('#balance-pause').click();await page.clock.runFor(500);assert.ok((await readings()).a<held.a);
 });
 await t.test('contact is faster than room exchange and does not restart the readings',async()=>{
  await reset();await page.clock.runFor(2000);const apart=await raw();
  await reset();await contact('a');await page.clock.runFor(2000);const together=await raw();assert.ok(together.a-together.b<(apart.a-apart.b)/2);assert.equal((await state()).touching,'true');assert.equal(await page.locator('#balance-flow').getAttribute('transform'),'translate(28,0)');
  assert.equal(await page.locator('#balance-flow').isVisible(),true);await capture('ambient-contact');
 });
 await t.test('separating still changes temperatures; recontact continues rather than resets',async()=>{
  await reset();await contact();await page.clock.runFor(3000);await drag('b',65);const held=await raw();assert.ok(held.b>25);assert.equal(await page.locator('#balance-flow').isVisible(),false);
  await page.clock.runFor(3000);const cooled=await raw();assert.ok(cooled.a<held.a&&cooled.b<held.b);assert.equal((await state()).playing,'true');await capture('ambient-pulled-apart');
  await contact('b');const unchanged=await raw();assert.deepEqual(unchanged,cooled);await page.clock.runFor(1000);const s=await raw();assert.ok(s.a-s.b<cooled.a-cooled.b);assert.ok(s.a<60&&s.b>20);
 });
 await t.test('near equal block temperatures are not full room equilibrium',async()=>{
  await reset();await contact();await page.clock.runFor(20000);const s=await readings();assert.ok(Math.abs(s.a-s.b)<=.2);assert.ok(s.a>25&&s.b>25);assert.equal((await state()).phase,'ambient');assert.equal((await state()).playing,'true');assert.equal(await page.locator('#balance-flow').isVisible(),false);
  assert.match(await page.locator('#balance-note').textContent(),/仍會和 25°C/);assert.equal(await page.locator('#balance-trend-b').textContent(),'降溫中');await capture('ambient-near-equal');
  await page.clock.runFor(3000);const later=await readings();assert.ok(later.a<s.a&&later.b<s.b);
 });
 await t.test('only room equilibrium stops the model at 25°C and survives recontact',async()=>{
  await page.clock.runFor(150000);assert.deepEqual(await readings(),{a:25,b:25});assert.equal((await state()).phase,'complete');assert.equal((await state()).playing,'false');assert.match(await page.locator('#balance-note').textContent(),/與室溫相同/);await capture('ambient-complete');
  await drag('a',-25);await contact();await page.clock.runFor(1200);assert.deepEqual(await readings(),{a:25,b:25});assert.equal(await page.locator('#balance-flow').isVisible(),false);
 });
 await t.test('drags, collision limits, instrument labels and overlay hit areas still work',async()=>{
  await reset();await drag('b',60);await contact('a');await page.clock.runFor(900);const s=await state(),r=await readings();assert.equal(await page.locator('#balance-probe-dot').getAttribute('cx'),String(352+Number(s.offsetA)));
  for(const side of ['a','b'])assert.equal(await page.locator('#balance-digits-'+side).getAttribute('data-value'),r[side].toFixed(1));
  await drag('a',-20,{x:440,y:303});assert.equal((await state()).touching,'false');await contact();await drag('a',-20,{x:352,y:221});assert.equal((await state()).touching,'false');await contact();
  await drag('a',500);assert.equal((await state()).offsetA,(await state()).offsetB);
  await page.locator('#balance-block-a').focus();await page.keyboard.press('Home');assert.equal((await state()).offsetA,'-90');assert.equal((await state()).playing,'true');await page.keyboard.press('End');assert.equal((await state()).touching,'true');
 });
 await t.test('pause, backgrounding and reset keep the physical state continuous',async()=>{
  await page.locator('#balance-pause').click();const held=await readings(),positions=await pulses();await page.clock.runFor(800);assert.deepEqual(await readings(),held);assert.deepEqual(await pulses(),positions);
  await drag('a',-25);await page.clock.runFor(1000);assert.notDeepEqual(await readings(),held);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});assert.equal((await state()).phase,'paused');const frozen=await readings();await page.clock.runFor(800);assert.deepEqual(await readings(),frozen);await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
  await reset();assert.deepEqual(await readings(),{a:60,b:20});assert.equal((await state()).gap,'56');
 });
 await t.test('desktop and laptop retain readable drag controls and other blocks stay independent',async()=>{
  for(const width of [1440,1280,1024,768,390,320]){await page.setViewportSize({width,height:1300});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,width+'px overflow');await contact();assert.equal((await state()).touching,'true');await reset();if(width===1280)await capture('ambient-laptop');}
  await page.setViewportSize({width:1440,height:1300});await page.locator('#direction-play').click();await page.clock.runFor(600);const s=await readings();assert.ok(s.a<60&&s.b>20);await contact();const before=await raw();await page.locator('#direction-reset').click();await page.clock.runFor(500);assert.ok((await raw()).a<before.a);assert.deepEqual(errors,[]);
 });
 await t.test('real touch input and real-time flow work with both motion preferences',async()=>{
  for(const reducedMotion of ['no-preference','reduce']){
   const ctx=await browser.newContext({viewport:{width:1440,height:1100},hasTouch:true,reducedMotion});
   try{
    const p=await ctx.newPage();await p.goto(url);await p.locator('#balance-lab').scrollIntoViewIfNeeded();await p.waitForFunction(()=>document.getElementById('balance-lab').dataset.started==='true');const box=await p.locator('#balance-apparatus').boundingBox(),y=box.y+298/440*box.height,x=box.x+312/1000*box.width,delta=56/1000*box.width;
    const cdp=await ctx.newCDPSession(p);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+delta*i/8,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.equal(await p.locator('#balance-lab').getAttribute('data-touching'),'true');
    await p.waitForTimeout(350);const clip={x:box.x+415/1000*box.width,y:box.y+280/440*box.height,width:132/1000*box.width,height:48/440*box.height};const before=await p.screenshot({clip});await p.waitForTimeout(350);assert.equal(before.equals(await p.screenshot({clip})),false);
    await p.locator('#balance-pause').click();const frozen=await p.locator('#balance-apparatus').screenshot();await p.waitForTimeout(300);assert.equal(frozen.equals(await p.locator('#balance-apparatus').screenshot()),true);
   }finally{await ctx.close();}
  }
 });
});
