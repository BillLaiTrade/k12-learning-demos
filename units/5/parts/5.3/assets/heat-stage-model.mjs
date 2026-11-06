import {CALORIE_SETUP} from './calorie-model.mjs';

// 沿用第一區的水／容器／環境參數；自由設定的是水實際吸收的熱量。
export const HEAT_TARGET=Object.freeze({initial:1000,min:100,max:3000});
export const STAGE_ANIMATION_SPEED=30;
const s=CALORIE_SETUP;
const capacity=s.mass*s.waterSpecificHeat+s.containerHeatCapacity;
const waterCapacity=s.mass*s.waterSpecificHeat;
export const validHeatTarget=value=>Number.isFinite(value)&&value>=HEAT_TARGET.min&&value<=HEAT_TARGET.max;

export function secondsForWaterHeat(heat){
  if(!Number.isFinite(heat)||heat<0||heat>HEAT_TARGET.max)throw new RangeError('累計吸熱量須介於0至3000cal。');
  const rise=heat*s.joulesPerCalorie/waterCapacity;
  return -capacity/s.heatLossCoefficient*Math.log1p(-s.heatLossCoefficient*rise/s.effectivePower);
}

export function heatStageObservationAt(seconds,target=HEAT_TARGET.initial){
  if(!Number.isFinite(seconds)||seconds<0||!validHeatTarget(target))throw new RangeError('觀察時間或目標吸熱量無效。');
  const end=secondsForWaterHeat(target),elapsed=Math.min(seconds,end),complete=seconds>=end;
  const rise=complete?target*s.joulesPerCalorie/waterCapacity:
    s.effectivePower/s.heatLossCoefficient*-Math.expm1(-s.heatLossCoefficient*elapsed/capacity);
  const waterEnergy=waterCapacity*rise,containerEnergy=s.containerHeatCapacity*rise,suppliedEnergy=s.effectivePower*elapsed;
  return {elapsed,complete,rise,temperature:s.initial+rise,waterCalories:complete?target:waterEnergy/s.joulesPerCalorie,
    waterEnergy,containerEnergy,suppliedEnergy,lostEnergy:Math.max(0,suppliedEnergy-waterEnergy-containerEnergy)};
}

// 約10～20個取樣點；預設1000cal時每100cal留點，任意小數終點也保留。
export function heatSampleValues(target){
  if(!validHeatTarget(target))throw new RangeError('目標吸熱量無效。');
  const raw=target/10,power=10**Math.floor(Math.log10(raw)),ratio=raw/power;
  const step=power*(ratio>=5?5:ratio>=2?2:1),values=[];
  for(let i=1;i*step<target-1e-8;i++)values.push(i*step);
  values.push(target);return values;
}
