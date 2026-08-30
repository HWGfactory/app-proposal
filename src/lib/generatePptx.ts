/**
 * RFP 분석 결과 + 제안사 정보 → 제안 발표자료(PPTX).
 *
 * 사용자가 입력하는 것은 제안사 정보뿐이므로, 사업에 관한 모든 슬라이드는
 * RfpSource에서 파생된다. PowerPoint가 시스템에 설치된 한글 폰트를 사용하므로
 * 폰트 파일을 별도로 임베드하지 않는다.
 */

import type { ProposalFormData, RfpRequirementItem } from '@/types/proposal'
import type { RequirementKind } from '@/lib/rfp/analyze'

// 16:9 기준 (10 x 5.625 inch)
const W = 10
const H = 5.625
const MARGIN = 0.55
const BODY_W = W - MARGIN * 2

const C = {
  brand: '1B75BB',
  brandDeep: '0F4573',
  ink: '1A1E28',
  gray: '5C6270',
  line: 'DCDFE5',
  band: 'F4F5F7',
  white: 'FFFFFF',
  green: '2CA05A',
  violet: '6B46C1',
}

const FONT = '맑은 고딕'

// 요구사항 유형별 표준 대응 문구. 사용자가 대응 방안을 직접 쓰지 않으므로,
// 최소한 유형에 맞는 서술이 들어가도록 한다 (발표 시 보완 전제).
const STANDARD_RESPONSE: Record<RequirementKind, string> = {
  기능: '요구 기능을 표준 모듈로 구현하고, 상세 설계 단계에서 고객사 업무 절차에 맞춰 화면·데이터 구조를 확정합니다.',
  비기능: '성능·보안·가용성 목표를 설계 기준으로 반영하고, 통합 테스트 단계에서 정량 지표로 충족 여부를 검증합니다.',
  기타: '제안요청서에 명시된 조건을 계약 및 수행 계획에 반영하여 준수합니다.',
}

const KIND_COLOR: Record<RequirementKind, string> = {
  기능: C.brand,
  비기능: C.violet,
  기타: C.gray,
}

type Pptx = import('pptxgenjs').default
type Slide = ReturnType<Pptx['addSlide']>

// ── 공통 레이아웃 ────────────────────────────────────────────────────────────

/** 모든 본문 슬라이드에 공통으로 들어가는 제목 + 상단 규칙선 */
function contentSlide(pptx: Pptx, title: string, eyebrow?: string): Slide {
  const slide = pptx.addSlide()
  slide.background = { color: C.white }

  if (eyebrow) {
    slide.addText(eyebrow, {
      x: MARGIN, y: 0.28, w: BODY_W, h: 0.22,
      fontFace: FONT, fontSize: 10, color: C.brand, bold: true,
    })
  }
  slide.addText(title, {
    x: MARGIN, y: eyebrow ? 0.5 : 0.38, w: BODY_W, h: 0.45,
    fontFace: FONT, fontSize: 22, color: C.brandDeep, bold: true,
  })
  slide.addShape('rect', {
    x: MARGIN, y: eyebrow ? 1.0 : 0.88, w: BODY_W, h: 0.025,
    fill: { color: C.brand },
  })
  return slide
}

function tableHeader(labels: string[]) {
  return labels.map((text) => ({
    text,
    options: { bold: true, color: C.white, fill: { color: C.brandDeep }, align: 'center' as const },
  }))
}

// ── 슬라이드 ─────────────────────────────────────────────────────────────────

function addCover(pptx: Pptx, data: ProposalFormData) {
  const slide = pptx.addSlide()
  slide.background = { color: C.brandDeep }

  slide.addText('제안요청서(RFP) 대응 제안서', {
    x: MARGIN, y: 1.55, w: BODY_W, h: 0.3,
    fontFace: FONT, fontSize: 12, color: 'A6CEEE', bold: true,
  })
  slide.addText(data.rfp.projectName || '제안서', {
    x: MARGIN, y: 1.95, w: BODY_W, h: 1.0,
    fontFace: FONT, fontSize: 32, color: C.white, bold: true,
  })
  slide.addShape('rect', { x: MARGIN, y: 3.05, w: 1.6, h: 0.04, fill: { color: '3591D6' } })

  const meta = [
    data.rfp.client ? `${data.rfp.client} 귀중` : null,
    `제안사 : ${data.companyName}`,
    data.preparedBy ? `작성자 : ${data.preparedBy}` : null,
    `작성일 : ${data.preparedDate}`,
  ].filter(Boolean).join('\n')

  slide.addText(meta, {
    x: MARGIN, y: 3.35, w: BODY_W, h: 1.2,
    fontFace: FONT, fontSize: 12, color: 'D2E7F6', lineSpacingMultiple: 1.4,
  })
}

function addAgenda(pptx: Pptx, sections: string[]) {
  const slide = contentSlide(pptx, '목차', 'AGENDA')
  slide.addText(
    sections.map((s, i) => ({
      text: `${String(i + 1).padStart(2, '0')}   ${s}`,
      options: { breakLine: true, fontSize: 14, color: C.ink, bold: false },
    })),
    { x: MARGIN + 0.15, y: 1.35, w: BODY_W - 0.3, h: 3.6, fontFace: FONT, lineSpacingMultiple: 1.9 }
  )
}

function addOverview(pptx: Pptx, data: ProposalFormData) {
  const slide = contentSlide(pptx, '사업 개요', '01  OVERVIEW')
  const { rfp } = data

  const rows = [
    ['사업명', rfp.projectName || '-'],
    ['발주기관', rfp.client || '-'],
    ['사업 예산', rfp.budget || '제안요청서 미명시'],
    ['사업 기간', rfp.duration || '제안요청서 미명시'],
    ['근거 문서', rfp.fileName || '제안요청서'],
    ['식별 요구사항', `${rfp.requirements.length}건`],
  ].map(([k, v]) => [
    { text: k, options: { bold: true, color: C.brandDeep, fill: { color: C.band } } },
    { text: v, options: { color: C.ink } },
  ])

  slide.addTable(rows, {
    x: MARGIN, y: 1.35, w: BODY_W,
    colW: [2.4, BODY_W - 2.4],
    rowH: 0.42,
    fontFace: FONT, fontSize: 11,
    border: { type: 'solid', color: C.line, pt: 1 },
    valign: 'middle',
  })
}

function addRequirementSummary(pptx: Pptx, data: ProposalFormData) {
  const slide = contentSlide(pptx, '요구사항 구성', '02  REQUIREMENTS')
  const reqs = data.rfp.requirements
  const kinds: RequirementKind[] = ['기능', '비기능', '기타']
  const counts = kinds.map((k) => ({ kind: k, n: reqs.filter((r) => r.kind === k).length }))

  // 유형별 카드
  const cardW = (BODY_W - 0.4) / 3
  counts.forEach((c, i) => {
    const x = MARGIN + i * (cardW + 0.2)
    slide.addShape('rect', {
      x, y: 1.4, w: cardW, h: 1.3,
      fill: { color: C.band }, line: { color: C.line, width: 1 },
    })
    slide.addText(`${c.n}`, {
      x, y: 1.55, w: cardW, h: 0.6,
      fontFace: FONT, fontSize: 30, bold: true, color: KIND_COLOR[c.kind], align: 'center',
    })
    slide.addText(`${c.kind} 요구사항`, {
      x, y: 2.18, w: cardW, h: 0.3,
      fontFace: FONT, fontSize: 11, color: C.gray, align: 'center',
    })
  })

  slide.addText(
    `제안요청서에서 총 ${reqs.length}건의 요구사항을 식별했습니다. 각 요구사항에 대한 대응 방안은 다음 장에서 근거 페이지와 함께 제시합니다.`,
    { x: MARGIN, y: 3.0, w: BODY_W, h: 0.6, fontFace: FONT, fontSize: 12, color: C.ink, lineSpacingMultiple: 1.4 }
  )
}

/** 요구사항이 많으면 한 슬라이드에 다 들어가지 않으므로 나눠 담는다. */
const ROWS_PER_SLIDE = 5

function addRequirementResponses(pptx: Pptx, data: ProposalFormData) {
  const reqs = data.rfp.requirements
  if (reqs.length === 0) {
    const slide = contentSlide(pptx, '요구사항 대응 방안', '03  RESPONSE')
    slide.addText('제안요청서에서 요구사항을 식별하지 못했습니다.', {
      x: MARGIN, y: 1.5, w: BODY_W, h: 0.4, fontFace: FONT, fontSize: 12, color: C.gray,
    })
    return
  }

  const pages = Math.ceil(reqs.length / ROWS_PER_SLIDE)
  for (let p = 0; p < pages; p++) {
    const chunk = reqs.slice(p * ROWS_PER_SLIDE, (p + 1) * ROWS_PER_SLIDE)
    const title = pages > 1 ? `요구사항 대응 방안 (${p + 1}/${pages})` : '요구사항 대응 방안'
    const slide = contentSlide(pptx, title, '03  RESPONSE')

    const rows = [
      tableHeader(['ID', '구분', 'RFP 요구사항', '대응 방안', '근거']),
      ...chunk.map((r: RfpRequirementItem, i: number) => [
        { text: `R-${p * ROWS_PER_SLIDE + i + 1}`, options: { bold: true, color: C.brand, align: 'center' as const } },
        { text: r.kind, options: { color: KIND_COLOR[r.kind], align: 'center' as const } },
        { text: r.requirement, options: { color: C.ink } },
        { text: STANDARD_RESPONSE[r.kind], options: { color: C.gray } },
        { text: `${r.page}p`, options: { color: C.gray, align: 'center' as const } },
      ]),
    ]

    slide.addTable(rows, {
      x: MARGIN, y: 1.3, w: BODY_W,
      colW: [0.6, 0.75, 3.5, 3.55, 0.5],
      fontFace: FONT, fontSize: 9,
      border: { type: 'solid', color: C.line, pt: 1 },
      valign: 'middle',
      autoPage: false,
    })
  }
}

function addEvaluation(pptx: Pptx, data: ProposalFormData) {
  const evals = [...data.rfp.evaluations].sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
  if (evals.length === 0) return

  const slide = contentSlide(pptx, '평가 기준별 대응', '04  EVALUATION')
  const total = evals.reduce((s, e) => s + (e.score ?? 0), 0)

  const rows = [
    tableHeader(['평가 항목', '배점', '대응 근거']),
    ...evals.map((e) => [
      { text: e.label, options: { bold: true, color: C.brandDeep } },
      { text: e.score !== null ? `${e.score}점` : '-', options: { align: 'center' as const, color: C.ink } },
      { text: '본 제안서의 해당 장에서 근거와 함께 제시', options: { color: C.gray } },
    ]),
  ]

  slide.addTable(rows, {
    x: MARGIN, y: 1.3, w: BODY_W,
    colW: [4.0, 1.0, BODY_W - 5.0],
    fontFace: FONT, fontSize: 10,
    border: { type: 'solid', color: C.line, pt: 1 },
    valign: 'middle',
    autoPage: false,
  })

  if (total > 0) {
    slide.addText(`확인된 배점 합계 ${total}점 · 배점이 높은 항목을 우선 순위로 제안 내용을 구성했습니다.`, {
      x: MARGIN, y: H - 0.85, w: BODY_W, h: 0.35,
      fontFace: FONT, fontSize: 10, color: C.gray,
    })
  }
}

function addSchedule(pptx: Pptx, data: ProposalFormData) {
  const slide = contentSlide(pptx, '추진 일정', '05  SCHEDULE')

  const phases = [
    { phase: 'Phase 1', period: '착수 ~ 4주', tasks: '착수 보고, 요구사항 상세 분석 및 확정, 현행 진단' },
    { phase: 'Phase 2', period: '5 ~ 12주', tasks: '핵심 기능 개발, 외부 시스템 연동, 주간 진도 보고' },
    { phase: 'Phase 3', period: '13 ~ 18주', tasks: '통합 테스트, 성능·보안 점검, 데이터 이관 및 검증' },
    { phase: 'Phase 4', period: '19주 ~ 종료', tasks: '사용자 교육, 오픈 및 안정화, 운영 이관, 완료 보고' },
  ]

  const rows = [
    tableHeader(['단계', '기간', '주요 활동']),
    ...phases.map((p) => [
      { text: p.phase, options: { bold: true, color: C.brand, align: 'center' as const } },
      { text: p.period, options: { align: 'center' as const, color: C.ink } },
      { text: p.tasks, options: { color: C.ink } },
    ]),
  ]

  slide.addTable(rows, {
    x: MARGIN, y: 1.35, w: BODY_W,
    colW: [1.3, 1.7, BODY_W - 3.0],
    rowH: 0.5,
    fontFace: FONT, fontSize: 10,
    border: { type: 'solid', color: C.line, pt: 1 },
    valign: 'middle',
  })

  slide.addText(
    `※ 총 사업 기간 ${data.rfp.duration || '(제안요청서 미명시)'} 기준의 표준 일정이며, 착수 단계에서 협의하여 확정합니다.`,
    { x: MARGIN, y: H - 0.85, w: BODY_W, h: 0.35, fontFace: FONT, fontSize: 10, color: C.gray }
  )
}

function addCompany(pptx: Pptx, data: ProposalFormData) {
  const { intro, coreCompetencies } = data.companyProfile
  const slide = contentSlide(pptx, '제안사 소개', '06  COMPANY')

  slide.addText(intro || `${data.companyName}는 유사 사업 수행 경험을 바탕으로 본 사업을 수행합니다.`, {
    x: MARGIN, y: 1.35, w: BODY_W, h: 0.9,
    fontFace: FONT, fontSize: 12, color: C.ink, lineSpacingMultiple: 1.45, valign: 'top',
  })

  const items = coreCompetencies.filter((c) => c.text.trim().length > 0)
  if (items.length > 0) {
    slide.addText('핵심 역량', {
      x: MARGIN, y: 2.4, w: BODY_W, h: 0.3,
      fontFace: FONT, fontSize: 13, bold: true, color: C.brandDeep,
    })
    slide.addText(
      items.map((c) => ({ text: c.text, options: { breakLine: true, bullet: { code: '25AA' } } })),
      { x: MARGIN + 0.1, y: 2.75, w: BODY_W - 0.2, h: 2.1, fontFace: FONT, fontSize: 11, color: C.ink, lineSpacingMultiple: 1.5 }
    )
  }
}

function addTrackRecord(pptx: Pptx, data: ProposalFormData) {
  const records = data.companyProfile.trackRecords.filter((r) => r.client.trim() || r.description.trim())
  if (records.length === 0) return

  const slide = contentSlide(pptx, '주요 수행 실적', '07  TRACK RECORD')

  const rows = [
    tableHeader(['고객사 / 프로젝트', '연도', '개요 및 성과']),
    ...records.slice(0, 6).map((r) => [
      { text: r.client || '-', options: { bold: true, color: C.brand } },
      { text: r.year || '-', options: { align: 'center' as const, color: C.ink } },
      { text: r.description || '-', options: { color: C.ink } },
    ]),
  ]

  slide.addTable(rows, {
    x: MARGIN, y: 1.35, w: BODY_W,
    colW: [2.6, 1.0, BODY_W - 3.6],
    fontFace: FONT, fontSize: 10,
    border: { type: 'solid', color: C.line, pt: 1 },
    valign: 'middle',
    autoPage: false,
  })
}

function addClosing(pptx: Pptx, data: ProposalFormData) {
  const slide = pptx.addSlide()
  slide.background = { color: C.brandDeep }
  slide.addText('감사합니다', {
    x: 0, y: 2.2, w: W, h: 0.8,
    fontFace: FONT, fontSize: 30, bold: true, color: C.white, align: 'center',
  })
  slide.addText(data.companyName, {
    x: 0, y: 3.0, w: W, h: 0.4,
    fontFace: FONT, fontSize: 13, color: 'A6CEEE', align: 'center',
  })
}

// ── 메인 ─────────────────────────────────────────────────────────────────────

export async function generateProposalPptx(data: ProposalFormData): Promise<Buffer> {
  const PptxGenJS = (await import('pptxgenjs')).default
  const pptx = new PptxGenJS()

  pptx.layout = 'LAYOUT_16x9'
  pptx.author = data.companyName
  pptx.company = data.companyName
  pptx.title = data.rfp.projectName || '제안서'

  const agenda = ['사업 개요', '요구사항 구성', '요구사항 대응 방안', '평가 기준별 대응', '추진 일정', '제안사 소개']
  if (data.companyProfile.trackRecords.some((r) => r.client.trim() || r.description.trim())) {
    agenda.push('주요 수행 실적')
  }

  addCover(pptx, data)
  addAgenda(pptx, agenda)
  addOverview(pptx, data)
  addRequirementSummary(pptx, data)
  addRequirementResponses(pptx, data)
  addEvaluation(pptx, data)
  addSchedule(pptx, data)
  addCompany(pptx, data)
  addTrackRecord(pptx, data)
  addClosing(pptx, data)

  return (await pptx.write({ outputType: 'nodebuffer' })) as Buffer
}
