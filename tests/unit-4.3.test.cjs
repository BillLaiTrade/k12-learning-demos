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
  const lab=page.locator(`[data-ray-lab=${id}]`);await lab.locator('#exit-medium-toggle [data-lab-medium=glass]').click();await page.waitForFunction(()=>document.querySelector('#exit-lab')?.dataset.state==='ready'&&document.querySelector('#exit-lab').dataset.medium==='glass');
  const input=lab.locator('.angle-input');await input.fill('35');await input.dispatchEvent('input');
  const out=Number((await lab.locator('.refracted-readout').textContent()).replace('°',''));assert.ok(id==='enter'?out<35:out>35);
  await lab.locator('.source').focus();await page.keyboard.press('ArrowLeft');assert.equal(await input.inputValue(),'34');await page.keyboard.press('Home');assert.equal(await input.inputValue(),'0');assert.equal(await lab.locator('.refracted-readout').textContent(),'0.0°');
 }
 // The overview and entry-point detail share a single selectable optical case.
 await page.waitForFunction(()=>document.querySelector('#oblique-lab')?.dataset.state==='idle');
 const shared=page.locator('#oblique-angle');await shared.fill('35');
 assert.ok(Number(await page.locator('#oblique-lab').getAttribute('data-outgoing'))<35);await page.locator('#oblique-medium-toggle [data-lab-medium=glass]').click();await page.waitForFunction(()=>document.querySelector('#oblique-lab').dataset.medium==='glass'&&document.querySelector('#oblique-lab').dataset.state==='idle');assert.ok(Number(await page.locator('#oblique-lab').getAttribute('data-outgoing'))<35);
 const source=page.locator('.oblique-source').first();await source.focus();await page.keyboard.press('Home');assert.equal(await shared.inputValue(),'0');
 await source.scrollIntoViewIfNeeded();const box=await source.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x-65,box.y+20,{steps:5});await page.mouse.up();assert.ok(Number(await shared.inputValue())>0);
 await page.locator('#reversibility-comparison summary').click();const original=await page.locator('#refract-scene .ray').first().getAttribute('d');await page.locator('#reverse-path').click();assert.match(await page.locator('#reverse-label').textContent(),/B 前往 A/);assert.notEqual(await page.locator('#refract-scene .ray').first().getAttribute('d'),original);await page.locator('#reverse-path').click();assert.equal(await page.locator('#refract-scene .ray').first().getAttribute('d'),original);
 const position=()=>page.locator('#depth-scene circle').evaluateAll(es=>es.slice(0,2).map(e=>[e.getAttribute('cx'),e.getAttribute('cy')]));const initial=await position();await page.locator('#depth-input').fill('100');await page.locator('#depth-input').dispatchEvent('input');const deep=await position();assert.deepEqual(initial[0],deep[0]);assert.notDeepEqual(initial[1],deep[1]);await page.locator('#show-rays').uncheck();assert.equal(await page.locator('#depth-scene .extension').count(),0);await page.locator('#show-rays').check();assert.equal(await page.locator('#depth-scene .extension').count(),2);
 await page.locator('#quiz button[type=submit]').click();assert.match(await page.locator('#quiz-result').textContent(),/未作答/);
 await page.locator('[name=q1][value=away]').check();await page.locator('[name=q2][value=turn]').check();await page.locator('[name=q3][value=float]').check();await page.locator('#quiz button[type=submit]').click();assert.equal(await page.locator('#quiz-result a').count(),3);
 for(const [i,value] of ['toward','speed','apparent'].entries())await page.locator(`[name=q${i+1}][value=${value}]`).check();assert.equal(await page.locator('#quiz-result').textContent(),'');await page.locator('#quiz button[type=submit]').click();assert.match(await page.locator('#quiz-result').textContent(),/三題都答對/);await page.locator('[name=q1][value=away]').check();assert.equal(await page.locator('#quiz-result').textContent(),'');await page.locator('#quiz button[type=reset]').click();assert.equal(await page.locator('#quiz input:checked').count(),0);
 await page.locator('#s3').scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/unit43-desktop.png'});
 for(const width of [390,320]){
  await page.setViewportSize({width,height:844});await page.locator('#s1').scrollIntoViewIfNeeded();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`page overflow at ${width}`);
  await page.locator('#depth-input').fill('40');await page.locator('#depth-input').dispatchEvent('input');await page.locator('#s6').scrollIntoViewIfNeeded();assert.ok(await page.locator('#depth-output').isVisible());
  if(width===390)await page.screenshot({path:'/tmp/unit43-mobile.png'});
 }
 // Internal anchor targets and local assets must remain valid.
 assert.equal(await page.locator('nav a').evaluateAll(as=>as.filter(a=>!document.querySelector(a.hash)).length),0);
 assert.deepEqual(failures,[]);
});
