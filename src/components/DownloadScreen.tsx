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
    <div className="max-w-2xl mx-auto">
      {/* 레코드 요약 */}
      <div className="form-section mb-4">
        <div className="form-section-header justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-5 h-5 rounded-[3px] bg-accent-green text-white flex items-center justify-center shrink-0">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </span>
            <div className="font-semibold text-ink-900 text-[13px] leading-tight">제안서 생성 완료</div>
          </div>
          <span className="badge bg-green-50 text-accent-green border border-green-100">Complete</span>
        </div>

        <div className="form-section-body">
          <p className="text-sm text-ink-500 mb-3">Word 파일이 자동으로 다운로드됩니다. 완료되지 않았다면 아래 버튼을 눌러주세요.</p>
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-[4px] bg-surface-sunken border border-line mb-4">
            <svg className="w-4 h-4 text-brand-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M7 21h10a2 2 0 002-2V9.5L14.5 4H7a2 2 0 00-2 2v13a2 2 0 002 2z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M14 4v5h5" />
            </svg>
            <span className="text-xs font-mono text-ink-700 truncate">{fileName}</span>
          </div>

          <div className="flex items-center gap-2">
            <a href={downloadUrl} download={fileName} className="btn-primary">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
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

      {/* 관련 목록: 다음 단계 */}
      <div className="form-section">
        <div className="form-section-header">
          <span className="section-label">다음 단계 안내</span>
        </div>
        <div className="divide-y divide-line">
          {NEXT_STEPS.map((s) => (
            <div key={s.icon} className="flex items-start gap-3 px-4 py-3">
              <span className="text-[10px] font-bold text-ink-300 mt-0.5 shrink-0 w-4">{s.icon}</span>
              <span className="text-[13px] text-ink-600 leading-relaxed">{s.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
