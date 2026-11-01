// The preparation is one bounded instructional clock. All water is clear water;
// no peroxide, catalyst or gas has entered the apparatus at this point.
export const SETUP_DURATION = 20800;
const unit = n => Math.max(0, Math.min(1, n));
const ease = n => { const x=unit(n); return x*x*(3-2*x); };
const between = (t,a,b) => ease((t-a)/(b-a));
const mix = (a,b,t) => a+(b-a)*t;
export function setupFrame(elapsed) {
  const time=Math.max(0,Math.min(SETUP_DURATION,elapsed));
  const arrangement=between(time,400,2400),tankFill=between(time,3000,5500),jarFill=between(time,6000,8500);
  const cover=between(time,9000,10000),inversion=between(time,10400,12400),immersion=between(time,12800,14800);
  const uncover=between(time,15200,16000),plateReturn=between(time,16000,18000),outlet=between(time,18400,19600);
  const phase=time<3000?'arrange':time<6000?'tank':time<9000?'jar':time<10400?'cover':time<12800?'invert':time<15200?'immerse':time<16000?'uncover':time<18400?'plate':time<20000?'outlet':'ready';
  return {time,arrangement,tankFill,jarFill,cover,inversion,immersion,uncover,plateReturn,outlet,phase,
    jarX:mix(mix(1390,1150,arrangement),1035,immersion),jarY:mix(mix(250,330,arrangement),465,immersion),
    angle:180*inversion,mouthY:mix(mix(250,330,arrangement),465,immersion)-215*Math.cos(Math.PI*inversion),
    covered:cover===1&&uncover===0};
}
const messages={arrange:'從材料桌面開始，把錐形瓶、水槽與集氣瓶移到操作位置',tank:'先將清水注入空水槽，建立排水集氣的水中環境',jar:'把清水注入直立的集氣瓶，直到瓶內裝滿水',cover:'用薄玻璃片遮住裝滿水的集氣瓶口',invert:'玻璃片貼住瓶口，將裝滿水的集氣瓶連續倒置',immerse:'保持瓶口被遮住，將倒置瓶的瓶口移入水面下',uncover:'瓶口已在水下，再把遮住瓶口的玻璃片移開',plate:'把移開的玻璃片取出，暫放在桌面上',outlet:'將導管出口放進瓶外的水中，現在先不接入集氣瓶',ready:'集氣位置已備好；瓶內裝滿水，導管出口留在瓶外水中'};
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
  const shadowGradient=svg('radialGradient',{id:'oxygen-contact-shadow'});shadowGradient.append(svg('stop',{offset:0,'stop-color':'#544c40','stop-opacity':'.2'}),svg('stop',{offset:1,'stop-color':'#544c40','stop-opacity':0}));defs.append(shadowGradient);
  const source=svg('g',{'data-setup-body':'source'});source.append(sprite('source',75,70,165,350));art.append(source);
  const catalyst=svg('g',{'data-setup-body':'catalyst'});catalyst.append(sprite('catalyst',90,530,275,145));art.append(catalyst);
  const flask=svg('g',{'data-setup-body':'flask'});
  const flaskClip=svg('clipPath',{id:'shared-flask-inside'});flaskClip.append(svg('path',{d:'M277 310H355V410L452 724Q466 780 420 795Q315 815 206 793Q161 780 179 724L277 410Z'}));defs.append(flaskClip);
  flask.append(svg('ellipse',{cx:315,cy:811,rx:170,ry:19,fill:'url(#oxygen-contact-shadow)'}));
  const contents=svg('g',{'clip-path':'url(#shared-flask-inside)'});
  const flaskLiquid=svg('rect',{x:160,y:805,width:310,height:0,fill:'#b8dce2','fill-opacity':'.35','data-shared-flask-liquid':''});
  const powder=svg('g',{'data-shared-catalyst':''});
  for(let i=0;i<90;i++){const x=184+(i*41%265),y=758+(i*17%38);powder.append(svg('circle',{cx:x,cy:y,r:2+(i%4),fill:i%3?'#303731':'#596058'}));}
  contents.append(flaskLiquid,powder);flask.append(contents,sprite('flask',140,290,350,530));art.append(flask);
  const tank=svg('g',{'data-setup-body':'tank'});
  tank.append(svg('ellipse',{cx:1035,cy:788,rx:430,ry:22,fill:'url(#oxygen-contact-shadow)'}));
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
  const lid=svg('g',{'data-setup-cover':'','data-setup-body':'plate'});
  lid.append(svg('path',{d:'M-20 16L8 5H245L223 16V21H-20Z',fill:'#d8f4ee','fill-opacity':'.22',stroke:'#8eb6ba','stroke-width':1.5}),svg('path',{d:'M-18 16H223',stroke:'#fff','stroke-width':1.5}));art.append(jar);art.append(lid);
  const plate=lid;
  const frontTint=svg('g',{'clip-path':'url(#setup-tank-inside)'});frontTint.append(svg('path',{d:'M933 587L1137 596V685H933Z',fill:'#bbdce0','fill-opacity':'.14'}));art.insertBefore(frontTint,lid);
  const tube=svg('g',{'data-setup-body':'tube'}),pipeOuter=svg('path',{fill:'none',stroke:'#7e9fa5','stroke-width':11,'stroke-linecap':'round','stroke-linejoin':'round','data-shared-tube-path':''}),pipeInner=svg('path',{fill:'none',stroke:'#e9f5f3','stroke-width':6,'stroke-linecap':'round','stroke-linejoin':'round'});
  tube.append(pipeOuter,pipeInner);art.append(tube);
  const stopper=svg('g',{'data-setup-body':'stopper'}),corkGradient=svg('linearGradient',{id:'oxygen-cork-shade',x2:1,y2:0});corkGradient.append(svg('stop',{offset:0,'stop-color':'#b9955d'}),svg('stop',{offset:'.45','stop-color':'#e0c18b'}),svg('stop',{offset:1,'stop-color':'#aa8251'}));defs.append(corkGradient);
  stopper.append(svg('path',{d:'M-38 -18L-29 24Q0 31 29 24L38 -18Z',fill:'url(#oxygen-cork-shade)',stroke:'#a58053','stroke-width':1.5}),svg('ellipse',{cx:0,cy:-18,rx:38,ry:10,fill:'#dcc294',stroke:'#bc9c6c','stroke-width':1.5}),svg('path',{d:'M0 -22V-6',stroke:'#eaf4ef','stroke-width':5,'stroke-linecap':'round'}));art.append(stopper);

  const stream=svg('path',{fill:'none',stroke:'#a8e4ee','stroke-width':12,'stroke-linecap':'round','data-setup-stream':''});
  const highlight=svg('path',{fill:'none',stroke:'#fff','stroke-opacity':'.85','stroke-width':3});art.append(stream,highlight);
  const label=svg('text',{x:1390,y:95,'text-anchor':'end',fill:'#315c55','font-size':28,'paint-order':'stroke',stroke:'#fff','stroke-width':5});art.append(label);
  const makeLabel=(text,x,y)=>{const n=svg('text',{x,y,'text-anchor':'middle',fill:'#3b5952','font-size':23,'paint-order':'stroke',stroke:'#fff','stroke-width':4,'stroke-opacity':'.75'});n.textContent=text;art.append(n);return n;};
  const flaskName=makeLabel('錐形瓶（空）',315,863),tankName=makeLabel('水槽',1340,430),jarName=makeLabel('',1035,390);
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
    drawing.querySelectorAll('.oxygen-scene-labels,[data-part=water-out]').forEach(n=>n.style.display='none');
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
  let tubePath='';
  function route(capX,capY,tipX,tipY){return `M${capX} ${capY-25}V205Q${capX} 185 ${capX+20} 185H700Q720 185 720 205V${tipY+35}Q720 ${tipY+55} 740 ${tipY+55}H${tipX-20}Q${tipX} ${tipY+55} ${tipX} ${tipY+35}V${tipY}`;}
  function positionPipe(capX,capY,tipX,progress=1){
    tubePath=route(capX,capY,tipX,665);for(const n of[pipeOuter,pipeInner])n.setAttribute('d',tubePath);
    let x,y,sx,sy;if(progress<.45){const u=progress/.45;x=430;y=mix(580,115,u);sx=mix(1.16,1,u);sy=mix(.16,1,u);}else if(progress<.8){const u=(progress-.45)/.35;x=mix(430,250,u);y=115;sx=sy=1;}else{x=250;y=mix(115,185,(progress-.8)/.2);sx=sy=1;}
    tube.setAttribute('transform',`translate(${x} ${y}) scale(${sx} ${sy}) translate(-250 -185)`);
    stopper.setAttribute('transform',`translate(${x+sx*(capX-250)} ${y+sy*(capY-185)}) rotate(${90*(1-progress)})`);
    return tubePath;
  }
  const parkedPlate='translate(1160 820) scale(1 3)';
  function preparePlate(f,jarTransform){
    if(f.cover===0)plate.setAttribute('transform',`translate(${mix(1110,1160,f.arrangement)} ${mix(540,820,f.arrangement)}) scale(${mix(1.49,1,f.arrangement)} ${mix(6,3,f.arrangement)})`);
    else if(f.cover<1){const c=f.cover;let cx,cy,sx;if(c<.15){const u=c/.15;cx=mix(1272.5,1390,u);cy=859;sx=mix(1,.9,u);}else if(c<.55){cx=1390;cy=mix(859,90,(c-.15)/.4);sx=.9;}else if(c<.85){cx=mix(1390,f.jarX,(c-.55)/.3);cy=90;sx=mix(.9,1,(c-.55)/.3);}else{cx=f.jarX;cy=mix(90,f.jarY-202,(c-.85)/.15);sx=1;}plate.setAttribute('transform',`translate(${cx} ${cy}) scale(${sx} ${mix(3,1,Math.min(1,c/.55))}) translate(-112.5 -13)`);}
    else if(f.uncover<1)plate.setAttribute('transform',`${jarTransform} translate(${220*f.uncover} 0)`);
    else {const u=f.plateReturn,cx=mix(814,1272.5,u),cy=mix(667,859,u)-350*Math.sin(Math.PI*u);plate.setAttribute('transform',`translate(${cx} ${cy}) rotate(${180*(1-u)}) scale(1 ${mix(1,3,u)}) translate(-112.5 -13)`);}
    plate.setAttribute('opacity','1');
  }

  const setTransform=(n,a,b,t)=>n.setAttribute('transform',`translate(${mix(a[0],b[0],t)} ${mix(a[1],b[1],t)}) scale(${mix(a[2],b[2],t)} ${mix(a[3],b[3],t)})`);
  const bodies={source,catalyst,flask,tank,jar,plate,tube,stopper};
  const bounds={source:[75,70,165,350],catalyst:[90,530,275,145],flask:[140,290,350,530],tank:[590,445,890,380],jar:[0,0,223,430],plate:[-20,5,265,16],tube:[200,150,900,590],stopper:[-38,-28,76,60]};
  return {
    geometry(key) {
      if(operationStage>1&&['source','spoon'].includes(key)){
        const n=activeView.querySelector(`[data-part="${key==='source'?'reagent-bottle':'catalyst-spoon'}"]`);
        return n&&Number(n.getAttribute('opacity'))>.01?{bounds:key==='source'?[-52,0,104,210]:[-27,-18,245,55],transform:n.getAttribute('transform')||''}:null;
      }
      if(operationStage>1&&key==='catalyst')return Number(powder.getAttribute('opacity'))>.01?{bounds:[180,752,275,48],transform:''}:null;
      const n=bodies[key];
      if(!n||Number(n.getAttribute('opacity')??1)<=.05)return null;
      return {bounds:bounds[key],d:key==='tube'?tubePath:null,stroke:key==='tube',transform:n.getAttribute('transform')||''};
    },
    operation(stage,frame,assembly,operationView){
      operationStage=stage;activeView=operationView;
      const chemical=stage<5?assembly:{peroxide:1,catalyst:1,sealed:1};
      const level=790-165*chemical.peroxide;
      flaskLiquid.setAttribute('y',level);flaskLiquid.setAttribute('height',chemical.peroxide?805-level:0);
      powder.setAttribute('opacity',chemical.catalyst);powder.setAttribute('transform',`translate(310 790) scale(1 ${chemical.catalyst}) translate(-310 -790)`);
      const capX=250+65*chemical.sealed,capY=350-15*chemical.sealed-75*Math.sin(Math.PI*chemical.sealed);
      const tipX=stage<5?800:800+235*frame.tube;
      positionPipe(capX,capY,tipX);
      jarWater.setAttribute('opacity','1');jarWater.setAttribute('y','30');jarWater.setAttribute('height',360*(1-frame.collected));jarSurface.setAttribute('cy',30+360*(1-frame.collected));jarSurface.setAttribute('opacity',frame.collected<1?1:0);
      const liquid=operationView.querySelector('[data-part="jar-water"]');
      liquid.setAttribute('y',290+360*frame.collected);liquid.setAttribute('height',360*(1-frame.collected));
      const line=operationView.querySelector('[data-part="water-line"]');line.setAttribute('cy',290+360*frame.collected);
      const flow=operationView.querySelector('[data-part="flow"]');flow.setAttribute('d',tubePath);flow.setAttribute('transform','');
      if(stage===7&&frame.cover>0){const c=frame.cover;let cx,cy;if(c<.35){const u=c/.35;cx=mix(1272.5,1280,u);cy=mix(859,480,u);}else if(c<.7){cx=1280;cy=mix(480,667,(c-.35)/.35);}else{cx=mix(1280,1034,(c-.7)/.3);cy=667;}plate.setAttribute('transform',`translate(${cx} ${cy}) scale(1 ${mix(3,1,Math.min(1,c/.35))}) translate(-112.5 -13)`);}else plate.setAttribute('transform',parkedPlate);
      label.textContent='';flaskName.textContent=chemical.peroxide===0?'錐形瓶（空）':chemical.catalyst===0?'雙氧水（無色溶液）':'雙氧水＋二氧化錳';jarName.textContent=frame.collected===0?'瓶內裝滿清水':frame.collected>.3?'氧氣（無色）':'';

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
      preparePlate(f,jar.getAttribute('transform'));frontTint.setAttribute('opacity',f.immersion);
      const bottom=[[641,746],[718,695],[1448,737],[1380,780]],rim=[[622,540],[729,482],[1462,510],[1405,556]];
      const top=bottom.map((p,i)=>p.map((v,j)=>mix(v,rim[i][j],.82*f.tankFill)));
      const path=points=>'M'+points.map(p=>p.join(' ')).join('L')+'Z';
      front.setAttribute('d',path([top[0],top[1],top[2],bottom[2],bottom[3],bottom[0]]));surface.setAttribute('d',path(top));water.setAttribute('opacity',f.tankFill>0?1:0);
      const y=top[0][1];
      const pouringTank=f.time>3000&&f.time<5500,pouringJar=f.time>6000&&f.time<8500;
      const d=pouringTank?`M880 -40Q850 150 870 ${y-35}`:`M${f.jarX} -40V${f.jarY-215+390-360*f.jarFill}`;
      for(const n of[stream,highlight]){n.setAttribute('d',d);n.setAttribute('opacity',pouringTank||pouringJar?1:0);}
      label.textContent=pouringTank||pouringJar?'清水':'';
      label.setAttribute('x',pouringTank?800:950);label.setAttribute('y',pouringTank?410:250);
      positionPipe(250,350,800,f.outlet);flaskName.setAttribute('opacity',f.arrangement);tankName.setAttribute('opacity',f.arrangement);flaskName.textContent='錐形瓶（空）';jarName.textContent=f.immersion===1?'瓶內裝滿清水':'';
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
