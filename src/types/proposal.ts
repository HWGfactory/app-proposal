export type ProposalCategory = 'AI' | 'CLOUD' | 'ERP'

// ── 항목별 견적 ──────────────────────────────────────────────────────────────
export interface LaborItem {
  id: string
  role: string          // 투입 역할 (예: PM, 백엔드 개발, AI 엔지니어)
  grade: string          // 등급 (예: 특급, 고급, 중급, 초급)
  months: number          // 투입 공수 (M/M)
  monthlyRate: number    // 월 단가 (원)
}

export const COST_ITEM_CATEGORIES = ['SW', 'HW', 'CLOUD', 'ETC'] as const
export type CostItemCategory = typeof COST_ITEM_CATEGORIES[number]

export const COST_ITEM_CATEGORY_LABEL: Record<CostItemCategory, string> = {
  SW: 'SW 라이선스',
  HW: 'HW 장비',
  CLOUD: '클라우드 비용',
  ETC: '기타',
}

export interface CostItem {
  id: string
  category: CostItemCategory
  name: string          // 품목명
  quantity: number        // 수량
  unitPrice: number      // 단가 (원)
}

export interface EstimateData {
  laborItems: LaborItem[]
  costItems: CostItem[]
  discountRate: number   // 할인율 (%)
  vatRate: number         // 부가세율 (%)
}

// ── 범위 정의 (In/Out Scope, 전제조건, 의존성) ──────────────────────────────
export interface ScopeItem {
  id: string
  text: string
}

export interface ScopeData {
  inScope: ScopeItem[]        // 포함 범위 (In Scope)
  outOfScope: ScopeItem[]     // 제외 범위 (Out of Scope)
  assumptions: ScopeItem[]    // 전제 조건 (Assumptions)
  dependencies: ScopeItem[]   // 의존성 (Dependencies)
}

// ── 문서 구성 (섹션 순서 · 포함 여부) ────────────────────────────────────────
// 표지는 항상 1페이지 고정이라 구성 대상에서 제외. 아래 11개가 배열 순서대로 렌더링됨.
export type SectionId =
  | 'EXEC'          // I.    경영진 요약
  | 'ANALYSIS'      // II.   현황 분석
  | 'SOLUTION'      // III.  솔루션 제안
  | 'EFFECT'        // IV.   기대 효과
  | 'SCOPE'         // V.    범위 정의 (In/Out Scope)
  | 'SCHEDULE'      // VI.   추진 일정
  | 'DELIVERABLES'  // VII.  단계별 산출물 명세
  | 'MANAGEMENT'    // VIII. 사업 관리 방안
  | 'MAINTENANCE'   // IX.   유지보수 및 지원
  | 'COST'          // X.    비용 제안
  | 'WHY_US'        // XI.   당사를 선택해야 하는 이유

export interface SubsectionConfig {
  id: string
  label: string
  enabled: boolean
}

export interface SectionConfig {
  id: SectionId
  label: string
  enabled: boolean
  locked?: boolean            // true면 끌 수 없음 (경영진 요약 · 비용 제안은 항상 포함)
  subsections?: SubsectionConfig[]  // 현재는 '사업 관리 방안'(조직/품질/리스크)만 보유
}

export interface BaseFields {
  // 공통
  proposalTitle: string        // 제안서 제목
  companyName: string          // 제안사 (우리 회사)
  clientName: string           // 고객사명
  clientIndustry: string       // 고객사 업종
  preparedBy: string           // 작성자
  preparedDate: string         // 작성일
  projectBudget: string        // 예상 예산
  projectDuration: string      // 예상 기간
  executiveSummary: string     // 한 줄 요약 (AI가 확장)
  estimate: EstimateData        // 항목별 견적
  scope: ScopeData               // 범위 정의 (In/Out Scope, 전제조건, 의존성)
  structure: SectionConfig[]    // 문서 구성 (순서 · 포함 여부)
}

export interface AIFields extends BaseFields {
  // AI 솔루션 전용
  aiUseCase: string            // AI 활용 케이스 (예: 고객 상담 자동화)
  currentPainPoint: string     // 현재 Pain Point
  targetKPI: string            // 목표 KPI (예: 상담 처리 시간 50% 단축)
  dataAssets: string           // 보유 데이터 자산
  aiModel: string              // AI 모델/기술 (예: LLM, Vision, Forecasting)
  integrationSystems: string   // 연동 시스템
  pilotScope: string           // 파일럿 범위
  complianceNote: string       // 업종 컴플라이언스 요건 (예: 금융보안원 가이드 준수)
}

export interface CloudFields extends BaseFields {
  // 클라우드 전용
  currentInfra: string         // 현재 인프라 현황 (On-premise 규모 등)
  migrationScope: string       // 마이그레이션 범위
  cloudProvider: string        // 클라우드 공급사 (AWS/Azure/GCP/멀티)
  targetArchitecture: string   // 목표 아키텍처 (MSA, Serverless 등)
  complianceRequirements: string // 컴플라이언스 요건 (ISMS, ISO 등)
  disasterRecovery: string     // DR/백업 정책
  optimizationGoal: string     // 최적화 목표 (비용/성능/보안)
}

export interface ERPFields extends BaseFields {
  // ERP 전용
  erpScope: string             // ERP 범위 (회계/SCM/HR/생산 등)
  currentSystem: string        // 현재 사용 시스템 (Legacy ERP, Excel 등)
  companySize: string          // 임직원 규모
  businessProcess: string      // 핵심 업무 프로세스
  customizationLevel: string   // 커스터마이징 수준 (표준/중간/대규모)
  dataVolume: string           // 데이터 이관 규모
  goLiveDate: string           // 목표 Go-Live 일정
}

export type ProposalFormData =
  | (AIFields & { category: 'AI' })
  | (CloudFields & { category: 'CLOUD' })
  | (ERPFields & { category: 'ERP' })
