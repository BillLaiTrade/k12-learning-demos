const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');
const fs=require('node:fs/promises');
const {chromium}=require('playwright');

test('sixth section teaches apparent depth with synchronized side and rendered observer views',{timeout:180000},async t=>{
 let base=process.env.LESSON_BASE_URL;
 if(!base){const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:['ignore','pipe','ignore']});t.after(()=>server.kill());
  const port=await new Promise((resolve,reject)=>{let out='';const timer=setTimeout(()=>reject(Error('server timeout')),5000);server.stdout.on('data',b=>{out+=b;const m=out.match(/port (\d+)/);if(m){clearTimeout(timer);resolve(m[1]);}});server.on('error',reject);});base=`http://127.0.0.1:${port}/units/4/parts/4.3/`;}
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox'],...(process.env.LESSON_USE_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{})});t.after(()=>browser.close());
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`${r.status()} ${r.url()}`);});
 const ready=async p=>{await p.goto(base);await p.waitForFunction(()=>document.querySelector('#depth-lab')?.dataset.texture==='ready'&&document.querySelector('#depth-observer')?.dataset.depth==='0');};
 await ready(page);
 const set=async(depth,eye)=>{await page.locator('#depth-input').fill(String(depth));await page.locator('#depth-eye').evaluate((el,value)=>{el.dispatchEvent(new KeyboardEvent('keydown',{key:'Home',bubbles:true}));const delta=value-210;for(let n=0;n<Math.floor(delta/10);n++)el.dispatchEvent(new KeyboardEvent('keydown',{key:'PageUp',bubbles:true}));for(let n=0;n<delta%10;n+=2)el.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));},eye);await page.waitForFunction(({depth,eye})=>{const c=document.querySelector('#depth-observer');return c.dataset.depth===String(depth)&&c.dataset.eyeX===String(eye);},{depth,eye});};
 const capture=process.env.DEPTH_CAPTURE_DIR;if(capture)await fs.mkdir(capture,{recursive:true});
 const results=[];
 await t.test('the default is dry and physically occluded, with readable teaching and no automatic motion',async()=>{
  assert.equal(await page.locator('#depth-lab').getAttribute('data-state'),'ready');
  assert.equal(await page.locator('#depth-lab figure').count(),2);
  assert.equal(await page.locator('#depth-lab form').count(),0);
  assert.equal(await page.locator('#depth-lab input[type=range]').count(),1);
  assert.equal(await page.locator('#depth-input').getAttribute('aria-orientation'),'vertical');
  assert.equal(await page.locator('#depth-lab button').count(),3);
  assert.equal(await page.locator('.depth-explanation #show-rays').count(),1);
  assert.equal(await page.locator('.depth-explanation #depth-replay').count(),1);
  assert.deepEqual(await page.locator('.depth-controls button').evaluateAll(es=>es.map(e=>e.id)),['depth-fill','depth-drain']);
  assert.equal(await page.locator('.depth-eye-rail').count(),1);
  assert.equal(await page.locator('#depth-reset').count(),0);
  assert.equal(await page.locator('.depth-explanation #depth-control-help').count(),1);
  assert.equal(await page.locator('.depth-controls #depth-control-help').count(),0);
  assert.equal(await page.locator('#depth-drain').isDisabled(),true);
  assert.doesNotMatch(await page.locator('#depth-lab').innerText(),/公分|\bcm\b|距槽前\d/);
  assert.equal(await page.locator('#depth-output').count(),0);
  assert.equal(await page.locator('#depth-scene .extension').count(),0);
  assert.equal(+await page.locator('#depth-observer').getAttribute('data-coin-pixels'),0);
  assert.equal(await page.locator('#depth-input').inputValue(),'0');
  assert.equal(await page.locator('#depth-eye').getAttribute('aria-valuenow'),'300');
  assert.equal(await page.locator('#depth-scene .depth-normal').count(),0);
  if(capture)await page.locator('#depth-lab').screenshot({path:path.join(capture,'initial-empty.png')});
  assert.match(await page.locator('.depth-takeaway').innerText(),/硬幣沒有移動/);
  const before=await page.locator('#depth-observer').evaluate(e=>e.toDataURL());await page.waitForTimeout(150);
  assert.equal(await page.locator('#depth-observer').evaluate(e=>e.toDataURL()),before);
 });
 await t.test('one press continuously fills or drains to its endpoint with synchronized views',async()=>{
  await page.locator('#depth-fill').click();await page.waitForTimeout(150);assert.equal(await page.locator('#depth-lab').getAttribute('data-state'),'filling');
  const depth=+await page.locator('#depth-input').inputValue();assert.ok(depth>0&&depth<100);
  await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.waitForTimeout(180);assert.equal(await page.locator('#depth-lab').getAttribute('data-state'),'paused');
  const stopped=await page.locator('#depth-input').inputValue();await page.waitForTimeout(200);assert.equal(await page.locator('#depth-input').inputValue(),stopped);
  await page.locator('#depth-lab').scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>+document.querySelector('#depth-observer').dataset.depth>=30&&document.querySelector('#depth-lab').dataset.state==='filling');
  if(capture)await page.locator('#depth-lab').screenshot({path:path.join(capture,'water-filling.png')});
  await page.waitForFunction(()=>+document.querySelector('#depth-observer').dataset.depth>=65&&document.querySelector('#depth-lab').dataset.state==='filling');
  await page.waitForFunction(()=>document.querySelector('#depth-observer').dataset.depth==='100'&&document.querySelector('#depth-lab').dataset.state==='ready');
  assert.equal(await page.locator('#depth-fill').isDisabled(),true);
  assert.equal(await page.locator('#depth-eye').getAttribute('aria-valuenow'),'300');assert.ok(+await page.locator('#depth-observer').getAttribute('data-coin-pixels')>50);
  if(capture)await page.locator('#depth-lab').screenshot({path:path.join(capture,'filled-default-view.png')});
  await page.locator('#depth-drain').click();await page.waitForTimeout(150);assert.equal(await page.locator('#depth-lab').getAttribute('data-state'),'draining');
  assert.ok(+await page.locator('#depth-input').inputValue()<100&&+await page.locator('#depth-input').inputValue()>0);
  await page.waitForFunction(()=>+document.querySelector('#depth-observer').dataset.depth<=65&&+document.querySelector('#depth-observer').dataset.depth>0&&document.querySelector('#depth-lab').dataset.state==='draining');
  if(capture)await page.locator('#depth-lab').screenshot({path:path.join(capture,'water-draining.png')});
  await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.waitForTimeout(180);assert.equal(await page.locator('#depth-lab').getAttribute('data-state'),'paused');
  const paused=await page.locator('#depth-input').inputValue();await page.waitForTimeout(180);assert.equal(await page.locator('#depth-input').inputValue(),paused);
  await page.locator('#depth-lab').scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>document.querySelector('#depth-observer').dataset.depth==='0'&&document.querySelector('#depth-lab').dataset.state==='ready');
  assert.equal(await page.locator('#depth-drain').isDisabled(),true);assert.equal(await page.locator('#depth-fill').isEnabled(),true);
  assert.equal(await page.locator('#depth-eye').getAttribute('aria-valuenow'),'300');assert.equal(+await page.locator('#depth-observer').getAttribute('data-coin-pixels'),0);
 });
 await t.test('same-direction presses continue, opposite presses reverse and direct manipulation takes over',async()=>{
  await set(0,250);await page.locator('#show-rays').uncheck();
  await page.locator('#depth-fill').click();
  await page.waitForFunction(()=>+document.querySelector('#depth-input').value>=25);
  const beforeRepeat=+await page.locator('#depth-input').inputValue();await page.locator('#depth-fill').click();
  assert.ok(+await page.locator('#depth-input').inputValue()>=beforeRepeat,'repeated fill does not restart');
  assert.equal(await page.locator('#depth-eye').getAttribute('aria-valuenow'),'250');assert.equal(await page.locator('#show-rays').isChecked(),false);
  await page.waitForFunction(()=>+document.querySelector('#depth-input').value>=40&&document.querySelector('#depth-lab').dataset.state==='filling');
  const before=await page.evaluate(()=>{const depth=+document.querySelector('#depth-input').value;document.querySelector('#depth-drain').click();return depth;});
  assert.equal(await page.locator('#depth-input').inputValue(),String(before));assert.equal(await page.locator('#depth-lab').getAttribute('data-state'),'draining');
  await page.waitForFunction(()=>document.querySelector('#depth-lab').dataset.state==='ready'&&document.querySelector('#depth-observer').dataset.depth==='0');
  assert.equal(await page.locator('#depth-eye').getAttribute('aria-valuenow'),'250');assert.equal(await page.locator('#show-rays').isChecked(),false);
  await set(50,250);await page.locator('#depth-drain').click();await page.waitForTimeout(150);
  const handle=await page.locator('#depth-input').evaluate(e=>{const b=e.getBoundingClientRect();return{x:b.x+b.width/2,y:b.y+22+(b.height-44)*(1-Number(e.value)/100)};});
  await page.mouse.move(handle.x,handle.y);await page.mouse.down();
  assert.equal(await page.locator('#depth-lab').getAttribute('data-state'),'ready');const frozen=await page.locator('#depth-input').inputValue();
  await page.waitForTimeout(180);assert.equal(await page.locator('#depth-input').inputValue(),frozen);await page.mouse.up();
  await page.locator('#show-rays').check();await set(0,300);
 });
 await t.test('water can be dragged vertically by its handle or surface, with keyboard access and no initial jump',async()=>{
  await set(0,300);const input=page.locator('#depth-input');await input.scrollIntoViewIfNeeded();let b=await input.boundingBox();
  assert.ok(b.height>b.width&&b.width>=44);
  await page.mouse.move(b.x+b.width/2,b.y+b.height-22);await page.mouse.down();assert.equal(await input.inputValue(),'0');
  await page.mouse.move(b.x+b.width/2,b.y+22,{steps:6});await page.mouse.up();assert.equal(await input.inputValue(),'100');
  await input.focus();await page.keyboard.press('ArrowDown');assert.equal(await input.inputValue(),'99');await page.keyboard.press('ArrowUp');assert.equal(await input.inputValue(),'100');
  await page.keyboard.press('Home');assert.equal(await input.inputValue(),'0');await page.keyboard.press('End');assert.equal(await input.inputValue(),'100');
  await set(50,300);await page.locator('#depth-scene').scrollIntoViewIfNeeded();
  const point=await page.locator('#depth-scene').evaluate(e=>{const p=new DOMPoint(100,430-50*1.85).matrixTransform(e.getScreenCTM());return{x:p.x,y:p.y};});
  await page.mouse.move(point.x,point.y);await page.mouse.down();assert.equal(await input.inputValue(),'50');
  await page.mouse.move(point.x,point.y-22,{steps:4});await page.mouse.up();assert.ok(+await input.inputValue()>50);
  assert.equal(await page.locator('#depth-eye').getAttribute('aria-valuenow'),'300');
  await page.waitForFunction(()=>document.querySelector('#depth-input').value===document.querySelector('#depth-observer').dataset.depth);
  await set(0,300);
 });
 await t.test('water and observer changes really repaint the coin, with the physical coin remaining fixed',async()=>{
  const fixed=await page.locator('#depth-scene .depth-coin').getAttribute('transform');
  await set(40,250);const first=await page.locator('#depth-observer').evaluate(e=>({image:e.toDataURL(),bounds:e.dataset.coinBounds}));
  const virtual=await page.locator('#depth-scene .depth-apparent').getAttribute('cy');
  await set(100,250);const second=await page.locator('#depth-observer').evaluate(e=>({image:e.toDataURL(),bounds:e.dataset.coinBounds}));
  assert.notEqual(first.image,second.image);assert.notEqual(first.bounds,second.bounds);
  assert.notEqual(await page.locator('#depth-scene .depth-apparent').getAttribute('cy'),virtual);
  assert.equal(await page.locator('#depth-scene .depth-coin').getAttribute('transform'),fixed);
  await set(70,210);const near=await page.locator('#depth-observer').evaluate(e=>e.toDataURL());
  await set(70,280);assert.notEqual(await page.locator('#depth-observer').evaluate(e=>e.toDataURL()),near);
  const distances=[];let previous=Infinity;
  for(const depth of [0,100])for(const eye of [210,300,340]){
   await set(depth,eye);
   const bounds=JSON.parse(await page.locator('#depth-observer').getAttribute('data-coin-bounds'));
   if(depth===100){assert.ok(bounds&&bounds.width<previous,`rendered coin grows when moving away to ${eye}`);previous=bounds.width;}
   distances.push({depth,eye,bounds});
   if(capture)await page.locator('#depth-lab').screenshot({path:path.join(capture,`distance-${depth}-${eye}.png`)});
  }
  if(capture)await fs.writeFile(path.join(capture,'distance-comparison.json'),JSON.stringify(distances,null,2));
 });
 await t.test('occlusion changes actual rendered pixels, and adding water at the same viewpoint reveals the coin',async()=>{
  await set(40,300);assert.equal(+await page.locator('#depth-observer').getAttribute('data-coin-pixels'),0);
  assert.match(await page.locator('#depth-visibility').innerText(),/遮住/);assert.equal(await page.locator('#depth-scene .depth-apparent').count(),0);
  if(capture)await page.locator('#depth-lab').screenshot({path:path.join(capture,'occluded.png')});
  await set(100,300);assert.ok(+await page.locator('#depth-observer').getAttribute('data-coin-pixels')>50);
  assert.match(await page.locator('#depth-visibility').innerText(),/可以看見/);
  if(capture)await page.locator('#depth-lab').screenshot({path:path.join(capture,'water-reveals-coin.png')});
  await set(70,300);
  const construction=await page.locator('#depth-scene').evaluate(e=>{
    const values=s=>[...s.matchAll(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi)].map(m=>Number(m[0]));
    return{actual:values(e.querySelector('.depth-core').getAttribute('d')),extension:values(e.querySelector('.extension').getAttribute('d'))};
  });
  const a=construction.actual,b=construction.extension;
  assert.ok(Math.abs(a[2]-b[0])<1e-6&&Math.abs(a[3]-b[1])<1e-6);
  assert.ok(Math.abs((a[4]-a[2])*(b[3]-b[1])-(a[5]-a[3])*(b[2]-b[0]))<1e-6,'partial coin extends the same visible ray');
  if(capture)await page.locator('#depth-lab').screenshot({path:path.join(capture,'partial-coin.png')});
 });
 await t.test('hiding the construction preserves the eye view and the physical scene',async()=>{
  const before=await page.locator('#depth-observer').evaluate(e=>e.toDataURL());
  await page.locator('#show-rays').uncheck();assert.equal(await page.locator('#depth-scene .extension').count(),0);
  assert.equal(await page.locator('#depth-scene .depth-ray').count(),0);
  assert.equal(await page.locator('#depth-observer').evaluate(e=>e.toDataURL()),before);
  await page.locator('#show-rays').check();assert.equal(await page.locator('#depth-scene .extension').count(),2);
 });
 await t.test('keyboard and pointer change the same viewing position without losing focus',async()=>{
  await set(70,250);const eye=page.locator('.depth-eye');await eye.focus();await page.keyboard.press('ArrowRight');assert.equal(await page.locator('#depth-eye').getAttribute('aria-valuenow'),'252');
  assert.equal(await eye.evaluate(e=>document.activeElement===e),true);
  await page.keyboard.press('Home');assert.equal(await page.locator('#depth-eye').getAttribute('aria-valuenow'),'210');
  await page.keyboard.press('End');assert.equal(await page.locator('#depth-eye').getAttribute('aria-valuenow'),'340');
  await set(70,250);await eye.scrollIntoViewIfNeeded();const b=await eye.boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2+35,b.y+b.height/2,{steps:6});await page.mouse.up();assert.ok(+await page.locator('#depth-eye').getAttribute('aria-valuenow')>250);
  await set(0,300);
 });
 await t.test('replay traces coin to eye before revealing auxiliary lines, pauses offscreen, and can restart',async()=>{
  await set(100,300);await page.locator('#depth-lab').scrollIntoViewIfNeeded();await page.waitForTimeout(150);await page.locator('#depth-replay').click();
  await page.waitForTimeout(120);assert.equal(await page.locator('#depth-lab').getAttribute('data-state'),'playing');assert.equal(await page.locator('#depth-scene .extension').count(),0);
  await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.waitForTimeout(150);
  assert.equal(await page.locator('#depth-lab').getAttribute('data-state'),'paused');
  const stopped=await page.locator('#depth-scene .depth-core').first().getAttribute('d');await page.waitForTimeout(180);assert.equal(await page.locator('#depth-scene .depth-core').first().getAttribute('d'),stopped);
  await page.locator('#depth-lab').scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('#depth-lab').dataset.state==='ready');
  assert.equal(await page.locator('#depth-scene .extension').count(),2);
  await page.locator('#depth-replay').click();await page.waitForTimeout(100);await page.locator('#depth-input').fill('80');assert.equal(await page.locator('#depth-lab').getAttribute('data-state'),'ready');
 });
 await t.test('desktop and phone keep panels, labels and controls readable without horizontal page scrolling',async()=>{
  for(const [width,height] of [[1536,1000],[1440,900],[1366,768],[1280,650],[1024,768],[820,900],[760,844],[390,844],[320,740]]){
   await page.setViewportSize({width,height});await set(70,250);await page.locator('#depth-lab').scrollIntoViewIfNeeded();await page.waitForTimeout(180);
   const m=await page.locator('#depth-lab').evaluate(el=>{
    const views=[...el.querySelectorAll('figure')].map(e=>e.getBoundingClientRect().toJSON());
    const texts=[...el.querySelectorAll('#depth-scene .depth-annotations text')].map(e=>({font:parseFloat(getComputedStyle(e).fontSize)*e.getScreenCTM().a,box:e.getBoundingClientRect().toJSON()}));
    const svg=el.querySelector('svg').getBoundingClientRect();
    return{help:el.querySelector('#depth-control-help').getBoundingClientRect().toJSON(),overflow:document.documentElement.scrollWidth>innerWidth,views,texts,svg:svg.toJSON(),eyeHit:el.querySelector('.depth-eye-hit').getBoundingClientRect().toJSON(),water:el.querySelector('#depth-input').getBoundingClientRect().toJSON(),rail:el.querySelector('.depth-eye-rail').getBoundingClientRect().toJSON(),buttons:[...el.querySelectorAll('button')].map(e=>({height:e.getBoundingClientRect().height,clipped:e.scrollWidth>e.clientWidth+1})),controls:el.querySelector('.depth-controls').getBoundingClientRect().toJSON()};
   });
   assert.equal(m.overflow,false,`${width} page overflow`);
   assert.ok(m.help.left>=m.views[0].left&&m.help.right<=m.views[0].right&&m.help.top>=m.svg.bottom&&m.help.bottom<=m.views[0].bottom,`${width} hint belongs below left diagram`);
   assert.ok(m.texts.every(t=>t.font>=13.4&&t.box.left>=m.svg.left-1&&t.box.right<=m.svg.right+1),`${width} diagram labels`);
   assert.ok(m.buttons.every(b=>b.height>=44&&!b.clipped),`${width} buttons`);
   assert.ok(m.eyeHit.width>=44&&m.eyeHit.height>=44,`${width} eye touch target`);
   assert.ok(m.controls.left>=0&&m.controls.right<=width+1);
   assert.ok(m.water.height>m.water.width&&m.water.width>=44);
   assert.ok(m.water.left>=m.svg.left-1&&m.water.right<=m.svg.right+1);
   assert.ok(m.rail.left>=m.svg.left-1&&m.rail.right<=m.svg.right+1);
   if(width>=1280)assert.ok(Math.abs(m.views[0].top-m.views[1].top)<1);
   if(width<=390)assert.ok(m.views[1].top>m.views[0].bottom);
   results.push({width,height,...m});
   if(capture&&[1536,1366,390,320].includes(width))await page.locator('#depth-lab').screenshot({path:path.join(capture,`${width}-dual-views.png`)});
  }
  if(capture)await fs.writeFile(path.join(capture,'measurements.json'),JSON.stringify(results,null,2));
 });
 await t.test('native mobile touch moves the viewpoint and updates the eye view',async()=>{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const p=await context.newPage();await ready(p);
  const eye=p.locator('.depth-eye');await eye.scrollIntoViewIfNeeded();const b=await eye.boundingBox(),x=b.x+b.width/2,y=b.y+b.height/2;
  const cdp=await context.newCDPSession(p);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+32,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.ok(+await p.locator('#depth-eye').getAttribute('aria-valuenow')>300);await p.waitForFunction(()=>document.querySelector('#depth-eye').getAttribute('aria-valuenow')===document.querySelector('#depth-observer').dataset.eyeX);const water=p.locator('#depth-input');await water.scrollIntoViewIfNeeded();const wb=await water.boundingBox(),wx=wb.x+wb.width/2;
  const scroll=await p.evaluate(()=>scrollY);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:wx,y:wb.y+wb.height-22}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:wx,y:wb.y+22}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.equal(await water.inputValue(),'100');assert.ok(Math.abs(await p.evaluate(()=>scrollY)-scroll)<3);
  await p.waitForFunction(()=>document.querySelector('#depth-observer').dataset.depth==='100');
  await p.locator('#depth-drain').tap();await p.waitForFunction(()=>document.querySelector('#depth-lab').dataset.state==='ready'&&document.querySelector('#depth-observer').dataset.depth==='0');
  await p.locator('#depth-fill').tap();await p.waitForFunction(()=>document.querySelector('#depth-lab').dataset.state==='ready'&&document.querySelector('#depth-observer').dataset.depth==='100');
  const view=p.locator('#depth-observer');await view.scrollIntoViewIfNeeded();const vb=await view.boundingBox(),sx=vb.x+vb.width/2,sy=vb.y+vb.height*.7;
  const before=await p.evaluate(()=>scrollY);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:sx,y:sy}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:sx,y:sy-70}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(200);
  assert.ok(await p.evaluate(()=>scrollY)>before+20,'page still scrolls outside the handles');
  await context.close();
 });
 await t.test('reduced motion reaches the requested endpoint in either direction',async()=>{
  await page.emulateMedia({reducedMotion:'reduce'});await set(0,300);
  await page.locator('#depth-fill').click();await page.waitForFunction(()=>document.querySelector('#depth-observer').dataset.depth==='100');
  assert.equal(await page.locator('#depth-lab').getAttribute('data-state'),'ready');assert.equal(await page.locator('#depth-scene .extension').count(),2);
  await page.locator('#depth-drain').click();await page.waitForFunction(()=>document.querySelector('#depth-observer').dataset.depth==='0');
  assert.equal(await page.locator('#depth-drain').isDisabled(),true);
  for(const [button,start,target] of [['#depth-drain',60,0],['#depth-fill',40,100]]){
   await page.emulateMedia({reducedMotion:'no-preference'});await set(start,300);await page.locator(button).click();await page.waitForTimeout(150);await page.emulateMedia({reducedMotion:'reduce'});
   await page.waitForFunction(n=>document.querySelector('#depth-observer').dataset.depth===String(n)&&document.querySelector('#depth-lab').dataset.state==='ready',target);
  }
 });
 await t.test('texture failure has a usable fallback and retry restores materials without resetting controls',async()=>{
  const p=await browser.newPage();await p.route('**/oblique-entry-water.png',r=>r.abort());await p.goto(base);await p.waitForFunction(()=>document.querySelector('#depth-lab')?.dataset.texture==='fallback');
  assert.equal(+await p.locator('#depth-observer').getAttribute('data-coin-pixels'),0);
  await p.locator('#depth-input').fill('80');await p.unroute('**/oblique-entry-water.png');await p.getByRole('button',{name:'重新載入材質'}).click();await p.waitForFunction(()=>document.querySelector('#depth-lab').dataset.texture==='ready');
  assert.equal(await p.locator('#depth-input').inputValue(),'80');await p.close();
 });
 await t.test('reading remains available with JavaScript disabled',async()=>{
  const context=await browser.newContext({javaScriptEnabled:false});const p=await context.newPage();await p.goto(base);
  assert.match(await p.locator('.depth-takeaway').innerText(),/硬幣沒有移動/);assert.match(await p.locator('#depth-lab noscript').innerText(),/看起來較淺/);await context.close();
 });
 assert.deepEqual(errors,[]);
});
