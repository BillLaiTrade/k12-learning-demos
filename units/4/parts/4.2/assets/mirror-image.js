import {COMPARISON,comparisonRay,opticalDistances,sidePath} from './mirror-comparison.mjs?v=4';
import {createComparisonView} from './mirror-comparison-view.mjs?v=4';

const section=document.getElementById('card-04');
if(section) {
  const ns='http://www.w3.org/2000/svg',ray=comparisonRay(),distances=opticalDistances();
  const node=(name,attributes)=>{const element=document.createElementNS(ns,name);for(const [key,value] of Object.entries(attributes))element.setAttribute(key,value);return element;};
  const attrs=(element,values)=>{for(const [key,value] of Object.entries(values))element.setAttribute(key,value);};
  const clearSelections=[];
  for(const prefix of ['reference','trial']) {
    const panel=section.querySelector(`#comparison-${prefix}`),mode=panel.dataset.mode,mirror=mode==='mirror';
    const svg=panel.querySelector('.comparison-side'),find=name=>svg.querySelector(`[data-side="${name}"]`);
    attrs(svg.querySelector(`#${prefix}-bear-sprite`),COMPARISON.sideBear);attrs(find('profile'),COMPARISON.observer);
    attrs(find('far-shape'),{transform:`translate(${2*COMPARISON.mirrorX} 0) scale(-1 1)`});
    const path=(points,arrows)=>node('path',{d:sidePath(points,arrows),...(arrows?{'marker-mid':`url(#${prefix}-blue-arrow)`}:{})});
    find('rays').replaceChildren(...(mirror?[[ray.source,ray.hit],[ray.hit,ray.eye]]:[[ray.image,ray.eye]]).map(points=>path(points,true)));
    find('rays').setAttribute('stroke-width','4');
    const incomingMatch=node('path',{'data-side':'incoming-match',d:sidePath([ray.hit,ray.eye]),fill:'none',stroke:'#236f9f','stroke-width':10,'stroke-linecap':'round',opacity:.18});
    find('rays').before(incomingMatch);
    const totalPath=node('path',{'data-side':'total-highlight',d:sidePath(mirror?ray.reflected:ray.direct),fill:'none',stroke:'#ffca46','stroke-width':13,'stroke-linecap':'round','stroke-linejoin':'round','pointer-events':'none',visibility:'hidden'});
    find('rays').before(totalPath);
    find('extensions').replaceChildren(...(mirror?[path(ray.extension,false)]:[]));
    find('hits').replaceChildren(...(mirror?[node('circle',{cx:ray.hit[0],cy:ray.hit[1],r:4})]:[]));
    function distanceLabel(name,points,text,color,fraction=.5,{compact=false,side=1,gap=20}={}) {
      const [a,b]=points,length=Math.hypot(b[0]-a[0],b[1]-a[1]);
      const width=compact?132:172,height=compact?48:58,nx=(b[1]-a[1])/length,ny=-(b[0]-a[0])/length;
      // Offset the WHOLE badge, not just its centre. Its projected half-extent
      // along the path normal needs to clear the line before adding a gap.
      const offset=(Math.abs(nx)*width/2+Math.abs(ny)*height/2+gap)*side;
      const x=a[0]+(b[0]-a[0])*fraction+nx*offset,y=a[1]+(b[1]-a[1])*fraction+ny*offset;
      attrs(find(name),{transform:`translate(${x} ${y})`});
      const label=node('text',{x:0,y:compact?13:14,'text-anchor':'middle','font-size':compact?38:42,'font-weight':700,fill:'#244e6b'});label.textContent=text;
      find(name).replaceChildren(node('rect',{x:-width/2,y:-height/2,width,height,rx:compact?9:12,fill:color}),label);
    }
    distanceLabel('distance-three',[ray.eye,ray.hit],'3公尺','#c9e6fb',.43);
    distanceLabel('distance-two',[ray.image,ray.hit],'2公尺','#fbd3ae',.4,{compact:true,side:-1,gap:12});
    if(mirror) {
      // Keep matching labels above the two short segments, clear of the bears.
      distanceLabel('distance-incoming',[ray.source,ray.hit],'2公尺','#fbd3ae',.4,{compact:true,gap:12});
    }
    // Equal lengths can represent different paths: the mirror extension is virtual.
    svg.setAttribute('role','group');
    const terms=[...panel.querySelectorAll('.comparison-path-term')];
    const total=panel.querySelector('.comparison-path-total');
    total.dataset.match='total';
    const badges=[...svg.querySelectorAll('[data-side^="distance-"]')];
    function selectDistance(key) {
      for(const control of [...badges,...terms,total]) control.setAttribute('aria-pressed',String(key!==null && control.dataset.match===key));
      totalPath.setAttribute('visibility',key==='total'?'visible':'hidden');
    }
    clearSelections.push(()=>selectDistance(null));
    total.addEventListener('click',()=>selectDistance('total'));
    for(const term of terms) {
      term.id=`${prefix}-distance-${term.dataset.distance}`;
      term.dataset.match=term.dataset.distance;
      term.addEventListener('click',()=>selectDistance(term.dataset.match));
    }
    for(const badge of badges) {
      const distance=badge.dataset.side==='distance-three'?'3':'2';
      const key=mirror&&badge.dataset.side==='distance-two'?'extension':distance;
      attrs(badge,{role:'button',tabindex:0,'data-distance':distance,'data-match':key,'aria-pressed':'false'});
      if(key!=='extension')badge.setAttribute('aria-controls',`${prefix}-distance-${distance}`);
      if(!mirror) badge.setAttribute('aria-label',distance==='2'?'真熊到原鏡面位置的光路為2公尺':'原鏡面位置到眼睛的光路為3公尺');
      badge.addEventListener('click',()=>selectDistance(key));
      badge.addEventListener('keydown',event=>{
        if(!['Enter',' '].includes(event.key)) return;
        event.preventDefault();selectDistance(key);
      });
    }
    svg.dataset.mode=mode;svg.dataset.eye=COMPARISON.eye.join(',');svg.dataset.source=COMPARISON.source.join(',');svg.dataset.image=COMPARISON.image.join(',');svg.dataset.hit=ray.hit.join(',');
    svg.dataset.distances=JSON.stringify(distances);
    createComparisonView(panel.querySelector('.comparison-eye'),mode);
  }
  document.addEventListener('click',event=>{
    if(!section.contains(event.target)||!event.target.closest('.comparison-path-term,.comparison-path-total,[data-side^=\"distance-\"]'))clearSelections.forEach(clear=>clear());
  });
}
