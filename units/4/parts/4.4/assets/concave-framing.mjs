export const CONCAVE_HOME=Object.freeze({azimuth:.8,polar:1.56,zoom:1});
export function fitConcave(THREE,camera,target){
 target.set(-2.55,.8,0);camera.fov=38;camera.zoom=1;camera.updateProjectionMatrix();const h=CONCAVE_HOME,direction=new THREE.Vector3(Math.sin(h.polar)*Math.sin(h.azimuth),Math.cos(h.polar),Math.sin(h.polar)*Math.cos(h.azimuth)),bounds=[];
 for(const x of [-7.7,2.5])for(const y of [.25,2.85])for(const z of [-.36,.36])bounds.push(new THREE.Vector3(x,y,z));
 let radius=6;for(let i=0;i<100;i++){camera.position.copy(target).addScaledVector(direction,radius);camera.lookAt(target);camera.updateMatrixWorld();if(bounds.every(p=>{const q=p.clone().project(camera);return Math.abs(q.x)<.95&&q.y>-.94&&q.y<.88;}))break;radius*=1.045;}return radius;
}

// Fit the current apparatus using a fixed viewing position. Changing the card
// changes framing scale, while rotation and user zoom retain their own state.
export function fitConcaveObservation(THREE,camera,target,radius,points){
 const view=camera.clone(),h=CONCAVE_HOME;
 view.zoom=1;view.fov=38;view.position.copy(target).addScaledVector(new THREE.Vector3(Math.sin(h.polar)*Math.sin(h.azimuth),Math.cos(h.polar),Math.sin(h.polar)*Math.cos(h.azimuth)),radius);view.lookAt(target);view.updateProjectionMatrix();view.updateMatrixWorld();
 const projected=points.map(p=>p.clone().project(view)),xs=projected.map(p=>p.x),ys=projected.map(p=>p.y);
 return Math.min(1.64/(Math.max(...xs)-Math.min(...xs)+.04),1.5/(Math.max(...ys)-Math.min(...ys)+.04));
}
