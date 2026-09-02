'use client'

// 앱 셸: 블랙 상단 바 + (선택) 4단계 표시 + 본문 + 푸터.
// 좌측 사이드바(Sidebar.tsx)를 대체한다.

/** 셸이 아는 단계. page.tsx의 Step은 여기에 'home'을 더한 것이다. */
export type ShellStep = 'upload' | 'analysis' | 'wintheme' | 'form' | 'loading' | 'done'
type Step = ShellStep

interface Props {
  step: Step
  /**
   * 되돌아갈 수 있는 단계. 현재 위치가 아니라 가진 데이터로 정한다.
   * 뒤로 이동하면 step은 앞으로 당겨지므로 그것만으로는 어디까지 갔는지 알 수 없고,
   * 데이터 없이 이동하면 본문이 아무것도 렌더하지 않아 빈 화면이 된다.
   */
  reached: Step[]
  onNavigate: (step: Step) => void
  onReset: () => void
  children: React.ReactNode
}

const FLOW: { label: string; steps: Step[] }[] = [
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

export default function AppShell({ step, reached, onNavigate, onReset, children }: Props) {
  const activeIndex = FLOW.findIndex((f) => f.steps.includes(step))
  const dark = step === 'loading'

  // 한 칸이 화면 둘을 묶는 경우("RFP 업로드" = 업로드·분석)에는 뒤쪽을 고른다.
  // 분석 결과가 있는데 업로드 화면으로 보내면 작업이 날아간 것처럼 보인다.
  // 다시 올리는 길은 분석 화면의 "다른 파일 분석"에 있다.
  const targetOf = (steps: Step[]) =>
    [...steps].reverse().find((s) => reached.includes(s)) ?? null

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
          {FLOW.map((f, i) => {
            const target = targetOf(f.steps)
            // 지금 있는 칸을 눌러도 갈 곳이 없으므로 누를 수 있게 두지 않는다.
            const clickable = target !== null && i !== activeIndex
            const tone =
              i === activeIndex
                ? 'text-ink-900 font-medium'
                : i < activeIndex
                ? 'text-ink-500'
                : 'text-ink-400'
            const inner = (
              <>
                {i < activeIndex ? (
                  <Check />
                ) : (
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${i === activeIndex ? 'bg-brand-500' : 'bg-ink-300'}`}
                  />
                )}
                {f.label}
              </>
            )

            return (
              <div key={f.label} className="flex items-center gap-5">
                {i > 0 && (
                  <span className={`w-7 h-px ${i <= activeIndex ? 'bg-brand-500' : 'bg-line'}`} />
                )}
                {clickable ? (
                  <button
                    type="button"
                    onClick={() => onNavigate(target)}
                    className={`flex items-center gap-[7px] text-xs ${tone} hover:text-ink-900 transition-colors`}
                  >
                    {inner}
                  </button>
                ) : (
                  <span className={`flex items-center gap-[7px] text-xs ${tone}`}>{inner}</span>
                )}
              </div>
            )
          })}
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
