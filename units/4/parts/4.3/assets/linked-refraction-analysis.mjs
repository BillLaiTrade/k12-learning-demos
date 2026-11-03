import {drawDirections} from './light-beam.mjs?v=20261103-inline1';
const H=[360,270],R=62;
const point=(angle,r,upper=false,left=false)=>{const a=angle*Math.PI/180;return[360+(left?-1:1)*r*Math.sin(a),270+(upper?-1:1)*r*Math.cos(a)];};
const endpoint=angle=>{const a=angle*Math.PI/180,s=Math.sin(a),c=Math.cos(a),r=Math.min(s>1e-12?330/s:Infinity,c>1e-12?225/c:Infinity);return[360+r*s,270+r*c];};
const path=points=>`M${points.map(p=>p.join(' ')).join('L')}`;
function mark(angle,kind){if(!angle)return{arc:'',sector:''};const upper=kind!=='out',left=kind==='in',start=point(0,R,upper,left),end=point(angle,R,upper,left),arc=`M${start.join(' ')}A${R} ${R} 0 0 ${kind==='reflection'?1:0} ${end.join(' ')}`;return{arc,sector:`M360 270L${arc.slice(1)}Z`};}
const num=a=>Number.isInteger(a)?String(a):a.toFixed(1);
export function mountAnalysis(root,prefix){
 const svg=root.querySelector(`#${prefix}-analysis-scene`),$=s=>root.querySelector(s),q=s=>svg.querySelector(s),id=`${prefix}-analysis-bend`;
 svg.innerHTML=`<defs><marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="12" markerHeight="12" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#24783a"/></marker></defs>
 <svg class="analysis-upper-texture" x="0" y="0" width="720" height="270" preserveAspectRatio="none"><image class="analysis-photo" width="1254" height="1254"/></svg>
 <svg class="analysis-lower-texture" x="0" y="270" width="720" height="250" preserveAspectRatio="none"><image class="analysis-photo" width="1254" height="1254"/></svg>
 <rect width="720" height="520" fill="#fffdf6" fill-opacity=".12"/>
 <path class="analysis-interface" d="M0 270H720"/>
 <path class="analysis-sector analysis-sector-in"/><path class="analysis-sector analysis-sector-secondary"/>
 <path class="analysis-normal-base" d="M360 28V500"/><path class="analysis-normal" d="M360 28V500"/>
 <path class="analysis-reference"/>
 <g class="analysis-beam"><path class="lesson-beam-halo"/><path class="lesson-beam-ray"/><path class="lesson-beam-core"/><path class="lesson-beam-direction"/><path class="lesson-beam-direction"/></g>
 <path class="analysis-arc analysis-arc-in"/><path class="analysis-arc analysis-arc-secondary"/>
 <path class="analysis-bend" marker-end="url(#${id})"/>
 <g class="analysis-in-label"><path class="analysis-leader"/><text data-analysis-font="14"/></g>
 <g class="analysis-secondary-label"><path class="analysis-leader"/><text data-analysis-font="14"/></g>
 <text class="analysis-normal-label" data-analysis-font="13" x="376" y="48">法線</text>
 <g class="analysis-medium analysis-upper-medium"><rect/><text data-analysis-font="13" x="35" y="85"/></g>
 <g class="analysis-medium analysis-lower-medium"><rect/><text data-analysis-font="13" x="35" y="475"/></g>`;
 svg.classList.add('lesson-beam-detail');svg.style.setProperty('--beam-unit','3');
 function label(group,title,value,x,y,anchor,oneLine=false){
  const text=group.querySelector('text');text.setAttribute('x',x);text.setAttribute('y',y);text.setAttribute('text-anchor',anchor);
  text.innerHTML=oneLine?`${title} ${value}°`:`<tspan x="${x}">${title}</tspan><tspan x="${x}" dy="${Math.max(38,parseFloat(text.style.fontSize)*1.45)}" class="analysis-angle-number">${value}°</tspan>`;
 }
 return {render(g,photo){
  const m=svg.getScreenCTM(),ratio=Math.max(.05,m?Math.hypot(m.a,m.b):.7),tir=g.kind==='tir',grazing=g.kind==='grazing',zero=g.degrees===0,secondary=tir?g.reflected:g.outgoing;
  svg.dataset.kind=g.kind;svg.dataset.incident=String(g.degrees);svg.dataset.outgoing=g.outgoing===null?'':String(g.outgoing);
  svg.querySelectorAll('[data-analysis-font]').forEach(e=>e.style.fontSize=`${Math.max(20,Number(e.dataset.analysisFont)/ratio)}px`);
  svg.querySelectorAll('.analysis-photo').forEach(e=>e.setAttribute('href',photo));
  const texture=isSlow=>isSlow?'250 610 750 220':'250 310 750 220';q('.analysis-upper-texture').setAttribute('viewBox',texture(g.reverse));q('.analysis-lower-texture').setAttribute('viewBox',texture(!g.reverse));
  q('.analysis-upper-medium text').textContent=g.reverse?(g.medium==='water'?'水':'玻璃'):'空氣';q('.analysis-lower-medium text').textContent=g.reverse?'空氣':(g.medium==='water'?'水':'玻璃');
  for(const badge of svg.querySelectorAll('.analysis-medium')){const b=badge.querySelector('text').getBBox(),r=badge.querySelector('rect');for(const[k,v]of Object.entries({x:b.x-8,y:b.y-4,width:b.width+16,height:b.height+8,rx:7}))r.setAttribute(k,String(v));}
  const source=point(g.degrees,170,true,true),end=grazing?H:tir?point(g.degrees,170,true):endpoint(g.outgoing),points=[source,H,end],d=path(grazing?[source,H]:points);
  svg.querySelectorAll('.lesson-beam-halo,.lesson-beam-ray,.lesson-beam-core').forEach(p=>p.setAttribute('d',d));drawDirections(q('.analysis-beam'),points,Infinity,ratio,true);
  const inMark=mark(g.degrees,'in'),outMark=secondary===null?{arc:'',sector:''}:mark(secondary,tir?'reflection':'out');
  q('.analysis-sector-in').setAttribute('d',inMark.sector);q('.analysis-arc-in').setAttribute('d',inMark.arc);q('.analysis-sector-secondary').setAttribute('d',outMark.sector);q('.analysis-arc-secondary').setAttribute('d',outMark.arc);
  q('.analysis-secondary-label').setAttribute('visibility',secondary===null?'hidden':'visible');
  label(q('.analysis-in-label'),'入射角',num(g.degrees),tir?330:390,tir?115:150,tir?'end':'start',tir);
  label(q('.analysis-secondary-label'),tir?'反射角':'折射角',secondary===null?'':tir?num(secondary):secondary.toFixed(1),tir?390:330,tir?115:386,tir?'start':'end',tir);
  const ip=point(g.degrees/2,R,true,true);q('.analysis-in-label path').setAttribute('d',`M${ip.join(' ')}L${tir?'330 128':'382 174'}`);
  const op=point((secondary||0)/2,R,tir,false);q('.analysis-secondary-label path').setAttribute('d',`M${op.join(' ')}L${tir?'390 128':'340 368'}`);
  const reference=!tir&&!grazing&&!zero;q('.analysis-reference').setAttribute('d',reference?path([H,endpoint(g.degrees)]):'');
  const bend=q('.analysis-bend');if(reference){const a=point(g.degrees,118),b=point(g.outgoing,118);bend.setAttribute('d',`M${a.join(' ')}A118 118 0 0 ${g.outgoing<g.degrees?1:0} ${b.join(' ')}`);}else bend.setAttribute('d','');
  q('marker').setAttribute('markerWidth',String(Math.max(12,7/ratio)));q('marker').setAttribute('markerHeight',String(Math.max(12,7/ratio)));
  const title=grazing?'沿介面掠射':tir?'全反射':g.kind==='critical'?'臨界角':zero?'方向不偏折':g.reverse?'偏離法線':'偏向法線';
  const reason=grazing?'沿著介面前進，不穿越介面。':tir?'沒有折射光；光留在原介質中。':g.kind==='critical'?'折射方向沿著介面（極限示意）。':zero?'速度仍改變，方向不變。':g.reverse?'折射角變大，光線更遠離法線。':'折射角變小，光線更靠近法線。';
  $('[data-analysis-title]').textContent=title;$('[data-analysis-reason]').textContent=reason;
  $('[data-analysis-equation-label]').textContent=grazing?'入射角':tir?'反射角與入射角':'折射角與入射角';
  $('[data-analysis-equation]').innerHTML=grazing?'<span class="angle-in">90°</span>':`<span class="${tir?'angle-reflection':'angle-out'}">${tir?num(g.degrees):g.outgoing.toFixed(1)}°</span><span class="analysis-compare">${tir||zero?'=':g.reverse?'&gt;':'&lt;'}</span><span class="angle-in">${num(g.degrees)}°</span>`;
  $('[data-speed-result]').textContent=grazing?'沿介面，不穿越':tir?'未進入空氣':g.reverse?'光速由慢變快':'光速由快變慢';
  $('[data-analysis-threshold]').textContent=g.reverse?`${g.medium==='water'?'水':'玻璃'} → 空氣的臨界角約 ${g.critical.toFixed(1)}°。`:'';
  $('[data-reference-note]').hidden=!reference;
  const description=`${g.from==='air'?'空氣':g.medium==='water'?'水':'玻璃'}射向${g.to==='air'?'空氣':g.medium==='water'?'水':'玻璃'}。入射角${num(g.degrees)}度。${g.outgoing===null?(tir?`反射角${num(g.reflected)}度。`:``):`折射角${g.outgoing.toFixed(1)}度。`}${title}。${reason}`;svg.setAttribute('aria-label',description);
 }};
}
