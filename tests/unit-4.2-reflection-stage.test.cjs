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
      await r.fulfill({response,body:s.replace(anchor,`  window.__surfaceLab={scene,camera,lamps,spotLights,mirrorTile,paperTile,mirrorCenter,paperCenter,stations,framingPoints,lampLenses,lampIndicators,renderer,fitCamera,getAzimuth:()=>cameraAzimuth,getPolar:()=>cameraPolar};\n${anchor}`)});
    });
  };
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});await setup(context);
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.url());});
  const open=async p=>{await p.goto(new URL('units/4/parts/4.2/',base).href,{waitUntil:'networkidle'});await p.addStyleTag({content:'html{scroll-behavior:auto!important}'});await expect(p.locator('#reflection-3d-scene')).toHaveAttribute('data-ready','true');await p.locator('#reflection-reference-image').scrollIntoViewIfNeeded();await p.locator('#reflection-reference-image').evaluate(e=>e.decode());};
  await open(page);
  const canvas=page.locator('#reflection-3d-scene'),mirror=page.locator('#reflection-fire-mirror'),paper=page.locator('#reflection-fire-paper');
  const toggle=async(index,on,p=page)=>{const b=p.locator(index===0?'#reflection-fire-mirror':'#reflection-fire-paper');if(await b.getAttribute('aria-pressed')!==String(on))await b.click();};
  // Side observations now use the actual free-drag interaction, without hidden
  // preset controls or directly setting the product camera.
  const view=async(name,p=page)=>{
    await p.locator('#reflection-match-reference').click();
    const c=p.locator('#reflection-3d-scene');await expect(c).toHaveAttribute('data-view','front');
    if(name==='front')return;
    await c.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));
    const r=await c.boundingBox(),x=r.x+r.width/2,y=r.y+r.height*.65,dx=(38*Math.PI/180)/.008*(name==='left'?1:-1);
    await p.mouse.move(x,y);await p.mouse.down();await p.mouse.move(x+dx,y,{steps:6});await p.mouse.up();
    await expect(c).toHaveAttribute('data-view','free');
  };
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
      const observer=b.camera.getWorldDirection(new V()).negate();
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
      referenceStates.push(await page.locator('#reflection-reference-image').getAttribute('src'));
    }
    assert.equal(new Set(referenceStates).size,1,'固定參考圖片不隨上方開關改變');
  });

  await t.test('下方為固定雙燈開啟圖片，主畫面改變角度不改參考內容',async()=>{
    const snapshot=()=>page.locator('#reflection-reference-image').evaluate(e=>({src:e.currentSrc,width:e.naturalWidth,height:e.naturalHeight}));
    const before=await snapshot();
    assert.deepEqual([before.width,before.height],[1119,678]);
    for(const name of ['front','left','right']){await view(name);assert.deepEqual(await snapshot(),before);}
  });

  await t.test('正面雙燈的實際渲染與參考圖片一致，沒有另外調亮',async()=>{
    await view('front');
    await toggle(0,true);await toggle(1,true);
    const points=await page.evaluate(()=>{const b=window.__surfaceLab,reference=b.camera.clone();b.fitCamera(reference,1119/678);return [b.camera,reference].map(camera=>b.stations.map(s=>{const out=[];for(let y=0;y<31;y++)for(let x=0;x<45;x++){const p=s.surface.clone();p.x+=(x/44-.5)*2.4;p.z+=(y/30-.5)*1.75;p.project(camera);out.push([(p.x+1)/2,(1-p.y)/2]);}return out;}));});
    const sample=(buffer,positions)=>{
      const im=PNG.sync.read(buffer);
      return positions.map(ps=>ps.reduce((sum,[u,v])=>{const x=Math.max(0,Math.min(im.width-1,Math.round(u*im.width))),y=Math.max(0,Math.min(im.height-1,Math.round(v*im.height))),i=(y*im.width+x)*4;return sum+.2126*im.data[i]+.7152*im.data[i+1]+.0722*im.data[i+2];},0)/ps.length);
    };
    const response=await page.request.get(await page.locator('#reflection-reference-image').evaluate(e=>e.currentSrc));assert.equal(response.status(),200);
    const main=sample(await canvas.screenshot(),points[0]),reference=sample(await response.body(),points[1]);
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

  await t.test('自由拖曳保留照射條件，取消後可用鍵盤回正',async()=>{
    await view('front');await toggle(0,false);
    const sources=await page.evaluate(()=>window.__surfaceLab.stations.map(s=>s.source.toArray()));
    await expect(page.locator('[data-reflection-view]')).toHaveCount(0);
    await expect(page.locator('#card-01 button')).toHaveCount(3);
    await canvas.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));await expect(canvas).toBeInViewport({ratio:.99});
    const r=await canvas.boundingBox();await page.mouse.move(r.x+r.width*.5,r.y+r.height*.65);await page.mouse.down();await page.mouse.move(r.x+r.width*.6,r.y+r.height*.7,{steps:5});await page.mouse.up();
    await expect(canvas).toHaveAttribute('data-view','free');await expect(page.locator('#reflection-view-status')).toHaveText('目前觀看位置：自由觀看');
    await expect(mirror).toHaveAttribute('aria-pressed','false');await expect(paper).toHaveAttribute('aria-pressed','true');
    await page.mouse.down();await canvas.dispatchEvent('pointercancel',{pointerId:1});await page.mouse.up();await expect(canvas).not.toHaveClass(/is-dragging/);
    await page.locator('#reflection-match-reference').focus();await page.keyboard.press('Enter');await expect(canvas).toHaveAttribute('data-view','front');
    assert.deepEqual(await page.evaluate(()=>window.__surfaceLab.stations.map(s=>s.source.toArray())),sources);
    await expect(mirror).toHaveAttribute('aria-pressed','true');await expect(paper).toHaveAttribute('aria-pressed','true');
  });

  await t.test('恢復上下與左右拖曳，水平可轉過一圈且不受先前左右限制',async()=>{
    await view('front');
    const pose=()=>page.evaluate(()=>({position:window.__surfaceLab.camera.position.toArray(),azimuth:window.__surfaceLab.getAzimuth(),polar:window.__surfaceLab.getPolar()}));
    const before=await pose();
    await canvas.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));await expect(canvas).toBeInViewport({ratio:.99});
    const r=await canvas.boundingBox(),x=r.x+r.width*.5,y=r.y+r.height*.35;
    await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x,y+r.height*.3,{steps:5});await page.mouse.up();
    const tilted=await pose();assert.notEqual(tilted.polar,before.polar);assert.notEqual(tilted.position[1],before.position[1]);assert.ok(tilted.polar>=.2&&tilted.polar<=1.48);
    await view('front');
    for(let i=0;i<3;i++){await page.mouse.move(r.x+r.width*.2,y);await page.mouse.down();await page.mouse.move(r.x+r.width*.75,y,{steps:6});await page.mouse.up();}
    assert.ok(Math.abs((await pose()).azimuth)>Math.PI*2);
    await view('front');
  });

  await t.test('一鍵對照重設兩個角度並開啟雙燈，不捲動頁面',async()=>{
    await view('front');const front=await page.evaluate(()=>window.__surfaceLab.camera.position.toArray());
    await view('left');await toggle(0,false);await toggle(1,false);
    const beforeScroll=await page.evaluate(()=>scrollY);
    await page.locator('#reflection-match-reference').click();
    close(await page.evaluate(()=>scrollY),beforeScroll,1);
    await expect(canvas).toHaveAttribute('data-view','front');await expect(canvas).toBeInViewport({ratio:.99});
    await expect(mirror).toHaveAttribute('aria-pressed','true');await expect(paper).toHaveAttribute('aria-pressed','true');
    const current=await page.evaluate(()=>({position:window.__surfaceLab.camera.position.toArray(),lights:window.__surfaceLab.spotLights.map(x=>x.intensity)}));
    current.position.forEach((v,i)=>close(v,front[i]));assert.deepEqual(current.lights,[17,17]);
    await view('right');await toggle(0,false);
    await page.locator('#reflection-match-reference').focus();await page.keyboard.press('Enter');await expect(canvas).toHaveAttribute('data-view','front');await expect(mirror).toHaveAttribute('aria-pressed','true');
  });

  await t.test('六種寬度皆完整顯示器材、標籤與按鈕，沒有文字或頁面溢出',async()=>{
    for(const width of [1440,1024,768,760,390,320]){
      await page.setViewportSize({width,height:1000});await view('front');await canvas.screenshot();
      const m=await page.evaluate(()=>{const b=window.__surfaceLab,main=document.querySelector('.reflection-main-panel').getBoundingClientRect(),stage=document.querySelector('.reflection-stage').getBoundingClientRect(),reference=document.querySelector('.reflection-reference').getBoundingClientRect(),controls=document.querySelector('.reflection-controls').getBoundingClientRect(),image=document.querySelector('#reflection-reference-image').getBoundingClientRect();return{overflow:document.documentElement.scrollWidth>innerWidth,points:b.framingPoints.map(x=>x.clone().project(b.camera).toArray()),belowControls:reference.top>=controls.bottom-1,referenceInside:reference.bottom<=stage.bottom,referenceWidth:image.width,fullWidth:main.width/stage.width,canvases:document.querySelectorAll('#card-01 canvas').length,buttons:[...document.querySelectorAll('#card-01 button')].map(x=>({height:x.getBoundingClientRect().height,fits:x.scrollWidth<=x.clientWidth+1})),tilePixels:(b.mirrorTile.geometry.parameters.width)/(b.camera.right-b.camera.left)*document.querySelector('#reflection-3d-scene').clientWidth};});
      assert.equal(m.overflow,false);assert.ok(m.points.every(p=>Math.abs(p[0])<=.9&&Math.abs(p[1])<=.9));assert.ok(m.buttons.every(b=>b.height>=44&&b.fits));assert.ok(m.tilePixels>=(width>1000?130:64),JSON.stringify(m));
      assert.equal(m.belowControls,true);assert.equal(m.referenceInside,true);assert.ok(m.referenceWidth<=202);assert.ok(m.fullWidth>.9);assert.equal(m.canvases,1);
      if(width===1440||width===390){
        const style=await page.addStyleTag({content:'.route{visibility:hidden!important}'});
        await page.locator('.reflection-stage').screenshot({path:path.join(dir,`stage-${width}.png`)});
        await page.locator('.reflection-reference').screenshot({path:path.join(dir,`reference-${width}.png`)});
        await style.evaluate(e=>e.remove());
      }
    }
  });

  await t.test('常見桌機與手機視窗可同時看到主畫面、按鈕及小型參考',async()=>{
    const measurements=[];
    for(const [width,height] of [[1440,900],[1366,768],[1024,768],[390,844],[320,667]]){
      await page.setViewportSize({width,height});await view('front');
      const stage=page.locator('.reflection-stage');
      await stage.evaluate(e=>{const gap=innerWidth<=760?document.querySelector('.route').getBoundingClientRect().height+12:12;window.scrollTo({top:scrollY+e.getBoundingClientRect().top-gap,behavior:'instant'});});
      await page.screenshot({clip:{x:0,y:0,width:1,height:1}});
      const layout=await page.evaluate(()=>{const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return{top:r.top,bottom:r.bottom,width:r.width,height:r.height};};return{width:innerWidth,height:innerHeight,stage:rect('.reflection-stage'),main:rect('#reflection-3d-scene'),button:rect('#reflection-match-reference'),reference:rect('#reflection-reference-image')};});
      measurements.push(layout);
      assert.ok(layout.stage.top>=0&&layout.stage.bottom<=height,JSON.stringify(layout));
      assert.ok(layout.button.bottom<=layout.main.top,'對照按鈕在主畫面上方');
      assert.equal(await page.locator('#reflection-match-reference').evaluate(e=>{const r=e.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')===e;}),true,'按鈕未被行動版導覽遮住');
      assert.ok(layout.reference.width<=202&&layout.reference.width<layout.main.width*.5,'參考圖縮小至輔助比例');
      if(width===1366||width===390)await page.screenshot({path:path.join(dir,`viewport-${width}.png`)});
    }
    fs.writeFileSync(path.join(dir,'viewport.json'),JSON.stringify(measurements,null,2));
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
      await expect(scene).toHaveAttribute('data-view','free');await view('front',p);
      await expect(p.locator('#reflection-fire-mirror')).toHaveAttribute('aria-pressed','true');await expect(p.locator('#reflection-fire-paper')).toHaveAttribute('aria-pressed','true');
      await scene.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));
      const vertical=await scene.boundingBox(),beforeScroll=await p.evaluate(()=>scrollY),beforePolar=await p.evaluate(()=>window.__surfaceLab.getPolar());
      const vx=vertical.x+vertical.width*.5,vy=vertical.y+vertical.height*.45;
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:vx,y:vy,id:2}]});
      for(let j=1;j<=5;j++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:vx,y:vy+j*15,id:2}]});
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      assert.notEqual(await p.evaluate(()=>window.__surfaceLab.getPolar()),beforePolar);
      close(await p.evaluate(()=>scrollY),beforeScroll,1);
      await expect(scene).toHaveAttribute('data-view','free');await expect(scene).not.toHaveClass(/is-dragging/);
      // Keep drag and tap on the same native touch session. Commit the scroll
      // before taking coordinates, rather than mixing two CDP input devices.
      await p.locator('#reflection-match-reference').evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));
      await p.screenshot({clip:{x:0,y:0,width:1,height:1}});
      const button=await p.locator('#reflection-match-reference').boundingBox(),tap={x:button.x+button.width/2,y:button.y+button.height/2};
      assert.equal(await p.evaluate(pt=>document.elementFromPoint(pt.x,pt.y)?.closest('#reflection-match-reference')?.id,tap),'reflection-match-reference');
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...tap,id:3}]});
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      await expect(scene).toHaveAttribute('data-view','front');await expect(scene).toBeInViewport({ratio:.99});
      await expect(p.locator('#reflection-fire-paper')).toHaveAttribute('aria-pressed','true');
      assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    }finally{await c.close();}
  });

  await t.test('WebGL不可用時停用互動，仍可閱讀下方正面參考圖片',async()=>{
    const c=await browser.newContext();await setup(c);await c.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return String(type).includes('webgl')?null:get.call(this,type,...args);};});
    const p=await c.newPage();
    try{await p.goto(new URL('units/4/parts/4.2/',base).href);await expect(p.locator('#reflection-3d-scene')).toHaveAttribute('data-ready','error');await expect(p.locator('.reflection-comparison')).toBeHidden();await expect(p.locator('#reflection-fallback')).toBeVisible();await expect(p.locator('#card-01 button:disabled')).toHaveCount(3);await p.locator('#reflection-reference-image').scrollIntoViewIfNeeded();await p.locator('#reflection-reference-image').evaluate(e=>e.decode());await expect(p.locator('#reflection-reference-image')).toBeVisible();}finally{await c.close();}
    await page.goto('about:blank');assert.deepEqual(errors,[]);
  });
});
