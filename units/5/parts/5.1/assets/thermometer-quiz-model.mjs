// One physical water sample per round. Neither instrument identity nor solution
// is announced in accessible labels; the student judges from the engraved scale.
export const ROOM_C = 20;
export const TEMPERATURES_C = [32.5,27.5,34.5,29.5,36.5];
export const TOLERANCE = .3;
export const valueFor = (unit,c) => unit === 'C' ? c : c*9/5+32;
export const celsiusFor = (unit,value) => unit === 'C' ? value : (value-32)*5/9;
export const scaleY = (unit,value) => 510-celsiusFor(unit,value)*10;
export const scaleRange = unit => unit === 'C' ? [0,50] : [32,122];
export function makeRound(index=0, aIsF=false) {
  return {index, waterC:TEMPERATURES_C[index%TEMPERATURES_C.length], aIsF,
    instruments:Object.fromEntries(['A','B'].map((id,i)=>[id,{
      id, unit:(i===0?aIsF:!aIsF)?'F':'C', c:ROOM_C, measured:false,
      initialEye:(i===0?1:-1)*(index%2?-1:1)*60,
      value:'', answerUnit:'', snapshot:null
    }]))};
}
export function assessInstrument(instrument, waterC) {
  const raw=instrument.value.trim(), value=Number(raw);
  const filled=raw!=='' && Number.isFinite(value) && value>=0 && value<=250 && ['C','F'].includes(instrument.answerUnit);
  if(!filled)return {ok:false,kind:'incomplete',message:'請完成量測、填入有效讀值並選擇單位。'};
  if(!instrument.measured || !instrument.snapshot?.stable)return {ok:false,kind:'unstable',message:'這筆作答是在液柱尚未穩定時填寫的；重新放入，等穩定後再確認數字或單位。'};
  if(Math.abs(instrument.snapshot.eye)>3)return {ok:false,kind:'view',message:'這筆作答採用了斜視；讓視線與液面同高，再確認讀值。'};
  const unitCorrect=instrument.answerUnit===instrument.unit;
  const readingCorrect=Math.abs(value-valueFor(instrument.unit,waterC))<=TOLERANCE+1e-9;
  if(!unitCorrect && !readingCorrect)return {ok:false,kind:'both',message:'請重新對照刻度讀值，再用同一杯水的換算關係判斷單位。'};
  if(!unitCorrect)return {ok:false,kind:'unit',message:'刻度讀值合理，再檢查這個數值應配攝氏還是華氏。'};
  if(!readingCorrect)return {ok:false,kind:'reading',message:'單位判斷正確；再找液面附近的兩條刻線，依每小格的間距估讀。'};
  return {ok:true,kind:'correct',message:'讀值與單位都合理。'};
}
