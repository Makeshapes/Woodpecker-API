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
    if (!key || key === 'replace') {
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
    // Split by the delimiter
    const blocks = responseText.split('---BLOCK---').filter(block => block.trim())
    
    if (blocks.length !== 7) {
      throw new ClaudeApiError(
        `Expected 7 content blocks, but received ${blocks.length}`,
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
    leadData: Record<string, unknown>
  ): Promise<ClaudeResponse> {
    try {
      await this.checkRateLimit()

      const response = await this.client.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 4000,
        temperature: 0.7,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      })

      const content = response.content[0]
      if (content.type !== 'text') {
        throw new ClaudeApiError(
          'Unexpected response format from Claude API',
          'content',
          true
        )
      }

      // Parse text blocks response
      const parsedResponse = this.parseTextBlocks(content.text, leadData)

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
          throw new ClaudeApiError(
            `Missing required field: ${field}`,
            'content',
            true
          )
        }
      }

      return parsedResponse
    } catch (error) {
      if (error instanceof ClaudeApiError) {
        throw error
      }

      if (error instanceof Anthropic.APIError) {
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
        } else if (error.status >= 500) {
          throw new ClaudeApiError(
            'Claude API server error. Please try again later.',
            'network',
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
    maxRetries: number = 3
  ): Promise<ClaudeResponse> {
    let lastError: ClaudeApiError

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.generateContent(prompt, leadData)
      } catch (error) {
        if (!(error instanceof ClaudeApiError)) {
          throw error
        }

        lastError = error

        // Don't retry non-retryable errors
        if (!error.retryable) {
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
