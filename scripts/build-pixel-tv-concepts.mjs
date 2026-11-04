// Teaching diagrams share the actual pixel activity's colours and image.
import {writeFile} from 'node:fs/promises';
import {PICTURE_TARGET,PICTURE_SIZE,colourCss,subpixelCss} from '../units/4/parts/4.5/assets/pixel-tv-model.mjs';

const directory=new URL('../units/4/parts/4.5/assets/',import.meta.url),sample=9;
const rect=(x,y,w,h,fill,extra='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${extra}/>`;
const label=(x,y,value,extra='')=>`<text x="${x}" y="${y}" text-anchor="middle" ${extra}>${value}</text>`;
const outline=(x,y,w,h,extra='')=>rect(x,y,w,h,'none',`stroke="#efbe49" stroke-width="2.5" ${extra}`);
function picture(x,y,cell,filled=64){
 return PICTURE_TARGET.map((colour,i)=>rect(x+i%PICTURE_SIZE*cell,y+Math.floor(i/PICTURE_SIZE)*cell,cell,cell,i<filled?colourCss(colour):'#d2d9ca',`data-pixel="${i}" data-filled="${i<filled}" stroke="#8b9b83" stroke-width=".45"`)).join('');
}
function svg(title,description,body){
 return `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="220" viewBox="0 0 300 220" role="img" aria-labelledby="title desc"><title id="title">${title}</title><desc id="desc">${description}</desc><style>text{font:14px system-ui,sans-serif;fill:#36573e}path{fill:none;stroke-linecap:round;stroke-linejoin:round}.small{font-size:12px}.em{font-weight:700}</style>${body}</svg>\n`;
}
const before=PICTURE_TARGET[sample],after=[before[0],4,before[2]];
const bars=(levels,x,y,width,height)=>[0,1,2].map(i=>rect(x+i*(width+1),y,width,height,subpixelCss(levels,i),`data-subpixel="${i}"`)).join('');

// The selected gold box has exactly one cell's width and height.
const sourceX=24,sourceY=69,cell=14;
await writeFile(new URL('pixel-tv-picture.svg',directory),svg('一個像素內有RGB子像素','左邊是實際8×8畫面，金框只選第2列第2格這一個橙色像素。右邊只放大同一格，顯示其中緊密排列的紅、綠、藍三個子像素；整個三色框合起來仍是一個像素。',`${label(66,29,'8 × 8 畫面')}${label(225,29,'只放大這一格')}${picture(10,55,cell)}<path d="M38 69 L174 65 M38 83 L174 157" stroke="#cba749" stroke-width="1.3"/>${outline(sourceX,sourceY,cell,cell,`data-focus="${sample}"`)}${rect(174,65,106,92,'#26392b','rx="6"')}${bars(before,180,71,30,80)}${outline(174,65,106,92,'rx="6" data-expanded-pixel="9"')}${label(195,180,'紅 R')}${label(226,180,'綠 G')}${label(257,180,'藍 B')}${label(66,199,'一格＝一個像素')}`));

function comparison(levels,y,state){
 return `<g data-state="${state}">${label(35,y+16,state==='before'?'調整前':'調整後','class="em"')}${label(35,y+36,state==='before'?'綠光較暗':'綠光調亮','class="small"')}${rect(76,y-4,96,56,'#26392b','rx="5"')}${bars(levels,80,y,29,48)}${label(94,y+68,'紅 R','class="small"')}${label(124,y+68,'綠 G','class="small"')}${label(154,y+68,'藍 B','class="small"')}${label(195,y+31,'＝')}${rect(228,y,50,48,colourCss(levels),'rx="5" stroke="#809775" data-combined="true"')}${label(253,y+68,state==='before'?'橙色':'黃色')}</g>`;
}
await writeFile(new URL('pixel-tv-rgb.svg',directory),svg('只調亮綠光，同一像素由橙變黃','每一列橫向都是同一個像素的兩種觀看方式：左邊放大子像素，右邊是一般觀看距離合看的顏色，不是先後步驟。上列為調整前，下列為調整後；紅光與藍光保持不變，只提高綠光亮度，顏色由橙色變黃色。',`${label(123,19,'近看子像素')}${label(252,19,'一般觀看')}${comparison(before,41,'before')}<path d="M124 116 V135 M119 129 L124 135 L129 129" stroke="#4d9760" stroke-width="2.5"/>${comparison(after,146,'after')}`));

// A real progression: no values assigned, first 32 assigned, all 64 assigned.
let stages='';
for(const [i,stage]of[{name:'blank',count:0,label:'空白'},{name:'partial',count:32,label:'逐格設定'},{name:'complete',count:64,label:'完整圖片'}].entries()){
 const x=8+i*102;
 stages+=`<g data-stage="${stage.name}">${label(x+40,40,stage.label,'class="em"')}${picture(x,69,10,stage.count)}${label(x+40,178,`已填 ${stage.count} 格`,'class="small"')}${stage.count?outline(x+10,79,10,10,`data-focus="${sample}"`):''}</g>`;
 if(i<2)stages+=`<path d="M${x+84} 108 H${x+98} M${x+94} 104 L${x+98} 108 L${x+94} 112" stroke="#7d9d73" stroke-width="1.7"/>`;
}
await writeFile(new URL('pixel-tv-compose.svg',directory),svg('從空白逐格設定到完整圖片','同一張8×8畫面的三個階段。先是64格都未設定的灰色空白，再依序填入前32格，最後填完64格，形成實作任務的小狐狸。已填顏色都使用實際模型，灰色空白與已設定的黑色不同；金框始終只標同一個像素。',stages));
console.log('Built single-pixel, controlled-brightness and image-progress diagrams.');
