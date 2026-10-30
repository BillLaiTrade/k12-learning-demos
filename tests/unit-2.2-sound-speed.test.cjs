const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const model = import(pathToFileURL(path.resolve(__dirname, '../units/3/parts/3.2/assets/sound-speed-model.mjs')).href);

test('sound comparison uses one signal and physical travel delays', async t => {
  const m = await model;
  await t.test('the same distance produces the material arrival times and ranking', () => {
    const groups = m.conditions('material');
    assert.deepEqual(groups.map(g => g.speed), [343, 1480, 5900]);
    assert.deepEqual(groups.map(g => (5000 / g.speed).toFixed(3)), ['14.577', '3.378', '0.847']);
    assert.deepEqual(m.winners(groups), ['steel']);
  });
  await t.test('five kilometres and clamped travel positions use actual speed and elapsed seconds', () => {
    assert.equal(m.DISTANCE, 5000);
    assert.ok(Math.abs(m.reachedDistance(343,.3) - 102.9) < 1e-10);
    assert.equal(m.reachedDistance(1480,.3), 444);
    assert.equal(m.reachedDistance(5900,.3), 1770);
    assert.equal(m.reachedDistance(343,-1), 0);
    assert.equal(m.reachedDistance(343,100), 5000);
    assert.equal(m.reachedDistance(343,0), 0);
  });
  await t.test('temperature comparison is fixed at 0°C and 80°C with square-root air speeds', () => {
    assert.equal(m.airSpeed(20),343);
    const pair=m.conditions('temperature');
    assert.deepEqual(pair.map(g=>g.temperature),[0,80]);
    assert.deepEqual(pair.map(g=>g.id),['cold','hot']);
    for(const group of pair)assert.ok(Math.abs(group.speed-343*Math.sqrt((group.temperature+273.15)/293.15))<1e-10);
    assert.deepEqual(m.winners(pair),['hot']);
    assert.deepEqual(pair.map(g=>m.arrivalTime(g.speed).toFixed(3)),['15.102','13.281']);
    assert.equal((m.arrivalTime(pair[0].speed)-m.arrivalTime(pair[1].speed)).toFixed(3),'1.820');
  });
  await t.test('every medium uses the same frequency, bounded local motion and exact rest', () => {
    for (const speed of [331, 343, 349, 1480, 5900]) {
      const point = { x: 200, y: 70, distance: 40 };
      assert.equal(m.sample(point, speed, 40 / speed - .0001).x, point.x);
      for (const age of [.007, .021, .047, .095]) {
        const sampled = m.sample(point, speed, 40 / speed + age);
        assert.ok(Math.abs(sampled.x - point.x - m.displacement(age)) < 1e-10);
        assert.equal(sampled.y, point.y);
      }
      assert.equal(m.sample(point, speed, 40 / speed + m.PULSE_DURATION + .01).x, point.x);
    }
    const values = Array.from({ length: 1601 }, (_, i) => m.displacement(i / 1600 * m.PULSE_DURATION));
    assert.ok(Math.max(...values) > m.AMPLITUDE * .7 && Math.min(...values) < -m.AMPLITUDE * .7);
    assert.ok(values.every(v => Math.abs(v) <= m.AMPLITUDE));
    assert.equal(m.displacement(-.1), 0); assert.equal(m.displacement(m.PULSE_DURATION), 0);
  });
  await t.test('each neighbour receives a delayed copy of the preceding vibration and never starts first', () => {
    for (const group of m.conditions('material')) {
      const row = m.positions(group.kind).filter(p => p.row === 0);
      for (let i = 1; i < row.length; i++) {
        const left = row[i-1], right = row[i], delay = (right.distance-left.distance)/group.speed;
        const onset = right.distance/group.speed;
        assert.equal(m.sample(right,group.speed,onset-.0001).x,right.x);
        assert.equal(m.sample(right,group.speed,onset-.0001).moving,false);
        for (const age of [.02,.1,.4,1.2,2.1]) {
          const t = onset+age;
          assert.ok(Math.abs((m.sample(right,group.speed,t).x-right.x)-(m.sample(left,group.speed,t-delay).x-left.x))<1e-10);
        }
        const between = left.distance/group.speed + delay/2;
        assert.equal(m.sample(left,group.speed,between).moving,true);
        assert.equal(m.sample(right,group.speed,between).moving,false);
      }
    }
    const maxAirGap = Math.max(...m.positions('air').filter(p=>p.row===0).slice(1).map((p,i)=>p.distance-m.positions('air')[i].distance));
    assert.ok(maxAirGap < 331 / (2*m.FREQUENCY), 'spatial samples resolve the wave even at the slowest selectable air speed');
  });

  await t.test('particles remain ordered, stay at fixed y and settle in every medium', () => {
    for (const group of m.conditions('material')) {
      const points = m.positions(group.kind), end = m.runEnd([group]);
      assert.equal(points[0].distance, 0); assert.equal(points.at(-1).distance, 5000);
      for (let step = 0; step <= 300; step++) {
        const time = end * step / 300;
        const samples = points.map(p => m.sample(p, group.speed, time));
        for (let i = 0; i < points.length; i++) {
          assert.equal(samples[i].y, points[i].y);
          assert.ok(Math.abs(samples[i].x - points[i].x) <= m.AMPLITUDE + 1e-8);
          if (i && points[i].row === points[i - 1].row) assert.ok(samples[i].x > samples[i - 1].x, 'no particles cross');
        }
      }
      assert.ok(points.every(p => m.sample(p, group.speed, end).x === p.x));
    }
  });
});

test('fork appearance uses rapid bounded translation without affecting the propagation signal', async () => {
  const {forkVibration}=await import(pathToFileURL(path.resolve(__dirname,'../units/3/parts/3.2/assets/sound-speed-rendering.mjs')).href);
  const values=Array.from({length:1001},(_,i)=>forkVibration(.251+i/1000));
  assert.ok(values.every(v=>Math.abs(v)<=1.5));
  const signs=values.map(Math.sign);assert.equal(signs.slice(1).filter((v,i)=>v!==signs[i]).length,16);
  for(const t of[-1,0,4,5])assert.equal(forkVibration(t),0);
  for(const t of[.15,.3,1.02])assert.ok(Math.abs(forkVibration(t+.0625)+forkVibration(t))<1e-10);
});

test('fourth learning block works within the complete lesson', { timeout: 180000 }, async t => {
  const server = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], {
    cwd: path.resolve(__dirname, '..'), stdio: ['ignore', 'pipe', 'pipe']
  });
  t.after(() => server.kill());
  const port = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('server startup timed out')), 5000);
    server.stdout.on('data', data => { const match = String(data).match(/port (\d+)/); if (match) { clearTimeout(timer); resolve(match[1]); } });
    server.once('error', reject);
  });
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', ...(process.env.SOUND_SPEED_LESSON_URL ? {proxy:{server:process.env.HTTPS_PROXY||process.env.HTTP_PROXY}} : {}) });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1440, height: 1500 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  // Native media preload can cancel after enough data arrives; HTTP errors and
  // failed fetch/decode/playback are still checked independently.
  page.on('requestfailed', request => {
    if (request.resourceType() === 'media' && request.failure()?.errorText === 'net::ERR_ABORTED') return;
    errors.push({url:request.url(),type:request.resourceType(),reason:request.failure()?.errorText});
  });
  page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
  await page.addInitScript(() => {
    const Original = window.AudioContext;
    window.__oscillators = [];
    window.AudioContext = class extends Original {
      constructor(...args) { super(...args); window.__audioContext = this; }
      createOscillator() {
        const node = super.createOscillator(); window.__oscillators.push(node);
        const start = node.start.bind(node); node.start = (...args) => { node.__started = true; start(...args); };
        node.addEventListener('ended', () => { node.__ended = true; });
        return node;
      }
    };
  });
  await page.clock.install({ time: new Date('2026-10-28T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-10-28T00:00:01Z'));
  const url = process.env.SOUND_SPEED_LESSON_URL || `http://127.0.0.1:${port}/units/3/parts/3.2/#card-04`;
  let freshSequence = 0;
  const fresh = () => {
    const target = new URL(url);
    target.searchParams.set('_testcase', String(++freshSequence));
    return page.goto(target.href, { waitUntil: 'networkidle' });
  };
  const data = () => page.locator('#card-04 [data-sound-speed-lab]').locator('#experiment-panel').evaluate(n => ({ ...n.dataset }));
  const time = async () => Number((await data()).time);
  const primary = page.locator('#card-04 [data-sound-speed-lab]').locator('#primary-action');
  const particleXs = () => page.locator('#card-04 [data-sound-speed-lab]').locator('.particle').evaluateAll(nodes => nodes.map(n => n.getAttribute('transform')));
  const temperatureLab=page.locator('#card-05');
  const temperatureData=()=>temperatureLab.locator('#temp-experiment-panel').evaluate(n=>({...n.dataset}));
  const temperaturePrimary=temperatureLab.locator('#temp-primary-action');
  const realWait = ms => new Promise(resolve => setTimeout(resolve, ms));

  await t.test('initial scene uses the official characters, no orange tracking particle and no autoplay', async () => {
    await fresh();
    assert.equal((await data()).phase, 'idle'); assert.equal(await time(), 0);
    assert.equal(await page.locator('#card-04 [data-sound-speed-lab]').locator('.medium-row').count(), 3);
    assert.equal((await data()).playbackRate, '1');
    assert.equal(await page.locator('#card-04 [data-sound-speed-lab]').locator('#slowdown, #step-action').count(), 0);
    assert.equal(await page.locator('#card-04 [data-sound-speed-lab]').locator('.particle').count(), 226);
    assert.equal(await page.locator('#card-04 [data-sound-speed-lab]').locator('[name=prediction], .prediction, #prediction-feedback').count(), 0);
    assert.equal(await page.locator('#card-04 [data-sound-speed-lab]').locator('#result').isHidden(), true);
    assert.equal(await page.evaluate(() => window.__audioContext), undefined);
    assert.equal(await page.locator('#card-04 [data-sound-speed-lab]').locator('.speaker').first().evaluate(n => getComputedStyle(n, '::before').backgroundImage.includes('/shared-assets/characters/dialogue-character-avatars.png')), true);
    assert.equal(await page.locator('#card-04 [data-sound-speed-lab]').locator('.particle').evaluateAll(nodes => nodes.every(n => Number(n.getAttribute('opacity')) === 1 && Math.abs(n.transform.baseVal.consolidate().matrix.e - Number(n.dataset.originX)) < .0001)), true);
    assert.equal(await page.locator('#card-04 [data-sound-speed-lab]').locator('.particle [stroke-dasharray], .field path[stroke="#be773a"]').count(), 0);
    const before = await particleXs(); await page.clock.runFor(1000); assert.deepEqual(await particleXs(), before);
  });

  await t.test('formal integration retains five learning blocks, navigation and working quiz controls', async () => {
    if (!url.includes('/units/3/parts/3.2/')) return;
    assert.equal(await page.locator('.lesson-card').count(), 5);
    assert.equal(await page.locator('#card-04 [data-sound-speed-lab]').count(), 1);
    assert.equal(await page.locator('#card-04 iframe, #card-05 iframe').count(), 0);
    assert.equal(await page.locator('#card-05 [data-sound-speed-lab]').count(),1);
    assert.equal(await page.locator('[role=tablist],#tab-material,#tab-temperature').count(),0);
    assert.equal(await page.locator('#card-04 input[type=range]').count(),0);
    assert.match(await page.locator('.route a[href="#card-05"]').textContent(),/05.*溫度/);
    assert.match(await page.locator('.route a[href="#card-04"]').textContent(),/04.*介質/);
    assert.equal(await page.locator('.route a[href="#card-04"]').count(), 1);
    assert.equal(await page.locator('#air-temperature, #temp-dot, #temperature-speed').count(), 0);
    const duplicates = await page.locator('[id]').evaluateAll(nodes => nodes.map(n => n.id).filter(id => document.querySelectorAll(`[id="${id}"]`).length !== 1));
    assert.deepEqual(duplicates, []);
    assert.equal(await page.locator('#quiz-title').textContent(), '煙火離你多遠？');
    assert.equal(await page.locator('#fireworks-observe').isEnabled(), true);
    assert.equal(await page.locator('#fireworks-check').isDisabled(), true);
    assert.equal(await page.locator('#unit-quiz .quiz-question, #quiz-check, #quiz-reset').count(), 0);
    await page.locator('.route a[href="#card-04"]').click(); assert.equal(new URL(page.url()).hash, '#card-04');
  });

  await t.test('material volumes and distinct molecules are embedded inside the animation', async () => {
    assert.equal(await page.locator('#card-04 [data-sound-speed-lab]').locator('.specimen-button, .specimen-photo, #material-dialog').count(), 0);
    assert.equal(await page.locator('#card-04 [data-sound-speed-lab]').locator('.field image').count(), 0);
    assert.equal(await page.evaluate(() => performance.getEntriesByType('resource').some(r => r.name.includes('material-specimens.png'))), false);
    assert.deepEqual(await page.locator('#card-04 [data-sound-speed-lab]').locator('.field .medium-scene').evaluateAll(nodes => nodes.map(n => n.dataset.material)), ['air','water','steel']);
    assert.equal(await page.locator('#card-04 [data-sound-speed-lab]').locator('[data-group=air] .liquid-volume, [data-group=air] .steel-shell').count(), 0);
    for (const cls of ['liquid-volume','liquid-surface','water-side','glass-front','liquid-reflection']) assert.equal(await page.locator('#card-04 [data-sound-speed-lab]').locator(`[data-group=water] .field .${cls}`).count(), 1);
    for (const cls of ['steel-shell','steel-top','steel-end','steel-cutaway']) assert.equal(await page.locator('#card-04 [data-sound-speed-lab]').locator(`[data-group=steel] .field .${cls}`).count(), 1);
    assert.equal(await page.locator('#card-04 [data-sound-speed-lab]').locator('.medium-interior > g .particle').count(), 226);
    assert.equal(await page.locator('#card-04 [data-sound-speed-lab]').locator('.end-particle, .zoom, .end-observation, .end-state, .end-connection').count(), 0);
    assert.equal(await page.locator('#card-04 [data-sound-speed-lab]').locator('[data-group=air] .particle[data-species=nitrogen]').first().locator('.atom').count(), 2);
    assert.equal(await page.locator('#card-04 [data-sound-speed-lab]').locator('[data-group=water] .particle').first().locator('.atom').count(), 3);
    assert.equal(await page.locator('#card-04 [data-sound-speed-lab]').locator('[data-group=steel] .particle').first().locator('.atom').count(), 1);
    const waterAngle = await page.locator('#card-04 [data-sound-speed-lab]').locator('[data-group=water] .particle').first().evaluate(group => {
      const h = [...group.querySelectorAll('[data-element=hydrogen]')].map(n => [Number(n.getAttribute('cx')), Number(n.getAttribute('cy'))]);
      return Math.acos((h[0][0] * h[1][0] + h[0][1] * h[1][1]) / Math.hypot(...h[0]) / Math.hypot(...h[1])) * 180 / Math.PI;
    });
    assert.ok(Math.abs(waterAngle - 104.5) < .0001);
    assert.ok(await page.locator('#card-04 [data-sound-speed-lab]').locator('[data-group=steel] .elastic-link').count() > 120);
    assert.equal(await page.locator('#card-04 [data-sound-speed-lab]').locator('.particle .atom').evaluateAll(nodes => nodes.every(n => n.getAttribute('fill').startsWith('url(#'))), true, 'visible atoms have material shading');
    assert.equal(await page.locator('#card-04 [data-sound-speed-lab]').locator('#experiment-panel').evaluate(n => /預測|先猜|對錯/.test(n.textContent)), false);
  });

  await t.test('one compact panel gives the embedded scenes the main space and shows only arrival times at the right', async () => {
    assert.equal(await page.locator('#card-04 [data-sound-speed-lab]').locator('.comparison-board').count(), 1);
    assert.equal(await page.locator('#card-04 .model-information, .realtime-badge, #model-time, #observation-caption').count(),0);
    assert.equal(await page.locator('#experiment-panel').evaluate(n=>n.firstElementChild.classList.contains('comparison-board')),true,'the model follows settings with no leftover explanation panel');
    const rows = await page.locator('#card-04 [data-sound-speed-lab]').locator('.medium-row').evaluateAll(nodes => nodes.map(row => {
      const box = selector => { const b = row.querySelector(selector).getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height, right: b.right, bottom: b.bottom }; };
      return { label: box('.medium-header'), field: box('.field'), end: box('.arrival-readout'), body: box('.row-body'), row: { y: row.getBoundingClientRect().y, bottom: row.getBoundingClientRect().bottom } };
    }));
    assert.ok(rows.at(-1).row.bottom-rows[0].row.y-rows.reduce((sum,row)=>sum+row.field.height,0)<100, 'full-width scenes retain compact spacing without a large blank area');
    for (const row of rows) {
      assert.ok(row.label.right < row.field.x, 'material label sits beside the model');
      assert.ok(row.field.width >= row.label.width * 4.5 && row.field.height >= 100, 'vibration is the main visual');
      assert.ok(Math.abs(row.field.right - row.end.x) < 1.1, 'arrival readout directly joins the field');
      assert.ok(Math.abs(row.end.bottom - row.body.bottom) < 1.1);
    }
    assert.equal(await page.locator('#card-04 [data-sound-speed-lab]').locator('.arrival-readout').count(), 3);
    assert.deepEqual(await page.locator('#card-04 .arrival-readout').evaluateAll(ns=>ns.map(n=>[...n.children].map(c=>c.tagName))),Array(3).fill(['SPAN','OUTPUT']));
    assert.deepEqual(await page.locator('#card-04 .arrival-readout span').allTextContents(),Array(3).fill('到達時間'));
    assert.equal(await page.locator('#card-04 .arrival-readout svg, .end-state, .end-connection').count(),0);
  });

  await t.test('vibration begins locally and steel reaches the end while water and air remain still there', async () => {
    await primary.click(); await page.clock.runFor(900);
    assert.ok(await time() > .88 && await time() < .92);
    const readings = await page.locator('#card-04 [data-sound-speed-lab]').locator('.arrival-readout output').allTextContents();
    assert.deepEqual(readings, ['—', '—', '0.847 秒']);
    for (const id of ['air', 'water']) assert.equal(await page.locator('#card-04 [data-sound-speed-lab]').locator(`[data-group=${id}] .particle[data-distance="5000"]`).evaluateAll(nodes => nodes.every(n => n.transform.baseVal.consolidate().matrix.e === Number(n.dataset.originX))), true);
    assert.ok(await page.locator('#card-04 [data-group=steel] .particle[data-distance="5000"]').first().evaluate(n=>Math.abs(n.transform.baseVal.consolidate().matrix.e-Number(n.dataset.originX))>.1));
    const reached = await page.locator('#card-04 [data-sound-speed-lab]').locator('.medium-row').evaluateAll(rows => rows.map(row => row.querySelectorAll('.particle[data-reached=true]').length / row.querySelectorAll('.particle').length));
    const m = await model, current = await time();
    assert.deepEqual(reached, m.conditions('material').map(g => { const points = m.positions(g.kind); return points.filter(p => p.distance <= g.speed * current).length / points.length; }));
    assert.ok(reached[0] < reached[1] && reached[1] < reached[2] && reached[2] === 1);
    assert.equal(await page.locator('#card-04 [data-sound-speed-lab]').locator('.model-information, .realtime-badge, #model-time, #observation-caption').count(),0);
    const { start, end, endpoints } = await page.locator('#card-04 [data-sound-speed-lab]').locator('[data-group=steel]').evaluate(row => {
      const link = row.querySelector('.elastic-link'), particles = row.querySelectorAll('.particle');
      return { start: link.getPointAtLength(0).x, end: link.getPointAtLength(link.getTotalLength()).x,
        endpoints: [Number(link.dataset.first), Number(link.dataset.second)].map(i => particles[i].transform.baseVal.consolidate().matrix.e) };
    });
    assert.ok(Math.abs(start - endpoints[0] - 3.8) < .002 && Math.abs(end - endpoints[1] + 3.8) < .002);

  });

  await t.test('distance markers, reached rails and readable metre values follow speed times time', async () => {
    const saved = await time(), m = await model;
    assert.ok(saved > .88 && saved < .92);
    const frontState = () => page.locator('#card-04 [data-sound-speed-lab]').locator('.medium-row').evaluateAll(rows => rows.map(row => ({
      distance: Number(row.dataset.reachedDistance), speed: Number(row.dataset.speed),
      x: row.querySelector('.propagation-front').transform.baseVal.consolidate().matrix.e,
      visibility: row.querySelector('.propagation-front').getAttribute('visibility'),
      rail: row.querySelector('.distance-reached').getAttribute('d'),
      text: row.querySelector('.propagation-readout output').textContent
    })));
    const rows = await frontState();
    assert.ok(rows[0].distance < rows[1].distance && rows[1].distance < rows[2].distance);
    for (const row of rows) {
      const distance = Math.min(5000, row.speed * saved), x = m.START_X + distance / 5000 * (m.END_X - m.START_X);
      assert.ok(Math.abs(row.distance - distance) < .00011);
      assert.ok(Math.abs(row.x - x) < .00011);
      assert.equal(row.rail, `M${m.START_X} 125H${x.toFixed(4)}`);
      assert.equal(row.visibility, 'visible');
      assert.match(row.text, new RegExp(Math.floor(distance + 1e-8).toLocaleString('en-US') + ' 公尺'));
    }
    assert.match(rows[2].text, /已到終點/);
  });

  await t.test('pause freezes all observations and resume keeps one second equal to one second', async () => {
    await primary.click(); const paused = await time(), snapshot = await particleXs();
    const markers = await page.locator('#card-04 [data-sound-speed-lab]').locator('.propagation-front, .distance-reached').evaluateAll(nodes => nodes.map(n => [n.getAttribute('transform'),n.getAttribute('d')]));
    await page.clock.runFor(2000); assert.equal(await time(), paused); assert.deepEqual(await particleXs(), snapshot);
    assert.deepEqual(await page.locator('#card-04 [data-sound-speed-lab]').locator('.propagation-front, .distance-reached').evaluateAll(nodes => nodes.map(n => [n.getAttribute('transform'),n.getAttribute('d')])), markers);
    assert.equal(await page.locator('#card-04 [data-sound-speed-lab]').locator('#slowdown, #step-action').count(), 0);
    await primary.click(); await page.clock.runFor(1000);
    assert.ok(Math.abs(await time() - paused - 1) < .02);
    const first = await time();
    await page.clock.fastForward(5000);
    assert.ok(Math.abs(await time() - first - 5) < .02, 'missed frames catch up to the monotonic elapsed time');
  });

  await t.test('individual source clicks and keyboard strikes keep independent clocks and do not start untouched groups', async () => {
    await fresh();
    const rowTime=kind=>page.locator(`#card-04 [data-group=${kind}]`).getAttribute('data-time').then(Number);
    const hit=kind=>page.locator(`#card-04 [data-group=${kind}] .source-hit`);
    await hit('water').click();await page.clock.runFor(1000);
    assert.ok(Math.abs(await rowTime('water')-1)<.02);
    assert.equal(await rowTime('air'),0);assert.equal(await rowTime('steel'),0);
    assert.equal(await page.locator('#card-04 .fork-striker[visibility=visible]').count(),0);
    assert.equal(await page.locator('#card-04 [data-group=air]').getAttribute('data-phase'),'idle');
    await hit('air').focus();await page.keyboard.press('Enter');await page.clock.runFor(1000);
    assert.ok(Math.abs(await rowTime('water')-2)<.03);
    assert.ok(Math.abs(await rowTime('air')-1)<.02);assert.equal(await rowTime('steel'),0);
    await hit('steel').focus();await page.keyboard.press('Space');
    await hit('steel').click();await page.clock.runFor(1000);
    assert.ok(Math.abs(await rowTime('steel')-1)<.02);
    assert.ok(Math.abs(await rowTime('water')-3)<.04);
    assert.ok(Math.abs(await rowTime('air')-2)<.03);
    assert.equal(await page.locator('#experiment-panel').getAttribute('data-scope'),'individual');
    assert.equal(await page.locator('#result').isHidden(),true);
    assert.match(await primary.textContent(),/同時敲擊/);
    assert.match(await page.locator('#card-04 [data-group=water] .individual-time').textContent(),/敲擊後/);
    await page.locator('#pause-action').click();const saved=await particleXs(),clock=await time();
    await page.clock.runFor(2000);assert.deepEqual(await particleXs(),saved);assert.equal(await time(),clock);
    await page.locator('#pause-action').click();await page.clock.runFor(500);
    assert.ok(Math.abs(await rowTime('air')-2.5)<.04);
    await primary.click();await page.clock.runFor(500);
    for(const kind of ['air','water','steel'])assert.ok(Math.abs(await rowTime(kind)-.5)<.02);
    assert.equal(await page.locator('#experiment-panel').getAttribute('data-scope'),'together');
    assert.equal(await page.locator('#pause-action').isHidden(),true);
    await hit('air').click();await page.clock.runFor(200);
    assert.ok(Math.abs(await rowTime('air')-.2)<.02);
    assert.ok(Math.abs(await rowTime('water')-.7)<.03,'individual strike during comparison preserves the other rows');
  });

  await t.test('a completed individual group can be struck again and temperature groups are independent', async () => {
    await fresh();await page.locator('#card-04 [data-group=steel] .source-hit').click();await page.clock.runFor(5200);
    assert.equal((await data()).phase,'complete');
    assert.equal(await page.locator('#card-04 [data-group=water]').getAttribute('data-phase'),'idle');
    await page.locator('#card-04 [data-group=water] .source-hit').click();await page.clock.runFor(200);
    assert.equal(await page.locator('#card-04 [data-group=steel]').getAttribute('data-phase'),'complete');
    assert.equal(await page.locator('#card-04 [data-group=air]').getAttribute('data-phase'),'idle');
    await page.locator('#card-04 [data-group=steel] .source-hit').click();
    assert.equal(await page.locator('#card-04 [data-group=steel] .fork-striker[visibility=visible]').count(),1);
    assert.ok(Number(await page.locator('#card-04 [data-group=water]').getAttribute('data-time'))>.18);
    await temperatureLab.locator('[data-group=hot] .source-hit').click();const savedMaterial=await time();await page.clock.runFor(1000);
    assert.equal(await temperatureLab.locator('[data-group=cold]').getAttribute('data-phase'),'idle');
    assert.ok(Number(await temperatureLab.locator('[data-group=hot]').getAttribute('data-time'))>.98);
    await temperatureLab.locator('#temp-reset-action').click();
    assert.deepEqual(await temperatureLab.locator('.medium-row').evaluateAll(ns=>ns.map(n=>n.dataset.phase)),['idle','idle']);
    assert.equal((await data()).phase,'paused','entering the fifth block pauses the fourth');assert.equal(await time(),savedMaterial,'fifth-block reset preserves fourth-block progress');

  });

  await t.test('a strike stays visible for at least half a second and withdraws while the fork rings', async () => {
    await fresh();
    assert.equal(await page.locator('#card-04 .tuning-fork').count(),3);
    assert.equal(await page.locator('#card-04 .fork-striker[visibility=hidden]').count(),3);
    const fixed=await page.locator('#card-04 .fork-fixed').evaluateAll(nodes=>nodes.map(n=>n.innerHTML));
    const arms=()=>page.locator('#card-04 .fork-tine').evaluateAll(nodes=>nodes.map(n=>[n.getAttribute('d'),n.getAttribute('transform')]));
    const tips=()=>page.locator('#card-04 .tuning-fork').evaluateAll(nodes=>nodes.map(n=>[n.querySelectorAll('.fork-tine')[0],n.querySelectorAll('.fork-tine')[3]].map(path=>{const p=path.getPointAtLength(path.getTotalLength());return p.x+path.transform.baseVal.consolidate().matrix.e;})));
    const initialArms=await arms(),initialTips=await tips();
    await primary.click();assert.equal(await page.locator('#card-04 .fork-striker[visibility=visible]').count(),3);
    await page.clock.runFor(150);
    assert.equal(await page.locator('#card-04 .fork-striker[visibility=visible]').count(),3);
    assert.notDeepEqual(await arms(),initialArms);
    await page.clock.runFor(250);
    assert.equal(await page.locator('#card-04 .fork-striker[visibility=visible]').count(),3);
    assert.equal(await page.locator('#card-04 .fork-striker').evaluateAll(ns=>ns.every(n=>Number(n.getAttribute('opacity'))===1)),true);
    await primary.click();const strikePaused=await page.locator('#card-04 .fork-striker').evaluateAll(ns=>ns.map(n=>n.outerHTML));
    await page.clock.runFor(1000);assert.deepEqual(await page.locator('#card-04 .fork-striker').evaluateAll(ns=>ns.map(n=>n.outerHTML)),strikePaused);
    await primary.click();await page.clock.runFor(120);
    assert.equal(await page.locator('#card-04 .fork-striker[visibility=visible]').count(),3,'the strike is still visible beyond 0.5 seconds');
    await page.clock.runFor(120);
    assert.equal(await page.locator('#card-04 .fork-striker[visibility=hidden]').count(),3);
    // 換向時恰好經過原位亦是正常振動；跨半週期取樣，避免只讀到零點。
    const tipSamples=[];
    for(let i=0;i<4;i++){await page.clock.runFor(16);tipSamples.push(await tips());}
    for(const sample of tipSamples)sample.forEach((pair,i)=>{const a=pair[0]-initialTips[i][0],b=pair[1]-initialTips[i][1];assert.ok(a*b<=0);assert.ok(Math.abs(a+b)<.001);});
    assert.ok(tipSamples.some(sample=>Math.abs(sample[0][0]-initialTips[0][0])>.5));
    const movingTips=tipSamples.at(-1);
    assert.deepEqual(await page.locator('#card-04 .fork-fixed').evaluateAll(nodes=>nodes.map(n=>n.innerHTML)),fixed);
    assert.equal(await page.locator('#card-04 .sound-source').evaluateAll(nodes=>nodes.every(n=>!n.hasAttribute('transform'))),true,'the sound source is not translated as a pushing block');
    assert.equal(await page.locator('#card-04 [data-group=steel] .source-contact').count(),1);
    const waterTips=movingTips[1];assert.ok(Math.min(...waterTips)>55&&Math.max(...waterTips)<110);
    await primary.click();const paused=await arms();await page.clock.runFor(1000);assert.deepEqual(await arms(),paused);
    await page.locator('#reset-action').click();assert.deepEqual(await arms(),initialArms);
    assert.equal(await page.locator('#card-04 .fork-striker[visibility=hidden]').count(),3);
  });

  await t.test('visible forks are directly clickable at their real picture positions', async () => {
    await fresh();
    for(const [kind,x,y]of[['air',74,55],['water',92,70],['steel',52,55]]){
      const field=page.locator(`#card-04 [data-group=${kind}] .field svg`);
      await page.locator(`#card-04 [data-group=${kind}] .source-hit`).scrollIntoViewIfNeeded();
      const target=await field.evaluate((svg,{x,y})=>{const p=svg.createSVGPoint();p.x=x;p.y=y;const screen=p.matrixTransform(svg.getScreenCTM());return{x:screen.x,y:screen.y,hit:document.elementFromPoint(screen.x,screen.y)?.classList.contains('source-hit')};},{x,y});
      assert.equal(target.hit,true);
      await page.mouse.click(target.x,target.y);assert.equal((await data()).phase,'running');
      assert.equal(await page.locator('#card-04 .fork-striker[visibility=visible]').count(),1);
      assert.equal(await page.locator(`#card-04 [data-group=${kind}] .fork-striker[visibility=visible]`).count(),1);
      await page.locator('#reset-action').click();
    }
  });

  await t.test('small repeated tine motion stays connected to steel without a handle pushing the block', async () => {
    await fresh();await primary.click();
    const readings=[];
    const shapes=await page.locator('#card-04 .fork-tine').evaluateAll(ns=>ns.map(n=>n.getAttribute('d')));
    for(let i=0;i<39;i++){
      await page.clock.runFor(100);
      const reading=await page.locator('#card-04 [data-group=steel] .tuning-fork').evaluate(n=>{
        const paths=n.querySelectorAll('.fork-tine'),contact=n.querySelector('.source-contact');
        const tip=path=>{const p=path.getPointAtLength(path.getTotalLength());return{x:p.x+path.transform.baseVal.consolidate().matrix.e,y:p.y};};
        return{left:tip(paths[0]).x,right:tip(paths[3]).x,tipY:tip(paths[3]).y,
          edge:Number(contact.dataset.armEdge),steel:Number(contact.dataset.steelEdge),
          arm:contact.dataset.coupledArm,contactInBase:!!n.querySelector('.fork-fixed .source-contact'),
          d:paths[3].getAttribute('d')};
      });
      assert.deepEqual(await page.locator('#card-04 .fork-tine').evaluateAll(ns=>ns.map(n=>n.getAttribute('d'))),shapes,'no path morphing');
      assert.equal(reading.arm,'right');assert.equal(reading.contactInBase,false);
      assert.ok(Math.abs(reading.edge-reading.right-2.8)<.001);
      assert.equal(reading.steel,94);assert.ok(reading.edge<reading.steel,'contact layer remains positive in width');
      assert.equal(reading.tipY,35);assert.match(reading.d,/^M86 99V35$/,'tine geometry is constant and straight');
      assert.ok(Math.abs(reading.right-86)<=1.5+.001,'small displacement avoids a visibly distorted fork');
      assert.ok(Math.abs(reading.left+reading.right-138)<.001);
      readings.push(reading.right-86);
    }
    const signs=readings.filter(x=>Math.abs(x)>.01).map(x=>Math.sign(x));
    assert.ok(signs.slice(1).filter((x,i)=>x!==signs[i]).length>=4,'several genuine direction reversals during the strike signal');
    await page.clock.runFor(200);
    assert.equal(await page.locator('#card-04 [data-group=steel] .source-contact').getAttribute('data-arm-edge'),'88.8');
  });

  await t.test('vibrating neighbours carry the disturbance while the position pointer stays below the medium', async () => {
    await fresh(); await primary.click(); await page.clock.runFor(100);
    const pair = kind => page.locator(`#card-04 [data-group=${kind}] .particle`).evaluateAll(nodes => nodes.slice(0,3).map(n => ({ moved:n.transform.baseVal.consolidate().matrix.e-Number(n.dataset.originX), moving:n.dataset.moving })));
    for (const kind of ['air','water']) {
      const points = await pair(kind);
      assert.ok(points[0].moved > .1); assert.equal(points[0].moving,'true');
      assert.ok(Math.abs(points[1].moved)<.0001); assert.ok(Math.abs(points[2].moved)<.0001);
    }
    await page.clock.runFor(250);
    const water = await pair('water');
    assert.ok(Math.abs(water[1].moved)>.1); assert.ok(Math.abs(water[2].moved)<.0001);
    await page.clock.runFor(750);
    const air = await pair('air');
    assert.ok(Math.abs(air[1].moved)>.1); assert.ok(Math.abs(air[2].moved)<.0001);
    assert.equal(await page.locator('#card-04 .particle').evaluateAll(nodes=>nodes.every(n=>n.getAttribute('opacity')==='1')),true);
    assert.equal(await page.locator('#card-04 .propagation-front path').evaluateAll(nodes=>nodes.every(n=>n.getBBox().y>=116)),true);
    assert.equal(await page.locator('#card-04 .propagation-front [stroke-dasharray]').count(),0);
    const m=await model, current=await time();
    for (const group of m.conditions('material')) {
      const samples=await page.locator(`#card-04 [data-group=${group.id}] .particle`).evaluateAll(nodes=>nodes.slice(-3).map(n=>({origin:Number(n.dataset.originX),distance:Number(n.dataset.distance),x:n.transform.baseVal.consolidate().matrix.e})));
      assert.ok(samples[0].distance<samples[1].distance&&samples[1].distance<samples[2].distance);assert.equal(samples[2].distance,5000);
      for(const point of samples)assert.ok(Math.abs(point.x-point.origin-m.displacement(current-point.distance/group.speed))<.0002);
    }
    await page.locator('#reset-action').click();
  });

  await t.test('teaching results retain actual times and rest positions without prediction or grading', async () => {
    await fresh();
    await primary.click(); await page.clock.fastForward(20000);
    assert.equal((await data()).phase, 'complete');
    assert.deepEqual(await page.locator('#card-04 [data-sound-speed-lab]').locator('.arrival-readout output').allTextContents(), ['14.577 秒', '3.378 秒', '0.847 秒']);
    assert.equal(await page.locator('#card-04 [data-sound-speed-lab]').locator('#result-rows tr').count(), 3);
    assert.match(await page.locator('#card-04 [data-sound-speed-lab]').locator('#result-summary').textContent(), /鋼最先、水其次、空氣最後/);
    assert.equal(await page.locator('#card-04 [data-sound-speed-lab]').locator('#result-title').textContent(), '觀察結果');
    assert.equal(await page.locator('#card-04 [data-sound-speed-lab]').locator('.particle').evaluateAll(nodes => nodes.every(n => Math.abs(n.transform.baseVal.consolidate().matrix.e - Number(n.dataset.originX)) < .0001)), true);
    assert.equal(await page.locator('#card-04 .end-particle, .zoom, .end-state').count(),0);
    await page.locator('#card-04 [data-sound-speed-lab]').locator('#reset-action').click(); assert.equal(await time(), 0); assert.equal(await page.locator('#card-04 [data-sound-speed-lab]').locator('#result').isHidden(), true);
    assert.equal(await page.locator('#card-04 [data-sound-speed-lab]').locator('[name=prediction]').count(), 0);
    assert.deepEqual(await page.locator('#card-04 [data-sound-speed-lab]').locator('.propagation-readout output').allTextContents(), ['0 公尺','0 公尺','0 公尺']);
    assert.equal(await page.locator('#card-04 [data-sound-speed-lab]').locator('.propagation-front').evaluateAll(nodes => nodes.every(n => n.getAttribute('visibility') === 'hidden')), true);
  });

  await t.test('fixed cold and hot groups have no temperature switching controls or apparatus', async () => {
    await fresh();const m=await model;
    assert.equal((await temperatureData()).temperatures,'0,80');
    assert.equal(await temperatureLab.locator('.medium-row').count(),2);
    assert.equal(await temperatureLab.locator('input[type=range],[data-temperature-target],.thermal-actions,.temperature-rig,#temp-temperature-value').count(),0);
    assert.deepEqual(await temperatureLab.locator('h3.temperature-heading').allTextContents(),['0°C 低溫組','80°C 高溫組']);
    assert.deepEqual(await temperatureLab.locator('.air-chamber').evaluateAll(ns=>ns.map(n=>n.dataset.temperature)),['0.0000','80.0000']);
    const speeds=await temperatureLab.locator('.medium-row').evaluateAll(ns=>ns.map(n=>Number(n.dataset.speed)));
    assert.deepEqual(speeds,[m.airSpeed(0),m.airSpeed(80)]);
    const layouts=await temperatureLab.locator('.medium-row').evaluateAll(rows=>rows.map(row=>[...row.querySelectorAll('.particle')].map(n=>[n.dataset.originX,n.dataset.originY])));
    assert.deepEqual(layouts[0],layouts[1]);
    assert.equal(await temperatureLab.locator('.rig-controller,.rig-thermometer,image').count(),0);
  });

  await t.test('compact chambers omit the apparatus and retain one comparison below the hot group', async () => {
    await fresh();
    assert.equal(await temperatureLab.locator('.chamber-thermal-link,.chamber-probe-port,.chamber-probe-tip,.chamber-sensor-cable,.chamber-meter,.chamber-temperature-value,.rig-heat-light,.rig-cold-light').count(),0);
    assert.equal(await temperatureLab.locator('.race-progress').count(),1);
    assert.equal(await temperatureLab.locator('[data-group=cold] .race-progress,[data-group=cold] .progress-gap').count(),0);
    assert.equal(await temperatureLab.locator('[data-group=hot] .race-progress').count(),1);
    assert.deepEqual(await temperatureLab.locator('.field>svg').evaluateAll(ns=>ns.map(n=>n.getAttribute('viewBox'))),['0 0 456 150','0 0 456 150']);
    const shapes=where=>page.locator(where).evaluateAll(ns=>ns.map(n=>({d:n.getAttribute('d'),strokeWidth:n.getAttribute('stroke-width')})));
    assert.deepEqual(await shapes('#card-04 [data-group=air] .fork-tine'),await shapes('#card-05 [data-group=hot] .fork-tine'));
    assert.deepEqual(await shapes('#card-04 [data-group=air] .fork-fixed path'),await shapes('#card-05 [data-group=hot] .fork-fixed path'));
    assert.equal(await page.evaluate(()=>performance.getEntriesByType('resource').some(r=>r.name.includes('temperature-control-unit.png'))),false);
    for(const width of[320,390,640,768,850,1024,1440]){
      await page.setViewportSize({width,height:1600});await page.clock.runFor(32);
      const geometry=await temperatureLab.locator('.temperature-heading').evaluateAll(ns=>ns.map(n=>{const a=n.getBoundingClientRect(),b=n.firstElementChild.getBoundingClientRect();return b.left>=a.left-1&&b.right<=a.right+1;}));
      assert.ok(geometry.every(Boolean));
    }
    await page.setViewportSize({width:1440,height:1500});await page.clock.runFor(32);
  });

  await t.test('one lower rail compares both live positions at the same scale across seven widths', async () => {
    await fresh();const m=await model;
    assert.equal(await temperatureLab.locator('.progress-legend').count(),0);
    assert.equal(await temperatureLab.locator('.field .race-marker,.field .propagation-front').count(),0);
    await temperaturePrimary.click();await page.clock.runFor(12000);await temperaturePrimary.click();
    const elapsed=Number((await temperatureData()).time),speed=m.airSpeed(80);
    const rails=await temperatureLab.locator('.race-progress').evaluateAll(ns=>ns.map(n=>({...n.dataset})));
    assert.equal(rails.length,1);
    assert.ok(Math.abs(Number(rails[0].ownDistance)-speed*elapsed)<.001);
    assert.ok(Math.abs(Number(rails[0].otherDistance)-m.airSpeed(0)*elapsed)<.001);
    const gap=Math.round((speed-m.airSpeed(0))*elapsed);
    assert.deepEqual(await temperatureLab.locator('.progress-gap').allTextContents(),[`領先 ${gap} 公尺`]);
    assert.deepEqual(await temperatureLab.locator('.race-own-label output').allTextContents(),['4,518']);
    assert.deepEqual(await temperatureLab.locator('.race-other-label output').allTextContents(),['3,973']);
    for(const width of[320,390,640,768,850,1024,1440]){
      await page.setViewportSize({width,height:1600});await page.clock.runFor(32);
      const geometry=await temperatureLab.locator('.race-progress').evaluateAll(ns=>ns.map(n=>{
        const box=n.getBoundingClientRect(),scale=n.querySelector('.race-scale').getBoundingClientRect();
        const marker=selector=>{const b=n.querySelector(selector).getBoundingClientRect();return b.x+b.width/2;};
        return{left:scale.left,right:scale.right,own:marker('.race-own'),other:marker('.race-other'),labels:[...n.querySelectorAll('.race-label')].map(l=>{const b=l.getBoundingClientRect();return{inside:b.x>=box.x-1&&b.right<=box.right+1,overflow:l.scrollWidth>l.clientWidth+1};})};
      }));
      const g=geometry[0];
      assert.ok(Math.abs(g.own-(g.left+(g.right-g.left)*speed*elapsed/5000))<.1);
      assert.ok(Math.abs(g.other-(g.left+(g.right-g.left)*m.airSpeed(0)*elapsed/5000))<.1);
      assert.ok(geometry.every(g=>g.labels.every(l=>l.inside&&!l.overflow)));
    }
    const saved=await temperatureLab.locator('.race-progress').evaluateAll(ns=>ns.map(n=>n.innerHTML));
    await page.clock.runFor(1000);
    assert.deepEqual(await temperatureLab.locator('.race-progress').evaluateAll(ns=>ns.map(n=>n.innerHTML)),saved);
    await page.setViewportSize({width:1440,height:1500});
  });

  await t.test('fixed race handles first arrival, completion, reset and separate starts honestly', async () => {
    await fresh();const m=await model;
    await temperaturePrimary.click();await page.clock.runFor(Math.ceil(m.arrivalTime(m.airSpeed(80))*1000)+32);await temperaturePrimary.click();
    assert.equal(await temperatureLab.locator('.arrival-readout output[data-arrival]').count(),1);
    assert.equal(await temperatureLab.locator('[data-group=hot] .arrival-readout output').textContent(),'13.281 秒');
    const ds=await temperatureLab.locator('.race-progress').evaluate(n=>[Number(n.dataset.ownDistance),Number(n.dataset.otherDistance)]);
    assert.equal(ds[0],5000);assert.ok(ds[1]<5000);
    assert.match(await temperatureLab.locator('.progress-gap').textContent(),/領先/);
    await temperaturePrimary.click();await page.clock.fastForward(20000);
    assert.equal(await temperatureLab.locator('.progress-gap').textContent(),'均已到達');
    await temperatureLab.locator('#temp-reset-action').click();
    assert.equal(await temperatureLab.locator('.race-marker:not([hidden]),.progress-gap:not([hidden])').count(),0);
    await temperatureLab.locator('[data-group=hot] .source-hit').click();await page.clock.runFor(1000);
    assert.equal(await temperatureLab.locator('[data-group=hot] .race-other').isHidden(),true);
    assert.equal(await temperatureLab.locator('[data-group=cold] .race-own').count(),0);
    await temperatureLab.locator('[data-group=cold] .source-hit').click();await page.clock.runFor(1000);
    assert.equal(await temperatureLab.locator('.progress-gap').textContent(),'起跑時間不同');
    const separate=await temperatureLab.locator('.race-progress').evaluate(n=>({...n.dataset}));
    assert.equal(separate.ownDistance,String(Number(await temperatureLab.locator('[data-group=hot]').getAttribute('data-reached-distance'))));
    assert.equal(separate.otherDistance,String(Number(await temperatureLab.locator('[data-group=cold]').getAttribute('data-reached-distance'))));
    await temperaturePrimary.click();await page.clock.runFor(1000);
    assert.equal((await temperatureData()).scope,'together');
    assert.match(await temperatureLab.locator('.progress-gap').textContent(),/領先/);
  });

  await t.test('direct fixed-temperature strikes start immediately and reset preserves both temperatures', async () => {
    await fresh();await temperatureLab.locator('[data-group=hot] .source-hit').click();
    assert.equal(await temperatureLab.locator('.fork-striker[visibility=visible]').count(),1);
    assert.equal(await temperatureLab.locator('[data-group=cold]').getAttribute('data-phase'),'idle');
    await page.clock.runFor(1000);const state=await temperatureData();assert.ok(Math.abs(Number(state.time)-1)<.02);
    assert.ok(Math.abs(Number(await temperatureLab.locator('[data-group=hot]').getAttribute('data-reached-distance'))-(await model).airSpeed(80)*Number(state.time))<.001);
    assert.equal((await data()).phase,'idle');
    await temperatureLab.locator('#temp-reset-action').click();await page.clock.runFor(2000);
    assert.equal((await temperatureData()).phase,'idle');assert.equal((await temperatureData()).temperatures,'0,80');
    assert.deepEqual(await temperatureLab.locator('.arrival-readout output').allTextContents(),['—','—']);
  });

  await t.test('backgrounding preserves fixed temperatures without autoplay and pauses propagation', async () => {
    await fresh();
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
    assert.equal((await temperatureData()).phase,'idle');await page.clock.runFor(2000);assert.equal((await temperatureData()).time,'0.00000000');
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
    await temperaturePrimary.click();await page.clock.runFor(500);
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
    const saved=await temperatureData();assert.equal(saved.phase,'paused');await page.clock.runFor(2000);assert.equal((await temperatureData()).time,saved.time);
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
    await page.clock.runFor(1000);assert.equal((await temperatureData()).phase,'paused');assert.equal((await temperatureData()).temperatures,'0,80');
  });

  await t.test('fixed 0°C and 80°C experiments reproduce the same correct arrival times', async () => {
    await fresh();
    for(let attempt=0;attempt<2;attempt++){
      await temperatureLab.locator('#temp-reset-action').click();await temperaturePrimary.click();await page.clock.fastForward(21000);
      assert.equal((await temperatureData()).phase,'complete');
      assert.match(await temperatureLab.locator('#temp-result-summary').textContent(),/80°C 比 0°C 早 1\.820 秒/);
      assert.equal(await temperatureLab.locator('#temp-result table').count(),0);
      assert.deepEqual(await temperatureLab.locator('.arrival-readout output').allTextContents(),['15.102 秒','13.281 秒']);
      assert.equal((await data()).phase,'idle');
    }
  });

  await t.test('fifth-block pause and reset stay independent of the fourth-block controls', async () => {
    await fresh();await primary.click();await page.clock.runFor(1000);await temperaturePrimary.click();const materialTime=await time();await page.clock.runFor(500);
    assert.equal((await data()).phase,'paused');assert.equal(await time(),materialTime);assert.ok(Number((await temperatureData()).time)>.48);
    await temperatureLab.locator('#temp-reset-action').click();assert.equal((await temperatureData()).phase,'idle');
    await page.clock.runFor(500);assert.equal(await time(),materialTime);
    await primary.click();await page.clock.runFor(500);assert.ok(Math.abs(await time()-materialTime-.5)<.03);
    await temperaturePrimary.click();const saved=await particleXs();await page.clock.runFor(500);assert.deepEqual(await particleXs(),saved);
    await temperatureLab.locator('#temp-reset-action').click();assert.equal((await data()).phase,'paused');
    await page.locator('#reset-action').click();
    const layout=await page.locator('#card-04,#card-05').evaluateAll(ns=>ns.map(n=>{
      const main=n.querySelector('.card-main').getBoundingClientRect(),head=n.querySelector('.lesson-head').getBoundingClientRect();
      return{mainX:main.x,mainWidth:main.width,headX:head.x,titleSize:getComputedStyle(n.querySelector('h2')).fontSize,padding:getComputedStyle(n).padding};
    }));assert.deepEqual(layout[0],layout[1]);
    await page.locator('.route a[href="#card-05"]').click();assert.equal(new URL(page.url()).hash,'#card-05');
  });

  await t.test('medium surface detail follows the same travel delay and stops on pause', async () => {
    await fresh(); await primary.click(); await page.clock.runFor(2000); await primary.click();
    const t0 = await time(), m = await model;
    const surfaces = await page.locator('#card-04 [data-sound-speed-lab]').locator('.surface-sample').evaluateAll(nodes => nodes.map(n => ({
      x: n.transform.baseVal.consolidate().matrix.e, origin: Number(n.dataset.originX),
      distance: Number(n.dataset.distance), speed: Number(n.closest('.medium-row').dataset.speed)
    })));
    assert.equal(surfaces.length, 36);
    assert.ok(surfaces.some(p => Math.abs(p.x - p.origin) > .01));
    for (const p of surfaces) assert.ok(Math.abs(p.x - m.sample({ x:p.origin, distance:p.distance },p.speed,t0).x) < .00011);
    const before = await page.locator('#card-04 [data-sound-speed-lab]').locator('.surface-sample').evaluateAll(nodes => nodes.map(n => n.getAttribute('transform')));
    await page.clock.runFor(1000);
    assert.deepEqual(await page.locator('#card-04 [data-sound-speed-lab]').locator('.surface-sample').evaluateAll(nodes => nodes.map(n => n.getAttribute('transform'))), before);
    await page.locator('#card-04 [data-sound-speed-lab]').locator('#reset-action').click();
    assert.equal(await page.locator('#card-04 [data-sound-speed-lab]').locator('.surface-sample').evaluateAll(nodes => nodes.every(n => Math.abs(n.transform.baseVal.consolidate().matrix.e - Number(n.dataset.originX)) < .0001)), true);
  });

  await t.test('molecules stay within the material cross sections throughout the pulse', async () => {
    await fresh();
    await primary.click();
    for (let i = 0; i < 12; i++) {
      await page.clock.fastForward(1400);
      const escaped = await page.locator('#card-04 [data-sound-speed-lab]').locator('.field .particle').evaluateAll(nodes => nodes.flatMap(n => {
        const interior = n.closest('.medium-interior'), id = interior.getAttribute('clip-path').slice(5,-1);
        const clip = document.getElementById(id).querySelector('rect');
        const x = Number(clip.getAttribute('x')), y = Number(clip.getAttribute('y'));
        const right = x + Number(clip.getAttribute('width')), bottom = y + Number(clip.getAttribute('height'));
        const b = n.getBBox(), transform = n.transform.baseVal.consolidate().matrix;
        const out = b.x + transform.e < x - .1 || b.x + b.width + transform.e > right + .1 || b.y + transform.f < y - .1 || b.y + b.height + transform.f > bottom + .1;
        return out ? [n.closest('.medium-row').dataset.group + ':' + n.dataset.originX + ':' + n.dataset.originY] : [];
      }));
      assert.deepEqual(escaped, []);
    }
  });

  await t.test('backgrounding pauses at the same model time and never resumes automatically', async () => {
    await fresh(); await primary.click(); await page.clock.runFor(2000);
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
    assert.equal((await data()).phase, 'paused'); const saved = await time();
    await page.clock.runFor(2000); assert.equal(await time(), saved);
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
    await page.clock.runFor(1000); assert.equal(await time(), saved);
    await primary.click(); await page.clock.runFor(1000); assert.ok(await time() > saved);
  });

  await t.test('fifth-block independent strike does not activate fourth-block controls', async () => {
    await fresh();
    await temperatureLab.locator('[data-group=cold] .source-hit').click();await page.clock.fastForward(16000);
    assert.deepEqual(await temperatureLab.locator('.arrival-readout output').allTextContents(),['15.102 秒','—']);
    assert.equal((await data()).phase,'idle');assert.equal(await time(),0);
  });

  await t.test('a real stopwatch confirms each activity in sequence without overlapping playback', { timeout: 45000 }, async () => {
    const realPage = await browser.newPage({ viewport: { width:1440, height:1000 } });
    try {
      await realPage.goto(url, { waitUntil:'networkidle' });
      await realPage.evaluate(() => {
        const panel = document.querySelector('#experiment-panel');
        window.__stopwatch = { started:null, arrivals:{}, checks:[], strikes:{} };
        document.querySelector('#primary-action').addEventListener('click', () => { window.__stopwatch.started = performance.now(); }, { capture:true, once:true });
        new MutationObserver(() => {
          const record = window.__stopwatch;
          if (record.started === null) return;
          const elapsed = (performance.now() - record.started) / 1000;
          for (const row of document.querySelector('#card-04').querySelectorAll('.medium-row')) {
            const output = row.querySelector('.arrival-readout output');
            if(elapsed>.05 && !record.strikes[row.dataset.group] && row.querySelector('.fork-striker').getAttribute('visibility')==='hidden') record.strikes[row.dataset.group]=elapsed;
            if (output.hasAttribute('data-arrival') && !record.arrivals[row.dataset.group]) record.arrivals[row.dataset.group] = { elapsed, displayed:output.textContent };
          }
          const next = [1,5,10][record.checks.length];
          if (next !== undefined && elapsed >= next) record.checks.push({ elapsed, clock:Number(panel.dataset.time), distances:[...document.querySelector('#card-04').querySelectorAll('.medium-row')].map(n => Number(n.dataset.reachedDistance)) });
        }).observe(panel, { subtree:true, attributes:true });
        const fifth=document.querySelector('#temp-experiment-panel');
        window.__temperatureWatch={started:null,arrivals:{},checks:[]};
        document.querySelector('#temp-primary-action').addEventListener('click',()=>{window.__temperatureWatch.started=performance.now();},{capture:true,once:true});
        new MutationObserver(()=>{
          const r=window.__temperatureWatch;if(r.started===null)return;
          const elapsed=(performance.now()-r.started)/1000;
          for(const row of fifth.querySelectorAll('.medium-row')){
            const output=row.querySelector('.arrival-readout output');
            if(output.hasAttribute('data-arrival')&&!r.arrivals[row.dataset.group])r.arrivals[row.dataset.group]={elapsed,displayed:output.textContent};
          }
          const next=[1,5,10][r.checks.length];
          if(next!==undefined&&elapsed>=next)r.checks.push({elapsed,clock:Number(fifth.dataset.time),distances:[...fifth.querySelectorAll('.medium-row')].map(n=>Number(n.dataset.reachedDistance))});
        }).observe(fifth,{subtree:true,attributes:true});
      });
      await realPage.locator('#primary-action').click();
      await realPage.waitForFunction(() => Object.keys(window.__stopwatch.arrivals).length === 3, null, { timeout:20000 });
      const readings = await realPage.evaluate(() => window.__stopwatch);
      await realPage.locator('#temp-primary-action').click();
      await realPage.waitForFunction(()=>Object.keys(window.__temperatureWatch.arrivals).length===2,null,{timeout:20000});
      for (const [id,speed] of [['air',343],['water',1480],['steel',5900]]) {
        assert.ok(Math.abs(readings.arrivals[id].elapsed - 5000 / speed) < .12, `${id} reaches the end at its real elapsed time`);
        assert.equal(readings.arrivals[id].displayed, `${(5000 / speed).toFixed(3)} 秒`);
      }
      assert.equal(Object.keys(readings.strikes).length,3);
      for(const duration of Object.values(readings.strikes))assert.ok(duration>=.6&&duration<.85,'real strike lasts at least half a second without extending propagation times');
      assert.equal(readings.checks.length, 3);
      for (const check of readings.checks) {
        assert.ok(Math.abs(check.clock - check.elapsed) < .06, 'displayed seconds match independent real stopwatch');
        [343,1480,5900].forEach((speed,i) => assert.ok(Math.abs(check.distances[i] - Math.min(5000,speed * check.clock)) < .001));
      }
      console.log('real stopwatch:', JSON.stringify(readings));
      const fifth=await realPage.evaluate(()=>window.__temperatureWatch);
      for(const[id,speed]of[['cold',(await model).airSpeed(0)],['hot',(await model).airSpeed(80)]]){
        assert.ok(Math.abs(fifth.arrivals[id].elapsed-5000/speed)<.12);
        assert.equal(fifth.arrivals[id].displayed,`${(5000/speed).toFixed(3)} 秒`);
      }
      assert.equal(fifth.checks.length,3);
      for(const check of fifth.checks){
        assert.ok(Math.abs(check.clock-check.elapsed)<.06);
        [(await model).airSpeed(0),(await model).airSpeed(80)].forEach((speed,i)=>assert.ok(Math.abs(check.distances[i]-Math.min(5000,speed*check.clock))<.001));
      }
      console.log('fifth-block real stopwatch:',JSON.stringify(fifth));
    } finally { await realPage.close(); }
  });

  await t.test('touch and seven viewport widths keep both independent blocks usable', async () => {
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
    const mobile=await context.newPage();await mobile.clock.install({time:new Date('2026-10-28T00:00:00Z')});await mobile.clock.pauseAt(new Date('2026-10-28T00:00:01Z'));
    await mobile.goto(url,{waitUntil:'networkidle'});
    const material=mobile.locator('#card-04'),temperature=mobile.locator('#card-05');
    await material.locator('[data-group=steel] .source-hit').tap();await mobile.clock.runFor(1000);
    assert.equal(await material.locator('#experiment-panel').getAttribute('data-phase'),'running');
    assert.equal(await temperature.locator('#temp-experiment-panel').getAttribute('data-phase'),'idle');
    for(const kind of ['air','water'])assert.equal(await material.locator(`[data-group=${kind}]`).getAttribute('data-time'),'0.00000000');
    const comparison=await material.locator('#models').boundingBox();assert.ok(comparison.y>=-1&&comparison.y+comparison.height<=845);
    await material.locator('#reset-action').tap();
    await temperature.locator('[data-group=hot] .source-hit').tap();await mobile.clock.runFor(500);
    assert.equal(await temperature.locator('[data-group=cold]').getAttribute('data-phase'),'idle');
    assert.ok(Number(await temperature.locator('[data-group=hot]').getAttribute('data-time'))>.48);
    assert.equal(await material.locator('#experiment-panel').getAttribute('data-phase'),'idle');
    await temperature.locator('#temp-reset-action').tap();
    for(const [root,prefix]of[[material,''],[temperature,'temp-']]){
      await root.locator(`#${prefix}primary-action`).tap();await mobile.clock.fastForward(20000);
      for(const width of[320,390,640,768,850,1024,1440]){
        await mobile.setViewportSize({width,height:844});await mobile.clock.runFor(32);
        assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
        assert.equal(await root.locator('.arrival-readout').evaluateAll(ns=>ns.every(n=>{const a=n.getBoundingClientRect(),b=n.querySelector('output').getBoundingClientRect();return b.left>=a.left&&b.right<=a.right;})),true);
        const geometry=await root.locator('.card-main').evaluate(n=>{const a=n.getBoundingClientRect();return{left:a.left,right:a.right,items:[...n.querySelectorAll('.medium-row,.controls')].map(x=>{const b=x.getBoundingClientRect();return{left:b.left,right:b.right};})};});
        for(const item of geometry.items)assert.ok(item.left>=geometry.left-1&&item.right<=geometry.right+1);
        const boxes=await root.locator('button,.sound-option').evaluateAll(ns=>ns.filter(n=>n.getClientRects().length).map(n=>({w:n.getBoundingClientRect().width,h:n.getBoundingClientRect().height})));
        for(const box of boxes)assert.ok(box.w>=43.9&&box.h>=43.9);
        assert.equal(await root.locator('.tabs,.model-information,#observation-caption').count(),0);
      }
    }
    await context.close();
  });

  assert.deepEqual(errors, []);
});
