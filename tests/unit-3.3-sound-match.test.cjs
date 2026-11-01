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
 const resultFits=async state=>{
  for(const [width,height]of [[1440,900],[1366,768],[1280,720],[1024,768]]){
   await page.setViewportSize({width,height});await root.evaluate(n=>n.scrollIntoView({block:'start'}));
   const geometry=await root.evaluate(n=>{const box=n.getBoundingClientRect();return{height:box.height,overflow:document.documentElement.scrollWidth>innerWidth,outside:[...n.querySelectorAll('.match-head,.match-target,.match-wave-panel,.match-controls,.match-actions,#quiz-feedback,.match-hints,[data-match-result-action]')].filter(el=>{const r=el.getBoundingClientRect();return r.width&&(r.top<0||r.bottom>innerHeight||r.left<box.left||r.right>box.right+1);}).map(el=>el.className||el.id)};});
   assert.equal(geometry.overflow,false);assert.equal(await root.locator('button,output,h2,.match-control-title,#quiz-feedback,.match-hints p').evaluateAll(ns=>ns.some(n=>n.scrollWidth>n.clientWidth+1)),false);assert.deepEqual(geometry.outside,[],`${state} ${width}x${height}: complete activity and result fit`);assert.ok(geometry.height<=height-20);
   await page.screenshot({path:`${capture}/compact-${state}-${width}.png`});
  }
  await page.setViewportSize({width:1440,height:1000});
 };
 await t.test('initial screen has instrument listening above one editable wave, fixed step buttons and no answer reveal or autoplay',async()=>{
  const reference=await browser.newPage({viewport:{width:1440,height:1000}});
  try{
   await reference.goto(`http://127.0.0.1:${port}/units/2/parts/2.1/`,{waitUntil:'networkidle'});
   const format=p=>p.locator('#unit-quiz').evaluate(n=>{const pick=(el,keys)=>{const s=getComputedStyle(el);return Object.fromEntries(keys.map(k=>[k,s[k]]));};return{card:pick(n,['backgroundColor','color','border','borderRadius','boxShadow','lineHeight']),header:pick(n.querySelector('.quiz-head'),['display','gridTemplateColumns','columnGap','padding','borderBottom','backgroundColor']),mark:pick(n.querySelector('.quiz-mark'),['width','height','backgroundColor','color','borderRadius','fontSize']),title:pick(n.querySelector('h2'),['fontSize','lineHeight','color']),kicker:pick(n.querySelector('.quiz-kicker'),['fontSize','color','backgroundColor','letterSpacing']),bodyPadding:getComputedStyle(n.querySelector('.quiz-body,.match-body')).padding};});
   assert.deepEqual(await format(page),await format(reference),'quiz frame, header and palette match unit 2.1');
   assert.equal(await root.locator('.quiz-mark').innerText(),'?');
  }finally{await reference.close();}
  assert.equal(await page.locator('.quiz').count(),1);assert.equal(await root.locator('select').count(),0);assert.equal(await root.locator('input').count(),0);assert.equal(await root.locator('[data-play]').count(),2);assert.equal(await root.locator('[data-match-step]').count(),4);
  assert.equal(await root.locator('[data-match-picture]').getAttribute('data-instrument'),'string');assert.equal(await root.locator('.match-target svg.match-wave').count(),0);assert.equal(await root.locator('[data-match-target]').isHidden(),true);assert.equal(await root.locator('.match-result').isHidden(),true);
  assert.equal(await page.evaluate(()=>window.matchRuns.length),0);assert.equal(await plot.getAttribute('data-tone'),'pipe');assert.equal(await root.locator('[data-match-new]').isVisible(),true);assert.equal(await root.locator('[data-match-progress],[data-match-dots],[data-match-summary],[data-match-restart],[data-match-next]').count(),0);
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
 await t.test('comparison reveals the target only after both sounds were heard; edits retain the target and clear stale judgments',async()=>{
  await set('frequency',220);await root.locator('[type=submit]').click();assert.equal(await feedback.getAttribute('data-state'),'incomplete');assert.equal(await root.locator('[data-match-target]').isHidden(),true);
  await play('quiz-choice');await root.locator('[type=submit]').click();await page.waitForFunction(()=>document.querySelector('#unit-quiz').dataset.revealed==='true');assert.equal(await feedback.getAttribute('data-state'),'incorrect');assert.match(await root.locator('[data-match-hints]').innerText(),/增加頻率/);await root.screenshot({path:`${capture}/comparison-1440.png`});
  assert.equal(await root.locator('[data-match-result-action]').innerText(),'繼續調整');await resultFits('incorrect');const kept=await plot.locator('.signal').getAttribute('d'),target=await root.locator('[data-match-target]').getAttribute('d');
  await root.locator('[data-match-result-action]').click();assert.equal(await feedback.isHidden(),true);assert.equal(await plot.locator('.signal').getAttribute('d'),kept);assert.equal(await plot.getAttribute('data-frequency'),'220');assert.equal(await root.getAttribute('data-match-state'),'answering');
  const retained=async()=>{
   assert.equal(await root.locator('[data-match-target]').isVisible(),true);assert.equal(await root.locator('[data-match-target]').getAttribute('d'),target);
   assert.equal(await root.locator('[data-match-legend]').isVisible(),true);assert.equal(await root.getAttribute('data-revealed'),'true');
   assert.equal(await feedback.isHidden(),true);assert.equal(await feedback.getAttribute('data-state'),null);assert.equal(await root.locator('[data-match-hints]').innerText(),'');assert.equal(await root.locator('[data-match-result]').isHidden(),true);
  };
  await retained();const runs=await page.evaluate(()=>window.matchRuns.length);
  await set('frequency',330);await retained();await set('amplitude',.3);await retained();await switchTo('string');await retained();
  assert.equal(await page.evaluate(()=>window.matchRuns.length),runs,'editing does not autoplay');
  await root.locator('[type=submit]').click();assert.equal(await feedback.getAttribute('data-state'),'incomplete');assert.equal(await root.locator('[data-match-target]').getAttribute('d'),target);assert.equal(await root.locator('[data-match-target]').isVisible(),true);
  await play('quiz-choice');await root.locator('[type=submit]').click();await page.waitForFunction(()=>document.querySelector('#quiz-feedback').dataset.state==='incorrect');assert.match(await root.locator('[data-match-hints]').innerText(),/增加振幅/);
  await set('amplitude',.6);await retained();await play('quiz-choice');await root.locator('[type=submit]').click();await page.waitForFunction(()=>document.querySelector('#quiz-feedback').dataset.state==='correct');
  await resultFits('correct');
  await set('frequency',440);await retained();
  for(const [width,height]of [[1440,900],[1366,768]]){
   await page.setViewportSize({width,height});await root.evaluate(n=>n.scrollIntoView({block:'start'}));
   const fits=await root.evaluate(n=>n.querySelector('.match-actions').getBoundingClientRect().bottom<=innerHeight&&document.documentElement.scrollWidth<=innerWidth);assert.equal(fits,true,`retained target and controls fit ${width}x${height}`);
   await root.screenshot({path:`${capture}/retained-target-${width}.png`});
  }
  await page.setViewportSize({width:1440,height:1000});
 });
 const readGoal=async()=>{if(await root.getAttribute('data-match-playing')!=='quiz-base')await play('quiz-base');return root.evaluate(n=>({tone:n.dataset.tone,frequency:Number(n.dataset.frequency),amplitude:Number(n.dataset.amplitude)}));};
 const newQuestion=async()=>{await root.locator('[data-match-new]').click();await ready();assert.equal(await root.locator('[data-match-target]').getAttribute('d'),'');assert.equal(await root.locator('[data-match-legend]').isHidden(),true);assert.equal(await root.getAttribute('data-revealed'),'false');};
 await t.test('new question is always available before listening, during adjustment and playback, and after feedback',async()=>{
  await page.reload({waitUntil:'networkidle'});await ready();assert.equal(await page.evaluate(()=>window.matchRuns.length),0);
  await newQuestion();assert.equal(await page.evaluate(()=>window.matchRuns.length),0);assert.equal(await root.locator('[data-play=quiz-base]').evaluate(n=>document.activeElement===n),true);
  let goal=await readGoal();assert.notDeepEqual(goal,{tone:questions[0].tone,frequency:questions[0].frequency,amplitude:questions[0].amplitude});
  const before=await page.evaluate(()=>window.matchRuns.length);await newQuestion();assert.equal(await root.getAttribute('data-playing'),'false');assert.equal(await page.evaluate(()=>window.matchRuns.at(-1).stopped),true);assert.equal(await page.evaluate(()=>window.matchRuns.length),before);
  const next=await readGoal();assert.notDeepEqual(next,goal);goal=next;
  await set('frequency',220);await root.locator('[data-match-switch]').click();await ready();await newQuestion();
  assert.equal(await feedback.isHidden(),true);assert.equal(await root.locator('[data-match-target]').isHidden(),true);assert.equal(await root.locator('[data-match-result]').isHidden(),true);
  await root.locator('[type=submit]').click();assert.equal(await feedback.getAttribute('data-state'),'incomplete');await newQuestion();assert.equal(await feedback.isHidden(),true);
  goal=await readGoal();await play('quiz-choice');await root.locator('[type=submit]').click();await page.waitForFunction(()=>document.querySelector('#unit-quiz').dataset.revealed==='true');assert.equal(await feedback.getAttribute('data-state'),'incorrect');
  await newQuestion();assert.equal(await feedback.isHidden(),true);assert.equal(await root.getAttribute('data-match-state'),'answering');assert.equal(await root.getAttribute('data-playing'),'false');
  goal=await readGoal();const expected=questions.find(q=>q.tone===goal.tone&&q.frequency===goal.frequency&&q.amplitude===goal.amplitude);
  assert.equal(await plot.getAttribute('data-frequency'),String(expected.start.frequency));assert.equal(await plot.getAttribute('data-amplitude'),String(expected.start.amplitude));assert.equal(await plot.getAttribute('data-tone'),expected.start.tone);
 });
 await t.test('independent matching remains correct beyond four questions, with retry and no total score or final screen',async()=>{
  const seen=new Set();
  for(let i=0;i<7;i++){
   const goal=await readGoal(),key=JSON.stringify(goal);assert.equal(seen.has(key),false);seen.add(key);
   await switchTo(goal.tone);await set('frequency',goal.frequency);await set('amplitude',goal.amplitude);await play('quiz-choice');await root.locator('[type=submit]').click();await page.waitForFunction(()=>document.querySelector('#quiz-feedback').dataset.state==='correct');
   assert.equal(await root.locator('[data-match-target]').getAttribute('d'),await plot.locator('.signal').getAttribute('d'));assert.equal(await root.locator('[data-match-picture]').getAttribute('data-instrument'),goal.tone);
   assert.equal(await root.locator('[data-match-hints] [data-matched=true]').count(),3);assert.equal(await root.locator('[data-match-new]').isVisible(),true);
   assert.equal(await root.locator('[data-match-result-action]').innerText(),'再挑戰一題');
   if(i===0)await root.screenshot({path:`${capture}/correct-1440.png`});
   const before=await page.evaluate(()=>window.matchRuns.length);
   if(i%2===0){await root.locator('[data-match-result-action]').click();await ready();}else await newQuestion();
   assert.equal(await page.evaluate(()=>window.matchRuns.length),before);assert.equal(await root.getAttribute('data-playing'),'false');assert.equal(await root.locator('[data-match-target]').isHidden(),true);assert.equal(await root.locator('[data-match-target]').getAttribute('d'),'');assert.equal(await root.locator('[data-match-legend]').isHidden(),true);assert.equal(await root.locator('form').isVisible(),true);assert.equal(await feedback.isHidden(),true);assert.equal(await root.getAttribute('data-match-state'),'answering');
  }
  assert.equal(await root.locator('[data-match-progress],[data-match-summary],[data-match-dots]').count(),0);assert.doesNotMatch(await root.innerText(),/本輪結果|再挑戰一次|第 ?\d ?[／/] ?4 ?題/);
 });
 await t.test('switching, tuning, other sections, hidden tabs and leaving the page cancel audio without resuming it',async()=>{
  await play('quiz-choice');await root.locator('[data-match-switch]').click();assert.equal(await root.getAttribute('data-playing'),'false');await ready();
  await play('quiz-choice');await set('frequency',Number(await plot.getAttribute('data-frequency'))===550?440:550);assert.equal(await root.getAttribute('data-playing'),'false');
  await play('quiz-base');await page.locator('.route a[href="#card-02"]').click();assert.equal(await root.getAttribute('data-playing'),'false');await page.locator('.route a[href="#unit-quiz"]').click();assert.equal(await root.getAttribute('data-playing'),'false');
  await play('quiz-choice');await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));delete document.hidden;});assert.equal(await root.getAttribute('data-playing'),'false');
  await play('quiz-choice');await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));assert.equal(await root.getAttribute('data-playing'),'false');
 });
 await t.test('a pending audio resume is canceled by tuning and cannot start later',async()=>{
  await page.evaluate(()=>{window.originalResume=AudioContext.prototype.resume;AudioContext.prototype.resume=function(){return new Promise(resolve=>window.releaseMatch=()=>window.originalResume.call(this).then(resolve));};});
  const n=await page.evaluate(()=>window.matchRuns.length);await root.locator('[data-play=quiz-choice]').click();await page.waitForFunction(()=>!!window.releaseMatch);await set('amplitude',Number(await plot.getAttribute('data-amplitude'))===.6?.3:.6);await page.evaluate(()=>window.releaseMatch());await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>window.matchRuns.length),n);const after=await page.evaluate(()=>window.matchRuns.length);await root.locator('[data-play=quiz-choice]').click();await root.locator('[data-match-new]').click();await ready();await page.evaluate(()=>window.releaseMatch());await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>window.matchRuns.length),after);assert.equal(await root.getAttribute('data-playing'),'false');await page.evaluate(()=>AudioContext.prototype.resume=window.originalResume);
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
  await p.locator('[data-match-switch]').tap();await p.waitForFunction(()=>document.querySelector('#quiz-choice').dataset.tone==='pure');await p.locator('[data-play=quiz-choice]').tap();await p.waitForFunction(()=>document.querySelector('#unit-quiz').dataset.playing==='true');await p.locator('[data-play=quiz-choice]').tap();assert.equal(await p.locator('#unit-quiz').getAttribute('data-playing'),'false');
  await p.locator('[data-match-switch]').tap();await p.waitForFunction(()=>document.querySelector('#quiz-choice').dataset.tone==='string');
  for(let i=0;i<2;i++)await p.locator('[data-match-step=frequency][data-direction="-1"]').tap();await p.locator('[data-match-step=amplitude][data-direction="1"]').tap();await p.waitForFunction(()=>document.querySelector('#unit-quiz').dataset.waveReady==='true');
  for(const key of ['quiz-base','quiz-choice']){await p.locator(`[data-play="${key}"]`).tap();await p.waitForFunction(key=>document.querySelector('#unit-quiz').dataset.matchPlaying===key,key);}
  await p.locator('#unit-quiz [type=submit]').tap();await p.waitForFunction(()=>document.querySelector('#quiz-feedback').dataset.state==='correct');assert.equal(await p.locator('[data-match-result-action]').innerText(),'再挑戰一題');
  await p.locator('[data-match-result-action]').tap();await p.waitForFunction(()=>document.querySelector('#unit-quiz').dataset.waveReady==='true');assert.equal(await p.locator('#quiz-feedback').isHidden(),true);assert.equal(await p.locator('#unit-quiz').getAttribute('data-playing'),'false');
  for(let i=0;i<6;i++){
   await p.locator('[data-match-new]').tap();await p.waitForFunction(()=>document.querySelector('#unit-quiz').dataset.waveReady==='true');assert.equal(await p.locator('#unit-quiz').getAttribute('data-playing'),'false');assert.equal(await p.locator('#quiz-feedback').isHidden(),true);assert.equal(await p.locator('[data-match-new]').isVisible(),true);
  }
  await p.locator('#unit-quiz [type=submit]').tap();assert.equal(await p.locator('#quiz-feedback').getAttribute('data-state'),'incomplete');assert.equal(await p.locator('[data-match-summary]').count(),0);await context.close();
 });
 await t.test('a retained target survives an edited waveform load failure and retry; a new question hides it again',async()=>{
  const context=await browser.newContext(),p=await context.newPage();let fail=true;
  try{
   await p.route('**/timbre-audio/pure.wav*',route=>fail?route.fulfill({status:503,body:'unavailable'}):route.continue());await p.goto(base+'#unit-quiz',{waitUntil:'networkidle'});
   const card=p.locator('#unit-quiz'),goal=card.locator('[data-match-target]');await p.waitForFunction(()=>document.querySelector('#unit-quiz').dataset.waveReady==='true');
   for(const key of ['quiz-base','quiz-choice']){await card.locator(`[data-play="${key}"]`).click();await p.waitForFunction(k=>document.querySelector('#unit-quiz').dataset.matchPlaying===k,key);}
   await card.locator('[type=submit]').click();await p.waitForFunction(()=>document.querySelector('#unit-quiz').dataset.revealed==='true');const d=await goal.getAttribute('d');
   await card.locator('[data-match-switch]').click();await p.waitForFunction(()=>document.querySelector('[data-match-load]').textContent.includes('暫時無法'));
   assert.equal(await goal.isVisible(),true);assert.equal(await goal.getAttribute('d'),d);assert.equal(await card.locator('#quiz-choice .signal').getAttribute('d'),'');assert.equal(await card.locator('[data-match-result]').isHidden(),true);
   fail=false;await card.locator('[data-play=quiz-choice]').click();await p.waitForFunction(()=>document.querySelector('#unit-quiz').dataset.waveReady==='true');assert.equal(await goal.getAttribute('d'),d);assert.equal(await goal.isVisible(),true);
   await card.locator('[data-match-new]').click();await p.waitForFunction(()=>document.querySelector('#unit-quiz').dataset.waveReady==='true');assert.equal(await goal.isHidden(),true);assert.equal(await goal.getAttribute('d'),'');assert.equal(await card.locator('[data-match-legend]').isHidden(),true);
  }finally{await context.close();}
 });
 if(!process.env.SOUND33_BASE_URL)await t.test('failed clip load leaves no fake wave and listening retries successfully',async()=>{
  const p=await browser.newPage();let fail=true;await p.route('**/timbre-audio/pipe.wav*',route=>fail?route.fulfill({status:503,body:'unavailable'}):route.continue());await p.goto(base+'#unit-quiz',{waitUntil:'networkidle'});await p.waitForFunction(()=>document.querySelector('[data-match-load]').textContent.includes('暫時無法'));
  assert.equal(await p.locator('#quiz-choice .signal').getAttribute('d'),'');fail=false;await p.locator('[data-play=quiz-choice]').click();await p.waitForFunction(()=>document.querySelector('#unit-quiz').dataset.playing==='true');await p.waitForFunction(()=>document.querySelector('#unit-quiz').dataset.waveReady==='true');assert.ok((await p.locator('#quiz-choice .signal').getAttribute('d')).length>100);await p.close();
 });
 if(!process.env.SOUND33_BASE_URL)await t.test('changing question during a slow clip download cancels stale playback and drawing',async()=>{
  const p=await browser.newPage();let held;await p.addInitScript(()=>{window.pendingStarts=0;const start=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(...a){window.pendingStarts++;return start.apply(this,a);};});
  await p.route('**/timbre-audio/pipe.wav*',route=>{held=route;});await p.goto(base+'#unit-quiz',{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>document.querySelector('#unit-quiz').dataset.matchState==='answering');
  await p.locator('[data-play=quiz-choice]').click();await p.waitForFunction(()=>document.querySelector('#unit-quiz .play-state').textContent.includes('準備'));await p.locator('[data-match-new]').click();
  assert.equal(await p.locator('#unit-quiz').getAttribute('data-playing'),'false');await held.continue();await p.waitForFunction(()=>document.querySelector('#unit-quiz').dataset.waveReady==='true');await p.waitForTimeout(150);assert.equal(await p.evaluate(()=>window.pendingStarts),0);assert.equal(await p.locator('#quiz-feedback').isHidden(),true);await p.close();
 });
 assert.deepEqual(errors,[]);
});
