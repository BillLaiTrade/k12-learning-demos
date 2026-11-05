const {test}=require('node:test'),assert=require('node:assert/strict'),{openBench}=require('./helpers/convex-bench-fixture.cjs');
test('顯微鏡立體剖面、精簡標示與備用畫面',{timeout:120000},async t=>{
 const f=await openBench(t),{p}=f,r=p.locator('#microscope-lab');
 await p.waitForFunction(()=>document.querySelector('#microscope-lab').dataset.microRender==='3d');
 await t.test('主圖僅保留三個定位，預設顯示輔助光路與圖例',async()=>{
  assert.deepEqual(await r.locator('.micro-labels .micro-label').allTextContents(),['目鏡','中間像','物鏡']);
  assert.equal(await r.locator('[data-micro-ray]').count(),4);assert.equal(await r.locator('[data-micro-rays]').getAttribute('aria-pressed'),'true');assert.equal(await r.locator('[data-micro-point=top]').isEnabled(),true);assert.equal(await r.locator('.micro-key').isVisible(),true);assert.equal(await r.locator('[data-micro-model]').isVisible(),true);
 });
 await t.test('完整成像包含兩個近看入口，關係線與返回操作反映範圍',async()=>{
  assert.equal(await r.getAttribute('data-view'),'whole');assert.equal(await r.locator('[data-set=micro]').count(),2);assert.deepEqual(await r.locator('[data-set=micro]').evaluateAll(es=>es.map(e=>e.getAttribute('aria-pressed'))),['false','false']);assert.equal(await r.locator('[data-micro-overview]').isVisible(),false);assert.doesNotMatch(await r.innerText(),/[①②③]/);
  await r.locator('.micro-workspace').scrollIntoViewIfNeeded();await f.frame();
  assert.equal(await r.locator('[data-micro-process]').getAttribute('role'),'group');assert.equal(await r.locator('[data-micro-process] [data-set=micro]').count(),2);assert.equal(await r.locator('.micro-detail-controls').count(),0);assert.equal(await r.locator('[data-micro-process]').getByRole('button',{name:'物鏡如何成像',exact:true}).count(),1);
  const backgrounds=()=>r.locator('[data-micro-process] > [data-micro-range]').evaluateAll(es=>es.map(e=>getComputedStyle(e).backgroundColor));
  for(const [scope,selected,muted]of [['objective',[0,4],[8]],['eyepiece',[4,8],[0]]]){await r.locator(`[data-set=micro][data-value=${scope}]`).click();await f.frame();await p.waitForFunction(scope=>getComputedStyle(document.querySelector(`[data-micro-process] [data-micro-range="${scope}"]`)).backgroundColor==='rgb(220, 232, 201)',scope);assert.equal(await r.getAttribute('data-view'),scope);assert.equal(await r.locator('[data-micro-overview]').isVisible(),true);assert.match(await r.locator('[data-micro-scope]').innerText(),scope==='objective'?/目前近看：物鏡成像/:/目前近看：目鏡觀察/);const colors=await backgrounds();for(const i of selected)assert.notEqual(colors[i],'rgba(0, 0, 0, 0)',JSON.stringify({scope,i,colors}));for(const i of muted)assert.equal(colors[i],'rgba(0, 0, 0, 0)');assert.match(await r.locator('[data-micro-process]').innerText(),/原物.*物鏡.*中間像.*目鏡.*眼睛/s);}
  await r.locator('[data-micro-overview]').focus();await p.keyboard.press('Enter');assert.equal(await r.getAttribute('data-view'),'whole');assert.equal(await p.evaluate(()=>document.activeElement.id),'micro-process-title');assert.equal(await r.locator('[data-micro-overview]').isVisible(),false);
 });
 await t.test('同一中間像連接兩段，前後比較的圖案一致且角色明確',async()=>{
  await r.locator('[data-set=micro][data-value=objective]').click();await r.locator('.micro-comparison').scrollIntoViewIfNeeded();await f.frame();
  const grooveSide=svg=>r.locator(svg+' [data-specimen-groove]').evaluate(e=>{const b=e.getBBox(),m=e.getCTM(),x=(b.x+b.width/2)*m.a+(b.y+b.height/2)*m.c+m.e,origin=new DOMPoint(0,0).matrixTransform(m);return Math.sign(x-origin.x);});
  const roundEndSide=svg=>r.locator(svg+' [data-micro-specimen] circle[cy="-88"]').evaluate(e=>{const m=e.getCTM(),end=new DOMPoint(0,-88).matrixTransform(m),center=new DOMPoint(0,0).matrixTransform(m);return Math.sign(end.y-center.y);});
  assert.equal(await roundEndSide('[data-micro-before]'),-1);assert.equal(await roundEndSide('[data-micro-preview]'),1);
  assert.equal(await grooveSide('[data-micro-before]'),1);assert.equal(await grooveSide('[data-micro-preview]'),-1);assert.match(await r.locator('[data-micro-before-direction]').innerText(),/圓端朝上.*口溝在右/);assert.match(await r.locator('[data-micro-after-direction]').innerText(),/圓端朝下.*口溝在左/);
  assert.doesNotMatch(await r.innerText(),/\bA\b/);
  assert.equal(await r.getAttribute('data-view'),'objective');const middleNode=await r.locator('[data-micro-a-symbol]').elementHandle(),middle=await r.locator('[data-micro-a-symbol]').innerHTML(),firstImage=await r.locator('[data-micro-preview]').innerHTML();
  assert.match(await r.locator('[data-micro-a-role]').innerText(),/物鏡形成的實像/);assert.equal(await r.locator('[data-micro-before-label]').innerText(),'玻片上的草履蟲');assert.equal(await r.locator('[data-micro-after-label]').innerText(),'中間實像');
  await r.locator('[data-set=micro][data-value=eyepiece]').click();await r.locator('.micro-comparison').scrollIntoViewIfNeeded();await f.frame();assert.equal(await r.locator('[data-micro-before]').innerHTML(),firstImage);assert.equal(await grooveSide('[data-micro-before]'),-1);assert.equal(await grooveSide('[data-micro-preview]'),-1);assert.equal(await roundEndSide('[data-micro-before]'),1);assert.equal(await roundEndSide('[data-micro-preview]'),1);assert.equal(await r.locator('[data-micro-a-symbol]').innerHTML(),middle);assert.equal(await middleNode.evaluate(e=>e===document.querySelector('[data-micro-a-symbol]')),true);assert.match(await r.locator('[data-micro-a-role]').innerText(),/目鏡觀察的物體/);assert.match(await r.locator('[data-micro-badge]').innerText(),/不再倒轉/);assert.equal(await r.locator('[data-micro-after-label]').innerText(),'最後看見的虛像');await r.locator('[data-micro-reset]').click();
 });
 await t.test('全貌與局部切換保留物點偏好，光路與觀看結果正常',async()=>{
  await r.locator('[data-micro-point=top]').click();
  for(const step of ['objective','eyepiece','both']){await r.locator(step==='both'?'[data-micro-overview]':`[data-set=micro][data-value=${step}]`).click();assert.equal(await r.locator('[data-micro-ray]').count(),2);assert.equal(await r.locator('.extension').count(),step==='objective'?0:2);assert.match(await r.locator('[data-micro-badge]').innerText(),step==='objective'?/實像/:/虛像/);}
  await r.locator('[data-micro-reset]').click();assert.equal(await r.getAttribute('data-rays'),'true');assert.equal(await r.getAttribute('data-point'),'both');assert.equal(await r.getAttribute('data-step'),'both');
 });
 await t.test('點鏡頭與近看入口同步，返回全貌保留光路與物點',async()=>{
  await r.locator('[data-micro-rays]').click();await r.locator('.micro-label[data-micro-lens=objective]').click();assert.equal(await r.getAttribute('data-view'),'objective');assert.equal(await r.getAttribute('data-rays'),'false');assert.match(await r.locator('[data-micro-scope]').innerText(),/目前近看：物鏡成像/);assert.match(await r.locator('[data-micro-badge]').innerText(),/實像/);
  await p.waitForFunction(()=>document.querySelector('[data-micro-map-image]').naturalWidth>0);const overview=await r.locator('[data-micro-map-image]').getAttribute('src');
  await r.locator('[data-set=micro][data-value=eyepiece]').click();assert.equal(await r.getAttribute('data-view'),'eyepiece');assert.equal(await r.getAttribute('data-rays'),'false');assert.match(await r.locator('[data-micro-badge]').innerText(),/虛像/);
  await r.locator('[data-micro-rays]').click();await r.locator('[data-micro-point=bottom]').click();await r.locator('[data-micro-overview]').click();assert.equal(await r.getAttribute('data-view'),'whole');assert.deepEqual(await r.locator('[data-set=micro]').evaluateAll(es=>es.map(e=>e.getAttribute('aria-pressed'))),['false','false']);
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
  assert.equal(await r.getAttribute('data-view'),'whole');assert.equal(await r.locator('[data-micro-ray]').count(),4);assert.match(await r.locator('[data-micro-badge]').innerText(),/虛像/);
 });
 assert.deepEqual(f.errors,[]);
});
