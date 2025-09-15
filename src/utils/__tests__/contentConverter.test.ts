/**
 * Tests for content conversion utilities (Story 1.5)
 */

import {
  htmlToPlainText,
  plainTextToHtml,
  validatePlainText,
  convertFromHtmlContent,
  convertToHtmlContent,
  type PlainTextContent
} from '../contentConverter'

describe('contentConverter', () => {
  describe('htmlToPlainText', () => {
    it('should convert HTML with div tags to plain text', () => {
      const html = '<div>Hello world</div><div>Second line</div>'
      const result = htmlToPlainText(html)
      expect(result).toBe('Hello world\nSecond line')
    })

    it('should convert HTML with br tags to plain text', () => {
      const html = 'Hello<br>world<br />test'
      const result = htmlToPlainText(html)
      expect(result).toBe('Hello\nworld\ntest')
    })

    it('should handle mixed HTML tags', () => {
      const html = '<div>Hello</div><p>World</p><br>Test'
      const result = htmlToPlainText(html)
      expect(result).toBe('Hello\n\nWorld\nTest')
    })

    it('should remove HTML tags and preserve text', () => {
      const html = '<div><strong>Bold</strong> and <em>italic</em> text</div>'
      const result = htmlToPlainText(html)
      expect(result).toBe('Bold and italic text')
    })

    it('should handle empty input', () => {
      expect(htmlToPlainText('')).toBe('')
      expect(htmlToPlainText(null as any)).toBe('')
      expect(htmlToPlainText(undefined as any)).toBe('')
    })

    it('should clean up multiple line breaks', () => {
      const html = '<div></div><div></div><div>Content</div><div></div><div></div>'
      const result = htmlToPlainText(html)
      expect(result).toBe('Content')
    })
  })

  describe('plainTextToHtml', () => {
    it('should convert plain text lines to div tags', () => {
      const text = 'Hello world\nSecond line'
      const result = plainTextToHtml(text)
      expect(result).toBe('<div>Hello world</div><div>Second line</div>')
    })

    it('should handle empty lines', () => {
      const text = 'Hello\n\nWorld'
      const result = plainTextToHtml(text)
      expect(result).toBe('<div>Hello</div><div><br></div><div>World</div>')
    })

    it('should handle single line', () => {
      const text = 'Single line'
      const result = plainTextToHtml(text)
      expect(result).toBe('<div>Single line</div>')
    })

    it('should handle empty input', () => {
      expect(plainTextToHtml('')).toBe('')
      expect(plainTextToHtml(null as any)).toBe('')
      expect(plainTextToHtml(undefined as any)).toBe('')
    })

    it('should trim whitespace from lines', () => {
      const text = '  Hello  \n  World  '
      const result = plainTextToHtml(text)
      expect(result).toBe('<div>Hello</div><div>World</div>')
    })
  })

  describe('validatePlainText', () => {
    const validContent: PlainTextContent = {
      snippet1: 'Valid subject line that is 36-50 characters',
      snippet2: 'Email body content',
      snippet3: 'LinkedIn message under 300 chars',
      snippet4: 'Bump email content',
      snippet5: 'Follow-up email content',
      snippet6: 'Second bump content',
      snippet7: 'Breakup email content',
    }

    it('should validate valid content', () => {
      const result = validatePlainText(validContent)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject subject line that is too short', () => {
      const content = { ...validContent, snippet1: 'Too short' }
      const result = validatePlainText(content)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.field === 'snippet1' && e.message.includes('at least 36'))).toBe(true)
    })

    it('should reject subject line that is too long', () => {
      const content = { ...validContent, snippet1: 'This subject line is way too long and exceeds the 50 character limit significantly' }
      const result = validatePlainText(content)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.field === 'snippet1' && e.message.includes('no more than 50'))).toBe(true)
    })

    it('should reject LinkedIn message that is too long', () => {
      const content = { ...validContent, snippet3: 'A'.repeat(301) }
      const result = validatePlainText(content)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.field === 'snippet3' && e.message.includes('no more than 300'))).toBe(true)
    })

    it('should reject empty required fields', () => {
      const content = { ...validContent, snippet2: '' }
      const result = validatePlainText(content)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.field === 'snippet2' && e.message.includes('required'))).toBe(true)
    })

    it('should reject line breaks in subject line', () => {
      const content = { ...validContent, snippet1: 'Subject with\nline break that is long enough' }
      const result = validatePlainText(content)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.field === 'snippet1' && e.message.includes('line breaks'))).toBe(true)
    })

    it('should reject line breaks in LinkedIn message', () => {
      const content = { ...validContent, snippet3: 'LinkedIn message with\nline break' }
      const result = validatePlainText(content)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.field === 'snippet3' && e.message.includes('line breaks'))).toBe(true)
    })
  })

  describe('convertFromHtmlContent', () => {
    it('should convert HTML content to plain text format', () => {
      const htmlContent = {
        snippet1: 'Subject line',
        snippet2: '<div>Email body</div><div>Second paragraph</div>',
        snippet3: 'LinkedIn message',
        snippet4: '<div>Bump email</div>',
        snippet5: '<div>Follow-up</div>',
        snippet6: '<div>Second bump</div>',
        snippet7: '<div>Breakup email</div>',
        // Other fields should be ignored
        email: 'test@example.com',
        company: 'Test Corp'
      }

      const result = convertFromHtmlContent(htmlContent)

      expect(result.snippet1).toBe('Subject line')
      expect(result.snippet2).toBe('Email body\nSecond paragraph')
      expect(result.snippet3).toBe('LinkedIn message')
      expect(result.snippet4).toBe('Bump email')
      expect(result.snippet5).toBe('Follow-up')
      expect(result.snippet6).toBe('Second bump')
      expect(result.snippet7).toBe('Breakup email')
    })
  })

  describe('convertToHtmlContent', () => {
    it('should convert plain text content to HTML format with lead data', () => {
      const plainTextContent: PlainTextContent = {
        snippet1: 'Subject line',
        snippet2: 'Email body\nSecond paragraph',
        snippet3: 'LinkedIn message',
        snippet4: 'Bump email',
        snippet5: 'Follow-up',
        snippet6: 'Second bump',
        snippet7: 'Breakup email',
      }

      const leadData = {
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        company: 'Test Corp',
        title: 'Manager',
        linkedin_url: 'https://linkedin.com/in/john',
        tags: 'tag1,tag2',
        industry: 'Technology'
      }

      const result = convertToHtmlContent(plainTextContent, leadData)

      // Check lead data preservation
      expect(result.email).toBe('test@example.com')
      expect(result.first_name).toBe('John')
      expect(result.last_name).toBe('Doe')
      expect(result.company).toBe('Test Corp')

      // Check snippet conversion
      expect(result.snippet1).toBe('Subject line') // Plain text preserved
      expect(result.snippet2).toBe('<div>Email body</div><div>Second paragraph</div>') // HTML conversion
      expect(result.snippet3).toBe('LinkedIn message') // Plain text preserved
      expect(result.snippet4).toBe('<div>Bump email</div>') // HTML conversion
    })

    it('should handle empty lead data gracefully', () => {
      const plainTextContent: PlainTextContent = {
        snippet1: 'Subject',
        snippet2: 'Body',
        snippet3: 'LinkedIn',
        snippet4: 'Bump',
        snippet5: 'Follow-up',
        snippet6: 'Second bump',
        snippet7: 'Breakup',
      }

      const result = convertToHtmlContent(plainTextContent, {})

      expect(result.email).toBe('')
      expect(result.first_name).toBe('')
      expect(result.company).toBe('')
      expect(result.snippet1).toBe('Subject')
    })
  })

  describe('integration tests', () => {
    it('should round-trip HTML → Plain Text → HTML correctly', () => {
      const originalHtml = '<div>Hello world</div><div>Second line</div>'

      // HTML → Plain Text
      const plainText = htmlToPlainText(originalHtml)
      expect(plainText).toBe('Hello world\nSecond line')

      // Plain Text → HTML
      const convertedHtml = plainTextToHtml(plainText)
      expect(convertedHtml).toBe('<div>Hello world</div><div>Second line</div>')
    })

    it('should handle complete content workflow', () => {
      const htmlContent = {
        snippet1: 'Great subject line that meets requirements',
        snippet2: '<div>Email body</div><div>With multiple paragraphs</div>',
        snippet3: 'Short LinkedIn message',
        snippet4: '<div>Bump email content</div>',
        snippet5: '<div>Follow-up email</div>',
        snippet6: '<div>Second bump</div>',
        snippet7: '<div>Final breakup email</div>',
      }

      // Convert to plain text
      const plainText = convertFromHtmlContent(htmlContent)

      // Validate plain text
      const validation = validatePlainText(plainText)
      expect(validation.isValid).toBe(true)

      // Convert back to HTML
      const leadData = { email: 'test@test.com', first_name: 'Test' }
      const backToHtml = convertToHtmlContent(plainText, leadData)

      // Verify round-trip accuracy
      expect(backToHtml.snippet1).toBe(htmlContent.snippet1)
      expect(backToHtml.snippet2).toBe(htmlContent.snippet2)
      expect(backToHtml.snippet3).toBe(htmlContent.snippet3)
    })
  })
})