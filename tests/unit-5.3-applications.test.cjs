const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');
const fs=require('node:fs/promises');
const {chromium}=require('playwright');

test('第五區：生活場景、放熱連動、日夜比較與鍋具概念',{timeout:240000},async t=>{
  const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:['ignore','pipe','pipe']});
  t.after(()=>server.kill());
  const port=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server timeout')),5000);server.stdout.on('data',d=>{const m=String(d).match(/port (\d+)/);if(m){clearTimeout(timer);resolve(m[1]);}});server.on('error',reject);});
  const remote=process.env.UNIT53_URL,url=remote||`http://127.0.0.1:${port}/units/5/parts/5.3/`;
  const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox'],...(remote?{proxy:{server:process.env.HTTPS_PROXY||process.env.HTTP_PROXY}}:{})});
  t.after(()=>browser.close());
  const p=await browser.newPage({viewport:{width:1366,height:900}}),errors=[],layouts=[];
  p.on('pageerror',e=>errors.push(e.message));
  await p.goto(url,{waitUntil:'networkidle'});
  await p.clock.install();await p.clock.pauseAt(new Date(Date.now()+1000));
  const ready=(page,key)=>page.waitForFunction(k=>!['loading','error'].includes(document.getElementById('application-'+k).dataset.phase),key);
  const choose=async key=>{await p.locator(`button[data-application="${key}"]`).click();await ready(p,key);};
  const capture=async name=>{if(!process.env.APPLICATION_CAPTURE_DIR)return;await fs.mkdir(process.env.APPLICATION_CAPTURE_DIR,{recursive:true});await p.locator('#card-05').screenshot({path:path.join(process.env.APPLICATION_CAPTURE_DIR,name+'.png')});};

  await t.test('水袋從50降到40°C，讀值與正值放熱量同源，完成後才揭示公式及22%比較',async()=>{
    assert.equal(await p.locator('#bottle-temperature').textContent(),'50.0');
    assert.equal(await p.locator('#bottle-energy').textContent(),'0');
    assert.equal(await p.locator('#bottle-discovery').isHidden(),true);
    assert.equal(await p.locator('#bottle-conclusion').isHidden(),true);
    await p.clock.runFor(10000);assert.equal(await p.locator('#bottle-energy').textContent(),'0');
    await p.locator('#bottle-play').click();await p.clock.runFor(2000);
    const sample=await p.evaluate(()=>({temp:Number(document.getElementById('bottle-temperature').textContent),heat:Number(document.getElementById('bottle-energy').textContent.replaceAll(',',''))}));
    assert.ok(sample.temp>40&&sample.temp<50);
    assert.ok(Math.abs(sample.heat-500*(50-sample.temp))<26);
    assert.equal(await p.locator('#bottle-play').isDisabled(),true);
    assert.equal(await p.locator('#bottle-discovery').isHidden(),true);
    assert.equal(await p.locator('.bottle-arrows').isVisible(),true);
    await p.clock.runFor(4500);
    assert.equal(await p.locator('#bottle-temperature').textContent(),'40.0');
    assert.equal(await p.locator('#bottle-drop').textContent(),'10.0');
    assert.equal(await p.locator('#bottle-energy').textContent(),'5,000');
    assert.equal(await p.locator('#bottle-discovery').isVisible(),true);
    assert.match(await p.locator('#bottle-discovery').innerText(),/初溫－末溫/);
    assert.equal(await p.locator('#bottle-aluminum-bar').evaluate(n=>n.getBoundingClientRect().width/n.parentElement.getBoundingClientRect().width).then(n=>Math.round(n*100)),22);
    assert.equal(await p.locator('#card-05').getByRole('button',{name:'暫停',exact:true}).count(),0);
    await capture('bottle-complete');
  });

  await t.test('重觀察收起解釋；換情境、換區、背景中斷保留讀值且不自動續播',async()=>{
    await p.locator('#bottle-play').click();assert.equal(await p.locator('#bottle-discovery').isHidden(),true);
    await p.clock.runFor(1000);await choose('coast');
    const stopped=await p.locator('#bottle-energy').textContent();await p.clock.runFor(10000);
    assert.equal(await p.locator('#bottle-energy').textContent(),stopped);
    await choose('bottle');assert.equal(await p.locator('#bottle-energy').textContent(),stopped);
    await p.locator('#bottle-play').click();assert.equal(await p.locator('#bottle-temperature').textContent(),'50.0');
    await p.clock.runFor(1000);await p.locator('.route a[href="#card-04"]').click();
    const navStopped=await p.locator('#bottle-energy').textContent();await p.clock.runFor(10000);
    assert.equal(await p.locator('#bottle-energy').textContent(),navStopped);
    await p.locator('#bottle-play').click();await p.clock.runFor(1000);
    await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
    const background=await p.locator('#bottle-energy').textContent();await p.clock.runFor(10000);
    await p.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
    assert.equal(await p.locator('#bottle-energy').textContent(),background);
    assert.equal(await p.locator('#application-bottle').getAttribute('data-playing'),'false');
    await p.locator('#bottle-play').click();await p.clock.runFor(500);await p.evaluate(()=>window.dispatchEvent(new Event('blur')));
    const blurStopped=await p.locator('#bottle-energy').textContent();await p.clock.runFor(10000);
    assert.equal(await p.locator('#bottle-energy').textContent(),blurStopped);
  });

  await t.test('海陸日夜切換照片、相同熱量條件、初溫基準及升降方向，無實際氣溫數字',async()=>{
    await choose('coast');
    assert.match(await p.locator('#coast-condition').textContent(),/吸收相同熱量/);
    assert.equal(await p.locator('#coast-photo').getAttribute('src').then(s=>s.includes('coast-day')),true);
    const level=async name=>Number(await p.locator('#coast-'+name+'-level').getAttribute('y'));
    assert.ok(await level('sand')<await level('water'));assert.ok(await level('water')<125);
    await capture('coast-day');
    await p.locator('[data-coast-mode="night"]').click();await ready(p,'coast');
    assert.match(await p.locator('#coast-condition').textContent(),/放出相同熱量/);
    assert.match(await p.locator('#coast-conclusion').textContent(),/降溫較小/);
    assert.ok(await level('sand')>await level('water'));assert.ok(await level('water')>125);
    assert.equal(await p.locator('[data-coast-arrow]').first().getAttribute('d'),'M230 400V260');
    assert.doesNotMatch(await p.locator('#application-coast').innerText(),/\d+\s*°C/);
    assert.match(await p.locator('#application-coast').innerText(),/蒸發與風/);
    await capture('coast-night');
    await p.locator('[data-coast-mode="day"]').click();await ready(p,'coast');
    assert.equal(await p.locator('[data-coast-arrow]').first().getAttribute('d'),'M230 260V400');
  });

  await t.test('鍋身／鍋底可鍵盤操作，兩重點看過才揭示煮得快的判斷，切頁保留',async()=>{
    await choose('pan');assert.equal(await p.locator('#pan-discovery').isHidden(),true);
    await p.locator('[data-pan-part="body"]').press('Enter');
    assert.equal(await p.locator('[data-pan-part="body"]').getAttribute('aria-pressed'),'true');
    assert.match(await p.locator('#pan-focus-text').textContent(),/比熱較小/);
    assert.equal(await p.locator('#pan-discovery').isHidden(),true);
    await p.locator('[data-pan-part="base"]').press('Space');
    assert.equal(await p.locator('[data-pan-part="base"]').getAttribute('aria-pressed'),'true');
    assert.match(await p.locator('#pan-focus-text').textContent(),/導熱能力與比熱是不同性質/);
    assert.equal(await p.locator('#pan-discovery').isVisible(),true);
    assert.match(await p.locator('#pan-discovery').innerText(),/厚度、熱源與食物/);
    await choose('bottle');await choose('pan');assert.equal(await p.locator('#pan-discovery').isVisible(),true);
    await capture('pan-base');
  });

  await t.test('減少動態效果仍保留完整讀值與揭示，箭頭不脈動',async()=>{
    const page=await browser.newPage({reducedMotion:'reduce'});await page.goto(url,{waitUntil:'networkidle'});
    await page.clock.install();await page.clock.pauseAt(new Date(Date.now()+1000));
    await page.locator('#bottle-play').click();await page.clock.runFor(1000);
    const opacity=await page.locator('.bottle-arrows').evaluate(n=>getComputedStyle(n).opacity);
    await page.clock.runFor(1000);assert.equal(await page.locator('.bottle-arrows').evaluate(n=>getComputedStyle(n).opacity),opacity);
    await page.clock.runFor(4500);assert.equal(await page.locator('#bottle-energy').textContent(),'5,000');
    assert.equal(await page.locator('#bottle-discovery').isVisible(),true);await page.close();
  });

  await t.test('慢載入不啟動，場景就緒也不自動播放',async()=>{
    const page=await browser.newPage();let release;const gate=new Promise(r=>release=r);
    await page.route('**/application-bottle.webp*',async r=>{await gate;await r.continue();});
    await page.goto(url,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.getElementById('application-bottle').getAttribute('aria-busy')==='true');
    assert.equal(await page.locator('#bottle-play').isDisabled(),true);
    await page.locator('#bottle-play').dispatchEvent('click');assert.equal(await page.locator('#bottle-energy').textContent(),'0');
    release();await ready(page,'bottle');assert.equal(await page.locator('#bottle-energy').textContent(),'0');
    assert.equal(await page.locator('#bottle-play').isEnabled(),true);await page.close();
  });

  await t.test('圖片失敗隔離在當情境，重試恢復不自動開始；日夜晚到回應不覆蓋新模式',async()=>{
    const page=await browser.newPage();await page.route('**/application-bottle.webp*',r=>r.abort());
    await page.goto(url,{waitUntil:'networkidle'});
    assert.equal(await page.locator('#application-bottle').getAttribute('data-phase'),'error');
    assert.equal(await page.locator('#bottle-play').isDisabled(),true);
    await page.locator('button[data-application="pan"]').click();await ready(page,'pan');
    await page.locator('[data-pan-part="body"]').click();assert.match(await page.locator('#pan-focus-text').textContent(),/比熱/);
    await page.locator('button[data-application="bottle"]').click();
    await page.waitForFunction(()=>document.getElementById('application-bottle').dataset.phase==='error');
    await page.unroute('**/application-bottle.webp*');await page.locator('#application-bottle [data-life-retry]').click();await ready(page,'bottle');
    assert.equal(await page.locator('#bottle-energy').textContent(),'0');
    await page.route('**/application-coast-night.webp*',r=>r.abort());await page.locator('button[data-application="coast"]').click();await ready(page,'coast');
    await page.locator('[data-coast-mode="night"]').click();await page.waitForFunction(()=>document.getElementById('application-coast').dataset.phase==='error');
    await page.unroute('**/application-coast-night.webp*');await page.locator('#application-coast [data-life-retry]').click();await ready(page,'coast');
    assert.match(await page.locator('#coast-photo').getAttribute('src'),/coast-night/);
    let release;const gate=new Promise(r=>release=r);await page.locator('[data-coast-mode="day"]').click();await ready(page,'coast');
    await page.route('**/application-coast-night.webp*',async r=>{await gate;await r.continue();});
    await page.locator('[data-coast-mode="night"]').click();await page.locator('[data-coast-mode="day"]').click();await ready(page,'coast');
    release();await page.waitForLoadState('networkidle');assert.equal(await page.locator('#application-coast').getAttribute('data-mode'),'day');
    assert.match(await page.locator('#coast-condition').textContent(),/吸收/);await page.close();
  });

  await t.test('三桌機與兩窄版三情境無頁面溢出、讀值不截字，主要文字16px、熱點至少44px',async()=>{
    for(const [width,height]of [[1440,900],[1366,768],[1280,720],[390,844],[320,740]]){
      await p.setViewportSize({width,height});
      for(const key of ['bottle','coast','pan']){
        await choose(key);
        if(key==='bottle'){await p.locator('#bottle-play').click();await p.clock.runFor(6500);const labels=await p.locator('.life-bar-scale span').evaluateAll(ns=>ns.filter(e=>e.getClientRects().length).map(e=>({left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right})));for(let i=1;i<labels.length;i++)assert.ok(labels[i].left>=labels[i-1].right-1,`${width} scale labels overlap`);}
        const data=await p.locator('#application-'+key).evaluate(n=>({overflow:document.documentElement.scrollWidth>innerWidth,clipped:[...n.querySelectorAll('.life-temperatures strong,.life-energy strong,.life-bar-row strong')].filter(e=>e.scrollWidth>e.clientWidth+1).map(e=>e.textContent),fonts:[...n.querySelectorAll('h3,.life-reading,.pan-concept p')].map(e=>parseFloat(getComputedStyle(e).fontSize)),hotspots:[...n.querySelectorAll('.pan-hotspot')].map(e=>{const r=e.getBoundingClientRect(),b=e.closest('figure').getBoundingClientRect();return{w:r.width,h:r.height,inside:r.left>=b.left&&r.right<=b.right&&r.top>=b.top&&r.bottom<=b.bottom};})}));
        layouts.push({width,height,key,...data});assert.equal(data.overflow,false,`${width} ${key} page overflow`);assert.deepEqual(data.clipped,[],`${width} ${key} clipped`);assert.ok(data.fonts.every(s=>s>=16));
        data.hotspots.forEach(h=>{assert.ok(h.w>=44&&h.h>=44);assert.equal(h.inside,true,`${width} hotspot cropped`);});
        if(width===320)await capture(key+'-320');
      }
    }
    assert.deepEqual(errors,[]);
    if(process.env.APPLICATION_CAPTURE_DIR)await fs.writeFile(path.join(process.env.APPLICATION_CAPTURE_DIR,'layouts.json'),JSON.stringify(layouts,null,2));
  });
});
