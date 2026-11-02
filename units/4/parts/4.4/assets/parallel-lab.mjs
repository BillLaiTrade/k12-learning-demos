import {parallelModel} from './parallel-optics.mjs?v=20261102-split1';
const NS='http://www.w3.org/2000/svg';
document.querySelectorAll('[data-parallel-lens]').forEach(root=>{
 const kind=root.dataset.parallelLens,g=parallelModel(kind),convex=kind==='convex',id=root.id;
 const svg=root.querySelector('svg'),status=root.querySelector('[data-result]');let rays=true,close=false,extensions=false;
 const button=(key)=>root.querySelector(`[data-parallel-${key}]`);
 function element(tag,attrs={},parent=svg){const e=document.createElementNS(NS,tag);for(const [key,value]of Object.entries(attrs))e.setAttribute(key,String(value));parent.append(e);return e;}
 const path=(points,attrs={})=>element('path',{d:points.map((p,i)=>`${i?'L':'M'}${p[0]} ${p[1]}`).join(' '),fill:'none',...attrs});
 function render(){
  svg.replaceChildren();svg.setAttribute('viewBox',close?'-1.3 -2.7 3.5 5.4':'-8.5 -3.8 23 7.6');
  svg.setAttribute('aria-label',`${convex?'凸':'凹'}透鏡${close?'兩個表面的折射近看':'平行光路'}，${rays?(convex?'出射光會聚':'出射光發散'):'光路已隱藏'}`);
  element('rect',{x:-8.5,y:-3.8,width:23,height:7.6,rx:.3,fill:'#edf3e8'});
  path([[-8.2,0],[14.2,0]],{stroke:'#a9b9aa','stroke-width':.025,'stroke-dasharray':'.16 .14'});
  const defs=element('defs'),gradient=element('linearGradient',{id:id+'-glass'},defs);
  for(const [offset,color]of [['0','#9ecbc1'],['.45','#faffff'],['1','#9ecbc1']])element('stop',{offset,'stop-color':color,'stop-opacity':'.7'},gradient);
  for(const color of ['#be7146','#c29231']){const marker=element('marker',{id:id+'-arrow-'+color.slice(1),viewBox:'0 0 10 10',refX:8,refY:5,markerWidth:5,markerHeight:5,orient:'auto-start-reverse',markerUnits:'strokeWidth'},defs);element('path',{d:'M0 0L10 5L0 10Z',fill:color},marker);}
  const boundary=[];for(let y=-g.halfHeight;y<=g.halfHeight+.0001;y+=.05)boundary.push([g.left(y),y]);for(let y=g.halfHeight;y>=-g.halfHeight-.0001;y-=.05)boundary.push([g.right(y),y]);
  const lens=path([...boundary,boundary[0]],{fill:`url(#${id}-glass)`,stroke:'#65998b','stroke-width':close?.025:.045,'data-lens-boundary':kind});lens.dataset.centerThickness=g.thickness;lens.dataset.edgeThickness=g.right(g.halfHeight)-g.left(g.halfHeight);
  if(!close){element('rect',{x:.25,y:2.28,width:.4,height:.55,rx:.08,fill:'#82998b'});element('rect',{x:-.35,y:2.83,width:1.6,height:.16,rx:.07,fill:'#647e6a'});}
  if(rays){for(const [i,r]of g.rays.entries()){
   const color=i===0?'#be7146':'#c29231',stroke=close?(i===0?.026:.014):.07;
   for(const [part,points]of [['enter',[r.from,r.enter]],['inside',[r.enter,r.exit]],['exit',[r.exit,r.end]]])path(points,{stroke:color,'stroke-width':stroke,'marker-end':`url(#${id}-arrow-${color.slice(1)})`,'data-ray-part':part,'data-ray-index':i,opacity:close&&i!==0?.35:1});
   if(!convex&&extensions&&r.focus!==null)path([[g.focus,0],r.exit],{stroke:'#a67636','stroke-width':close?.018:.03,'stroke-dasharray':'.13 .11','data-virtual-extension':''});
  }
   if(close){const r=g.rays[0];for(const [p,N,n]of [[r.enter,r.N1,1],[r.exit,r.N2,2]]){
    path([[p[0]-N[0]*.55,p[1]-N[1]*.55],[p[0]+N[0]*.55,p[1]+N[1]*.55]],{stroke:'#78897e','stroke-width':.016,'stroke-dasharray':'.065 .06','data-surface-normal':n});element('circle',{cx:p[0],cy:p[1],r:.055,fill:'#176b53','data-interface':n});const label=element('text',{x:p[0]-.09,y:p[1]-.15,'font-size':.22,fill:'#176b53','font-weight':700});label.textContent=String(n);
   }}else if(convex||extensions)element('circle',{cx:g.focus,cy:0,r:.09,fill:'#a67636','data-focus':convex?'real':'virtual'});
  }
  button('rays').textContent=rays?'隱藏輔助光路':'顯示輔助光路';button('rays').setAttribute('aria-pressed',rays);
  button('close').textContent=close?'返回整體觀察':'近看兩次折射';button('close').setAttribute('aria-pressed',close);
  if(button('extensions')){button('extensions').hidden=!rays;button('extensions').textContent=extensions?'隱藏反向延長線':'顯示反向延長線';button('extensions').setAttribute('aria-pressed',extensions);}
  root.querySelector('[data-parallel-caption]').textContent=close?'① 進入玻璃偏向當地法線　② 離開玻璃偏離當地法線；灰色虛線是法線。':convex?'同一組平行入射光 → 凸透鏡 → 光在另一側會聚，褐色圓點所示的會聚位置稱為焦點。':'同一組平行入射光 → 凹透鏡 → 光向外發散；反向延長線僅供判讀，看起來的出發位置在物體側。';
  root.querySelector('[data-parallel-view-label]').textContent=close?'同一片透鏡的剖面近看':'平行主軸入射光的側視示意';
  root.querySelector('[data-parallel-guide]').hidden=!close||!rays;
  status.textContent=!rays?'先比較鏡片厚薄，再顯示光路觀察方向。':convex?'凸透鏡中間厚、邊緣薄。光在進入、離開玻璃時分別折射，這組平行光在另一側會聚。':'凹透鏡中間薄、邊緣厚。光在進入、離開玻璃時分別折射，這組平行光通過後向外發散。';
  root.dataset.rays=rays;root.dataset.view=close?'surface':'overall';root.dataset.extensions=extensions;
 }
 button('rays').addEventListener('click',()=>{rays=!rays;render();});
 button('close').addEventListener('click',()=>{close=!close;if(close)rays=true;render();});
 button('extensions')?.addEventListener('click',()=>{extensions=!extensions;render();});
 render();root.dataset.ready='true';
});
