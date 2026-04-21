(async () => {
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('ext');
  if (!sessionId) return;

  // Wait for React app to mount
  await new Promise(r => setTimeout(r, 900));

  const result = await chrome.storage.session.get(sessionId);
  const payload = result[sessionId];
  if (!payload) return;

  // Fire event the compiler React app listens to
  window.dispatchEvent(new CustomEvent('ext:problem-loaded', { detail: payload }));

  // Clean up session entry
  await chrome.storage.session.remove(sessionId);

  // Remove ?ext= from URL bar without reload
  const cleanUrl = new URL(window.location.href);
  cleanUrl.searchParams.delete('ext');
  history.replaceState({}, '', cleanUrl.toString());
})();
