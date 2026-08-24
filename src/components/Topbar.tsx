'use client'

interface Props {
  crumbs: string[]
  showReset: boolean
  onReset: () => void
}

export default function Topbar({ crumbs, showReset, onReset }: Props) {
  return (
    <header className="h-14 bg-white border-b border-line flex items-center justify-between px-5 sticky top-0 z-40 shrink-0">
      {/* 브레드크럼 */}
      <div className="flex items-center gap-1.5 text-[13px] min-w-0">
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-1.5 min-w-0">
            {i > 0 && <span className="crumb-sep">/</span>}
            <span className={i === crumbs.length - 1 ? 'text-ink-900 font-semibold truncate' : 'text-ink-400 truncate'}>
              {c}
            </span>
          </span>
        ))}
      </div>

      {/* 우측 유틸리티 */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-[4px] border border-line bg-surface text-ink-400 text-xs w-52">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
          </svg>
          검색
        </div>
        {showReset && (
          <button
            onClick={onReset}
            className="text-xs text-ink-500 hover:text-ink-900 font-medium flex items-center gap-1.5 px-2.5 py-1.5 rounded-[4px] hover:bg-surface-sunken transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            처음으로
          </button>
        )}
        <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-[11px] font-bold">
          U
        </div>
      </div>
    </header>
  )
}
