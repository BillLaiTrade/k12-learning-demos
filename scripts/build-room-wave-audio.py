"""Deterministic teaching audio: 3D image-source reflections, fixed near-mouth receiver.
No measured far-field RIR is presented as a self-hearing recording. Research informed
room scale and attenuation; this model omits bone conduction, scattering/directivity.
"""
from pathlib import Path
import json,subprocess
import numpy as np
from scipy.signal import fftconvolve,resample_poly,butter,sosfilt
from scipy.io import wavfile
root=Path(__file__).resolve().parents[1];assets=root/'units/3/parts/3.4/assets'
spec=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {ROOM,HARD_REFLECTION,SOFT_REFLECTION} from './units/3/parts/3.4/assets/room-wave-model.mjs';console.log(JSON.stringify({ROOM,HARD_REFLECTION,SOFT_REFLECTION}));"],cwd=root))
fs=24000;room=np.array([spec['ROOM']['width'],spec['ROOM']['height'],2.6]);src=np.array([spec['ROOM']['sourceX'],spec['ROOM']['sourceY'],1.35]);receiver=src+[-.10,0,.15]
ns=np.arange(-22,23);grid=np.array(np.meshgrid(ns,ns,ns,indexing='ij')).reshape(3,-1).T;grid=grid[np.sum(abs(grid),axis=1)<=22]
images=grid*room+np.where(abs(grid)%2==0,src,room-src);distance=np.linalg.norm(images-receiver,axis=1);order=abs(grid).sum(axis=1)
# Negative x/y indices encounter left/top first. Both are the treated full walls.
counts=np.where(grid<0,np.ceil(abs(grid)/2),np.floor(abs(grid)/2)).astype(int);treated_hits=counts[:,0]+counts[:,1]
direct=np.linalg.norm(src-receiver);delays=(distance-direct)/spec['ROOM']['c'];indices=delays*fs;length=int(np.ceil(max(indices)))+2
rirs=[]
for soft in [False,True]:
 amp=spec['HARD_REFLECTION']**(order-treated_hits)*(spec['SOFT_REFLECTION'] if soft else spec['HARD_REFLECTION'])**treated_hits
 amp=amp*direct/distance*np.exp(-.002*np.maximum(0,distance-direct));h=np.zeros(length);pos=np.floor(indices).astype(int);frac=indices-pos
 np.add.at(h,pos,amp*(1-frac));np.add.at(h,pos+1,amp*frac);rirs.append(h)
rng=np.random.default_rng(20261101);clap=rng.normal(size=240)*np.exp(-np.arange(240)/40);clap[:12]*=np.linspace(0,1,12);clap=sosfilt(butter(3,[250,6500],fs=fs,btype='band',output='sos'),clap);clap/=max(abs(clap))
sr,voice=wavfile.read(assets/'room-phrase.wav');voice=voice.astype(float)/32768
if voice.ndim>1:voice=voice.mean(axis=1)
voice=resample_poly(voice,fs,sr);active=np.flatnonzero(abs(voice)>.008);voice=voice[max(0,active[0]-1200):active[-1]+1200];voice/=max(abs(voice))
manifest={'model':'3D image sources; amplitude reflection hard=.88, treated=.35; whole left/top walls; no measured self-hearing claim','room_m':room.tolist(),'source_m':src.tolist(),'receiver_m':receiver.tolist(),'sample_rate':fs,'maximum_order':22,'speech_source':'room-phrase.wav; existing offline synthetic phrase','clap_source':'deterministic 10ms noise burst, not a real clap recording','rirs':[],'files':{}}
for treated,h in zip([False,True],rirs):
 e=h*h;manifest['rirs'].append({'treated':treated,'direct_tap':h[0],'C50_dB':float(10*np.log10(e[:1200].sum()/e[1200:].sum())),'late_100ms_fraction':float(e[2400:].sum()/e.sum())})
for kind,x in [('clap',clap),('speech',voice)]:
 ys=[fftconvolve(x,h) for h in rirs];gain=.8/max(max(abs(y)) for y in ys)
 for condition,y in zip(['bare','treated'],ys):
  y=y*gain;name=f'room-{kind}-{condition}.wav';wavfile.write(assets/name,fs,(np.clip(y,-1,1)*32767).astype(np.int16));manifest['files'][name]={'duration':len(y)/fs,'peak':float(max(abs(y))),'common_gain':gain}
(assets/'room-audio-model.json').write_text(json.dumps(manifest,indent=2))
print(json.dumps(manifest,indent=2))
