/**
 * extractText.ts가 뽑아낸 줄 단위 텍스트에서 제안서 작성에 필요한 정보를
 * 규칙 기반으로 추출한다. LLM을 쓰지 않으므로 완벽하지 않으며, 사용자가
 * 화면에서 눈으로 확인하고 취사선택하는 것을 전제로 한 "초안 추출"이다.
 *
 * 순수 함수라 브라우저/서버 어디서든 호출할 수 있다.
 */

import type { ExtractedRfp, RfpLine } from './extractText'

export type RequirementKind = '기능' | '비기능' | '기타'

export interface RfpRequirement {
  id: string
  page: number
  kind: RequirementKind
  text: string
}

export interface RfpEvaluationItem {
  id: string
  page: number
  label: string
  score: number | null
}

export interface RfpMeta {
  projectName: string | null
  client: string | null
  budget: string | null
  duration: string | null
  deadline: string | null
}

export interface RfpAnalysisResult {
  meta: RfpMeta
  requirements: RfpRequirement[]
  evaluations: RfpEvaluationItem[]
}

// ── 패턴 ─────────────────────────────────────────────────────────────────────

// "3. 요구사항 정의", "3.1 기능 요구사항" 같은 번호 매겨진 제목.
// 본문 문장이 잘못 걸리지 않도록 길이 제한을 둔다.
const HEADING_PATTERN = /^(\d+(?:\.\d+)*)[.)]?\s+(.{1,40})$/

// "- ", "• ", "가. ", "1) " 등 목록 항목 표시.
const BULLET_PATTERN = /^(?:[-–—•·※○□▪]|[가-하]\.|\d+[).]|[①-⑳])\s*/

// "~해야 한다", "~하여야 함", "~되어야 하며" 등 의무 표현.
// 한국어 RFP에서 요구사항은 거의 항상 이 형태로 서술된다.
const OBLIGATION_PATTERN = /(해야|하여야|되어야|이어야)\s*(한다|하며|하고|함|합니다|할)/

const SCORE_PATTERN = /(\d+(?:\.\d+)?)\s*점/

// 제목에 등장하면 이후 목록을 요구사항 / 평가 항목으로 간주하는 키워드.
const REQUIREMENT_HEADING = /요구\s*사항|요구\s*조건|과업\s*내용|과업\s*범위/
const EVALUATION_HEADING = /평가\s*(기준|항목|방법)|배점|가점|심사\s*기준/

const META_RULES: Array<{ key: keyof RfpMeta; pattern: RegExp }> = [
  { key: 'projectName', pattern: /^(?:사업|과업|용역)\s*명/ },
  { key: 'client', pattern: /^(?:발주\s*(?:기관|처|자)|수요\s*기관)/ },
  { key: 'budget', pattern: /^(?:사업\s*예산|총\s*사업비|예산|사업\s*금액)/ },
  { key: 'duration', pattern: /^(?:사업|과업|용역|계약)\s*기간/ },
  { key: 'deadline', pattern: /^(?:제출\s*(?:기한|마감)|접수\s*마감|마감\s*일시)/ },
]

// ── 내부 헬퍼 ────────────────────────────────────────────────────────────────

type Context = 'requirement' | 'evaluation' | null

function stripBullet(text: string): string {
  return text.replace(BULLET_PATTERN, '').trim()
}

function extractScore(text: string): number | null {
  const match = text.match(SCORE_PATTERN)
  return match ? Number(match[1]) : null
}

/** "기술 이해도 및 방법론: 30점" → "기술 이해도 및 방법론" */
function cleanEvaluationLabel(text: string): string {
  return text.replace(/[:：]?\s*\d+(?:\.\d+)?\s*점\s*$/, '').replace(/[:：]\s*$/, '').trim()
}

function detectKind(headingText: string): RequirementKind {
  if (/비\s*기능/.test(headingText)) return '비기능'
  if (/기능/.test(headingText)) return '기능'
  return '기타'
}

function extractMeta(lines: RfpLine[]): RfpMeta {
  const meta: RfpMeta = {
    projectName: null,
    client: null,
    budget: null,
    duration: null,
    deadline: null,
  }

  for (const line of lines) {
    const separatorIndex = line.text.search(/[:：]/)
    if (separatorIndex <= 0) continue

    const label = stripBullet(line.text.slice(0, separatorIndex)).trim()
    const value = line.text.slice(separatorIndex + 1).trim()
    if (!value) continue

    for (const rule of META_RULES) {
      // 먼저 나온 값을 우선한다. RFP는 앞부분(표지·개요)에 요약 정보를 두는 것이 관례다.
      if (meta[rule.key] === null && rule.pattern.test(label)) {
        meta[rule.key] = value
        break
      }
    }
  }

  return meta
}

// ── 메인 ─────────────────────────────────────────────────────────────────────

export function analyzeRfp(extracted: ExtractedRfp): RfpAnalysisResult {
  const requirements: RfpRequirement[] = []
  const evaluations: RfpEvaluationItem[] = []
  const seenRequirements = new Set<string>()

  let context: Context = null
  let kind: RequirementKind = '기타'
  let seq = 0

  for (const line of extracted.lines) {
    const heading = line.text.match(HEADING_PATTERN)

    if (heading) {
      const [, number, title] = heading

      if (REQUIREMENT_HEADING.test(title)) {
        context = 'requirement'
        kind = detectKind(title)
      } else if (EVALUATION_HEADING.test(title)) {
        context = 'evaluation'
      } else if (!number.includes('.')) {
        // 새로운 대제목("5. 기타 사항")을 만나면 직전 문맥을 벗어난 것으로 본다.
        context = null
      }

      // "4.2 가격 평가: 20점"처럼 소제목 자체가 배점을 갖는 경우가 흔하다.
      if (context === 'evaluation') {
        const score = extractScore(title)
        if (score !== null) {
          evaluations.push({
            id: `eval-${(seq += 1)}`,
            page: line.page,
            label: cleanEvaluationLabel(title),
            score,
          })
        }
      }
      continue
    }

    const isBullet = BULLET_PATTERN.test(line.text)
    const body = stripBullet(line.text)
    if (!body) continue

    if (context === 'evaluation' && isBullet) {
      evaluations.push({
        id: `eval-${(seq += 1)}`,
        page: line.page,
        label: cleanEvaluationLabel(body),
        score: extractScore(body),
      })
      continue
    }

    // 요구사항 문맥의 목록 항목이거나, 문맥과 무관하게 의무 표현을 가진 문장.
    const isRequirement =
      (context === 'requirement' && isBullet) || OBLIGATION_PATTERN.test(body)
    if (!isRequirement) continue

    if (seenRequirements.has(body)) continue
    seenRequirements.add(body)

    requirements.push({
      id: `req-${(seq += 1)}`,
      page: line.page,
      kind: context === 'requirement' ? kind : '기타',
      text: body,
    })
  }

  return {
    meta: extractMeta(extracted.lines),
    requirements,
    evaluations,
  }
}
