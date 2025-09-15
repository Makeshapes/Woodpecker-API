/**
 * Content conversion utilities for plain text ↔ HTML transformation
 * Used in enhanced content editing workflow (Story 1.5)
 */

import { detectTimezone } from './timezoneDetector';

export interface PlainTextContent {
  snippet1: string // Subject line (plain text, no line breaks)
  snippet2: string // Day 1 Email body (plain text with line breaks)
  snippet3: string // LinkedIn message (plain text, no line breaks)
  snippet4: string // Day 7 Bump email (plain text with line breaks)
  snippet5: string // Day 12 Email (plain text with line breaks)
  snippet6: string // Day 17 Bump email (plain text with line breaks)
  snippet7: string // Day 25 Breakup email (plain text with line breaks)
}

export interface LightValidationResult {
  isValid: boolean
  errors: {
    field: string
    message: string
    currentLength?: number
    maxLength?: number
    minLength?: number
  }[]
}

/**
 * Convert HTML content to plain text for editing
 * Preserves line breaks and removes HTML tags
 */
export function htmlToPlainText(html: string): string {
  if (!html) return ''

  let result = html
    // Convert <div> tags to line breaks (preserve empty divs)
    .replace(/<div>\s*<\/div>/gi, '\n') // Empty divs become newlines
    .replace(/<div>/gi, '\n')
    .replace(/<\/div>/gi, '')
    // Convert <br> tags to line breaks
    .replace(/<br\s*\/?>/gi, '\n')
    // Convert <p> tags to double line breaks for paragraph separation
    .replace(/<p>/gi, '\n\n')
    .replace(/<\/p>/gi, '')
    // Remove any remaining HTML tags
    .replace(/<[^>]*>/g, '')

  // Handle leading newline from first div conversion
  if (result.startsWith('\n')) {
    result = result.substring(1)
  }

  // Clean up excessive whitespace but preserve intentional double line breaks
  result = result
    .replace(/\n\s*\n\s*\n+/g, '\n\n') // Convert 3+ newlines to double
    .replace(/[ \t]+/g, ' ') // Collapse spaces/tabs

  return result.trim()
}

/**
 * Convert plain text to HTML for validation and export
 * Converts line breaks to <div> tags as required by validation
 */
export function plainTextToHtml(text: string): string {
  if (!text) return ''

  // Split text into lines and wrap each in <div> tags
  const lines = text.split('\n')
  const htmlLines = lines.map((line) => {
    // If line is empty, create empty div
    if (line.trim() === '') {
      return '<div><br></div>'
    }
    // Wrap non-empty lines in div tags
    return `<div>${line.trim()}</div>`
  })

  return htmlLines.join('')
}

/**
 * Light validation for plain text content
 * Validates character counts and required fields
 */
export function validatePlainText(
  content: PlainTextContent
): LightValidationResult {
  const errors: LightValidationResult['errors'] = []

  // Validate snippet1 (subject line): 36-50 characters
  if (!content.snippet1 || content.snippet1.trim() === '') {
    errors.push({
      field: 'snippet1',
      message: 'Subject line is required',
    })
  } else if (content.snippet1.length < 36) {
    errors.push({
      field: 'snippet1',
      message: 'Subject line must be at least 36 characters',
      currentLength: content.snippet1.length,
      minLength: 36,
    })
  } else if (content.snippet1.length > 50) {
    errors.push({
      field: 'snippet1',
      message: 'Subject line must be no more than 50 characters',
      currentLength: content.snippet1.length,
      maxLength: 50,
    })
  }

  // Check for line breaks in subject line
  if (content.snippet1 && content.snippet1.includes('\n')) {
    errors.push({
      field: 'snippet1',
      message: 'Subject line cannot contain line breaks',
    })
  }

  // Validate snippet3 (LinkedIn message): ≤300 characters
  if (!content.snippet3 || content.snippet3.trim() === '') {
    errors.push({
      field: 'snippet3',
      message: 'LinkedIn message is required',
    })
  } else if (content.snippet3.length > 300) {
    errors.push({
      field: 'snippet3',
      message: 'LinkedIn message must be no more than 300 characters',
      currentLength: content.snippet3.length,
      maxLength: 300,
    })
  }

  // Check for line breaks in LinkedIn message
  if (content.snippet3 && content.snippet3.includes('\n')) {
    errors.push({
      field: 'snippet3',
      message: 'LinkedIn message cannot contain line breaks',
    })
  }

  // Validate required email content fields
  const emailFields = [
    'snippet2',
    'snippet4',
    'snippet5',
    'snippet6',
    'snippet7',
  ]
  emailFields.forEach((field) => {
    if (
      !content[field as keyof PlainTextContent] ||
      content[field as keyof PlainTextContent].trim() === ''
    ) {
      errors.push({
        field,
        message: `${field} is required`,
      })
    }
  })

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Convert content from HTML format (ClaudeResponse) to plain text format
 */
export function convertFromHtmlContent(content: any): PlainTextContent {
  return {
    snippet1: htmlToPlainText(content.snippet1 || ''),
    snippet2: htmlToPlainText(content.snippet2 || ''),
    snippet3: htmlToPlainText(content.snippet3 || ''),
    snippet4: htmlToPlainText(content.snippet4 || ''),
    snippet5: htmlToPlainText(content.snippet5 || ''),
    snippet6: htmlToPlainText(content.snippet6 || ''),
    snippet7: htmlToPlainText(content.snippet7 || ''),
  }
}

/**
 * Convert plain text content back to HTML format for validation/export
 */
export function convertToHtmlContent(
  plainText: PlainTextContent,
  leadData: any
): any {
  // Detect timezone if not already present
  const timezone = leadData.timezone || detectTimezone(
    leadData.city,
    leadData.state,
    leadData.country
  );

  console.log('🌍 [ContentConverter] Adding timezone to converted content:', {
    originalTimezone: leadData.timezone,
    detectedTimezone: timezone,
    location: { city: leadData.city, state: leadData.state, country: leadData.country }
  });

  return {
    // Preserve lead data
    email: leadData.email || '',
    first_name: leadData.first_name || '',
    last_name: leadData.last_name || '',
    company: leadData.company || '',
    title: leadData.title || '',
    linkedin_url: leadData.linkedin_url || '',
    city: leadData.city || '',
    state: leadData.state || '',
    country: leadData.country || '',
    timezone: timezone,
    tags: leadData.tags || '',
    industry: leadData.industry || '',

    // Convert plain text snippets to HTML
    snippet1: plainText.snippet1, // Subject line stays plain text
    snippet2: plainTextToHtml(plainText.snippet2),
    snippet3: plainText.snippet3, // LinkedIn message stays plain text
    snippet4: plainTextToHtml(plainText.snippet4),
    snippet5: plainTextToHtml(plainText.snippet5),
    snippet6: plainTextToHtml(plainText.snippet6),
    snippet7: plainTextToHtml(plainText.snippet7),
  }
}
