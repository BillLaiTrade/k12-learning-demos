const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const { chromium } = require('playwright');

test('2.2 sound travels through air while particles stay near their origins', { timeout: 30000 }, async t => {
  const server = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], {
    cwd: path.resolve(__dirname, '..'), stdio: ['ignore', 'pipe', 'pipe']
  });
  t.after(() => server.kill());
  const port = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Server did not start')), 5000);
    server.stdout.on('data', chunk => { const match = String(chunk).match(/port (\d+)/); if (match) { clearTimeout(timer); resolve(match[1]); } });
    server.once('error', reject);
  });
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('requestfailed', r => errors.push(r.url()));
  page.on('response', r => { if (r.status() >= 400) errors.push(r.url()); });
  await page.clock.install();
  const url = `http://127.0.0.1:${port}/units/2/parts/2.2/`;
  await page.goto(url, { waitUntil: 'networkidle' });
  const strike = page.locator('#air-strike');
  const scene = page.locator('#air-wave');
  const positions = () => page.locator('#air-particles circle').evaluateAll(nodes => nodes.map(n => Number(n.getAttribute('cx'))));
  const state = () => scene.getAttribute('data-state');
  const elapsed = async () => Number(await scene.getAttribute('data-elapsed'));
  const drum = () => page.locator('#sound-eardrum').getAttribute('transform');
  const still = await positions(), silentDrum = await drum();

  await t.test('starts at rest and the disturbance reaches nearby particles before distant ones', async () => {
    assert.equal(await state(), 'ready');
    await page.clock.runFor(1000);
    assert.deepEqual(await positions(), still);
    await strike.click(); await page.clock.runFor(500);
    const current = await positions();
    assert.notEqual(current[0], still[0]);
    assert.equal(current[21], still[21]);
    assert.equal(current[42], still[42]);
    assert.equal(await drum(), silentDrum);
    await page.clock.runFor(4000);
    assert.notEqual((await positions())[21], still[21]);
    assert.equal((await positions())[42], still[42]);
    assert.equal(await drum(), silentDrum);
  });

  await t.test('direct bell and button strikes restart one animation without stacking', async () => {
    assert.equal(await page.locator('#air-play, #air-replay').count(), 0);
    assert.equal(await page.locator('.sound-controls button').count(), 1);
    assert.equal(await strike.textContent(), '敲擊鐘');
    for (const target of [page.locator('#sound-bell'), strike, page.locator('#sound-bell')]) {
      await target.click(); await page.clock.runFor(100);
      assert.equal(await state(), 'playing');
      assert.ok(await elapsed() < .15);
      assert.equal((await positions())[42], still[42]);
      assert.equal(await drum(), silentDrum);
    }
    await page.clock.runFor(1000);
    assert.ok(await elapsed() > 1 && await elapsed() < 1.2, 'rapid strikes must not stack animation frames');
  });

  await t.test('a strike launches compression right while particles oscillate locally', async () => {
    await page.locator('#air-strike').click();
    await page.clock.runFor(2000);
    const a = Number(await page.locator('#sound-dense-label').evaluate(n => n.transform.baseVal.consolidate().matrix.e));
    await page.clock.runFor(500);
    const b = Number(await page.locator('#sound-dense-label').evaluate(n => n.transform.baseVal.consolidate().matrix.e));
    assert.ok(b > a + 30 && b < a + 50, 'a dense band should advance, rather than remain attached to one particle');
    const seen = [];
    for (let i = 0; i < 12; i++) {
      await page.clock.runFor(250);
      const current = await positions();
      current.forEach((x, j) => assert.ok(Math.abs(x - still[j]) <= 22.01, 'no particle may drift with the wave'));
      for (let row = 0; row < 3; row++) for (let col = 1; col < 43; col++) {
        assert.ok(current[row * 43 + col] > current[row * 43 + col - 1], 'particles must retain their order');
      }
      seen.push(current[21] - still[21]);
    }
    assert.ok(Math.min(...seen) < -5 && Math.max(...seen) > 5, 'highlighted particle should return in both directions');
    const row = (await positions()).slice(0, 43);
    const gaps = row.slice(1).map((x, i) => x - row[i]);
    assert.ok(Math.max(...gaps) / Math.min(...gaps) > 3, 'dense and sparse regions should be visibly distinct');
  });

  await t.test('ear responds only after arrival; completion and keyboard restart leave no stale animation', async () => {
    await page.locator('#air-strike').click(); await page.clock.runFor(7500);
    assert.equal(await drum(), silentDrum);
    await page.clock.runFor(1000);
    assert.notEqual(await drum(), silentDrum);
    await page.clock.runFor(10000);
    assert.equal(await state(), 'ended');
    assert.deepEqual(await positions(), still);
    assert.equal(await drum(), silentDrum);
    const time = await elapsed();
    await page.clock.runFor(2000); assert.equal(await elapsed(), time);
    const bell = page.locator('#sound-bell');
    await bell.focus(); await page.keyboard.press('Enter'); await page.clock.runFor(300);
    assert.equal(await state(), 'playing'); assert.ok(await elapsed() < .4);
    await page.keyboard.press('Space'); await page.clock.runFor(100);
    assert.ok(await elapsed() < .2);
    await strike.click();
  });

  await t.test('touch controls, enlarged mobile observation, small screens and reduced motion', async () => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
    const mobile = await context.newPage();
    await mobile.clock.install();
    await mobile.goto(url, { waitUntil: 'networkidle' });
    assert.equal(await mobile.locator('#air-wave').getAttribute('data-state'), 'ready');
    assert.ok(await mobile.locator('.sound-mobile-zoom').isVisible());
    await mobile.locator('#sound-bell').tap(); await mobile.clock.runFor(5000);
    assert.equal(await mobile.locator('#air-wave').getAttribute('data-state'), 'playing');
    await mobile.locator('#air-strike').tap(); await mobile.clock.runFor(100);
    assert.ok(Number(await mobile.locator('#air-wave').getAttribute('data-elapsed')) < .2);
    for (const width of [390, 320, 768]) {
      await mobile.setViewportSize({ width, height: 844 });
      assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    }
    await context.close();
  });
  assert.deepEqual(errors, []);
});
