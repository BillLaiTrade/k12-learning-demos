// Air → glass → air at two spherical surfaces. Coordinates are model units.
export function parallelModel(kind){
 if(!['convex','concave'].includes(kind))throw new RangeError('Unknown lens');
 const sign=kind==='convex'?1:-1,radius=8,thickness=.9,halfHeight=2.2,index=1.5;
 const left=y=>sign*(radius-Math.sqrt(radius*radius-y*y));
 const right=y=>thickness-left(y);
 const refract=(d,N,n1,n2)=>{
  let [nx,ny]=N;if(d[0]*nx+d[1]*ny>0){nx=-nx;ny=-ny;}
  const cosine=-(d[0]*nx+d[1]*ny),eta=n1/n2,k=1-eta*eta*(1-cosine*cosine);
  if(k<0)throw new RangeError('Total internal reflection outside this model');
  return [eta*d[0]+(eta*cosine-Math.sqrt(k))*nx,eta*d[1]+(eta*cosine-Math.sqrt(k))*ny];
 };
 const rays=[-1.2,0,1.2].map(y=>{
  const enter=[left(y),y],incoming=[1,0],N1=[sign*Math.sqrt(radius*radius-y*y)/radius,-y/radius];
  const inside=refract(incoming,N1,1,index),center=thickness-sign*radius;
  const dx=enter[0]-center,b=2*(dx*inside[0]+y*inside[1]),c=dx*dx+y*y-radius*radius;
  const exitCandidates=[(-b-Math.sqrt(b*b-4*c))/2,(-b+Math.sqrt(b*b-4*c))/2].filter(t=>t>1e-8).map(t=>[enter[0]+t*inside[0],y+t*inside[1]]);
  const exit=exitCandidates.find(p=>Math.abs(p[0]-right(p[1]))<1e-7);
  if(!exit)throw new RangeError('Ray misses exit surface');
  const N2=[(exit[0]-center)/radius,exit[1]/radius],outgoing=refract(inside,N2,index,1);
  const endX=13.2,end=[endX,exit[1]+(endX-exit[0])*outgoing[1]/outgoing[0]];
  const focus=Math.abs(outgoing[1])<1e-10?null:exit[0]-exit[1]*outgoing[0]/outgoing[1];
  return {from:[-7.6,y],enter,exit,end,incoming,inside,outgoing,N1,N2,focus};
 });
 return {kind,radius,thickness,halfHeight,index,left,right,rays,focus:rays[0].focus};
}
