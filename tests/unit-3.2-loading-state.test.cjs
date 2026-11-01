const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const { chromium } = require('playwright');

test('3.2 comparison controls stay unavailable until each activity is ready', { timeout: 90000 }, async t => {
  let site = process.env.LOADING_STATE_SITE_URL;
  if (!site) {
    const server = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], {
      cwd: path.resolve(__dirname, '..'), stdio: ['ignore', 'pipe', 'ignore']
    });
    t.after(() => server.kill());
    const port = await new Promise((resolve, reject) => {
      let output = '';
      const timeout = setTimeout(() => reject(Error('server timeout')), 5000);
      server.stdout.on('data', bytes => {
        output += bytes;
        const match = output.match(/port (\d+)/);
        if (match) { clearTimeout(timeout); resolve(match[1]); }
      });
      server.once('error', reject);
    });
    site = `http://127.0.0.1:${port}/`;
  }
  const urls = ['units/3/parts/3.2/', 'previews/unit-3.2-card04/'].map(p => new URL(p, site).href);
  const artifacts = process.env.LOADING_STATE_ARTIFACT_DIR || '/tmp/unit32-loading-state';
  fs.mkdirSync(artifacts, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    ...(site.startsWith('https:') ? { proxy: { server: process.env.HTTPS_PROXY || process.env.HTTP_PROXY } } : {}) });
  t.after(() => browser.close());
  const observations = [];
  t.after(() => fs.writeFileSync(path.join(artifacts, 'observations.json'), JSON.stringify(observations, null, 2) + '\n'));
  const open = async options => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, ...options });
    t.after(() => page.close());
    return page;
  };
  const roots = page => page.locator('[data-sound-speed-lab]');
  const snapshot = page => roots(page).evaluateAll(nodes => nodes.map(root => {
    const panel = root.querySelector('[id$="experiment-panel"]');
    const fallback = root.querySelector('[data-sound-speed-fallback]');
    return { mode: root.dataset.soundSpeedMode, state: root.dataset.soundSpeedState || 'loading',
      hint: fallback.textContent, hidden: fallback.hidden, inert: panel.inert,
      busy: panel.getAttribute('aria-busy'), rows: root.querySelectorAll('.medium-row').length,
      disabled: [...panel.querySelectorAll('.controls button')].map(button => button.disabled) };
  }));
  const unavailable = async (page, label) => {
    const state = await snapshot(page); observations.push({ label, url: page.url(), state });
    assert.equal(state.length, 2);
    for (const row of state) {
      assert.match(row.hint, /互動功能.*載入.*重新整理/);
      assert.equal(row.hidden, false); assert.equal(row.inert, true);
      assert.equal(row.busy, 'true'); assert.deepEqual(row.disabled, [true, true, true]);
    }
    for (const root of await roots(page).all()) assert.equal(await root.locator('[data-sound-speed-fallback]').isVisible(), true);
  };
  const ready = async page => {
    await page.waitForFunction(() => [...document.querySelectorAll('[data-sound-speed-lab]')].length === 2
      && [...document.querySelectorAll('[data-sound-speed-lab]')].every(root => root.dataset.soundSpeedState === 'ready'));
    const state = await snapshot(page); observations.push({ label: 'ready', url: page.url(), state });
    assert.deepEqual(state.map(row => row.rows), [3, 2]);
    for (const row of state) {
      assert.equal(row.hidden, true); assert.equal(row.inert, false); assert.equal(row.busy, null);
      assert.deepEqual(row.disabled, [false, false, false]);
    }
  };
  const operate = async (page, touch = false) => {
    for (const root of await roots(page).all()) {
      const action = root.locator('.controls .action'), reset = root.locator('.controls button').last();
      if (touch) await action.tap();
      else { await action.focus(); await action.press('Enter'); }
      await root.locator('[id$="experiment-panel"][data-phase="running"]').waitFor();
      await action.press('Space');
      assert.equal(await root.locator('[id$="experiment-panel"]').getAttribute('data-phase'), 'paused');
      await reset.click();
      assert.equal(await root.locator('[id$="experiment-panel"]').getAttribute('data-phase'), 'idle');
    }
  };

  await t.test('without JavaScript, both entry pages explain unavailable controls and retain readable lessons', async () => {
    for (const [index, url] of urls.entries()) {
      const page = await open({ javaScriptEnabled: false, viewport: { width: index ? 390 : 1440, height: 844 } });
      await page.goto(url + '#card-04', { waitUntil: 'networkidle' });
      await unavailable(page, 'no-javascript');
      assert.deepEqual((await snapshot(page)).map(row => row.rows), [0, 0]);
      assert.equal(await page.locator('#grandpa-line').isVisible(), true);
      assert.equal(await page.locator('#temp-grandpa-line').isVisible(), true);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
      await page.locator(index ? '#card-05' : '#card-04').screenshot({ path: path.join(artifacts, `no-js-${index ? 390 : 1440}.png`) });
      await page.close();
    }
  });

  await t.test('a slow controller keeps controls disabled until the complete comparison is built', async () => {
    const page = await open();
    let release, requested;
    const gate = new Promise(resolve => { release = resolve; });
    const entered = new Promise(resolve => { requested = resolve; });
    t.after(() => release());
    await page.route('**/assets/sound-speed.mjs?*', async route => { requested(); await gate; await route.continue(); });
    await page.goto(urls[0] + '#card-04', { waitUntil: 'commit' });
    await entered;
    await page.locator('[data-sound-speed-fallback]').first().waitFor();
    await unavailable(page, 'delayed-controller');
    release(); await ready(page); await operate(page);
    await page.close();
  });

  await t.test('blocked controllers retain hints on both entry pages and recover after reload', async () => {
    for (const url of urls) {
      const page = await open({ viewport: { width: 390, height: 844 } });
      await page.route('**/assets/sound-speed.mjs?*', route => route.abort());
      await page.goto(url + '#card-04', { waitUntil: 'networkidle' });
      await unavailable(page, 'blocked-controller');
      await page.locator('#card-04').screenshot({ path: path.join(artifacts, url === urls[0] ? 'blocked-formal-390.png' : 'blocked-preview-390.png') });
      await page.unroute('**/assets/sound-speed.mjs?*');
      await page.reload({ waitUntil: 'networkidle' }); await ready(page); await operate(page);
      await page.close();
    }
  });

  await t.test('an unavailable imported dependency also leaves both activities unavailable', async () => {
    const page = await open();
    await page.route('**/sound-speed-rendering.mjs?*', route => route.abort());
    await page.goto(urls[0] + '#card-04', { waitUntil: 'networkidle' });
    await unavailable(page, 'blocked-dependency');
    assert.deepEqual((await snapshot(page)).map(row => row.rows), [0, 0]);
    await page.close();
  });

  await t.test('a failed initialization keeps that panel inert while the other activity remains usable', async () => {
    const page = await open();
    await page.addInitScript(() => {
      const replace = Element.prototype.replaceChildren;
      Element.prototype.replaceChildren = function (...args) {
        if (this.id === 'models') throw Error('test initialization failure');
        return replace.apply(this, args);
      };
    });
    await page.goto(urls[0] + '#card-04', { waitUntil: 'networkidle' });
    const state = await snapshot(page); observations.push({ label: 'one-initialization-failed', state });
    assert.equal(state[0].state, 'failed'); assert.equal(state[0].inert, true);
    assert.equal(state[0].hidden, false); assert.match(state[0].hint, /未能載入/);
    assert.deepEqual(state[0].disabled, [true, true, true]);
    assert.equal(state[1].state, 'ready'); assert.equal(state[1].rows, 2);
    const action = roots(page).nth(1).locator('.controls .action'); await action.click();
    assert.equal(await page.locator('#temp-experiment-panel').getAttribute('data-phase'), 'running');
    await page.close();
  });

  await t.test('healthy 390px touch, keyboard and reduced-motion playback restores every control', async () => {
    for (const url of urls) {
      const page = await open({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: 'reduce' });
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      await page.goto(url + '#card-04', { waitUntil: 'networkidle' });
      await ready(page); await operate(page, true);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
      assert.deepEqual(errors, []);
      await page.locator('#card-04').screenshot({ path: path.join(artifacts, url === urls[0] ? 'ready-formal-390.png' : 'ready-preview-390.png') });
      await page.close();
    }
  });
});
