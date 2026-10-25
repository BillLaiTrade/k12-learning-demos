export const manageRendererContextVisibility = (renderer, canvas) => {
  if (!('IntersectionObserver' in window)) return () => {};

  let nearViewport = true;
  let pageVisible = !document.hidden;
  let contextReleased = false;
  const syncContext = () => {
    const shouldKeepContext = nearViewport && pageVisible;
    if (shouldKeepContext === !contextReleased) return;
    contextReleased = !shouldKeepContext;
    if (contextReleased) renderer.forceContextLoss();
    else renderer.forceContextRestore();
  };

  const observer = new IntersectionObserver((entries) => {
    nearViewport = entries.some((entry) => entry.isIntersecting);
    syncContext();
  }, { rootMargin: '48px' });
  observer.observe(canvas);

  const onVisibilityChange = () => {
    pageVisible = !document.hidden;
    syncContext();
  };
  document.addEventListener('visibilitychange', onVisibilityChange);
  const cleanup = () => {
    observer.disconnect();
    document.removeEventListener('visibilitychange', onVisibilityChange);
    if (!contextReleased) renderer.forceContextLoss();
  };
  window.addEventListener('pagehide', cleanup, { once: true });
  return cleanup;
};
