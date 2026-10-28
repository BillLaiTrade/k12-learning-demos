import { POUR_DELAY } from './concentration-state.js?v=controls-2';
// Apparatus positions follow the approved 1536 x 1024 photograph.
export const TOOL = {
  sugar: { x: 407, y: 392, w: 335, h: 147, angle: 0 },
  water: { x: 1372, y: 477, w: 302, h: 378, angle: 0 }
};
const lerp = (a,b,t) => a+(b-a)*t;
const clampFill = t => Math.max(0,Math.min(1,(t-.25)/.55));
const ease = t => { t=Math.max(0,Math.min(1,t));return t*t*(3-2*t); };
export function toolPose(kind, animation, drag, now) {
  const home=TOOL[kind];
  if(drag?.kind===kind&&drag.moved) return {...home,x:drag.x,y:drag.y};
  if(!animation||animation.kind!==kind||kind==='water'&&animation.delta<0)return home;
  const t=Math.max(0,Math.min(1,(now-animation.start)/animation.duration));
  const strength=animation.hold?ease((now-animation.start)/POUR_DELAY):ease(Math.min(t/.3,(1-t)/.25));
  const target=kind==='water'?{x:1195,y:240,angle:-1.0}:animation.delta<0?{x:284,y:441,angle:-.08}:{x:405,y:398,angle:.12};
  return {...home,x:lerp(home.x,target.x,strength),y:lerp(home.y,target.y,strength),angle:lerp(0,target.angle,strength),flip:kind==='sugar'&&animation.delta<0?-1:1};
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
function water(ctx,mass,now,flowing) {
  const surface=554-mass*1.44,cx=985,rx=101;
  ctx.save();ctx.beginPath();ctx.moveTo(cx-rx,surface);ctx.lineTo(cx-rx+4,551);ctx.ellipse(cx,551,rx-4,16,0,Math.PI,0,true);ctx.lineTo(cx+rx,surface);ctx.closePath();
  const g=ctx.createLinearGradient(0,surface,0,565);g.addColorStop(0,'#d4dfda16');g.addColorStop(.7,'#d0dbd52b');g.addColorStop(1,'#e5eee93a');ctx.fillStyle=g;ctx.fill();
  ctx.beginPath();ctx.ellipse(cx,surface,rx,15,0,0,Math.PI*2);ctx.fillStyle='#d7e1dd20';ctx.fill();ctx.lineWidth=1.8;ctx.strokeStyle='#f7fffee0';ctx.stroke();
  ctx.beginPath();ctx.ellipse(cx,surface-1,rx-3,12,0,Math.PI,Math.PI*2);ctx.strokeStyle='#7f92896b';ctx.lineWidth=1.2;ctx.stroke();
  if(flowing){for(let i=0;i<3;i++){const r=10+((now/30+i*22)%64);ctx.beginPath();ctx.ellipse(cx+3,surface,r,r*.16,0,0,Math.PI*2);ctx.strokeStyle='#f7fffe88';ctx.stroke();}}
  ctx.restore();return surface;
}
export function renderMix(ctx,images,state,animation,drag,now) {
  ctx.clearRect(0,0,1536,1024);ctx.drawImage(images.background,0,0,1536,1024);
  const sugarPose=toolPose('sugar',animation,drag,now),waterPose=toolPose('water',animation,drag,now);
  const t=animation?Math.max(0,Math.min(1,(now-animation.start)/animation.duration)):0;
  const flowing=animation?.kind==='water'&&animation.delta>0&&(animation.hold?now-animation.start>POUR_DELAY:t>.25&&t<.8);
  const surface=water(ctx,state.water,now,flowing);sugarPile(ctx,state.sugar);
  ctx.save();ctx.beginPath();ctx.ellipse(1382,661,110,16,0,0,Math.PI*2);ctx.fillStyle='#4e46331a';ctx.fill();ctx.restore();
  drawTool(ctx,images.tools,'water',waterPose);drawTool(ctx,images.tools,'sugar',sugarPose);
  if(flowing){
    const lx=-waterPose.w*.45,ly=-waterPose.h*.41;
    const x=waterPose.x+lx*Math.cos(waterPose.angle)-ly*Math.sin(waterPose.angle),y=waterPose.y+lx*Math.sin(waterPose.angle)+ly*Math.cos(waterPose.angle);
    ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x-5,(y+surface)/2,987,surface);ctx.strokeStyle='#d7e6e272';ctx.lineWidth=6;ctx.lineCap='round';ctx.stroke();ctx.strokeStyle='#f8ffffdb';ctx.lineWidth=1.8;ctx.stroke();
  }
  if(animation?.kind==='water'&&animation.delta<0){
    // The beaker contains only the separately weighed solvent. Withdraw it
    // into a pipette instead of showing an inward stream while mass falls.
    const strength=ease(Math.min(t/.25,(1-t)/.2));
    const tip=lerp(surface-145,surface+23,strength),x=1008,top=tip-170;
    ctx.save();ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x,top+29);ctx.lineTo(x,tip);ctx.lineWidth=9;ctx.strokeStyle='#a3bcb47a';ctx.stroke();ctx.lineWidth=5;ctx.strokeStyle='#ffffffc9';ctx.stroke();
    ctx.beginPath();ctx.moveTo(x,tip-8);ctx.lineTo(x,tip-8-65*clampFill(t));ctx.lineWidth=3;ctx.strokeStyle='#b9d7ccbc';ctx.stroke();
    ctx.beginPath();ctx.ellipse(x,top+13,15,25,0,0,Math.PI*2);const rubber=ctx.createLinearGradient(x-15,0,x+15,0);rubber.addColorStop(0,'#496c57');rubber.addColorStop(.4,'#84a389');rubber.addColorStop(1,'#345743');ctx.fillStyle=rubber;ctx.fill();ctx.restore();
  }
  if(animation?.kind==='sugar'&&t>.18&&t<.8){
    const back=animation.delta<0,tipX=back?145:552,tipY=back?483:450,destX=back?145:544,destY=back?558:577;
    for(let i=0;i<32;i++){const f=((now/500+i*.057)%1);ctx.fillStyle=i%3?'#fffef4':'#e7e2d9';ctx.fillRect(lerp(tipX,destX,f)+Math.sin(i*3)*8*f,lerp(tipY,destY,f*f),1.6,2);}
  }
  return {sugar:sugarPose,water:waterPose};
}
