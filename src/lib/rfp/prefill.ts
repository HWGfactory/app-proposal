/**
 * RFP 분석 결과를 제안서 폼의 초기값으로 옮기는 매핑. 추출 로직(analyze.ts)과
 * 폼 구조가 서로를 모르도록 이 파일이 둘 사이를 이어 준다.
 */

import type { RfpAnalysisResult } from './analyze'

export interface RfpPrefill {
  proposalTitle: string
  clientName: string
  projectBudget: string
  projectDuration: string
  inScope: string[]
}

export function buildPrefill(result: RfpAnalysisResult, selectedIds: Set<string>): RfpPrefill {
  const { meta, requirements } = result

  return {
    proposalTitle: meta.projectName ? `${meta.projectName} 제안서` : '',
    clientName: meta.client ?? '',
    projectBudget: meta.budget ?? '',
    projectDuration: meta.duration ?? '',
    inScope: requirements.filter((req) => selectedIds.has(req.id)).map((req) => req.text),
  }
}
