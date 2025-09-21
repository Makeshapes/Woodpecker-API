/**
 * Utility functions for mapping CSV fields to Woodpecker standard fields
 */

import type { LeadData } from '@/types/lead'

// Standard Woodpecker field names
export type WoodpeckerField =
  | 'first_name'
  | 'last_name'
  | 'company'
  | 'email'
  | 'title'
  | 'phone'
  | 'website'
  | 'linkedin_url'
  | 'address'
  | 'city'
  | 'state'
  | 'country'
  | 'industry'
  | 'tags'
  | 'snippet1'
  | 'snippet2'
  | 'snippet3'
  | 'snippet4'
  | 'snippet5'
  | 'snippet6'
  | 'snippet7'
  | 'snippet8'
  | 'snippet9'
  | 'snippet10'
  | 'snippet11'
  | 'snippet12'
  | 'snippet13'
  | 'snippet14'
  | 'snippet15'

// Common field name variations that map to standard Woodpecker fields
const FIELD_MAPPINGS: Record<string, WoodpeckerField> = {
  // Name variations
  'first name': 'first_name',
  firstname: 'first_name',
  fname: 'first_name',
  'given name': 'first_name',
  'last name': 'last_name',
  lastname: 'last_name',
  lname: 'last_name',
  surname: 'last_name',
  'family name': 'last_name',
  'contact name': 'first_name', // Will be parsed
  contact: 'first_name', // Will be parsed
  'full name': 'first_name', // Will be parsed
  name: 'first_name', // Will be parsed

  // Company variations
  company: 'company',
  organization: 'company',
  org: 'company',
  business: 'company',
  'company name': 'company',

  // Email variations
  email: 'email',
  'email address': 'email',
  'e-mail': 'email',
  mail: 'email',

  // Title variations
  title: 'title',
  'job title': 'title',
  position: 'title',
  role: 'title',
  job: 'title',

  // Phone variations
  phone: 'phone',
  'phone number': 'phone',
  telephone: 'phone',
  tel: 'phone',
  mobile: 'phone',
  cell: 'phone',

  // Website variations
  website: 'website',
  web: 'website',
  site: 'website',
  url: 'website',
  www: 'website',
  homepage: 'website',
  'company website': 'website',

  // LinkedIn variations
  linkedin: 'linkedin_url',
  'linkedin url': 'linkedin_url',
  'linkedin profile': 'linkedin_url',
  linkedinurl: 'linkedin_url',
  linkedin_url: 'linkedin_url',

  // Location variations
  address: 'address',
  street: 'address',
  'street address': 'address',
  city: 'city',
  town: 'city',
  state: 'state',
  province: 'state',
  region: 'state',
  country: 'country',
  nation: 'country',

  // Industry variations
  industry: 'industry',
  sector: 'industry',
  vertical: 'industry',
  field: 'industry',

  // Tags variations
  tags: 'tags',
  tag: 'tags',
  labels: 'tags',
  categories: 'tags',

  // Snippet variations
  snippet1: 'snippet1',
  'snippet 1': 'snippet1',
  custom1: 'snippet1',
  'custom 1': 'snippet1',
  snippet2: 'snippet2',
  'snippet 2': 'snippet2',
  custom2: 'snippet2',
  'custom 2': 'snippet2',
  snippet3: 'snippet3',
  'snippet 3': 'snippet3',
  custom3: 'snippet3',
  'custom 3': 'snippet3',
  snippet4: 'snippet4',
  'snippet 4': 'snippet4',
  custom4: 'snippet4',
  'custom 4': 'snippet4',
  snippet5: 'snippet5',
  'snippet 5': 'snippet5',
  custom5: 'snippet5',
  'custom 5': 'snippet5',
  snippet6: 'snippet6',
  'snippet 6': 'snippet6',
  custom6: 'snippet6',
  'custom 6': 'snippet6',
  snippet7: 'snippet7',
  'snippet 7': 'snippet7',
  custom7: 'snippet7',
  'custom 7': 'snippet7',
  snippet8: 'snippet8',
  'snippet 8': 'snippet8',
  custom8: 'snippet8',
  'custom 8': 'snippet8',
  snippet9: 'snippet9',
  'snippet 9': 'snippet9',
  custom9: 'snippet9',
  'custom 9': 'snippet9',
  snippet10: 'snippet10',
  'snippet 10': 'snippet10',
  custom10: 'snippet10',
  'custom 10': 'snippet10',
  snippet11: 'snippet11',
  'snippet 11': 'snippet11',
  custom11: 'snippet11',
  'custom 11': 'snippet11',
  snippet12: 'snippet12',
  'snippet 12': 'snippet12',
  custom12: 'snippet12',
  'custom 12': 'snippet12',
  snippet13: 'snippet13',
  'snippet 13': 'snippet13',
  custom13: 'snippet13',
  'custom 13': 'snippet13',
  snippet14: 'snippet14',
  'snippet 14': 'snippet14',
  custom14: 'snippet14',
  'custom 14': 'snippet14',
  snippet15: 'snippet15',
  'snippet 15': 'snippet15',
  custom15: 'snippet15',
  'custom 15': 'snippet15',
}

// Fields that contain full names to be parsed
const NAME_FIELDS = ['contact name', 'contact', 'full name', 'name']

/**
 * Parse a full name into first and last name
 */
export function parseFullName(fullName: string): {
  firstName: string
  lastName: string
} {
  if (!fullName) {
    return { firstName: '', lastName: '' }
  }

  const trimmed = fullName.trim()
  const parts = trimmed.split(/\s+/)

  if (parts.length === 1) {
    // Only one name, treat as first name
    return { firstName: parts[0], lastName: '' }
  } else if (parts.length === 2) {
    // Two parts: first and last
    return { firstName: parts[0], lastName: parts[1] }
  } else {
    // More than two parts: first name is first part, everything else is last name
    return { firstName: parts[0], lastName: parts.slice(1).join(' ') }
  }
}

/**
 * Map a CSV header to its corresponding Woodpecker field
 */
export function mapFieldName(csvHeader: string): WoodpeckerField | null {
  const normalized = csvHeader.toLowerCase().trim()
  return FIELD_MAPPINGS[normalized] || null
}

/**
 * Check if a field name is a full name field that needs parsing
 */
export function isNameField(fieldName: string): boolean {
  const normalized = fieldName.toLowerCase().trim()
  return NAME_FIELDS.includes(normalized)
}

/**
 * Map CSV row data to Lead format
 */
export function mapCsvRowToLead(
  rowData: Record<string, string>,
  columnMapping?: Record<string, string>
): LeadData {
  const lead: LeadData = {
    id: '',
    status: 'imported',
  }

  const additionalFields: Record<string, string> = {}
  let hasNameField = false

  // Process each field in the row
  for (const [csvField, value] of Object.entries(rowData)) {
    if (!value || value === '') continue

    // Check if there's a manual mapping
    const mappedField = columnMapping?.[csvField]

    if (mappedField && mappedField in lead) {
      // Use manual mapping
      ;(lead as LeadData & Record<string, string | boolean | undefined>)[
        mappedField
      ] = value
    } else {
      // Try automatic mapping
      const autoMappedField = mapFieldName(csvField)

      if (autoMappedField) {
        // Check if this is a name field that needs parsing
        if (isNameField(csvField) && !hasNameField) {
          const { firstName, lastName } = parseFullName(value)
          lead.first_name = firstName
          lead.last_name = lastName
          hasNameField = true
        } else if (autoMappedField === 'first_name' && hasNameField) {
          // If we already parsed a name field, don't override with individual name fields
          continue
        } else if (autoMappedField === 'last_name' && hasNameField) {
          // If we already parsed a name field, don't override with individual name fields
          continue
        } else {
          ;(lead as LeadData & Record<string, string | boolean | undefined>)[
            autoMappedField
          ] = value
        }
      } else {
        // No mapping found, store in additional fields
        additionalFields[csvField] = value
      }
    }
  }

  // If we have additional fields, store them as JSON
  if (Object.keys(additionalFields).length > 0) {
    lead.additional_fields = JSON.stringify(additionalFields)
  }

  return lead
}

/**
 * Get list of standard Woodpecker fields
 */
export function getStandardFields(): WoodpeckerField[] {
  return [
    'first_name',
    'last_name',
    'company',
    'email',
    'title',
    'phone',
    'website',
    'linkedin_url',
    'address',
    'city',
    'state',
    'country',
    'industry',
    'tags',
    'snippet1',
    'snippet2',
    'snippet3',
    'snippet4',
    'snippet5',
    'snippet6',
    'snippet7',
    'snippet8',
    'snippet9',
    'snippet10',
    'snippet11',
    'snippet12',
    'snippet13',
    'snippet14',
    'snippet15',
  ]
}

/**
 * Validate if a field is a standard Woodpecker field
 */
export function isStandardField(fieldName: string): boolean {
  const standardFields = getStandardFields()
  return standardFields.includes(fieldName as WoodpeckerField)
}
