// AI 제안서 전용 — 업종 선택 시 자동 채워지는 표준 Pain Point · KPI · 컴플라이언스 프리셋
export interface AIIndustryPreset {
  aiUseCase: string
  currentPainPoint: string
  targetKPI: string
  dataAssets: string
  aiModel: string
  integrationSystems: string
  complianceNote: string
}

export const AI_INDUSTRIES = ['금융', '제조', '유통', '의료'] as const
export type AIIndustry = typeof AI_INDUSTRIES[number]

export const AI_INDUSTRY_PRESETS: Record<AIIndustry, AIIndustryPreset> = {
  금융: {
    aiUseCase: '이상거래 탐지(FDS) 고도화',
    currentPainPoint: '기존 룰 기반 FDS의 오탐률이 높아 상담 인력의 리뷰 부담이 크고, 신종 사기 패턴에 대한 탐지가 지연되고 있습니다.',
    targetKPI: '이상거래 탐지율 95% 이상 달성, 오탐률 30% 감소',
    dataAssets: '최근 3년 거래 로그, 고객 KYC 정보, 기존 룰 기반 FDS 탐지 이력',
    aiModel: '이상 탐지 모델',
    integrationSystems: '코어뱅킹 시스템, 기존 FDS, 고객상담(CRM) 시스템',
    complianceNote: '금융보안원 AI 활용 가이드라인 및 전자금융감독규정 준수',
  },
  제조: {
    aiUseCase: '설비 예지보전(Predictive Maintenance) 및 공정 불량 예측',
    currentPainPoint: '설비 고장을 사후에 인지해 비계획 정지가 잦고, 공정 불량률이 높아 품질 비용이 지속 발생하고 있습니다.',
    targetKPI: '공정 불량률 2% 이하로 감소, 설비 비가동 시간 40% 단축',
    dataAssets: '설비 센서(진동·온도) 시계열 데이터, MES 공정 이력, 품질 검사 데이터',
    aiModel: 'ML 예측 모델',
    integrationSystems: 'MES(제조실행시스템), SCADA, 품질관리시스템(QMS)',
    complianceNote: 'KS/ISO 9001 품질 기준 및 산업안전보건법 데이터 관리 요건 준수',
  },
  유통: {
    aiUseCase: '개인화 추천 및 수요예측 기반 재고 최적화',
    currentPainPoint: '획일적인 상품 추천으로 전환율이 낮고, 수요 예측이 부정확해 품절과 재고 과잉이 반복되고 있습니다.',
    targetKPI: '추천 클릭 전환율 20% 향상, 재고 회전율 15% 개선',
    dataAssets: '고객 구매·행동 로그, 상품 마스터, 재고·발주 이력',
    aiModel: '추천 시스템',
    integrationSystems: '이커머스 플랫폼, POS 시스템, 재고관리시스템(WMS)',
    complianceNote: '개인정보보호법(PIPA) 기반 고객 행동 데이터 처리 방침 준수',
  },
  의료: {
    aiUseCase: '의료영상 판독 보조 및 환자 예후 예측',
    currentPainPoint: '영상 판독 인력 부족으로 판독 대기 시간이 길고, 고위험군 환자를 조기에 선별하기 어렵습니다.',
    targetKPI: '1차 스크리닝 판독 시간 50% 단축, 고위험군 조기 발견율 향상',
    dataAssets: '익명화된 의료영상(DICOM), 전자의무기록(EMR) 이력 데이터',
    aiModel: '컴퓨터 비전',
    integrationSystems: 'PACS(의료영상저장전송시스템), EMR/OCS',
    complianceNote: '의료기기법 및 개인정보보호법(민감정보) 기준 데이터 비식별화 준수',
  },
}
