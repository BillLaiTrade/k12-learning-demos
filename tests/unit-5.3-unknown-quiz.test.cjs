const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');
const fs=require('node:fs/promises');
const {chromium}=require('playwright');

test('B方案小測：先觀察、推算未知比熱、保留作答與換題',{timeout:240000},async t=>{
  const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:['ignore','pipe','pipe']});t.after(()=>server.kill());
  const port=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server timeout')),5000);server.stdout.on('data',d=>{const m=String(d).match(/port (\d+)/);if(m){clearTimeout(timer);resolve(m[1]);}});server.on('error',reject);});
  const remote=process.env.UNIT53_URL,url=remote||`http://127.0.0.1:${port}/units/5/parts/5.3/`;
  const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox'],...(remote?{proxy:{server:process.env.HTTPS_PROXY||process.env.HTTP_PROXY}}:{})});t.after(()=>browser.close());
  const p=await browser.newPage({viewport:{width:1366,height:900}}),errors=[],layouts=[];
  p.on('pageerror',e=>errors.push(e.message));
  await p.goto(url,{waitUntil:'networkidle'});await p.clock.install();await p.clock.pauseAt(new Date(Date.now()+1000));await p.locator('.quiz-nav').click();
  const observe=async()=>{await p.locator('#unknown-observe').click();await p.clock.runFor(6500);assert.equal(await p.locator('#unknown-quiz-lab').getAttribute('data-phase'),'complete');};
  const facts=()=>p.evaluate(()=>{
    const waterLetter=document.getElementById('unknown-label-left').textContent.includes('甲')?'a':'b',unknownLetter=waterLetter==='a'?'b':'a';
    const water=Number(document.getElementById('unknown-meter-left').textContent),unknown=Number(document.getElementById('unknown-meter-right').textContent),heat=Number(document.getElementById('unknown-target-heat').textContent.replaceAll(',',''));
    const temps={[waterLetter]:water,[unknownLetter]:unknown};
    return {waterLetter,unknownLetter,heat,riseA:temps.a-20,riseB:temps.b-20,c:heat/(100*(unknown-20))};
  });
  const fill=async(values)=>{await p.locator('#unknown-rise-a').fill(String(values.riseA));await p.locator('#unknown-rise-b').fill(String(values.riseB));await p.locator('#unknown-specific-heat').fill(String(values.c));await p.locator(`input[name=comparison][value=${values.waterLetter}]`).check();};

  await t.test('初始只有條件與20°C讀值，無自動觀察、預填答案或未知比熱標示',async()=>{
    assert.equal(await p.locator('#unknown-quiz-lab').getAttribute('data-phase'),'ready');
    assert.equal(await p.locator('#unknown-rise-a').isDisabled(),true);
    assert.equal(await p.locator('#unknown-meter-left').textContent(),'20.0');assert.equal(await p.locator('#unknown-meter-right').textContent(),'20.0');
    assert.equal(await p.locator('#unknown-target-heat').textContent(),'500');
    for(const id of ['unknown-rise-a','unknown-rise-b','unknown-specific-heat'])assert.equal(await p.locator('#'+id).inputValue(),'');
    assert.equal(await p.locator('input[name=comparison]:checked').count(),0);
    await p.clock.runFor(10000);assert.equal(await p.locator('#unknown-energy-left').textContent(),'0');
    assert.doesNotMatch(await p.locator('#unknown-quiz-lab').innerText(),/0\.2\s*cal|0\.20\s*cal|4／4/);
    assert.equal(await p.locator('#unit-quiz').getByRole('button',{name:'暫停',exact:true}).count(),0);
    assert.equal(await p.locator('#unknown-observe').getAttribute('class'),'action');
    assert.equal(await p.locator('#unknown-check').isDisabled(),true);
    await p.locator('.unknown-formula summary').click();
    assert.equal(await p.locator('.unknown-formula').getAttribute('open'),'');
    await p.locator('.unknown-formula summary').click();

  });

  await t.test('觀察同源推進樣品吸熱與溫度，到點25／45°C才開放作答，能讀到資料',async()=>{
    await p.locator('#unknown-observe').click();await p.clock.runFor(2000);
    assert.equal(await p.locator('#unknown-rise-a').isDisabled(),true);
    const before=await p.locator('#unknown-energy-left').textContent();assert.equal(before,await p.locator('#unknown-energy-right').textContent());assert.ok(Number(before)>0&&Number(before)<500);
    await p.clock.runFor(4500);assert.equal(await p.locator('#unknown-rise-a').isEnabled(),true);
    assert.equal(await p.locator('#unknown-meter-left').textContent(),'25.0');assert.equal(await p.locator('#unknown-meter-right').textContent(),'45.0');
    assert.equal(await p.locator('#unknown-energy-left').textContent(),'500');assert.equal(await p.locator('#unknown-quiz-lab').getAttribute('data-observed'),'true');
    assert.match(await p.locator('#unknown-readings').textContent(),/甲25.0°C、乙45.0°C/);
    assert.equal(await p.locator('#quiz-result').isHidden(),true);
    assert.equal(await p.locator('#unknown-observe').getAttribute('class'),'secondary');
    assert.equal(await p.locator('#unknown-check').isEnabled(),true);

  });

  await t.test('未填、無效值與錯答給方向提示，不代填；修改清掉舊判定，再答可正確',async()=>{
    await p.locator('#unknown-check').click();assert.match(await p.locator('#unknown-rise-a-feedback').textContent(),/先完成/);
    await p.locator('#unknown-rise-a').fill('0');await p.locator('#unknown-check').click();assert.match(await p.locator('#unknown-rise-a-feedback').textContent(),/大於0/);
    await fill({riseA:25,riseB:45,c:.3,waterLetter:'b'});await p.locator('#unknown-check').click();
    assert.equal(await p.locator('#quiz-result').getAttribute('data-correct'),'false');assert.match(await p.locator('#unknown-rise-a-feedback').textContent(),/末溫減初溫/);
    assert.match(await p.locator('#unknown-specific-heat-feedback').textContent(),/未知樣品的溫升/);
    assert.equal(await p.locator('#unknown-specific-heat').inputValue(),'0.3');
    assert.doesNotMatch(await p.locator('#quiz-result').textContent(),/0\.2|25|5°C/);
    await fill(await facts());assert.equal(await p.locator('#quiz-result').isHidden(),true);assert.equal(await p.locator('#unknown-rise-a').getAttribute('aria-invalid'),null);
    await p.locator('#unknown-check').click();assert.equal(await p.locator('#quiz-result').getAttribute('data-correct'),'true');

  });

  await t.test('重觀察保留作答但收起判定，重新作答只清作答與判定，保留觀察',async()=>{
    await p.locator('#unknown-observe').click();assert.equal(await p.locator('#unknown-specific-heat').inputValue(),'0.2');
    assert.equal(await p.locator('#quiz-result').isHidden(),true);assert.equal(await p.locator('#unknown-rise-a').isDisabled(),true);assert.equal(await p.locator('#unknown-meter-left').textContent(),'20.0');
    await p.clock.runFor(6500);assert.equal(await p.locator('#unknown-specific-heat').inputValue(),'0.2');
    await p.locator('#heat-quiz button[type=reset]').click();assert.equal(await p.locator('#unknown-specific-heat').inputValue(),'');
    assert.equal(await p.locator('#unknown-meter-right').textContent(),'45.0');assert.equal(await p.locator('#unknown-rise-a').isEnabled(),true);
  });

  await t.test('換一組清空、不自動觀察；16組輪換不重複，甲乙配置變動後判定仍正確',async()=>{
    const seen=new Set();let sawSwapped=false;
    const register=async()=>{const value=await facts();const key=`${value.heat}/${value.waterLetter}/${value.c}`;assert.ok(!seen.has(key));seen.add(key);sawSwapped||=value.waterLetter==='b';
      for(const [side,letter]of [['left',value.waterLetter],['right',value.unknownLetter]]){
        assert.equal(await p.locator(`#unknown-label-${side}-letter`).getAttribute('data-letter'),letter);
        assert.equal(await p.locator(`#unknown-energy-${side}-name`).getAttribute('data-letter'),letter);
        const expected=await p.locator(`label[for=unknown-rise-${letter}] .unknown-sample-badge`).evaluate(n=>({text:n.textContent,color:getComputedStyle(n).color,background:getComputedStyle(n).backgroundColor}));
        const actual=await p.locator(`#unknown-label-${side}-letter`).evaluate(n=>({text:n.textContent,color:getComputedStyle(n).color,background:getComputedStyle(n).backgroundColor}));
        assert.deepEqual(actual,expected);
      }
      assert.equal(await p.locator('#unknown-specific-badge').getAttribute('data-letter'),value.unknownLetter);
      await fill(value);await p.locator('#unknown-check').click();assert.equal(await p.locator('#quiz-result').getAttribute('data-correct'),'true');};
    await register();
    for(let i=0;i<15;i++){
      await p.locator('#unknown-new').click();assert.equal(await p.locator('#unknown-specific-heat').inputValue(),'');assert.equal(await p.locator('#quiz-result').isHidden(),true);
      assert.equal(await p.locator('#unknown-meter-left').textContent(),'20.0');assert.equal(await p.locator('#unknown-rise-a').isDisabled(),true);
      assert.equal(await p.locator('#unknown-observe').getAttribute('class'),'action');
      await observe();await register();
    }
    assert.equal(seen.size,16);assert.equal(sawSwapped,true);
    await p.locator('#unknown-observe').click();await p.clock.runFor(500);await p.locator('#unknown-new').click();await p.clock.runFor(10000);
    assert.equal(await p.locator('#unknown-meter-left').textContent(),'20.0');assert.equal(await p.locator('#unknown-energy-left').textContent(),'0');
  });

  await t.test('換區、失焦與背景會停止，不自動續播；重觀察由初溫開始',async()=>{
    for(const kind of ['nav','blur','background']){
      await p.locator('#unknown-observe').click();await p.clock.runFor(1000);
      if(kind==='nav')await p.locator('.route a[href="#card-05"]').click();
      if(kind==='blur')await p.evaluate(()=>window.dispatchEvent(new Event('blur')));
      if(kind==='background')await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
      const stopped=await p.locator('#unknown-energy-left').textContent();await p.clock.runFor(10000);assert.equal(await p.locator('#unknown-energy-left').textContent(),stopped);
      if(kind==='background')await p.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
      assert.equal(await p.locator('#unknown-rise-a').isDisabled(),true);
    }
    await observe();
  });

  await t.test('器材慢載入／失敗時禁止觀察和作答；重試不自動播放，其他場景可用',async()=>{
    const slow=await browser.newPage();let release;const gate=new Promise(r=>release=r);
    await slow.route('**/material-comparison-bench.webp',async r=>{await gate;await r.continue();});await slow.goto(url,{waitUntil:'domcontentloaded'});
    assert.equal(await slow.locator('#unknown-observe').isDisabled(),true);assert.equal(await slow.locator('#unknown-rise-a').isDisabled(),true);
    await slow.locator('#unknown-observe').dispatchEvent('click');release();await slow.waitForFunction(()=>document.getElementById('unknown-quiz-lab').dataset.phase==='ready');
    assert.equal(await slow.locator('#unknown-energy-left').textContent(),'0');await slow.close();
    const failed=await browser.newPage();await failed.route('**/material-comparison-bench.webp*',r=>r.abort());await failed.goto(url,{waitUntil:'networkidle'});
    assert.equal(await failed.locator('#unknown-quiz-lab').getAttribute('data-phase'),'error');assert.equal(await failed.locator('#unknown-observe').isDisabled(),true);
    await failed.locator('button[data-application=pan]').click();await failed.waitForFunction(()=>document.getElementById('application-pan').dataset.phase==='ready');
    await failed.locator('[data-pan-part=body]').click();assert.match(await failed.locator('#pan-focus-text').textContent(),/比熱/);
    await failed.unroute('**/material-comparison-bench.webp*');await failed.locator('#unknown-retry').click();await failed.waitForFunction(()=>document.getElementById('unknown-quiz-lab').dataset.phase==='ready');
    assert.equal(await failed.locator('#unknown-meter-left').textContent(),'20.0');assert.equal(await failed.locator('#unknown-specific-heat').inputValue(),'');await failed.close();
  });

  await t.test('減少動態效果時攪拌子不運動，觀察與作答流程保持',async()=>{
    const page=await browser.newPage({reducedMotion:'reduce'});await page.goto(url,{waitUntil:'networkidle'});await page.clock.install();await page.clock.pauseAt(new Date(Date.now()+1000));
    await page.locator('#unknown-observe').click();await page.clock.runFor(1000);const transform=await page.locator('#unknown-stir').getAttribute('transform');
    await page.clock.runFor(1000);assert.equal(await page.locator('#unknown-stir').getAttribute('transform'),transform);
    await page.clock.runFor(4500);assert.equal(await page.locator('#unknown-meter-right').textContent(),'45.0');assert.equal(await page.locator('#unknown-rise-a').isEnabled(),true);await page.close();
  });

  await t.test('五種尺寸不溢出、輸入及按鈕至少44px，LCD與主要文字可讀，窄版可平移',async()=>{
    for(const [width,height]of [[1440,900],[1366,768],[1280,720],[390,844],[320,740]]){
      await p.setViewportSize({width,height});await p.clock.runFor(32);
      const layout=await p.locator('#unit-quiz').evaluate(n=>({overflow:document.documentElement.scrollWidth>innerWidth,clipped:[...n.querySelectorAll('.unknown-meter,.unknown-specific-input')].filter(e=>e.scrollWidth>e.clientWidth+1).map(e=>e.textContent),fonts:[...n.querySelectorAll('.unknown-conditions,.unknown-step h4,.unknown-step label,.unknown-comparison legend')].map(e=>parseFloat(getComputedStyle(e).fontSize)),hits:[...n.querySelectorAll('input[type=number],button')].filter(e=>e.getClientRects().length).map(e=>{const r=e.getBoundingClientRect();return{w:r.width,h:r.height};}),meters:[...n.querySelectorAll('.unknown-meter')].map(e=>parseFloat(getComputedStyle(e).fontSize)),pan:{client:n.querySelector('.unknown-scene-pan').clientWidth,scroll:n.querySelector('.unknown-scene-pan').scrollWidth}}));
      layouts.push({width,height,...layout});assert.equal(layout.overflow,false,`${width} overflow`);assert.deepEqual(layout.clipped,[],`${width} LCD clipped`);assert.ok(layout.fonts.every(f=>f>=16));assert.ok(layout.meters.every(f=>f>=15));layout.hits.forEach(h=>assert.ok(h.w>=44&&h.h>=44));
      if(width<600){assert.ok(layout.pan.scroll>layout.pan.client);await p.locator('.unknown-scene-pan').evaluate(n=>n.scrollLeft=n.scrollWidth);}

    }
    assert.deepEqual(errors,[]);
    if(process.env.UNKNOWN_CAPTURE_DIR){await fs.mkdir(process.env.UNKNOWN_CAPTURE_DIR,{recursive:true});await fs.writeFile(path.join(process.env.UNKNOWN_CAPTURE_DIR,'layouts.json'),JSON.stringify(layouts,null,2));}
  });
});
