import { ipcMain } from 'electron'
import { ClaudeService, createClaudeService, ClaudeApiError } from '../services/claudeService'
import type { ClaudeResponse } from '../services/claudeService'
import { handleIpcError, createSuccessResponse, logIpcOperation, validateInput, sanitizeInput } from './utils'
import { logger } from '../utils/logger'

// Claude service instance
let claudeService: ClaudeService | null = null

// Initialize Claude service with error handling
function initializeClaudeService(): ClaudeService {
  if (!claudeService) {
    try {
      claudeService = createClaudeService()
      logger.info('ClaudeHandlers', 'Claude service initialized successfully')
    } catch (error) {
      logger.error('ClaudeHandlers', 'Failed to initialize Claude service', error instanceof Error ? error : new Error(String(error)))
      throw error
    }
  }
  return claudeService
}

// Request interface for content generation
export interface ClaudeGenerateContentRequest {
  prompt: string
  leadData: Record<string, unknown>
  modelId?: string
  systemPrompt?: string
  fileIds?: string[]
  maxRetries?: number
}

// Response interface for file upload
export interface ClaudeFileUploadRequest {
  fileBuffer: ArrayBuffer
  filename: string
  mimeType: string
}

/**
 * Setup Claude-related IPC handlers
 */
export function setupClaudeHandlers(): void {
  logger.info('ClaudeHandlers', 'Setting up Claude IPC handlers...')

  // Generate content handler
  ipcMain.handle('ipc:claude:generateContent', async (event, request: ClaudeGenerateContentRequest) => {
    logIpcOperation('claude:generateContent', { 
      promptLength: request.prompt?.length,
      modelId: request.modelId,
      hasSystemPrompt: !!request.systemPrompt,
      fileCount: request.fileIds?.length || 0,
      maxRetries: request.maxRetries
    })

    try {
      // Validate required fields
      validateInput(request, ['prompt', 'leadData'])
      
      // Sanitize input
      const sanitizedRequest = sanitizeInput(request) as ClaudeGenerateContentRequest
      
      // Debug: Log received request details
      console.log('🔧 [DEBUG - ClaudeHandlers] Received request:')
      console.log('🔧 [DEBUG] prompt length:', sanitizedRequest.prompt?.length || 0, 'chars')
      console.log('🔧 [DEBUG] prompt preview:', sanitizedRequest.prompt?.substring(0, 300) + '...' || 'None')
      console.log('🔧 [DEBUG] systemPrompt length:', sanitizedRequest.systemPrompt?.length || 0, 'chars')
      console.log('🔧 [DEBUG] systemPrompt preview:', sanitizedRequest.systemPrompt?.substring(0, 200) + '...' || 'None')
      console.log('🔧 [DEBUG] fileIds count:', sanitizedRequest.fileIds?.length || 0)
      console.log('🔧 [DEBUG] modelId:', sanitizedRequest.modelId)

      // Validate prompt length
      if (!sanitizedRequest.prompt || sanitizedRequest.prompt.trim().length === 0) {
        throw new Error('Prompt cannot be empty')
      }

      if (sanitizedRequest.prompt.length > 100000) {
        console.log('🔧 [DEBUG] PROMPT TOO LONG! Length:', sanitizedRequest.prompt.length)
        throw new Error('Prompt is too long (max 100,000 characters)')
      }

      console.log('🔧 [DEBUG] Prompt length validation passed:', sanitizedRequest.prompt.length, 'chars')

      // Validate leadData
      if (!sanitizedRequest.leadData || typeof sanitizedRequest.leadData !== 'object') {
        throw new Error('Lead data must be a valid object')
      }

      // Initialize Claude service
      const service = initializeClaudeService()

      // Generate content with retry
      console.log('🔧 [DEBUG - ClaudeHandlers] Calling Claude service with:')
      console.log('🔧 [DEBUG] Final prompt to Claude service:', sanitizedRequest.prompt.length, 'chars')
      console.log('🔧 [DEBUG] Final systemPrompt to Claude service:', sanitizedRequest.systemPrompt?.length || 0, 'chars')

      const result = await service.generateContentWithRetry(
        sanitizedRequest.prompt,
        sanitizedRequest.leadData,
        sanitizedRequest.maxRetries || 3,
        sanitizedRequest.modelId,
        sanitizedRequest.systemPrompt,
        sanitizedRequest.fileIds
      )

      console.log('🔧 [DEBUG - ClaudeHandlers] Claude service returned result:')
      console.log('🔧 [DEBUG] Result keys:', Object.keys(result))
      console.log('🔧 [DEBUG] Result snippet1 preview:', result.snippet1?.substring(0, 100) || 'None')

      logger.info('ClaudeHandlers', 'Content generation completed successfully')
      return createSuccessResponse(result)

    } catch (error) {
      logger.error('ClaudeHandlers', 'Content generation failed', error instanceof Error ? error : new Error(String(error)))
      return handleIpcError(error, 'claude:generateContent')
    }
  })

  // Upload file handler
  ipcMain.handle('ipc:claude:uploadFile', async (event, request: ClaudeFileUploadRequest) => {
    logIpcOperation('claude:uploadFile', { 
      filename: request.filename,
      mimeType: request.mimeType,
      size: request.fileBuffer?.byteLength
    })

    try {
      // Validate required fields
      validateInput(request, ['fileBuffer', 'filename', 'mimeType'])
      
      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024 // 10MB
      if (request.fileBuffer.byteLength > maxSize) {
        throw new Error(`File size exceeds maximum allowed size of ${maxSize / 1024 / 1024}MB`)
      }

      // Validate file type (basic validation)
      const allowedTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'text/plain', 'text/csv', 'application/json'
      ]
      
      if (!allowedTypes.includes(request.mimeType)) {
        throw new Error(`File type ${request.mimeType} is not supported`)
      }

      // Initialize Claude service
      const service = initializeClaudeService()

      // Convert ArrayBuffer to Buffer
      const buffer = Buffer.from(request.fileBuffer)

      // Upload file
      const fileId = await service.uploadFile(buffer, request.filename, request.mimeType)

      logger.info('ClaudeHandlers', `File uploaded successfully: ${fileId}`)
      return createSuccessResponse({ fileId })

    } catch (error) {
      logger.error('ClaudeHandlers', 'File upload failed', error instanceof Error ? error : new Error(String(error)))
      return handleIpcError(error, 'claude:uploadFile')
    }
  })

  // Delete file handler
  ipcMain.handle('ipc:claude:deleteFile', async (event, fileId: string) => {
    logIpcOperation('claude:deleteFile', { fileId })

    try {
      // Validate file ID
      if (!fileId || typeof fileId !== 'string' || fileId.trim().length === 0) {
        throw new Error('File ID is required and must be a non-empty string')
      }

      // Initialize Claude service
      const service = initializeClaudeService()

      // Delete file
      await service.deleteFile(fileId.trim())

      logger.info('ClaudeHandlers', `File deleted successfully: ${fileId}`)
      return createSuccessResponse({ success: true })

    } catch (error) {
      logger.error('ClaudeHandlers', 'File deletion failed', error instanceof Error ? error : new Error(String(error)))
      return handleIpcError(error, 'claude:deleteFile')
    }
  })

  // Get quota info handler
  ipcMain.handle('ipc:claude:getQuotaInfo', async (event) => {
    logIpcOperation('claude:getQuotaInfo')

    try {
      // Initialize Claude service
      const service = initializeClaudeService()

      // Get quota information
      const quotaInfo = {
        requestCount: service.getRequestCount(),
        remainingRequests: service.getRemainingRequests(),
        maxRequestsPerMinute: 100
      }

      logger.debug('ClaudeHandlers', `Quota info retrieved: ${JSON.stringify(quotaInfo)}`)
      return createSuccessResponse(quotaInfo)

    } catch (error) {
      logger.error('ClaudeHandlers', 'Failed to get quota info', error instanceof Error ? error : new Error(String(error)))
      return handleIpcError(error, 'claude:getQuotaInfo')
    }
  })

  logger.info('ClaudeHandlers', 'Claude IPC handlers setup complete')
}

/**
 * Remove Claude IPC handlers (useful for cleanup)
 */
export function removeClaudeHandlers(): void {
  logger.info('ClaudeHandlers', 'Removing Claude IPC handlers...')
  
  ipcMain.removeHandler('ipc:claude:generateContent')
  ipcMain.removeHandler('ipc:claude:uploadFile')
  ipcMain.removeHandler('ipc:claude:deleteFile')
  ipcMain.removeHandler('ipc:claude:getQuotaInfo')
  
  // Reset service instance
  claudeService = null
  
  logger.info('ClaudeHandlers', 'Claude IPC handlers removed')
}
