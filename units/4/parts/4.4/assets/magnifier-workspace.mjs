import {bindBenchRuler,createBenchLayout} from './convex-bench-workspace.mjs?v=20261104-convex-unified1';
export const observations=Object.freeze({
 near:{object:30,eye:200,screenIn:false,extensions:false},
 focus:{object:90,eye:200,screenIn:false,extensions:false},
 at_f:{object:100,eye:150,screenIn:false,extensions:false,point:'top'},
 outside:{object:320,eye:200,screenIn:false,extensions:false},
 eye_far:{object:320,eye:300,screenIn:false,extensions:false},
 virtual:{object:60,eye:200,screenIn:false,rays:true,extensions:true},
 screen:{object:60,eye:200,screenIn:true,extensions:false},
 restore:{object:60,eye:200,screenIn:false,extensions:false}
});
export function createMagnifierWorkspace(root,{G,move,observe}){
 let current={object:30,eye:G.eye,screen:95};const layout=createBenchLayout(root),rulers=[];
 for(const key of ['object','eye','screen']){
  const track=root.querySelector(`[data-mag-ruler-track=${key}]`),handle=root.querySelector(`[data-mag-device=${key}]`);
  rulers.push({key,handle,update:bindBenchRuler({track,handle,key,min:G[key+'Min'],max:G[key+'Max'],reverse:key==='object',get:()=>current[key],move})});
 }
 const rows=[...root.querySelectorAll('[data-mag-observation]')];rows.forEach(row=>row.addEventListener('click',()=>observe(observations[row.dataset.magObservation])));
 return {layout:layout.layout,safeRect:layout.safeRect,update(state,rays,extensions){
  current=state;for(const r of rulers){r.update(state[r.key]);r.handle.setAttribute('aria-valuetext',`${r.key==='object'?'圖卡':r.key==='eye'?'眼睛':'比較屏幕'} ${Number((state[r.key]/G.f).toFixed(3))}F`);}
  for(const row of rows){const p=observations[row.dataset.magObservation],active=state.object===p.object&&state.eye===p.eye&&state.screenIn===p.screenIn&&(p.rays===undefined||rays===p.rays)&&extensions===p.extensions;row.dataset.active=String(active);row.querySelector('button').setAttribute('aria-pressed',String(active));}
 }};
}
