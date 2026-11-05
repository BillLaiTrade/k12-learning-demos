const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');
const fs=require('node:fs/promises');
const {chromium}=require('playwright');

test('5.3 第一區：100 g 水、揭示順序、中斷與器材失敗恢復',{timeout:120000},async t=>{
  const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:['ignore','pipe','pipe']});t.after(()=>server.kill());
  const port=await new Promise((resolve,reject)=>{let output='';const timer=setTimeout(()=>reject(Error('server timeout')),5000);server.stdout.on('data',d=>{output+=d;const m=output.match(/port (\d+)/);if(m){clearTimeout(timer);resolve(m[1]);}});server.on('error',reject);});
  const remote=process.env.UNIT53_URL;
  const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox'],...(remote?{proxy:{server:process.env.HTTPS_PROXY||process.env.HTTP_PROXY}}:{})});t.after(()=>browser.close());
  const url=remote||`http://127.0.0.1:${port}/units/5/parts/5.3/`;
  const page=await browser.newPage({viewport:{width:1366,height:768}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url,{waitUntil:'networkidle'});await page.clock.install();
  const root=page.locator('#calorie-lab'),button=page.locator('#calorie-transfer'),conclusion=page.locator('#calorie-conclusion');
  const ready=()=>page.waitForFunction(()=>document.querySelector('#calorie-lab').dataset.phase==='ready');
  const capture=async name=>{if(!process.env.CALORIE_CAPTURE_DIR)return;await fs.mkdir(process.env.CALORIE_CAPTURE_DIR,{recursive:true});await page.locator('#card-01').screenshot({path:path.join(process.env.CALORIE_CAPTURE_DIR,name+'.png')});};

  await t.test('手動開始，器材與側邊讀值同源；開始前未揭示熱量與定義',async()=>{
    await ready();assert.match(await root.locator('.condition-chip').textContent(),/100 g/);
    assert.equal(await conclusion.isHidden(),true);assert.equal(await page.locator('#calorie-pause').count(),0);
    await page.clock.runFor(1000);assert.equal(await page.locator('#calorie-end').textContent(),'20.0');
    assert.equal(await page.locator('#calorie-reset').count(),0);
    const heater=page.locator('#calorie-heater');
    const light=()=>page.locator('.calorie-heater-light').evaluate(n=>getComputedStyle(n).backgroundColor);
    const offColor=await light();
    await capture('ready-1366');await heater.press('Enter');await page.clock.runFor(2500);
    assert.notEqual(await light(),offColor);assert.equal(await heater.isDisabled(),true);
    assert.equal(await root.getAttribute('data-phase'),'running');assert.equal(await conclusion.isHidden(),true);
    const current=Number(await page.locator('#calorie-end').textContent());assert.ok(current>20&&current<21);
    assert.equal(await page.locator('#calorie-meter').textContent(),current.toFixed(1));assert.equal(await button.isDisabled(),true);await capture('running-1366');
    await page.clock.runFor(4000);assert.equal(await root.getAttribute('data-phase'),'complete');
    assert.equal(await conclusion.isVisible(),true);assert.equal(await page.locator('#calorie-end').textContent(),'21.0');
    assert.equal(await page.locator('#calorie-rise').textContent(),'1.0');assert.equal(await page.locator('#calorie-heat').textContent(),'100');
    assert.equal(await light(),offColor);assert.equal(await button.textContent(),'重新觀察');
    assert.equal(await page.locator('#calorie-definition').evaluate(n=>!!(n.compareDocumentPosition(document.querySelector('.calorie-unit-bridge'))&Node.DOCUMENT_POSITION_FOLLOWING)),true);
    assert.deepEqual(await page.locator('.calorie-comparison tbody th').allTextContents(),['1 g 水','100 g 水']);
    assert.match(await page.locator('.calorie-comparison caption').textContent(),/都升高 1°C/);
    assert.equal(await page.locator('.calorie-rise-track').count(),0);
    await capture('complete-1366');
    await page.clock.runFor(20000);assert.equal(await page.locator('#calorie-end').textContent(),'21.0');
    await heater.click();assert.equal(await conclusion.isHidden(),true);assert.equal(await page.locator('#calorie-end').textContent(),'20.0');
    await page.evaluate(()=>window.dispatchEvent(new Event('blur')));assert.equal(await root.getAttribute('data-phase'),'interrupted');
    await page.clock.runFor(8000);assert.equal(await page.locator('#calorie-end').textContent(),'20.0');
  });

  await t.test('換區或背景中斷不自動續熱，舊結果不延遲寫回',async()=>{
    for(const action of [async()=>page.locator('.route a[href="#card-02"]').click(),async()=>page.evaluate(()=>window.dispatchEvent(new Event('blur'))),async()=>page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));})]){
      await button.click();await page.clock.runFor(1000);await action();assert.equal(await root.getAttribute('data-phase'),'interrupted');
      const stopped=await page.locator('#calorie-end').textContent();await page.clock.runFor(10000);
      assert.equal(await page.locator('#calorie-end').textContent(),stopped);assert.equal(await conclusion.isHidden(),true);
      await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
      assert.equal(await button.textContent(),'重新觀察');
    }
  });

  await t.test('三組桌機與兩組窄版，器材讀值、結果及展開說明不裁切',async()=>{
    await button.click();await page.clock.runFor(6500);const layouts=[];
    for(const [width,height]of [[1440,900],[1366,768],[1280,720],[390,844],[320,740]]){
      await page.setViewportSize({width,height});
      await page.locator('.calorie-assumptions').evaluate(n=>{n.open=true;});
      const layout=await root.evaluate(n=>{
        const r=x=>{const b=x.getBoundingClientRect();return{x:b.x,y:b.y,width:b.width,height:b.height,right:b.right,bottom:b.bottom};};
        const screen=n.querySelector('.calorie-meter-screen');
        return{width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,root:r(n),screen:r(screen),heater:r(n.querySelector('#calorie-heater')),photo:r(n.querySelector('.calorie-photo')),clipped:[...n.querySelectorAll('.calorie-meter-screen,.calorie-difference strong,.calorie-comparison td')].filter(x=>x.scrollWidth>x.clientWidth+1).map(x=>x.className)};
      });
      assert.equal(layout.overflow,false,`${width} page overflow`);assert.deepEqual(layout.clipped,[],`${width} clipped readout`);
      assert.ok(layout.screen.x>=layout.photo.x&&layout.screen.right<=layout.photo.right&&layout.screen.bottom<=layout.photo.bottom);
      assert.ok(layout.heater.width>=44&&layout.heater.height>=44);
      assert.ok(layout.heater.x>=layout.photo.x&&layout.heater.right<=layout.photo.right&&layout.heater.bottom<=layout.photo.bottom);
      layouts.push(layout);await page.locator('.calorie-assumptions').evaluate(n=>{n.open=false;});
      if(width===1280||width===390)await capture(`complete-${width}`);
    }
    if(process.env.CALORIE_CAPTURE_DIR)await fs.writeFile(path.join(process.env.CALORIE_CAPTURE_DIR,'layouts.json'),JSON.stringify(layouts,null,2));
    assert.deepEqual(errors,[]);
  });

  await t.test('圖片慢載入／失敗時不能加熱，重試恢復且其他區仍可用',async()=>{
    const other=await browser.newPage({viewport:{width:1366,height:768}});
    let release;const gate=new Promise(resolve=>{release=resolve;});
    await other.route('**/calorie-water-apparatus.webp*',async route=>{await gate;await route.abort();});
    await other.goto(url,{waitUntil:'domcontentloaded'});
    await other.waitForFunction(()=>document.querySelector('#calorie-lab').dataset.phase==='loading');
    assert.equal(await other.locator('#calorie-transfer').isDisabled(),true);assert.equal(await other.locator('#calorie-heater').isDisabled(),true);assert.equal(await other.locator('#calorie-conclusion').isHidden(),true);
    release();await other.waitForFunction(()=>document.querySelector('#calorie-lab').dataset.phase==='error');
    assert.equal(await other.locator('#calorie-transfer').isDisabled(),true);
    await other.locator('[data-application="pan"]').click();assert.match(await other.locator('#application-content').textContent(),/導熱/);
    await other.unroute('**/calorie-water-apparatus.webp*');await other.locator('#calorie-retry').click();
    await other.waitForFunction(()=>document.querySelector('#calorie-lab').dataset.phase==='ready');
    assert.equal(await other.locator('#calorie-transfer').isEnabled(),true);assert.equal(await other.locator('#calorie-heater').isEnabled(),true);assert.equal(await other.locator('#calorie-end').textContent(),'20.0');
    await other.close();
  });
});
