// Rows change their stated conditions; unspecified ray visibility follows the user's choice.
export const observations=Object.freeze({
 near:{object:30,screenIn:false,extensions:false},
 focus:{object:90,screenIn:false,extensions:false},
 at_f:{object:100,screenIn:false,extensions:false},
 outside:{object:200,screenIn:false,extensions:false},
 virtual:{object:60,screenIn:false,rays:true,extensions:true},
 screen:{object:60,screenIn:true,extensions:false},
 restore:{object:60,screenIn:false,extensions:false}
});

export function createMagnifierWorkspace(root,{f,min,max,move,observe}){
 const ruler=root.querySelector('[data-mag-device=object]'),track=root.querySelector('[data-mag-ruler-track]');
 let object=min,drag=null;
 track.addEventListener('click',e=>{
  if(e.target.closest('[data-mag-ruler-handle]'))return;
  const mark=e.target.closest('[data-mag-position]');
  if(mark){move('object',Number(mark.dataset.magPosition));return;}
  const rect=track.getBoundingClientRect();if(rect.width)move('object',(1-(e.clientX-rect.left)/rect.width)*max);
 });
 ruler.addEventListener('pointerdown',e=>{
  if(e.button!==0||drag)return;e.preventDefault();ruler.focus({preventScroll:true});ruler.setPointerCapture(e.pointerId);
  drag={id:e.pointerId,x:e.clientX,value:object,width:track.getBoundingClientRect().width};
 });
 ruler.addEventListener('pointermove',e=>{if(drag&&e.pointerId===drag.id&&drag.width)move('object',drag.value-(e.clientX-drag.x)/drag.width*max);});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])ruler.addEventListener(event,e=>{if(e.pointerId===drag?.id)drag=null;});
 const rows=[...root.querySelectorAll('[data-mag-observation]')];
 rows.forEach(row=>row.addEventListener('click',e=>{
  if(e.target.closest('a'))return;
  observe(observations[row.dataset.magObservation]);
 }));
 return {update(state,rays,extensions){
  object=state.object;ruler.style.left=`${(1-object/max)*100}%`;ruler.setAttribute('aria-valuemin',String(min/f));ruler.setAttribute('aria-valuemax',String(max/f));ruler.setAttribute('aria-valuenow',String(Number((object/f).toFixed(3))));ruler.setAttribute('aria-valuetext',`${Number((state.object/f).toFixed(3))}F，${state.object<f?'焦距內':state.object===f?'剛好在焦點':'焦距外'}`);
  for(const row of rows){const preset=observations[row.dataset.magObservation],active=state.object===preset.object&&state.screenIn===preset.screenIn&&(preset.rays===undefined||rays===preset.rays)&&extensions===preset.extensions;
   row.dataset.active=String(active);row.querySelector('button').setAttribute('aria-pressed',String(active));
  }
  root.querySelectorAll('[data-mag-position]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.magPosition)===state.object)));
 }};
}
