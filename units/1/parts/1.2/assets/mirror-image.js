import {COMPARISON,comparisonRay,pupilBundle,sidePath,scatterRays,otherReflections} from './mirror-comparison.mjs?v=1';
import {createComparisonView} from './mirror-comparison-view.mjs?v=1';

const section=document.getElementById('card-03');
if(section) {
  const ns='http://www.w3.org/2000/svg',button=section.querySelector('#toggle-comparison-mirror');
  const ray=comparisonRay(),bundle=pupilBundle();
  let mode='mirror';
  const node=(name,attributes)=>{const element=document.createElementNS(ns,name);for(const [k,v] of Object.entries(attributes))element.setAttribute(k,v);return element;};
  const show=(element,visible)=>{element.style.display=visible?'inline':'none';};
  function createScene(prefix) {
    const panel=section.querySelector(`#comparison-${prefix}`),svg=panel.querySelector('.comparison-side');
    const find=name=>svg.querySelector(`[data-side="${name}"]`),eye=panel.querySelector('.comparison-eye');
    const renderView=createComparisonView(eye);
    const path=(points,color,arrows=true)=>node('path',{d:sidePath(points,arrows),'marker-mid':arrows?`url(#${prefix}-${color}-arrow)`:'none'});
    function render(next) {
      const mirror=next==='mirror';panel.dataset.mode=next;svg.dataset.mode=next;
      show(find('mirror'),mirror);show(find('mirror-tick'),!mirror);show(find('virtual-region'),mirror);
      find('near-shape').setAttribute('opacity',mirror?'1':'.4');find('far-shape').setAttribute('opacity',mirror?'.48':'1');
      find('near-label').textContent=mirror?'鏡前實物':'原小熊（位置不變）';
      find('far-label').textContent=mirror?'虛像位置（示意）':'放入的真實對照熊';
      find('scatter').replaceChildren(...scatterRays(COMPARISON.source,1).map(p=>path(p,'gray')),
        ...(!mirror?scatterRays(COMPARISON.image,-1).map(p=>path(p,'gray')):[]));
      find('other-reflections').replaceChildren(...(mirror?otherReflections().flatMap(r=>[path([r.source,r.hit],'gray',false),path([r.hit,r.end],'gray')]):[]));
      const rays=[],extensions=[],hits=[];
      bundle.forEach((r,i)=>{
        const segments=mirror?[[r.source,r.hit],[r.hit,r.eye]]:[[r.image,r.eye]];
        for(const points of segments){const p=path(points,'blue');p.setAttribute('stroke-width',i===1?'3.6':'1.3');p.setAttribute('opacity',i===1?'1':'.62');rays.push(p);}
        if(mirror){extensions.push(path(r.extension,'blue',false));hits.push(node('circle',{cx:r.hit[0],cy:r.hit[1],r:i===1?4:2}));}
      });
      find('rays').replaceChildren(...rays);find('extensions').replaceChildren(...extensions);find('hits').replaceChildren(...hits);
      const title=panel.querySelector(`#${prefix}-side-title`),desc=panel.querySelector(`#${prefix}-side-desc`);
      title.textContent=mirror?'有鏡子時，鼻尖的光經反射進入眼睛':'撤鏡並放入對照熊，鼻尖的光直接進入眼睛';
      desc.textContent=mirror?'鼻尖把照到它的光散向許多方向；一小束經鏡面反射進入瞳孔。鏡後淡色熊與虛線只標示虛像位置，沒有實際光在鏡後傳播。':'原小熊仍在原位，淡化只為突出對照熊。鏡子已撤掉，另將一隻真實小熊放在原虛像位置並面向小葵，光直接進入同一瞳孔。';
      panel.querySelector(`#${prefix}-eye-title`).textContent=mirror?'小葵透過鏡面看到的小熊':'小葵直接看到放在原虛像位置的對照熊';
      panel.querySelector(`#${prefix}-caption`).textContent=mirror?'鼻尖向多個方向散光；照到鏡面的光遵守入射角＝反射角，只有部分反射光進入眼睛。':'撤鏡後，在原虛像位置另放真熊，光直接進入眼睛。';
      svg.dataset.source=COMPARISON.source.join(',');svg.dataset.image=COMPARISON.image.join(',');svg.dataset.eye=COMPARISON.eye.join(',');svg.dataset.hit=ray.hit.join(',');
      renderView(next);
    }
    render('mirror');return render;
  }
  createScene('reference');const renderTrial=createScene('trial');
  button.addEventListener('click',()=>{
    mode=mode==='mirror'?'direct':'mirror';renderTrial(mode);section.dataset.comparisonMode=mode;
    button.setAttribute('aria-pressed',String(mode==='direct'));
    button.textContent=mode==='direct'?'放回鏡子，移開對照熊':'撤鏡，放入對照熊';
    section.querySelector('#trial-heading [data-role="heading"]').textContent=mode==='direct'?'撤鏡＋放入對照熊：直接看見真熊':'操作比較：目前有鏡子';
    section.querySelector('#comparison-status').textContent=mode==='direct'
      ?'現在看右圖：鏡子已撤掉，另外放入真實對照熊。比較金色鼻尖的位置，以及進入眼睛的那一小束光：反射光與直達光的入眼方向和發散情形相同。'
      :'鏡子已放回，對照熊已移開。再比較一次：鏡前小熊的光經反射進入眼睛，看起來像從鏡後同一個鼻尖位置傳來。';
    section.querySelector('#comparison-button-hint').textContent=mode==='direct'?'再點一下，回到有鏡子的情境；原小熊仍留在原位。':'點一下，切換比較；小葵與原小熊的位置保持不變。';
  });
}
