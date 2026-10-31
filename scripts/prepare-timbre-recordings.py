"""重製3.3第五區音訊。吉他／排管源檔位置為前兩參數，輸出目錄為第三參數。"""
import sys, subprocess, json, hashlib
from pathlib import Path
import numpy as np
from scipy.io import wavfile

guitar, pipe, out = map(Path, sys.argv[1:4])
out.mkdir(parents=True, exist_ok=True)
rate, seconds, target = 22050, 1.2, 440

def decode(file, start=0, duration=seconds, ratio=1):
    cmd = ['ffmpeg', '-v', 'error', '-ss', str(start), '-i', str(file), '-t', str(duration)]
    if ratio != 1:
        cmd += ['-af', f'rubberband=pitch={ratio}:transients=smooth:detector=soft']
    return np.frombuffer(subprocess.check_output(cmd + ['-ar', str(rate), '-ac', '1', '-f', 'f32le', '-']), dtype=np.float32).copy()

def pitch(a):
    # 直接量測基頻附近的最大頻峰，不以檔名推斷音高。
    n = 262144
    spectrum = abs(np.fft.rfft(a * np.hanning(len(a)), n))
    low, high = int(380*n/rate), int(520*n/rate)
    k = low + np.argmax(spectrum[low:high])
    v = np.log(spectrum[k-1:k+2] + 1e-12)
    delta = .5*(v[0]-v[2])/(v[0]-2*v[1]+v[2])
    return float((k+delta)*rate/n)

rows, clips = [], []
sources = [
    ('pure', None, 0, '音叉近似純音（合成示意）', None, None, None),
    ('string', guitar, 0, '31-A#4.flac', 'allan764', 'https://freesound.org/people/allan764/sounds/467669/', 'https://creativecommons.org/licenses/by/3.0/'),
    ('pipe', pipe, 16.95, 'panflute scale octave and a half', 'mrshoes', 'https://freesound.org/people/mrshoes/sounds/278175/', 'https://creativecommons.org/licenses/by/4.0/'),
]
for key, source, start, title, author, url, license_url in sources:
    original, ratio = target, 1
    if source:
        raw = decode(source, start)
        original = pitch(raw[int(.2*rate):int(.85*rate)])
        ratio = target / original
        a = decode(source, start, ratio=ratio)
    else:
        a = np.sin(2*np.pi*target*np.arange(round(rate*seconds))/rate)
    a = np.pad(a, (0, max(0, round(rate*seconds)-len(a))))[:round(rate*seconds)]
    a -= a.mean()
    # 保留吉他自然起音／衰減；三份音檔只作固定增益，不壓縮或逐週期重建。
    fade = round(.005*rate)
    a[:fade] *= np.linspace(0, 1, fade)
    fade = round(.08*rate)
    a[-fade:] *= np.linspace(1, 0, fade)
    clips.append(a)
    rows.append(dict(key=key, title=title, author=author, source_url=url, license_url=license_url,
                     source_start_seconds=start, source_measured_hz=original, pitch_ratio=ratio,
                     source_sha256=hashlib.sha256(source.read_bytes()).hexdigest() if source else None))

# 共同目標RMS，保留所有音檔峰值餘裕；不保證主觀響度完全相等。
rms_target = min(.16, *(.88 / abs(a).max() * np.sqrt(np.mean(a*a)) for a in clips))
for row, a in zip(rows, clips):
    a *= rms_target / np.sqrt(np.mean(a*a))
    pcm = np.round(a*32767).astype(np.int16)
    file = out / (row['key']+'.wav')
    wavfile.write(file, rate, pcm)
    a = pcm.astype(np.float64)/32768
    row.update(file=file.name, measured_hz=pitch(a[int(.2*rate):int(.85*rate)]),
               rms=float(np.sqrt(np.mean(a*a))), peak=float(abs(a).max()),
               sha256=hashlib.sha256(file.read_bytes()).hexdigest())
manifest = dict(sample_rate=rate, seconds=seconds, target_hz=target, rms_target=float(rms_target),
                waveform_start_seconds=.2, waveform_window_seconds=.01,
                modifications='吉他及排管：擷取單音、Rubber Band保時長調音至440Hz、混成單聲道、5ms淡入／80ms淡出、固定增益匹配全段RMS；無壓縮、無循環或週期重建。純音：440Hz正弦合成示意。圖形取自最終WAV的PCM資料。',
                pipe_description='mrshoes以封底PVC管及水位錄製排管音階，非竹排笛實錄。', recordings=rows)
(out/'recordings.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n')
print(json.dumps(manifest, ensure_ascii=False, indent=2))
