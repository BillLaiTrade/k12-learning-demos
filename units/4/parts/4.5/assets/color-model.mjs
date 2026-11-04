// Optical conditions are shared by the apparatus, receiver and explanations.
export const LIGHTS={white:{name:'白光',rgb:[1,1,1]},red:{name:'紅光',rgb:[1,0,0]},green:{name:'綠光',rgb:[0,1,0]},blue:{name:'藍光',rgb:[0,0,1]}};
export const MATERIALS={red:{name:'紅色色卡',rgb:[.88,.012,.012],css:'#c54c42'},green:{name:'綠色色卡',rgb:[.02,.82,.025],css:'#4c9d69'},blue:{name:'藍色色卡',rgb:[.014,.025,.88],css:'#467fc1'},white:{name:'白色色卡',rgb:[.9,.9,.9],css:'#eceee9'},black:{name:'黑色色卡',rgb:[.012,.012,.012],css:'#26302e'}};
export const FILTERS={clear:{name:'無色片',rgb:[1,1,1],css:'#edf6f4'},red:{name:'紅色色片',rgb:[.86,.006,.003],css:'#e94745'},green:{name:'綠色色片',rgb:[.008,.82,.012],css:'#37ac76'},blue:{name:'藍色色片',rgb:[.003,.015,.86],css:'#497fe0'}};
export const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
export function linearToSrgb(n){n=clamp(n);return n<=.0031308?12.92*n:1.055*n**(1/2.4)-.055;}
export function rgbCss(rgb){return `rgb(${rgb.map(c=>Math.round(linearToSrgb(c)*255)).join(' ')})`;}
export function addLight(...values){return [0,1,2].map(i=>clamp(values.reduce((s,v)=>s+v[i],0)));}
export function materialLight(light,material){const incoming=[...LIGHTS[light].rgb],response=MATERIALS[material].rgb;const outgoing=incoming.map((c,i)=>c*response[i]);return{incoming,outgoing,absorbed:incoming.map((c,i)=>c-outgoing[i])};}
export function filterLight(light,filter){const incoming=[...LIGHTS[light].rgb],response=FILTERS[filter].rgb;const outgoing=incoming.map((c,i)=>c*response[i]);return{incoming,outgoing,absorbed:incoming.map((c,i)=>c-outgoing[i])};}
export function eyeLight(mode,blocked){const signal=mode==='reflection'?materialLight('white','green'):filterLight('white','green');return{...signal,received:blocked?[0,0,0]:[...signal.outgoing]};}
export function colorName(rgb){
 const top=Math.max(...rgb);if(top<.045)return '很暗，接近黑色';
 const [r,g,b]=rgb.map(v=>v/top>.35);
 if(r&&g&&b)return '白色';if(r&&g)return '黃色';if(g&&b)return '青色';if(r&&b)return '洋紅色';return r?'紅色':g?'綠色':'藍色';
}
export function mixAt(x,y,spots,radius=.16){
 const weights=spots.map(s=>{if(!s.on)return 0;const d=Math.hypot(x-s.x,(y-s.y)*360/610)/radius;return d>=1?0:clamp((1-d)/.12);});
 return addLight(...weights.map((v,i)=>[0,1,2].map(c=>c===i?v:0)));
}
export const DEFAULT_SPOTS=[{x:.24,y:.30,on:true},{x:.76,y:.30,on:true},{x:.50,y:.72,on:true}];
export function mixPreset(kind){
 const positions=kind==='together'?[[.5,.5],[.5,.5],[.5,.5]]:kind==='pairs'?[[.37,.40],[.62,.40],[.50,.62]]:DEFAULT_SPOTS.map(s=>[s.x,s.y]);
 return positions.map(([x,y])=>({x,y,on:true}));
}

// A real triangular cross section in the horizontal plane, fixed at a valid
// near-minimum-deviation orientation. Cauchy dispersion is qualitative glass.
const rotation=-19.5*Math.PI/180;
export const PRISM=Object.freeze([[-.8,-.462],[.8,-.462],[0,.924]].map(([x,z])=>[x*Math.cos(rotation)-z*Math.sin(rotation),x*Math.sin(rotation)+z*Math.cos(rotation)]));
export const SOURCE=[-3.3,0],SCREEN_X=3.4,SCREEN_RANGE=[-3.8,.9];
const cross=(a,b)=>a[0]*b[1]-a[1]*b[0];
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1]];
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1];
const norm=a=>{const n=Math.hypot(...a);return a.map(v=>v/n);};
function intersect(origin,direction,skip=-1){
 let hit=null;
 for(let i=0;i<3;i++){
  if(i===skip)continue;const a=PRISM[i],b=PRISM[(i+1)%3],edge=sub(b,a),den=cross(direction,edge);if(Math.abs(den)<1e-10)continue;
  const q=sub(a,origin),t=cross(q,edge)/den,u=cross(q,direction)/den;
  if(t>1e-6&&u>=-1e-7&&u<=1+1e-7&&(!hit||t<hit.t))hit={point:[origin[0]+t*direction[0],origin[1]+t*direction[1]],edge:i,normal:norm([edge[1],-edge[0]]),t};
 }return hit;
}
export function refract(direction,normal,n1,n2){
 let N=normal;if(dot(direction,N)>0)N=N.map(v=>-v);
 const cos=-dot(direction,N),eta=n1/n2,k=1-eta*eta*(1-cos*cos);if(k<0)return null;
 return norm(direction.map((v,i)=>eta*v+(eta*cos-Math.sqrt(k))*N[i]));
}
export function glassIndex(wavelength){const microns=clamp(wavelength,380,780)/1000;return 1.498+.006/(microns*microns);}
export function prismTrace(wavelength=550,inserted=true){
 const from=[...SOURCE];if(!inserted)return{wavelength,points:[from,[SCREEN_X,0]],landing:0,deviation:0};
 const direction=[1,0],first=intersect(from,direction);if(!first)throw Error('Prism entrance is missing');
 const inside=refract(direction,first.normal,1,glassIndex(wavelength));if(!inside)throw Error('Invalid entry');
 const second=intersect(first.point,inside,first.edge);if(!second)throw Error('Prism exit is missing');
 const out=refract(inside,second.normal,glassIndex(wavelength),1);if(!out||out[0]<=0)throw Error('Invalid exit for the fixed teaching arrangement');
 const t=(SCREEN_X-second.point[0])/out[0],end=[SCREEN_X,second.point[1]+out[1]*t];
 return{wavelength,points:[from,first.point,second.point,end],landing:end[1],deviation:Math.abs(Math.atan2(out[1],out[0])),inside,out};
}
export function wavelengthRgb(w){
 let r=0,g=0,b=0;
 if(w<440){r=(440-w)/60;b=1;}else if(w<490){g=(w-440)/50;b=1;}else if(w<510){g=1;b=(510-w)/20;}else if(w<580){r=(w-510)/70;g=1;}else if(w<645){r=1;g=(645-w)/65;}else r=1;
 const edge=w<420?.35+.65*(w-380)/40:w>700?.35+.65*(780-w)/80:1;
 return[r,g,b].map(v=>clamp(v)*clamp(edge));
}
export function prismRays(light='white',inserted=true){
 const wavelengths=light==='white'?Array.from({length:73},(_,i)=>380+i*5):[light==='red'?650:light==='green'?530:460];
 return wavelengths.map(w=>({...prismTrace(w,inserted),rgb:wavelengthRgb(w)}));
}
export function channelsText(rgb){return ['紅','綠','藍'].filter((_,i)=>rgb[i]>.045).join('、')||'極少量可見光';}

export const QUIZ=[
 {id:'prism',question:'白光通過三稜鏡，在白幕上出現色帶。哪個解釋較合理？',options:['三稜鏡製造了白光中原本沒有的顏色。','白光原本包含不同色光，通過三稜鏡時分開了。','三稜鏡把光染成了玻璃的顏色。'],answer:1,explanation:'三稜鏡讓不同色光偏折的程度不同，形成色帶；色光不是由玻璃憑空製造。',anchor:'s2'},
 {id:'mix',question:'白幕上同時收到紅光與綠光，重疊區看起來呈黃色。這代表什麼？',options:['紅光和綠光進入眼睛，形成黃色的視覺感受。','紅色和綠色顏料攪在一起一定也會變黃色。','兩束光都已經變成同一種黃色光，原有色光消失了。'],answer:0,explanation:'這是色光的疊加。紅、綠色光仍存在，混看可呈黃色，不能直接套用顏料混合的規則。',anchor:'s3'},
 {id:'surface',question:'這片紅色色卡在白光下呈紅色；改用只有綠光的照明後變得很暗。為什麼？',options:['物體只要是紅色，就會自己發出紅光。','綠光把色卡的材料變成黑色了。','照明裡缺少它主要反射的紅光，而它對綠光的反射很少。'],answer:2,explanation:'照明缺少紅光，而色卡對綠光反射很少，進入眼睛的光也少，因此看起來很暗；材料沒有因換燈而改變。',anchor:'s4'},
 {id:'filter',question:'白光穿過綠色色片照到白紙，白紙看起來是綠色。哪個說法較合理？',options:['色片把所有其他色光都變成綠光。','色片主要讓綠光通過，再由白紙反射進入眼睛。','只要材料透明，所有色光就會原樣通過。'],answer:1,explanation:'色片選擇性地透射與吸收色光；透過的光照到紙張，再反射進入眼睛，並非色片新製造了綠光。',anchor:'s5'}
];
