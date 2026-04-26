// ── Scraper ────────────────────────────────────────────────────────────────

// Codeforces wraps pre content in <div class="test-example-line ..."> elements.
// Extract each line's textContent and join with newlines for correct stdin format.
function extractPreText(pre) {
  if (!pre) return '';
  const lines = pre.querySelectorAll('.test-example-line');
  if (lines.length > 0) {
    return [...lines].map(l => l.textContent ?? '').join('\n').trim();
  }
  return pre.innerText.trim();
}

function scrapeProblem() {
  const header    = document.querySelector('.problem-statement .header');
  const title     = header?.querySelector('.title')?.innerText?.trim();
  const timeLimit = header?.querySelector('.time-limit')?.childNodes[1]?.textContent?.trim();
  const memLimit  = header?.querySelector('.memory-limit')?.childNodes[1]?.textContent?.trim();

  // Clone to avoid mutating the live DOM; strip the injected solve button so it
  // doesn't appear when the problem statement is rendered in the compiler panel.
  const statementEl = document.querySelector('.problem-statement');
  let statement = '';
  if (statementEl) {
    const clone = statementEl.cloneNode(true);
    const injectedBtn = clone.querySelector('#rijoan-solve-btn');
    if (injectedBtn) injectedBtn.remove();
    statement = clone.outerHTML;
  }

  const inputBlocks  = document.querySelectorAll('.sample-tests .input pre');
  const outputBlocks = document.querySelectorAll('.sample-tests .output pre');

  const testCases = [...inputBlocks].map((inp, i) => ({
    id: i + 1,
    label: `Sample ${i + 1}`,
    input: extractPreText(inp),
    expectedOutput: extractPreText(outputBlocks[i]),
  }));

  const tags   = [...document.querySelectorAll('.tag-box')]
                   .map(t => t.innerText.trim())
                   .filter(t => !t.startsWith('*'));
  const rating = [...document.querySelectorAll('.tag-box')]
                   .find(t => t.innerText.trim().startsWith('*'))
                   ?.innerText?.replace('*', '')?.trim();

  // Parse contest + problem index from URL
  const match = location.pathname.match(
    /(?:contest|problemset\/problem)\/(\d+)\/(?:problem\/)?([A-Z]\d*)/i
  );
  const gymMatch = location.pathname.match(/gym\/(\d+)\/problem\/([A-Z]\d*)/i);
  const m = match ?? gymMatch;
  const contestId    = m?.[1] ?? '';
  const problemIndex = m?.[2] ?? '';

  return {
    sessionId: crypto.randomUUID(),
    platform: 'codeforces',
    problemId: `${contestId}${problemIndex}`,
    contestId,
    problemIndex,
    problemName: title ?? 'Unknown Problem',
    problemUrl: location.href,
    statementHtml: statement,
    timeLimit: timeLimit ?? '',
    memoryLimit: memLimit ?? '',
    rating,
    tags,
    testCases,
    scrapeTimestamp: Date.now(),
  };
}

// ── Submit auto-fill ────────────────────────────────────────────────────────

const CF_LANG_MAP = {
  cpp:        ['g++23', 'g++20', 'g++17', 'g++14', 'clang++'],
  c:          ['g17', 'gcc c', ' c (gcc)'],
  python:     ['python 3.12', 'python 3', 'pypy 3'],
  java:       ['java 21', 'java 17', 'java 11', 'java 8', 'java'],
  csharp:     ['c# mono', 'mono', 'c#'],
  go:         ['go 1.', 'golang'],
  rust:       ['rust'],
  ruby:       ['ruby'],
  php:        ['php'],
  javascript: ['javascript v8', 'node.js', 'node'],
};

function waitForEl(selector, timeout = 6000) {
  return new Promise(resolve => {
    const el = document.querySelector(selector);
    if (el) { resolve(el); return; }
    const obs = new MutationObserver(() => {
      const found = document.querySelector(selector);
      if (found) { obs.disconnect(); resolve(found); }
    });
    obs.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => { obs.disconnect(); resolve(null); }, timeout);
  });
}

function pickLangOption(select, languageId) {
  const priorities = CF_LANG_MAP[languageId] ?? [];
  const options = [...select.options];
  for (const kw of priorities) {
    const match = options.find(o => o.text.toLowerCase().includes(kw.toLowerCase()));
    if (match) return match.value;
  }
  return null;
}

async function tryAutoFillSubmit() {
  const result = await chrome.storage.local.get('cf-pending-submit');
  const pending = result['cf-pending-submit'];
  if (!pending) return;

  // Stale after 30 seconds
  if (Date.now() - pending.timestamp > 30000) {
    await chrome.storage.local.remove('cf-pending-submit');
    return;
  }

  // Match URL (strip hash/query for comparison)
  const norm = u => u.split('#')[0].split('?')[0].replace(/\/$/, '');
  if (norm(location.href) !== norm(pending.problemUrl)) return;

  await chrome.storage.local.remove('cf-pending-submit');

  // Wait for the language select (submit form must be present)
  const langSelect = await waitForEl('select[name="programTypeId"]');
  if (!langSelect) return;

  // Set language
  const val = pickLangOption(langSelect, pending.languageId);
  if (val) {
    langSelect.value = val;
    langSelect.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // Brief pause for CF to re-init the editor after language change
  await new Promise(r => setTimeout(r, 400));

  // Fill CodeMirror editor
  const cmEl = document.querySelector('form[action*="submit"] .CodeMirror')
            ?? document.querySelector('.submit-form .CodeMirror')
            ?? document.querySelector('.CodeMirror');
  if (cmEl?.CodeMirror) {
    cmEl.CodeMirror.setValue(pending.code);
  } else {
    // Fallback: bare textarea
    const ta = document.querySelector('textarea[name="source"]');
    if (ta) { ta.value = pending.code; ta.dispatchEvent(new Event('input', { bubbles: true })); }
  }

  // Scroll the form into view
  (langSelect.closest('form') ?? langSelect).scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ── Button injection ────────────────────────────────────────────────────────

function injectButton() {
  if (document.getElementById('rijoan-solve-btn')) return;

  const target = document.querySelector('.problem-statement .header')
              ?? document.querySelector('.roundbox');
  if (!target) return;

  const btn = document.createElement('button');
  btn.id = 'rijoan-solve-btn';
  btn.type = 'button';
  btn.innerText = '⚡ Solve on Rijoan Compiler';
  btn.style.cssText = `
    display: inline-flex; align-items: center; gap: 6px;
    margin: 8px 0; padding: 8px 16px;
    background: #2563eb; color: white;
    border: none; border-radius: 6px;
    font-size: 13px; font-weight: 600; cursor: pointer;
    font-family: inherit; transition: background 0.15s;
  `;
  btn.addEventListener('mouseenter', () => { btn.style.background = '#1d4ed8'; });
  btn.addEventListener('mouseleave', () => { btn.style.background = '#2563eb'; });

  btn.addEventListener('click', async () => {
    btn.innerText = '⏳ Opening…';
    btn.disabled = true;

    const payload = scrapeProblem();

    // Save to local storage for relay (session storage is blocked on some CF pages)
    await chrome.storage.local.set({ [`ext-relay-${payload.sessionId}`]: payload });

    // Save to recent history
    const RECENT_KEY = 'cf-recent-problems';
    const result = await chrome.storage.local.get(RECENT_KEY);
    const existing = result[RECENT_KEY] ?? [];
    const entry = {
      problemId: payload.problemId,
      problemName: payload.problemName,
      problemUrl: payload.problemUrl,
      openedAt: Date.now(),
    };
    const updated = [entry, ...existing.filter(r => r.problemId !== payload.problemId)].slice(0, 5);
    await chrome.storage.local.set({ [RECENT_KEY]: updated });

    // Open compiler tab directly — window.open works from a user-gesture click
    // and avoids the MV3 service-worker-sleeping race that drops sendMessage calls.
    window.open(`http://localhost:3000/?ext=${payload.sessionId}`, '_blank');

    setTimeout(() => {
      btn.innerText = '⚡ Solve on Rijoan Compiler';
      btn.disabled = false;
    }, 2000);
  });

  target.insertAdjacentElement('afterend', btn);
}

// ── Message listener (for popup queries) ───────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === 'getProblemInfo') {
    try {
      const p = scrapeProblem();
      sendResponse(p);
    } catch {
      sendResponse(null);
    }
    return true;
  }

  if (msg.action === 'solve') {
    document.getElementById('rijoan-solve-btn')?.click();
    sendResponse({ ok: true });
    return true;
  }
});

// ── Init ───────────────────────────────────────────────────────────────────

injectButton();
tryAutoFillSubmit();

// Re-inject if CF uses client-side navigation (rare but possible)
const observer = new MutationObserver(() => {
  if (!document.getElementById('rijoan-solve-btn')) injectButton();
});
observer.observe(document.body, { childList: true, subtree: true });
