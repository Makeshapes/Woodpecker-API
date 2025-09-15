import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import WoodpeckerService from './woodpeckerService';
import type { WoodpeckerCampaign, ExportProgress } from './woodpeckerService';

describe('WoodpeckerService', () => {
  let service: WoodpeckerService;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock;
    service = new WoodpeckerService('test-api-key-123');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with API key from environment', () => {
      expect(service).toBeDefined();
    });

    it('should throw error if API key is not set', () => {
      expect(() => new WoodpeckerService()).toThrow(
        'VITE_WOODPECKER_API_KEY environment variable is not set'
      );
    });
  });

  describe('getCampaigns', () => {
    const mockCampaigns: WoodpeckerCampaign[] = [
      {
        campaign_id: 1,
        name: 'Test Campaign 1',
        status: 'ACTIVE',
        created_date: '2024-01-01',
        prospects_count: 100,
      },
      {
        campaign_id: 2,
        name: 'Test Campaign 2',
        status: 'PAUSED',
        created_date: '2024-01-02',
        prospects_count: 50,
      },
    ];

    it('should fetch campaigns from API', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ campaigns: mockCampaigns }),
      });

      const campaigns = await service.getCampaigns();

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.woodpecker.co/rest/v1/campaigns',
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-api-key': 'test-api-key-123',
            'Content-Type': 'application/json',
          }),
        })
      );
      expect(campaigns).toEqual(mockCampaigns);
    });

    it('should use cached campaigns when not expired', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ campaigns: mockCampaigns }),
      });

      // First call - fetches from API
      const campaigns1 = await service.getCampaigns();
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Second call - uses cache
      const campaigns2 = await service.getCampaigns();
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(campaigns2).toEqual(campaigns1);
    });

    it('should refresh cache when forceRefresh is true', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ campaigns: mockCampaigns }),
      });

      // First call
      await service.getCampaigns();
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Second call with forceRefresh
      await service.getCampaigns(true);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('should handle API errors gracefully', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          status: { code: 'UNAUTHORIZED', msg: 'Invalid API key' },
        }),
      });

      await expect(service.getCampaigns()).rejects.toThrow(
        'Woodpecker API error: Invalid API key'
      );
    });
  });

  describe('addProspectsToCampaign', () => {
    const mockProspects = [
      {
        email: 'test1@example.com',
        first_name: 'John',
        last_name: 'Doe',
        company: 'Test Co',
      },
      {
        email: 'test2@example.com',
        first_name: 'Jane',
        last_name: 'Smith',
        company: 'Example Inc',
      },
    ];

    it('should add prospects to campaign successfully', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: { code: 'OK', msg: 'Success' },
          prospects: [
            { email: 'test1@example.com', status: 'OK' },
            { email: 'test2@example.com', status: 'OK' },
          ],
        }),
      });

      const progress = await service.addProspectsToCampaign(mockProspects, 1);

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.woodpecker.co/rest/v1/add_prospects_campaign',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            prospects: mockProspects,
            campaign: { campaign_id: 1 },
            force: false,
          }),
        })
      );

      expect(progress).toEqual({
        current: 2,
        total: 2,
        succeeded: 2,
        failed: 0,
        status: 'completed',
        errors: [],
      });
    });

    it('should handle duplicate prospects', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: { code: 'OK', msg: 'Success' },
          prospects: [
            { email: 'test1@example.com', status: 'DUPLICATE' },
            { email: 'test2@example.com', status: 'OK' },
          ],
        }),
      });

      const progress = await service.addProspectsToCampaign(mockProspects, 1);

      expect(progress.succeeded).toBe(2);
      expect(progress.failed).toBe(0);
    });

    it('should track progress with callback', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: { code: 'OK', msg: 'Success' },
          prospects: mockProspects.map(p => ({
            email: p.email,
            status: 'OK',
          })),
        }),
      });

      const progressUpdates: ExportProgress[] = [];
      const onProgress = (progress: ExportProgress) => {
        progressUpdates.push({ ...progress });
      };

      await service.addProspectsToCampaign(mockProspects, 1, onProgress);

      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[progressUpdates.length - 1].current).toBe(2);
    });

    it('should handle batch processing for large prospect lists', async () => {
      const largeProspectList = Array.from({ length: 120 }, (_, i) => ({
        email: `test${i}@example.com`,
        first_name: `User${i}`,
      }));

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({
          status: { code: 'OK', msg: 'Success' },
        }),
      });

      await service.addProspectsToCampaign(largeProspectList, 1);

      // Should be called 3 times (50 + 50 + 20)
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it('should handle API errors during batch processing', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network error'));

      const progress = await service.addProspectsToCampaign(mockProspects, 1);

      expect(progress.failed).toBe(2);
      expect(progress.errors).toHaveLength(2);
      expect(progress.errors[0].error).toContain('Network error');
    });
  });

  describe('checkDuplicateProspects', () => {
    it('should identify duplicate prospects in campaign', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          prospects: [
            { email: 'existing@example.com', campaigns: [1, 2] },
            { email: 'other@example.com', campaigns: [2] },
          ],
        }),
      });

      const duplicates = await service.checkDuplicateProspects(
        ['existing@example.com', 'new@example.com'],
        1
      );

      expect(duplicates).toEqual(['existing@example.com']);
    });

    it('should handle case-insensitive email comparison', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          prospects: [{ email: 'Test@Example.COM', campaigns: [1] }],
        }),
      });

      const duplicates = await service.checkDuplicateProspects(
        ['test@example.com', 'new@example.com'],
        1
      );

      expect(duplicates).toEqual(['test@example.com']);
    });

    it('should return empty array on API error', async () => {
      fetchMock.mockRejectedValueOnce(new Error('API Error'));

      const duplicates = await service.checkDuplicateProspects(
        ['test@example.com'],
        1
      );

      expect(duplicates).toEqual([]);
    });
  });

  describe('clearCampaignCache', () => {
    it('should clear cached campaigns', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ campaigns: [] }),
      });

      // Populate cache
      await service.getCampaigns();
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Clear cache
      service.clearCampaignCache();

      // Next call should fetch from API again
      await service.getCampaigns();
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });
});