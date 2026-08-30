'use client'

import { useEffect, useState } from 'react'

const STEPS = [
  { label: '입력 정보 분석', detail: '카테고리 및 고객사 정보를 파싱합니다' },
  { label: '문서 구조 설계', detail: '목차와 섹션 흐름을 구성합니다' },
  { label: '솔루션 내용 생성', detail: '기술 방안 및 기대효과를 작성합니다' },
  { label: '추진 일정 산출', detail: '마일스톤 및 WBS를 생성합니다' },
  { label: '슬라이드 레이아웃 구성', detail: '표지·요구사항 대응표·일정 슬라이드를 배치합니다' },
  { label: '최종 검토 및 완성', detail: '파일을 패키징합니다' },
]

// 기다리는 화면만 블랙 그라운드로 뒤집는다 (AppShell이 step === 'loading'일 때 다크로 전환)
export default function LoadingScreen() {
  const [currentStep, setCurrentStep] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const total = STEPS.length
    let step = 0

    const interval = setInterval(() => {
      if (step < total - 1) {
        step += 1
        setCurrentStep(step)
        setProgress(Math.round((step / (total - 1)) * 90))
      }
    }, 900)

    const progInterval = setInterval(() => {
      setProgress((prev) => (prev < 95 ? prev + 1 : prev))
    }, 200)

    return () => {
      clearInterval(interval)
      clearInterval(progInterval)
    }
  }, [])

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-[620px] flex flex-col gap-[26px]">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight mb-1.5">제안서 생성 실행 중</h1>
            <p className="text-[13px] text-ink-400 font-light">
              잠시만 기다려주세요. 페이지를 벗어나지 마세요.
            </p>
          </div>
          <span className="text-[26px] font-semibold text-brand-500 font-num tabular-nums leading-none">
            {progress}%
          </span>
        </div>

        <div className="w-full h-1 rounded-full bg-line-dark overflow-hidden">
          <div
            className="h-full bg-brand-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex flex-col">
          {STEPS.map((step, i) => {
            const isDone = i < currentStep
            const isActive = i === currentStep
            const isLast = i === STEPS.length - 1
            return (
              <div key={step.label} className={`flex gap-3.5 ${isDone || isActive ? '' : 'opacity-40'}`}>
                <div className="flex flex-col items-center">
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                      isDone
                        ? 'bg-brand-500'
                        : isActive
                        ? 'border-2 border-brand-500'
                        : 'border border-ink-600'
                    }`}
                  >
                    {isDone && (
                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="#111111" strokeWidth={3.6}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />}
                  </span>
                  {!isLast && (
                    <span className={`w-px flex-1 min-h-[20px] ${isDone ? 'bg-brand-500' : 'bg-line-dark'}`} />
                  )}
                </div>

                <div className={`flex-1 min-w-0 ${isLast ? '' : 'pb-[18px]'}`}>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${isActive ? 'font-medium text-brand-500' : 'text-white'}`}>
                      {step.label}
                    </span>
                    {isDone && <span className="badge bg-line-dark text-ink-400">완료</span>}
                    {isActive && <span className="badge bg-brand-900 text-brand-200">진행 중</span>}
                  </div>
                  {isActive && (
                    <div className="text-xs text-ink-400 mt-1 font-light">{step.detail}</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
