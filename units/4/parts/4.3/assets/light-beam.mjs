import {arrow} from './return-refraction-model.mjs?v=20261103-refine1';

// Direction markers appear only after the advancing light has passed their tips.
export function visibleInterval(from,to,box){
 let start=0,end=1;
 for(let axis=0;axis<2;axis++){
  const delta=to[axis]-from[axis],min=box[axis],max=min+box[axis+2];
  if(!delta){if(from[axis]<min||from[axis]>max)return null;continue;}
  const a=(min-from[axis])/delta,b=(max-from[axis])/delta;start=Math.max(start,Math.min(a,b));end=Math.min(end,Math.max(a,b));
 }
 return start<=end?[start,end]:null;
}
export function drawDirections(group,points,drawnLength,ratio,active=true,box=null){
 let before=0;
 group.querySelectorAll('.lesson-beam-direction').forEach((head,i)=>{
  const from=points[i],to=points[i+1],length=Math.hypot(to[0]-from[0],to[1]-from[1]),size=8/Math.max(.05,ratio);
  if(length<1e-8){head.setAttribute('d','');head.setAttribute('visibility','hidden');return;}
  const visible=box?visibleInterval(from,to,box):[0,1],fraction=visible?visible[0]+(visible[1]-visible[0])*(box?(i===0?.18:.4):.36):0;
  head.setAttribute('d',arrow(from,to,fraction,size));
  head.setAttribute('visibility',active&&visible&&drawnLength>=before+length*fraction+size?'visible':'hidden');
  before+=length;
 });
}
