/**
 * 브랜드 로고에서 대표색을 뽑고, 그 한 색으로 제안서 전체 팔레트를 만든다.
 *
 * - extractLogoColors()는 canvas를 쓰므로 브라우저 전용이다.
 * - buildPalette()는 순수 함수라 서버(generatePptx)에서도 그대로 쓴다.
 *
 * PPTX 색은 '#' 없는 6자리 hex를 요구하므로, 팔레트 값은 모두 '#' 없이 보관한다.
 */

// 로고를 넣지 않았을 때 쓰는 기본색 (앱 UI의 오렌지와 동일)
export const DEFAULT_BRAND = '#EA580C'

export interface BrandPalette {
  brand: string      // 강조·라벨
  brandDeep: string  // 제목·표 헤더 배경
  brandDark: string  // 표지·마무리 배경
  brandMid: string   // 어두운 면 위 강조
  brandPale: string  // 어두운 면 위 보조 텍스트
  paper: string      // 어두운 면 위 본문
  ink: string
  gray: string
  line: string
  band: string       // 표 줄무늬
  white: string
}

// ── 색 계산 ──────────────────────────────────────────────────────────────────

type Rgb = { r: number; g: number; b: number }

function parseHex(hex: string): Rgb {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  }
}

function toHex({ r, g, b }: Rgb): string {
  return [r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('')
}

/** a에서 b쪽으로 t만큼(0~1) 섞는다. */
function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  }
}

function luminance({ r, g, b }: Rgb): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function saturation({ r, g, b }: Rgb): number {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  return max === 0 ? 0 : (max - min) / max
}

const BLACK: Rgb = { r: 13, g: 13, b: 13 }
const WHITE: Rgb = { r: 255, g: 255, b: 255 }

/**
 * 대표색 하나에서 제안서 팔레트를 파생한다.
 * 밝은 로고색(노랑 등)은 그대로 쓰면 흰 배경에서 글자가 읽히지 않으므로,
 * 제목·표 헤더용 brandDeep은 최소 밝기 이하가 되도록 더 눌러 준다.
 */
export function buildPalette(primaryHex: string = DEFAULT_BRAND): BrandPalette {
  const primary = parseHex(primaryHex)
  const lum = luminance(primary)

  // 밝은 색일수록 더 많이 어둡게 섞어야 본문 대비가 확보된다.
  const deepAmount = lum > 170 ? 0.62 : lum > 120 ? 0.5 : 0.38

  return {
    brand: toHex(primary),
    brandDeep: toHex(mix(primary, BLACK, deepAmount)),
    brandDark: toHex(mix(primary, BLACK, 0.82)),
    brandMid: toHex(mix(primary, WHITE, 0.34)),
    brandPale: toHex(mix(primary, WHITE, 0.68)),
    paper: toHex(mix(primary, WHITE, 0.94)),
    ink: '111111',
    gray: '767676',
    line: 'E4E4E4',
    band: 'FAFAFA',
    white: 'FFFFFF',
  }
}

// ── 로고 색 추출 (브라우저 전용) ─────────────────────────────────────────────

const SAMPLE_SIZE = 160       // 색 분석용 축소 크기
const EMBED_MAX_SIZE = 480    // PPTX에 넣을 이미지 최대 변 길이
const MAX_COLORS = 6

export interface LogoAnalysis {
  dataUrl: string   // PPTX 삽입용 (축소된 PNG)
  colors: string[]  // 추출된 색 (#RRGGBB, 대표색부터)
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('이미지를 읽지 못했습니다.'))
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('이미지 형식을 인식하지 못했습니다.'))
    img.src = src
  })
}

/** 원본 비율을 유지하며 max 이내로 줄인 캔버스를 만든다. */
function drawScaled(img: HTMLImageElement, max: number): HTMLCanvasElement {
  const ratio = Math.min(1, max / Math.max(img.width || max, img.height || max))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round((img.width || max) * ratio))
  canvas.height = Math.max(1, Math.round((img.height || max) * ratio))
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas
}

export async function extractLogoColors(file: File): Promise<LogoAnalysis> {
  const originalDataUrl = await readAsDataUrl(file)
  const img = await loadImage(originalDataUrl)

  // 1) 색 분석 — 작게 그려서 픽셀을 훑는다.
  const sample = drawScaled(img, SAMPLE_SIZE)
  const { data } = sample.getContext('2d')!.getImageData(0, 0, sample.width, sample.height)

  // 5비트 양자화 버킷으로 모아 유사색을 한 덩어리로 만든다.
  const buckets = new Map<number, { count: number; r: number; g: number; b: number }>()
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]]
    if (a < 128) continue

    const rgb = { r, g, b }
    const lum = luminance(rgb)
    // 로고 배경(흰색)과 테두리(검정)는 브랜드색이 아니다.
    if (lum > 242 || lum < 16) continue

    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3)
    const bucket = buckets.get(key)
    if (bucket) {
      bucket.count++
      bucket.r += r
      bucket.g += g
      bucket.b += b
    } else {
      buckets.set(key, { count: 1, r, g, b })
    }
  }

  // 넓이만으로 고르면 무채색 배경이 이기므로 채도에 가중치를 준다.
  const ranked = Array.from(buckets.values())
    .map((bucket) => {
      const rgb = {
        r: bucket.r / bucket.count,
        g: bucket.g / bucket.count,
        b: bucket.b / bucket.count,
      }
      return { rgb, score: bucket.count * (0.3 + saturation(rgb)) }
    })
    .sort((a, b) => b.score - a.score)

  // 눈에 띄게 다른 색만 남긴다.
  const picked: Rgb[] = []
  for (const { rgb } of ranked) {
    const tooClose = picked.some(
      (p) => Math.abs(p.r - rgb.r) + Math.abs(p.g - rgb.g) + Math.abs(p.b - rgb.b) < 90
    )
    if (!tooClose) picked.push(rgb)
    if (picked.length >= MAX_COLORS) break
  }

  // 2) PPTX 삽입용 — payload가 커지지 않도록 축소해서 다시 인코딩한다.
  const embed = drawScaled(img, EMBED_MAX_SIZE)

  return {
    dataUrl: embed.toDataURL('image/png'),
    colors: picked.map((rgb) => `#${toHex(rgb)}`),
  }
}
