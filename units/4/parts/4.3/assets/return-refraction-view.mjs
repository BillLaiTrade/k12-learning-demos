import {angleMark} from './return-refraction-model.mjs?v=20261103-refine1';
// Presentation only. Geometry and interaction remain in the reciprocal model/controller.
const NS='http://www.w3.org/2000/svg';
const attributes=(node,values)=>{for(const[k,v]of Object.entries(values))node.setAttribute(k,String(v));};
export function createReciprocalView(root,scene,devices){
 const viewport=root.querySelector('.return-table'),deck=root.querySelector('.return-control-deck');
 let camera={x:0,y:0,width:1254,height:1254},ratio=1;
 for(const svg of [scene]){
  const layer=document.createElementNS(NS,'g');layer.classList.add('return-textures');
  layer.innerHTML=['upper','lower'].map(kind=>`<svg class="return-${kind}-texture" preserveAspectRatio="none" viewBox="250 ${kind==='upper'?310:610} 750 220"><image class="return-medium-photo" width="1254" height="1254"/></svg>`).join('');
  svg.querySelector('defs').after(layer);
  svg.insertAdjacentHTML('beforeend','<path class="return-interface return-surface"/>');
  for(const badge of svg.querySelectorAll('.return-medium-badge')){
   const speed=document.createElementNS(NS,'text');speed.classList.add('return-medium-speed');
   speed.textContent=badge.querySelector('.return-medium-name')?'光速較慢':'光速較快';badge.append(speed);
  }
  svg.insertAdjacentHTML('beforeend','<text class="return-normal-name" data-sized>法線</text>');
 }
 return{
  layout(){
   const width=viewport.clientWidth;if(!width)return;
   const route=document.querySelector('.route'),routeHeight=innerWidth<=760?(route?.getBoundingClientRect().height||0):0;
   const available=(window.visualViewport?.height||innerHeight)-routeHeight-deck.getBoundingClientRect().height-16;
   const tall=width<=560||(width<=720&&available>320);
   root.dataset.layout=tall?'tall':'wide';
   const height=Math.max(160,Math.min(width*(tall?900/700:820/1200),available));
   viewport.style.height=`${height}px`;
   const toolbar=root.querySelector('#return-medium-toggle').getBoundingClientRect(),table=viewport.getBoundingClientRect();
   const top=tall?Math.max(84,toolbar.bottom-table.top+12):12,axis=tall?width*.5:Math.min(width*.46,toolbar.left-table.left-110);
   ratio=Math.max(.06,Math.min(width/(tall?700:1200),(height-top-12-90)/480));
   camera={x:650-axis/ratio,y:340-(top+45)/ratio,width:width/ratio,height:height/ratio};
   const viewBox=Object.values(camera).join(' ');scene.setAttribute('viewBox',viewBox);devices.setAttribute('viewBox',viewBox);
   root.style.setProperty('--return-scroll-inset',`${routeHeight+8}px`);
   document.documentElement.style.setProperty('--return-scroll-inset',`${routeHeight+8}px`);
   root.dataset.sceneRatio=String(ratio);
   for(const svg of [scene]){
    const box=camera;
    for(const [kind,y,h]of [['upper',box.y,570-box.y],['lower',570,box.y+box.height-570]]){
     attributes(svg.querySelector(`.return-${kind}-texture`),{x:box.x,y,width:box.width,height:h});
    }
    svg.querySelector('.return-surface').setAttribute('d',`M${box.x} 570H${box.x+box.width}`);
   }
   const normal=`M650 ${camera.y+12/ratio}V${camera.y+camera.height-12/ratio}`;
   scene.querySelector('.return-normal').setAttribute('d',normal);scene.querySelector('.return-normal-underlay').setAttribute('d',normal);
  },
  labels(pixelRatio){
   for(const [i,badge]of [...scene.querySelectorAll('.return-medium-badge')].entries()){
    const name=badge.querySelector('text'),speed=badge.querySelector('.return-medium-speed');
    const x=camera.x+18/ratio;
    name.style.fontSize=`${Math.max(26,14/pixelRatio)*1.1}px`;
    const gap=Math.max(18,parseFloat(name.style.fontSize)*pixelRatio*1.3),y=570+(i?Math.max(24,gap):-(14+gap))/ratio;
    attributes(name,{x,y});attributes(speed,{x,y:y+gap/pixelRatio});speed.style.fontSize=`${Math.max(22,12/pixelRatio)}px`;
   }
   attributes(scene.querySelector('.return-normal-name'),{x:650+12/ratio,y:570-4/ratio});
   scene.querySelector('feGaussianBlur').setAttribute('stdDeviation',String(3/pixelRatio));
  },
  angles(g,active,pixelRatio){
   const marks=scene.querySelector('.return-angle-marks');marks.setAttribute('visibility',active?'visible':'hidden');marks.setAttribute('aria-hidden',String(!active));
   const sourceRadius=Math.min(Math.hypot(g.sourceA[0]-650,g.sourceA[1]-570),Math.hypot(g.sourceB[0]-650,g.sourceB[1]-570));
   const radius=Math.min(Math.max(98,30/pixelRatio),sourceRadius*.65),r=radius*pixelRatio,font=Math.max(16,30*pixelRatio),line=font*1.5;
   marks.dataset.radius=String(radius);
   for(const upper of [true,false]){
    const kind=upper?'upper':'lower',degrees=upper?g.airAngle:g.waterAngle,color=upper?'#24783a':'#165fc2',mark=angleMark(degrees,upper,radius),sign=upper?-1:1,half=degrees*Math.PI/360;
    const sector=scene.querySelector(`.return-${kind}-sector`),arc=scene.querySelector(`.return-${kind}-arc`),label=scene.querySelector(`.return-${kind}-label`),text=label.querySelector('text'),leader=label.querySelector('path');
    const x=650+(upper?Math.max(46,r*.72):-Math.max(16,r*.65))/pixelRatio,y=570+(upper?-Math.max(40,r*.9):Math.max(30,r*.72))/pixelRatio;
    sector.setAttribute('d',mark.sector);sector.setAttribute('fill',color);arc.setAttribute('d',mark.arc);arc.setAttribute('stroke',color);arc.style.strokeWidth=`${2.5/pixelRatio}px`;
    text.style.fontSize=`${font/pixelRatio}px`;text.style.fill=color;text.style.strokeWidth=`${1.4/pixelRatio}px`;text.setAttribute('text-anchor',upper?'start':'end');
    const name=label.querySelector('.return-angle-name'),number=label.querySelector('.return-angle-number');name.textContent=upper?'空氣側':`${g.name}側`;number.textContent=upper?`${g.airAngle.toFixed(1)}°`:`${g.waterAngle}°`;attributes(name,{x,y});attributes(number,{x,y:y+line/pixelRatio});
    const a=[650+sign*radius*Math.sin(half),570+sign*radius*Math.cos(half)],end=x+(upper?-8:8)/pixelRatio;
    leader.setAttribute('d',degrees?`M${a.join(' ')}L${end} ${y-4/pixelRatio}`:'');leader.setAttribute('stroke',color);leader.style.strokeWidth=`${1.3/pixelRatio}px`;
   }
  }
 };
}
