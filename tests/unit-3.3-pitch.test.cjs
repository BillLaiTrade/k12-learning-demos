const {test}=require('node:test'),assert=require('node:assert/strict'),{spawn}=require('node:child_process'),path=require('node:path'),fs=require('node:fs/promises'),{chromium}=require('playwright');
test('pitch comparison: independent speakers, controlled frequency and synchronized records',{timeout:120000},async t=>{
 const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:['ignore','pipe','ignore']});t.after(()=>server.kill());
 const port=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server timeout')),5000);server.stdout.on('data',d=>{const m=String(d).match(/port (\d+)/);if(m){clearTimeout(timer);resolve(m[1]);}});server.once('error',reject);});
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',...(process.env.SOUND33_BASE_URL?{proxy:{server:process.env.HTTPS_PROXY}}:{})});t.after(()=>browser.close());
 const page=await browser.newPage({viewport:{width:1440,height:1100},reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
 await page.addInitScript(()=>{window.pitchRuns=[];const create=AudioContext.prototype.createBufferSource;
  AudioContext.prototype.createBufferSource=function(){const source=create.call(this),start=source.start.bind(source),stop=source.stop.bind(source);let record;
   source.start=function(...args){const a=source.buffer.getChannelData(0),rate=source.buffer.sampleRate;let squares=0,crossings=0;for(let i=Math.floor(rate*.2);i<Math.floor(rate*.7);i++){squares+=a[i]**2;if(a[i-1]<0&&a[i]>=0)crossings++;}record={frequency:crossings/.5,rms:Math.sqrt(squares/(rate*.5)),peak:a.reduce((peak,v)=>Math.max(peak,Math.abs(v)),0),stopped:false};window.pitchRuns.push(record);return start(...args);};source.stop=function(...args){if(record)record.stopped=true;return stop(...args);};return source;
  };
 });
 await page.goto(process.env.SOUND33_BASE_URL||`http://127.0.0.1:${port}/units/3/parts/3.3/#card-02`,{waitUntil:'networkidle'});
 const root=page.locator('#card-02'),left=root.locator('[data-pitch-side=left]'),right=root.locator('[data-pitch-side=right]');
 const play=async side=>{await (side==='left'?left:right).locator('.pitch-play').click();await page.waitForFunction(()=>document.querySelector('#card-02').dataset.playing==='true');};
 const change=async target=>{let value=Number((await page.locator('#pitch-reading').innerText()).replace(/\D/g,''));while(value!==target){await root.locator(`[data-pitch-step="${target>value?100:-100}"]`).click();value+=target>value?100:-100;}};
 await t.test('approved controls, matching speakers and actual shared characters render without autoplay',async()=>{
  assert.equal(await root.locator('.pitch-step').count(),2);assert.equal(await left.locator('.pitch-step').count(),0);assert.equal(await right.locator('.pitch-step').count(),2);
  assert.equal(await root.locator('input[type=range],.stop,.reset').count(),0);assert.equal(await root.locator('.pitch-play').count(),2);assert.equal(await root.locator('.pitch-fixed').count(),2);assert.equal(await root.locator('.pitch-surround-top,.pitch-surround-bottom').count(),4);
  assert.equal(await left.locator('img').getAttribute('src'),await right.locator('img').getAttribute('src'));
  assert.ok(await left.locator('img').evaluate(n=>n.complete&&n.naturalWidth>0));assert.equal(await page.evaluate(()=>window.pitchRuns.length),0);
  assert.match(await root.locator('.speaker').first().evaluate(n=>getComputedStyle(n).backgroundImage),/dialogue-character-avatars/);
  assert.equal(await left.locator('.pitch-wave').getAttribute('data-frequency'),'200');assert.equal(await right.locator('.pitch-wave').getAttribute('data-frequency'),'400');assert.equal(await root.locator('.pitch-position-dot,.pitch-amplitude-scale,.pitch-closeup').count(),0);assert.match(await left.locator('.pitch-diaphragm').getAttribute('aria-label'),/振幅是平衡位置到單側極限/);
 });
 await t.test('frequency changes do not play sound; bounds, cycles and amplitude stay correct at every step',async()=>{
  const runs=await page.evaluate(()=>window.pitchRuns.length);
  for(const hz of [200,300,400,500,600,700,800]){
   await change(hz);assert.equal(await left.locator('.pitch-wave').getAttribute('data-frequency'),'200');
   const graph=right.locator('.pitch-wave');assert.equal(await graph.getAttribute('data-frequency'),String(hz));assert.equal(await graph.getAttribute('data-amplitude'),'.5');
   const ys=await graph.locator('.pitch-guide').evaluate(n=>[...n.getAttribute('d').matchAll(/[ML][\d.]+ ([-\d.]+)/g)].map(m=>Number(m[1])));
   let cycles=0;for(let i=1;i<ys.length;i++)if(ys[i-1]>=84&&ys[i]<84)cycles++;assert.equal(cycles,hz/100);
   assert.ok(Math.abs(Math.max(...ys)-132)<.1);assert.ok(Math.abs(Math.min(...ys)-36)<.1);
  }
  assert.equal(await root.locator('[data-pitch-step="100"]').isDisabled(),true);await change(200);assert.equal(await root.locator('[data-pitch-step="-100"]').isDisabled(),true);
  assert.equal(await page.evaluate(()=>window.pitchRuns.length),runs);await change(400);
 });
 await t.test('left can repeat twice then right; actual audio has selected pitch and fixed signal amplitude',async()=>{
  await play('left');await play('left');await play('right');
  const runs=await page.evaluate(()=>window.pitchRuns.slice(-3));assert.deepEqual(runs.map(r=>r.frequency),[200,200,400]);assert.ok(runs[0].stopped&&runs[1].stopped);
  assert.ok(Math.abs(runs[2].rms/runs[0].rms-1)<.01);assert.ok(runs.every(r=>r.rms>.62&&r.rms<.67&&r.peak>.90&&r.peak<.93),'final buffers have the boosted level, fixed amplitude and clipping headroom');assert.equal(await left.getAttribute('data-sounding'),'false');assert.equal(await right.getAttribute('data-sounding'),'true');
  const kept=await left.locator('.signal').getAttribute('d');await change(800);assert.equal(await left.locator('.signal').getAttribute('d'),kept);assert.equal(await root.getAttribute('data-playing'),'false');await right.locator('.pitch-speaker').click();await page.waitForFunction(()=>document.querySelector('#card-02').dataset.playing==='true');
  assert.equal(await page.evaluate(()=>window.pitchRuns.at(-1).frequency),800);assert.ok(await page.evaluate(()=>window.pitchRuns.at(-1).peak>.90&&window.pitchRuns.at(-1).peak<.93),'800Hz receives the same increased output without clipping');await change(400);
 });
 await t.test('one side animates with its trace; natural finish rests the cone and keeps the full comparison',async()=>{
  const fixed=await left.locator('.pitch-fixed').innerHTML();await play('left');await page.waitForTimeout(350);
  const inspect=async col=>col.evaluate(n=>({progress:Number(n.querySelector('.pitch-wave').dataset.progress),displacement:Number(n.querySelector('.pitch-diaphragm').dataset.displacement),hz:Number(n.querySelector('.pitch-wave').dataset.frequency),surround:n.querySelector('.pitch-surround-top').getAttribute('d'),excursion:Number(n.querySelector('.pitch-diaphragm').dataset.excursion)}));
  const a=await inspect(left);assert.ok(a.progress>0&&a.progress<1);assert.ok(Math.abs(a.displacement-14*Math.sin(2*Math.PI*a.hz*.01*a.progress))<1e-8);assert.equal((await inspect(right)).displacement,0);assert.ok(Math.abs(a.excursion-44*a.displacement/14)<1e-8,'actual diaphragm uses the same enlarged displacement scale');assert.equal(await left.locator('.pitch-fixed').innerHTML(),fixed);assert.ok(Math.abs(Number(a.surround.split(' ').at(-2))-(335+a.excursion))<1e-8,'rubber surround stays attached to moving diaphragm');
  await page.waitForFunction(()=>document.querySelector('#card-02').dataset.playing==='false');assert.equal((await inspect(left)).progress,1);assert.equal((await inspect(left)).displacement,0);assert.equal((await inspect(left)).excursion,0);
  const previous=await left.locator('.signal').getAttribute('d');await play('right');await page.waitForTimeout(300);assert.equal(await left.locator('.signal').getAttribute('d'),previous);
  await page.waitForFunction(()=>document.querySelector('#card-02').dataset.playing==='false');assert.equal((await inspect(right)).progress,1);
 });
 await t.test('front speaker visibly pumps in phase while its wooden cabinet stays fixed, including reduced motion',async()=>{
  await fs.mkdir('/tmp/unit33-pitch-review',{recursive:true});
  for(const [side,hz] of [['left',200],['right',800]]){
   if(side==='right')await change(hz);
   const col=side==='left'?left:right,button=col.locator('.pitch-speaker'),box=await button.locator('img').boundingBox();
   await play(side);const frames=[],scales=[];
   for(let i=0;i<6;i++){
    await page.waitForTimeout(100);
    const sample=await col.evaluate(n=>({front:Number(n.querySelector('.pitch-front-cone').dataset.displacement),side:Number(n.querySelector('.pitch-diaphragm').dataset.displacement),scale:n.querySelector('.pitch-front-cone').transform.baseVal.consolidate().matrix.a}));
    assert.ok(Math.abs(sample.front-sample.side)<1e-8);scales.push(sample.scale);
    frames.push(await button.screenshot());
    assert.deepEqual(await button.locator('img').boundingBox(),box,'cabinet image never translates or scales');
   }
   assert.ok(Math.max(...scales)-Math.min(...scales)>.09,'front membrane has clearly visible excursion');
   assert.ok(new Set(frames.map(frame=>frame.toString('base64'))).size>=4,'actual rendered pixels change, not only an animation flag');
   await fs.writeFile(`/tmp/unit33-pitch-review/front-${side}.png`,frames[2]);
   await page.waitForFunction(()=>document.querySelector('#card-02').dataset.playing==='false');
   assert.equal(await col.locator('.pitch-front-cone').getAttribute('data-displacement'),'0');
   assert.equal(await col.locator('.pitch-front-cone').evaluate(n=>n.transform.baseVal.consolidate().matrix.a),1);
  }
  await play('right');await root.locator('[data-pitch-step="-100"]').click();assert.equal(await right.locator('.pitch-front-cone').getAttribute('data-displacement'),'0');await change(400);
 });
 await t.test('one shared switch shows exactly one view per speaker and preserves sound, frequency and progress',async()=>{
  assert.equal(await root.getAttribute('data-pitch-view'),'front');
  const frontSwitch=root.locator('button[data-pitch-view=front]'),sideSwitch=root.locator('button[data-pitch-view=side]');
  const countVisible=async()=>root.locator('.pitch-apparatus').evaluateAll(nodes=>nodes.map(n=>[...n.querySelectorAll('button')].filter(b=>!b.hidden).length));
  assert.deepEqual(await countVisible(),[1,1]);
  await play('right');await page.waitForTimeout(180);
  const before=await page.evaluate(()=>({runs:window.pitchRuns.length,time:Number(document.querySelector('#pitch-live').dataset.progress)}));
  await sideSwitch.click();assert.equal(await root.getAttribute('data-pitch-view'),'side');
  assert.equal(await sideSwitch.getAttribute('aria-pressed'),'true');assert.equal(await frontSwitch.getAttribute('aria-pressed'),'false');
  assert.deepEqual(await countVisible(),[1,1]);assert.equal(await left.locator('.pitch-speaker').isVisible(),false);assert.equal(await right.locator('.pitch-side-view').isVisible(),true);
  assert.equal(await root.getAttribute('data-playing'),'true');assert.equal(await page.evaluate(()=>window.pitchRuns.length),before.runs);
  assert.ok(Number(await right.locator('.pitch-wave').getAttribute('data-progress'))>before.time,'view switch does not restart the signal');
  assert.match(await page.locator('#pitch-reading').innerText(),/400/);
  const frames=[];for(let i=0;i<4;i++){await page.waitForTimeout(70);frames.push((await right.locator('.pitch-side-view').screenshot()).toString('base64'));}
  assert.ok(new Set(frames).size>=3,'side diaphragm visibly moves in actual rendered frames');
  await frontSwitch.focus();await page.keyboard.press('Enter');assert.equal(await root.getAttribute('data-pitch-view'),'front');
  await sideSwitch.focus();await page.keyboard.press('Space');assert.equal(await root.getAttribute('data-pitch-view'),'side');
  await change(500);assert.equal(await root.getAttribute('data-pitch-view'),'side');assert.equal(await root.getAttribute('data-playing'),'false');
  assert.equal(await right.locator('.pitch-diaphragm').getAttribute('data-excursion'),'0');
  await right.locator('.pitch-side-view').click();await page.waitForFunction(()=>document.querySelector('#card-02').dataset.playing==='true');
  assert.equal(await page.evaluate(()=>window.pitchRuns.at(-1).frequency),500);await change(400);await frontSwitch.click();
 });
 await t.test('both A dimensions connect to the same membrane edge at its symmetric extreme positions',async()=>{
  const measurements=await root.locator('.pitch-diaphragm').evaluateAll(nodes=>nodes.map(svg=>{
   const edge=svg.querySelector('.pitch-membrane-edge'),p=edge.getPointAtLength(edge.getTotalLength());
   const inward=svg.querySelector('.pitch-extreme-in').transform.baseVal.consolidate().matrix.e,outward=svg.querySelector('.pitch-extreme-out').transform.baseVal.consolidate().matrix.e;
   const start=selector=>{const n=svg.querySelector(selector);const v=n.getPointAtLength(0);return [v.x,v.y];};
   return {point:[p.x,p.y],inward,outward,inGuide:start('.pitch-in-guide'),outGuide:start('.pitch-out-guide'),zero:start('.pitch-equilibrium'),inA:svg.querySelector('.pitch-amplitude-in').getAttribute('d'),outA:svg.querySelector('.pitch-amplitude-out').getAttribute('d')};
  }));
  assert.deepEqual(measurements[0],measurements[1],'both speaker views have identical physical scales');
  const m=measurements[0];assert.equal(m.inward,-m.outward);assert.ok(m.outward>0);
  assert.deepEqual(m.inGuide,[m.point[0]+m.inward,m.point[1]]);assert.deepEqual(m.outGuide,[m.point[0]+m.outward,m.point[1]]);
  assert.equal(m.zero[0],m.point[0]);assert.match(m.inA,new RegExp(`M${m.inGuide[0]} 341H${m.point[0]}`));assert.match(m.outA,new RegExp(`M${m.point[0]} 341H${m.outGuide[0]}`));
 });
 await t.test('rendered diaphragm transforms have equal positive and negative travel at every frequency, with correct cycle ratios',async()=>{
  const result=await root.evaluate(async original=>{
   // Detached copies exercise the production renderer at known times without changing actual audio or adding a product test API.
   const {createPitchExperiment}=await import(new URL('./assets/pitch-experiment.mjs?v=5',location.href));
   const copy=original.cloneNode(true),view=createPitchExperiment(copy),samples=[];
   for(const hz of [200,300,400,500,600,700,800]){
    view.render(hz);view.start('pitch-live');const cone=copy.querySelector('[data-pitch-side=right] .pitch-cone');
    const positions=[];for(let i=0;i<=1600;i++){view.update(i/800);positions.push(cone.transform.baseVal.consolidate().matrix.e);}
    let cycles=0;for(let i=1;i<positions.length;i++)if(positions[i-1]<=1e-6&&positions[i]>1e-6)cycles++;
    samples.push({hz,min:Math.min(...positions),max:Math.max(...positions),cycles});
   }
   view.render(400);view.start('pitch-reference');view.update(.25);const left=copy.querySelector('[data-pitch-side=left] .pitch-cone').transform.baseVal.consolidate().matrix.e;
   view.start('pitch-live');view.update(.125);const right=copy.querySelector('[data-pitch-side=right] .pitch-cone').transform.baseVal.consolidate().matrix.e;
   view.stop();return {samples,left,right};
  });
  for(const s of result.samples){assert.equal(s.cycles,s.hz/100);assert.ok(Math.abs(s.max+s.min)<.01);assert.ok(Math.abs(s.max-44)<.01);}
  assert.equal(result.samples[2].cycles/result.samples[0].cycles,2,'400Hz completes twice as many cycles as 200Hz');
  assert.ok(Math.abs(result.left-result.right)<1e-8,'same amplitude reached in half the time at twice the frequency');
 });
 await t.test('keyboard, rapid changes, section navigation and page visibility cancel playback',async()=>{
  await left.locator('.pitch-speaker').focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('#card-02').dataset.playing==='true');
  await root.locator('[data-pitch-step="100"]').click();assert.equal(await root.getAttribute('data-playing'),'false');
  await play('right');await page.locator('.route a[href="#card-03"]').click();assert.equal(await root.getAttribute('data-playing'),'false');
  await play('left');await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));delete document.hidden;});assert.equal(await root.getAttribute('data-playing'),'false');
  await play('right');await page.locator('#card-07').evaluate(n=>n.scrollIntoView());await page.waitForFunction(()=>document.querySelector('#card-02').dataset.playing==='false');await change(400);
 });
 await t.test('desktop and laptop keep the mockup hierarchy, equal columns and frequency controls only on right',async()=>{
  await fs.mkdir('/tmp/unit33-pitch-review',{recursive:true});
  for(const width of [1024,1280,1440,1920,820,390,320]){
   await page.setViewportSize({width,height:1100});await root.scrollIntoViewIfNeeded();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   const metrics=await root.evaluate(n=>{const cols=[...n.querySelectorAll('.pitch-column')],rect=(n,s)=>n.querySelector(s).getBoundingClientRect();return {play:cols.map(c=>rect(c,'.pitch-play').top),graph:cols.map(c=>rect(c,'.pitch-wave-card').top),width:cols.map(c=>c.getBoundingClientRect().width),right:cols[1].getBoundingClientRect().left,controls:[...n.querySelectorAll('.pitch-step')].map(b=>b.getBoundingClientRect().left),clipped:[...n.querySelectorAll('button')].some(b=>b.scrollWidth>b.clientWidth+1)};});
   if(width>600){assert.ok(Math.abs(metrics.play[0]-metrics.play[1])<1);assert.ok(Math.abs(metrics.graph[0]-metrics.graph[1])<1);}else assert.ok(metrics.play[1]>metrics.graph[0]);assert.ok(Math.abs(metrics.width[0]-metrics.width[1])<16);assert.ok(metrics.controls.every(x=>x>=metrics.right));assert.equal(metrics.clipped,false);
   await root.screenshot({path:`/tmp/unit33-pitch-review/section-${width}.png`});
   await root.locator('button[data-pitch-view=side]').click();
   assert.equal(await root.locator('.pitch-side-view:visible').count(),2);
   const outside=await root.locator('.pitch-diaphragm').evaluateAll(nodes=>nodes.some(svg=>{const box=svg.getBoundingClientRect();return [...svg.querySelectorAll('text')].some(n=>{const b=n.getBoundingClientRect();return b.left<box.left||b.right>box.right||b.bottom>box.bottom;});}));
   assert.equal(outside,false,'side position labels stay within their speaker view');
   await root.screenshot({path:`/tmp/unit33-pitch-review/side-${width}.png`});
   await root.locator('button[data-pitch-view=front]').click();
  }
 });
 await t.test('touch view switching and side-speaker playback work on a narrow screen',async()=>{
  const touch=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  const mobile=await touch.newPage();await mobile.goto(page.url(),{waitUntil:'networkidle'});
  const card=mobile.locator('#card-02');await card.locator('button[data-pitch-view=side]').tap();
  assert.equal(await card.locator('.pitch-side-view:visible').count(),2);
  await card.locator('[data-pitch-side=right] .pitch-side-view').tap();await mobile.waitForFunction(()=>document.querySelector('#card-02').dataset.playing==='true');
  await card.locator('button[data-pitch-view=front]').tap();assert.equal(await card.getAttribute('data-pitch-view'),'front');
  assert.equal(await card.locator('.pitch-front-view:visible').count(),2);await touch.close();
 });
 assert.deepEqual(errors,[]);
});
