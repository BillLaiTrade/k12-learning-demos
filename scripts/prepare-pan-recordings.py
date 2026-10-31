"""從CC BY 4.0 mrshoes排管實錄製作六個調音音檔；需ffmpeg、numpy、scipy。"""
import sys,subprocess,json,hashlib
from pathlib import Path
import numpy as np
from scipy.io import wavfile
source=Path(sys.argv[1]);out=Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True)
rate=22050
raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(source),'-ar',str(rate),'-ac','1','-f','f32le','-'])
a=np.frombuffer(raw,dtype=np.float32)
def pitch(x):
 n=262144;s=np.abs(np.fft.rfft(x*np.hanning(len(x)),n));s[:int(150*n/rate)]=0;s[int(700*n/rate):]=0;k=np.argmax(s);v=np.log(s[k-1:k+2]+1e-12);d=.5*(v[0]-v[2])/(v[0]-2*v[1]+v[2]);return float((k+d)*rate/n)
rows=[]
for i,(length,start) in enumerate(zip([40,35,30,26,23,20],[0,0,0,6.69,11.8,16.95])):
 target=343/(4*length/100);original=pitch(a[int((start+.25)*rate):int((start+1.35)*rate)])
 cmd=['ffmpeg','-v','error','-ss',str(start),'-i',str(source),'-t','1.8','-af',f'rubberband=pitch={target/original}:transients=smooth:detector=soft','-ar',str(rate),'-ac','1','-f','f32le','-']
 b=np.frombuffer(subprocess.check_output(cmd),dtype=np.float32).copy();b=np.pad(b,(0,max(0,int(rate*1.8)-len(b))))[:int(rate*1.8)]
 b-=np.mean(b);fade=int(.02*rate);b[:fade]*=np.linspace(0,1,fade);fade=int(.14*rate);b[-fade:]*=np.linspace(1,0,fade)
 rms=float(np.sqrt(np.mean(b[int(.2*rate):int(1.2*rate)]**2)));gain=min(.38/rms,.88/float(np.max(np.abs(b))));b*=gain
 file=f'pipe-{i}.wav';wavfile.write(out/file,rate,np.round(b*32767).astype(np.int16))
 rows.append({'index':i,'length_cm':length,'target_hz':target,'source_start_seconds':start,'source_measured_hz':original,'pitch_ratio':target/original,'measured_hz':pitch(b[int(.25*rate):int(1.35*rate)]),'rms':float(np.sqrt(np.mean(b[int(.2*rate):int(.7*rate)]**2))),'peak':float(np.max(np.abs(b))),'seconds':len(b)/rate,'file':file,'sha256':hashlib.sha256((out/file).read_bytes()).hexdigest()})
manifest={'source_title':'panflute scale octave and a half','author':'mrshoes','source_url':'https://freesound.org/people/mrshoes/sounds/278175/','download_url':'https://cdn.freesound.org/previews/278/278175_5038472-hq.mp3','license':'CC BY 4.0','license_url':'https://creativecommons.org/licenses/by/4.0/','source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'description':'作者以一端封閉的3/4英吋PVC管、改變水位錄製排管音階；非竹排笛實錄。','modifications':'選取單音、Rubber Band保時長調音、混成單聲道、淡入淡出與共同目標RMS／峰值餘裕；無合成振盪器、無接續循環。','sample_rate':rate,'recordings':rows}
(out/'recordings.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(rows,indent=2))
