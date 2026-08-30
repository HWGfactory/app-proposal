'use client'

import type { ProposalCategory } from '@/types/proposal'

interface Props {
  activeCategory: ProposalCategory | null
  onSelectModule: (cat: ProposalCategory) => void
  onSelectRfp: () => void
  rfpActive: boolean
  onHome: () => void
}

const MODULES: { id: ProposalCategory; label: string; icon: React.ReactNode }[] = [
  {
    id: 'AI',
    label: 'AI 솔루션',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
        <rect x="7" y="7" width="10" height="10" rx="1.5" />
        <path strokeLinecap="round" d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" />
      </svg>
    ),
  },
  {
    id: 'CLOUD',
    label: '클라우드 전환',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 18a4 4 0 01-.6-7.96A5.5 5.5 0 0117 9.5a4.5 4.5 0 01-.5 8.98H7z" />
      </svg>
    ),
  },
  {
    id: 'ERP',
    label: 'ERP 구축',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
        <rect x="4" y="3" width="16" height="18" rx="1" />
        <path strokeLinecap="round" d="M8 7h1M8 11h1M8 15h1M12 7h1M12 11h1M12 15h1M16 7h1M16 11h1M16 15h1" />
      </svg>
    ),
  },
]

export default function Sidebar({ activeCategory, onSelectModule, onSelectRfp, rfpActive, onHome }: Props) {
  return (
    <aside className="w-60 shrink-0 bg-nav-900 text-nav-400 flex flex-col h-screen sticky top-0">
      {/* 로고 영역 */}
      <button
        onClick={onHome}
        className="flex items-center gap-2.5 px-4 h-14 border-b border-nav-700 shrink-0 hover:bg-nav-800 transition-colors"
      >
        <div className="w-7 h-7 rounded-[4px] bg-brand-500 flex items-center justify-center shrink-0">
          <span className="text-white text-[10px] font-black tracking-tight">APP</span>
        </div>
        <div className="text-left leading-tight">
          <div className="text-white text-[13px] font-semibold">APP</div>
          <div className="text-[10px] text-nav-400">Proposal Workspace</div>
        </div>
      </button>

      {/* 모듈 내비게이션 */}
      <nav className="flex-1 py-3 overflow-y-auto">
        <div className="px-4 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-nav-600">
          모듈
        </div>
        <ul className="flex flex-col gap-0.5 px-2">
          {MODULES.map((m) => {
            const active = activeCategory === m.id
            return (
              <li key={m.id}>
                <button
                  onClick={() => onSelectModule(m.id)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[4px] text-[13px] font-medium transition-colors
                    ${active
                      ? 'bg-brand-500/15 text-white border-l-2 border-brand-400 -ml-px pl-[9px]'
                      : 'text-nav-400 hover:bg-nav-800 hover:text-white border-l-2 border-transparent pl-[9px]'}`}
                >
                  <span className={`w-4 h-4 shrink-0 ${active ? 'text-brand-400' : 'text-nav-600'}`}>{m.icon}</span>
                  {m.label}
                </button>
              </li>
            )
          })}
        </ul>

        <div className="px-4 mt-4 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-nav-600">
          도구
        </div>
        <ul className="flex flex-col gap-0.5 px-2">
          <li>
            <button
              onClick={onSelectRfp}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[4px] text-[13px] font-medium transition-colors
                ${rfpActive
                  ? 'bg-brand-500/15 text-white border-l-2 border-brand-400 -ml-px pl-[9px]'
                  : 'text-nav-400 hover:bg-nav-800 hover:text-white border-l-2 border-transparent pl-[9px]'}`}
            >
              <span className={`w-4 h-4 shrink-0 ${rfpActive ? 'text-brand-400' : 'text-nav-600'}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 3v5h5M9 13h6M9 17h4" />
                </svg>
              </span>
              RFP 분석
            </button>
          </li>
        </ul>
      </nav>

      {/* 하단 상태 */}
      <div className="px-4 py-3 border-t border-nav-700 shrink-0">
        <div className="flex items-center gap-2 text-[11px] text-nav-600">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-green" />
          시스템 정상
        </div>
      </div>
    </aside>
  )
}
