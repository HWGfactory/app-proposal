'use client'

import { useRef, useState } from 'react'
import { extractPdfText } from '@/lib/rfp/extractText'
import { analyzeRfp, type RfpAnalysisResult } from '@/lib/rfp/analyze'

interface Props {
  onAnalyzed: (result: RfpAnalysisResult, fileName: string) => void
}

export default function RfpUploader({ onAnalyzed }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const handleFile = async (file: File) => {
    if (file.type !== 'application/pdf') {
      setError('PDF 파일만 업로드할 수 있습니다.')
      return
    }

    setBusy(true)
    setError('')
    try {
      const extracted = await extractPdfText(file)
      onAnalyzed(analyzeRfp(extracted), file.name)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'PDF를 읽는 중 오류가 발생했습니다.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="form-section">
      <div className="form-section-header">
        <span className="w-5 h-5 rounded-[3px] bg-brand-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
          1
        </span>
        <div className="min-w-0">
          <div className="font-semibold text-ink-900 text-[13px] leading-tight">제안요청서(RFP) 업로드</div>
          <div className="text-[11px] text-ink-400 mt-0.5">
            텍스트가 포함된 PDF에서 요구사항과 평가 기준을 자동으로 추출합니다. 파일은 브라우저 안에서만 처리되며 서버로 전송되지 않습니다
          </div>
        </div>
      </div>

      <div className="form-section-body">
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
          className={`rounded-[6px] border-2 border-dashed px-6 py-10 flex flex-col items-center gap-2 transition-colors
          ${busy ? 'cursor-wait bg-surface-sunken border-line' : 'cursor-pointer'}
          ${dragging ? 'border-brand-500 bg-brand-50' : 'border-line-strong hover:border-brand-400 hover:bg-brand-50/40'}`}
        >
          {busy ? (
            <>
              <svg className="w-6 h-6 text-brand-500 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
              </svg>
              <span className="text-sm text-ink-700 font-medium">PDF를 분석하는 중입니다...</span>
            </>
          ) : (
            <>
              <svg className="w-7 h-7 text-ink-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0L8 8m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
              </svg>
              <span className="text-sm text-ink-700 font-medium">PDF 파일을 끌어다 놓거나 클릭해서 선택하세요</span>
              <span className="text-[11px] text-ink-400">스캔 이미지로만 이루어진 PDF는 텍스트를 추출할 수 없습니다</span>
            </>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
            // 같은 파일을 연속으로 다시 선택해도 onChange가 발생하도록 초기화한다.
            e.target.value = ''
          }}
        />

        {error && (
          <div className="mt-3 flex items-start gap-2 text-xs text-accent-red bg-red-50 border border-red-200 rounded-[4px] px-3 py-2">
            <svg className="w-4 h-4 shrink-0 mt-px" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  )
}
