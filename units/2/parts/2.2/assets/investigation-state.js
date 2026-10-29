// A prepared teaching mixture, not a chemical identification experiment.
// Each homogenized aliquot: 2 g insoluble sand + 5 g NaCl + 95 g water.
export const PORTION = Object.freeze({sand:2,salt:5,water:95});
export const DURATION = Object.freeze({sample:2800,settle:5500,filter:6500,heat:10500,weigh:1800});
export function newSample(id) {
  return {id,phase:'raw',...PORTION,residues:[],events:[],measurements:[]};
}
export function totalMass(sample) { return sample.sand+sample.salt+sample.water; }
export function canTest(sample,action) {
  if(!sample)return '先從樣本瓶取一份，再選用器材。';
  if(action==='filter'&&sample.water===0)return '這份只剩乾燥固體，無法直接倒入濾紙。可以換一份取樣繼續測試。';
  if(action==='heat'&&sample.water===0)return '這份樣本已經蒸乾；目前沒有液體可繼續蒸發。';
  if(action==='settle'&&(sample.water===0||sample.sand===0))return '這份目前沒有可沉降的懸浮顆粒。';
  return '';
}
export function finishTest(sample,action) {
  const reason=canTest(sample,action);if(reason)throw new Error(reason);
  const next={...sample,residues:[...sample.residues],events:[...sample.events],measurements:[...sample.measurements]};
  const before={sand:sample.sand,salt:sample.salt,water:sample.water,phase:sample.phase,mass:totalMass(sample)};
  let observation='';
  if(action==='settle'){
    next.phase='settled';observation='靜置後，褐色顆粒沉到杯底，上層液體較清澈。';
  }else if(action==='filter'){
    next.sand=0;next.phase='filtered';next.residues.push(sample.sand);
    observation=sample.sand>0?'褐色顆粒留在濾紙上，透明的濾液流入杯中。':'再次過濾，濾紙未見新的褐色顆粒，液體仍通過濾紙。';
  }else if(action==='heat'){
    next.water=0;next.phase=sample.sand>0?'dry-raw':'dry-filtered';
    observation=sample.sand>0?'液體逐漸減少，蒸乾後留下白色固體與褐色顆粒混在一起。':'透明濾液逐漸減少，蒸乾後留下白色固體。';
  }else if(action==='weigh'){
    const description=sample.water===0?(sample.sand>0?'乾燥混合殘渣':'乾燥白色固體'):(sample.sand>0?'含顆粒的取樣':'過濾後的液體');
    observation=`${description}的淨質量為 ${totalMass(sample)} 克（已扣除容器質量）。`;
    next.measurements.push({phase:sample.phase,mass:totalMass(sample)});
  }else throw new Error('Unknown test');
  const event={id:`${sample.id}-${next.events.length+1}`,sampleId:sample.id,action,before,after:{sand:next.sand,salt:next.salt,water:next.water,phase:next.phase,mass:totalMass(next)},observation};
  next.events.push(event);return {sample:next,event};
}
export const phaseName=sample=>sample.water===0?(sample.sand>0?'混合殘渣':'白色固體'):sample.phase==='filtered'?'濾液':sample.phase==='settled'?'已沉降':'原樣本';
export const actionName=action=>({sample:'取樣',settle:'靜置觀察',filter:'過濾',heat:'蒸發',weigh:'稱量'})[action];
export function evidenceSupports(event,component) {
  if(!event)return false;
  if(component==='sand')return event.before.sand>0&&(event.action==='filter'||event.action==='settle');
  if(component==='salt')return event.action==='heat'&&event.before.sand===0&&event.before.salt>0&&event.before.water>0;
  if(component==='water')return event.action==='heat'&&event.before.water>0&&event.after.water===0;
  return false;
}
export function concentrationEvidence(sample) {
  if(!sample)return null;
  const liquid=sample.measurements.find(m=>m.phase==='filtered');
  const solid=sample.measurements.find(m=>m.phase==='dry-filtered');
  if(!liquid||!solid)return null;
  return {solution:liquid.mass,solute:solid.mass,percent:solid.mass/liquid.mass*100,ppm:solid.mass/liquid.mass*1e6};
}
export function assessReport(records,components,evidence,concentration=null) {
  const issues=[];
  if(!records.length)return {ok:false,issues:['先把你做過的測試記進實驗筆記，再用觀察支持推論。']};
  const hints={sand:'泥沙：可用靜置或過濾留下顆粒的紀錄支持。',salt:'食鹽：混合殘渣還不能分辨；找找沒有泥沙的液體蒸乾後，是否仍留下白色固體。',water:'水：可用液體在蒸發過程中逐漸減少的紀錄支持。'};
  for(const component of ['sand','salt','water']){
    if(!components.includes(component)){issues.push(`還有一種成分未列入推論。${hints[component]}`);continue;}
    const record=records.find(r=>r.id===evidence[component]);
    if(!evidenceSupports(record?.event,component))issues.push(hints[component]);
  }
  if(concentration){
    const {basis,value,unit}=concentration;
    if(!basis)issues.push('濃度紀錄還缺同一份取樣在「過濾後、蒸發前」與「完全乾燥後」的兩次淨質量。含泥沙的總質量不能直接當成溶液質量。');
    else if(value===''||!Number.isFinite(Number(value))||Math.abs(Number(value)-basis[unit])>1e-6)issues.push('請以乾燥白色固體質量 ÷ 蒸發前濾液總質量，依所選單位乘以 100% 或 1,000,000。');
  }
  return {ok:issues.length===0,issues};
}
