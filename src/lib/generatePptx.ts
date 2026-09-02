/**
 * RFP 분석 결과 + 제안사 정보 → 제안 발표자료(PPTX).
 *
 * 사용자가 입력하는 것은 제안사 정보뿐이므로, 사업에 관한 모든 슬라이드는
 * RfpSource에서 파생된다. PowerPoint가 시스템에 설치된 한글 폰트를 사용하므로
 * 폰트 파일을 별도로 임베드하지 않는다.
 */

import type { ProposalFormData, RfpRequirementItem } from '@/types/proposal'
import type { RequirementKind } from '@/lib/rfp/analyze'
import { buildPalette, type BrandPalette } from '@/lib/brandColor'

// 16:9 기준 (10 x 5.625 inch)
const W = 10
const H = 5.625
const MARGIN = 0.55
const BODY_W = W - MARGIN * 2


/**
 * 발표자료 본문 글꼴. 앱 화면(globals.css)과 같은 글꼴을 써서 문서와 도구의
 * 인상을 맞춘다.
 *
 * pptxgenjs는 런마다 <a:latin> <a:ea> <a:cs>를 모두 적으므로 이 값 하나로
 * 한글까지 적용된다. 다만 폰트를 파일에 심지는 않으므로, 여는 쪽 PC에
 * 이 글꼴이 없으면 PowerPoint가 다른 글꼴로 대체한다.
 */
const FONT = 'Noto Sans KR'

// 요구사항 유형별 표준 대응 문구. 아래 키워드 버킷에 걸리지 않을 때만 쓰인다.
/**
 * 주제 규칙에 걸리지 않은 요구사항이 쓰는 기본 문구.
 *
 * 유형마다 하나만 두면, 규칙에 안 걸린 요구사항이 여러 건일 때 표에 똑같은
 * 문장이 줄줄이 선다. 뜻이 같은 여러 표현을 두고 아직 덜 쓴 것을 고르면
 * 지어낸 내용 없이 되풀이만 사라진다. 어느 문장을 골라도 말하는 바는 같다.
 */
const STANDARD_RESPONSES: Record<RequirementKind, string[]> = {
  기능: [
    '요구 기능을 표준 모듈로 구현하고, 상세 설계 단계에서 고객사 업무 절차에 맞춰 화면·데이터 구조를 확정합니다.',
    '현행 업무 흐름을 먼저 확인한 뒤 기능 단위로 나누어, 처리 절차와 예외 경로를 설계 산출물에 함께 적습니다.',
    '화면과 데이터 항목을 요구사항 단위로 짝지어, 검수 때 어느 화면에서 확인하는지를 미리 지정해 둡니다.',
    '표준 기능을 기준으로 구성하되 기관 고유 절차는 설정으로 흡수하여, 이후 변경 시 코드를 고치지 않아도 되게 만듭니다.',
    '요구 기능의 입력과 출력을 먼저 정의하고, 그 정의를 그대로 시험 항목으로 옮겨 구현과 검수가 같은 기준을 보게 합니다.',
    '기존 업무에서 쓰던 용어와 코드 체계를 그대로 이어받아, 사용자가 새 화면에서 다시 배우지 않아도 되게 합니다.',
    '기능 사이에 주고받는 데이터를 목록으로 만들어, 한 기능의 변경이 어디까지 닿는지 미리 드러냅니다.',
    '단계마다 실제로 동작하는 화면을 보여 드리고, 그 자리에서 나온 의견을 다음 단계 범위에 반영합니다.',
  ],
  비기능: [
    '성능·보안·가용성 목표를 설계 기준으로 반영하고, 통합 테스트 단계에서 정량 지표로 충족 여부를 검증합니다.',
    '요구된 수치를 그대로 시험 항목으로 옮겨 두고, 시험 결과서로 달성 여부를 근거와 함께 제출합니다.',
    '설계 단계에서 기준값을 확정하고, 운영 이관 전에 측정 결과를 발주기관과 나란히 놓고 대조합니다.',
    '요구 수준을 아키텍처 결정의 제약으로 삼아, 구현이 끝난 뒤가 아니라 설계 시점에 충족 여부를 판단합니다.',
    '목표에 못 미치는 구간을 일찍 찾도록 개발 중에도 주기적으로 측정하고, 그 추이를 기록으로 남깁니다.',
    '측정 조건을 문서로 먼저 합의해, 같은 결과를 두고 해석이 갈리지 않게 합니다.',
    '한계에 가까워지면 알아차릴 수 있도록 감시 지표를 함께 구성해 운영으로 넘깁니다.',
    '요구 수준을 채우지 못할 경우의 대안 설계를 함께 준비해, 뒤늦게 구조를 바꾸는 일이 없게 합니다.',
  ],
  기타: [
    '제안요청서에 명시된 조건을 계약 및 수행 계획에 반영하여 준수합니다.',
    '해당 조건을 착수 단계 점검표에 올려, 단계마다 이행 여부를 확인하고 기록으로 남깁니다.',
    '요구된 사항을 수행 계획서에 명시하고, 관련 산출물 제출로 이행을 증빙합니다.',
    '조건 충족 여부를 검수 항목에 포함하여, 사업이 끝나기 전에 발주기관과 함께 확인합니다.',
    '해당 조건을 담당자와 기한이 붙은 항목으로 관리하여 누락 없이 이행합니다.',
    '이행 결과를 단계 보고에 포함해, 발주기관이 진행 상황을 그때그때 확인할 수 있게 합니다.',
    '조건이 바뀌면 영향 범위를 먼저 정리해 협의한 뒤 반영합니다.',
    '관련 근거 자료를 사업 종료 시 함께 인계하여, 이후 감사와 점검에 대비합니다.',
  ],
}

/**
 * 받침 유무로 조사를 고른다. "가용성을" / "대시보드를" 처럼 갈리는 자리에 쓴다.
 * 영문·숫자로 끝나면 받침이 있는 것으로 본다(CRM은 "씨알엠"으로 읽혀 을이 맞다).
 */
function josa(word: string, withBatchim: string, without: string): string {
  const code = word.charCodeAt(word.length - 1)
  const isHangul = code >= 0xac00 && code <= 0xd7a3
  const hasBatchim = !isHangul || (code - 0xac00) % 28 !== 0
  return word + (hasBatchim ? withBatchim : without)
}

/**
 * 요구사항 문장에서 주제를 읽어 대응 문구를 고른다.
 *
 * 유형별 3종만 쓰면 24건이 세 문장의 반복이 되어, 표를 넘길수록 성의가 없어
 * 보인다. 문장에 실제로 등장한 낱말을 집어 문구에 되돌려 넣어야 그 요구사항을
 * 읽고 답한 것으로 읽힌다.
 *
 * 매칭은 공백을 지운 문자열에 대고 한다. PDF에서 뽑은 문장은 "자동라우팅기능"
 * 처럼 띄어쓰기가 뭉개져 있어 그대로는 걸리지 않는다.
 *
 * 지어낸 수치나 제품명은 넣지 않는다. 어떻게 확인할 것인가 수준의 서술만 쓴다.
 */
const RESPONSE_RULES: { pattern: RegExp; write: (term: string) => string }[] = [
  {
    pattern: /(인터페이스|연동|연계|이관|CRM|ERP)/,
    write: (t) => `${t} 구간은 인터페이스 정의서를 먼저 확정한 뒤, 연계 테스트를 별도 일정으로 잡아 데이터 정합성을 검증합니다.`,
  },
  {
    pattern: /(ISMS-P|ISMS|개인정보|정보통신망|암호화|접근권한|보안)/,
    write: (t) => `${t} 요건을 설계 산출물의 검토 항목으로 고정하고, 통합 테스트 단계의 취약점 점검으로 이행을 입증합니다.`,
  },
  {
    pattern: /(동시접속자|동시접속|응답시간|가용성|무중단|자동처리율|처리율|성능)/,
    write: (t) => `${josa(t, '을', '를')} 설계 기준값으로 삼고, 운영과 같은 부하 조건을 재현한 성능 시험으로 달성 여부를 계량 확인합니다.`,
  },
  {
    pattern: /(대시보드|리포트|통계|집계|지표)/,
    write: (t) => `집계 기준과 산출 주기를 현업과 먼저 합의한 뒤 ${josa(t, '을', '를')} 구성해, 같은 수치를 두고 해석이 갈리지 않게 합니다.`,
  },
  {
    pattern: /(관리화면|승인이력|이력|조회|권한관리)/,
    write: (t) => `${t} 처리 절차를 실제 업무 흐름대로 화면에 옮기고, 변경 내역을 남겨 감사 추적이 가능하게 합니다.`,
  },
  {
    pattern: /(자동라우팅|라우팅|자동연결|자동화|자동생성|분류)/,
    write: (t) => `${t} 규칙을 현업과 확정한 뒤 예외 처리 경로를 함께 설계해, 자동 처리에 실패해도 업무가 멈추지 않게 합니다.`,
  },
  {
    // "사용자"만으로는 잡지 않는다. 화면과 무관한 문장에도 흔히 들어가는 말이라,
    // 챗봇 엔진 요구사항이 화면 설계 문구를 받는 일이 생긴다.
    pattern: /(사용자경험|사용자화면|화면|UI)/,
    write: (t) => `${t} 설계는 시안 검토를 거쳐 확정하고, 사용자 검수에서 실제 업무 흐름대로 점검받습니다.`,
  },
  {
    pattern: /(교육|매뉴얼|가이드|인수인계)/,
    write: (t) => `${t} 자료를 운영자용과 사용자용으로 나누어 작성하고, 오픈 전 실습 교육으로 숙련도를 확보합니다.`,
  },
  {
    pattern: /(관계법령|법령|법규|표준|규정|지침)/,
    write: (t) => `${t} 준수 항목을 점검표로 만들어, 단계별 산출물 검토마다 하나씩 대조합니다.`,
  },
  {
    pattern: /(클라우드|인프라|서버|백업|이중화)/,
    write: (t) => `${t} 구성은 용량 산정 결과를 근거로 확정하고, 장애 상황을 가정한 전환 시험으로 검증합니다.`,
  },
  {
    pattern: /(검수|검증|테스트|품질)/,
    write: (t) => `${t} 절차를 단계별 통과 기준과 함께 정의해, 기준에 미달하면 다음 단계로 넘어가지 않게 합니다.`,
  },
  {
    pattern: /(마일스톤|산출물|일정|계획)/,
    write: (t) => `${josa(t, '을', '를')} 주 단위로 관리하고, 마일스톤마다 고객 검토와 승인을 거쳐 진행합니다.`,
  },
]

function ruleResponse(req: RfpRequirementItem): string | null {
  const compact = req.requirement.replace(/\s/g, '')
  for (const rule of RESPONSE_RULES) {
    const hit = compact.match(rule.pattern)
    if (hit) return rule.write(hit[1])
  }
  return null
}

/**
 * 대응 문구를 고르되, 한 문서 안에서 같은 문장이 두 번 서지 않게 한다.
 *
 * 주제 규칙이 걸리면 그 문장이 1순위다. 다만 같은 규칙이 같은 낱말로 두 번
 * 걸리면 문장까지 똑같아지므로, 그때는 아직 덜 쓴 기본 문구로 넘어간다.
 * 문서마다 새로 만들어 쓰므로 요청 사이에 상태가 섞이지 않는다.
 */
type ResponseWriter = (req: RfpRequirementItem, fresh?: boolean) => string

/**
 * 요구사항의 유형을 원본 목록에서 찾아온다.
 *
 * 평가 상세 장이 보는 focus의 근거 요구사항은 id와 문장만 들고 있어 유형을
 * 모른다. 기본 문구는 유형별로 다르므로, 없는 값을 짐작하지 않고 목록에 물어본다.
 */
function kindOf(data: ProposalFormData, id: string): RequirementKind {
  return data.rfp.requirements.find((r) => r.id === id)?.kind ?? '기타'
}

/**
 * 후보가 모두 소진됐을 때 쓰는 마지막 문구.
 *
 * 대응을 설명하는 문장이 아니라 무엇을 제출해 확인시켜 드리는지를 말한다.
 * 산출물 이름은 되풀이돼도 표로 읽히지, 같은 말을 늘어놓은 것으로 읽히지 않는다.
 */
const EVIDENCE_BY_KIND: Record<RequirementKind, string> = {
  기능: '설계 산출물과 단위시험 결과서로 구현 여부를 확인하실 수 있습니다.',
  비기능: '성능·보안 시험 결과서로 목표 달성 여부를 확인하실 수 있습니다.',
  기타: '수행계획서와 검수 확인서로 이행 여부를 확인하실 수 있습니다.',
}

function responseWriter(): ResponseWriter {
  const used = new Map<string, number>()
  const seen = (s: string) => used.get(s) ?? 0

  return (req, fresh = false) => {
    const rule = ruleResponse(req)
    const candidates = [...(rule ? [rule] : []), ...STANDARD_RESPONSES[req.kind]]

    // 평가 상세 장은 요구사항 대응 장이 쓴 문장을 다시 쓰지 않는다. 같은 문단이
    // 두 장에 서면 분량만 늘린 것으로 읽힌다. 남은 후보가 없으면 문장을 억지로
    // 만들지 않고, 제출 산출물을 말하는 다른 성격의 문구로 넘어간다.
    const pool = fresh ? candidates.filter((c) => seen(c) === 0) : candidates
    if (pool.length === 0) return EVIDENCE_BY_KIND[req.kind]

    const pick = pool.reduce((best, c) => (seen(c) < seen(best) ? c : best), pool[0])
    used.set(pick, seen(pick) + 1)
    return pick
  }
}

// 요구사항 유형 색도 브랜드 팔레트에서 파생한다.
function kindColors(pal: BrandPalette): Record<RequirementKind, string> {
  return { 기능: pal.brand, 비기능: pal.gray, 기타: 'A8A8A8' }
}

/**
 * 문서의 뼈대. Win Theme은 "무엇이 중요한가"를 선언하는 문장이므로,
 * 나머지 장은 그 선언을 세우고(문제) · 밝히고(기준) · 증명하고(근거) ·
 * 지킬 수 있음을 보이는(실행) 네 단계로 배치된다.
 *
 * 각 장의 eyebrow에 이 역할이 찍히고, lead 문장이 축과 그 장을 잇는다.
 */
const STEP = {
  문제: '문제 정의',
  기준: '판단 기준',
  근거: '충족 근거',
  실행: '실행 역량',
} as const


/** 이 요구사항이 Win Theme의 근거로 인용된 것인가 */
function isThemeProof(data: ProposalFormData, text: string): boolean {
  return (data.winTheme?.evidence ?? []).some((e) => e.text === text)
}

type Pptx = import('pptxgenjs').default
type Slide = ReturnType<Pptx['addSlide']>

// ── AI 흔적 제거 ─────────────────────────────────────────────────────────────

/**
 * 줄표(em/en dash)는 한국어 실무 문서에서 거의 쓰이지 않아, 제안서에 섞이면
 * 기계가 쓴 티가 바로 난다. 쉼표로 내려 자연스러운 문장으로 되돌린다.
 * 가운뎃점(·)은 국문 표기에서 정상이므로 건드리지 않는다.
 */
const DASH_TELL = /\s*[—–―‒]\s*/g

function stripTells(text: string): string {
  return text
    .replace(DASH_TELL, ', ')
    // 대시가 문장부호 옆이나 끝에 있었다면 쉼표가 겹치므로 정리한다
    .replace(/,\s*([,.:;)\]}])/g, '$1')
    .replace(/([([{])\s*,\s*/g, '$1')
    .replace(/,\s*$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

type TextArg = Parameters<Slide['addText']>[0]
type TableArg = Parameters<Slide['addTable']>[0]

function cleanText(arg: TextArg): TextArg {
  if (typeof arg === 'string') return stripTells(arg)
  if (Array.isArray(arg)) {
    return arg.map((run) =>
      typeof run.text === 'string' ? { ...run, text: stripTells(run.text) } : run
    ) as TextArg
  }
  return arg
}

function cleanTable(rows: TableArg): TableArg {
  if (!Array.isArray(rows)) return rows
  return rows.map((row) =>
    Array.isArray(row)
      ? row.map((cell) =>
          typeof cell === 'string'
            ? stripTells(cell)
            : typeof cell?.text === 'string'
              ? { ...cell, text: stripTells(cell.text) }
              : cell
        )
      : row
  ) as TableArg
}

/**
 * 슬라이드에 글이 들어가는 통로는 addText와 addTable 둘뿐이다. 호출부 40여 곳을
 * 일일이 고치면 언젠가 빠뜨리므로, 슬라이드를 만들 때 이 두 개를 감싸 둔다.
 * 사용자가 Win Theme을 고쳐 쓰거나 RFP 원문에 대시가 있어도 여기서 걸린다.
 */
function newSlide(pptx: Pptx): Slide {
  const slide = pptx.addSlide()
  const addText = slide.addText.bind(slide)
  const addTable = slide.addTable.bind(slide)

  slide.addText = ((arg: TextArg, opts?: unknown) =>
    addText(cleanText(arg), opts as never)) as Slide['addText']
  slide.addTable = ((rows: TableArg, opts?: unknown) =>
    addTable(cleanTable(rows), opts as never)) as Slide['addTable']

  return slide
}

// ── 공통 레이아웃 ────────────────────────────────────────────────────────────

/**
 * 본문 슬라이드의 공통 머리. eyebrow는 이 장이 논지에서 맡은 역할을 적고,
 * lead는 그 역할을 Win Theme에 비추어 한 문장으로 잇는다.
 *
 * Win Theme 문장 자체를 반복하지 않는다. 반복은 설득이 아니라 소음이다.
 * 대신 각 장이 그 주장의 어느 단계인지를 밝혀 문서를 하나의 논지로 묶는다.
 *
 * 본문 시작 y좌표를 함께 돌려주므로, 리드 유무에 따라 호출부가 위치를 맞춘다.
 */
function contentSlide(
  pptx: Pptx,
  pal: BrandPalette,
  opts: { title: string; eyebrow?: string; lead?: string }
): { slide: Slide; top: number } {
  const { title, eyebrow, lead } = opts
  const slide = newSlide(pptx)
  slide.background = { color: pal.white }

  if (eyebrow) {
    slide.addText(eyebrow, {
      x: MARGIN, y: 0.28, w: BODY_W, h: 0.22,
      fontFace: FONT, fontSize: 10, color: pal.brand, bold: true,
    })
  }
  slide.addText(title, {
    x: MARGIN, y: eyebrow ? 0.5 : 0.38, w: BODY_W, h: 0.45,
    fontFace: FONT, fontSize: 22, color: pal.brandDeep, bold: true,
  })
  const ruleY = eyebrow ? 1.0 : 0.88
  slide.addShape('rect', { x: MARGIN, y: ruleY, w: BODY_W, h: 0.025, fill: { color: pal.brand } })

  if (!lead) return { slide, top: ruleY + 0.35 }

  slide.addText(lead, {
    x: MARGIN, y: ruleY + 0.18, w: BODY_W, h: 0.32,
    fontFace: FONT, fontSize: 11, color: pal.gray, italic: true,
  })
  return { slide, top: ruleY + 0.62 }
}

/**
 * 배점표에서 뽑은 평가 항목 이름을 찍기 직전에 손본다.
 *
 * 배점표는 "평가 부문 | 세부 평가 항목 | 배점" 3열인데, PDF에서 표를 한 줄로
 * 펼치면 셀 사이 공백이 사라져 "가격 평가입찰 가격의 적정성"이 된다. 분석
 * 단계에서는 이 문자열이 그대로 필요하므로(중복 판정과 요구사항 매칭이 여기에
 * 걸려 있다) analyze.ts는 건드리지 않고 표시할 때만 되돌린다.
 *
 * 되돌리지 못한 자리는 그대로 둔다. 잘못 끊는 것이 붙어 있는 것보다 나쁘다.
 */

// 부문 셀은 "가격 평가", "기술 능력"처럼 두 낱말이다. 한 낱말짜리 "위험관리"가
// "위험 관리"로 잘리지 않도록 앞에 공백이 있는 경우만 경계로 본다.
// 추출 단계에서 공백이 살아나면 부문 셀과 항목 셀 사이에 공백 하나가 남으므로,
// 경계 뒤의 공백 한 칸까지 허용해야 붙어 나온 경우와 같이 잡힌다.
const SECTION_CELL = /^(\S+\s\S*(?:부문|평가|능력|이해도|관리))(?=\s?[가-힣A-Za-z])/

// 표 안에서만 붙어 나오는 낱말들. 일반 문장에는 적용하지 않는다.
const LOANWORD = /(?<=[가-힣]{2})(아키텍처|플랫폼|인프라|솔루션|프레임워크|프로세스)/g

function displayLabel(raw: string): string {
  let s = raw.trim()

  // 부문 셀과 세부 항목 셀의 경계
  const cell = s.match(SECTION_CELL)
  if (cell) s = `${cell[1]} · ${s.slice(cell[1].length)}`

  return s
    // '및'은 언제나 홀로 쓰는 접속어라 양쪽이 붙어 있으면 공백이 사라진 것이다
    .replace(/([가-힣])및/g, '$1 및')
    .replace(/및([가-힣])/g, '및 $1')
    .replace(LOANWORD, ' $1')
    // "방안의우수성"처럼 '의' 뒤 평가 용어가 붙은 경우
    .replace(/([가-힣]{2,})의([가-힣]{2,}성)(?=$|\s)/g, '$1의 $2')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/**
 * 제안요청서 인용문의 끝 쉼표를 떼어낸다.
 *
 * PDF의 한 줄이 문장 중간에서 끊긴 흔적이라, 표 칸 끝에 쉼표만 남아 오타로
 * 읽힌다. 뒷문장은 대개 다음 요구사항으로 이미 들어와 있으므로 이어 붙이지
 * 않는다. 붙이면 같은 문장이 두 행에 겹쳐 실린다.
 */
function quote(text: string): string {
  return text.replace(/[,·]\s*$/, '').trim()
}

/**
 * 요구 문장을 지표 이름으로 줄인다.
 *
 * 기대 효과 표는 요구사항 대응 표와 같은 문장을 다시 싣기 쉬운 자리다.
 * 의무 어미를 떼면 "챗봇의 평균 응답시간은 3초 이내"처럼 지표 목록으로 읽혀,
 * 같은 사실을 말하면서도 앞 표를 되풀이하지 않는다.
 */
function metricPhrase(text: string): string {
  return quote(text)
    // 긴 것부터 떼야 "복구할 수 있어야 한다"가 "복구할 수"로 남지 않는다.
    .replace(/\s*(?:할\s*수\s*있어야|이어야|여야|하여야|되어야|어야|해야)\s*한다\.?\s*$/, '')
    .replace(/\s*(?:한다|합니다)\.?\s*$/, '')
    .trim()
}

/**
 * 배점의 단위. 제안요청서가 배점을 점이 아니라 가중치(%)로 적는 경우가 있어,
 * 숫자에 단위를 붙이는 자리에서는 반드시 이 값을 물어봐야 한다. 30%를 30점이라
 * 적으면 발주기관이 자기 평가표를 잘못 옮긴 문서를 받게 된다.
 *
 * 단위가 없으면 '점'이다. 예전 방식으로 만들어진 데이터가 그대로 동작한다.
 *
 * 주의: 이것은 EvaluationFocus의 sharePct와 다른 값이다. sharePct는 전체 배점
 * 가운데 그 항목이 차지하는 비중이라 배점이 점이든 %이든 언제나 %다.
 */
function scoreUnit(item: { unit?: '점' | '%' }): string {
  return item.unit ?? '점'
}

/**
 * 문서 전체의 배점 단위. 합계 문장이나 차트처럼 개별 항목이 손에 없는 자리에서 쓴다.
 * 한 평가표 안에 점과 %가 섞이는 일은 실무에 없으므로, 하나라도 %면 %로 본다.
 */
function deckScoreUnit(data: ProposalFormData): string {
  return data.rfp.evaluations.some((e) => e.unit === '%') ? '%' : '점'
}

/** '배점'과 '가중치'처럼 단위에 따라 달라지는 이름 */
function scoreNoun(unit: string): string {
  return unit === '%' ? '가중치' : '배점'
}

function tableHeader(pal: BrandPalette, labels: string[]) {
  return labels.map((text) => ({
    text,
    options: { bold: true, color: pal.paper, fill: { color: pal.brandDeep }, align: 'center' as const },
  }))
}

/**
 * 장 번호는 세는 것이지 적는 것이 아니다.
 *
 * 빠질 수 있는 장이 여럿이다. 평가 기준이 없으면 05가, 배점이 한 항목뿐이면
 * 04가, 예산이 미명시면 비용 장이 통째로 빠진다. 번호를 함수마다 박아두면
 * 그때마다 05 없는 06이 나온다. 그래서 각 장이 실제로 만들어지는 순간에
 * 번호를 받아 간다. 조기 반환한 장은 번호를 쓰지 않으므로 자리도 남기지 않는다.
 *
 * sub()는 직전에 발급된 번호에 딸린 곁장을 만든다. AS-IS/TO-BE가 01-1인 것은
 * 그것이 사업 개요와 같은 이야기의 연장이기 때문이지, 별개의 장이어서가 아니다.
 */
function numbering() {
  let n = 0
  return {
    next: () => String(++n).padStart(2, '0'),
    sub: (i: number) => `${String(n).padStart(2, '0')}-${i}`,
  }
}

type Numbering = ReturnType<typeof numbering>

// ── 슬라이드 ─────────────────────────────────────────────────────────────────

function addCover(pptx: Pptx, pal: BrandPalette, data: ProposalFormData) {
  const slide = newSlide(pptx)
  slide.background = { color: pal.brandDark }

  // 로고는 좌상단에 원본 비율을 유지한 채 올린다.
  // sizing.type 'contain'이라야 세로로 긴 로고도 찌그러지지 않는다.
  if (data.brand.logoDataUrl) {
    slide.addImage({
      data: data.brand.logoDataUrl,
      x: MARGIN, y: 0.5, w: 1.5, h: 0.62,
      sizing: { type: 'contain', w: 1.5, h: 0.62 },
    })
  }

  slide.addText('제안요청서(RFP) 대응 제안서', {
    x: MARGIN, y: 1.55, w: BODY_W, h: 0.3,
    fontFace: FONT, fontSize: 12, color: pal.brandMid, bold: true,
  })
  slide.addText(data.rfp.projectName || '제안서', {
    x: MARGIN, y: 1.95, w: BODY_W, h: 1.0,
    fontFace: FONT, fontSize: 32, color: pal.paper, bold: true,
  })
  slide.addShape('rect', { x: MARGIN, y: 3.05, w: 1.6, h: 0.04, fill: { color: pal.brandMid } })

  // 전략 축의 이름(예: '최고 배점 집중')은 우리가 제안을 세울 때 쓰는 내부
  // 분류다. 발주기관에 내는 문서에 그대로 적으면 배점을 노린다는 말을 표지에
  // 써 두는 셈이 되므로, 문서 어디에도 싣지 않는다. 확정된 선언 문장은
  // '제안 논지' 장에서 펼치고 마무리에서 다시 받는다.
  const meta = [
    data.rfp.client ? `${data.rfp.client} 귀중` : null,
    `제안사 : ${data.companyName}`,
    data.preparedBy ? `작성자 : ${data.preparedBy}` : null,
    `작성일 : ${data.preparedDate}`,
  ].filter(Boolean).join('\n')

  slide.addText(meta, {
    x: MARGIN, y: 3.35, w: BODY_W, h: 1.1,
    fontFace: FONT, fontSize: 11, color: pal.brandPale, lineSpacingMultiple: 1.35,
  })
}

/**
 * 단계 간지. 논지가 다음 단계로 넘어가는 자리를 표시하고, 그 단계에서 무엇을
 * 다루는지 미리 알린다. 목차에서 만든 장 목록을 그대로 받아 쓰므로 두 곳이
 * 어긋날 수 없다.
 */
function addStepDivider(pptx: Pptx, pal: BrandPalette, step: string, chapters: string[]) {
  // 장이 하나뿐이면 간지가 예고할 것이 그 장 하나다. 슬라이드 한 장을 써서
  // 다음 장의 제목만 말하게 되므로 만들지 않는다.
  if (chapters.length < 2) return

  const slide = newSlide(pptx)
  slide.background = { color: pal.band }

  const titleY = 0.95
  slide.addShape('rect', { x: MARGIN, y: titleY, w: 0.06, h: 0.62, fill: { color: pal.brand } })
  slide.addText(step, {
    x: MARGIN + 0.32, y: titleY, w: BODY_W - 0.32, h: 0.62,
    fontFace: FONT, fontSize: 30, bold: true, color: pal.brandDeep, valign: 'middle',
  })

  // 절이 맡은 역할을 설명하는 부제는 두지 않는다. 간지는 다음에 무엇이
  // 오는지만 말하면 되고, 그 이상은 문서가 스스로를 해설하는 문장이 된다.

  // 장 목록. 실행 역량처럼 열 장 넘게 붙는 절이 있어 높이를 고정하면 넘친
  // 줄이 제목 위로 올라온다. 남은 높이를 세어 간격을 잡고, 한 단에 담기지
  // 않으면 두 단으로 나눈다.
  const listTop = titleY + 0.95
  const available = H - 0.5 - listTop
  const single = Math.floor(available / 0.34)
  const cols = chapters.length <= single ? 1 : 2
  const perCol = Math.ceil(chapters.length / cols)
  const pitch = Math.min(0.34, available / perCol)
  const colW = cols === 1 ? BODY_W - 0.42 : (BODY_W - 0.42 - 0.4) / 2

  chapters.forEach((label, i) => {
    const col = Math.floor(i / perCol)
    slide.addText(label, {
      x: MARGIN + 0.42 + (colW + 0.4) * col,
      y: listTop + pitch * (i - perCol * col),
      w: colW, h: pitch,
      fontFace: FONT, fontSize: 12, color: pal.ink, valign: 'middle',
      bullet: { code: '25AA' },
    })
  })
}

// 목차는 장 이름을 나열하지 않고, 각 장이 논지의 어느 단계인지를 보여준다.
function addAgenda(
  pptx: Pptx,
  pal: BrandPalette,
  data: ProposalFormData,
  sections: { label: string; step: string }[]
) {
  const { slide, top } = contentSlide(pptx, pal, {
    title: '목차',
    eyebrow: 'AGENDA',
  })

  // 목차에는 번호를 달지 않는다. 여기서 매기면 본문 eyebrow의 번호와 어긋난다.
  // 제안 논지는 번호가 없고, AS-IS와 평가 상세는 곁번호를 쓰므로 순번이 맞을
  // 수가 없다. 어긋난 목차는 없는 목차보다 나쁘다. 순서는 배치가 이미 말한다.
  const rows: { text: string; head: boolean }[] = []
  let lastStep = ''
  sections.forEach((s) => {
    if (s.step !== lastStep) {
      rows.push({ text: s.step, head: true })
      lastStep = s.step
    }
    rows.push({ text: s.label, head: false })
  })

  // 장이 늘면 한 단에 담기지 않는다. 넘치면 잘리는 대신 두 단으로 나눈다.
  const available = H - 0.5 - top
  const single = Math.floor(available / 0.4)
  const cols = rows.length <= single ? 1 : 2
  const perCol = Math.ceil(rows.length / cols)
  const pitch = Math.min(0.4, available / perCol)
  const colW = cols === 1 ? BODY_W : (BODY_W - 0.5) / 2
  const size = cols === 1 ? 13 : 11

  rows.forEach((r, i) => {
    const col = Math.floor(i / perCol)
    const x = MARGIN + (colW + 0.5) * col
    const y = top + pitch * (i - perCol * col)
    slide.addText(r.text, {
      x: r.head ? x : x + 0.28, y, w: colW - (r.head ? 0 : 0.28), h: pitch,
      fontFace: FONT,
      fontSize: r.head ? size - 2 : size,
      bold: r.head,
      color: r.head ? pal.brand : pal.ink,
      valign: 'middle',
    })
  })
}

/**
 * 논지 전개. Win Theme 한 문장을 문제 → 기준 → 근거 → 결과로 펼쳐,
 * 이후 모든 장이 어느 칸을 채우러 오는지 미리 밝힌다.
 */
function addWinTheme(pptx: Pptx, pal: BrandPalette, data: ProposalFormData) {
  const theme = data.winTheme
  if (!theme || !theme.headline.trim()) return

  const { slide } = contentSlide(pptx, pal, { title: '제안 논지', eyebrow: 'WIN THEME' })

  // 주장
  slide.addShape('rect', { x: MARGIN, y: 1.3, w: 0.05, h: 1.15, fill: { color: pal.brand } })
  slide.addText(theme.headline, {
    x: MARGIN + 0.28, y: 1.3, w: BODY_W - 0.28, h: 1.15,
    fontFace: FONT, fontSize: 17, bold: true, color: pal.brandDeep,
    lineSpacingMultiple: 1.3, valign: 'top',
  })

  // 이 주장을 어떤 순서로 증명하는지 — 뒤따르는 장들의 지도
  // 배경은 rfp.background를 먼저 본다. Win Theme의 근거는 브리프가 고른 PDF 줄
  // 그대로라 문장 중간에서 끊겨 있고, rfp.background는 문장으로 복원된 것이다.
  const background =
    data.rfp.background?.[0]?.text ?? theme.evidence.find((e) => e.kind === '배경')?.text
  const proof = theme.evidence.filter((e) => e.kind !== '배경').slice(0, 3)

  // 판단 기준은 우리가 고른 축의 이름이 아니라 발주기관이 정한 평가 기준이다.
  // 배점이 가장 큰 항목을 그대로 적으면 지어낼 것도, 내부 용어가 샐 일도 없다.
  const topCriterion = [...data.rfp.evaluations]
    .filter((e) => (e.score ?? 0) > 0)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0]

  const steps: [string, string][] = [
    [STEP.문제, background ?? `${josa(data.rfp.client || '발주기관', '이', '가')} 제안요청서에 밝힌 현황`],
    [
      STEP.기준,
      topCriterion
        ? `제안요청서가 정한 평가 기준. ${josa(scoreNoun(scoreUnit(topCriterion)), '이', '가')} 가장 큰 항목은 ${displayLabel(topCriterion.label)}(${topCriterion.score}${scoreUnit(topCriterion)})입니다.`
        : '제안요청서가 정한 평가 기준과 요구 조건',
    ],
    [STEP.근거, proof.length > 0 ? proof.map((p) => quote(p.text)).join(' / ') : '제안요청서 요구사항 전건 대응'],
    [STEP.실행, `${data.companyName}의 수행 역량과 일정으로 이를 지킵니다.`],
  ]

  const colW = (BODY_W - 0.45) / 4
  steps.forEach(([label, text], i) => {
    const x = MARGIN + i * (colW + 0.15)
    slide.addShape('rect', { x, y: 2.75, w: colW, h: 0.03, fill: { color: i === 1 ? pal.brand : pal.line } })
    slide.addText(label, {
      x, y: 2.85, w: colW, h: 0.25,
      fontFace: FONT, fontSize: 10, bold: true, color: i === 1 ? pal.brand : pal.gray,
    })
    slide.addText(text, {
      x, y: 3.14, w: colW, h: 1.55,
      fontFace: FONT, fontSize: 9, color: pal.ink, lineSpacingMultiple: 1.3, valign: 'top',
    })
  })
}

function addOverview(pptx: Pptx, pal: BrandPalette, data: ProposalFormData, num: Numbering) {
  const { slide, top } = contentSlide(pptx, pal, {
    title: '사업 개요', eyebrow: `${num.next()} · ${STEP.문제}`,
  })
  const { rfp } = data

  const rows = [
    ['사업명', rfp.projectName || '-'],
    ['발주기관', rfp.client || '-'],
    ['사업 예산', rfp.budget || '제안요청서 미명시'],
    ['사업 기간', rfp.duration || '제안요청서 미명시'],
    // 업로드한 파일 이름은 적지 않는다. 발주기관에 내는 문서에 제안사의 로컬
    // 파일명이 찍히며, "RFP_예시_…" 같은 작업용 이름이 그대로 나간다.
    ['식별 요구사항', `${rfp.requirements.length}건`],
  ].map(([k, v]) => [
    { text: k, options: { bold: true, color: pal.brandDeep, fill: { color: pal.band } } },
    { text: v, options: { color: pal.ink } },
  ])

  slide.addTable(rows, {
    x: MARGIN, y: top, w: BODY_W,
    colW: [2.4, BODY_W - 2.4],
    rowH: 0.42,
    fontFace: FONT, fontSize: 11,
    border: { type: 'solid', color: pal.line, pt: 1 },
    valign: 'middle',
  })
}

/**
 * AS-IS / TO-BE. 왼쪽은 고객이 제안요청서에 직접 쓴 현재 상황이고,
 * 오른쪽은 요구사항에 수치로 박힌 목표다. 양쪽 다 원문에서만 가져오며
 * 없는 사실을 지어내지 않는다.
 *
 * 배경 문단은 전략 브리프에서만 온다. 없으면 이 장을 만들지 않는다.
 */
// "3초 이내", "99.9% 이상", "1,000명" 처럼 단위가 붙은 수치를 목표로 본다.
// 배경 문단에서 '그래서 무엇을 하려 한다'에 해당하는 문장을 가른다.
const PURPOSE = /목적|위하여|위해|하고자|확립하여|개선하여/

const MEASURABLE = /\d[\d,.]*\s*(?:%|초|분|시간|일|건|명|배|회|개월)/

function addAsIsToBe(pptx: Pptx, pal: BrandPalette, data: ProposalFormData, num: Numbering) {
  const background = data.rfp.background ?? []
  if (background.length === 0) return

  // 배경 문단은 대개 "현황"과 "그래서 무엇을 하려 한다"로 나뉜다. 목적 문장을
  // TO-BE로 쓰면 그것이 곧 발주기관이 말한 목표라 정확하고, 뒤의 기대 효과
  // 장과 같은 문장을 두 번 싣지 않게 된다.
  const purpose = background.filter((b) => PURPOSE.test(b.text))
  const current = background.filter((b) => !PURPOSE.test(b.text))
  const targets =
    purpose.length > 0
      ? purpose.map((b) => ({ text: b.text, page: b.page }))
      : data.rfp.requirements
          .filter((r) => MEASURABLE.test(r.requirement))
          .slice(0, 4)
          .map((r) => ({ text: quote(r.requirement), page: r.page }))

  const { slide, top } = contentSlide(pptx, pal, {
    title: 'AS-IS / TO-BE',
    eyebrow: `${num.sub(1)} · ${STEP.문제}`,
  })

  const colW = (BODY_W - 0.3) / 2
  const columns: [string, string, string, { text: string; page: number }[]][] = [
    // 수치가 든 문장을 앞에 둔다. 현황을 수로 말한 문장이 가장 강한 근거다.
    [
      'AS-IS',
      '현재 상황',
      pal.gray,
      [...(current.length > 0 ? current : background)]
        .sort((a, b) => Number(MEASURABLE.test(b.text)) - Number(MEASURABLE.test(a.text)))
        .slice(0, 4),
    ],
    ['TO-BE', '제안요청서가 밝힌 목표', pal.brand, targets.slice(0, 4)],
  ]

  columns.forEach(([label, caption, color, items], i) => {
    const x = MARGIN + i * (colW + 0.3)

    slide.addShape('rect', { x, y: top, w: colW, h: 0.04, fill: { color } })
    slide.addText(label, {
      x, y: top + 0.14, w: colW, h: 0.3,
      fontFace: FONT, fontSize: 13, bold: true, color,
    })
    slide.addText(caption, {
      x, y: top + 0.46, w: colW, h: 0.24,
      fontFace: FONT, fontSize: 10, color: pal.gray,
    })

    if (items.length === 0) {
      slide.addText('제안요청서에서 확인되지 않았습니다.', {
        x, y: top + 0.82, w: colW, h: 0.4,
        fontFace: FONT, fontSize: 10, color: pal.gray, italic: true,
      })
      return
    }

    slide.addText(
      items.map((it) => ({
        text: `${it.text} (${it.page}p)`,
        options: { breakLine: true, bullet: { code: '25AA' } },
      })),
      {
        x: x + 0.12, y: top + 0.82, w: colW - 0.12, h: 2.6,
        fontFace: FONT, fontSize: 10, color: pal.ink, lineSpacingMultiple: 1.45, valign: 'top',
      }
    )
  })
}


function addRequirementSummary(pptx: Pptx, pal: BrandPalette, data: ProposalFormData, num: Numbering) {
  const { slide, top } = contentSlide(pptx, pal, {
    title: '요구사항 구성', eyebrow: `${num.next()} · ${STEP.문제}`,
  })
  const reqs = data.rfp.requirements
  const kinds: RequirementKind[] = ['기능', '비기능', '기타']
  const kindColor = kindColors(pal)
  const counts = kinds.map((k) => {
    const of = reqs.filter((r) => r.kind === k)
    const pages = Array.from(new Set(of.map((r) => r.page))).sort((a, b) => a - b)
    return {
      kind: k,
      n: of.length,
      // 세 유형의 건수가 우연히 같으면 숫자만으로는 오류처럼 읽힌다.
      // 카드마다 다른 사실을 하나씩 붙여 서로 다른 값임을 보이게 한다.
      where: pages.length === 0 ? '' : pages.length === 1 ? `${pages[0]}p` : `${pages[0]}p ~ ${pages[pages.length - 1]}p`,
    }
  })

  // 유형별 카드
  const cardW = (BODY_W - 0.4) / 3
  counts.forEach((c, i) => {
    const x = MARGIN + i * (cardW + 0.2)
    slide.addShape('rect', {
      x, y: top, w: cardW, h: 1.45,
      fill: { color: pal.band }, line: { color: pal.line, width: 1 },
    })
    slide.addText(`${c.n}`, {
      x, y: top + 0.12, w: cardW, h: 0.6,
      fontFace: FONT, fontSize: 30, bold: true, color: kindColor[c.kind], align: 'center',
    })
    slide.addText(`${c.kind} 요구사항`, {
      x, y: top + 0.75, w: cardW, h: 0.3,
      fontFace: FONT, fontSize: 11, color: pal.gray, align: 'center',
    })
    slide.addText(c.where ? `제안요청서 ${c.where}` : '해당 없음', {
      x, y: top + 1.05, w: cardW, h: 0.28,
      fontFace: FONT, fontSize: 9, color: pal.gray, align: 'center',
    })
  })

  // 구성 비율. 세 값이 같을 때 세 칸이 똑같이 나뉜 띠가 보이면, 같은 숫자가
  // 우연이지 잘못 찍힌 것이 아님을 한눈에 알 수 있다.
  const barY = top + 1.75
  if (reqs.length > 0) {
    let cursor = MARGIN
    counts.forEach((c) => {
      const w = (BODY_W * c.n) / reqs.length
      if (w <= 0) return
      slide.addShape('rect', { x: cursor, y: barY, w, h: 0.3, fill: { color: kindColor[c.kind] } })
      slide.addText(`${Math.round((c.n / reqs.length) * 100)}%`, {
        x: cursor, y: barY, w, h: 0.3,
        fontFace: FONT, fontSize: 10, bold: true, color: pal.white, align: 'center', valign: 'middle',
      })
      cursor += w
    })
  }

  slide.addText(
    `제안요청서에서 총 ${reqs.length}건의 요구사항을 식별했습니다. 각 요구사항에 대한 대응 방안은 다음 장에서 근거 페이지와 함께 제시합니다.`,
    { x: MARGIN, y: barY + 0.55, w: BODY_W, h: 0.6, fontFace: FONT, fontSize: 12, color: pal.ink, lineSpacingMultiple: 1.4 }
  )
}

/** 요구사항이 많으면 한 슬라이드에 다 들어가지 않으므로 나눠 담는다. */
const ROWS_PER_SLIDE = 4

function addRequirementResponses(
  pptx: Pptx,
  pal: BrandPalette,
  data: ProposalFormData,
  num: Numbering,
  write: ResponseWriter
) {
  // 여러 장으로 나뉘어도 하나의 장이므로 번호는 한 번만 받는다.
  const eyebrow = `${num.next()} · ${STEP.근거}`
  if (data.rfp.requirements.length === 0) {
    const { slide, top } = contentSlide(pptx, pal, { title: '요구사항 대응 방안', eyebrow })
    slide.addText('제안요청서에서 요구사항을 식별하지 못했습니다.', {
      x: MARGIN, y: top, w: BODY_W, h: 0.4, fontFace: FONT, fontSize: 12, color: pal.gray,
    })
    return
  }

  // Win Theme의 근거로 인용된 요구사항을 앞으로 당긴다. 순서만 바꿀 뿐,
  // 왜 그 순서인지는 문서에 적지 않는다. 읽는 쪽이 알아야 할 내용이 아니다.
  const reqs = [...data.rfp.requirements].sort(
    (a, b) => Number(isThemeProof(data, b.requirement)) - Number(isThemeProof(data, a.requirement))
  )

  const kindColor = kindColors(pal)
  const pages = Math.ceil(reqs.length / ROWS_PER_SLIDE)
  for (let p = 0; p < pages; p++) {
    const chunk = reqs.slice(p * ROWS_PER_SLIDE, (p + 1) * ROWS_PER_SLIDE)
    const title = pages > 1 ? `요구사항 대응 방안 (${p + 1}/${pages})` : '요구사항 대응 방안'
    const { slide, top } = contentSlide(pptx, pal, { title, eyebrow })

    const rows = [
      tableHeader(pal, ['ID', '구분', 'RFP 요구사항', '대응 방안', '근거']),
      ...chunk.map((r: RfpRequirementItem, i: number) => {
        const proof = isThemeProof(data, r.requirement)
        return [
          {
            text: `R-${p * ROWS_PER_SLIDE + i + 1}`,
            options: { bold: true, color: proof ? pal.brand : pal.gray, align: 'center' as const },
          },
          { text: r.kind, options: { color: kindColor[r.kind], align: 'center' as const } },
          { text: quote(r.requirement), options: { color: pal.ink, bold: proof } },
          { text: write(r), options: { color: pal.gray } },
          { text: `${r.page}p`, options: { color: pal.gray, align: 'center' as const } },
        ]
      }),
    ]

    // 행 높이를 정하지 않으면 표가 글자 높이로 붙어 슬라이드 아래가 통째로 빈다.
    // 남은 높이를 나눠 갖되, rowH는 머리행에도 걸리므로 행 수에 1을 더해 나눈다.
    // 마지막 장의 행이 적을 때 한 행이 지나치게 커지지 않도록 위아래로 묶어 둔다.
    const rowH = Math.min(0.95, Math.max(0.5, (H - 0.45 - top) / (chunk.length + 1)))

    slide.addTable(rows, {
      x: MARGIN, y: top, w: BODY_W,
      colW: [0.6, 0.75, 3.5, 3.55, 0.5],
      rowH,
      fontFace: FONT, fontSize: 9,
      border: { type: 'solid', color: pal.line, pt: 1 },
      valign: 'middle',
      autoPage: false,
    })
  }
}

/**
 * 배점 구성. 어느 항목에 점수가 몰려 있는지를 길이로 한 번에 보여준다.
 * 뒤따르는 표가 같은 값을 숫자로 다시 싣지만, 표는 대응 근거까지 담아야 해서
 * 크기 비교가 묻힌다. 표와 차트를 함께 두는 쪽이 8개 항목에는 맞다.
 *
 * 색은 한 가지만 쓴다. 항목 이름은 순서를 바꿔도 뜻이 변하지 않는 명목값이라
 * 막대마다 다른 색을 주면 길이가 이미 말한 크기를 색으로 또 말하게 된다.
 * 브랜드가 단일 채색이라 3단계 명암 램프가 로고 색에 따라 무너지는 문제도
 * 함께 사라진다.
 */
const CHART_LABEL_MAX = 22

function addScoreChart(pptx: Pptx, pal: BrandPalette, data: ProposalFormData, num: Numbering) {
  const scored = data.rfp.evaluations
    .filter((e): e is typeof e & { score: number } => e.score !== null && e.score > 0)
    .sort((a, b) => a.score - b.score) // 가로 막대는 아래에서 위로 쌓여 큰 값이 위로 간다
  if (scored.length < 2) return

  const total = scored.reduce((s, e) => s + e.score, 0)
  const top = scored[scored.length - 1]

  const unit = deckScoreUnit(data)
  const { slide } = contentSlide(pptx, pal, {
    title: `${scoreNoun(unit)} 구성`,
    eyebrow: `${num.next()} · ${STEP.근거}`,
  })

  // addChart는 newSlide 래퍼를 타지 않으므로 라벨에 stripTells를 직접 건다.
  const labels = scored.map((e) => {
    const clean = stripTells(displayLabel(e.label))
    if (clean.length <= CHART_LABEL_MAX) return clean
    // 글자 수로 잘라내면 "인력투입 계"처럼 낱말 한가운데가 끊긴다.
    // 부문 접두를 떼면 대개 들어가고, 그래도 길면 낱말 경계에서 끊는다.
    const tail = clean.includes(' · ') ? clean.slice(clean.indexOf(' · ') + 3) : clean
    if (tail.length <= CHART_LABEL_MAX) return tail
    const cut = tail.slice(0, CHART_LABEL_MAX)
    const space = cut.lastIndexOf(' ')
    return `${space > CHART_LABEL_MAX * 0.6 ? cut.slice(0, space) : cut}…`
  })

  slide.addChart(
    'bar',
    [{ name: scoreNoun(unit), labels, values: scored.map((e) => e.score) }],
    {
      x: MARGIN, y: 1.5, w: BODY_W, h: 3.2,
      barDir: 'bar',
      barGrouping: 'clustered',
      chartColors: [pal.brand],
      // 기본값에 기대지 않고 전부 명시한다.
      showTitle: false,
      showLegend: false,
      showValue: true,
      dataLabelPosition: 'outEnd',
      dataLabelColor: pal.ink,
      dataLabelFontFace: FONT,
      dataLabelFontSize: 10,
      showCatAxisTitle: false,
      showValAxisTitle: false,
      catAxisLabelColor: pal.ink,
      catAxisLabelFontFace: FONT,
      catAxisLabelFontSize: 9,
      valAxisLabelColor: pal.gray,
      valAxisLabelFontFace: FONT,
      valAxisLabelFontSize: 9,
      // 배점이든 가중치든 음수는 없다. 최소값을 두지 않으면 축이 -10에서 시작한다.
      valAxisMinVal: 0,
      valAxisMaxVal: Math.ceil((top.score * 1.15) / 5) * 5,
      catGridLine: { style: 'none' },
      valGridLine: { color: pal.line, style: 'solid', size: 1 },
    }
  )

  slide.addText(
    // 단위마다 뒤에 붙는 조사가 다르다("25점으로" / "30%로"). 문장을 통째로 나눈다.
    unit === '%'
      ? `확인된 가중치 합계 ${total}% 가운데 ${josa(stripTells(displayLabel(top.label)), '이', '가')} ${top.score}%로 가장 큽니다.`
      : `확인된 배점 ${total}점 가운데 ${josa(stripTells(displayLabel(top.label)), '이', '가')} ${top.score}점으로 가장 큽니다.`,
    { x: MARGIN, y: H - 0.8, w: BODY_W, h: 0.32, fontFace: FONT, fontSize: 10, color: pal.gray }
  )
}

function addEvaluation(pptx: Pptx, pal: BrandPalette, data: ProposalFormData, num: Numbering) {
  const unit = deckScoreUnit(data)
  const evals = [...data.rfp.evaluations].sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
  if (evals.length === 0) return

  const { slide, top } = contentSlide(pptx, pal, {
    title: '평가 기준별 대응', eyebrow: `${num.next()} · ${STEP.근거}`,
  })
  const total = evals.reduce((s, e) => s + (e.score ?? 0), 0)

  // 평가 항목마다 제안요청서에서 찾은 근거 요구사항이 몇 건인지를 적는다.
  // 모든 행에 같은 문장을 넣으면 열 하나가 통째로 정보량이 없다.
  const focus = data.rfp.focus ?? []
  const evidenceOf = (label: string) => {
    const hit = focus.find((f) => f.label === label)
    if (!hit) return null
    const pages = Array.from(new Set(hit.relatedRequirements.map((r) => r.page))).sort((a, b) => a - b)
    return hit.relatedRequirements.length === 0
      ? '제안요청서에 직접 근거 없음'
      : `요구사항 ${hit.relatedRequirements.length}건 (${pages.map((p) => `${p}p`).join(', ')})`
  }

  // 근거를 셀 수 없으면(브리프 미전달) 열을 만들지 않는다.
  const withEvidence = focus.length > 0

  const rows = [
    tableHeader(pal, withEvidence
      ? ['평가 항목', scoreNoun(unit), '근거 요구사항']
      : ['평가 항목', scoreNoun(unit)]),
    ...evals.map((e) => [
      { text: displayLabel(e.label), options: { bold: true, color: pal.brandDeep } },
      { text: e.score !== null ? `${e.score}${scoreUnit(e)}` : '-', options: { align: 'center' as const, color: pal.ink } },
      ...(withEvidence
        ? [{ text: evidenceOf(e.label) ?? '제안요청서에 직접 근거 없음', options: { color: pal.gray } }]
        : []),
    ]),
  ]

  slide.addTable(rows, {
    x: MARGIN, y: top, w: BODY_W,
    colW: withEvidence ? [4.6, 1.0, BODY_W - 5.6] : [BODY_W - 1.0, 1.0],
    fontFace: FONT, fontSize: 10,
    border: { type: 'solid', color: pal.line, pt: 1 },
    valign: 'middle',
    autoPage: false,
  })

  if (total > 0) {
    // 배점 순으로 제안을 짰다는 사실은 우리 사정이지 발주기관에 할 말이 아니다.
    slide.addText(`※ 제안요청서에서 확인한 평가 항목 ${evals.length}개, ${scoreNoun(unit)} 합계 ${total}${unit} 기준입니다.`, {
      x: MARGIN, y: H - 0.85, w: BODY_W, h: 0.35,
      fontFace: FONT, fontSize: 10, color: pal.gray,
    })
  }
}

/**
 * 평가 항목별 대응 상세. 배점이 큰 항목마다 한 장씩 배정해, 그 점수가 어떤
 * 요구사항 위에 서 있는지와 분량을 얼마나 쓸지를 함께 보여준다.
 *
 * focus는 전략 브리프에서만 온다. 브리프 없이 만든 제안서에는 이 장이 없다.
 */
const EVALUATION_DETAIL_SLIDES = 4

function addEvaluationDetail(
  pptx: Pptx,
  pal: BrandPalette,
  data: ProposalFormData,
  num: Numbering,
  write: ResponseWriter
) {
  // focus는 strategy가 만들어 단위를 들고 있지 않으므로 문서 단위를 쓴다.
  const unit = deckScoreUnit(data)

  // 근거 요구사항이 없는 항목은 상세 장을 만들지 않는다. 이 장이 할 일이
  // 근거를 펼치는 것인데 펼칠 것이 없으면 배점 숫자만 남은 빈 장이 된다.
  // 가격 평가처럼 기술 요구사항이 있을 수 없는 항목이 여기에 해당한다.
  const focus = (data.rfp.focus ?? []).filter(
    (f) => f.score > 0 && f.relatedRequirements.length > 0
  )
  if (focus.length === 0) return

  // 한 요구사항이 여러 평가 항목의 근거가 될 수 있어, 상세 장 사이에 같은
  // 문장이 두 번 실린다. 배점이 높은 항목이 먼저 가져가고 뒤에서는 빼서,
  // 각 장이 앞 장에 없던 근거만 말하게 한다.
  const claimed = new Set<string>()

  focus.slice(0, EVALUATION_DETAIL_SLIDES).forEach((item, i) => {
    const fresh = item.relatedRequirements.filter((r) => !claimed.has(r.id))
    fresh.forEach((r) => claimed.add(r.id))
    const sharedOnly = fresh.length === 0 && item.relatedRequirements.length > 0

    const { slide, top } = contentSlide(pptx, pal, {
      title: displayLabel(item.label),
      eyebrow: `${num.sub(i + 1)} · ${STEP.근거}`,
      lead: `전체 배점의 ${item.sharePct}%가 걸린 항목입니다.`,
    })

    // 비중은 타일로 세우지 않는다. 총점이 100점이면 배점과 같은 수가 되어
    // 같은 값이 두 번 서는데, 그 사실은 바로 위 리드 문장이 이미 말했다.
    const cards: [string, string][] = [
      [scoreNoun(unit), `${item.score}${unit}`],
      ...(item.recommendedPages !== null
        ? ([['권장 분량', `${item.recommendedPages}p`]] as [string, string][])
        : []),
      ['근거 요구사항', `${fresh.length}건`],
    ]
    const cardW = (BODY_W - 0.2 * (cards.length - 1)) / cards.length
    cards.forEach(([label, value], c) => {
      const x = MARGIN + c * (cardW + 0.2)
      slide.addShape('rect', {
        x, y: top, w: cardW, h: 0.95,
        fill: { color: pal.band }, line: { color: pal.line, width: 1 },
      })
      slide.addText(value, {
        x, y: top + 0.12, w: cardW, h: 0.45,
        fontFace: FONT, fontSize: 22, bold: true, color: pal.brand, align: 'center',
      })
      slide.addText(label, {
        x, y: top + 0.6, w: cardW, h: 0.26,
        fontFace: FONT, fontSize: 10, color: pal.gray, align: 'center',
      })
    })

    const listTop = top + 1.25
    if (fresh.length > 0) {
      slide.addText(`${josa(scoreNoun(unit), '이', '가')} 걸린 요구사항과 대응`, {
        x: MARGIN, y: listTop, w: BODY_W, h: 0.26,
        fontFace: FONT, fontSize: 11, bold: true, color: pal.brandDeep,
      })
      // 근거를 나열만 하면 "무엇이 걸려 있는가"까지만 말하고 끝난다. 옆에 대응을
      // 붙여야 "이 배점을 어떻게 충족하는가"가 한 장에서 읽힌다.
      const rows = [
        tableHeader(pal, ['근거가 되는 제안요청서 요구사항', '대응', '근거']),
        ...fresh.map((r) => [
          { text: quote(r.text), options: { color: pal.ink } },
          {
            // 이 요구사항이 어느 유형인지는 요구사항 목록이 알고 있다.
            // fresh를 켜서 요구사항 대응 장이 쓴 문장은 받지 않는다.
            text: write(
              { id: r.id, requirement: r.text, kind: kindOf(data, r.id), page: r.page },
              true
            ),
            options: { color: pal.gray },
          },
          { text: `${r.page}p`, options: { align: 'center' as const, color: pal.gray } },
        ]),
      ]

      const listBottom = H - 0.4
      slide.addTable(rows, {
        x: MARGIN, y: listTop + 0.34, w: BODY_W,
        colW: [3.6, BODY_W - 4.2, 0.6],
        rowH: Math.min(0.8, (listBottom - listTop - 0.34) / (fresh.length + 1)),
        fontFace: FONT, fontSize: 9,
        border: { type: 'solid', color: pal.line, pt: 1 },
        valign: 'middle', autoPage: false,
      })
    } else {
      slide.addText(
        sharedOnly
          ? '이 항목의 근거 요구사항은 배점이 더 큰 앞 항목에서 함께 다룹니다.'
          : '이 항목과 직접 연결되는 요구사항 문장은 제안요청서에서 확인되지 않았습니다.',
        { x: MARGIN, y: listTop, w: BODY_W, h: 0.4, fontFace: FONT, fontSize: 11, color: pal.gray }
      )
    }
  })
}

/**
 * 단계 구성은 표준안이되, 길이는 제안요청서의 사업 기간에서 끌어온다.
 * 비율로 적어 두는 이유는 6개월 사업과 3개월 사업이 같은 표를 쓰면
 * 3개월짜리 제안서에 '19주 ~ 종료'가 적히기 때문이다.
 */
const PHASE_PLAN = [
  {
    phase: 'Phase 1', ratio: 1 / 6,
    tasks: '착수 보고, 요구사항 상세 분석 및 확정, 현행 진단',
    outputs: '착수보고서, 요구사항정의서, 현행분석서, WBS',
  },
  {
    phase: 'Phase 2', ratio: 2 / 6,
    tasks: '핵심 기능 개발, 외부 시스템 연동, 주간 진도 보고',
    outputs: '화면설계서, 프로그램목록, 단위시험결과서, 주간보고서',
  },
  {
    phase: 'Phase 3', ratio: 1 / 4,
    tasks: '통합 테스트, 성능·보안 점검, 데이터 이관 및 검증',
    outputs: '통합시험계획서 및 결과서, 점검결과서, 데이터이관결과서',
  },
  {
    phase: 'Phase 4', ratio: 1 / 4,
    tasks: '사용자 교육, 오픈 및 안정화, 운영 이관, 완료 보고',
    outputs: '사용자매뉴얼, 교육결과보고서, 운영이관계획서, 완료보고서',
  },
]

const DURATION_PATTERN = /(\d+)(개월|주|일)/

/** 사업 기간 문구에서 총 주 수를 읽는다. 읽어내지 못하면 표준 24주로 둔다. */
function totalWeeks(duration: string): { weeks: number; derived: boolean } {
  const m = duration.replace(/\s/g, '').match(DURATION_PATTERN)
  if (!m) return { weeks: 24, derived: false }
  const n = Number(m[1])
  const weeks = m[2] === '개월' ? n * 4 : m[2] === '일' ? Math.round(n / 7) : n
  // 한 단계도 1주가 안 되거나 5년이 넘는 값은 오독으로 보고 표준으로 되돌린다.
  return weeks >= 6 && weeks <= 260 ? { weeks, derived: true } : { weeks: 24, derived: false }
}

/** 일정 표와 간트가 같은 배열을 보도록, 단계 경계를 한 곳에서만 계산한다. */
function schedulePhases(duration: string) {
  const { weeks, derived } = totalWeeks(duration)
  let cursor = 0
  const list = PHASE_PLAN.map((p, i) => {
    const last = i === PHASE_PLAN.length - 1
    const from = cursor
    const to = last ? weeks : Math.min(weeks, Math.max(from + 1, Math.round(from + weeks * p.ratio)))
    cursor = to
    return {
      ...p, from, to,
      period: i === 0 ? `착수 ~ ${to}주` : last ? `${from + 1}주 ~ 종료` : `${from + 1} ~ ${to}주`,
    }
  })
  return { weeks, derived, list }
}

function scheduleNote(data: ProposalFormData, derived: boolean): string {
  return derived
    ? `※ 제안요청서가 정한 사업 기간 ${data.rfp.duration}을 4단계로 나눈 표준 일정입니다. 단계 경계는 착수 보고에서 확정합니다.`
    : `※ 사업 기간이 ${data.rfp.duration || '제안요청서에 없어'} 24주 기준 표준 일정으로 작성했습니다. 실제 기간에 맞춰 착수 시 조정합니다.`
}

/**
 * 기대 효과. 수치를 만들어내지 않는다. 제안요청서가 이미 숫자로 적어 둔 요구가
 * 곧 이 사업의 정량 목표이므로, 그것을 모아 무엇으로 확인할지만 덧붙인다.
 *
 * AS-IS/TO-BE도 같은 정규식을 쓰지만 하는 일이 다르다. 그쪽은 목표가 무엇인지를
 * 말하고, 이쪽은 그 목표를 어떻게 확인하는지를 말한다. 그래서 앞의 4건만이
 * 아니라 확인된 전부를 싣는다.
 *
 * 숫자로 적힌 요구가 하나도 없으면 이 장은 통째로 빠진다.
 */
// 순서가 의미를 가른다. '자동처리율'은 부하가 아니라 정확도의 문제이므로
// 정확도 규칙이 성능 규칙보다 먼저 와야 한다. 앞의 것부터 맞는 것을 쓴다.
const VERIFY_RULES: { pattern: RegExp; how: string }[] = [
  { pattern: /정확|정합|오류|품질|누락|처리율|달성률|성공률/, how: '표본 검증 결과서' },
  { pattern: /응답|속도|성능|처리량|동시|접속|지연/, how: '부하 시험 결과서' },
  { pattern: /가용|장애|복구|중단|무중단/, how: '운영 모니터링 기록' },
  { pattern: /교육|인원|양성/, how: '교육 결과보고서' },
  { pattern: /보안|취약점|암호/, how: '보안 점검 결과서' },
]

const EXPECTED_ROWS = 7

function addExpectedEffect(pptx: Pptx, pal: BrandPalette, data: ProposalFormData, num: Numbering) {
  const measured = data.rfp.requirements
    .map((r) => ({ req: r, hit: r.requirement.match(MEASURABLE) }))
    .filter((x) => x.hit)
    .slice(0, EXPECTED_ROWS)
  if (measured.length === 0) return

  const { slide, top } = contentSlide(pptx, pal, {
    title: '기대 효과', eyebrow: `${num.next()} · ${STEP.근거}`,
    lead: `제안요청서가 수치로 제시한 목표 ${measured.length}건입니다.`,
  })

  slide.addTable(
    [
      tableHeader(pal, ['정량 지표', '목표값', '확인 방법', '근거']),
      ...measured.map(({ req, hit }) => {
        const rule = VERIFY_RULES.find((v) => v.pattern.test(req.requirement))
        return [
          { text: metricPhrase(req.requirement), options: { color: pal.ink } },
          { text: (hit as RegExpMatchArray)[0].replace(/\s+/g, ''), options: { bold: true, color: pal.brand, align: 'center' as const } },
          { text: rule?.how ?? '단계별 검수 확인서', options: { color: pal.ink, align: 'center' as const } },
          { text: `${req.page}p`, options: { color: pal.gray, align: 'center' as const } },
        ]
      }),
    ],
    {
      x: MARGIN, y: top, w: BODY_W,
      colW: [BODY_W - 4.0, 1.1, 2.0, 0.9],
      rowH: 0.38,
      fontFace: FONT, fontSize: 9,
      border: { type: 'solid', color: pal.line, pt: 1 },
      valign: 'middle', autoPage: false,
    }
  )

  slide.addText(
    '※ 목표값은 제안요청서에 명시된 수치를 그대로 옮겼습니다. 달성 여부는 확인 방법에 적은 산출물로 검증합니다.',
    { x: MARGIN, y: H - 0.6, w: BODY_W, h: 0.3, fontFace: FONT, fontSize: 9, color: pal.gray }
  )
}

function addSchedule(pptx: Pptx, pal: BrandPalette, data: ProposalFormData, num: Numbering) {
  const { slide, top } = contentSlide(pptx, pal, {
    title: '추진 일정', eyebrow: `${num.next()} · ${STEP.실행}`,
  })

  const { derived, list: phases } = schedulePhases(data.rfp.duration)

  const rows = [
    tableHeader(pal, ['단계', '기간', '주요 활동']),
    ...phases.map((p) => [
      { text: p.phase, options: { bold: true, color: pal.brand, align: 'center' as const } },
      { text: p.period, options: { align: 'center' as const, color: pal.ink } },
      { text: p.tasks, options: { color: pal.ink } },
    ]),
  ]

  slide.addTable(rows, {
    x: MARGIN, y: top, w: BODY_W,
    colW: [1.3, 1.7, BODY_W - 3.0],
    rowH: 0.5,
    fontFace: FONT, fontSize: 10,
    border: { type: 'solid', color: pal.line, pt: 1 },
    valign: 'middle',
  })

  slide.addText(scheduleNote(data, derived), {
    x: MARGIN, y: H - 0.85, w: BODY_W, h: 0.35, fontFace: FONT, fontSize: 10, color: pal.gray,
  })
}

/**
 * 간트. 앞 장의 표가 '무엇을 하는가'라면 이 장은 '언제까지인가'만 말한다.
 * 같은 schedulePhases()를 보므로 두 장이 어긋날 수 없다.
 *
 * 막대는 전부 한 색이다. 단계는 순서가 있는 값이지만 그 순서는 이미
 * 위에서 아래로, 왼쪽에서 오른쪽으로 두 번 나타나 있다. 색으로 세 번째
 * 말하는 대신, 어떤 로고 색이 들어와도 무너지지 않는 단색을 쓴다.
 */
function addGantt(pptx: Pptx, pal: BrandPalette, data: ProposalFormData, num: Numbering) {
  const { weeks, list } = schedulePhases(data.rfp.duration)
  const { slide, top } = contentSlide(pptx, pal, {
    title: '단계별 일정 개요', eyebrow: `${num.sub(1)} · ${STEP.실행}`,
  })

  const labelW = 1.35
  const trackX = MARGIN + labelW
  const trackW = BODY_W - labelW
  // 주 눈금 라벨이 리드 문장 위로 올라가지 않도록 본문 시작선에서 내려 잡는다.
  const topY = top + 0.4
  const rowH = 0.65
  const barH = 0.26
  const atWeek = (w: number) => trackX + (trackW * w) / weeks

  // 눈금은 4주 간격을 기본으로 하되, 기간이 길면 간격을 벌려 8칸을 넘기지 않는다.
  const tickStep = Math.max(4, Math.ceil(weeks / 8 / 4) * 4)
  const ticks: number[] = []
  for (let w = 0; w <= weeks; w += tickStep) ticks.push(w)
  if (ticks[ticks.length - 1] !== weeks) ticks.push(weeks)

  const gridBottom = topY + rowH * list.length
  ticks.forEach((w) => {
    slide.addShape('rect', {
      x: atWeek(w), y: topY - 0.06, w: 0.008, h: gridBottom - topY + 0.06,
      fill: { color: pal.line },
    })
    slide.addText(`${w}주`, {
      x: atWeek(w) - 0.3, y: topY - 0.32, w: 0.6, h: 0.24,
      fontFace: FONT, fontSize: 9, color: pal.gray, align: 'center',
    })
  })

  list.forEach((p, i) => {
    const y = topY + rowH * i
    slide.addText(p.phase, {
      x: MARGIN, y: y + 0.02, w: labelW - 0.12, h: barH,
      fontFace: FONT, fontSize: 11, bold: true, color: pal.brandDeep, valign: 'middle',
    })
    slide.addShape('rect', {
      x: atWeek(p.from), y: y + 0.03, w: Math.max(0.08, atWeek(p.to) - atWeek(p.from)), h: barH,
      fill: { color: pal.brand },
    })
    slide.addText(p.period, {
      x: MARGIN, y: y + barH + 0.04, w: labelW - 0.12, h: 0.22,
      fontFace: FONT, fontSize: 9, color: pal.gray,
    })
    // 앞 장의 표가 '무엇을'을 이미 적었으므로 여기서는 '얼마나'만 적는다.
    slide.addText(`${p.to - p.from}주`, {
      x: atWeek(p.to) + 0.06, y: y + 0.03, w: 0.7, h: barH,
      fontFace: FONT, fontSize: 9, color: pal.brandDeep, bold: true, valign: 'middle',
    })
  })

  // 보고 시점. PHASE_PLAN의 활동에 실제로 적힌 것만 표시한다.
  const marks: [number, string][] = [
    [0, '착수 보고'],
    [weeks, '완료 보고'],
  ]
  marks.forEach(([w, label]) => {
    slide.addShape('rect', {
      x: atWeek(w) - 0.03, y: gridBottom + 0.06, w: 0.06, h: 0.14, fill: { color: pal.brandDeep },
    })
    slide.addText(label, {
      x: atWeek(w) - (w === 0 ? 0.05 : 0.85), y: gridBottom + 0.24, w: 0.9, h: 0.22,
      fontFace: FONT, fontSize: 9, color: pal.brandDeep,
      align: w === 0 ? 'left' : 'right',
    })
  })
}

/**
 * 산출물 명세. 일정과 같은 배열을 보므로 단계 이름과 기간이 저절로 맞는다.
 * 검수의 단위가 곧 산출물이므로, 일정 바로 뒤에 둔다.
 */
function addDeliverables(pptx: Pptx, pal: BrandPalette, data: ProposalFormData, num: Numbering) {
  const { list } = schedulePhases(data.rfp.duration)
  const { slide, top } = contentSlide(pptx, pal, {
    title: '단계별 산출물', eyebrow: `${num.next()} · ${STEP.실행}`,
  })

  slide.addTable(
    [
      tableHeader(pal, ['단계', '기간', '주요 산출물']),
      ...list.map((p) => [
        { text: p.phase, options: { bold: true, color: pal.brand, align: 'center' as const } },
        { text: p.period, options: { align: 'center' as const, color: pal.ink } },
        { text: p.outputs, options: { color: pal.ink } },
      ]),
    ],
    {
      x: MARGIN, y: top, w: BODY_W,
      colW: [1.3, 1.7, BODY_W - 3.0],
      rowH: 0.5,
      fontFace: FONT, fontSize: 10,
      border: { type: 'solid', color: pal.line, pt: 1 },
      valign: 'middle', autoPage: false,
    }
  )

  slide.addText(
    '※ 정보시스템 구축 사업의 표준 산출물 목록입니다. 서식과 제출 시점은 착수 보고 때 발주기관과 협의합니다.',
    { x: MARGIN, y: H - 0.85, w: BODY_W, h: 0.35, fontFace: FONT, fontSize: 10, color: pal.gray }
  )
}

/**
 * 수행 조직. 제안요청서에서 끌어올 수 있는 것은 없으므로 표준 편성을 그리고,
 * 그것이 표준이라는 사실을 각주에 적는다. 인원 수는 적지 않는다. 모르는 수를
 * 적어 넣는 것이 이 문서에서 가장 하기 쉬운 거짓말이다.
 */
const ORG_ROLES = [
  { role: '기술 총괄', duty: '아키텍처 결정, 기술 리스크 판단' },
  { role: '개발 파트', duty: '기능 구현, 외부 시스템 연동' },
  { role: '품질·보안', duty: '테스트 설계, 보안 점검, 검수 대응' },
  { role: '사업 관리', duty: '일정·산출물 관리, 보고 및 협의' },
]

function addOrgChart(pptx: Pptx, pal: BrandPalette, data: ProposalFormData, num: Numbering) {
  const { slide } = contentSlide(pptx, pal, {
    title: '수행 조직 및 역할', eyebrow: `${num.next()} · ${STEP.실행}`,
    lead: '보고 창구를 하나로 두고, 판단이 필요한 자리마다 책임자를 붙였습니다.',
  })

  const pmW = 2.6
  const pmX = MARGIN + (BODY_W - pmW) / 2
  const pmY = 1.5
  const pmH = 0.62

  slide.addText(
    [
      { text: '사업 총괄 PM', options: { bold: true, fontSize: 13, breakLine: true } },
      { text: data.companyName || '제안사', options: { fontSize: 10, color: pal.brandPale } },
    ],
    {
      x: pmX, y: pmY, w: pmW, h: pmH,
      shape: 'rect', fill: { color: pal.brandDeep }, color: pal.paper,
      fontFace: FONT, align: 'center', valign: 'middle',
    }
  )

  const boxW = (BODY_W - 0.3 * (ORG_ROLES.length - 1)) / ORG_ROLES.length
  const boxY = 3.05
  const boxH = 0.95
  const centerOf = (i: number) => MARGIN + (boxW + 0.3) * i + boxW / 2

  // PM에서 내려온 줄기와 가로대, 그리고 각 상자로 내려가는 가지.
  const stemTop = pmY + pmH
  const railY = 2.72
  slide.addShape('rect', {
    x: pmX + pmW / 2 - 0.008, y: stemTop, w: 0.016, h: railY - stemTop, fill: { color: pal.brandMid },
  })
  slide.addShape('rect', {
    x: centerOf(0), y: railY, w: centerOf(ORG_ROLES.length - 1) - centerOf(0), h: 0.016,
    fill: { color: pal.brandMid },
  })

  ORG_ROLES.forEach((r, i) => {
    slide.addShape('rect', {
      x: centerOf(i) - 0.008, y: railY, w: 0.016, h: boxY - railY, fill: { color: pal.brandMid },
    })
    slide.addText(
      [
        { text: r.role, options: { bold: true, fontSize: 12, color: pal.brandDeep, breakLine: true } },
        { text: r.duty, options: { fontSize: 9, color: pal.gray } },
      ],
      {
        x: MARGIN + (boxW + 0.3) * i, y: boxY, w: boxW, h: boxH,
        shape: 'rect', fill: { color: pal.band }, line: { color: pal.line, width: 1 },
        fontFace: FONT, align: 'center', valign: 'middle',
      }
    )
  })

  slide.addText(
    '※ 표준 편성입니다. 투입 인원과 등급은 인력투입계획서로 별도 제출합니다.',
    { x: MARGIN, y: H - 0.85, w: BODY_W, h: 0.35, fontFace: FONT, fontSize: 10, color: pal.gray }
  )
}

/**
 * 품질보증. 시험 항목을 새로 지어내지 않는다. 제안요청서의 비기능 요구사항이
 * 곧 인수 기준이므로, 그것을 시험 항목으로 옮긴다고 밝히는 것이 이 장의 요지다.
 *
 * 활동 목록은 리스크와 같은 방식이다. 어디에나 있는 네 가지를 깔고,
 * 제안요청서가 실제로 그 말을 꺼낸 시험만 더한다.
 */
const BASE_QA = [
  { activity: '산출물 상호 검토', when: '단계 종료 전', how: '작성자가 아닌 검토자를 지정하고, 검토 의견과 조치 결과를 기록으로 남깁니다.' },
  { activity: '단위 시험', when: '개발 단계', how: '기능 단위로 시험 항목을 작성하며, 결함은 조치 후 재시험으로 종결합니다.' },
  { activity: '통합 시험', when: '시험 단계', how: '업무 흐름 단위 시나리오로 수행하고, 결함 등급별 조치 기한을 정해 관리합니다.' },
  { activity: '사용자 인수 시험', when: '오픈 전', how: '발주기관 담당자가 직접 수행하며, 판정은 착수 시 합의한 검수 기준을 따릅니다.' },
]

const QA_TRIGGERS: { pattern: RegExp; item: (typeof BASE_QA)[number] }[] = [
  {
    pattern: /성능|응답|처리량|동시\s*접속|가용성|처리\s*속도/,
    item: { activity: '성능 시험', when: '시험 단계', how: '제안요청서에 제시된 성능 수치를 목표값으로 두고, 부하 시험 결과를 보고서로 제출합니다.' },
  },
  {
    pattern: /보안|개인정보|암호화|취약점/,
    item: { activity: '보안 취약점 점검', when: '오픈 전', how: '진단 결과와 조치 내역을 함께 제출하고, 조치 완료 후 재점검으로 확인합니다.' },
  },
  {
    pattern: /연계|연동|인터페이스|API/i,
    item: { activity: '연계 시험', when: '통합 시험 전', how: '연계 대상별 단위 시험을 먼저 수행해, 통합 시험 단계의 지연 요인을 줄입니다.' },
  },
]

function addQuality(pptx: Pptx, pal: BrandPalette, data: ProposalFormData, num: Numbering) {
  const haystack = data.rfp.requirements.map((r) => r.requirement).join(' ')
  const items = [...BASE_QA, ...QA_TRIGGERS.filter((t) => t.pattern.test(haystack)).map((t) => t.item)]
  const nonFunctional = data.rfp.requirements.filter((r) => r.kind === '비기능').length

  const { slide, top } = contentSlide(pptx, pal, {
    title: '품질보증 방안', eyebrow: `${num.next()} · ${STEP.실행}`,
    lead:
      nonFunctional > 0
        ? `제안요청서의 비기능 요구사항 ${nonFunctional}건을 그대로 시험 항목으로 옮깁니다.`
        : '검수 기준을 시험 항목으로 먼저 옮겨 두고 개발을 시작합니다.',
  })

  slide.addTable(
    [
      tableHeader(pal, ['품질 활동', '시점', '수행 방식']),
      ...items.map((q) => [
        { text: q.activity, options: { bold: true, color: pal.ink } },
        { text: q.when, options: { align: 'center' as const, color: pal.gray } },
        { text: q.how, options: { color: pal.ink } },
      ]),
    ],
    {
      x: MARGIN, y: top, w: BODY_W,
      colW: [1.6, 1.2, BODY_W - 2.8],
      // 유발 항목이 전부 걸리면 머리행까지 8행이다.
      rowH: 0.36,
      fontFace: FONT, fontSize: 9,
      border: { type: 'solid', color: pal.line, pt: 1 },
      valign: 'middle', autoPage: false,
    }
  )

  slide.addText(
    '※ 결함 등급과 인수 판정 기준은 착수 시 문서로 합의한 뒤 시험 계획에 반영합니다.',
    { x: MARGIN, y: H - 0.6, w: BODY_W, h: 0.3, fontFace: FONT, fontSize: 9, color: pal.gray }
  )
}

/**
 * 리스크. 어느 사업에나 있는 네 가지를 기본으로 깔고, 제안요청서가 실제로
 * 그 말을 꺼낸 경우에만 항목을 더한다. 연계 얘기가 없는 사업에 연계 실패
 * 리스크를 적는 것은 남의 제안서를 베낀 티가 나는 자리다.
 */
const BASE_RISKS = [
  { risk: '요구사항 변경', chance: '높음', impact: '중간', plan: '변경관리 절차와 영향도 평가 양식을 착수 시 합의하고, 주간 회의에서 승인 후 반영합니다.' },
  { risk: '일정 지연', chance: '중간', impact: '높음', plan: '단계별 산출물을 검수 기준으로 삼아 지연을 조기에 드러내고, 예비 일정을 단계마다 배정합니다.' },
  { risk: '핵심 인력 이탈', chance: '낮음', impact: '높음', plan: '역할별 백업 인력을 지정하고 산출물과 형상을 공유 저장소에 상시 관리합니다.' },
  { risk: '검수 지연', chance: '중간', impact: '중간', plan: '검수 항목과 판정 기준을 착수 시 문서로 확정하고, 단계별 사전 검수를 운영합니다.' },
]

const RISK_TRIGGERS: { pattern: RegExp; risk: (typeof BASE_RISKS)[number] }[] = [
  {
    pattern: /연계|연동|인터페이스|API/i,
    risk: { risk: '외부 시스템 연계 실패', chance: '중간', impact: '높음', plan: '연계 대상별 규격을 착수 단계에 확정하고, 통합 시험 전에 연계 단위 시험을 별도로 수행합니다.' },
  },
  {
    pattern: /이관|마이그레이션|전환/,
    risk: { risk: '데이터 이관 오류', chance: '중간', impact: '높음', plan: '이관 리허설을 통합 시험 전에 수행하고, 건수·정합성 검증 결과를 발주기관과 대조 확인합니다.' },
  },
  {
    pattern: /개인정보|보안|암호화/,
    risk: { risk: '보안 요건 미충족', chance: '낮음', impact: '높음', plan: '설계 단계에 보안 검토를 넣고, 오픈 전 취약점 점검과 조치 결과를 보고서로 제출합니다.' },
  },
]

function addRiskMatrix(pptx: Pptx, pal: BrandPalette, data: ProposalFormData, num: Numbering) {
  const haystack = data.rfp.requirements.map((r) => r.requirement).join(' ')
  const risks = [
    ...BASE_RISKS,
    ...RISK_TRIGGERS.filter((t) => t.pattern.test(haystack)).map((t) => t.risk),
  ]

  const { slide, top } = contentSlide(pptx, pal, {
    title: '리스크 관리 방안', eyebrow: `${num.next()} · ${STEP.실행}`,
  })

  // 영향도가 높은 항목을 위로 올린다. 표를 위에서부터 읽으면 그것이 곧 우선순위다.
  const weight = (v: string) => (v === '높음' ? 2 : v === '중간' ? 1 : 0)
  risks.sort((a, b) => weight(b.impact) * 2 + weight(b.chance) - (weight(a.impact) * 2 + weight(a.chance)))

  const level = (v: string) => ({
    text: v,
    options: {
      align: 'center' as const,
      bold: v === '높음',
      color: v === '높음' ? pal.brand : v === '중간' ? pal.ink : pal.gray,
    },
  })

  slide.addTable(
    [
      tableHeader(pal, ['리스크', '발생 가능성', '영향도', '대응 방안']),
      ...risks.map((r) => [
        { text: r.risk, options: { bold: true, color: pal.ink } },
        level(r.chance),
        level(r.impact),
        { text: r.plan, options: { color: pal.ink } },
      ]),
    ],
    {
      x: MARGIN, y: top, w: BODY_W,
      colW: [1.7, 0.95, 0.8, BODY_W - 3.45],
      // 유발 항목이 전부 걸리면 머리행까지 8행이다. 8 × 0.36 = 2.88로 각주 자리를 남긴다.
      rowH: 0.36,
      fontFace: FONT, fontSize: 9,
      border: { type: 'solid', color: pal.line, pt: 1 },
      valign: 'middle', autoPage: false,
    }
  )

  slide.addText(
    '※ 발생 가능성과 영향도는 유사 사업 수행 경험에 근거한 초기 평가입니다. 착수 후 발주기관과 함께 다시 매깁니다.',
    { x: MARGIN, y: H - 0.6, w: BODY_W, h: 0.3, fontFace: FONT, fontSize: 9, color: pal.gray }
  )
}

function addCompany(pptx: Pptx, pal: BrandPalette, data: ProposalFormData, num: Numbering) {
  const { intro, coreCompetencies } = data.companyProfile
  const { slide, top } = contentSlide(pptx, pal, {
    title: '제안사 소개', eyebrow: `${num.next()} · ${STEP.실행}`,
  })

  slide.addText(intro || `${josa(data.companyName, '은', '는')} 유사 사업 수행 경험을 바탕으로 본 사업을 수행합니다.`, {
    x: MARGIN, y: top, w: BODY_W, h: 0.9,
    fontFace: FONT, fontSize: 12, color: pal.ink, lineSpacingMultiple: 1.45, valign: 'top',
  })

  const items = coreCompetencies.filter((c) => c.text.trim().length > 0)
  if (items.length > 0) {
    // 위치를 고정하면 소개 글 길이와 어긋난다. 본문 시작선에서 잡는다.
    const headY = top + 1.05
    slide.addText('핵심 역량', {
      x: MARGIN, y: headY, w: BODY_W, h: 0.3,
      fontFace: FONT, fontSize: 13, bold: true, color: pal.brandDeep,
    })
    slide.addText(
      items.map((c) => ({ text: c.text, options: { breakLine: true, bullet: { code: '25AA' } } })),
      {
        x: MARGIN + 0.1, y: headY + 0.38, w: BODY_W - 0.2, h: H - 0.5 - (headY + 0.38),
        fontFace: FONT, fontSize: 11, color: pal.ink, lineSpacingMultiple: 1.5,
        // valign을 두지 않으면 항목이 적을 때 상자 한가운데로 내려앉아
        // 제목과 첫 항목 사이가 통째로 빈다.
        valign: 'top',
      }
    )
  }
}

function addTrackRecord(pptx: Pptx, pal: BrandPalette, data: ProposalFormData, num: Numbering) {
  const records = data.companyProfile.trackRecords.filter((r) => r.client.trim() || r.description.trim())
  if (records.length === 0) return

  const { slide, top } = contentSlide(pptx, pal, {
    title: '주요 수행 실적', eyebrow: `${num.next()} · ${STEP.실행}`,
  })

  const rows = [
    tableHeader(pal, ['고객사 / 프로젝트', '연도', '개요 및 성과']),
    ...records.slice(0, 6).map((r) => [
      { text: r.client || '-', options: { bold: true, color: pal.brand } },
      { text: r.year || '-', options: { align: 'center' as const, color: pal.ink } },
      { text: r.description || '-', options: { color: pal.ink } },
    ]),
  ]

  slide.addTable(rows, {
    x: MARGIN, y: top, w: BODY_W,
    colW: [2.6, 1.0, BODY_W - 3.6],
    fontFace: FONT, fontSize: 10,
    border: { type: 'solid', color: pal.line, pt: 1 },
    valign: 'middle',
    autoPage: false,
  })
}

/**
 * 유지보수 및 지원. 이 장은 대부분 표준 서술이다. 기간이나 시한을 숫자로 적을
 * 근거가 제안요청서에도 계약서에도 아직 없으므로, '계약에 정한 기간'이라고만
 * 쓰고 각주에서 그 사실을 밝힌다. 지키지 못할 수를 적는 것보다 낫다.
 */
const SUPPORT_ITEMS = [
  { item: '하자보수', scope: '검수 완료 이후', how: '결함 접수 창구를 하나로 두고, 등급별 대응 시한에 따라 조치한 뒤 결과를 보고합니다.' },
  { item: '기술 지원', scope: '운영 담당자 문의', how: '유선과 원격 지원을 기본으로 하며, 현장 조치가 필요한 사안은 방문하여 대응합니다.' },
  { item: '운영 이관', scope: '오픈 전후', how: '운영자 매뉴얼과 장애 대응 절차서를 인계하고, 인수인계 교육을 함께 실시합니다.' },
  { item: '사용자 교육', scope: '사용자 및 운영자', how: '오픈 전 집합 교육을 실시하고, 요청 시 오픈 이후 보수 교육을 제공합니다.' },
]

function addSupport(pptx: Pptx, pal: BrandPalette, data: ProposalFormData, num: Numbering) {
  const { slide, top } = contentSlide(pptx, pal, {
    title: '유지보수 및 지원', eyebrow: `${num.next()} · ${STEP.실행}`,
  })

  slide.addTable(
    [
      tableHeader(pal, ['지원 항목', '대상 시점', '수행 방식']),
      ...SUPPORT_ITEMS.map((s) => [
        { text: s.item, options: { bold: true, color: pal.ink } },
        { text: s.scope, options: { align: 'center' as const, color: pal.gray } },
        { text: s.how, options: { color: pal.ink } },
      ]),
    ],
    {
      x: MARGIN, y: top, w: BODY_W,
      colW: [1.5, 1.4, BODY_W - 2.9],
      rowH: 0.5,
      fontFace: FONT, fontSize: 10,
      border: { type: 'solid', color: pal.line, pt: 1 },
      valign: 'middle', autoPage: false,
    }
  )

  slide.addText(
    '※ 하자보수 기간과 지원 범위는 계약 조건을 따릅니다. 대응 시한은 착수 시 합의하여 문서로 남깁니다.',
    { x: MARGIN, y: H - 0.85, w: BODY_W, h: 0.35, fontFace: FONT, fontSize: 10, color: pal.gray }
  )
}

/**
 * 비용. 여기서는 금액을 만들어내지 않는다. 제안요청서가 밝힌 예산과, 평가표에
 * 가격 항목이 있다면 그 배점만이 사실이고, 나머지는 산출내역서의 몫이다.
 * 비목 구성을 적는 것은 무엇이 그 예산 안에 들어가는지를 밝히기 위해서지,
 * 배분 비율을 아는 척하기 위해서가 아니다.
 *
 * 예산이 미명시면 이 장은 통째로 빠진다.
 */
const COST_ITEMS = [
  { item: '인건비', scope: '투입 인력의 등급별 노임단가 기준. 착수 시 제출하는 인력투입계획서와 일치시킵니다.' },
  { item: '소프트웨어·하드웨어', scope: '도입이 필요한 상용 제품의 라이선스와 장비. 규격과 수량을 산출내역서에 명시합니다.' },
  { item: '기타 경비', scope: '교육, 출장, 산출물 제작 등 사업 수행에 직접 소요되는 비용에 한정합니다.' },
]

function addCost(pptx: Pptx, pal: BrandPalette, data: ProposalFormData, num: Numbering) {
  const budget = data.rfp.budget.trim()
  if (!budget) return

  const priceScore = data.rfp.evaluations.find((e) => /가격/.test(e.label) && (e.score ?? 0) > 0)

  const { slide, top } = contentSlide(pptx, pal, {
    title: '비용 산정 개요', eyebrow: `${num.next()} · ${STEP.실행}`,
  })

  // 숫자가 둘뿐이므로 차트가 아니라 수치 타일로 놓는다.
  const tiles = [
    { label: '제안요청서 명시 사업 예산', value: budget },
    ...(priceScore
      ? [{ label: `가격 평가 ${scoreNoun(scoreUnit(priceScore))}`, value: `${priceScore.score}${scoreUnit(priceScore)}` }]
      : []),
  ]
  const tileW = (BODY_W - 0.3 * (tiles.length - 1)) / tiles.length
  tiles.forEach((t, i) => {
    const x = MARGIN + (tileW + 0.3) * i
    slide.addShape('rect', { x, y: top, w: tileW, h: 0.95, fill: { color: pal.band }, line: { color: pal.line, width: 1 } })
    slide.addText(t.label, {
      x: x + 0.18, y: top + 0.12, w: tileW - 0.36, h: 0.24,
      fontFace: FONT, fontSize: 9, color: pal.gray,
    })
    slide.addText(t.value, {
      x: x + 0.18, y: top + 0.38, w: tileW - 0.36, h: 0.45,
      fontFace: FONT, fontSize: 16, bold: true, color: pal.brandDeep,
    })
  })

  slide.addTable(
    [
      tableHeader(pal, ['비목', '포함 범위']),
      ...COST_ITEMS.map((c) => [
        { text: c.item, options: { bold: true, color: pal.ink, align: 'center' as const } },
        { text: c.scope, options: { color: pal.ink } },
      ]),
    ],
    {
      x: MARGIN, y: top + 1.25, w: BODY_W,
      colW: [1.9, BODY_W - 1.9],
      rowH: 0.46,
      fontFace: FONT, fontSize: 10,
      border: { type: 'solid', color: pal.line, pt: 1 },
      valign: 'middle', autoPage: false,
    }
  )

  slide.addText(
    '※ 비목별 금액은 입찰 시 제출하는 산출내역서에 따르며, 총액은 제안요청서가 정한 예산 범위를 넘지 않습니다.',
    { x: MARGIN, y: H - 0.6, w: BODY_W, h: 0.3, fontFace: FONT, fontSize: 9, color: pal.gray }
  )
}

/**
 * 다음 단계. 제안서가 끝난 뒤 무엇이 이어지는지를 적는다. 날짜는 적지 않는다.
 * 제안요청서에서 읽어 온 일정 필드가 없으므로, 지어내면 그 자리에서 틀린다.
 */
const NEXT_STEPS = [
  { step: '제안 발표', ours: '제안 내용과 근거를 발표하고 질의에 답변합니다.' },
  { step: '우선협상', ours: '평가 결과에 따른 협상 요청 사항을 신속히 검토합니다.' },
  { step: '계약 체결', ours: '과업 범위와 검수 기준을 계약 문서로 확정합니다.' },
  { step: '사업 착수', ours: '착수 보고와 함께 요구사항 상세 분석에 들어갑니다.' },
]

function addNextSteps(pptx: Pptx, pal: BrandPalette, data: ProposalFormData, num: Numbering) {
  const { slide, top } = contentSlide(pptx, pal, {
    title: '다음 단계', eyebrow: `${num.next()} · ${STEP.실행}`,
  })

  const cardW = (BODY_W - 0.28 * (NEXT_STEPS.length - 1)) / NEXT_STEPS.length
  const cardY = top + 0.45
  NEXT_STEPS.forEach((s, i) => {
    const x = MARGIN + (cardW + 0.28) * i

    // 진행 방향을 화살촉 대신 이어지는 가로선으로 표시한다.
    if (i > 0) {
      slide.addShape('rect', {
        x: x - 0.28, y: cardY + 0.62, w: 0.28, h: 0.016, fill: { color: pal.line },
      })
    }
    slide.addText(String(i + 1).padStart(2, '0'), {
      x, y: cardY - 0.42, w: cardW, h: 0.34,
      fontFace: FONT, fontSize: 15, bold: true, color: pal.brandMid,
    })
    slide.addText(
      [
        { text: s.step, options: { bold: true, fontSize: 13, color: pal.brandDeep, breakLine: true } },
        { text: s.ours, options: { fontSize: 9, color: pal.gray } },
      ],
      {
        x, y: cardY, w: cardW, h: 1.25,
        shape: 'rect', fill: { color: pal.band }, line: { color: pal.line, width: 1 },
        fontFace: FONT, align: 'center', valign: 'middle',
      }
    )
  })

  const contact = data.preparedBy || data.companyName
  slide.addText(
    `${data.rfp.projectName || '본 사업'}에 대한 문의는 ${josa(contact, '으로', '로')} 연락 주시기 바랍니다.`,
    { x: MARGIN, y: H - 0.95, w: BODY_W, h: 0.35, fontFace: FONT, fontSize: 11, color: pal.ink }
  )
}

function addClosing(pptx: Pptx, pal: BrandPalette, data: ProposalFormData) {
  const slide = newSlide(pptx)
  slide.background = { color: pal.brandDark }
  const closing = data.winTheme?.headline.trim()
  slide.addText(closing ? '약속드린 것' : '감사합니다', {
    x: MARGIN, y: closing ? 1.5 : 2.2, w: BODY_W, h: 0.5,
    fontFace: FONT, fontSize: closing ? 13 : 30, bold: true,
    color: closing ? pal.brandMid : pal.paper, align: closing ? 'left' : 'center',
  })
  if (closing) {
    slide.addText(closing, {
      x: MARGIN, y: 2.0, w: BODY_W * 0.9, h: 1.6,
      fontFace: FONT, fontSize: 18, bold: true, color: pal.paper,
      lineSpacingMultiple: 1.35, valign: 'top',
    })
  }
  slide.addText(data.companyName, {
    x: MARGIN, y: closing ? 4.3 : 3.0, w: BODY_W, h: 0.4,
    fontFace: FONT, fontSize: 13, color: pal.brandPale, align: closing ? 'left' : 'center',
  })
}

// ── 메인 ─────────────────────────────────────────────────────────────────────

export async function generateProposalPptx(data: ProposalFormData): Promise<Buffer> {
  const PptxGenJS = (await import('pptxgenjs')).default
  const pptx = new PptxGenJS()
  const pal = buildPalette(data.brand.primary ?? undefined)

  pptx.layout = 'LAYOUT_16x9'
  // 슬라이드의 모든 글자는 자기 글꼴을 들고 있지만, 테마 기본값이 Calibri로
  // 남아 있으면 나중에 추가되는 요소가 그리로 떨어진다. 기본값도 맞춰 둔다.
  pptx.theme = { headFontFace: FONT, bodyFontFace: FONT }
  pptx.author = data.companyName
  pptx.company = data.companyName
  pptx.title = data.rfp.projectName || '제안서'

  // 목차는 장 이름과 함께 그 장이 논지에서 맡은 단계를 들고 다닌다.
  const agenda: { label: string; step: string }[] = [
    ...(data.winTheme?.headline.trim() ? [{ label: '제안 논지', step: STEP.기준 }] : []),
    { label: '사업 개요', step: STEP.문제 },
    // 아래 두 장은 전략 브리프가 있을 때만 만들어지므로 목차도 함께 움직인다.
    ...((data.rfp.background ?? []).length > 0
      ? [{ label: 'AS-IS / TO-BE', step: STEP.문제 }]
      : []),
    { label: '요구사항 구성', step: STEP.문제 },
    { label: '요구사항 대응 방안', step: STEP.근거 },
    // 이름은 슬라이드 제목과 같은 곳에서 가져온다. 배점이 %면 그 장은 '가중치 구성'이 된다.
    ...(data.rfp.evaluations.filter((e) => (e.score ?? 0) > 0).length >= 2
      ? [{ label: `${scoreNoun(deckScoreUnit(data))} 구성`, step: STEP.근거 }]
      : []),
    { label: '평가 기준별 대응', step: STEP.근거 },
    ...((data.rfp.focus ?? []).some((f) => f.score > 0)
      ? [{ label: '평가 항목별 대응 상세', step: STEP.근거 }]
      : []),
    // 숫자로 적힌 요구가 하나도 없으면 기대 효과 장이 만들어지지 않는다.
    ...(data.rfp.requirements.some((r) => MEASURABLE.test(r.requirement))
      ? [{ label: '기대 효과', step: STEP.근거 }]
      : []),
    { label: '추진 일정', step: STEP.실행 },
    { label: '단계별 산출물', step: STEP.실행 },
    { label: '수행 조직 및 역할', step: STEP.실행 },
    { label: '품질보증 방안', step: STEP.실행 },
    { label: '리스크 관리 방안', step: STEP.실행 },
    { label: '유지보수 및 지원', step: STEP.실행 },
    { label: '제안사 소개', step: STEP.실행 },
  ]
  if (data.companyProfile.trackRecords.some((r) => r.client.trim() || r.description.trim())) {
    agenda.push({ label: '주요 수행 실적', step: STEP.실행 })
  }
  // 예산이 미명시면 비용 장이 만들어지지 않으므로 목차에서도 빠져야 한다.
  if (data.rfp.budget.trim()) {
    agenda.push({ label: '비용 산정 개요', step: STEP.실행 })
  }
  agenda.push({ label: '다음 단계', step: STEP.실행 })

  // 간지는 목차와 같은 배열에서 장 목록을 가져오므로 둘이 어긋나지 않는다.
  const chaptersOf = (step: string) => agenda.filter((a) => a.step === step).map((a) => a.label)

  // 번호 발급기는 이 순서를 그대로 따라간다. 아래 호출 순서가 곧 번호 순서다.
  const num = numbering()

  addCover(pptx, pal, data)
  addAgenda(pptx, pal, data, agenda)

  addStepDivider(pptx, pal, STEP.기준, chaptersOf(STEP.기준))
  addWinTheme(pptx, pal, data)

  addStepDivider(pptx, pal, STEP.문제, chaptersOf(STEP.문제))
  addOverview(pptx, pal, data, num)
  addAsIsToBe(pptx, pal, data, num)
  addRequirementSummary(pptx, pal, data, num)

  addStepDivider(pptx, pal, STEP.근거, chaptersOf(STEP.근거))
  // 대응 문구 발급기는 문서에 하나뿐이다. 요구사항 대응 장이 쓴 문장을
  // 평가 상세 장이 다시 쓰지 않도록, 같은 장부를 두 장이 나눠 본다.
  const write = responseWriter()

  addRequirementResponses(pptx, pal, data, num, write)
  addScoreChart(pptx, pal, data, num)
  addEvaluation(pptx, pal, data, num)
  addEvaluationDetail(pptx, pal, data, num, write)
  addExpectedEffect(pptx, pal, data, num)

  addStepDivider(pptx, pal, STEP.실행, chaptersOf(STEP.실행))
  addSchedule(pptx, pal, data, num)
  addGantt(pptx, pal, data, num)
  addDeliverables(pptx, pal, data, num)
  addOrgChart(pptx, pal, data, num)
  addQuality(pptx, pal, data, num)
  addRiskMatrix(pptx, pal, data, num)
  addSupport(pptx, pal, data, num)
  addCompany(pptx, pal, data, num)
  addTrackRecord(pptx, pal, data, num)
  addCost(pptx, pal, data, num)
  addNextSteps(pptx, pal, data, num)
  addClosing(pptx, pal, data)

  return (await pptx.write({ outputType: 'nodebuffer' })) as Buffer
}
