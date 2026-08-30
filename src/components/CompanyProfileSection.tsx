'use client'

import type { CompanyProfile, ProfileItem, TrackRecordItem } from '@/types/proposal'
import { createTrackRecordItem } from '@/lib/companyProfile'
import { newId } from '@/lib/id'

interface Props {
  value: CompanyProfile
  onChange: (next: CompanyProfile) => void
}

function DeleteBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-7 h-7 rounded-[4px] flex items-center justify-center text-ink-300 hover:text-accent-red hover:bg-red-50 transition-colors shrink-0"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  )
}

function AddBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="self-start text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
      {label}
    </button>
  )
}

export default function CompanyProfileSection({ value, onChange }: Props) {
  const setIntro = (intro: string) => onChange({ ...value, intro })

  const addCompetency = () => onChange({ ...value, coreCompetencies: [...value.coreCompetencies, { id: newId('comp'), text: '' }] })
  const updateCompetency = (id: string, text: string) =>
    onChange({ ...value, coreCompetencies: value.coreCompetencies.map((c: ProfileItem) => (c.id === id ? { ...c, text } : c)) })
  const removeCompetency = (id: string) =>
    onChange({ ...value, coreCompetencies: value.coreCompetencies.filter((c) => c.id !== id) })

  const addTrackRecord = () => onChange({ ...value, trackRecords: [...value.trackRecords, createTrackRecordItem()] })
  const updateTrackRecord = (id: string, patch: Partial<TrackRecordItem>) =>
    onChange({ ...value, trackRecords: value.trackRecords.map((t) => (t.id === id ? { ...t, ...patch } : t)) })
  const removeTrackRecord = (id: string) =>
    onChange({ ...value, trackRecords: value.trackRecords.filter((t) => t.id !== id) })

  return (
    <div className="form-section">
      <div className="form-section-header">
        <span className="w-5 h-5 rounded-[3px] bg-brand-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
          5
        </span>
        <div className="min-w-0">
          <div className="font-semibold text-ink-900 text-[13px] leading-tight">회사 소개 및 수행 실적</div>
          <div className="text-[11px] text-ink-400 mt-0.5">비워두면 문서에서 해당 항목이 생략됩니다 — 신뢰도를 높이려면 채워주세요</div>
        </div>
      </div>

      <div className="form-section-body flex flex-col gap-5">
        {/* 회사 소개 */}
        <div>
          <label className="text-xs font-semibold text-ink-700 block mb-1.5">회사 소개</label>
          <textarea
            className="textarea-field"
            rows={3}
            value={value.intro}
            onChange={(e) => setIntro(e.target.value)}
            placeholder="예: (주) 우리회사는 2015년 설립 이후 AI·클라우드 전환 프로젝트를 다수 수행해온 IT 솔루션 전문 기업으로, 제조·금융·유통 등 다양한 산업군에서 검증된 구축 역량을 보유하고 있습니다."
          />
        </div>

        {/* 핵심 역량 */}
        <div>
          <span className="section-label block mb-2">핵심 역량 / 강점</span>
          <div className="flex flex-col gap-1.5">
            {value.coreCompetencies.length === 0 && (
              <div className="text-xs text-ink-400 italic px-1 py-1">아직 항목이 없습니다.</div>
            )}
            {value.coreCompetencies.map((c) => (
              <div key={c.id} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0" />
                <input
                  className="input-field !py-1.5 flex-1"
                  value={c.text}
                  onChange={(e) => updateCompetency(c.id, e.target.value)}
                  placeholder="예: AI 도입 프로젝트 30건 이상 수행, 평균 고객 만족도 4.8/5.0"
                />
                <DeleteBtn onClick={() => removeCompetency(c.id)} />
              </div>
            ))}
            <AddBtn onClick={addCompetency} label="역량 추가" />
          </div>
        </div>

        {/* 주요 수행 실적 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="section-label">주요 수행 실적</span>
            <AddBtn onClick={addTrackRecord} label="실적 추가" />
          </div>
          <div className="border border-line rounded-[6px] overflow-hidden">
            {value.trackRecords.length === 0 && (
              <div className="px-3 py-4 text-center text-xs text-ink-400">수행 실적이 없습니다. 항목을 추가해주세요.</div>
            )}
            {value.trackRecords.length > 0 && (
              <div className="grid grid-cols-[1fr_90px_2fr_28px] gap-2 px-3 py-2 bg-surface-sunken text-[11px] font-semibold text-ink-500 border-b border-line">
                <span>고객사 / 프로젝트명</span>
                <span>연도</span>
                <span>개요 및 성과</span>
                <span />
              </div>
            )}
            {value.trackRecords.map((t) => (
              <div key={t.id} className="grid grid-cols-[1fr_90px_2fr_28px] gap-2 px-3 py-2 items-start border-b border-line last:border-b-0">
                <input
                  className="input-field !py-1.5"
                  value={t.client}
                  onChange={(e) => updateTrackRecord(t.id, { client: e.target.value })}
                  placeholder="예: A제조사 (익명 처리 가능)"
                />
                <input
                  className="input-field !py-1.5"
                  value={t.year}
                  onChange={(e) => updateTrackRecord(t.id, { year: e.target.value })}
                  placeholder="2025"
                />
                <input
                  className="input-field !py-1.5"
                  value={t.description}
                  onChange={(e) => updateTrackRecord(t.id, { description: e.target.value })}
                  placeholder="예: 고객 상담 AI 챗봇 구축, 상담 처리 시간 60% 단축"
                />
                <DeleteBtn onClick={() => removeTrackRecord(t.id)} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
