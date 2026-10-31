export const TIMBRE_KEYS=Object.freeze(['pure','string','pipe']);
export const WAVE_START=.2,WAVE_SECONDS=.01;
// 全部使用同一個±0.6的數位訊號視窗；沒有逐樂器縮放。
export const WAVE_PLOT=Object.freeze({left:52,right:552,zero:80,scale:64/.6});

// 最終發行檔為單聲道16-bit PCM。預設圖與AudioBuffer共用解析後的Float32Array。
export function decodePCM(bytes){
 const v=new DataView(bytes),word=i=>String.fromCharCode(...new Uint8Array(bytes,i,4));
 if(v.byteLength<44||word(0)!=='RIFF'||word(8)!=='WAVE')throw Error('Invalid WAV');
 let rate,channels,bits,format,data,length;
 for(let i=12;i+8<=v.byteLength;){
  const size=v.getUint32(i+4,true),end=i+8+size;if(end>v.byteLength)throw Error('Truncated WAV');
  if(word(i)==='fmt '&&size>=16){format=v.getUint16(i+8,true);channels=v.getUint16(i+10,true);rate=v.getUint32(i+12,true);bits=v.getUint16(i+22,true);}
  if(word(i)==='data'){data=i+8;length=size;}
  i=end+(size%2);
 }
 if(format!==1||channels!==1||bits!==16||!rate||data===undefined||length%2||length/rate/2<WAVE_START+WAVE_SECONDS)throw Error('Unsupported WAV');
 const samples=new Float32Array(length/2);
 for(let i=0;i<samples.length;i++)samples[i]=v.getInt16(data+2*i,true)/32768;
 return {samples,rate};
}

export function waveformPath({samples,rate}){
 const {left,right,zero,scale}=WAVE_PLOT;
 // 逐一畫出時間窗內每一個原始PCM取樣點，不抽取假週期，也不逐列正規化。
 const first=Math.ceil(WAVE_START*rate),last=Math.floor((WAVE_START+WAVE_SECONDS)*rate);
 const points=[];
 for(let i=first;i<=last;i++){
  const x=left+(i/rate-WAVE_START)/WAVE_SECONDS*(right-left),y=zero-scale*samples[i];
  points.push(`${points.length?'L':'M'}${x.toFixed(5)} ${y.toFixed(5)}`);
 }
 return points.join(' ');
}

const cache=new Map();
export function loadTimbreClip(key){
 if(!TIMBRE_KEYS.includes(key))return Promise.reject(Error('Invalid timbre'));
 if(!cache.has(key))cache.set(key,(async()=>{
  const response=await fetch(new URL(`./timbre-audio/${key}.wav?v=1`,import.meta.url));
  if(!response.ok)throw Error('Timbre unavailable');
  return decodePCM(await response.arrayBuffer());
 })().catch(error=>{cache.delete(key);throw error;}));
 return cache.get(key);
}

export function timbreBuffer(clip,context){
 const buffer=context.createBuffer(1,clip.samples.length,clip.rate);
 buffer.copyToChannel(clip.samples,0);
 return buffer;
}
