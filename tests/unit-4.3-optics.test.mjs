import {test} from 'node:test';
import assert from 'node:assert/strict';
import {materials,refractedAngle,rayGeometry,apparentDepth} from '../units/4/parts/4.3/assets/optics.mjs';
const rad=x=>x*Math.PI/180;
test('transmitted rays conserve tangential optical direction and reverse exactly',()=>{
  for(const material of ['water','glass']) for(const angle of [0,1,15,30,60]){
    const out=refractedAngle('air',material,angle);
    assert.ok(Math.abs(Math.sin(rad(angle))-materials[material].n*Math.sin(rad(out)))<1e-12);
    assert.ok(Math.abs(refractedAngle(material,'air',out)-angle)<1e-10);
    if(angle>0)assert.ok(out<angle);
    else assert.equal(out,0);
  }
  for(const material of ['water','glass'])for(const angle of [0,10,30,35]){
    const g=rayGeometry(material,angle,true);
    assert.ok(g.source[1]>g.hit[1]&&g.end[1]<g.hit[1]);
    assert.ok(g.outgoing>=angle&&g.outgoing<90);
  }
  assert.throws(()=>refractedAngle('glass','air',60),RangeError);
});
test('apparent coin is the backward intersection of independently refracted pupil rays',()=>{
  for(let depth=40;depth<=100;depth++){
    const g=apparentDepth(depth);
    assert.deepEqual(g.coin,[280,340]);
    assert.ok(g.apparent[1]>g.surface&&g.apparent[1]<g.coin[1]);
    for(const {hit,eye} of g.rays){
      assert.equal(hit[1],g.surface);
      const si=(hit[0]-g.coin[0])/Math.hypot(hit[0]-g.coin[0],hit[1]-g.coin[1]);
      const so=(eye[0]-hit[0])/Math.hypot(eye[0]-hit[0],eye[1]-hit[1]);
      assert.ok(Math.abs(materials.water.n*si-so)<1e-12);
      const cross=(g.apparent[0]-hit[0])*(eye[1]-hit[1])-(g.apparent[1]-hit[1])*(eye[0]-hit[0]);
      assert.ok(Math.abs(cross)<1e-8);
    }
  }
  const vertical=apparentDepth(70,280,.01);
  assert.ok(Math.abs(vertical.apparentDepth-70/materials.water.n)<.001);
});
