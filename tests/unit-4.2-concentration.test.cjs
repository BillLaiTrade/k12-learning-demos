const {test}=require('node:test');const assert=require('node:assert/strict');const {spawn}=require('node:child_process');const path=require('node:path');const {chromium}=require('playwright');
test('4.2 direct weighing and ppm: science, interactions and approved layout',{timeout:180000},async t=>{
 const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:['ignore','pipe','ignore']});t.after(()=>server.kill());
 const port=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Server startup timeout')),5000);server.stdout.on('data',s=>{const m=String(s).match(/port (\d+)/);if(m){clearTimeout(timer);resolve(m[1]);}});server.on('error',reject);});
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-accelerated-2d-canvas']});t.after(()=>browser.close());
 const page=await browser.newPage({viewport:{width:1440,height:1100},hasTouch:true});const failures=[];
 page.on('pageerror',e=>failures.push(String(e)));page.on('requestfailed',r=>failures.push(r.url()));page.on('response',r=>{if(r.status()>=400)failures.push(r.url());});
 const url=`http://127.0.0.1:${port}/units/4/parts/4.2/`;
 await page.clock.install({time:new Date('2026-10-28T00:00:00Z')});await page.goto(url+'#s5',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#mix-lab').dataset.ready==='true');await page.clock.pauseAt(new Date('2026-10-28T00:01:00Z'));
 const lab=page.locator('#mix-lab'),spoon=page.locator('#mix-spoon'),pitcher=page.locator('#mix-pitcher');
 const state=()=>lab.evaluate(e=>({sugar:Number(e.dataset.sugar),water:Number(e.dataset.water),total:Number(e.dataset.total),percent:Number(e.dataset.percent),activity:e.dataset.activity}));
 const ppm=()=>page.locator('#ppm-lab').evaluate(e=>({ppm:Number(e.dataset.ppm),total:Number(e.dataset.totalMg),solvent:Number(e.dataset.solventMg)}));
 const advance=async ms=>{await page.clock.runFor(20);await page.clock.fastForward(ms);};
 const fresh=()=>page.locator('#mix-reset').click();
 const enter=async(kind,value)=>{await page.locator(`#mix-${kind}-input`).click();await page.locator('#mass-input').fill(value);await page.locator('#mass-form button[type=submit]').click();};
 const local=async(x,y)=>{await lab.scrollIntoViewIfNeeded();const r=await lab.boundingBox();return{x:r.x+r.width*x,y:r.y+r.height*y};};
 const dragTool=async(button,x,y)=>{await button.scrollIntoViewIfNeeded();const b=await button.boundingBox(),p=await local(x,y);await page.mouse.move(b.x+b.width*.5,b.y+b.height*.5);await page.mouse.down();await page.mouse.move(p.x,p.y,{steps:10});await page.mouse.up();};
 await t.test('independent ratio cases and input validation use solution mass as denominator',async()=>{
  const result=await page.evaluate(async()=>{const m=await import('./assets/concentration-state.js?v=apparatus-3');return{timing:[m.ACTION_MS.sugar,m.ACTION_MS.water,m.POUR_DELAY,m.POUR_RATE],cases:[[5,95],[3,97],[0,50],[20,50],[.1,149.9]].map(([s,w])=>m.concentrationState(s,w,3)),invalid:[m.massValue('sugar',''),m.massValue('water',0),m.massValue('sugar',21),m.massValue('water',Infinity)],micro:Array.from({length:11},(_,n)=>m.concentrationState(5,95,n))};});
  assert.deepEqual(result.timing,[1100,2600,650,4]);
  const expected=[[100,5],[100,3],[50,0],[70,20/70*100],[150,.1/150*100]];
  result.cases.forEach((v,i)=>{assert.equal(v.total,expected[i][0]);assert.ok(Math.abs(v.percent-expected[i][1])<1e-12);});assert.deepEqual(result.invalid,[null,null,null,null]);
  result.micro.forEach((v,n)=>{assert.equal(v.totalMg,1000000);assert.equal(v.solventMg+n,1000000);assert.equal(v.ppm,n);assert.equal(v.microPercent,n/10000);});
 });
 await t.test('initial approved scene has no sliders or old quiz, and uses official avatars',async()=>{
  assert.deepEqual(await state(),{sugar:5,water:95,total:100,percent:5,activity:'idle'});assert.deepEqual(await ppm(),{ppm:1,total:1000000,solvent:999999});
  assert.equal(await page.locator('#s5 input[type=range],#solution-q1,#check-concentration,#reset-concentration').count(),0);
  assert.equal(await page.locator('#mix-canvas').count(),1);assert.match(await page.locator('#s5 .speaker').first().evaluate(e=>getComputedStyle(e,'::before').backgroundImage),/shared-assets\/characters\/dialogue-character-avatars/);
  await advance(2000);assert.equal((await state()).sugar,5);
 });
 await t.test('spoon click adds mass with real changing pixels; weighed sugar and keyboard can take it back',async()=>{
  const before=await lab.screenshot();await spoon.click();await advance(350);const moving=await lab.screenshot();assert.notDeepEqual(before,moving);
  await advance(1000);assert.equal((await state()).sugar,6);assert.equal((await state()).total,101);assert.match(await page.locator('[data-mix=percent]').innerText(),/^5\.941%$/);
  await page.locator('#mix-sugar-pan').click();await advance(3000);assert.equal((await state()).sugar,5);
  await spoon.focus();await page.keyboard.press('ArrowDown');await advance(3000);assert.equal((await state()).sugar,4);
 });
 await t.test('rapid clicks do not lose or duplicate aliquots; reset cancels pending transfers',async()=>{
  await fresh();for(let i=0;i<3;i++)await spoon.click();await advance(3000);assert.equal((await state()).sugar,8);
  await spoon.click();await fresh();await advance(2000);assert.equal((await state()).sugar,5);assert.equal((await state()).activity,'idle');
 });
 await t.test('spoon drag deposits in the boat or returns to the sugar bowl; outside drops cancel',async()=>{
  await fresh();await dragTool(spoon,.36,.55);await advance(3000);assert.equal((await state()).sugar,6);
  await dragTool(spoon,.10,.58);await advance(3000);assert.equal((await state()).sugar,5);
  await dragTool(spoon,.70,.80);await advance(3000);assert.equal((await state()).sugar,5);
 });
 await t.test('pitcher tap, press-hold and release change water mass then stop without an extra click',async()=>{
  await fresh();await pitcher.click();await advance(3000);assert.equal((await state()).water,96);
  await pitcher.hover();await page.mouse.down();await advance(1200);const held=await state();assert.ok(held.water>97&&held.water<100);assert.equal(held.activity,'pouring-water');await page.mouse.up();
  const stopped=await state();await advance(1000);assert.deepEqual(await state(),stopped);
  await enter('water','149');await pitcher.hover();await page.mouse.down();await advance(2000);assert.equal((await state()).water,150);await page.mouse.up();await advance(1000);assert.equal((await state()).water,150);
 });
 await t.test('pitcher drag and keyboard fine adjustment work; canceled gestures never transfer mass',async()=>{
  await fresh();await dragTool(pitcher,.65,.42);await advance(3000);assert.equal((await state()).water,96);
  await pitcher.focus();await page.keyboard.press('ArrowDown');await advance(3000);assert.equal((await state()).water,95);
  const p=await spoon.boundingBox(),target=await local(.36,.55);await page.mouse.move(p.x+p.width/2,p.y+p.height/2);await page.mouse.down();await page.mouse.move(target.x,target.y,{steps:8});await page.keyboard.press('Escape');await page.mouse.up();await advance(3000);assert.equal((await state()).sugar,5);
 });
 await t.test('clicking the four real apparatus locations adds from supplies and removes from scales',async()=>{
  await fresh();assert.equal(await page.locator('.mix-mass-controls,.mix-mass-action').count(),0);
  for(const [id,kind,delta] of [['mix-sugar-source','sugar',1],['mix-sugar-pan','sugar',-1],['mix-pitcher','water',1],['mix-water-cup','water',-1]]){
   const button=page.locator('#'+id);assert.equal(await button.isVisible(),true);
   const before=(await state())[kind];await button.click();await advance(3000);assert.equal((await state())[kind],before+delta);
  }
  await page.locator('#mix-sugar-source').focus();await page.keyboard.press('Enter');await advance(3000);assert.equal((await state()).sugar,6);
  await page.locator('#mix-sugar-pan').tap();await advance(3000);assert.equal((await state()).sugar,5);
  await page.locator('#mix-water-cup').tap();await advance(3000);assert.equal((await state()).water,94);
 });
 await t.test('single pours remain observable for 2.6 seconds; removing water uses its own animation',async()=>{
  await fresh();await pitcher.click();
  await advance(900);const first=await state();assert.equal(first.activity,'pouring-water');assert.ok(first.water>95&&first.water<96);
  const early=await lab.screenshot();await advance(800);const later=await state();assert.equal(later.activity,'pouring-water');assert.ok(later.water>first.water);
  assert.notDeepEqual(early,await lab.screenshot());await lab.screenshot({path:'/tmp/concentration-slow-pour.png'});
  await advance(1200);assert.equal((await state()).water,96);assert.equal((await state()).activity,'idle');
  await page.locator('#mix-water-cup').click();await advance(1300);
  assert.equal((await state()).activity,'removing-water');assert.ok((await state()).water<96);await lab.screenshot({path:'/tmp/concentration-remove-water.png'});
  assert.equal(await lab.getAttribute('data-cup-lifted'),'true');assert.equal(await page.locator('[data-mix=water-read]').innerText(),'—');
  await advance(1500);assert.equal((await state()).water,95);assert.equal((await state()).activity,'idle');assert.equal(await lab.getAttribute('data-cup-lifted'),'false');assert.equal(await page.locator('[data-mix=water-read]').innerText(),'95.0 g');
 });
 await t.test('apparatus actions stop at recipe bounds and reset cancels a slow pour',async()=>{
  await enter('sugar','0');assert.equal(await page.locator('[data-mass-kind="sugar"][data-mass-delta="-1"]').isDisabled(),true);
  await enter('sugar','20');assert.equal(await page.locator('[data-mass-kind="sugar"][data-mass-delta="1"]').isDisabled(),true);
  await enter('water','50');assert.equal(await page.locator('#mix-water-cup').isDisabled(),true);
  await enter('water','150');await pitcher.click();await advance(3000);assert.equal((await state()).water,150);
  await fresh();await pitcher.click();await advance(1000);await fresh();await advance(4000);assert.equal((await state()).water,95);assert.equal((await state()).activity,'idle');
 });
 await t.test('the beaker visibly lifts and tips over the supply pitcher, then returns to the same scale',async()=>{
  await fresh();
  const poses=await page.evaluate(async()=>{const m=await import('./assets/concentration-renderer.js?v=apparatus-3');const a={kind:'water',delta:-1,start:0,duration:2600};return{home:m.beakerPose(null,0),start:m.beakerPose(a,0),mid:m.beakerPose(a,1300),end:m.beakerPose(a,2600)};});
  assert.deepEqual(poses.start,poses.home);assert.deepEqual(poses.end,poses.home);assert.ok(poses.mid.angle>1);assert.ok(poses.mid.y<poses.home.y-200);assert.ok(poses.mid.x>poses.home.x+100);
  await page.locator('#mix-water-cup').click();await advance(1300);const b=await page.locator('#mix-water-cup').boundingBox(),l=await lab.boundingBox();assert.ok(b.y<l.y+l.height*.25);await fresh();await advance(4000);assert.equal((await state()).water,95);assert.equal(await page.locator('[data-mix=water-read]').innerText(),'95.0 g');
 });
 await t.test('all four apparatus hitboxes are directly reachable by touch at narrow widths',async()=>{
  for(const width of [390,320]){
   await page.setViewportSize({width,height:1000});await fresh();
   for(const [id,kind,delta] of [['mix-sugar-source','sugar',1],['mix-sugar-pan','sugar',-1],['mix-pitcher','water',1],['mix-water-cup','water',-1]]){
    const before=(await state())[kind];await page.locator('#'+id).tap();await advance(3000);assert.equal((await state())[kind],before+delta,`${id} at ${width}`);
   }
  }
  await page.setViewportSize({width:1440,height:1100});
 });
 await t.test('scale inputs accept decimals, synchronize formula, reject bad values and support cancel',async()=>{
  await fresh();await enter('sugar','3');await enter('water','97');assert.equal((await state()).percent,3);assert.match(await page.locator('[data-mix=formula-total]').innerText(),/^100 克$/);
  await enter('sugar','0');assert.equal((await state()).percent,0);assert.match(await page.locator('[data-mix=total]').innerText(),/^水 /);
  await enter('sugar','2.5');assert.equal((await state()).sugar,2.5);
  await enter('water','0');assert.equal(await page.locator('#mass-dialog').isVisible(),true);assert.match(await page.locator('#mass-error').innerText(),/50–150/);assert.equal((await state()).water,97);await page.keyboard.press('Escape');
  await page.locator('#mix-sugar-input').click();await page.locator('#mass-input').fill('9');await page.locator('#mass-cancel').click();assert.equal((await state()).sugar,2.5);
  await enter('sugar','');assert.equal(await page.locator('#mass-dialog').isVisible(),true);await page.locator('#mass-cancel').click();
 });
 await t.test('formal mass-percent formula stands before the entire worked example and remains constant when the recipe changes',async()=>{
  await fresh();const formula=page.locator('#mass-percent-formula');
  assert.equal(await formula.isVisible(),true);assert.equal(await formula.locator('.num').innerText(),'溶質質量');assert.equal(await formula.locator('.den').innerText(),'溶液總質量');assert.match(await formula.innerText(),/× 100%/);
  assert.equal(await formula.evaluate(e=>{const result=document.querySelector('#s5 .live-result');return e.parentElement===result.parentElement&&e.nextElementSibling===result&&!result.contains(e)&&!!(e.compareDocumentPosition(result)&Node.DOCUMENT_POSITION_FOLLOWING);}),true);
  const original=await formula.innerText();await enter('sugar','3');await enter('water','97');assert.equal((await state()).percent,3);assert.equal(await formula.innerText(),original);assert.equal(await page.locator('[data-mix=formula-sugar]').innerText(),'3 克');assert.equal(await page.locator('[data-mix=formula-total]').innerText(),'100 克');
  for(const width of [1440,768,390,320]){
   await page.setViewportSize({width,height:1100});
   const fits=await formula.evaluate(e=>{const r=e.getBoundingClientRect();return e.scrollWidth<=e.clientWidth+1&&[...e.querySelectorAll('.formula-equation,.formula-name,.formula-ratio')].every(c=>{const b=c.getBoundingClientRect();return b.left>=r.left-.5&&b.right<=r.right+.5;});});assert.equal(fits,true,`formal formula fits at ${width}`);
   assert.equal(await formula.evaluate(e=>e.getBoundingClientRect().bottom<=document.querySelector('#s5 .live-result').getBoundingClientRect().top),true,`formula above full result at ${width}`);
   if(width===1440||width===390)await page.locator('#s5').screenshot({path:`/tmp/concentration-formula-first-${width}.png`});
  }
  await page.setViewportSize({width:1440,height:1100});await fresh();
 });
 await t.test('the one milligram observation works independently of the upper recipe',async()=>{
  await fresh();await page.locator('#ppm-milligram').click();assert.deepEqual(await ppm(),{ppm:1,total:1000000,solvent:999999});assert.equal((await state()).sugar,5);assert.equal((await state()).water,95);
  await fresh();assert.deepEqual(await ppm(),{ppm:1,total:1000000,solvent:999999});
 });
 await t.test('native controls also operate by real touch',async()=>{
  await fresh();await spoon.tap();await advance(3000);assert.equal((await state()).sugar,6);
  await page.locator('#ppm-milligram').tap();assert.equal((await ppm()).ppm,1);
  await page.locator('#mix-water-input').tap();assert.equal(await page.locator('#mass-dialog').isVisible(),true);await page.locator('#mass-cancel').tap();
 });
 await t.test('all content remains inside its column on desktop, tablet and mobile, including the physical ppm scene',async()=>{
  for(const width of [1440,1024,850,768,680,390,320]){
   await page.setViewportSize({width,height:1100});await fresh();
   assert.equal(await page.locator('#mix-sugar-source:visible,#mix-sugar-pan:visible,#mix-pitcher:visible,#mix-water-cup:visible').count(),4);
   const v=await page.locator('#s5').evaluate(card=>{const m=card.querySelector('.card-main').getBoundingClientRect();return{overflow:document.documentElement.scrollWidth>innerWidth,out:[...card.querySelector('.card-main').children].filter(e=>!e.classList.contains('mix-status')).some(e=>{const r=e.getBoundingClientRect();return r.left<m.left-.5||r.right>m.right+.5;})};});assert.equal(v.overflow,false,`viewport ${width}`);assert.equal(v.out,false,`content ${width}`);
   await enter('sugar','20');await enter('water','150');
   const row=await page.locator('#s5 .mass-equation').evaluate(el=>({width:el.clientWidth,scroll:el.scrollWidth}));assert.ok(row.scroll<=row.width+1,`maximum recipe fits mass row at ${width}`);
   if(width===390)await page.locator('#s5').screenshot({path:'/tmp/concentration-phone.png'});
  }
  await page.setViewportSize({width:1440,height:1100});await fresh();await page.locator('#s5').screenshot({path:'/tmp/concentration-desktop.png'});assert.deepEqual(failures,[]);
 });
 await t.test('loading failure reports an error but ppm and other lesson blocks remain usable',async()=>{
  for(const asset of ['concentration-tools.webp','concentration-workbench-empty.webp','concentration-beaker.webp']){
   const failed=await browser.newPage();try{await failed.route('**/'+asset,r=>r.abort());await failed.goto(url,{waitUntil:'domcontentloaded'});await failed.waitForFunction(()=>document.querySelector('#mix-lab').dataset.ready==='error');assert.match(await failed.locator('#mix-status').innerText(),/無法載入/);assert.equal(await failed.locator('#mix-spoon').isDisabled(),true);assert.equal(await failed.locator('.mix-target:disabled').count(),3);await failed.locator('#ppm-milligram').click();assert.equal(await failed.locator('#ppm-lab').getAttribute('data-ppm'),'1');await failed.waitForFunction(()=>document.querySelector('#evap-stage').dataset.ready==='true');assert.equal(await failed.locator('#evap-visual').isEnabled(),true);await failed.locator('[data-evap-step="2"]').click();await failed.waitForFunction(()=>document.querySelector('#evap-stage').dataset.step==='2');}finally{await failed.close();}
  }
 });
});
