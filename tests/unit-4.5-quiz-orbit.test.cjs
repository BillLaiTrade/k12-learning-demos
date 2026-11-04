const {test}=require('node:test'),assert=require('node:assert/strict'),http=require('node:http'),path=require('node:path'),fs=require('node:fs/promises');
const {chromium}=require('playwright');
test('4.5挑戰場景跟隨拖曳方向',{timeout:120000},async t=>{
 let base=process.env.COLOR_URL;
 if(!base){const root=path.resolve(__dirname,'..'),server=http.createServer(async(req,res)=>{try{let file=path.join(root,decodeURI(req.url.split('?')[0]));if((await fs.stat(file)).isDirectory())file+='/index.html';res.setHeader('Content-Type',({'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml'})[path.extname(file)]||'text/html');res.end(await fs.readFile(file));}catch{res.statusCode=404;res.end('missing')}});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>server.close());base=`http://127.0.0.1:${server.address().port}/units/4/parts/4.5/`;}
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'],...(process.env.COLOR_URL?{proxy:{server:process.env.HTTPS_PROXY||process.env.HTTP_PROXY}}:{})});t.after(()=>browser.close());
 const context=await browser.newContext({viewport:{width:1366,height:1000},reducedMotion:'reduce'});context.setDefaultNavigationTimeout(90000);
 await context.route('**/4.5/assets/{studio,torch-studio,prism-studio}.mjs*',r=>r.abort());
 // Observe a point on the real table's front edge through the actual camera.
 // This catches a visually reversed gesture even if the angle still changes.
 await context.route('**/4.5/assets/duo-quiz-studio.mjs*',async route=>{const response=await route.fetch(),body=(await response.text()).replace('resize();return{update',`window.__orbitAudit=()=>{camera.updateMatrixWorld(true);const p=new THREE.Vector3(0,.27,2).project(camera);return{x:p.x,y:-p.y,orbit:{...orbit}};};resize();return{update`);await route.fulfill({response,body});});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'#unit-quiz',{waitUntil:'networkidle'});const root=page.locator('.duo-quiz'),canvas=root.locator('[data-challenge-canvas]');await root.locator('[data-challenge-stage]').scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('.duo-quiz')?.dataset.renderer==='three');
 const frames=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))),point=()=>page.evaluate(()=>window.__orbitAudit()),evidence=[];
 const original={question:await root.getAttribute('data-question'),probe:await root.getAttribute('data-probe')};
 async function home(){await canvas.focus();await page.keyboard.press('Home');await frames();}
 for(const[name,dx,dy]of[['向右',45,0],['向左',-45,0],['向下',0,35],['向上',0,-35]])await t.test(`滑鼠${name}拖，桌面前緣也${name}移動`,async()=>{
  await home();const before=await point(),r=await canvas.boundingBox(),x=r.x+r.width*.5,y=r.y+r.height*.72;await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx,y+dy,{steps:6});await page.mouse.up();await frames();const after=await point();evidence.push({name,before,after});assert.ok(dx?(after.x-before.x)*dx>0:(after.y-before.y)*dy>0,JSON.stringify({name,before,after}));
 });
 await t.test('方向鍵與拖曳採相同畫面方向，Home復原視角',async()=>{
  for(const[key,axis,sign]of[['ArrowRight','x',1],['ArrowLeft','x',-1],['ArrowDown','y',1],['ArrowUp','y',-1]]){await home();const before=await point();await page.keyboard.press(key);await frames();const after=await point();assert.ok((after[axis]-before[axis])*sign>0,JSON.stringify({key,before,after}));}await home();assert.deepEqual((await point()).orbit,{yaw:-.72,pitch:1.05,radius:10.6});
 });
 await t.test('手機水平觸控同向轉動，垂直手勢保留頁面捲動',async()=>{
  await page.setViewportSize({width:390,height:844});await canvas.scrollIntoViewIfNeeded();await home();const session=await context.newCDPSession(page);await session.send('Emulation.setTouchEmulationEnabled',{enabled:true});
  const r=await canvas.boundingBox(),x=r.x+r.width*.5,y=r.y+r.height*.7,before=await point();await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+35,y}]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await frames();const after=await point();assert.ok(after.x>before.x,JSON.stringify({before,after}));await home();const prior=(await point()).orbit;await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-35}]});await session.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await frames();assert.deepEqual((await point()).orbit,prior);
 });
 await t.test('旋轉不改題目、試光或作答，也沒有執行錯誤',async()=>{assert.equal(await root.getAttribute('data-question'),original.question);assert.equal(await root.getAttribute('data-probe'),original.probe);assert.equal(await root.locator('input:checked').count(),0);assert.equal(await root.getAttribute('data-lit'),'false');assert.deepEqual(errors,[]);});
 if(process.env.ORBIT_EVIDENCE)await fs.writeFile(process.env.ORBIT_EVIDENCE,JSON.stringify(evidence,null,2));
});
