const {test}=require('node:test'),assert=require('node:assert/strict'),{spawn}=require('node:child_process'),path=require('node:path');
const {chromium}=require('playwright');
const model=import('../units/3/parts/3.3/assets/model.mjs');
test('3.3 sound relationships and bounded audio match the displayed model',async()=>{
 const m=await model;assert.equal(m.stringFrequency(30,1),2*m.stringFrequency(60,1));assert.equal(m.stringFrequency(60,4),2*m.stringFrequency(60,1));assert.equal(m.tubeFrequency(30),2*m.tubeFrequency(60));
 assert.deepEqual([18,20,440,20000,25000].map(m.hearingBand),['low','audible','audible','audible','ultrasound']);
 const rms=a=>Math.sqrt(a.reduce((sum,x)=>sum+x*x,0)/a.length);
 const soft=m.soundSamples({frequency:440,amplitude:.3},48000),loud=m.soundSamples({frequency:440,amplitude:.7},48000);
 assert.ok(Math.abs(rms(loud)/rms(soft)-7/3)<.001);
 for(const tone of ['pure','string','pipe']){const a=m.soundSamples({frequency:440,amplitude:.9,tone},48000);assert.ok(a.every(x=>Number.isFinite(x)&&Math.abs(x)<=.2));assert.equal(a[0],0);assert.ok(Math.abs(a.at(-1))<.001);}
 const timbres=['pure','string','pipe'].map(tone=>rms(m.soundSamples({frequency:440,amplitude:.5,tone},48000)));assert.ok(Math.max(...timbres)/Math.min(...timbres)<1.02,'timbre examples have matched RMS levels');
 const target=m.challenge();assert.equal(m.checkSettings({},target),'incomplete');assert.equal(m.checkSettings({frequency:660,amplitude:.35,tone:'string'},target),'correct');assert.equal(m.checkSettings({frequency:440,amplitude:.7,tone:'pipe'},target),'incorrect');
});
test('3.3 seven learning blocks, sound, instruments and one final assessment',{timeout:90000},async t=>{
 const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:['ignore','pipe','ignore']});t.after(()=>server.kill());
 const port=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server timeout')),5000);server.stdout.on('data',d=>{const m=String(d).match(/port (\d+)/);if(m){clearTimeout(timer);resolve(m[1]);}});server.once('error',reject);});
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',...(process.env.SOUND33_BASE_URL?{proxy:{server:process.env.HTTPS_PROXY,bypass:'127.0.0.1,localhost'}}:{})});t.after(()=>browser.close());
 const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
 await page.addInitScript(()=>{window.audioRuns=[];const create=AudioContext.prototype.createBufferSource;AudioContext.prototype.createBufferSource=function(){const s=create.call(this),start=s.start.bind(s),stop=s.stop.bind(s);let entry;s.start=function(...args){const a=s.buffer.getChannelData(0),rate=s.buffer.sampleRate;let sum=0,crossings=0;for(let i=rate*.1|0;i<rate*.3;i++){sum+=a[i]**2;if(a[i-1]<0&&a[i]>=0)crossings++;}entry={rms:Math.sqrt(sum/(rate*.2)),frequency:crossings/.2,peak:a.reduce((peak,v)=>Math.max(peak,Math.abs(v)),0),stopped:false};window.audioRuns.push(entry);return start(...args);};s.stop=function(...args){if(entry)entry.stopped=true;return stop(...args);};return s;};});
 const base=process.env.SOUND33_BASE_URL||`http://127.0.0.1:${port}/units/3/parts/3.3/`;
 await page.goto(base,{waitUntil:'domcontentloaded'});await page.locator('#tone-pipe .signal').waitFor({state:'attached'});
 const set=async(id,value)=>{await page.locator('#'+id).fill(String(value));};
 const play=async key=>{await page.locator(`[data-play="${key}"]`).first().click();await page.waitForFunction(()=>document.querySelector('[data-playing=true]'));};
 await t.test('seven blocks and comparisons render without autoplay',async()=>{
  assert.equal(await page.locator('.lesson-card').count(),7);assert.equal(await page.locator('.quiz').count(),1);assert.equal(await page.locator('form').count(),1);assert.equal(await page.evaluate(()=>window.audioRuns.length),0);
  assert.equal(await page.locator('.wave .signal').count(),9);
  for(const href of await page.locator('.route a').evaluateAll(ns=>ns.map(n=>n.hash)))assert.equal(await page.locator(href).count(),1);
  assert.equal(await page.locator('#card-01 .speaker').first().evaluate(n=>getComputedStyle(n).backgroundImage.includes('dialogue-character-avatars')),true);
  assert.doesNotMatch(await page.locator('body').innerText(),/候選版|第八區|聽力保護|CARD 0/);
 });
 await t.test('fork strikes change audio amplitude at the same pitch and leave resettable observations',async()=>{
  assert.equal(await page.locator('#card-01 .fork-conclusion').isHidden(),true);
  await play('amplitude-reference');await page.waitForFunction(()=>document.querySelector('[data-fork-record="soft"]').dataset.observed==='true');
  await play('amplitude-live');await page.waitForFunction(()=>document.querySelector('[data-fork-record="strong"]').dataset.observed==='true');
  const runs=await page.evaluate(()=>window.audioRuns.slice(-2));assert.ok(Math.abs(runs[0].frequency-440)<10&&Math.abs(runs[1].frequency-440)<10);assert.ok(runs[1].rms/runs[0].rms>2.2);assert.equal(runs[0].stopped,true);
  assert.equal(await page.locator('#card-01 .fork-conclusion').isVisible(),true);
  assert.equal(await page.locator('#amplitude-reference').getAttribute('data-frequency'),'440');assert.equal(await page.locator('#amplitude-live').getAttribute('data-frequency'),'440');
  await page.locator('#card-01 .reset').click();assert.equal(await page.locator('#card-01 .fork-conclusion').isHidden(),true);assert.equal(await page.locator('[data-fork-record="soft"]').getAttribute('data-observed'),'false');assert.equal(await page.locator('#card-01 .stop').isDisabled(),true);
  await page.locator('[data-fork-strike="soft"]').focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('#card-01').dataset.forkState==='vibrating');await page.locator('#card-01 .stop').click();assert.equal(await page.locator('#fork-apparatus').getAttribute('data-displacement'),'0');
 });
 await t.test('frequency changes pitch and the plotted cycles with amplitude held fixed',async()=>{
  const before=await page.locator('#pitch-live .pitch-guide').getAttribute('d');
  for(let i=0;i<4;i++)await page.locator('[data-pitch-step="100"]').click();
  assert.match(await page.locator('#pitch-reading').textContent(),/800/);assert.notEqual(await page.locator('#pitch-live .pitch-guide').getAttribute('d'),before);assert.equal(await page.locator('#pitch-live').getAttribute('data-amplitude'),'.5');
  await play('pitch-live');assert.ok(Math.abs(await page.evaluate(()=>window.audioRuns.at(-1).frequency)-800)<10);
  await page.waitForFunction(()=>document.querySelector('#card-02').dataset.playing==='false');assert.equal(await page.locator('#pitch-live').getAttribute('data-progress'),'1');
  assert.equal(await page.locator('#card-02 .stop').count(),0);

 });
 await t.test('string and pipe controls produce independent physical comparisons and reset',async()=>{
  const guitar=page.locator('#card-03');
  assert.equal(await guitar.locator('[data-guitar-side=right] .guitar-frequency').innerText(),'220 Hz');
  await play('string-live');await page.waitForTimeout(100);assert.notEqual(await guitar.locator('[data-guitar-side=right] .guitar-scene').getAttribute('data-displacement'),'0');
  await guitar.locator('[data-guitar-reset]').click();assert.equal(await guitar.locator('[data-guitar-side=right] .guitar-scene').getAttribute('data-displacement'),'0');
  await guitar.locator('[data-guitar-mode=tension]').click();await guitar.locator('[data-guitar-tension=".25"]').click();assert.equal(await guitar.locator('[data-guitar-side=right] .guitar-scene').getAttribute('data-fret'),'0');
  await guitar.locator('[data-guitar-reset]').click();assert.equal(await guitar.locator('[data-guitar-side=right] .guitar-frequency').innerText(),'110 Hz');
  await play('pan-0');assert.equal(await page.locator('#pan-frequency').innerText(),'214.4 Hz');await page.locator('#card-04 [data-pan-reset]').click();assert.equal(await page.locator('#pan-frequency').innerText(),'428.8 Hz');assert.equal(await guitar.locator('[data-guitar-side=right] .guitar-scene').getAttribute('data-tension'),'1');
  await guitar.locator('[data-guitar-mode=length]').click();
 });
 await t.test('timbre changes waveform at the same fundamental; navigating or hiding stops audio',async()=>{
  const paths=await page.locator('#card-05 .signal').evaluateAll(ns=>ns.map(n=>n.getAttribute('d')));assert.equal(new Set(paths).size,3);
  await play('tone-string');assert.equal(await page.locator('#card-05').getAttribute('data-frequency'),'440');
  await page.locator('.route a[href="#card-06"]').click();assert.equal(await page.locator('#card-05').getAttribute('data-playing'),'false');
  await page.locator('.route a[href="#card-05"]').click();assert.equal(await page.locator('#card-05').getAttribute('data-playing'),'false');
  await play('tone-pipe');await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));delete document.hidden;});assert.equal(await page.locator('#card-05').getAttribute('data-playing'),'false');
 });
 await t.test('hearing exploration stays silent until played; knowledge and dBA remain readable',async()=>{
  const before=await page.evaluate(()=>window.audioRuns.length);
  await page.locator('[data-hearing-band]').focus();await page.keyboard.press('End');assert.equal(await page.locator('#hearing-frequency').innerText(),'20,000 Hz');assert.equal(await page.locator('#card-06').getAttribute('data-playing'),'false');
  await page.locator('.hearing-animals summary').click();assert.match(await page.locator('.hearing-animals').innerText(),/次聲波[\s\S]*超聲波/);await page.locator('.hearing-animals summary').click();
  await page.locator('.route a[href="#card-07"]').click();
  assert.deepEqual(await page.locator('#card-07 [data-decibel]').evaluateAll(nodes=>nodes.map(n=>Number(n.dataset.decibel))),[20,60,100]);assert.equal(await page.locator('#card-07 button,#card-07 input').count(),0);
  assert.equal(await page.locator('#card-07 .decibel-scene image').count(),3);const art=await page.evaluate(async()=>{const im=new Image();im.src=new URL('assets/decibel-scenes.png',location.href);await im.decode();return[im.naturalWidth,im.naturalHeight];});assert.deepEqual(art,[2172,724]);
  assert.match(await page.locator('#card-07').innerText(),/0 dB，不代表沒有聲音/);assert.match(await page.locator('#card-07').innerText(),/不代表聽起來大聲 3 倍/);assert.match(await page.locator('#card-07 .decibel-sources a').first().getAttribute('href'),/osha\.gov/);
  assert.equal(await page.evaluate(()=>window.audioRuns.length),before);assert.equal(await page.locator('#card-07 [data-play]').count(),0);
 });
 await t.test('one final task supports incomplete, incorrect, correct, editing, replay, clear and new requirements',async()=>{
  await page.locator('.route a[href="#unit-quiz"]').click();await page.locator('button[type=submit]').click();assert.equal(await page.locator('#quiz-feedback').getAttribute('data-state'),'incomplete');
  for(const[id,value]of [['frequency','440'],['amplitude','.6'],['tone','pipe']])await page.locator('#answer-'+id).selectOption(value);
  await page.locator('button[type=submit]').click();assert.equal(await page.locator('#quiz-feedback').getAttribute('data-state'),'incorrect');
  for(const[id,value]of [['frequency','660'],['amplitude','.35'],['tone','string']])await page.locator('#answer-'+id).selectOption(value);
  assert.equal(await page.locator('#quiz-feedback').isHidden(),true);await play('quiz-choice');assert.equal(await page.locator('#unit-quiz').getAttribute('data-frequency'),'660');await page.locator('button[type=submit]').click();assert.equal(await page.locator('#quiz-feedback').getAttribute('data-state'),'correct');
  await page.locator('#quiz-clear').click();assert.equal(await page.locator('#answer-tone').inputValue(),'');assert.equal(await page.locator('[data-play="quiz-choice"]').isDisabled(),true);const task=await page.locator('#quiz-task').textContent();await page.locator('#quiz-new').click();assert.notEqual(await page.locator('#quiz-task').textContent(),task);
 });
 await t.test('lesson format follows unit 2.1 with a header and full-width body; navigation tracks reading',async()=>{
  const reference=await browser.newPage({viewport:{width:1440,height:1100}});
  await reference.goto(`http://127.0.0.1:${port}/units/2/parts/2.1/`,{waitUntil:'domcontentloaded'});
  const format=p=>p.evaluate(()=>{
   const css=selector=>getComputedStyle(document.querySelector(selector));
   return {display:css('.lesson-card').display,padding:css('.lesson-card').padding,border:css('.lesson-card').borderRadius,headColumns:css('.lesson-head').gridTemplateColumns,headPadding:css('.lesson-head').padding,headGap:css('.lesson-head').columnGap,numberWidth:css('.lesson-number').width,numberHeight:css('.lesson-number').height,numberBackground:css('.lesson-number').backgroundColor,title:css('.lesson-head h2').fontSize,subtitle:css('.lesson-head p').fontSize,bodyPadding:css('.lesson-body').padding};
  });
  assert.deepEqual(await format(page),await format(reference));await reference.close();
  assert.equal(await page.locator('.card-side').count(),0);assert.equal(await page.locator('.lesson-head').count(),7);assert.equal(await page.locator('.lesson-number').count(),7);
  for(const card of await page.locator('.lesson-card').all()){
   assert.ok(await card.locator('.lesson-head p').textContent());
   const heading=await card.locator('.lesson-head h2').textContent(),id=await card.getAttribute('id');
   assert.equal(await page.locator(`.route a[href="#${id}"] span`).textContent(),heading);
  }
  await page.locator('#card-04').evaluate(n=>n.scrollIntoView({block:'start'}));
  await page.waitForFunction(()=>document.querySelector('.route a[aria-current="step"]').hash==='#card-04');
  await page.locator('.route a[href="#unit-quiz"]').click();
  assert.notEqual(await page.locator('.quiz-nav').evaluate(n=>getComputedStyle(n).backgroundColor),await page.locator('.route a[href="#card-01"]').evaluate(n=>getComputedStyle(n).backgroundColor));
 });
 await t.test('desktop, laptop and narrow layouts retain controls and anchors',async()=>{
  const fs=require('node:fs/promises'),capture=process.env.DECIBEL_CAPTURE_DIR||'/tmp/unit33-decibel-review';await fs.mkdir('/tmp/unit33-review',{recursive:true});await fs.mkdir(capture,{recursive:true});
  for(const width of [1024,1280,1440,1920,820,760,390,320]){
   await page.setViewportSize({width,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   const issues=await page.locator('.lesson-card').evaluateAll(cards=>cards.flatMap(card=>{
    const head=card.querySelector('.lesson-head'),main=card.querySelector('.lesson-body'),box=card.getBoundingClientRect(),a=head.getBoundingClientRect(),b=main.getBoundingClientRect();
    const inside=b.right<=box.right&&b.left>=box.left;
    const aligned=a.bottom<=b.top+1&&Math.abs(a.left-b.left)<1&&Math.abs(a.width-b.width)<1&&b.width>box.width*.97;
    const clipped=[...card.querySelectorAll('button,input,select,.dialogue')].some(n=>{const r=n.getBoundingClientRect();return r.width&& (r.left<box.left||r.right>box.right+1||n.scrollWidth>n.clientWidth+1);});
    return inside&&aligned&&!clipped?[]:[card.id];
   }));assert.deepEqual(issues,[],`all seven sections keep their content inside the card at ${width}px`);
   const scaleErrors=await page.locator('#card-07').evaluate(root=>{const scale=root.querySelector('.decibel-scale').getBoundingClientRect();return [...root.querySelectorAll('[data-decibel-marker]')].map(n=>{const r=n.getBoundingClientRect();return Math.abs(r.left+r.width/2-(scale.left+Number(n.dataset.decibelMarker)/120*scale.width));});});assert.ok(scaleErrors.every(n=>n<1),'markers reflect 20 / 60 / 100 on the common scale');
   assert.equal(await page.locator('#card-07 .decibel-card').evaluateAll(nodes=>nodes.some(n=>n.scrollWidth>n.clientWidth+1)),false);
   if([1440,1024,390].includes(width)){await page.setViewportSize({width,height:1800});await page.locator('#card-07').screenshot({path:`${capture}/decibel-${width}.png`});await page.setViewportSize({width,height:1000});}
   assert.equal(await page.locator('.wave-label').first().evaluate(n=>parseFloat(getComputedStyle(n).fontSize)>=12),true);
   await page.locator('.route a[href="#card-03"]').click();
   const anchored=await page.locator('#card-03').evaluate(n=>({top:n.getBoundingClientRect().top,navBottom:document.querySelector('.route').getBoundingClientRect().bottom}));
   if(width<=760)assert.ok(anchored.top>=anchored.navBottom,'sticky mobile navigation does not cover the section title');
   await page.locator('#card-03').screenshot({path:`/tmp/unit33-review/string-${width}.png`});
  }
  await page.setViewportSize({width:1440,height:1100});await page.locator('#card-01').screenshot({path:'/tmp/unit33-review/amplitude.png'});await page.locator('#unit-quiz').screenshot({path:'/tmp/unit33-review/quiz.png'});for(const n of ['04','05','06','07'])await page.locator('#card-'+n).screenshot({path:'/tmp/unit33-review/section-'+n+'.png'});await page.locator('.hero').screenshot({path:'/tmp/unit33-review/hero.png'});await page.screenshot({path:'/tmp/unit33-review/full.png',fullPage:true});
 });
 assert.deepEqual(errors,[]);
});
