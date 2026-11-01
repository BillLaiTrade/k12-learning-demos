const{test}=require('node:test'),assert=require('node:assert/strict'),{spawn}=require('node:child_process'),path=require('node:path'),fs=require('node:fs/promises'),{chromium}=require('playwright');
test('oxygen requested visual and physical corrections',{timeout:180000},async t=>{
 let server,url=process.env.OXYGEN_REVIEW_URL;
 if(!url){server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..')});t.after(()=>server.kill());const port=await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('server timeout')),5000);server.stdout.on('data',b=>{const m=String(b).match(/port (\d+)/);if(m){clearTimeout(timeout);resolve(m[1]);}});server.once('error',reject);});url=`http://127.0.0.1:${port}/units/2/parts/2.3/`;}
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',...(process.env.OXYGEN_REVIEW_URL?{proxy:{server:process.env.HTTPS_PROXY||process.env.HTTP_PROXY}}:{})});t.after(()=>browser.close());
 const page=await browser.newPage({viewport:{width:1440,height:1100},reducedMotion:'reduce'});t.after(()=>page.close());
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.clock.install();await page.goto(url,{waitUntil:'networkidle'});await page.waitForFunction(()=>document.querySelector('.oxygen-preparation').dataset.ready==='true');await page.clock.pauseAt(await page.evaluate(()=>Date.now()+100));
 const root=page.locator('.oxygen-preparation'),active=()=>root.locator('.oxygen-step-panel:visible'),play=root.locator('[data-play]');
 const out=process.env.OXYGEN_REVIEW_ARTIFACT_DIR||'/tmp/unit23-requested-review';await fs.mkdir(out,{recursive:true});const records=[];
 async function choose(i){const tab=root.locator(`#oxygen-tab-${i}`);if(!await tab.isVisible())await root.locator('[data-step-menu]').click();await tab.click();}
 async function contact(){return root.locator('[data-setup-body=jar]').evaluate(jar=>{
  const plate=document.querySelector('[data-setup-body=plate]');
  const at=node=>{const m=node.transform.baseVal.consolidate().matrix;return{x:m.a*111.5+m.c*18+m.e,y:m.b*111.5+m.d*18+m.f};};
  const a=at(jar),b=at(plate);return{jar:a,plate:b,distance:Math.hypot(a.x-b.x,a.y-b.y)};
 });}
 async function finishCaption(){for(let i=0;i<3;i++){await active().locator('[data-scene-note]').evaluate(e=>e.getAnimations().forEach(a=>a.finish()));await page.waitForTimeout(20);}}
 async function shot(name){await finishCaption();await root.locator('.oxygen-stage-area').screenshot({path:path.join(out,name+'.png')});}
 await t.test('glass plate contacts the actual mouth through inversion, submersion, withdrawal and upright storage',async()=>{
  await choose(1);await page.clock.fastForward(10000);let elapsed=10000;
  for(const time of[10000,11000,11400,12400,13500,14800]){await page.clock.fastForward(time-elapsed);elapsed=time;const p=await contact();assert.ok(p.distance<.01,`${time}: ${p.distance}`);}
  await shot('covered-underwater-1440');await choose(7);elapsed=0;
  for(const time of[2200,2600,3300,4000,4900,5600,6500,7600,7800]){
   await page.clock.fastForward(time-elapsed);elapsed=time;const p=await contact();assert.ok(p.distance<.01,`storage ${time}: ${p.distance}`);records.push({time,mouth:p.jar,plate:p.plate});
   if(time>=4200&&time<=5600)assert.ok(p.jar.y<540,'turning only happens after the mouth leaves water');
  }
  const end=await active().getAttribute('data-storage-set-down');assert.equal(end,'1');assert.equal(await root.getAttribute('data-state'),'complete');
  const base=await root.locator('[data-setup-body=jar]').evaluate(e=>{const m=e.transform.baseVal.consolidate().matrix;return{x:m.a*111.5+m.c*414+m.e,y:m.b*111.5+m.d*414+m.f};});
  assert.ok(Math.abs(base.x-1190)<1&&Math.abs(base.y-849)<1,'upright jar must rest on the foreground table');await shot('stored-on-table-1440');
 });
 await t.test('flask liquid and manganese stay inside glass; black solid remains visible on desktop and phone',async()=>{
  for(const width of[1440,390]){
   await page.setViewportSize({width,height:1100});await choose(3);await page.clock.fastForward(2800);await play.click();
   const svg=active().locator('.oxygen-main-scene');await svg.scrollIntoViewIfNeeded();
   const points=await svg.evaluate(e=>{const m=e.getScreenCTM(),r=e.getBoundingClientRect();return[[140,750],[485,740],[485,775],[315,805],[315,770]].map(([x,y])=>({x:Math.round(m.a*x+m.c*y+m.e-r.x),y:Math.round(m.b*x+m.d*y+m.f-r.y)}));});
   const painted=await svg.screenshot();await root.locator('[data-shared-flask-liquid]').evaluate(e=>e.parentElement.style.visibility='hidden');const bare=await svg.screenshot();await root.locator('[data-shared-flask-liquid]').evaluate(e=>e.parentElement.style.visibility='');
   const samples=await page.evaluate(async({a,b,points})=>{async function read(data){const image=new Image();image.src='data:image/png;base64,'+data;await image.decode();const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const x=c.getContext('2d');x.drawImage(image,0,0);return points.map(p=>Array.from(x.getImageData(p.x,p.y,1,1).data));}return{painted:await read(a),bare:await read(b)};},{a:painted.toString('base64'),b:bare.toString('base64'),points});
   samples.painted.slice(0,4).forEach((p,i)=>assert.deepEqual(p,samples.bare[i],`${width}/${i}: contents must not paint outside the flask`));
   const solid=samples.painted[4];assert.ok(solid.slice(0,3).every(v=>v<110),`${width}: manganese should be visibly dark`);
   assert.ok(samples.bare[4].slice(0,3).reduce((a,b)=>a+b,0)-solid.slice(0,3).reduce((a,b)=>a+b,0)>80,`${width}: manganese must visibly change the bottle pixels`);
   await shot(`manganese-${width}`);
  }
 });
 await t.test('liquid reaches both glass walls and the base during pouring instead of floating inside a narrower shape',async()=>{
  for(const width of[1440,390])for(const time of[1600,2800]){
   await page.setViewportSize({width,height:1100});await choose(2);await page.clock.fastForward(time);await play.click();
   const svg=active().locator('.oxygen-main-scene'),liquid=root.locator('[data-shared-flask-liquid]');await svg.scrollIntoViewIfNeeded();
   const level=Number(await liquid.getAttribute('y'));
   const points=await svg.evaluate((e,level)=>{const m=e.getScreenCTM(),r=e.getBoundingClientRect();return[[198,650],[442,650],[185,675],[449,675],[173,725],[459,725],[184,770],[447,770],[315,795]].filter(([,y])=>y>level+12).map(([x,y])=>({world:[x,y],x:Math.round(m.a*x+m.c*y+m.e-r.x),y:Math.round(m.b*x+m.d*y+m.f-r.y)}));},level);
   const painted=await svg.screenshot();await liquid.evaluate(e=>e.style.visibility='hidden');const bare=await svg.screenshot();await liquid.evaluate(e=>e.style.visibility='');
   const changes=await page.evaluate(async({a,b,points})=>{async function read(data){const image=new Image();image.src='data:image/png;base64,'+data;await image.decode();const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const x=c.getContext('2d');x.drawImage(image,0,0);return points.map(p=>Array.from(x.getImageData(p.x,p.y,1,1).data));}const x=await read(a),y=await read(b);return x.map((p,i)=>p.slice(0,3).reduce((sum,v,j)=>sum+Math.abs(v-y[i][j]),0));},{a:painted.toString('base64'),b:bare.toString('base64'),points});
   changes.forEach((change,i)=>assert.ok(change>=4,`${width}/${time}/${points[i].world}: liquid must touch the inner wall or base (${change})`));
   if(time===2800){const surface=await root.locator('[data-shared-flask-surface]').evaluate(e=>({x:+e.getAttribute('cx'),r:+e.getAttribute('rx')}));assert.ok(surface.x-surface.r<202&&surface.x+surface.r>435,'the meniscus must span the full inner width');await shot(`wall-fit-${width}`);}
  }
 });
 await t.test('the tank label and its short leader stay on the trough, away from the sealed glass plate',async()=>{
  await page.setViewportSize({width:1440,height:1100});
  for(const time of[0,1600,2200,5000,7800]){
   await choose(7);await page.clock.fastForward(time);
   const label=root.locator('[data-setup-label=tank]');assert.equal(await label.textContent(),'水槽');assert.equal(await label.evaluate(e=>e.parentElement.dataset.setupBody),'tank');
   if(time===1600){assert.equal(await label.getAttribute('opacity'),'0');continue;}
   assert.equal(await label.getAttribute('opacity'),'1');
   const position=await label.evaluate(e=>({x:+e.getAttribute('x'),y:+e.getAttribute('y')}));const p=await contact();assert.ok(Math.hypot(position.x-p.plate.x,position.y-p.plate.y)>100);
   const target=await root.locator('[data-tank-label-leader] circle').evaluate(e=>({x:+e.getAttribute('cx'),y:+e.getAttribute('cy')}));assert.ok(target.x>1380&&target.x<1445&&target.y>600&&target.y<735,'leader points to the actual right tank wall');
  }
  await shot('tank-label-and-real-plate-1440');
 });
 await t.test('the material tube, cork and glass plate use the original photographic equipment cutouts',async()=>{
  await choose(0);
  for(const key of['tube','stopper','plate']){
   const image=root.locator(`[data-photographic-equipment=${key}] image`);assert.equal(await image.count(),1);assert.equal(await image.getAttribute('href'),'assets/oxygen-setup-sprites.png');
  }
  assert.equal(await root.locator('[data-photographic-equipment=tube]').getAttribute('opacity'),'1');assert.equal(await root.locator('[data-setup-body=tube]').getAttribute('opacity'),'0');
  const plateCoverage=await root.locator('[data-photographic-equipment=plate]').evaluate(async node=>{
   const copy=node.cloneNode(true),image=copy.querySelector('image'),source=await fetch(image.href.baseVal).then(r=>r.blob());
   image.href.baseVal=await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.readAsDataURL(source);});
   const xml=`<svg xmlns="http://www.w3.org/2000/svg" width="340" height="70" viewBox="-40 0 340 70">${new XMLSerializer().serializeToString(copy)}</svg>`;
   const rendered=new Image();rendered.src='data:image/svg+xml;base64,'+btoa(xml);await rendered.decode();
   const canvas=document.createElement('canvas');canvas.width=340;canvas.height=70;const context=canvas.getContext('2d');context.drawImage(rendered,0,0);
   return[70,111.5,150].map(x=>context.getImageData(Math.round(x+40),30,1,1).data[3]);
  });
  assert.ok(plateCoverage.every(alpha=>alpha>15),'the photographic plate must actually cover the projected bottle opening, without a visible gap');
  await root.locator('.oxygen-stage-area').screenshot({path:path.join(out,'photographic-materials-1440.png')});
  await choose(1);
  const stopper=active().locator('.oxygen-main-scene [data-equipment=stopper]');await stopper.scrollIntoViewIfNeeded();
  const point=await stopper.evaluate(e=>{const m=e.getScreenCTM(),r=e.getBBox(),x=r.x+r.width/2,y=r.y+r.height/2;return{x:m.a*x+m.c*y+m.e,y:m.b*x+m.d*y+m.f};});
  await page.mouse.click(point.x,point.y);const dialog=page.locator('#oxygen-equipment-dialog');assert.equal(await dialog.isVisible(),true);assert.equal(await dialog.locator('[data-equipment-title]').innerText(),'塞子');assert.equal(await root.getAttribute('data-state'),'paused');
  await dialog.locator('.oxygen-equipment-return').click();await page.clock.runFor(20);await play.click();await page.clock.fastForward(20800);assert.equal(await root.locator('[data-photographic-equipment=tube]').getAttribute('opacity'),'0');assert.equal(await root.locator('[data-setup-body=tube]').getAttribute('opacity'),'1');
 });
 await t.test('tube glass retains its diameter while lying on the desk, lifting and connecting',async()=>{
  for(const width of[1440,390,320]){
   await page.setViewportSize({width,height:1100});await choose(1);let at=0;
   for(const time of[0,2000,18000,18800,19600,20800]){
    await page.clock.fastForward(time-at);at=time;
    const size=await active().locator('.oxygen-main-scene').evaluate(svg=>{const p=document.querySelector('[data-shared-tube-path]'),m=p.parentElement.transform.baseVal.consolidate()?.matrix,screen=svg.getScreenCTM();return{diameter:parseFloat(getComputedStyle(p).strokeWidth)*screen.a,sx:m?.a??1,sy:m?.d??1};});
    assert.ok(size.diameter>=2&&size.diameter<=12,`${width}/${time}: visible glass diameter ${size.diameter}`);assert.equal(size.sx,size.sy,'the glass tube must not be flattened');
   }
  }
 });
 await t.test('background beside the flask and below the trough toggles pause and resume instead of opening equipment',async()=>{
  await page.setViewportSize({width:1440,height:1100});await choose(6);await page.clock.fastForward(1500);
  for(const[x,y]of[[195,340],[650,800],[1450,190]]){
   const svg=active().locator('.oxygen-main-scene');await svg.scrollIntoViewIfNeeded();const p=await svg.evaluate((e,{x,y})=>{const m=e.getScreenCTM();return{x:m.a*x+m.c*y+m.e,y:m.b*x+m.d*y+m.f};},{x,y});
   await page.mouse.click(p.x,p.y);assert.equal(await root.getAttribute('data-state'),'paused');assert.equal(await page.locator('#oxygen-equipment-dialog').isVisible(),false);
   const at=await root.getAttribute('data-elapsed');await page.clock.fastForward(500);assert.equal(await root.getAttribute('data-elapsed'),at);await page.mouse.click(p.x,p.y);assert.equal(await root.getAttribute('data-state'),'playing');
  }
 });
 await t.test('subtitles are prominent, stable and below both main picture and close-up; full collection states its supply condition',async()=>{
  for(const width of[1440,390,320]){
   await page.setViewportSize({width,height:1100});let height;
   for(const[stage,time]of[[1,7000],[3,1300],[6,5200],[7,7800]]){
    await choose(stage);await page.clock.fastForward(time);await finishCaption();
    const strip=active().locator('.oxygen-caption'),a=await strip.boundingBox(),b=await active().locator('.oxygen-drawing').boundingBox();
    assert.ok(a.y>=b.y+b.height-1,'subtitles must never overlap the pictures');assert.equal(await strip.locator('.oxygen-caption-label').innerText(),'畫面說明');
    if(height)assert.ok(Math.abs(a.height-height)<1.5,`${width}: subtitle block should not jump when words change`);height=a.height;
    if(stage===6)assert.match(await active().locator('[data-scene-note]').innerText(),/雙氧水足量/);
    if(stage===7){assert.match(await active().locator('[data-scene-note]').innerText(),/取出並轉正放到桌面/);if(width!==320)await shot(`storage-subtitles-${width}`);}
   }
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  }
  assert.match(await root.locator('.oxygen-model-note').innerText(),/濃度、用量與集氣瓶容量/);
 });
 assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'contact-measurements.json'),JSON.stringify(records,null,2)+'\n');
});
