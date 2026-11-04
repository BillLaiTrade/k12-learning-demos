const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');
const fs=require('node:fs/promises');
const {chromium}=require('playwright');

test('experiments share a persistent video-style footer and concise summaries', {timeout:180000}, async t=>{
 let url=process.env.PLAYER_URL;
 if(!url){
  const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..')});t.after(()=>server.kill());
  const port=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server timeout')),5000);server.stdout.on('data',b=>{const m=String(b).match(/port (\d+)/);if(m){clearTimeout(timer);resolve(m[1]);}});server.once('error',reject);});
  url=`http://127.0.0.1:${port}/units/2/parts/2.3/`;
 }
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',...(process.env.PLAYER_URL?{proxy:{server:process.env.HTTPS_PROXY||process.env.HTTP_PROXY}}:{})});t.after(()=>browser.close());
 const out=process.env.PLAYER_ARTIFACT_DIR||'/tmp/unit23-player/checks';await fs.mkdir(out,{recursive:true});
 const measurements=[];
 for(const width of [1440,1024,768,390,320])await t.test(`persistent footer and compact summary at ${width}px`,async()=>{
  const page=await browser.newPage({viewport:{width,height:1100}});t.after(()=>page.close());const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install();await page.goto(url,{waitUntil:'networkidle'});await page.waitForFunction(()=>['.oxygen-preparation','.co2-preparation'].every(s=>document.querySelector(s).dataset.ready==='true'));await page.clock.pauseAt(await page.evaluate(()=>Date.now()+100));
  for(const gas of ['oxygen','co2']){
   const root=page.locator(`.${gas}-preparation`),footer=root.locator('.experiment-player-footer'),play=root.locator('[data-play]'),caption=footer.locator('[data-scene-note]');
   assert.equal(await play.count(),1);assert.equal(await root.locator(`.${gas}-step-nav [data-play]`).count(),0);
   assert.equal(await footer.isVisible(),true);assert.match(await caption.innerText(),/桌上是這次實驗/);
   assert.equal(await caption.evaluate(n=>n.getAnimations().length),0);
   assert.match(await play.innerText(),/播放/);assert.equal(await root.getAttribute('data-state'),'ready');
   const baseline=await footer.boundingBox(),baselineY=baseline.y-(await root.locator(`.${gas}-stage-area`).boundingBox()).y,initialScene=root.locator(gas==='oxygen'?'.oxygen-materials-photo':'.co2-material-scene'),initialPicture=await initialScene.boundingBox();
   assert.ok(baseline.y>=initialPicture.y+initialPicture.height-1);
   const hint=footer.locator('[data-continuous-status]');assert.equal(await hint.innerText(),'點畫面空白處，也可暫停／繼續。');
   const summary=page.locator(gas==='oxygen'?'#s3 .oxygen-summary':'.co2-summary');assert.equal(await summary.locator('dt').count(),gas==='oxygen'?7:6);
   const rows=await summary.locator('dd').allTextContents();assert.ok(rows.every(s=>s.length<60));
   if(width===1440){assert.ok((await summary.boundingBox()).height<550);assert.equal(await summary.locator('dd').evaluateAll(ns=>ns.every(n=>parseFloat(getComputedStyle(n).fontSize)>=16)),true);}
   if([1440,390].includes(width))await root.locator(`.${gas}-stage-area`).screenshot({path:path.join(out,`${gas}-initial-${width}.png`)});
   for(let i=1;i<(gas==='co2'?7:8);i++){
    const tab=root.locator(`#${gas}-tab-${i}`);if(!await tab.isVisible())await root.locator('[data-step-menu]').click();await tab.click();
    assert.equal(await root.getAttribute('data-state'),'playing');
    assert.equal(await footer.count(),1);assert.equal(await footer.locator('[data-play]').count(),1);assert.equal(await caption.isVisible(),true);
    const controls=await footer.locator('.experiment-playback-controls').boundingBox(),note=await footer.locator('.oxygen-caption').boundingBox();
    const picture=await root.locator(gas==='oxygen'?'.oxygen-step-panel:visible .oxygen-main-scene':'.co2-step:visible .co2-main-scene').boundingBox();
    assert.ok(controls.y>=picture.y+picture.height-1);assert.ok(note.y>=controls.y+controls.height-1);
    const current=await footer.boundingBox();const contentBottom=await footer.locator('.oxygen-scene-note,.co2-scene-note,.oxygen-caption-label').evaluateAll(ns=>Math.max(...ns.map(n=>n.getBoundingClientRect().bottom)));const captionBox=await footer.locator('.oxygen-caption').boundingBox();assert.ok(captionBox.y+captionBox.height-contentBottom<=10,'description has no reserved empty lines');
    assert.ok(Math.abs(current.y-(await root.locator(`.${gas}-stage-area`).boundingBox()).y-baselineY)<2,`${gas}/${i}: footer does not jump within its player frame`);
    assert.equal(await hint.innerText(),'點畫面空白處，也可暫停／繼續。');
    await play.click();assert.equal(await root.getAttribute('data-state'),'paused');assert.match(await play.innerText(),/繼續/);
   }
   if([1440,390].includes(width)){
    await root.locator(`.${gas}-stage-area`).screenshot({path:path.join(out,`${gas}-playing-${width}.png`)});
    await summary.screenshot({path:path.join(out,`${gas}-summary-${width}.png`)});
   }
   measurements.push({gas,width,summaryHeight:(await summary.boundingBox()).height,footerHeight:baseline.height});
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);
 });
 await fs.writeFile(path.join(out,'measurements.json'),JSON.stringify(measurements,null,2)+'\n');
});
