// 區塊大標題是唯一文案來源；更名時導覽同步更新。
document.querySelectorAll('.route a[href^="#"]').forEach(link => {
  const section = document.getElementById(link.hash.slice(1));
  const heading = section?.querySelector('h2');
  const label = link.querySelector('span');
  if (!heading || !label) return;
  const sync = () => { label.textContent = heading.textContent.trim(); };
  sync();
  new MutationObserver(sync).observe(heading, { childList: true, characterData: true, subtree: true });
});
