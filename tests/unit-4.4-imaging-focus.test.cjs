const {test}=require('node:test'),assert=require('node:assert/strict'),{openBench}=require('./helpers/convex-bench-fixture.cjs');
test('4.4 第三區：保留F光路選擇，放大F內且面板不遮擋',{timeout:240000},async t=>{
 const f=await openBench(t,{url:process.env.IMAGING_URL,out:process.env.IMAGING_FOCUS_CAPTURE_DIR||'/tmp/imaging-focus'}),{p,root,read,move,row,mark,frame,shot}=f;
 const screen=()=>root('screen');
 await t.test('點F刻度及觀察列，保留一起看／下端／上端的實際光路',async()=>{
  for(const point of ['both','bottom','top']){
   await screen().locator('[data-imaging-point='+point+']').click();
   for(const select of [()=>mark('screen','object',100),()=>row('screen','focus'),()=>row('screen','inside'),()=>row('screen','focus')]){
    await select();const a=await read('screen');assert.equal(a.point,point);assert.equal(a.rays,true);assert.deepEqual([...new Set(a.paths.map(r=>r.name))].sort(),point==='both'?['bottom','top']:[point]);
   }
  }
  await screen().locator('[data-imaging-point=both]').click();
 });
 await t.test('F時藍色下端光實際可見，沒有只保留按鈕狀態',async()=>{
  const count=()=>p.evaluate(()=>{const q=window.__bench.screen,s=q.read().studio;s.renderer.render(s.scene,s.camera);const gl=s.renderer.getContext(),v=s.renderer.getDrawingBufferSize(new q.THREE.Vector2()),a=new Uint8Array(v.x*v.y*4);gl.readPixels(0,0,v.x,v.y,gl.RGBA,gl.UNSIGNED_BYTE,a);let n=0;for(let i=0;i<a.length;i+=4)if(a[i+2]>a[i]*1.2&&a[i+2]>a[i+1]*1.07)n++;return n;});
  await row('screen','focus');const both=await count();await screen().locator('[data-imaging-point=top]').click();const top=await count();assert.ok(both>top+20,JSON.stringify({both,top}));await screen().locator('[data-imaging-point=both]').click();
 });
 await t.test('點F內才放大，拖動圖卡時取景固定且虛像位置倍率正確',async()=>{
  const height=()=>p.evaluate(()=>{const q=window.__bench.screen,s=q.read().studio,a=s.virtualOutline.geometry.attributes.position,ys=[];for(let i=0;i<a.count;i++)ys.push(new q.THREE.Vector3().fromBufferAttribute(a,i).applyMatrix4(s.virtualOutline.matrixWorld).project(s.camera).y);return Math.max(...ys)-Math.min(...ys);});
  await row('screen','double');await move('screen','object',50);const normal=await read('screen'),before=await height();await row('screen','inside');const focused=await read('screen'),after=await height();assert.ok(focused.distance<normal.distance*.9);assert.ok(after>before*1.4,JSON.stringify({before,after}));await f.fs.writeFile(f.path.join(f.out,'zoom.json'),JSON.stringify({normalDistance:normal.distance,focusedDistance:focused.distance,imageHeightRatio:after/before},null,2));assert.equal(await screen().getAttribute('data-framing'),'virtual');
  for(const object of [30,40,50,60]){await move('screen','object',object);const a=await read('screen');assert.deepEqual(a.camera,focused.camera);assert.deepEqual(a.target,focused.target);assert.ok(Math.abs(a.virtual.position[0]-100*object/(object-100)*a.G.scale)<1e-8);assert.ok(Math.abs(a.virtual.scale[0]-100/(100-object))<1e-8);}
  await row('screen','double');assert.equal(await screen().getAttribute('data-framing'),'bench');assert.ok(Math.abs((await read('screen')).distance-normal.distance)<1e-8);
 });
 await t.test('四種尺寸：面板與畫布分開，F內虛像、圖卡、透鏡及屏幕完整可見',async()=>{
  const records=[];await p.addStyleTag({content:'.route{visibility:hidden}'});
  for(const width of [1440,820,390,320]){
   await p.setViewportSize({width,height:width<760?844:1050});await row('screen','inside');await frame();
   const d=await p.evaluate(()=>{const q=window.__bench.screen,s=q.read().studio,root=document.querySelector('#lab4'),r=s.renderer.domElement.getBoundingClientRect(),panel=root.querySelector('.imaging-preview').getBoundingClientRect(),hits=[];for(const [name,object]of [['source',s.source],['lens',s.devices.lens],['screen',s.screen],['virtual',s.virtualOutline]]){const b=new q.THREE.Box3().setFromObject(object);for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z]){const v=new q.THREE.Vector3(x,y,z).project(s.camera),px=(v.x+1)*r.width/2,py=(1-v.y)*r.height/2;if(v.z< -1||v.z>1||px< -1||px>r.width+1||py< -1||py>r.height+1)hits.push(name);}}return{separate:panel.left>=r.right-1||panel.top>=r.bottom-1,hits:[...new Set(hits)],overflow:document.documentElement.scrollWidth>innerWidth,panelHeight:panel.height,canvasHeight:r.height};});
   assert.equal(d.separate,true,JSON.stringify({width,d}));assert.deepEqual(d.hits,[],JSON.stringify({width,d}));assert.equal(d.overflow,false);records.push({width,...d});await shot('inside-'+width,'screen');
  }
  await f.fs.writeFile(f.path.join(f.out,'layout.json'),JSON.stringify(records,null,2));
 });
 await t.test('無頁面錯誤或缺少資源',()=>assert.deepEqual(f.errors,[]));
});
