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
  await page.locator('#s2').scrollIntoViewIfNeeded();
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
    assert.match(await page.locator('#s2').innerText(), /物理性質/);
    assert.match(await page.locator('#s2 .sv-model-note').innerText(), /難壓縮不代表完全不能/);
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
        return { count:dots.length, inside:dots.every(d => +d.getAttribute('cx') > x && +d.getAttribute('cx') < x+w && +d.getAttribute('cy') > y && +d.getAttribute('cy') < y+h) };
      });
      assert.deepEqual(state, { count:24, inside:true });
    }
  });

  await t.test('solid and liquid accept direct dragging while piston position and volume stay fixed', async () => {
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
        assert.deepEqual(await geometry(),before);
      }
      await handle.focus();await page.keyboard.press('End');
      assert.equal(await handle.getAttribute('aria-valuenow'),'0');
      assert.deepEqual(await geometry(),before);
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
      return [...s.querySelectorAll('.sv-particle')].every(d => +d.getAttribute('cy') > y+4 && +d.getAttribute('cy') < 140);
    });
    assert.equal(bounds,true);
    await page.keyboard.press('Home');
    const v = piston('gas-volume').locator('[data-piston-handle]');
    await v.focus(); await page.keyboard.press('End'); assert.ok(await volume('gas-volume') < 41);
    await page.keyboard.press('Home'); assert.equal(await volume('gas-volume'),100);
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
      }
      await handle.focus();await touch.keyboard.press('Home');
      assert.equal(Number(await model.getAttribute('data-volume')),100);
    }
    assert.equal(await touch.evaluate(()=>document.documentElement.scrollWidth <= innerWidth),true);
  });
});
