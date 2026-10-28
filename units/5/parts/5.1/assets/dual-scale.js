// Both scales describe one physical temperature and one liquid meniscus.
const $=id=>document.getElementById(id), svgNS='http://www.w3.org/2000/svg';
const celsiusY=c=>560-c*4.3;
const fahrenheitY=f=>celsiusY((f-32)*5/9);
const format=value=>String(Number(value.toFixed(1)));
function mark(group,degree,y,left){
  const major=degree%20===0, medium=degree%10===0||degree%5===0;
  const length=major?12:medium?8:4;
  const n=document.createElementNS(svgNS,'line');
  Object.entries({'data-degree':degree,x1:left?120-length:140,x2:left?120:140+length,y1:y,y2:y,'stroke-width':major?1.2:.7}).forEach(([k,v])=>n.setAttribute(k,String(v)));
  group.append(n);
}
function label(group,value,y,left){
  const n=document.createElementNS(svgNS,'text');
  Object.entries({'data-degree':value,x:left?100:160,y,'text-anchor':left?'end':'start',class:'dual-scale-label'}).forEach(([k,v])=>n.setAttribute(k,String(v)));
  n.textContent=value;group.append(n);
}
const cScale=$('dual-scale-c'),fScale=$('dual-scale-f');
for(let c=0;c<=100;c++){
  mark(cScale,c,celsiusY(c),true);
  if(c%20===0)label(cScale,c,celsiusY(c),true);
}
for(let f=32;f<=212;f++){
  mark(fScale,f,fahrenheitY(f),false);
  if(f%20===0||f===32||f===212)label(fScale,f,fahrenheitY(f),false);
}
function render(){
  const c=Number($('dual-temperature').value),f=c*9/5+32,y=celsiusY(c);
  const meniscus=`M124 ${y-1}Q130 ${y+1} 136 ${y-1}`;
  $('dual-liquid').setAttribute('d',`${meniscus}V614H124Z`);
  $('dual-meniscus').setAttribute('d',meniscus);
  $('dual-guide').setAttribute('y1',y);$('dual-guide').setAttribute('y2',y);
  $('dual-celsius').textContent=`${format(c)}°C`;
  $('dual-fahrenheit').textContent=`${format(f)}°F`;
  $('dual-formula').textContent=`${format(c)} × 9/5 ＋ 32 ＝ ${format(f)}`;
  $('dual-temperature').setAttribute('aria-valuetext',`${format(c)} 攝氏度，等於 ${format(f)} 華氏度`);
  $('dual-temperature').style.setProperty('--dual-progress',`${c}%`);
  $('dual-thermometer').setAttribute('aria-label',`同一根液柱，攝氏 ${format(c)} 度與華氏 ${format(f)} 度位於同一液面高度。攝氏每 1 度的間距為華氏每 1 度的 1.8 倍。`);
  document.querySelectorAll('#card-03 [data-dual-preset]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.dualPreset)===c)));
}
$('dual-temperature').addEventListener('input',render);
document.querySelectorAll('#card-03 [data-dual-preset]').forEach(button=>button.addEventListener('click',()=>{
  $('dual-temperature').value=button.dataset.dualPreset;render();
}));
render();
