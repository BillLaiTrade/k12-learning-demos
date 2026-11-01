export const WELL_SPEED = 340;
export const WELL_TIMES = Object.freeze([.4, .5, .6, .8]);
export function wellQuestion(time = .4) {
  if (!WELL_TIMES.includes(time)) throw new RangeError('Unknown well');
  return Object.freeze({time, speed: WELL_SPEED, depth: WELL_SPEED * time / 2});
}
export function nextWell(current, random = Math.random()) {
  const choices = WELL_TIMES.filter(time => time !== current.time);
  return wellQuestion(choices[Math.min(choices.length - 1, Math.max(0, Math.floor(random * choices.length)))]);
}
export function gradeWell(value, question, observed) {
  if (!observed) return {result: 'unobserved', message: '先朝井底喊一聲，取得回聲紀錄後再估算。'};
  if (String(value).trim() === '') return {result: 'incomplete', message: '請先填入你估算的井深，單位是公尺。'};
  const depth = Number(value);
  if (!Number.isFinite(depth) || depth <= 0) return {result: 'invalid', message: '井深請填大於零的數字，單位是公尺。'};
  if (Math.abs(depth - question.depth) <= .05) return {result: 'correct', message: '估算正確！聲音走到井底，還要再走回井口。'};
  if (Math.abs(depth - question.depth * 2) <= .05) return {result: 'wrong', message: '你算到的是聲音往返的總路程。井深只有其中一段，再想想要怎麼分。'};
  return {result: 'wrong', message: '再檢查聲速與往返時間的計算；井深是去、回總路程的一半。'};
}
