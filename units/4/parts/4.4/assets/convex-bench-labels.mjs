import {distanceLabel} from './convex-bench-model.mjs?v=20261104-convex-unified1';
export function createBenchLabels({THREE,root,canvas,camera,virtualImage,G,state,viewport,front,rays,receiver,receiverName}){
 const elements=[...root.querySelectorAll('.convex-image-tag,.convex-focus')];
 function box(rect,content=false){
  if(!virtualImage.visible)return null;const p=[];for(const x of content?[-.12*G.cardWidth,.12*G.cardWidth]:[-G.cardWidth/2,G.cardWidth/2])for(const y of content?[-.392*G.cardHeight,.367*G.cardHeight]:[-G.cardHeight/2,G.cardHeight/2])p.push(new THREE.Vector3(x,y,0).applyMatrix4(virtualImage.matrixWorld).project(camera));
  if(p.some(v=>v.z< -1||v.z>1))return null;return {left:Math.min(...p.map(v=>(v.x+1)*rect.width/2)),right:Math.max(...p.map(v=>(v.x+1)*rect.width/2)),top:Math.min(...p.map(v=>(1-v.y)*rect.height/2)),bottom:Math.max(...p.map(v=>(1-v.y)*rect.height/2))};
 }
 return ()=>{
  const r=canvas.getBoundingClientRect(),v=viewport();if(!v)return;const g=state(),outline=box(r),content=box(r,true),placed=[];
  const overlap=(a,b,gap=5)=>b&&a.left<b.right+gap&&a.right>b.left-gap&&a.top<b.bottom+gap&&a.bottom>b.top-gap;
  for(const e of elements){
   const name=e.dataset.benchLabel,focus=e.dataset.benchFocus,p=focus?[Number(focus)*G.scale,.38,.95]:name==='receiver'?[receiver()*G.scale,G.axis+.3,0]:[(g.v??0)*G.scale,G.axis+(name==='virtual'?(g.m??0)*G.cardHeight/2:Math.abs(g.m??0)*G.pointTop)+.08,0],q=new THREE.Vector3(...p).project(camera),x=(q.x+1)*r.width/2,y=(1-q.y)*r.height/2;
   const outside=x<v.left||x>v.left+v.width||y<v.top||y>r.height-10||q.z< -1||q.z>1;
   e.hidden=front()||(name==='virtual'?g.type!=='virtual':name==='real'?g.type!=='real'||!rays():name==='receiver'?!outside:outside);if(e.hidden)continue;
   if(name){e.textContent=name==='receiver'?`${receiverName}在視野外・${distanceLabel(receiver())}`:`${name==='virtual'?'虛像':'實像'}${outside?'在視野外':''}・${name==='virtual'?'圖卡':'另一'}側${distanceLabel(Math.abs(g.v))}`;e.style.maxWidth=(v.width-4)+'px';e.style.whiteSpace='normal';}
   const w=e.offsetWidth,h=e.offsetHeight,left=Math.max(v.left+w/2,Math.min(v.left+v.width-w/2,x)),initial=name==='virtual'&&outline&&!outside?outline.top-h/2-8:Math.max(v.top+h/2,Math.min(r.height-h/2-8,y+15)),candidates=[{x:left,y:initial}];
   if(name==='virtual'&&outline)candidates.push({x:left,y:outline.top-h/2-8},{x:outline.right+w/2+8,y:outline.top+h/2},{x:outline.left-w/2-8,y:outline.top+h/2},{x:left,y:outline.bottom+h/2+8});
   for(let i=1;i<=12;i++)candidates.push({x:left,y:initial-i*(h+6)},{x:left,y:initial+i*(h+6)});for(let top=v.top+h/2;top<r.height-h/2-8;top+=2)candidates.push({x:left,y:top});
   let chosen;for(const obstacle of name==='virtual'&&outline?[outline,content]:[null]){chosen=candidates.map(p=>({left:p.x-w/2,right:p.x+w/2,top:p.y-h/2,bottom:p.y+h/2})).find(c=>c.left>=v.left&&c.right<=v.left+v.width&&c.top>=v.top&&c.bottom<=r.height-8&&!placed.some(p=>overlap(c,p))&&!overlap(c,obstacle,7));if(chosen)break;}
   const c=chosen||{left:left-w/2,right:left+w/2,top:Math.max(v.top,Math.min(r.height-h-8,initial-h/2)),bottom:0};if(!chosen)c.bottom=c.top+h;
   e.style.left=(c.left+w/2)+'px';e.style.top=(c.top+h/2)+'px';placed.push(c);
  }
 };
}
