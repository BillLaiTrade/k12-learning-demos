// One overview: the actual activity image and two independently controlled pixels.
import {writeFile} from 'node:fs/promises';
import {PICTURE_TARGET,colourCss} from '../units/4/parts/4.5/assets/pixel-tv-model.mjs';
const cell=22,x=12,y=26;
const pixels=PICTURE_TARGET.map((colour,i)=>`<rect data-pixel="${i}" x="${x+i%8*cell}" y="${y+Math.floor(i/8)*cell}" width="${cell}" height="${cell}" fill="${colourCss(colour)}" stroke="#25372a" stroke-width=".6"/>`).join('');
const focus=[['A',9],['B',10]].map(([name,index])=>{const px=x+index%8*cell,py=y+Math.floor(index/8)*cell,cx=px+cell/2;return `<rect data-guide-cell="${name}" data-focus="${index}" x="${px}" y="${py}" width="${cell}" height="${cell}" fill="none" stroke="#f5cd65" stroke-width="3"/><path d="M${cx} 20 V${py}" stroke="#927d40" stroke-width="1.3"/><text x="${cx}" y="17" text-anchor="middle">${name}</text>`;}).join('');
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="210" viewBox="0 0 200 210" role="img" aria-labelledby="title desc"><title id="title">畫面由像素排列而成</title><desc id="desc">實際8×8小狐狸。金框A是第2列第2格的橙色，B是同列右邊相鄰的深藍色；放大示例分別列出它們各自的RGB亮度。</desc><style>text{font:bold 21px system-ui,sans-serif;fill:#36573e}</style>${pixels}${focus}</svg>\n`;
await writeFile(new URL('../units/4/parts/4.5/assets/pixel-tv-overview.svg',import.meta.url),svg);
console.log('Built compact image overview with two adjacent pixels from the activity model.');
