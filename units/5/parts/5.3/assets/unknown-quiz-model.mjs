export const QUIZ_MASS = 100;
export const QUIZ_INITIAL = 20;
const SPECIFIC_HEATS = [.2,.25,.4,.5];

export function makeQuestion({specificHeat=.2,heat=500,waterLetter='a'}={}){
  if(!Number.isFinite(specificHeat)||specificHeat<=0||!Number.isFinite(heat)||heat<=0||!['a','b'].includes(waterLetter))throw new RangeError('小測樣品條件無效。');
  const unknownLetter=waterLetter==='a'?'b':'a';
  const samples={
    [waterLetter]:Object.freeze({kind:'water',c:1}),
    [unknownLetter]:Object.freeze({kind:'unknown',c:specificHeat})
  };
  return Object.freeze({mass:QUIZ_MASS,initial:QUIZ_INITIAL,heat,waterLetter,unknownLetter,samples:Object.freeze(samples)});
}

export const QUESTION_SET=Object.freeze(SPECIFIC_HEATS.flatMap(specificHeat=>[500,1000].flatMap(heat=>['a','b'].map(waterLetter=>makeQuestion({specificHeat,heat,waterLetter})))));

// 進度是樣品吸收熱量的比例，不代表實際加熱時間、功率或效率。
export function observeQuestion(question,progress){
  if(!Number.isFinite(progress)||progress<0||progress>1)throw new RangeError('觀察進度須介於0與1。');
  const heat=question.heat*progress;
  const samples=Object.fromEntries(['a','b'].map(letter=>{
    const rise=heat/(question.mass*question.samples[letter].c);
    return [letter,{rise,temperature:question.initial+rise}];
  }));
  return {heat,samples};
}

export function gradeQuestion(question,submission){
  const end=observeQuestion(question,1);
  const numberState=(value,expected,tolerance)=>{
    if(value===undefined||value===null||String(value).trim()==='')return 'missing';
    const n=Number(value);
    if(!Number.isFinite(n)||n<=0)return 'invalid';
    return Math.abs(n-expected)<=tolerance+1e-9?'correct':'incorrect';
  };
  const ca=question.samples.a.c,cb=question.samples.b.c;
  const comparison=ca===cb?'same':ca>cb?'a':'b';
  const fields={
    riseA:numberState(submission.riseA,end.samples.a.rise,.05),
    riseB:numberState(submission.riseB,end.samples.b.rise,.05),
    specificHeat:numberState(submission.specificHeat,question.samples[question.unknownLetter].c,.005),
    comparison:!submission.comparison?'missing':!['a','b','same'].includes(submission.comparison)?'invalid':submission.comparison===comparison?'correct':'incorrect'
  };
  return {fields,correct:Object.values(fields).every(value=>value==='correct')};
}
