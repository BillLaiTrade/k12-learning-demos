const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs/promises');
const { chromium } = require('playwright');

test('3.2 failed night pictures reload without replacing the challenge or starting stale observations', { timeout: 120000 }, async t => {
  let url = process.env.PICTURE_RETRY_URL;
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
    url = `http://127.0.0.1:${port}/units/3/parts/3.2/#unit-quiz`;
  }
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    ...(process.env.PICTURE_RETRY_URL ? { proxy: { server: process.env.HTTPS_PROXY || process.env.HTTP_PROXY } } : {})
  });
  const networks = [];
  t.after(async () => { networks.forEach(network => network.release()); await browser.close(); });
  const out = process.env.PICTURE_RETRY_ARTIFACT_DIR || '/tmp/unit32-picture-retry';
  await fs.mkdir(out, { recursive: true });
  const records = [];
  async function fault(page, pattern) {
    const network = {
      allowed: false, hold: false, requests: 0, waiters: [],
      release() { this.hold = false; this.waiters.splice(0).forEach(resolve => resolve()); }
    };
    networks.push(network);
    await page.route(pattern, async route => {
      network.requests++;
      if (!network.allowed) return route.abort('failed');
      if (network.hold) await new Promise(resolve => network.waiters.push(resolve));
      await route.continue();
    });
    return network;
  }
  async function open(options = {}) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, ...options });
    page.setDefaultTimeout(10000);
    await page.addInitScript(() => {
      Math.random = () => .25;
      window.fireworkStarts = 0;
      const create = AudioContext.prototype.createBufferSource;
      AudioContext.prototype.createBufferSource = function (...args) {
        const source = create.apply(this, args), start = source.start.bind(source);
        source.start = function (...args) {
          if (source.buffer?.duration > 3.19 && source.buffer.duration < 3.21) window.fireworkStarts++;
          return start(...args);
        };
        return source;
      };
    });
    return page;
  }
  async function visit(page) {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.locator('#unit-quiz[data-state="ready"]').waitFor({ state: 'attached' });
  }
  async function failedPicture(page) {
    await page.waitForFunction(() => {
      const image = document.querySelector('.fireworks-scene > img');
      return image.complete && image.naturalWidth === 0;
    });
    await page.locator('#fireworks-observe').click();
    await page.waitForFunction(() => document.querySelector('#fireworks-status').dataset.error === 'true');
    assert.match(await page.locator('#fireworks-status').textContent(), /^夜景圖暫時無法載入/);
    assert.equal(await page.locator('#unit-quiz').getAttribute('data-state'), 'ready');
    assert.equal(await page.locator('#fireworks-check').isDisabled(), true);
    assert.equal(await page.evaluate(() => window.fireworkStarts), 0);
  }
  async function loadedPicture(page) {
    await page.waitForFunction(() => {
      const image = document.querySelector('.fireworks-scene > img');
      return image.complete && image.naturalWidth > 0;
    });
  }
  const complete = page => page.waitForFunction(() => document.querySelector('#unit-quiz').dataset.state === 'complete');

  await t.test('repeated failures issue fresh picture requests, then recover the same question without reloading a healthy picture', async () => {
    const p = await open(), network = await fault(p, '**/fireworks-night.webp*');
    await visit(p); await failedPicture(p);
    const first = network.requests;
    assert.ok(await p.locator('#fireworks-status').evaluate(node => node.clientWidth > 1));
    await p.locator('#unit-quiz').screenshot({ path: path.join(out, 'picture-failed-1440.png') });
    await p.locator('#fireworks-observe').click();
    await p.waitForFunction(() => document.querySelector('#fireworks-status').dataset.error === 'true');
    assert.ok(network.requests > first);
    assert.equal(await p.locator('#fireworks-timer').textContent(), '—');
    network.allowed = true; network.hold = true;
    const retry = p.waitForRequest('**/fireworks-night.webp*');
    await p.locator('#fireworks-observe').click(); await retry;
    assert.equal(await p.locator('#unit-quiz').getAttribute('data-state'), 'preparing');
    assert.equal(await p.locator('#fireworks-observe').isDisabled(), true);
    assert.equal(await p.evaluate(() => window.fireworkStarts), 0);
    network.release(); await complete(p); await loadedPicture(p);
    assert.equal(await p.locator('#unit-quiz').getAttribute('data-temperature'), '10');
    assert.equal(await p.locator('#unit-quiz').getAttribute('data-delay'), '3.00');
    assert.equal(await p.locator('#fireworks-status').getAttribute('data-error'), null);
    assert.equal(await p.evaluate(() => window.fireworkStarts), 1);
    const healthyRequests = network.requests;
    await p.locator('#fireworks-observe').click();
    await p.waitForFunction(() => document.querySelector('#unit-quiz').dataset.state === 'observing');
    assert.equal(network.requests, healthyRequests);
    records.push({ case: 'same-question-retry', pictureRequests: network.requests, temperature: 10, delay: '3.00' });
    await p.locator('#fireworks-new').click(); await p.close();
  });

  await t.test('leaving while the retry is loading prevents any late sound or observation', async () => {
    const p = await open(), network = await fault(p, '**/fireworks-night.webp*');
    await visit(p); await failedPicture(p);
    network.allowed = true; network.hold = true;
    const retry = p.waitForRequest('**/fireworks-night.webp*');
    await p.locator('#fireworks-observe').click(); await retry;
    await p.locator('.route a[href="#card-05"]').click();
    network.release(); await loadedPicture(p); await p.waitForTimeout(150);
    assert.equal(await p.locator('#unit-quiz').getAttribute('data-state'), 'ready');
    assert.equal(await p.locator('#fireworks-timer').textContent(), '—');
    assert.equal(await p.evaluate(() => window.fireworkStarts), 0);
    await p.locator('.route a[href="#unit-quiz"]').click();
    await p.locator('#fireworks-observe').click(); await complete(p);
    assert.equal(await p.locator('#unit-quiz').getAttribute('data-delay'), '3.00');
    records.push({ case: 'leave-cancels-pending', lateStarts: 0, recoveredDelay: '3.00' });
    await p.close();
  });

  await t.test('changing the challenge during retry cannot start the old question or schedule twice', async () => {
    const p = await open(), network = await fault(p, '**/fireworks-night.webp*');
    await visit(p); await failedPicture(p);
    network.allowed = true; network.hold = true;
    const retry = p.waitForRequest('**/fireworks-night.webp*');
    await p.locator('#fireworks-observe').click(); await retry;
    await p.locator('#fireworks-new').click();
    await p.locator('#fireworks-observe').click();
    network.release(); await complete(p);
    assert.equal(await p.locator('#unit-quiz').getAttribute('data-delay'), '3.01');
    assert.equal(await p.evaluate(() => window.fireworkStarts), 1);
    records.push({ case: 'new-question-during-retry', starts: 1, delay: '3.01' });
    await p.close();
  });

  await t.test('390px touch and keyboard retry only failed audio while keeping a healthy picture', async () => {
    const p = await open({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: 'reduce' });
    let pictures = 0; p.on('request', request => { if (request.url().includes('fireworks-night.webp')) pictures++; });
    const network = await fault(p, '**/firework-burst.wav*');
    await visit(p); await loadedPicture(p);
    await p.locator('#fireworks-observe').tap();
    await p.waitForFunction(() => document.querySelector('#fireworks-status').dataset.error === 'true');
    assert.match(await p.locator('#fireworks-status').textContent(), /^煙火音效暫時無法載入/);
    const before = pictures;
    network.allowed = true;
    await p.locator('#fireworks-observe').focus(); await p.keyboard.press('Space'); await complete(p);
    assert.equal(pictures, before);
    assert.equal(await p.locator('#unit-quiz').getAttribute('data-delay'), '3.00');
    assert.equal(await p.locator('#unit-quiz').getAttribute('data-temperature'), '10');
    assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await p.locator('#unit-quiz').screenshot({ path: path.join(out, 'recovered-390.png') });
    records.push({ case: 'audio-only-mobile', pictureRequests: pictures, audioRequests: network.requests, delay: '3.00' });
    await p.close();
  });

  await t.test('390px touch picture failures recover from the keyboard without changing the question', async () => {
    const p = await open({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: 'reduce' });
    const network = await fault(p, '**/fireworks-night.webp*');
    await visit(p);
    await p.waitForFunction(() => {
      const image = document.querySelector('.fireworks-scene > img');
      return image.complete && image.naturalWidth === 0;
    });
    await p.locator('#fireworks-observe').tap();
    await p.waitForFunction(() => document.querySelector('#fireworks-status').dataset.error === 'true');
    assert.match(await p.locator('#fireworks-status').textContent(), /^夜景圖暫時無法載入/);
    const before = network.requests;
    network.allowed = true;
    await p.locator('#fireworks-observe').focus(); await p.keyboard.press('Enter'); await complete(p);
    assert.ok(network.requests > before);
    await loadedPicture(p);
    assert.equal(await p.locator('#unit-quiz').getAttribute('data-temperature'), '10');
    assert.equal(await p.locator('#unit-quiz').getAttribute('data-delay'), '3.00');
    assert.equal(await p.evaluate(() => window.fireworkStarts), 1);
    assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await p.locator('#unit-quiz').screenshot({ path: path.join(out, 'picture-recovered-390.png') });
    records.push({ case: 'picture-mobile-keyboard', pictureRequests: network.requests, delay: '3.00' });
    await p.close();
  });
  await fs.writeFile(path.join(out, 'retry-observations.json'), JSON.stringify(records, null, 2));
});
