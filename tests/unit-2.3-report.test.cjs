const { test } = require('node:test');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
test('2.3 integrated report checks evidence, completeness and misconceptions', async t => {
  const { reportRules, evaluateGasReport } = await import(pathToFileURL(path.resolve(__dirname, '../units/2/parts/2.3/assets/air-report.mjs')));
  const valid = Object.fromEntries(reportRules.map(rule => [rule.name, rule.expected]));
  await t.test('unanswered form names every missing item without claiming completion', () => {
    const result = evaluateGasReport({}); assert.equal(result.correct, false); assert.equal(result.complete, false); assert.equal(result.missing.length, 6); assert.deepEqual(result.corrections, []);
  });
  await t.test('fully supported report is accepted', () => {
    const result = evaluateGasReport(valid); assert.equal(result.correct, true); assert.equal(result.complete, true); assert.deepEqual(result.corrections, []);
  });
  await t.test('each misconception identifies the relevant observation and destination', () => {
    for (const rule of reportRules) {
      const result = evaluateGasReport({ ...valid, [rule.name]: 'unsupported' });
      assert.equal(result.correct, false); assert.equal(result.complete, true); assert.equal(result.corrections.length, 1);
      assert.equal(result.corrections[0].name, rule.name); assert.ok(result.corrections[0].hint); assert.match(result.corrections[0].target, /^s[2346]$/);
    }
  });
});
