const {test}=require('node:test'),assert=require('node:assert/strict'),{openBench}=require('./helpers/convex-bench-fixture.cjs');
test('鏡子與放大鏡：實際代表光到眼睛，虛像位置符合光學幾何',{timeout:180000},async t=>{
 const f=await openBench(t,{url:process.env.ANALOGY_URL,out:process.env.ANALOGY_CAPTURE_DIR||'/tmp/analogy-verified'}),p=f.p,why=p.locator('#lab5 [data-mag-why]');await why.locator('summary').click();
 for(const width of [1440,390,320]){
  await p.setViewportSize({width,height:1050});await f.frame();
  const result=await why.evaluate(root=>({overflow:document.documentElement.scrollWidth>innerWidth,legend:root.querySelector('.analogy-line-key').textContent,back:root.querySelectorAll('.analogy-back').length,figures:[...root.querySelectorAll('svg')].map(svg=>{
   const coords=e=>e.getAttribute('d').split('M').filter(Boolean).map(part=>part.match(/-?[\d.]+(?:e[-+]?\d+)?/gi).map(Number));
   const object=svg.querySelector('[data-analogy-object]'),virtual=svg.querySelector('[data-analogy-virtual]'),point=e=>{const d=e.nextElementSibling.querySelector('path[fill*="-red"]').getAttribute('d').match(/^M([\d.]+)\s+([\d.]+)/);return [+d[1],+d[2]];};
   const pupil=svg.querySelector('.analogy-eye-art ellipse'),box=svg.viewBox.baseVal;
   return{object:point(object),virtual:point(virtual),objectRect:{x:+object.getAttribute('x'),width:+object.getAttribute('width')},virtualRect:{x:+virtual.getAttribute('x'),width:+virtual.getAttribute('width')},rays:coords(svg.querySelector('.analogy-light')),arrows:[...svg.querySelectorAll('.analogy-direction')].flatMap(coords),pupil:{x:+pupil.getAttribute('cx'),y:+pupil.getAttribute('cy'),rx:+pupil.getAttribute('rx'),ry:+pupil.getAttribute('ry')},labels:[...svg.querySelectorAll('.analogy-label')].map(g=>{const r=g.querySelector('rect').getBBox(),t=g.querySelector('text').getBBox();return {inside:t.x>=r.x-1&&t.x+t.width<=r.x+r.width+1&&t.y>=r.y-2.5&&t.y+t.height<=r.y+r.height+2.5&&r.x>=box.x&&r.x+r.width<=box.x+box.width&&r.y>=box.y&&r.y+r.height<=box.y+box.height};})};})}));
  assert.equal(result.overflow,false);assert.equal(result.back,0);assert.match(result.legend,/物體上端的代表光線/);assert.doesNotMatch(result.legend,/反向延長線/);assert.equal(result.figures.length,2);
  for(const [i,fig]of result.figures.entries()){
   assert.ok(fig.labels.every(x=>x.inside),JSON.stringify({width,fig}));assert.equal(fig.rays.length,2);
   for(const r of fig.rays){assert.equal(r.length,6);const [x1,y1,x2,y2,x3,y3]=r;assert.ok(Math.hypot(x1-fig.object[0],y1-fig.object[1])<1e-6);assert.ok(Math.abs((x3-fig.pupil.x)/fig.pupil.rx)<=1&&Math.abs((y3-fig.pupil.y)/fig.pupil.ry)<=1);const slopeOut=(y3-y2)/(x3-x2);assert.ok(Math.abs((fig.virtual[1]-y2)/(fig.virtual[0]-x2)-slopeOut)<1e-9);if(i===0)assert.ok(Math.abs((y2-y1)/(x2-x1)+slopeOut)<1e-9);else assert.ok(x1<x2&&x2<x3);}
   if(i===0){assert.equal(fig.object[0]-260,260-fig.virtual[0]);assert.equal(fig.object[1],fig.virtual[1]);assert.equal(fig.objectRect.width,fig.virtualRect.width);assert.ok(fig.arrows[0][2]<fig.arrows[0][0]&&fig.arrows[1][2]>fig.arrows[1][0]);}
   else{assert.equal(260-fig.virtual[0],2*(260-fig.object[0]));assert.equal(fig.virtualRect.width,2*fig.objectRect.width);assert.ok(fig.virtualRect.x+fig.virtualRect.width<fig.objectRect.x);assert.equal(fig.arrows.length,2);assert.ok(fig.arrows.every(a=>a[2]>a[0]&&a[2]>a[4]));}
  }
  await why.scrollIntoViewIfNeeded();await f.frame();await why.screenshot({path:`${f.out}/analogy-${width}.png`});
 }
 assert.deepEqual(f.errors,[]);
});
