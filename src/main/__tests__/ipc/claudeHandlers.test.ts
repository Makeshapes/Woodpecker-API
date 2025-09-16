import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ipcMain } from 'electron'
import { setupClaudeHandlers, removeClaudeHandlers } from '../../ipc/claudeHandlers'
import type { ClaudeGenerateContentRequest, ClaudeFileUploadRequest } from '../../ipc/claudeHandlers'

// Mock electron
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    removeHandler: vi.fn()
  }
}))

// Mock Claude service
const mockGenerateContentWithRetry = vi.fn()
const mockUploadFile = vi.fn()
const mockDeleteFile = vi.fn()
const mockGetRequestCount = vi.fn()
const mockGetRemainingRequests = vi.fn()

vi.mock('../../services/claudeService', () => ({
  ClaudeService: vi.fn().mockImplementation(() => ({
    generateContentWithRetry: mockGenerateContentWithRetry,
    uploadFile: mockUploadFile,
    deleteFile: mockDeleteFile,
    getRequestCount: mockGetRequestCount,
    getRemainingRequests: mockGetRemainingRequests
  })),
  createClaudeService: vi.fn().mockImplementation(() => ({
    generateContentWithRetry: mockGenerateContentWithRetry,
    uploadFile: mockUploadFile,
    deleteFile: mockDeleteFile,
    getRequestCount: mockGetRequestCount,
    getRemainingRequests: mockGetRemainingRequests
  })),
  ClaudeApiError: class ClaudeApiError extends Error {
    constructor(message: string, public category: string, public retryable: boolean) {
      super(message)
    }
  }
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

// Mock utils
vi.mock('../../ipc/utils', () => ({
  handleIpcError: vi.fn((error) => ({
    success: false,
    error: {
      type: 'TestError',
      message: error.message,
      code: 'TEST_ERROR'
    }
  })),
  createSuccessResponse: vi.fn((data) => ({
    success: true,
    data
  })),
  logIpcOperation: vi.fn(),
  validateInput: vi.fn(),
  sanitizeInput: vi.fn((input) => input)
}))

describe('Claude IPC Handlers', () => {
  let handlers: { [key: string]: Function } = {}

  beforeEach(() => {
    vi.clearAllMocks()
    handlers = {}
    
    // Capture handlers when they're registered
    ;(ipcMain.handle as any).mockImplementation((channel: string, handler: Function) => {
      handlers[channel] = handler
    })
    
    setupClaudeHandlers()
  })

  afterEach(() => {
    removeClaudeHandlers()
  })

  describe('setupClaudeHandlers', () => {
    it('should register all Claude IPC handlers', () => {
      expect(ipcMain.handle).toHaveBeenCalledWith('ipc:claude:generateContent', expect.any(Function))
      expect(ipcMain.handle).toHaveBeenCalledWith('ipc:claude:uploadFile', expect.any(Function))
      expect(ipcMain.handle).toHaveBeenCalledWith('ipc:claude:deleteFile', expect.any(Function))
      expect(ipcMain.handle).toHaveBeenCalledWith('ipc:claude:getQuotaInfo', expect.any(Function))
    })
  })

  describe('generateContent handler', () => {
    it('should handle successful content generation', async () => {
      const mockRequest: ClaudeGenerateContentRequest = {
        prompt: 'Test prompt',
        leadData: { email: 'test@example.com' },
        modelId: 'claude-sonnet-4-20250514',
        maxRetries: 3
      }

      const mockResponse = {
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        company: 'Test Corp',
        title: 'CEO',
        linkedin_url: '',
        tags: '',
        industry: 'Technology',
        snippet1: 'Subject',
        snippet2: 'Email',
        snippet3: 'LinkedIn',
        snippet4: 'Bump1',
        snippet5: 'Bump2',
        snippet6: 'Bump3',
        snippet7: 'Breakup'
      }

      mockGenerateContentWithRetry.mockResolvedValue(mockResponse)

      const handler = handlers['ipc:claude:generateContent']
      const result = await handler({}, mockRequest)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockResponse)
      expect(mockGenerateContentWithRetry).toHaveBeenCalledWith(
        mockRequest.prompt,
        mockRequest.leadData,
        mockRequest.maxRetries,
        mockRequest.modelId,
        mockRequest.systemPrompt,
        mockRequest.fileIds
      )
    })

    it('should handle validation errors', async () => {
      const invalidRequest = {
        // Missing required fields
        leadData: { email: 'test@example.com' }
      }

      const handler = handlers['ipc:claude:generateContent']
      const result = await handler({}, invalidRequest)

      expect(result.success).toBe(false)
    })

    it('should handle Claude API errors', async () => {
      const mockRequest: ClaudeGenerateContentRequest = {
        prompt: 'Test prompt',
        leadData: { email: 'test@example.com' }
      }

      mockGenerateContentWithRetry.mockRejectedValue(new Error('API Error'))

      const handler = handlers['ipc:claude:generateContent']
      const result = await handler({}, mockRequest)

      expect(result.success).toBe(false)
    })
  })

  describe('uploadFile handler', () => {
    it('should handle successful file upload', async () => {
      const mockRequest: ClaudeFileUploadRequest = {
        fileBuffer: new ArrayBuffer(1024),
        filename: 'test.txt',
        mimeType: 'text/plain'
      }

      const mockFileId = 'file-123'
      mockUploadFile.mockResolvedValue(mockFileId)

      const handler = handlers['ipc:claude:uploadFile']
      const result = await handler({}, mockRequest)

      expect(result.success).toBe(true)
      expect(result.data.fileId).toBe(mockFileId)
    })

    it('should validate file size', async () => {
      const largeFileRequest: ClaudeFileUploadRequest = {
        fileBuffer: new ArrayBuffer(20 * 1024 * 1024), // 20MB - exceeds 10MB limit
        filename: 'large.txt',
        mimeType: 'text/plain'
      }

      const handler = handlers['ipc:claude:uploadFile']
      const result = await handler({}, largeFileRequest)

      expect(result.success).toBe(false)
    })

    it('should validate file type', async () => {
      const invalidTypeRequest: ClaudeFileUploadRequest = {
        fileBuffer: new ArrayBuffer(1024),
        filename: 'test.exe',
        mimeType: 'application/x-executable'
      }

      const handler = handlers['ipc:claude:uploadFile']
      const result = await handler({}, invalidTypeRequest)

      expect(result.success).toBe(false)
    })
  })

  describe('deleteFile handler', () => {
    it('should handle successful file deletion', async () => {
      const fileId = 'file-123'
      mockDeleteFile.mockResolvedValue(undefined)

      const handler = handlers['ipc:claude:deleteFile']
      const result = await handler({}, fileId)

      expect(result.success).toBe(true)
      expect(mockDeleteFile).toHaveBeenCalledWith(fileId)
    })

    it('should validate file ID', async () => {
      const handler = handlers['ipc:claude:deleteFile']
      const result = await handler({}, '')

      expect(result.success).toBe(false)
    })
  })

  describe('getQuotaInfo handler', () => {
    it('should return quota information', async () => {
      mockGetRequestCount.mockReturnValue(5)
      mockGetRemainingRequests.mockReturnValue(95)

      const handler = handlers['ipc:claude:getQuotaInfo']
      const result = await handler({})

      expect(result.success).toBe(true)
      expect(result.data).toEqual({
        requestCount: 5,
        remainingRequests: 95,
        maxRequestsPerMinute: 100
      })
    })
  })

  describe('removeClaudeHandlers', () => {
    it('should remove all Claude IPC handlers', () => {
      removeClaudeHandlers()

      expect(ipcMain.removeHandler).toHaveBeenCalledWith('ipc:claude:generateContent')
      expect(ipcMain.removeHandler).toHaveBeenCalledWith('ipc:claude:uploadFile')
      expect(ipcMain.removeHandler).toHaveBeenCalledWith('ipc:claude:deleteFile')
      expect(ipcMain.removeHandler).toHaveBeenCalledWith('ipc:claude:getQuotaInfo')
    })
  })
})
