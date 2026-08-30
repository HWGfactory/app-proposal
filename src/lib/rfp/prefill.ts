/**
 * RFP 분석 결과를 제안서 생성용 데이터(RfpSource)로 옮기는 매핑.
 * 추출 로직(analyze.ts)과 제안서 데이터 모델이 서로를 모르도록 둘 사이를 이어 준다.
 */

import type { RfpAnalysisResult } from './analyze'
import type { RfpSource } from '@/types/proposal'

export function buildRfpSource(
  result: RfpAnalysisResult,
  selectedIds: Set<string>,
  fileName: string
): RfpSource {
  const { meta, requirements, evaluations } = result

  return {
    fileName,
    projectName: meta.projectName ?? '',
    client: meta.client ?? '',
    budget: meta.budget ?? '',
    duration: meta.duration ?? '',
    requirements: requirements
      .filter((req) => selectedIds.has(req.id))
      .map((req) => ({
        id: req.id,
        requirement: req.text,
        kind: req.kind,
        page: req.page,
      })),
    evaluations: evaluations.map((item) => ({
      id: item.id,
      label: item.label,
      score: item.score,
      page: item.page,
    })),
  }
}
