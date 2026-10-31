const {test}=require('node:test'),assert=require('node:assert/strict'),{spawn}=require('node:child_process'),path=require('node:path'),fs=require('node:fs/promises'),{chromium}=require('playwright');
const override=process.env.DISTANCE_URL;
test('3.4 distance comparison follows the approved real-time virtual-lab mockup',{timeout:180000},async t=>{
 let server,base=override;
 if(!base){server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'../..')});t.after(()=>server.kill());const port=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server timeout')),5000);server.stdout.on('data',b=>{const m=String(b).match(/port (\d+)/);if(m){clearTimeout(timer);resolve(m[1]);}});});base=`http://127.0.0.1:${port}/k12-learning-demos/units/3/parts/3.4/`;}
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',...(override?{proxy:{server:process.env.HTTPS_PROXY||process.env.HTTP_PROXY}}:{})});t.after(()=>browser.close());
 const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 await page.addInitScript(()=>{
  window.__sources=[];window.__outputs=[];const Native=AudioContext;
  window.AudioContext=class extends Native{
   createGain(){const gain=super.createGain(),connect=gain.connect.bind(gain),context=this;gain.connect=function(destination,...rest){if(destination===context.destination){const analyser=context.createAnalyser();analyser.fftSize=2048;connect(analyser);const record={gain,context,samples:[]};window.__outputs.push(record);const data=new Float32Array(2048),timer=setInterval(()=>{analyser.getFloatTimeDomainData(data);let peak=0;for(const x of data)peak=Math.max(peak,Math.abs(x));record.samples.push({time:context.currentTime,peak});},5);setTimeout(()=>clearInterval(timer),6500);}return connect(destination,...rest);};return gain;}
   createBufferSource(){const source=super.createBufferSource(),record={source,ended:false,stopped:false},start=source.start.bind(source),stop=source.stop.bind(source),connect=source.connect.bind(source);window.__sources.push(record);source.connect=function(destination,...rest){if(destination.gain)record.gain=destination.gain.value;return connect(destination,...rest);};source.start=function(when,offset){record.when=when;record.offset=offset||0;return start(when,offset);};source.stop=function(...args){record.stopped=true;return stop(...args);};source.addEventListener('ended',()=>record.ended=true);return source;}
  };
 });
 await page.goto(base+'#s2');await page.waitForFunction(()=>document.body.dataset.ready==='true');
 const root=page.locator('#distance'),emit=page.locator('[data-play=distance]'),pause=page.locator('[data-pause=distance]'),slider=page.locator('#wall-distance'),wall=page.locator('#distance-wall');
 const phase=()=>root.getAttribute('data-phase'),count=()=>root.getAttribute('data-emissions');
 const select=async value=>slider.fill(String(value));
 const stage=name=>page.locator(`#distance-${name}-lane`).getAttribute('data-stage');
 await fs.mkdir('/tmp/k12-34-virtual-verified',{recursive:true});
 await t.test('two stacked scenes load with real separate apparatus, synchronized distance controls and no unsolicited audio controls',async()=>{
  assert.match(await root.locator('.distance-lab-heading').innerText(),/虛擬聲波實驗室/);assert.equal(await root.locator('.distance-speed').count(),0);assert.doesNotMatch(await root.innerText(),/原速播放|放慢|慢動作/);assert.equal(await root.locator('input[type=number]').inputValue(),'680');assert.equal(await root.locator('img[src*=distance-corridor]').count(),0);assert.equal(await root.locator('img[src*=distance-virtual-lab]').count(),2);
  assert.equal(await root.locator('.distance-lane').count(),2);assert.equal(await root.locator('input[type=range]').count(),1);assert.equal(await root.locator('[data-sound],input[type=checkbox],[data-reset]').count(),0);assert.equal(await slider.inputValue(),'680');assert.equal(await count(),'0');assert.equal(await phase(),'ready');assert.equal(await pause.isDisabled(),true);assert.equal(await page.evaluate(()=>window.__sources.length),0);
  for(const img of await root.locator('img').all())assert.equal(await img.evaluate(n=>n.complete&&n.naturalWidth>0),true);
  const boxes=await root.locator('.distance-scene').evaluateAll(ns=>ns.map(n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};}));assert.equal(boxes[0].x,boxes[1].x);assert.equal(boxes[0].w,boxes[1].w);assert.ok(boxes[1].y>boxes[0].y+boxes[0].h);assert.equal(await page.locator('.distance-arrival:visible').count(),0);assert.equal(await page.locator('.distance-records .distance-pending:visible').count(),0);assert.doesNotMatch(await page.locator('.distance-records').innerText(),/等待發聲/);await page.locator('#s2').screenshot({path:'/tmp/k12-34-virtual-verified/ready-1440.png'});
 });
 await t.test('together button emits once plus both correctly delayed weaker echoes at the final output',async()=>{
  await emit.click();await page.waitForFunction(()=>window.__sources.length===3);assert.equal(await count(),'1');
  await page.waitForFunction(()=>document.getElementById('distance').dataset.phase==='complete');
  const evidence=await page.evaluate(()=>{const output=window.__outputs.at(-1),sources=window.__sources.slice(-3),first=sources[0];return{same:sources.every(s=>s.source.buffer===first.source.buffer),delays:sources.map(s=>s.when-first.when),gains:sources.map(s=>s.gain),master:output.gain.gain.value,peaks:sources.map(s=>Math.max(0,...output.samples.filter(p=>p.time>=s.when&&p.time<s.when+.2).map(p=>p.peak)))};});
  assert.equal(evidence.same,true);for(let i=0;i<3;i++)assert.ok(Math.abs(evidence.delays[i]-[0,2,4][i])<.03);assert.ok(Math.abs(evidence.master-.32)<1e-6);assert.deepEqual(evidence.gains.map(n=>Math.round(n*100)),[100,45,45]);assert.ok(evidence.peaks[0]>.28&&evidence.peaks[0]<.34);for(const peak of evidence.peaks.slice(1))assert.ok(peak>.12&&peak<.16);console.log('Distance final audio:',JSON.stringify(evidence));
  assert.equal(await page.locator('#distance-near-record').getAttribute('data-received'),'true');assert.equal(await page.locator('#distance-far-record').getAttribute('data-received'),'true');assert.match(await page.locator('#distance-far-record .distance-arrival').innerText(),/4.00 秒/);
 });
 await t.test('animation and reception records follow real elapsed time at one-times speed',async()=>{
  await select(680);
  await page.evaluate(()=>{
   window.__arrivalTimes={};let start;
   document.querySelector('[data-play=distance]').addEventListener('click',()=>{start=performance.now();},{once:true});
   const observer=new MutationObserver(()=>{for(const name of['near','far'])if(document.getElementById(`distance-${name}-lane`).dataset.stage==='received'&&window.__arrivalTimes[name]===undefined)window.__arrivalTimes[name]=(performance.now()-start)/1000;});
   observer.observe(document.getElementById('distance'),{subtree:true,attributes:true,attributeFilter:['data-stage']});window.__arrivalObserver=observer;
  });
  await emit.click();await page.waitForFunction(()=>document.getElementById('distance').dataset.phase==='complete');
  const times=await page.evaluate(()=>{window.__arrivalObserver.disconnect();return window.__arrivalTimes;});assert.ok(Math.abs(times.near-2)<.25,JSON.stringify(times));assert.ok(Math.abs(times.far-4)<.25,JSON.stringify(times));assert.equal(await page.locator('#distance-elapsed').innerText(),'4.00');console.log('Actual real-time receiver arrivals:',JSON.stringify(times));
 });
 await t.test('each speaker animates and records only its own lane and produces only its own audible echo',async()=>{
  await select(1020);
  for(const [name,other,delay,arrival] of[['near','far',2,'2.00'],['far','near',6,'6.00']]){
   const before=await page.evaluate(()=>window.__sources.length);
   await page.locator(`[data-distance-speaker=${name}]`).click();
   await page.waitForFunction(n=>window.__sources.length===n+2,before);
   assert.equal(await root.getAttribute('data-selection'),name);
   await page.waitForFunction(name=>document.getElementById(`distance-${name}-waves`).childElementCount>0,name);
   const idle=async()=>{
    assert.equal(await stage(other),'ready');
    for(const part of['waves','route','received'])assert.equal(await page.locator(`#distance-${other}-${part}`).evaluate(n=>n.childElementCount),0);
    const row=page.locator(`#distance-${other}-record`);
    assert.equal(await row.getAttribute('data-received'),'false');assert.equal(await row.locator('.distance-arrival').isVisible(),false);
    assert.equal(await row.locator('.distance-pending').isVisible(),false);assert.doesNotMatch(await row.innerText(),/等待發聲/);
    assert.equal(await row.evaluate(n=>n.style.getPropertyValue('--trace-end')),'0%');
    assert.equal(await row.evaluate(n=>n.style.getPropertyValue('--playhead')),'0%');
   };
   await idle();await page.waitForTimeout(400);await idle();
   await page.waitForFunction(()=>document.getElementById('distance').dataset.phase==='complete');
   await idle();assert.equal(await stage(name),'received');assert.equal(await page.locator(`#distance-${name}-record .distance-arrival`).innerText(),arrival+' 秒');
   assert.equal(await page.locator('#distance-elapsed').innerText(),arrival);
   assert.equal(await pause.isDisabled(),true);
   const evidence=await page.evaluate(before=>{
    const output=window.__outputs.at(-1),sources=window.__sources.slice(before),first=sources[0];
    return{count:sources.length,same:sources.every(s=>s.source.buffer===first.source.buffer),delays:sources.map(s=>s.when-first.when),gains:sources.map(s=>s.gain),peaks:sources.map(s=>Math.max(0,...output.samples.filter(p=>p.time>=s.when&&p.time<s.when+.2).map(p=>p.peak)))};
   },before);
   assert.equal(evidence.count,2);assert.equal(evidence.same,true);assert.ok(Math.abs(evidence.delays[1]-delay)<.03);
   assert.deepEqual(evidence.gains.map(n=>Math.round(n*100)),[100,45]);assert.ok(evidence.peaks[0]>.28&&evidence.peaks[0]<.34);assert.ok(evidence.peaks[1]>.12&&evidence.peaks[1]<.16);
   console.log('Single lane final audio:',name,JSON.stringify(evidence));
   await page.locator('#s2').screenshot({path:`/tmp/k12-34-virtual-verified/${name}-only-1440.png`});
  }
  await select(680);
 });
 await t.test('pause and resume preserve the selected lane and switching lanes cancels the old return',async()=>{
  await page.locator('[data-distance-speaker=far]').click();await page.waitForTimeout(300);await pause.click();
  const progress=await root.getAttribute('data-progress'),emissions=await count();await page.waitForTimeout(150);
  assert.equal(await root.getAttribute('data-progress'),progress);assert.equal(await root.getAttribute('data-selection'),'far');assert.equal(await stage('near'),'ready');
  const before=await page.evaluate(()=>window.__sources.length);await pause.click();
  await page.waitForFunction(n=>window.__sources.length>n,before);assert.equal(await count(),emissions);assert.equal(await root.getAttribute('data-selection'),'far');assert.equal(await stage('near'),'ready');
  const old=await page.evaluate(()=>window.__sources.length);await page.locator('[data-distance-speaker=near]').click();
  await page.waitForFunction(n=>window.__sources.length===n+2,old);
  assert.equal(await page.evaluate(n=>window.__sources.slice(0,n).every(s=>s.stopped||s.ended),old),true);
  assert.equal(await root.getAttribute('data-selection'),'near');assert.equal(await stage('far'),'ready');
  await emit.click();assert.equal(await root.getAttribute('data-selection'),'both');assert.equal(await stage('near'),'outbound');assert.equal(await stage('far'),'outbound');await pause.click();
 });
 await t.test('at the comparison moment near has arrived while far just reaches the wall; pause freezes the shared record and waves',async()=>{
  await emit.click();await page.waitForFunction(()=>document.getElementById('distance-near-lane').dataset.stage==='received'&&document.getElementById('distance-far-lane').dataset.stage==='surface');await pause.click();
  assert.equal(await stage('near'),'received');assert.ok(['surface','returning'].includes(await stage('far')));assert.equal(await page.locator('#distance-near-received circle').count(),2);assert.equal(await page.locator('#distance-far-received circle').count(),0);assert.equal(await page.locator('#distance-near-waves path').count(),0);assert.equal(await page.locator('#distance-far-record .distance-arrival').isVisible(),false);assert.match(await page.locator('#distance-far-record .distance-pending').innerText(),/等待返回/);
  const before=await root.getAttribute('data-progress'),waves=await page.locator('#distance-far-waves').innerHTML(),emissions=await count();await page.waitForTimeout(200);assert.equal(await root.getAttribute('data-progress'),before);assert.equal(await page.locator('#distance-far-waves').innerHTML(),waves);assert.equal(await page.locator('body').getAttribute('data-audio-playing'),'false');await page.locator('#s2').screenshot({path:'/tmp/k12-34-virtual-verified/compare-200-1440.png'});
  await pause.click();assert.equal(await count(),emissions);await page.waitForFunction(()=>document.getElementById('distance').dataset.phase==='complete');assert.equal(await stage('far'),'received');assert.equal(await page.locator('#distance-far-waves path').count(),0);
 });
 await t.test('each speaker and lower button restarts the same controller and cancels previous echoes',async()=>{
  const before=Number(await count());for(const entrance of[page.locator('[data-distance-speaker]').first(),page.locator('[data-distance-speaker]').last(),emit]){const old=Number(await count()),sources=await page.evaluate(()=>window.__sources.length);await entrance.click();await page.waitForTimeout(70);assert.equal(Number(await count()),old+1);assert.ok(Number(await root.getAttribute('data-progress'))<.1);assert.equal(await page.evaluate(n=>window.__sources.slice(0,n).every(s=>s.stopped||s.ended),sources),true);}await page.locator('[data-distance-speaker]').first().focus();await page.keyboard.press('Enter');assert.equal(await root.getAttribute('data-selection'),'near');assert.equal(await stage('far'),'ready');await page.locator('[data-distance-speaker]').last().focus();await page.keyboard.press('Space');assert.equal(await root.getAttribute('data-selection'),'far');assert.equal(await stage('near'),'ready');assert.equal(Number(await count()),before+5);await pause.click();
 });
 await t.test('mouse wall dragging keeps the fixed lane unchanged, clamps distance and cancels the previous observation',async()=>{
  await emit.click();await page.waitForFunction(()=>document.body.dataset.audioPlaying==='true');const fixed=await page.locator('#distance-near-lane').getAttribute('data-wall-x'),b=await wall.boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2+350,b.y+b.height/2,{steps:8});await page.mouse.up();assert.equal(await slider.inputValue(),'1020');assert.equal(await phase(),'ready');assert.equal(await page.locator('body').getAttribute('data-audio-playing'),'false');assert.equal(await page.locator('#distance-near-lane').getAttribute('data-wall-x'),fixed);assert.equal(await page.locator('.distance-arrival:visible').count(),0);assert.equal(await wall.getAttribute('aria-valuenow'),'1020');
  await select(680);assert.equal(await wall.getAttribute('aria-valuetext'),'680 公尺');assert.equal(await root.getAttribute('data-progress'),'0');
 });
 await t.test('number entry, range and dragged board share conditions; incomplete and out-of-range edits are safe',async()=>{
  const number=page.locator('#wall-distance-number');await number.fill('850');assert.equal(await slider.inputValue(),'850');assert.equal(await wall.getAttribute('aria-valuenow'),'850');assert.equal(await phase(),'ready');assert.equal(await page.locator('#distance-far-lane').getAttribute('data-wall-x'),'790.000');
  await page.locator('[data-distance-speaker=far]').click();await number.fill('');assert.equal(await phase(),'ready');assert.equal(await page.locator('body').getAttribute('data-audio-playing'),'false');assert.equal(await slider.inputValue(),'850');await number.type('680',{delay:30});assert.equal(await number.inputValue(),'680');assert.equal(await slider.inputValue(),'680');
  await number.fill('1500');assert.equal(await slider.inputValue(),'680');await number.press('Enter');assert.equal(await number.inputValue(),'1020');assert.equal(await slider.inputValue(),'1020');await number.fill('100');await number.blur();assert.equal(await number.inputValue(),'340');assert.equal(await slider.inputValue(),'340');
  await number.fill('680.5');await number.press('Enter');assert.equal(await number.inputValue(),'681');assert.equal(await slider.inputValue(),'681');await number.fill('');await number.blur();assert.equal(await number.inputValue(),'681');
  await select(680);assert.equal(await number.inputValue(),'680');assert.equal(await wall.getAttribute('aria-valuetext'),'680 公尺');assert.equal(await page.locator('.distance-arrival:visible').count(),0);
 });
 await t.test('wall and native distance input both support keyboard with bounds; equal distances share one echo',async()=>{
  await wall.focus();await page.keyboard.press('Home');assert.equal(await slider.inputValue(),'340');await page.keyboard.press('ArrowLeft');assert.equal(await slider.inputValue(),'340');await page.keyboard.press('End');assert.equal(await slider.inputValue(),'1020');await slider.focus();await page.keyboard.press('ArrowLeft');assert.equal(await slider.inputValue(),'1019');await select(340);const sources=await page.evaluate(()=>window.__sources.length);await emit.click();await page.waitForFunction(n=>window.__sources.length===n+2,sources);await page.waitForFunction(()=>document.getElementById('distance').dataset.phase==='complete');assert.equal(await stage('near'),'received');assert.equal(await stage('far'),'received');assert.match(await page.locator('#distance-far-record .distance-arrival').innerText(),/2.00 秒/);await select(680);
 });
 await t.test('cross-section playback and hidden pages stop this scene without autoplaying on return',async()=>{
  await emit.click();await page.waitForFunction(()=>window.__sources.length>0);const before=await page.evaluate(()=>window.__sources.length);await page.locator('[data-play=calculation]').click();assert.equal(await phase(),'paused');assert.equal(await page.locator('#calculation').getAttribute('data-phase'),'playing');assert.equal(await page.evaluate(n=>window.__sources.slice(0,n).every(s=>s.stopped||s.ended),before),true);await page.locator('[data-pause=calculation]').click();assert.equal(await page.locator('body').getAttribute('data-audio-playing'),'false');await emit.click();await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});assert.equal(await phase(),'paused');assert.equal(await page.locator('body').getAttribute('data-audio-playing'),'false');await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});assert.equal(await phase(),'paused');
 });
 await t.test('all scene, records, controls and dialogues stay in the content column from 1440 to 320px',async()=>{
  await select(1020);await emit.click();await page.waitForFunction(()=>document.getElementById('distance').dataset.phase==='complete');
  for(const width of[1440,1280,1024,768,390,320]){await page.setViewportSize({width,height:1100});const sizes=await page.locator('#s2').evaluate(n=>{const main=n.querySelector('.card-main').getBoundingClientRect();return{overflow:document.documentElement.scrollWidth>innerWidth,left:main.left,right:main.right,boxes:[...n.querySelectorAll('.distance-experiment,.distance-scene,.distance-records,.distance-actions,.distance-conclusion')].map(n=>{const b=n.getBoundingClientRect();return{left:b.left,right:b.right};})};});assert.equal(sizes.overflow,false,`${width}px overflow`);for(const b of sizes.boxes){assert.ok(b.left>=sizes.left-1);assert.ok(b.right<=sizes.right+1);}if([1440,1024,390].includes(width))await page.locator('#s2').screenshot({path:`/tmp/k12-34-virtual-verified/complete-${width}.png`});}
  for(const [width,height] of[[1440,900],[1366,768],[1280,720],[1024,768],[390,844],[320,700]]){
   await page.setViewportSize({width,height});await root.evaluate(n=>n.scrollIntoView({block:'start',behavior:'instant'}));
   const visible=await root.evaluate(n=>{const box=e=>{const r=e.getBoundingClientRect();return{top:r.top,bottom:r.bottom,height:r.height};};return{heading:box(n.querySelector('.distance-lab-heading')),scenes:[...n.querySelectorAll('.distance-scene')].map(box),records:box(n.querySelector('.distance-records')),buttons:box(n.querySelector('.distance-actions'))};});
   assert.ok(visible.heading.top>=0,`${width} heading above viewport`);for(const scene of visible.scenes){assert.ok(scene.top>=0&&scene.bottom<=height,`${width} animation not visible`);}assert.ok(visible.records.bottom<=height,`${width} receiving record requires another scroll`);assert.ok(visible.buttons.bottom<=height,`${width} buttons not visible`);
   await page.screenshot({path:`/tmp/k12-34-virtual-verified/compact-${width}x${height}.png`});
  }
  await select(680);
 });
 await t.test('real touch wall dragging and speaker tapping work under reduced motion',async()=>{
  const ctx=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce'});try{const p=await ctx.newPage();await p.goto(base+'#s2');await p.waitForFunction(()=>document.body.dataset.ready==='true');const target=p.locator('#distance-wall');await target.scrollIntoViewIfNeeded();const b=await target.boundingBox(),cdp=await ctx.newCDPSession(p),x=b.x+b.width/2,y=b.y+b.height/2;await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+35,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.ok(Number(await p.locator('#wall-distance').inputValue())>680);await p.locator('[data-distance-speaker]').last().tap();await p.waitForFunction(()=>document.body.dataset.audioPlaying==='true');assert.equal(await p.locator('#distance').getAttribute('data-emissions'),'1');assert.equal(await p.locator('#distance').getAttribute('data-selection'),'far');assert.equal(await p.locator('#distance-near-lane').getAttribute('data-stage'),'ready');assert.equal(await p.locator('#distance-near-waves path').count(),0);await p.locator('[data-distance-speaker]').last().tap();assert.equal(await p.locator('#distance').getAttribute('data-emissions'),'2');assert.equal(await p.locator('#distance-near-record').getAttribute('data-received'),'false');await p.locator('[data-distance-speaker]').first().tap();assert.equal(await p.locator('#distance').getAttribute('data-emissions'),'3');assert.equal(await p.locator('#distance').getAttribute('data-selection'),'near');assert.equal(await p.locator('#distance-far-lane').getAttribute('data-stage'),'ready');await p.waitForTimeout(130);assert.ok(Number(await p.locator('#distance').getAttribute('data-progress'))>0);await p.locator('[data-pause=distance]').tap();assert.equal(await p.locator('#distance').getAttribute('data-phase'),'paused');assert.equal(await p.locator('body').getAttribute('data-audio-playing'),'false');await p.locator('#wall-distance-number').fill('850');await p.locator('#wall-distance-number').press('Enter');assert.equal(await p.locator('#wall-distance').inputValue(),'850');assert.equal(await p.locator('#distance-wall').getAttribute('aria-valuenow'),'850');assert.equal(await p.locator('#distance').getAttribute('data-phase'),'ready');}finally{await ctx.close();}
 });
 await t.test('audio failure appears only on failure and a new explicit play clears the error',async()=>{
  const p=await browser.newPage();try{await p.addInitScript(()=>{const Native=AudioContext;let rejected=false;window.AudioContext=class extends Native{resume(){if(!rejected){rejected=true;return Promise.reject(new DOMException('blocked','NotAllowedError'));}return super.resume();}};});await p.goto(base+'#s2');await p.waitForFunction(()=>document.body.dataset.ready==='true');assert.equal(await p.locator('#distance-error').isVisible(),false);await p.locator('[data-play=distance]').click();await p.waitForFunction(()=>!document.getElementById('distance-error').hidden);assert.match(await p.locator('#distance-error').innerText(),/聲音未能啟用/);await p.locator('[data-play=distance]').click();await p.waitForFunction(()=>document.body.dataset.audioPlaying==='true');assert.equal(await p.locator('#distance-error').isVisible(),false);}finally{await p.close();}
 });
 assert.deepEqual(errors,[]);
});
