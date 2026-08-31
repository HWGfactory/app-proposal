import type { RequirementKind } from '@/lib/rfp/analyze'
import type { BackgroundLine, EvaluationFocus } from '@/lib/rfp/strategy'
import type { WinThemeEvidence } from '@/lib/rfp/winTheme'

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

  // ── 전략 브리프에서 넘어오는 선택 데이터 ──────────────────────────────────
  // strategy.ts가 이미 계산해 둔 것을 그대로 실어 나른다. 여기서 다시 만들지
  // 않는다. buildRfpSource에 brief를 넘기지 않으면 비어 있고, 이 값에 기대는
  // 슬라이드는 그때 조건부로 생략된다.

  /** 사업 배경·목적 문단. AS-IS 서술의 근거가 된다 */
  background?: BackgroundLine[]
  /** 평가 항목별 배점 비중과 그 근거가 되는 요구사항 */
  focus?: EvaluationFocus[]
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

// ── 브랜드 아이덴티티 ────────────────────────────────────────────────────────
// 로고에서 뽑은 색이 제안서(PPTX) 전체 팔레트를 결정한다. 로고를 넣지 않으면
// brandColor.ts의 DEFAULT_BRAND가 쓰인다.
export interface BrandIdentity {
  logoDataUrl: string | null   // PPTX 표지 삽입용 (data:image/png;base64,...)
  colors: string[]             // 로고에서 추출한 색 후보 (#RRGGBB)
  primary: string | null       // 사용자가 고른 대표색
}

// 확정된 Win Theme. 문서 전체의 축이 되므로 한 줄 선언뿐 아니라 전략 축 이름과
// 근거까지 함께 넘긴다.
export interface WinThemeSelection {
  angle: string
  headline: string
  evidence: WinThemeEvidence[]
}

export interface ProposalFormData {
  companyName: string          // 제안사 (우리 회사)
  preparedBy: string           // 작성자
  preparedDate: string         // 작성일
  winTheme: WinThemeSelection | null
  brand: BrandIdentity
  companyProfile: CompanyProfile
  rfp: RfpSource
}
