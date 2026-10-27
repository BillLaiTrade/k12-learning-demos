// A bounded qualitative teaching model. It does not simulate laboratory timing.
export const MIN_TEMPERATURE = 5;
export const MAX_TEMPERATURE = 60;
export const ICE_DURATION = 20;
export const ICE_FLOAT_DURATION = 8;
export function initialState() {
  return { water:22, probe:22, heating:false, iceRemaining:0, iceTarget:22, mode:'idle', atUpperLimit:false };
}
export function addIce(state) {
  if (state.iceRemaining > 0 || state.water <= MIN_TEMPERATURE + .01) return state;
  return {...state, heating:false, iceRemaining:ICE_DURATION, iceTarget:Math.max(MIN_TEMPERATURE,state.water-8), mode:'cooling', atUpperLimit:false};
}
export function toggleHeat(state) {
  if (state.iceRemaining > 0 || state.water >= MAX_TEMPERATURE) return {...state,heating:false};
  return {...state,heating:!state.heating,mode:state.heating?'stopped':'heating',atUpperLimit:false};
}
export function advance(state, seconds) {
  const dt = Math.max(0,Math.min(.1,seconds));
  let next={...state};
  if(next.heating){
    next.water=Math.min(MAX_TEMPERATURE,next.water+3.5*dt);
    if(next.water===MAX_TEMPERATURE){next.heating=false;next.mode='stopped';next.atUpperLimit=true;}
  }
  if(next.iceRemaining>0){
    const remaining=Math.max(0,next.iceRemaining-dt);
    next.water=remaining===0?next.iceTarget:Math.max(next.iceTarget,next.water-8/ICE_DURATION*dt);
    next.iceRemaining=remaining;
  }
  next.probe+= (next.water-next.probe)*(1-Math.exp(-dt/.45));
  if(!next.heating&&next.iceRemaining===0&&Math.abs(next.probe-next.water)<.01)next.probe=next.water;
  next.probe=Math.max(MIN_TEMPERATURE,Math.min(MAX_TEMPERATURE,next.probe));
  return next;
}
export const fraction = temperature => Math.max(0,Math.min(1,(temperature-MIN_TEMPERATURE)/(MAX_TEMPERATURE-MIN_TEMPERATURE)));
export const isMoving = state => state.heating || state.iceRemaining>0 || state.probe!==state.water;
