'use client'

import './HomeHero.css'

/**
 * 홈 화면. 배경은 kokonutui의 Shape Hero를 Orange·Black·White로 옮긴 것이다.
 *
 * 원본은 도형마다 다른 색(indigo·rose·violet·amber·emerald·blue·purple·teal)을
 * 쓰지만, 이 디자인 시스템은 오렌지를 유일한 채색으로 둔다. 그래서 도형은
 * 오렌지 램프 세 단계로 좁히고, 구조를 잡는 두 개만 검정으로 남겼다.
 * 색을 다 오렌지로 칠하면 덩어리로 뭉개지고, 검정이 섞여야 대비가 산다.
 */

interface Shape {
  /** 위치는 Tailwind 클래스로, 나머지는 인라인 스타일로 준다 */
  position: string
  width: number
  height: number
  rotate: number
  radius: number
  /** 왼쪽 끝 색. 오른쪽으로 갈수록 투명해진다 */
  tint: string
  delay: number
}

const ORANGE_BRIGHT = 'rgba(249, 115, 22, 0.26)' // brand-400
const ORANGE_DEEP = 'rgba(234, 88, 12, 0.22)' // brand-500
const ORANGE_PALE = 'rgba(253, 186, 116, 0.34)' // brand-200
const INK = 'rgba(17, 17, 17, 0.09)' // ink-900

const SHAPES: Shape[] = [
  { position: 'top-[-10%] left-[-15%]', width: 300, height: 500, rotate: -8, radius: 24, tint: ORANGE_BRIGHT, delay: 0.3 },
  { position: 'right-[-20%] bottom-[-5%]', width: 600, height: 200, rotate: 15, radius: 20, tint: ORANGE_DEEP, delay: 0.5 },
  { position: 'top-[40%] left-[-5%]', width: 300, height: 300, rotate: 24, radius: 32, tint: ORANGE_PALE, delay: 0.4 },
  { position: 'top-[5%] right-[10%]', width: 250, height: 100, rotate: -20, radius: 12, tint: INK, delay: 0.6 },
  { position: 'top-[45%] right-[-10%]', width: 400, height: 150, rotate: 35, radius: 16, tint: ORANGE_BRIGHT, delay: 0.7 },
  { position: 'bottom-[10%] left-[20%]', width: 200, height: 200, rotate: -25, radius: 28, tint: ORANGE_DEEP, delay: 0.2 },
  { position: 'top-[15%] left-[40%]', width: 150, height: 80, rotate: 45, radius: 10, tint: INK, delay: 0.8 },
  { position: 'top-[60%] left-[25%]', width: 450, height: 120, rotate: -12, radius: 18, tint: ORANGE_PALE, delay: 0.9 },
]

function ElegantShape({ position, width, height, rotate, radius, tint, delay }: Shape) {
  return (
    <div
      className={`hero-shape ${position}`}
      style={
        {
          width,
          height,
          borderRadius: radius,
          '--rot': `${rotate}deg`,
          '--delay': `${delay}s`,
          '--tint': tint,
        } as React.CSSProperties
      }
    >
      <div className="hero-shape-float" style={{ borderRadius: radius }}>
        <div className="hero-shape-face" />
      </div>
    </div>
  )
}

export default function HomeHero({ onStart }: { onStart: () => void }) {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-surface">
      {/* 아주 옅은 오렌지 안개 — 화면 전체의 바탕 온도를 올린다 */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-500/[0.03] via-transparent to-brand-200/[0.05] blur-3xl" />

      <div aria-hidden className="absolute inset-0 overflow-hidden">
        {SHAPES.map((shape) => (
          <ElegantShape key={shape.position} {...shape} />
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center px-4">
        <div className="hero-enter hero-enter-1 w-[76px] h-[76px] rounded-[18px] bg-brand-500 flex items-center justify-center shadow-[0_10px_30px_-8px_rgba(234,88,12,0.45)]">
          <span className="text-white text-lg font-black tracking-tight">APP</span>
        </div>

        <p className="hero-enter hero-enter-2 mt-6 text-sm text-ink-500 tracking-wide">
          Proposal Workspace
        </p>

        <button
          onClick={onStart}
          className="hero-enter hero-enter-3 mt-9 btn-primary px-8 py-3.5 text-base"
        >
          시작하기
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>
      </div>

      {/* 위아래를 눌러 도형이 잘린 티가 나지 않게 한다 */}
      <div aria-hidden className="pointer-events-none absolute inset-0 hero-veil" />

      <footer className="absolute bottom-6 left-0 right-0 text-center text-[11px] text-ink-400">
        APP © {new Date().getFullYear()} · Automatic Project Proposal Generator
      </footer>
    </div>
  )
}
