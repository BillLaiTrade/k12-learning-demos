// Relaxed eye looking at the same distant card. Normalized paraxial units.
// Cornea + crystalline powers stay fixed; only axial length differs by model.
import {EYE} from './eye-optics.mjs?v=20261104-eye1';
export const RETINAS=Object.freeze({normal:1,myopia:1.1,hyperopia:.9});
export const SPECTACLE=-.35;
const a=1/EYE.far-EYE.cornealPower;
export const CRYSTALLINE=1/(1-EYE.lens)+a/(1+EYE.lens*a);
export const initialCorrection=()=>({kind:'normal',lens:'none',rays:true,point:'both'});
export function changeCorrection(state,key,value){
 if(key==='kind'&&Object.hasOwn(RETINAS,value))return {...state,kind:value,lens:'none'};
 if(key==='lens'&&['none','concave','convex'].includes(value)||key==='point'&&['both','top','bottom'].includes(value)||key==='rays'&&typeof value==='boolean')return {...state,[key]:value};
 return state;
}
function trace(y,h,power,retina){
 const incoming=(h-y)/(EYE.far+SPECTACLE),afterSpectacle=incoming-power*h,corneaY=h-SPECTACLE*afterSpectacle,afterCornea=afterSpectacle-EYE.cornealPower*corneaY,lensY=corneaY+EYE.lens*afterCornea,outgoing=afterCornea-CRYSTALLINE*lensY,retinaY=lensY+(retina-EYE.lens)*outgoing;
 return {objectY:y,spectacleY:h,corneaY,lensY,retinaY,incoming,afterSpectacle,afterCornea,outgoing};
}
export function correctingPower(retina){const zero=trace(0,1,0,retina).retinaY,one=trace(0,1,1,retina).retinaY;return -zero/(one-zero);}
export const POWERS=Object.freeze({none:0,concave:correctingPower(RETINAS.myopia),convex:correctingPower(RETINAS.hyperopia)});
export function correctionState(state){
 const retina=RETINAS[state.kind],power=POWERS[state.lens],axial=trace(0,EYE.pupil,power,retina),focus=EYE.lens-axial.lensY/axial.outgoing;
 const rays=['top','bottom'].flatMap(name=>[-EYE.pupil,EYE.pupil].map(h=>({...trace(name==='top'?-EYE.objectHeight:EYE.objectHeight,h,power,retina),name})));
 const spread=Math.max(...['top','bottom'].map(name=>{const pair=rays.filter(r=>r.name===name);return Math.abs(pair[0].retinaY-pair[1].retinaY);})),clear=spread<1e-6;
 return {retina,power,focus,rays,spread,clear,position:clear?'on':focus<retina?'before':'behind',blur:clear?0:Math.min(7,spread*190)};
}
