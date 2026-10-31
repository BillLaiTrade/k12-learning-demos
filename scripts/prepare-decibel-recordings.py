"""重製第七區錄音：python3 scripts/prepare-decibel-recordings.py 原始音檔目錄。

只使用 Python 標準庫與 ffmpeg/ffprobe。來源、段落及授權見 source/sources.json。
不自動下載；原檔 SHA-256 必須與已查核的來源相符。
"""
import hashlib
import html
import json
from pathlib import Path
import re
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'docs/reviews/unit-3.3-decibel-audio/source/sources.json'
OUT = ROOT / 'units/3/parts/3.3/assets/decibel-audio'


def run(args):
    return subprocess.run(args, check=True, capture_output=True, text=True)


def measure(file):
    result = run(['ffmpeg', '-hide_banner', '-i', str(file), '-af',
                  'loudnorm=I=-23:TP=-3:LRA=11:print_format=json', '-f', 'null', '-'])
    data = json.loads(re.search(r'\{[^{}]+"input_i"[^{}]+\}', result.stderr).group())
    return {'lufs': float(data['input_i']), 'true_peak_dbfs': float(data['input_tp'])}


def main():
    original_dir = Path(sys.argv[1])
    rows = json.loads(SOURCE.read_text())
    OUT.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as temp:
        normalized = []
        for row in rows:
            original = original_dir / row['source_file']
            digest = hashlib.sha256(original.read_bytes()).hexdigest()
            if digest != row['source_sha256']:
                raise ValueError(f"Unverified source: {row['key']}")
            streams = json.loads(run(['ffprobe', '-v', 'error', '-show_streams',
                                      '-of', 'json', str(original)]).stdout)['streams']
            if not any(s['codec_type'] == 'audio' for s in streams):
                raise ValueError('No audio track: ' + row['key'])
            clip = Path(temp) / (row['key'] + '-clip.wav')
            # 短邊界淡入淡出，不重複耳語、不變速、不合成或重建聲音。
            fade_out = max(0, row['duration_seconds'] - .16)
            run(['ffmpeg', '-v', 'error', '-y', '-ss', str(row['start_seconds']),
                 '-i', str(original), '-map', '0:a:0', '-t', str(row['duration_seconds']),
                 '-af', f'afade=t=in:d=0.06,afade=t=out:st={fade_out}:d=0.16',
                 '-ar', '24000', '-ac', '1', '-c:a', 'pcm_f32le', str(clip)])
            raw = measure(clip)
            if raw['lufs'] < -65 or raw['lufs'] == float('-inf'):
                raise ValueError('Silent or unusable recording: ' + row['key'])
            baseline = Path(temp) / (row['key'] + '-baseline.wav')
            baseline_gain = -23 - raw['lufs']
            for baseline_attempt in range(5):
                run(['ffmpeg', '-v', 'error', '-y', '-i', str(clip), '-af',
                     f"volume={baseline_gain}dB:precision=double", '-c:a', 'pcm_f32le', str(baseline)])
                row['baseline_measurement'] = measure(baseline)
                if abs(row['baseline_measurement']['lufs'] + 23) <= .12:
                    break
                baseline_gain += -23 - row['baseline_measurement']['lufs']
            else:
                raise ValueError('Common loudness baseline verification failed: ' + row['key'])
            normalized.append(baseline)
        # 同基準 -23 LUFS 後每級 +2 LU；必要時全組共同下移，保留真峰值 -3 dBFS 餘裕。
        shift = max(0, max(row['baseline_measurement']['true_peak_dbfs'] +
                           (-40 + 2*i) + 23 + 3 for i, row in enumerate(rows)))
        for group_attempt in range(3):
            for i, (row, baseline) in enumerate(zip(rows, normalized)):
                target = -40 + 2*i - shift
                file = OUT / (row['key'] + '.wav')
                gain_db = target - row['baseline_measurement']['lufs']
                # 絕對響度閘門會略去低於閾值的短靜音窗口；以成品重新量測固定增益。
                for level_attempt in range(5):
                    run(['ffmpeg', '-v', 'error', '-y', '-i', str(baseline), '-af',
                         f'volume={gain_db}dB:precision=double', '-c:a', 'pcm_s16le', str(file)])
                    actual = measure(file)
                    if abs(actual['lufs'] - target) <= .12:
                        break
                    gain_db += target - actual['lufs']
                else:
                    raise ValueError('Output loudness verification failed: ' + row['key'])
                row.update(target_lufs=round(target, 2), measurement=actual,
                           output_gain_db=round(gain_db, 5),
                           sha256=hashlib.sha256(file.read_bytes()).hexdigest(),
                           modifications='擷取指定段落、24kHz 單聲道 PCM16、60ms 淡入／160ms 淡出、共同 -23 LUFS 基準後固定增益階梯；不變速或變調。')
            overflow = max(row['measurement']['true_peak_dbfs'] + 3 for row in rows)
            if overflow <= .05:
                break
            shift += overflow + .1
        else:
            raise ValueError('Output true peak verification failed')
        for row in rows:
            print(row['key'], row['measurement'])
    (OUT / 'recordings.json').write_text(json.dumps(rows, ensure_ascii=False, indent=2)+'\n')
    credits = []
    license_lines = ['# 第七區場景錄音來源與授權', '',
                     '插圖、OSHA 參考聲級與錄音來自不同來源；播放並非 dBA 重現。',
                     '各衍生檔沿用下列標示授權，不以網站其他檔案授權取代。', '']
    for row in rows:
        esc = html.escape
        credits.append(f'<li><strong>{esc(row["label"])}</strong>：{esc(row["author"])}，'
                       f'<a href="{esc(row["source_url"])}">{esc(row["title"])}</a> · '
                       f'<a href="{esc(row["license_url"])}">{esc(row["license"])}</a>。'
                       f'{esc(row["note"])} 修改：擷取 {row["start_seconds"]} 秒起 '
                       f'{row["duration_seconds"]} 秒，單聲道、淡入淡出及響度調整；衍生檔沿用 {esc(row["derived_license"])}。</li>')
        license_lines.extend([f'## {row["label"]} — {row["key"]}.wav', '',
                              f'- 作者：{row["author"]}', f'- 原作：[{row["title"]}]({row["source_url"]})',
                              f'- 原作及衍生檔授權：[{row["license"]}]({row["license_url"]})',
                              f'- 情境差異：{row["note"]}',
                              f'- 修改：{row["start_seconds"]} 秒起擷取 {row["duration_seconds"]} 秒；{row["modifications"]}',
                              f'- 成品：{row["measurement"]["lufs"]} LUFS，真峰值 {row["measurement"]["true_peak_dbfs"]} dBFS', ''])
    (OUT / 'LICENSE.md').write_text('\n'.join(license_lines))
    page = ROOT / 'units/3/parts/3.3/index.html'
    page.write_text(re.sub(r'<ol data-decibel-credits>.*?</ol>',
                          '<ol data-decibel-credits>\n'+'\n'.join(credits)+'\n</ol>', page.read_text(), flags=re.S))


if __name__ == '__main__':
    main()
