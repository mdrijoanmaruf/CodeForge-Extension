const RECENT_KEY = 'cf-recent-problems';
const MAX_RECENT = 5;

async function saveToRecent(payload) {
  const result = await chrome.storage.local.get(RECENT_KEY);
  const existing = result[RECENT_KEY] ?? [];

  const entry = {
    problemId: payload.problemId,
    problemName: payload.problemName,
    problemUrl: payload.problemUrl,
    openedAt: Date.now(),
  };

  const filtered = existing.filter(r => r.problemId !== payload.problemId);
  const updated = [entry, ...filtered].slice(0, MAX_RECENT);

  await chrome.storage.local.set({ [RECENT_KEY]: updated });
}
