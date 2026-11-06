const {test}=require('node:test'),assert=require('node:assert/strict'),{spawn}=require('node:child_process'),path=require('node:path'),fs=require('node:fs/promises'),{pathToFileURL}=require('node:url'),{chromium}=require('playwright');

test('5.3第二區：自由熱量、連續亮點、沿途記錄與常態公式',{timeout:240000},async t=>{
  const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:['ignore','pipe','pipe']});t.after(()=>server.kill());
  const port=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server timeout')),5000);server.stdout.on('data',d=>{const m=String(d).match(/port (\d+)/);if(m){clearTimeout(timer);resolve(m[1]);}});server.on('error',reject);});
  const remote=process.env.UNIT53_URL,url=remote||`http://127.0.0.1:${port}/units/5/parts/5.3/`;
  const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox'],...(remote?{proxy:{server:process.env.HTTPS_PROXY||process.env.HTTP_PROXY}}:{})});t.after(()=>browser.close());
  const {secondsForWaterHeat,STAGE_ANIMATION_SPEED}=await import(pathToFileURL(path.resolve(__dirname,'../units/5/parts/5.3/assets/heat-stage-model.mjs')));
  const p=await browser.newPage({viewport:{width:1366,height:900}}),errors=[],layouts=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(url,{waitUntil:'networkidle'});await p.clock.install();await p.clock.pauseAt(new Date(Date.now()+1000));
  const root=p.locator('#heat-lab'),play=p.locator('#heat-stage-play'),input=p.locator('#heat-stage-target');
  const state=()=>root.evaluate(n=>({...n.dataset}));
  const actualPoints=()=>p.locator('#heat-stage-points circle:not(.is-example)').evaluateAll(ns=>ns.map(n=>Number(n.dataset.heat)));
  const finish=async q=>{await p.clock.runFor(Math.ceil(secondsForWaterHeat(q)/STAGE_ANIMATION_SPEED*1000)+250);assert.equal(await root.getAttribute('data-phase'),'complete');};

  await t.test('未操作能閱讀示例與下方公式，器材及本次讀值仍為初始狀態',async()=>{
    assert.equal(await input.inputValue(),'1000');assert.equal(await root.getAttribute('data-phase'),'ready');
    assert.equal(await p.locator('#heat-stage-meter').textContent(),'20.0');assert.equal(await root.getAttribute('data-records'),'0');
    assert.equal(await p.locator('#heat-stage-graph').getAttribute('data-mode'),'example');assert.match(await p.locator('#heat-stage-mode').textContent(),/非本次觀察/);
    assert.equal(await p.locator('#heat-stage-points circle.is-example').count(),10);assert.equal(await p.locator('#heat-stage-live').isHidden(),true);
    assert.equal(await p.locator('#heat-stage-conclusion').isVisible(),true);assert.match(await p.locator('#heat-stage-conclusion').textContent(),/ΔT.*∝.*Q/);
    assert.equal(await p.locator('[data-heat-stage]').count(),0);assert.equal(await root.locator('input[type=range]').count(),0);assert.equal(await root.getByRole('button',{name:'暫停',exact:true}).count(),0);
    const order=await p.evaluate(()=>document.querySelector('#heat-lab').compareDocumentPosition(document.querySelector('#heat-stage-conclusion')));assert.ok(order&4);
    await p.clock.runFor(10000);assert.equal(await root.getAttribute('data-water-calories'),'0');
  });

  await t.test('一次加熱連續畫到當下，亮點非跳格，LCD／讀值／座標同源，十點後到目標停熱',async()=>{
    await p.locator('#heat-stage-heater').press('Enter');await p.clock.runFor(200);
    const a=await state(),x1=Number(await p.locator('#heat-stage-live').getAttribute('cx'));assert.ok(Number(a.waterCalories)>0&&Number(a.waterCalories)<100);assert.deepEqual(await actualPoints(),[]);
    await p.clock.runFor(120);const b=await state(),x2=Number(await p.locator('#heat-stage-live').getAttribute('cx'));assert.ok(x2>x1);assert.ok(Number(b.waterCalories)<100);assert.deepEqual(await actualPoints(),[]);
    assert.equal(await input.isDisabled(),true);assert.equal(await play.isDisabled(),true);assert.equal(await input.inputValue(),'1000');
    await p.clock.runFor(2200);const current=await state(),q=Number(current.waterCalories),rise=Number(current.rise);
    assert.ok(q>500&&q<1000);assert.ok(Math.abs(q-100*rise)<1e-8);assert.equal(await p.locator('#heat-stage-meter').textContent(),Number(current.temperature).toFixed(1));
    assert.equal(await p.locator('#heat-stage-rise').textContent(),rise.toFixed(1));assert.equal(await p.locator('#heat-stage-live').getAttribute('data-heat'),current.waterCalories);
    const position=await p.locator('#heat-stage-graph').evaluate(n=>({width:n.viewBox.baseVal.width,height:n.viewBox.baseVal.height,max:Number(n.dataset.maximum),cx:Number(n.querySelector('#heat-stage-live').getAttribute('cx')),cy:Number(n.querySelector('#heat-stage-live').getAttribute('cy')),path:n.querySelector('#heat-stage-line').getAttribute('d')}));
    assert.ok(Math.abs(position.cx-(42+q/position.max*(position.width-60)))<1e-6);assert.ok(Math.abs(position.cy-(position.height-46-rise/(position.max/100)*(position.height-81)))<1e-6);
    assert.match(position.path,new RegExp('L'+String(position.cx).replaceAll('.','\\.')));assert.ok((await actualPoints()).every(point=>point<=q+1e-7));
    assert.equal(await p.locator('#heat-stage-points circle.is-example').count(),0);assert.equal(await p.locator('#heat-stage-conclusion').isVisible(),true);
    await finish(1000);const points=await actualPoints();assert.equal(points.length,10);points.forEach((point,i)=>assert.ok(Math.abs(point-(i+1)*100)<1e-7));
    assert.equal(await p.locator('#heat-stage-meter').textContent(),'30.0');assert.equal(await p.locator('#heat-stage-energy').textContent(),'1,000');assert.equal(await p.locator('#heat-stage-rise').textContent(),'10.0');
    const end=await state();await p.clock.runFor(5000);assert.deepEqual(await state(),end);
  });

  await t.test('任意750／1500／750.5及邊界熱量從20°C重做，小數終點與座標尺度正確',async()=>{
    for(const q of [750,1500,750.5,100,3000]){
      await input.fill(String(q));assert.equal(await root.getAttribute('data-phase'),'ready');assert.equal(await p.locator('#heat-stage-meter').textContent(),'20.0');assert.equal(await root.getAttribute('data-records'),'0');
      assert.equal(await p.locator('#heat-stage-conclusion').isVisible(),true);assert.equal(await p.locator('#heat-stage-graph').getAttribute('data-mode'),'example');
      await play.click();assert.equal(await root.getAttribute('data-water-calories'),'0');await finish(q);
      assert.equal(Number(await root.getAttribute('data-water-calories')),q);assert.equal(await p.locator('#heat-stage-meter').textContent(),(20+q/100).toFixed(1));
      const points=await actualPoints();assert.ok(points.length>=10);assert.equal(points.at(-1),q);assert.ok(points.every(v=>v<=q+1e-7));assert.ok(Number(await p.locator('#heat-stage-graph').getAttribute('data-maximum'))>=q);
    }
  });

  await t.test('空白或超出模型範圍不啟動，有效小數恢復後不自動播放',async()=>{
    for(const value of ['','0','99','3001','-1']){await input.fill(value);assert.equal(await play.isDisabled(),true);assert.equal(await p.locator('#heat-stage-input-error').isVisible(),true);assert.equal(await p.locator('#heat-stage-conclusion').isVisible(),true);}
    await input.fill('120.25');assert.equal(await play.isEnabled(),true);assert.equal(await p.locator('#heat-stage-input-error').isHidden(),true);
    await p.clock.runFor(10000);assert.equal(await p.locator('#heat-stage-meter').textContent(),'20.0');await input.fill('1000');
  });

  await t.test('換區／失焦／背景保留實際曲線與紀錄，不自動續播；手動接續同一過程',async()=>{
    for(const kind of ['nav','blur','background']){
      await play.click();await p.clock.runFor(1600);
      if(kind==='nav')await p.locator('.route a[href="#card-03"]').click();
      if(kind==='blur')await p.evaluate(()=>window.dispatchEvent(new Event('blur')));
      if(kind==='background')await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
      assert.equal(await root.getAttribute('data-phase'),'interrupted');const stopped=await state(),cx=await p.locator('#heat-stage-live').getAttribute('cx');await p.clock.runFor(10000);assert.deepEqual(await state(),stopped);assert.equal(await p.locator('#heat-stage-live').getAttribute('cx'),cx);
      if(kind==='background')await p.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
      assert.equal(await p.locator('#heat-stage-graph').getAttribute('data-mode'),'observation');await play.click();assert.equal(await root.getAttribute('data-water-calories'),stopped.waterCalories);await finish(1000);
    }
  });

  await t.test('圖片慢載入或失敗時禁用操作，示例與公式可讀，重試不自動啟動',async()=>{
    const page=await browser.newPage();let release;const gate=new Promise(r=>release=r);
    await page.route('**/heat-bench-refined.webp*',async route=>{await gate;await route.abort();});await page.goto(url,{waitUntil:'domcontentloaded'});
    assert.equal(await page.locator('#heat-stage-play').isDisabled(),true);assert.equal(await page.locator('#heat-stage-conclusion').isVisible(),true);release();
    await page.waitForFunction(()=>document.getElementById('heat-lab').dataset.phase==='error');assert.equal(await page.locator('#heat-stage-target').isDisabled(),true);assert.equal(await page.locator('#mass-play').isEnabled(),true);
    await page.unroute('**/heat-bench-refined.webp*');await page.locator('#heat-stage-retry').click();await page.waitForFunction(()=>document.getElementById('heat-lab').dataset.phase==='ready');
    assert.equal(await page.locator('#heat-stage-meter').textContent(),'20.0');assert.equal(await page.locator('#heat-lab').getAttribute('data-records'),'0');await page.close();
  });

  await t.test('減少動態效果停用攪拌與水紋，數據與移動亮點仍正常更新',async()=>{
    const page=await browser.newPage({reducedMotion:'reduce'});await page.goto(url,{waitUntil:'networkidle'});await page.clock.install();await page.clock.pauseAt(new Date(Date.now()+1000));await page.locator('#heat-stage-play').click();await page.clock.runFor(500);
    const angle=await page.locator('#heat-lab .heat-stir-bar').getAttribute('transform'),x=Number(await page.locator('#heat-stage-live').getAttribute('cx'));await page.clock.runFor(500);
    assert.equal(await page.locator('#heat-lab .heat-stir-bar').getAttribute('transform'),angle);assert.ok(Number(await page.locator('#heat-stage-live').getAttribute('cx'))>x);await page.close();
  });

  await t.test('五個實際視窗的器材／圖表／公式可讀、不裁切且操作至少44px',async()=>{
    for(const [width,height]of [[1440,900],[1366,768],[1280,720],[390,844],[320,740]]){
      const page=await browser.newPage({viewport:{width,height}});await page.goto(url,{waitUntil:'networkidle'});await page.locator('#heat-stage-record-panel summary').click();
      const layout=await page.locator('#card-02').evaluate(n=>{const box=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom,w:r.width,h:r.height};};return{width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,photo:box(n.querySelector('.calorie-photo')),heater:box(n.querySelector('.calorie-heater')),meter:box(n.querySelector('.calorie-meter-screen')),meterClipped:n.querySelector('.calorie-meter-screen').scrollWidth>n.querySelector('.calorie-meter-screen').clientWidth+1,meterFont:parseFloat(getComputedStyle(n.querySelector('.calorie-meter-screen')).fontSize),clipped:[...n.querySelectorAll('td,th,.heat-stage-readings>span')].filter(e=>e.scrollWidth>e.clientWidth+1).map(e=>e.textContent),hits:[...n.querySelectorAll('button,input')].filter(e=>e.getClientRects().length).map(box),fonts:[...n.querySelectorAll('.heat-stage-controls label,.heat-stage-readings,.heat-stage-analysis-grid>div:first-child,#heat-stage-graph text')].map(e=>parseFloat(getComputedStyle(e).fontSize))};});
      layouts.push({width,height,...layout});assert.equal(layout.overflow,false,`${width} overflow`);assert.deepEqual(layout.clipped,[],`${width} clipped`);assert.equal(layout.meterClipped,false,`${width} LCD clipped`);assert.ok(layout.meterFont>=15);assert.ok(layout.fonts.every(f=>f>=15));layout.hits.forEach(b=>assert.ok(b.w>=44&&b.h>=44));
      for(const b of [layout.heater,layout.meter])assert.ok(b.x>=layout.photo.x&&b.right<=layout.photo.right+1&&b.bottom<=layout.photo.bottom+1,`${width} apparatus bounds`);await page.close();
    }
    if(process.env.HEAT_STAGE_CAPTURE_DIR){await fs.mkdir(process.env.HEAT_STAGE_CAPTURE_DIR,{recursive:true});await fs.writeFile(path.join(process.env.HEAT_STAGE_CAPTURE_DIR,'layouts.json'),JSON.stringify(layouts,null,2));}assert.deepEqual(errors,[]);
  });
});
