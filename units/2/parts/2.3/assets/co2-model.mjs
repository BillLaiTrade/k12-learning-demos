// Instructional timing and geometry, not a measurement of dose or reaction rate.
export const CO2_SETUP_DURATION=4000;
export const CO2_OPERATIONS=Object.freeze([
 {label:'認識材料',duration:0},
 {label:'加入大理石',duration:12850},
 {label:'裝好漏斗與導管',duration:4800},
 {label:'由漏斗加入稀鹽酸',duration:5000},
 {label:'先排出空氣',duration:2800},
 {label:'向上排空氣集氣',duration:6500},
 {label:'封存二氧化碳',duration:6500},
]);
export const CO2_STONE_COUNT=5;
export const CO2_GLASS_ROD_LENGTH=260;
export const CO2_RUBBER_LENGTH=500;
export const unit=x=>Math.max(0,Math.min(1,x));
export const ease=x=>{const t=unit(x);return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*t;
const point=(a,b,t)=>({x:mix(a.x,b.x,t),y:mix(a.y,b.y,t)});
const pose=(x,y,angle=0)=>({x,y,angle:angle||0});
export function transformPoint(p,t){const r=t.angle*Math.PI/180,c=Math.cos(r),s=Math.sin(r);return {x:t.x+c*p.x-s*p.y,y:t.y+s*p.x+c*p.y};}
export function co2SetupFrame(elapsed){const time=Math.max(0,Math.min(CO2_SETUP_DURATION,elapsed));return {time,arrangement:ease((time-300)/3300)};}
export function co2GlassFrame(index,time,seal=0,placement=1){
 const rest=pose(mix(600,620,placement),mix(450,440,placement),90);
 let first=rest,rod=pose(mix(1040,1040,placement),mix(635,635,placement),0);
 if(index>=2){
  const p=index===2?seal:1,lift=ease(p/.4),across=ease((p-.4)/.4),lower=ease((p-.8)/.2);
  first=pose(mix(620,300,across),mix(mix(440,-40,lift),205,lower),90*(1-lift));
  const shift=ease(p/.15),turn=ease((p-.15)/.25);
  rod=pose(mix(1040,600,shift),mix(635,520,turn),0);
 }
 if(index===5){
  const lift=ease(time/1500),across=ease((time-1500)/1500),lower=ease((time-3000)/1500);
  rod=pose(mix(600,870,across),mix(mix(520,270,lift),520,lower));
 }
 if(index===6){
  const lift=ease(time/1600),across=ease((time-1600)/1400),lower=ease((time-3000)/1300);
  rod=pose(mix(870,600,across),mix(mix(520,270,lift),520,lower));
 }
 const firstConnector=transformPoint({x:146,y:-70},first);
 const rodConnector=transformPoint({x:0,y:-CO2_GLASS_ROD_LENGTH},rod);
 return {first,rod,firstConnector,rodConnector,rodTip:{x:rod.x,y:rod.y},bendAngle:90};
}
// Keep apparatus positioning unchanged; run the later forceps motion at 2×.
const marbleMotionTime=time=>time<=4700?time:4700+(time-4700)*2;
const releases=[5500,8100,10700,13300,15900];
const STONE_TRANSFER=2200;
export const CO2_ACID_IMAGE=Object.freeze({width:500,height:810,lip:{x:116,y:83}});
export function co2OperationFrame(index,elapsed){
 index=Math.max(0,Math.min(CO2_OPERATIONS.length-1,Math.trunc(index)));
 const duration=CO2_OPERATIONS[index].duration,localTime=Math.max(0,Math.min(duration,Number(elapsed)||0));
 const motionTime=index===1?marbleMotionTime(localTime):localTime;
 const placement=index===0?0:index===1?co2SetupFrame(motionTime).arrangement:1;
 const acid=index<3?0:index===3?unit((localTime-700)/2500):1;
 const seal=index<2?0:index===2?ease(localTime/duration):1;
 const cover=index===6?ease((localTime-4300)/1700):0;
 const dishCount=index===0?5:index===1?releases.filter(t=>motionTime<t).length:0;
 const fallingCount=index===1?releases.filter(t=>motionTime>=t&&motionTime<t+STONE_TRANSFER).length:0;
 const flaskCount=CO2_STONE_COUNT-dishCount-fallingCount;
 const glass=co2GlassFrame(index,localTime,seal,placement);
 const insert=index<5?0:index===5?ease((localTime-3000)/1500):1-ease(localTime/4300);
 return {operation:index,localTime,motionTime,duration,placement,acid,seal,cover,insert,marble:flaskCount/5,
  dishCount,fallingCount,flaskCount,tipX:glass.rod.x,tipY:glass.rod.y,
  liquidSeal:seal===1&&580-80*acid<555,reacting:acid>0,flow:seal===1&&580-80*acid<555,collecting:index===5&&insert===1,labeled:index===6&&cover===1};
}
const initial={flask:[140,100,340,340],jar:[715,155,350,350],acid:[30,420,170,170]};
export const CO2_WORKING={flask:[70,145,460,460],jar:[705,250,330,330],acid:[455,240,150,170]};
export function co2BenchFrame(index,elapsed,f=co2OperationFrame(index,elapsed)){
 const motionTime=f.motionTime??f.localTime,progress=f.placement,bodies={};
 for(const key of ['flask','jar','acid']){
  let box=initial[key].map((v,j)=>mix(v,CO2_WORKING[key][j],progress)),angle=0;
  let cx=box[0]+box[2]/2,cy=key==='flask'?box[1]+box[3]*.945:box[1]+box[3]/2;
  if(key==='flask'&&index===1)angle=-28*ease((motionTime-3900)/800)*(1-ease((motionTime-18600)/1000));
  if(key==='acid'&&index===3){
   const pickup=ease(f.localTime/700),exit=ease((f.localTime-3400)/1400);
   // Use the lower pouring edge of the actual 500×810 source image.
   const u=CO2_ACID_IMAGE.lip.x/CO2_ACID_IMAGE.width,v=CO2_ACID_IMAGE.lip.y/CO2_ACID_IMAGE.height;
   angle=-65*pickup*(1-exit);const r=angle*Math.PI/180,dx=(u-.5)*150,dy=(v-.5)*170;
   const mouth=point({x:455+u*150,y:240+v*170},{x:274,y:42},pickup);
   cx=mouth.x-(Math.cos(r)*dx-Math.sin(r)*dy);cy=mouth.y-(Math.sin(r)*dx+Math.cos(r)*dy);
   cx=mix(cx,-165,exit);cy=mix(cy,435,exit);box=[cx-75,cy-85,150,170];
  }else if(key==='acid'&&index>3){box=[-240,350,150,170];cx=-165;cy=435;}
  bodies[key]={box,angle:angle||0,cx,cy,visible:box[0]+box[2]>0};
 }
 let bowl=pose(mix(390,520,progress),mix(520,500,progress));
 if(index===1){const exit=ease((motionTime-19600)/1400);bowl.x=mix(bowl.x,-240,exit);bowl.y=mix(bowl.y,350,exit);}
 else if(index>1)bowl=pose(-240,350);
 const flaskPose={x:bodies.flask.cx,y:bodies.flask.cy,angle:bodies.flask.angle};
 const inFlask=p=>{const q=transformPoint({x:p.x-flaskPose.x,y:p.y-flaskPose.y},flaskPose);return q;};

 const plate=pose(mix(910,930,progress),mix(520,560,progress));
 if(index===6){plate.x=mix(930,870,f.cover);plate.y=mix(560,315,f.cover)-150*Math.sin(Math.PI*f.cover);}
 const glass=co2GlassFrame(index,f.localTime,f.seal,progress);
 let funnel=pose(755,185);
 if(index===2){const p=f.seal,lift=ease(p/.4),across=ease((p-.4)/.4),lower=ease((p-.8)/.2);funnel=pose(mix(755,300,across),mix(mix(185,-190,lift),205,lower));}
 else if(index>2)funnel=pose(300,205);
 const dishOffsets=[[-48,-12],[0,-22],[48,-10],[-27,17],[27,19]],settled=[[220,555],[320,555],[367,548],[315,525],[367,520]];
 const slidePoints=[{x:300,y:235},{x:300,y:300},{x:347,y:350},{x:382,y:430},{x:389,y:500}];
 const track=(ps,t)=>{const u=unit(t)*(ps.length-1),i=Math.min(ps.length-2,Math.floor(u));return point(ps[i],ps[i+1],u-i);};
 const above=inFlask({x:300,y:105}),release=inFlask(slidePoints[0]);
 const safeAir=(from,to,t)=>t<.5?point(from,{x:from.x,y:80},ease(t*2)):point({x:from.x,y:80},to,ease((t-.5)*2));
 const stones=dishOffsets.map(([x,y],id)=>{
  const dish=transformPoint({x,y},bowl),end={x:settled[id][0],y:settled[id][1]},fall=index===1?unit((motionTime-releases[id])/STONE_TRANSFER):index>1?1:0;
  const location=index===0||index===1&&motionTime<releases[id]?'dish':fall<1?'falling':'flask';
  let p=dish,angle=0,inside=false;
  if(location==='falling'){
   const departure=transformPoint({x,y},pose(520,500));
   if(fall<.38)p=safeAir(departure,above,fall/.38);
   else if(fall<.62)p=point(above,release,ease((fall-.38)/.24));
   else {p=inFlask(track([...slidePoints,end],(fall-.62)/.38));inside=true;}
   angle=bodies.flask.angle*ease(fall/.38)+(id-2)*10*ease((fall-.62)/.38);
  }else if(location==='flask'){p=inFlask(end);angle=bodies.flask.angle+(id-2)*10;inside=true;}
  return {id,...p,angle:angle||0,location,inside};
 });
 let tool={x:570,y:-60,angle:0,visible:index===1&&motionTime>=4700&&motionTime<19600,gripping:false};
 if(index===1){
  const moving=stones.find(v=>v.location==='falling'),last=releases.findLastIndex(t=>motionTime>=t);
  if(moving){const fall=(motionTime-releases[moving.id])/STONE_TRANSFER;
   if(fall<.62)tool={...tool,x:moving.x,y:moving.y,angle:bodies.flask.angle*ease(fall/.38),gripping:true};
   else {
    const next=last<4?transformPoint({x:dishOffsets[last+1][0],y:dishOffsets[last+1][1]},bowl):{x:570,y:390};
    if(fall<.78)tool={...tool,...point(release,above,ease((fall-.62)/.16)),angle:bodies.flask.angle};
    else if(fall<.90)tool={...tool,...point(above,{x:next.x,y:80},ease((fall-.78)/.12)),angle:bodies.flask.angle*(1-ease((fall-.78)/.12))};
    else tool={...tool,...point({x:next.x,y:80},next,ease((fall-.90)/.10))};
   }
  }else if(last<0){const t=ease((motionTime-4700)/800);tool={...tool,...point(tool,transformPoint({x:dishOffsets[0][0],y:dishOffsets[0][1]},bowl),t)};}
  else if(last<4)tool={...tool,...transformPoint({x:dishOffsets[last+1][0],y:dishOffsets[last+1][1]},bowl)};
  else tool={...tool,x:570,y:mix(390,-60,ease((motionTime-18100)/1500))};
 }

 const acidBody=bodies.acid,ab=acidBody.box;
 const acidMouth=transformPoint({x:(ab[0]+ab[2]*CO2_ACID_IMAGE.lip.x/CO2_ACID_IMAGE.width)-acidBody.cx,y:(ab[1]+ab[3]*CO2_ACID_IMAGE.lip.y/CO2_ACID_IMAGE.height)-acidBody.cy},{x:acidBody.cx,y:acidBody.cy,angle:acidBody.angle});

 bowl.angle=bowl.angle||0;
 return {progress,bodies,bowl,plate,glass,stones,tool,acidMouth,funnel};
}
// Trace the photographed flask's INNER surface. Coordinates originate in its 440px image.
const innerSource=[[181,65],[261,65],[261,152],[271,160],[286,200],[300,240],[316,280],[323,300],[330,320],[337,340],[344,360],[344,380],[339,390],[329,400],[310,410],[282,416],[220,418],[158,416],[131,410],[112,400],[103,390],[98,380],[98,360],[105,340],[112,320],[119,300],[127,280],[141,240],[156,200],[171,160],[181,152]];
export const CO2_LIQUID_PROFILE=innerSource.map(([x,y])=>({x:70+x*460/440,y:145+y*460/440}));
export function liquidGeometry(level){
 const points=[];
 for(let i=0;i<CO2_LIQUID_PROFILE.length;i++){
  const a=CO2_LIQUID_PROFILE[i],b=CO2_LIQUID_PROFILE[(i+1)%CO2_LIQUID_PROFILE.length];
  if(a.y>=level)points.push(a);
  if((a.y<level)!==(b.y<level))points.push({x:a.x+(b.x-a.x)*(level-a.y)/(b.y-a.y),y:level});
 }
 const surface=points.filter(p=>Math.abs(p.y-level)<.001).map(p=>p.x);
 return {points,left:Math.min(...surface),right:Math.max(...surface),d:points.map((p,i)=>`${i?'L':'M'}${p.x} ${p.y}`).join('')+'Z'};
}
export function rubberGeometry(a,b,angle,length=CO2_RUBBER_LENGTH){
 const r=angle*Math.PI/180,n={x:Math.cos(r),y:Math.sin(r)},dx=b.x-a.x,dy=b.y-a.y;
 const controls=h=>[{x:a.x+dx/3+n.x*h,y:a.y+dy/3+n.y*h},{x:a.x+2*dx/3+n.x*h,y:a.y+2*dy/3+n.y*h}];
 const measure=([c,d])=>{let total=0;for(let i=0;i<64;i++){const t=(i+.5)/64,u=1-t;const vx=3*(u*u*(c.x-a.x)+2*u*t*(d.x-c.x)+t*t*(b.x-d.x)),vy=3*(u*u*(c.y-a.y)+2*u*t*(d.y-c.y)+t*t*(b.y-d.y));total+=Math.hypot(vx,vy)/64;}return total;};
 if(Math.hypot(dx,dy)>length+.1)throw Error('Rubber connectors exceed the fixed available tube length');
 let lo=0,hi=length*2;
 for(let i=0;i<25;i++){const h=(lo+hi)/2;if(measure(controls(h))<length)lo=h;else hi=h;}
 const [c,d]=controls((lo+hi)/2);
 return {a,b,c,d,length:measure([c,d]),dPath:`M${a.x} ${a.y}C${c.x} ${c.y} ${d.x} ${d.y} ${b.x} ${b.y}`};
}
