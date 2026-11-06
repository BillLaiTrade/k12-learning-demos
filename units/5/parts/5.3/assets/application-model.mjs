import {MATERIALS} from './heat-model.mjs';

export const BOTTLE = Object.freeze({mass:500,initial:50,final:40});

// progress 是放熱觀察的示意進度，不是真實冷卻時間。
export function bottleReading(progress){
  if(!Number.isFinite(progress)||progress<0||progress>1)throw new RangeError('放熱進度須介於0與1。');
  const drop=(BOTTLE.initial-BOTTLE.final)*progress;
  return {temperature:BOTTLE.initial-drop,drop,heat:BOTTLE.mass*MATERIALS.water.c*drop};
}

export const BOTTLE_COMPARISON = Object.freeze({
  water:BOTTLE.mass*MATERIALS.water.c*(BOTTLE.initial-BOTTLE.final),
  aluminum:BOTTLE.mass*MATERIALS.aluminum.c*(BOTTLE.initial-BOTTLE.final)
});
