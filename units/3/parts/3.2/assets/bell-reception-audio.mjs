// 使用者敲鐘時解鎖音訊；聽者位置的鐘聲以同一輸出時鐘預約。
export class BellReceptionAudio {
  constructor(url) { this.url = url; }

  async prepare() {
    if (!this.context || this.context.state === 'closed') {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) throw new Error('audio-unavailable');
      this.context = new Audio({ latencyHint: 'interactive' });
      this.buffer = null; this.loading = null; this.levels = null;
    }
    const resumed = this.context.resume();
    if (!this.buffer && !this.loading) {
      this.loading = (async () => {
        const response = await fetch(this.url);
        if (!response.ok) throw new Error('audio-download');
        this.buffer = await this.context.decodeAudioData(await response.arrayBuffer());
        const size = Math.round(this.buffer.sampleRate * .1), levels = [];
        for (let first = 0; first < this.buffer.length; first += size) {
          let energy = 0, count = 0;
          for (let channel = 0; channel < this.buffer.numberOfChannels; channel++) {
            const data = this.buffer.getChannelData(channel);
            for (let i = first; i < Math.min(first + size, data.length); i++) { energy += data[i] ** 2; count++; }
          }
          levels.push(Math.sqrt(energy / count));
        }
        // 平滑的衰減外形供視覺使用，讓尾音變弱時動作也漸弱；不作聲壓量測。
        const peak = Math.max(...levels, 1e-6);
        let remaining = 0;
        for (let i = levels.length - 1; i >= 0; i--) { remaining = Math.max(remaining, levels[i]); levels[i] = Math.sqrt(remaining / peak); }
        this.levels = levels;
      })().finally(() => { this.loading = null; });
    }
    await Promise.all([resumed, this.loading]);
    if (this.context.state !== 'running' || !this.buffer) throw new Error('audio-suspended');
    const now = performance.now(), stamp = this.context.getOutputTimestamp?.();
    this.performanceOrigin = now;
    this.contextOrigin = stamp?.performanceTime > 0 && stamp.contextTime > 0
      ? stamp.contextTime + (now - stamp.performanceTime) / 1000
      : Math.max(0, this.context.currentTime - (this.context.outputLatency || this.context.baseLatency || 0));
  }

  now() { return this.contextOrigin + (performance.now() - this.performanceOrigin) / 1000; }

  levelAt(time) {
    if (!this.levels) return 1;
    const position = Math.max(0, time * 10), index = Math.floor(position), last = this.levels.length - 1;
    const first = this.levels[Math.min(index, last)], next = this.levels[Math.min(index + 1, last)];
    return first + (next - first) * (position - index);
  }

  playAt(time, offset = 0) {
    this.stop();
    const source = this.context.createBufferSource();
    source.buffer = this.buffer; source.connect(this.context.destination);
    source.onended = () => {
      source.disconnect();
      if (this.source === source) this.source = null;
    };
    source.start(time, offset); this.source = source;
  }

  stop() {
    if (!this.source) return;
    const source = this.source; this.source = null;
    try { source.stop(); } catch { /* 已自然結束。 */ }
    source.disconnect();
  }
}
