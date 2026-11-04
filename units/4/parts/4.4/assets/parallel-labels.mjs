// Project labels and thickness measurements onto the actual curved surfaces.
export function createParallelLabels({THREE,root,canvas,camera,lens,radius,halfThickness,prefix,focus,sourceX,axisY,endX,showRays,showFocus,lightPaths}){
 const ns='http://www.w3.org/2000/svg',overlay=document.createElementNS(ns,'svg');overlay.classList.add('lens-label-leaders');overlay.setAttribute('aria-hidden','true');canvas.parentElement.append(overlay);
 const configs=[
  {name:'source',point:()=>new THREE.Vector3(sourceX,axisY+.92,0),dx:0,dy:-34},
  {name:root.dataset.kind==='concave'?'thick':'thin',r:radius*.94,dx:55,dy:-38},
  {name:root.dataset.kind==='concave'?'thin':'thick',r:0,dx:102,dy:-66},
  {name:'focus',point:()=>focus.position.clone(),dx:0,dy:-37,visible:showFocus},
  {name:'axis',point:()=>new THREE.Vector3(endX,axisY,0),dx:-15,dy:35}
 ];
 for(const c of configs){c.el=root.querySelector(`[data-${prefix}-label=${c.name}]`);c.el.classList.add('lens-surface-label');c.line=document.createElementNS(ns,'path');c.line.setAttribute('data-lens-leader',c.name);overlay.append(c.line);}
 return function update(){
  const rect=canvas.getBoundingClientRect(),w=rect.width,h=rect.height;overlay.setAttribute('viewBox',`0 0 ${w} ${h}`);overlay.style.height=h+'px';
  const project=p=>{const v=p.clone().project(camera);return{x:(v.x+1)*w/2,y:(1-v.y)*h/2,z:v.z};};
  const segments=showRays()?lightPaths().map(([a,b])=>[project(a),project(b)]):[],occupied=[];
  const intersects=(box,[a,b])=>{let lo=0,hi=1;for(const[start,end,min,max]of [[a.x,b.x,box.left-4,box.right+4],[a.y,b.y,box.top-4,box.bottom+4]]){const d=end-start;if(Math.abs(d)<1e-8){if(start<min||start>max)return false;}else{lo=Math.max(lo,Math.min((min-start)/d,(max-start)/d));hi=Math.min(hi,Math.max((min-start)/d,(max-start)/d));if(lo>hi)return false;}}return true;};
  const tools=root.querySelector(`.${prefix}-tools`),minY=tools.offsetTop+tools.offsetHeight+13;
  for(const c of configs){
   let a,b;if(c.r!==undefined){a=project(lens.localToWorld(new THREE.Vector3(-halfThickness(c.r),c.r,0)));b=project(lens.localToWorld(new THREE.Vector3(halfThickness(c.r),c.r,0)));}else a=b=project(c.point());
   const p={x:(a.x+b.x)/2,y:(a.y+b.y)/2};c.el.hidden=!!c.visible&&!c.visible()||a.z< -1||a.z>1||p.x<8||p.x>w-8||p.y<minY||p.y>h-35;c.line.hidden=c.el.hidden;c.line.style.display=c.el.hidden?'none':'';if(c.el.hidden)continue;
   const ew=c.el.offsetWidth,eh=c.el.offsetHeight,candidates=[];
   for(const dy of [0,-eh-10,eh+10,-2*(eh+10),2*(eh+10),-3*(eh+10),3*(eh+10)])for(const dx of [c.dx,-c.dx,c.dx+65,-c.dx-65]){
    const x=Math.max(ew/2+9,Math.min(w-ew/2-9,p.x+dx)),y=Math.max(minY+eh/2,Math.min(h-45-eh/2,p.y+c.dy+dy));
    const box={left:x-ew/2,right:x+ew/2,top:y-eh/2,bottom:y+eh/2,x,y};
    if(occupied.some(o=>box.left<o.right+7&&box.right>o.left-7&&box.top<o.bottom+7&&box.bottom>o.top-7))continue;
    candidates.push({...box,score:(segments.some(s=>intersects(box,s))?10000:0)+Math.abs(dy)+Math.abs(dx-c.dx)*.3});
   }
   candidates.sort((a,b)=>a.score-b.score);const box=candidates[0];if(!box){c.el.hidden=true;c.line.style.display='none';continue;}c.el.style.left=box.x+'px';c.el.style.top=box.y+'px';occupied.push(box);
   const bottom=box.y<p.y,ex=Math.max(box.left+7,Math.min(box.right-7,p.x)),ey=bottom?box.bottom:box.top;
   let d=`M${ex} ${ey}L${ex} ${(ey+p.y)/2}L${p.x} ${p.y}`;
   if(c.r!==undefined){const length=Math.hypot(b.x-a.x,b.y-a.y)||1,nx=-(b.y-a.y)/length*4,ny=(b.x-a.x)/length*4;d+=`M${a.x} ${a.y}L${b.x} ${b.y}M${a.x-nx} ${a.y-ny}L${a.x+nx} ${a.y+ny}M${b.x-nx} ${b.y-ny}L${b.x+nx} ${b.y+ny}`;c.line.dataset.radius=c.r;}
   c.line.setAttribute('d',d);
  }
 };
}
