import {createThistleFunnel,createDoubleStopper,svgNode as n} from './thistle-apparatus.mjs?v=thistle-1';
import {taskHosePoints,deskFrame,jarPose,jarMouth,waterSurface,ease,mix,clamp} from './collection-task-model.mjs?v=desk-2';
import {liquidGeometry} from './co2-model.mjs?v=marble-fast-1';
const image=(file,box)=>{const el=n('image',{href:'assets/'+file,preserveAspectRatio:'none'});['x','y','width','height'].forEach((key,i)=>el.setAttribute(key,box[i]));return el;};
const box=(el,b)=>['x','y','width','height'].forEach((k,i)=>el.setAttribute(k,b[i]));
export function sprite(file,crop,b,size){const el=n('svg',{viewBox:crop.join(' '),preserveAspectRatio:'none',overflow:'hidden'});box(el,b);el.append(image(file,[0,0,...size]));return el;}
const crops=[[606,159,339,325],[1122,175,336,289],[114,635,345,298],[618,636,345,288],[1121,623,330,329]];
const offsets=[[-48,-12],[0,-22],[48,-10],[-27,17],[27,19]],positions=[[220,555],[320,555],[367,548],[315,525],[367,520]];
const stone=(i,b)=>sprite('co2-marble-atlas.png',crops[i%5],b,[1536,1024]);
const marbleBowl=()=>sprite('co2-marble-atlas.png',[40,152,473,324],[-110,-74,220,148],[1536,1024]);
function glass(path,parent){const center=n('path',{d:path,fill:'none',stroke:'none'});parent.append(center);const length=center.getTotalLength();for(let i=0;i<90;i++){const a=center.getPointAtLength(length*i/90),b=center.getPointAtLength(length*(i+1)/90),g=n('g',{transform:`translate(${a.x} ${a.y}) rotate(${Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI-90})`});g.append(sprite('co2-tube.webp',[98,250+i%14*8,22,12],[-7,0,14,Math.hypot(b.x-a.x,b.y-a.y)+1],[440,440]));parent.append(g);}return center;}
export function materialArt(id){
 const s=n('svg',{viewBox:'0 0 180 145','aria-hidden':'true',focusable:'false'});
 if(['flask','jar','acid','peroxide','catalyst','plate'].includes(id))s.append(image({flask:'co2-flask.webp',jar:'co2-jar.webp',acid:'co2-acid.webp',peroxide:'oxygen-peroxide-bottle.webp',catalyst:'oxygen-mno2-dish.webp',plate:'co2-plate.webp'}[id],id==='plate'?[0,15,180,120]:[22,0,136,136]));
 if(id==='tank')s.append(sprite('oxygen-setup-sprites.png',[650,170,750,360],[3,24,174,105],[1686,933]));
 if(id==='marble'){const g=n('g',{transform:'translate(90 85) scale(.72)'});g.append(marbleBowl());offsets.forEach((p,i)=>g.append(stone(i,[p[0]-26,p[1]-22,52,44])));s.append(g);}
 if(id==='water'){s.append(image('oxygen-peroxide-open.webp',[48,3,84,132]),n('rect',{x:57,y:79,width:66,height:30,rx:5,fill:'#fffdf3'}));const t=n('text',{x:90,y:100,'text-anchor':'middle','font-size':16,fill:'#31584f'});t.textContent='清水';s.append(t);}
 if(id==='forceps')s.append(sprite('co2-tools-atlas.png',[842,35,110,1155],[65,0,16,140],[1268,1241]));
 if(id==='funnel'){const f=createThistleFunnel('desk-icon-'+Math.random().toString(36).slice(2),{top:0,tip:130,port:0});f.render({x:90,y:3});s.append(f.group);}
 if(id==='rig'){
  const id='desk-tool-'+Math.random().toString(36).slice(2),defs=n('defs'),clip=n('clipPath',{id});clip.append(n('path',{d:'M15 195V-48Q15 -84 52 -84H150V-57H52Q37 -57 37 -45V195Z'}));defs.append(clip);s.append(defs);
  const g=n('g',{transform:'translate(25 49) scale(.25)'}),photo=n('g',{'clip-path':`url(#${id})`});photo.append(sprite('co2-tube.webp',[85,45,172,350],[6.8,-90,137.6,280],[440,440]));g.append(photo,createDoubleStopper());s.append(g);
  const u=n('g',{transform:'translate(92 75) scale(.25)'});s.append(u);glass('M0 -140V40Q0 60 20 60H240Q260 60 260 40V10',u);
  const pts=taskHosePoints({x:61.5,y:31.5},{x:92,y:40},100);pts.slice(1).forEach((b,i)=>{const a=pts[i],piece=n('g',{transform:`translate(${a.x} ${a.y}) rotate(${Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI-90})`});piece.append(sprite('co2-tools-atlas.png',[338,100+i*980/64,90,24],[-2,0,4,Math.hypot(b.x-a.x,b.y-a.y)+.5],[1268,1241]));s.append(piece);});
 }
 return s;
}
const rotatePoint=(point,angle)=>{const a=angle*Math.PI/180,x=point.x-300,y=point.y-579.7;return{x:300+x*Math.cos(a)-y*Math.sin(a),y:579.7+x*Math.sin(a)+y*Math.cos(a)};};
const line=(a,b,t)=>({x:mix(a.x,b.x,ease(t)),y:mix(a.y,b.y,ease(t))});
function route(points,p){const k=clamp(p)*(points.length-1),i=Math.min(points.length-2,Math.floor(k));return line(points[i],points[i+1],k-i);}
function stonePose(s,f){
 const m=s.motion,p=f.progress,held={x:510,y:60},i=m?.index??s.flaskMarbles,dish={x:520+offsets[i%5][0],y:560+offsets[i%5][1]};
 if(m?.kind==='pick-stone'){const tip=p<.52?line({x:dish.x,y:-100},dish,p/.52):line(dish,held,(p-.52)/.48);return{tip,rock:p<.52?dish:tip,showRock:true};}
 if(m?.kind==='return-stone'){const point=line(held,dish,p);return{tip:point,rock:point,showRock:true};}
 if(m?.kind==='place-stone'){
  const angle=m.tilt?-28*ease(p/.2)*(1-ease((p-.85)/.15)):0,above=rotatePoint({x:300,y:110},angle),release=rotatePoint({x:300,y:238},angle);let tip;
  if(p<.2)tip=held;
  else if(p<.43)tip=route([held,{x:510,y:-20},{x:above.x,y:-20},above],(p-.2)/.23);
  else if(p<.6)tip=line(above,release,(p-.43)/.17);
  else if(p<.79)tip=line(release,above,(p-.6)/.19);
  else tip=line(above,{x:above.x-90,y:-200},(p-.79)/.21);
  const path=[{x:300,y:238},{x:300,y:300},{x:347,y:350},{x:382,y:430},{x:389,y:500},{x:positions[i%5][0],y:positions[i%5][1]}];
  const rock=p<.6?tip:rotatePoint(route(path,(p-.6)/.23),angle);return{angle,tip,rock,showRock:true};
 }
 return s.heldMarble?{tip:held,rock:held,showRock:true}:null;
}
export function createCollectionScene(svg){
 svg.replaceChildren(n('title'));svg.querySelector('title').textContent='可操作的二氧化碳排水集氣實驗桌';
 const defs=n('defs'),art=n('g');svg.append(defs,art);art.append(image('oxygen-setup-table.png',[0,-100,1100,750]));
 const flask=n('g'),inside=n('g',{'clip-path':'url(#desk-flask-inside)'}),flaskClip=n('clipPath',{id:'desk-flask-inside'});flaskClip.append(n('path',{d:liquidGeometry(212.96).d}));defs.append(flaskClip);flask.append(image('co2-flask.webp',[70,145,460,460]));
 const liquid=n('path',{fill:'#b8dce2','fill-opacity':.4,'data-desk-acid':''}),solids=n('g');inside.append(liquid,solids);flask.append(inside,image('co2-flask.webp',[70,145,460,460]));flask.lastChild.setAttribute('opacity','.18');art.append(flask);
 const solidNodes=positions.map((p,i)=>{const el=stone(i,[p[0]-24,p[1]-20,48,40]);solids.append(el);return el;});
 const sourceBubbles=n('g',{'clip-path':'url(#desk-flask-inside)',fill:'#fff','fill-opacity':.8,stroke:'#8cacac','stroke-width':1.2,'data-desk-source-bubbles':''});for(let i=0;i<12;i++)sourceBubbles.append(n('circle',{r:2+i%3}));flask.append(sourceBubbles);
 const bowl=n('g',{transform:'translate(520 560)'});bowl.append(marbleBowl());const bowlStones=offsets.map((p,i)=>{const el=stone(i,[p[0]-26,p[1]-22,52,44]);bowl.append(el);return el;});art.append(bowl);
 const tankClip=n('clipPath',{id:'desk-tank-inside'});tankClip.append(n('path',{d:'M597 377L655 336L1050 356L1043 517L1006 548L607 524Z'}));defs.append(tankClip);
 const water=n('path',{fill:'#9bd5df','fill-opacity':.38,'clip-path':'url(#desk-tank-inside)','data-desk-tank-water':''}),surface=n('path',{fill:'#def7f6','fill-opacity':.45,stroke:'#91bac0','stroke-width':1,'clip-path':'url(#desk-tank-inside)'});art.append(water,surface);
 const jarClip=n('clipPath',{id:'desk-jar-inside'}),jarShape=n('path',{d:'M799 228Q870 208 941 228V439Q870 459 799 439Z'});jarClip.append(jarShape);defs.append(jarClip);
 const jar=n('g',{'data-desk-jar':''});jar.append(image('co2-jar.webp',[700,160,340,340]));art.append(jar);
 const jarWater=n('rect',{x:0,width:1500,height:800,fill:'#a7d6df','fill-opacity':.46,'clip-path':'url(#desk-jar-inside)','data-desk-jar-water':''});art.append(jarWater);const meniscus=n('path',{fill:'none',stroke:'#6babb8','stroke-width':2,'stroke-opacity':.7,'clip-path':'url(#desk-jar-inside)','data-desk-jar-surface':''});art.append(meniscus);
 const jarFront=image('co2-jar.webp',[700,160,340,340]);jarFront.setAttribute('opacity','.2');art.append(jarFront);
 const plate=n('g',{'data-desk-plate':''});plate.append(image('co2-plate.webp',[698.45,192.91,340,80]));art.append(plate);
 art.append(sprite('oxygen-setup-sprites.png',[650,170,750,360],[580,310,480,270],[1686,933]));
 // 先畫漏斗，再畫瓶塞；塞子會遮住穿孔內的長管。
 const funnel=createThistleFunnel('desk',{top:-140,tip:350,port:-26});art.append(funnel.group);
 const first=n('g',{'data-desk-rig':''}),firstClip=n('clipPath',{id:'desk-first-glass'});firstClip.append(n('path',{d:'M15 195V-48Q15 -84 52 -84H150V-57H52Q37 -57 37 -45V195Z'}));defs.append(firstClip);
 const firstGlass=n('g',{'clip-path':'url(#desk-first-glass)'});firstGlass.append(sprite('co2-tube.webp',[85,45,172,350],[6.8,-90,137.6,280],[440,440]));first.append(firstGlass,createDoubleStopper());art.append(first);
 const collector=n('g',{'data-desk-collector':''});art.append(collector);glass('M0 -140V40Q0 60 20 60H240Q260 60 260 40V10',collector);
 const rubber=n('g',{'data-desk-hose':''}),segments=[];art.append(rubber);for(let i=0;i<64;i++){const g=n('g'),piece=sprite('co2-tools-atlas.png',[338,100+i*980/64,90,24],[-7,0,14,10],[1268,1241]);g.append(piece);rubber.append(g);segments.push({g,piece});}
 const outletBubbles=n('g',{fill:'#fff','fill-opacity':.9,stroke:'#79a6ac','stroke-width':1.3,'data-desk-outlet-bubbles':''});for(let i=0;i<8;i++)outletBubbles.append(n('circle',{r:3+i%3}));art.append(outletBubbles);
 const movingStone=stone(0,[-25,-22,50,44]),forceps=n('g',{'data-desk-forceps':''});forceps.append(sprite('co2-tools-atlas.png',[842,35,110,1155],[-15,-300,30,300],[1268,1241]));art.append(movingStone,forceps);
 const bottle=n('g',{'data-desk-pour-bottle':''}),bottleImage=image('oxygen-peroxide-open.webp',[-75,-85,150,170]);bottle.append(bottleImage);art.append(bottle);
 const stream=n('path',{fill:'none',stroke:'#b4dae0','stroke-opacity':.8,'stroke-width':4,'stroke-linecap':'round','data-desk-stream':''}),spill=n('path',{fill:'none',stroke:'#acd5dc','stroke-opacity':.65,'stroke-width':5,'data-desk-spill':''});art.append(stream,spill);
 const labels={};for(const[id,text]of[['flask','反應瓶'],['jar','集氣瓶'],['tank','水槽'],['marble','大理石']]){const g=n('g'),r=n('rect',{x:-49,y:-22,width:98,height:33,rx:6,fill:'#fffef6','fill-opacity':.95}),t=n('text',{'text-anchor':'middle','font-size':19,fill:'#31584f',y:1});t.textContent=text;g.append(r,t);art.append(g);labels[id]=g;}
 const sample=n('text',{'text-anchor':'middle','font-size':19,fill:'#31584f','paint-order':'stroke',stroke:'#fff','stroke-width':4,'data-desk-sample':''});art.append(sample);
 let hoseKey='';
 return{render(s){
  const f=deskFrame(s),m=s.motion,p=f.progress,jp=jarPose(s),jt=`translate(${jp.x} ${jp.y}) rotate(${s.jarAngle} 870 330)`,sp=stonePose(s,f);
  svg.dataset.water=s.jarWater.toFixed(4);svg.dataset.collected=s.co2Volume.toFixed(4);svg.dataset.air=s.airVolume.toFixed(4);svg.dataset.reaction=String(f.reaction);svg.dataset.flow=String(f.flow);svg.dataset.collecting=String(f.collecting);svg.dataset.motion=f.motion;svg.dataset.angle=String(s.jarAngle);svg.dataset.tubeX=String(f.outlet.x);svg.dataset.tubeY=String(f.outlet.y);svg.dataset.sealed=String(s.jarCovered);
  flask.setAttribute('transform',`rotate(${sp?.angle||0} 300 579.7)`);liquid.setAttribute('d',liquidGeometry(580-80*s.acid).d);liquid.setAttribute('opacity',s.acid>0?'1':'0');solidNodes.forEach((el,i)=>el.setAttribute('visibility',i<s.flaskMarbles?'visible':'hidden'));
  bowlStones.forEach((el,i)=>{const taken=i<s.flaskMarbles||(i===s.flaskMarbles&&(s.heldMarble||['pick-stone','return-stone','place-stone'].includes(f.motion)));el.setAttribute('visibility',taken?'hidden':'visible');});
  sourceBubbles.setAttribute('opacity',f.reaction?'1':'0');[...sourceBubbles.children].forEach((b,i)=>{b.setAttribute('cx',235+i%6*24+Math.sin(s.time/450+i)*7);b.setAttribute('cy',575-((s.time/750+i*.13)%1)*Math.max(0,575-(580-80*s.acid)));});
  const sy=waterSurface(s);water.setAttribute('d',`M580 ${sy}L1100 ${sy-18}V600H580Z`);surface.setAttribute('d',`M597 ${sy}L655 ${sy-38}L1050 ${sy-18}L1010 ${sy+20}Z`);water.setAttribute('opacity',s.tankWater>0?'1':'0');surface.setAttribute('opacity',s.tankWater>0?'1':'0');
  jar.setAttribute('transform',jt);jarFront.setAttribute('transform',jt);jarShape.setAttribute('transform',jt);
  // 保持水面水平，並以旋轉後的瓶內輪廓裁切，沒有伸出瓶外的方塊。
  const a=s.jarAngle*Math.PI/180,points=[[799,228],[820,218],[920,218],[941,228],[941,439],[920,449],[820,449],[799,439]].map(([x,y])=>({x:870+jp.x+(x-870)*Math.cos(a)-(y-330)*Math.sin(a),y:330+jp.y+(x-870)*Math.sin(a)+(y-330)*Math.cos(a)}));
  const ys=points.map(p=>p.y),top=Math.min(...ys),bottom=Math.max(...ys),level=mix(bottom,top,s.jarWater);jarWater.setAttribute('y',level);jarWater.setAttribute('height',Math.max(0,800-level));jarWater.setAttribute('opacity',s.jarWater>0?'1':'0');meniscus.setAttribute('d',`M${870+jp.x-170} ${level}Q${870+jp.x} ${level+5} ${870+jp.x+170} ${level}`);meniscus.setAttribute('opacity',s.jarWater>.005&&s.jarWater<.995?'1':'0');
  let cover=s.jarCovered?1:0;if(f.motion==='cover')cover=ease(p);if(f.motion==='uncover')cover=1-ease(p);plate.setAttribute('opacity',cover>0?'1':'0');plate.setAttribute('transform',`${jt} translate(${(1-cover)*190} 0)`);
  let rigPose={x:300,y:205,angle:0},op=f.outlet,rigVisible=s.rig||f.motion==='rig'||f.motion==='remove-rig';
  if(f.motion==='rig'||f.motion==='remove-rig'){
   const q=f.motion==='remove-rig'?1-p:p,lift=ease(q/.4),across=ease((q-.4)/.35),lower=ease((q-.75)/.25);
   rigPose={x:mix(620,300,across),y:mix(mix(1000,-40,lift),205,lower),angle:90*(1-lift)};
   op={x:mix(620,430,across),y:mix(mix(1160,-30,lift),260,lower)};
  }
  first.setAttribute('transform',`translate(${rigPose.x} ${rigPose.y}) rotate(${rigPose.angle})`);first.setAttribute('visibility',rigVisible?'visible':'hidden');
  let fp={x:300,y:205,angle:0};const fv=s.funnel||f.motion==='funnel'||(f.motion==='remove-rig'&&m.hasFunnel);
  if(f.motion==='funnel'){const lift=ease(p/.4),across=ease((p-.4)/.35),lower=ease((p-.75)/.25);fp={x:mix(550,300,across),y:mix(mix(950,-180,lift),205,lower),angle:0};}
  if(f.motion==='remove-rig')fp=rigPose;
  const pouring=['acid','water'].includes(f.motion)&&p>.25&&p<.8;
  funnel.render(fp,pouring&&f.motion==='acid'&&m.viaFunnel);funnel.group.setAttribute('visibility',fv?'visible':'hidden');
  collector.setAttribute('transform',`translate(${op.x} ${op.y})`);collector.setAttribute('visibility',rigVisible?'visible':'hidden');rubber.setAttribute('visibility',rigVisible?'visible':'hidden');
  if(rigVisible){const rad=rigPose.angle*Math.PI/180,start={x:rigPose.x+146*Math.cos(rad)+70*Math.sin(rad),y:rigPose.y+146*Math.sin(rad)-70*Math.cos(rad)},key=[start.x,start.y,op.x,op.y].join('/');if(key!==hoseKey){hoseKey=key;const pts=taskHosePoints(start,{x:op.x,y:op.y-140});segments.forEach(({g,piece},i)=>{const a=pts[i],b=pts[i+1];g.setAttribute('transform',`translate(${a.x} ${a.y}) rotate(${Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI-90})`);piece.setAttribute('height',Math.hypot(b.x-a.x,b.y-a.y)+1);});}}
  const tip={x:f.outlet.x+260,y:f.outlet.y+10},inWater=s.rig&&f.flow&&tip.y>sy&&tip.x>595&&tip.x<1050,inside=f.collecting&&s.jarWater>.015,bubbleTop=inside?Math.max(level,top+8):sy;
  const overflowing=f.collecting&&s.jarWater<=.015;
  outletBubbles.setAttribute('opacity',inWater&&(!f.collecting||inside||overflowing)?'1':'0');outletBubbles.dataset.location=inside?'jar':'tank';
  [...outletBubbles.children].forEach((b,i)=>{const origin=overflowing?{x:948,y:432}:tip;b.setAttribute('cx',origin.x+Math.sin(s.time/350+i)*4);b.setAttribute('cy',origin.y-((s.time/850+i*.14)%1)*Math.max(0,origin.y-bubbleTop));});
  forceps.setAttribute('visibility',sp?'visible':'hidden');movingStone.setAttribute('visibility',sp?.showRock?'visible':'hidden');if(sp){forceps.setAttribute('transform',`translate(${sp.tip.x} ${sp.tip.y}) rotate(-12)`);movingStone.setAttribute('viewBox',crops[(m?.index??s.flaskMarbles)%5].join(' '));box(movingStone,[sp.rock.x-24,sp.rock.y-20,48,40]);}
  const isPour=['water','acid','put-away'].includes(f.motion);bottle.setAttribute('visibility',isPour?'visible':'hidden');stream.setAttribute('visibility',pouring?'visible':'hidden');
  if(isPour){const kind=f.motion==='put-away'?m.pourKind:f.motion,q=f.motion==='put-away'?m.stopAt:p,target=kind==='acid'?(m.viaFunnel?{x:274,y:42}:{x:300,y:180}):m.target==='jar'?{x:jarMouth(s).x,y:jarMouth(s).y-25}:{x:810,y:315};const enter=ease(q/.25),exit=ease((q-.8)/.2),away=f.motion==='put-away'?ease(p):0,lip={x:mix(mix(mix(1120,target.x,enter),1120,exit),1120,away),y:mix(mix(mix(-150,target.y,enter),-150,exit),-150,away)},angle=-65*enter*(1-exit)*(1-away),rad=angle*Math.PI/180,local={x:-75+116/500*150,y:-85+83/810*170},cx=lip.x-local.x*Math.cos(rad)+local.y*Math.sin(rad),cy=lip.y-local.x*Math.sin(rad)-local.y*Math.cos(rad);bottle.setAttribute('transform',`translate(${cx} ${cy}) rotate(${angle})`);const end=f.motion==='acid'?(m.viaFunnel?{x:274,y:78}:{x:300,y:250}):m.target==='jar'?{x:target.x,y:Math.max(jarMouth(s).y+20,level)}:{x:810,y:Math.max(375,sy)};stream.setAttribute('d',`M${lip.x} ${lip.y}Q${lip.x+3} ${(lip.y+end.y)/2} ${end.x} ${end.y}`);bottle.dataset.lipX=String(lip.x);bottle.dataset.lipY=String(lip.y);stream.dataset.startX=String(lip.x);stream.dataset.startY=String(lip.y);}
  const mouth=jarMouth(s);spill.setAttribute('opacity',s.spilling?'1':'0');spill.setAttribute('d',`M${mouth.x} ${mouth.y}Q${mouth.x+15} ${mouth.y+45} ${mouth.x+10} ${Math.max(570,mouth.y+75)}`);
  labels.flask.setAttribute('transform','translate(300 620)');labels.marble.setAttribute('transform','translate(520 640)');labels.tank.setAttribute('transform','translate(1000 590)');labels.jar.setAttribute('transform',`translate(${870+jp.x} ${Math.max(...ys)+32})`);
  sample.textContent=s.sampleStarted?(s.airVolume>.01?'混有空氣':s.co2Volume>.98?'二氧化碳':'正在集氣'):'';sample.setAttribute('x',870+jp.x);sample.setAttribute('y',330+jp.y);sample.setAttribute('opacity',s.co2Volume>0||s.airVolume>0?'1':'0');
  return{jar:{x:870+jp.x,y:330+jp.y},flask:{x:300,y:410},marble:{x:520,y:560},tank:{x:1000,y:480},outlet:{x:op.x+260,y:op.y+10},funnel:{x:274,y:75}};
 }};
}
