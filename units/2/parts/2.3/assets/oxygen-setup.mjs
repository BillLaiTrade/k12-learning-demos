// The preparation is one bounded instructional clock. All water is clear water;
// no peroxide, catalyst or gas has entered the apparatus at this point.
export const SETUP_DURATION = 18400;
const unit = n => Math.max(0, Math.min(1, n));
const ease = n => { const x=unit(n); return x*x*(3-2*x); };
const between = (t,a,b) => ease((t-a)/(b-a));
const mix = (a,b,t) => a+(b-a)*t;
export function setupFrame(elapsed) {
  const time=Math.max(0,Math.min(SETUP_DURATION,elapsed));
  const arrangement=between(time,400,2400),tankFill=between(time,3000,5500),jarFill=between(time,6000,8500);
  const cover=between(time,9000,9600),inversion=between(time,10000,12000),immersion=between(time,12400,14400);
  const uncover=between(time,14800,15600),outlet=between(time,16000,17200);
  const phase=time<3000?'arrange':time<6000?'tank':time<9000?'jar':time<10000?'cover':time<12400?'invert':time<14800?'immerse':time<16000?'uncover':time<17600?'outlet':'ready';
  return {time,arrangement,tankFill,jarFill,cover,inversion,immersion,uncover,outlet,phase,
    jarX:mix(mix(1390,1150,arrangement),1035,immersion),jarY:mix(mix(250,330,arrangement),465,immersion),
    angle:180*inversion,mouthY:mix(mix(250,330,arrangement),465,immersion)-215*Math.cos(Math.PI*inversion),
    covered:cover===1&&uncover===0};
}
const messages={arrange:'從材料桌面開始，把錐形瓶、水槽與集氣瓶移到操作位置',tank:'先將清水注入空水槽，建立排水集氣的水中環境',jar:'把清水注入直立的集氣瓶，直到瓶內裝滿水',cover:'用薄玻璃片遮住裝滿水的集氣瓶口',invert:'玻璃片貼住瓶口，將裝滿水的集氣瓶連續倒置',immerse:'保持瓶口被遮住，將倒置瓶的瓶口移入水面下',uncover:'瓶口已在水下，再把遮住瓶口的玻璃片移開',outlet:'將導管出口放進瓶外的水中，現在先不接入集氣瓶',ready:'集氣位置已備好；瓶內裝滿水，導管出口留在瓶外水中'};
const NS='http://www.w3.org/2000/svg';
function svg(tag,attrs={}) {const n=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);return n;}
// Sprite coordinates refer to the generated transparent sheet, not the source
// photograph. Each cutout is explicitly placed back at its original photo spot.
const crops={source:[48,95,240,425],flask:[365,60,290,470],tank:[650,170,750,360],jar:[1425,75,215,465],catalyst:[45,630,330,180],tube:[435,620,785,195],plate:[1190,660,475,190]};
function sprite(key,x,y,w,h) {
  const n=svg('svg',{x,y,width:w,height:h,viewBox:crops[key].join(' '),preserveAspectRatio:'none',overflow:'hidden'});
  n.append(svg('image',{href:'assets/oxygen-setup-sprites.png',width:1686,height:933}));return n;
}
export function createSetupScene(view,panels) {
  const main=view.querySelector('.oxygen-main-scene'),zoom=view.querySelector('.oxygen-mobile-zoom svg');
  const art=svg('g',{id:'oxygen-setup-art'}),defs=main.querySelector('defs');defs.append(art);
  art.append(svg('image',{href:'assets/oxygen-setup-table.png',width:1536,height:900,preserveAspectRatio:'none','data-shared-background':''}));
  const source=svg('g',{'data-setup-body':'source'});source.append(sprite('source',75,70,165,350));art.append(source);
  const catalyst=svg('g',{'data-setup-body':'catalyst'});catalyst.append(sprite('catalyst',90,530,275,145));art.append(catalyst);
  const flask=svg('g',{'data-setup-body':'flask'});
  const flaskClip=svg('clipPath',{id:'shared-flask-inside'});flaskClip.append(svg('path',{d:'M277 310H355V410L452 724Q466 780 420 795Q315 815 206 793Q161 780 179 724L277 410Z'}));defs.append(flaskClip);
  const contents=svg('g',{'clip-path':'url(#shared-flask-inside)'});
  const flaskLiquid=svg('rect',{x:160,y:805,width:310,height:0,fill:'#b8dce2','fill-opacity':'.35','data-shared-flask-liquid':''});
  const powder=svg('g',{'data-shared-catalyst':''});
  for(let i=0;i<90;i++){const x=184+(i*41%265),y=758+(i*17%38);powder.append(svg('circle',{cx:x,cy:y,r:2+(i%4),fill:i%3?'#303731':'#596058'}));}
  contents.append(flaskLiquid,powder);flask.append(contents,sprite('flask',140,290,350,530));art.append(flask);
  const tank=svg('g',{'data-setup-body':'tank'});
  // Trace the glass's inner perspective silhouette, including the sloped base.
  // This clip shares the tank transform, so moving/scaling cannot detach water.
  const tankClip=svg('clipPath',{id:'setup-tank-inside',clipPathUnits:'userSpaceOnUse'});
  tankClip.append(svg('path',{d:'M622 540L729 482L1462 510L1448 737L1380 780L641 746Z'}));defs.append(tankClip);
  const water=svg('g',{'data-setup-water':'tank','clip-path':'url(#setup-tank-inside)'});
  const front=svg('path',{fill:'#8ed9e5','fill-opacity':'.34','data-setup-water-volume':''});
  const surface=svg('path',{fill:'#d4f5f6','fill-opacity':'.48',stroke:'#78acb6','stroke-width':1.5,'data-setup-water-surface':''});
  water.append(front,surface);tank.append(water,sprite('tank',590,445,890,380));art.append(tank);
  const jar=svg('g',{'data-setup-body':'jar'});
  const clip=svg('clipPath',{id:'setup-jar-inside'});clip.append(svg('path',{d:'M50 30H173V60Q195 70 195 95V377Q112 400 28 377V95Q28 70 50 60Z'}));defs.append(clip);
  const jarWater=svg('rect',{x:28,y:390,width:167,height:0,fill:'#83d3df','fill-opacity':'.42','clip-path':'url(#setup-jar-inside)','data-setup-water':'jar','data-shared-jar-water':''});
  const jarSurface=svg('ellipse',{cx:111.5,cy:390,rx:80,ry:8,fill:'#d6f8f7','fill-opacity':'.3',stroke:'#67aeb8','stroke-width':1.5,'clip-path':'url(#setup-jar-inside)','data-shared-jar-surface':''});
  jar.append(jarWater,jarSurface,sprite('jar',0,0,223,430));
  const lid=svg('g',{'data-setup-cover':''});
  lid.append(svg('path',{d:'M-20 16L8 5H245L223 16V21H-20Z',fill:'#d8f4ee','fill-opacity':'.75',stroke:'#7caaa8','stroke-width':3}),svg('path',{d:'M-18 16H223',stroke:'#fff','stroke-width':3}));jar.append(lid);art.append(jar);
  const plate=svg('g',{'data-setup-body':'plate'});plate.append(sprite('plate',0,0,247,80));art.append(plate);
  const tube=svg('g',{'data-setup-body':'tube'});tube.append(sprite('tube',430,520,650,165));art.append(tube);
  const stream=svg('path',{fill:'none',stroke:'#a8e4ee','stroke-width':12,'stroke-linecap':'round','data-setup-stream':''});
  const highlight=svg('path',{fill:'none',stroke:'#fff','stroke-opacity':'.85','stroke-width':3});art.append(stream,highlight);
  const label=svg('text',{x:1390,y:95,'text-anchor':'end',fill:'#315c55','font-size':28,'paint-order':'stroke',stroke:'#fff','stroke-width':5});art.append(label);
  // One scene is referenced by every operation. Legacy definitions retain only
  // the changing experiment overlays; no photographic backdrop can fade back in.
  const oldUse=main.querySelector(':scope > use'),oldZoom=zoom.querySelector('use');
  oldUse.style.display=oldZoom.style.display='none';
  for(const [index,operation] of panels.entries()){
    if(!index)continue;
    for(const canvas of operation.querySelectorAll('.oxygen-main-scene,.oxygen-mobile-zoom svg')){
      const use=svg('use',{href:'#oxygen-setup-art','data-shared-scene':'','aria-hidden':'true'});
      canvas.insertBefore(use,canvas.querySelector(':scope > use'));
    }
    const drawing=operation.querySelector(`[id="oxygen-art-${index}"]`);
    drawing.querySelectorAll('image').forEach(image=>{
      if(/oxygen-(?:apparatus|placement)-/.test(image.getAttribute('href'))){if(image.dataset.part){const empty=svg('g',{'data-part':image.dataset.part});image.replaceWith(empty);}else image.remove();}
    });
    for(const name of ['peroxide-liquid','peroxide-meniscus','settled-catalyst','mixed-flask','stopper','delivery-tube','tube-highlight','assembly-jar-focus','cover','jar-water','water-line']){
      const node=drawing.querySelector(`[data-part="${name}"]`);if(node)node.style.display='none';
    }
    const liquid=drawing.querySelector('[data-part="jar-water"]');
    if(liquid){liquid.setAttribute('fill','#83d3df');liquid.setAttribute('fill-opacity','.42');liquid.parentElement.setAttribute('clip-path','url(#shared-jar-world)');}
  }
  const worldClip=svg('clipPath',{id:'shared-jar-world'});
  worldClip.append(svg('path',{d:clip.firstChild.getAttribute('d'),transform:'translate(1035 465) rotate(180) translate(-111.5 -215)'}));defs.append(worldClip);
  // Keep the material labels and hit areas, but render their desk with this same
  // scene too. The original photo remains the no-JavaScript fallback.
  const photo=panels[0].querySelector('.oxygen-materials-photo'),materialView=svg('svg',{viewBox:'0 0 1536 850','aria-hidden':'true','data-shared-materials':''});
  materialView.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none';
  materialView.append(svg('use',{href:'#oxygen-setup-art'}));photo.insertBefore(materialView,photo.querySelector('button'));photo.querySelector('img').style.opacity='0';
  let activeView=view,operationStage=1;
  const tubePath='M485 620L1027 546Q1060 540 1068 563L1075 580';
  function tubeTransform(capX,capY,tipX,tipY){const dx=tipX-capX,dy=tipY-capY,angle=(Math.atan2(dy,dx)-Math.atan2(-40,590))*180/Math.PI,scale=Math.hypot(dx,dy)/Math.hypot(590,40);return `translate(${capX} ${capY}) rotate(${angle}) scale(${scale}) translate(-485 -620)`;}

  const setTransform=(n,a,b,t)=>n.setAttribute('transform',`translate(${mix(a[0],b[0],t)} ${mix(a[1],b[1],t)}) scale(${mix(a[2],b[2],t)} ${mix(a[3],b[3],t)})`);
  const bodies={source,catalyst,flask,tank,jar,plate,tube};
  const bounds={source:[75,70,165,350],catalyst:[90,530,275,145],flask:[140,290,350,530],tank:[590,445,890,380],jar:[0,0,223,430],plate:[0,0,247,80],tube:[430,520,650,165]};
  return {
    geometry(key) {
      if(operationStage>1&&['source','spoon'].includes(key)){
        const n=activeView.querySelector(`[data-part="${key==='source'?'reagent-bottle':'catalyst-spoon'}"]`);
        return n&&Number(n.getAttribute('opacity'))>.01?{bounds:key==='source'?[-52,0,104,210]:[-27,-18,245,55],transform:n.getAttribute('transform')||''}:null;
      }
      if(operationStage>1&&key==='catalyst')return Number(powder.getAttribute('opacity'))>.01?{bounds:[180,752,275,48],transform:''}:null;
      if(key==='plate'&&Number(plate.getAttribute('opacity'))<=.05&&Number(lid.getAttribute('opacity'))>.05)return {bounds:[-20,5,265,16],transform:`${jar.getAttribute('transform')} ${lid.getAttribute('transform')}`};
      const n=bodies[key==='stopper'?'tube':key];
      if(!n||Number(n.getAttribute('opacity')??1)<=.05)return null;
      return {bounds:key==='stopper'?[430,575,120,110]:bounds[key],d:key==='tube'?tubePath:null,stroke:key==='tube',transform:n.getAttribute('transform')||''};
    },
    operation(stage,frame,assembly,operationView){
      operationStage=stage;activeView=operationView;
      const chemical=stage<5?assembly:{peroxide:1,catalyst:1,sealed:1};
      const level=790-165*chemical.peroxide;
      flaskLiquid.setAttribute('y',level);flaskLiquid.setAttribute('height',chemical.peroxide?805-level:0);
      powder.setAttribute('opacity',chemical.catalyst);powder.setAttribute('transform',`translate(310 790) scale(1 ${chemical.catalyst}) translate(-310 -790)`);
      const capX=130+185*chemical.sealed,capY=250+85*chemical.sealed;
      const tipX=stage<5?800:800+235*frame.tube;
      const transform=tubeTransform(capX,capY,tipX,665);tube.setAttribute('transform',transform);
      jarWater.setAttribute('opacity','1');jarWater.setAttribute('y','30');jarWater.setAttribute('height',360*(1-frame.collected));jarSurface.setAttribute('cy',30+360*(1-frame.collected));jarSurface.setAttribute('opacity',frame.collected<1?1:0);
      const liquid=operationView.querySelector('[data-part="jar-water"]');
      liquid.setAttribute('y',290+360*frame.collected);liquid.setAttribute('height',360*(1-frame.collected));
      const line=operationView.querySelector('[data-part="water-line"]');line.setAttribute('cy',290+360*frame.collected);
      const flow=operationView.querySelector('[data-part="flow"]');flow.setAttribute('d',tubePath);flow.setAttribute('transform',transform);
      lid.setAttribute('transform',`translate(${320*(1-(stage===7?frame.cover:0))} 0)`);
      lid.setAttribute('opacity','1');label.textContent=frame.collected===0?'瓶內裝滿清水':frame.collected===1?'已收集氧氣':'';
      for(const canvas of operationView.querySelectorAll('.oxygen-main-scene,.oxygen-mobile-zoom svg'))canvas.setAttribute('viewBox','40 0 1470 900');
      operationView.dataset.sharedScene='oxygen-setup-art';
    },
    render(elapsed) {
      operationStage=elapsed===0?0:1;activeView=view;flaskLiquid.setAttribute('height','0');powder.setAttribute('opacity','0');jarWater.setAttribute('opacity','1');
      const f=setupFrame(elapsed),a=f.arrangement;
      view.dataset.setupPhase=f.phase;view.dataset.tankFill=f.tankFill.toFixed(4);view.dataset.jarFill=f.jarFill.toFixed(4);view.dataset.setupCover=String(f.covered);view.dataset.setupMouthY=f.mouthY.toFixed(3);
      setTransform(flask,[256,-173,.671,.736],[0,0,1,1],a);
      setTransform(tank,[143,-214,.758,.75],[0,0,1,1],a);
      // Unused reagents remain recognisable while moving to the edge of the desk.
      setTransform(source,[0,0,1,1],[-300,400,.8,.8],a);source.setAttribute('opacity','1');
      setTransform(catalyst,[0,0,1,1],[-400,180,.65,.65],a);catalyst.setAttribute('opacity','1');
      jar.setAttribute('transform',`translate(${f.jarX} ${f.jarY}) rotate(${f.angle}) scale(${mix(.762,1,a)} ${mix(.907,1,a)}) translate(-111.5 -215)`);
      jarWater.setAttribute('y',390-360*f.jarFill);jarWater.setAttribute('height',360*f.jarFill);jarSurface.setAttribute('cy',390-360*f.jarFill);jarSurface.setAttribute('opacity',f.jarFill>0?1:0);
      lid.setAttribute('opacity',String(f.cover));lid.setAttribute('transform',`translate(${(1-f.cover)*320+f.uncover*320} 0)`);
      const bottom=[[641,746],[718,695],[1448,737],[1380,780]],rim=[[622,540],[729,482],[1462,510],[1405,556]];
      const top=bottom.map((p,i)=>p.map((v,j)=>mix(v,rim[i][j],.82*f.tankFill)));
      const path=points=>'M'+points.map(p=>p.join(' ')).join('L')+'Z';
      front.setAttribute('d',path([top[0],top[1],top[2],bottom[2],bottom[3],bottom[0]]));surface.setAttribute('d',path(top));water.setAttribute('opacity',f.tankFill>0?1:0);
      const y=top[0][1];
      const px=mix(1080,f.jarX-123.5,a),py=mix(570,f.jarY-230,a);
      plate.setAttribute('transform',`translate(${px} ${py}) scale(${mix(1.6,1,a)} ${mix(1.6,.22,a)})`);plate.setAttribute('opacity',String(1-f.cover));
      tube.setAttribute('transform',`translate(${mix(485,130,f.outlet)} ${mix(620,250,f.outlet)}) rotate(${36*f.outlet}) scale(${mix(1,1.38,f.outlet)}) translate(-485 -620)`);
      const pouringTank=f.time>3000&&f.time<5500,pouringJar=f.time>6000&&f.time<8500;
      const d=pouringTank?`M880 -40Q850 150 870 ${y-35}`:`M${f.jarX} -40V${f.jarY-215+390-360*f.jarFill}`;
      for(const n of[stream,highlight]){n.setAttribute('d',d);n.setAttribute('opacity',pouringTank||pouringJar?1:0);}
      label.textContent=pouringTank||pouringJar?'注入清水':f.covered?'玻璃片遮住瓶口':f.jarFill===1?'瓶內裝滿清水':'';
      label.setAttribute('x',pouringTank?800:950);label.setAttribute('y',pouringTank?410:250);
      tube.setAttribute('transform',tubeTransform(mix(485,130,f.outlet),mix(620,250,f.outlet),mix(1075,800,f.outlet),mix(580,665,f.outlet)));
      view.dataset.sharedScene='oxygen-setup-art';
      main.setAttribute('viewBox',`${mix(0,40,a)} 0 ${mix(1536,1470,a)} ${mix(850,900,a)}`);
      main.parentElement.style.aspectRatio=`${mix(1536,1470,a)} / ${mix(850,900,a)}`;
      // The same complete scene remains in the phone view, so the rotation and
      // submerged mouth cannot leave a fixed close-up while moving.
      zoom.setAttribute('viewBox','40 0 1470 900');
      return messages[f.phase];
    }
  };
}
