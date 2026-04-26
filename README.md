# CodeForge — Codeforces × Compiler Bridge

[![Manifest V3](https://img.shields.io/badge/Chrome-Manifest%20V3-4285F4?logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3) [![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev) [![TypeScript](https://img.shields.io/badge/TypeScript-6-blue?logo=typescript)](https://www.typescriptlang.org) [![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite)](https://vitejs.dev)

A Chrome extension that bridges **Codeforces problem pages** with the [Rijoan Online Compiler](https://compiler.rijoan.com). One click sends the full problem — statement, sample tests, limits, tags — straight into the compiler with the test case panel ready to go.

> **Compiler:** [compiler.rijoan.com](https://compiler.rijoan.com)

---

## What It Does

| Capability | Details |
|---|---|
| **One-click problem load** | Injects a ⚡ button on every CF problem page; clicking it opens the compiler with the problem pre-loaded |
| **Full problem scraping** | Extracts title, statement HTML, time/memory limits, difficulty rating, tags, and all sample test cases |
| **Popup UI** | Shows detected problem metadata and a "Solve" button; lists your last 5 recent problems |
| **Code submission relay** | After solving, one click pre-fills the Codeforces submit form with your code and language |
| **Problem persistence** | Problem data survives compiler page refreshes for 24 hours |
| **Navigation resilience** | Mutation observer re-injects the button after Codeforces client-side navigation |

---

## Supported Codeforces URLs

The extension activates on:

```
https://codeforces.com/problemset/problem/*/*
https://codeforces.com/contest/*/problem/*
https://codeforces.com/gym/*/problem/*
```

---

## Installation (Developer Mode)

1. Clone the repo and install dependencies:
   ```bash
   git clone <repo-url>
   cd CodeForge-Extenstion
   npm install
   ```

2. Build the extension:
   ```bash
   npm run build
   ```

3. Open Chrome and go to `chrome://extensions`

4. Enable **Developer mode** (top-right toggle)

5. Click **Load unpacked** and select the `dist/` folder

6. Pin the extension from the toolbar for quick access

---

## How It Works

### Problem Load Flow

```
Codeforces Problem Page
    │
    ▼
codeforces.js injects ⚡ button
    │  (user clicks)
    ▼
scrapeProblem() extracts full ProblemPayload
    │
    ▼
Saved to chrome.storage.local[ext-relay-{sessionId}]
    │
    ▼
Opens compiler.rijoan.com/?ext={sessionId}
    │
    ▼
compiler-injector.js reads storage → writes to localStorage
    │
    ▼
React app fires ext:problem-loaded → CF mode activated
```

### Submit Flow

```
User clicks "Submit on Codeforces" in compiler
    │
    ▼
compiler-injector.js relays { code, languageId } via postMessage
    │
    ▼
Written to chrome.storage.local[cf-pending-submit]
    │
    ▼
Codeforces submit page opens
    │
    ▼
codeforces.js auto-fills editor + language dropdown + submits
```

---

## Project Structure

```
CodeForge-Extenstion/
├── public/                          # Extension assets (copied to dist as-is)
│   ├── manifest.json               # MV3 extension manifest
│   ├── background/
│   │   └── service-worker.js       # Opens tabs on request
│   ├── content-scripts/
│   │   ├── codeforces.js           # DOM scraper, button injector, submit auto-fill
│   │   └── compiler-injector.js    # Storage relay between CF and compiler
│   ├── utils/
│   │   └── storage.js              # chrome.storage.local helpers
│   └── icons/                      # Extension icons (16, 48, 128 px)
├── src/                            # React popup source
│   ├── App.tsx                     # Popup UI — problem detection + recent history
│   ├── types.ts                    # ProblemPayload, TestCase, RecentProblem types
│   ├── main.tsx
│   ├── App.css
│   └── index.css
├── index.html                      # Popup HTML entry point
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## Storage Keys

| Key | Lifetime | Contents |
|---|---|---|
| `ext-relay-{sessionId}` | Session | Full `ProblemPayload` for hand-off to compiler |
| `cf-recent-problems` | Persistent | Array of last 5 `RecentProblem` objects |
| `cf-pending-submit` | One-time | `{ code, languageId, problemUrl, timestamp }` |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Extension API | Chrome Manifest V3 |
| Popup UI | React 19, TypeScript 6 |
| Build tool | Vite 5 |
| Styling | Tailwind CSS v4 |
| Types | @types/chrome |

---

## Permissions

| Permission | Reason |
|---|---|
| `storage` | Save problem relay data and recent problem history |
| `tabs` | Open the compiler tab when user clicks Solve |
| `activeTab` | Read the current Codeforces page URL for popup detection |
| `scripting` | Inject content scripts dynamically when needed |
| Host: `codeforces.com` | Run content script to scrape problem and auto-fill submit |
| Host: `compiler.rijoan.com` | Run compiler-injector to relay storage data into the React app |

---

## Development

```bash
npm run dev    # Vite dev server (popup only)
npm run build  # Full extension build → dist/
npm run lint   # ESLint check
```

After each `npm run build`, reload the extension at `chrome://extensions` to pick up changes.

---

## License

MIT © [Rijoan Maruf](https://rijoan.com)
