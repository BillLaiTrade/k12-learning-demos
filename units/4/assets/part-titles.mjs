// 保留入口頁的靜態標題；讀取失敗時，卡片與連結仍可正常使用。
await Promise.all([...document.querySelectorAll('.part-card')].map(async card => {
  const heading = card.querySelector('h2');
  const link = card.querySelector('a[href]');
  if (!heading || !link) return;
  const url = new URL(link.href);
  if (url.origin !== location.origin) return;
  try {
    const response = await fetch(url, {cache: 'no-cache', signal: AbortSignal.timeout(8000)});
    if (!response.ok) return;
    // template 的內容保持惰性，不執行內頁程式或載入其圖片。
    const template = document.createElement('template');
    template.innerHTML = await response.text();
    const title = template.content.querySelector('h1')?.textContent.replace(/\s+/g, ' ').trim();
    if (title) heading.textContent = title;
  } catch {
    // 網路、逾時或解析問題不影響目前顯示的標題。
  }
}));
