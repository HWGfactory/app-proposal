/**
 * RFP 분석 결과를 제안서 생성용 데이터(RfpSource)로 옮기는 매핑.
 * 추출 로직(analyze.ts)과 제안서 데이터 모델이 서로를 모르도록 둘 사이를 이어 준다.
 */

import type { RfpAnalysisResult } from './analyze'
import type { RfpLine } from './extractText'
import type { BackgroundLine, StrategyBrief } from './strategy'
import type { RfpSource } from '@/types/proposal'

// 문단이 아니라 새 항목이 시작되는 자리. 여기서 이어 붙이기를 멈춘다.
const BLOCK_START = /^(?:\d+[.)]|[-·•*]|[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ][.)]|\d+\.\d+)/

/**
 * 배경 문단을 문장 단위로 복원한다.
 *
 * PDF에서 뽑은 "줄"은 문장이 아니라 시각적 줄바꿈이라, 그대로 쓰면
 * "…평균 대기"처럼 낱말 한가운데서 끊긴 조각이 제안서에 실린다.
 * 브리프가 고른 줄들의 앞뒤를 원문에서 되찾아 이어 붙인 뒤, 문장 끝에서
 * 다시 자른다.
 *
 * 이어 붙이는 범위는 원문에서 실제로 연속한 줄로만 한정한다. 브리프가
 * 중간 줄을 걸러냈더라도 원문에는 있으므로 되살아나며, 없는 문장이
 * 만들어지지는 않는다.
 */
function restoreBackground(picked: BackgroundLine[], lines: RfpLine[]): BackgroundLine[] {
  if (picked.length === 0 || lines.length === 0) return picked

  const indexOf = (b: BackgroundLine) =>
    lines.findIndex((l) => l.page === b.page && l.text === b.text)
  const hits = picked.map(indexOf).filter((i) => i >= 0)
  if (hits.length === 0) return picked

  const from = Math.min(...hits)
  let to = Math.max(...hits)

  // 마지막 줄이 문장 중간에서 끝나면, 문장이 끝날 때까지만 더 따라간다.
  for (let n = 0; n < 4 && to + 1 < lines.length; n++) {
    if (/[.!?]$/.test(lines[to].text)) break
    const next = lines[to + 1]
    if (next.page !== lines[to].page || BLOCK_START.test(next.text)) break
    to++
  }

  const page = lines[from].page
  const blob = lines
    .slice(from, to + 1)
    .map((l) => l.text)
    .join(' ')
    .replace(/\s{2,}/g, ' ')

  // 문장 끝(…다. …함. …음.)에서 자른다. 못 자르면 통째로 한 덩이가 된다.
  return blob
    // 마침표를 이스케이프하지 않으면 "리드타임을 "처럼 문장 한가운데서 잘린다.
    .split(/(?<=[다함음됨임]\.)\s*/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10)
    .map((text) => ({ text, page }))
}

/**
 * brief와 lines는 선택 인자다. 넘기지 않으면 결과가 예전과 완전히 같으므로,
 * 이를 모르는 호출부가 있어도 깨지지 않는다.
 */
export function buildRfpSource(
  result: RfpAnalysisResult,
  selectedIds: Set<string>,
  fileName: string,
  brief?: StrategyBrief,
  lines?: RfpLine[]
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
          background: lines ? restoreBackground(brief.background, lines) : brief.background,
          // 사용자가 체크 해제한 요구사항은 제안서에 없으므로 근거에서도 뺀다.
          focus: brief.focus.map((f) => ({
            ...f,
            relatedRequirements: f.relatedRequirements.filter((r) => selectedIds.has(r.id)),
          })),
        }
      : {}),
  }
}
