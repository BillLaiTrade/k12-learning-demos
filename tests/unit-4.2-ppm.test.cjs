const{test}=require('node:test');const assert=require('node:assert/strict');const{spawn}=require('node:child_process');const path=require('node:path');const{chromium}=require('playwright');
test('4.2 ppm: calibrated mass, same-scale observations and interaction',{timeout:180000},async t=>{
 const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:['ignore','pipe','pipe']});t.after(()=>server.kill());
 const port=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server timeout')),5000);server.stdout.on('data',s=>{const m=String(s).match(/port (\d+)/);if(m){clearTimeout(timer);resolve(m[1]);}});server.on('error',reject);});
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});t.after(()=>browser.close());const page=await browser.newPage({viewport:{width:1440,height:1100},hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('requestfailed',r=>errors.push(r.url()));
 const url=`http://127.0.0.1:${port}/units/4/parts/4.2/`;await page.goto(url+'#ppm-lab');await page.waitForFunction(()=>document.querySelector('#ppm-lab').dataset.ready==='true');const root=page.locator('#ppm-lab'),data=()=>root.evaluate(e=>({...e.dataset}));
 const close=async()=>{if(await page.locator('#ppm-lens').isVisible())await page.locator('#ppm-close-lens').click();};
 await t.test('one liter and sugar mass use independently checked physical dimensions and density',async()=>{
  const m=await page.evaluate(async()=>{const m=await import('./assets/ppm-scale-state.js?v=physical-1');return{water:m.WATER,density:m.DENSITY_MG_MM3,grain:m.GRAIN_VOLUME_MM3,grainMass:m.GRAIN_MASS_MG,gram:m.sampleState('gram'),micro:m.sampleState('milligram'),unknown:m.sampleState('unknown'),counts:[m.grainPositions(1000).length,m.grainPositions(1).length]};});
  assert.equal(m.density,1.59);assert.ok(Math.abs(Math.PI*m.water.radiusMm**2*m.water.heightMm-1000000)<1e-8);assert.equal(m.water.radiusMm*2,110);assert.equal(m.unknown,null);assert.deepEqual(m.counts,[10000,10]);
  assert.ok(Math.abs(m.gram.solidVolumeMm3*1.59-1000)<1e-10);assert.ok(Math.abs(m.micro.solidVolumeMm3*1.59-1)<1e-12);assert.equal(m.gram.solidVolumeMm3/m.micro.solidVolumeMm3,1000);assert.equal(m.grain*m.density,m.grainMass);
  const rendered=await data();assert.ok(Math.abs(Number(rendered.gramRenderedVolumeMm3)*1.59-1000)<.0001);assert.ok(Math.abs(Number(rendered.milligramRenderedVolumeMm3)*1.59-1)<.000001);assert.ok(Math.abs(Number(rendered.grainGeometryVolume)-1)<1e-6);
 });
 await t.test('crystal solids fit their lattice cells without overlapping or counting air as sugar',async()=>{
  const result=await page.evaluate(async()=>{const T=await import('three'),m=await import('./assets/ppm-scale-state.js?v=physical-1');const geo=new T.IcosahedronGeometry(1,0),v=geo.attributes.position;let volume=0;const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();for(let i=0;i<v.count;i+=3){a.fromBufferAttribute(v,i);b.fromBufferAttribute(v,i+1);c.fromBufferAttribute(v,i+2);volume+=a.dot(b.cross(c))/6;}const norm=Math.cbrt(m.GRAIN_VOLUME_MM3/Math.abs(volume));let bound=0;for(let i=0;i<10000;i++){const sx=1+.06*Math.sin(i*2.17),sy=1+.06*Math.cos(i*1.83),sz=1/(sx*sy),q=new T.Quaternion().setFromEuler(new T.Euler(.04*Math.sin(i*3),.05*Math.cos(i*2),.04*Math.sin(i)));for(let j=0;j<v.count;j++){a.fromBufferAttribute(v,j).multiply(new T.Vector3(sx*norm,sy*norm,sz*norm)).applyQuaternion(q);bound=Math.max(bound,Math.abs(a.x),Math.abs(a.y),Math.abs(a.z));}}return{bound,half:m.GRAIN_CELL_MM/2};});assert.ok(result.bound<result.half,JSON.stringify(result));
 });
 await t.test('the formal formula precedes matching examples and uses total solution mass',async()=>{
  assert.equal(await page.locator('#ppm-tokens,.ppm-source,#ppm-recipe').count(),0);assert.equal(await page.locator('#ppm-lens').isVisible(),false);
  assert.equal(await page.locator('.ppm-formal .num').innerText(),'溶質質量');assert.equal(await page.locator('.ppm-formal .den').innerText(),'溶液總質量');assert.match(await page.locator('.ppm-formal').innerText(),/1,000,000/);
  assert.ok(await page.locator('.ppm-formal').evaluate(e=>!!(e.compareDocumentPosition(document.querySelector('.ppm-example'))&Node.DOCUMENT_POSITION_FOLLOWING)));
  let d=await data();assert.equal(d.ppm,'1');assert.equal(d.solventMg,'999999');assert.equal(d.totalMg,'1000000');assert.equal(await page.locator('[data-ppm=percent]').innerText(),'＝ 0.0001%');
  await page.locator('.ppm-example-card[data-ppm-sample=gram]').click();d=await data();assert.equal(d.ppm,'1000');assert.equal(d.solventMg,'999000');assert.equal(await page.locator('[data-ppm=numerator]').innerText(),'1,000 毫克');assert.equal(await page.locator('[data-ppm=percent]').innerText(),'＝ 0.1%');
 });
 await t.test('real dish clicks select the matching sample and open a lens with a measured millimeter scale',async()=>{
  await page.locator('#ppm-milligram').click();let d=await data();assert.equal(d.sample,'milligram');assert.equal(d.lensOpen,'true');assert.equal(d.grainCount,'10');assert.equal(d.lensFieldMm,'3.6');assert.equal(d.scaleBarMm,'1');assert.equal(await page.locator('#ppm-scale-bar-label').innerText(),'1 mm');
  let size=await page.locator('.ppm-lens-glass').evaluate(e=>e.clientWidth);assert.ok(Math.abs(Number(d.scaleBarPixels)-size/3.6)<1e-8);assert.ok(Math.abs(await page.locator('#ppm-scale-bar').evaluate(e=>e.getBoundingClientRect().width)-size/3.6)<.1);
  await root.screenshot({path:'/tmp/ppm-checked-milligram.png'});
  await page.locator('#ppm-gram').click();d=await data();assert.equal(d.ppm,'1000');assert.equal(d.grainCount,'10000');assert.equal(d.lensFieldMm,'36');assert.equal(d.scaleBarMm,'10');assert.equal(await page.locator('#ppm-scale-bar-label').innerText(),'10 mm');await root.screenshot({path:'/tmp/ppm-checked-gram.png'});
 });
 await t.test('keyboard, close, escape and shared reset operate without changing the upper recipe',async()=>{
  await close();assert.equal(await page.locator('#ppm-gram').evaluate(e=>document.activeElement===e),true);await page.locator('#ppm-milligram').focus();await page.keyboard.press('Enter');assert.equal((await data()).sample,'milligram');assert.equal((await data()).lensOpen,'true');await page.keyboard.press('Escape');assert.equal((await data()).lensOpen,'false');
  await page.locator('#ppm-gram').click();await page.locator('#mix-reset').click();assert.equal((await data()).sample,'milligram');assert.equal((await data()).lensOpen,'false');assert.equal(await page.locator('#mix-lab').getAttribute('data-sugar'),'5');assert.equal(await page.locator('#mix-lab').getAttribute('data-water'),'95');
 });
 await t.test('both touch targets and the scale remain correct on narrow screens without overflow',async()=>{
  for(const width of [1440,1024,850,768,680,390,320]){
   await page.setViewportSize({width,height:1100});await page.locator('#ppm-milligram').tap();let d=await data(),size=await page.locator('.ppm-lens-glass').evaluate(e=>e.clientWidth),mainWidth=await page.locator('#ppm-scale-scene').evaluate(e=>e.clientWidth);
   assert.ok(Math.abs(Number(d.zoom)-size/3.6/(mainWidth/360))<1e-8);assert.ok(Number(d.zoom)>20&&Number(d.zoom)<40);
   const boxes=await root.evaluate(e=>{const r=e.getBoundingClientRect();return{overflow:document.documentElement.scrollWidth>innerWidth,out:[...e.querySelectorAll('.ppm-formal,.ppm-example,.ppm-lens,.ppm-example-card,.ppm-worked')].some(n=>{const b=n.getBoundingClientRect();return b.left<r.left-.5||b.right>r.right+.5||n.scrollWidth>n.clientWidth+1;})};});assert.equal(boxes.overflow,false,`viewport ${width}`);assert.equal(boxes.out,false,`contents ${width}`);
   if(width===390)await root.screenshot({path:'/tmp/ppm-checked-mobile.png'});
   await page.locator('#ppm-gram').tap();assert.equal((await data()).ppm,'1000');await close();
  }
  await page.setViewportSize({width:1440,height:1100});await root.screenshot({path:'/tmp/ppm-checked-overview.png'});assert.deepEqual(errors,[]);
 });
 await t.test('unavailable WebGL keeps accessible formulas and sample calculations usable',async()=>{
  const p=await browser.newPage();try{await p.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){if(/webgl/i.test(type))return null;return original.call(this,type,...args);};});await p.goto(url);await p.waitForFunction(()=>document.querySelector('#ppm-lab').dataset.ready==='error');assert.match(await p.locator('#ppm-status').innerText(),/無法載入/);await p.locator('.ppm-example-card[data-ppm-sample=gram]').click();assert.equal(await p.locator('[data-ppm=ppm]').innerText(),'1,000 ppm');assert.equal(await p.locator('#ppm-lens').isVisible(),false);assert.equal(await p.locator('#mix-lab').getAttribute('data-ready'),'true');}finally{await p.close();}
 });
 await t.test('failed scene background reports its failure while numeric examples and the upper experiment work',async()=>{
  const p=await browser.newPage();try{await p.route('**/ppm-table.webp',r=>r.abort());await p.goto(url);await p.waitForFunction(()=>document.querySelector('#ppm-lab').dataset.ready==='error');await p.locator('.ppm-example-card[data-ppm-sample=gram]').click();assert.equal(await p.locator('[data-ppm=ppm]').innerText(),'1,000 ppm');assert.equal(await p.locator('#mix-lab').getAttribute('data-ready'),'true');}finally{await p.close();}
 });
});
