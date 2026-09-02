/**
 * PPTX 손상 검사.
 *
 *   node scripts/validate-pptx.mjs <파일.pptx> [...]
 *
 * OOXML은 zip 안의 XML 파트와 그들 사이의 관계 그래프다. 어느 한쪽이 깨지면
 * PowerPoint가 "복구가 필요합니다"를 띄우는데, 그때는 이미 늦다. 다음을 본다.
 *
 *   1) 모든 zip 엔트리가 압축 해제되는가
 *   2) 모든 XML 파트의 태그가 짝이 맞는가
 *   3) [Content_Types].xml이 슬라이드·차트 파트를 선언했는가
 *   4) 슬라이드가 r:id / r:embed 로 가리키는 관계가 .rels 에 실제로 있는가
 *   5) 차트 XML이 값을 담고 있는가
 *
 * 외부 의존성 없이 돌아야 해서 zip과 XML을 직접 읽는다. 다만 (2)는 태그
 * 균형까지만 보는 것이고, 스키마가 맞는지는 보지 않는다. "열린다"의 최종
 * 확인은 실제로 여는 것(LibreOffice 변환 등)이다.
 */
import fs from 'node:fs'
import zlib from 'node:zlib'

function unzip(buf) {
  const out = new Map()
  let i = 0
  while (i < buf.length - 4) {
    if (buf.readUInt32LE(i) !== 0x04034b50) {
      i++
      continue
    }
    const nameLen = buf.readUInt16LE(i + 26)
    const extraLen = buf.readUInt16LE(i + 28)
    const name = buf.subarray(i + 30, i + 30 + nameLen).toString()
    const method = buf.readUInt16LE(i + 8)
    const size = buf.readUInt32LE(i + 18)
    const start = i + 30 + nameLen + extraLen
    out.set(name, { method, data: buf.subarray(start, start + size) })
    i = start + size
  }
  return out
}

/**
 * 태그 균형 검사. 선언·주석·CDATA·처리 지시를 건너뛰고 여는 태그와 닫는
 * 태그를 짝지어 본다. 잘린 파일이나 어긋난 중첩을 잡는다.
 */
function tagsBalanced(xml) {
  const stack = []
  const re = /<(\/)?([A-Za-z_][\w.:-]*)|<!--|<!\[CDATA\[|<\?|<!/g
  let m
  while ((m = re.exec(xml))) {
    const token = m[0]
    if (token === '<!--') {
      const end = xml.indexOf('-->', re.lastIndex)
      if (end < 0) return '주석이 닫히지 않음'
      re.lastIndex = end + 3
      continue
    }
    if (token === '<![CDATA[') {
      const end = xml.indexOf(']]>', re.lastIndex)
      if (end < 0) return 'CDATA가 닫히지 않음'
      re.lastIndex = end + 3
      continue
    }
    if (token === '<?' || token === '<!') {
      const end = xml.indexOf('>', re.lastIndex)
      if (end < 0) return '선언이 닫히지 않음'
      re.lastIndex = end + 1
      continue
    }

    const close = xml.indexOf('>', re.lastIndex)
    if (close < 0) return `<${m[2]}> 가 닫히지 않음`
    const selfClosing = xml[close - 1] === '/'
    re.lastIndex = close + 1

    if (m[1]) {
      if (stack.pop() !== m[2]) return `</${m[2]}> 짝이 맞지 않음`
    } else if (!selfClosing) {
      stack.push(m[2])
    }
  }
  return stack.length ? `닫히지 않은 태그 ${stack.length}개 (${stack.slice(-3).join(', ')})` : null
}

export function validatePptx(file) {
  const problems = []
  const notes = []
  const zip = unzip(fs.readFileSync(file))

  // 1) 압축 해제
  const parts = new Map()
  for (const [name, { method, data }] of zip) {
    try {
      parts.set(name, method === 8 ? zlib.inflateRawSync(data) : data)
    } catch {
      problems.push(`압축 해제 실패: ${name}`)
    }
  }
  notes.push(`zip 엔트리 ${zip.size}개`)

  // 2) 태그 균형
  const xmlParts = [...parts.keys()].filter((n) => n.endsWith('.xml') || n.endsWith('.rels'))
  for (const name of xmlParts) {
    const bad = tagsBalanced(parts.get(name).toString('utf8'))
    if (bad) problems.push(`XML 파손 ${name}: ${bad}`)
  }
  notes.push(`XML 파트 ${xmlParts.length}개`)

  // 3) Content_Types 선언
  const contentTypes = parts.get('[Content_Types].xml')?.toString('utf8') ?? ''
  const slides = [...parts.keys()].filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
  const charts = [...parts.keys()].filter((n) => /^ppt\/charts\/chart\d+\.xml$/.test(n))
  for (const name of [...slides, ...charts]) {
    if (!contentTypes.includes('/' + name)) problems.push(`Content_Types 누락: ${name}`)
  }
  notes.push(`슬라이드 ${slides.length}장 · 차트 ${charts.length}개`)

  // 4) 관계 참조 무결성
  for (const slide of slides) {
    const relName = slide.replace('slides/', 'slides/_rels/') + '.rels'
    const rels = parts.get(relName)?.toString('utf8')
    if (!rels) {
      problems.push(`${slide}의 .rels 없음`)
      continue
    }
    const ids = new Set([...rels.matchAll(/Id="([^"]+)"/g)].map((m) => m[1]))
    for (const [, used] of parts.get(slide).toString('utf8').matchAll(/r:(?:id|embed)="([^"]+)"/g)) {
      if (!ids.has(used)) problems.push(`${slide} → ${used} 관계 없음`)
    }
  }

  // 5) 차트 내용
  for (const chart of charts) {
    const values = [...parts.get(chart).toString('utf8').matchAll(/<c:v>([^<]*)<\/c:v>/g)].map((m) => m[1])
    const numeric = values.filter((v) => /^-?\d+(\.\d+)?$/.test(v))
    if (numeric.length === 0) problems.push(`${chart}: 값이 비어 있음`)
  }

  return { problems, notes, slides: slides.length, charts: charts.length }
}

if (process.argv[1] === import.meta.filename) {
  let failed = false
  for (const file of process.argv.slice(2)) {
    const { problems, notes } = validatePptx(file)
    console.log(`\n═══ ${file.split(/[\\/]/).pop()} ═══`)
    console.log(`  ${notes.join(' · ')}`)
    if (problems.length === 0) {
      console.log('  이상 없음')
    } else {
      failed = true
      problems.forEach((p) => console.log(`  [FAIL] ${p}`))
    }
  }
  process.exit(failed ? 1 : 0)
}
