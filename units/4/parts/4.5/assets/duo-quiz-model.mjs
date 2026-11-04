import {LIGHTS,MATERIALS,FILTERS} from './color-model.mjs';
import {SOURCE_LINEAR} from './mix-optics.mjs';

export const PROBE_SETUP=Object.freeze({width:1000,height:400,radius:140,edge:.07});
export const PRIMARY_KEYS=Object.freeze(['red','green','blue']);
export const PAPER_TYPES=Object.freeze({
 red:{name:'紅紙',rgb:MATERIALS.red.rgb,css:'#c54c42'},green:{name:'綠紙',rgb:MATERIALS.green.rgb,css:'#4c9d69'},blue:{name:'藍紙',rgb:MATERIALS.blue.rgb,css:'#467fc1'},
 yellow:{name:'黃紙',rgb:[.88,.82,.012],css:'#d2b747'},cyan:{name:'青紙',rgb:[.014,.82,.88],css:'#449f9e'},magenta:{name:'洋紅紙',rgb:[.88,.012,.88],css:'#b85c98'},
 white:{name:'白紙',rgb:MATERIALS.white.rgb,css:'#eceee9'},black:{name:'黑紙',rgb:MATERIALS.black.rgb,css:'#26302e'}
});
export const COLOUR_OPTIONS=Object.freeze([['white','白色','#e5e7df'],['red','紅色','#df6256'],['green','綠色','#4d9e69'],['blue','藍色','#5281cc'],['yellow','黃色','#d7b73d'],['cyan','青色','#4ca8a6'],['magenta','洋紅色','#bb62a0'],['dark','很暗','#26302e']]);
export const TRANSMISSION_OPTIONS=Object.freeze([['red','紅光'],['green','綠光'],['blue','藍光'],['yellow','紅、綠光'],['cyan','綠、藍光'],['magenta','紅、藍光']]);
export const REFLECTION_OPTIONS=Object.freeze([['much','較多被反射'],['some','只有部分較多被反射'],['little','反射很少']]);
const MASK_COLOURS={1:'red',2:'green',4:'blue',3:'yellow',6:'cyan',5:'magenta',7:'white',0:'dark'};
export const INITIAL_QUESTION=Object.freeze({id:'red-green/green/red',lights:['red','green'],filter:'green',paper:'red'});
export const QUESTION_BANK=Object.freeze([['red','green'],['red','blue'],['green','blue']].flatMap(lights=>['clear',...lights].flatMap(filter=>Object.keys(PAPER_TYPES).map(paper=>Object.freeze({id:`${lights.join('-')}/${filter}/${paper}`,lights:[...lights],filter,paper})))));

// Add the two source components before the filter and paper select from them.
// This is the same qualitative three-channel response used in lessons 4 and 5.
export function challengeSignal(question){
 const incoming=[0,1,2].map(i=>question.lights.reduce((n,key)=>n+LIGHTS[key].rgb[i],0));
 const transmitted=incoming.map((v,i)=>v*FILTERS[question.filter].rgb[i]);
 const outgoing=transmitted.map((v,i)=>v*PAPER_TYPES[question.paper].rgb[i]);
 return{incoming,transmitted,outgoing,filterAbsorbed:incoming.map((v,i)=>v-transmitted[i]),paperAbsorbed:transmitted.map((v,i)=>v-outgoing[i])};
}
export function colourKey(rgb){
 const peak=Math.max(...rgb);if(peak<.045)return'dark';
 return MASK_COLOURS[rgb.reduce((mask,v,i)=>mask|(v/peak>.35?1<<i:0),0)];
}
export function expectedAnswer(question){
 const s=challengeSignal(question),ratio=s.outgoing.reduce((a,b)=>a+b,0)/s.transmitted.reduce((a,b)=>a+b,0);
 return{colour:colourKey(s.outgoing),transmission:colourKey(s.transmitted),reflection:ratio<.045?'little':ratio>=.65?'much':'some'};
}
export function checkPrediction(question,answer){
 const expected=expectedAnswer(question),missing=Object.keys(expected).filter(key=>!answer[key]);
 return{missing,fields:Object.fromEntries(Object.keys(expected).map(key=>[key,answer[key]===expected[key]])),correct:!missing.length&&Object.keys(expected).every(key=>answer[key]===expected[key])};
}
export function shuffledQuestions(random=Math.random){
 const deck=[...QUESTION_BANK];for(let i=deck.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}return deck;
}
export function probeLinear(x,y,lamps){
 const weights=lamps.map(spot=>Math.max(0,Math.min(1,(1-Math.hypot((x-spot.x)*PROBE_SETUP.width,(y-spot.y)*PROBE_SETUP.height)/PROBE_SETUP.radius)/PROBE_SETUP.edge)));
 return [0,1,2].map(c=>lamps.reduce((v,spot,i)=>v+weights[i]*SOURCE_LINEAR[PRIMARY_KEYS.indexOf(spot.colour)][c],0));
}
// Every ray from either lamp to any paper corner crosses the full filter pane.
export const CHALLENGE_LAYOUT=Object.freeze({sources:[[-3,1.65,-.7],[-3,1.65,.7]],filterX:0,paperX:2.5,halfWidth:.9,halfHeight:.9,axis:1.65});
export function filterIntersection(from,to){const t=(CHALLENGE_LAYOUT.filterX-from[0])/(to[0]-from[0]);return from.map((v,i)=>v+t*(to[i]-v));}
