const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');
const fs=require('node:fs');
const {chromium,expect}=require('playwright/test');

test('手電筒實體開關與畫面按鈕同步，拖曳與觸控可用',{timeout:120000},async t=>{
 let base=process.env.LESSON_BASE_URL;
 if(!base){const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:['ignore','pipe','ignore']});t.after(()=>server.kill());const port=await new Promise((resolve,reject)=>{let s='';server.stdout.on('data',d=>{s+=d;const m=s.match(/port (\d+)/);if(m)resolve(m[1]);});server.once('error',reject);});base=`http://127.0.0.1:${port}/`;}
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader'],...(process.env.LESSON_USE_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{})});t.after(()=>browser.close());
 const capture=process.env.FLASHLIGHT_CAPTURE_DIR;if(capture)fs.mkdirSync(capture,{recursive:true});
 for(const width of [1440,390,320]){
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce',hasTouch:true});
  await context.route(/\/assets\/(laser-reflection|reversible-light|periscope|mirror-image|mirror-distance|curved-mirrors)\.js/,r=>r.fulfill({contentType:'application/javascript',body:''}));
  await context.route('**/assets/reflection-3d.js*',async route=>{const response=await route.fetch(),s=await response.text(),anchor='  const duration = 1150;';assert.ok(s.includes(anchor));await route.fulfill({response,body:s.replace(anchor,`  window.__flashlightTest={lamps,camera};\n${anchor}`)});});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(new URL('units/4/parts/4.2/',base).href,{waitUntil:'load'});await page.addStyleTag({content:'html{scroll-behavior:auto!important}'});
  const canvas=page.locator('#reflection-3d-scene'),left=page.locator('#reflection-fire-mirror'),right=page.locator('#reflection-fire-paper');await expect(canvas).toHaveAttribute('data-ready','true',{timeout:60000});
  for(const b of [left,right]){await expect(b).toHaveAttribute('aria-pressed','false');await expect(b.locator('small')).toHaveText('已關閉・點擊開啟');assert.equal(await b.locator('.flashlight-icon,.flashlight-power').count(),2);const box=await b.boundingBox();assert.ok(box.height>=44);}
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const point=async index=>page.evaluate(index=>{const {lamps,camera}=window.__flashlightTest,part=lamps[index].getObjectByName('flashlight-power-switch');if(!part)return null;const p=part.getWorldPosition(lamps[index].position.clone()).project(camera),r=document.querySelector('#reflection-3d-scene').getBoundingClientRect();return{x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};},index);
  await canvas.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));await page.screenshot({clip:{x:0,y:0,width:1,height:1}});
  const hint=await page.locator('.reflection-drag-hint').boundingBox(),scene=await canvas.boundingBox();assert.ok(hint.y+hint.height<=scene.y+1,'拖曳提示不得遮住 3D 手電筒');
  if(capture)await page.locator('.reflection-stage').screenshot({path:path.join(capture,`off-${width}.png`)});
  for(const b of [left,right]){const size=await b.locator('strong').evaluate(e=>({height:e.getBoundingClientRect().height,font:parseFloat(getComputedStyle(e).fontSize)}));assert.ok(size.height<=size.font*1.5,JSON.stringify({width,size}));}
  let target=await point(0);assert.ok(target);if(width===390)await page.touchscreen.tap(target.x,target.y);else await page.mouse.click(target.x,target.y);
  await expect(left).toHaveAttribute('aria-pressed','true');await expect(left.locator('small')).toHaveText('已開啟・點擊關閉');await expect(right).toHaveAttribute('aria-pressed','false');
  await left.click();await expect(left).toHaveAttribute('aria-pressed','false');
  await right.focus();await page.keyboard.press('Space');await expect(right).toHaveAttribute('aria-pressed','true');
  await canvas.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));const r=await canvas.boundingBox();await page.mouse.move(r.x+r.width*.53,r.y+r.height*.50);await page.mouse.down();await page.mouse.move(r.x+r.width*.58,r.y+r.height*.53,{steps:5});await page.mouse.up();await expect(canvas).toHaveAttribute('data-view','free');await expect(right).toHaveAttribute('aria-pressed','true');
  await page.locator('#reflection-reset-view').click();await expect(canvas).toHaveAttribute('data-view','front');await expect(right).toHaveAttribute('aria-pressed','true');await expect(left).toHaveAttribute('aria-pressed','false');
  target=await point(1);if(width===390)await page.touchscreen.tap(target.x,target.y);else await page.mouse.click(target.x,target.y);await expect(right).toHaveAttribute('aria-pressed','false');assert.deepEqual(errors,[]);await context.close();
 }
});
