const {test}=require('node:test'),assert=require('node:assert/strict'),{spawn}=require('node:child_process'),path=require('node:path'),fs=require('node:fs/promises'),crypto=require('node:crypto'),{chromium}=require('playwright');
const dir=path.resolve(__dirname,'../units/3/parts/3.3/assets/timbre-audio');
test('published timbre PCM keeps provenance, pitch, level and headroom',async()=>{
 const model=await import('../units/3/parts/3.3/assets/timbre-model.mjs'),manifest=JSON.parse(await fs.readFile(path.join(dir,'recordings.json'),'utf8'));
 assert.equal(manifest.target_hz,440);assert.equal(manifest.recordings.length,3);
 for(const row of manifest.recordings){
  const file=await fs.readFile(path.join(dir,row.file));assert.equal(crypto.createHash('sha256').update(file).digest('hex'),row.sha256);
  const {samples:a,rate}=model.decodePCM(file.buffer.slice(file.byteOffset,file.byteOffset+file.length));
  assert.equal(rate,22050);assert.equal(a.length/rate,1.2);
  assert.ok(Math.abs(row.measured_hz-440)<.2);assert.ok(Math.abs(Math.sqrt(a.reduce((n,v)=>n+v*v,0)/a.length)-manifest.rms_target)<.00002);
  assert.ok(a.every(v=>Math.abs(v)<.9));
 }
 assert.match(manifest.recordings[1].license_url,/by\/3.0/);assert.match(manifest.recordings[2].license_url,/by\/4.0/);
 assert.match(manifest.pipe_description,/PVC/);assert.match(await fs.readFile(path.join(dir,'LICENSE.md'),'utf8'),/allan764[\s\S]*mrshoes/);
 assert.throws(()=>model.decodePCM(new ArrayBuffer(44)));await assert.rejects(model.loadTimbreClip('bogus'));
});

test('timbre rows use their actual playback PCM and independent controls',{timeout:150000},async t=>{
 const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:['ignore','pipe','ignore']});t.after(()=>server.kill());
 const port=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server timeout')),5000);server.stdout.on('data',d=>{const m=String(d).match(/port (\d+)/);if(m){clearTimeout(timer);resolve(m[1]);}});server.once('error',reject);});
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',...(process.env.SOUND33_BASE_URL?{proxy:{server:process.env.HTTPS_PROXY}}:{})});t.after(()=>browser.close());
 const context=await browser.newContext({viewport:{width:1440,height:1100},reducedMotion:'reduce'});t.after(()=>context.close());
 await context.addInitScript(()=>{
  window.timbreRuns=[];const create=AudioContext.prototype.createBufferSource;
  AudioContext.prototype.createBufferSource=function(){
   const s=create.call(this),start=s.start.bind(s),stop=s.stop.bind(s);let run;
   s.start=(...args)=>{run={samples:Array.from(s.buffer.getChannelData(0)),rate:s.buffer.sampleRate,stopped:false};window.timbreRuns.push(run);return start(...args);};
   s.stop=(...args)=>{if(run)run.stopped=true;return stop(...args);};return s;
  };
 });
 const page=await context.newPage(),errors=[],capture=process.env.TIMBRE_CAPTURE_DIR||'/tmp/unit33-timbre-review';await fs.mkdir(capture,{recursive:true});
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
 const url=process.env.SOUND33_BASE_URL||`http://127.0.0.1:${port}/units/3/parts/3.3/`;
 await page.goto(url+'#card-05',{waitUntil:'networkidle'});
 const root=page.locator('#card-05'),row=k=>root.locator(`[data-timbre=${k}]`),play=async k=>{const n=await page.evaluate(()=>window.timbreRuns.length);await row(k).locator('.play').click();await page.waitForFunction(n=>window.timbreRuns.length>n,n);};
 await t.test('three compact rows are visible with genuine PCM plots and no autoplay',async()=>{
  assert.equal(await root.locator('.timbre-row').count(),3);assert.equal(await root.locator('.play').count(),3);assert.equal(await root.locator('input,select,.stop,.reset').count(),0);
  assert.equal(await page.evaluate(()=>window.timbreRuns.length),0);
  await page.waitForFunction(()=>[...document.querySelectorAll('#card-05 .timbre-row')].every(n=>n.dataset.ready==='true'));
  assert.equal(new Set(await root.locator('.signal').evaluateAll(ns=>ns.map(n=>n.getAttribute('d')))).size,3);
  assert.match(await row('pure').innerText(),/近似純音示意/);assert.match(await root.locator('.timbre-sources').textContent(),/封底 PVC/);
  assert.ok((await root.locator('.timbre-bench').boundingBox()).height<510);
 });
 await t.test('every plotted vertex equals the same sample in the actual AudioBuffer, before and after replay',async()=>{
  for(const k of ['pure','string','pipe']){
   const before=await row(k).locator('.signal').getAttribute('d');await play(k);
   const actual=await page.evaluate(async key=>{
    const run=window.timbreRuns.at(-1),plot=document.querySelector('#tone-'+key),points=[...plot.querySelector('.signal').getAttribute('d').matchAll(/[ML]([\d.]+) (-?[\d.]+)/g)].map(m=>[+m[1],+m[2]]);
    const bytes=await (await fetch(new URL('assets/timbre-audio/'+key+'.wav',location.href))).arrayBuffer(),v=new DataView(bytes);let offset=12,data;
    while(offset+8<=v.byteLength){const size=v.getUint32(offset+4,true);if(String.fromCharCode(...new Uint8Array(bytes,offset,4))==='data'){data=offset+8;break;}offset+=8+size+size%2;}
    let pcmError=0,plotError=0;
    for(let i=0;i<run.samples.length;i++)pcmError=Math.max(pcmError,Math.abs(run.samples[i]-v.getInt16(data+i*2,true)/32768));
    for(const [x,y]of points){const index=Math.round((.2+(x-52)/500*.01)*run.rate);plotError=Math.max(plotError,Math.abs((80-y)/(64/.6)-run.samples[index]));}
    const a=run.samples,rate=run.rate,first=Math.round(rate*.25),count=Math.round(rate*.15);let lagBest=0,best=-1,values={};
    for(let lag=Math.floor(rate/480);lag<=Math.ceil(rate/400);lag++){let xy=0,xx=0,yy=0;for(let i=first;i<first+count;i++){xy+=a[i]*a[i+lag];xx+=a[i]**2;yy+=a[i+lag]**2;}values[lag]=xy/Math.sqrt(xx*yy);if(values[lag]>best){best=values[lag];lagBest=lag;}}
    const left=values[lagBest-1],center=values[lagBest],right=values[lagBest+1],delta=.5*(left-right)/(left-2*center+right);
    return {pcmError,plotError,count:points.length,rate,hz:rate/(lagBest+delta),rms:Math.sqrt(a.reduce((n,x)=>n+x*x,0)/a.length),peak:Math.max(...a)};
   },k);
   assert.equal(actual.pcmError,0,`${k} uses published PCM bit-for-bit`);assert.ok(actual.plotError<.0000001,`${k} vertices match AudioBuffer`);assert.ok(actual.count>=220);
   assert.equal(actual.rate,22050);assert.ok(Math.abs(actual.hz-440)<2,`${k}: ${actual.hz}Hz`);assert.ok(actual.rms>.13&&actual.rms<.15);assert.ok(actual.peak<.9);
   assert.equal(await row(k).locator('.signal').getAttribute('d'),before);assert.equal(await row(k).getAttribute('data-sounding'),'true');
  }
 });
 await t.test('left-left-right listening cancels previous source, ends cleanly and supports keyboard',async()=>{
  await play('pure');await play('pure');await play('string');
  assert.deepEqual(await page.evaluate(()=>window.timbreRuns.slice(-3).map(r=>r.stopped)),[true,true,false]);assert.equal(await root.locator('[data-sounding=true]').count(),1);
  await page.waitForFunction(()=>document.querySelector('#card-05').dataset.playing==='false');assert.equal(await root.locator('[aria-pressed=true]').count(),0);
  await row('pipe').locator('.play').focus();const n=await page.evaluate(()=>window.timbreRuns.length);await page.keyboard.press('Enter');await page.waitForFunction(n=>window.timbreRuns.length===n+1,n);
  await page.locator('.route a[href="#card-06"]').click();assert.equal(await root.getAttribute('data-playing'),'false');
  await play('pure');await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));delete document.hidden;});assert.equal(await root.getAttribute('data-playing'),'false');
 });
 await t.test('desktop, laptop and phone keep aligned charts, complete instruments and usable buttons',async()=>{
  for(const width of [1920,1440,1280,1024,820,760,390,320]){
   await page.setViewportSize({width,height:1100});await root.scrollIntoViewIfNeeded();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   const issues=await root.locator('.timbre-row').evaluateAll(rows=>rows.flatMap(row=>{
    const r=row.getBoundingClientRect(),button=row.querySelector('.play'),b=button.getBoundingClientRect(),s=row.querySelector('.wave').getBoundingClientRect();
    return b.width>=90&&b.height>=42&&b.left>=r.left&&b.right<=r.right&&button.scrollWidth<=button.clientWidth+1&&s.right<=r.right?[]:[row.dataset.timbre];
   }));assert.deepEqual(issues,[],`${width}px controls`);
   const xs=await root.locator('.wave').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().left));assert.ok(Math.max(...xs)-Math.min(...xs)<1);
   if([1440,1024,390].includes(width))await root.screenshot({path:path.join(capture,`timbre-${width}.png`)});
  }
 });
 await t.test('actual touch plays once and can independently replay another instrument',async()=>{
  const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const p=await mobile.newPage();let starts=0;await p.addInitScript(()=>{window.starts=0;const create=AudioContext.prototype.createBufferSource;AudioContext.prototype.createBufferSource=function(){const s=create.call(this),start=s.start.bind(s);s.start=(...args)=>{window.starts++;return start(...args);};return s;};});
  await p.goto(url+'#card-05',{waitUntil:'networkidle'});for(const key of ['string','string','pipe']){await p.locator(`[data-play="tone-${key}"]`).tap();await p.waitForFunction(n=>window.starts===n,++starts);await p.waitForTimeout(70);assert.equal(await p.evaluate(()=>window.starts),starts);}await mobile.close();
 });
 await t.test('delayed clip cannot play after leaving; failed preload stays empty and playback retries',async()=>{
  const c=await browser.newContext(),p=await c.newPage();let release,seen;const pending=new Promise(r=>release=r),requested=new Promise(r=>seen=r);
  await p.route('**/timbre-audio/string.wav*',async route=>{seen();await pending;await route.continue();});let fail=true;
  await p.route('**/timbre-audio/pipe.wav*',route=>{if(fail){fail=false;return route.fulfill({status:503,body:'unavailable'});}return route.continue();});
  await p.goto(url+'#card-05',{waitUntil:'domcontentloaded'});await requested;await p.waitForFunction(()=>document.querySelector('[data-timbre=pipe] .timbre-load').textContent.includes('未載入'));
  assert.equal(await p.locator('#tone-pipe .signal').count(),0,'no decorative fallback waveform');
  await p.locator('[data-play=tone-string]').click();await p.locator('.route a[href="#card-06"]').click();release();await p.waitForFunction(()=>document.querySelector('[data-timbre=string]').dataset.ready==='true');await p.waitForTimeout(80);assert.equal(await p.locator('#card-05').getAttribute('data-playing'),'false');
  await p.locator('[data-play=tone-pipe]').click();await p.waitForFunction(()=>document.querySelector('#card-05').dataset.playing==='true');assert.equal(await p.locator('#tone-pipe .signal').count(),1);await c.close();
 });
 assert.deepEqual(errors,[]);
});
