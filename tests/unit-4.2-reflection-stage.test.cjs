const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const {expect}=require('playwright/test');
const {PNG}=require('pngjs');

test('4.2 第一區：材質、相同照射條件、觀看位置與獨立開關',{timeout:360000},async t=>{
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
  const open=async p=>{await p.bringToFront();await p.goto(new URL('units/4/parts/4.2/',base).href,{waitUntil:'load'});await p.addStyleTag({content:'html{scroll-behavior:auto!important}'});await expect(p.locator('#reflection-3d-scene')).toHaveAttribute('data-ready','true',{timeout:30000});await expect(p.locator('#surface-explanation')).toHaveAttribute('data-ready','true');};
  await open(page).catch(error=>{error.message+='\nPage errors: '+JSON.stringify(errors);throw error;});
  const canvas=page.locator('#reflection-3d-scene'),mirror=page.locator('#reflection-fire-mirror'),paper=page.locator('#reflection-fire-paper');
  const toggle=async(index,on,p=page)=>{const b=p.locator(index===0?'#reflection-fire-mirror':'#reflection-fire-paper');if(await b.getAttribute('aria-pressed')!==String(on))await b.click();};
  // Side observations now use the actual free-drag interaction, without hidden
  // preset controls or directly setting the product camera.
  const view=async(name,p=page)=>{
    await p.locator('#reflection-reset-view').click();
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
    for(const [a,b] of [[false,false],[true,false],[false,true],[true,true]]){
      await toggle(0,a);await toggle(1,b);
      // Commit the browser frame before inspecting container-dependent styles.
      await page.screenshot({clip:{x:0,y:0,width:1,height:1}});
      await expect(mirror).toHaveCSS('color',a?'rgb(255, 255, 255)':'rgb(66, 89, 78)');
      await expect(paper).toHaveCSS('color',b?'rgb(255, 255, 255)':'rgb(66, 89, 78)');
      const state=await page.evaluate(()=>{const b=window.__surfaceLab;return{power:b.spotLights.map(x=>x.intensity),lens:b.lampLenses.map(x=>x.emissiveIntensity),indicator:b.lampIndicators.map(x=>x.emissiveIntensity),small:[...document.querySelectorAll('.reflection-fire small')].map(x=>x.textContent),background:[...document.querySelectorAll('.reflection-fire')].map(x=>getComputedStyle(x).backgroundColor)};});
      [a,b].forEach((on,i)=>{assert.equal(state.power[i]>0,on);assert.equal(state.lens[i]>0,on);assert.equal(state.indicator[i]>0,on);assert.equal(state.small[i],on?'已開啟・點擊關閉':'已關閉・點擊開啟');});
      if(a!==b)assert.notEqual(state.background[0],state.background[1]);
    }
  });

  await t.test('下方輔助圖的三組光路依各接觸面的反射規律計算',async()=>{
    const diagrams=await page.locator('.surface-panel').evaluateAll(panels=>panels.map(panel=>{
      const numbers=s=>s.match(/-?[\d.]+(?:e[-+]?\d+)?/gi).map(Number);
      const profile=numbers(panel.querySelector('.surface-profile').getAttribute('d'));
      return{kind:panel.dataset.surface,bounds:[panel.querySelector('svg').viewBox.baseVal.width,panel.querySelector('svg').viewBox.baseVal.height],profile:Array.from({length:profile.length/2-2},(_,i)=>profile.slice(i*2,i*2+2)),rays:[...panel.querySelectorAll('[data-surface-ray]')].map(g=>({incoming:numbers(g.querySelector('.surface-incoming').getAttribute('d')),outgoing:numbers(g.querySelector('.surface-outgoing').getAttribute('d'))}))};
    }));
    const unit=v=>{const n=Math.hypot(...v);return v.map(x=>x/n);};
    const dot=(a,b)=>a.reduce((sum,x,i)=>sum+x*b[i],0);
    for(const diagram of diagrams){
      assert.equal(diagram.rays.length,3);const directions=[];
      for(const ray of diagram.rays){
        const start=ray.incoming.slice(0,2),hit=ray.incoming.slice(2),outStart=ray.outgoing.slice(0,2),end=ray.outgoing.slice(2);
        assert.deepEqual(hit,outStart);
        const segment=diagram.profile.findIndex((p,i)=>i<diagram.profile.length-1&&p[0]<=hit[0]&&diagram.profile[i+1][0]>hit[0]);
        const a=diagram.profile[segment],b=diagram.profile[segment+1],normal=unit([b[1]-a[1],a[0]-b[0]]);
        close(hit[1],a[1]+(hit[0]-a[0])*(b[1]-a[1])/(b[0]-a[0]),1e-6);
        const incoming=unit(hit.map((x,i)=>x-start[i])),outgoing=unit(end.map((x,i)=>x-hit[i]));
        close(incoming[0],.6,1e-7);close(incoming[1],.8,1e-7);
        const reflected=incoming.map((x,i)=>x-2*dot(incoming,normal)*normal[i]);
        outgoing.forEach((x,i)=>close(x,reflected[i],1e-7));close(-dot(incoming,normal),dot(outgoing,normal),1e-7);
        assert.ok(outgoing[1]<0);directions.push(Math.atan2(outgoing[1],outgoing[0]));
        for(const p of [start,hit,end])assert.ok(p[0]>=0&&p[0]<=diagram.bounds[0]&&p[1]>=0&&p[1]<=diagram.bounds[1]);
        for(let j=1;j<30;j++){
          const p=hit.map((x,i)=>x+(end[i]-x)*j/30),k=diagram.profile.findIndex((x,i)=>i<diagram.profile.length-1&&x[0]<=p[0]&&diagram.profile[i+1][0]>=p[0]);
          if(k>=0){const a=diagram.profile[k],b=diagram.profile[k+1];assert.ok(p[1]<a[1]+(p[0]-a[0])*(b[1]-a[1])/(b[0]-a[0])+1e-6,'反射光不得穿過其他表面');}
        }
      }
      const spread=Math.max(...directions)-Math.min(...directions);
      if(diagram.kind==='smooth')close(spread,0,1e-7);else assert.ok(spread>.6);
    }
    fs.writeFileSync(path.join(dir,'surface-rays.json'),JSON.stringify(diagrams,null,2));
  });

  await t.test('亮光連續通過反射點、速度不在接觸面停頓，兩種偏好皆可手動播放',async()=>{
    const c=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});await setup(c);
    await c.route('**/assets/reflection-3d.js*',r=>r.fulfill({contentType:'application/javascript',body:''}));
    const p=await c.newPage(),failures=[];p.on('pageerror',e=>failures.push(e.message));await p.bringToFront();
    await p.goto(new URL('units/4/parts/4.2/',base).href,{waitUntil:'load'});await p.addStyleTag({content:'html{scroll-behavior:auto!important}'});
    const root=p.locator('#surface-explanation'),play=p.locator('#surface-play'),svg=p.locator('[data-surface=smooth] svg');
    await expect(root).toHaveAttribute('data-ready','true');
    const changedPixels=(a,b)=>{const x=PNG.sync.read(a),y=PNG.sync.read(b);assert.equal(x.width,y.width);assert.equal(x.height,y.height);let changed=0;for(let i=0;i<x.data.length;i+=4)if(Math.max(...[0,1,2].map(c=>Math.abs(x.data[i+c]-y.data[i+c])))>20)changed++;return changed;};
    const seek=async progress=>root.evaluate((e,progress)=>e.querySelector('.surface-diagrams').getAnimations({subtree:true}).filter(a=>a.playState!=='idle').forEach(a=>{a.pause();a.currentTime=a.effect.getTiming().duration*progress;}),progress);
    const packetState=async()=>p.locator('.surface-flow-body').evaluateAll(paths=>paths.map(path=>{
      const numbers=s=>s.match(/-?[\d.]+/g).map(Number),p=numbers(path.getAttribute('d')),offset=parseFloat(getComputedStyle(path).strokeDashoffset),tail=parseFloat(getComputedStyle(path).strokeDasharray);
      return{route:p,head:tail-offset,tail:-offset,contact:Math.hypot(p[2]-p[0],p[3]-p[1])};
    }));
    const evidence=[],before=await page.evaluate(()=>window.__surfaceLab.spotLights.map(x=>x.intensity));
    try{
      for(const motion of ['no-preference','reduce']){
        await p.emulateMedia({reducedMotion:motion});await root.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));const initial=await svg.screenshot();
        await play.click();await seek(.25);await expect(root).toHaveAttribute('data-playing','true');await expect(root).toHaveAttribute('data-phase','running');
        const native=await root.evaluate(e=>e.querySelector('.surface-diagrams').getAnimations({subtree:true}).filter(a=>a.playState!=='idle').map(a=>({start:a.startTime,duration:a.effect.getTiming().duration})));
        // Pausing clears startTime, but every effect shares the same position.
        assert.equal(native.length,18);assert.ok(native.every(a=>a.duration===(motion==='reduce'?4200:3400)));
        const incoming=await svg.screenshot();assert.ok(changedPixels(initial,incoming)>150);
        await seek(.35);const moving=await svg.screenshot(),movingPixels=changedPixels(incoming,moving);assert.ok(movingPixels>40,'亮光必須沿線移動，不能只切換整條線');
        const positions=[];
        for(const progress of [.42,.46,.5,.54]){await seek(progress);await svg.screenshot({path:path.join(dir,`flow-${motion}-${Math.round(progress*100)}.png`)});positions.push(await packetState());}
        for(let i=0;i<6;i++){
          assert.equal(positions[0][i].route.length,6,'每道光用一條包含反射點的完整折線');
          const advances=positions.slice(1).map((state,j)=>state[i].head-positions[j][i].head);
          assert.ok(advances.every(d=>d>10),'接觸前後不能停住');advances.forEach(d=>assert.ok(Math.abs(d-advances[0])<.05,'接觸前後沿路徑速度相同'));
          const crossing=positions[2][i];assert.ok(crossing.tail<crossing.contact&&crossing.head>crossing.contact,'同一段亮光必須同時跨在入射與反射兩側');
        }
        await seek(.75);await svg.screenshot({path:path.join(dir,`flow-${motion}-outgoing.png`)});
        await root.evaluate(e=>e.querySelector('.surface-diagrams').getAnimations({subtree:true}).filter(a=>a.playState!=='idle').forEach(a=>a.finish()));await expect(root).toHaveAttribute('data-playing','false');
        assert.equal(changedPixels(initial,await svg.screenshot()),0,'完成時保留原本完整圖解');
        await play.click();await seek(.48);await play.click();assert.equal(await root.evaluate(e=>e.querySelector('.surface-diagrams').getAnimations({subtree:true}).filter(a=>a.playState!=='idle').length),18,'重播不得累積舊動畫');
        await play.focus();await p.keyboard.press('Escape');await expect(root).toHaveAttribute('data-playing','false');
        evidence.push({motion,movingPixels,positions});
      }
      await p.emulateMedia({reducedMotion:'no-preference'});await play.focus();await p.keyboard.press('Enter');await expect(root).toHaveAttribute('data-playing','true');
      await p.emulateMedia({reducedMotion:'reduce'});await expect(root).toHaveAttribute('data-playing','false');
      await p.emulateMedia({reducedMotion:'no-preference'});
      const performance=await p.evaluate(async()=>{
        const e=document.querySelector('#surface-explanation'),svg=e.querySelector('.surface-diagrams');let writes=0;
        const observer=new MutationObserver(r=>writes+=r.length);observer.observe(svg,{attributes:true,attributeFilter:['d','cx','cy','transform','style','stroke-dasharray','stroke-dashoffset'],childList:true,subtree:true});
        document.querySelector('#surface-play').click();observer.takeRecords();const animations=e.querySelector('.surface-diagrams').getAnimations({subtree:true}).filter(a=>a.playState!=='idle'),first=animations[0].currentTime||0;
        await new Promise(resolve=>setTimeout(resolve,500));observer.disconnect();return{writes,count:animations.length,advanced:animations[0].currentTime-first,starts:animations.map(a=>a.startTime)};
      });
      fs.writeFileSync(path.join(dir,'continuous-flow.json'),JSON.stringify({evidence,performance},null,2));
      assert.equal(performance.writes,0);assert.equal(performance.count,18);assert.equal(new Set(performance.starts).size,1);assert.ok(performance.advanced>200);
      await expect(root).toHaveAttribute('data-playing','false',{timeout:10000});assert.deepEqual(failures,[]);
      assert.deepEqual(await page.evaluate(()=>window.__surfaceLab.spotLights.map(x=>x.intensity)),before);
    }finally{await c.close();await page.bringToFront();}
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
    await expect(page.locator('.reflection-stage button')).toHaveCount(3);
    await canvas.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));await expect(canvas).toBeInViewport({ratio:.99});
    const r=await canvas.boundingBox();await page.mouse.move(r.x+r.width*.5,r.y+r.height*.65);await page.mouse.down();await page.mouse.move(r.x+r.width*.6,r.y+r.height*.7,{steps:5});await page.mouse.up();
    await expect(canvas).toHaveAttribute('data-view','free');await expect(page.locator('#reflection-view-status')).toHaveText('目前觀看位置：自由觀看');
    await expect(mirror).toHaveAttribute('aria-pressed','false');await expect(paper).toHaveAttribute('aria-pressed','true');
    await page.mouse.down();await canvas.dispatchEvent('pointercancel',{pointerId:1});await page.mouse.up();await expect(canvas).not.toHaveClass(/is-dragging/);
    await page.locator('#reflection-reset-view').focus();await page.keyboard.press('Enter');await expect(canvas).toHaveAttribute('data-view','front');
    assert.deepEqual(await page.evaluate(()=>window.__surfaceLab.stations.map(s=>s.source.toArray())),sources);
    await expect(mirror).toHaveAttribute('aria-pressed','false');await expect(paper).toHaveAttribute('aria-pressed','true');
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

  await t.test('回到正面重設兩個角度，保留獨立開關且不捲動頁面',async()=>{
    await view('front');const front=await page.evaluate(()=>window.__surfaceLab.camera.position.toArray());
    await view('left');await toggle(0,false);await toggle(1,false);
    const beforeScroll=await page.evaluate(()=>scrollY);
    await page.locator('#reflection-reset-view').click();
    close(await page.evaluate(()=>scrollY),beforeScroll,1);
    await expect(canvas).toHaveAttribute('data-view','front');await expect(canvas).toBeInViewport({ratio:.99});
    await expect(mirror).toHaveAttribute('aria-pressed','false');await expect(paper).toHaveAttribute('aria-pressed','false');
    const current=await page.evaluate(()=>({position:window.__surfaceLab.camera.position.toArray(),lights:window.__surfaceLab.spotLights.map(x=>x.intensity)}));
    current.position.forEach((v,i)=>close(v,front[i]));assert.deepEqual(current.lights,[0,0]);
    await view('right');await toggle(0,false);
    await page.locator('#reflection-reset-view').focus();await page.keyboard.press('Enter');await expect(canvas).toHaveAttribute('data-view','front');await expect(mirror).toHaveAttribute('aria-pressed','false');
  });

  await t.test('六種寬度皆完整顯示器材、標籤與按鈕，沒有文字或頁面溢出',async()=>{
    await toggle(0,true);await toggle(1,true);
    for(const width of [1440,1024,768,760,390,320]){
      await page.setViewportSize({width,height:1000});await view('front');await canvas.screenshot();
      const m=await page.evaluate(()=>{const b=window.__surfaceLab,main=document.querySelector('.reflection-main-panel').getBoundingClientRect(),stage=document.querySelector('.reflection-stage').getBoundingClientRect(),explanation=document.querySelector('.surface-explanation').getBoundingClientRect(),controls=document.querySelector('.reflection-controls').getBoundingClientRect();return{overflow:document.documentElement.scrollWidth>innerWidth,points:b.framingPoints.map(x=>x.clone().project(b.camera).toArray()),belowExperiment:explanation.top>=stage.bottom,diagramCount:document.querySelectorAll('.surface-panel svg').length,fullWidth:main.width/stage.width,canvases:document.querySelectorAll('#card-01 canvas').length,buttons:[...document.querySelectorAll('#card-01 button')].map(x=>({height:x.getBoundingClientRect().height,fits:x.scrollWidth<=x.clientWidth+1})),tilePixels:(b.mirrorTile.geometry.parameters.width)/(b.camera.right-b.camera.left)*document.querySelector('#reflection-3d-scene').clientWidth};});
      assert.equal(m.overflow,false);assert.ok(m.points.every(p=>Math.abs(p[0])<=.9&&Math.abs(p[1])<=.9));assert.ok(m.buttons.every(b=>b.height>=44&&b.fits));assert.ok(m.tilePixels>=(width>1000?130:64),JSON.stringify(m));
      assert.equal(m.belowExperiment,true);assert.equal(m.diagramCount,2);assert.ok(m.fullWidth>.9);assert.equal(m.canvases,1);
      if(width===1440||width===390){
        const style=await page.addStyleTag({content:'.route{visibility:hidden!important}'});
        await page.locator('.reflection-stage').screenshot({path:path.join(dir,`stage-${width}.png`)});
        await page.locator('.surface-explanation').screenshot({path:path.join(dir,`explanation-${width}.png`)});
        await style.evaluate(e=>e.remove());
      }
    }
  });

  await t.test('自由實驗常駐且比例自然，輔助圖解在下方而非折疊主畫面',async()=>{
    const measurements=[];
    for(const [width,height] of [[1440,900],[1366,768],[1024,768],[390,844],[320,667]]){
      await page.setViewportSize({width,height});await view('front');
      const stage=page.locator('.reflection-stage');
      await stage.evaluate(e=>{const gap=innerWidth<=760?document.querySelector('.route').getBoundingClientRect().height+12:12;window.scrollTo({top:scrollY+e.getBoundingClientRect().top-gap,behavior:'instant'});});
      await page.screenshot({clip:{x:0,y:0,width:1,height:1}});
      const layout=await page.evaluate(()=>{const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return{top:r.top,bottom:r.bottom,width:r.width,height:r.height};};return{width:innerWidth,height:innerHeight,stage:rect('.reflection-stage'),main:rect('#reflection-3d-scene'),button:rect('#reflection-reset-view'),explanation:rect('.surface-explanation')};});
      measurements.push(layout);
      close(layout.main.width/layout.main.height,layout.stage.width<=520?1.3:1.65,.005);
      assert.ok(layout.stage.top>=0&&layout.stage.bottom<=height,JSON.stringify(layout));
      assert.ok(layout.button.bottom<=layout.main.top,'對照按鈕在主畫面上方');
      assert.equal(await page.locator('#reflection-reset-view').evaluate(e=>{const r=e.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')===e;}),true,'按鈕未被行動版導覽遮住');
      assert.ok(layout.explanation.top>=layout.stage.bottom,'圖解位於實驗下方');
      await expect(page.locator('#reflection-3d-scene')).toBeVisible();await expect(page.locator('#card-01 details')).toHaveCount(0);
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
      await expect(p.locator('#reflection-fire-mirror')).toHaveAttribute('aria-pressed','true');await expect(p.locator('#reflection-fire-paper')).toHaveAttribute('aria-pressed','false');
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
      await p.locator('#reflection-reset-view').evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));
      await p.screenshot({clip:{x:0,y:0,width:1,height:1}});
      const button=await p.locator('#reflection-reset-view').boundingBox(),tap={x:button.x+button.width/2,y:button.y+button.height/2};
      assert.equal(await p.evaluate(pt=>document.elementFromPoint(pt.x,pt.y)?.closest('#reflection-reset-view')?.id,tap),'reflection-reset-view');
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...tap,id:3}]});
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      await expect(scene).toHaveAttribute('data-view','front');await expect(scene).toBeInViewport({ratio:.99});
      await expect(p.locator('#reflection-fire-paper')).toHaveAttribute('aria-pressed','false');
      // Use the same native touch session after dragging the 3D canvas.
      const play=p.locator('#surface-play');await play.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));
      await p.screenshot({clip:{x:0,y:0,width:1,height:1}});
      const rPlay=await play.boundingBox(),tapPlay={x:rPlay.x+rPlay.width/2,y:rPlay.y+rPlay.height/2};
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...tapPlay,id:4}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      await expect(p.locator('#surface-explanation')).toHaveAttribute('data-playing','true');
      await expect(p.locator('#surface-explanation')).toHaveAttribute('data-playing','false',{timeout:10000});await expect(play).toHaveText(/重播光路/);
      await expect(p.locator('#reflection-fire-mirror')).toHaveAttribute('aria-pressed','true');await expect(p.locator('#reflection-fire-paper')).toHaveAttribute('aria-pressed','false');
      assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    }finally{await c.close();}
  });

  await t.test('沒有JavaScript時仍有完整的表面方向圖解',async()=>{
    const c=await browser.newContext({javaScriptEnabled:false}),p=await c.newPage();
    try{
      await p.goto(new URL('units/4/parts/4.2/',base).href);await expect(p.locator('.surface-panel svg')).toHaveCount(2);
      await expect(p.locator('.surface-incoming')).toHaveCount(6);await expect(p.locator('.surface-outgoing')).toHaveCount(6);
      await expect(p.locator('#surface-play')).toBeDisabled();await expect(p.locator('[data-surface=rough] .surface-scale-note')).toHaveText('表面起伏放大示意');
      await p.locator('.surface-explanation').scrollIntoViewIfNeeded();await expect(p.locator('.surface-explanation')).toBeVisible();
    }finally{await c.close();}
  });

  await t.test('WebGL不可用時停用實驗，但輔助圖解及播放仍可使用',async()=>{
    const c=await browser.newContext();await setup(c);await c.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return String(type).includes('webgl')?null:get.call(this,type,...args);};});
    const p=await c.newPage();
    try{await p.bringToFront();await p.goto(new URL('units/4/parts/4.2/',base).href);await expect(p.locator('#reflection-3d-scene')).toHaveAttribute('data-ready','error');await expect(p.locator('.reflection-comparison')).toBeHidden();await expect(p.locator('#reflection-fallback')).toBeVisible();await expect(p.locator('#card-01 button:disabled')).toHaveCount(3);await expect(p.locator('#surface-explanation')).toHaveAttribute('data-ready','true');await expect(p.locator('#surface-play')).toBeEnabled();await expect(p.locator('.surface-panel svg')).toHaveCount(2);await p.locator('#surface-play').click();await expect(p.locator('#surface-explanation')).toHaveAttribute('data-playing','true');await expect(p.locator('#surface-explanation')).toHaveAttribute('data-playing','false',{timeout:10000});await expect(p.locator('#surface-play')).toHaveText(/重播光路/);}finally{await c.close();}
    await page.goto('about:blank');assert.deepEqual(errors,[]);
  });
});
