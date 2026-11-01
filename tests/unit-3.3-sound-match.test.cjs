const {test}=require('node:test'),assert=require('node:assert/strict'),{spawn}=require('node:child_process'),path=require('node:path'),fs=require('node:fs/promises'),{chromium}=require('playwright');
test('sound-match assessment follows the approved layout and shares actual audio with its wave',{timeout:120000},async t=>{
 const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:['ignore','pipe','ignore']});t.after(()=>server.kill());
 const port=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server timeout')),5000);server.stdout.on('data',d=>{const m=String(d).match(/port (\d+)/);if(m){clearTimeout(timer);resolve(m[1]);}});server.once('error',reject);});
 const base=process.env.SOUND33_BASE_URL||`http://127.0.0.1:${port}/units/3/parts/3.3/`;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',...(process.env.SOUND33_BASE_URL?{proxy:{server:process.env.HTTPS_PROXY}}:{})});t.after(()=>browser.close());
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.matchRuns=[];const create=AudioContext.prototype.createBufferSource;AudioContext.prototype.createBufferSource=function(){const s=create.call(this),start=s.start.bind(s),stop=s.stop.bind(s);let entry;s.start=function(...args){entry={rate:s.buffer.sampleRate,data:Array.from(s.buffer.getChannelData(0)),stopped:false};window.matchRuns.push(entry);return start(...args);};s.stop=function(...args){if(entry)entry.stopped=true;return stop(...args);};return s;};});
 await page.goto(base+'#unit-quiz',{waitUntil:'networkidle'});
 const root=page.locator('#unit-quiz'),plot=root.locator('#quiz-choice'),feedback=root.locator('#quiz-feedback');
 const ready=()=>page.waitForFunction(()=>document.querySelector('#unit-quiz').dataset.waveReady==='true');
 const play=async key=>{await root.locator(`[data-play="${key}"]`).click();await page.waitForFunction(key=>document.querySelector('#unit-quiz').dataset.matchPlaying===key,key);};
 const levels=(await import('../units/3/parts/3.3/assets/sound-match-model.mjs')).MATCH_LEVELS;
 const set=async(id,value)=>{
  assert.ok(levels[id].includes(value));await ready();
  for(let i=0;i<levels[id].length;i++){
   const current=Number(await plot.getAttribute('data-'+id));if(current===value)return;
   await root.locator(`[data-match-step="${id}"][data-direction="${value>current?1:-1}"]`).click();await ready();
  }
  assert.equal(Number(await plot.getAttribute('data-'+id)),value);
 };
 const switchTo=async tone=>{for(let i=0;i<3&&await plot.getAttribute('data-tone')!==tone;i++){await root.locator('[data-match-switch]').click();await ready();}assert.equal(await plot.getAttribute('data-tone'),tone);};
 const questions=(await import('../units/3/parts/3.3/assets/sound-match-model.mjs')).MATCH_QUESTIONS;
 const capture=process.env.MATCH_CAPTURE_DIR||'/tmp/unit33-sound-match';await fs.mkdir(capture,{recursive:true});await ready();
 await t.test('initial screen has instrument listening above one editable wave, fixed step buttons and no answer reveal or autoplay',async()=>{
  assert.equal(await page.locator('.quiz').count(),1);assert.equal(await root.locator('select').count(),0);assert.equal(await root.locator('input').count(),0);assert.equal(await root.locator('[data-play]').count(),2);assert.equal(await root.locator('[data-match-step]').count(),4);
  assert.equal(await root.locator('[data-match-picture]').getAttribute('data-instrument'),'string');assert.equal(await root.locator('.match-target svg.match-wave').count(),0);assert.equal(await root.locator('[data-match-target]').isHidden(),true);assert.equal(await root.locator('.match-result').isHidden(),true);
  assert.equal(await page.evaluate(()=>window.matchRuns.length),0);assert.equal(await plot.getAttribute('data-tone'),'pipe');assert.equal(await root.locator('[data-match-dots] span').count(),4);
  assert.ok(await root.locator('[data-match-picture] image').count());await root.screenshot({path:`${capture}/initial-1440.png`});
 });
 await t.test('shape switch changes timbre without changing frequency or amplitude; both step controls redraw the actual selected signal',async()=>{
  const before=await plot.locator('.signal').getAttribute('d');await root.locator('[data-match-switch]').click();await ready();assert.notEqual(await plot.locator('.signal').getAttribute('d'),before);assert.equal(await plot.getAttribute('data-frequency'),'440');assert.equal(await plot.getAttribute('data-amplitude'),'0.3');
  await set('frequency',660);assert.equal(await plot.getAttribute('data-frequency'),'660');await set('amplitude',.9);assert.equal(await plot.getAttribute('data-amplitude'),'0.9');assert.equal(await page.evaluate(()=>window.matchRuns.length),0);
 });
 await t.test('listen controls toggle, actual playback PCM exactly matches all plotted points, and amplitude doubles samples',async()=>{
  await switchTo('pure');await set('frequency',440);await set('amplitude',.3);await play('quiz-choice');
  const points=await plot.locator('.signal').evaluate(n=>[...n.getAttribute('d').matchAll(/[ML]([\d.]+) ([-\d.]+)/g)].map(m=>m.slice(1).map(Number)));
  const run=await page.evaluate(()=>window.matchRuns.at(-1));assert.equal(run.rate,48000);
  for(const [x,y] of points){const i=Math.round((.2+(x-8)/884*.01)*run.rate);assert.ok(Math.abs(y-(70-100*run.data[i]))<.0001);}
  await root.locator('[data-play=quiz-choice]').click();assert.equal(await root.getAttribute('data-playing'),'false');assert.equal(await root.locator('[data-play=quiz-choice]').getAttribute('aria-pressed'),'false');
  await set('amplitude',.6);await play('quiz-choice');const doubled=await page.evaluate(()=>window.matchRuns.at(-1));for(let i=0;i<run.data.length;i+=97)assert.ok(Math.abs(doubled.data[i]-2*run.data[i])<1e-7);
  await play('quiz-base');const runs=await page.evaluate(()=>window.matchRuns.slice(-2));assert.equal(runs[0].stopped,true);assert.equal(await root.locator('[data-play=quiz-choice]').getAttribute('aria-pressed'),'false');
  await page.waitForFunction(()=>document.querySelector('#unit-quiz').dataset.playing==='false');assert.equal(await root.locator('[data-play=quiz-base] [data-match-play-label]').innerText(),'聽目標聲音');
 });
 await t.test('comparison reveals the target only after both sounds were heard; feedback is specific and editing clears stale results',async()=>{
  await set('frequency',220);await root.locator('[type=submit]').click();assert.equal(await feedback.getAttribute('data-state'),'incomplete');assert.equal(await root.locator('[data-match-target]').isHidden(),true);
  await play('quiz-choice');await root.locator('[type=submit]').click();await page.waitForFunction(()=>document.querySelector('#unit-quiz').dataset.revealed==='true');assert.equal(await feedback.getAttribute('data-state'),'incorrect');assert.match(await root.locator('[data-match-hints]').innerText(),/增加頻率/);await root.screenshot({path:`${capture}/comparison-1440.png`});
  await set('frequency',330);assert.equal(await feedback.isHidden(),true);assert.equal(await root.locator('[data-match-target]').isHidden(),true);assert.equal(await root.locator('[data-match-result]').isHidden(),true);
 });
 await t.test('all four tasks support successful matching, correct instruments and progress, summary and fresh restart',async()=>{
  for(let i=0;i<4;i++){
   const q=questions[i];await switchTo(q.tone);await set('frequency',q.frequency);await set('amplitude',q.amplitude);
   await play('quiz-base');assert.equal(await root.getAttribute('data-frequency'),String(q.frequency));await play('quiz-choice');await root.locator('[type=submit]').click();await page.waitForFunction(()=>document.querySelector('#quiz-feedback').dataset.state==='correct');
   assert.equal(await root.locator('[data-match-target]').getAttribute('d'),await plot.locator('.signal').getAttribute('d'));assert.equal(await root.locator('[data-match-picture]').getAttribute('data-instrument'),q.tone);
   assert.equal(await root.locator('[data-match-hints] [data-matched=true]').count(),3);assert.equal(await root.locator('[data-match-dots] .passed').count(),i+1);
   await root.locator('[data-match-next]').click();if(i<3){await ready();assert.equal(await root.locator('[data-match-progress]').innerText(),`第 ${i+2}／4 題`);assert.equal(await feedback.isHidden(),true);assert.equal(await root.locator('[data-play=quiz-base]').evaluate(n=>document.activeElement===n),true);}
  }
  assert.match(await feedback.innerText(),/4 題中有 4 題/);await root.locator('[data-match-next]').click();await ready();assert.equal(await root.locator('[data-match-dots] .passed').count(),0);assert.equal(await root.locator('[data-match-progress]').innerText(),'第 1／4 題');assert.equal(await root.locator('[data-match-target]').isHidden(),true);
 });
 await t.test('switching, tuning, other sections, hidden tabs and leaving the page cancel audio without resuming it',async()=>{
  await play('quiz-choice');await root.locator('[data-match-switch]').click();assert.equal(await root.getAttribute('data-playing'),'false');await ready();
  await play('quiz-choice');await set('frequency',550);assert.equal(await root.getAttribute('data-playing'),'false');
  await play('quiz-base');await page.locator('.route a[href="#card-02"]').click();assert.equal(await root.getAttribute('data-playing'),'false');await page.locator('.route a[href="#unit-quiz"]').click();assert.equal(await root.getAttribute('data-playing'),'false');
  await play('quiz-choice');await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));delete document.hidden;});assert.equal(await root.getAttribute('data-playing'),'false');
  await play('quiz-choice');await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));assert.equal(await root.getAttribute('data-playing'),'false');
 });
 await t.test('a pending audio resume is canceled by tuning and cannot start later',async()=>{
  await page.evaluate(()=>{window.originalResume=AudioContext.prototype.resume;AudioContext.prototype.resume=function(){return new Promise(resolve=>window.releaseMatch=()=>window.originalResume.call(this).then(resolve));};});
  const n=await page.evaluate(()=>window.matchRuns.length);await root.locator('[data-play=quiz-choice]').click();await page.waitForFunction(()=>!!window.releaseMatch);await set('amplitude',.6);await page.evaluate(()=>window.releaseMatch());await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>window.matchRuns.length),n);await page.evaluate(()=>AudioContext.prototype.resume=window.originalResume);
 });
 await t.test('desktop and laptop keep the approved hierarchy and all activity controls in one viewport; mobile stays contained',async()=>{
  for(const [width,height] of [[1440,1000],[1366,768],[1280,720],[1024,768],[820,1000],[760,1000],[390,1000],[320,1000]]){
   await page.setViewportSize({width,height});await root.evaluate(n=>n.scrollIntoView({block:'start'}));assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   const metrics=await root.evaluate(n=>{const box=n.getBoundingClientRect(),a=n.querySelector('.match-target').getBoundingClientRect(),wave=n.querySelector('.match-wave').getBoundingClientRect(),end=n.querySelector('.match-actions').getBoundingClientRect();return {above:a.bottom<wave.top,top:box.top,bottom:end.bottom,clipped:[...n.querySelectorAll('button,input')].some(x=>{const r=x.getBoundingClientRect();return r.width>0&&(r.left<box.left||r.right>box.right+1||x.scrollWidth>x.clientWidth+1);})};});
   assert.equal(metrics.above,true);assert.equal(metrics.clipped,false,`${width}px controls stay inside`);if(width>=1024)assert.ok(metrics.bottom<=height,`${width}x${height}: activity bottom ${metrics.bottom}`);
   await root.screenshot({path:`${capture}/layout-${width}.png`});
  }
 });
 await t.test('fixed levels clamp at both ends, move by one position and never start audio',async()=>{
  const runs=await page.evaluate(()=>window.matchRuns.length);
  for(const key of ['frequency','amplitude']){
   for(const value of levels[key]){await set(key,value);assert.equal(await root.locator('#answer-'+key).innerText(),key==='frequency'?`${value} Hz`:value.toFixed(1));}
   assert.equal(await root.locator(`[data-match-step="${key}"][data-direction="1"]`).isDisabled(),true);
   await set(key,levels[key][0]);assert.equal(await root.locator(`[data-match-step="${key}"][data-direction="-1"]`).isDisabled(),true);
   assert.equal(await root.locator(`[data-match-levels="${key}"]`).count(),0);
  }
  assert.equal(await page.evaluate(()=>window.matchRuns.length),runs);assert.equal(await root.locator('input,[role=slider]').count(),0);
 });
 await t.test('step buttons and waveform switching support keyboard and real touch',async()=>{
  await page.setViewportSize({width:1440,height:1000});await set('frequency',440);
  await root.locator('[data-match-step=frequency][data-direction="1"]').focus();await page.keyboard.press('Enter');await ready();assert.equal(await plot.getAttribute('data-frequency'),'550');
  await root.locator('[data-match-step=frequency][data-direction="-1"]').focus();await page.keyboard.press('Space');await ready();assert.equal(await plot.getAttribute('data-frequency'),'440');
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const p=await context.newPage();await p.goto(base+'#unit-quiz',{waitUntil:'networkidle'});await p.waitForFunction(()=>document.querySelector('#unit-quiz').dataset.waveReady==='true');
  await p.locator('[data-match-step=frequency][data-direction="1"]').tap();await p.waitForFunction(()=>document.querySelector('#quiz-choice').dataset.frequency==='550');assert.equal(await p.locator('#answer-frequency').innerText(),'550 Hz');
  await p.locator('[data-match-switch]').tap();await p.waitForFunction(()=>document.querySelector('#quiz-choice').dataset.tone==='pure');await p.locator('[data-play=quiz-choice]').tap();await p.waitForFunction(()=>document.querySelector('#unit-quiz').dataset.playing==='true');await p.locator('[data-play=quiz-choice]').tap();assert.equal(await p.locator('#unit-quiz').getAttribute('data-playing'),'false');await context.close();
 });
 if(!process.env.SOUND33_BASE_URL)await t.test('failed clip load leaves no fake wave and listening retries successfully',async()=>{
  const p=await browser.newPage();let fail=true;await p.route('**/timbre-audio/pipe.wav*',route=>fail?route.fulfill({status:503,body:'unavailable'}):route.continue());await p.goto(base+'#unit-quiz',{waitUntil:'networkidle'});await p.waitForFunction(()=>document.querySelector('[data-match-load]').textContent.includes('暫時無法'));
  assert.equal(await p.locator('#quiz-choice .signal').getAttribute('d'),'');fail=false;await p.locator('[data-play=quiz-choice]').click();await p.waitForFunction(()=>document.querySelector('#unit-quiz').dataset.playing==='true');await p.waitForFunction(()=>document.querySelector('#unit-quiz').dataset.waveReady==='true');assert.ok((await p.locator('#quiz-choice .signal').getAttribute('d')).length>100);await p.close();
 });
 assert.deepEqual(errors,[]);
});
