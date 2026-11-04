// A direction diagram for each individual object point. The main 3D rays retain scale.
export function createIncomingBundle(root){
 const panel=root.querySelector('[data-mag-bundle]'),svg=panel.querySelector('svg'),status=panel.querySelector('[data-mag-bundle-state]');
 const ns='http://www.w3.org/2000/svg';
 function element(name,attributes,parent=svg){const e=document.createElementNS(ns,name);for(const [key,value]of Object.entries(attributes))e.setAttribute(key,value);parent.append(e);return e;}
 return function update({g,G,point,visible}){
  panel.hidden=!visible;
  const mode=g.eyeMode==='parallel'?'parallel':g.eyeVergence>0?'converging':'diverging',label={diverging:'發散入眼',parallel:'平行入眼',converging:'會聚入眼'}[mode];
  panel.dataset.mode=mode;status.textContent=g.blocked?'屏幕擋住入眼光':label;
  svg.setAttribute('aria-label',g.blocked?'屏幕擋住入眼光':`同一物點的光束${label}，方向放大示意`);svg.replaceChildren();
  if(g.blocked)return;
  // Remove the chief-ray tilt and magnify signed angular spread continuously.
  // The bounded mapping keeps the direction visible without implying a new image position.
  const endHalf=8,startHalf=endHalf*Math.exp(Math.tanh(g.eyeVergence*G.f*8));
  const names=point==='both'?['top','bottom']:[point];
  element('path',{d:'M300 18V103',class:'magnifier-bundle-eye'});
  element('text',{x:300,y:11,'text-anchor':'middle',class:'magnifier-bundle-label'}).textContent='入眼處';
  names.forEach((name,i)=>{
   const cy=names.length===2?33+i*47:57,group=element('g',{'data-bundle-point':name,class:`magnifier-bundle-${name}`});
   element('text',{x:8,y:cy+4,class:'magnifier-bundle-label'},group).textContent=name==='top'?'上端':'下端';
   element('path',{d:`M78 ${cy-startHalf}L300 ${cy-endHalf}V${cy+endHalf}L78 ${cy+startHalf}Z`,class:'magnifier-bundle-fill'},group);
   for(const side of [-1,0,1]){
    const y1=cy+side*startHalf,y2=cy+side*endHalf;
    element('path',{d:`M78 ${y1}L300 ${y2}`,class:'magnifier-bundle-ray','data-bundle-start':y1,'data-bundle-end':y2},group);
    const x=218,y=y1+(y2-y1)*(x-78)/222,slope=(y2-y1)/222;
    element('path',{d:`M${x-7} ${y-3-7*slope}L${x} ${y}L${x-7} ${y+3-7*slope}`,class:'magnifier-bundle-arrow'},group);
   }
  });
 };
}
