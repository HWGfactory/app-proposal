'use client'

import { useState } from 'react'
import type { ProposalFormData } from '@/types/proposal'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'
import HomeHero from '@/components/HomeHero'
import ProposerForm from '@/components/ProposerForm'
import LoadingScreen from '@/components/LoadingScreen'
import DownloadScreen from '@/components/DownloadScreen'
import RfpUploader from '@/components/RfpUploader'
import RfpAnalysis from '@/components/RfpAnalysis'
import type { RfpAnalysisResult } from '@/lib/rfp/analyze'
import type { RfpSource } from '@/types/proposal'

// RFP 업로드 → RFP 분석 → 제안서 생성. 제안서는 항상 특정 RFP에 대한 응답이므로
// 'form' 단계는 분석 결과(prefill) 없이는 진입할 수 없다.
type Step = 'home' | 'upload' | 'analysis' | 'form' | 'loading' | 'done'

const STEP_LABEL: Record<Step, string> = {
  home: '홈',
  upload: 'RFP 업로드',
  analysis: 'RFP 분석',
  form: '제안사 정보 입력',
  loading: '생성 중',
  done: '완료',
}

export default function HomePage() {
  const [step, setStep] = useState<Step>('home')
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [fileName, setFileName] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const [rfpResult, setRfpResult] = useState<RfpAnalysisResult | null>(null)
  const [rfpFileName, setRfpFileName] = useState('')
  const [rfpSource, setRfpSource] = useState<RfpSource | null>(null)

  const handleFormSubmit = async (formData: ProposalFormData) => {
    setStep('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '알 수 없는 오류')
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const name = `APP_제안서_${formData.rfp.client || formData.rfp.projectName || '제안'}_${formData.preparedDate}.pptx`

      setDownloadUrl(url)
      setFileName(name)
      setStep('done')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '제안서 생성 중 오류가 발생했습니다.'
      setErrorMsg(msg)
      setStep('form')
    }
  }

  const handleReset = () => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    setDownloadUrl(null)
    setFileName('')
    setRfpResult(null)
    setRfpFileName('')
    setRfpSource(null)
    setStep('home')
  }

  const startUpload = () => {
    setRfpResult(null)
    setRfpFileName('')
    setRfpSource(null)
    setStep('upload')
  }

  const crumbs = ['Home', '신규 제안서', STEP_LABEL[step]]

  if (step === 'home') {
    return <HomeHero onStart={startUpload} />
  }

  const stageIndex = step === 'upload' || step === 'analysis' ? 0 : step === 'form' ? 1 : 2

  return (
    <div className="min-h-screen flex bg-surface">
      <Sidebar activeStep={step} onNewProposal={startUpload} onHome={handleReset} />

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar crumbs={crumbs} showReset onReset={handleReset} />

        {/* 스테이지 바 */}
        {step !== 'loading' && (
          <div className="bg-white border-b border-line px-6 py-2.5">
            <div className="max-w-3xl mx-auto flex items-center gap-2">
              <StageDot n={1} active={stageIndex === 0} done={stageIndex > 0} label="RFP 분석" />
              <StageBar filled={stageIndex > 0} />
              <StageDot n={2} active={stageIndex === 1} done={stageIndex > 1} label="정보 입력" />
              <StageBar filled={stageIndex > 1} />
              <StageDot n={3} active={step === 'done'} done={false} label="완료" />
            </div>
          </div>
        )}

        {/* 콘텐츠 */}
        <main className="flex-1 px-6 py-8">
          {step === 'upload' && (
            <div className="max-w-3xl mx-auto">
              <RfpUploader
                onAnalyzed={(analyzed, name) => {
                  setRfpResult(analyzed)
                  setRfpFileName(name)
                  setStep('analysis')
                }}
              />
            </div>
          )}

          {step === 'analysis' && rfpResult && (
            <div className="max-w-3xl mx-auto">
              <RfpAnalysis
                result={rfpResult}
                fileName={rfpFileName}
                onReset={startUpload}
                onUseForProposal={(built) => {
                  setRfpSource(built)
                  setStep('form')
                }}
              />
            </div>
          )}

          {step === 'form' && rfpSource && (
            <ProposerForm
              rfp={rfpSource}
              onSubmit={handleFormSubmit}
              onBack={() => setStep('analysis')}
              errorMsg={errorMsg}
            />
          )}

          {step === 'loading' && <LoadingScreen />}
          {step === 'done' && downloadUrl && (
            <DownloadScreen downloadUrl={downloadUrl} fileName={fileName} onReset={handleReset} />
          )}
        </main>

        <footer className="text-center py-4 text-[11px] text-ink-400 border-t border-line bg-white">
          APP © {new Date().getFullYear()} · Automatic Project Proposal Generator
        </footer>
      </div>
    </div>
  )
}

function StageDot({ n, active, done, label }: { n: number; active: boolean; done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 shrink-0">
      <div
        className={`w-5 h-5 rounded-[4px] flex items-center justify-center text-[10px] font-bold transition-colors
        ${done ? 'bg-brand-500 text-white' : active ? 'border-2 border-brand-500 text-brand-500 bg-white' : 'border border-line-strong text-ink-300 bg-white'}`}
      >
        {done ? (
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          n
        )}
      </div>
      <span className={`text-xs ${active ? 'text-brand-600 font-semibold' : done ? 'text-ink-700 font-medium' : 'text-ink-400'}`}>
        {label}
      </span>
    </div>
  )
}

function StageBar({ filled }: { filled: boolean }) {
  return <div className={`flex-1 h-px ${filled ? 'bg-brand-500' : 'bg-line'}`} />
}
