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
  FiInfo,
  FiChevronRight,
  FiCode,
  FiSettings
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
    <div className="w-full h-full font-sans text-gray-900 select-none p-2.5">
      <div className="bg-white rounded-[20px] shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-[42px] h-[42px] rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center shrink-0">
              <img src="/icons/logo128.png" className="w-[30px] h-[30px] object-contain" alt="Logo" />
            </div>
            <div className="min-w-0">
              <p className="text-[17px] font-bold tracking-tight text-gray-900 truncate leading-tight">CompileLink</p>
              <p className="text-xs text-gray-500 font-medium">Codeforces Bridge</p>
            </div>
          </div>
          <a
            href={COMPILER_URL}
            onClick={(e) => { e.preventDefault(); chrome.tabs.create({ url: COMPILER_URL }) }}
            className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-blue-500 hover:bg-gray-50 transition-colors shrink-0"
            title="Open compiler"
          >
            <FiExternalLink className="w-4 h-4" />
          </a>
        </div>

        <div className="px-4 pb-4 space-y-4">
          {/* Status Box */}
          <div className={`rounded-[16px] p-3.5 border flex gap-3.5 items-start ${detected ? 'border-emerald-100 bg-emerald-50/50' : 'border-blue-100 bg-blue-50/50'}`}>
            <div className={`w-6 h-6 rounded-full text-white flex items-center justify-center shrink-0 mt-0.5 ${detected ? 'bg-emerald-500' : 'bg-blue-500'}`}>
              {detected ? <FiCheck className="w-3.5 h-3.5" /> : <FiInfo className="w-3.5 h-3.5" />}
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-gray-800 leading-snug">
                {detected ? 'Codeforces problem detected' : "You're not on a Codeforces problem page"}
              </p>
              {detected ? (
                <div className="mt-1">
                  <p className="text-[12.5px] text-gray-600 font-medium truncate mb-1.5">{problem?.name || 'Loading problem...'}</p>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-gray-500 font-medium inline-flex items-center gap-1">
                      <FiHash className="w-3 h-3 text-gray-400" /> {problem?.contest}
                    </span>
                    <span className="text-[11px] text-gray-500 font-medium inline-flex items-center gap-1">
                      <FiBarChart2 className="w-3 h-3 text-gray-400" /> {problem?.rating}
                    </span>
                    <span className="text-[11px] text-gray-500 font-medium inline-flex items-center gap-1">
                      <FiList className="w-3 h-3 text-gray-400" /> {problem?.samples} Samples
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-[12.5px] text-gray-500 mt-0.5 leading-snug">
                  Open a problem page on Codeforces to use CompileLink.
                </p>
              )}
            </div>
          </div>

          {/* Action Button */}
          <button
            type="button"
            onClick={handleSolve}
            disabled={!detected || loading}
            className={`w-full py-3.5 px-4 rounded-[14px] font-semibold text-[15px] flex items-center justify-center gap-2 transition-all duration-150 ${
              detected
                ? 'bg-[#3b82f6] hover:bg-[#2563eb] text-white shadow-[0_4px_14px_rgba(59,130,246,0.3)]'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {loading ? (
              <><FiLoader className="w-[18px] h-[18px] animate-spin" /> Opening...</>
            ) : opened ? (
              <><FiCheck className="w-[18px] h-[18px]" /> Opened!</>
            ) : (
              <>
                <FiZap className="w-[18px] h-[18px]" />
                Solve in CompileLink
                <FiChevronRight className="w-[18px] h-[18px] ml-auto opacity-70" />
              </>
            )}
          </button>

          {/* Recent Problems List */}
          {recent.length > 0 && (
            <div className="rounded-[16px] border border-gray-100 bg-white shadow-sm overflow-hidden">
              <div className="px-4 py-3 flex items-center justify-between border-b border-gray-50">
                <p className="text-[13px] font-semibold text-gray-800 flex items-center gap-2">
                  <FiClock className="w-[15px] h-[15px] text-gray-500" /> Recent Problems
                </p>
                <a href="#" onClick={(e) => e.preventDefault()} className="text-[11px] font-semibold text-blue-600 hover:underline">View all</a>
              </div>
              <ul className="flex flex-col">
                {recent.map((r, i) => (
                  <li key={r.problemId} className={i !== recent.length - 1 ? "border-b border-gray-50" : ""}>
                    <button
                      type="button"
                      onClick={() => chrome.tabs.create({ url: r.problemUrl })}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50/80 transition-colors flex items-center gap-3 group"
                    >
                      <FiLink className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span className="font-semibold text-[13px] text-gray-800 truncate group-hover:text-blue-600 transition-colors">
                        {r.problemId} - {r.problemName}
                      </span>
                      <span className="text-[11.5px] text-gray-400 ml-auto shrink-0 font-medium tabular-nums">{timeAgo(r.openedAt)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between mt-auto">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-[7px] bg-[#1d4ed8] text-white flex items-center justify-center">
              <FiCode className="w-[13px] h-[13px]" />
            </div>
            <span className="text-[11px] font-semibold text-gray-500">v1.0.0</span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://rijoan.com"
              onClick={(e) => { e.preventDefault(); chrome.tabs.create({ url: 'https://rijoan.com' }) }}
              className="text-[11.5px] text-gray-500 hover:text-blue-600 transition-colors inline-flex items-center gap-1 font-medium"
            >
              Developed by <span className="font-bold text-gray-700">Md Rijoan Maruf</span>
            </a>
            <button
              type="button"
              onClick={() => chrome.tabs.create({ url: COMPILER_URL })}
              className="text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1.5 text-[11.5px] font-semibold ml-2"
              title="Open settings"
            >
              <FiSettings className="w-3.5 h-3.5" />
              Open Compiler
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
