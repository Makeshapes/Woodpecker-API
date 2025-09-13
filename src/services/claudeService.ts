import Anthropic from '@anthropic-ai/sdk'

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
  private client: Anthropic
  private readonly MAX_REQUESTS_PER_MINUTE = 100
  private requestCount = 0
  private lastResetTime = Date.now()

  constructor(apiKey?: string) {
    const key = apiKey || import.meta.env.VITE_CLAUDE_API_KEY
    
    console.log('🔑 [ClaudeService] Initializing Claude service...')
    console.log('🔧 [ClaudeService] API key provided via param:', !!apiKey)
    console.log('🔧 [ClaudeService] API key from env:', !!import.meta.env.VITE_CLAUDE_API_KEY)
    console.log('🔧 [ClaudeService] Final key available:', !!key && key !== 'replace')
    
    if (!key || key === 'replace') {
      console.error('❌ [ClaudeService] No valid API key found!')
      throw new ClaudeApiError(
        'Claude API key not configured. Please set VITE_CLAUDE_API_KEY in your environment.',
        'auth',
        false
      )
    }

    this.client = new Anthropic({
      apiKey: key,
      dangerouslyAllowBrowser: true,
    })
    
    console.log('✅ [ClaudeService] Claude client initialized successfully')
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

  private convertTextToHtml(text: string): string {
    // Convert plain text to HTML with <div> tags
    return text
      .split('\n\n')
      .map((paragraph) => paragraph.trim())
      .filter((paragraph) => paragraph.length > 0)
      .map((paragraph) => `<div>${paragraph}</div>`)
      .join('<div><br></div>')
  }

  private parseTextBlocks(
    responseText: string,
    leadData: Record<string, unknown>
  ): ClaudeResponse {
    console.log('🔨 [ClaudeService] Parsing text blocks from response')
    console.log('📜 [ClaudeService] Full response text:')
    console.log(responseText)
    console.log('📏 [ClaudeService] Response length:', responseText.length, 'characters')
    
    // Check if response contains the delimiter at all
    const delimiterCount = (responseText.match(/---BLOCK---/g) || []).length
    console.log('🔍 [ClaudeService] Found', delimiterCount, 'occurrences of ---BLOCK--- delimiter')
    
    // Split by the delimiter
    const blocks = responseText.split('---BLOCK---').filter(block => block.trim())
    console.log('📦 [ClaudeService] Found', blocks.length, 'blocks after splitting')
    
    // Log each block for debugging
    blocks.forEach((block, index) => {
      console.log(`📄 [ClaudeService] Block ${index + 1} (${block.length} chars):`, block.substring(0, 100) + (block.length > 100 ? '...' : ''))
    })
    
    if (blocks.length !== 7) {
      console.error('❌ [ClaudeService] Block count mismatch!')
      console.log('Expected: 7 blocks')
      console.log('Received:', blocks.length, 'blocks')
      console.log('Raw response preview (first 1000 chars):', responseText.substring(0, 1000))
      
      // If we only got 1 block, check if it's JSON format
      if (blocks.length === 1) {
        console.warn('⚠️ [ClaudeService] Only 1 block found. Checking if response is JSON...')
        
        try {
          // Try to parse as JSON
          const jsonResponse = JSON.parse(responseText)
          console.log('🔄 [ClaudeService] Response is in JSON format. Converting to expected format...')
          
          // Check if it has the expected snippet fields
          if (jsonResponse.snippet1 && jsonResponse.snippet2) {
            console.log('✅ [ClaudeService] Found snippet fields in JSON. Using JSON response directly.')
            
            // Return the JSON response as-is since it already has the right structure
            return {
              email: String(jsonResponse.email || leadData.email || ''),
              first_name: String(jsonResponse.first_name || leadData.first_name || ''),
              last_name: String(jsonResponse.last_name || leadData.last_name || ''),
              company: String(jsonResponse.company || leadData.company || ''),
              title: String(jsonResponse.title || leadData.title || ''),
              linkedin_url: String(jsonResponse.linkedin_url || leadData.linkedin_url || ''),
              tags: String(jsonResponse.tags || leadData.tags || ''),
              industry: String(jsonResponse.industry || leadData.industry || 'Technology'),
              snippet1: String(jsonResponse.snippet1 || ''),
              snippet2: jsonResponse.snippet2.startsWith('<div>') ? jsonResponse.snippet2 : this.convertTextToHtml(jsonResponse.snippet2),
              snippet3: String(jsonResponse.snippet3 || ''),
              snippet4: jsonResponse.snippet4.startsWith('<div>') ? jsonResponse.snippet4 : this.convertTextToHtml(jsonResponse.snippet4),
              snippet5: jsonResponse.snippet5.startsWith('<div>') ? jsonResponse.snippet5 : this.convertTextToHtml(jsonResponse.snippet5),
              snippet6: jsonResponse.snippet6.startsWith('<div>') ? jsonResponse.snippet6 : this.convertTextToHtml(jsonResponse.snippet6),
              snippet7: jsonResponse.snippet7.startsWith('<div>') ? jsonResponse.snippet7 : this.convertTextToHtml(jsonResponse.snippet7),
            }
          }
        } catch {
          console.log('🚫 [ClaudeService] Response is not valid JSON either')
        }
      }
      
      throw new ClaudeApiError(
        `Expected 7 content blocks with ---BLOCK--- delimiters, but received ${blocks.length}. Check console for full response.`,
        'content',
        true
      )
    }

    // Extract lead data from the provided leadData parameter
    const email = String(leadData.email || '')
    const firstName = String(leadData.first_name || leadData.firstName || '')
    const lastName = String(leadData.last_name || leadData.lastName || '')
    const company = String(leadData.company || '')
    const title = String(leadData.title || '')
    const linkedinUrl = String(leadData.linkedin_url || leadData.linkedin || '')
    const industry = String(leadData.industry || 'Technology')
    const tags = String(leadData.tags || '')

    // Parse each block
    const snippet1 = blocks[0].trim() // Subject line (plain text)
    const snippet2 = this.convertTextToHtml(blocks[1].trim()) // Day 1 Email (convert to HTML)
    const snippet3 = blocks[2].trim() // LinkedIn message (plain text)
    const snippet4 = this.convertTextToHtml(blocks[3].trim()) // Day 5 Bump (convert to HTML)
    const snippet5 = this.convertTextToHtml(blocks[4].trim()) // Day 9-10 Follow-up (convert to HTML)
    const snippet6 = this.convertTextToHtml(blocks[5].trim()) // Day 13 Bump (convert to HTML)
    const snippet7 = this.convertTextToHtml(blocks[6].trim()) // Day 20 Breakup (convert to HTML)

    return {
      email,
      first_name: firstName,
      last_name: lastName,
      company,
      title,
      linkedin_url: linkedinUrl,
      tags,
      industry,
      snippet1,
      snippet2,
      snippet3,
      snippet4,
      snippet5,
      snippet6,
      snippet7,
    }
  }

  async generateContent(
    prompt: string,
    leadData: Record<string, unknown>,
    modelId: string = 'claude-sonnet-4-20250514'
  ): Promise<ClaudeResponse> {
    console.log('🤖 [ClaudeService] Starting API call with model:', modelId)
    console.log('📝 [ClaudeService] Prompt length:', prompt.length, 'characters')
    console.log('⏱️ [ClaudeService] Request count before call:', this.requestCount)
    
    const startTime = Date.now()
    
    try {
      await this.checkRateLimit()
      console.log('✅ [ClaudeService] Rate limit check passed')

      console.log('🚀 [ClaudeService] Making API call to Claude...')
      const response = await this.client.messages.create({
        model: modelId,
        max_tokens: 4000,
        temperature: 0.7,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      })
      
      const duration = Date.now() - startTime
      console.log('📨 [ClaudeService] Received response from Claude API in', duration, 'ms')
      console.log('📊 [ClaudeService] Usage info:', response.usage)

      const content = response.content[0]
      console.log('📄 [ClaudeService] Response type:', content.type)
      if (content.type !== 'text') {
        throw new ClaudeApiError(
          'Unexpected response format from Claude API',
          'content',
          true
        )
      }
      
      console.log('📏 [ClaudeService] Response text length:', content.text.length, 'characters')
      console.log('🔍 [ClaudeService] First 200 chars of response:', content.text.substring(0, 200))

      // Parse text blocks response
      const parsedResponse = this.parseTextBlocks(content.text, leadData)
      console.log('✂️ [ClaudeService] Parsed into', Object.keys(parsedResponse).length, 'fields')

      // Validate required fields
      const requiredSnippets = [
        'snippet1',
        'snippet2',
        'snippet3',
        'snippet4',
        'snippet5',
        'snippet6',
        'snippet7',
      ]

      for (const field of requiredSnippets) {
        if (!parsedResponse[field as keyof ClaudeResponse]) {
          console.error(`❌ [ClaudeService] Missing required field: ${field}`)
          console.log('📦 [ClaudeService] Available fields:', Object.keys(parsedResponse))
          throw new ClaudeApiError(
            `Missing required field: ${field}`,
            'content',
            true
          )
        }
      }
      
      console.log('✅ [ClaudeService] All required fields present, returning response')
      return parsedResponse
    } catch (error) {
      console.error('💥 [ClaudeService] Error occurred:', error)
      if (error instanceof ClaudeApiError) {
        throw error
      }

      if (error instanceof Anthropic.APIError) {
        console.error('🚨 [ClaudeService] Anthropic API Error:', error.status, error.message)
        console.error('🔍 [ClaudeService] Error details:', error)
        
        if (error.status === 429) {
          throw new ClaudeApiError(
            'Rate limit exceeded. Please wait before trying again.',
            'rate_limit',
            true
          )
        } else if (error.status === 401) {
          throw new ClaudeApiError(
            'Invalid API key. Please check your CLAUDE_API_KEY configuration.',
            'auth',
            false
          )
        } else if (error.status === 403) {
          throw new ClaudeApiError(
            'Access forbidden. You may not have access to this model or have exceeded your quota.',
            'auth',
            false
          )
        } else if (error.status === 400) {
          // Check if it's a model-specific error
          if (error.message?.includes('model') || error.message?.includes('Model')) {
            throw new ClaudeApiError(
              `Model error: ${error.message}. The selected model may not be available or supported.`,
              'content',
              false
            )
          } else {
            throw new ClaudeApiError(
              `Bad request: ${error.message}`,
              'content',
              false
            )
          }
        } else if (error.status === 404) {
          throw new ClaudeApiError(
            'Model not found. The selected model may not exist or you may not have access to it.',
            'content',
            false
          )
        } else if (error.status >= 500) {
          throw new ClaudeApiError(
            'Claude API server error. Please try again later.',
            'network',
            true
          )
        } else {
          throw new ClaudeApiError(
            `Claude API error (${error.status}): ${error.message}`,
            'unknown',
            true
          )
        }
      }

      // Network or other errors
      if (error instanceof Error && error.message.includes('network')) {
        throw new ClaudeApiError(
          'Network error. Please check your connection and try again.',
          'network',
          true
        )
      }

      throw new ClaudeApiError(
        `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'unknown',
        true
      )
    }
  }

  async generateContentWithRetry(
    prompt: string,
    leadData: Record<string, unknown>,
    maxRetries: number = 3,
    modelId?: string
  ): Promise<ClaudeResponse> {
    let lastError: ClaudeApiError

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.generateContent(prompt, leadData, modelId)
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
}

// Factory function to create claude service instance
export const createClaudeService = (apiKey?: string) =>
  new ClaudeService(apiKey)
