// All numeric observations are teaching models, not experimental recordings.
export const HEAT={melt:16700, warm:41800, vapor:226000, total:284500};
export const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
export function heating(energy){
 const e=clamp(energy,0,HEAT.total);
 if(e<HEAT.melt)return {temperature:0,ice:50*(1-e/HEAT.melt),water:50+50*e/HEAT.melt,vapor:0,phase:'融冰中',energy:e};
 if(e<HEAT.melt+HEAT.warm)return {temperature:100*(e-HEAT.melt)/HEAT.warm,ice:0,water:100,vapor:0,phase:'液態水升溫',energy:e};
 const vapor=100*(e-HEAT.melt-HEAT.warm)/HEAT.vapor;
 return {temperature:vapor>=100?null:100,ice:0,water:100-vapor,vapor,phase:vapor>=100?'液態水已全部汽化':'沸騰中',energy:e};
}
export const ballDiameter=t=>30*(1+17e-6*(t-20));
export const ringDiameter=30.02;
export const ballPasses=t=>ballDiameter(t)<ringDiameter;
// Fresh water density (kg/m³), 0–60°C, atmospheric pressure empirical approximation.
export function waterDensity(t){return 1000*(1-((t+288.9414)/(508929.2*(t+68.12963)))*(t-3.9863)**2);}
export const waterVolume=(t,mass=100)=>mass/(waterDensity(t)/1000);
export const gasVolume=t=>100*(t+273.15)/293.15;
export function thermometer(t){
 const initial=waterVolume(20),water=waterVolume(t)-initial;
 const glass=initial*27e-6*(t-20); // representative glass, volume coefficient
 const extra=water-glass,area=.05; // 5 mm² capillary
 return {water,glass,extra,height:extra/area}; // mL; cm
}
export const PHASES={
 melt:{name:'融冰',before:'冰',after:'水',sample:'杯中的冰',environment:'40°C 暖水浴',temperature:'約 0°C',direction:'in',explanation:'冰從較暖的水浴吸熱，逐漸熔化成水。'},
 freeze:{name:'結冰',before:'水',after:'冰',sample:'杯中的水',environment:'−10°C 冷源',temperature:'約 0°C',direction:'out',explanation:'水向低於0°C的冷源放熱，逐漸凝固成冰。'},
 evaporate:{name:'室溫蒸發',before:'水',after:'水蒸氣',sample:'液面上的水',environment:'室溫環境持續供熱',temperature:'室溫示意',direction:'in',explanation:'水在未沸騰時也能汽化；蒸發需要吸熱。此例由環境補充能量，不套用100°C沸騰平台。'},
 condense:{name:'冷杯外水珠',before:'水蒸氣',after:'水',sample:'杯外的水蒸氣',environment:'較冷的杯壁',temperature:'杯壁約 10°C',direction:'out',explanation:'周圍水蒸氣遇冷凝結，把能量傳給杯壁。外壁水珠來自空氣，並非杯內水滲出。'}
};
export const REACTIONS={
 dehydrate:{title:'加熱含水硫酸銅',before:'含水硫酸銅（藍色晶體）',after:'無水硫酸銅＋水',direction:'in',evidence:'受熱後留下無水硫酸銅，水以蒸氣離開、可在冷處凝結。產物身分不同，這是化學變化。',result:'此脫水反應吸熱：能量由熱源傳入反應系統。'},
 hydrate:{title:'無水硫酸銅與少量水反應',before:'無水硫酸銅＋水',after:'含水硫酸銅',direction:'out',evidence:'冷卻後的無水硫酸銅與少量水反應，生成含水硫酸銅；觀察到反應系統向周圍放熱。',result:'此水合反應放熱：能量由反應系統傳向周圍。'}
};
export const QUIZ=[
 {title:'一杯冰水持續吸熱，冰仍未融完',evidence:'正常大氣壓下的純水；溫度約0°C，冰塊正在變小。',options:['吸熱一定使溫度上升，溫度計壞了。','能量正用於熔化，吸熱時溫度可以幾乎不變。','冰正在向較暖的環境放熱。'],answer:1,reason:'冰水共存的熔化期間，熱傳入樣品，狀態改變但溫度約保持0°C。'},
 {title:'冷水瓶外壁出現小水珠',evidence:'瓶壁完整；室內空氣較暖，外壁較冷。',options:['空氣中的水蒸氣凝結，向較冷瓶壁放熱。','瓶內水穿過完整瓶壁，出現在外側。','水蒸氣吸熱後變成水珠。'],answer:0,reason:'水珠來自周圍水蒸氣，凝結是放熱的狀態變化。'},
 {title:'封住固定量空氣，活塞能自由移動',evidence:'外壓近似不變，空氣從20°C升至60°C，沒有漏氣或加入氣體。',options:['空氣分子數增加，推動活塞。','固定氣體量時體積一定不變。','氣體受熱膨脹，活塞向外移。'],answer:2,reason:'固定量氣體在近似定壓下升溫可膨脹；並非產生更多氣體。'},
 {title:'同一份液態水從0°C升到4°C',evidence:'沒有結冰、蒸發或加入水，水的質量相同。',options:['水的體積減少，密度增加。','水的體積增加，密度減少。','水已經發生化學反應。'],answer:0,reason:'水在約0～4°C有反常脹縮，約4°C體積最小、密度最大；這和結冰膨脹是不同過程。'},
 {title:'簡易水溫度計放進暖水中',evidence:'已達熱平衡；水和玻璃都膨脹，水增加的體積比容器增加的容量多。',options:['玻璃完全不會膨脹，所以液面升高。','多出的水進入細管，使液柱上升。','加熱製造更多水，推高液柱。'],answer:1,reason:'相對膨脹的差額進入細管；固定水量不等於固定體積。'},
 {title:'無水硫酸銅與少量水反應',evidence:'已確認生成含水硫酸銅；反應沒有持續外加熱，卻向周圍釋出能量。',options:['只是顏色不同，沒有物質身分改變。','此反應必須從周圍持續吸熱。','生成新物質，且這個反應放熱。'],answer:2,reason:'物質身分證據支持化學變化，能量傳向周圍支持放熱；判斷不只靠顏色。'}
];
export function grade(answers){return QUIZ.map((q,i)=>({complete:Number.isInteger(answers[i])&&answers[i]>=0&&answers[i]<q.options.length,correct:answers[i]===q.answer}));}
