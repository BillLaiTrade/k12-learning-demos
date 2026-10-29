export class FireworkAudio {
  async prepare() {
    if (!this.context || this.context.state === 'closed') {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) throw new Error('audio-unavailable');
      this.context = new Audio({ latencyHint: 'interactive' });
    }
    await this.context.resume();
    if (this.context.state !== 'running') throw new Error('audio-suspended');
    if (!this.buffer) {
      const response = await fetch(new URL('./firework-burst.wav?v=2', import.meta.url));
      if (!response.ok) throw new Error('audio-download');
      this.buffer = await this.context.decodeAudioData(await response.arrayBuffer());
    }
    // 每次觀察建立輸出時鐘到單調時鐘的映射；避免裝置首次更新時間戳時讓碼表停頓。
    const now = performance.now(), stamp = this.context.getOutputTimestamp?.();
    this.performanceOrigin = now;
    this.contextOrigin = stamp?.performanceTime > 0 && stamp.contextTime > 0
      ? stamp.contextTime + (now - stamp.performanceTime) / 1000
      : Math.max(0, this.context.currentTime - (this.context.outputLatency || this.context.baseLatency || 0));
  }

  // 讓畫面與喇叭輸出共用時鐘，而非用獨立 setTimeout 觸發聲音。
  now() {
    return this.contextOrigin + (performance.now() - this.performanceOrigin) / 1000;
  }

  playAt(time) {
    this.stop();
    const source = this.context.createBufferSource();
    source.buffer = this.buffer;
    source.connect(this.context.destination);
    source.onended = () => {
      source.disconnect();
      if (this.source === source) this.source = null;
    };
    source.start(time);
    this.source = source;
  }

  stop() {
    if (!this.source) return;
    const source = this.source;
    this.source = null;
    try { source.stop(); } catch { /* 已自然播放完畢。 */ }
    source.disconnect();
  }
}
