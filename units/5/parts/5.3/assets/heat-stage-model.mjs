import {CALORIE_SETUP} from './calorie-model.mjs';

// 沿用第一區的水／容器／環境參數；本區把同一份水的累計吸熱延伸至2000cal。
export const HEAT_STAGES=Object.freeze([500,1000,2000]);
export const STAGE_ANIMATION_SPEED=50;
const s=CALORIE_SETUP;
const capacity=s.mass*s.waterSpecificHeat+s.containerHeatCapacity;
const waterCapacity=s.mass*s.waterSpecificHeat;
export function secondsForWaterHeat(heat){
  if(!Number.isFinite(heat)||heat<0||heat>HEAT_STAGES.at(-1))throw new RangeError('累計吸熱量須介於0至2000cal。');
  const rise=heat*s.joulesPerCalorie/waterCapacity;
  return -capacity/s.heatLossCoefficient*Math.log1p(-s.heatLossCoefficient*rise/s.effectivePower);
}
export const STAGE_SECONDS=Object.freeze(HEAT_STAGES.map(secondsForWaterHeat));
export function heatStageObservationAt(seconds){
  if(!Number.isFinite(seconds)||seconds<0)throw new RangeError('觀察時間須為有限非負值。');
  const elapsed=Math.min(seconds,STAGE_SECONDS.at(-1));
  const milestone=STAGE_SECONDS.findIndex(t=>Math.abs(elapsed-t)<1e-9);
  const rise=milestone>=0?HEAT_STAGES[milestone]*s.joulesPerCalorie/waterCapacity:
    s.effectivePower/s.heatLossCoefficient*-Math.expm1(-s.heatLossCoefficient*elapsed/capacity);
  const waterEnergy=waterCapacity*rise,containerEnergy=s.containerHeatCapacity*rise;
  const suppliedEnergy=s.effectivePower*elapsed;
  return {elapsed,rise,temperature:s.initial+rise,waterCalories:waterEnergy/s.joulesPerCalorie,
    waterEnergy,containerEnergy,suppliedEnergy,lostEnergy:Math.max(0,suppliedEnergy-waterEnergy-containerEnergy)};
}
