import {microscope} from './optics.mjs';
export function microscopeGeometry(){
 const g=microscope(),eye=g.separation+70;
 const trace=(objectHeight,lensHeight)=>{
  const slope=(lensHeight-objectHeight)/g.objective.u-lensHeight/g.objective.f;
  const ocularHeight=lensHeight+g.separation*slope;
  const exitSlope=slope-ocularHeight/g.eyepieceF;
  return {objectHeight,lensHeight,slope,ocularHeight,exitSlope,eyeHeight:ocularHeight+(eye-g.separation)*exitSlope};
 };
 const rays=['top','bottom'].flatMap(point=>[-5,5].map(pupil=>{
  const objectHeight=point==='top'?4:-4,a=trace(objectHeight,0),b=trace(objectHeight,1);
  return {point,...trace(objectHeight,(pupil-a.eyeHeight)/(b.eyeHeight-a.eyeHeight))};
 }));
 return {...g,eye,intermediate:g.first.v,ocularFocus:g.separation-g.eyepieceF,virtual:g.separation+g.second.v,rays};
}
