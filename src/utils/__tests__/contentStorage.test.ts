import { describe, it, expect, beforeEach, vi } from 'vitest'
import { contentStorage } from '../contentStorage'
import type { ApiResult, GeneratedContentRecord } from '@/types/api'
import type { ClaudeResponse } from '@/services/claudeService'

// Mock the window.api
const mockApi = {
  content: {
    getByLead: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getByTouchpoint: vi.fn()
  }
}

// Mock window.api
Object.defineProperty(window, 'api', {
  value: mockApi,
  writable: true
})

describe('contentStorage', () => {
  const mockClaudeResponse: ClaudeResponse = {
    snippet1: 'Test Subject Line',
    snippet2: '<div>Test Email Body</div>',
    snippet3: 'Test LinkedIn Message',
    snippet4: '<div>Test Bump Email</div>',
    snippet5: '<div>Test Follow-up Email</div>',
    snippet6: '<div>Test Second Bump</div>',
    snippet7: '<div>Test Breakup Email</div>'
  }

  const mockContentRecord: GeneratedContentRecord = {
    id: 1,
    lead_id: 123,
    touchpoint: 1,
    content_type: 'email_sequence',
    content: mockClaudeResponse,
    status: 'generated',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getLeadContent', () => {
    it('should return content for a lead when API call succeeds', async () => {
      const mockApiResponse: ApiResult<GeneratedContentRecord[]> = {
        success: true,
        data: [mockContentRecord]
      }

      mockApi.content.getByLead.mockResolvedValue(mockApiResponse)

      const result = await contentStorage.getLeadContent('123')

      expect(result).toEqual(mockClaudeResponse)
      expect(mockApi.content.getByLead).toHaveBeenCalledWith(123)
    })

    it('should return null when no content exists for lead', async () => {
      const mockApiResponse: ApiResult<GeneratedContentRecord[]> = {
        success: true,
        data: []
      }

      mockApi.content.getByLead.mockResolvedValue(mockApiResponse)

      const result = await contentStorage.getLeadContent('123')

      expect(result).toBeNull()
    })

    it('should return null when API call fails', async () => {
      const mockApiResponse: ApiResult<GeneratedContentRecord[]> = {
        success: false,
        error: {
          type: 'DatabaseError',
          message: 'Database connection failed'
        }
      }

      mockApi.content.getByLead.mockResolvedValue(mockApiResponse)

      const result = await contentStorage.getLeadContent('123')

      expect(result).toBeNull()
    })

    it('should handle API call exceptions', async () => {
      mockApi.content.getByLead.mockRejectedValue(new Error('Network error'))

      const result = await contentStorage.getLeadContent('123')

      expect(result).toBeNull()
    })
  })

  describe('hasLeadContent', () => {
    it('should return true when content exists for lead', async () => {
      const mockApiResponse: ApiResult<GeneratedContentRecord[]> = {
        success: true,
        data: [mockContentRecord]
      }

      mockApi.content.getByLead.mockResolvedValue(mockApiResponse)

      const result = await contentStorage.hasLeadContent('123')

      expect(result).toBe(true)
    })

    it('should return false when no content exists for lead', async () => {
      const mockApiResponse: ApiResult<GeneratedContentRecord[]> = {
        success: true,
        data: []
      }

      mockApi.content.getByLead.mockResolvedValue(mockApiResponse)

      const result = await contentStorage.hasLeadContent('123')

      expect(result).toBe(false)
    })

    it('should return false when API call fails', async () => {
      const mockApiResponse: ApiResult<GeneratedContentRecord[]> = {
        success: false,
        error: {
          type: 'DatabaseError',
          message: 'Database connection failed'
        }
      }

      mockApi.content.getByLead.mockResolvedValue(mockApiResponse)

      const result = await contentStorage.hasLeadContent('123')

      expect(result).toBe(false)
    })
  })

  describe('persistContentToStorage', () => {
    it('should persist content successfully', async () => {
      const mockApiResponse: ApiResult<GeneratedContentRecord> = {
        success: true,
        data: mockContentRecord
      }

      mockApi.content.create.mockResolvedValue(mockApiResponse)

      const result = await contentStorage.persistContentToStorage('123', mockClaudeResponse, 1)

      expect(result).toBe(true)
      expect(mockApi.content.create).toHaveBeenCalledWith({
        lead_id: 123,
        touchpoint: 1,
        content_type: 'email_sequence',
        content: mockClaudeResponse,
        status: 'generated'
      })
    })

    it('should return false when API call fails', async () => {
      const mockApiResponse: ApiResult<any> = {
        success: false,
        error: {
          type: 'DatabaseError',
          message: 'Failed to create content'
        }
      }

      mockApi.content.create.mockResolvedValue(mockApiResponse)

      const result = await contentStorage.persistContentToStorage('123', mockClaudeResponse)

      expect(result).toBe(false)
    })

    it('should handle API call exceptions', async () => {
      mockApi.content.create.mockRejectedValue(new Error('Network error'))

      const result = await contentStorage.persistContentToStorage('123', mockClaudeResponse)

      expect(result).toBe(false)
    })
  })

  describe('clearLeadContent', () => {
    it('should clear all content for a lead successfully', async () => {
      const mockGetResponse: ApiResult<GeneratedContentRecord[]> = {
        success: true,
        data: [mockContentRecord, { ...mockContentRecord, id: 2 }]
      }

      const mockDeleteResponse: ApiResult<void> = {
        success: true,
        data: undefined
      }

      mockApi.content.getByLead.mockResolvedValue(mockGetResponse)
      mockApi.content.delete.mockResolvedValue(mockDeleteResponse)

      const result = await contentStorage.clearLeadContent('123')

      expect(result).toBe(true)
      expect(mockApi.content.delete).toHaveBeenCalledTimes(2)
      expect(mockApi.content.delete).toHaveBeenCalledWith(1)
      expect(mockApi.content.delete).toHaveBeenCalledWith(2)
    })

    it('should return false when get content fails', async () => {
      const mockGetResponse: ApiResult<any> = {
        success: false,
        error: {
          type: 'DatabaseError',
          message: 'Failed to get content'
        }
      }

      mockApi.content.getByLead.mockResolvedValue(mockGetResponse)

      const result = await contentStorage.clearLeadContent('123')

      expect(result).toBe(false)
    })

    it('should return false when some deletions fail', async () => {
      const mockGetResponse: ApiResult<GeneratedContentRecord[]> = {
        success: true,
        data: [mockContentRecord, { ...mockContentRecord, id: 2 }]
      }

      const mockSuccessResponse: ApiResult<void> = {
        success: true,
        data: undefined
      }

      const mockFailResponse: ApiResult<any> = {
        success: false,
        error: {
          type: 'NotFoundError',
          message: 'Content not found'
        }
      }

      mockApi.content.getByLead.mockResolvedValue(mockGetResponse)
      mockApi.content.delete
        .mockResolvedValueOnce(mockSuccessResponse)
        .mockResolvedValueOnce(mockFailResponse)

      const result = await contentStorage.clearLeadContent('123')

      expect(result).toBe(false)
    })
  })

  describe('clearAllContent', () => {
    it('should return true (placeholder implementation)', async () => {
      const result = await contentStorage.clearAllContent()

      expect(result).toBe(true)
    })
  })

  describe('getContentByTouchpoint', () => {
    it('should return content for a specific touchpoint', async () => {
      const mockApiResponse: ApiResult<GeneratedContentRecord[]> = {
        success: true,
        data: [mockContentRecord]
      }

      mockApi.content.getByTouchpoint.mockResolvedValue(mockApiResponse)

      const result = await contentStorage.getContentByTouchpoint(1)

      expect(result).toEqual([mockContentRecord])
      expect(mockApi.content.getByTouchpoint).toHaveBeenCalledWith(1)
    })

    it('should return empty array when API call fails', async () => {
      const mockApiResponse: ApiResult<any> = {
        success: false,
        error: {
          type: 'DatabaseError',
          message: 'Database connection failed'
        }
      }

      mockApi.content.getByTouchpoint.mockResolvedValue(mockApiResponse)

      const result = await contentStorage.getContentByTouchpoint(1)

      expect(result).toEqual([])
    })
  })

  describe('updateContentStatus', () => {
    it('should update content status successfully', async () => {
      const mockApiResponse: ApiResult<GeneratedContentRecord> = {
        success: true,
        data: { ...mockContentRecord, status: 'reviewed' }
      }

      mockApi.content.update.mockResolvedValue(mockApiResponse)

      const result = await contentStorage.updateContentStatus(1, 'reviewed')

      expect(result).toBe(true)
      expect(mockApi.content.update).toHaveBeenCalledWith(1, { status: 'reviewed' })
    })

    it('should return false when API call fails', async () => {
      const mockApiResponse: ApiResult<any> = {
        success: false,
        error: {
          type: 'NotFoundError',
          message: 'Content not found'
        }
      }

      mockApi.content.update.mockResolvedValue(mockApiResponse)

      const result = await contentStorage.updateContentStatus(1, 'reviewed')

      expect(result).toBe(false)
    })

    it('should handle API call exceptions', async () => {
      mockApi.content.update.mockRejectedValue(new Error('Network error'))

      const result = await contentStorage.updateContentStatus(1, 'reviewed')

      expect(result).toBe(false)
    })
  })
})
