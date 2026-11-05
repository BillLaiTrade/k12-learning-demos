// 五個教學區直接讀取大標題；小測入口固定名稱，活動標題同步至輔助說明。
document.querySelectorAll('.route a[href^="#"]').forEach(link => {
  const section = document.getElementById(link.hash.slice(1));
  const heading = section?.querySelector('h2');
  const label = link.querySelector('span');
  if (!heading || !label) return;
  const sync = () => {
    const title = heading.textContent.trim();
    label.textContent = link.classList.contains('quiz-nav') ? '單元小測' : title;
    if (link.classList.contains('quiz-nav')) {
      link.setAttribute('aria-label', `單元小測：${title}`);
      link.title = title;
    }
  };
  sync();
  new MutationObserver(sync).observe(heading, { childList: true, characterData: true, subtree: true });
});
