/**
 * RFP 여러 개를 배치로 돌려 PPTX와 지표 리포트를 만든다.
 *
 *   node scripts/batch-report.mjs [시작] [끝]        (기본 1 100)
 *
 * 하나가 죽어도 나머지는 계속 간다. 목표는 "전부 성공"이 아니라 "전부 시도하고
 * 성공·실패를 남기는 것"이다. 실패한 문서가 어떤 형식이었는지가 그 자체로
 * 약점 정보이므로, 실패해도 설계상_* 열은 채운다.
 *
 * 파이프라인은 generate-deck.mjs를 그대로 쓴다. 그쪽이 화면과 대조해 검증된
 * 경로이므로 여기서 다시 짜면 결과가 갈라진다.
 */
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { generateDeck } from './generate-deck.mjs'
import { validatePptx } from './validate-pptx.mjs'
import {
  describe, effectiveScore, evalTitleHasSuffix, reqTitleHasKind, headingRecognized,
} from './rfp-plan.mjs'

const ROOT = path.resolve(import.meta.dirname, '..')
// 시험용으로 다른 폴더에 돌릴 수 있게 열어 둔다. 기본값이 실제 경로다.
const SRC_DIR = process.env.RFP_SRC ?? 'C:/Users/hongp/Documents/RFP TEST/TEST'
const OUT_DIR = process.env.RFP_OUT ?? 'C:/Users/hongp/Documents/RFP TEST/RESULT'

// ── 설계값이 문서를 만든 생성기와 같은지 대조 ────────────────────────────────
// 베껴 온 배정이므로 맞다고 주장하지 않고 원본과 100개를 맞춰 본다.
const GENERATOR =
  'C:/Users/hongp/AppData/Local/Temp/claude/C--Users-hongp-Documents-Automation-Proposal-app-proposal/' +
  '3c91e394-d089-440a-b30c-798922d62201/scratchpad/rfpgen.mjs'

async function checkPlan() {
  if (!fs.existsSync(GENERATOR)) {
    console.log('  [경고] 원본 생성기를 찾을 수 없어 설계값을 대조하지 못했다.')
    return
  }
  const { describe: origin } = await import(pathToFileURL(GENERATOR).href)
  const mismatched = []
  for (let i = 1; i <= 100; i++) {
    const a = JSON.stringify(describe(i))
    const b = JSON.stringify(origin(i))
    if (a !== b) mismatched.push(`rfp_${String(i).padStart(3, '0')}\n    이곳: ${a}\n    원본: ${b}`)
  }
  if (mismatched.length) {
    console.log(`  [중단] 설계값이 원본 생성기와 다르다 (${mismatched.length}개)`)
    mismatched.slice(0, 3).forEach((m) => console.log('    ' + m))
    process.exit(1)
  }
  console.log('  설계값 대조: 100/100 원본 생성기와 일치')
}

/**
 * generatePptx.ts의 MEASURABLE을 소스에서 그대로 읽어 온다.
 *
 * 이 상수는 export가 아니고 앱 코드는 고치지 않기로 했다. 베껴 쓰면 언젠가
 * 갈라지므로 정의된 줄을 읽어 정규식을 만든다. 줄이 사라지면 바로 멈춘다.
 */
function loadMeasurable() {
  const src = fs.readFileSync(path.join(ROOT, 'src/lib/generatePptx.ts'), 'utf8')
  const m = src.match(/^const MEASURABLE = \/(.+)\/([a-z]*)$/m)
  if (!m) throw new Error('generatePptx.ts에서 MEASURABLE 정의를 찾지 못했다')
  return { re: new RegExp(m[1], m[2]), source: `/${m[1]}/${m[2]}` }
}

const COLUMNS = [
  '파일명', '성공/실패', '실패사유',
  '설계상_배점형식', '설계상_제목체계', '설계상_요구표기', '설계상_도메인', '설계상_까다로움',
  '설계상_메타표기',
  // 이번에 갈린 세 축. 이것이 없으면 "평가 0건"의 원인이 문구인지 번호인지
  // 구분되지 않는다.
  '설계상_평가제목', '평가제목_접미어유무', '설계상_요구제목', '요구제목_유형단어유무',
  '제목_번호인식',
  '메타_사업명잡힘', '메타_발주기관잡힘', '메타_예산잡힘', '메타_기간잡힘',
  '요구사항_수', '요구사항_전부기타', '평가_항목수', '수치목표_수', '슬라이드_수',
]

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
const yn = (v) => (v ? 'Y' : 'N')

async function runOne(i, measurable) {
  const id = `rfp_${String(i).padStart(3, '0')}`
  const plan = describe(i)
  const row = {
    파일명: id,
    '성공/실패': '실패',
    실패사유: '',
    설계상_배점형식: plan.score,
    설계상_제목체계: plan.heading,
    설계상_요구표기: plan.req,
    설계상_도메인: plan.domain,
    설계상_까다로움: plan.hostile,
    설계상_메타표기: plan.meta,
    설계상_평가제목: plan.evalTitle,
    평가제목_접미어유무: evalTitleHasSuffix(i) ? 'O' : 'X',
    설계상_요구제목: plan.reqTitle,
    요구제목_유형단어유무: reqTitleHasKind(i) ? 'O' : 'X',
    제목_번호인식: headingRecognized(i) ? 'O' : 'X',
    메타_사업명잡힘: '', 메타_발주기관잡힘: '', 메타_예산잡힘: '', 메타_기간잡힘: '',
    요구사항_수: '', 요구사항_전부기타: '', 평가_항목수: '', 수치목표_수: '', 슬라이드_수: '',
  }

  try {
    const { buffer, analysis, rfp } = await generateDeck(path.join(SRC_DIR, `${id}.pdf`))
    const out = path.join(OUT_DIR, `${id}.pptx`)
    fs.writeFileSync(out, buffer)
    const { slides, problems } = validatePptx(out)

    const reqs = rfp.requirements
    row['성공/실패'] = '성공'
    row.메타_사업명잡힘 = yn(analysis.meta.projectName)
    row.메타_발주기관잡힘 = yn(analysis.meta.client)
    row.메타_예산잡힘 = yn(analysis.meta.budget)
    row.메타_기간잡힘 = yn(analysis.meta.duration)
    row.요구사항_수 = reqs.length
    row.요구사항_전부기타 = yn(reqs.length > 0 && reqs.every((r) => r.kind === '기타'))
    row.평가_항목수 = rfp.evaluations.length
    row.수치목표_수 = reqs.filter((r) => measurable.test(r.requirement)).length
    row.슬라이드_수 = slides
    return { row, corrupt: problems.length > 0 ? problems[0] : null }
  } catch (e) {
    row.실패사유 = String(e?.message ?? e).split('\n')[0].slice(0, 200)
    return { row, corrupt: null }
  }
}

// ── 집계 ─────────────────────────────────────────────────────────────────────
function tally(rows, keyOf) {
  const c = {}
  rows.forEach((r) => {
    const k = keyOf(r)
    c[k] = (c[k] ?? 0) + 1
  })
  return Object.entries(c).sort((a, b) => b[1] - a[1])
}
const fmt = (pairs) => pairs.map(([k, v]) => `${k} ${v}`).join(', ')

function summarize(rows, corrupts, from, to) {
  const L = []
  const say = (s = '') => L.push(s)

  const ok = rows.filter((r) => r['성공/실패'] === '성공')
  const bad = rows.filter((r) => r['성공/실패'] === '실패')

  say(`대상 rfp_${String(from).padStart(3, '0')} ~ rfp_${String(to).padStart(3, '0')} (${rows.length}개)`)
  say('')
  say(`1. 성공 ${ok.length}개 / 실패 ${bad.length}개`)
  if (bad.length) bad.forEach((r) => say(`     ${r.파일명} [${r.설계상_배점형식} · ${r.설계상_요구표기}] ${r.실패사유}`))
  else say('     실패 없음')

  const zeroEval = ok.filter((r) => r.평가_항목수 === 0)
  say('')
  say(`2. 평가 항목 0건: ${zeroEval.length}개 / 성공 ${ok.length}개`)
  say(`     배정된 배점형식별: ${fmt(tally(zeroEval, (r) => r.설계상_배점형식))}`)
  say('')
  // ★ 배점이 숫자인 문서만 놓고 [번호인식 × 접미어] 2×2로 본다. 나머지 배점
  //   형식은 애초에 뽑을 숫자가 없어 0건이 정상이다.
  const numeric = ok.filter(
    (r) => (r.설계상_배점형식 === '점수 30점' || r.설계상_배점형식 === '가중치 30%') &&
      r.설계상_까다로움 !== '평가 기준 없음'
  )
  say(`   ★ 배점이 숫자인 ${numeric.length}개를 [제목 번호인식 × 평가제목 접미어]로:`)
  say('                       접미어 O            접미어 X')
  for (const h of ['O', 'X']) {
    const cells = ['O', 'X'].map((s) => {
      const g = numeric.filter((r) => r.제목_번호인식 === h && r.평가제목_접미어유무 === s)
      const got = g.filter((r) => r.평가_항목수 > 0).length
      return `${got}/${g.length} 잡힘`.padEnd(20)
    })
    say(`     번호인식 ${h}          ${cells.join('')}`)
  }
  // 까다로움 "평가 기준 없음"은 배점 형식을 덮어써서 문서에 평가 절이 없다.
  // 배정값으로만 세면 그 문서가 "점수인데 0건"으로 잘못 잡힌다.
  say(`     실효 배점형식별: ${fmt(tally(zeroEval, (r) => (r.설계상_까다로움 === '평가 기준 없음' ? '평가섹션 없음(까다로움)' : r.설계상_배점형식)))}`)
  const realBug = zeroEval.filter(
    (r) => r.설계상_까다로움 !== '평가 기준 없음' && (r.설계상_배점형식 === '점수 30점' || r.설계상_배점형식 === '가중치 30%')
  )
  say(`     ★ 배점 숫자가 있는데 0건(진짜 실패): ${realBug.length}개  ${realBug.map((r) => r.파일명).join(', ')}`)

  const noClient = ok.filter((r) => r.메타_발주기관잡힘 === 'N')
  say('')
  say(`3. 발주기관 못 잡음: ${noClient.length}개`)
  say(`     발주 라벨별: ${fmt(tally(noClient, (r) => r.__client))}`)
  say('   ★ 메타 표기별 (진짜 약점 1호 재확인):')
  for (const [style, all] of tally(ok, (r) => r.설계상_메타표기)) {
    const miss = noClient.filter((r) => r.설계상_메타표기 === style).length
    say(`       ${style.padEnd(10)} ${String(miss).padStart(2)} / ${all} 실패`)
  }

  const allEtc = ok.filter((r) => r.요구사항_전부기타 === 'Y')
  say('')
  say(`4. 요구사항이 전부 '기타': ${allEtc.length}개`)
  say(`     요구 표기별: ${fmt(tally(allEtc, (r) => r.설계상_요구표기))}`)
  say('')
  say(`   ★ [제목 번호인식 × 요구제목 유형단어]로 (유형 분류 성공 = 전부기타가 아님):`)
  say('                       유형단어 O          유형단어 X')
  for (const h of ['O', 'X']) {
    const cells = ['O', 'X'].map((k) => {
      const g = ok.filter((r) => r.제목_번호인식 === h && r.요구제목_유형단어유무 === k)
      const good = g.filter((r) => r.요구사항_전부기타 === 'N').length
      return `${good}/${g.length} 분류됨`.padEnd(20)
    })
    say(`     번호인식 ${h}          ${cells.join('')}`)
  }
  say('')
  // ★ 세 번째 약점의 규모: 번호가 안 붙은 제목 체계가 통째로 무력화되는가.
  const unrec = ok.filter((r) => r.제목_번호인식 === 'X')
  const rec = ok.filter((r) => r.제목_번호인식 === 'O')
  const rate = (g, f) => (g.length ? `${g.filter(f).length}/${g.length}` : '0/0')
  say(`   ★ 제목 번호인식 X(번호없음·혼합 체계) ${unrec.length}개의 규모:`)
  say(`       평가 잡힘      번호인식 X ${rate(unrec, (r) => r.평가_항목수 > 0)}   ·   번호인식 O ${rate(rec, (r) => r.평가_항목수 > 0)}`)
  say(`       유형 분류됨    번호인식 X ${rate(unrec, (r) => r.요구사항_전부기타 === 'N')}   ·   번호인식 O ${rate(rec, (r) => r.요구사항_전부기타 === 'N')}`)

  const noReq = ok.filter((r) => r.요구사항_수 === 0)
  say('')
  say(`5. 요구사항 0건(파싱 완전 실패): ${noReq.length}개  ${noReq.map((r) => r.파일명).join(', ')}`)

  const slides = ok.map((r) => r.슬라이드_수)
  say('')
  if (slides.length) {
    const avg = slides.reduce((a, b) => a + b, 0) / slides.length
    say(`6. 슬라이드 수: 최소 ${Math.min(...slides)} · 최대 ${Math.max(...slides)} · 평균 ${avg.toFixed(1)}`)
    say(`     분포: ${fmt(tally(ok, (r) => `${r.슬라이드_수}장`).sort((a, b) => parseInt(a[0]) - parseInt(b[0])))}`)
  } else {
    say('6. 슬라이드 수: 성공한 문서가 없다')
  }

  if (corrupts.length) {
    say('')
    say(`(추가) PPTX 구조 이상: ${corrupts.length}개`)
    corrupts.forEach(([id, p]) => say(`     ${id}: ${p}`))
  }
  return L.join('\n')
}

// ── 실행 ─────────────────────────────────────────────────────────────────────
const from = Number(process.argv[2] ?? 1)
const to = Number(process.argv[3] ?? 100)

fs.mkdirSync(OUT_DIR, { recursive: true })
await checkPlan()
const measurable = loadMeasurable()
console.log(`  MEASURABLE: ${measurable.source}  (generatePptx.ts에서 읽음)`)
console.log('')

const rows = []
const corrupts = []
const started = Date.now()
for (let i = from; i <= to; i++) {
  const { row, corrupt } = await runOne(i, measurable.re)
  row.__client = describe(i).client
  rows.push(row)
  if (corrupt) corrupts.push([row.파일명, corrupt])
  const mark = row['성공/실패'] === '성공' ? ' ' : '!'
  console.log(
    `${mark} ${row.파일명}  ${row['성공/실패']}  ` +
      (row['성공/실패'] === '성공'
        ? `요구 ${String(row.요구사항_수).padStart(2)} · 평가 ${String(row.평가_항목수).padStart(2)} · 수치 ${String(row.수치목표_수).padStart(2)} · ${row.슬라이드_수}장`
        : row.실패사유)
  )
}

const csv =
  '\uFEFF' +
  [COLUMNS.join(','), ...rows.map((r) => COLUMNS.map((c) => csvCell(r[c])).join(','))].join('\r\n')
fs.writeFileSync(path.join(OUT_DIR, 'report.csv'), csv, 'utf8')

const summary = summarize(rows, corrupts, from, to)
fs.writeFileSync(path.join(OUT_DIR, 'report_summary.txt'), summary, 'utf8')

console.log('\n' + '═'.repeat(66))
console.log(summary)
console.log('═'.repeat(66))
console.log(`\n  ${((Date.now() - started) / 1000).toFixed(1)}초 · ${OUT_DIR}\\report.csv · report_summary.txt`)
