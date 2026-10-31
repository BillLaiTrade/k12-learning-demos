const {test}=require('node:test'),assert=require('node:assert/strict'),{spawn}=require('node:child_process'),path=require('node:path'),fs=require('node:fs/promises'),{chromium}=require('playwright');
test('guitar lesson: real instrument, one variable at a time, synchronized plucks',{timeout:120000},async t=>{
 const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:['ignore','pipe','ignore']});t.after(()=>server.kill());
 const port=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server timeout')),5000);server.stdout.on('data',d=>{const m=String(d).match(/port (\d+)/);if(m){clearTimeout(timer);resolve(m[1]);}});server.once('error',reject);});
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',...(process.env.SOUND33_BASE_URL?{proxy:{server:process.env.HTTPS_PROXY}}:{})});t.after(()=>browser.close());
 const page=await browser.newPage({viewport:{width:1440,height:1100},reducedMotion:'reduce'}),errors=[];
 const capture=process.env.GUITAR_CAPTURE_DIR||'/tmp/unit33-guitar-review';await fs.mkdir(capture,{recursive:true});
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
 await page.addInitScript(()=>{window.guitarRuns=[];const create=AudioContext.prototype.createBufferSource;
  AudioContext.prototype.createBufferSource=function(){const s=create.call(this),start=s.start.bind(s),stop=s.stop.bind(s);let record;
   s.start=function(...args){const a=s.buffer.getChannelData(0),rate=s.buffer.sampleRate;let squares=0,crossings=0;for(let i=Math.floor(rate*.2);i<Math.floor(rate*1.2);i++)if(a[i-1]<0&&a[i]>=0)crossings++;for(let i=Math.floor(rate*.05);i<Math.floor(rate*.35);i++)squares+=a[i]**2;record={hz:crossings,rms:Math.sqrt(squares/(rate*.3)),peak:a.reduce((peak,x)=>Math.max(peak,Math.abs(x)),0),seconds:a.length/rate,stopped:false};window.guitarRuns.push(record);return start(...args);};s.stop=function(...args){if(record)record.stopped=true;return stop(...args);};return s;
  };
 });
 await page.goto(process.env.SOUND33_BASE_URL||`http://127.0.0.1:${port}/units/3/parts/3.3/#card-03`,{waitUntil:'networkidle'});
 const root=page.locator('#card-03'),left=root.locator('[data-guitar-side=left]'),right=root.locator('[data-guitar-side=right]'),handle=root.locator('.guitar-fret-control');
 const mode=async value=>root.locator(`[data-guitar-mode=${value}]`).click();
 const play=async side=>{await (side==='left'?left:right).locator('.guitar-play').click();await page.waitForFunction(()=>document.querySelector('#card-03').dataset.playing==='true');};
 const reset=async()=>root.locator('[data-guitar-reset]').click();
 const dragTo=async target=>{
  await handle.scrollIntoViewIfNeeded();const box=await handle.boundingBox();
  const delta=await right.locator('svg').evaluate((svg,target)=>{const n=Number(svg.dataset.fret),x=fret=>310+1506/2**(fret/12);return (x(target)-x(n))*svg.getScreenCTM().a;},target);
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+delta,box.y+box.height/2,{steps:10});await page.mouse.up();
 };
 await t.test('approved guitar comparison, characters and independent controls render without autoplay',async()=>{
  assert.equal(await root.locator('.guitar-column').count(),2);assert.equal(await root.locator('input[type=range]').count(),0);
  assert.equal(await left.locator('.guitar-frequency').innerText(),'110 Hz');assert.equal(await right.locator('.guitar-frequency').innerText(),'220 Hz');
  assert.equal(await root.locator('svg image').count(),2);assert.equal(await left.locator('image').getAttribute('href'),'assets/guitar-body.png');
  assert.match(await root.locator('.speaker').first().evaluate(n=>getComputedStyle(n).backgroundImage),/dialogue-character-avatars/);
  assert.equal(await page.evaluate(()=>window.guitarRuns.length),0);assert.equal(await right.locator('svg').getAttribute('data-displacement'),'0');
  assert.equal(await root.locator('.guitar-tension-tools').isHidden(),true);assert.equal(await handle.getAttribute('aria-valuenow'),'12');
 });
 await t.test('effective-length brackets touch the actual bridge and selected fret, with a half-length octave',async()=>{
  const values=await root.locator('.guitar-scene').evaluateAll(nodes=>nodes.map(svg=>{
   const wire=svg.querySelector('.guitar-active-wire'),measure=svg.querySelector('.guitar-length-line'),ends=svg.querySelector('.guitar-length-ends');
   const a=wire.getPointAtLength(0),b=wire.getPointAtLength(wire.getTotalLength()),m0=measure.getPointAtLength(0),m1=measure.getPointAtLength(measure.getTotalLength());
   return {start:a.x,end:b.x,y0:a.y,y1:b.y,length:Number(svg.dataset.length),frequency:Number(svg.dataset.frequency),measure:[m0.x,m1.x],ends:ends.getAttribute('d')};
  }));
  for(const n of values){assert.equal(n.start,310);assert.equal(n.y0,586);assert.equal(n.y1,586);assert.deepEqual(n.measure,[n.start,n.end]);assert.equal(n.ends,`M310 586V875M${n.end} 586V875`);}
  assert.equal(values[1].end-values[1].start,(values[0].end-values[0].start)/2);assert.equal(values[1].length,values[0].length/2);assert.equal(values[1].frequency,values[0].frequency*2);
 });
 await t.test('real pointer dragging and fretboard selection snap to frets and keep tension fixed without sound',async()=>{
  const runs=await page.evaluate(()=>window.guitarRuns.length);
  for(const fret of [0,3,7,12]){await dragTo(fret);assert.equal(await right.locator('svg').getAttribute('data-fret'),String(fret));assert.equal(await right.locator('svg').getAttribute('data-tension'),'1');assert.equal(await handle.getAttribute('aria-valuenow'),String(fret));}
  const zone=right.locator('.guitar-fret-zone'),zoneBox=await zone.boundingBox();await zone.click({position:{x:zoneBox.width-10,y:zoneBox.height/2}});assert.equal(await right.locator('svg').getAttribute('data-fret'),'0');
  await handle.focus();await page.keyboard.press('Home');assert.equal(await right.locator('.guitar-frequency').innerText(),'110 Hz');
  await page.keyboard.press('ArrowLeft');assert.equal(await handle.getAttribute('aria-valuenow'),'1');await page.keyboard.press('End');assert.equal(await right.locator('.guitar-frequency').innerText(),'220 Hz');
  assert.equal(await page.evaluate(()=>window.guitarRuns.length),runs);await reset();
 });
 await t.test('tension mode fixes full length, turns the real tuning peg and follows square-root pitch',async()=>{
  await play('right');await mode('tension');assert.equal(await root.getAttribute('data-playing'),'false');assert.equal(await handle.isHidden(),true);
  const fixed=await left.locator('.guitar-fixed').innerHTML();assert.equal(await right.locator('svg').getAttribute('data-fret'),'0');
  for(let i=0;i<4;i++)await root.locator('[data-guitar-tension=".25"]').click();
  const hz=Number(await right.locator('svg').getAttribute('data-frequency'));assert.ok(Math.abs(hz/110-Math.SQRT2)<1e-10);
  assert.equal(await right.locator('svg').getAttribute('data-length'),'65');assert.equal(await root.locator('[data-guitar-tension=".25"]').isDisabled(),true);
  assert.match(await right.locator('.guitar-tuner').getAttribute('transform'),/rotate\(110\)/);assert.equal(await left.locator('.guitar-fixed').innerHTML(),fixed);
  for(let i=0;i<6;i++)await root.locator('[data-guitar-tension="-.25"]').click();assert.equal(await root.locator('[data-guitar-tension="-.25"]').isDisabled(),true);
  await reset();await root.locator('.guitar-tuner-control').click();assert.equal(await root.locator('#guitar-tension-reading').innerText(),'1.25 倍');
  await mode('length');assert.equal(await right.locator('svg').getAttribute('data-tension'),'1');assert.equal(await right.locator('svg').getAttribute('data-fret'),'12');
 });
 await t.test('independent replay and direct plucking produce real 110/220Hz decaying buffers at audible matched levels',async()=>{
  await play('left');await play('left');await right.locator('.guitar-pluck-target').click();await page.waitForFunction(()=>document.querySelector('#card-03').dataset.playing==='true');
  const runs=await page.evaluate(()=>window.guitarRuns.slice(-3));assert.deepEqual(runs.map(n=>n.hz),[110,110,220]);assert.ok(runs[0].stopped&&runs[1].stopped);
  for(const r of runs){assert.equal(r.seconds,2.4);assert.ok(r.rms>.2&&r.peak>.5&&r.peak<.95);}assert.ok(Math.abs(runs[2].rms/runs[0].rms-1)<.03);
  assert.equal(await left.getAttribute('data-sounding'),'false');assert.equal(await right.getAttribute('data-sounding'),'true');await reset();
 });
 await t.test('both guitar strings visibly vibrate while body, endpoints and inactive string stay fixed; finish returns to rest',async()=>{
  for(const col of [left,right]){
   const fixed=await col.locator('.guitar-fixed').innerHTML(),tail=await col.locator('.guitar-muted-wire').getAttribute('d');
   await play(col===left?'left':'right');const frames=[],positions=[];
   for(let i=0;i<5;i++){
    await page.waitForTimeout(90);const scene=await col.locator('svg').evaluate(svg=>{const p=svg.querySelector('.guitar-active-wire');return {value:Number(svg.dataset.displacement),end:p.getPointAtLength(p.getTotalLength()).x,y0:p.getPointAtLength(0).y,y1:p.getPointAtLength(p.getTotalLength()).y,fret:Number(svg.dataset.fret)};});
    assert.equal(scene.end,310+1506/2**(scene.fret/12));assert.equal(scene.y0,586);assert.equal(scene.y1,586);positions.push(scene.value);
    assert.equal(await col.locator('.guitar-fixed').innerHTML(),fixed);assert.equal(await col.locator('.guitar-muted-wire').getAttribute('d'),tail);
    frames.push(await col.locator('.guitar-stage').screenshot());
   }
   assert.ok(Math.max(...positions)-Math.min(...positions)>20);assert.ok(new Set(frames.map(b=>b.toString('base64'))).size>=4);
   await fs.writeFile(path.join(capture,`moving-${col===left?'left':'right'}.png`),frames[1]);
   await page.waitForFunction(()=>document.querySelector('#card-03').dataset.playing==='false');assert.equal(await col.locator('svg').getAttribute('data-displacement'),'0');
  }
 });
 await t.test('editing, mode/reset, navigation, offscreen and hidden tab stop sound and motion without restarting',async()=>{
  await play('right');await handle.focus();await page.keyboard.press('Home');assert.equal(await root.getAttribute('data-playing'),'false');
  await play('right');await mode('tension');assert.equal(await root.getAttribute('data-playing'),'false');
  await play('right');await reset();assert.equal(await root.getAttribute('data-playing'),'false');
  await play('left');await page.locator('.route a[href="#card-04"]').click();assert.equal(await root.getAttribute('data-playing'),'false');
  await play('left');await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));delete document.hidden;});assert.equal(await root.getAttribute('data-playing'),'false');
  await play('right');await page.locator('#card-07').evaluate(n=>n.scrollIntoView());await page.waitForFunction(()=>document.querySelector('#card-03').dataset.playing==='false');
  await mode('length');await reset();
 });
 await t.test('cancelled async preparation stays cancelled and failed playback exposes a retryable message',async()=>{
  await page.evaluate(()=>{window.savedGuitarResume=AudioContext.prototype.resume;AudioContext.prototype.resume=function(){return new Promise(resolve=>{window.releaseGuitarResume=resolve;});};});
  await right.locator('.guitar-play').click();await mode('tension');const before=await page.evaluate(()=>window.guitarRuns.length);
  await page.evaluate(()=>window.releaseGuitarResume());await page.waitForTimeout(80);assert.equal(await page.evaluate(()=>window.guitarRuns.length),before);
  await page.evaluate(()=>{AudioContext.prototype.resume=function(){return Promise.reject(Error('test audio failure'));};});
  await right.locator('.guitar-play').click();await page.waitForFunction(()=>!document.querySelector('#card-03 .play-state').classList.contains('visually-hidden'));assert.match(await root.locator('.play-state').innerText(),/暫時無法播放/);
  await page.evaluate(()=>{AudioContext.prototype.resume=window.savedGuitarResume;});await play('left');assert.equal(await root.locator('.play-state').getAttribute('class'),'play-state visually-hidden');await mode('length');
 });
 await t.test('seven widths retain both comparisons and readable controls in both investigation modes',async()=>{
  for(const width of [1024,1280,1440,1920,820,390,320]){
   await page.setViewportSize({width,height:1100});
   for(const value of ['length','tension']){
    await mode(value);await root.scrollIntoViewIfNeeded();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    const m=await root.evaluate(n=>{const cols=[...n.querySelectorAll('.guitar-column')],rect=(c,s)=>c.querySelector(s).getBoundingClientRect();return {benchHeight:n.querySelector('.guitar-bench').getBoundingClientRect().height,play:cols.map(c=>rect(c,'.guitar-play').top),width:cols.map(c=>c.getBoundingClientRect().width),clipped:[...n.querySelectorAll('button,output')].filter(b=>b.getBoundingClientRect().width>0).some(b=>b.scrollWidth>b.clientWidth+2),out:[...n.querySelectorAll('.guitar-stage')].some(stage=>{const a=stage.getBoundingClientRect(),c=stage.querySelector('.guitar-fret-control');if(!c||c.hidden)return false;const b=c.getBoundingClientRect();return b.left<a.left||b.right>a.right;})};});
    assert.ok(Math.abs(m.width[0]-m.width[1])<1);assert.ok(m.play[1]>m.play[0], 'comparison cards are stacked in order at every width');if(width>=1024)assert.ok(m.benchHeight<720,'both guitars fit within a typical laptop viewport');assert.equal(m.clipped,false);assert.equal(m.out,false);
    await root.screenshot({path:path.join(capture,`${value}-${width}.png`)});
   }
  }
 });
 await t.test('real touch dragging and direct plucking work on mobile',async()=>{
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  await context.addInitScript(()=>{window.touchStarts=0;const create=AudioContext.prototype.createBufferSource;AudioContext.prototype.createBufferSource=function(){const source=create.call(this),start=source.start.bind(source);source.start=(...args)=>{window.touchStarts++;return start(...args);};return source;};});
  const mobile=await context.newPage();
  await mobile.goto(page.url(),{waitUntil:'networkidle'});const card=mobile.locator('#card-03'),control=card.locator('.guitar-fret-control');await control.scrollIntoViewIfNeeded();
  const box=await control.boundingBox(),delta=await card.locator('[data-guitar-side=right] svg').evaluate(svg=>753*svg.getScreenCTM().a),x=box.x+box.width/2,y=box.y+box.height/2;
  const cdp=await context.newCDPSession(mobile);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+delta*i/8,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.equal(await control.getAttribute('aria-valuenow'),'0');
  await card.locator('[data-guitar-side=right] .guitar-pluck-target').tap();await mobile.waitForFunction(()=>document.querySelector('#card-03').dataset.playing==='true');
  await mobile.waitForTimeout(350);assert.equal(await mobile.evaluate(()=>window.touchStarts),1,'one touch plays once, including browsers that also send click');
  await card.locator('[data-guitar-mode=tension]').tap();assert.equal(await card.getAttribute('data-playing'),'false');await context.close();
 });
 assert.deepEqual(errors,[]);
});
