// Each apparatus measures only its own unpaused travel time. Durations come
// from the existing physical model; the wall clock never includes a pause.
export function createLaneTimers(keys, durationFor) {
  const lanes = keys.map(key => ({key, elapsed:0, state:'idle', pauseReason:'', startedAt:0}));
  function advance(now) {
    for (const lane of lanes) if (lane.state === 'running') {
      lane.elapsed = Math.min(durationFor(lane.key), Math.max(0, now-lane.startedAt));
      if (lane.elapsed >= durationFor(lane.key)) {
        lane.state = 'complete'; lane.pauseReason = '';
      }
    }
  }
  return {
    lanes,
    seed(elapsed, state, reason, now) {
      for (const lane of lanes) {
        lane.elapsed = Math.min(elapsed, durationFor(lane.key));
        lane.state = lane.elapsed >= durationFor(lane.key) ? 'complete' : state;
        lane.pauseReason = lane.state === 'paused' ? reason : '';
        lane.startedAt = now-lane.elapsed;
      }
    },
    start(key, now) {
      advance(now);
      Object.assign(lanes.find(lane => lane.key === key), {elapsed:0, state:'running', pauseReason:'', startedAt:now});
    },
    advance,
    pause(reason, now) {
      advance(now);
      for (const lane of lanes) if (lane.state === 'running') {
        lane.state = 'paused'; lane.pauseReason = reason;
      }
    },
    resume(reason, now) {
      for (const lane of lanes) if (lane.state === 'paused' && (reason === 'manual' || lane.pauseReason === 'automatic')) {
        lane.state = 'running'; lane.pauseReason = ''; lane.startedAt = now-lane.elapsed;
      }
    },
    get state() {
      if (lanes.some(lane => lane.state === 'running')) return 'running';
      if (lanes.some(lane => lane.state === 'paused')) return 'paused';
      return lanes.some(lane => lane.state === 'complete') ? 'complete' : 'idle';
    },
    get pauseReason() {
      const paused = lanes.filter(lane => lane.state === 'paused');
      return paused.some(lane => lane.pauseReason !== 'automatic') ? 'manual' : paused.length ? 'automatic' : '';
    }
  };
}
