import { describe, it, expect, beforeEach, vi } from 'vitest'
import { leadsStorage } from './leadsStorage'
import type { LeadData } from '@/types/lead'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

describe('leadsStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getLeads', () => {
    it('returns null when no data is stored', () => {
      localStorageMock.getItem.mockReturnValue(null)
      
      const result = leadsStorage.getLeads()
      
      expect(result).toBeNull()
      expect(localStorageMock.getItem).toHaveBeenCalledWith('woodpecker-leads')
    })

    it('returns parsed data when valid data is stored', () => {
      const mockData = {
        leads: [{ id: '1', status: 'imported', company: 'Test' }],
        columnMapping: { 'Company': 'company' },
        lastUpdated: '2024-01-01T00:00:00.000Z'
      }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockData))
      
      const result = leadsStorage.getLeads()
      
      expect(result).toEqual(mockData)
    })

    it('returns null when stored data is invalid JSON', () => {
      localStorageMock.getItem.mockReturnValue('invalid json')
      console.error = vi.fn()
      
      const result = leadsStorage.getLeads()
      
      expect(result).toBeNull()
      expect(console.error).toHaveBeenCalled()
    })
  })

  describe('saveLeads', () => {
    it('saves leads with proper structure', () => {
      const leads: LeadData[] = [
        { id: '1', status: 'imported', company: 'Test Corp' }
      ]
      const columnMapping = { 'Company': 'company' }
      
      leadsStorage.saveLeads(leads, columnMapping)
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'woodpecker-leads',
        expect.stringContaining('"leads":[')
      )
    })
  })

  describe('addLeads', () => {
    it('creates new storage when none exists', () => {
      localStorageMock.getItem.mockReturnValue(null)
      const newLeads: LeadData[] = [
        { id: 'lead-0', status: 'imported', company: 'New Corp' }
      ]
      const columnMapping = { 'Company': 'company' }
      
      const result = leadsStorage.addLeads(newLeads, columnMapping)
      
      expect(result.leads).toEqual(newLeads)
      expect(result.columnMapping).toEqual(columnMapping)
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })

    it('merges with existing leads and avoids ID conflicts', () => {
      const existingData = {
        leads: [{ id: 'lead-0', status: 'reviewed', Company: 'Existing Corp', Email: 'existing@example.com' }],
        columnMapping: { 'Company': 'company', 'Email': 'email' },
        lastUpdated: '2024-01-01T00:00:00.000Z'
      }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingData))
      
      const newLeads: LeadData[] = [
        { id: 'lead-0', status: 'imported', Company: 'New Corp', Email: 'new@example.com' }
      ]
      const columnMapping = { 'Company': 'company', 'Email': 'email' }
      
      const result = leadsStorage.addLeads(newLeads, columnMapping)
      
      expect(result.leads).toHaveLength(2)
      expect(result.leads[0].id).toBe('lead-0')
      expect(result.leads[1].id).toBe('lead-1') // ID should be incremented to avoid conflict
    })

    it('skips leads with duplicate emails', () => {
      const existingData = {
        leads: [{ id: 'lead-0', status: 'reviewed', Company: 'Existing Corp', Email: 'duplicate@example.com' }],
        columnMapping: { 'Company': 'company', 'Email': 'email' },
        lastUpdated: '2024-01-01T00:00:00.000Z'
      }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingData))
      
      const newLeads: LeadData[] = [
        { id: 'lead-1', status: 'imported', Company: 'New Corp', Email: 'duplicate@example.com' }, // Duplicate
        { id: 'lead-2', status: 'imported', Company: 'Unique Corp', Email: 'unique@example.com' }    // Unique
      ]
      const columnMapping = { 'Company': 'company', 'Email': 'email' }
      
      const result = leadsStorage.addLeads(newLeads, columnMapping)
      
      expect(result.leads).toHaveLength(2) // Only existing + unique lead
      expect(result.skippedDuplicates).toBe(1) // One duplicate skipped
      expect(result.leads[1].Email).toBe('unique@example.com') // Only unique lead was added
    })
  })

  describe('updateLeadStatus', () => {
    it('updates specific lead status', () => {
      const existingData = {
        leads: [
          { id: '1', status: 'imported', company: 'Test Corp' },
          { id: '2', status: 'imported', company: 'Other Corp' }
        ] as LeadData[],
        columnMapping: { 'Company': 'company' },
        lastUpdated: '2024-01-01T00:00:00.000Z'
      }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingData))
      
      leadsStorage.updateLeadStatus('1', 'drafted')
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'woodpecker-leads',
        expect.stringContaining('"status":"drafted"')
      )
    })
  })

  describe('updateMultipleLeadsStatus', () => {
    it('updates multiple leads status', () => {
      const existingData = {
        leads: [
          { id: '1', status: 'imported', company: 'Test Corp' },
          { id: '2', status: 'imported', company: 'Other Corp' },
          { id: '3', status: 'reviewed', company: 'Third Corp' }
        ] as LeadData[],
        columnMapping: { 'Company': 'company' },
        lastUpdated: '2024-01-01T00:00:00.000Z'
      }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingData))
      
      leadsStorage.updateMultipleLeadsStatus(['1', '2'], 'exported')
      
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })
  })

  describe('deleteLeads', () => {
    it('removes specified leads', () => {
      const existingData = {
        leads: [
          { id: '1', status: 'imported', company: 'Test Corp' },
          { id: '2', status: 'imported', company: 'Other Corp' }
        ] as LeadData[],
        columnMapping: { 'Company': 'company' },
        lastUpdated: '2024-01-01T00:00:00.000Z'
      }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingData))
      
      leadsStorage.deleteLeads(['1'])
      
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })
  })

  describe('clearAllLeads', () => {
    it('removes all localStorage data', () => {
      leadsStorage.clearAllLeads()
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('woodpecker-leads')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('woodpecker-column-mapping')
    })
  })
})