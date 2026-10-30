const {test}=require('node:test'),assert=require('node:assert/strict'),{spawn}=require('node:child_process'),path=require('node:path'),fs=require('node:fs/promises'),{chromium}=require('playwright');
test('pitch comparison: independent speakers, controlled frequency and synchronized records',{timeout:90000},async t=>{
 const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:['ignore','pipe','ignore']});t.after(()=>server.kill());
 const port=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server timeout')),5000);server.stdout.on('data',d=>{const m=String(d).match(/port (\d+)/);if(m){clearTimeout(timer);resolve(m[1]);}});server.once('error',reject);});
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',...(process.env.SOUND33_BASE_URL?{proxy:{server:process.env.HTTPS_PROXY}}:{})});t.after(()=>browser.close());
 const page=await browser.newPage({viewport:{width:1440,height:1100},reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
 await page.addInitScript(()=>{window.pitchRuns=[];const create=AudioContext.prototype.createBufferSource;
  AudioContext.prototype.createBufferSource=function(){const source=create.call(this),start=source.start.bind(source),stop=source.stop.bind(source);let record;
   source.start=function(...args){const a=source.buffer.getChannelData(0),rate=source.buffer.sampleRate;let squares=0,crossings=0;for(let i=Math.floor(rate*.2);i<Math.floor(rate*.7);i++){squares+=a[i]**2;if(a[i-1]<0&&a[i]>=0)crossings++;}record={frequency:crossings/.5,rms:Math.sqrt(squares/(rate*.5)),stopped:false};window.pitchRuns.push(record);return start(...args);};source.stop=function(...args){if(record)record.stopped=true;return stop(...args);};return source;
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
  assert.equal(await left.locator('.pitch-wave').getAttribute('data-frequency'),'200');assert.equal(await right.locator('.pitch-wave').getAttribute('data-frequency'),'400');
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
  assert.ok(Math.abs(runs[2].rms/runs[0].rms-1)<.01);assert.equal(await left.getAttribute('data-sounding'),'false');assert.equal(await right.getAttribute('data-sounding'),'true');
  const kept=await left.locator('.signal').getAttribute('d');await change(800);assert.equal(await left.locator('.signal').getAttribute('d'),kept);assert.equal(await root.getAttribute('data-playing'),'false');await right.locator('.pitch-speaker').click();await page.waitForFunction(()=>document.querySelector('#card-02').dataset.playing==='true');
  assert.equal(await page.evaluate(()=>window.pitchRuns.at(-1).frequency),800);await change(400);
 });
 await t.test('one side animates with its trace; natural finish rests the cone and keeps the full comparison',async()=>{
  const fixed=await left.locator('.pitch-fixed').innerHTML();await play('left');await page.waitForTimeout(350);
  const inspect=async col=>col.evaluate(n=>({progress:Number(n.querySelector('.pitch-wave').dataset.progress),displacement:Number(n.querySelector('.pitch-diaphragm').dataset.displacement),hz:Number(n.querySelector('.pitch-wave').dataset.frequency),surround:n.querySelector('.pitch-surround-top').getAttribute('d')}));
  const a=await inspect(left);assert.ok(a.progress>0&&a.progress<1);assert.ok(Math.abs(a.displacement-14*Math.sin(2*Math.PI*a.hz*.01*a.progress))<1e-8);assert.equal((await inspect(right)).displacement,0);assert.equal(await left.locator('.pitch-fixed').innerHTML(),fixed);assert.ok(Math.abs(Number(a.surround.split(' ').at(-2))-(128+a.displacement))<1e-8,'rubber surround stays attached to moving diaphragm');
  await page.waitForFunction(()=>document.querySelector('#card-02').dataset.playing==='false');assert.equal((await inspect(left)).progress,1);assert.equal((await inspect(left)).displacement,0);
  const previous=await left.locator('.signal').getAttribute('d');await play('right');await page.waitForTimeout(300);assert.equal(await left.locator('.signal').getAttribute('d'),previous);
  await page.waitForFunction(()=>document.querySelector('#card-02').dataset.playing==='false');assert.equal((await inspect(right)).progress,1);
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
   assert.ok(Math.abs(metrics.play[0]-metrics.play[1])<1);assert.ok(Math.abs(metrics.graph[0]-metrics.graph[1])<1);assert.ok(Math.abs(metrics.width[0]-metrics.width[1])<16);assert.ok(metrics.controls.every(x=>x>=metrics.right));assert.equal(metrics.clipped,false);
   await root.screenshot({path:`/tmp/unit33-pitch-review/section-${width}.png`});
  }
 });
 assert.deepEqual(errors,[]);
});
