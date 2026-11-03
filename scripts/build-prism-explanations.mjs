import {writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {TRIANGLE,trace,MONOCHROMATIC} from '../units/4/parts/4.5/assets/prism-optics.mjs';

// One uniform scale, using the lesson's actual 30° prism and two-interface rays.
export const project=([x,z])=>[350+5*x,210-5*z];
const point=p=>p.map(v=>v.toFixed(4)).join(','),points=ps=>ps.map(point).join(' ');
export function explanationSvg(kind){
 const id=`prism-${kind}`,poly=TRIANGLE.map(project),reference=trace(),entry=reference.points[1],exit=reference.points[2];
 const glass=`<polygon points="${points(poly.map(([x,y])=>[x,y+5]))}" fill="#254c4140" filter="url(#${id}-shadow)"/><polygon points="${points(poly)}" fill="url(#${id}-glass)" stroke="#6ba68e" stroke-width="1.5"/><polygon points="${points(poly)}" fill="none" stroke="#f2fff8" stroke-width="3" stroke-linejoin="round" transform="translate(-1,-1)" opacity=".7"/><path d="M${point(poly[0])} L${point(poly[1])}" stroke="#487966" stroke-width="5" opacity=".28"/>`;
 const colours=kind==='refraction'?[['reference',587.5618,'#bd8a24']]:[['red',MONOCHROMATIC.red,'#c84c3d'],['green',MONOCHROMATIC.green,'#278561'],['blue',MONOCHROMATIC.blue,'#3677bf']];
 const paths=colours.map(([name,wavelength,colour])=>{const ray=trace(wavelength,{screenX:100}),ps=ray.points.slice(1).map(project);return `<polyline data-light="${name}" data-wavelength="${wavelength}" points="${points(ps)}" fill="none" stroke="${colour}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="miter"/>`;}).join('');
 const incoming=`<path d="M${point(project([-65,0]))} L${point(project(entry))}" stroke="${kind==='refraction'?'#bd8a24':'#fffef3'}" stroke-width="2.5" fill="none"/><path d="M${point(project([-65,0]))} L${point(project(entry))}" stroke="#8b7039" stroke-width="7" opacity=".13" fill="none"/>`;
 const zoom=kind==='dispersion'?`<text x="550" y="38">出射光局部近看</text><rect x="550" y="50" width="260" height="150" rx="12" fill="#f7faf2" stroke="#8fa394"/>${colours.map(([name,wavelength,colour])=>{const ray=trace(wavelength,{screenX:100}),end=ray.points.at(-1),ps=[98,100].map(x=>{const z=end[1]+(x-100)*ray.out[1]/ray.out[0];return[570+(x-98)*97.5,120-(z+29)*97.5];});return `<polyline data-zoom-light="${name}" points="${points(ps)}" fill="none" stroke="${colour}" stroke-width="2"/>`;}).join('')}`:'';
 const normal=(name,origin,direction)=>{const ends=[-11,11].map(t=>project(origin.map((v,i)=>v+t*direction[i])));return `<polyline data-normal="${name}" points="${points(ends)}" fill="none" stroke="#5c746a" stroke-width="1.5" stroke-dasharray="6 5"/>`;};
 const normals=kind==='refraction'?`${normal('entry',entry,reference.entryNormal)}${normal('exit',exit,reference.exitNormal)}<path d="M${point(project(entry))} H815" stroke="#8a9690" stroke-width="1.3" stroke-dasharray="7 6"/><text x="610" y="191">原本直行方向</text><text x="207" y="177">法線</text><text x="438" y="184">法線</text>${[entry,exit].map((p,i)=>{const [x,y]=project(p);return `<circle cx="${x}" cy="${y}" r="4" fill="#245f49"/><text class="number" x="${x-8}" y="${y-24}">${i+1}</text>`;}).join('')}`:'';
 return `<svg xmlns="http://www.w3.org/2000/svg" width="850" height="390" viewBox="0 0 850 390" role="img" aria-labelledby="${id}-title ${id}-desc">
<title id="${id}-title">${kind==='refraction'?'三稜鏡的兩次折射與兩條法線':'同一塊玻璃中的紅、綠、藍代表光路'}</title>
<desc id="${id}-desc">${kind==='refraction'?'光在入射處偏向該處法線，在出射處偏離另一條法線；兩個折射面不平行，出射方向與原本直行方向不同。':'三種色光沿同一方向入射，在進出玻璃的界面分別折射。紅光偏折較小、藍光較大；圖中的細微差異與主實驗使用相同模型；右上局部圖使用相同兩軸倍率放大觀看，沒有放大角差。'}</desc>
<defs><linearGradient id="${id}-surface" x2=".8" y2="1"><stop stop-color="#e6e9df"/><stop offset="1" stop-color="#c7d0c3"/></linearGradient><linearGradient id="${id}-glass" x1="0" y1="0" x2="1" y2=".8"><stop stop-color="#e6fff5" stop-opacity=".75"/><stop offset=".35" stop-color="#bddfd0" stop-opacity=".28"/><stop offset=".65" stop-color="#ecfff7" stop-opacity=".65"/><stop offset="1" stop-color="#70a38f" stop-opacity=".3"/></linearGradient><filter id="${id}-shadow" x="-.3" y="-.3" width="1.6" height="1.6"><feGaussianBlur stdDeviation="5"/></filter></defs>
<style>text{font:20px system-ui,sans-serif;fill:#334c41}.number{font-size:22px;font-weight:700}@media(max-width:500px){text{font-size:31px}.number{font-size:28px}}</style>
<rect width="850" height="390" rx="18" fill="url(#${id}-surface)"/>${glass}${normals}${incoming}${paths}${zoom}
<text x="80" y="151">空氣</text><text x="640" y="${kind==='dispersion'?250:145}">空氣</text><text x="306" y="265">玻璃</text><text x="324" y="337">底邊</text>
</svg>\n`;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 for(const kind of ['refraction','dispersion'])await writeFile(new URL(`../units/4/parts/4.5/assets/prism-${kind}-explanation.svg`,import.meta.url),explanationSvg(kind));
}
