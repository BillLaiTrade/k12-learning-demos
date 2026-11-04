const {test}=require('node:test'),assert=require('node:assert/strict'),{openBench}=require('./helpers/convex-bench-fixture.cjs');
test('第二至六區鏡片外觀與實際表面標示',{timeout:300000},async t=>{
 const f=await openBench(t,{url:process.env.LENS_URL,out:'/tmp/lens-clear-review'}),{p}=f;
 await p.route(/\/(convex-studio|concave-studio|concave-imaging)\.mjs/,async route=>{
  const response=await route.fetch(),file=route.request().url(),key=file.includes('convex-studio')?'convex':file.includes('concave-studio')?'concave':'image';let body=await response.text();
  const fields=key==='image'?'studio,G,THREE':'studio,g,world,SCALE,AXIS,THREE';body=body.replace("root.dataset.ready='true';",`window.__lensReview||={};window.__lensReview.${key}=()=>({${fields}});root.dataset.ready='true';`);await route.fulfill({response,body});
 });
 await p.reload({waitUntil:'networkidle'});
 await t.test('五個學習區塊共用透明曲面，兩種厚薄與完整圓形保持正確',async()=>{
  const shapes=await p.evaluate(()=>{
   const q=__lensReview;return[q.convex().studio,q.concave().studio,__bench.screen.read().studio,__bench.eye.read().studio,q.image().studio].map(s=>{const lens=s.lens,g=lens.geometry;g.computeBoundingBox();return{...g.userData,presentation:lens.userData.presentation,opacity:lens.material.opacity,transparent:lens.material.transparent,depthWrite:lens.material.depthWrite,depth:g.boundingBox.max.z-g.boundingBox.min.z,profiles:lens.children.filter(c=>c.name==='curved-face-profile').length};});
  });assert.equal(shapes.length,5);for(const[i,s]of shapes.entries()){assert.equal(s.representation,'rotational-lens');assert.equal(s.presentation,'clear-curved-glass');assert.equal(s.transparent,true);assert.equal(s.depthWrite,false);assert.ok(s.opacity<.3);assert.equal(s.profiles,2);assert.ok(Math.abs(s.depth-2*s.radius)<1e-6);assert.ok([1,4].includes(i)?s.edgeThickness>s.centerThickness:s.centerThickness>s.edgeThickness);}
 });
 await t.test('預設取景保留平行光源和完整出射段，厚薄標線接到實際兩面',async()=>{
  for(const width of [1440,820,390,320]){await p.setViewportSize({width,height:1050});await p.waitForFunction(()=>['convex','concave'].every(kind=>{const q=__lensReview[kind](),root=document.querySelector(kind==='convex'?'#lab2':'#concave-rays'),r=root.querySelector('canvas').getBoundingClientRect(),svg=root.querySelector('.lens-label-leaders');return Math.abs(svg.viewBox.baseVal.height-r.height)<.1&&Math.abs(svg.viewBox.baseVal.width-r.width)<.1&&Math.abs(q.studio.camera.aspect-r.width/r.height)<.0001;}));await f.frame();
   const records=await p.evaluate(()=>['convex','concave'].map(kind=>{
    const q=__lensReview[kind](),s=q.studio,root=document.querySelector(kind==='convex'?'#lab2':'#concave-rays'),canvas=root.querySelector('canvas'),r=canvas.getBoundingClientRect(),project=v=>{const p=v.clone().project(s.camera);return{x:(p.x+1)*r.width/2,y:(1-p.y)*r.height/2};};
    const corners=[];const box=new q.THREE.Box3().setFromObject(s.source);for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])corners.push(new q.THREE.Vector3(x,y,z).project(s.camera).toArray());
    const labels=['thin','thick'].map(name=>{const el=root.querySelector(`[data-${kind}-label=${name}]`),line=root.querySelector(`[data-lens-leader=${name}]`),radius=Number(line.dataset.radius),half=(q.g.thickness/2-q.g.left(radius/q.SCALE))*q.SCALE;return{hidden:el.hidden,numbers:line.getAttribute('d').match(/-?\d*\.?\d+(?:e[+-]?\d+)?/g).map(Number),a:project(s.lens.localToWorld(new q.THREE.Vector3(-half,radius,0))),b:project(s.lens.localToWorld(new q.THREE.Vector3(half,radius,0)))};});
    return{kind,corners,ends:q.g.rays.map(ray=>q.world(ray.end).project(s.camera).toArray()),labels};
   }));
   for(const rec of records){for(const point of [...rec.corners,...rec.ends])assert.ok(Math.abs(point[0])<.99&&Math.abs(point[1])<.99,JSON.stringify({width,kind:rec.kind,point}));for(const label of rec.labels){assert.equal(label.hidden,false,JSON.stringify({width,kind:rec.kind}));assert.ok(Math.abs(label.numbers[6]-label.a.x)<.01&&Math.abs(label.numbers[7]-label.a.y)<.01,JSON.stringify({width,kind:rec.kind,label}));assert.ok(Math.abs(label.numbers[8]-label.b.x)<.01&&Math.abs(label.numbers[9]-label.b.y)<.01);}}
   const cards=await p.evaluate(()=>[__bench.eye,__lensReview.image()].flatMap((q,index)=>{
    const s=index?q.studio:q.read().studio,G=q.G,T=index?q.THREE:__bench.eye.THREE;
    return(index?[.3,.5,1,1.5,2,3,3.5]:[.1,.5,1,1.5]).map(u=>{const points=[];for(const y of [-G.cardHeight/2,G.cardHeight/2])for(const z of [-G.cardWidth/2,G.cardWidth/2])points.push(new T.Vector3(-u*G.f*G.scale,G.axis+y,z).project(s.camera));const w=(Math.max(...points.map(p=>p.x))-Math.min(...points.map(p=>p.x)))*s.camera.aspect,h=Math.max(...points.map(p=>p.y))-Math.min(...points.map(p=>p.y));return{index,u,ratio:w/h};});
   }));for(const card of cards)assert.ok(card.ratio>.15,JSON.stringify({width,...card}));
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  }
 });
 await t.test('逐區擷取預設、旋轉及手機畫面供人工檢視，光路可獨立切換',async()=>{
  const blocks=[['lab2','convex-canvas','[data-parallel-rays]'],['concave-rays','concave-canvas','[data-parallel-rays]'],['lab4','imaging-canvas','[data-imaging-rays]'],['lab5','magnifier-canvas','[data-mag-rays]'],['lab6','concave-imaging-canvas','[data-ci-rays]']];
  for(const width of [1440,390]){await p.setViewportSize({width,height:1050});await f.frame();for(const[id,canvas,button]of blocks){const root=p.locator('#'+id),toggle=root.locator(button);if(await toggle.getAttribute('aria-pressed')!=='true')await toggle.click();await f.frame();const stage=root.locator(id==='concave-rays'?'.concave-stage':'.convex-stage');await stage.screenshot({path:`${f.out}/${width}-${id}-initial.png`,style:'.route{visibility:hidden!important}'});await root.locator('#'+canvas).focus();for(let i=0;i<5;i++)await p.keyboard.press('ArrowLeft');await stage.screenshot({path:`${f.out}/${width}-${id}-rotated.png`,style:'.route{visibility:hidden!important}'});for(let i=0;i<5;i++)await p.keyboard.press('ArrowRight');await toggle.click();await stage.screenshot({path:`${f.out}/${width}-${id}-glass.png`,style:'.route{visibility:hidden!important}'});await toggle.click();}}
  assert.deepEqual(f.errors,[]);
 });
});
