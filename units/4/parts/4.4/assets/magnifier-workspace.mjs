// Each observation is a reproducible set of conditions, shared by the row and controls.
export const observations=Object.freeze({
 near:{object:30,screenIn:false,rays:false,extensions:false},
 focus:{object:90,screenIn:false,rays:false,extensions:false},
 virtual:{object:60,screenIn:false,rays:true,extensions:true},
 screen:{object:60,screenIn:true,rays:false,extensions:false},
 restore:{object:60,screenIn:false,rays:false,extensions:false}
});

export function createMagnifierWorkspace(root,{f,move,observe}){
 const ruler=root.querySelector('[data-mag-device=object]');
 ruler.addEventListener('input',()=>move('object',Number(ruler.value)));
 root.querySelectorAll('[data-mag-position]').forEach(b=>b.addEventListener('click',()=>move('object',Number(b.dataset.magPosition))));
 const rows=[...root.querySelectorAll('[data-mag-observation]')];
 rows.forEach(row=>row.addEventListener('click',e=>{
  if(e.target.closest('a'))return;
  observe(observations[row.dataset.magObservation]);
 }));
 return {update(state,rays,extensions){
  ruler.value=state.object;ruler.setAttribute('aria-valuetext',`${Number((state.object/f).toFixed(3))}F，焦距內`);
  for(const row of rows){const preset=observations[row.dataset.magObservation],active=state.object===preset.object&&state.screenIn===preset.screenIn&&rays===preset.rays&&extensions===preset.extensions;
   row.dataset.active=String(active);row.querySelector('button').setAttribute('aria-pressed',String(active));
  }
  root.querySelectorAll('[data-mag-position]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.magPosition)===state.object)));
 }};
}
