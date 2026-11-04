import {svgNode as n,createThistleFunnel,createDoubleStopper} from './thistle-apparatus.mjs?v=b-decisions-20261104';
import {liquidGeometry} from './co2-model.mjs?v=reaudit-20261103-2';
const image=(file,x,y,width,height)=>n('image',{href:'assets/'+file,x,y,width,height,preserveAspectRatio:'none'});
function sprite(file,crop,box,size){const s=n('svg',{viewBox:crop.join(' '),x:box[0],y:box[1],width:box[2],height:box[3],preserveAspectRatio:'none',overflow:'hidden'});s.append(image(file,0,0,...size));return s;}
function bench(svg){svg.replaceChildren();const defs=n('defs');svg.append(defs,image('oxygen-setup-table.png',0,0,1536,860));return defs;}
export function createSplintScene(svg){
 const defs=bench(svg),samples=[];
 for(const[key,cx]of[['oxygen',405],['co2',1130]]){
  const sample=n('g',{'data-sample':key,class:'property-sample',role:'img','aria-label':key==='oxygen'?'已收集的氧氣樣本':'已收集的二氧化碳樣本'});
  sample.append(sprite('oxygen-setup-sprites.png',[1425,75,215,465],[cx-135,320,270,480],[1686,933]));
  const glow=n('radialGradient',{id:'properties-ember-'+key});for(const[offset,color,opacity]of[[0,'#fff0a0',1],[.35,'#ff9b36',1],[.7,'#bd4b22',.8],[1,'#df702e',0]])glow.append(n('stop',{offset,'stop-color':color,'stop-opacity':opacity}));defs.append(glow);
  const wood=n('g',{class:'oxygen-splint','data-splint':''});wood.append(image('oxygen-charred-wood.webp',cx-16,-160,32,440));
  const ember=n('ellipse',{class:'oxygen-ember',cx,cy:272,rx:10,ry:5,fill:`url(#properties-ember-${key})`});wood.append(ember);
  const flame=n('g',{class:'oxygen-flame',opacity:0});let flameShape=null,distortion=null;
  if(key==='oxygen'){
   const filter=n('filter',{id:'properties-fire-warp',x:'-25%',y:'-15%',width:'150%',height:'130%','color-interpolation-filters':'sRGB'});const noise=n('feTurbulence',{type:'fractalNoise',baseFrequency:'.035 .022',numOctaves:2,seed:8,result:'heat'});distortion=n('feDisplacementMap',{in:'SourceGraphic',in2:'heat',scale:3,xChannelSelector:'R',yChannelSelector:'G'});filter.append(noise,distortion);defs.append(filter);
   flameShape=n('g',{'data-flame-shape':'',filter:'url(#properties-fire-warp)'});flameShape.append(image('properties-real-flame.webp',cx-55,72,110,222));flame.append(flameShape);
  }
  wood.append(flame);sample.append(wood);svg.append(sample);
  samples.push({key,cx,sample,wood,ember,flame,flameShape,distortion});
 }
 return{render(f){svg.dataset.inserted=f.inserted.toFixed(4);for(const s of samples){s.wood.setAttribute('transform',`translate(0 ${230*f.inserted})`);s.ember.setAttribute('opacity',(s.key==='oxygen'?1:1-f.fading).toFixed(4));s.flame.setAttribute('opacity',s.key==='oxygen'?String(f.ignition):'0');if(s.key==='oxygen'){
  const t=f.time/1000,wave=Math.sin(t*19)*.045+Math.sin(t*31+1.7)*.025+Math.sin(t*8.3)*.04,sway=Math.sin(t*7.3)*1.4+Math.sin(t*17)*.6;
  s.flame.setAttribute('transform',`translate(${s.cx} 272) scale(${.65+.35*f.ignition} ${.55+.45*f.ignition}) translate(${-s.cx} -272)`);
  s.flameShape.setAttribute('transform',`translate(${s.cx} 272) skewX(${sway}) scale(${1-wave*.6} ${1+wave}) translate(${-s.cx} -272)`);s.flameShape.setAttribute('opacity',String(.92+Math.sin(t*23)*.05));s.distortion.setAttribute('scale',String(3+Math.sin(t*14)*1.4+Math.sin(t*27)*.6));
 }s.sample.setAttribute('aria-label',(s.key==='oxygen'?'氧氣':'二氧化碳')+'：'+(f.phase==='ready'?'帶餘燼木條尚未放入':f.phase==='result'?(s.key==='oxygen'?'木條復燃':'餘燼變暗，未復燃'):'觀察木條的變化'));}},resize(narrow){svg.setAttribute('viewBox',narrow?'190 150 840 710':'0 150 1536 710');samples[1].sample.setAttribute('transform',narrow?'translate(-350 0)':'');}};
}
const stoneCrops=[[606,159,339,325],[1122,175,336,289],[114,635,345,298],[618,636,345,288],[1121,623,330,329]];
export function createLimewaterScene(svg){
 const defs=bench(svg),source=n('g',{'data-lime-source':'',transform:'translate(105 110) scale(1.05)'});
 const flaskInside=n('clipPath',{id:'properties-source-inside'});flaskInside.append(n('path',{d:liquidGeometry(212.96).d}));defs.append(flaskInside);
 source.append(image('co2-flask.webp',70,145,460,460));
 const content=n('g',{'clip-path':'url(#properties-source-inside)'});const sourceLiquid=liquidGeometry(500);content.append(n('path',{d:sourceLiquid.d,fill:'#c5e7eb','fill-opacity':.28}),n('ellipse',{cx:(sourceLiquid.left+sourceLiquid.right)/2,cy:500,rx:(sourceLiquid.right-sourceLiquid.left)/2,ry:5,fill:'#ddf4f4','fill-opacity':.35,stroke:'#91b7bc','stroke-width':1.5}));
 [[220,555],[320,555],[367,548],[315,525],[367,520]].forEach(([x,y],i)=>content.append(sprite('co2-marble-atlas.png',stoneCrops[i],[x-25,y-23,50,46],[1536,1024])));
 const sourceBubbles=n('g',{'data-lime-source-bubbles':'',fill:'#fff','fill-opacity':.8,stroke:'#7ca5a9','stroke-width':1.5});for(let i=0;i<6;i++)sourceBubbles.append(n('circle',{cx:245+i*20,cy:550,r:3+i%3}));content.append(sourceBubbles);source.append(content);
 const funnel=createThistleFunnel('properties-source',{top:-140,tip:350,port:-26});funnel.render({x:300,y:205,angle:0},false);source.append(funnel.group);
 const glassClip=n('clipPath',{id:'properties-source-glass'});glassClip.append(n('path',{d:'M15 195V-48Q15 -84 52 -84H150V-57H52Q37 -57 37 -45V195Z'}));defs.append(glassClip);
 const rig=n('g',{transform:'translate(300 205)'}),glass=n('g',{'clip-path':'url(#properties-source-glass)'});glass.append(sprite('co2-tube.webp',[85,45,172,350],[6.8,-90,137.6,280],[440,440]));rig.append(glass,createDoubleStopper());source.append(rig);svg.append(source);
 // A fixed textured hose joins the source to a fixed glass inlet; neither stretches.
 const a={x:573.3,y:251.75},b={x:910,y:290},c={x:690,y:251.75},d={x:810,y:310};
 const at=t=>{const u=1-t;return{x:u*u*u*a.x+3*u*u*t*c.x+3*u*t*t*d.x+t*t*t*b.x,y:u*u*u*a.y+3*u*u*t*c.y+3*u*t*t*d.y+t*t*t*b.y};};
 const hose=n('g',{'data-lime-hose':''});for(let i=0;i<48;i++){const p=at(i/48),q=at((i+1)/48),g=n('g',{transform:`translate(${p.x} ${p.y}) rotate(${Math.atan2(q.y-p.y,q.x-p.x)*180/Math.PI-90})`});g.append(sprite('co2-tools-atlas.png',[338,100+i*980/48,90,30],[-11,-.5,22,Math.hypot(q.x-p.x,q.y-p.y)+1],[1268,1241]));hose.append(g);}svg.append(hose);
 const beaker=n('svg',{x:830,y:220,width:600,height:600,viewBox:'0 0 1254 1254',overflow:'hidden','data-lime-beaker':''});
 const liquidD='M265 650Q650 680 1036 650L1030 1070Q1020 1145 655 1150Q275 1140 265 1070Z';
 const liquidClip=n('clipPath',{id:'properties-lime-liquid'});liquidClip.append(n('path',{d:liquidD}));defs.append(liquidClip);
 beaker.append(image('properties-beaker.png',0,0,1254,1254));const water=n('g',{'clip-path':'url(#properties-lime-liquid)'});water.append(n('path',{d:liquidD,fill:'#c6e6e9','fill-opacity':.14}));
 const milk=n('linearGradient',{id:'properties-milk',x1:'0%',x2:'100%'});for(const[offset,color,opacity]of[[0,'#becacb',.45],[.18,'#f5f6ef',.88],[.52,'#fffff8',1],[.86,'#e6eae5',.9],[1,'#aebfc2',.5]])milk.append(n('stop',{offset,'stop-color':color,'stop-opacity':opacity}));defs.append(milk);
 const blur=n('filter',{id:'properties-diffusion',x:'-40%',y:'-40%',width:'180%',height:'180%'});blur.append(n('feGaussianBlur',{stdDeviation:12}));defs.append(blur);
 const cloud=n('path',{d:liquidD,fill:'url(#properties-milk)','fill-opacity':0,'data-lime-cloud':''});water.append(cloud);
 const plumes=n('g',{'data-lime-plumes':'',filter:'url(#properties-diffusion)',fill:'#fffef5'});for(let i=0;i<7;i++)plumes.append(n('ellipse',{cx:355,cy:1000,rx:30,ry:50,opacity:0}));water.append(plumes);
 // Reflection remains visible over the suspension, so it reads as liquid inside glass.
 water.append(n('path',{d:'M290 680Q276 890 292 1050',fill:'none',stroke:'#fff','stroke-width':11,opacity:.23}),n('path',{d:'M1003 683L998 1035',fill:'none',stroke:'#b9cbd0','stroke-width':8,opacity:.2}));beaker.append(water,n('ellipse',{cx:650,cy:650,rx:385,ry:27,fill:'#e1f3f4','fill-opacity':.12,stroke:'#94b7bd','stroke-opacity':.4,'stroke-width':2}));svg.append(beaker);
 const inletD='M910 290H980Q1000 290 1000 310V700',inlet=n('g',{'data-lime-inlet':''});for(const[stroke,width]of[['#759aa2',14],['#dceff1',9],['#fff',2]])inlet.append(n('path',{d:inletD,fill:'none',stroke,'stroke-width':width,'stroke-linecap':'round','stroke-linejoin':'round'}));svg.append(inlet);
 const flow=n('path',{d:'M447.3 520.55V251.75H573.3C690 251.75 810 310 910 290H980Q1000 290 1000 310V700',fill:'none',stroke:'#718c7b','stroke-width':2.2,'stroke-dasharray':'7 18','data-lime-flow':''});svg.append(flow);
 const worldClip=n('clipPath',{id:'properties-lime-world'});worldClip.append(n('path',{d:liquidD,transform:'translate(830 220) scale(0.4784688995)'}));defs.append(worldClip);
 const bubbleLight=n('radialGradient',{id:'properties-bubble-light',cx:'.3',cy:'.25',r:'.7'});for(const[offset,color,opacity]of[[0,'#fff',.95],[.28,'#fff',.25],[.72,'#d5e5e6',.05],[1,'#819fa5',.42]])bubbleLight.append(n('stop',{offset,'stop-color':color,'stop-opacity':opacity}));defs.append(bubbleLight);
 const bubbles=n('g',{'data-lime-bubbles':'','clip-path':'url(#properties-lime-world)',fill:'url(#properties-bubble-light)',stroke:'#7799a0','stroke-opacity':.55,'stroke-width':.65});for(let i=0;i<8;i++)bubbles.append(n('circle',{cx:1000,cy:694,r:2+i%3}));svg.append(bubbles);
 return{render(f){svg.dataset.cloud=f.cloud.toFixed(4);svg.dataset.bubbling=String(f.bubbling);cloud.setAttribute('fill-opacity',String(.9*Math.pow(f.cloud,1.7)));flow.setAttribute('opacity',String(f.flow));flow.style.strokeDashoffset=String(-f.time/28);bubbles.setAttribute('opacity',f.bubbling?'1':'0');sourceBubbles.setAttribute('opacity',f.source?'1':'0');[...sourceBubbles.children].forEach((p,i)=>p.setAttribute('cy',String(555-((f.time/1000+i*.17)%1)*45)));[...bubbles.children].forEach((p,i)=>{const phase=((f.time-1200)/(1250+i*93)+i*.137)%1,up=Math.pow(Math.max(0,phase),.85);p.setAttribute('cx',String(1000+(i%2?1:-1)*Math.min(1,phase/.12)*(14+Math.sin(phase*8+i*2.1)*3+up*3)));p.setAttribute('cy',String(704-up*171));p.setAttribute('r',String((1.65+i%3*.55)*(1+up*.5)));p.setAttribute('opacity',String(phase<.04?phase/.04:Math.min(1,(1-phase)*12)));});
 plumes.setAttribute('opacity',f.cloud>0?'1':'0');[...plumes.children].forEach((p,i)=>{const phase=((f.time-2000)/(2700+i*220)+i*.143)%1,up=Math.max(0,phase)*Math.min(1,Math.max(0,(f.time-2000)/1800)),spread=Math.min(1,f.cloud*2);p.setAttribute('cx',String(355+up*(70+spread*390)+Math.sin(up*6+i)*up*60));p.setAttribute('cy',String(1003-up*350));p.setAttribute('rx',String(25+up*100+f.cloud*70));p.setAttribute('ry',String(35+up*75));p.setAttribute('opacity',String(Math.min(.48,f.cloud*4)*Math.sin(Math.PI*up)*(.9-f.cloud*.4)));});},resize(narrow){svg.setAttribute('viewBox',narrow?'140 100 1260 740':'0 150 1536 710');}};
}
