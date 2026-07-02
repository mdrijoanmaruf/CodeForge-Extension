import { useEffect, useState } from 'react'
import {
  FiZap,
  FiExternalLink,
  FiLoader,
  FiCheck,
  FiHash,
  FiBarChart2,
  FiList,
  FiClock,
  FiLink,
} from 'react-icons/fi'
import './index.css'
import type { RecentProblem } from './types'

const COMPILER_URL = 'https://compiler.rijoan.com'

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

function StatusBadge({ detected }: { detected: boolean }) {
  return (
    <div className={`inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full border ${
      detected
        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30'
        : 'bg-white/10 text-blue-100 border-white/15'
    }`}>
      <span className={`w-2 h-2 rounded-full ${detected ? 'bg-emerald-400 animate-pulse' : 'bg-blue-200/70'}`} />
      {detected ? 'CF problem detected' : 'Not a CF problem page'}
    </div>
  )
}

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
        } catch {}
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
      chrome.tabs.create({ url: COMPILER_URL })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="popup-root w-full overflow-hidden font-sans text-white select-none">
      {/* header */}
      <div className="popup-header px-4 py-4 border-b backdrop-blur-xl">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <img src="/icons/logo128.png" className="w-7 h-7 rounded-lg object-contain shrink-0" alt="Logo" />
            <div className="min-w-0">
              <p className="text-sm font-bold tracking-wide truncate text-white">CompileLink</p>
              <p className="popup-subtitle text-[11px]">Codeforces Bridge</p>
            </div>
          </div>
          <a
            href={COMPILER_URL}
            onClick={(e) => { e.preventDefault(); chrome.tabs.create({ url: COMPILER_URL }) }}
            className="popup-ext-link p-1.5 rounded-md border transition-colors"
            title="Open compiler"
          >
            <FiExternalLink className="w-3.5 h-3.5 text-blue-300" />
          </a>
        </div>
      </div>

      <div className="p-3 space-y-3">
        <StatusBadge detected={detected} />

        {detected && (
          <div className="popup-problem-card rounded-xl p-3 text-sm space-y-2 border backdrop-blur-md">
            {problem ? (
              <>
                <p className="font-semibold text-white truncate">{problem.name}</p>
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  {[
                    { icon: <FiHash className="w-3 h-3" />, label: 'Contest', value: problem.contest },
                    { icon: <FiBarChart2 className="w-3 h-3" />, label: 'Rating', value: problem.rating },
                    { icon: <FiList className="w-3 h-3" />, label: 'Samples', value: problem.samples },
                  ].map(({ icon, label, value }) => (
                    <div key={label} className="popup-stat-card rounded-lg px-2 py-1 border">
                      <p className="popup-muted inline-flex items-center gap-1">{icon} {label}</p>
                      <p className="font-semibold text-white truncate">{value}</p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="popup-muted text-xs italic inline-flex items-center gap-1.5">
                <FiLoader className="w-3.5 h-3.5 animate-spin" />
                Loading problem info...
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={handleSolve}
          disabled={!detected || loading}
          className={`w-full py-2.5 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-150 border disabled:opacity-60 ${detected ? 'popup-solve-btn' : 'popup-solve-btn-off'}`}
        >
          {loading ? (
            <><FiLoader className="w-4 h-4 animate-spin" /> Opening...</>
          ) : opened ? (
            <><FiCheck className="w-4 h-4" /> Opened!</>
          ) : (
            <><FiZap className="w-4 h-4" /> Solve in CompileLink</>
          )}
        </button>

        {recent.length > 0 && (
          <div className="popup-recent-card rounded-xl p-2.5 border">
            <p className="popup-recent-label text-[11px] font-semibold uppercase tracking-wide mb-2 inline-flex items-center gap-1.5">
              <FiClock className="w-3.5 h-3.5" /> Recent
            </p>
            <ul className="space-y-1">
              {recent.map((r) => (
                <li key={r.problemId}>
                  <button
                    type="button"
                    onClick={() => chrome.tabs.create({ url: r.problemUrl })}
                    className="popup-recent-btn w-full text-left text-xs px-2 py-1.5 rounded-lg transition-colors flex items-center justify-between"
                  >
                    <span className="font-medium text-blue-100 truncate inline-flex items-center gap-1.5 min-w-0">
                      <FiLink className="w-3 h-3 shrink-0 text-blue-400" />
                      <span className="truncate">{r.problemId} - {r.problemName}</span>
                    </span>
                    <span className="popup-recent-time ml-2 shrink-0">{timeAgo(r.openedAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="popup-footer border-t pt-2 flex items-center justify-between text-xs">
          <span>v1.0.0</span>
          <button
            type="button"
            onClick={() => chrome.tabs.create({ url: COMPILER_URL })}
            className="hover:text-white transition-colors"
          >
            Open compiler
          </button>
        </div>
      </div>
    </div>
  )
}
