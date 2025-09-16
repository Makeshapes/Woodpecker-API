import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ClaudeService, ClaudeApiError, createClaudeService } from '../../services/claudeService'

// Mock Anthropic SDK
const mockCreate = vi.fn()

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: mockCreate
    },
    apiKey: 'test-api-key'
  }))
}))

// Mock logger
vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }
}))

// Mock fetch for file operations
global.fetch = vi.fn()
global.FormData = vi.fn().mockImplementation(() => ({
  append: vi.fn()
}))
global.Blob = vi.fn().mockImplementation((data, options) => ({
  type: options?.type || 'application/octet-stream'
}))

describe('ClaudeService', () => {
  let claudeService: ClaudeService
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv, CLAUDE_API_KEY: 'test-api-key' }
    claudeService = new ClaudeService()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('constructor', () => {
    it('should initialize with API key from environment', () => {
      const AnthropicMock = vi.mocked(require('@anthropic-ai/sdk').default)
      expect(AnthropicMock).toHaveBeenCalledWith({
        apiKey: 'test-api-key',
        defaultHeaders: {
          'anthropic-beta': 'files-api-2025-04-14'
        }
      })
    })

    it('should throw error when no API key is provided', () => {
      delete process.env.CLAUDE_API_KEY
      expect(() => new ClaudeService()).toThrow(ClaudeApiError)
    })

    it('should throw error when API key is "replace"', () => {
      process.env.CLAUDE_API_KEY = 'replace'
      expect(() => new ClaudeService()).toThrow(ClaudeApiError)
    })

    it('should use provided API key over environment variable', () => {
      const customKey = 'custom-api-key'
      new ClaudeService(customKey)
      const AnthropicMock = vi.mocked(require('@anthropic-ai/sdk').default)
      expect(AnthropicMock).toHaveBeenCalledWith({
        apiKey: customKey,
        defaultHeaders: {
          'anthropic-beta': 'files-api-2025-04-14'
        }
      })
    })
  })

  describe('generateContent', () => {
    const mockLeadData = {
      email: 'test@example.com',
      first_name: 'John',
      last_name: 'Doe',
      company: 'Test Corp',
      title: 'CEO',
      industry: 'Technology'
    }

    const mockPrompt = 'Generate content for this lead'

    it('should generate content successfully with block format', async () => {
      const mockResponse = {
        content: [{
          type: 'text',
          text: 'Subject Line---BLOCK---Email Content---BLOCK---LinkedIn Message---BLOCK---Day 5 Bump---BLOCK---Day 9 Follow-up---BLOCK---Day 13 Bump---BLOCK---Day 20 Breakup'
        }],
        usage: { input_tokens: 100, output_tokens: 200 }
      }

      mockCreate.mockResolvedValue(mockResponse)

      const result = await claudeService.generateContent(mockPrompt, mockLeadData)

      expect(result).toEqual({
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        company: 'Test Corp',
        title: 'CEO',
        linkedin_url: '',
        tags: '',
        industry: 'Technology',
        snippet1: 'Subject Line',
        snippet2: '<div>Email Content</div>',
        snippet3: 'LinkedIn Message',
        snippet4: '<div>Day 5 Bump</div>',
        snippet5: '<div>Day 9 Follow-up</div>',
        snippet6: '<div>Day 13 Bump</div>',
        snippet7: '<div>Day 20 Breakup</div>'
      })
    })

    it('should generate content successfully with JSON format', async () => {
      const mockJsonResponse = {
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        company: 'Test Corp',
        title: 'CEO',
        linkedin_url: '',
        tags: '',
        industry: 'Technology',
        snippet1: 'Subject Line',
        snippet2: 'Email Content',
        snippet3: 'LinkedIn Message',
        snippet4: 'Day 5 Bump',
        snippet5: 'Day 9 Follow-up',
        snippet6: 'Day 13 Bump',
        snippet7: 'Day 20 Breakup'
      }

      const mockResponse = {
        content: [{
          type: 'text',
          text: JSON.stringify(mockJsonResponse)
        }],
        usage: { input_tokens: 100, output_tokens: 200 }
      }

      mockCreate.mockResolvedValue(mockResponse)

      const result = await claudeService.generateContent(mockPrompt, mockLeadData)

      expect(result.snippet1).toBe('Subject Line')
      expect(result.snippet2).toContain('<div>Email Content</div>')
    })

    it('should handle API errors correctly', async () => {
      const apiError = {
        status: 401,
        message: 'Invalid API key'
      }
      mockCreate.mockRejectedValue(apiError)

      await expect(claudeService.generateContent(mockPrompt, mockLeadData))
        .rejects.toThrow(ClaudeApiError)
    })

    it('should include system prompt when provided', async () => {
      const systemPrompt = 'You are a helpful assistant'
      const mockResponse = {
        content: [{
          type: 'text',
          text: 'Subject---BLOCK---Email---BLOCK---LinkedIn---BLOCK---Bump1---BLOCK---Bump2---BLOCK---Bump3---BLOCK---Breakup'
        }],
        usage: { input_tokens: 100, output_tokens: 200 }
      }

      mockCreate.mockResolvedValue(mockResponse)

      await claudeService.generateContent(mockPrompt, mockLeadData, 'claude-sonnet-4-20250514', systemPrompt)

      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
        system: systemPrompt
      }))
    })

    it('should include file references when provided', async () => {
      const fileIds = ['file-123', 'file-456']
      const mockResponse = {
        content: [{
          type: 'text',
          text: 'Subject---BLOCK---Email---BLOCK---LinkedIn---BLOCK---Bump1---BLOCK---Bump2---BLOCK---Bump3---BLOCK---Breakup'
        }],
        usage: { input_tokens: 100, output_tokens: 200 }
      }

      mockCreate.mockResolvedValue(mockResponse)

      await claudeService.generateContent(mockPrompt, mockLeadData, 'claude-sonnet-4-20250514', undefined, fileIds)

      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            content: expect.arrayContaining([
              { type: 'text', text: mockPrompt },
              { type: 'image', source: { type: 'file', file_id: 'file-123' } },
              { type: 'image', source: { type: 'file', file_id: 'file-456' } }
            ])
          })
        ])
      }))
    })
  })

  describe('generateContentWithRetry', () => {
    const mockLeadData = { email: 'test@example.com' }
    const mockPrompt = 'Test prompt'

    it('should retry on retryable errors', async () => {
      const retryableError = new ClaudeApiError('Rate limit', 'rate_limit', true)
      const mockResponse = {
        content: [{
          type: 'text',
          text: 'Subject---BLOCK---Email---BLOCK---LinkedIn---BLOCK---Bump1---BLOCK---Bump2---BLOCK---Bump3---BLOCK---Breakup'
        }],
        usage: { input_tokens: 100, output_tokens: 200 }
      }

      mockCreate
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValue(mockResponse)

      const result = await claudeService.generateContentWithRetry(mockPrompt, mockLeadData, 2)
      expect(result).toBeDefined()
      expect(mockCreate).toHaveBeenCalledTimes(2)
    })

    it('should not retry on non-retryable errors', async () => {
      const nonRetryableError = new ClaudeApiError('Auth error', 'auth', false)
      mockCreate.mockRejectedValue(nonRetryableError)

      await expect(claudeService.generateContentWithRetry(mockPrompt, mockLeadData, 2))
        .rejects.toThrow(ClaudeApiError)
      expect(mockCreate).toHaveBeenCalledTimes(1)
    })
  })

  describe('rate limiting', () => {
    it('should track request count', () => {
      const initialCount = claudeService.getRequestCount()
      expect(typeof initialCount).toBe('number')
    })

    it('should calculate remaining requests', () => {
      const remaining = claudeService.getRemainingRequests()
      expect(typeof remaining).toBe('number')
      expect(remaining).toBeGreaterThanOrEqual(0)
    })
  })

  describe('file operations', () => {
    it('should upload file successfully', async () => {
      const mockResponse = { ok: true, json: () => Promise.resolve({ id: 'file-123' }) }
      ;(global.fetch as any).mockResolvedValue(mockResponse)

      const buffer = Buffer.from('test file content')
      const fileId = await claudeService.uploadFile(buffer, 'test.txt', 'text/plain')

      expect(fileId).toBe('file-123')
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/files',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'x-api-key': 'test-api-key'
          })
        })
      )
    })

    it('should delete file successfully', async () => {
      const mockResponse = { ok: true }
      ;(global.fetch as any).mockResolvedValue(mockResponse)

      await claudeService.deleteFile('file-123')

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/files/file-123',
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            'x-api-key': 'test-api-key'
          })
        })
      )
    })
  })

  describe('factory function', () => {
    it('should create service instance', () => {
      const service = createClaudeService('test-key')
      expect(service).toBeInstanceOf(ClaudeService)
    })
  })
})
