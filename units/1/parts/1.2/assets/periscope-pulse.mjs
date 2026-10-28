// A short moving segment of the actual traced polyline, without a full trail.
export function pathLength(points) {
  return points.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p[0]-points[i][0],p[1]-points[i][1]),0);
}
export function pulseSegment(points,progress,tail=110) {
  if(!points.length)return [];
  const total=pathLength(points),head=Math.max(0,Math.min(1,progress))*total;
  const start=Math.max(0,head-tail),result=[];
  let distance=0;
  for(let i=1;i<points.length;i++) {
    const a=points[i-1],b=points[i],length=Math.hypot(b[0]-a[0],b[1]-a[1]);
    if(length<1e-8)continue;
    const end=distance+length;
    if(end>=start && distance<=head) {
      const at=d=>a.map((n,j)=>n+(b[j]-n)*Math.max(0,Math.min(1,(d-distance)/length)));
      const p=at(Math.max(start,distance)),q=at(Math.min(head,end));
      if(!result.length)result.push(p);
      if(Math.hypot(q[0]-result.at(-1)[0],q[1]-result.at(-1)[1])>1e-8)result.push(q);
    }
    distance=end;
  }
  return result.length?result:[[...points[0]]];
}
