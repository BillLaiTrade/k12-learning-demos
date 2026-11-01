import {CO2_SETUP_DURATION,co2SetupFrame,CO2_OPERATIONS,co2BenchFrame,CO2_LIQUID_PROFILE,liquidGeometry,rubberGeometry,transformPoint} from './co2-model.mjs?v=five-detail-2';
export {CO2_SETUP_DURATION,co2SetupFrame,co2BenchFrame};
const NS='http://www.w3.org/2000/svg';
const atlas='assets/co2-marble-atlas.png';
// Equal atlas cells, cropped to the generated object's transparent silhouette.
const crops=[[40,152,473,324],[606,159,339,325],[1122,175,336,289],[114,635,345,298],[618,636,345,288],[1121,623,330,329]];
const keys=['marble','acid','flask','jar','tube','plate'];
function node(tag,attrs={}){const n=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,String(v));return n;}
function photo(key,box){const n=node('image',{href:`assets/${key}`,preserveAspectRatio:'none'});setBox(n,box);return n;}
function setBox(n,p){for(const [i,a] of ['x','y','width','height'].entries())n.setAttribute(a,p[i]);}
function sprite(cell,box){const n=node('svg',{viewBox:crops[cell].join(' '),preserveAspectRatio:'none',overflow:'hidden'});setBox(n,box);n.append(node('image',{href:atlas,width:1536,height:1024}));return n;}
const matrix=p=>`translate(${p.x} ${p.y}) rotate(${p.angle||0})`;
const polygon=ps=>ps.map((p,i)=>`${i?'L':'M'}${p.x} ${p.y}`).join('')+'Z';
const firstLocal=[{x:0,y:186},{x:0,y:-45},{x:0,y:-70},{x:25,y:-70},{x:120,y:-70}];
const firstPath='M0 186V-45Q0 -70 25 -70H120';
const plateBox=p=>[p.x-222/440*340,p.y-237/440*80,340,80];
const plateCorners=p=>[[145,136],[405,177],[340,349],[44,291]].map(([x,y])=>({x:plateBox(p)[0]+x*340/440,y:plateBox(p)[1]+y*80/440}));
const stopperOutline='M-50 -15Q0 -33 50 -15L40 45Q0 58 -40 45Z';
export function createCO2Bench(panel,panels){
 // Definitions live outside all hidden panels, so Chromium retains liquid clips.
 const resources=node('svg',{class:'co2-paint-resources',width:0,height:0,'aria-hidden':'true',focusable:'false'}),defs=node('defs');resources.append(defs);panel.prepend(resources);
 const art=node('g',{id:'co2-shared-bench','data-shared-bench':''});defs.append(art);
 const flaskClip=node('clipPath',{id:'co2-live-flask-inside',clipPathUnits:'userSpaceOnUse'});flaskClip.append(node('path',{d:polygon(CO2_LIQUID_PROFILE)}));defs.append(flaskClip);
 const stopperClip=node('clipPath',{id:'co2-live-stopper-shape'});stopperClip.append(node('path',{d:stopperOutline}));defs.append(stopperClip);
 const glassClip=node('clipPath',{id:'co2-photo-glass-clip'});glassClip.append(node('path',{d:'M-11 190V-45Q-11 -81 25 -81H125V-59H25Q11 -59 11 -45V190Z'}));defs.append(glassClip);
 const bowlFrontClip=node('clipPath',{id:'co2-live-dish-front'});bowlFrontClip.append(node('rect',{x:-115,y:33,width:230,height:50}));defs.append(bowlFrontClip);
 art.append(photo('oxygen-setup-table.png',[0,0,1100,650]));art.lastChild.dataset.benchBackground='';
 const bodies={};
 const flask=node('g',{'data-bench-body':'flask'}),flaskImage=photo('co2-flask.webp',[70,145,460,460]);flask.append(flaskImage);art.append(flask);bodies.flask={group:flask,image:flaskImage};
 const jar=node('g',{'data-bench-body':'jar'}),jarImage=photo('co2-jar.webp',[705,250,330,330]);jar.append(jarImage);art.append(jar);bodies.jar={group:jar,image:jarImage};
 const bowl=node('g',{'data-bench-body':'marble'});bowl.append(sprite(0,[-110,-74,220,148]));art.append(bowl);
 const liquidLayer=node('g',{'clip-path':'url(#co2-live-flask-inside)'}),liquid=node('path',{fill:'#b8dce2','fill-opacity':.30,'data-bench-liquid':''}),surface=node('ellipse',{fill:'#ddf4f4','fill-opacity':.4,stroke:'#99bbbd','stroke-width':1,'data-bench-meniscus':''});liquidLayer.append(liquid,surface);art.append(liquidLayer);
 const bubbleLayer=node('g',{'clip-path':'url(#co2-live-flask-inside)','data-bench-bubbles':'',fill:'#fff','fill-opacity':.75,stroke:'#93b8b6','stroke-width':1.2});
 for(let i=0;i<7;i++)bubbleLayer.append(node('circle',{cx:228+i*23,cy:540,r:2.5+i%3}));art.append(bubbleLayer);
 const stones=[];
 for(let id=0;id<5;id++){
  const wrapper=node('g',{'data-marble-stone':id}),body=node('g');body.append(sprite(id+1,[-25,-22.5,50,45]));wrapper.append(body);art.append(wrapper);stones.push({wrapper,body});
 }
 const forceps=node('g',{'data-bench-forceps':''});const forcepsPhoto=node('svg',{viewBox:'842 35 110 1155',x:-20,y:-314,width:40,height:300,preserveAspectRatio:'none',overflow:'hidden'});forcepsPhoto.append(node('image',{href:'assets/co2-tools-atlas.png',width:1268,height:1241}));forceps.append(forcepsPhoto);art.append(forceps);
 const flaskFront=node('g',{opacity:.22,'data-flask-reflection':''});flaskFront.append(photo('co2-flask.webp',[70,145,460,460]));art.append(flaskFront);
 const bowlFront=node('g');const clipped=node('g',{'clip-path':'url(#co2-live-dish-front)'});clipped.append(sprite(0,[-110,-74,220,148]));bowlFront.append(clipped);art.append(bowlFront);
 const acid=node('g',{'data-bench-body':'acid'}),acidImage=photo('oxygen-peroxide-open.webp',[455,240,150,170]);acid.append(acidImage);art.append(acid);bodies.acid={group:acid,image:acidImage};
 const stream=node('path',{fill:'none',stroke:'#bfdde0','stroke-width':6,'stroke-linecap':'round','data-bench-stream':''});art.append(stream);
 const rig=node('g',{'data-bench-body':'tube','data-rigid-glass':'first'});
 rig.append(node('path',{d:firstPath,fill:'none',stroke:'none','data-glass-centerline':''}));
 const glassPhoto=node('svg',{viewBox:'85 45 172 350',x:-19.2,y:-90,width:137.6,height:280,preserveAspectRatio:'none',overflow:'hidden'});glassPhoto.append(node('image',{href:'assets/co2-tube.webp',width:440,height:440}));const clippedGlass=node('g',{'clip-path':'url(#co2-photo-glass-clip)'});clippedGlass.append(glassPhoto);rig.append(clippedGlass);
 const stopper=node('g',{'clip-path':'url(#co2-live-stopper-shape)','data-bench-stopper':''});
 const cork=node('svg',{viewBox:'44 137 120 110',x:-52,y:-26,width:104,height:78,preserveAspectRatio:'none',overflow:'hidden'});cork.append(node('image',{href:'assets/co2-tube.webp',width:440,height:440}));stopper.append(cork);rig.append(stopper);art.append(rig);
 const hose=node('path',{fill:'none',stroke:'#735c38','stroke-opacity':.15,'stroke-width':15,'stroke-linecap':'round','data-rubber-tube':''}),hoseTexture=node('g',{'data-rubber-texture':''});art.append(hose,hoseTexture);const rubberSegments=[];
 for(let i=0;i<64;i++){const g=node('g'),strip=node('svg',{x:-7,y:-.5,width:14,height:10,viewBox:`338 ${100+i*980/64} 90 24`,preserveAspectRatio:'none',overflow:'hidden'});strip.append(node('image',{href:'assets/co2-tools-atlas.png',width:1268,height:1241}));g.append(strip);hoseTexture.append(g);rubberSegments.push({g,strip});}
 const rod=node('g',{'data-rigid-glass':'collector'});rod.append(node('path',{d:'M0 -260V0',fill:'none',stroke:'none','data-bench-pipe':''}));const rodPhoto=node('svg',{viewBox:'98 250 22 142',x:-8,y:-260,width:16,height:260,preserveAspectRatio:'none',overflow:'hidden'});rodPhoto.append(node('image',{href:'assets/co2-tube.webp',width:440,height:440}));rod.append(rodPhoto);art.append(rod);
 const lipClip=node('clipPath',{id:'co2-lip-front'});lipClip.append(node('path',{d:'M243 204Q300 222 357 204L356 208Q300 225 244 208Z'}));defs.append(lipClip);const lip=node('g',{'clip-path':'url(#co2-lip-front)',opacity:0,'data-stopper-lip':''});lip.append(photo('co2-flask.webp',[70,145,460,460]));art.append(lip);
 const flowPaths=[node('path',{d:firstPath}),node('path'),node('path',{d:'M0 -260V0'})];
 for(const f of flowPaths){f.setAttribute('fill','none');f.setAttribute('stroke','#759379');f.setAttribute('stroke-width','2');f.setAttribute('stroke-dasharray','6 16');}
 rig.append(flowPaths[0]);art.append(flowPaths[1]);rod.append(flowPaths[2]);
 const plate=node('g',{'data-bench-body':'plate'}),plateImage=photo('co2-plate.webp',plateBox({x:930,y:560}));plate.append(plateImage);art.append(plate);
 const air=node('g',{fill:'none',stroke:'#9c864c','stroke-width':3,'data-bench-air':''});for(const x of [804,941])air.append(node('path',{d:`M${x} 330V260m-7 10 7-10 7 10`}));art.append(air);
 const sample=node('g',{'data-bench-sample':''});sample.append(node('rect',{x:808,y:384,width:124,height:45,rx:7,fill:'#fffdf5',stroke:'#c6d2b9'}));const sampleText=node('text',{x:870,y:413,'text-anchor':'middle','font-size':21});sampleText.textContent='二氧化碳';sample.append(sampleText);art.append(sample);
 const labels={};for(const [key,x,y]of[['flask',300,623],['jar',870,608]]){const label=node('text',{x,y,'text-anchor':'middle','font-size':19,'data-bench-label':key});art.append(label);labels[key]=label;}
 const material=panels[0].querySelector('.co2-material-scene');
 const source=node('svg',{'data-shared-materials':'',viewBox:'0 0 1100 650','aria-hidden':'true',preserveAspectRatio:'none'});source.append(node('use',{href:'#co2-shared-bench'}));material.prepend(source);material.querySelectorAll('img').forEach(image=>image.style.opacity='0');
 const extraTube=document.createElement('button');extraTube.type='button';extraTube.dataset.co2MaterialAlt='tube';extraTube.tabIndex=-1;extraTube.setAttribute('aria-label','玻璃導管與橡皮管');extraTube.setAttribute('aria-haspopup','dialog');extraTube.style.cssText='position:absolute;left:92.5%;top:56%;width:4%;height:42%;min-width:0;min-height:0;background:transparent;border:0;padding:0';material.append(extraTube);
 for(const [index,view]of panels.entries())if(index){
  view.querySelector(`#co2-scene-${index}`).style.display='none';
  for(const canvas of view.querySelectorAll('.co2-main-scene,.co2-closeup svg'))canvas.append(node('use',{href:'#co2-shared-bench','data-shared-bench-use':'','aria-hidden':'true'}));
 }
 const materialBoxes={flask:[140,100,340,340],jar:[715,155,350,350],acid:[30,420,170,170],marble:[280,446,220,148],tube:[490,390,240,250],plate:[738,500,270,110]};
 let current,frame,stage=0,lastHoseKey='',hoseShape=null;
 function render(index,elapsed,f){
  stage=index;frame=f;current=co2BenchFrame(index,elapsed,f);const {bodies:state,bowl:bp,glass,plate:pp}=current;
  panel.dataset.bench='shared';panel.dataset.setup=f.placement.toFixed(4);panel.dataset.setupCaption='true';panel.style.setProperty('--co2-bench-ratio','1100 / 650');
  for(const key of ['flask','jar','acid']){
   const p=state[key],body=bodies[key];setBox(body.image,p.box);body.group.setAttribute('transform',`rotate(${p.angle} ${p.cx} ${p.cy})`);body.group.setAttribute('opacity',p.visible?'1':'0');
  }
  setBox(flaskFront.firstChild,state.flask.box);const flaskRotation=`rotate(${state.flask.angle} ${state.flask.cx} ${state.flask.cy})`;flaskFront.setAttribute('transform',flaskRotation);flaskClip.firstChild.setAttribute('transform',flaskRotation);lip.setAttribute('opacity',f.seal===1?'.75':'0');
  forceps.setAttribute('transform',matrix(current.tool));forceps.setAttribute('opacity',current.tool.visible?'1':'0');forceps.dataset.gripping=String(current.tool.gripping);
  const dishVisible=bp.x+110>0;bowl.setAttribute('transform',matrix(bp));bowlFront.setAttribute('transform',matrix(bp));bowl.setAttribute('opacity',dishVisible?'1':'0');bowlFront.setAttribute('opacity',dishVisible?'1':'0');
  for(const p of current.stones){const {wrapper,body}=stones[p.id];wrapper.dataset.stoneLocation=p.location;wrapper.setAttribute('clip-path',p.inside?'url(#co2-live-flask-inside)':'none');body.setAttribute('transform',matrix(p));}
  const level=580-80*f.acid,water=liquidGeometry(level);liquid.setAttribute('d',f.acid?water.d:'');surface.setAttribute('cx',(water.left+water.right)/2);surface.setAttribute('cy',level);surface.setAttribute('rx',(water.right-water.left)/2);surface.setAttribute('ry','5');surface.setAttribute('opacity',f.acid?'1':'0');
  const prior=CO2_OPERATIONS.slice(1,index).reduce((s,op)=>s+op.duration+700,0),time=prior+elapsed;
  bubbleLayer.setAttribute('opacity',f.reacting?'1':'0');[...bubbleLayer.children].forEach((b,i)=>b.setAttribute('cy',552-((time/1000+i*.17)%1)*Math.max(0,552-level-8)));
  stream.setAttribute('d',`M${current.acidMouth.x} ${current.acidMouth.y}Q301 195 300 215Q293 300 300 ${level}`);stream.dataset.originX=String(current.acidMouth.x);stream.dataset.originY=String(current.acidMouth.y);stream.setAttribute('opacity',index===2&&f.localTime>=700&&f.acid<1?'1':'0');
  rig.setAttribute('transform',matrix(glass.first));rod.setAttribute('transform',matrix(glass.rod));
  const hoseKey=JSON.stringify([glass.firstConnector,glass.rodConnector,glass.bendAngle]);if(hoseKey!==lastHoseKey){hoseShape=rubberGeometry(glass.firstConnector,glass.rodConnector,glass.bendAngle);lastHoseKey=hoseKey;
   const {a,b,c,d}=hoseShape,at=t=>{const u=1-t;return {x:u*u*u*a.x+3*u*u*t*c.x+3*u*t*t*d.x+t*t*t*b.x,y:u*u*u*a.y+3*u*u*t*c.y+3*u*t*t*d.y+t*t*t*b.y};};
   for(let i=0;i<64;i++){const start=at(i/64),end=at((i+1)/64),piece=rubberSegments[i];piece.g.setAttribute('transform',`translate(${start.x} ${start.y}) rotate(${Math.atan2(end.y-start.y,end.x-start.x)*180/Math.PI-90})`);piece.strip.setAttribute('height',Math.hypot(end.x-start.x,end.y-start.y)+1);}
  }
  for(const h of [hose,flowPaths[1]])h.setAttribute('d',hoseShape.dPath);hose.dataset.arcLength=hoseShape.length.toFixed(3);
  for(const path of flowPaths){path.setAttribute('opacity',f.flow?'1':'0');path.style.strokeDashoffset=String(-time/35);}
  setBox(plateImage,plateBox(pp));plate.dataset.cover=String(f.cover);air.setAttribute('opacity',f.collecting?'1':'0');air.setAttribute('transform',`translate(0 ${-6*((time%1000)/1000)})`);sample.setAttribute('opacity',f.labeled?'1':'0');
  labels.flask.textContent=f.flaskCount===0&&f.dishCount===5?'錐形瓶（空）':f.acid===0?'錐形瓶：大理石':'錐形瓶：大理石＋稀鹽酸';labels.jar.textContent='集氣瓶：瓶口朝上';for(const label of Object.values(labels))label.setAttribute('opacity',index===0?'0':String(f.placement));
  for(const key of keys){const [x,y,w,h]=materialBoxes[key],button=material.querySelector(`[data-co2-material="${key}"]`);button.style.cssText=`left:${x/11}%;top:${y/6.5}%;width:${w/11}%;height:${h/6.5}%`;}
  if(index){panels[index].querySelector('.co2-main-scene').setAttribute('viewBox','0 0 1100 650');panels[index].querySelector('.co2-closeup svg').setAttribute('viewBox',index<=3?'120 100 440 530':'555 195 520 420');}
  if(index===1)return f.localTime<4000?'把錐形瓶與直立集氣瓶移到工作位置，接著加入大理石':f.flaskCount<5?'錐形瓶略微傾斜，用鑷子逐塊輕放，讓大理石沿內壁滑入':dishVisible?'大理石已加入，將不再使用的空碟移開':'大理石已加入，接著倒入稀鹽酸';
  if(index===2)return f.acid<1?'將試藥瓶瓶口靠近錐形瓶口，讓稀鹽酸由瓶口緩緩流入':state.acid.visible?'加入完成，將不再使用的試藥瓶移開':'稀鹽酸已加入，接著塞緊連接導管的塞子';
  if(index===3)return f.seal<1?'將固定形狀的玻璃管與塞子整組移到瓶口並塞緊；中間橡皮管可彎曲':'塞子已貼合瓶口；玻璃管長度不變，氣體由瓶外出口送出';
  if(index===4)return '先在集氣瓶外排出裝置原有空氣與起始混合氣';
  if(index===5)return f.collecting?'二氧化碳由瓶底附近進入，原有空氣由瓶口向上離開':'先抬起固定長度的集氣玻璃管，越過瓶口，再放到瓶底附近';
  if(index===6)return f.localTime<4300?'將玻璃管整根抬起移出瓶口，保持出口暢通':f.cover<1?'導管已移出，將玻璃片平放並完整蓋住瓶口':'玻璃片已貼合並完整覆蓋瓶口，標示二氧化碳，保持直立';
  return null;
 }
 function target(key){
  if(stage===0)return null;
  if(key==='forceps')return {visible:current.tool.visible,bounds:[-20,-314,40,300],d:'M-20 -314H20V-14H-20Z',transform:matrix(current.tool),stroke:false};
  if(key==='tube'){
   const g=current.glass,ps=firstLocal.map(p=>transformPoint(p,g.first)),end=transformPoint({x:0,y:-260},g.rod),tip=g.rodTip;
   const first=`M${ps[0].x} ${ps[0].y}L${ps[1].x} ${ps[1].y}Q${ps[2].x} ${ps[2].y} ${ps[3].x} ${ps[3].y}L${ps[4].x} ${ps[4].y}`;
   return {visible:true,bounds:[0,0,1100,650],stroke:true,transform:'',d:first+`M${end.x} ${end.y}L${tip.x} ${tip.y}`+hoseShape.dPath};
  }
  if(key==='stopper')return {visible:true,bounds:[-52,-26,104,84],d:stopperOutline,transform:matrix(current.glass.first),stroke:false};
  if(key==='plate'){const ps=plateCorners(current.plate);return {visible:true,bounds:[plateBox(current.plate)[0],plateBox(current.plate)[1],340,80],d:polygon(ps),transform:'',stroke:false};}
  if(key==='marble')return {visible:current.bowl.x+110>0,bounds:[-110,-74,220,148],d:'M-108 -15Q-110 -70 0 -70Q110 -70 108 -15V35Q0 88 -108 35Z',transform:matrix(current.bowl),stroke:false};
  const b=current.bodies[key];if(!b)return {visible:false};const [x,y,w,h]=b.box;
  const p=(u,v)=>`${x+w*u} ${y+h*v}`;
  const d=key==='flask'?`M${p(.42,.1)}H${x+w*.58}V${y+h*.31}L${p(.8,.82)}Q${p(.86,.94)} ${p(.5,.96)}Q${p(.14,.94)} ${p(.2,.82)}L${p(.42,.31)}Z`:key==='jar'?`M${p(.24,.16)}Q${p(.5,.08)} ${p(.76,.16)}V${y+h*.83}Q${p(.5,.95)} ${p(.24,.83)}Z`:`M${p(.1,.1)}h${w*.8}v${h*.8}h${-w*.8}Z`;
  return {visible:b.visible,bounds:b.box,stroke:false,transform:`rotate(${b.angle} ${b.cx} ${b.cy})`,d};
 }
 return {render,target};
}
