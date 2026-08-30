'use client'

import type { ComplianceCategory, StrategyBrief } from '@/lib/rfp/strategy'

interface Props {
  brief: StrategyBrief
}

const CATEGORY_LABEL: Record<ComplianceCategory, string> = {
  평가: '평가·과락',
  제출: '제출',
  분량: '분량',
  자격: '자격·인증',
  준수: '법규 준수',
}

function WarnIcon() {
  return (
    <svg className="w-3.5 h-3.5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    </svg>
  )
}

export default function StrategyBriefSection({ brief }: Props) {
  const { compliance, keywords, focus, totalScore, pageLimit } = brief
  const criticalCount = compliance.filter((c) => c.critical).length

  return (
    <>
      {/* 놓치기 쉬운 조건 */}
      <div className="form-section">
        <div className="form-section-header">
          <span className="fs-index">4</span>
          <div className="min-w-0">
            <div className="fs-title">
              놓치기 쉬운 조건{' '}
              <span className="text-ink-400 font-normal tabular-nums">
                ({compliance.length}건 · 필수 {criticalCount}건)
              </span>
            </div>
            <div className="fs-desc">
              과락·제출·분량처럼 어기면 실격·감점으로 직결되는 조항을 원문에서 뽑았습니다. 제안서 작성 전 먼저 확인하세요
            </div>
          </div>
        </div>
        <div className="form-section-body">
          {compliance.length === 0 ? (
            <div className="text-xs text-ink-400 italic">추출된 조건이 없습니다.</div>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {compliance.map((item) => (
                <li
                  key={item.id}
                  className={`flex items-start gap-2 rounded-[6px] px-2.5 py-2 ${
                    item.critical ? 'bg-brand-50 border border-brand-200 text-brand-700' : 'bg-surface'
                  }`}
                >
                  {item.critical ? (
                    <WarnIcon />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-ink-300 shrink-0 mt-[7px]" />
                  )}
                  <span className="text-[10px] text-ink-400 font-medium tabular-nums shrink-0 mt-0.5">
                    {item.page}p
                  </span>
                  <span className={`badge shrink-0 ${item.critical ? 'badge-accent' : 'badge-muted'}`}>
                    {CATEGORY_LABEL[item.category]}
                  </span>
                  <span className={`text-sm leading-relaxed ${item.critical ? 'text-ink-900' : 'text-ink-700'}`}>
                    {item.detail}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* 배점별 집필 배분 */}
      <div className="form-section">
        <div className="form-section-header">
          <span className="fs-index">5</span>
          <div className="min-w-0">
            <div className="fs-title">
              배점별 집필 배분{' '}
              <span className="text-ink-400 font-normal tabular-nums">
                (총 {totalScore}점{pageLimit ? ` · 본문 ${pageLimit}p 제한` : ''})
              </span>
            </div>
            <div className="fs-desc">
              배점이 큰 항목에 분량을 몰아야 승률이 오릅니다. 각 항목 아래는 근거가 되는 RFP 요구사항입니다
            </div>
          </div>
        </div>
        <div className="form-section-body">
          {focus.length === 0 ? (
            <div className="text-xs text-ink-400 italic">배점이 확인된 평가 항목이 없습니다.</div>
          ) : (
            <ul className="flex flex-col gap-3.5">
              {focus.map((item) => (
                <li key={item.id} className="flex flex-col gap-1.5">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold text-ink-900 flex-1 leading-snug">{item.label}</span>
                    <span className="badge badge-accent shrink-0 tabular-nums">{item.score}점</span>
                    {item.recommendedPages !== null && (
                      <span className="badge badge-neutral shrink-0 tabular-nums">권장 {item.recommendedPages}p</span>
                    )}
                  </div>

                  {/* 배점 비중 막대 */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-surface-sunken overflow-hidden">
                      <div className="h-full bg-brand-500" style={{ width: `${item.sharePct}%` }} />
                    </div>
                    <span className="text-[11px] text-ink-500 tabular-nums shrink-0 w-11 text-right">
                      {item.sharePct}%
                    </span>
                  </div>

                  {item.relatedRequirements.length > 0 && (
                    <ul className="flex flex-col gap-1 pl-3 border-l-2 border-line">
                      {item.relatedRequirements.map((req) => (
                        <li key={req.id} className="flex items-start gap-1.5">
                          <span className="text-[10px] text-ink-400 tabular-nums shrink-0 mt-0.5">{req.page}p</span>
                          <span className="text-xs text-ink-600 leading-relaxed">{req.text}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* 핵심 키워드 */}
      <div className="form-section">
        <div className="form-section-header">
          <span className="fs-index">6</span>
          <div className="min-w-0">
            <div className="fs-title">
              핵심 키워드 <span className="text-ink-400 font-normal tabular-nums">({keywords.length})</span>
            </div>
            <div className="fs-desc">
              RFP에 자주 나온 말입니다. 강조 표시된 것은 평가 기준·요구사항에도 등장하므로 제안서에서 그대로 받아써야 합니다
            </div>
          </div>
        </div>
        <div className="form-section-body">
          {keywords.length === 0 ? (
            <div className="text-xs text-ink-400 italic">추출된 키워드가 없습니다.</div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {keywords.map((k) => (
                <span
                  key={k.term}
                  className={`badge ${k.weighted ? 'badge-accent' : 'badge-neutral'}`}
                  title={k.weighted ? '평가 기준·요구사항에 등장' : '본문에 등장'}
                >
                  {k.term}
                  <span className="tabular-nums opacity-60">{k.count}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
