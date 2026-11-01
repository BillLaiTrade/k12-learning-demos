const NS='http://www.w3.org/2000/svg';
const shapes={
 flask:{d:'M276 208H325V324L427 550Q437 586 300 586Q163 586 173 550L276 324Z',bounds:[170,208,260,380]},
 jar:{d:'M740 240Q870 195 1010 240V558Q870 603 740 558Z',bounds:[740,215,270,370],transform:'placement-jar'},
 marble:{d:'M200 548H405V584H200Z',bounds:[200,548,205,36],part:'marble'},
 acid:{d:'M-35 0H70V170H-35Z',bounds:[-35,0,105,170],transform:'acid-bottle',part:'acid-bottle'},
 tube:{dynamic:'tube',bounds:[180,120,710,435],stroke:true,transform:'tube'},
 stopper:{d:'M267 185Q300 174 333 185L327 214Q300 225 273 214Z',bounds:[267,176,66,50],transform:'stopper',part:'stopper'},
 plate:{d:'M730 220L958 210 1019 226 785 238Z',bounds:[730,210,289,28],transform:'plate',part:'plate'},
};
function node(tag,attrs){const n=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);return n;}
export function createCO2Explorer({panel,panels,getStage,onOpen,onBackgroundClick}){
 const dialog=panel.querySelector('#co2-equipment-dialog'),layers=new Map();let trigger=null;
 const catalog=Object.fromEntries([...panels[0].querySelectorAll('[data-co2-info]')].map(info=>[info.dataset.co2Info,{name:info.querySelector('h4').textContent,identity:info.querySelectorAll('dd')[0].textContent,role:info.querySelectorAll('dd')[1].textContent}]));
 catalog.stopper={name:'塞子',identity:'封住反應瓶瓶口並固定玻璃導管的塞子。',role:'接好導管後塞緊錐形瓶，讓氣體由液面上方沿導管送出。'};
 function role(key,stage){
  if(key==='flask')return stage<=1?'目前尚未加入材料，接下來先放入大理石。':stage===2?'接住加入的大理石；這一步尚未倒入稀鹽酸。':stage===3?'盛裝大理石與倒入的稀鹽酸，接觸後開始產生二氧化碳。':stage===4?'接上附塞導管；入口留在液面上方，引導生成氣體送出。':'持續產生二氧化碳，經導管送往出口。';
  if(key==='jar')return stage<=5?'瓶口朝上，瓶內原先是空氣；導管出口先留在瓶外，尚未收集。':stage===6?'二氧化碳從瓶底附近進入，原有空氣由開放的瓶口向上離開。':Number(panel.dataset.cover)===1?'已收集二氧化碳並蓋片標示；瓶口朝上保存樣本。':'保持直立，先撤出導管，再蓋好並標示樣本。';
  if(key==='tube')return stage<=4?'先接好塞子與管路，出口留在集氣瓶外，不堵住。':stage===5?'先在集氣瓶外排出裝置原有空氣與起始混合氣。':stage===6?'越過瓶口後移至瓶底附近，讓氣體進入直立的集氣瓶。':'先從集氣瓶撤出，再移到瓶外；產氣端保持暢通，接著蓋片。';
  if(key==='stopper')return stage<4?'目前沒有塞緊，瓶口留作加入大理石與稀鹽酸。':'封住反應瓶口，讓氣體從液面上方進入導管；出口保持暢通。';
  if(key==='plate')return Number(panel.dataset.cover)===1?'已蓋住集氣瓶口，減少樣本與外界空氣混合。':'等導管完全撤出集氣瓶後才蓋片；不在水下操作。';
  return catalog[key].role;
 }
 function visible(n){const b=n?.getBoundingClientRect();return b?.width>0&&b.height>0&&!n.closest('[hidden]')&&n.style.display!=='none';}
 function open(key,source){
  onOpen();trigger=source;const info=catalog[key],stage=getStage();
  dialog.querySelector('[data-equipment-title]').textContent=info.name;
  dialog.querySelector('[data-equipment-context]').textContent=stage===0?'認識材料':`目前操作：${panels[stage].querySelector('h3').textContent}`;
  dialog.querySelector('[data-equipment-identity]').textContent=info.identity;
  dialog.querySelector('[data-equipment-role-label]').textContent=stage===0?'用途':'本步中的作用';
  dialog.querySelector('[data-equipment-role]').textContent=stage===0?info.role:role(key,stage);
  dialog.querySelector('[data-equipment-portrait]').src=`assets/co2-${key==='stopper'?'tube':key}.webp`;
  dialog.querySelector('.co2-equipment-paused').textContent=stage===0?'關閉介紹後，可繼續點選其他材料或選擇操作。':'已暫停在目前位置，關閉後可自行按繼續。';
  source.setAttribute('aria-expanded','true');dialog.showModal();
 }
 function build(view){
  const result=[...view.querySelectorAll('.co2-main-scene,.co2-closeup svg')].map((svg,index)=>{
   svg.setAttribute('role','group');const layer=node('g',{'class':'co2-hotspots'}),targets=[];
   for(const[key,shape]of Object.entries(shapes)){
    const hit=node('path',{d:shape.d||'',class:`co2-equipment-hit${shape.stroke?' is-stroke':''}`,'data-equipment':key,role:'button',tabindex:'0','aria-label':`${index?'近景中的':''}${catalog[key].name}：查看介紹與本步用途`,'aria-controls':dialog.id,'aria-haspopup':'dialog','aria-expanded':'false','vector-effect':'non-scaling-stroke'});
    const outline=node('path',{d:shape.d||'',class:`co2-equipment-outline${shape.stroke?' is-stroke':''}`,'aria-hidden':'true','vector-effect':'non-scaling-stroke'});
    hit.addEventListener('click',e=>{e.stopPropagation();open(key,hit);});
    hit.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();e.stopPropagation();open(key,hit);}});
    layer.append(hit,outline);targets.push({key,shape,hit,outline});
   }
   const background=node('rect',{x:-2048,y:-2048,width:4096,height:4096,fill:'transparent','pointer-events':'all',class:'co2-background-hit','aria-hidden':'true'});
      // Give the background its own click action so mobile tap adjustment does
      // not redirect a background tap to a nearby equipment button.
      background.addEventListener('click',event=>{onBackgroundClick(event);event.stopPropagation();});
      svg.append(background,layer);return {svg,targets};
  });layers.set(view,result);return result;
 }
 function sync(stage){
  if(stage===0)return;const view=panels[stage],part=key=>view.querySelector(`[data-co2-part="${key}"]`);
  for(const{svg,targets}of layers.get(view)||build(view))for(const{key,shape,hit,outline}of targets){
   const shared=panel.sharedBench?.target(key);
   const d=shared?.d||(shape.dynamic?part(shape.dynamic).getAttribute('d'):shape.d),t=shared?shared.transform||'':shape.transform?(part(shape.transform)?.getAttribute('transform')||''):'';
   for(const n of[hit,outline]){n.setAttribute('d',d);n.setAttribute('transform',t);n.classList.toggle('is-stroke',shared?!!shared.stroke:!!shape.stroke);}
   const exists=shared?shared.visible:!shape.part||Number(part(shape.part)?.getAttribute('opacity')??0)>.001;
   const[x,y,w,h]=shared?.bounds||shape.bounds,m=hit.transform.baseVal.consolidate()?.matrix,b=svg.viewBox.baseVal;
   const ps=[[x,y],[x+w,y],[x,y+h],[x+w,y+h]].map(([a,c])=>m?{x:m.a*a+m.c*c+m.e,y:m.b*a+m.d*c+m.f}:{x:a,y:c});
   const inside=Math.max(...ps.map(p=>p.x))>=b.x&&Math.min(...ps.map(p=>p.x))<=b.x+b.width&&Math.max(...ps.map(p=>p.y))>=b.y&&Math.min(...ps.map(p=>p.y))<=b.y+b.height;
   hit.style.display=outline.style.display=exists&&inside?'':'none';
  }
 }
 function restore(){
  if(!trigger)return;const original=trigger;trigger=null;original.setAttribute('aria-expanded','false');
  const view=panels[getStage()],same=view.querySelector(`.co2-main-scene [data-equipment="${original.dataset.equipment||original.dataset.co2Material}"]`);
  (view.contains(original)&&visible(original)?original:visible(same)?same:view.querySelector('h3')).focus({preventScroll:true});
 }
 function close(){if(dialog.open)dialog.close();restore();}
 dialog.querySelectorAll('[data-equipment-close]').forEach(b=>b.addEventListener('click',close));
 dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 dialog.addEventListener('close',()=>{if(!dialog.open)restore();});
 dialog.addEventListener('click',e=>{if(e.target===dialog){const b=dialog.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)close();}});
 return {sync,openMaterial:open,close};
}
