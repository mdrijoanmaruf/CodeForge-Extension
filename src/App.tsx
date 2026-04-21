import { useEffect, useState } from 'react'
import './index.css'
import type { RecentProblem } from './types'

const COMPILER_URL = 'http://localhost:3000'

// ── helpers ──────────────────────────────────────────────────────────────────

function isCFProblemUrl(url: string): boolean {
  return /https?:\/\/codeforces\.com\/(problemset\/problem|contest\/\d+\/problem|gym\/\d+\/problem)/.test(url)
}

async function getActiveTab(): Promise<chrome.tabs.Tab | null> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
  return tabs[0] ?? null
}

async function loadRecent(): Promise<RecentProblem[]> {
  const result = await chrome.storage.local.get('cf-recent-problems')
  return (result['cf-recent-problems'] as RecentProblem[]) ?? []
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ── Badge ─────────────────────────────────────────────────────────────────────

function StatusBadge({ detected }: { detected: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${
      detected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
    }`}>
      <span className={`w-2 h-2 rounded-full ${detected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
      {detected ? 'CF problem detected' : 'Not a CF problem page'}
    </div>
  )
}

// ── Main App ──────────────────────────────────────────────────────────────────

export default function App() {
  const [tab, setTab] = useState<chrome.tabs.Tab | null>(null)
  const [detected, setDetected] = useState(false)
  const [problem, setProblem] = useState<{ name: string; contest: string; rating: string; samples: number } | null>(null)
  const [recent, setRecent] = useState<RecentProblem[]>([])
  const [loading, setLoading] = useState(false)
  const [opened, setOpened] = useState(false)

  useEffect(() => {
    ;(async () => {
      const t = await getActiveTab()
      setTab(t)
      if (t?.url && isCFProblemUrl(t.url)) {
        setDetected(true)
        // Ask content script for scraped data
        try {
          const response = await chrome.tabs.sendMessage(t.id!, { action: 'getProblemInfo' })
          if (response?.problemName) {
            setProblem({
              name: response.problemName,
              contest: response.contestId ? `#${response.contestId}` : '—',
              rating: response.rating || '—',
              samples: response.testCases?.length ?? 0,
            })
          }
        } catch {
          // Content script not yet injected or no response — still show detected
        }
      }
      const r = await loadRecent()
      setRecent(r.slice(0, 5))
    })()
  }, [])

  async function handleSolve() {
    if (!tab?.id) return
    setLoading(true)
    try {
      await chrome.tabs.sendMessage(tab.id, { action: 'solve' })
      setOpened(true)
      setTimeout(() => setOpened(false), 2500)
    } catch {
      // Fallback: open compiler directly
      chrome.tabs.create({ url: COMPILER_URL })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-[400px] bg-white font-sans select-none">
      {/* Header */}
      <div className="bg-blue-600 text-white px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold">⚡ Rijoan Compiler</span>
        </div>
        <p className="text-blue-200 text-xs mt-0.5">Codeforces Bridge</p>
      </div>

      <div className="p-3 space-y-3">
        {/* Detection status */}
        <StatusBadge detected={detected} />

        {/* Problem info (only when on CF page) */}
        {detected && (
          <div className="border border-gray-200 rounded-lg p-3 text-sm space-y-1.5 bg-gray-50">
            {problem ? (
              <>
                <div className="font-semibold text-gray-800 truncate">{problem.name}</div>
                <div className="flex gap-4 text-xs text-gray-500">
                  <span>Contest <span className="font-medium text-gray-700">{problem.contest}</span></span>
                  <span>Rating <span className="font-medium text-gray-700">{problem.rating}</span></span>
                  <span>Samples <span className="font-medium text-gray-700">{problem.samples}</span></span>
                </div>
              </>
            ) : (
              <div className="text-xs text-gray-400 italic">Loading problem info…</div>
            )}
          </div>
        )}

        {/* Solve button */}
        <button
          type="button"
          onClick={handleSolve}
          disabled={!detected || loading}
          className={`w-full py-2 px-4 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-colors
            ${detected
              ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            } disabled:opacity-60`}
        >
          {loading ? (
            <><span className="animate-spin">⏳</span> Opening…</>
          ) : opened ? (
            <><span>✓</span> Opened!</>
          ) : (
            <><span>⚡</span> Solve on Rijoan Compiler</>
          )}
        </button>

        {/* Recent problems */}
        {recent.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Recent</p>
            <ul className="space-y-1">
              {recent.map((r) => (
                <li key={r.problemId}>
                  <button
                    type="button"
                    onClick={() => chrome.tabs.create({ url: r.problemUrl })}
                    className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-gray-100 flex items-center justify-between group"
                  >
                    <span className="font-medium text-gray-700 truncate">{r.problemId} — {r.problemName}</span>
                    <span className="text-gray-400 ml-2 shrink-0">{timeAgo(r.openedAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Footer */}
        <div className="border-t pt-2 flex items-center justify-between text-xs text-gray-400">
          <span>v1.0.0</span>
          <button
            type="button"
            onClick={() => chrome.tabs.create({ url: COMPILER_URL })}
            className="hover:text-blue-600 transition-colors"
          >
            Open compiler ↗
          </button>
        </div>
      </div>
    </div>
  )
}
