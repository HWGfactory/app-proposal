'use client'

import { useState } from 'react'
import type { BrandIdentity, CompanyProfile, ProposalFormData, RfpSource } from '@/types/proposal'
import CompanyProfileSection from '@/components/CompanyProfileSection'
import BrandLogoSection from '@/components/BrandLogoSection'
import { defaultCompanyProfile } from '@/lib/companyProfile'

interface Props {
  rfp: RfpSource          // RFP 분석 결과. 사업에 관한 내용은 전부 여기서 나온다.
  winTheme: string        // 앞 단계에서 고르고 다듬은 한 줄 선언
  onSubmit: (data: ProposalFormData) => void
  onBack: () => void
  errorMsg?: string
}

function Field({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-ink-700 flex items-center gap-1">
        {label}
        {required && <span className="text-accent-red">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-ink-400">{hint}</p>}
    </div>
  )
}

export default function ProposerForm({ rfp, winTheme, onSubmit, onBack, errorMsg }: Props) {
  const today = new Date().toISOString().split('T')[0]

  const [companyName, setCompanyName] = useState('')
  const [preparedBy, setPreparedBy] = useState('')
  const [preparedDate, setPreparedDate] = useState(today)
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(defaultCompanyProfile())
  const [brand, setBrand] = useState<BrandIdentity>({ logoDataUrl: null, colors: [], primary: null })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({ companyName, preparedBy, preparedDate, winTheme, brand, companyProfile, rfp })
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-5 flex items-center gap-3">
        <button onClick={onBack} className="text-ink-400 hover:text-ink-700 transition-colors p-1.5 -ml-1.5 rounded-[4px] hover:bg-surface-sunken">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-ink-900 text-base">제안사 정보</h2>
            <span className="badge badge-accent tabular-nums">
              요구사항 {rfp.requirements.length}건
            </span>
          </div>
          <p className="text-xs text-ink-400 mt-0.5">
            사업 내용은 {rfp.fileName || '업로드한 RFP'}에서 자동으로 채워집니다. 우리 회사 정보만 입력하세요
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-4 bg-brand-50 border border-brand-200 text-brand-600 text-sm rounded-[6px] px-4 py-3 flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          {errorMsg}
        </div>
      )}

      {winTheme && (
        <div className="mb-4 card px-4 py-3 border-l-[3px] border-l-brand-500">
          <span className="section-label">선택한 Win Theme</span>
          <p className="text-sm text-ink-900 leading-relaxed mt-1">{winTheme}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* RFP에서 자동으로 확정된 내용 (읽기 전용) */}
        <div className="form-section">
          <div className="form-section-header">
            <span className="fs-index">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </span>
            <div className="min-w-0">
              <div className="fs-title">RFP에서 자동 반영된 내용</div>
              <div className="fs-desc">입력하지 않아도 제안서에 그대로 들어갑니다</div>
            </div>
          </div>
          <div className="form-section-body grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
            {([
              ['사업명', rfp.projectName],
              ['발주기관', rfp.client],
              ['사업 예산', rfp.budget],
              ['사업 기간', rfp.duration],
            ] as [string, string][]).map(([label, value]) => (
              <div key={label} className="flex flex-col gap-1">
                <span className="section-label">{label}</span>
                {value
                  ? <span className="text-sm text-ink-900">{value}</span>
                  : <span className="text-sm text-ink-300 italic">RFP에 없음</span>}
              </div>
            ))}
            <div className="flex flex-col gap-1">
              <span className="section-label">요구사항</span>
              <span className="text-sm text-ink-900">{rfp.requirements.length}건</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="section-label">평가 항목</span>
              <span className="text-sm text-ink-900">{rfp.evaluations.length}건</span>
            </div>
          </div>
        </div>

        {/* 제안사 기본 정보 */}
        <div className="form-section">
          <div className="form-section-header">
            <span className="fs-index">1</span>
            <div className="min-w-0">
              <div className="fs-title">제안사 기본 정보</div>
              <div className="fs-desc">표지와 마무리 슬라이드에 반영됩니다</div>
            </div>
          </div>
          <div className="form-section-body grid grid-cols-1 gap-4">
            <Field label="제안사 (우리 회사)" required>
              <input className="input-field" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required
                placeholder="(주) 우리회사" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="작성자">
                <input className="input-field" value={preparedBy} onChange={(e) => setPreparedBy(e.target.value)}
                  placeholder="홍길동 / 영업팀" />
              </Field>
              <Field label="작성일">
                <input type="date" className="input-field" value={preparedDate} onChange={(e) => setPreparedDate(e.target.value)} />
              </Field>
            </div>
          </div>
        </div>

        {/* 회사 소개 · 핵심 역량 · 수행 실적 */}
        <CompanyProfileSection value={companyProfile} onChange={setCompanyProfile} />

        <BrandLogoSection value={brand} onChange={setBrand} />

        <div className="flex items-center justify-end gap-2 pt-1">
          <button type="button" onClick={onBack} className="btn-secondary">
            뒤로
          </button>
          <button type="submit" className="btn-primary">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            PPTX 제안서 생성
          </button>
        </div>
      </form>
    </div>
  )
}
