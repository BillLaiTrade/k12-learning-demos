// Both diagrams use the main scene's spherical surfaces and actual Snell rays.
// The straight reference at EACH surface follows that surface's incident ray.
export function renderConvexRefraction(svg,g,{rayIndex=0,showRays=true,closeup=false}={}){
 const NS='http://www.w3.org/2000/svg',r=g.rays[rayIndex],upper=rayIndex===0,id=`convex-${upper?'upper':'lower'}`;
 const color=upper?'#c96130':'#9b6f14',scale=78,axis=upper?257:83,offset=204;
 const project=p=>[offset+p[0]*scale,axis+p[1]*scale];
 svg.replaceChildren();svg.setAttribute('viewBox',closeup?'0 0 560 340':'0 0 960 340');
 svg.dataset.rayIndex=rayIndex;svg.dataset.closeup=String(closeup);
 svg.setAttribute('aria-label',`${upper?'上':'下'}方光線在同一片凸透鏡的兩次折射：先偏向法線，再偏離法線，朝焦點 F 會聚。第二處點線沿玻璃內的入射方向延伸。`);
 const el=(tag,attrs={},parent=svg)=>{const e=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,String(v));parent.append(e);return e;};
 const path=(points,attrs={})=>el('path',{d:points.map((p,i)=>`${i?'L':'M'}${p.join(' ')}`).join(' '),fill:'none',...attrs});
 const text=(x,y,copy,attrs={})=>{const e=el('text',{x,y,fill:'#35533e','font-size':18,...attrs});e.textContent=copy;return e;};
 const defs=el('defs'),grad=el('linearGradient',{id:id+'-glass'},defs);
 for(const[offset,color]of [['0','#9dc8be'],['.5','#e5fff6'],['1','#9dc8be']])el('stop',{offset,'stop-color':color,'stop-opacity':.85},grad);
 for(const[key,fill]of [['ray',color],['bend','#267048']]){const m=el('marker',{id:id+'-'+key,viewBox:'0 0 10 10',refX:8,refY:5,markerWidth:5,markerHeight:5,orient:'auto',markerUnits:'strokeWidth'},defs);el('path',{d:'M0 0L10 5L0 10Z',fill},m);}
 // A uniform scale preserves angles, curvature and perpendicular surface normals.
 const boundary=[];
 for(let i=0;i<=160;i++){const y=-g.halfHeight+2*g.halfHeight*i/160;boundary.push(project([g.left(y),y]));}
 for(let i=160;i>=0;i--){const y=-g.halfHeight+2*g.halfHeight*i/160;boundary.push(project([g.right(y),y]));}
 path([...boundary,boundary[0]],{fill:`url(#${id}-glass)`,stroke:'#76a99b','stroke-width':2,'data-lens-boundary':'convex','data-center-thickness':g.thickness,'data-edge-thickness':g.right(g.halfHeight)-g.left(g.halfHeight)});
 path([[25,axis],[934,axis]],{stroke:'#8c988b','stroke-width':1.5,'stroke-dasharray':'10 7','data-main-axis':''});
 text(30,axis+(upper?27:-15),'主軸');
 text(99,upper?52:308,'空氣');text(offset+g.thickness*scale/2,upper?298:42,'玻璃',{'text-anchor':'middle'});if(!closeup)text(590,upper?52:308,'空氣');
 if(!showRays){text(closeup?280:550,177,'顯示輔助光路，觀察兩次折射。',{'text-anchor':'middle','font-size':16});return;}
 const forward=(p,d,length)=>[p[0]+d[0]*length,p[1]+d[1]*length];
 for(const[key,n,incoming,N]of [['enter',1,r.incoming,r.N1],['exit',2,r.inside,r.N2]]){
  const p=r[key],P=project(p),length=key==='enter'?1.32:2.45;
  // Crucial: exit reference uses r.inside, never the original horizontal ray.
  const reference=forward(p,incoming,length);
  path([P,project(reference)],{stroke:'#a9b2aa','stroke-width':2.4,'stroke-dasharray':'1 7','stroke-linecap':'round','data-straight-reference':key,'data-model-from':JSON.stringify(p),'data-model-to':JSON.stringify(reference)});
  path([project(forward(p,N,-1.55)),project(forward(p,N,1.55))],{stroke:'#52685b','stroke-width':1.7,'stroke-dasharray':'8 5','data-surface-normal':key});
  const normalPos=key==='enter'?project(forward(p,N,-1.6)):project(forward(p,N,1.8));
  text(normalPos[0]+(key==='enter'?-10:10),normalPos[1]+(upper?-12:23),'法線',{'text-anchor':key==='enter'?'end':'start','font-size':16});
 }
 const start=[-1.85,r.enter[1]],focus=[g.focus,0];
 for(const[part,a,b]of [['enter',start,r.enter],['inside',r.enter,r.exit],['exit',r.exit,focus]]){
  path([project(a),project(b)],{stroke:color,'stroke-width':3,'data-ray-part':part,'data-model-from':JSON.stringify(a),'data-model-to':JSON.stringify(b)});
  if(part!=='inside'){
   const A=project(a),B=project(b),at=.56;
   path([[A[0]+(B[0]-A[0])*(at-.02),A[1]+(B[1]-A[1])*(at-.02)],[A[0]+(B[0]-A[0])*at,A[1]+(B[1]-A[1])*at]],{stroke:color,'stroke-width':3,'marker-end':`url(#${id}-ray)`});
  }
 }
 for(const[key,n]of [['enter',1],['exit',2]]){
  const P=project(r[key]),side=key==='enter'?-1:1,dy=upper?-44:44,badge=[P[0]+side*18,P[1]+dy];
  path([P,badge],{stroke:'#527156','stroke-width':1.2});
  el('circle',{cx:badge[0],cy:badge[1],r:13,fill:'#fffcf0',stroke:'#355d43','stroke-width':1.5});text(badge[0],badge[1]+6,n,{'text-anchor':'middle','font-size':19,'font-weight':750});
  el('circle',{cx:P[0],cy:P[1],r:5.5,fill:'#f4d788',stroke:'#27644d','stroke-width':2,'data-interface':n});
 }
 // Curved direction cues are annotations; they do not replace physical rays.
 const bendY=upper?1:-1;
 for(const key of ['enter','exit']){
  const P=project(r[key]),x=P[0]+(key==='enter'?19:105),y=P[1]+bendY*(key==='enter'?13:36);
  el('path',{d:`M ${x} ${y} q 10 ${bendY*8} 3 ${bendY*23}`,fill:'none',stroke:'#267048','stroke-width':2,'marker-end':`url(#${id}-bend)`,'data-bend-cue':key});
 }
 if(!closeup){
  const F=project(focus);el('circle',{cx:F[0],cy:F[1],r:7,fill:'#fff4b2',stroke:'#d0a838','stroke-width':1.5,'data-diagram-focus':''});text(F[0]+3,F[1]+(upper?-17:32),'F',{'font-style':'italic','font-weight':750,'font-size':24});
 }else text(410,upper?255:65,upper?'朝焦點 F ↘':'朝焦點 F ↗',{'font-size':16});
}
