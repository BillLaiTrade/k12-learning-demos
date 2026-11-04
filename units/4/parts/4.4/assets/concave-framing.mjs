export const CONCAVE_HOME=Object.freeze({azimuth:.55,polar:1.46,zoom:1});
export function fitConcave(THREE,camera,target){
 target.set(-2.55,1.65,0);camera.fov=38;camera.updateProjectionMatrix();const h=CONCAVE_HOME,direction=new THREE.Vector3(Math.sin(h.polar)*Math.sin(h.azimuth),Math.cos(h.polar),Math.sin(h.polar)*Math.cos(h.azimuth)),bounds=[];
 for(const x of [-7.7,2.5])for(const y of [.25,2.85])for(const z of [-.36,.36])bounds.push(new THREE.Vector3(x,y,z));
 let radius=6;for(let i=0;i<100;i++){camera.position.copy(target).addScaledVector(direction,radius);camera.lookAt(target);camera.updateMatrixWorld();if(bounds.every(p=>{const q=p.clone().project(camera);return Math.abs(q.x)<.95&&q.y>-.94&&q.y<.88;}))break;radius*=1.045;}return radius;
}
