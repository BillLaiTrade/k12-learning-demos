// An ideal RGB display: each level is a normalized channel-light control value.
export const MAX_LEVEL=4;
export const CHANNELS=Object.freeze(['紅光 R','綠光 G','藍光 B']);
export function validateLevels(value){if(!Array.isArray(value)||value.length!==3||!value.every(n=>Number.isInteger(n)&&n>=0&&n<=MAX_LEVEL))throw new RangeError('RGB級數必須是三個0～4的整數');return value;}
export const sameColour=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===3&&b.length===3&&a.every((v,i)=>v===b[i]);
export function linearChannels(levels){return validateLevels(levels).map(n=>n/MAX_LEVEL);}
const encode=v=>Math.round(255*(v<=.0031308?12.92*v:1.055*v**(1/2.4)-.055));
export function displayChannels(levels){return linearChannels(levels).map(encode);}
export function colourCss(levels){return `rgb(${displayChannels(levels).join(', ')})`;}
export function subpixelCss(levels,index){if(!Number.isInteger(index)||index<0||index>2)throw new RangeError('色光通道不存在');return colourCss(validateLevels(levels).map((n,i)=>i===index?n:0));}
export const PALETTE=Object.freeze({N:Object.freeze([0,0,1]),O:Object.freeze([4,1,0]),C:Object.freeze([4,4,3]),K:Object.freeze([0,0,0]),G:Object.freeze([0,2,0])});
const NAMES={N:'深藍色',O:'橙色',C:'米白色',K:'黑色',G:'綠色'};
export function paletteName(levels){const key=Object.keys(PALETTE).find(key=>sameColour(PALETTE[key],levels));return NAMES[key]||'自調色';}
export const COLOUR_TARGETS=Object.freeze([{name:'橙色',levels:PALETTE.O},{name:'紫色',levels:Object.freeze([2,0,4])},{name:'青色',levels:Object.freeze([0,3,4])},{name:'灰色',levels:Object.freeze([2,2,2])},{name:'粉紅色',levels:Object.freeze([4,1,3])},{name:'黃綠色',levels:Object.freeze([1,4,0])}].map(Object.freeze));
export const REPAIR_SIZE=4,REPAIR_HOLE=6;
export const REPAIR_TARGET=Object.freeze(['NOON','OCOO','OCKO','NGGN'].join('').split('').map(key=>PALETTE[key]));
export const PICTURE_SIZE=8;
export const PICTURE_TARGET=Object.freeze(['NNNNNNNN','NONNNNON','NCONNOCN','NOOOOOON','NOOOOOON','OOKOOKOO','NCOOOOCN','NNCKKCNN'].join('').split('').map(key=>PALETTE[key]));
export const initialRepair=()=>REPAIR_TARGET.map((value,i)=>i===REPAIR_HOLE?null:[...value]);
export const blankPicture=()=>Array.from({length:PICTURE_SIZE**2},()=>null);
export function fillPixel(pixels,index,levels){validateLevels(levels);if(!Number.isInteger(index)||index<0||index>=pixels.length)throw new RangeError('像素位置不存在');return pixels.map((value,i)=>i===index?[...levels]:value&&[...value]);}
export function evaluatePixels(pixels,target){if(pixels.length!==target.length)throw new RangeError('畫布大小不一致');const missing=[],wrong=[];let filled=0,correct=0;pixels.forEach((value,i)=>{if(value===null){missing.push(i);return;}validateLevels(value);filled++;if(sameColour(value,target[i]))correct++;else wrong.push(i);});return{total:target.length,filled,correct,missing,wrong,complete:correct===target.length};}
export function coordinate(index,size){if(!Number.isInteger(index)||!Number.isInteger(size)||size<1||index<0||index>=size**2)throw new RangeError('像素位置不存在');return{row:Math.floor(index/size)+1,column:index%size+1};}
export function nextEmpty(pixels,index){for(let n=1;n<=pixels.length;n++){const i=(index+n)%pixels.length;if(pixels[i]===null)return i;}return-1;}
