const {test}=require('node:test'),assert=require('node:assert/strict'),{spawn}=require('node:child_process'),path=require('node:path'),fs=require('node:fs/promises'),{chromium}=require('playwright');
const baseOverride=process.env.REFLECTION_URL;
test('3.4 first lesson matches approved apparatus layout and has two synchronized playback entrances',{timeout:180000},async t=>{
 let server,base=baseOverride;
 if(!base){server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'../..')});t.after(()=>server.kill());const port=await new Promise((resolve,reject)=>{let out='';const timer=setTimeout(()=>reject(Error('server timeout')),5000);server.stdout.on('data',b=>{out+=b;const m=out.match(/port (\d+)/);if(m){clearTimeout(timer);resolve(m[1]);}});server.on('error',reject);});base=`http://127.0.0.1:${port}/k12-learning-demos/units/3/parts/3.4/`;}
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',...(baseOverride?{proxy:{server:process.env.HTTPS_PROXY||process.env.HTTP_PROXY}}:{})});t.after(()=>browser.close());
 const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 await page.addInitScript(()=>{
  window.__soundEvidence=[];window.__audioOutputs=[];
  const Native=window.AudioContext;
  window.AudioContext=class extends Native{
   createGain(){const gain=super.createGain(),connect=gain.connect.bind(gain),context=this;
    gain.connect=function(destination,...rest){if(destination===context.destination){const analyser=context.createAnalyser();analyser.fftSize=2048;connect(analyser);const record={gain,context,samples:[]};window.__audioOutputs.push(record);const data=new Float32Array(analyser.fftSize);const timer=setInterval(()=>{analyser.getFloatTimeDomainData(data);let peak=0;for(const sample of data)peak=Math.max(peak,Math.abs(sample));record.samples.push({time:context.currentTime,peak});},5);setTimeout(()=>clearInterval(timer),6500);}return connect(destination,...rest);};return gain;
   }
   createBufferSource(){const source=super.createBufferSource(),record={source,started:false,stopped:false,ended:false};window.__soundEvidence.push(record);
    const start=source.start.bind(source),stop=source.stop.bind(source),connect=source.connect.bind(source);
    source.connect=function(destination,...rest){if(destination.gain)record.gain=destination.gain.value;return connect(destination,...rest);};
    source.start=function(when,offset){record.started=true;record.when=when;record.offset=offset||0;return start(when,offset);};
    source.stop=function(...args){record.stopped=true;return stop(...args);};source.addEventListener('ended',()=>{record.ended=true;});return source;
   }
  };
 });
 await page.goto(base);await page.waitForFunction(()=>document.body.dataset.ready==='true');
 const root=page.locator('#reflection'),speaker=page.locator('#reflection-speaker'),emit=page.locator('[data-play=reflection]'),pause=page.locator('[data-pause=reflection]');
 const phase=()=>root.getAttribute('data-phase'),count=()=>root.getAttribute('data-emissions');
 await t.test('complete scene and Traditional Chinese text load, with no automatic animation or sound',async()=>{
  assert.match(await page.locator('#title-1').innerText(),/反射板/);assert.equal(await root.locator('.reflection-stages li').count(),3);
  const image=await root.locator('img').evaluate(n=>({loaded:n.complete&&n.naturalWidth>0,w:n.naturalWidth,h:n.naturalHeight}));assert.ok(image.loaded);assert.ok(image.w/image.h>1.7&&image.w/image.h<1.85);
  assert.equal(await page.locator('#audio-status,#reflection-audio-status,#reflection-hint,#s1 .model-note,[data-sound=reflection]').count(),0);assert.equal(await page.locator('#reflection-error').isVisible(),false);
  assert.equal(await phase(),'ready');assert.equal(await count(),'0');assert.equal(await pause.isDisabled(),true);assert.equal(await page.evaluate(()=>window.__soundEvidence.length),0);await fs.mkdir('/tmp/k12-34-s1-verified',{recursive:true});await page.locator('#s1').screenshot({path:'/tmp/k12-34-s1-verified/ready-1440.png'});
 });
 await t.test('clicking the pictured speaker emits exactly one original and its weaker delayed copy',async()=>{
  await speaker.click();assert.equal(await phase(),'playing');assert.equal(await count(),'1');await page.waitForFunction(()=>window.__soundEvidence.filter(n=>n.started).length===2);
  const evidence=await page.evaluate(()=>{const [a,b]=window.__soundEvidence;let peak=0;for(const v of a.source.buffer.getChannelData(0))peak=Math.max(peak,Math.abs(v));return{same:a.source.buffer===b.source.buffer,delay:b.when-a.when,gains:[a.gain,b.gain],duration:a.source.buffer.duration,peak};});
  assert.equal(evidence.same,true);assert.ok(Math.abs(evidence.delay-4.4)<.03);assert.equal(evidence.gains[0],1);assert.ok(Math.abs(evidence.gains[1]-.45)<1e-6);assert.ok(evidence.duration>.08&&evidence.duration<.1);assert.ok(evidence.peak>.9&&evidence.peak<=1);
  await pause.click();assert.equal(await phase(),'paused');
 });
 await t.test('final output contains both audible-strength pulses after all gain stages',async()=>{
  await emit.click();await page.waitForFunction(()=>document.getElementById('reflection').dataset.phase==='complete');
  const signal=await page.evaluate(()=>{const output=window.__audioOutputs.at(-1),[direct,echo]=window.__soundEvidence.slice(-2);const peakAt=event=>Math.max(0,...output.samples.filter(s=>s.time>=event.when&&s.time<event.when+.2).map(s=>s.peak));return{state:output.context.state,gain:output.gain.gain.value,direct:peakAt(direct),echo:peakAt(echo)};});
  assert.equal(signal.state,'running');assert.ok(Math.abs(signal.gain-.32)<1e-6);assert.ok(signal.direct>.28&&signal.direct<.34,JSON.stringify(signal));assert.ok(signal.echo>.12&&signal.echo<.16,JSON.stringify(signal));assert.ok(signal.echo<signal.direct);console.log('Measured final Web Audio output:',JSON.stringify(signal));
 });
 await t.test('the page has no web volume controls and keeps device-based volume adjustment',async()=>{
  assert.equal(await page.locator('#volume,#reflection-volume,.volume,.reflection-volume').count(),0);
  assert.doesNotMatch(await page.locator('body').innerText(),/示範音量|調高示範音量|音量已調整/);
 });
 await t.test('both entrances restart the same timeline and cancel earlier scheduled echoes',async()=>{
  await emit.click();await page.waitForTimeout(400);const oldCount=Number(await count());await speaker.click();assert.equal(Number(await count()),oldCount+1);assert.ok(Number(await root.getAttribute('data-progress'))<.12);
  await page.waitForTimeout(50);assert.equal(await page.evaluate(()=>window.__soundEvidence.slice(0,-2).every(n=>n.ended||n.stopped)),true);
  await emit.click();assert.equal(Number(await count()),oldCount+2);assert.ok(Number(await root.getAttribute('data-progress'))<.12);await pause.click();
 });
 await t.test('pause freezes waves and audio; resume preserves the emission count',async()=>{
  const held=await root.getAttribute('data-progress'),paths=await page.locator('#reflection-waves').innerHTML(),emissions=await count();await page.waitForTimeout(220);assert.equal(await root.getAttribute('data-progress'),held);assert.equal(await page.locator('#reflection-waves').innerHTML(),paths);assert.equal(await page.locator('body').getAttribute('data-audio-playing'),'false');
  await pause.click();await page.waitForTimeout(180);assert.ok(Number(await root.getAttribute('data-progress'))>Number(held));assert.equal(await count(),emissions);await pause.click();
 });
 await t.test('surface contact precedes return; receiver lights only when the returning sound arrives',async()=>{
  await emit.click();assert.equal(await root.getAttribute('data-stage'),'outbound');assert.equal(await root.locator('[aria-current=step]').getAttribute('data-reflection-step'),'1');
  await page.waitForFunction(()=>document.getElementById('reflection').dataset.stage==='surface');assert.equal(await root.locator('[aria-current=step]').getAttribute('data-reflection-step'),'2');assert.equal(await page.locator('#reflection-receiver-light circle').count(),0);
  await page.waitForFunction(()=>document.getElementById('reflection').dataset.stage==='returning');assert.equal(await root.locator('[aria-current=step]').getAttribute('data-reflection-step'),'3');assert.match(await page.locator('#reflection-direction').textContent(),/←/);assert.ok(await page.locator('#reflection-waves path').count()>0);
  await fs.mkdir('/tmp/k12-34-s1-verified',{recursive:true});await page.waitForTimeout(800);await pause.click();await page.locator('#s1').screenshot({path:'/tmp/k12-34-s1-verified/return-paused.png'});await pause.click();await page.waitForFunction(()=>document.getElementById('reflection').dataset.phase==='complete');assert.equal(await root.getAttribute('data-stage'),'received');assert.ok(await page.locator('#reflection-receiver-light circle').count()>0);assert.equal(await pause.isDisabled(),true);
 });
 await t.test('pause and changing sections/background stop playback without a separate sound switch',async()=>{
  await emit.click();await page.waitForFunction(()=>document.body.dataset.audioPlaying==='true');await pause.click();assert.equal(await page.locator('body').getAttribute('data-audio-playing'),'false');await emit.click();
  await page.locator('[data-play=distance]').click();assert.equal(await phase(),'paused');await speaker.click();assert.equal(await page.locator('#distance').getAttribute('data-phase'),'paused');
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});assert.equal(await phase(),'paused');assert.equal(await page.locator('body').getAttribute('data-audio-playing'),'false');await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});assert.equal(await phase(),'paused');
 });
 await t.test('keyboard Enter and Space activate the real speaker hit area once each',async()=>{
  const before=Number(await count());await speaker.focus();await page.keyboard.press('Enter');assert.equal(Number(await count()),before+1);await page.keyboard.press('Space');assert.equal(Number(await count()),before+2);await pause.click();
 });
 await t.test('the scene, phase strip, controls and explanation all remain within the right content column',async()=>{
  for(const width of[1440,1280,1024,768,390,320]){await page.setViewportSize({width,height:1100});const layout=await page.locator('#s1').evaluate(n=>{const main=n.querySelector('.card-main').getBoundingClientRect();const selectors=['.reflection-lab','.reflection-scene','.reflection-stages','.reflection-controls'];return{overflow:document.documentElement.scrollWidth>innerWidth,main:{left:main.left,right:main.right},boxes:selectors.map(s=>{const r=n.querySelector(s).getBoundingClientRect();return{selector:s,left:r.left,right:r.right};})};});assert.equal(layout.overflow,false,width+' page overflow');for(const box of layout.boxes){assert.ok(box.left>=layout.main.left-1,`${width} ${box.selector} crossed left column`);assert.ok(box.right<=layout.main.right+1,`${width} ${box.selector} crossed right boundary`);}if([1440,1024,390].includes(width))await page.locator('#s1').screenshot({path:`/tmp/k12-34-s1-verified/section-${width}.png`});}
 });
 await t.test('touch and reduced-motion still allow explicit speaker playback and pause',async()=>{
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce'});try{const p=await context.newPage();await p.goto(base);await p.waitForFunction(()=>document.body.dataset.ready==='true');await p.addInitScript(()=>{const Native=AudioContext;window.AudioContext=class extends Native{constructor(...args){super(...args);window.__touchAudio=this;}};});await p.reload();await p.waitForFunction(()=>document.body.dataset.ready==='true');await p.locator('#reflection-speaker').tap();await p.waitForFunction(()=>window.__touchAudio?.state==='running'&&document.body.dataset.audioPlaying==='true');await p.waitForTimeout(120);assert.ok(Number(await p.locator('#reflection').getAttribute('data-progress'))>0);assert.equal(await p.locator('#reflection').getAttribute('data-emissions'),'1');await p.locator('[data-pause=reflection]').tap();assert.equal(await p.locator('#reflection').getAttribute('data-phase'),'paused');}finally{await context.close();}
 });
 await t.test('blocked or stalled audio shows a visible retry message rather than a false playback success',async()=>{
  for(const stalled of[false,true]){const p=await browser.newPage();try{await p.addInitScript(stalled=>{const Native=AudioContext;window.AudioContext=class extends Native{resume(){return stalled?new Promise(()=>{}):Promise.reject(new DOMException('Not allowed','NotAllowedError'));}};},stalled);await p.goto(base);await p.waitForFunction(()=>document.body.dataset.ready==='true');await p.locator('#reflection-speaker').click();await p.waitForFunction(()=>document.getElementById('reflection-error').textContent.includes('聲音未能啟用'));assert.equal(await p.locator('body').getAttribute('data-audio-playing'),'false');assert.ok(await p.locator('#reflection-error').isVisible());}finally{await p.close();}}
 });
 await t.test('prefixed Web Audio fallback can also emit from an explicit click',async()=>{
  const p=await browser.newPage();try{await p.addInitScript(()=>{window.webkitAudioContext=window.AudioContext;window.AudioContext=undefined;});await p.goto(base);await p.waitForFunction(()=>document.body.dataset.ready==='true');await p.locator('#reflection-speaker').click();await p.waitForFunction(()=>document.body.dataset.audioPlaying==='true');assert.equal(await p.locator('#reflection-error').isVisible(),false);}finally{await p.close();}
 });
 assert.deepEqual(errors,[]);
});
