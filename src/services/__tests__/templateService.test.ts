import { describe, it, expect, beforeEach } from 'vitest'
import { TemplateService, TemplateValidationError } from '../templateService'
import type { LeadData } from '../templateService'

describe('TemplateService', () => {
  let templateService: TemplateService
  const validLeadData: LeadData = {
    first_name: 'John',
    last_name: 'Doe',
    company: 'Test Company',
    title: 'VP of Sales',
    email: 'john.doe@testcompany.com',
    industry: 'Technology',
    linkedin_url: 'https://linkedin.com/in/johndoe',
    tags: '#Technology #Leadership',
  }

  beforeEach(() => {
    templateService = new TemplateService()
  })

  describe('getTemplate', () => {
    it('should return email-sequence template', () => {
      const template = templateService.getTemplate('email-sequence')
      expect(template).not.toBeNull()
      expect(template?.name).toBe('6-touchpoint-email-sequence')
    })

    it('should return null for non-existent template', () => {
      const template = templateService.getTemplate('non-existent')
      expect(template).toBeNull()
    })
  })

  describe('getAllTemplates', () => {
    it('should return all loaded templates', () => {
      const templates = templateService.getAllTemplates()
      expect(templates.length).toBeGreaterThan(0)
      expect(templates[0].name).toBe('6-touchpoint-email-sequence')
    })
  })

  describe('validateLeadData', () => {
    it('should pass validation with valid lead data', () => {
      expect(() => {
        templateService.validateLeadData(validLeadData)
      }).not.toThrow()
    })

    it('should throw error for missing required fields', () => {
      const incompleteLeadData = { ...validLeadData }
      delete incompleteLeadData.first_name
      delete incompleteLeadData.company

      expect(() => {
        templateService.validateLeadData(incompleteLeadData)
      }).toThrow(TemplateValidationError)
    })

    it('should throw error for empty string fields', () => {
      const leadDataWithEmptyFields = {
        ...validLeadData,
        first_name: '',
        company: '   ',
      }

      expect(() => {
        templateService.validateLeadData(leadDataWithEmptyFields)
      }).toThrow(TemplateValidationError)
    })

    it('should throw error for non-existent template', () => {
      expect(() => {
        templateService.validateLeadData(validLeadData, 'non-existent')
      }).toThrow(TemplateValidationError)
    })
  })

  describe('substituteVariables', () => {
    it('should replace template variables correctly', () => {
      const template = 'Hello {{first_name}} {{last_name}} from {{company}}'
      const result = templateService.substituteVariables(
        template,
        validLeadData
      )
      expect(result).toBe('Hello John Doe from Test Company')
    })

    it('should throw error for unsubstituted variables', () => {
      const template = 'Hello {{first_name}} {{undefined_variable}}'
      expect(() => {
        templateService.substituteVariables(template, validLeadData)
      }).toThrow(TemplateValidationError)
    })

    it('should handle empty values', () => {
      const leadDataWithEmpty = { ...validLeadData, tags: '' }
      const template = 'Tags: {{tags}}'
      const result = templateService.substituteVariables(
        template,
        leadDataWithEmpty
      )
      expect(result).toBe('Tags: ')
    })
  })

  describe('generatePrompt', () => {
    it('should generate complete prompt with valid lead data', () => {
      const prompt = templateService.generatePrompt(validLeadData)
      expect(prompt).toContain('John')
      expect(prompt).toContain('Test Company')
      expect(prompt).toContain('VP of Sales')
      expect(prompt).toContain('Technology')
    })

    it('should auto-generate tags when not provided', () => {
      const leadDataWithoutTags = { ...validLeadData }
      delete leadDataWithoutTags.tags

      const prompt = templateService.generatePrompt(leadDataWithoutTags)
      expect(prompt).toContain('#Technology')
      expect(prompt).toContain('#Leadership')
    })

    it('should throw error for invalid lead data', () => {
      const incompleteLeadData = { ...validLeadData }
      delete incompleteLeadData.first_name

      expect(() => {
        templateService.generatePrompt(incompleteLeadData)
      }).toThrow(TemplateValidationError)
    })
  })

  describe('validateGeneratedContent', () => {
    const validContent = {
      email: 'john@company.com',
      first_name: 'John',
      last_name: 'Doe',
      company: 'Company',
      title: 'Manager',
      linkedin_url: 'https://linkedin.com/in/john',
      tags: '#test',
      industry: 'Tech',
      snippet1: 'Subject line that is exactly 36 chars',
      snippet2: '<div>HTML email body</div>',
      snippet3: 'LinkedIn message under 300 chars',
      snippet4: '<div>HTML bump email</div>',
      snippet5: '<div>HTML follow up email</div>',
      snippet6: '<div>HTML second bump</div>',
      snippet7: '<div>HTML breakup email</div>',
    }

    it('should validate complete valid content', () => {
      const isValid = templateService.validateGeneratedContent(validContent)
      expect(isValid).toBe(true)
    })

    it('should reject content with missing snippets', () => {
      const incompleteContent = { ...validContent }
      delete incompleteContent.snippet7

      const isValid =
        templateService.validateGeneratedContent(incompleteContent)
      expect(isValid).toBe(false)
    })

    it('should reject subject line that is too long', () => {
      const contentWithLongSubject = {
        ...validContent,
        snippet1:
          'This is a very long subject line that exceeds the 50 character limit',
      }

      const isValid = templateService.validateGeneratedContent(
        contentWithLongSubject
      )
      expect(isValid).toBe(false)
    })

    it('should reject subject line that is too short', () => {
      const contentWithShortSubject = {
        ...validContent,
        snippet1: 'Too short',
      }

      const isValid = templateService.validateGeneratedContent(
        contentWithShortSubject
      )
      expect(isValid).toBe(false)
    })

    it('should reject LinkedIn message that is too long', () => {
      const contentWithLongLinkedIn = {
        ...validContent,
        snippet3: 'A'.repeat(301), // 301 characters
      }

      const isValid = templateService.validateGeneratedContent(
        contentWithLongLinkedIn
      )
      expect(isValid).toBe(false)
    })

    it('should reject HTML snippets without div tags', () => {
      const contentWithoutDiv = {
        ...validContent,
        snippet2: 'Plain text without HTML div tags',
      }

      const isValid =
        templateService.validateGeneratedContent(contentWithoutDiv)
      expect(isValid).toBe(false)
    })
  })

  describe('generateTags', () => {
    it('should generate industry-based tags', () => {
      const financialLead = {
        ...validLeadData,
        industry: 'Financial Services',
        company: 'Bank of America',
        title: 'Director',
      }
      delete financialLead.tags

      const prompt = templateService.generatePrompt(financialLead)
      expect(prompt).toContain('#FinancialServices')
      expect(prompt).toContain('#Management')
    })

    it('should generate technology-based tags', () => {
      const techLead = {
        ...validLeadData,
        industry: 'Technology',
        company: 'Microsoft Software',
        title: 'VP of Engineering',
      }
      delete techLead.tags

      const prompt = templateService.generatePrompt(techLead)
      expect(prompt).toContain('#Technology')
      expect(prompt).toContain('#Leadership')
    })

    it('should generate healthcare-based tags', () => {
      const healthLead = {
        ...validLeadData,
        industry: 'Healthcare',
        company: 'Medical Center',
        title: 'Director of Learning',
      }
      delete healthLead.tags

      const prompt = templateService.generatePrompt(healthLead)
      expect(prompt).toContain('#Healthcare')
      expect(prompt).toContain('#Management')
      expect(prompt).toContain('#LearningDevelopment')
    })

    it('should generate default tag when no matches', () => {
      const genericLead = {
        ...validLeadData,
        industry: 'Unknown Industry',
        company: 'Generic Corp',
        title: 'Employee',
      }
      delete genericLead.tags

      const prompt = templateService.generatePrompt(genericLead)
      expect(prompt).toContain('#UnknownIndustry')
    })
  })
})
