// 共用呈現層；時間、熱量、溫度與停止條件由各區原控制器提供。
export function mountHeatBench(root){
  const photo=root.querySelector('.calorie-photo'),prefix=root.id+'-bench';
  const layer=document.createElementNS('http://www.w3.org/2000/svg','svg');
  layer.classList.add('heat-apparatus-motion');layer.setAttribute('viewBox','0 0 1672 941');layer.setAttribute('aria-hidden','true');
  layer.innerHTML=`<defs>
    <linearGradient id="${prefix}-bar" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#fffef5"/><stop offset=".4" stop-color="#fff"/><stop offset="1" stop-color="#c9d0c6"/></linearGradient>
    <clipPath id="${prefix}-surface"><ellipse cx="500" cy="482" rx="119" ry="16"/></clipPath>
    </defs>
    <g class="heat-water-surface" clip-path="url(#${prefix}-surface)" fill="none" stroke="#fffdf0" stroke-width="2">
      <ellipse class="heat-ripple" cx="500" cy="482" rx="35" ry="6"/>
      <ellipse class="heat-ripple" cx="500" cy="482" rx="65" ry="10"/>
      <ellipse class="heat-ripple" cx="500" cy="482" rx="105" ry="15"/>
    </g>
    <ellipse cx="500" cy="608" rx="41" ry="4" fill="#384438" opacity=".14"/>
    <g transform="translate(500 600) scale(1 .34)"><g class="heat-stir-bar"><rect x="-40" y="-11" width="80" height="22" rx="11" fill="url(#${prefix}-bar)" stroke="#b5beb4" stroke-width="1.5"/><path d="M-28-6H28" stroke="#fff" stroke-width="2" opacity=".7"/></g></g>
    <g class="heat-knob-pointer"><path d="M538 720V733" stroke="#554a3c" stroke-width="6" stroke-linecap="round"/><path d="M538 720V733" stroke="#fffced" stroke-width="3" stroke-linecap="round"/></g>`;
  photo.querySelector('img').after(layer);
  const stir=layer.querySelector('.heat-stir-bar'),ripples=[...layer.querySelectorAll('.heat-ripple')],pointer=layer.querySelector('.heat-knob-pointer');
  const hint=document.createElement('span');hint.className='heat-knob-hint';hint.setAttribute('aria-hidden','true');photo.append(hint);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  return {draw({elapsed,playing,ready,speed}){
    root.dataset.motion=playing&&ready?'active':'still';
    layer.style.visibility=ready?'visible':'hidden';
    // 視覺時間沿用主模型，沒有第二個計時器或可殘留的動畫迴圈。
    const time=reduced.matches?0:elapsed/speed,angle=(time*240)%360;
    stir.setAttribute('transform',`rotate(${angle})`);stir.dataset.angle=String(angle);
    ripples.forEach((r,i)=>{const t=(time*.65+i/3)%1;r.setAttribute('rx',String(25+t*105));r.setAttribute('ry',String(4+t*12));r.setAttribute('opacity',String(playing&&!reduced.matches?(1-t)*.42:0));});
    pointer.setAttribute('transform',`rotate(${playing?35:-35} 538 754)`);
    hint.textContent=root.querySelector('.calorie-heater').title||'點旋鈕，開始加熱';
    hint.hidden=!ready||playing;
  }};
}
