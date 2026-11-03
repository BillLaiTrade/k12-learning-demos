import {arrow} from './return-refraction-model.mjs?v=20261103-refine1';

// Direction markers appear only after the advancing light has passed their tips.
export function drawDirections(group,points,drawnLength,ratio,active=true){
 let before=0;
 group.querySelectorAll('.lesson-beam-direction').forEach((head,i)=>{
  const from=points[i],to=points[i+1],length=Math.hypot(to[0]-from[0],to[1]-from[1]),size=8/Math.max(.05,ratio);
  head.setAttribute('d',arrow(from,to,.36,size));
  head.setAttribute('visibility',active&&drawnLength>=before+length*.36+size?'visible':'hidden');
  before+=length;
 });
}
