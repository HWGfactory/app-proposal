'use client'

import { useState } from 'react'
import type { EvidenceKind, WinTheme } from '@/lib/rfp/winTheme'

interface Props {
  themes: WinTheme[]
  onConfirm: (theme: WinTheme) => void
  onBack: () => void
}

const EVIDENCE_STYLE: Record<EvidenceKind, string> = {
  배경: 'badge-accent',
  평가: 'badge-accent',
  요구사항: 'badge-neutral',
  조건: 'badge-muted',
}

export default function WinThemeStep({ themes, onConfirm, onBack }: Props) {
  const [selectedId, setSelectedId] = useState(themes[0]?.id ?? '')
  // 원본은 남겨 두고 편집본만 덮어쓴다 — 되돌리기를 위해서다.
  const [edited, setEdited] = useState<Record<string, string>>({})

  const selected = themes.find((t) => t.id === selectedId)
  const headlineOf = (t: WinTheme) => edited[t.id] ?? t.headline
  const isEdited = (t: WinTheme) => edited[t.id] !== undefined && edited[t.id] !== t.headline

  const confirm = () => {
    if (!selected) return
    onConfirm({ ...selected, headline: headlineOf(selected).trim() || selected.headline })
  }

  if (themes.length === 0) {
    return (
      <div className="max-w-[820px] mx-auto w-full">
        <div className="card p-6 text-sm text-ink-500">
          RFP에서 Win Theme을 만들 근거를 찾지 못했습니다.
          <button type="button" onClick={onBack} className="btn-secondary mt-4">뒤로</button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[820px] mx-auto w-full">
      <div className="mb-5 flex items-center gap-3">
        <button onClick={onBack} className="text-ink-400 hover:text-ink-700 transition-colors p-1.5 -ml-1.5 rounded-[4px] hover:bg-surface-sunken">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-ink-900 text-base">Win Theme 선택</h2>
            <span className="badge badge-accent tabular-nums">{themes.length}개 방향</span>
          </div>
          <p className="text-xs text-ink-400 mt-0.5">
            &ldquo;왜 우리가 이 프로젝트를 해야 하는가&rdquo;에 대한 한 줄 답변입니다. 하나를 고르고 우리 팀 언어로 고쳐 쓰세요
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {themes.map((theme) => {
          const active = theme.id === selectedId
          return (
            <div
              key={theme.id}
              className={`form-section transition-colors ${active ? 'ring-2 ring-brand-500' : ''}`}
            >
              <button
                type="button"
                onClick={() => setSelectedId(theme.id)}
                className="w-full form-section-header text-left"
              >
                <span className={`fs-index ${active ? '' : '!bg-ink-700'}`}>
                  {active ? (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    themes.indexOf(theme) + 1
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="fs-title">
                    {theme.angle}
                    {isEdited(theme) && <span className="text-ink-400 font-normal"> · 수정됨</span>}
                  </div>
                  <div className="fs-desc">{theme.rationale}</div>
                </div>
              </button>

              <div className="form-section-body flex flex-col gap-3">
                {active ? (
                  <div className="flex flex-col gap-1.5">
                    <span className="section-label">핵심 메시지 · 직접 고쳐 쓸 수 있습니다</span>
                    <textarea
                      className="textarea-field text-sm"
                      rows={3}
                      value={headlineOf(theme)}
                      onChange={(e) => setEdited((prev) => ({ ...prev, [theme.id]: e.target.value }))}
                    />
                    {isEdited(theme) && (
                      <button
                        type="button"
                        onClick={() =>
                          setEdited((prev) => {
                            const next = { ...prev }
                            delete next[theme.id]
                            return next
                          })
                        }
                        className="self-start text-xs font-semibold text-ink-500 hover:text-brand-600"
                      >
                        원래 문장으로 되돌리기
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-ink-700 leading-relaxed">{headlineOf(theme)}</p>
                )}

                <div className="flex flex-col gap-1.5">
                  <span className="section-label">RFP 근거 {theme.evidence.length}건</span>
                  <ul className="flex flex-col gap-1">
                    {theme.evidence.map((ev, i) => (
                      <li key={i} className="flex items-start gap-2">
                        {ev.page > 0 && (
                          <span className="text-[10px] text-ink-400 tabular-nums shrink-0 mt-0.5">{ev.page}p</span>
                        )}
                        <span className={`badge shrink-0 ${EVIDENCE_STYLE[ev.kind]}`}>{ev.kind}</span>
                        <span className="text-xs text-ink-600 leading-relaxed">{ev.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex items-center justify-end gap-3 pt-4">
        <span className="text-xs text-ink-400">선택한 메시지가 제안서 첫 장에 실립니다</span>
        <button type="button" onClick={onBack} className="btn-secondary">뒤로</button>
        <button type="button" onClick={confirm} className="btn-primary">
          이 Win Theme으로 진행
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5-5 5M6 12h12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
