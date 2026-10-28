const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
const {expect}=require('playwright/test');
const near=(a,b,e=1e-8)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const dot=(a,b)=>a.reduce((v,n,i)=>v+n*b[i],0);
const unit=a=>{const n=Math.hypot(...a);return a.map(v=>v/n);};
const dir=path.resolve(__dirname,'..');
const artifacts='/tmp/unit1-card3-stacked';
let model;

test('第三區距離模型：2公尺反射＋3公尺入眼，對應5公尺直達光',async t=>{
  model=await import(pathToFileURL(path.join(dir,'units/1/parts/1.2/assets/mirror-comparison.mjs')));
  const {COMPARISON:s,comparisonRay,opticalDistances,pupilBundle,comparisonCamera,project,quad,VIEW_PLANES,clipNear}=model;
  await t.test('中央光路精確為2、3、2、5公尺，物像等距且共線',()=>{
    assert.deepEqual(opticalDistances(),{incoming:2,outgoing:3,extension:2,direct:5});
    const r=comparisonRay();assert.deepEqual(r.source,[345,440,0]);assert.deepEqual(r.image,[735,440,0]);assert.deepEqual(r.eye,[247.5,180,0]);assert.deepEqual(r.hit,[540,336,0]);
    near(s.mirrorX-r.source[0],r.image[0]-s.mirrorX);near(r.source[1],r.image[1]);
    near(dot(unit(sub(r.image,r.hit)),unit(sub(r.hit,r.eye))),1);
    const distance=(a,b)=>Math.hypot(...sub(a,b));near(distance(r.eye,r.image),distance(r.eye,r.hit)+distance(r.hit,r.image));near(distance(r.source,r.hit)+distance(r.hit,r.eye),distance(r.eye,r.image));
    near(distance(r.source,r.hit),221);near(distance(r.hit,r.eye),331.5);near(s.unitsPerMetre,110.5);
  });
  await t.test('81個瞳孔位置的反射向量與直達光方向相同，入眼線不穿過原熊',()=>{
    for(let y=-2;y<=2;y+=.5)for(let z=-2;z<=2;z+=.5){
      const eye=s.eye.map((v,i)=>v+(i===1?y:i===2?z:0)),r=comparisonRay(eye),incoming=unit(sub(r.hit,r.source)),out=unit(sub(eye,r.hit)),direct=unit(sub(eye,r.image));
      [-incoming[0],incoming[1],incoming[2]].forEach((v,i)=>near(v,out[i]));out.forEach((v,i)=>near(v,direct[i]));
      assert.ok(r.hit[1]>68&&r.hit[1]<570&&Math.abs(r.hit[2])<61);
      const bear=s.sideBear;for(let x=bear.x;x<=bear.x+bear.width;x+=2){const u=(x-r.hit[0])/(eye[0]-r.hit[0]);assert.ok(r.hit[1]+u*(eye[1]-r.hit[1])<bear.y);}
    }
    const rays=pupilBundle();assert.notDeepEqual(rays[0].eye,rays[2].eye);assert.notDeepEqual(rays[0].hit,rays[2].hit);
  });
  await t.test('同一寬取景顯示近處實體熊與遠處對照熊，遠近及落地位置合理',()=>{
    const c=comparisonCamera();for(const axis of [c.forward,c.right,c.down])near(Math.hypot(...axis),1);near(dot(c.forward,c.right),0);near(dot(c.forward,c.down),0);
    const target=project(c,s.image),hit=project(c,comparisonRay().hit);near(target[0],450);assert.ok(target[1]>100&&target[1]<125);near(hit[0],target[0]);near(hit[1],target[1]);
    for(const p of quad(c,VIEW_PLANES.front)){assert.ok(p[0]>175&&p[0]<725&&p[1]>0&&p[1]<550);}
    const far=quad(c,VIEW_PLANES.front),rear=quad(c,VIEW_PLANES.rear);
    for(const p of rear)assert.ok(p[0]>175&&p[0]<725&&p[1]>0&&p[1]<550);
    const height=q=>Math.max(...q.map(p=>p[1]))-Math.min(...q.map(p=>p[1]));
    assert.ok(height(far)>130&&height(far)<170,'遠處熊約佔觀察窗四分之一高');
    assert.ok(height(rear)>height(far)*1.6,'前景熊比遠處熊大');
    assert.ok(Math.min(...rear.map(p=>p[1]))>Math.max(...far.map(p=>p[1]))+45,'前景不遮遠處熊');
    const foot=project(c,[s.source[0],s.floor,0]);
    const {planePoint}=model;const anchor=project(c,planePoint(VIEW_PLANES.rear,.5,VIEW_PLANES.rear.footV,c));
    near(anchor[0],foot[0]);near(anchor[1],foot[1]);
    near((rear[1][0]-rear[0][0])/(rear[3][1]-rear[0][1]),205/203);
    for(const p of Object.values(VIEW_PLANES))assert.ok(quad(c,p).every(v=>v.every(Number.isFinite)&&v[2]>0));
  });
  await t.test('桌面近裁切先於透視除法，來源與虛像的對應角色正確',()=>{
    const c=comparisonCamera(),a=c.eye.map((v,i)=>v-c.forward[i]*10),b=c.eye.map((v,i)=>v+c.forward[i]*20),segment=clipNear(c,[a,b],false);
    assert.equal(segment.length,2);near(project(c,segment[0])[2],5);near(project(c,segment[1])[2],20);
    const r=comparisonRay();assert.deepEqual(r.reflected[0],s.source);assert.deepEqual(r.direct[0],s.image);assert.deepEqual(r.extension,[r.hit,r.image]);
  });
});

test('第三區上下同時對照、整熊觀察及銜接第四區',{timeout:180000},async t=>{
  fs.mkdirSync(artifacts,{recursive:true});
  const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:dir,stdio:['ignore','pipe','pipe']});t.after(()=>server.kill());
  const port=await new Promise((resolve,reject)=>{let out='';const timer=setTimeout(()=>reject(Error('server timeout')),5000);server.stdout.on('data',d=>{out+=d;const m=out.match(/port (\d+)/);if(m){clearTimeout(timer);resolve(m[1]);}});server.once('error',reject);});
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});t.after(()=>browser.close());
  const url=`http://127.0.0.1:${port}/units/1/parts/1.2/#card-03`,errors=[];
  const monitor=p=>{p.on('pageerror',e=>errors.push(e.message));p.on('requestfailed',r=>errors.push(r.url()));p.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});};
  const page=await browser.newPage({viewport:{width:1440,height:1200}});monitor(page);
  async function open(p){await p.goto(url,{waitUntil:'networkidle'});await p.locator('#reference-eye[data-ready=true]').waitFor();await p.locator('#trial-eye[data-ready=true]').waitFor();}
  await open(page);
  const section=page.locator('#card-03');
  async function capture(name,p=page){await p.evaluate(()=>document.activeElement?.blur());const style=await p.addStyleTag({content:'.route{visibility:hidden!important}'});await p.locator('#card-03').screenshot({path:`${artifacts}/${name}.png`});await style.evaluate(e=>e.remove());}
  async function geometry(p=page){return p.locator('#card-03').evaluate(section=>{
    const read=id=>{
      const svg=document.getElementById(`${id}-side`),find=n=>svg.querySelector(`[data-side="${n}"]`),point=n=>svg.dataset[n].split(',').map(Number);
      const parse=e=>e.getAttribute('d').match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/g).map(Number);
      const screen=(x,y)=>{const q=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM());return[q.x,q.y];};
      const shape=n=>{const b=find(n).getBoundingClientRect();return[b.width,b.height];};
      return {mode:svg.dataset.mode,source:point('source'),image:point('image'),eye:point('eye'),hit:point('hit'),distances:JSON.parse(svg.dataset.distances),
       rays:[...find('rays').children].map(parse),extensions:[...find('extensions').children].map(parse),screen:[screen(345,440),screen(540,440),screen(735,440)],
       shapes:[shape('near-shape'),shape('far-shape')],labels:[find('distance-three').textContent,find('distance-two').textContent],farTransform:find('far-shape').getAttribute('transform')};
    };
    return {reference:read('reference'),trial:read('trial'),views:[...section.querySelectorAll('.comparison-eye')].map(e=>({eye:e.dataset.eye,target:e.dataset.target,quad:e.dataset.farQuad,nearQuad:e.dataset.nearQuad,mode:e.dataset.mode}))};
  });}
  async function verify(p=page){
    const data=await geometry(p),a=data.reference,b=data.trial;
    assert.equal(a.mode,'mirror');assert.equal(b.mode,'direct');assert.equal(a.rays.length,2);assert.equal(b.rays.length,1);assert.equal(a.extensions.length,1);assert.equal(b.extensions.length,0);
    for(const item of [a,b]){
      assert.deepEqual(item.source,[345,440,0]);assert.deepEqual(item.image,[735,440,0]);assert.deepEqual(item.eye,[247.5,180,0]);assert.deepEqual(item.distances,{incoming:2,outgoing:3,extension:2,direct:5});
      assert.deepEqual(item.labels,['3公尺','2公尺']);assert.equal(item.farTransform,'translate(1080 0) scale(-1 1)');
      near(item.screen[1][0]-item.screen[0][0],item.screen[2][0]-item.screen[1][0],.01);near(item.screen[0][1],item.screen[2][1],.01);near(item.shapes[0][0],item.shapes[1][0],.01);near(item.shapes[0][1],item.shapes[1][1],.01);
    }
    const slope=v=>(v.at(-1)-v[1])/(v.at(-2)-v[0]);near(slope(a.rays[1]),slope(b.rays[0]));near(slope(a.extensions[0]),slope(b.rays[0]));
    near(slope(a.rays[0]),-slope(a.rays[1]));assert.deepEqual(a.rays[1].slice(-2),b.rays[0].slice(-2));
    assert.deepEqual(a.rays[0].slice(0,2),[345,440]);assert.deepEqual(b.rays[0].slice(0,2),[735,440]);assert.deepEqual(a.extensions[0].slice(-2),[735,440]);
    assert.deepEqual(data.views[0].quad,data.views[1].quad);assert.equal(data.views[0].eye,data.views[1].eye);assert.equal(data.views[0].target,data.views[1].target);
    return data;
  }
  async function raster(p=page){return p.locator('.comparison-eye').evaluateAll(nodes=>nodes.map(svg=>{
    const c=svg.querySelector('[data-view=front]'),pixels=c.getContext('2d').getImageData(0,0,900,550).data;let hash=2166136261,opaque=0;const bounds=[900,550,0,0];
    for(let i=0;i<pixels.length;i++){hash=Math.imul(hash^pixels[i],16777619);if(i%4===3&&pixels[i]>180){opaque++;const n=(i-3)/4,x=n%900,y=Math.floor(n/900);bounds[0]=Math.min(bounds[0],x);bounds[1]=Math.min(bounds[1],y);bounds[2]=Math.max(bounds[2],x);bounds[3]=Math.max(bounds[3],y);}}
    return {hash:hash>>>0,opaque,bounds};
  }));}
  await t.test('初始上下兩排同時呈現；移除切換、鼻尖標記與散光',async()=>{
    await expect(section.locator('.comparison-row-title')).toHaveText(['有鏡子','撤鏡，放入真熊']);
    await expect(section.locator('.comparison-row-title span')).toHaveCount(0);
    await expect(page.locator('#comparison-reference')).toHaveAttribute('data-mode','mirror');await expect(page.locator('#comparison-trial')).toHaveAttribute('data-mode','direct');
    await expect(page.locator('#reference-side [data-side=mirror]')).toBeVisible();await expect(page.locator('#trial-side [data-side=mirror]')).toBeHidden();
    assert.equal(await section.locator('button,input,[role=slider],[data-side=source-point],[data-side=image-point],[data-view=nose],[data-side=scatter],[data-side=other-reflections],.comparison-controls').count(),0);
    await expect(section).not.toContainText('鼻尖');await expect(section).not.toContainText('切換');await expect(section).not.toContainText('散光');
    await verify();await capture('desktop');
  });
  await t.test('實際SVG光路、距離標籤與全熊畫布一致，遠近兩隻玩偶完整且不互相遮擋',async()=>{
    const data=await verify(),pixels=await raster();assert.deepEqual(pixels[0],pixels[1]);assert.ok(pixels[0].opaque>10000);
    for(const p of pixels){assert.ok(p.bounds[0]>175&&p.bounds[2]<725&&p.bounds[1]>0&&p.bounds[3]<550);}
    for(const view of data.views){const near=JSON.parse(view.nearQuad);assert.ok(near.every(p=>p[0]>175&&p[0]<725&&p[1]>0&&p[1]<550));}
    const rearPixels=await page.locator('.comparison-eye').evaluateAll(nodes=>nodes.map(svg=>{
      const a=svg.querySelector('[data-view=rear]').getContext('2d').getImageData(0,0,900,550).data;let count=0,hash=2166136261;const b=[900,550,0,0];
      for(let i=0;i<a.length;i++){hash=Math.imul(hash^a[i],16777619);if(i%4===3&&a[i]>180){count++;const n=(i-3)/4,x=n%900,y=Math.floor(n/900);b[0]=Math.min(b[0],x);b[1]=Math.min(b[1],y);b[2]=Math.max(b[2],x);b[3]=Math.max(b[3],y);}}
      return {count,hash:hash>>>0,bounds:b,opacity:getComputedStyle(svg.querySelector('[data-view=near]')).opacity};
    }));
    assert.deepEqual(rearPixels[0],rearPixels[1]);assert.ok(rearPixels[0].count>20000);assert.equal(rearPixels[0].opacity,'1');near(rearPixels[0].bounds[3],520,4);
    for(const r of rearPixels){assert.ok(r.bounds[0]>175&&r.bounds[2]<725&&r.bounds[3]<550);assert.ok(r.bounds[1]>pixels[0].bounds[3]+45);assert.ok(r.bounds[3]-r.bounds[1]>pixels[0].bounds[3]-pixels[0].bounds[1]);}
    const inside=await page.locator('#reference-eye').evaluate(svg=>{
      const parse=path=>path.getAttribute('d').match(/-?\d+(?:\.\d+)?/g).map(Number),a=parse(svg.querySelector('[data-view=clip]')),poly=Array.from({length:a.length/2},(_,i)=>a.slice(i*2,i*2+2));
      const inPolygon=(x,y)=>{const signs=poly.map((p,i)=>{const q=poly[(i+1)%poly.length];return(q[0]-p[0])*(y-p[1])-(q[1]-p[1])*(x-p[0]);});return signs.every(v=>v>=-.1)||signs.every(v=>v<=.1);};
      const c=svg.querySelector('[data-view=front]'),pixels=c.getContext('2d').getImageData(0,0,900,550).data;let outside=0;
      for(let y=0;y<550;y+=3)for(let x=0;x<900;x+=3)if(pixels[(y*900+x)*4+3]>180&&!inPolygon(x+.5,y+.5))outside++;
      return outside;
    });assert.equal(inside,0,'鏡面裁切仍完整容納玩偶的不透明部分');
  });
  await t.test('六種寬度的距離標籤留出完整淨空，不遮光線、鏡面、人物與玩偶',async()=>{
    for(const width of [320,390,650,768,1024,1440]){
      await page.setViewportSize({width,height:1200});
      const collisions=await section.locator('.comparison-side').evaluateAll(nodes=>{
        const issues=[];
        const intersects=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
        for(const svg of nodes){
          const matrix=svg.getScreenCTM(),padding=Math.hypot(matrix.a,matrix.b)*8;
          const paths=[...svg.querySelectorAll('[data-side=rays] path,[data-side=extensions] path')];
          const actors=[...svg.querySelectorAll('[data-side=profile],[data-side=near-shape],[data-side=far-shape],[data-side=mirror] rect')];
          const canvas=svg.getBoundingClientRect(),title=svg.closest('figure').querySelector('h3').getBoundingClientRect();
          for(const rect of svg.querySelectorAll('[data-side^=distance-] rect')){
            const r=rect.getBoundingClientRect(),box={left:r.left-padding,right:r.right+padding,top:r.top-padding,bottom:r.bottom+padding},label=rect.parentElement.textContent;
            if(box.left<canvas.left||box.right>canvas.right||box.top<canvas.top||box.bottom>canvas.bottom)issues.push(`${svg.id} ${label}: clipped`);
            if(intersects(box,title))issues.push(`${svg.id} ${label}: row title`);
            for(const actor of actors){const bounds=actor.getBoundingClientRect();if(bounds.width&&bounds.height&&intersects(box,bounds))issues.push(`${svg.id} ${label}: ${actor.dataset.side||'mirror'}`);}
            for(const path of paths){
              const length=path.getTotalLength(),transform=path.getScreenCTM();
              for(let n=0;n<=240;n++){
                const p=path.getPointAtLength(length*n/240),q=new DOMPoint(p.x,p.y).matrixTransform(transform);
                if(q.x>box.left&&q.x<box.right&&q.y>box.top&&q.y<box.bottom){issues.push(`${svg.id} ${label}: optical path`);break;}
              }
            }
          }
        }return issues;
      });
      assert.deepEqual(collisions,[],`${width}px visual clearance`);
      if(width===390)await capture('clearance-mobile');if(width===1440)await capture('clearance-desktop');
    }
  });
  await t.test('320／390／650／768／1024／1440px皆維持上下兩列、左右對應欄',async()=>{
    for(const width of [320,390,650,768,1024,1440]){
      await page.setViewportSize({width,height:1200});await verify();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      const r=await page.locator('#comparison-reference').boundingBox(),t=await page.locator('#comparison-trial').boundingBox();assert.ok(t.y>=r.y+r.height);near(r.x,t.x,.5);near(r.width,t.width,.5);
      const images=await section.locator('.comparison-side,.comparison-eye').evaluateAll(nodes=>nodes.map(e=>{const b=e.getBoundingClientRect();return{x:b.x,y:b.y,width:b.width,height:b.height};}));
      near(images[0].y,images[1].y,.5);near(images[2].y,images[3].y,.5);near(images[1].x,images[3].x,.5);near(images[1].width,images[3].width,.5);near(images[1].height,images[3].height,.5);
      assert.ok(images[1].x>=images[0].x+images[0].width);assert.ok(images[1].width>=90);assert.ok(images[1].height>=100);
      if(width===390)await capture('mobile');if(width===1440)await capture('desktop');
    }
  });
  await t.test('圖面只保留主要標籤，文字解釋與第四區入口放在圖下',async()=>{
    const top=await section.locator('.comparison-column-headings').evaluate(e=>e.textContent);assert.ok(top.includes('光的路徑')&&top.includes('小葵看到的熊'));
    await expect(section.locator('.comparison-equation')).toHaveText('3＋2＝5公尺');await expect(section.locator('.mirror-explanation')).toContainText('沿圖示光路量取');await expect(section.locator('.comparison-next')).toContainText('比較物距與像距');
    const explanation=section.locator('.mirror-explanation');
    assert.equal(await explanation.locator('.dialogue').count(),2);
    await expect(explanation.locator('.dialogue--xiaokui')).toContainText('為什麼熊看起來在鏡後');
    await expect(explanation.locator('.dialogue:not(.dialogue--xiaokui)')).toContainText('從反射點再往鏡後延長2公尺');
    await expect(explanation.locator('.comparison-clarification')).toContainText('不代表光真的通過鏡後');
    assert.equal(await explanation.locator(':scope > p:not(.comparison-clarification),h3,.comparison-bridge').count(),0);
    assert.ok((await explanation.innerText()).replace(/\s/g,'').length<170,'說明維持短對話，不回到長段落');
    for(const width of [320,390,650,768,1024,1440]){
      await page.setViewportSize({width,height:1200});
      const layout=await explanation.evaluate(e=>[...e.querySelectorAll('.dialogue')].map(row=>{
        const text=row.querySelector('p'),avatar=row.querySelector('.speaker'),style=getComputedStyle(avatar,'::before');
        const a=avatar.getBoundingClientRect(),b=text.getBoundingClientRect(),r=row.getBoundingClientRect();
        return {avatar:style.backgroundImage,avatarWidth:style.width,textFits:text.scrollWidth<=text.clientWidth+1,separated:a.right<=b.left,within:b.right<=r.right,background:getComputedStyle(row).backgroundColor};
      }));
      assert.ok(layout.every(r=>r.avatar.includes('dialogue-character-avatars.png')&&r.avatarWidth===(width<=460?'38px':'44px')&&r.textFits&&r.separated&&r.within));
      assert.notEqual(layout[0].background,layout[1].background);
      if(width===390||width===1440){
        const name=width===390?'mobile':'desktop';
        fs.mkdirSync('/tmp/unit1-card3-explanation',{recursive:true});
        await explanation.screenshot({path:`/tmp/unit1-card3-explanation/${name}-explanation.png`});
        const style=await page.addStyleTag({content:'.route{visibility:hidden!important}'});
        await section.screenshot({path:`/tmp/unit1-card3-explanation/${name}.png`});await style.evaluate(e=>e.remove());
      }
    }
  });
  await t.test('滑鼠與鍵盤前往第四區，量距及往返錨點正常',async()=>{
    const link=page.locator('#mirror-next-activity');await expect(link).toHaveAttribute('href','#card-04');await link.click();await expect(page).toHaveURL(/#card-04$/);
    await page.locator('#object-distance').fill('20');await page.locator('#object-distance').dispatchEvent('input');await expect(page.locator('#image-distance-value')).toHaveText('20 cm');await verify();
    await page.locator('.route a[href="#card-03"]').click();await expect(page).toHaveURL(/#card-03$/);await link.focus();await page.keyboard.press('Enter');await expect(page).toHaveURL(/#card-04$/);
    const bounds=await section.locator('.mirror-explanation').boundingBox(),picture=await page.locator('#comparison-trial').boundingBox();assert.ok(bounds.y>picture.y+picture.height);
  });
  await t.test('手機真實觸控閱讀與下一區連結；減少動態模式呈現相同內容',async()=>{
    const c=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'}),p=await c.newPage();monitor(p);
    try{await open(p);await verify(p);const initial=await raster(p);assert.deepEqual(initial[0],initial[1]);await capture('mobile-touch',p);
      await p.locator('#mirror-next-activity').tap();await expect(p).toHaveURL(/#card-04$/);await p.locator('#object-distance').fill('30');await p.locator('#object-distance').dispatchEvent('input');await expect(p.locator('#image-distance-value')).toHaveText('30 cm');await verify(p);
    }finally{await c.close();}
  });
  await t.test('慢速素材載入後兩種情境仍固定，不產生重複ID或程式錯誤',async()=>{
    const c=await browser.newContext(),p=await c.newPage();monitor(p);let release;const ready=new Promise(resolve=>release=resolve);
    await p.route('**/teddy-front.webp',async r=>{await ready;await r.continue();});
    try{await p.goto(url,{waitUntil:'domcontentloaded'});await expect(p.locator('#comparison-trial')).toHaveAttribute('data-mode','direct');release();await p.locator('#reference-eye[data-ready=true]').waitFor();await p.locator('#trial-eye[data-ready=true]').waitFor();await verify(p);
      assert.deepEqual(await p.evaluate(()=>{const ids=[...document.querySelectorAll('[id]')].map(e=>e.id);return ids.filter((id,i)=>ids.indexOf(id)!==i);}),[]);
    }finally{release();await c.close();}
  });
  await t.test('相關單元入口與1.1頁面可正常載入，1.2離頁無錯誤',async()=>{
    const p=await browser.newPage();monitor(p);
    try{for(const target of [new URL('../../index.html',url).href,new URL('../1.1/',url).href]){
      const response=await p.goto(target,{waitUntil:'networkidle'});assert.equal(response.status(),200);await expect(p.locator('h1').first()).toBeVisible();assert.ok((await p.title()).length>0);
    }}finally{await p.close();}
    await page.goto('about:blank');await page.waitForTimeout(100);assert.deepEqual(errors,[]);
  });
});
