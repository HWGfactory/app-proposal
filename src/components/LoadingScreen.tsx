'use client'

import { useEffect, useState } from 'react'

const STEPS = [
  { label: '입력 정보 분석', detail: '카테고리 및 고객사 정보를 파싱합니다' },
  { label: '문서 구조 설계', detail: '목차와 섹션 흐름을 구성합니다' },
  { label: '솔루션 내용 생성', detail: '기술 방안 및 기대효과를 작성합니다' },
  { label: '추진 일정 산출', detail: '마일스톤 및 WBS를 생성합니다' },
  { label: 'Word 문서 포맷팅', detail: '디자인 요소와 서식을 적용합니다' },
  { label: '최종 검토 및 완성', detail: '파일을 패키징합니다' },
]

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
    <div className="max-w-2xl mx-auto">
      <div className="form-section">
        <div className="form-section-header justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-5 h-5 rounded-[3px] bg-brand-500 text-white flex items-center justify-center shrink-0">
              <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="white" strokeOpacity="0.3" strokeWidth="3" />
                <path d="M21 12a9 9 0 00-9-9" stroke="white" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </span>
            <div>
              <div className="font-semibold text-ink-900 text-[13px] leading-tight">제안서 생성 실행 중</div>
              <div className="text-[11px] text-ink-400 mt-0.5">잠시만 기다려주세요. 페이지를 벗어나지 마세요.</div>
            </div>
          </div>
          <span className="badge bg-brand-50 text-brand-600 border border-brand-100">{progress}%</span>
        </div>

        <div className="px-4 pt-4">
          <div className="w-full bg-surface-sunken rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-brand-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* 실행 로그 */}
        <div className="form-section-body pt-3">
          <div className="flex flex-col">
            {STEPS.map((step, i) => {
              const isDone = i < currentStep
              const isActive = i === currentStep
              const isLast = i === STEPS.length - 1
              return (
                <div key={i} className="flex gap-3">
                  {/* 타임라인 */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[9px] transition-all ${
                        isDone
                          ? 'bg-accent-green text-white'
                          : isActive
                          ? 'border-2 border-brand-500 bg-white'
                          : 'border border-line-strong bg-white'
                      }`}
                    >
                      {isDone && (
                        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />}
                    </div>
                    {!isLast && <div className={`w-px flex-1 min-h-[18px] ${isDone ? 'bg-accent-green' : 'bg-line'}`} />}
                  </div>

                  {/* 라벨 */}
                  <div className={`flex-1 min-w-0 pb-4 ${isActive || isDone ? '' : 'opacity-40'}`}>
                    <div className="flex items-center gap-2">
                      <span className={`text-[13px] font-medium ${isActive ? 'text-brand-700' : isDone ? 'text-ink-700' : 'text-ink-400'}`}>
                        {step.label}
                      </span>
                      {isDone && <span className="badge bg-green-50 text-accent-green">완료</span>}
                      {isActive && <span className="badge bg-brand-50 text-brand-600">진행 중</span>}
                    </div>
                    {isActive && <div className="text-[11px] text-ink-400 mt-0.5">{step.detail}</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
