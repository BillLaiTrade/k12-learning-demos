const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');
const {chromium}=require('playwright');

test('5.2 first block: three environments and in-water thermometers',{timeout:180000},async t=>{
  const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:['ignore','pipe','pipe']});
  t.after(()=>server.kill());
  const port=await new Promise((resolve,reject)=>{let out='';const timer=setTimeout(()=>reject(Error('server timeout')),5000);server.stdout.on('data',d=>{out+=d;const m=out.match(/port (\d+)/);if(m){clearTimeout(timer);resolve(m[1]);}});server.once('error',reject);});
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});t.after(()=>browser.close());
  const page=await browser.newPage({viewport:{width:1440,height:1300}});const errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  const url=process.env.DIRECTION_LAB_URL||`http://127.0.0.1:${port}/units/5/parts/5.2/index.html`;
  await page.goto(url);await page.locator('#direction-lab').scrollIntoViewIfNeeded();await page.clock.install();
  const root=page.locator('#direction-lab'),play=page.locator('#direction-play');
  const select=async n=>{await page.locator(`#direction-lab button[data-environment="${n}"]`).click();await page.locator('.direction-scene-image').evaluateAll(nodes=>Promise.all(nodes.map(n=>n.decode())));};
  const state=()=>root.evaluate(n=>({...n.dataset}));
  const pause=async()=>{if(await root.getAttribute('data-playing')==='true')await play.click();};
  const values=async()=>({a:Number((await page.locator('#direction-hot').textContent()).replace('°C','')),b:Number((await page.locator('#direction-cold').textContent()).replace('°C',''))});
  async function capture(name){if(!process.env.DIRECTION_CAPTURE_DIR)return;const fs=require('node:fs/promises');await fs.mkdir(process.env.DIRECTION_CAPTURE_DIR,{recursive:true});await page.locator('#card-01').evaluate(n=>n.scrollIntoView({block:'start',behavior:'instant'}));await page.waitForTimeout(150);await page.screenshot({path:path.join(process.env.DIRECTION_CAPTURE_DIR,name+'.png')});}

  await t.test('starts with three clean scenes, pending observations and authentic portraits',async()=>{
    assert.equal(await page.locator('#direction-lab button[data-environment]').count(),3);
    assert.deepEqual(await page.locator('#direction-lab button[data-environment]').evaluateAll(ns=>ns.map(n=>Number(n.dataset.environment))),[5,25,70]);
    assert.deepEqual(await values(),{a:60,b:10});assert.equal((await state()).phase,'ready');
    assert.equal(await page.locator('#direction-flow-hot').isVisible(),false);assert.equal(await page.locator('#direction-flow-cold').isVisible(),false);
    assert.equal(await page.locator('#direction-hot-flow').textContent(),'等待觀察');
    for(const name of ['fridge','room','hot']){const response=await page.request.get(new URL(`assets/direction-${name}-glass.webp`,url).href);assert.equal(response.status(),200);}
    assert.equal(await page.locator('#card-01 .speaker').count(),4);
    assert.match(await page.locator('#card-01 .speaker').first().evaluate(n=>getComputedStyle(n,'::before').backgroundImage),/dialogue-character-avatars\.png/);
    assert.equal(await page.locator('#direction-lab .direction-reading').count(),0);
    assert.equal(await page.locator('.direction-thermometer').count(),2);
    assert.equal(await page.locator('.direction-reflection-image').count(),4);
    assert.equal(await page.locator('.direction-instrument-body').count(),0);
    assert.deepEqual(await page.locator('.direction-thermometer').evaluateAll(ns=>ns.map(n=>n.dataset.artwork)),['integrated-glass','integrated-glass']);
    for(const key of ['hot','cold']){
      assert.equal(await page.locator(`#direction-thermometer-${key} .direction-degree`).count(),81);
      assert.deepEqual(await page.locator(`#direction-thermometer-${key} .direction-degree-number`).allTextContents(),['0','20','40','60','80']);
    }
  });
  await t.test('matching scales, immersed bulbs and synchronized liquid/readout levels',async()=>{
    for(const key of ['hot','cold']){
      const geometry=await page.locator(`#direction-thermometer-${key}`).evaluate(n=>({
        bulb:{y:Number(n.dataset.bulbY),r:Number(n.dataset.bulbRadius)},
        ticks:[...n.querySelectorAll('.direction-degree')].map(t=>({degree:Number(t.dataset.degree),y:Number(t.getAttribute('d').match(/^M3 ([\d.]+)/)[1])}))
      }));
      assert.ok(geometry.bulb.y-geometry.bulb.r>215,'bulb below water surface');
      assert.ok(geometry.bulb.y+geometry.bulb.r<350,'bulb above cup floor');
      for(const tick of geometry.ticks)assert.equal(tick.y,291-tick.degree*3.0625);
    }
    for(const environment of [5,25,70]){
      await select(environment);await play.click();await page.clock.runFor(700);await pause();const s=await state();
      const sceneSource=await page.locator('.direction-scene-image').first().getAttribute('src');
      assert.deepEqual(await page.locator('.direction-reflection-image').evaluateAll(ns=>ns.map(n=>n.getAttribute('href'))),Array(4).fill(sceneSource));
      for(const [key,raw]of [['hot',s.temperatureA],['cold',s.temperatureB]]){
        const y=291-Number(raw)*3.0625;
        assert.ok(Math.abs(Number((await page.locator(`#direction-liquid-${key}`).getAttribute('d')).match(/^M-2\.2 ([\d.]+)/)[1])-y)<1e-6);
        assert.equal(await page.locator(`#direction-live-reading-${key}`).getAttribute('transform'),`translate(0,${y})`);
        assert.equal(await page.locator(`#direction-${key}`).textContent(),`${Math.round(Number(raw))}°C`);
      }
    }
    await select(25);
  });
  await t.test('25°C: A releases heat and B absorbs heat; pause freezes readouts',async()=>{
    await select(25);await play.click();await page.clock.runFor(3200);await pause();
    const s=await state(),v=await values();assert.equal(s.flowA,'out');assert.equal(s.flowB,'in');assert.ok(v.a<60&&v.a>25);assert.ok(v.b>10&&v.b<25);
    assert.equal(await page.locator('#direction-flow-hot').getAttribute('data-travel-direction'),'left');assert.equal(await page.locator('#direction-flow-cold').getAttribute('data-travel-direction'),'left');
    assert.equal(await page.locator('#direction-hot-flow').textContent(),'放熱・降溫');assert.equal(await page.locator('#direction-cold-flow').textContent(),'吸熱・升溫');
    await page.clock.runFor(1200);assert.deepEqual(await values(),v);assert.equal((await state()).phase,'paused');
    await capture('room');
  });
  await t.test('5°C: both release heat and scene/captions change together',async()=>{
    await select(5);assert.deepEqual(await values(),{a:60,b:10});assert.equal((await state()).phase,'ready');
    assert.match(await page.locator('.direction-scene-image').first().getAttribute('src'),/direction-fridge/);
    await play.click();await page.clock.runFor(3200);await pause();const s=await state(),v=await values();
    assert.equal(s.flowA,'out');assert.equal(s.flowB,'out');assert.ok(v.a<60&&v.a>5);assert.ok(v.b<10&&v.b>5);
    assert.equal(await page.locator('#direction-flow-cold').getAttribute('data-travel-direction'),'right');
    assert.match(await page.locator('#direction-observation-dialogue').textContent(),/5°C 冷藏室/);await capture('fridge');
  });
  await t.test('70°C: even the initially hot cup absorbs heat; both arrows point inward',async()=>{
    await select(70);await play.click();await page.clock.runFor(3200);await pause();const s=await state(),v=await values();
    assert.equal(s.flowA,'in');assert.equal(s.flowB,'in');assert.ok(v.a>60&&v.a<70);assert.ok(v.b>10&&v.b<70);
    assert.equal(await page.locator('#direction-flow-hot').getAttribute('data-travel-direction'),'right');assert.equal(await page.locator('#direction-flow-cold').getAttribute('data-travel-direction'),'left');
    assert.match(await page.locator('.direction-scene-image').first().getAttribute('src'),/direction-hot/);
    assert.match(await page.locator('#direction-observation-dialogue').textContent(),/70°C 高溫箱/);await capture('hot');
  });
  await t.test('copper paths cross cup boundaries and pulses move, pause and resume with the model',async()=>{
    assert.equal(await page.locator('.direction-arrow-body').count(),0);assert.equal(await page.locator('.direction-flow-pulse').count(),6);
    const ends=await page.locator('.direction-energy-path').evaluateAll(ns=>ns.map(n=>{const a=n.getPointAtLength(0),b=n.getPointAtLength(n.getTotalLength());return{start:a.x,end:b.x};}));
    assert.ok(ends[0].start<288&&ends[0].end>288&&ends[0].end<540);assert.ok(ends[1].start>60&&ends[1].start<310&&ends[1].end>310);
    const positions=()=>page.locator('.direction-pulse-layer').evaluateAll(ns=>ns.map(n=>Number(n.firstElementChild.getAttribute('transform').match(/^translate\(([-\d.]+)/)[1])));
    for(const [environment,directions]of [[25,[-1,-1]],[5,[-1,1]],[70,[1,-1]]]){
      await select(environment);await play.click();await page.clock.runFor(100);const before=await positions();await page.clock.runFor(200);const after=await positions();
      directions.forEach((sign,index)=>assert.ok((after[index]-before[index])*sign>0,`${environment}°C pulse direction`));
      for(const [key,index]of [['hot',0],['cold',1]]){const flow=(await state())[index===0?'flowA':'flowB'];assert.equal(await page.locator(`#direction-title-${key}`).textContent(),flow==='out'?'放熱':'吸熱');}
      await pause();const stopped=await positions();await page.clock.runFor(500);assert.deepEqual(await positions(),stopped);
      await play.click();await page.clock.runFor(200);assert.notDeepEqual(await positions(),stopped);await pause();
    }
    await select(25);await play.click();await page.clock.runFor(14000);await pause();
    assert.ok(Number(await page.locator('#direction-pulses-hot').evaluate(n=>n.style.opacity))<1,'flow weakens near equal temperature');
  });
  await t.test('reset and switching environment during playback cancel old observations',async()=>{
    await select(70);await play.click();await page.clock.runFor(500);await page.locator('#direction-reset').click();assert.deepEqual(await values(),{a:60,b:10});assert.equal((await state()).environment,'70');
    await page.clock.runFor(800);assert.deepEqual(await values(),{a:60,b:10});assert.equal((await state()).phase,'ready');
    await play.click();await page.clock.runFor(500);await select(5);await page.clock.runFor(800);
    assert.deepEqual(await values(),{a:60,b:10});assert.equal((await state()).playing,'false');assert.equal((await state()).flowA,'pending');
    assert.equal(await page.locator('#direction-flow-hot').isVisible(),false);
  });
  await t.test('same displayed temperature removes heat flow and replay starts cleanly',async()=>{
    await select(25);await play.click();await page.clock.runFor(42000);assert.deepEqual(await values(),{a:25,b:25});
    const s=await state();assert.equal(s.phase,'complete');assert.equal(s.playing,'false');assert.equal(s.flowA,'none');assert.equal(s.flowB,'none');
    assert.equal(await page.locator('#direction-flow-hot').isVisible(),false);assert.equal(await page.locator('#direction-flow-cold').isVisible(),false);assert.equal(await play.textContent(),'重新觀察');
    await play.click();assert.equal((await state()).playing,'true');await page.clock.runFor(100);assert.ok((await values()).a>=59);await pause();
  });
  await t.test('keyboard and reduced motion preserve all basic controls',async()=>{
    await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#direction-lab button[data-environment="5"]').focus();await page.keyboard.press('Enter');assert.equal((await state()).environment,'5');
    await play.focus();await page.keyboard.press('Space');assert.equal((await state()).playing,'true');await page.clock.runFor(500);await page.keyboard.press('Enter');assert.equal((await state()).playing,'false');
    await page.locator('#direction-reset').focus();await page.keyboard.press('Enter');assert.deepEqual(await values(),{a:60,b:10});
    await play.click();const positions=await page.locator('.direction-flow-pulse').evaluateAll(ns=>ns.map(n=>n.getAttribute('transform')));await page.clock.runFor(700);
    assert.deepEqual(await page.locator('.direction-flow-pulse').evaluateAll(ns=>ns.map(n=>n.getAttribute('transform'))),positions);assert.notDeepEqual(await values(),{a:60,b:10});
    await page.locator('#direction-reset').click();await page.emulateMedia({reducedMotion:'no-preference'});
  });
  await t.test('in-scene instruments and controls fit desktop, tablet and phone widths',async()=>{
    await select(25);await play.click();await page.clock.runFor(1800);await pause();
    for(const width of [1440,1280,1024,768,600,390,320]){
      await page.setViewportSize({width,height:1300});await root.scrollIntoViewIfNeeded();
      const result=await root.evaluate(n=>({
        overflow:document.documentElement.scrollWidth>innerWidth,
        height:n.closest('.lesson-card').getBoundingClientRect().height,
        pairs:[...n.querySelectorAll('.direction-cup-view')].map(card=>{
          const p=card.querySelector('.direction-photo').getBoundingClientRect();
          const items=[...card.querySelectorAll('.direction-thermometer,.direction-live-reading,.direction-flow-group')].map(el=>{
            const b=el.getBoundingClientRect();return{left:b.left-p.left,top:b.top-p.top,right:b.right-p.right,bottom:b.bottom-p.bottom};
          });return{items};
        }),
        buttons:[...n.querySelectorAll('button')].map(b=>b.getBoundingClientRect().height)
      }));
      assert.equal(result.overflow,false,`${width}px horizontal overflow`);
      for(const pair of result.pairs)for(const b of pair.items){assert.ok(b.left>=-1&&b.top>=-1&&b.right<=1&&b.bottom<=1,`${width}px instrument clipped`);}
      assert.ok(result.buttons.every(height=>height>=44),`${width}px touch targets`);
      if(width===1440||width===1280)assert.ok(result.height<1200,'compact card remains below 1200px');
      if(width===390||width===1440)await capture(`width-${width}`);
    }
    await page.setViewportSize({width:1440,height:1300});
  });
  await t.test('real mobile taps change scene, play, pause and restart',async()=>{
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});t.after(()=>context.close());const mobile=await context.newPage();await mobile.goto(url);
    await mobile.locator('#direction-lab button[data-environment="70"]').tap();await mobile.locator('.direction-scene-image').evaluateAll(ns=>Promise.all(ns.map(n=>n.decode())));
    assert.equal(await mobile.locator('#direction-lab').getAttribute('data-environment'),'70');await mobile.locator('#direction-play').tap();
    await mobile.waitForFunction(()=>Number(document.querySelector('#direction-lab').dataset.temperatureA)>60);
    await mobile.locator('#direction-play').tap();assert.equal(await mobile.locator('#direction-lab').getAttribute('data-playing'),'false');
    await mobile.locator('#direction-reset').tap();assert.equal(await mobile.locator('#direction-hot').textContent(),'60°C');assert.equal(await mobile.locator('#direction-cold').textContent(),'10°C');
  });
  await t.test('remaining learning blocks and quiz still operate independently',async()=>{
    await page.locator('#balance-play').click();await page.clock.runFor(800);const a=Number((await page.locator('#balance-temp-a').textContent()).replace('°C',''));await select(70);await page.clock.runFor(800);const b=Number((await page.locator('#balance-temp-a').textContent()).replace('°C',''));assert.ok(b<a);await page.locator('#balance-play').click();
    await page.locator('#radiation-shield-toggle').click();assert.equal(await page.locator('#radiation-shield-toggle').getAttribute('aria-pressed'),'true');
    await page.locator('input[value="outside"]').check();for(const [name,value]of [['metal','conduction'],['air','convection'],['sun','radiation']])await page.locator(`select[name="${name}"]`).selectOption(value);
    await page.locator('#heat-quiz button[type="submit"]').click();assert.match(await page.locator('#heat-quiz-result').textContent(),/判斷都合理/);
    assert.deepEqual(errors,[]);
  });
});
