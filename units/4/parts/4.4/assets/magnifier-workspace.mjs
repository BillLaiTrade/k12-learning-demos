import {bindBenchRuler,createBenchLayout} from './convex-bench-workspace.mjs?v=20261104-convex-unified1';
// Keep the observer fixed while the object moves outward through the focal point.
export const observations=Object.freeze({
 near:{object:30,screenIn:false,point:'top'},
 focus:{object:90,screenIn:false,point:'top'},
 at_f:{object:100,screenIn:false,point:'top'},
 outside:{object:150,screenIn:false,point:'top'}
});
export function createMagnifierWorkspace(root,{G,move,observe}){
 let current={object:30,eye:G.eye,screen:95};const layout=createBenchLayout(root),rulers=[];
 for(const key of ['object','screen']){
  const track=root.querySelector(`[data-mag-ruler-track=${key}]`),handle=root.querySelector(`[data-mag-device=${key}]`);
  rulers.push({key,handle,update:bindBenchRuler({track,handle,key,min:G[key+'Min'],max:G[key+'Max'],reverse:key==='object',get:()=>current[key],move})});
 }
 const rows=[...root.querySelectorAll('[data-mag-observation]')];rows.forEach(row=>row.addEventListener('click',()=>observe(observations[row.dataset.magObservation])));
 return {layout:layout.layout,safeRect:layout.safeRect,update(state,rays,extensions){
  current=state;for(const r of rulers){r.update(state[r.key]);r.handle.setAttribute('aria-valuetext',`${r.key==='object'?'圖卡':r.key==='eye'?'眼睛':'比較屏幕'} ${Number((state[r.key]/G.f).toFixed(3))}F`);}
  for(const row of rows){const p=observations[row.dataset.magObservation],active=state.object===p.object&&state.screenIn===p.screenIn;row.dataset.active=String(active);row.querySelector('button').setAttribute('aria-pressed',String(active));}
 }};
}
