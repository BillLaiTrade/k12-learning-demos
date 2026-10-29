// 離開區塊或頁面時停止；返回時不自動恢復播放。
export function stopOnLeave(section, stop) {
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => !entry.isIntersecting)) stop();
    });
    observer.observe(section);
  } else {
    const stopIfOutside = () => {
      const bounds = section.getBoundingClientRect();
      if (bounds.bottom <= 0 || bounds.top >= innerHeight) stop();
    };
    window.addEventListener('scroll', stopIfOutside, { passive: true });
    window.addEventListener('resize', stopIfOutside);
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  window.addEventListener('pagehide', stop);
}
