import * as THREE from 'three';
import {OrbitControls} from './vendor/three/OrbitControls.js';

const HOME_TARGET=new THREE.Vector3(.15,1,0);
const HOME_DIRECTION=new THREE.Vector3(11,14,17).normalize();

export function overviewPose(camera,aspect,height=800){
  const right=new THREE.Vector3().crossVectors(camera.up,HOME_DIRECTION).normalize();
  const up=new THREE.Vector3().crossVectors(HOME_DIRECTION,right).normalize();
  const tangent=Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
  // Fit the pool above the fixed action, including room for dimension labels.
  const top=.86,bottom=-1+2*Math.min(94,height*.38)/height,centerY=(top+bottom)/2;
  const points=[new THREE.Vector3(-3.45,3.1,-2.5)];
  for(const x of [-6.5,6.5])for(const z of [-3.9,3.9])points.push(new THREE.Vector3(x,2.25,z));
  for(const x of [-5.2,5.2])for(const z of [-2.7,2.7])points.push(new THREE.Vector3(x,-.17,z));
  let distance=0;
  for(const point of points){
    const corner=point.sub(HOME_TARGET),depth=corner.dot(HOME_DIRECTION);
    const vertical=corner.dot(up)/tangent;
    distance=Math.max(distance,depth+Math.abs(corner.dot(right))/(tangent*aspect*.88),(vertical+top*depth)/(top-centerY),(vertical+bottom*depth)/(bottom-centerY));
  }
  const target=HOME_TARGET.clone().addScaledVector(up,-tangent*distance*centerY);
  return{target,position:target.clone().addScaledVector(HOME_DIRECTION,distance)};
}

export function createPoolNavigation(root,camera,canvas,source,redraw){
  const controls=new OrbitControls(camera,canvas);
  controls.target.copy(overviewPose(camera,camera.aspect,canvas.clientHeight).target);controls.enablePan=false;controls.enableDamping=false;
  controls.minDistance=6;controls.maxDistance=36;controls.minPolarAngle=.12;controls.maxPolarAngle=Math.PI/2-.22;
  controls.rotateSpeed=.7;controls.zoomSpeed=.8;controls.enableZoom=false;
  controls.mouseButtons.RIGHT=THREE.MOUSE.ROTATE;
  controls.update();
  const events=new AbortController(),signal=events.signal;
  const toggle=root.querySelector('.pool-camera-toggle');
  let drawing=0,tween=0,disposed=false,transitionTarget=null;
  function setFraming(name){
    root.dataset.cameraFraming=name;
    const next=name==='salt'?'pool':'salt';toggle.dataset.poolCamera=next;
    toggle.querySelector('[data-pool-toggle-label]').textContent=next==='salt'?'靠近食鹽':'看整座泳池';
    for(const icon of toggle.querySelectorAll('[data-pool-toggle-icon]'))icon.toggleAttribute('hidden',icon.dataset.poolToggleIcon!==next);
  }
  function updateFraming(){
    if(transitionTarget)return;
    const distance=camera.position.distanceTo(source),current=root.dataset.cameraFraming;
    // Separate thresholds keep the button stable while rotating or making small zoom adjustments.
    if(current==='salt'&&distance>4)setFraming('pool');
    else if(current!=='salt'&&distance<3)setFraming('salt');
  }
  setFraming('pool');
  function scheduleDraw(){if(!disposed&&!drawing)drawing=requestAnimationFrame(()=>{drawing=0;redraw();});}
  function cancelTween(){if(tween)cancelAnimationFrame(tween);tween=0;transitionTarget=null;}
  function focus(name){
    cancelTween();
    transitionTarget=name;setFraming(name);
    if(root.querySelector('.pool-salt-source').contains(document.activeElement))toggle.focus({preventScroll:true});
    const pose=name==='salt'?{target:source.clone().add(new THREE.Vector3(0,.025,0))}:overviewPose(camera,camera.aspect,canvas.clientHeight);
    if(name==='salt'){
      // Approach from the poolside so the pool remains behind the salt for scale.
      pose.position=pose.target.clone().addScaledVector(HOME_DIRECTION,.75);
    }
    const fromTarget=controls.target.clone(),fromOrbit=new THREE.Spherical().setFromVector3(camera.position.clone().sub(fromTarget));
    const toOrbit=new THREE.Spherical().setFromVector3(pose.position.clone().sub(pose.target));
    const thetaDelta=THREE.MathUtils.euclideanModulo(toOrbit.theta-fromOrbit.theta+Math.PI,Math.PI*2)-Math.PI;
    const duration=matchMedia('(prefers-reduced-motion: reduce)').matches?0:850,start=performance.now();
    root.dataset.cameraView=name;controls.minDistance=.2;
    function frame(now){
      const progress=duration?Math.min(1,(now-start)/duration):1,t=progress*progress*(3-2*progress);
      const orbit=new THREE.Spherical(Math.exp(THREE.MathUtils.lerp(Math.log(fromOrbit.radius),Math.log(toOrbit.radius),t)),THREE.MathUtils.lerp(fromOrbit.phi,toOrbit.phi,t),fromOrbit.theta+thetaDelta*t);
      controls.target.lerpVectors(fromTarget,pose.target,t);camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(orbit));
      if(progress>=1)controls.minDistance=name==='salt' ? .2 : 6;
      controls.update();scheduleDraw();
      tween=progress<1?requestAnimationFrame(frame):0;
      if(progress>=1){transitionTarget=null;updateFraming();}
    }
    frame(start);
  }
  controls.addEventListener('change',()=>{updateFraming();scheduleDraw();});
  controls.addEventListener('start',()=>{cancelTween();updateFraming();controls.minDistance=controls.target.distanceTo(source)<.7 ? .2 : 6;root.dataset.cameraView='custom';canvas.classList.add('is-orbiting');});
  controls.addEventListener('end',()=>canvas.classList.remove('is-orbiting'));
  canvas.addEventListener('pointerdown',()=>canvas.focus({preventScroll:true}),{signal});
  canvas.addEventListener('focus',()=>{controls.enableZoom=true;},{signal});
  canvas.addEventListener('blur',()=>{controls.enableZoom=false;},{signal});
  canvas.addEventListener('keydown',event=>{
    if(event.altKey||event.ctrlKey||event.metaKey)return;
    if(event.key==='Home'){event.preventDefault();focus('pool');return;}
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','_'].includes(event.key))return;
    event.preventDefault();cancelTween();controls.minDistance=controls.target.distanceTo(source)<.7 ? .2 : 6;
    const offset=camera.position.clone().sub(controls.target),orbit=new THREE.Spherical().setFromVector3(offset);
    if(event.key==='ArrowLeft')orbit.theta+=.13;
    if(event.key==='ArrowRight')orbit.theta-=.13;
    if(event.key==='ArrowUp')orbit.phi=Math.max(controls.minPolarAngle,orbit.phi-.1);
    if(event.key==='ArrowDown')orbit.phi=Math.min(controls.maxPolarAngle,orbit.phi+.1);
    if(['+','='].includes(event.key))orbit.radius=Math.max(controls.minDistance,orbit.radius*.82);
    if(['-','_'].includes(event.key))orbit.radius=Math.min(controls.maxDistance,orbit.radius/.82);
    camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(orbit));
    root.dataset.cameraView='custom';controls.update();scheduleDraw();
  },{signal});
  for(const button of root.querySelectorAll('[data-pool-camera]')){
    button.disabled=false;button.addEventListener('click',()=>focus(button.dataset.poolCamera),{signal});
  }
  if(matchMedia('(pointer:coarse)').matches)root.querySelector('#pool-model-hint').textContent='單指旋轉・雙指縮放';
  root.dataset.interactive='true';root.dataset.cameraView='pool';
  function resize(){
    if(!canvas.clientWidth||!canvas.clientHeight)return;
    if(root.dataset.cameraView==='pool'&&!transitionTarget){
      const pose=overviewPose(camera,canvas.clientWidth/canvas.clientHeight,canvas.clientHeight);
      controls.target.copy(pose.target);camera.position.copy(pose.position);controls.update();
    }
    scheduleDraw();
  }
  return{controls,scheduleDraw,cancelTween,resize,dispose(){disposed=true;cancelTween();if(drawing)cancelAnimationFrame(drawing);events.abort();controls.dispose();}};
}
