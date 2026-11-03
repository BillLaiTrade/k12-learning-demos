const {test}=require('node:test'),assert=require('node:assert/strict'),http=require('node:http'),path=require('node:path'),fs=require('node:fs/promises');
const {chromium}=require('playwright');
test('4.5 第五六區：透射單變因、入眼遮擋與集中操作',{timeout:240000},async t=>{
 let base=process.env.COLOR_URL;
 if(!base){const root=path.resolve(__dirname,'..'),server=http.createServer(async(req,res)=>{try{let file=path.join(root,decodeURI(req.url.split('?')[0]));if((await fs.stat(file)).isDirectory())file+='/index.html';res.setHeader('Content-Type',({'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.png':'image/png'})[path.extname(file)]||'text/html');res.end(await fs.readFile(file));}catch{res.statusCode=404;res.end('missing')}});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>server.close());base=`http://127.0.0.1:${server.address().port}/units/4/parts/4.5/`;}
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'],...(process.env.COLOR_URL?{proxy:{server:process.env.HTTPS_PROXY||process.env.HTTP_PROXY}}:{})});t.after(()=>browser.close());
 const context=await browser.newContext({viewport:{width:1366,height:768},reducedMotion:'reduce'}),capture=process.env.COLOR_CAPTURE_DIR||'/tmp/unit45-path-lessons';await fs.mkdir(capture,{recursive:true});
 await context.route('**/4.5/assets/{prism-studio,torch-studio}.mjs*',r=>r.abort());
 // Inspect actual camera geometry; this hook is added only to the intercepted test response.
 await context.route('**/4.5/assets/studio.mjs*',async route=>{const response=await route.fetch(),body=(await response.text()).replace('resize();\n return{update',`resize();
 window.__pathAudit ||= {};window.__pathAudit[root.dataset.lab]=()=>{scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);const r=canvas.getBoundingClientRect(),bounds=o=>{const b=new THREE.Box3().setFromObject(o),pts=[];for(const x of[b.min.x,b.max.x])for(const y of[b.min.y,b.max.y])for(const z of[b.min.z,b.max.z]){const p=new THREE.Vector3(x,y,z).project(camera);pts.push([r.x+(p.x+1)*r.width/2,r.y+(1-p.y)*r.height/2]);}return{x:Math.min(...pts.map(p=>p[0])),right:Math.max(...pts.map(p=>p[0])),y:Math.min(...pts.map(p=>p[1])),bottom:Math.max(...pts.map(p=>p[1]))};};return{bounds:[lamp,...(sample.visible?[card]:[]),...(observer.visible?[observer]:[]),...(screen.visible?[screenPaper]:[])].map(bounds),segments:rays.children.filter(o=>o.isLine).map(o=>Array.from(o.geometry.getAttribute('position').array)),endsAtBoard:rays.children.filter(o=>o.isLine&&o.geometry.getAttribute('position').getX(0)===0).map(o=>{const p=o.geometry.getAttribute('position');return blocker.worldToLocal(new THREE.Vector3(p.getX(p.count-1),p.getY(p.count-1),p.getZ(p.count-1))).toArray();}),observer:observer.position.toArray(),blocker:blocker.visible,rays:rays.visible};};
 return{update`);await route.fulfill({response,body});});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'#s5');
 const lab=i=>page.locator(`#s${i} .lab`),state=async i=>JSON.parse(await lab(i).getAttribute('data-state'));
 async function show(i){await lab(i).scrollIntoViewIfNeeded();await page.waitForFunction(i=>document.querySelector(`#s${i} .lab`).dataset.renderer==='three',i);}
 const audit=kind=>page.evaluate(kind=>window.__pathAudit[kind](),kind);
 await t.test('四種色片×四種照明：單變因、數值色條、接收像素及動態角色一致',async()=>{
  const {filterLight}=await import('../units/4/parts/4.5/assets/color-model.mjs');await show(5);
  for(const filter of ['clear','red','green','blue']){
   await lab(5).locator('[data-filter-step=filter]').click();assert.equal((await state(5)).light,'white');await lab(5).locator(`[data-filter=${filter}]`).click();assert.equal(await lab(5).locator('[data-light=red]').isDisabled(),true);
   await lab(5).locator('[data-filter-step=light]').click();assert.equal(await lab(5).locator('[data-filter=red]').isDisabled(),true);
   for(const light of ['white','red','green','blue']){
    await lab(5).locator(`[data-light=${light}]`).click();assert.equal((await state(5)).filter,filter);
    const signal=filterLight(light,filter);assert.deepEqual(JSON.parse(await lab(5).getAttribute('data-outgoing')),signal.outgoing);
    const widths=await lab(5).locator('.surface-channel-bar b').evaluateAll(es=>es.map(e=>parseFloat(e.style.width)/100));assert.equal(widths.length,9);
    for(let j=0;j<3;j++){assert.ok(Math.abs(widths[j]-signal.incoming[j])<1e-8);assert.ok(Math.abs(widths[j+3]-signal.outgoing[j])<1e-8);assert.ok(Math.abs(widths[j+3]+widths[j+6]-widths[j])<1e-8);}
    const pixel=await lab(5).locator('[data-receiver]').evaluate(c=>[...c.getContext('2d').getImageData(c.width/2,c.height/2,1,1).data].slice(0,3));
    if(Math.max(...signal.outgoing)>.01)assert.deepEqual(pixel,signal.outgoing.map(v=>Math.round(255*(v<=.0031308?12.92*v:1.055*v**(1/2.4)-.055))));
    assert.match(await lab(5).locator('[data-comparison-note]').innerText(),/固定/);assert.equal(await lab(5).locator('.path-result [data-result]').count(),1);
    if(filter==='green'&&light==='red')assert.match(await lab(5).locator('[data-result]').innerText(),/很暗/);
   }
  }
  await lab(5).locator('[data-filter-step=filter]').click();assert.equal((await state(5)).light,'white');assert.equal((await state(5)).filter,'blue');
 });
 await t.test('反射與透射：遮板真實截住3D光線，離開物體的光保持、入眼量歸零',async()=>{
  await show(6);for(const mode of ['reflection','transmission']){
   await lab(6).locator(`[data-eye-mode=${mode}]`).click();const before=await lab(6).getAttribute('data-outgoing');
   await lab(6).locator('[data-blocker]').click();assert.equal(await lab(6).getAttribute('data-outgoing'),before);assert.deepEqual(JSON.parse(await lab(6).getAttribute('data-received')),[0,0,0]);
   const a=await audit('eye');assert.equal(a.blocker,true);const intercepted=a.endsAtBoard.filter(p=>Math.abs(p[2])<.036&&Math.abs(p[0])<.58);assert.equal(intercepted.length,1);assert.ok(Math.abs(Math.abs(intercepted[0][2])-.035)<1e-5,'endpoint lies on board face');
   const bars=await lab(6).locator('.channel-cell').last().locator('.surface-channel-bar b').evaluateAll(es=>es.map(e=>e.style.width));assert.deepEqual(bars,['0%','0%','0%']);
   await page.locator('#s6').screenshot({path:path.join(capture,`eye-${mode}-blocked.png`)});
   await lab(6).locator('[data-blocker]').click();assert.equal(await lab(6).getAttribute('data-received'),before);assert.match(await lab(6).locator('[data-result]').innerText(),/進入眼睛/);
  }
 });
 await t.test('光路開關、旋轉與鍵盤不改接收結果',async()=>{
  for(const i of [5,6]){await show(i);const before=await lab(i).getAttribute('data-outgoing'),orbit=await lab(i).getAttribute('data-orbit');await lab(i).locator('[data-rays]').click();assert.equal((await state(i)).rays,false);assert.equal((await audit(i===5?'filter':'eye')).rays,false);await lab(i).locator('[data-studio]').focus();await page.keyboard.press('ArrowLeft');await page.waitForFunction(({i,orbit})=>document.querySelector(`#s${i} .lab`).dataset.orbit!==orbit,{i,orbit});await lab(i).locator('[data-view]').click();await lab(i).locator('[data-view]').click();assert.equal(await lab(i).getAttribute('data-outgoing'),before);await lab(i).locator('[data-rays]').click();}
 });
 await t.test('八種視窗的器材、預覽、按鈕與說明完整，不遮擋或溢出',async()=>{
  const metrics=[],overlap=(a,b)=>Math.min(a.right,b.right)>Math.max(a.x,b.x)+2&&Math.min(a.bottom,b.bottom)>Math.max(a.y,b.y)+2;
  await page.reload();
  for(const [width,height]of [[1440,900],[1366,768],[1024,768],[820,900],[650,900],[390,844],[320,568],[844,390]]){
   await page.setViewportSize({width,height});for(const i of [5,6]){
    await show(i);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    const m=await lab(i).evaluate(e=>{const rect=n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom,height:r.height}};return{stage:rect(e.querySelector('.stage')),canvas:rect(e.querySelector('[data-studio]')),preview:rect(e.querySelector('.path-preview')),tools:rect(e.querySelector('.scene-tools')),comparison:rect(e.querySelector('.path-comparison')),buttons:[...e.querySelectorAll('button')].map(n=>({text:n.textContent,clipped:n.scrollWidth>n.clientWidth+2,...rect(n)})),overflow:document.documentElement.scrollWidth>innerWidth};});
    assert.equal(m.overflow,false);assert.ok(m.comparison.bottom<=m.stage.y);assert.ok(!overlap(m.preview,m.tools));
    for(const b of m.buttons){assert.ok(b.height>=44,`${i} ${width} ${b.text} height`);assert.equal(b.clipped,false,`${i} ${width} ${b.text} clipped`);}
    for(const b of (await audit(i===5?'filter':'eye')).bounds){assert.ok(!overlap(b,m.preview),`${i} ${width} preview clear`);assert.ok(!overlap(b,m.tools),`${i} ${width} tools clear`);assert.ok(b.x>=m.canvas.x-2&&b.right<=m.canvas.right+2&&b.y>=m.canvas.y-2&&b.bottom<=m.canvas.bottom+2,`${i} ${width} apparatus visible: ${JSON.stringify({b,canvas:m.canvas})}`);}
    await page.locator(`.route a[href="#s${i}"]`).click();await page.screenshot({path:path.join(capture,`s${i}-${width}x${height}.png`)});metrics.push({i,width,height,...m});
   }
  }await fs.writeFile(path.join(capture,'layout.json'),JSON.stringify(metrics,null,2));
 });
 await t.test('手機原生點按與拖曳、WebGL備援兩種入眼光路及取消',async()=>{
  const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});try{
   await mobile.route('**/4.5/assets/{prism-studio,torch-studio}.mjs*',r=>r.abort());const p=await mobile.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(base+'#s5');const l=p.locator('#s5 .lab');await l.scrollIntoViewIfNeeded();await p.waitForFunction(()=>document.querySelector('#s5 .lab').dataset.renderer==='three');
   await l.locator('[data-filter=green]').tap();await l.locator('[data-filter-step=light]').tap();await l.locator('[data-light=red]').tap();assert.match(await l.locator('[data-result]').innerText(),/很暗/);
   const canvas=l.locator('[data-studio]');await canvas.scrollIntoViewIfNeeded();const r=await canvas.boundingBox(),orbit=await l.getAttribute('data-orbit'),session=await mobile.newCDPSession(p);await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+r.width*.35,y:r.y+r.height*.65}]});await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:r.x+r.width*.65,y:r.y+r.height*.65}]});await session.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await p.waitForFunction(old=>document.querySelector('#s5 .lab').dataset.orbit!==old,orbit);assert.deepEqual(JSON.parse(await l.getAttribute('data-outgoing')),[.008,0,0]);
   await mobile.route('**/4.5/assets/studio.mjs*',r=>r.abort());await p.reload();const eye=p.locator('#s6 .lab');await eye.scrollIntoViewIfNeeded();await p.waitForSelector('#s6 .is-fallback');
   for(const mode of ['reflection','transmission']){await eye.locator(`[data-eye-mode=${mode}]`).tap();await eye.locator('[data-blocker]').tap();assert.deepEqual(JSON.parse(await eye.getAttribute('data-received')),[0,0,0]);const svg=await eye.locator('[data-diagram]').innerHTML();assert.match(svg,/眼睛/);assert.ok(!svg.includes('觀察位置'));await p.locator('#s6').screenshot({path:path.join(capture,`fallback-${mode}.png`)});await eye.locator('[data-blocker]').tap();assert.ok(JSON.parse(await eye.getAttribute('data-received'))[1]>.8);}
  }finally{await mobile.close();}assert.deepEqual(errors,[]);
 });
});
