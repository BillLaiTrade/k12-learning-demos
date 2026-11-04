// 相對容量的教學模型，並非實測毫升或流量。液體與氣體各自守恆。
export const VESSEL_CAPACITY={flask:(580-212.96)/80,jar:1,tank:(524-377)/119};
// 液位各自正規化；水槽約能容納八瓶此集氣瓶的液量，不是實測毫升。
export const LIQUID_SCALE={flask:1,jar:1,tank:8};
const gases=['co2Volume','airVolume','otherVolume'];
export function balanceJar(s){
 const capacity=Math.max(0,1-s.jarWater),total=gases.reduce((n,k)=>n+s[k],0);
 if(total>capacity&&total>0)for(const k of gases)s[k]*=capacity/total;
 else if(total<capacity)s.airVolume+=capacity-total;
}
export function enterGas(s,amount,kind){
 balanceJar(s);const displaced=Math.min(s.jarWater,amount);transferLiquid(s,'jar',displaced,s.jarPlace>.99&&s.selected.includes('tank')?'tank':null);if(s.jarWater<1e-12)s.jarWater=0;s[kind]+=displaced;
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
export const liquidClean=(s,target)=>{const c=s.contents[target];return !(c.contaminants?.length||c.acid||c.peroxide||c.catalyst||c.stones?.length);};
function markContact(s,target,v){const c=s.contents[target];c.contaminants??=[];for(const key of ['acid','peroxide'])if(v[key]>1e-12&&(target!=='flask'||key==='peroxide')&&!c.contaminants.includes(key))c.contaminants.push(key);}
export function takeLiquid(s,target,amount){const v=components(s,target),old=Object.values(v).reduce((a,b)=>a+b,0),fraction=old>0?Math.min(1,amount/old):0,c=s.contents[target],usedAcid=target==='flask'?s.reactionUsed:c.acidUsed||0;
 const parcel={...Object.fromEntries(Object.entries(v).map(([k,x])=>[k,x*fraction])),acidUsed:usedAcid*fraction,peroxideUsed:c.peroxideUsed*fraction};for(const k of Object.keys(v))v[k]*=1-fraction;save(s,target,v,1-fraction);return parcel;}
function receive(s,target,parcel,{viaFunnel=false,receiver=null}={}){
 const capacity=VESSEL_CAPACITY[target],v=components(s,target),old=Object.values(v).reduce((a,b)=>a+b,0),amount=parcel.water+parcel.acid+parcel.peroxide;if(amount<=1e-12)return;
 markContact(s,target,parcel);const kept=Math.min(amount,Math.max(0,capacity-old)),f=kept/amount,c=s.contents[target];for(const k of ['water','acid','peroxide'])v[k]+=parcel[k]*f;
 save(s,target,v);if(target==='flask')s.reactionUsed+=parcel.acidUsed*f;else c.acidUsed+=parcel.acidUsed*f;c.peroxideUsed+=parcel.peroxideUsed*f;
 const excess=amount-kept;
 if(excess>1e-12){const oldValues=components(s,target),ratio=Math.exp(-excess/capacity),out={water:0,acid:0,peroxide:0,acidUsed:0,peroxideUsed:0};
  for(const k of ['water','acid','peroxide']){const after=oldValues[k]*ratio+capacity*(parcel[k]/amount)*(1-ratio);out[k]=oldValues[k]+parcel[k]*(1-f)-after;oldValues[k]=after;}
  const beforeAcid=target==='flask'?s.reactionUsed:c.acidUsed,beforePeroxide=c.peroxideUsed;out.acidUsed=beforeAcid*(1-ratio)+parcel.acidUsed*(1-f);out.peroxideUsed=beforePeroxide*(1-ratio)+parcel.peroxideUsed*(1-f);
  save(s,target,oldValues,ratio); // 新流入已反應液的比例一併保留。
  const usedAfterAcid=capacity*(parcel.acidUsed/amount)*(1-ratio),usedAfterPeroxide=capacity*(parcel.peroxideUsed/amount)*(1-ratio);if(target==='flask')s.reactionUsed+=usedAfterAcid;else c.acidUsed+=usedAfterAcid;c.peroxideUsed+=usedAfterPeroxide;out.acidUsed-=usedAfterAcid;out.peroxideUsed-=usedAfterPeroxide;
  s.overflow={target,receiver,viaFunnel,time:s.time,amount:(s.overflow?.target===target?s.overflow.amount:0)+excess};
  deliver(s,target,receiver,out);
 }
 if(target==='jar'){balanceJar(s);s.sealedUnderwater=false;if(s.jarWater>=.99999){for(const k of gases)s[k]=0;s.sampleStarted=false;s.uncoveredExtraction=false;s.unpurgedCollection=false;s.sampleExposure='';}}
}
function deliver(s,from,to,parcel){if(!to||from===to)return;const scale=LIQUID_SCALE[from]/LIQUID_SCALE[to];receive(s,to,Object.fromEntries(Object.entries(parcel).map(([k,v])=>[k,v*scale])));}
export function transferLiquid(s,from,amount,to){const parcel=takeLiquid(s,from,amount);deliver(s,from,to,parcel);return parcel;}
export function addLiquid(s,target,kind,amount,options={}){if(amount<=0)return;receive(s,target,{water:kind==='water'?amount:0,acid:kind==='acid'?amount:0,peroxide:kind==='peroxide'?amount:0,acidUsed:0,peroxideUsed:0},options);}
export function drainJar(s,amount,receiver=null){transferLiquid(s,'jar',amount,receiver);balanceJar(s);}
