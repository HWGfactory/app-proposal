import type { CompanyProfile, TrackRecordItem } from '@/types/proposal'
import { newId } from '@/lib/id'

export function createTrackRecordItem(partial: Partial<TrackRecordItem> = {}): TrackRecordItem {
  return {
    id: newId('track'),
    client: '',
    year: '',
    description: '',
    ...partial,
  }
}

export function defaultCompanyProfile(): CompanyProfile {
  return {
    intro: '',
    coreCompetencies: [],
    trackRecords: [],
  }
}
