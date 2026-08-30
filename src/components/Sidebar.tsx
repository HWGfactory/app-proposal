'use client'

interface Props {
  activeStep: string | null
  onNewProposal: () => void
  onHome: () => void
}

// RFP 업로드 → 분석 → 정보 입력 → 완료. 사이드바는 현재 어느 단계인지만 보여주며,
// 임의의 단계로 건너뛰는 것은 허용하지 않는다 (앞 단계 결과가 있어야 진행 가능).
const STEPS: { ids: string[]; label: string; icon: React.ReactNode }[] = [
  {
    ids: ['upload', 'analysis'],
    label: 'RFP 분석',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M14 3v5h5M9 13h6M9 17h4" />
      </svg>
    ),
  },
  {
    ids: ['form'],
    label: '제안서 작성',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    ),
  },
  {
    ids: ['loading', 'done'],
    label: '문서 생성',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15V3m0 12l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
      </svg>
    ),
  },
]

export default function Sidebar({ activeStep, onNewProposal, onHome }: Props) {
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

      <nav className="flex-1 py-3 overflow-y-auto">
        <div className="px-2 mb-3">
          <button
            onClick={onNewProposal}
            className="w-full flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-[4px] bg-brand-500 hover:bg-brand-600 text-white text-[13px] font-semibold transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            새 제안서
          </button>
        </div>

        <div className="px-4 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-nav-600">
          진행 단계
        </div>
        <ul className="flex flex-col gap-0.5 px-2">
          {STEPS.map((s) => {
            const active = activeStep !== null && s.ids.includes(activeStep)
            return (
              <li key={s.label}>
                <div
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[4px] text-[13px] font-medium
                    ${active
                      ? 'bg-brand-500/15 text-white border-l-2 border-brand-400 -ml-px pl-[9px]'
                      : 'text-nav-400 border-l-2 border-transparent pl-[9px]'}`}
                >
                  <span className={`w-4 h-4 shrink-0 ${active ? 'text-brand-400' : 'text-nav-600'}`}>{s.icon}</span>
                  {s.label}
                </div>
              </li>
            )
          })}
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
