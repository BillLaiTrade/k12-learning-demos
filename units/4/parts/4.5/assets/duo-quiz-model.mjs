import {MATERIALS,FILTERS} from './color-model.mjs';
import {MIX_SETUP,SOURCE_LINEAR} from './mix-optics.mjs';

export const PROBE_SETUP=MIX_SETUP;
export const PRIMARY_KEYS=Object.freeze(['red','green','blue']);
export const SECONDARY_KEYS=Object.freeze(['yellow','cyan','magenta']);
const sourceDefinitions=[['red','紅光',1,'#b82b29','#ff8072',0],['green','綠光',2,'#278541','#8bedaa',1],['blue','藍光',4,'#2457b7','#a5caff',2],['yellow','黃光',3,'#cfb32d','#ffe570',0],['cyan','青光',6,'#2f979b','#6de6f0',0],['magenta','洋紅光',5,'#bb4a9b','#ff8ce1',0],['white','白光',7,'#dde6df','#eef7ff',0]];
export const DUO_LIGHTS=Object.freeze(Object.fromEntries(sourceDefinitions.map(([key,name,mask,band,guide,torchIndex])=>[key,Object.freeze({name,rgb:Object.freeze([1,2,4].map(bit=>Number(!!(mask&bit)))),components:Object.freeze(PRIMARY_KEYS.filter((_,i)=>mask&(1<<i))),band,guide,torchIndex})])));
export const PROBE_LINEAR=Object.freeze(Object.fromEntries(Object.entries(DUO_LIGHTS).map(([key,light])=>[key,Object.freeze([0,1,2].map(c=>light.rgb.reduce((sum,n,i)=>sum+n*SOURCE_LINEAR[i][c],0)))])));
export const DUO_FILTERS=Object.freeze({...FILTERS,yellow:Object.freeze({name:'黃色色片',rgb:Object.freeze([.84,.84,.006]),css:'#ddc33e'}),cyan:Object.freeze({name:'青色色片',rgb:Object.freeze([.006,.84,.84]),css:'#39b3b7'}),magenta:Object.freeze({name:'洋紅色色片',rgb:Object.freeze([.84,.006,.84]),css:'#c45aa5'})});
export function lightComponents(key){return DUO_LIGHTS[key].components.map(c=>DUO_LIGHTS[c].name).join('＋');}
// Describe the displayed swatch, including unequal mixtures available in free probing.
export function probeColourName([r,g,b]){const high=Math.max(r,g,b),low=Math.min(r,g,b),delta=high-low;if(high<32)return'很暗';if(delta<24)return low>230?'白色':'灰色';let hue=high===r?((g-b)/delta+6)%6:high===g?(b-r)/delta+2:(r-g)/delta+4;hue*=60;return hue<15||hue>=345?'紅色':hue<45?'橙色':hue<70?'黃色':hue<165?'綠色':hue<195?'青色':hue<265?'藍色':hue<295?'紫色':'洋紅色';}
export const QUESTION_FOCUS=Object.freeze(['辨認複合色光與彩色紙','與第1題比較：只換色片','觀察複合色片保留的色光','與第3題比較：只換紙張','綜合比較光源、色片與紙張','判斷白光經色片後的反射']);

export const PAPER_TYPES=Object.freeze({
 red:{name:'紅紙',rgb:MATERIALS.red.rgb,css:'#c54c42'},green:{name:'綠紙',rgb:MATERIALS.green.rgb,css:'#4c9d69'},blue:{name:'藍紙',rgb:MATERIALS.blue.rgb,css:'#467fc1'},
 yellow:{name:'黃紙',rgb:[.88,.82,.012],css:'#d2b747'},cyan:{name:'青紙',rgb:[.014,.82,.88],css:'#449f9e'},magenta:{name:'洋紅紙',rgb:[.88,.012,.88],css:'#b85c98'},
 white:{name:'白紙',rgb:MATERIALS.white.rgb,css:'#eceee9'},black:{name:'黑紙',rgb:MATERIALS.black.rgb,css:'#26302e'}
});
export const COLOUR_OPTIONS=Object.freeze([['white','白色','#e5e7df'],['red','紅色','#df6256'],['green','綠色','#4d9e69'],['blue','藍色','#5281cc'],['yellow','黃色','#d7b73d'],['cyan','青色','#4ca8a6'],['magenta','洋紅色','#bb62a0'],['dark','很暗','#26302e']]);
export const TRANSMISSION_OPTIONS=Object.freeze([['red','紅光'],['green','綠光'],['blue','藍光'],['yellow','紅、綠光'],['cyan','綠、藍光'],['magenta','紅、藍光'],['white','紅、綠、藍光（白光）']]);
export const REFLECTION_OPTIONS=Object.freeze([['much','較多被反射'],['some','只有部分較多被反射'],['little','反射很少']]);
const MASK_COLOURS={1:'red',2:'green',4:'blue',3:'yellow',6:'cyan',5:'magenta',7:'white',0:'dark'};
export const INITIAL_QUESTION=Object.freeze({id:'red-green/green/red',lights:['red','green'],filter:'green',paper:'red'});
const LIGHT_PAIRS=Object.freeze([['red','green'],['red','blue'],['green','blue'],['yellow','yellow'],['cyan','cyan'],['magenta','magenta'],['yellow','blue'],['cyan','red'],['magenta','green'],['white','white']]);
export const QUESTION_BANK=Object.freeze(LIGHT_PAIRS.flatMap(lights=>Object.keys(DUO_FILTERS).filter(filter=>filter==='clear'||DUO_FILTERS[filter].rgb.some((v,c)=>v>.5&&lights.some(key=>DUO_LIGHTS[key].rgb[c]))).flatMap(filter=>Object.keys(PAPER_TYPES).map(paper=>Object.freeze({id:`${lights.join('-')}/${filter}/${paper}`,lights:Object.freeze([...lights]),filter,paper})))));
export const INITIAL_SERIES=Object.freeze(['yellow-yellow/clear/yellow','yellow-yellow/cyan/yellow','cyan-red/magenta/white','cyan-red/magenta/yellow','magenta-green/yellow/green','white-white/cyan/red'].map(id=>QUESTION_BANK.find(q=>q.id===id)));
export function newQuestionSeries(random=Math.random,previous=[]){
 const used=new Set(previous.map(q=>q.id));
 const pick=pool=>{const fresh=pool.filter(q=>!used.has(q.id)),options=fresh.length?fresh:pool;if(!options.length)throw new Error('沒有符合教學焦點的題目');const q=options[Math.min(options.length-1,Math.floor(random()*options.length))];used.add(q.id);return q;};
 const first=pick(QUESTION_BANK.filter(q=>SECONDARY_KEYS.includes(q.lights[0])&&q.lights[0]===q.lights[1]&&q.filter==='clear'&&q.paper===q.lights[0]));
 const second=pick(QUESTION_BANK.filter(q=>q.lights.join()===first.lights.join()&&q.paper===first.paper&&SECONDARY_KEYS.includes(q.filter)&&q.filter!==first.lights[0]));
 const third=pick(QUESTION_BANK.filter(q=>SECONDARY_KEYS.includes(q.lights[0])&&q.lights[0]!==q.lights[1]&&q.lights[0]!==first.lights[0]&&SECONDARY_KEYS.includes(q.filter)&&q.filter!==second.filter&&q.paper==='white'));
 const fourth=pick(QUESTION_BANK.filter(q=>q.lights.join()===third.lights.join()&&q.filter===third.filter&&q.paper!=='white'&&expectedAnswer(q).reflection==='some'));
 const remainingSource=SECONDARY_KEYS.find(key=>key!==first.lights[0]&&key!==third.lights[0]),remainingFilter=SECONDARY_KEYS.find(key=>key!==second.filter&&key!==third.filter);
 const fifth=pick(QUESTION_BANK.filter(q=>q.lights[0]===remainingSource&&q.lights[0]!==q.lights[1]&&q.filter===remainingFilter&&PRIMARY_KEYS.includes(q.paper)&&expectedAnswer(q).reflection==='some'));
 const sixth=pick(QUESTION_BANK.filter(q=>q.lights[0]==='white'&&SECONDARY_KEYS.includes(q.filter)&&expectedAnswer(q).reflection==='little'));
 return[first,second,third,fourth,fifth,sixth];
}

// Add the two source components before the filter and paper select from them.
// This is the same qualitative three-channel response used in lessons 4 and 5.
export function challengeSignal(question){
 const incoming=[0,1,2].map(i=>question.lights.reduce((n,key)=>n+DUO_LIGHTS[key].rgb[i],0));
 const transmitted=incoming.map((v,i)=>v*DUO_FILTERS[question.filter].rgb[i]);
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
 const weights=lamps.map(spot=>spot.on===false?0:Math.max(0,Math.min(1,(1-Math.hypot((x-spot.x)*PROBE_SETUP.width,(y-spot.y)*PROBE_SETUP.height)/PROBE_SETUP.radius)/PROBE_SETUP.edge)));
 return [0,1,2].map(c=>lamps.reduce((v,spot,i)=>v+weights[i]*PROBE_LINEAR[spot.colour][c],0));
}
// Every ray from either lamp to any paper corner crosses the full filter pane.
export const CHALLENGE_LAYOUT=Object.freeze({sources:[[-3,1.65,-.7],[-3,1.65,.7]],filterX:0,paperX:2.5,halfWidth:.9,halfHeight:.9,axis:1.65});
export function filterIntersection(from,to){const t=(CHALLENGE_LAYOUT.filterX-from[0])/(to[0]-from[0]);return from.map((v,i)=>v+t*(to[i]-v));}
