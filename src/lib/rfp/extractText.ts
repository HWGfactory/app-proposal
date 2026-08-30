/**
 * RFP PDF에서 텍스트를 추출한다. 브라우저(클라이언트) 전용 — pdfjs-dist는
 * 함수 내부에서 동적 import 하므로 이 모듈은 SSR/빌드 타임에 안전하게
 * import 될 수 있지만, extractPdfText()는 반드시 브라우저에서만 호출해야 한다.
 *
 * pdf.worker.min.mjs 위치: public/pdf.worker.min.mjs (node_modules/pdfjs-dist/build
 * 에서 복사해온 파일). pdfjs-dist를 업그레이드하면 이 파일도 반드시 재복사해야 한다
 * (README.md "개발 시 참고 사항" 참고).
 */

export interface RfpLine {
  page: number
  text: string
}

export interface RfpPage {
  page: number
  text: string
}

export interface ExtractedRfp {
  pages: RfpPage[]
  lines: RfpLine[]
  fullText: string
}

const LINE_Y_TOLERANCE = 3

let workerConfigured = false

async function loadPdfjs() {
  const pdfjs = await import('pdfjs-dist')
  if (!workerConfigured) {
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
    workerConfigured = true
  }
  return pdfjs
}

/**
 * 같은 줄(비슷한 Y좌표)에 속한 텍스트 아이템들을 X좌표 순으로 이어붙여
 * 줄 단위 텍스트 배열로 재구성한다. PDF에는 "문장" 개념이 없으므로,
 * 시각적으로 줄바꿈된 단위를 요구사항/평가기준 탐지의 기본 단위로 쓴다.
 */
function groupItemsIntoLines(items: Array<{ str: string; transform: number[] }>): string[] {
  type PositionedItem = { str: string; x: number; y: number }

  const positioned: PositionedItem[] = items
    .filter((item) => item.str.trim().length > 0)
    .map((item) => ({
      str: item.str,
      x: item.transform[4],
      y: item.transform[5],
    }))

  const lines: PositionedItem[][] = []
  for (const item of positioned) {
    const line = lines.find((candidate) => Math.abs(candidate[0].y - item.y) <= LINE_Y_TOLERANCE)
    if (line) {
      line.push(item)
    } else {
      lines.push([item])
    }
  }

  // Y좌표는 PDF 좌표계에서 아래→위로 증가하므로 내림차순 정렬해야 화면상 위→아래 순서가 된다.
  lines.sort((a, b) => b[0].y - a[0].y)

  return lines
    .map((line) =>
      line
        .sort((a, b) => a.x - b.x)
        .map((item) => item.str)
        .join('')
        .replace(/\s+/g, ' ')
        .trim()
    )
    .filter((text) => text.length > 0)
}

export async function extractPdfText(file: File): Promise<ExtractedRfp> {
  const pdfjs = await loadPdfjs()

  const arrayBuffer = await file.arrayBuffer()
  const doc = await pdfjs.getDocument({ data: arrayBuffer }).promise

  const pages: RfpPage[] = []
  const lines: RfpLine[] = []

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum)
    const textContent = await page.getTextContent()

    const pageLines = groupItemsIntoLines(
      textContent.items as Array<{ str: string; transform: number[] }>
    )

    for (const lineText of pageLines) {
      lines.push({ page: pageNum, text: lineText })
    }

    pages.push({ page: pageNum, text: pageLines.join('\n') })
  }

  return {
    pages,
    lines,
    fullText: pages.map((p) => p.text).join('\n'),
  }
}
