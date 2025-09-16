import { describe, it, expect, beforeEach, vi, Mock } from 'vitest'
import { leadsStorage } from '../leadsStorage'
import type { LeadData, ColumnMapping } from '@/types/lead'
import type { ApiResult, LeadRecord } from '@/types/api'

// Mock the window.api
const mockApi = {
  leads: {
    getAll: vi.fn(),
    create: vi.fn(),
    bulkCreate: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  },
  metadata: {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn()
  }
}

// Mock window.api
Object.defineProperty(window, 'api', {
  value: mockApi,
  writable: true
})

describe('leadsStorage', () => {
  const mockLeadData: LeadData = {
    id: 'lead-1',
    email: 'test@example.com',
    company: 'Test Company',
    status: 'imported',
    first_name: 'John',
    last_name: 'Doe'
  }

  const mockLeadRecord: LeadRecord = {
    id: 1,
    import_id: null,
    status: 'imported',
    data: {
      email: 'test@example.com',
      company: 'Test Company',
      first_name: 'John',
      last_name: 'Doe'
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  const mockColumnMapping: ColumnMapping = {
    email: 'email',
    company: 'company',
    first_name: 'first_name',
    last_name: 'last_name'
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getLeads', () => {
    it('should return leads storage when API call succeeds', async () => {
      const mockApiResponse: ApiResult<LeadRecord[]> = {
        success: true,
        data: [mockLeadRecord]
      }
      
      const mockMetadataResponse: ApiResult<{ value: ColumnMapping }> = {
        success: true,
        data: { value: mockColumnMapping }
      }

      mockApi.leads.getAll.mockResolvedValue(mockApiResponse)
      mockApi.metadata.get.mockResolvedValue(mockMetadataResponse)

      const result = await leadsStorage.getLeads()

      expect(result).toBeDefined()
      expect(result?.leads).toHaveLength(1)
      expect(result?.leads[0].id).toBe('1')
      expect(result?.leads[0].email).toBe('test@example.com')
      expect(result?.columnMapping).toEqual(mockColumnMapping)
    })

    it('should return null when API call fails', async () => {
      const mockApiResponse: ApiResult<LeadRecord[]> = {
        success: false,
        error: {
          type: 'DatabaseError',
          message: 'Database connection failed'
        }
      }

      mockApi.leads.getAll.mockResolvedValue(mockApiResponse)

      const result = await leadsStorage.getLeads()

      expect(result).toBeNull()
    })

    it('should handle API call exceptions', async () => {
      mockApi.leads.getAll.mockRejectedValue(new Error('Network error'))

      const result = await leadsStorage.getLeads()

      expect(result).toBeNull()
    })
  })

  describe('saveLeads', () => {
    it('should save column mapping successfully', async () => {
      const mockMetadataResponse: ApiResult<any> = {
        success: true,
        data: {}
      }

      mockApi.metadata.set.mockResolvedValue(mockMetadataResponse)

      const result = await leadsStorage.saveLeads([mockLeadData], mockColumnMapping)

      expect(result).toBe(true)
      expect(mockApi.metadata.set).toHaveBeenCalledWith('columnMapping', mockColumnMapping)
    })

    it('should return false when metadata save fails', async () => {
      const mockMetadataResponse: ApiResult<any> = {
        success: false,
        error: {
          type: 'DatabaseError',
          message: 'Failed to save metadata'
        }
      }

      mockApi.metadata.set.mockResolvedValue(mockMetadataResponse)

      const result = await leadsStorage.saveLeads([mockLeadData], mockColumnMapping)

      expect(result).toBe(false)
    })
  })

  describe('addLeads', () => {
    it('should add leads successfully with bulk create', async () => {
      const mockMetadataResponse: ApiResult<any> = {
        success: true,
        data: {}
      }

      const mockBulkCreateResponse: ApiResult<{ created: LeadRecord[], skipped: number }> = {
        success: true,
        data: {
          created: [mockLeadRecord],
          skipped: 0
        }
      }

      const mockGetAllResponse: ApiResult<LeadRecord[]> = {
        success: true,
        data: [mockLeadRecord]
      }

      mockApi.metadata.set.mockResolvedValue(mockMetadataResponse)
      mockApi.leads.bulkCreate.mockResolvedValue(mockBulkCreateResponse)
      mockApi.leads.getAll.mockResolvedValue(mockGetAllResponse)

      const result = await leadsStorage.addLeads([mockLeadData], mockColumnMapping, 1)

      expect(result.leads).toHaveLength(1)
      expect(result.skippedDuplicates).toBe(0)
      expect(mockApi.leads.bulkCreate).toHaveBeenCalled()
    })

    it('should handle bulk create failure gracefully', async () => {
      const mockMetadataResponse: ApiResult<any> = {
        success: true,
        data: {}
      }

      const mockBulkCreateResponse: ApiResult<any> = {
        success: false,
        error: {
          type: 'DatabaseError',
          message: 'Bulk create failed'
        }
      }

      mockApi.metadata.set.mockResolvedValue(mockMetadataResponse)
      mockApi.leads.bulkCreate.mockResolvedValue(mockBulkCreateResponse)

      const result = await leadsStorage.addLeads([mockLeadData], mockColumnMapping)

      expect(result.leads).toEqual([])
      expect(result.columnMapping).toEqual(mockColumnMapping)
    })
  })

  describe('updateLeadStatus', () => {
    it('should update lead status successfully', async () => {
      const mockUpdateResponse: ApiResult<LeadRecord> = {
        success: true,
        data: { ...mockLeadRecord, status: 'contacted' }
      }

      mockApi.leads.update.mockResolvedValue(mockUpdateResponse)

      const result = await leadsStorage.updateLeadStatus('1', 'contacted')

      expect(result).toBe(true)
      expect(mockApi.leads.update).toHaveBeenCalledWith(1, { status: 'contacted' })
    })

    it('should return false when update fails', async () => {
      const mockUpdateResponse: ApiResult<any> = {
        success: false,
        error: {
          type: 'NotFoundError',
          message: 'Lead not found'
        }
      }

      mockApi.leads.update.mockResolvedValue(mockUpdateResponse)

      const result = await leadsStorage.updateLeadStatus('1', 'contacted')

      expect(result).toBe(false)
    })
  })

  describe('updateMultipleLeadsStatus', () => {
    it('should update multiple leads status successfully', async () => {
      const mockUpdateResponse: ApiResult<LeadRecord> = {
        success: true,
        data: mockLeadRecord
      }

      mockApi.leads.update.mockResolvedValue(mockUpdateResponse)

      const result = await leadsStorage.updateMultipleLeadsStatus(['1', '2'], 'contacted')

      expect(result).toBe(true)
      expect(mockApi.leads.update).toHaveBeenCalledTimes(2)
    })

    it('should return false when some updates fail', async () => {
      const mockSuccessResponse: ApiResult<LeadRecord> = {
        success: true,
        data: mockLeadRecord
      }

      const mockFailResponse: ApiResult<any> = {
        success: false,
        error: {
          type: 'NotFoundError',
          message: 'Lead not found'
        }
      }

      mockApi.leads.update
        .mockResolvedValueOnce(mockSuccessResponse)
        .mockResolvedValueOnce(mockFailResponse)

      const result = await leadsStorage.updateMultipleLeadsStatus(['1', '2'], 'contacted')

      expect(result).toBe(false)
    })
  })

  describe('deleteLeads', () => {
    it('should delete leads successfully', async () => {
      const mockDeleteResponse: ApiResult<void> = {
        success: true,
        data: undefined
      }

      mockApi.leads.delete.mockResolvedValue(mockDeleteResponse)

      const result = await leadsStorage.deleteLeads(['1', '2'])

      expect(result).toBe(true)
      expect(mockApi.leads.delete).toHaveBeenCalledTimes(2)
    })

    it('should return false when some deletions fail', async () => {
      const mockSuccessResponse: ApiResult<void> = {
        success: true,
        data: undefined
      }

      const mockFailResponse: ApiResult<any> = {
        success: false,
        error: {
          type: 'NotFoundError',
          message: 'Lead not found'
        }
      }

      mockApi.leads.delete
        .mockResolvedValueOnce(mockSuccessResponse)
        .mockResolvedValueOnce(mockFailResponse)

      const result = await leadsStorage.deleteLeads(['1', '2'])

      expect(result).toBe(false)
    })
  })

  describe('clearAllLeads', () => {
    it('should clear all leads successfully', async () => {
      const mockGetAllResponse: ApiResult<LeadRecord[]> = {
        success: true,
        data: [mockLeadRecord]
      }

      const mockDeleteResponse: ApiResult<void> = {
        success: true,
        data: undefined
      }

      const mockMetadataDeleteResponse: ApiResult<void> = {
        success: true,
        data: undefined
      }

      mockApi.leads.getAll.mockResolvedValue(mockGetAllResponse)
      mockApi.leads.delete.mockResolvedValue(mockDeleteResponse)
      mockApi.metadata.delete.mockResolvedValue(mockMetadataDeleteResponse)

      const result = await leadsStorage.clearAllLeads()

      expect(result).toBe(true)
      expect(mockApi.leads.delete).toHaveBeenCalledWith(1)
      expect(mockApi.metadata.delete).toHaveBeenCalledWith('columnMapping')
    })

    it('should return false when get all leads fails', async () => {
      const mockGetAllResponse: ApiResult<any> = {
        success: false,
        error: {
          type: 'DatabaseError',
          message: 'Failed to get leads'
        }
      }

      mockApi.leads.getAll.mockResolvedValue(mockGetAllResponse)

      const result = await leadsStorage.clearAllLeads()

      expect(result).toBe(false)
    })
  })

  describe('getLeadsCounts', () => {
    it('should return leads counts by status', async () => {
      const mockLeads: LeadRecord[] = [
        { ...mockLeadRecord, id: 1, status: 'imported' },
        { ...mockLeadRecord, id: 2, status: 'contacted' },
        { ...mockLeadRecord, id: 3, status: 'imported' }
      ]

      const mockGetAllResponse: ApiResult<LeadRecord[]> = {
        success: true,
        data: mockLeads
      }

      mockApi.leads.getAll.mockResolvedValue(mockGetAllResponse)

      const result = await leadsStorage.getLeadsCounts()

      expect(result).toEqual({
        imported: 2,
        contacted: 1
      })
    })

    it('should return empty object when API call fails', async () => {
      const mockGetAllResponse: ApiResult<any> = {
        success: false,
        error: {
          type: 'DatabaseError',
          message: 'Failed to get leads'
        }
      }

      mockApi.leads.getAll.mockResolvedValue(mockGetAllResponse)

      const result = await leadsStorage.getLeadsCounts()

      expect(result).toEqual({})
    })
  })
})
