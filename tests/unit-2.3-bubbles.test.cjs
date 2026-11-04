const {test}=require('node:test'),assert=require('node:assert/strict'),{spawn}=require('node:child_process'),path=require('node:path'),{chromium}=require('playwright');
test('cup bubbles rise and clear in live scenes and observation replay, including reduced motion',{timeout:120000},async t=>{
 let url=process.env.CUP_BUBBLES_URL;
 if(!url){const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..')});t.after(()=>server.kill());const port=await new Promise(resolve=>server.stdout.on('data',data=>{const match=String(data).match(/port (\d+)/);if(match)resolve(match[1]);}));url=`http://127.0.0.1:${port}/units/2/parts/2.3/`;}
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox'],...(process.env.CUP_BUBBLES_URL?{proxy:{server:process.env.HTTPS_PROXY}}:{})});t.after(()=>browser.close());
 for(const reducedMotion of['no-preference','reduce'])await t.test(reducedMotion,async()=>{
  const p=await browser.newPage({viewport:{width:reducedMotion==='reduce'?390:1366,height:900},reducedMotion});try{
   await p.clock.install();await p.goto(url,{waitUntil:'networkidle'});await p.clock.pauseAt(await p.evaluate(()=>Date.now()+100));const scene=p.locator('#cup-scene');await scene.focus();
   for(let i=0;i<26;i++)await p.keyboard.press('ArrowDown');assert.equal(await scene.locator('.cup-bubble').count(),0,'compression without escaping air does not emit bubbles');
   for(let i=0;i<18;i++){await p.keyboard.press('ArrowRight');await p.clock.runFor(95);}
   assert.equal(await scene.getAttribute('data-wet'),'true');
   const particles=root=>root.locator('.cup-bubble>circle:first-child'),live=particles(scene),record=particles(p.locator('#cup-after-scene'));
   assert.ok(await live.count()>0);assert.ok(await record.count()>0);
   const state=await scene.evaluate(n=>[n.dataset.depth,n.dataset.angle,n.dataset.escaped,n.dataset.wet,n.dataset.waterArea]),y=Number(await live.last().getAttribute('cy')),recordY=Number(await record.last().getAttribute('cy'));
   await p.clock.runFor(180);assert.ok(Number(await live.last().getAttribute('cy'))<y,'released live bubbles keep rising after the operation');assert.ok(Number(await record.last().getAttribute('cy'))<recordY,'observation card bubbles must not freeze');
   assert.deepEqual(await scene.evaluate(n=>[n.dataset.depth,n.dataset.angle,n.dataset.escaped,n.dataset.wet,n.dataset.waterArea]),state,'particle motion does not change gas or water amounts');
   await p.locator('[data-cup-preview=after]').click();assert.equal(await scene.getAttribute('data-preview'),'after');assert.ok(await live.count()>0);
   const replayY=Number(await live.last().getAttribute('cy'));await p.clock.runFor(180);assert.ok(Number(await live.last().getAttribute('cy'))<replayY,'recalled observation also animates its bubbles');
   await p.clock.runFor(8000);assert.equal(await live.count(),0);assert.equal(await record.count(),0);
   await p.locator('[data-cup-preview=after]').click();await scene.focus();await p.keyboard.press('ArrowRight');await p.clock.runFor(500);assert.equal(await live.count(),0,'spent air does not keep generating new bubbles');
   await p.locator('[data-cup-preview=after]').click();assert.ok(await live.count()>0,'recording can replay without changing the actual sample');await p.locator('#cup-reset').click();await p.clock.runFor(200);assert.equal(await live.count(),0);assert.equal(await record.count(),0);assert.equal(await scene.getAttribute('data-wet'),'false');
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  }finally{await p.close();}
 });
});
