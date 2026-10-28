const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');
const fs=require('node:fs/promises');
const {chromium}=require('playwright');
const repo=path.resolve(__dirname,'..');

test('dual-scale temperature lesson in Chromium',{timeout:45000},async t=>{
  const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:repo,stdio:['ignore','pipe','pipe']});
  t.after(()=>server.kill());
  const port=await new Promise((resolve,reject)=>{
    let output='';const timer=setTimeout(()=>reject(Error('Server startup timed out')),5000);
    server.once('error',reject);server.stdout.on('data',chunk=>{output+=chunk;const match=output.match(/port (\d+)/);if(match){clearTimeout(timer);resolve(match[1]);}});
  });
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});t.after(()=>browser.close());
  const page=await browser.newPage({viewport:{width:1440,height:1100}});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>errors.push(r.url()));
  page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  await page.goto(process.env.DUAL_SCALE_URL||`http://127.0.0.1:${port}/units/5/parts/5.1/index.html`);
  const slider=page.locator('#dual-temperature');
  const setTemperature=async c=>slider.evaluate((n,c)=>{n.value=c;n.dispatchEvent(new Event('input',{bubbles:true}));},c);
  const checkReading=async(c,f)=>{
    assert.equal(await page.locator('#dual-celsius').textContent(),`${c}°C`);
    assert.equal(await page.locator('#dual-fahrenheit').textContent(),`${f}°F`);
    assert.equal(await page.locator('#dual-formula').textContent(),`${c} × 9/5 ＋ 32 ＝ ${f}`);
    const y=await page.locator('#dual-liquid').evaluate(n=>{const [,a,b]=n.getAttribute('d').match(/^M\S+ ([\d.]+)Q\S+ ([\d.]+)/);return(Number(a)+Number(b))/2;});
    assert.ok(Math.abs(y-(560-c/100*430))<.00001);
    assert.ok(Math.abs(y-Number(await page.locator('#dual-guide').getAttribute('y1')))<.00001);
  };
  await t.test('starts at 25°C / 77°F using existing character assets and approved composition',async()=>{
    await checkReading(25,77);
    const order=await page.locator('#card-03 .card-main').evaluate(n=>[...n.children].map(n=>n.className));
    assert.deepEqual(order,['dialogue dialogue--xiaokui','dialogue','dual-lab','dialogue dialogue--xiaokui','dialogue']);
    const shared=await page.locator('#card-02 .speaker').first().evaluate(n=>getComputedStyle(n,'::before').backgroundImage);
    for(const avatar of await page.locator('#card-03 .speaker').all())assert.equal(await avatar.evaluate(n=>getComputedStyle(n,'::before').backgroundImage),shared);
    assert.match(shared,/dialogue-character-avatars\.png/);
    assert.equal(await page.locator('#dual-fluid').count(),1);
  });
  await t.test('engraved Celsius and Fahrenheit degrees have independent, correctly aligned spacing',async()=>{
    const groups=await page.evaluate(()=>['dual-scale-c','dual-scale-f'].map(id=>{
      const group=document.getElementById(id),body=document.getElementById('dual-body').getBBox();
      return {marks:[...group.querySelectorAll('line')].map(n=>({degree:Number(n.dataset.degree),y:Number(n.getAttribute('y1'))})),contained:[...group.children].every(n=>{const b=n.getBBox();return b.x>body.x&&b.x+b.width<body.x+body.width;})};
    }));
    const [c,f]=groups;assert.equal(c.marks.length,101);assert.equal(f.marks.length,181);
    const cSpacing=c.marks[0].y-c.marks[1].y,fSpacing=f.marks[0].y-f.marks[1].y;
    assert.ok(Math.abs(cSpacing/fSpacing-1.8)<.000001);
    assert.notEqual(cSpacing,fSpacing);assert.ok(c.contained&&f.contained);
    for(const value of [0,5,10,20,25,37,50,75,100]){
      const fahrenheit=value*9/5+32;
      // Integer readings appear on both independently generated engraved scales.
      if(Number.isInteger(fahrenheit))assert.ok(Math.abs(c.marks[value].y-f.marks[fahrenheit-32].y)<.000001);
    }
    assert.ok(Math.abs(c.marks[0].y-f.marks[0].y)<.000001);
    assert.ok(Math.abs(c.marks[100].y-f.marks[180].y)<.000001);
  });
  await t.test('all four temperature presets synchronize liquid, conversions and selected state',async()=>{
    for(const [c,f] of [[0,32],[25,77],[37,98.6],[100,212],[25,77]]){
      await page.locator(`[data-dual-preset="${c}"]`).click();await checkReading(c,f);
      assert.equal(await slider.inputValue(),String(c));
      assert.equal(await page.locator('#card-03 [aria-pressed=true]').count(),1);
      assert.equal(await page.locator(`[data-dual-preset="${c}"]`).getAttribute('aria-pressed'),'true');
    }
  });
  await t.test('real mouse slider, keyboard endpoints and half-degree inputs stay in sync',async()=>{
    await slider.scrollIntoViewIfNeeded();const box=await slider.boundingBox();
    await page.mouse.move(box.x+box.width*.25,box.y+box.height/2);await page.mouse.down();
    await page.mouse.move(box.x+box.width*.62,box.y+box.height/2,{steps:10});await page.mouse.up();
    const value=Number(await slider.inputValue());assert.ok(value>55&&value<70);
    await checkReading(value,Number((value*1.8+32).toFixed(1)));
    assert.equal(await page.locator('#card-03 [aria-pressed=true]').count(),0);
    await slider.focus();await page.keyboard.press('Home');await checkReading(0,32);
    await page.keyboard.press('End');await checkReading(100,212);
    await page.keyboard.press('ArrowLeft');await checkReading(99.5,211.1);
    for(const c of [0.5,12.5,37.5,68.5,100,25]){await setTemperature(c);await checkReading(c,Number((c*1.8+32).toFixed(1)));}
    await page.locator('[data-dual-preset="37"]').focus();await page.keyboard.press('Enter');await checkReading(37,98.6);
    await page.emulateMedia({reducedMotion:'reduce'});await page.locator('[data-dual-preset="25"]').click();await checkReading(25,77);
  });
  await t.test('responsive layout has readable controls and a single correctly ordered instrument',async()=>{
    for(const width of [1440,1280,1024,768,640,390,320]){
      await page.setViewportSize({width,height:1050});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`horizontal overflow at ${width}`);
      for(const c of [0,25,37,100]){
        await page.locator(`[data-dual-preset="${c}"]`).click();await checkReading(c,Number((c*1.8+32).toFixed(1)));
        const output=await page.locator('#dual-readout').evaluate(n=>n.scrollWidth<=n.clientWidth+1);assert.ok(output,`readout overflow at ${width}`);
      }
      const [instrument,consoleBox]=await Promise.all([page.locator('.dual-instrument').boundingBox(),page.locator('.dual-console').boundingBox()]);
      assert.ok(width>640?instrument.x+instrument.width<=consoleBox.x+1:instrument.y+instrument.height<=consoleBox.y+1);
    }
    assert.deepEqual(errors,[]);
  });
  await t.test('touch controls and slider operate on a mobile device',async()=>{
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    const mobile=await context.newPage();await mobile.goto(page.url());
    await mobile.locator('[data-dual-preset="37"]').tap();assert.equal(await mobile.locator('#dual-fahrenheit').textContent(),'98.6°F');
    const range=mobile.locator('#dual-temperature');await range.scrollIntoViewIfNeeded();const b=await range.boundingBox();
    await mobile.touchscreen.tap(b.x+b.width*.5,b.y+b.height/2);
    assert.ok(Number(await range.inputValue())>40&&Number(await range.inputValue())<60);
    await context.close();
  });
  if(process.env.DUAL_SCALE_CAPTURE_DIR){
    const dir=process.env.DUAL_SCALE_CAPTURE_DIR;await fs.mkdir(dir,{recursive:true});
    await page.setViewportSize({width:1440,height:1250});
    for(const c of [25,0,37,100]){
      await page.locator(`[data-dual-preset="${c}"]`).click();await page.locator('#card-03').screenshot({path:path.join(dir,`desktop-${c}.png`),style:'.route{visibility:hidden}'});
    }
    await page.setViewportSize({width:390,height:1000});await page.locator('[data-dual-preset="25"]').click();
    await page.locator('#card-03').screenshot({path:path.join(dir,'mobile.png'),style:'.route{visibility:hidden}'});
  }
});
