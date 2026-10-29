const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
const {expect}=require('playwright/test');
const root=path.resolve(__dirname,'..'),captures='/tmp/unit11-theatre-finish';
const targets={moon:{x:-1.47,y:1.79},rabbit:{x:-.02,y:1.31},tree:{x:1.47,y:1.53}};
let optics;
const near=(a,b,e=1e-10)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);
const load=async()=>optics||=await import(pathToFileURL(path.join(root,'units/4/parts/4.1/assets/shadow-theatre-optics.mjs')));
test('影子劇場：投影大小、位置及保留深度的吸附',async t=>{
 const {THEATRE_OPTICS:g,shadowScaleAt,projectShadow,positionForShadow,assessShadow}=await load();
 await t.test('初始前後位置即使影子中心完全對齊，大小仍不合格',()=>{
  for(const [id,z] of [['moon',.92],['rabbit',.7],['tree',.02]]){
   const p=positionForShadow(targets[id],z),a=assessShadow(p,targets[id]);assert.ok(a.positionMatches);assert.ok(!a.sizeMatches);assert.ok(!a.matches);assert.equal(p.z,z);
  }
 });
 await t.test('大小與位置各自判定，小幅修正只改x/y且保留非標準z',()=>{
  for(const z of [.34,.38,.44,.5])for(const target of Object.values(targets)){
   const aligned=positionForShadow(target,z),scale=shadowScaleAt(z),p={x:aligned.x+.06/scale,y:aligned.y+.06/scale,z};
   const a=assessShadow(p,target);assert.ok(a.matches);assert.ok(a.positionError>0);const after=positionForShadow(target,p.z);
   assert.equal(after.z,p.z);near(projectShadow(after).x,target.x);near(projectShadow(after).y,target.y);near(shadowScaleAt(after.z),scale);
   const far={...aligned,x:aligned.x+(g.positionTolerance+.001)/scale};assert.ok(!assessShadow(far,target).matches);
  }
 });
 await t.test('容錯邊界清楚，既有0.16步幅可調至合格大小',()=>{
  for(const error of [-.040001,-.04,0,.04,.040001]){
   const z=g.light.z-(g.light.z-g.targetDepth)/(1+error),p=positionForShadow(targets.moon,z);assert.equal(assessShadow(p,targets.moon).sizeMatches,Math.abs(error)<=.04);
  }
  for(const start of [.92,.7,.02])assert.ok(Array.from({length:15},(_,i)=>start+(i-7)*.16).filter(z=>z>g.screenZ&&z<g.light.z).some(z=>assessShadow(positionForShadow(targets.tree,z),targets.tree).sizeMatches));
  assert.throws(()=>shadowScaleAt(g.light.z),RangeError);assert.throws(()=>shadowScaleAt(g.screenZ),RangeError);
 });
 await t.test('80組直線與屏幕交點獨立核對投影，改變深度的大小方向正確',()=>{
  for(let i=0;i<80;i++){
   const p={x:-1.8+(i%8)*.42,y:.6+(i%10)*.17,z:-.5+(i%16)*.18};
   // Intersect L+s(P-L) with z=screenZ; do not use the projection helper.
   const t=(g.screenZ-g.light.z)/(p.z-g.light.z),x=g.light.x+t*(p.x-g.light.x),y=g.light.y+t*(p.y-g.light.y),a=projectShadow(p);near(a.x,x);near(a.y,y);near(a.scale,t);
  }
  assert.ok(shadowScaleAt(.92)>shadowScaleAt(.7));assert.ok(shadowScaleAt(.7)>shadowScaleAt(.02));
 });
 await t.test('尺軌左端光源、右端屏幕，刻度與前後位置雙向換算',()=>{
  const {depthToRuler,rulerToDepth,DEPTH_LIMITS:l}=optics;
  near(depthToRuler(l.max),0);near(depthToRuler(l.min),10);near(rulerToDepth(0),l.max);near(rulerToDepth(10),l.min);
  for(let i=0;i<=100;i++){const v=i/10;near(depthToRuler(rulerToDepth(v)),v);}
  assert.ok(shadowScaleAt(rulerToDepth(2))>shadowScaleAt(rulerToDepth(8)));assert.equal(rulerToDepth(-4),l.max);assert.equal(rulerToDepth(14),l.min);
 });
});
test('影子劇場實際操作：學生調大小與位置後才小幅吸附',{timeout:300000},async t=>{
 await load();fs.mkdirSync(captures,{recursive:true});
 const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:root,stdio:['ignore','pipe','pipe']});t.after(()=>server.kill());
 const port=await new Promise((resolve,reject)=>{let text='';const timer=setTimeout(()=>reject(Error('server timeout')),5000);server.stdout.on('data',d=>{text+=d;const m=text.match(/port (\d+)/);if(m){clearTimeout(timer);resolve(m[1]);}});});
 const url=`http://127.0.0.1:${port}/units/4/parts/4.1/#unit-booklet`,errors=[];
 const launch=()=>chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const browser=await launch();t.after(()=>browser.close());
 async function open(context){const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('requestfailed',r=>errors.push(r.url()));p.on('response',r=>{if(r.status()>=400)errors.push(r.url());});
  await p.route('**/assets/shadow-theatre.js*',async route=>{const response=await route.fetch(),body=await response.text();assert.ok(body.includes('const checkPlacement = (prop, allowSnap = true) => {'));await route.fulfill({response,body:body.replace('const checkPlacement = (prop, allowSnap = true) => {','window.__theatreTest={props,camera,scene,lightSource,shadowScale,screenZ}; const checkPlacement = (prop, allowSnap = true) => {')});});
  await p.bringToFront();await p.goto(url,{waitUntil:'networkidle'});await p.locator('#shadow-theatre-scene').scrollIntoViewIfNeeded();await p.waitForFunction(()=>!!window.__theatreTest,null,{polling:100,timeout:60000});return p;
 }
 const context=await browser.newContext({viewport:{width:1440,height:1050}}),p=await open(context);
 async function read(page=p){return page.evaluate(()=>Object.fromEntries([...window.__theatreTest.props].map(([id,prop])=>[id,{x:prop.mesh.position.x,y:prop.mesh.position.y,z:prop.mesh.position.z,placed:prop.placed,scale:prop.mesh.scale.toArray(),rim:prop.rim.position.toArray(),target:{x:prop.target.x,y:prop.target.y},guideOpacity:prop.guide.material.opacity}])));}
 async function select(id,page=p){const button=page.locator(`[data-prop-select="${id}"]`);if(await button.getAttribute('aria-pressed')!=='true')await button.click();await page.locator('#shadow-theatre-scene').focus();}
 async function alignXY(id,page=p,targetDepth=null){await select(id,page);let triggerRaw;
  for(const axis of ['x','y']){
   for(let n=0;n<60;n++){
    const before=(await read(page))[id];if(before.placed)return triggerRaw;const target=optics.positionForShadow(before.target,targetDepth??before.z),delta=target[axis]-before[axis];if(Math.abs(delta)<.0175)break;
    const coarse=Math.abs(delta)>.16,step=coarse?.12:.035,positive=delta>0,key=axis==='x'?(positive?'ArrowRight':'ArrowLeft'):(positive?'ArrowUp':'ArrowDown');
    await page.keyboard.press((coarse?'Shift+':'')+key);const after=(await read(page))[id];assert.equal(after.z,before.z);
    if(after.placed){triggerRaw={...before,[axis]:before[axis]+(positive?step:-step)};return triggerRaw;}
   }
  }
  return triggerRaw;
 }
 async function shot(name,page=p){const style=await page.addStyleTag({content:'.route{visibility:hidden!important}'});await page.locator('#unit-booklet').screenshot({path:`${captures}/${name}.png`});await style.evaluate(e=>e.remove());}
 await t.test('只調左右／上下無法通過三個初始深度；大與小回饋符合實際投影',async()=>{
  for(const id of ['moon','rabbit','tree']){const before=(await read())[id];await alignXY(id);const after=(await read())[id];assert.ok(!after.placed);assert.equal(after.z,before.z);assert.ok(optics.assessShadow(after,after.target).positionMatches);await expect(p.locator('#shadow-theatre-status')).toContainText(id==='tree'?'偏小':'偏大');}
  await expect(p.locator('#shadow-theatre-finish')).toBeDisabled();assert.equal(await p.locator('[data-prop-state]').filter({hasText:'已對準'}).count(),0);await shot('wrong-size');
 });
 await t.test('大小合適但位置遠離目標時不吸附；三個道具皆保留學生深度',async()=>{
  await p.locator('#shadow-theatre-reset').click();
  for(const [id,direction,count] of [['moon',-1,3],['rabbit',-1,2],['tree',1,2]]){
   await select(id);const start=(await read())[id],input=p.locator('#shadow-theatre-depth');await input.fill(String(Math.round(optics.depthToRuler(start.z+direction*count*.16)*100)/100));await input.dispatchEvent('input');await input.dispatchEvent('change');const before=(await read())[id];
   near(before.z,optics.rulerToDepth(Number(await input.inputValue())));assert.equal(before.x,start.x);assert.equal(before.y,start.y);assert.ok(!before.placed);assert.ok(optics.assessShadow(before,before.target).sizeMatches);await expect(p.locator('#shadow-theatre-status')).toContainText('位置還沒對齊');
   const raw=await alignXY(id),after=(await read())[id];assert.ok(after.placed);assert.equal(after.z,before.z);assert.notEqual(after.z,.42);assert.deepEqual(after.scale,start.scale);assert.deepEqual(after.rim,[after.x,after.y,after.z]);
   near(optics.projectShadow(after).x,after.target.x);near(optics.projectShadow(after).y,after.target.y);assert.ok(optics.assessShadow(raw,after.target).matches);assert.ok(Math.hypot(after.x-raw.x,after.y-raw.y)<=optics.THEATRE_OPTICS.positionTolerance/optics.shadowScaleAt(after.z)+1e-10);
  }
  await expect(p.locator('#shadow-theatre-finish')).toBeEnabled();await p.waitForTimeout(500);await shot('placed');
 });
 await t.test('完成後停用並提示重設；重新挑戰與五種寬度正常',async()=>{
  const finish=p.locator('#shadow-theatre-finish'),note=p.locator('#shadow-theatre-finish-note');
  await finish.click();await expect(note).toHaveAttribute('data-done','true');await expect(finish).toHaveText('演出完成');await expect(finish).toBeDisabled();await expect(note).toHaveText('想重新挑戰，請按上方「重設舞台」。');await shot('finish-desktop');
  await finish.evaluate(e=>e.click());await expect(finish).toBeDisabled();await expect(note).toHaveText('想重新挑戰，請按上方「重設舞台」。');
  await p.setViewportSize({width:390,height:1050});await shot('finish-mobile');
  await p.locator('#shadow-theatre-reset').click();await select('tree');
  for(const width of [320,390,768,1024,1440]){await p.setViewportSize({width,height:1050});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));const box=await p.locator('#shadow-theatre-depth-controls').boundingBox();assert.ok(box.height>=70&&box.height<=85);if(width===390)await shot('mobile');if(width===1440)await shot('ruler-desktop');}
  await p.locator('#shadow-theatre-reset').click();const reset=await read();for(const [id,z] of [['moon',.92],['rabbit',.7],['tree',.02]]){assert.equal(reset[id].z,z);assert.ok(!reset[id].placed);assert.equal(reset[id].guideOpacity,.88);}await expect(finish).toBeDisabled();await expect(finish).toHaveText('完成演出');await expect(note).toHaveAttribute('data-done','false');await expect(note).toHaveText('道具就位後，描邊會全部消失。');await expect(p.locator('.booklet-progress-track')).toHaveAttribute('aria-valuenow','0');await expect(p.locator('#shadow-theatre-depth-controls')).toBeHidden();await shot('initial');
  for(const id of ['moon','rabbit','tree']){await select(id);const input=p.locator('#shadow-theatre-depth');await input.fill(String(Math.round(optics.depthToRuler(.42)*100)/100));await input.dispatchEvent('input');await input.dispatchEvent('change');await alignXY(id);assert.ok((await read())[id].placed);}
  await expect(finish).toBeEnabled();await finish.click();await expect(finish).toHaveText('演出完成');await expect(finish).toBeDisabled();await p.locator('#shadow-theatre-reset').click();
 });
 async function screenPoint(page,id,dx=0,dy=0){return page.locator('#shadow-theatre-scene').evaluate((el,{id,dx,dy})=>{const a=window.__theatreTest,v=a.props.get(id).mesh.position.clone();v.x+=dx;v.y+=dy;v.project(a.camera);const r=el.getBoundingClientRect();return{x:r.x+(v.x+1)*r.width/2,y:r.y+(1-v.y)*r.height/2};},{id,dx,dy});}
 await t.test('滑鼠拖曳及滾輪只改學生操作的方向，鏡頭轉動不改判定',async()=>{
  const el=p.locator('#shadow-theatre-scene');await el.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));await p.waitForTimeout(250);const a=await screenPoint(p,'moon'),b=await screenPoint(p,'moon',.2,.2),before=(await read()).moon;
  await p.mouse.move(a.x,a.y);await p.mouse.down();assert.equal(await el.evaluate(e=>e.hasPointerCapture(1)),true);await p.mouse.move(b.x,b.y,{steps:8});await p.mouse.up();const dragged=(await read()).moon;assert.equal(dragged.z,before.z);assert.ok(!dragged.placed);assert.ok(Math.hypot(dragged.x-before.x,dragged.y-before.y)>.1);
  await p.locator('#shadow-theatre-view').click();assert.deepEqual((await read()).moon,dragged);
  await select('moon');await el.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));const box=await el.boundingBox();await p.mouse.move(box.x+box.width/2,box.y+box.height/2);await p.mouse.wheel(0,-80);await expect.poll(async()=>(await read()).moon.z).toBe(dragged.z+.16);near((await read()).moon.z,dragged.z+.16);assert.ok(!(await read()).moon.placed);assert.deepEqual(errors,[]);
 });
 await t.test('尺軌刻度、端點、讀值及鍵盤方向正確，切換道具不改距離',async()=>{
  await p.locator('#shadow-theatre-reset').click();
  for(const id of ['moon','rabbit','tree','moon']){const before=(await read())[id];await select(id);assert.equal((await read())[id].z,before.z);near(Number(await p.locator('#shadow-theatre-depth').inputValue()),Math.round(optics.depthToRuler(before.z)*100)/100,.00001);await expect(p.locator('#shadow-theatre-depth-label')).toContainText(before.target.x===-1.47?'月亮':id==='rabbit'?'兔子':'樹影');}
  await expect(p.locator('[data-depth-end]')).toHaveText(['光源','屏幕']);await expect(p.locator('#shadow-theatre-depth-numbers span')).toHaveText(['0','2','4','6','8','10']);assert.equal(await p.locator('[data-depth-step]').count(),0);
  const input=p.locator('#shadow-theatre-depth');await input.focus();await p.keyboard.press('Home');near((await read()).moon.z,optics.DEPTH_LIMITS.max);await p.keyboard.press('End');near((await read()).moon.z,optics.DEPTH_LIMITS.min);const old=(await read()).moon.z;await p.keyboard.press('ArrowLeft');assert.ok((await read()).moon.z>old);assert.ok(!(await read()).moon.placed);
 });
 await t.test('滑鼠拖尺軌即時移動，經過合格位置不提前鎖定，放開才吸附且不改z',async()=>{
  const input=p.locator('#shadow-theatre-depth');
  for(const accept of [false,true]){
   await p.locator('#shadow-theatre-reset').click();await alignXY('moon',p,.42);assert.ok(!(await read()).moon.placed);await input.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));const box=await input.boundingBox(),start=Number(await input.inputValue()),x=v=>box.x+13+(box.width-26)*v/10,y=box.y+9;
   await p.mouse.move(x(start),y);await p.mouse.down();await p.mouse.move(x(6.52),y,{steps:8});await p.waitForTimeout(80);const candidate=(await read()).moon;assert.ok(optics.assessShadow(candidate,candidate.target).matches);assert.ok(!candidate.placed);await expect(input).toBeVisible();
   if(!accept){await p.mouse.move(x(8),y,{steps:8});await p.mouse.up();const wrong=(await read()).moon;assert.ok(!wrong.placed);assert.ok(wrong.z<candidate.z);}
   else{await p.mouse.up();await expect(p.locator('[data-prop-state="moon"]')).toHaveText('已對準');const done=(await read()).moon;assert.equal(done.z,candidate.z);}
  }
 });
 await t.test('獨立手機觸控拖曳舞台與尺軌、吸附保留學生調整的z',async()=>{
  await context.close();await browser.close();const mb=await launch();t.after(()=>mb.close());const mc=await mb.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'}),page=await open(mc);
  try{const el=page.locator('#shadow-theatre-scene');await el.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));await page.waitForTimeout(250);const a=await screenPoint(page,'moon'),b=await screenPoint(page,'moon',.18,.18),cdp=await mc.newCDPSession(page),before=(await read(page)).moon;
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:a.x,y:a.y,id:1}]});for(let n=1;n<=8;n++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:a.x+(b.x-a.x)*n/8,y:a.y+(b.y-a.y)*n/8,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});const moved=(await read(page)).moon;assert.equal(moved.z,before.z);assert.ok(!moved.placed);assert.ok(Math.hypot(moved.x-before.x,moved.y-before.y)>.1);
   await page.locator('#shadow-theatre-reset').tap();await page.locator('[data-prop-select="moon"]').tap();const input=page.locator('#shadow-theatre-depth');await input.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));const box=await input.boundingBox(),startValue=Number(await input.inputValue()),endValue=6.52,startX=box.x+13+(box.width-26)*startValue/10,endX=box.x+13+(box.width-26)*endValue/10,y=box.y+9;
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:startX,y,id:2}]});for(let i=1;i<=10;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:startX+(endX-startX)*i/10,y,id:2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});const z=(await read(page)).moon.z;assert.ok(Math.abs(z-.44)<.025);await alignXY('moon',page);const placed=(await read(page)).moon;assert.ok(placed.placed);assert.equal(placed.z,z);await shot('mobile-touch',page);assert.deepEqual(errors,[]);
  }finally{await mc.close();await mb.close();}
 });
});
