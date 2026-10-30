const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { chromium } = require('playwright');
const path = require('node:path');

test('3.2 material micro motion stays separate from sound propagation', { timeout: 60000 }, async t => {
  const server = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], {
    cwd: path.resolve(__dirname, '..'), stdio: ['ignore', 'pipe', 'ignore']
  });
  t.after(() => server.kill());
  const port = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error('server timeout')), 5000);
    server.stdout.on('data', bytes => { const m = String(bytes).match(/port (\d+)/); if (m) { clearTimeout(timer); resolve(m[1]); } });
    server.once('error', reject);
  });
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium' });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const url = `http://127.0.0.1:${port}/units/3/parts/3.2/`;
  await page.goto(url + '#card-04');
  const lab = page.locator('#card-04 [data-sound-speed-lab]');
  await lab.locator('#models').scrollIntoViewIfNeeded();
  const snapshot = () => lab.locator('.particle-micro-motion').evaluateAll(nodes => nodes.map(n => getComputedStyle(n).transform));
  const animations = () => lab.locator('.particle-micro-motion').evaluateAll(nodes => nodes.map(n => n.getAnimations()[0].playState));

  await t.test('air and water move independently at rest, water stays subtler; no sound or clock starts', async () => {
    await page.waitForFunction(() => document.querySelector('#card-04 .particle-micro-motion')?.getAnimations()[0]?.playState === 'running');
    const before = await snapshot(); await page.waitForTimeout(650);
    assert.notDeepEqual(await snapshot(), before);
    const ranges = await lab.locator('.medium-row').evaluateAll(rows => rows.map(row => {
      const samples = [...row.querySelectorAll('.particle-micro-motion')].map(n => {
        const m = new DOMMatrix(getComputedStyle(n).transform); return [m.e, m.f];
      });
      return { kind: row.dataset.kind, samples };
    }));
    for (const { kind, samples } of ranges.filter(r => r.kind !== 'steel')) {
      const limit = kind === 'air' ? [4, 2.8] : [2, 1.4];
      assert.ok(samples.every(([x,y]) => Math.abs(x) <= limit[0] + .001 && Math.abs(y) <= limit[1] + .001));
      assert.ok(new Set(samples.map(s => s.join(','))).size > 20, 'molecules do not sway as one block');
    }
    const mean = samples => samples.reduce((sum,[x,y]) => sum + Math.hypot(x,y),0) / samples.length;
    assert.ok(mean(ranges[0].samples) > mean(ranges[1].samples) * 1.5);
    assert.equal(ranges[2].samples.length, 0);
    assert.equal(await page.locator('#card-05 .particle-micro-motion').count(), 0);
    assert.equal(await lab.locator('#experiment-panel').getAttribute('data-time'), '0.00000000');
    assert.equal(await lab.locator('.particle[data-reached=true]').count(), 0);
  });

  await t.test('both fluids visibly move in screen pixels at desktop widths', async () => {
    for (const width of [1024,1280,1440,1920]) {
      await page.setViewportSize({width,height:1100});
      await lab.locator('#models').scrollIntoViewIfNeeded();
      const frames = [];
      for (let frame = 0; frame < 12; frame++) {
        frames.push(await lab.locator('.particle-micro-motion').evaluateAll(nodes => nodes.map(n => {
          const r = n.getBoundingClientRect(); return [r.x+r.width/2,r.y+r.height/2];
        })));
        await page.waitForTimeout(150);
      }
      const excursion = (start,end) => {
        const ranges = frames[0].slice(start,end).map((_,i) => {
          const xs = frames.map(f => f[start+i][0]), ys = frames.map(f => f[start+i][1]);
          return Math.hypot(Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys));
        });
        return ranges.reduce((sum,r) => sum+r,0)/ranges.length;
      };
      const air = excursion(0,66), water = excursion(66,146);
      console.log(`${width}px screen excursion: air=${air.toFixed(2)}px, water=${water.toFixed(2)}px`);
      assert.ok(air > 1.8, 'air motion must be visible after page scaling');
      assert.ok(water > .9, 'water motion must be visible after page scaling');
      assert.ok(air > water*1.5, 'air remains freer than water');
    }
    await page.setViewportSize({width:1440,height:1100});
    await lab.screenshot({path:'/tmp/unit32-visible-motion-a.png'});
    await page.waitForTimeout(300);
    await lab.screenshot({path:'/tmp/unit32-visible-motion-b.png'});
  });

  await t.test('sound still uses the physical delay and horizontal displacement, with a real-time clock', async () => {
    await lab.locator('#primary-action').click();
    await page.waitForTimeout(1000);
    const result = await lab.evaluate(async root => {
      const m = await import('./assets/sound-speed-model.mjs?v=fixed-22');
      return [...root.querySelectorAll('.medium-row')].map(row => {
        const time = Number(row.dataset.time), speed = Number(row.dataset.speed);
        return [...row.querySelectorAll('.particle')].every(n => {
          const expected = m.sample({ x: Number(n.dataset.originX), y: Number(n.dataset.originY), distance: Number(n.dataset.distance) }, speed, time);
          const actual = n.transform.baseVal.consolidate().matrix;
          return Math.abs(actual.e - expected.x) < .00011 && Math.abs(actual.f - expected.y) < .00011 && String(expected.reached) === n.dataset.reached;
        });
      });
    });
    assert.deepEqual(result, [true,true,true]);
    const elapsed = Number(await lab.locator('#experiment-panel').getAttribute('data-time'));
    assert.ok(elapsed >= .9 && elapsed < 1.8, String(elapsed));
    await lab.locator('#primary-action').click();
    await page.waitForTimeout(60);
    assert.ok((await animations()).every(s => s === 'paused'));
    const before = await snapshot(); await page.waitForTimeout(300); assert.deepEqual(await snapshot(), before);
  });

  await t.test('manual resume works, navigation and hidden tabs freeze micro motion without autoplay on return', async () => {
    await lab.locator('#primary-action').click();
    assert.ok((await animations()).every(s => s === 'running'));
    await page.locator('.route a[href="#card-05"]').click();
    await page.waitForTimeout(80);
    assert.ok((await animations()).every(s => s === 'paused'));
    await page.locator('.route a[href="#card-04"]').click();
    await page.waitForTimeout(80);
    assert.ok((await animations()).every(s => s === 'paused'));
    await lab.locator('#primary-action').click();
    await page.evaluate(() => { Object.defineProperty(document,'hidden',{ configurable:true,value:true }); document.dispatchEvent(new Event('visibilitychange')); });
    await page.waitForTimeout(80);
    assert.ok((await animations()).every(s => s === 'paused'));
    await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
    assert.ok((await animations()).every(s => s === 'paused'));
  });

  await t.test('desktop widths preserve the layout and material layers', async () => {
    for (const width of [1024,1280,1440,1920]) {
      await page.setViewportSize({width,height:1100});
      await lab.locator('#models').scrollIntoViewIfNeeded();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      assert.equal(await lab.locator('.particle-micro-motion').count(), 146);
    }
    await page.setViewportSize({width:1440,height:1100});
    await lab.locator('#reset-action').click();
    await lab.screenshot({path:'/tmp/unit32-micro-motion-desktop.png'});
  });

  await t.test('reduced motion never starts incidental movement, even after a strike', async () => {
    const context = await browser.newContext({reducedMotion:'reduce',viewport:{width:1280,height:1000}});
    try {
      const p = await context.newPage(); await p.goto(url+'#card-04');
      const reduced = p.locator('#card-04 [data-sound-speed-lab]');
      await reduced.locator('#models').scrollIntoViewIfNeeded();
      await p.waitForTimeout(100);
      await reduced.locator('#primary-action').click();
      await p.waitForTimeout(150);
      assert.equal(await reduced.locator('.particle-micro-motion').evaluateAll(ns => ns.every(n => n.getAnimations()[0].playState === 'paused')),true);
    } finally { await context.close(); }
  });
  assert.deepEqual(errors, []);
});
