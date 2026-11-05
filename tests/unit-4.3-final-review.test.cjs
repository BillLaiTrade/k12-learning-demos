const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const {spawn}=require('node:child_process'),{chromium}=require('playwright');
async function setup(t,options={}){
 let base=process.env.LESSON_BASE_URL;
 if(!base){const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:['ignore','pipe','ignore']});t.after(()=>server.kill());const port=await new Promise((res,rej)=>{let out='';server.stdout.on('data',b=>{out+=b;const m=out.match(/port (\d+)/);if(m)res(m[1]);});server.on('error',rej);});base=`http://127.0.0.1:${port}/units/4/parts/4.3/`;}
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox'],...(process.env.LESSON_USE_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{})});t.after(()=>browser.close());
 const page=await browser.newPage({viewport:{width:1366,height:900},...options}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`${r.status()} ${r.url()}`);});return{page,browser,base,errors};
}
const state=(p,id,value)=>p.waitForFunction(([id,value])=>document.querySelector(id).dataset.state===value,[id,value]);
async function scroll(p,id){await p.locator(id).evaluate(e=>e.scrollIntoView({block:'start',behavior:'instant'}));await p.waitForTimeout(100);}
const capture=async(p,name)=>{if(process.env.FINAL_REVIEW_CAPTURE_DIR){await fs.mkdir(process.env.FINAL_REVIEW_CAPTURE_DIR,{recursive:true});await p.screenshot({path:path.join(process.env.FINAL_REVIEW_CAPTURE_DIR,name+'.png')});}};

test('4.3 approved desktop and laptop interactions, captions and four-layer evidence',{timeout:240000},async t=>{
 const {page:p,base,errors}=await setup(t);await p.clock.install();await p.goto(base);await p.waitForFunction(()=>document.querySelector('#return-lab').dataset.state==='ready');await p.clock.pauseAt(new Date(await p.evaluate(()=>Date.now())+100));
 await t.test('1 and 2 auto resume only automatic pauses and keep manual/comparison freezes',async()=>{
  for(const [root,start,pause,other]of [['#speed-lab','#race-start','#race-pause','#s2'],['#normal-lab','#normal-start','#normal-pause','#s1']]){
   await scroll(p,root);await p.locator(start).click();await p.clock.runFor(600);await scroll(p,other);await state(p,root,'paused');assert.equal(await p.locator(root).getAttribute('data-pause-reason'),'automatic');const old=Number(await p.locator(root).getAttribute('data-elapsed-ms'));await p.clock.runFor(1000);assert.equal(Number(await p.locator(root).getAttribute('data-elapsed-ms')),old);
   await scroll(p,root);await state(p,root,'running');await p.clock.runFor(200);assert.ok(Number(await p.locator(root).getAttribute('data-elapsed-ms'))>old);await p.locator(pause).click();await scroll(p,other);await scroll(p,root);assert.equal(await p.locator(root).getAttribute('data-state'),'paused');assert.equal(await p.locator(root).getAttribute('data-pause-reason'),'manual');
  }
  await p.locator('#normal-pause').click();await p.clock.runFor(6000);assert.equal(await p.locator('#normal-lab').getAttribute('data-pause-reason'),'comparison');assert.equal(await p.locator('#normal-lab').getAttribute('data-elapsed-ms'),'5000');await scroll(p,'#s1');await scroll(p,'#normal-lab');assert.equal(await p.locator('#normal-lab').getAttribute('data-pause-reason'),'comparison');
  assert.equal(await p.locator('.model-clock-note').count(),2);assert.match(await p.locator('#s1').innerText(),/模型路程/);assert.match(await p.locator('#s2').innerText(),/模型總路程/);assert.equal(await p.locator('.normal-right-angle').count(),2);assert.match(await p.locator('.normal-reference-label').first().textContent(),/法線：垂直介面/);
 });
 await t.test('3 and 4 distinguish preview from playing without altering selected settings',async()=>{
  for(const id of ['oblique','exit']){
   await scroll(p,`#${id}-lab`);await p.locator(`#${id}-start`).click();await p.clock.runFor(100);await p.locator(`#${id}-angle`).fill('20');assert.equal(await p.locator(`#${id}-lab`).getAttribute('data-state'),'preview');assert.equal(await p.locator(`#${id}-preview`).isVisible(),true);assert.match(await p.locator(`#${id}-start`).textContent(),/播放此設定/);
   await p.locator(`#${id}-start`).click();assert.equal(await p.locator(`#${id}-preview`).isVisible(),false);await p.clock.runFor(4000);
   for(const medium of ['water','glass'])for(const angle of [0,40]){await p.locator(`#${id}-medium-toggle [data-lab-medium=${medium}]`).click();await p.waitForFunction(([id,medium])=>document.querySelector(`#${id}-lab`).dataset.medium===medium&&['preview','complete'].includes(document.querySelector(`#${id}-lab`).dataset.state),[id,medium]);await p.locator(`#${id}-angle`).fill(String(angle));assert.equal(await p.locator(`#${id}-preview`).isVisible(),true);}
  }
 });
 await t.test('5 independent reciprocal fronts, correct slider roles, pause and reset',async()=>{
  await scroll(p,'#return-viewport');await p.locator('#return-reset').click();const root=p.locator('#return-lab');
  for(const [combo,caption]of [[[true,false],'折射角'],[[false,true],'入射角'],[[true,true],'水側角度'],[[false,false],'水側角度']]){
   for(const [i,key]of ['a','b'].entries())if((await root.getAttribute(`data-light-${key}`)==='true')!==combo[i])await p.locator(`#return-toggle-${key}`).click();
   assert.equal(await p.locator('#return-angle-caption').textContent(),caption);assert.equal(await p.locator('#return-angle').inputValue(),'30');
  }
  await p.locator('#return-toggle-a').click();await p.clock.runFor(200);let progress=Number(await root.getAttribute('data-progress-a'));assert.ok(progress>0&&progress<1);assert.equal(await p.locator('.return-light-a .return-direction').nth(1).getAttribute('d'),'');await p.locator('#return-toggle-b').click();await p.clock.runFor(200);assert.ok(Number(await root.getAttribute('data-progress-a'))>Number(await root.getAttribute('data-progress-b')));
  await scroll(p,'#s1');const old=Number(await root.getAttribute('data-progress-a'));await p.clock.runFor(1000);assert.equal(Number(await root.getAttribute('data-progress-a')),old);await scroll(p,'#return-viewport');await p.clock.runFor(2500);assert.equal(await root.getAttribute('data-progress-a'),'1');assert.equal(await root.getAttribute('data-progress-b'),'1');assert.match(await p.locator('.return-light-b .return-direction').nth(1).getAttribute('d'),/^M/);
  await p.locator('#return-angle').fill('35');assert.equal(await root.getAttribute('data-progress-a'),'0');await p.clock.runFor(2000);await p.locator('#return-medium-toggle [data-lab-medium=glass]').click();await p.waitForFunction(()=>document.querySelector('#return-lab').dataset.medium==='glass'&&document.querySelector('#return-lab').dataset.state==='ready');assert.equal(await p.locator('#return-angle-caption').textContent(),'玻璃側角度');await p.locator('#return-reset').click();assert.equal(await root.getAttribute('data-light-a'),'false');assert.equal(await root.getAttribute('data-progress-a'),'0');assert.match(await p.locator('.return-alignment-note').textContent(),/自動對準/);
 });
 await t.test('four-layer pool remains a real mouse return target; only Left/Right reorders; feedback gives one measured pair',async()=>{
  await scroll(p,'#rank-lab');await p.locator('#rank-source-trigger').click();await p.clock.runFor(5000);assert.equal(await p.locator('#rank-lab').getAttribute('data-state'),'complete');
  const angles=await p.locator('.rank-angle-value').allTextContents();assert.equal(new Set(angles).size,4);assert.deepEqual(await p.locator('[data-material-kind=solid]').evaluateAll(es=>es.map(e=>e.dataset.materialFinish).sort()),['clear','cool']);
  const ranking=angles.map((angle,id)=>({id,angle:parseFloat(angle)})).sort((a,b)=>b.angle-a.angle).map(e=>e.id),wrong=[ranking[0],ranking[3],ranking[1],ranking[2]];
  for(const [slot,id]of wrong.entries()){await p.locator(`[data-rank-medium="${id}"]`).click();await p.locator(`[data-rank-slot="${slot}"]`).click();}
  assert.ok((await p.locator('.rank-pool').boundingBox()).height>=44);assert.equal(await p.locator('.rank-pool').getAttribute('data-empty'),'true');const before=await p.locator('.rank-slot-content').allTextContents();await p.locator('[data-rank-slot="1"]').focus();await p.keyboard.press('ArrowDown');await p.keyboard.press('ArrowUp');assert.deepEqual(await p.locator('.rank-slot-content').allTextContents(),before);
  await p.locator('#rank-check').click();assert.equal(await p.locator('#quiz-result').getAttribute('data-result'),'retry');const feedback=await p.locator('#quiz-result').textContent();assert.equal(feedback.match(/\d+\.\d°/g).length,2);assert.ok(feedback.includes(angles[wrong[1]])&&feedback.includes(angles[wrong[2]]));assert.doesNotMatch(feedback,/由快到慢為/);
  await p.locator('.rank-pool').evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));await p.clock.runFor(100);
  const slot=await p.locator('[data-rank-slot="0"]').boundingBox(),pool=await p.locator('.rank-pool').boundingBox();await p.mouse.move(slot.x+slot.width/2,slot.y+slot.height/2);await p.mouse.down();await p.mouse.move(pool.x+pool.width/2,pool.y+pool.height/2,{steps:12});await p.mouse.up();assert.equal(await p.locator(`[data-rank-medium="${ranking[0]}"]`).isVisible(),true);assert.equal(await p.locator('[data-rank-slot="0"]').getAttribute('data-filled'),'false');await p.locator(`[data-rank-medium="${ranking[0]}"]`).click();await p.locator('[data-rank-slot="0"]').click();
  await p.locator('[data-rank-slot="1"]').focus();await p.keyboard.press('ArrowRight');await p.locator('[data-rank-slot="2"]').focus();await p.keyboard.press('ArrowRight');await p.locator('#rank-check').click();assert.equal(await p.locator('#quiz-result').getAttribute('data-result'),'correct');assert.ok((await p.locator('#quiz-result').textContent()).includes(ranking.map(id=>'甲乙丙丁'[id]).join('、')));
  await capture(p,'quiz-correct');await p.locator('#rank-new').click();assert.equal(await p.locator('#rank-lab').getAttribute('data-state'),'idle');assert.equal(await p.locator('[data-material-kind=solid]').count(),2);
 });
 await t.test('desktop/laptop bounds and final presentation at 1440,1366,1280,1024',async()=>{
  for(const [width,height]of [[1440,900],[1366,768],[1280,720],[1024,768]]){
   await p.setViewportSize({width,height});await p.clock.runFor(200);
   for(const i of [1,2,3,4,5,6,7]){await scroll(p,'#s'+i);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`${width} s${i}`);const clipped=await p.locator('#s'+i).evaluate(e=>[...e.querySelectorAll('button,.quiz-subtitle,.model-clock-note')].filter(n=>n.clientWidth&&n.scrollWidth>n.clientWidth+2).map(n=>n.id||n.className));assert.deepEqual(clipped,[],`${width} s${i}`);}
   await capture(p,`${width}-quiz`);await scroll(p,'#return-viewport');await capture(p,`${width}-return`);await scroll(p,'#depth-lab');await capture(p,`${width}-depth`);
  }
  assert.equal(await p.locator('main .lesson-card').count(),6);assert.equal(await p.locator('form').count(),1);assert.match(await p.locator('#depth-lab figcaption').first().textContent(),/側面剖面：看光路/);
 });
 assert.deepEqual(errors,[]);
});

test('6 real two-second paired water frames, eye co-control, takeover, full detail and worker fallback',{timeout:150000},async t=>{
 const {page:p,browser,base,errors}=await setup(t);await p.goto(base+'#s6');await p.waitForFunction(()=>document.querySelector('#depth-observer').dataset.depth==='0'&&document.querySelector('#depth-lab').dataset.texture==='ready');await scroll(p,'#depth-lab');
 const animate=async(direction)=>p.evaluate(async(direction)=>{
  const root=document.querySelector('#depth-lab'),canvas=document.querySelector('#depth-observer'),start=performance.now(),frames=[];
  const watcher=new MutationObserver(()=>{if(frames.at(-1)?.depth!==canvas.dataset.depth)frames.push({ms:performance.now()-start,depth:Number(canvas.dataset.depth),side:Number(root.dataset.depth),eye:canvas.dataset.eyeX,quality:canvas.dataset.renderQuality});});watcher.observe(canvas,{attributes:true,attributeFilter:['data-depth']});
  document.querySelector(direction>0?'#depth-fill':'#depth-drain').click();let eyeState;
  setTimeout(()=>{document.querySelector('#depth-eye').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));eyeState=root.dataset.state;},500);
  await new Promise(resolve=>{const timer=setInterval(()=>{if(canvas.dataset.depth===(direction>0?'100':'0')){clearInterval(timer);resolve();}},25);setTimeout(()=>{clearInterval(timer);resolve();},8000);});watcher.disconnect();return{frames,eyeState,state:root.dataset.state};
 },direction);
 const fill=await animate(1);assert.equal(fill.eyeState,'filling');assert.ok(fill.frames.length>=5,JSON.stringify(fill));assert.ok(fill.frames.at(-1).ms>=1800&&fill.frames.at(-1).ms<4000,JSON.stringify(fill));for(const f of fill.frames)assert.equal(f.depth,f.side);assert.equal(fill.frames.at(-1).depth,100);await p.waitForFunction(()=>document.querySelector('#depth-observer').dataset.renderQuality==='detail',null,{timeout:30000});assert.ok(await p.locator('#depth-observer').evaluate(e=>e.width>=400));await capture(p,'depth-detail');
 const drain=await animate(-1);assert.equal(drain.eyeState,'draining');assert.ok(drain.frames.length>=5);for(const f of drain.frames)assert.equal(f.depth,f.side);assert.equal(drain.frames.at(-1).depth,0);
 await p.locator('#depth-fill').click();await p.waitForTimeout(400);await p.locator('#depth-input').evaluate(e=>{e.value='40';e.dispatchEvent(new Event('input'));});await state(p,'#depth-lab','ready');await p.waitForFunction(()=>document.querySelector('#depth-observer').dataset.depth==='40');await p.waitForTimeout(250);assert.equal(await p.locator('#depth-input').inputValue(),'40');
 await p.locator('#depth-fill').click();await p.waitForTimeout(300);await scroll(p,'#s1');await state(p,'#depth-lab','paused');const saved=await p.locator('#depth-input').inputValue();await p.waitForTimeout(300);assert.equal(await p.locator('#depth-input').inputValue(),saved);await scroll(p,'#depth-lab');await p.waitForFunction(()=>document.querySelector('#depth-observer').dataset.depth==='100',null,{timeout:8000});
 const fallback=await browser.newPage();await fallback.addInitScript(()=>{window.Worker=class{constructor(){throw new Error('worker unavailable for verification');}};});await fallback.goto(base+'#s6');await fallback.waitForFunction(()=>document.querySelector('#depth-observer').dataset.depth==='0');assert.equal(await fallback.locator('#depth-observer').getAttribute('data-renderer'),'main');await fallback.locator('#depth-input').evaluate(e=>{e.value='80';e.dispatchEvent(new Event('input'));});await fallback.waitForFunction(()=>document.querySelector('#depth-observer').dataset.depth==='80');assert.equal(await fallback.locator('#depth-lab').getAttribute('data-depth'),'80');await fallback.close();
 if(process.env.FINAL_REVIEW_CAPTURE_DIR)await fs.writeFile(path.join(process.env.FINAL_REVIEW_CAPTURE_DIR,'water-frames.json'),JSON.stringify({fill,drain},null,2));assert.deepEqual(errors,[]);
});
