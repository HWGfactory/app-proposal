'use client'

import { useRef, useState } from 'react'
import { extractPdfText } from '@/lib/rfp/extractText'
import { analyzeRfp, type RfpAnalysisResult } from '@/lib/rfp/analyze'
import { buildStrategyBrief, type StrategyBrief } from '@/lib/rfp/strategy'

interface Props {
  onAnalyzed: (result: RfpAnalysisResult, brief: StrategyBrief, fileName: string) => void
}

// 업로드는 화면에서 유일한 일이다 — 정중앙에 드롭존만 둔다.
export default function RfpUploader({ onAnalyzed }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')

  const handleFile = async (file: File) => {
    if (file.type !== 'application/pdf') {
      setError('PDF 파일만 업로드할 수 있습니다.')
      return
    }

    setBusy(true)
    setError('')
    setFileName(file.name)
    try {
      const extracted = await extractPdfText(file)
      const analysis = analyzeRfp(extracted)
      onAnalyzed(analysis, buildStrategyBrief(extracted, analysis), file.name)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'PDF를 읽는 중 오류가 발생했습니다.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-[620px] flex flex-col items-center gap-7">
        <div className="flex flex-col items-center gap-2.5 text-center">
          <h1 className="text-[28px] font-bold text-ink-900 tracking-tight leading-tight">
            제안요청서(RFP) 업로드
          </h1>
          <p className="text-sm text-ink-700 font-light leading-relaxed max-w-[520px] text-pretty">
            텍스트가 포함된 PDF에서 요구사항과 평가 기준을 자동으로 추출합니다.
            파일은 브라우저 안에서만 처리되며 서버로 전송되지 않습니다.
          </p>
        </div>

        <div className="w-full card p-3">
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              const file = e.dataTransfer.files?.[0]
              if (file) handleFile(file)
            }}
            onClick={() => !busy && inputRef.current?.click()}
            className={`dropzone ${busy ? 'cursor-wait border-brand-200 bg-brand-50' : 'cursor-pointer'} ${
              dragging ? 'dropzone-active' : ''
            }`}
          >
            {busy ? (
              <>
                <svg className="w-[30px] h-[30px] animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="#EA580C" strokeWidth="3" opacity="0.22" />
                  <path fill="#EA580C" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
                </svg>
                <span className="text-[15px] font-medium text-ink-900">PDF를 분석하는 중입니다...</span>
                <span className="text-xs text-ink-500 font-num">{fileName}</span>
              </>
            ) : (
              <>
                <span className="w-[52px] h-[52px] rounded-[10px] bg-brand-100 flex items-center justify-center">
                  <svg className="w-[26px] h-[26px]" fill="none" viewBox="0 0 24 24" stroke="#EA580C" strokeWidth={1.7}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0L8 8m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
                  </svg>
                </span>
                <span className="flex flex-col items-center gap-1.5">
                  <span className="text-[15px] font-medium text-ink-900">PDF 파일을 끌어다 놓으세요</span>
                  <span className="text-xs text-ink-500 font-light">
                    스캔 이미지로만 이루어진 PDF는 텍스트를 추출할 수 없습니다
                  </span>
                </span>
                <span className="btn-primary mt-1.5">
                  파일 선택
                  <svg className="w-[15px] h-[15px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5-5 5M6 12h12" />
                  </svg>
                </span>
              </>
            )}
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
            e.target.value = ''
          }}
        />

        {error ? (
          <div className="w-full flex items-start gap-2 text-xs text-brand-600 bg-brand-50 border border-brand-200 rounded-[6px] px-3 py-2.5">
            <svg className="w-4 h-4 shrink-0 mt-px" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <span>{error}</span>
          </div>
        ) : (
          <div className="flex items-center gap-[18px]">
            {['요구사항 자동 추출', '평가 기준 배점 정리', '브라우저 내 처리'].map((t) => (
              <span key={t} className="flex items-center gap-1.5 text-xs text-ink-500">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="#EA580C" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
