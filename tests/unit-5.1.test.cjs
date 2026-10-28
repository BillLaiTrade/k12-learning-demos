const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const { chromium } = require('playwright');

// Requires Python 3 and Playwright. No npm installation or application server build.
test('5.1 temperature lesson in a real browser', { timeout: 45000 }, async t => {
  const server = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], {
    cwd: path.resolve(__dirname, '..'), stdio: ['ignore', 'pipe', 'pipe']
  });
  t.after(() => server.kill());
  const port = await new Promise((resolve, reject) => {
    let output = '';
    const timer = setTimeout(() => reject(new Error('HTTP server did not start')), 5000);
    server.stdout.on('data', chunk => {
      output += chunk;
      const match = output.match(/port (\d+)/);
      if (match) { clearTimeout(timer); resolve(match[1]); }
    });
    server.once('error', error => { clearTimeout(timer); reject(error); });
    server.once('exit', code => { clearTimeout(timer); reject(new Error(`HTTP server exited ${code}`)); });
  });
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const failures = [];
  page.on('pageerror', error => failures.push(error.message));
  page.on('requestfailed', request => failures.push(request.url()));
  page.on('response', response => { if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`); });
  const base = `http://127.0.0.1:${port}`;
  await page.goto(process.env.TEMPERATURE_LESSON_URL || `${base}/units/5/parts/5.1/index.html`);
  const text = selector => page.locator(selector).textContent();
  await t.test('loads the complete lesson, images, and navigation', async () => {
    assert.equal(await page.locator('.lesson-card').count(), 4);
    assert.equal(await page.locator('.quiz').count(), 1);
    assert.equal(await page.locator('#card-01 .touch-story-scene img').count(), 2);
    for (const image of await page.locator('#card-01 .touch-story-scene img').all()) {
      assert.equal(await image.evaluate(node => node.complete && node.naturalWidth === 1536 && node.naturalHeight === 1024), true);
    }
    assert.equal(await page.locator('#card-01 button, #card-01 input').count(), 0);
    assert.equal(await page.locator('#card-04 input[type=number]').count(), 0);
    assert.equal(await page.locator('.hero-art img').evaluate(image => image.complete && image.naturalWidth > 0), true);
    assert.equal(await page.locator('.lesson-layout').evaluate(node => getComputedStyle(node).display), 'grid');
    for (const href of await page.locator('.route a').evaluateAll(items => items.map(item => item.getAttribute('href')))) {
      assert.equal(await page.locator(href).count(), 1);
    }
    assert.equal(await page.locator('.speaker').first().evaluate(node => getComputedStyle(node, '::before').backgroundImage.includes('dialogue-character-avatars')), true);
  });

  await t.test('observer perspective changes while the physical meniscus and one-degree marks stay fixed', async () => {
    const snapshots = {};
    for (const view of ['high', 'low', 'level']) {
      await page.locator(`button[data-view="${view}"]`).click();
      snapshots[view] = await page.evaluate(() => ({
        liquid: document.querySelector('#parallax-liquid').dataset.worldTemperature,
        meniscus: document.querySelector('#parallax-meniscus').getAttribute('d'),
        glass: document.querySelector('#parallax-projection path').getAttribute('d'),
        ticks: [...document.querySelectorAll('#parallax-ticks path')].map(p => [Number(p.dataset.degree),p.getAttribute('d')]),
        eye: Number(document.querySelector('#parallax-eye').getAttribute('aria-valuenow'))
      }));
      assert.equal(snapshots[view].liquid, '37.5');
      assert.deepEqual(snapshots[view].ticks.map(t=>t[0]), [34,35,36,37,38,39,40,41]);
      assert.match(await text('#parallax-view-badge'), {high:/俯視/,low:/仰視/,level:/平視/}[view]);
    }
    assert.notEqual(snapshots.high.glass, snapshots.low.glass);
    assert.notEqual(snapshots.high.ticks[3][1], snapshots.low.ticks[3][1]);
    // Independently verify the line-of-sight/scale intersection from camera geometry.
    const projection = await page.evaluate(async () => {
      const model = await import(new URL('assets/parallax-model.js',location.href));
      return [-100,0,100].map(position=>{
        const reading=model.apparentTemperature(position);
        return {reading, cap:model.projectPoint([0,0,0],position),mark:model.projectPoint([0,model.degreeY(reading),model.SCALE_DEPTH],position)};
      });
    });
    assert.ok(projection[0].reading < 37.5);
    assert.equal(projection[1].reading, 37.5);
    assert.ok(projection[2].reading > 37.5);
    for(const p of projection) assert.ok(Math.abs(p.cap[1]-p.mark[1])<1e-9);
    // At eye level the fixed liquid lies midway between 37 and 38, not on a new tick.
    const y = d => Number(d.match(/^M[\d.-]+ ([\d.-]+)/)[1]);
    const atLevel=snapshots.level.ticks;
    assert.ok(Math.abs((y(atLevel[3][1])+y(atLevel[4][1]))/2-200)<.001);
    assert.equal(await page.locator('#measurement input, #measurement form, #parallax-reference').count(),0);
  });

  await t.test('illustrated apparatus and clear labels match the existing lab and stay visible at all views', async () => {
    const source=await page.locator('#parallax-apparatus').getAttribute('href');
    assert.equal(source,'assets/parallax-apparatus.webp');
    assert.doesNotMatch(await text('#measurement'),/電熱板|加熱水|熱源/);
    assert.equal(await page.evaluate(async src=>{const img=new Image();img.src=new URL(src,location.href);await img.decode();return img.naturalWidth>1000;},source),true);
    assert.match(await text('.parallax-apparatus-labels'),/刻度/);
    assert.match(await text('.parallax-apparatus-labels'),/液面/);
    assert.match(await text('.parallax-lens-label'),/液面頂端/);
    for(const view of ['high','low','level']){
      await page.locator(`button[data-view=${view}]`).click();
      await page.locator('#parallax-eye').scrollIntoViewIfNeeded();
      const geometry=await page.evaluate(()=>{
        const eye=document.querySelector('#parallax-eye'), rect=eye.getBoundingClientRect();
        const view=document.querySelector('#parallax-view').getBoundingClientRect();
        const overlaps=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
        return {
          handleVisible:!!document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2)?.closest('#parallax-eye'),
          railLabelsClear:[...document.querySelectorAll('.parallax-rail-label')].every(n=>!overlaps(rect,n.getBoundingClientRect())),
          marksInside:[...document.querySelectorAll('#parallax-ticks text')].every(n=>{const r=n.getBoundingClientRect();return r.top>=view.top&&r.bottom<=view.bottom&&r.left>=view.left&&r.right<=view.right;})
        };
      });
      assert.equal(geometry.handleVisible,true,`${view}: handle is visible and clickable`);
      assert.equal(geometry.railLabelsClear,true,`${view}: viewpoint labels do not overlap the handle`);
      assert.equal(geometry.marksInside,true,`${view}: all scale labels remain within the glass window`);
    }
  });

  await t.test('dragging the eye is continuous, clamped, and supports cancel and keyboard', async () => {
    await page.locator('button[data-view=level]').click();
    const eye=page.locator('#parallax-eye');
    await eye.scrollIntoViewIfNeeded();
    const box=await eye.boundingBox();
    const start={x:box.x+box.width/2,y:box.y+box.height/2};
    await page.mouse.move(start.x,start.y);await page.mouse.down();
    await page.mouse.move(start.x,start.y-35,{steps:7});
    const middle=Number(await eye.getAttribute('aria-valuenow'));
    assert.ok(middle>0&&middle<100,`continuous intermediate position ${middle}`);
    await page.mouse.move(start.x,start.y-350,{steps:8});await page.mouse.up();
    assert.equal(await eye.getAttribute('aria-valuenow'),'100');
    const before=await eye.getAttribute('transform');
    await page.mouse.move(start.x,start.y+80);assert.equal(await eye.getAttribute('transform'),before);
    await eye.focus();await page.keyboard.press('Home');
    assert.equal(await eye.getAttribute('aria-valuenow'),'0');
    await page.keyboard.press('ArrowDown');assert.equal(await eye.getAttribute('aria-valuenow'),'-10');
    await page.keyboard.press('ArrowUp');assert.equal(await eye.getAttribute('aria-valuenow'),'0');
    const cancelBox=await eye.boundingBox();
    await page.mouse.move(cancelBox.x+cancelBox.width/2,cancelBox.y+cancelBox.height/2);
    await page.mouse.down();
    await eye.dispatchEvent('pointercancel',{pointerId:1});
    await page.mouse.up();
    assert.equal(await eye.evaluate(n=>n.classList.contains('is-dragging')),false);
  });

  await t.test('mobile touch moves the eye and leaves scrolling available outside the handle', async () => {
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    const mobile=await context.newPage();
    try {
      await mobile.goto(process.env.TEMPERATURE_LESSON_URL || `${base}/units/5/parts/5.1/index.html`);
      await mobile.locator('#parallax-eye').scrollIntoViewIfNeeded();
      const box=await mobile.locator('#parallax-eye').boundingBox();
      const x=box.x+box.width/2,y=box.y+box.height/2;
      const client=await context.newCDPSession(mobile);
      await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
      await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-45}]});
      await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      assert.ok(Number(await mobile.locator('#parallax-eye').getAttribute('aria-valuenow'))>0);
      assert.equal(await mobile.locator('#parallax-view').getAttribute('data-view'),'high');
      assert.equal(await mobile.locator('#parallax-eye').evaluate(n=>n.classList.contains('is-dragging')),false);
      assert.notEqual(await mobile.locator('#parallax-side').evaluate(n=>getComputedStyle(n).touchAction),'none');
      await mobile.locator('button[data-view=level]').tap();
      assert.equal(await mobile.locator('#parallax-eye').getAttribute('aria-valuenow'),'0');
    } finally { await context.close(); }
  });

  await t.test('assessment uses physical instruments and the real shared character portraits', async () => {
    assert.equal(await page.locator('#tq-instrument-A, #tq-instrument-B').count(),2);
    assert.equal(await page.locator('#tq-reading').isDisabled(),true);
    for(const speaker of await page.locator('#unit-quiz .speaker').all()) assert.equal(await speaker.evaluate(n=>getComputedStyle(n,'::before').backgroundImage.includes('dialogue-character-avatars.png')),true);
    assert.equal(await page.locator('#measure-sequence').count(),0);
  });

  await t.test('fits desktop and narrow windows and links back to the unit', async () => {
    for (const width of [1440, 1024, 390]) {
      await page.setViewportSize({ width, height: 900 });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      assert.equal(overflow, false, `horizontal overflow at ${width}px`);
    }
    await page.locator('.end-link').click();
    assert.equal(new URL(page.url()).pathname, '/units/5/index.html');
    await page.getByRole('link', { name: '課綱與出版社對照' }).click();
    await page.getByRole('link', { name: '開啟 5.1：溫度計如何量出冷熱？' }).click();
    assert.equal(new URL(page.url()).pathname, '/units/5/parts/5.1/index.html');
    assert.deepEqual(failures, []);
  });
});
