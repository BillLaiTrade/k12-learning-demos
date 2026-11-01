const NS='http://www.w3.org/2000/svg';
const shapes={
  tank:{d:'M590 490L680 445H1480V760L1405 825H590Z',bounds:[590,445,890,380],crop:[590,90,680,340]},
  flask:{d:'M250 290H380V390L458 710Q490 810 315 820Q140 810 155 710L250 390Z',bounds:[140,290,350,530],crop:[330,20,285,470]},
  jar:{d:'M924 275Q1035 230 1147 275V675Q1035 715 924 675Z',bounds:[924,250,223,465],transform:'placement-jar',crop:[1260,20,270,470]},
  catalyst:{d:'M170 770a140 55 0 1 0 280 0a140 55 0 1 0-280 0',bounds:[170,715,280,110],transform:'settled-catalyst',crop:[65,535,330,190]},
  tube:{part:'delivery-tube',d:'',bounds:[65,150,1100,600],stroke:true,crop:[535,515,530,135]},
  stopper:{d:'M245 252Q315 232 385 252L375 305Q315 320 255 305Z',bounds:[245,232,140,88],transform:'stopper',crop:[410,555,130,135]},
  plate:{d:'M905 687L926 675H1167L1145 697H905Z',bounds:[905,675,262,22],transform:'cover',stroke:true,crop:[1080,540,450,230]},
  source:{d:'M-52 0H52V210H-52Z',bounds:[-52,0,104,210],transform:'reagent-bottle',crop:[45,35,230,410]},
  spoon:{d:'M-27-18H218V37H-27Z',bounds:[-27,-18,245,55],transform:'catalyst-spoon',crop:[0,0,245,55]},
};
function svgElement(tag,attrs){const node=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))node.setAttribute(k,v);return node;}
function intersects(bounds,node,box){
  const[x,y,w,h]=bounds,m=node.transform.baseVal.consolidate()?.matrix;
  const points=[[x,y],[x+w,y],[x,y+h],[x+w,y+h]].map(([a,b])=>m?{x:m.a*a+m.c*b+m.e,y:m.b*a+m.d*b+m.f}:{x:a,y:b});
  return Math.max(...points.map(p=>p.x))>=box.x&&Math.min(...points.map(p=>p.x))<=box.x+box.width&&Math.max(...points.map(p=>p.y))>=box.y&&Math.min(...points.map(p=>p.y))<=box.y+box.height;
}
export function createEquipmentExplorer({panel,panels,getStage,onOpen}){
  const dialog=panel.closest('.oxygen-lesson').querySelector('#oxygen-equipment-dialog'),layers=new Map();
  const materialsCatalog=Object.fromEntries([...panels[0].querySelectorAll('[data-material-info]')].map(info=>[info.dataset.materialInfo,{name:info.querySelector('h4').textContent,identity:info.querySelectorAll('dd')[0].textContent,role:info.querySelectorAll('dd')[1].textContent}]));
  const catalog={...materialsCatalog};
  catalog.source={name:'雙氧水試藥瓶',identity:'盛裝雙氧水的玻璃試藥瓶；瓶內的雙氧水是過氧化氫的水溶液。',role:'在這一步把雙氧水倒入錐形瓶，作為製備氧氣的來源。'};
  catalog.tube={name:'玻璃導管',identity:'讓氣體沿固定路徑通過的中空玻璃管。',role:'將錐形瓶產生的氣體送到出口，再導入集氣瓶收集。'};
  catalog.stopper={name:'塞子',identity:'用來封住反應容器瓶口，並固定穿過它的玻璃導管。',role:'塞緊錐形瓶口，讓產生的氣體沿導管送出。'};
  catalog.spoon={name:'藥匙',identity:'用來取用與加入少量固體藥品的工具。',role:'把少量二氧化錳加入錐形瓶中的雙氧水。'};
  let trigger=null;
  function currentRole(key,stage){
    const tube=Number(panel.dataset.tipX),cover=Number(panel.dataset.cover);
    if(stage===1&&panels[1].setupScene){
      const view=panels[1];
      if(key==='source')return '目前尚未加入雙氧水；這一步只用清水準備水槽與集氣瓶。';
      if(key==='jar')return Number(view.dataset.jarFill)<1?'目前仍在準備集氣瓶；先注入清水，裝滿後才遮口倒置。':view.dataset.setupCover==='true'?'瓶內已裝滿清水，玻璃片遮住瓶口；倒置與移入水槽時保持遮住。':'瓶內已裝滿清水；移開遮片前先讓瓶口位於水面下，目前尚未收集氣體。';
      if(key==='tank')return Number(view.dataset.tankFill)<1?'將清水注入水槽，準備讓倒置集氣瓶的瓶口留在水下。':'水槽已盛有清水，提供倒置集氣瓶瓶口所需的水中環境。';
      if(key==='plate')return '先遮住已裝滿水的瓶口，隨瓶倒置；瓶口移入水下後才移開。';
      if(key==='tube'||key==='stopper')return '集氣位置準備完成後，將導管出口放進瓶外的水中；此時尚未塞緊反應容器。';
    }
    if(key==='flask')return stage===1?'目前尚未加入材料，接下來會用它盛裝雙氧水並進行反應。':stage===2?'接住倒入的雙氧水；這一步還沒有加入二氧化錳。':stage===3?'盛裝雙氧水與加入的二氧化錳，氧氣在這個反應容器中產生。':stage===4?'接上附有導管的塞子，讓瓶內產生的氣體沿導管送出。':stage===5?'作為產生氧氣的反應容器；裝置起初排出的混合氣先不收集。':stage===6?'持續提供氧氣，經導管送到另一側的集氣瓶。':'反應在這裡進行；已收集的氧氣保存在另一側的集氣瓶。';
    if(key==='tank')return stage===1?'盛水並放置裝滿水、倒置的集氣瓶，讓瓶口留在水下。':stage===6?'接住集氣瓶排出的水；瓶內空間逐漸由進入的氧氣占據。':stage===7?'讓集氣瓶口在撤管與蓋片時保持在水下，減少混入外界空氣。':'讓集氣瓶的瓶口保持在水下；目前先將導管出口留在瓶外的水中。';
    if(key==='jar')return stage<=5?'目前先裝滿水、倒置在水中，尚未收集氣體；瓶口保持在水下。':stage===6?'氧氣從瓶口進入，把瓶內的水排回水槽，逐漸留在瓶中。':cover===1?'已收集氧氣，現在用玻璃片在水下蓋好瓶口。':'已收集氧氣，瓶口保持在水下，接著用玻璃片蓋住。';
    if(key==='tube')return stage<=5?'出口先留在集氣瓶外的水中，讓裝置起初的混合氣排出，暫不收集。':stage===6?(tube<1035?'出口正移向集氣瓶口下方；到位後才開始排水收集。':'出口在集氣瓶口下方，把氧氣送進瓶內並排出水。'):(tube>800?'正從集氣瓶口撤開，讓玻璃片能接著滑入。':'已移到集氣瓶外，接著在水下蓋好瓶口。');
    if(key==='stopper')return stage<4?'目前還沒有塞緊，瓶口留作加入雙氧水或二氧化錳。':stage===4?'將連接玻璃導管的塞子塞緊；封好後，氣體才沿導管送出。':'封住錐形瓶口，讓產生的氣體沿玻璃導管送出。';
    if(key==='plate')return cover===1?'已在水下蓋住集氣瓶口，減少移出時與外界空氣混合。':'先撤開導管，再讓玻璃片在水下滑入並蓋住瓶口。';
    return catalog[key].role;
  }
  function visible(node){const r=node?.getBoundingClientRect();return !!r&&r.width>0&&r.height>0&&!node.closest('[hidden]');}
  function open(key,node){
    onOpen();trigger=node;
    const stage=getStage(),info=stage===0?materialsCatalog[key]:catalog[key];
    dialog.querySelector('[data-equipment-title]').textContent=info.name;
    dialog.querySelector('[data-equipment-context]').textContent=stage===0?'認識材料':`目前操作：${panels[stage].querySelector('h3').textContent}`;
    dialog.querySelector('[data-equipment-role-label]').textContent=stage===0?'用途':'本步中的作用';
    dialog.querySelector('[data-equipment-identity]').textContent=info.identity;
    dialog.querySelector('[data-equipment-role]').textContent=stage===0?info.role:currentRole(key,stage);
    dialog.querySelector('.oxygen-equipment-paused').textContent=stage===0?'關閉介紹後，可繼續點選其他材料或前往下一個操作。':'關閉介紹後，可自行播放或重播這一步。';
    dialog.querySelector('[data-equipment-portrait]').setAttribute('viewBox',(stage===0&&key==='tube'?[410,500,700,250]:shapes[key].crop).join(' '));
    const image=dialog.querySelector('[data-equipment-portrait] image');image.setAttribute('href',key==='spoon'?'assets/oxygen-catalyst-spoon.webp':'assets/oxygen-materials-layout.webp');image.setAttribute('width',key==='spoon'?'245':'1536');image.setAttribute('height',key==='spoon'?'55':'850');
    node.setAttribute('aria-expanded','true');dialog.showModal();
  }
  function build(view){
    const helper=document.createElement('figcaption');helper.className='oxygen-equipment-help';helper.textContent='點選圖中的器材，查看介紹與本步用途。';view.querySelector('.oxygen-apparatus').prepend(helper);
    const result=[...view.querySelectorAll('.oxygen-main-scene,.oxygen-mobile-zoom svg')].map((svg,index)=>{
      svg.setAttribute('role','group');svg.querySelector(':scope > use').setAttribute('aria-hidden','true');
      const layer=svgElement('g',{class:'oxygen-scene-hotspots'}),targets=[];
      for(const[key,shape]of Object.entries(shapes)){
        const hit=svgElement('path',{d:shape.d,class:`oxygen-equipment-hit${shape.stroke?' is-stroke':''}`,'data-equipment':key,role:'button',tabindex:'0','aria-label':`${index?'近景中的':''}${catalog[key].name}：查看介紹與本步用途`,'aria-haspopup':'dialog','aria-controls':dialog.id,'aria-expanded':'false','vector-effect':'non-scaling-stroke'});
        hit.append(svgElement('title',{}));hit.firstChild.textContent=`${catalog[key].name}：查看介紹`;
        const outline=svgElement('path',{d:shape.d,class:`oxygen-equipment-outline${shape.stroke?' is-stroke':''}`,'aria-hidden':'true','vector-effect':'non-scaling-stroke'});
        hit.addEventListener('click',event=>{event.stopPropagation();open(key,hit)});
        hit.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();open(key,hit)}});
        layer.append(hit,outline);targets.push({key,shape,hit,outline});
      }
      svg.append(layer);return {svg,targets};
    });
    layers.set(view,result);return result;
  }
  function sync(stage){
    if(stage===0)return;
    const view=panels[stage],parts=key=>view.querySelector(`[data-part="${key}"]`);
    for(const{svg,targets}of layers.get(view)||build(view)){
      for(const{key,shape,hit,outline}of targets){
        if(stage===1&&view.setupScene&&Number(view.dataset.setupHandoff)<1){
          const geometry=view.setupScene.geometry(key);
          if(geometry){const[x,y,w,h]=geometry.bounds;const d=`M${x} ${y}h${w}v${h}h${-w}Z`;for(const node of[hit,outline]){node.setAttribute('d',d);node.setAttribute('transform',geometry.transform);node.classList.remove('is-stroke');node.style.display='';}hit.style.display=outline.style.display=intersects(geometry.bounds,hit,svg.viewBox.baseVal)?'':'none';}
          else hit.style.display=outline.style.display='none';
          continue;
        }
        hit.classList.toggle('is-stroke',!!shape.stroke);outline.classList.toggle('is-stroke',!!shape.stroke);
        const d=shape.part?parts(shape.part).getAttribute('d'):shape.d;
        const transform=shape.transform?(parts(shape.transform)?.getAttribute('transform')||''):'';
        hit.setAttribute('d',d);outline.setAttribute('d',d);
        hit.setAttribute('transform',transform);outline.setAttribute('transform',transform);
        const part=key==='catalyst'?parts('settled-catalyst'):key==='source'?parts('reagent-bottle'):key==='spoon'?parts('catalyst-spoon'):key==='plate'?parts('cover'):null;
        const present=key==='catalyst'&&!part?true:!['catalyst','source','spoon','plate'].includes(key)?true:!!part&&Number(part.getAttribute('opacity')??1)>.001;
        const available=present&&intersects(shape.bounds,hit,svg.viewBox.baseVal);
        hit.style.display=outline.style.display=available?'':'none';
      }
    }
  }
  function restoreFocus(){
    const origin=trigger;if(!origin)return;
    trigger=null;origin.setAttribute('aria-expanded','false');
    const view=panels[getStage()];
    const same=view.querySelector(`.oxygen-main-scene [data-equipment="${origin.dataset.equipment||origin.dataset.material}"]`);
    const target=view.contains(origin)&&visible(origin)?origin:visible(same)?same:view.querySelector('h3');
    target.focus({preventScroll:true});
  }
  function close(){if(dialog.open)dialog.close();restoreFocus();}
  dialog.querySelectorAll('[data-equipment-close]').forEach(button=>button.addEventListener('click',close));
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close();}});
  // Native close events are queued: an older event must not reset a reopened dialog.
  dialog.addEventListener('close',()=>{if(!dialog.open)restoreFocus();});
  return {sync,openMaterial:open,close};
}
