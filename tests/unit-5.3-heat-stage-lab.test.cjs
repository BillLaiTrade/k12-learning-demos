const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');
const fs=require('node:fs/promises');
const {chromium}=require('playwright');

test('5.3 第二區：分段加熱、自動紀錄、圖表、中斷與載入恢復',{timeout:180000},async t=>{
  const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:['ignore','pipe','pipe']});t.after(()=>server.kill());
  const port=await new Promise((resolve,reject)=>{let out='';const timer=setTimeout(()=>reject(Error('server timeout')),5000);server.stdout.on('data',d=>{out+=d;const m=out.match(/port (\d+)/);if(m){clearTimeout(timer);resolve(m[1]);}});server.on('error',reject);});
  const remote=process.env.UNIT53_URL;
  const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox'],...(remote?{proxy:{server:process.env.HTTPS_PROXY||process.env.HTTP_PROXY}}:{})});t.after(()=>browser.close());
  const url=remote||`http://127.0.0.1:${port}/units/5/parts/5.3/`;
  const page=await browser.newPage({viewport:{width:1366,height:768}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url,{waitUntil:'networkidle'});await page.clock.install();
  const root=page.locator('#heat-lab'),button=page.locator('#heat-stage-play'),heater=page.locator('#heat-stage-heater');
  const phase=()=>root.getAttribute('data-phase');
  const rows=()=>page.locator('#heat-stage-records tr').evaluateAll(ns=>ns.map(n=>[...n.children].map(c=>c.textContent)));
  const capture=async name=>{if(!process.env.HEAT_STAGE_CAPTURE_DIR)return;await fs.mkdir(process.env.HEAT_STAGE_CAPTURE_DIR,{recursive:true});await page.locator('#card-02').screenshot({path:path.join(process.env.HEAT_STAGE_CAPTURE_DIR,name+'.png')});};

  await t.test('只記錄觀察過的點，三次累計熱量對應正確水溫與溫升',async()=>{
    assert.equal(await phase(),'ready');assert.equal(await page.locator('#heat-stage-record-panel').isHidden(),true);assert.equal(await page.locator('#heat-stage-conclusion').isHidden(),true);
    assert.equal(await page.locator('#heat-stage-points circle').count(),0);assert.equal(await root.locator('input[type=range]').count(),0);
    await page.clock.runFor(1500);assert.equal(await phase(),'ready');await capture('ready-1366');
    await heater.press('Enter');await page.clock.runFor(1500);
    assert.equal(await phase(),'running');assert.equal(await heater.isDisabled(),true);assert.equal(await button.isDisabled(),true);
    const state=await root.evaluate(n=>({...n.dataset}));assert.ok(Number(state.waterCalories)>0&&Number(state.waterCalories)<500);
    assert.ok(Math.abs(Number(state.waterCalories)-100*(Number(state.temperature)-20))<1e-7);
    assert.equal(await page.locator('#heat-stage-meter').textContent(),Number(state.temperature).toFixed(1));await capture('running-1366');
    await page.clock.runFor(1500);assert.equal(await phase(),'recorded');assert.deepEqual(await rows(),[['500 cal','25°C','5°C']]);
    assert.equal(await page.locator('#heat-stage-points circle').count(),1);await capture('stage1-1366');
    await button.click();await page.clock.runFor(4000);assert.deepEqual(await rows(),[['500 cal','25°C','5°C'],['1,000 cal','30°C','10°C']]);
    await page.clock.runFor(10000);assert.equal(await phase(),'recorded');assert.equal(await page.locator('#heat-stage-meter').textContent(),'30.0');
    assert.equal(await page.locator('#heat-stage-conclusion').isHidden(),true);
    await heater.click();await page.clock.runFor(9000);assert.equal(await phase(),'complete');
    assert.deepEqual(await rows(),[['500 cal','25°C','5°C'],['1,000 cal','30°C','10°C'],['2,000 cal','40°C','20°C']]);
    const points=await page.locator('#heat-stage-points circle').evaluateAll(ns=>ns.map(n=>({heat:Number(n.dataset.heat),rise:Number(n.dataset.rise),x:Number(n.getAttribute('cx')),y:Number(n.getAttribute('cy'))})));
    assert.deepEqual(points,[{heat:500,rise:5,x:127,y:170.5},{heat:1000,rise:10,x:202,y:127},{heat:2000,rise:20,x:352,y:40}]);
    assert.match(await page.locator('#heat-stage-graph').textContent(),/溫升/);assert.equal(await page.locator('#heat-stage-meter').textContent(),'40.0');
    assert.equal(await page.locator('#heat-stage-conclusion').isVisible(),true);await capture('complete-1366');
    await button.click();assert.equal(await phase(),'running');assert.deepEqual(await rows(),[]);assert.equal(await page.locator('#heat-stage-conclusion').isHidden(),true);
    await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
  });

  await t.test('換區／背景中斷保留已完成紀錄，回來不自動加熱且可接續',async()=>{
    await button.click();await page.clock.runFor(3000);assert.equal(await rows().then(r=>r.length),1);
    await button.click();await page.clock.runFor(1000);await page.locator('.route a[href="#card-03"]').click();
    assert.equal(await phase(),'interrupted');const stopped=await root.getAttribute('data-water-calories');await page.clock.runFor(20000);
    assert.equal(await root.getAttribute('data-water-calories'),stopped);assert.equal(await rows().then(r=>r.length),1);
    await button.click();await page.clock.runFor(4000);assert.equal(await rows().then(r=>r.length),2);
    await button.click();await page.clock.runFor(1000);
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
    assert.equal(await phase(),'interrupted');const background=await root.getAttribute('data-water-calories');await page.clock.runFor(10000);
    await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
    assert.equal(await root.getAttribute('data-water-calories'),background);assert.equal(await rows().then(r=>r.length),2);
    await button.click();await page.clock.runFor(9000);assert.equal(await phase(),'complete');assert.equal(await rows().then(r=>r.length),3);
  });

  await t.test('五種版面可讀，旋鈕及LCD在照片內，其他區與小測不受影響',async()=>{
    const layouts=[];
    for(const [width,height]of [[1440,900],[1366,768],[1280,720],[390,844],[320,740]]){
      await page.setViewportSize({width,height});await page.locator('.heat-stage-assumptions').evaluate(n=>{n.open=true;});
      const layout=await root.evaluate(n=>{const box=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom,w:r.width,h:r.height};};return{width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,photo:box(n.querySelector('.calorie-photo')),heater:box(n.querySelector('.calorie-heater')),meter:box(n.querySelector('.calorie-meter-screen')),plot:box(n.querySelector('.heat-stage-plot')),clipped:[...n.querySelectorAll('td,th,.heat-stage-energy')].filter(e=>e.scrollWidth>e.clientWidth+1).map(e=>e.textContent)};});
      assert.equal(layout.overflow,false,`${width} overflow`);assert.deepEqual(layout.clipped,[],`${width} clipped`);
      assert.ok(layout.heater.w>=44&&layout.heater.h>=44);
      for(const box of [layout.heater,layout.meter])assert.ok(box.x>=layout.photo.x&&box.right<=layout.photo.right&&box.bottom<=layout.photo.bottom);
      layouts.push(layout);await page.locator('.heat-stage-assumptions').evaluate(n=>{n.open=false;});
      if(width===1280||width===390)await capture(`complete-${width}`);
    }
    if(process.env.HEAT_STAGE_CAPTURE_DIR)await fs.writeFile(path.join(process.env.HEAT_STAGE_CAPTURE_DIR,'layouts.json'),JSON.stringify(layouts,null,2));
    assert.deepEqual(errors,[]);
  });

  await t.test('器材慢載入或失敗時禁用兩入口，重試不會自行啟動',async()=>{
    const p=await browser.newPage();let release;const gate=new Promise(resolve=>{release=resolve;});
    await p.route('**/heat-bench-refined.webp*',async r=>{await gate;await r.abort();});
    await p.goto(url,{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>document.querySelector('#heat-lab').dataset.phase==='loading');
    assert.equal(await p.locator('#heat-stage-play').isDisabled(),true);assert.equal(await p.locator('#heat-stage-heater').isDisabled(),true);
    release();await p.waitForFunction(()=>document.querySelector('#heat-lab').dataset.phase==='error');
    await p.locator('[data-application="pan"]').click();assert.match(await p.locator('#application-content').textContent(),/導熱/);
    await p.unroute('**/heat-bench-refined.webp*');await p.locator('#heat-stage-retry').click();
    await p.waitForFunction(()=>document.querySelector('#heat-lab').dataset.phase==='ready');
    assert.equal(await p.locator('#heat-stage-play').isEnabled(),true);assert.equal(await p.locator('#heat-stage-meter').textContent(),'20.0');
    assert.equal(await p.locator('#heat-lab').getAttribute('data-records'),'0');await p.close();
  });
});
