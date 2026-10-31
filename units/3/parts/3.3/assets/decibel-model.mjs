// 同一份 OSHA Figure 3 的典型 dBA 參考例；圖片不是量測現場。
const entries=[
 ['study',20,'安靜書房','安靜的室內，適合專心閱讀。','安靜書房的典型參考情境。','Silent Study Room','quiet',0],
 ['nature',30,'安靜自然景點','遠離車流與人群，感受自然環境的寧靜。','來源例子：大峽谷北緣。','North Rim of Grand Cayon','quiet',1],
 ['whisper',40,'輕聲耳語','放低聲音，輕輕地說話。','相距約 1.5 公尺（來源：5 英尺）。','Soft Whisper (5 ft. away)','quiet',2],
 ['residence',50,'市區住宅環境','住宅周圍也有遠處的人聲與日常活動聲。','市區住宅環境的典型參考情境。','Urban Residence','daily',0],
 ['conversation',60,'一般交談','兩個人面對面正常交談。','相距約 0.9 公尺（來源：3 英尺）。','Conversation (3 ft. away)','daily',1],
 ['classroom',70,'教室裡多人交談','好幾組同學同時討論，人聲交織在一起。','教室中多人交談的典型參考情境。','Classroom Chatter','daily',2],
 ['train',80,'貨運列車經過','長長的貨運列車行駛，傳來輪軌與引擎聲。','相距約 30 公尺（來源：100 英尺）。','Freight Train (100 ft. away)','work',0],
 ['boiler',90,'鍋爐房設備運轉','大型鍋爐及相關設備在室內持續運作。','鍋爐房的典型參考情境。','Boiler Room','work',1],
 ['construction',100,'施工現場','施工機具運轉，傳來敲擊與鑽鑿聲。','施工中的工地；聲級會隨作業改變。','Construction Site','work',2],
 ['club',110,'舞廳播放音樂','大型音響播放音樂的室內舞廳。','來源例子：播放音樂的夜店／舞廳。','Night Club (w/ music)','loud',0],
 ['equipment',120,'重型機具運作','大型施工機械運作，發出強烈的機械聲。','重型機具運作的典型參考情境。','Operating Heavy Equipment','loud',1],
 ['jet',130,'噴射機起飛','噴射機加速離開跑道，引擎聲十分強烈。','相距約 60 公尺（來源：200 英尺）。','Jet Taking Off (200 ft. away)','loud',2]
];
export const DECIBEL_MIN=20,DECIBEL_MAX=130;
export const DECIBEL_SCENES=Object.freeze(entries.map(([key,db,title,intro,condition,sourceLabel,sheet,panel])=>Object.freeze({key,db,title,intro,condition,sourceLabel,image:`decibel-${sheet}.png`,viewBox:`0 ${panel*512} 1024 512`,y:panel*512})));
export const clampDecibel=value=>Math.min(DECIBEL_MAX,Math.max(DECIBEL_MIN,Math.round(Number(value)||DECIBEL_MIN)));
export const decibelAt=fraction=>clampDecibel(DECIBEL_MIN+fraction*(DECIBEL_MAX-DECIBEL_MIN));
export const nearestScene=value=>DECIBEL_SCENES[Math.round((clampDecibel(value)-DECIBEL_MIN)/10)];
