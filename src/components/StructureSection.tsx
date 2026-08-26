'use client'

import { useState } from 'react'
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { ProposalCategory, SectionConfig } from '@/types/proposal'
import { briefStructure, detailedStructure } from '@/lib/sections'

interface Props {
  category: ProposalCategory
  value: SectionConfig[]
  onChange: (next: SectionConfig[]) => void
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={`w-8 h-[18px] rounded-full shrink-0 transition-colors relative
        ${checked ? 'bg-brand-500' : 'bg-line-strong'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span
        className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white transition-all shadow-sm
          ${checked ? 'left-[16px]' : 'left-[2px]'}`}
      />
    </button>
  )
}

function SectionRow({ section, onToggle, onToggleSub }: {
  section: SectionConfig
  onToggle: () => void
  onToggleSub: (subId: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border-b border-line last:border-b-0 bg-white ${isDragging ? 'shadow-popover z-10 relative' : ''}`}
    >
      <div className={`flex items-center gap-2.5 px-3 py-2.5 ${section.enabled ? '' : 'opacity-50'}`}>
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="text-ink-300 hover:text-ink-500 cursor-grab active:cursor-grabbing shrink-0 touch-none"
          title="드래그하여 순서 변경"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
            <path strokeLinecap="round" d="M8 6h.01M8 12h.01M8 18h.01M16 6h.01M16 12h.01M16 18h.01" />
          </svg>
        </button>

        <span className="text-[13px] font-medium text-ink-900 flex-1 min-w-0">{section.label}</span>

        {section.locked && (
          <span className="badge bg-surface-sunken text-ink-400 border border-line" title="필수 섹션 — 제외할 수 없습니다">
            필수
          </span>
        )}

        <Toggle checked={section.enabled} onChange={onToggle} disabled={section.locked} />
      </div>

      {section.subsections && section.enabled && (
        <div className="pl-9 pb-2 flex flex-wrap gap-x-4 gap-y-1.5">
          {section.subsections.map((sub) => (
            <label key={sub.id} className="flex items-center gap-1.5 text-xs text-ink-500 cursor-pointer">
              <input
                type="checkbox"
                checked={sub.enabled}
                onChange={() => onToggleSub(sub.id)}
                className="w-3.5 h-3.5 rounded-[3px] accent-brand-500"
              />
              {sub.label}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

export default function StructureSection({ category, value, onChange }: Props) {
  const [preset, setPreset] = useState<'brief' | 'detailed' | null>('detailed')
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const applyPreset = (p: 'brief' | 'detailed') => {
    onChange(p === 'brief' ? briefStructure(category) : detailedStructure(category))
    setPreset(p)
  }

  const toggleSection = (id: string) => {
    onChange(value.map((s) => (s.id === id && !s.locked ? { ...s, enabled: !s.enabled } : s)))
    setPreset(null)
  }

  const toggleSub = (sectionId: string, subId: string) => {
    onChange(value.map((s) =>
      s.id === sectionId && s.subsections
        ? { ...s, subsections: s.subsections.map((sub) => (sub.id === subId ? { ...sub, enabled: !sub.enabled } : sub)) }
        : s
    ))
    setPreset(null)
  }

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const oldIndex = value.findIndex((s) => s.id === active.id)
    const newIndex = value.findIndex((s) => s.id === over.id)
    onChange(arrayMove(value, oldIndex, newIndex))
    setPreset(null)
  }

  const enabledCount = value.filter((s) => s.enabled).length

  return (
    <div className="form-section">
      <div className="form-section-header justify-between">
        <div className="flex items-center gap-2.5">
          <span className="w-5 h-5 rounded-[3px] bg-brand-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
            6
          </span>
          <div className="min-w-0">
            <div className="font-semibold text-ink-900 text-[13px] leading-tight">문서 구성</div>
            <div className="text-[11px] text-ink-400 mt-0.5">드래그로 순서를 바꾸고, 불필요한 섹션은 꺼서 분량을 조절하세요</div>
          </div>
        </div>
        <span className="badge bg-brand-50 text-brand-600 border border-brand-100">{enabledCount}개 섹션 포함</span>
      </div>

      <div className="form-section-body">
        {/* 프리셋 */}
        <div className="flex items-center gap-2 mb-3">
          <button
            type="button"
            onClick={() => applyPreset('brief')}
            className={`px-3 py-1.5 rounded-[4px] text-xs font-semibold border transition-colors
              ${preset === 'brief' ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-ink-600 border-line hover:border-brand-300'}`}
          >
            간략 버전 · 약 20p
          </button>
          <button
            type="button"
            onClick={() => applyPreset('detailed')}
            className={`px-3 py-1.5 rounded-[4px] text-xs font-semibold border transition-colors
              ${preset === 'detailed' ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-ink-600 border-line hover:border-brand-300'}`}
          >
            상세 버전 · 약 60p
          </button>
        </div>

        {/* 섹션 목록 */}
        <div className="border border-line rounded-[6px] overflow-hidden">
          <div className="px-3 py-2 bg-surface-sunken border-b border-line text-[11px] text-ink-400">
            표지 (1p 고정)
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={value.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              {value.map((section) => (
                <SectionRow
                  key={section.id}
                  section={section}
                  onToggle={() => toggleSection(section.id)}
                  onToggleSub={(subId) => toggleSub(section.id, subId)}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      </div>
    </div>
  )
}
