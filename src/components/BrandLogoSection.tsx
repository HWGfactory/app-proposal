'use client'

import { useRef, useState } from 'react'
import type { BrandIdentity } from '@/types/proposal'
import { buildPalette, extractLogoColors, DEFAULT_BRAND } from '@/lib/brandColor'

interface Props {
  value: BrandIdentity
  onChange: (next: BrandIdentity) => void
}

const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']

export default function BrandLogoSection({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const active = value.primary ?? DEFAULT_BRAND
  const palette = buildPalette(active)

  const handleFile = async (file: File) => {
    if (!ACCEPTED.includes(file.type)) {
      setError('PNG · JPG · WEBP · SVG 이미지만 사용할 수 있습니다.')
      return
    }

    setBusy(true)
    setError('')
    try {
      const { dataUrl, colors } = await extractLogoColors(file)
      if (colors.length === 0) {
        setError('로고에서 색을 찾지 못했습니다. 배경이 투명하거나 흰색/검정만 있는 이미지일 수 있습니다.')
        onChange({ logoDataUrl: dataUrl, colors: [], primary: null })
        return
      }
      onChange({ logoDataUrl: dataUrl, colors, primary: colors[0] })
    } catch (e) {
      setError(e instanceof Error ? e.message : '로고를 분석하지 못했습니다.')
    } finally {
      setBusy(false)
    }
  }

  const clear = () => {
    setError('')
    onChange({ logoDataUrl: null, colors: [], primary: null })
  }

  return (
    <div className="form-section">
      <div className="form-section-header">
        <span className="fs-index">3</span>
        <div className="min-w-0">
          <div className="fs-title">브랜드 로고</div>
          <div className="fs-desc">
            로고를 올리면 색을 분석해 제안서(PPTX) 전체 색상에 반영합니다. 넣지 않으면 기본 색으로 생성됩니다
          </div>
        </div>
      </div>

      <div className="form-section-body flex flex-col gap-4">
        <div className="flex items-start gap-4">
          {/* 미리보기 */}
          <button
            type="button"
            onClick={() => !busy && inputRef.current?.click()}
            className={`w-[104px] h-[104px] shrink-0 rounded-[8px] border-2 border-dashed flex items-center justify-center overflow-hidden transition-colors
              ${busy ? 'cursor-wait border-line-strong bg-surface' : 'cursor-pointer border-line-strong bg-surface hover:border-brand-400 hover:bg-brand-50'}`}
          >
            {busy ? (
              <svg className="w-6 h-6 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#EA580C" strokeWidth="3" opacity="0.22" />
                <path fill="#EA580C" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
              </svg>
            ) : value.logoDataUrl ? (
              // 사용자가 올린 이미지라 next/image 최적화 대상이 아니다 (data URL).
              // eslint-disable-next-line @next/next/no-img-element
              <img src={value.logoDataUrl} alt="브랜드 로고" className="max-w-full max-h-full object-contain" />
            ) : (
              <span className="flex flex-col items-center gap-1.5 text-ink-400">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.6-4.6a2 2 0 012.8 0L16 16m-2-2l1.6-1.6a2 2 0 012.8 0L20 14M4 5h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1z" />
                </svg>
                <span className="text-[11px]">로고 선택</span>
              </span>
            )}
          </button>

          <div className="min-w-0 flex-1 flex flex-col gap-2.5">
            {value.colors.length > 0 ? (
              <>
                <span className="section-label">추출된 색 · 대표색을 고르세요</span>
                <div className="flex flex-wrap gap-2">
                  {value.colors.map((color) => {
                    const selected = color.toLowerCase() === (value.primary ?? '').toLowerCase()
                    return (
                      <button
                        key={color}
                        type="button"
                        onClick={() => onChange({ ...value, primary: color })}
                        title={color}
                        className={`w-9 h-9 rounded-[6px] border-2 transition-transform ${
                          selected ? 'border-ink-900 scale-110' : 'border-line hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    )
                  })}
                </div>
                <span className="text-[11px] text-ink-500 tabular-nums">
                  대표색 {value.primary ?? '-'}
                </span>
              </>
            ) : (
              <span className="text-xs text-ink-400">
                로고를 올리면 여기에 추출된 색이 표시됩니다. PNG · JPG · WEBP · SVG를 지원합니다.
              </span>
            )}

            {value.logoDataUrl && (
              <button type="button" onClick={clear} className="self-start text-xs font-semibold text-ink-500 hover:text-brand-600">
                로고 제거
              </button>
            )}
          </div>
        </div>

        {/* 제안서에 실제로 쓰일 색 */}
        <div className="flex flex-col gap-2">
          <span className="section-label">제안서에 적용될 색</span>
          <div className="flex rounded-[6px] overflow-hidden border border-line">
            {([
              ['표지', palette.brandDark],
              ['제목', palette.brandDeep],
              ['강조', palette.brand],
              ['보조', palette.brandMid],
              ['배경', palette.brandPale],
            ] as [string, string][]).map(([label, hex]) => (
              <div key={label} className="flex-1 flex flex-col">
                <div className="h-9" style={{ backgroundColor: `#${hex}` }} />
                <span className="text-[10px] text-ink-500 text-center py-1 bg-surface-card">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(',')}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
            e.target.value = ''
          }}
        />

        {error && (
          <div className="flex items-start gap-2 text-xs text-brand-600 bg-brand-50 border border-brand-200 rounded-[6px] px-3 py-2.5">
            <svg className="w-4 h-4 shrink-0 mt-px" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  )
}
