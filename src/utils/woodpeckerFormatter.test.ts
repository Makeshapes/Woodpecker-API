import { describe, it, expect } from 'vitest';
import {
  formatProspectForWoodpecker,
  formatMultipleProspects,
  validateWoodpeckerProspect,
  createWoodpeckerExportSummary,
} from './woodpeckerFormatter';
import type { LeadData } from '@/types/lead';
import type { WoodpeckerProspect } from '@/services/woodpeckerService';

describe('woodpeckerFormatter', () => {
  const mockLead: LeadData = {
    id: 'lead-1',
    status: 'drafted',
    email: 'john.doe@example.com',
    firstName: 'John',
    lastName: 'Doe',
    company: 'Example Corp',
    title: 'Software Engineer',
    linkedInUrl: 'https://linkedin.com/in/johndoe',
  };

  const mockGeneratedContent = {
    snippet1: 'Subject: Partnership Opportunity',
    snippet2: '<div>Hello John,</div><div>I hope this email finds you well...</div>',
    snippet3: '<div>Following up on our previous conversation...</div>',
    snippet4: '<div>I wanted to share some insights about...</div>',
    snippet5: '<div>Would you be interested in a brief call...</div>',
    snippet6: '<div>Thank you for your time and consideration...</div>',
    snippet7: '<div>Best regards,<br/>Sales Team</div>',
  };

  describe('formatProspectForWoodpecker', () => {
    it('should format basic prospect information correctly', () => {
      const result = formatProspectForWoodpecker(mockLead);

      expect(result).toEqual({
        email: 'john.doe@example.com',
        first_name: 'John',
        last_name: 'Doe',
        company: 'Example Corp',
        title: 'Software Engineer',
        linkedin_url: 'https://linkedin.com/in/johndoe',
      });
    });

    it('should include generated content snippets', () => {
      const result = formatProspectForWoodpecker(mockLead, mockGeneratedContent);

      expect(result.snippet1).toBe('Subject: Partnership Opportunity');
      expect(result.snippet2).toBe('<div>Hello John,</div><div>I hope this email finds you well...</div>');
      expect(result.snippet7).toBe('<div>Best regards,<br/>Sales Team</div>');
    });

    it('should handle missing fields gracefully', () => {
      const leadWithMissingFields: LeadData = {
        id: 'lead-2',
        status: 'imported',
        email: 'jane@example.com',
      };

      const result = formatProspectForWoodpecker(leadWithMissingFields);

      expect(result).toEqual({
        email: 'jane@example.com',
      });
    });

    it('should extract first and last name from full name field', () => {
      const leadWithFullName: LeadData = {
        id: 'lead-3',
        status: 'imported',
        email: 'bob@example.com',
        contactName: 'Bob Smith Wilson',
      };

      const result = formatProspectForWoodpecker(leadWithFullName);

      expect(result.first_name).toBe('Bob');
      expect(result.last_name).toBe('Smith Wilson');
    });

    it('should handle different field name variations', () => {
      const leadWithVariations: LeadData = {
        id: 'lead-4',
        status: 'imported',
        Email: 'alice@example.com', // Capitalized
        Company: 'Tech Corp', // Capitalized
        job_title: 'Product Manager', // Underscore format
        linkedin: 'https://linkedin.com/in/alice', // Alternative field name
      };

      const result = formatProspectForWoodpecker(leadWithVariations);

      expect(result.email).toBe('alice@example.com');
      expect(result.company).toBe('Tech Corp');
      expect(result.title).toBe('Product Manager');
      expect(result.linkedin_url).toBe('https://linkedin.com/in/alice');
    });

    it('should include empty snippets when option is enabled', () => {
      const partialContent = {
        snippet1: 'Subject line',
        snippet3: 'Third email',
      };

      const result = formatProspectForWoodpecker(
        mockLead,
        partialContent,
        { includeEmptySnippets: true }
      );

      expect(result.snippet1).toBe('Subject line');
      expect(result.snippet2).toBe('');
      expect(result.snippet3).toBe('Third email');
      expect(result.snippet4).toBe('');
      expect(result.snippet7).toBe('');
    });

    it('should apply custom field mappings', () => {
      const leadWithCustomFields: LeadData = {
        id: 'lead-5',
        status: 'imported',
        email: 'custom@example.com',
        department: 'Engineering',
        phone: '+1-555-0123',
      };

      const result = formatProspectForWoodpecker(
        leadWithCustomFields,
        undefined,
        {
          customFieldMapping: {
            department: 'custom_department',
            phone: 'phone_number',
          },
        }
      );

      expect(result.custom_department).toBe('Engineering');
      expect(result.phone_number).toBe('+1-555-0123');
    });

    it('should trim whitespace from fields', () => {
      const leadWithWhitespace: LeadData = {
        id: 'lead-6',
        status: 'imported',
        email: '  user@example.com  ',
        firstName: '  John  ',
        company: '  Example Corp  ',
      };

      const result = formatProspectForWoodpecker(leadWithWhitespace);

      expect(result.email).toBe('user@example.com');
      expect(result.first_name).toBe('John');
      expect(result.company).toBe('Example Corp');
    });

    it('should fallback to ID when no email field is found', () => {
      const leadWithoutEmail: LeadData = {
        id: 'lead-no-email',
        status: 'imported',
        firstName: 'John',
      };

      const result = formatProspectForWoodpecker(leadWithoutEmail);

      expect(result.email).toBe('lead-no-email');
      expect(result.first_name).toBe('John');
    });
  });

  describe('formatMultipleProspects', () => {
    it('should format multiple leads correctly', () => {
      const leads: LeadData[] = [
        {
          id: 'lead-1',
          status: 'drafted',
          email: 'user1@example.com',
          firstName: 'User',
          lastName: 'One',
        },
        {
          id: 'lead-2',
          status: 'drafted',
          email: 'user2@example.com',
          firstName: 'User',
          lastName: 'Two',
        },
      ];

      const getGeneratedContent = (leadId: string) => {
        if (leadId === 'lead-1') {
          return { snippet1: 'Subject for User One' };
        }
        if (leadId === 'lead-2') {
          return { snippet1: 'Subject for User Two' };
        }
        return undefined;
      };

      const results = formatMultipleProspects(leads, getGeneratedContent);

      expect(results).toHaveLength(2);
      expect(results[0].email).toBe('user1@example.com');
      expect(results[0].snippet1).toBe('Subject for User One');
      expect(results[1].email).toBe('user2@example.com');
      expect(results[1].snippet1).toBe('Subject for User Two');
    });

    it('should handle leads without generated content', () => {
      const leads: LeadData[] = [
        {
          id: 'lead-1',
          status: 'imported',
          email: 'test@example.com',
        },
      ];

      const getGeneratedContent = () => undefined;

      const results = formatMultipleProspects(leads, getGeneratedContent);

      expect(results).toHaveLength(1);
      expect(results[0].email).toBe('test@example.com');
      expect(results[0].snippet1).toBeUndefined();
    });
  });

  describe('validateWoodpeckerProspect', () => {
    it('should validate a correct prospect', () => {
      const validProspect: WoodpeckerProspect = {
        email: 'valid@example.com',
        first_name: 'John',
        snippet1: '<div>Valid HTML content</div>',
      };

      const result = validateWoodpeckerProspect(validProspect);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing email', () => {
      const invalidProspect: WoodpeckerProspect = {
        email: '',
        first_name: 'John',
      };

      const result = validateWoodpeckerProspect(invalidProspect);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Email is required');
    });

    it('should detect invalid email format', () => {
      const invalidProspect: WoodpeckerProspect = {
        email: 'invalid-email',
        first_name: 'John',
      };

      const result = validateWoodpeckerProspect(invalidProspect);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Email format is invalid');
    });

    it('should detect script tags in snippets', () => {
      const invalidProspect: WoodpeckerProspect = {
        email: 'valid@example.com',
        snippet1: '<div>Hello</div><script>alert("xss")</script>',
      };

      const result = validateWoodpeckerProspect(invalidProspect);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Snippet 1 contains script tags (not allowed)');
    });

    it('should detect style tags in snippets', () => {
      const invalidProspect: WoodpeckerProspect = {
        email: 'valid@example.com',
        snippet2: '<style>body { color: red; }</style><div>Content</div>',
      };

      const result = validateWoodpeckerProspect(invalidProspect);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Snippet 2 contains style tags (not recommended)');
    });

    it('should detect unclosed HTML tags', () => {
      const invalidProspect: WoodpeckerProspect = {
        email: 'valid@example.com',
        snippet3: '<div><p>Unclosed paragraph<div>Another div</div>',
      };

      const result = validateWoodpeckerProspect(invalidProspect);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Snippet 3 may have unclosed HTML tags');
    });
  });

  describe('createWoodpeckerExportSummary', () => {
    it('should create correct export summary', () => {
      const prospects: WoodpeckerProspect[] = [
        {
          email: 'user1@example.com',
          snippet1: 'Subject 1',
          snippet2: 'Body 1',
        },
        {
          email: 'user2@example.com',
          snippet1: 'Subject 2',
          snippet3: 'Follow-up',
        },
        {
          email: 'invalid-email',
          snippet1: 'Subject 3',
        },
      ];

      const validationResults = prospects.map(validateWoodpeckerProspect);

      const summary = createWoodpeckerExportSummary(prospects, validationResults);

      expect(summary.totalProspects).toBe(3);
      expect(summary.validProspects).toBe(2);
      expect(summary.invalidProspects).toBe(1);
      expect(summary.snippetStats.snippet1).toBe(3);
      expect(summary.snippetStats.snippet2).toBe(1);
      expect(summary.snippetStats.snippet3).toBe(1);
      expect(summary.snippetStats.snippet4).toBe(0);
      expect(summary.commonErrors).toHaveLength(1);
      expect(summary.commonErrors[0].error).toBe('Email format is invalid');
      expect(summary.commonErrors[0].count).toBe(1);
    });

    it('should handle empty prospects list', () => {
      const summary = createWoodpeckerExportSummary([], []);

      expect(summary.totalProspects).toBe(0);
      expect(summary.validProspects).toBe(0);
      expect(summary.invalidProspects).toBe(0);
      expect(summary.commonErrors).toHaveLength(0);
    });

    it('should count snippet statistics correctly', () => {
      const prospects: WoodpeckerProspect[] = [
        {
          email: 'test@example.com',
          snippet1: 'Subject',
          snippet2: '',  // Empty snippet should not be counted
          snippet3: '   ', // Whitespace-only should not be counted
          snippet4: 'Valid content',
        },
      ];

      const validationResults = prospects.map(validateWoodpeckerProspect);
      const summary = createWoodpeckerExportSummary(prospects, validationResults);

      expect(summary.snippetStats.snippet1).toBe(1);
      expect(summary.snippetStats.snippet2).toBe(0);
      expect(summary.snippetStats.snippet3).toBe(0);
      expect(summary.snippetStats.snippet4).toBe(1);
      expect(summary.snippetStats.snippet5).toBe(0);
    });
  });
});