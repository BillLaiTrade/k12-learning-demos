(() => {
  const $ = id => document.getElementById(id);
  const svgNS = "http://www.w3.org/2000/svg";
  const format = value => Number.isInteger(value) ? String(value) : value.toFixed(1);
  const svgNode = (tag, attrs, text) => {
    const node = document.createElementNS(svgNS, tag);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
    if (text !== undefined) node.textContent = text;
    return node;
  };

  // All thermometers use the same linear 0–100°C scale. Guides do not add ticks.
  function renderThermometer(svg, value, showGuide = false) {
    const bottom = 355, y = bottom - value * 3.2;
    svg.replaceChildren(
      svgNode("rect", {x:93,y:28,width:30,height:335,rx:15,fill:"#fffefa",stroke:"#60776d","stroke-width":3}),
      svgNode("circle", {cx:108,cy:365,r:28,fill:"#fffefa",stroke:"#60776d","stroke-width":3}),
      svgNode("rect", {x:101,y,width:14,height:365-y,fill:"#d45e4e"}),
      svgNode("circle", {cx:108,cy:365,r:20,fill:"#d45e4e"}),
      svgNode("text", {x:155,y:22}, "°C")
    );
    for (let degree = 0; degree <= 100; degree++) {
      const tickY = bottom - degree * 3.2;
      const major = degree % 10 === 0;
      svg.append(svgNode("line", {x1:123,x2:major?139:degree%5===0?133:129,y1:tickY,y2:tickY,stroke:"#344b42","stroke-width":1.4}));
      if (major) svg.append(svgNode("text", {x:146,y:tickY+4}, String(degree)));
    }
    if (showGuide) {
      svg.append(
        svgNode("path", {d:`M25 ${y}H205`,fill:"none",stroke:"#176b53","stroke-width":2,"stroke-dasharray":"5 4"}),
        svgNode("ellipse", {cx:28,cy:y,rx:12,ry:7,fill:"#fff",stroke:"#176b53","stroke-width":2}),
        svgNode("circle", {cx:28,cy:y,r:3,fill:"#176b53"})
      );
      const nearby = Number.isInteger(value) ? [value] : [Math.floor(value), Math.ceil(value)];
      nearby.forEach(degree => svg.append(svgNode("circle", {cx:126,cy:bottom-degree*3.2,r:3,fill:"#bc612b"})));
    }
    const position = Number.isInteger(value)
      ? `液面對齊 ${value}°C 刻線。`
      : `液面在 ${Math.floor(value)}°C 和 ${Math.ceil(value)}°C 兩條刻線的正中央。`;
    svg.setAttribute("aria-label", `攝氏溫度計，0 至 100°C，每 1°C 一格。${position}`);
  }

  const slider = $("thermo-control"), guideButton = $("thermo-guide");
  function updateObservation() {
    const value = Number(slider.value), show = guideButton.getAttribute("aria-pressed") === "true";
    renderThermometer($("observation-thermometer"), value, show);
    renderLens($("observation-lens"), value, value, show);
    slider.setAttribute("aria-valuetext", `${format(value)} 攝氏度`);
    $("thermo-detail").hidden = !show;
    $("thermo-detail").textContent = Number.isInteger(value)
      ? `液面與 ${value}°C 刻線對齊，讀值約 ${value}°C。`
      : `液面在 ${Math.floor(value)}°C 與 ${Math.ceil(value)}°C 的正中央，估讀約 ${format(value)}°C。`;
    guideButton.textContent = show ? "隱藏讀值對照" : "顯示讀值對照";
  }
  slider.addEventListener("input", updateObservation);
  guideButton.addEventListener("click", () => {
    guideButton.setAttribute("aria-pressed", String(guideButton.getAttribute("aria-pressed") !== "true"));
    updateObservation();
  });
  updateObservation();

  // The inset enlarges the existing one-degree ticks; it adds no finer divisions.
  function renderLens(svg, value, apparent = value, guide = true) {
    const lower = Math.max(0, Math.min(92, Math.floor(Math.min(value, apparent)) - 2));
    const yFor = degree => 250 - (degree - lower) * 27;
    svg.replaceChildren(svgNode('rect',{x:95,y:12,width:36,height:250,rx:12,fill:'#f5f9f6',stroke:'#60776d','stroke-width':2}),svgNode('rect',{x:105,y:yFor(value),width:16,height:270-yFor(value),fill:'#d45e4e'}));
    for(let degree=lower;degree<=lower+8;degree++) {
      const y=yFor(degree);
      svg.append(svgNode('line',{x1:195,x2:220,y1:y,y2:y,stroke:'#344b42','stroke-width':2}),svgNode('text',{x:233,y:y+5},`${degree}°C`));
    }
    svg.append(svgNode('text',{x:20,y:282},'同一組刻線・每格仍是 1°C'));
    if(guide) svg.append(svgNode('line',{x1:113,y1:yFor(value),x2:210,y2:yFor(apparent),stroke:'#176b53','stroke-width':2,'stroke-dasharray':'6 4'}),svgNode('circle',{cx:207,cy:yFor(apparent),r:4,fill:'#bc612b'}));
    svg.setAttribute('aria-label',`液面局部放大：每格 1°C，液面約 ${format(value)}°C。${apparent===value?'平視時對齊同一高度。':'斜視時刻度落點偏移，液面本身不變。'}`);
  }
  for(let degree=0;degree<=100;degree++) {
    const y=340-degree*3.1;
    $('measurement-ticks').append(svgNode('line',{x1:250,x2:degree%10===0?270:degree%5===0?263:257,y1:y,y2:y}));
    if(degree%10===0)$('measurement-labels').append(svgNode('text',{x:278,y:y+4},String(degree)));
  }
  const instrument=$('measurement-instrument'), diagram=$('measurement-diagram');
  let immersed=false, stable=false, temperature=22, eye=0, animation=0, drag=null;
  const eyeButtons=[...document.querySelectorAll('[data-eye]')];
  function renderScene() {
    const liquidY=340-temperature*3.1, eyeY=liquidY+eye*60;
    // The scale lies between the observer (550) and the liquid (235).
    const hitY=liquidY+(eyeY-liquidY)*(32/315);
    const apparent=temperature-(hitY-liquidY)/3.1;
    $('measurement-liquid').setAttribute('y',liquidY);
    $('measurement-liquid').setAttribute('height',395-liquidY);
    $('measurement-sight').toggleAttribute('hidden',!immersed);
    $('sight-ray').setAttribute('d',`M235 ${liquidY}L550 ${eyeY}`);
    $('sight-eye').setAttribute('transform',`translate(550,${eyeY})`);
    $('sight-hit').setAttribute('cx',267);$('sight-hit').setAttribute('cy',hitY);
    renderLens($('measurement-lens'),temperature,apparent,immersed);
    $('measurement-save').disabled=!stable||eye!==0;
    $('measurement-insert').disabled=immersed;
    eyeButtons.forEach(button=>{button.disabled=!immersed;button.setAttribute('aria-pressed',String(Number(button.dataset.eye)===eye));});
    $('measurement-comparison').textContent=!immersed?'先放入水中，再比較觀看位置。':!stable?'液柱還在改變，先觀察，等穩定後再記錄。':eye===0?'平視時，視線與液面同高，刻度落點與液面對齊。':`液柱保持不變。視線較${eye<0?'高':'低'}時，刻度落點偏${eye<0?'高':'低'}；切回同高再記錄。`;
    $('measurement-description').textContent=immersed?`溫度計在水中，${stable?'液柱已穩定':'液柱仍在改變'}，${$('measurement-comparison').textContent}`:'溫度計在杯外，可拖到杯口上方放入。';
    instrument.setAttribute('aria-label',immersed?'溫度計已在水中；可拖回杯外，或按 Enter 取出重設':'溫度計，拖到杯口上方放入；也可按 Enter 放入');
  }
  function clearRecord() {$('measurement-record').hidden=true;$('measurement-record').textContent='';}
  function resetScene() {
    cancelAnimationFrame(animation);immersed=false;stable=false;temperature=22;eye=0;clearRecord();
    instrument.setAttribute('transform','translate(210,0)');
    $('measurement-note').textContent='溫度計還在杯外。先放入水中，看看液柱會如何改變。';renderScene();
  }
  function insert() {
    if(immersed)return;
    immersed=true;stable=false;temperature=22;clearRecord();instrument.setAttribute('transform','translate(0,0)');
    $('measurement-note').textContent='液泡已浸入水中，沒有碰到杯底。液柱正在上升，先等待穩定。';
    const start=performance.now(),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    function frame(now){
      const progress=reduced?1:Math.min(1,(now-start)/1800);
      temperature=22+15.5*(1-Math.pow(1-progress,3));
      if(progress===1){temperature=37.5;stable=true;$('measurement-note').textContent='液柱已穩定。比較高、低、同高三種視線後，平視液面並記錄。';}
      renderScene();if(!stable)animation=requestAnimationFrame(frame);
    }
    renderScene();animation=requestAnimationFrame(frame);
  }
  $('measurement-insert').addEventListener('click',insert);
  $('measurement-reset').addEventListener('click',resetScene);
  eyeButtons.forEach(button=>button.addEventListener('click',()=>{eye=Number(button.dataset.eye);clearRecord();renderScene();}));
  $('measurement-save').addEventListener('click',()=>{
    if(!stable||eye!==0)return;
    $('measurement-record').hidden=false;$('measurement-record').textContent='水溫約 37.5°C。液面位於 37°C 和 38°C 的正中央；記錄包含數值與單位。';
  });
  function point(event){const p=diagram.createSVGPoint();p.x=event.clientX;p.y=event.clientY;return p.matrixTransform(diagram.getScreenCTM().inverse());}
  instrument.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();immersed?resetScene():insert();}});
  instrument.addEventListener('pointerdown',event=>{
    if(event.button!==0)return;
    cancelAnimationFrame(animation);
    const p=point(event);const matrix=instrument.transform.baseVal.consolidate().matrix;
    drag={id:event.pointerId,x:p.x,y:p.y,tx:matrix.e,ty:matrix.f,wasImmersed:immersed};instrument.setPointerCapture(event.pointerId);event.preventDefault();
  });
  instrument.addEventListener('pointermove',event=>{if(!drag)return;const p=point(event);instrument.setAttribute('transform',`translate(${drag.tx+p.x-drag.x},${drag.ty+p.y-drag.y})`);});
  instrument.addEventListener('pointerup',event=>{
    if(!drag)return;const m=instrument.transform.baseVal.consolidate().matrix;
    const valid=235+m.e>140&&235+m.e<330&&395+m.f>150&&395+m.f<260;
    const was=drag.wasImmersed;drag=null;
    if(valid){if(was){instrument.setAttribute('transform','translate(0,0)');if(!stable){immersed=false;insert();}else renderScene();}else insert();}
    else{resetScene();$('measurement-note').textContent='溫度計已回到杯外。將液泡從杯口上方放入，或使用「放入水中」按鈕。';}
  });
  instrument.addEventListener('pointercancel',()=>{drag=null;resetScene();});
  resetScene();

  const sequence = $("measure-sequence");
  const initialSteps = [...sequence.children].map(item => item.dataset.step);
  const correctSteps = ["immerse", "wait", "level", "read"];
  const quizTemperature = 42.5;
  renderThermometer($("quiz-thermometer"), quizTemperature);
  renderLens($("quiz-lens"), quizTemperature, quizTemperature, false);
  function updateSequence() {
    [...sequence.children].forEach((item, index) => {
      item.querySelector(".sequence-number").textContent = String(index + 1);
      item.querySelector('[data-move="up"]').disabled = index === 0;
      item.querySelector('[data-move="down"]').disabled = index === sequence.children.length - 1;
    });
  }
  const clearResult = () => { $("quiz-result").hidden = true; $("quiz-result").textContent = ""; };
  sequence.addEventListener("click", event => {
    const button = event.target.closest("button[data-move]");
    if (!button) return;
    const item = button.closest(".sequence-step");
    if (button.dataset.move === "up" && item.previousElementSibling) sequence.insertBefore(item, item.previousElementSibling);
    if (button.dataset.move === "down" && item.nextElementSibling) sequence.insertBefore(item.nextElementSibling, item);
    updateSequence();
    const focusTarget = button.disabled ? item.querySelector("button:not(:disabled)") : button;
    focusTarget.focus();
    $("sequence-feedback").textContent = "順序已調整，完成三項紀錄後一起檢查。";
    clearResult();
  });
  document.querySelectorAll('input[name="principle"]').forEach(input => input.addEventListener("change", () => {
    $("principle-feedback").textContent = "";
    clearResult();
  }));
  $("quiz-reading").addEventListener("input", () => {
    $("reading-feedback").textContent = "";
    renderThermometer($("quiz-thermometer"), quizTemperature);
    clearResult();
  });
  $("quiz-check").addEventListener("click", () => {
    const ordered = [...sequence.children].every((item, index) => item.dataset.step === correctSteps[index]);
    const principle = document.querySelector('input[name="principle"]:checked');
    const raw = $("quiz-reading").value.trim(), value = Number(raw);
    const validReading = raw !== "" && Number.isFinite(value) && value >= 0 && value <= 100;
    const readingCorrect = validReading && Math.abs(value - quizTemperature) <= 0.3 + Number.EPSILON * 100;
    $("sequence-feedback").textContent = ordered
      ? "程序正確：浸入、等待穩定、留在水中平視、讀值並記錄單位。"
      : "再整理程序：先浸入，等待液柱穩定，再留在水中平視，最後讀值與記錄 °C。";
    $("principle-feedback").textContent = !principle ? "請選擇液柱上升的原因。"
      : principle.value === "volume" ? "正確。測溫液體的體積隨溫度改變，細管把變化呈現為液面位置，再由刻度讀出溫度。"
      : "液柱上升是測溫液體升溫、體積增大的結果；杯水沒有流進溫度計，手感也不會直接控制液柱。";
    $("reading-feedback").textContent = !validReading ? "請輸入 0 到 100°C 之間的估讀值。"
      : `${readingCorrect ? "估讀合理。" : "沿水平虛線再看一次。"}液面在 42°C 與 43°C 之間，約為 42.5°C。本練習接受相差不超過 0.3°C 的估讀，這不是工具的誤差規格。`;
    renderThermometer($("quiz-thermometer"), quizTemperature, validReading);
    const score = Number(ordered) + Number(principle?.value === "volume") + Number(readingCorrect);
    $("quiz-result").hidden = false;
    $("quiz-result").textContent = !principle || !validReading
      ? "紀錄尚未完整，請補上液柱變化的原因與有效的溫度讀值，再一起檢查。"
      : score === 3 ? "三項紀錄都完成了：你能依程序量測，解釋液柱的變化，並用刻度記錄水溫。"
      : `目前 ${score} / 3 項符合測量紀錄；依上方提示調整後，可以再次檢查。`;
  });
  $("quiz-reset").addEventListener("click", () => {
    initialSteps.forEach(step => sequence.append(sequence.querySelector(`[data-step="${step}"]`)));
    updateSequence();
    document.querySelectorAll('input[name="principle"]').forEach(input => { input.checked = false; });
    $("quiz-reading").value = "";
    document.querySelectorAll(".quiz-feedback").forEach(item => { item.textContent = ""; });
    renderThermometer($("quiz-thermometer"), quizTemperature);
    clearResult();
  });
  updateSequence();

  const navLinks = [...document.querySelectorAll(".route a[href^='#']")];
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    navLinks.forEach(link => {
      if (link.getAttribute("href") === `#${entry.target.id}`) link.setAttribute("aria-current", "step");
      else link.removeAttribute("aria-current");
    });
  }), {rootMargin:"-20% 0px -65% 0px"});
  navLinks.forEach(link => observer.observe(document.querySelector(link.getAttribute("href"))));
})();
