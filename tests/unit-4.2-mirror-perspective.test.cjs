const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const fs=require('node:fs');
const {chromium,expect}=require('playwright/test');

const close=(a,b,tol=1e-7)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
test('平面鏡固定視角：實物與虛像等大等距，投影隨遠近變化',async()=>{
  const {FRONT_VIEW:c,projectMirrorDistance:project}=await import(pathToFileURL(path.resolve(__dirname,'../units/4/parts/4.2/assets/mirror-distance-projection.mjs')));
  for(let distance=10;distance<=60;distance++){
    const p=project(distance);
    close(c.eyeToMirror-p.object.depth,distance);close(p.image.depth-c.eyeToMirror,distance);
    close(p.object.size*p.object.depth/c.focalLength,c.bearHeight);close(p.image.size*p.image.depth/c.focalLength,c.bearHeight);
    close((p.object.ground-c.horizonY)*p.object.depth/c.focalLength,c.eyeHeight);
    close((p.image.ground-c.horizonY)*p.image.depth/c.focalLength,c.eyeHeight);
    assert.ok(p.object.ground>p.image.ground&&p.object.size>p.image.size);
  }
  assert.throws(()=>project(9),RangeError);assert.throws(()=>project(61),RangeError);
});

test('物距像距共享讀值、正面遮擋與原生拖動',{timeout:120000},async t=>{
  let base=process.env.LESSON_BASE_URL;
  if(!base){const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:['ignore','pipe','ignore']});t.after(()=>server.kill());const port=await new Promise((resolve,reject)=>{let out='';server.stdout.on('data',d=>{out+=d;const m=out.match(/port (\d+)/);if(m)resolve(m[1]);});server.once('error',reject);});base=`http://127.0.0.1:${port}/`;}
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',...(process.env.LESSON_USE_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{})});t.after(()=>browser.close());
  const {FRONT_VIEW:c,projectMirrorDistance:project}=await import(pathToFileURL(path.resolve(__dirname,'../units/4/parts/4.2/assets/mirror-distance-projection.mjs')));
  const captures=process.env.MIRROR_DISTANCE_CAPTURE;if(captures)fs.mkdirSync(captures,{recursive:true});
  const plain=await browser.newContext({javaScriptEnabled:false});
  const staticPage=await plain.newPage();await staticPage.goto(new URL('units/4/parts/4.2/',base).href,{waitUntil:'load'});
  const fallback=await staticPage.locator('#card-05').evaluate(e=>({object:Number(e.querySelector('#distance-front-object image').getAttribute('height')),image:Number(e.querySelector('#distance-front-reflection image').getAttribute('height')),markers:['object','image'].map(k=>Number(e.querySelector(`#distance-ruler-${k}-marker`).getAttribute('x1')))}));
  close(fallback.object,project(40).object.size,.001);close(fallback.image,project(40).image.size,.001);close(310-fallback.markers[0],160);close(fallback.markers[1]-310,160);await plain.close();
  for(const width of [1440,390,320]){
    const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce',hasTouch:true});const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await context.route(/\/assets\/(reflection-3d|laser-reflection|reversible-light|periscope|mirror-image|curved-mirrors)\.js/,r=>r.fulfill({contentType:'application/javascript',body:''}));
    await page.goto(new URL('units/4/parts/4.2/',base).href,{waitUntil:'load'});await page.addStyleTag({content:'html{scroll-behavior:auto!important}'});
    const bear=page.locator('#distance-side-object');await expect(bear).toHaveAttribute('aria-valuenow','40');
    assert.equal(await page.locator('#card-05 .distance-readouts').count(),1);assert.equal(await page.locator('#card-05 .mirror-view').count(),2);
    assert.equal(await page.locator('#card-05').evaluate(e=>Boolean(e.querySelector('.mirror-views').compareDocumentPosition(e.querySelector('.distance-readouts'))&Node.DOCUMENT_POSITION_FOLLOWING)),true);
    assert.equal(await page.locator('#distance-occlusion').count(),0);
    const visible=[];
    for(const [key,distance] of [['Home',10],['Shift+ArrowLeft',20],['Shift+ArrowLeft',30],['Shift+ArrowLeft',40],['End',60],['Home',10]]){
      await bear.press(key);await expect(bear).toHaveAttribute('aria-valuenow',String(distance));await page.screenshot({clip:{x:0,y:0,width:1,height:1}});
      await expect(page.locator('#distance-object-measure-label')).toHaveText(`物距 ${distance} cm`);await expect(page.locator('#distance-image-measure-label')).toHaveText(`像距 ${distance} cm`);
      const data=await page.locator('#card-05').evaluate(e=>{
        const svg=e.querySelector('#distance-front-view'),a=svg.querySelector('#distance-front-object image'),b=svg.querySelector('#distance-front-reflection image'),n=x=>Number(x),attrs=x=>({x:n(x.getAttribute('x')),y:n(x.getAttribute('y')),width:n(x.getAttribute('width')),height:n(x.getAttribute('height'))});
        const o=attrs(a),i=attrs(b),canvas=document.createElement('canvas');canvas.width=620;canvas.height=380;const ctx=canvas.getContext('2d');
        ctx.drawImage(b,i.x,i.y,i.width,i.height);const alpha=()=>{const pixels=ctx.getImageData(179,47,262,202).data;let sum=0;for(let k=3;k<pixels.length;k+=4)sum+=pixels[k];return sum;};
        const all=alpha();ctx.globalCompositeOperation='destination-out';ctx.drawImage(a,o.x,o.y,o.width,o.height);const remaining=alpha();
        const tags=[...svg.querySelectorAll('[data-distance-tag] rect')].map(x=>{const r=x.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};}),r=svg.getBoundingClientRect();
        return {o,i,visible:remaining/all,tags,bounds:{left:r.left,right:r.right,top:r.top,bottom:r.bottom},markers:['object','image'].map(k=>n(e.querySelector(`#distance-ruler-${k}-marker`).getAttribute('x1'))),overflow:document.documentElement.scrollWidth>innerWidth};
      });
      const expected=project(distance);close(data.o.height,expected.object.size,.001);close(data.i.height,expected.image.size,.001);close(data.o.y,expected.object.top,.001);close(data.i.y,expected.image.top,.001);close(310-data.markers[0],distance*4);close(data.markers[1]-310,distance*4);assert.equal(data.overflow,false);visible.push(data.visible);
      assert.ok(data.tags[0].bottom<=data.tags[1].top,JSON.stringify({width,distance,tags:data.tags}));
      for(const tag of data.tags)assert.ok(tag.left>=data.bounds.left-1&&tag.right<=data.bounds.right+1&&tag.top>=data.bounds.top-1&&tag.bottom<=data.bounds.bottom+1,JSON.stringify({width,distance,tag}));
      if(captures&&width!==320)await page.locator('#card-05 .mirror-views').screenshot({path:path.join(captures,`${width}-${distance}.png`)});
      if(captures&&width===1440&&distance===40)await page.locator('#card-05 .card-main').screenshot({path:path.join(captures,'complete-1440.png')});
    }
    assert.ok(visible[0]<visible[4]-.15,JSON.stringify({width,visible}));
    const start=await page.locator('#distance-side-object image').evaluate(el=>{const r=el.getBoundingClientRect(),m=el.ownerSVGElement.getScreenCTM();return{x:r.left+r.width/2,y:r.top+r.height/2,dx:120*m.a};});
    await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(start.x-start.dx,start.y,{steps:10});await page.mouse.up();await expect(bear).toHaveAttribute('aria-valuenow','40');await expect(page.locator('#distance-image-measure-label')).toHaveText('像距 40 cm');
    if(width===390){
      await bear.press('Home');await page.locator('#distance-side-view').scrollIntoViewIfNeeded();
      const touch=await page.locator('#distance-side-object image').evaluate(el=>{const r=el.getBoundingClientRect(),m=el.ownerSVGElement.getScreenCTM();return{x:r.left+r.width/2,y:r.top+r.height/2,dx:80*m.a};});
      const cdp=await context.newCDPSession(page);
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:touch.x,y:touch.y,id:1}]});
      await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:touch.x-touch.dx,y:touch.y,id:1}]});
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      await expect(bear).toHaveAttribute('aria-valuenow','30');await expect(page.locator('#distance-image-measure-label')).toHaveText('像距 30 cm');
    }
    assert.deepEqual(errors,[]);console.log(JSON.stringify({width,visible10:visible[0],visible60:visible[4]}));await context.close();
  }
});
