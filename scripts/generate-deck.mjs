/**
 * RFP PDF 하나를 PPTX 하나로 만든다. 화면에서 사람이 하는 일을 Node에서 그대로 한다.
 *
 *   node scripts/generate-deck.mjs <RFP.pdf> [출력.pptx]
 *
 * 화면과 같은 순서·같은 인자로 앱의 함수를 부른다(src/app/page.tsx와
 * RfpUploader·RfpAnalysis·WinThemeStep·ProposerForm). 배치용으로 고쳐 쓴
 * 사본이 아니라 앱 코드를 그대로 import 하므로, 결과가 화면과 갈라지지 않는다.
 *
 * 화면에서 사람이 고르는 것은 기본값을 쓴다.
 *   - 요구사항 선택: 전체 (RfpAnalysis의 초기 상태)
 *   - Win Theme:    첫 번째 (WinThemeStep의 초기 선택)
 *   - 제안사 정보:   아래 상수. 회사 소개·실적은 비워 두므로 해당 슬라이드는 빠진다.
 *
 * 이 파일은 .mjs이고 scripts/ 아래에 있어 next build 대상이 아니다.
 */
import fs from 'node:fs'
import path from 'node:path'
import { register } from 'node:module'
import { pathToFileURL } from 'node:url'

register('./ts-hooks.mjs', import.meta.url)

const ROOT = path.resolve(import.meta.dirname, '..')
const COMPANY = { companyName: '(주)제안사', preparedBy: '영업팀' }

/**
 * Node용 pdfjs를 준비한다.
 *
 * 앱의 loadPdfjs()는 여기서 못 쓴다. 'pdfjs-dist' 메인 엔트리는 Node에서
 * DOMMatrix를 찾다 죽고(pdfjs가 스스로 legacy 빌드를 쓰라고 경고한다),
 * workerSrc의 '/pdf.worker.min.mjs'는 웹 공개 경로라 파일 시스템에서는
 * C:\pdf.worker.min.mjs로 읽혀 없는 파일이 된다. legacy 빌드를 쓰고
 * worker는 node_modules의 실제 파일을 file:// 로 가리킨다.
 */
async function loadPdfjsForNode() {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(
    path.join(ROOT, 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs')
  ).href
  return pdfjs
}

export async function generateDeck(pdfPath, { log = () => {} } = {}) {
  const { extractPdfTextWith } = await import('../src/lib/rfp/extractText.ts')
  const { analyzeRfp } = await import('../src/lib/rfp/analyze.ts')
  const { buildStrategyBrief } = await import('../src/lib/rfp/strategy.ts')
  const { buildRfpSource } = await import('../src/lib/rfp/prefill.ts')
  const { buildWinThemes } = await import('../src/lib/rfp/winTheme.ts')
  const { defaultCompanyProfile } = await import('../src/lib/companyProfile.ts')
  const { generateProposalPptx } = await import('../src/lib/generatePptx.ts')

  const fileName = path.basename(pdfPath)

  // ── RfpUploader.handleFile ──
  const pdfjs = await loadPdfjsForNode()
  const extracted = await extractPdfTextWith(pdfjs, new Uint8Array(fs.readFileSync(pdfPath)))
  log('extract', `${extracted.pages.length}쪽 · ${extracted.lines.length}줄 · ${extracted.fullText.length}자`)

  const analysis = analyzeRfp(extracted)
  const meta = Object.entries(analysis.meta).filter(([, v]) => v)
  log(
    'analyze',
    `메타 ${meta.length}/5 · 요구사항 ${analysis.requirements.length}건 · 평가 ${analysis.evaluations.length}건`
  )

  const brief = buildStrategyBrief(extracted, analysis)
  log(
    'strategy',
    `배경 ${brief.background.length} · 평가초점 ${brief.focus.length} · 준수사항 ${brief.compliance.length} · 키워드 ${brief.keywords.length}`
  )

  // ── RfpAnalysis: 요구사항은 기본으로 전부 선택돼 있다 ──
  const selectedIds = new Set(analysis.requirements.map((r) => r.id))
  // brief와 lines는 선택 인자다. 빠뜨리면 background·focus가 통째로 없어져
  // AS-IS/TO-BE와 평가 상세 슬라이드가 사라진다.
  const rfp = buildRfpSource(analysis, selectedIds, fileName, brief, extracted.lines)
  log(
    'prefill',
    `요구 ${rfp.requirements.length} · 평가 ${rfp.evaluations.length} · 배경 ${rfp.background?.length ?? 0} · 초점 ${rfp.focus?.length ?? 0}`
  )

  // ── WinThemeStep: 첫 번째가 기본 선택 ──
  const themes = buildWinThemes(analysis, brief)
  const picked = themes[0]
  const winTheme = picked
    ? { angle: picked.angle, headline: picked.headline, evidence: picked.evidence }
    : null
  log('wintheme', themes.length ? `${themes.length}개 중 "${picked.angle}"` : '생성된 테마 없음')

  // ── ProposerForm.handleSubmit → POST /api/generate → route.ts ──
  const formData = {
    ...COMPANY,
    preparedDate: new Date().toISOString().split('T')[0],
    winTheme,
    brand: { logoDataUrl: null, colors: [], primary: null },
    companyProfile: defaultCompanyProfile(),
    rfp,
  }

  // 화면은 이 데이터를 JSON으로 직렬화해 /api/generate로 보내고, route.ts가
  // 되돌린 것을 generateProposalPptx에 넘긴다. 배치도 같은 왕복을 거쳐야
  // undefined처럼 JSON에서 사라지는 것이 화면과 다르게 남지 않는다.
  const buffer = await generateProposalPptx(JSON.parse(JSON.stringify(formData)))
  log('generate', `${buffer.length.toLocaleString()} 바이트`)

  return { buffer, formData, analysis, brief, rfp, themes, extracted }
}

if (process.argv[1] === import.meta.filename) {
  const [pdfPath, outArg] = process.argv.slice(2)
  if (!pdfPath) {
    console.error('사용법: node scripts/generate-deck.mjs <RFP.pdf> [출력.pptx]')
    process.exit(1)
  }
  const out = outArg ?? path.join(ROOT, path.basename(pdfPath).replace(/\.pdf$/i, '.pptx'))

  const { buffer } = await generateDeck(pdfPath, {
    log: (stage, detail) => console.log(`  ${stage.padEnd(9)} ${detail}`),
  })
  fs.writeFileSync(out, buffer)
  console.log(`\n  → ${out}`)
}
