'use client'

import type { ProposalFormData, SectionId } from '@/types/proposal'
import { calcEstimateTotals, costAmount, formatWon, laborAmount } from '@/lib/estimate'
import { COST_ITEM_CATEGORY_LABEL } from '@/types/proposal'

interface Props {
  data: ProposalFormData
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']

const SOLUTION_TITLE: Record<ProposalFormData['category'], string> = {
  AI: 'AI 솔루션 제안',
  CLOUD: '클라우드 전환 솔루션 제안',
  ERP: 'ERP 구축 솔루션 제안',
}

const SECTION_TITLE: Record<SectionId, (category: ProposalFormData['category']) => string> = {
  EXEC: () => '경영진 요약',
  ANALYSIS: () => '현황 분석',
  SOLUTION: (c) => SOLUTION_TITLE[c],
  EFFECT: () => '기대 효과',
  SCOPE: () => '범위 정의',
  SCHEDULE: () => '추진 일정',
  MANAGEMENT: () => '사업 관리 방안',
  MAINTENANCE: () => '유지보수 및 지원',
  COST: () => '비용 제안',
  WHY_US: () => '당사를 선택해야 하는 이유',
}

interface PreviewField { label: string; value: string }

function execFields(d: ProposalFormData): PreviewField[] {
  return [
    { label: '제안서 제목', value: d.proposalTitle },
    { label: '고객사명', value: d.clientName },
    { label: '고객사 업종', value: d.clientIndustry },
    { label: '예상 예산', value: d.projectBudget },
    { label: '사업 기간', value: d.projectDuration },
    { label: '제안 한 줄 요약', value: d.executiveSummary },
  ]
}

function analysisFields(d: ProposalFormData): PreviewField[] {
  if (d.category === 'AI') {
    return [
      { label: 'AI 활용 케이스', value: d.aiUseCase },
      { label: '현재 Pain Point', value: d.currentPainPoint },
      { label: '보유 데이터 자산', value: d.dataAssets },
    ]
  }
  if (d.category === 'CLOUD') {
    return [
      { label: '현재 인프라 현황', value: d.currentInfra },
      { label: '마이그레이션 범위', value: d.migrationScope },
    ]
  }
  return [
    { label: '현재 사용 시스템', value: d.currentSystem },
    { label: '임직원 규모', value: d.companySize },
    { label: '핵심 업무 프로세스', value: d.businessProcess },
  ]
}

function solutionFields(d: ProposalFormData): PreviewField[] {
  if (d.category === 'AI') {
    return [
      { label: '활용 AI 모델/기술', value: d.aiModel },
      { label: '연동 시스템', value: d.integrationSystems },
      { label: '파일럿 범위', value: d.pilotScope },
      { label: '업종 컴플라이언스 요건', value: d.complianceNote },
    ]
  }
  if (d.category === 'CLOUD') {
    return [
      { label: '클라우드 공급사', value: d.cloudProvider },
      { label: '목표 아키텍처', value: d.targetArchitecture },
      { label: '컴플라이언스 요건', value: d.complianceRequirements },
      { label: 'DR / 백업 정책', value: d.disasterRecovery },
    ]
  }
  return [
    { label: 'ERP 도입 범위', value: d.erpScope },
    { label: '커스터마이징 수준', value: d.customizationLevel },
    { label: '데이터 이관 규모', value: d.dataVolume },
  ]
}

function effectFields(d: ProposalFormData): PreviewField[] {
  if (d.category === 'AI') return [{ label: '목표 KPI', value: d.targetKPI }]
  if (d.category === 'CLOUD') return [{ label: '최적화 목표', value: d.optimizationGoal }]
  return [{ label: '목표 Go-Live 일정', value: d.goLiveDate }]
}

function FieldRow({ field }: { field: PreviewField }) {
  const empty = field.value.trim() === ''
  return (
    <div className="py-2">
      <div className="text-[10px] font-semibold text-ink-400 uppercase tracking-wide mb-1">{field.label}</div>
      {empty ? (
        <div className="text-xs text-accent-amber italic border border-dashed border-accent-amber/40 bg-amber-50 rounded-[4px] px-2 py-1.5">
          아직 입력하지 않았습니다
        </div>
      ) : (
        <div className="text-[13px] text-ink-800 leading-snug whitespace-pre-wrap">{field.value}</div>
      )}
    </div>
  )
}

function StaticNote({ text }: { text: string }) {
  return (
    <div className="text-xs text-ink-400 flex items-center gap-1.5 py-1">
      <svg className="w-3.5 h-3.5 shrink-0 text-accent-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
      {text}
    </div>
  )
}

function CostPreview({ data }: { data: ProposalFormData }) {
  const t = calcEstimateTotals(data.estimate)
  const { laborItems, costItems } = data.estimate

  if (laborItems.length === 0 && costItems.length === 0) {
    return (
      <div className="text-xs text-accent-amber italic border border-dashed border-accent-amber/40 bg-amber-50 rounded-[4px] px-2 py-1.5">
        인력 또는 비용 항목이 없습니다
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      {laborItems.map((it) => (
        <div key={it.id} className="flex items-center justify-between text-[12px]">
          <span className="text-ink-600 truncate">{it.role || '(역할 미입력)'} · {it.months}M/M</span>
          <span className="text-ink-800 font-medium tabular-nums shrink-0">{formatWon(laborAmount(it))}</span>
        </div>
      ))}
      {costItems.map((it) => (
        <div key={it.id} className="flex items-center justify-between text-[12px]">
          <span className="text-ink-600 truncate">[{COST_ITEM_CATEGORY_LABEL[it.category]}] {it.name || '(품목 미입력)'}</span>
          <span className="text-ink-800 font-medium tabular-nums shrink-0">{formatWon(costAmount(it))}</span>
        </div>
      ))}
      <div className="flex items-center justify-between text-[13px] font-bold pt-1.5 mt-0.5 border-t border-line text-brand-700">
        <span>총 합계</span>
        <span className="tabular-nums">{formatWon(t.grandTotal)}</span>
      </div>
    </div>
  )
}

function ScopePreview({ data }: { data: ProposalFormData }) {
  const { inScope, outOfScope, assumptions, dependencies } = data.scope

  const list = (items: typeof inScope, dot: string, emptyText: string) =>
    items.length === 0 ? (
      <div className="text-xs text-accent-amber italic border border-dashed border-accent-amber/40 bg-amber-50 rounded-[4px] px-2 py-1.5">
        {emptyText}
      </div>
    ) : (
      <div className="flex flex-col gap-1">
        {items.map((it) => (
          <div key={it.id} className="flex items-start gap-1.5 text-[12px] text-ink-700">
            <span className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${dot}`} />
            <span>{it.text || '(내용 미입력)'}</span>
          </div>
        ))}
      </div>
    )

  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="text-[10px] font-semibold text-ink-400 uppercase tracking-wide mb-1">포함 범위 (In Scope)</div>
        {list(inScope, 'bg-accent-green', '포함 범위가 없습니다')}
      </div>
      <div>
        <div className="text-[10px] font-semibold text-ink-400 uppercase tracking-wide mb-1">제외 범위 (Out of Scope)</div>
        {list(outOfScope, 'bg-accent-red', '제외 범위가 없습니다')}
      </div>
      <StaticNote text={`전제 조건 ${assumptions.length}건 · 의존성 ${dependencies.length}건 포함`} />
    </div>
  )
}

function sectionBody(id: SectionId, data: ProposalFormData) {
  switch (id) {
    case 'EXEC':
      return execFields(data).map((f) => <FieldRow key={f.label} field={f} />)
    case 'ANALYSIS':
      return analysisFields(data).map((f) => <FieldRow key={f.label} field={f} />)
    case 'SOLUTION':
      return solutionFields(data).map((f) => <FieldRow key={f.label} field={f} />)
    case 'EFFECT':
      return [
        ...effectFields(data).map((f) => <FieldRow key={f.label} field={f} />),
        <StaticNote key="static" text="운영 효율·품질 향상 등 표준 문구가 함께 포함됩니다" />,
      ]
    case 'SCOPE':
      return <ScopePreview data={data} />
    case 'SCHEDULE':
      return <StaticNote text="Phase 1~4 추진 일정표가 자동 생성됩니다" />
    case 'MANAGEMENT': {
      const subs = data.structure.find((s) => s.id === 'MANAGEMENT')?.subsections ?? []
      const labels: Record<string, string> = { ORG: '수행 조직', QUALITY: '품질 보증', RISK: '리스크 관리' }
      return subs.filter((s) => s.enabled).map((s) => <StaticNote key={s.id} text={`${labels[s.id]} 표준 문구 포함`} />)
    }
    case 'MAINTENANCE':
      return <StaticNote text="유지보수·SLA 표준 문구가 자동 생성됩니다" />
    case 'COST':
      return <CostPreview data={data} />
    case 'WHY_US':
      return <StaticNote text="차별화 포인트 표준 문구가 자동 생성됩니다" />
  }
}

export default function LivePreview({ data }: Props) {
  const enabledSections = data.structure.filter((s) => s.enabled)

  // 사용자가 직접 입력하는 필드만 완료율 계산에 포함 (자동 생성 섹션 제외)
  const inputFields = enabledSections.flatMap((s) => {
    if (s.id === 'EXEC') return execFields(data)
    if (s.id === 'ANALYSIS') return analysisFields(data)
    if (s.id === 'SOLUTION') return solutionFields(data)
    if (s.id === 'EFFECT') return effectFields(data)
    return []
  })
  const filledCount = inputFields.filter((f) => f.value.trim() !== '').length

  return (
    <div className="border border-line rounded-[6px] bg-white overflow-hidden flex flex-col max-h-[calc(100vh-96px)]">
      <div className="form-section-header justify-between shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span className="text-[13px] font-semibold text-ink-900">실시간 미리보기</span>
        </div>
        <span className="badge bg-brand-50 text-brand-600 border border-brand-100">{filledCount}/{inputFields.length} 필드</span>
      </div>

      <div className="overflow-y-auto px-4 py-3 flex flex-col gap-4">
        {/* 표지 미리보기 */}
        <div className="text-center py-4 border-b border-dashed border-line">
          <div className="text-[10px] text-brand-500 font-semibold mb-1">
            {SOLUTION_TITLE[data.category].replace(' 솔루션 제안', '').replace(' 제안', '')} 제안서
          </div>
          <div className={`font-bold text-sm ${data.proposalTitle ? 'text-ink-900' : 'text-accent-amber italic'}`}>
            {data.proposalTitle || '제안서 제목이 여기에 표시됩니다'}
          </div>
          <div className={`text-xs mt-1 ${data.clientName ? 'text-ink-500' : 'text-accent-amber italic'}`}>
            {data.clientName ? `${data.clientName} 귀중` : '고객사명 미입력'}
          </div>
        </div>

        {enabledSections.map((section, idx) => (
          <div key={section.id}>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-4 h-4 rounded-[3px] bg-ink-700 text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                {ROMAN[idx]}
              </span>
              <span className="text-[12px] font-bold text-ink-700">{SECTION_TITLE[section.id](data.category)}</span>
            </div>
            <div className="pl-6">{sectionBody(section.id, data)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
