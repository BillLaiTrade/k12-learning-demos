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
  if(action==='filter'&&sample.water===0)return '過濾需要含有液體的樣本。這份已蒸乾，可另取一份再試。';
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
// Display actual measurements, including contaminated attempts, rather than
// silently substituting the prepared sample's correct solution mass.
export function measuredMasses(sample) {
  const measurements=sample?.measurements||[];
  const last=predicate=>measurements.slice().reverse().find(predicate)||null;
  const raw=last(m=>['raw','settled'].includes(m.phase));
  const filtered=last(m=>m.phase==='filtered');
  const liquid=filtered||raw;
  const solid=last(m=>m.phase==='dry-filtered')||last(m=>m.phase==='dry-raw');
  return {raw,filtered,liquid,solid};
}
export function concentrationEvidence(sample) {
  const {liquid,solid}=measuredMasses(sample);
  if(!liquid||!solid||liquid.phase!=='filtered'||solid.phase!=='dry-filtered')return null;
  return {solution:liquid.mass,solute:solid.mass,percent:solid.mass/liquid.mass*100,ppm:solid.mass/liquid.mass*1e6};
}
export function measurementHint(sample) {
  if(!sample)return '';
  const {liquid,solid}=measuredMasses(sample);
  if(sample.phase==='dry-raw'||solid?.phase==='dry-raw')return '留下的固體還混著泥沙。蒸發之前，你有把泥沙濾掉嗎？這份已蒸乾，可以點擊「＋ 再取一份」重新製作。';
  if(liquid&&liquid.phase!=='filtered'){
    if(sample.water===0)return '蒸發前那筆稱量包含泥沙。你有在過濾後重新稱量濾液嗎？這份已蒸乾，可以另取一份再試。';
    return sample.phase==='filtered'?'過濾後，液體的重量還一樣嗎？你有重新稱量這份濾液嗎？':'這筆重量包含泥沙嗎？計算溶液濃度前，想想是否要先把泥沙分開。';
  }
  return '';
}
export function assessReport(sample,value) {
  const fail=message=>({ok:false,issues:[message],basis:null});
  if(!sample)return fail('先從未知樣本 X 取一份，試著分離出乾燥晶體。');
  const {liquid,solid}=measuredMasses(sample),hint=measurementHint(sample);
  if(hint)return fail(hint);
  if(!liquid)return fail(sample.water===0?'少了一筆蒸發前濾液的淨質量。這份已經蒸乾，可以另取一份再試試。':'還沒有蒸發前濾液的淨質量。想想該稱量哪一份液體？');
  if(sample.water>0)return fail('這份液體還沒蒸乾。把晶體分離出來後，它的淨質量是多少？');
  if(!solid)return fail('乾燥晶體還沒有稱量。用電子秤量量看，它的淨質量是多少？');
  const basis=concentrationEvidence(sample),answer=String(value??'').trim();
  if(!answer||!Number.isFinite(Number(answer))||Number(answer)<0||Number(answer)>100)return fail('請填寫重量百分濃度的數值，百分號已經替你放好了。');
  if(Math.abs(Number(answer)-basis.percent)>1e-6)return fail('用乾燥晶體的淨質量，除以蒸發前濾液的淨質量，再乘以 100%，試著算一次。');
  return {ok:true,issues:[],basis};
}

// All portions are equal, homogenized aliquots of PORTION. A replacement portion
// may supply a missed measurement; all filled numbers must still match actual measurements.
export function assessNotebook(samples,records){
  const fail=(field,message)=>({ok:false,field,issues:[message],basis:null});
  if(!samples.length)return fail(null,'先從未知樣本 X 取一份，試著分離出乾燥晶體。');
  const evidence={};
  for(const [field,title,key,optional] of [['raw-mass','過濾前取樣','raw',true],['solution-mass','蒸發前濾液','filtered',false],['solute-mass','乾燥晶體','solid',false]]){
    const record=records[field]||{},value=String(record.value??'').trim();
    if(!value&&optional)continue;
    if(!value||!Number.isFinite(Number(value))||Number(value)<0)return fail(field,field==='solution-mass'?'請填寫蒸發前濾液的淨質量。若忘記先前讀值，可以另取一份補做稱量。':`請自行讀取電子秤，填寫${title}的淨質量紀錄（克）。`);
    const measurements=samples.map(measuredMasses).map(m=>m[key]).filter(Boolean);
    const eligible=key==='solid'?measurements.filter(m=>m.phase==='dry-filtered'):measurements;
    if(key==='filtered'&&!eligible.length)return fail(field,'還沒有過濾後濾液的稱量紀錄。請過濾並稱量；若原取樣已蒸乾，可以另取一份補量。');
    if(key==='solid'&&!eligible.length&&measurements.some(m=>m.phase==='dry-raw'))return fail(field,'稱到的固體還混著泥沙，不能當作晶體淨質量。請另取一份，先過濾再蒸乾、稱量。');
    if(!eligible.length)return fail(field,`${title}尚未稱量，請自行讀取電子秤後填寫。`);
    const measurement=eligible.find(m=>Math.abs(Number(value)-m.mass)<=1e-6);
    if(!measurement)return fail(field,`${title}紀錄與這次調查的電子秤讀值不同，請重新核對。`);
    evidence[key]=measurement;
  }
  const basis={solution:evidence.filtered.mass,solute:evidence.solid.mass};
  basis.percent=basis.solute/basis.solution*100;
  for(const [field,title,expected] of [['calculation-numerator','晶體淨質量',basis.solute],['calculation-denominator','濾液淨質量',basis.solution]]){
    const value=String(records[field]?.value??'').trim();
    if(!value||!Number.isFinite(Number(value))||Number(value)<0)return fail(field,`請在公式中填入${title}（克）。`);
    if(Math.abs(Number(value)-expected)>1e-6)return fail(field,`公式中的${title}與上方紀錄不同，請重新核對。`);
  }
  const answer=String(records['concentration-value']?.value??'').trim();
  if(!answer||!Number.isFinite(Number(answer))||Number(answer)<0||Number(answer)>100)return fail('concentration-value','請填寫重量百分濃度的數值，百分號已經替你放好了。');
  if(Math.abs(Number(answer)-basis.percent)>1e-6)return fail('concentration-value','用乾燥晶體的淨質量，除以蒸發前濾液的淨質量，再乘以 100%，試著算一次。');
  return {ok:true,issues:[],basis};
}
