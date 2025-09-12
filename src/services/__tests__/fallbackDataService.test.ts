import { describe, it, expect, beforeEach } from 'vitest'
import { FallbackDataService } from '../fallbackDataService'
import type { LeadData } from '../templateService'

describe('FallbackDataService', () => {
  let fallbackDataService: FallbackDataService

  beforeEach(() => {
    fallbackDataService = new FallbackDataService()
  })

  describe('generateFallbackContent', () => {
    it('should generate content with exact industry match', () => {
      const leadData: LeadData = {
        first_name: 'John',
        last_name: 'Doe',
        company: 'Test Bank',
        title: 'VP of Learning',
        email: 'john.doe@testbank.com',
        industry: 'Financial Services',
        linkedin_url: 'https://linkedin.com/in/johndoe',
      }

      const result = fallbackDataService.generateFallbackContent(leadData)

      expect(result.email).toBe(leadData.email)
      expect(result.first_name).toBe(leadData.first_name)
      expect(result.last_name).toBe(leadData.last_name)
      expect(result.company).toBe(leadData.company)
      expect(result.title).toBe(leadData.title)
      expect(result.industry).toBe(leadData.industry)
      expect(result.snippet1).toBeTruthy()
      expect(result.snippet1.length).toBeGreaterThan(35)
      expect(result.snippet1.length).toBeLessThan(51)
      expect(result.snippet7).toContain('<div>')
    })

    it('should generate content with partial industry match', () => {
      const leadData: LeadData = {
        first_name: 'Sarah',
        last_name: 'Smith',
        company: 'Tech Startup',
        title: 'Director of Engineering',
        email: 'sarah@techstartup.com',
        industry: 'Software Technology',
        linkedin_url: 'https://linkedin.com/in/sarahsmith',
      }

      const result = fallbackDataService.generateFallbackContent(leadData)

      expect(result.email).toBe(leadData.email)
      expect(result.company).toBe(leadData.company)
      expect(result.industry).toBe(leadData.industry)
    })

    it('should fall back to technology example for unknown industry', () => {
      const leadData: LeadData = {
        first_name: 'Mike',
        last_name: 'Johnson',
        company: 'Random Corp',
        title: 'Manager',
        email: 'mike@randomcorp.com',
        industry: 'Unknown Industry',
        linkedin_url: 'https://linkedin.com/in/mikejohnson',
      }

      const result = fallbackDataService.generateFallbackContent(leadData)

      expect(result.email).toBe(leadData.email)
      expect(result.company).toBe(leadData.company)
      expect(result.industry).toBe(leadData.industry)
      expect(result.tags).toContain('#UnknownIndustry')
    })

    it('should generate appropriate tags based on title and industry', () => {
      const leadData: LeadData = {
        first_name: 'Dr. Jane',
        last_name: 'Wilson',
        company: 'Medical Center',
        title: 'VP of Learning & Development',
        email: 'jane@medicalcenter.com',
        industry: 'Healthcare',
        linkedin_url: 'https://linkedin.com/in/janewilson',
      }

      const result = fallbackDataService.generateFallbackContent(leadData)

      expect(result.tags).toContain('#Healthcare')
      expect(result.tags).toContain('#Leadership')
      expect(result.tags).toContain('#LearningDevelopment')
      expect(result.tags).toContain('#PatientSafety')
    })
  })

  describe('getAllExamples', () => {
    it('should return all fallback examples', () => {
      const examples = fallbackDataService.getAllExamples()

      expect(examples.length).toBeGreaterThan(0)
      expect(examples.some((e) => e.industry === 'Financial Services')).toBe(
        true
      )
      expect(examples.some((e) => e.industry === 'Technology')).toBe(true)
      expect(examples.some((e) => e.industry === 'Healthcare')).toBe(true)
    })
  })

  describe('getExampleByIndustry', () => {
    it('should return correct example for exact match', () => {
      const example = fallbackDataService.getExampleByIndustry('Technology')

      expect(example).not.toBeNull()
      expect(example?.industry).toBe('Technology')
    })

    it('should return null for non-existent industry', () => {
      const example = fallbackDataService.getExampleByIndustry(
        'Non-existent Industry'
      )

      expect(example).toBeNull()
    })

    it('should be case insensitive', () => {
      const example = fallbackDataService.getExampleByIndustry('healthcare')

      expect(example).not.toBeNull()
      expect(example?.industry).toBe('Healthcare')
    })
  })
})
