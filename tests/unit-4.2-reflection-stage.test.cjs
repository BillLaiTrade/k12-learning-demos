const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const {expect}=require('playwright/test');
const {PNG}=require('pngjs');

test('4.2 第一區：材質、相同照射條件、觀看位置與獨立開關',{timeout:180000},async t=>{
  let base=process.env.LESSON_BASE_URL;
  if(!base){
    const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:['ignore','pipe','ignore']});
    t.after(()=>server.kill());
    const port=await new Promise((resolve,reject)=>{let s='';const timer=setTimeout(()=>reject(Error('server timeout')),5000);server.stdout.on('data',d=>{s+=d;const m=s.match(/port (\d+)/);if(m){clearTimeout(timer);resolve(m[1]);}});server.on('error',reject);});
    base=`http://127.0.0.1:${port}/`;
  }
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader'],...(process.env.LESSON_USE_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{})});
  t.after(()=>browser.close());
  const dir=process.env.REFLECTION_CAPTURE_DIR||'/tmp/unit42-reflection-stage';fs.mkdirSync(dir,{recursive:true});
  const setup=async context=>{
    // Isolate this activity's GPU work. The completion suite runs the full page.
    await context.route(/\/assets\/(laser-reflection|reversible-light|periscope|mirror-image|mirror-distance|curved-mirrors)\.js/,r=>r.fulfill({contentType:'application/javascript',body:''}));
    await context.route('**/assets/reflection-3d.js*',async r=>{
      const response=await r.fetch(),s=await response.text(),anchor='  const duration = 1150;';assert.ok(s.includes(anchor));
      await r.fulfill({response,body:s.replace(anchor,`  window.__surfaceLab={scene,camera,referenceCamera,referenceCanvas,lamps,spotLights,mirrorTile,paperTile,mirrorCenter,paperCenter,stations,framingPoints,lampLenses,lampIndicators,renderer};\n${anchor}`)});
    });
  };
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});await setup(context);
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.url());});
  const open=async p=>{await p.goto(new URL('units/4/parts/4.2/',base).href,{waitUntil:'networkidle'});await p.addStyleTag({content:'html{scroll-behavior:auto!important}'});await expect(p.locator('#reflection-3d-scene')).toHaveAttribute('data-ready','true');await expect(p.locator('#reflection-reference-scene')).toHaveAttribute('data-ready','true');};
  await open(page);
  const canvas=page.locator('#reflection-3d-scene'),mirror=page.locator('#reflection-fire-mirror'),paper=page.locator('#reflection-fire-paper');
  const toggle=async(index,on,p=page)=>{const b=p.locator(index===0?'#reflection-fire-mirror':'#reflection-fire-paper');if(await b.getAttribute('aria-pressed')!==String(on))await b.click();};
  const view=async(name,p=page)=>{await p.locator(`[data-reflection-view=${name}]`).click();await expect(p.locator('#reflection-3d-scene')).toHaveAttribute('data-view',name);};
  const close=(a,b,e=1e-9)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);

  await t.test('兩側光源與受照面相同；整個照射光錐落在材料內',async()=>{
    const result=await page.evaluate(()=>{
      const b=window.__surfaceLab,V=b.mirrorCenter.constructor,n=new V(0,1,0);
      const offset=b.stations.map(s=>s.source.clone().sub(s.surface).toArray());
      const cones=b.stations.map((s,i)=>{
        const axis=s.surface.clone().sub(s.source).normalize(),u=n.clone().cross(axis).normalize(),v=axis.clone().cross(u).normalize(),a=b.spotLights[i].angle;
        let margin=Infinity;
        for(let k=0;k<360;k++){
          const phi=k*Math.PI/180,d=axis.clone().multiplyScalar(Math.cos(a)).addScaledVector(u,Math.sin(a)*Math.cos(phi)).addScaledVector(v,Math.sin(a)*Math.sin(phi));
          const hit=s.source.clone().addScaledVector(d,(s.surface.y-s.source.y)/d.y);
          margin=Math.min(margin,1.225-Math.abs(hit.x-s.surface.x),.9-Math.abs(hit.z-s.surface.z));
        }
        return margin;
      });
      const outgoing=b.stations[0].surface.clone().sub(b.stations[0].source).normalize().reflect(n);
      const observer=b.referenceCamera.getWorldDirection(new V()).negate();
      return{offset,cones,alignment:outgoing.dot(observer),dimensions:[b.mirrorTile,b.paperTile].map(x=>[x.geometry.parameters.width,x.geometry.parameters.depth]),lights:b.spotLights.map(x=>[x.angle,x.decay,x.penumbra]),roughness:[b.mirrorTile.material.roughness,b.paperTile.material.roughness]};
    });
    result.offset[0].forEach((v,i)=>close(v,result.offset[1][i]));close(result.alignment,1);
    assert.deepEqual(result.dimensions[0],result.dimensions[1]);assert.deepEqual(result.lights[0],result.lights[1]);
    assert.ok(result.cones.every(m=>m>0.1));assert.ok(result.roughness[0]<result.roughness[1]);
    fs.writeFileSync(path.join(dir,'geometry.json'),JSON.stringify(result,null,2));
  });

  await t.test('四種開關組合的燈頭、實際光源、按鈕狀態一致',async()=>{
    const referenceStates=[];
    for(const [a,b] of [[false,false],[true,false],[false,true],[true,true]]){
      await toggle(0,a);await toggle(1,b);
      await expect(mirror).toHaveCSS('color',a?'rgb(255, 255, 255)':'rgb(66, 89, 78)');
      await expect(paper).toHaveCSS('color',b?'rgb(255, 255, 255)':'rgb(66, 89, 78)');
      const state=await page.evaluate(()=>{const b=window.__surfaceLab;return{power:b.spotLights.map(x=>x.intensity),lens:b.lampLenses.map(x=>x.emissiveIntensity),indicator:b.lampIndicators.map(x=>x.emissiveIntensity),small:[...document.querySelectorAll('.reflection-fire small')].map(x=>x.textContent),background:[...document.querySelectorAll('.reflection-fire')].map(x=>getComputedStyle(x).backgroundColor)};});
      [a,b].forEach((on,i)=>{assert.equal(state.power[i]>0,on);assert.equal(state.lens[i]>0,on);assert.equal(state.indicator[i]>0,on);assert.equal(state.small[i],on?'已開啟':'已關閉');});
      if(a!==b)assert.notEqual(state.background[0],state.background[1]);
      referenceStates.push(await page.locator('#reflection-reference-scene').evaluate(e=>e.toDataURL()));
    }
    assert.equal(new Set(referenceStates).size,4,'固定參考必須隨兩盞燈的四種組合即時更新');
  });

  await t.test('主畫面改變視角時，正面參考的相機與實際像素保持不變',async()=>{
    const snapshot=()=>page.evaluate(()=>({image:window.__surfaceLab.referenceCanvas.toDataURL(),position:window.__surfaceLab.referenceCamera.position.toArray(),quaternion:window.__surfaceLab.referenceCamera.quaternion.toArray()}));
    const before=await snapshot();
    for(const name of ['front','left','right']){await view(name);assert.deepEqual(await snapshot(),before);}
  });

  await t.test('主畫面正面與固定參考使用相同色彩及亮度，沒有另外調亮',async()=>{
    await view('front');
    await toggle(0,true);await toggle(1,true);
    const sample=async(selector,reference)=>{
      const points=await page.evaluate(reference=>{const b=window.__surfaceLab,c=reference?b.referenceCamera:b.camera;return b.stations.map(s=>{const out=[];for(let y=0;y<31;y++)for(let x=0;x<45;x++){const p=s.surface.clone();p.x+=(x/44-.5)*2.4;p.z+=(y/30-.5)*1.75;p.project(c);out.push([(p.x+1)/2,(1-p.y)/2]);}return out;});},reference);
      // Read the canvas pixels, excluding the reference frame's CSS border.
      const data=await page.locator(selector).evaluate(e=>e.toDataURL());
      const im=PNG.sync.read(Buffer.from(data.split(',')[1],'base64'));
      return points.map(ps=>ps.reduce((sum,[u,v])=>{const x=Math.max(0,Math.min(im.width-1,Math.round(u*im.width))),y=Math.max(0,Math.min(im.height-1,Math.round(v*im.height))),i=(y*im.width+x)*4;return sum+.2126*im.data[i]+.7152*im.data[i+1]+.0722*im.data[i+2];},0)/ps.length);
    };
    const main=await sample('#reflection-3d-scene',false),reference=await sample('#reflection-reference-scene',true);
    main.forEach((v,i)=>close(v,reference[i],6));
    fs.writeFileSync(path.join(dir,'reference-colors.json'),JSON.stringify({main,reference},null,2));
  });

  await t.test('實際像素：鏡面反光隨視角明顯變化，紙面受照仍可見',async()=>{
    const metrics=[];
    for(const name of ['front','left','right']){
      await view(name);
      const points=await page.evaluate(()=>{const b=window.__surfaceLab;return b.stations.map(s=>{const points=[];for(let y=0;y<45;y++)for(let x=0;x<61;x++){const p=s.surface.clone();p.x+=(x/60-.5)*2.4;p.z+=(y/44-.5)*1.75;p.project(b.camera);points.push([(p.x+1)/2,(1-p.y)/2]);}return points;});});
      const read=async()=>{
        const buffer=await canvas.screenshot(),im=PNG.sync.read(buffer);
        const values=points.map(ps=>ps.map(([u,v])=>{const x=Math.min(im.width-1,Math.max(0,Math.round(u*im.width))),y=Math.min(im.height-1,Math.max(0,Math.round(v*im.height))),i=(y*im.width+x)*4;return .2126*im.data[i]+.7152*im.data[i+1]+.0722*im.data[i+2];}));
        return{buffer,values};
      };
      await toggle(0,false);await toggle(1,false);const off=await read();
      await toggle(0,true);await toggle(1,true);const on=await read();
      const gain=on.values.map((vs,i)=>vs.reduce((sum,v,j)=>sum+v-off.values[i][j],0)/vs.length);
      metrics.push({view:name,gain});
      fs.writeFileSync(path.join(dir,`${name}-1440.png`),on.buffer);
    }
    fs.writeFileSync(path.join(dir,'pixels.json'),JSON.stringify(metrics,null,2));
    assert.ok(metrics[0].gain[0]>1,JSON.stringify(metrics));
    for(const m of metrics.slice(1))assert.ok(metrics[0].gain[0]>m.gain[0]*1.8,JSON.stringify(metrics));
    assert.ok(metrics.every(m=>m.gain[1]>1),JSON.stringify(metrics));
    const paperGains=metrics.map(m=>m.gain[1]);assert.ok(Math.max(...paperGains)-Math.min(...paperGains)<Math.max(...paperGains)*.25,JSON.stringify(metrics));
  });

  await t.test('預設視角保留照射條件，拖曳與取消可恢復正面',async()=>{
    const sources=await page.evaluate(()=>window.__surfaceLab.stations.map(s=>s.source.toArray()));
    for(const name of ['front','left','right']){await view(name);await expect(page.locator('[data-reflection-view][aria-pressed=true]')).toHaveCount(1);}
    await canvas.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));await expect(canvas).toBeInViewport({ratio:.99});
    const r=await canvas.boundingBox();await page.mouse.move(r.x+r.width*.5,r.y+r.height*.65);await page.mouse.down();await page.mouse.move(r.x+r.width*.6,r.y+r.height*.7,{steps:5});await page.mouse.up();
    await expect(canvas).toHaveAttribute('data-view','free');await expect(page.locator('#reflection-view-status')).toHaveText('目前觀看位置：自由觀看');
    await page.mouse.down();await canvas.dispatchEvent('pointercancel',{pointerId:1});await page.mouse.up();await expect(canvas).not.toHaveClass(/is-dragging/);
    await page.locator('[data-reflection-view=front]').focus();await page.keyboard.press('Enter');await expect(canvas).toHaveAttribute('data-view','front');
    assert.deepEqual(await page.evaluate(()=>window.__surfaceLab.stations.map(s=>s.source.toArray())),sources);
    await expect(mirror).toHaveAttribute('aria-pressed','true');await expect(paper).toHaveAttribute('aria-pressed','true');
  });

  await t.test('垂直拖曳不改俯仰，水平拖曳只改主畫面並保留正面參考',async()=>{
    await view('front');
    const pose=()=>page.evaluate(()=>({position:window.__surfaceLab.camera.position.toArray(),reference:window.__surfaceLab.referenceCanvas.toDataURL()}));
    const before=await pose();
    await canvas.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));await expect(canvas).toBeInViewport({ratio:.99});
    const r=await canvas.boundingBox(),x=r.x+r.width*.5,y=r.y+r.height*.65;
    await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x,y+50,{steps:5});await page.mouse.up();assert.deepEqual(await pose(),before);
    await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+35,y+50,{steps:5});await page.mouse.up();
    const after=await pose();assert.notDeepEqual(after.position,before.position);close(after.position[1],before.position[1]);assert.equal(after.reference,before.reference);
  });

  await t.test('六種寬度皆完整顯示器材、標籤與按鈕，沒有文字或頁面溢出',async()=>{
    for(const width of [1440,1024,768,760,390,320]){
      await page.setViewportSize({width,height:1000});await view('front');await canvas.screenshot();
      const m=await page.evaluate(()=>{const b=window.__surfaceLab,main=document.querySelector('.reflection-main-panel').getBoundingClientRect(),reference=document.querySelector('.reflection-reference').getBoundingClientRect();return{overflow:document.documentElement.scrollWidth>innerWidth,points:b.framingPoints.map(x=>x.clone().project(b.camera).toArray()),referencePoints:b.framingPoints.map(x=>x.clone().project(b.referenceCamera).toArray()),stacked:reference.top>=main.bottom,side:reference.left>=main.right,referenceSmaller:reference.width<main.width,stageWidth:document.querySelector('.reflection-stage').clientWidth,buttons:[...document.querySelectorAll('#card-01 button')].map(x=>({height:x.getBoundingClientRect().height,fits:x.scrollWidth<=x.clientWidth+1})),tileWidth:(b.mirrorTile.geometry.parameters.width)/(b.camera.right-b.camera.left)};});
      assert.equal(m.overflow,false);assert.ok(m.points.every(p=>Math.abs(p[0])<=.9&&Math.abs(p[1])<=.9));assert.ok(m.buttons.every(b=>b.height>=44&&b.fits));assert.ok(m.tileWidth>.25);
      assert.ok(m.referencePoints.every(p=>Math.abs(p[0])<=.9&&Math.abs(p[1])<=.9));
      if(m.stageWidth<=520)assert.equal(m.stacked,true);else assert.ok(m.side&&m.referenceSmaller);
      if(width===1440||width===390){
        const style=await page.addStyleTag({content:'.route{visibility:hidden!important}'});
        await page.locator('.reflection-stage').screenshot({path:path.join(dir,`stage-${width}.png`)});
        await style.evaluate(e=>e.remove());
      }
    }
  });

  await t.test('實際觸控點燈與拖曳；一般動態播放後能切回預設視角',async()=>{
    const c=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await setup(c);const p=await c.newPage();
    try{
      await open(p);await p.locator('#reflection-fire-mirror').tap();await expect(p.locator('#reflection-fire-mirror')).toHaveAttribute('aria-pressed','true');
      await expect.poll(()=>p.evaluate(()=>window.__surfaceLab.spotLights[0].intensity)).toBe(17);
      const scene=p.locator('#reflection-3d-scene');await scene.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));await expect(scene).toBeInViewport({ratio:.99});
      const r=await scene.boundingBox(),cdp=await c.newCDPSession(p),x=r.x+r.width*.45,y=r.y+r.height*.65;
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});
      await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+30,y:y+8,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      await expect(scene).toHaveAttribute('data-view','free');await view('left',p);await view('front',p);
      await expect(p.locator('#reflection-fire-mirror')).toHaveAttribute('aria-pressed','true');await expect(p.locator('#reflection-fire-paper')).toHaveAttribute('aria-pressed','false');
      await scene.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));
      const vertical=await scene.boundingBox(),beforeScroll=await p.evaluate(()=>scrollY);
      const vx=vertical.x+vertical.width*.5,vy=vertical.y+vertical.height*.45;
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:vx,y:vy,id:2}]});
      for(let j=1;j<=5;j++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:vx,y:vy+j*15,id:2}]});
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      await expect.poll(()=>p.evaluate(()=>scrollY)).not.toBe(beforeScroll);
      await expect(scene).toHaveAttribute('data-view','front');await expect(scene).not.toHaveClass(/is-dragging/);
      assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    }finally{await c.close();}
  });

  await t.test('WebGL不可用時兩張圖一同隱藏，開關與視角控制皆停用',async()=>{
    const c=await browser.newContext();await setup(c);await c.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return String(type).includes('webgl')?null:get.call(this,type,...args);};});
    const p=await c.newPage();
    try{await p.goto(new URL('units/4/parts/4.2/',base).href);await expect(p.locator('#reflection-3d-scene')).toHaveAttribute('data-ready','error');await expect(p.locator('.reflection-comparison')).toBeHidden();await expect(p.locator('#reflection-fallback')).toBeVisible();await expect(p.locator('#card-01 button:disabled')).toHaveCount(5);}finally{await c.close();}
    await page.goto('about:blank');assert.deepEqual(errors,[]);
  });
});
