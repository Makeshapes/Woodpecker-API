import type { WoodpeckerProspect } from '@/services/woodpeckerService'
import type { LeadData } from '@/types/lead'
import { detectTimezone } from './timezoneDetector'

/**
 * Convert timezone name to UTC offset string
 */
function getUtcOffset(timezone: string): string {
  try {
    const now = new Date()
    const utc = new Date(now.getTime() + (now.getTimezoneOffset() * 60000))
    const targetTime = new Date(utc.toLocaleString('en-US', { timeZone: timezone }))
    const offsetMinutes = (targetTime.getTime() - utc.getTime()) / (1000 * 60)
    const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60)
    const offsetMins = Math.abs(offsetMinutes) % 60
    const sign = offsetMinutes >= 0 ? '+' : '-'
    return `${sign}${offsetHours.toString().padStart(2, '0')}:${offsetMins.toString().padStart(2, '0')}`
  } catch {
    return '+00:00' // Fallback to UTC
  }
}

export interface GeneratedContent {
  snippet1?: string
  snippet2?: string
  snippet3?: string
  snippet4?: string
  snippet5?: string
  snippet6?: string
  snippet7?: string
  [key: string]: string | undefined
}

export interface FormatProspectOptions {
  includeEmptySnippets?: boolean
  customFieldMapping?: Record<string, string>
}

export function formatProspectForWoodpecker(
  lead: LeadData,
  generatedContent?: GeneratedContent,
  options: FormatProspectOptions = {}
): WoodpeckerProspect {
  const { includeEmptySnippets = false, customFieldMapping = {} } = options

  console.log('🔧 WoodpeckerFormatter: Formatting prospect', {
    leadKeys: Object.keys(lead),
    leadData: lead,
    generatedContentKeys: generatedContent
      ? Object.keys(generatedContent)
      : null,
    hasGeneratedContent: !!generatedContent,
  })

  // Extract basic prospect information from lead data
  const prospect: WoodpeckerProspect = {
    email: extractEmail(lead),
  }

  // Map standard lead fields to Woodpecker prospect fields
  // Try generated content first, then fall back to lead data
  const firstName =
    (generatedContent?.first_name as string) || extractFirstName(lead)
  const lastName =
    (generatedContent?.last_name as string) || extractLastName(lead)
  const company = (generatedContent?.company as string) || extractCompany(lead)
  const title = (generatedContent?.title as string) || extractTitle(lead)
  const linkedinUrl =
    (generatedContent?.linkedin_url as string) || extractLinkedInUrl(lead)
  const website = (generatedContent?.website as string) || extractWebsite(lead)
  const industry = (generatedContent?.industry as string) || extractIndustry(lead)
  const city = (generatedContent?.city as string) || extractCity(lead)
  const state = (generatedContent?.state as string) || extractState(lead)
  const country = (generatedContent?.country as string) || extractCountry(lead)

  // Detect timezone - try generated content first, then detect from location data
  const generatedTimezone = generatedContent?.timezone as string
  const extractedTimezone = extractTimezone(lead)
  const detectedTimezone = detectTimezone(city, state, country)

  console.log('🌍 WoodpeckerFormatter: Timezone detection:', {
    generatedTimezone,
    extractedTimezone,
    detectedTimezone,
    city,
    state,
    country
  })

  // Use location-based detection if generated content returns "UTC" (fallback)
  const timezone = (generatedTimezone && generatedTimezone !== 'UTC') ?
    generatedTimezone :
    (extractedTimezone || detectedTimezone)

  if (firstName) prospect.first_name = firstName
  if (lastName) prospect.last_name = lastName
  if (company) prospect.company = company
  if (title) prospect.title = title
  if (linkedinUrl) prospect.linkedin_url = linkedinUrl
  if (website) prospect.website = website
  if (industry) prospect.industry = industry
  if (city) prospect.city = city
  if (state) prospect.state = state
  if (country) prospect.country = country
  if (timezone) {
    prospect.time_zone = timezone // Woodpecker expects time_zone field
    prospect.timezone = timezone // Also try timezone field (undocumented but might work)
    prospect.tz = timezone // Short timezone field (common in APIs)
    prospect.timeZone = timezone // CamelCase variant
    prospect.prospect_timezone = timezone // Following their campaign naming pattern
    prospect.utc_offset = getUtcOffset(timezone) // UTC offset format like "-05:00"

    // Also try storing in snippet fields as backup (if not already used)
    if (!prospect.snippet7) {
      prospect.snippet7 = `timezone:${timezone}` // Structured format in snippet
    }
  }

  console.log('🎯 WoodpeckerFormatter: Extracted fields', {
    firstName: firstName,
    lastName: lastName,
    company: company,
    title: title,
    linkedinUrl: linkedinUrl,
    website: website,
    industry: industry,
    city: city,
    state: state,
    country: country,
    time_zone: timezone,
    fromGeneratedContent: {
      first_name: generatedContent?.first_name,
      last_name: generatedContent?.last_name,
      company: generatedContent?.company,
      title: generatedContent?.title,
      linkedin_url: generatedContent?.linkedin_url,
      website: generatedContent?.website,
      industry: generatedContent?.industry,
      city: generatedContent?.city,
      state: generatedContent?.state,
      country: generatedContent?.country,
      time_zone: generatedContent?.timezone,
    },
  })

  // Add generated content snippets with HTML validation fixes
  if (generatedContent) {
    for (let i = 1; i <= 7; i++) {
      const snippetKey = `snippet${i}` as keyof GeneratedContent
      const snippetValue = generatedContent[snippetKey]

      if (snippetValue || includeEmptySnippets) {
        // Fix HTML validation issues before setting the snippet
        const fixedSnippet = typeof snippetValue === 'string' ? fixHtmlValidationIssues(snippetValue) : (snippetValue || '')
        prospect[snippetKey] = fixedSnippet
      }
    }
  }

  // Apply custom field mappings
  Object.entries(customFieldMapping).forEach(([leadField, woodpeckerField]) => {
    const value = lead[leadField]
    if (typeof value === 'string' && value.trim()) {
      prospect[woodpeckerField] = value.trim()
    }
  })

  return prospect
}

export function formatMultipleProspects(
  leads: LeadData[],
  getGeneratedContent: (leadId: string) => GeneratedContent | undefined,
  options: FormatProspectOptions = {}
): WoodpeckerProspect[] {
  return leads.map((lead) => {
    const generatedContent = getGeneratedContent(lead.id)
    return formatProspectForWoodpecker(lead, generatedContent, options)
  })
}

export function validateWoodpeckerProspect(prospect: WoodpeckerProspect): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // Email is required
  if (!prospect.email || !prospect.email.trim()) {
    errors.push('Email is required')
  } else if (!isValidEmail(prospect.email)) {
    errors.push('Email format is invalid')
  }

  // Check snippet content for HTML validity if present
  for (let i = 1; i <= 7; i++) {
    const snippetKey = `snippet${i}` as keyof WoodpeckerProspect
    const snippet = prospect[snippetKey]
    if (snippet && typeof snippet === 'string') {
      const htmlErrors = validateSnippetHtml(snippet, i)
      errors.push(...htmlErrors)
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

// Helper functions for extracting data from leads
function extractEmail(lead: LeadData): string {
  // Common email field names
  const emailFields = [
    'email',
    'Email',
    'EMAIL',
    'emailAddress',
    'email_address',
  ]

  for (const field of emailFields) {
    const value = lead[field]
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }

  return lead.id || '' // Fallback to ID if no email found
}

function extractFirstName(lead: LeadData): string | undefined {
  const firstNameFields = [
    'first_name',
    'firstName',
    'FirstName',
    'FIRST_NAME',
    'contactName',
    'contact_name',
    'name',
    'Name',
  ]

  for (const field of firstNameFields) {
    const value = lead[field]
    if (typeof value === 'string' && value.trim()) {
      // If it's a full name, try to extract first name
      const nameParts = value.trim().split(/\s+/)
      return nameParts[0]
    }
  }

  return undefined
}

function extractLastName(lead: LeadData): string | undefined {
  const lastNameFields = [
    'last_name',
    'lastName',
    'LastName',
    'LAST_NAME',
    'surname',
    'Surname',
  ]

  for (const field of lastNameFields) {
    const value = lead[field]
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }

  // Try to extract from full name field
  const fullNameFields = ['contactName', 'contact_name', 'name', 'Name']
  for (const field of fullNameFields) {
    const value = lead[field]
    if (typeof value === 'string' && value.trim()) {
      const nameParts = value.trim().split(/\s+/)
      if (nameParts.length > 1) {
        return nameParts.slice(1).join(' ')
      }
    }
  }

  return undefined
}

function extractCompany(lead: LeadData): string | undefined {
  const companyFields = [
    'company',
    'Company',
    'COMPANY',
    'companyName',
    'company_name',
    'CompanyName',
    'organization',
    'Organization',
  ]

  for (const field of companyFields) {
    const value = lead[field]
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }

  return undefined
}

function extractTitle(lead: LeadData): string | undefined {
  const titleFields = [
    'title',
    'Title',
    'TITLE',
    'jobTitle',
    'job_title',
    'JobTitle',
    'position',
    'Position',
  ]

  for (const field of titleFields) {
    const value = lead[field]
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }

  return undefined
}

function extractLinkedInUrl(lead: LeadData): string | undefined {
  const linkedinFields = [
    'linkedInUrl',
    'linkedin_url',
    'LinkedInUrl',
    'LINKEDIN_URL',
    'linkedin',
    'LinkedIn',
    'linkedIn',
    'profile_url',
  ]

  for (const field of linkedinFields) {
    const value = lead[field]
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }

  return undefined
}

function extractCity(lead: LeadData): string | undefined {
  const cityFields = [
    'city',
    'City',
    'CITY',
    'location_city',
    'locationCity',
    'Location City',
  ]

  for (const field of cityFields) {
    const value = lead[field]
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }

  return undefined
}

function extractState(lead: LeadData): string | undefined {
  const stateFields = [
    'state',
    'State',
    'STATE',
    'province',
    'Province',
    'PROVINCE',
    'location_state',
    'locationState',
    'Location State',
  ]

  for (const field of stateFields) {
    const value = lead[field]
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }

  return undefined
}

function extractCountry(lead: LeadData): string | undefined {
  const countryFields = [
    'country',
    'Country',
    'COUNTRY',
    'location_country',
    'locationCountry',
    'Location Country',
  ]

  for (const field of countryFields) {
    const value = lead[field]
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }

  return undefined
}

function extractTimezone(lead: LeadData): string | undefined {
  const timezoneFields = [
    'timezone',
    'timeZone',
    'time_zone',
    'Timezone',
    'TimeZone',
    'TIME_ZONE',
    'tz',
    'TZ',
  ]

  for (const field of timezoneFields) {
    const value = lead[field]
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }

  return undefined
}

function extractWebsite(lead: LeadData): string | undefined {
  const websiteFields = [
    'website',
    'Website',
    'WEBSITE',
    'company_website',
    'companyWebsite',
    'Company Website',
    'url',
    'URL',
    'web_url',
    'webUrl',
  ]

  for (const field of websiteFields) {
    const value = lead[field]
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }

  return undefined
}

function extractIndustry(lead: LeadData): string | undefined {
  const industryFields = [
    'industry',
    'Industry',
    'INDUSTRY',
    'sector',
    'Sector',
    'SECTOR',
    'vertical',
    'Vertical',
    'VERTICAL',
    'business_type',
    'businessType',
    'Business Type',
  ]

  for (const field of industryFields) {
    const value = lead[field]
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }

  return undefined
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function fixHtmlValidationIssues(html: string): string {
  if (!html || typeof html !== 'string') {
    return html
  }

  // Remove script and style tags entirely for security
  let fixedHtml = html
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<style[^>]*>.*?<\/style>/gi, '')

  // Find all void elements that don't need closing tags
  const voidElements = ['br', 'hr', 'img', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'source', 'track', 'wbr']

  // Normalize void elements to self-closing format
  voidElements.forEach(tag => {
    const regex = new RegExp(`<${tag}([^>]*?)(?<!/)>`, 'gi')
    fixedHtml = fixedHtml.replace(regex, `<${tag}$1 />`)
  })

  // Parse and fix nested tag structure properly
  const tokens = fixedHtml.match(/<\/?[a-zA-Z][a-zA-Z0-9]*[^>]*>/g) || []
  const tagStack: Array<{name: string, position: number}> = []
  const closingTags: Array<{name: string, position: number}> = []

  // First pass: identify all opening and closing tags with their positions
  let position = 0
  tokens.forEach(token => {
    const tokenPos = fixedHtml.indexOf(token, position)
    const isClosingTag = token.startsWith('</')
    const isSelfClosing = token.endsWith('/>')
    const tagMatch = token.match(/<\/?([a-zA-Z][a-zA-Z0-9]*)/)

    if (tagMatch) {
      const tagName = tagMatch[1].toLowerCase()

      if (isSelfClosing || voidElements.includes(tagName)) {
        // Self-closing or void elements don't need tracking
        position = tokenPos + token.length
        return
      }

      if (isClosingTag) {
        closingTags.push({ name: tagName, position: tokenPos })
      } else {
        tagStack.push({ name: tagName, position: tokenPos })
      }
    }
    position = tokenPos + token.length
  })

  // Second pass: match opening and closing tags, and identify unclosed ones
  const matched = new Set<number>()
  const unclosedTags: Array<{name: string, position: number}> = []

  // For each opening tag, find its matching closing tag
  tagStack.forEach(openTag => {
    // Find the first unmatched closing tag of the same type that comes after this opening tag
    const matchingClose = closingTags.find((closeTag, index) =>
      closeTag.name === openTag.name &&
      closeTag.position > openTag.position &&
      !matched.has(index)
    )

    if (matchingClose) {
      const closeIndex = closingTags.indexOf(matchingClose)
      matched.add(closeIndex)
    } else {
      // No matching closing tag found
      unclosedTags.push(openTag)
    }
  })

  // Add closing tags for unclosed tags at the end
  unclosedTags.reverse().forEach(unclosedTag => {
    fixedHtml += `</${unclosedTag.name}>`
  })

  return fixedHtml
}

function validateSnippetHtml(html: string, snippetNumber: number): string[] {
  const errors: string[] = []

  // Check for basic HTML structure issues
  if (html.includes('<script')) {
    errors.push(`Snippet ${snippetNumber} contains script tags (not allowed)`)
  }

  if (html.includes('<style')) {
    errors.push(
      `Snippet ${snippetNumber} contains style tags (not recommended)`
    )
  }

  // Try to fix HTML and validate the fixed version
  const fixedHtml = fixHtmlValidationIssues(html)

  // If the fixed HTML is different from original, there were issues
  if (fixedHtml !== html) {
    // Check if the fixed version would pass validation
    const voidElements = ['br', 'hr', 'img', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'source', 'track', 'wbr']

    // Remove self-closing tags and void elements for validation
    const cleanedHtml = fixedHtml
      .replace(
        /<(br|hr|img|input|meta|link|area|base|col|embed|source|track|wbr)(\s[^>]*)?\/?>/gi,
        ''
      )
      .replace(/<[^>]+\/>/g, '')

    // Parse tags properly with a stack-based approach
    const tokens = cleanedHtml.match(/<\/?[a-zA-Z][a-zA-Z0-9]*[^>]*>/g) || []
    const tagStack: string[] = []
    let hasError = false

    for (const token of tokens) {
      const isClosingTag = token.startsWith('</')
      const tagMatch = token.match(/<\/?([a-zA-Z][a-zA-Z0-9]*)/)

      if (tagMatch) {
        const tagName = tagMatch[1].toLowerCase()

        if (isClosingTag) {
          const lastOpen = tagStack.pop()
          if (lastOpen !== tagName) {
            hasError = true
            break
          }
        } else {
          tagStack.push(tagName)
        }
      }
    }

    if (hasError || tagStack.length > 0) {
      errors.push(
        `Snippet ${snippetNumber} may have unclosed or mismatched HTML tags`
      )
    }
  }

  return errors
}

export function createWoodpeckerExportSummary(
  prospects: WoodpeckerProspect[],
  validationResults: ReturnType<typeof validateWoodpeckerProspect>[]
): {
  totalProspects: number
  validProspects: number
  invalidProspects: number
  snippetStats: Record<string, number>
  commonErrors: Array<{ error: string; count: number }>
} {
  const validProspects = validationResults.filter((r) => r.isValid).length
  const invalidProspects = validationResults.filter((r) => !r.isValid).length

  // Count snippets
  const snippetStats: Record<string, number> = {}
  for (let i = 1; i <= 7; i++) {
    const snippetKey = `snippet${i}`
    const count = prospects.filter((p) => {
      const snippet = p[snippetKey as keyof WoodpeckerProspect]
      return snippet && typeof snippet === 'string' && snippet.trim().length > 0
    }).length
    snippetStats[snippetKey] = count
  }

  // Count common errors
  const errorCounts: Record<string, number> = {}
  validationResults.forEach((result) => {
    result.errors.forEach((error) => {
      errorCounts[error] = (errorCounts[error] || 0) + 1
    })
  })

  const commonErrors = Object.entries(errorCounts)
    .map(([error, count]) => ({ error, count }))
    .sort((a, b) => b.count - a.count)

  return {
    totalProspects: prospects.length,
    validProspects,
    invalidProspects,
    snippetStats,
    commonErrors,
  }
}
