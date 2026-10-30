import {cupTransfer,drawCup,drawJet} from './cup-transfer.js?v=review-5';
import {SAMPLE_BOTTLE,SAMPLE_CUP,samplingFrame,streamPoint,bottleLiquid} from './investigation-transfer.js?v=pour-3';
const W=1536,H=1024;
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*t;
const random=(i,seed=1)=>{const n=Math.sin(i*137.7+seed*43.13)*43758.5453;return n-Math.floor(n);};
const HEATER_WORK={x:543,y:475,w:425,h:305},HEATER_TRAY={x:1160,y:547,w:163,h:117};
const SCALE_WORK={x:565,y:480,w:380,h:276},SCALE_TRAY={x:1340,y:551,w:143,h:104};
const DISH_HEAT={x:752,y:532},DISH_SCALE={x:755,y:505};
const FILTER_WORK={x:545,y:222,w:398,h:514};
const FILTRATE_CUP={x:611,y:498,w:162,h:180},FILTRATE_SCALE={x:674,y:335,w:162,h:180};
export function filtrateWeighingFrame(progress,reduced=false){
  const t=Math.max(0,Math.min(1,progress)),slide=smooth(t/.18),lift=smooth((t-.18)/.18),lower=smooth((t-.60)/.25),exchange=smooth((t-.30)/.32);
  const clear={x:770,y:FILTRATE_CUP.y},held={x:reduced?770:800,y:reduced?FILTRATE_SCALE.y:285};
  const cup=t<.18?{...FILTRATE_CUP,x:mix(FILTRATE_CUP.x,clear.x,slide)}:t<.60?{...FILTRATE_CUP,x:mix(clear.x,held.x,lift),y:mix(clear.y,held.y,lift)}:{...FILTRATE_CUP,x:mix(held.x,FILTRATE_SCALE.x,lower),y:mix(held.y,FILTRATE_SCALE.y,lower)};
  return{cup,exchange,settled:t>=.85};
}
export function dishWeighingFrame(progress,reduced=false){
  const t=Math.max(0,Math.min(1,progress)),exchange=smooth((t-.22)/.35),lower=smooth((t-.50)/.32);
  const rect=(a,b)=>Object.fromEntries(['x','y','w','h'].map(key=>[key,mix(a[key],b[key],exchange)]));
  const heater=rect(HEATER_WORK,HEATER_TRAY),scale=rect(SCALE_TRAY,SCALE_WORK);
  let dish;
  if(reduced){
    const moving=smooth((t-.20)/.62);dish={x:mix(DISH_HEAT.x,DISH_SCALE.x,moving),y:mix(DISH_HEAT.y,DISH_SCALE.y,moving)};
  }else{
    heater.y+=Math.sin(exchange*Math.PI)*90;scale.y-=Math.sin(exchange*Math.PI)*110;
    const lift=smooth(t/.22),held={x:810,y:375};
    dish=t<.50?{x:mix(DISH_HEAT.x,held.x,lift),y:mix(DISH_HEAT.y,held.y,lift)}:{x:mix(held.x,DISH_SCALE.x,lower),y:mix(held.y,DISH_SCALE.y,lower)};
  }
  return{dish,heater,scale,exchange,settled:t>=.82,reduced};
}

export function loadPicture(url){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error(`無法載入實驗器材：${url}`));im.src=url;});}
export function createRenderer(canvas,{table,atlas,glass}) {
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('這個瀏覽器無法顯示實驗桌。');
  canvas.width=W;canvas.height=H;
  const crops={bottle:[260,20,350,550],filter:[944,8,440,568],heat:[145,590,570,410],weigh:[869,614,530,385]};
  function sprite(kind,x,y,w,h){ctx.drawImage(atlas,...crops[kind],x,y,w,h);}
  function shadow(x,y,rx,ry){ctx.save();ctx.filter='blur(7px)';ctx.fillStyle='#3c271c42';ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();ctx.restore();}
  // Reuse the photographed bowl as one object, separate from the hotplate.
  const dishOutline=new Path2D();
  dishOutline.moveTo(250,660);dishOutline.bezierCurveTo(263,629,332,607,424,607);
  dishOutline.bezierCurveTo(512,607,578,625,594,648);dishOutline.bezierCurveTo(597,677,583,705,557,722);
  dishOutline.bezierCurveTo(504,754,361,758,304,724);dishOutline.bezierCurveTo(276,708,265,688,259,673);
  dishOutline.closePath();
  const heaterMask=new Path2D();heaterMask.rect(145,590,570,410);
  const clearedBowl=new Path2D();clearedBowl.ellipse(424,675,180,80,0,0,Math.PI*2);
  heaterMask.addPath(clearedBowl);
  // Remove the baked-in receiver so one independent beaker can leave the funnel.
  const filterMask=new Path2D();filterMask.rect(944,8,440,568);filterMask.rect(1010,306,205,210);
  function filterStand(){
    const rect=FILTER_WORK;
    ctx.save();ctx.translate(rect.x,rect.y);ctx.scale(rect.w/440,rect.h/568);ctx.translate(-944,-8);
    ctx.save();ctx.clip(filterMask,'evenodd');ctx.drawImage(atlas,944,8,440,568,944,8,440,568);ctx.restore();
    ctx.save();ctx.beginPath();ctx.moveTo(958,465);ctx.lineTo(1317,453);ctx.lineTo(1351,511);ctx.lineTo(980,522);ctx.closePath();ctx.clip();
    ctx.drawImage(atlas,1216,486,116,29,950,451,404,75);ctx.restore();
    ctx.drawImage(atlas,1225,447,52,37,1225,447,52,37);ctx.restore();
  }
  function funnelOutlet(){
    ctx.save();ctx.strokeStyle='#b9c4bd9c';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(685,493);ctx.lineTo(685,562);ctx.stroke();
    ctx.strokeStyle='#fffef2cf';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(682,493);ctx.lineTo(682,560);ctx.moveTo(688,493);ctx.lineTo(688,560);ctx.stroke();
    ctx.beginPath();ctx.ellipse(685,561,3,1.4,0,0,Math.PI*2);ctx.stroke();ctx.restore();
  }
  function filtrateCup(sample,pose,fill=1){beaker(pose.x,pose.y,pose.w,pose.h,sample,fill*.70,1);}
  function emptyHeater(rect){
    shadow(rect.x+rect.w*.5,rect.y+rect.h*.96,rect.w*.46,rect.h*.05);
    ctx.save();ctx.translate(rect.x,rect.y);ctx.scale(rect.w/570,rect.h/410);ctx.translate(-145,-590);
    const metal=ctx.createLinearGradient(250,635,590,770);metal.addColorStop(0,'#30302d');metal.addColorStop(1,'#111412');
    ctx.fillStyle=metal;ctx.beginPath();ctx.ellipse(428,710,216,88,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#77776d45';ctx.lineWidth=1;
    for(let radius=30;radius<205;radius+=7){ctx.beginPath();ctx.ellipse(428,710,radius,radius*.407,0,0,Math.PI*2);ctx.stroke();}
    ctx.clip(heaterMask,'evenodd');ctx.drawImage(atlas,145,590,570,410,145,590,570,410);ctx.restore();
  }
  function crystalDish(sample,pose){
    ctx.save();ctx.translate(pose.x-DISH_HEAT.x,pose.y-DISH_HEAT.y);
    ctx.save();ctx.translate(HEATER_WORK.x,HEATER_WORK.y);ctx.scale(HEATER_WORK.w/570,HEATER_WORK.h/410);ctx.translate(-145,-590);
    ctx.clip(dishOutline);ctx.drawImage(atlas,145,590,570,410,145,590,570,410);ctx.restore();
    ctx.save();ctx.beginPath();ctx.ellipse(752,525,120,32,0,0,Math.PI*2);ctx.clip();
    grains(752,532,95,21,170,true);if(sample.sand>0)grains(752,538,95,19,90);ctx.restore();ctx.restore();
  }

  function pill(text,x,y,w=190){ctx.save();ctx.fillStyle='#fffdf2f2';ctx.beginPath();ctx.roundRect(x-w/2,y-23,w,46,10);ctx.fill();ctx.fillStyle='#304d40';ctx.font='600 25px system-ui,sans-serif';ctx.textAlign='center';ctx.fillText(text,x,y+9);ctx.restore();}
  function grains(cx,cy,rx,ry,count=70,white=false,fade=1){
    ctx.save();ctx.globalAlpha=fade;
    for(let i=0;i<count;i++){
      const angle=random(i,3)*Math.PI*2,r=Math.sqrt(random(i,8)),x=cx+Math.cos(angle)*rx*r,y=cy+Math.sin(angle)*ry*r;
      const size=white?2.5+random(i,2)*3.8:1.5+random(i,2)*2.8;
      ctx.fillStyle=white?['#fffef8','#e6e2d5','#fbfaf5','#d7d1c1'][i%4]:['#866242','#b1926c','#654d36','#c5ac81'][i%4];
      ctx.beginPath();ctx.ellipse(x,y,size,size*.65,random(i)*3,0,Math.PI*2);ctx.fill();
      if(white){ctx.fillStyle='#fff';ctx.fillRect(x-size*.3,y-size*.3,size*.4,.8);}
    }ctx.restore();
  }
  function fluid(x,y,w,h,amount,sand=0,settled=0){
    if(amount<=0)return;
    const base=y+h*.89,level=base-h*.67*Math.min(1,amount/100),left=x+w*.13,right=x+w*.89;
    ctx.save();ctx.beginPath();ctx.moveTo(left,y+h*.13);ctx.lineTo(right,y+h*.13);ctx.lineTo(right-7,base);ctx.quadraticCurveTo(x+w*.5,base+14,left+7,base);ctx.closePath();ctx.clip();
    const g=ctx.createLinearGradient(left,level,right,base);g.addColorStop(0,sand>0?`rgba(202,181,145,${.33-.15*settled})`:'rgba(228,238,231,.2)');g.addColorStop(.6,sand>0?`rgba(188,162,117,${.42-.17*settled})`:'rgba(205,222,216,.28)');g.addColorStop(1,sand>0?'rgba(160,132,91,.44)':'rgba(160,187,176,.32)');ctx.fillStyle=g;ctx.fillRect(left,level,right-left,base-level+20);
    ctx.fillStyle=sand>0?'#eadcc39c':'#eff8f47a';ctx.beginPath();ctx.ellipse(x+w*.51,level,w*.38,h*.035,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#fafff6ac';ctx.lineWidth=2;ctx.stroke();
    if(sand>0){const portion=Math.min(1,amount/100);grains(x+w*.5,base-3,w*.31,h*.018,Math.round(80*portion));if(settled<1){for(let i=0;i<Math.round(40*portion);i++){const px=left+random(i,1)*(right-left),py=mix(level+random(i,2)*(base-level),base,settled);ctx.fillStyle='#92734c90';ctx.fillRect(px,py,2,2);}}}
    ctx.restore();
  }
  function beaker(x,y,w,h,sample,fill=1,settled=0,incoming=null){
    shadow(x+w*.5,y+h*.96,w*.42,h*.035);
    ctx.drawImage(glass,805,195,430,530,x,y,w,h);
    fluid(x,y,w,h,sample.water>0?(sample.water+sample.salt)*fill:0,sample.sand,settled);
    if(incoming)sampleStream(incoming);
    // A light second glass layer preserves reflections without hiding contents.
    ctx.save();ctx.globalAlpha=.18;ctx.drawImage(glass,805,195,430,530,x,y,w,h);ctx.restore();
    if(sample.water===0&&sample.salt>0){grains(x+w*.5,y+h*.85,w*.25,h*.02,95,true);if(sample.sand>0)grains(x+w*.5,y+h*.87,w*.28,h*.022,60);}
  }
  function source(stock,transfer){
    const {x,y,angle}=transfer?.pose||SAMPLE_BOTTLE.home,portions=transfer?.sourcePortions??stock;
    const liquid=bottleLiquid({x,y,angle},portions);
    shadow(x,704,140,15);
    ctx.save();ctx.translate(x,y);ctx.rotate(angle);
    sprite('bottle',-160,-250,320,500);
    ctx.save();ctx.beginPath();SAMPLE_BOTTLE.interior.forEach(([px,py],i)=>{if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);});ctx.closePath();ctx.clip();
    // The clip follows the turning glass, while gravity keeps the surface level.
    ctx.setTransform(1,0,0,1,0,0);
    if(portions>0){
      const g=ctx.createLinearGradient(0,liquid.line,0,liquid.line+300);g.addColorStop(0,'#e7dbc2b8');g.addColorStop(1,'#b99c6bbd');ctx.fillStyle=g;ctx.fillRect(0,liquid.line,W,H-liquid.line);
      ctx.fillStyle='#eee4caab';ctx.beginPath();ctx.ellipse((liquid.left+liquid.right)/2,liquid.line,(liquid.right-liquid.left)/2,7,0,0,Math.PI*2);ctx.fill();
      const base=Math.max(...liquid.shape.map(p=>p.y));grains(x,base-9,120,11,Math.round(110*portions/6));
    }
    ctx.restore();ctx.save();ctx.globalAlpha=.2;sprite('bottle',-160,-250,320,500);ctx.restore();
    ctx.fillStyle='#fffdf2ee';ctx.beginPath();ctx.roundRect(-118,28,236,63,6);ctx.fill();ctx.fillStyle='#293e33';ctx.font='600 29px system-ui,sans-serif';ctx.textAlign='center';ctx.fillText('未知樣本 X',0,69);ctx.restore();
  }
  function sampleStream(stream){
    const first=streamPoint(stream,stream.tail);ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
    ctx.beginPath();ctx.moveTo(first.x,first.y);
    for(let i=1;i<=32;i++){const point=streamPoint(stream,mix(stream.tail,stream.head,i/32));ctx.lineTo(point.x,point.y);}
    ctx.strokeStyle='#c7b28bbe';ctx.lineWidth=8;ctx.stroke();ctx.strokeStyle='#fff9e8ae';ctx.lineWidth=2;ctx.stroke();ctx.restore();
  }
  function filter(sample,animation,t){
    const running=animation?.kind==='filter',before=running?animation.before:sample;
    const f=running?cupTransfer(t,'filter'):null,received=f?.received??1;
    if(f?.outlet){
      f.outlet.mouth={x:685,y:562};
      f.outlet.target={x:FILTRATE_CUP.x+FILTRATE_CUP.w*.51,y:FILTRATE_CUP.y+FILTRATE_CUP.h*.89-FILTRATE_CUP.h*.67*Math.min(1,(sample.water+sample.salt)*received*.70/100)};
    }
    shadow(750,729,178,16);filterStand();
    filtrateCup({...sample,sand:0},FILTRATE_CUP,received);funnelOutlet();
    const retained=running?before.sand:sample.residues.at(-1);
    if(f?.held>0){ctx.save();ctx.beginPath();ctx.moveTo(594,325);ctx.lineTo(770,325);ctx.lineTo(682,425);ctx.closePath();ctx.clip();ctx.fillStyle='#c8b4918c';ctx.fillRect(590,400-60*Math.sqrt(f.held),190,110);ctx.restore();}
    if(retained>0)grains(682,405,35,9,Math.round(95*(f?.arrived??1)));
    if(f){drawCup(ctx,glass,f,before.sand);drawJet(ctx,f.stream,before.sand>0);drawJet(ctx,f.outlet);}
    return f;
  }
  function heat(sample,animation,t,now){
    const running=animation?.kind==='heat',f=running?cupTransfer(t,'heat'):null;
    const evaporated=running?smooth((t-.30)/.60):1,remaining=running?f.received*(1-evaporated):0;
    shadow(755,768,195,16);sprite('heat',543,475,425,305);
    ctx.save();ctx.beginPath();ctx.ellipse(752,525,120,32,0,0,Math.PI*2);ctx.clip();
    if(remaining>0){const g=ctx.createLinearGradient(0,500,0,560);g.addColorStop(0,'#d9e7db9c');g.addColorStop(1,'#a7beb1b0');ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(752,533-8*remaining,120*Math.sqrt(remaining),32*Math.sqrt(remaining),0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#fffef2c4';ctx.lineWidth=2;ctx.stroke();}
    const solid=running?smooth((evaporated-.40)/.60):1;
    grains(752,532,95,21,Math.round(170*solid),true);
    if(sample.sand>0)grains(752,538,95,19,Math.round(90*(f?.received??1)));
    if(running&&t>.30&&t<.90){for(let i=0;i<Math.ceil(24*remaining);i++){const p=(now/850+random(i,8))%1,x=752+(random(i,3)-.5)*175*Math.sqrt(remaining),y=528+(random(i,4)-.5)*26*Math.sqrt(remaining);ctx.strokeStyle=`rgba(250,255,247,${.8*(1-p)})`;ctx.lineWidth=1.2;ctx.beginPath();ctx.ellipse(x,y,1+p*6,(1+p*6)*.5,0,0,Math.PI*2);ctx.stroke();}}
    ctx.restore();
    if(f&&t<.30){drawCup(ctx,glass,f,animation.before.sand);drawJet(ctx,f.stream,animation.before.sand>0);}
    if(running&&t>.30&&t<.9){ctx.fillStyle='#ff7024';ctx.shadowColor='#ff6600';ctx.shadowBlur=12;ctx.beginPath();ctx.arc(635,700,8,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;}
    pill(running?(t<.30?'倒入蒸發皿':t<.9?'加熱中':'冷卻中'):'已冷卻',750,857,155);
    return f?{...f,remaining,evaporated,solid}:null;
  }
  function scaleDisplay(sample,running){
    ctx.fillStyle='#cbd8b5';ctx.fillRect(642,638,170,49);ctx.fillStyle='#223b2d';ctx.font='600 36px monospace';ctx.textAlign='center';ctx.fillText(running?'—':`${sample.sand+sample.salt+sample.water} g`,727,674);
    pill('已扣除容器質量',755,805,260);
  }
  function weigh(sample,running){
    shadow(755,749,170,15);sprite('weigh',565,480,380,276);
    if(sample.water>0){if(sample.phase==='filtered')filtrateCup(sample,FILTRATE_SCALE);else beaker(665,295,175,220,sample,1,sample.phase==='settled'?1:0);}
    else crystalDish(sample,DISH_SCALE);
    scaleDisplay(sample,running);
  }
  function moveFiltrateToScale(sample,animation,t){
    const movement=filtrateWeighingFrame(t,animation.reduced),{cup,exchange}=movement;
    ctx.save();ctx.globalAlpha=1-exchange;shadow(750,729,178,16);filterStand();
    const retained=sample.residues.at(-1);if(retained>0)grains(682,405,35,9,95,false,1-exchange);ctx.restore();
    ctx.save();ctx.globalAlpha=exchange;ctx.drawImage(atlas,982,85,238,219,1007,529,125,115);ctx.restore();
    ctx.save();ctx.globalAlpha=1-exchange;sprite('weigh',SCALE_TRAY.x,SCALE_TRAY.y,SCALE_TRAY.w,SCALE_TRAY.h);ctx.restore();
    ctx.save();ctx.globalAlpha=exchange;shadow(755,749,170,15);sprite('weigh',SCALE_WORK.x,SCALE_WORK.y,SCALE_WORK.w,SCALE_WORK.h);ctx.restore();
    filtrateCup(sample,cup);ctx.save();ctx.globalAlpha=1-exchange;funnelOutlet();ctx.restore();
    if(exchange>=1)scaleDisplay(sample,true);
    return movement;
  }
  function moveDishToScale(sample,animation,t){
    const movement=dishWeighingFrame(t,animation.reduced);
    const {scale,heater,dish,exchange}=movement;
    if(animation.reduced){
      ctx.save();ctx.globalAlpha=1-exchange;emptyHeater(HEATER_WORK);ctx.restore();
      ctx.save();ctx.globalAlpha=1-exchange;sprite('weigh',SCALE_TRAY.x,SCALE_TRAY.y,SCALE_TRAY.w,SCALE_TRAY.h);ctx.restore();
      ctx.save();ctx.globalAlpha=exchange;shadow(755,749,170,15);sprite('weigh',SCALE_WORK.x,SCALE_WORK.y,SCALE_WORK.w,SCALE_WORK.h);ctx.restore();
      ctx.save();ctx.globalAlpha=exchange;emptyHeater(HEATER_TRAY);ctx.restore();
    }else{
      shadow(scale.x+scale.w*.5,scale.y+scale.h*.975,scale.w*.45,scale.h*.054);
      sprite('weigh',scale.x,scale.y,scale.w,scale.h);emptyHeater(heater);
    }
    crystalDish(sample,dish);
    if(exchange>=1)scaleDisplay(sample,true);
    return movement;
  }
  function inventory(display,sample,transferring=false,movingFiltrate=false){
    if(display!=='filter'&&!movingFiltrate)ctx.drawImage(atlas,982,85,238,219,1007,529,125,115);
    if(display!=='heat'&&!transferring){
      if(sample?.water===0&&display==='weigh')emptyHeater(HEATER_TRAY);
      else sprite('heat',HEATER_TRAY.x,HEATER_TRAY.y,HEATER_TRAY.w,HEATER_TRAY.h);
    }
    if(display!=='weigh')sprite('weigh',SCALE_TRAY.x,SCALE_TRAY.y,SCALE_TRAY.w,SCALE_TRAY.h);
  }
  return {
    render(view,now=0){
      ctx.clearRect(0,0,W,H);ctx.drawImage(table,0,0,W,H);
      const {animation,sample,stock}=view,t=animation?Math.min(1,Math.max(0,(now-animation.start)/animation.duration)):0;
      const transfer=animation?.kind==='sample'?samplingFrame(t,stock,animation.reduced):null;
      source(stock,transfer);
      const display=animation?.kind==='sample'?'beaker':animation?.kind==='settle'?'beaker':animation?.kind||sample?.display||'beaker';
      const movingDish=animation?.kind==='weigh'&&sample?.water===0&&animation.before?.display==='heat';
      const movingFiltrate=animation?.kind==='weigh'&&sample?.water>0&&animation.before?.display==='filter';
      inventory(display,sample,movingDish,movingFiltrate);
      let operation=null;
      if(!sample)beaker(SAMPLE_CUP.x,SAMPLE_CUP.y,SAMPLE_CUP.w,SAMPLE_CUP.h,{water:0,salt:0,sand:0});
      else if(display==='filter')operation=filter(sample,animation,t);
      else if(display==='heat')operation=heat(sample,animation,t,now);
      else if(display==='weigh'){if(movingDish)operation=moveDishToScale(sample,animation,t);else if(movingFiltrate)operation=moveFiltrateToScale(sample,animation,t);else weigh(sample,animation?.kind==='weigh');}
      else {
        const fill=transfer?transfer.received:1,settled=animation?.kind==='settle'?smooth(t):sample.phase==='settled'?1:0;
        beaker(SAMPLE_CUP.x,SAMPLE_CUP.y,SAMPLE_CUP.w,SAMPLE_CUP.h,sample,fill,settled,transfer?.stream);
      }
      if(sample&&sample.residues.some(n=>n>0)&&display!=='filter'&&(!movingFiltrate||operation.exchange>=1)){
        ctx.fillStyle='#faf6eb';ctx.beginPath();ctx.moveTo(973,735);ctx.lineTo(1105,735);ctx.lineTo(1079,797);ctx.lineTo(991,793);ctx.closePath();ctx.fill();grains(1038,762,40,9,65);pill('濾紙留存',1040,831,165);
      }
      return transfer||operation;
    }
  };
}
