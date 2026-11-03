const {test}=require('node:test'),assert=require('node:assert/strict'),http=require('node:http'),path=require('node:path'),fs=require('node:fs/promises');
const {chromium}=require('playwright');
test('4.5第四區：內嵌預覽、色卡與反射／吸收對照',{timeout:240000},async t=>{
 let base=process.env.COLOR_URL;
 if(!base){const root=path.resolve(__dirname,'..'),server=http.createServer(async(req,res)=>{try{let file=path.join(root,decodeURI(req.url.split('?')[0]));if((await fs.stat(file)).isDirectory())file+='/index.html';res.setHeader('Content-Type',({'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.png':'image/png'})[path.extname(file)]||'text/html');res.end(await fs.readFile(file));}catch{res.statusCode=404;res.end('missing')}});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>server.close());base=`http://127.0.0.1:${server.address().port}/units/4/parts/4.5/`;}
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'],...(process.env.COLOR_URL?{proxy:{server:process.env.HTTPS_PROXY||process.env.HTTP_PROXY}}:{})});t.after(()=>browser.close());
 const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),capture=process.env.COLOR_CAPTURE_DIR||'/tmp/unit45-surface/check';await fs.mkdir(capture,{recursive:true});
 // Observe real meshes and projected bounds without adding a production API.
 await context.route('**/4.5/assets/studio.mjs*',async route=>{const response=await route.fetch(),body=(await response.text()).replace('resize();\n return{update',`resize();
 if(surface)window.__surfaceAudit={snapshot(){scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);const rect=canvas.getBoundingClientRect(),bounds=object=>{const b=new THREE.Box3().setFromObject(object),pts=[];for(const x of[b.min.x,b.max.x])for(const y of[b.min.y,b.max.y])for(const z of[b.min.z,b.max.z]){const p=new THREE.Vector3(x,y,z).project(camera);pts.push([rect.x+(p.x+1)*rect.width/2,rect.y+(1-p.y)*rect.height/2]);}return{x:Math.min(...pts.map(p=>p[0])),right:Math.max(...pts.map(p=>p[0])),y:Math.min(...pts.map(p=>p[1])),bottom:Math.max(...pts.map(p=>p[1]))};};return{card:bounds(card),lamp:bounds(lamp),opaque:!card.material.transparent&&card.material.opacity===1,cardRgb:card.material.color.toArray(),observer:observer.visible,screen:screen.visible,rays:rays.visible,material:{type:card.material.type,roughness:card.material.roughness,metalness:card.material.metalness,emissive:card.material.emissive?.toArray(),textured:!!card.material.map,bump:!!card.material.bumpMap},lighting:scene.children.filter(o=>o.isSpotLight).map(o=>({intensity:o.intensity,visible:o.visible,color:o.color.toArray(),position:o.position.toArray(),target:o.target.position.toArray()})),segments:rays.children.filter(m=>m.isLine).map(m=>{const p=m.geometry.getAttribute('position');return[[p.getX(0),p.getY(0),p.getZ(0)],[p.getX(p.count-1),p.getY(p.count-1),p.getZ(p.count-1)]]})}},pixel(y,z){renderer.render(scene,camera);const p=new THREE.Vector3(0,AXIS+y,z).project(camera),gl=renderer.getContext(),pixel=new Uint8Array(4);gl.readPixels(Math.floor((p.x+1)*canvas.width/2),Math.floor((p.y+1)*canvas.height/2),1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);return Array.from(pixel)}};
 return{update`);await route.fulfill({response,body});});
 await context.route('**/4.5/assets/{prism-studio,torch-studio}.mjs*',r=>r.abort());
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/WebGLProgram|Shader Error/.test(m.text()))errors.push(m.text())});await page.goto(base+'#s4');const section=page.locator('#s4'),lab=section.locator('[data-lab]');await lab.scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('#s4 .lab').dataset.renderer==='three');
 const state=async()=>JSON.parse(await lab.getAttribute('data-state')),audit=()=>page.evaluate(()=>window.__surfaceAudit.snapshot()),hash=()=>lab.locator('[data-receiver]').evaluate(c=>{const bytes=c.getContext('2d').getImageData(0,0,c.width,c.height).data;return bytes.reduce((s,n,i)=>i%4===3?s:(s+n*(i%17+1))%1000000007,0)});
 const rect=async locator=>locator.evaluate(e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}});
 const overlap=(a,b)=>Math.min(a.right,b.right)>Math.max(a.x,b.x)+1&&Math.min(a.bottom,b.bottom)>Math.max(a.y,b.y)+1;
 const observations=[];
 await t.test('預設綠光照白紙，二十種燈色與色卡組合的場景／預覽／對照同步',async()=>{
  assert.equal((await state()).light,'green');assert.equal((await state()).material,'white');assert.equal((await state()).rays,true);
  assert.equal(await lab.locator('.surface-controls fieldset').count(),2);assert.equal(await lab.locator('[data-light]').count(),4);assert.equal(await lab.locator('[data-material]').count(),5);
  assert.equal(await lab.locator('.stage>.surface-preview').count(),1);assert.equal(await lab.locator('.studio-layout>.receiver').count(),0);assert.equal(await lab.locator('.surface-preview button').count(),0);
  const {MATERIALS,LIGHTS,materialLight}=await import('../units/4/parts/4.5/assets/color-model.mjs'),hashes=[];
  for(const light of ['white','red','green','blue']){
   const previousMaterial=(await state()).material;await lab.locator(`[data-light=${light}]`).click();assert.equal((await state()).material,previousMaterial);
   for(const key of ['red','green','blue','white','black']){
    await lab.locator(`[data-material=${key}]`).click();const actual=await state(),signal=materialLight(light,key);
    assert.equal(actual.light,light);assert.equal(actual.material,key);assert.equal(await lab.locator('[data-material][aria-pressed=true]').count(),1);assert.equal(await lab.locator('[data-light][aria-pressed=true]').count(),1);
    assert.deepEqual(JSON.parse(await lab.getAttribute('data-incoming')),signal.incoming);assert.deepEqual(JSON.parse(await lab.getAttribute('data-outgoing')),signal.outgoing);assert.deepEqual(JSON.parse(await lab.getAttribute('data-absorbed')),signal.absorbed);
    const name=await lab.locator('[data-surface-name]').innerText();assert.ok(name.includes(MATERIALS[key].name)&&name.includes(LIGHTS[light].name));
    const widths=await lab.locator('.surface-channel-bar b').evaluateAll(es=>es.map(e=>parseFloat(e.style.width)/100));assert.equal(widths.length,9);
    for(let i=0;i<3;i++){assert.equal(widths[i],signal.incoming[i]);assert.ok(Math.abs(widths[3+i]-signal.outgoing[i])<1e-9);assert.ok(Math.abs(widths[6+i]-signal.absorbed[i])<1e-9);assert.ok(Math.abs(widths[3+i]+widths[6+i]-widths[i])<1e-9);}
    const pixel=await lab.locator('[data-receiver]').evaluate(c=>[...c.getContext('2d').getImageData(c.width/2,c.height/2,1,1).data]);
    const srgb=signal.outgoing.map(v=>Math.round(255*(v<=.0031308?12.92*v:1.055*v**(1/2.4)-.055)));assert.deepEqual(pixel.slice(0,3),srgb);
    const a=await audit();assert.equal(a.opaque,true);assert.deepEqual(a.cardRgb,signal.outgoing);assert.equal(a.observer,false);assert.equal(a.screen,false);assert.ok(a.segments.length>=5);assert.ok(new Set(a.segments.map(s=>s[0].join(','))).size>=5);assert.equal(a.material.type,'MeshStandardMaterial');assert.equal(a.material.roughness,1);assert.equal(a.material.metalness,0);assert.deepEqual(a.material.emissive,[0,0,0]);assert.equal(a.material.textured,true);assert.equal(a.material.bump,true);assert.equal(a.lighting.length,1);assert.deepEqual(a.lighting[0].color,signal.incoming);assert.ok(a.lighting[0].intensity>0);assert.ok(a.lighting[0].position[0]<0);assert.equal(a.lighting[0].target[0],0);
    for(const segment of a.segments)for(const point of segment)assert.ok(point[0]<0,'guides stay on the illuminated side');
    const dark=Math.max(...signal.outgoing)<.045,copy=await lab.locator('[data-channels]').innerText();if(dark)assert.match(await lab.locator('[data-result]').innerText(),/很暗/);
    if(light!=='white'){const summary=await lab.locator('.channel-cell strong').allTextContents();assert.equal(summary[0],LIGHTS[light].name);assert.ok(summary.slice(1).every(s=>s.includes(LIGHTS[light].name)));}
    hashes.push(await hash());observations.push({light,key,copy,widths});if((light==='white'&&key==='red')||(light==='green'&&['white','red'].includes(key))||(light==='red'&&key==='green')||(light==='blue'&&key==='white'))await section.screenshot({path:path.join(capture,`${light}-${key}.png`)});
   }
  }assert.ok(new Set(hashes).size>=8);
 });
 await t.test('隱藏光路、俯看、拖曳與方向鍵只改觀察方式，不改色卡結果',async()=>{
  await lab.locator('[data-material=red]').click();await lab.locator('[data-light=white]').click();const before=await hash(),output=await lab.getAttribute('data-outgoing'),channels=await lab.locator('[data-channels]').innerText();await lab.locator('[data-rays]').click();assert.equal((await state()).rays,false);assert.equal((await audit()).rays,false);assert.equal(await hash(),before);assert.equal(await lab.getAttribute('data-outgoing'),output);assert.equal(await lab.locator('[data-channels]').innerText(),channels);await lab.locator('[data-rays]').click();await lab.locator('[data-view]').click();assert.equal((await state()).view,true);await lab.locator('[data-view]').click();
  const c=lab.locator('[data-studio]');await c.scrollIntoViewIfNeeded();const r=await rect(c),orbit=await lab.getAttribute('data-orbit');await page.mouse.move(r.x+r.width*.3,r.y+r.height*.65);await page.mouse.down();await page.mouse.move(r.x+r.width*.4,r.y+r.height*.7,{steps:5});await page.mouse.up();await c.focus();await page.keyboard.press('ArrowLeft');await page.waitForFunction(old=>document.querySelector('#s4 .lab').dataset.orbit!==old,orbit);assert.equal(await hash(),before);assert.equal(await lab.getAttribute('data-outgoing'),output);assert.equal(await lab.locator('[data-channels]').innerText(),channels);
 });
 await t.test('隱藏光路仍可換燈色，受光區持續存在且材質無自發光',async()=>{
  const observations=[];await lab.locator('[data-light=white]').click();
  for(const material of ['blue','white']){
   await lab.locator(`[data-material=${material}]`).click();if((await state()).rays)await lab.locator('[data-rays]').click();
   const a=await audit(),center=await page.evaluate(()=>window.__surfaceAudit.pixel(0,0)),edge=await page.evaluate(()=>window.__surfaceAudit.pixel(.55,.43));
   assert.equal(a.rays,false);assert.equal(a.material.type,'MeshStandardMaterial');assert.deepEqual(a.material.emissive,[0,0,0]);assert.equal(a.lighting[0].visible,true);assert.ok(a.lighting[0].intensity>0);
   assert.ok(center.slice(0,3).reduce((s,v)=>s+v,0)>edge.slice(0,3).reduce((s,v)=>s+v,0)+10,`lit ${material} patch remains brighter with guides hidden: ${center} vs ${edge}`);
   observations.push({material,center,edge});
  }
  await fs.writeFile(path.join(capture,'paper-lighting.json'),JSON.stringify(observations,null,2));await section.screenshot({path:path.join(capture,'paper-guides-hidden.png')});await lab.locator('[data-light=green]').click();assert.equal((await state()).material,'white');assert.equal((await state()).rays,false);assert.deepEqual((await audit()).lighting[0].color,[0,1,0]);assert.deepEqual(JSON.parse(await lab.getAttribute('data-outgoing')),[0,.9,0]);await lab.locator('[data-rays]').click();
 });
 await t.test('七種寬度的預覽留在主畫面內，預設器材不被預覽／工具遮住且無橫向溢出',async()=>{
  await page.reload();await page.waitForFunction(()=>document.querySelector('#s4 .lab').dataset.renderer==='three');
  for(const width of [1440,1280,1024,820,650,390,320]){
   await page.setViewportSize({width,height:900});await lab.scrollIntoViewIfNeeded();await page.waitForFunction(()=>{const c=document.querySelector('#s4 [data-studio]');return Math.abs(c.width/c.height-c.clientWidth/c.clientHeight)<.02});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   const preview=await rect(lab.locator('.surface-preview')),stage=await rect(lab.locator('.stage')),canvas=await rect(lab.locator('[data-studio]')),tools=await rect(lab.locator('.scene-tools')),a=await audit();
   assert.ok(preview.x>=stage.x&&preview.right<=stage.right&&preview.y>=stage.y&&preview.bottom<=stage.bottom,`preview inside ${width}`);assert.ok(!overlap(preview,tools),`tools clear ${width}`);
   for(const key of ['card','lamp']){assert.ok(!overlap(preview,a[key]),`${key} clear of preview ${width}`);assert.ok(!overlap(tools,a[key]),`${key} clear of tools ${width}`);assert.ok(a[key].x>=canvas.x-2&&a[key].right<=canvas.right+2&&a[key].y>=canvas.y-2&&a[key].bottom<=canvas.bottom+2,`${key} stays visible ${width}: ${JSON.stringify(a[key])} vs ${JSON.stringify(canvas)}`);}
   if(width<=650)for(const material of ['white','black','red']){await lab.locator(`[data-material=${material}]`).click();const current=await rect(lab.locator('.surface-preview'));for(const key of ['card','lamp'])assert.ok(!overlap(current,a[key]),`${material} preview stays clear of ${key} ${width}`);}
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`no horizontal overflow ${width}`);
   await page.locator('.route a[href="#s4"]').click();await page.screenshot({path:path.join(capture,`viewport-${width}.png`)});
  }
 });
 await t.test('手機可直接點選全部色卡，預覽和文字同步；WebGL不可用仍可比較',async()=>{
  const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});try{
   await mobile.route('**/4.5/assets/{studio,prism-studio,torch-studio}.mjs*',r=>r.abort());const p=await mobile.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(base+'#s4');const l=p.locator('#s4 [data-lab]');await l.scrollIntoViewIfNeeded();await p.waitForFunction(()=>document.querySelector('#s4 .lab .is-fallback')&&!document.querySelector('#s4 .lab .is-fallback').hidden);
   for(const light of ['white','red','green','blue']){const prior=JSON.parse(await l.getAttribute('data-state')).material;await l.locator(`[data-light=${light}]`).tap();assert.equal(JSON.parse(await l.getAttribute('data-state')).material,prior);for(const key of ['red','green','blue','white','black']){await l.locator(`[data-material=${key}]`).tap();assert.equal(JSON.parse(await l.getAttribute('data-state')).light,light);assert.equal(JSON.parse(await l.getAttribute('data-state')).material,key);assert.equal(await l.locator('[data-receiver]').isVisible(),true);assert.equal(await l.locator('.surface-channel-bar').count(),9);assert.equal(await l.locator('[data-diagram] svg').count(),1);}}
   await l.locator('[data-material=red]').tap();const before=await l.getAttribute('data-outgoing'),pathCount=await l.locator('[data-diagram] svg path').count();await l.locator('[data-rays]').tap();assert.ok(await l.locator('[data-diagram] svg path').count()<pathCount);assert.equal(await l.getAttribute('data-outgoing'),before);await l.locator('[data-rays]').tap();assert.equal(await l.locator('[data-diagram] svg path').count(),pathCount);await p.locator('.route a[href="#s4"]').click();await p.screenshot({path:path.join(capture,'mobile-fallback.png')});
  }finally{await mobile.close();}assert.deepEqual(errors,[]);
 });
 await fs.writeFile(path.join(capture,'observations.json'),JSON.stringify(observations,null,2));
});
