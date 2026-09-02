/**
 * 시험용 RFP 100개의 형식 배정.
 *
 * 이 파일은 문서를 만든 생성기(plan100.mjs)의 배정 공식을 그대로 옮긴 것이다.
 * 리포트의 "설계상_*" 열이 여기서 나오므로, 어긋나면 형식별 집계가 통째로
 * 틀린다. 그래서 batch-report.mjs가 실행할 때마다 원본 생성기와 100개를
 * 전수 대조하고, 하나라도 다르면 멈춘다.
 */

export const HEADING = ['전각로마 Ⅰ.', '장·절 제1장', '숫자 1./1.1', '번호없는 제목', '혼합 [1]/○/PART']
export const REQ = ['의무문 불릿', '요구코드 표', '서술형 문단', '단순 불릿', '표(코드없음)']
export const SCORE = ['점수 30점', '가중치 30%', '등급 필수/우대', '정성 서술', '평가섹션 없음']
export const META = ['표지 키값표', '서술형 문장', '상단 정보박스']
export const CLIENT = [
  '발주기관', '발주처', '발주사', '수요기관', '고객사', '주관사',
  '○○시청', '○○공사', '○○그룹', '○○은행', '○○청',
]
export const DOMAIN = [
  'AI챗봇', '클라우드전환', 'ERP구축', '물류WMS', '금융플랫폼', '보안관제', '빅데이터분석',
  '스마트팩토리', '헬스케어', '교육플랫폼', '전자정부', 'IoT', '커머스',
]
export const HOSTILE = [
  '메타 거의 없음', '요구사항 표+문단 혼재', '평가 기준 없음', '제목이 불릿처럼',
  '표 셀 붙음', '예산·기간 미명시', '요구코드 변형',
]

// 제목의 번호 체계만 바꾸고 문구는 한 가지로 고정했더니, 파서가 문맥을 켜는
// 결정적 변수가 문구였다는 것을 놓쳤다. 100개가 같은 문구를 써서 한 구멍이
// 100번 찍혔다. 앞 넷은 접미어가 붙어 문맥 전환에 걸리는 문구, 뒤 넷은 없는 문구다.
export const EVAL_TITLE = [
  '평가 방법', '평가 기준', '평가 항목 및 배점', '심사 기준',
  '제안서 평가', '기술 평가', '정성 평가', '업체 선정',
]

// 앞 넷은 절을 유형별로 나누어 제목에 유형 단어를 넣고, 뒤 넷은 한 절에
// 유형 단어 없이 담는다. 유형 판정이 제목에서 오므로 문구만 바꾸면 뜻이 없다.
export const REQ_TITLE = [
  ['기능 요구사항', '비기능 요구사항'],
  ['기능 요구사항', '성능 요구사항'],
  ['기능 요구사항', '보안 요구사항'],
  ['기능 요구사항', '품질 요구사항'],
  ['세부 요구사항'],
  ['주요 요구사항'],
  ['상세 요구사항'],
  ['요구사항 목록'],
]

export function assign(i) {
  const n = i - 1
  const r = n % 5
  const q = Math.floor(n / 5)
  return {
    id: i,
    // 다섯 값짜리 변수가 셋이라 125가지 조합인데 문서는 100개뿐이다. 라틴방격으로
    // 배치해 짝끼리 고르게 만나게 한다. 블록으로 나누면 제목과 배점이 주기 5를
    // 공유해 아예 안 만나는 조합이 생긴다.
    req: r,
    score: q % 5,
    heading: (r + q) % 5,
    meta: n % 3,
    client: n % 11,
    domain: n % 13,
    // stride는 modulus와 서로소여야 21가지가 다 나온다.
    reqCount: 5 + ((n * 5) % 21),
    hostile: n % 7 === 6 ? Math.floor(n / 7) % 7 : -1,
    // 둘 다 n%8을 쓰면 완벽히 상관된다. 8과 서로소인 수를 곱해도 전단사라
    // 마찬가지이므로, 블록마다 한 칸 미는 라틴방격으로 떼어 놓는다.
    evalTitle: n % 8,
    reqTitle: (n + Math.floor(n / 8)) % 8,
  }
}

export function describe(i) {
  const a = assign(i)
  return {
    id: `rfp_${String(i).padStart(3, '0')}`,
    heading: HEADING[a.heading],
    req: REQ[a.req],
    score: SCORE[a.score],
    meta: META[a.meta],
    client: CLIENT[a.client],
    domain: DOMAIN[a.domain],
    reqCount: a.reqCount,
    hostile: a.hostile >= 0 ? HOSTILE[a.hostile] : '',
    evalTitle: EVAL_TITLE[a.evalTitle],
    reqTitle: REQ_TITLE[a.reqTitle].join(' + '),
  }
}

/** 평가 절 제목이 EVALUATION_HEADING(analyze.ts)에 걸리는 문구인가. */
export function evalTitleHasSuffix(i) {
  return assign(i).evalTitle < 4
}

/** 요구 절 제목에 유형 단어가 있어 절이 유형별로 나뉘는가. */
export function reqTitleHasKind(i) {
  return assign(i).reqTitle < 4
}

/**
 * 제목이 analyze.ts가 제목으로 알아보는 형태인가.
 *
 * 세 패턴 모두 줄 첫머리에 번호를 요구한다.
 *   HEADING_PATTERN        숫자로 시작
 *   ROMAN_HEADING_PATTERN  Ⅰ~Ⅹ 또는 IVX로 시작
 *   CHAPTER_HEADING        제N장·절·항으로 시작
 * 그래서 "평가 방법"(번호 없음), "○ 기능 요구사항", "[4] 기술 평가",
 * "PART 1. …"은 제목으로 잡히지 않고 문맥이 아예 켜지지 않는다.
 *
 * 이 축을 따로 두지 않으면 "평가 0건"의 원인이 제목 문구 때문인지 번호 체계
 * 때문인지 갈리지 않는다. 5개 시험에서 실제로 두 원인이 섞여 나왔다.
 */
export function headingRecognized(i) {
  return assign(i).heading <= 2
}

/**
 * 까다로움 "평가 기준 없음"은 배점 형식을 덮어쓴다. 문서에 평가 절이 아예
 * 없으므로, 배점 형식별로 "평가 0건"을 세려면 배정값이 아니라 이 실효값으로
 * 갈라야 한다. 그러지 않으면 원래 평가가 없는 문서가 "점수인데 0건"으로
 * 잘못 집계된다.
 */
export function effectiveScore(i) {
  const d = describe(i)
  return d.hostile === '평가 기준 없음' ? '평가섹션 없음(까다로움)' : d.score
}
