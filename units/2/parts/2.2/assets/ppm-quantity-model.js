export const POOL=Object.freeze({lengthM:10,widthM:5,waterDepthM:2,wallM:.15,freeboardM:.15});
export const SALT=Object.freeze({densityGPerCm3:2.17,nominalGrainM:.002,cellM:.0025,dishDiameterM:.16,fieldWidthM:.24});
export const poolLiters=()=>POOL.lengthM*POOL.widthM*POOL.waterDepthM*1000;
let candidates;
export function saltPortion(massG){
  if(!Number.isFinite(massG)||massG<=0||massG>200)throw new RangeError('Salt mass must be above 0 and at most 200 g');
  const densityGPerM3=SALT.densityGPerCm3*1000000;
  const count=Math.ceil(massG/(densityGPerM3*SALT.nominalGrainM**3));
  const edgeM=Math.cbrt(massG/densityGPerM3/count);
  if(!candidates){
    candidates=[];
    for(let x=-34;x<=34;x++)for(let z=-34;z<=34;z++){
      const radius=Math.hypot(x,z);if(radius>34)continue;
      for(let y=0;y<24;y++)candidates.push({x,y,z,score:radius+y/Math.tan(Math.PI*32/180)});
    }
    candidates.sort((a,b)=>a.score-b.score||a.y-b.y||a.x-b.x||a.z-b.z);
  }
  // Fixed sub-cell variation avoids a repeated grid without enlarging the grains.
  const jitter=n=>(Math.sin(n*127.1+311.7)*43758.5453%1)*.00012;
  const positions=candidates.slice(0,count).map((p,i)=>({x:p.x*SALT.cellM+jitter(i),y:.006+edgeM/2+p.y*SALT.cellM,z:p.z*SALT.cellM+jitter(i+count)}));
  const radiusM=Math.max(...positions.map(p=>Math.hypot(p.x,p.z)))+edgeM*Math.sqrt(2)/2;
  const heightM=Math.max(...positions.map(p=>p.y))+.5*edgeM-.006;
  return {massG,count,edgeM,positions,radiusM,heightM,solidVolumeCm3:massG/SALT.densityGPerCm3,solidVolumeM3:count*edgeM**3};
}
