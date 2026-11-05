const {test}=require('node:test'),assert=require('node:assert/strict'),{spawn}=require('node:child_process'),path=require('node:path');
const {chromium}=require('playwright');
test('5.2 insulation: controlled comparisons, remaining heat paths and manual observation',{timeout:150000},async t=>{
 const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..')});t.after(()=>server.kill());
 const port=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server timeout')),5000);server.stdout.on('data',d=>{const m=String(d).match(/port (\d+)/);if(m){clearTimeout(timer);resolve(m[1]);}});server.on('error',reject);});
 const remote=process.env.INSULATION_LAB_URL,url=remote||`http://127.0.0.1:${port}/units/5/parts/5.2/`;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',...(remote?{proxy:{server:process.env.HTTPS_PROXY||process.env.HTTP_PROXY}}:{})});t.after(()=>browser.close());
 const page=await browser.newPage({viewport:{width:1366,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 const wait=async(p,wanted='ready')=>{for(let i=0;i<240;i++){if(await p.locator('#insulation-lab').getAttribute('data-assets')===wanted)return;await new Promise(r=>setTimeout(r,40));}throw Error('asset state not reached: '+wanted);};
 await page.clock.install({time:new Date(0)});await page.clock.pauseAt(new Date(1000));await page.goto(url);await wait(page);
 const root=page.locator('#insulation-lab'),play=page.locator('#insulation-play'),reset=page.locator('#insulation-reset'),source=page.locator('#insulation-source-a');
 const state=()=>root.evaluate(n=>({...n.dataset}));
 const drawing=()=>page.evaluate(()=>({solid:document.querySelector('#insulation-motion-a .insulation-solid-motion').getAttribute('stroke-dashoffset'),radiation:document.querySelector('#insulation-radiation-b').getAttribute('stroke-dashoffset'),gas:document.querySelector('.insulation-gas-arrow').getAttribute('transform'),curves:['a','b'].map(k=>document.querySelector('#insulation-curve-'+k).getAttribute('d'))}));
 await t.test('starts only on request, retains the scientific bridge and uses identical capped bottles',async()=>{
  assert.equal((await state()).elapsed,'0.000');assert.equal((await state()).playing,'false');const before=await drawing();await page.clock.runFor(1000);assert.deepEqual(await drawing(),before);
  assert.match(await page.locator('#card-06 .dialogue').first().textContent(),/沒有空氣也能傳熱/);assert.match(await page.locator('#card-06 .dialogue').nth(1).textContent(),/氣體導熱.*流動帶熱.*輻射仍能穿過真空/);
  assert.equal(await page.locator('#insulation-motion-a').getAttribute('opacity'),'0');assert.equal(await page.locator('#insulation-discovery').isVisible(),false);
  assert.equal(await page.locator('#insulation-matte-a').getAttribute('href'),await page.locator('#insulation-matte-b').getAttribute('href'));
  assert.match(await page.locator('.insulation-conditions').innerText(),/同型瓶、同水量、同初溫 60°C.*室溫 25°C，均已加蓋/s);
  for(const k of ['a','b'])assert.equal(await page.locator('#insulation-curve-'+k).getAttribute('d'),'M72.00 45.00');
 });
 await t.test('air and vacuum differ in gas paths while radiation and solid neck/support paths remain',async()=>{
  assert.equal((await state()).gasA,'true');assert.equal((await state()).gasB,'false');assert.equal((await state()).liningB,'false');
  await source.click();const first=await drawing();await page.clock.runFor(1200);assert.notDeepEqual(await drawing(),first);
  for(const k of ['a','b']){assert.equal(await page.locator('#insulation-motion-'+k).getAttribute('opacity'),'1');assert.ok(Number(await page.locator('#insulation-radiation-'+k).getAttribute('opacity'))>0);assert.equal(await page.locator('#insulation-motion-'+k+' .insulation-solid-motion path').count(),2);}
  const geometry=await page.locator('#insulation-radiation-a .insulation-heat-line').evaluate(n=>Array.from({length:31},(_,i)=>{const p=n.getPointAtLength(n.getTotalLength()*i/30);return{x:p.x,y:p.y};}));assert.ok(geometry.every(p=>p.x>=292&&p.x<=316&&p.y>330&&p.y<350));
  const a=Number(await page.locator('#insulation-point-a').getAttribute('cy')),b=Number(await page.locator('#insulation-point-b').getAttribute('cy'));assert.ok(45<b&&b<a&&a<224);
 });
 await t.test('pause freezes actual paths and graph pixels, resume does not restart, repeated bottle clicks are idempotent',async()=>{
  await play.click();await page.mouse.move(0,0);const held=await drawing(),elapsed=(await state()).elapsed;await page.clock.runFor(800);assert.deepEqual(await drawing(),held);assert.equal((await state()).elapsed,elapsed);
  const image=await page.locator('#insulation-chart').screenshot();await page.clock.runFor(300);assert.equal(image.equals(await page.locator('#insulation-chart').screenshot()),true);
  await page.locator('#insulation-source-b').click();await page.clock.runFor(300);assert.ok(Number((await state()).elapsed)>Number(elapsed));const before=Number((await state()).elapsed);await source.click();await source.click();await page.clock.runFor(300);assert.ok(Number((await state()).elapsed)-before<.36);assert.equal((await state()).playing,'true');
  await page.clock.runFor(14500);assert.equal((await state()).stage,'observed');assert.equal(await page.locator('#insulation-discovery').isVisible(),true);const rays=await drawing();await page.clock.runFor(300);assert.notEqual((await drawing()).radiation,rays.radiation);assert.equal((await state()).playing,'true');
 });
 await t.test('lining comparison resets progress, holds vacuum fixed and changes only gap-facing imagery',async()=>{
  await reset.click();const original=await page.locator('#insulation-matte-b').getAttribute('href');await page.locator('[data-insulation-comparison=lining]').click();await wait(page);
  assert.equal((await state()).playing,'false');assert.equal((await state()).elapsed,'0.000');assert.equal((await state()).gasA,'false');assert.equal((await state()).gasB,'false');assert.equal((await state()).liningA,'false');assert.equal((await state()).liningB,'true');assert.equal(await page.locator('#insulation-matte-b').getAttribute('href'),original);
  assert.equal(await page.locator('#insulation-gas-motion').getAttribute('hidden'),'');assert.equal(await page.locator('#insulation-lining-photo').getAttribute('clip-path'),'url(#insulation-lining-mask)');assert.equal(await page.locator('#insulation-lining-photo').getAttribute('hidden'),null);
  const mask=page.locator('#insulation-lining-mask path');assert.equal(await mask.getAttribute('clip-rule'),'evenodd');
  await page.clock.runFor(500);assert.equal((await state()).elapsed,'0.000');await source.click();await page.clock.runFor(14500);assert.equal((await state()).stage,'observed');assert.match(await page.locator('#insulation-note').innerText(),/降低輻射換熱.*仍會傳熱/);
  assert.ok(Number(await page.locator('#insulation-radiation-b').getAttribute('opacity'))>0);assert.ok(Number(await page.locator('#insulation-point-b').getAttribute('cy'))<Number(await page.locator('#insulation-point-a').getAttribute('cy')));
  await reset.click();assert.equal((await state()).comparison,'lining');assert.equal((await state()).assets,'ready');assert.equal(await page.locator('#insulation-discovery').isVisible(),false);assert.equal(await page.locator('#insulation-point-b').getAttribute('hidden'),'');
 });
 await t.test('keyboard, background pause and other experiments remain independent',async()=>{
  for(const key of ['Enter','Space']){await source.focus();await page.keyboard.press(key);await page.clock.runFor(200);assert.equal((await state()).playing,'true');await reset.click();}
  await source.click();await page.clock.runFor(200);await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});const held=await drawing();await page.clock.runFor(500);assert.deepEqual(await drawing(),held);await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});assert.equal((await state()).playing,'false');
  await source.click();await page.clock.runFor(200);const time=Number((await state()).elapsed);await page.locator('#radiation-reset').click();await page.locator('#convection-reset').click();await page.clock.runFor(300);assert.ok(Number((await state()).elapsed)>time);await reset.click();
  await page.locator('#heat-quiz button[type=submit]').click();assert.match(await page.locator('#heat-quiz-result').textContent(),/先完成/);await page.locator('input[value=outside]').check();for(const [name,value]of [['metal','conduction'],['air','convection'],['sun','radiation']])await page.locator(`select[name=${name}]`).selectOption(value);await page.locator('#heat-quiz button[type=submit]').click();assert.match(await page.locator('#heat-quiz-result').textContent(),/判斷都合理/);await page.locator('#heat-quiz button[type=reset]').click();
 });
 await t.test('both modes at seven viewports keep the full plot and all native controls inside the panel',async()=>{
  for(const [width,height]of [[1440,900],[1366,768],[1280,720],[820,900],[760,900],[390,844],[320,568]])for(const mode of ['gap','lining']){
   await page.setViewportSize({width,height});await page.locator(`[data-insulation-comparison=${mode}]`).click();await wait(page);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,width+'px overflow');
   const panel=await root.boundingBox();for(const sel of ['#insulation-source-a','#insulation-source-b','#insulation-play','#insulation-reset','[data-insulation-comparison=gap]','[data-insulation-comparison=lining]']){const box=await page.locator(sel).boundingBox();assert.ok(box.height>=44&&box.width>=44,sel+' touch target');assert.ok(box.x>=0&&box.x+box.width<=width+.1);}
   const plot=await page.locator('.insulation-plot').boundingBox();assert.ok(plot.x>=panel.x&&plot.x+plot.width<=panel.x+panel.width,width+' full plot visible');assert.ok(plot.height>=190);
   assert.ok(await page.locator('#insulation-note').evaluate(n=>parseFloat(getComputedStyle(n).fontSize)>=13));
  }assert.deepEqual(errors,[]);
 });
 await t.test('each required image can fail and retry without automatic playback',async()=>{
  for(const asset of ['bench','flask-matte','flask-lining']){const c=await browser.newContext(),p=await c.newPage();try{let fail=true;await p.route(`**/insulation-${asset}.webp*`,r=>fail?r.abort():r.continue());await p.goto(url);if(asset==='flask-lining'){await wait(p);await p.locator('[data-insulation-comparison=lining]').click();}await wait(p,'error');assert.equal(await p.locator('#insulation-play').isDisabled(),true);await p.locator('#insulation-source-a').dispatchEvent('click');assert.equal(await p.locator('#insulation-lab').getAttribute('data-playing'),'false');
   if(asset==='flask-lining'){await p.locator('[data-insulation-comparison=gap]').click();await wait(p);assert.equal(await p.locator('#insulation-play').isDisabled(),false);await p.locator('[data-insulation-comparison=lining]').click();await wait(p,'error');}
   fail=false;await p.locator('#insulation-retry').click();await wait(p);assert.equal(await p.locator('#insulation-lab').getAttribute('data-elapsed'),'0.000');assert.equal(await p.locator('#insulation-lab').getAttribute('data-playing'),'false');
  }finally{await c.close();}}
 });
 await t.test('late lining image cannot restart or reset a different running comparison',async()=>{
  const c=await browser.newContext(),p=await c.newPage();let release,intercepted=false;const hold=new Promise(r=>release=r);try{await p.route('**/insulation-flask-lining.webp*',async r=>{intercepted=true;await hold;await r.continue();});await p.goto(url);await wait(p);await p.locator('[data-insulation-comparison=lining]').click();for(let i=0;i<100&&!intercepted;i++)await new Promise(r=>setTimeout(r,20));assert.equal(intercepted,true);await p.locator('[data-insulation-comparison=gap]').click();await wait(p);await p.locator('#insulation-source-a').click();await p.waitForTimeout(200);const time=Number(await p.locator('#insulation-lab').getAttribute('data-elapsed'));release();await p.waitForTimeout(300);assert.equal(await p.locator('#insulation-lab').getAttribute('data-comparison'),'gap');assert.equal(await p.locator('#insulation-lab').getAttribute('data-playing'),'true');assert.ok(Number(await p.locator('#insulation-lab').getAttribute('data-elapsed'))>time);}finally{release();await c.close();}
 });
 await t.test('real touch in both modes and motion preferences moves paths and pauses actual curves',async()=>{
  for(const width of [390,320])for(const reducedMotion of ['no-preference','reduce']){const c=await browser.newContext({viewport:{width,height:844},hasTouch:true,reducedMotion}),p=await c.newPage();try{await p.goto(url);await wait(p);for(const mode of ['gap','lining']){await p.locator(`[data-insulation-comparison=${mode}]`).tap();await wait(p);await p.locator('#insulation-source-b').tap();await p.waitForTimeout(250);const wave=p.locator('#insulation-radiation-b'),first=await wave.getAttribute('stroke-dashoffset');await p.waitForTimeout(250);assert.notEqual(await wave.getAttribute('stroke-dashoffset'),first);await p.locator('#insulation-play').tap();const held=await wave.getAttribute('stroke-dashoffset'),curve=await p.locator('#insulation-curve-b').getAttribute('d');await p.waitForTimeout(200);assert.equal(await wave.getAttribute('stroke-dashoffset'),held);assert.equal(await p.locator('#insulation-curve-b').getAttribute('d'),curve);await p.locator('#insulation-reset').tap();assert.equal(await p.locator('#insulation-lab').getAttribute('data-elapsed'),'0.000');}}finally{await c.close();}}
 });
});
