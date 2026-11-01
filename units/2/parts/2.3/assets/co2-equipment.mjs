const NS='http://www.w3.org/2000/svg';
const shapes={
 forceps:{d:'M-20 -314H20V-14H-20Z',bounds:[-20,-314,40,300]},
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
 catalog.forceps={name:'鑷子',identity:'用來夾取小塊固體的金屬器具。',role:'夾取一塊大理石，靠近略微傾斜的錐形瓶口輕放，讓石塊沿內壁滑入，避免直接撞擊瓶底。'};
 catalog.stopper={name:'塞子',identity:'封住反應瓶瓶口並固定玻璃導管的塞子。',role:'接好導管後塞緊錐形瓶，讓氣體由液面上方沿導管送出。'};
 function role(key,stage){
  if(key==='forceps')return catalog.forceps.role;
  if(key==='flask')return stage===1?'先定位，再略微傾斜；用鑷子逐塊輕放大理石，使它沿內壁滑入後再扶正。':stage===2?'盛裝大理石與倒入的稀鹽酸，兩者接觸就開始產氣。':stage===3?'接上塞子與固定形狀的玻璃管，入口留在液面上方。':'反應容器持續提供二氧化碳，氣體沿保持暢通的管路送出。';
  if(key==='jar')return stage<5?'瓶口朝上，原先裝有空氣；先在瓶外排氣，暫不收集。':stage===5?'將固定長度的集氣玻璃管整根抬起、越過瓶口，再放至瓶底附近；原有空氣向上離開。':'先撤出導管，再將玻璃片完整蓋住瓶口，保持直立。';
  if(key==='tube')return '兩段玻璃管的長度與形狀固定，靠整根抬起、平移來移動；中間橡皮管只彎曲，不任意拉長。'+(stage===4?'目前先在集氣瓶外排出原有空氣。':stage===5?'出口越過瓶口後，放至瓶底附近。':stage===6?'先將集氣端整根抬起移出，再蓋玻璃片。':'管路出口保持暢通。');
  if(key==='stopper')return stage<3?'連同玻璃管放在桌邊，留出瓶口加入材料；稍後整組移到瓶口塞緊。':'塞子外緣貼合瓶口內側，將產生的氣體引入玻璃管；出口保持暢通。';
  if(key==='plate')return Number(panel.dataset.cover)===1?'玻璃片已平放、貼合並完整覆蓋瓶口，減少與外界空氣混合。':'放在桌邊備用；等玻璃管完全移出後，再平放蓋好瓶口。';
  if(key==='marble')return '瓷碟留在桌上，用鑷子逐塊輕放，讓同一組五塊大理石沿傾斜錐形瓶內壁滑入；完成取用後將空碟移開。塊數是動畫示意，不是實驗用量。';
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
  const portrait=dialog.querySelector('[data-equipment-portrait]');let toolPortrait=dialog.querySelector('[data-forceps-portrait]');
  if(!toolPortrait){toolPortrait=node('svg',{viewBox:'842 35 110 1155',width:'112',height:'116',role:'img','aria-label':'金屬鑷子','data-forceps-portrait':''});toolPortrait.style.cssText='width:112px;height:116px;flex:0 0 112px;border:1px solid #e2e8d8;border-radius:12px;background:#f4f5e9';toolPortrait.append(node('image',{href:'assets/co2-tools-atlas.png',width:'1268',height:'1241'}));portrait.after(toolPortrait);}
  portrait.style.display=key==='forceps'?'none':'';toolPortrait.style.display=key==='forceps'?'':'none';
  if(key!=='forceps')portrait.src=`assets/co2-${key==='stopper'?'tube':key}.webp`;
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
