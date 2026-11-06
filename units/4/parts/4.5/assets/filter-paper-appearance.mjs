import * as THREE from '../../4.1/assets/vendor/three/build/three.module.js';
import {MATERIALS} from './color-model.mjs?v=science-reviewed-20261106';

export function createFilterPaperAppearance(paper){
 // Render the sheet with only the selected experiment light. The bench's white
 // visibility fill must not introduce extra colours into the optical result.
 const paperScene=new THREE.Scene();paper.removeFromParent();paperScene.add(paper);
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
 const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(128,128);let seed=4515;
 for(let i=0;i<pixels.data.length;i+=4){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const v=235+(seed>>>28);pixels.data.set([v,v,v,255],i);}ctx.putImageData(pixels,0,0);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 paper.material.dispose();paper.material=new THREE.MeshStandardMaterial({map:texture,bumpMap:texture,bumpScale:.004,roughness:1,metalness:0,side:THREE.DoubleSide});
 paper.receiveShadow=true;
 const light=new THREE.SpotLight('#ffffff',9,6,.21,1,2);light.position.set(.05,1.65,0);light.target.position.set(3.4,1.65,0);
 // Light begins beyond the filter. Its spectrum is already attenuated by it.
 const fill=new THREE.HemisphereLight('#ffffff','#ffffff',.12);
 paperScene.add(light,light.target,fill);
 return {scene:paperScene,update(signal,key){paper.material.color.setRGB(...MATERIALS[key].rgb);light.color.setRGB(...signal.transmitted);fill.color.setRGB(...signal.transmitted);fill.groundColor.setRGB(...signal.transmitted);}};
}
