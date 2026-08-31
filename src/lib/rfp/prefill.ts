/**
 * RFP 분석 결과를 제안서 생성용 데이터(RfpSource)로 옮기는 매핑.
 * 추출 로직(analyze.ts)과 제안서 데이터 모델이 서로를 모르도록 둘 사이를 이어 준다.
 */

import type { RfpAnalysisResult } from './analyze'
import type { StrategyBrief } from './strategy'
import type { RfpSource } from '@/types/proposal'

/**
 * brief는 선택 인자다. 넘기지 않으면 결과가 예전과 완전히 같으므로,
 * 브리프를 모르는 호출부가 있어도 깨지지 않는다.
 */
export function buildRfpSource(
  result: RfpAnalysisResult,
  selectedIds: Set<string>,
  fileName: string,
  brief?: StrategyBrief
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

    ...(brief
      ? {
          background: brief.background,
          // 사용자가 체크 해제한 요구사항은 제안서에 없으므로 근거에서도 뺀다.
          focus: brief.focus.map((f) => ({
            ...f,
            relatedRequirements: f.relatedRequirements.filter((r) => selectedIds.has(r.id)),
          })),
        }
      : {}),
  }
}
