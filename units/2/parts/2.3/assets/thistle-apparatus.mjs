const NS='http://www.w3.org/2000/svg';
export const THISTLE_ATLAS={file:'assets/thistle-apparatus-atlas.png',width:1536,height:1024,funnel:[338,7,154,1005],stopper:[842,344,430,416]};
export const svgNode=(tag,attrs={})=>{const n=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,String(v));return n;};
const transform=p=>`translate(${p.x} ${p.y}) rotate(${p.angle||0})`;
const point=(p,t)=>{const a=(t.angle||0)*Math.PI/180;return{x:t.x+p.x*Math.cos(a)-p.y*Math.sin(a),y:t.y+p.x*Math.sin(a)+p.y*Math.cos(a)};};
export function apparatusSprite(kind,box){const n=svgNode('svg',{viewBox:THISTLE_ATLAS[kind].join(' '),x:box[0],y:box[1],width:box[2],height:box[3],preserveAspectRatio:'none',overflow:'hidden'});n.append(svgNode('image',{href:THISTLE_ATLAS.file,width:1536,height:1024}));return n;}
export function createDoubleStopper(){const n=svgNode('g',{'data-double-hole-stopper':''});n.append(apparatusSprite('stopper',[-52,-11,104,70]));return n;}
export function createThistleFunnel(prefix,{top=-140,tip=350,port=-26}={}){
 const group=svgNode('g',{'data-thistle-funnel':''}),height=tip-top,width=height*154/1005;
 const art=apparatusSprite('funnel',[port-width/2,top,width,height]);
 // Remove the generated ambient shadow outside the photographed glass contour.
 const clip=svgNode('clipPath',{id:prefix+'-funnel-glass'});clip.append(svgNode('path',{d:'M350 16Q414 0 478 16L461 30Q447 40 444 100Q492 120 488 180Q479 240 441 270L437 286V996Q436 1010 415 1010Q394 1010 395 996V286Q391 265 375 245Q338 215 340 170Q337 130 380 105V45L350 25Z'}));
 const defs=svgNode('defs');defs.append(clip);art.append(defs);art.firstChild.setAttribute('clip-path',`url(#${prefix}-funnel-glass)`);group.append(art);
 const column=svgNode('path',{d:`M${port} ${top+10}V${tip}`,fill:'none',stroke:'#b9e1e4','stroke-width':3.5,'stroke-opacity':.7,'data-funnel-liquid':''});group.append(column);
 const pool=svgNode('ellipse',{cx:port,cy:top+height*.16,rx:width*.25,ry:4,fill:'#b9e1e4','fill-opacity':.45});group.append(pool);
 let pose={x:0,y:0,angle:0};
 return{group,render(next,flow=false){pose=next;group.setAttribute('transform',transform(next));column.setAttribute('opacity',flow?'1':'0');pool.setAttribute('opacity',flow?'1':'0');const end=point({x:port,y:tip},next);group.dataset.tipX=String(end.x);group.dataset.tipY=String(end.y);},mouth(){return point({x:port,y:top},pose);},geometry(){return{bounds:[port-width/2,top,width,height],d:`M${port-width*.35} ${top}H${port+width*.35}V${top+height*.1}Q${port+width*.6} ${top+height*.2} ${port+10} ${top+height*.28}V${tip}H${port-10}V${top+height*.28}Q${port-width*.6} ${top+height*.2} ${port-width*.35} ${top+height*.1}Z`,transform:transform(pose),stroke:false};}};
}
