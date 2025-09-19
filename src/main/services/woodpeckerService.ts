import { logger } from '../utils/logger'
import { settingsService } from './settingsService'

// Interfaces for Woodpecker API
export interface WoodpeckerCampaign {
  campaign_id: number
  name: string
  status: string
  created_date: string
  prospects_count?: number
}

export interface WoodpeckerProspect {
  email: string
  first_name?: string
  last_name?: string
  company?: string
  title?: string
  linkedin_url?: string
  city?: string
  state?: string
  country?: string
  time_zone?: string  // Woodpecker expects time_zone, not timezone
  snippet1?: string
  snippet2?: string
  snippet3?: string
  snippet4?: string
  snippet5?: string
  snippet6?: string
  snippet7?: string
  [key: string]: string | undefined
}

export interface AddProspectsRequest {
  prospects: WoodpeckerProspect[]
  campaign: {
    campaign_id: number
  }
  force?: boolean
  file_name?: string
}

export interface WoodpeckerApiResponse {
  status: {
    code: string
    msg: string
  }
  prospects?: Array<{
    email: string
    status: string
    msg?: string
    id?: number
    result?: string
    error?: string
    message?: string
  }>
}

export interface ExportProgress {
  current: number
  total: number
  succeeded: number
  failed: number
  status: 'pending' | 'processing' | 'completed' | 'error'
  errors: Array<{ email: string; error: string }>
}

// Error class for Woodpecker API errors
export class WoodpeckerApiError extends Error {
  public category:
    | 'rate_limit'
    | 'network'
    | 'auth'
    | 'validation'
    | 'unknown'
  public retryable: boolean

  constructor(
    message: string,
    category: 'rate_limit' | 'network' | 'auth' | 'validation' | 'unknown',
    retryable: boolean = false
  ) {
    super(message)
    this.name = 'WoodpeckerApiError'
    this.category = category
    this.retryable = retryable
  }
}

export class WoodpeckerService {
  private apiKey: string
  private baseUrl: string = 'https://api.woodpecker.co/rest/v1'
  private rateLimitDelay: number = 650 // 100 req/min = ~600ms between requests, adding buffer
  private cachedCampaigns: WoodpeckerCampaign[] | null = null
  private cacheExpiry: number | null = null
  private cacheTimeout: number = 5 * 60 * 1000 // 5 minutes
  private readonly MAX_REQUESTS_PER_MINUTE = 100
  private requestCount = 0
  private lastResetTime = Date.now()

  constructor(apiKey?: string) {
    const key = apiKey || settingsService.getWoodpeckerApiKey()

    logger.info('WoodpeckerService', 'Initializing Woodpecker service...')
    logger.debug('WoodpeckerService', `API key provided via param: ${!!apiKey}`)
    logger.debug('WoodpeckerService', `API key from settings: ${!!settingsService.getWoodpeckerApiKey()}`)
    logger.debug('WoodpeckerService', `Final key available: ${!!key && key !== 'replace'}`)

    if (!key || key === 'replace') {
      logger.warn('WoodpeckerService', 'No valid API key found - service will run in demo mode')
      this.apiKey = '' // Set empty string to trigger demo mode in methods
    } else {
      this.apiKey = key
    }

    logger.info('WoodpeckerService', 'Woodpecker service initialized successfully')
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
      throw new WoodpeckerApiError(
        `Rate limit reached. Please wait ${Math.ceil(waitTime / 1000)} seconds.`,
        'rate_limit',
        true
      )
    }

    this.requestCount++
  }

  private getHeaders(): Record<string, string> {
    return {
      'x-api-key': this.apiKey,
      'Content-Type': 'application/json',
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    await this.checkRateLimit()

    const url = `${this.baseUrl}${endpoint}`
    logger.info('WoodpeckerService', `Making API request: ${options.method || 'GET'} ${url}`, {
      hasApiKey: !!this.apiKey && this.apiKey !== 'replace',
      apiKeyLength: this.apiKey?.length || 0,
      endpoint: endpoint
    })

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options.headers,
        },
      })

      logger.debug('WoodpeckerService', `Response received: ${response.status} ${response.statusText}`)

      const data = await response.json()

      if (!response.ok) {
        const errorMsg = data?.status?.msg || `HTTP ${response.status}`
        logger.error('WoodpeckerService', `API error: ${errorMsg}`, {
          status: response.status,
          data: data
        })
        
        // Categorize errors
        let category: WoodpeckerApiError['category'] = 'unknown'
        if (response.status === 401 || response.status === 403) {
          category = 'auth'
        } else if (response.status === 429) {
          category = 'rate_limit'
        } else if (response.status >= 400 && response.status < 500) {
          category = 'validation'
        } else if (response.status >= 500) {
          category = 'network'
        }

        throw new WoodpeckerApiError(`Woodpecker API error: ${errorMsg}`, category, category === 'rate_limit' || category === 'network')
      }

      return data as T
    } catch (error) {
      if (error instanceof WoodpeckerApiError) {
        throw error
      }
      
      logger.error('WoodpeckerService', 'Request failed', error instanceof Error ? error : new Error(String(error)))
      
      if (error instanceof Error) {
        throw new WoodpeckerApiError(error.message, 'network', true)
      }
      throw new WoodpeckerApiError('Unknown error occurred while calling Woodpecker API', 'unknown', false)
    }
  }

  async getCampaigns(forceRefresh: boolean = false): Promise<WoodpeckerCampaign[]> {
    logger.info('WoodpeckerService', 'Getting campaigns...', {
      forceRefresh: forceRefresh,
      hasCachedCampaigns: !!this.cachedCampaigns,
      cacheValid: this.cacheExpiry ? Date.now() < this.cacheExpiry : false
    })

    if (
      !forceRefresh &&
      this.cachedCampaigns &&
      this.cacheExpiry &&
      Date.now() < this.cacheExpiry
    ) {
      logger.debug('WoodpeckerService', 'Returning cached campaigns')
      return this.cachedCampaigns
    }

    // Check if API key is missing or empty (demo mode)
    if (!this.apiKey || this.apiKey.trim() === '' || this.apiKey === 'replace') {
      logger.warn('WoodpeckerService', 'No API key, using mock campaigns')
      return this.getMockCampaigns()
    }

    try {
      logger.debug('WoodpeckerService', 'Fetching campaigns from API...')
      const response = await this.makeRequest<any[]>('/campaign_list')

      // Response is directly an array of campaigns
      this.cachedCampaigns = Array.isArray(response)
        ? response.map(campaign => ({
            campaign_id: campaign.id,
            name: campaign.name,
            status: campaign.status,
            created_date: campaign.created,
            prospects_count: undefined, // Not provided by this endpoint
          }))
        : [] // Fallback for unexpected response format

      this.cacheExpiry = Date.now() + this.cacheTimeout

      logger.info('WoodpeckerService', `Campaigns fetched and cached: ${this.cachedCampaigns.length} campaigns`)
      return this.cachedCampaigns
    } catch (error) {
      logger.error('WoodpeckerService', 'Failed to fetch campaigns', error instanceof Error ? error : new Error(String(error)))
      throw error
    }
  }

  private getMockCampaigns(): WoodpeckerCampaign[] {
    // Mock campaigns for development/demo
    const mockCampaigns = [
      {
        campaign_id: 2356837,
        name: 'Q4 Outreach Campaign',
        status: 'ACTIVE',
        created_date: '2024-12-01T10:00:00Z',
        prospects_count: 145,
      },
      {
        campaign_id: 1234567,
        name: 'SaaS CEOs',
        status: 'RUNNING',
        created_date: '2024-11-15T14:30:00Z',
        prospects_count: 89,
      },
      {
        campaign_id: 7654321,
        name: 'Holiday Follow-up',
        status: 'PAUSED',
        created_date: '2024-12-10T09:15:00Z',
        prospects_count: 234,
      },
      {
        campaign_id: 9876543,
        name: 'New Year Prospects',
        status: 'DRAFT',
        created_date: '2024-12-20T16:45:00Z',
        prospects_count: 67,
      },
    ]

    this.cachedCampaigns = mockCampaigns
    this.cacheExpiry = Date.now() + this.cacheTimeout

    return mockCampaigns
  }

  async detectProspectTimezones(prospectIds: number[]): Promise<void> {
    logger.debug('WoodpeckerService', `Detecting timezones for ${prospectIds.length} prospects`)

    try {
      // Create a bulk operation ID
      const bulkOperationId = crypto.randomUUID()

      const response = await this.makeRequest<any>(
        `/prospects/bulk/${bulkOperationId}`,
        {
          method: 'POST',
          body: JSON.stringify({
            type: 'DETECT_TIMEZONE',
            prospect_ids: prospectIds
          }),
        }
      )

      logger.info('WoodpeckerService', 'Timezone detection initiated successfully')
      return response
    } catch (error) {
      logger.warn('WoodpeckerService', 'Failed to detect timezones (non-critical)', error instanceof Error ? error : new Error(String(error)))
      // Don't throw - this is a nice-to-have feature
    }
  }

  async addProspectsToCampaign(
    prospects: WoodpeckerProspect[],
    campaignId: number,
    onProgress?: (progress: ExportProgress) => void
  ): Promise<ExportProgress> {
    logger.info('WoodpeckerService', `Starting export of ${prospects.length} prospects to campaign ${campaignId}`)

    const progress: ExportProgress = {
      current: 0,
      total: prospects.length,
      succeeded: 0,
      failed: 0,
      status: 'processing',
      errors: [],
    }

    if (prospects.length === 0) {
      logger.warn('WoodpeckerService', 'No prospects to export')
      progress.status = 'completed'
      return progress
    }

    // Demo mode: simulate successful export
    if (!this.apiKey || this.apiKey.trim() === '' || this.apiKey === 'replace') {
      logger.warn('WoodpeckerService', 'Demo mode - simulating export')
      return this.simulateExport(prospects, campaignId, onProgress)
    }

    const BATCH_SIZE = 50 // Process in smaller batches to avoid timeouts
    const batches = []

    for (let i = 0; i < prospects.length; i += BATCH_SIZE) {
      batches.push(prospects.slice(i, i + BATCH_SIZE))
    }

    try {
      for (const batch of batches) {
        const request: AddProspectsRequest = {
          prospects: batch,
          campaign: {
            campaign_id: campaignId,
          },
          force: false,
        }

        try {
          logger.debug('WoodpeckerService', `Sending batch ${batches.indexOf(batch) + 1}/${batches.length} (${batch.length} prospects)`)

          // Log detailed prospect data being sent to Woodpecker
          batch.forEach((prospect, index) => {
            logger.info('WoodpeckerService', `🔍 Prospect ${index + 1} data being sent to Woodpecker:`, {
              email: prospect.email,
              first_name: prospect.first_name,
              last_name: prospect.last_name,
              company: prospect.company,
              title: prospect.title,
              linkedin_url: prospect.linkedin_url,
              city: prospect.city,
              state: prospect.state,
              country: prospect.country,
              time_zone: prospect.time_zone,
              hasTimeZone: !!prospect.time_zone,
              timeZoneValue: prospect.time_zone,
              snippet1: prospect.snippet1?.substring(0, 50) + '...',
              snippet2: prospect.snippet2?.substring(0, 50) + '...',
              allProspectKeys: Object.keys(prospect),
              fullProspectData: prospect
            })
          })

          logger.info('WoodpeckerService', `📤 Full request payload to Woodpecker:`, JSON.stringify(request, null, 2))

          const response = await this.makeRequest<WoodpeckerApiResponse>(
            '/add_prospects_campaign',
            {
              method: 'POST',
              body: JSON.stringify(request),
            }
          )

          logger.debug('WoodpeckerService', 'Batch response received', {
            hasProspects: !!response.prospects,
            prospectsLength: response.prospects?.length,
            statusInfo: response.status
          })

          // Collect successfully added prospect IDs for timezone detection
          const addedProspectIds: number[] = []

          if (response.prospects) {
            response.prospects.forEach((prospect) => {
              progress.current++

              // Check for success - Woodpecker API typically returns status in prospect object
              const isSuccess = (
                prospect.status === 'OK' ||
                prospect.status === 'DUPLICATE' ||
                prospect.status === 'SUCCESS' ||
                prospect.result === 'OK' ||
                prospect.result === 'SUCCESS' ||
                (!prospect.error && !prospect.status) // If no error field and prospect exists, assume success
              )

              if (isSuccess) {
                logger.debug('WoodpeckerService', `Prospect ${prospect.email} succeeded`)
                progress.succeeded++

                // Collect ID for timezone detection
                if (prospect.id) {
                  addedProspectIds.push(prospect.id)
                }
              } else {
                const errorMessage =
                  prospect.msg ||
                  prospect.message ||
                  prospect.error ||
                  prospect.status ||
                  (prospect.status === undefined ? 'API response missing status field' : 'Unknown error')

                logger.debug('WoodpeckerService', `Prospect ${prospect.email} failed: ${errorMessage}`)
                progress.failed++
                progress.errors.push({
                  email: prospect.email,
                  error: errorMessage,
                })
              }
            })
          } else {
            batch.forEach(_prospect => {
              progress.current++
              progress.succeeded++
            })
          }

          // After each batch, trigger timezone detection for successfully added prospects
          if (addedProspectIds.length > 0) {
            logger.debug('WoodpeckerService', `Triggering timezone detection for ${addedProspectIds.length} prospects`)
            // Fire and forget - don't wait for timezone detection
            this.detectProspectTimezones(addedProspectIds).catch(err =>
              logger.warn('WoodpeckerService', 'Timezone detection failed but prospects were added', err instanceof Error ? err : new Error(String(err)))
            )
          }

          if (onProgress) {
            onProgress({ ...progress })
          }

          // Rate limiting between batches
          if (batches.indexOf(batch) < batches.length - 1) {
            await this.delay(this.rateLimitDelay)
          }
        } catch (error) {
          // Handle batch failure
          batch.forEach(_prospect => {
            progress.current++
            progress.failed++
            progress.errors.push({
              email: _prospect.email,
              error: error instanceof Error ? error.message : 'Unknown error',
            })
          })

          if (onProgress) {
            onProgress({ ...progress })
          }
        }
      }

      progress.status = progress.failed === 0 ? 'completed' : 'completed'
      return progress
    } catch (error) {
      progress.status = 'error'
      throw error
    }
  }

  private async simulateExport(
    prospects: WoodpeckerProspect[],
    campaignId: number,
    onProgress?: (progress: ExportProgress) => void
  ): Promise<ExportProgress> {
    logger.warn('WoodpeckerService', `Demo mode: Simulating export of ${prospects.length} prospects to campaign ${campaignId}`)

    const progress: ExportProgress = {
      current: 0,
      total: prospects.length,
      succeeded: 0,
      failed: 0,
      status: 'processing',
      errors: [],
    }

    // Simulate progress with delays
    for (const prospect of prospects) {
      await this.delay(200) // Simulate API call delay

      progress.current++
      progress.succeeded++

      if (onProgress) {
        onProgress({ ...progress })
      }
    }

    progress.status = 'completed'
    return progress
  }

  async checkDuplicateProspects(
    emails: string[],
    campaignId: number
  ): Promise<string[]> {
    logger.debug('WoodpeckerService', `Checking for duplicates: ${emails.length} emails in campaign ${campaignId}`)

    try {
      const response = await this.makeRequest<{
        prospects: Array<{ email: string; campaigns: number[] }>
      }>(`/prospects?campaign_id=${campaignId}`)

      logger.debug('WoodpeckerService', 'Duplicate check response received')

      const existingEmails = new Set(
        response.prospects
          .filter(p => p.campaigns.includes(campaignId))
          .map(p => p.email.toLowerCase())
      )

      const duplicates = emails.filter(email => existingEmails.has(email.toLowerCase()))

      logger.info('WoodpeckerService', `Duplicate check complete: ${duplicates.length} duplicates found out of ${emails.length} emails`)
      return duplicates
    } catch (error) {
      logger.error('WoodpeckerService', 'Failed to check duplicates', error instanceof Error ? error : new Error(String(error)))
      // Return empty array on error to allow export to proceed
      return []
    }
  }

  clearCampaignCache(): void {
    this.cachedCampaigns = null
    this.cacheExpiry = null
    logger.debug('WoodpeckerService', 'Campaign cache cleared')
  }

  // Quota management methods
  getQuotaInfo(): { requestCount: number; remainingRequests: number; maxRequestsPerMinute: number } {
    this.resetRateLimitIfNeeded()
    return {
      requestCount: this.requestCount,
      remainingRequests: this.MAX_REQUESTS_PER_MINUTE - this.requestCount,
      maxRequestsPerMinute: this.MAX_REQUESTS_PER_MINUTE
    }
  }
}

// Factory function to create service instance
export function createWoodpeckerService(apiKey?: string): WoodpeckerService {
  return new WoodpeckerService(apiKey)
}

export default WoodpeckerService
