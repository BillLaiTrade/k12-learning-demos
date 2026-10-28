const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');
const {chromium}=require('playwright');

test('4.2 unknown mixture investigation: open experimentation, evidence and layout',{timeout:240000},async t=>{
 const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:['ignore','pipe','pipe']});t.after(()=>server.kill());
 const port=await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Server timeout')),5000);server.stdout.on('data',data=>{const match=String(data).match(/port (\d+)/);if(match){clearTimeout(timeout);resolve(match[1]);}});server.on('error',reject);});
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});t.after(()=>browser.close());
 const page=await browser.newPage({viewport:{width:1440,height:1100},hasTouch:true});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 const url=`http://127.0.0.1:${port}/units/4/parts/4.2/`;
 await page.clock.install({time:new Date('2026-10-28T00:00:00Z')});await page.goto(url+'#unit-quiz');await page.waitForFunction(()=>document.querySelector('#invest-lab').dataset.ready==='true');await page.clock.pauseAt(new Date('2026-10-28T00:01:00Z'));
 const $=id=>page.locator('#invest-'+id),tool=kind=>page.locator(`[data-invest-tool="${kind}"]`).last();
 const advance=async ms=>{await page.clock.runFor(30);await page.clock.fastForward(ms);await page.clock.runFor(30);};
 const state=()=>$('lab').evaluate(e=>({...e.dataset}));
 const act=async(kind)=>{await (kind==='sample'?$('take'):kind==='settle'?$('settle'):tool(kind)).click();await advance(kind==='sample'?3000:kind==='settle'?5800:kind==='filter'?6800:kind==='heat'?11000:2100);assert.equal((await state()).busy,'false');};
 const reset=async()=>{await $('reset').click();if(await $('reset-dialog').isVisible())await page.locator('#invest-reset-dialog button[value=reset]').click();};
 const record=async()=>{await $('record').click();return page.locator('.invest-note').last().getAttribute('data-record');};
 const capture=async name=>{await page.locator('#unit-quiz').screenshot({path:`/tmp/investigation-${name}.png`});};

 await t.test('initial view has a clear sample action, stored tools and a closed notebook',async()=>{
  assert.equal((await state()).sampleCount,'0');assert.equal(await $('cup').isVisible(),true);assert.equal(await $('notebook').getAttribute('open'),null);assert.equal(await $('report').isVisible(),false);
  assert.match(await $('take').innerText(),/取一份試試/);assert.match(await page.locator('#unit-quiz .speaker').evaluate(e=>getComputedStyle(e,'::before').backgroundImage),/shared-assets\/characters\/dialogue-character-avatars/);
  assert.equal(await page.locator('.route-inner a[href="#unit-quiz"]').count(),1);assert.equal(await page.locator('#unit-quiz input[type=range]').count(),0);await capture('initial-desktop');
  assert.equal(await page.locator('#unit-quiz>.quiz-head .quiz-kicker').innerText(),'單元小測');assert.equal(await page.locator('#unit-quiz>.card-side').count(),0);assert.equal(await page.locator('#unit-quiz').evaluate(e=>e.classList.contains('unit-quiz')&&!e.classList.contains('lesson-card')),true);
  const residue=await page.evaluate(async()=>{
   const renderer=await import('./assets/investigation-renderer.js?v=pour-3'),model=await import('./assets/investigation-state.js?v=lab-1');
   const [table,atlas,glass]=await Promise.all(['investigation-table.webp','investigation-apparatus.webp','concentration-beaker.webp'].map(file=>renderer.loadPicture(new URL('./assets/'+file,location.href))));
   const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d'),fill=ctx.fill.bind(ctx);let white=0;
   ctx.fill=(...args)=>{if(['#fffef8','#e6e2d5','#fbfaf5','#d7d1c1'].includes(ctx.fillStyle))white++;return fill(...args);};
   const view=renderer.createRenderer(canvas,{table,atlas,glass});view.render({sample:null,stock:0,animation:null});const empty=white;white=0;
   const dry=model.finishTest(model.finishTest(model.newSample(1),'filter').sample,'heat').sample;view.render({sample:dry,stock:0,animation:null});return{empty,dry:white};
  });assert.equal(residue.empty,0,'the initial empty beaker contains no drawn crystals');assert.ok(residue.dry>0,'dry material remains visible after an actual experiment');
 });
 await t.test('navigation matches the four learning sections after the redundant methods quiz is removed',async()=>{
  const links=await page.locator('.route-inner a:not(.quiz-nav)').evaluateAll(anchors=>anchors.map(a=>({href:a.getAttribute('href'),label:a.querySelector('span').textContent,title:document.querySelector(a.getAttribute('href')).querySelector('.card-main>h2').textContent})));
  assert.equal(links.length,4);assert.deepEqual(links.map(link=>link.href),['#s1','#s2','#s3','#s5']);for(const link of links)assert.equal(link.label,link.title,link.href);
  assert.deepEqual(await page.locator('.lesson-card .card-number').allTextContents(),['01','02','03','04']);
  assert.equal(await page.locator('#s4,#q-filter,#q-crystal,#q-paper,#check-answers,#reset-answers,#quiz-feedback').count(),0);
  assert.equal(await page.locator('.route-inner a.quiz-nav span').innerText(),'單元小測');assert.equal(await page.locator('.route-inner a.quiz-nav').evaluate(e=>parseFloat(getComputedStyle(e).borderTopWidth)>0),true);
  await page.evaluate(()=>document.documentElement.style.scrollBehavior='auto');
  for(const [i,link] of links.entries()){
   await page.locator(`.route-inner a[href="${link.href}"]`).click();await page.clock.runFor(200);
   assert.equal(await page.locator('.route-inner a[aria-current=step]').getAttribute('href'),link.href);
   assert.equal(await page.locator('#route-progress').innerText(),`目前位置：第 ${String(i+1).padStart(2,'0')}／04 個學習區塊`);
   const top=await page.locator(link.href).evaluate(e=>e.getBoundingClientRect().top);assert.ok(top>=0&&top<100,`anchor ${link.href} at ${top}`);
  }
  await page.locator('.route-inner a.quiz-nav').focus();await page.keyboard.press('Enter');await page.clock.runFor(200);
  assert.equal(await page.locator('.route-inner a[aria-current=step]').getAttribute('href'),'#unit-quiz');assert.equal(await page.locator('#route-progress').innerText(),'目前位置：單元小測');
  await page.evaluate(()=>document.documentElement.style.scrollBehavior='');
 });
 await t.test('mass is conserved across filtration; evaporation removes only water',async()=>{
  const model=await page.evaluate(async()=>{const m=await import('./assets/investigation-state.js?v=lab-1');const raw=m.newSample(1),settled=m.finishTest(raw,'settle').sample,filtered=m.finishTest(raw,'filter').sample,again=m.finishTest(filtered,'filter').sample,dry=m.finishTest(filtered,'heat').sample,direct=m.finishTest(raw,'heat').sample;return {raw,settled,filtered,again,dry,direct,masses:[raw,settled,filtered,dry,direct].map(m.totalMass),blocked:m.canTest(direct,'filter')};});
  assert.deepEqual(model.masses,[102,102,100,5,7]);assert.equal(model.filtered.salt,5);assert.equal(model.filtered.water,95);assert.deepEqual(model.filtered.residues,[2]);assert.deepEqual(model.again.residues,[2,0]);assert.equal(model.dry.water,0);assert.equal(model.direct.sand,2);assert.match(model.blocked,/乾燥/);assert.equal(model.raw.events.length,0);
 });
 await t.test('sampling joins the moving bottle lip to the cup and conserves liquid including flight time',async()=>{
  const issues=await page.evaluate(async()=>{
   const m=await import('./assets/investigation-transfer.js?v=pour-3'),errors=[];
   const area=points=>Math.abs(points.reduce((a,p,i)=>{const q=points[(i+1)%points.length];return a+p.x*q.y-q.x*p.y;},0))/2;
   for(const reduced of [false,true])for(let stock=0;stock<6;stock++){
    let previousSource=stock+1,previousCup=0;
    for(let i=0;i<=200;i++){
     const t=i/200,f=m.samplingFrame(t,stock,reduced),pose=f.pose,c=Math.cos(pose.angle),s=Math.sin(pose.angle),mouth={x:pose.x+73*c+218*s,y:pose.y+73*s-218*c};
     const check=(ok,text)=>{if(!ok)errors.push(`${stock}/${reduced}/${t}: ${text}`);};
     check(Math.abs(f.sourcePortions+f.received+f.inTransit-stock-1)<1e-10,'conservation');
     check(f.inTransit>=-1e-12&&f.received<=f.emitted+1e-12,'no spontaneous liquid');
     check(f.sourcePortions<=previousSource+1e-12&&f.received>=previousCup-1e-12,'monotone transfer');
     if(t<=.28)check(f.emitted===0&&f.received===0&&!f.stream,'no flow before tilting');
     if(t>=.735)check(!f.stream&&f.received===1,'flow ends before bottle returns');
     if(f.stream){
      check(pose.angle>Math.PI/4,'source must actually tilt, including reduced motion');
      check(Math.hypot(f.stream.mouth.x-mouth.x,f.stream.mouth.y-mouth.y)<1e-8,'lip is transformed from glass');
      check(Math.abs(mouth.x-714)<1e-6&&Math.abs(mouth.y-(450+34*Math.max(0,1-f.sourcePortions)))<1e-6,'pour point stays over the cup');
      check(f.stream.target.x>650&&f.stream.target.x<820&&f.stream.target.y>520&&f.stream.target.y<750,'stream ends in cup');
      const line=m.bottleLiquid(pose,f.sourcePortions);
      if(f.sourcePortions>1e-5)check(Math.abs(line.line-mouth.y)<.02,'liquid reaches the real lip');
     }
     const liquid=m.bottleLiquid(pose,f.sourcePortions);
     check(Math.abs(area(liquid.filled)/area(liquid.shape)-f.sourcePortions/6*.67)<1e-6,'horizontal liquid area');
     for(const x of [-160,160])for(const y of [-250,250]){const px=pose.x+x*c-y*s,py=pose.y+x*s+y*c;check(px>=0&&px<=1536&&py>=0&&py<=1024,'bottle stays inside scene');}
     previousSource=f.sourcePortions;previousCup=f.received;
    }
   }return errors.slice(0,15);
  });assert.deepEqual(issues,[]);
 });
 await t.test('actual canvas strokes start at the same photographic bottle lip in normal and reduced motion',async()=>{
  const problems=await page.evaluate(async()=>{
   const r=await import('./assets/investigation-renderer.js?v=pour-3'),m=await import('./assets/investigation-state.js?v=lab-1');
   const [table,atlas,glass]=await Promise.all(['investigation-table.webp','investigation-apparatus.webp','concentration-beaker.webp'].map(file=>r.loadPicture(new URL('./assets/'+file,location.href))));
   const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d'),strokes=[],poses=[],errors=[];
   const image=ctx.drawImage.bind(ctx),begin=ctx.beginPath.bind(ctx),move=ctx.moveTo.bind(ctx),line=ctx.lineTo.bind(ctx),stroke=ctx.stroke.bind(ctx);let path=[];
   ctx.drawImage=(...args)=>{if(args[0]===atlas&&args[1]===260&&args[2]===20){const p=new DOMPoint(73,-218).matrixTransform(ctx.getTransform());poses.push({x:p.x,y:p.y});}return image(...args);};
   ctx.beginPath=()=>{path=[];return begin();};ctx.moveTo=(x,y)=>{path.push({x,y});return move(x,y);};ctx.lineTo=(x,y)=>{path.push({x,y});return line(x,y);};ctx.stroke=(...args)=>{if(ctx.lineWidth===8)strokes.push([...path]);return stroke(...args);};
   const renderer=r.createRenderer(canvas,{table,atlas,glass});
   for(const reduced of [false,true])for(const stock of [0,3,5])for(const t of [0,.12,.27,.30,.36,.5,.65,.70,.75,.9,1]){
    strokes.length=0;poses.length=0;const f=renderer.render({sample:m.newSample(1),stock,animation:{kind:'sample',start:0,duration:2800,reduced}},t*2800);
    if(poses.length!==2||Math.hypot(poses[0].x-poses[1].x,poses[0].y-poses[1].y)>.0001)errors.push('duplicate glass poses');
    if(f.stream){if(strokes.length!==1)errors.push('missing jet');if(f.stream.tail===0&&Math.hypot(strokes[0][0].x-poses[0].x,strokes[0][0].y-poses[0].y)>.0001)errors.push(`disconnected jet ${stock}/${reduced}/${t}`);}
    else if(strokes.length)errors.push(`phantom jet ${stock}/${reduced}/${t}`);
   }return errors;
  });assert.deepEqual(problems,[]);
 });
 let rawHeatRecord,filterRecord,saltRecord,validSample;
 await t.test('students can heat the raw sample first, keep mixed residue and measure seven grams',async()=>{
  await act('sample');await tool('heat').click();await advance(4300);const early=await $('canvas').screenshot();assert.equal((await state()).busy,'true');await advance(3000);assert.notDeepEqual(await $('canvas').screenshot(),early);await advance(4000);
  assert.equal((await state()).phase,'dry-raw');assert.match(await $('status').innerText(),/白色固體與褐色顆粒/);rawHeatRecord=await record();await act('weigh');assert.match(await $('status').innerText(),/7 克/);
  await tool('filter').click();assert.equal((await state()).busy,'false');assert.match(await $('status').innerText(),/無法直接倒入濾紙/);
 });
 await t.test('separate aliquots retain their own results and can be revisited in any order',async()=>{
  await act('sample');assert.equal((await state()).active,'2');await act('settle');assert.equal((await state()).phase,'settled');await record();await page.locator('[data-sample="1"]').click();assert.equal((await state()).phase,'dry-raw');await page.locator('[data-sample="2"]').click();assert.equal((await state()).phase,'settled');
 });
 await t.test('filtration retains particles and dissolved material passes into the filtrate',async()=>{
  await act('sample');validSample=(await state()).active;await act('filter');assert.equal((await state()).phase,'filtered');assert.match(await $('status').innerText(),/褐色顆粒留在濾紙/);filterRecord=await record();await act('weigh');assert.match(await $('status').innerText(),/100 克/);await record();await capture('filtered-desktop');
 });
 await t.test('evaporating that filtrate leaves white solid; its dry net mass is five grams',async()=>{
  await act('heat');assert.equal((await state()).phase,'dry-filtered');assert.match(await $('status').innerText(),/蒸乾後留下白色固體/);saltRecord=await record();await act('weigh');assert.match(await $('status').innerText(),/5 克/);await record();
 });
 await t.test('notes store real observations and editable student text without duplicate event records',async()=>{
  assert.equal(await $('record').isDisabled(),true);const count=await page.locator('.invest-note').count();await page.locator('.invest-note textarea').first().fill('直接加熱後兩種固體仍混在一起。');assert.equal(await page.locator('.invest-note').count(),count);
  await page.locator('[data-sample="1"]').click();await $('event').selectOption('1-1');assert.equal(await $('record').isDisabled(),true);await page.locator('[data-sample="'+validSample+'"]').click();await $('event').selectOption(`${validSample}-1`);assert.equal(await $('record').isDisabled(),true);
 });
 await t.test('report checks evidence, not a guessed list of ingredients',async()=>{
  await $('report').locator('button[type=submit]').click();assert.equal(await $('feedback').getAttribute('data-result'),'revise');
  for(const key of ['sand','salt','water']){await page.locator(`[name=component][value=${key}]`).check();await $(`evidence-${key}`).selectOption(rawHeatRecord);}
  await $('report').locator('button[type=submit]').click();assert.equal(await $('feedback').getAttribute('data-result'),'revise');assert.match(await $('feedback').innerText(),/混合殘渣還不能分辨/);
  await $('evidence-sand').selectOption(filterRecord);await $('evidence-salt').selectOption(saltRecord);await $('evidence-water').selectOption(rawHeatRecord);await $('report').locator('button[type=submit]').click();assert.equal(await $('feedback').getAttribute('data-result'),'correct');assert.match(await $('feedback').innerText(),/候選成分範圍/);assert.match(await $('feedback').innerText(),/不能.*直接鑑定食鹽/);
 });
 await t.test('optional concentration uses the same aliquot, excludes sand and accepts both units',async()=>{
  await page.locator('.invest-concentration>summary').click();await $('include-concentration').check();await $('concentration-sample').selectOption(validSample);assert.equal(await $('solution-mass').innerText(),'100 克');assert.equal(await $('solute-mass').innerText(),'5 克');
  await $('concentration-value').fill('4.901960784');await $('report').locator('button[type=submit]').click();assert.equal(await $('feedback').getAttribute('data-result'),'revise');
  await $('concentration-value').fill('5');await $('report').locator('button[type=submit]').click();assert.equal(await $('feedback').getAttribute('data-result'),'correct');assert.match(await $('feedback').innerText(),/50,000 ppm/);
  await $('concentration-unit').selectOption('ppm');assert.equal(await $('feedback').isVisible(),false);await $('concentration-value').fill('50000');await $('report').locator('button[type=submit]').click();assert.equal(await $('feedback').getAttribute('data-result'),'correct');
  await $('concentration-sample').selectOption('1');await $('report').locator('button[type=submit]').click();assert.equal(await $('feedback').getAttribute('data-result'),'revise');assert.match(await $('feedback').innerText(),/含泥沙/);await $('include-concentration').uncheck();await capture('notebook-desktop');
 });
 await t.test('editing or removing a note withdraws an old result and updates evidence choices',async()=>{
  await $('report').locator('button[type=submit]').click();assert.equal(await $('feedback').isVisible(),true);await page.locator('.invest-note textarea').first().fill('補充：白色固體和褐色顆粒仍混合。');assert.equal(await $('feedback').isVisible(),false);
  const count=await page.locator('.invest-note').count();await page.locator('.invest-note').first().locator('button').click();assert.equal(await page.locator('.invest-note').count(),count-1);assert.equal(await $('evidence-water').inputValue(),'');
 });
 await t.test('dragging apparatus to the active sample works, and outside or canceled drops do nothing',async()=>{
  await reset();await act('sample');const drag=async(cancel=false,outside=false)=>{await tool('filter').scrollIntoViewIfNeeded();const b=await tool('filter').boundingBox(),r=await $('picture').boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(outside?r.x+10:r.x+r.width*.48,outside?r.y+10:r.y+r.height*.5,{steps:10});if(cancel)await page.keyboard.press('Escape');await page.mouse.up();};
  await drag(false,true);assert.equal((await state()).phase,'raw');assert.equal((await state()).busy,'false');await drag(true);assert.equal((await state()).busy,'false');assert.equal(await page.locator('.invest-drag-ghost').count(),0);await page.clock.runFor(550);await drag();await advance(7000);assert.equal((await state()).phase,'filtered');
 });
 await t.test('keyboard and real touch can start experiments without dragging',async()=>{
  await reset();await $('take').focus();await page.keyboard.press('Enter');await advance(3000);assert.equal((await state()).sampleCount,'1');await tool('weigh').focus();await page.keyboard.press('Space');await advance(2100);assert.match(await $('status').innerText(),/102 克/);
  await page.setViewportSize({width:390,height:950});await tool('filter').scrollIntoViewIfNeeded();await tool('filter').tap();await advance(7000);assert.equal((await state()).phase,'filtered');
  await tool('heat').scrollIntoViewIfNeeded();const b=await tool('heat').boundingBox(),r=await $('picture').boundingBox();const cdp=await page.context().newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.width/2,y:b.y+b.height/2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:r.x+r.width*.48,y:r.y+r.height*.5}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await advance(11000);assert.equal((await state()).phase,'dry-filtered');await cdp.detach();await page.setViewportSize({width:1440,height:1100});
 });
 await t.test('reset confirmation preserves work on cancel and cancels unfinished work on reset',async()=>{
  await reset();await $('take').click();await advance(700);assert.equal((await state()).busy,'true');await $('reset').click();await page.locator('#invest-reset-dialog button[value=cancel]').click();assert.equal((await state()).sampleCount,'1');await $('reset').click();await page.locator('#invest-reset-dialog button[value=reset]').click();await advance(15000);assert.equal((await state()).sampleCount,'0');assert.equal((await state()).busy,'false');assert.equal(await $('notebook').getAttribute('open'),null);assert.equal(await page.locator('.invest-note').count(),0);
 });
 await t.test('depleted stock can be explicitly replenished without deleting samples or notes',async()=>{
  for(let i=0;i<6;i++)await act('sample');assert.equal((await state()).stock,'0');assert.equal((await state()).sampleCount,'6');assert.match(await $('take').innerText(),/補充同批/);await $('take').click();assert.equal((await state()).stock,'6');assert.equal((await state()).sampleCount,'6');await act('sample');assert.equal((await state()).sampleCount,'7');await act('settle');await record();
 });
 await t.test('experiments pause while the page is hidden and resume without jumping to the result',async()=>{
  await tool('filter').click();await advance(1000);await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});await advance(30000);assert.equal((await state()).busy,'true');await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});await advance(6500);assert.equal((await state()).busy,'false');assert.equal((await state()).phase,'filtered');
 });
 await t.test('initial and expanded layouts fit seven viewports and use the existing content column',async()=>{
  await reset();
  for(const width of [1440,1024,850,768,680,390,320]){
   await page.setViewportSize({width,height:1100});const result=await page.locator('#unit-quiz').evaluate(card=>{const main=card.querySelector('.card-main').getBoundingClientRect();return{overflow:document.documentElement.scrollWidth>innerWidth,escaped:[...card.querySelector('.card-main').children].some(e=>{const r=e.getBoundingClientRect();return r.width>0&&(r.left<main.left-.5||r.right>main.right+.5);}),buttons:[...card.querySelectorAll('.invest-tools button,#invest-take')].map(b=>{const r=b.getBoundingClientRect();return{width:r.width,height:r.height};})};});assert.equal(result.overflow,false,`overflow ${width}`);assert.equal(result.escaped,false,`column ${width}`);assert.ok(result.buttons.every(b=>b.width>=40&&b.height>=35),`targets ${width}`);
   if(width===390)await capture('initial-mobile');
  }
  await act('sample');await act('filter');await record();await $('notebook').evaluate(e=>e.open=true);await page.locator('.invest-concentration>summary').click();
  for(const width of [1440,1024,850,768,680,390,320]){await page.setViewportSize({width,height:1100});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`expanded ${width}`);if(width===390)await capture('notebook-mobile');}
 });
 await t.test('asset failures keep controls safe and retry recovers without breaking other lessons',async()=>{
  const p=await browser.newPage();const block=route=>route.abort();await p.route('**/investigation-apparatus.webp',block);await p.goto(url+'#unit-quiz');await p.waitForFunction(()=>document.querySelector('#invest-lab').dataset.ready==='error');assert.equal(await p.locator('#invest-take').isDisabled(),true);assert.equal(await p.locator('#invest-retry').isVisible(),true);assert.equal(await p.locator('#mix-reset').isEnabled(),true);await p.unroute('**/investigation-apparatus.webp',block);await p.locator('#invest-retry').click();await p.waitForFunction(()=>document.querySelector('#invest-lab').dataset.ready==='true');assert.equal(await p.locator('#invest-take').isEnabled(),true);await p.close();
 });
 await t.test('reduced motion and pointer cancellation leave a usable, clean activity',async()=>{
  const p=await browser.newPage({reducedMotion:'reduce'});await p.clock.install({time:new Date('2026-10-28T00:00:00Z')});await p.goto(url+'#unit-quiz');await p.waitForFunction(()=>document.querySelector('#invest-lab').dataset.ready==='true');await p.clock.pauseAt(new Date('2026-10-28T00:01:00Z'));await p.locator('#invest-take').click();await p.clock.fastForward(3500);await p.clock.runFor(40);assert.equal(await p.locator('#invest-lab').getAttribute('data-busy'),'false');
  const reducedErrors=[];p.on('pageerror',error=>reducedErrors.push(String(error)));await p.locator('[data-invest-tool=filter]').hover();await p.mouse.down();await p.locator('[data-invest-tool=filter]').dispatchEvent('pointercancel',{pointerId:1});await p.mouse.up();assert.equal(await p.locator('#invest-lab').getAttribute('data-phase'),'raw');assert.equal(await p.locator('#invest-lab').getAttribute('data-busy'),'false');assert.deepEqual(reducedErrors,[]);await p.close();
  assert.deepEqual(errors,[]);
 });
});
