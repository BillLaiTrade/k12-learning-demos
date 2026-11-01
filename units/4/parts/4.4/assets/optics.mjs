// Distances use a consistent model unit; SVG coordinates are derived separately.
export function imageFor(f,u){
 if(!Number.isFinite(f)||!Number.isFinite(u)||f===0||u<=0)throw new RangeError('Invalid lens conditions');
 if(Math.abs(u-f)<1e-9)return {finite:false,v:null,m:null,type:'infinity'};
 const v=f*u/(u-f),m=-v/u;
 return {finite:true,v,m,type:v>0?'real':'virtual',upright:m>0,size:Math.abs(Math.abs(m)-1)<1e-8?'equal':Math.abs(m)>1?'larger':'smaller'};
}
export function rayAt(f,u,objectY,h,x){return h+x*((h-objectY)/u-h/f);}
export function pinhole(u,v,y){return -v*y/u;}
export function screenSpot(f,u,y,h,s){return rayAt(f,u,y,h,s);}
export function eyeModel(kind='normal',near=false,adjusted=false,corrected=false){
 // Eye plane x=0, retina x=160; spectacle plane x=-70.
 const retina=160,gap=70,u=near?360:3000;
 const base=1/160+1/3000;
 let power=base+({normal:0,myopia:1/110-1/160,hyperopia:1/220-1/160}[kind]??0);
 if(adjusted)power=1/retina+1/u;
 const residual=power-1/retina;
 const spectaclePower=corrected?1/(u-gap)-residual/(1-gap*residual):0;
 // At spectacle: incoming slope h/(u-gap); at eye height H=h+gap*slope.
 const trace=(h,objectY=0)=>{const before=(h-objectY)/(u-gap),after=before-spectaclePower*h,H=h+gap*after,slope=after-power*H;return {objectY,spectacleY:h,eyeY:H,slope,retinaY:H+retina*slope,focus:objectY===0?-H/slope:null};};
 return {retina,gap,u,power,spectaclePower,rays:[-38,0,38].map(h=>trace(h)),objectRays:[-100,100].flatMap(y=>[-24,24].map(h=>trace(h,y))),focus:trace(38).focus};
}
export function microscope(){
 const objective={f:60,u:80};const first=imageFor(objective.f,objective.u);
 const separation=300,eyepieceF=100,eyepieceU=separation-first.v,second=imageFor(eyepieceF,eyepieceU);
 return {objective,first,separation,eyepieceF,eyepieceU,second,total:first.m*second.m};
}
