const {test}=require('node:test'),assert=require('node:assert/strict'),{openBench}=require('./helpers/convex-bench-fixture.cjs');
test('顯微鏡立體剖面、精簡標示與備用畫面',{timeout:120000},async t=>{
 const f=await openBench(t),{p}=f,r=p.locator('#microscope-lab');
 await p.waitForFunction(()=>document.querySelector('#microscope-lab').dataset.microRender==='3d');
 await t.test('主圖僅保留三個定位，預設顯示輔助光路與圖例',async()=>{
  assert.deepEqual(await r.locator('.micro-labels .micro-label').allTextContents(),['目鏡','中間像','物鏡']);
  assert.equal(await r.locator('[data-micro-ray]').count(),4);assert.equal(await r.locator('[data-micro-rays]').getAttribute('aria-pressed'),'true');assert.equal(await r.locator('[data-micro-point=top]').isEnabled(),true);assert.equal(await r.locator('.micro-key').isVisible(),true);assert.equal(await r.locator('[data-micro-model]').isVisible(),true);
 });
 await t.test('步驟切換保留物點偏好，光路與觀看結果正常',async()=>{
  await r.locator('[data-micro-point=top]').click();
  for(const step of ['objective','eyepiece','both']){await r.locator(`[data-set=micro][data-value=${step}]`).click();assert.equal(await r.locator('[data-micro-ray]').count(),2);assert.equal(await r.locator('.extension').count(),step==='objective'?0:2);assert.match(await r.locator('[data-micro-badge]').innerText(),step==='objective'?/實像/:/虛像/);}
  await r.locator('[data-micro-reset]').click();assert.equal(await r.getAttribute('data-rays'),'true');assert.equal(await r.getAttribute('data-point'),'both');assert.equal(await r.getAttribute('data-step'),'objective');
 });
 await t.test('點鏡頭與步驟同步近看，返回全貌保留光路與物點',async()=>{
  await r.locator('[data-micro-rays]').click();await r.locator('.micro-label[data-micro-lens=objective]').click();assert.equal(await r.getAttribute('data-view'),'objective');assert.equal(await r.getAttribute('data-rays'),'false');assert.match(await r.locator('[data-micro-detail-title]').innerText(),/近看物鏡/);assert.match(await r.locator('[data-micro-badge]').innerText(),/實像/);
  await p.waitForFunction(()=>document.querySelector('[data-micro-map-image]').naturalWidth>0);const overview=await r.locator('[data-micro-map-image]').getAttribute('src');
  await r.locator('[data-set=micro][data-value=eyepiece]').click();assert.equal(await r.getAttribute('data-view'),'eyepiece');assert.equal(await r.getAttribute('data-rays'),'false');assert.match(await r.locator('[data-micro-badge]').innerText(),/虛像/);
  await r.locator('[data-micro-rays]').click();await r.locator('[data-micro-point=bottom]').click();await r.locator('[data-micro-overview]').click();assert.equal(await r.getAttribute('data-view'),'whole');assert.equal(await r.locator('[data-set=micro][data-value=both]').getAttribute('aria-pressed'),'true');
  await r.locator('.micro-pick[data-micro-lens=objective]').click();assert.equal(await r.getAttribute('data-view'),'objective');assert.equal(await r.getAttribute('data-point'),'bottom');assert.equal(await r.getAttribute('data-rays'),'true');assert.equal(await r.locator('[data-micro-ray]').count(),2);assert.equal(await r.locator('[data-micro-map-image]').getAttribute('src'),overview);
  await r.locator('[data-micro-overview]').click();await r.locator('.micro-label[data-micro-lens=eyepiece]').focus();await p.keyboard.press('Enter');assert.equal(await r.getAttribute('data-view'),'eyepiece');assert.equal(await p.evaluate(()=>document.activeElement?.dataset.microLens),'eyepiece');await r.locator('[data-micro-reset]').click();
 });
 await t.test('下方說明卡可點選與鍵盤切換，帶回操作視窗並保留光路偏好',async()=>{
  await r.locator('[data-micro-point=bottom]').click();await r.locator('[data-micro-rays]').click();
  const card=lens=>r.locator(`[data-micro-card=${lens}]`);
  await card('eyepiece').click();await f.frame();assert.equal(await r.getAttribute('data-view'),'eyepiece');assert.equal(await r.getAttribute('data-point'),'bottom');assert.equal(await r.getAttribute('data-rays'),'false');assert.equal(await card('eyepiece').getAttribute('aria-pressed'),'true');assert.equal(await r.locator('[data-set=micro][data-value=eyepiece]').getAttribute('aria-pressed'),'true');
  assert.equal(await p.evaluate(()=>document.activeElement?.dataset.value),'eyepiece');const scroll=await r.locator('.micro-workspace').evaluate(e=>({top:e.getBoundingClientRect().top,expected:parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop)+parseFloat(getComputedStyle(e).scrollMarginTop)}));assert.ok(Math.abs(scroll.top-scroll.expected)<2,JSON.stringify(scroll));
  await card('objective').focus();await p.keyboard.press('Space');await f.frame();assert.equal(await r.getAttribute('data-view'),'objective');assert.equal(await card('objective').getAttribute('aria-pressed'),'true');assert.equal(await card('eyepiece').getAttribute('aria-pressed'),'false');assert.equal(await r.getAttribute('data-rays'),'false');await r.locator('[data-micro-reset]').click();
 });
 await t.test('立體顯示不可用時，精簡剖面與操作仍可使用',async()=>{
  await p.route('**/microscope-model.mjs*',route=>route.fulfill({contentType:'text/javascript',body:"throw Error('simulated unavailable')"}));await p.reload({waitUntil:'networkidle'});
  await p.waitForFunction(()=>document.querySelector('#microscope-lab').dataset.microRender==='fallback');
  assert.equal(await r.locator('[data-micro-model]').isVisible(),false);assert.equal(await r.locator('.micro-labels .micro-label').count(),3);await r.locator('[data-set=micro][data-value=eyepiece]').click();assert.equal(await r.getAttribute('data-view'),'eyepiece');assert.equal(await r.locator('.micro-map-fallback').isVisible(),true);await r.locator('[data-micro-overview]').click();
  await r.locator('[data-set=micro][data-value=both]').click();assert.equal(await r.locator('[data-micro-ray]').count(),4);assert.match(await r.locator('[data-micro-badge]').innerText(),/虛像/);
 });
 assert.deepEqual(f.errors,[]);
});
