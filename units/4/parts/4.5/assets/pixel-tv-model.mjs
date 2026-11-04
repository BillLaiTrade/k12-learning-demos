// An ideal RGB display: each level is a normalized channel-light control value.
export const MAX_LEVEL=4;
// Weak is one quarter of strong; keep orange distinct without fine adjustment.
export const LEVELS=Object.freeze([0,1,4]);
export const levelName=value=>({0:'關閉',1:'弱',4:'強'})[value];
export const CHANNELS=Object.freeze(['紅光 R','綠光 G','藍光 B']);
export function validateLevels(value){if(!Array.isArray(value)||value.length!==3||!value.every(n=>LEVELS.includes(n)))throw new RangeError('RGB亮度必須各選關閉、弱或強');return value;}
export const sameColour=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===3&&b.length===3&&a.every((v,i)=>v===b[i]);
export function linearChannels(levels){return validateLevels(levels).map(n=>n/MAX_LEVEL);}
const encode=v=>Math.round(255*(v<=.0031308?12.92*v:1.055*v**(1/2.4)-.055));
export function displayChannels(levels){return linearChannels(levels).map(encode);}
export function colourCss(levels){return `rgb(${displayChannels(levels).join(', ')})`;}
export function subpixelCss(levels,index){if(!Number.isInteger(index)||index<0||index>2)throw new RangeError('色光通道不存在');return colourCss(validateLevels(levels).map((n,i)=>i===index?n:0));}
export const PALETTE=Object.freeze({N:Object.freeze([0,0,1]),O:Object.freeze([4,1,0]),C:Object.freeze([4,4,1]),K:Object.freeze([0,0,0]),G:Object.freeze([0,4,0]),P:Object.freeze([1,0,4])});
const NAMES={N:'深藍色',O:'橙色',C:'米白色',K:'黑色',G:'綠色',P:'紫色'};
export function paletteName(levels){const key=Object.keys(PALETTE).find(key=>sameColour(PALETTE[key],levels));return NAMES[key]||COLOUR_TARGETS.find(t=>sameColour(t.levels,levels))?.name||'自調色';}
export const COLOUR_TARGETS=Object.freeze([{name:'橙色',levels:PALETTE.O},{name:'黃色',levels:Object.freeze([4,4,0])},{name:'青色',levels:Object.freeze([0,4,4])},{name:'洋紅色',levels:Object.freeze([4,0,4])},{name:'紫色',levels:PALETTE.P},{name:'灰色',levels:Object.freeze([1,1,1])},{name:'粉紅色',levels:Object.freeze([4,1,1])},{name:'黃綠色',levels:Object.freeze([1,4,0])}].map(Object.freeze));
export function colourHint(current,target){
 validateLevels(current);validateLevels(target);
 if(sameColour(current,target))return{title:'顏色調對了！',message:'已加入我的色盤，補格與組圖時可以直接選用。',channel:null,direction:0};
 const names=['紅光','綠光','藍光'];
 let channel=current.findIndex((n,i)=>n>0&&target[i]===0);
 if(channel>=0)return{title:'先確認需要哪些色光',message:`這個目標不需要${names[channel]}。試著關閉${names[channel]}，再比較顏色。`,channel,direction:-1};
 channel=current.findIndex((n,i)=>n===0&&target[i]>0);
 if(channel>=0)return{title:'先確認需要哪些色光',message:`試著加入${names[channel]}，觀察是否更接近目標顏色。`,channel,direction:1};
 channel=current.findIndex((n,i)=>n!==target[i]);
 const direction=current[channel]>target[channel]?-1:1,active=names.filter((_,i)=>target[i]>0).join('和');
 return{title:'色光搭配對了，再比較強弱',message:`${target.filter(n=>n>0).length>1?active+'都需要':'需要的色光已選對'}；試著把${names[channel]}調${direction<0?'弱':'強'}，觀察是否更接近目標顏色。`,channel,direction};
}
export const REPAIR_SIZE=4,REPAIR_HOLE=6;
export const REPAIR_TARGET=Object.freeze(['NOON','OCPO','OCKO','NGGN'].join('').split('').map(key=>PALETTE[key]));
export const PICTURE_SIZE=8;
export const PICTURE_TARGET=Object.freeze(['NNNNNNNN','NONNNNON','NCONNOCN','NOOOOOON','NOOOOOON','OOKOOKOO','NCOOOOCN','NNCKKCNN'].join('').split('').map(key=>PALETTE[key]));
export const initialRepair=()=>REPAIR_TARGET.map((value,i)=>i===REPAIR_HOLE?null:[...value]);
export const blankPicture=()=>Array.from({length:PICTURE_SIZE**2},()=>null);
export function fillPixel(pixels,index,levels){validateLevels(levels);if(!Number.isInteger(index)||index<0||index>=pixels.length)throw new RangeError('像素位置不存在');return pixels.map((value,i)=>i===index?[...levels]:value&&[...value]);}
export function evaluatePixels(pixels,target){if(pixels.length!==target.length)throw new RangeError('畫布大小不一致');const missing=[],wrong=[];let filled=0,correct=0;pixels.forEach((value,i)=>{if(value===null){missing.push(i);return;}validateLevels(value);filled++;if(sameColour(value,target[i]))correct++;else wrong.push(i);});return{total:target.length,filled,correct,missing,wrong,complete:correct===target.length};}
export function coordinate(index,size){if(!Number.isInteger(index)||!Number.isInteger(size)||size<1||index<0||index>=size**2)throw new RangeError('像素位置不存在');return{row:Math.floor(index/size)+1,column:index%size+1};}
export function nextEmpty(pixels,index){for(let n=1;n<=pixels.length;n++){const i=(index+n)%pixels.length;if(pixels[i]===null)return i;}return-1;}
