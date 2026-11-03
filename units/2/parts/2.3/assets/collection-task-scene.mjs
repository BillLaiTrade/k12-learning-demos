import {regionPath,looseFunnelPose,STONE_OFFSETS} from './collection-task-contact.mjs?v=retry-1';
import {directPosition,parkPosition} from './collection-task-direct.mjs?v=retry-1';
import {createThistleFunnel,createDoubleStopper,svgNode as n} from './thistle-apparatus.mjs?v=thistle-1';
import {taskHosePoints,deskFrame,jarPose,jarMouth,waterSurface,flaskSurface,ease,mix,clamp,rigPosition} from './collection-task-model.mjs?v=retry-1';
import {liquidGeometry} from './co2-model.mjs?v=marble-fast-1';
const image=(file,box)=>{const el=n('image',{href:'assets/'+file,preserveAspectRatio:'none'});['x','y','width','height'].forEach((key,i)=>el.setAttribute(key,box[i]));return el;};
const box=(el,b)=>['x','y','width','height'].forEach((k,i)=>el.setAttribute(k,b[i]));
export function sprite(file,crop,b,size){const el=n('svg',{viewBox:crop.join(' '),preserveAspectRatio:'none',overflow:'hidden'});box(el,b);el.append(image(file,[0,0,...size]));return el;}
const crops=[[606,159,339,325],[1122,175,336,289],[114,635,345,298],[618,636,345,288],[1121,623,330,329]];
const offsets=STONE_OFFSETS,positions=[[220,555],[320,555],[367,548],[315,525],[367,520]];
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
 const m=s.motion,p=f.progress,held=directPosition(s,'forceps')||{x:510,y:60},end=m?.endTool||held,i=m?.index??s.heldStoneId??s.flaskMarbles,dish={x:520+offsets[i%5][0],y:560+offsets[i%5][1]};
 if(m?.kind==='pick-stone'){const tip=p<.52?line(m.toolStart||held,dish,p/.52):line(dish,end,(p-.52)/.48);return{tip,rock:p<.52?dish:tip,showRock:true};}
 if(m?.kind==='return-stone'){const point=p<.65?line(m.toolStart||held,dish,p/.65):line(dish,end,(p-.65)/.35);return{tip:point,rock:point,showRock:p<.65};}
 if(m?.kind==='place-stone'){
  const angle=m.tilt&&!m.contact?-28*ease(p/.2)*(1-ease((p-.85)/.15)):0,above=rotatePoint({x:300,y:110},angle),release=rotatePoint({x:300,y:238},angle);let tip;
  if(p<.2)tip=held;
  else if(p<.43)tip=m.contact?line(held,above,(p-.2)/.23):route([held,{x:510,y:-20},{x:above.x,y:-20},above],(p-.2)/.23);
  else if(p<.6)tip=line(above,release,(p-.43)/.17);
  else if(p<.79)tip=line(release,above,(p-.6)/.19);
  else tip=line(above,end,(p-.79)/.21);
  const path=[{x:300,y:238},{x:300,y:300},{x:347,y:350},{x:382,y:430},{x:389,y:500},{x:positions[s.flaskMarbles%5][0],y:positions[s.flaskMarbles%5][1]}];
  const rock=p<.6?tip:rotatePoint(route(path,(p-.6)/.23),angle);return{angle,tip,rock,showRock:true};
 }
 return s.positions.forceps?{tip:held,rock:held,showRock:s.heldMarble}:null;
}
export function createCollectionScene(svg){
 svg.replaceChildren(n('title'));svg.querySelector('title').textContent='可操作的二氧化碳排水集氣實驗桌';
 const defs=n('defs'),art=n('g');svg.append(defs,image('oxygen-setup-table.png',[0,-100,1100,750]),art);
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
 const tankBody=sprite('oxygen-setup-sprites.png',[650,170,750,360],[580,310,480,270],[1686,933]);art.append(tankBody);
 // 先畫漏斗，再畫瓶塞；塞子會遮住穿孔內的長管。
 const funnel=createThistleFunnel('desk',{top:-140,tip:350,port:-26});art.append(funnel.group);
 const first=n('g',{'data-desk-rig':''}),firstClip=n('clipPath',{id:'desk-first-glass'});firstClip.append(n('path',{d:'M15 195V-48Q15 -84 52 -84H150V-57H52Q37 -57 37 -45V195Z'}));defs.append(firstClip);
 const firstGlass=n('g',{'clip-path':'url(#desk-first-glass)'});firstGlass.append(sprite('co2-tube.webp',[85,45,172,350],[6.8,-90,137.6,280],[440,440]));const stopper=createDoubleStopper();stopper.setAttribute('transform','scale(.86 .74)');first.append(firstGlass,stopper);art.append(first);
 const neckClip=n('clipPath',{id:'desk-neck-front'});neckClip.append(n('path',{d:'M252 205Q300 225 348 205V212Q300 232 252 212ZM254 215L264 218L268 274H259ZM336 218L346 215L341 274H333Z'}));defs.append(neckClip);const neckFront=image('co2-flask.webp',[70,145,460,460]);neckFront.setAttribute('clip-path','url(#desk-neck-front)');neckFront.setAttribute('data-desk-neck-front','');art.append(neckFront);
 const collector=n('g',{'data-desk-collector':''});art.append(collector);glass('M0 -140V40Q0 60 20 60H240Q260 60 260 40V10',collector);
 const rubber=n('g',{'data-desk-hose':''}),segments=[];art.append(rubber);for(let i=0;i<64;i++){const g=n('g'),piece=sprite('co2-tools-atlas.png',[338,100+i*980/64,90,24],[-7,0,14,10],[1268,1241]);g.append(piece);rubber.append(g);segments.push({g,piece});}
 const outletBubbles=n('g',{fill:'#fff','fill-opacity':.9,stroke:'#79a6ac','stroke-width':1.3,'data-desk-outlet-bubbles':''});for(let i=0;i<8;i++)outletBubbles.append(n('circle',{r:3+i%3}));art.append(outletBubbles);
 const movingStone=stone(0,[-25,-22,50,44]),forceps=n('g',{'data-desk-forceps':''});forceps.append(sprite('co2-tools-atlas.png',[842,35,110,1155],[-15,-300,30,300],[1268,1241]));art.append(movingStone,forceps);
 const bottles={};for(const id of ['water','acid']){const g=n('g',{'data-desk-bottle-id':id});g.append(image('oxygen-peroxide-open.webp',[-75,-85,150,170]));const label=n('text',{x:0,y:35,'text-anchor':'middle','font-size':18,fill:'#31584f',stroke:'#fff','stroke-width':5,'paint-order':'stroke'});label.textContent=id==='water'?'清水':'稀鹽酸';g.append(label);art.append(g);bottles[id]=g;}
 const stream=n('path',{fill:'none',stroke:'#b4dae0','stroke-opacity':.8,'stroke-width':4,'stroke-linecap':'round','data-desk-stream':''}),spill=n('path',{fill:'none',stroke:'#acd5dc','stroke-opacity':.65,'stroke-width':5,'data-desk-spill':''});art.append(stream,spill);
 const labels={};for(const[id,text]of[['flask','反應瓶'],['jar','集氣瓶'],['tank','水槽'],['marble','大理石']]){const g=n('g'),r=n('rect',{x:-49,y:-22,width:98,height:33,rx:6,fill:'#fffef6','fill-opacity':.95}),t=n('text',{'text-anchor':'middle','font-size':19,fill:'#31584f',y:1});t.textContent=text;g.append(r,t);art.append(g);labels[id]=g;}
 const sample=n('text',{'text-anchor':'middle','font-size':19,fill:'#31584f','paint-order':'stroke',stroke:'#fff','stroke-width':4,'data-desk-sample':''});art.append(sample);
 const draggable=(el,id,shape,grip)=>{el.dataset.deskDrag=id;el.setAttribute('role','button');el.setAttribute('tabindex','0');el.setAttribute('aria-label',({forceps:'鑷子',water:'清水瓶',acid:'稀鹽酸瓶',rig:'雙孔塞與導管',funnel:'薊頭漏斗',plate:'玻璃片',jar:'集氣瓶',outlet:'導管出口',peroxide:'雙氧水',catalyst:'二氧化錳'})[id]+'，可拖曳或使用輔助選項');// 子圖的透明像素不接收事件；只由沿實物輪廓的路徑接收拖曳。
 const hit=n('path',{d:shape,fill:'transparent',stroke:'transparent','stroke-width':['forceps','outlet'].includes(id)?76:12,'data-desk-grip':id,'data-grip-x':grip[0],'data-grip-y':grip[1]});if(id==='outlet'){hit.setAttribute('fill','none');hit.style.pointerEvents='visibleStroke';}
 if(id==='rig'){hit.setAttribute('d','M-48 -18Q0 -29 48 -18L43 49Q0 62 -43 49Z');el.setAttribute('aria-label','雙孔塞：直接向上拖動可拔出');}
 el.append(hit);};
 draggable(forceps,'forceps','M-8 -290L8 -290L5 -5L-5 -5Z',[0,-150]);
 const bottleShape='M-43 -70Q-58 -70 -58 -57L-58 -42Q-65 -30 -65 -15V64Q-60 82 30 80Q60 77 62 63V-15Q58 -35 27 -45V-62Q26 -74 -43 -70Z';
 draggable(bottles.water,'water',bottleShape,[0,15]);draggable(bottles.acid,'acid',bottleShape,[0,15]);
 draggable(first,'rig','M-52 -11Q0 -25 52 -11L42 53Q0 65 -42 53Z',[0,20]);
 draggable(funnel.group,'funnel',funnel.geometry().d,[-26,220]);
 draggable(plate,'plate','M835 200L1010 219L920 261L737 237Z',[870,228]);
 draggable(jar,'jar','M799 228Q870 208 941 228V439Q870 459 799 439Z',[870,380]);
 draggable(collector,'outlet','M0 -140V40Q0 60 20 60H240Q260 60 260 40V10',[260,30]);
 const spare={};for(const id of ['peroxide','catalyst']){const g=n('g');const art=materialArt(id);art.setAttribute('x','-80');art.setAttribute('y','-70');art.setAttribute('width','160');art.setAttribute('height','140');g.append(art);draggable(g,id,id==='catalyst'?'M-58 -20Q0 -47 58 -20Q55 45 0 51Q-55 45 -58 -20Z':'M-18 -62H18V-36Q50 -27 50 0V54Q0 65 -50 54V0Q-50 -27 -18 -36Z',[0,0]);spare[id]=g;svg.lastChild.append(g);}
 const contact=n('path',{'data-desk-contact':'',fill:'#ffdf7033',stroke:'#a97710','stroke-width':3,'stroke-dasharray':'7 4','pointer-events':'none'});svg.append(contact);
 const hoseGrip=n('path',{'data-desk-drag-proxy':'outlet',fill:'none',stroke:'transparent','stroke-width':38});hoseGrip.style.pointerEvents='visibleStroke';rubber.append(hoseGrip);
 const anchor=(el,p)=>{el.dataset.anchorX=p.x;el.dataset.anchorY=p.y;};
 let hoseKey='';
 return{render(s){
  const has=id=>s.selected.includes(id);
  contact.setAttribute('visibility',s.contact?'visible':'hidden');if(s.contact)contact.setAttribute('d',regionPath(s.contact));
  for(const [id,nodes] of Object.entries({flask:[flask],marble:[bowl],tank:[tankBody,water,surface],jar:[jar,jarFront,jarWater,meniscus,sample]})){for(const el of nodes){el.setAttribute('visibility',has(id)?'visible':'hidden');el.style.display=has(id)?'':'none';}labels[id].setAttribute('visibility',has(id)?'visible':'hidden');nodes[0].dataset.deskApparatus=id;}
  for(const [id,el]of Object.entries(spare)){const pos=directPosition(s,id);el.setAttribute('visibility',has(id)?'visible':'hidden');el.setAttribute('transform',`translate(${pos.x} ${pos.y})`);anchor(el,pos);}
  const f=deskFrame(s),m=s.motion,p=f.progress,jp=jarPose(s),jt=`translate(${jp.x} ${jp.y}) rotate(${s.jarAngle} 870 330)`,sp=stonePose(s,f);
  svg.dataset.water=s.jarWater.toFixed(4);svg.dataset.collected=s.co2Volume.toFixed(4);svg.dataset.air=s.airVolume.toFixed(4);svg.dataset.reaction=String(f.reaction);svg.dataset.flow=String(f.flow);svg.dataset.collecting=String(f.collecting);svg.dataset.motion=f.motion;svg.dataset.angle=String(s.jarAngle);svg.dataset.tubeX=String(f.outlet.x);svg.dataset.tubeY=String(f.outlet.y);svg.dataset.sealed=String(s.jarCovered);
  flask.setAttribute('transform',`rotate(${sp?.angle||0} 300 579.7)`);liquid.setAttribute('d',liquidGeometry(flaskSurface(s)).d);liquid.setAttribute('opacity',s.acid+s.flaskWater>0?'1':'0');solidNodes.forEach((el,i)=>{el.setAttribute('visibility',i<s.flaskMarbles?'visible':'hidden');el.setAttribute('viewBox',crops[s.flaskStoneIds?.[i]??i].join(' '));});
  bowlStones.forEach((el,i)=>{const returning=f.motion==='return-stone'&&p>=.65,taken=(s.flaskStoneIds||Array.from({length:s.flaskMarbles},(_,i)=>i)).includes(i)||(i===(s.heldStoneId??s.flaskMarbles)&&s.heldMarble&&!returning)||(i===m?.index&&['pick-stone','place-stone'].includes(f.motion));el.setAttribute('visibility',taken?'hidden':'visible');});
  sourceBubbles.setAttribute('opacity',String(f.reactionStrength));[...sourceBubbles.children].forEach((b,i)=>{b.setAttribute('cx',235+i%6*24+Math.sin(s.time/450+i)*7);b.setAttribute('cy',575-((s.time/750+i*.13)%1)*Math.max(0,575-flaskSurface(s)));});
  const sy=waterSurface(s);water.setAttribute('d',`M580 ${sy}L1100 ${sy-18}V600H580Z`);surface.setAttribute('d',`M597 ${sy}L655 ${sy-38}L1050 ${sy-18}L1010 ${sy+20}Z`);water.setAttribute('opacity',s.tankWater>0?'1':'0');surface.setAttribute('opacity',s.tankWater>0?'1':'0');
  jar.setAttribute('transform',jt);jarFront.setAttribute('transform',jt);jarShape.setAttribute('transform',jt);
  // 保持水面水平，並以旋轉後的瓶內輪廓裁切，沒有伸出瓶外的方塊。
  const a=s.jarAngle*Math.PI/180,points=[[799,228],[820,218],[920,218],[941,228],[941,439],[920,449],[820,449],[799,439]].map(([x,y])=>({x:870+jp.x+(x-870)*Math.cos(a)-(y-330)*Math.sin(a),y:330+jp.y+(x-870)*Math.sin(a)+(y-330)*Math.cos(a)}));
  const ys=points.map(p=>p.y),top=Math.min(...ys),bottom=Math.max(...ys),level=mix(bottom,top,s.jarWater);jarWater.setAttribute('y',level);jarWater.setAttribute('height',Math.max(0,800-level));jarWater.setAttribute('opacity',s.jarWater>0?'1':'0');meniscus.setAttribute('d',`M${870+jp.x-170} ${level}Q${870+jp.x} ${level+5} ${870+jp.x+170} ${level}`);meniscus.setAttribute('opacity',s.jarWater>.005&&s.jarWater<.995?'1':'0');
  let pp=directPosition(s,'plate'),plateTransform='';
  if(f.motion==='cover')pp=line(m.toolStart||pp,jarMouth(s),p);
  if(f.motion==='uncover')pp=line(m.toolStart||jarMouth(s),m.endTool||parkPosition(s,'plate'),p);
  if(s.jarCovered&&!['uncover'].includes(f.motion)&&s.dragging?.id!=='plate')plateTransform=jt;
  else if(pp)plateTransform=`translate(${pp.x-870} ${pp.y-228})`;
  plate.setAttribute('visibility',s.jarCovered||s.positions.plate||['cover','uncover'].includes(f.motion)?'visible':'hidden');plate.setAttribute('opacity','1');plate.setAttribute('transform',plateTransform);if(pp)anchor(plate,pp);
  let rigPose={...rigPosition(s),angle:0},op=f.outlet,rigVisible=s.rig||!!s.positions.rig||f.motion==='rig'||f.motion==='remove-rig';if(!s.rig)op={x:rigPose.x+130,y:rigPose.y+55};
  if(f.motion==='rig'||f.motion==='remove-rig'){
   const start=m.toolStart||{x:500,y:50},end=f.motion==='rig'?{x:300,y:205}:m.endTool||{x:500,y:50};
   rigPose=p<.4?line(start,{x:start.x,y:-60},p/.4):p<.7?line({x:start.x,y:-60},{x:end.x,y:-60},(p-.4)/.3):line({x:end.x,y:-60},end,(p-.7)/.3);
   rigPose.angle=0;op={x:rigPose.x+130,y:rigPose.y+55};
  }
  first.setAttribute('transform',`translate(${rigPose.x} ${rigPose.y}) rotate(${rigPose.angle})`);first.setAttribute('visibility',rigVisible?'visible':'hidden');neckFront.setAttribute('visibility',has('flask')&&s.rig&&rigPose.y>185?'visible':'hidden');
  let fp=s.funnel?rigPose:looseFunnelPose(directPosition(s,'funnel'));const fv=s.funnel||!!s.positions.funnel||f.motion==='funnel'||(f.motion==='remove-rig'&&m.hasFunnel);
  if(f.motion==='funnel'){
   const start=m.toolStart||directPosition(s,'funnel'),base=m.rigAnchor||rigPose;
   // 長管任一段對孔後，先沿原位置抬高，再由孔口下降，避免管身穿過塞子。
   const above={x:base.x-26,y:base.y-30},end={x:base.x-26,y:base.y+350};
   const tip=p<.4?line(start,{x:start.x,y:above.y},p/.4):p<.55?line({x:start.x,y:above.y},above,(p-.4)/.15):line(above,end,(p-.55)/.45);
   fp=looseFunnelPose(tip);
  }
  if(f.motion==='remove-rig')fp=rigPose;
  const pouring=['acid','water'].includes(f.motion)&&p>.25&&p<.8;
  funnel.render(fp,pouring&&m.viaFunnel);
  // 插入長漏斗時平順拉遠，完整看見上端與管尖；結束後回到原比例。
  const cameraTop=fv&&['funnel','rig','remove-rig'].includes(f.motion)?Math.min(-100,funnel.mouth().y-5):-100,zoom=750/(650-cameraTop);
  art.setAttribute('transform',`translate(${550*(1-zoom)} ${-100-cameraTop*zoom}) scale(${zoom})`);funnel.group.setAttribute('visibility',fv?'visible':'hidden');
  anchor(first,rigPose);anchor(funnel.group,{x:+funnel.group.dataset.tipX,y:+funnel.group.dataset.tipY});anchor(jar,{x:870+jp.x,y:330+jp.y});anchor(collector,{x:op.x+260,y:op.y+10});first.dataset.installed=String(s.rig);funnel.group.dataset.installed=String(s.funnel);
  collector.setAttribute('transform',`translate(${op.x} ${op.y})`);collector.setAttribute('visibility',rigVisible?'visible':'hidden');rubber.setAttribute('visibility',rigVisible?'visible':'hidden');
  if(rigVisible){const rad=rigPose.angle*Math.PI/180,start={x:rigPose.x+146*Math.cos(rad)+70*Math.sin(rad),y:rigPose.y+146*Math.sin(rad)-70*Math.cos(rad)},key=[start.x,start.y,op.x,op.y].join('/');if(key!==hoseKey){hoseKey=key;const pts=taskHosePoints(start,{x:op.x,y:op.y-140});hoseGrip.setAttribute('d',pts.map((p,i)=>`${i?'L':'M'}${p.x} ${p.y}`).join(''));segments.forEach(({g,piece},i)=>{const a=pts[i],b=pts[i+1];g.setAttribute('transform',`translate(${a.x} ${a.y}) rotate(${Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI-90})`);piece.setAttribute('height',Math.hypot(b.x-a.x,b.y-a.y)+1);});}}
  const tip={x:f.outlet.x+260,y:f.outlet.y+10},inWater=s.rig&&f.flow&&tip.y>sy&&tip.x>595&&tip.x<1050,inside=f.collecting&&s.jarWater>.015,bubbleTop=inside?Math.max(level,top+8):sy;
  const overflowing=f.collecting&&s.jarWater<=.015;
  outletBubbles.setAttribute('opacity',String(inWater&&(!f.collecting||inside||overflowing)?f.reactionStrength:0));outletBubbles.dataset.location=inside?'jar':'tank';
  [...outletBubbles.children].forEach((b,i)=>{const origin=overflowing?{x:948,y:432}:tip;b.setAttribute('cx',origin.x+Math.sin(s.time/350+i)*4);b.setAttribute('cy',origin.y-((s.time/850+i*.14)%1)*Math.max(0,origin.y-bubbleTop));});
  forceps.setAttribute('visibility',sp?'visible':'hidden');movingStone.setAttribute('visibility',sp?.showRock?'visible':'hidden');if(sp){forceps.setAttribute('transform',`translate(${sp.tip.x} ${sp.tip.y}) rotate(-12)`);anchor(forceps,sp.tip);movingStone.setAttribute('viewBox',crops[(m?.index??s.heldStoneId??s.flaskMarbles)%5].join(' '));box(movingStone,[sp.rock.x-24,sp.rock.y-20,48,40]);}
  const isPour=['water','acid','put-away'].includes(f.motion),kind=f.motion==='put-away'?m.pourKind:f.motion;
  stream.setAttribute('visibility',pouring?'visible':'hidden');
  for(const id of ['water','acid']){
   const bottle=bottles[id],active=isPour&&kind===id;let lip=directPosition(s,id),angle=0;
   bottle.setAttribute('visibility',s.positions[id]||active?'visible':'hidden');
   bottle.toggleAttribute('data-desk-pour-bottle',active);
   if(active){
    const q=f.motion==='put-away'?m.stopAt:p,target=kind==='acid'||m.target==='flask'?(m.viaFunnel?{x:274,y:42}:{x:300,y:180}):m.target==='jar'?{x:jarMouth(s).x,y:jarMouth(s).y-25}:(m.pourAt||{x:1000,y:315}),start=m.toolStart||lip,end=m.endTool||parkPosition(s,id,m.target),enter=ease(q/.25),exit=ease((q-.8)/.2),away=f.motion==='put-away'?ease(p):0;
    lip={x:mix(mix(mix(start.x,target.x,enter),end.x,exit),end.x,away),y:mix(mix(mix(start.y,target.y,enter),end.y,exit),end.y,away)};angle=-65*enter*(1-exit)*(1-away);
    const dest=kind==='acid'||m.target==='flask'?(m.viaFunnel?{x:274,y:78}:{x:300,y:250}):m.target==='jar'?{x:target.x,y:Math.max(jarMouth(s).y+20,level)}:{x:target.x,y:Math.max(target.y+40,sy)};
    stream.setAttribute('d',`M${lip.x} ${lip.y}Q${lip.x+3} ${(lip.y+dest.y)/2} ${dest.x} ${dest.y}`);bottle.dataset.lipX=lip.x;bottle.dataset.lipY=lip.y;stream.dataset.startX=lip.x;stream.dataset.startY=lip.y;
   }
   const rad=angle*Math.PI/180,local={x:-75+116/500*150,y:-85+83/810*170};bottle.setAttribute('transform',`translate(${lip.x-local.x*Math.cos(rad)+local.y*Math.sin(rad)} ${lip.y-local.x*Math.sin(rad)-local.y*Math.cos(rad)}) rotate(${angle})`);anchor(bottle,lip);
  }
  if(s.funnel&&funnel.group.nextSibling!==first)art.insertBefore(funnel.group,first);
  if(s.rig&&neckFront.previousSibling!==first)art.insertBefore(neckFront,first.nextSibling);
  const chosen=({forceps,water:bottles.water,acid:bottles.acid,rig:first,funnel:funnel.group,plate,...spare})[s.tool];if(chosen&&art.lastChild!==chosen&&!(s.tool==='rig'&&s.rig)&&!(s.tool==='funnel'&&s.funnel))art.append(chosen);
  const mouth=jarMouth(s);spill.setAttribute('opacity',s.spilling?'1':'0');spill.setAttribute('d',`M${mouth.x} ${mouth.y}Q${mouth.x+15} ${mouth.y+45} ${mouth.x+10} ${Math.max(570,mouth.y+75)}`);
  labels.flask.setAttribute('transform','translate(300 620)');labels.marble.setAttribute('transform','translate(520 640)');labels.tank.setAttribute('transform','translate(1000 590)');labels.jar.setAttribute('transform',`translate(${870+jp.x} ${Math.max(...ys)+32})`);
  sample.textContent=s.sampleStarted?(s.airVolume>.01?'混有空氣':s.co2Volume>.98?'二氧化碳':'正在集氣'):'';sample.setAttribute('x',870+jp.x);sample.setAttribute('y',330+jp.y);sample.setAttribute('opacity',s.co2Volume>0||s.airVolume>0?'1':'0');
  return{jar:{x:870+jp.x,y:330+jp.y},flask:{x:300,y:410},marble:{x:520,y:560},tank:{x:1000,y:480},outlet:{x:op.x+260,y:op.y+10},funnel:{x:274,y:75}};
 }};
}
