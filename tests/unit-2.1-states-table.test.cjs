const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn, execFileSync } = require('node:child_process');
const { readFileSync, mkdirSync } = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

test('2.1: three-state diagrams are visible and interact inside the table', { timeout:120000 }, async t => {
  const repo = path.resolve(__dirname, '..');
  const server = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd:repo });
  t.after(() => server.kill());
  const port = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(Error('Server startup timeout')), 5000);
    let out = '';
    server.stdout.on('data', data => { out += data; const m = out.match(/port (\d+)/); if (m) { clearTimeout(timeout); resolve(m[1]); } });
    server.once('error', reject);
  });
  const browser = await chromium.launch({ executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium', args:['--no-sandbox'] });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport:{ width:1440, height:1000 } });
  const failures = [];
  page.on('pageerror', e => failures.push(e.message));
  page.on('response', r => { if(r.status() >= 400) failures.push(`${r.status()} ${r.url()}`); });
  const url = `http://127.0.0.1:${port}/units/2/parts/2.1/`;
  await page.goto(url);
  await page.bringToFront();
  await page.locator('#s2').scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>!document.hidden && document.querySelector('#s2').dataset.gasMotion==='running');
  const captureDir = process.env.STATES_CAPTURE_DIR || '/tmp/states-table-review';
  mkdirSync(captureDir,{recursive:true});
  await page.locator('#s2').screenshot({path:path.join(captureDir,'desktop-initial.png')});
  const cell = key => page.locator(`[data-visual-cell="${key}"]`);
  const piston = key => page.locator(`[data-piston="${key}"]`);
  const volume = key => piston(key).getAttribute('data-volume').then(Number);

  await t.test('nine diagrams and conclusions exist without selecting a table cell', async () => {
    assert.equal(await page.locator('[data-visual-cell]').count(), 9);
    assert.equal(await page.locator('#state-detail, [data-state-cell], [data-state-pick]').count(), 0);
    for (const box of await page.locator('[data-visual-cell]').all()) {
      assert.equal(await box.locator('svg').isVisible(), true);
      assert.ok((await box.locator('.sv-label').innerText()).length > 0);
    }

    assert.deepEqual(await cell('solid.volume').locator('svg text').allTextContents(), ['3 cm','3 cm','3 cm']);
    assert.equal(await cell('solid.volume').locator('[data-dimension="depth"]').count(),1);
    assert.match(await cell('solid.volume').innerText(), /3 × 3 × 3＝27 cm³/);
    const labelsFit = await cell('solid.volume').locator('svg text').evaluateAll(labels => labels.every(label => {
      const b=label.getBBox(); return b.x>=0 && b.y>=0 && b.x+b.width<=240 && b.y+b.height<=160;
    }));
    assert.equal(labelsFit,true);
    const liquidVolume = await cell('liquid.volume').locator('svg').evaluate(svg => ({
      vessels:[...svg.querySelectorAll('.sv-glass')].map(e=>({width:+e.getAttribute('width'),height:+e.getAttribute('height')})),
      water:[...svg.querySelectorAll('.sv-water')].map(e=>({width:+e.getAttribute('width'),height:+e.getAttribute('height'),y:+e.getAttribute('y')})),
      labels:[...svg.querySelectorAll('text')].map(e=>e.textContent)
    }));
    assert.equal(liquidVolume.vessels[0].width,liquidVolume.vessels[1].width);
    assert.notEqual(liquidVolume.vessels[0].height,liquidVolume.vessels[1].height);
    assert.deepEqual(liquidVolume.water[0],liquidVolume.water[1]);
    assert.deepEqual(liquidVolume.labels,['100 mL','100 mL']);
    assert.match(await cell('liquid.volume').innerText(), /容器變高，水量不變/);
    assert.match(await page.locator('#s2').innerText(), /物理性質/);
    assert.match(await page.locator('#s2 .sv-model-note').innerText(), /難壓縮不代表完全不能/);
    const summary=page.locator('#state-physical-summary');
    assert.equal(await summary.locator('.speaker').count(),1);
    assert.match(await summary.innerText(),/形狀、體積和可壓縮性/);
    assert.match(await summary.innerText(),/物理性質/);
    assert.match(await summary.innerText(),/物質還是原來的物質/);
    assert.doesNotMatch(await summary.innerText(),/點選|按鈕|表格/);
    assert.equal(await page.locator('#s2 .sv-note, #s2 .sv-motion-tools').count(),0);
    assert.equal(await page.getByRole('button',{name:/暫停粒子運動|繼續粒子運動/}).count(),0);
    assert.equal(await page.locator('#s2 .sv-model-note').count(),1);

  });

  await t.test('all four gas diagrams move independently, stay bounded and resume on return', async () => {
    await page.bringToFront();
    await page.waitForFunction(()=>!document.hidden && document.querySelector('#s2').dataset.gasMotion==='running');
    const positions = () => page.locator('#s2 [data-shape-particles], #s2 [data-volume-particles], #s2 [data-piston-particles]').evaluateAll(groups=>groups.map(g=>[...g.querySelectorAll('.sv-particle')].map(d=>[+d.getAttribute('cx'),+d.getAttribute('cy')])));
    const before=await positions();
    assert.equal(before.length,4); assert.ok(before.every(group=>group.length===24));
    const movement = previous => page.waitForFunction(previous => {
      const groups=[...document.querySelectorAll('#s2 [data-shape-particles], #s2 [data-volume-particles], #s2 [data-piston-particles]')];
      return groups.every((group,j)=>[...group.querySelectorAll('.sv-particle')].filter((dot,i)=>Math.hypot(+dot.getAttribute('cx')-previous[j][i][0],+dot.getAttribute('cy')-previous[j][i][1])>.5).length>=12);
    },previous,{timeout:5000});
    try { await movement(before); } catch (error) {
      console.error('Gas motion diagnostic', await page.evaluate(() => ({
        hidden:document.hidden,state:document.querySelector('#s2').dataset.gasMotion,
        sectionTop:document.querySelector('#s2').getBoundingClientRect().top,
        sectionBottom:document.querySelector('#s2').getBoundingClientRect().bottom,
        viewport:innerHeight,
        positions:[...document.querySelectorAll('#s2 [data-shape-particles], #s2 [data-volume-particles], #s2 [data-piston-particles]')].map(g=>[...g.querySelectorAll('.sv-particle')].map(d=>[+d.getAttribute('cx'),+d.getAttribute('cy')]))
      })));
      console.error('Initial gas positions',before);
      throw error;
    }
    const bounded = await page.evaluate(() => new Promise(resolve=>{
      let frames=0;
      function sample(){
        const groups=[...document.querySelectorAll('#s2 [data-shape-particles], #s2 [data-volume-particles], #s2 [data-piston-particles]')];
        const valid=groups.every(g=>{
          let left,right,top,bottom;
          const piston=g.closest('[data-piston]');
          if(piston){
            const y=+piston.querySelector('[data-piston-handle]').getAttribute('transform').match(/translate\(0 ([\d.]+)\)/)[1];
            left=76;right=164;top=y+4;bottom=148;
          }else{
            const box=g.parentElement.querySelector('.sv-glass');
            left=+box.getAttribute('x')+4;top=+box.getAttribute('y')+4;
            right=+box.getAttribute('x') + +box.getAttribute('width')-4;
            bottom=+box.getAttribute('y') + +box.getAttribute('height')-4;
          }
          return [...g.querySelectorAll('.sv-particle')].every(d=>{
            const x=+d.getAttribute('cx'),y=+d.getAttribute('cy'),r=+d.getAttribute('r');
            return Number.isFinite(x+y) && x-r>=left-.002 && x+r<=right+.002 && y-r>=top-.002 && y+r<=bottom+.002;
          });
        });
        if(!valid)return resolve(false);
        if(++frames>=45)return resolve(true);
        requestAnimationFrame(sample);
      }
      requestAnimationFrame(sample);
    }));
    assert.equal(bounded,true);
    assert.equal(await page.locator('[data-gas-motion-toggle]').count(),0);
    await page.locator('#s6').scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>document.querySelector('#s2').dataset.gasMotion==='paused');
    const stopped=await positions();await page.waitForTimeout(250);
    assert.deepEqual(await positions(),stopped);
    await page.locator('#s2').scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>document.querySelector('#s2').dataset.gasMotion==='running');
    await movement(await positions());
  });

  await t.test('gas volume increases and decreases within limits independently of compression', async () => {
    const container=cell('gas.volume').locator('[data-gas-volume]');
    const group=container.locator('[data-volume-particles]');
    assert.equal(await container.getAttribute('data-volume'),'200');
    assert.equal(await cell('gas.volume').locator('[data-piston], [data-piston-handle], .sv-rod').count(),0);
    assert.equal(await cell('gas.volume').locator('[data-gas-volume-choice]').count(),0);
    assert.equal(await cell('gas.volume').locator('[data-gas-volume-step]').count(),2);
    assert.equal(await page.locator('[data-piston]').count(),3);
    const handles=await group.evaluateHandle(g=>[...g.querySelectorAll('.sv-particle')]);
    const compressionBefore=await piston('gas-compress').getAttribute('data-volume');
    const heights=new Map();
    const minus=cell('gas.volume').locator('[data-gas-volume-step="-1"]');
    const plus=cell('gas.volume').locator('[data-gas-volume-step="1"]');
    async function goToVolume(value) {
      let count=0;
      while(+await container.getAttribute('data-volume')!==value) {
        assert.ok(++count<=8,'volume steps must converge');
        const current=+await container.getAttribute('data-volume');
        await (current<value?plus:minus).click();
      }
    }
    for(const value of [100,150,200,250,300,100]) {
      await goToVolume(value);
      assert.equal(await container.getAttribute('data-volume'),String(value));
      assert.equal(await cell('gas.volume').locator('[data-gas-volume-readout]').innerText(),`${value} mL`);
      assert.equal(await minus.isDisabled(),value===100);
      assert.equal(await plus.isDisabled(),value===300);
      if(value===100 || value===300) {
        await (value===100?minus:plus).dispatchEvent('click');
        assert.equal(await container.getAttribute('data-volume'),String(value));
      }
      const data=await container.evaluate(svg=>{
        const glass=svg.querySelector('.sv-glass'),rim=svg.querySelector('.sv-rim');
        const x=+glass.getAttribute('x'),y=+glass.getAttribute('y'),w=+glass.getAttribute('width'),h=+glass.getAttribute('height');
        const dots=[...svg.querySelectorAll('.sv-particle')];
        return {count:dots.length,height:h,rimAligned:+rim.getAttribute('cy')===y,inside:dots.every(d=>{
          const r=+d.getAttribute('r'),cx=+d.getAttribute('cx'),cy=+d.getAttribute('cy');
          return cx-r>=x+3.998 && cx+r<=x+w-3.998 && cy-r>=y+3.998 && cy+r<=y+h-3.998;
        })};
      });
      assert.equal(data.count,24);assert.equal(data.rimAligned,true);assert.equal(data.inside,true);
      heights.set(value,data.height);
      assert.equal(await handles.evaluate(nodes=>nodes.length===24 && nodes.every(n=>n.isConnected && n.parentElement.hasAttribute('data-volume-particles'))),true);
      assert.equal(await piston('gas-compress').getAttribute('data-volume'),compressionBefore);
      const before=await group.locator('.sv-particle').evaluateAll(dots=>dots.map(d=>[+d.getAttribute('cx'),+d.getAttribute('cy')]));
      await page.waitForFunction(before=>[...document.querySelectorAll('[data-volume-particles] .sv-particle')].filter((d,i)=>Math.hypot(+d.getAttribute('cx')-before[i][0],+d.getAttribute('cy')-before[i][1])>.4).length>=8,before,{timeout:5000});
      if(value===100 || value===300) await cell('gas.volume').screenshot({path:path.join(captureDir,`gas-volume-${value}.png`)});
    }
    assert.ok(heights.get(100)<heights.get(200) && heights.get(200)<heights.get(300));
    assert.ok(Math.abs((heights.get(300)-8)/(heights.get(100)-8)-3)<.001);
    await plus.focus();await page.keyboard.press('Space');
    assert.equal(await container.getAttribute('data-volume'),'150');
    await page.keyboard.press('Enter');
    assert.equal(await container.getAttribute('data-volume'),'200');
    assert.match(await cell('gas.volume').locator('.sv-volume-limit').innerText(),/100–300 mL/);
    await handles.dispose();
  });

  await t.test('container changes preserve solid geometry and liquid quantity', async () => {
    const cube = await cell('solid.shape').locator('.sv-cube').last().innerHTML();
    const firstWidth = await cell('solid.shape').locator('[data-vessel-changing] .sv-glass').getAttribute('width');
    await cell('solid.shape').getByRole('button').click();
    assert.notEqual(await cell('solid.shape').locator('[data-vessel-changing] .sv-glass').getAttribute('width'), firstWidth);
    assert.equal(await cell('solid.shape').locator('.sv-cube').last().innerHTML(), cube);
    const dimensions = () => cell('liquid.shape').locator('[data-vessel-changing] .sv-water').evaluate(e => ({ area:Number(e.getAttribute('width')) * Number(e.getAttribute('height')), height:Number(e.getAttribute('height')), bottom:Number(e.getAttribute('y')) + Number(e.getAttribute('height')) }));
    const before = await dimensions();
    for(let i = 0; i < 4; i++) {
      await cell('liquid.shape').getByRole('button').click();
      const after = await dimensions();
      assert.ok(Math.abs(after.area - before.area) < .001);
      assert.equal(after.bottom, 119);
      const trimAligned = await cell('liquid.shape').locator('[data-vessel-changing]').evaluate(g => {
        const glass=g.querySelector('.sv-glass'),rim=g.querySelector('.sv-rim');
        const water=g.querySelector('.sv-water'),surface=g.querySelector('.sv-meniscus');
        return +rim.getAttribute('cy')===+glass.getAttribute('y') && +rim.getAttribute('rx')===+glass.getAttribute('width')/2 && +surface.getAttribute('cy')===+water.getAttribute('y') && +surface.getAttribute('rx')===+water.getAttribute('width')/2;
      });
      assert.equal(trimAligned,true);

    }
    assert.equal(await cell('liquid.shape').locator('svg text').allTextContents().then(a => a.join(',')), '100 mL,100 mL');
  });

  await t.test('gas shape changes keep all particles inside the sealed container', async () => {
    for(let i = 0; i < 3; i++) {
      await cell('gas.shape').getByRole('button').click();
      const state = await cell('gas.shape').locator('[data-vessel-changing]').evaluate(g => {
        const box = g.querySelector('.sv-glass');
        const x = Number(box.getAttribute('x')), y = Number(box.getAttribute('y'));
        const w = Number(box.getAttribute('width')), h = Number(box.getAttribute('height'));
        const dots = [...g.querySelectorAll('.sv-particle')];
        const rim=g.querySelector('.sv-rim');
        const aligned=+rim.getAttribute('cy')===y && +rim.getAttribute('rx')===w/2;
        return { count:dots.length, aligned, inside:dots.every(d => +d.getAttribute('cx') > x && +d.getAttribute('cx') < x+w && +d.getAttribute('cy') > y && +d.getAttribute('cy') < y+h) };
      });
      assert.deepEqual(state, { count:24, aligned:true, inside:true });
    }
  });

  await t.test('solid and liquid lift above unchanged samples and stop when lowered to contact', async () => {
    assert.equal(await page.locator('[data-press]').count(),0);
    for(const kind of ['solid', 'liquid']) {
      const model=piston(`${kind}-compress`),handle=model.locator('[data-piston-handle]');
      assert.equal(await cell(`${kind}.compress`).getByRole('button').count(),0);
      assert.match(await cell(`${kind}.compress`).innerText(), /拖動活塞把手/);
      const geometry=()=>model.evaluate(s=>({ transform:s.querySelector('[data-piston-handle]').getAttribute('transform'),fillY:s.querySelector('[data-piston-fill]').getAttribute('y'),fillHeight:s.querySelector('[data-piston-fill]').getAttribute('height') }));
      const before=await geometry();
      for(let i=0;i<2;i++) {
        await handle.scrollIntoViewIfNeeded();
        const box=await handle.boundingBox(),x=box.x+box.width/2,y=box.y+10;
        await page.mouse.move(x,y);await page.mouse.down();
        await page.mouse.move(x,y+55,{steps:8});
        assert.deepEqual(await geometry(),before);
        assert.equal(await volume(`${kind}-compress`),100);
        assert.match(await cell(`${kind}.compress`).innerText(), /幾乎不變/);
        await page.mouse.move(x,y-25,{steps:6});await page.mouse.up();
        const lifted=await geometry();
        assert.notEqual(lifted.transform,before.transform);
        assert.equal(lifted.fillY,before.fillY);
        assert.equal(lifted.fillHeight,before.fillHeight);
        assert.equal(await volume(`${kind}-compress`),100);
        assert.equal(await model.locator('[data-sample-vent]').isVisible(),true);
        await handle.focus();await page.keyboard.press('Home');
        assert.deepEqual(await geometry(),before);
      }
      await handle.focus();await page.keyboard.press('End');
      assert.equal(await handle.getAttribute('aria-valuenow'),'100');
      assert.equal(await model.getAttribute('data-piston-lift'),'18');
      assert.equal((await geometry()).fillHeight,before.fillHeight);
      await page.keyboard.press('Home');
      assert.equal(await volume(`${kind}-compress`),100);
    }
  });

  await t.test('gas compression responds to mouse drag and keyboard with constant particles', async () => {
    const handle = piston('gas-compress').locator('[data-piston-handle]');
    const box = await handle.boundingBox();
    await page.mouse.move(box.x+box.width/2, box.y+10);
    await page.mouse.down(); await page.mouse.move(box.x+box.width/2, box.y+60, { steps:8 }); await page.mouse.up();
    assert.ok(await volume('gas-compress') < 60);
    assert.equal(await piston('gas-compress').locator('.sv-particle').count(), 24);
    await handle.focus(); await page.keyboard.press('Home');
    assert.equal(await volume('gas-compress'),100);
    await page.keyboard.press('ArrowDown'); assert.ok(await volume('gas-compress') < 100);
    await page.keyboard.press('End'); assert.ok(Math.abs(await volume('gas-compress')-40)<.001);
    await page.locator('#s2').screenshot({path:path.join(captureDir,'gas-compressed.png')});
    const bounds = await piston('gas-compress').evaluate(s => {
      const y=+s.querySelector('[data-piston-handle]').getAttribute('transform').match(/translate\(0 ([\d.]+)\)/)[1];
      return [...s.querySelectorAll('.sv-particle')].every(d => +d.getAttribute('cy') > y+4 && +d.getAttribute('cy') < 150);
    });
    assert.equal(bounds,true);
    const movingBefore=await piston('gas-compress').locator('.sv-particle').evaluateAll(dots=>dots.map(d=>[+d.getAttribute('cx'),+d.getAttribute('cy')]));
    await page.waitForFunction(before=>[...document.querySelectorAll('[data-piston="gas-compress"] .sv-particle')].filter((d,i)=>Math.hypot(+d.getAttribute('cx')-before[i][0],+d.getAttribute('cy')-before[i][1])>.4).length>=8,movingBefore,{timeout:5000});

    await page.keyboard.press('Home');
  });

  await t.test('all other lesson sections are preserved and still initialize', async () => {
    const before = execFileSync('git', ['show', 'HEAD:units/2/parts/2.1/index.html'], { cwd:repo, encoding:'utf8' });
    const current = readFileSync(path.join(repo,'units/2/parts/2.1/index.html'),'utf8');
    const unchanged = await page.evaluate(({before,current}) => {
      const parse = s => new DOMParser().parseFromString(s,'text/html');
      const a=parse(before),b=parse(current);
      return [...a.querySelectorAll('section.lesson-card')].filter(s=>s.id!=='s2').every(s=>s.outerHTML===b.getElementById(s.id)?.outerHTML);
    }, {before,current});
    assert.equal(unchanged,true);
    await page.getByRole('button', { name:'握把', exact:true }).click();
    assert.match(await page.locator('#bucket-detail-copy').innerText(), /塑膠/);
    assert.equal(await page.locator('#particle-box-gas .particle-molecule').count(),30);
    assert.deepEqual(failures,[]);
  });

  await t.test('responsive table stays inside the page; narrow screens scroll internally', async () => {
    const dir = process.env.STATES_CAPTURE_DIR || '/tmp/states-table-review'; mkdirSync(dir,{recursive:true});
    for(const width of [1440,1024,768,390,320]) {
      await page.setViewportSize({width,height:1000});
      await page.locator('#s2').scrollIntoViewIfNeeded();
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth),true,`page overflow at ${width}`);
      if(width < 680) {
        assert.equal(await page.locator('.states-table-scroll').evaluate(e=>e.scrollWidth>e.clientWidth),true);
        await page.locator('.states-table-scroll').evaluate(e=>e.scrollLeft=e.scrollWidth);
        assert.ok(await page.locator('.states-table-scroll').evaluate(e=>e.scrollLeft)>0);
        await page.locator('.states-table-scroll').evaluate(e=>e.scrollLeft=0);
      }
      if(width===1440 || width===390) await page.locator('#s2').screenshot({path:path.join(dir,`${width}.png`)});
    }
  });

  await t.test('touch dragging and reduced-motion keyboard operation work', async () => {
    const context = await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
    t.after(()=>context.close());
    const touch = await context.newPage();
    await touch.goto(url);
    await touch.locator('.states-table-scroll').evaluate(e=>e.scrollLeft=e.scrollWidth);
    const client=await context.newCDPSession(touch);
    for(const kind of ['solid','liquid','gas']) {
      const model=touch.locator(`[data-piston="${kind}-compress"]`);
      const handle=model.locator('[data-piston-handle]');
      await handle.scrollIntoViewIfNeeded();
      const before=await handle.getAttribute('transform');
      const box=await handle.boundingBox(),x=box.x+box.width/2,y=box.y+10;
      await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
      await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y+55}]});
      await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      if(kind==='gas') assert.ok(Number(await model.getAttribute('data-volume'))<60);
      else {
        assert.equal(Number(await model.getAttribute('data-volume')),100);
        assert.equal(await handle.getAttribute('transform'),before);
        assert.match(await model.locator('..').innerText(),/幾乎不變/);
        await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
        await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-25}]});
        await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
        assert.notEqual(await handle.getAttribute('transform'),before);
        assert.equal(Number(await model.getAttribute('data-volume')),100);
      }
      await handle.focus();await touch.keyboard.press('Home');
      assert.equal(Number(await model.getAttribute('data-volume')),100);
    }
    await touch.locator('[data-gas-volume-step="1"]').tap();
    assert.equal(await touch.locator('[data-gas-volume]').getAttribute('data-volume'),'250');
    await touch.locator('[data-gas-volume-step="1"]').tap();
    assert.equal(await touch.locator('[data-gas-volume]').getAttribute('data-volume'),'300');
    assert.equal(await touch.locator('[data-gas-volume-step="1"]').isDisabled(),true);
    await touch.locator('[data-gas-volume-step="-1"]').tap();
    assert.equal(await touch.locator('[data-gas-volume]').getAttribute('data-volume'),'250');
    assert.equal(await touch.locator('[data-volume-particles] .sv-particle').count(),24);
    const movingBefore=await touch.locator('[data-piston="gas-compress"] .sv-particle').evaluateAll(dots=>dots.map(d=>[+d.getAttribute('cx'),+d.getAttribute('cy')]));
    await touch.waitForFunction(before=>[...document.querySelectorAll('[data-piston="gas-compress"] .sv-particle')].filter((d,i)=>Math.hypot(+d.getAttribute('cx')-before[i][0],+d.getAttribute('cy')-before[i][1])>.3).length>=8,movingBefore,{timeout:5000});
    assert.equal(await touch.evaluate(()=>document.documentElement.scrollWidth <= innerWidth),true);
  });
});
