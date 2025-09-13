import { ClaudeService, createClaudeService } from './claudeService'
import type { ClaudeResponse } from './claudeService'
import { TemplateService, templateService } from './templateService'
import type { LeadData } from './templateService'
import { FallbackDataService, fallbackDataService } from './fallbackDataService'
import { TemplateBasedGenerationService, templateBasedGenerationService } from './templateBasedGenerationService'

export interface ContentGenerationRequest {
  leadData: LeadData
  templateName?: string
}

export interface ContentGenerationResult {
  leadId: string
  status: 'generating' | 'completed' | 'failed'
  content?: ClaudeResponse
  error?: string
  generatedAt?: Date
}

export interface GenerationProgress {
  total: number
  completed: number
  failed: number
  inProgress: number
  results: Map<string, ContentGenerationResult>
}

export type GenerationMode = 'claude' | 'templates' | 'fallback'

export class ContentGenerationService {
  private claudeService: ClaudeService
  private templateService: TemplateService
  private fallbackService: FallbackDataService
  private templateBasedService: TemplateBasedGenerationService
  private generationQueue: ContentGenerationRequest[] = []
  private isProcessing = false
  private progressMap = new Map<string, GenerationProgress>()
  private useFallback = import.meta.env.VITE_ENABLE_DEBUG === 'true'
  private generationMode: GenerationMode = 'claude' // Default to Claude API

  constructor() {
    this.claudeService = createClaudeService()
    this.templateService = templateService
    this.fallbackService = fallbackDataService
    this.templateBasedService = templateBasedGenerationService
  }

  // Generate content for a single lead
  async generateForLead(
    leadData: LeadData,
    templateName: string = 'email-sequence',
    modelId?: string
  ): Promise<ContentGenerationResult> {
    const leadId = this.generateLeadId(leadData)
    
    console.log('🎯 [ContentGenerationService] Starting generation for lead:', leadId)
    console.log('📊 [ContentGenerationService] Template:', templateName, 'Model:', modelId || 'default')
    console.log('🔑 [ContentGenerationService] Has Claude Service:', !!this.claudeService)
    console.log('🆕 [ContentGenerationService] Use Fallback mode:', this.useFallback)
    console.log('🛠️ [ContentGenerationService] Debug env var:', import.meta.env.VITE_ENABLE_DEBUG)
    console.log('🔒 [ContentGenerationService] Fallback will be used if API fails:', this.useFallback)
    console.log('🎨 [ContentGenerationService] Current generation mode:', this.generationMode)
    console.log('👤 [ContentGenerationService] Lead data:', {
      email: leadData.email,
      name: `${leadData.first_name} ${leadData.last_name}`,
      company: leadData.company,
      title: leadData.title,
      industry: leadData.industry,
      hasCustomPrompt: !!(leadData as LeadData & { custom_prompt?: string }).custom_prompt
    })

    try {
      // Validate lead data
      console.log('🔍 [ContentGenerationService] Validating lead data...')
      this.templateService.validateLeadData(leadData, templateName)

      let content: ClaudeResponse

      // Handle different generation modes
      if (this.generationMode === 'templates') {
        console.log('📋 [ContentGenerationService] Using template-based generation mode')
        // Simulate some processing time for realistic UX
        await new Promise((resolve) =>
          setTimeout(resolve, Math.random() * 1000 + 300)
        )

        content = this.templateBasedService.generateTemplateBasedContent(leadData)
        console.log('📝 [ContentGenerationService] Generated template-based content')
      } else if (this.generationMode === 'fallback' || this.useFallback) {
        console.log('🆕 [ContentGenerationService] Using fallback mode (useFallback = true)')
        // Simulate API delay for realistic testing
        await new Promise((resolve) =>
          setTimeout(resolve, Math.random() * 2000 + 500)
        )

        content = this.fallbackService.generateFallbackContent(leadData)
        console.log('🎲 [ContentGenerationService] Generated fallback content')
      } else {
        try {
          // Generate prompt
          console.log('📃 [ContentGenerationService] Generating prompt from template...')
          const prompt = this.templateService.generatePrompt(
            leadData,
            templateName
          )
          console.log('📄 [ContentGenerationService] Prompt length:', prompt.length, 'characters')
          console.log('📝 [ContentGenerationService] Prompt preview (first 500 chars):', prompt.substring(0, 500) + '...')

          // Generate content using Claude
          console.log('🚀 [ContentGenerationService] Calling Claude API with retry...')
          console.log('⚙️ [ContentGenerationService] API Config:', {
            modelId: modelId || 'default',
            maxRetries: 3,
            requestCount: this.claudeService.getRequestCount(),
            remainingRequests: this.claudeService.getRemainingRequests()
          })
          
          content = await this.claudeService.generateContentWithRetry(
            prompt,
            leadData as unknown as Record<string, unknown>,
            3,
            modelId
          )
          console.log('✅ [ContentGenerationService] Claude API returned content successfully')
          console.log('📦 [ContentGenerationService] Content keys:', Object.keys(content))
          console.log('📧 [ContentGenerationService] Generated snippets:', {
            snippet1Length: content.snippet1?.length || 0,
            snippet2Length: content.snippet2?.length || 0,
            snippet3Length: content.snippet3?.length || 0,
            hasAllSnippets: !!(content.snippet1 && content.snippet2 && content.snippet3 && content.snippet4 && content.snippet5 && content.snippet6 && content.snippet7)
          })

          // Validate generated content
          console.log('🔍 [ContentGenerationService] Validating generated content...')
          if (
            !this.templateService.validateGeneratedContent(
              content,
              templateName
            )
          ) {
            console.error('❌ [ContentGenerationService] Content validation failed')
            throw new Error(
              'Generated content does not meet validation criteria'
            )
          }
          console.log('✔️ [ContentGenerationService] Content validation passed')
        } catch (error) {
          console.error('❌ [ContentGenerationService] Claude API failed:', error)
          
          // Only fall back to mock data if explicitly in debug mode
          if (this.useFallback) {
            console.warn('⚠️ [ContentGenerationService] Using fallback due to debug mode being enabled')
            content = this.fallbackService.generateFallbackContent(leadData)
            console.log('🆕 [ContentGenerationService] Using fallback content due to error')
          } else {
            // In production mode, throw the error instead of silently falling back
            console.error('🚫 [ContentGenerationService] Not falling back - throwing error to user')
            throw error
          }
        }
      }

      // Store in localStorage
      console.log('💾 [ContentGenerationService] Persisting content to localStorage')
      this.persistContentToStorage(leadId, content)
      
      console.log('🎉 [ContentGenerationService] Successfully generated content for lead:', leadId)
      console.log('📦 [ContentGenerationService] Returning content with', Object.keys(content).length, 'fields')

      return {
        leadId,
        status: 'completed',
        content,
        generatedAt: new Date(),
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred'
      
      console.error('🔥 [ContentGenerationService] Generation failed:', errorMessage)
      console.error('💥 [ContentGenerationService] Full error:', error)

      return {
        leadId,
        status: 'failed',
        error: errorMessage,
        generatedAt: new Date(),
      }
    }
  }

  // Generate content for multiple leads with batch processing
  async generateForLeads(
    leads: LeadData[],
    templateName: string = 'email-sequence',
    batchId?: string
  ): Promise<string> {
    const id = batchId || this.generateBatchId()

    // Initialize progress tracking
    const progress: GenerationProgress = {
      total: leads.length,
      completed: 0,
      failed: 0,
      inProgress: 0,
      results: new Map(),
    }

    this.progressMap.set(id, progress)

    // Add to queue and start processing
    const requests = leads.map((leadData) => ({
      leadData,
      templateName,
    }))

    this.generationQueue.push(...requests)

    if (!this.isProcessing) {
      this.processQueue(id)
    }

    return id
  }

  // Get generation progress for a batch
  getProgress(batchId: string): GenerationProgress | null {
    return this.progressMap.get(batchId) || null
  }

  // Get all results for a batch
  getResults(batchId: string): ContentGenerationResult[] {
    const progress = this.progressMap.get(batchId)
    return progress ? Array.from(progress.results.values()) : []
  }

  // Get content for a specific lead
  getLeadContent(leadId: string): ClaudeResponse | null {
    const content = localStorage.getItem(`lead_content_${leadId}`)
    return content ? JSON.parse(content) : null
  }

  // Check if content exists for a lead
  hasLeadContent(leadId: string): boolean {
    return localStorage.getItem(`lead_content_${leadId}`) !== null
  }

  // Get generation status for a lead
  getLeadGenerationStatus(
    leadId: string
  ): 'not_generated' | 'generating' | 'completed' | 'failed' {
    // Check localStorage first for completed content
    if (this.hasLeadContent(leadId)) {
      return 'completed'
    }

    // Check if currently in progress
    for (const progress of this.progressMap.values()) {
      const result = progress.results.get(leadId)
      if (result) {
        return result.status
      }
    }

    return 'not_generated'
  }

  // Cancel batch generation
  cancelBatch(batchId: string): boolean {
    const progress = this.progressMap.get(batchId)
    if (progress) {
      // Remove pending items from queue
      this.generationQueue = this.generationQueue.filter((request) => {
        const leadId = this.generateLeadId(request.leadData)
        return !progress.results.has(leadId)
      })

      // Update status of in-progress items
      for (const [, result] of progress.results.entries()) {
        if (result.status === 'generating') {
          result.status = 'failed'
          result.error = 'Cancelled by user'
        }
      }

      return true
    }
    return false
  }

  // Private helper methods
  private async processQueue(batchId: string): Promise<void> {
    this.isProcessing = true
    const progress = this.progressMap.get(batchId)

    if (!progress) {
      this.isProcessing = false
      return
    }

    while (this.generationQueue.length > 0 && progress.inProgress < 3) {
      // Max 3 concurrent
      const request = this.generationQueue.shift()
      if (!request) break

      const leadId = this.generateLeadId(request.leadData)

      // Mark as in progress
      progress.results.set(leadId, {
        leadId,
        status: 'generating',
      })
      progress.inProgress++

      // Process asynchronously
      this.processRequest(request, batchId, leadId)
    }

    // Check if we're done
    if (this.generationQueue.length === 0 && progress.inProgress === 0) {
      this.isProcessing = false
    }
  }

  private async processRequest(
    request: ContentGenerationRequest,
    batchId: string,
    leadId: string
  ): Promise<void> {
    const progress = this.progressMap.get(batchId)
    if (!progress) return

    try {
      const result = await this.generateForLead(
        request.leadData,
        request.templateName
      )

      // Update progress
      progress.results.set(leadId, result)
      progress.inProgress--

      if (result.status === 'completed') {
        progress.completed++
      } else {
        progress.failed++
      }
    } catch (error) {
      // Handle unexpected errors
      progress.results.set(leadId, {
        leadId,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unexpected error',
        generatedAt: new Date(),
      })
      progress.inProgress--
      progress.failed++
    }

    // Continue processing queue
    this.processQueue(batchId)
  }

  private generateLeadId(leadData: LeadData): string {
    return btoa(leadData.email).replace(/[/+=]/g, '')
  }

  private generateBatchId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private persistContentToStorage(
    leadId: string,
    content: ClaudeResponse
  ): void {
    const key = `lead_content_${leadId}`
    const data = {
      ...content,
      generatedAt: new Date().toISOString(),
    }
    localStorage.setItem(key, JSON.stringify(data))
  }

  // Clear all generated content (for testing/reset)
  clearAllContent(): void {
    const keys = Object.keys(localStorage)
    keys.forEach((key) => {
      if (key.startsWith('lead_content_')) {
        localStorage.removeItem(key)
      }
    })
  }

  // Get quota information from Claude service
  getQuotaInfo() {
    return {
      requestCount: this.claudeService.getRequestCount(),
      remainingRequests: this.claudeService.getRemainingRequests(),
    }
  }

  // Toggle between Claude API and fallback data
  setUseFallback(useFallback: boolean): void {
    this.useFallback = useFallback
  }

  // Check if fallback mode is enabled
  isUsingFallback(): boolean {
    return this.useFallback
  }

  // Get available fallback examples
  getFallbackExamples() {
    return this.fallbackService.getAllExamples()
  }

  // Generation mode management
  setGenerationMode(mode: GenerationMode): void {
    console.log(`🔄 [ContentGenerationService] Switching generation mode from ${this.generationMode} to ${mode}`)
    this.generationMode = mode
  }

  getGenerationMode(): GenerationMode {
    return this.generationMode
  }

  // Get available template configs
  getAvailableTemplates() {
    return this.templateBasedService.getAvailableTemplates()
  }

  // Get a specific template config
  getTemplateConfig(name: string) {
    return this.templateBasedService.getTemplate(name)
  }
}

export const contentGenerationService = new ContentGenerationService()
