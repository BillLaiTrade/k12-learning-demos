// A fixed Paramecium slide, drawn once for all three image stages.
// Its rounded anterior and asymmetric oral groove make a 180° turn visible.
const body='M-9 -96C-37 -96-49 -68-47 -27C-46 22-27 72 5 99C21 80 34 53 34 29C34 11 24 7 24 -9C24 -26 41 -37 35 -61C30 -83 13 -97-9 -96Z';
const groove='M32 -43C17 -28 12 -8 24 12C28 19 29 28 27 37';
const nucleus='M-23 -17C-36 -12-33 9-22 16C-10 22-1 7-6 -5C-9 -14-14 -20-23 -17Z';
const cilia='M-26 -91l-5 -9M-38 -79l-8 -7M-46 -60l-10 -4M-49 -38l-10 -1M-48 -15l-10 2M-44 9l-10 4M-37 32l-9 5M-27 54l-9 6M-13 76l-7 8M2 96l-3 10M13 88l7 8M24 68l9 5M32 48l10 3M36 25l10 1M30 4l9 -4M30 -21l9 3M38 -42l10 1M36 -65l9 -5M25 -85l6 -8M6 -95l1 -10';
const vacuoles=[[-15,-59,12],[8,54,9],[-31,25,5],[10,-37,5],[-8,33,4],[11,9,4]];
export function specimenGraphic(x,y,h,inverted=false,kind='original'){
 // The specimen itself keeps identical colors and structure in both image types.
 const frame=kind==='original'?'':`<rect data-micro-image-frame x="-62" y="-110" width="124" height="220" rx="12" fill="none" stroke="#8a7c58" stroke-width="3.5"${kind==='virtual'?' stroke-dasharray="12 9"':''}/>`;
 return `<g data-image-kind="${kind}" data-micro-specimen data-inverted="${inverted}" transform="translate(${x} ${y})${inverted?' rotate(180)':''} scale(${h/100})">${frame}<path d="${cilia}" fill="none" stroke="#709e87" stroke-width="2.5" stroke-linecap="round"/><path data-specimen-body d="${body}" fill="#dce8be" fill-opacity="1" stroke="#537d69" stroke-width="3"/><path d="${body}" fill="none" stroke="#f6f7da" stroke-width="2" transform="scale(.9)"/>${vacuoles.map(([cx,cy,r])=>`<circle cx="${cx}" cy="${cy}" r="${r}" fill="#eef5dd" stroke="#a8bc91" stroke-width="2"/>`).join('')}<path d="${nucleus}" fill="#87a68b"/><path data-specimen-groove d="${groove}" fill="none" stroke="#ad762d" stroke-width="6" stroke-linecap="round"/><circle cy="-88" r="5" fill="#ec8b6d" stroke="#fff9e6" stroke-width="2"/><circle cy="88" r="5" fill="#6dbde3" stroke="#fff9e6" stroke-width="2"/></g>`;
}
export function drawSpecimen(ctx){
 ctx.strokeStyle='#709e87';ctx.lineWidth=2.5;ctx.lineCap='round';ctx.stroke(new Path2D(cilia));
 ctx.fillStyle='#dce8be';ctx.strokeStyle='#537d69';ctx.lineWidth=3;ctx.fill(new Path2D(body));ctx.stroke(new Path2D(body));
 for(const [x,y,r]of vacuoles){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle='#eef5dd';ctx.fill();ctx.strokeStyle='#a8bc91';ctx.lineWidth=2;ctx.stroke();}
 ctx.fillStyle='#87a68b';ctx.fill(new Path2D(nucleus));ctx.strokeStyle='#ad762d';ctx.lineWidth=6;ctx.stroke(new Path2D(groove));
}
