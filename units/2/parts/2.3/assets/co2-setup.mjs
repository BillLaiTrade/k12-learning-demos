// Every operation uses one bench, one camera and the same apparatus textures.
export const CO2_SETUP_DURATION=6200;
const unit=x=>Math.max(0,Math.min(1,x));
const ease=x=>{const t=unit(x);return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*t;
export function co2SetupFrame(elapsed){
 const time=Math.max(0,Math.min(CO2_SETUP_DURATION,elapsed));
 return {time,arrangement:ease((time-400)/4600),phase:time<400?'desk':time<5000?'arrange':'ready'};
}
const keys=['marble','acid','flask','jar','tube','plate'];
const initial={flask:[140,100,340,340],jar:[715,155,350,350],marble:[310,440,210,160],acid:[30,420,170,170],tube:[500,470,210,170],plate:[800,485,190,110]};
const working={flask:[70,145,460,460],jar:[640,145,460,460],marble:[455,405,170,170],acid:[455,240,150,170],tube:[440,500,180,150],plate:[630,505,130,120]};
const names={marble:'大理石',acid:'稀鹽酸',flask:'錐形瓶',jar:'集氣瓶',tube:'附塞玻璃導管',plate:'薄玻璃片'};
// The unlabelled open reagent bottle stays identical before, during and after pouring.
const texture=key=>key==='acid'?'oxygen-peroxide-open.webp':`co2-${key}.webp`;
export function co2BenchFrame(index,elapsed,f){
 const progress=index===0?0:index===1?co2SetupFrame(elapsed).arrangement:1;
 const bodies={};
 for(const key of keys){
  let pose=initial[key].map((v,j)=>mix(v,working[key][j],progress));
  let angle=key==='tube'?90*progress:0;
  if(index===2&&key==='marble'){
   const pickup=f.localTime<3400?ease(f.localTime/700):1-ease((f.localTime-3400)/700);
   pose=pose.map((v,j)=>mix(v,[220,80,210,155][j],pickup));angle=-28*pickup;
  }
  if(index===3&&key==='acid'){
   const pickup=f.localTime<4200?ease(f.localTime/700):1-ease((f.localTime-4200)/700);
   pose=pose.map((v,j)=>mix(v,[260,105,150,170][j],pickup));angle=-100*pickup;
  }
  if(key==='tube'&&index>=4){
   const carry=index===4?ease(f.seal):1;
   pose=working.tube.map((v,j)=>mix(v,[253,124,210,210][j],carry));angle=90*(1-carry);
  }
  if(key==='plate'&&index===7){
   pose=working.plate.map((v,j)=>mix(v,[730,184,289,60][j],f.cover));
   pose[1]-=130*Math.sin(Math.PI*f.cover);
  }
  bodies[key]={pose,angle:angle||0,cx:pose[0]+pose[2]/2,cy:pose[1]+pose[3]/2};
 }
 return {progress,bodies};
}
const NS='http://www.w3.org/2000/svg';
function node(tag,attrs={}){const n=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,String(v));return n;}
export function createCO2Bench(panel,panels){
 const host=panels[1].querySelector('.co2-main-scene');
 const art=node('g',{id:'co2-shared-bench','data-shared-bench':''});host.querySelector('defs').append(art);
 art.append(node('image',{href:'assets/oxygen-setup-table.png',x:0,y:0,width:1100,height:650,preserveAspectRatio:'none','data-bench-background':''}));
 const defs=node('defs');art.append(defs);
 const clip=node('clipPath',{id:'co2-bench-liquid-clip'});
 clip.append(node('path',{d:'M278 219H323V324L414 540Q435 580 300 582Q166 580 186 540L278 324Z'}));defs.append(clip);
 const liquids=node('g',{'clip-path':'url(#co2-bench-liquid-clip)'});
 const liquid=node('rect',{x:170,y:500,width:270,height:90,fill:'#b8dce2',opacity:0,'data-bench-liquid':''});
 const rocks=node('g',{fill:'#eee8da',stroke:'#aaa18e','stroke-width':2,'data-bench-rocks':''});
 for(let i=0;i<7;i++)rocks.append(node('path',{d:`M${210+i*26} 562l12 -13 16 9 -6 19 -21 -2Z`}));
 const bubbles=node('g',{fill:'#fff','fill-opacity':.65,stroke:'#91b6b4','stroke-width':1.4,'data-bench-bubbles':''});
 for(let i=0;i<6;i++)bubbles.append(node('circle',{cx:242+i*23,cy:550,r:3+i%3}));
 const bodies={};
 for(const key of ['flask','jar','marble','acid','tube','plate']){
  const group=node('g',{'data-bench-body':key}),image=node('image',{href:`assets/${texture(key)}`,preserveAspectRatio:'none'});
  group.append(image);art.append(group);bodies[key]={group,image};
  if(key==='flask'){liquids.append(liquid,rocks,bubbles);art.append(liquids);}
 }
 const pipe=node('path',{fill:'none',stroke:'#739d9e','stroke-width':12,'stroke-linecap':'round','stroke-linejoin':'round','data-bench-pipe':''});
 const shine=node('path',{fill:'none',stroke:'#e8ffff','stroke-width':6,'stroke-linecap':'round'});
 // Flow dashes explain direction; they are not the colour of CO2.
 const flow=node('path',{fill:'none',stroke:'#64836a','stroke-width':2,'stroke-dasharray':'7 14'});
 art.insertBefore(pipe,bodies.plate.group);art.insertBefore(shine,bodies.plate.group);art.insertBefore(flow,bodies.plate.group);
 const falling=node('g',{fill:'#eee8da',stroke:'#aaa18e','data-bench-falling':''});
 for(let i=0;i<4;i++)falling.append(node('path',{d:'M-6 -5L5 -7 9 4 -2 8 -8 2Z'}));
 const stream=node('path',{fill:'none',stroke:'#b9dce1','stroke-width':6,'stroke-linecap':'round','data-bench-stream':''});art.append(falling,stream);
 const air=node('g',{fill:'none',stroke:'#9c864c','stroke-width':3,'data-bench-air':''});
 for(const x of [774,980])air.append(node('path',{d:`M${x} 285V180m-8 12 8-12 8 12`}));art.append(air);
 const sample=node('g',{'data-bench-sample':''});sample.append(node('rect',{x:798,y:365,width:145,height:55,rx:8,fill:'#fffdf5',stroke:'#c6d2b9'}));
 const sampleText=node('text',{x:870,y:400,'text-anchor':'middle','font-size':24});sampleText.textContent='二氧化碳';sample.append(sampleText);art.append(sample);
 const labels={};for(const key of ['flask','jar']){const label=node('text',{'text-anchor':'middle','font-size':20,'data-bench-label':key});art.append(label);labels[key]=label;}
 const material=panels[0].querySelector('.co2-material-scene');
 const source=node('svg',{'data-shared-materials':'',viewBox:'0 0 1100 650','aria-hidden':'true',preserveAspectRatio:'none'});source.append(node('use',{href:'#co2-shared-bench'}));material.prepend(source);
 material.querySelectorAll('img').forEach(image=>{image.style.opacity='0';});
 for(const [index,view]of panels.entries()){
  if(!index)continue;
  // Source representatives remain accessible without JS, but never replace the live scene.
  view.querySelector(`#co2-scene-${index}`).style.display='none';
  for(const canvas of view.querySelectorAll('.co2-main-scene,.co2-closeup svg')){
   const use=node('use',{href:'#co2-shared-bench','data-shared-bench-use':'','aria-hidden':'true'});canvas.append(use);
  }
 }
 let current=null,stage=0,frame=null;
 function render(index,elapsed,f){
  stage=index;frame=f;current=co2BenchFrame(index,elapsed,f);
  const {progress}=current;panel.dataset.setup=progress.toFixed(4);panel.dataset.bench='shared';panel.dataset.setupCaption='true';
  panel.style.setProperty('--co2-bench-ratio','1100 / 650');
  const prior=[0,0,6900,11700,17300,21200,24700,31600];
  const time=prior[index]+elapsed;
  for(const key of keys){
   const {pose,angle,cx,cy}=current.bodies[key],{group,image}=bodies[key];
   ['x','y','width','height'].forEach((attr,j)=>image.setAttribute(attr,pose[j]));
   group.setAttribute('transform',`rotate(${angle} ${cx} ${cy})`);group.setAttribute('opacity','1');
   const button=material.querySelector(`[data-co2-material="${key}"]`),p=initial[key];
   button.style.cssText=`left:${p[0]/11}%;top:${p[1]/6.5}%;width:${p[2]/11}%;height:${p[3]/6.5}%`;
  }
  const level=580-80*f.acid;
  liquid.setAttribute('y',level);liquid.setAttribute('height',590-level);liquid.setAttribute('opacity',index>0&&f.acid>0?.32:0);
  rocks.setAttribute('opacity',index>0?f.marble:0);
  bubbles.setAttribute('opacity',index>0&&f.reacting?1:0);
  [...bubbles.children].forEach((b,i)=>b.setAttribute('cy',558-((time/1000+i*.17)%1)*Math.max(0,558-level-9)));
  const carry=index<4?0:index===4?ease(f.seal):1;
  const tipX=mix(449,f.tipX,carry),tipY=mix(191,f.tipY,carry);
  const path=`M449 191L${tipX} 191V${tipY}`;
  for(const n of [pipe,shine,flow]){n.setAttribute('d',path);n.setAttribute('opacity',carry);}
  flow.setAttribute('opacity',f.flow&&index>0?1:0);flow.style.strokeDashoffset=String(-time/35);
  falling.setAttribute('opacity',index===2&&f.localTime>=700&&f.marble<1?1:0);
  [...falling.children].forEach((p,i)=>p.setAttribute('transform',`translate(${300+Math.sin(i*3)*9} ${230+((elapsed/700+i*.23)%1)*330}) rotate(${i*33})`));
  stream.setAttribute('d',`M300 205Q290 265 300 ${level}`);stream.setAttribute('opacity',index===3&&f.localTime>=700&&f.acid<1?1:0);
  air.setAttribute('opacity',index===6?ease(f.insert):0);air.setAttribute('transform',`translate(0 ${-8*((time%1000)/1000)})`);
  sample.setAttribute('opacity',index===7?f.cover:0);
  for(const key of ['flask','jar']){
   labels[key].textContent=key==='flask'?(index<=1?'錐形瓶（空）':f.acid===0?'錐形瓶：大理石':'錐形瓶：大理石＋稀鹽酸'):'集氣瓶：瓶口朝上';
   labels[key].setAttribute('x',key==='flask'?300:870);labels[key].setAttribute('y',630);labels[key].setAttribute('opacity',index===0?0:progress);
  }
  if(index>0){
   panels[index].querySelector('.co2-main-scene').setAttribute('viewBox','0 0 1100 650');
   panels[index].querySelector('.co2-closeup svg').setAttribute('viewBox',index<=4?'120 80 410 530':'545 95 520 520');
  }
  if(index===1)return progress===0?'從剛才的材料桌面開始，物品先保持原位':progress<1?'把同一只錐形瓶與直立集氣瓶移到工作位置，其餘材料留在旁邊':'錐形瓶與直立集氣瓶已定位，接著取用大理石；附塞導管仍放在旁邊';
  return null;
 }
 function target(key){
  if(stage===0)return null;
  if(key==='stopper'){
   const item=current.bodies.tube,p=item.pose,b=[p[0]+p[2]*.12,p[1]+p[3]*.32,p[2]*.26,p[3]*.25];
   return {visible:stage>=4,bounds:b,stroke:false,transform:`rotate(${item.angle} ${item.cx} ${item.cy})`,d:`M${b[0]} ${b[1]}h${b[2]}v${b[3]}h${-b[2]}Z`};
  }
  if(key==='tube'&&stage>=4){
   const carry=stage===4?ease(frame.seal):1;
   if(carry>.99)return {visible:true,bounds:[449,155,450,400],stroke:true,transform:'',d:pipe.getAttribute('d')};
  }
  const item=current.bodies[key];if(!item)return {visible:false};
  const p=item.pose,r=key==='flask'?[.21,.08,.58,.84]:key==='jar'?[.2,.12,.62,.82]:[.08,.1,.84,.8];
  const b=[p[0]+p[2]*r[0],p[1]+p[3]*r[1],p[2]*r[2],p[3]*r[3]];
  const point=(x,y)=>`${p[0]+p[2]*x} ${p[1]+p[3]*y}`;
  const d=key==='flask'?`M${point(.42,.1)}H${p[0]+p[2]*.58}V${p[1]+p[3]*.31}L${point(.8,.82)}Q${point(.86,.94)} ${point(.5,.96)}Q${point(.14,.94)} ${point(.2,.82)}L${point(.42,.31)}Z`:key==='jar'?`M${point(.24,.16)}Q${point(.5,.08)} ${point(.76,.16)}V${p[1]+p[3]*.83}Q${point(.5,.95)} ${point(.24,.83)}Z`:`M${b[0]} ${b[1]}h${b[2]}v${b[3]}h${-b[2]}Z`;
  return {visible:true,bounds:b,stroke:false,transform:`rotate(${item.angle} ${item.cx} ${item.cy})`,d};
 }
 return {render,target};
}
