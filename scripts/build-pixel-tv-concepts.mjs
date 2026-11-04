// Static teaching diagrams share the actual activity's pixels and colour model.
import {writeFile} from 'node:fs/promises';
import {PICTURE_TARGET,PICTURE_SIZE,colourCss,subpixelCss} from '../units/4/parts/4.5/assets/pixel-tv-model.mjs';

const directory=new URL('../units/4/parts/4.5/assets/',import.meta.url);
const sample=9;
const rect=(x,y,w,h,fill,extra='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${extra}/>`;
const label=(x,y,value)=>`<text x="${x}" y="${y}" text-anchor="middle">${value}</text>`;
function picture(x,y,cell){
 return PICTURE_TARGET.map((colour,i)=>rect(x+(i%PICTURE_SIZE)*cell,y+Math.floor(i/PICTURE_SIZE)*cell,cell,cell,colourCss(colour),`data-pixel="${i}" stroke="#23352a" stroke-width=".5"`)).join('');
}
function outline(x,y,w,h){return rect(x,y,w,h,'none','stroke="#f5cf64" stroke-width="3"');}
function svg(title,description,body){
 return `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200" role="img" aria-labelledby="title desc"><title id="title">${title}</title><desc id="desc">${description}</desc><style>text{font:13px system-ui,sans-serif;fill:#416044}path{fill:none;stroke-linecap:round;stroke-linejoin:round}</style>${body}</svg>\n`;
}

// A real 3×3 crop at rows 2–4 / columns 2–4, rather than a different drawing.
let zoom='';
for(let row=0;row<3;row++)for(let column=0;column<3;column++){
 const i=(row+1)*PICTURE_SIZE+column+1;
 zoom+=rect(184+column*28,63+row*28,28,28,colourCss(PICTURE_TARGET[i]),`data-zoom-pixel="${i}" stroke="#23352a" stroke-width=".6"`);
}
const full=picture(12,46,16),crop=outline(28,62,48,48),connect='<path d="M76 62 L184 63 M76 110 L184 147" stroke="#d7b455" stroke-width="1.5"/>';
await writeFile(new URL('pixel-tv-picture.svg',directory),svg('從完整畫面放大像素','同一張8×8小狐狸。金框選取第2到4列、第2到4格，右側依原色放大這個3×3局部；局部左上角的橙色格就是下一張圖解的一個像素。',`${label(76,25,'完整畫面・8 × 8 格')}${label(226,37,'同一局部放大')}${full}${connect}${zoom}${crop}${outline(184,63,28,28)}${label(226,176,'金框：一個像素')}`));

const colour=PICTURE_TARGET[sample];
const bars=Array.from({length:3},(_,i)=>rect(25+i*35,66,34,76,subpixelCss(colour,i),`data-subpixel="${i}"`)).join('');
await writeFile(new URL('pixel-tv-rgb.svg',directory),svg('一個像素內的RGB子像素','同一個橙色像素的兩種視角。近看是緊密排列的紅、綠、藍子像素；紅亮、綠較暗、藍關閉。一般觀看距離會合看成一個橙色。這裡不是三個獨立的像素。',`${label(77,27,'近看：三個子像素')}${label(242,27,'合看：一個顏色')}${rect(19,60,117,88,'#25372c','rx="8"')}${bars}${label(42,169,'紅 R')}${label(77,169,'綠 G')}${label(112,169,'藍 B')}<path d="M153 103 H193 M185 97 L193 103 L185 109" stroke="#82a27a" stroke-width="2.5"/>${rect(213,65,59,77,colourCss(colour),'rx="8" stroke="#859b7c" stroke-width="1.5" data-combined="true"')}`));

let examples='';
for(const [n,index]of[sample,17,42].entries()){
 const x=31+(index%8)*16,y=41+Math.floor(index/8)*16,sy=43+n*52;
 examples+=`<path d="M${x+8} ${y+8} L190 ${sy+11} H233" stroke="#fffef8" stroke-width="5"/><path d="M${x+8} ${y+8} L190 ${sy+11} H233" stroke="#80a07a" stroke-width="1.7"/>${outline(x,y,16,16)}${rect(237,sy,29,26,colourCss(PICTURE_TARGET[index]),`rx="5" stroke="#859b7c" data-sample="${index}"`)}`;
}
await writeFile(new URL('pixel-tv-compose.svg',directory),svg('許多像素組成一幅畫面','與前圖及第三個任務相同的8×8小狐狸。橙色、米白色、黑色三個位置各自對應自己的顏色，表示每個像素可獨立設定。',`${label(95,24,'每一格，分別設定')}${picture(31,41,16)}${examples}${label(149,193,'不同像素的顏色，組成一幅圖片')}`));
console.log('Built three pixel TV concept diagrams from the activity model.');
