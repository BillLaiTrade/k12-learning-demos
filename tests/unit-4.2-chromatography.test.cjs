const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const { chromium } = require('playwright');

test('4.2 hands-on chromatography: science, controls and approved layout', { timeout: 180000 }, async t => {
  const server = spawn('python3', ['-u','-m','http.server','0','--bind','127.0.0.1'], { cwd:path.resolve(__dirname,'..'), stdio:['ignore','pipe','ignore'] });
  t.after(()=>server.kill());
  const port = await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('Server did not start')),5000);
    server.stdout.on('data',chunk=>{const match=String(chunk).match(/port (\d+)/);if(match){clearTimeout(timer);resolve(match[1]);}});
    server.on('error',reject);
  });
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-accelerated-2d-canvas']});
  t.after(()=>browser.close());
  const page=await browser.newPage({viewport:{width:1440,height:1100},hasTouch:true});
  const failures=[];
  page.on('pageerror',e=>failures.push(String(e)));
  page.on('requestfailed',r=>failures.push(r.url()));
  page.on('response',r=>{if(r.status()>=400)failures.push(r.url());});
  const url=`http://127.0.0.1:${port}/units/4/parts/4.2/`;
  await page.clock.install({time:new Date('2026-10-27T00:00:00Z')});
  await page.goto(url+'#s3',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('#chrom-lab').dataset.ready==='true');
  await page.clock.pauseAt(new Date('2026-10-27T00:01:00Z'));
  const lab=page.locator('#chrom-lab'), paper=page.locator('#chrom-paper'), drop=page.locator('#chrom-drop');
  const choose=sample=>page.locator(`.ink-choice[data-ink="${sample}"]`).click();
  const data=()=>lab.evaluate(e=>({...e.dataset,progress:Number(e.dataset.progress),front:Number(e.dataset.front),baseline:Number(e.dataset.baseline),bottom:Number(e.dataset.bottom),liquid:Number(e.dataset.liquid),bands:JSON.parse(e.dataset.bandYs)}));
  const advance=async ms=>{await page.clock.runFor(20);await page.clock.fastForward(ms);};
  const fresh=()=>page.locator('#chrom-reset').click();
  const bounds=async()=>{await lab.scrollIntoViewIfNeeded();return lab.boundingBox();};
  const dragTo=async(top,x=.682)=>{
    const r=await bounds();
    const p=await paper.boundingBox();
    const start={x:p.x+p.width*.5,y:r.y+r.height*(.33+.10)};
    await page.mouse.move(start.x,start.y);await page.mouse.down();
    await page.mouse.move(r.x+r.width*x,r.y+r.height*(top+.10),{steps:12});
    await page.mouse.up();
  };
  await t.test('qualitative model preserves solvent/spot/band relationships for both samples',async()=>{
    const results=await page.evaluate(async()=>{
      const m=await import('./assets/chromatography-state.js?v=sixteen-1');
      const states=[];
      for(const ink of ['green','dark'])for(const top of [.24,.258,.27])for(let tick=0;tick<=160;tick++)states.push(m.chromatographyState(tick/10,top,ink));
      return {duration:m.DURATION,contactTime:m.CONTACT_TIME,states,dry:m.placement(.15),valid:m.placement(.258),spill:m.placement(.34),initial:m.chromatographyState(0)};
    });
    assert.equal(results.duration,16);assert.ok(Math.abs(results.contactTime-8/3)<1e-10);
    assert.equal(results.dry.kind,'dry');assert.equal(results.valid.kind,'valid');assert.equal(results.spill.kind,'spilled');
    assert.equal(results.initial.separation,0,'no separation before solvent reaches the ink');
    for(const s of results.states) {
      assert.ok(s.front<=s.bottom);
      for(const b of s.bands){assert.ok(b.y>=s.front);assert.ok(b.y<=s.baseline);}
    }
  });
  await t.test('starts with a loose paper, two ink buttons, shared avatars and no help panel or old controls',async()=>{
    assert.equal((await data()).mode,'ready');
    await advance(13000);assert.equal((await data()).progress,0);
    assert.equal(await page.locator('#strip-start,#strip-pause,#strip-reset,.strip-scene').count(),0);
    assert.equal(await page.locator('#s3 .ink-choice').count(),2);
    assert.equal(await page.locator('#s3 .evap-step,#s3 .evap-observation,#s3 .control-row,#s3 .scene-label').count(),0);
    for(const character of ['.dialogue--xiaokui','.dialogue:not(.dialogue--xiaokui)']) {
      assert.match(await page.locator('#s3 '+character+' .speaker').evaluate(e=>getComputedStyle(e,'::before').backgroundImage),/shared-assets\/characters\/dialogue-character-avatars\.png/);
    }
  });
  await t.test('sample button starts a real continuous separation and holds its final result',async()=>{
    await choose('green');assert.equal((await data()).mode,'running');
    const first=await lab.screenshot();await advance(2500);const early=await data();const second=await lab.screenshot();
    assert.notDeepEqual(first,second);assert.ok(early.progress>0);assert.ok(early.front>early.baseline);assert.equal(early.bands.length,0,'solvent has not reached ink yet');
    await advance(8000);const middle=await data();assert.ok(middle.front<early.front);
    assert.equal(middle.contact,'true');assert.equal(middle.bands.length,2);
    assert.ok(middle.bands.every(y=>y<middle.baseline));
    await advance(15000);const end=await data();assert.equal(end.mode,'complete');assert.equal(end.progress,1);
    assert.equal(end.bands.length,2);assert.ok(end.baseline<end.liquid);assert.ok(end.bottom>end.liquid);
    for(const y of end.bands){assert.ok(y>end.front);assert.ok(y<end.baseline);}
    await advance(1000);assert.deepEqual(await data(),end);
  });
  await t.test('front contact, mixed plume, and resolving bands remain visible for distinct observation intervals',async()=>{
    await choose('green');
    await advance(2000);let s=await data();
    assert.equal(s.contact,'false');assert.equal(s.phase,'approaching');assert.equal(s.bands.length,0);
    assert.equal(Number(s.originOpacity),1);
    await lab.screenshot({path:'/tmp/chrom-16-02-approach.png'});
    await advance(1333);s=await data();
    assert.equal(s.contact,'true');assert.equal(s.phase,'wicking');assert.ok(Number(s.spread)>0);
    assert.equal(Number(s.separation),0);assert.ok(Number(s.originOpacity)>.9);
    await lab.screenshot({path:'/tmp/chrom-16-033-contact.png'});
    await advance(1667);s=await data();assert.equal(s.phase,'wicking');assert.ok(Number(s.spread)>.7);
    assert.equal(Number(s.separation),0);
    const plume=await lab.screenshot({path:'/tmp/chrom-16-05-plume.png'});
    await advance(4333);s=await data();assert.equal(s.phase,'separating');
    assert.ok(Number(s.separation)>.4 && Number(s.separation)<1);
    const resolving=await lab.screenshot({path:'/tmp/chrom-16-093-separate.png'});
    assert.notDeepEqual(plume,resolving);
    await advance(6300);assert.equal((await data()).mode,'running','must not stop before 16 seconds');
    await advance(400);s=await data();assert.equal(s.mode,'complete');assert.equal(Number(s.originOpacity),.14);
    await lab.screenshot({path:'/tmp/chrom-16-16-result.png'});
    const color=await page.locator('#chrom-canvas').evaluate(canvas=>{
      const c=canvas.getContext('2d'),base=.6408*1024,x=.682*1536;
      const chroma=(cx,cy)=>{const d=c.getImageData(Math.round(cx)-3,Math.round(cy)-2,7,5).data;let n=0;for(let i=0;i<d.length;i+=4)n+=d[i+1]-d[i];return n/(d.length/4);};
      return {origin:chroma(x,base+2)-chroma(x+44,base+2),tail:chroma(x,base-35)-chroma(x+44,base-35)};
    });
    assert.ok(color.origin>3,'rendered origin must retain green pigment, not merely a gray baseline');
    assert.ok(color.tail>1,'rendered migration path must retain a faint colored trace');
    await fresh();assert.equal((await data()).progress,0);assert.equal((await data()).originOpacity,'1.00000');
  });
  await t.test('switching/repeating ink samples cancels the previous run',async()=>{
    await choose('green');await advance(5000);await choose('dark');
    assert.equal((await data()).progress,0);assert.equal((await data()).ink,'dark');await advance(3500);assert.equal((await data()).bands.length,3);
    assert.equal(await page.locator('.ink-choice[data-ink="dark"]').getAttribute('aria-pressed'),'true');
    await advance(1000);assert.ok((await data()).progress<.30);
    await choose('dark');assert.equal((await data()).progress,0);
    await advance(16500);assert.equal((await data()).mode,'complete');
    await lab.screenshot({path:'/tmp/unit42-chrom-dark-result.png'});
  });
  await t.test('click then click, keyboard, and touch all support manual placement',async()=>{
    await fresh();await paper.click();assert.equal((await data()).mode,'selected');
    await drop.focus();await page.keyboard.press('Enter');assert.equal((await data()).mode,'running');
    assert.equal((await data()).ink,'dark');
    await fresh();await paper.focus();await page.keyboard.press('Enter');assert.equal((await data()).mode,'selected');
    await page.keyboard.press('Escape');assert.equal((await data()).mode,'ready');
    await paper.tap();assert.equal((await data()).mode,'selected');
    const r=await bounds();await page.touchscreen.tap(r.x+r.width*.79,r.y+r.height*.5);
    assert.equal((await data()).mode,'running');
  });
  await t.test('dragging to a valid position mounts the paper and begins chromatography',async()=>{
    await fresh();await dragTo(.258);
    assert.equal((await data()).mode,'running');assert.ok((await data()).baseline<(await data()).liquid);
    await advance(3000);assert.ok((await data()).progress>.10);
  });
  await t.test('too high stays dry, too low diffuses into the bath without separated bands',async()=>{
    await fresh();await dragTo(.16);assert.equal((await data()).mode,'dry');const dry=await data();
    await advance(5000);assert.equal((await data()).progress,0);assert.ok(dry.bottom<dry.liquid);
    await fresh();await dragTo(.35);assert.equal((await data()).mode,'spilled');
    await advance(5000);const spill=await data();assert.equal(spill.bands.length,0);assert.ok(spill.baseline>spill.liquid);
    await lab.screenshot({path:'/tmp/unit42-chrom-spilled.png'});
  });
  await t.test('drop outside the cup and pointer cancellation safely return to the tray',async()=>{
    await fresh();await dragTo(.22,.46);assert.equal((await data()).mode,'ready');
    const r=await bounds(),p=await paper.boundingBox();await page.mouse.move(p.x+p.width/2,p.y+p.height/3);await page.mouse.down();
    await page.mouse.move(r.x+r.width*.65,r.y+r.height*.5,{steps:4});
    await paper.dispatchEvent('pointercancel',{pointerId:1});await page.mouse.up();
    assert.equal((await data()).mode,'ready');
    await paper.click();assert.equal((await data()).mode,'selected');
    await choose('green');assert.equal((await data()).mode,'running');
  });
  await t.test('pause/resume freezes and continues progress; clip and reset take fresh paper',async()=>{
    await choose('green');await advance(3500);await paper.click();assert.equal((await data()).mode,'paused');
    const paused=await data();await advance(3000);assert.deepEqual(await data(),paused);
    await paper.click();await advance(1500);assert.ok((await data()).progress>paused.progress);
    await page.locator('#chrom-clip').click();assert.equal((await data()).mode,'ready');assert.equal((await data()).progress,0);
    await choose('green');await advance(2000);await fresh();await advance(13000);assert.equal((await data()).mode,'ready');
  });
  await t.test('approved content column contains every child on desktop, tablet and phone',async()=>{
    for(const width of [1440,850,768,390]) {
      await page.setViewportSize({width,height:1100});await fresh();
      const layout=await page.locator('#s3').evaluate(card=>{
        const main=card.querySelector('.card-main').getBoundingClientRect(), side=card.querySelector('.card-side').getBoundingClientRect();
        return {overflow:document.documentElement.scrollWidth>innerWidth,main:{left:main.left,right:main.right},sideRight:side.right,children:[...card.querySelector('.card-main').children].filter(e=>!e.classList.contains('chrom-status')).map(e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right};})};
      });
      assert.equal(layout.overflow,false,`no horizontal overflow at ${width}`);
      if(width>680)assert.ok(layout.main.left>layout.sideRight);
      layout.children.forEach(r=>{assert.ok(r.left>=layout.main.left-.5);assert.ok(r.right<=layout.main.right+.5);});
      assert.equal(await page.locator('#chrom-status').evaluate(e=>e.getBoundingClientRect().width),1);
      if(width===390)await page.locator('#s3').screenshot({path:'/tmp/unit42-chrom-phone.png'});
    }
    await page.setViewportSize({width:1440,height:1100});await page.locator('#s3').screenshot({path:'/tmp/unit42-chrom-desktop.png'});
    assert.deepEqual(failures,[]);
  });
  await t.test('failed scene loading provides an error and leaves unrelated sections usable',async()=>{
    const failed=await browser.newPage();
    try {
      await failed.route('**/chromatography-workbench.webp',r=>r.abort());await failed.goto(url,{waitUntil:'domcontentloaded'});
      await failed.waitForFunction(()=>document.querySelector('#chrom-lab').dataset.ready==='error');
      assert.match(await failed.locator('#chrom-status').innerText(),/無法載入/);
      assert.equal(await failed.locator('#chrom-paper').isDisabled(),true);
      await failed.waitForFunction(()=>document.querySelector('#evap-stage').dataset.ready==='true');assert.equal(await failed.locator('#evap-visual').isEnabled(),true);await failed.locator('[data-evap-step="2"]').click();await failed.waitForFunction(()=>document.querySelector('#evap-stage').dataset.step==='2');
    }finally{await failed.close();}
  });
});
