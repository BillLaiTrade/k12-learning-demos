import { POUR_DELAY, sugarActionState, waterAdditionState } from './concentration-state.js?v=water-motion-2';
// Apparatus positions follow the approved 1536 x 1024 photograph.
export const TOOL = {
  sugar: { x: 407, y: 392, w: 335, h: 147, angle: 0 },
  water: { x: 1372, y: 477, w: 302, h: 378, angle: 0 },
  beaker: { x: 980, y: 447, w: 260, h: 320, angle: 0 }
};
const lerp = (a,b,t) => a+(b-a)*t;
const ease = t => { t=Math.max(0,Math.min(1,t));return t*t*(3-2*t); };
export function toolPose(kind, animation, drag, now) {
  const home=TOOL[kind];
  if(drag?.kind===kind&&drag.moved) return {...home,x:drag.x,y:drag.y};
  if(!animation||animation.kind!==kind||kind==='water'&&animation.delta<0)return home;
  const t=Math.max(0,Math.min(1,(now-animation.start)/animation.duration));
  const strength=animation.returnOnly?animation.fromStrength*(1-ease(t)):animation.hold?ease((now-animation.start)/POUR_DELAY):waterAdditionState(t).tilt;
  if(kind==='sugar'){
    const stops=animation.delta<0?[
      {t:0,...home},{t:.20,x:430,y:520,angle:.05},{t:.30,x:430,y:520,angle:.05},
      {t:.42,x:430,y:410,angle:0},{t:.60,x:45,y:405,angle:.15},
      {t:.82,x:45,y:405,angle:.30},{t:.94,x:300,y:370,angle:0},{t:1,...home}
    ]:[
      {t:0,...home},{t:.14,x:90,y:455,angle:-.06},{t:.26,x:70,y:515,angle:.03},
      {t:.34,x:70,y:515,angle:.03},{t:.48,x:405,y:400,angle:0},
      {t:.60,x:405,y:455,angle:.12},{t:.70,x:405,y:455,angle:.32},
      {t:.82,x:405,y:455,angle:.32},{t:.92,x:405,y:425,angle:.05},{t:1,...home}
    ];
    const i=stops.findIndex((p,i)=>i<stops.length-1&&t>=p.t&&t<=stops[i+1].t);
    const a=stops[Math.max(0,i)],b=stops[Math.max(0,i)+1],f=ease((t-a.t)/(b.t-a.t));
    return {...home,x:lerp(a.x,b.x,f),y:lerp(a.y,b.y,f),angle:lerp(a.angle,b.angle,f)};
  }
  const target={x:1195,y:240,angle:-1.0};
  return {...home,x:lerp(home.x,target.x,strength),y:lerp(home.y,target.y,strength),angle:lerp(0,target.angle,strength)};
}
function drawTool(ctx,atlas,kind,pose) {
  if(kind==='water') {
    // Clip the liquid to the turning vessel, then draw in world coordinates
    // so gravity keeps its surface horizontal rather than glued to the glass.
    ctx.save();ctx.translate(pose.x,pose.y);ctx.rotate(pose.angle);
    ctx.beginPath();ctx.moveTo(-108,-130);ctx.bezierCurveTo(-91,-43,-149,0,-139,76);
    ctx.bezierCurveTo(-135,135,-111,155,-75,158);ctx.lineTo(25,158);
    ctx.bezierCurveTo(75,145,84,94,74,60);ctx.bezierCurveTo(52,-14,52,-50,65,-130);ctx.closePath();ctx.clip();
    ctx.setTransform(1,0,0,1,0,0);
    const level=pose.y-55+82*Math.min(Math.abs(pose.angle),1);
    const water=ctx.createLinearGradient(0,level,0,level+210);water.addColorStop(0,'#d9e5df20');water.addColorStop(1,'#c4d4cf40');
    ctx.fillStyle=water;ctx.fillRect(0,level,1536,1024-level);
    ctx.beginPath();ctx.moveTo(pose.x-250,level);ctx.lineTo(pose.x+220,level);ctx.strokeStyle='#faffffdc';ctx.lineWidth=2;ctx.stroke();ctx.restore();
  }
  ctx.save();ctx.translate(pose.x,pose.y);ctx.rotate(pose.angle);ctx.scale(pose.flip||1,1);
  if(kind==='sugar')ctx.drawImage(atlas,30,380,750,330,-pose.w/2,-pose.h/2,pose.w,pose.h);
  else ctx.drawImage(atlas,880,150,636,760,-pose.w/2,-pose.h/2,pose.w,pose.h);
  ctx.restore();
}
function sugarPile(ctx,mass) {
  if(mass<=0)return;
  const size=Math.cbrt(mass/5),rx=67*size,height=33*size,cx=544,base=587;
  ctx.save();ctx.beginPath();ctx.moveTo(cx-rx,base);ctx.bezierCurveTo(cx-rx*.7,base-height*.32,cx-rx*.2,base-height*1.08,cx,base-height);ctx.bezierCurveTo(cx+rx*.3,base-height*.88,cx+rx*.75,base-height*.15,cx+rx,base);ctx.closePath();
  const g=ctx.createLinearGradient(0,base-height,0,base);g.addColorStop(0,'#fffefa');g.addColorStop(1,'#e7e3da');ctx.fillStyle=g;ctx.fill();ctx.strokeStyle='#c8c1b55c';ctx.lineWidth=.8;ctx.stroke();ctx.clip();
  let seed=123;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<1200;i++){const x=cx-rx+2*rx*rnd(),y=base-height+height*rnd();ctx.fillStyle=rnd()>.4?'#ffffffdb':'#bcb7aa55';ctx.fillRect(x,y,.7+rnd()*1.4,.7+rnd()*1.4);}
  ctx.restore();
}
export function beakerPose(animation,now) {
  const home=TOOL.beaker;
  if(animation?.kind!=='water'||animation.delta>=0)return home;
  const t=Math.max(0,Math.min(1,(now-animation.start)/animation.duration));
  const strength=ease(Math.min(t/.3,(1-t)/.2));
  return {...home,x:lerp(home.x,1155,strength),y:lerp(home.y,210,strength),angle:1.2*strength};
}
const world=(pose,x,y)=>({x:pose.x+x*Math.cos(pose.angle)-y*Math.sin(pose.angle),y:pose.y+x*Math.sin(pose.angle)+y*Math.cos(pose.angle)});
function polygonArea(poly) {return Math.abs(poly.reduce((s,p,i)=>{const q=poly[(i+1)%poly.length];return s+p.x*q.y-q.x*p.y;},0))/2;}
function below(poly,y) {
  const out=[];
  for(let i=0;i<poly.length;i++){
    const a=poly[i],b=poly[(i+1)%poly.length],aIn=a.y>=y,bIn=b.y>=y;
    if(aIn)out.push(a);
    if(aIn!==bIn){const f=(y-a.y)/(b.y-a.y);out.push({x:lerp(a.x,b.x,f),y});}
  }
  return out;
}
function drawBeaker(ctx,asset,mass,pose,now,flowing) {
  const poly=[[-100,-128],[100,-128],[96,107],[-96,107]].map(([x,y])=>world(pose,x,y));
  const target=polygonArea(poly)*mass*1.44/235;
  let low=Math.min(...poly.map(p=>p.y)),high=Math.max(...poly.map(p=>p.y));
  for(let i=0;i<24;i++){const mid=(low+high)/2;if(polygonArea(below(poly,mid))>target)low=mid;else high=mid;}
  const surface=(low+high)/2;
  ctx.save();ctx.beginPath();poly.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.clip();
  const g=ctx.createLinearGradient(0,surface,0,surface+220);g.addColorStop(0,'#d4dfda20');g.addColorStop(1,'#d0dbd548');ctx.fillStyle=g;ctx.fillRect(0,surface,1536,1024-surface);
  ctx.beginPath();ctx.ellipse(pose.x,surface,140,Math.abs(Math.cos(pose.angle))*12,0,0,Math.PI*2);ctx.strokeStyle='#f7fffee0';ctx.lineWidth=2;ctx.stroke();
  if(flowing){for(let i=0;i<3;i++){const r=10+((now/30+i*22)%64);ctx.beginPath();ctx.ellipse(pose.x,surface,r,r*.16,0,0,Math.PI*2);ctx.strokeStyle='#f7fffe88';ctx.stroke();}}
  ctx.restore();
  ctx.save();ctx.translate(pose.x,pose.y);ctx.rotate(pose.angle);ctx.drawImage(asset,807,208,410,504,-130,-160,260,320);ctx.restore();
  return surface;
}
export function renderMix(ctx,images,state,animation,drag,now) {
  ctx.clearRect(0,0,1536,1024);ctx.drawImage(images.background,0,0,1536,1024);
  const sugarPose=toolPose('sugar',animation,drag,now),waterPose=toolPose('water',animation,drag,now),cupPose=beakerPose(animation,now);
  const t=animation?Math.max(0,Math.min(1,(now-animation.start)/animation.duration)):0;
  const flowing=animation?.kind==='water'&&animation.delta>0&&!animation.returnOnly&&(animation.hold?now-animation.start>POUR_DELAY:waterAdditionState(t).pouring);
  const surface=drawBeaker(ctx,images.beaker,state.water,cupPose,now,flowing);sugarPile(ctx,state.sugar);
  ctx.save();ctx.beginPath();ctx.ellipse(1382,661,110,16,0,0,Math.PI*2);ctx.fillStyle='#4e46331a';ctx.fill();ctx.restore();
  drawTool(ctx,images.tools,'water',waterPose);drawTool(ctx,images.tools,'sugar',sugarPose);
  if(flowing){
    const lx=-waterPose.w*.45,ly=-waterPose.h*.41;
    const x=waterPose.x+lx*Math.cos(waterPose.angle)-ly*Math.sin(waterPose.angle),y=waterPose.y+lx*Math.sin(waterPose.angle)+ly*Math.cos(waterPose.angle);
    ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x-5,(y+surface)/2,987,surface);ctx.strokeStyle='#d7e6e272';ctx.lineWidth=6;ctx.lineCap='round';ctx.stroke();ctx.strokeStyle='#f8ffffdb';ctx.lineWidth=1.8;ctx.stroke();
  }
  if(animation?.kind==='water'&&animation.delta<0&&t>.25&&t<.8){
    // The weighed vessel pours pure solvent back into its supply pitcher.
    const lip=world(cupPose,104,-130);
    ctx.beginPath();ctx.moveTo(lip.x,lip.y);ctx.quadraticCurveTo(lip.x+6,300,1320,345);ctx.strokeStyle='#c8dfd677';ctx.lineWidth=5;ctx.lineCap='round';ctx.stroke();ctx.strokeStyle='#f8ffffda';ctx.lineWidth=1.6;ctx.stroke();
  }
  const sugarAction=animation?.kind==='sugar'?sugarActionState(t,animation.delta):null;
  if(sugarAction?.pouring){
    const lip=world(sugarPose,140,45),back=animation.delta<0;
    const destination=back?{x:145,y:558}:{x:544,y:577};
    for(let i=0;i<32;i++){
      const fall=(sugarAction.pourProgress-i/32*.72)/.28;
      if(fall<0||fall>1)continue;
      const x=lerp(lip.x,destination.x,fall)+Math.sin(i*3)*7*fall,y=lerp(lip.y,destination.y,fall*fall);
      ctx.fillStyle=i%3?'#fffef4':'#e7e2d9';ctx.strokeStyle='#bcb4a866';ctx.lineWidth=.6;
      ctx.beginPath();ctx.ellipse(x,y,2.2,1.7,i,0,Math.PI*2);ctx.fill();ctx.stroke();
    }
  }
  return {sugar:sugarPose,water:waterPose,beaker:cupPose};
}
