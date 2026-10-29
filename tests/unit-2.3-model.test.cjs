const { test } = require('node:test');
const assert = require('node:assert/strict');
const load = () => import('../units/2/parts/2.3/assets/air-model.mjs');

test('2.3: reaction volume, water levels and calibrated geometry agree', async () => {
  const { gasGeometry } = await load();
  let previous = 101;
  for (let p = 0; p <= 1.001; p += .05) {
    const g = gasGeometry(p);
    assert.ok(g.volume <= previous + 1e-8); previous = g.volume;
    assert.ok(g.mouth < 0);
    assert.ok(Math.abs((1 - g.water / 1033) * g.volume - g.reference) < 1e-8);
    assert.ok(Math.abs(5 * (g.top - g.water) - 2 - g.volume) < 1e-8);
  }
  assert.ok(Math.abs(gasGeometry(0).volume - 100) < 1e-8);
  assert.equal(gasGeometry(1).volume.toFixed(1), '79.3');
  assert.equal(gasGeometry(1).water.toFixed(2), '4.14');
  for (const a of [0, .25, .5, .75, 1]) {
    const g = gasGeometry(1, a);
    assert.ok(g.mouth < 0 && g.mouth > -9);
    assert.ok(Math.abs((1 - g.water / 1033) * g.volume - 79) < 1e-8);
  }
  assert.equal(gasGeometry(1, 1).volume.toFixed(1), '79.0');
  assert.ok(gasGeometry(1, 1).water < 1e-8);
  assert.equal(gasGeometry(1, 1).top.toFixed(1), '16.2');
  assert.equal(gasGeometry(1, 1, true).volume.toFixed(1), '100.0');
});

test('2.3: recording is gated by baseline, waiting, and equalisation', async () => {
  const { freshExperiment, act, advance } = await load();
  let s = freshExperiment();
  assert.deepEqual(act(s, 'start'), s);
  assert.equal(act(s, 'after').after, null);
  s = act(s, 'before'); s = act(s, 'start');
  s = advance(s, 6); assert.equal(s.progress, .5);
  s = act(s, 'pause'); assert.equal(advance(s, 6).progress, .5);
  s = act(s, 'pause'); s = advance(s, 6);
  assert.equal(s.phase, 'settled');
  assert.equal(act(s, 'after').after, null);
  assert.equal(act(s, 'align').phase, 'settled');
  s = act(s, 'wait'); s = advance(s, 3); assert.equal(s.phase, 'stable');
  s = act(s, 'align'); assert.equal(act(s, 'after').after, null);
  s = advance(s, 1.2); assert.equal(s.phase, 'aligned');
  s = act(s, 'after'); assert.equal(s.before, 100); assert.equal(s.after, 79);
  s = act(s, 'scrub', 0); assert.equal(s.preview, 0); assert.equal(s.after, 79);
  assert.equal(act(s, 'after').after, 79);
  s = act(s, 'live'); assert.equal(s.preview, null);
  assert.deepEqual(act(s, 'reset'), freshExperiment());
});

test('2.3: dry/humid proportions use one total and do not add CO2 twice', async () => {
  const { airComposition } = await load();
  for (const water of [0, 1, 2, 3, 4]) {
    const c = airComposition(water);
    assert.ok(Math.abs(Object.values(c).reduce((a, b) => a + b, 0) - 100) < 1e-8);
  }
  assert.deepEqual(airComposition(2), { nitrogen: 76.44, oxygen: 20.58, other: .98, water: 2 });
  assert.deepEqual(airComposition(2, true), airComposition(0));
});

test('2.3: upright cup allows slight compression; tilt changes water entry', async () => {
  const { cupGeometry } = await load();
  const g = cupGeometry(6, 0);
  assert.ok(g.water > -6 && g.water < -5.8);
  assert.ok(Math.abs((1 - g.water / 1033) * 20 * (4 - g.water) - 200) < 1e-8);
  assert.equal(cupGeometry(6, 100).water, 0);
  const escaped = cupGeometry(6, 100).vent;
  assert.ok(cupGeometry(6, 0, escaped).water > 0);
  assert.equal(cupGeometry(-2, 100).vent, 0);
});

test('2.3: integrated report checks evidence instead of reusing main experiment', async () => {
  const { checkReport } = await load();
  const correct = { loss: '30.0', percent: '20.0', composition: 'mixture', fuel: 'wood' };
  assert.equal(checkReport({}).result, 'incomplete');
  assert.equal(checkReport(correct).result, 'correct');
  for (const change of [{ percent: '21' }, { percent: '25' }, { loss: '21' }, { composition: 'pure' }, { fuel: 'oxygen' }, { loss: 'NaN' }]) {
    assert.equal(checkReport({ ...correct, ...change }).result, 'revise');
  }
});
