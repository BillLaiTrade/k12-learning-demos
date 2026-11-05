import {CALORIE_SETUP as s} from './calorie-model.mjs';
export const MASS_CHOICES=Object.freeze([100,200,300]);
export const MASS_TARGET_CALORIES=1000;
export const MASS_ANIMATION_SPEED=50;
export function massHeatingSeconds(mass){
  if(!MASS_CHOICES.includes(mass))throw new RangeError('水量須為100、200或300g。');
  const rise=MASS_TARGET_CALORIES*s.joulesPerCalorie/(mass*s.waterSpecificHeat);
  return -(mass*s.waterSpecificHeat+s.containerHeatCapacity)/s.heatLossCoefficient*Math.log1p(-s.heatLossCoefficient*rise/s.effectivePower);
}
export function massObservationAt(mass,seconds){
  const end=massHeatingSeconds(mass);
  if(!Number.isFinite(seconds)||seconds<0)throw new RangeError('時間須為有限非負值。');
  const elapsed=Math.min(seconds,end),complete=seconds>=end,waterCapacity=mass*s.waterSpecificHeat;
  const rise=complete?MASS_TARGET_CALORIES*s.joulesPerCalorie/waterCapacity:s.effectivePower/s.heatLossCoefficient*-Math.expm1(-s.heatLossCoefficient*elapsed/(waterCapacity+s.containerHeatCapacity));
  const waterEnergy=waterCapacity*rise,containerEnergy=s.containerHeatCapacity*rise,suppliedEnergy=s.effectivePower*elapsed;
  return {mass,elapsed,complete,rise,temperature:s.initial+rise,waterCalories:complete?MASS_TARGET_CALORIES:waterEnergy/s.joulesPerCalorie,waterEnergy,containerEnergy,suppliedEnergy,lostEnergy:Math.max(0,suppliedEnergy-waterEnergy-containerEnergy)};
}
