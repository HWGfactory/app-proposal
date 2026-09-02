/**
 * Node가 앱의 .ts 모듈을 그대로 불러올 수 있게 하는 해석 훅.
 *
 * Node 24는 타입을 스스로 지우지만(process.features.typescript === 'strip'),
 * 모듈 경로는 못 고친다. 앱 코드는 tsconfig의 paths와 번들러 관례에 기대어
 * '@/types/proposal', './extractText'처럼 별칭과 무확장자로 쓰는데 ESM은
 * 둘 다 모른다. 여기서 그 둘만 메워 준다. 앱 파일은 건드리지 않는다.
 */
import { statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const SRC = path.resolve(import.meta.dirname, '../src')

function isFile(p) {
  try {
    return statSync(p).isFile()
  } catch {
    return false
  }
}

/** 무확장자 경로에 붙여 볼 후보들. 앱에 있는 확장자만 본다. */
function locate(base) {
  for (const candidate of [base, base + '.ts', base + '.tsx', path.join(base, 'index.ts')]) {
    if (isFile(candidate)) return candidate
  }
  return null
}

export function resolve(specifier, context, nextResolve) {
  let base = null

  if (specifier.startsWith('@/')) {
    base = path.join(SRC, specifier.slice(2))
  } else if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
    base = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier)
  }

  const found = base && locate(base)
  if (found) {
    // format을 'module'로 주면 Node가 타입을 지우지 않고 그대로 파싱하다
    // interface 선언에서 문법 오류를 낸다. .ts는 .ts라고 말해 줘야 한다.
    const format = /\.tsx?$/.test(found) ? 'module-typescript' : 'module'
    return { url: pathToFileURL(found).href, format, shortCircuit: true }
  }

  return nextResolve(specifier, context)
}
