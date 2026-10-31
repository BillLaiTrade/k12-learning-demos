export const PAN_LENGTHS=Object.freeze([40,35,30,26,23,20]);
export const PAN_SECONDS=1.8;
export const PAN_SLOWDOWN=100;
export const panFrequency=length=>343/(4*length/100);
export function panGeometry(index){
 const length=PAN_LENGTHS[index],top=90+index*18,height=length*8.5+28;
 return {length,x:210+index*76,top,height,open:top+16,bottom:top+height-12};
}
export function panEnvelope(seconds){return Math.max(0,Math.min(1,seconds/.07,(PAN_SECONDS-seconds)/.18));}
// fraction=0於封底、1於管口；閉端位移節點、開端位移腹點。
export function panDisplacement(fraction,seconds,hz,level=panEnvelope(seconds)){return 8*Math.sin(Math.PI*fraction/2)*Math.sin(2*Math.PI*hz*seconds/PAN_SLOWDOWN)*level;}
