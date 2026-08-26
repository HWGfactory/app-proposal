import {
  Document, Paragraph, TextRun, AlignmentType,
  Table, TableRow, TableCell, WidthType, ShadingType,
  BorderStyle, convertInchesToTwip,
  Footer, PageNumber, Header,
  SectionType,
} from 'docx'
import type { ProposalCategory, ProposalFormData, SectionId } from '@/types/proposal'
import { COST_ITEM_CATEGORY_LABEL } from '@/types/proposal'
import { calcEstimateTotals, costAmount, formatWon, laborAmount } from '@/lib/estimate'

// ─── 색상 팔레트 ──────────────────────────────────────────────────────────────
const C = {
  brandDeep:  '0F1E5C',
  brandMain:  '3B5BDB',
  brandLight: 'E0E9FF',
  brandMid:   '7B93E0',
  darkText:   '1A1A2E',
  grayText:   '6B7280',
  grayLine:   'E5E7EB',
  white:      'FFFFFF',
  accentGreen:'0D9488',
  accentAmber:'D97706',
  accentViolet:'7C3AED',
  accentRose: 'DB2777',
  tableBand:  'F8F9FC',
}

// docx.js의 spacing/indent/border는 트윕(1pt = 20trip) 단위지만, TextRun.size는
// 하프포인트(1pt = 2 half-points) 단위다. 이 둘을 pt() 하나로 같이 써서 폰트 크기가
// 실제 의도한 값의 10배로 부풀려지던 버그가 있었다 — 반드시 구분해서 사용할 것.
const pt  = (n: number) => n * 20
const halfPt = (n: number) => n * 2
const twip = convertInchesToTwip

// 본문 섹션의 실제 인쇄 가능 너비(twip). docx 기본 용지는 A4(11906twip)이며
// 좌우 여백은 아래 buildXXX 섹션 설정과 반드시 일치해야 한다 — 여기서 벗어나면
// 표의 gridCol 합이 여백을 침범해 표 전체가 오른쪽으로 밀려 보이는 문제가 생긴다.
const PAGE_WIDTH = 11906
const CONTENT_WIDTH = PAGE_WIDTH - twip(1.4) - twip(1.2)

// 비율만 맞춰 적은 widths 배열(합계 상관없음)을 실제 인쇄 가능 너비에 맞게 재배분한다.
function scaleWidths(widths: number[]): number[] {
  const total = widths.reduce((sum, w) => sum + w, 0)
  const scale = CONTENT_WIDTH / total
  return widths.map((w) => Math.round(w * scale))
}

// ── TextRun 헬퍼 ──────────────────────────────────────────────────────────────
const TR = (text: string, opts: { bold?: boolean; size?: number; color?: string } = {}) =>
  new TextRun({ text, bold: opts.bold ?? false, size: halfPt(opts.size ?? 10), color: opts.color ?? C.darkText })

// ── 단락 헬퍼 ────────────────────────────────────────────────────────────────
function spacer(n = 1): Paragraph[] {
  return Array.from({ length: n }, () =>
    new Paragraph({ children: [TR('')], spacing: { after: pt(4) } })
  )
}

function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    children: [TR(text, { bold: true, size: 13, color: C.brandMain })],
    border: { left: { style: BorderStyle.THICK, size: 24, color: C.brandMain, space: 8 } },
    spacing: { before: pt(20), after: pt(8) },
    indent: { left: twip(0.15) },
  })
}

function subHeading(text: string): Paragraph {
  return new Paragraph({
    children: [TR(text, { bold: true, size: 11, color: C.darkText })],
    spacing: { before: pt(12), after: pt(6) },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.grayLine } },
  })
}

function bodyPara(text: string): Paragraph {
  return new Paragraph({
    children: [TR(text)],
    spacing: { line: 360, after: pt(4) },
  })
}

function bullet(text: string, color = C.brandMain): Paragraph {
  return new Paragraph({
    children: [
      TR('▪  ', { bold: true, color }),
      TR(text),
    ],
    spacing: { after: pt(4) },
    indent: { left: twip(0.2) },
  })
}

function checkItem(text: string): Paragraph {
  return new Paragraph({
    children: [
      TR('✓  ', { bold: true, color: C.accentGreen }),
      TR(text),
    ],
    spacing: { after: pt(4) },
    indent: { left: twip(0.2) },
  })
}

// ── 테이블 헬퍼 ──────────────────────────────────────────────────────────────
function tableBorders() {
  return {
    top:              { style: BorderStyle.SINGLE, size: 6, color: C.grayLine },
    bottom:           { style: BorderStyle.SINGLE, size: 6, color: C.grayLine },
    left:             { style: BorderStyle.SINGLE, size: 6, color: C.grayLine },
    right:            { style: BorderStyle.SINGLE, size: 6, color: C.grayLine },
    insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: C.grayLine },
    insideVertical:   { style: BorderStyle.SINGLE, size: 4, color: C.grayLine },
  }
}

function infoBox(label: string, value: string): Table {
  const cell = (txt: string, bold: boolean, fill: string, w: number) =>
    new TableCell({
      width: { size: w, type: WidthType.DXA },
      shading: { fill, type: ShadingType.CLEAR },
      children: [new Paragraph({
        children: [TR(txt, { bold, size: 9, color: bold ? C.brandMain : C.darkText })],
        spacing: { before: pt(5), after: pt(5) },
        indent: { left: twip(0.1) },
      })],
    })
  const widths = scaleWidths([2400, 7600])
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: widths,
    rows: [new TableRow({ children: [cell(label, true, C.brandLight, widths[0]), cell(value, false, C.white, widths[1])] })],
    borders: {
      top:              { style: BorderStyle.SINGLE, size: 6, color: C.grayLine },
      bottom:           { style: BorderStyle.SINGLE, size: 6, color: C.grayLine },
      left:             { style: BorderStyle.THICK,  size: 16, color: C.brandMain },
      right:            { style: BorderStyle.SINGLE, size: 6, color: C.grayLine },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: C.grayLine },
      insideVertical:   { style: BorderStyle.SINGLE, size: 4, color: C.grayLine },
    },
  })
}

function twoColTable(rows: [string, string][]): Table {
  const widths = scaleWidths([3000, 7000])
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: widths,
    rows: rows.map(([label, value], i) =>
      new TableRow({
        children: [
          new TableCell({
            width: { size: widths[0], type: WidthType.DXA },
            shading: { fill: i % 2 === 0 ? C.brandLight : C.tableBand, type: ShadingType.CLEAR },
            children: [new Paragraph({
              children: [TR(label, { bold: true, size: 9, color: C.brandDeep })],
              spacing: { before: pt(6), after: pt(6) },
              indent: { left: twip(0.1) },
            })],
          }),
          new TableCell({
            width: { size: widths[1], type: WidthType.DXA },
            shading: { fill: C.white, type: ShadingType.CLEAR },
            children: [new Paragraph({
              children: [TR(value, { size: 10 })],
              spacing: { before: pt(6), after: pt(6) },
              indent: { left: twip(0.1) },
            })],
          }),
        ],
      })
    ),
    borders: tableBorders(),
  })
}

function milestoneTable(items: { phase: string; period: string; tasks: string }[]): Table {
  const widths = scaleWidths([1800, 1500, 6700])
  const headers = ['단계', '기간', '주요 활동']

  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) =>
      new TableCell({
        width: { size: widths[i], type: WidthType.DXA },
        shading: { fill: C.brandDeep, type: ShadingType.CLEAR },
        children: [new Paragraph({
          children: [TR(h, { bold: true, size: 9, color: C.white })],
          alignment: AlignmentType.CENTER,
          spacing: { before: pt(6), after: pt(6) },
        })],
      })
    ),
  })

  const dataRows = items.map((m, i) =>
    new TableRow({
      children: [
        new TableCell({
          width: { size: widths[0], type: WidthType.DXA },
          shading: { fill: i % 2 === 0 ? C.brandLight : C.white, type: ShadingType.CLEAR },
          children: [new Paragraph({
            children: [TR(m.phase, { bold: true, size: 9, color: C.brandMain })],
            spacing: { before: pt(6), after: pt(6) },
            indent: { left: twip(0.05) },
          })],
        }),
        new TableCell({
          width: { size: widths[1], type: WidthType.DXA },
          shading: { fill: i % 2 === 0 ? C.tableBand : C.white, type: ShadingType.CLEAR },
          children: [new Paragraph({
            children: [TR(m.period, { size: 9, color: C.grayText })],
            alignment: AlignmentType.CENTER,
            spacing: { before: pt(6), after: pt(6) },
          })],
        }),
        new TableCell({
          width: { size: widths[2], type: WidthType.DXA },
          shading: { fill: i % 2 === 0 ? C.tableBand : C.white, type: ShadingType.CLEAR },
          children: [new Paragraph({
            children: [TR(m.tasks, { size: 9 })],
            spacing: { before: pt(6), after: pt(6) },
            indent: { left: twip(0.05) },
          })],
        }),
      ],
    })
  )

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: widths,
    rows: [headerRow, ...dataRows],
    borders: tableBorders(),
  })
}

// ── 견적 테이블 헬퍼 ─────────────────────────────────────────────────────────
function headerCell(text: string, width: number, fill: string = C.brandDeep): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: { fill, type: ShadingType.CLEAR },
    children: [new Paragraph({
      children: [TR(text, { bold: true, size: 9, color: C.white })],
      alignment: AlignmentType.CENTER,
      spacing: { before: pt(6), after: pt(6) },
    })],
  })
}

function bodyCell(text: string, width: number, opts: { align?: (typeof AlignmentType)[keyof typeof AlignmentType]; fill?: string; bold?: boolean; color?: string } = {}): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: { fill: opts.fill ?? C.white, type: ShadingType.CLEAR },
    children: [new Paragraph({
      children: [TR(text, { size: 9, bold: opts.bold, color: opts.color })],
      alignment: opts.align ?? AlignmentType.LEFT,
      spacing: { before: pt(6), after: pt(6) },
      indent: opts.align ? undefined : { left: twip(0.05) },
    })],
  })
}

function laborEstimateTable(data: ProposalFormData): Table {
  const items = data.estimate.laborItems
  const widths = scaleWidths([2400, 1400, 1600, 2100, 2500])
  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      headerCell('역할', widths[0]),
      headerCell('등급', widths[1]),
      headerCell('투입공수(M/M)', widths[2]),
      headerCell('월 단가', widths[3]),
      headerCell('금액', widths[4]),
    ],
  })
  const dataRows = items.map((it, i) => {
    const fill = i % 2 === 0 ? C.tableBand : C.white
    return new TableRow({
      children: [
        bodyCell(it.role || '-', widths[0], { fill }),
        bodyCell(it.grade, widths[1], { align: AlignmentType.CENTER, fill }),
        bodyCell(`${it.months} M/M`, widths[2], { align: AlignmentType.CENTER, fill }),
        bodyCell(formatWon(it.monthlyRate), widths[3], { align: AlignmentType.RIGHT, fill }),
        bodyCell(formatWon(laborAmount(it)), widths[4], { align: AlignmentType.RIGHT, fill, bold: true, color: C.brandMain }),
      ],
    })
  })
  const laborTotal = items.reduce((s, i) => s + laborAmount(i), 0)
  const totalRow = new TableRow({
    children: [
      new TableCell({
        width: { size: widths[0] + widths[1] + widths[2] + widths[3], type: WidthType.DXA },
        columnSpan: 4,
        shading: { fill: C.brandLight, type: ShadingType.CLEAR },
        children: [new Paragraph({
          children: [TR('인건비 소계', { bold: true, size: 9, color: C.brandDeep })],
          alignment: AlignmentType.RIGHT,
          spacing: { before: pt(6), after: pt(6) },
          indent: { right: twip(0.1) },
        })],
      }),
      bodyCell(formatWon(laborTotal), widths[4], { align: AlignmentType.RIGHT, fill: C.brandLight, bold: true, color: C.brandDeep }),
    ],
  })

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: widths,
    rows: [headerRow, ...dataRows, totalRow],
    borders: tableBorders(),
  })
}

function costEstimateTable(data: ProposalFormData): Table {
  const items = data.estimate.costItems
  const widths = scaleWidths([1600, 3400, 1200, 1800, 2000])
  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      headerCell('구분', widths[0]),
      headerCell('품목명', widths[1]),
      headerCell('수량', widths[2]),
      headerCell('단가', widths[3]),
      headerCell('금액', widths[4]),
    ],
  })
  const dataRows = items.map((it, i) => {
    const fill = i % 2 === 0 ? C.tableBand : C.white
    return new TableRow({
      children: [
        bodyCell(COST_ITEM_CATEGORY_LABEL[it.category], widths[0], { align: AlignmentType.CENTER, fill }),
        bodyCell(it.name || '-', widths[1], { fill }),
        bodyCell(String(it.quantity), widths[2], { align: AlignmentType.CENTER, fill }),
        bodyCell(formatWon(it.unitPrice), widths[3], { align: AlignmentType.RIGHT, fill }),
        bodyCell(formatWon(costAmount(it)), widths[4], { align: AlignmentType.RIGHT, fill, bold: true, color: C.brandMain }),
      ],
    })
  })
  const costTotal = items.reduce((s, i) => s + costAmount(i), 0)
  const totalRow = new TableRow({
    children: [
      new TableCell({
        width: { size: widths[0] + widths[1] + widths[2] + widths[3], type: WidthType.DXA },
        columnSpan: 4,
        shading: { fill: C.brandLight, type: ShadingType.CLEAR },
        children: [new Paragraph({
          children: [TR('항목 비용 소계', { bold: true, size: 9, color: C.brandDeep })],
          alignment: AlignmentType.RIGHT,
          spacing: { before: pt(6), after: pt(6) },
          indent: { right: twip(0.1) },
        })],
      }),
      bodyCell(formatWon(costTotal), widths[4], { align: AlignmentType.RIGHT, fill: C.brandLight, bold: true, color: C.brandDeep }),
    ],
  })

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: widths,
    rows: [headerRow, ...dataRows, totalRow],
    borders: tableBorders(),
  })
}

function estimateSummaryTable(data: ProposalFormData): Table {
  const t = calcEstimateTotals(data.estimate)
  const widths = scaleWidths([6000, 4000])
  const row = (label: string, value: string, opts: { fill?: string; bold?: boolean; size?: number; color?: string } = {}) =>
    new TableRow({
      children: [
        new TableCell({
          width: { size: widths[0], type: WidthType.DXA },
          shading: { fill: opts.fill ?? C.white, type: ShadingType.CLEAR },
          children: [new Paragraph({
            children: [TR(label, { bold: opts.bold, size: opts.size ?? 9, color: opts.color ?? C.darkText })],
            spacing: { before: pt(6), after: pt(6) },
            indent: { left: twip(0.1) },
          })],
        }),
        new TableCell({
          width: { size: widths[1], type: WidthType.DXA },
          shading: { fill: opts.fill ?? C.white, type: ShadingType.CLEAR },
          children: [new Paragraph({
            children: [TR(value, { bold: opts.bold, size: opts.size ?? 9, color: opts.color ?? C.darkText })],
            alignment: AlignmentType.RIGHT,
            spacing: { before: pt(6), after: pt(6) },
            indent: { right: twip(0.1) },
          })],
        }),
      ],
    })

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: widths,
    rows: [
      row('공급가액 합계 (인건비 + 항목 비용)', formatWon(t.supplyAmount)),
      row(`할인 (${data.estimate.discountRate}%)`, t.discountAmount > 0 ? `-${formatWon(t.discountAmount)}` : formatWon(0), { color: C.accentAmber }),
      row('할인 후 금액', formatWon(t.amountAfterDiscount)),
      row(`부가세 (VAT ${data.estimate.vatRate}%)`, formatWon(t.vatAmount)),
      row('총 합계 (VAT 포함)', formatWon(t.grandTotal), { fill: C.brandLight, bold: true, size: 12, color: C.brandDeep }),
    ],
    borders: tableBorders(),
  })
}

// ── 도입 전/후 비교 테이블 (기대 효과 섹션 전용) ────────────────────────────────
interface EffectMetric { metric: string; before: string; after: string; improvement: string }

function beforeAfterTable(items: EffectMetric[]): Table {
  const widths = scaleWidths([2200, 2600, 2600, 2400])
  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      headerCell('지표', widths[0]),
      headerCell('도입 전', widths[1]),
      headerCell('도입 후', widths[2]),
      headerCell('개선율', widths[3]),
    ],
  })
  const dataRows = items.map((it, i) => {
    const fill = i % 2 === 0 ? C.tableBand : C.white
    return new TableRow({
      children: [
        bodyCell(it.metric, widths[0], { fill, bold: true, color: C.brandMain }),
        bodyCell(it.before, widths[1], { fill, align: AlignmentType.CENTER }),
        bodyCell(it.after, widths[2], { fill, align: AlignmentType.CENTER }),
        bodyCell(it.improvement, widths[3], { fill, align: AlignmentType.CENTER, bold: true, color: C.accentGreen }),
      ],
    })
  })
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: widths,
    rows: [headerRow, ...dataRows],
    borders: tableBorders(),
  })
}

// ─── 섹션 빌더 ────────────────────────────────────────────────────────────────
// 문서 구성(순서·포함 여부) 설정에 따라 조립되는 단위. 각 함수는 최종 heading 문자열
// (예: "II. 현황 분석 및 문제점")을 받아 자체 sectionHeading부터 렌더링한다.
type AnyBlock = Paragraph | Table

const CATEGORY_LABEL: Record<ProposalCategory, string> = { AI: 'AI 솔루션', CLOUD: '클라우드 전환', ERP: 'ERP 구축' }

// ── I. 경영진 요약 ──
function buildExec(data: ProposalFormData, heading: string): AnyBlock[] {
  return [
    sectionHeading(heading),
    ...spacer(1),
    bodyPara(
      `${data.clientName}은 ${data.executiveSummary} ` +
      `본 제안서는 ${CATEGORY_LABEL[data.category]} 구축을 통해 이를 해결하는 최적의 방안을 담고 있습니다.`
    ),
    ...spacer(1),
    twoColTable([
      ['수신처',    data.clientName],
      ['제안사',    data.companyName],
      ['제안 분야', CATEGORY_LABEL[data.category]],
      ['예상 예산', data.projectBudget],
      ['사업 기간', data.projectDuration],
      ['작성일',    data.preparedDate],
    ]),
    ...spacer(2),
  ]
}

// ── II. 현황 분석 ──
function buildAIAnalysis(d: Extract<ProposalFormData, { category: 'AI' }>, heading: string): AnyBlock[] {
  return [
    sectionHeading(heading),
    ...spacer(1),
    subHeading('2.1 현재 운영 현황 개요'),
    bodyPara(`${d.clientName}는 ${d.clientIndustry} 업종으로, 현재 다음과 같은 운영상의 문제에 직면해 있습니다. 아래에서는 각 문제를 현상 · 원인 · 영향의 3단계로 나누어 분석합니다.`),
    ...spacer(1),
    subHeading('문제 ① · 현장 대응 지연 및 처리 편차'),
    bodyPara(`[현상] ${d.currentPainPoint}`),
    bodyPara('[원인] 상담·처리 업무 전반이 담당자의 수기 확인과 경험적 판단에 의존하고 있어, 동일한 유형의 문의라도 처리 시간과 결과 품질이 담당자별로 크게 달라집니다. 업무 매뉴얼과 과거 처리 이력이 시스템화되어 있지 않아 신규 인력의 숙련에도 상당한 시간이 소요됩니다.'),
    bodyPara(`[영향] 처리 편차는 고객 불만과 재문의로 이어져 전체 처리량을 다시 늘리는 악순환을 만들고, ${d.clientIndustry} 업종 특성상 응대 품질이 곧 고객 이탈률에 직접적인 영향을 미치는 만큼 방치할 경우 매출 손실로 이어질 수 있습니다.`),
    ...spacer(1),
    subHeading('문제 ② · 데이터 기반 의사결정 체계 미흡'),
    bodyPara('[현상] 상담·처리 이력이 축적되고는 있지만 정형화된 분석 없이 개별 조회 수준에 머물러 있어, 어떤 유형의 문의가 늘고 있는지와 어떤 응대가 재문의를 줄이는지에 대한 정량적 근거를 확보하지 못하고 있습니다.'),
    bodyPara('[원인] 데이터가 여러 시스템에 분산 저장되어 있고 통합 분석 체계가 부재하여, 의사결정에 필요한 지표를 산출하려면 매번 수작업 집계를 거쳐야 합니다.'),
    bodyPara('[영향] 경영진과 실무 관리자가 감(感)에 의존한 의사결정을 내릴 수밖에 없어 인력 배치·교육·프로세스 개선의 우선순위를 데이터로 뒷받침하지 못하고, 개선 효과 역시 사후 체감으로만 확인하는 상황이 반복되고 있습니다.'),
    ...spacer(1),
    subHeading('문제 ③ · 반복 업무 자동화 부재'),
    bodyPara('[현상] 문의 접수, 단순 조회, 정형화된 답변이 필요한 반복 업무까지 담당자가 직접 처리하고 있어, 실제 전문성이 필요한 고난도 상담에 투입할 시간이 부족합니다.'),
    bodyPara(`[원인] ${d.integrationSystems || '기존 업무 시스템'}과 연계된 자동 응대·분류 체계가 없어 모든 문의가 사람을 거쳐야만 처리되는 구조입니다.`),
    bodyPara('[영향] 반복 업무에 소요되는 시간만큼 인건비가 추가로 발생하고, 담당자 피로도 누적에 따른 오류율 상승과 이직률 증가라는 2차 비용까지 발생하고 있습니다.'),
    ...spacer(1),
    subHeading('2.2 AS-IS → TO-BE 개선 방향'),
    twoColTable([
      ['AI 활용 케이스',   d.aiUseCase],
      ['핵심 목표 KPI',    d.targetKPI],
      ['보유 데이터 자산', d.dataAssets || '프로젝트 착수 후 데이터 진단을 통해 확정'],
      ['연동 대상 시스템', d.integrationSystems || '요구사항 분석 단계에서 확정'],
      ...(d.complianceNote ? [['업종 컴플라이언스 요건', d.complianceNote] as [string, string]] : []),
    ]),
    ...spacer(2),
  ]
}

function buildCloudAnalysis(d: Extract<ProposalFormData, { category: 'CLOUD' }>, heading: string): AnyBlock[] {
  return [
    sectionHeading(heading),
    ...spacer(1),
    subHeading('2.1 현재 인프라 현황'),
    bodyPara(`${d.clientName}의 현재 IT 인프라 및 클라우드 전환 필요성을 다음과 같이 분석합니다.`),
    ...spacer(1),
    infoBox('현재 인프라', d.currentInfra),
    ...spacer(1),
    bullet('On-premise 운영으로 인한 높은 CAPEX 및 유지보수 비용'),
    bullet('급격한 트래픽 증가 대응 불가, 확장성 한계'),
    bullet('노후화된 시스템 장애 위험 및 비즈니스 연속성 위협'),
    bullet(`컴플라이언스 충족 어려움: ${d.complianceRequirements}`),
    ...spacer(2),
  ]
}

function buildERPAnalysis(d: Extract<ProposalFormData, { category: 'ERP' }>, heading: string): AnyBlock[] {
  return [
    sectionHeading(heading),
    ...spacer(1),
    subHeading('2.1 현재 업무 시스템 현황'),
    bodyPara(`${d.clientName}의 현재 업무 처리 시스템 현황을 다음과 같이 분석합니다.`),
    ...spacer(1),
    twoColTable([
      ['현재 사용 시스템',    d.currentSystem],
      ['임직원 규모',         d.companySize],
      ['핵심 업무 프로세스', d.businessProcess],
      ['데이터 이관 규모',   d.dataVolume],
    ]),
    ...spacer(1),
    bullet('부서 간 데이터 단절로 인한 정보 흐름 비효율'),
    bullet(`${d.currentSystem} 한계로 실시간 경영 가시성 부족`),
    bullet('수동 처리에 따른 오류·결산 지연·감사 추적 어려움'),
    ...spacer(2),
  ]
}

// ── III. 솔루션 제안 ──
function buildAISolution(d: Extract<ProposalFormData, { category: 'AI' }>, heading: string): AnyBlock[] {
  return [
    sectionHeading(heading),
    ...spacer(1),
    subHeading('3.1 핵심 AI 기술 구성'),
    bodyPara(`본 제안은 ${d.aiModel} 기술을 중심으로, ${d.clientName}의 ${d.aiUseCase} 문제를 해결하는 맞춤형 AI 솔루션을 제공합니다.`),
    ...spacer(1),
    bullet(`적용 AI 모델: ${d.aiModel}`),
    bullet(`파일럿 범위: ${d.pilotScope || '착수 협의 후 확정'}`),
    bullet(`연동 시스템: ${d.integrationSystems || '요구사항 분석 단계에서 확정'}`),
    ...spacer(1),
    subHeading('3.2 시스템 아키텍처 (3-Tier 구조)'),
    infoBox('데이터 수집 Layer',  `${d.dataAssets || '기존 보유 데이터'} → 전처리 파이프라인 → Feature Store`),
    bodyPara('원천 데이터를 정제·표준화하여 모델이 바로 학습·추론에 사용할 수 있는 형태로 변환하는 계층입니다. 데이터 품질이 곧 모델 성능으로 직결되므로, 결측치 처리와 이상치 탐지를 자동화된 파이프라인으로 상시 수행합니다.'),
    ...spacer(1),
    infoBox('AI 모델 Layer',       `${d.aiModel} → 학습·추론 서버 → 모델 레지스트리`),
    bodyPara('실제 학습과 추론이 이루어지는 핵심 계층으로, 모델 버전을 레지스트리로 관리하여 성능 저하 시 이전 버전으로 즉시 롤백할 수 있는 구조를 갖춥니다.'),
    ...spacer(1),
    infoBox('서비스 Layer',        `API Gateway → ${d.integrationSystems || '연동 대상 시스템'} 연동 → 대시보드·모니터링`),
    bodyPara('최종 사용자와 기존 업무 시스템이 실제로 마주하는 계층입니다. API Gateway를 통해 인증·트래픽 제어를 일원화하고, 운영 대시보드로 실시간 처리 현황을 상시 확인할 수 있습니다.'),
    ...spacer(1),
    subHeading('3.3 주요 기능 및 특장점'),
    subHeading('실시간 AI 추론 (Low-Latency Inference)'),
    bodyPara(`무엇을: 사용자 요청에 대해 응답 Latency 500ms 이내로 실시간 추론 결과를 반환합니다. 왜: ${d.aiUseCase} 업무는 응대 속도가 곧 고객 경험이므로 배치 처리가 아닌 실시간 처리 구조가 필수적입니다. 어떻게: 경량화된 추론 서버와 캐싱 계층을 결합해 동시 요청이 몰리는 상황에서도 목표 응답 속도를 유지합니다.`),
    checkItem('응답 Latency 500ms 이하 목표'),
    ...spacer(1),
    subHeading(`${d.integrationSystems || '기존 업무 시스템'} 원클릭 연동`),
    bodyPara(`무엇을: ${d.integrationSystems || '고객사의 기존 업무 시스템'}과 API 기반으로 연동하여 별도 화면 전환 없이 하나의 인터페이스에서 업무가 완결되도록 합니다. 왜: 담당자가 여러 시스템을 오가며 정보를 대조하는 과정에서 발생하는 시간 손실과 입력 오류를 근본적으로 제거하기 위함입니다. 어떻게: 표준 REST API와 웹훅을 활용해 기존 시스템의 데이터 구조를 변경하지 않고 연동합니다.`),
    checkItem('기존 시스템 무중단 연동'),
    ...spacer(1),
    subHeading('모델 성능 모니터링 및 자동 재학습'),
    bodyPara('무엇을: 운영 중인 모델의 정확도와 응답 품질을 상시 모니터링하고, 성능이 기준치 이하로 떨어지면 최신 데이터로 자동 재학습을 트리거합니다. 왜: 실제 운영 데이터의 패턴은 시간이 지나며 변화(Data Drift)하기 때문에, 최초 구축 시점의 성능을 방치하면 서비스 품질이 점진적으로 저하됩니다. 어떻게: 예측 결과와 실제 처리 결과를 비교하는 피드백 루프를 구성하고, 임계치 이탈 시 알림과 함께 재학습 파이프라인을 자동 실행합니다.'),
    checkItem('데이터 드리프트 자동 감지 및 알림'),
    ...spacer(1),
    subHeading('설명 가능한 AI (Explainable AI)'),
    bodyPara('무엇을: AI가 특정 응답이나 분류 결과를 도출한 근거를 사람이 이해할 수 있는 형태로 함께 제공합니다. 왜: 담당자와 고객 모두 결과가 나온 이유를 신뢰할 수 있어야 실제 업무에 도입할 수 있기 때문입니다. 어떻게: 판단 근거가 된 입력 요소를 시각적으로 하이라이트하고, 신뢰도 점수를 함께 표기합니다.'),
    checkItem('의사결정 근거 시각화 및 신뢰도 점수 제공'),
    ...spacer(1),
    subHeading('데이터 암호화 및 개인정보 보호'),
    bodyPara(`무엇을: 저장·전송 구간의 데이터를 암호화하고, ${d.complianceNote || '관련 개인정보 보호 규정'}을 준수하는 처리 방침을 적용합니다. 왜: 상담 데이터에는 민감한 개인정보가 포함될 수 있어 규정 준수는 선택이 아닌 필수 요건입니다. 어떻게: 전송 구간은 TLS, 저장 구간은 AES-256 암호화를 적용하고, 접근 권한을 역할 기반으로 통제합니다.`),
    checkItem(d.complianceNote || '개인정보 처리 방침 완전 준수'),
    ...spacer(1),
    subHeading('3.4 기술 선정 근거'),
    bodyPara(`본 제안은 ${d.aiModel} 기반 접근을 채택했습니다. 규칙 기반(Rule-based) 시스템은 구축이 빠르지만 예외 상황 대응력이 낮고, 완전 자체 개발 모델은 초기 데이터 확보와 학습 기간이 길어 일정 내 목표 달성이 어렵습니다. 반면 ${d.aiModel}은 검증된 사전학습 기반 위에서 ${d.clientName}의 도메인 데이터로 빠르게 특화할 수 있어, 목표 기간 내 핵심 목표 KPI(${d.targetKPI}) 달성 가능성이 가장 높다고 판단했습니다.`),
    twoColTable([
      ['구축 속도',   '사전학습 모델 활용으로 단기간 내 도메인 특화 가능'],
      ['예외 대응력', '규칙 기반 대비 다양한 문의 유형에 유연하게 대응 가능'],
      ['확장성',     '신규 케이스 추가 시 재학습만으로 대응, 규칙 재작성 불필요'],
    ]),
    ...spacer(2),
  ]
}

function buildCloudSolution(d: Extract<ProposalFormData, { category: 'CLOUD' }>, heading: string): AnyBlock[] {
  return [
    sectionHeading(heading),
    ...spacer(1),
    subHeading('3.1 마이그레이션 전략 (6R 방법론 적용)'),
    bodyPara(`${d.cloudProvider} 기반의 ${d.targetArchitecture} 아키텍처로 단계적 마이그레이션을 수행합니다.`),
    ...spacer(1),
    twoColTable([
      ['마이그레이션 범위', d.migrationScope],
      ['클라우드 공급사',   d.cloudProvider],
      ['목표 아키텍처',     d.targetArchitecture],
      ['최적화 목표',       d.optimizationGoal],
    ]),
    ...spacer(1),
    subHeading('3.2 아키텍처 설계 방향'),
    checkItem(`${d.targetArchitecture} 기반의 확장 가능한 인프라 구성`),
    checkItem('멀티 AZ 구성으로 고가용성 99.9% 이상 보장'),
    checkItem(`${d.complianceRequirements} 컴플라이언스 자동화 적용`),
    checkItem('비용 최적화: Reserved Instance·Savings Plans 활용 및 Auto Scaling 정책 수립'),
    checkItem('IaC(Terraform) 기반 인프라 전체 코드화 및 배포 자동화'),
    ...spacer(1),
    subHeading('3.3 DR / 백업 정책'),
    bodyPara(`재해복구(DR) 및 백업 전략: ${d.disasterRecovery}`),
    ...spacer(2),
  ]
}

function buildERPSolution(d: Extract<ProposalFormData, { category: 'ERP' }>, heading: string): AnyBlock[] {
  return [
    sectionHeading(heading),
    ...spacer(1),
    subHeading(`3.1 도입 범위: ${d.erpScope}`),
    bodyPara(`통합 ERP 시스템을 구축합니다. 커스터마이징 수준: ${d.customizationLevel}`),
    ...spacer(1),
    checkItem(`${d.erpScope} 모듈 통합 구현`),
    checkItem(`기존 ${d.currentSystem} 데이터 이관 및 병행 운영`),
    checkItem(`임직원 ${d.companySize} 대상 단계적 사용자 교육`),
    checkItem(`Go-Live 목표: ${d.goLiveDate}`),
    ...spacer(1),
    subHeading('3.2 핵심 기능'),
    infoBox('재무 / 회계',      '실시간 결산, 예산 관리, 세무신고 자동화'),
    ...spacer(1),
    infoBox('구매 / SCM',       '발주→입고→재고 End-to-End 가시성, 공급사 포털'),
    ...spacer(1),
    infoBox('인사 / 급여',      `${d.companySize} 최적화 HR 모듈, 전자 근태 연동`),
    ...spacer(1),
    infoBox('경영 대시보드',    '실시간 KPI 모니터링, 맞춤형 경영 리포트'),
    ...spacer(2),
  ]
}

// ── IV. 기대 효과 ──
function buildAIEffect(d: Extract<ProposalFormData, { category: 'AI' }>, heading: string): AnyBlock[] {
  return [
    sectionHeading(heading),
    ...spacer(1),
    bodyPara(`본 솔루션 도입을 통해 정량적 성과와 정성적 변화를 함께 기대할 수 있습니다. 아래 지표는 핵심 목표 KPI(${d.targetKPI})를 기준으로 산출한 목표치이며, 실제 성과는 파일럿 운영 결과에 따라 보정됩니다.`),
    ...spacer(1),
    subHeading('4.1 정량적 기대 효과'),
    beforeAfterTable([
      { metric: '평균 처리 시간',   before: '기존 대비 높음', after: '대폭 단축',   improvement: '목표 달성 시 70%↓' },
      { metric: '자동 처리율',      before: '0%',            after: '70% 이상',    improvement: '신규 확보' },
      { metric: '오류·재문의율',    before: '기준치',        after: '30% 개선',    improvement: '30%↓' },
      { metric: '응대 가능 시간대', before: '업무 시간 한정', after: '24시간 상시', improvement: '신규 확보' },
    ]),
    ...spacer(1),
    subHeading('4.2 정성적 기대 효과'),
    bodyPara('수치로 환산하기 어려운 조직·업무 차원의 변화도 함께 기대됩니다.'),
    bullet('실시간 인사이트 기반의 데이터 드리븐 의사결정 문화 정착'),
    bullet('상담 인력이 반복 업무에서 벗어나 고난도 상담과 고객 관계 관리에 집중'),
    bullet('신규 인력 온보딩 기간 단축, AI가 기본 응대를 지원하며 학습 곡선 완화'),
    ...spacer(1),
    bodyPara(`도입 전에는 "${d.currentPainPoint}" 상황이 반복되었다면, 도입 후에는 반복적·정형적 문의는 AI가 실시간으로 처리하고 상담 인력은 예외 상황과 고부가가치 응대에 집중하는 구조로 전환됩니다.`),
    ...spacer(2),
  ]
}

function buildCloudEffect(d: Extract<ProposalFormData, { category: 'CLOUD' }>, heading: string): AnyBlock[] {
  return [
    sectionHeading(heading),
    ...spacer(1),
    twoColTable([
      ['비용 절감', 'On-premise 대비 TCO 30~40% 절감'],
      ['가용성',   '멀티 AZ 이중화 → 서비스 가용성 99.9% 이상'],
      ['확장성',   '트래픽에 따른 자동 확장, 서비스 중단 없는 스케일업'],
      ['최적화',    d.optimizationGoal],
    ]),
    ...spacer(2),
  ]
}

function buildERPEffect(d: Extract<ProposalFormData, { category: 'ERP' }>, heading: string): AnyBlock[] {
  return [
    sectionHeading(heading),
    ...spacer(1),
    twoColTable([
      ['업무 효율', '수작업 업무 60~70% 자동화, 월 결산 기간 5일 → 2일 단축'],
      ['의사결정',  '실시간 경영 대시보드로 데이터 기반 의사결정 실현'],
      ['정확도',   '데이터 단일화로 오류 발생 80% 감소'],
      ['Go-Live',   d.goLiveDate],
    ]),
    ...spacer(2),
  ]
}

// ── V. 추진 일정 ──
function buildAISchedule(d: Extract<ProposalFormData, { category: 'AI' }>, heading: string): AnyBlock[] {
  return [
    sectionHeading(heading),
    ...spacer(1),
    milestoneTable([
      { phase: 'Phase 1', period: '1~4주',   tasks: '현황 분석, 데이터 수집·전처리, 파일럿 범위 확정' },
      { phase: 'Phase 2', period: '5~10주',  tasks: `${d.aiModel} 모델 개발, 학습 데이터 구축, 초기 성능 검증` },
      { phase: 'Phase 3', period: '11~14주', tasks: `${d.integrationSystems || '기존 시스템'} 연동 개발, UI 개발, 통합 테스트` },
      { phase: 'Phase 4', period: '15~16주', tasks: 'UAT, 사용자 교육, 안정화 운영, 인수인계' },
    ]),
    ...spacer(1),
    subHeading('Phase 1 상세 · 현황 분석 및 파일럿 준비'),
    bodyPara(`${d.clientName}의 현행 업무 프로세스와 보유 데이터를 진단하고, ${d.pilotScope || '초기 적용 범위'}를 기준으로 파일럿 범위를 확정합니다. 이 단계의 완료 기준은 데이터 진단 보고서 및 파일럿 범위 정의서 승인입니다.`),
    ...spacer(1),
    subHeading('Phase 2 상세 · 모델 개발 및 PoC 검증'),
    bodyPara(`${d.aiModel} 기반 모델을 ${d.clientName}의 도메인 데이터로 학습시키고, 핵심 목표 KPI(${d.targetKPI}) 대비 초기 성능을 검증합니다. 완료 기준은 PoC 결과 보고서 승인 및 목표 성능 기준 충족입니다.`),
    ...spacer(1),
    subHeading('Phase 3 상세 · 시스템 연동 및 통합 테스트'),
    bodyPara(`${d.integrationSystems || '기존 업무 시스템'}과의 API 연동을 개발하고, 실제 업무 시나리오 기반 통합 테스트를 수행합니다. 완료 기준은 전체 연동 시나리오에 대한 테스트 통과입니다.`),
    ...spacer(1),
    subHeading('Phase 4 상세 · 안정화 및 인수인계'),
    bodyPara('실사용자 대상 UAT를 진행하고, 관리자·실무자 교육을 완료한 뒤 운영 안정화 기간을 거쳐 정식 인수인계합니다. 완료 기준은 운영 매뉴얼 승인 및 Go-Live 완료입니다.'),
    ...spacer(2),
  ]
}

function buildCloudSchedule(d: Extract<ProposalFormData, { category: 'CLOUD' }>, heading: string): AnyBlock[] {
  return [
    sectionHeading(heading),
    ...spacer(1),
    milestoneTable([
      { phase: 'Phase 1', period: '1~3주',   tasks: '현황 분석, 클라우드 아키텍처 설계, 마이그레이션 계획 수립' },
      { phase: 'Phase 2', period: '4~8주',   tasks: '클라우드 환경 구축, 네트워크·보안 설정, PoC 검증' },
      { phase: 'Phase 3', period: '9~14주',  tasks: `${d.migrationScope} 단계적 마이그레이션, 성능 테스트` },
      { phase: 'Phase 4', period: '15~16주', tasks: 'DR 테스트, 운영 전환, 모니터링 체계 구축' },
    ]),
  ]
}

function buildERPSchedule(d: Extract<ProposalFormData, { category: 'ERP' }>, heading: string): AnyBlock[] {
  return [
    sectionHeading(heading),
    ...spacer(1),
    milestoneTable([
      { phase: 'Phase 1', period: '1~4주',   tasks: '현황 분석, 요구사항 정의, ERP 설계 확정' },
      { phase: 'Phase 2', period: '5~12주',  tasks: `${d.erpScope} 모듈 개발·설정, ${d.customizationLevel} 커스터마이징` },
      { phase: 'Phase 3', period: '13~16주', tasks: `${d.dataVolume} 데이터 이관, 통합 테스트, 사용자 교육` },
      { phase: 'Phase 4', period: '17~18주', tasks: `병행 운영, 안정화, ${d.goLiveDate} Go-Live 전환` },
    ]),
  ]
}

// ── VII. 단계별 산출물 명세 ──
interface Deliverable { phase: string; type: '문서' | '코드' | '디자인' | '운영가이드' | '교육'; name: string }

const DELIVERABLE_TYPE_COLOR: Record<Deliverable['type'], string> = {
  '문서': C.brandMain,
  '코드': C.accentGreen,
  '디자인': C.accentViolet,
  '운영가이드': C.accentAmber,
  '교육': C.accentRose,
}

function deliverablesTable(items: Deliverable[]): Table {
  const widths = scaleWidths([1600, 1600, 6800])
  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      headerCell('단계', widths[0]),
      headerCell('유형', widths[1]),
      headerCell('산출물', widths[2]),
    ],
  })

  let lastPhase = ''
  let bandToggle = false
  const dataRows = items.map((it) => {
    if (it.phase !== lastPhase) { bandToggle = !bandToggle; lastPhase = it.phase }
    const fill = bandToggle ? C.tableBand : C.white
    return new TableRow({
      children: [
        bodyCell(it.phase, widths[0], { fill, bold: true, color: C.brandMain }),
        bodyCell(it.type, widths[1], { fill, bold: true, color: DELIVERABLE_TYPE_COLOR[it.type] }),
        bodyCell(it.name, widths[2], { fill }),
      ],
    })
  })

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: widths,
    rows: [headerRow, ...dataRows],
    borders: tableBorders(),
  })
}

function buildAIDeliverables(d: Extract<ProposalFormData, { category: 'AI' }>, heading: string): AnyBlock[] {
  return [
    sectionHeading(heading),
    ...spacer(1),
    bodyPara('각 단계에서 실제로 전달되는 산출물을 문서·코드·디자인·운영가이드·교육으로 구분하여 명시합니다. "무엇을 받는지"에 대한 답입니다.'),
    ...spacer(1),
    deliverablesTable([
      { phase: 'Phase 1', type: '문서', name: '현황 분석 보고서 (AS-IS 프로세스, Pain Point 정리)' },
      { phase: 'Phase 1', type: '문서', name: '데이터 진단 및 파일럿 범위 정의서' },
      { phase: 'Phase 2', type: '코드', name: `${d.aiModel} 학습 파이프라인 소스코드` },
      { phase: 'Phase 2', type: '문서', name: 'PoC 결과 보고서 (성능 지표 포함)' },
      { phase: 'Phase 3', type: '코드', name: `${d.integrationSystems} 연동 모듈 소스코드` },
      { phase: 'Phase 3', type: '디자인', name: '대시보드 · 관리자 화면 UI 디자인 산출물' },
      { phase: 'Phase 3', type: '문서', name: '시스템 연동 명세서 (API 명세, 인터페이스 정의서)' },
      { phase: 'Phase 4', type: '운영가이드', name: '운영 매뉴얼 (모니터링, 장애 대응 절차)' },
      { phase: 'Phase 4', type: '교육', name: '관리자·실무자 대상 사용자 교육 및 교육 자료' },
      { phase: 'Phase 4', type: '문서', name: '프로젝트 최종 보고서' },
    ]),
    ...spacer(2),
  ]
}

function buildCloudDeliverables(d: Extract<ProposalFormData, { category: 'CLOUD' }>, heading: string): AnyBlock[] {
  return [
    sectionHeading(heading),
    ...spacer(1),
    bodyPara('각 단계에서 실제로 전달되는 산출물을 문서·코드·디자인·운영가이드·교육으로 구분하여 명시합니다. "무엇을 받는지"에 대한 답입니다.'),
    ...spacer(1),
    deliverablesTable([
      { phase: 'Phase 1', type: '문서', name: '클라우드 아키텍처 설계서' },
      { phase: 'Phase 1', type: '문서', name: '마이그레이션 계획서 (일정·리스크·롤백 전략 포함)' },
      { phase: 'Phase 2', type: '코드', name: 'IaC(Terraform 등) 인프라 코드' },
      { phase: 'Phase 2', type: '문서', name: '네트워크·보안 설정 명세서' },
      { phase: 'Phase 2', type: '문서', name: 'PoC 검증 결과 보고서' },
      { phase: 'Phase 3', type: '코드', name: '마이그레이션 자동화 스크립트' },
      { phase: 'Phase 3', type: '문서', name: `${d.migrationScope} 마이그레이션 완료 보고서` },
      { phase: 'Phase 3', type: '문서', name: '성능 테스트 결과 보고서' },
      { phase: 'Phase 4', type: '운영가이드', name: '클라우드 운영 매뉴얼 (모니터링, DR 절차)' },
      { phase: 'Phase 4', type: '교육', name: '운영팀 대상 클라우드 운영 교육' },
      { phase: 'Phase 4', type: '문서', name: '운영 인수인계서' },
    ]),
    ...spacer(2),
  ]
}

function buildERPDeliverables(d: Extract<ProposalFormData, { category: 'ERP' }>, heading: string): AnyBlock[] {
  return [
    sectionHeading(heading),
    ...spacer(1),
    bodyPara('각 단계에서 실제로 전달되는 산출물을 문서·코드·디자인·운영가이드·교육으로 구분하여 명시합니다. "무엇을 받는지"에 대한 답입니다.'),
    ...spacer(1),
    deliverablesTable([
      { phase: 'Phase 1', type: '문서', name: '요구사항 정의서' },
      { phase: 'Phase 1', type: '문서', name: `${d.erpScope} ERP 시스템 설계서 (모듈별 프로세스 흐름도)` },
      { phase: 'Phase 2', type: '코드', name: '커스터마이징 개발 소스 및 형상관리 이력' },
      { phase: 'Phase 2', type: '디자인', name: '화면(UI) 설계서' },
      { phase: 'Phase 2', type: '문서', name: '모듈 구현 완료 보고서' },
      { phase: 'Phase 3', type: '문서', name: '데이터 이관 완료 보고서 (검증 결과 포함)' },
      { phase: 'Phase 3', type: '교육', name: '부서별 사용자 교육 자료 및 교육 세션' },
      { phase: 'Phase 3', type: '문서', name: '통합 테스트 결과 보고서' },
      { phase: 'Phase 4', type: '운영가이드', name: 'ERP 운영 매뉴얼 (관리자용)' },
      { phase: 'Phase 4', type: '운영가이드', name: '유지보수 및 장애 대응 가이드' },
      { phase: 'Phase 4', type: '문서', name: `Go-Live 완료 보고서 (목표일: ${d.goLiveDate})` },
    ]),
    ...spacer(2),
  ]
}

// ── VIII. 사업 관리 방안 (하위 항목 on/off) ──
function buildManagement(data: ProposalFormData, heading: string, subEnabled: Record<string, boolean>): AnyBlock[] {
  const blocks: AnyBlock[] = [sectionHeading(heading), ...spacer(1)]

  if (subEnabled.ORG) {
    blocks.push(
      subHeading('6.1 수행 조직'),
      bodyPara('본 프로젝트는 PM을 중심으로 기술 아키텍트, 개발·구현팀, QA팀, 현장 지원 인력으로 구성된 전담 조직이 수행합니다. 고객사와는 주 1회 정기 협의체를 운영하여 진행 상황을 공유하고 의사결정 지연을 최소화합니다.'),
      twoColTable([
        ['프로젝트 PM',   '전체 일정·품질·리스크 총괄, 고객사 협의체 운영'],
        ['기술 아키텍트', `${CATEGORY_LABEL[data.category]} 아키텍처 설계 및 기술 의사결정`],
        ['개발·구현팀',   '핵심 기능 개발, 통합 테스트, 성능 최적화'],
        ['QA·테스트',     '품질 계획 수립, 테스트 시나리오 설계 및 수행'],
        ['현장 지원',     '교육, UAT 지원, Go-Live 안정화 대응'],
      ]),
      ...spacer(1),
    )
  }
  if (subEnabled.QUALITY) {
    blocks.push(
      subHeading('6.2 품질 보증'),
      bodyPara('품질은 사후 검증이 아닌 단계별 내재화 방식으로 관리합니다. 각 마일스톤 산출물은 고객 검토와 승인을 거쳐야 다음 단계로 진행되며, 이슈는 발생 즉시 에스컬레이션 체계를 통해 처리합니다.'),
      checkItem('단계별 마일스톤 산출물 고객 검토 및 승인 절차 운영'),
      checkItem('주간 진도 보고 및 이슈 에스컬레이션 체계'),
      checkItem('ISO 9001 기반 품질 관리 프로세스 적용'),
      checkItem('형상관리(Git) 활용, 전체 버전 이력 추적'),
      ...spacer(1),
    )
  }
  if (subEnabled.RISK) {
    blocks.push(
      subHeading('6.3 리스크 관리'),
      bodyPara('프로젝트 진행 중 발생 가능한 주요 리스크를 사전에 식별하고, 각각에 대한 발생 가능성·영향도·대응 방안을 아래와 같이 마련해두었습니다.'),
      ...spacer(1),
      subHeading('리스크 ① 요구사항 변경'),
      bodyPara('프로젝트 진행 중 고객사 내부 사정이나 시장 변화로 인해 초기 합의된 요구사항이 변경될 수 있습니다.'),
      twoColTable([
        ['발생 가능성', '중간'],
        ['영향도',     '일정 지연 및 재작업 발생 가능'],
        ['대응 방안',   '변경관리 절차(CCB)를 운영하여 영향도 분석 후 일정과 비용에 반영, 임의 변경 방지'],
      ]),
      ...spacer(1),
      subHeading('리스크 ② 핵심 인력 이탈'),
      bodyPara('장기 프로젝트 특성상 핵심 개발·기획 인력의 이탈이 발생할 경우 지식 공백이 생길 수 있습니다.'),
      twoColTable([
        ['발생 가능성', '낮음'],
        ['영향도',     '일정 지연 및 품질 저하 우려'],
        ['대응 방안',   '백업 인력 사전 확보 및 지식 이전 문서화를 의무화하여 인력 교체 시에도 연속성 유지'],
      ]),
      ...spacer(1),
      subHeading('리스크 ③ 데이터 품질 이슈'),
      bodyPara('보유 데이터의 결측치, 중복, 형식 불일치 등으로 인해 개발·연동 과정에서 예상보다 많은 정제 작업이 필요할 수 있습니다.'),
      twoColTable([
        ['발생 가능성', '중간'],
        ['영향도',     '개발 일정 지연 및 목표 성능 미달 우려'],
        ['대응 방안',   '프로젝트 착수 시점에 데이터 진단을 선행하고, 사전 정제 기간을 일정에 확보'],
      ]),
      ...spacer(1),
      subHeading('리스크 ④ 일정 지연'),
      bodyPara('외부 연동 시스템의 협조 지연이나 예상치 못한 기술적 이슈로 전체 일정이 지연될 수 있습니다.'),
      twoColTable([
        ['발생 가능성', '낮음'],
        ['영향도',     'Go-Live 일정 지연'],
        ['대응 방안',   '크리티컬 패스를 집중 관리하고, 전체 일정에 2주의 버퍼를 사전에 내장'],
      ]),
    )
  }
  blocks.push(...spacer(2))
  return blocks
}

// ── IX. 유지보수 및 지원 ──
function buildMaintenance(data: ProposalFormData, heading: string): AnyBlock[] {
  return [
    sectionHeading(heading),
    ...spacer(1),
    twoColTable([
      ['무상 보증',   '오픈 후 6개월간 결함 수정 및 장애 대응 무상 지원'],
      ['유상 유지보수', '월정액 계약, SLA 기반 응대 시간 보장'],
      ['장애 대응',   '24×7 모니터링, 장애 발생 시 4시간 내 현장·원격 대응'],
      ['기술 이전',   '운영 매뉴얼 제공, 관리자 교육 최소 2회 이상'],
    ]),
    ...spacer(2),
  ]
}

// ── X. 비용 제안 (항목별 견적 — 항상 포함) ──
function buildCost(data: ProposalFormData, heading: string): AnyBlock[] {
  return [
    sectionHeading(heading),
    ...spacer(1),
    bodyPara(`총 사업 예산(안): ${data.projectBudget}  |  총 사업 기간: ${data.projectDuration}`),
    ...spacer(1),
    subHeading('8.1 인력 투입 내역 (M/M)'),
    laborEstimateTable(data),
    ...spacer(1),
    subHeading('8.2 SW · HW · 클라우드 비용'),
    costEstimateTable(data),
    ...spacer(1),
    subHeading('8.3 견적 합계'),
    estimateSummaryTable(data),
    ...spacer(1),
    bodyPara('※ 상기 견적은 입력된 항목을 기준으로 자동 산출되었으며, 상세 요구사항 협의 후 최종 확정됩니다.'),
    ...spacer(2),
  ]
}

// ── V. 범위 정의 (In / Out of Scope, 전제조건, 의존성) ──
function scopeTable(data: ProposalFormData): Table {
  const { inScope, outOfScope } = data.scope
  const rowCount = Math.max(inScope.length, outOfScope.length, 1)
  const widths = scaleWidths([5000, 5000])
  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      headerCell('포함 범위 (In Scope)', widths[0], C.accentGreen),
      headerCell('제외 범위 (Out of Scope)', widths[1], C.accentAmber),
    ],
  })
  const dataRows = Array.from({ length: rowCount }, (_, i) => {
    const fill = i % 2 === 0 ? C.tableBand : C.white
    return new TableRow({
      children: [
        bodyCell(inScope[i]?.text || '', widths[0], { fill }),
        bodyCell(outOfScope[i]?.text || '', widths[1], { fill }),
      ],
    })
  })
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: widths,
    rows: [headerRow, ...dataRows],
    borders: tableBorders(),
  })
}

function buildScope(data: ProposalFormData, heading: string): AnyBlock[] {
  const blocks: AnyBlock[] = [
    sectionHeading(heading),
    ...spacer(1),
    bodyPara('본 제안의 수행 범위를 다음과 같이 명확히 정의합니다. 하단에 명시되지 않은 항목은 이번 단계에 포함하지 않습니다.'),
    ...spacer(1),
    scopeTable(data),
    ...spacer(1),
  ]
  if (data.scope.assumptions.length > 0) {
    blocks.push(
      subHeading('전제 조건 (Assumptions)'),
      ...data.scope.assumptions.map((a) => bullet(a.text)),
      ...spacer(1),
    )
  }
  if (data.scope.dependencies.length > 0) {
    blocks.push(
      subHeading('의존성 (Dependencies)'),
      ...data.scope.dependencies.map((d) => bullet(d.text)),
      ...spacer(1),
    )
  }
  blocks.push(
    bodyPara('※ 제외 범위(Out of Scope)에 포함된 항목은 별도 협의 및 추가 계약을 통해서만 진행됩니다.'),
    ...spacer(2),
  )
  return blocks
}

// ── XI. 회사 소개 및 수행 실적 ──
function trackRecordTable(items: { client: string; year: string; description: string }[]): Table {
  const widths = scaleWidths([2400, 1200, 6400])
  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      headerCell('고객사 / 프로젝트명', widths[0]),
      headerCell('연도', widths[1]),
      headerCell('개요 및 성과', widths[2]),
    ],
  })
  const dataRows = items.map((it, i) => {
    const fill = i % 2 === 0 ? C.tableBand : C.white
    return new TableRow({
      children: [
        bodyCell(it.client || '-', widths[0], { fill, bold: true, color: C.brandMain }),
        bodyCell(it.year || '-', widths[1], { fill, align: AlignmentType.CENTER }),
        bodyCell(it.description || '-', widths[2], { fill }),
      ],
    })
  })
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: widths,
    rows: [headerRow, ...dataRows],
    borders: tableBorders(),
  })
}

function buildCompanyProfile(data: ProposalFormData, heading: string): AnyBlock[] {
  const { intro, coreCompetencies, trackRecords } = data.companyProfile
  const blocks: AnyBlock[] = [
    sectionHeading(heading),
    ...spacer(1),
    bodyPara(intro || `${data.companyName}는 ${CATEGORY_LABEL[data.category]} 분야에서 축적한 경험을 바탕으로 본 프로젝트를 수행합니다. 상세 연혁 및 소개 자료는 별도로 제공 가능합니다.`),
    ...spacer(1),
  ]

  if (coreCompetencies.length > 0) {
    blocks.push(
      subHeading('핵심 역량 / 강점'),
      ...coreCompetencies.map((c) => checkItem(c.text || '-')),
      ...spacer(1),
    )
  }

  blocks.push(subHeading('주요 수행 실적'))
  if (trackRecords.length > 0) {
    blocks.push(trackRecordTable(trackRecords))
  } else {
    blocks.push(bodyPara('수행 실적은 협의 시 별도 레퍼런스 자료로 제공됩니다.'))
  }
  blocks.push(...spacer(2))
  return blocks
}

// ── XII. 당사를 선택해야 하는 이유 ──
function buildWhyUs(data: ProposalFormData, heading: string): AnyBlock[] {
  return [
    sectionHeading(heading),
    ...spacer(1),
    bullet(`${CATEGORY_LABEL[data.category]} 분야 전문 수행 역량 및 다수 레퍼런스 보유`),
    bullet('검증된 방법론과 재사용 가능한 솔루션 자산으로 빠른 구축 가능'),
    bullet('고객 맞춤형 접근, 표준 솔루션이 아닌 최적화된 설계'),
    bullet('구축 이후 운영까지 End-to-End 책임 지원 체계'),
    bullet('경쟁력 있는 가격과 투명한 비용 구조 제공'),
    ...spacer(2),
  ]
}

// ── 섹션 ID → 빌더 라우팅 ──
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']

function sectionTitle(id: SectionId, category: ProposalCategory): string {
  const solutionLabel: Record<ProposalCategory, string> = {
    AI: 'AI 솔루션 제안', CLOUD: '클라우드 전환 솔루션 제안', ERP: 'ERP 구축 솔루션 제안',
  }
  const map: Record<SectionId, string> = {
    EXEC: '경영진 요약 (Executive Summary)',
    ANALYSIS: '현황 분석 및 문제점',
    SOLUTION: solutionLabel[category],
    EFFECT: '기대 효과',
    SCOPE: '범위 정의 (In / Out of Scope)',
    SCHEDULE: '추진 일정',
    DELIVERABLES: '단계별 산출물 명세',
    MANAGEMENT: '사업 관리 방안',
    MAINTENANCE: '유지보수 및 지원',
    COST: '비용 제안',
    COMPANY: '회사 소개 및 수행 실적',
    WHY_US: '당사를 선택해야 하는 이유',
  }
  return map[id]
}

function buildSection(id: SectionId, data: ProposalFormData, heading: string, subEnabled: Record<string, boolean>): AnyBlock[] {
  switch (id) {
    case 'EXEC': return buildExec(data, heading)
    case 'ANALYSIS':
      if (data.category === 'AI') return buildAIAnalysis(data, heading)
      if (data.category === 'CLOUD') return buildCloudAnalysis(data, heading)
      return buildERPAnalysis(data, heading)
    case 'SOLUTION':
      if (data.category === 'AI') return buildAISolution(data, heading)
      if (data.category === 'CLOUD') return buildCloudSolution(data, heading)
      return buildERPSolution(data, heading)
    case 'EFFECT':
      if (data.category === 'AI') return buildAIEffect(data, heading)
      if (data.category === 'CLOUD') return buildCloudEffect(data, heading)
      return buildERPEffect(data, heading)
    case 'SCOPE': return buildScope(data, heading)
    case 'SCHEDULE':
      if (data.category === 'AI') return buildAISchedule(data, heading)
      if (data.category === 'CLOUD') return buildCloudSchedule(data, heading)
      return buildERPSchedule(data, heading)
    case 'DELIVERABLES':
      if (data.category === 'AI') return buildAIDeliverables(data, heading)
      if (data.category === 'CLOUD') return buildCloudDeliverables(data, heading)
      return buildERPDeliverables(data, heading)
    case 'MANAGEMENT': return buildManagement(data, heading, subEnabled)
    case 'MAINTENANCE': return buildMaintenance(data, heading)
    case 'COST': return buildCost(data, heading)
    case 'COMPANY': return buildCompanyProfile(data, heading)
    case 'WHY_US': return buildWhyUs(data, heading)
  }
}

// ─── 표지 ────────────────────────────────────────────────────────────────────
function buildCover(data: ProposalFormData): Paragraph[] {
  return [
    ...spacer(5),
    new Paragraph({
      children: [TR(`◆  ${CATEGORY_LABEL[data.category]} 제안서`, { bold: true, size: 11, color: C.brandMain })],
      alignment: AlignmentType.CENTER,
      spacing: { after: pt(16) },
    }),
    new Paragraph({
      children: [new TextRun({ text: data.proposalTitle, bold: true, size: halfPt(26), color: C.brandDeep })],
      alignment: AlignmentType.CENTER,
      spacing: { after: pt(8) },
    }),
    new Paragraph({
      children: [TR(`${data.clientName} 귀중`, { size: 13, color: C.grayText })],
      alignment: AlignmentType.CENTER,
      spacing: { after: pt(40) },
    }),
    new Paragraph({
      border: { bottom: { style: BorderStyle.THICK, size: 8, color: C.brandMain } },
      children: [],
      spacing: { after: pt(30) },
    }),
    ...spacer(2),
    new Paragraph({
      children: [TR('제  안  사', { size: 11, color: C.grayText })],
      alignment: AlignmentType.CENTER,
      spacing: { after: pt(4) },
    }),
    new Paragraph({
      children: [TR(data.companyName, { bold: true, size: 16, color: C.brandDeep })],
      alignment: AlignmentType.CENTER,
      spacing: { after: pt(20) },
    }),
    new Paragraph({
      children: [TR(`작성자: ${data.preparedBy}`, { size: 10, color: C.grayText })],
      alignment: AlignmentType.CENTER,
      spacing: { after: pt(4) },
    }),
    new Paragraph({
      children: [TR(`작성일: ${data.preparedDate}`, { size: 10, color: C.grayText })],
      alignment: AlignmentType.CENTER,
      spacing: { after: pt(4) },
    }),
    new Paragraph({
      children: [TR('CONFIDENTIAL · 본 문서는 대외비입니다.', { size: 9, color: C.accentAmber })],
      alignment: AlignmentType.CENTER,
      spacing: { before: pt(16) },
    }),
  ]
}

// ─── 메인 생성 함수 ───────────────────────────────────────────────────────────
export async function generateProposalDocx(data: ProposalFormData): Promise<Blob> {
  const enabledSections = data.structure.filter((s) => s.enabled)

  const bodyChildren = enabledSections.flatMap((section, idx) => {
    const heading = `${ROMAN[idx]}. ${sectionTitle(section.id, data.category)}`
    const subEnabled = Object.fromEntries((section.subsections ?? []).map((s) => [s.id, s.enabled]))
    return buildSection(section.id, data, heading, subEnabled)
  }) as Paragraph[]

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: '맑은 고딕', size: halfPt(10) } },
      },
    },
    sections: [
      // ── 표지 섹션 ──
      {
        properties: {
          type: SectionType.NEXT_PAGE,
          page: { margin: { top: twip(1.5), bottom: twip(1.5), left: twip(1.4), right: twip(1.2) } },
        },
        children: buildCover(data),
      },
      // ── 본문 섹션 ──
      {
        properties: {
          type: SectionType.NEXT_PAGE,
          page: { margin: { top: twip(1.2), bottom: twip(1.0), left: twip(1.4), right: twip(1.2) } },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  TR(data.companyName, { bold: true, size: 9, color: C.brandMain }),
                  TR(`  ·  ${data.proposalTitle}`, { size: 9, color: C.grayText }),
                ],
                border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.grayLine } },
                spacing: { after: pt(4) },
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  TR('CONFIDENTIAL  ', { bold: true, size: 8, color: C.accentAmber }),
                  TR(`· © ${new Date().getFullYear()} ${data.companyName}`, { size: 8, color: C.grayText }),
                  new TextRun({ children: ['\t'], size: halfPt(8) }),
                  new TextRun({ children: [PageNumber.CURRENT], size: halfPt(8), color: C.grayText }),
                ],
                tabStops: [{ type: 'right', position: twip(6) }],
                border: { top: { style: BorderStyle.SINGLE, size: 4, color: C.grayLine } },
                spacing: { before: pt(4) },
              }),
            ],
          }),
        },
        children: bodyChildren,
      },
    ],
  })

  const { Packer } = await import('docx')
  const buffer = await Packer.toBuffer(doc)
  // Node.js Buffer → ArrayBuffer 변환으로 Blob 타입 오류 해결
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer
  return new Blob([arrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })
}
