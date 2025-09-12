import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClaudeService, ClaudeApiError } from '../claudeService';
import Anthropic from '@anthropic-ai/sdk';

// Mock the Anthropic SDK
vi.mock('@anthropic-ai/sdk');

describe('ClaudeService', () => {
  let claudeService: ClaudeService;
  let mockClient: any;

  beforeEach(() => {
    // Create mock client
    mockClient = {
      messages: {
        create: vi.fn()
      }
    };
    
    // Mock Anthropic constructor
    vi.mocked(Anthropic).mockImplementation(() => mockClient);
    
    claudeService = new ClaudeService('test-api-key');
  });

  describe('constructor', () => {
    it('should initialize with valid API key', () => {
      expect(() => new ClaudeService('test-key')).not.toThrow();
    });
  });

  describe('generateContent', () => {
    const mockPrompt = 'Test prompt';
    const mockLeadData = { name: 'John Doe' };
    const mockValidResponse = {
      email: 'john.doe@company.com',
      first_name: 'John',
      last_name: 'Doe',
      company: 'Test Company',
      title: 'Manager',
      linkedin_url: 'https://linkedin.com/in/johndoe',
      tags: '#test',
      industry: 'Technology',
      snippet1: 'Subject line',
      snippet2: 'Email body',
      snippet3: 'LinkedIn message',
      snippet4: 'Bump email',
      snippet5: 'Follow up email',
      snippet6: 'Second bump',
      snippet7: 'Breakup email'
    };

    it('should successfully generate content with valid response', async () => {
      mockClient.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(mockValidResponse) }]
      });

      const result = await claudeService.generateContent(mockPrompt, mockLeadData);

      expect(result).toEqual(mockValidResponse);
      expect(mockClient.messages.create).toHaveBeenCalledWith({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        temperature: 0.7,
        messages: [{ role: 'user', content: mockPrompt }]
      });
    });

    it('should throw error when response is not JSON', async () => {
      mockClient.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'Invalid JSON response' }]
      });

      await expect(claudeService.generateContent(mockPrompt, mockLeadData))
        .rejects.toThrow(ClaudeApiError);
    });

    it('should throw error when required fields are missing', async () => {
      const incompleteResponse = { email: 'test@example.com' };
      mockClient.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(incompleteResponse) }]
      });

      await expect(claudeService.generateContent(mockPrompt, mockLeadData))
        .rejects.toThrow(ClaudeApiError);
    });

    it('should handle rate limit errors', async () => {
      const error = new Anthropic.APIError('Rate limit', null, 429, {});
      mockClient.messages.create.mockRejectedValue(error);

      await expect(claudeService.generateContent(mockPrompt, mockLeadData))
        .rejects.toThrow(ClaudeApiError);
    });

    it('should handle authentication errors', async () => {
      const error = new Anthropic.APIError('Unauthorized', null, 401, {});
      mockClient.messages.create.mockRejectedValue(error);

      await expect(claudeService.generateContent(mockPrompt, mockLeadData))
        .rejects.toThrow(ClaudeApiError);
    });
  });

  describe('generateContentWithRetry', () => {
    const mockPrompt = 'Test prompt';
    const mockLeadData = { name: 'John Doe' };

    it('should succeed on first attempt', async () => {
      const mockResponse = {
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        company: 'Test Co',
        title: 'Tester',
        linkedin_url: 'https://linkedin.com/test',
        tags: '#test',
        industry: 'Testing',
        snippet1: 'Test subject',
        snippet2: 'Test body',
        snippet3: 'Test linkedin',
        snippet4: 'Test bump',
        snippet5: 'Test email',
        snippet6: 'Test bump2',
        snippet7: 'Test breakup'
      };

      mockClient.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(mockResponse) }]
      });

      const result = await claudeService.generateContentWithRetry(mockPrompt, mockLeadData);
      expect(result).toEqual(mockResponse);
      expect(mockClient.messages.create).toHaveBeenCalledTimes(1);
    });

    it('should not retry non-retryable errors', async () => {
      const error = new ClaudeApiError('Auth error', 'auth', false);
      mockClient.messages.create.mockRejectedValue(error);

      await expect(claudeService.generateContentWithRetry(mockPrompt, mockLeadData))
        .rejects.toThrow('Auth error');
      expect(mockClient.messages.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('rate limiting', () => {
    it('should track request count', () => {
      expect(claudeService.getRequestCount()).toBe(0);
      expect(claudeService.getRemainingRequests()).toBe(100);
    });
  });
});