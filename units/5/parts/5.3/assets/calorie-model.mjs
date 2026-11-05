// 100 g 水與玻璃容器充分攪拌、同溫的集中熱容量模型。
// 有效功率指傳給水與容器的功率，不是加熱板的額定輸入功率。
export const CALORIE_SETUP = Object.freeze({
  mass:100, initial:20, target:21, joulesPerCalorie:4.184,
  waterSpecificHeat:4.184, containerHeatCapacity:42,
  effectivePower:20, heatLossCoefficient:0.5, animationSpeed:4,
});
const s=CALORIE_SETUP;
const capacity=s.mass*s.waterSpecificHeat+s.containerHeatCapacity;
export const HEATING_SECONDS=-capacity/s.heatLossCoefficient
  *Math.log1p(-s.heatLossCoefficient*(s.target-s.initial)/s.effectivePower);

// 有效供熱 = 水吸熱 + 容器吸熱 + 向環境散熱；能量以 J 記錄。
export function calorieObservationAt(seconds){
  if(!Number.isFinite(seconds)||seconds<0)throw new RangeError('觀察時間須為有限的非負值。');
  const elapsed=Math.min(seconds,HEATING_SECONDS), complete=seconds>=HEATING_SECONDS;
  const rise=complete?s.target-s.initial:s.effectivePower/s.heatLossCoefficient
    *-Math.expm1(-s.heatLossCoefficient*elapsed/capacity);
  const waterEnergy=s.mass*s.waterSpecificHeat*rise;
  const containerEnergy=s.containerHeatCapacity*rise;
  const suppliedEnergy=s.effectivePower*elapsed;
  const lostEnergy=Math.max(0,suppliedEnergy-waterEnergy-containerEnergy);
  return {elapsed,complete,rise,temperature:s.initial+rise,waterEnergy,containerEnergy,suppliedEnergy,lostEnergy,waterCalories:waterEnergy/s.joulesPerCalorie};
}
