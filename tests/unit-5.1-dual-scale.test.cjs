const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');
const fs=require('node:fs/promises');
const {chromium}=require('playwright');
const repo=path.resolve(__dirname,'..');
const display=n=>String(Number(n.toFixed(1))).replace('-','−');

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
  const input=page.locator('#dual-temperature'),unit=page.locator('#dual-unit'),warm=page.locator('#dual-warm'),cool=page.locator('#dual-cool');
  const apply=async(value,selected='C')=>{await input.fill(String(value));await unit.selectOption(selected);await page.locator('.dual-apply').click();};
  const checkReading=async(c,f=c*9/5+32)=>{
    assert.equal(await page.locator('#dual-celsius').textContent(),`${display(c)}°C`);
    assert.equal(await page.locator('#dual-fahrenheit').textContent(),`${display(f)}°F`);
    const y=await page.locator('#dual-liquid').evaluate(n=>{const [,a,b]=n.getAttribute('d').match(/^M\S+ ([\d.]+)Q\S+ ([\d.]+)/);return(Number(a)+Number(b))/2;});
    assert.ok(Math.abs(y-(560-(c+40)/140*430))<.00001);
    assert.ok(Math.abs(y-Number(await page.locator('#dual-guide').getAttribute('y1')))<.00001);
  };
  await t.test('starts with a general formula, number and unit controls, existing avatars and no slider',async()=>{
    await checkReading(25,77);
    assert.equal(await page.locator('#card-03 input[type=range]').count(),0);
    assert.equal(await page.locator('#dual-rule').getAttribute('aria-label'),'°F ＝ °C × 9/5 ＋ 32');
    assert.equal(await page.locator('#dual-formula').getAttribute('aria-label'),'25 × 9/5 ＋ 32 ＝ 77');
    const order=await page.locator('#card-03 .card-main').evaluate(n=>[...n.children].map(n=>n.className));
    assert.deepEqual(order,['dialogue dialogue--xiaokui','dialogue','dual-lab','dialogue dialogue--xiaokui','dialogue']);
    const shared=await page.locator('#card-02 .speaker').first().evaluate(n=>getComputedStyle(n,'::before').backgroundImage);
    for(const avatar of await page.locator('#card-03 .speaker').all())assert.equal(await avatar.evaluate(n=>getComputedStyle(n,'::before').backgroundImage),shared);
    assert.match(shared,/dialogue-character-avatars\.png/);
    assert.equal(await page.locator('#dual-fluid').count(),1);
  });
  await t.test('independent scales include the -40 intersection and have legible nonoverlapping labels',async()=>{
    const groups=await page.evaluate(()=>['dual-scale-c','dual-scale-f'].map(id=>{
      const group=document.getElementById(id),body=document.getElementById('dual-body').getBBox();
      const labels=[...group.querySelectorAll('text')].map(n=>n.getBBox());
      return {marks:[...group.querySelectorAll('line')].map(n=>({degree:Number(n.dataset.degree),y:Number(n.getAttribute('y1'))})),contained:[...group.children].every(n=>{const b=n.getBBox();return b.x>body.x&&b.x+b.width<body.x+body.width;}),labelGaps:labels.slice(1).map((b,i)=>labels[i].y-(b.y+b.height))};
    }));
    const [c,f]=groups;assert.equal(c.marks.length,141);assert.equal(f.marks.length,253);
    const cSpacing=c.marks[0].y-c.marks[1].y,fSpacing=f.marks[0].y-f.marks[1].y;
    assert.ok(Math.abs(cSpacing/fSpacing-1.8)<.000001);assert.ok(c.contained&&f.contained);
    for(const group of groups)assert.ok(group.labelGaps.every(gap=>gap>0));
    const cMap=new Map(c.marks.map(n=>[n.degree,n.y])),fMap=new Map(f.marks.map(n=>[n.degree,n.y]));
    for(const value of [-40,-20,0,5,25,50,75,100]){
      const fahrenheit=value*9/5+32;
      if(Number.isInteger(fahrenheit))assert.ok(Math.abs(cMap.get(value)-fMap.get(fahrenheit))<.000001);
    }
    assert.equal(cMap.get(-40),fMap.get(-40));
  });
  await t.test('all five presets synchronize the intersection, readings and selected state',async()=>{
    for(const [c,f] of [[-40,-40],[0,32],[25,77],[37,98.6],[100,212],[25,77]]){
      await page.locator(`[data-dual-preset="${c}"]`).click();await checkReading(c,f);
      assert.equal(await input.inputValue(),String(c));
      assert.equal(await page.locator('#card-03 [aria-pressed=true]').count(),1);
      assert.equal(await page.locator(`[data-dual-preset="${c}"]`).getAttribute('aria-pressed'),'true');
    }
  });
  await t.test('warming and cooling support click, keyboard, hold and release without extra steps',async()=>{
    await warm.click();await checkReading(26);await cool.click();await checkReading(25);
    await warm.focus();await page.keyboard.press('Enter');await checkReading(26);
    await cool.focus();await page.keyboard.press('Space');await checkReading(25);
    await warm.scrollIntoViewIfNeeded();const b=await warm.boundingBox();
    await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.waitForTimeout(850);
    const held=Number(await input.inputValue());assert.ok(held>=28);
    await page.mouse.move(b.x-30,b.y-30);await page.mouse.up();await page.waitForTimeout(350);
    assert.equal(Number(await input.inputValue()),held);await checkReading(held);
    await page.locator('[data-dual-preset="-40"]').click();assert.equal(await cool.isDisabled(),true);
    await warm.click();await checkReading(-39);assert.equal(await cool.isDisabled(),false);
    await page.locator('[data-dual-preset="100"]').click();assert.equal(await warm.isDisabled(),true);
    await cool.click();await checkReading(99);
  });
  await t.test('number and unit submission handles both directions, decimals and rounded approximations',async()=>{
    await input.fill('77');await unit.selectOption('F');assert.equal(await input.inputValue(),'77');
    await checkReading(99); // Editing never changes the applied temperature early.
    await input.press('Enter');await checkReading(25,77);
    assert.equal(await page.locator('#dual-rule').getAttribute('aria-label'),'°C ＝（°F − 32）× 5/9');
    assert.equal(await page.locator('#dual-formula').getAttribute('aria-label'),'（77 − 32）× 5/9 ＝ 25');
    for(const [value,selected,c,f] of [[-40,'F',-40,-40],[-40,'C',-40,-40],[32,'F',0,32],[212,'F',100,212],[37.5,'C',37.5,99.5],[100,'F',340/9,100]]){
      await apply(value,selected);await checkReading(c,f);
    }
    assert.equal(await page.locator('#dual-equality').textContent(),'≈');
    assert.equal(await page.locator('#dual-formula').getAttribute('aria-label'),'（100 − 32）× 5/9 ≈ 37.8');
    await warm.click();await checkReading(340/9+1,101.8);
    assert.equal(await input.inputValue(),'101.8');
  });
  await t.test('invalid or out-of-range input leaves the instrument unchanged and can recover',async()=>{
    await apply(25,'C');
    for(const [value,selected] of [['','C'],[101,'C'],[-40.1,'C'],[213,'F'],[-41,'F']]){
      await apply(value,selected);await checkReading(25);
      assert.equal(await input.getAttribute('aria-invalid'),'true');
      assert.ok((await page.locator('#dual-input-error').textContent()).length>0);
    }
    await apply(-40,'F');await checkReading(-40,-40);
    assert.equal(await input.getAttribute('aria-invalid'),null);
    assert.equal(await page.locator('#dual-input-error').textContent(),'');
    await page.emulateMedia({reducedMotion:'reduce'});await apply(25,'C');await warm.click();await checkReading(26);
  });
  await t.test('responsive desktop and mobile layouts keep the complete new controls within the panel',async()=>{
    await unit.selectOption('C');
    for(const width of [1440,1280,1024,768,640,390,320]){
      await page.setViewportSize({width,height:1050});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`horizontal overflow at ${width}`);
      for(const c of [-40,37,100]){
        await page.locator(`[data-dual-preset="${c}"]`).click();await checkReading(c);
        assert.ok(await page.locator('#dual-readout').evaluate(n=>n.scrollWidth<=n.clientWidth+1),`readout overflow at ${width}`);
      }
      for(const selector of ['#dual-rule','#dual-entry','#dual-cool','#dual-warm'])assert.ok(await page.locator(selector).evaluate(n=>n.scrollWidth<=n.clientWidth+1),`${selector} overflow at ${width}`);
      const [instrument,consoleBox]=await Promise.all([page.locator('.dual-instrument').boundingBox(),page.locator('.dual-console').boundingBox()]);
      assert.ok(width>640?instrument.x+instrument.width<=consoleBox.x+1:instrument.y+instrument.height<=consoleBox.y+1);
    }
    assert.deepEqual(errors,[]);
  });
  await t.test('mobile touch supports press-and-hold, unit selection and numeric submission',async()=>{
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    const mobile=await context.newPage();await mobile.goto(page.url());
    await mobile.locator('#dual-warm').tap();assert.equal(await mobile.locator('#dual-celsius').textContent(),'26°C');
    const button=mobile.locator('#dual-cool');await button.scrollIntoViewIfNeeded();const b=await button.boundingBox();
    const cdp=await context.newCDPSession(mobile);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.width/2,y:b.y+b.height/2}]});
    await mobile.waitForTimeout(800);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    const reading=await mobile.locator('#dual-celsius').textContent();assert.notEqual(reading,'25°C');
    await mobile.waitForTimeout(300);assert.equal(await mobile.locator('#dual-celsius').textContent(),reading);
    await mobile.locator('#dual-temperature').fill('-40');await mobile.locator('#dual-unit').selectOption('F');await mobile.locator('.dual-apply').tap();
    assert.equal(await mobile.locator('#dual-celsius').textContent(),'−40°C');assert.equal(await mobile.locator('#dual-fahrenheit').textContent(),'−40°F');
    await context.close();
  });
  if(process.env.DUAL_SCALE_CAPTURE_DIR){
    const dir=process.env.DUAL_SCALE_CAPTURE_DIR;await fs.mkdir(dir,{recursive:true});
    await page.setViewportSize({width:1440,height:1250});await unit.selectOption('C');
    for(const c of [25,-40,0,37,100]){
      await page.locator(`[data-dual-preset="${c}"]`).click();await page.locator('#card-03').screenshot({path:path.join(dir,`desktop-${c}.png`),style:'.route{visibility:hidden}'});
    }
    await apply(100,'F');await page.locator('#card-03').screenshot({path:path.join(dir,'desktop-fahrenheit.png'),style:'.route{visibility:hidden}'});
    await page.setViewportSize({width:390,height:1000});await unit.selectOption('C');await page.locator('[data-dual-preset="-40"]').click();
    await page.locator('#card-03').screenshot({path:path.join(dir,'mobile.png'),style:'.route{visibility:hidden}'});
  }
});
