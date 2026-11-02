import {taskHosePoints} from './collection-task-model.mjs?v=transfer-1';
import {liquidGeometry} from './co2-model.mjs?v=transfer-1';
const NS='http://www.w3.org/2000/svg';
const n=(tag,attrs={})=>{const el=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))el.setAttribute(k,v);return el;};
const image=(file,box)=>{const el=n('image',{href:'assets/'+file,preserveAspectRatio:'none'});['x','y','width','height'].forEach((key,i)=>el.setAttribute(key,box[i]));return el;};
function sprite(file,crop,box,size){const el=n('svg',{viewBox:crop.join(' '),preserveAspectRatio:'none',overflow:'hidden'});['x','y','width','height'].forEach((key,i)=>el.setAttribute(key,box[i]));el.append(image(file,[0,0,...size]));return el;}
export function createCollectionScene(svg){
 const title=svg.querySelector('title');svg.replaceChildren(...(title?[title]:[]));
 const defs=n('defs'),art=n('g');svg.append(defs,art);art.append(image('oxygen-setup-table.png',[0,0,1100,650]));
 const flaskClip=n('clipPath',{id:'task-flask-inside'});flaskClip.append(n('path',{d:liquidGeometry(212.96).d}));defs.append(flaskClip);
 art.append(image('co2-flask.webp',[70,145,460,460]));
 const contents=n('g',{'clip-path':'url(#task-flask-inside)'}),liquid=n('path',{fill:'#b8dce2','fill-opacity':.32}),stones=n('g');contents.append(liquid,stones);art.append(contents);
 const crops=[[606,159,339,325],[1122,175,336,289],[114,635,345,298],[618,636,345,288],[1121,623,330,329]];
 const positions=[[235,545],[280,553],[326,551],[369,543],[303,525]];
 crops.forEach((crop,i)=>stones.append(sprite('co2-marble-atlas.png',crop,[positions[i][0]-25,positions[i][1]-22,50,45],[1536,1024])));
 const reflection=image('co2-flask.webp',[70,145,460,460]);reflection.setAttribute('opacity','.22');art.append(reflection);
 const first=n('g');first.append(sprite('co2-tube.webp',[85,45,172,350],[280.8,115,137.6,280],[440,440]),sprite('co2-tube.webp',[44,137,120,110],[248,179,104,78],[440,440]));art.append(first);
 const tankClip=n('clipPath',{id:'task-tank-inside'});tankClip.append(n('path',{d:'M597 377L655 336L1050 356L1043 517L1006 548L607 524Z'}));defs.append(tankClip);
 const tankWater=n('g',{'clip-path':'url(#task-tank-inside)'});tankWater.append(n('path',{d:'M597 405L655 367L1050 387L1043 517L1006 548L607 524Z',fill:'#9bd5df','fill-opacity':.4}),n('path',{d:'M597 405L655 367L1050 387L1010 425Z',fill:'#def7f6','fill-opacity':.5,stroke:'#91bac0','stroke-width':1}));art.append(tankWater);
 const jarPath='M799 228Q870 208 941 228V439Q870 459 799 439Z';
 const jarClip=n('clipPath',{id:'task-jar-inside'}),clipShape=n('path',{d:jarPath});jarClip.append(clipShape);defs.append(jarClip);
 const jarWater=n('rect',{x:760,y:150,width:230,height:350,fill:'#a7d6df','fill-opacity':.5,'clip-path':'url(#task-jar-inside)','data-task-jar-water':''});art.append(jarWater);
 const jar=n('g',{'data-task-jar':''});jar.append(image('co2-jar.webp',[700,160,340,340]));art.append(jar);art.append(jarWater);const jarFront=jar.cloneNode(true);jarFront.removeAttribute('data-task-jar');jarFront.setAttribute('opacity','.22');art.append(jarFront);
 art.append(sprite('oxygen-setup-sprites.png',[650,170,750,360],[580,310,480,270],[1686,933]));
 const tubePath='M0 -140V40Q0 60 20 60H240Q260 60 260 40V10';
 const collector=n('g',{'data-task-collector':''}),centerline=n('path',{d:tubePath,fill:'none',stroke:'none','data-task-glass-centerline':''});collector.append(centerline);art.append(collector);
 // Use the existing glass image across a fixed outline, retaining its highlights.
 const glassSegments=[];for(let i=0;i<90;i++){const g=n('g');const piece=sprite('co2-tube.webp',[98,250+i%14*8,22,12],[-7,0,14,10],[440,440]);g.append(piece);collector.append(g);glassSegments.push({g,piece});}
 const length=centerline.getTotalLength();glassSegments.forEach(({g,piece},i)=>{const a=centerline.getPointAtLength(length*i/90),b=centerline.getPointAtLength(length*(i+1)/90);g.setAttribute('transform',`translate(${a.x} ${a.y}) rotate(${Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI-90})`);piece.setAttribute('height',Math.hypot(b.x-a.x,b.y-a.y)+1);});
 const rubber=n('g'),rubberSegments=[];art.append(rubber);for(let i=0;i<64;i++){const g=n('g'),piece=sprite('co2-tools-atlas.png',[338,100+i*980/64,90,24],[-7,0,14,10],[1268,1241]);g.append(piece);rubber.append(g);rubberSegments.push({g,piece});}
 const bubbles=n('g',{fill:'#fff','fill-opacity':.8,stroke:'#7ca1a5','stroke-width':1,'clip-path':'url(#task-jar-inside)'});for(let i=0;i<6;i++)bubbles.append(n('circle',{cx:870,cy:400,r:3+i%3}));art.append(bubbles);
 const purge=n('g',{fill:'#fff',stroke:'#7ca1a5','stroke-width':1});for(let i=0;i<4;i++)purge.append(n('circle',{cx:690,cy:410-i*10,r:3}));art.append(purge);
 const plate=n('g',{'data-task-plate':''});plate.append(image('co2-plate.webp',[700,397,340,80]));art.append(plate);
 const preparationPlate=n('g',{'data-task-preparation-plate':''});preparationPlate.append(image('co2-plate.webp',[698.45,192.91,340,80]));art.append(preparationPlate);
 const gasLabel=n('text',{x:870,y:285,'text-anchor':'middle','font-size':22,fill:'#31584f','paint-order':'stroke',stroke:'#fff','stroke-width':4});gasLabel.textContent='二氧化碳';art.append(gasLabel);
 for(const[text,x,y]of[['反應瓶',300,620],['水槽',1005,590]]){const label=n('text',{x,y,'text-anchor':'middle','font-size':22,fill:'#31584f','paint-order':'stroke',stroke:'#fff','stroke-width':4});label.textContent=text;art.append(label);}
 const status=n('text',{x:870,y:150,'text-anchor':'middle','font-size':21,fill:'#31584f','paint-order':'stroke',stroke:'#fff','stroke-width':4,'data-task-scene-status':''});art.append(status);
 let hoseKey='';
 return {render(f,plan,elapsed=0){
  svg.dataset.angle=String(f.angle);svg.dataset.immersion=String(f.immersion);svg.dataset.tubeX=String(f.tubeX);svg.dataset.tubeY=String(f.tubeY);svg.dataset.water=f.water.toFixed(4);svg.dataset.collected=f.collected.toFixed(4);svg.dataset.step=f.step;svg.dataset.sealed=f.sealed.toFixed(4);
  const hasReactants=plan.materials?.includes('marble')&&plan.materials?.includes('acid');stones.setAttribute('opacity',hasReactants?Math.min(1,f.reaction*4):0);liquid.setAttribute('d',liquidGeometry(580-80*Math.max(0,(f.reaction-.25)/.75)).d);liquid.setAttribute('opacity',hasReactants?f.reaction:0);first.setAttribute('opacity',f.idle?'.45':Math.max(0,(f.reaction-.7)/.3));
  const dy=(1-f.immersion)*-85-f.lift*100,angle=f.angle,transform=`translate(0 ${dy}) rotate(${angle} 870 330)`;
  jar.setAttribute('transform',transform);jarFront.setAttribute('transform',transform);clipShape.setAttribute('transform',transform);
  const top=angle>90?201:228,bottom=angle>90?438:449,level=top+(bottom-top)*(1-f.water)+dy;
  jarWater.setAttribute('y',level);jarWater.setAttribute('height',Math.max(0,500+dy-level));jarWater.setAttribute('opacity',f.water>0?'1':'0');
  collector.setAttribute('transform',`translate(${f.tubeX} ${f.tubeY})`);
  const key=`${f.tubeX}/${f.tubeY}`;if(hoseKey!==key){hoseKey=key;const points=taskHosePoints({x:420,y:135},{x:f.tubeX,y:f.tubeY-140});rubberSegments.forEach(({g,piece},i)=>{const a=points[i],b=points[i+1];g.setAttribute('transform',`translate(${a.x} ${a.y}) rotate(${Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI-90})`);piece.setAttribute('height',Math.hypot(b.x-a.x,b.y-a.y)+1);});}
  collector.setAttribute('opacity',f.idle?'.65':Math.max(.2,f.reaction));rubber.setAttribute('opacity',f.idle?'.65':Math.max(.2,f.reaction));
  bubbles.setAttribute('opacity',f.collecting&&plan.outlet==='jar'?'1':'0');[...bubbles.children].forEach((b,i)=>b.setAttribute('cy',415-((elapsed/900+i*.16)%1)*Math.max(0,415-level)));
  purge.setAttribute('opacity',f.purging?'1':'0');[...purge.children].forEach((b,i)=>b.setAttribute('cy',415-((elapsed/750+i*.2)%1)*25));
  preparationPlate.setAttribute('opacity',f.preparationCover*(1-f.uncover));preparationPlate.setAttribute('transform',`translate(${f.uncover*170} ${dy}) rotate(${angle} 870 330)`);
  plate.setAttribute('opacity',f.sealed);plate.setAttribute('transform',`translate(${(1-f.sealed)*160} ${-f.lift*100})`);gasLabel.setAttribute('opacity',hasReactants?f.collected:0);gasLabel.setAttribute('y',285+dy);
  status.textContent=f.idle?'你的裝置安排':f.cover===1?'已在水下蓋片並取出':f.collected===1?'水已被逐漸排出':f.purging?'先在瓶外排氣':f.collecting?'正在排水收集':f.reaction>0?'準備收集二氧化碳':'';
 }};
}
