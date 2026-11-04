import {toneMapPrism,linearToSrgb} from './prism-display.mjs?v=prism-clarity-20261104';
import {CIE_D65} from './spectral-data.mjs';
// All physical coordinates below are millimetres. Scene scale: 100 mm = 1 unit.
export const SETUP=Object.freeze({side:50,height:40,axisHeight:120,apexDeg:30,referenceNm:587.5618,sourceX:-150,slitX:-80,slitWidth:1,slitHeight:5,screenX:300,screenZ:[-165,25],screenY:[65,175],railOut:90,cropWidth:15,cropHeight:10,exposure:7,ambient:.045});
export function indexBK7(wavelength){const l2=(wavelength/1000)**2;return Math.sqrt(1+1.03961212*l2/(l2-.00600069867)+.231792344*l2/(l2-.0200179144)+1.01046945*l2/(l2-103.560653));}
const halfA=SETUP.apexDeg*Math.PI/360;
export const INCIDENCE=Math.asin(indexBK7(SETUP.referenceNm)*Math.sin(halfA));
const rotation=halfA-INCIDENCE,halfBase=SETUP.side*Math.sin(halfA),triangleHeight=SETUP.side*Math.cos(halfA);
export const TRIANGLE=Object.freeze([[-halfBase,-triangleHeight/3],[halfBase,-triangleHeight/3],[0,triangleHeight*2/3]].map(([x,z])=>Object.freeze([x*Math.cos(rotation)-z*Math.sin(rotation),x*Math.sin(rotation)+z*Math.cos(rotation)])));
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),cross=(a,b)=>a[0]*b[1]-a[1]*b[0],sub=(a,b)=>a.map((v,i)=>v-b[i]);
const unit=a=>{const l=Math.hypot(...a);return a.map(v=>v/l)};
export function snell(direction,normal,n1,n2){let N=normal;if(dot(direction,N)>0)N=N.map(v=>-v);const ci=-dot(direction,N),ratio=n1/n2,k=1-ratio*ratio*(1-ci*ci);if(k<0)return null;return unit(direction.map((v,i)=>ratio*v+(ratio*ci-Math.sqrt(k))*N[i]));}
function hit(origin,direction,shift=0,skip=-1){let best=null;for(let edge=0;edge<3;edge++){if(edge===skip)continue;const a=[TRIANGLE[edge][0],TRIANGLE[edge][1]+shift],b=[TRIANGLE[(edge+1)%3][0],TRIANGLE[(edge+1)%3][1]+shift],e=sub(b,a),den=cross(direction,e);if(Math.abs(den)<1e-12)continue;const q=sub(a,origin),t=cross(q,e)/den,u=cross(q,direction)/den;if(t>1e-7&&u>=-1e-10&&u<=1+1e-10&&(!best||t<best.t))best={point:origin.map((v,i)=>v+t*direction[i]),normal:unit([e[1],-e[0]]),edge,t};}return best;}
export function fresnel(direction,normal,n1,n2){const ci=Math.abs(dot(direction,normal)),st2=(n1/n2)**2*(1-ci*ci);if(st2>1)return 1;const ct=Math.sqrt(1-st2);return .5*(((n1*ci-n2*ct)/(n1*ci+n2*ct))**2+((n1*ct-n2*ci)/(n1*ct+n2*ci))**2);}
const extinction=[[380,2.074e-8],[390,1.3731e-8],[400,1.0227e-8],[405,9.0558e-9],[420,9.3912e-9],[436,1.1147e-8],[460,1.0286e-8],[500,9.5781e-9],[546,6.9658e-9],[580,9.2541e-9],[620,1.1877e-8],[660,1.2643e-8],[700,8.9305e-9],[1060,1.0137e-8]];
function kAt(w){let i=0;while(i<extinction.length-2&&extinction[i+1][0]<w)i++;const[a,ka]=extinction[i],[b,kb]=extinction[i+1];return ka+(kb-ka)*(w-a)/(b-a);}
export function trace(wavelength=SETUP.referenceNm,{inserted=true,offset=0,shift=inserted?0:SETUP.railOut,screenX=SETUP.screenX}={}){
 const origin=[SETUP.slitX,offset],direction=[1,0],first=hit(origin,direction,shift);
 if(!first)return{wavelength,points:[origin,[screenX,offset]],landing:offset,deviation:0,transmission:1,intersects:false};
 const n=indexBK7(wavelength),inside=snell(direction,first.normal,1,n),second=hit(first.point,inside,shift,first.edge);if(!second)throw Error('Missing exit');const out=snell(inside,second.normal,n,1);if(!out||out[0]<=0)throw Error('Fixed arrangement has no transmitted forward ray');
 const t=(screenX-second.point[0])/out[0],landing=second.point[1]+t*out[1];
 const length=Math.hypot(...sub(second.point,first.point)),transmission=(1-fresnel(direction,first.normal,1,n))*(1-fresnel(inside,second.normal,n,1))*Math.exp(-4*Math.PI*kAt(wavelength)/(wavelength*1e-6)*length);
 return{wavelength,points:[origin,first.point,second.point,[screenX,landing]],inside,out,entryNormal:first.normal,exitNormal:second.normal,landing,deviation:Math.abs(Math.atan2(out[1],out[0])),intersects:true,transmission,length};
}
export const MONOCHROMATIC=Object.freeze({red:650,green:530,blue:460});
export function rays(inserted=true,light='white'){return light==='white'?Array.from({length:401},(_,i)=>trace(380+i,{inserted})):[trace(MONOCHROMATIC[light],{inserted})];}
function observer(w){const a=CIE_D65[Math.min(79,Math.floor((w-380)/5))],b=CIE_D65[Math.min(80,Math.floor((w-380)/5)+1)],t=(w-a[0])/5;return a.slice(1).map((v,i)=>v+(b[i+1]-v)*t);}
const NORM=Array.from({length:401},(_,i)=>{const v=observer(380+i);return v[1]*v[3]}).reduce((a,b)=>a+b,0);
// Equal total incident radiant power for all sources; no per-colour exposure correction.
const RADIANT=Array.from({length:401},(_,i)=>observer(380+i)[3]/NORM).reduce((a,b)=>a+b,0);
export function spectrum(inserted=true,light='white'){return rays(inserted,light).map(({wavelength})=>{const a=trace(wavelength,{inserted,offset:-SETUP.slitWidth/2}),b=trace(wavelength,{inserted,offset:SETUP.slitWidth/2}),[x,y,z,power]=observer(wavelength);return{wavelength,low:Math.min(a.landing,b.landing),high:Math.max(a.landing,b.landing),xyz:[x,y,z].map(v=>v*(light==='white'?power/NORM:RADIANT)*(a.transmission+b.transmission)/2)};});}
const xyzToLinear=([x,y,z])=>[3.2406*x-1.5372*y-.4986*z,-.9689*x+1.8758*y+.0415*z,.0557*x-.204*y+1.057*z];
export function prismRayRgb(wavelength){return toneMapPrism(xyzToLinear(observer(wavelength).slice(0,3).map(v=>v*RADIANT)),SETUP.exposure,0);}
export function pixelLinear(zLow,zHigh,model){let xyz=[0,0,0];for(const s of model){const overlap=Math.max(0,Math.min(zHigh,s.high)-Math.max(zLow,s.low));if(!overlap)continue;const gain=overlap/(zHigh-zLow)*SETUP.slitWidth/(s.high-s.low);for(let i=0;i<3;i++)xyz[i]+=s.xyz[i]*gain;}return xyzToLinear(xyz);}
export function measurements(inserted=true,light='white'){const model=spectrum(inserted,light),visible=model.filter(s=>s.wavelength>=400&&s.wavelength<=700),low=Math.min(...model.map(s=>s.low)),high=Math.max(...model.map(s=>s.high)),reference=light==='white'?model:spectrum(inserted),cropCenter=(Math.min(...reference.map(s=>s.low))+Math.max(...reference.map(s=>s.high)))/2;return{low,high,width:high-low,height:SETUP.slitHeight,visibleWidth:Math.max(...visible.map(s=>s.high))-Math.min(...visible.map(s=>s.low)),center:(low+high)/2,incidenceDeg:INCIDENCE*180/Math.PI,deviationDeg:trace(MONOCHROMATIC[light]||SETUP.referenceNm,{inserted}).deviation*180/Math.PI,crop:[cropCenter-SETUP.cropWidth/2,cropCenter+SETUP.cropWidth/2],screenDistance:SETUP.screenX};}
export function drawProjection(canvas,inserted=true,{whole=false,scales=true,light='white'}={}){
 const model=spectrum(inserted,light),m=measurements(inserted,light),domain=whole?SETUP.screenZ:m.crop,ys=whole?SETUP.screenY:[SETUP.axisHeight-SETUP.cropHeight/2,SETUP.axisHeight+SETUP.cropHeight/2],ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height,pixels=ctx.createImageData(w,h),profile=[];
 for(let x=0;x<w;x++)profile.push(pixelLinear(domain[0]+x/w*(domain[1]-domain[0]),domain[0]+(x+1)/w*(domain[1]-domain[0]),model));
 const srgb=v=>linearToSrgb(Math.max(0,Math.min(1,v)));
 for(let y=0;y<h;y++){const bottom=ys[1]-(y+1)/h*(ys[1]-ys[0]),top=ys[1]-y/h*(ys[1]-ys[0]),heightFraction=Math.max(0,Math.min(top,SETUP.axisHeight+SETUP.slitHeight/2)-Math.max(bottom,SETUP.axisHeight-SETUP.slitHeight/2))/(top-bottom);
  for(let x=0;x<w;x++){const at=(y*w+x)*4,rgb=toneMapPrism(profile[x],SETUP.exposure*heightFraction,SETUP.ambient);for(let i=0;i<3;i++)pixels.data[at+i]=Math.round(srgb(rgb[i])*255);pixels.data[at+3]=255;}
 }ctx.putImageData(pixels,0,0);
 if(scales&&!whole){const pxPerMm=w/(domain[1]-domain[0]),pyPerMm=h/(ys[1]-ys[0]);ctx.strokeStyle='#f2f5ec';ctx.fillStyle='#f2f5ec';ctx.lineWidth=4;const x=20,y=h-24;ctx.beginPath();ctx.moveTo(x,y-5);ctx.lineTo(x,y);ctx.lineTo(x+5*pxPerMm,y);ctx.lineTo(x+5*pxPerMm,y-5);ctx.stroke();ctx.font='30px sans-serif';ctx.fillText('5 mm',x,y-10);canvas.dataset.pixelScale=JSON.stringify([pxPerMm,pyPerMm]);}
 canvas.dataset.physicalDomain=JSON.stringify({z:domain,y:ys});canvas.setAttribute('aria-label',light!=='white'?`白幕正面：${{red:'紅',green:'綠',blue:'藍'}[light]}色狹縫光斑，寬約${m.width.toFixed(2)}毫米、高5毫米，與白光使用同一取景範圍`:inserted?`白幕正面：380至780奈米色光的幾何包絡寬${m.width.toFixed(1)}毫米、高5毫米`:'白幕正面：寬1毫米、高5毫米的白色狹縫光斑');return m;
}
