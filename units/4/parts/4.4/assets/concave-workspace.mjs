import {bindBenchRuler} from './convex-bench-workspace.mjs?v=20261104-bench-proportion1';
import {concaveObservations as observations} from './concave-optics.mjs?v=20261104-concave1';
export function createConcaveWorkspace(root,{G,move,observe}){
 let current={object:150};const viewport=root.querySelector('[data-ci-viewport]'),track=root.querySelector('[data-ci-ruler-track=object]'),handle=root.querySelector('[data-ci-device=object]');
 const updateRuler=bindBenchRuler({track,handle,key:'object',min:G.objectMin,max:G.objectMax,reverse:true,get:()=>current.object,move});
 const rows=[...root.querySelectorAll('[data-ci-observation]')];for(const row of rows)row.addEventListener('click',()=>observe(observations[row.dataset.ciObservation]));
 function layout(){root.dataset.narrow=String(root.clientWidth<680);root.dataset.compact=String(root.clientWidth<1000);}new ResizeObserver(layout).observe(root);layout();
 return {layout,safeRect(){const tools=root.querySelector('.magnifier-tools'),top=tools.offsetTop+tools.offsetHeight+10;return {left:14,top,width:Math.max(60,viewport.clientWidth-28),height:Math.max(60,viewport.clientHeight-top-42)};},update(state){current=state;updateRuler(state.object);handle.setAttribute('aria-valuetext',`圖卡距透鏡 ${Number((state.object/G.f).toFixed(3))}F`);for(const row of rows){const active=state.object===observations[row.dataset.ciObservation].object;row.dataset.active=String(active);row.querySelector('button').setAttribute('aria-pressed',String(active));}}};
}
