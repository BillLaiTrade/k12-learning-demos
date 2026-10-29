const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');
const fs=require('node:fs/promises');
const {chromium}=require('playwright');

test('5.2 second block: direct contact and thermal equilibrium',{timeout:150000},async t=>{
  const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..')});
  t.after(()=>server.kill());
  const port=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server timeout')),5000);server.stdout.on('data',d=>{const m=String(d).match(/port (\d+)/);if(m){clearTimeout(timer);resolve(m[1]);}});server.on('error',reject);});
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});
  t.after(()=>browser.close());
  const context=await browser.newContext({viewport:{width:1440,height:1300},deviceScaleFactor:1.5});
  const page=await context.newPage();
  const url=process.env.BALANCE_LAB_URL||`http://127.0.0.1:${port}/units/5/parts/5.2/index.html`;
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  await page.clock.install({time:new Date(0)});
  await page.clock.pauseAt(new Date(1000));
  await page.goto(url);await page.locator('#balance-lab').scrollIntoViewIfNeeded();
  const root=page.locator('#balance-lab'),play=page.locator('#balance-play');
  const state=()=>root.evaluate(n=>({...n.dataset}));
  const readings=()=>page.evaluate(()=>({a:Number(document.getElementById('balance-temp-a').textContent.replace('°C','')),b:Number(document.getElementById('balance-temp-b').textContent.replace('°C',''))}));
  const pulsePositions=()=>page.locator('.balance-pulse').evaluateAll(ns=>ns.map(n=>n.getAttribute('transform')));
  const mode=async value=>page.locator(`[data-balance="${value}"]`).click();
  async function capture(name){
    if(!process.env.BALANCE_CAPTURE_DIR)return;
    await fs.mkdir(process.env.BALANCE_CAPTURE_DIR,{recursive:true});
    await page.locator('#card-02').evaluate(n=>n.scrollIntoView({block:'start',behavior:'instant'}));
    await page.locator('#card-02').screenshot({path:path.join(process.env.BALANCE_CAPTURE_DIR,name+'.png')});
  }

  await t.test('approved format, actual portraits, contact sensors and separated initial blocks',async()=>{
    assert.match(await page.locator('#title-02').textContent(),/一熱一冷靠在一起/);
    assert.equal(await page.locator('#card-02 .speaker').count(),4);
    assert.match(await page.locator('#card-02 .speaker').first().evaluate(n=>getComputedStyle(n,'::before').backgroundImage),/dialogue-character-avatars/);
    const speech=await page.locator('#card-02 .dialogue p').allTextContents();
    assert.ok(speech.every(s=>!s.startsWith('「')&&!s.endsWith('」')));
    assert.deepEqual(await readings(),{a:60,b:20});
    assert.equal((await state()).phase,'ready');assert.equal((await state()).touching,'false');
    assert.equal(await page.locator('#balance-block-a').getAttribute('transform'),'translate(-28,0)');
    assert.equal(await page.locator('#balance-block-b').getAttribute('transform'),'translate(28,0)');
    assert.equal(await page.locator('#balance-flow').isVisible(),false);
    assert.equal(await play.textContent(),'讓它們接觸');
    assert.equal(await root.locator('svg path[stroke="#8c5126"]').count(),0,'no dark connecting rod');
    assert.equal(await root.locator('svg path[d="M354 295H559"]').count(),0);
    assert.equal(await root.locator('svg .balance-pulse').count(),10);
    await capture('ready');
  });
  await t.test('joining can pause and resume; heat starts only after contact',async()=>{
    await play.click();await page.clock.runFor(250);
    assert.equal((await state()).phase,'contacting');assert.deepEqual(await readings(),{a:60,b:20});
    assert.ok(Number((await state()).gap)>0&&Number((await state()).gap)<28);
    assert.equal(await page.locator('#balance-flow').isVisible(),false);
    await play.click();const paused=await state();
    await page.clock.runFor(700);assert.equal((await state()).gap,paused.gap);
    assert.equal((await state()).phase,'paused');
    await play.click();await page.clock.runFor(600);
    assert.equal((await state()).touching,'true');assert.equal((await state()).gap,'0');
    const s=await readings();assert.ok(s.a<60&&s.a>40);assert.ok(s.b>20&&s.b<40);
    assert.equal(await page.locator('#balance-flow').isVisible(),true);
  });
  await t.test('matching readings, converging temperatures and moving short traces',async()=>{
    await page.locator('#balance-reset').click();await play.click();await page.clock.runFor(4550);
    const before=await readings();assert.equal(before.a,48);assert.equal(before.b,32);
    assert.equal(before.a+before.b,80);
    for(const [id,key]of [['a','a'],['b','b']])assert.equal(await page.locator('#balance-digits-'+id).getAttribute('data-value'),before[key].toFixed(1));
    assert.match(await page.locator('#balance-note').textContent(),/直接接觸/);
    assert.equal(await page.locator('#balance-status-label').textContent(),'傳熱中');
    await capture('moving');
    const pulses=await pulsePositions();await page.clock.runFor(350);assert.notDeepEqual(await pulsePositions(),pulses);
    const after=await readings();assert.ok(after.a<before.a&&after.b>before.b);assert.equal(after.a+after.b,80);
    await play.click();const stopped=await readings(),positions=await pulsePositions();
    await page.clock.runFor(900);assert.deepEqual(await readings(),stopped);assert.deepEqual(await pulsePositions(),positions);
    assert.equal((await state()).phase,'paused');
    await play.click();await page.clock.runFor(300);assert.notDeepEqual(await pulsePositions(),positions);
  });
  await t.test('same readings end flow, then replay and reset are clean',async()=>{
    await page.clock.runFor(30000);
    assert.deepEqual(await readings(),{a:40,b:40});
    assert.equal((await state()).phase,'complete');assert.equal((await state()).playing,'false');
    assert.equal(await page.locator('#balance-flow').isVisible(),false);
    assert.match(await page.locator('#balance-note').textContent(),/沒有淨熱傳遞/);
    assert.deepEqual(await root.locator('[data-temperature-tint]').evaluateAll(ns=>ns.map(n=>n.getAttribute('fill'))),['#d1d9d7','#d1d9d7']);
    assert.equal(await play.textContent(),'重新觀察');await capture('balanced');
    await play.click();assert.deepEqual(await readings(),{a:60,b:20});
    assert.equal((await state()).phase,'contacting');
    await page.locator('#balance-reset').click();await page.clock.runFor(1000);
    assert.equal((await state()).phase,'ready');assert.deepEqual(await readings(),{a:60,b:20});
  });
  await t.test('initially equal temperatures stay equal, without heat flow or warming claims',async()=>{
    await mode('same');assert.deepEqual(await readings(),{a:40,b:40});
    assert.equal((await state()).phase,'ready');assert.equal((await state()).touching,'false');
    await play.click();await page.clock.runFor(1000);
    assert.equal((await state()).phase,'complete');assert.deepEqual(await readings(),{a:40,b:40});
    assert.equal(await page.locator('#balance-flow').isVisible(),false);
    assert.match(await page.locator('#balance-observation-dialogue').textContent(),/接觸後讀數也沒有改變/);
    await capture('same');
    await page.locator('#balance-reset').click();assert.deepEqual(await readings(),{a:40,b:40});
  });
  await t.test('switching modes during approach and heat exchange cancels previous state',async()=>{
    await mode('different');await play.click();await page.clock.runFor(300);await mode('same');
    await page.clock.runFor(1000);assert.equal((await state()).phase,'ready');assert.deepEqual(await readings(),{a:40,b:40});
    await mode('different');await play.click();await page.clock.runFor(2000);await mode('same');
    await page.clock.runFor(1000);assert.equal((await state()).phase,'ready');assert.deepEqual(await readings(),{a:40,b:40});
    await mode('different');assert.deepEqual(await readings(),{a:60,b:20});
  });
  await t.test('keyboard and reduced motion retain essential movement',async()=>{
    await page.emulateMedia({reducedMotion:'reduce'});
    await play.focus();await page.keyboard.press('Space');await page.clock.runFor(1100);
    assert.equal((await state()).touching,'true');
    const values=await readings(),pulses=await pulsePositions();await page.clock.runFor(500);
    assert.notDeepEqual(await readings(),values);assert.notDeepEqual(await pulsePositions(),pulses);
    await page.keyboard.press('Enter');assert.equal((await state()).phase,'paused');
    await page.locator('[data-balance="same"]').focus();await page.keyboard.press('Enter');assert.equal((await state()).mode,'same');
    await page.emulateMedia({reducedMotion:'no-preference'});await mode('different');
  });
  await t.test('backgrounding pauses without resetting readings and resumes explicitly',async()=>{
    await play.click();await page.clock.runFor(1500);
    const before=await readings();
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
    assert.equal((await state()).phase,'paused');await page.clock.runFor(1000);assert.deepEqual(await readings(),before);
    await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
    await play.click();await page.clock.runFor(500);assert.ok((await readings()).a<before.a);
    await page.locator('#balance-reset').click();
  });
  await t.test('desktop matches the approved card proportions; smaller widths do not overflow',async()=>{
    for(const width of [1440,1280,1024,768,390,320]){
      await page.setViewportSize({width,height:1300});
      const m=await root.evaluate(n=>({width:n.getBoundingClientRect().width,card:n.closest('.lesson-card').getBoundingClientRect().width,height:n.closest('.lesson-card').getBoundingClientRect().height,overflow:document.documentElement.scrollWidth>innerWidth,buttons:[...n.querySelectorAll('button')].map(b=>b.getBoundingClientRect().height)}));
      assert.equal(m.overflow,false,`${width}px overflow`);assert.ok(m.buttons.every(h=>h>=40));
      if(width===1440){assert.equal(m.width,780);assert.equal(m.card,1054);assert.ok(m.height<1150);}
      if(width===1280)await capture('laptop');
    }
    await page.setViewportSize({width:1440,height:1300});
  });
  await t.test('first block and later activities remain independent',async()=>{
    await mode('different');await page.locator('#balance-reset').click();
    await page.locator('#direction-play').click();await page.clock.runFor(1500);
    assert.equal((await state()).phase,'ready');assert.deepEqual(await readings(),{a:60,b:20});
    await play.click();await page.clock.runFor(1500);
    await page.locator('#direction-reset').click();const a=(await readings()).a;
    await page.clock.runFor(600);assert.ok((await readings()).a<a);
    await page.locator('#balance-reset').click();
    await page.locator('#conduction-play').click();await page.clock.runFor(500);assert.equal(await page.locator('#conduction-play').getAttribute('aria-pressed'),'true');await page.locator('#conduction-reset').click();
    await page.locator('#radiation-shield-toggle').click();assert.equal(await page.locator('#radiation-shield-toggle').getAttribute('aria-pressed'),'true');
    assert.deepEqual(errors,[]);
  });
  await t.test('ordinary and reduced preferences produce real movement and pause freezes pixels',async()=>{
    for(const reducedMotion of ['no-preference','reduce']){
      const ctx=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion});
      try{
        const p=await ctx.newPage();await p.goto(url);await p.locator('#balance-lab').scrollIntoViewIfNeeded();
        await p.locator('#balance-play').click();await p.waitForTimeout(1100);
        const box=await p.locator('#balance-apparatus').boundingBox();
        const clip={x:box.x+392/1000*box.width,y:box.y+280/440*box.height,width:132/1000*box.width,height:48/440*box.height};
        const before=await p.screenshot({clip});await p.waitForTimeout(350);const after=await p.screenshot({clip});
        assert.equal(before.equals(after),false,reducedMotion+' flow should move');
        await p.locator('#balance-play').click();const frozen=await p.locator('#balance-apparatus').screenshot();await p.waitForTimeout(350);
        assert.equal(frozen.equals(await p.locator('#balance-apparatus').screenshot()),true,reducedMotion+' paused image');
      }finally{await ctx.close();}
    }
  });
});
