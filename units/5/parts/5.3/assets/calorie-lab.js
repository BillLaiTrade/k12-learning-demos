import { temperature } from './heat-model.mjs';

const root = document.querySelector('#calorie-lab');
const get = id => document.getElementById(id);
const transfer = get('calorie-transfer');
const pause = get('calorie-pause');
let heat = 0, target = 0, playing = false, frame = 0, last = 0;
const y = t => 223 - (t - 20) * 36;
const scene = root.querySelector('.calorie-scene');
const fitScene = () => scene.setAttribute('viewBox',root.clientWidth<510 ? '0 65 435 285' : '0 0 640 360');
if ('ResizeObserver' in window) new ResizeObserver(fitScene).observe(root);
fitScene();

get('calorie-ticks').innerHTML = Array.from({length:41}, (_, i) => {
  const t = 19.5 + i / 10, lineY = y(t), whole = i % 10 === 5;
  return `<path d="M490 ${lineY}h${whole ? 15 : i%5===0 ? 10 : 6}" stroke="#526c60" stroke-width="${whole ? 1.3 : .7}"/>${whole ? `<text class="cal-tick-label" x="511" y="${lineY+4}">${Math.round(t)}°C</text>` : ''}`;
}).join('');

function render() {
  const t = temperature({heat, mass:1, c:1});
  get('calorie-end').textContent = t.toFixed(1);
  get('calorie-rise').textContent = heat.toFixed(1);
  get('calorie-heat').textContent = heat.toFixed(1);
  get('calorie-liquid').setAttribute('y',y(t));
  get('calorie-liquid').setAttribute('height',265-y(t));
  get('calorie-rise-bracket').setAttribute('d',heat>0 ? `M559 ${y(20)}h8V${y(t)}h-8` : 'M567 223');
  get('calorie-rise-label').setAttribute('y',(y(t)+y(20))/2+4);
  get('calorie-rise-label').textContent = heat>0 ? `+${heat.toFixed(1)}°C` : '';
  get('calorie-flow').setAttribute('visibility',playing ? 'visible' : 'hidden');
  get('calorie-flow-label').textContent = playing ? '熱傳入水中 →' : heat===0 ? '等待傳入熱量' : target>heat ? '傳熱已暫停' : '本次傳熱完成';
  get('calorie-scene-description').textContent = `同一份 1 g 水，由 20°C 升至 ${t.toFixed(1)}°C，升高 ${heat.toFixed(1)}°C，累計吸收約 ${heat.toFixed(1)} cal。`;
  transfer.disabled = target>heat || heat>=3;
  transfer.textContent = heat>=3 ? '已觀察三次' : heat===0 ? '傳入約 1 cal' : '再傳入約 1 cal';
  pause.disabled = !(target>heat);
  pause.textContent = playing || target===heat ? '暫停觀察' : '繼續觀察';
  pause.setAttribute('aria-pressed',String(playing));
}
function stop() {
  if (!playing) return;
  playing=false;cancelAnimationFrame(frame);root.dataset.phase='paused';render();
  get('calorie-observation').textContent='已暫停。熱量、液柱與讀值停在同一狀態，按「繼續觀察」接著看。';
}
function start() {
  playing=true;root.dataset.phase='running';last=performance.now();render();
  get('calorie-observation').textContent='水的質量仍是 1 g。觀察熱傳入時，液柱與溫度如何改變。';
  const tick=now=>{
    if(!playing)return;
    heat=Math.min(target,heat+Math.min(now-last,100)/2000);last=now;render();
    if(heat>=target){
      heat=target;playing=false;root.dataset.phase='complete';render();
      get('calorie-observation').textContent=heat===1 ? '這 1 g 水由 20°C 升到 21°C，升高 1°C，吸收約 1 cal。這就是「1 卡」的意義。' : `同一份 1 g 水，從 20°C 升到 ${20+heat}°C，累計升高 ${heat}°C，吸收約 ${heat} cal。`;
      get('calorie-dialogue').textContent=heat===1 ? '「21°C 是現在的溫度，升高的是 1°C；這次吸收的熱量約是 1 cal。三個數字的意思不一樣！」' : `「水量仍然是 1 g；累計吸收約 ${heat} cal，就從 20°C 升高了 ${heat}°C。」`;
    }else frame=requestAnimationFrame(tick);
  };
  frame=requestAnimationFrame(tick);
}
transfer.addEventListener('click',()=>{if(playing || target>heat || heat>=3)return;target=heat+1;start();});
pause.addEventListener('click',()=>playing ? stop() : start());
get('calorie-reset').addEventListener('click',()=>{
  playing=false;cancelAnimationFrame(frame);heat=0;target=0;root.dataset.phase='ready';render();
  get('calorie-observation').textContent='先傳入一次熱量，觀察液柱，再比較水溫改變了幾度。';
  get('calorie-dialogue').textContent='「我會把『水現在幾度』和『水吸收多少熱量』分開記錄，再比較前後的變化。」';
});
window.addEventListener('blur',stop);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
render();
