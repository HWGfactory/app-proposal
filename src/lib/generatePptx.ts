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


const FONT = '맑은 고딕'

// 요구사항 유형별 표준 대응 문구. 아래 키워드 버킷에 걸리지 않을 때만 쓰인다.
const STANDARD_RESPONSE: Record<RequirementKind, string> = {
  기능: '요구 기능을 표준 모듈로 구현하고, 상세 설계 단계에서 고객사 업무 절차에 맞춰 화면·데이터 구조를 확정합니다.',
  비기능: '성능·보안·가용성 목표를 설계 기준으로 반영하고, 통합 테스트 단계에서 정량 지표로 충족 여부를 검증합니다.',
  기타: '제안요청서에 명시된 조건을 계약 및 수행 계획에 반영하여 준수합니다.',
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
    write: (t) => `${t} 요건을 설계 산출물의 검토 항목으로 고정하고, 통합 테스트 단계에서 취약점 점검과 함께 확인합니다.`,
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
    write: (t) => `${t} 설계는 시안 검토를 거쳐 확정하고, 사용자 검수에서 실제 업무 흐름대로 확인합니다.`,
  },
  {
    pattern: /(교육|매뉴얼|가이드|인수인계)/,
    write: (t) => `${t} 자료를 운영자용과 사용자용으로 나누어 작성하고, 오픈 전 실습 교육으로 숙련도를 확보합니다.`,
  },
  {
    pattern: /(관계법령|법령|법규|표준|규정|지침)/,
    write: (t) => `${t} 준수 항목을 점검표로 만들어, 단계별 산출물 검토 시 함께 확인합니다.`,
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

function responseFor(req: RfpRequirementItem): string {
  const compact = req.requirement.replace(/\s/g, '')
  for (const rule of RESPONSE_RULES) {
    const hit = compact.match(rule.pattern)
    if (hit) return rule.write(hit[1])
  }
  return STANDARD_RESPONSE[req.kind]
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

/** Win Theme이 없을 때는 축에 기대는 문장을 만들지 않는다. */
function lead(angle: string | undefined, withAngle: (a: string) => string): string | undefined {
  return angle ? withAngle(angle) : undefined
}

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

function tableHeader(pal: BrandPalette, labels: string[]) {
  return labels.map((text) => ({
    text,
    options: { bold: true, color: pal.paper, fill: { color: pal.brandDeep }, align: 'center' as const },
  }))
}

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

  // 표지는 주장을 처음 꺼내는 자리다. 이후 장들은 이 문장을 되풀이하지 않고 증명한다.
  const headline = data.winTheme?.headline.trim()
  if (headline) {
    slide.addText(headline, {
      x: MARGIN, y: 3.3, w: BODY_W * 0.82, h: 0.7,
      fontFace: FONT, fontSize: 12, color: pal.brandPale, italic: true, lineSpacingMultiple: 1.3,
    })
  }

  const meta = [
    data.rfp.client ? `${data.rfp.client} 귀중` : null,
    `제안사 : ${data.companyName}`,
    data.preparedBy ? `작성자 : ${data.preparedBy}` : null,
    `작성일 : ${data.preparedDate}`,
  ].filter(Boolean).join('\n')

  slide.addText(meta, {
    x: MARGIN, y: headline ? 4.1 : 3.35, w: BODY_W, h: 1.1,
    fontFace: FONT, fontSize: 11, color: pal.brandPale, lineSpacingMultiple: 1.35,
  })
}

/**
 * 단계 간지. 논지가 다음 단계로 넘어가는 자리를 표시하고, 그 단계에서 무엇을
 * 다루는지 미리 알린다. 목차에서 만든 장 목록을 그대로 받아 쓰므로 두 곳이
 * 어긋날 수 없다.
 */
const STEP_ROLE: Record<string, string> = {
  [STEP.문제]: '발주기관이 무엇을 겪고 있는지 확인합니다.',
  [STEP.기준]: '그래서 무엇으로 판단해야 하는지 밝힙니다.',
  [STEP.근거]: '그 기준을 어떻게 충족하는지 증명합니다.',
  [STEP.실행]: '약속을 지킬 수 있는 조직과 계획을 보입니다.',
}

function addStepDivider(pptx: Pptx, pal: BrandPalette, step: string, chapters: string[]) {
  if (chapters.length === 0) return

  const slide = newSlide(pptx)
  slide.background = { color: pal.band }

  slide.addShape('rect', { x: MARGIN, y: 1.9, w: 0.06, h: 1.5, fill: { color: pal.brand } })
  slide.addText(step, {
    x: MARGIN + 0.32, y: 1.85, w: BODY_W - 0.32, h: 0.6,
    fontFace: FONT, fontSize: 30, bold: true, color: pal.brandDeep,
  })
  slide.addText(STEP_ROLE[step] ?? '', {
    x: MARGIN + 0.32, y: 2.5, w: BODY_W - 0.32, h: 0.32,
    fontFace: FONT, fontSize: 12, color: pal.gray,
  })
  slide.addText(
    chapters.map((c) => ({ text: c, options: { breakLine: true, bullet: { code: '25AA' } } })),
    {
      x: MARGIN + 0.42, y: 2.95, w: BODY_W - 0.42, h: 1.1,
      fontFace: FONT, fontSize: 12, color: pal.ink, lineSpacingMultiple: 1.4,
    }
  )
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
    lead: lead(data.winTheme?.angle, (a) => `'${a}'을 세우는 순서로 구성했습니다.`),
  })

  let y = top
  let lastStep = ''
  sections.forEach((section, i) => {
    if (section.step !== lastStep) {
      slide.addText(section.step, {
        x: MARGIN, y, w: 1.5, h: 0.26,
        fontFace: FONT, fontSize: 10, bold: true, color: pal.brand,
      })
      lastStep = section.step
    }
    slide.addText(`${String(i + 1).padStart(2, '0')}   ${section.label}`, {
      x: MARGIN + 1.6, y: y - 0.02, w: BODY_W - 1.6, h: 0.3,
      fontFace: FONT, fontSize: 13, color: pal.ink,
    })
    y += 0.42
  })
}

/**
 * 논지 전개. Win Theme 한 문장을 문제 → 기준 → 근거 → 결과로 펼쳐,
 * 이후 모든 장이 어느 칸을 채우러 오는지 미리 밝힌다.
 */
function addWinTheme(pptx: Pptx, pal: BrandPalette, data: ProposalFormData) {
  const theme = data.winTheme
  if (!theme || !theme.headline.trim()) return

  const { slide } = contentSlide(pptx, pal, { title: '제안 논지', eyebrow: `WIN THEME · ${theme.angle}` })

  // 주장
  slide.addShape('rect', { x: MARGIN, y: 1.3, w: 0.05, h: 1.15, fill: { color: pal.brand } })
  slide.addText(theme.headline, {
    x: MARGIN + 0.28, y: 1.3, w: BODY_W - 0.28, h: 1.15,
    fontFace: FONT, fontSize: 17, bold: true, color: pal.brandDeep,
    lineSpacingMultiple: 1.3, valign: 'top',
  })

  // 이 주장을 어떤 순서로 증명하는지 — 뒤따르는 장들의 지도
  const background = theme.evidence.find((e) => e.kind === '배경')
  const proof = theme.evidence.filter((e) => e.kind !== '배경').slice(0, 3)

  const steps: [string, string][] = [
    [STEP.문제, background ? background.text : `${data.rfp.client || '발주기관'}이 제안요청서에 밝힌 현황`],
    [STEP.기준, `그래서 '${theme.angle}'이 이 사업의 성패를 가릅니다.`],
    [STEP.근거, proof.length > 0 ? proof.map((p) => p.text).join(' / ') : '제안요청서 요구사항 전건 대응'],
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

function addOverview(pptx: Pptx, pal: BrandPalette, data: ProposalFormData) {
  const angle = data.winTheme?.angle
  const { slide, top } = contentSlide(pptx, pal, {
    title: '사업 개요', eyebrow: `01 · ${STEP.문제}`,
    lead: lead(angle, (a) => `제안요청서가 밝힌 조건입니다. 이 가운데 '${a}'이 성패를 가릅니다.`),
  })
  const { rfp } = data

  const rows = [
    ['사업명', rfp.projectName || '-'],
    ['발주기관', rfp.client || '-'],
    ['사업 예산', rfp.budget || '제안요청서 미명시'],
    ['사업 기간', rfp.duration || '제안요청서 미명시'],
    ['근거 문서', rfp.fileName || '제안요청서'],
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
const MEASURABLE = /\d[\d,.]*\s*(?:%|초|분|시간|일|건|명|배|회|개월)/

function addAsIsToBe(pptx: Pptx, pal: BrandPalette, data: ProposalFormData) {
  const background = data.rfp.background ?? []
  if (background.length === 0) return

  const targets = data.rfp.requirements.filter((r) => MEASURABLE.test(r.requirement)).slice(0, 4)

  const { slide, top } = contentSlide(pptx, pal, {
    title: 'AS-IS / TO-BE',
    eyebrow: `01-1 · ${STEP.문제}`,
    lead: '왼쪽은 제안요청서가 밝힌 현재 상황이고, 오른쪽은 요구사항에 명시된 목표입니다.',
  })

  const colW = (BODY_W - 0.3) / 2
  const columns: [string, string, string, { text: string; page: number }[]][] = [
    ['AS-IS', '현재 상황', pal.gray, background.slice(0, 4).map((b) => ({ text: b.text, page: b.page }))],
    ['TO-BE', '요구된 목표', pal.brand, targets.map((r) => ({ text: r.requirement, page: r.page }))],
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

function addRequirementSummary(pptx: Pptx, pal: BrandPalette, data: ProposalFormData) {
  const angle = data.winTheme?.angle
  const { slide, top } = contentSlide(pptx, pal, {
    title: '요구사항 구성', eyebrow: `02 · ${STEP.문제}`,
    lead: lead(angle, (a) => `요구사항을 유형별로 갈랐습니다. '${a}'과 직결되는 항목을 다음 장 앞머리에 둡니다.`),
  })
  const reqs = data.rfp.requirements
  const kinds: RequirementKind[] = ['기능', '비기능', '기타']
  const kindColor = kindColors(pal)
  const counts = kinds.map((k) => ({ kind: k, n: reqs.filter((r) => r.kind === k).length }))

  // 유형별 카드
  const cardW = (BODY_W - 0.4) / 3
  counts.forEach((c, i) => {
    const x = MARGIN + i * (cardW + 0.2)
    slide.addShape('rect', {
      x, y: top, w: cardW, h: 1.3,
      fill: { color: pal.band }, line: { color: pal.line, width: 1 },
    })
    slide.addText(`${c.n}`, {
      x, y: top + 0.15, w: cardW, h: 0.6,
      fontFace: FONT, fontSize: 30, bold: true, color: kindColor[c.kind], align: 'center',
    })
    slide.addText(`${c.kind} 요구사항`, {
      x, y: top + 0.78, w: cardW, h: 0.3,
      fontFace: FONT, fontSize: 11, color: pal.gray, align: 'center',
    })
  })

  slide.addText(
    `제안요청서에서 총 ${reqs.length}건의 요구사항을 식별했습니다. 각 요구사항에 대한 대응 방안은 다음 장에서 근거 페이지와 함께 제시합니다.`,
    { x: MARGIN, y: top + 1.6, w: BODY_W, h: 0.6, fontFace: FONT, fontSize: 12, color: pal.ink, lineSpacingMultiple: 1.4 }
  )
}

/** 요구사항이 많으면 한 슬라이드에 다 들어가지 않으므로 나눠 담는다. */
const ROWS_PER_SLIDE = 4

function addRequirementResponses(pptx: Pptx, pal: BrandPalette, data: ProposalFormData) {
  const angle = data.winTheme?.angle
  if (data.rfp.requirements.length === 0) {
    const { slide, top } = contentSlide(pptx, pal, { title: '요구사항 대응 방안', eyebrow: `03 · ${STEP.근거}` })
    slide.addText('제안요청서에서 요구사항을 식별하지 못했습니다.', {
      x: MARGIN, y: top, w: BODY_W, h: 0.4, fontFace: FONT, fontSize: 12, color: pal.gray,
    })
    return
  }

  // Win Theme의 근거로 인용된 요구사항을 앞으로 당긴다. 축을 세우는 항목부터
  // 읽히도록 순서 자체를 바꾸는 것이, 문장을 반복하는 것보다 강한 정렬이다.
  const proofCount = data.rfp.requirements.filter((r) => isThemeProof(data, r.requirement)).length
  const reqs = [...data.rfp.requirements].sort(
    (a, b) => Number(isThemeProof(data, b.requirement)) - Number(isThemeProof(data, a.requirement))
  )

  const kindColor = kindColors(pal)
  const pages = Math.ceil(reqs.length / ROWS_PER_SLIDE)
  for (let p = 0; p < pages; p++) {
    const chunk = reqs.slice(p * ROWS_PER_SLIDE, (p + 1) * ROWS_PER_SLIDE)
    const title = pages > 1 ? `요구사항 대응 방안 (${p + 1}/${pages})` : '요구사항 대응 방안'
    const { slide, top } = contentSlide(pptx, pal, {
      title,
      eyebrow: `03 · ${STEP.근거}`,
      // 첫 장에서만 정렬 원칙을 밝힌다. 매 장 반복하면 다시 소음이 된다.
      lead:
        p === 0 && proofCount > 0
          ? lead(angle, (a) => `'${a}'을 직접 뒷받침하는 ${proofCount}건을 앞에 두었습니다.`)
          : undefined,
    })

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
          { text: r.requirement, options: { color: pal.ink, bold: proof } },
          { text: responseFor(r), options: { color: pal.gray } },
          { text: `${r.page}p`, options: { color: pal.gray, align: 'center' as const } },
        ]
      }),
    ]

    slide.addTable(rows, {
      x: MARGIN, y: top, w: BODY_W,
      colW: [0.6, 0.75, 3.5, 3.55, 0.5],
      fontFace: FONT, fontSize: 9,
      border: { type: 'solid', color: pal.line, pt: 1 },
      valign: 'middle',
      autoPage: false,
    })
  }
}

function addEvaluation(pptx: Pptx, pal: BrandPalette, data: ProposalFormData) {
  const angle = data.winTheme?.angle
  const evals = [...data.rfp.evaluations].sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
  if (evals.length === 0) return

  const { slide, top } = contentSlide(pptx, pal, {
    title: '평가 기준별 대응', eyebrow: `04 · ${STEP.근거}`,
    lead: lead(angle, (a) => `배점이 큰 항목부터, '${a}'을 근거로 대응합니다.`),
  })
  const total = evals.reduce((s, e) => s + (e.score ?? 0), 0)

  const rows = [
    tableHeader(pal, ['평가 항목', '배점', '대응 근거']),
    ...evals.map((e) => [
      { text: e.label, options: { bold: true, color: pal.brandDeep } },
      { text: e.score !== null ? `${e.score}점` : '-', options: { align: 'center' as const, color: pal.ink } },
      { text: '본 제안서의 해당 장에서 근거와 함께 제시', options: { color: pal.gray } },
    ]),
  ]

  slide.addTable(rows, {
    x: MARGIN, y: top, w: BODY_W,
    colW: [4.0, 1.0, BODY_W - 5.0],
    fontFace: FONT, fontSize: 10,
    border: { type: 'solid', color: pal.line, pt: 1 },
    valign: 'middle',
    autoPage: false,
  })

  if (total > 0) {
    slide.addText(`확인된 배점 합계 ${total}점 · 배점이 높은 항목을 우선 순위로 제안 내용을 구성했습니다.`, {
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

function addEvaluationDetail(pptx: Pptx, pal: BrandPalette, data: ProposalFormData) {
  const focus = (data.rfp.focus ?? []).filter((f) => f.score > 0)
  if (focus.length === 0) return

  focus.slice(0, EVALUATION_DETAIL_SLIDES).forEach((item, i) => {
    const { slide, top } = contentSlide(pptx, pal, {
      title: item.label,
      eyebrow: `04-${i + 1} · ${STEP.근거}`,
      lead: `전체 배점의 ${item.sharePct}%가 걸린 항목입니다.`,
    })

    // 배점·비중·권장 분량을 한 줄로 세운다
    const cards: [string, string][] = [
      ['배점', `${item.score}점`],
      ['비중', `${item.sharePct}%`],
      ...(item.recommendedPages !== null
        ? ([['권장 분량', `${item.recommendedPages}p`]] as [string, string][])
        : []),
    ]
    const cardW = (BODY_W - 0.4) / 3
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
    if (item.relatedRequirements.length > 0) {
      slide.addText('이 점수를 뒷받침하는 제안요청서 요구사항', {
        x: MARGIN, y: listTop, w: BODY_W, h: 0.26,
        fontFace: FONT, fontSize: 11, bold: true, color: pal.brandDeep,
      })
      slide.addText(
        item.relatedRequirements.map((r) => ({
          text: `${r.text} (${r.page}p)`,
          options: { breakLine: true, bullet: { code: '25AA' } },
        })),
        {
          x: MARGIN + 0.15, y: listTop + 0.34, w: BODY_W - 0.15, h: 1.5,
          fontFace: FONT, fontSize: 10, color: pal.ink, lineSpacingMultiple: 1.45,
        }
      )
    } else {
      slide.addText('이 항목과 직접 연결되는 요구사항 문장은 제안요청서에서 확인되지 않았습니다.', {
        x: MARGIN, y: listTop, w: BODY_W, h: 0.4,
        fontFace: FONT, fontSize: 11, color: pal.gray,
      })
    }
  })
}

function addSchedule(pptx: Pptx, pal: BrandPalette, data: ProposalFormData) {
  const angle = data.winTheme?.angle
  const { slide, top } = contentSlide(pptx, pal, {
    title: '추진 일정', eyebrow: `05 · ${STEP.실행}`,
    lead: lead(angle, (a) => `'${a}'을 언제 확인할 수 있는지를 단계마다 못 박았습니다.`),
  })

  const phases = [
    { phase: 'Phase 1', period: '착수 ~ 4주', tasks: '착수 보고, 요구사항 상세 분석 및 확정, 현행 진단' },
    { phase: 'Phase 2', period: '5 ~ 12주', tasks: '핵심 기능 개발, 외부 시스템 연동, 주간 진도 보고' },
    { phase: 'Phase 3', period: '13 ~ 18주', tasks: '통합 테스트, 성능·보안 점검, 데이터 이관 및 검증' },
    { phase: 'Phase 4', period: '19주 ~ 종료', tasks: '사용자 교육, 오픈 및 안정화, 운영 이관, 완료 보고' },
  ]

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

  slide.addText(
    `※ 총 사업 기간 ${data.rfp.duration || '(제안요청서 미명시)'} 기준의 표준 일정이며, 착수 단계에서 협의하여 확정합니다.`,
    { x: MARGIN, y: H - 0.85, w: BODY_W, h: 0.35, fontFace: FONT, fontSize: 10, color: pal.gray }
  )
}

function addCompany(pptx: Pptx, pal: BrandPalette, data: ProposalFormData) {
  const angle = data.winTheme?.angle
  const { intro, coreCompetencies } = data.companyProfile
  const { slide, top } = contentSlide(pptx, pal, {
    title: '제안사 소개', eyebrow: `06 · ${STEP.실행}`,
    lead: lead(angle, (a) => `'${a}'을 실행해 본 조직인지, 아래 근거로 보여드립니다.`),
  })

  slide.addText(intro || `${data.companyName}는 유사 사업 수행 경험을 바탕으로 본 사업을 수행합니다.`, {
    x: MARGIN, y: top, w: BODY_W, h: 0.9,
    fontFace: FONT, fontSize: 12, color: pal.ink, lineSpacingMultiple: 1.45, valign: 'top',
  })

  const items = coreCompetencies.filter((c) => c.text.trim().length > 0)
  if (items.length > 0) {
    slide.addText('핵심 역량', {
      x: MARGIN, y: 2.4, w: BODY_W, h: 0.3,
      fontFace: FONT, fontSize: 13, bold: true, color: pal.brandDeep,
    })
    slide.addText(
      items.map((c) => ({ text: c.text, options: { breakLine: true, bullet: { code: '25AA' } } })),
      { x: MARGIN + 0.1, y: 2.75, w: BODY_W - 0.2, h: 2.1, fontFace: FONT, fontSize: 11, color: pal.ink, lineSpacingMultiple: 1.5 }
    )
  }
}

function addTrackRecord(pptx: Pptx, pal: BrandPalette, data: ProposalFormData) {
  const angle = data.winTheme?.angle
  const records = data.companyProfile.trackRecords.filter((r) => r.client.trim() || r.description.trim())
  if (records.length === 0) return

  const { slide, top } = contentSlide(pptx, pal, {
    title: '주요 수행 실적', eyebrow: `07 · ${STEP.실행}`,
    lead: lead(angle, (a) => `같은 문제를 이미 다뤄 본 사업들입니다.`),
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
    { label: '평가 기준별 대응', step: STEP.근거 },
    ...((data.rfp.focus ?? []).some((f) => f.score > 0)
      ? [{ label: '평가 항목별 대응 상세', step: STEP.근거 }]
      : []),
    { label: '추진 일정', step: STEP.실행 },
    { label: '제안사 소개', step: STEP.실행 },
  ]
  if (data.companyProfile.trackRecords.some((r) => r.client.trim() || r.description.trim())) {
    agenda.push({ label: '주요 수행 실적', step: STEP.실행 })
  }

  // 간지는 목차와 같은 배열에서 장 목록을 가져오므로 둘이 어긋나지 않는다.
  const chaptersOf = (step: string) => agenda.filter((a) => a.step === step).map((a) => a.label)

  addCover(pptx, pal, data)
  addAgenda(pptx, pal, data, agenda)

  addStepDivider(pptx, pal, STEP.기준, chaptersOf(STEP.기준))
  addWinTheme(pptx, pal, data)

  addStepDivider(pptx, pal, STEP.문제, chaptersOf(STEP.문제))
  addOverview(pptx, pal, data)
  addAsIsToBe(pptx, pal, data)
  addRequirementSummary(pptx, pal, data)

  addStepDivider(pptx, pal, STEP.근거, chaptersOf(STEP.근거))
  addRequirementResponses(pptx, pal, data)
  addEvaluation(pptx, pal, data)
  addEvaluationDetail(pptx, pal, data)

  addStepDivider(pptx, pal, STEP.실행, chaptersOf(STEP.실행))
  addSchedule(pptx, pal, data)
  addCompany(pptx, pal, data)
  addTrackRecord(pptx, pal, data)
  addClosing(pptx, pal, data)

  return (await pptx.write({ outputType: 'nodebuffer' })) as Buffer
}
