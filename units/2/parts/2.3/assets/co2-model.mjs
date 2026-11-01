// Instructional timing and geometry, not a measurement of dose or reaction rate.
export const CO2_SETUP_DURATION=4000;
export const CO2_OPERATIONS=Object.freeze([
 {label:'認識材料',duration:0},
 {label:'加入大理石',duration:9000},
 {label:'倒入稀鹽酸',duration:5000},
 {label:'塞緊塞子與導管',duration:4200},
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
 const rest=pose(mix(600,570,placement),mix(450,485,placement),90);
 let first=rest,rod=pose(mix(1050,1060,placement),mix(620,635,placement),-90);
 if(index>=3){
  const p=index===3?seal:1,lift=ease(p/.4),across=ease((p-.4)/.4),lower=ease((p-.8)/.2);
  first=pose(mix(570,300,across),mix(mix(485,80,lift),205,lower),90*(1-lift));
  const shift=ease(p/.15),turn=ease((p-.15)/.25);
  rod=pose(mix(1060,600,shift),mix(635,520,turn),-90*(1-turn));
 }
 if(index===5){
  const lift=ease(time/1500),across=ease((time-1500)/1500),lower=ease((time-3000)/1500);
  rod=pose(mix(600,870,across),mix(mix(520,270,lift),520,lower));
 }
 if(index===6){
  const lift=ease(time/1600),across=ease((time-1600)/1400),lower=ease((time-3000)/1300);
  rod=pose(mix(870,600,across),mix(mix(520,270,lift),520,lower));
 }
 const firstConnector=transformPoint({x:120,y:-70},first);
 const rodConnector=transformPoint({x:0,y:-CO2_GLASS_ROD_LENGTH},rod);
 return {first,rod,firstConnector,rodConnector,rodTip:{x:rod.x,y:rod.y},bendAngle:index<3?-90:-90+180*(index===3?seal:1)};
}
const releases=[4900,5300,5700,6100,6500];
export function co2OperationFrame(index,elapsed){
 index=Math.max(0,Math.min(CO2_OPERATIONS.length-1,Math.trunc(index)));
 const duration=CO2_OPERATIONS[index].duration,localTime=Math.max(0,Math.min(duration,Number(elapsed)||0));
 const placement=index===0?0:index===1?co2SetupFrame(localTime).arrangement:1;
 const acid=index<2?0:index===2?unit((localTime-700)/2500):1;
 const seal=index<3?0:index===3?ease(localTime/duration):1;
 const cover=index===6?ease((localTime-4300)/1700):0;
 const dishCount=index===0?5:index===1?releases.filter(t=>localTime<t).length:0;
 const fallingCount=index===1?releases.filter(t=>localTime>=t&&localTime<t+650).length:0;
 const flaskCount=CO2_STONE_COUNT-dishCount-fallingCount;
 const glass=co2GlassFrame(index,localTime,seal,placement);
 const insert=index<5?0:index===5?ease((localTime-3000)/1500):1-ease(localTime/4300);
 return {operation:index,localTime,duration,placement,acid,seal,cover,insert,marble:flaskCount/5,
  dishCount,fallingCount,flaskCount,tipX:glass.rod.x,tipY:glass.rod.y,
  reacting:acid>0,flow:acid>0&&seal===1,collecting:index===5&&insert===1,labeled:index===6&&cover===1};
}
const initial={flask:[140,100,340,340],jar:[715,155,350,350],acid:[30,420,170,170]};
export const CO2_WORKING={flask:[70,145,460,460],jar:[705,250,330,330],acid:[455,240,150,170]};
export function co2BenchFrame(index,elapsed,f=co2OperationFrame(index,elapsed)){
 const progress=f.placement,bodies={};
 for(const key of ['flask','jar','acid']){
  let box=initial[key].map((v,j)=>mix(v,CO2_WORKING[key][j],progress)),angle=0;
  if(key==='acid'&&index===2){
   const pickup=ease(f.localTime/700),exit=ease((f.localTime-3400)/1400);
   box=CO2_WORKING.acid.map((v,j)=>mix(v,[260,105,150,170][j],pickup));angle=-100*pickup;
   box[0]=mix(box[0],-240,exit);box[1]=mix(box[1],350,exit);angle*=1-exit;
  }else if(key==='acid'&&index>2){box=[-240,350,150,170];}
  bodies[key]={box,angle:angle||0,cx:box[0]+box[2]/2,cy:box[1]+box[3]/2,visible:box[0]+box[2]>0};
 }
 let bowl=pose(mix(390,520,progress),mix(520,500,progress));
 if(index===1){
  const pickup=ease((f.localTime-4000)/700),exit=ease((f.localTime-7300)/1500);
  bowl=pose(mix(bowl.x,290,pickup),mix(bowl.y,170,pickup)-90*Math.sin(Math.PI*pickup),-28*pickup);
  bowl.x=mix(bowl.x,-240,exit);bowl.y=mix(bowl.y,350,exit);bowl.angle*=1-exit;
 }else if(index>1)bowl=pose(-240,350);
 const plate=pose(mix(910,930,progress),mix(520,560,progress));
 if(index===6){plate.x=mix(930,870,f.cover);plate.y=mix(560,315,f.cover)-150*Math.sin(Math.PI*f.cover);}
 const glass=co2GlassFrame(index,f.localTime,f.seal,progress);
 const dishOffsets=[[-48,-12],[0,-22],[48,-10],[-27,17],[27,19]],settled=[[235,545],[280,553],[326,551],[369,543],[303,525]];
 const stones=dishOffsets.map(([x,y],id)=>{
  const dish=transformPoint({x,y},bowl),end={x:settled[id][0],y:settled[id][1]},fall=index===1?unit((f.localTime-releases[id])/650):index>1?1:0;
  let location=index===0||index===1&&f.localTime<releases[id]?'dish':fall<1?'falling':'flask';
  let p=dish,angle=bowl.angle;
  if(location==='falling'){
   // The exact same textured stone leaves the dish, passes the neck, then falls inside.
   const departure=transformPoint({x,y},pose(290,170,-28));
   if(fall<.3)p=point(departure,{x:300,y:210},ease(fall/.3));
   else {const t=(fall-.3)/.7,py=mix(210,end.y,t*t);p={x:mix(300,end.x,unit((py-330)/(end.y-330))),y:py};}
   angle=mix(-28,(id-2)*10,fall);
  }else if(location==='flask'){p=end;angle=(id-2)*10;}
  return {id,...p,angle:angle||0,location};
 });
 bowl.angle=bowl.angle||0;
 return {progress,bodies,bowl,plate,glass,stones};
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
