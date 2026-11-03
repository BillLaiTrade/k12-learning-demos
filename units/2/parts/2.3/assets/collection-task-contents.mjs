// 相對容量的教學模型，並非實測毫升或流量。液體與氣體各自守恆。
export const VESSEL_CAPACITY={flask:(580-212.96)/80,jar:1,tank:(524-377)/119};
const gases=['co2Volume','airVolume','otherVolume'];
export function balanceJar(s){
 const capacity=Math.max(0,1-s.jarWater),total=gases.reduce((n,k)=>n+s[k],0);
 if(total>capacity&&total>0)for(const k of gases)s[k]*=capacity/total;
 else if(total<capacity)s.airVolume+=capacity-total;
}
export function enterGas(s,amount,kind){
 balanceJar(s);const displaced=Math.min(s.jarWater,amount);s.jarWater-=displaced;if(s.jarWater<1e-12)s.jarWater=0;s[kind]+=displaced;
 const exchange=amount-displaced,volume=1-s.jarWater;
 if(exchange>0&&volume>0){const retained=Math.exp(-exchange/volume);for(const k of gases)s[k]*=retained;s[kind]+=volume*(1-retained);}
 s.sampleStarted=true;
}
export function exchangeWithAir(s,amount){
 balanceJar(s);const gas=1-s.jarWater;if(gas<=0)return;
 const retained=Math.exp(-amount/gas);for(const k of ['co2Volume','otherVolume']){const loss=s[k]*(1-retained);s[k]-=loss;s.airVolume+=loss;}
}
function components(s,target){const c=s.contents[target];return target==='flask'?{water:s.flaskWater,acid:s.acid,peroxide:c.peroxide}:{water:Math.max(0,s[target+'Water']-c.acid-c.peroxide),acid:c.acid,peroxide:c.peroxide};}
function save(s,target,v,ratio=1){const c=s.contents[target];if(target==='flask'){s.flaskWater=v.water;s.acid=v.acid;s.reactionUsed*=ratio;}else{s[target+'Water']=v.water+v.acid+v.peroxide;c.acid=v.acid;c.acidUsed*=ratio;}c.peroxide=v.peroxide;c.peroxideUsed*=ratio;}
export function addLiquid(s,target,kind,amount,{viaFunnel=false}={}){
 if(amount<=0)return;const v=components(s,target),old=Object.values(v).reduce((a,b)=>a+b,0),capacity=VESSEL_CAPACITY[target],key=kind==='water'?'water':kind;
 const retained=Math.min(amount,Math.max(0,capacity-old));v[key]+=retained;const excess=amount-retained;
 // 已滿後仍可倒入；溢流時按充分混合的近似交換液體，不憑空累積容量。
 let ratio=1;if(excess>0){ratio=Math.exp(-excess/capacity);for(const k of Object.keys(v))v[k]*=ratio;v[key]+=capacity*(1-ratio);s.overflow={target,viaFunnel,time:s.time,amount:(s.overflow?.target===target?s.overflow.amount:0)+excess};}
 save(s,target,v,ratio);
 if(target==='jar'){balanceJar(s);s.sealedUnderwater=false;if(s.jarWater>=.99999){for(const k of gases)s[k]=0;s.sampleStarted=false;s.uncoveredExtraction=false;s.unpurgedCollection=false;s.sampleExposure='';}}
}
export function drainJar(s,amount){const old=s.jarWater;if(old<=0)return;const v=components(s,'jar'),ratio=Math.max(0,old-amount)/old;for(const k of Object.keys(v))v[k]*=ratio;save(s,'jar',v,ratio);balanceJar(s);}
