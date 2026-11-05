import {createEyeModel} from './eye-model.mjs?v=20261105-correction3';
import {initialCorrection,changeCorrection,correctionState,SPECTACLE} from './correction-optics.mjs?v=20261105-correction3';
const root=document.querySelector('[data-correction-lab]');
if(root){
 const $=s=>root.querySelector(s),$$=s=>[...root.querySelectorAll(s)],svg=$('[data-correction-scene]'),preview=$('[data-correction-preview]');
 const red='#d65b47',blue='#2588ba',CX=302,LX=365.54,SX=CX+353*SPECTACLE,Y=220,SY=160,n=v=>Number(v.toFixed(3)),pt=(x,y)=>`${n(x)} ${n(y)}`;
 const kinds={normal:'正常眼睛',myopia:'近視模型',hyperopia:'遠視模型'},lenses={none:'未加鏡片',concave:'凹透鏡',convex:'凸透鏡'};
 const matchedLens={normal:'none',myopia:'concave',hyperopia:'convex'};
 let state=initialCorrection(),model=null;
 try{model=createEyeModel($('[data-correction-model]'),{correction:true});root.dataset.eyeRender='3d';}catch{root.dataset.eyeRender='fallback';}
 const leader=(x,y,name,tx,ty)=>`<g><path class="eye-leader" d="M${x} ${y+12}V${ty-15}L${tx} ${ty}"/><circle cx="${tx}" cy="${ty}" r="3" fill="#41684b"/><text class="eye-label" x="${x}" y="${y}" text-anchor="middle">${name}</text></g>`;
 function draw(g){
  const rx=CX+353*g.retina,wall=y=>CX+(353-.0025*(y-Y)**2)*g.retina;
  const retina=Array.from({length:61},(_,i)=>100+i*4),band=retina.map((y,i)=>`${i?'L':'M'}${pt(wall(y),y)}`).join('')+retina.toReversed().map(y=>`L${pt(wall(y)+6,y)}`).join('')+'Z';
  let out=`<defs><linearGradient id="eye8-glass"><stop stop-color="#9acfcf" stop-opacity=".7"/><stop offset=".5" stop-color="#efffff" stop-opacity=".85"/><stop offset="1" stop-color="#9bcac2" stop-opacity=".7"/></linearGradient><radialGradient id="eye8-bowl"><stop stop-color="#fffef3"/><stop offset="1" stop-color="#f4e8d0"/></radialGradient>${[red,blue].map((c,i)=>`<marker id="eye8-arrow${i}" markerWidth="7" markerHeight="6" refX="6" refY="3" orient="auto" markerUnits="userSpaceOnUse"><path d="M0 0L7 3L0 6Z" fill="${c}"/></marker>`).join('')}</defs>
  <g data-correction-anatomy><g transform="translate(${CX*(1-g.retina)} 0) scale(${g.retina} 1)"><ellipse data-correction-shell cx="470" cy="220" rx="200" ry="182" fill="#c6d6b0" stroke="#91aa7a" stroke-width="2"/><ellipse cx="470" cy="220" rx="192" ry="174" fill="url(#eye8-bowl)" stroke="#f8fbeb" stroke-width="3"/></g><path data-correction-retina d="${band}" fill="#e9bc87"/><path d="M325 127C269 167 267 272 325 313C302 274 298 170 325 127Z" fill="url(#eye8-glass)" stroke="#91bfcb" stroke-width="1.8"/><ellipse cx="${LX}" cy="220" rx="20.7" ry="70" fill="url(#eye8-glass)" stroke="#81b6c6"/>
  ${state.lens==='none'?'':`<path data-correction-glass d="${state.lens==='concave'?`M${SX-17} 124C${SX-11} 160 ${SX-3} 195 ${SX-3} 220C${SX-3} 245 ${SX-11} 280 ${SX-17} 316H${SX+17}C${SX+11} 280 ${SX+3} 245 ${SX+3} 220C${SX+3} 195 ${SX+11} 160 ${SX+17} 124Z`:`M${SX} 124C${SX-29} 165 ${SX-29} 275 ${SX} 316C${SX+29} 275 ${SX+29} 165 ${SX} 124Z`}" fill="url(#eye8-glass)" stroke="#8ab7ae"/>`}</g>
  <path d="M20 220H746" stroke="#82967c" stroke-width="1.1" stroke-dasharray="7 6" opacity=".55"/>
  <g data-correction-source-inset><rect x="18" y="25" width="116" height="111" rx="12" fill="#fdfcf0" stroke="#b6c8a5"/><text class="correction-source-title" x="76" y="49" text-anchor="middle">遠方圖卡</text><rect x="31" y="59" width="30" height="63" rx="5" fill="#fffef8" stroke="#c8d4b9"/><path d="M46 70V111" stroke="#769367" stroke-width="2.5"/><g opacity="${state.point==='bottom'?.35:1}"><path d="M46 65L39 78H53Z" fill="${red}"/><text class="correction-source-point" x="78" y="79" fill="${red}">上端</text></g><g opacity="${state.point==='top'?.35:1}"><circle cx="46" cy="111" r="5" fill="${blue}"/><text class="correction-source-point" x="78" y="114" fill="${blue}">下端</text></g></g>
  <text class="correction-incoming-label" x="91" y="348" text-anchor="middle">來自遠方圖卡的光</text>`;
  if(state.rays){
   for(const r of g.rays.filter(r=>state.point==='both'||state.point===r.name)){
    const c=r.name==='top'?red:blue,yy=Y+r.retinaY*SY,end=[wall(yy),yy],points=[[18,Y+(r.spectacleY-r.incoming*(SX-18)/353)*SY],[SX,Y+r.spectacleY*SY],[CX,Y+r.corneaY*SY],[LX,Y+r.lensY*SY],end];
    out+=`<path class="eye-ray" data-correction-ray="${r.name}" d="${points.map(([x,y],i)=>`${i?'L':'M'}${pt(x,y)}`).join('')}" stroke="${c}"/>`;
    for(const [a,b]of [[points[0],points[1]],[points[1],points[2]],[points[3],points[4]]]){const x=a[0]+(b[0]-a[0])*.62,y=a[1]+(b[1]-a[1])*.62;out+=`<path d="M${pt(x-(b[0]-a[0])*.025,y-(b[1]-a[1])*.025)}L${pt(x,y)}" stroke="${c}" stroke-width="2" marker-end="url(#eye8-arrow${r.name==='top'?0:1})"/>`;}
    out+=`<circle data-correction-hit="${r.name}" cx="${n(end[0])}" cy="${n(end[1])}" r="${g.clear?3:3.8}" fill="${c}" opacity="${g.clear?1:.7}"/>`;
    if(g.position==='behind'){
     const fx=Math.min(742,CX+353*g.focus),fy=Y+(r.lensY+((fx-CX)/353-.18)*r.outgoing)*SY;
     out+=`<path data-correction-extension="${r.name}" d="M${pt(...end)}L${pt(fx,fy)}" fill="none" stroke="#788477" stroke-width="1.5" stroke-dasharray="4 5" opacity=".8"/>`;
    }
   }
   if(g.position==='before'){
    const fx=CX+353*g.focus;out+=`<path data-correction-focus d="M${n(fx)} 178V262" stroke="#b69950" stroke-width="1.3" stroke-dasharray="4 5"/>`;
   }
  }
  out+=state.lens==='none'?`<text class="eye-caption" x="${SX}" y="85" text-anchor="middle">未加鏡片</text>`:leader(SX,85,lenses[state.lens],SX,128);
  out+=leader(277,71,'角膜',285,178)+leader(414,47,'水晶體',LX,173)+leader(609,71,'視網膜',wall(154)+3,154);
  const hitYs=g.rays.map(r=>Y+r.retinaY*SY),top=Math.min(...hitYs)-9,bottom=Math.max(...hitYs)+9,bx=rx+13;
  out+=`<g data-correction-region><path class="eye-region-bracket" d="M${bx-5} ${n(top)}H${bx}Q${bx+5} ${n(top)} ${bx+5} ${n(top+5)}V${n(bottom-5)}Q${bx+5} ${n(bottom)} ${bx} ${n(bottom)}H${bx-5}"/><rect class="eye-region-box" x="${bx-13}" y="${n(bottom+12)}" width="65" height="30" rx="7"/><text class="eye-region-label" x="${bx+19.5}" y="${n(bottom+33)}" text-anchor="middle">成像區</text></g>`;
  if(!g.clear)out+=`<text class="correction-focus-label" x="520" y="365" text-anchor="middle">會聚位置：視網膜${g.position==='before'?'前':'後'}${g.position==='behind'&&state.rays?'（灰虛線：假想延伸）':''}</text>`;
  svg.innerHTML=out;
  const message=g.clear?'光在視網膜上各自成像，圖案清楚。':`會聚位置在視網膜${g.position==='before'?'前':'後'}，視網膜上的圖案模糊。`;
  svg.setAttribute('aria-label',`${kinds[state.kind]}，${lenses[state.lens]}。${message}`);
  preview.innerHTML=`<defs><filter id="eye8-preview-blur"><feGaussianBlur stdDeviation="${n(g.blur)}"/></filter></defs><g filter="url(#eye8-preview-blur)"><path d="M100 52V145" stroke="#769367" stroke-width="4"/><circle data-correction-image-blue cx="100" cy="50" r="10" fill="${blue}"/><path data-correction-image-red d="M100 157L88 135H112Z" fill="${red}"/></g>`;
  preview.setAttribute('aria-label',`視網膜上的倒立${g.clear?'清楚':'模糊'}圖案，僅比較清晰程度的放大示意`);
  $('[data-result]').textContent=`${kinds[state.kind]}，${lenses[state.lens]}。${message}`;
 }
 function render(){
  const g=correctionState(state);draw(g);model?.update({retina:g.retina,lens:state.lens});
  for(const key of ['kind','lens','point'])$$(`[data-correction-${key}]`).forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset['correction'+key[0].toUpperCase()+key.slice(1)]===state[key]));if(key==='point')b.disabled=!state.rays;});
  const toggle=$('[data-correction-rays]');toggle.setAttribute('aria-pressed',String(state.rays));toggle.textContent=state.rays?'隱藏輔助光路':'顯示輔助光路';
  $('[data-correction-condition]').textContent=`${kinds[state.kind]}・${state.lens==='none'?'未加鏡片':'已加'+lenses[state.lens]}`;
  const status=$('[data-correction-status]');status.textContent=g.clear?(state.lens==='none'?'正常眼睛・清楚成像':'已矯正・清楚成像'):'尚未清楚成像';status.dataset.clear=g.clear;
  $('[data-correction-copy]').textContent=g.clear?'同一物點的光，\n在視網膜上會聚。':g.position==='before'?'會聚位置在視網膜前，\n光到達時已再次散開。':'光到達視網膜時，\n尚未會聚成清楚像點。';
  $('[data-correction-explanation]').textContent=state.lens==='none'?(state.kind==='normal'?'眼睛的會聚能力與眼軸長度配合，能在視網膜上清楚成像。':state.kind==='myopia'?'此模型眼軸較長，光先在視網膜前會聚。':'此模型眼軸較短，光到達視網膜時尚未會聚。'):`${lenses[state.lens]}先${state.lens==='concave'?'使光束較發散':'增加光束的會聚作用'}，${g.clear?'再由眼睛會聚到視網膜。':`整體會聚位置${state.lens==='concave'?'往後':'往前'}移，目前仍未落在視網膜上。`}`;
  $$('[data-correction-row]').forEach(row=>{const kind=row.dataset.correctionRow;row.dataset.active=String(kind===state.kind);row.querySelectorAll('[data-correction-case]').forEach(b=>{const lens=b.dataset.correctionCase==='bare'?'none':matchedLens[kind];b.setAttribute('aria-pressed',String(state.kind===kind&&state.lens===lens));});});
  Object.assign(root.dataset,{ready:'true',kind:state.kind,lens:state.lens,point:state.point,rays:state.rays,clear:g.clear,position:g.position,focus:g.focus,retina:g.retina,power:g.power});
 }
 root.addEventListener('click',e=>{const row=e.target.closest('[data-correction-row]');if(row){const mode=e.target.closest('[data-correction-case]')?.dataset.correctionCase||e.target.closest('[data-correction-view]')?.dataset.correctionView||'bare';state=changeCorrection(state,'kind',row.dataset.correctionRow);if(mode==='corrected')state=changeCorrection(state,'lens',matchedLens[state.kind]);render();return;}const b=e.target.closest('button');if(!b)return;if(b.hasAttribute('data-correction-reset'))state=initialCorrection();else if(b.hasAttribute('data-correction-rays'))state=changeCorrection(state,'rays',!state.rays);else{const key=['kind','lens','point'].find(k=>b.hasAttribute(`data-correction-${k}`));if(!key)return;state=changeCorrection(state,key,b.getAttribute(`data-correction-${key}`));}render();});
 render();
}
