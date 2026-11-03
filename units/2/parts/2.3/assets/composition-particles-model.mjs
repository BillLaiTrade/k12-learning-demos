// 二維粒子教學示意；分區面積與標示傳達乾燥空氣約數，粒子數不作精密測量。
export const REGIONS={
 nitrogen:{d:'M0 0H100V70H80V80H0Z',contains:(x,y)=>x>=0&&y>=0&&x<=100&&(y<=70||x<=80&&y<=80)},
 oxygen:{d:'M80 70H100V90H90V100H0V80H80Z',contains:(x,y)=>x>=0&&y>=70&&x<=100&&y<=100&&(y>=80||x>=80)&&(y<=90||x<=90)},
 minor:{d:'M90 90H100V100H90Z',contains:(x,y)=>x>=90&&x<=100&&y>=90&&y<=100}
};
export const groupOf=gas=>['argon','other'].includes(gas)?'minor':gas;
const ease=t=>t*t*(3-2*t);
export function createParticles({detail=false,seed=2303}={}){
 let randomState=seed;const random=()=>{randomState=(Math.imul(1664525,randomState)+1013904223)>>>0;return randomState/4294967296;};
 const counts=detail?{argon:93,other:7}:{nitrogen:100,oxygen:27,argon:3,other:1},height=detail?30:100,radius=detail?.65:.8;
 let mode=detail?'mixed':'proportion',returning=null;
 const inside=(gas,x,y,target=mode)=>{
  if(x<radius||x>100-radius||y<radius||y>height-radius)return false;
  if(detail||target==='mixed')return true;
  const shape=REGIONS[groupOf(gas)];return [[-radius,-radius],[-radius,radius],[radius,-radius],[radius,radius]].every(([dx,dy])=>shape.contains(x+dx,y+dy));
 };
 function sample(gas,target){for(let i=0;i<20000;i++){const x=radius+random()*(100-radius*2),y=radius+random()*(height-radius*2);if(inside(gas,x,y,target))return{x,y};}throw Error('Cannot place particle');}
 const particles=[];
 for(const[gas,count]of Object.entries(counts))for(let i=0;i<count;i++){
  let p;for(let attempt=0;attempt<100;attempt++){p=sample(gas,mode);if(particles.every(q=>Math.hypot(q.x-p.x,q.y-p.y)>radius*2.1))break;}
  const angle=random()*Math.PI*2,speed=8+random()*7;particles.push({id:particles.length,gas,...p,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,radius});
 }
 function setMode(next,{immediate=false}={}){
  if(detail||next===mode&&!returning)return;mode=next;returning=null;
  if(immediate){particles.forEach(p=>Object.assign(p,sample(p.gas,mode)));return;}
  if(next==='proportion')returning={elapsed:0,starts:particles.map(p=>({x:p.x,y:p.y})),ends:particles.map(p=>sample(p.gas,'proportion'))};
 }
 function step(dt){
  dt=Math.max(0,Math.min(.05,dt));
  if(returning){returning.elapsed+=dt;const t=ease(Math.min(1,returning.elapsed/1.2));particles.forEach((p,i)=>{p.x=returning.starts[i].x+(returning.ends[i].x-returning.starts[i].x)*t;p.y=returning.starts[i].y+(returning.ends[i].y-returning.starts[i].y)*t;});if(t===1)returning=null;return;}
  for(const p of particles){let nx=p.x+p.vx*dt,ny=p.y+p.vy*dt;if(!inside(p.gas,nx,p.y)){p.vx*=-1;nx=p.x+p.vx*dt;}if(!inside(p.gas,nx,ny)){p.vy*=-1;ny=p.y+p.vy*dt;}if(inside(p.gas,nx,ny)){p.x=nx;p.y=ny;}}
  // 僅檢查鄰近格，避免手機逐幀比較全部粒子配對。
  const cells=new Map(),cellSize=radius*3;
  for(const p of particles){const ix=Math.floor(p.x/cellSize),iy=Math.floor(p.y/cellSize);
   for(let x=ix-1;x<=ix+1;x++)for(let y=iy-1;y<=iy+1;y++)for(const q of cells.get(x+','+y)||[]){
    if(mode!=='mixed'&&groupOf(p.gas)!==groupOf(q.gas))continue;
    const dx=q.x-p.x,dy=q.y-p.y,d=Math.hypot(dx,dy);if(d<=.0001||d>=radius*2)continue;
    const nx=dx/d,ny=dy/d,relative=(q.vx-p.vx)*nx+(q.vy-p.vy)*ny;
    if(relative<0){p.vx+=relative*nx;p.vy+=relative*ny;q.vx-=relative*nx;q.vy-=relative*ny;}
    const overlap=(radius*2-d)/2+.001;
    for(const[a,sign]of [[p,-1],[q,1]]){const x=a.x+sign*nx*overlap,y=a.y+sign*ny*overlap;if(inside(a.gas,x,y)){a.x=x;a.y=y;}}
   }
   const key=ix+','+iy;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(p);
  }
 }
 return{particles,counts,step,setMode,inside,get mode(){return mode;},get regrouping(){return !!returning;}};
}
