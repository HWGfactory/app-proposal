import type { ProposalCategory, SectionConfig, SectionId } from '@/types/proposal'

// 카테고리별로 달라지는 섹션 제목 (예: "AI 솔루션 제안" / "클라우드 전환 솔루션 제안")
const SOLUTION_LABEL: Record<ProposalCategory, string> = {
  AI: 'AI 솔루션 제안',
  CLOUD: '클라우드 전환 솔루션 제안',
  ERP: 'ERP 구축 솔루션 제안',
}

function baseStructure(category: ProposalCategory): SectionConfig[] {
  return [
    { id: 'EXEC', label: '경영진 요약', enabled: true, locked: true },
    { id: 'ANALYSIS', label: '현황 분석', enabled: true },
    { id: 'SOLUTION', label: SOLUTION_LABEL[category], enabled: true },
    { id: 'EFFECT', label: '기대 효과', enabled: true },
    { id: 'SCOPE', label: '범위 정의 (In/Out Scope)', enabled: true, locked: true },
    { id: 'SCHEDULE', label: '추진 일정', enabled: true },
    { id: 'DELIVERABLES', label: '단계별 산출물 명세', enabled: true },
    {
      id: 'MANAGEMENT', label: '사업 관리 방안', enabled: true,
      subsections: [
        { id: 'ORG', label: '수행 조직', enabled: true },
        { id: 'QUALITY', label: '품질 보증', enabled: true },
        { id: 'RISK', label: '리스크 관리', enabled: true },
      ],
    },
    { id: 'MAINTENANCE', label: '유지보수 및 지원', enabled: true },
    { id: 'COST', label: '비용 제안', enabled: true, locked: true },
    { id: 'WHY_US', label: '당사를 선택해야 하는 이유', enabled: true },
  ]
}

// 상세 버전: 11개 섹션 전체 포함 (기본값)
export function detailedStructure(category: ProposalCategory): SectionConfig[] {
  return baseStructure(category)
}

// 간략 버전: 핵심만 남긴 축약 구성 — 현황분석 · 산출물명세 · 사업관리 · 유지보수 · 선택이유 제외
const BRIEF_DISABLED: SectionId[] = ['ANALYSIS', 'DELIVERABLES', 'MANAGEMENT', 'MAINTENANCE', 'WHY_US']

export function briefStructure(category: ProposalCategory): SectionConfig[] {
  return baseStructure(category).map((s) => (
    BRIEF_DISABLED.includes(s.id) && !s.locked ? { ...s, enabled: false } : s
  ))
}
