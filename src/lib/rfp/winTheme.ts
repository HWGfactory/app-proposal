/**
 * RFP 분석 결과에서 Win Theme 후보를 만든다.
 *
 * Win Theme은 "왜 우리가 이 프로젝트를 해야 하는가"에 대한 한 줄 답변이다.
 * 고객의 배경과 의도에 공감하면서, 우리 팀만이 줄 수 있는 고유 가치를 선언한다.
 *
 * 여기서 만드는 것은 **초안**이다. RFP가 실제로 뒷받침하는 축만 후보로 올리고,
 * 문장은 사용자가 화면에서 고쳐 쓰는 것을 전제로 한다. 근거(evidence)는 전부
 * RFP 원문에서 온 것이라 고객 앞에서 그대로 인용할 수 있다.
 */

import type { RfpAnalysisResult } from './analyze'
import type { StrategyBrief } from './strategy'

export type EvidenceKind = '배경' | '평가' | '요구사항' | '조건'

export interface WinThemeEvidence {
  kind: EvidenceKind
  text: string
  page: number
}

export interface WinTheme {
  id: string
  /** 전략 축 이름 — 무엇을 앞세우는 제안인가 */
  angle: string
  /** 한 줄 선언. 사용자가 고쳐 쓴다 */
  headline: string
  /** 이 축을 고른 이유 */
  rationale: string
  evidence: WinThemeEvidence[]
}

// ── 탐지 패턴 ────────────────────────────────────────────────────────────────

const RELIABILITY = /무중단|가용성|24시간|응답\s*시간|동시\s*접속|장애|성능|안정/
const SECURITY = /ISMS|개인정보|정보통신망|암호화|접근\s*권한|보안|인증\s*기준/
const INTEGRATION = /연동|연계|이관|인터페이스|CRM|기존\s*시스템/

/** 발주기관을 부르는 말. 없으면 일반 표현으로 둔다. */
function clientName(analysis: RfpAnalysisResult): string {
  return analysis.meta.client?.trim() || '발주기관'
}

/**
 * 받침 유무로 조사를 고른다.
 *
 * 기관명은 RFP에서 그대로 읽어 오므로 받침이 있을지 없을지 알 수 없다.
 * "진흥원이"는 맞지만 같은 자리에 "공사이"가 들어가면 첫 문장부터 틀린 말이 된다.
 */
function josa(word: string, withBatchim: string, without: string): string {
  const code = word.charCodeAt(word.length - 1)
  const isHangul = code >= 0xac00 && code <= 0xd7a3
  const hasBatchim = !isHangul || (code - 0xac00) % 28 !== 0
  return word + (hasBatchim ? withBatchim : without)
}

/** 핵심 키워드 중 도메인 성격이 강한 앞쪽 몇 개 */
function topTerms(brief: StrategyBrief, count: number): string[] {
  return brief.keywords.filter((k) => k.weighted).slice(0, count).map((k) => k.term)
}

function requirementEvidence(
  analysis: RfpAnalysisResult,
  pattern: RegExp,
  limit = 3
): WinThemeEvidence[] {
  return analysis.requirements
    .filter((r) => pattern.test(r.text))
    .slice(0, limit)
    .map((r) => ({ kind: '요구사항' as const, text: r.text, page: r.page }))
}

function backgroundEvidence(brief: StrategyBrief, limit = 2): WinThemeEvidence[] {
  return brief.background.slice(0, limit).map((b) => ({
    kind: '배경' as const,
    text: b.text,
    page: b.page,
  }))
}

// ── 생성 ─────────────────────────────────────────────────────────────────────

export function buildWinThemes(
  analysis: RfpAnalysisResult,
  brief: StrategyBrief
): WinTheme[] {
  const themes: WinTheme[] = []
  const client = clientName(analysis)
  const terms = topTerms(brief, 2)
  const termPhrase = terms.length > 0 ? terms.join('·') : '핵심 기능'
  let seq = 0

  const push = (t: Omit<WinTheme, 'id'>) => themes.push({ id: `wt-${(seq += 1)}`, ...t })

  // 1) 최고 배점 항목에 집중 — 점수가 가장 크게 걸린 곳
  const top = brief.focus[0]
  if (top) {
    push({
      angle: '최고 배점 집중',
      headline: `${josa(client, '이', '가')} 가장 높은 배점(${top.score}점·${top.sharePct}%)을 둔 '${top.label}'에, ${termPhrase} 중심의 검증된 실행력으로 답합니다.`,
      rationale: `배점이 가장 큰 항목입니다. 여기서 벌어지는 점수 차이가 순위를 가르므로, 제안서 전체를 이 축으로 정렬하는 것이 가장 안전한 선택입니다.`,
      evidence: [
        { kind: '평가', text: `${top.label} · ${top.score}점 (전체의 ${top.sharePct}%)`, page: 0 },
        ...top.relatedRequirements.map((r) => ({
          kind: '요구사항' as const,
          text: r.text,
          page: r.page,
        })),
        ...backgroundEvidence(brief, 1),
      ],
    })
  }

  // 2) 무중단·성능 — 비기능 조건이 구체적인 수치로 걸려 있을 때
  const reliability = requirementEvidence(analysis, RELIABILITY)
  if (reliability.length >= 2) {
    push({
      angle: '오픈 이후의 안정성',
      headline: `구축보다 어려운 것은 오픈 이후입니다. ${josa(client, '이', '가')} 제시한 가용성·응답 기준을 설계 시점부터 못 박아, 개통 첫날부터 흔들리지 않는 운영을 보장합니다.`,
      rationale: `비기능 요구사항이 ${reliability.length}건 이상 수치로 명시돼 있습니다. 발주기관이 이미 운영 리스크를 걱정하고 있다는 뜻이라, 이 불안을 정면으로 다루면 공감대가 크게 벌어집니다.`,
      evidence: [...reliability, ...backgroundEvidence(brief, 1)],
    })
  }

  // 3) 보안·컴플라이언스 — 인증/법규가 조건으로 걸려 있을 때
  const security = requirementEvidence(analysis, SECURITY)
  const securityCompliance = brief.compliance
    .filter((c) => c.category === '자격' || c.category === '준수')
    .slice(0, 2)
    .map((c) => ({ kind: '조건' as const, text: c.detail, page: c.page }))
  if (security.length + securityCompliance.length >= 2) {
    push({
      angle: '감사까지 통과하는 보안',
      headline: `보안은 마지막에 덧붙이는 항목이 아닙니다. 요구된 인증 기준을 착수 단계 설계에 반영해, 사업 종료 후 감사와 인증 심사까지 그대로 통과하는 체계를 넘겨드립니다.`,
      rationale: `보안·법규 조건이 별도 항목으로 명시돼 있습니다. 공공 사업에서 이 부분은 사후에 문제가 되면 되돌리기 어려운 영역이라, 선제적 대응을 약속하는 것이 강한 차별점이 됩니다.`,
      evidence: [...security, ...securityCompliance],
    })
  }

  // 4) 기존 시스템 연계 — 이 사업의 실제 난이도가 연동에 있을 때
  const integration = requirementEvidence(analysis, INTEGRATION)
  if (integration.length >= 2) {
    push({
      angle: '단절 없는 기존 업무 연계',
      headline: `새 시스템이 기존 업무를 끊지 않아야 합니다. 연계와 데이터 이관을 부수 작업이 아닌 사업의 축으로 다뤄, 전환 당일에도 현업이 멈추지 않게 합니다.`,
      rationale: `연동·이관 요구사항이 ${integration.length}건 확인됩니다. 실패 사례가 대부분 이 지점에서 나오므로, 발주기관이 가장 실질적으로 우려하는 부분입니다.`,
      evidence: [...integration, ...backgroundEvidence(brief, 1)],
    })
  }

  // 5) 과락 방어 — 기술평가 과락이 명시돼 있을 때
  const passMark = brief.compliance.find((c) => c.category === '평가' && c.critical)
  if (passMark) {
    push({
      angle: '과락 없는 기술 완성도',
      headline: `기술평가 과락 기준을 전제로, 모든 평가 항목에 근거를 1:1로 배치했습니다. 화려한 한 장보다 빠짐없는 전 항목 충족으로 심사에 답합니다.`,
      rationale: `과락 조항이 명시된 사업입니다. 한 항목만 비어도 협상 대상에서 제외되므로, 균형 잡힌 전 항목 대응 자체가 경쟁력이 됩니다.`,
      evidence: [
        { kind: '조건', text: passMark.detail, page: passMark.page },
        ...brief.focus.slice(0, 2).map((f) => ({
          kind: '평가' as const,
          text: `${f.label} · ${f.score}점`,
          page: 0,
        })),
      ],
    })
  }

  // 6) 요구사항 전수 대응 — 언제나 성립하는 기본 축
  const reqCount = analysis.requirements.length
  if (reqCount > 0) {
    push({
      angle: '요구사항 전수 대응',
      headline: `제안요청서 요구사항 ${reqCount}건 전체에 대응 방안과 근거 페이지를 1:1로 제시합니다. 심사위원이 무엇도 찾아 헤매지 않아도 되는 제안서를 제출합니다.`,
      rationale: `요구사항이 ${reqCount}건으로 적지 않습니다. 검토자의 확인 부담을 줄여 주는 구성 자체가 평가에서 유리하게 작용합니다.`,
      evidence: [
        ...analysis.requirements.slice(0, 3).map((r) => ({
          kind: '요구사항' as const,
          text: r.text,
          page: r.page,
        })),
      ],
    })
  }

  return themes
}
