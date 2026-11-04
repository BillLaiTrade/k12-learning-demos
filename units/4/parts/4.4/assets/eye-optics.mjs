// Paraxial teaching model: fixed corneal power, variable crystalline power,
// fixed retinal plane. These are normalized model units, not eye dimensions.
export const EYE=Object.freeze({cornea:0,lens:.18,retina:1,cornealPower:.85,far:6,near:2.8,objectHeight:.5,pupil:.14});
function requiredPower(u){const a=1/u-EYE.cornealPower;return 1/(EYE.retina-EYE.lens)+a/(1+EYE.lens*a);}
const farPower=requiredPower(EYE.far),nearPower=requiredPower(EYE.near),minPower=farPower-.06,maxPower=nearPower+.06;
export const accommodationFor=distance=>100*(requiredPower(EYE[distance])-minPower)/(maxPower-minPower);
export const initialEye=()=>({distance:'far',accommodation:Math.round(accommodationFor('far')),rays:true,point:'both'});
export function changeEye(state,key,value){
 if(key==='distance'&&!['far','near'].includes(value)||key==='point'&&!['both','top','bottom'].includes(value))return state;
 if(key==='accommodation'){if(!Number.isFinite(value))return state;value=Math.max(0,Math.min(100,value));}
 return ['distance','accommodation','rays','point'].includes(key)?{...state,[key]:value}:state;
}
export function eyeState(state){
 const u=EYE[state.distance],power=minPower+(maxPower-minPower)*state.accommodation/100;
 function trace(y,h){const incoming=(h-y)/u,afterCornea=incoming-EYE.cornealPower*h,lensY=h+EYE.lens*afterCornea,outgoing=afterCornea-power*lensY,retinaY=lensY+(EYE.retina-EYE.lens)*outgoing;return{objectY:y,corneaY:h,lensY,retinaY,incoming,afterCornea,outgoing};}
 const axial=trace(0,EYE.pupil),focus=EYE.lens-axial.lensY/axial.outgoing;
 const rays=['top','bottom'].flatMap(name=>[-EYE.pupil,EYE.pupil].map(h=>({...trace(name==='top'?-EYE.objectHeight:EYE.objectHeight,h),name})));
 const spread=Math.max(...['top','bottom'].map(name=>{const a=rays.filter(r=>r.name===name);return Math.abs(a[0].retinaY-a[1].retinaY);})),clear=spread<.0035;
 return{u,power,focus,rays,spread,clear,position:clear?'on':focus<EYE.retina?'before':'behind',blur:clear?0:Math.min(7,spread*150),thickness:.085+.075*state.accommodation/100};
}
