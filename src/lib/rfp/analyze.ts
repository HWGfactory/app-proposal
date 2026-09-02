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
  /** 배점의 단위. 없으면 '점'으로 본다. 가중치를 %로 적는 RFP가 있어 구분한다 */
  unit?: '점' | '%'
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

// "제4장 제안서 평가", "제2절 비기능 요구사항" — 기업 RFP가 즐겨 쓰는 제목 형식이다.
// 위 두 패턴이 모두 실패했을 때만 본다.
//
// 장과 절을 모두 대제목으로 취급한다. 절을 하위 제목으로 두면 "제2절 제출 안내"에서
// 평가 문맥이 꺼지지 않아, 제출 안내 목록이 평가 항목으로 실려 들어온다. 절 제목이
// 문맥을 스스로 밝히지 않는 문서에서는 요구사항을 놓칠 수 있으나, 실제로 확인된
// 손해를 막는 쪽을 택했다.
const CHAPTER_HEADING = /^제\s*(\d+)\s*(?:장|절|항)\s+(.{1,40})$/

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

// "사업 이해 사업 목표 및 현황에 대한 이해도 10%" — 배점을 점이 아니라 가중치(%)로
// 적는 RFP가 있다. 위 패턴은 숫자로 끝나는 줄만 보므로 %로 끝나는 줄은 하나도
// 걸리지 않는다. 두 패턴은 끝 글자가 서로 달라 겹치지 않는다.
//
// "기술평가 점수가 만점의 80% 미만인 제안사는 … 제외한다."처럼 문장 가운데 %가
// 있는 줄은 끝이 %가 아니므로 걸리지 않는다.
const PERCENT_ROW_PATTERN = /^(.*[^\d\s])\s*(\d{1,3}(?:\.\d+)?)\s*%$/

// 배점표의 소계·합계 행은 평가 항목이 아니다.
const SUBTOTAL_PATTERN = /소계|합계|총점|총계/

// "FR-001 입고 관리", "NFR-002 가용성 시스템 연간 가용률 99.5% 이상" — 요구사항을
// 코드가 붙은 표로 적는 RFP가 있다. 이런 줄은 의무 표현("~하여야 한다")도 목록
// 기호도 없어서 기존 두 규칙에 걸리지 않는다.
//
// 표에서 상세 설명이 코드 줄 위아래로 쪼개져 명칭만 남는 경우가 있다. 그래도
// 버리지 않는다. 어느 설명 줄이 어느 코드의 것인지 확정할 근거가 없어, 붙였다가
// 틀리면 없는 요구사항을 만들게 된다.
const REQUIREMENT_CODE_PATTERN = /^(FR|NFR|REQ|SR)[-\s]?(\d+)\s+(.*)$/i

// 제목에 등장하면 이후 목록을 요구사항 / 평가 항목으로 간주하는 키워드.
const REQUIREMENT_HEADING = /요구\s*사항|요구\s*조건|과업\s*내용|과업\s*범위/
const EVALUATION_HEADING = /평가\s*(기준|항목|방법)|배점|가점|심사\s*기준/

// 라벨 패턴은 "공백을 모두 제거한" 문자열에 대해 검사한다.
// 표 안의 라벨은 "사 업 명"처럼 글자 사이가 벌어져 오는 경우가 많기 때문이다.
const META_RULES: Array<{ key: keyof RfpMeta; pattern: RegExp }> = [
  { key: 'projectName', pattern: /^(?:사업|과업|용역)명/ },
  // 공공은 "발주기관"을 쓰지만 민간은 "발주사" · "고객사" · "주관사"를 쓴다.
  // 기존 표현은 그대로 두고 덧붙이기만 한다.
  { key: 'client', pattern: /^(?:발주(?:기관|처|자|사)|수요(?:기관|처)|주관(?:기관|사)|고객사)/ },
  { key: 'budget', pattern: /^(?:사업예산|총사업비|사업금액|예산)/ },
  { key: 'duration', pattern: /^(?:사업|과업|용역|계약)기간/ },
  { key: 'deadline', pattern: /^(?:제출(?:기한|마감)|접수마감|마감일시)/ },
]

// 표 한 칸이 아니라 본문 문단을 통째로 값으로 삼는 것을 막는다.
const META_MAX_LENGTH = 80

/**
 * client 값이 기관명처럼 생겼는지 본다. client에만 건다.
 *
 * 라벨은 공백을 지운 문자열에 앵커로 맞춰 보고 그 글자 수만큼 잘라내므로,
 * 구분자 없이 본문이 이어져도 통과한다. "고객사"·"발주사"는 본문에도 흔한
 * 말이라 "고객사 여정 지도를 작성하여야 한다"가 발주기관이 되어 버린다.
 * 기관명은 명사로 끝나고, 본문은 서술어로 끝나거나 조사로 시작한다.
 *
 * 종결 어미를 목록으로 나열하지 않은 것은 반드시 빠지는 것이 생기기 때문이다
 * ("높인다"가 그랬다). 대신 이름이 "다"로 끝나는 외래 사명은 걸러진다.
 *
 * 조사 뒤에 공백을 요구하는 것은 "은행연합회"·"이마트"·"의료법인"처럼 조사와
 * 같은 글자로 시작하는 진짜 이름을 지키기 위해서다.
 *
 * 이 검사를 메타 전체에 걸면 안 된다. deadline은 "…인정하지 않는다"로 끝나는
 * 것이 정상이다.
 */
const CLIENT_PREDICATE_END = /(?:[가-힣]다|하며|하고|하여|함|음|임)\.?$/
const CLIENT_PARTICLE_START = /^[은는이가을를와과의에도만별및측]\s/

function looksLikeClient(value: string): boolean {
  return !CLIENT_PREDICATE_END.test(value) && !CLIENT_PARTICLE_START.test(value)
}

/**
 * 사업 정보를 표가 아니라 서술형 문장에 적은 RFP를 위한 뒷받침 규칙.
 *
 * "본 사업의 명칭은 「…」이며, 발주기관은 대한물류주식회사이다."처럼 한 문장에
 * 여러 값이 들어 있고, PDF에서는 그 문장이 줄 경계를 넘어 쪼개져 있다. 그래서
 * 한 줄씩 보는 META_RULES로는 하나도 잡히지 않는다.
 *
 * 표 형식으로 이미 찾은 항목에는 손대지 않는다. 이 규칙은 못 찾은 항목에만 돈다.
 *
 * 과탐을 막는 것은 앵커다. "명칭은" "발주기관은" 같은 말이 앞에 반드시 있어야
 * 하며, 캡처는 게으른 수량자로 첫 종결어미에서 끊고, 길이 상한을 다시 건다.
 */
const NARRATIVE_META_RULES: Array<{ key: keyof RfpMeta; patterns: RegExp[] }> = [
  {
    key: 'projectName',
    // 낫표 안에 사업명을 넣는 것이 관례이므로 그것을 먼저 본다.
    patterns: [/명칭은\s*「([^」]+)」/, /명칭은\s*(.+?)(?:이며|이고|으로\s*한다|입니다)/],
  },
  { key: 'client', patterns: [/발주\s*기관은\s*(.+?)(?:이다|이며|입니다|로\s*한다)/] },
  { key: 'budget', patterns: [/사업\s*예산은\s*([\d억천만원,.\s]+(?:\([^)]*\))?)/] },
  { key: 'duration', patterns: [/사업\s*기간은\s*(.+?)(?:간으로|으로\s*한다|이다)/] },
]

// 값이 줄을 넘어가므로 이웃한 줄을 이어 붙여 본다. 줄 사이에는 공백을 넣어야
// "발주기관은" + "대한물류…"가 한 낱말로 붙지 않는다.
const NARRATIVE_WINDOW = 3

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
      if (!value) continue
      // 값을 버릴 때는 break가 아니라 continue다. 이 줄이 다른 항목의
      // 라벨일 수도 있고, client는 뒤에 나오는 진짜 라벨에서 다시 찾는다.
      if (rule.key === 'client' && !looksLikeClient(value)) continue
      meta[rule.key] = value
      break
    }
  }

  fillFromNarrative(meta, lines)
  return meta
}

/** 표 형식으로 못 찾은 항목만 서술형 문장에서 채운다. 찾은 항목은 건드리지 않는다. */
function fillFromNarrative(meta: RfpMeta, lines: RfpLine[]): void {
  const missing = NARRATIVE_META_RULES.filter((rule) => meta[rule.key] === null)
  if (missing.length === 0) return

  for (let i = 0; i < lines.length; i++) {
    const window = lines
      .slice(i, i + NARRATIVE_WINDOW)
      .map((l) => l.text)
      .join(' ')

    for (const rule of missing) {
      if (meta[rule.key] !== null) continue
      for (const pattern of rule.patterns) {
        const match = window.match(pattern)
        if (!match) continue
        const value = match[1].trim().replace(/[,.]+$/, '').trim()
        if (value && value.length <= META_MAX_LENGTH) {
          meta[rule.key] = value
          break
        }
      }
    }
  }
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
    const chapter = numbered || roman ? null : line.text.match(CHAPTER_HEADING)

    if (numbered || roman || chapter) {
      // 로마숫자·장절 제목은 언제나 대제목이므로 하위 번호가 없는 것으로 취급한다.
      const number = numbered ? numbered[1] : ''
      const title = numbered ? numbered[2] : roman ? roman[3] : chapter![2]

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

      // 배점을 가중치(%)로 적은 배점표 행.
      const percentRow = !isBullet ? body.match(PERCENT_ROW_PATTERN) : null
      if (percentRow && !SUBTOTAL_PATTERN.test(percentRow[1])) {
        evaluations.push({
          id: `eval-${(seq += 1)}`,
          page: line.page,
          label: percentRow[1].trim(),
          score: Number(percentRow[2]),
          unit: '%',
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

    // 요구코드로 시작하는 표 행. 의무 표현도 목록 기호도 없어 아래 규칙에 걸리지 않는다.
    const code = body.match(REQUIREMENT_CODE_PATTERN)
    if (code) {
      const text = code[3].trim()
      if (text && !seenRequirements.has(text)) {
        seenRequirements.add(text)
        requirements.push({
          id: `req-${(seq += 1)}`,
          page: line.page,
          // 코드가 유형을 직접 말해 주므로 제목 문맥보다 우선한다.
          kind: /^N/i.test(code[1]) ? '비기능' : '기능',
          text,
        })
      }
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
