import {COMPARISON,comparisonRay,opticalDistances,sidePath} from './mirror-comparison.mjs?v=3';
import {createComparisonView} from './mirror-comparison-view.mjs?v=3';

const section=document.getElementById('card-03');
if(section) {
  const ns='http://www.w3.org/2000/svg',ray=comparisonRay(),distances=opticalDistances();
  const node=(name,attributes)=>{const element=document.createElementNS(ns,name);for(const [key,value] of Object.entries(attributes))element.setAttribute(key,value);return element;};
  const attrs=(element,values)=>{for(const [key,value] of Object.entries(values))element.setAttribute(key,value);};
  for(const prefix of ['reference','trial']) {
    const panel=section.querySelector(`#comparison-${prefix}`),mode=panel.dataset.mode,mirror=mode==='mirror';
    const svg=panel.querySelector('.comparison-side'),find=name=>svg.querySelector(`[data-side="${name}"]`);
    attrs(svg.querySelector(`#${prefix}-bear-sprite`),COMPARISON.sideBear);attrs(find('profile'),COMPARISON.observer);
    attrs(find('far-shape'),{transform:`translate(${2*COMPARISON.mirrorX} 0) scale(-1 1)`});
    const path=(points,arrows)=>node('path',{d:sidePath(points,arrows),...(arrows?{'marker-mid':`url(#${prefix}-blue-arrow)`}:{})});
    find('rays').replaceChildren(...(mirror?[[ray.source,ray.hit],[ray.hit,ray.eye]]:[[ray.image,ray.eye]]).map(points=>path(points,true)));
    find('rays').setAttribute('stroke-width','4');
    find('extensions').replaceChildren(...(mirror?[path(ray.extension,false)]:[]));
    find('hits').replaceChildren(...(mirror?[node('circle',{cx:ray.hit[0],cy:ray.hit[1],r:4})]:[]));
    function distanceLabel(name,points,text,color) {
      const [a,b]=points,length=Math.hypot(b[0]-a[0],b[1]-a[1]);
      const x=(a[0]+b[0])/2+(b[1]-a[1])/length*36,y=(a[1]+b[1])/2-(b[0]-a[0])/length*36;
      attrs(find(name),{transform:`translate(${x} ${y})`});
      const label=node('text',{x:0,y:18,'text-anchor':'middle','font-size':52,'font-weight':800,fill:'#244e6b'});label.textContent=text;
      find(name).replaceChildren(node('rect',{x:-105,y:-35,width:210,height:70,rx:18,fill:color}),label);
    }
    distanceLabel('distance-three',[ray.eye,ray.hit],'3公尺','#c9e6fb');
    distanceLabel('distance-two',[ray.hit,ray.image],'2公尺','#fbd3ae');
    svg.dataset.mode=mode;svg.dataset.eye=COMPARISON.eye.join(',');svg.dataset.source=COMPARISON.source.join(',');svg.dataset.image=COMPARISON.image.join(',');svg.dataset.hit=ray.hit.join(',');
    svg.dataset.distances=JSON.stringify(distances);
    createComparisonView(panel.querySelector('.comparison-eye'),mode);
  }
}
