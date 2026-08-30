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
// 번호 뒤 공백이 없는 "2.성능 요구사항"도 잡아야 하므로 구분자를 ".)" 또는 공백으로 둔다.
// (공백만 허용하면 "1,000명 이상을 …" 같은 본문이 제목으로 오인된다)
const HEADING_PATTERN = /^(\d+(?:\.\d+)*)(?:[.)]\s*|\s+)(.{1,40})$/

// "Ⅳ. 제안서 평가 기준" — 공공 RFP는 대제목에 전각 로마숫자를 쓰는 경우가 많다.
// ASCII 로마숫자는 영단어와 헷갈리므로 마침표/괄호를 반드시 요구한다.
const ROMAN_HEADING_PATTERN = /^(?:([ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]+)[.)]?|([IVX]{1,5})[.)])\s*(.{1,40})$/

// "- ", "• ", "가. ", "1) " 등 목록 항목 표시.
// ※는 각주·단서 표시라 목록에서 제외한다 (배점 각주가 평가 항목으로 잡히는 것을 막는다).
const BULLET_PATTERN = /^(?:[-–—•·○□▪]|[가-하]\.|\d+[).]|[①-⑳])\s*/

// "~해야 한다", "~하여야 함", "~되어야 하며" 등 의무 표현.
// 한국어 RFP에서 요구사항은 거의 항상 이 형태로 서술된다.
const OBLIGATION_PATTERN = /(해야|하여야|되어야|이어야)\s*(한다|하며|하고|함|합니다|할)/

const SCORE_PATTERN = /(\d+(?:\.\d+)?)\s*점/

// 평가 배점표는 "항목 … 25"처럼 "점" 없이 숫자로만 끝나는 칸이 흔하다.
// 표를 한 줄로 펼치면 "기술 능력시스템아키텍처 및 연계 방안15" 형태가 된다.
const TABLE_SCORE_PATTERN = /^(.*[^\d\s])\s*(\d{1,3})$/

// 배점표의 소계·합계 행은 평가 항목이 아니다.
const SUBTOTAL_PATTERN = /소계|합계|총점|총계/

// 제목에 등장하면 이후 목록을 요구사항 / 평가 항목으로 간주하는 키워드.
const REQUIREMENT_HEADING = /요구\s*사항|요구\s*조건|과업\s*내용|과업\s*범위/
const EVALUATION_HEADING = /평가\s*(기준|항목|방법)|배점|가점|심사\s*기준/

// 라벨 패턴은 "공백을 모두 제거한" 문자열에 대해 검사한다.
// 표 안의 라벨은 "사 업 명"처럼 글자 사이가 벌어져 오는 경우가 많기 때문이다.
const META_RULES: Array<{ key: keyof RfpMeta; pattern: RegExp }> = [
  { key: 'projectName', pattern: /^(?:사업|과업|용역)명/ },
  { key: 'client', pattern: /^(?:발주(?:기관|처|자)|수요기관)/ },
  { key: 'budget', pattern: /^(?:사업예산|총사업비|사업금액|예산)/ },
  { key: 'duration', pattern: /^(?:사업|과업|용역|계약)기간/ },
  { key: 'deadline', pattern: /^(?:제출(?:기한|마감)|접수마감|마감일시)/ },
]

// 표 한 칸이 아니라 본문 문단을 통째로 값으로 삼는 것을 막는다.
const META_MAX_LENGTH = 80

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

// 성능·보안·품질은 관례상 비기능 요구사항으로 분류한다. "비기능"이 "기능"을
// 포함하므로 반드시 이 검사를 먼저 한다.
const NON_FUNCTIONAL_HEADING = /비\s*기능|성능|보안|품질|가용성|안정성|호환성|확장성/

function detectKind(headingText: string): RequirementKind {
  if (NON_FUNCTIONAL_HEADING.test(headingText)) return '비기능'
  if (/기능/.test(headingText)) return '기능'
  return '기타'
}

/**
 * 라벨로 시작하는 줄에서 값을 떼어낸다. 콜론이 있으면 쓰고, 없으면 라벨 길이만큼
 * 잘라낸다. 표에서 온 줄은 "사 업 명차세대 …"처럼 콜론이 없고 라벨 글자가 벌어져
 * 있으므로, 공백을 지운 문자열로 라벨을 찾은 뒤 그만큼 원문을 건너뛴다.
 */
function valueAfterLabel(text: string, pattern: RegExp): string | null {
  const body = stripBullet(text)
  const matched = body.replace(/\s/g, '').match(pattern)
  if (!matched) return null

  let remaining = matched[0].length
  let cut = 0
  while (cut < body.length && remaining > 0) {
    if (!/\s/.test(body[cut])) remaining--
    cut++
  }

  const value = body.slice(cut).replace(/^[:：\s]+/, '').trim()
  return value || null
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
    if (line.text.length > META_MAX_LENGTH) continue

    for (const rule of META_RULES) {
      // 먼저 나온 값을 우선한다. RFP는 앞부분(표지·개요)에 요약 정보를 두는 것이 관례다.
      if (meta[rule.key] !== null) continue
      const value = valueAfterLabel(line.text, rule.pattern)
      if (value) {
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
    const numbered = line.text.match(HEADING_PATTERN)
    const roman = numbered ? null : line.text.match(ROMAN_HEADING_PATTERN)

    if (numbered || roman) {
      // 로마숫자 제목은 언제나 대제목이므로 하위 번호가 없는 것으로 취급한다.
      const number = numbered ? numbered[1] : ''
      const title = numbered ? numbered[2] : roman![3]

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

    if (context === 'evaluation') {
      // 배점표 행: "기술 능력시스템아키텍처 및 연계 방안15"처럼 "점" 없이 숫자로 끝난다.
      const tableRow = !isBullet ? body.match(TABLE_SCORE_PATTERN) : null
      if (tableRow && !SUBTOTAL_PATTERN.test(tableRow[1])) {
        evaluations.push({
          id: `eval-${(seq += 1)}`,
          page: line.page,
          label: tableRow[1].trim(),
          score: Number(tableRow[2]),
        })
        continue
      }
    }

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
