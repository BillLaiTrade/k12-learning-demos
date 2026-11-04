const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');
const {chromium}=require('playwright');
test('4.3 complete basic lesson works on desktop and mobile',{timeout:90000},async t=>{
 let base=process.env.LESSON_BASE_URL;
 if(!base){
  const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:['ignore','pipe','ignore']});
  t.after(()=>server.kill());
  const port=await new Promise((resolve,reject)=>{let out='';const timer=setTimeout(()=>reject(Error('server timeout')),5000);server.stdout.on('data',b=>{out+=b;const m=out.match(/port (\d+)/);if(m){clearTimeout(timer);resolve(m[1]);}});server.on('error',reject);});
  base=`http://127.0.0.1:${port}/units/4/parts/4.3/`;
 }
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox'],...(process.env.LESSON_USE_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{})});
 t.after(()=>browser.close());
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const failures=[];page.on('pageerror',e=>failures.push(e.message));page.on('requestfailed',r=>failures.push(r.url()));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))failures.push(`${r.status()} ${r.url()}`);});
 await page.clock.install();await page.goto(base);await page.waitForFunction(()=>document.querySelector('#depth-scene circle')&&document.querySelector('#speed-lab')?.dataset.state==='idle');
 await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now())+100));
 assert.equal(await page.locator('main section.lesson-card,main section.unit-quiz').count(),7);
 assert.equal(await page.locator('form').count(),1);
 // No automatic motion. Equal lengths and a common clock create the speed comparison.
 const dots=()=>page.locator('#race-scene .race-pulse').evaluateAll(es=>es.map(e=>Number(e.getAttribute('cx'))));
 assert.deepEqual(await dots(),[448,448,448]);await page.clock.runFor(500);assert.deepEqual(await dots(),[448,448,448]);
 await page.locator('#race-start').click();await page.clock.runFor(2100);const moving=await dots();assert.ok(moving[0]>moving[1]&&moving[1]>moving[2]);await page.clock.runFor(3100);assert.deepEqual(await dots(),[1590,1590,1590]);assert.equal(await page.locator('#speed-lab').getAttribute('data-state'),'complete');
 await page.locator('#race-start').click();assert.deepEqual(await dots(),[448,448,448]);await page.locator('#race-pause').click();
 await page.waitForFunction(()=>document.querySelector('#normal-lab')?.dataset.state==='idle');
 await page.locator('#normal-start').click();await page.clock.runFor(350);const normal=page.locator('#normal-lab');const y=Number(await normal.locator('.normal-lane').first().getAttribute('data-front-y'));assert.ok(y>240&&y<484);await page.locator('#normal-pause').click();const pausedY=Number(await normal.locator('.normal-lane').first().getAttribute('data-front-y'));await page.clock.runFor(1000);assert.equal(Number(await normal.locator('.normal-lane').first().getAttribute('data-front-y')),pausedY);

 for(const id of ['leave']){
  const lab=page.locator('#exit-lab');await lab.locator('#exit-medium-toggle [data-lab-medium=glass]').click();await page.waitForFunction(()=>['idle','preview'].includes(document.querySelector('#exit-lab')?.dataset.state)&&document.querySelector('#exit-lab').dataset.medium==='glass');
  const input=lab.locator('#exit-angle');await input.fill('35');await input.dispatchEvent('input');
  const out=Number((await lab.locator('#exit-out-value').textContent()).replace('°',''));assert.ok(id==='enter'?out<35:out>35);
  await lab.locator('.oblique-source').focus();await page.keyboard.press('ArrowLeft');assert.equal(await input.inputValue(),'34');await page.keyboard.press('Home');assert.equal(await input.inputValue(),'0');assert.equal(await lab.locator('#exit-out-value').textContent(),'0.0°');
 }
 // The overview and entry-point detail share a single selectable optical case.
 await page.waitForFunction(()=>document.querySelector('#oblique-lab')?.dataset.state==='idle');
 const shared=page.locator('#oblique-angle');await shared.fill('35');
 assert.ok(Number(await page.locator('#oblique-lab').getAttribute('data-outgoing'))<35);await page.locator('#oblique-medium-toggle [data-lab-medium=glass]').click();await page.waitForFunction(()=>document.querySelector('#oblique-lab').dataset.medium==='glass'&&document.querySelector('#oblique-lab').dataset.state==='idle');assert.ok(Number(await page.locator('#oblique-lab').getAttribute('data-outgoing'))<35);
 const source=page.locator('.oblique-source').first();await source.focus();await page.keyboard.press('Home');assert.equal(await shared.inputValue(),'0');
 await source.scrollIntoViewIfNeeded();const box=await source.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x-65,box.y+20,{steps:5});await page.mouse.up();assert.ok(Number(await shared.inputValue())>0);
 await page.locator('#reversibility-comparison summary').click();const original=await page.locator('#refract-scene .ray').first().getAttribute('d');await page.locator('#reverse-path').click();assert.match(await page.locator('#reverse-label').textContent(),/B 前往 A/);assert.notEqual(await page.locator('#refract-scene .ray').first().getAttribute('d'),original);await page.locator('#reverse-path').click();assert.equal(await page.locator('#refract-scene .ray').first().getAttribute('d'),original);
 const position=()=>page.locator('#depth-scene').evaluate(e=>[e.querySelector('.depth-coin').getAttribute('transform'),e.querySelector('.depth-apparent')?.getAttribute('cy')]);const initial=await position();await page.locator('#depth-input').fill('100');await page.locator('#depth-input').dispatchEvent('input');const deep=await position();assert.equal(initial[0],deep[0]);assert.notEqual(initial[1],deep[1]);await page.locator('#show-rays').uncheck();assert.equal(await page.locator('#depth-scene .extension').count(),0);await page.locator('#show-rays').check();assert.equal(await page.locator('#depth-scene .extension').count(),2);
 await page.waitForFunction(()=>document.querySelector('#rank-lab')?.dataset.ready==='true');
 await page.locator('#rank-play').click();await page.clock.runFor(4000);assert.equal(await page.locator('#rank-lab').getAttribute('data-state'),'complete');
 await page.locator('#rank-check').click();assert.match(await page.locator('#quiz-result').textContent(),/未放入/);
 for(const [slot,id] of [0,2,1,3].entries()){await page.locator(`[data-rank-medium="${id}"]`).click();await page.locator(`[data-rank-slot="${slot}"]`).click();}
 await page.locator('#rank-check').click();assert.equal(await page.locator('#quiz-result').getAttribute('data-result'),'retry');
 await page.locator('[data-rank-slot="2"]').focus();await page.keyboard.press('ArrowRight');assert.equal(await page.locator('#quiz-result').textContent(),'');
 await page.locator('#rank-check').click();assert.match(await page.locator('#quiz-result').textContent(),/排序正確/);
 await page.locator('#rank-new').click();assert.equal(await page.locator('#quiz-result').textContent(),'');assert.equal(await page.locator('.rank-slot[data-filled=true]').count(),0);assert.equal(await page.locator('#rank-check').isDisabled(),true);
 await page.locator('#s3').scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/unit43-desktop.png'});
 for(const width of [390,320]){
  await page.setViewportSize({width,height:844});await page.locator('#s1').scrollIntoViewIfNeeded();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`page overflow at ${width}`);
  await page.locator('#depth-input').fill('40');await page.locator('#depth-input').dispatchEvent('input');await page.locator('#s6').scrollIntoViewIfNeeded();assert.ok(await page.locator('#depth-input').isVisible());
  if(width===390)await page.screenshot({path:'/tmp/unit43-mobile.png'});
 }
 // Internal anchor targets and local assets must remain valid.
 assert.equal(await page.locator('nav a').evaluateAll(as=>as.filter(a=>!document.querySelector(a.hash)).length),0);
 assert.deepEqual(failures,[]);
});
