const {test}=require('node:test'),assert=require('node:assert/strict'),{openBench}=require('./helpers/convex-bench-fixture.cjs');
test('顯微鏡立體剖面、精簡標示與備用畫面',{timeout:120000},async t=>{
 const f=await openBench(t),{p}=f,r=p.locator('#microscope-lab');
 await p.waitForFunction(()=>document.querySelector('#microscope-lab').dataset.microRender==='3d');
 await t.test('主圖僅保留三個定位，預設不顯示光路圖例',async()=>{
  assert.deepEqual(await r.locator('.micro-labels .micro-label').allTextContents(),['目鏡','中間像','物鏡']);
  assert.equal(await r.locator('.micro-key').isVisible(),false);assert.equal(await r.locator('[data-micro-model]').isVisible(),true);
 });
 await t.test('步驟切換保留物點偏好，光路與觀看結果正常',async()=>{
  await r.locator('[data-micro-rays]').click();await r.locator('[data-micro-point=top]').click();
  for(const step of ['objective','eyepiece','both']){await r.locator(`[data-set=micro][data-value=${step}]`).click();assert.equal(await r.locator('[data-micro-ray]').count(),2);assert.equal(await r.locator('.extension').count(),step==='objective'?0:2);assert.match(await r.locator('[data-micro-badge]').innerText(),step==='objective'?/實像/:/虛像/);}
  await r.locator('[data-micro-reset]').click();assert.equal(await r.getAttribute('data-rays'),'false');assert.equal(await r.getAttribute('data-point'),'both');assert.equal(await r.getAttribute('data-step'),'objective');
 });
 await t.test('點鏡頭與步驟同步近看，返回全貌保留光路與物點',async()=>{
  await r.locator('.micro-label[data-micro-lens=objective]').click();assert.equal(await r.getAttribute('data-view'),'objective');assert.equal(await r.getAttribute('data-rays'),'false');assert.match(await r.locator('[data-micro-detail-title]').innerText(),/近看物鏡/);assert.match(await r.locator('[data-micro-badge]').innerText(),/實像/);
  await p.waitForFunction(()=>document.querySelector('[data-micro-map-image]').naturalWidth>0);const overview=await r.locator('[data-micro-map-image]').getAttribute('src');
  await r.locator('[data-set=micro][data-value=eyepiece]').click();assert.equal(await r.getAttribute('data-view'),'eyepiece');assert.equal(await r.getAttribute('data-rays'),'false');assert.match(await r.locator('[data-micro-badge]').innerText(),/虛像/);
  await r.locator('[data-micro-rays]').click();await r.locator('[data-micro-point=bottom]').click();await r.locator('[data-micro-overview]').click();assert.equal(await r.getAttribute('data-view'),'whole');assert.equal(await r.locator('[data-set=micro][data-value=both]').getAttribute('aria-pressed'),'true');
  await r.locator('.micro-pick[data-micro-lens=objective]').click();assert.equal(await r.getAttribute('data-view'),'objective');assert.equal(await r.getAttribute('data-point'),'bottom');assert.equal(await r.getAttribute('data-rays'),'true');assert.equal(await r.locator('[data-micro-ray]').count(),2);assert.equal(await r.locator('[data-micro-map-image]').getAttribute('src'),overview);
  await r.locator('[data-micro-overview]').click();await r.locator('.micro-label[data-micro-lens=eyepiece]').focus();await p.keyboard.press('Enter');assert.equal(await r.getAttribute('data-view'),'eyepiece');assert.equal(await p.evaluate(()=>document.activeElement?.dataset.microLens),'eyepiece');await r.locator('[data-micro-reset]').click();
 });
 await t.test('立體顯示不可用時，精簡剖面與操作仍可使用',async()=>{
  await p.route('**/microscope-model.mjs*',route=>route.fulfill({contentType:'text/javascript',body:"throw Error('simulated unavailable')"}));await p.reload({waitUntil:'networkidle'});
  await p.waitForFunction(()=>document.querySelector('#microscope-lab').dataset.microRender==='fallback');
  assert.equal(await r.locator('[data-micro-model]').isVisible(),false);assert.equal(await r.locator('.micro-labels .micro-label').count(),3);await r.locator('[data-set=micro][data-value=eyepiece]').click();assert.equal(await r.getAttribute('data-view'),'eyepiece');assert.equal(await r.locator('.micro-map-fallback').isVisible(),true);await r.locator('[data-micro-overview]').click();
  await r.locator('[data-micro-rays]').click();await r.locator('[data-set=micro][data-value=both]').click();assert.equal(await r.locator('[data-micro-ray]').count(),4);assert.match(await r.locator('[data-micro-badge]').innerText(),/虛像/);
 });
 assert.deepEqual(f.errors,[]);
});
