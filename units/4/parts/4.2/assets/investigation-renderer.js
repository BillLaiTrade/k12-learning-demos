import {SAMPLE_BOTTLE,SAMPLE_CUP,samplingFrame,streamPoint,bottleLiquid} from './investigation-transfer.js?v=pour-3';
const W=1536,H=1024;
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*t;
const random=(i,seed=1)=>{const n=Math.sin(i*137.7+seed*43.13)*43758.5453;return n-Math.floor(n);};
export function loadPicture(url){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error(`無法載入實驗器材：${url}`));im.src=url;});}
export function createRenderer(canvas,{table,atlas,glass}) {
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('這個瀏覽器無法顯示實驗桌。');
  canvas.width=W;canvas.height=H;
  const crops={bottle:[260,20,350,550],filter:[944,8,440,568],heat:[145,590,570,410],weigh:[869,614,530,385]};
  function sprite(kind,x,y,w,h){ctx.drawImage(atlas,...crops[kind],x,y,w,h);}
  function shadow(x,y,rx,ry){ctx.save();ctx.filter='blur(7px)';ctx.fillStyle='#3c271c42';ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();ctx.restore();}
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
  function flow(x1,y1,x2,y2,t,brown=false){ctx.save();ctx.strokeStyle=brown?'#c7b28bbe':'#e4f2ead9';ctx.lineWidth=9;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x1,y1);ctx.quadraticCurveTo(x2-9,(y1+y2)/2,x2,y2);ctx.stroke();ctx.strokeStyle='#fffcf4a8';ctx.lineWidth=2;ctx.stroke();for(let i=0;i<4;i++){const p=(t*2+i*.25)%1;ctx.fillStyle='#e9f8eedc';ctx.beginPath();ctx.ellipse(mix(x1,x2,p),mix(y1,y2,p),3,5,0,0,Math.PI*2);ctx.fill();}ctx.restore();}
  function filter(sample,animation,t){
    const before=animation?.kind==='filter'?animation.before:sample;
    const f=animation?.kind==='filter'?smooth((t-.15)/.8):1;
    // Receiving beaker is part of the empty photographic assembly.
    shadow(750,729,178,16);sprite('filter',545,222,398,514);
    fluid(611,510,155,176,(sample.water+sample.salt)*f,0,1);
    const retained=animation?.kind==='filter'?before.sand:sample.residues.at(-1);
    if(retained>0)grains(682,385,58,13,Math.round(95*f));
    if(animation?.kind==='filter'){
      if(t<.83){ctx.save();ctx.translate(575,281);ctx.rotate(.8);beaker(-65,-60,130,155,before,Math.max(0,1-t/.8),0);ctx.restore();if(t>.1)flow(615,309,680,370,t,before.sand>0);}
      if(t>.18&&t<.92)flow(681,514,681,570,t);
    }
  }
  function heat(sample,animation,t,now){
    const running=animation?.kind==='heat',remaining=running?1-smooth((t-.2)/.7):0;
    shadow(755,768,195,16);sprite('heat',543,475,425,305);
    ctx.save();ctx.beginPath();ctx.ellipse(752,525,120,32,0,0,Math.PI*2);ctx.clip();
    if(remaining>0){const g=ctx.createLinearGradient(0,500,0,560);g.addColorStop(0,'#d9e7db9c');g.addColorStop(1,'#a7beb1b0');ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(752,525+8*(1-remaining),120*Math.sqrt(remaining),32*Math.sqrt(remaining),0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#fffef2c4';ctx.lineWidth=2;ctx.stroke();}
    const solid=running?smooth((t-.5)/.4):1;
    grains(752,532,95,21,Math.round(170*solid),true);
    if(sample.sand>0)grains(752,538,95,19,90);
    if(running&&t>.24&&t<.88){for(let i=0;i<Math.ceil(24*remaining);i++){const p=(now/850+random(i,8))%1,x=752+(random(i,3)-.5)*175*Math.sqrt(remaining),y=528+(random(i,4)-.5)*26*Math.sqrt(remaining);ctx.strokeStyle=`rgba(250,255,247,${.8*(1-p)})`;ctx.lineWidth=1.2;ctx.beginPath();ctx.ellipse(x,y,1+p*6,(1+p*6)*.5,0,0,Math.PI*2);ctx.stroke();}}
    ctx.restore();
    if(running&&t<.2){ctx.save();ctx.translate(645,373);ctx.rotate(.7);beaker(-60,-70,125,150,animation.before,1-t/.2,0);ctx.restore();flow(700,392,750,518,t,animation.before.sand>0);}
    if(running&&t>.2&&t<.9){ctx.fillStyle='#ff7024';ctx.shadowColor='#ff6600';ctx.shadowBlur=12;ctx.beginPath();ctx.arc(635,700,8,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;}
    pill(running?(t<.2?'倒入蒸發皿':t<.9?'加熱中':'冷卻中'):'已冷卻',750,857,155);
  }
  function weigh(sample,running){
    shadow(755,749,170,15);sprite('weigh',565,480,380,276);
    if(sample.water>0)beaker(665,295,175,220,sample,1,sample.phase==='settled'?1:0);
    else {ctx.fillStyle='#fffdf4';ctx.beginPath();ctx.ellipse(753,535,88,21,0,0,Math.PI*2);ctx.fill();grains(753,530,60,10,130,true);if(sample.sand>0)grains(753,535,60,10,55);}
    ctx.fillStyle='#cbd8b5';ctx.fillRect(642,638,170,49);ctx.fillStyle='#223b2d';ctx.font='600 36px monospace';ctx.textAlign='center';ctx.fillText(running?'—':`${sample.sand+sample.salt+sample.water} g`,727,674);
    pill('已扣除容器質量',755,805,260);
  }
  function inventory(display){if(display!=='filter')ctx.drawImage(atlas,982,85,238,219,1007,529,125,115);if(display!=='heat')sprite('heat',1160,547,163,117);if(display!=='weigh')sprite('weigh',1340,551,143,104);}
  return {
    render(view,now=0){
      ctx.clearRect(0,0,W,H);ctx.drawImage(table,0,0,W,H);
      const {animation,sample,stock}=view,t=animation?Math.min(1,Math.max(0,(now-animation.start)/animation.duration)):0;
      const transfer=animation?.kind==='sample'?samplingFrame(t,stock,animation.reduced):null;
      source(stock,transfer);
      const display=animation?.kind==='sample'?'beaker':animation?.kind==='settle'?'beaker':animation?.kind||sample?.display||'beaker';
      inventory(display);
      if(!sample)beaker(SAMPLE_CUP.x,SAMPLE_CUP.y,SAMPLE_CUP.w,SAMPLE_CUP.h,{water:0,salt:0,sand:0});
      else if(display==='filter')filter(sample,animation,t);
      else if(display==='heat')heat(sample,animation,t,now);
      else if(display==='weigh')weigh(sample,animation?.kind==='weigh');
      else {
        const fill=transfer?transfer.received:1,settled=animation?.kind==='settle'?smooth(t):sample.phase==='settled'?1:0;
        beaker(SAMPLE_CUP.x,SAMPLE_CUP.y,SAMPLE_CUP.w,SAMPLE_CUP.h,sample,fill,settled,transfer?.stream);
      }
      if(sample&&sample.residues.some(n=>n>0)&&display!=='filter'){
        ctx.fillStyle='#faf6eb';ctx.beginPath();ctx.moveTo(973,735);ctx.lineTo(1105,735);ctx.lineTo(1079,797);ctx.lineTo(991,793);ctx.closePath();ctx.fill();grains(1038,762,40,9,65);pill('濾紙留存',1040,831,165);
      }
      return transfer;
    }
  };
}
