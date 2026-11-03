const {test}=require('node:test'),assert=require('node:assert/strict'),http=require('node:http'),path=require('node:path'),fs=require('node:fs/promises');
const {chromium}=require('playwright');
const {PNG}=require('pngjs');
test('4.5 第五六區：三組獨立色光條件、入眼遮擋與集中操作',{timeout:240000},async t=>{
 let base=process.env.COLOR_URL;
 if(!base){const root=path.resolve(__dirname,'..'),server=http.createServer(async(req,res)=>{try{let file=path.join(root,decodeURI(req.url.split('?')[0]));if((await fs.stat(file)).isDirectory())file+='/index.html';res.setHeader('Content-Type',({'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.png':'image/png'})[path.extname(file)]||'text/html');res.end(await fs.readFile(file));}catch{res.statusCode=404;res.end('missing')}});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>server.close());base=`http://127.0.0.1:${server.address().port}/units/4/parts/4.5/`;}
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'],...(process.env.COLOR_URL?{proxy:{server:process.env.HTTPS_PROXY||process.env.HTTP_PROXY}}:{})});t.after(()=>browser.close());
 const context=await browser.newContext({viewport:{width:1366,height:768},reducedMotion:'reduce'}),capture=process.env.COLOR_CAPTURE_DIR||'/tmp/unit45-path-lessons';await fs.mkdir(capture,{recursive:true});
 await context.route('**/4.5/assets/{prism-studio,torch-studio}.mjs*',r=>r.abort());
 // Inspect actual camera geometry; this hook is added only to the intercepted test response.
 await context.route('**/4.5/assets/studio.mjs*',async route=>{const response=await route.fetch(),body=(await response.text()).replace('resize();\n return{update',`resize();
 window.__pathAudit ||= {};window.__pathAudit[root.dataset.lab]=()=>{scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);const r=canvas.getBoundingClientRect(),bounds=o=>{const b=new THREE.Box3().setFromObject(o),pts=[];for(const x of[b.min.x,b.max.x])for(const y of[b.min.y,b.max.y])for(const z of[b.min.z,b.max.z]){const p=new THREE.Vector3(x,y,z).project(camera);pts.push([r.x+(p.x+1)*r.width/2,r.y+(1-p.y)*r.height/2]);}return{x:Math.min(...pts.map(p=>p[0])),right:Math.max(...pts.map(p=>p[0])),y:Math.min(...pts.map(p=>p[1])),bottom:Math.max(...pts.map(p=>p[1]))};};const p=new THREE.Vector3(3.4,1.65,0).project(camera);return{paperPoint:{x:r.x+(p.x+1)*r.width/2,y:r.y+(1-p.y)*r.height/2},paperIsolated:filterPaperAppearance?screenPaper.parent===filterPaperAppearance.scene:null,paperLights:(filterPaperAppearance?.scene.children||[]).filter(o=>o.isLight).map(o=>o.color.toArray()),bounds:[lamp,...(sample.visible?[card]:[]),...(observer.visible?[observer]:[]),...(screen.visible?[screenPaper]:[])].map(bounds),segments:rays.children.filter(o=>o.isLine).map(o=>Array.from(o.geometry.getAttribute('position').array)),endsAtBoard:rays.children.filter(o=>o.isLine&&o.geometry.getAttribute('position').getX(0)===0).map(o=>{const p=o.geometry.getAttribute('position');return blocker.worldToLocal(new THREE.Vector3(p.getX(p.count-1),p.getY(p.count-1),p.getZ(p.count-1))).toArray();}),paper:{type:screenPaper.material.type,colour:screenPaper.material.color.toArray(),emissive:screenPaper.material.emissive?.toArray(),roughness:screenPaper.material.roughness,metalness:screenPaper.material.metalness},spot:(filterPaperAppearance?.scene||scene).children.filter(o=>o.isSpotLight).map(o=>({colour:o.color.toArray(),visible:o.visible})),observer:observer.position.toArray(),blocker:blocker.visible,rays:rays.visible};};
 return{update`);await route.fulfill({response,body});});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'#s5');
 const lab=i=>page.locator(`#s${i} .lab`),state=async i=>JSON.parse(await lab(i).getAttribute('data-state'));
 async function show(i){await lab(i).scrollIntoViewIfNeeded();await page.waitForFunction(i=>document.querySelector(`#s${i} .lab`).dataset.renderer==='three',i);}
 const audit=kind=>page.evaluate(kind=>window.__pathAudit[kind](),kind);
 await t.test('80種光源／色片／紙張組合：獨立選擇、三段色條與接收像素同步',async()=>{
  const {filterPaperLight}=await import('../units/4/parts/4.5/assets/filter-paper-model.mjs');
  const {MATERIALS}=await import('../units/4/parts/4.5/assets/color-model.mjs');await show(5);
  assert.equal((await state(5)).light,'white');assert.equal((await state(5)).filter,'green');assert.equal((await state(5)).material,'white');
  assert.equal(await lab(5).locator('select:enabled').count(),3);assert.equal(await lab(5).locator('[data-filter-step]').count(),0);assert.deepEqual(await lab(5).locator('select').evaluateAll(es=>es.map(e=>e.options.length)),[4,4,5]);assert.equal(await lab(5).locator('.filter-controls fieldset').count(),3);assert.equal(await lab(5).locator('.filter-controls button:disabled').count(),0);
  for(const light of ['white','red','green','blue']){
   const prior=await state(5);await lab(5).locator('[data-filter-setting=light]').selectOption(light);assert.equal((await state(5)).filter,prior.filter);assert.equal((await state(5)).material,prior.material);
   for(const filter of ['clear','red','green','blue']){
    const prior=await state(5);await lab(5).locator('[data-filter-setting=filter]').selectOption(filter);assert.equal((await state(5)).light,light);assert.equal((await state(5)).material,prior.material);
    for(const paper of ['white','red','green','blue','black']){
     await lab(5).locator('[data-filter-setting=material]').selectOption(paper);const actual=await state(5);assert.equal(actual.light,light);assert.equal(actual.filter,filter);assert.equal(actual.material,paper);
     const signal=filterPaperLight(light,filter,paper);for(const key of ['incoming','transmitted','outgoing','filter-absorbed','paper-absorbed']){const prop=key.replace(/-([a-z])/g,(_,c)=>c.toUpperCase());assert.deepEqual(JSON.parse(await lab(5).getAttribute('data-'+key)),signal[prop]);}
     const widths=await lab(5).locator('.surface-channel-bar b').evaluateAll(es=>es.map(e=>parseFloat(e.style.width)/100));
     const expected=[...signal.incoming,...signal.transmitted,...signal.outgoing];assert.equal(widths.length,9);for(let j=0;j<9;j++)assert.ok(Math.abs(widths[j]-expected[j])<1e-8);
     const pixel=await lab(5).locator('[data-receiver]').evaluate(c=>[...c.getContext('2d').getImageData(c.width/2,c.height/2,1,1).data].slice(0,3));
     assert.deepEqual(pixel,signal.outgoing.map(v=>Math.round(255*(v*.28<=.0031308?v*.28*12.92:1.055*(v*.28)**(1/2.4)-.055))));
     const a=await audit('filter');assert.equal(a.paper.type,'MeshStandardMaterial');assert.equal(a.paper.roughness,1);assert.equal(a.paper.metalness,0);assert.deepEqual(a.paper.emissive,[0,0,0]);assert.deepEqual(a.paper.colour,MATERIALS[paper].rgb);assert.deepEqual(a.spot[0].colour,signal.transmitted);assert.equal(a.paperIsolated,true);assert.ok(a.paperLights.every(rgb=>rgb.every((v,i)=>v===signal.transmitted[i])));
     assert.deepEqual(await lab(5).locator('select').evaluateAll(es=>es.map(e=>e.value)),[light,filter,paper]);assert.equal(await lab(5).locator('.path-result [data-result]').count(),1);
     if(paper==='black')assert.match(await lab(5).locator('[data-result]').innerText(),/很暗/);
    }
   }
  }
  await lab(5).locator('[data-filter-setting=light]').selectOption('white');await lab(5).locator('[data-filter-setting=filter]').selectOption('green');await lab(5).locator('[data-filter-setting=material]').selectOption('white');
  const a=await audit('filter'),outgoing=a.segments.filter(p=>p[0]>3.3);assert.ok(outgoing.length>=4);assert.ok(outgoing.every(p=>p[3]<p[0]&&p[0]<3.4),'reflected paths leave the illuminated front face, never through paper');
  await lab(5).locator('[data-rays]').click();
  async function samplePaper(name){const canvas=lab(5).locator('[data-studio]'),buffer=await canvas.screenshot({path:path.join(capture,name+'.png')}),png=PNG.sync.read(buffer),r=await canvas.boundingBox(),point=(await audit('filter')).paperPoint;const x=Math.floor((point.x-r.x)/r.width*png.width),y=Math.floor((point.y-r.y)/r.height*png.height);assert.ok(x>=0&&x<png.width&&y>=0&&y<png.height);return [...png.data.slice((y*png.width+x)*4,(y*png.width+x)*4+3)];}
  const bright=await samplePaper('paper-guides-hidden');assert.ok(bright[1]>bright[0]+20&&bright[1]>bright[2]+20&&bright[1]>30,'green patch remains lit with guides hidden');
  await lab(5).locator('[data-filter-setting=material]').selectOption('red');const redPaper=await samplePaper('paper-green-on-red');assert.ok(redPaper.reduce((a,v)=>a+v,0)<bright.reduce((a,v)=>a+v,0)*.45,'bench white fill must not make red paper bright');
  await lab(5).locator('[data-filter-setting=material]').selectOption('white');await lab(5).locator('[data-filter-setting=light]').selectOption('red');const redSource=await samplePaper('paper-red-through-green');assert.ok(redSource.reduce((a,v)=>a+v,0)<bright.reduce((a,v)=>a+v,0)*.45);
  await fs.writeFile(path.join(capture,'paper-pixels.json'),JSON.stringify({bright,redPaper,redSource},null,2));await lab(5).locator('[data-filter-setting=light]').selectOption('white');await lab(5).locator('[data-rays]').click();
  await page.locator('#s5').screenshot({path:path.join(capture,'filter-paper-default.png')});
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
  await show(5);const select=lab(5).locator('[data-filter-setting=light]'),before=await state(5);await select.focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');assert.equal((await state(5)).light,'red');assert.equal((await state(5)).filter,before.filter);assert.equal((await state(5)).material,before.material);assert.equal(await select.evaluate(e=>e===document.activeElement),true);await select.selectOption('white');
  for(const i of [5,6]){await show(i);const before=await lab(i).getAttribute('data-outgoing'),orbit=await lab(i).getAttribute('data-orbit');await lab(i).locator('[data-rays]').click();assert.equal((await state(i)).rays,false);assert.equal((await audit(i===5?'filter':'eye')).rays,false);await lab(i).locator('[data-studio]').focus();await page.keyboard.press('ArrowLeft');await page.waitForFunction(({i,orbit})=>document.querySelector(`#s${i} .lab`).dataset.orbit!==orbit,{i,orbit});await lab(i).locator('[data-view]').click();await lab(i).locator('[data-view]').click();assert.equal(await lab(i).getAttribute('data-outgoing'),before);await lab(i).locator('[data-rays]').click();}
 });
 await t.test('八種視窗的器材、預覽、精簡選單與說明完整，不遮擋或溢出',async()=>{
  const metrics=[],overlap=(a,b)=>Math.min(a.right,b.right)>Math.max(a.x,b.x)+2&&Math.min(a.bottom,b.bottom)>Math.max(a.y,b.y)+2;
  await page.reload();
  for(const [width,height]of [[1440,900],[1366,768],[1024,768],[820,900],[650,900],[390,844],[320,568],[844,390]]){
   await page.setViewportSize({width,height});for(const i of [5,6]){
    await show(i);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    const m=await lab(i).evaluate(e=>{const rect=n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom,height:r.height}};return{stage:rect(e.querySelector('.stage')),canvas:rect(e.querySelector('[data-studio]')),preview:rect(e.querySelector('.path-preview')),tools:rect(e.querySelector('.scene-tools')),comparison:rect(e.querySelector('.path-comparison')),buttons:[...e.querySelectorAll('button,select')].map(n=>({text:n.textContent,clipped:n.scrollWidth>n.clientWidth+2,...rect(n)})),overflow:document.documentElement.scrollWidth>innerWidth};});
    assert.equal(m.overflow,false);assert.ok(m.comparison.bottom<=m.stage.y);assert.ok(!overlap(m.preview,m.tools));if(i===5){const controls=await lab(5).locator('.filter-controls').boundingBox(),selects=await lab(5).locator('select').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width};}));assert.equal(selects.length,3);assert.ok(controls.height<=110);assert.ok(selects.every(s=>Math.abs(s.y-selects[0].y)<1&&s.width>=60));assert.ok(selects[0].x<selects[1].x&&selects[1].x<selects[2].x);}
    for(const b of m.buttons){assert.ok(b.height>=44,`${i} ${width} ${b.text} height`);assert.equal(b.clipped,false,`${i} ${width} ${b.text} clipped`);}
    for(const b of (await audit(i===5?'filter':'eye')).bounds){assert.ok(!overlap(b,m.preview),`${i} ${width} preview clear`);assert.ok(!overlap(b,m.tools),`${i} ${width} tools clear`);assert.ok(b.x>=m.canvas.x-2&&b.right<=m.canvas.right+2&&b.y>=m.canvas.y-2&&b.bottom<=m.canvas.bottom+2,`${i} ${width} apparatus visible: ${JSON.stringify({b,canvas:m.canvas})}`);}
    await page.locator(`.route a[href="#s${i}"]`).click();await page.screenshot({path:path.join(capture,`s${i}-${width}x${height}.png`)});metrics.push({i,width,height,...m});
   }
  }await fs.writeFile(path.join(capture,'layout.json'),JSON.stringify(metrics,null,2));
 });
 await t.test('手機選單與原生拖曳、WebGL備援兩種入眼光路及取消',async()=>{
  const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});try{
   await mobile.route('**/4.5/assets/{prism-studio,torch-studio}.mjs*',r=>r.abort());const p=await mobile.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(base+'#s5');const l=p.locator('#s5 .lab');await l.scrollIntoViewIfNeeded();await p.waitForFunction(()=>document.querySelector('#s5 .lab').dataset.renderer==='three');
   await l.locator('[data-filter-setting=filter]').selectOption('green');await l.locator('[data-filter-setting=light]').selectOption('red');assert.match(await l.locator('[data-result]').innerText(),/很暗/);
   const canvas=l.locator('[data-studio]');await canvas.scrollIntoViewIfNeeded();const r=await canvas.boundingBox(),orbit=await l.getAttribute('data-orbit'),session=await mobile.newCDPSession(p);await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+r.width*.35,y:r.y+r.height*.65}]});await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:r.x+r.width*.65,y:r.y+r.height*.65}]});await session.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await p.waitForFunction(old=>document.querySelector('#s5 .lab').dataset.orbit!==old,orbit);assert.ok(Math.abs(JSON.parse(await l.getAttribute('data-outgoing'))[0]-.0072)<1e-12);
   await mobile.route('**/4.5/assets/studio.mjs*',r=>r.abort());await p.reload();const eye=p.locator('#s6 .lab');await eye.scrollIntoViewIfNeeded();await p.waitForSelector('#s6 .is-fallback');
   for(const mode of ['reflection','transmission']){await eye.locator(`[data-eye-mode=${mode}]`).tap();await eye.locator('[data-blocker]').tap();assert.deepEqual(JSON.parse(await eye.getAttribute('data-received')),[0,0,0]);const svg=await eye.locator('[data-diagram]').innerHTML();assert.match(svg,/眼睛/);assert.ok(!svg.includes('觀察位置'));if(mode==='transmission')assert.match(svg,/fill="#37ac76"/,'green filter keeps its material colour even when the eye path is blocked');await p.locator('#s6').screenshot({path:path.join(capture,`fallback-${mode}.png`)});await eye.locator('[data-blocker]').tap();assert.ok(JSON.parse(await eye.getAttribute('data-received'))[1]>.8);}
  }finally{await mobile.close();}assert.deepEqual(errors,[]);
 });
});
