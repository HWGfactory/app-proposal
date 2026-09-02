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
function groupItemsIntoLines(
  items: Array<{ str: string; transform: number[]; width?: number; height?: number }>
): string[] {
  type PositionedItem = { str: string; x: number; y: number; w: number; h: number }

  const positioned: PositionedItem[] = items
    .filter((item) => item.str.trim().length > 0)
    .map((item) => ({
      str: item.str,
      x: item.transform[4],
      y: item.transform[5],
      w: item.width ?? 0,
      h: item.height || Math.abs(item.transform[3]) || 10,
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
    .map((line) => joinLine(line.sort((a, b) => a.x - b.x)))
    .filter((text) => text.length > 0)
}

// 공백 하나의 너비는 글자 크기에 비례한다. 한글 본문에서 이보다 좁은 틈은
// 자간이고, 넓은 틈은 지워진 공백이다.
const SPACE_GAP_RATIO = 0.22

/**
 * 한 줄의 조각들을 이어붙인다.
 *
 * PDF는 공백을 글자로 담지 않고 다음 조각을 그만큼 오른쪽에 두는 일이 많다.
 * 그래서 그냥 이어붙이면 "정확한답변을", "야간및휴일상담이"처럼 낱말이 붙어
 * 나오고, 제안서에는 그것이 제안사의 오타로 읽힌다. 조각 사이의 가로 간격을
 * 재서 공백이었던 자리를 되살린다.
 */
function joinLine(line: Array<{ str: string; x: number; w: number; h: number }>): string {
  let out = ''
  for (let i = 0; i < line.length; i++) {
    const cur = line[i]
    if (i > 0) {
      const prev = line[i - 1]
      const gap = cur.x - (prev.x + prev.w)
      const needsSpace = gap > prev.h * SPACE_GAP_RATIO
      if (needsSpace && !/\s$/.test(out) && !/^\s/.test(cur.str)) out += ' '
    }
    out += cur.str
  }
  return out.replace(/\s+/g, ' ').trim()
}

/** 이 파일이 pdfjs에서 실제로 쓰는 부분만 적은 최소 형태. */
export interface PdfjsLike {
  getDocument(src: { data: ArrayBuffer | Uint8Array }): {
    promise: Promise<{
      numPages: number
      getPage(pageNumber: number): Promise<{
        getTextContent(): Promise<{ items: unknown[] }>
      }>
    }>
  }
}

/**
 * 이미 불러온 pdfjs로 텍스트를 뽑는다. 모듈을 밖에서 받는 입구다.
 *
 * Node에서는 위의 loadPdfjs()가 쓸 수 없다. 'pdfjs-dist' 메인 엔트리는
 * DOMMatrix를 찾다 죽고(pdfjs 자신이 legacy 빌드를 쓰라고 경고한다),
 * workerSrc의 '/pdf.worker.min.mjs'는 웹 공개 경로라 파일 시스템에는 없다.
 * 그렇다고 여기에 Node 분기를 넣으면 legacy 빌드가 클라이언트 번들에
 * 딸려 들어간다. 그래서 모듈 선택은 호출부에 맡기고, 줄 재구성 로직만
 * 공유한다. 브라우저와 배치의 결과가 같아야 하는 부분은 그쪽이다.
 */
export async function extractPdfTextWith(
  pdfjs: PdfjsLike,
  data: ArrayBuffer | Uint8Array
): Promise<ExtractedRfp> {
  const doc = await pdfjs.getDocument({ data }).promise

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

/** 브라우저 경로. 종전과 동일하다. */
export async function extractPdfText(file: File): Promise<ExtractedRfp> {
  const pdfjs = await loadPdfjs()
  return extractPdfTextWith(pdfjs, await file.arrayBuffer())
}
