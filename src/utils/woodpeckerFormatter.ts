import type { WoodpeckerProspect } from '@/services/woodpeckerService';
import type { LeadData } from '@/types/lead';

interface GeneratedContent {
  snippet1?: string;
  snippet2?: string;
  snippet3?: string;
  snippet4?: string;
  snippet5?: string;
  snippet6?: string;
  snippet7?: string;
  [key: string]: string | undefined;
}

export interface FormatProspectOptions {
  includeEmptySnippets?: boolean;
  customFieldMapping?: Record<string, string>;
}

export function formatProspectForWoodpecker(
  lead: LeadData,
  generatedContent?: GeneratedContent,
  options: FormatProspectOptions = {}
): WoodpeckerProspect {
  const {
    includeEmptySnippets = false,
    customFieldMapping = {},
  } = options;

  // Extract basic prospect information from lead data
  const prospect: WoodpeckerProspect = {
    email: extractEmail(lead),
  };

  // Map standard lead fields to Woodpecker prospect fields
  const firstName = extractFirstName(lead);
  const lastName = extractLastName(lead);

  if (firstName) prospect.first_name = firstName;
  if (lastName) prospect.last_name = lastName;

  const company = extractCompany(lead);
  if (company) prospect.company = company;

  const title = extractTitle(lead);
  if (title) prospect.title = title;

  const linkedinUrl = extractLinkedInUrl(lead);
  if (linkedinUrl) prospect.linkedin_url = linkedinUrl;

  // Add generated content snippets
  if (generatedContent) {
    for (let i = 1; i <= 7; i++) {
      const snippetKey = `snippet${i}` as keyof GeneratedContent;
      const snippetValue = generatedContent[snippetKey];

      if (snippetValue || includeEmptySnippets) {
        prospect[snippetKey] = snippetValue || '';
      }
    }
  }

  // Apply custom field mappings
  Object.entries(customFieldMapping).forEach(([leadField, woodpeckerField]) => {
    const value = lead[leadField];
    if (typeof value === 'string' && value.trim()) {
      prospect[woodpeckerField] = value.trim();
    }
  });

  return prospect;
}

export function formatMultipleProspects(
  leads: LeadData[],
  getGeneratedContent: (leadId: string) => GeneratedContent | undefined,
  options: FormatProspectOptions = {}
): WoodpeckerProspect[] {
  return leads.map(lead => {
    const generatedContent = getGeneratedContent(lead.id);
    return formatProspectForWoodpecker(lead, generatedContent, options);
  });
}

export function validateWoodpeckerProspect(prospect: WoodpeckerProspect): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Email is required
  if (!prospect.email || !prospect.email.trim()) {
    errors.push('Email is required');
  } else if (!isValidEmail(prospect.email)) {
    errors.push('Email format is invalid');
  }

  // Check snippet content for HTML validity if present
  for (let i = 1; i <= 7; i++) {
    const snippetKey = `snippet${i}` as keyof WoodpeckerProspect;
    const snippet = prospect[snippetKey];
    if (snippet && typeof snippet === 'string') {
      const htmlErrors = validateSnippetHtml(snippet, i);
      errors.push(...htmlErrors);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Helper functions for extracting data from leads
function extractEmail(lead: LeadData): string {
  // Common email field names
  const emailFields = ['email', 'Email', 'EMAIL', 'emailAddress', 'email_address'];

  for (const field of emailFields) {
    const value = lead[field];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return lead.id || ''; // Fallback to ID if no email found
}

function extractFirstName(lead: LeadData): string | undefined {
  const firstNameFields = [
    'firstName', 'first_name', 'FirstName', 'FIRST_NAME',
    'contactName', 'contact_name', 'name', 'Name'
  ];

  for (const field of firstNameFields) {
    const value = lead[field];
    if (typeof value === 'string' && value.trim()) {
      // If it's a full name, try to extract first name
      const nameParts = value.trim().split(/\s+/);
      return nameParts[0];
    }
  }

  return undefined;
}

function extractLastName(lead: LeadData): string | undefined {
  const lastNameFields = [
    'lastName', 'last_name', 'LastName', 'LAST_NAME',
    'surname', 'Surname'
  ];

  for (const field of lastNameFields) {
    const value = lead[field];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  // Try to extract from full name field
  const fullNameFields = ['contactName', 'contact_name', 'name', 'Name'];
  for (const field of fullNameFields) {
    const value = lead[field];
    if (typeof value === 'string' && value.trim()) {
      const nameParts = value.trim().split(/\s+/);
      if (nameParts.length > 1) {
        return nameParts.slice(1).join(' ');
      }
    }
  }

  return undefined;
}

function extractCompany(lead: LeadData): string | undefined {
  const companyFields = [
    'company', 'Company', 'COMPANY',
    'companyName', 'company_name', 'CompanyName',
    'organization', 'Organization'
  ];

  for (const field of companyFields) {
    const value = lead[field];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

function extractTitle(lead: LeadData): string | undefined {
  const titleFields = [
    'title', 'Title', 'TITLE',
    'jobTitle', 'job_title', 'JobTitle',
    'position', 'Position'
  ];

  for (const field of titleFields) {
    const value = lead[field];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

function extractLinkedInUrl(lead: LeadData): string | undefined {
  const linkedinFields = [
    'linkedInUrl', 'linkedin_url', 'LinkedInUrl', 'LINKEDIN_URL',
    'linkedin', 'LinkedIn', 'linkedIn', 'profile_url'
  ];

  for (const field of linkedinFields) {
    const value = lead[field];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validateSnippetHtml(html: string, snippetNumber: number): string[] {
  const errors: string[] = [];

  // Check for basic HTML structure issues
  if (html.includes('<script')) {
    errors.push(`Snippet ${snippetNumber} contains script tags (not allowed)`);
  }

  if (html.includes('<style')) {
    errors.push(`Snippet ${snippetNumber} contains style tags (not recommended)`);
  }

  // Check for unclosed tags (basic validation)
  const openTags = html.match(/<[^\/][^>]*>/g) || [];
  const closeTags = html.match(/<\/[^>]*>/g) || [];

  if (openTags.length !== closeTags.length) {
    errors.push(`Snippet ${snippetNumber} may have unclosed HTML tags`);
  }

  return errors;
}

export function createWoodpeckerExportSummary(
  prospects: WoodpeckerProspect[],
  validationResults: ReturnType<typeof validateWoodpeckerProspect>[]
): {
  totalProspects: number;
  validProspects: number;
  invalidProspects: number;
  snippetStats: Record<string, number>;
  commonErrors: Array<{ error: string; count: number }>;
} {
  const validProspects = validationResults.filter(r => r.isValid).length;
  const invalidProspects = validationResults.filter(r => !r.isValid).length;

  // Count snippets
  const snippetStats: Record<string, number> = {};
  for (let i = 1; i <= 7; i++) {
    const snippetKey = `snippet${i}`;
    const count = prospects.filter(p => {
      const snippet = p[snippetKey as keyof WoodpeckerProspect];
      return snippet && typeof snippet === 'string' && snippet.trim().length > 0;
    }).length;
    snippetStats[snippetKey] = count;
  }

  // Count common errors
  const errorCounts: Record<string, number> = {};
  validationResults.forEach(result => {
    result.errors.forEach(error => {
      errorCounts[error] = (errorCounts[error] || 0) + 1;
    });
  });

  const commonErrors = Object.entries(errorCounts)
    .map(([error, count]) => ({ error, count }))
    .sort((a, b) => b.count - a.count);

  return {
    totalProspects: prospects.length,
    validProspects,
    invalidProspects,
    snippetStats,
    commonErrors,
  };
}