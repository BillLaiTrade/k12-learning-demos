// The same six material textures remain on the same bench in every operation.
export const CO2_SETUP_DURATION=6200;
const unit=x=>Math.max(0,Math.min(1,x));
const ease=x=>{const t=unit(x);return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*t;
export function co2SetupFrame(elapsed){
 const time=Math.max(0,Math.min(CO2_SETUP_DURATION,elapsed));
 return {time,arrangement:ease((time-400)/4600),phase:time<400?'desk':time<5000?'arrange':'ready'};
}
const NS='http://www.w3.org/2000/svg',keys=['marble','acid','flask','jar','tube','plate'];
const working={flask:[70,145,460,460],jar:[640,145,460,460],marble:[460,365,170,170],acid:[460,180,170,170],tube:[440,500,180,150],plate:[630,505,130,120]};
const names={marble:'大理石',acid:'稀鹽酸',flask:'錐形瓶',jar:'集氣瓶',tube:'附塞玻璃導管',plate:'薄玻璃片'};
function svg(tag,attrs){const n=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);return n;}
export function createCO2Bench(panel,panels){
 const material=panels[0].querySelector('.co2-material-scene');
 const host=panels[1].querySelector('.co2-main-scene');
 const defs=host.querySelector('defs'),art=svg('g',{id:'co2-shared-bench','data-shared-bench':''}),bodies={},labels={};defs.append(art);
 for(const key of keys){
  const group=svg('g',{'data-bench-body':key}),image=svg('image',{href:`assets/co2-${key}.webp`,preserveAspectRatio:'xMidYMid meet'});
  group.append(image);art.append(group);bodies[key]={group,image};
  const label=svg('text',{'text-anchor':'middle',fill:'#41604c','font-weight':'600','data-bench-label':key});label.textContent=names[key];art.append(label);labels[key]=label;
 }
 const source=svg('svg',{'data-shared-materials':'',viewBox:'0 0 1100 650','aria-hidden':'true',preserveAspectRatio:'none'});source.append(svg('use',{href:'#co2-shared-bench'}));material.prepend(source);
 material.querySelectorAll('img').forEach(image=>{image.style.opacity='0';});
 // Keep the existing chemistry and flow overlays; replace only the apparatus
 // pictures with one shared set, so no second photographic scene can appear.
 for(const [index,view]of panels.entries()){
  if(!index)continue;
  const original=view.querySelector(`#co2-scene-${index}`);
  original.querySelectorAll('image[href="assets/co2-flask.webp"],image[href="assets/co2-jar.webp"]').forEach(n=>n.style.display='none');
  for(const canvas of view.querySelectorAll('.co2-main-scene,.co2-closeup svg')){
   const use=svg('use',{href:'#co2-shared-bench','data-shared-bench-use':'','aria-hidden':'true'});
   canvas.insertBefore(use,canvas.querySelector(':scope > g,:scope > use'));
  }
 }
 let current={},stage=0,lastFrame=null;
 const narrow=()=>panel.clientWidth<=510;
 function render(index,elapsed,f){
  stage=index;lastFrame={index,elapsed,f};
  const compact=narrow(),height=compact?1050:650,progress=index===0?0:index===1?co2SetupFrame(elapsed).arrangement:1;
  panel.dataset.setup=progress.toFixed(4);panel.dataset.bench='shared';
  panel.dataset.setupCaption=String(index!==1||progress>=.25);
  panel.style.setProperty('--co2-bench-ratio',`1100 / ${height}`);
  source.setAttribute('viewBox',`0 0 1100 ${height}`);
  const cameraY=compact?-150*progress:0;
  panels.forEach(view=>view.querySelector('.co2-main-scene')?.setAttribute('viewBox',`0 ${cameraY} 1100 ${height}`));
  keys.forEach((key,i)=>{
   const initial=compact?[70+(i%2)*550,Math.floor(i/2)*350,410,300]:[43+(i%3)*367,Math.floor(i/3)*325+10,280,280];
   const pose=initial.map((v,j)=>mix(v,working[key][j],progress));
   let visible=true;
   // Reagents leave the standby position only while they are being used.
   let angle=key==='tube'?90*progress:0,cx=pose[0]+pose[2]/2,cy=pose[1]+pose[3]/2;
   if(index===2&&key==='marble'){
    const pickup=f.localTime<3400?ease(f.localTime/700):1-ease((f.localTime-3400)/700);
    [305,70,210,155].forEach((v,j)=>pose[j]=mix(working.marble[j],v,pickup));
    angle=-28*pickup;cx=mix(545,305,pickup);cy=mix(450,140,pickup);
   }
   if(index===3&&key==='acid'){
    const pickup=f.localTime<4200?ease(f.localTime/700):1-ease((f.localTime-4200)/700);
    [202.5,171,230,210].forEach((v,j)=>pose[j]=mix(working.acid[j],v,pickup));
    angle=-120*pickup;cx=mix(545,300,pickup);cy=mix(265,190,pickup);
    visible=!(f.localTime>=700&&f.acid<1);
   }
   if(key==='tube'&&index===4){
    const carry=ease(f.seal/.5);[165,52,300,300].forEach((v,j)=>pose[j]=mix(working.tube[j],v,carry));
    angle=90*(1-carry);cx=pose[0]+pose[2]/2;cy=pose[1]+pose[3]/2;
    visible=1-ease((f.seal-.35)/.45)>.001;
   }else if(key==='tube'&&index>4)visible=false;
   if(key==='plate'&&index===7){
    const cover=f.cover;[730,155,289,85].forEach((v,j)=>pose[j]=mix(working.plate[j],v,cover));visible=cover<1;
   }
   const {image,group}=bodies[key];['x','y','width','height'].forEach((attr,j)=>image.setAttribute(attr,String(pose[j])));
   group.setAttribute('transform',`rotate(${angle} ${cx} ${cy})`);
   group.setAttribute('opacity',visible?String(key==='tube'&&index===4?1-ease((f.seal-.35)/.45):1):'0');
   const label=labels[key];label.setAttribute('x',String(pose[0]+pose[2]/2));label.setAttribute('y',String(mix(compact?Math.floor(i/2)*350+334:Math.floor(i/3)*325+309,working[key][1]+working[key][3]+20,progress)));
   label.setAttribute('font-size',compact?'40':'23');label.setAttribute('opacity',index===0?'0':String(1-progress));
   current[key]={pose,visible,angle,cx,cy};
  });
  if(index>0){
   const view=panels[index],part=key=>view.querySelector(`[data-co2-part="${key}"]`);
   const original=view.querySelector(`#co2-scene-${index}`);original.setAttribute('opacity',String(index===1?progress:1));
   // The connected pipe is not held over the flask in the placement/addition
   // screens. It first moves to the bottle neck in the sealing operation.
   for(const key of ['stopper','tube','tube-shine'])part(key).setAttribute('opacity',String(index<4?0:index===4?ease((f.seal-.35)/.45):1));
   if(index<=4)part('marble-dish').setAttribute('opacity','0');
   if(index===7)part('plate').setAttribute('opacity',String(f.cover));
   if(index===1){
    const pose=current.jar.pose,x=pose[0]+pose[2]/2,y=pose[1]+pose[3]*.55;
    view.querySelector('[data-observation-leader]').setAttribute('d',`M658 298L${x} ${y}`);
    for(const key of ['point','halo']){const n=view.querySelector(`[data-observation-${key}]`);n.setAttribute('cx',x);n.setAttribute('cy',y);}
    return progress===0?'從剛才的材料桌面開始，物品先保持原位':progress<1?'把同一只錐形瓶與直立集氣瓶移到工作位置，其餘材料留在旁邊':'錐形瓶與直立集氣瓶已定位，接著取用大理石；附塞導管仍放在旁邊';
   }
  }
  return null;
 }
 function target(key){
  if(stage===0)return null;
  if(key==='stopper')return stage<4?{visible:false}:null;
  if(key==='tube'&&stage>=4&&!current.tube.visible||key==='plate'&&stage===7)return null;
  if(!['flask','jar','marble','acid','tube','plate'].includes(key))return null;
  // During pouring the existing animated reagent carries the hit target.
  if(key==='acid'&&stage===3&&lastFrame.f.localTime>=700&&lastFrame.f.acid<1)return null;
  const item=current[key],p=item.pose;
  const rect=key==='flask'?[.2,.08,.6,.86]:key==='jar'?[.2,.12,.62,.82]:[.08,.1,.84,.8];
  const bounds=[p[0]+p[2]*rect[0],p[1]+p[3]*rect[1],p[2]*rect[2],p[3]*rect[3]];
  return {visible:item.visible,bounds,transform:`rotate(${item.angle} ${item.cx} ${item.cy})`,d:`M${bounds[0]} ${bounds[1]}h${bounds[2]}v${bounds[3]}h${-bounds[2]}Z`};
 }
 return {render,target};
}
