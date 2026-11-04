import {imagingState} from './imaging-optics.mjs?v=20261104-bench-proportion1';
export function paintBenchProjection(paper,art,G,state){
 const pc=paper.getContext('2d');

  const g=imagingState(state),W=paper.width,H=paper.height;pc.fillStyle='#f1f1e5';pc.fillRect(0,0,W,H);
  if(state.atInfinity){const rx=Math.max(5,g.spread*W/G.screenWidth),ry=Math.max(5,g.spread*H/G.screenHeight);pc.fillStyle='#d17c36';pc.beginPath();pc.ellipse(W/2,H/2,rx,ry,0,0,Math.PI*2);pc.fill();return g;}
  // Uniform pupil samples spread an extended object on the actual receiving plane.
  // Their envelope is exactly the same thin-lens rayAt geometry as the helper rays.
  const samples=g.spread<.003?1:61;pc.save();pc.globalAlpha=1/samples;
  for(let i=0;i<samples;i++){
   const radius=samples===1?0:Math.sqrt((i+.5)/samples)*g.spread,angle=i*2.399963229728653;
   pc.save();pc.translate(W/2+Math.cos(angle)*radius*W/G.screenWidth,H/2+Math.sin(angle)*radius*H/G.screenHeight);
   pc.scale(g.projectionScale*G.cardWidth/G.screenWidth*W/art.width,g.projectionScale*G.cardHeight/G.screenHeight*H/art.height);pc.drawImage(art,-art.width/2,-art.height/2);pc.restore();
  }
  pc.restore();return g;
}
