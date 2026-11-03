// Presentation only. Geometry and interaction remain in the reciprocal model/controller.
const NS='http://www.w3.org/2000/svg';
const attributes=(node,values)=>{for(const[k,v]of Object.entries(values))node.setAttribute(k,String(v));};
export function createReciprocalView(root,scene,zoom,devices){
 const viewport=root.querySelector('.return-table'),deck=root.querySelector('.return-control-deck');
 let camera={x:0,y:0,width:1254,height:1254},ratio=1;
 for(const [i,svg]of [scene,zoom].entries()){
  const layer=document.createElementNS(NS,'g');layer.classList.add('return-textures');
  layer.innerHTML=['upper','lower'].map(kind=>`<svg class="return-${kind}-texture" preserveAspectRatio="none" viewBox="250 ${kind==='upper'?310:610} 750 220"><image class="return-detail-photo" width="1254" height="1254"/></svg>`).join('');
  svg.querySelector('defs').after(layer);
  svg.insertAdjacentHTML('beforeend','<path class="return-interface return-surface"/>');
  for(const badge of svg.querySelectorAll('.return-medium-badge')){
   const speed=document.createElementNS(NS,'text');speed.classList.add('return-medium-speed');
   speed.textContent=badge.querySelector('.return-medium-name')?'光速較慢':'光速較快';badge.append(speed);
  }
  if(!i)svg.insertAdjacentHTML('beforeend','<text class="return-normal-name" data-sized>法線</text>');
 }
 return{
  layout(){
   const width=viewport.clientWidth;if(!width)return;
   const tall=width<=560;
   root.dataset.layout=tall?'tall':'wide';
   const route=document.querySelector('.route'),routeHeight=innerWidth<=760?(route?.getBoundingClientRect().height||0):0;
   const available=(window.visualViewport?.height||innerHeight)-routeHeight-deck.getBoundingClientRect().height-16;
   const height=Math.max(160,Math.min(width*(tall?900/700:820/1200),available));
   viewport.style.height=`${height}px`;
   const toolbar=root.querySelector('#return-medium-toggle').getBoundingClientRect(),table=viewport.getBoundingClientRect();
   const top=tall?Math.max(84,toolbar.bottom-table.top+12):12,axis=tall?width*.5:Math.min(width*.46,toolbar.left-table.left-42);
   ratio=Math.max(.06,Math.min(width/(tall?700:1200),(height-top-12-90)/480));
   camera={x:650-axis/ratio,y:340-(top+45)/ratio,width:width/ratio,height:height/ratio};
   const viewBox=Object.values(camera).join(' ');scene.setAttribute('viewBox',viewBox);devices.setAttribute('viewBox',viewBox);
   root.style.setProperty('--return-scroll-inset',`${routeHeight+8}px`);
   document.documentElement.style.setProperty('--return-scroll-inset',`${routeHeight+8}px`);
   root.dataset.sceneRatio=String(ratio);
   for(const [i,svg]of [scene,zoom].entries()){
    const box=i?{x:350,y:340,width:600,height:460}:camera;
    for(const [kind,y,h]of [['upper',box.y,570-box.y],['lower',570,box.y+box.height-570]]){
     attributes(svg.querySelector(`.return-${kind}-texture`),{x:box.x,y,width:box.width,height:h});
    }
    svg.querySelector('.return-surface').setAttribute('d',`M${box.x} 570H${box.x+box.width}`);
   }
   const normal=`M650 ${camera.y+12/ratio}V${camera.y+camera.height-12/ratio}`;
   scene.querySelector('.return-normal').setAttribute('d',normal);scene.querySelector('.return-normal-underlay').setAttribute('d',normal);
  },
  labels(svg,index,g,pixelRatio){
   const badges=svg.querySelectorAll('.return-medium-badge');
   for(const [i,badge]of [...badges].entries()){
    const name=badge.querySelector('text'),speed=badge.querySelector('.return-medium-speed');
    const x=index?(i?395:385):camera.x+18/ratio;
    if(!index)name.style.fontSize=`${Math.max(26,14/pixelRatio)*1.1}px`;
    const gap=index?18:Math.max(18,parseFloat(name.style.fontSize)*pixelRatio*1.3);
    const y=index?(i?700:500):570+(i?Math.max(24,gap):-(14+gap))/ratio;
    attributes(name,{x,y});attributes(speed,{x,y:y+gap/pixelRatio});
    speed.style.fontSize=`${index?12/pixelRatio:Math.max(22,12/pixelRatio)}px`;
   }
   if(!index)attributes(svg.querySelector('.return-normal-name'),{x:650+24/ratio,y:570-60/ratio});
   svg.querySelector('feGaussianBlur').setAttribute('stdDeviation',String(3/pixelRatio));
  }
 };
}
