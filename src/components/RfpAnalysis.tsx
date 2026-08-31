'use client'

import { useState } from 'react'
import type { RequirementKind, RfpAnalysisResult, RfpMeta } from '@/lib/rfp/analyze'
import { buildRfpSource } from '@/lib/rfp/prefill'
import type { RfpLine } from '@/lib/rfp/extractText'
import type { RfpSource } from '@/types/proposal'
import type { StrategyBrief } from '@/lib/rfp/strategy'
import StrategyBriefSection from '@/components/StrategyBriefSection'

interface Props {
  result: RfpAnalysisResult
  fileName: string
  brief: StrategyBrief
  /** 배경 문단을 문장으로 복원하는 데 쓰는 원문 줄 */
  lines: RfpLine[]
  onReset: () => void
  onUseForProposal: (rfp: RfpSource) => void
}

const KIND_STYLE: Record<RequirementKind, string> = {
  기능: 'badge-accent',
  비기능: 'badge-neutral',
  기타: 'badge-muted',
}

const META_LABEL: Array<{ key: keyof RfpMeta; label: string }> = [
  { key: 'projectName', label: '사업명' },
  { key: 'client', label: '발주기관' },
  { key: 'budget', label: '사업예산' },
  { key: 'duration', label: '사업기간' },
  { key: 'deadline', label: '제출기한' },
]

function PageBadge({ page }: { page: number }) {
  return (
    <span className="text-[10px] text-ink-400 font-medium tabular-nums shrink-0 mt-0.5">{page}p</span>
  )
}

export default function RfpAnalysis({ result, fileName, brief, lines, onReset, onUseForProposal }: Props) {
  const { meta, requirements, evaluations } = result
  const totalScore = evaluations.reduce((sum, e) => sum + (e.score ?? 0), 0)

  // 기본적으로 전부 선택해 두고, 불필요한 항목만 해제하도록 한다.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(requirements.map((req) => req.id))
  )

  const toggle = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const allSelected = selectedIds.size === requirements.length && requirements.length > 0

  return (
    <div className="flex flex-col gap-4">
      {/* 요약 바 */}
      <div className="card px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <svg className="w-4 h-4 text-accent-green shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm font-semibold text-ink-900 truncate">{fileName}</span>
          <span className="text-xs text-ink-400 shrink-0">
            요구사항 {requirements.length}건 · 평가항목 {evaluations.length}건
            {totalScore > 0 && ` · 배점 합계 ${totalScore}점`}
          </span>
        </div>
        <button type="button" onClick={onReset} className="btn-secondary !py-1.5 !px-3 shrink-0">
          다른 파일 분석
        </button>
      </div>

      {/* 사업 개요 */}
      <div className="form-section">
        <div className="form-section-header">
          <span className="fs-index">1</span>
          <div className="min-w-0">
            <div className="fs-title">사업 개요</div>
            <div className="fs-desc">&ldquo;항목: 값&rdquo; 형태로 기재된 줄에서 찾은 정보입니다</div>
          </div>
        </div>
        <div className="form-section-body grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
          {META_LABEL.map(({ key, label }) => (
            <div key={key} className="flex flex-col gap-1">
              <span className="section-label">{label}</span>
              {meta[key] ? (
                <span className="text-sm text-ink-900">{meta[key]}</span>
              ) : (
                <span className="text-sm text-ink-300 italic">RFP에서 찾지 못했습니다</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 요구사항 */}
      <div className="form-section">
        <div className="form-section-header">
          <span className="fs-index">2</span>
          <div className="min-w-0">
            <div className="fs-title">
              요구사항 <span className="text-ink-400 font-normal tabular-nums">({selectedIds.size}/{requirements.length}건 선택)</span>
            </div>
            <div className="fs-desc">
              체크한 항목이 제안서의 &ldquo;포함 범위(In Scope)&rdquo;로 채워집니다. 누락·오탐이 있을 수 있으니 원문과 대조하세요
            </div>
          </div>
          {requirements.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedIds(allSelected ? new Set() : new Set(requirements.map((r) => r.id)))}
              className="ml-auto shrink-0 text-xs font-semibold text-brand-400 hover:text-brand-200"
            >
              {allSelected ? '전체 해제' : '전체 선택'}
            </button>
          )}
        </div>
        <div className="form-section-body">
          {requirements.length === 0 ? (
            <div className="text-xs text-ink-400 italic">추출된 요구사항이 없습니다.</div>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {requirements.map((req) => (
                <li key={req.id}>
                  <label className="flex items-start gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(req.id)}
                      onChange={() => toggle(req.id)}
                      className="mt-0.5 w-3.5 h-3.5 shrink-0 accent-brand-500 cursor-pointer"
                    />
                    <PageBadge page={req.page} />
                    <span className={`badge shrink-0 ${KIND_STYLE[req.kind]}`}>{req.kind}</span>
                    <span
                      className={`text-sm leading-relaxed transition-colors
                      ${selectedIds.has(req.id) ? 'text-ink-900' : 'text-ink-300 line-through'}`}
                    >
                      {req.text}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* 평가 기준 */}
      <div className="form-section">
        <div className="form-section-header">
          <span className="fs-index">3</span>
          <div className="min-w-0">
            <div className="fs-title">
              평가 기준 <span className="text-ink-400 font-normal tabular-nums">({evaluations.length}건)</span>
            </div>
            <div className="fs-desc">배점이 큰 항목일수록 제안서에서 비중 있게 다뤄야 합니다</div>
          </div>
        </div>
        <div className="form-section-body">
          {evaluations.length === 0 ? (
            <div className="text-xs text-ink-400 italic">추출된 평가 기준이 없습니다.</div>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {evaluations.map((item) => (
                <li key={item.id} className="flex items-start gap-2">
                  <PageBadge page={item.page} />
                  <span className="text-sm text-ink-900 leading-relaxed flex-1">{item.label}</span>
                  {item.score !== null && (
                    <span className="badge badge-accent shrink-0 tabular-nums">{item.score}점</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <StrategyBriefSection brief={brief} />

      {/* 제안서 작성으로 인계 */}
      <div className="flex items-center justify-end gap-3 pt-1">
        <span className="text-xs text-ink-400">
          사업 개요와 선택한 요구사항 {selectedIds.size}건이 제안서에 자동 반영됩니다
        </span>
        <button
          type="button"
          onClick={() => onUseForProposal(buildRfpSource(result, selectedIds, fileName, brief, lines))}
          className="btn-primary"
        >
          이 내용으로 제안서 작성
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5-5 5M6 12h12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
