'use client'

import { useState } from 'react'
import type { ProposalCategory, ProposalFormData } from '@/types/proposal'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'
import HomeHero from '@/components/HomeHero'
import CategorySelector from '@/components/CategorySelector'
import ProposalForm from '@/components/ProposalForm'
import LoadingScreen from '@/components/LoadingScreen'
import DownloadScreen from '@/components/DownloadScreen'
import RfpUploader from '@/components/RfpUploader'
import RfpAnalysis from '@/components/RfpAnalysis'
import type { RfpAnalysisResult } from '@/lib/rfp/analyze'
import type { RfpPrefill } from '@/lib/rfp/prefill'

type Step = 'home' | 'rfp' | 'select' | 'form' | 'loading' | 'done'

const CAT_LABEL: Record<ProposalCategory, string> = {
  AI: 'AI 솔루션',
  CLOUD: '클라우드 전환',
  ERP: 'ERP 구축',
}

const STEP_LABEL: Record<Step, string> = {
  home: '홈',
  rfp: 'RFP 분석',
  select: '모듈 선택',
  form: '정보 입력',
  loading: '생성 중',
  done: '완료',
}

export default function HomePage() {
  const [step, setStep] = useState<Step>('home')
  const [category, setCategory] = useState<ProposalCategory | null>(null)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [fileName, setFileName] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // ── RFP 분석 ──
  const [rfpResult, setRfpResult] = useState<RfpAnalysisResult | null>(null)
  const [rfpFileName, setRfpFileName] = useState('')
  const [rfpPrefill, setRfpPrefill] = useState<RfpPrefill | undefined>(undefined)

  const handleCategorySelect = (cat: ProposalCategory) => {
    setCategory(cat)
    setStep('form')
  }

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
      const name = `APP_${formData.category}_제안서_${formData.clientName}_${formData.preparedDate}.docx`

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
    setCategory(null)
    setRfpResult(null)
    setRfpFileName('')
    setRfpPrefill(undefined)
    setStep('home')
  }

  const handleSelectRfp = () => {
    setCategory(null)
    setStep('rfp')
  }

  const crumbs =
    step === 'rfp'
      ? ['Home', STEP_LABEL[step]]
      : ['Home', '신규 제안서', ...(category ? [CAT_LABEL[category]] : []), STEP_LABEL[step]]

  if (step === 'home') {
    return <HomeHero onStart={() => setStep('select')} />
  }

  return (
    <div className="min-h-screen flex bg-surface">
      <Sidebar
        activeCategory={category}
        onSelectModule={handleCategorySelect}
        onSelectRfp={handleSelectRfp}
        rfpActive={step === 'rfp'}
        onHome={handleReset}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar crumbs={crumbs} showReset={step !== 'select'} onReset={handleReset} />

        {/* 스테이지 바 (RFP 분석은 제안서 생성 단계 밖의 도구라 표시하지 않는다) */}
        {step !== 'loading' && step !== 'rfp' && (
          <div className="bg-white border-b border-line px-6 py-2.5">
            <div className="max-w-3xl mx-auto flex items-center gap-2">
              <StageDot n={1} active={step === 'select'} done={step !== 'select'} label="유형 선택" />
              <StageBar filled={step !== 'select'} />
              <StageDot n={2} active={step === 'form'} done={step === 'done'} label="정보 입력" />
              <StageBar filled={step === 'done'} />
              <StageDot n={3} active={step === 'done'} done={false} label="완료" />
            </div>
          </div>
        )}

        {/* 콘텐츠 */}
        <main className="flex-1 px-6 py-8">
          {step === 'rfp' && (
            <div className="max-w-3xl mx-auto">
              {rfpResult === null ? (
                <RfpUploader
                  onAnalyzed={(analyzed, name) => {
                    setRfpResult(analyzed)
                    setRfpFileName(name)
                  }}
                />
              ) : (
                <RfpAnalysis
                  result={rfpResult}
                  fileName={rfpFileName}
                  onReset={() => {
                    setRfpResult(null)
                    setRfpFileName('')
                  }}
                  onUseForProposal={(prefill) => {
                    setRfpPrefill(prefill)
                    setStep('select')
                  }}
                />
              )}
            </div>
          )}
          {step === 'select' && <CategorySelector onSelect={handleCategorySelect} />}
          {step === 'form' && category && (
            <ProposalForm
              category={category}
              onSubmit={handleFormSubmit}
              onBack={() => setStep('select')}
              errorMsg={errorMsg}
              prefill={rfpPrefill}
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
