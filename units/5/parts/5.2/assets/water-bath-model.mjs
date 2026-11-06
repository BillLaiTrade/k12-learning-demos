// Finite, well-mixed teaching reservoirs. SI heat capacities/conductances;
// observation playback is accelerated, not a measured warming-time prediction.
export const ROOM=25, GOAL=35, SPEED=12, TOTAL_WATER=300;
const CP=4.18, BOWL_C=210, DRINK_C=650, CUP_C=50, SIGMA=5.670374419e-8;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
export function createBath(){return {bath:50,drink:20,cup:25,water:TOTAL_WATER,cupWater:0,x:930,bottom:600,wrap:false,mat:false,sleeve:false,cupX:985,cupY:580,time:0,roomEnergy:0,goalAt:null,peak:20};}
export function capacities(s){return {bath:BOWL_C+CP*s.water,drink:DRINK_C,cup:CUP_C+CP*s.cupWater};}
export function energy(s){const c=capacities(s);return c.bath*s.bath+c.drink*s.drink+c.cup*s.cup;}
export function geometry(s){
  const inBowl=Math.abs(s.x-550)<80;let surface=600-s.water/2.5;
  for(let i=0;i<12;i++){const displaced=inBowl?200*clamp((s.bottom-surface)/260,0,1):0;surface=600-(s.water+displaced)/2.5;}
  return {surface,immersion:inBowl?clamp((s.bottom-surface)/230,0,1):0,inBowl};
}
export function positionBottle(s,x,bottom){
  if(!Number.isFinite(x)||!Number.isFinite(bottom))return;
  s.bottom=clamp(bottom,250,600);
  s.x=s.bottom>380?(x>340&&x<760?550:x<=340?160:930):clamp(x,130,950);
}
function surfaceLoss(t,area){return 10*area*(t-ROOM)+.9*SIGMA*area*((t+273.15)**4-(ROOM+273.15)**4);}
function insulatedSide(t){
  // Partial open-front jacket: 35% remains exposed; covered surface solves
  // conduction through insulation = convection+radiation from its outside.
  const area=.035,covered=.65,R=.012/(.04*area*covered);
  let lo=Math.min(t,ROOM),hi=Math.max(t,ROOM);
  for(let i=0;i<22;i++){const mid=(lo+hi)/2,f=(t-mid)/R-surfaceLoss(mid,area*covered);if(f>0)lo=mid;else hi=mid;}
  return surfaceLoss(t,area*(1-covered))+(t-(lo+hi)/2)/R;
}
export function fluxes(s,{ambient=true}={}){
  const g=geometry(s),near=Math.exp(-Math.abs(s.x-550)/160);
  const bare=4.5*g.immersion+.008*near;
  const conductance=s.sleeve?1/(1/Math.max(.00001,bare)+3):bare;
  const between=conductance*(s.bath-s.drink);
  const bath=ambient?((s.wrap?insulatedSide(s.bath):surfaceLoss(s.bath,.035)) +(.18+(s.mat?.12:.95))*(s.bath-ROOM)):0;
  const exposed=1-g.immersion*.75;
  const drink=ambient?surfaceLoss(s.drink,.018*exposed)/(s.sleeve?3:1):0;
  const cup=ambient?surfaceLoss(s.cup,.012):0;
  return {between,bath,drink,cup};
}
export function reached(s){return Math.round(s.drink*10)/10>=GOAL;}
export function advanceBath(s,seconds,options){
  let remaining=Math.max(0,Number.isFinite(seconds)?seconds:0);
  while(remaining>1e-9){const dt=Math.min(.1,remaining),c=capacities(s),q=fluxes(s,options);
    s.bath+=(-q.between-q.bath)*dt/c.bath;s.drink+=(q.between-q.drink)*dt/c.drink;s.cup-=q.cup*dt/c.cup;
    s.roomEnergy+=(q.bath+q.drink+q.cup)*dt;s.time+=dt;s.peak=Math.max(s.peak,s.drink);
    if(s.goalAt===null&&reached(s))s.goalAt=s.time;
    remaining-=dt;
  }return s;
}
export function useCup(s){
  if(s.cupWater===0){const amount=Math.min(50,s.water),cupCapacity=CUP_C+CP*s.cupWater;
    s.cup=(cupCapacity*s.cup+CP*amount*s.bath)/(cupCapacity+CP*amount);s.water-=amount;s.cupWater+=amount;return 'scoop';
  }
  const c=capacities(s),amount=s.cupWater;s.bath=(c.bath*s.bath+CP*amount*s.cup)/(c.bath+CP*amount);s.water+=amount;s.cupWater=0;return 'pour';
}
