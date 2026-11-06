const {test}=require('node:test'),assert=require('node:assert/strict'),{openBench}=require('./helpers/convex-bench-fixture.cjs');
test('顯微鏡立體剖面、精簡標示與備用畫面',{timeout:180000},async t=>{
 const f=await openBench(t),{p}=f,r=p.locator('#microscope-lab');
 await p.waitForFunction(()=>document.querySelector('#microscope-lab').dataset.microRender==='3d');
 await t.test('主圖僅保留三個定位，預設顯示輔助光路與圖例',async()=>{
  assert.deepEqual(await r.locator('.micro-labels .micro-label').allTextContents(),['目鏡','中間像','物鏡']);
  assert.equal(await r.locator('[data-micro-ray]').count(),4);assert.equal(await r.locator('[data-micro-rays]').getAttribute('aria-pressed'),'true');assert.equal(await r.locator('[data-micro-point],.micro-trace').count(),0);assert.deepEqual(await r.locator('.micro-tools button').allTextContents(),['隱藏輔助光路','重新觀察']);assert.match(await r.locator('.micro-key').innerText(),/不同物點/);assert.equal(await r.locator('.micro-key').isVisible(),true);assert.equal(await r.locator('[data-micro-model]').isVisible(),true);
 });
 await t.test('兩個完整框線共同包含唯一中間像，區段名稱可切換近看',async()=>{
  const process=r.locator('[data-micro-process]');
  assert.equal(await r.getAttribute('data-view'),'whole');assert.equal(await process.getAttribute('role'),'group');assert.equal(await process.locator('[data-set=micro]').count(),2);assert.equal(await process.locator('[data-micro-node=intermediate]').count(),1);assert.deepEqual(await r.locator('[data-set=micro]').evaluateAll(es=>es.map(e=>e.getAttribute('aria-pressed'))),['false','false']);assert.equal(await r.locator('[data-micro-overview]').isVisible(),false);assert.doesNotMatch(await r.innerText(),/[①②③]|中間像，同時在兩個範圍內|兩個框共同包含/);assert.equal(await process.getByRole('button',{name:'近看物鏡成像',exact:true}).count(),1);
  assert.equal(await process.locator('[data-micro-node-lens]').count(),2);assert.equal(await process.locator('[data-micro-node-original] [data-micro-specimen]').getAttribute('data-inverted'),'false');assert.equal(await process.locator('[data-micro-node-real] [data-micro-specimen]').getAttribute('data-inverted'),'true');assert.equal(await process.locator('[data-micro-node-virtual] [data-micro-specimen]').getAttribute('data-inverted'),'true');assert.equal(await process.locator('[data-micro-node=intermediate] .micro-node-kind').innerText(),'實像');assert.equal(await process.locator('[data-micro-node=eye] .micro-node-kind').innerText(),'虛像');
  await r.locator('.micro-workspace').scrollIntoViewIfNeeded();await f.frame();
  const geometry=()=>process.evaluate(e=>{const rect=n=>{const b=n.getBoundingClientRect();return{x:b.x,y:b.y,right:b.right,bottom:b.bottom}},a=e.querySelector('[data-micro-frame=objective]'),b=e.querySelector('[data-micro-frame=eyepiece]');return{objective:rect(a),eyepiece:rect(b),styles:[getComputedStyle(a).borderTopStyle,getComputedStyle(b).borderTopStyle],nodes:[...e.querySelectorAll('[data-micro-node]')].map(n=>({name:n.dataset.microNode,...rect(n)}))}});
  const g=await geometry(),inside=(n,f)=>n.x>=f.x-1&&n.right<=f.right+1&&n.y>=f.y-1&&n.bottom<=f.bottom+1;
  assert.deepEqual(g.styles,['solid','dashed']);assert.ok(Math.abs(g.eyepiece.y-g.objective.y)<1);assert.ok(Math.abs(g.eyepiece.bottom-g.objective.bottom)<1);
  for(const n of g.nodes){assert.equal(inside(n,g.objective),['original','objective','intermediate'].includes(n.name),JSON.stringify({n,g}));assert.equal(inside(n,g.eyepiece),['intermediate','eyepiece','eye'].includes(n.name),JSON.stringify({n,g}));}
  for(const scope of ['objective','eyepiece']){await r.locator(`[data-set=micro][data-value=${scope}]`).click();await f.frame();await p.waitForFunction(scope=>getComputedStyle(document.querySelector(`[data-micro-frame="${scope}"]`)).borderTopWidth==='3px',scope);assert.equal(await r.getAttribute('data-view'),scope);assert.equal(await r.locator('[data-micro-overview]').isVisible(),true);assert.match(await r.locator('[data-micro-scope]').innerText(),scope==='objective'?/目前近看：物鏡成像/:/目前近看：目鏡觀察/);assert.equal(await r.locator(`[data-set=micro][data-value=${scope}]`).getAttribute('aria-pressed'),'true');assert.equal(await process.locator('[data-micro-node=intermediate]').count(),1);}
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
 await t.test('切換保留光路開關，開啟時同時顯示兩組物點光線',async()=>{
  for(const step of ['objective','eyepiece','both']){await r.locator(step==='both'?'[data-micro-overview]':`[data-set=micro][data-value=${step}]`).click();assert.equal(await r.locator('[data-micro-ray]').count(),4);assert.equal(await r.locator('[data-micro-ray][data-point=top]').count(),2);assert.equal(await r.locator('[data-micro-ray][data-point=bottom]').count(),2);assert.equal(await r.locator('.extension').count(),step==='objective'?0:4);assert.match(await r.locator('[data-micro-badge]').innerText(),step==='objective'?/實像/:/虛像/);}
  await r.locator('[data-micro-rays]').click();for(const step of ['objective','eyepiece','both']){await r.locator(step==='both'?'[data-micro-overview]':`[data-set=micro][data-value=${step}]`).click();assert.equal(await r.locator('[data-micro-ray]').count(),0);assert.equal(await r.locator('.micro-key').isVisible(),false);}
  await r.locator('[data-micro-reset]').click();assert.equal(await r.getAttribute('data-rays'),'true');assert.equal(await r.locator('[data-micro-ray]').count(),4);assert.equal(await r.getAttribute('data-step'),'both');
 });
 await t.test('點鏡頭與近看入口同步，返回全貌保留光路開關',async()=>{
  await r.locator('[data-micro-rays]').click();await r.locator('.micro-label[data-micro-lens=objective]').click();assert.equal(await r.getAttribute('data-view'),'objective');assert.equal(await r.getAttribute('data-rays'),'false');assert.match(await r.locator('[data-micro-scope]').innerText(),/目前近看：物鏡成像/);assert.match(await r.locator('[data-micro-badge]').innerText(),/實像/);
  assert.equal(await r.locator('[data-micro-map],.micro-map').count(),0);
  await r.locator('[data-set=micro][data-value=eyepiece]').click();assert.equal(await r.getAttribute('data-view'),'eyepiece');assert.equal(await r.getAttribute('data-rays'),'false');assert.match(await r.locator('[data-micro-badge]').innerText(),/虛像/);
  await r.locator('[data-micro-rays]').click();await r.locator('[data-micro-overview]').click();assert.equal(await r.getAttribute('data-view'),'whole');assert.deepEqual(await r.locator('[data-set=micro]').evaluateAll(es=>es.map(e=>e.getAttribute('aria-pressed'))),['false','false']);
  await r.locator('.micro-pick[data-micro-lens=objective]').click();assert.equal(await r.getAttribute('data-view'),'objective');assert.equal(await r.getAttribute('data-rays'),'true');assert.equal(await r.locator('[data-micro-ray]').count(),4);
  await r.locator('[data-micro-overview]').click();await r.locator('.micro-label[data-micro-lens=eyepiece]').focus();await p.keyboard.press('Enter');assert.equal(await r.getAttribute('data-view'),'eyepiece');assert.equal(await p.evaluate(()=>document.activeElement?.dataset.microLens),'eyepiece');await r.locator('[data-micro-reset]').click();
 });
 await t.test('下方說明卡可點選與鍵盤切換，帶回操作視窗並保留光路偏好',async()=>{
  await r.locator('[data-micro-rays]').click();
  const card=lens=>r.locator(`[data-micro-card=${lens}]`);
  await card('eyepiece').click();await f.frame();assert.equal(await r.getAttribute('data-view'),'eyepiece');assert.equal(await r.getAttribute('data-rays'),'false');assert.equal(await card('eyepiece').getAttribute('aria-pressed'),'true');
  assert.equal(await r.locator('.micro-workspace > .micro-concepts').count(),1);
  assert.deepEqual(await r.locator('[data-micro-frame][data-active=true]').evaluateAll(es=>es.map(e=>e.dataset.microFrame)),['eyepiece']);
  assert.deepEqual(await r.locator('[data-micro-node][data-active=true]').evaluateAll(es=>es.map(e=>e.dataset.microNode)),['intermediate','eyepiece','eye']);
  await p.waitForFunction(()=>{const e=document.querySelector('[data-micro-frame=eyepiece]');return e.dataset.active==='true'&&getComputedStyle(e).backgroundColor!=='rgba(0, 0, 0, 0)'});
  assert.notEqual(await r.locator('[data-micro-frame=eyepiece]').evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(0, 0, 0, 0)');assert.equal(await r.locator('[data-set=micro][data-value=eyepiece]').getAttribute('aria-pressed'),'true');
  assert.equal(await p.evaluate(()=>document.activeElement?.dataset.value),'eyepiece');const scroll=await r.locator('.micro-workspace').evaluate(e=>({top:e.getBoundingClientRect().top,expected:parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop)+parseFloat(getComputedStyle(e).scrollMarginTop)}));assert.ok(Math.abs(scroll.top-scroll.expected)<2,JSON.stringify(scroll));
  await card('objective').focus();await p.keyboard.press('Space');await f.frame();assert.equal(await r.getAttribute('data-view'),'objective');assert.equal(await card('objective').getAttribute('aria-pressed'),'true');assert.equal(await card('eyepiece').getAttribute('aria-pressed'),'false');
  assert.deepEqual(await r.locator('[data-micro-node][data-active=true]').evaluateAll(es=>es.map(e=>e.dataset.microNode)),['original','objective','intermediate']);
  assert.deepEqual(await r.locator('[data-micro-frame][data-active=true]').evaluateAll(es=>es.map(e=>e.dataset.microFrame)),['objective']);
  assert.equal(await r.getAttribute('data-rays'),'false');await r.locator('[data-micro-reset]').click();
  assert.equal(await r.locator('[data-micro-frame][data-active=true],[data-micro-node][data-active=true]').count(),0);
 });
 await t.test('上下入口同步，重複選取不退出；中間像與空白返回全貌',async()=>{
  await r.locator('[data-micro-reset]').click();
  await r.locator('[data-micro-rays]').click();
  for(const [node,scope] of [['original','objective'],['objective','objective'],['eyepiece','eyepiece'],['eye','eyepiece']]){
   const b=r.locator(`[data-micro-node=${node}]`);assert.equal(await b.evaluate(e=>e.tagName),'BUTTON');await b.click();assert.equal(await r.getAttribute('data-view'),scope);assert.equal(await r.locator(`[data-micro-card=${scope}]`).getAttribute('aria-pressed'),'true');await b.click();assert.equal(await r.getAttribute('data-view'),scope);
   await r.locator(`[data-micro-card=${scope}]`).click();assert.equal(await r.getAttribute('data-view'),scope);
  }
  await r.locator('[data-micro-node=intermediate]').focus();await p.keyboard.press('Enter');assert.equal(await r.getAttribute('data-view'),'whole');assert.equal(await r.locator('[data-micro-frame][data-active=true]').count(),0);
  await r.locator('[data-micro-node=objective]').click();await r.locator('.micro-context-heading').click({position:{x:5,y:5}});assert.equal(await r.getAttribute('data-view'),'whole');
  await r.locator('[data-micro-node=eye]').click();await r.locator('.micro-concepts').click({position:{x:2,y:2}});assert.equal(await r.getAttribute('data-view'),'whole');
  assert.equal(await r.getAttribute('data-rays'),'false');await r.locator('[data-micro-reset]').click();
 });
 await t.test('實像虛像保留相同標本，以外框區分，圖例貼合文字高度',async()=>{
  await r.locator('[data-micro-reset]').click();
  const real=r.locator('[data-micro-node-real] [data-specimen-body]'),virtual=r.locator('[data-micro-node-virtual] [data-specimen-body]');
  assert.equal(await real.getAttribute('stroke-dasharray'),null);assert.equal(await virtual.getAttribute('stroke-dasharray'),null);assert.equal(await real.getAttribute('fill'),await virtual.getAttribute('fill'));
  const specimen=selector=>r.locator(selector+' [data-micro-specimen]').evaluate(e=>[...e.children].filter(n=>!n.hasAttribute('data-micro-image-frame')).map(n=>n.outerHTML));
  assert.deepEqual(await specimen('[data-micro-node-real]'),await specimen('[data-micro-node-virtual]'));
  assert.equal(await r.locator('[data-micro-node-real] [data-micro-image-frame]').getAttribute('stroke-dasharray'),null);assert.equal(await r.locator('[data-micro-node-virtual] [data-micro-image-frame]').getAttribute('stroke-dasharray'),'12 9');
  await r.locator('[data-micro-node=eye]').click();assert.equal(await r.locator('[data-micro-preview] [data-micro-specimen]').getAttribute('data-image-kind'),'virtual');assert.equal(await r.locator('[data-micro-before] [data-micro-specimen]').getAttribute('data-image-kind'),'real');assert.deepEqual(await specimen('[data-micro-before]'),await specimen('[data-micro-preview]'));
  const color=await r.locator('[data-micro-frame=eyepiece]').evaluate(e=>getComputedStyle(e).backgroundColor);assert.match(color,/255, 242, 223/);
  const key=await r.locator('.micro-key').evaluate(e=>({height:e.getBoundingClientRect().height,pad:parseFloat(getComputedStyle(e).paddingTop)+parseFloat(getComputedStyle(e).paddingBottom)}));assert.ok(key.height<50,JSON.stringify(key));assert.equal(key.pad,10);await r.locator('[data-micro-reset]').click();
 });
 await t.test('立體顯示不可用時，精簡剖面與操作仍可使用',async()=>{
  await p.route('**/microscope-model.mjs*',route=>route.fulfill({contentType:'text/javascript',body:"throw Error('simulated unavailable')"}));await p.reload({waitUntil:'networkidle'});
  await p.waitForFunction(()=>document.querySelector('#microscope-lab').dataset.microRender==='fallback');
  assert.equal(await r.locator('[data-micro-model]').isVisible(),false);assert.equal(await r.locator('.micro-labels .micro-label').count(),3);await r.locator('[data-set=micro][data-value=eyepiece]').click();assert.equal(await r.getAttribute('data-view'),'eyepiece');assert.equal(await r.locator('.micro-map').count(),0);await r.locator('[data-micro-overview]').click();
  assert.equal(await r.getAttribute('data-view'),'whole');assert.equal(await r.locator('[data-micro-ray]').count(),4);assert.match(await r.locator('[data-micro-badge]').innerText(),/虛像/);
 });
 assert.deepEqual(f.errors,[]);
});
