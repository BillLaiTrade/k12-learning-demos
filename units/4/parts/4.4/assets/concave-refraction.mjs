// Same spherical surfaces and rays as the 3D bench; x and y use equal scale.
export function renderConcaveRefraction(svg,g,{rayIndex=0,mode='enter',showRays=true,extensions=true,width=960}={}){
 const ns='http://www.w3.org/2000/svg',r=g.rays[rayIndex],upper=rayIndex===0,sign=upper?1:-1,close=mode!=='overall',compact=width<540;
 const W=compact?520:960,H=close?440:340,S=close?(compact?180:320):(compact?31:55),ox=close?(compact?130:300)-r.enter[0]*S:(compact?330:610),axis=close?(upper?210:H-210)-r.enter[1]*S:(upper?240:100);
 const project=([x,y])=>[ox+x*S,axis+y*S],mirror=y=>upper?y:H-y,color=upper?'#c96130':'#9b6f14',font=compact?27:19,id=`concave-ray-${upper?'upper':'lower'}`;
 const atX=(p,d,x)=>[x,p[1]+(x-p[0])*d[1]/d[0]];
 svg.replaceChildren();svg.setAttribute('viewBox',`0 0 ${W} ${H}`);svg.style.aspectRatio=`${W} / ${H}`;Object.assign(svg.dataset,{rayIndex:String(rayIndex),mode,compact:String(compact)});
 svg.setAttribute('aria-label',`${upper?'上':'下'}方光線${close?(mode==='enter'?'進入玻璃偏向法線':'離開玻璃偏離法線'):'經凹透鏡向外發散'}。`);
 const el=(tag,attrs={},parent=svg)=>{const e=document.createElementNS(ns,tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,String(v));parent.append(e);return e;};
 const path=(pts,attrs={})=>el('path',{d:pts.map((p,i)=>`${i?'L':'M'}${p.join(' ')}`).join(' '),fill:'none',...attrs});
 const text=(x,y,s,attrs={})=>{const e=el('text',{x,y,fill:'#355443','font-size':font,...attrs});e.textContent=s;return e;};
 const defs=el('defs'),grad=el('linearGradient',{id:id+'-glass'},defs);for(const[o,c]of [['0','#9ac6ba'],['.5','#effff8'],['1','#92bfb3']])el('stop',{offset:o,'stop-color':c,'stop-opacity':.75},grad);
 const marker=el('marker',{id:id+'-arrow',viewBox:'0 0 10 10',refX:6,refY:5,markerWidth:4.8,markerHeight:4.8,orient:'auto'},defs);el('path',{d:'M0 1L9 5L0 9Z',fill:color},marker);
 const boundary=[];for(let i=0;i<=180;i++){const y=-g.halfHeight+2*g.halfHeight*i/180;boundary.push(project([g.left(y),y]));}for(let i=180;i>=0;i--){const y=-g.halfHeight+2*g.halfHeight*i/180;boundary.push(project([g.right(y),y]));}
 path([...boundary,boundary[0]],{fill:`url(#${id}-glass)`,stroke:'#78a99a','stroke-width':2,'data-lens-boundary':'concave','data-center-thickness':g.thickness,'data-edge-thickness':g.right(g.halfHeight)-g.left(g.halfHeight)});
 if(!close){path([[20,axis],[W-20,axis]],{stroke:'#9ba99b','stroke-width':1.3,'stroke-dasharray':'9 7','data-main-axis':''});text(25,axis+sign*30,'主軸',{'font-size':font-2});}
 text(project([g.thickness/2,0])[0],mirror(H-45),'玻璃',{'text-anchor':'middle',fill:'#4b7362'});text(45,mirror(50),'空氣',{'font-size':font-2});text(W-90,mirror(close?50:95),'空氣',{'font-size':font-2});
 if(!showRays){text(W/2,H/2,'顯示輔助光路，觀察折射方向。',{'text-anchor':'middle','font-size':font-2});return;}
 const start=[(35-ox)/S,r.enter[1]],end=atX(r.exit,r.outgoing,close?(W-42-ox)/S:(compact?5:4.6));
 if(close){
  const p=r[mode],P=project(p),d=mode==='enter'?r.incoming:r.inside;let N=mode==='enter'?r.N1:r.N2;if(N[0]<0)N=N.map(v=>-v);
  const ref=atX(p,d,(W-60-ox)/S),nx=mode==='enter'?W-220:W-85,nEnd=atX(p,N,(nx-ox)/S);
  path([P,project(ref)],{stroke:'#879a8d','stroke-width':2,'stroke-dasharray':'1 8','stroke-linecap':'round','data-straight-reference':mode,'data-model-from':JSON.stringify(p),'data-model-to':JSON.stringify(ref)});
  path([P,project(nEnd)],{stroke:'#496759','stroke-width':2,'stroke-dasharray':'10 7','data-surface-normal':mode,'data-model-from':JSON.stringify(p),'data-model-to':JSON.stringify(nEnd)});
  if(!compact){const A=project(nEnd),B=project(ref);text(A[0],A[1]+sign*(mode==='enter'?-25:32),'法線',{'text-anchor':'end','font-size':font-1});text(B[0],B[1]+sign*(mode==='enter'?34:24),'直行參考',{'text-anchor':'end','font-size':font-1,fill:'#6e8575'});}
 }else if(extensions){
  path([project([g.focus,0]),project(r.exit)],{stroke:color,'stroke-width':2,'stroke-dasharray':'6 6',opacity:.8,'data-virtual-extension':''});
  const F=project([g.focus,0]);el('circle',{cx:F[0],cy:F[1],r:6,fill:'#fff2af',stroke:'#c7a143'});text(F[0],F[1]+sign*34,'虛焦點 F',{'text-anchor':'middle','font-size':font-2});
 }
 for(const[part,a,b]of [['enter',start,r.enter],['inside',r.enter,r.exit],['exit',r.exit,end]]){const A=project(a),B=project(b),points=part==='inside'?[A,B]:[A,[A[0]+(B[0]-A[0])*.57,A[1]+(B[1]-A[1])*.57],B];path(points,{stroke:color,'stroke-width':3.2,'stroke-linecap':'round',...(part==='inside'?{}:{'marker-mid':`url(#${id}-arrow)`}),'data-ray-part':part,'data-model-from':JSON.stringify(a),'data-model-to':JSON.stringify(b)});}
 for(const[key,n]of [['enter',1],['exit',2]]){const P=project(r[key]),active=close&&key===mode,bx=P[0]+(key==='enter'?-13:13),by=P[1]-sign*39;el('circle',{cx:P[0],cy:P[1],r:active?7:5,fill:active?'#f5d279':'#fffcf1',stroke:'#477357','stroke-width':active?2.3:1.7,'data-interface':n,'data-active':String(active)});el('circle',{cx:bx,cy:by,r:compact?16:14,fill:'#fafcf5',stroke:'#90a894','stroke-width':1.4});text(bx,by+(compact?8:6),n,{'text-anchor':'middle','font-weight':active?750:550});}
}
