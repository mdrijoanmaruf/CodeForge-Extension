window.addEventListener('message', async (event) => {
  if (event.source !== window || event.data?.type !== 'cf-pending-submit') return;
  const { code, languageId, problemUrl } = event.data;
  try {
    await chrome.storage.local.set({
      'cf-pending-submit': { code, languageId, problemUrl, timestamp: Date.now() },
    });
  } catch {}
});

(async () => {
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('ext');
  if (!sessionId) return;

  const relayKey = `ext-relay-${sessionId}`;
  const result = await chrome.storage.local.get(relayKey);
  const payload = result[relayKey];
  if (!payload) return;

  try { localStorage.setItem('cf-active-problem', JSON.stringify(payload)); } catch {}

  const cleanUrl = new URL(window.location.href);
  cleanUrl.searchParams.delete('ext');
  history.replaceState({}, '', cleanUrl.toString());

  await chrome.storage.local.remove(relayKey);

  await new Promise(r => setTimeout(r, 1200));
  window.dispatchEvent(new CustomEvent('ext:problem-loaded', { detail: payload }));
})();
