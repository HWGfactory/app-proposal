'use client'

import Logo from '@/components/Logo'
import GlitterWrap from '@/components/GlitterWrap'

export default function HomeHero({ onStart }: { onStart: () => void }) {
  return (
    <div className="min-h-screen w-full relative flex items-center justify-center overflow-hidden bg-nav-900">
      {/* 글리터 워프 배경 */}
      <div className="absolute inset-0">
        <GlitterWrap style={{ width: '100%', height: '100%' }} />
      </div>

      <div className="relative flex flex-col items-center px-6">
        <Logo className="w-[300px] sm:w-[400px] h-auto drop-shadow-[0_0_40px_rgba(20,184,166,0.35)]" />

        <button
          onClick={onStart}
          className="mt-10 btn-primary px-8 py-3.5 text-base"
        >
          시작하기
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>
      </div>

      <footer className="absolute bottom-6 left-0 right-0 text-center text-[11px] text-white/40">
        APP © {new Date().getFullYear()} · Automatic Project Proposal Generator
      </footer>
    </div>
  )
}
