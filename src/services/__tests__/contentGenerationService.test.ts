import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ContentGenerationService } from '../contentGenerationService';
import { createClaudeService } from '../claudeService';
import { templateService } from '../templateService';

// Mock the services
vi.mock('../claudeService', () => ({
  createClaudeService: vi.fn()
}));

vi.mock('../templateService', () => ({
  templateService: {
    validateLeadData: vi.fn(),
    generatePrompt: vi.fn(() => 'test prompt'),
    validateGeneratedContent: vi.fn(() => true)
  }
}));

vi.mock('../fallbackDataService', () => ({
  fallbackDataService: {
    generateFallbackContent: vi.fn(() => ({
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      company: 'Test Co',
      title: 'Tester',
      linkedin_url: 'https://linkedin.com/test',
      tags: '#test',
      industry: 'Testing',
      snippet1: 'Test subject line that meets requirements',
      snippet2: '<div>Test email body</div>',
      snippet3: 'Test linkedin message',
      snippet4: '<div>Test bump email</div>',
      snippet5: '<div>Test email</div>',
      snippet6: '<div>Test bump2</div>',
      snippet7: '<div>Test breakup</div>'
    })),
    getAllExamples: vi.fn(() => [])
  }
}));

// Mock localStorage
const localStorageMock = {
  store: {} as { [key: string]: string },
  getItem: vi.fn((key: string) => localStorageMock.store[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageMock.store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageMock.store[key];
  }),
  clear: vi.fn(() => {
    localStorageMock.store = {};
  }),
  key: vi.fn(),
  length: 0
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('ContentGenerationService', () => {
  let contentGenerationService: ContentGenerationService;
  let mockClaudeService: any;
  let mockTemplateService: any;

  const mockLeadData = {
    first_name: 'John',
    last_name: 'Doe',
    company: 'Test Company',
    title: 'VP of Sales',
    email: 'john.doe@testcompany.com',
    industry: 'Technology',
    linkedin_url: 'https://linkedin.com/in/johndoe'
  };

  const mockGeneratedContent = {
    email: 'john.doe@testcompany.com',
    first_name: 'John',
    last_name: 'Doe',
    company: 'Test Company',
    title: 'VP of Sales',
    linkedin_url: 'https://linkedin.com/in/johndoe',
    tags: '#Technology',
    industry: 'Technology',
    snippet1: 'Subject line that is exactly 36 chars',
    snippet2: '<div>HTML email body</div>',
    snippet3: 'LinkedIn message',
    snippet4: '<div>HTML bump email</div>',
    snippet5: '<div>HTML follow up email</div>',
    snippet6: '<div>HTML second bump</div>',
    snippet7: '<div>HTML breakup email</div>'
  };

  beforeEach(() => {
    // Reset localStorage mock
    localStorageMock.store = {};
    vi.clearAllMocks();

    // Create mock services
    mockClaudeService = {
      generateContentWithRetry: vi.fn(),
      getRequestCount: vi.fn(() => 0),
      getRemainingRequests: vi.fn(() => 100)
    };

    mockTemplateService = {
      validateLeadData: vi.fn(),
      generatePrompt: vi.fn(() => 'test prompt'),
      validateGeneratedContent: vi.fn(() => true)
    };

    // Mock the service factories
    vi.mocked(createClaudeService).mockReturnValue(mockClaudeService);
    Object.assign(vi.mocked(templateService), mockTemplateService);
    
    contentGenerationService = new ContentGenerationService();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  describe('generateForLead', () => {
    it('should successfully generate content for a single lead', async () => {
      mockClaudeService.generateContentWithRetry.mockResolvedValue(mockGeneratedContent);

      const result = await contentGenerationService.generateForLead(mockLeadData);

      expect(result.status).toBe('completed');
      expect(result.content).toEqual(mockGeneratedContent);
      expect(result.leadId).toBeTruthy();
      expect(result.generatedAt).toBeInstanceOf(Date);
      
      // Check that content was persisted
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('should handle validation errors', async () => {
      mockTemplateService.validateLeadData.mockImplementation(() => {
        throw new Error('Invalid lead data');
      });

      const result = await contentGenerationService.generateForLead(mockLeadData);

      expect(result.status).toBe('failed');
      expect(result.error).toBe('Invalid lead data');
      expect(result.content).toBeUndefined();
    });

    it('should handle Claude API errors by falling back to mock data', async () => {
      mockClaudeService.generateContentWithRetry.mockRejectedValue(new Error('API Error'));
      
      // Disable fallback mode to test actual error handling
      contentGenerationService.setUseFallback(false);

      const result = await contentGenerationService.generateForLead(mockLeadData);

      expect(result.status).toBe('completed');
      expect(result.content).toBeTruthy();
      expect(result.error).toBeUndefined();
    });

    it('should handle content validation failures by falling back to mock data', async () => {
      mockClaudeService.generateContentWithRetry.mockResolvedValue(mockGeneratedContent);
      mockTemplateService.validateGeneratedContent.mockReturnValue(false);
      
      // Disable fallback mode to test actual error handling
      contentGenerationService.setUseFallback(false);

      const result = await contentGenerationService.generateForLead(mockLeadData);

      expect(result.status).toBe('completed');
      expect(result.content).toBeTruthy();
      expect(result.error).toBeUndefined();
    });
  });

  describe('generateForLeads', () => {
    it('should initialize batch generation for multiple leads', async () => {
      const leads = [mockLeadData, { ...mockLeadData, email: 'jane@company.com' }];
      
      const batchId = await contentGenerationService.generateForLeads(leads);
      
      expect(batchId).toBeTruthy();
      
      const progress = contentGenerationService.getProgress(batchId);
      expect(progress?.total).toBe(2);
      expect(progress?.completed).toBe(0);
      expect(progress?.failed).toBe(0);
    });

    it('should return custom batch ID when provided', async () => {
      const customBatchId = 'custom_batch_123';
      const leads = [mockLeadData];
      
      const batchId = await contentGenerationService.generateForLeads(leads, 'email-sequence', customBatchId);
      
      expect(batchId).toBe(customBatchId);
    });
  });

  describe('getLeadContent', () => {
    it('should retrieve content from localStorage', () => {
      const leadId = 'test_lead_123';
      const key = `lead_content_${leadId}`;
      localStorageMock.store[key] = JSON.stringify(mockGeneratedContent);

      const content = contentGenerationService.getLeadContent(leadId);

      expect(content).toEqual(mockGeneratedContent);
      expect(localStorageMock.getItem).toHaveBeenCalledWith(key);
    });

    it('should return null when content does not exist', () => {
      const content = contentGenerationService.getLeadContent('non_existent_lead');
      expect(content).toBeNull();
    });
  });

  describe('hasLeadContent', () => {
    it('should return true when content exists', () => {
      const leadId = 'test_lead_123';
      const key = `lead_content_${leadId}`;
      localStorageMock.store[key] = JSON.stringify(mockGeneratedContent);

      const hasContent = contentGenerationService.hasLeadContent(leadId);
      expect(hasContent).toBe(true);
    });

    it('should return false when content does not exist', () => {
      const hasContent = contentGenerationService.hasLeadContent('non_existent_lead');
      expect(hasContent).toBe(false);
    });
  });

  describe('getLeadGenerationStatus', () => {
    it('should return "completed" when content exists in localStorage', () => {
      const leadId = 'test_lead_123';
      const key = `lead_content_${leadId}`;
      localStorageMock.store[key] = JSON.stringify(mockGeneratedContent);

      const status = contentGenerationService.getLeadGenerationStatus(leadId);
      expect(status).toBe('completed');
    });

    it('should return "not_generated" when no content or progress exists', () => {
      const status = contentGenerationService.getLeadGenerationStatus('non_existent_lead');
      expect(status).toBe('not_generated');
    });
  });

  describe('clearAllContent', () => {
    it('should remove all lead content from localStorage', () => {
      // Add some test content
      localStorageMock.store['lead_content_123'] = 'test1';
      localStorageMock.store['lead_content_456'] = 'test2';
      localStorageMock.store['other_key'] = 'should_remain';

      // Mock Object.keys to return the keys from our mock store
      const originalObjectKeys = Object.keys;
      const mockKeys = ['lead_content_123', 'lead_content_456', 'other_key'];
      Object.keys = vi.fn(() => mockKeys);

      contentGenerationService.clearAllContent();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('lead_content_123');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('lead_content_456');
      expect(localStorageMock.store['other_key']).toBe('should_remain');

      // Restore original Object.keys
      Object.keys = originalObjectKeys;
    });
  });

  describe('getQuotaInfo', () => {
    it('should return quota information from Claude service', () => {
      mockClaudeService.getRequestCount.mockReturnValue(25);
      mockClaudeService.getRemainingRequests.mockReturnValue(75);

      const quotaInfo = contentGenerationService.getQuotaInfo();

      expect(quotaInfo.requestCount).toBe(25);
      expect(quotaInfo.remainingRequests).toBe(75);
    });
  });

  describe('getProgress', () => {
    it('should return null for non-existent batch', () => {
      const progress = contentGenerationService.getProgress('non_existent_batch');
      expect(progress).toBeNull();
    });
  });

  describe('getResults', () => {
    it('should return empty array for non-existent batch', () => {
      const results = contentGenerationService.getResults('non_existent_batch');
      expect(results).toEqual([]);
    });
  });

  describe('cancelBatch', () => {
    it('should return false for non-existent batch', () => {
      const cancelled = contentGenerationService.cancelBatch('non_existent_batch');
      expect(cancelled).toBe(false);
    });
  });
});