const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const{chromium}=require('playwright'),{spawn}=require('node:child_process');
async function setup(t,options={}){
 let base=process.env.LESSON_BASE_URL;
 if(!base){const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:['ignore','pipe','ignore']});t.after(()=>server.kill());const port=await new Promise((res,rej)=>{let out='';server.stdout.on('data',b=>{out+=b;const m=out.match(/port (\d+)/);if(m)res(m[1]);});server.on('error',rej);});base=`http://127.0.0.1:${port}/units/4/parts/4.3/`;}
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox'],...(process.env.LESSON_USE_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{})});t.after(()=>browser.close());
 const p=await browser.newPage({viewport:{width:1366,height:768},...options}),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`${r.status()} ${r.url()}`);});return{p,browser,base,errors};
}
const scroll=async(p,sel)=>{await p.locator(sel).evaluate(e=>e.scrollIntoView({block:'start',behavior:'instant'}));await p.waitForTimeout(100);};
const capture=async(p,sel,name)=>{if(process.env.ELEVEN_CAPTURE_DIR){await fs.mkdir(process.env.ELEVEN_CAPTURE_DIR,{recursive:true});await p.locator(sel).screenshot({path:path.join(process.env.ELEVEN_CAPTURE_DIR,name+'.png')});}};

test('4.3 eleven approved choices: controls, evidence, concise copy and desktop presentation',{timeout:240000},async t=>{
 const{p,base,errors}=await setup(t,{reducedMotion:'no-preference'});await p.clock.install();await p.goto(base);await p.waitForFunction(()=>document.querySelector('#return-lab').dataset.state==='ready');await p.clock.pauseAt(new Date(await p.evaluate(()=>Date.now())+100));
 await t.test('2: explicit mouse/keyboard/lamp playback reveals the apparatus and controls before advancing',async()=>{
  for(const id of['normal','oblique','exit']){
   const stage=id==='normal'?'#normal-viewport':`#${id}-lab .integrated-stage`,controls=id==='normal'?'.normal-console':`#${id}-lab .integrated-controls`;
   await p.locator(`#${id}-start`).evaluate(e=>{scrollTo({top:scrollY+e.getBoundingClientRect().top+20,behavior:'instant'});});await p.waitForTimeout(150);
   assert.ok((await p.locator(stage).boundingBox()).y+(await p.locator(stage).boundingBox()).height<0);
   const b=await p.locator(`#${id}-start`).boundingBox();await p.mouse.click(b.x+b.width/2,Math.max(2,b.y+b.height-8));
   const a=await p.locator(stage).boundingBox(),deck=await p.locator(controls).boundingBox();assert.ok(a.y>=7,`${id} plot not revealed`);assert.ok(deck.y+deck.height<=769,`${id} controls clipped`);assert.equal(await p.locator(`#${id}-lab`).getAttribute('data-state'),'running');
   await p.clock.runFor(100);assert.ok(Number(await p.locator(`#${id}-lab`).getAttribute('data-elapsed-ms'))>0);
   if(id==='normal'){await p.locator('#normal-pause').click();}else{await p.locator(`#${id}-reset`).click();await p.locator(`#${id}-start`).focus();await p.keyboard.press('Enter');await p.clock.runFor(4000);}
  }
 });
 await t.test('4: all three carts auto resume after viewport/tab interruption; explicit closing stays stopped on reopen',async()=>{
  for(const id of['normal','oblique','exit']){
   const details=p.locator(`#${id}-explanation`),cart=p.locator(`#${id}-cart`),scene=`#${id}-explanation .${id==='normal'?'normal':'oblique'}-cart-scene`;
   await details.locator('summary').click();await scroll(p,scene);await p.clock.runFor(350);assert.equal(await cart.getAttribute('data-state'),'running');
   await scroll(p,'#s1');await p.waitForFunction(id=>document.querySelector(`#${id}-cart`).dataset.state==='paused',id);assert.equal(await cart.getAttribute('data-pause-reason'),'automatic');const saved=await cart.getAttribute('data-elapsed-ms');await p.clock.runFor(500);assert.equal(await cart.getAttribute('data-elapsed-ms'),saved);
   await scroll(p,scene);await p.waitForFunction(id=>document.querySelector(`#${id}-cart`).dataset.state==='running',id);await p.clock.runFor(100);assert.ok(Number(await cart.getAttribute('data-elapsed-ms'))>Number(saved));
   await p.evaluate(()=>{Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new Event('visibilitychange'));});assert.equal(await cart.getAttribute('data-state'),'paused');await p.clock.runFor(500);await p.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});await p.clock.runFor(100);assert.equal(await cart.getAttribute('data-state'),'running');
   await details.locator('summary').click();await p.clock.runFor(50);assert.equal(await cart.getAttribute('data-pause-reason'),'closed');const closed=await cart.getAttribute('data-elapsed-ms');await details.locator('summary').click();await scroll(p,scene);await p.clock.runFor(500);assert.equal(await cart.getAttribute('data-state'),'paused');assert.equal(await cart.getAttribute('data-elapsed-ms'),closed);
   await p.locator(`#${id}-cart-play`).click();await p.clock.runFor(10000);assert.equal(await cart.getAttribute('data-state'),'complete');await capture(p,`#${id}-explanation`,`${id}-explanation`);await details.locator('summary').click();
  }
 });
 await t.test('6-11: preconditions, conditional transmission, colour key, fixed analogy and depth narrative use short visible copy',async()=>{
  assert.match(await p.locator('#rank-comparison-condition').textContent(),/同一束光斜射.*介面互相平行/);assert.doesNotMatch(await p.locator('#rank-lab').innerText(),/夾角越大/);
  assert.match(await p.locator('#exit-transmission-condition').textContent(),/斜射且發生折射時/);
  await scroll(p,'#exit-lab');await p.locator('#exit-angle').fill('0');await p.locator('#exit-start').click();await p.clock.runFor(4000);assert.equal(await p.locator('#exit-out-value').textContent(),'0.0°');assert.match(await p.locator('#exit-finding').textContent(),/方向不偏折/);assert.equal(await p.locator('#exit-transmission-condition').isVisible(),false);
  assert.match(await p.locator('.return-direction-note').textContent(),/顏色僅用來區分前進方向/);assert.equal(await p.locator('.cart-setting-note').count(),2);for(const id of ['oblique','exit'])assert.match(await p.locator(`#${id}-explanation .cart-setting-note`).textContent(),/固定斜射類比.*上圖設定獨立/);
  for(const id of[2,3,4]){const text=await p.locator(`#s${id}`).textContent();assert.doesNotMatch(text,/波前/);assert.match(text,/小車為類比，不代表光受到摩擦/);}
  assert.match(await p.locator('#s6 .dialogue').first().textContent(),/池裡的硬幣看起來離水面很近/);assert.match(await p.locator('.depth-takeaway').textContent(),/空槽.*直線.*槽壁擋住/);
  assert.equal(await p.locator('#depth-input').inputValue(),'0');assert.equal(await p.locator('.lesson-card').count(),6);assert.equal(await p.locator('form').count(),1);
 });
 await t.test('3 and 5: no-op selections/keys/drop retain grades; replay conceals then restores grades unless order changes',async()=>{
  await scroll(p,'#rank-lab');await p.locator('#rank-play').click();await p.clock.runFor(5000);const correct=await p.locator('.rank-angle-value').evaluateAll(es=>es.map(e=>({id:Number(e.dataset.layer),angle:parseFloat(e.textContent)})).sort((a,b)=>b.angle-a.angle).map(x=>x.id));
  for(const [slot,id]of correct.entries()){await p.locator(`[data-rank-medium="${id}"]`).click();await p.locator(`[data-rank-slot="${slot}"]`).click();}await p.locator('#rank-check').click();const text=await p.locator('#quiz-result').textContent();assert.equal(await p.locator('#quiz-result').getAttribute('data-result'),'correct');
  await p.locator('[data-rank-slot="0"]').click();assert.equal(await p.locator('[data-rank-slot="0"]').getAttribute('data-result'),'correct');await p.locator('[data-rank-slot="0"]').click();await p.locator('[data-rank-slot="0"]').press('ArrowLeft');assert.equal(await p.locator('#quiz-result').textContent(),text);assert.equal(await p.locator('[data-rank-slot="0"]').getAttribute('data-result'),'correct');
  const b=await p.locator('[data-rank-slot="0"]').boundingBox();await p.mouse.move(b.x+b.width/2,b.y+b.height/2);await p.mouse.down();await p.mouse.move(b.x+b.width/2+12,b.y+b.height/2,{steps:3});await p.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:3});await p.mouse.up();assert.equal(await p.locator('#quiz-result').textContent(),text);
  await p.locator('#rank-play').click();await p.clock.runFor(200);assert.equal(await p.locator('#quiz-result').isVisible(),false);assert.equal(await p.locator('.rank-slot[data-result]').count(),0);assert.equal(await p.locator('.rank-angle-value[visibility=visible]').count(),0);await p.clock.runFor(5000);assert.equal(await p.locator('#quiz-result').isVisible(),true);assert.equal(await p.locator('#quiz-result').textContent(),text);assert.equal(await p.locator('.rank-slot[data-result=correct]').count(),4);
  await p.locator('[data-rank-slot="0"]').press('ArrowRight');await p.locator('#rank-check').click();assert.equal(await p.locator('#quiz-result').getAttribute('data-result'),'retry');const wrong=await p.locator('#quiz-result').textContent();assert.equal(wrong.match(/\d+\.\d°/g).length,2);await p.locator('[data-rank-slot="3"]').press('ArrowRight');assert.equal(await p.locator('#quiz-result').textContent(),wrong);
  await p.locator('#rank-play').click();await p.clock.runFor(100);await p.locator('[data-rank-slot="0"]').press('ArrowRight');assert.equal(await p.locator('#quiz-result').textContent(),'');await p.clock.runFor(5000);assert.equal(await p.locator('#quiz-result').textContent(),'');assert.equal(await p.locator('.rank-slot[data-result]').count(),0);
  await p.locator('#rank-check').click();await capture(p,'#rank-lab','quiz-graded');await p.locator('#rank-new').click();assert.equal(await p.locator('#quiz-result').textContent(),'');assert.equal(await p.locator('[data-rank-slot][data-filled=true]').count(),0);
 });
 await t.test('desktop and laptop preserve visible controls, short notes and readable evidence at four sizes',async()=>{
  for(const [width,height]of [[1440,900],[1366,768],[1280,720],[1024,768]]){
   await p.setViewportSize({width,height});await p.clock.runFor(100);
   for(const id of[2,3,4,5,6,7]){await scroll(p,'#s'+id);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);const clipped=await p.locator('#s'+id).evaluate(e=>[...e.querySelectorAll('button,.return-direction-note,.cart-setting-note,#rank-comparison-condition')].filter(n=>n.clientWidth&&n.scrollWidth>n.clientWidth+2).map(n=>n.id||n.className));assert.deepEqual(clipped,[],`${width}/s${id}`);}
   await scroll(p,'#return-viewport');await capture(p,'#return-lab',`${width}-return`);await scroll(p,'#depth-lab');await capture(p,'#depth-lab',`${width}-depth`);await scroll(p,'#rank-lab');await capture(p,'#rank-lab',`${width}-quiz`);
  }
 });
 assert.deepEqual(errors,[]);
});

test('1: sixth-section edge visibility is physically shared through preview, detail and fallback',{timeout:180000},async t=>{
 const{p,browser,base,errors}=await setup(t);await p.goto(base+'#s6');await p.waitForFunction(()=>document.querySelector('#depth-observer').dataset.depth==='0'&&document.querySelector('#depth-lab').dataset.texture==='ready');await scroll(p,'#depth-lab');const rows=[];
 for(const [depth,eyeX]of[[70,300],[83,320],[92,340],[100,300],[0,250],[0,210],[0,300]]){
  await p.evaluate(([d,x])=>{const e=document.querySelector('#depth-eye');e.dispatchEvent(new KeyboardEvent('keydown',{key:'Home',bubbles:true}));for(let n=0;n<(x-210)/10;n++)e.dispatchEvent(new KeyboardEvent('keydown',{key:'PageUp',bubbles:true}));const water=document.querySelector('#depth-input');water.value=d;water.dispatchEvent(new Event('input'));water.dispatchEvent(new PointerEvent('pointerdown',{button:0}));},[depth,eyeX]);
  await p.waitForFunction(([d,x])=>{const c=document.querySelector('#depth-observer');return c.dataset.depth===String(d)&&c.dataset.eyeX===String(x)&&c.dataset.renderQuality==='preview';},[depth,eyeX]);
  const read=()=>p.locator('#depth-lab').evaluate(e=>({left:e.dataset.visible,right:e.querySelector('#depth-observer').dataset.visibility,text:e.querySelector('#depth-visibility').textContent,pixels:Number(e.querySelector('#depth-observer').dataset.coinPixels),blocked:e.querySelectorAll('.depth-block-point').length,quality:e.querySelector('#depth-observer').dataset.renderQuality}));
  const preview=await read(),visible=!(depth===0&&eyeX===300),expected=visible?(depth===0&&eyeX===210?'visible':'partial'):'hidden';assert.equal(preview.left,expected);assert.equal(preview.left,preview.right);assert.equal(preview.pixels>0,visible);if(expected==='partial'){assert.match(preview.text,/部分硬幣/);assert.equal(preview.blocked,0);}
  await p.locator('#depth-input').dispatchEvent('input');await p.waitForFunction(()=>document.querySelector('#depth-observer').dataset.renderQuality==='detail');const detail=await read();assert.equal(detail.text,preview.text);assert.equal(detail.left,preview.left);assert.equal(detail.pixels>0,preview.pixels>0);rows.push({depth,eyeX,preview,detail});if(depth===83)await capture(p,'#depth-lab','depth-edge-consistent');
 }
 const f=await browser.newPage();await f.addInitScript(()=>{window.Worker=class{constructor(){throw new Error('test worker unavailable');}};});await f.goto(base+'#s6');await f.waitForFunction(()=>document.querySelector('#depth-observer').dataset.depth==='0');await f.locator('#depth-lab').scrollIntoViewIfNeeded();await f.locator('#depth-input').evaluate(e=>{e.value=70;e.dispatchEvent(new Event('input'));});await f.waitForFunction(()=>document.querySelector('#depth-observer').dataset.depth==='70'&&document.querySelector('#depth-observer').dataset.renderQuality==='detail');assert.equal(await f.locator('#depth-observer').getAttribute('data-renderer'),'main');assert.match(await f.locator('#depth-visibility').textContent(),/部分硬幣/);assert.ok(Number(await f.locator('#depth-observer').getAttribute('data-coin-pixels'))>0);await f.close();
 if(process.env.ELEVEN_CAPTURE_DIR)await fs.writeFile(path.join(process.env.ELEVEN_CAPTURE_DIR,'visibility.json'),JSON.stringify(rows,null,2));assert.deepEqual(errors,[]);
});
