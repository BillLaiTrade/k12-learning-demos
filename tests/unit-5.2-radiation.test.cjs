const {test}=require('node:test'),assert=require('node:assert/strict'),{spawn}=require('node:child_process'),path=require('node:path');
const {chromium}=require('playwright');

test('5.2 radiation: one energy path, surface outcomes and conditional warming',{timeout:150000},async t=>{
 const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..')});t.after(()=>server.kill());
 const port=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server timeout')),5000);server.stdout.on('data',d=>{const m=String(d).match(/port (\d+)/);if(m){clearTimeout(timer);resolve(m[1]);}});server.on('error',reject);});
 const remote=process.env.RADIATION_LAB_URL,url=remote||`http://127.0.0.1:${port}/units/5/parts/5.2/`;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',...(remote?{proxy:{server:process.env.HTTPS_PROXY||process.env.HTTP_PROXY}}:{})});t.after(()=>browser.close());
 const page=await browser.newPage({viewport:{width:1366,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 const waitState=async(p,wanted)=>{for(let i=0;i<180;i++){if(await p.locator('#radiation-lab').getAttribute('data-assets')===wanted)return;await new Promise(resolve=>setTimeout(resolve,40));}throw Error('asset state not reached: '+wanted);};
 await page.clock.install({time:new Date(0)});await page.clock.pauseAt(new Date(1000));await page.goto(url);await waitState(page,'ready');
 const root=page.locator('#radiation-lab'),play=page.locator('#radiation-play'),source=page.locator('#radiation-source'),reset=page.locator('#radiation-reset');
 const state=()=>root.evaluate(n=>({...n.dataset}));
 const drawing=()=>page.evaluate(()=>({rays:document.querySelector('#radiation-rays').getAttribute('stroke-dashoffset'),travel:document.querySelector('#radiation-travel-window').getAttribute('width'),incoming:document.querySelector('#radiation-ground-incoming').getAttribute('stroke-dashoffset'),outcomes:document.querySelector('#radiation-ground-outcomes').getAttribute('stroke-dashoffset'),curve:document.querySelector('#radiation-heat-curve').getAttribute('d')}));
 const toStage=async stage=>{for(let i=0;i<100&&(await state()).stage!==stage;i++)await page.clock.runFor(200);assert.equal((await state()).stage,stage);};
 await t.test('manual start is required and the concept uses a single radiation-energy stream',async()=>{
  assert.equal((await state()).stage,'ready');assert.equal((await state()).started,'false');const before=await drawing();await page.clock.runFor(1000);assert.deepEqual(await drawing(),before);assert.equal((await state()).elapsed,'0.000');
  assert.equal(await page.locator('#radiation-space-motion').getAttribute('opacity'),'0');assert.equal(await page.locator('#radiation-heat-point').getAttribute('hidden'),'');assert.equal(await page.locator('#radiation-discovery').isVisible(),false);
  assert.equal(await page.locator('[data-radiation-ray]').count(),3);assert.equal(await page.locator('#radiation-shield-toggle').count(),0);
  assert.match(await page.locator('.radiation-spectrum').textContent(),/可見光、紅外線等.*都攜帶能量/);assert.match(await page.locator('.radiation-key-note').textContent(),/可見光與紅外線被吸收後，都可能使物體受熱/);assert.match(await page.locator('.radiation-heat-condition').textContent(),/吸收能量多於散失/);
  assert.doesNotMatch(await root.innerText(),/\d+\s*°C|\d+\s*秒/);
 });
 await t.test('travel precedes surface reflection/absorption, and heating begins only after absorption',async()=>{
  await source.click();await page.clock.runFor(700);assert.equal((await state()).stage,'travelling');assert.equal((await state()).heatProgress,'0.0000');assert.equal(await page.locator('#radiation-ground-incoming').getAttribute('opacity'),'0');
  const first=await drawing();await page.clock.runFor(300);assert.notEqual((await drawing()).rays,first.rays);assert.ok(Number((await drawing()).travel)>Number(first.travel));
  await toStage('at-surface');assert.equal(await page.locator('#radiation-ground-incoming').getAttribute('opacity'),'1');assert.equal(await page.locator('#radiation-ground-outcomes').getAttribute('opacity'),'0');assert.equal((await state()).heatProgress,'0.0000');
  await toStage('absorbed');assert.equal(await page.locator('#radiation-ground-outcomes').getAttribute('opacity'),'1');assert.equal((await state()).heatProgress,'0.0000');
  await toStage('warming');const curve=await drawing(),point=Number(await page.locator('#radiation-heat-point').getAttribute('cy'));await page.clock.runFor(1300);assert.notEqual((await drawing()).curve,curve.curve);assert.ok(Number(await page.locator('#radiation-heat-point').getAttribute('cy'))<point);
 });
 await t.test('pause freezes the whole rendered illustration and resume keeps the same progress',async()=>{
  await play.click();await page.mouse.move(0,0);const held=await drawing(),elapsed=(await state()).elapsed;await page.clock.runFor(1000);assert.deepEqual(await drawing(),held);assert.equal((await state()).elapsed,elapsed);
  const rays=await page.locator('#radiation-space').screenshot(),chart=await page.locator('#radiation-chart').screenshot();await page.clock.runFor(400);assert.equal(rays.equals(await page.locator('#radiation-space').screenshot()),true);assert.equal(chart.equals(await page.locator('#radiation-chart').screenshot()),true);
  for(const id of ['radiation-note','radiation-status','radiation-play']){const text=await page.locator('#'+id).evaluate(n=>{const r=document.createRange();r.selectNodeContents(n);const b=r.getBoundingClientRect();return {width:b.width,height:b.height};});assert.ok(text.width>10&&text.height>10,id+' renders after updates');}
  await source.click();await page.clock.runFor(350);assert.ok(Number((await state()).elapsed)>Number(elapsed));
 });
 await t.test('repeated source clicks cannot stop the demo or multiply animation loops; reset clears all results',async()=>{
  const before=Number((await state()).elapsed);await source.click();await source.click();await page.clock.runFor(350);assert.equal((await state()).playing,'true');assert.ok(Number((await state()).elapsed)-before<.42);
  await toStage('observed');assert.equal((await state()).heatProgress,'1.0000');assert.equal(await page.locator('#radiation-discovery').isVisible(),true);
  await reset.click();await page.clock.runFor(700);assert.equal((await state()).elapsed,'0.000');assert.equal((await state()).heatProgress,'0.0000');assert.equal((await state()).stage,'ready');assert.equal(await page.locator('#radiation-discovery').isVisible(),false);assert.equal(await page.locator('#radiation-heat-point').getAttribute('hidden'),'');
 });
 await t.test('keyboard and background interruptions are consistent and do not auto-resume',async()=>{
  await source.focus();await page.keyboard.press('Enter');await page.clock.runFor(250);assert.equal((await state()).playing,'true');await reset.click();await source.focus();await page.keyboard.press('Space');await page.clock.runFor(250);assert.equal((await state()).playing,'true');
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});const held=await drawing();await page.clock.runFor(600);assert.deepEqual(await drawing(),held);assert.equal((await state()).playing,'false');
  await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});assert.equal((await state()).playing,'false');await reset.click();
 });
 await t.test('the reflection and absorption paths are distinct outcomes at the same surface point',async()=>{
  const geometry=await page.evaluate(()=>[...document.querySelectorAll('#radiation-ground-outcomes .radiation-ground-color')].map(n=>{const start=n.getPointAtLength(0),end=n.getPointAtLength(n.getTotalLength());return {start:{x:start.x,y:start.y},end:{x:end.x,y:end.y},stroke:getComputedStyle(n).stroke};}));
  assert.deepEqual(geometry[0].start,geometry[1].start);assert.ok(geometry[0].end.y<geometry[0].start.y);assert.ok(geometry[1].end.y>geometry[1].start.y);assert.equal(geometry[0].stroke,geometry[1].stroke);
  assert.match(await page.locator('.radiation-explanation').textContent(),/大氣也會吸收、散射或反射/);assert.match(await page.locator('.radiation-explanation').textContent(),/並非岩石只朝一個方向反射/);assert.match(await page.locator('.radiation-explanation').textContent(),/沒有發出可見光.*熱輻射/);
 });
 await t.test('insulation, convection and quiz remain independent after extracting radiation from the shared controller',async()=>{
  await page.locator('[data-insulation-comparison=gap]').click();await page.locator('#insulation-play').click();await source.click();await page.clock.runFor(1700);await reset.click();const before=await page.locator('#insulation-curve-b').getAttribute('d');await page.clock.runFor(800);assert.notEqual(await page.locator('#insulation-curve-b').getAttribute('d'),before);assert.ok(Number(await page.locator('#insulation-point-b').getAttribute('cy'))<Number(await page.locator('#insulation-point-a').getAttribute('cy')));await page.locator('#insulation-reset').click();
  await page.locator('#convection-play').click();await page.clock.runFor(250);const elapsed=Number(await page.locator('#convection-lab').getAttribute('data-elapsed'));await source.click();await reset.click();await page.clock.runFor(300);assert.ok(Number(await page.locator('#convection-lab').getAttribute('data-elapsed'))>elapsed);await page.locator('#convection-reset').click();
  await page.locator('#bath-check').click();assert.match(await page.locator('#bath-result').textContent(),/先開始/);await page.locator('#bath-bottle').focus();await page.keyboard.press('Enter');await page.locator('#bath-play').click();await page.clock.runFor(500);assert.ok(Number(await page.locator('#water-bath').getAttribute('data-drink'))>20);await page.locator('#bath-reset').click();assert.equal(await page.locator('#bath-reading-drink span').textContent(),'20.0');
 });
 await t.test('desktop, laptop and narrow layouts keep controls, condition and actual scenes in view',async()=>{
  for(const [width,height]of [[1440,900],[1366,768],[1280,720],[820,900],[760,900],[390,844],[320,568]]){
   await page.setViewportSize({width,height});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,width+'px overflow');
   for(const id of ['radiation-source','radiation-play','radiation-reset']){const b=await page.locator('#'+id).boundingBox();assert.ok(b.height>=44&&b.width>=44,id+' target');assert.ok(b.x>=0&&b.x+b.width<=width);}
   for(const s of ['.radiation-heat-condition','.radiation-key-note']){const box=await page.locator(s).boundingBox();assert.ok(box.width>100&&box.height>12);assert.ok(await page.locator(s).evaluate(n=>parseFloat(getComputedStyle(n).fontSize)>=13));}
   assert.ok((await page.locator('#radiation-space').boundingBox()).height>=100);assert.ok((await page.locator('#radiation-ground').boundingBox()).height>=60);
  }assert.deepEqual(errors,[]);
 });
 await t.test('either photo may fail and retry without premature playback or loss of the other successful photo',async()=>{
  for(const asset of ['space','ground']){const context=await browser.newContext(),p=await context.newPage();try{let failed=true;await p.route(`**/radiation-${asset}.webp*`,r=>failed?r.abort():r.continue());await p.goto(url);await waitState(p,'error');assert.equal(await p.locator('#radiation-play').isDisabled(),true);assert.equal(await p.locator('#radiation-source').isDisabled(),true);await p.locator('#radiation-source').dispatchEvent('click');assert.equal(await p.locator('#radiation-lab').getAttribute('data-playing'),'false');failed=false;await p.locator('#radiation-retry').click();await waitState(p,'ready');assert.equal(await p.locator('#radiation-lab').getAttribute('data-started'),'false');await p.locator('#radiation-source').click();await p.waitForTimeout(150);assert.equal(await p.locator('#radiation-lab').getAttribute('data-playing'),'true');}finally{await context.close();}}
 });
 await t.test('a late photo response after reset leaves the observation stopped at its beginning',async()=>{
  const context=await browser.newContext(),p=await context.newPage();let release;const held=new Promise(resolve=>release=resolve);try{await p.route('**/radiation-ground.webp*',async route=>{await held;await route.continue();});await p.goto(url,{waitUntil:'domcontentloaded'});assert.equal(await p.locator('#radiation-source').isDisabled(),true);await p.locator('#radiation-reset').click();await p.locator('#radiation-source').dispatchEvent('click');release();await waitState(p,'ready');assert.equal(await p.locator('#radiation-lab').getAttribute('data-elapsed'),'0.000');assert.equal(await p.locator('#radiation-lab').getAttribute('data-playing'),'false');}finally{release();await context.close();}
 });
 await t.test('real touch under both motion preferences starts moving rays and pauses/resets actual frames',async()=>{
  for(const reducedMotion of ['no-preference','reduce'])for(const width of [390,320]){const context=await browser.newContext({viewport:{width,height:844},hasTouch:true,reducedMotion}),p=await context.newPage();try{await p.goto(url);await waitState(p,'ready');await p.locator('#radiation-source').tap();await p.waitForTimeout(350);const first=await p.locator('#radiation-rays').getAttribute('stroke-dashoffset');await p.waitForTimeout(250);assert.notEqual(await p.locator('#radiation-rays').getAttribute('stroke-dashoffset'),first);await p.locator('#radiation-play').tap();const held=await p.locator('#radiation-rays').getAttribute('stroke-dashoffset');await p.waitForTimeout(200);assert.equal(await p.locator('#radiation-rays').getAttribute('stroke-dashoffset'),held);await p.locator('#radiation-reset').tap();assert.equal(await p.locator('#radiation-lab').getAttribute('data-stage'),'ready');}finally{await context.close();}}
 });
});
