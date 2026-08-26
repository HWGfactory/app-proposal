'use client'

import type { CostItem, CostItemCategory, EstimateData, LaborItem } from '@/types/proposal'
import { COST_ITEM_CATEGORIES, COST_ITEM_CATEGORY_LABEL } from '@/types/proposal'
import { calcEstimateTotals, costAmount, createCostItem, createLaborItem, formatWon, laborAmount } from '@/lib/estimate'

interface Props {
  value: EstimateData
  onChange: (next: EstimateData) => void
}

const GRADES = ['특급', '고급', '중급', '초급']

function IconBtn({ onClick, title }: { onClick: () => void; title: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="w-7 h-7 rounded-[4px] flex items-center justify-center text-ink-300 hover:text-accent-red hover:bg-red-50 transition-colors shrink-0"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  )
}

export default function EstimateSection({ value, onChange }: Props) {
  const totals = calcEstimateTotals(value)

  const updateLabor = (id: string, patch: Partial<LaborItem>) =>
    onChange({ ...value, laborItems: value.laborItems.map((i) => (i.id === id ? { ...i, ...patch } : i)) })
  const addLabor = () => onChange({ ...value, laborItems: [...value.laborItems, createLaborItem()] })
  const removeLabor = (id: string) => onChange({ ...value, laborItems: value.laborItems.filter((i) => i.id !== id) })

  const updateCost = (id: string, patch: Partial<CostItem>) =>
    onChange({ ...value, costItems: value.costItems.map((i) => (i.id === id ? { ...i, ...patch } : i)) })
  const addCost = () => onChange({ ...value, costItems: [...value.costItems, createCostItem()] })
  const removeCost = (id: string) => onChange({ ...value, costItems: value.costItems.filter((i) => i.id !== id) })

  return (
    <div className="form-section">
      <div className="form-section-header">
        <span className="w-5 h-5 rounded-[3px] bg-brand-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
          4
        </span>
        <div className="min-w-0">
          <div className="font-semibold text-ink-900 text-[13px] leading-tight">항목별 견적</div>
          <div className="text-[11px] text-ink-400 mt-0.5">인건비·SW·HW·클라우드 비용을 입력하면 Word 제안서에 정식 견적 테이블로 삽입됩니다</div>
        </div>
      </div>

      <div className="form-section-body flex flex-col gap-5">
        {/* ── 인력 투입 내역 ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="section-label">인력 투입 내역 (M/M)</span>
            <button type="button" onClick={addLabor} className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              인력 추가
            </button>
          </div>

          <div className="border border-line rounded-[6px] overflow-hidden">
            <div className="grid grid-cols-[1fr_84px_92px_1fr_1fr_28px] gap-2 px-3 py-2 bg-surface-sunken text-[11px] font-semibold text-ink-500 border-b border-line">
              <span>역할</span>
              <span>등급</span>
              <span>투입공수(M/M)</span>
              <span>월 단가(원)</span>
              <span className="text-right">금액</span>
              <span />
            </div>
            {value.laborItems.length === 0 && (
              <div className="px-3 py-4 text-center text-xs text-ink-400">투입 인력이 없습니다. 인력을 추가해주세요.</div>
            )}
            {value.laborItems.map((item) => (
              <div key={item.id} className="grid grid-cols-[1fr_84px_92px_1fr_1fr_28px] gap-2 px-3 py-2 items-center border-b border-line last:border-b-0">
                <input
                  className="input-field !py-1.5"
                  value={item.role}
                  onChange={(e) => updateLabor(item.id, { role: e.target.value })}
                  placeholder="예: PM, 백엔드 개발"
                />
                <select className="select-field !py-1.5" value={item.grade} onChange={(e) => updateLabor(item.id, { grade: e.target.value })}>
                  {GRADES.map((g) => <option key={g}>{g}</option>)}
                </select>
                <input
                  type="number" min={0} step={0.5}
                  className="input-field !py-1.5"
                  value={item.months}
                  onChange={(e) => updateLabor(item.id, { months: Number(e.target.value) })}
                />
                <input
                  type="number" min={0} step={100000}
                  className="input-field !py-1.5"
                  value={item.monthlyRate}
                  onChange={(e) => updateLabor(item.id, { monthlyRate: Number(e.target.value) })}
                />
                <span className="text-right text-[13px] font-medium text-ink-700 tabular-nums">{formatWon(laborAmount(item))}</span>
                <IconBtn onClick={() => removeLabor(item.id)} title="삭제" />
              </div>
            ))}
          </div>
        </div>

        {/* ── 항목별 비용 ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="section-label">SW · HW · 클라우드 비용</span>
            <button type="button" onClick={addCost} className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              항목 추가
            </button>
          </div>

          <div className="border border-line rounded-[6px] overflow-hidden">
            <div className="grid grid-cols-[100px_1fr_70px_1fr_1fr_28px] gap-2 px-3 py-2 bg-surface-sunken text-[11px] font-semibold text-ink-500 border-b border-line">
              <span>구분</span>
              <span>품목명</span>
              <span>수량</span>
              <span>단가(원)</span>
              <span className="text-right">금액</span>
              <span />
            </div>
            {value.costItems.length === 0 && (
              <div className="px-3 py-4 text-center text-xs text-ink-400">비용 항목이 없습니다. 항목을 추가해주세요.</div>
            )}
            {value.costItems.map((item) => (
              <div key={item.id} className="grid grid-cols-[100px_1fr_70px_1fr_1fr_28px] gap-2 px-3 py-2 items-center border-b border-line last:border-b-0">
                <select
                  className="select-field !py-1.5"
                  value={item.category}
                  onChange={(e) => updateCost(item.id, { category: e.target.value as CostItemCategory })}
                >
                  {COST_ITEM_CATEGORIES.map((c) => <option key={c} value={c}>{COST_ITEM_CATEGORY_LABEL[c]}</option>)}
                </select>
                <input
                  className="input-field !py-1.5"
                  value={item.name}
                  onChange={(e) => updateCost(item.id, { name: e.target.value })}
                  placeholder="예: MS Azure OpenAI, Salesforce License"
                />
                <input
                  type="number" min={0}
                  className="input-field !py-1.5"
                  value={item.quantity}
                  onChange={(e) => updateCost(item.id, { quantity: Number(e.target.value) })}
                />
                <input
                  type="number" min={0} step={10000}
                  className="input-field !py-1.5"
                  value={item.unitPrice}
                  onChange={(e) => updateCost(item.id, { unitPrice: Number(e.target.value) })}
                />
                <span className="text-right text-[13px] font-medium text-ink-700 tabular-nums">{formatWon(costAmount(item))}</span>
                <IconBtn onClick={() => removeCost(item.id)} title="삭제" />
              </div>
            ))}
          </div>
        </div>

        {/* ── 할인율 / 부가세율 ── */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-ink-700">할인율 (%)</label>
            <input
              type="number" min={0} max={100} step={0.5}
              className="input-field"
              value={value.discountRate}
              onChange={(e) => onChange({ ...value, discountRate: Number(e.target.value) })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-ink-700">부가세율 (%)</label>
            <input
              type="number" min={0} max={100} step={0.5}
              className="input-field"
              value={value.vatRate}
              onChange={(e) => onChange({ ...value, vatRate: Number(e.target.value) })}
            />
          </div>
        </div>

        {/* ── 합계 요약 ── */}
        <div className="rounded-[6px] border border-line overflow-hidden">
          <div className="bg-surface-sunken px-3 py-2 border-b border-line">
            <span className="section-label">견적 합계</span>
          </div>
          <div className="divide-y divide-line">
            <SummaryRow label="인건비 소계" value={totals.laborSubtotal} />
            <SummaryRow label="항목 비용 소계" value={totals.costSubtotal} />
            <SummaryRow label="공급가액 합계" value={totals.supplyAmount} bold />
            <SummaryRow label={`할인 (${value.discountRate}%)`} value={-totals.discountAmount} negative={totals.discountAmount > 0} />
            <SummaryRow label="할인 후 금액" value={totals.amountAfterDiscount} />
            <SummaryRow label={`부가세 (${value.vatRate}%)`} value={totals.vatAmount} />
            <div className="flex items-center justify-between px-3 py-3 bg-brand-50">
              <span className="text-[13px] font-bold text-brand-700">총 합계 (VAT 포함)</span>
              <span className="text-base font-bold text-brand-700 tabular-nums">{formatWon(totals.grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SummaryRow({ label, value, bold, negative }: { label: string; value: number; bold?: boolean; negative?: boolean }) {
  return (
    <div className="flex items-center justify-between px-3 py-2">
      <span className={`text-[12px] ${bold ? 'font-semibold text-ink-700' : 'text-ink-500'}`}>{label}</span>
      <span className={`text-[13px] tabular-nums ${bold ? 'font-semibold text-ink-900' : negative ? 'text-accent-red' : 'text-ink-700'}`}>
        {negative ? `-${formatWon(Math.abs(value))}` : formatWon(value)}
      </span>
    </div>
  )
}
