// Uniform close-ups of the main scene's actual spherical surfaces and Snell rays.
// Only the selected interface receives a normal and straight-ahead reference.
export function renderConvexRefraction(svg,g,{rayIndex=0,showRays=true,mode='enter',width=960}={}){
 const NS='http://www.w3.org/2000/svg',r=g.rays[rayIndex],upper=rayIndex===0,close=mode!=='overall',compact=width<540;
 const W=compact?520:960,H=close?440:340,id=`convex-${upper?'upper':'lower'}`,sign=upper?1:-1;
 const scale=close?(compact?200:320):Math.min(78,(W-110)/(g.focus+1.85));
 const offset=close?(compact?130:300)-r.enter[0]*scale:W-65-g.focus*scale;
 const axis=close?(upper?210:H-210)-r.enter[1]*scale:(upper?H-84:84);
 const project=p=>[offset+p[0]*scale,axis+p[1]*scale],atX=(p,d,x)=>[x,p[1]+(x-p[0])*d[1]/d[0]];
 const color=upper?'#c96130':'#9b6f14',font=compact?28:19,ink='#355443',normal='#496759',reference='#879a8d';
 const mirror=y=>upper?y:H-y;
 svg.replaceChildren();svg.setAttribute('viewBox',`0 0 ${W} ${H}`);svg.style.aspectRatio=`${W} / ${H}`;
 Object.assign(svg.dataset,{rayIndex:String(rayIndex),mode,scale:String(scale),compact:String(compact)});
 svg.setAttribute('aria-label',`${upper?'上':'下'}方光線：${close?(mode==='enter'?'①從空氣進入玻璃，偏向法線。':'②從玻璃進入空氣，偏離法線。直行參考沿玻璃內入射方向延伸。'):'完整光路，經兩次折射會聚到焦點 F。'}`);
 const el=(tag,attrs={},parent=svg)=>{const e=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,String(v));parent.append(e);return e;};
 const path=(points,attrs={})=>el('path',{d:points.map((p,i)=>`${i?'L':'M'}${p.join(' ')}`).join(' '),fill:'none',...attrs});
 const text=(x,y,copy,attrs={})=>{const e=el('text',{x,y,fill:ink,'font-size':font,...attrs});e.textContent=copy;return e;};
 const defs=el('defs'),grad=el('linearGradient',{id:id+'-glass'},defs);
 for(const[offset,color,opacity]of [['0','#91bfb3',.6],['.28','#bee7db',.68],['.52','#f2fff9',.88],['.76','#bfe8dc',.72],['1','#8dbdaf',.65]])el('stop',{offset,'stop-color':color,'stop-opacity':opacity},grad);
 const glow=el('radialGradient',{id:id+'-point'},defs);el('stop',{offset:0,'stop-color':'#f4cf72','stop-opacity':.36},glow);el('stop',{offset:1,'stop-color':'#f4cf72','stop-opacity':0},glow);
 const marker=el('marker',{id:id+'-arrow',viewBox:'0 0 10 10',refX:6,refY:5,markerWidth:4.8,markerHeight:4.8,orient:'auto',markerUnits:'strokeWidth'},defs);el('path',{d:'M0 1L9 5L0 9Z',fill:color},marker);
 const boundary=[];
 for(let i=0;i<=180;i++){const y=-g.halfHeight+2*g.halfHeight*i/180;boundary.push(project([g.left(y),y]));}
 for(let i=180;i>=0;i--){const y=-g.halfHeight+2*g.halfHeight*i/180;boundary.push(project([g.right(y),y]));}
 const contour=[...boundary,boundary[0]];
 path(contour,{fill:`url(#${id}-glass)`,stroke:'#78a99a','stroke-width':2,'data-lens-boundary':'convex','data-center-thickness':g.thickness,'data-edge-thickness':g.right(g.halfHeight)-g.left(g.halfHeight)});
 path(contour,{stroke:'#ffffff','stroke-width':.7,opacity:.62});
 if(!close){
  path([[28,axis],[W-25,axis]],{stroke:'#9ba99b','stroke-width':1.3,'stroke-dasharray':'9 7','data-main-axis':''});
  text(30,axis+(upper?31:-18),'主軸',{'font-size':font-2,fill:'#647c69'});
 }
 const glassX=project([g.thickness/2,0])[0];
 text(glassX,mirror(H-44),'玻璃',{'text-anchor':'middle',fill:'#4b7362'});
 text(close?58:90,mirror(56),'空氣',{'font-size':font-1,fill:'#637c69'});
 text(W-(close?100:180),mirror(56),'空氣',{'font-size':font-1,fill:'#637c69'});
 if(!showRays){text(W/2,H/2,'顯示輔助光路，觀察折射方向。',{'text-anchor':'middle'});return;}
 const start=[(40-offset)/scale,r.enter[1]],end=close?atX(r.exit,r.outgoing,(W-42-offset)/scale):[g.focus,0];
 if(close){
  const p=r[mode],P=project(p),d=mode==='enter'?r.incoming:r.inside,N=mode==='enter'?r.N1:r.N2;
  const refEnd=atX(p,d,(W-55-offset)/scale),Nlength=((mode==='enter'?W-200:W-70)-P[0])/(N[0]*scale),normalEnd=[p[0]+N[0]*Nlength,p[1]+N[1]*Nlength];
  // The exit reference follows the already-refracted inside ray, never horizontal.
  path([P,project(refEnd)],{stroke:reference,'stroke-width':2,'stroke-dasharray':'1 8','stroke-linecap':'round','data-straight-reference':mode,'data-model-from':JSON.stringify(p),'data-model-to':JSON.stringify(refEnd)});
  path([P,project(normalEnd)],{stroke:normal,'stroke-width':2,'stroke-dasharray':'10 7','stroke-linecap':'round','data-surface-normal':mode,'data-model-from':JSON.stringify(p),'data-model-to':JSON.stringify(normalEnd)});
  const A=project(normalEnd),B=project(refEnd);
  if(!compact){
   text(A[0],A[1]+sign*(mode==='enter'?32:-24),'法線',{'text-anchor':'end',fill:normal,'data-line-label':'normal'});
   text(B[0],B[1]-sign*22,'直行參考',{'text-anchor':'end',fill:'#6e8575','font-size':font-1,'data-line-label':'reference'});
  }
 }
 for(const[part,a,b]of [['enter',start,r.enter],['inside',r.enter,r.exit],['exit',r.exit,end]]){
  const A=project(a),B=project(b),points=part==='inside'?[A,B]:[A,[A[0]+(B[0]-A[0])*.57,A[1]+(B[1]-A[1])*.57],B];
  path(points,{stroke:color,'stroke-width':3.2,'stroke-linecap':'round','stroke-linejoin':'round',...(part==='inside'?{}:{'marker-mid':`url(#${id}-arrow)`}),'data-ray-part':part,'data-model-from':JSON.stringify(a),'data-model-to':JSON.stringify(b)});
 }
 for(const[key,n]of [['enter',1],['exit',2]]){
  const P=project(r[key]),active=close&&key===mode,muted=close&&!active,bx=P[0]+(key==='enter'?-13:13),by=P[1]-sign*(close?39:43);
  if(active)el('circle',{cx:P[0],cy:P[1],r:20,fill:`url(#${id}-point)`});
  el('circle',{cx:P[0],cy:P[1],r:active?7:close?5:4.5,fill:active?'#f5d279':'#fffcf1',stroke:muted?'#9aa99b':'#477357','stroke-width':active?2.3:1.7,'data-interface':n,'data-active':String(active)});
  el('circle',{cx:bx,cy:by,r:compact?16:14,fill:active?'#fffae9':'#fafcf5',stroke:muted?'#afbaad':'#62836b','stroke-width':1.4});
  text(bx,by+(compact?8:6),n,{'text-anchor':'middle','font-size':font,'font-weight':active?750:550,fill:muted?'#8c9e8f':ink});
 }
 if(close){const E=project(end);text(W-42,E[1]+sign*(compact?44:37),'朝焦點 F',{'text-anchor':'end','font-size':font-1,'font-weight':650,fill:color,'data-toward-focus':''});}
 else {const F=project([g.focus,0]);el('circle',{cx:F[0],cy:F[1],r:6,fill:'#fff2af',stroke:'#c7a143','stroke-width':1.4,'data-diagram-focus':''});text(F[0]+5,F[1]+(upper?-18:34),'F',{'font-style':'italic','font-weight':750,'font-size':font+4});}
}
