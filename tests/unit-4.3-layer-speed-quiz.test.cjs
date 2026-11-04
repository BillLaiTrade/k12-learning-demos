const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');
const fs=require('node:fs/promises');
const {chromium}=require('playwright');

test('4.3 layer-speed quiz applies refraction through one four-layer bench',{timeout:600000},async t=>{
 let base=process.env.LESSON_BASE_URL;
 if(!base){const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:['ignore','pipe','ignore']});t.after(()=>server.kill());const port=await new Promise((resolve,reject)=>{let out='';server.stdout.on('data',b=>{out+=b;const m=out.match(/port (\d+)/);if(m)resolve(m[1]);});server.on('error',reject);});base=`http://127.0.0.1:${port}/units/4/parts/4.3/`;}
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox'],...(process.env.LESSON_USE_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{})});t.after(()=>browser.close());
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`${r.status()} ${r.url()}`);});
 const ready=async p=>{await p.goto(base.replace(/#.*$/,'')+'#s7');await p.waitForFunction(()=>document.querySelector('#rank-lab')?.dataset.ready==='true'&&['ready','fallback'].includes(document.querySelector('#rank-lab').dataset.texture));};
 const complete=async p=>{await p.locator('#rank-play').click();await p.waitForFunction(()=>document.querySelector('#rank-lab').dataset.state==='complete');};
 const order=()=>page.locator('.rank-slot').evaluateAll(es=>es.map(e=>e.dataset.filled==='true'?e.querySelector('.rank-slot-content').textContent.replace('⠿','').trim():null));
 const answer=()=>page.locator('.rank-light-segment').evaluateAll(groups=>groups.slice(1).map((group,id)=>{const path=group.querySelector('.rank-beam'),a=path.getPointAtLength(0),b=path.getPointAtLength(path.getTotalLength());return{id,angle:Math.atan2(b.x-a.x,b.y-a.y)};}).sort((a,b)=>b.angle-a.angle).map(x=>x.id));
 const clear=async()=>{for(let i=0;i<4;i++){await page.locator(`[data-rank-slot="${i}"]`).focus();await page.keyboard.press('Delete');}};
 const place=async ids=>{await clear();for(const [slot,id] of ids.entries()){await page.locator(`[data-rank-medium="${id}"]`).click();await page.locator(`[data-rank-slot="${slot}"]`).click();}};
 const capture=process.env.LAYER_CAPTURE_DIR;if(capture)await fs.mkdir(capture,{recursive:true});
 const shot=async name=>{if(capture)await page.locator('#s7').screenshot({path:path.join(capture,name)});};
 await ready(page);
 await t.test('initial scene awaits emission, preserves six teaching sections and withholds speed answers',async()=>{
  assert.equal(await page.locator('.lesson-card').count(),6);assert.equal(await page.locator('form').count(),1);assert.equal(await page.locator('#quiz input[type=radio]').count(),0);assert.equal(await page.locator('.rank-slot').count(),4);
  assert.equal(await page.locator('#rank-check').isDisabled(),true);assert.equal(await page.locator('.rank-speed-badge[visibility=visible]').count(),0);
  assert.equal(await page.locator('.rank-angle-value:visible').count(),0);
  await page.waitForTimeout(180);assert.equal(await page.locator('#rank-lab').getAttribute('data-state'),'idle');assert.equal(await page.locator('.rank-beam[d]:not([d=""])').count(),0);await shot('initial.png');
 });
 await t.test('emission draws genuine intermediate, continuous refracted segments and leaves parallel normals for comparison',async()=>{
  await page.evaluate(()=>{const root=document.querySelector('#rank-lab');window.__rankFrames=[];window.__rankObserver=new MutationObserver(()=>{window.__rankFrames.push({elapsed:+root.dataset.elapsedMs,parts:[...root.querySelectorAll('.rank-light-segment')].map(x=>+x.dataset.fraction)});});window.__rankObserver.observe(root,{attributes:true,attributeFilter:['data-elapsed-ms']});});
  await complete(page);const frames=await page.evaluate(()=>{window.__rankObserver.disconnect();return window.__rankFrames;});assert.ok(frames.filter(x=>x.parts.some(f=>f>0&&f<1)).length>=3);
  const geometry=await page.locator('#rank-scene').evaluate(svg=>{const point=p=>({x:p.x,y:p.y});const lines=[...svg.querySelectorAll('.rank-beam')].map(p=>({start:point(p.getPointAtLength(0)),end:point(p.getPointAtLength(p.getTotalLength()))}));const normals=[...svg.querySelectorAll('.rank-normal')].map(p=>({start:point(p.getPointAtLength(0)),end:point(p.getPointAtLength(p.getTotalLength()))}));return{lines,normals};});
  for(let i=1;i<5;i++){assert.ok(Math.abs(geometry.lines[i-1].end.x-geometry.lines[i].start.x)<.01);assert.ok(Math.abs(geometry.lines[i-1].end.y-geometry.lines[i].start.y)<.01);assert.equal(geometry.normals[i-1].start.x,geometry.normals[i-1].end.x);assert.ok(Math.abs(geometry.normals[i-1].start.x-geometry.lines[i].start.x)<.01);}
  assert.deepEqual(await answer(),[0,2,3,1]);assert.equal(await page.locator('#rank-check').isEnabled(),true);assert.equal(await page.locator('.rank-speed-badge[visibility=visible]').count(),0);await shot('observed.png');
 });
 await t.test('displayed angles match actual rays in every material arrangement and stay clear on narrow screens',async()=>{
  const records=[],arrangements=new Set();
  for(let question=0;question<24;question++){
   arrangements.add((await answer()).join(','));
   for(const width of [1440,820,390,320]){
    await page.setViewportSize({width,height:1000});await page.waitForTimeout(80);
    const rows=await page.locator('#rank-scene').evaluate(svg=>[...svg.querySelectorAll('.rank-angle-value')].map(label=>{
     const id=+label.dataset.layer,ray=svg.querySelector(`.rank-light-segment[data-segment="${id+1}"] .rank-beam`),a=ray.getPointAtLength(0),b=ray.getPointAtLength(ray.getTotalLength()),box=label.getBoundingClientRect(),layer=svg.querySelector(`.rank-medium[data-layer="${id}"] .rank-layer`).getBoundingClientRect(),matrix=svg.getScreenCTM();
     const from=a.matrixTransform(matrix),to=b.matrixTransform(matrix),rayX=y=>from.x+(to.x-from.x)*(y-from.y)/(to.y-from.y);
     return{text:label.textContent,angle:Math.atan2(b.x-a.x,b.y-a.y)*180/Math.PI,visible:getComputedStyle(label).visibility,font:parseFloat(getComputedStyle(label).fontSize)*matrix.a,inside:box.left>=layer.left&&box.right<=layer.right&&box.top>=layer.top&&box.bottom<=layer.bottom,clear:box.left>Math.max(rayX(box.top),rayX(box.bottom))+2};
    }));
    for(const row of rows){assert.match(row.text,/^\d+\.\d°$/);assert.equal(row.text,`${row.angle.toFixed(1)}°`);assert.equal(row.visible,'visible');assert.ok(row.font>=13.4&&row.inside&&row.clear,`${width}: ${JSON.stringify(row)}`);}
    records.push({question,width,rows});
   }
   if(question<23){await page.locator('#rank-new').click();assert.equal(await page.locator('.rank-angle-value:visible').count(),0);await complete(page);}
  }
  assert.equal(arrangements.size,24);if(capture)await fs.writeFile(path.join(capture,'angle-readings.json'),JSON.stringify(records,null,2));
  await page.setViewportSize({width:1440,height:1000});await page.reload();await page.waitForFunction(()=>document.querySelector('#rank-lab')?.dataset.ready==='true'&&document.querySelector('#rank-lab').dataset.texture==='ready');await complete(page);
 });
 await t.test('photoreal bench and transparent source load, with the optical aperture aligned to the computed ray',async()=>{
  assert.equal(await page.locator('#rank-lab').getAttribute('data-texture'),'ready');
  assert.equal(await page.locator('#rank-lab').getAttribute('data-background-ready'),'true');
  assert.equal(await page.locator('#rank-lab').getAttribute('data-source-ready'),'true');
  assert.match(await page.locator('.rank-bench-photo').getAttribute('href'),/layer-quiz-bench-wide\.png$/);
  assert.match(await page.locator('.rank-source-photo').getAttribute('href'),/layer-quiz-source\.png$/);
  const alignment=await page.locator('#rank-scene').evaluate(svg=>{const optic=svg.querySelector('.rank-source-optic'),path=svg.querySelector('.rank-beam'),a=new DOMPoint(0,0).matrixTransform(optic.getScreenCTM()),b=path.getPointAtLength(0).matrixTransform(path.getScreenCTM());return{distance:Math.hypot(a.x-b.x,a.y-b.y),fallback:getComputedStyle(svg.querySelector('.rank-source-fallback')).display};});
  assert.ok(alignment.distance<.01);assert.equal(alignment.fallback,'none');
 });
 await t.test('three material states use distinct real textures and follow the speed ordering when questions change',async()=>{
  if(await page.locator('#rank-lab').getAttribute('data-state')!=='complete')await complete(page);
  const verify=async()=>{const kinds=await page.locator('.rank-medium').evaluateAll(es=>es.map(e=>e.dataset.materialKind));assert.deepEqual([...kinds].sort(),['gas','liquid','solid','solid']);assert.equal(await page.locator('#rank-lab').getAttribute('data-materials-ready'),'true');assert.equal(await page.locator('.rank-material-photo').count(),4);const views=await page.locator('.rank-material-photo').evaluateAll(es=>es.map(e=>e.getAttribute('viewBox')));assert.equal(new Set(views).size,3);const ids=await answer();assert.equal(kinds[ids[0]],'gas');assert.equal(kinds[ids[1]],'liquid');assert.equal(kinds[ids[2]],'solid');assert.equal(kinds[ids[3]],'solid');return ids;};
  const first=await verify();await page.locator('#rank-new').click();await complete(page);const second=await verify();assert.notDeepEqual(second,first);
  await page.reload();await page.waitForFunction(()=>document.querySelector('#rank-lab')?.dataset.ready==='true'&&['ready','fallback'].includes(document.querySelector('#rank-lab').dataset.texture));await complete(page);
 });
 await t.test('partial and wrong answers get actionable feedback; correction and new edits update the same diagram',async()=>{
  await page.locator('#rank-check').click();assert.match(await page.locator('#quiz-result').textContent(),/未放入/);
  await place([0,2,1,3]);await page.locator('#rank-check').click();assert.equal(await page.locator('#quiz-result').getAttribute('data-result'),'retry');assert.match(await page.locator('#quiz-result').textContent(),/夾角越大/);assert.equal(await page.locator('.rank-angle[data-emphasis=true]').count(),4);
  await page.locator('[data-rank-slot="2"]').focus();await page.keyboard.press('ArrowRight');assert.equal(await page.locator('#quiz-result').textContent(),'');assert.equal(await page.locator('.rank-angle[data-emphasis=true]').count(),0);
  await page.locator('#rank-check').click();assert.equal(await page.locator('#quiz-result').getAttribute('data-result'),'correct');assert.equal(await page.locator('.rank-slot[data-result=correct]').count(),4);await shot('correct.png');
  await page.locator('[data-rank-slot="0"]').focus();await page.keyboard.press('Delete');assert.equal(await page.locator('[data-rank-medium="0"]').isVisible(),true);assert.equal(await page.locator('#quiz-result').textContent(),'');
 });
 await t.test('mouse dragging swaps occupied slots, cancels outside drops and does not leak a click or ghost',async()=>{
  await clear();const token=page.locator('[data-rank-medium="0"]'),target=page.locator('[data-rank-slot="1"]');await token.scrollIntoViewIfNeeded();let a=await token.boundingBox(),b=await target.boundingBox();
  await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:8});await page.mouse.up();assert.deepEqual(await order(),[null,'介質甲',null,null]);assert.equal(await page.locator('.rank-drag-ghost').count(),0);assert.equal(await target.getAttribute('aria-pressed'),'false');
  await page.locator('[data-rank-medium="1"]').click();await page.locator('[data-rank-slot="0"]').click();a=await target.boundingBox();b=await page.locator('[data-rank-slot="0"]').boundingBox();await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:8});await page.mouse.up();assert.deepEqual(await order(),['介質甲','介質乙',null,null]);
  a=await page.locator('[data-rank-slot="0"]').boundingBox();await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(2,2,{steps:8});await page.mouse.up();assert.deepEqual(await order(),['介質甲','介質乙',null,null]);assert.equal(await page.locator('.rank-drag-ghost').count(),0);
 });
 await t.test('keyboard selection, arrows, deletion and Escape support the complete ranking workflow',async()=>{
  await clear();await page.locator('[data-rank-medium="2"]').focus();await page.keyboard.press('Space');assert.match(await page.locator('#rank-sort-help').textContent(),/介質丙/);await page.keyboard.press('Escape');assert.equal(await page.locator('[data-rank-medium="2"]').getAttribute('aria-pressed'),'false');
  const ids=await answer();for(const [slot,id]of ids.entries()){await page.locator(`[data-rank-medium="${id}"]`).focus();await page.keyboard.press('Enter');await page.locator(`[data-rank-slot="${slot}"]`).focus();await page.keyboard.press('Space');}
  await page.locator('#rank-check').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('#quiz-result').getAttribute('data-result'),'correct');const before=await order();await complete(page);assert.deepEqual(await order(),before);
 });
 await t.test('offscreen playback suspends and resumes, while changing question cancels old playback and clears answers',async()=>{
  const old=await answer();await page.locator('#rank-play').click();await page.waitForFunction(()=>+document.querySelector('#rank-lab').dataset.elapsedMs>80);await page.evaluate(()=>scrollTo(0,0));await page.waitForFunction(()=>document.querySelector('#rank-lab').dataset.state==='suspended');const saved=await page.locator('#rank-lab').getAttribute('data-elapsed-ms');await page.waitForTimeout(150);assert.equal(await page.locator('#rank-lab').getAttribute('data-elapsed-ms'),saved);await page.locator('#rank-play').scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('#rank-lab').dataset.state==='complete');
  await page.locator('#rank-play').click();await page.locator('#rank-new').click();assert.equal(await page.locator('#rank-lab').getAttribute('data-state'),'idle');assert.equal(await page.locator('.rank-slot[data-filled=true]').count(),0);assert.equal(await page.locator('#quiz-result').textContent(),'');await page.waitForTimeout(3200);assert.equal(await page.locator('#rank-lab').getAttribute('data-state'),'idle');await complete(page);assert.notDeepEqual(await answer(),old);
 });
 const layouts=[];
 await t.test('desktop, laptop and narrow screens preserve physical angles, readable labels and complete controls',async()=>{
  const baseOrder=await answer();for(const width of [1536,1366,1280,1024,820,760,650,390,320]){
   await page.setViewportSize({width,height:width<760?900:1000});await page.locator('#s7').scrollIntoViewIfNeeded();await page.waitForFunction(()=>['ready','fallback'].includes(document.querySelector('#rank-lab').dataset.texture));await page.waitForTimeout(70);
   const m=await page.locator('#s7').evaluate(el=>{const svg=el.querySelector('#rank-scene'),box=svg.getBoundingClientRect(),matrix=svg.getScreenCTM();return{width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,scaleX:matrix.a,scaleY:matrix.d,clipped:[...el.querySelectorAll('button')].filter(b=>b.scrollWidth>b.clientWidth+1).map(b=>b.textContent),labels:[...svg.querySelectorAll('.rank-medium>text')].map(t=>({font:parseFloat(getComputedStyle(t).fontSize)*matrix.a,left:t.getBoundingClientRect().left,right:t.getBoundingClientRect().right})),box:box.toJSON(),buttons:[...el.querySelectorAll('button:not([hidden])')].map(b=>({height:b.getBoundingClientRect().height,left:b.getBoundingClientRect().left,right:b.getBoundingClientRect().right}))};});
   assert.equal(m.overflow,false,`${width} overflow`);assert.deepEqual(m.clipped,[],`${width} clipped`);assert.ok(Math.abs(m.scaleX-m.scaleY)<1e-5,`${width} distorts angles`);assert.ok(m.labels.every(x=>x.font>=13.4&&x.left>=m.box.left&&x.right<=m.box.right),`${width} labels`);assert.ok(m.buttons.every(x=>x.height>=44&&x.left>=0&&x.right<=width+1),`${width} controls`);assert.deepEqual(await answer(),baseOrder);assert.match(await page.locator('.rank-bench-photo').getAttribute('href'),m.box.width<650&&await page.locator('#s7').evaluate(e=>e.clientWidth<=650)?/bench-tall\.png$/:/bench-wide\.png$/);layouts.push(m);if([1366,390,320].includes(width))await shot(`${width}-quiz.png`);
  }
  if(capture)await fs.writeFile(path.join(capture,'layouts.json'),JSON.stringify(layouts,null,2));
 });
 await t.test('native phone touch drags cards without page scrolling and reduced-motion playback still reveals intermediate light',async()=>{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});const p=await context.newPage();await ready(p);await p.evaluate(()=>{window.__rankTouchSteps=0;const root=document.querySelector('#rank-lab');window.__rankTouchObserver=new MutationObserver(()=>{if([...root.querySelectorAll('.rank-light-segment')].some(e=>+e.dataset.fraction>0&&+e.dataset.fraction<1))window.__rankTouchSteps++;});window.__rankTouchObserver.observe(root,{attributes:true,attributeFilter:['data-elapsed-ms']});});await p.locator('#rank-source-trigger').tap();await p.waitForFunction(()=>document.querySelector('#rank-lab').dataset.state==='complete');assert.ok(await p.evaluate(()=>{window.__rankTouchObserver.disconnect();return window.__rankTouchSteps;})>=3);const token=p.locator('[data-rank-medium="0"]'),slot=p.locator('[data-rank-slot="0"]');await token.scrollIntoViewIfNeeded();const a=await token.boundingBox(),b=await slot.boundingBox(),session=await context.newCDPSession(p),startScroll=await p.evaluate(()=>scrollY);await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:a.x+a.width/2,y:a.y+a.height/2}]});for(let i=1;i<=6;i++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:a.x+a.width/2+(b.x+b.width/2-a.x-a.width/2)*i/6,y:a.y+a.height/2+(b.y+b.height/2-a.y-a.height/2)*i/6}]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.match(await slot.textContent(),/介質甲/);assert.ok(Math.abs(await p.evaluate(()=>scrollY)-startScroll)<3);assert.equal(await p.locator('.rank-drag-ghost').count(),0);
  await p.locator('[data-rank-medium="1"]').tap();await p.locator('[data-rank-slot="3"]').tap();await p.locator('[data-rank-medium="2"]').tap();await p.locator('[data-rank-slot="1"]').tap();await p.locator('[data-rank-medium="3"]').tap();await p.locator('[data-rank-slot="2"]').tap();await p.locator('#rank-check').tap();assert.equal(await p.locator('#quiz-result').getAttribute('data-result'),'correct');await context.close();
 });
 await t.test('the lamp emits by mouse and keyboard, stays aligned after resize, and preserves answers on replay',async()=>{
  const p=await browser.newPage({viewport:{width:1440,height:1000}});await ready(p);
  const lamp=p.locator('#rank-source-trigger');assert.equal(await lamp.getAttribute('aria-controls'),'rank-scene');
  await lamp.click();await p.waitForFunction(()=>+document.querySelector('#rank-lab').dataset.elapsedMs>0&&document.querySelector('#rank-lab').dataset.state==='running');
  assert.equal(await lamp.isDisabled(),true);assert.equal(await p.locator('#rank-play').isDisabled(),true);
  await p.waitForFunction(()=>document.querySelector('#rank-lab').dataset.state==='complete');
  await p.locator('[data-rank-medium="0"]').click();await p.locator('[data-rank-slot="0"]').click();
  for(const key of ['Enter','Space']){
   await lamp.focus();await p.keyboard.press(key);await p.waitForFunction(()=>document.querySelector('#rank-lab').dataset.state==='running'&&+document.querySelector('#rank-lab').dataset.elapsedMs<1000);
   assert.match(await p.locator('[data-rank-slot="0"]').textContent(),/介質甲/);await p.waitForFunction(()=>document.querySelector('#rank-lab').dataset.state==='complete');
  }
  for(const width of [1440,820,390,320]){
   await p.setViewportSize({width,height:1000});await p.waitForTimeout(100);
   const target=await lamp.boundingBox(),image=await p.locator('.rank-source-photo').boundingBox();
   assert.ok(Math.abs(target.x-image.x)<1&&Math.abs(target.y-image.y)<1,`${width}: lamp target alignment`);
   assert.ok(target.width>=44&&target.height>=44,`${width}: touch size`);
  }
  await p.locator('#rank-new').click();assert.equal(await lamp.isEnabled(),true);assert.match(await lamp.getAttribute('aria-label'),/發射光束/);await lamp.click();await p.waitForFunction(()=>document.querySelector('#rank-lab').dataset.state==='complete');await p.close();
 });
 await t.test('texture failure leaves a usable vector bench, and no-JavaScript explains how to continue',async()=>{
  const p=await browser.newPage();await p.route('**/layer-quiz-*.png',r=>r.abort());await p.route('**/light-speed-bench.png',r=>r.abort());await ready(p);await p.waitForFunction(()=>document.querySelector('#rank-fallback').textContent.includes('簡化底圖'));await p.locator('#rank-source-trigger').click();await p.waitForFunction(()=>document.querySelector('#rank-lab').dataset.state==='complete');assert.equal(await p.locator('#rank-check').isEnabled(),true);await p.close();const context=await browser.newContext({javaScriptEnabled:false});const plain=await context.newPage();await plain.goto(base);assert.match(await plain.locator('#s7 noscript').textContent(),/啟用JavaScript/);assert.equal(await plain.locator('#rank-play').isDisabled(),true);await context.close();
 });
 assert.deepEqual(errors,[]);
});
