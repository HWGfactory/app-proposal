import type { ScopeData, ScopeItem } from '@/types/proposal'
import { newId } from '@/lib/estimate'

export function createScopeItem(text = ''): ScopeItem {
  return { id: newId('scope'), text }
}

export function defaultScope(): ScopeData {
  return {
    inScope: [],
    outOfScope: [],
    assumptions: [createScopeItem('고객사 담당자의 적시 의사결정 및 필요 자료·데이터 제공을 전제로 합니다')],
    dependencies: [createScopeItem('고객사 내부 시스템 담당팀의 협조 및 접근 권한 제공이 필요합니다')],
  }
}
