'use client'

import type { ProposalCategory } from '@/types/proposal'

const CATEGORIES = [
  {
    id: 'AI' as ProposalCategory,
    title: 'AI 솔루션',
    subtitle: 'Artificial Intelligence',
    desc: 'LLM, 머신러닝, 컴퓨터 비전 등 AI 기반 솔루션 도입·구축 제안서',
    tags: ['LLM / 생성 AI', '예측 모델', '이상 탐지', '자동화'],
    iconBg: 'bg-brand-50 text-brand-600',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
        <rect x="7" y="7" width="10" height="10" rx="1.5" />
        <path strokeLinecap="round" d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" />
      </svg>
    ),
  },
  {
    id: 'CLOUD' as ProposalCategory,
    title: '클라우드 전환',
    subtitle: 'Cloud Migration',
    desc: 'AWS·Azure·GCP 기반 인프라 마이그레이션 및 아키텍처 현대화 제안서',
    tags: ['클라우드 마이그레이션', 'MSA', 'DevOps', '비용 최적화'],
    iconBg: 'bg-sky-50 text-sky-600',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 18a4 4 0 01-.6-7.96A5.5 5.5 0 0117 9.5a4.5 4.5 0 01-.5 8.98H7z" />
      </svg>
    ),
  },
  {
    id: 'ERP' as ProposalCategory,
    title: 'ERP 구축',
    subtitle: 'Enterprise Resource Planning',
    desc: '회계·SCM·HR·생산관리 통합 ERP 시스템 도입 및 구축 제안서',
    tags: ['재무 / 회계', '구매 / SCM', '인사 / 급여', '생산관리'],
    iconBg: 'bg-violet-50 text-violet-600',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
        <rect x="4" y="3" width="16" height="18" rx="1" />
        <path strokeLinecap="round" d="M8 7h1M8 11h1M8 15h1M12 7h1M12 11h1M12 15h1M16 7h1M16 11h1M16 15h1" />
      </svg>
    ),
  },
]

export default function CategorySelector({ onSelect }: { onSelect: (c: ProposalCategory) => void }) {
  return (
    <div className="max-w-5xl mx-auto">
      {/* 헤더 */}
      <div className="mb-6">
        <div className="section-label mb-2">신규 제안서</div>
        <h1 className="text-xl font-bold text-ink-900 mb-1.5">어떤 솔루션 제안서를 만드시겠습니까?</h1>
        <p className="text-ink-500 text-sm">모듈을 선택하면 해당 분야에 최적화된 입력 폼이 제공됩니다.</p>
      </div>

      {/* 모듈 타일 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className="group text-left card p-4 flex flex-col hover:border-brand-400 hover:shadow-popover transition-all duration-150"
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 rounded-[6px] flex items-center justify-center ${cat.iconBg}`}>
                <span className="w-5 h-5">{cat.icon}</span>
              </div>
              <svg className="w-4 h-4 text-ink-300 group-hover:text-brand-500 transition-colors mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>

            <div className="font-semibold text-ink-900 text-sm mb-0.5">{cat.title}</div>
            <div className="text-[11px] text-ink-400 mb-2.5">{cat.subtitle}</div>
            <p className="text-[13px] text-ink-500 leading-relaxed mb-3.5 flex-1">{cat.desc}</p>

            <div className="flex flex-wrap gap-1.5 pt-3 border-t border-line">
              {cat.tags.map((tag) => (
                <span key={tag} className="badge bg-surface-sunken text-ink-500 border border-line">
                  {tag}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>

      {/* 안내 */}
      <div className="mt-5 flex items-center gap-2 text-xs text-ink-400">
        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        생성된 제안서는 Word (.docx) 형식으로 즉시 다운로드됩니다.
      </div>
    </div>
  )
}
