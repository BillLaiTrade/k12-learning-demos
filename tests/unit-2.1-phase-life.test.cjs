const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');
const fs=require('node:fs/promises');
const {chromium}=require('playwright');

test('2.1 life scenes track the visible phase changes', {timeout:300000}, async t=>{
  const repo=path.resolve(__dirname,'..');
  const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:repo});
  t.after(()=>server.kill());
  const port=await new Promise((resolve,reject)=>{
    let out='';const timer=setTimeout(()=>reject(Error('server timeout')),5000);
    server.stdout.on('data',data=>{out+=data;const m=out.match(/port (\d+)/);if(m){clearTimeout(timer);resolve(m[1]);}});
  });
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
  t.after(()=>browser.close());
  const captures=process.env.PHASE_LIFE_CAPTURE_DIR||'/tmp/k12-21-phase-life/checks';await fs.mkdir(captures,{recursive:true});
  const target={melt:'liquid',freeze:'solid',vaporization:'gas',condensation:'liquid',sublimation:'gas',deposition:'solid'};
  const errors=[];
  let page;
  async function open(width,reducedMotion='no-preference'){
    if(page)await page.close();
    page=await browser.newPage({viewport:{width,height:900},reducedMotion});
    page.on('pageerror',e=>errors.push(e.message));
    page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
    await page.goto(`http://127.0.0.1:${port}/units/2/parts/2.1/`);
    await page.evaluate(()=>Promise.all([PhaseLife.readyPromise,document.fonts.ready]));
    assert.equal(await page.locator('#phase-life').getAttribute('data-assets'),'ready');
    await page.clock.install();
  }
  async function select(key){
    await page.evaluate(k=>selectPhaseProcess(k),key);
    // Align the real rendered panels, without advancing the phase clock.
    await page.evaluate(()=>{
      const a=document.querySelector('#freeze-demo').getBoundingClientRect(),b=document.querySelector('#phase-life').getBoundingClientRect();
      window.scrollBy({top:(a.top+b.bottom-innerHeight)/2,behavior:"instant"});
    });
    await page.clock.runFor(32);
  }
  async function snapshot(key){
    return page.evaluate(({key,to})=>{
      const root=document.querySelector('#phase-life'),particles=[...document.querySelectorAll('#freeze-demo-particles > circle')];
      const count=particles.filter(p=>p.classList.contains(`is-${to}`)).length;
      return {key:root.dataset.process,progress:Number(root.dataset.progress),count,total:particles.length,
        model:Number(document.querySelector('#freeze-demo').dataset.progress),water:Number(root.dataset.waterY),
        description:root.querySelector('.phase-life-description').textContent,
        pool:getComputedStyle(root.querySelector('#life-pool-shape')).display,
        ice:Number(getComputedStyle(root.querySelector('#life-ice')).opacity),
        size:root.querySelector('#life-ice').transform.baseVal.consolidate()?.matrix.a??1,
        freezeWidth:Number(root.querySelector('#life-freeze-front rect').getAttribute('width')),
        frostWidth:Number(root.querySelector('#life-frost-front rect').getAttribute('width')),
        drops:[...root.querySelectorAll('#life-droplets > *')].map(n=>Number(n.style.opacity)),
        frost:[...root.querySelectorAll('#life-frost > *')].map(n=>Number(n.style.opacity)),
        layout:[document.querySelector('#freeze-demo'),root].map(n=>{const r=n.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right};}),
        overflow:document.documentElement.scrollWidth>innerWidth+1};
    },{key,to:target[key]});
  }
  function synchronized(s,key){
    assert.equal(s.key,key);assert.equal(s.total,48);
    assert.ok(Math.abs(s.progress-s.count/(key==='vaporization'?24:48))<.000002,'life scene represents actual converted particles');
    assert.equal(s.progress,s.model);
    assert.equal(s.overflow,false);
    for(const r of s.layout){assert.ok(r.top>=-1&&r.bottom<=901,'both models can be viewed together');}
    if(key==='vaporization')assert.ok(Math.abs(s.water-(250+100*s.progress))<.001,'water line matches released fraction');
    if(key==='melt'||key==='sublimation')assert.ok(Math.abs(s.size-Math.cbrt(1-s.progress))<.00001,'visible ice volume matches solid fraction');
    if(key==='freeze')assert.ok(Math.abs(s.freezeWidth-600*s.progress)<.001,'freezing front follows particle conversion');
    if(key==='deposition')assert.ok(Math.abs(s.frostWidth-650*s.progress)<.001,'visible frost growth follows particle conversion');
    if(key==='sublimation'||key==='deposition')assert.equal(s.pool,'none','no intervening liquid');
  }
  for(const [width,motion] of [[1440,'no-preference'],[1280,'no-preference'],[1024,'no-preference'],[1024,'reduce']]){
    await open(width,motion);
    for(const key of Object.keys(target))await t.test(`${width}px ${motion}: ${key} starts, changes and finishes in sync`,async()=>{
      await select(key);
      let s=await snapshot(key);synchronized(s,key);assert.equal(s.progress,0);
      await page.clock.runFor(32);await page.clock.fastForward(4000);
      s=await snapshot(key);synchronized(s,key);assert.ok(s.progress>0&&s.progress<1);
      await page.locator('#phase-detail').screenshot({path:path.join(captures,`${width}-${motion}-${key}-mid.png`)});
      await page.clock.fastForward(6000);
      await page.clock.runFor(32);s=await snapshot(key);synchronized(s,key);assert.equal(s.progress,1);
      if(key==='vaporization'){
        assert.equal(s.count,24);assert.equal(s.water,350);
        await page.clock.fastForward(1500);assert.equal((await snapshot(key)).count,24,'liquid stays liquid after completion');
      }
      if(key==='melt'||key==='sublimation')assert.equal(s.ice,0);
      if(key==='freeze')assert.equal(s.ice,1);
      if(key==='condensation')assert.ok(s.drops.every(p=>p>.8));
      if(key==='deposition')assert.ok(s.frost.every(p=>p===1));
      if(width===1024&&motion==='no-preference')await page.locator('#phase-detail').screenshot({path:path.join(captures,`${key}-end.png`)});
    });
  }
  await t.test('replay resets the model, water level and reference together',async()=>{
    await select('vaporization');await page.clock.fastForward(10000);
    await page.locator('#freeze-demo-replay').click();
    const s=await snapshot('vaporization');synchronized(s,'vaporization');assert.equal(s.progress,0);assert.equal(s.water,250);
    await page.clock.fastForward(4000);synchronized(await snapshot('vaporization'),'vaporization');
  });
  await t.test('every transition replays from a clean start after completing',async()=>{
    for(const key of Object.keys(target)){
      await select(key);await page.clock.fastForward(10000);await page.clock.runFor(32);
      assert.equal((await snapshot(key)).progress,1);
      await page.locator('#freeze-demo-replay').click();await page.clock.runFor(32);
      const start=await snapshot(key);synchronized(start,key);assert.equal(start.progress,0);
      await page.clock.fastForward(10000);await page.clock.runFor(32);
      const end=await snapshot(key);synchronized(end,key);assert.equal(end.progress,1);
    }
  });
  await t.test('scrolling away pauses both scenes and resuming preserves progress',async()=>{
    await select('melt');await page.clock.fastForward(4000);const before=await snapshot('melt');
    await page.evaluate(()=>window.scrollTo({top:0,behavior:"instant"}));await page.clock.runFor(32);await page.clock.fastForward(3500);
    assert.equal((await snapshot('melt')).progress,before.progress);
    await page.evaluate(()=>{const a=document.querySelector('#freeze-demo').getBoundingClientRect(),b=document.querySelector('#phase-life').getBoundingClientRect();window.scrollBy({top:(a.top+b.bottom-innerHeight)/2,behavior:"instant"});});
    await page.clock.runFor(1500);const after=await snapshot('melt');assert.ok(after.progress>before.progress,JSON.stringify({before,after,transition:await page.evaluate(()=>phaseDemoTransition)}));
  });
  await t.test('rapid changes cancel stale scenes and repeat correctly',async()=>{
    await select('melt');await page.clock.fastForward(2200);
    await select('deposition');await select('vaporization');await page.clock.fastForward(10000);
    const s=await snapshot('vaporization');synchronized(s,'vaporization');assert.equal(s.count,24);assert.equal(s.progress,1);
    await select('deposition');const reset=await snapshot('deposition');assert.equal(reset.progress,0);assert.ok(reset.frost.every(p=>p===0));
  });
  await t.test('all twelve overview routes update life scenes from population changes and cancel cleanly',async()=>{
    for(const state of ['solid','liquid','gas']){
      await page.evaluate(k=>selectPhaseState(k),state);
      assert.equal(await page.locator('#phase-life').isVisible(),false);
      for(const slot of ['top-left','top-right','bottom-left','bottom-right']){
        await page.evaluate(({slot})=>{
          const b=document.querySelector(`.phase-solid-process[data-overview-slot="${slot}"]`);
          selectPhaseProcess(b.dataset.phaseProcess,true);
        },{slot});
        const result=await page.evaluate(()=>{
          const flow=phaseOverviewFlow,initial=phaseOverviewCount;
          changePhaseOverviewPopulation(flow,flow.incoming?1:-1);
          return {progress:Number(document.querySelector('#phase-life').dataset.progress),expected:Math.abs(phaseOverviewCount-flow.initialCount)/(flow.incoming?72-flow.initialCount:flow.initialCount-16),key:document.querySelector('#phase-life').dataset.process,flowKey:flow.key};
        });
        assert.equal(result.key,result.flowKey);assert.ok(Math.abs(result.progress-result.expected)<.000002);
        await page.evaluate(k=>selectPhaseState(k),state);
        assert.equal(await page.locator('#phase-life').isVisible(),false);
      }
    }
  });
  await t.test('shared query and original anchor links start without manual scrolling',async()=>{
    await page.close();page=await browser.newPage({viewport:{width:1366,height:768}});
    page.on('pageerror',e=>errors.push(e.message));
    for(const suffix of ['?phase=vaporization#phase-detail','#phase-detail']){
      await page.goto(`http://127.0.0.1:${port}/units/2/parts/2.1/${suffix}`);
      await page.waitForFunction(()=>Number(document.querySelector('#phase-life').dataset.progress)>0,null,{timeout:15000});
      const key=await page.locator('#phase-life').getAttribute('data-process');const s=await snapshot(key);
      synchronized(s,key);assert.ok(s.layout.every(r=>r.top>=0&&r.bottom<=768));
    }
  });
  await t.test('no script or asset failures',()=>assert.deepEqual(errors,[]));
  await fs.writeFile(path.join(captures,'result.json'),JSON.stringify({cases:24,extra:7,errors},null,2));
});
