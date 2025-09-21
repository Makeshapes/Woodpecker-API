// Renderer-side Claude service - now acts as IPC proxy to main process

export interface ClaudeResponse {
  email: string
  first_name: string
  last_name: string
  company: string
  title: string
  linkedin_url: string
  tags: string
  industry: string
  snippet1: string
  snippet2: string
  snippet3: string
  snippet4: string
  snippet5: string
  snippet6: string
  snippet7: string
}

export class ClaudeApiError extends Error {
  public category:
    | 'rate_limit'
    | 'network'
    | 'content'
    | 'quota'
    | 'auth'
    | 'unknown'
  public retryable: boolean

  constructor(
    message: string,
    category:
      | 'rate_limit'
      | 'network'
      | 'content'
      | 'quota'
      | 'auth'
      | 'unknown',
    retryable: boolean = false
  ) {
    super(message)
    this.name = 'ClaudeApiError'
    this.category = category
    this.retryable = retryable
  }
}

export class ClaudeService {
  private readonly MAX_REQUESTS_PER_MINUTE = 100
  private requestCount = 0
  private lastResetTime = Date.now()

  constructor(apiKey?: string) {
    // Renderer process service - no longer needs API key since we use IPC
    console.log('🔑 [ClaudeService] Initializing renderer Claude service (IPC proxy)...')
    console.log('✅ [ClaudeService] Claude service initialized - will use IPC for all operations')
  }

  private resetRateLimitIfNeeded(): void {
    const now = Date.now()
    if (now - this.lastResetTime >= 60000) {
      this.requestCount = 0
      this.lastResetTime = now
    }
  }

  private async checkRateLimit(): Promise<void> {
    this.resetRateLimitIfNeeded()

    if (this.requestCount >= this.MAX_REQUESTS_PER_MINUTE) {
      const waitTime = 60000 - (Date.now() - this.lastResetTime)
      throw new ClaudeApiError(
        `Rate limit reached. Please wait ${Math.ceil(waitTime / 1000)} seconds.`,
        'rate_limit',
        true
      )
    }

    this.requestCount++
  }


  async generateContent(
    prompt: string,
    leadData: Record<string, unknown>,
    modelId: string = 'claude-sonnet-4-20250514',
    systemPrompt?: string,
    fileIds?: string[]
  ): Promise<ClaudeResponse> {
    console.log('🤖 [ClaudeService] Starting content generation via IPC')
    console.log('📝 [ClaudeService] Prompt length:', prompt.length, 'characters')
    console.log('🔧 [ClaudeService] Model:', modelId)

    const startTime = Date.now()

    try {
      await this.checkRateLimit()
      console.log('✅ [ClaudeService] Rate limit check passed')

      console.log('🚀 [ClaudeService] Making IPC call to main process...')

      // Use IPC to generate content in main process
      const response = await window.api.claude.generateContent({
        prompt,
        leadData,
        modelId,
        systemPrompt,
        fileIds,
        maxRetries: 3
      })

      const duration = Date.now() - startTime
      console.log('📨 [ClaudeService] Received response from main process in', duration, 'ms')

      if (!response.success) {
        throw new ClaudeApiError(
          response.error || 'Content generation failed through IPC',
          'unknown',
          true
        )
      }

      console.log('✅ [ClaudeService] Content generation successful via IPC')
      return response.data
    } catch (error) {
      console.error('💥 [ClaudeService] Error occurred:', error)

      // If it's already a ClaudeApiError, re-throw it
      if (error instanceof ClaudeApiError) {
        throw error
      }

      // Convert other errors to ClaudeApiError
      throw new ClaudeApiError(
        `Content generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'unknown',
        true
      )
    }
  }

  async generateContentWithRetry(
    prompt: string,
    leadData: Record<string, unknown>,
    maxRetries: number = 3,
    modelId?: string,
    systemPrompt?: string,
    fileIds?: string[]
  ): Promise<ClaudeResponse> {
    let lastError: ClaudeApiError

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.generateContent(prompt, leadData, modelId, systemPrompt, fileIds)
      } catch (error) {
        if (!(error instanceof ClaudeApiError)) {
          throw error
        }

        lastError = error

        // Don't retry non-retryable errors
        if (!error.retryable) {
          console.log(`🚫 [ClaudeService] Error is not retryable (${error.category}), failing immediately`)
          throw error
        }
        
        // Don't retry on model/auth errors even if marked as retryable
        if (error.category === 'auth' || error.category === 'content') {
          console.log(`🚫 [ClaudeService] ${error.category} error detected, stopping retries`)
          throw error
        }

        // Don't retry on last attempt
        if (attempt === maxRetries) {
          throw error
        }

        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }

    throw lastError!
  }

  getRequestCount(): number {
    this.resetRateLimitIfNeeded()
    return this.requestCount
  }

  getRemainingRequests(): number {
    this.resetRateLimitIfNeeded()
    return Math.max(0, this.MAX_REQUESTS_PER_MINUTE - this.requestCount)
  }

  // Files API methods
  async uploadFile(file: File): Promise<string> {
    console.log('📁 [ClaudeService] Uploading file via IPC:', file.name, file.size, 'bytes')

    try {
      // Convert File to ArrayBuffer for IPC transmission
      const fileBuffer = await file.arrayBuffer()

      // Use IPC to upload file to main process
      const response = await window.api.claude.uploadFile({
        fileBuffer,
        filename: file.name,
        mimeType: file.type
      })

      if (!response.success) {
        throw new ClaudeApiError(
          response.error || 'File upload failed through IPC',
          'network',
          true
        )
      }

      console.log('✅ [ClaudeService] File uploaded successfully via IPC:', response.data.fileId)
      return response.data.fileId
    } catch (error) {
      console.error('❌ [ClaudeService] File upload error:', error)

      // If it's already a ClaudeApiError, re-throw it
      if (error instanceof ClaudeApiError) {
        throw error
      }

      // Convert other errors to ClaudeApiError
      throw new ClaudeApiError(
        `File upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'network',
        true
      )
    }
  }

  async deleteFile(fileId: string): Promise<void> {
    console.log('🗑️ [ClaudeService] Deleting file via IPC:', fileId)

    try {
      // Use IPC to delete file from main process
      const response = await window.api.claude.deleteFile(fileId)

      if (!response.success) {
        throw new ClaudeApiError(
          response.error || 'File deletion failed through IPC',
          'network',
          true
        )
      }

      console.log('✅ [ClaudeService] File deleted successfully via IPC')
    } catch (error) {
      console.error('❌ [ClaudeService] File deletion error:', error)

      // If it's already a ClaudeApiError, re-throw it
      if (error instanceof ClaudeApiError) {
        throw error
      }

      // Convert other errors to ClaudeApiError
      throw new ClaudeApiError(
        `File deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'network',
        true
      )
    }
  }
}

// Factory function to create claude service instance
export const createClaudeService = (apiKey?: string) =>
  new ClaudeService(apiKey)
