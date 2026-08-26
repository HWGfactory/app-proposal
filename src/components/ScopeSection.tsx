'use client'

import type { ScopeData, ScopeItem } from '@/types/proposal'
import { createScopeItem } from '@/lib/scope'

interface Props {
  value: ScopeData
  onChange: (next: ScopeData) => void
}

type ListKey = keyof ScopeData

function ItemList({
  items, onAdd, onUpdate, onRemove, placeholder, accent,
}: {
  items: ScopeItem[]
  onAdd: () => void
  onUpdate: (id: string, text: string) => void
  onRemove: (id: string) => void
  placeholder: string
  accent: 'green' | 'red' | 'ink'
}) {
  const dot = accent === 'green' ? 'bg-accent-green' : accent === 'red' ? 'bg-accent-red' : 'bg-ink-400'
  return (
    <div className="flex flex-col gap-1.5">
      {items.length === 0 && (
        <div className="text-xs text-ink-400 italic px-1 py-1">아직 항목이 없습니다.</div>
      )}
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
          <input
            className="input-field !py-1.5 flex-1"
            value={item.text}
            onChange={(e) => onUpdate(item.id, e.target.value)}
            placeholder={placeholder}
          />
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            className="w-7 h-7 rounded-[4px] flex items-center justify-center text-ink-300 hover:text-accent-red hover:bg-red-50 transition-colors shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={onAdd}
        className="self-start text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1 mt-0.5"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        항목 추가
      </button>
    </div>
  )
}

export default function ScopeSection({ value, onChange }: Props) {
  const addItem = (key: ListKey) => onChange({ ...value, [key]: [...value[key], createScopeItem()] })
  const updateItem = (key: ListKey, id: string, text: string) =>
    onChange({ ...value, [key]: value[key].map((i) => (i.id === id ? { ...i, text } : i)) })
  const removeItem = (key: ListKey, id: string) =>
    onChange({ ...value, [key]: value[key].filter((i) => i.id !== id) })

  return (
    <div className="form-section">
      <div className="form-section-header">
        <span className="w-5 h-5 rounded-[3px] bg-brand-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
          3
        </span>
        <div className="min-w-0">
          <div className="font-semibold text-ink-900 text-[13px] leading-tight">범위 정의 (In / Out of Scope)</div>
          <div className="text-[11px] text-ink-400 mt-0.5">범위를 명확히 할수록 예산·일정에 대한 신뢰가 높아지고, 이번 단계에 포함하지 않는 항목을 방어할 수 있습니다</div>
        </div>
      </div>

      <div className="form-section-body flex flex-col gap-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-green" />
              <span className="section-label">포함 범위 (In Scope)</span>
            </div>
            <ItemList
              items={value.inScope}
              onAdd={() => addItem('inScope')}
              onUpdate={(id, text) => updateItem('inScope', id, text)}
              onRemove={(id) => removeItem('inScope', id)}
              placeholder="예: 핵심 기능 개발 및 배포"
              accent="green"
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-red" />
              <span className="section-label">제외 범위 (Out of Scope)</span>
            </div>
            <ItemList
              items={value.outOfScope}
              onAdd={() => addItem('outOfScope')}
              onUpdate={(id, text) => updateItem('outOfScope', id, text)}
              onRemove={(id) => removeItem('outOfScope', id)}
              placeholder="예: 레거시 시스템 완전 교체는 이번 단계에 포함하지 않습니다"
              accent="red"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="section-label block mb-2">전제 조건 (Assumptions)</span>
            <ItemList
              items={value.assumptions}
              onAdd={() => addItem('assumptions')}
              onUpdate={(id, text) => updateItem('assumptions', id, text)}
              onRemove={(id) => removeItem('assumptions', id)}
              placeholder="예: 고객사 담당자의 적시 의사결정을 전제로 합니다"
              accent="ink"
            />
          </div>
          <div>
            <span className="section-label block mb-2">의존성 (Dependencies)</span>
            <ItemList
              items={value.dependencies}
              onAdd={() => addItem('dependencies')}
              onUpdate={(id, text) => updateItem('dependencies', id, text)}
              onRemove={(id) => removeItem('dependencies', id)}
              placeholder="예: 고객사 내부 시스템 담당팀의 협조가 필요합니다"
              accent="ink"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
