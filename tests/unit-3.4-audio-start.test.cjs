const {test}=require('node:test'),assert=require('node:assert/strict'),{spawn}=require('node:child_process'),path=require('node:path'),fs=require('node:fs/promises'),{chromium}=require('playwright');
const override=process.env.AUDIO_START_URL,captures=process.env.AUDIO_START_CAPTURE_DIR||'/tmp/k12-34-audio-start';
test('3.4 audio preparation and visual clocks share the scheduled start',{timeout:180000},async t=>{
 let server,url=override;
 if(!url){server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..')});t.after(()=>server.kill());const port=await new Promise((resolve,reject)=>{let output='';const timer=setTimeout(()=>reject(Error('server timeout')),5000);server.stdout.on('data',b=>{output+=b;const m=output.match(/port (\d+)/);if(m){clearTimeout(timer);resolve(m[1]);}});server.on('error',reject);});url=`http://127.0.0.1:${port}/units/3/parts/3.4/`;}
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',...(override?{proxy:{server:process.env.HTTPS_PROXY||process.env.HTTP_PROXY}}:{})});t.after(()=>browser.close());await fs.mkdir(captures,{recursive:true});const report=[];
 async function open(id){
  const p=await browser.newPage({viewport:{width:1366,height:768}});
  await p.addInitScript(()=>{
   window.startDelay=600;window.soundSources=[];window.outputs=[];
   const Native=AudioContext;
   window.AudioContext=class extends Native{
    constructor(...args){super(...args);window.lessonAudio=this;}
    async resume(){await new Promise(r=>setTimeout(r,window.startDelay));return super.resume();}
    createGain(){const gain=super.createGain(),connect=gain.connect.bind(gain),context=this;gain.connect=function(destination,...args){if(destination===context.destination){const analyser=context.createAnalyser();analyser.fftSize=2048;connect(analyser);const output={samples:[]};window.outputs.push(output);const data=new Float32Array(2048),timer=setInterval(()=>{analyser.getFloatTimeDomainData(data);output.samples.push({time:context.currentTime,peak:Math.max(...data.map(Math.abs))});},5);setTimeout(()=>clearInterval(timer),8000);}return connect(destination,...args);};return gain;}
    createBufferSource(){const source=super.createBufferSource(),entry={ended:false},context=this,start=source.start.bind(source),stop=source.stop.bind(source);window.soundSources.push(entry);source.start=(when,offset=0)=>{entry.when=when;entry.offset=offset;entry.duration=source.buffer.duration;return start(when,offset);};source.stop=(...args)=>{entry.stoppedAt=context.currentTime;return stop(...args);};source.addEventListener('ended',()=>{entry.ended=true;entry.endedAt=context.currentTime;});return source;}
   };
  });
  await p.goto(url);await p.waitForFunction(()=>document.body.dataset.ready==='true');
  return {p,root:p.locator('#'+id),emit:p.locator(`[data-play=${id}]`),pause:p.locator(`[data-pause=${id}]`)};
 }
 async function complete(p,id){await p.waitForFunction(id=>document.getElementById(id).dataset.phase==='complete',id);}
 for(const [id,section,delays]of[['reflection','s1',[0,4.4]],['distance','s2',[0,2,4]],['calculation','s3',[0,4]]]){
  await t.test(`${id}: 600ms preparation holds zero, aligns reception and lets every echo finish`,async()=>{
   const {p,root,emit}=await open(id);try{
    await p.evaluate(id=>{const target=document.getElementById(id==='distance'?'distance-far-lane':id==='calculation'?'calculation-scene':id);new MutationObserver(()=>{if(target.dataset.stage==='received'&&window.receivedAt===undefined)window.receivedAt=window.lessonAudio.currentTime;}).observe(target,{attributes:true,attributeFilter:['data-stage']});},id);
    await emit.click();await p.waitForTimeout(200);assert.equal(await root.getAttribute('data-progress'),'0');assert.equal(await p.evaluate(()=>window.soundSources.length),0);await root.screenshot({path:`${captures}/${id}-preparing.png`});
    await complete(p,id);
    const evidence=await p.evaluate(()=>{const sources=window.soundSources,output=window.outputs.at(-1);return{sources,receivedAt:window.receivedAt,peaks:sources.map(s=>Math.max(0,...output.samples.filter(x=>x.time>=s.when&&x.time<s.when+.16).map(x=>x.peak))),audioPlaying:document.body.dataset.audioPlaying};});
    assert.equal(evidence.sources.length,delays.length);assert.ok(evidence.sources.every(s=>s.ended&&s.stoppedAt===undefined),JSON.stringify(evidence));
    evidence.sources.forEach((s,i)=>assert.ok(Math.abs(s.when-evidence.sources[0].when-delays[i])<1e-6));
    assert.ok(evidence.peaks[0]>.25&&evidence.peaks[0]<.34,JSON.stringify(evidence));assert.ok(evidence.peaks.slice(1).every(x=>x>.1&&x<.17),JSON.stringify(evidence));
    const skew=evidence.receivedAt-evidence.sources.at(-1).when;assert.ok(skew>=-.025&&skew<.10,JSON.stringify({id,skew,evidence}));assert.equal(evidence.audioPlaying,'false');
    await p.locator('#'+section).screenshot({path:`${captures}/${id}-complete-1366.png`});report.push({id,skew,...evidence});
   }finally{await p.close();}
  });
 }
 await t.test('pausing before audio activation keeps zero; resuming does not create another emission',async()=>{
  const {p,root,emit,pause}=await open('calculation');try{
   await p.locator('#echo-time').fill('0.5');await p.locator('#echo-time').press('Enter');await emit.click();await p.waitForTimeout(150);await pause.click();const count=await root.getAttribute('data-emissions');await p.waitForTimeout(600);assert.equal(await root.getAttribute('data-phase'),'paused');assert.equal(await root.getAttribute('data-progress'),'0');assert.equal(await p.evaluate(()=>window.soundSources.length),0);
   await pause.click();await p.waitForTimeout(200);assert.equal(await root.getAttribute('data-progress'),'0');await complete(p,'calculation');assert.equal(await root.getAttribute('data-emissions'),count);assert.equal(await p.evaluate(()=>window.soundSources.length),2);
  }finally{await p.close();}
 });
 await t.test('editing conditions and rapid replay invalidate pending audio without a stale start',async()=>{
  const {p,root,emit}=await open('calculation');try{
   await emit.click();await p.waitForTimeout(150);await p.locator('#echo-time').fill('0.5');await p.locator('#echo-time').press('Enter');await p.waitForTimeout(650);assert.equal(await root.getAttribute('data-phase'),'ready');assert.equal(await p.evaluate(()=>window.soundSources.length),0);
   await emit.click();await p.waitForTimeout(150);await emit.click();await complete(p,'calculation');assert.equal(await p.evaluate(()=>window.soundSources.length),2);assert.equal(await root.getAttribute('data-time'),'0.5');assert.equal(await p.locator('#calculation-error').isHidden(),true);
  }finally{await p.close();}
 });
 await t.test('starting another section or hiding the page cancels preparation before sources exist',async()=>{
  const {p,root,emit}=await open('calculation');try{
   await emit.click();await p.waitForTimeout(150);await p.locator('[data-play=distance]').click();assert.equal(await root.getAttribute('data-phase'),'paused');assert.equal(await root.getAttribute('data-progress'),'0');
   await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});await p.waitForTimeout(700);assert.equal(await p.evaluate(()=>window.soundSources.length),0);assert.equal(await p.locator('#distance').getAttribute('data-phase'),'paused');assert.equal(await p.locator('body').getAttribute('data-audio-playing'),'false');
   await p.evaluate(()=>{delete document.hidden;});await p.locator('#echo-time').fill('0.5');await p.locator('#echo-time').press('Enter');await emit.click();await complete(p,'calculation');assert.equal(await p.evaluate(()=>window.soundSources.length),2);
  }finally{await p.close();}
 });
 await t.test('a delayed resume preserves the paused frame and only schedules the remaining echo',async()=>{
  const {p,root,emit,pause}=await open('calculation');try{
   await p.locator('#echo-time').fill('1');await p.locator('#echo-time').press('Enter');await emit.click();await p.waitForFunction(()=>Number(document.getElementById('calculation').dataset.elapsed)>.3);await pause.click();const elapsed=Number(await root.getAttribute('data-elapsed')),count=await root.getAttribute('data-emissions'),wave=await p.locator('#calculation-waves').innerHTML();
   await pause.click();await p.waitForTimeout(200);assert.equal(Number(await root.getAttribute('data-elapsed')),elapsed);assert.equal(await p.locator('#calculation-waves').innerHTML(),wave);await complete(p,'calculation');assert.equal(await root.getAttribute('data-emissions'),count);
   const sources=await p.evaluate(()=>window.soundSources);assert.equal(sources.length,3);assert.ok(sources[1].stoppedAt<sources[1].when);assert.ok(sources[2].ended&&sources[2].stoppedAt===undefined);const peak=await p.evaluate(()=>{const last=window.soundSources.at(-1);return Math.max(0,...window.outputs.at(-1).samples.filter(s=>s.time>=last.when&&s.time<last.when+.16).map(s=>s.peak));});assert.ok(peak>.1&&peak<.17);
  }finally{await p.close();}
 });
 await fs.writeFile(captures+'/timing.json',JSON.stringify(report,null,2)+'\n');
});
