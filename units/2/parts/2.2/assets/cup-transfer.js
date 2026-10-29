import {transformPoint,polygonArea,clipBelow,streamPoint} from './investigation-transfer.js?v=pour-3';
const clamp=t=>Math.max(0,Math.min(1,t));
const smooth=t=>{t=clamp(t);return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*t;
export const CUP={w:150,h:185,lip:{x:60,y:-72.15},interior:[[-55.5,-68.45],[58.5,-68.45],[54,72.15],[0,77.7],[-51,72.15]],full:.84};
export function cupLiquid(pose,fill){
 const shape=CUP.interior.map(([x,y])=>transformPoint({x,y},pose)),target=polygonArea(shape)*CUP.full*clamp(fill);
 let lo=Math.min(...shape.map(p=>p.y)),hi=Math.max(...shape.map(p=>p.y));
 for(let i=0;i<28;i++){const mid=(lo+hi)/2;if(polygonArea(clipBelow(shape,mid))>target)lo=mid;else hi=mid;}
 const line=(lo+hi)/2;return{shape,filled:fill>0?clipBelow(shape,line):[],line};
}
function poseAt(fill,point){
 let lo=0,hi=Math.PI*.8;
 for(let i=0;i<28;i++){const angle=(lo+hi)/2,pose={x:0,y:0,angle},shape=CUP.interior.map(([x,y])=>transformPoint({x,y},pose)),lip=transformPoint(CUP.lip,pose);if(polygonArea(clipBelow(shape,lip.y))/polygonArea(shape)>fill*CUP.full)lo=angle;else hi=angle;}
 const angle=(lo+hi)/2,offset=transformPoint(CUP.lip,{x:0,y:0,angle});return{x:point.x-offset.x,y:point.y-offset.y,angle};
}
function jet(t,start,end,delay,mouth,target){const head=clamp((t-start)/delay),tail=clamp((t-end)/delay);return head>tail?{mouth,target,head,tail}:null;}
export function cupTransfer(t,kind='filter',options={}){
 t=clamp(t);const filter=kind==='filter',start=filter ? .16 : .08,end=filter ? .68 : .25,delay=.025;
 const emitted=smooth((t-start)/(end-start)),arrived=smooth((t-start-delay)/(end-start));
 const drained=filter?smooth((t-.23)/.68):arrived,received=filter?smooth((t-.255)/.68):arrived;
 const source=1-emitted,point=options.mouth||(filter?{x:645,y:235}:{x:707,y:357}),pour=poseAt(source,point),home=options.home||{x:520,y:310,angle:0};
 const approach=smooth(t/(start-.015)),returning=smooth((t-(end+delay+.025))/(1-end-delay-.025));
 const pose=t<start-.015?{x:mix(home.x,pour.x,approach),y:mix(home.y,pour.y,approach),angle:mix(0,pour.angle,approach)}:t>end+delay+.025?{x:mix(pour.x,home.x,returning),y:mix(pour.y,home.y,returning),angle:mix(pour.angle,0,returning)}:pour;
 const mouth=transformPoint(CUP.lip,pose),held=arrived-drained;
 const target=options.target||(filter?{x:682,y:400-60*Math.sqrt(Math.max(0,held))}:{x:752,y:533-8*received});
 const stream=jet(t,start,end,delay,mouth,target);
 const outlet=filter?jet(t,.23,.91,.025,options.outlet||{x:681,y:558},options.receiver||{x:690,y:666.64-82*received}):null;
 return{pose,mouth,source,emitted,arrived,held,drained,received,inletTransit:emitted-arrived,outletTransit:drained-received,stream,outlet};
}
export function drawCup(ctx,glass,frame,sand=0){
 const {pose,source}=frame,liquid=cupLiquid(pose,source);ctx.save();ctx.translate(pose.x,pose.y);ctx.rotate(pose.angle);ctx.drawImage(glass,805,195,430,530,-75,-92.5,150,185);ctx.restore();
 if(source>0){ctx.save();ctx.beginPath();liquid.filled.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.clip();
 const g=ctx.createLinearGradient(0,liquid.line,0,liquid.line+190);g.addColorStop(0,sand?'#d9c6a5b0':'#dcece3a0');g.addColorStop(1,sand?'#aa8659c0':'#9ebdb1b0');ctx.fillStyle=g;ctx.fillRect(0,liquid.line,2000,1200);ctx.strokeStyle='#fffdf0b0';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,liquid.line+1);ctx.lineTo(2000,liquid.line+1);ctx.stroke();
 if(sand)for(let i=0;i<Math.round(65*source);i++){const a=(Math.sin(i*137.7)*43758.5)%1,b=(Math.sin(i*37.9)*1583.4)%1;ctx.fillStyle=i%2?'#755333':'#c7a377';ctx.beginPath();ctx.ellipse(pose.x+a*80,liquid.line+Math.abs(b)*150,2.2,1.5,0,0,Math.PI*2);ctx.fill();}ctx.restore();}
 ctx.save();ctx.translate(pose.x,pose.y);ctx.rotate(pose.angle);ctx.globalAlpha=.2;ctx.drawImage(glass,805,195,430,530,-75,-92.5,150,185);ctx.restore();
}
export function drawJet(ctx,stream,brown=false,width=7){if(!stream)return;ctx.save();ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();for(let i=0;i<=32;i++){const p=streamPoint(stream,mix(stream.tail,stream.head,i/32));if(i)ctx.lineTo(p.x,p.y);else ctx.moveTo(p.x,p.y);}ctx.strokeStyle=brown?'#bda37cc4':'#b6d2c8c9';ctx.lineWidth=width;ctx.stroke();ctx.strokeStyle='#fffef5be';ctx.lineWidth=2;ctx.stroke();ctx.restore();}
