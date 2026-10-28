import {COMPARISON,comparisonCamera,project,quad,planePoint,VIEW_PLANES,clipNear} from './mirror-comparison.mjs?v=1';
const polygon=points=>'M'+points.map(p=>p.slice(0,2).join(',')).join('L')+'Z';

export function createComparisonView(svg) {
  const find=role=>svg.querySelector(`[data-view="${role}"]`),camera=comparisonCamera();
  const textures={},contexts=Object.fromEntries(['front','rear'].map(name=>[name,find(name).getContext('2d',{willReadFrequently:true})]));
  let mode='mirror',failed=false;
  function triangle(context,image,source,target) {
    const [p,q,r]=source,[a,b,c]=target;
    const det=(q[0]-p[0])*(r[1]-p[1])-(r[0]-p[0])*(q[1]-p[1]);
    const aa=((b[0]-a[0])*(r[1]-p[1])-(c[0]-a[0])*(q[1]-p[1]))/det;
    const bb=((b[1]-a[1])*(r[1]-p[1])-(c[1]-a[1])*(q[1]-p[1]))/det;
    const cc=((c[0]-a[0])*(q[0]-p[0])-(b[0]-a[0])*(r[0]-p[0]))/det;
    const dd=((c[1]-a[1])*(q[0]-p[0])-(b[1]-a[1])*(r[0]-p[0]))/det;
    context.save();context.beginPath();
    const center=[(a[0]+b[0]+c[0])/3,(a[1]+b[1]+c[1])/3];
    for(const [i,t] of target.entries()) {
      const dx=t[0]-center[0],dy=t[1]-center[1],length=Math.hypot(dx,dy);
      const x=t[0]+dx/length*.35,y=t[1]+dy/length*.35;
      if(i===0)context.moveTo(x,y);else context.lineTo(x,y);
    }
    context.closePath();context.clip();
    context.transform(aa,bb,cc,dd,a[0]-aa*p[0]-cc*p[1],a[1]-bb*p[0]-dd*p[1]);
    context.drawImage(image,0,0);context.restore();
  }
  function paint(name) {
    const context=contexts[name],image=textures[name],plane=VIEW_PLANES[name];
    context.clearRect(0,0,900,400);if(!image)return;
    context.save();context.beginPath();quad(camera,plane).forEach(([x,y],i)=>i?context.lineTo(x,y):context.moveTo(x,y));context.closePath();context.clip();
    const n=16;
    for(let row=0;row<n;row++)for(let col=0;col<n;col++) {
      const uv=[[col/n,row/n],[(col+1)/n,row/n],[(col+1)/n,(row+1)/n],[col/n,(row+1)/n]];
      const target=uv.map(([u,v])=>project(camera,planePoint(plane,u,v)));
      const source=uv.map(([u,v])=>[u*image.width,v*image.height]);
      for(const indices of [[0,1,2],[0,2,3]])triangle(context,image,indices.map(i=>source[i]),indices.map(i=>target[i]));
    }
    context.restore();
  }
  const table=(start,end)=>polygon(clipNear(camera,[[start,570,-2500],[end,570,-2500],[end,570,2500],[start,570,2500]]).map(p=>project(camera,p)));
  function grain(start,end) {
    let d='';
    for(let z=-1500;z<=1500;z+=140) {
      const points=clipNear(camera,[[start,570,z],[end,570,z]],false);
      if(points.length===2){const [a,b]=points.map(p=>project(camera,p));d+=`M${a[0]},${a[1]}L${b[0]},${b[1]}`;}
    }
    for(let x=start;x<=end;x+=160) {
      const points=clipNear(camera,[[x,570,-2500],[x,570,2500]],false);
      if(points.length===2){const [a,b]=points.map(p=>project(camera,p));d+=`M${a[0]},${a[1]}L${b[0]},${b[1]}`;}
    }
    return d;
  }
  const shadow=x=>polygon(Array.from({length:40},(_,i)=>project(camera,[x+Math.sin(i*Math.PI/20)*28,570,Math.cos(i*Math.PI/20)*80])));
  find('table').setAttribute('d',table(170,1400));find('grain').setAttribute('d',grain(170,1400));
  find('frame').setAttribute('d',polygon(quad(camera,VIEW_PLANES.frame)));
  find('glass').setAttribute('d',polygon(quad(camera,VIEW_PLANES.glass)));
  find('clip').setAttribute('d',polygon(quad(camera,VIEW_PLANES.glass)));
  find('reflected-table').setAttribute('d',table(540,1400));find('reflected-grain').setAttribute('d',grain(540,1400));
  find('near-shadow').setAttribute('d',shadow(COMPARISON.source[0]));find('far-shadow').setAttribute('d',shadow(COMPARISON.image[0]));
  const nose=project(camera,COMPARISON.image);find('nose').setAttribute('cx',nose[0]);find('nose').setAttribute('cy',nose[1]);
  svg.dataset.eye=COMPARISON.eye.join(',');svg.dataset.nose=nose.slice(0,2).join(',');
  svg.dataset.farQuad=JSON.stringify(quad(camera,VIEW_PLANES.front));
  function render(next) {
    mode=next;svg.dataset.mode=mode;
    const mirror=mode==='mirror';find('mirror').style.display=mirror?'inline':'none';
    find('far').setAttribute('clip-path',mirror?`url(#${find('clip').parentElement.id})`:'none');
    svg.dataset.ready=failed?'error':textures.front&&textures.rear?'true':'loading';
  }
  for(const [name,file] of [['front','teddy-front'],['rear','teddy-rear']]) {
    const image=new Image();image.onload=()=>{textures[name]=image;paint(name);render(mode);};
    image.onerror=()=>{failed=true;render(mode);};image.src=new URL(`mirror/${file}.webp`,import.meta.url).href;
  }
  render(mode);return render;
}
