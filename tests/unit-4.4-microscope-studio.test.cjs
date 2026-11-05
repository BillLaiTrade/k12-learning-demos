const {test}=require('node:test'),assert=require('node:assert/strict'),{openBench}=require('./helpers/convex-bench-fixture.cjs');
test('顯微鏡立體剖面、精簡標示與備用畫面',{timeout:120000},async t=>{
 const f=await openBench(t),{p}=f,r=p.locator('#microscope-lab');
 await p.waitForFunction(()=>document.querySelector('#microscope-lab').dataset.microRender==='3d');
 await t.test('主圖僅保留三個定位，預設不顯示光路圖例',async()=>{
  assert.deepEqual(await r.locator('.micro-scene .micro-label').allTextContents(),['目鏡','中間像','物鏡']);
  assert.equal(await r.locator('.micro-key').isVisible(),false);assert.equal(await r.locator('[data-micro-model]').isVisible(),true);
 });
 await t.test('步驟切換保留物點偏好，光路與觀看結果正常',async()=>{
  await r.locator('[data-micro-rays]').click();await r.locator('[data-micro-point=top]').click();
  for(const step of ['objective','eyepiece','both']){await r.locator(`[data-set=micro][data-value=${step}]`).click();assert.equal(await r.locator('[data-micro-ray]').count(),2);assert.equal(await r.locator('.extension').count(),step==='objective'?0:2);assert.match(await r.locator('[data-micro-badge]').innerText(),step==='objective'?/實像/:/虛像/);}
  await r.locator('[data-micro-reset]').click();assert.equal(await r.getAttribute('data-rays'),'false');assert.equal(await r.getAttribute('data-point'),'both');assert.equal(await r.getAttribute('data-step'),'objective');
 });
 await t.test('立體顯示不可用時，精簡剖面與操作仍可使用',async()=>{
  await p.route('**/microscope-model.mjs*',route=>route.fulfill({contentType:'text/javascript',body:"throw Error('simulated unavailable')"}));await p.reload({waitUntil:'networkidle'});
  await p.waitForFunction(()=>document.querySelector('#microscope-lab').dataset.microRender==='fallback');
  assert.equal(await r.locator('[data-micro-model]').isVisible(),false);assert.equal(await r.locator('.micro-scene .micro-label').count(),3);
  await r.locator('[data-micro-rays]').click();await r.locator('[data-set=micro][data-value=both]').click();assert.equal(await r.locator('[data-micro-ray]').count(),4);assert.match(await r.locator('[data-micro-badge]').innerText(),/虛像/);
 });
 assert.deepEqual(f.errors,[]);
});
