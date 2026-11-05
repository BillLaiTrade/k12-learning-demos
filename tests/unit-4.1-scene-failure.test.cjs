const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const {chromium} = require('playwright');

const root = path.resolve(__dirname, '..');
const capture = process.env.UNIT41_FAILURE_CAPTURE || '/tmp/unit41-scene-failure';
const message = '立體畫面未能載入，請重新整理頁面後再試。';
const scenes = {
  shadow: {file: 'shadow-3d.js', card: 'card-04', root: '#card-04 .lesson-body', canvas: '#shadow-3d-scene', notice: '#shadow-load-failure', status: '#shadow-scene-status', observation: '#shadow-xiaokui-observation', hint: '#shadow-view-hint'},
  size: {file: 'shadow-size-3d.js', card: 'card-05', root: '#card-05 .visual', canvas: '#shadow-size-3d-scene', notice: '#shadow-size-load-failure', status: '#shadow-size-scene-status', observation: '#shadow-size-xiaokui-observation', hint: '#shadow-size-feedback'}
};

test('4.1 第四、五區載入失敗與正常操作', {timeout: 240000}, async t => {
  await fs.mkdir(capture, {recursive: true});
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
  t.after(() => browser.close());
  const records = [];
  t.after(() => fs.writeFile(path.join(capture, 'results.json'), JSON.stringify(records, null, 2) + '\n'));

  async function open({width = 1366, active, blocked = [], noWebGL = false, existing = false} = {}) {
    const context = await browser.newContext({viewport: {width, height: 1000}, hasTouch: width < 500, isMobile: width < 500});
    const page = await context.newPage(), errors = [], requests = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(noWebGL => {
      document.addEventListener('DOMContentLoaded', () => {
        const style = document.createElement('style');
        style.textContent = 'html{scroll-behavior:auto!important}';
        document.head.append(style);
      });
      if (noWebGL) {
        const getContext = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function(type, ...args) { return /webgl/i.test(type) ? null : getContext.call(this, type, ...args); };
      }
    }, noWebGL);
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.hostname !== 'k12.test') return route.abort();
      const name = decodeURIComponent(url.pathname), base = path.basename(name);
      if (route.request().resourceType() === 'image') return route.fulfill({contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jR1cAAAAASUVORK5CYII=','base64')});
      const file = path.join(root, name.endsWith('/') ? name + 'index.html' : name);
      if (route.request().resourceType() === 'script') {
        requests.push(base);
        if (blocked.includes(base)) return route.abort('failed');
        const enabled = ['scene-loader.js','light-speed-timer.js',...Object.values(scenes).filter(s => noWebGL || s.file === scenes[active]?.file).map(s => s.file)];
        if (existing) enabled.push('aperture-3d.js', 'shadow-theatre.js');
        if (!enabled.includes(base) && !name.includes('/vendor/') && !base.endsWith('optics.mjs')) return route.fulfill({contentType:'text/javascript', body:''});
        let body = await fs.readFile(file, 'utf8');
        // Test-only observation; product files do not expose internal scene objects.
        if (base === 'shadow-3d.js') body = body.replace('    const updateObservationForPosition = () => {', '    window.__sceneTest={blocker,sphere,camera}; const updateObservationForPosition = () => {');
        if (base === 'shadow-size-3d.js') body = body.replace('    updateReadout(minPosition);', '    updateReadout(minPosition); window.__sceneTest={blocker,sphere,camera,zFromPosition};');
        return route.fulfill({contentType:'text/javascript', body});
      }
      return route.fulfill({path:file});
    });
    await page.goto('https://k12.test/units/4/parts/4.1/#' + (scenes[active]?.card || 'card-04'), {waitUntil:'load'});
    return {page, context, errors, requests};
  }

  async function unavailable(page, kind) {
    const s = scenes[kind];
    await page.waitForFunction(selector => !document.querySelector(selector).hidden, s.notice);
    const actual = await page.evaluate(s => {
      const root = document.querySelector(s.root), canvas = document.querySelector(s.canvas), notice = document.querySelector(s.notice);
      return {failed: root.dataset.sceneFailed, disabled: [...root.querySelectorAll('button,input')].every(n => n.disabled), message: notice.textContent, role: notice.getAttribute('role'), canvasDisabled: canvas.getAttribute('aria-disabled'), tabIndex:canvas.tabIndex, describedBy:canvas.getAttribute('aria-describedby'), status:document.querySelector(s.status).textContent, observation:document.querySelector(s.observation).textContent, hint:document.querySelector(s.hint).textContent};
    }, s);
    assert.equal(actual.failed, 'true'); assert.equal(actual.disabled, true);
    assert.equal(actual.message, message); assert.equal(actual.role, 'alert');
    assert.equal(actual.canvasDisabled, 'true'); assert.equal(actual.tabIndex, -1);
    assert.equal(actual.describedBy, s.notice.slice(1)); assert.equal(actual.status, message);
    assert.match(actual.observation, /無法/); assert.match(actual.hint, /無法操作/);
    if (kind === 'shadow') {
      assert.equal(await page.locator('#shadow-toggle-label').innerText(), '無法操作');
      assert.equal(await page.locator('#shadow-grandpa-explanation').innerText(), '請重新整理頁面後再試。');
    }
    return actual;
  }

  await t.test('WebGL無法啟動：兩區及原第三區／小測均顯示失敗，其他導覽可用', async () => {
    const f = await open({noWebGL:true, existing:true});
    try {
      const states = [await unavailable(f.page, 'shadow'), await unavailable(f.page, 'size')];
      await f.page.waitForFunction(() => !document.querySelector('#aperture-load-failure').hidden);
      assert.equal(await f.page.locator('#aperture-operation-hint').innerText(), '立體畫面暫時無法操作，請重新整理頁面後再試。');
      await f.page.locator('.booklet-route-link').click();
      await f.page.waitForFunction(() => !document.querySelector('#shadow-theatre-load-failure').hidden);
      assert.equal(await f.page.locator('#shadow-theatre-view-hint').innerText(), '立體畫面暫時無法操作，請重新整理頁面後再試。');
      await f.page.waitForFunction(() => document.querySelector('#progress-copy').textContent === '目前位於單元小測');
      assert.equal(await f.page.locator('#light-speed-tap').isEnabled(), true);
      assert.deepEqual(f.errors, []);
      records.push({case:'no WebGL', states});
    } finally { await f.context.close(); }
  });

  await t.test('兩個模組下載失敗：320px保留版面並停用操作', async () => {
    const f = await open({width:320, blocked:Object.values(scenes).map(s => s.file)});
    try {
      for (const kind of Object.keys(scenes)) {
        await unavailable(f.page, kind);
        await f.page.locator('#'+scenes[kind].card).evaluate(n => n.scrollIntoView({block:'start', behavior:'instant'}));
        const box = await f.page.locator(scenes[kind].notice).boundingBox();
        assert.ok(box.width > 100 && box.x >= 0 && box.x + box.width <= 321);
        await f.page.locator(scenes[kind].notice).screenshot({path:path.join(capture, `320-${kind}-unavailable.png`)});
      }
      assert.equal(await f.page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.deepEqual(f.errors, []);
      records.push({case:'module download failures', width:320});
    } finally { await f.context.close(); }
  });

  for (const [kind, width] of [['shadow',1366],['size',390]]) {
    await t.test(`${kind}正常操作、另一區下載失敗及執行中WebGL中斷`, async () => {
      const other = kind === 'shadow' ? 'size' : 'shadow', s = scenes[kind];
      const f = await open({width, active:kind, blocked:[scenes[other].file]});
      const p = f.page;
      try {
        await unavailable(p, other);
        await p.waitForFunction(() => !!window.__sceneTest, null, {timeout:45000});
        assert.equal(await p.locator(s.notice).isHidden(), true);
        await p.waitForFunction(selector => document.querySelector(selector).dataset.sceneState === 'ready', s.root);
        assert.notEqual(await p.locator(s.canvas).getAttribute('aria-disabled'), 'true');
        assert.equal(await p.locator('[id$="-view-reset"]').count(), 0);
        assert.equal(f.requests.filter(n => n === s.file).length, 1);
        await p.locator(s.canvas).evaluate(n => n.scrollIntoView({block:'center', behavior:'instant'}));
        if (kind === 'shadow') {
          await p.locator('#shadow-block-toggle').click();
          await p.waitForFunction(() => document.querySelector('#shadow-scene-status').textContent === '球體擋住部分光，屏幕相應位置形成影子。');
          assert.equal(await p.evaluate(() => window.__sceneTest.blocker.position.x), 0);
          await p.locator('#shadow-block-toggle').click();
          await p.waitForFunction(() => document.querySelector('#shadow-scene-status').textContent === '球體停在光路旁，屏幕均勻受光。');
          assert.equal(await p.evaluate(() => window.__sceneTest.blocker.position.x), 2.38);
        } else {
          const points = await p.evaluate(() => {
            const a = window.__sceneTest, r = document.querySelector('#shadow-size-3d-scene').getBoundingClientRect();
            a.camera.updateMatrixWorld(true);
            const start = a.sphere.getWorldPosition(a.sphere.position.clone()), end = start.clone(); end.z = a.zFromPosition(80);
            const pixel = v => {v.project(a.camera);return {x:r.left+(v.x+1)*r.width/2,y:r.top+(1-v.y)*r.height/2};};
            return {start:pixel(start), end:pixel(end)};
          });
          const cdp = await f.context.newCDPSession(p);
          await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...points.start,id:1}]});
          for (let i=1;i<=4;i++) await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:points.start.x+(points.end.x-points.start.x)*i/4,y:points.start.y+(points.end.y-points.start.y)*i/4,id:1}]});
          await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
          assert.ok(Math.abs(await p.evaluate(() => window.__sceneTest.blocker.position.z) - 1.916) < .03);
          assert.equal(await p.locator(s.observation).innerText(), '球目前靠近屏幕，屏幕上的影子較小。');
        }
        const position = await p.evaluate(() => window.__sceneTest.blocker.position.toArray());
        const originalCamera = await p.evaluate(() => window.__sceneTest.camera.position.toArray());
        const box = await p.locator(s.canvas).boundingBox();
        await p.mouse.move(box.x + 25, box.y + 25); await p.mouse.down();
        await p.mouse.move(box.x + 65, box.y + 45, {steps:4}); await p.mouse.up();
        const orbitedCamera = await p.evaluate(() => window.__sceneTest.camera.position.toArray());
        assert.notDeepEqual(orbitedCamera, originalCamera);
        await p.locator(s.canvas).dispatchEvent('wheel', {deltaY:100, bubbles:true});
        assert.notDeepEqual(await p.evaluate(() => window.__sceneTest.camera.position.toArray()), orbitedCamera);
        assert.deepEqual(await p.evaluate(() => window.__sceneTest.blocker.position.toArray()), position);
        // Interrupt an active animation to ensure it cannot overwrite failure copy later.
        if (kind === 'shadow') await p.locator('#shadow-block-toggle').click();
        const focusSelector = kind === 'shadow' ? '#shadow-block-toggle' : '#moonlight-toggle';
        await p.locator(focusSelector).focus();
        const scrollBefore = await p.evaluate(() => scrollY);
        await p.locator(s.canvas).dispatchEvent('webglcontextlost', {bubbles:false, cancelable:true});
        const failed = await unavailable(p, kind);
        assert.equal(await p.evaluate(() => document.activeElement.id), kind === 'shadow' ? s.notice.slice(1) : 'moonlight-toggle');
        assert.ok(Math.abs(await p.evaluate(() => scrollY) - scrollBefore) < 2);
        const before = await p.evaluate(() => ({position:window.__sceneTest.blocker.position.toArray(), camera:window.__sceneTest.camera.position.toArray()}));
        await p.locator(s.canvas).dispatchEvent('pointerdown', {pointerId:1, clientX:100, clientY:100, bubbles:true});
        await p.locator(s.canvas).dispatchEvent('pointermove', {pointerId:1, clientX:200, clientY:200, bubbles:true});
        await p.locator(s.canvas).dispatchEvent('wheel', {deltaY:100, bubbles:true});
        await p.waitForTimeout(1200);
        assert.deepEqual(await p.evaluate(() => ({position:window.__sceneTest.blocker.position.toArray(), camera:window.__sceneTest.camera.position.toArray()})), before);
        assert.deepEqual(await unavailable(p, kind), failed);
        await p.locator('#light-speed-tap').focus();
        await p.locator(s.canvas).dispatchEvent('webglcontextlost', {bubbles:false, cancelable:true});
        assert.equal(await p.evaluate(() => document.activeElement.id), 'light-speed-tap');
        assert.equal(await p.locator('#aperture-reset').isEnabled(), true);
        assert.equal(await p.locator('#shadow-theatre-reset').isEnabled(), true);
        assert.deepEqual(f.errors, []);
        records.push({case:kind, width, healthyPosition:position, unavailable:failed, stateAfterLoss:before});
      } finally { await f.context.close(); }
    });
  }
});
