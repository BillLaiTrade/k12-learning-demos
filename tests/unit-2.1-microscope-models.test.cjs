const {test}=require('node:test');const assert=require('node:assert/strict');const {spawn}=require('node:child_process');const path=require('node:path');const {chromium}=require('playwright');
test('water phases and rust use accessible consistent scientific models',async t=>{
 const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:['ignore','pipe','ignore']});t.after(()=>server.kill());
 const port=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server timeout')),5000);server.stdout.on('data',chunk=>{const m=String(chunk).match(/port (\d+)/);if(m){clearTimeout(timer);resolve(m[1]);}});server.once('error',reject)});
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});t.after(()=>browser.close());
 for(const width of [1440,1024,390])await t.test(`${width}px: five microscope models and keyboard movement`,async()=>{
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});try{
   await page.goto(`http://127.0.0.1:${port}/units/2/parts/2.1/#s7`);await page.waitForFunction(()=>[...document.querySelectorAll('#s7 .microscope-source img')].every(img=>img.complete&&img.naturalWidth));
   const counts=[];
   for(const phase of ['ice','liquid','vapor']){
    const source=page.locator(`[data-microscope-phase="${phase}"]`),groups=source.locator('.microscope-water-unit');const count=await groups.count();counts.push(count);assert.ok(count>10,`${phase} model populated`);
    const group=groups.first();assert.equal(await group.locator('.oxygen').count(),1);assert.equal(await group.locator('.hydrogen').count(),2);
    const coords=await group.locator('circle').evaluateAll(ns=>ns.map(n=>[+(n.getAttribute('cx')||0),+(n.getAttribute('cy')||0)]));const [[ox,oy],[x1,y1],[x2,y2]]=coords,a=[x1-ox,y1-oy],b=[x2-ox,y2-oy];const angle=Math.acos((a[0]*b[0]+a[1]*b[1])/(Math.hypot(...a)*Math.hypot(...b)))*180/Math.PI;assert.ok(angle>100&&angle<110,`${phase} water angle ${angle}`);
   }
   assert.ok(counts[2]<counts[0]&&counts[2]<counts[1],'water vapor is represented as more spread out');
   assert.equal(await page.locator('[data-microscope-phase="iron"] .microscope-iron-cell').count(),256);
   assert.ok(await page.locator('[data-microscope-phase="rust"] [data-particle-type="iron-oxide"]').count()>0);
   assert.ok(await page.locator('[data-microscope-phase="rust"] [data-particle-type="iron"]').count()>0);
   for(const phase of ['ice','liquid','vapor','iron','rust']){
    const lens=page.locator(`[data-microscope-phase="${phase}"] .microscope-glass`);await lens.scrollIntoViewIfNeeded();await lens.focus();const before=Number(await lens.getAttribute('aria-valuenow'));await page.keyboard.press('ArrowRight');const after=Number(await lens.getAttribute('aria-valuenow'));assert.ok(after>before,`${phase} lens moves by keyboard`);
   }
   const rustGroups=page.locator('[data-microscope-phase="rust"] [data-particle-type="iron-oxide"]');
   const atomCounts=await rustGroups.evaluateAll(gs=>[...new Set(gs.map(g=>g.querySelectorAll('circle').length))]);assert.ok(atomCounts.length>1,'rust does not use a single fixed composition');
   const lens=page.locator('[data-microscope-phase="iron"] .microscope-glass');await lens.scrollIntoViewIfNeeded();const r=await lens.boundingBox();const previous=Number(await lens.getAttribute('aria-valuenow'));
   await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();await page.mouse.move(r.x+r.width/2-20,r.y+r.height/2,{steps:4});await page.mouse.up();assert.ok(Number(await lens.getAttribute('aria-valuenow'))<previous,'lens can be dragged');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
   if(process.env.MICROSCOPE_CAPTURE_DIR)await page.locator('#s7 .change-comparison-grid').screenshot({path:path.join(process.env.MICROSCOPE_CAPTURE_DIR,`microscope-${width}.png`)});
  }finally{await page.close()}
 });
});
