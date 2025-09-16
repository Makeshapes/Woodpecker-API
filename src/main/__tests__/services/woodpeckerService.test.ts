import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { WoodpeckerService, WoodpeckerApiError, createWoodpeckerService } from '../../services/woodpeckerService'
import type { WoodpeckerCampaign, WoodpeckerProspect } from '../../services/woodpeckerService'

// Mock the logger
vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }
}))

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('WoodpeckerService', () => {
  let service: WoodpeckerService
  let originalEnv: string | undefined

  beforeEach(() => {
    originalEnv = process.env.WOODPECKER_API_KEY
    process.env.WOODPECKER_API_KEY = 'test-api-key-123'
    service = new WoodpeckerService()
    vi.clearAllMocks()
  })

  afterEach(() => {
    process.env.WOODPECKER_API_KEY = originalEnv
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('should initialize with API key from environment', () => {
      expect(service).toBeDefined()
    })

    it('should initialize with API key from parameter', () => {
      const customService = new WoodpeckerService('custom-key')
      expect(customService).toBeDefined()
    })

    it('should initialize in demo mode if API key is not set', () => {
      delete process.env.WOODPECKER_API_KEY
      const demoService = new WoodpeckerService()
      expect(demoService).toBeDefined()
    })

    it('should initialize in demo mode if API key is placeholder', () => {
      const demoService = new WoodpeckerService('replace')
      expect(demoService).toBeDefined()
    })
  })

  describe('factory function', () => {
    it('should create service instance', () => {
      const factoryService = createWoodpeckerService('test-key')
      expect(factoryService).toBeInstanceOf(WoodpeckerService)
    })
  })

  describe('getCampaigns', () => {
    const mockCampaigns = [
      {
        id: 1,
        name: 'Test Campaign 1',
        status: 'ACTIVE',
        created: '2024-01-01T00:00:00Z'
      },
      {
        id: 2,
        name: 'Test Campaign 2',
        status: 'PAUSED',
        created: '2024-01-02T00:00:00Z'
      }
    ]

    it('should fetch campaigns from API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCampaigns,
      })

      const campaigns = await service.getCampaigns()

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.woodpecker.co/rest/v1/campaign_list',
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-api-key': 'test-api-key-123',
            'Content-Type': 'application/json',
          }),
        })
      )

      expect(campaigns).toEqual([
        {
          campaign_id: 1,
          name: 'Test Campaign 1',
          status: 'ACTIVE',
          created_date: '2024-01-01T00:00:00Z',
          prospects_count: undefined,
        },
        {
          campaign_id: 2,
          name: 'Test Campaign 2',
          status: 'PAUSED',
          created_date: '2024-01-02T00:00:00Z',
          prospects_count: undefined,
        },
      ])
    })

    it('should return cached campaigns on subsequent calls', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCampaigns,
      })

      // First call
      await service.getCampaigns()
      expect(mockFetch).toHaveBeenCalledTimes(1)

      // Second call should use cache
      await service.getCampaigns()
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('should refresh cache when forceRefresh is true', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockCampaigns,
      })

      // First call
      await service.getCampaigns()
      expect(mockFetch).toHaveBeenCalledTimes(1)

      // Second call with forceRefresh
      await service.getCampaigns(true)
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should return mock campaigns when API key is missing', async () => {
      // Create service with 'replace' key which should trigger demo mode
      const noKeyService = new WoodpeckerService('replace')
      const campaigns = await noKeyService.getCampaigns()

      expect(mockFetch).not.toHaveBeenCalled()
      expect(campaigns).toHaveLength(4) // Mock campaigns
      expect(campaigns[0]).toMatchObject({
        campaign_id: expect.any(Number),
        name: expect.any(String),
        status: expect.any(String),
      })
    })

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          status: { code: 'UNAUTHORIZED', msg: 'Invalid API key' },
        }),
      })

      await expect(service.getCampaigns()).rejects.toThrow(
        'Woodpecker API error: Invalid API key'
      )
    })

    it('should categorize errors correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          status: { code: 'UNAUTHORIZED', msg: 'Invalid API key' },
        }),
      })

      try {
        await service.getCampaigns()
      } catch (error) {
        expect(error).toBeInstanceOf(WoodpeckerApiError)
        expect((error as WoodpeckerApiError).category).toBe('auth')
      }
    })
  })

  describe('rate limiting', () => {
    it('should track request count', () => {
      const quotaInfo = service.getQuotaInfo()
      expect(quotaInfo).toMatchObject({
        requestCount: expect.any(Number),
        remainingRequests: expect.any(Number),
        maxRequestsPerMinute: 100,
      })
    })
  })

  describe('cache management', () => {
    it('should clear campaign cache', () => {
      service.clearCampaignCache()
      // Cache clearing is tested implicitly through getCampaigns behavior
    })
  })

  describe('addProspectsToCampaign', () => {
    const mockProspects: WoodpeckerProspect[] = [
      {
        email: 'test1@example.com',
        first_name: 'John',
        last_name: 'Doe',
        company: 'Test Corp',
      },
      {
        email: 'test2@example.com',
        first_name: 'Jane',
        last_name: 'Smith',
        company: 'Another Corp',
      },
    ]

    it('should handle empty prospects array', async () => {
      const result = await service.addProspectsToCampaign([], 123)
      expect(result.status).toBe('completed')
      expect(result.total).toBe(0)
    })

    it('should simulate export in demo mode', async () => {
      const noKeyService = new WoodpeckerService('')
      const result = await noKeyService.addProspectsToCampaign(mockProspects, 123)
      
      expect(result.status).toBe('completed')
      expect(result.succeeded).toBe(2)
      expect(result.failed).toBe(0)
    })
  })

  describe('checkDuplicateProspects', () => {
    it('should return empty array on API error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))
      
      const duplicates = await service.checkDuplicateProspects(['test@example.com'], 123)
      expect(duplicates).toEqual([])
    })
  })
})
