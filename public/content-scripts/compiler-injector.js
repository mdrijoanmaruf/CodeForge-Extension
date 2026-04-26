// Relay submit requests from the React compiler app to chrome.storage.local
// so the CF content script can auto-fill the submit form when the tab opens.
window.addEventListener('message', async (event) => {
  if (event.source !== window || event.data?.type !== 'cf-pending-submit') return;
  const { code, languageId, problemUrl } = event.data;
  try {
    await chrome.storage.local.set({
      'cf-pending-submit': { code, languageId, problemUrl, timestamp: Date.now() },
    });
  } catch { /* ignore */ }
});

(async () => {
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('ext');
  if (!sessionId) return;

  const relayKey = `ext-relay-${sessionId}`;
  const result = await chrome.storage.local.get(relayKey);
  const payload = result[relayKey];
  if (!payload) return;

  // Write to localStorage immediately so the React restore-on-mount effect
  // can pick it up even if the custom event fires before the listener is registered.
  try { localStorage.setItem('cf-active-problem', JSON.stringify(payload)); } catch { /* ignore */ }

  // Remove ?ext= from URL bar without reload
  const cleanUrl = new URL(window.location.href);
  cleanUrl.searchParams.delete('ext');
  history.replaceState({}, '', cleanUrl.toString());

  // Clean up relay entry
  await chrome.storage.local.remove(relayKey);

  // Also fire a live event after React has had time to mount its listener.
  // The restore effect already handles the fallback, so this is best-effort.
  await new Promise(r => setTimeout(r, 1200));
  window.dispatchEvent(new CustomEvent('ext:problem-loaded', { detail: payload }));
})();
