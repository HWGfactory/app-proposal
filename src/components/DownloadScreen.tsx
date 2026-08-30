'use client'

import { useEffect, useRef } from 'react'

interface Props {
  downloadUrl: string
  fileName: string
  onReset: () => void
}

const NEXT_STEPS = [
  { icon: '01', text: '제안서 내용을 검토하고 고객사 맞춤 내용으로 보완하세요' },
  { icon: '02', text: '회사 로고 및 브랜드 색상을 표지에 추가하세요' },
  { icon: '03', text: '실제 견적 및 비용 산출 내역을 업데이트하세요' },
  { icon: '04', text: 'PDF 변환 후 고객사에 공식 제안서로 발송하세요' },
]

export default function DownloadScreen({ downloadUrl, fileName, onReset }: Props) {
  const autoRef = useRef(false)

  useEffect(() => {
    if (autoRef.current) return
    autoRef.current = true
    const a = document.createElement('a')
    a.href = downloadUrl
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }, [downloadUrl, fileName])

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-[660px] flex flex-col gap-[18px]">
        <div className="card overflow-hidden">
          <div className="px-6 pt-[26px] pb-[22px] flex flex-col items-center gap-3.5 text-center border-b border-surface-sunken">
            <span className="w-11 h-11 rounded-full bg-brand-500 flex items-center justify-center">
              <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </span>
            <div>
              <h1 className="text-[22px] font-bold text-ink-900 tracking-tight mb-1.5">제안서 생성 완료</h1>
              <p className="text-[13px] text-ink-700 font-light">
                파일이 자동으로 다운로드됩니다. 완료되지 않았다면 아래 버튼을 눌러주세요.
              </p>
            </div>
          </div>

          <div className="px-6 pt-5 pb-6 flex flex-col gap-4">
            <div className="flex items-center gap-3 px-3.5 py-3 rounded-[8px] bg-surface border border-line">
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="#EA580C" strokeWidth={1.6}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.5L14.5 4H7a2 2 0 00-2 2v13a2 2 0 002 2z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 4v5h5" />
              </svg>
              <span className="text-xs text-ink-900 font-num truncate flex-1">{fileName}</span>
            </div>

            <div className="flex items-center gap-2.5">
              <a href={downloadUrl} download={fileName} className="btn-primary">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                다시 다운로드
              </a>
              <button onClick={onReset} className="btn-secondary">
                새 제안서 만들기
              </button>
            </div>
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="px-[18px] py-[11px] bg-ink-900">
            <span className="text-[11px] font-bold uppercase tracking-widest text-white font-num">
              다음 단계 안내
            </span>
          </div>
          <div>
            {NEXT_STEPS.map((s, i) => (
              <div
                key={s.icon}
                className={`flex items-start gap-3.5 px-[18px] py-[13px] ${
                  i < NEXT_STEPS.length - 1 ? 'border-b border-surface-sunken' : ''
                }`}
              >
                <span className="text-[11px] font-bold text-brand-500 w-[18px] shrink-0 mt-0.5 font-num">
                  {s.icon}
                </span>
                <span className="text-[13px] text-ink-700 leading-relaxed">{s.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
