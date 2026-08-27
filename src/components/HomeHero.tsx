'use client'

export default function HomeHero({ onStart }: { onStart: () => void }) {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-nav-900">
      <div className="w-[72px] h-[72px] rounded-[10px] bg-brand-500 flex items-center justify-center shadow-[0_0_48px_rgba(27,117,187,0.35)]">
        <span className="text-white text-lg font-black tracking-tight">APP</span>
      </div>

      <div className="text-white font-bold text-3xl mt-5 tracking-tight">APP</div>
      <div className="text-nav-400 text-sm mt-1">Proposal Workspace</div>

      <button onClick={onStart} className="mt-10 btn-primary px-8 py-3.5 text-base">
        시작하기
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
      </button>

      <footer className="absolute bottom-6 left-0 right-0 text-center text-[11px] text-white/40">
        APP © {new Date().getFullYear()} · Automatic Project Proposal Generator
      </footer>
    </div>
  )
}
