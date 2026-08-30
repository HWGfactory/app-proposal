'use client'

import './HomeHero.css'

// 홈 화면. 밝은 작업 면(#FAFAFA) 위에 오렌지만으로 깊이를 만든다.
// 배경 오브 3개가 서로 다른 주기로 천천히 떠다니고, 로고 뒤 광원이 숨쉬듯 밝아진다.
// 애니메이션과 그라데이션 정의는 HomeHero.css에 있다.
export default function HomeHero({ onStart }: { onStart: () => void }) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-surface flex flex-col items-center justify-center">
      {/* 배경 오브 */}
      <div aria-hidden className="absolute inset-0 pointer-events-none">
        <span className="hero-orb hero-orb-a" />
        <span className="hero-orb hero-orb-b" />
        <span className="hero-orb hero-orb-c" />
      </div>

      <div aria-hidden className="absolute inset-0 pointer-events-none hero-vignette" />

      {/* 로고 */}
      <div className="relative hero-enter hero-enter-1">
        <span aria-hidden className="hero-glow" />
        <div className="relative w-[76px] h-[76px] rounded-[18px] bg-brand-500 flex items-center justify-center shadow-[0_10px_30px_-8px_rgba(234,88,12,0.55)]">
          <span className="text-white text-lg font-black tracking-tight">APP</span>
        </div>
      </div>

      <div className="relative mt-6 text-sm text-ink-500 tracking-wide hero-enter hero-enter-2">
        Proposal Workspace
      </div>

      <button
        onClick={onStart}
        className="relative mt-9 btn-primary px-8 py-3.5 text-base hero-enter hero-enter-3"
      >
        시작하기
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
      </button>

      <footer className="absolute bottom-6 left-0 right-0 text-center text-[11px] text-ink-400">
        APP © {new Date().getFullYear()} · Automatic Project Proposal Generator
      </footer>
    </div>
  )
}
