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

// 요구사항 유형별 표준 대응 문구. 사용자가 대응 방안을 직접 쓰지 않으므로,
// 최소한 유형에 맞는 서술이 들어가도록 한다 (발표 시 보완 전제).
const STANDARD_RESPONSE: Record<RequirementKind, string> = {
  기능: '요구 기능을 표준 모듈로 구현하고, 상세 설계 단계에서 고객사 업무 절차에 맞춰 화면·데이터 구조를 확정합니다.',
  비기능: '성능·보안·가용성 목표를 설계 기준으로 반영하고, 통합 테스트 단계에서 정량 지표로 충족 여부를 검증합니다.',
  기타: '제안요청서에 명시된 조건을 계약 및 수행 계획에 반영하여 준수합니다.',
}

// 요구사항 유형 색도 브랜드 팔레트에서 파생한다.
function kindColors(pal: BrandPalette): Record<RequirementKind, string> {
  return { 기능: pal.brand, 비기능: pal.gray, 기타: 'A8A8A8' }
}

type Pptx = import('pptxgenjs').default
type Slide = ReturnType<Pptx['addSlide']>

// ── 공통 레이아웃 ────────────────────────────────────────────────────────────

/**
 * 모든 본문 슬라이드에 공통으로 들어가는 제목 + 상단 규칙선.
 * angle을 넘기면 하단에 러닝 배너로 전략 축을 반복 노출한다 — 심사위원이 어느
 * 장을 펼치든 이 제안의 축이 무엇인지 다시 읽게 하는 장치다.
 */
function contentSlide(
  pptx: Pptx,
  pal: BrandPalette,
  title: string,
  eyebrow?: string,
  angle?: string
): Slide {
  const slide = pptx.addSlide()
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
  slide.addShape('rect', {
    x: MARGIN, y: eyebrow ? 1.0 : 0.88, w: BODY_W, h: 0.025,
    fill: { color: pal.brand },
  })

  if (angle) {
    slide.addShape('rect', {
      x: MARGIN, y: H - 0.42, w: 0.04, h: 0.16,
      fill: { color: pal.brand },
    })
    slide.addText(angle, {
      x: MARGIN + 0.14, y: H - 0.45, w: BODY_W - 0.14, h: 0.22,
      fontFace: FONT, fontSize: 9, color: pal.gray,
    })
  }

  return slide
}

function tableHeader(pal: BrandPalette, labels: string[]) {
  return labels.map((text) => ({
    text,
    options: { bold: true, color: pal.paper, fill: { color: pal.brandDeep }, align: 'center' as const },
  }))
}

// ── 슬라이드 ─────────────────────────────────────────────────────────────────

function addCover(pptx: Pptx, pal: BrandPalette, data: ProposalFormData) {
  const slide = pptx.addSlide()
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

  // 표지에서부터 축을 선언한다. 표지·목차·본문 러닝 배너가 같은 말을 반복하게 된다.
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

function addAgenda(pptx: Pptx, pal: BrandPalette, data: ProposalFormData, sections: string[]) {
  const angle = data.winTheme?.angle
  const slide = contentSlide(pptx, pal, '목차', 'AGENDA', angle)

  // 목차 첫 줄에서 문서 전체의 축을 먼저 선언한다.
  const top = angle ? 1.55 : 1.35
  if (angle) {
    slide.addText(`본 제안서는 '${angle}'을 축으로 구성했습니다.`, {
      x: MARGIN + 0.15, y: 1.2, w: BODY_W - 0.3, h: 0.3,
      fontFace: FONT, fontSize: 12, bold: true, color: pal.brand,
    })
  }

  slide.addText(
    sections.map((s, i) => ({
      text: `${String(i + 1).padStart(2, '0')}   ${s}`,
      options: { breakLine: true, fontSize: 14, color: pal.ink, bold: false },
    })),
    { x: MARGIN + 0.15, y: top, w: BODY_W - 0.3, h: 3.4, fontFace: FONT, lineSpacingMultiple: 1.9 }
  )
}

// 제안 핵심 메시지 — 목차 바로 뒤에 두어 심사위원이 가장 먼저 읽게 한다.
function addWinTheme(pptx: Pptx, pal: BrandPalette, data: ProposalFormData) {
  const theme = data.winTheme
  if (!theme || !theme.headline.trim()) return

  const slide = contentSlide(pptx, pal, '제안 핵심 메시지', 'WIN THEME', theme.angle)

  slide.addShape('rect', { x: MARGIN, y: 1.35, w: 0.05, h: 1.4, fill: { color: pal.brand } })
  slide.addText(theme.headline, {
    x: MARGIN + 0.3, y: 1.35, w: BODY_W - 0.3, h: 1.4,
    fontFace: FONT, fontSize: 20, bold: true, color: pal.brandDeep,
    lineSpacingMultiple: 1.35, valign: 'top',
  })

  // 이 방향이 어디서 나왔는지 — 전부 고객이 제안요청서에 직접 쓴 문장이다.
  const evidence = theme.evidence.slice(0, 4)
  if (evidence.length > 0) {
    slide.addText('제안요청서 근거', {
      x: MARGIN + 0.3, y: 2.95, w: BODY_W - 0.3, h: 0.25,
      fontFace: FONT, fontSize: 10, bold: true, color: pal.brand,
    })
    slide.addText(
      evidence.map((e) => ({
        text: `${e.text}${e.page > 0 ? ` (${e.page}p)` : ''}`,
        options: { breakLine: true, bullet: { code: '25AA' } },
      })),
      {
        x: MARGIN + 0.4, y: 3.25, w: BODY_W - 0.4, h: 1.5,
        fontFace: FONT, fontSize: 10, color: pal.gray, lineSpacingMultiple: 1.4,
      }
    )
  }
}

function addOverview(pptx: Pptx, pal: BrandPalette, data: ProposalFormData) {
  const angle = data.winTheme?.angle
  const slide = contentSlide(pptx, pal, '사업 개요', '01  OVERVIEW', angle)
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
    x: MARGIN, y: 1.35, w: BODY_W,
    colW: [2.4, BODY_W - 2.4],
    rowH: 0.42,
    fontFace: FONT, fontSize: 11,
    border: { type: 'solid', color: pal.line, pt: 1 },
    valign: 'middle',
  })
}

function addRequirementSummary(pptx: Pptx, pal: BrandPalette, data: ProposalFormData) {
  const angle = data.winTheme?.angle
  const slide = contentSlide(pptx, pal, '요구사항 구성', '02  REQUIREMENTS', angle)
  const reqs = data.rfp.requirements
  const kinds: RequirementKind[] = ['기능', '비기능', '기타']
  const kindColor = kindColors(pal)
  const counts = kinds.map((k) => ({ kind: k, n: reqs.filter((r) => r.kind === k).length }))

  // 유형별 카드
  const cardW = (BODY_W - 0.4) / 3
  counts.forEach((c, i) => {
    const x = MARGIN + i * (cardW + 0.2)
    slide.addShape('rect', {
      x, y: 1.4, w: cardW, h: 1.3,
      fill: { color: pal.band }, line: { color: pal.line, width: 1 },
    })
    slide.addText(`${c.n}`, {
      x, y: 1.55, w: cardW, h: 0.6,
      fontFace: FONT, fontSize: 30, bold: true, color: kindColor[c.kind], align: 'center',
    })
    slide.addText(`${c.kind} 요구사항`, {
      x, y: 2.18, w: cardW, h: 0.3,
      fontFace: FONT, fontSize: 11, color: pal.gray, align: 'center',
    })
  })

  slide.addText(
    `제안요청서에서 총 ${reqs.length}건의 요구사항을 식별했습니다. 각 요구사항에 대한 대응 방안은 다음 장에서 근거 페이지와 함께 제시합니다.`,
    { x: MARGIN, y: 3.0, w: BODY_W, h: 0.6, fontFace: FONT, fontSize: 12, color: pal.ink, lineSpacingMultiple: 1.4 }
  )
}

/** 요구사항이 많으면 한 슬라이드에 다 들어가지 않으므로 나눠 담는다. */
const ROWS_PER_SLIDE = 5

function addRequirementResponses(pptx: Pptx, pal: BrandPalette, data: ProposalFormData) {
  const angle = data.winTheme?.angle
  const reqs = data.rfp.requirements
  if (reqs.length === 0) {
    const slide = contentSlide(pptx, pal, '요구사항 대응 방안', '03  RESPONSE', angle)
    slide.addText('제안요청서에서 요구사항을 식별하지 못했습니다.', {
      x: MARGIN, y: 1.5, w: BODY_W, h: 0.4, fontFace: FONT, fontSize: 12, color: pal.gray,
    })
    return
  }

  const kindColor = kindColors(pal)
  const pages = Math.ceil(reqs.length / ROWS_PER_SLIDE)
  for (let p = 0; p < pages; p++) {
    const chunk = reqs.slice(p * ROWS_PER_SLIDE, (p + 1) * ROWS_PER_SLIDE)
    const title = pages > 1 ? `요구사항 대응 방안 (${p + 1}/${pages})` : '요구사항 대응 방안'
    const slide = contentSlide(pptx, pal, title, '03  RESPONSE', angle)

    const rows = [
      tableHeader(pal, ['ID', '구분', 'RFP 요구사항', '대응 방안', '근거']),
      ...chunk.map((r: RfpRequirementItem, i: number) => [
        { text: `R-${p * ROWS_PER_SLIDE + i + 1}`, options: { bold: true, color: pal.brand, align: 'center' as const } },
        { text: r.kind, options: { color: kindColor[r.kind], align: 'center' as const } },
        { text: r.requirement, options: { color: pal.ink } },
        { text: STANDARD_RESPONSE[r.kind], options: { color: pal.gray } },
        { text: `${r.page}p`, options: { color: pal.gray, align: 'center' as const } },
      ]),
    ]

    slide.addTable(rows, {
      x: MARGIN, y: 1.3, w: BODY_W,
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

  const slide = contentSlide(pptx, pal, '평가 기준별 대응', '04  EVALUATION', angle)
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
    x: MARGIN, y: 1.3, w: BODY_W,
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

function addSchedule(pptx: Pptx, pal: BrandPalette, data: ProposalFormData) {
  const angle = data.winTheme?.angle
  const slide = contentSlide(pptx, pal, '추진 일정', '05  SCHEDULE', angle)

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
    x: MARGIN, y: 1.35, w: BODY_W,
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
  const slide = contentSlide(pptx, pal, '제안사 소개', '06  COMPANY', angle)

  slide.addText(intro || `${data.companyName}는 유사 사업 수행 경험을 바탕으로 본 사업을 수행합니다.`, {
    x: MARGIN, y: 1.35, w: BODY_W, h: 0.9,
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

  const slide = contentSlide(pptx, pal, '주요 수행 실적', '07  TRACK RECORD', angle)

  const rows = [
    tableHeader(pal, ['고객사 / 프로젝트', '연도', '개요 및 성과']),
    ...records.slice(0, 6).map((r) => [
      { text: r.client || '-', options: { bold: true, color: pal.brand } },
      { text: r.year || '-', options: { align: 'center' as const, color: pal.ink } },
      { text: r.description || '-', options: { color: pal.ink } },
    ]),
  ]

  slide.addTable(rows, {
    x: MARGIN, y: 1.35, w: BODY_W,
    colW: [2.6, 1.0, BODY_W - 3.6],
    fontFace: FONT, fontSize: 10,
    border: { type: 'solid', color: pal.line, pt: 1 },
    valign: 'middle',
    autoPage: false,
  })
}

function addClosing(pptx: Pptx, pal: BrandPalette, data: ProposalFormData) {
  const slide = pptx.addSlide()
  slide.background = { color: pal.brandDark }
  slide.addText('감사합니다', {
    x: 0, y: 2.2, w: W, h: 0.8,
    fontFace: FONT, fontSize: 30, bold: true, color: pal.paper, align: 'center',
  })
  slide.addText(data.companyName, {
    x: 0, y: 3.0, w: W, h: 0.4,
    fontFace: FONT, fontSize: 13, color: pal.brandPale, align: 'center',
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

  const agenda = [...(data.winTheme?.headline.trim() ? ['제안 핵심 메시지'] : []), '사업 개요', '요구사항 구성', '요구사항 대응 방안', '평가 기준별 대응', '추진 일정', '제안사 소개']
  if (data.companyProfile.trackRecords.some((r) => r.client.trim() || r.description.trim())) {
    agenda.push('주요 수행 실적')
  }

  addCover(pptx, pal, data)
  addAgenda(pptx, pal, data, agenda)
  addWinTheme(pptx, pal, data)
  addOverview(pptx, pal, data)
  addRequirementSummary(pptx, pal, data)
  addRequirementResponses(pptx, pal, data)
  addEvaluation(pptx, pal, data)
  addSchedule(pptx, pal, data)
  addCompany(pptx, pal, data)
  addTrackRecord(pptx, pal, data)
  addClosing(pptx, pal, data)

  return (await pptx.write({ outputType: 'nodebuffer' })) as Buffer
}
