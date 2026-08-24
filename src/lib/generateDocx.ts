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
  tableBand:  'F8F9FC',
}

const pt  = (n: number) => n * 20
const twip = convertInchesToTwip

// ── TextRun 헬퍼 ──────────────────────────────────────────────────────────────
const TR = (text: string, opts: { bold?: boolean; size?: number; color?: string } = {}) =>
  new TextRun({ text, bold: opts.bold ?? false, size: pt(opts.size ?? 10), color: opts.color ?? C.darkText })

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
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [2400, 7600],
    rows: [new TableRow({ children: [cell(label, true, C.brandLight, 2400), cell(value, false, C.white, 7600)] })],
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
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [3000, 7000],
    rows: rows.map(([label, value], i) =>
      new TableRow({
        children: [
          new TableCell({
            width: { size: 3000, type: WidthType.DXA },
            shading: { fill: i % 2 === 0 ? C.brandLight : C.tableBand, type: ShadingType.CLEAR },
            children: [new Paragraph({
              children: [TR(label, { bold: true, size: 9, color: C.brandDeep })],
              spacing: { before: pt(6), after: pt(6) },
              indent: { left: twip(0.1) },
            })],
          }),
          new TableCell({
            width: { size: 7000, type: WidthType.DXA },
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

function milestoneTable(items: { phase: string; period: string; tasks: string; output: string }[]): Table {
  const widths = [1500, 1200, 5000, 2300]
  const headers = ['단계', '기간', '주요 활동', '산출물']

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
        new TableCell({
          width: { size: widths[3], type: WidthType.DXA },
          shading: { fill: i % 2 === 0 ? C.tableBand : C.white, type: ShadingType.CLEAR },
          children: [new Paragraph({
            children: [TR(m.output, { size: 9, color: C.grayText })],
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
function headerCell(text: string, width: number): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: { fill: C.brandDeep, type: ShadingType.CLEAR },
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
  const widths = [2400, 1400, 1600, 2100, 2500]
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
  const widths = [1600, 3400, 1200, 1800, 2000]
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
  const widths = [6000, 4000]
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
    subHeading('2.1 현재 운영 현황 및 Pain Point'),
    bodyPara(`${d.clientName}는 ${d.clientIndustry} 업종으로, 현재 다음과 같은 운영상의 문제에 직면해 있습니다.`),
    ...spacer(1),
    bullet(d.currentPainPoint),
    bullet('데이터 기반 의사결정 체계 미흡 — 수동 분석에 의존한 비효율 지속'),
    bullet('반복 업무 자동화 부재로 인한 인건비 증가 및 오류 발생'),
    ...spacer(1),
    subHeading('2.2 AS-IS → TO-BE 개선 방향'),
    twoColTable([
      ['AI 활용 케이스',   d.aiUseCase],
      ['핵심 목표 KPI',    d.targetKPI],
      ['보유 데이터 자산', d.dataAssets],
      ['연동 대상 시스템', d.integrationSystems],
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
    bullet('급격한 트래픽 증가 대응 불가 — 확장성 한계'),
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
    bullet(`${d.currentSystem} 한계 — 실시간 경영 가시성 부족`),
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
    bullet(`파일럿 범위: ${d.pilotScope}`),
    bullet(`연동 시스템: ${d.integrationSystems}`),
    ...spacer(1),
    subHeading('3.2 시스템 아키텍처 (3-Tier 구조)'),
    infoBox('데이터 수집 Layer',  `${d.dataAssets} → 전처리 파이프라인 → Feature Store`),
    ...spacer(1),
    infoBox('AI 모델 Layer',       `${d.aiModel} → 학습·추론 서버 → 모델 레지스트리`),
    ...spacer(1),
    infoBox('서비스 Layer',        `API Gateway → ${d.integrationSystems} 연동 → 대시보드·모니터링`),
    ...spacer(1),
    subHeading('3.3 주요 기능 및 특장점'),
    checkItem('실시간 AI 추론 — 응답 Latency 500ms 이하 목표'),
    checkItem(`${d.integrationSystems} 기존 시스템 원클릭 연동`),
    checkItem('모델 성능 모니터링 및 자동 재학습 파이프라인 제공'),
    checkItem('설명 가능한 AI (XAI) — 의사결정 근거 시각화'),
    checkItem('데이터 암호화 및 개인정보 처리 방침 완전 준수'),
    ...(d.complianceNote ? [checkItem(d.complianceNote)] : []),
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
    checkItem(`${d.targetArchitecture} 기반 — 확장 가능한 인프라 구성`),
    checkItem('멀티 AZ 구성으로 고가용성 99.9% 이상 보장'),
    checkItem(`${d.complianceRequirements} 컴플라이언스 자동화 적용`),
    checkItem('비용 최적화: Reserved Instance·Savings Plans 활용 및 Auto Scaling 정책 수립'),
    checkItem('IaC(Terraform) 기반 인프라 전체 코드화 — 배포 자동화'),
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
    twoColTable([
      ['목표 KPI',    d.targetKPI],
      ['운영 효율',  '수동 처리 시간 50~70% 단축'],
      ['품질 향상',  'AI 기반 오류 감지로 불량률 30% 개선'],
      ['의사결정',   '실시간 인사이트 기반 데이터 드리븐 경영 실현'],
    ]),
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
      ['확장성',   '트래픽에 따른 자동 확장 — 서비스 중단 없는 스케일업'],
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
      { phase: 'Phase 1', period: '1~4주',   tasks: '현황 분석, 데이터 수집·전처리, 파일럿 범위 확정',            output: '현황분석 보고서' },
      { phase: 'Phase 2', period: '5~10주',  tasks: `${d.aiModel} 모델 개발, 학습 데이터 구축, 초기 성능 검증`, output: 'PoC 결과 보고서' },
      { phase: 'Phase 3', period: '11~14주', tasks: `${d.integrationSystems} 연동 개발, UI 개발, 통합 테스트`,   output: '시스템 연동 명세서' },
      { phase: 'Phase 4', period: '15~16주', tasks: 'UAT, 사용자 교육, 안정화 운영, 인수인계',                   output: '운영 매뉴얼, 최종 보고서' },
    ]),
  ]
}

function buildCloudSchedule(d: Extract<ProposalFormData, { category: 'CLOUD' }>, heading: string): AnyBlock[] {
  return [
    sectionHeading(heading),
    ...spacer(1),
    milestoneTable([
      { phase: 'Phase 1', period: '1~3주',   tasks: '현황 분석, 클라우드 아키텍처 설계, 마이그레이션 계획 수립', output: '클라우드 설계서' },
      { phase: 'Phase 2', period: '4~8주',   tasks: '클라우드 환경 구축, 네트워크·보안 설정, PoC 검증',        output: '환경 구성 보고서' },
      { phase: 'Phase 3', period: '9~14주',  tasks: `${d.migrationScope} 단계적 마이그레이션, 성능 테스트`,   output: '마이그레이션 완료 보고서' },
      { phase: 'Phase 4', period: '15~16주', tasks: 'DR 테스트, 운영 전환, 모니터링 체계 구축',               output: '운영 인수인계서' },
    ]),
  ]
}

function buildERPSchedule(d: Extract<ProposalFormData, { category: 'ERP' }>, heading: string): AnyBlock[] {
  return [
    sectionHeading(heading),
    ...spacer(1),
    milestoneTable([
      { phase: 'Phase 1', period: '1~4주',   tasks: '현황 분석, 요구사항 정의, ERP 설계 확정',                              output: '요구사항 정의서, 설계서' },
      { phase: 'Phase 2', period: '5~12주',  tasks: `${d.erpScope} 모듈 개발·설정, ${d.customizationLevel} 커스터마이징`, output: '모듈 구현 완료 보고서' },
      { phase: 'Phase 3', period: '13~16주', tasks: `${d.dataVolume} 데이터 이관, 통합 테스트, 사용자 교육`,               output: '이관 완료 보고서, 교육 자료' },
      { phase: 'Phase 4', period: '17~18주', tasks: `병행 운영, 안정화, ${d.goLiveDate} Go-Live 전환`,                     output: '운영 매뉴얼, Go-Live 완료 보고서' },
    ]),
  ]
}

// ── VI. 사업 관리 방안 (하위 항목 on/off) ──
function buildManagement(data: ProposalFormData, heading: string, subEnabled: Record<string, boolean>): AnyBlock[] {
  const blocks: AnyBlock[] = [sectionHeading(heading), ...spacer(1)]

  if (subEnabled.ORG) {
    blocks.push(
      subHeading('6.1 수행 조직'),
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
      checkItem('단계별 마일스톤 산출물 고객 검토 및 승인 절차 운영'),
      checkItem('주간 진도 보고 및 이슈 에스컬레이션 체계'),
      checkItem('ISO 9001 기반 품질 관리 프로세스 적용'),
      checkItem('형상관리(Git) 활용 — 전체 버전 이력 추적'),
      ...spacer(1),
    )
  }
  if (subEnabled.RISK) {
    blocks.push(
      subHeading('6.3 리스크 관리'),
      twoColTable([
        ['리스크 ①', '요구사항 변경 → 변경관리 절차(CCB) 운영, 영향도 분석 후 일정 조정'],
        ['리스크 ②', '핵심 인력 이탈 → 백업 인력 사전 확보, 지식 이전 문서화 의무화'],
        ['리스크 ③', '데이터 품질 이슈 → 착수 시 데이터 진단, 사전 정제 기간 확보'],
        ['리스크 ④', '일정 지연 → 크리티컬 패스 집중 관리, 2주 버퍼 일정 내장'],
      ]),
    )
  }
  blocks.push(...spacer(2))
  return blocks
}

// ── VII. 유지보수 및 지원 ──
function buildMaintenance(data: ProposalFormData, heading: string): AnyBlock[] {
  return [
    sectionHeading(heading),
    ...spacer(1),
    twoColTable([
      ['무상 보증',   '오픈 후 6개월간 결함 수정 및 장애 대응 무상 지원'],
      ['유상 유지보수', '월정액 계약 — SLA 기반 응대 시간 보장'],
      ['장애 대응',   '24×7 모니터링, 장애 발생 시 4시간 내 현장·원격 대응'],
      ['기술 이전',   '운영 매뉴얼 제공, 관리자 교육 최소 2회 이상'],
    ]),
    ...spacer(2),
  ]
}

// ── VIII. 비용 제안 (항목별 견적 — 항상 포함) ──
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

// ── IX. 당사를 선택해야 하는 이유 ──
function buildWhyUs(data: ProposalFormData, heading: string): AnyBlock[] {
  return [
    sectionHeading(heading),
    ...spacer(1),
    bullet(`${CATEGORY_LABEL[data.category]} 분야 전문 수행 역량 및 다수 레퍼런스 보유`),
    bullet('검증된 방법론과 재사용 가능한 솔루션 자산으로 빠른 구축 가능'),
    bullet('고객 맞춤형 접근 — 표준 솔루션이 아닌 최적화된 설계'),
    bullet('구축 이후 운영까지 End-to-End 책임 지원 체계'),
    bullet('경쟁력 있는 가격과 투명한 비용 구조 제공'),
    ...spacer(2),
  ]
}

// ── 섹션 ID → 빌더 라우팅 ──
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX']

function sectionTitle(id: SectionId, category: ProposalCategory): string {
  const solutionLabel: Record<ProposalCategory, string> = {
    AI: 'AI 솔루션 제안', CLOUD: '클라우드 전환 솔루션 제안', ERP: 'ERP 구축 솔루션 제안',
  }
  const map: Record<SectionId, string> = {
    EXEC: '경영진 요약 (Executive Summary)',
    ANALYSIS: '현황 분석 및 문제점',
    SOLUTION: solutionLabel[category],
    EFFECT: '기대 효과',
    SCHEDULE: '추진 일정',
    MANAGEMENT: '사업 관리 방안',
    MAINTENANCE: '유지보수 및 지원',
    COST: '비용 제안',
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
    case 'SCHEDULE':
      if (data.category === 'AI') return buildAISchedule(data, heading)
      if (data.category === 'CLOUD') return buildCloudSchedule(data, heading)
      return buildERPSchedule(data, heading)
    case 'MANAGEMENT': return buildManagement(data, heading, subEnabled)
    case 'MAINTENANCE': return buildMaintenance(data, heading)
    case 'COST': return buildCost(data, heading)
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
      children: [new TextRun({ text: data.proposalTitle, bold: true, size: pt(26), color: C.brandDeep })],
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
      children: [TR('CONFIDENTIAL — 본 문서는 대외비입니다.', { size: 9, color: C.accentAmber })],
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
        document: { run: { font: '맑은 고딕', size: pt(10) } },
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
                  TR(`— © ${new Date().getFullYear()} ${data.companyName}`, { size: 8, color: C.grayText }),
                  new TextRun({ children: ['\t'], size: pt(8) }),
                  new TextRun({ children: [PageNumber.CURRENT], size: pt(8), color: C.grayText }),
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
