'use client'

import { useState } from 'react'
import type { CompanyProfile, EstimateData, ProposalCategory, ProposalFormData, ScopeData, SectionConfig } from '@/types/proposal'
import EstimateSection from '@/components/EstimateSection'
import ScopeSection from '@/components/ScopeSection'
import CompanyProfileSection from '@/components/CompanyProfileSection'
import StructureSection from '@/components/StructureSection'
import { defaultEstimate } from '@/lib/estimate'
import { createScopeItem, defaultScope } from '@/lib/scope'
import { defaultCompanyProfile } from '@/lib/companyProfile'
import { detailedStructure } from '@/lib/sections'
import { AI_INDUSTRIES, AI_INDUSTRY_PRESETS, type AIIndustry } from '@/lib/industryPresets'
import type { RfpPrefill } from '@/lib/rfp/prefill'

interface Props {
  category: ProposalCategory
  onSubmit: (data: ProposalFormData) => void
  onBack: () => void
  errorMsg?: string
  prefill?: RfpPrefill   // RFP 분석에서 넘어온 초기값 (없으면 빈 폼)
}

const CAT_LABEL: Record<ProposalCategory, string> = {
  AI: 'AI 솔루션',
  CLOUD: '클라우드 전환',
  ERP: 'ERP 구축',
}

// ── 필드 컴포넌트 ─────────────────────────────────────────────────────────────
function Field({
  label, required, hint, children,
}: {
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

// ── 레코드 폼 섹션 헤더(회색 바) ────────────────────────────────────────────
function SectionHeader({ index, title, desc }: { index: string; title: string; desc: string }) {
  return (
    <div className="form-section-header">
      <span className="w-5 h-5 rounded-[3px] bg-brand-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
        {index}
      </span>
      <div className="min-w-0">
        <div className="font-semibold text-ink-900 text-[13px] leading-tight">{title}</div>
        <div className="text-[11px] text-ink-400 mt-0.5">{desc}</div>
      </div>
    </div>
  )
}

export default function ProposalForm({ category, onSubmit, onBack, errorMsg, prefill }: Props) {
  const today = new Date().toISOString().split('T')[0]

  // ── 공통 필드 ──
  const [base, setBase] = useState({
    proposalTitle: prefill?.proposalTitle ?? '',
    companyName: '',
    clientName: prefill?.clientName ?? '',
    clientIndustry: '',
    preparedBy: '',
    preparedDate: today,
    projectBudget: prefill?.projectBudget ?? '',
    projectDuration: prefill?.projectDuration ?? '',
    executiveSummary: '',
  })

  // ── AI 전용 ──
  const [ai, setAi] = useState({
    aiUseCase: '', currentPainPoint: '', targetKPI: '',
    dataAssets: '', aiModel: '', integrationSystems: '', pilotScope: '',
    complianceNote: '',
  })

  // ── Cloud 전용 ──
  const [cloud, setCloud] = useState({
    currentInfra: '', migrationScope: '', cloudProvider: '',
    targetArchitecture: '', complianceRequirements: '',
    disasterRecovery: '', optimizationGoal: '',
  })

  // ── ERP 전용 ──
  const [erp, setErp] = useState({
    erpScope: '', currentSystem: '', companySize: '',
    businessProcess: '', customizationLevel: '', dataVolume: '', goLiveDate: '',
  })

  // ── 범위 정의 (In/Out Scope, 전제조건, 의존성) ──
  const [scope, setScope] = useState<ScopeData>(() => {
    const base = defaultScope()
    if (!prefill || prefill.inScope.length === 0) return base
    return { ...base, inScope: prefill.inScope.map((text) => createScopeItem(text)) }
  })
  const [scopeError, setScopeError] = useState('')

  // ── 항목별 견적 ──
  const [estimate, setEstimate] = useState<EstimateData>(defaultEstimate())
  const [estimateError, setEstimateError] = useState('')

  // ── 회사 소개 및 수행 실적 ──
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(defaultCompanyProfile())

  // ── 문서 구성 (섹션 순서 · 포함 여부) ──
  const [structure, setStructure] = useState<SectionConfig[]>(() => detailedStructure(category))

  const setB = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setBase((prev) => ({ ...prev, [k]: e.target.value }))
  const setA = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setAi((prev) => ({ ...prev, [k]: e.target.value }))

  // 업종 선택 시 해당 업종의 표준 Pain Point · KPI · 컴플라이언스로 AI 필드를 채운다
  const applyIndustryPreset = (industry: AIIndustry) => {
    setBase((prev) => ({ ...prev, clientIndustry: industry }))
    const preset = AI_INDUSTRY_PRESETS[industry]
    setAi((prev) => ({
      ...prev,
      aiUseCase: preset.aiUseCase,
      currentPainPoint: preset.currentPainPoint,
      targetKPI: preset.targetKPI,
      dataAssets: preset.dataAssets,
      aiModel: preset.aiModel,
      integrationSystems: preset.integrationSystems,
      complianceNote: preset.complianceNote,
    }))
  }
  const setC = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setCloud((prev) => ({ ...prev, [k]: e.target.value }))
  const setE = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setErp((prev) => ({ ...prev, [k]: e.target.value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (scope.inScope.length === 0 || scope.outOfScope.length === 0) {
      setScopeError('범위 정의에 포함 범위와 제외 범위를 각각 최소 1개 이상 입력해주세요.')
      return
    }
    setScopeError('')

    if (estimate.laborItems.length === 0 && estimate.costItems.length === 0) {
      setEstimateError('항목별 견적에 최소 1개 이상의 인력 또는 비용 항목을 입력해주세요.')
      return
    }
    setEstimateError('')

    let payload: ProposalFormData
    if (category === 'AI') {
      payload = { ...base, ...ai, estimate, scope, companyProfile, structure, category: 'AI' }
    } else if (category === 'CLOUD') {
      payload = { ...base, ...cloud, estimate, scope, companyProfile, structure, category: 'CLOUD' }
    } else {
      payload = { ...base, ...erp, estimate, scope, companyProfile, structure, category: 'ERP' }
    }
    onSubmit(payload)
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* 타이틀 */}
      <div className="mb-5 flex items-center gap-3">
        <button onClick={onBack} className="text-ink-400 hover:text-ink-700 transition-colors p-1.5 -ml-1.5 rounded-[4px] hover:bg-surface-sunken">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-ink-900 text-base">{CAT_LABEL[category]} 제안서</h2>
            <span className="badge bg-brand-50 text-brand-600 border border-brand-100">{category}</span>
          </div>
          <p className="text-xs text-ink-400 mt-0.5">필드를 입력하면 맞춤형 Word 제안서가 생성됩니다</p>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-4 bg-red-50 border border-red-200 text-accent-red text-sm rounded-[4px] px-4 py-3 flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        {/* ── 섹션 1: 기본 정보 ── */}
        <div className="form-section">
          <SectionHeader index="1" title="기본 정보" desc="제안서 커버 및 경영진 요약에 반영됩니다" />
          <div className="form-section-body grid grid-cols-1 gap-4">
            <Field label="제안서 제목" required hint="예: 고객 상담 AI 자동화 솔루션 제안서">
              <input className="input-field" value={base.proposalTitle} onChange={setB('proposalTitle')} required
                placeholder="[고객사명] AI 솔루션 도입 제안서" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="제안사 (우리 회사)" required>
                <input className="input-field" value={base.companyName} onChange={setB('companyName')} required
                  placeholder="(주) 우리회사" />
              </Field>
              <Field label="고객사명" required>
                <input className="input-field" value={base.clientName} onChange={setB('clientName')} required
                  placeholder="(주) 고객회사" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="고객사 업종" required
                hint={category === 'AI' ? '선택 시 Pain Point·KPI·컴플라이언스가 자동 입력됩니다 (직접 수정 가능)' : '예: 금융, 제조, 유통'}
              >
                <input className="input-field" value={base.clientIndustry} onChange={setB('clientIndustry')} required
                  placeholder="금융 / 제조 / 유통 ..." />
                {category === 'AI' && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {AI_INDUSTRIES.map((industry) => (
                      <button
                        key={industry}
                        type="button"
                        onClick={() => applyIndustryPreset(industry)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors
                          ${base.clientIndustry === industry
                            ? 'bg-brand-500 text-white border-brand-500'
                            : 'bg-white text-ink-600 border-line hover:border-brand-300'}`}
                      >
                        {industry}
                      </button>
                    ))}
                  </div>
                )}
              </Field>
              <Field label="작성자">
                <input className="input-field" value={base.preparedBy} onChange={setB('preparedBy')}
                  placeholder="홍길동 / 영업팀" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="작성일">
                <input type="date" className="input-field" value={base.preparedDate} onChange={setB('preparedDate')} />
              </Field>
              <Field label="예상 예산" hint="예: 2억 원">
                <input className="input-field" value={base.projectBudget} onChange={setB('projectBudget')}
                  placeholder="1억 5천만 원" />
              </Field>
            </div>
            <Field label="예상 사업 기간" hint="예: 4개월 (16주)">
              <input className="input-field" value={base.projectDuration} onChange={setB('projectDuration')}
                placeholder="4개월 (2025.03 ~ 2025.06)" />
            </Field>
            <Field label="제안 한 줄 요약" required hint="경영진 요약의 도입 배경이 됩니다">
              <textarea className="textarea-field" rows={2} value={base.executiveSummary} onChange={setB('executiveSummary')} required
                placeholder="현재 수동 업무 처리로 인해 생산성 저하 및 오류가 지속 발생하고 있으며, 디지털 전환의 필요성이 절실한 상황입니다." />
            </Field>
          </div>
        </div>

        {/* ── 섹션 2: 카테고리별 필드 ── */}
        {category === 'AI' && (
          <div className="form-section">
            <SectionHeader index="2" title="AI 솔루션 상세 정보" desc="기술 제안서 및 기대효과 섹션에 반영됩니다" />
            <div className="form-section-body grid grid-cols-1 gap-4">
              <Field label="AI 활용 케이스" required hint="어떤 문제를 AI로 해결하려 합니까?">
                <input className="input-field" value={ai.aiUseCase} onChange={setA('aiUseCase')} required
                  placeholder="예: 고객 상담 챗봇 자동화, 수요 예측 모델, 불량품 자동 탐지" />
              </Field>
              <Field label="현재 Pain Point" required hint="고객이 겪고 있는 핵심 문제">
                <textarea className="textarea-field" rows={2} value={ai.currentPainPoint} onChange={setA('currentPainPoint')} required
                  placeholder="예: 콜센터 상담사 1인당 월 300건 처리 한계, 대기시간 평균 15분, 야간 응대 불가" />
              </Field>
              <Field label="목표 KPI" required hint="AI 도입 후 달성할 수치 목표">
                <input className="input-field" value={ai.targetKPI} onChange={setA('targetKPI')} required
                  placeholder="예: 상담 자동 처리율 70% 달성, 응답 시간 15분 → 30초 이내" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="활용 AI 모델/기술" required>
                  <select className="select-field" value={ai.aiModel} onChange={setA('aiModel')} required>
                    <option value="">선택하세요</option>
                    <option>LLM (대화형 AI)</option>
                    <option>ML 예측 모델</option>
                    <option>컴퓨터 비전</option>
                    <option>NLP (자연어처리)</option>
                    <option>추천 시스템</option>
                    <option>이상 탐지 모델</option>
                    <option>멀티모달 AI</option>
                  </select>
                </Field>
                <Field label="파일럿 범위">
                  <input className="input-field" value={ai.pilotScope} onChange={setA('pilotScope')}
                    placeholder="예: 1개 부서, 500건/월" />
                </Field>
              </div>
              <Field label="보유 데이터 자산" hint="학습/활용 가능한 데이터">
                <input className="input-field" value={ai.dataAssets} onChange={setA('dataAssets')}
                  placeholder="예: 3년치 고객 상담 이력 150만 건, 상품 DB 5만 개" />
              </Field>
              <Field label="연동 시스템" hint="AI와 연결될 기존 시스템">
                <input className="input-field" value={ai.integrationSystems} onChange={setA('integrationSystems')}
                  placeholder="예: CRM (Salesforce), ERP (SAP), 홈페이지 채팅" />
              </Field>
              <Field label="업종 컴플라이언스 요건" hint="준수해야 할 업종별 가이드라인·규제">
                <input className="input-field" value={ai.complianceNote} onChange={setA('complianceNote')}
                  placeholder="예: 금융보안원 가이드 준수, 개인정보보호법(PIPA) 준수" />
              </Field>
            </div>
          </div>
        )}

        {category === 'CLOUD' && (
          <div className="form-section">
            <SectionHeader index="2" title="클라우드 전환 상세 정보" desc="마이그레이션 전략 및 아키텍처 섹션에 반영됩니다" />
            <div className="form-section-body grid grid-cols-1 gap-4">
              <Field label="현재 인프라 현황" required hint="On-premise 서버 수, 주요 시스템 등">
                <textarea className="textarea-field" rows={2} value={cloud.currentInfra} onChange={setC('currentInfra')} required
                  placeholder="예: On-premise 서버 20대, 노후화 7년 이상, 자체 IDC 운영 중" />
              </Field>
              <Field label="마이그레이션 범위" required>
                <input className="input-field" value={cloud.migrationScope} onChange={setC('migrationScope')} required
                  placeholder="예: 전사 시스템 전체 / 핵심 웹서비스 3개 / DB 서버 우선" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="클라우드 공급사" required>
                  <select className="select-field" value={cloud.cloudProvider} onChange={setC('cloudProvider')} required>
                    <option value="">선택하세요</option>
                    <option>AWS</option>
                    <option>Microsoft Azure</option>
                    <option>Google Cloud (GCP)</option>
                    <option>멀티 클라우드</option>
                    <option>하이브리드 (On-premise + Cloud)</option>
                    <option>네이버 클라우드</option>
                    <option>KT Cloud</option>
                  </select>
                </Field>
                <Field label="목표 아키텍처">
                  <select className="select-field" value={cloud.targetArchitecture} onChange={setC('targetArchitecture')}>
                    <option value="">선택하세요</option>
                    <option>MSA (마이크로서비스)</option>
                    <option>Serverless</option>
                    <option>Lift & Shift (리호스팅)</option>
                    <option>컨테이너 (Kubernetes)</option>
                    <option>PaaS 전환</option>
                  </select>
                </Field>
              </div>
              <Field label="컴플라이언스 요건" hint="획득/유지해야 할 인증">
                <input className="input-field" value={cloud.complianceRequirements} onChange={setC('complianceRequirements')}
                  placeholder="예: ISMS-P, ISO 27001, 금융보안원 가이드" />
              </Field>
              <Field label="DR / 백업 정책 요건">
                <input className="input-field" value={cloud.disasterRecovery} onChange={setC('disasterRecovery')}
                  placeholder="예: RPO 1시간 / RTO 4시간, 멀티 리전 백업" />
              </Field>
              <Field label="최적화 목표" required>
                <select className="select-field" value={cloud.optimizationGoal} onChange={setC('optimizationGoal')} required>
                  <option value="">선택하세요</option>
                  <option>비용 절감 (TCO 최소화)</option>
                  <option>성능 개선 (응답속도, 처리량)</option>
                  <option>보안 강화</option>
                  <option>가용성 향상 (99.9% SLA)</option>
                  <option>개발 속도 향상 (DevOps)</option>
                </select>
              </Field>
            </div>
          </div>
        )}

        {category === 'ERP' && (
          <div className="form-section">
            <SectionHeader index="2" title="ERP 구축 상세 정보" desc="솔루션 범위 및 추진 일정에 반영됩니다" />
            <div className="form-section-body grid grid-cols-1 gap-4">
              <Field label="ERP 도입 범위" required hint="어느 업무 모듈을 포함합니까?">
                <input className="input-field" value={erp.erpScope} onChange={setE('erpScope')} required
                  placeholder="예: 재무/회계, 구매/SCM, 인사/급여, 영업관리" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="현재 사용 시스템">
                  <input className="input-field" value={erp.currentSystem} onChange={setE('currentSystem')}
                    placeholder="예: Excel, 더존, SAP ECC, 자체개발" />
                </Field>
                <Field label="임직원 규모" required>
                  <select className="select-field" value={erp.companySize} onChange={setE('companySize')} required>
                    <option value="">선택하세요</option>
                    <option>50명 미만 (소기업)</option>
                    <option>50~200명 (중소기업)</option>
                    <option>200~500명 (중견기업)</option>
                    <option>500~1000명</option>
                    <option>1000명 이상 (대기업)</option>
                  </select>
                </Field>
              </div>
              <Field label="핵심 업무 프로세스" required hint="개선이 필요한 핵심 프로세스">
                <textarea className="textarea-field" rows={2} value={erp.businessProcess} onChange={setE('businessProcess')} required
                  placeholder="예: 발주→입고→재고→출고 SCM, 월마감 결산 (현재 7일 소요), 인사고과 관리" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="커스터마이징 수준">
                  <select className="select-field" value={erp.customizationLevel} onChange={setE('customizationLevel')}>
                    <option value="">선택하세요</option>
                    <option>표준 (바닐라 ERP)</option>
                    <option>소규모 커스터마이징</option>
                    <option>중규모 커스터마이징</option>
                    <option>대규모 커스터마이징</option>
                    <option>완전 맞춤 개발</option>
                  </select>
                </Field>
                <Field label="데이터 이관 규모">
                  <input className="input-field" value={erp.dataVolume} onChange={setE('dataVolume')}
                    placeholder="예: 5년치 거래 데이터 500만 건" />
                </Field>
              </div>
              <Field label="목표 Go-Live 일정">
                <input className="input-field" value={erp.goLiveDate} onChange={setE('goLiveDate')}
                  placeholder="예: 2025년 9월 1일" />
              </Field>
            </div>
          </div>
        )}

        {/* ── 섹션 3: 범위 정의 ── */}
        <ScopeSection value={scope} onChange={setScope} />
        {scopeError && (
          <div className="bg-red-50 border border-red-200 text-accent-red text-sm rounded-[4px] px-4 py-3 flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            {scopeError}
          </div>
        )}

        {/* ── 섹션 4: 항목별 견적 ── */}
        <EstimateSection value={estimate} onChange={setEstimate} />
        {estimateError && (
          <div className="bg-red-50 border border-red-200 text-accent-red text-sm rounded-[4px] px-4 py-3 flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            {estimateError}
          </div>
        )}

        {/* ── 섹션 5: 회사 소개 및 수행 실적 ── */}
        <CompanyProfileSection value={companyProfile} onChange={setCompanyProfile} />

        {/* ── 섹션 6: 문서 구성 ── */}
        <StructureSection category={category} value={structure} onChange={setStructure} />

        {/* 제출 버튼 */}
        <div className="flex items-center justify-end gap-2 pt-1">
          <button type="button" onClick={onBack} className="btn-secondary">
            취소
          </button>
          <button type="submit" className="btn-primary">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            제안서 생성하기
          </button>
        </div>
      </form>
    </div>
  )
}
