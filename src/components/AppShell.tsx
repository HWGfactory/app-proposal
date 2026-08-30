'use client'

// 앱 셸: 블랙 상단 바 + (선택) 4단계 표시 + 본문 + 푸터.
// 좌측 사이드바(Sidebar.tsx)를 대체한다.

interface Props {
  step: 'upload' | 'analysis' | 'wintheme' | 'form' | 'loading' | 'done'
  onReset: () => void
  children: React.ReactNode
}

const FLOW: { label: string; steps: Props['step'][] }[] = [
  { label: 'RFP 업로드', steps: ['upload', 'analysis'] },
  { label: 'Win Theme', steps: ['wintheme'] },
  { label: '제안서 작성', steps: ['form'] },
  { label: '문서 생성', steps: ['loading'] },
  { label: '다운로드', steps: ['done'] },
]

function Check() {
  return (
    <span className="w-3.5 h-3.5 rounded-full bg-brand-500 flex items-center justify-center">
      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={3.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </span>
  )
}

export default function AppShell({ step, onReset, children }: Props) {
  const activeIndex = FLOW.findIndex((f) => f.steps.includes(step))
  const dark = step === 'loading'

  return (
    <div className={`min-h-screen flex flex-col ${dark ? 'bg-ink-900' : 'bg-surface'}`}>
      {/* 상단 바 — 항상 블랙 */}
      <header
        className={`h-14 bg-ink-900 flex items-center justify-between px-6 shrink-0 ${
          dark ? 'border-b border-line-dark' : ''
        }`}
      >
        <button onClick={onReset} className="flex items-center gap-2.5">
          <span className="w-[26px] h-[26px] rounded-[5px] bg-brand-500 flex items-center justify-center shrink-0">
            <span className="text-white text-[9px] font-bold tracking-tight font-num">APP</span>
          </span>
          <span className="text-white text-sm font-semibold tracking-tight font-num">
            Automatic Project Proposal
          </span>
        </button>

        {!dark && (
          <button
            onClick={onReset}
            className="text-xs text-ink-400 hover:text-white transition-colors flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            처음으로
          </button>
        )}
      </header>

      {/* 4단계 표시 — 생성 중에는 감춘다 */}
      {!dark && (
        <div className="h-11 bg-surface-card border-b border-line flex items-center justify-center gap-5 shrink-0">
          {FLOW.map((f, i) => (
            <div key={f.label} className="flex items-center gap-5">
              {i > 0 && (
                <span className={`w-7 h-px ${i <= activeIndex ? 'bg-brand-500' : 'bg-line'}`} />
              )}
              <span
                className={`flex items-center gap-[7px] text-xs ${
                  i === activeIndex
                    ? 'text-ink-900 font-medium'
                    : i < activeIndex
                    ? 'text-ink-500'
                    : 'text-ink-400'
                }`}
              >
                {i < activeIndex ? (
                  <Check />
                ) : (
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${i === activeIndex ? 'bg-brand-500' : 'bg-ink-300'}`}
                  />
                )}
                {f.label}
              </span>
            </div>
          ))}
        </div>
      )}

      <main className="flex-1 flex flex-col px-6 py-8">{children}</main>

      {!dark && (
        <footer className="text-center py-3.5 text-[11px] text-ink-400 border-t border-line bg-surface-card shrink-0">
          APP © {new Date().getFullYear()} · Automatic Project Proposal Generator
        </footer>
      )}
    </div>
  )
}
