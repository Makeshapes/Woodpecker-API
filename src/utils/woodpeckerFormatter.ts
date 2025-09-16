import type { WoodpeckerProspect } from '@/services/woodpeckerService'
import type { LeadData } from '@/types/lead'
import { detectTimezone } from './timezoneDetector'

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
  const timezone =
    (generatedContent?.timezone as string) ||
    extractTimezone(lead) ||
    detectTimezone(city, state, country)

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

  // Add generated content snippets
  if (generatedContent) {
    for (let i = 1; i <= 7; i++) {
      const snippetKey = `snippet${i}` as keyof GeneratedContent
      const snippetValue = generatedContent[snippetKey]

      if (snippetValue || includeEmptySnippets) {
        prospect[snippetKey] = snippetValue || ''
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

  // Check for unclosed tags (improved validation)
  // First, remove self-closing tags and void elements that don't need closing
  const cleanedHtml = html
    .replace(
      /<(br|hr|img|input|meta|link|area|base|col|embed|source|track|wbr)(\s[^>]*)?\/?>/gi,
      ''
    )
    .replace(/<[^>]+\/>/g, '') // Remove any self-closing tags like <tag />

  // Now count opening and closing tags
  const openTags =
    cleanedHtml.match(/<([a-zA-Z][a-zA-Z0-9]*)\b[^>]*(?<!\/)>/g) || []
  const closeTags = cleanedHtml.match(/<\/([a-zA-Z][a-zA-Z0-9]*)\s*>/g) || []

  // Extract tag names for better validation
  const openTagNames: string[] = openTags
    .map((tag) => {
      const match = tag.match(/<([a-zA-Z][a-zA-Z0-9]*)/)
      return match ? match[1].toLowerCase() : ''
    })
    .filter((name) => name)

  const closeTagNames: string[] = closeTags
    .map((tag) => {
      const match = tag.match(/<\/([a-zA-Z][a-zA-Z0-9]*)/)
      return match ? match[1].toLowerCase() : ''
    })
    .filter((name) => name)

  // Check if tags are properly balanced
  const tagStack: string[] = []
  let hasError = false

  for (const tagName of openTagNames) {
    tagStack.push(tagName)
  }

  for (const tagName of closeTagNames) {
    const lastOpen = tagStack.pop()
    if (lastOpen !== tagName) {
      hasError = true
      break
    }
  }

  if (hasError || tagStack.length > 0) {
    errors.push(
      `Snippet ${snippetNumber} may have unclosed or mismatched HTML tags`
    )
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
