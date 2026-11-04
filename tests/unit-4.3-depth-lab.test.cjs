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
 const set=async(depth,eye)=>{await page.locator('#depth-input').fill(String(depth));await page.locator('#depth-eye').fill(String(eye));await page.waitForFunction(({depth,eye})=>{const c=document.querySelector('#depth-observer');return c.dataset.depth===String(depth)&&c.dataset.eyeX===String(eye);},{depth,eye});};
 const capture=process.env.DEPTH_CAPTURE_DIR;if(capture)await fs.mkdir(capture,{recursive:true});
 const results=[];
 await t.test('the default is dry and physically occluded, with readable teaching and no automatic motion',async()=>{
  assert.equal(await page.locator('#depth-lab').getAttribute('data-state'),'ready');
  assert.equal(await page.locator('#depth-lab figure').count(),2);
  assert.equal(await page.locator('#depth-lab form').count(),0);
  assert.equal(await page.locator('#depth-lab button').count(),3);
  assert.equal(await page.locator('#depth-scene .extension').count(),0);
  assert.equal(+await page.locator('#depth-observer').getAttribute('data-coin-pixels'),0);
  assert.equal(await page.locator('#depth-input').inputValue(),'0');
  assert.equal(await page.locator('#depth-eye').inputValue(),'300');
  assert.equal(await page.locator('#depth-scene .depth-normal').count(),0);
  if(capture)await page.locator('#depth-lab').screenshot({path:path.join(capture,'initial-empty.png')});
  assert.match(await page.locator('.depth-takeaway').innerText(),/硬幣沒有移動/);
  const before=await page.locator('#depth-observer').evaluate(e=>e.toDataURL());await page.waitForTimeout(150);
  assert.equal(await page.locator('#depth-observer').evaluate(e=>e.toDataURL()),before);
 });
 await t.test('adding water reveals the real rendered coin without moving the observer and reset restores the dry start',async()=>{
  await page.locator('#depth-fill').click();await page.waitForTimeout(300);assert.equal(await page.locator('#depth-lab').getAttribute('data-state'),'filling');
  const depth=+await page.locator('#depth-input').inputValue();assert.ok(depth>0&&depth<100);
  await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.waitForTimeout(180);assert.equal(await page.locator('#depth-lab').getAttribute('data-state'),'paused');
  const stopped=await page.locator('#depth-input').inputValue();await page.waitForTimeout(200);assert.equal(await page.locator('#depth-input').inputValue(),stopped);
  await page.locator('#depth-lab').scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('#depth-observer').dataset.depth==='100'&&document.querySelector('#depth-lab').dataset.state==='ready');
  assert.equal(await page.locator('#depth-eye').inputValue(),'300');assert.ok(+await page.locator('#depth-observer').getAttribute('data-coin-pixels')>50);
  if(capture)await page.locator('#depth-lab').screenshot({path:path.join(capture,'filled-default-view.png')});
  await page.locator('#depth-reset').click();await page.waitForFunction(()=>document.querySelector('#depth-observer').dataset.depth==='0');assert.equal(+await page.locator('#depth-observer').getAttribute('data-coin-pixels'),0);
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
  await set(70,250);const eye=page.locator('.depth-eye');await eye.focus();await page.keyboard.press('ArrowRight');assert.equal(await page.locator('#depth-eye').inputValue(),'252');
  assert.equal(await eye.evaluate(e=>document.activeElement===e),true);
  await page.keyboard.press('Home');assert.equal(await page.locator('#depth-eye').inputValue(),'210');
  await page.keyboard.press('End');assert.equal(await page.locator('#depth-eye').inputValue(),'340');
  await set(70,250);await eye.scrollIntoViewIfNeeded();const b=await eye.boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2+35,b.y+b.height/2,{steps:6});await page.mouse.up();assert.ok(+await page.locator('#depth-eye').inputValue()>250);
  await page.locator('#depth-reset').click();assert.equal(await page.locator('#depth-eye').inputValue(),'300');assert.equal(await page.locator('#depth-input').inputValue(),'0');
 });
 await t.test('replay traces coin to eye before revealing auxiliary lines, pauses offscreen, and can restart',async()=>{
  await set(100,300);await page.locator('#depth-lab').scrollIntoViewIfNeeded();await page.waitForTimeout(150);await page.locator('#depth-replay').click();
  await page.waitForTimeout(120);assert.equal(await page.locator('#depth-lab').getAttribute('data-state'),'playing');assert.equal(await page.locator('#depth-scene .extension').count(),0);
  await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.waitForTimeout(150);
  assert.equal(await page.locator('#depth-lab').getAttribute('data-state'),'paused');
  const stopped=await page.locator('#depth-scene .depth-core').first().getAttribute('d');await page.waitForTimeout(180);assert.equal(await page.locator('#depth-scene .depth-core').first().getAttribute('d'),stopped);
  await page.locator('#depth-lab').scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('#depth-lab').dataset.state==='ready');
  assert.equal(await page.locator('#depth-scene .extension').count(),2);
  await page.locator('#depth-replay').click();await page.waitForTimeout(100);await page.locator('#depth-reset').click();assert.equal(await page.locator('#depth-lab').getAttribute('data-state'),'ready');
 });
 await t.test('desktop and phone keep panels, labels and controls readable without horizontal page scrolling',async()=>{
  for(const [width,height] of [[1536,1000],[1440,900],[1366,768],[1280,650],[1024,768],[820,900],[760,844],[390,844],[320,740]]){
   await page.setViewportSize({width,height});await set(70,250);await page.locator('#depth-lab').scrollIntoViewIfNeeded();await page.waitForTimeout(180);
   const m=await page.locator('#depth-lab').evaluate(el=>{
    const views=[...el.querySelectorAll('figure')].map(e=>e.getBoundingClientRect().toJSON());
    const texts=[...el.querySelectorAll('#depth-scene .depth-annotations text')].map(e=>({font:parseFloat(getComputedStyle(e).fontSize)*e.getScreenCTM().a,box:e.getBoundingClientRect().toJSON()}));
    const svg=el.querySelector('svg').getBoundingClientRect();
    return{overflow:document.documentElement.scrollWidth>innerWidth,views,texts,svg:svg.toJSON(),eyeHit:el.querySelector('.depth-eye-hit').getBoundingClientRect().toJSON(),buttons:[...el.querySelectorAll('button')].map(e=>({height:e.getBoundingClientRect().height,clipped:e.scrollWidth>e.clientWidth+1})),controls:el.querySelector('.depth-controls').getBoundingClientRect().toJSON()};
   });
   assert.equal(m.overflow,false,`${width} page overflow`);
   assert.ok(m.texts.every(t=>t.font>=13.4&&t.box.left>=m.svg.left-1&&t.box.right<=m.svg.right+1),`${width} diagram labels`);
   assert.ok(m.buttons.every(b=>b.height>=44&&!b.clipped),`${width} buttons`);
   assert.ok(m.eyeHit.width>=44&&m.eyeHit.height>=44,`${width} eye touch target`);
   assert.ok(m.controls.left>=0&&m.controls.right<=width+1);
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
  assert.ok(+await p.locator('#depth-eye').inputValue()>300);await p.waitForFunction(()=>document.querySelector('#depth-eye').value===document.querySelector('#depth-observer').dataset.eyeX);await context.close();
 });
 await t.test('reduced motion retains a complete static example after replay',async()=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#depth-reset').click();await page.locator('#depth-fill').click();
  await page.waitForFunction(()=>document.querySelector('#depth-observer').dataset.depth==='100');
  assert.equal(await page.locator('#depth-lab').getAttribute('data-state'),'ready');assert.equal(await page.locator('#depth-scene .extension').count(),2);
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
