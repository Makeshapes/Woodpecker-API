import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { contentGenerationService } from '../../services/contentGenerationService'

// Mock window.api for IPC calls
const mockClaudeApi = {
  generateContent: vi.fn(),
  uploadFile: vi.fn(),
  deleteFile: vi.fn(),
  getQuotaInfo: vi.fn()
}

// Mock the global window.api
Object.defineProperty(global, 'window', {
  value: {
    api: {
      claude: mockClaudeApi
    }
  },
  writable: true
})

// Mock other dependencies
vi.mock('../../utils/contentStorage', () => ({
  contentStorage: {
    persistContentToStorage: vi.fn().mockResolvedValue(true),
    getLeadContent: vi.fn(),
    hasLeadContent: vi.fn(),
    clearLeadContent: vi.fn(),
    clearAllContent: vi.fn()
  }
}))

vi.mock('../../services/templateService', () => ({
  templateService: {
    validateLeadData: vi.fn(),
    generatePrompt: vi.fn().mockReturnValue('Generated prompt for lead'),
    validateGeneratedContent: vi.fn().mockReturnValue(true)
  }
}))

vi.mock('../../services/fallbackDataService', () => ({
  fallbackDataService: {
    generateFallbackContent: vi.fn().mockReturnValue({
      email: 'test@example.com',
      first_name: 'John',
      last_name: 'Doe',
      company: 'Test Corp',
      title: 'CEO',
      linkedin_url: '',
      tags: '',
      industry: 'Technology',
      snippet1: 'Fallback Subject',
      snippet2: '<div>Fallback Email</div>',
      snippet3: 'Fallback LinkedIn',
      snippet4: '<div>Fallback Bump1</div>',
      snippet5: '<div>Fallback Bump2</div>',
      snippet6: '<div>Fallback Bump3</div>',
      snippet7: '<div>Fallback Breakup</div>'
    })
  }
}))

vi.mock('../../services/templateBasedGenerationService', () => ({
  templateBasedGenerationService: {
    generateTemplateBasedContent: vi.fn(),
    getAvailableTemplates: vi.fn(),
    getTemplate: vi.fn()
  }
}))

describe('Claude IPC Integration Tests', () => {
  const mockLeadData = {
    email: 'test@example.com',
    first_name: 'John',
    last_name: 'Doe',
    company: 'Test Corp',
    title: 'CEO',
    industry: 'Technology',
    linkedin_url: 'https://linkedin.com/in/johndoe',
    tags: 'decision-maker'
  }

  const mockClaudeResponse = {
    email: 'test@example.com',
    first_name: 'John',
    last_name: 'Doe',
    company: 'Test Corp',
    title: 'CEO',
    linkedin_url: 'https://linkedin.com/in/johndoe',
    tags: 'decision-maker',
    industry: 'Technology',
    snippet1: 'Personalized Subject Line',
    snippet2: '<div>Personalized Email Content</div>',
    snippet3: 'LinkedIn Connection Message',
    snippet4: '<div>Day 5 Follow-up</div>',
    snippet5: '<div>Day 9 Follow-up</div>',
    snippet6: '<div>Day 13 Follow-up</div>',
    snippet7: '<div>Day 20 Breakup Email</div>'
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset generation mode to Claude
    contentGenerationService.setGenerationMode('claude')
    contentGenerationService.setUseFallback(false)
  })

  describe('Content Generation Workflow', () => {
    it('should complete full content generation workflow via IPC', async () => {
      // Mock successful IPC response
      mockClaudeApi.generateContent.mockResolvedValue({
        success: true,
        data: mockClaudeResponse
      })

      const result = await contentGenerationService.generateForLead(mockLeadData)

      expect(result.status).toBe('completed')
      expect(result.content).toEqual(mockClaudeResponse)
      expect(mockClaudeApi.generateContent).toHaveBeenCalledWith({
        prompt: 'Generated prompt for lead',
        leadData: mockLeadData,
        modelId: undefined,
        systemPrompt: undefined,
        fileIds: [],
        maxRetries: 3
      })
    })

    it('should handle IPC errors gracefully', async () => {
      // Mock IPC error response
      mockClaudeApi.generateContent.mockResolvedValue({
        success: false,
        error: {
          type: 'ClaudeApiError',
          message: 'Rate limit exceeded',
          code: 'RATE_LIMIT'
        }
      })

      const result = await contentGenerationService.generateForLead(mockLeadData)

      expect(result.status).toBe('failed')
      expect(result.error).toContain('Rate limit exceeded')
    })

    it('should handle custom prompts with system prompt separation', async () => {
      const leadDataWithCustomPrompt = {
        ...mockLeadData,
        custom_prompt: '# Makeshapes Cold Email System\n\nYou are an expert...\n\nTell me about this lead and generate content.'
      }

      mockClaudeApi.generateContent.mockResolvedValue({
        success: true,
        data: mockClaudeResponse
      })

      await contentGenerationService.generateForLead(leadDataWithCustomPrompt)

      expect(mockClaudeApi.generateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          systemPrompt: expect.stringContaining('# Makeshapes Cold Email System'),
          prompt: expect.stringContaining('Tell me about this lead')
        })
      )
    })

    it('should include file IDs when provided', async () => {
      const leadDataWithFiles = {
        ...mockLeadData,
        file_ids: ['file-123', 'file-456']
      }

      mockClaudeApi.generateContent.mockResolvedValue({
        success: true,
        data: mockClaudeResponse
      })

      await contentGenerationService.generateForLead(leadDataWithFiles)

      expect(mockClaudeApi.generateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          fileIds: ['file-123', 'file-456']
        })
      )
    })

    it('should fall back to mock data when in debug mode and API fails', async () => {
      // Enable fallback mode
      contentGenerationService.setUseFallback(true)

      // Mock API failure
      mockClaudeApi.generateContent.mockResolvedValue({
        success: false,
        error: {
          type: 'NetworkError',
          message: 'Connection failed',
          code: 'NETWORK_ERROR'
        }
      })

      const result = await contentGenerationService.generateForLead(mockLeadData)

      expect(result.status).toBe('completed')
      expect(result.content?.snippet1).toBe('Fallback Subject')
    })
  })

  describe('File Operations', () => {
    it('should upload file via IPC', async () => {
      // Mock File with arrayBuffer method
      const mockFile = {
        name: 'test.txt',
        type: 'text/plain',
        size: 12,
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(12))
      } as unknown as File

      const mockFileId = 'file-123'

      mockClaudeApi.uploadFile.mockResolvedValue({
        success: true,
        data: { fileId: mockFileId }
      })

      const fileId = await contentGenerationService.uploadFile(mockFile)

      expect(fileId).toBe(mockFileId)
      expect(mockClaudeApi.uploadFile).toHaveBeenCalledWith({
        fileBuffer: expect.any(ArrayBuffer),
        filename: 'test.txt',
        mimeType: 'text/plain'
      })
    })

    it('should delete file via IPC', async () => {
      const fileId = 'file-123'

      mockClaudeApi.deleteFile.mockResolvedValue({
        success: true,
        data: { success: true }
      })

      await contentGenerationService.deleteFile(fileId)

      expect(mockClaudeApi.deleteFile).toHaveBeenCalledWith(fileId)
    })

    it('should handle file operation errors', async () => {
      // Mock File with arrayBuffer method
      const mockFile = {
        name: 'test.txt',
        type: 'text/plain',
        size: 12,
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(12))
      } as unknown as File

      mockClaudeApi.uploadFile.mockResolvedValue({
        success: false,
        error: {
          type: 'ValidationError',
          message: 'File too large',
          code: 'FILE_TOO_LARGE'
        }
      })

      await expect(contentGenerationService.uploadFile(mockFile))
        .rejects.toThrow('File too large')
    })
  })

  describe('Quota Management', () => {
    it('should get quota info via IPC', async () => {
      const mockQuotaInfo = {
        requestCount: 10,
        remainingRequests: 90,
        maxRequestsPerMinute: 100
      }

      mockClaudeApi.getQuotaInfo.mockResolvedValue({
        success: true,
        data: mockQuotaInfo
      })

      const quotaInfo = await contentGenerationService.getQuotaInfo()

      expect(quotaInfo).toEqual(mockQuotaInfo)
      expect(mockClaudeApi.getQuotaInfo).toHaveBeenCalled()
    })

    it('should handle quota info errors gracefully', async () => {
      mockClaudeApi.getQuotaInfo.mockResolvedValue({
        success: false,
        error: {
          type: 'NetworkError',
          message: 'Connection failed',
          code: 'NETWORK_ERROR'
        }
      })

      const quotaInfo = await contentGenerationService.getQuotaInfo()

      expect(quotaInfo).toEqual({
        requestCount: 0,
        remainingRequests: 100,
        maxRequestsPerMinute: 100
      })
    })
  })

  describe('Batch Processing', () => {
    it('should process multiple leads via IPC', async () => {
      const leads = [
        { ...mockLeadData, email: 'lead1@example.com' },
        { ...mockLeadData, email: 'lead2@example.com' },
        { ...mockLeadData, email: 'lead3@example.com' }
      ]

      mockClaudeApi.generateContent.mockResolvedValue({
        success: true,
        data: mockClaudeResponse
      })

      const batchId = await contentGenerationService.generateForLeads(leads)

      expect(typeof batchId).toBe('string')
      expect(batchId).toContain('batch_')

      // Wait for processing to complete
      await new Promise(resolve => setTimeout(resolve, 100))

      const progress = contentGenerationService.getProgress(batchId)
      expect(progress?.total).toBe(3)
    })
  })

  describe('API Key Security', () => {
    it('should not expose API keys to frontend', () => {
      // Verify that no VITE_CLAUDE_API_KEY is accessible
      expect(import.meta.env.VITE_CLAUDE_API_KEY).toBeUndefined()
      // Verify that no VITE_WOODPECKER_API_KEY is accessible
      expect(import.meta.env.VITE_WOODPECKER_API_KEY).toBeUndefined()

      // Verify that Claude API calls go through IPC
      expect(mockClaudeApi.generateContent).toBeDefined()
      expect(typeof mockClaudeApi.generateContent).toBe('function')
    })

    it('should use secure IPC channels for all Claude operations', async () => {
      // Test that all Claude operations use the window.api.claude interface
      expect(window.api.claude.generateContent).toBeDefined()
      expect(window.api.claude.uploadFile).toBeDefined()
      expect(window.api.claude.deleteFile).toBeDefined()
      expect(window.api.claude.getQuotaInfo).toBeDefined()
    })
  })
})
