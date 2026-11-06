const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const {expect}=require('playwright/test');

test('4.2 反射定律圖：核可版面、實際調角、光路幾何與靜態備援',{timeout:180000},async t=>{
  let base=process.env.LESSON_BASE_URL;
  if(!base){
    const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:['ignore','pipe','ignore']});t.after(()=>server.kill());
    const port=await new Promise((resolve,reject)=>{let s='';server.stdout.on('data',d=>{s+=d;const m=s.match(/port (\d+)/);if(m)resolve(m[1]);});server.on('error',reject);});base=`http://127.0.0.1:${port}/`;
  }
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader'],...(process.env.LESSON_USE_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{})});t.after(()=>browser.close());
  const dir=process.env.LAW_CAPTURE_DIR||'/tmp/unit42-law-check';fs.mkdirSync(dir,{recursive:true});
  const context=await browser.newContext({viewport:{width:1440,height:1100},reducedMotion:'reduce'});t.after(()=>context.close());
  // Leave the real laser bench and its pointer/keyboard handlers in place.
  await context.route(/\/assets\/(reflection-3d|reversible-light|periscope|mirror-image|mirror-distance|curved-mirrors)\.js/,r=>r.fulfill({contentType:'application/javascript',body:''}));
  const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  const url=new URL('units/4/parts/4.2/',base).href;
  await p.goto(url,{waitUntil:'commit'});
  const canvas=p.locator('#laser-reflection-scene');await expect(canvas).toHaveAttribute('data-ready','true',{timeout:60000});await p.addStyleTag({content:'html{scroll-behavior:auto!important}'});
  const geometry=async(page=p,expected)=>{
    const d=await page.locator('.laser-diagram').evaluate(svg=>{
      const numbers=s=>s.match(/-?[\d.]+/g).map(Number),attr=id=>svg.querySelector(id).getAttribute('d');
      return{incoming:numbers(attr('#law-incident')),outgoing:numbers(attr('#law-reflected')),normal:numbers(attr('#law-normal')),angles:['#law-angle-in','#law-angle-out'].map(id=>svg.querySelector(id).textContent),arcs:['#law-arc-incident','#law-arc-reflected'].map(id=>numbers(attr(id)))};
    });
    const [sx,sy,hx,hy]=d.incoming,[rx,ry,ex,ey]=d.outgoing;
    assert.equal(hx,rx);assert.equal(hy,ry);assert.equal(hx,d.normal[0]);assert.equal(hy,d.normal[2]);
    const incident=Math.atan2(sx-hx,hy-sy)*180/Math.PI,reflected=Math.atan2(rx-ex,ry-ey)*180/Math.PI;
    assert.ok(Math.abs(incident-expected)<.002);assert.ok(Math.abs(reflected-expected)<.002);assert.deepEqual(d.angles,[`${expected}°`,`${expected}°`]);
    for(const arc of d.arcs){const [x,y]=arc.slice(-2);assert.ok(Math.abs(Math.hypot(x-hx,y-hy)-104)<.002);assert.ok(Math.abs(Math.atan2(Math.abs(x-hx),hy-y)*180/Math.PI-expected)<.002);}
    return d;
  };
  const bounds=async()=>p.locator('.laser-diagram').evaluate(svg=>{const r=svg.getBoundingClientRect();return[...svg.querySelectorAll('text')].map(e=>{const b=e.getBoundingClientRect();return{text:e.textContent,left:b.left-r.left,right:b.right-r.left,top:b.top-r.top,bottom:b.bottom-r.top,width:r.width,height:r.height};});});
  const inFrame=async()=>{const labels=await bounds();for(const b of labels)assert.ok(b.left>=-1&&b.right<=b.width+1&&b.top>=-1&&b.bottom<=b.height+1,JSON.stringify(b));for(let i=0;i<labels.length;i++)for(const b of labels.slice(i+1)){const a=labels[i],x=Math.min(a.right,b.right)-Math.max(a.left,b.left),y=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);assert.ok(x<=1||y<=1,`標示重疊：${a.text}/${b.text}`);}return labels;};
  const layouts=[];
  for(const width of [1440,1024,768,760,390,320]){
    await p.setViewportSize({width,height:1100});await p.locator('#reflection-law').evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));
    await p.locator('#reflection-law').screenshot({path:path.join(dir,`${width}-concept.png`)});
    assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    const layout=await p.locator('#reflection-law').evaluate(e=>{const svg=e.querySelector('svg'),r=svg.getBoundingClientRect(),m=svg.getScreenCTM(),h=e.querySelector('h3').getBoundingClientRect(),f=e.querySelector('.laser-law').getBoundingClientRect();return{height:e.getBoundingClientRect().height,diagramWidth:r.width,scaleDifference:Math.abs(m.a-m.d),formulaGap:f.left-h.right};});
    assert.ok(layout.diagramWidth<=560.5);assert.ok(layout.scaleDifference<.001,'圖形必須維持等比例');if(width===1440){assert.ok(layout.height<=480,'概念圖須收緊高度');assert.ok(layout.formulaGap>=0&&layout.formulaGap<=40,'公式應靠近標題');}
    await geometry(p,30);layouts.push({width,...layout,labels:await inFrame()});
  }
  const native=[];
  for(const [key,angle] of [['Home',20],['ArrowRight',21],['End',90],['ArrowLeft',89]]){
    await canvas.press(key);await expect(canvas).toHaveAttribute('aria-valuenow',String(angle));
    await expect(p.locator('#lab-angle-in')).toHaveText(`${angle}°`);await expect(p.locator('#lab-angle-out')).toHaveText(`${angle}°`);
    native.push({key,angle,geometry:await geometry(p,angle),labels:await inFrame()});
  }
  // Drag to a real, previously observed emitter location; do not call setAngle.
  await p.setViewportSize({width:1440,height:1100});await canvas.press('Home');
  for(let i=0;i<10;i++)await canvas.press('ArrowRight');
  const target=JSON.parse(await canvas.getAttribute('data-emitter-screen'));
  await canvas.press('Home');await canvas.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));
  const start=JSON.parse(await canvas.getAttribute('data-emitter-screen')),r=await canvas.boundingBox();
  await p.mouse.move(r.x+start[0],r.y+start[1]);await p.mouse.down();await p.mouse.move(r.x+target[0],r.y+target[1],{steps:5});await p.mouse.up();
  const angle=+(await canvas.getAttribute('aria-valuenow'));assert.notEqual(angle,20);await geometry(p,angle);
  for(const javaScriptEnabled of [false,true]){
    const c=await browser.newContext({javaScriptEnabled,viewport:{width:390,height:900}});
    if(javaScriptEnabled){await c.route(/\/assets\/(reflection-3d|reversible-light|periscope|mirror-image|mirror-distance|curved-mirrors)\.js/,r=>r.fulfill({contentType:'application/javascript',body:''}));await c.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:original.call(this,type,...args);};});}
    const page=await c.newPage();await page.goto(url,{waitUntil:'load'});await geometry(page,30);
    if(javaScriptEnabled)await expect(page.locator('#laser-reflection-scene')).toHaveAttribute('data-ready','error');
    await expect(page.locator('.laser-law')).toHaveText('入射角 ＝ 反射角');await c.close();
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(dir,'checks.json'),JSON.stringify({layouts,native,dragAngle:angle,errors},null,2));
});
