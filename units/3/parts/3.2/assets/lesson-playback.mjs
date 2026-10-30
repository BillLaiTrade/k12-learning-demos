const activities = new Map();

function stopOtherSections(activeSection) {
  for (const [section, stop] of activities) {
    if (section !== activeSection) stop();
  }
}

function activateFromInteraction(event) {
  if (!(event.target instanceof Element)) return;
  const link = event.target.closest('.route a[href^="#"]');
  if (link) {
    stopOtherSections(document.getElementById(link.hash.slice(1)));
    return;
  }
  for (const section of activities.keys()) {
    if (section.contains(event.target)) {
      stopOtherSections(section);
      return;
    }
  }
}

// 在新區塊處理互動前停止舊播放，即使舊卡片仍有一小部分可見。
document.addEventListener('click', activateFromInteraction, true);
document.addEventListener('keydown', event => {
  if (event.key === 'Enter' || event.key === ' ') activateFromInteraction(event);
}, true);
window.addEventListener('hashchange', () => {
  const section = document.getElementById(location.hash.slice(1));
  if (activities.has(section)) stopOtherSections(section);
});

// 離開區塊或頁面時停止；返回時不自動恢復播放。
export function stopOnLeave(section, stop) {
  activities.set(section, stop);
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
