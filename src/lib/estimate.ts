import type { CostItem, EstimateData, LaborItem } from '@/types/proposal'

let seq = 0
export function newId(prefix: string): string {
  seq += 1
  return `${prefix}-${Date.now().toString(36)}-${seq}`
}

export function createLaborItem(partial: Partial<LaborItem> = {}): LaborItem {
  return {
    id: newId('labor'),
    role: '',
    grade: '중급',
    months: 1,
    monthlyRate: 8_000_000,
    ...partial,
  }
}

export function createCostItem(partial: Partial<CostItem> = {}): CostItem {
  return {
    id: newId('cost'),
    category: 'SW',
    name: '',
    quantity: 1,
    unitPrice: 0,
    ...partial,
  }
}

export function defaultEstimate(): EstimateData {
  return {
    laborItems: [createLaborItem({ role: 'PM', grade: '특급', months: 1, monthlyRate: 12_000_000 })],
    costItems: [createCostItem({ category: 'CLOUD', name: '클라우드 인프라 이용료(월)', quantity: 1, unitPrice: 0 })],
    discountRate: 0,
    vatRate: 10,
  }
}

export interface EstimateTotals {
  laborSubtotal: number
  costSubtotal: number
  supplyAmount: number     // 공급가액 (인건비 + 항목비용)
  discountAmount: number
  amountAfterDiscount: number
  vatAmount: number
  grandTotal: number       // 최종 합계 (VAT 포함)
}

export function laborAmount(item: LaborItem): number {
  return Math.max(0, item.months) * Math.max(0, item.monthlyRate)
}

export function costAmount(item: CostItem): number {
  return Math.max(0, item.quantity) * Math.max(0, item.unitPrice)
}

export function calcEstimateTotals(estimate: EstimateData): EstimateTotals {
  const laborSubtotal = estimate.laborItems.reduce((sum, i) => sum + laborAmount(i), 0)
  const costSubtotal = estimate.costItems.reduce((sum, i) => sum + costAmount(i), 0)
  const supplyAmount = laborSubtotal + costSubtotal
  const discountAmount = Math.round(supplyAmount * (estimate.discountRate / 100))
  const amountAfterDiscount = supplyAmount - discountAmount
  const vatAmount = Math.round(amountAfterDiscount * (estimate.vatRate / 100))
  const grandTotal = amountAfterDiscount + vatAmount

  return { laborSubtotal, costSubtotal, supplyAmount, discountAmount, amountAfterDiscount, vatAmount, grandTotal }
}

const KRW = new Intl.NumberFormat('ko-KR')
export function formatWon(n: number): string {
  return `${KRW.format(Math.round(n))}원`
}
