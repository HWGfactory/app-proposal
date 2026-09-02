'use client'

import { useState } from 'react'
import type { ProposalFormData, RfpSource, WinThemeSelection } from '@/types/proposal'
import AppShell, { type ShellStep } from '@/components/AppShell'
import HomeHero from '@/components/HomeHero'
import ProposerForm from '@/components/ProposerForm'
import LoadingScreen from '@/components/LoadingScreen'
import DownloadScreen from '@/components/DownloadScreen'
import RfpUploader from '@/components/RfpUploader'
import RfpAnalysis from '@/components/RfpAnalysis'
import type { RfpAnalysisResult } from '@/lib/rfp/analyze'
import type { RfpLine } from '@/lib/rfp/extractText'
import type { StrategyBrief } from '@/lib/rfp/strategy'
import { buildWinThemes, type WinTheme } from '@/lib/rfp/winTheme'
import WinThemeStep from '@/components/WinThemeStep'

// RFP 업로드 → RFP 분석 → 제안서 작성 → 문서 생성 → 다운로드.
// 좌측 사이드바와 브레드크럼은 없애고, 위치는 AppShell의 4단계 표시만으로 알린다.
type Step = 'home' | 'upload' | 'analysis' | 'wintheme' | 'form' | 'loading' | 'done'

export default function HomePage() {
  const [step, setStep] = useState<Step>('home')
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [fileName, setFileName] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const [rfpResult, setRfpResult] = useState<RfpAnalysisResult | null>(null)
  const [rfpFileName, setRfpFileName] = useState('')
  const [rfpBrief, setRfpBrief] = useState<StrategyBrief | null>(null)
  const [rfpLines, setRfpLines] = useState<RfpLine[]>([])
  const [rfpSource, setRfpSource] = useState<RfpSource | null>(null)
  const [winThemes, setWinThemes] = useState<WinTheme[]>([])
  const [winTheme, setWinTheme] = useState<WinThemeSelection | null>(null)

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

      // 다운로드 단계에서 되돌아가 다시 생성할 수 있게 되었으므로, 앞서 만든
      // 것을 여기서 놓아준다. 예전에는 handleReset이 유일한 출구였다.
      if (downloadUrl) URL.revokeObjectURL(downloadUrl)
      setDownloadUrl(url)
      setFileName(name)
      setStep('done')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '제안서 생성 중 오류가 발생했습니다.'
      setErrorMsg(msg)
      setStep('form')
    }
  }

  // 단계 표시에서 되돌아갈 수 있는 곳. 지나온 자취가 아니라 가진 데이터로 정한다.
  // 아래 렌더가 데이터 없는 단계를 아무것도 그리지 않으므로, 데이터에 묶어야
  // 빈 화면으로 이동하는 일이 생기지 않는다. 'loading'은 지나가는 단계라 넣지 않는다.
  const reached: ShellStep[] = ['upload']
  if (rfpResult && rfpBrief) reached.push('analysis')
  if (rfpSource) reached.push('wintheme')
  if (winTheme) reached.push('form')
  if (downloadUrl) reached.push('done')

  const handleReset = () => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    setDownloadUrl(null)
    setFileName('')
    setRfpResult(null)
    setRfpFileName('')
    setRfpBrief(null)
    setRfpSource(null)
    setWinThemes([])
    setWinTheme(null)
    setStep('home')
  }

  const startUpload = () => {
    setRfpResult(null)
    setRfpFileName('')
    setRfpBrief(null)
    setRfpSource(null)
    setWinThemes([])
    setWinTheme(null)
    setStep('upload')
  }

  if (step === 'home') {
    return <HomeHero onStart={startUpload} />
  }

  return (
    <AppShell step={step} reached={reached} onNavigate={setStep} onReset={handleReset}>
      {step === 'upload' && (
        <RfpUploader
          onAnalyzed={(analyzed, brief, name, lines) => {
            setRfpResult(analyzed)
            setRfpBrief(brief)
            setRfpFileName(name)
            setRfpLines(lines)
            setStep('analysis')
          }}
        />
      )}

      {step === 'analysis' && rfpResult && rfpBrief && (
        <div className="max-w-[820px] mx-auto w-full">
          <RfpAnalysis
            result={rfpResult}
            fileName={rfpFileName}
            brief={rfpBrief}
            lines={rfpLines}
            onReset={startUpload}
            onUseForProposal={(built) => {
              setRfpSource(built)
              setWinThemes(buildWinThemes(rfpResult, rfpBrief))
              setStep('wintheme')
            }}
          />
        </div>
      )}

      {step === 'wintheme' && (
        <WinThemeStep
          themes={winThemes}
          onBack={() => setStep('analysis')}
          onConfirm={(theme) => {
            setWinTheme({ angle: theme.angle, headline: theme.headline, evidence: theme.evidence })
            setStep('form')
          }}
        />
      )}

      {step === 'form' && rfpSource && (
        <div className="max-w-[820px] mx-auto w-full">
          <ProposerForm
            rfp={rfpSource}
            onSubmit={handleFormSubmit}
            winTheme={winTheme}
            onBack={() => setStep('wintheme')}
            errorMsg={errorMsg}
          />
        </div>
      )}

      {step === 'loading' && <LoadingScreen />}

      {step === 'done' && downloadUrl && (
        <DownloadScreen downloadUrl={downloadUrl} fileName={fileName} onReset={handleReset} />
      )}
    </AppShell>
  )
}
