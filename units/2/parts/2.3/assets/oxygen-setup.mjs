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
const crops={source:[48,95,240,425],flask:[365,60,290,470],tank:[650,170,750,360],jar:[1425,75,215,465],catalyst:[45,630,330,180],tube:[435,620,785,195],plate:[1190,660,475,190],cork:[445,700,150,113]};
function sprite(key,x,y,w,h) {
  const n=svg('svg',{x,y,width:w,height:h,viewBox:crops[key].join(' '),preserveAspectRatio:'none',overflow:'hidden'});
  n.append(svg('image',{href:'assets/oxygen-setup-sprites.png',width:1686,height:933}));return n;
}
export function createSetupScene(view,panels) {
  const main=view.querySelector('.oxygen-main-scene'),zoom=view.querySelector('.oxygen-mobile-zoom svg');
  // Clip definitions must remain outside hidden step panels. Chromium drops
  // clips referenced by another SVG when their defining panel is display:none.
  const art=svg('g',{id:'oxygen-setup-art'}),defs=view.closest('.oxygen-preparation').querySelector('.oxygen-paint-resources defs');defs.append(art);
  art.append(svg('image',{href:'assets/oxygen-setup-table.png',width:1536,height:900,preserveAspectRatio:'none','data-shared-background':''}));
  const shadowGradient=svg('radialGradient',{id:'oxygen-contact-shadow'});shadowGradient.append(svg('stop',{offset:0,'stop-color':'#544c40','stop-opacity':'.2'}),svg('stop',{offset:1,'stop-color':'#544c40','stop-opacity':0}));defs.append(shadowGradient);
  const source=svg('g',{'data-setup-body':'source'});source.append(sprite('source',75,70,165,350));art.append(source);
  const catalyst=svg('g',{'data-setup-body':'catalyst'});catalyst.append(sprite('catalyst',90,530,275,145));art.append(catalyst);
  const flask=svg('g',{'data-setup-body':'flask'});
  const flaskOutline='M246 305Q315 291 392 305V330H381V405L479 725Q498 796 315 815Q133 796 151 725L264 405V330H246Z';
  const flaskClip=svg('clipPath',{id:'shared-flask-inside'}),flaskInside=svg('path',{d:'M274 322H374V405L466 718Q477 750 448 777Q315 820 182 777Q157 750 167 718L274 405Z'});flaskClip.append(flaskInside);defs.append(flaskClip);
  // Trace the inner glass surface, not a smaller free-standing container.
  // The same profile determines the meniscus at every level during pouring.
  const profileLength=flaskInside.getTotalLength(),profile=Array.from({length:513},(_,i)=>flaskInside.getPointAtLength(profileLength*i/512));
  function liquidSpan(y){
    const xs=[];
    for(let i=1;i<profile.length;i++){
      const a=profile[i-1],b=profile[i];
      if((a.y<=y&&b.y>y)||(b.y<=y&&a.y>y))xs.push(a.x+(b.x-a.x)*(y-a.y)/(b.y-a.y));
    }
    return xs.length?[Math.min(...xs),Math.max(...xs)]:[315,315];
  }
  flask.append(svg('ellipse',{cx:315,cy:811,rx:170,ry:19,fill:'url(#oxygen-contact-shadow)'}));
  const contents=svg('g',{'clip-path':'url(#shared-flask-inside)'});
  const flaskLiquid=svg('rect',{x:160,y:805,width:310,height:0,fill:'#b8dce2','fill-opacity':'.35','data-shared-flask-liquid':''});
  const flaskSurface=svg('ellipse',{cx:315,cy:805,rx:0,ry:10,fill:'#d3eef0','fill-opacity':'.34',stroke:'#91b7bc','stroke-width':1.5,'data-shared-flask-surface':''});
  const powder=svg('g',{'data-shared-catalyst':''});
  powder.append(svg('path',{d:'M234 777Q257 751 283 763Q315 744 340 763Q375 755 396 778Q318 799 234 777Z',fill:'#282c29'}));
  for(let i=0;i<90;i++){const x=230+(i*41%169),y=760+(i*17%25);powder.append(svg('circle',{cx:x,cy:y,r:2.5+(i%4),fill:i%3?'#202521':'#626a61'}));}
  contents.append(flaskLiquid,flaskSurface,powder);flask.append(sprite('flask',140,290,350,530),contents);art.append(flask);
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
  const jarShadow=svg('ellipse',{cx:1190,cy:849,rx:111,ry:12,fill:'url(#oxygen-contact-shadow)',opacity:0,'data-storage-shadow':''});art.append(jarShadow);
  const lid=svg('g',{'data-setup-cover':'','data-setup-body':'plate'});
  const platePhoto=sprite('plate',-20,-10,265,40);platePhoto.setAttribute('transform','translate(0 24) skewY(-3)');platePhoto.setAttribute('data-photographic-equipment','plate');lid.append(platePhoto);art.append(jar);art.append(lid);
  const plate=lid;
  const frontTint=svg('g',{'clip-path':'url(#setup-tank-inside)'});frontTint.append(svg('path',{d:'M933 587L1137 596V685H933Z',fill:'#bbdce0','fill-opacity':'.14'}));art.insertBefore(frontTint,lid);
  const tube=svg('g',{'data-setup-body':'tube'}),pipeOuter=svg('path',{fill:'none',stroke:'#759aa2','stroke-width':19,'stroke-linecap':'round','stroke-linejoin':'round','data-shared-tube-path':''}),pipeInner=svg('path',{fill:'none',stroke:'#d4ecee','stroke-width':12,'stroke-linecap':'round','stroke-linejoin':'round'}),pipeShine=svg('path',{fill:'none',stroke:'#fff','stroke-opacity':'.9','stroke-width':3,'stroke-linecap':'round'});
  tube.append(pipeOuter,pipeInner,pipeShine);art.append(tube);
  const restingTube=svg('g',{'data-photographic-equipment':'tube'});restingTube.append(sprite('tube',-27.3,-105.3,612.3,152.1));art.append(restingTube);
  const stopper=svg('g',{'data-setup-body':'stopper'}),corkPhoto=sprite('cork',-35,-57,70,114);corkPhoto.setAttribute('transform','rotate(90)');corkPhoto.setAttribute('data-photographic-equipment','stopper');stopper.append(corkPhoto);art.append(stopper);

  const stream=svg('path',{fill:'none',stroke:'#a8e4ee','stroke-width':12,'stroke-linecap':'round','data-setup-stream':''});
  const highlight=svg('path',{fill:'none',stroke:'#fff','stroke-opacity':'.85','stroke-width':3});art.append(stream,highlight);
  const label=svg('text',{x:1390,y:95,'text-anchor':'end',fill:'#315c55','font-size':28,'paint-order':'stroke',stroke:'#fff','stroke-width':5});art.append(label);
  const makeLabel=(text,x,y)=>{const n=svg('text',{x,y,'text-anchor':'middle',fill:'#3b5952','font-size':23,'paint-order':'stroke',stroke:'#fff','stroke-width':4,'stroke-opacity':'.75'});n.textContent=text;art.append(n);return n;};
  const flaskName=makeLabel('錐形瓶（空）',315,863),tankName=makeLabel('水槽',1378,640),jarName=makeLabel('',1035,390);
  tankName.setAttribute('data-setup-label','tank');
  const tankLeader=svg('g',{'data-tank-label-leader':''});tankLeader.append(svg('path',{d:'M1382 650L1408 695',fill:'none',stroke:'#4a6b61','stroke-width':2.5}),svg('circle',{cx:1408,cy:695,r:4,fill:'#4a6b61',stroke:'#fff','stroke-width':1.5}));
  tank.append(tankLeader,tankName);
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
    const bubbles=drawing.querySelector('[data-part=reaction-bubbles]');
    if(bubbles){const inside=svg('g',{'clip-path':'url(#shared-flask-inside)','data-flask-bubble-clip':''});bubbles.before(inside);inside.append(bubbles);}
    const liquid=drawing.querySelector('[data-part="jar-water"]');
    if(liquid){liquid.setAttribute('fill','#83d3df');liquid.setAttribute('fill-opacity','.42');liquid.parentElement.setAttribute('clip-path','url(#shared-jar-world)');}
  }
  const worldClip=svg('clipPath',{id:'shared-jar-world'});
  worldClip.append(svg('path',{d:clip.firstChild.getAttribute('d'),transform:'translate(1035 465) rotate(180) translate(-111.5 -215)'}));defs.append(worldClip);
  // Keep the material labels and hit areas, but render their desk with this same
  // scene too. The original photo remains the no-JavaScript fallback.
  const photo=panels[0].querySelector('.oxygen-materials-photo'),materialView=svg('svg',{viewBox:'0 0 1536 900','aria-hidden':'true','data-shared-materials':''});
  materialView.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none';
  materialView.append(svg('use',{href:'#oxygen-setup-art'}));photo.insertBefore(materialView,photo.querySelector('button'));photo.querySelector('img').style.opacity='0';
  // The original photo's hit areas use an 850px crop. Keep them attached to
  // their objects when the shared frame reveals the complete 900px tabletop.
  photo.querySelectorAll('[data-material]').forEach(button=>{
    for(const key of['--hit-y','--hit-h'])button.style.setProperty(key,`${parseFloat(button.style.getPropertyValue(key))*850/900}%`);
  });
  let activeView=view,operationStage=1;
  let tubePath='',restingTubePath='',restingTubeBounds=[],tubePhotoOpacity=1;
  function route(capX,capY,tipX,tipY){return `M${capX} ${capY-25}V205Q${capX} 185 ${capX+20} 185H700Q720 185 720 205V${tipY+35}Q720 ${tipY+55} 740 ${tipY+55}H${tipX-20}Q${tipX} ${tipY+55} ${tipX} ${tipY+35}V${tipY}`;}
  function positionPipe(capX,capY,tipX,progress=1,layout=1){
    const parkedX=mix(430,550,layout),parkedY=mix(625,839,layout);
    const lift=between(progress,0,.45),across=between(progress,.45,.8),lower=between(progress,.8,1);
    const x=mix(parkedX,capX,across),y=mix(mix(parkedY,110,lift),capY,lower);
    // Interpolate the centreline, never squash the glass cross-section.
    const spread=between(progress,0,.45),tip=mix(x+630,tipX,spread),top=mix(y,185,spread),right=mix(x+550,720,spread),startX=x+25*(1-spread),firstY=mix(y,205,spread),bottom=mix(y+20,720,spread),bend=mix(y+20,700,spread);
    tubePath=progress===1?route(capX,capY,tipX,665):`M${startX} ${y-25*spread}V${firstY}Q${startX} ${top} ${mix(startX,x+20,spread)} ${top}H${right-20}Q${right} ${top} ${right} ${firstY}V${bend}Q${right} ${bottom} ${right+20} ${bottom}H${tip-20}Q${tip} ${bottom} ${tip} ${bend}V${mix(y+35,665,spread)}`;
    for(const n of[pipeOuter,pipeInner,pipeShine])n.setAttribute('d',tubePath);
    tube.setAttribute('transform','');
    tubePhotoOpacity=1-between(progress,0,.3);restingTube.setAttribute('transform',`translate(${x} ${y})`);restingTube.setAttribute('opacity',tubePhotoOpacity);
    tube.setAttribute('opacity',1-tubePhotoOpacity);stopper.setAttribute('opacity',1-tubePhotoOpacity);
    restingTubePath=`M${x+72} ${y-16}L${x+520} ${y-83}Q${x+550} ${y-90} ${x+560} ${y-60}L${x+565} ${y-32}`;restingTubeBounds=[x-30,y-110,620,160];
    stopper.setAttribute('transform',`translate(${x} ${y}) rotate(${-90*(1-progress)}) scale(${mix(mix(1,.8,layout),1,lift)})`);
    return tubePath;
  }
  const parkedPlate='translate(1300 764.8) scale(.8 2.3)';
  function preparePlate(f,jarTransform){
    if(f.cover===0)plate.setAttribute('transform',`translate(${mix(1110,1300,f.arrangement)} ${mix(484.4,764.8,f.arrangement)}) scale(${mix(1.49,.8,f.arrangement)} ${mix(4.4,2.3,f.arrangement)})`);
    else if(f.cover<1){const c=f.cover;let cx,cy,sx;if(c<.55){cx=1389.2;cy=mix(806.2,90,c/.55);sx=mix(.8,.9,c/.55);}else if(c<.85){cx=mix(1389.2,f.jarX,(c-.55)/.3);cy=90;sx=mix(.9,1,(c-.55)/.3);}else{cx=f.jarX;cy=mix(90,f.jarY-197,(c-.85)/.15);sx=1;}plate.setAttribute('transform',`translate(${cx} ${cy}) scale(${sx} ${mix(2.3,1,Math.min(1,c/.55))}) translate(-111.5 -18)`);}
    else if(f.uncover<1)plate.setAttribute('transform',`${jarTransform} translate(${220*f.uncover} 0)`);
    else {const u=f.plateReturn,cx=mix(815,1389.2,u),cy=mix(662,806.2,u)-350*Math.sin(Math.PI*u);plate.setAttribute('transform',`translate(${cx} ${cy}) rotate(${180*(1-u)}) scale(${mix(1,.8,u)} ${mix(1,2.3,u)}) translate(-111.5 -18)`);}
    plate.setAttribute('opacity','1');
  }

  const setTransform=(n,a,b,t)=>n.setAttribute('transform',`translate(${mix(a[0],b[0],t)} ${mix(a[1],b[1],t)}) scale(${mix(a[2],b[2],t)} ${mix(a[3],b[3],t)})`);
  const bodies={source,catalyst,flask,tank,jar,plate,tube,stopper};
  const bounds={source:[75,70,165,350],catalyst:[90,530,275,145],flask:[140,290,350,530],tank:[590,445,890,380],jar:[0,0,223,430],plate:[-20,10,265,50],tube:[200,150,900,590],stopper:[-57,-35,114,70]};
  return {
    geometry(key) {
      if(operationStage>1&&['source','spoon'].includes(key)){
        const n=activeView.querySelector(`[data-part="${key==='source'?'reagent-bottle':'catalyst-spoon'}"]`);
        return n&&Number(n.getAttribute('opacity'))>.01?{bounds:key==='source'?[-52,0,104,210]:[-27,-18,245,55],transform:n.getAttribute('transform')||''}:null;
      }
      if(operationStage>1&&key==='catalyst')return Number(powder.getAttribute('opacity'))>.01?{bounds:[228,750,175,46],transform:''}:null;
      if(key==='tube'&&tubePhotoOpacity>.5)return {bounds:restingTubeBounds,d:restingTubePath,stroke:true,transform:''};
      const n=bodies[key];
      if(!n||Number(n.getAttribute('opacity')??1)<=.05)return null;
      const outlines={flask:flaskOutline,tank:'M622 540L729 482L1462 510L1448 737L1380 780L641 746Z',jar:'M43 18Q112 0 180 18V60Q203 80 203 108V378Q112 419 20 378V108Q20 80 43 60Z',plate:'M47 18L237 14L176 42L-10 42Z',stopper:'M-57 -28H57V35H-57Z'};
      return {bounds:bounds[key],d:key==='tube'?tubePath:outlines[key],stroke:key==='tube',transform:n.getAttribute('transform')||''};
    },
    operation(stage,frame,assembly,operationView){
      operationStage=stage;activeView=operationView;
      const chemical=stage<5?assembly:{peroxide:1,catalyst:1,sealed:1};
      const level=790-165*chemical.peroxide;
      flaskLiquid.setAttribute('y',level);flaskLiquid.setAttribute('height',chemical.peroxide?805-level:0);
      const [left,right]=liquidSpan(level);
      flaskSurface.setAttribute('cx',(left+right)/2);flaskSurface.setAttribute('rx',(right-left)/2);flaskSurface.setAttribute('cy',level);flaskSurface.setAttribute('opacity',chemical.peroxide?1:0);
      powder.setAttribute('opacity',chemical.catalyst);powder.setAttribute('transform',`translate(310 790) scale(1 ${chemical.catalyst}) translate(-310 -790)`);
      const capX=250+65*chemical.sealed,capY=350-15*chemical.sealed-75*Math.sin(Math.PI*chemical.sealed);
      const tipX=stage<5?800:800+235*frame.tube;
      positionPipe(capX,capY,tipX);
      jarWater.setAttribute('opacity','1');jarWater.setAttribute('y','30');jarWater.setAttribute('height',360*(1-frame.collected));jarSurface.setAttribute('cy',30+360*(1-frame.collected));jarSurface.setAttribute('opacity',frame.collected<1?1:0);
      const liquid=operationView.querySelector('[data-part="jar-water"]');
      liquid.setAttribute('y',290+360*frame.collected);liquid.setAttribute('height',360*(1-frame.collected));
      const line=operationView.querySelector('[data-part="water-line"]');line.setAttribute('cy',290+360*frame.collected);
      const flow=operationView.querySelector('[data-part="flow"]');flow.setAttribute('d',tubePath);flow.setAttribute('transform','');
      const jarX=mix(1035,1190,frame.setDown),jarY=mix(mix(465,260,frame.lift),650,frame.setDown),angle=180*(1-frame.upright);
      const jarTransform=`translate(${jarX} ${jarY}) rotate(${angle}) translate(-111.5 -215)`;
      jar.setAttribute('transform',jarTransform);frontTint.setAttribute('opacity',1-frame.lift);jarShadow.setAttribute('opacity',frame.setDown);
      if(stage===7&&frame.cover>0){
        if(frame.cover===1)plate.setAttribute('transform',jarTransform);
        else {const c=frame.cover;let cx,cy;if(c<.35){const u=c/.35;cx=mix(1389.2,1280,u);cy=mix(806.2,480,u);}else if(c<.7){cx=1280;cy=mix(480,662,(c-.35)/.35);}else{cx=mix(1280,1035,(c-.7)/.3);cy=662;}plate.setAttribute('transform',`translate(${cx} ${cy}) rotate(${180*Math.min(1,c/.35)}) scale(${mix(.8,1,Math.min(1,c/.35))} ${mix(2.3,1,Math.min(1,c/.35))}) translate(-111.5 -18)`);}
      }else plate.setAttribute('transform',parkedPlate);
      operationView.dataset.storageLift=String(frame.lift);operationView.dataset.storageUpright=String(frame.upright);operationView.dataset.storageSetDown=String(frame.setDown);
      const showTankLabel=stage===7&&frame.cover>0&&frame.cover<1?'0':'1';tankName.setAttribute('opacity',showTankLabel);tankLeader.setAttribute('opacity',showTankLabel);
      label.textContent='';flaskName.textContent=chemical.peroxide===0?'錐形瓶（空）':chemical.catalyst===0?'雙氧水（無色溶液）':'雙氧水＋二氧化錳';jarName.textContent=frame.collected===0?'瓶內裝滿清水':frame.collected>.3?'氧氣（無色）':'';
      jarName.setAttribute('x',jarX);jarName.setAttribute('y',jarY-75);

      operationView.querySelector('.oxygen-main-scene').setAttribute('viewBox','0 0 1536 900');
      operationView.querySelector('.oxygen-mobile-zoom svg').setAttribute('viewBox',stage<5?'90 110 570 790':stage===7?'740 25 620 865':'740 235 520 550');
      operationView.dataset.sharedScene='oxygen-setup-art';
    },
    render(elapsed) {
      operationStage=elapsed===0?0:1;activeView=view;flaskLiquid.setAttribute('height','0');flaskSurface.setAttribute('opacity','0');powder.setAttribute('opacity','0');jarWater.setAttribute('opacity','1');jarShadow.setAttribute('opacity','0');
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
      positionPipe(250,350,800,f.outlet,f.arrangement);flaskName.setAttribute('opacity',f.arrangement);tankName.setAttribute('opacity',f.arrangement);flaskName.textContent='錐形瓶（空）';jarName.textContent=f.immersion===1?'瓶內裝滿清水':'';
      const tankLabelOpacity=f.cover>0&&f.plateReturn<1?0:f.arrangement;tankName.setAttribute('opacity',tankLabelOpacity);tankLeader.setAttribute('opacity',tankLabelOpacity);
      jarName.setAttribute('x','1035');jarName.setAttribute('y','390');
      view.dataset.sharedScene='oxygen-setup-art';
      main.setAttribute('viewBox','0 0 1536 900');
      // Follow the jar without leaving the shared background; the main view
      // always retains the complete apparatus.
      zoom.setAttribute('viewBox',`${Math.min(760,Math.max(40,f.jarX-375))} 60 750 840`);
      return messages[f.phase];
    }
  };
}
