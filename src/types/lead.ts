export interface CsvData {
  data: Record<string, string>[]
  headers: string[]
  rowCount: number
  errors: string[]
}

export interface ColumnMapping {
  [key: string]: string // original header -> mapped field
}

export type LeadStatus = 'imported' | 'generating' | 'drafted' | 'exported'

export interface LeadData {
  id: string
  status: LeadStatus
  selected?: boolean
  [key: string]: string | boolean | undefined
}

export interface LeadListState {
  leads: LeadData[]
  originalData: CsvData
  columnMapping: ColumnMapping
  searchTerm: string
  statusFilter: LeadStatus | 'all'
  selectedLeads: Set<string>
}
