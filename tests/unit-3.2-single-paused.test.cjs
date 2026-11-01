const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs/promises');
const { chromium } = require('playwright');

test('3.2 striking one fork leaves other paused groups frozen', { timeout: 90000 }, async t => {
  let url = process.env.SINGLE_PAUSED_URL;
  if (!url) {
    const server = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], {
      cwd: path.resolve(__dirname, '..'), stdio: ['ignore', 'pipe', 'ignore']
    });
    t.after(() => server.kill());
    const port = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(Error('server timeout')), 5000);
      server.stdout.on('data', bytes => {
        const match = String(bytes).match(/port (\d+)/);
        if (match) { clearTimeout(timer); resolve(match[1]); }
      });
      server.once('error', reject);
    });
    url = `http://127.0.0.1:${port}/units/3/parts/3.2/#card-04`;
  }
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    ...(process.env.SINGLE_PAUSED_URL ? { proxy: { server: process.env.HTTPS_PROXY || process.env.HTTP_PROXY } } : {})
  });
  t.after(() => browser.close());
  const out = process.env.SINGLE_PAUSED_ARTIFACT_DIR || '/tmp/unit32-single-paused';
  await fs.mkdir(out, { recursive: true });
  const records = [];
  async function open(options = {}) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, ...options });
    t.after(() => page.close());
    await page.clock.install({ time: new Date('2026-11-01T00:00:00Z') });
    await page.clock.pauseAt(new Date('2026-11-01T00:00:01Z'));
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.locator('#experiment-panel[data-phase="idle"]').waitFor({ state: 'attached' });
    await page.locator('#temp-experiment-panel[data-phase="idle"]').waitFor({ state: 'attached' });
    return page;
  }
  const row = (root, group) => root.locator(`[data-group="${group}"]`);
  const seconds = (root, group) => row(root, group).getAttribute('data-time').then(Number);
  const strike = (root, group) => row(root, group).locator('.source-hit');
  const snapshot = (root, group) => row(root, group).evaluate(node => ({
    time: node.dataset.time, phase: node.dataset.phase, distance: node.dataset.reachedDistance,
    readout: node.querySelector('.propagation-readout').textContent,
    arrival: node.querySelector('.arrival-readout > output').textContent,
    scene: node.querySelector('.field > svg').innerHTML
  }));

  await t.test('material groups keep exact paused geometry and clocks until explicit continue; sync and reset still work', async () => {
    const p = await open(), root = p.locator('#card-04');
    await root.locator('#primary-action').click(); await p.clock.runFor(1200);
    await root.locator('#primary-action').click();
    const air = await snapshot(root, 'air'), steel = await snapshot(root, 'steel');
    await strike(root, 'water').click(); await p.clock.runFor(1000);
    assert.deepEqual(await snapshot(root, 'air'), air);
    assert.deepEqual(await snapshot(root, 'steel'), steel);
    assert.ok(Math.abs(await seconds(root, 'water') - 1) < .03);
    assert.ok(Math.abs(Number(await row(root, 'water').getAttribute('data-reached-distance')) - 1480) < 30);
    assert.match(await row(root, 'air').locator('.individual-time').textContent(), /已暫停/);
    records.push({ mode: 'material', frozenAir: air.time, water: await seconds(root, 'water') });
    await root.screenshot({ path: path.join(out, 'material-single-1440.png') });
    await strike(root, 'water').click(); await p.clock.runFor(200);
    assert.ok(Math.abs(await seconds(root, 'water') - .2) < .03);
    assert.deepEqual(await snapshot(root, 'air'), air);
    await root.locator('#pause-action').click();
    const water = await seconds(root, 'water');
    await p.clock.runFor(1000);
    assert.equal(await seconds(root, 'water'), water);
    await root.locator('#pause-action').click(); await p.clock.runFor(500);
    assert.ok(Math.abs(await seconds(root, 'air') - Number(air.time) - .5) < .03);
    assert.ok(Math.abs(await seconds(root, 'steel') - Number(steel.time) - .5) < .03);
    assert.ok(Math.abs(await seconds(root, 'water') - water - .5) < .03);
    await root.locator('#primary-action').click(); await p.clock.runFor(250);
    for (const group of ['air', 'water', 'steel']) assert.ok(Math.abs(await seconds(root, group) - .25) < .03);
    await root.locator('#reset-action').click();
    for (const group of ['air', 'water', 'steel']) {
      assert.equal(await seconds(root, group), 0);
      assert.equal(await row(root, group).getAttribute('data-phase'), 'idle');
    }
    await p.close();
  });

  await t.test('either temperature group can restart alone; progress markers and completion preserve the other pause', async () => {
    const p = await open(), root = p.locator('#card-05');
    await root.locator('#temp-primary-action').click(); await p.clock.runFor(600);
    await root.locator('#temp-primary-action').click();
    const cold = await snapshot(root, 'cold');
    await strike(root, 'hot').focus(); await p.keyboard.press('Enter'); await p.clock.runFor(1000);
    assert.deepEqual(await snapshot(root, 'cold'), cold);
    assert.ok(Math.abs(await seconds(root, 'hot') - 1) < .03);
    const progress = root.locator('.race-progress');
    assert.equal(Number(await progress.getAttribute('data-other-distance')), Number(cold.distance));
    await root.locator('#temp-pause-action').click();
    const hot = await snapshot(root, 'hot');
    await strike(root, 'cold').focus(); await p.keyboard.press('Space'); await p.clock.runFor(300);
    assert.deepEqual(await snapshot(root, 'hot'), hot);
    assert.ok(Math.abs(await seconds(root, 'cold') - .3) < .03);
    assert.equal(Number(await progress.getAttribute('data-own-distance')), Number(hot.distance));
    assert.match(await root.locator('.progress-gap').textContent(), /起跑時間不同/);
    records.push({ mode: 'temperature', frozenHot: hot.time, cold: await seconds(root, 'cold') });
    await p.clock.fastForward(25000);
    assert.deepEqual(await snapshot(root, 'hot'), hot);
    assert.equal(await row(root, 'cold').getAttribute('data-phase'), 'complete', JSON.stringify({
      time: await seconds(root, 'cold'),
      panel: await root.locator('#temp-experiment-panel').evaluate(node => ({ ...node.dataset })),
      visibility: await root.evaluate(node => ({ top: node.getBoundingClientRect().top, bottom: node.getBoundingClientRect().bottom, hidden: document.hidden }))
    }));
    assert.equal(await root.locator('#temp-experiment-panel').getAttribute('data-phase'), 'paused');
    assert.equal(await root.locator('#temp-pause-action').textContent(), '繼續觀察');
    await root.locator('#temp-pause-action').click(); await p.clock.runFor(500);
    assert.ok(Math.abs(await seconds(root, 'hot') - Number(hot.time) - .5) < .03);
    assert.equal(await root.locator('#temp-result').isHidden(), true);
    await root.screenshot({ path: path.join(out, 'temperature-single-1440.png') });
    await p.close();
  });

  await t.test('390px touch under reduced motion preserves pauses after navigation and keeps untouched groups idle', async () => {
    const p = await open({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: 'reduce' });
    const root = p.locator('#card-04');
    await strike(root, 'air').tap(); await p.clock.runFor(1000);
    await root.locator('#pause-action').tap();
    const air = await snapshot(root, 'air');
    await p.locator('.route a[href="#card-05"]').tap();
    await p.locator('.route a[href="#card-04"]').tap();
    await strike(root, 'water').tap(); await p.clock.runFor(400);
    assert.deepEqual(await snapshot(root, 'air'), air);
    assert.equal(await row(root, 'steel').getAttribute('data-phase'), 'idle');
    assert.ok(Math.abs(await seconds(root, 'water') - .4) < .03);
    assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await root.screenshot({ path: path.join(out, 'material-single-390.png') });
    await p.close();
  });
  await fs.writeFile(path.join(out, 'observations.json'), JSON.stringify(records, null, 2));
});
