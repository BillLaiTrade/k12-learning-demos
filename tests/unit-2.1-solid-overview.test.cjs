const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs/promises');
const { chromium } = require('playwright');

test('2.1 solid overview grows and recedes along an intact surface', { timeout: 60000 }, async t => {
  const server = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], {
    cwd: path.resolve(__dirname, '..'), stdio: ['ignore', 'pipe', 'ignore']
  });
  t.after(() => server.kill());
  const port = await new Promise((resolve, reject) => {
    let output = '';
    const timer = setTimeout(() => reject(Error('server timeout')), 5000);
    server.stdout.on('data', bytes => {
      output += bytes;
      const match = output.match(/port (\d+)/);
      if (match) { clearTimeout(timer); resolve(match[1]); }
    });
    server.once('error', reject);
  });
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium' });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${port}/units/2/parts/2.1/`);
  const solid = page.locator('[data-phase-state="solid"]');

  await t.test('every intermediate count has full lower layers and a contiguous top surface', async () => {
    await solid.click();
    const snapshots = await page.evaluate(() => {
      const read = () => [...document.querySelectorAll('#freeze-demo-particles > circle')].map(e => ({
        x: Number(e.getAttribute('cx')), y: Number(e.getAttribute('cy'))
      }));
      const records = [];
      // Exercise the actual population command without waiting for every animation cycle.
      // The assertions below infer the surface from rendered coordinates, not pool indices.
      for (const [delta, steps] of [[-1, 32], [1, 56], [-1, 37], [1, 25]]) {
        for (let step = 0; step < steps; step++) {
          const slot = `${delta > 0 ? 'top' : 'bottom'}-${step % 2 ? 'right' : 'left'}`;
          const before = read();
          const changed = changePhaseOverviewPopulation({ stateKey: 'solid', slot }, delta);
          records.push({ before, after: read(), delta, slot, changed, count: phaseOverviewCount });
        }
      }
      return records;
    });
    for (const record of snapshots) {
      assert.equal(record.changed, true);
      assert.equal(record.after.length, record.before.length + record.delta);
      assert.equal(record.count, record.after.length);
      assert.ok(record.count >= 16 && record.count <= 72);
      const rows = new Map();
      for (const point of record.after) {
        if (!rows.has(point.y)) rows.set(point.y, []);
        rows.get(point.y).push(point.x);
      }
      const heights = [...rows.keys()].sort((a, b) => b - a);
      for (let i = 0; i < heights.length; i++) {
        const xs = rows.get(heights[i]).sort((a, b) => a - b);
        if (i < heights.length - 1) assert.equal(xs.length, 12, 'lower layers stay full');
        for (let j = 1; j < xs.length; j++) assert.equal(xs[j] - xs[j - 1], 25, 'no gap within a layer');
        if (i) assert.equal(heights[i - 1] - heights[i], 16, 'no empty layer below the surface');
      }
      const beforeKeys = new Set(record.before.map(p => `${p.x},${p.y}`));
      const afterKeys = new Set(record.after.map(p => `${p.x},${p.y}`));
      const removed = record.before.filter(p => !afterKeys.has(`${p.x},${p.y}`));
      const added = record.after.filter(p => !beforeKeys.has(`${p.x},${p.y}`));
      assert.equal(removed.length, record.delta < 0 ? 1 : 0, 'remaining particles do not jump');
      assert.equal(added.length, record.delta > 0 ? 1 : 0);
      if (removed.length) {
        const top = record.before.filter(p => p.y === Math.min(...record.before.map(p => p.y)));
        const edgeX = record.slot.endsWith('left') ? Math.min(...top.map(p => p.x)) : Math.max(...top.map(p => p.x));
        assert.equal(removed[0].x, edgeX, 'peel from the selected side of the top surface');
      }
    }
    assert.equal(Math.min(...snapshots.map(r => r.count)), 16);
    assert.equal(Math.max(...snapshots.map(r => r.count)), 72);
  });

  await t.test('UI arrivals, direction changes and cancellation preserve the population contract', async () => {
    await solid.click();
    const count = () => page.locator('#phase-solid-overview').getAttribute('data-particle-count').then(Number);
    await page.locator('#phase-overview-top-left').click();
    await page.waitForTimeout(300);
    assert.equal(await count(), 48, 'incoming particles are not added before arriving');
    await page.waitForFunction(() => Number(document.querySelector('#phase-solid-overview').dataset.particleCount) >= 54, null, { timeout: 9000 });
    const grown = await count();
    await page.locator('#phase-overview-bottom-left').click();
    const receding = await count();
    assert.ok(receding > 48 && receding <= grown, 'switching to melting preserves existing growth');
    await page.locator('#phase-overview-bottom-right').click();
    assert.ok(await count() > 48, 'switching to sublimation does not reset the solid');
    if (process.env.SOLID_OVERVIEW_CAPTURE_DIR) {
      await fs.mkdir(process.env.SOLID_OVERVIEW_CAPTURE_DIR, { recursive: true });
      await page.locator('#phase-solid-overview').screenshot({ path: path.join(process.env.SOLID_OVERVIEW_CAPTURE_DIR, 'surface.png') });
    }
    await page.locator('#phase-overview-bottom-right').click();
    assert.equal(await count(), 48);
    await page.waitForTimeout(3500);
    assert.equal(await count(), 48, 'cancelled arrivals cannot change the reset solid');
    assert.equal(await page.locator('#phase-solid-flow-particles > g').count(), 0);
    assert.deepEqual(errors, []);
  });
});
