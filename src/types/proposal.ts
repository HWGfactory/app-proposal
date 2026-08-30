import type { RequirementKind } from '@/lib/rfp/analyze'

// ── RFP 원본 (제안서의 출발점) ───────────────────────────────────────────────
// 제안서는 항상 특정 RFP에 대한 응답이다. 사용자가 입력하는 것은 제안사 정보뿐이며,
// 사업에 관한 나머지 내용은 전부 아래 데이터에서 자동으로 만들어진다.
export interface RfpRequirementItem {
  id: string
  requirement: string      // RFP 원문 요구사항
  kind: RequirementKind
  page: number             // RFP 내 근거 페이지
}

export interface EvaluationCriterion {
  id: string
  label: string
  score: number | null
  page: number
}

export interface RfpSource {
  fileName: string
  projectName: string      // 사업명
  client: string           // 발주기관
  budget: string           // 사업 예산
  duration: string         // 사업 기간
  requirements: RfpRequirementItem[]
  evaluations: EvaluationCriterion[]
}

// ── 제안사 정보 (사용자가 입력하는 유일한 영역) ──────────────────────────────
export interface ProfileItem {
  id: string
  text: string
}

export interface TrackRecordItem {
  id: string
  client: string        // 고객사명 또는 프로젝트명 (익명 처리 가능)
  year: string            // 수행 연도
  description: string   // 프로젝트 개요 및 성과
}

export interface CompanyProfile {
  intro: string                       // 회사 소개 (연혁, 핵심 사업, 비전)
  coreCompetencies: ProfileItem[]     // 핵심 역량 / 강점
  trackRecords: TrackRecordItem[]     // 주요 수행 실적
}

export interface ProposalFormData {
  companyName: string          // 제안사 (우리 회사)
  preparedBy: string           // 작성자
  preparedDate: string         // 작성일
  companyProfile: CompanyProfile
  rfp: RfpSource
}
