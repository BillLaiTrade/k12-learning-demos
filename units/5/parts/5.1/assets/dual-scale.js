// One physical temperature, independently graduated Celsius and Fahrenheit scales.
(()=>{
const $=id=>document.getElementById(id), svgNS='http://www.w3.org/2000/svg';
const MIN=-40,MAX=100,celsiusY=c=>560-(c-MIN)/(MAX-MIN)*430;
const fahrenheitY=f=>celsiusY((f-32)*5/9);
const rounded=n=>Number(n.toFixed(1)),format=n=>String(rounded(n)).replace('-', '−');
const operand=n=>String(Number(n.toFixed(6))).replace('-', '−');
let temperature=25,repeatDelay=0,repeatTimer=0,guidePointer=null,guideOffset=0;
function stopRepeating(){clearTimeout(repeatDelay);clearInterval(repeatTimer);repeatDelay=repeatTimer=0;}
function mark(group,degree,y,left){
  const major=degree%20===0,medium=degree%5===0,length=major?12:medium?8:4;
  const n=document.createElementNS(svgNS,'line');
  Object.entries({'data-degree':degree,x1:left?120-length:140,x2:left?120:140+length,y1:y,y2:y,'stroke-width':major?1.2:.65}).forEach(([k,v])=>n.setAttribute(k,String(v)));
  group.append(n);
}
function label(group,value,y,left){
  const n=document.createElementNS(svgNS,'text');
  Object.entries({'data-degree':value,x:left?100:160,y,'text-anchor':left?'end':'start',class:'dual-scale-label'}).forEach(([k,v])=>n.setAttribute(k,String(v)));
  n.textContent=String(value).replace('-', '−');group.append(n);
}
for(let c=MIN;c<=MAX;c++){
  mark($('dual-scale-c'),c,celsiusY(c),true);
  if(c%20===0)label($('dual-scale-c'),c,celsiusY(c),true);
}
for(let f=-40;f<=212;f++){
  mark($('dual-scale-f'),f,fahrenheitY(f),false);
  // Avoid overlapping 32°F and 40°F labels in the extended scale.
  if((f%40===0&&f!==40)||f===32||f===212)label($('dual-scale-f'),f,fahrenheitY(f),false);
}
function clearError(){ $('dual-input-error').textContent='';$('dual-temperature').removeAttribute('aria-invalid'); }
function updateUnit(){
  const isC=$('dual-unit').value==='C';
  $('dual-temperature').min=MIN;$('dual-temperature').max=isC?MAX:212;
  $('dual-input-range').textContent=isC?'量程：−40～100°C':'量程：−40～212°F';
  clearError();
}
function showFormula(target,before,numerator,denominator,after){
  const fraction=document.createElement('span');fraction.className='dual-fraction';
  for(const value of [numerator,denominator]){const part=document.createElement('span');part.textContent=value;fraction.append(part);}
  target.replaceChildren(document.createTextNode(before),fraction,document.createTextNode(after));
  target.setAttribute('role','math');target.setAttribute('aria-label',`${before}${numerator}/${denominator}${after}`);
}
function render(){
  const c=temperature,f=c*9/5+32,y=celsiusY(c),isC=$('dual-unit').value==='C';
  const meniscus=`M124 ${y-1}Q130 ${y+1} 136 ${y-1}`;
  $('dual-liquid').setAttribute('d',`${meniscus}V614H124Z`);
  $('dual-meniscus').setAttribute('d',meniscus);
  $('dual-guide').setAttribute('y1',y);$('dual-guide').setAttribute('y2',y);
  $('dual-guide-hit').setAttribute('y',y-22);$('dual-guide-handle').setAttribute('cy',y);
  $('dual-guide-control').setAttribute('aria-valuenow',c);
  $('dual-guide-control').setAttribute('aria-valuetext',`${format(c)}°C，${format(f)}°F`);
  const approx=Math.abs(rounded(c)-c)>1e-8||Math.abs(rounded(f)-f)>1e-8;
  $('dual-celsius').textContent=`${format(c)}°C`;$('dual-fahrenheit').textContent=`${format(f)}°F`;
  $('dual-equality').textContent=approx?'≈':'＝';
  showFormula($('dual-rule'),isC?'°F ＝ °C × ':'°C ＝（°F − 32）× ',isC?9:5,isC?5:9,isC?' ＋ 32':'');
  const target=isC?f:c,sign=Math.abs(rounded(target)-target)>1e-8?'≈':'＝';
  showFormula($('dual-formula'),isC?`${operand(c)} × `:`（${operand(f)} − 32）× `,isC?9:5,isC?5:9,isC?` ＋ 32 ${sign} ${format(f)}`:` ${sign} ${format(c)}`);
  $('dual-temperature').value=Number((isC?c:f).toFixed(6));
  $('dual-thermometer').setAttribute('aria-label',`同一根液柱，攝氏 ${operand(c)} 度與華氏 ${operand(f)} 度位於同一液面高度。攝氏每 1 度的間距為華氏每 1 度的 1.8 倍。`);
  $('dual-cool').disabled=c<=MIN;$('dual-warm').disabled=c>=MAX;
  document.querySelectorAll('#card-03 [data-dual-preset]').forEach(button=>button.setAttribute('aria-pressed',String(Math.abs(Number(button.dataset.dualPreset)-c)<1e-8)));
  clearError();
}
const guide=$('dual-guide-control');
function stopGuideDrag(){
  const pointer=guidePointer;guidePointer=null;guide.removeAttribute('data-dragging');
  if(pointer!==null&&guide.hasPointerCapture(pointer))guide.releasePointerCapture(pointer);
}
function pointerY(event){
  const matrix=$('dual-thermometer').getScreenCTM();
  return matrix?new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse()).y:null;
}
guide.addEventListener('pointerdown',event=>{
  if(event.button!==0||!event.isPrimary)return;
  const y=pointerY(event);if(y===null)return;
  event.preventDefault();stopRepeating();stopGuideDrag();
  guideOffset=y-celsiusY(temperature);guidePointer=event.pointerId;
  guide.setPointerCapture(event.pointerId);guide.setAttribute('data-dragging','');guide.focus({preventScroll:true});
});
guide.addEventListener('pointermove',event=>{
  if(event.pointerId!==guidePointer)return;
  const y=pointerY(event);if(y===null)return;
  temperature=rounded(Math.max(MIN,Math.min(MAX,MIN+(560-(y-guideOffset))/430*(MAX-MIN))));
  render();
});
for(const name of ['pointerup','pointercancel','lostpointercapture'])guide.addEventListener(name,event=>{
  if(event.pointerId===guidePointer)stopGuideDrag();
});
guide.addEventListener('keydown',event=>{
  const amounts={ArrowUp:1,ArrowRight:1,ArrowDown:-1,ArrowLeft:-1,PageUp:10,PageDown:-10};
  if(!(event.key in amounts)&&event.key!=='Home'&&event.key!=='End')return;
  event.preventDefault();stopRepeating();stopGuideDrag();
  temperature=event.key==='Home'?MIN:event.key==='End'?MAX:Math.min(MAX,Math.max(MIN,temperature+amounts[event.key]));render();
});
function changeTemperature(delta){
  stopGuideDrag();temperature=Math.min(MAX,Math.max(MIN,temperature+delta));render();
}
for(const [id,delta] of [['dual-cool',-1],['dual-warm',1]]){
  const button=$(id);
  button.addEventListener('pointerdown',event=>{
    if(event.button!==0||!event.isPrimary)return;
    stopRepeating();button.setPointerCapture(event.pointerId);changeTemperature(delta);
    if(button.disabled)return;
    repeatDelay=setTimeout(()=>{repeatTimer=setInterval(()=>{
      if(button.disabled){stopRepeating();return;}changeTemperature(delta);
    },120);},350);
  });
  // Pointer actions already step on press; native keyboard / assistive clicks step here.
  button.addEventListener('click',event=>{if(event.detail===0){stopRepeating();changeTemperature(delta);}});
  for(const name of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(name,stopRepeating);
}
window.addEventListener('blur',()=>{stopRepeating();stopGuideDrag();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){stopRepeating();stopGuideDrag();}});
$('dual-unit').addEventListener('change',updateUnit);
$('dual-temperature').addEventListener('input',clearError);
$('dual-entry').addEventListener('submit',event=>{
  event.preventDefault();stopRepeating();stopGuideDrag();
  const input=$('dual-temperature'),value=input.valueAsNumber,isC=$('dual-unit').value==='C',max=isC?MAX:212;
  if(!Number.isFinite(value)||value<MIN||value>max){
    $('dual-input-error').textContent=Number.isFinite(value)?`請輸入 −40～${max}°${isC?'C':'F'}。`:'請輸入有效的溫度數字。';
    input.setAttribute('aria-invalid','true');return;
  }
  temperature=isC?value:(value-32)*5/9;render();
});
document.querySelectorAll('#card-03 [data-dual-preset]').forEach(button=>button.addEventListener('click',()=>{
  stopRepeating();stopGuideDrag();temperature=Number(button.dataset.dualPreset);render();
}));
updateUnit();render();
})();
