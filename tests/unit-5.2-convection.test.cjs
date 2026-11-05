const {test}=require('node:test'),assert=require('node:assert/strict'),{spawn}=require('node:child_process'),path=require('node:path');
const {chromium}=require('playwright');

test('5.2 convection: fluid movement, mode changes and observation lifecycle',{timeout:120000},async t=>{
 const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..')});t.after(()=>server.kill());
 const port=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server timeout')),5000);server.stdout.on('data',d=>{const m=String(d).match(/port (\d+)/);if(m){clearTimeout(timer);resolve(m[1]);}});server.on('error',reject);});
 const remote=process.env.CONVECTION_LAB_URL;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox'],...(remote?{proxy:{server:process.env.HTTPS_PROXY||process.env.HTTP_PROXY}}:{})});t.after(()=>browser.close());
 const url=remote||`http://127.0.0.1:${port}/units/5/parts/5.2/`;
 const page=await browser.newPage({viewport:{width:1366,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 await page.clock.install({time:new Date(0)});await page.clock.pauseAt(new Date(1000));await page.goto(url);
 const ready=async p=>{for(let i=0;i<150;i++){if(await p.locator('#convection-lab').getAttribute('data-assets')==='ready')return;await new Promise(resolve=>setTimeout(resolve,50));}throw Error('scene not ready');};
 await ready(page);
 const root=page.locator('#convection-lab'),play=page.locator('#convection-play'),reset=page.locator('#convection-reset');
 const state=()=>root.evaluate(n=>({...n.dataset}));
 const points=()=>page.locator('[data-flow-arrow]').evaluateAll(ns=>ns.map(n=>({position:n.querySelector('.convection-arrow-head').getAttribute('transform'),color:n.querySelector('.convection-arrow-head').getAttribute('fill'),tail:n.querySelector('.convection-arrow-tail').getAttribute('d')})));

 await t.test('starts with a real distinction between water and a room, without a premature conclusion',async()=>{
  assert.equal((await state()).stage,'ready');assert.equal((await state()).playing,'false');
  assert.equal(await page.locator('#convection-water-scene').isVisible(),true);assert.equal(await page.locator('#convection-air-scene').isVisible(),false);
  assert.equal(await page.locator('#convection-motion').getAttribute('opacity'),'0');assert.equal(await page.locator('#convection-discovery').isVisible(),false);
  assert.match(await page.locator('#card-04 .dialogue p').first().textContent(),/上面的水/);
  assert.match(await page.locator('#convection-lab .panel-note').textContent(),/不是固定流路、實際流速或溫度量測/);
 });
 await t.test('both sides rise near the source, move continuously and use the same relative-warmth key',async()=>{
  await play.click();const before=await points();await page.clock.runFor(750);const after=await points();assert.notDeepEqual(after,before);
  const y=transform=>Number(transform.match(/translate\([\d.-]+ ([\d.-]+)/)[1]);assert.ok(y(after[0].position)<y(before[0].position));assert.ok(y(after[3].position)<y(before[3].position));
  assert.equal(after[0].color,after[3].color);assert.equal(after[1].color,after[4].color);assert.notEqual(after[0].color,after[1].color);
  await page.clock.runFor(6000);assert.equal((await state()).stage,'circulating');assert.match(await page.locator('#convection-step-3').textContent(),/下沉/);
  await page.clock.runFor(6500);assert.equal((await state()).stage,'observed');assert.equal(await page.locator('#convection-discovery').isVisible(),true);
  assert.match(await page.locator('#convection-discovery').textContent(),/往上走的是受熱的水或空氣/);
 });
 await t.test('photographic scenes keep animated arrows in the fluid and not inside the heater',async()=>{
  const geometry=await page.evaluate(()=>{
   const paths=['left','right'].map(side=>document.querySelector('#convection-'+side));
   return paths.flatMap(path=>Array.from({length:101},(_,i)=>{const p=path.getPointAtLength(path.getTotalLength()*i/100);return{x:p.x,y:p.y};}));
  });
  assert.ok(geometry.every(p=>p.x>180&&p.x<842&&p.y>205&&p.y<425));
  assert.equal(await page.locator('#convection-motion').getAttribute('clip-path'),'url(#convection-water-mask)');
  assert.match(await page.locator('#convection-water-photo').getAttribute('href'),/convection-water.webp/);
  assert.equal(await page.locator('#convection-lab details').getAttribute('open'),null);
 });
 await t.test('pause freezes actual rendered positions and screenshots; resume preserves progress',async()=>{
  await play.click();const before=await points(),time=(await state()).elapsed;await page.clock.runFor(1000);assert.deepEqual(await points(),before);assert.equal((await state()).elapsed,time);
  const first=await root.screenshot();await page.clock.runFor(500);assert.equal(first.equals(await root.screenshot()),true);
  for(const id of ['convection-play','convection-status','convection-note','convection-heater-label']){
   const text=await page.locator('#'+id).evaluate(n=>{const range=document.createRange();range.selectNodeContents(n);const r=range.getBoundingClientRect();return {width:r.width,height:r.height};});
   assert.ok(text.width>10&&text.height>10,`${id}: dynamic text has a real layout after pausing`);
  }
  await play.click();await page.clock.runFor(400);assert.notDeepEqual(await points(),before);
 });
 await t.test('switching the fluid cancels old animation, clears the discovery and resets observations',async()=>{
  await page.locator('button[data-medium=air]').click();assert.equal((await state()).medium,'air');assert.equal((await state()).elapsed,'0.000');assert.equal((await state()).playing,'false');
  assert.equal(await page.locator('#convection-water-scene').isVisible(),false);assert.equal(await page.locator('#convection-air-scene').isVisible(),true);
  assert.equal(await page.locator('#convection-discovery').isVisible(),false);assert.match(await page.locator('#convection-hint').textContent(),/空氣本身看不見/);
  await ready(page);await page.clock.runFor(600);assert.equal((await state()).elapsed,'0.000');await play.click();await page.clock.runFor(450);assert.ok(Number((await state()).elapsed)>0);
  await reset.click();assert.equal((await state()).medium,'air');assert.equal((await state()).stage,'ready');assert.equal(await play.textContent(),'開始觀察');
 });
 await t.test('clicking each appliance starts or resumes without toggling off or multiplying animation loops',async()=>{
  const heater=page.locator('#convection-heater');
  for(const [medium,device]of [['water','電熱板'],['air','暖氣機']]){
   await page.locator(`button[data-medium=${medium}]`).click();await ready(page);await reset.click();
   assert.match(await heater.getAttribute('aria-label'),new RegExp(device));
   assert.match(await page.locator('#convection-note').textContent(),new RegExp('點擊'+device));
   await page.locator('#convection-apparatus').click({position:{x:25,y:25}});await page.clock.runFor(200);
   assert.equal((await state()).elapsed,'0.000');
   await heater.click();const before=await points();await page.clock.runFor(300);assert.notDeepEqual(await points(),before);
   const elapsed=Number((await state()).elapsed);await heater.click();await heater.click();await page.clock.runFor(300);
   assert.equal((await state()).playing,'true');assert.ok(Number((await state()).elapsed)-elapsed<.36);
   await play.click();const paused=(await state()).elapsed;await heater.click();await page.clock.runFor(200);
   assert.ok(Number((await state()).elapsed)>Number(paused));
   await reset.click();await heater.focus();await page.keyboard.press('Enter');await page.clock.runFor(200);assert.equal((await state()).playing,'true');
   await reset.click();await heater.focus();await page.keyboard.press('Space');await page.clock.runFor(200);assert.equal((await state()).playing,'true');
   await reset.click();await page.clock.runFor(200);assert.equal((await state()).elapsed,'0.000');
  }
 });
 await t.test('keyboard, rapid actions and background interruptions leave no delayed restart',async()=>{
  await play.focus();await page.keyboard.press('Enter');await page.clock.runFor(300);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});assert.equal((await state()).playing,'false');const before=await points();await page.clock.runFor(700);assert.deepEqual(await points(),before);
  await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});assert.equal((await state()).playing,'false');
  await play.click();await reset.click();await page.clock.runFor(500);assert.equal((await state()).elapsed,'0.000');assert.equal((await state()).playing,'false');
 });
 await t.test('radiation, insulation and the integrated quiz still work independently',async()=>{
  await page.locator('#radiation-play').click();await page.clock.runFor(400);const ray=await page.locator('#radiation-rays').getAttribute('stroke-dashoffset');
  await play.click();await reset.click();await page.clock.runFor(400);assert.notEqual(await page.locator('#radiation-rays').getAttribute('stroke-dashoffset'),ray);
  await page.locator('#radiation-play').click();const heldRay=await page.locator('#radiation-rays').getAttribute('stroke-dashoffset');await page.clock.runFor(200);assert.equal(await page.locator('#radiation-rays').getAttribute('stroke-dashoffset'),heldRay);await page.locator('#radiation-reset').click();
  await page.locator('[data-insulation-comparison=gap]').click();await page.locator('#insulation-play').click();await page.clock.runFor(1800);
  const base=Number(await page.locator('#insulation-point-a').getAttribute('cy')),design=Number(await page.locator('#insulation-point-b').getAttribute('cy'));assert.ok(design<base&&design>45);await page.locator('#insulation-reset').click();
  await page.locator('#heat-quiz button[type=submit]').click();assert.match(await page.locator('#heat-quiz-result').textContent(),/先完成/);
  await page.locator('input[value=inside]').check();for(const name of ['metal','air','sun'])await page.locator(`select[name=${name}]`).selectOption('conduction');await page.locator('#heat-quiz button[type=submit]').click();assert.match(await page.locator('#heat-quiz-result').textContent(),/再看/);
  await page.locator('input[value=outside]').check();for(const [name,value]of [['metal','conduction'],['air','convection'],['sun','radiation']])await page.locator(`select[name=${name}]`).selectOption(value);await page.locator('#heat-quiz button[type=submit]').click();assert.match(await page.locator('#heat-quiz-result').textContent(),/判斷都合理/);await page.locator('#heat-quiz button[type=reset]').click();assert.equal(await page.locator('#heat-quiz-result').isVisible(),false);
 });
 await t.test('all supported viewports keep explanatory text, controls and the actual fluid scene readable',async()=>{
  for(const [width,height]of [[1440,900],[1366,768],[1280,720],[820,900],[760,900],[390,844],[320,568]]){
   await page.setViewportSize({width,height});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${width}px overflow`);
   for(const selector of ['#convection-play','#convection-reset','#convection-heater','button[data-medium=water]','button[data-medium=air]']){const box=await page.locator(selector).boundingBox();assert.ok(box.height>=44);assert.ok(box.x>=0&&box.x+box.width<=width);}
   assert.ok(await page.locator('#convection-note').evaluate(n=>parseFloat(getComputedStyle(n).fontSize)>=13));assert.ok((await page.locator('#convection-apparatus').boundingBox()).height>100);
  }assert.deepEqual(errors,[]);
 });
 await t.test('a failed image can be retried, and a late response cannot reset a different running mode',async()=>{
  const context=await browser.newContext();const p=await context.newPage();
  try{
   let failed=true;
   await p.route('**/convection-water.webp*',route=>failed?route.abort():route.continue());
   await p.goto(url);
   for(let i=0;i<100&&await p.locator('#convection-lab').getAttribute('data-assets')!=='error';i++)await new Promise(resolve=>setTimeout(resolve,50));
   assert.equal(await p.locator('#convection-play').isDisabled(),true);assert.equal(await p.locator('#convection-heater').isDisabled(),true);await p.locator('#convection-heater').dispatchEvent('click');assert.equal(await p.locator('#convection-lab').getAttribute('data-playing'),'false');
   assert.equal(await p.locator('#convection-retry').isVisible(),true);
   failed=false;await p.locator('#convection-retry').click();await ready(p);
   assert.equal(await p.locator('#convection-lab').getAttribute('data-stage'),'ready');
   let release,held=new Promise(resolve=>release=resolve),intercepted=false;
   await p.route('**/convection-air.webp*',async route=>{intercepted=true;await held;await route.continue();});
   await p.locator('button[data-medium=air]').click();
   for(let i=0;i<100&&!intercepted;i++)await new Promise(resolve=>setTimeout(resolve,25));
   assert.equal(intercepted,true);assert.equal(await p.locator('#convection-play').isDisabled(),true);assert.equal(await p.locator('#convection-heater').isDisabled(),true);await p.locator('#convection-heater').dispatchEvent('click');assert.equal(await p.locator('#convection-lab').getAttribute('data-playing'),'false');
   await p.locator('button[data-medium=water]').click();await ready(p);await p.locator('#convection-play').click();
   await p.waitForTimeout(200);release();await p.waitForTimeout(350);
   assert.equal(await p.locator('#convection-lab').getAttribute('data-medium'),'water');
   assert.equal(await p.locator('#convection-lab').getAttribute('data-playing'),'true');
   assert.ok(Number(await p.locator('#convection-lab').getAttribute('data-elapsed'))>0);
   await p.locator('button[data-medium=air]').click();await ready(p);
   assert.equal(await p.locator('#convection-motion').getAttribute('clip-path'),'url(#convection-air-mask)');
   assert.match(await p.locator('#convection-air-mask path').getAttribute('d'),/M372 430H630V560H372Z/);
   assert.equal(await p.locator('#convection-lab').getAttribute('data-playing'),'false');
  }finally{await context.close();}
 });
 await t.test('real frames keep moving with both motion preferences and touch can pause/reset',async()=>{
  for(const reducedMotion of ['no-preference','reduce'])for(const width of [390,320]){
   const context=await browser.newContext({viewport:{width,height:844},hasTouch:true,reducedMotion});
   try{const p=await context.newPage();await p.goto(url);for(const medium of ['water','air']){await p.locator(`button[data-medium=${medium}]`).tap();await ready(p);await p.locator('#convection-heater').tap();await p.waitForTimeout(500);
    const trace=p.locator('[data-flow-arrow] .convection-arrow-head').first(),before=await trace.getAttribute('transform');await p.waitForTimeout(300);assert.notEqual(await trace.getAttribute('transform'),before);
    await p.locator('#convection-play').tap();const held=await trace.getAttribute('transform');await p.waitForTimeout(250);assert.equal(await trace.getAttribute('transform'),held);await p.locator('#convection-reset').tap();assert.equal(await p.locator('#convection-lab').getAttribute('data-stage'),'ready');}
   }finally{await context.close();}
  }
 });
});
