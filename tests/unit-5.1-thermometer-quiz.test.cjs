const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');

test('thermometer quiz model preserves calibration and independent feedback',async()=>{
  const m=await import(pathToFileURL(path.resolve(__dirname,'../units/5/parts/5.1/assets/thermometer-quiz-model.mjs')));
  for(const swap of [false,true]){
    const round=m.makeRound(0,swap);
    assert.equal(round.waterC,32.5);
    assert.notEqual(round.instruments.A.unit,round.instruments.B.unit);
    assert.equal(m.valueFor('F',round.waterC),90.5);
    assert.equal(m.scaleY('C',32.5),m.scaleY('F',90.5));
    assert.ok(Math.abs((m.scaleY('C',31)-m.scaleY('C',32))/(m.scaleY('F',88)-m.scaleY('F',89))-1.8)<1e-10);
    for(const i of Object.values(round.instruments)){
      assert.equal(m.assessInstrument(i,round.waterC).kind,'incomplete');
      i.value=String(m.valueFor(i.unit,round.waterC));i.answerUnit=i.unit;i.measured=true;i.snapshot={stable:false,eye:0};
      assert.equal(m.assessInstrument(i,round.waterC).kind,'unstable');
      i.snapshot={stable:true,eye:20};assert.equal(m.assessInstrument(i,round.waterC).kind,'view');
      i.snapshot.eye=0;i.answerUnit=i.unit==='C'?'F':'C';assert.equal(m.assessInstrument(i,round.waterC).kind,'unit');
      i.answerUnit=i.unit;
      for(const delta of [-.3,.3]){i.value=String(m.valueFor(i.unit,round.waterC)+delta);assert.equal(m.assessInstrument(i,round.waterC).ok,true);}
      i.value=String(m.valueFor(i.unit,round.waterC)+.31);assert.equal(m.assessInstrument(i,round.waterC).kind,'reading');
    }
  }
});

test('physical thermometer assessment in Chromium',{timeout:90000},async t=>{
  const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:['ignore','pipe','pipe']});
  t.after(()=>server.kill());
  const port=await new Promise((resolve,reject)=>{let text='';const timer=setTimeout(()=>reject(Error('server timeout')),5000);server.stdout.on('data',d=>{text+=d;const m=text.match(/port (\d+)/);if(m){clearTimeout(timer);resolve(m[1]);}});server.once('error',reject);});
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});t.after(()=>browser.close());
  const page=await browser.newPage({viewport:{width:1440,height:1100}});const errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});page.on('requestfailed',r=>errors.push(r.url()));
  const url=process.env.THERMOMETER_QUIZ_URL||`${process.env.TEMPERATURE_LESSON_URL||`http://127.0.0.1:${port}/units/5/parts/5.1/index.html`}`;
  const fresh=async()=>{await page.goto(url);await page.locator('#unit-quiz').scrollIntoViewIfNeeded();};
  const localPoint=(selector,x,y)=>page.locator(selector).evaluate((n,[x,y])=>{const p=new DOMPoint(x,y).matrixTransform(n.getScreenCTM());return{x:p.x,y:p.y};},[x,y]);
  const dragTo=async(id,x,y)=>{
    await page.locator('#tq-instrument-'+id).scrollIntoViewIfNeeded();
    const start=await localPoint('#tq-instrument-'+id,0,260),end=await localPoint('#tq-scene',x,y);
    await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(end.x,end.y,{steps:12});await page.mouse.up();
  };
  const mount=async id=>{await dragTo(id,430,250);await page.waitForFunction(id=>document.querySelector('#unit-quiz').dataset.active===id,id);};
  const waitStable=()=>page.waitForFunction(()=>document.querySelector('#unit-quiz').dataset.stable==='true');
  const unitFor=async id=>Number(await page.locator(`#tq-marks-${id} [data-mark]`).first().getAttribute('data-mark'))===32?'F':'C';
  const fill=async(id,wrong=false,c=32.5)=>{const u=await unitFor(id);await page.locator('#tq-reading').fill(String(u==='C'?c:Number((c*1.8+32).toFixed(1))));await page.locator('#tq-unit').selectOption(wrong?(u==='C'?'F':'C'):u);return u;};

  await t.test('approved initial composition has real portraits, two tray objects and no identifying units',async()=>{
    await fresh();
    assert.equal(await page.locator('#tq-instrument-A, #tq-instrument-B').count(),2);
    assert.equal(await page.locator('#unit-quiz').getAttribute('data-active'),'');
    assert.equal(await page.locator('#tq-lens-empty').isVisible(),true);
    assert.equal(await page.locator('#tq-reading').isDisabled(),true);
    assert.equal(await page.locator('#tq-unit').isDisabled(),true);
    assert.equal(await page.locator('#tq-result').isVisible(),false);
    assert.doesNotMatch(await page.locator('#tq-scene').textContent(),/°C|°F|攝氏|華氏|電熱板/);
    assert.equal(await page.locator('#unit-quiz .speaker').count(),2);
    const positions=[];
    for(const avatar of await page.locator('#unit-quiz .speaker').all()){
      const style=await avatar.evaluate(n=>({source:getComputedStyle(n,'::before').backgroundImage,position:getComputedStyle(n,'::before').backgroundPosition}));
      assert.match(style.source,/dialogue-character-avatars\.png/);positions.push(style.position);
    }
    assert.notEqual(positions[0],positions[1]);
    assert.equal(await page.evaluate(async()=>{const image=new Image();image.src=document.querySelector('#tq-scene-art').getAttribute('href');await image.decode();return image.naturalWidth>=1000;}),true);
    for(const id of ['A','B'])assert.doesNotMatch(await page.locator('#tq-instrument-'+id).getAttribute('aria-label'),/攝氏|華氏|°C|°F/);
  });

  await t.test('real drag can measure B first, blocks a second instrument and preserves B when returned',async()=>{
    await fresh();const restingB=await page.locator('#tq-instrument-B').getAttribute('transform');
    assert.equal(await page.locator('#tq-contact-B').isVisible(),true);
    await mount('B');await waitStable();
    assert.equal(await page.locator('#tq-contact-B').isVisible(),false);
    assert.equal(await page.locator('#tq-lens').isVisible(),true);
    assert.match(await page.locator('#tq-lens-title').textContent(),/B/);
    const unit=await fill('B');const value=await page.locator('#tq-reading').inputValue();
    await dragTo('A',430,250);
    assert.equal(await page.locator('#unit-quiz').getAttribute('data-active'),'B');
    assert.match(await page.locator('#tq-message').textContent(),/先將杯中的 B 放回/);
    await dragTo('B',780,680);
    assert.equal(await page.locator('#unit-quiz').getAttribute('data-active'),'');
    assert.equal(await page.locator('#tq-lens-empty').isVisible(),true);
    assert.equal(await page.locator('#tq-instrument-B').getAttribute('transform'),restingB);
    assert.equal(await page.locator('#tq-contact-B').isVisible(),true);
    assert.match(await page.locator('#tq-record-B').textContent(),new RegExp(`${value}°${unit}`));
    await mount('A');await waitStable();await fill('A');await dragTo('A',780,680);
    await page.locator('#tq-check').click();assert.equal(await page.locator('#tq-result').getAttribute('data-success'),'true');
    await mount('B');assert.equal(await page.locator('#tq-reading').inputValue(),value);assert.equal(await page.locator('#tq-unit').inputValue(),unit);
  });

  await t.test('engraved scales use different spacing while the same water gives consistent readings',async()=>{
    await fresh();const observations={};
    for(const id of ['A','B']){
      await mount(id);await waitStable();
      const unit=await unitFor(id),mark=unit==='C'?32:90;
      const ys=await page.locator('#tq-lens-marks path').evaluateAll((nodes,v)=>[v,v+1].map(value=>{const d=nodes.find(n=>Number(n.dataset.mark)===value).getAttribute('d');return Number(d.match(/^M[\d.-]+ ([\d.-]+)/)[1]);}),mark);
      observations[unit]=Math.abs(ys[0]-ys[1]);
      assert.doesNotMatch(await page.locator('#tq-lens').getAttribute('aria-label'),/°C|°F|攝氏|華氏/);
      assert.equal(await page.locator('#tq-lens-marks path').evaluateAll(nodes=>nodes.every((n,i)=>i===0||Number(n.dataset.mark)===Number(nodes[i-1].dataset.mark)+1)),true);
      await dragTo(id,780,680);
    }
    assert.ok(Math.abs(observations.C/observations.F-1.8)<1e-10);
  });

  await t.test('feedback distinguishes incomplete work, early reading, wrong units and wrong viewpoint',async()=>{
    await fresh();await page.locator('#tq-check').click();assert.match(await page.locator('#tq-result').textContent(),/請完成量測/);
    await mount('B');await fill('B');await dragTo('B',780,680);await page.locator('#tq-check').click();assert.match(await page.locator('#tq-result').textContent(),/尚未穩定/);
    await mount('B');await waitStable();await fill('B',true);await page.locator('#tq-check').click();assert.match(await page.locator('#tq-result').textContent(),/刻度讀值合理/);
    await page.locator('#tq-eye').focus();await page.keyboard.press('ArrowUp');await page.keyboard.press('ArrowUp');
    const oldFluid=await page.locator('#tq-lens-fluid').getAttribute('d');await fill('B');await page.locator('#tq-check').click();assert.match(await page.locator('#tq-result').textContent(),/斜視/);
    await page.locator('#tq-level').click();assert.equal(await page.locator('#tq-eye').getAttribute('aria-valuenow'),'0');assert.notEqual(await page.locator('#tq-lens-fluid').getAttribute('d'),oldFluid);
    await fill('B');await page.locator('#tq-reading').fill('249');await page.locator('#tq-check').click();assert.match(await page.locator('#tq-result').textContent(),/單位判斷正確/);
    await page.locator('#tq-reading').fill('-1');await page.locator('#tq-check').click();assert.match(await page.locator('#tq-result').textContent(),/有效讀值/);
    assert.doesNotMatch(await page.locator('#tq-result').textContent(),/90\.5|32\.5/);
  });

  await t.test('cancel, invalid drop and keyboard pickup leave instruments and operation usable',async()=>{
    await fresh();const before=await page.locator('#tq-instrument-A').getAttribute('transform');
    await dragTo('A',100,150);assert.equal(await page.locator('#tq-instrument-A').getAttribute('transform'),before);
    const p=await localPoint('#tq-instrument-A',0,260);await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x-90,p.y-80,{steps:4});await page.keyboard.press('Escape');await page.mouse.up();assert.equal(await page.locator('#tq-instrument-A').getAttribute('transform'),before);
    await page.locator('#tq-instrument-A').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('#tq-drop-target').evaluate(n=>n===document.activeElement),true);await page.keyboard.press('Enter');await waitStable();
    assert.equal(await page.locator('#unit-quiz').getAttribute('data-active'),'A');
    await page.locator('#tq-instrument-A').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('#tq-tray-target').evaluate(n=>n===document.activeElement),true);await page.keyboard.press('Enter');assert.equal(await page.locator('#unit-quiz').getAttribute('data-active'),'');
  });

  await t.test('new challenge cancels active work and clears both drafts without changing teaching controls',async()=>{
    await fresh();await mount('A');await waitStable();await fill('A');const oldUnit=await unitFor('A');
    await page.locator('button[data-view=low]').click();await page.locator('#tq-hint-toggle').click();assert.equal(await page.locator('#tq-hint').isVisible(),true);
    assert.equal(await page.locator('#tq-hint .dual-fraction>span').count(),2);
    assert.equal(await page.locator('#tq-hint .dual-fraction').evaluate(n=>getComputedStyle(n).display),'inline-grid');
    assert.equal(await page.locator('#tq-hint .dual-fraction>span').last().evaluate(n=>getComputedStyle(n).borderTopStyle),'solid');
    await page.locator('#tq-reset').click();assert.notEqual(await unitFor('A'),oldUnit);
    assert.equal(await page.locator('#unit-quiz').getAttribute('data-active'),'');
    assert.equal(await page.locator('#tq-reading').inputValue(),'');assert.equal(await page.locator('#tq-unit').inputValue(),'');assert.equal(await page.locator('#tq-hint').isVisible(),false);
    assert.match(await page.locator('#tq-record-A').textContent(),/尚未完成/);assert.match(await page.locator('#tq-record-B').textContent(),/尚未完成/);
    assert.equal(await page.locator('#parallax-eye').getAttribute('aria-valuenow'),'-100');
    await mount('B');await waitStable();await fill('B',false,27.5);await dragTo('B',780,680);await mount('A');await waitStable();await fill('A',false,27.5);await page.locator('#tq-check').click();assert.equal(await page.locator('#tq-result').getAttribute('data-success'),'true');
    await page.locator('#tq-reset').click();await mount('B');await page.locator('#tq-reset').click();
    await page.waitForTimeout(1900);
    assert.equal(await page.locator('#unit-quiz').getAttribute('data-active'),'');
    assert.equal(await page.locator('#tq-reading').isDisabled(),true);
    assert.equal(await page.locator('#tq-lens-empty').isVisible(),true);
  });

  await t.test('phone touch can take a physical object, return it and cancel a gesture',async()=>{
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const mobile=await context.newPage();
    try{
      await mobile.goto(url);await mobile.locator('#tq-instrument-B').scrollIntoViewIfNeeded();
      const points=await mobile.evaluate(()=>{const from=new DOMPoint(0,260).matrixTransform(document.querySelector('#tq-instrument-B').getScreenCTM()),to=new DOMPoint(430,250).matrixTransform(document.querySelector('#tq-scene').getScreenCTM());return{from:{x:from.x,y:from.y},to:{x:to.x,y:to.y}};});
      const client=await context.newCDPSession(mobile);await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[points.from]});for(let i=1;i<=8;i++)await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:points.from.x+(points.to.x-points.from.x)*i/8,y:points.from.y+(points.to.y-points.from.y)*i/8}]});await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      assert.equal(await mobile.locator('#unit-quiz').getAttribute('data-active'),'B');
      await mobile.waitForFunction(()=>document.querySelector('#unit-quiz').dataset.stable==='true');
      const before=await mobile.locator('#tq-instrument-B').getAttribute('transform');
      const p=await mobile.locator('#tq-instrument-B').evaluate(n=>{const p=new DOMPoint(0,260).matrixTransform(n.getScreenCTM());return{x:p.x,y:p.y};});
      await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p]});await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:p.x+40,y:p.y-30}]});await client.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});assert.equal(await mobile.locator('#tq-instrument-B').getAttribute('transform'),before);
      await mobile.locator('#tq-instrument-B').tap();await mobile.locator('#tq-tray-target').tap();assert.equal(await mobile.locator('#unit-quiz').getAttribute('data-active'),'');
    }finally{await context.close();}
  });

  await t.test('desktop, tablet and phone layouts stay within the viewport and load every resource',async()=>{
    await fresh();for(const width of [1440,1280,1024,768,600,390,320]){
      await page.setViewportSize({width,height:1000});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`overflow at ${width}`);
      for(const selector of ['#tq-reading','#tq-unit','#tq-check','#tq-reset']){
        const b=await page.locator(selector).boundingBox();assert.ok(b.width>20&&b.x>=0&&b.x+b.width<=width+1,`${selector} at ${width}`);
      }
    }
    assert.deepEqual(errors,[]);
  });
});
