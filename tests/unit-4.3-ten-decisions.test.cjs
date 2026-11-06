const {test}=require('node:test'),assert=require('node:assert/strict');
const {spawn}=require('node:child_process'),path=require('node:path'),fs=require('node:fs/promises');
const {chromium}=require('playwright');
async function setup(t){
 let base=process.env.LESSON_BASE_URL;
 if(!base){
  const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:['ignore','pipe','ignore']});t.after(()=>server.kill());
  const port=await new Promise((resolve,reject)=>{let output='';server.stdout.on('data',b=>{output+=b;const match=output.match(/port (\d+)/);if(match)resolve(match[1]);});server.on('error',reject);});
  base='http://127.0.0.1:'+port+'/units/4/parts/4.3/';
 }
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox'],...(process.env.LESSON_USE_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{})});t.after(()=>browser.close());
 const p=await browser.newPage({viewport:{width:1366,height:768}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 return {p,base,errors};
}
async function ready(p,base){await p.goto(base);await p.waitForFunction(()=>document.querySelector('#speed-lab').dataset.state==='idle'&&document.querySelector('#return-lab').dataset.state==='ready'&&document.querySelector('#rank-lab').dataset.ready==='true');}
async function scroll(p,selector){await p.locator(selector).evaluate(e=>e.scrollIntoView({block:'start',behavior:'instant'}));await p.waitForTimeout(100);}
async function offscreen(p,button){await p.locator(button).evaluate(e=>scrollTo({top:scrollY+e.getBoundingClientRect().top-8,behavior:'instant'}));await p.waitForTimeout(100);}
async function clickAtCurrentPosition(p,selector){const b=await p.locator(selector).boundingBox();await p.mouse.click(b.x+b.width/2,b.y+b.height/2);await p.waitForTimeout(100);}
async function turnOffReturn(p){for(const key of ['a','b'])if(await p.locator('#return-lab').getAttribute('data-light-'+key)==='true')await p.locator('#return-toggle-'+key).click();}
async function bounds(p,stage,controls){
 const a=await p.locator(stage).boundingBox(),b=await p.locator(controls).boundingBox(),height=p.viewportSize().height;
 assert.ok(a.y>=7,stage+' starts above the viewport');assert.ok(a.y+a.height<=height-6,stage+' ends outside the viewport');assert.ok(b.y+b.height<=height-6,controls+' is outside the viewport');
 return {stage:a,controls:b};
}
async function capture(p,selector,name){if(process.env.TEN_CAPTURE_DIR){await fs.mkdir(process.env.TEN_CAPTURE_DIR,{recursive:true});await p.locator(selector).screenshot({path:path.join(process.env.TEN_CAPTURE_DIR,name+'.png')});}}

test('4.3 approved playback visibility and comparison timing',{timeout:180000},async t=>{
 const {p,base,errors}=await setup(t);await p.clock.install();await ready(p,base);await p.clock.pauseAt(new Date(await p.evaluate(()=>Date.now())+100));const rows=[];
 await t.test('manual launch reveals apparatus and controls at four desktop and laptop sizes',async()=>{
  for(const [width,height] of [[1366,768],[1024,768],[1280,720],[1440,900]]){
   await p.setViewportSize({width,height});await p.waitForTimeout(150);
   await offscreen(p,'#race-start');await clickAtCurrentPosition(p,'#race-start');await p.clock.runFor(100);
   rows.push({width,kind:'race',...await bounds(p,'.race-viewport','.race-console')});assert.equal(await p.locator('#speed-lab').getAttribute('data-state'),'running');
   await p.locator('#race-pause').click();const before=Number(await p.locator('#speed-lab').getAttribute('data-elapsed-ms'));
   await offscreen(p,'#race-pause');await p.locator('#race-pause').evaluate(e=>e.focus({preventScroll:true}));await p.keyboard.press('Enter');await p.waitForTimeout(100);await p.clock.runFor(100);
   await bounds(p,'.race-viewport','.race-console');assert.ok(Number(await p.locator('#speed-lab').getAttribute('data-elapsed-ms'))>before);
   await p.clock.runFor(5500);assert.equal(await p.locator('#race-status').textContent(),'三道光皆已到達，可重新比較。');
   await turnOffReturn(p);await offscreen(p,'#return-toggle-a');await clickAtCurrentPosition(p,'#return-toggle-a');await p.clock.runFor(100);
   rows.push({width,kind:'return',...await bounds(p,'#return-viewport','.return-control-deck')});assert.ok(Number(await p.locator('#return-lab').getAttribute('data-progress-a'))>0);await p.clock.runFor(3000);
   await offscreen(p,'#rank-play');await clickAtCurrentPosition(p,'#rank-play');await p.clock.runFor(100);
   rows.push({width,kind:'quiz',...await bounds(p,'.rank-stage','.rank-playback')});assert.equal(await p.locator('#rank-lab').getAttribute('data-state'),'running');await p.clock.runFor(5000);
  }
  await p.setViewportSize({width:1366,height:768});
 });
 await t.test('automatic viewport resumes preserve scroll position and manual pauses',async()=>{
  for(const [root,button,stage,other] of [['#speed-lab','#race-start','.race-viewport','#s2'],['#return-lab','#return-toggle-a','#return-viewport','#s1'],['#rank-lab','#rank-play','.rank-stage','#s6']]){
   if(root==='#return-lab')await turnOffReturn(p);
   await p.locator(button).click();await p.clock.runFor(200);await scroll(p,other);
   const elapsed=await p.locator(root).evaluate(e=>e.dataset.elapsedMs||e.dataset.progressA);await p.clock.runFor(600);assert.equal(await p.locator(root).evaluate(e=>e.dataset.elapsedMs||e.dataset.progressA),elapsed);
   await p.locator(stage).evaluate(e=>scrollTo({top:scrollY+e.getBoundingClientRect().top-60,behavior:'instant'}));await p.waitForTimeout(100);
   const position=await p.evaluate(()=>scrollY);await p.clock.runFor(200);assert.equal(await p.evaluate(()=>scrollY),position);
   assert.notEqual(await p.locator(root).evaluate(e=>e.dataset.elapsedMs||e.dataset.progressA),elapsed);
   await p.clock.runFor(5500);
  }
  await p.locator('#race-start').click();await p.clock.runFor(100);await p.locator('#race-pause').click();await scroll(p,'#s2');await scroll(p,'.race-viewport');await p.clock.runFor(200);assert.equal(await p.locator('#speed-lab').getAttribute('data-pause-reason'),'manual');
 });
 await t.test('reciprocal conclusion waits for both complete paths and resets after changes',async()=>{
  await turnOffReturn(p);await p.locator('#return-toggle-a').click();await p.clock.runFor(3000);
  await p.locator('#return-toggle-b').click();await p.clock.runFor(100);assert.equal(await p.locator('#return-lab').getAttribute('data-progress-a'),'1');assert.ok(Number(await p.locator('#return-lab').getAttribute('data-progress-b'))<1);
  assert.equal(await p.locator('#return-finding').textContent(),'觀察兩束光的路徑與方向');await p.clock.runFor(3000);assert.equal(await p.locator('#return-finding').textContent(),'往返光路重合，方向相反');
  await p.locator('#return-angle').fill('35');assert.equal(await p.locator('#return-finding').textContent(),'觀察兩束光的路徑與方向');await p.clock.runFor(3000);assert.equal(await p.locator('#return-finding').textContent(),'往返光路重合，方向相反');
  await p.locator('#return-medium-toggle [data-lab-medium=glass]').click();await p.waitForFunction(()=>document.querySelector('#return-lab').dataset.medium==='glass'&&document.querySelector('#return-lab').dataset.state==='ready');assert.equal(await p.locator('#return-finding').textContent(),'觀察兩束光的路徑與方向');await p.clock.runFor(3000);assert.equal(await p.locator('#return-finding').textContent(),'往返光路重合，方向相反');
  await capture(p,'#return-lab','reciprocal-complete');
 });
 if(process.env.TEN_CAPTURE_DIR)await fs.writeFile(path.join(process.env.TEN_CAPTURE_DIR,'viewport.json'),JSON.stringify(rows,null,2));assert.deepEqual(errors,[]);
});

test('depth takeaway agrees with the paired view for empty, occluded and visible water states',{timeout:90000},async t=>{
 const {p,base,errors}=await setup(t);await ready(p,base+'#s6');await scroll(p,'#depth-lab');const rows=[];
 for(const [depth,eyeX,status] of [[0,300,'hidden'],[0,210,'visible'],[0,250,'partial'],[20,340,'hidden'],[70,300,'partial'],[100,210,'visible'],[0,300,'hidden']]){
  await p.evaluate(([d,x])=>{const eye=document.querySelector('#depth-eye');eye.dispatchEvent(new KeyboardEvent('keydown',{key:'Home',bubbles:true}));for(let n=210;n<x;n+=10)eye.dispatchEvent(new KeyboardEvent('keydown',{key:'PageUp',bubbles:true}));const water=document.querySelector('#depth-input');water.value=d;water.dispatchEvent(new Event('input'));},[depth,eyeX]);
  await p.waitForFunction(([d,x])=>{const c=document.querySelector('#depth-observer');return c.dataset.depth===String(d)&&c.dataset.eyeX===String(x)&&c.dataset.renderQuality==='detail';},[depth,eyeX]);
  const row=await p.locator('#depth-lab').evaluate(e=>({status:e.dataset.visible,canvas:e.querySelector('canvas').dataset.visibility,text:e.querySelector('.depth-takeaway').textContent}));assert.equal(row.status,status);assert.equal(row.canvas,status);
  if(depth===0){assert.match(row.text,/空槽.*直線/);assert.doesNotMatch(row.text,/出水|折射|較淺/);assert.match(row.text,status==='hidden'?/被槽壁擋住/:/進入眼睛/);}
  else if(status==='hidden'){assert.match(row.text,/折射.*擋住/);assert.doesNotMatch(row.text,/較淺/);}
  else assert.match(row.text,/光出水轉向.*眼睛沿直線回推.*較淺/);
  rows.push({depth,eyeX,...row});if(depth===70||depth===0&&eyeX===300)await capture(p,'#depth-lab','depth-'+depth+'-'+eyeX);
 }
 if(process.env.TEN_CAPTURE_DIR)await fs.writeFile(path.join(process.env.TEN_CAPTURE_DIR,'takeaways.json'),JSON.stringify(rows,null,2));assert.deepEqual(errors,[]);
});
