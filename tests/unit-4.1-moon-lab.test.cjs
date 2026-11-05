const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=process.env.MOON_CAPTURE||'/tmp/unit41-celestial';

test('4.1 可拖曳天體模型、地球視窗與摺疊生命週期',{timeout:240000},async t=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});t.after(()=>browser.close());await fs.mkdir(out,{recursive:true});const records=[];t.after(()=>fs.writeFile(path.join(out,'browser.json'),JSON.stringify(records,null,2)+'\n'));
 async function open({width=1366,blocked,webgl=true}={}){
  const context=await browser.newContext({viewport:{width,height:1000}}),page=await context.newPage(),errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&m.text().includes('Shader Error'))errors.push(m.text());});
  await page.addInitScript(webgl=>{document.addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');s.textContent='html{scroll-behavior:auto!important}';document.head.append(s)});if(!webgl){const old=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return this.id==='moon-model-canvas'&&/webgl/i.test(type)?null:old.call(this,type,...args)}}},webgl);
  await page.route('**/*',async route=>{
   const u=new URL(route.request().url()),base=path.basename(u.pathname),type=route.request().resourceType();if(u.hostname!=='k12.test')return route.abort();requests.push(base);
   if(base===blocked)return route.abort('failed');
   if(type==='image'&&!base.startsWith('celestial-'))return route.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jR1cAAAAASUVORK5CYII=','base64')});
   if(['aperture-3d.js','shadow-3d.js','shadow-size-3d.js','shadow-theatre.js'].includes(base))return route.fulfill({contentType:'text/javascript',body:''});
   const file=path.join(root,u.pathname.endsWith('/')?u.pathname+'index.html':u.pathname);
   if(base==='moon-reflection-3d.js'){const source=await fs.readFile(file,'utf8');assert.ok(source.includes('  const api={'));return route.fulfill({contentType:'text/javascript',body:source.replace('  const api={','  window.__moonTest={positions,bodies,camera,eyeCamera,renderer,read:()=>readout,render:draw}; const api={')});}
   return route.fulfill({path:file});
  });
  await page.goto('https://k12.test/units/4/parts/4.1/#card-02',{waitUntil:'load'});return{page,context,errors,requests};
 }
 for(const width of [1366,1024])await t.test('真實3D天體操作與收合 '+width,async()=>{
  const {page:p,context:c,errors,requests}=await open({width});try{
   const panel=p.locator('#moon-reflection-explanation'),summary=panel.locator('summary');assert.equal(await panel.evaluate(el=>el.open),false);assert.equal(requests.includes('moon-reflection-3d.js'),false);
   await summary.click();await p.waitForFunction(()=>document.querySelector('.moon-lab').dataset.moonState==='ready',null,{timeout:60000});
   await p.locator('#moon-model-canvas').evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
   const initial=await p.evaluate(()=>({positions:structuredClone(window.__moonTest.positions),fraction:window.__moonTest.read().fraction,programs:window.__moonTest.renderer.info.programs.map(p=>p.diagnostics?.runnable)}));assert.ok(initial.programs.length>=3);assert.ok(initial.programs.every(x=>x!==false));
   const inset=await p.evaluate(()=>{const a=window.__moonTest;a.render(performance.now());const canvas=document.querySelector('#moon-model-canvas'),r=canvas.getBoundingClientRect(),box=document.querySelector('.moon-earth-view').getBoundingClientRect(),gl=a.renderer.getContext(),ratio=gl.drawingBufferWidth/canvas.clientWidth,w=Math.floor(box.width*ratio),h=Math.floor(box.height*ratio),pixels=new Uint8Array(w*h*4);gl.readPixels(Math.floor((box.left-r.left)*ratio),Math.floor((r.bottom-box.bottom)*ratio),w,h,gl.RGBA,gl.UNSIGNED_BYTE,pixels);let bright=0;for(let i=0;i<pixels.length;i+=4)if(Math.max(pixels[i],pixels[i+1],pixels[i+2])>55)bright++;return{bright,calls:a.renderer.info.render.calls}});assert.ok(inset.bright>20,JSON.stringify(inset));
   await p.locator('.moon-space-frame').screenshot({path:path.join(out,'initial-'+width+'.png')});
   const moves={sun:[-.5,0,.6],earth:[.7,0,.3],moon:[-.6,0,.4]};
   for(const name of Object.keys(moves)){
    const points=await p.evaluate(({name,delta})=>{const a=window.__moonTest,r=document.querySelector('#moon-model-canvas').getBoundingClientRect();a.camera.updateMatrixWorld(true);const from=a.bodies[name].getWorldPosition(a.bodies[name].position.clone()),to=from.clone();to.x+=delta[0];to.z+=delta[2];const pixel=v=>{v.project(a.camera);return{x:r.left+(v.x+1)*r.width/2,y:r.top+(1-v.y)*r.height/2}};return{from:pixel(from),to:pixel(to),position:[...a.positions[name]]}}, {name,delta:moves[name]});
    await p.mouse.move(points.from.x,points.from.y);await p.mouse.down();await p.mouse.move(points.to.x,points.to.y,{steps:8});await p.mouse.up();
    const after=await p.evaluate(name=>[...window.__moonTest.positions[name]],name);assert.ok(Math.hypot(after[0]-points.position[0],after[2]-points.position[2])>.25,JSON.stringify({name,points,after}));
   }
   const changed=await p.evaluate(()=>({positions:structuredClone(window.__moonTest.positions),fraction:window.__moonTest.read().fraction}));assert.ok(Math.abs(changed.fraction-initial.fraction)>.005);
   await p.locator('[data-moon-body="earth"]').click();const beforeKey=await p.evaluate(()=>window.__moonTest.positions.earth[0]);await p.keyboard.press('ArrowRight');assert.ok(await p.evaluate(()=>window.__moonTest.positions.earth[0])>beforeKey);
   const cameraBefore=await p.evaluate(()=>window.__moonTest.camera.position.toArray()),box=await p.locator('#moon-model-canvas').boundingBox();await p.mouse.move(box.x+20,box.y+20);await p.mouse.down();await p.mouse.move(box.x+80,box.y+45,{steps:5});await p.mouse.up();await p.locator('#moon-model-canvas').dispatchEvent('wheel',{deltaY:150,bubbles:true});const cameraAfter=await p.evaluate(()=>window.__moonTest.camera.position.toArray());assert.notDeepEqual(cameraAfter,cameraBefore);
   await p.locator('#moon-positions-reset').click();assert.deepEqual(await p.evaluate(()=>structuredClone(window.__moonTest.positions)),initial.positions);assert.deepEqual(await p.evaluate(()=>window.__moonTest.camera.position.toArray()),cameraAfter);
   await p.locator('#lamp-toggle').click();assert.equal(await p.locator('#lamp-toggle').getAttribute('aria-pressed'),'false');assert.equal(await panel.evaluate(el=>el.open),true);
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
   await summary.click();await p.waitForTimeout(150);const paused=await p.evaluate(()=>window.__moonTest.renderer.info.render.frame);await p.waitForTimeout(150);assert.equal(await p.evaluate(()=>window.__moonTest.renderer.info.render.frame),paused);
   await summary.focus();await p.keyboard.press('Enter');await p.waitForTimeout(200);assert.ok(await p.evaluate(()=>window.__moonTest.renderer.info.render.frame)>paused);assert.equal(requests.filter(n=>n==='moon-reflection-3d.js').length,1);
   if(width===1024){await p.locator('#moon-model-canvas').focus();await p.locator('#moon-model-canvas').dispatchEvent('webglcontextlost',{bubbles:false,cancelable:true});await p.waitForFunction(()=>document.querySelector('.moon-lab').dataset.moonState==='failed');assert.equal(await p.evaluate(()=>document.activeElement.id),'moon-model-message');assert.equal(await p.locator('.moon-body-controls button').evaluateAll(es=>es.every(e=>e.disabled)),true);const frozen=await p.evaluate(()=>window.__moonTest.renderer.info.render.frame);await p.waitForTimeout(150);assert.equal(await p.evaluate(()=>window.__moonTest.renderer.info.render.frame),frozen);}
   records.push({width,initial,changed,keyboard:true,cameraOrbitAndZoom:true,resetKeepsCamera:true,pausedOnClose:true,contextLoss:width===1024,errors});
  }finally{await c.close()}
 });
 for(const scenario of [{name:'無WebGL',webgl:false},{name:'模組下載失敗',blocked:'moon-reflection-3d.js'},{name:'貼圖下載失敗',blocked:'celestial-earth.jpg'}])await t.test(scenario.name,async()=>{
  const {page:p,context:c}=await open(scenario);try{await p.locator('#moon-reflection-explanation summary').click();await p.waitForFunction(()=>document.querySelector('.moon-lab').dataset.moonState==='failed');assert.match(await p.locator('#moon-model-message').textContent(),/未能載入/);assert.equal(await p.locator('.moon-body-controls button').evaluateAll(es=>es.every(e=>e.disabled)),true);assert.equal(await p.locator('#lamp-toggle').isEnabled(),true);records.push({scenario:scenario.name,failedGracefully:true});}finally{await c.close()}
 });
});
