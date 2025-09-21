/**
 * Unified HTML converter utility - single source of truth for text/HTML conversions
 * Replaces the 5 duplicate conversion functions scattered across the codebase
 */

export interface ConversionOptions {
  preserveExistingHtml?: boolean
  normalizeSpacing?: boolean
}

/**
 * Converts plain text to HTML with proper paragraph and list formatting
 * @param text - Plain text input
 * @param options - Conversion options
 * @returns Clean HTML string
 */
export function textToHtml(text: string, options: ConversionOptions = {}): string {
  if (!text) return ''

  const { preserveExistingHtml = true, normalizeSpacing = true } = options

  // If content already contains HTML tags, return as-is (unless explicitly disabled)
  if (preserveExistingHtml && containsHtml(text)) {
    return text
  }

  let normalizedText = text

  if (normalizeSpacing) {
    // Normalize bullet points that are separated by double newlines
    // Convert patterns like "• Item1\n\n• Item2\n\n• Item3" into "• Item1\n• Item2\n• Item3"
    let prevLength
    do {
      prevLength = normalizedText.length
      normalizedText = normalizedText.replace(/(\n\s*[•\-*]\s+[^\n]*)\n\n(\s*[•\-*]\s+)/g, '$1\n$2')
    } while (normalizedText.length !== prevLength)
  }

  // Split text into paragraphs (double line breaks)
  const paragraphs = normalizedText.split('\n\n')
  const htmlParts: string[] = []

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim()
    if (!trimmed) continue

    // Check if this paragraph contains bullet points
    const lines = trimmed.split('\n')
    const bulletLines = lines.filter(line => /^(\s*[•\-*]\s+)/.test(line))

    if (bulletLines.length > 0 && bulletLines.length === lines.length) {
      // This is a bullet list - combine all list items into one block
      const listItems = []
      for (const line of lines) {
        const bulletMatch = line.match(/^(\s*[•\-*]\s+)(.*)/)
        if (bulletMatch) {
          listItems.push(`<li>${bulletMatch[2]}</li>`)
        }
      }
      htmlParts.push(`<ul>${listItems.join('')}</ul>`)
    } else {
      // Regular paragraph - handle single line breaks within it
      const withLineBreaks = trimmed.replace(/\n/g, '<br />')
      htmlParts.push(`<div>${withLineBreaks}</div>`)
    }
  }

  // Join paragraphs with proper spacing
  return htmlParts.join('<div><br /></div>')
}

/**
 * Ensures content is in HTML format, converting if necessary
 * @param content - Content that may be plain text or HTML
 * @param options - Conversion options
 * @returns HTML string
 */
export function ensureHtml(content: string, options: ConversionOptions = {}): string {
  if (!content) return ''

  // If already HTML, return as-is
  if (containsHtml(content)) {
    return content
  }

  // Convert plain text to HTML
  return textToHtml(content, options)
}

/**
 * Converts HTML back to plain text for editing
 * @param html - HTML string
 * @returns Plain text string
 */
export function htmlToText(html: string): string {
  if (!html) return ''

  // If it doesn't contain HTML tags, return as-is
  if (!containsHtml(html)) {
    return html
  }

  let text = html

  // Convert list items back to bullet points
  text = text.replace(/<ul[^>]*>(.*?)<\/ul>/gs, (match, content) => {
    const listItems = content.match(/<li[^>]*>(.*?)<\/li>/gs) || []
    return listItems
      .map(item => {
        const itemContent = item.replace(/<li[^>]*>(.*?)<\/li>/s, '$1').trim()
        return `• ${itemContent}`
      })
      .join('\n')
  })

  // Convert div spacing to double newlines
  text = text.replace(/<div><br\s*\/?><\/div>/g, '\n\n')

  // Convert line breaks
  text = text.replace(/<br\s*\/?>/g, '\n')

  // Remove remaining HTML tags
  text = text.replace(/<[^>]*>/g, '')

  // Clean up extra whitespace
  text = text.replace(/\n{3,}/g, '\n\n').trim()

  return text
}

/**
 * Checks if text contains HTML tags
 * @param text - Text to check
 * @returns True if contains HTML tags
 */
export function containsHtml(text: string): boolean {
  if (!text) return false

  // Look for common HTML tags that indicate structured content
  const htmlTagPattern = /<(div|p|ul|ol|li|br|span|strong|em|b|i|h[1-6])[^>]*>/i
  return htmlTagPattern.test(text)
}

/**
 * Validates that HTML content is properly formatted
 * @param html - HTML string to validate
 * @returns True if HTML appears valid
 */
export function isValidHtml(html: string): boolean {
  if (!html) return true

  try {
    // Basic validation - check for unclosed tags
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    return !doc.querySelector('parsererror')
  } catch {
    return false
  }
}

/**
 * Legacy compatibility - maps to textToHtml for backward compatibility
 * @deprecated Use textToHtml instead
 */
export const convertTextToHtml = textToHtml

/**
 * Legacy compatibility - maps to htmlToText for backward compatibility
 * @deprecated Use htmlToText instead
 */
export const convertHtmlToText = htmlToText