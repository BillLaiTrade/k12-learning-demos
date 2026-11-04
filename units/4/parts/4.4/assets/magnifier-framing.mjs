export const MAGNIFIER_HOME=Object.freeze({azimuth:-.66,polar:1.28,zoom:1});
export function fitMagnifier(THREE,camera,target){
 const narrow=camera.aspect<1.5;target.set(narrow?(camera.aspect<1.1?-.35:-.2):1.1,1.65,0);camera.fov=38;camera.updateProjectionMatrix();
 const h=MAGNIFIER_HOME,direction=new THREE.Vector3(Math.sin(h.polar)*Math.sin(h.azimuth),Math.cos(h.polar),Math.sin(h.polar)*Math.cos(h.azimuth)),bounds=[];
 for(const x of [-3.5,narrow?(camera.aspect<1.1?2.8:3.5):6.9])for(const y of [.25,3.15])for(const z of [-.5,.5])bounds.push(new THREE.Vector3(x,y,z));
 let radius=5;for(let i=0;i<100;i++){camera.position.copy(target).addScaledVector(direction,radius);camera.lookAt(target);camera.updateMatrixWorld();if(bounds.every(p=>{const q=p.clone().project(camera);return Math.abs(q.x)<.93&&q.y>-.94&&q.y<.9;}))break;radius*=1.045;}
 return radius;
}
export function clipProjectedRay(a,b,rect){
 let lo=0,hi=1;for(const [start,end,min,max]of [[a.x,b.x,rect.left,rect.left+rect.width],[a.y,b.y,rect.top,rect.top+rect.height]]){const d=end-start;if(Math.abs(d)<1e-9){if(start<min||start>max)return null;}else{const t1=(min-start)/d,t2=(max-start)/d;lo=Math.max(lo,Math.min(t1,t2));hi=Math.min(hi,Math.max(t1,t2));if(lo>hi)return null;}}
 return {start:{x:a.x+(b.x-a.x)*lo,y:a.y+(b.y-a.y)*lo},end:{x:a.x+(b.x-a.x)*hi,y:a.y+(b.y-a.y)*hi},clipped:hi<1};
}
