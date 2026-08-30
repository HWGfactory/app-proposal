/**
 * RFP를 제안서 집필 관점에서 다시 읽어 "제안 전략 브리프"를 만든다.
 *
 * analyze.ts가 "이 RFP에 무엇이 적혀 있나"를 뽑는다면, 여기서는
 * "그래서 우리가 무엇을 놓치면 안 되고 어디에 힘을 실어야 하나"를 정리한다.
 * 산출물은 제안사 내부용이며 고객사에 가는 PPTX에는 넣지 않는다.
 *
 * analyze.ts와 마찬가지로 LLM을 쓰지 않는 순수 함수다.
 */

import type { ExtractedRfp, RfpLine } from './extractText'
import type { RfpAnalysisResult } from './analyze'

// ── 결과 타입 ────────────────────────────────────────────────────────────────

export type ComplianceCategory = '평가' | '제출' | '분량' | '자격' | '준수'

export interface ComplianceItem {
  id: string
  category: ComplianceCategory
  /** 어기면 실격·감점으로 직결되는 조건 */
  critical: boolean
  detail: string
  page: number
}

export interface RfpKeyword {
  term: string
  count: number
  /** 평가 기준이나 요구사항에 등장 — 제안서에서 반드시 받아써야 하는 말 */
  weighted: boolean
}

export interface EvaluationFocus {
  id: string
  label: string
  score: number
  /** 전체 배점 대비 비중 (%) */
  sharePct: number
  /** 분량 제한이 있을 때 배점 비율로 나눈 권장 페이지 */
  recommendedPages: number | null
  /** 이 평가 항목의 근거가 되는 요구사항 */
  relatedRequirements: { id: string; text: string; page: number }[]
}

export interface BackgroundLine {
  text: string
  page: number
}

export interface StrategyBrief {
  compliance: ComplianceItem[]
  keywords: RfpKeyword[]
  focus: EvaluationFocus[]
  /** 사업 배경·목적 문단 — 고객의 의도를 읽을 수 있는 유일한 서술 */
  background: BackgroundLine[]
  totalScore: number
  /** 본문 분량 제한 (페이지) */
  pageLimit: number | null
}

// ── 놓치기 쉬운 조건 탐지 ────────────────────────────────────────────────────

// 순서가 곧 우선순위다. 위에서 걸리면 아래는 보지 않는다.
const COMPLIANCE_RULES: Array<{
  category: ComplianceCategory
  critical: boolean
  pattern: RegExp
}> = [
  // 과락·실격은 놓치면 제안 자체가 무효가 된다.
  { category: '평가', critical: true, pattern: /과락|미만인?\s*제안사|미달[^.]*제외|제외된다|실격|결격|부적격/ },
  { category: '제출', critical: true, pattern: /제출\s*기한|접수\s*마감|마감\s*일시|제출\s*서류|구비\s*서류|제출\s*방법/ },
  { category: '분량', critical: true, pattern: /\d+\s*페이지\s*이내|\d+\s*매\s*이내|분량[^.]*이내/ },
  // 아래는 감점·가점 요인.
  { category: '평가', critical: false, pattern: /가점|배점\s*비율|기술\s*평가\s*\d+|우선\s*협상/ },
  { category: '자격', critical: false, pattern: /ISMS|ISO\s*\d+|인증\s*(?:기준|서|취득)|확인서|등록증|면허|자격\s*요건/ },
  { category: '준수', critical: false, pattern: /개인정보\s*보호법|정보통신망법|관계\s*법령|법규[^.]*준수|지침[^.]*준수/ },
]

const PAGE_LIMIT_PATTERN = /(\d{2,4})\s*페이지\s*이내/

function detectCompliance(lines: RfpLine[]): ComplianceItem[] {
  const items: ComplianceItem[] = []
  const seen = new Set<string>()
  let seq = 0

  for (const line of lines) {
    const text = line.text.trim()
    // 표 머리글이나 한두 단어짜리 셀은 조건 문장이 아니다.
    if (text.length < 8) continue

    for (const rule of COMPLIANCE_RULES) {
      if (!rule.pattern.test(text)) continue
      if (seen.has(text)) break
      seen.add(text)
      items.push({
        id: `cmp-${(seq += 1)}`,
        category: rule.category,
        critical: rule.critical,
        detail: text,
        page: line.page,
      })
      break
    }
  }

  // 실격 조건을 먼저 보여준다.
  return items.sort((a, b) => Number(b.critical) - Number(a.critical))
}

function detectPageLimit(lines: RfpLine[]): number | null {
  for (const line of lines) {
    const match = line.text.match(PAGE_LIMIT_PATTERN)
    if (match) return Number(match[1])
  }
  return null
}

// ── 사업 배경 ────────────────────────────────────────────────────────────────

// "1. 사업 배경 및 목적" 아래의 서술 문단. 고객이 왜 이 사업을 하는지가 적힌
// 유일한 곳이라, Win Theme의 공감 근거가 된다.
const BACKGROUND_HEADING = /배경|목적|추진\s*방향|현황|필요성/
const HEADING_LIKE = /^(?:\d+(?:\.\d+)*[.)]?|[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]+[.)]?)\s*\S/
const MAX_BACKGROUND = 4

function extractBackground(lines: RfpLine[]): BackgroundLine[] {
  const collected: BackgroundLine[] = []
  let inside = false

  for (const line of lines) {
    const text = line.text.trim()
    if (HEADING_LIKE.test(text) && text.length <= 40) {
      inside = BACKGROUND_HEADING.test(text)
      continue
    }
    if (!inside) continue
    // 목록 항목은 방향 나열이라 서술 문단만 남긴다.
    if (/^[-–—•·○□▪]/.test(text)) continue
    if (text.length < 20) continue

    collected.push({ text, page: line.page })
    if (collected.length >= MAX_BACKGROUND) break
  }

  return collected
}

// ── 핵심 키워드 ──────────────────────────────────────────────────────────────

// RFP라면 어디에나 나오는 말이라 변별력이 없다. 여기가 얇으면 "방안·제시·포함"
// 같은 껍데기가 핵심 키워드로 올라오고, 같은 이유로 요구사항 연결도 부정확해진다.
const STOPWORDS = new Set([
  // 문서 자체를 가리키는 말
  '제안', '제안사', '제안서', '사업', '요구', '요구사항', '기관', '발주', '입찰', '계약',
  '평가', '배점', '점수', '부문', '항목', '기준', '내용', '사항', '문의',
  // 조사·접속·지시
  '관련', '경우', '대한', '대하여', '통해', '통하여', '위한', '위하여', '이내', '이상', '이하',
  '다음', '아래', '해당', '모든', '각각', '전체', '주요', '기타', '등의', '등을', '기존',
  '있는', '있다', '한다', '하며', '하고', '되어', '된다', '이다', '것을', '것이', '또한',
  // 제안서에서 뜻을 거의 담지 않는 상투적 동작명사
  '방안', '방법', '제공', '제시', '포함', '지원', '추진', '수행', '작성', '구성', '확보',
  '반영', '명시', '적용', '실시', '결과', '대상', '절차', '활용', '고려', '검토', '준수',
])

// 조사·어미를 떼어 낸다. 형태소 분석기 없이 다루는 최소한의 정규화다.
const PARTICLE_PATTERN = /(?:으로부터|으로서|으로써|에서의|에서|에게|으로|이나|과의|와의|들의|들을|들이|를|을|이|가|은|는|의|에|와|과|도|만|나|로)$/
const VERB_TAIL_PATTERN = /(?:하여야|하여|해야|하는|하고|하며|한다|되어|되는|된다|한|할)$/

function normalizeToken(raw: string): string | null {
  if (/^[A-Za-z][A-Za-z0-9-]*$/.test(raw)) {
    // 영문·약어는 그대로 두되 한 글자는 버린다.
    return raw.length >= 2 ? raw.toUpperCase() : null
  }
  let token = raw.replace(VERB_TAIL_PATTERN, '').replace(PARTICLE_PATTERN, '')
  if (token.length < 2) return null
  if (STOPWORDS.has(token)) return null
  if (/^\d+$/.test(token)) return null
  return token
}

function tokenize(text: string): string[] {
  return text
    .split(/[^가-힣A-Za-z0-9-]+/)
    .map(normalizeToken)
    .filter((t): t is string => t !== null)
}

const MAX_KEYWORDS = 18

function extractKeywords(extracted: ExtractedRfp, analysis: RfpAnalysisResult): RfpKeyword[] {
  // 평가 기준과 요구사항에 등장하는 말은 제안서에서 그대로 받아써야 하므로 가중한다.
  const weightedText = [
    ...analysis.evaluations.map((e) => e.label),
    ...analysis.requirements.map((r) => r.text),
  ].join(' ')
  const weightedTerms = new Set(tokenize(weightedText))

  const counts = new Map<string, number>()
  for (const line of extracted.lines) {
    for (const token of tokenize(line.text)) {
      counts.set(token, (counts.get(token) ?? 0) + 1)
    }
  }

  return Array.from(counts.entries())
    .map(([term, count]) => ({
      term,
      count,
      weighted: weightedTerms.has(term),
    }))
    .filter((k) => k.count >= 2)
    .sort((a, b) => {
      const scoreA = a.count * (a.weighted ? 2 : 1)
      const scoreB = b.count * (b.weighted ? 2 : 1)
      return scoreB - scoreA
    })
    .slice(0, MAX_KEYWORDS)
}

// ── 평가 항목별 집필 배분 ────────────────────────────────────────────────────

const MAX_RELATED = 3

/** 평가 항목 라벨과 겹치는 낱말이 많은 요구사항을 근거로 본다. */
function relateRequirements(label: string, analysis: RfpAnalysisResult) {
  const labelTerms = new Set(tokenize(label))
  if (labelTerms.size === 0) return []

  return analysis.requirements
    .map((req) => {
      const overlap = tokenize(req.text).filter((t) => labelTerms.has(t)).length
      return { req, overlap }
    })
    .filter((x) => x.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, MAX_RELATED)
    .map(({ req }) => ({ id: req.id, text: req.text, page: req.page }))
}

function buildFocus(analysis: RfpAnalysisResult, pageLimit: number | null): {
  focus: EvaluationFocus[]
  totalScore: number
} {
  const scored = analysis.evaluations.filter(
    (e): e is typeof e & { score: number } => e.score !== null
  )
  const totalScore = scored.reduce((sum, e) => sum + e.score, 0)
  if (totalScore === 0) return { focus: [], totalScore: 0 }

  const focus = scored
    .slice()
    .sort((a, b) => b.score - a.score)
    .map((item) => {
      const sharePct = (item.score / totalScore) * 100
      return {
        id: item.id,
        label: item.label,
        score: item.score,
        sharePct: Math.round(sharePct * 10) / 10,
        recommendedPages: pageLimit ? Math.max(1, Math.round((pageLimit * sharePct) / 100)) : null,
        relatedRequirements: relateRequirements(item.label, analysis),
      }
    })

  return { focus, totalScore }
}

// ── 메인 ─────────────────────────────────────────────────────────────────────

export function buildStrategyBrief(
  extracted: ExtractedRfp,
  analysis: RfpAnalysisResult
): StrategyBrief {
  const pageLimit = detectPageLimit(extracted.lines)
  const { focus, totalScore } = buildFocus(analysis, pageLimit)

  return {
    compliance: detectCompliance(extracted.lines),
    keywords: extractKeywords(extracted, analysis),
    focus,
    background: extractBackground(extracted.lines),
    totalScore,
    pageLimit,
  }
}
