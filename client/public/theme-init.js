// Apply the theme before the page paints. A saved choice takes priority over the system setting.
(() => {
  let saved = null;
  try {
    saved = localStorage.getItem('stack-and-story-theme');
  } catch {
    // The app also works when browser storage is unavailable.
  }
  const theme = saved === 'light' || saved === 'dark'
    ? saved
    : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#17131f' : '#f8f6fc');
})();
